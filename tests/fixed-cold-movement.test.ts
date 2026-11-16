import test from 'node:test';
import assert from 'node:assert/strict';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { followPath } from '../apps/server/src/world/systems/movement.js';
import { applyHitEffects, updateEffects, clearEffects } from '../apps/server/src/world/systems/effects.js';
import { coldMovement, isoDistance, monsterCombat, attackTiming } from '../packages/shared/src/index.js';
import { coldDurationMs } from '../packages/shared/src/formulas/effects/cold.js';
import type { World } from '../apps/server/src/world/World.js';
function actor(kind: 'player'|'monster', boss=0, mounted=false, speed=260) {
 const a=new Actor();Object.assign(a,{x:1000,y:1000,hp:1000,maxHp:1000,ctl:2,boss,mounted});
 const s=makeSim('test',kind,a,'kim',speed);s.combat=monsterCombat(100,'kim',0,0,{});s.moveScale=3;return s;
}
test('all actors travel 600 isometric units in ten seconds, independent of speed, horse, AI and direction',()=>{
 for(const kind of ['player','monster'] as const)for(const boss of [0,1,2])for(const mounted of [false,true])for(const speed of [20,260,700])for(const scale of [.4,1])for(const [dx,dy] of [[1,0],[0,1],[1,1],[-1,-1]]) {
  const s=actor(kind,boss,mounted,speed);s.path=[{x:1000+dx*5000,y:1000+dy*5000}];
  for(let i=0;i<200;i++)followPath(s,.05,scale);
  assert.ok(Math.abs(isoDistance(1000,1000,s.a.x,s.a.y)-600)<1.2,JSON.stringify({kind,boss,mounted,speed,scale,dx,dy,x:s.a.x,y:s.a.y}));
 }
});
test('fixed cycle is two seconds and 120 units regardless of sprite frame count',()=>{
 assert.deepEqual(coldMovement(),{velocity:60,fps:4,cycleMs:2000,stride:120});
 for(const frames of [8,12,16]) assert.equal((frames/(frames*1000/coldMovement().cycleMs))*60,120);
});
test('time reduction, renewal, expiry and current speed restoration remain functional',()=>{
 for(const [reduce,ms]of [[0,1500],[40,900],[80,345]]) {
  const s=actor('monster',2);s.a.ctl=0;
  const duration=coldDurationMs({id:0} as any,1,{}, {freezetimereduce_p:[reduce,0,0]},1);assert.equal(duration,ms);
  const w={now:1000,events:[],sims:new Map([[s.id,s]])} as unknown as World;
  applyHitEffects(w,s,s,{slowMs:duration,stunMs:0,hurtMs:0,poison:null});assert.equal(s.a.ctl&2,2);
  w.now=1001;applyHitEffects(w,s,s,{slowMs:duration,stunMs:0,hurtMs:0,poison:null});assert.equal(s.effects!.slowUntil,1001+duration);
  s.combat!.bag.fastwalkrun_p=[140,0,0];w.now=1001+duration;updateEffects(w,s,()=>{});
  assert.equal(s.a.ctl&2,0);assert.equal(s.moveScale,22/8);
  clearEffects(w,s);assert.equal(s.a.ctl,0);
 }
 assert.equal(coldDurationMs({id:0} as any,1,{}, {},0),0);
 const bag={attackspeed_v:[100,0,0] as [number,number,number]};assert.notEqual(attackTiming(bag,true,true).cycleMs,2000);
});
test('cold does not move dead, stunned, jumping or stationary actors; arrival and teleport reset precision',()=>{
 for(const flag of ['dead','stun','jump','stationary']) {
  const s=actor('monster');s.path=[{x:2000,y:1000}];
  if(flag==='dead')s.dead=true;if(flag==='stun')s.a.ctl|=1;if(flag==='jump')s.jump={} as any;if(flag==='stationary')s.speed=0;
  followPath(s,.05);assert.equal(s.a.x,1000);
 }
 const s=actor('player');s.path=[{x:1001,y:1000}];followPath(s,.05);assert.equal(s.a.x,1001);assert.equal(s.path.length,0);
 s.a.x=2000;s.path=[{x:3000,y:1000}];followPath(s,.05);assert.equal(s.a.x,2003);
 s.a.ctl=0;followPath(s,.05);assert.equal(s.coldPosition,undefined);
});
