import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SPEED, SkillEngine, attackTiming, getSkill, monsterCombat, moveFactor, resolveSpeed, totalSpeedPercents, validateSpeedConfiguration,
  applyState, expireStates, stateBag, attrOf, type ActiveStates,
  type Combatant, type EnginePort, type FxEvent,
} from '../packages/shared/src/index.js';
import { speedLabUrl, readSpeedSample } from '../apps/client/src/dev/skill-lab/speedSample.js';

// Check the shipped table, including values immediately below each phase and both caps.
test('both tracks match the approved phases and cap after composition', () => {
  const expected = {
    run: [
      [5, 3], [10, 6], [20, 7], [30, 7], [50, 7], [70, 8],
      [110, 8], [130, 9], [150, 10], [170, 10], [190, 10], [210, 10],
      [230, 12], [250, 12], [260, 13],
    ],
    attack: [
      [5, 10], [10, 16], [20, 17], [30, 18], [50, 20], [70, 22],
      [85, 23], [110, 24], [130, 26], [150, 28], [160, 30], [180, 32],
      [200, 34], [220, 36], [240, 38], [260, 40],
    ],
  };
  for (const kind of ['run','attack'] as const) {
    expected[kind].forEach(([percent,fps],i) => {
      assert.equal(resolveSpeed(kind,percent).fps,fps);
      if(i) assert.equal(resolveSpeed(kind,percent-.01).fps,expected[kind][i-1][1]);
    });
    assert.equal(resolveSpeed(kind,-100).phasePercent,5);
    assert.equal(resolveSpeed(kind,999).phasePercent,260);
    assert.equal(resolveSpeed(kind,NaN).phasePercent,10);
    assert.equal(resolveSpeed(kind,Infinity).phasePercent,260);
  }
  assert.equal(moveFactor({fastwalkrun_p:[100,0,0]},false), 8 / 6); // (10 + 100) = 110% -> 8 FPS / 6 FPS = 8/6
  assert.equal(attackTiming({attackspeed_v:[40,0,0],attackspeed_yan_v:[39,0,0]},true,false).phasePercent,85); // 10 + 79 = 89% -> mốc 85%
  assert.equal(attackTiming({castspeed_v:[20,0,0],castspeed_yan_v:[0,0,0]},false,false).phasePercent,30); // 10 + 20 = 30% -> mốc 30%
});

test('config can be tuned without silently accepting broken phases', () => {
  const config=structuredClone(SPEED) as unknown as Parameters<typeof validateSpeedConfiguration>[0];
  config.run.phases = config.run.phases.map(p=>({...p}));
  const last = config.run.phases.at(-1) as { fps: number };
  last.fps = 15;
  validateSpeedConfiguration(config);
  assert.equal(resolveSpeed('run',260,config).fps,15);
  assert.equal(resolveSpeed('run',260).fps,13);
  last.fps = -1;
  assert.throws(()=>validateSpeedConfiguration(config));
});

function harness() {
  let now=0;
  const actor: Combatant={id:'caster',kind:'player',a:{x:0,y:0,dir:0,mounted:false,maxHp:100},hp:100,dead:false,
    element:'kim',mp:1e9,baseDamage:[10,10],weaponType:-1,skills:new Map([[14,1]]),cooldowns:new Map()};
  const events:FxEvent[]=[];
  const port:EnginePort={now:()=>now,random:()=>.5,combatants:()=>[actor],get:id=>id===actor.id?actor:undefined,
    hostile:()=>false,friendly:()=>true,stats:()=>monsterCombat(10,'kim',0,0,{}),damage:()=>{},heal:()=>{},addState:()=>{},removeState:()=>{},emit:e=>events.push(e)};
  return {actor,events,engine:new SkillEngine(port),at:(t:number)=>{now=t;}};
}

test('attack snapshots its phase, releases one primary cast, and death cancels it', () => {
  for(const percent of [5,10,85,260,999]){
    const h=harness(), duration=resolveSpeed('attack',percent).cycleMs;
    const pose=h.engine.cast(h.actor,14,undefined,{x:300,y:0},duration);
    assert.equal(pose.ms,duration);
    h.at(duration-.001);h.engine.update();
    assert.equal(h.events.filter(e=>e.t==='msl').length,0);
    const wait=(getSkill(14)!.wait??0)*1000/18;
    // Pump at release and then at the skill's own wait: effect clocks are independent of ASPD.
    h.at(duration);h.engine.update();h.at(duration+wait+1);h.engine.update();
    assert.equal(h.events.filter(e=>e.t==='msl').length,1);
    h.engine.update();assert.equal(h.events.filter(e=>e.t==='msl').length,1);
  }
  const h=harness();h.engine.cast(h.actor,14,undefined,{x:300,y:0},800);h.engine.cancel(h.actor.id);
  h.at(2000);h.engine.update();assert.equal(h.events.filter(e=>e.t==='msl').length,0);
});


test('game bonuses and run points must be converted to lab totals before comparing', () => {
  const totals = totalSpeedPercents({attackspeed_v:[79,0,0],castspeed_v:[60,0,0],fastwalkrun_p:[104,0,0]},false);
  assert.deepEqual(totals,{attack:89,cast:70,run:114});
  const sample={name:'So sánh',faction:'shaolin',gender:'male',mounted:false,horse:'',skill:14,level:10,
    ...totals,attackBonus:79,castBonus:60,runPoints:11};
  const url=speedLabUrl('http://localhost:5174/?server=unused#ignored',sample);
  assert.deepEqual(readSpeedSample(new URL(url).search),sample);
  assert.equal(resolveSpeed('attack',totals.attack).cycleMs,20 * 1000 / 23);
  assert.equal(resolveSpeed('attack',totals.cast).cycleMs,20 * 1000 / 22);
  assert.equal(resolveSpeed('run',totals.run).multiplier,moveFactor({fastwalkrun_p:[104,0,0]},false));
  assert.notEqual(resolveSpeed('attack',sample.attackBonus).cycleMs,attackTiming({attackspeed_v:[79,0,0]},true,false).cycleMs);
  assert.notEqual(resolveSpeed('run',sample.runPoints).multiplier,resolveSpeed('run',totals.run).multiplier);
  assert.deepEqual(totalSpeedPercents({attackspeed_v:[90,0,0],fastwalkrun_p:[90,0,0]},true),{attack:50,cast:5,run:50});
  assert.equal(readSpeedSample('?speedSample=broken'),null);
  assert.equal(readSpeedSample('?speedSample=%7B%7D'),null);
});

test('aura speed attributes must not expire before the next aura pulse', () => {
  const states: ActiveStates = new Map();
  const now = 10000;
  // Emei aura 86 Lưu Thủy: has fastwalkrun_p with P2 = 18 frames (~1000ms), aura duration = 2500ms
  applyState(states, { skill: 86, kind: 'buff', ms: 2500, aura: true, by: 'self', level: 20 }, now);
  assert.equal(states.size, 1);
  assert.equal(attrOf(stateBag(states, -1), 'fastwalkrun_p'), 66);

  // At now + 1000ms, a non-aura attribute with P2=18 would expire, but aura attributes must stay active!
  expireStates(states, now + 1000);
  assert.equal(attrOf(stateBag(states, -1), 'fastwalkrun_p'), 66);

  // At now + 1500ms, still active:
  expireStates(states, now + 1500);
  assert.equal(attrOf(stateBag(states, -1), 'fastwalkrun_p'), 66);

  // After 2500ms (end of aura duration when not pulsed), the entire state expires:
  expireStates(states, now + 2501);
  assert.equal(states.size, 0);
  assert.equal(attrOf(stateBag(states, -1), 'fastwalkrun_p'), 0);
});
