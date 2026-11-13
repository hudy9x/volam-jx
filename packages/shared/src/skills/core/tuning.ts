// Global numbers of the skill engine that the original data does not give. Damage itself comes from
// packages/shared/src/formulas/ (docs/formulas/damage.md); per-skill adjustments belong in factions/<id>/tuning.ts.

/** State length when none of its attributes has a P2 (the data almost always gives one). */
export const DEFAULT_STATE_MS = 30000;
/** Auras refresh their state on everyone in range this often, for a bit longer than that. */
export const AURA_PULSE_MS = 1000;
export const AURA_STATE_MS = 2500;

/** Multiplier on every damage number of the formulas (global balance knob; per skill: factions/<id>/tuning.ts `damage`). */
export const DAMAGE_SCALE = 1;
/** Size of one map cell in logic px; missile collision / damage ranges are given in cells. */
export const CELL = 32;
/** Max nesting of event skills (a missile casting a skill whose missiles cast another…). */
export const MAX_EVENT_DEPTH = 4;
/** Shortest cast pose when the skill's animation would be shorter. */
export const MIN_CAST_MS = 450;
