import { isoDistance, nearestWalkable } from '@vltk/shared';
import type { Sim } from '../entity.js';
import { tongKim } from '../tongkim.js';
import type { World } from '../World.js';

// Portals of the map (maps catalog): stepping into one moves the player to another map (MapRoom does the move),
// or teleports within the same map (e.g. Tống Kim battle portals).

/** Snap portal positions onto walkable ground once, when the world starts. */
export function snapPortals(w: World): void {
  for (const p of w.meta.portals) [p.x, p.y] = nearestWalkable(w.grid, p.x, p.y);
}

export function checkPortals(w: World, sim: Sim): void {
  for (const portal of w.meta.portals) {
    if (isoDistance(sim.a.x, sim.a.y, portal.x, portal.y) <= portal.radius) {
      if (portal.toMap === w.meta.id) {
        if (w.meta.id === tongKim.battleMapId && tongKim.useBattlePortal(w, sim, portal)) return;
        const [x, y] = nearestWalkable(w.grid, portal.toX, portal.toY);
        sim.a.x = x;
        sim.a.y = y;
        sim.path = [];
        return;
      }
      w.hooks.transfer(sim, portal.toMap, portal.toX, portal.toY);
      return;
    }
  }
}
