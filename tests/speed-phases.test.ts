import assert from 'node:assert/strict';
import test from 'node:test';
import {
  SPEED, SkillEngine, attackTiming, getSkill, monsterCombat, moveFactor, resolveSpeed, validateSpeedConfiguration,
  type Combatant, type EnginePort, type FxEvent,
} from '../packages/shared/src/index.js';

// Check the shipped table, including values immediately below each phase and both caps.
test('both tracks match the approved phases and cap after composition', () => {
  const expected = {
    run: [[25,3],[50,6],[75,9],[100,12],[120,14.4],[150,18],[200,24],[250,30],[300,36]],
    attack: [[25,5],[50,15],[75,20],[100,25],[125,35],[150,40],[200,50],[250,60],[300,70]],
  };
  for (const kind of ['run','attack'] as const) {
    expected[kind].forEach(([percent,fps],i) => {
      assert.equal(resolveSpeed(kind,percent).fps,fps);
      if(i) assert.equal(resolveSpeed(kind,percent-.01).fps,expected[kind][i-1][1]);
    });
    assert.equal(resolveSpeed(kind,-100).phasePercent,25);
    assert.equal(resolveSpeed(kind,999).phasePercent,300);
    assert.equal(resolveSpeed(kind,NaN).phasePercent,100);
    assert.equal(resolveSpeed(kind,Infinity).phasePercent,300);
  }
  assert.equal(moveFactor({fastwalkrun_p:[300,0,0]},true),2); // 400% * .5 -> 200%, not 300% * .5
  assert.equal(attackTiming({attackspeed_v:[100,0,0],attackspeed_yan_v:[200,0,0]},true,true).phasePercent,200);
  assert.equal(attackTiming({castspeed_v:[25,0,0],castspeed_yan_v:[25,0,0]},false,false).phasePercent,150);
});

test('config can be tuned without silently accepting broken phases', () => {
  const config=structuredClone(SPEED) as unknown as Parameters<typeof validateSpeedConfiguration>[0];
  config.run.phases = config.run.phases.map(p=>({...p}));
  (config.run.phases[4] as {fps:number}).fps=15;
  validateSpeedConfiguration(config);
  assert.equal(resolveSpeed('run',149,config).fps,15);
  assert.equal(resolveSpeed('run',149).fps,14.4);
  (config.run.phases[4] as {fps:number}).fps=-1;
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
  for(const percent of [25,100,200,300,999]){
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
