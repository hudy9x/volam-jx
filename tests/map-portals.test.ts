import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PortalStore } from '../tools/map-manager/PortalStore.js';
import { configuredPortals, validatePortals } from '../packages/shared/src/maps/portals.js';
import type { MapMeta, Portal } from '../packages/shared/src/maps/types.js';
import { checkPortals } from '../apps/server/src/world/systems/portals.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import type { World } from '../apps/server/src/world/World.js';
const map = (id: number): MapMeta => ({ id, name: String(id), type: 'Field', region: '', assets: '', safe: false, pvp: true, raw: { size: { width: 256, height: 256 }, entry: { x: 32, y: 32 } }, portals: [] });
const maps = { 37: map(37), 140: map(140), 9101: map(9101) };
const original: Portal = { id: 'to-140', label: 'Dược Vương Cốc', x: 40, y: 40, radius: 16, toMap: 140, toX: 100, toY: 100 };
test('portal roundtrip keeps defaults, IDs, independent maps, CAS and explicit empty override', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-portals-'));
  try {
    const file = path.join(dir, 'config.json'), store = new PortalStore(file, maps, { 37: [original] }, () => true);
    const first = await store.read(37); assert.equal(first.custom, false); assert.deepEqual(first.portals, [original]);
    const second = await store.read(140);
    await store.save(140, [{ ...original, id: 'back', toMap: 37 }], second.revision);
    const moved = { ...original, x: 160, y: 80 };
    const saved = await store.save(37, [moved], first.revision); assert.equal(saved.custom, true);
    assert.deepEqual((await store.read(37)).portals, [moved]);
    assert.equal((await store.read(140)).portals[0].id, 'back');
    await assert.rejects(store.save(37, [original], first.revision), /tab khác/);
    await store.save(37, [], saved.revision); assert.deepEqual((await store.read(37)).portals, []);
    const cfg = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.deepEqual(configuredPortals(37, [original], cfg), []);
    assert.deepEqual(configuredPortals(9101, [original], cfg), [original]);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('both ends must be walkable; closed/missing destinations and invalid inputs cannot change saved data', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-portals-invalid-'));
  try {
    const store = new PortalStore(path.join(dir, 'p.json'), maps, { 37: [original] }, (id, x) => id === 37 ? x !== 64 : x !== 128);
    const doc = await store.read(37);
    await assert.rejects(store.save(37, [{ ...original, x: 64 }], doc.revision), /điểm đặt bị chặn/);
    await assert.rejects(store.save(37, [{ ...original, toX: 128 }], doc.revision), /điểm đến bị chặn/);
    maps[140].enabled = false;
    try { await assert.rejects(store.save(37, [original], doc.revision), /đang đóng/); } finally { delete maps[140].enabled; }
    for (const value of [[{ ...original, toMap: 999 }], [{ ...original, toMap: 37 }], [{ ...original, x: -1 }], [{ ...original, toY: 256 }], [{ ...original, radius: 0 }], [{ ...original, label: '' }], [original, original]]) assert.throws(() => validatePortals(value, maps[37], maps));
    assert.deepEqual(await store.read(37), doc);
    await assert.rejects(fs.stat(store.file), { code: 'ENOENT' });
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('production portal trigger uses relocated point and preserves destination; defaults are cloned', () => {
  const moved = { ...original, x: 160, y: 80 };
  const portals = configuredPortals(37, [original], { version: 1, maps: { '37': [moved] } });
  const actor = new Actor(); actor.x = original.x; actor.y = original.y;
  const sim = makeSim('player', 'player', actor, 'kim', 100);
  const transfers: number[][] = [];
  const w = { meta: { ...maps[37], portals }, hooks: { transfer: (_s: unknown, ...args: number[]) => transfers.push(args) } } as unknown as World;
  checkPortals(w, sim); assert.equal(transfers.length, 0);
  actor.x = moved.x; actor.y = moved.y; checkPortals(w, sim);
  assert.deepEqual(transfers, [[140, 100, 100]]);
  portals[0].x = 200; assert.equal(moved.x, 160); assert.equal(original.x, 40);
});
