// Stable entry point. Each effect's formula lives independently in ./effects/.
// Runtime application: server/world/systems/effects.ts. Guide: docs/formulas/effects.md.
import type { SkillDef } from '../skills/core/types.js';
import type { CombatStats } from './combat.js';
import type { HitOutcome } from './damage.js';
import type { HitEffects } from './effects/types.js';
import { stunDurationMs } from './effects/stun.js';
import { coldDurationMs } from './effects/cold.js';
import { poisonFromHit } from './effects/poison.js';
import { hurtDurationMs } from './effects/hurt.js';

export type { HitEffects, PoisonRun } from './effects/types.js';
export { mergePoison } from './effects/poison.js';

/** Resolve a landed hit, preserving the RNG order: stun first, then flinch. */
export function hitEffects(s: SkillDef, level: number, attacker: CombatStats, target: CombatStats, hit: HitOutcome, rng: () => number): HitEffects {
  if (hit.miss) return { stunMs: 0, slowMs: 0, poison: null, hurtMs: 0 };
  const ab = attacker.bag, tb = target.bag;
  return {
    stunMs: stunDurationMs(s, level, ab, tb, rng),
    slowMs: coldDurationMs(s, level, ab, tb, hit.parts.cold),
    poison: poisonFromHit(hit.poison, tb),
    hurtMs: hurtDurationMs(s, level, ab, target, rng),
  };
}

export { coldMovement } from './effects/cold.js';
