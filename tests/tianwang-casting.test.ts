import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SkillEngine, getSkill, skillCost, skillActionMs, skillResourceCost, skillHpReserve, canPaySkillCost,
  validateCastingTuning, tuningOf, describeSkill, attackTiming, monsterCombat, AutoPlay, DEFAULT_AUTO,
  type Combatant, type EnginePort, type FxEvent, type HitResult, type AutoHost, type AutoActor,
} from '../packages/shared/src/index.js';
import { TIANWANG_CASTING, TUNING } from '../packages/shared/src/skills/factions/tianwang/tuning.js';

function harness(id = 323, level = 20, kind: Combatant['kind'] = 'player') {
  let now = 0;
  const s = getSkill(id)!;
  const actor: Combatant = { id:'caster',kind,a:{x:0,y:0,dir:6,mounted:false,maxHp:100000},hp:100000,dead:false,
    element:'kim',mp:0,baseDamage:[100,100],weaponType:s.weapon ?? -1,skills:new Map([[id,level]]),cooldowns:new Map() };
  const target: Combatant = {...actor,id:'target',kind:'monster',a:{...actor.a,x:30,maxHp:1e9},hp:1e9,skills:new Map(),cooldowns:new Map()};
  const events: {at:number;event:FxEvent}[] = [], hits: {at:number;hit:HitResult}[] = [];
  const port: EnginePort = {now:()=>now,random:()=>.5,combatants:()=>[actor,target],get:id=>id===actor.id?actor:id===target.id?target:undefined,
    hostile:(a,b)=>a.id!==b.id,friendly:(a,b)=>a.id===b.id,stats:c=>({...monsterCombat(100,'kim',0,0,{}),ar:1e9,evade:0}),
    damage:(_a,_t,hit)=>hits.push({at:now,hit}),heal:()=>{},addState:()=>{},removeState:()=>{},emit:event=>events.push({at:now,event})};
  const engine = new SkillEngine(port);
  return {actor,target,events,hits,engine,get now(){return now;},
    tick(t:number){now=t;engine.update();},
    pump(to:number,step=1){while(now<to){now=Math.min(to,now+step);engine.update();}},
    cast(ms?:number){return engine.cast(actor,id,target,{x:target.a.x,y:target.a.y},ms);}};
}

test('all 15 configured actions ignore equipment speed; cold doubles only fixed durations', () => {
  let n=0;
  for(const group of ['slow','medium','fast'] as const)for(const id of TIANWANG_CASTING.groups[group]){
    const s=getSkill(id)!;n++;
    for(const bonus of [0,100,200]){
      const fallback=attackTiming({attackspeed_v:[bonus,0,0]},true,false).cycleMs;
      assert.equal(skillActionMs(s,fallback),TIANWANG_CASTING.cyclesMs[group]);
      assert.equal(skillActionMs(s,fallback,true),TIANWANG_CASTING.cyclesMs[group]*2);
      assert.equal(skillActionMs(s,fallback,false),TIANWANG_CASTING.cyclesMs[group]);
    }
  }
  assert.equal(n,15);
  for(const id of [1,14,33,40,42,708])assert.equal(skillActionMs(getSkill(id)!,777,true),777);
});

test('HP payment works at zero MP, once for a full combo and at effective level', () => {
  for(const id of TIANWANG_CASTING.lifeSkills){
    const h=harness(id);h.actor.skillBonus=new Map([[id,3]]);
    const amount=skillCost(getSkill(id)!,23);
    assert.equal(h.engine.check(h.actor,id),null,`skill ${id}`);
    assert.ok(!h.cast().rejected,`skill ${id}`);
    assert.equal(h.actor.hp,100000-amount,`skill ${id}`);assert.equal(h.actor.mp,0);
    h.pump(4000);assert.equal(h.actor.hp,100000-amount,`children of ${id} cannot spend`);
  }
});

test('HP reserve has exact integer boundaries; direct rejected casts mutate nothing', () => {
  for(const maxHp of [1000,1001,3]){
    const h=harness();h.actor.a.maxHp=maxHp;
    const cost=skillResourceCost(getSkill(323)!,20),reserve=skillHpReserve(cost,maxHp);
    h.actor.mp=1e9;h.actor.hp=reserve+cost.amount-1;
    assert.equal(canPaySkillCost(cost,{...h.actor,maxHp}),false);
    const before=h.actor.hp;assert.match(h.engine.check(h.actor,323)!,/sinh lực/);
    assert.equal(h.cast().rejected,true);assert.equal(h.actor.hp,before);assert.equal(h.actor.mp,1e9);
    assert.equal(h.events.length,0);assert.equal(h.actor.cooldowns.size,0);
    h.actor.hp=reserve+cost.amount;assert.equal(h.engine.check(h.actor,323),null);
    assert.ok(!h.cast().rejected);assert.equal(h.actor.hp,reserve);
  }
  for(const hp of [0,1]){const h=harness();h.actor.hp=hp;assert.equal(h.cast().rejected,true);assert.equal(h.actor.hp,hp);}
});

test('weapon, horse, unlearned, cooldown and death reject before payment', () => {
  const cases=[
    (h:ReturnType<typeof harness>)=>{h.actor.weaponType=-1;},
    (h:ReturnType<typeof harness>)=>{h.actor.a.mounted=true;},
    (h:ReturnType<typeof harness>)=>{h.actor.skills.clear();},
    (h:ReturnType<typeof harness>)=>{h.actor.cooldowns.set(323,10000);},
    (h:ReturnType<typeof harness>)=>{h.actor.dead=true;},
  ];
  for(const setup of cases){const h=harness();setup(h);assert.equal(h.cast().rejected,true);assert.equal(h.actor.hp,100000);assert.equal(h.events.length,0);}
});

test('other factions retain MP; monsters retain free casts; passives are not charged', () => {
  const h=harness(14);assert.equal(h.cast().rejected,true);h.actor.mp=1000;
  const before=h.actor.mp;assert.ok(!h.cast().rejected);assert.equal(h.actor.mp,before-skillCost(getSkill(14)!,20));assert.equal(h.actor.hp,100000);
  const m=harness(323,20,'monster');m.actor.hp=1;assert.ok(!m.cast().rejected);assert.equal(m.actor.hp,1);assert.equal(m.actor.mp,0);
  const p=harness(36);assert.equal(p.cast().rejected,true);assert.equal(p.actor.hp,100000);
  assert.equal(skillResourceCost(getSkill(708)!,20).resource,'mp');
});

test('interruption cancels unreleased work, never refunds life; launched five-hit combo survives', () => {
  const h=harness();h.cast();const hp=h.actor.hp;h.engine.interrupt(h.actor.id);h.pump(4000);
  assert.equal(h.actor.hp,hp);assert.equal(h.hits.length,0);
  const g=harness();const pose=g.cast();g.pump(pose.ms);g.engine.interrupt(g.actor.id);g.pump(4000);
  assert.equal(g.hits.length,5);assert.ok(g.hits.every(x=>x.hit.skill===323));
});

for(const id of [30,35,41,322,323,324,325,1058,1059,1060]){
  test(`skill ${id}: unchanged child timeline, hit damage and tiers at fast vs old duration`,()=>{
    const fixed=skillActionMs(getSkill(id)!,999);
    const run=(duration:number)=>{const h=harness(id,25);h.cast(duration);h.pump(duration);h.pump(duration+4000);
      return {hits:h.hits.map(x=>({at:Math.round((x.at-duration)*100)/100,hit:x.hit})),
        missiles:h.events.filter(x=>x.event.t==='msl').map(x=>({at:Math.round((x.at-duration)*100)/100,...x.event})),hp:h.actor.hp};};
    const a=run(fixed),b=run(1000);
    // Same 1ms sampling remainder relative to release matters for missile collision substeps.
    assert.deepEqual(a.hits.map(x=>x.hit),b.hits.map(x=>x.hit));
    assert.equal(a.missiles.length,b.missiles.length);assert.equal(a.hp,b.hp);
    assert.ok(a.hits.length>0,`real skill ${id} must damage the target`);
    if(id===323)assert.equal(a.hits.length,5);
    if(id===35)assert.equal(a.hits.length,3);
    if(id===41)assert.equal(a.hits.length,4);
    for(let i=0;i<a.missiles.length;i++)assert.ok(Math.abs(a.missiles[i].at-b.missiles[i].at)<=1.01);
  });
}

test('10-second 20Hz repeated casts retain all five-hit combos and pay once per cast', () => {
  const h=harness(),cycle=skillActionMs(getSkill(323)!,999);let next=0,casts=0;
  for(let t=0;t<=10000;t+=50){h.tick(t);if(t>=next){const pose=h.cast(cycle);assert.ok(!pose.rejected);casts++;next=t+pose.ms;}}
  const hp=h.actor.hp;h.pump(14000,1);
  const expectedInterval = Math.ceil(cycle / 50) * 50;
  const expectedCasts = Math.floor(10000 / expectedInterval) + 1;
  assert.equal(casts, expectedCasts);
  assert.equal(h.actor.hp, 100000 - casts * skillCost(getSkill(323)!, 20));
  assert.equal(h.actor.hp, hp);
  assert.equal(h.hits.length, casts * 5);
  const amounts = h.hits.map(x => x.hit.dmg);
  assert.ok(amounts.every(x => x === amounts[0]));
  console.log(JSON.stringify({ skill: 323, windowMs: 10000, serverTickMs: 50, actionMs: cycle, actualCastIntervalMs: expectedInterval, casts, hitsAfterDrain: h.hits.length, lifeSpent: 100000 - hp, damageAfterDrain: amounts.reduce((a, b) => a + b, 0) }));
});

test('tooltip and configurable overrides expose one resource and one timing source', () => {
  const s=getSkill(323)!,text=JSON.stringify(describeSkill(s,20,20));
  assert.match(text,/sinh lực/);assert.match(text,/Nhịp xuất chiêu riêng/);
  const old=TUNING[323];
  try{
    TUNING[323]={...old,timing:{cycleMs:420,affectedByCold:false},resourceCost:{resource:'hp',minRemainingHpRatio:.4,minRemainingHp:2},cost:2};
    validateCastingTuning([323]);assert.equal(skillActionMs(s,999,true),420);
    assert.equal(skillResourceCost(s,20).amount,skillCost(s,20));assert.equal(skillHpReserve(skillResourceCost(s,20),1000),400);
    TUNING[323]={...old,timing:{cycleMs:NaN,affectedByCold:true}};assert.throws(()=>validateCastingTuning([323]));
    TUNING[323]={...old,resourceCost:{resource:'hp',minRemainingHpRatio:1.1,minRemainingHp:1}};assert.throws(()=>validateCastingTuning([323]));
    TUNING[323]={...old,cost:-1};assert.throws(()=>validateCastingTuning([323]));
  }finally{TUNING[323]=old;}
  assert.equal(tuningOf(323),old);
});

test('Auto at low HP waits without basic-attack bypass or MP cost requests', () => {
  const self:AutoActor={id:'self',x:0,y:0,isSelf:true,state:{kind:'player',level:100,hp:250,maxHp:1000,mp:0,maxMp:1000,boss:0}};
  const target:AutoActor={id:'enemy',x:20,y:0,isSelf:false,state:{kind:'monster',level:100,hp:1000,maxHp:1000,mp:0,maxMp:0,boss:0}};
  const casts:number[]=[],notices:string[]=[];let uses=0;
  const cost=skillResourceCost(getSkill(323)!,20);
  const host:AutoHost={learnedSkills:()=>[323],aura:()=>{},self:()=>self,actors:()=>[target],safe:()=>false,skillAt:slot=>slot==='left'?323:null,
    usable:()=>true,ready:id=>id===1||canPaySkillCost(cost,self.state),cost:()=>0,resourceCost:id=>id===323?cost:undefined,range:()=>100,melee:()=>true,
    cast:id=>{casts.push(id);},move:()=>{},bag:()=>[],money:()=>0,use:()=>{uses++;},sell:()=>{},buy:()=>{},wearable:()=>false,drops:()=>[],pickup:()=>{},
    train:()=>{},goTown:()=>{},respawn:()=>{},notice:x=>notices.push(x),stop:()=>{}};
  const auto=new AutoPlay(host),opts={...DEFAULT_AUTO,autoBuff:false,autoCurse:false,autoMap:false,autoBuyPotion:false,autoPickup:false,autoMoney:false,autoHp:0,autoMp:0};
  auto.start();auto.update(1000,opts);assert.deepEqual(casts,[]);assert.equal(uses,0);assert.deepEqual(notices,[]);
  self.state.hp=1000;auto.update(2000,opts);assert.deepEqual(casts,[323]);assert.deepEqual(notices,[]);
});
