import assert from 'node:assert/strict';
import test from 'node:test';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { commandCast, commandMove } from '../apps/server/src/world/commands.js';
import { updatePlayer } from '../apps/server/src/world/players.js';
import type { World } from '../apps/server/src/world/World.js';

function rig() {
  const actor = (kind:string, x:number) => { const a=new Actor();Object.assign(a,{kind,x,y:0,attackTarget:'',hp:100,maxHp:100,mp:100,maxMp:100,level:1,protectedUntil:0});return a; };
  const self=makeSim('self','player',actor('player',0),'kim',100);
  const target=makeSim('target','monster',actor('monster',500),'kim',100);
  self.skills=new Map([[1,1],[273,1]]);
  let ready=true, error:string|null=null, casts=0;
  // Exercise the production queue/range/confirmation path; no asset grid is needed with no pathfinding budget.
  const w={now:1000,meta:{portals:[]},rules:{safe:false,pvp:false},sims:new Map([[self.id,self],[target.id,target]]),astarBudget:0,
    engine:{ready:()=>ready,check:()=>error,cast:()=>{casts++;return{anim:'attack',ms:200};}},hooks:{notify(){}},
  } as unknown as World;
  return{w,self,target,get casts(){return casts;},ready:(v:boolean)=>{ready=v;},error:(v:string|null)=>{error=v;}};
}

test('server confirms only a real offensive action, never a queued path or cooldown wait', () => {
  const r=rig();commandCast(r.w,r.self,1,r.target.id,500,0,true);
  assert.equal(r.self.a.attackTarget,'');
  updatePlayer(r.w,r.self,0);assert.equal(r.self.a.attackTarget,'');assert.equal(r.casts,0);
  r.target.a.x=20;r.ready(false);r.w.now=2000;updatePlayer(r.w,r.self,0);
  assert.equal(r.self.a.attackTarget,'');assert.equal(r.casts,0);
  r.ready(true);r.w.now=3000;updatePlayer(r.w,r.self,0);
  assert.equal(r.self.a.attackTarget,r.target.id);assert.equal(r.casts,1);
});

test('buffs preserve combat confirmation while manual movement releases it; rejected casts do not confirm', () => {
  const r=rig();r.target.a.x=20;
  commandCast(r.w,r.self,1,r.target.id,20,0,true);updatePlayer(r.w,r.self,0);
  r.w.now=2000;commandCast(r.w,r.self,273,undefined,0,0);updatePlayer(r.w,r.self,0);
  assert.equal(r.self.a.attackTarget,r.target.id);
  commandMove(r.w,r.self,100,0);assert.equal(r.self.a.attackTarget,''); // still in cast pose, no pathfinding
  r.w.now=3000;r.error('not enough mana');commandCast(r.w,r.self,1,r.target.id,20,0,true);
  updatePlayer(r.w,r.self,0);assert.equal(r.self.a.attackTarget,'');
});
