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

/** A poison already running on someone (server side). */
export interface PoisonRun { tick: number; periodMs: number; endsAt: number; nextAt: number }
