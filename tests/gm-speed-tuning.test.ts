import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_SPEED,
  SPEED,
  formatSpeedCode,
  getActiveSpeedConfig,
  resetSpeedConfig,
  resolveSpeed,
  setActiveSpeedConfig,
  speedPoints,
  trackBasePercent,
  validateSpeedConfiguration,
} from '../packages/shared/src/index.js';

test('DEFAULT_SPEED maintains pristine backup of initial SPEED configuration', () => {
  assert.equal(DEFAULT_SPEED.run.basePercent, 100);
  assert.equal(DEFAULT_SPEED.attack.basePercent, 10);
  assert.equal(DEFAULT_SPEED.run.phases.length, 11);

  // Modifying active config does not mutate DEFAULT_SPEED
  const custom = structuredClone(DEFAULT_SPEED);
  custom.run.phases = custom.run.phases.map(p => ({ ...p }));
  (custom.run.phases[2] as { fps: number }).fps = 10; // 100% -> 10 fps instead of 8

  setActiveSpeedConfig(custom);
  assert.equal(getActiveSpeedConfig().run.phases[2].fps, 10);
  assert.equal(resolveSpeed('run', 100).fps, 10);
  assert.equal(DEFAULT_SPEED.run.phases[2].fps, 8);

  // Reset brings it back to default
  resetSpeedConfig();
  assert.equal(getActiveSpeedConfig().run.phases[2].fps, 8);
  assert.equal(resolveSpeed('run', 100).fps, 8);
});

test('speedPoints complies with the approved display formula (% / 10)', () => {
  assert.equal(speedPoints(50), 5);
  assert.equal(speedPoints(70), 7);
  assert.equal(speedPoints(100), 10);
  assert.equal(speedPoints(120), 12);
  assert.equal(speedPoints(180), 18);
  assert.equal(speedPoints(260), 26);
  assert.equal(speedPoints(138), 14); // 13.8 -> 14
});

test('formatSpeedCode produces valid TypeScript export structure', () => {
  const code = formatSpeedCode(DEFAULT_SPEED);
  assert.ok(code.startsWith('export const SPEED = {'));
  assert.ok(code.includes('basePercent: 10,'));
  assert.ok(code.includes('stridePixels: 120,'));
  assert.ok(code.includes('horseStridePixels: 180,'));
  assert.ok(code.includes('phases: ['));
  assert.ok(code.trim().endsWith('} as const;'));
});

test('stride and velocity formulas adhere strictly to the referenceFrames ratio', () => {
  // run baseline: 100% -> 8 FPS @ referenceFrames 8 -> multiplier 1 -> vel = (8 / 8) * 120 = 120 px/s
  const baseRun = resolveSpeed('run', 100);
  assert.equal(baseRun.fps, 8);
  assert.equal(baseRun.cycleMs, 1000);
  assert.equal(baseRun.velocity, 120);

  // mounted: horseStridePixels = 180 -> vel = (8 / 8) * 180 = 180 px/s
  const mountedBase = resolveSpeed('run', 100, DEFAULT_SPEED, true);
  assert.equal(mountedBase.velocity, 180);

  // max run: 260% -> 24 FPS @ 8 frames -> vel = (24 / 8) * 120 = 360 px/s
  const maxRun = resolveSpeed('run', 260);
  assert.equal(maxRun.fps, 24);
  assert.equal(maxRun.cycleMs, (8 * 1000) / 24);
  assert.equal(maxRun.velocity, 360);
});

test('sim respects devRunPercent override in moveScale and followPath', () => {
  const { followPath } = require('../apps/server/src/world/systems/movement.js');
  const { refreshMoveScale } = require('../apps/server/src/world/systems/effects.js');

  const sim: any = {
    kind: 'player',
    speed: 260,
    a: { x: 0, y: 0, ctl: 0, moveScale: 1 },
    path: [{ x: 1000, y: 0 }],
    combat: { bag: {} },
  };

  const world: any = { now: 1000 };

  // 1. Without dev override (default baseline 100% -> 8 FPS / 8 FPS = 1.0)
  refreshMoveScale(world, sim);
  assert.equal(sim.moveScale, 1.0);

  followPath(sim, 1.0); // 1 second
  // budget = 260 * 1.15 * 1.0 * 1.0 = 299 px
  assert.equal(sim.a.x, 299);

  // 2. With dev override 180% -> 16 FPS / 8 FPS = 2.0
  sim.devRunPercent = 180;
  refreshMoveScale(world, sim);
  assert.equal(sim.moveScale, 2.0);

  sim.a.x = 0;
  sim.path = [{ x: 1000, y: 0 }];
  followPath(sim, 1.0); // 1 second
  // budget = 260 * 1.15 * 2.0 * 1.0 = 598 px
  assert.equal(sim.a.x, 598);

  // 3. Reset dev override
  sim.devRunPercent = undefined;
  refreshMoveScale(world, sim);
  assert.equal(sim.moveScale, 1.0);
});

test('addPlayer calculates horse attributes and speedPoints immediately when mounted on entry', () => {
  const { addPlayer } = require('../apps/server/src/world/players.js');
  const { makeItem } = require('../apps/server/src/world/inventory.js');
  const { attrOf } = require('../packages/shared/src/index.js');

  const world: any = {
    meta: { raw: { entry: { x: 100, y: 100 } } },
    grid: null,
    add: (_sim: any) => {},
  };

  const horseItem = makeItem('horse-28')!;
  const horseDef = horseItem.def;

  const charRecord: any = {
    id: 'test-mounted-char',
    owner: 'tester',
    name: 'Kỵ Binh',
    faction: 'tianwang',
    series: 'kim',
    gender: 'nam',
    progressVersion: 2,
    progress: { level: 80, exp: 0, added: { str: 0, dex: 0, vit: 0, ene: 0 } },
    horse: horseDef,
    mounted: true,
    equip: {
      horse: horseItem,
    },
  };

  const sim = addPlayer(world, 'session-mounted-1', charRecord);

  // 1. sim.a.mounted must be true
  assert.equal(sim.a.mounted, true);
  assert.equal(sim.a.horse, horseDef);

  // 2. sim.combat.bag must immediately include horse fastwalkrun_p without requiring dismount/remount
  const horseSpeedBonus = attrOf(sim.combat.bag, 'fastwalkrun_p');
  assert.ok(horseSpeedBonus > 0, `fastwalkrun_p of horse must be present, got ${horseSpeedBonus}`);

  // 3. sim.moveScale must be greater than base 1.0
  assert.ok(sim.moveScale > 1.0, `moveScale must reflect horse speed, got ${sim.moveScale}`);
});

test('hostile aura (Vô Hình Độc 69) does not slow the caster, only hostile targets', () => {
  const { SkillEngine, applyState, stateBag, attrOf, totalSpeedPercents, speedPoints } = require('../packages/shared/src/index.js');

  const statesMap = new Map<string, Map<number, any>>([
    ['caster', new Map()],
    ['enemy', new Map()],
  ]);
  const caster: any = { id: 'caster', dead: false, a: { x: 100, y: 100, mp: 1000, maxMp: 1000, dir: 0 }, skills: new Map([[69, 25]]), states: statesMap.get('caster') };
  const enemy: any = { id: 'enemy', dead: false, a: { x: 150, y: 100, mp: 1000, maxMp: 1000, dir: 0 }, skills: new Map(), states: statesMap.get('enemy') };

  const port: any = {
    now: () => 1000,
    get: (id: string) => (id === 'caster' ? caster : id === 'enemy' ? enemy : undefined),
    combatants: () => [caster, enemy],
    friendly: (a: any, b: any) => a.id === b.id,
    hostile: (a: any, b: any) => a.id !== b.id,
    spendMp: () => true,
    addState: (t: any, st: any) => applyState(t.states, st, 1000),
    damage: () => {},
    heal: () => {},
    fx: () => {},
    missile: () => {},
    lock: () => {},
  };

  const engine = new SkillEngine(port);
  engine.holdAura(caster, 69);
  engine.update();

  // Caster still gets the visual aura state for foot fx/icon, but without fastwalkrun_p penalty
  assert.ok(caster.states.has(69), 'caster should keep visual state 69');
  const casterBag = stateBag(caster.states, 0);
  assert.equal(attrOf(casterBag, 'fastwalkrun_p'), 0);
  assert.equal(speedPoints(totalSpeedPercents(casterBag, false).run), 10);

  // Hostile enemy gets the full debuff (-50% fastwalkrun_p)
  assert.ok(enemy.states.has(69), 'enemy should receive debuff state 69');
  const enemyBag = stateBag(enemy.states, 0);
  assert.equal(attrOf(enemyBag, 'fastwalkrun_p'), -50);
  assert.equal(speedPoints(totalSpeedPercents(enemyBag, false).run), 5);
});


