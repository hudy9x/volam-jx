/**
 * Trích xuất sprite vật phẩm & tiền rơi trên mặt đất từ bảng gốc (`objdata.txt`, `moneyobj.txt`, cột ObjID của các bảng item).
 *
 *   JX_CLIENT=/path/to/client npm run gen:ground-objs -w @vltk/client
 *
 * Output:
 *   - apps/client/public/assets/obj-items/<name>.webp
 *   - packages/shared/src/items/ground-objs.gen.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { readGameFile, readTable, resolveFile } from './jx/source.ts';
import { decodeSpr } from './jx/spr.ts';
import { updateManifest } from './jx/manifest.ts';
import { GEN_GOLD } from '../../../packages/shared/src/items/gold.gen.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '..');
const OUT_ASSETS = path.join(CLIENT, 'public/assets/obj-items');
const OUT_TS = path.resolve(CLIENT, '../../packages/shared/src/items/ground-objs.gen.ts');

const objTbl = readTable('\\settings\\obj\\objdata.txt');
const idxImg = objTbl.header.indexOf('ImageName');
const objById = new Map<number, string>();
for (const r of objTbl.rows) {
  const id = parseInt(r[1]?.trim() ?? '', 10);
  const img = r[idxImg >= 0 ? idxImg : 4]?.trim();
  if (Number.isFinite(id) && img) objById.set(id, img);
}

const spriteKeys = new Map<string, string>();
const usedSprPaths = new Map<string, string>(); // key -> game path

function registerSpr(gameSprPath: string | undefined): string | null {
  if (!gameSprPath) return null;
  const norm = gameSprPath.trim().replace(/\//g, '\\').toLowerCase();
  if (!norm || !resolveFile(norm)) return null;
  let key = spriteKeys.get(norm);
  if (!key) {
    const base = path.basename(norm.replace(/\\/g, '/'), '.spr').replace(/[^a-z0-9_.-]/g, '_');
    key = `obj-items/${base}`;
    // Tránh trùng tên file ở các thư mục khác nhau
    if (usedSprPaths.has(key) && usedSprPaths.get(key) !== norm) {
      const hash = [...norm].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16);
      key = `obj-items/${base}_${hash}`;
    }
    spriteKeys.set(norm, key);
    usedSprPaths.set(key, norm);
  }
  return key;
}

const itemToSprite: Record<string, string> = {};

// 1. Trang bị thường & mặt nạ
const ITEM_TABLES: { kind: string; file: string; allLevels?: boolean }[] = [
  { kind: 'armor', file: 'armor' },
  { kind: 'helm', file: 'helm' },
  { kind: 'melee', file: 'meleeweapon' },
  { kind: 'range', file: 'rangeweapon' },
  { kind: 'amulet', file: 'amulet' },
  { kind: 'ring', file: 'ring' },
  { kind: 'pendant', file: 'pendant' },
  { kind: 'boot', file: 'boot' },
  { kind: 'belt', file: 'belt' },
  { kind: 'cuff', file: 'cuff' },
  { kind: 'mask', file: '004\\mask', allLevels: true },
];
const OUTFIT_TYPES = 14;

for (const t of ITEM_TABLES) {
  const { rows } = readTable(`\\settings\\item\\${t.file}.txt`, 'latin1');
  rows.forEach((r, i) => {
    const level = Number(r[11]);
    const type = Number(r[3]);
    if (!(level >= 1 && (t.allLevels || level <= 10)) || !r[0]?.trim()) return;
    if ((t.kind === 'armor' || t.kind === 'helm') && type >= OUTFIT_TYPES) return;
    const objId = parseInt(r[5]?.trim() ?? '', 10);
    const key = registerSpr(objById.get(objId));
    if (!key) return;
    const id = t.kind === 'mask' ? `mask-${i}` : `${t.kind}-${type}-${level}`;
    itemToSprite[id] = key;
  });
}

// 2. Thuốc (potions)
{
  const { rows } = readTable('\\settings\\item\\004\\potion.txt', 'latin1');
  for (const r of rows) {
    const level = parseInt(r[11]?.trim() ?? '', 10);
    const detail = parseInt(r[2]?.trim() ?? '', 10);
    if (!r[0]?.trim() || !(level >= 1) || !Number.isFinite(detail)) continue;
    const key = registerSpr(objById.get(parseInt(r[5]?.trim() ?? '', 10)));
    if (key) itemToSprite[`potion-${detail}-${level}`] = key;
  }
}

// 3. Hoàng kim môn phái (GEN_GOLD)
{
  const goldFile = resolveFile('\\settings\\item\\004\\goldequip.txt')
    ? '\\settings\\item\\004\\goldequip.txt'
    : '\\settings\\item\\goldequip.txt';
  const { rows } = readTable(goldFile, 'latin1');
  for (const g of GEN_GOLD) {
    const rowIdx = Number(g.id.replace('gold-', '')) - 1;
    const r = rows[rowIdx];
    if (!r) continue;
    const key = registerSpr(objById.get(parseInt(r[5]?.trim() ?? '', 10)));
    if (key) itemToSprite[g.id] = key;
  }
}

// 4. Vật phẩm đặc biệt (bí kíp, lệnh bài, thổ địa phù)
{
  const { rows: questRows } = readTable('\\settings\\item\\questkey.txt', 'latin1');
  const questSpr = registerSpr(objById.get(parseInt(questRows[0]?.[5]?.trim() ?? '', 10)));
  if (questSpr) {
    for (const id of ['book-90', 'book-120', 'book-150', 'book-max-90', 'book-max-120', 'book-max-150', 'token-entry']) {
      itemToSprite[id] = questSpr;
    }
  }
  const { rows: tpRows } = readTable('\\settings\\item\\004\\townportal.txt', 'latin1');
  const tpSpr = registerSpr(objById.get(parseInt(tpRows[0]?.[5]?.trim() ?? '', 10)));
  if (tpSpr) itemToSprite['town-portal'] = tpSpr;
}

// 5. Tiền rơi trên đất (moneyobj.txt)
const moneyObjs: { maxAmount: number; sprite: string }[] = [];
{
  const { rows } = readTable('\\settings\\obj\\moneyobj.txt', 'latin1');
  for (const r of rows) {
    const maxAmount = parseInt(r[0]?.trim() ?? '', 10);
    const objId = parseInt(r[1]?.trim() ?? '', 10);
    const key = registerSpr(objById.get(objId));
    if (Number.isFinite(maxAmount) && key) moneyObjs.push({ maxAmount, sprite: key });
  }
  moneyObjs.sort((a, b) => a.maxAmount - b.maxAmount);
}

// Giải mã SPR -> WebP lossless vào public/assets/obj-items/
fs.mkdirSync(OUT_ASSETS, { recursive: true });
let written = 0;
for (const [key, gameSpr] of usedSprPaths) {
  const name = key.slice('obj-items/'.length);
  const outFile = path.join(OUT_ASSETS, `${name}.webp`);
  if (fs.existsSync(outFile)) continue;
  const f = decodeSpr(readGameFile(gameSpr)).frames.find(fr => fr.w > 0);
  if (!f) continue;
  await sharp(Buffer.from(f.rgba), { raw: { width: f.w, height: f.h, channels: 4 } }).webp({ lossless: true }).toFile(outFile);
  written++;
}

// Nén bảng lookup thành mảng sprite + index để file .gen.ts nhỏ gọn
const spriteList = [...usedSprPaths.keys()];
const spriteIdx = new Map(spriteList.map((s, i) => [s, i]));
const indexedItems: Record<string, number> = {};
for (const [id, spr] of Object.entries(itemToSprite)) {
  const idx = spriteIdx.get(spr);
  if (idx !== undefined) indexedItems[id] = idx;
}

const ts = `// Generated by apps/client/tools/gen-ground-objs.ts from settings/obj/{objdata,moneyobj}.txt. Do not edit by hand.
/* eslint-disable */

export const GROUND_OBJ_SPRITES: readonly string[] = ${JSON.stringify(spriteList)};

export const GROUND_OBJ_BY_ITEM: Record<string, number> = ${JSON.stringify(indexedItems)};

export const GROUND_MONEY_OBJS: readonly { maxAmount: number; sprite: string }[] = ${JSON.stringify(moneyObjs)};

/** Trả về đường dẫn sprite rơi trên mặt đất (không có đuôi .webp) cho vật phẩm hoặc tiền. */
export function groundObjSprite(defId: string, amount = 0): string | undefined {
  if (defId === 'money') {
    for (const m of GROUND_MONEY_OBJS) {
      if (amount <= m.maxAmount) return m.sprite;
    }
    return GROUND_MONEY_OBJS[GROUND_MONEY_OBJS.length - 1]?.sprite;
  }
  const idx = GROUND_OBJ_BY_ITEM[defId];
  return idx !== undefined ? GROUND_OBJ_SPRITES[idx] : undefined;
}
`;

fs.writeFileSync(OUT_TS, ts, 'utf8');
if (written > 0) updateManifest(['obj-items']);
console.log(`ground-objs.gen.ts: ${Object.keys(indexedItems).length} items, ${moneyObjs.length} money tiers, ${spriteList.length} sprites (${written} written)`);
