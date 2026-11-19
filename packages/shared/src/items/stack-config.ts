import type { ItemDef, ItemKind } from './items.js';

/**
 * Cấu hình xếp chồng vật phẩm.
 * Muốn vật phẩm mới (vd: Tiên thảo lộ, Quế Hoa Tửu, Thiên sơn bảo lộ) tự động xếp chồng,
 * chỉ cần thêm `id` vào `STACK_LIMITS_BY_ID` (hoặc đặt `maxStack` trên `ItemDef`).
 */
export const POTION_STACK_MAX = 50;
/** Tổng số bình thuốc (`kind === 'potion'`) tối đa được mang trong toàn bộ hành trang. */
export const MAX_BAG_POTIONS = 60;

export const STACK_LIMITS_BY_KIND: Partial<Record<ItemKind, number>> = {
  potion: POTION_STACK_MAX,
  elixir: POTION_STACK_MAX,
};

export const STACK_LIMITS_BY_ID: Record<string, number> = {
  // 'tien-thao-lo': 50,
  // 'que-hoa-tuu': 50,
  // 'thien-son-bao-lo': 50,
};

/** Giới hạn xếp chồng tối đa trên 1 ô (1 = không xếp chồng). */
export function resolveMaxStack(def: ItemDef | undefined): number {
  if (!def) return 1;
  if (def.maxStack !== undefined && def.maxStack > 1) return Math.floor(def.maxStack);
  const byId = STACK_LIMITS_BY_ID[def.id];
  if (byId !== undefined && byId > 1) return Math.floor(byId);
  const byKind = STACK_LIMITS_BY_KIND[def.kind];
  if (byKind !== undefined && byKind > 1) return Math.floor(byKind);
  return 1;
}
