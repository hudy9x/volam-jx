import test from 'node:test';
import assert from 'node:assert/strict';
import { SkillEngine, monsterCombat, getSkill, GOLDEN_BOSS_CONFIG, validateGoldenBossConfig, type EnginePort, type HitResult } from '../packages/shared/src/index.js';
import { goldenBossFromEntry } from '../packages/shared/src/monsters/monsters.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { refreshMonsterCombat } from '../apps/server/src/world/systems/effects.js';
function run(skill:number, percent:number|undefined) {
  let now=0;
  const a=new Actor();Object.assign(a,{level:150,x:100,y:100,hp:100000,maxHp:100000,boss:2});
  const boss=makeSim('boss','monster',a,'kim',0);
  boss.def=goldenBossFromEntry({...GOLDEN_BOSS_CONFIG.bosses[0],damagePercent:percent});boss.skills=new Map([[skill,20]]);refreshMonsterCombat(boss);
  const t=new Actor();Object.assign(t,{x:120,y:100,hp:100000,maxHp:100000});const target=makeSim('target','player',t,'kim',0);
  const hits:HitResult[]=[];
  const port:EnginePort={now:()=>now,random:()=>0.5,combatants:()=>[boss,target],get:id=>id==='boss'?boss:target,
    hostile:(a,b)=>a.id!==b.id,friendly:()=>false,stats:c=>c.id==='boss'?boss.combat!:monsterCombat(150,'kim',0,100,{}),
    damage:(_a,_b,h)=>hits.push(h),heal:()=>{},addState:()=>{},removeState:()=>{},emit:()=>{}};
  const engine=new SkillEngine(port);assert.equal(engine.check(boss,skill),null,getSkill(skill)?.name);engine.cast(boss,skill,target,{x:120,y:100},100);
  for(now=0;now<8000;now+=20)engine.update();return {hits,boss};
}
for(const skill of [1,1055,1066])test(`skill ${skill}: 50/100/150/200 percent covers direct/child hits and poison once`,()=>{
  const base=run(skill,undefined);assert.ok(base.hits.length,`no hits ${skill}`);
  if(skill===1066)assert.ok(base.hits.some(h=>h.effects?.poison),'poison skill actually applies poison');
  assert.equal(base.boss.combat!.outgoingDamageMultiplier,1);
  for(const percent of[50,100,150,200]){const out=run(skill,percent);assert.equal(out.hits.length,base.hits.length);
    for(let i=0;i<out.hits.length;i++){assert.ok(Math.abs(out.hits[i].dmg-base.hits[i].dmg*percent/100)<=1);
      const poison=base.hits[i].effects?.poison;if(poison)assert.ok(Math.abs(out.hits[i].effects!.poison!.tick-poison.tick*percent/100)<=1);
    }
  }
});
test('damage percentage validates finite bounds and keeps old configs',()=>{
 const cfg=structuredClone(GOLDEN_BOSS_CONFIG);delete cfg.bosses[0].damagePercent;assert.equal(validateGoldenBossConfig(cfg),null);
 for(const v of[0,-1,10001,NaN,Infinity,null,'150']){Object.assign(cfg.bosses[0],{damagePercent:v});assert.ok(validateGoldenBossConfig(cfg));}
 for(const v of[1,50,100,150,150.5,10000]){cfg.bosses[0].damagePercent=v;assert.equal(validateGoldenBossConfig(cfg),null);}
});

test('boss reductions shorten suffered cold/stun/poison/hurt and preserve legacy defaults', async()=>{
 const {hitEffects}=await import('../packages/shared/src/index.js');
 const make=(controlReduction?:{hurt:number;cold:number;stun:number;poison:number})=>{
   const a=new Actor();Object.assign(a,{level:150,boss:2});const sim=makeSim('b','monster',a,'kim',0);
   sim.def=goldenBossFromEntry({...GOLDEN_BOSS_CONFIG.bosses[0],controlReduction});refreshMonsterCombat(sim);return sim.combat!;
 };
 assert.equal(make().hitRecover,60);
 const skill={...getSkill(1)!,doHurt:100,attrs:{stun_p:[[[1,100]],[[1,18]],null],colddamage_v:[[[1,10]],[[1,18]],null]}} as Parameters<typeof hitEffects>[0];
 const hit={miss:false,dmg:10,crit:false,fatal:false,parts:{phys:0,cold:10,fire:0,light:0},poison:{tick:100,frames:180,period:18}};
 const attack=monsterCombat(150,'kim',0,0,{});
 const base=hitEffects(skill,1,attack,make({hurt:0,cold:0,stun:0,poison:0}),hit,()=>0);
 const reduced=hitEffects(skill,1,attack,make({hurt:50,cold:50,stun:50,poison:50}),hit,()=>0);
 assert.equal(reduced.stunMs,base.stunMs/2);assert.equal(reduced.slowMs,base.slowMs/2);assert.equal(reduced.hurtMs,base.hurtMs/2);
 assert.equal(reduced.poison!.totalMs,base.poison!.totalMs/2);assert.equal(reduced.poison!.tick,base.poison!.tick);
 const cfg=structuredClone(GOLDEN_BOSS_CONFIG);
 for(const [key,value]of [['hurt',101],['cold',78],['stun',96],['poison',96],['cold',-1],['stun',NaN]]){Object.assign(cfg.bosses[0],{controlReduction:{[key]:value}});assert.ok(validateGoldenBossConfig(cfg));}
});
