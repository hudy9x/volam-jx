// Wearing rules (TB5): who may wear an item — sex, faction, ngũ hành, level, Sức mạnh, Thân pháp (the requirement columns
// of the original tables) — and what worn items add (TB8 decides which attributes count).
import { FACTIONS, type Gender } from '../characters/factions.js';
import { baseValue, itemDef, sexOf, type Equipment, type ItemDef } from './items.js';
import { SERIES_KEYS } from './magic.js';

/**
 * Who wears / looks at an item: requirements they miss are red, the bag cell dark. `series` (hệ) defaults to the faction's;
 * level and potentials (formulas/character.ts totals, items included) are only checked when given.
 */
export interface ItemViewer {
  gender: Gender | string; faction: string;
  series?: string; level?: number; str?: number; dex?: number;
  /** Tài phú Binh giáp hiện tại của nhân vật (formulas/fortune.ts). */
  fortune?: number;
}

/** Faction order of the original tables (requiremenpai). */
export const MENPAI = ['shaolin', 'tianwang', 'tangmen', 'wudu', 'emei', 'cuiyan', 'gaibang', 'tianren', 'wudang', 'kunlun', 'huashan'];

/** Whether `viewer` misses requirement [name, value] of a row (level / potentials only when the viewer has them). */
export function missesReq(name: string, value: number, viewer: ItemViewer): boolean {
  if (name === 'requiresex') return (value ? 'f' : 'm') !== sexOf(viewer.gender);
  if (name === 'requiremenpai') return MENPAI[value] !== viewer.faction;
  if (name === 'requireseries') return SERIES_KEYS[value] !== (viewer.series ?? FACTIONS[viewer.faction]?.element);
  if (name === 'requirelevel') return viewer.level !== undefined && viewer.level < value;
  if (name === 'requirestr') return viewer.str !== undefined && viewer.str < value;
  if (name === 'requiredex') return viewer.dex !== undefined && viewer.dex < value;
  if (name === 'require_fortune_value') return viewer.fortune !== undefined && viewer.fortune < value;
  return false;
}

const REQ_TEXT: Record<string, (v: number) => string> = {
  requirelevel: v => `Cần đạt cấp ${v}.`,
  requirestr: v => `Cần ${v} Sức mạnh.`,
  requiredex: v => `Cần ${v} Thân pháp.`,
  require_fortune_value: v => `Cần đạt Tài phú binh giáp ${v.toLocaleString('vi-VN')}.`,
};

/** Why an item can't be worn, or null when it can. */
export function equipError(item: ItemDef, viewer: ItemViewer): string | null {
  if (item.sex && item.sex !== sexOf(viewer.gender)) return item.sex === 'm' ? 'Chỉ nhân vật nam mặc được.' : 'Chỉ nhân vật nữ mặc được.';
  for (const [name, value] of item.req) {
    if (name === 'requiremenpai' && missesReq(name, value, viewer)) return 'Môn phái không phù hợp.';
    if (name === 'requireseries' && missesReq(name, value, viewer)) return 'Ngũ hành không phù hợp.';
    if (REQ_TEXT[name] && missesReq(name, value, viewer)) return REQ_TEXT[name](value);
  }
  return null;
}

/** Whether `viewer` can wear / ride the row (bag cells: green when yes, dark red when no). Non-equipment: true. */
export const canWear = (item: ItemDef, viewer: ItemViewer | null | undefined): boolean => !viewer || !equipError(item, viewer);

/** Sinh lực / Nội lực tối đa from the base attributes of the worn items (lifemax_v / manamax_v). */
export function equipBonus(equip: Equipment): { hp: number; mp: number } {
  let hp = 0, mp = 0;
  for (const item of Object.values(equip)) {
    const def = itemDef(item);
    if (!def) continue;
    hp += baseValue(def, item, 'lifemax_v') ?? 0;
    mp += baseValue(def, item, 'manamax_v') ?? 0;
  }
  return { hp, mp };
}

/** Ngoại công damage of the worn weapon (weapondamagemin_v / max), or undefined without one. */
export function weaponBaseDamage(equip: Equipment): [number, number] | undefined {
  const def = itemDef(equip.weapon);
  if (!def) return undefined;
  const lo = baseValue(def, equip.weapon, 'weapondamagemin_v'), hi = baseValue(def, equip.weapon, 'weapondamagemax_v');
  return lo === undefined || hi === undefined ? undefined : [lo, Math.max(lo, hi)];
}
