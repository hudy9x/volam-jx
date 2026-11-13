// Heals of the engine. Damage is packages/shared/src/formulas/ (damage.ts, effects.ts), called from SkillEngine.strike.
import { attr1 } from '../core/formula.js';
import type { SkillDef } from '../core/types.js';

/** Sinh lực a heal restores: lifereplenish_v of the skill at its level. */
export function healAmount(s: SkillDef, level: number): number {
  return Math.max(0, attr1(s, 'lifereplenish_v', level));
}
