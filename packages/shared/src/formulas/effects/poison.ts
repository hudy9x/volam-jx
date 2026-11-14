import { attrOf, type AttrBag } from '../attrs.js';
import { EFFECTS } from './tuning.js';
import { FRAME_MS } from '../tuning.js';
import type { HitOutcome } from '../damage.js';
import type { HitEffects, PoisonRun } from './types.js';

/** Resolve poison after resistance, duration reduction and flat damage reduction. */
export function poisonFromHit(poison: HitOutcome['poison'], tb: AttrBag): HitEffects['poison'] {
  if (!poison) return null;
  const frames = poison.frames * ((100 - Math.min(EFFECTS.poisonReduceMax, attrOf(tb, 'poisontimereduce_p'))) / 100);
  const tick = Math.max(0, poison.tick - attrOf(tb, 'poisondamagereduce_v'));
  return tick > 0 && frames > 0
    ? { tick, periodMs: Math.round(poison.period * FRAME_MS), totalMs: Math.round(frames * FRAME_MS) }
    : null;
}

/**
 * Add a new poison to the running one (SRC: stacked poisons merge into one): the per-tick damage adds up (capped per
 * target kind, DATA PlayerPoisonDamageMax / NpcPoisonDamageMax), it lasts as long as the longer of the two, ticks at the
 * shorter period.
 */
export function mergePoison(cur: PoisonRun | null, add: NonNullable<HitEffects['poison']>, now: number, targetIsPlayer: boolean): PoisonRun {
  const cap = targetIsPlayer ? EFFECTS.playerPoisonTickMax : EFFECTS.npcPoisonTickMax;
  if (!cur || cur.endsAt <= now) {
    return { tick: Math.min(cap, add.tick), periodMs: add.periodMs, endsAt: now + add.totalMs, nextAt: now + add.periodMs };
  }
  return {
    tick: Math.min(cap, cur.tick + add.tick),
    periodMs: Math.min(cur.periodMs, add.periodMs),
    endsAt: Math.max(cur.endsAt, now + add.totalMs),
    nextAt: Math.min(cur.nextAt, now + add.periodMs),
  };
}
