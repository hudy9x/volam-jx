/** Visual-only settings. Gameplay durations/speeds live in shared/formulas/effects/.
 * Maintenance guide: docs/formulas/effects.md. No Phaser dependency: usable by render tests.
 */
export const CONTROL_VISUALS = {
  tint: { normal: 0xffffff, cold: 0xffdf55, poison: 0x70ff70 },
  /** USER 2026-11-15: additional half-rate loop animation while cold (including the running gait). */
  coldLoopRate: 0.5,
  stunHeadGap: 12,
  stunDepth: 0.6,
} as const;

/** Synced control bits: 1 stun, 2 cold, 4 poison. Poison wins colour priority, cold still slows loops. */
export function controlAppearance(ctl: number, alive: boolean) {
  const cold = alive && !!(ctl & 2);
  return {
    frozen: alive && !!(ctl & 1),
    tint: alive && (ctl & 4) ? CONTROL_VISUALS.tint.poison : cold ? CONTROL_VISUALS.tint.cold : CONTROL_VISUALS.tint.normal,
    loopRate: cold ? CONTROL_VISUALS.coldLoopRate : 1,
  };
}
