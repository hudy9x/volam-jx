import assert from 'node:assert/strict';
import test from 'node:test';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { commandCast, commandMove } from '../apps/server/src/world/commands.js';
import { updatePlayer } from '../apps/server/src/world/players.js';
import { applyHitEffects, updateEffects } from '../apps/server/src/world/systems/effects.js';
import { kill } from '../apps/server/src/world/systems/combat.js';
import type { World } from '../apps/server/src/world/World.js';

function fixture() {
  function actor(id:string,kind:'player'|'monster',x:number) {
    const a=new Actor();Object.assign(a,{kind,x,y:0,hp:100,maxHp:100,mp:100,maxMp:100,level:1,protectedUntil:0});
    return makeSim(id,kind,a,'kim',100);
  }
  const self=actor('self','player',0), enemy=actor('enemy','monster',20), other=actor('other','monster',30);
  self.skills=new Map([[1,1],[273,1]]);
  let ready=true,error:string|null=null;
  const casts:{skill:number;target?:string;at:number}[]=[], notices:string[]=[];
  const w={now:1000,meta:{portals:[]},rules:{safe:false,pvp:false},sims:new Map([self,enemy,other].map(s=>[s.id,s])),astarBudget:0,events:[],
    engine:{ready:()=>ready,check:()=>error,cast:(_s:any,skill:number,t:any)=>{casts.push({skill,target:t?.id,at:w.now});return{anim:'attack',ms:200};},interrupt(){},cancel(){},onDeath(){}},
    hooks:{notify:(_s:any,n:string)=>notices.push(n)},
  } as unknown as World;
  const click=(target=enemy)=>commandCast(w,self,1,target.id,target.a.x,target.a.y,true);
  const tick=(now:number)=>{w.now=now;updateEffects(w,self,()=>{});updatePlayer(w,self,0);};
  return{w,self,enemy,other,casts,notices,click,tick,ready:(v:boolean)=>{ready=v;},error:(v:string|null)=>{error=v;}};
}

for(const kind of ['hurt','stun'] as const) {
  test(`click lock resumes on the first tick after ${kind}, with no client retry`,()=>{
    const r=fixture();r.click();r.tick(1000);assert.equal(r.casts.length,1);
    r.w.now=1050;
    applyHitEffects(r.w,r.enemy,r.self,{hurtMs:kind==='hurt'?200:0,stunMs:kind==='stun'?600:0,slowMs:0,poison:null});
    assert.equal(r.self.pending,null,'the interrupted action is discarded');
    const end=r.self.castUntil;r.tick(end-1);assert.equal(r.casts.length,1);
    r.tick(end);assert.equal(r.casts.length,2);assert.equal(r.casts[1].target,r.enemy.id);
  });
  test(`movement during ${kind} cancels focus permanently`,()=>{
    const r=fixture();r.click();r.tick(1000);r.w.now=1050;
    applyHitEffects(r.w,r.enemy,r.self,{hurtMs:kind==='hurt'?200:0,stunMs:kind==='stun'?600:0,slowMs:0,poison:null});
    commandMove(r.w,r.self,100,0);r.tick(2000);r.tick(4000);
    assert.equal(r.casts.length,1);assert.equal(r.self.a.attackTarget,'');
  });
}

test('a click before the first strike is remembered through control, and another click replaces it',()=>{
  const r=fixture();r.enemy.a.x=500;r.click();r.tick(1000);assert.equal(r.casts.length,0);
  applyHitEffects(r.w,r.other,r.self,{hurtMs:200,stunMs:0,slowMs:0,poison:null});
  r.click(r.other);r.tick(1199);assert.equal(r.casts.length,0);
  r.tick(1200);assert.equal(r.casts[0].target,r.other.id);
});

test('buffs and one-shot attacks temporarily replace the action, never the clicked focus',()=>{
  const r=fixture();r.click();r.tick(1000);
  r.w.now=1100;commandCast(r.w,r.self,273,undefined,0,0);r.tick(1200);
  assert.equal(r.casts[1].skill,273);r.tick(1400);assert.equal(r.casts[2].target,r.enemy.id);
  r.w.now=1450;commandCast(r.w,r.self,1,r.other.id,30,0,false);r.tick(1600);
  assert.equal(r.casts[3].target,r.other.id);r.tick(1800);assert.equal(r.casts[4].target,r.enemy.id);
});

test('cooldown and mana delays retain focus without repeated notices, then resume immediately',()=>{
  const r=fixture();r.error('Không đủ nội lực.');r.click();
  for(let now=1000;now<2000;now+=50)r.tick(now);
  assert.equal(r.casts.length,0);assert.equal(r.notices.length,1);
  r.error(null);r.ready(false);r.tick(2000);assert.equal(r.casts.length,0);
  r.ready(true);r.tick(2050);assert.equal(r.casts.length,1);assert.equal(r.casts[0].target,r.enemy.id);
});

for(const invalid of ['dead','missing','safe'] as const) test(`a ${invalid} target ends focus and never attacks a replacement`,()=>{
  const r=fixture();r.click();r.tick(1000);
  if(invalid==='dead')r.enemy.dead=true;
  if(invalid==='missing')r.w.sims.delete(r.enemy.id);
  if(invalid==='safe')r.w.rules.safe=true;
  r.tick(1300);r.w.rules.safe=false;r.enemy.dead=false;r.w.sims.set(r.enemy.id,r.enemy);r.tick(2000);
  assert.equal(r.casts.length,1);assert.equal((r.self as any).lockedAttack,undefined);
});

test('death drops the remembered focus, even if the same Sim later comes alive',()=>{
  const r=fixture();r.click();r.tick(1000);kill(r.w,r.self,undefined);
  r.self.dead=false;r.self.hp=r.self.a.hp=100;r.tick(2000);
  assert.equal(r.casts.length,1);assert.equal((r.self as any).lockedAttack,undefined);
});

test('a valid distant clicked enemy remains the focus instead of silently timing out at 1600px',()=>{
  const r=fixture();r.enemy.a.x=2000;r.click();r.tick(1000);
  assert.equal(r.casts.length,0);r.enemy.a.x=20;r.tick(1100);
  assert.equal(r.casts.length,1);assert.equal(r.casts[0].target,r.enemy.id);
});
