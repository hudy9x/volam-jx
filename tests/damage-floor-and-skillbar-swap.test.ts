import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GOLDEN_BOSS_CONFIG,
  SkillEngine,
  damageReturn,
  getSkill,
  monsterCombat,
  resolveHit,
  type CombatStats,
  type DamageParts,
  type EnginePort,
  type HitResult,
} from '../packages/shared/src/index.js';
import { goldenBossFromEntry } from '../packages/shared/src/monsters/monsters.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { refreshMonsterCombat } from '../apps/server/src/world/systems/effects.js';

function makeStats(series: CombatStats['series'] = 'kim'): CombatStats {
  return monsterCombat(10, series, 0, 0, {});
}

test('resolveHit floors direct damage and poison tick instead of rounding up', () => {
  const skill = getSkill(1)!;
  const attacker = makeStats('kim');
  const target = makeStats('kim');
  // 10.9 -> 10 (not 11); poison 7.8 -> 7 (not 8)
  const parts: DamageParts = {
    phys: [10.9, 10.9],
    cold: [0, 0],
    fire: [0, 0],
    light: [0, 0],
    poison: { tick: 7.8, frames: 60, period: 10 },
  };
  const out = resolveHit(parts, {
    skill,
    level: 1,
    attacker,
    target,
    targetLife: 1000,
    pvp: false,
  }, () => 0.25);
  assert.equal(out.miss, false);
  assert.equal(out.dmg, 10);
  assert.equal(out.poison?.tick, 7);

  // Positive damage < 1 still clamps to minimum 1
  const tiny: DamageParts = {
    phys: [0.4, 0.4],
    cold: [0, 0],
    fire: [0, 0],
    light: [0, 0],
    poison: { tick: 0.3, frames: 60, period: 10 },
  };
  const tinyOut = resolveHit(tiny, {
    skill,
    level: 1,
    attacker,
    target,
    targetLife: 1000,
    pvp: false,
  }, () => 0.25);
  assert.equal(tinyOut.dmg, 1);
  assert.equal(tinyOut.poison?.tick, 1);
});

test('damageReturn floors reflected damage instead of rounding up', () => {
  // 101 * 10% = 10.1; with 1% returnres -> 10.1 * 0.99 = 9.999 -> floor 9 (not round 10)
  const back = damageReturn(101, { meleedamagereturn_p: [10, 0, 0] }, { returnres_p: [1, 0, 0] }, true);
  assert.equal(back, 9);

  // 19 * 10% = 1.9 -> floor 1 (not round 2)
  const back2 = damageReturn(19, { meleedamagereturn_p: [10, 0, 0] }, {}, true);
  assert.equal(back2, 1);
});

test('SkillEngine produces integer damage and integer poison tick with fractional outgoingDamageMultiplier', () => {
  for (const percent of [55, 137]) {
    let now = 0;
    const a = new Actor();
    Object.assign(a, { level: 150, x: 100, y: 100, hp: 100000, maxHp: 100000, boss: 2 });
    const boss = makeSim('boss', 'monster', a, 'kim', 0);
    boss.def = goldenBossFromEntry({ ...GOLDEN_BOSS_CONFIG.bosses[0], damagePercent: percent });
    boss.skills = new Map([[1066, 20]]);
    refreshMonsterCombat(boss);
    const t = new Actor();
    Object.assign(t, { x: 120, y: 100, hp: 100000, maxHp: 100000 });
    const target = makeSim('target', 'player', t, 'kim', 0);
    const hits: HitResult[] = [];
    const port: EnginePort = {
      now: () => now,
      random: () => 0.5,
      combatants: () => [boss, target],
      get: id => (id === 'boss' ? boss : target),
      hostile: (x, y) => x.id !== y.id,
      friendly: () => false,
      stats: c => (c.id === 'boss' ? boss.combat! : monsterCombat(150, 'kim', 0, 100, {})),
      damage: (_x, _y, h) => hits.push(h),
      heal: () => {},
      addState: () => {},
      removeState: () => {},
      emit: () => {},
    };
    const engine = new SkillEngine(port);
    engine.cast(boss, 1066, target, { x: 120, y: 100 }, 100);
    for (now = 0; now < 8000; now += 20) engine.update();
    assert.ok(hits.length > 0, `expected hits for percent=${percent}`);
    for (const h of hits) {
      assert.equal(Number.isInteger(h.dmg), true, `expected integer dmg, got ${h.dmg}`);
      if (h.effects?.poison) {
        assert.equal(Number.isInteger(h.effects.poison.tick), true, `expected integer poison tick, got ${h.effects.poison.tick}`);
      }
    }
  }
});

test('SkillBarState.selectLeft assigns key skill to left hand without swapping and ignores items/empty/matching slots', async () => {
  const mem = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => { mem.set(k, String(v)); },
    removeItem: (k: string) => { mem.delete(k); },
  };
  const { skillbar } = await import('../apps/client/src/state/skillbar.ts');
  // Learned skills: 1 (Công kích vật lý), 14 (Đạt Ma Độ Giang), 19 (Sư Tử Hống)
  skillbar.setCharacter('TestSelectLeftChar', 'shaolin');
  skillbar.setLevels({ 1: 1, 14: 20, 19: 20 });

  assert.equal(skillbar.assign('left', 14), null);
  assert.equal(skillbar.assign(0, 19), null);
  assert.equal(skillbar.assign(3, 14), null);
  assert.equal(skillbar.assignItem(1, 'potion-1-1'), null);
  assert.equal(skillbar.assign(2, null), null);

  // 1) Select slot 0 (19) -> left becomes 19, slot 0 stays 19 (no swap)
  assert.equal(skillbar.selectLeft(0), true);
  assert.equal(skillbar.skillAt('left'), 19);
  assert.equal(skillbar.skillAt(0), 19);

  // Select slot 3 (14) -> left becomes 14, slot 3 stays 14 and slot 0 stays 19
  assert.equal(skillbar.selectLeft(3), true);
  assert.equal(skillbar.skillAt('left'), 14);
  assert.equal(skillbar.skillAt(3), 14);
  assert.equal(skillbar.skillAt(0), 19);

  // 2) Item slot (potion) -> returns false, both untouched
  assert.equal(skillbar.selectLeft(1), false);
  assert.equal(skillbar.skillAt('left'), 14);
  assert.equal(skillbar.itemAt(1), 'potion-1-1');

  // 3) Empty slot -> returns false
  assert.equal(skillbar.selectLeft(2), false);
  assert.equal(skillbar.skillAt('left'), 14);

  // 4) Same skill on key slot and left -> returns false
  assert.equal(skillbar.selectLeft(3), false);

  // 5) Left is null, key slot 0 has 19 -> sets left to 19, key slot 0 stays 19
  assert.equal(skillbar.assign('left', null), null);
  assert.equal(skillbar.selectLeft(0), true);
  assert.equal(skillbar.skillAt('left'), 19);
  assert.equal(skillbar.skillAt(0), 19);
});
