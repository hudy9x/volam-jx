import {
  TK_SIEGE,
  combatRulesAt, combatPairRules,
  isTangmenTrapSkill,
  levelOf,
  attrOf,
  damageReturn,
  lifeSteal,
  clearSegment,
  getGoldenBossConfig,
  getSkill,
  isWalkable,
  isoDistance,
  nearestWalkable,
  nextGoldenBossSpawnDelayMs,
  type HitResult,
  type Point,
} from '@vltk/shared';
import { onMonsterKilled } from '../ai/boss.js';
import { tongKim } from '../tongkim.js';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { playOnce, setAnim } from './anim.js';
import { face, updateSpeed } from './movement.js';
import { endJump } from './jump.js';
import { clearStates } from './status.js';
import { practice, recordDamage, refreshStats, shareKillExp } from '../progress.js';
import { applyHitEffects, castTiming, clearEffects, combatOf } from './effects.js';
import { dropLoot } from './drops.js';
import { syncVitals } from './sync.js';
import { clearEnmity, clearFollow } from '../commands.js';

// Using skills and taking their results. The shared SkillEngine decides what a skill does and how much it hurts
// (packages/shared/src/skills/); it calls back here (World's EnginePort) to change the Sims.

const CORPSE_SECONDS = 2;

/** Start a skill now (players and monsters alike): the engine fires it, the caster holds the pose. */
export function castNow(w: World, sim: Sim, skillId: number, target: Sim | undefined, aim: Point): void {
  if (combatRulesAt(w.meta, sim.a, w.rules).safe) return;
  const bag = combatOf(sim).bag;
  if (attrOf(bag, 'forbit_attack') > 0 || (attrOf(bag, 'randmove') > 0 && !getSkill(skillId)?.attrs?.ignorenegativestate_p)) return;
  const timing = castTiming(w, sim, skillId);
  const pose = w.engine.cast(sim, skillId, target, aim, timing.cycleMs);
  if (pose.note && sim.kind === 'player') w.hooks.notify(sim, pose.note);
  if (pose.rejected) return;
  if (pose.ms > 0) {
    sim.castUntil = w.now + pose.ms;
    sim.lastAttackAt = w.now;
    playOnce(w, sim, pose.anim, pose.ms / 1000);
  } else {
    sim.castUntil = 0;
    setAnim(sim, 'idle');
  }
  syncVitals(sim);
}

function hasEnemyMinionNearTower(w: World, tower: Sim): boolean {
  for (const s of w.sims.values()) {
    if (s.dead || !s.tkMinionType || s.tkCamp === tower.tkCamp) continue;
    if (isoDistance(tower.a.x, tower.a.y, s.a.x, s.a.y) <= TK_SIEGE.towerRange) return true;
  }
  return false;
}

export function towerHitDamage(w: World, tower: Sim, target: Sim): number {
  const map = (tower.tkTowerHitMap ??= new Map());
  const prev = map.get(target.id);
  if (target.tkMinionType) {
    map.set(target.id, { count: 1, lastAt: w.now });
    const pct = TK_SIEGE.towerMinionHitPct[target.tkMinionType] ?? 0.35;
    return Math.max(1, Math.floor(target.a.maxHp * pct));
  }
  const count = prev && w.now - prev.lastAt <= TK_SIEGE.towerRampResetMs ? prev.count + 1 : 1;
  map.set(target.id, { count, lastAt: w.now });
  const pct = TK_SIEGE.towerPlayerHitPct[Math.min(count - 1, TK_SIEGE.towerPlayerHitPct.length - 1)];
  return Math.max(1, Math.floor(target.a.maxHp * pct));
}

export function applyHit(w: World, attacker: Sim, target: Sim, hit: HitResult & { dot?: boolean; reflected?: boolean }): void {
  // Protect at impact time too: missiles, area hits, reflection and ongoing damage.
  if (combatPairRules(w.meta, attacker.a, target.a, w.rules).safe) return;
  if (target.dead || target.jump) return; // Khinh công in flight: no damage (see World's EnginePort.hostile)
  if (target.tkTowerTier) {
    if (target.tkTowerInvuln || hit.dot) return;
  }
  const targetBag = combatOf(target).bag;
  if (target.a.stealth || attrOf(targetBag, 'invincibility') > 0 || attrOf(targetBag, 'hide') > 0) return; // Dev stealth / Thập Bộ Nhất Sát (2130) / Ngự Tuyết Ẩn (713)
  target.lastDamagedAt = w.now;
  attacker.lastAttackAt = w.now;
  if (target.kind === 'monster' && !target.def?.dummy && !target.target && !target.returning && attacker !== target) target.target = attacker.id;
  if (attacker.tkTowerTier) {
    const map = (attacker.tkTowerHitMap ??= new Map());
    const prev = map.get(target.id);
    if (prev && w.now - prev.lastAt < 350) return;
  }
  if (hit.miss && !attacker.tkTowerTier) { w.events.push({ t: 'hit', id: target.id, dmg: 0, miss: true }); return; }
  let dmg = attacker.tkTowerTier ? towerHitDamage(w, attacker, target) : (hit.dmg > 0 ? Math.floor(hit.dmg) : 0);

  // Lính đẩy đường giảm 50% sát thương nhận từ Người chơi / Bot
  if (target.tkMinionType && attacker.kind === 'player' && dmg > 0) {
    dmg = Math.max(1, Math.floor(dmg * TK_SIEGE.minionPlayerDmgMul));
  }

  // Chống hội đồng & đẩy lén cho Trụ Phá Trụ (Mode 3)
  if (target.tkTowerTier && dmg > 0) {
    if (attacker.tkMinionType === 'siege') dmg *= 2;
    const withMinion = hasEnemyMinionNearTower(w, target);
    if (!withMinion) dmg = Math.max(1, Math.floor(dmg * TK_SIEGE.backdoorDmgMul));
    const secStart = target.tkTowerSecAt ?? 0;
    if (w.now - secStart >= 1000) {
      target.tkTowerSecAt = w.now;
      target.tkTowerSecDmg = 0;
    }
    const cap = Math.max(1, Math.floor(target.a.maxHp * (withMinion ? TK_SIEGE.towerDpsCapPct.withMinion : TK_SIEGE.towerDpsCapPct.backdoor)));
    const used = target.tkTowerSecDmg ?? 0;
    const remain = Math.max(0, cap - used);
    if (remain <= 0) return;
    dmg = Math.min(dmg, remain);
    target.tkTowerSecDmg = used + dmg;
  }

  // Call for Help: người chơi đánh người chơi phe địch trong tầm trụ -> trụ lập tức khóa kẻ tấn công
  if (!hit.dot && !hit.reflected && attacker.kind === 'player' && target.kind === 'player' && target.a.battleCamp && attacker.a.battleCamp && target.a.battleCamp !== attacker.a.battleCamp) {
    for (const s of w.sims.values()) {
      if (s.dead || !s.tkTowerTier || s.tkCamp !== target.a.battleCamp) continue;
      if (isoDistance(s.a.x, s.a.y, target.a.x, target.a.y) <= TK_SIEGE.towerRange && isoDistance(s.a.x, s.a.y, attacker.a.x, attacker.a.y) <= TK_SIEGE.towerRange) {
        s.tkTowerCallForHelp = { attackerId: attacker.id, until: w.now + TK_SIEGE.towerCallForHelpMs };
      }
    }
  }
  // Đòn bắn của Trụ bỏ qua toàn bộ Hộ Thuẫn Nội Lực (staticmagicshield_p và manashield_p)
  if (!hit.dot && !attacker.tkTowerTier && target.shieldHp && target.shieldHp > 0 && dmg > 0) {
    const absorb = Math.floor(Math.min(target.shieldHp, dmg));
    target.shieldHp -= absorb;
    dmg -= absorb;
  }
  const shield = Math.min(100, attrOf(combatOf(target).bag, 'manashield_p'));
  if (!hit.dot && !attacker.tkTowerTier && shield > 0 && target.mp > 0 && dmg > 0) {
    const fromMp = Math.min(target.mp, Math.floor((dmg * shield) / 100));
    target.mp -= fromMp;
    dmg -= fromMp;
  }
  recordDamage(target, attacker, Math.min(dmg, Math.max(0, target.hp)));
  if (!hit.dot) practice(w, attacker, hit.skill);
  target.hp -= dmg;
  // Hấp Tinh Yểm (poison2decmana_p, Ngũ Độc 719): độc sát trừ thêm nội lực theo % sát thương độc mỗi tick.
  if (hit.dot && dmg > 0 && target.mp > 0) {
    const decManaPct = attrOf(targetBag, 'poison2decmana_p');
    if (decManaPct > 0) {
      const manaLoss = Math.floor((dmg * decManaPct) / 100);
      if (manaLoss > 0) target.mp = Math.max(0, target.mp - manaLoss);
    }
  }
  w.events.push({ t: 'hit', id: target.id, dmg, crit: hit.crit || undefined, dot: hit.dot || undefined, fatal: hit.fatal || undefined });

  // Hút sinh lực / nội lực (formulas/damage.ts lifeSteal): skill + weapon / bùa % of a direct hit's damage.
  if (!hit.dot && !hit.reflected && !attacker.tkTowerTier && attacker !== target && !attacker.dead && dmg > 0) {
    const steal = lifeSteal(Math.min(dmg, dmg + Math.min(0, target.hp)), combatOf(attacker).bag, getSkill(hit.skill ?? 0), levelOf(attacker, hit.skill ?? 0) ?? 1);
    if (steal.hp > 0) { attacker.hp = Math.min(attacker.a.maxHp, attacker.hp + steal.hp); w.events.push({ t: 'heal', id: attacker.id, v: steal.hp }); }
    if (steal.mp > 0) attacker.mp = Math.min(attacker.a.maxMp, attacker.mp + steal.mp);
    if (steal.hp > 0 || steal.mp > 0) syncVitals(attacker);
  }

  // Phản đòn (formulas/damage.ts damageReturn): bẫy Đường Môn (90/150 và mọi bẫy) không bị phản đòn.
  const noReflectTrap = isTangmenTrapSkill(hit.skill);
  if (!hit.dot && !hit.reflected && !attacker.tkTowerTier && !noReflectTrap && attacker !== target && !attacker.dead && dmg > 0) {
    const back = damageReturn(dmg, combatOf(target).bag, combatOf(attacker).bag, !!getSkill(hit.skill ?? 0)?.melee);
    if (back > 0) applyHit(w, target, attacker, { dmg: back, crit: false, reflected: true });
  }
  // Phản sát thương độc (poisondamagereturn_p, Thiếu Lâm 709): bẫy Đường Môn không bị phản độc.
  if (hit.dot && !hit.reflected && !noReflectTrap && attacker !== target && !attacker.dead && dmg > 0) {
    const poisonReturnPct = attrOf(targetBag, 'poisondamagereturn_p');
    if (poisonReturnPct > 0) {
      const back = Math.floor((dmg * poisonReturnPct) / 100);
      if (back > 0) applyHit(w, target, attacker, { dmg: back, crit: false, reflected: true });
    }
  }
  if (target.hp <= 0) {
    kill(w, target, attacker);
    return;
  }
  // Sóng Xung Chấn 360° của Trụ mỗi mốc mất 25% HP (75%, 50%, 25%) -> 40% maxHP xuyên khiên + choáng 1.5s toàn bộ người chơi địch trong tầm
  if (target.tkTowerTier && target.a.maxHp > 0) {
    const ratio = target.hp / target.a.maxHp;
    const stage = ratio <= 0.25 ? 3 : ratio <= 0.50 ? 2 : ratio <= 0.75 ? 1 : 0;
    const prevStage = target.tkTowerPulseStage ?? 0;
    if (stage > prevStage) {
      target.tkTowerPulseStage = stage;
      for (const p of [...w.sims.values()]) {
        if (p.dead || p.kind !== 'player' || !p.a.battleCamp || p.a.battleCamp === target.tkCamp) continue;
        if (isoDistance(target.a.x, target.a.y, p.a.x, p.a.y) > TK_SIEGE.towerRange) continue;
        w.events.push({ t: 'cast', id: target.id, skill: 1081, x: p.a.x, y: p.a.y });
        const pulseDmg = Math.max(1, Math.floor(p.a.maxHp * TK_SIEGE.towerPulsePct));
        p.hp -= pulseDmg;
        w.events.push({ t: 'hit', id: p.id, dmg: pulseDmg, fatal: p.hp <= 0 || undefined });
        if (p.hp <= 0) {
          kill(w, p, target);
        } else {
          applyHitEffects(w, target, p, { stunMs: TK_SIEGE.towerPulseStunMs, slowMs: 0, hurtMs: 0, poison: null });
          syncVitals(p);
        }
      }
    }
  }
  // Choáng / chậm / độc / co giật of the hit (formulas/effects.ts → systems/effects.ts); Trụ miễn nhiễm khống chế.
  if (hit.effects && !target.tkTowerTier) applyHitEffects(w, attacker, target, hit.effects, hit.skill);
  syncVitals(target);
}

export function heal(w: World, target: Sim, amount: number): void {
  if (target.dead || target.tkTowerTier) return;
  const boost = 1 + Math.max(0, attrOf(combatOf(target).bag, 'lifereplenish_p')) / 100;
  const before = target.hp;
  target.hp = Math.min(target.a.maxHp, target.hp + amount * boost);
  const v = Math.round(target.hp - before);
  if (v > 0) w.events.push({ t: 'heal', id: target.id, v });
  syncVitals(target);
}

export function kill(w: World, target: Sim, killer: Sim | undefined): void {
  target.hp = 0;
  target.dead = true;
  target.path = [];
  target.pending = null;
  target.lockedAttack = undefined;
  target.a.attackTarget = '';
  if (target.kind === 'player') {
    clearFollow(w, target);
    clearEnmity(w, target, 'Trạng thái cừu sát đã kết thúc.', 'Trạng thái cừu sát đã kết thúc.');
  }
  target.castUntil = 0;
  endJump(target);
  target.potions = undefined;
  clearEffects(w, target);
  w.engine.cancel(target.id);
  w.engine.onDeath(target, killer);
  clearStates(target);
  if (target.a.mounted) { target.a.mounted = false; updateSpeed(target); if (target.progress) refreshStats(target); }
  // Dead Sims keep their pose in resolveAnim; the client times die from its sprite frames.
  playOnce(w, target, 'die', 0);
  syncVitals(target);
  // Send the final values after both clearing states and removing mounted bonuses.
  if (target.kind === 'player' && target.progress) w.hooks.progress(target);
  w.events.push({ t: 'die', id: target.id, by: killer?.id ?? '' });
  if (tongKim.onTkKill(w, target, killer)) {
    if (target.kind === 'monster') target.removeAt = w.now + CORPSE_SECONDS * 1000;
    return;
  }
  if (target.kind === 'monster') {
    target.removeAt = w.now + CORPSE_SECONDS * 1000;
    const slot = target.slot;
    if (slot) {
      slot.simId = null;
      if (slot.boss >= 2) {
        const delayMs = nextGoldenBossSpawnDelayMs(w.now, getGoldenBossConfig().settings, false);
        slot.respawnAt = w.now + delayMs;
      } else {
        slot.respawnAt = w.now + slot.respawnMs;
      }
      shareKillExp(w, target, killer);
      dropLoot(w, target, killer);
      onMonsterKilled(w, target, killer);
    }
  } else if (killer?.kind === 'player') {
    w.hooks.announce(`${killer.a.name} đã đánh trọng thương ${target.a.name}.`);
  } else {
    w.hooks.notify(target, 'Bạn đã trọng thương. Bấm "Về thành" để hồi sinh.');
  }
}

/** Lunge skills (Đoạn Hồn Thích): land next to the target when nothing blocks the way. */
export function dash(w: World, sim: Sim, target: Sim): void {
  const d = isoDistance(sim.a.x, sim.a.y, target.a.x, target.a.y);
  if (d < 60) return;
  const k = (d - 40) / d;
  const to = { x: sim.a.x + (target.a.x - sim.a.x) * k, y: sim.a.y + (target.a.y - sim.a.y) * k };
  if (!clearSegment(w.grid, sim.a, to, true)) return;
  const [x, y] = nearestWalkable(w.grid, to.x, to.y);
  sim.a.x = Math.round(x);
  sim.a.y = Math.round(y);
  sim.path = [];
}

/** Mê Ảnh Tung / Táp Đạp Lưu Tinh: land on the point, or as far towards it as the way is clear. */
export function blink(w: World, sim: Sim, x: number, y: number): void {
  const fx = sim.a.x, fy = sim.a.y;
  let to = { x, y };
  for (let k = 1; k > 0.05 && !(clearSegment(w.grid, sim.a, to, true) && isWalkable(w.grid, to.x, to.y)); k -= 0.1) {
    to = { x: fx + (x - fx) * k, y: fy + (y - fy) * k };
  }
  if (!isWalkable(w.grid, to.x, to.y)) return;
  face(sim, to.x - fx, to.y - fy);
  sim.a.x = Math.round(to.x);
  sim.a.y = Math.round(to.y);
  sim.path = [];
}
