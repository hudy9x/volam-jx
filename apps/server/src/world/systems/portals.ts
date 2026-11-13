import { isoDistance, nearestWalkable } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';

// Portals of the map (maps catalog): stepping into one moves the player to another map (MapRoom does the move).

/** Snap portal positions onto walkable ground once, when the world starts. */
export function snapPortals(w: World): void {
  for (const p of w.meta.portals) [p.x, p.y] = nearestWalkable(w.grid, p.x, p.y);
}

export function checkPortals(w: World, sim: Sim): void {
  for (const portal of w.meta.portals) {
    if (isoDistance(sim.a.x, sim.a.y, portal.x, portal.y) <= portal.radius) {
      w.hooks.transfer(sim, portal.toMap, portal.toX, portal.toY);
      return;
    }
  }
}
