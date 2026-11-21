import assert from 'node:assert/strict';
import test from 'node:test';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { applyHit } from '../apps/server/src/world/systems/combat.js';
import { applyHitEffects, updateEffects } from '../apps/server/src/world/systems/effects.js';
import { SkillEngine } from '../packages/shared/src/skills/engine/SkillEngine.js';
import type { World } from '../apps/server/src/world/World.js';

for (const kind of ['player', 'monster'] as const) {
  test(`${kind}: flinch interrupts casting and queued commands, preserving combat target`, () => {
    const a = new Actor(); a.hp = 100; a.attackTarget = 'enemy';
    const sim = makeSim(kind, kind, a, 'kim', 100);
    sim.castUntil = 5000; sim.path = [{x: 10, y: 0}];
    sim.pending = {skill: 1} as typeof sim.pending;
    let interrupted = '';
    const w = {now: 1000, events: [], engine: {interrupt(id: string) {interrupted = id;}}} as unknown as World;
    applyHitEffects(w, sim, sim, {stunMs: 0, slowMs: 0, poison: null, hurtMs: 200});
    assert.equal(interrupted, kind); assert.equal(sim.castUntil, 1200);
    assert.equal(sim.a.anim, 'hurt'); assert.equal(sim.a.actionMs, 200);
    assert.equal(sim.pending, null); assert.deepEqual(sim.path, []);
    assert.equal(sim.a.attackTarget, 'enemy');
    w.now = 1050;
    applyHitEffects(w, sim, sim, {stunMs: 800, slowMs: 0, poison: null, hurtMs: 100});
    assert.equal(sim.castUntil, 1850, 'hurt must not shorten a stun');
    assert.equal(sim.a.ctl & 1, 1);
  });
  test(`${kind}: poison ticks and expires with synced control flag`, () => {
    const a = new Actor(); a.hp = 100;
    const sim = makeSim(kind, kind, a, 'kim', 100);
    const w = {now: 1000, events: [], sims: new Map([[kind, sim]])} as unknown as World;
    applyHitEffects(w, sim, sim, {stunMs: 0, slowMs: 0, hurtMs: 0, poison: {tick: 10, periodMs: 100, totalMs: 300}});
    assert.equal(a.ctl, 4);
    let damage = 0; w.now = 1300; updateEffects(w, sim, (_, n) => {damage += n;});
    assert.equal(damage, 30); assert.equal(a.ctl, 0);
  });
}

test('engine interrupts pending cast, retaining released work and held aura', () => {
  const e = new SkillEngine({now: () => 1000} as any) as any;
  const fired: string[] = [];
  e.auras.set('caster', {s: {id: 1}, level: 1, next: 5000});
  e.timers = [{at: 2000, owner: 'caster', casting: true, run: () => fired.push('cast')},
    {at: 2000, owner: 'caster', run: () => fired.push('released')},
    {at: 2000, owner: 'other', casting: true, run: () => fired.push('other')}];
  e.missiles = [{mid: 1}];
  e.interrupt('caster');
  assert.equal(e.timers.length, 2); assert.equal(e.auras.size, 1); assert.equal(e.missiles.length, 1);
  e.cancel('caster'); assert.equal(e.timers.length, 1); assert.equal(e.auras.size, 0);
});

test('a hit interrupts a cast even when both timers are due in the same tick', () => {
  const e = new SkillEngine({now: () => 2000} as any) as any;
  const fired: string[] = [];
  e.timers = [{at: 1900, owner: 'enemy', run: () => {fired.push('hit'); e.interrupt('caster');}},
    {at: 2000, owner: 'caster', casting: true, run: () => fired.push('cast')}];
  e.update(); assert.deepEqual(fired, ['hit']);
});

for (const kind of ['player', 'monster'] as const) {
  test(`${kind}: a real pending cast emits no missile after flinch and can cast again`, async () => {
    const {monsterCombat, getSkill} = await import('../packages/shared/src/index.js');
    const a = new Actor(); Object.assign(a, {hp: 100, maxHp: 100, mounted: false});
    const sim = makeSim('caster', kind, a, 'kim', 100); sim.mp = 1e9; sim.skills.set(14, 1);
    const events: any[] = [];
    const w = {now: 1000, events, sims: new Map([[sim.id, sim]])} as unknown as World;
    const engine = new SkillEngine({now: () => w.now, random: () => .5,
      get: id => id === sim.id ? sim : undefined, combatants: () => [sim], hostile: () => false, friendly: () => true,
      stats: () => monsterCombat(10, 'kim', 0, 0, {}), damage() {}, heal() {}, addState() {}, removeState() {}, emit: e => events.push(e)});
    Object.assign(w, {engine});
    engine.cast(sim, 14, undefined, {x: 300, y: 0}, 800); sim.castUntil = 1800;
    w.now = 1200; applyHitEffects(w, sim, sim, {stunMs: 0, slowMs: 0, poison: null, hurtMs: 200});
    w.now = 2500; engine.update(); assert.equal(events.filter(e => e.t === 'msl').length, 0);
    engine.cast(sim, 14, undefined, {x: 300, y: 0}, 800);
    w.now = 3300; engine.update(); w.now += (getSkill(14)!.wait ?? 0) * 1000 / 18 + 1; engine.update();
    assert.equal(events.filter(e => e.t === 'msl').length, 1, 'a new cast works after recovery');
  });
}

test('doubled stun keeps skill duration, equipment reduction, attacker enhancement and miss rules', async () => {
  const {hitEffects, getSkill, monsterCombat} = await import('../packages/shared/src/index.js');
  const skill = getSkill(20)!; // level 20: 27 frames = 1500ms before the user multiplier
  const hit = {miss: false, dmg: 10, crit: false, fatal: false, parts: {phys: 10, cold: 0, fire: 0, light: 0}, poison: null};
  const attacker = monsterCombat(10, 'kim', 0, 0, {});
  for (const [reduce, expected] of [[0, 3000], [40, 1800], [80, 600], [100, 150]] as const) {
    const target = monsterCombat(10, 'kim', 0, 0, {stuntimereduce_p: [reduce, 0, 0]});
    const fx = hitEffects(skill, 20, attacker, target, hit, () => 0);
    assert.equal(fx.stunMs, expected);
    const actor = new Actor(); actor.hp = 100;
    for (const kind of ['player', 'monster'] as const) {
      const sim = makeSim(kind, kind, actor, 'kim', 100);
      const w = {now: 1000, events: []} as unknown as World;
      applyHitEffects(w, sim, sim, {...fx, hurtMs: 0});
      assert.equal(sim.effects!.stunUntil, 1000 + expected);
      w.now = 1000 + expected - 1; updateEffects(w, sim, () => {}); assert.equal(actor.ctl & 1, 1);
      w.now++; updateEffects(w, sim, () => {}); assert.equal(actor.ctl & 1, 0);
    }
  }
  const enhanced = monsterCombat(10, 'kim', 0, 0, {anti_stuntimereduce_p: [50, 0, 0]});
  assert.equal(hitEffects(skill, 20, enhanced, attacker, hit, () => 0).stunMs, 4500);
  assert.equal(hitEffects(skill, 20, attacker, attacker, {...hit, miss: true}, () => 0).stunMs, 0);
  assert.equal(hitEffects(skill, 20, attacker, attacker, hit, () => .99).stunMs, 0);
});

test('poison DoT bypasses manashield_p (Toa Vong Vo Nga) and drains HP directly', async () => {
  const {monsterCombat} = await import('../packages/shared/src/index.js');
  const mkPlayer = (id: string, element: 'moc' | 'tho', hp: number, mp: number, manashieldPct = 0) => {
    const a = new Actor();
    Object.assign(a, {id, name: id, hp, maxHp: hp, mp, maxMp: mp, level: 80, pk: 1, camp: element === 'moc' ? 'evil' : 'justice'});
    const sim = makeSim(id, 'player', a, element, hp);
    sim.mp = mp;
    sim.combat = monsterCombat(80, element, 0, 0, manashieldPct ? {manashield_p: [manashieldPct, 0, 0]} : {});
    return sim;
  };
  const attacker = mkPlayer('wudu', 'moc', 2000, 1000, 0);
  const target = mkPlayer('wudang', 'tho', 1000, 5000, 99);
  const w = {
    now: 1000,
    meta: {id: 1, safe: false},
    rules: {},
    events: [],
    sims: new Map([[attacker.id, attacker], [target.id, target]]),
    engine: {cancel() {}, onDeath() {}, interrupt() {}},
    hooks: {announce() {}, notify() {}, progress() {}},
  } as unknown as World;

  // Direct hit still uses manashield_p: 99% to MP, 1% to HP.
  applyHit(w, attacker, target, {dmg: 100, crit: false});
  assert.equal(target.mp, 4901);
  assert.equal(target.hp, 999);

  // Poison DoT ticks must bypass manashield_p: MP untouched, full damage to HP.
  applyHitEffects(w, attacker, target, {stunMs: 0, slowMs: 0, hurtMs: 0, poison: {tick: 200, periodMs: 100, totalMs: 300}});
  w.now = 1300;
  updateEffects(w, target, (by, dmg) => applyHit(w, by ?? target, target, {dmg, crit: false, dot: true}));
  assert.equal(target.mp, 4901, 'poison ticks must not drain MP via manashield_p');
  assert.equal(target.hp, 399, 'all 3 poison ticks (600 dmg) must drain HP directly');
  assert.equal(target.dead, false);

  // Fatal poison DoT kills target even with ample MP remaining.
  applyHit(w, attacker, target, {dmg: 500, crit: false, dot: true});
  assert.equal(target.mp, 4901, 'fatal poison tick must not be absorbed by MP');
  assert.equal(target.hp, 0);
  assert.equal(target.dead, true);
});
