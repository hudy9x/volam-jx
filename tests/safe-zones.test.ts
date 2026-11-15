import test from 'node:test';
import assert from 'node:assert/strict';
import { combatRulesAt, combatPairRules, insideZone, validateSafeZones, TOWN_SAFE_ZONES, type SafeZone } from '../packages/shared/src/maps/safe-zones.js';
import { MAPS } from '../packages/shared/src/maps/index.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { commandCast, setPk } from '../apps/server/src/world/commands.js';
import { updatePlayer } from '../apps/server/src/world/players.js';
import { attackable } from '../apps/server/src/world/targeting.js';
import { applyHit } from '../apps/server/src/world/systems/combat.js';
import type { World } from '../apps/server/src/world/World.js';
const meta = MAPS[1];
const zone: SafeZone = { id: 'zone-test', name: 'Nội thành', points: [{x:100,y:100},{x:200,y:100},{x:200,y:200},{x:100,y:200}] };
const config = { version: 1 as const, maps: {'1':[zone]} };
test('inside, outside, boundary, concave and disjoint zones; default maps stay unchanged', () => {
  validateSafeZones([zone], meta);
  validateSafeZones([{...zone,points:[zone.points[0],{x:150,y:100},...zone.points.slice(1)]}],meta); // inserting a vertex on an edge is valid
  for (const p of [{x:100,y:100},{x:150,y:100},{x:150,y:150}]) assert.equal(insideZone(p,zone.points),true);
  assert.equal(insideZone({x:99,y:150},zone.points),false);
  assert.equal(combatRulesAt(meta,{x:150,y:150},meta,config).safe,true);
  assert.deepEqual(combatRulesAt(meta,{x:99,y:150},meta,config),{safe:false,pvp:true});
  assert.equal(combatPairRules(meta,{x:99,y:150},{x:150,y:150},meta,config).safe,true);
  assert.equal(combatPairRules(meta,{x:150,y:150},{x:99,y:150},meta,config).safe,true);
  assert.deepEqual(combatRulesAt(meta,{x:99,y:150},meta,{version:1,maps:{}}),{safe:true,pvp:false});
  const concave=[{x:0,y:0},{x:80,y:0},{x:80,y:40},{x:40,y:40},{x:40,y:80},{x:0,y:80}];
  assert.equal(insideZone({x:60,y:60},concave),false);assert.equal(insideZone({x:20,y:60},concave),true);
  const other={...zone,id:'zone-second',points:zone.points.map(p=>({x:p.x+500,y:p.y}))};
  assert.equal(combatRulesAt(meta,{x:650,y:150},meta,{version:1,maps:{'1':[zone,other]}}).safe,true);
});
test('invalid or dangerous polygon configs are rejected', () => {
  const invalid=[[],[zone,zone],[{...zone,points:zone.points.slice(0,2)}],[{...zone,points:[{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}]}],[{...zone,points:[{x:0,y:0},{x:100,y:0},{x:50,y:0},{x:50,y:50}]}],[{...zone,points:[...zone.points,{x:100,y:100}]}],[{...zone,points:zone.points.map(p=>({...p,x:-1}))}]];
  for(const value of invalid) assert.throws(()=>validateSafeZones(value,meta));
  assert.throws(()=>validateSafeZones([zone],MAPS[140]));
});
test('production commands and damage guard enforce zones on both sides and after movement; services stay map-based', () => {
  const old=TOWN_SAFE_ZONES.maps['1'];TOWN_SAFE_ZONES.maps['1']=[structuredClone(zone)];
  const actor=(x:number)=>{const a=new Actor();Object.assign(a,{x,y:150,hp:100,maxHp:100,mp:100,maxMp:100,level:1,pk:2,camp:'justice',protectedUntil:0});return a;};
  const self=makeSim('self','player',actor(150),'kim',100),target=makeSim('target','player',actor(250),'kim',100);
  self.skills.set(1,1);self.skills.set(273,1);target.a.camp='evil';
  let casts=0;const notes:string[]=[];
  const w={meta,rules:{safe:true,pvp:false},now:1000,events:[],sims:new Map([[self.id,self],[target.id,target]]),astarBudget:0,engine:{ready:()=>true,check:()=>null,cast:()=>{casts++;return{anim:'attack',ms:200};}},hooks:{notify:(_s:unknown,n:string)=>notes.push(n)}} as unknown as World;
  try{
    commandCast(w,self,1,target.id,250,150,true);assert.equal(self.pending,null);
    commandCast(w,self,273,undefined,150,150);assert.equal(self.pending,null,'active buffs are blocked too');
    setPk(w,self,1);assert.equal(self.a.pk,2,'entering safety does not rewrite stored mode');
    assert.equal(attackable(w,self,target),false);applyHit(w,self,target,{dmg:10,crit:false});assert.equal(target.hp,100);
    self.a.x=250;target.a.x=150;assert.equal(attackable(w,self,target),false);
    applyHit(w,self,target,{dmg:10,crit:false,dot:true});assert.equal(target.hp,100,'safe victim ignores ongoing damage');
    target.a.x=270;assert.equal(attackable(w,self,target),true);
    applyHit(w,self,target,{dmg:10,crit:false});assert.equal(target.hp,90,'normal damage works outside');
    const monster=makeSim('monster','monster',actor(270),'kim',100);assert.equal(attackable(w,self,monster),true);
    commandCast(w,self,1,target.id,270,150,true);assert.ok(self.pending);
    updatePlayer(w,self,0);assert.equal(casts,1,'outside city polygons can actually cast');
    self.castUntil=0;self.a.x=150;updatePlayer(w,self,0);assert.equal(self.pending,null);assert.equal(self.a.attackTarget,'');assert.equal(casts,1);
    self.a.x=250;setPk(w,self,1);assert.equal(self.a.pk,1);
    assert.deepEqual(w.rules,{safe:true,pvp:false},'NPC/shop service eligibility still uses original map rules');
  }finally{if(old)TOWN_SAFE_ZONES.maps['1']=old;else delete TOWN_SAFE_ZONES.maps['1'];}
});
