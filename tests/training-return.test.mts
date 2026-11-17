import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { AutoPlay, DEFAULT_AUTO, normalizeAuto, normalizeBotScenario, MAPS, registerNav, getGrid, type AutoHost, type AutoActor } from '../packages/shared/src/index.js';

function rig() {
  let safe=true;
  const calls:unknown[][]=[];
  const self:AutoActor={id:'self',x:100,y:100,isSelf:true,state:{kind:'player',level:100,hp:100,maxHp:100,mp:100,maxMp:100,boss:0,sprite:''}};
  const host:AutoHost={self:()=>self,actors:()=>[],safe:()=>safe,learnedSkills:()=>[],aura:()=>{},skillAt:()=>null,usable:()=>false,ready:()=>false,cost:()=>0,range:()=>100,melee:()=>false,cast:()=>{},move:()=>{},bag:()=>[],money:()=>100000,use:()=>{},sell:()=>{},buy:()=>{},wearable:()=>false,drops:()=>[],pickup:()=>{},train:(...args)=>calls.push(['train',...args]),goTown:()=>calls.push(['town']),respawn:()=>calls.push(['revive']),notice:()=>{},stop:()=>{}};
  const auto=new AutoPlay(host);auto.start();
  const opts={...DEFAULT_AUTO,autoBuff:false,autoCurse:false,autoBuyPotion:false,autoJunk:false,autoSellBlue:false,autoHp:0,autoMp:0};
  return {self,host,calls,auto,opts,safe:(v:boolean)=>safe=v};
}

test('all four town travel combinations: return prioritizes exact point, level travel stays independent',()=>{
 for(const autoMap of [false,true])for(const autoReturnTraining of [false,true]) {
  const r=rig();for(let t=1000;t<16000;t+=1000)r.auto.update(t,{...r.opts,autoMap,autoReturnTraining});
  const trains=r.calls.filter(c=>c[0]==='train');assert.equal(trains.length>0,autoMap||autoReturnTraining);
  for(const call of trains)assert.deepEqual(call,['train',false,autoReturnTraining]);
 }
});
test('only real level up sends level-based travel even with return enabled; return alone never changes bãi on level up',()=>{
 for(const autoMap of [false,true]) {
  const r=rig();r.safe(false);r.auto.update(1000,{...r.opts,autoMap,autoReturnTraining:true});assert.equal(r.calls.length,0);
  r.self.state.level++;r.auto.update(20000,{...r.opts,autoMap,autoReturnTraining:true});
  assert.deepEqual(r.calls,autoMap?[['train',true]]:[]);
 }
});
test('return-only Auto can go to town for medicine, while both disabled suppress automatic town travel',()=>{
 for(const autoReturnTraining of [false,true]){
  const r=rig();r.safe(false);r.self.state.hp=1;r.auto.update(10000,{...r.opts,autoHp:50,autoBuyPotion:true,autoMap:false,autoReturnTraining});
  assert.equal(r.calls.some(c=>c[0]==='town'),autoReturnTraining);
 }
});
test('return option migrates old Auto/scenarios on, explicit off survives normalization',()=>{
 assert.equal(normalizeAuto({autoMap:false}).autoReturnTraining,true);
 assert.equal(normalizeAuto({autoReturnTraining:false}).autoReturnTraining,false);
 assert.equal(normalizeBotScenario({auto:{autoMap:false}}).auto.autoReturnTraining,true);
 assert.equal(normalizeBotScenario({auto:{autoReturnTraining:false}}).auto.autoReturnTraining,false);
});
test('server departure memory, exact coordinates, invalid points, bot restrictions and durable reload',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jx-return-test-'));
 process.env.DB_PATH=path.join(dir,'db.json');process.env.MAPS_DIR=path.join(dir,'maps');process.env.MAP_REGISTRY_FILE=path.join(dir,'registry.json');
 for(const id of [37,140]){const base=path.join(process.env.MAPS_DIR,String(id));fs.mkdirSync(base,{recursive:true});fs.writeFileSync(path.join(base,'nav.json'),'{}');fs.writeFileSync(path.join(base,'map.json'),'{}');}
 const {rememberTrainingReturn,resolveSavedTrainingReturn}=await import('../apps/server/src/world/trainingReturn.js');
 const {db}=await import('../apps/server/src/account/db.js');
 const {Actor}=await import('../apps/server/src/net/schema.js');const {makeSim}=await import('../apps/server/src/world/entity.js');
 const meta=MAPS[140], columns=32,rows=32;
 registerNav(140,{kind:'grid',columns,rows,cellSize:{width:meta.raw.size.width/columns,height:meta.raw.size.height/rows},blockedBase64:Buffer.alloc(columns*rows/8).toString('base64')});
 const grid=getGrid(140);const x=Math.round(grid.cw*10.5),y=Math.round(grid.ch*10.5);
 const a=new Actor();Object.assign(a,{x,y,hp:100,maxHp:100});const sim=makeSim('return-test','player',a,'kim',100);sim.charId='return-test';
 const char={id:sim.charId,owner:'fixture',name:'Fixture',gender:'male' as const,faction:'shaolin',level:100,mapId:140,x,y};db.addCharacter(char);
 try{
  rememberTrainingReturn(sim,140,37);const saved=db.getCharacter(char.id)!;assert.deepEqual(saved.trainingReturn,{mapId:140,x,y});
  assert.deepEqual(resolveSavedTrainingReturn(saved,37).point,saved.trainingReturn,JSON.stringify(resolveSavedTrainingReturn(saved,37)));
  sim.a.x=x+10;rememberTrainingReturn(sim,37,37);assert.equal(saved.trainingReturn!.x,x,'town travel does not overwrite field memory');
  rememberTrainingReturn(sim,140,140);assert.equal(saved.trainingReturn!.x,x,'field travel does not overwrite memory');
  assert.match(resolveSavedTrainingReturn(saved,140).error!,/trong thành/);
  const index=Math.floor(y/grid.ch)*grid.gw+Math.floor(x/grid.cw);grid.ok[index]=0;
  const adjusted=resolveSavedTrainingReturn(saved,37);assert.equal(adjusted.adjusted,true);assert.ok(adjusted.point);assert.notDeepEqual(adjusted.point,saved.trainingReturn);grid.ok[index]=1;
  saved.bot={setup:{map:{maps:[56]}}} as any;assert.match(resolveSavedTrainingReturn(saved,37).error!,/thiết lập/);delete saved.bot;
  const memory=saved.trainingReturn;for(const p of [{mapId:999999,x,y},{mapId:37,x,y},{mapId:140,x:NaN,y},{mapId:140,x:-1,y}]){saved.trainingReturn=p;assert.ok(resolveSavedTrainingReturn(saved,37).error);}
  saved.trainingReturn=memory;const enabled=MAPS[140].enabled;MAPS[140].enabled=false;assert.ok(resolveSavedTrainingReturn(saved,37).error);MAPS[140].enabled=enabled;
  fs.unlinkSync(path.join(process.env.MAPS_DIR,'140/map.json'));assert.ok(resolveSavedTrainingReturn(saved,37).error);fs.writeFileSync(path.join(process.env.MAPS_DIR,'140/map.json'),'{}');
  db.flush();const reload=spawnSync(process.execPath,['--import','tsx','--input-type=module','-e',`import {db} from './apps/server/src/account/db.ts'; console.log(JSON.stringify(db.getCharacter('return-test').trainingReturn));`],{cwd:process.cwd(),env:process.env,encoding:'utf8'});
  assert.equal(reload.status,0,reload.stderr);assert.deepEqual(JSON.parse(reload.stdout),memory);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
