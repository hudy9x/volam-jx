import assert from 'node:assert/strict';
import test from 'node:test';
import {
  HEAVY_HIT,
  ITEMS,
  MANTLE_ITEMS,
  MANTLE_KNB_PRICE,
  QUALITY,
  SHOP_ITEMS,
  SHOP_OF,
  createGold,
  createItem,
  equipError,
  equipmentFortune,
  fortuneRequirement,
  getSkill,
  isMantleActive,
  resolveHit,
  rollMajorBossMantle,
  skillDamage,
  type CombatStats,
  type Equipment,
} from '../packages/shared/src/index.ts';

test('MANTLE_ITEMS registered in ITEMS and Kỳ Trân Các at 100 KNB', () => {
  assert.equal(MANTLE_ITEMS.length, 11);
  for (let i = 0; i < MANTLE_ITEMS.length; i++) {
    const m = MANTLE_ITEMS[i];
    assert.equal(ITEMS[m.id], m);
    assert.equal(SHOP_OF[m.id], 'kytran');
    assert.equal(m.knbPrice, MANTLE_KNB_PRICE);
    assert.equal(m.look, i);
    assert.ok(fortuneRequirement(m) >= 200);
    assert.ok(SHOP_ITEMS.kytran.some(x => x.id === m.id));
  }
  const rolled = rollMajorBossMantle(() => 0.5);
  assert.equal(rolled.kind, 'mantle');
});

test('equipmentFortune excludes mantle and unlocks require_fortune_value', () => {
  const empty: Equipment = {};
  assert.equal(equipmentFortune(empty, 0), 0);

  const lv1 = ITEMS['mantle-1'];
  assert.ok(equipError(lv1, { gender: 'male', faction: 'shaolin', fortune: 199 }));
  assert.equal(equipError(lv1, { gender: 'male', faction: 'shaolin', fortune: 200 }), null);

  // Wear 5 pieces of a gold suite (suite 2: gold-6..gold-10)
  const equip: Equipment = {
    weapon: createGold(ITEMS['gold-6'], 'u1', 10, () => 0.8),
    armor: createGold(ITEMS['gold-7'], 'u2', 10, () => 0.8),
    belt: createGold(ITEMS['gold-8'], 'u3', 10, () => 0.8),
    cuff: createGold(ITEMS['gold-9'], 'u4', 10, () => 0.8),
    boot: createGold(ITEMS['gold-10'], 'u5', 10, () => 0.8),
  };
  const fBefore = equipmentFortune(equip, 0);
  assert.ok(fBefore >= 1500, `Expected full gold suite fortune >= 1500, got ${fBefore}`);

  // Wearing a mantle must NOT increase equipmentFortune (anti self-boost loop)
  equip.mantle = createItem(ITEMS['mantle-3'], 'm1');
  assert.equal(equipmentFortune(equip, 0), fBefore);
  assert.equal(isMantleActive(equip, 0), true);

  // Wearing a mantle above current fortune is inactive
  equip.mantle = createItem(ITEMS['mantle-10'], 'm2');
  assert.equal(isMantleActive(equip, 0), false);
});

test('skill_enhance boosts skill damage and enhancehit_rate triggers heavy hit', () => {
  const makeStats = (bag: Record<string, [number, number, number]>): CombatStats => ({
    kind: 'player',
    level: 90,
    series: 'thuy',
    ar: 1000,
    def: 100,
    resist: { phys: 0, cold: 0, fire: 0, light: 0, poison: 0 },
    resistMax: { phys: 75, cold: 75, fire: 75, light: 75, poison: 75 },
    physMin: 100,
    physMax: 100,
    weaponType: 0,
    bag,
    skillBonus: {},
    hitRecover: 0,
    hurtFrames: 12,
  });

  // Pick a real elemental/attack skill (e.g., 328 Tam Nga Tề Tuyết or fallback to first damaging skill)
  const skill = getSkill(328) ?? getSkill(109);
  assert.ok(skill, 'Expected test attack skill to exist');

  const baseAttacker = makeStats({});
  const enhancedAttacker = makeStats({ skill_enhance: [60, 0, 0] });
  const d0 = skillDamage(skill, 20, skill.id, baseAttacker);
  const d1 = skillDamage(skill, 20, skill.id, enhancedAttacker);
  const sum = (d: ReturnType<typeof skillDamage>) => d.phys[0] + d.cold[0] + d.fire[0] + d.light[0];
  assert.ok(sum(d1) > sum(d0), `Expected skill_enhance +60% to increase damage (${sum(d0)} -> ${sum(d1)})`);

  // Heavy hit (enhancehit_rate = 100%, capped at 75%, rng = 0.1 triggers heavy hit)
  const target = makeStats({});
  const normalHit = resolveHit(d0, { skill, level: 20, attacker: baseAttacker, target, targetLife: 5000, pvp: false }, () => 0.9);
  const heavyAttacker = makeStats({ enhancehit_rate: [100, 0, 0] });
  const heavyHit = resolveHit(d0, { skill, level: 20, attacker: heavyAttacker, target, targetLife: 5000, pvp: false }, () => 0.1);
  assert.equal(normalHit.heavy, false);
  assert.equal(heavyHit.heavy, true);
  assert.ok(heavyHit.dmg >= Math.round(normalHit.dmg * HEAVY_HIT.multiplier) - 1);
  assert.equal(QUALITY.gold, 3);
});
