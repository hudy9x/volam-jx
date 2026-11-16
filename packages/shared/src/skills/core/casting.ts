import { EFFECTS } from '../../formulas/effects/tuning.js';
import { skillCost } from './info.js';
import { getSkill, tuningOf } from './registry.js';
import type { SkillDef } from './types.js';

export interface SkillResourceCost {
  resource: 'hp' | 'mp';
  amount: number;
  minRemainingHpRatio: number;
  minRemainingHp: number;
}
export interface SkillVitals { hp: number; mp: number; maxHp: number }

/** Pure resolver; fixed actions bypass the global speed phase table. */
export function skillActionMs(s: SkillDef, fallbackMs: number, slowed = false): number {
  const fixed = tuningOf(s.id).timing;
  return fixed ? fixed.cycleMs / (slowed && fixed.affectedByCold ? EFFECTS.slowFactor : 1) : fallbackMs;
}

export function skillResourceCost(s: SkillDef, level: number): SkillResourceCost {
  return { resource: 'mp', minRemainingHpRatio: 0, minRemainingHp: 0,
    ...tuningOf(s.id).resourceCost, amount: skillCost(s, level) };
}

export function skillHpReserve(cost: SkillResourceCost, maxHp: number): number {
  return Math.max(cost.minRemainingHp, Math.ceil(maxHp * cost.minRemainingHpRatio));
}

export function canPaySkillCost(cost: SkillResourceCost, vitals: SkillVitals): boolean {
  if (!Number.isFinite(cost.amount) || cost.amount < 0) return false;
  return cost.resource === 'hp'
    ? vitals.hp - cost.amount >= skillHpReserve(cost, vitals.maxHp)
    : vitals.mp >= cost.amount;
}

/** Validate hand-authored rules once after registration, not on every tick. */
export function validateCastingTuning(ids: Iterable<number>): void {
  for (const id of ids) {
    const s = getSkill(id), t = tuningOf(id);
    if (!s || ![0, 1, 2, 4].includes(s.style)) throw new Error(`Invalid casting skill: ${id}`);
    if (t.timing && (!Number.isFinite(t.timing.cycleMs) || t.timing.cycleMs <= 0)) throw new Error(`Invalid cycle: ${id}`);
    const r = t.resourceCost;
    if (r && (!['hp', 'mp'].includes(r.resource) || !Number.isFinite(r.minRemainingHpRatio)
      || r.minRemainingHpRatio < 0 || r.minRemainingHpRatio > 1
      || !Number.isFinite(r.minRemainingHp) || r.minRemainingHp < 0)) throw new Error(`Invalid resource: ${id}`);
    if (t.cost !== undefined && (!Number.isFinite(t.cost) || t.cost < 0)) throw new Error(`Invalid cost: ${id}`);
  }
}
