import { combatRulesAt, HORSES, getSkill, levelOf, maxLevelOf, skillCategory, type PkMode } from '@vltk/shared';
import { attackable, isConfused } from './targeting.js';
import type { Sim } from './entity.js';
import { refreshStats } from './progress.js';
import { setPath, updateSpeed } from './systems/movement.js';
import type { World } from './World.js';

// Orders of a player (C2S messages, already checked for shape by MapRoom). Casting is only queued here;
// players.ts carries it out on the next ticks (walk into range, wait for the cooldown).

/** Click on the ground: walk there (cancels a queued attack). */
export function commandMove(w: World, sim: Sim, x: number, y: number): void {
  if (sim.dead || sim.a.stallTitle || isConfused(sim) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  sim.pending = null;
  sim.lockedAttack = undefined;
  sim.pickup = undefined;
  sim.path = [];
  sim.a.attackTarget = '';
  if (w.now < sim.castUntil) { sim.queuedMove = { x, y }; return; }
  sim.queuedMove = undefined;
  setPath(w, sim, { x, y });
}

/** Use a skill on a target / point. Out of range => walk closer first. `lock` = keep attacking that target. */
export function commandCast(w: World, sim: Sim, skillId: number, targetId: string | undefined, x: number, y: number, lock = false,
  reach?: number): void {
  if (sim.dead || sim.a.stallTitle || isConfused(sim) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  sim.queuedMove = undefined;
  if (sim.slotAura && getSkill(skillId)?.aura) {
    w.hooks.notify(sim, 'Hào quang đang đặt ở ô tay trái / phải: tự bật, đổi chiêu ở ô đó để thay hoặc tắt.');
    return;
  }
  if (combatRulesAt(w.meta, sim.a, w.rules).safe) { w.hooks.notify(sim, 'Trong thành không thể động võ.'); return; }
  const pending = { skill: skillId, targetId, x, y, repathAt: 0, lock: lock && !!targetId, reach: targetId ? reach : undefined };
  const skill = getSkill(skillId);
  const target = targetId ? w.sims.get(targetId) : undefined;
  if (pending.lock && skill && skillCategory(skill) === 'attack' && (levelOf(sim, skillId) ?? 0) > 0 && target && attackable(w, sim, target)) {
    sim.lockedAttack = { ...pending };
    sim.pickup = undefined;
    // Replace the old enemy even when the new skill must wait for mana / equipment.
    sim.pending = null;
    sim.path = [];
  }
  const err = w.engine.check(sim, skillId);
  if (err) { w.hooks.notify(sim, err); return; }
  sim.pending = pending;
}

/**
 * Hào quang on a hand slot (0 = none): world/players.ts holdSlotAura keeps it on. Taking it off the slot switches
 * it off; a skill that is not a learned aura is ignored.
 */
export function setSlotAura(w: World, sim: Sim, skillId: number): void {
  const id = skillId > 0 && getSkill(skillId)?.aura && sim.skills.has(skillId) ? skillId : undefined;
  if (id === sim.slotAura) return;
  const old = sim.slotAura;
  sim.slotAura = id;
  if (!id && old !== undefined && w.engine.auraOf(sim) === old) w.engine.holdAura(sim, undefined);
}

/** Dev: change the level of a learned skill. */
export function setSkillLevel(sim: Sim, skillId: number, level: number): boolean {
  const s = getSkill(skillId);
  if (!s || !sim.skills.has(skillId) || !Number.isFinite(level)) return false;
  sim.skills.set(skillId, Math.max(1, Math.min(maxLevelOf(s), Math.round(level))));
  return true;
}

/** PK mode (shared combat/rules.ts): 0 Luyện công, 1 Chiến đấu (other camps), 2 Đồ sát (everyone but the team). */
export function setPk(w: World, sim: Sim, mode: number): void {
  if (sim.dead) return;
  const m = Math.max(0, Math.min(2, Math.floor(mode) || 0)) as PkMode;
  if (m && !combatRulesAt(w.meta, sim.a, w.rules).pvp) { w.hooks.notify(sim, 'Bản đồ này không cho phép PK.'); return; }
  if (m && sim.a.camp === 'new') { w.hooks.notify(sim, 'Tân thủ (chưa vào môn phái, chữ trắng) không thể PK.'); return; }
  sim.a.pk = m;
  w.hooks.notify(sim, [
    'Chế độ Luyện công: không tấn công người chơi.',
    'Chế độ Chiến đấu: tấn công được người chơi khác màu chữ (khác phe), trừ tổ đội.',
    'Chế độ Đồ sát: tấn công được mọi người chơi, trừ tổ đội.',
  ][m]);
}

/** Mount / dismount the horse in the horse slot. */
export function setMounted(w: World, sim: Sim, on: boolean): void {
  if (sim.dead || on === sim.a.mounted) return;
  if (sim.a.stallTitle) { w.hooks.notify(sim, 'Đang bày bán không thể lên/xuống ngựa.'); return; }
  const horse = HORSES[sim.a.horse];
  if (on && !horse) { w.hooks.notify(sim, 'Chưa có ngựa: mua ở Bán ngựa trong thành rồi mặc vào ô Ngựa.'); return; }
  sim.a.mounted = on;
  updateSpeed(sim);
  if (sim.progress) { refreshStats(sim); w.hooks.progress(sim); } // the horse's tốc độ chạy counts only while riding
  w.hooks.notify(sim, on ? `Đã lên ngựa ${horse.name}.` : 'Đã xuống ngựa.');
}
