import {
  combatRulesAt, combatPairRules,
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
import { playOnce } from './anim.js';
import { updateSpeed } from './movement.js';
import { endJump } from './jump.js';
import { clearStates } from './status.js';
import { practice, recordDamage, refreshStats, shareKillExp } from '../progress.js';
import { applyHitEffects, castTiming, clearEffects, combatOf } from './effects.js';
import { dropLoot } from './drops.js';
import { syncVitals } from './sync.js';

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
  sim.castUntil = w.now + pose.ms;
  sim.lastAttackAt = w.now;
  playOnce(w, sim, pose.anim, pose.ms / 1000);
  syncVitals(sim);
}

export function applyHit(w: World, attacker: Sim, target: Sim, hit: HitResult & { dot?: boolean; reflected?: boolean }): void {
  // Protect at impact time too: missiles, area hits, reflection and ongoing damage.
  if (combatPairRules(w.meta, attacker.a, target.a, w.rules).safe) return;
  if (target.dead || target.jump) return; // Khinh công in flight: no damage (see World's EnginePort.hostile)
  const targetBag = combatOf(target).bag;
  if (attrOf(targetBag, 'invincibility') > 0 || attrOf(targetBag, 'hide') > 0) return; // Thập Bộ Nhất Sát (2130) / Ngự Tuyết Ẩn (713)
  target.lastDamagedAt = w.now;
  attacker.lastAttackAt = w.now;
  if (target.kind === 'monster' && !target.def?.dummy && !target.target && !target.returning && attacker !== target) target.target = attacker.id;
  if (hit.miss) { w.events.push({ t: 'hit', id: target.id, dmg: 0, miss: true }); return; }
  let dmg = hit.dmg;
  // Hộ Thuẫn Nội Lực tĩnh (staticmagicshield_p, e.g. Tiêu Dao Vũ 2139 / Phất Y_Thuẫn 2134): absorbs damage before HP/MP.
  // Static mana shield (staticmagicshield_p, e.g. Tiêu Dao 2139/2134, Côn Lôn 120): absorbs direct damage up to shieldHp;
  // poison DoT (hit.dot) bypasses the shield and drains HP directly (same as manashield_p).
  if (!hit.dot && target.shieldHp && target.shieldHp > 0 && dmg > 0) {
    const absorb = Math.min(target.shieldHp, dmg);
    target.shieldHp -= absorb;
    dmg -= absorb;
  }
  // Nội lực hộ thân (manashield_p, SRC): that % of direct damage is taken from Nội lực while there is some;
  // poison DoT (hit.dot) bypasses mana shield and drains HP directly.
  const shield = Math.min(100, attrOf(combatOf(target).bag, 'manashield_p'));
  if (!hit.dot && shield > 0 && target.mp > 0 && dmg > 0) {
    const fromMp = Math.min(target.mp, Math.round((dmg * shield) / 100));
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
  if (!hit.dot && !hit.reflected && attacker !== target && !attacker.dead && dmg > 0) {
    const steal = lifeSteal(Math.min(dmg, dmg + Math.min(0, target.hp)), combatOf(attacker).bag, getSkill(hit.skill ?? 0), levelOf(attacker, hit.skill ?? 0) ?? 1);
    if (steal.hp > 0) { attacker.hp = Math.min(attacker.a.maxHp, attacker.hp + steal.hp); w.events.push({ t: 'heal', id: attacker.id, v: steal.hp }); }
    if (steal.mp > 0) attacker.mp = Math.min(attacker.a.maxMp, attacker.mp + steal.mp);
    if (steal.hp > 0 || steal.mp > 0) syncVitals(attacker);
  }

  // Phản đòn (formulas/damage.ts damageReturn): part of a direct hit goes back to the attacker (not returned again).
  if (!hit.dot && !hit.reflected && attacker !== target && !attacker.dead && dmg > 0) {
    const back = damageReturn(dmg, combatOf(target).bag, combatOf(attacker).bag, !!getSkill(hit.skill ?? 0)?.melee);
    if (back > 0) applyHit(w, target, attacker, { dmg: back, crit: false, reflected: true });
  }
  // Phản sát thương độc (poisondamagereturn_p, Thiếu Lâm 709): phản % độc sát mỗi tick về người hạ độc.
  if (hit.dot && !hit.reflected && attacker !== target && !attacker.dead && dmg > 0) {
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
  // Choáng / chậm / độc / co giật of the hit (formulas/effects.ts → systems/effects.ts).
  if (hit.effects) applyHitEffects(w, attacker, target, hit.effects);
  syncVitals(target);
}

export function heal(w: World, target: Sim, amount: number): void {
  if (target.dead) return;
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

/** Mê Ảnh Tung: land on the point, or as far towards it as the way is clear. */
export function blink(w: World, sim: Sim, x: number, y: number): void {
  let to = { x, y };
  for (let k = 1; k > 0.05 && !(clearSegment(w.grid, sim.a, to, true) && isWalkable(w.grid, to.x, to.y)); k -= 0.1) {
    to = { x: sim.a.x + (x - sim.a.x) * k, y: sim.a.y + (y - sim.a.y) * k };
  }
  if (!isWalkable(w.grid, to.x, to.y)) return;
  sim.a.x = Math.round(to.x);
  sim.a.y = Math.round(to.y);
  sim.path = [];
}
