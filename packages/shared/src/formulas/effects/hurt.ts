import { attr } from '../../skills/core/formula.js';
import type { SkillDef } from '../../skills/core/types.js';
import { attrOf, type AttrBag } from '../attrs.js';
import { FRAME_MS } from '../tuning.js';
import type { CombatStats } from '../combat.js';

/** Flinch chance and recovery length; interruption itself belongs to the server runtime. */
export function hurtDurationMs(s: SkillDef, level: number, ab: AttrBag, target: CombatStats, rng: () => number): number {
  const chance = attr(s, 'skill_dohurt', level)?.[0] ?? s.doHurt ?? 0;
  const recover = Math.max(0, target.hitRecover - attrOf(ab, 'anti_hitrecover'));
  if (!(chance > 0 && recover < 100 && rng() * 100 < chance)) return 0;
  return Math.round((target.hurtFrames * (100 - recover)) / 100 * FRAME_MS);
}
