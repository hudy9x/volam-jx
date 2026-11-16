import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { navigationMask, CELL_H, CELL_W, type Project } from './model.js';
import type { ProjectStore } from './Store.js';

/** Export only to project/builds. Never publishes to the running game or overwrites generated art. */
export async function exportMap(store: ProjectStore, p: Project): Promise<string> {
  if (!p.ground) throw Error('Upload ground trước khi xuất map.');
  const mask = navigationMask(p), cols = p.width / CELL_W, rows = p.height / CELL_H;
  // Transparent ground is not terrain. Keep this derived mask separate from painted source.
  const pixels = await sharp(store.assetPath(p.id, p.ground.id)).ensureAlpha().raw().toBuffer();
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (pixels[((y * CELL_H + CELL_H / 2) * p.width + x * CELL_W + CELL_W / 2) * 4 + 3] < 128) mask[y * cols + x] = 1;
  }
  if (mask[Math.floor(p.entry.y / CELL_H) * cols + Math.floor(p.entry.x / CELL_W)]) throw Error('Điểm vào đang nằm trên vùng chặn hoặc ground trong suốt. Hãy đặt lại điểm vào.');
  const bits = Buffer.alloc(Math.ceil(mask.length / 8));
  mask.forEach((v, i) => { if (v) bits[i >> 3] |= 1 << (i & 7); });
  const build = `r${p.revision}-${randomUUID().slice(0, 8)}`;
  const staging = path.join(store.folder(p.id), 'builds', `.${build}`), out = path.join(store.folder(p.id), 'builds', build);
  await fs.mkdir(path.join(staging, 'ground'), { recursive: true });
  await fs.mkdir(path.join(staging, 'objects'));
  try {
    const rc = Math.ceil(p.width / 512), rr = Math.ceil(p.height / 512);
    const regionBits = Buffer.alloc(Math.ceil(rc * rr / 8));
    for (let y = 0; y < rr; y++) for (let x = 0; x < rc; x++) {
      const w = Math.min(512, p.width - x * 512), h = Math.min(512, p.height - y * 512);
      await sharp(store.assetPath(p.id, p.ground.id)).extract({ left: x * 512, top: y * 512, width: w, height: h })
        .extend({ right: 512 - w, bottom: 512 - h, background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ lossless: true }).toFile(path.join(staging, 'ground', `${x}_${y}.webp`));
      const i = y * rc + x; regionBits[i >> 3] |= 1 << (i & 7);
    }
    const chunks = new Map<string, { pages: string[]; frames: number[][]; pieces: number[][] }>();
    const frameIndices = new Map<string, Map<string, number>>();
    for (const [i, o] of p.objects.entries()) {
      const a = p.assets.find(a => a.id === o.asset)!;
      const w = Math.max(1, Math.round(a.width * o.scale)), h = Math.max(1, Math.round(a.height * o.scale));
      const key = `${Math.floor(o.x / 2048)}_${Math.floor(o.y / 2048)}`;
      const ch = chunks.get(key) ?? { pages: [], frames: [], pieces: [] };
      const frameKey = `${o.asset}:${w}:${h}`;
      const indices = frameIndices.get(key) ?? new Map<string, number>();
      let frame = indices.get(frameKey);
      if (frame === undefined) {
        frame = ch.frames.length;
        const name = `object-${i}.webp`;
        await sharp(store.assetPath(p.id, o.asset)).resize(w, h).webp({ lossless: true }).toFile(path.join(staging, 'objects', name));
        ch.frames.push([ch.pages.length, 0, 0, w, h]); ch.pages.push(name);
        indices.set(frameKey, frame); frameIndices.set(key, indices);
      }
      ch.pieces.push([frame, o.x - o.anchorX * o.scale, o.y - o.anchorY * o.scale, 0, w, o.y + o.depthOffset]);
      chunks.set(key, ch);
    }
    for (const [key, chunk] of chunks) { chunk.pieces.sort((a, b) => a[5] - b[5]); await store.atomic(path.join(staging, 'objects', `${key}.json`), chunk); }
    const base = { id: p.id, name: p.name, size: { width: p.width, height: p.height }, entry: p.entry };
    await store.atomic(path.join(staging, 'map.json'), { id: p.id, name: p.name, width: p.width, height: p.height, regionSize: 512, cols: rc, rows: rr, chunk: 4, origin: { rx: 0, ry: 0 }, regions: regionBits.toString('base64'), chunks: [...chunks.keys()], minimap: { file: 'minimap.webp', width: Math.round(p.width / 8), height: Math.round(p.height / 8), scale: 1 / 8 }, traps: 0 });
    await store.atomic(path.join(staging, 'nav.json'), { ...base, navigation: { kind: 'grid', cellSize: { width: CELL_W, height: CELL_H }, columns: cols, rows, blockedBase64: bits.toString('base64') } });
    await store.atomic(path.join(staging, 'catalog-entry.json'), { ...base, type: 'Field', region: '' });
    await store.atomic(path.join(staging, 'project.json'), p);
    const preview = await sharp(store.assetPath(p.id, p.ground.id)).ensureAlpha().composite(await Promise.all([...p.objects].sort((a, b) => a.y + a.depthOffset - b.y - b.depthOffset).map(async o => {
      const a = p.assets.find(a => a.id === o.asset)!;
      const w = Math.max(1, Math.round(a.width * o.scale)), h = Math.max(1, Math.round(a.height * o.scale));
      const left = Math.round(o.x - o.anchorX * o.scale), top = Math.round(o.y - o.anchorY * o.scale);
      const x0 = Math.max(0, left), y0 = Math.max(0, top), x1 = Math.min(p.width, left + w), y1 = Math.min(p.height, top + h);
      if (x1 <= x0 || y1 <= y0) return null;
      const input = await sharp(store.assetPath(p.id, o.asset)).resize(w, h).extract({ left: x0 - left, top: y0 - top, width: x1 - x0, height: y1 - y0 }).toBuffer();
      return { input, left: x0, top: y0 };
    })).then(parts => parts.filter((x): x is NonNullable<typeof x> => x !== null))).webp({ lossless: true }).toBuffer();
    await fs.writeFile(path.join(staging, 'preview.webp'), preview);
    await sharp(preview).resize(Math.round(p.width / 8), Math.round(p.height / 8)).webp({ lossless: true }).toFile(path.join(staging, 'minimap.webp'));
    await sharp(preview).resize(240, 240, { fit: 'inside' }).webp().toFile(path.join(staging, 'thumb.webp'));
    await fs.rename(staging, out);
    return build;
  } catch (e) { await fs.rm(staging, { recursive: true, force: true }); throw e; }
}
