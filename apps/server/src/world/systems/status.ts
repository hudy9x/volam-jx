import { applyState, attr, expireStates as expire, getSkill, staticShieldPool, type StateApply } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { syncStates } from './sync.js';
import { refreshStats } from '../progress.js';
import { refreshMonsterCombat, refreshMoveScale } from './effects.js';

function hasStaticShield(sim: Sim): boolean {
  for (const skillId of sim.states.keys()) {
    const s = getSkill(skillId);
    if (s?.attrs?.staticmagicshield_p) return true;
  }
  return false;
}

/** Stats again after the states changed. */
export function statesChanged(w: World, sim: Sim): void {
  if (sim.kind === 'player' && sim.progress) { refreshStats(sim); w.hooks.progress(sim); }
  else if (sim.kind === 'monster' && sim.def) refreshMonsterCombat(sim);
  refreshMoveScale(w, sim);
}

export function addState(w: World, sim: Sim, st: StateApply): void {
  if (sim.dead) return;
  const prev = sim.states.get(st.skill);
  const wasActive = prev !== undefined && prev.until > w.now;
  if (applyState(sim.states, st, w.now)) w.events.push({ t: 'st', id: sim.id, skill: st.skill, kind: st.kind });
  const s = getSkill(st.skill);
  if (s?.attrs?.randmove) {
    sim.pending = null;
    sim.queuedMove = undefined;
    sim.lockedAttack = undefined;
    sim.a.attackTarget = '';
    sim.path = [];
    sim.randMoveAt = 0;
  }
  const shieldAttr = s ? attr(s, 'staticmagicshield_p', st.level ?? 1) : null;
  // Không nạp đầy lại shieldHp khi cùng skill khiên tĩnh đang còn hiệu lực (vd. Phất Y 2133 → 2134 tick lại mỗi 1s).
  if (!wasActive && shieldAttr && shieldAttr[0] > 0 && sim.a.maxMp > 0) {
    const pool = staticShieldPool(sim.a.maxMp, sim.a.maxHp, shieldAttr[0]);
    sim.shieldHp = Math.max(sim.shieldHp ?? 0, pool);
  }
  syncStates(sim);
  statesChanged(w, sim);
}

export function removeState(w: World, sim: Sim, skill: number): void {
  if (!sim.states.delete(skill)) return;
  if (!hasStaticShield(sim)) sim.shieldHp = 0;
  syncStates(sim);
  statesChanged(w, sim);
}

export function clearStates(sim: Sim): void {
  sim.states.clear();
  sim.shieldHp = 0;
  syncStates(sim);
  if (sim.kind === 'player' && sim.progress) refreshStats(sim);
  else if (sim.kind === 'monster' && sim.def) refreshMonsterCombat(sim);
}

export function expireStates(w: World, sim: Sim): void {
  if (!expire(sim.states, w.now)) return;
  if (!hasStaticShield(sim)) sim.shieldHp = 0;
  syncStates(sim);
  statesChanged(w, sim);
}
