import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {botMapIds, BOT_ROSTER, normalizeBotScenario, normalizeBotTemplate} from '../packages/shared/src/index.js';
import {ConfigStore} from '../tools/bots/ConfigStore.js';
import {RunManager} from '../tools/bots/RunManager.js';

test('mixed spawn selection contains both groups, with no duplicates',()=>{
 const both=botMapIds('both');assert.deepEqual(new Set(both),new Set([...botMapIds('town'),...botMapIds('training')]));assert.equal(both.length,new Set(both).size);
 assert.equal(normalizeBotTemplate({map:{mode:'both',maps:both}}).map.mode,'both');
});
test('three preset bands and 30 exact identities have complete idempotent setup groups',()=>{
 const store=new ConfigStore(path.resolve('tools/bots/data'));
 const bands=[[40,69],[70,90],[110,150]];
 for(const [lo,hi]of bands){const t=normalizeBotTemplate(store.read('templates',`cap-${lo}-${hi}`));assert.deepEqual(t.level,[lo,hi]);assert.equal(t.map.mode,'both');assert.equal(t.tiers,true);assert.equal(t.ring,false);assert.equal(t.horse,'random');}
 const sc=normalizeBotScenario(store.read('scenarios','luyen-cong-30'));assert.deepEqual(sc.bots.usernames,BOT_ROSTER.slice(0,30).map(b=>b.id));assert.equal(sc.joinPerSecond,3);assert.equal(sc.duration,0);assert.deepEqual(sc.activities,{grind:true,chat:true,sell:true,autoAcceptTeam:true,autoInviteTeam:false});assert.equal(sc.initialSetup!.length,3);assert.ok(sc.initialSetup!.every(group=>group.usernames.length===10));assert.deepEqual(sc.initialSetup!.flatMap(group=>group.usernames),sc.bots.usernames);
});
test('standalone config store persists titles and rejects escaping file names',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jx-bots-config-'));try{const store=new ConfigStore(dir);store.save('templates','ten-mau',{title:'Tên mẫu',level:[70,90]});assert.equal(store.list().titles['ten-mau'],'Tên mẫu');assert.throws(()=>store.read('templates','../../secret'));assert.throws(()=>store.save('other','name',{}));store.save('scenarios','chay',{title:'Chạy',duration:60,joinPerSecond:999});const sc=normalizeBotScenario(store.read('scenarios','chay'));assert.equal(sc.duration,0);assert.equal(sc.joinPerSecond,5);}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('runner requires fixed selected identities and saved safe scenario names',async()=>{
 const manager=new RunManager(path.resolve('tools/bots'),path.resolve('tools/bots/data'));
 await assert.rejects(manager.start('../secret',[], 'http://localhost:2567'));
 await assert.rejects(manager.start('luyen-cong-30',[], 'http://localhost:2567'));
 await assert.rejects(manager.start('luyen-cong-30',['not-a-bot'], 'http://localhost:2567'));
 assert.deepEqual(manager.status().bots,[]);
});
