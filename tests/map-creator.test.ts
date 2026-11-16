import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { blankProject, navigationMask, validateProject, type WorldObject } from '../tools/map-creator/model.js';
import { ProjectStore } from '../tools/map-creator/Store.js';
import { exportMap } from '../tools/map-creator/export.js';

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-map-test-'));
  return { root, store: new ProjectStore(root), cleanup: () => fs.rm(root, { recursive: true, force: true }) };
}
test('save/upload roundtrip, duplicate ID and stale revision do not overwrite source', async () => {
  const { store, cleanup } = await fixture();
  try {
    const p = await store.create(9100, 'Rừng thử');
    await assert.rejects(store.create(9100, 'Ghi đè'));
    p.name = 'Tên mới'; const saved = await store.save(p.id, p);
    assert.equal(saved.revision, 1); assert.equal((await store.read(p.id)).name, 'Tên mới');
    await assert.rejects(store.save(p.id, p), /tab khác/);
    await assert.rejects(store.upload(p.id, Buffer.from('<svg/>'), 'fake.png'));
    const png = await sharp({ create: { width: 64, height: 32, channels: 4, background: '#567843' } }).png().toBuffer();
    const a = await store.upload(p.id, png, 'ground.png');
    saved.width = 64; saved.height = 32; saved.entry = { x: 16, y: 8 }; saved.ground = a;
    const s = await store.save(p.id, saved); assert.deepEqual(s.ground, a);
    s.ground!.width = 96; await assert.rejects(store.save(s.id, s), /Ground/);
    assert.throws(() => store.assetPath(9100, '../project.json'));
    assert.throws(() => store.folder(-1));
  } finally { await cleanup(); }
});
test('collider follows moved world while manual blockers remain independent', () => {
  const p = blankProject(9100, 'Test'); p.width = 128; p.height = 64; p.entry = { x: 0, y: 0 };
  p.assets = [{ id: 'a'.repeat(64), name: 'Cây', width: 64, height: 64 }];
  const o: WorldObject = { id: 'tree', asset: p.assets[0].id, name: 'Cây', x: 48, y: 24, scale: 1, anchorX: 32, anchorY: 64, depthOffset: 0, collider: { enabled: true, rx: 4, ry: 4, ox: 0, oy: 0 } };
  p.objects = [o]; p.blocked = [0]; validateProject(p);
  assert.equal(navigationMask(p)[5], 1);
  o.x = 112; o.y = 56;
  const mask = navigationMask(p); assert.equal(mask[5], 0); assert.equal(mask[15], 1); assert.equal(mask[0], 1);
  assert.deepEqual(p.blocked, [0]);
  o.scale = NaN; assert.throws(() => validateProject(p));
});
test('export pads edge tiles, preserves ground alpha, emits world depth and rejects blocked entry', async () => {
  const { store, cleanup } = await fixture();
  try {
    let p = await store.create(9101, 'Map xuất');
    const ground = await sharp({ create: { width: 544, height: 528, channels: 4, background: '#567843' } }).png().toBuffer();
    const sprite = await sharp({ create: { width: 32, height: 64, channels: 4, background: '#204d30' } }).png().toBuffer();
    p.ground = await store.upload(p.id, ground, 'ground');
    p.assets = [await store.upload(p.id, sprite, 'tree')]; p.width = 544; p.height = 528; p.entry = { x: 16, y: 8 };
    p.objects.push({ id: 'tree', name: 'Tree', asset: p.assets[0].id, x: 100, y: 100, anchorX: 16, anchorY: 64, scale: 1, depthOffset: 5, collider: { enabled: true, rx: 8, ry: 4, ox: 0, oy: 0 } });
    p = await store.save(p.id, p);
    const result = await exportMap(store, p), dir = path.join(store.folder(p.id), 'builds', result);
    const map = JSON.parse(await fs.readFile(path.join(dir, 'map.json'), 'utf8'));
    assert.equal(map.regionSize, 512); assert.equal(map.cols, 2); assert.equal(map.rows, 2); assert.equal(map.chunk, 4);
    const edge = await sharp(path.join(dir, 'ground/1_1.webp')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(edge.info.width, 512); assert.equal(edge.data[(40 * 512 + 40) * 4 + 3], 0);
    const chunk = JSON.parse(await fs.readFile(path.join(dir, 'objects/0_0.json'), 'utf8'));
    assert.deepEqual(chunk.pieces[0], [0, 84, 36, 0, 32, 105]);
    const nav = JSON.parse(await fs.readFile(path.join(dir, 'nav.json'), 'utf8'));
    assert.equal(nav.navigation.columns, 17); assert.equal(nav.navigation.rows, 33);
    const before = await fs.readFile(path.join(store.folder(p.id), 'project.json'), 'utf8');
    p.blocked = [0]; await assert.rejects(exportMap(store, p), /Điểm vào/);
    assert.equal(await fs.readFile(path.join(store.folder(p.id), 'project.json'), 'utf8'), before);
    // Transparent ground cannot be an entry even without manual blockers.
    p.blocked = []; p.objects = []; p.ground = await store.upload(p.id, await sharp({ create: { width: 544, height: 528, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer(), 'transparent');
    await assert.rejects(exportMap(store, p), /trong suốt/);
  } finally { await cleanup(); }
});
