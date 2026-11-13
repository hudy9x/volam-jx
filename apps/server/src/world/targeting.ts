import { canAttack, clearSegment, isoDistance, type Camp, type CombatantInfo } from '@vltk/shared';
import type { Sim } from './entity.js';
import type { World } from './World.js';

// Who may hit whom on this map (shared canAttack + training dummies never fight) and nearest-enemy searches.

function info(sim: Sim): CombatantInfo {
  return { kind: sim.kind, id: sim.id, dead: sim.dead, pk: sim.a.pk, camp: (sim.a.camp || 'new') as Camp, team: sim.a.team, protectedUntil: sim.a.protectedUntil };
}

/**
 * Allies for bùa lợi / hào quang / healing of skills: the same kind, not attackable, and for players the same team or the
 * same camp (name colour) — USER 2026-11-12.
 */
export function friendly(w: World, a: Sim, b: Sim): boolean {
  if (b.dead || a.kind !== b.kind) return false;
  if (a === b || a.kind === 'monster') return true;
  if (attackable(w, a, b)) return false;
  return (!!a.a.team && a.a.team === b.a.team) || (a.a.camp || 'new') === (b.a.camp || 'new');
}

export function attackable(w: World, attacker: Sim, target: Sim): boolean {
  if (attacker.def?.dummy) return false;
  return canAttack(info(attacker), info(target), w.rules, w.now);
}

/** Closest Sim `sim` may hit within `radius` of x,y that also passes `ok`. */
function nearest(w: World, sim: Sim, x: number, y: number, radius: number, ok: (other: Sim) => boolean = () => true): Sim | undefined {
  let best: Sim | undefined, bestDist = radius;
  for (const other of w.sims.values()) {
    if (!attackable(w, sim, other)) continue;
    const d = isoDistance(x, y, other.a.x, other.a.y);
    if (d <= bestDist && ok(other)) { best = other; bestDist = d; }
  }
  return best;
}

/** Closest enemy of `sim` around a point (melee click on the ground). */
export const nearestHostile = (w: World, sim: Sim, x: number, y: number, radius: number) => nearest(w, sim, x, y, radius);

/** Closest player a monster can see (line of sight). */
export const nearestPlayer = (w: World, sim: Sim, radius: number) =>
  nearest(w, sim, sim.a.x, sim.a.y, radius, other => other.kind === 'player' && clearSegment(w.grid, sim.a, other.a, false));
