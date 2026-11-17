import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyDropConfigToGoldenSettings,
  decodeGrid,
  dropTableFor,
  getDropConfig,
  resetDropConfig,
  resolveDropProfile,
  rollEquipmentFromTable,
  rollMoneyWithProfile,
  setDropConfig,
  syncGoldenSettingsToDropConfig,
  validateDropConfig,
} from '../packages/shared/src/index.js';
import { dropLoot } from '../apps/server/src/world/systems/drops.js';
import type { World } from '../apps/server/src/world/World.js';
import type { Sim } from '../apps/server/src/world/entity.js';

test('drop-config.json is valid and resolves profiles by tier and overrides', () => {
  const cfg = getDropConfig();
  assert.equal(validateDropConfig(cfg), null);

  const normal = resolveDropProfile(0);
  assert.equal(normal.rolls, cfg.profiles.normal.rolls);
  assert.equal(normal.minItems, cfg.profiles.normal.minItems);
  assert.equal(normal.equipRatePct, cfg.profiles.normal.equipRatePct);
  assert.equal(normal.moneyRatePct, cfg.profiles.normal.moneyRatePct);

  const blue = resolveDropProfile(1);
  assert.equal(blue.rolls, cfg.profiles.blueBoss.rolls);
  assert.equal(blue.minItems, cfg.profiles.blueBoss.minItems);
  assert.equal(blue.moneyRatePct, cfg.profiles.blueBoss.moneyRatePct);
  assert.equal(blue.moneyMul, cfg.profiles.blueBoss.moneyMul);

  const major = resolveDropProfile(2, 740, 'major', { dropRolls: 30, blueRatePct: 73.6, specialRatePct: 19.9, goldRatePct: 3.4 });
  assert.equal(major.rolls, cfg.profiles.goldenBoss.byTier?.major?.rolls ?? 30);
  assert.equal(major.minItems, cfg.profiles.goldenBoss.byTier?.major?.minItems ?? cfg.profiles.goldenBoss.default.minItems);
  assert.equal(major.moneyMul, cfg.profiles.goldenBoss.byTier?.major?.moneyMul ?? cfg.profiles.goldenBoss.default.moneyMul);
  assert.equal(major.goldRatePct, cfg.profiles.goldenBoss.byTier?.major?.goldRatePct ?? 3.4);

  const custom = structuredClone(cfg);
  custom.overrides = { '740': { rolls: 16, moneyMul: 8 } };
  setDropConfig(custom);
  try {
    const overridden = resolveDropProfile(2, 740, 'major');
    assert.equal(overridden.rolls, 16);
    assert.equal(overridden.moneyMul, 8);
    assert.equal(overridden.minItems, 4);
  } finally {
    resetDropConfig();
  }
});

test('validateDropConfig rejects invalid sums and minItems > rolls', () => {
  const badSum = structuredClone(getDropConfig());
  badSum.profiles.normal.equipRatePct = 80;
  badSum.profiles.normal.specialRatePct = 30;
  assert.ok(validateDropConfig(badSum)?.includes('100%'));

  const badMin = structuredClone(getDropConfig());
  badMin.profiles.blueBoss.minItems = badMin.profiles.blueBoss.rolls + 1;
  assert.ok(validateDropConfig(badMin)?.includes('minItems'));
});

test('rollEquipmentFromTable and rollMoneyWithProfile apply profile rates', () => {
  const table = dropTableFor(25);
  assert.ok(table);
  for (let i = 0; i < 20; i++) {
    const def = rollEquipmentFromTable(table, 25, Math.random);
    assert.ok(def, 'should always pick an equipment item');
    assert.equal(def.gold, undefined);
  }

  assert.equal(rollMoneyWithProfile(25, 50, 0, 3, () => 0.1), 0);
  const m1 = rollMoneyWithProfile(25, 50, 100, 1, () => 0.5);
  const m3 = rollMoneyWithProfile(25, 50, 100, 3, () => 0.5);
  assert.equal(m3, m1 * 3);
});

test('dropLoot guarantees at least minItems equipment and money for Blue Boss', () => {
  const grid = decodeGrid(
    {
      kind: 'grid',
      cellSize: { width: 32, height: 32 },
      columns: 16,
      rows: 16,
      blockedBase64: Buffer.alloc((16 * 16) / 8, 0).toString('base64'),
    },
    { width: 16 * 32, height: 16 * 32 },
  );
  const fakeWorld = {
    now: 10_000,
    grid,
    ground: new Map(),
  } as unknown as World;

  const killer = {
    id: 'p1',
    kind: 'player',
    stats: { luck: 5 },
  } as unknown as Sim;

  const blueBoss = {
    id: 'm1',
    kind: 'monster',
    a: { level: 30, boss: 1, x: 128, y: 128 },
    def: { id: 100, dummy: false },
  } as unknown as Sim;

  for (let run = 0; run < 20; run++) {
    fakeWorld.ground.clear();
    dropLoot(fakeWorld, blueBoss, killer);
    const drops = Array.from(fakeWorld.ground.values());
    const itemDrops = drops.filter(d => d.item !== null);
    const moneyDrops = drops.filter(d => d.money > 0);
    const minExpected = getDropConfig().profiles.blueBoss.minItems;
    assert.ok(itemDrops.length >= minExpected, `Blue Boss must drop >= ${minExpected} items (got ${itemDrops.length})`);
    assert.equal(moneyDrops.length, 1, 'Blue Boss must drop 1 money pile');
  }
});

test('bidirectional sync between drop-config and tools/boss golden settings', () => {
  const cfg = getDropConfig();
  const synced = syncGoldenSettingsToDropConfig(cfg, {
    dropRolls: 3,
    blueRatePct: 60,
    specialRatePct: 25,
    goldRatePct: 8,
  });
  assert.equal(validateDropConfig(synced), null);
  assert.equal(synced.profiles.goldenBoss.default.rolls, 3);
  assert.equal(synced.profiles.goldenBoss.default.minItems, 3);
  assert.equal(synced.profiles.goldenBoss.default.equipRatePct, 60);
  assert.equal(synced.profiles.goldenBoss.default.specialRatePct, 25);
  assert.equal(synced.profiles.goldenBoss.default.goldRatePct, 8);
  assert.equal(synced.profiles.goldenBoss.byTier?.major?.minItems, 3);

  const goldenSettings = applyDropConfigToGoldenSettings(synced, {
    dropRolls: 99,
    blueRatePct: 0,
    specialRatePct: 0,
    goldRatePct: 0,
  });
  assert.deepEqual(goldenSettings, {
    dropRolls: 3,
    blueRatePct: 60,
    specialRatePct: 25,
    goldRatePct: 8,
  });
});

test('dropLoot spreads large boss drops across 200-250 radius', () => {
  const grid = decodeGrid(
    {
      kind: 'grid',
      cellSize: { width: 32, height: 32 },
      columns: 32,
      rows: 32,
      blockedBase64: Buffer.alloc((32 * 32) / 8, 0).toString('base64'),
    },
    { width: 32 * 32, height: 32 * 32 },
  );
  const fakeWorld = { now: 10_000, grid, ground: new Map() } as unknown as World;
  const killer = { id: 'p1', kind: 'player', stats: { luck: 5 } } as unknown as Sim;
  const custom = structuredClone(getDropConfig());
  custom.profiles.blueBoss.rolls = 25;
  custom.profiles.blueBoss.minItems = 25;
  setDropConfig(custom);
  try {
    const boss = {
      id: 'm2',
      kind: 'monster',
      a: { level: 90, boss: 1, x: 512, y: 512 },
      def: { id: 100, dummy: false },
    } as unknown as Sim;
    dropLoot(fakeWorld, boss, killer);
    const drops = Array.from(fakeWorld.ground.values());
    assert.ok(drops.length >= 25);
    const maxDx = Math.max(...drops.map(d => Math.hypot(d.x - 512, (d.y - 512) * 2)));
    assert.ok(maxDx >= 175 && maxDx <= 255, `Expected spread radius near 200-250, got ${maxDx.toFixed(1)}`);
  } finally {
    resetDropConfig();
  }
});
