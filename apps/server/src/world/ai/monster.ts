import { TK_SIEGE, TK_TOWER_SKILLS, chooseSkill, getSkill, isWalkable, isoDistance } from '@vltk/shared';
import type { Sim } from '../entity.js';
import { applyHit, castNow } from '../systems/combat.js';
import { face, followPath, setPath, updateConfusedMove } from '../systems/movement.js';
import { syncVitals } from '../systems/sync.js';
import { attackable, isConfused, nearestBattleEnemy, nearestPlayer } from '../targeting.js';
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
  if (sim.a.tkTower === 4) return;
  if (sim.tkTowerTier) { updateTkTower(w, sim); return; }
  if (sim.tkMinionType && sim.tkWaypoints?.length) { updateTkLaneMinion(w, sim, dt); return; }
  if (w.now < sim.castUntil) return;
  if (isConfused(sim)) {
    sim.plan = null;
    updateConfusedMove(w, sim, dt);
    return;
  }

  if (sim.returning) {
    if (def.boundedHome && !sim.path.length && isoDistance(sim.a.x, sim.a.y, home.x, home.y) > 8) {
      setPath(w, sim, home, true);
      return;
    }
    followPath(sim, dt);
    if (!sim.path.length) {
      sim.returning = false;
      // Nguyên Soái Tống Kim quay về điểm giữ doanh nhưng không reset đầy máu.
      if (sim.tkRole !== 'marshal') {
        sim.hp = sim.a.maxHp;
        syncVitals(sim);
      }
    }
    return;
  }

  let target = sim.target ? w.sims.get(sim.target) : undefined;
  if (target && !attackable(w, sim, target)) target = undefined;
  if (!target) {
    target = sim.a.battleCamp ? nearestBattleEnemy(w, sim, def.vision) : nearestPlayer(w, sim, def.vision);
    sim.target = target?.id ?? null;
  }

  const outsideHome = isoDistance(sim.a.x, sim.a.y, home.x, home.y) > def.leash;
  const targetOutsideHome = def.boundedHome && target && isoDistance(target.a.x, target.a.y, home.x, home.y) > def.leash;
  if ((target || def.boundedHome) && leashes(def, sim) && (outsideHome || targetOutsideHome)) {
    sim.target = null;
    sim.plan = null;
    sim.returning = true;
    setPath(w, sim, home, true);
    return;
  }

  if (target) {
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

const MINION_PRIORITY: Record<string, number> = { siege: 0, super: 1, melee: 2, ranged: 3 };

function pickTowerTargets(w: World, tower: Sim): Sim[] {
  const range = TK_SIEGE.towerRange;
  // 1. Call for Help: người chơi đánh đồng minh trong tầm trụ
  const help = tower.tkTowerCallForHelp;
  if (help && w.now <= help.until) {
    const culprit = w.sims.get(help.attackerId);
    if (culprit && !culprit.dead && attackable(w, tower, culprit) && isoDistance(tower.a.x, tower.a.y, culprit.a.x, culprit.a.y) <= range) {
      return [culprit];
    }
  }
  const minions: { sim: Sim; d: number; prio: number }[] = [];
  const players: { sim: Sim; d: number }[] = [];
  for (const other of w.sims.values()) {
    if (!attackable(w, tower, other)) continue;
    const d = isoDistance(tower.a.x, tower.a.y, other.a.x, other.a.y);
    if (d > range) continue;
    if (other.tkMinionType) minions.push({ sim: other, d, prio: MINION_PRIORITY[other.tkMinionType] ?? 9 });
    else if (other.kind === 'player') players.push({ sim: other, d });
  }
  // 2. Ưu tiên bắn lính địch trong tầm
  if (minions.length) {
    minions.sort((a, b) => a.prio - b.prio || a.d - b.d);
    return [minions[0].sim];
  }
  // 3. Hết lính -> bắn tối đa 3 người chơi địch gần nhất trong tầm (chống băng trụ đông)
  if (players.length) {
    players.sort((a, b) => a.d - b.d);
    return players.slice(0, TK_SIEGE.towerMaxMultiTargets).map(p => p.sim);
  }
  return [];
}

function updateTkTower(w: World, sim: Sim): void {
  sim.a.tkInvuln = Boolean(sim.tkTowerInvuln);
  const targets = pickTowerTargets(w, sim);
  const primary = targets[0];
  sim.a.tkTarget = primary?.id ?? '';
  if (!primary) return;
  face(sim, primary.a.x - sim.a.x, primary.a.y - sim.a.y);
  if (w.now < (sim.nextAttack ?? 0)) return;
  sim.nextAttack = w.now + TK_SIEGE.towerAttackMs;
  const idx = sim.skills.size ? (sim.plan?.id ?? 0) : 0;
  const skillId = TK_TOWER_SKILLS[idx % TK_TOWER_SKILLS.length];
  sim.plan = { id: idx + 1, range: TK_SIEGE.towerRange };
  const sk = getSkill(skillId);
  for (const t of targets) {
    sim.mp = sim.a.maxMp;
    sim.cooldowns.delete(skillId);
    w.engine.cast(sim, skillId, t, { x: t.a.x, y: t.a.y }, 500);
    if (sk?.form === 1 && isoDistance(sim.a.x, sim.a.y, t.a.x, t.a.y) > 450) {
      applyHit(w, sim, t, { dmg: 1, crit: false, skill: skillId });
    }
    // Nổ lan AoE 200 px khi trụ bắn người chơi để chống đứng tụm đông người
    if (t.kind === 'player') {
      for (const nearby of w.sims.values()) {
        if (nearby === t || nearby.dead || nearby.kind !== 'player' || !attackable(w, sim, nearby)) continue;
        if (isoDistance(t.a.x, t.a.y, nearby.a.x, nearby.a.y) <= TK_SIEGE.towerSplashRadius) {
          applyHit(w, sim, nearby, { dmg: 1, crit: false, skill: skillId });
        }
      }
    }
  }
}

function findLaneMinionTarget(w: World, sim: Sim, vision: number): Sim | undefined {
  let best: Sim | undefined;
  let bestScore = Infinity;
  for (const other of w.sims.values()) {
    if (!attackable(w, sim, other)) continue;
    if (other.tkTowerTier && other.tkTowerInvuln) continue;
    const d = isoDistance(sim.a.x, sim.a.y, other.a.x, other.a.y);
    if (d > vision) continue;
    // Ưu tiên: lính địch (0) < trụ mở (1000) < người chơi địch (2000)
    const tierOffset = other.tkMinionType ? 0 : other.tkTowerTier ? 1000 : 2000;
    const score = tierOffset + d;
    if (score < bestScore) { bestScore = score; best = other; }
  }
  return best;
}

function updateTkLaneMinion(w: World, sim: Sim, dt: number): void {
  const def = sim.def!;
  if (w.now < sim.castUntil) return;
  if (isConfused(sim)) { sim.plan = null; updateConfusedMove(w, sim, dt); return; }

  const wps = sim.tkWaypoints!;
  let wpIdx = Math.min(sim.tkWaypointIdx ?? 0, wps.length - 1);
  const wp = wps[wpIdx];
  if (isoDistance(sim.a.x, sim.a.y, wp.x, wp.y) <= 160 && wpIdx < wps.length - 1) {
    wpIdx += 1;
    sim.tkWaypointIdx = wpIdx;
  }

  let target = sim.target ? w.sims.get(sim.target) : undefined;
  if (target && (!attackable(w, sim, target) || (target.tkTowerTier && target.tkTowerInvuln))) target = undefined;
  if (!target || isoDistance(sim.a.x, sim.a.y, target.a.x, target.a.y) > def.vision * 1.4) {
    target = findLaneMinionTarget(w, sim, def.vision);
    sim.target = target?.id ?? null;
  }

  if (target) {
    const dist = isoDistance(sim.a.x, sim.a.y, target.a.x, target.a.y);
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
      sim.repathAt = w.now + 450;
      setPath(w, sim, { x: target.a.x, y: target.a.y });
    }
    followPath(sim, dt);
    return;
  }

  // Không có địch trong tầm -> tiến dọc theo waypoint của đường
  sim.plan = null;
  const dest = wps[sim.tkWaypointIdx ?? 0];
  if (w.now >= (sim.repathAt ?? 0) || !sim.path.length) {
    sim.repathAt = w.now + 700;
    setPath(w, sim, dest, true);
  }
  followPath(sim, dt);
}
