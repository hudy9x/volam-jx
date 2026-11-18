import test from 'node:test';
import assert from 'node:assert/strict';
import { GOLDEN_BOSS_CONFIG, validateGoldenBossConfig, monsterAt, monsterHp, MAPS } from '../packages/shared/src/index.js';
import { goldenBossFromEntry } from '../packages/shared/src/monsters/monsters.js';
import { leashes } from '../apps/server/src/world/ai/boss.js';
import { updateMonster } from '../apps/server/src/world/ai/monster.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { Actor } from '../apps/server/src/net/schema.js';
import type { World } from '../apps/server/src/world/World.js';

test('old config keeps level HP and timing; overrides survive serialization and spawn scaling', () => {
  const b = {...GOLDEN_BOSS_CONFIG.bosses[0]};
  delete b.hp; delete b.attackCooldown; delete b.leash;
  const old = goldenBossFromEntry(b);
  assert.equal(monsterAt(old).hp, monsterHp(b.level, 2));
  assert.equal(old.attackCooldown, 1.2);
  assert.equal(old.leash, 1100);
  const cfg = structuredClone(GOLDEN_BOSS_CONFIG);
  Object.assign(cfg.bosses[0], {hp: 1234567, attackCooldown: 0.35, leash: 300});
  const saved = JSON.parse(JSON.stringify(cfg));
  assert.equal(validateGoldenBossConfig(saved), null);
  const def = goldenBossFromEntry(saved.bosses[0]);
  assert.equal(monsterAt(def, 150, 2).hp, 1234567);
  assert.equal(def.attackCooldown, 0.35);
  assert.equal(def.leash, 300);
  assert.equal(leashes(def), true);
  assert.equal(leashes({...def, boundedHome: false}), false);
});

test('reject invalid overrides while preserving old configs', () => {
  for (const [key, values] of Object.entries({hp:[0, 1.5, 2000000001, null, '500'], attackCooldown:[0, 61, null, '1'], leash:[0, 10001, null, '300']})) {
    for (const value of values) {
      const cfg = structuredClone(GOLDEN_BOSS_CONFIG);
      Object.assign(cfg.bosses[0], {[key]:value});
      assert.ok(validateGoldenBossConfig(cfg), `${key}=${value}`);
    }
  }
});

test('boss outside radius returns even without a target; cannot resume until near home', () => {
  const def = goldenBossFromEntry({...GOLDEN_BOSS_CONFIG.bosses[0],leash:300});
  const a = new Actor(); Object.assign(a,{x:1000,y:1000,hp:100,maxHp:100,boss:2});
  const sim = makeSim('boss','monster',a,def.element,210);
  sim.def=def; sim.home={x:100,y:100}; sim.hp=50;
  const w = {now:Date.now(),sims:new Map(),meta:MAPS[140],grid:{w:2000,h:2000,gw:100,gh:100,cw:20,ch:20,ok:new Uint8Array(10000).fill(1),free:10000,comp:new Int32Array(10000),isl:[10000]},astarBudget:6} as unknown as World;
  updateMonster(w,sim,0.05);
  assert.equal(sim.returning,true);
  assert.equal(sim.target,null);
  sim.path=[];
  updateMonster(w,sim,0.05);
  assert.equal(sim.returning,true);
  assert.equal(sim.hp,50);
  a.x=100;a.y=100;sim.path=[];
  updateMonster(w,sim,0.05);
  assert.equal(sim.returning,false);
  assert.equal(sim.hp,100);
});

test('target beyond home radius makes an inside boss abandon chase', () => {
  const def = goldenBossFromEntry({...GOLDEN_BOSS_CONFIG.bosses[0],leash:300});
  const actor = new Actor();Object.assign(actor,{x:200,y:100,hp:100,maxHp:100,boss:2});
  const boss = makeSim('boss','monster',actor,def.element,210);
  boss.def=def;boss.home={x:100,y:100};boss.target='player';
  const playerActor = new Actor();Object.assign(playerActor,{x:500,y:100,hp:100,maxHp:100,protectedUntil:0});
  const player = makeSim('player','player',playerActor,'kim',210);
  const w = {now:Date.now(),sims:new Map([['player',player]]),meta:{...MAPS[140],safe:false},rules:{safe:false,pvp:false},grid:{w:2000,h:2000,gw:100,gh:100,cw:20,ch:20,ok:new Uint8Array(10000).fill(1),free:10000,comp:new Int32Array(10000),isl:[10000]},astarBudget:6} as unknown as World;
  updateMonster(w,boss,0.05);
  assert.equal(boss.returning,true);
  assert.equal(boss.target,null);
  assert.equal(boss.plan,null);
});

test('reload, actual spawn and AI casts apply 500000 HP and a 200ms replicated pose', async () => {
  const {registerNav, setGoldenBossConfig, syncGoldenBossMonsters, getGoldenBossConfig, attackTiming} = await import('../packages/shared/src/index.js');
  const {World} = await import('../apps/server/src/world/World.js');
  const {reloadSpawns, updateSlots} = await import('../apps/server/src/world/systems/spawner.js');
  const {castTiming} = await import('../apps/server/src/world/systems/effects.js');
  const {MapSchema} = await import('@colyseus/schema');
  const before = getGoldenBossConfig();
  const map = MAPS[140];
  registerNav(140,{kind:'grid',columns:64,rows:64,cellSize:{width:map.raw.size.width/64,height:map.raw.size.height/64},blockedBase64:Buffer.alloc(512).toString('base64')});
  const cfg=structuredClone(GOLDEN_BOSS_CONFIG);
  cfg.settings.spawnMode='continuous';
  cfg.bosses=[{...cfg.bosses[0],mapId:140,x:2000,y:2000,hp:500000,attackCooldown:0.2,leash:1100}];
  try {
    setGoldenBossConfig(cfg);syncGoldenBossMonsters(cfg);
    const noop=()=>{};
    const w=new World(140,new MapSchema(),{transfer:noop,notify:noop,log:noop,announce:noop,progress:noop,skills:noop,inventory:noop});
    reloadSpawns(w);w.now+=3000;updateSlots(w);
    const boss=[...w.sims.values()].find(s=>s.def?.id===cfg.bosses[0].id)!;
    assert.ok(boss,'configured boss spawned after reload');
    assert.equal(boss.hp,500000);assert.equal(boss.a.hp,500000);assert.equal(boss.a.maxHp,500000);
    for(const [id] of boss.skills)assert.equal(castTiming(w,boss,id).cycleMs,200,`boss skill ${id}`);
    // Force a usable attack with no independent skill cooldown to measure the AI cycle.
    boss.skills=new Map([[1,1]]);
    const a=new Actor();Object.assign(a,{x:boss.a.x+10,y:boss.a.y,hp:10000000,maxHp:10000000,protectedUntil:0});
    const player=makeSim('player','player',a,'kim',210);w.add(player);boss.target=player.id;
    const starts:number[]=[];
    for(let i=0;i<=1000;i+=50){w.now+=50;updateMonster(w,boss,0.05);if(w.events.some(e=>e.t==='cast'))starts.push(w.now);w.events.length=0;}
    assert.ok(starts.length>=5,`casts=${starts.length}`);
    for(let i=1;i<starts.length;i++)assert.equal(starts[i]-starts[i-1],200);
    assert.equal(boss.a.actionMs,200);
    boss.effects={stunUntil:0,slowUntil:w.now+1000,poison:null,poisonBy:''};
    assert.equal(castTiming(w,boss,1).cycleMs,200/attackTiming({},true,true).multiplier);
    // Restoring automatic timing must not preserve a stale boss override.
    const automatic={...cfg.bosses[0]};delete automatic.hp;delete automatic.attackCooldown;
    cfg.bosses=[automatic];setGoldenBossConfig(cfg);syncGoldenBossMonsters(cfg);reloadSpawns(w);w.now+=3000;updateSlots(w);
    const next=[...w.sims.values()].find(s=>s.def?.id===automatic.id)!;
    assert.equal(next.a.maxHp,monsterHp(automatic.level,2));
    assert.equal(next.def?.attackCycleMs,undefined);
    // Editing skills uses exact learned levels and makes a 150 attack available to AI.
    cfg.bosses=[{...automatic,skills:[[1055,20],[1056,16],[1057,11]],skillLevelsFixed:true,attackCooldown:0.2}];
    setGoldenBossConfig(cfg);syncGoldenBossMonsters(cfg);reloadSpawns(w);w.now+=3000;updateSlots(w);
    const trained=[...w.sims.values()].find(s=>s.def?.id===automatic.id)!;
    assert.deepEqual([...trained.skills],cfg.bosses[0].skills);
    trained.target=player.id;w.random=()=>0;w.events.length=0;
    updateMonster(w,trained,0.05);
    assert.ok(w.events.some(e=>e.t==='cast' && e.skill===1055),'AI casts configured 150 skill');
    assert.equal(trained.a.actionMs,200);
  }finally{setGoldenBossConfig(before);syncGoldenBossMonsters(before);}
});


test('skill editor config validates IDs, exact levels, duplicates and usable attacks', () => {
  for(const skills of [[],[[999999,1]],[[1055,0]],[[1055,27]],[[1055,1.5]],[[1055,20],[1055,10]],[[1055]],[[178,1]]]) {
    const cfg=structuredClone(GOLDEN_BOSS_CONFIG);Object.assign(cfg.bosses[0],{skills,skillLevelsFixed:true});
    assert.ok(validateGoldenBossConfig(cfg),JSON.stringify(skills));
  }
  const cfg=structuredClone(GOLDEN_BOSS_CONFIG);Object.assign(cfg.bosses[0],{skills:[[1055,26],[1057,16]],skillLevelsFixed:true});
  assert.equal(validateGoldenBossConfig(cfg),null);
  assert.deepEqual(monsterAt(goldenBossFromEntry(cfg.bosses[0]),90,2).skills,[[1055,26],[1057,16]]);
});
