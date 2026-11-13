// Bí kíp sold at Kỳ Trân Các (user request 2026-11-12): right click (or keys 1–9) to use.
//  - Bí kíp 90 / 120 / 150: the next skill of that tier of the own faction appears (in learning order). The skills of these
//    tiers no longer appear by themselves at their level (skills/core/learning.ts TIER_BOOKS; world/progress.ts).
//  - Đại thành bí kíp 90 / 120 / 150: one learned skill of that tier (the lowest) goes to level 20.
// The original has the same items (DATA magicscript.txt "Võ Lâm Mật Tịch"…, script/item/skillbook.lua "Đại Thành Bí Kíp" gives
// level 20); names, prices and the automatic choice are ours (CHỌN). Icons: the original mật tịch sprites.
import type { ItemDef } from './items.js';

export type BookEffect = { tier: 90 | 120 | 150; kind: 'learn' | 'master' };
const TIERS = [90, 120, 150] as const;
/** Prices in lượng (CHỌN). */
const PRICE = { learn: { 90: 500_000, 120: 1_000_000, 150: 2_000_000 }, master: { 90: 1_000_000, 120: 2_000_000, 150: 3_000_000 } };

const book = (tier: 90 | 120 | 150, kind: 'learn' | 'master'): ItemDef & { book: BookEffect } => ({
  id: `book-${kind}-${tier}`, kind: 'book', type: 0, level: 1,
  name: kind === 'learn' ? `Bí kíp kỹ năng cấp ${tier}` : `Đại thành bí kíp ${tier}`,
  icon: kind === 'learn' ? 'items/obj_item_lection' : 'items/obj_item_lection02',
  price: PRICE[kind][tier], size: [1, 1],
  desc: kind === 'learn'
    ? `Chuột phải để dùng: lĩnh ngộ thêm một kỹ năng cấp ${tier} của môn phái (theo thứ tự).`
    : `Chuột phải để dùng: một kỹ năng cấp ${tier} đã học (cấp thấp nhất) đạt ngay cấp 20.`,
  base: [], req: [['requirelevel', tier === 90 ? 80 : tier]], book: { tier, kind },
});

export const BOOK_ITEMS = TIERS.flatMap(t => [book(t, 'learn'), book(t, 'master')]);

// Lệnh bài (items/token.ts): its row lives here, with no imports, so items.ts can list it without an import cycle.
// Kỳ Trân Các sells it for 1 lượng (USER 2026-11-13: lệnh bài cho GM); selling it back gives 0.
export const TOKEN_ITEM_ID = 'token-lenhbai';

export const TOKEN_ITEM: ItemDef = {
  id: TOKEN_ITEM_ID, kind: 'token', type: 0, level: 1, name: 'Lệnh bài', icon: 'items/taskobj126', price: 1, size: [1, 1],
  desc: 'Chuột phải để mở: thăng cấp 150, nhận kinh nghiệm, học kỹ năng cấp 90 / 120 / 150, nhận ngân lượng, nhận bộ hoàng kim môn phái.',
  base: [], req: [],
};

/**
 * Thổ Địa Phù vĩnh cửu (USER 2026-11-13): the original Thổ địa phù (settings/item/townportal.txt: \spr\item\special\
 * Obj_TownPortal.spr, giá 500, "Một loại bùa pháp, giúp bạn mau chóng đến nơi muốn đến.") but never used up. Right click =
 * back to the nearest city (maps/index.ts nearestTown; Biện Kinh by default). Every character carries one (world/token.ts).
 */
export const TOWN_PORTAL_ID = 'townportal-forever';
export const TOWN_PORTAL_ITEM: ItemDef = {
  id: TOWN_PORTAL_ID, kind: 'portal', type: 0, level: 1, name: 'Thổ Địa Phù (vĩnh cửu)', icon: 'items/obj_townportal', price: 0,
  size: [1, 1], desc: 'Một loại bùa pháp, giúp bạn mau chóng đến nơi muốn đến. Chuột phải: về thành thị gần nhất (mặc định Biện Kinh). Không mất khi dùng.',
  base: [], req: [],
};

/**
 * Càn Khôn Giới Chỉ (USER 2026-11-13): the SHXT mod ring (settings/item/004/goldequip.txt row 428, obj-ring10, "Uẩn Hàm Cường Đại
 * Thần Bí Lực Lượng Giới Chỉ!"; magicattrib_ge 129 indestructible_b 1 + 131 allskill_v 2 = võ công vốn có +2 cấp). On top of the
 * data the user asked that it turns on every hidden line of the worn pieces (`revealHidden`, our rule). Given by the lệnh bài.
 */
export const CANKHON_RING_ID = 'ring-cankhon';
export const CANKHON_RING: ItemDef = {
  id: CANKHON_RING_ID, kind: 'ring', type: 0, level: 10, name: 'Càn Khôn Giới Chỉ', icon: 'items/obj-ring10', price: 0, size: [1, 1],
  desc: 'Uẩn Hàm Cường Đại Thần Bí Lực Lượng Giới Chỉ! Khi đeo: kích hoạt toàn bộ thuộc tính ẩn của trang bị đang mặc.',
  base: [], req: [], fixedMagic: [['indestructible_b', 1, 0], ['allskill_v', 2, 0]], revealHidden: true,
};
