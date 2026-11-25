import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ITEMS,
  MONSTERS,
  WILD_HORSE_MAP_ID,
  WILD_HORSE_MAX_LEVEL,
  WILD_HORSE_MIN_LEVEL,
  WILD_HORSE_MONSTERS,
  getWildHorseConfig,
  monsterAt,
  monsterCurve,
  rollWildHorseDrop,
  setWildHorseConfig,
  spawnFileError,
  syncWildHorseMonsters,
  type SpawnFile,
} from '../packages/shared/src/index.js';
import { GEN_HORSES } from '../packages/shared/src/items/horses.gen.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { dropLoot } from '../apps/server/src/world/systems/drops.js';
import type { World } from '../apps/server/src/world/World.js';
import { JX_ASSOC, JX_PARTS, JX_SHEETS } from '../apps/client/src/art/jx/data.gen.js';

test('WILD_HORSE_MONSTERS covers all 23 level 120–150 mounts with boosted HP and damage', () => {
  const expected = GEN_HORSES.filter(h => {
    const req = h.req.find(([k]) => k === 'requirelevel')?.[1] ?? 0;
    return req >= WILD_HORSE_MIN_LEVEL && req <= WILD_HORSE_MAX_LEVEL;
  });
  assert.equal(expected.length, 23);
  assert.equal(WILD_HORSE_MONSTERS.length, 23);

  const expectedIds = new Set(expected.map(h => h.id));
  const actualIds = new Set(WILD_HORSE_MONSTERS.map(m => m.wildHorse?.horseId));
  assert.deepEqual(actualIds, expectedIds);

  const normal150Hp = monsterCurve(150).life;
  for (const def of WILD_HORSE_MONSTERS) {
    assert.ok(def.wildHorse, `missing wildHorse meta on ${def.id}`);
    assert.equal(MONSTERS[def.id]?.id, def.id);
    assert.ok(ITEMS[def.wildHorse.horseId], `missing ITEMS[${def.wildHorse.horseId}]`);
    assert.ok(def.wildHorse.reqLevel >= 120 && def.wildHorse.reqLevel <= 150);
    assert.ok((def.hpOverride ?? 0) >= 280_000, `expected high HP on ${def.name}`);
    assert.ok((def.hpOverride ?? 0) > normal150Hp * 7, `expected HP > 7x normal 150 on ${def.name}`);
    assert.ok((def.damagePercent ?? 0) >= 450, `expected >= 450% damage on ${def.name}`);
    assert.equal(monsterAt(def, def.level, def.boss).hp, def.hpOverride);
    assert.ok(def.sprite.startsWith('horse:'));
  }
});

test('Map 9101 spawn file is valid and includes all 23 wild horse MonsterDefs', () => {
  const filePath = path.resolve('packages/shared/spawns', `${WILD_HORSE_MAP_ID}.json`);
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as SpawnFile;
  assert.equal(raw.map, 9101);
  assert.equal(raw.auto, false);
  assert.equal(spawnFileError(raw, id => !!MONSTERS[id]), null);

  const spawnedIds = new Set(raw.zones.flatMap(z => z.monsters.map(([id]) => id)));
  for (const def of WILD_HORSE_MONSTERS) {
    assert.ok(spawnedIds.has(def.id), `Map 9101 missing wild horse ${def.id} (${def.name})`);
  }
});

function makeDropTestWorld(announcements: { text: string; tone?: string }[]): World {
  const grid = {
    gw: 20, gh: 20, cw: 32, ch: 32,
    ok: new Uint8Array(400).fill(1),
  };
  return {
    now: 100_000,
    meta: { id: 9101, name: 'Đồng cỏ thử nghiệm', raw: { entry: { x: 320, y: 320 } } },
    grid,
    ground: new Map(),
    hooks: {
      announce: (text: string, tone?: string) => { announcements.push({ text, tone }); },
      notify: () => {},
      log: () => {},
    },
  } as unknown as World;
}

test('dropLoot drops matching mount item with owner protection on hit, nothing extra on miss', () => {
  const horseDef = WILD_HORSE_MONSTERS[0]; // Bôn Tiêu (dropRate 0.25)
  const killerActor = new Actor();
  Object.assign(killerActor, { kind: 'player', name: 'Độc Cô Cầu Bại', x: 320, y: 320, level: 150, team: 'team-1' });
  const killer = makeSim('player-1', 'player', killerActor, 'kim', 260);
  killer.stats = { luck: 5 } as any;

  const monsterActor = new Actor();
  Object.assign(monsterActor, { kind: 'monster', name: horseDef.name, x: 340, y: 320, level: horseDef.level, boss: horseDef.boss ?? 0 });
  const monster = makeSim('m-1', 'monster', monsterActor, horseDef.element, horseDef.speed);
  monster.def = horseDef;

  const origRandom = Math.random;
  try {
    // Hit roll (0.01 < 0.25)
    const announcements: { text: string; tone?: string }[] = [];
    const wHit = makeDropTestWorld(announcements);
    Math.random = () => 0.01;
    dropLoot(wHit, monster, killer);

    const droppedItems = [...wHit.ground.values()].filter(g => g.item);
    assert.ok(droppedItems.some(g => g.item!.def === horseDef.wildHorse!.horseId && g.owner === 'player-1'));
    assert.equal(announcements.length, 1);
    assert.equal(announcements[0].tone, 'victory');

    // Miss roll (0.99 >= 0.25)
    const announcementsMiss: { text: string; tone?: string }[] = [];
    const wMiss = makeDropTestWorld(announcementsMiss);
    Math.random = () => 0.99;
    dropLoot(wMiss, monster, killer);

    const missHorses = [...wMiss.ground.values()].filter(g => g.item?.def === horseDef.wildHorse!.horseId);
    assert.equal(missHorses.length, 0);
    assert.equal(announcementsMiss.length, 0);
  } finally {
    Math.random = origRandom;
  }
});

test('all 23 wild horse sprites resolve valid 3-layer horse sheets (including look 14 & 16 fallbacks)', () => {
  const HORSE_ROW_FALLBACK: Record<number, number> = { 14: 10, 16: 13 };
  const set = JX_ASSOC.m[0][1];
  for (const def of WILD_HORSE_MONSTERS) {
    const rawRow = Number(def.sprite.slice(6));
    const hasStand = [12, 13, 14].some(p => {
      const k = JX_PARTS.m[p]?.[rawRow]?.[set.stand!];
      return Boolean(k && JX_SHEETS[k]);
    });
    const row = hasStand ? rawRow : (HORSE_ROW_FALLBACK[rawRow] ?? 11);
    for (const action of ['stand', 'run', 'attack1', 'wound', 'die'] as const) {
      const act = set[action] ?? set.stand!;
      const layers = [12, 13, 14]
        .map(p => JX_PARTS.m[p]?.[row]?.[act])
        .filter((k): k is string => Boolean(k && JX_SHEETS[k]));
      assert.ok(layers.length >= 1, `missing horse sheets for ${def.name} (row ${row}, action ${action})`);
    }
  }
});

test('testMode sets all wild horses to 500 HP while preserving all other stats; custom drop rates & overrides apply', () => {
  const orig = getWildHorseConfig();
  const snapshot = WILD_HORSE_MONSTERS.map(d => ({
    id: d.id,
    hp: d.hp,
    damagePercent: d.damagePercent,
    resist: d.resist,
    hitRecover: d.hitRecover,
    speed: d.speed,
    attackCooldown: d.attackCooldown,
    dropRate: d.wildHorse!.dropRate,
    respawnSec: d.wildHorse!.respawnSec,
  }));

  try {
    setWildHorseConfig({ testMode: true, testHp: 500 });
    syncWildHorseMonsters();

    for (let i = 0; i < WILD_HORSE_MONSTERS.length; i++) {
      const def = WILD_HORSE_MONSTERS[i];
      const prev = snapshot[i];
      assert.equal(def.hp, 500);
      assert.equal(def.hpOverride, 500);
      assert.equal(monsterAt(def, def.level, def.boss).hp, 500);
      assert.equal(MONSTERS[def.id].hpOverride, 500);
      assert.equal(def.damagePercent, prev.damagePercent);
      assert.equal(def.resist, prev.resist);
      assert.equal(def.hitRecover, prev.hitRecover);
      assert.equal(def.speed, prev.speed);
      assert.equal(def.attackCooldown, prev.attackCooldown);
      assert.equal(def.wildHorse!.dropRate, prev.dropRate);
      assert.equal(def.wildHorse!.respawnSec, prev.respawnSec);
    }

    // Custom tier dropRate & per-horse override
    setWildHorseConfig({
      tiers: {
        ...orig.tiers,
        rare: { ...orig.tiers.rare, dropRate: 1 },
      },
      overrides: {
        'horse-70': { dropRate: 0.9 },
      },
    });
    syncWildHorseMonsters();
    const bonTieu = WILD_HORSE_MONSTERS.find(d => d.wildHorse?.horseId === 'horse-60')!;
    const phienVu = WILD_HORSE_MONSTERS.find(d => d.wildHorse?.horseId === 'horse-70')!;
    assert.equal(rollWildHorseDrop(bonTieu, () => 0.99), 'horse-60');
    assert.equal(rollWildHorseDrop(phienVu, () => 0.85), 'horse-70');
    assert.equal(rollWildHorseDrop(phienVu, () => 0.95), null);
  } finally {
    setWildHorseConfig(orig);
    syncWildHorseMonsters();
  }

  // Restored back to normal HP
  for (let i = 0; i < WILD_HORSE_MONSTERS.length; i++) {
    assert.equal(WILD_HORSE_MONSTERS[i].hp, snapshot[i].hp);
    assert.equal(MONSTERS[WILD_HORSE_MONSTERS[i].id].hpOverride, snapshot[i].hp);
  }
});
