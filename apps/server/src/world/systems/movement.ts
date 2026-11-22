import { attrOf, coldMovement, getActiveSpeedConfig, PLAYER_SPEED, clearSegment, direction8, findPath, isWalkable, isoDistance, stepToward, type Point } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { combatOf } from './effects.js';

// Paths (straight line or A* within a per-tick budget), walking along them, facing, run speed.

export function setPath(w: World, sim: Sim, dest: Point, force = false): void {
  const from = { x: sim.a.x, y: sim.a.y };
  // Straight line when nothing is in the way (cheap, the common case for short hops).
  if (clearSegment(w.grid, from, dest, true) && isWalkable(w.grid, dest.x, dest.y)) {
    sim.path = [{ x: dest.x, y: dest.y }];
    return;
  }
  if (!force && w.astarBudget <= 0) return; // try again next tick
  w.astarBudget--;
  // Players may click far away on the minimap (Biện Kinh is 1168 x 1632 cells): ~10 ms avg, ~25 ms worst.
  const path = findPath(w.grid, from, dest, sim.kind === 'player' ? 300000 : 6000);
  if (!path) { sim.path = []; return; }
  path.shift(); // current cell
  if (path.length && isWalkable(w.grid, dest.x, dest.y)) path[path.length - 1] = { x: dest.x, y: dest.y };
  sim.path = path;
}

export function followPath(sim: Sim, dt: number, speedScale = 1): void {
  if (attrOf(combatOf(sim).bag, 'frozen_action') > 0) return;
  const cold = !!(sim.a.ctl & 2);
  if (!cold) sim.coldPosition = undefined;
  // Share the same rate with observers; cold ignores AI and equipment multipliers.
  sim.a.moveScale = speedScale * (sim.moveScale ?? 1);
  if (!sim.path.length || (cold && (sim.dead || sim.jump || (sim.a.ctl & 1) || sim.speed <= 0))) { sim.coldPosition = undefined; return; }
  let budget = (cold ? coldMovement().velocity : sim.speed * getActiveSpeedConfig().run.distanceScale * sim.a.moveScale) * dt; // items / bùa / chậm (systems/effects.ts)
  const precise = cold && sim.coldPosition?.syncedX === sim.a.x && sim.coldPosition?.syncedY === sim.a.y ? sim.coldPosition : undefined;
  let x = precise?.x ?? sim.a.x, y = precise?.y ?? sim.a.y;
  const startX = x, startY = y;
  while (budget > 0 && sim.path.length) {
    const wp = sim.path[0];
    const before = isoDistance(x, y, wp.x, wp.y);
    const [nx, ny, arrived] = stepToward(x, y, wp.x, wp.y, budget);
    budget -= Math.min(before, budget);
    x = nx; y = ny;
    if (arrived) sim.path.shift();
  }
  if (x !== startX || y !== startY) face(sim, x - startX, y - startY);
  sim.a.x = Math.round(x);
  sim.a.y = Math.round(y);
  if (cold) sim.coldPosition = { x, y, syncedX: sim.a.x, syncedY: sim.a.y };
}

export function face(sim: Sim, dx: number, dy: number): void {
  if (dx || dy) sim.a.dir = direction8(dx, dy);
}

/**
 * Player base run speed. The horse adds its tốc độ chạy (fastwalkrun_p of the horse item) through the attribute bag only
 * while mounted (world/progress.ts equipmentBag → moveScale), so riding / dismounting must refresh the stats.
 */
export function updateSpeed(sim: Sim): void {
  sim.speed = PLAYER_SPEED;
}

const RAND_MOVE_INTERVAL_MS = 333; // ~6 frames at 18 FPS (JX1 randmove)

/** Confused movement (`randmove`, Ma Âm Phệ Phách 723): pick a random walkable direction every ~333ms and walk. */
export function updateConfusedMove(w: World, sim: Sim, dt: number): void {
  if (!sim.path.length || w.now >= (sim.randMoveAt ?? 0)) {
    sim.randMoveAt = w.now + RAND_MOVE_INTERVAL_MS;
    const from = { x: sim.a.x, y: sim.a.y };
    for (let tries = 0; tries < 6; tries++) {
      const angle = w.random() * Math.PI * 2;
      const dist = 70 + w.random() * 70;
      const dest = { x: Math.round(from.x + Math.cos(angle) * dist), y: Math.round(from.y + (Math.sin(angle) * dist) / 2) };
      if (isWalkable(w.grid, dest.x, dest.y) && clearSegment(w.grid, from, dest, true)) {
        sim.path = [dest];
        break;
      }
    }
  }
  followPath(sim, dt);
}
