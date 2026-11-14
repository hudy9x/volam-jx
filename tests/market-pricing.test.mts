import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ITEMS, createGold, valueMarketItem, MARKET_PRICING, BAG_SIZE, type Item, type ChatLine } from '../packages/shared/src/index.js';
import type { Sim } from '../apps/server/src/world/entity.js';
const path = join(mkdtempSync(join(tmpdir(), 'jx-pricing-')), 'db.json');
process.env.DB_PATH = path;
const { db } = await import('../apps/server/src/account/db.js');
const { marketPost, marketOnline, marketOffline, marketBuy, purchaseOffer: purchaseOfferForLegacy } = await import('../apps/server/src/world/market.js');
const { chatHistoryFor } = await import('../apps/server/src/world/chat.js');
const green: Item = {uid:'green',def:'melee-0-10',q:1,series:0,
  magic:[['addphysicsdamage_p',100],['addphysicsdamage_v',50,1],['attackspeed_v',30],['steallifeenhance_p',10]]};
const sim = (id:string):Sim => ({charId:id,a:{name:id},money:10000000,knb:20,dead:false,bag:Array(BAG_SIZE).fill(null)} as Sim);
function account(id:string,bot=false):void {
  db.addUser({username:id,salt:'test',hash:'test',characters:[],...(bot?{bot:true as const}:{})});
  db.addCharacter({id,owner:id,name:id,faction:'',gender:'male',level:100,mapId:37,x:1,y:1,...(bot?{bot:{} as never}:{})});
}
test('green price rewards useful synergy, rejects unknown/invalid/weak rolls and ignores UID',()=>{
  const v=valueMarketItem(green)!;assert.ok(v);assert.ok(v.reasons.some(r=>r.includes('Ngoại công')));
  assert.deepEqual(valueMarketItem({...green,uid:'another'}),v);
  const weak = valueMarketItem({...green,magic:[['addphysicsdamage_p',10]]});assert.equal(weak,null);
  assert.equal(valueMarketItem({...green,magic:[['unknown',999999]]}),null);
  assert.equal(valueMarketItem({...green,magic:[['addphysicsdamage_p',Infinity]]}),null);
  assert.equal(valueMarketItem({...green,magic:[['addphysicsdamage_p',1000]]}),null);
  assert.ok(v.price<=MARKET_PRICING.green.maxMoney);assert.equal(v.currency,'money');
});
test('gold uses exact item roll ranges, stronger roll is not cheaper, currency conversion respects limits',()=>{
  const def=ITEMS['gold-1'];
  const low=valueMarketItem(createGold(def,'lo',5,()=>0))!;
  const high=valueMarketItem(createGold(def,'hi',5,()=>0.9))!;
  assert.ok(high.price>=low.price);assert.ok(high.score>=low.score);assert.equal(high.group,'gold:gold-1');
  const overrides=MARKET_PRICING.itemOverrides as Record<string,unknown>;
  overrides[def.id]={baseMoney:6000000,minMoney:5000000,maxMoney:20000000};
  try { const v=valueMarketItem(createGold(def,'hi',5,()=>0.9))!; assert.equal(v.currency,'knb');assert.ok(v.price>=5);assert.equal(v.money,v.price*1000000); }
  finally {delete overrides[def.id];}
});
test('bot server chooses authoritative price, buyer can purchase once, successful sale persists separately',()=>{
  account('seller',true);account('buyer');account('manual');
  const seller=sim('seller'),buyer=sim('buyer'),manual=sim('manual');seller.bag![0]=green;manual.bag![0]={...green,uid:'manual'};
  assert.ok(marketPost(manual,{uid:'manual',currency:'money',price:1,text:'test',autoPrice:true}));
  marketOnline(seller,()=>{});marketOnline(buyer,()=>{});
  try {
    assert.equal(marketPost(seller,{uid:green.uid,currency:'knb',price:999999,text:'sale',autoPrice:true}),null);
    const line=chatHistoryFor('buyer').find(l=>l.offer?.item.uid===green.uid) as ChatLine;
    assert.ok(line.offer?.valuation);assert.equal(line.offer?.price,valueMarketItem(green)!.price);assert.equal(line.offer?.currency,'money');
    const total=buyer.money!+seller.money!;
    assert.equal(marketBuy(buyer,line.id),null);assert.equal(buyer.money!+seller.money!,total);
    assert.ok(buyer.bag!.some(i=>i?.uid===green.uid));assert.equal(line.offer?.sold,true);
    assert.equal(db.marketSales().length,1);assert.equal(db.marketSales()[0].eligible,true);
    assert.ok(marketBuy(buyer,line.id));assert.equal(db.marketSales().length,1);
    const saved=JSON.parse(readFileSync(path,'utf8'));assert.equal(saved.marketSales[0].uid,green.uid);
  } finally {marketOffline(seller);marketOffline(buyer);}
});
test('failed purchase never becomes market data',()=>{
  account('seller-fail',true);account('poor');const seller=sim('seller-fail'),buyer=sim('poor');buyer.money=0;
  seller.bag![0]={...green,uid:'fail'};marketOnline(seller,()=>{});
  try {assert.equal(marketPost(seller,{uid:'fail',currency:'money',price:1,text:'fail',autoPrice:true}),null);
    const line=chatHistoryFor('poor').find(l=>l.offer?.item.uid==='fail')!;
    const count=db.marketSales().length;assert.ok(marketBuy(buyer,line.id));assert.equal(db.marketSales().length,count);
  }finally{marketOffline(seller);}
});
test('same-account and bot buyers are excluded from future learning data',()=>{
  for(const botBuyer of [false,true]){
    const suffix=botBuyer?'bot':'same';account(`s-${suffix}`,true);account(`b-${suffix}`,botBuyer);
    if(!botBuyer) db.getCharacter(`b-${suffix}`)!.owner=`s-${suffix}`;
    const seller=sim(`s-${suffix}`),buyer=sim(`b-${suffix}`);seller.bag![0]={...green,uid:`excluded-${suffix}`};
    marketOnline(seller,()=>{});marketOnline(buyer,()=>{});
    try{assert.equal(marketPost(seller,{uid:`excluded-${suffix}`,currency:'money',price:1,text:'sale',autoPrice:true}),null);
      const line=chatHistoryFor('new').find(l=>l.offer?.item.uid===`excluded-${suffix}`)!;
      assert.equal(marketBuy(buyer,line.id),null);assert.equal(db.marketSales().find(s=>s.uid===`excluded-${suffix}`)?.eligible,false);
    }finally{marketOffline(seller);marketOffline(buyer);}
  }
});
test('automatic gold KNB listing is paid and recorded in its original currency',()=>{
  account('knb-seller',true);account('knb-buyer');const seller=sim('knb-seller'),buyer=sim('knb-buyer');
  const item=createGold(ITEMS['gold-1'],'knb-sale',5,()=>0.9);seller.bag![0]=item;
  const overrides=MARKET_PRICING.itemOverrides as Record<string,unknown>;overrides[item.def]={baseMoney:6000000,minMoney:5000000,maxMoney:20000000};
  marketOnline(seller,()=>{});marketOnline(buyer,()=>{});
  try{
    assert.equal(marketPost(seller,{uid:item.uid,currency:'money',price:1,text:'gold',autoPrice:true}),null);
    const line=chatHistoryFor('new').find(l=>l.offer?.item.uid===item.uid)!;assert.equal(line.offer?.currency,'knb');
    const before=buyer.knb!, total=buyer.knb!+seller.knb!;assert.equal(marketBuy(buyer,line.id),null);
    assert.equal(buyer.knb,before-line.offer!.price);assert.equal(buyer.knb!+seller.knb!,total);
    assert.equal(db.marketSales().find(s=>s.uid===item.uid)?.currency,'knb');
  }finally{delete overrides[item.def];marketOffline(seller);marketOffline(buyer);}
});
test('new contact/invalid-currency offers are rejected without mutation, old contact offers cannot be bought',()=>{
  const seller=sim('contact-seller'),buyer=sim('contact-buyer');seller.bag![0]={...green,uid:'old-contact'};
  const before=JSON.stringify([seller,buyer,db.marketSales()]);
  for(const currency of ['contact','invalid']) {
    assert.ok(marketPost(seller,{uid:'old-contact',currency:currency as never,price:100,text:'test'}));
    assert.equal(JSON.stringify([seller,buyer,db.marketSales()]),before);
  }
  const line:ChatLine={id:999999,ch:'trade',from:'Seller',text:'legacy',at:1,offer:{seller:seller.charId!,item:seller.bag![0]!,currency:'contact',price:0}};
  // purchaseOffer is the same validation used by marketBuy for historical snapshots.
  const value=JSON.stringify([seller,buyer,line]);
  assert.ok(purchaseOfferForLegacy(buyer,seller,line));assert.equal(JSON.stringify([seller,buyer,line]),value);
});
