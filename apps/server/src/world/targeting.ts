import { attrOf, combatPairRules, canAttack, clearSegment, isoDistance, type Camp, type CombatantInfo } from '@vltk/shared';
import type { Sim } from './entity.js';
import { combatOf } from './systems/effects.js';
import type { World } from './World.js';

// Who may hit whom on this map (shared canAttack + training dummies never fight) and nearest-enemy searches.

export const isHidden = (sim: Sim): boolean => !!sim.a.stealth || attrOf(combatOf(sim).bag, 'hide') > 0;
export const isConfused = (sim: Sim): boolean => attrOf(combatOf(sim).bag, 'randmove') > 0;

function info(sim: Sim, deadOverride?: boolean): CombatantInfo {
  return {
    kind: sim.kind, id: sim.id, dead: deadOverride ?? sim.dead, pk: sim.a.pk,
    camp: (sim.a.camp || 'new') as Camp, team: sim.a.team,
    battleCamp: (sim.a.battleCamp || '') as 'tong' | 'kim' | '',
    protectedUntil: sim.a.protectedUntil,
  };
}

/**
 * Allies for bùa lợi / hào quang / healing of skills: the same kind, not attackable, and for players the same team or the
 * same camp (name colour) — USER 2026-11-12. Trong Tống Kim: cùng battleCamp là đồng minh.
 */
export function friendly(w: World, a: Sim, b: Sim): boolean {
  if (b.dead) return false;
  if (a.a.battleCamp || b.a.battleCamp) {
    return !!a.a.battleCamp && a.a.battleCamp === b.a.battleCamp;
  }
  if (a.kind !== b.kind) return false;
  if (a === b || a.kind === 'monster') return true;
  if (attackable(w, a, b)) return false;
  return (!!a.a.team && a.a.team === b.a.team) || (a.a.camp || 'new') === (b.a.camp || 'new');
}

export function attackable(w: World, attacker: Sim, target: Sim, allowDeadAttacker = false): boolean {
  if (attacker.def?.dummy) return false;
  if (isHidden(target)) return false;
  return canAttack(info(attacker, allowDeadAttacker ? false : undefined), info(target), combatPairRules(w.meta, attacker.a, target.a, w.rules), w.now);
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

/** Closest enemy (player or opposing battlefield NPC) a Tống Kim NPC can see. */
export const nearestBattleEnemy = (w: World, sim: Sim, radius: number) =>
  nearest(w, sim, sim.a.x, sim.a.y, radius, other => clearSegment(w.grid, sim.a, other.a, false));
