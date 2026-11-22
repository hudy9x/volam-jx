import {
  combatRulesAt, levelOf, campOf,
  FACTIONS, HORSES, LEGACY_HORSES, MAX_MONEY, MissileForm, PLAYER_SPEED, PROGRESS_VERSION, SPAWN_PROTECTION, START_MONEY,
  SkillStyle, attrOf, canStandAt, castRange, weaponOk, getSkill, isoDistance, nearestWalkable, skillCategory, starterEquipment,
  type Element, type Progress,
} from '@vltk/shared';
import { Actor } from '../net/schema.js';
import { makeSim, type Sim } from './entity.js';
import { restoreProgress, unlockSkills } from './progress.js';
import { maintainBotBuffs } from './botBuffs.js';
import { ensureToken } from './token.js';
import { applyEquipment, makeItem, outfitItems, restoreBag, restoreEquipment } from './inventory.js';
import { setAnim } from './systems/anim.js';
import { castNow } from './systems/combat.js';
import { face, followPath, setPath, updateConfusedMove, updateSpeed } from './systems/movement.js';
import { checkPortals } from './systems/portals.js';
import { clearStates } from './systems/status.js';
import { clearEffects } from './systems/effects.js';
import { syncVitals } from './systems/sync.js';
import { attackable, isConfused, nearestHostile } from './targeting.js';
import type { World } from './World.js';

// Player characters in the world: entering, reviving, regenerating, and carrying out queued orders
// (commands.ts queues them; the tick walks into range and casts).

/** What the world needs from a stored character. */
export interface PlayerRecord {
  id: string; owner?: string; name: string; faction: string; graduated?: boolean; gender: string; level: number; x: number; y: number;
  horse?: string | null; mounted?: boolean;
  /** Stored hành trang / worn items: concrete items, or table ids from older builds (restored by inventory.ts). */
  bag?: unknown; bagSpill?: unknown; equip?: unknown; skills?: Record<string, number>;
  /** Tiền túi; missing (saved before money existed) = START_MONEY. */
  money?: number;
  knb?: number;
  expBuff?: { until: number; tier: 'normal' | 'special' };
  /** Hệ (missing on old records: the faction's), progress, its format version, practice exp of skills. */
  series?: Element; progress?: Partial<Progress>; progressVersion?: number; skillExp?: Record<string, number>;
}

/** A locked target with a `reach` (auto-fight) may step this far out of it before we walk after it again (no stutter). */
const REACH_SLACK = 40;

export function addPlayer(w: World, sessionId: string, char: PlayerRecord): Sim {
  // Records saved before levels existed (other progressVersion) restart at level 1 without a faction, keeping their
  // hệ, items and money (user, 2026-11-12). New characters choose hệ + giới and join a faction at level 10.
  const fresh = char.progressVersion !== PROGRESS_VERSION;
  const series: Element = char.series ?? FACTIONS[char.faction]?.element ?? 'kim';
  const faction = !fresh && FACTIONS[char.faction] ? char.faction : '';
  const graduated = !fresh && !!faction && !!char.graduated;
  const prog = restoreProgress(char.progress, fresh);
  // A stored spot that is not standable (e.g. saved before the maps were rebuilt from the original client,
  // whose coordinates differ) goes to the map entry instead of the nearest random cell.
  const entry = w.meta.raw.entry;
  const [x, y] = canStandAt(w.grid, char.x, char.y) ? [char.x, char.y] : nearestWalkable(w.grid, entry.x, entry.y);
  const a = new Actor();
  Object.assign(a, {
    kind: 'player', name: char.name, sprite: '', faction, series, gender: char.gender, level: prog.level,
    x: Math.round(x), y: Math.round(y), dir: 0, anim: 'idle', animSeq: 0, attackTarget: '', jumpMs: 0, moveScale: 1,
    hp: 1, maxHp: 1, mp: 0, maxMp: 0,
    pk: 0, camp: campOf(faction, graduated), team: '', boss: 0, scale: 1, protectedUntil: Date.now() + SPAWN_PROTECTION * 1000,
    horse: '', mounted: false, mantle: -1,
  });
  const sim = makeSim(sessionId, 'player', a, series, PLAYER_SPEED);
  updateSpeed(sim);
  sim.charId = char.id;
  sim.owner = char.owner;
  sim.graduated = graduated;
  sim.sessionId = sessionId;
  sim.progress = {
    series, prog,
    skillExp: new Map(fresh ? [] : Object.entries(char.skillExp ?? {}).map(([k, v]) => [Number(k), Math.max(0, Number(v) || 0)])),
  };
  // Skills: basic attacks, common skills and (after joining) the faction's, from their ReqLevel (world/progress.ts).
  unlockSkills(sim, fresh ? undefined : char.skills);
  const restored = restoreBag(char.bag, char.bagSpill);
  sim.bag = restored.bag;
  sim.bagSpill = restored.spill;
  ensureToken(sim); // lệnh bài (world/token.ts)
  sim.knb = Number.isSafeInteger(char.knb) ? Math.max(0, Math.min(MAX_MONEY, char.knb!)) : 0;
  const money = Number(char.money ?? START_MONEY);
  sim.money = Number.isFinite(money) ? Math.max(0, Math.min(MAX_MONEY, Math.floor(money))) : START_MONEY;
  sim.expBuff = char.expBuff && char.expBuff.until > Date.now() ? { ...char.expBuff } : undefined;
  sim.equip = char.equip ? restoreEquipment(char.equip) : outfitItems(starterEquipment(faction, char.gender));
  // Older builds kept the horse outside the equipment.
  const legacy = char.horse ? (HORSES[char.horse] ? char.horse : LEGACY_HORSES[char.horse]) : undefined;
  if (legacy && !sim.equip.horse) sim.equip.horse = makeItem(legacy) ?? undefined;
  const horseDef = sim.equip.horse?.def;
  sim.a.horse = horseDef && HORSES[horseDef] ? horseDef : '';
  sim.a.mounted = !!sim.a.horse && !!char.mounted;
  applyEquipment(sim, true);
  updateSpeed(sim);
  w.add(sim);
  return sim;
}


/** Revive a dead player at `x,y` on this map. */
export function revive(w: World, sim: Sim, x: number, y: number): void {
  const [sx, sy] = nearestWalkable(w.grid, x, y);
  sim.dead = false;
  sim.lockedAttack = undefined;
  sim.pending = null;
  sim.a.attackTarget = '';
  sim.hp = sim.a.maxHp;
  sim.mp = sim.a.maxMp;
  sim.a.x = Math.round(sx);
  sim.a.y = Math.round(sy);
  sim.a.protectedUntil = w.now + SPAWN_PROTECTION * 1000;
  sim.castUntil = 0;
  sim.potions = undefined;
  clearStates(sim);
  clearEffects(w, sim);
  setAnim(sim, 'idle');
  syncVitals(sim);
  if (sim.progress) w.hooks.progress(sim);
}

/** Sinh lực / Nội lực come back over time: fast in town, slowly after 5 s out of combat. */
export function regen(w: World, sim: Sim, dt: number): void {
  const a = sim.a;
  const idle = w.now - Math.max(sim.lastDamagedAt, sim.lastAttackAt) > 5000;
  const safe = combatRulesAt(w.meta, a, w.rules).safe;
  const hpRate = safe ? 0.25 : idle ? 0.03 : 0;
  const mpRate = safe ? 0.25 : idle ? 0.05 : 0.015;
  // lifereplenish_v / manareplenish_v of items and bùa: points every half second (magicdesc.ini "mỗi nửa giây").
  const bag = sim.combat?.bag;
  const lifeMult = 1 + Math.max(0, bag ? attrOf(bag, 'lifereplenish_p') : 0) / 100;
  const lifePerS = bag ? attrOf(bag, 'lifereplenish_v') * 2 * lifeMult : 0, manaPerS = bag ? attrOf(bag, 'manareplenish_v') * 2 : 0;
  sim.hp = Math.max(1, Math.min(a.maxHp, sim.hp + (a.maxHp * hpRate + lifePerS) * dt));
  sim.mp = Math.max(0, Math.min(a.maxMp, sim.mp + (a.maxMp * mpRate + manaPerS) * dt));
  syncVitals(sim);
}

export function updatePlayer(w: World, sim: Sim, dt: number): void {
  maintainBotBuffs(w, sim);
  if (combatRulesAt(w.meta, sim.a, w.rules).safe) { sim.pending = null; sim.lockedAttack = undefined; sim.a.attackTarget = ''; }
  if (sim.lockedAttack) {
    const target = w.sims.get(sim.lockedAttack.targetId!);
    if (!target || !attackable(w, sim, target)) {
      if (sim.pending?.lock && sim.pending.targetId === sim.lockedAttack.targetId) { sim.pending = null; sim.path = []; }
      sim.lockedAttack = undefined;
      sim.a.attackTarget = '';
    }
  }
  if (sim.slotAura) holdSlotAura(w, sim, sim.slotAura);
  if (w.now < sim.castUntil) return;
  if (isConfused(sim)) {
    sim.pending = null;
    sim.queuedMove = undefined;
    sim.lockedAttack = undefined;
    sim.a.attackTarget = '';
    updateConfusedMove(w, sim, dt);
    return;
  }
  if (sim.queuedMove && !sim.pending && !sim.pickup) {
    const move = sim.queuedMove;
    sim.queuedMove = undefined;
    setPath(w, sim, move);
  }
  if (!sim.pending && !sim.pickup && sim.lockedAttack) sim.pending = { ...sim.lockedAttack, repathAt: 0 };
  if (sim.pending) processPending(w, sim);
  if (w.now < sim.castUntil) return;
  followPath(sim, dt);
  if (combatRulesAt(w.meta, sim.a, w.rules).safe) { sim.pending = null; sim.lockedAttack = undefined; sim.a.attackTarget = ''; }
  if (sim.path.length) checkPortals(w, sim);
}

/**
 * Hào quang on a hand slot of the skill bar (C2S.aura) stays on without being cast (USER 2026-11-13): no pose, no
 * Nội lực, also in town (CHỌN). Off while the worn weapon / the horse forbids it, back on by itself afterwards. A death
 * clears it (SkillEngine.cancel); it comes back on revival.
 */
function holdSlotAura(w: World, sim: Sim, id: number): void {
  const s = getSkill(id);
  const ok = !!s && (levelOf(sim, id) ?? 0) > 0 && weaponOk(s, sim.weaponType) && !(s.noHorse && sim.a.mounted);
  if (ok) {
    const was = w.engine.auraOf(sim);
    if (w.engine.holdAura(sim, id) && was !== id) w.hooks.notify(sim, `Hào quang ${s!.name} tự bật.`);
  } else if (w.engine.auraOf(sim) === id) w.engine.holdAura(sim, undefined);
}

/** The queued order: wait for the cooldown, walk into range, then cast (and again, for a locked target). */
function processPending(w: World, sim: Sim): void {
  const p = sim.pending!;
  const s = getSkill(p.skill);
  if (!s) { sim.pending = null; return; }
  if (!w.engine.ready(sim, p.skill)) return; // wait for the cooldown, keep the order queued

  const category = skillCategory(s);
  const selfCast = s.style === SkillStyle.State || (s.style === SkillStyle.Melee && !s.child); // bùa on self, aura, jump
  let target: Sim | undefined;
  if (selfCast) target = undefined;
  else if (category === 'support' || category === 'buff') {
    const t = p.targetId ? w.sims.get(p.targetId) : undefined;
    target = t && !t.dead && t.kind === sim.kind && !attackable(w, sim, t) ? t : sim;
  } else if (p.targetId) {
    target = w.sims.get(p.targetId);
    if (!target || !attackable(w, sim, target)) { sim.pending = null; return; }
  } else if (s.style === SkillStyle.Melee) {
    target = nearestHostile(w, sim, p.x, p.y, 120);
    if (!target) { sim.pending = null; return; }
    p.targetId = target.id;
  }
  const aim = target ? { x: target.a.x, y: target.a.y } : { x: p.x, y: p.y };

  // Free-aimed missiles fire right away; melee, targeted casts and casts on a spot need to be in range.
  const atSpot = s.form === MissileForm.AtTarget || s.form === MissileForm.Zone;
  const needsRange = (target !== undefined && target !== sim) || (atSpot && !target && !selfCast);
  const level = levelOf(sim, p.skill) ?? 1;
  const range = castRange(s, level);
  const want = p.reach ? Math.min(range, Math.max(16, p.reach) + (p.engaged ? REACH_SLACK : 0)) : range;
  if (needsRange && isoDistance(sim.a.x, sim.a.y, aim.x, aim.y) > want) {
    if (w.now >= p.repathAt) {
      setPath(w, sim, aim);
      p.repathAt = w.now + 300;
    }
    return;
  }
  const err = w.engine.check(sim, p.skill);
  // A locked attack waits silently for resources / equipment; the click already reported the initial error.
  if (err && p.lock && sim.lockedAttack?.targetId === p.targetId && sim.lockedAttack?.skill === p.skill) { sim.path = []; return; }
  sim.pending = null;
  if (err) { w.hooks.notify(sim, err); return; }
  sim.path = [];
  face(sim, aim.x - sim.a.x, aim.y - sim.a.y);
  if (category === 'attack' && target && target !== sim) sim.a.attackTarget = target.id;
  castNow(w, sim, p.skill, target === sim ? undefined : target, aim);
  // Locked target: queue the same attack again (it waits for the pose / cooldown, and stops once the target is gone).
  if (p.lock && target && target !== sim && !target.dead) sim.pending = { ...p, repathAt: 0, engaged: true };
  if (sim.pending?.lock && category === 'attack') sim.lockedAttack = { ...sim.pending };
}
