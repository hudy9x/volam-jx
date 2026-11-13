// Control effects of a landed hit: choáng (stun), chậm (slow, from cold damage), độc (poison), co giật (flinch).
// The server keeps them on the target (apps/server/src/world/systems/effects.ts). Rules and sources: docs/formulas/effects.md.
import { attr } from '../skills/core/formula.js';
import type { SkillDef } from '../skills/core/types.js';
import { attrOf } from './attrs.js';
import type { CombatStats } from './combat.js';
import type { HitOutcome } from './damage.js';
import { EFFECTS, FRAME_MS } from './tuning.js';

export interface HitEffects {
  /** Choáng: can't move or act. */
  stunMs: number;
  /** Chậm: speed × EFFECTS.slowFactor. */
  slowMs: number;
  /** Độc: `tick` damage every `periodMs` for `totalMs`. */
  poison: { tick: number; periodMs: number; totalMs: number } | null;
  /** Co giật: the hurt pose interrupts the target. */
  hurtMs: number;
}

const pctOff = (v: number, cap: number) => (100 - Math.min(cap, v)) / 100;

/**
 * Effects a landed hit of skill `s` puts on `target` (`attacker` = who cast it). Chances are rolled with `rng`.
 * - Choáng: stun_p P1 % chance (+ do_stun_p), P2 frames × (1 − stuntimereduce_p) (+ anti_stuntimereduce_p of the attacker).
 * - Chậm: any cold damage slows: colddamage_v P2 frames (default when missing) × (1 + coldenhance_p) × (1 − freezetimereduce_p, max 77).
 * - Độc: poisondamage_v total frames × (1 − poisontimereduce_p).
 * - Co giật: DoHurt % chance: hurt frames × (100 − hit recovery %)/100 (≥ 100 % recovery: never).
 */
export function hitEffects(s: SkillDef, level: number, attacker: CombatStats, target: CombatStats, hit: HitOutcome, rng: () => number): HitEffects {
  const out: HitEffects = { stunMs: 0, slowMs: 0, poison: null, hurtMs: 0 };
  if (hit.miss) return out;
  const tb = target.bag, ab = attacker.bag;

  const stun = attr(s, 'stun_p', level);
  const stunChance = (stun?.[0] ?? 0) + attrOf(ab, 'do_stun_p') - attrOf(tb, 'anti_do_stun_p');
  if (stun && stunChance > 0 && rng() * 100 < stunChance) {
    const frames = Math.max(0, stun[1]) * (1 + attrOf(ab, 'anti_stuntimereduce_p') / 100) * pctOff(attrOf(tb, 'stuntimereduce_p'), EFFECTS.stunReduceMax);
    out.stunMs = Math.round(frames * FRAME_MS);
  }

  if (hit.parts.cold > 0) {
    const p2 = attr(s, 'colddamage_v', level)?.[1] ?? 0;
    const frames = (p2 > 0 ? p2 : EFFECTS.defaultSlowFrames) * (1 + attrOf(ab, 'coldenhance_p') / 100)
      * pctOff(attrOf(tb, 'freezetimereduce_p'), EFFECTS.freezeReduceMax);
    out.slowMs = Math.round(frames * FRAME_MS);
  }

  if (hit.poison) {
    const frames = hit.poison.frames * pctOff(attrOf(tb, 'poisontimereduce_p'), EFFECTS.poisonReduceMax);
    const tick = Math.max(0, hit.poison.tick - attrOf(tb, 'poisondamagereduce_v'));
    if (tick > 0 && frames > 0) out.poison = { tick, periodMs: Math.round(hit.poison.period * FRAME_MS), totalMs: Math.round(frames * FRAME_MS) };
  }

  const hurtChance = attr(s, 'skill_dohurt', level)?.[0] ?? s.doHurt ?? 0;
  const recover = Math.max(0, target.hitRecover - attrOf(ab, 'anti_hitrecover'));
  if (hurtChance > 0 && recover < 100 && rng() * 100 < hurtChance) {
    out.hurtMs = Math.round((target.hurtFrames * (100 - recover)) / 100 * FRAME_MS);
  }
  return out;
}

/** A poison already running on someone (server side). */
export interface PoisonRun { tick: number; periodMs: number; endsAt: number; nextAt: number }

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
