import { BLUE_BOSS_RESISTANCE } from './tuning.js';
// SHXT makeboss/property/lib: floor(A * level + B). Data refreshed by gen:boss-resists.
import data from '../bosses/resistance-data.json' with { type: 'json' };
import { attrOf } from './attrs.js';
import { RESIST_ATTR, RESIST_KINDS, type ResistKind } from './character.js';
import type { BossResistance } from '../bosses/types.js';
export type ResistanceProfile = { values: Record<ResistKind, number>; caps: Record<ResistKind, number> };
export const SHXT_BOSS_RESISTANCE = data as Record<string, { coefficients: Record<ResistKind, number[]>; caps: Record<ResistKind, number> }>;
export function bossResistance(id: number, level: number, custom?: BossResistance): ResistanceProfile {
  const source = SHXT_BOSS_RESISTANCE[id];
  const values = {} as Record<ResistKind, number>, caps = {} as Record<ResistKind, number>;
  for (const k of RESIST_KINDS) {
    values[k] = custom?.mode === 'custom' ? custom.values[k] : source ? Math.floor(source.coefficients[k][0] * level + source.coefficients[k][1]) : 25;
    caps[k] = custom?.mode === 'custom' ? custom.caps[k] : source?.caps[k] ?? 75;
  }
  return { values, caps };
}
export function validateBossResistance(value: unknown): string | null {
  if (value === undefined) return null;
  if (!value || typeof value !== 'object') return 'Cấu hình kháng không hợp lệ.';
  const v = value as BossResistance;
  if (v.mode === 'shxt') return null;
  if (v.mode !== 'custom') return 'Chế độ kháng không hợp lệ.';
  for (const k of RESIST_KINDS) {
    if (!Number.isInteger(v.values?.[k]) || v.values[k] < -1000 || v.values[k] > 1000) return 'Kháng gốc phải là số nguyên từ -1000 đến 1000.';
    if (!Number.isInteger(v.caps?.[k]) || v.caps[k] < 0 || v.caps[k] > 95) return 'Trần kháng phải là số nguyên từ 0 đến 95.';
  }
  return null;
}

/** Tier is taken from the spawned instance, never a shared MonsterDef mutation. PvP remains unchanged. */
export function applyBossResistance(combat: import('./combat.js').CombatStats, tier: number, id: number, level: number, custom?: BossResistance): void {
  const profile = bossResistance(id, level, custom);
  if (tier === 1) for (const k of RESIST_KINDS) { profile.values[k] = BLUE_BOSS_RESISTANCE.base; profile.caps[k] = BLUE_BOSS_RESISTANCE.cap; }
  for (const k of RESIST_KINDS) {
    const cap = Math.max(0, Math.min(95, profile.caps[k] + attrOf(combat.bag, 'allresmax_p') + attrOf(combat.bag, RESIST_ATTR[k].max)));
    combat.resistMax[k] = cap;
    combat.resist[k] = Math.max(-cap, Math.min(cap, profile.values[k] + attrOf(combat.bag, 'allres_p') + attrOf(combat.bag, RESIST_ATTR[k].res)));
  }
}
