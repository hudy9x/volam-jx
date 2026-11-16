import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { SpawnStore } from '../tools/map-manager/SpawnStore.js';
import { bossTierOf, setSpawnLoader, spawnsOf, type SpawnFile } from '../packages/shared/src/maps/spawns.js';
import type { MapMeta } from '../packages/shared/src/maps/types.js';
const map = (id: number): MapMeta => ({ id, name: 'Test', type: 'Field', region: '', assets: '', safe: false, pvp: true, portals: [], raw: { entry: { x: 160, y: 80 }, size: { width: 320, height: 160 } } });
const maps = { 1: map(1), 2: map(2) };
const auto: SpawnFile = { map: 1, zones: [{ monsters: [[10, 50], [11, 51]], camps: 3, count: 4, r: 100, respawn: 30 }, { monsters: [[11, 60]], x: 100, y: 80, r: 0, count: 1, respawn: 60, boss: 1 }] };
test('existing runtime format: Auto omits XY, Manual/blue keeps XY, save protects edits from generator and preserves other maps', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-spawn-store-'));
  const store = new SpawnStore(dir, maps, id => [10, 11].includes(id), (_id, x) => x > 20);
  try {
    const empty = await store.read(1); assert.deepEqual(empty.file.zones, []);
    await store.save(2, { map: 2, zones: [] }, (await store.read(2)).revision);
    const other = await fs.readFile(path.join(dir, '2.json'), 'utf8');
    const saved = await store.save(1, auto, empty.revision);
    assert.equal(saved.file.auto, false); assert.equal(saved.file.zones[0].x, undefined); assert.equal(saved.file.zones[0].camps, 3);
    assert.equal(saved.file.zones[1].x, 100); assert.equal(bossTierOf(saved.file.zones[1].boss), 1);
    assert.deepEqual(saved.file.zones[0].monsters, [[10, 50], [11, 51]]);
    const reopened = new SpawnStore(dir, maps, id => id > 0, () => true); assert.deepEqual(await reopened.read(1), saved);
    setSpawnLoader(id => id === 1 ? saved.file : null); assert.deepEqual(spawnsOf(1), saved.file); setSpawnLoader(() => null);
    await assert.rejects(store.save(1, auto, empty.revision), /tab khác/);
    await store.save(1, { map: 1, zones: [] }, saved.revision); assert.deepEqual((await store.read(1)).file.zones, []);
    assert.equal(await fs.readFile(path.join(dir, '2.json'), 'utf8'), other);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('reject terrain/out-of-bounds, fractional counts/levels, camp overload, invalid monsters/boss and preserve saved bytes on failure', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-spawn-validation-'));
  const store = new SpawnStore(dir, maps, id => [10, 11].includes(id), (_id, x) => x > 20);
  try {
    const saved = await store.save(1, auto, (await store.read(1)).revision);
    const bad = [
      { x: 0, y: 80 }, { x: 320, y: 80 }, { x: 100, y: 160 }, { x: 100.1, y: 80 },
      { count: 1.2 }, { respawn: 2.5 }, { camps: 0 }, { camps: 1.5 }, { camps: 101 }, { count: 60, camps: 100 },
      { monsters: [[999, 10]] }, { monsters: [[10, 10.5]] }, { r: -1 }, { boss: 3 }, { boss: 2 },
    ];
    for (const patch of bad) {
      const file = structuredClone(auto); Object.assign(file.zones[0], patch);
      await assert.rejects(store.save(1, file, saved.revision), undefined, JSON.stringify(patch));
      assert.deepEqual(await store.read(1), saved);
    }
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('retain legacy gold zones, fixed dummies and notes verbatim; external file edits invalidate revision', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-spawn-legacy-'));
  const file = path.join(dir, '1.json');
  const original: SpawnFile = { ...structuredClone(auto), auto: true, note: 'Legacy', fixed: [{ monster: 10, level: 1, x: 80, y: 80 }] };
  original.zones.push({ monsters: [[11, 90]], count: 1, respawn: 100, x: 160, y: 80, boss: 2 });
  await fs.writeFile(file, JSON.stringify(original));
  const store = new SpawnStore(dir, maps, id => [10, 11].includes(id), () => true);
  try {
    const doc = await store.read(1); const edited = structuredClone(doc.file); delete edited.zones[0].x; delete edited.zones[0].y;
    edited.zones[1].x = 120;
    const saved = await store.save(1, edited, doc.revision);
    assert.deepEqual(saved.file.zones[2], original.zones[2]); assert.deepEqual(saved.file.fixed, original.fixed); assert.equal(saved.file.note, 'Legacy');
    const bad = structuredClone(saved.file); bad.zones.pop(); await assert.rejects(store.save(1, bad, saved.revision), /Hoàng Kim/);
    await fs.appendFile(file, '\n'); await assert.rejects(store.save(1, saved.file, saved.revision), /tab khác/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test('saved Auto and Manual zones produce real runtime slots, including monster ID zero and blue boss tier', async () => {
  const { decodeGrid, canStandAt } = await import('../packages/shared/src/maps/nav/grid.js');
  const { createSpawnSlots } = await import('../apps/server/src/world/systems/spawner.js');
  const { setSpawns } = await import('../packages/shared/src/maps/spawns.js');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-spawn-runtime-'));
  const meta = map(99999); meta.raw.size = { width: 3200, height: 1600 };
  const grid = decodeGrid({ columns: 100, rows: 100, cellSize: { width: 32, height: 16 }, blockedBase64: Buffer.alloc(1250).toString('base64') }, meta.raw.size);
  const store = new SpawnStore(dir, { [meta.id]: meta }, id => [0, 10, 11].includes(id), (_id, x, y) => canStandAt(grid, x, y));
  try {
    const file: SpawnFile = { map: meta.id, zones: [
      { monsters: [[0, 50]], camps: 3, count: 4, r: 0, respawn: 30 },
      { monsters: [[11, 60]], x: 1000, y: 800, r: 0, count: 1, respawn: 60, boss: 1 },
    ] };
    const saved = await store.save(meta.id, file, (await store.read(meta.id)).revision);
    setSpawns(meta.id, saved.file);
    const world = { meta, grid, slots: [], now: 0 } as unknown as import('../apps/server/src/world/World.js').World;
    createSpawnSlots(world);
    assert.equal(world.slots.length, 13);
    const blue = world.slots.filter(s => s.boss === 1); assert.equal(blue.length, 1);
    assert.deepEqual([blue[0].x, blue[0].y, blue[0].level, blue[0].respawnMs], [1000, 800, 60, 60000]);
    const normal = world.slots.filter(s => s.boss === 0); assert.equal(normal.length, 12);
    assert.ok(normal.every(s => s.monsterId === 0 && s.level === 50 && canStandAt(grid, s.x, s.y)));
    assert.equal(new Set(normal.map(s => `${s.x},${s.y}`)).size, 3);
  } finally { setSpawns(meta.id, null); await fs.rm(dir, { recursive: true, force: true }); }
});
