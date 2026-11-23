import { combatRulesAt, ENMITY_COUNTDOWN_MS, HORSES, getSkill, isTkBattleMap, levelOf, maxLevelOf, skillCategory, type PkMode } from '@vltk/shared';
import { attackable, isConfused, isHidden } from './targeting.js';
import type { Sim } from './entity.js';
import { refreshStats } from './progress.js';
import { setPath, updateSpeed } from './systems/movement.js';
import type { World } from './World.js';

// Orders of a player (C2S messages, already checked for shape by MapRoom). Casting is only queued here;
// players.ts carries it out on the next ticks (walk into range, wait for the cooldown).

/** Stop following another player (silent unless `reason` is provided). */
export function clearFollow(w: World, sim: Sim, reason?: string): void {
  if (!sim.follow && !sim.a.followTarget) return;
  sim.follow = undefined;
  sim.a.followTarget = '';
  if (reason) w.hooks.notify(sim, reason);
}

/** Clear Cừu sát (enmity 1v1) on `sim` and its paired opponent (if still on this map). */
export function clearEnmity(w: World, sim: Sim, selfNotice?: string, otherNotice?: string): void {
  const prev = sim.enmity;
  const otherId = prev?.targetId || sim.a.enmityTarget;
  sim.enmity = undefined;
  sim.a.enmityTarget = '';
  sim.a.enmityAt = 0;
  if (selfNotice && prev) w.hooks.notify(sim, selfNotice);
  if (!otherId) return;
  const other = w.sims.get(otherId);
  if (other && (other.enmity?.targetId === sim.id || other.a.enmityTarget === sim.id)) {
    other.enmity = undefined;
    other.a.enmityTarget = '';
    other.a.enmityAt = 0;
    if (otherNotice) w.hooks.notify(other, otherNotice);
  }
}

/** Click on the ground: walk there (cancels a queued attack and follow). */
export function commandMove(w: World, sim: Sim, x: number, y: number): void {
  if (sim.dead || sim.a.stallTitle || isConfused(sim) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  clearFollow(w, sim);
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
  const skillDef = getSkill(skillId);
  if (sim.dead || sim.a.stallTitle || (isConfused(sim) && !skillDef?.attrs?.ignorenegativestate_p) || !Number.isFinite(x) || !Number.isFinite(y)) return;
  clearFollow(w, sim);
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

/** Follow another player on the same map (`targetId` empty/omitted cancels). */
export function commandFollow(w: World, sim: Sim, targetId?: string): void {
  const id = typeof targetId === 'string' ? targetId.trim() : '';
  if (!id) { clearFollow(w, sim, 'Đã dừng theo sau.'); return; }
  if (sim.dead) return;
  if (sim.a.stallTitle) { w.hooks.notify(sim, 'Đang bày bán không thể theo sau.'); return; }
  if (isConfused(sim)) return;
  if (id === sim.id) return;
  const target = w.sims.get(id);
  if (!target || target.kind !== 'player' || target.dead || isHidden(target)) {
    w.hooks.notify(sim, 'Không tìm thấy mục tiêu để theo sau.');
    return;
  }
  sim.pending = null;
  sim.lockedAttack = undefined;
  sim.pickup = undefined;
  sim.queuedMove = undefined;
  sim.a.attackTarget = '';
  sim.follow = { targetId: target.id, repathAt: 0 };
  sim.a.followTarget = target.id;
  w.hooks.notify(sim, `Đang theo sau ${target.a.name}.`);
}

/** Toggle or start Cừu sát (enmity 1v1, 10s countdown) with another player (`targetId` empty/omitted cancels). */
export function commandEnmity(w: World, sim: Sim, targetId?: string): void {
  const id = typeof targetId === 'string' ? targetId.trim() : '';
  if (!id) {
    if (!sim.enmity) return;
    clearEnmity(w, sim, 'Đã hủy trạng thái cừu sát.', `${sim.a.name} đã hủy cừu sát với bạn.`);
    return;
  }
  if (sim.dead) return;
  if (sim.a.battleCamp || isTkBattleMap(w.meta.id)) {
    w.hooks.notify(sim, 'Trong chiến trường Tống Kim không cần cừu sát.');
    return;
  }
  if (!w.rules.pvp) {
    w.hooks.notify(sim, 'Bản đồ này không cho phép cừu sát.');
    return;
  }
  if (combatRulesAt(w.meta, sim.a, w.rules).safe) {
    w.hooks.notify(sim, 'Trong khu vực an toàn không thể bật cừu sát.');
    return;
  }
  if (sim.a.camp === 'new') {
    w.hooks.notify(sim, 'Tân thủ (chữ trắng) không thể bật cừu sát.');
    return;
  }
  if (id === sim.id) return;
  const target = w.sims.get(id);
  if (!target || target.kind !== 'player' || target.dead || isHidden(target)) {
    w.hooks.notify(sim, 'Không tìm thấy mục tiêu để cừu sát.');
    return;
  }
  if (target.a.battleCamp) {
    w.hooks.notify(sim, 'Trong chiến trường Tống Kim không cần cừu sát.');
    return;
  }
  if (target.a.camp === 'new') {
    w.hooks.notify(sim, 'Không thể cừu sát tân thủ (chữ trắng).');
    return;
  }
  if (sim.a.team && sim.a.team === target.a.team) {
    w.hooks.notify(sim, 'Không thể cừu sát đồng đội trong tổ đội.');
    return;
  }
  if (sim.enmity?.targetId === target.id) {
    const remain = Math.max(0, Math.ceil((sim.enmity.activeAt - w.now) / 1000));
    w.hooks.notify(sim, remain > 0 ? `Đang đếm ngược cừu sát ${target.a.name} (${remain} giây).` : `Đang trong trạng thái cừu sát với ${target.a.name}.`);
    return;
  }
  if (target.enmity && target.enmity.targetId !== sim.id) {
    w.hooks.notify(sim, `${target.a.name} đang cừu sát với người khác.`);
    return;
  }
  if (sim.enmity) clearEnmity(w, sim, undefined, `${sim.a.name} đã hủy cừu sát với bạn.`);
  const activeAt = w.now + ENMITY_COUNTDOWN_MS;
  sim.enmity = { targetId: target.id, activeAt, announcedActive: false };
  sim.a.enmityTarget = target.id;
  sim.a.enmityAt = activeAt;
  target.enmity = { targetId: sim.id, activeAt, announcedActive: false };
  target.a.enmityTarget = sim.id;
  target.a.enmityAt = activeAt;
  const sec = Math.round(ENMITY_COUNTDOWN_MS / 1000);
  w.hooks.notify(sim, `Đã bật cừu sát ${target.a.name}! Bắt đầu sau ${sec} giây.`);
  w.hooks.notify(target, `${sim.a.name} đã bật cừu sát bạn! Bắt đầu sau ${sec} giây.`);
}
