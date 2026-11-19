/**
 * Generate Phi phong (Mantle) assets from the original JX1 / SHXT client:
 *   - 11 bag icons:        public/assets/items/pifeng_01..11.webp
 *   - 22 hover previews:   public/assets/mantles/preview-{m,f}-{0..10}.webp (front + back composite)
 *   - Paper-doll sheets:   public/assets/char/{man,woman}/<mantle_spr>.webp
 *   - Metadata:            src/art/jx/mantles.gen.ts
 *
 * Run: JX_CLIENT=/path/to/Client_VLTK_SHXT npm run gen:mantles -w @vltk/client
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readGameFile, readTable } from './jx/source.ts';
import { resolveAny } from './jx/hashindex.ts';
import { decodeSpr, unionBox, type Spr } from './jx/spr.ts';
import { JX_ASSOC, type Sx } from '../src/art/jx/data.gen.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '..');
const PUBLIC = path.join(CLIENT, 'public/assets');
const OUT_GEN = path.join(CLIENT, 'src/art/jx/mantles.gen.ts');
const MAX_TEX = 4096;
const CONCURRENCY = 8;

type Meta = [number, number, number, number, number, number, number];

async function writeSheet(spr: Spr, out: string): Promise<Meta> {
  const dirs = spr.directions;
  const per = Math.max(1, Math.floor(spr.frames.length / dirs));
  const box = unionBox(spr.frames.slice(0, per * dirs));
  const cols = Math.max(1, Math.min(per, Math.floor(MAX_TEX / box.w)));
  const rowsPerDir = Math.ceil(per / cols);
  const W = cols * box.w, H = dirs * rowsPerDir * box.h;
  const px = Buffer.alloc(W * H * 4);
  for (let d = 0; d < dirs; d++) {
    for (let f = 0; f < per; f++) {
      const fr = spr.frames[d * per + f];
      if (!fr?.w) continue;
      const cx = (f % cols) * box.w + fr.x - box.x;
      const cy = (d * rowsPerDir + Math.floor(f / cols)) * box.h + fr.y - box.y;
      for (let y = 0; y < fr.h; y++) {
        const src = y * fr.w * 4;
        px.set(fr.rgba.subarray(src, src + fr.w * 4), ((cy + y) * W + cx) * 4);
      }
    }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 4 }).toFile(out);
  return [box.w, box.h, box.x, box.y, per, dirs, cols];
}

function loadSpr(gamePath: string): Spr | null {
  const file = resolveAny(gamePath);
  if (!file) return null;
  try { return decodeSpr(fs.readFileSync(file)); } catch { return null; }
}

function compositeDir(layers: (Spr | null)[], dirIdx: number): { buf: Uint8Array; w: number; h: number } | null {
  const valid = layers.filter((s): s is Spr => !!s && s.frames.length > 0);
  if (!valid.length) return null;
  const W = 320, H = 320;
  const canvas = new Uint8Array(W * H * 4);
  for (const spr of valid) {
    const per = Math.max(1, Math.floor(spr.frames.length / Math.max(1, spr.directions)));
    const d = Math.min(dirIdx, spr.directions - 1);
    const fr = spr.frames[d * per];
    if (!fr || fr.w <= 0 || fr.h <= 0) continue;
    for (let y = 0; y < fr.h; y++) {
      const dy = fr.y + y;
      if (dy < 0 || dy >= H) continue;
      for (let x = 0; x < fr.w; x++) {
        const dx = fr.x + x;
        if (dx < 0 || dx >= W) continue;
        const si = (y * fr.w + x) * 4;
        const sa = fr.rgba[si + 3] / 255;
        if (sa <= 0) continue;
        const di = (dy * W + dx) * 4;
        const da = canvas[di + 3] / 255;
        const outA = sa + da * (1 - sa);
        if (outA <= 0) continue;
        canvas[di] = Math.round((fr.rgba[si] * sa + canvas[di] * da * (1 - sa)) / outA);
        canvas[di + 1] = Math.round((fr.rgba[si + 1] * sa + canvas[di + 1] * da * (1 - sa)) / outA);
        canvas[di + 2] = Math.round((fr.rgba[si + 2] * sa + canvas[di + 2] * da * (1 - sa)) / outA);
        canvas[di + 3] = Math.round(outA * 255);
      }
    }
  }
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (canvas[(y * W + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX) return null;
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const cropped = new Uint8Array(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    const srcOff = ((minY + y) * W + minX) * 4;
    cropped.set(canvas.subarray(srcOff, srcOff + cw * 4), y * cw * 4);
  }
  return { buf: cropped, w: cw, h: ch };
}

async function writePreviewPair(head: Spr | null, body: Spr | null, mantle: Spr | null, out: string): Promise<void> {
  const front = compositeDir([mantle, body, head], 0);
  const back = compositeDir([body, head, mantle], 4);
  if (!front || !back) return;
  const gap = 12;
  const W = front.w + gap + back.w;
  const H = Math.max(front.h, back.h);
  const px = Buffer.alloc(W * H * 4);
  const blit = (img: { buf: Uint8Array; w: number; h: number }, ox: number, oy: number) => {
    for (let y = 0; y < img.h; y++) {
      const src = y * img.w * 4;
      px.set(img.buf.subarray(src, src + img.w * 4), ((oy + y) * W + ox) * 4);
    }
  };
  blit(front, 0, H - front.h);
  blit(back, front.w + gap, H - back.h);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 4 }).toFile(out);
}

async function main() {
  // 1. 11 bag icons: pifeng_01..11
  let iconCount = 0;
  for (let i = 1; i <= 11; i++) {
    const name = `pifeng_${String(i).padStart(2, '0')}`;
    const buf = readGameFile(`\\spr\\item\\equip\\pifengtubiao\\${name}.spr`);
    const spr = decodeSpr(buf);
    const fr = spr.frames.find(f => f.w > 0 && f.h > 0);
    if (!fr) continue;
    const out = path.join(PUBLIC, `items/${name}.webp`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(Buffer.from(fr.rgba), { raw: { width: fr.w, height: fr.h, channels: 4 } }).webp({ lossless: true }).toFile(out);
    iconCount++;
  }
  console.log(`Generated ${iconCount} mantle icons.`);

  // 2. Collect all action columns actually used by JX_ASSOC per sex
  const usedActions: Record<Sx, Set<string>> = { m: new Set(), f: new Set() };
  for (const sx of ['m', 'f'] as const) {
    for (const w of Object.values(JX_ASSOC[sx])) {
      for (const m of Object.values(w)) {
        for (const act of Object.values(m)) if (act) usedActions[sx].add(act);
      }
    }
  }

  // 3. Mantle sheets + hover previews
  const typesTbl = readTable('\\settings\\npcres\\人物类型.txt');
  const colIdx = (n: string) => typesTbl.header.indexOf(n);

  const mantleParts: Record<Sx, Record<number, Record<string, string>>> = { m: {}, f: {} };
  const mantleSheets: Record<string, Meta> = {};
  const jobs: (() => Promise<void>)[] = [];
  const queuedKeys = new Set<string>();

  for (const [charKey, sx, folder] of [['MainMan', 'm', 'man'], ['MainLady', 'f', 'woman']] as const) {
    const row = typesTbl.rows.find(r => r[0]?.trim() === charKey);
    if (!row) continue;
    const resDir = '\\' + row[colIdx('ResFilePath')].trim().replace(/^\\+/, '') + '\\';
    const headTbl = readTable('\\settings\\npcres\\' + row[colIdx('Head')].trim());
    const bodyTbl = readTable('\\settings\\npcres\\' + row[colIdx('Body')].trim());
    const mantleTbl = readTable('\\settings\\npcres\\' + row[colIdx('Mantle')].trim());
    const headSpr = loadSpr(resDir + (headTbl.rows.find(r => r[1]?.trim())?.[1]?.trim() ?? ''));
    const bodySpr = loadSpr(resDir + (bodyTbl.rows.find(r => r[1]?.trim())?.[1]?.trim() ?? ''));

    const header = mantleTbl.header.map(h => h.trim());
    const validRows = mantleTbl.rows.filter(r => r[0]?.trim());

    for (let idx = 0; idx < validRows.length; idx++) {
      const r = validRows[idx];
      mantleParts[sx][idx] = {};

      // Hover preview (front + back) using FreeStand1 (col 1)
      const standSpr = loadSpr(resDir + (r[1]?.trim() ?? ''));
      if (standSpr) {
        const previewOut = path.join(PUBLIC, `mantles/preview-${sx}-${idx}.webp`);
        jobs.push(() => writePreviewPair(headSpr, bodySpr, standSpr, previewOut));
      }

      // Action sheets for paper-doll rendering
      for (let c = 1; c < header.length; c++) {
        const act = header[c];
        if (!usedActions[sx].has(act)) continue;
        const sprFile = r[c]?.trim();
        if (!sprFile) continue;
        const base = path.basename(sprFile, '.spr').toLowerCase();
        const key = `char/${folder}/${base}`;
        const gamePath = resDir + sprFile;
        if (!resolveAny(gamePath)) continue;
        mantleParts[sx][idx][act] = key;
        if (queuedKeys.has(key)) continue;
        queuedKeys.add(key);
        const out = path.join(PUBLIC, `${key}.webp`);
        jobs.push(async () => {
          const spr = loadSpr(gamePath);
          if (!spr) return;
          mantleSheets[key] = await writeSheet(spr, out);
        });
      }
    }
  }

  console.log(`Encoding ${jobs.length} mantle sheets & previews...`);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) await jobs[next++]();
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const gen = `// Generated by apps/client/tools/gen-mantles.ts from Client_VLTK_SHXT. Do not edit by hand.
import type { Sx } from './data.gen';

export const MANTLE_PARTS: Record<Sx, Record<number, Record<string, string>>> = ${JSON.stringify(mantleParts)};
export const MANTLE_SHEETS: Record<string, readonly number[]> = ${JSON.stringify(mantleSheets)};
`;
  fs.writeFileSync(OUT_GEN, gen, 'utf8');
  console.log(`Wrote ${OUT_GEN} (${Object.keys(mantleSheets).length} sheets).`);
}

main();
