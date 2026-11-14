import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BAG_SIZE, ITEMS, KNB_PRICE, DEFAULT_AUTO, MAX_MONEY, moneyText, normalizeAuto, type ChatLine, type Item } from '../packages/shared/src/index.js';
import type { Sim } from '../apps/server/src/world/entity.js';
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), 'jx-market-unit-')), 'db.json');
const { purchaseOffer, buyKnb } = await import('../apps/server/src/world/market.js');
const def = Object.values(ITEMS).find(d => d.kind === 'ring')!;
const item: Item = {uid:'sale-item', def:def.id, q:1, magic:[['lifemax_v',99]]};
const sim = (id: string, money = 10_000_000): Sim => ({ charId:id, money, knb:10, dead:false, bag:Array(BAG_SIZE).fill(null) } as Sim);
const offer = (currency: 'money'|'knb' = 'money'): ChatLine => ({id:1,from:'Seller',ch:'trade',text:'sale',at:1,
  offer:{seller:'seller',item:structuredClone(item),currency,price:currency === 'knb' ? 3 : 12300}});
test('money formats follow the requested van units and safe normalizer', () => {
  for (const [n, text] of [[12300,'1 vạn 2300'],[10000,'1 vạn'],[10000000,'1000 vạn'],[100000000,'10.000 vạn'],[9999,'9.999']] as const) assert.equal(moneyText(n),text);
  assert.deepEqual(normalizeAuto({autoHp:Infinity, autoRadius:999999, autoSkipBoss:'yes', autoLoot:'bad'}), {...DEFAULT_AUTO, autoRadius:1200});
});
test('money and KNB purchases transfer exact UID/options once, conserve currency and reject replay', () => {
  for (const currency of ['money','knb'] as const) {
    const a=sim('buyer'), b=sim('seller'), line=offer(currency); b.bag![0]=structuredClone(item);
    const total = a[currency]! + b[currency]!;
    assert.equal(purchaseOffer(a,b,line),null);
    assert.deepEqual(a.bag!.find(Boolean),item); assert.equal(b.bag![0],null); assert.equal(line.offer!.sold,true);
    assert.equal(a[currency]! + b[currency]!,total);
    assert.ok(purchaseOffer(a,b,line)); assert.equal(a.bag!.filter(Boolean).length,1);
  }
});
test('insufficient funds, full bag, changed item, self trade and wallet cap leave both parties intact', () => {
  for (const condition of ['poor','full','changed','self','cap']) {
    const a=sim('buyer'),b=sim('seller'),line=offer();b.bag![0]=structuredClone(item);
    if(condition==='poor')a.money=0;
    if(condition==='full')a.bag=Array.from({length:BAG_SIZE},(_,i)=>({uid:String(i),def:'potion-2-5'}));
    if(condition==='changed')b.bag![0]!.magic=[];
    if(condition==='self')a.charId='seller';
    if(condition==='cap')b.money=MAX_MONEY;
    const before=JSON.stringify([a,b,line]);assert.ok(purchaseOffer(a,b,line),condition);assert.equal(JSON.stringify([a,b,line]),before);
  }
});
test('KNB conversion charges 100 van each, rejects fractions, out of town and overspending', () => {
  const a=sim('buyer');assert.equal(buyKnb(a,2,true),null);assert.equal(a.money,10_000_000-2*KNB_PRICE);assert.equal(a.knb,12);
  const before=JSON.stringify(a);
  for(const [n,safe] of [[1,false],[1.1,true],[99,true],[0,true]] as const) {assert.ok(buyKnb(a,n,safe));assert.equal(JSON.stringify(a),before);}
});
test('character Auto caches do not leak, server wins stale cache, storage failure still works', async () => {
  Object.assign(globalThis, {window:{devicePixelRatio:1}});
  const memory = new Map<string,string>();
  Object.assign(globalThis,{localStorage:{getItem:(k:string)=>memory.get(k)??null,setItem:(k:string,v:string)=>memory.set(k,v),removeItem:(k:string)=>memory.delete(k)}});
  const {beginCharacterAuto,receiveCharacterAuto,setCharacterAutoEnabled,characterAuto}=await import('../apps/client/src/state/characterAuto.js');
  const {settings}=await import('../apps/client/src/state/settings.js');
  const sent:unknown[]=[];
  beginCharacterAuto('A',x=>sent.push(x));receiveCharacterAuto({enabled:false,settings:{...DEFAULT_AUTO},revision:1});
  settings.set({autoSkipBoss:true});setCharacterAutoEnabled(true);
  beginCharacterAuto('B',x=>sent.push(x));assert.equal(characterAuto.get().enabled,false);assert.equal(settings.get().autoSkipBoss,false);
  receiveCharacterAuto({enabled:false,settings:{...DEFAULT_AUTO},revision:1});
  beginCharacterAuto('A',x=>sent.push(x));assert.equal(characterAuto.get().enabled,true);assert.equal(settings.get().autoSkipBoss,true);
  receiveCharacterAuto({enabled:false,settings:{...DEFAULT_AUTO},revision:2});assert.equal(characterAuto.get().enabled,false);
  Object.assign(globalThis,{localStorage:{getItem(){throw Error('denied')},setItem(){throw Error('denied')},removeItem(){}}});
  beginCharacterAuto('C',x=>sent.push(x));receiveCharacterAuto({enabled:true,settings:{...DEFAULT_AUTO,autoRadius:777},revision:3});
  assert.equal(characterAuto.get().enabled,true);assert.equal(settings.get().autoRadius,777);assert.ok(sent.length>=2);
});
test('new buyers can read public market history without receiving private account world history', async () => {
  const {chatSay,chatHistoryFor} = await import('../apps/server/src/world/chat.js');
  assert.equal(chatSay('world-speaker','WorldUser','world-private',Date.now(),'world'),null);
  assert.equal(chatSay('trade-speaker','Trader','market-public',Date.now(),'trade'),null);
  const history = chatHistoryFor('new-offline-account');
  assert.ok(history.some(l=>l.text==='market-public'));
  assert.equal(history.some(l=>l.text==='world-private'),false);
});
