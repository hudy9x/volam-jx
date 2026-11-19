/**
 * Converts the original JX1 art the game uses into web assets, at the original resolution.
 *
 *   npm run gen:assets -w @vltk/client               incremental (existing sheets are kept)
 *   npm run gen:assets -w @vltk/client -- --force    re-encode everything
 *   JX_CLIENT=/path/to/jx-origin npm run gen:assets ...
 *
 * Source: jx-origin/data_extract (unpacked PAKs, see tools/jx/source.ts). Tables used:
 *   settings/npcres/人物类型.txt            -> part tables, action association, draw order per sex
 *   settings/npcres/{男,女}主角<part>.txt    -> part row x action column -> sprite file
 *   settings/npcres/普通npc资源.txt          -> monster / NPC action sprites
 *   settings/npcres/主角动作阴影对应表.txt     -> player shadow sprite per action column (MA/FM_YY_999_*, one set for every outfit)
 * Shadows (docs/shadows.md): players from the table above; monsters / NPCs use "<body sprite>b.spr" when it exists.
 * Most shadow files have no recovered name in the PAK index, so every sprite is looked up by name, then by path hash.
 *   settings/item/{armor,helm,meleeweapon,rangeweapon,amulet,ring,pendant,boot,belt,cuff}.txt (+ *res.txt), 004/mask.txt
 *     columns: 0 name, 1–3 genre / detail / particular type, 4 icon, 6–7 bag cells (w x h), 8 description, 10 price,
 *     11 level, 12 stackable, 13–33 seven base attributes (type, min, max), 34–45 six requirements (type, value);
 *     attribute ids -> names from the client exe (tools/jx/magicattr.ts)
 * Item visuals: the *res tables give a part id per item row (res row = item row + 2); the part table
 * row is part id - 2 (verified on weapons: every melee type, triền thủ -> "Tay không", ám khí -> "Ám khí",
 * and on horses: black series -> 004, Ô Vân Đạp Tuyết -> 006).
 *
 *   settings/item/004/horse.txt (+ horseres.txt) -> every horse of the original (one per name)
 *   settings/item/004/potion.txt -> thuốc: columns 0–12 as above, then five effects (attribute, value per pulse, time in
 *     game loops); one pulse every 10 loops, so value x time / 10 = total (matches "hồi phục 5000 điểm" of Cửu Chuyển…)
 *   settings/goods.txt + buysell.txt -> the original drug store list (buysell row DRUG_SHOP_ROW)
 * Outputs:
 *   public/assets/char/{man,woman}/<sprite>.webp   player layers, one sheet per sprite
 *   public/assets/npc/<res>/<sprite>.webp           monsters and NPCs (+ <sprite>b.webp shadows)
 *   public/assets/items/<icon>.webp                 item icons
 *   src/art/jx/data.gen.ts                          sheet layout, part tables, actions, draw order
 *   packages/shared/src/items/items.gen.ts            item catalog (levels 1–10)
 *   packages/shared/src/items/horses.gen.ts           horse catalog
 *   packages/shared/src/monsters/monsters.gen.ts      monster catalog (npcs.txt); art only for monsters in spawn files
 * Sheet layout: every frame sits in a cell of the sprite's union bounding box; one row per direction
 * (wrapped when wider than MAX_TEX). meta = [cell w, cell h, box x, box y, frames/dir, dirs, cols],
 * box x/y in the original 320x320 canvas.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { updateManifest } from './jx/manifest.ts';
import { CLIENT_ROOT, readGameFile, readTable, resolveFile, tcvn3 } from './jx/source.ts';
import { resolveAny } from './jx/hashindex.ts';
import { VERIFIED_MAX, readMagicAttribNames } from './jx/magicattr.ts';
import { decodeSpr, unionBox, type Spr } from './jx/spr.ts';
import { GEN_GOLD } from '../../../packages/shared/src/items/gold.gen.ts';
import { GOLDEN_BOSS_CONFIG } from '../../../packages/shared/src/bosses/config.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '..');
const PUBLIC = path.join(CLIENT, 'public/assets');
const CACHE_FILE = path.join(HERE, '.cache/assets-meta.json');
const FORCE = process.argv.includes('--force');
const MAX_TEX = 4096;
const CONCURRENCY = 8;

type Sx = 'm' | 'f';
type Meta = [number, number, number, number, number, number, number];

// ======================= sheet conversion =======================

const cache: Record<string, Meta> = fs.existsSync(CACHE_FILE) && !FORCE ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
const sheets: Record<string, Meta> = {};
const jobs = new Map<string, () => Promise<void>>();
let encodedBytes = 0, encodedCount = 0;
const missing: string[] = [];

/**
 * Queue one sprite -> sheet. Returns the asset key (path under public/assets without .webp) or null.
 * `optional`: a missing file is normal (shadows) and is not reported.
 */
function sheet(gameFile: string, key: string, optional = false, sprAnchor = false): string | null {
  if (sheets[key] || jobs.has(key)) return key;
  const out = path.join(PUBLIC, `${key}.webp`);
  // Separate cache version: old metadata discarded the SPR anchor.
  const cacheKey = sprAnchor ? `${key}:spr-anchor-v1` : key;
  if (cache[cacheKey] && fs.existsSync(out)) { sheets[key] = cache[cacheKey]; return key; }
  const file = resolveAny(gameFile);
  if (!file) { if (!optional) missing.push(gameFile); return null; }
  jobs.set(key, async () => {
    const spr = decodeSpr(fs.readFileSync(file));
    const meta = await writeSheet(spr, out, sprAnchor);
    sheets[key] = cache[cacheKey] = meta;
  });
  return key;
}

async function writeSheet(spr: Spr, out: string, sprAnchor = false): Promise<Meta> {
  const dirs = spr.directions;
  const per = Math.max(1, Math.floor(spr.frames.length / dirs));
  const box = unionBox(spr.frames.slice(0, per * dirs));
  const cols = Math.max(1, Math.min(per, Math.floor(MAX_TEX / box.w)));
  const rowsPerDir = Math.ceil(per / cols);
  const W = cols * box.w, H = dirs * rowsPerDir * box.h;
  if (H > MAX_TEX) console.warn(`  tall sheet ${path.basename(out)} ${W}x${H}`);
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
  const info = await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 4 }).toFile(out);
  encodedBytes += info.size;
  encodedCount++;
  // Compact NPC sprites use their own foot anchor, unlike the 320×320 paper-doll canvas.
  const bx = box.x + (sprAnchor ? 160 - spr.centerX : 0);
  const by = box.y + (sprAnchor ? 202 - spr.centerY : 0);
  return [box.w, box.h, bx, by, per, dirs, cols];
}

async function runJobs(): Promise<void> {
  const list = [...jobs.values()];
  jobs.clear();
  let next = 0, done = 0;
  const t0 = Date.now();
  const worker = async () => {
    while (next < list.length) {
      const job = list[next++];
      await job();
      if (++done % 200 === 0) {
        const rate = done / ((Date.now() - t0) / 1000);
        console.log(`  ${done}/${list.length} sheets, ${(encodedBytes / 2 ** 20).toFixed(0)} MB, ~${Math.round((list.length - done) / rate)} s left`);
        fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

// ======================= player paper-doll tables =======================

/** Part name in 人物类型.txt -> table column and draw-order id. */
const PARTS = [
  { name: 'Head', id: 0, slot: 'helm' }, { name: 'Hair', id: 1, slot: 'helm' },
  { name: 'Shoulder', id: 4, slot: 'armor' }, { name: 'Body', id: 5, slot: 'armor' },
  { name: 'LeftHand', id: 6, slot: 'armor' }, { name: 'RightHead', id: 7, slot: 'armor' },
  { name: 'LeftWeapon', id: 8, slot: 'weapon' }, { name: 'RightWeapon', id: 9, slot: 'weapon' },
  { name: 'HorseFront', id: 12, slot: 'horse' }, { name: 'HorseMiddle', id: 13, slot: 'horse' }, { name: 'HorseBack', id: 14, slot: 'horse' },
] as const;

/** Association columns we render (walking and sitting are not used by the game). The table spells JumpFly "JunpFly". */
const ASSOC_KEYS = {
  FightStand: 'stand', NormalStand1: 'idle', NormalStand2: 'idle2', FightRun: 'run', NormalRun: 'townRun',
  Wound: 'wound', Die: 'die', Attack1: 'attack1', Attack2: 'attack2', Magic: 'magic', JunpFly: 'jump', JumpFly: 'jump',
} as const;
type AssocKey = (typeof ASSOC_KEYS)[keyof typeof ASSOC_KEYS];

const types = readTable('\\settings\\npcres\\人物类型.txt');
const typeCol = (n: string) => types.header.indexOf(n);
const typeRow = (name: string) => types.rows.find(r => r[0].trim() === name);

/**
 * Player shadows: one row per character type, then per action column a file and a "frames,dirs,interval" cell. Its
 * action columns follow the part tables one for one (48 each), so the table also tells which part column an action
 * name means when the part tables spell it differently: the association and draw-order tables say "JumpFly", the
 * part tables "Jump". (Its own header repeats "MeleeWDie" where the part tables have "RangeWDie": go by position.)
 */
const shadowTable = readTable('\\settings\\npcres\\主角动作阴影对应表.txt');
const SHADOW_ACTIONS = shadowTable.header.filter((_, i) => i % 2 === 1);

interface SexTables {
  folder: string;
  /** Action column -> shadow file name (relative to the folder). */
  shadows: Record<string, string>;
  parts: Record<number, string[][]>;      // part id -> rows -> cells (col 0 = name)
  header: string[];                        // action columns of the part tables
  assoc: [string[][], string[][]];         // [on foot, mounted] rows -> cells
  assocHeader: string[];
  sort: Record<string, { dirs: (number[] | null)[]; lines: Record<number, number[]> }>;
}

function loadSex(charName: string): SexTables {
  const row = typeRow(charName)!;
  const folder = row[typeCol('ResFilePath')].trim().replace(/\\/g, '/');
  const parts: SexTables['parts'] = {};
  let header: string[] = [];
  for (const p of PARTS) {
    const t = readTable(`\\settings\\npcres\\${row[typeCol(p.name)].trim()}`);
    parts[p.id] = t.rows.map(r => r.map(c => c.trim()));
    if (p.name === 'Body') header = t.header;
  }
  const walk = readTable(`\\settings\\npcres\\${row[typeCol('WeaponActionTab1')].trim()}`);
  const ride = readTable(`\\settings\\npcres\\${row[typeCol('WeaponActionTab2')].trim()}`);
  const shadowRow = shadowTable.rows.find(r => r[0].trim() === charName);
  const shadows: Record<string, string> = {};
  if (shadowRow) header.slice(1).forEach((action, i) => { const f = shadowRow[1 + 2 * i]?.trim(); if (f) shadows[action] = f; });
  return {
    folder, shadows, parts, header,
    assoc: [walk.rows.map(r => r.map(c => c.trim())), ride.rows.map(r => r.map(c => c.trim()))],
    assocHeader: walk.header,
    sort: parseSort(readGameFile(`\\settings\\npcres\\${row[typeCol('ActionRenderOrderTab')].trim()}`).toString('latin1')),
  };
}

function parseSort(text: string): SexTables['sort'] {
  const out: SexTables['sort'] = {};
  let cur: SexTables['sort'][string] | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const sec = /^\[(.+)\]$/.exec(line);
    if (sec) { cur = out[sec[1]] = { dirs: [], lines: {} }; continue; }
    const kv = /^(Dir|Line)(\d+)=(.*)$/.exec(line);
    if (!cur || !kv) continue;
    const nums = kv[3].split(',').map(Number);
    if (kv[1] === 'Dir') cur.dirs[Number(kv[2]) - 1] = nums.slice(1);
    else cur.lines[nums[0]] = nums.slice(1);
  }
  return out;
}

const SEX: Record<Sx, SexTables> = { m: loadSex('MainMan'), f: loadSex('MainLady') };

/** Part-table column of an action name (see SHADOW_ACTIONS for the "JumpFly" / "Jump" spelling). */
function actionCol(T: SexTables, action: string): number {
  const c = T.header.indexOf(action);
  if (c >= 0) return c;
  const i = SHADOW_ACTIONS.indexOf(action);
  return i >= 0 ? i + 1 : -1;
}

// ======================= item catalog =======================

type ItemKind = 'armor' | 'helm' | 'melee' | 'range' | 'amulet' | 'ring' | 'pendant' | 'boot' | 'belt' | 'cuff' | 'mask' | 'potion';
/** Columns every equipment table shares (see the header comment). */
interface ItemColumns {
  price: number;
  size: [number, number];
  desc: string;
  base: [string, number, number][];
  req: [string, number][];
  stack?: boolean;
}
interface GenItem extends ItemColumns {
  id: string; kind: ItemKind; type: number; level: number; name: string; icon: string; sex?: Sx; look?: number; npc?: number;
  use?: [string, number, number][];
}

const ITEM_TABLES: { kind: ItemKind; file: string; res?: string; allLevels?: boolean }[] = [
  { kind: 'armor', file: 'armor', res: 'armorres' }, { kind: 'helm', file: 'helm', res: 'helmres' },
  { kind: 'melee', file: 'meleeweapon', res: 'meleeres' }, { kind: 'range', file: 'rangeweapon', res: 'rangeres' },
  { kind: 'amulet', file: 'amulet' }, { kind: 'ring', file: 'ring' }, { kind: 'pendant', file: 'pendant' },
  { kind: 'boot', file: 'boot' }, { kind: 'belt', file: 'belt' }, { kind: 'cuff', file: 'cuff' },
  // Mặt nạ: "wear it and look like an NPC" (first base value = the npcs.txt row of the look; not drawn yet).
  { kind: 'mask', file: '004\\mask', allLevels: true },
];
// Phi phong (004/mantle.txt), Ấn (signet.txt), Trang sức (shipin.txt) only hold placeholder rows (a copy of Sa Di phục,
// three cloaks with Chinese names) in this client; their real pieces are gold sets (TB11 / TB15).

const ATTR_NAMES = readMagicAttribNames(CLIENT_ROOT);
/** Attribute id -> name; ids above the verified range keep their number (tools/jx/magicattr.ts). */
const attrName = (id: number) => (id <= VERIFIED_MAX && ATTR_NAMES[id] ? ATTR_NAMES[id] : `attr${id}`);

/** Price, bag cells, description, base attributes and requirements of one equipment row. */
function itemColumns(r: string[]): ItemColumns {
  // parseInt: some cells carry a unit ("10%" on horses).
  const num = (c: number) => parseInt(r[c]?.trim() ?? '', 10);
  const base: [string, number, number][] = [];
  for (let c = 13; c <= 31; c += 3) if (Number.isFinite(num(c))) base.push([attrName(num(c)), num(c + 1) || 0, num(c + 2) || 0]);
  const req: [string, number][] = [];
  for (let c = 34; c <= 44; c += 2) if (Number.isFinite(num(c))) req.push([attrName(num(c)), num(c + 1) || 0]);
  return {
    price: num(10) || 0, size: [num(6) || 1, num(7) || 1], desc: tcvn3(r[8] ?? '').trim(), base, req,
    ...(num(12) === 1 ? { stack: true } : {}),
  };
}
/** Armor/helm types 0–6 are male outfits, 7–13 female; 14+ are duplicates / fashion sets we skip. */
const OUTFIT_TYPES = 14;

const items: GenItem[] = [];
const iconKeys = new Map<string, string>();
/**
 * Asset key of an item icon (game file -> items/<file name>). File names outside [a-z0-9_.-] (a few GBK names, e.g. the
 * mooncake) get a key from their hash so URLs stay plain.
 */
function iconKey(iconPath: string): string {
  let key = iconKeys.get(iconPath);
  if (!key) {
    const base = path.basename(iconPath.replace(/\\/g, '/'), '.spr').toLowerCase();
    key = `items/${/^[a-z0-9_.-]+$/.test(base) ? base : `x${[...iconPath].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(16)}`}`;
    iconKeys.set(iconPath, key);
  }
  return key;
}
const defaultLook = { armor: 0, helm: 0 };

for (const t of ITEM_TABLES) {
  const { rows } = readTable(`\\settings\\item\\${t.file}.txt`, 'latin1');
  const res = t.res ? new Map(readTable(`\\settings\\item\\${t.res}.txt`).rows.map(r => [Number(r[0]), Number(r[1])])) : null;
  if (res && (t.kind === 'armor' || t.kind === 'helm')) defaultLook[t.kind] = res.get(1)! - 2;
  rows.forEach((r, i) => {
    const level = Number(r[11]), type = Number(r[3]);
    if (!(level >= 1 && (t.allLevels || level <= 10)) || !r[0].trim()) return;
    if ((t.kind === 'armor' || t.kind === 'helm') && type >= OUTFIT_TYPES) return;
    const icon = iconKey(r[4].trim());
    const id = t.kind === 'mask' ? `mask-${i}` : `${t.kind}-${type}-${level}`;
    const item: GenItem = { id, kind: t.kind, type, level, name: tcvn3(r[0]).replace(/\s+/g, ' ').trim(), icon, ...itemColumns(r) };
    if (t.kind === 'armor' || t.kind === 'helm') item.sex = type < 7 ? 'm' : 'f';
    if (res) item.look = res.get(i + 2)! - 2;
    if (t.kind === 'mask') {
      // The look is the first base value, given without an attribute type.
      if (!r[13]?.trim() && Number(r[14]) > 0) item.npc = Number(r[14]);
    }
    items.push(item);
  });
}

// ======================= thuốc (potions) =======================

/** potion-<DetailType>-<level>: 0 Sinh lực, 1 Nội lực, 2 both, 3 Thể lực / food, 4 giải độc, 5–6 5-minute pills, 7–8 event / special. */
{
  const { rows } = readTable('\\settings\\item\\004\\potion.txt', 'latin1');
  const num = (r: string[], c: number) => parseInt(r[c]?.trim() ?? '', 10);
  for (const r of rows) {
    const level = num(r, 11), detail = num(r, 2);
    if (!r[0].trim() || !(level >= 1) || !Number.isFinite(detail)) continue;
    const use: [string, number, number][] = [];
    for (let c = 13; c + 2 <= 27; c += 3) if (Number.isFinite(num(r, c))) use.push([attrName(num(r, c)), num(r, c + 1) || 0, num(r, c + 2) || 0]);
    items.push({
      id: `potion-${detail}-${level}`, kind: 'potion', type: detail, level, name: tcvn3(r[0]).replace(/\s+/g, ' ').trim(),
      icon: iconKey(r[4].trim()), ...itemColumns(r), base: [], req: [], use,
    });
  }
}

/**
 * Hiệu thuốc: row of buysell.txt (one shop per row, cells = goods.txt rows: genre, detail, particular, series, level,
 * price…). Which NPC opens which row is decided by server scripts that are not in the client; row 53 is the full drug
 * store (Sinh lực, Nội lực, both and giải độc, levels 1–5; row 3 is the same without level 5).
 */
const DRUG_SHOP_ROW = 53;
const drugShop: string[] = [];
{
  const goods = readTable('\\settings\\goods.txt', 'latin1').rows;
  const row = readTable('\\settings\\buysell.txt', 'latin1').rows[DRUG_SHOP_ROW - 1] ?? [];
  for (const cell of row) {
    const g = goods[Number(cell) - 1];
    if (!cell.trim() || !g || Number(g[0]) !== 1) continue;
    const id = `potion-${Number(g[1])}-${Number(g[4])}`;
    if (items.some(it => it.id === id)) drugShop.push(id);
  }
}

// ======================= horses =======================

interface GenHorse extends ItemColumns { id: string; name: string; type: number; level: number; speedPct: number; icon: string; look: number }

/** One horse per name, in table order (later rows repeat names with other levels / time limits). */
const horses: GenHorse[] = [];
{
  const { rows } = readTable('\\settings\\item\\004\\horse.txt', 'latin1');
  // horseres: horse number (= table row + 2) -> horse part id; part table row = part id - 2.
  const res = new Map(readTable('\\settings\\item\\004\\horseres.txt').rows.map(r => [Number(r[0]), Number(r[1])]));
  // The newest mounts (Sư tử, Lạc đà…, rows past the end of horseres) use their icon number: horseNNN.spr ->
  // the part row drawing MA_HH_NNN.
  const hhRow = new Map<number, number>();
  SEX.m.parts[12].forEach((cells, row) => {
    const m = cells.map(c => /MA_HH_(\d+)_/i.exec(c)).find(Boolean);
    if (m && !hhRow.has(Number(m[1]))) hhRow.set(Number(m[1]), row);
  });
  const seen = new Set<string>();
  rows.forEach((r, i) => {
    const name = tcvn3(r[0]).trim();
    const part = res.get(i + 2);
    const iconNo = /horse(\d+)\.spr$/i.exec(r[4].trim());
    const look = part !== undefined ? part - 2 : iconNo ? hhRow.get(Number(iconNo[1])) ?? -1 : -1;
    if (!name || seen.has(name) || look < 0) return;
    seen.add(name);
    // Base attribute 111 = move speed in % ("10%").
    let speedPct = 0;
    for (let c = 13; c + 2 < r.length && c < 34; c += 3) if (r[c].trim() === '111') speedPct = parseInt(r[c + 1], 10) || 0;
    const icon = iconKey(r[4].trim());
    horses.push({ id: `horse-${i}`, name, type: Number(r[3]), level: Number(r[11]) || 1, speedPct, icon, look, ...itemColumns(r) });
  });
}

// ======================= which rows / actions are needed =======================

const need: Record<Sx, { armor: Set<number>; helm: Set<number>; weapon: Set<number>; horse: Set<number> }> = {
  m: { armor: new Set([defaultLook.armor]), helm: new Set([defaultLook.helm]), weapon: new Set([0]), horse: new Set() },
  f: { armor: new Set([defaultLook.armor]), helm: new Set([defaultLook.helm]), weapon: new Set([0]), horse: new Set() },
};
for (const it of items) {
  for (const sx of ['m', 'f'] as Sx[]) {
    if (it.look === undefined || (it.sex && it.sex !== sx)) continue;
    if (it.kind === 'armor') need[sx].armor.add(it.look);
    else if (it.kind === 'helm') need[sx].helm.add(it.look);
    else if (it.kind === 'melee' || it.kind === 'range') need[sx].weapon.add(it.look);
  }
}
for (const h of horses) { need.m.horse.add(h.look); need.f.horse.add(h.look); }
// Hoàng kim môn phái pieces (gold.gen.ts, gen:gold) draw their own rows (TB14): the sex from requiresex when they have one.
for (const g of GEN_GOLD) {
  if (g.look === undefined) continue;
  const sexReq = g.req.find(([n]) => n === 'requiresex')?.[1];
  for (const sx of (sexReq === undefined ? ['m', 'f'] : [sexReq ? 'f' : 'm']) as Sx[]) {
    if (g.kind === 'armor') need[sx].armor.add(g.look);
    else if (g.kind === 'helm') need[sx].helm.add(g.look);
    else if (g.kind === 'melee' || g.kind === 'range') need[sx].weapon.add(g.look);
  }
}

const out = {
  parts: { m: {}, f: {} } as Record<Sx, Record<number, Record<number, Record<string, string>>>>,
  assoc: { m: {}, f: {} } as Record<Sx, Record<number, [Partial<Record<AssocKey, string>>, Partial<Record<AssocKey, string>>]>>,
  sort: { m: {}, f: {} } as Record<Sx, Record<string, { dirs: (number[] | null)[]; lines: Record<number, number[]> }>>,
  shadows: { m: {}, f: {} } as Record<Sx, Record<string, string>>,
  weaponNames: {} as Record<number, string>,
};

for (const sx of ['m', 'f'] as Sx[]) {
  const T = SEX[sx];
  const actions = new Set<string>();
  for (const w of need[sx].weapon) {
    const pair = T.assoc.map(rows => {
      const row = rows[w];
      const set: Partial<Record<AssocKey, string>> = {};
      if (!row) return set;
      T.assocHeader.forEach((h, c) => {
        const key = ASSOC_KEYS[h as keyof typeof ASSOC_KEYS];
        if (key && row[c]) { set[key] = row[c]; actions.add(row[c]); }
      });
      return set;
    }) as [Partial<Record<AssocKey, string>>, Partial<Record<AssocKey, string>>];
    out.assoc[sx][w] = pair;
    if (sx === 'm') out.weaponNames[w] = tcvn3(Buffer.from(T.assoc[0][w]?.[0] ?? '', 'latin1').toString('latin1'));
  }
  const otherFolder = sx === 'm' ? SEX.f.folder : SEX.m.folder;
  for (const p of PARTS) {
    const rows = need[sx][p.slot];
    for (const r of rows) {
      const cells = T.parts[p.id][r];
      if (!cells) { console.warn(`  ${sx} ${p.name} row ${r} missing`); continue; }
      for (const action of actions) {
        const col = actionCol(T, action);
        const file = col > 0 ? cells[col] : '';
        if (!file || !/\.spr$/i.test(file)) continue;
        // Cells are file names relative to the sex folder; female horses use "..\man\MA_HH_...".
        let key: string | null = null;
        for (const folder of [T.folder, otherFolder]) {
          const full = path.posix.normalize(`${folder}/${file.replace(/\\/g, '/')}`);
          const gameFile = `\\${full.replace(/\//g, '\\')}`;
          // Own folder: by name, then by path hash (unnamed files, e.g. the jump sprites); the other sex's folder only
          // by name, as before (a hash hit there would be a sprite the original never loads for this sex).
          if (!(folder === T.folder ? resolveAny(gameFile) : resolveFile(gameFile))) continue;
          const dir = path.posix.basename(path.posix.dirname(full));
          key = sheet(gameFile, `char/${dir}/${path.posix.basename(full).toLowerCase().replace(/\.spr$/, '')}`);
          break;
        }
        if (!key) { missing.push(`${sx} ${p.name}[${r}] ${action} ${file}`); continue; }
        ((out.parts[sx][p.id] ??= {})[r] ??= {})[action] = key;
      }
    }
  }
  out.sort[sx].DEFAULT = T.sort.DEFAULT;
  for (const a of actions) if (T.sort[a]) out.sort[sx][a] = T.sort[a];
  // Shadows: one sheet per action column, shared by every outfit (MA_YY_999_* / FM_YY_999_*).
  const dir = path.posix.basename(T.folder);
  for (const action of actions) {
    const col = actionCol(T, action);
    const file = col > 0 ? T.shadows[T.header[col]] : undefined;
    if (!file) continue;
    const key = sheet(`\\${T.folder.replace(/\//g, '\\')}\\${file}`, `char/${dir}/${file.toLowerCase().replace(/\.spr$/, '')}`);
    if (key) out.shadows[sx][action] = key;
  }
}

// ======================= monsters and NPCs =======================

// Monster catalog: every fighting NPC (npcs.txt Kind 0) whose sprite exists. id = npcs.txt row.
interface GenMonster {
  id: number; name: string; sprite: string; series: number; skills: [number, number, number][];
  speed: number; vision: number; active: number; hitRecover: number; boss?: boolean;
}
const monsters: GenMonster[] = [];
{
  const t = readTable('\\settings\\npcs.txt', 'latin1');
  const c = (n: string) => t.header.indexOf(n);
  const resTable = readTable('\\settings\\npcres\\普通npc资源.txt');
  const standCol = resTable.header.indexOf('FightStand');
  const hasArt = new Map<string, boolean>();
  t.rows.forEach((r, id) => {
    if (r[c('Kind')]?.trim() !== '0') return;
    const sprite = r[c('NpcResType')]?.trim();
    if (!sprite) return;
    if (!hasArt.has(sprite)) {
      const row = resTable.rows.find(x => x[0].trim() === sprite);
      const folder = typeRow(sprite)?.[typeCol('ResFilePath')].trim();
      hasArt.set(sprite, !!row && !!folder && !!resolveFile(`\\${folder}\\${row[standCol]?.trim()}`));
    }
    if (!hasArt.get(sprite)) return;
    const name = tcvn3(r[0]).replace(/\s+/g, ' ').trim();
    const skills: [number, number, number][] = [];
    for (let k = 1; k <= 4; k++) {
      const sk = Number(r[c(`Skill${k}`)]);
      const [base, per] = (r[c(`Level${k}`)] ?? '').split('|').map(Number);
      if (sk > 0 && !skills.some(s => s[0] === sk)) skills.push([sk, base || 1, per || 0]);
    }
    const script = (r[c('LevelScript')] ?? '').trim().toLowerCase();
    monsters.push({
      id, name, sprite, series: Number(r[c('Series')]) || 0, skills,
      speed: Number(r[c('RunSpeed')]) || 0, vision: Number(r[c('VisionRadius')]) || 400, active: Number(r[c('ActiveRadius')]) || 700,
      hitRecover: Number(r[c('HitRecover')]) || 0,
      ...(/^boss/i.test(name) || script.endsWith('makeboss.lua') ? { boss: true } : {}),
    });
  });
}

/** Monsters placed in packages/shared/spawns/*.json (tools/gen-spawns.ts or the dev tool) get their art. */
const SPAWN_DIR = path.resolve(CLIENT, '../../packages/shared/spawns');
const spawnRes = new Set<string>();
if (fs.existsSync(SPAWN_DIR)) {
  const byId = new Map(monsters.map(m => [m.id, m.sprite]));
  for (const f of fs.readdirSync(SPAWN_DIR).filter(f => f.endsWith('.json'))) {
    const file = JSON.parse(fs.readFileSync(path.join(SPAWN_DIR, f), 'utf8'));
    for (const z of file.zones ?? []) for (const [id] of z.monsters ?? []) { const res = byId.get(id); if (res) spawnRes.add(res); }
    for (const fx of file.fixed ?? []) { const res = byId.get(fx.monster); if (res) spawnRes.add(res); }
  }
}

/** NPC res name -> what the game uses it for: town NPCs, the hand-made monsters, Golden Bosses, everything in a spawn file. */
const NPC_RES = [...new Set([
  'ani049', 'ani052', 'ani056', 'ani061', 'passerby004_1', 'passerby040_1', 'passerby037_1', 'passerby007', 'passerby023', 'passerby198', 'passerby004_4', 'passerby037_4', 'passerby040_4', 'enemy178',
  ...GOLDEN_BOSS_CONFIG.bosses.map(b => b.sprite),
  ...spawnRes,
])];
const NPC_KEYS = { FightStand: 'stand', NormalStand1: 'idle', FightRun: 'run', Wound: 'wound', Die: 'die', Attack1: 'attack1', Magic: 'magic' } as const;
const npcTable = readTable('\\settings\\npcres\\普通npc资源.txt');
const npcs: Record<string, Partial<Record<(typeof NPC_KEYS)[keyof typeof NPC_KEYS], string>>> = {};
/** Shadow sheet per body sheet (engine: body sprite name + "b.spr"; many sprites have none, then nothing is drawn). */
const npcShadows: Record<string, string> = {};
// Đường Phong uses compact SPR canvases with per-action foot anchors.
// Keep legacy canvas coordinates for other resources until their source anchors are verified.
for (const res of NPC_RES) {
  const row = npcTable.rows.find(r => r[0].trim() === res);
  const folder = typeRow(res)?.[typeCol('ResFilePath')].trim();
  if (!row || !folder) { console.warn(`  npc ${res} not found`); continue; }
  const set: (typeof npcs)[string] = {};
  npcTable.header.forEach((h, c) => {
    const key = NPC_KEYS[h as keyof typeof NPC_KEYS];
    const file = row[c]?.trim();
    if (!key || !file) return;
    const k = sheet(`\\${folder}\\${file}`, `npc/${res}/${file.toLowerCase().replace(/\.spr$/, '')}`, false, res === 'enemy157');
    if (!k) return;
    set[key] = k;
    const shadowFile = file.replace(/\.spr$/i, 'b.spr');
    const sk = sheet(`\\${folder}\\${shadowFile}`, `${k}b`, true, res === 'enemy157');
    if (sk) npcShadows[k] = sk;
  });
  npcs[res] = set;
}

// ======================= icons =======================

async function writeIcons(): Promise<void> {
  let count = 0;
  for (const [gameFile, key] of iconKeys) {
    const out = path.join(PUBLIC, `${key}.webp`);
    if (fs.existsSync(out) && !FORCE) continue;
    const file = resolveAny(gameFile);
    if (!file) { missing.push(gameFile); continue; }
    const spr = decodeSpr(fs.readFileSync(file));
    const f = spr.frames.find(fr => fr.w > 0);
    if (!f) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(Buffer.from(f.rgba), { raw: { width: f.w, height: f.h, channels: 4 } }).webp({ lossless: true }).toFile(out);
    count++;
  }
  console.log(`icons: ${count} written (${iconKeys.size} total)`);
}

// ======================= run =======================

const t0 = Date.now();
console.log(`client: ${path.relative(process.cwd(), types.rows.length ? CLIENT : '')}`);
console.log(`items: ${items.length}, sheets queued: ${jobs.size} new, ${Object.keys(sheets).length} cached`);
await runJobs();
await writeIcons();

// Foot point: the original engine anchors 320x320 character canvases at (160, 202).
const FOOT = [160, 202];
const usedSheets = Object.fromEntries(Object.entries(sheets).sort(([a], [b]) => a.localeCompare(b)));
const ts = `// Generated by tools/gen-assets.ts from the original client tables. Do not edit by hand.
/* eslint-disable */
export type Sx = 'm' | 'f';
export type AssocKey = ${Object.values(ASSOC_KEYS).map(k => `'${k}'`).join(' | ')};
export type NpcAction = ${Object.values(NPC_KEYS).map(k => `'${k}'`).join(' | ')};

/** Feet position inside the original 320x320 canvas. */
export const JX_FOOT = ${JSON.stringify(FOOT)} as const;

/** Default (nothing equipped) rows of the armor and helm part tables. */
export const JX_DEFAULT_LOOK = ${JSON.stringify(defaultLook)} as const;

/** asset key (public/assets/<key>.webp) -> [cell w, cell h, box x, box y, frames per direction, directions, columns] */
export const JX_SHEETS: Record<string, readonly number[]> = ${JSON.stringify(usedSheets)};

/** sex -> draw-order part id -> table row -> action column -> asset key */
export const JX_PARTS: Record<Sx, Record<number, Record<number, Record<string, string>>>> = ${JSON.stringify(out.parts)};

/** sex -> weapon row -> [on foot, mounted] game action -> action column */
export const JX_ASSOC: Record<Sx, Record<number, [Partial<Record<AssocKey, string>>, Partial<Record<AssocKey, string>>]>> = ${JSON.stringify(out.assoc)};

/** sex -> action column (or DEFAULT) -> back-to-front part ids per direction (Dir1..), and per-frame overrides */
export const JX_SORT: Record<Sx, Record<string, { dirs: (number[] | null)[]; lines: Record<number, number[]> }>> = ${JSON.stringify(out.sort)};

/** NPC res -> action -> asset key */
export const NPC_SHEETS: Record<string, Partial<Record<NpcAction, string>>> = ${JSON.stringify(npcs)};

/** sex -> action column -> player shadow sheet (主角动作阴影对应表.txt; the same for every outfit and horse) */
export const JX_SHADOWS: Record<Sx, Record<string, string>> = ${JSON.stringify(out.shadows)};

/** monster / NPC body sheet -> its shadow sheet ("<sprite>b.spr"); absent = the original draws no shadow */
export const NPC_SHADOWS: Record<string, string> = ${JSON.stringify(Object.fromEntries(Object.entries(npcShadows).sort(([a], [b]) => a.localeCompare(b))))};
`;
fs.writeFileSync(path.join(CLIENT, 'src/art/jx/data.gen.ts'), ts);

const itemGroups: [string, GenItem[]][] = [
  ['EQUIPMENT', items.filter(it => it.kind !== 'mask' && it.kind !== 'potion')],
  ['MASKS', items.filter(it => it.kind === 'mask')],
  ['POTIONS', items.filter(it => it.kind === 'potion')],
];
const itemsTs = `// Generated by apps/client/tools/gen-assets.ts from the original item tables (levels 1–10, masks, potions). Do not edit by hand.
/* eslint-disable */
import type { ItemKind } from './items.js';

/** Columns every original equipment table has (armor.txt … mask.txt, horse.txt). */
export interface ItemColumns {
  /** Price in the original table (lượng): what the NPC shops charge. */
  price: number;
  /** Cells the item takes in the original bag: [width, height]. */
  size: [number, number];
  /** Description text of the table. */
  desc: string;
  /** Base attributes: [magic attribute name, min, max]; the value is rolled when an item is made. */
  base: [string, number, number][];
  /** Requirements: [magic attribute name, value] (requirelevel, requirestr, requiredex, requiresex, requireseries, requiremenpai). */
  req: [string, number][];
  /** Stacks in the bag. */
  stack?: boolean;
}

export interface GenItem extends ItemColumns {
  id: string;
  kind: ItemKind;
  /** ParticularType in the original table. */
  type: number;
  level: number;
  name: string;
  /** Icon asset key (public/assets/<icon>.webp). */
  icon: string;
  /** Outfit restricted to one sex. */
  sex?: 'm' | 'f';
  /** Part-table row of the visual (armor / helm / weapon). */
  look?: number;
  /** Mask: npcs.txt row of the look it gives (not drawn yet). */
  npc?: number;
  /**
   * Thuốc: effects [magic attribute name, value per pulse, time in original game loops]; one pulse every 10 loops
   * (lifepotion_v / manapotion_v: Sinh lực / Nội lực; others: Thể lực, giải độc, 5-minute pills…).
   */
  use?: [string, number, number][];
}

// One array per group: a single literal of every row is too big for the type checker (TS2590).
${itemGroups.map(([name, list]) => `const ${name}: GenItem[] = [\n${list.map(it => `  ${JSON.stringify(it)}`).join(',\n')}\n];`).join('\n\n')}

export const GEN_ITEMS: GenItem[] = [${itemGroups.map(([name]) => `...${name}`).join(', ')}];

/** Hiệu thuốc of the original (settings/buysell.txt row ${DRUG_SHOP_ROW}): potion ids in shop order. */
export const GEN_DRUG_SHOP: string[] = ${JSON.stringify(drugShop)};

/** Rows used when nothing is equipped. */
export const DEFAULT_LOOK = ${JSON.stringify({ ...defaultLook, weapon: 0 })} as const;
`;
fs.writeFileSync(path.resolve(CLIENT, '../../packages/shared/src/items/items.gen.ts'), itemsTs);

const horsesTs = `// Generated by apps/client/tools/gen-assets.ts from settings/item/004/horse.txt. Do not edit by hand.
/* eslint-disable */
import type { ItemColumns } from './items.gen.js';

export interface GenHorse extends ItemColumns {
  /** horse-<row in horse.txt>. */
  id: string;
  name: string;
  /** ParticularType. */
  type: number;
  level: number;
  /** Base attribute 111 (fastwalkrun_p): move speed +%. */
  speedPct: number;
  /** Icon asset key (public/assets/<icon>.webp). */
  icon: string;
  /** Row of the horse part tables (马前/马中/马后) = horse part id - 2. */
  look: number;
}

export const GEN_HORSES: GenHorse[] = ${JSON.stringify(horses, null, 0).replace(/\},\{/g, '},\n  {')};
`;
fs.writeFileSync(path.resolve(CLIENT, '../../packages/shared/src/items/horses.gen.ts'), horsesTs);

const monstersTs = `// Generated by apps/client/tools/gen-assets.ts from settings/npcs.txt (Kind 0 with art). Do not edit by hand.
/* eslint-disable */
export interface GenMonster {
  /** Row of npcs.txt. */
  id: number;
  name: string;
  /** NpcResType (assets/npc/<sprite>, exported when a spawn file uses the monster). */
  sprite: string;
  /** Ngũ hành: 0 Kim, 1 Mộc, 2 Thủy, 3 Hỏa, 4 Thổ. */
  series: number;
  /** [skill id, level base, level per monster level] (Skill1–4 / Level1–4 "base|per"). */
  skills: [number, number, number][];
  /** RunSpeed (original units), VisionRadius, ActiveRadius, HitRecover. */
  speed: number;
  vision: number;
  active: number;
  hitRecover: number;
  /** Named boss (name "Boss …" or makeboss.lua). */
  boss?: boolean;
}

export const GEN_MONSTERS: GenMonster[] = [
${monsters.map(m => `  ${JSON.stringify(m)}`).join(',\n')}
];
`;
fs.writeFileSync(path.resolve(CLIENT, '../../packages/shared/src/monsters/monsters.gen.ts'), monstersTs);

const total = Object.keys(usedSheets).reduce((n, k) => n + (fs.existsSync(path.join(PUBLIC, `${k}.webp`)) ? fs.statSync(path.join(PUBLIC, `${k}.webp`)).size : 0), 0);
console.log(`sheets: ${Object.keys(usedSheets).length} (${encodedCount} encoded now), ${(total / 2 ** 20).toFixed(0)} MB on disk`);
const shadowCount = Object.keys(out.shadows.m).length + Object.keys(out.shadows.f).length;
console.log(`shadows: players ${shadowCount} actions, NPC ${Object.keys(npcShadows).length}/${Object.values(npcs).reduce((n, s) => n + new Set(Object.values(s)).size, 0)} body sheets`);
console.log(`data: ${(ts.length / 1024).toFixed(0)} KB -> src/art/jx/data.gen.ts; items: ${items.length}, horses: ${horses.length} (${new Set(horses.map(h => h.look)).size} looks), monsters: ${monsters.length} (${spawnRes.size} res in spawn files) -> packages/shared/src/{items,monsters}`);
if (missing.length) {
  // Missing references are normal in the original data (the engine skips them); summarise per part.
  const groups = new Map<string, number>();
  for (const m of new Set(missing)) {
    const key = /^[mf] \w+/.exec(m)?.[0] ?? m.split('\\').slice(0, 4).join('\\');
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  console.log(`missing references (${missing.length}): ${[...groups].map(([k, n]) => `${k}: ${n}`).join(', ')}`);
}
updateManifest(['char', 'npc', 'items']);
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
