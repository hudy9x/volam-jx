import { applyState, expireStates as expire, type StateApply } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { syncStates } from './sync.js';
import { refreshStats } from '../progress.js';
import { refreshMonsterCombat, refreshMoveScale } from './effects.js';

// Trạng thái (bùa lợi / bùa hại, hào quang) with their effects: the rules live in packages/shared/src/status/ (each
// attribute of the state at the caster's level, its own duration); this file applies them to Sims, syncs them and
// recomputes the stats they change (players: progress.refreshStats; monsters: effects.refreshMonsterCombat).

/** Stats again after the states changed. */
export function statesChanged(w: World, sim: Sim): void {
  if (sim.kind === 'player' && sim.progress) { refreshStats(sim); w.hooks.progress(sim); }
  else if (sim.kind === 'monster' && sim.def) refreshMonsterCombat(sim);
  refreshMoveScale(w, sim);
}

export function addState(w: World, sim: Sim, st: StateApply): void {
  if (sim.dead) return;
  if (applyState(sim.states, st, w.now)) w.events.push({ t: 'st', id: sim.id, skill: st.skill, kind: st.kind });
  syncStates(sim);
  statesChanged(w, sim);
}

export function removeState(w: World, sim: Sim, skill: number): void {
  if (!sim.states.delete(skill)) return;
  syncStates(sim);
  statesChanged(w, sim);
}

export function clearStates(sim: Sim): void {
  sim.states.clear();
  syncStates(sim);
  if (sim.kind === 'player' && sim.progress) refreshStats(sim);
  else if (sim.kind === 'monster' && sim.def) refreshMonsterCombat(sim);
}

export function expireStates(w: World, sim: Sim): void {
  if (!expire(sim.states, w.now)) return;
  syncStates(sim);
  statesChanged(w, sim);
}
