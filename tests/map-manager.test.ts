import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { NpcConfigStore } from '../tools/map-manager/ConfigStore.js';
import { applyTownPlacements, validatePlacements, type NpcPlacement } from '../packages/shared/src/npcs/placements.js';
import type { MapMeta } from '../packages/shared/src/maps/types.js';
import type { TownNpc } from '../packages/shared/src/npcs/towns.js';
const meta = (id: number, type = 'City'): MapMeta => ({ id, name: `Thành ${id}`, type, region: '', assets: '', safe: true, pvp: false, portals: [], raw: { entry: { x: 160, y: 80 }, size: { width: 320, height: 160 } } });
const npc: NpcPlacement = { id: 'npc-shop', name: 'Thợ rèn', res: 'smith', action: 'shop', x: 100, y: 100, dir: 0 };
const maps = { 1: meta(1), 2: meta(2), 3: meta(3, 'Field') }, resources = new Set(['smith']);
test('save map independently, reopen, reject stale revision and invalid terrain without corrupting config', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-npc-test-')), file = path.join(root, 'config.json');
  const store = new NpcConfigStore(file, maps, resources, () => [structuredClone(npc)], (_id, x) => x >= 20);
  try {
    const a = await store.read(1), b = await store.read(2);
    const first = await store.save(1, [{ ...npc, name: 'Thợ rèn A', x: 120 }], a.revision);
    await store.save(2, [{ ...npc, name: 'Thợ rèn B', x: 140 }], b.revision);
    assert.equal((await store.read(1)).npcs[0].name, 'Thợ rèn A');
    assert.equal((await store.read(2)).npcs[0].name, 'Thợ rèn B');
    await assert.rejects(store.save(1, [npc], a.revision), /tab hoặc công cụ khác/);
    await assert.rejects(store.save(1, [{ ...npc, x: 10 }], first.revision), /vị trí bị chặn/);
    const reloaded = new NpcConfigStore(file, maps, resources, () => [npc], () => true);
    assert.equal((await reloaded.read(1)).npcs[0].x, 120);
    const empty = await store.save(1, [], first.revision); assert.deepEqual(empty.npcs, []);
    assert.equal((await store.read(2)).npcs[0].x, 140);
    await assert.rejects(store.read(3), /thành thị/);
    const config = JSON.parse(await fs.readFile(file, 'utf8')); assert.equal(config.version, 1); assert.equal(config.maps['2'][0].x, 140);
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
test('reject duplicate IDs, invalid action, sprite, direction and out-of-bounds positions', () => {
  for (const value of [[npc, npc], [{ ...npc, action: '__proto__' }], [{ ...npc, res: '../x' }], [{ ...npc, dir: 8 }], [{ ...npc, x: NaN }], [{ ...npc, y: 160 }], [{ ...npc, name: ' ' }]]) assert.throws(() => validatePlacements(value, maps[1], resources));
  assert.throws(() => validatePlacements([npc], maps[3], resources));
});
test('game adapter converts absolute placement to offsets and keeps unrelated/default maps intact', () => {
  const original: TownNpc = { id: 'npc-shop', name: 'Cũ', res: 'smith', action: 'shop', dx: 10, dy: 20, dir: 0 };
  const defaults = { 1: [original], 2: [original], 3: [original] };
  const applied = applyTownPlacements(defaults, { version: 1, maps: { '1': [{ ...npc, x: 240, y: 120, dir: 7 }], '3': [npc] } }, maps);
  assert.equal(applied[1][0].dx, 80); assert.equal(applied[1][0].dy, 40); assert.equal(applied[1][0].dir, 7);
  assert.equal(applied[2], defaults[2]); assert.equal(applied[3], defaults[3]); assert.equal(original.dx, 10);
  assert.deepEqual(applyTownPlacements(defaults, { version: 1, maps: { '1': [] } }, maps)[1], []);
});

test('all eight facings survive save/reopen and runtime adaptation without changing NPC service', async () => {
  const { NPC_WINDOWS } = await import('../apps/client/src/game/ports.js');
  const windows = { shop: 'shop', drug: 'drugstore', kytran: 'kytran', travel: 'travel', horse: 'horse-shop', stash: 'stash' };
  const { DEFAULT_TOWN_NPCS, NPC_LINES } = await import('../packages/shared/src/npcs/towns.js');
  const { NPC_SHEETS, JX_SHEETS } = await import('../apps/client/src/art/jx/data.gen.js');
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-npc-facing-'));
  const resources = new Set(DEFAULT_TOWN_NPCS[37].map(n => n.res));
  const expected = { 'npc-thoren': 'shop', 'npc-duocdiem': 'drug', 'npc-kytran': 'kytran', 'npc-xaphu': 'travel', 'npc-banngua': 'horse', 'npc-ruong': 'stash' };
  const file = path.join(root, 'placements.json');
  const makeStore = () => new NpcConfigStore(file, maps, resources, () => [], () => true);
  try {
    for (const dir of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const list = DEFAULT_TOWN_NPCS[37].map(n => ({ id: n.id, name: n.name, res: n.res, action: n.action, x: 100, y: 100, dir }));
      const store = makeStore();
      await store.save(1, list, (await store.read(1)).revision);
      const saved = (await makeStore().read(1)).npcs;
      const runtime = applyTownPlacements({}, { version: 1, maps: { '1': saved } }, maps)[1];
      assert.deepEqual(saved, list);
      for (const n of runtime) {
        assert.equal(n.action, expected[n.id as keyof typeof expected]);
        assert.ok(NPC_LINES[n.action].option);
        assert.equal(NPC_WINDOWS[n.action], windows[expected[n.id as keyof typeof expected] as keyof typeof windows]);
        assert.equal(n.dir, dir); assert.equal(n.dx, -60); assert.equal(n.dy, 20);
        if (['shop', 'travel', 'horse'].includes(n.action)) {
          assert.ok(n.res.endsWith('_4'));
          assert.equal(JX_SHEETS[NPC_SHEETS[n.res].stand!][5], 8);
        }
      }
    }
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});
