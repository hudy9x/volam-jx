// Items: the rows of the original item tables (items.gen.ts: equipment levels 1–10, masks, potions; horses.gen.ts) are
// item *definitions*; what players carry are concrete `Item`s made from a row, with their own rolled values (TB1).
// Wearing rules: equip.ts; using (thuốc): potions.ts; money and NPC shops: shops.ts; tooltips: describe.ts; paper-doll
// rows and starter outfits: characters/look.ts, characters/starter.ts.
import { DEFAULT_LOOK, GEN_ITEMS, type GenItem } from './items.gen.js';
import { GEN_HORSES } from './horses.gen.js';
import { GEN_GOLD, type GoldData } from './gold.gen.js';
import { BOOK_ITEMS, CANKHON_RING, TOKEN_ITEM, TOWN_PORTAL_ITEM, type BookEffect } from './books.js';
import type { Gender } from '../characters/factions.js';
import type { MagicLine } from './magic.js';

export type ItemKind =
  | 'armor' | 'helm' | 'melee' | 'range' | 'amulet' | 'ring' | 'pendant' | 'boot' | 'belt' | 'cuff' | 'horse'
  | 'mask' | 'mantle' | 'signet' | 'ornament' | 'potion' | 'book' | 'token' | 'portal';
export type EquipSlot =
  | 'helm' | 'amulet' | 'armor' | 'weapon' | 'ring1' | 'ring2' | 'pendant' | 'belt' | 'cuff' | 'boot' | 'horse'
  | 'mask' | 'mantle' | 'signet' | 'ornament';

/**
 * Worn-item slots. Mặt nạ, Phi phong, Ấn, Trang sức are the newer slots of the original (17 in the engine with the
 * hidden ones); Phi phong / Ấn / Trang sức have no ordinary items in this client (placeholder rows only) — their real
 * pieces come with the gold sets (TB11 / TB15). JX1 has no trousers slot: the armor is the whole outfit.
 */
export const SLOT_NAMES: Record<EquipSlot, string> = {
  helm: 'Mũ', amulet: 'Dây chuyền', armor: 'Áo', weapon: 'Vũ khí', ring1: 'Nhẫn trên', ring2: 'Nhẫn dưới',
  pendant: 'Ngọc bội', belt: 'Đai lưng', cuff: 'Bao tay', boot: 'Giày', horse: 'Ngựa',
  mask: 'Mặt nạ', mantle: 'Phi phong', signet: 'Ấn', ornament: 'Trang sức',
};
export const KIND_NAMES: Record<ItemKind, string> = {
  armor: 'Áo', helm: 'Mũ', melee: 'Vũ khí', range: 'Ám khí', amulet: 'Dây chuyền', ring: 'Nhẫn',
  pendant: 'Ngọc bội', boot: 'Giày', belt: 'Đai lưng', cuff: 'Bao tay', horse: 'Ngựa',
  mask: 'Mặt nạ', mantle: 'Phi phong', signet: 'Ấn', ornament: 'Trang sức', potion: 'Dược phẩm', book: 'Bí kíp', token: 'Lệnh bài', portal: 'Bùa',
};
/** Slots an item kind can go into (rings: upper first); none = not worn (thuốc). */
export const KIND_SLOTS: Record<ItemKind, EquipSlot[]> = {
  armor: ['armor'], helm: ['helm'], melee: ['weapon'], range: ['weapon'], amulet: ['amulet'], ring: ['ring1', 'ring2'],
  pendant: ['pendant'], boot: ['boot'], belt: ['belt'], cuff: ['cuff'], horse: ['horse'],
  mask: ['mask'], mantle: ['mantle'], signet: ['signet'], ornament: ['ornament'], potion: [], book: [], token: [], portal: [],
};

/** One row of an original item table. */
/** One row of an original item table; hoàng kim môn phái rows carry their set data (`gold`, gold.gen.ts). */
export type ItemDef = GenItem & {
  gold?: GoldData;
  book?: BookEffect;
  /** Fixed magic lines of a hand-made piece: [attribute, P1, P3] (Càn Khôn Giới Chỉ, items/books.ts). */
  fixedMagic?: [string, number, number][];
  /** Worn: every hidden line of every worn piece is on (Càn Khôn Giới Chỉ, USER 2026-11-13). */
  revealHidden?: boolean;
};

/** Horses are items too (same id as in HORSES); `look` = horse part row. */
const HORSE_ITEMS: ItemDef[] = GEN_HORSES.map(h => ({
  id: h.id, kind: 'horse', type: h.type, level: h.level, name: h.name, icon: h.icon, look: h.look,
  price: h.price, size: h.size, desc: h.desc, base: h.base, req: h.req,
}));

export const ITEMS: Record<string, ItemDef> = Object.fromEntries([...GEN_ITEMS, ...HORSE_ITEMS, ...GEN_GOLD, ...BOOK_ITEMS, TOKEN_ITEM, CANKHON_RING, TOWN_PORTAL_ITEM].map(it => [it.id, it]));
export const ITEM_LIST: ItemDef[] = Object.values(ITEMS);

// ---------- concrete items ----------

/** Quality of a piece, by the colour of its name: trắng, xanh (đồ ma pháp), tím, hoàng kim, bạch kim. */
export const QUALITY = { normal: 0, magic: 1, purple: 2, gold: 3, platinum: 4 } as const;
export const QUALITY_NAMES = ['Thường', 'Xanh', 'Tím', 'Hoàng kim', 'Bạch kim'];

/**
 * One item somebody owns: which table row it was made from and what was rolled for it. Later work fills the
 * optional parts (blue lines TB6, hidden lines TB7, durability use TB9, gold TB11…).
 */
export interface Item {
  /** Unique id of this piece (trading, logs). */
  uid: string;
  /** ItemDef id: 'armor-0-5', 'melee-2-1', 'horse-12', 'mask-3'… */
  def: string;
  /** QUALITY; missing = normal (white). */
  q?: number;
  /** Rolled base attributes, in the order of the def's `base` (between their min and max). */
  base?: number[];
  /** Current durability (its maximum is the rolled durability_v). */
  dur?: number;
  /** Ngũ hành of the piece (0 Kim … 4 Thổ; magic.ts); blue pieces have one, white table pieces none. */
  series?: number;
  /** Hoàng kim quality 0–10 the lines were rolled at (items/gold.ts). */
  gq?: number;
  /** Magic lines in position order: [attribute name, value, 1 = hidden line] (blue: magic.ts; gold: gold.ts). */
  magic?: MagicLine[];
}

/** Cells of one page of the hành trang (the original 6 x 10 grid). */
export const BAG_PAGE_SIZE = 60;
/** Pages: the hành trang itself + 4 rương mở rộng (USER 2026-11-12), each its own 6 x 10 grid (items/bag.ts). */
export const BAG_PAGES = 5;
/** Entries of a stored bag: page p holds indices p × BAG_PAGE_SIZE … (p + 1) × BAG_PAGE_SIZE − 1. */
export const BAG_SIZE = BAG_PAGE_SIZE * BAG_PAGES;
/** Pages of the account-shared stash (NPC Rương chứa đồ, USER 2026-11-14). */
export const STASH_PAGES = 3;
export const STASH_SIZE = BAG_PAGE_SIZE * STASH_PAGES;
export type Equipment = Partial<Record<EquipSlot, Item>>;
export type Bag = (Item | null)[];
/** Table rows per slot (starter outfits, previews): no rolled values. */
export type Outfit = Partial<Record<EquipSlot, string>>;

export const itemDef = (item: Item | null | undefined): ItemDef | undefined => (item ? ITEMS[item.def] : undefined);

/** Make a new (white) piece of a table row: every base attribute rolled between its min and max. */
export function createItem(def: ItemDef, uid: string, random: () => number = Math.random): Item {
  const item: Item = { uid, def: def.id };
  if (def.base.length) item.base = def.base.map(([, lo, hi]) => (hi > lo ? lo + Math.floor(random() * (hi - lo + 1)) : lo));
  const max = baseValue(def, item, 'durability_v');
  if (max !== undefined) item.dur = max;
  if (def.fixedMagic) { item.q = QUALITY.gold; item.magic = def.fixedMagic.map(([name, v]) => [name, v]); }
  return item;
}

/** A base attribute of a piece (its rolled value), or of a bare table row (its min); undefined when it has none. */
export function baseValue(def: ItemDef, item: Item | undefined, name: string): number | undefined {
  const i = def.base.findIndex(b => b[0] === name);
  if (i < 0) return undefined;
  return item?.base?.[i] ?? def.base[i][1];
}

/**
 * A stored item as this build knows it: the current shape, or a bare table id saved by older builds (a fresh piece
 * is made for it). Null when the row no longer exists. Fields that do not fit the row are rolled again.
 */
export function restoreItem(raw: unknown, newUid: () => string): Item | null {
  if (typeof raw === 'string') return ITEMS[raw] ? createItem(ITEMS[raw], newUid()) : null;
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Partial<Item>;
  const def = ITEMS[String(r.def)];
  if (!def) return null;
  const fresh = createItem(def, typeof r.uid === 'string' && r.uid ? r.uid : newUid());
  const okBase = Array.isArray(r.base) && r.base.length === def.base.length
    && r.base.every((v, i) => Number.isFinite(v) && v >= def.base[i][1] && v <= Math.max(def.base[i][1], def.base[i][2]));
  if (okBase) fresh.base = r.base!.map(Number);
  const max = baseValue(def, fresh, 'durability_v');
  if (max !== undefined) fresh.dur = Number.isFinite(r.dur) ? Math.max(0, Math.min(max, Number(r.dur))) : max;
  if (Number.isInteger(r.q) && r.q! > 0 && r.q! < QUALITY_NAMES.length) fresh.q = r.q;
  if (Array.isArray(r.magic)) {
    const magic = r.magic.filter(m => Array.isArray(m) && typeof m[0] === 'string' && Number.isFinite(m[1]));
    if (magic.length) fresh.magic = magic.map(([n, v, h]) => (h === 1 ? [n, Number(v), 1] : [n, Number(v)]));
  }
  if (Number.isInteger(r.series) && r.series! >= 0 && r.series! <= 4) fresh.series = r.series;
  if (Number.isInteger(r.gq) && r.gq! >= 0 && r.gq! <= 10) fresh.gq = r.gq;
  return fresh;
}

/** 'm' / 'f' as in the item tables. */
export const sexOf = (gender: Gender | string): 'm' | 'f' => (gender === 'female' ? 'f' : 'm');

export { DEFAULT_LOOK };
