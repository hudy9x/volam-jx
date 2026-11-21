/**
 * Hoàng kim môn phái (TB11) -> packages/shared/src/items/gold.gen.ts (+ missing icons in public/assets/items).
 *
 *   npm run gen:gold -w @vltk/client
 *
 * Sources (read only): jx-origin/settings/item/goldequip.txt + magicattrib_ge.txt (loose SHXT mod files, allowed: AGENTS.md
 * §7 / BACKLOG TB0) — rows of the 28 faction sets (suite 1–28, 140 pieces); data_extract settings/item/goldequipres.txt
 * (part id of the look; part-table row = part id − 2). Same columns as the ordinary item tables, plus 46–51 = the six
 * magic lines (row of magicattrib_ge.txt: col 4 attribute id, 5–10 min/max of P1, P2, P3) and 52 = suite.
 * Docs: docs/equipment-gold-thientu.md (all pieces), docs/formulas/drops.md (how they work in the game).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { updateManifest } from './jx/manifest.ts';
import { CLIENT_ROOT, readTable, tcvn3 } from './jx/source.ts';
import { resolveAny } from './jx/hashindex.ts';
import { decodeSpr } from './jx/spr.ts';
import { VERIFIED_MAX, readMagicAttribNames } from './jx/magicattr.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../../packages/shared/src/items/gold.gen.ts');
const PUBLIC = path.resolve(HERE, '../public/assets');
const KINDS = ['melee', 'range', 'armor', 'ring', 'amulet', 'boot', 'belt', 'helm', 'cuff', 'pendant'];
const ATTR = readMagicAttribNames(CLIENT_ROOT);
const attrName = (id: number) => (id <= VERIFIED_MAX && ATTR[id] ? ATTR[id] : `attr${id}`);
const rows = (f: string) => fs.readFileSync(`${CLIENT_ROOT}/settings/item/${f}`).toString('latin1').split(/\r?\n/).filter(l => l.length).map(l => l.split('\t'));
const num = (r: string[], i: number) => { const n = parseInt((r[i] ?? '').trim(), 10); return Number.isFinite(n) ? n : 0; };

const GE = rows('magicattrib_ge.txt');
const res = new Map(readTable('\\settings\\item\\goldequipres.txt').rows.map(r => [Number(r[0]), Number(r[1]) || 0]));
const out: unknown[] = [];
const icons = new Map<string, string>();
let fallbackLooks = 0;
/** Ordinary item tables + their part tables (as gen-assets.ts), for gold rows goldequipres.txt leaves empty. */
const ORDINARY: Record<string, [string, string]> = {
  armor: ['armor', 'armorres'], helm: ['helm', 'helmres'], melee: ['meleeweapon', 'meleeres'], range: ['rangeweapon', 'rangeres'],
};
const ordinaryCache = new Map<string, { rows: string[][]; res: Map<number, number> }>();
/** Part id of the ordinary piece of that kind / ParticularType at `level` (else its highest level), all types (outfits too). */
function ordinaryPart(kind: string, type: number, level: number): number | undefined {
  let t = ordinaryCache.get(kind);
  if (!t) {
    const [file, resFile] = ORDINARY[kind];
    t = { rows: readTable(`\\settings\\item\\${file}.txt`, 'latin1').rows,
      res: new Map(readTable(`\\settings\\item\\${resFile}.txt`).rows.map(x => [Number(x[0]), Number(x[1]) || 0])) };
    ordinaryCache.set(kind, t);
  }
  let best: { lv: number; part: number } | undefined;
  t.rows.forEach((x, i) => {
    if (Number(x[3]) !== type || !x[0]?.trim()) return;
    const lv = Number(x[11]), part = t!.res.get(i + 2);
    if (!part) return;
    if (lv === level) best = { lv: 1e9, part };
    else if (!best || (best.lv !== 1e9 && lv > best.lv)) best = { lv, part };
  });
  return best?.part;
}
rows('goldequip.txt').slice(1).forEach((r, i) => {
  const row = i + 1, suite = num(r, 52), name = tcvn3(r[0] ?? '').replace(/\s+/g, ' ').trim();
  if (suite < 1 || suite > 28 || name.startsWith('[') || name.includes('(kỳ hạn)') || num(r, 1) !== 0) return;
  const kind = KINDS[num(r, 2)];
  if (!kind) return;
  const base: [string, number, number][] = [];
  for (let c = 13; c <= 31; c += 3) if (num(r, c)) base.push([attrName(num(r, c)), num(r, c + 1), num(r, c + 2)]);
  const req: [string, number][] = [];
  for (let c = 34; c <= 44; c += 2) if (num(r, c)) req.push([attrName(num(r, c)), num(r, c + 1)]);
  // Six fixed lines: [attribute, [P1, P2, P3] at quality 0, at quality 10].
  const lines: [string, number[], number[]][] = [];
  for (let c = 46; c <= 51; c++) {
    const g = GE[num(r, c)];
    if (!num(r, c) || !g) continue;
    lines.push([attrName(num(g, 4)), [num(g, 5), num(g, 7), num(g, 9)], [num(g, 6), num(g, 8), num(g, 10)]]);
  }
  const iconPath = (r[4] ?? '').trim();
  const base_ = path.basename(iconPath.replace(/\\/g, '/'), '.spr').toLowerCase();
  const icon = `items/${base_}`;
  icons.set(iconPath, icon);
  // goldequipres.txt leaves some rows empty (e.g. 7 Phục Ma Huyền Hoàng Cà Sa): then the paper-doll row of the ordinary piece of
  // the same kind / ParticularType / level (the highest level of that type when that level is missing) — INFERRED, the engine
  // that would decide it is not in the client.
  let part = res.get(row);
  if (!part && ORDINARY[kind]) {
    const part2 = ordinaryPart(kind, num(r, 3), num(r, 11) || 10);
    if (part2) { part = part2; fallbackLooks++; }
  }
  out.push({
    id: `gold-${row}`, kind, type: num(r, 3), level: num(r, 11) || 10, name, icon,
    price: num(r, 10), size: [num(r, 6) || 1, num(r, 7) || 1], desc: tcvn3(r[8] ?? '').trim(), base, req,
    ...(part ? { look: part - 2 } : {}), gold: { suite, series: num(r, 9), lines },
  });
});

// Icons of the Kỳ Trân Các bí kíp (packages/shared/src/items/books.ts): the original mật tịch sprites.
icons.set('\\spr\\item\\questkey\\obj_item_lection.spr', 'items/obj_item_lection');
icons.set('\\spr\\item\\questkey\\obj_item_lection02.spr', 'items/obj_item_lection02');
// Lệnh bài (packages/shared/src/items/token.ts): the original "Lệnh bài thông hành" sprite (questkey.txt).
icons.set('\\spr\\item\\questkey\\taskobj126.spr', 'items/taskobj126');
// Thổ Địa Phù vĩnh cửu (packages/shared/src/items/books.ts): townportal.txt sprite.
icons.set('\\spr\\item\\special\\obj_townportal.spr', 'items/obj_townportal');
// Vật phẩm Tống Kim (packages/shared/src/items/tongkim-items.ts): Chiến Cổ, Lệnh Bài, Hiệu Phù, Bí Bảo.
icons.set('\\spr\\item\\songjin\\wardrum.spr', 'items/tk-wardrum');
icons.set('\\spr\\item\\songjin\\token.spr', 'items/tk-token');
icons.set('\\spr\\item\\songjin\\clarion.spr', 'items/tk-clarion');
icons.set('\\spr\\item\\script\\songjinmibao.spr', 'items/tk-bibao');

console.log(`looks borrowed from ordinary pieces: ${fallbackLooks}`);
let written = 0;
for (const [gameFile, key] of icons) {
  const file = path.join(PUBLIC, `${key}.webp`);
  if (fs.existsSync(file)) continue;
  const src = resolveAny(gameFile);
  if (!src) continue;
  const f = decodeSpr(fs.readFileSync(src)).frames.find(fr => fr.w > 0);
  if (!f) continue;
  await sharp(Buffer.from(f.rgba), { raw: { width: f.w, height: f.h, channels: 4 } }).webp({ lossless: true }).toFile(file);
  written++;
}

fs.writeFileSync(OUT, `// Generated by apps/client/tools/gen-gold.ts from goldequip.txt + magicattrib_ge.txt (SHXT mod) + goldequipres.txt.
// Do not edit by hand.
/* eslint-disable */
import type { GenItem } from './items.gen.js';

/** Hoàng kim môn phái data of a row: suite 1–28, ngũ hành, six fixed lines [attribute, P1–P3 at quality 0, at quality 10]. */
export interface GoldData { suite: number; series: number; lines: [string, number[], number[]][] }

export const GEN_GOLD: (GenItem & { gold: GoldData })[] = [
${out.map(o => `  ${JSON.stringify(o)}`).join(',\n')}
];
`);
console.log(`gold.gen.ts: ${out.length} pieces, ${written} icons written`);
if (written) updateManifest(['items']);
