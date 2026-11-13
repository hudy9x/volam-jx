import { isWalkable, isoDistance, jumpMs, JUMP } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { face } from './movement.js';

// Khinh công in flight (packages/shared/src/characters/jump.ts): the Sim moves along a straight line at JUMP.speed,
// cannot act (castUntil = landing) and takes no damage (World's EnginePort.hostile, combat.applyHit) until it lands.

/** Steps (isometric px) used to find where the way is blocked. */
const PROBE = 8;

/** Start a jump towards x,y: stops before the first unwalkable cell. Returns the flight time (0 = no room). */
export function startJump(w: World, sim: Sim, x: number, y: number): number {
  const fx = sim.a.x, fy = sim.a.y;
  const d = isoDistance(fx, fy, x, y);
  if (d < JUMP.minRange) return 0;
  let tx = fx, ty = fy;
  for (let s = PROBE; s <= d; s += PROBE) {
    const k = s / d, px = fx + (x - fx) * k, py = fy + (y - fy) * k;
    if (!isWalkable(w.grid, px, py)) break;
    tx = px; ty = py;
  }
  if (isWalkable(w.grid, x, y) && isoDistance(tx, ty, x, y) < PROBE) { tx = x; ty = y; }
  const len = isoDistance(fx, fy, tx, ty);
  if (len < JUMP.minRange) return 0;
  const ms = jumpMs(len);
  sim.jump = { fx, fy, tx: Math.round(tx), ty: Math.round(ty), start: w.now, ms };
  sim.path = [];
  face(sim, tx - fx, ty - fy);
  sim.a.jumpMs = ms;
  return ms;
}

/** Move a jumping Sim along its flight; lands (and clears the jump) at the end. */
export function updateJump(w: World, sim: Sim): void {
  const j = sim.jump!;
  const t = Math.min(1, (w.now - j.start) / j.ms);
  sim.a.x = Math.round(j.fx + (j.tx - j.fx) * t);
  sim.a.y = Math.round(j.fy + (j.ty - j.fy) * t);
  if (t >= 1) endJump(sim);
}

/** Stop a flight where the Sim is (landing, death, leaving the map). */
export function endJump(sim: Sim): void {
  if (!sim.jump) return;
  sim.jump = undefined;
  sim.a.jumpMs = 0;
}
