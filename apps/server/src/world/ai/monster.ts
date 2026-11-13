import { chooseSkill, isWalkable, isoDistance } from '@vltk/shared';
import type { Sim } from '../entity.js';
import { castNow } from '../systems/combat.js';
import { face, followPath, setPath } from '../systems/movement.js';
import { syncVitals } from '../systems/sync.js';
import { attackable, nearestPlayer } from '../targeting.js';
import type { World } from '../World.js';
import { leashes } from './boss.js';

// Monster behaviour, once per tick: see a player -> chase -> attack with its skills -> run home past the leash
// (bosses: ai/boss.ts). The skills are the same engine as players'; the AI only picks which one.

/** Training dummies heal to full this long after the last hit. */
const DUMMY_HEAL_MS = 3000;

export function updateMonster(w: World, sim: Sim, dt: number): void {
  const def = sim.def!;
  const home = sim.home!;
  if (def.dummy) {
    if (sim.hp < sim.a.maxHp && w.now - sim.lastDamagedAt > DUMMY_HEAL_MS) { sim.hp = sim.a.maxHp; syncVitals(sim); }
    return;
  }
  if (w.now < sim.castUntil) return;

  if (sim.returning) {
    followPath(sim, dt);
    if (!sim.path.length) {
      sim.returning = false;
      sim.hp = sim.a.maxHp;
      syncVitals(sim);
    }
    return;
  }

  let target = sim.target ? w.sims.get(sim.target) : undefined;
  if (target && !attackable(w, sim, target)) target = undefined;
  if (!target) {
    target = nearestPlayer(w, sim, def.vision);
    sim.target = target?.id ?? null;
  }

  if (target) {
    if (leashes(def) && isoDistance(sim.a.x, sim.a.y, home.x, home.y) > def.leash) {
      sim.target = null;
      sim.plan = null;
      sim.returning = true;
      setPath(w, sim, home, true);
      return;
    }
    const dist = isoDistance(sim.a.x, sim.a.y, target.a.x, target.a.y);
    // Same skills and engine as players; the AI only picks which one (bosses: a random one each attack).
    sim.plan ??= chooseSkill(w.engine, sim, dist, w.random);
    const reach = sim.plan?.range ?? 60;
    if (dist <= reach) {
      sim.path = [];
      face(sim, target.a.x - sim.a.x, target.a.y - sim.a.y);
      if (sim.plan && w.now >= (sim.nextAttack ?? 0) && w.engine.ready(sim, sim.plan.id)) {
        sim.nextAttack = w.now + def.attackCooldown * 1000;
        castNow(w, sim, sim.plan.id, target, { x: target.a.x, y: target.a.y });
        sim.plan = null;
      }
      return;
    }
    if (w.now >= (sim.repathAt ?? 0) || !sim.path.length) {
      sim.repathAt = w.now + 500;
      setPath(w, sim, { x: target.a.x, y: target.a.y });
    }
    followPath(sim, dt);
    return;
  }

  // Idle: wander a little around home.
  sim.plan = null;
  if (!sim.path.length && w.now >= (sim.wanderAt ?? 0)) {
    sim.wanderAt = w.now + 3000 + Math.random() * 4000;
    const tx = home.x + (Math.random() - 0.5) * 120, ty = home.y + (Math.random() - 0.5) * 60;
    if (isWalkable(w.grid, tx, ty)) sim.path = [{ x: tx, y: ty }];
  }
  followPath(sim, dt, 0.4);
}
