import { attr } from '../../skills/core/formula.js';
import type { SkillDef } from '../../skills/core/types.js';
import { attrOf, type AttrBag } from '../attrs.js';
import { EFFECTS } from './tuning.js';
import { FRAME_MS } from '../tuning.js';

/** Cold damage starts slow; its duration is independent of its damage amount. */
export function coldDurationMs(s: SkillDef, level: number, ab: AttrBag, tb: AttrBag, coldDamage: number): number {
  if (!(coldDamage > 0)) return 0;
  const p2 = attr(s, 'colddamage_v', level)?.[1] ?? 0;
  const frames = (p2 > 0 ? p2 : EFFECTS.defaultSlowFrames) * (1 + attrOf(ab, 'coldenhance_p') / 100)
    * ((100 - Math.min(EFFECTS.freezeReduceMax, attrOf(tb, 'freezetimereduce_p'))) / 100);
  return Math.round(frames * FRAME_MS);
}

/** Authoritative cold movement: one 120-unit stride every two seconds. */
export function coldMovement() {
  const { velocity, fps, referenceFrames } = EFFECTS.coldMovement;
  const cycleMs = referenceFrames * 1000 / fps;
  return { velocity, fps, cycleMs, stride: velocity * cycleMs / 1000 };
}
