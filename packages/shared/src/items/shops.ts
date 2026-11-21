// Tiền (VT3) and the NPC shops. Money is "lượng" (tiền túi), server-authoritative, saved per character. Shops sell at
// the price of the original tables; selling gives a quarter back.
import { GEN_DRUG_SHOP } from './items.gen.js';
import { HORSE_IDS } from './horses.js';
import { ITEMS, ITEM_LIST, type ItemDef, type ItemKind } from './items.js';
import { TOKEN_ITEM } from './books.js';
import { ELIXIR_ITEMS } from './elixirs.js';
import { MANTLE_ITEMS } from './mantles.js';
import { TK_SHOP_ITEMS } from './tongkim-items.js';
import { usableItem } from './potions.js';

/**
 * Money of a new character (and of characters saved before money existed): the newbie gift of the original
 * (stringresource.txt 10016: "Lão tặng bạn 20000 lượng để thuận lợi luyện công nhé!").
 */
export const START_MONEY = 20000;
/** Upper bound of tiền túi (fits a 32-bit int like the original's). */
export const MAX_MONEY = 2_000_000_000;
/** Quantity box of the original buy dialog (买卖确认.ini BuyNumber: 2 digits). */
export const BUY_MAX = 99;

/** What an NPC pays for a piece: a quarter of the table price (older research notes, BACKLOG VT3). */
export const sellPrice = (def: ItemDef | undefined): number => Math.floor((def?.price ?? 0) / 4);

/** Money as the original shows it: plain digits (the windows add the "lượng" unit / the silver icon). */
export const KNB_PRICE = 1_000_000; // USER: 100 vạn lượng / Kim nguyên bảo.
export const moneyText = (n: number): string => {
  const amount = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (amount < 10000) return amount.toLocaleString('vi-VN');
  const rest = amount % 10000;
  const van = Math.floor(amount / 10000);
  return `${van >= 10000 ? van.toLocaleString('vi-VN') : van} vạn${rest ? ` ${rest}` : ''}`;
};

/** 'gold' = dev-only tab of Thợ rèn (server DEV_TOOLS): hoàng kim môn phái for tests; in play they drop from bosses. */
export type ShopId = 'smith' | 'drug' | 'horse' | 'gold' | 'kytran' | 'tongkim';
export const SHOP_NAMES: Record<ShopId, string> = { smith: 'Thợ rèn', drug: 'Chủ dược điếm', horse: 'Bán ngựa', gold: 'Hoàng kim (dev)', kytran: 'Kỳ Trân Các', tongkim: 'Quân Nhu Quan' };

/** Thợ rèn: every equipment kind of levels 1–10 (+ the original masks), in tab order. */
export const SMITH_KINDS: ItemKind[] = ['armor', 'helm', 'melee', 'range', 'amulet', 'ring', 'pendant', 'belt', 'cuff', 'boot', 'mask'];

/**
 * Items each shop sells. Hiệu thuốc = the original list (buysell.txt row 53) without what has no effect here yet
 * (giải độc: poison is only recorded).
 */
export const SHOP_ITEMS: Record<ShopId, ItemDef[]> = {
  smith: ITEM_LIST.filter(it => SMITH_KINDS.includes(it.kind) && !it.gold),
  drug: GEN_DRUG_SHOP.map(id => ITEMS[id]).filter(it => usableItem(it)),
  horse: HORSE_IDS.map(id => ITEMS[id]).filter(Boolean),
  gold: ITEM_LIST.filter(it => it.gold),
  /** Kỳ Trân Các: bí kíp (items/books.ts) + Tiên Thảo Lộ + Phi phong (100 KNB) + the GM lệnh bài for 1 lượng. */
  kytran: [...MANTLE_ITEMS, ...ELIXIR_ITEMS, ...ITEM_LIST.filter(it => it.book), TOKEN_ITEM],
  /** Quân Nhu Quan: vật phẩm chiến trường Tống Kim mua bằng điểm tích lũy. */
  tongkim: TK_SHOP_ITEMS,
};

/** Shop that sells a table row (server check for buying). */
export const SHOP_OF: Record<string, ShopId> = Object.fromEntries(
  (Object.keys(SHOP_ITEMS) as ShopId[]).flatMap(shop => SHOP_ITEMS[shop].map(it => [it.id, shop])),
);
