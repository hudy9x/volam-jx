import type { Gender } from '../characters/factions.js';
import type { EquipSlot } from '../items/items.js';
import rawLoadouts from './gold-loadouts.json' with { type: 'json' };

/** Special slot tokens in gold-loadouts.json. */
export type BotLoadoutSlotValue = string | 'auto:green' | 'auto:horse' | null;

export type BotGoldSlots = Partial<Record<EquipSlot, BotLoadoutSlotValue>>;

export interface BotGoldRouteLoadout {
  label: string;
  primarySuite: number | { male: number; female: number } | null;
  slots?: BotGoldSlots;
  byGender?: Partial<Record<Gender, BotGoldSlots>>;
}

export type BotGoldLoadoutTable = Record<string, Record<string, BotGoldRouteLoadout>>;

/**
 * Bảng cấu hình trang bị Hoàng Kim môn phái cho bot (`gear = 'gold'`), ánh xạ theo `môn phái -> tuyến kỹ năng`.
 * Thứ tự ưu tiên đã điền sẵn trong `gold-loadouts.json`:
 *  1. Full bộ Hoàng Kim môn phái khớp tuyến kỹ năng đang dùng.
 *  2. Lấp các ô trống bằng món Hoàng Kim từ bộ khác cùng phái (không xung khắc loại vũ khí).
 *  3. Các ô vẫn thiếu đặt `'auto:green'` để sinh đồ xanh ngũ hành; `'auto:horse'` giữ theo thiết lập ngựa của bot.
 */
export const BOT_GOLD_LOADOUTS = rawLoadouts as BotGoldLoadoutTable;

/** Lấy bảng trang bị Hoàng Kim cho đúng môn phái, tuyến kỹ năng và giới tính (fallback về tuyến đầu của phái). */
export function resolveBotGoldLoadout(
  faction: string,
  routeId: string | undefined,
  gender?: Gender | string,
): { routeId: string; entry: BotGoldRouteLoadout; slots: BotGoldSlots } | null {
  const byRoute = BOT_GOLD_LOADOUTS[faction];
  if (!byRoute) return null;
  const resolvedRoute = (routeId && byRoute[routeId] ? routeId : Object.keys(byRoute)[0]) ?? '';
  const entry = byRoute[resolvedRoute];
  if (!entry) return null;
  const g: Gender = gender === 'female' ? 'female' : 'male';
  const slots = entry.byGender?.[g] ?? entry.byGender?.male ?? entry.byGender?.female ?? entry.slots;
  if (!slots) return null;
  return { routeId: resolvedRoute, entry, slots };
}
