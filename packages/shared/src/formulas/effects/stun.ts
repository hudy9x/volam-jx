import { attr } from '../../skills/core/formula.js';
import type { SkillDef } from '../../skills/core/types.js';
import { attrOf, type AttrBag } from '../attrs.js';
import { EFFECTS } from './tuning.js';
import { FRAME_MS } from '../tuning.js';

/** Chance and duration of stun. RNG order is owned by hitEffects. */
export function stunDurationMs(s: SkillDef, level: number, ab: AttrBag, tb: AttrBag, rng: () => number): number {
  const stun = attr(s, 'stun_p', level);
  const chance = (stun?.[0] ?? 0) + attrOf(ab, 'do_stun_p') - attrOf(tb, 'anti_do_stun_p');
  if (!stun || !(chance > 0) || !(rng() * 100 < chance)) return 0;
  const frames = Math.max(0, stun[1]) * (1 + attrOf(ab, 'anti_stuntimereduce_p') / 100)
    * ((100 - Math.min(EFFECTS.stunReduceMax, attrOf(tb, 'stuntimereduce_p'))) / 100);
  return Math.round(frames * FRAME_MS * EFFECTS.stunDurationMultiplier);
}
