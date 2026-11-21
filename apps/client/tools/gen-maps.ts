// Renders original JX1 maps (jx-origin data_extract) for the Phaser client at 1:1 pixel scale.
//
//   npm run gen:maps -w @vltk/client                    # every map of settings/maplist.ini (~300, hours)
//   npm run gen:maps -w @vltk/client -- 140             # some maps
//   npm run gen:maps -w @vltk/client -- --skip-existing # resume: skip maps that already have nav.json
//   npm run gen:maps -w @vltk/client -- --catalog       # only rewrite the catalog / thumbnails
//   npm run gen:maps -w @vltk/client -- --entries       # re-pick auto entries of generated maps (nav.json only)
//
// Region file format: see tools/jx/region.ts. World coordinates: origin = top-left of the map's region rect,
// world x = logic x - rx0 * 512, world y = logic y / 2 - ry0 * 512 (actors already use these "screen" units).
//
// Output (apps/client/public/assets/maps/<id>/):
//   map.json                 region grid, chunk list, minimap info
//   ground/<rx>_<ry>.webp    512x512 flat ground (tiles + decals), rx/ry relative to the rect
//   objects/<cx>_<cy>.json   occluding objects of a 4x4-region chunk: atlas pages, frames, depth-sorted pieces
//   objects/<cx>_<cy>_<n>.webp
//   minimap.webp, thumb.webp (map list picture)
//   nav.json                 size, entry, navigation grid 32x16 (loaded by the server on demand)
// Shared: packages/shared/src/maps/catalog.gen.ts (id, name, type, size, entry of every generated map).
import './jx/threads.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { updateManifest } from './jx/manifest.ts';
import { readGameFile, resolveFile, tcvn3 } from './jx/source.js';
import { resolveAny } from './jx/hashindex.js';
import { CELL_H, CELL_W, REGION_COLS, REGION_H, REGION_ROWS, REGION_W, Z_SCALE, parseRegion, type Region } from './jx/region.js';
import { blit, clearSprCache, getFrame } from './jx/sprcache.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_ROOT = path.join(HERE, '../public/assets/maps');
const CATALOG = path.join(HERE, '../../../packages/shared/src/maps/catalog.gen.ts');

interface Source { id: number; name: string; type: string; path: string; entry?: [number, number] }
/**
 * Hand-picked entries (world px on the minimap: Biện Kinh paifang plaza, Dược Vương Cốc valley mouth). Other maps
 * use the middle of their largest walkable area. Only cells reachable from the entry stay walkable: the original
 * keeps players out of the strip between the outer tree wall and the region edge with server data we don't have.
 */
const ENTRIES: Record<number, [number, number]> = { 37: [20388, 13168], 140: [5280, 9600], 323: [766, 3035] };
/** Additional disconnected walkable areas to keep (e.g. map 323 has separate Song south & Jin north camps; map 378 has SW & NE resting camps). */
const EXTRA_REACHABLE: Record<number, [number, number][]> = {
  323: [[2693, 1163]],
  378: [[2704, 9224], [3952, 8552], [17136, 1640], [15376, 2472]],
};

/** Every distinct map of settings/maplist.ini (several ids often share one map: the first one is kept). */
function maplistSources(): Source[] {
  const buf = readGameFile('settings/maplist.ini');
  const latin = buf.toString('latin1').split(/\r?\n/), gbk = new TextDecoder('gbk').decode(buf).split(/\r?\n/);
  const byId = new Map<number, Source>();
  latin.forEach((line, i) => {
    let m = /^(\d+)=(.+)$/.exec((gbk[i] ?? '').trim());
    if (m) { byId.set(+m[1], { id: +m[1], name: '', type: '', path: m[2].trim() }); return; }
    m = /^(\d+)_name=(.*)$/.exec(line.trim());
    if (m && byId.has(+m[1])) byId.get(+m[1])!.name = tcvn3(m[2].trim());
    m = /^(\d+)_MapType=(.*)$/.exec(line.trim());
    if (m && byId.has(+m[1])) byId.get(+m[1])!.type = m[2].trim();
  });
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const src of [...byId.values()].sort((a, b) => a.id - b.id)) {
    // "<area>\\<map>" -> \\maps\\<area>\\<map>.wor, or the map folder holding <map>.wor
    const direct = `\\maps\\${src.path}`, nested = `${direct}\\${src.path.split('\\').pop()}`;
    const p = resolveFile(`${direct}.wor`) ? direct : resolveFile(`${nested}.wor`) ? nested : null;
    if (!p || seen.has(p.toLowerCase())) continue;
    seen.add(p.toLowerCase());
    out.push({ ...src, name: src.name || `Bản đồ ${src.id}`, path: p, entry: ENTRIES[src.id] });
  }
  return out;
}

/** Order of a full run: towns first so they are playable early, instances and battlefields last. */
const TYPE_ORDER = ['City', 'Capital', 'Field', 'Country', 'Cave', 'Others', '', 'Tong', 'Battlefield'];

/** `--nav`: only rewrite packages/shared/src/maps/data/map<id>.ts (fast). */
const NAV_ONLY = process.argv.includes('--nav');
const CHUNK = 4;                // regions per chunk side (object atlases + json)
const PAGE = 2048;              // atlas page size
const PAD = 2;
const MINIMAP_MAX = 2048;
const GROUND_QUALITY = 90;

const pad3 = (n: number) => String(n).padStart(3, '0');

function readRect(mapPath: string): [number, number, number, number] {
  const text = new TextDecoder('gbk').decode(readGameFile(mapPath + '.wor'));
  const m = /rect\s*=\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)\s*,\s*(-?\d+)/i.exec(text);
  if (!m) throw new Error(`no rect in ${mapPath}.wor`);
  return [+m[1], +m[2], +m[3], +m[4]];
}

interface Piece { frame: number; x: number; y: number; sx: number; sw: number; depth: number }
interface PlacedObject { spr: string; frame: number; x: number; y: number; w: number; h: number; pieces: { sx: number; sw: number; depth: number }[] }

/** Image placement + depth strips for one region object (world coordinates). */
function placeObject(o: Region['objects'][number], ox: number, oy: number): PlacedObject | null {
  const f = getFrame(o.spr, o.frame);
  if (!f || !f.w) return null;
  const [lx, ly, lz] = o.corners[0];
  const x = lx - ox, y = Math.round(ly / 2 - lz * Z_SCALE) - oy;
  const w = f.w, h = f.h;
  const toWorld = (p: [number, number]) => [p[0] - ox, p[1] / 2 - oy] as const;
  let pieces: PlacedObject['pieces'];
  if (!o.sort2) {
    const [, sy] = o.sort1[0] || o.sort1[1] ? toWorld(o.sort1) : [0, y + h];
    pieces = [{ sx: 0, sw: w, depth: sy }];
  } else {
    const [x1, y1] = toWorld(o.sort1), [x2, y2] = toWorld(o.sort2);
    const dy = Math.abs(y2 - y1);
    if (dy < 4 || x1 === x2) pieces = [{ sx: 0, sw: w, depth: Math.max(y1, y2) }];
    else {
      // Sloped sort line: vertical strips, each sorted by the line height at its centre.
      // ~12 px of depth error per strip is invisible at actor scale; strips are at least 24 px wide.
      const strips = Math.min(Math.ceil(w / 24), Math.max(2, Math.ceil(dy / 12)));
      const sw = Math.ceil(w / strips);
      pieces = [];
      for (let sx = 0; sx < w; sx += sw) {
        const cx = x + sx + Math.min(sw, w - sx) / 2;
        const t = Math.min(1, Math.max(0, (cx - x1) / (x2 - x1)));
        pieces.push({ sx, sw: Math.min(sw, w - sx), depth: y1 + t * (y2 - y1) });
      }
    }
  }
  return { spr: o.spr, frame: o.frame, x, y, w, h, pieces };
}

/** Shelf-pack rectangles into PAGE x PAGE pages. Returns [page, x, y] per input index. */
function pack(sizes: { w: number; h: number }[]): { pos: [number, number, number][]; pages: { w: number; h: number }[] } {
  const order = sizes.map((_, i) => i).sort((a, b) => sizes[b].h - sizes[a].h || sizes[b].w - sizes[a].w);
  const pos: [number, number, number][] = new Array(sizes.length);
  const pages: { w: number; h: number }[] = [];
  let page = -1, x = 0, y = 0, shelf = 0;
  const newPage = () => { pages.push({ w: 0, h: 0 }); page++; x = 0; y = 0; shelf = 0; };
  newPage();
  for (const i of order) {
    const w = Math.min(PAGE, sizes[i].w + PAD), h = Math.min(PAGE, sizes[i].h + PAD);
    if (x + w > PAGE) { x = 0; y += shelf; shelf = 0; }
    if (y + h > PAGE) newPage();
    pos[i] = [page, x, y];
    pages[page].w = Math.max(pages[page].w, x + w);
    pages[page].h = Math.max(pages[page].h, y + h);
    x += w; shelf = Math.max(shelf, h);
  }
  return { pos, pages };
}

async function webp(rgba: Uint8Array, w: number, h: number, file: string, opts: sharp.WebpOptions): Promise<number> {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const info = await sharp(Buffer.from(rgba.buffer, rgba.byteOffset, rgba.byteLength), { raw: { width: w, height: h, channels: 4 } })
    .webp(opts).toFile(file);
  return info.size;
}

/** Run async jobs with bounded concurrency. */
async function pool<T>(items: T[], limit: number, fn: (item: T, i: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; await fn(items[i], i); }
  }));
}

async function generate(src: Source): Promise<void> {
  const t0 = Date.now();
  const [x0, y0, x1, y1] = readRect(src.path);
  const cols = x1 - x0 + 1, rows = y1 - y0 + 1;
  const width = cols * REGION_W, height = rows * REGION_H;
  const ox = x0 * REGION_W, oy = y0 * REGION_H; // logic x origin == screen x origin; screen y origin
  const out = path.join(OUT_ROOT, String(src.id));
  if (!NAV_ONLY) {
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(path.join(out, 'ground'), { recursive: true });
    fs.mkdirSync(path.join(out, 'objects'), { recursive: true });
  }

  // ---------- parse ----------
  const regions = new Map<string, { gx: number; gy: number; r: Region }>();
  for (let ry = y0; ry <= y1; ry++) for (let rx = x0; rx <= x1; rx++) {
    const p = `${src.path}\\v_${pad3(ry)}\\${pad3(rx)}_region_c.dat`;
    const file = resolveAny(p);
    if (!file) continue;
    regions.set(`${rx - x0}_${ry - y0}`, { gx: rx - x0, gy: ry - y0, r: parseRegion(fs.readFileSync(file)) });
  }
  console.log(`[${src.id}] ${src.name}: rect ${x0},${y0}-${x1},${y1} (${cols}x${rows}), ${regions.size} regions, ${width}x${height} px`);

  // ---------- navigation (1 bit per 32x16 cell, 1 = blocked) ----------
  const gw = cols * REGION_COLS, gh = rows * REGION_ROWS;
  const blocked = new Uint8Array(Math.ceil((gw * gh) / 8)).fill(0xff);
  const setFree = (c: number) => { blocked[c >> 3] &= ~(1 << (c & 7)); };
  let freeCells = 0;
  const traps: { x: number; y: number; hash: number }[] = [];
  for (const { gx, gy, r } of regions.values()) {
    for (let cx = 0; cx < REGION_COLS; cx++) for (let cy = 0; cy < REGION_ROWS; cy++) {
      if (r.obstacles && r.obstacles[cx * REGION_ROWS + cy]) continue;
      setFree((gy * REGION_ROWS + cy) * gw + gx * REGION_COLS + cx);
      freeCells++;
    }
    for (const t of r.traps) traps.push({ x: gx * REGION_W + t.x * CELL_W, y: gy * REGION_H + t.y * CELL_H, hash: t.hash });
  }

  // Keep only what is reachable from the entry (8-neighbourhood, no corner cutting — same rule as nav/grid.ts).
  const isFree = (c: number) => !((blocked[c >> 3] >> (c & 7)) & 1);
  const neighbours = (c: number, visit: (n: number) => void) => {
    const x = c % gw, y = (c - x) / gw;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx, ny = y + dy, n = ny * gw + nx;
      if ((!dx && !dy) || nx < 0 || ny < 0 || nx >= gw || ny >= gh || !isFree(n)) continue;
      if (dx && dy && (!isFree(y * gw + nx) || !isFree(ny * gw + x))) continue;
      visit(n);
    }
  };
  if (!src.entry) src.entry = autoEntry();
  const findStart = (pt: [number, number]) => {
    const ex = Math.floor(pt[0] / CELL_W), ey = Math.floor(pt[1] / CELL_H);
    for (let r = 0; r < 64; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = ex + dx, y = ey + dy;
      if (x >= 0 && y >= 0 && x < gw && y < gh && isFree(y * gw + x)) return y * gw + x;
    }
    throw new Error(`[${src.id}] entry ${pt} is not near walkable ground`);
  };
  const reached = new Uint8Array(gw * gh);
  const queue = new Int32Array(gw * gh);
  let head = 0, tail = 0;
  for (const pt of [src.entry!, ...(EXTRA_REACHABLE[src.id] ?? [])]) {
    const s = findStart(pt);
    if (!reached[s]) { queue[tail++] = s; reached[s] = 1; }
  }
  while (head < tail) neighbours(queue[head++], n => { if (!reached[n]) { reached[n] = 1; queue[tail++] = n; } });
  for (let c = 0; c < gw * gh; c++) if (!reached[c] && isFree(c)) { blocked[c >> 3] |= 1 << (c & 7); freeCells--; }

  if (NAV_ONLY) { writeNav(); return; }

  // ---------- decals (flat, baked into ground), bucketed by the regions they touch ----------
  type D = Region['decals'][number] & { wx: number; wy: number; seq: number };
  const decalsByRegion = new Map<string, D[]>();
  let seq = 0;
  for (const { r } of regions.values()) for (const d of r.decals) {
    const f = getFrame(d.spr, d.frame);
    if (!f || !f.w) continue;
    const item: D = { ...d, wx: d.x - ox, wy: Math.round(d.y / 2) - oy, seq: seq++ };
    for (let gy = Math.floor(item.wy / REGION_H); gy <= Math.floor((item.wy + f.h - 1) / REGION_H); gy++)
      for (let gx = Math.floor(item.wx / REGION_W); gx <= Math.floor((item.wx + f.w - 1) / REGION_W); gx++) {
        const k = `${gx}_${gy}`;
        if (!regions.has(k)) continue;
        (decalsByRegion.get(k) ?? decalsByRegion.set(k, []).get(k)!).push(item);
      }
  }
  for (const list of decalsByRegion.values()) list.sort((a, b) => a.layer - b.layer || a.order - b.order || a.seq - b.seq);

  // ---------- objects (occluding, separate sprites) ----------
  const chunks = new Map<string, PlacedObject[]>();
  const objectsByRegion = new Map<string, PlacedObject[]>(); // for the minimap
  let objectCount = 0, pieceCount = 0;
  for (const { gx, gy, r } of regions.values()) for (const o of r.objects) {
    const placed = placeObject(o, ox, oy);
    if (!placed) continue;
    objectCount++; pieceCount += placed.pieces.length;
    const ck = `${Math.floor(gx / CHUNK)}_${Math.floor(gy / CHUNK)}`;
    (chunks.get(ck) ?? chunks.set(ck, []).get(ck)!).push(placed);
    for (let ry = Math.floor(placed.y / REGION_H); ry <= Math.floor((placed.y + placed.h - 1) / REGION_H); ry++)
      for (let rx = Math.floor(placed.x / REGION_W); rx <= Math.floor((placed.x + placed.w - 1) / REGION_W); rx++) {
        const k = `${rx}_${ry}`;
        if (regions.has(k)) (objectsByRegion.get(k) ?? objectsByRegion.set(k, []).get(k)!).push(placed);
      }
  }

  // ---------- ground + minimap ----------
  const mmCell = Math.max(8, Math.floor((MINIMAP_MAX * REGION_W) / Math.max(width, height)));
  const mmW = cols * mmCell, mmH = rows * mmCell;
  const minimap = new Uint8Array(mmW * mmH * 4);
  for (let i = 3; i < minimap.length; i += 4) minimap[i] = 255;
  let groundBytes = 0;
  const regionList = [...regions.values()];
  await pool(regionList, 12, async ({ gx, gy, r }) => {
    const buf = new Uint8Array(REGION_W * REGION_H * 4);
    for (let i = 3; i < buf.length; i += 4) buf[i] = 255;
    for (const t of r.tiles) {
      const f = getFrame(t.spr, t.frame);
      if (f && f.w) blit(buf, REGION_W, REGION_H, f.rgba, f.w, f.h, t.h * 32 + f.x, t.v * 32 + f.y);
    }
    const bx = gx * REGION_W, by = gy * REGION_H;
    for (const d of decalsByRegion.get(`${gx}_${gy}`) ?? []) {
      const f = getFrame(d.spr, d.frame)!;
      blit(buf, REGION_W, REGION_H, f.rgba, f.w, f.h, d.wx - bx, d.wy - by);
    }
    const gb = await webp(buf, REGION_W, REGION_H, path.join(out, 'ground', `${gx}_${gy}.webp`), { quality: GROUND_QUALITY, effort: 4, smartSubsample: true });
    groundBytes += gb;
    // minimap: ground + objects clipped to this region, painter-sorted
    const objs = (objectsByRegion.get(`${gx}_${gy}`) ?? []).slice().sort((a, b) => a.pieces[0].depth - b.pieces[0].depth);
    for (const o of objs) {
      const f = getFrame(o.spr, o.frame)!;
      blit(buf, REGION_W, REGION_H, f.rgba, f.w, f.h, o.x - bx, o.y - by);
    }
    const small = await sharp(Buffer.from(buf.buffer), { raw: { width: REGION_W, height: REGION_H, channels: 4 } })
      .resize(mmCell, mmCell, { kernel: 'lanczos3' }).raw().toBuffer();
    for (let y = 0; y < mmCell; y++) small.copy(Buffer.from(minimap.buffer), ((gy * mmCell + y) * mmW + gx * mmCell) * 4, y * mmCell * 4, (y + 1) * mmCell * 4);
  });
  const minimapBytes = await webp(minimap, mmW, mmH, path.join(out, 'minimap.webp'), { quality: 88 });
  await thumbnail(out);

  // ---------- object chunks ----------
  let objectBytes = 0;
  const chunkKeys = [...chunks.keys()].sort();
  await pool(chunkKeys, 6, async ck => {
    const list = chunks.get(ck)!;
    const frameIndex = new Map<string, number>();
    const frames: { spr: string; frame: number; w: number; h: number }[] = [];
    const pieces: Piece[] = [];
    for (const o of list) {
      const key = `${o.spr}#${o.frame}`;
      let fi = frameIndex.get(key);
      if (fi === undefined) { fi = frames.length; frameIndex.set(key, fi); frames.push({ spr: o.spr, frame: o.frame, w: o.w, h: o.h }); }
      for (const p of o.pieces) pieces.push({ frame: fi, x: o.x + p.sx, y: o.y, sx: p.sx, sw: p.sw, depth: p.depth });
    }
    const { pos, pages } = pack(frames);
    const pageBufs = pages.map(p => ({ ...p, buf: new Uint8Array(p.w * p.h * 4) }));
    frames.forEach((fr, i) => {
      const f = getFrame(fr.spr, fr.frame)!;
      const [pg, x, y] = pos[i];
      blit(pageBufs[pg].buf, pageBufs[pg].w, pageBufs[pg].h, f.rgba, f.w, f.h, x, y);
    });
    const files: string[] = [];
    for (let i = 0; i < pageBufs.length; i++) {
      const name = `${ck}_${i}.webp`;
      // Near-lossless: visually identical to lossless on this painted art, ~27% smaller.
      const ob = await webp(pageBufs[i].buf, pageBufs[i].w, pageBufs[i].h, path.join(out, 'objects', name), { nearLossless: true, quality: 60, effort: 4 });
      objectBytes += ob;
      files.push(name);
    }
    pieces.sort((a, b) => a.depth - b.depth);
    const json = {
      pages: files,
      // [page, x, y, w, h]
      frames: frames.map((fr, i) => [pos[i][0], pos[i][1], pos[i][2], fr.w, fr.h]),
      // [frame, worldX, worldY, srcX, srcW, depth]
      pieces: pieces.map(p => [p.frame, p.x, p.y, p.sx, p.sw, Math.round(p.depth * 10) / 10]),
    };
    fs.writeFileSync(path.join(out, 'objects', `${ck}.json`), JSON.stringify(json));
  });

  // ---------- map.json ----------
  const regionBits = new Uint8Array(Math.ceil((cols * rows) / 8));
  for (const { gx, gy } of regions.values()) { const i = gy * cols + gx; regionBits[i >> 3] |= 1 << (i & 7); }
  const meta = {
    id: src.id, name: src.name, width, height, regionSize: REGION_W, cols, rows, chunk: CHUNK,
    origin: { rx: x0, ry: y0 },
    regions: Buffer.from(regionBits).toString('base64'),
    chunks: chunkKeys,
    minimap: { file: 'minimap.webp', width: mmW, height: mmH, scale: mmCell / REGION_W },
    traps: traps.length,
  };
  fs.writeFileSync(path.join(out, 'map.json'), JSON.stringify(meta));

  writeNav();
  fs.writeFileSync(path.join(out, 'traps.json'), JSON.stringify(traps));

  const mb = (n: number) => (n / 2 ** 20).toFixed(1);
  console.log(`[${src.id}] objects ${objectCount} (${pieceCount} pieces) in ${chunkKeys.length} chunks, traps ${traps.length}`);
  console.log(`[${src.id}] ground ${mb(groundBytes)} MB, objects ${mb(objectBytes)} MB, minimap ${mmW}x${mmH} ${mb(minimapBytes)} MB, ${((Date.now() - t0) / 1000).toFixed(0)} s`);

  function writeNav(): void {
    const entry = src.entry!;
    const nav = {
      id: src.id, name: src.name, type: src.type, source: src.path.replace(/\\/g, '/'),
      size: { width, height }, entry: { x: entry[0], y: entry[1] },
      navigation: { kind: 'grid', cellSize: { width: CELL_W, height: CELL_H }, columns: gw, rows: gh, blockedBase64: Buffer.from(blocked).toString('base64') },
    };
    fs.mkdirSync(out, { recursive: true });
    fs.writeFileSync(path.join(out, 'nav.json'), JSON.stringify(nav));
    console.log(`[${src.id}] walkable cells ${freeCells}/${gw * gh}`);
  }

  /**
   * Entry for maps without a hand-picked one: the walkable area around the middle of the map (towns sit there,
   * often walled off from the fields around them), unless that area is tiny — then the largest one.
   */
  function autoEntry(): [number, number] {
    const comp = new Int32Array(gw * gh).fill(-1);
    const sizes: number[] = [];
    const q = new Int32Array(gw * gh);
    for (let c0 = 0; c0 < gw * gh; c0++) {
      if (comp[c0] >= 0 || !isFree(c0)) continue;
      const id = sizes.length;
      let h = 0, t = 0;
      q[t++] = c0; comp[c0] = id;
      while (h < t) neighbours(q[h++], n => { if (comp[n] < 0) { comp[n] = id; q[t++] = n; } });
      sizes.push(t);
    }
    if (!sizes.length) throw new Error('no walkable ground');
    // Among the areas big enough to be the playable one (~30 regions, or a fifth of the largest), the one that
    // comes closest to the middle: a walled town rather than the empty border around it or a courtyard island.
    const largest = Math.max(...sizes);
    const minSize = Math.min(largest * 0.2, 15000);
    const near = new Array(sizes.length).fill(Infinity);
    const mx = gw / 2, my = gh / 2;
    for (let c = 0; c < gw * gh; c++) {
      const k = comp[c];
      if (k < 0 || sizes[k] < minSize) continue;
      const d = ((c % gw) - mx) ** 2 * CELL_W ** 2 + (Math.floor(c / gw) - my) ** 2 * (CELL_H * 2) ** 2;
      if (d < near[k]) near[k] = d;
    }
    const pick = near.indexOf(Math.min(...near));
    if (process.env.DEBUG_ENTRY) console.log(`[${src.id}] components ${sizes.length}, picked ${sizes[pick]} (largest ${largest})`);
    return centreCell(gw, gh, c => comp[c] === pick);
  }
}

/**
 * Walkable cell nearest to the middle of the map, world px. Towns sit in the middle of their map, so this lands
 * inside the walls rather than in the surrounding fields.
 */
function centreCell(gw: number, gh: number, ok: (c: number) => boolean): [number, number] {
  const mx = gw / 2, my = gh / 2;
  let pick = -1, pd = Infinity;
  for (let c = 0; c < gw * gh; c++) {
    if (!ok(c)) continue;
    const dx = (c % gw - mx) * CELL_W, dy = (Math.floor(c / gw) - my) * CELL_H * 2; // logic distance
    const d = dx * dx + dy * dy;
    if (d < pd) { pd = d; pick = c; }
  }
  if (pick < 0) throw new Error('no walkable ground');
  return [(pick % gw + 0.5) * CELL_W, (Math.floor(pick / gw) + 0.5) * CELL_H];
}

/** `--entries`: move the auto entry of already generated maps to the centre rule (nav.json only, no art). */
function fixEntries(): void {
  let n = 0;
  for (const dir of fs.readdirSync(OUT_ROOT)) {
    const file = path.join(OUT_ROOT, dir, 'nav.json');
    if (!fs.existsSync(file) || ENTRIES[Number(dir)]) continue;
    const nav = JSON.parse(fs.readFileSync(file, 'utf8'));
    const { columns: gw, rows: gh, blockedBase64 } = nav.navigation;
    const bits = Buffer.from(blockedBase64, 'base64');
    const [x, y] = centreCell(gw, gh, c => !((bits[c >> 3] >> (c & 7)) & 1));
    if (nav.entry.x === x && nav.entry.y === y) continue;
    nav.entry = { x, y };
    fs.writeFileSync(file, JSON.stringify(nav));
    n++;
  }
  console.log(`entries: ${n} maps moved to their centre`);
}

/** Small picture of the whole map for the map list (from minimap.webp). */
async function thumbnail(out: string): Promise<void> {
  const mm = path.join(out, 'minimap.webp');
  if (!fs.existsSync(mm)) return;
  await sharp(mm).resize(240, 240, { fit: 'inside', kernel: 'lanczos3' }).webp({ quality: 82 }).toFile(path.join(out, 'thumb.webp'));
}

/** packages/shared/src/maps/catalog.gen.ts from every generated map folder (nav.json). */
/** maplist.ini area folder -> region (the original regional bandits: Tây Bắc sơn tặc, Giang Nam sơn tặc…). */
const AREA_REGIONS: Record<string, string> = {
  西北南区: 'Tây Bắc', 西北北区: 'Tây Bắc', 西南北区: 'Tây Nam', 西南南区: 'Tây Nam', 中原北区: 'Hoa Bắc',
  中原南区: 'Trung Nguyên', 两湖区: 'Lưỡng Hồ', 江南区: 'Giang Nam', 东北区: 'Đông Bắc', 特殊用地: 'Đặc thù',
};

async function writeCatalog(sources: Source[]): Promise<void> {
  const types = new Map(sources.map(s => [s.id, s.type]));
  const regions = new Map(sources.map(s => [s.id, AREA_REGIONS[s.path.split('\\')[2] ?? ''] ?? '']));
  const list: unknown[] = [];
  for (const dir of fs.readdirSync(OUT_ROOT)) {
    const navFile = path.join(OUT_ROOT, dir, 'nav.json');
    if (!fs.existsSync(navFile)) continue;
    const nav = JSON.parse(fs.readFileSync(navFile, 'utf8'));
    if (!fs.existsSync(path.join(OUT_ROOT, dir, 'thumb.webp'))) {
      await thumbnail(path.join(OUT_ROOT, dir));
      updateManifest([`map/${dir}`], true);
    }
    list.push({ id: nav.id, name: nav.name, type: nav.type ?? types.get(nav.id) ?? '', region: regions.get(nav.id) ?? '', size: nav.size, entry: nav.entry });
  }
  list.sort((a, b) => (a as { id: number }).id - (b as { id: number }).id);
  fs.writeFileSync(CATALOG, `// Generated by apps/client/tools/gen-maps.ts: every map generated into apps/client/public/assets/maps. Do not edit.
// type = settings/maplist.ini MapType (City, Capital, Field, Country, Cave, Tong, Battlefield, Others, '').
import type { MapCatalogEntry } from './types.js';

export const MAP_CATALOG: MapCatalogEntry[] = [
${list.map(e => `  ${JSON.stringify(e)}`).join(',\n')}
];
`);
  console.log(`catalog: ${list.length} maps -> ${path.relative(process.cwd(), CATALOG)}`);
}

const args = process.argv.slice(2);
const want = args.map(Number).filter(Boolean);
const SKIP_EXISTING = args.includes('--skip-existing');
const sources = maplistSources();
if (args.includes('--entries')) fixEntries();
else if (!args.includes('--catalog')) {
  const todo = sources
    .filter(s => !want.length || want.includes(s.id))
    .filter(s => !SKIP_EXISTING || !fs.existsSync(path.join(OUT_ROOT, String(s.id), 'nav.json')))
    .sort((a, b) => (TYPE_ORDER.indexOf(a.type) + 99) % 99 - (TYPE_ORDER.indexOf(b.type) + 99) % 99 || a.id - b.id);
  console.log(`maps: ${sources.length} in maplist.ini, ${todo.length} to generate`);
  const failed: string[] = [];
  let done = 0;
  for (const src of todo) {
    try { await generate(src); updateManifest([`map/${src.id}`]); }
    catch (e) { failed.push(`${src.id} ${src.name}: ${(e as Error).message}`); console.warn(`[${src.id}] FAILED: ${(e as Error).message}`); }
    clearSprCache();
    if (++done % 20 === 0) await writeCatalog(sources);
  }
  if (failed.length) console.warn(`failed ${failed.length}:\n  ${failed.join('\n  ')}`);
}
await writeCatalog(sources);
