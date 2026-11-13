// Action speed. Rules and sources: docs/formulas/speed.md.
import { attrOf, type AttrBag } from './attrs.js';
import { EFFECTS, SPEED } from './tuning.js';

/**
 * Frames of one attack (ngoại công) or cast (nội công) at `speedPct` (attackspeed_v / castspeed_v):
 * 18 × 100 / (100 + %) (SRC KNpc · WEB; e.g. +21 % → 14 frames, +101 % → 8).
 */
export function actionFrames(speedPct: number, external: boolean): number {
  const base = external ? SPEED.attackFrames : SPEED.castFrames;
  const f = Math.floor((base * 100) / Math.max(1, 100 + speedPct));
  return Math.max(SPEED.minFrames, f);
}

/** How much longer an action takes than the original 18 frames (1 = normal), slowed or not. */
export function actionScale(bag: AttrBag, external: boolean, slowed: boolean): number {
  const pct = attrOf(bag, external ? 'attackspeed_v' : 'castspeed_v');
  const frames = actionFrames(pct, external);
  return (frames / (external ? SPEED.attackFrames : SPEED.castFrames)) / (slowed ? EFFECTS.slowFactor : 1);
}

/** Movement speed factor from fastwalkrun_p (items, horses, bùa) and a slow: (100 + %)/100, never below 0. */
/**
 * Tốc độ chạy shown as a whole number (USER 2026-11-13): % / 10 — 10 % = 1, 100 % = 10, 200 % = 20 — rounded down
 * unless the decimal part is 0,8 or more (21 % → 2, 138 % → 14, 239 % → 24). Display only.
 */
export function speedPoints(pct: number): number {
  const v = pct / 10, whole = Math.floor(v);
  return v - whole >= 0.8 - 1e-9 ? whole + 1 : whole;
}

export const moveFactor = (bag: AttrBag, slowed: boolean): number =>
  Math.max(0, 1 + attrOf(bag, 'fastwalkrun_p') / 100) * (slowed ? EFFECTS.slowFactor : 1);

