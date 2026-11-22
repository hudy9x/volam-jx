import { applyState, attr, attrOf, expireStates as expire, getSkill, staticShieldPool, type StateApply } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { syncStates } from './sync.js';
import { refreshStats } from '../progress.js';
import { clearEffects, combatOf, refreshMonsterCombat, refreshMoveScale } from './effects.js';

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

/** Xóa sạch mọi trạng thái dị thường (bùa hại trong states + choáng/làm chậm/độc trong effects). */
export function clearNegativeStates(w: World, sim: Sim): void {
  for (const [id, st] of [...sim.states.entries()]) {
    if (st.kind === 'debuff') sim.states.delete(id);
  }
  sim.randMoveOrigin = undefined;
  sim.randMoveAt = undefined;
  if (sim.effects) clearEffects(w, sim);
}

export function addState(w: World, sim: Sim, st: StateApply & { reflected?: boolean }): void {
  if (sim.dead) return;
  // Thứ tự chuẩn JX1 khi nhận bùa hại từ đối phương:
  // 1. Miễn dịch dị thường (Võ Đang 738 ignorenegativestate_p >= 100) -> 2. Bỏ qua bùa (Thiên Vương 708) -> 3. Phản bùa (Thiếu Lâm 709).
  if (st.kind === 'debuff') {
    const bag = combatOf(sim).bag;
    const immunePct = attrOf(bag, 'ignorenegativestate_p');
    if (immunePct >= 100) return;
    if (st.by && st.by !== sim.id) {
      const ignorePct = attrOf(bag, 'ignoreskill_p');
      if (ignorePct > 0 && w.random() * 100 < ignorePct) return;
      if (!st.reflected) {
        const returnPct = attrOf(bag, 'returnskill_p');
        if (returnPct > 0 && w.random() * 100 < returnPct) {
          const source = w.sims.get(st.by);
          if (source && !source.dead) {
            addState(w, source, { ...st, by: sim.id, reflected: true });
          }
          return;
        }
      }
    }
  }
  const s = getSkill(st.skill);
  // Xuất Ứ Bất Nhiễm (716 đồng đội / 738 bản thân): xóa sạch trạng thái dị thường ngay khi nhận buff.
  if (st.kind === 'buff' && s?.attrs?.ignorenegativestate_p) clearNegativeStates(w, sim);
  const prev = sim.states.get(st.skill);
  const wasActive = prev !== undefined && prev.until > w.now;
  if (applyState(sim.states, st, w.now)) w.events.push({ t: 'st', id: sim.id, skill: st.skill, kind: st.kind });
  if (s?.attrs?.randmove) {
    sim.pending = null;
    sim.queuedMove = undefined;
    sim.lockedAttack = undefined;
    sim.a.attackTarget = '';
    sim.path = [];
    sim.randMoveAt = 0;
    sim.randMoveOrigin ??= { x: sim.a.x, y: sim.a.y };
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

function hasRandMove(sim: Sim): boolean {
  for (const skillId of sim.states.keys()) {
    if (getSkill(skillId)?.attrs?.randmove) return true;
  }
  return false;
}

export function removeState(w: World, sim: Sim, skill: number): void {
  if (!sim.states.delete(skill)) return;
  if (!hasStaticShield(sim)) sim.shieldHp = 0;
  if (!hasRandMove(sim)) { sim.randMoveOrigin = undefined; sim.randMoveAt = undefined; }
  syncStates(sim);
  statesChanged(w, sim);
}

export function clearStates(sim: Sim): void {
  sim.states.clear();
  sim.shieldHp = 0;
  sim.randMoveOrigin = undefined;
  sim.randMoveAt = undefined;
  syncStates(sim);
  if (sim.kind === 'player' && sim.progress) refreshStats(sim);
  else if (sim.kind === 'monster' && sim.def) refreshMonsterCombat(sim);
}

export function expireStates(w: World, sim: Sim): void {
  if (!expire(sim.states, w.now)) return;
  if (!hasStaticShield(sim)) sim.shieldHp = 0;
  if (!hasRandMove(sim)) { sim.randMoveOrigin = undefined; sim.randMoveAt = undefined; }
  syncStates(sim);
  statesChanged(w, sim);
}
