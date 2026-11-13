import { PLAYER_SPEED } from './player.js';

// Khinh công (skill 210, MisslesForm 9 "Melee_Jump"): the character really flies to the spot instead of teleporting.
// Server: apps/server/src/world/systems/jump.ts (flight, landing, immunity). Client: game/actors/ActorView.ts (pose,
// height). BACKLOG KN9.
//
// Original engine (read in the deleted engine fork, notes in tasks/BACKLOG.md KN9): 12 px per frame, at most
// 40 frames (≈ 480 px), stops before obstacles, the jumper cannot act until landing, height follows a parabola.
// The engine still lets the jumper be hit; here a jumper in flight takes no damage (user's choice, AGENTS.md §6).

export const JUMP = {
  /** Flight speed in isometric px/s: the original 12 px/frame against a run of 10 px/frame, on our run speed. */
  speed: PLAYER_SPEED * 1.2,
  /** Longest jump (original: 40 frames x 12 px). The skill's own radius (skills.txt AttackRadius) may be shorter. */
  maxRange: 480,
  /** Shorter jumps than this are not worth a flight (blocked right away): the cast fails quietly. */
  minRange: 24,
  /**
   * Peak height above the ground in screen px, by jump length. Our guess (the engine's numbers were not kept): the
   * original sprites already lift the body a little (male 15 px, female 44 px), the parabola adds the rest.
   */
  peakPerPx: 0.18,
  peakMin: 24,
  peakMax: 80,
} as const;

/** Flight time in ms for a jump of `distance` isometric px. */
export const jumpMs = (distance: number) => Math.round((distance / JUMP.speed) * 1000);

/** Height (screen px) of the body above its feet `elapsed` ms into a flight lasting `ms`. */
export function jumpHeight(elapsed: number, ms: number): number {
  if (ms <= 0 || elapsed <= 0 || elapsed >= ms) return 0;
  const t = elapsed / ms;
  const distance = (ms / 1000) * JUMP.speed;
  const peak = Math.max(JUMP.peakMin, Math.min(JUMP.peakMax, distance * JUMP.peakPerPx));
  return 4 * peak * t * (1 - t);
}
