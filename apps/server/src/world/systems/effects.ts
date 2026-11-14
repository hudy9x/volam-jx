import {
  attackTiming, mergeBag, mergePoison, monsterCombat, moveFactor, passiveBag, skillBonuses, stateBag,
  type CombatStats, type HitEffects, type PoisonRun,
} from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { playOnce } from './anim.js';
import { syncEffects } from './sync.js';

// Combat stats of monsters and the control effects on every Sim (choáng, chậm, độc, co giật). The rules are in
// packages/shared/src/formulas/ (combat.ts, effects.ts, speed.ts; docs/formulas/effects.md); this file applies them.
// Players' combat stats come from world/progress.ts refreshStats.

/** Control effects running on a Sim. */
export interface Effects {
  stunUntil: number;
  slowUntil: number;
  poison: PoisonRun | null;
  /** Who poisoned it last (exp credit for the damage). */
  poisonBy: string;
}

export const noEffects = (): Effects => ({ stunUntil: 0, slowUntil: 0, poison: null, poisonBy: '' });

const slowed = (w: World, sim: Sim) => (sim.effects?.slowUntil ?? 0) > w.now;

/** Monster combat stats: level curve + flat resist + its states (and passives). */
export function refreshMonsterCombat(sim: Sim): void {
  const def = sim.def!;
  const bag = mergeBag(passiveBag(sim.skills, -1), stateBag(sim.states, -1));
  sim.combat = monsterCombat(sim.a.level, def.element, Math.round(def.resist * 100), def.hitRecover ?? 0, bag, skillBonuses(sim.skills));
}

/** Combat stats of any Sim (fallback for Sims made before their stats: a level-1 monster). */
export function combatOf(sim: Sim): CombatStats {
  if (!sim.combat) {
    if (sim.kind === 'monster' && sim.def) refreshMonsterCombat(sim);
    else sim.combat = monsterCombat(Math.max(1, sim.a.level), sim.element, 0, 0, {});
  }
  return sim.combat!;
}

/** Movement factor (fastwalkrun_p of items / bùa, slow) used by systems/movement.ts. */
export function refreshMoveScale(w: World, sim: Sim): void {
  sim.moveScale = moveFactor(combatOf(sim).bag, slowed(w, sim));
}

/** Snapshot the resolved attack phase at the start of the action. */
export const castTiming = (w: World, sim: Sim, external: boolean) => attackTiming(combatOf(sim).bag, external, slowed(w, sim));

/** Put a landed hit's effects on `target`. */
export function applyHitEffects(w: World, attacker: Sim, target: Sim, fx: HitEffects): void {
  if (target.dead) return;
  const e = (target.effects ??= noEffects());
  if (fx.stunMs > 0 && e.stunUntil <= w.now) { // no new stun while stunned (SRC)
    e.stunUntil = w.now + fx.stunMs;
    target.castUntil = Math.max(target.castUntil, e.stunUntil);
    target.path = [];
    target.pending = null;
    w.events.push({ t: 'ctl', id: target.id, kind: 'stun', ms: fx.stunMs });
  }
  if (fx.slowMs > 0) {
    const fresh = e.slowUntil <= w.now;
    e.slowUntil = Math.max(e.slowUntil, w.now + fx.slowMs);
    if (fresh) { refreshMoveScale(w, target); w.events.push({ t: 'ctl', id: target.id, kind: 'slow', ms: fx.slowMs }); }
  }
  if (fx.poison) {
    const fresh = !e.poison || e.poison.endsAt <= w.now;
    e.poison = mergePoison(e.poison, fx.poison, w.now, target.kind === 'player');
    e.poisonBy = attacker.id;
    if (fresh) w.events.push({ t: 'ctl', id: target.id, kind: 'poison', ms: fx.poison.totalMs });
  }
  if (fx.hurtMs > 0 && e.stunUntil <= w.now) {
    w.engine.interrupt(target.id);
    target.castUntil = w.now + fx.hurtMs;
    target.path = [];
    target.pending = null;
    playOnce(w, target, 'hurt', fx.hurtMs / 1000);
  }
  syncEffects(w, target);
}

/** Every tick for Sims with effects: poison ticks, ends of stun / slow. `hit` deals poison damage (combat.applyHit). */
export function updateEffects(w: World, sim: Sim, hit: (by: Sim | undefined, dmg: number) => void): void {
  const e = sim.effects;
  if (!e) return;
  if (e.poison) {
    const p = e.poison;
    while (p.nextAt <= w.now && p.nextAt <= p.endsAt && !sim.dead) {
      p.nextAt += p.periodMs;
      hit(w.sims.get(e.poisonBy), p.tick);
    }
    if (p.endsAt <= w.now) e.poison = null;
  }
  if (e.slowUntil && e.slowUntil <= w.now) { e.slowUntil = 0; refreshMoveScale(w, sim); }
  if (e.stunUntil && e.stunUntil <= w.now) e.stunUntil = 0;
  syncEffects(w, sim);
  if (!e.poison && !e.slowUntil && !e.stunUntil) sim.effects = undefined;
}

/** Death, revive: nothing keeps running. */
export function clearEffects(w: World, sim: Sim): void {
  sim.effects = undefined;
  refreshMoveScale(w, sim);
  syncEffects(w, sim);
}

