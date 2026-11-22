import type { Element } from '../../characters/factions.js';
import { JUMP } from '../../characters/jump.js';
import { isoDistance } from '../../geometry.js';
import {
  hasDamage, isHeal, skillCategory, stateAttrs, stateDurationMs, triggersOf, type TriggerKind,
} from '../core/category.js';
import { eventSkill, type SkillEventKind } from '../core/events.js';
import { attr, attr1 } from '../core/formula.js';
import { castAnim, cellRadius, isCastable, weaponName, weaponOk } from '../core/info.js';
import { canPaySkillCost, skillActionMs, skillResourceCost } from '../core/casting.js';
import { getMissile, getSkill, tuningOf } from '../core/registry.js';
import { AURA_PULSE_MS, AURA_STATE_MS, CELL, DAMAGE_SCALE, MAX_EVENT_DEPTH, MIN_CAST_MS } from '../core/tuning.js';
import {
  GenerateStyle, JX_TICK_MS, MissileForm, MoveKind, SkillStyle, Target, type MissileDef, type SkillDef,
} from '../core/types.js';
import { healAmount } from './damage.js';
import { attrOf } from '../../formulas/attrs.js';
import { resolveHit, skillDamage } from '../../formulas/damage.js';
import { SPEED } from '../../formulas/tuning.js';
import { resolveSpeed } from '../../formulas/speed.js';
import { hitEffects } from '../../formulas/effects.js';
import type { Combatant, EnginePort } from './types.js';

interface Point { x: number; y: number }

/** Who fired a missile, frozen at launch (the caster may die or leave while it flies). */
interface Source { id: string; element: Element; kind: Combatant['kind'] }

interface Missile {
  mid: number;
  def: MissileDef;
  /** Skill whose missiles these are (its attributes decide the damage). */
  skill: SkillDef;
  /** Skill the player actually cast (tuning). */
  root: number;
  level: number;
  src: Source;
  x: number;
  y: number;
  /** Direction in logic space (screen y doubled), radians. */
  angle: number;
  /** Logic px per tick. */
  speed: number;
  born: number;
  dies: number;
  last: number;
  targetId?: string;
  aim: Point;
  /** Target id -> time it may be hit again. */
  hitAgain: Map<string, number>;
  areaAgain: number;
  /** Next periodic blast of a lingering area (range damage that explodes at the end). */
  pulseNext: number;
  flyNext: number;
  /** The fly layer (skill_flyevent) is on at this level. */
  flyOn: boolean;
  /** missle_hitcount limit (0 = unlimited). */
  maxHits: number;
  hitsDealt: number;
  targetHits: Map<string, number>;
  depth: number;
  done: boolean;
}

interface Timer { at: number; owner: string; run: () => void; casting?: boolean; cancelled?: boolean }
interface Aura { s: SkillDef; level: number; next: number }

/** Level a combatant uses a skill at: learned + what its worn pieces add (only when learned above 0; common skills work at level 0+). */
export function levelOf(c: Combatant, id: number): number | undefined {
  const raw = c.skills.get(id);
  if (raw === undefined) return undefined;
  const base = raw <= 0 && getSkill(id)?.pack === 'common' ? 1 : raw;
  return base > 0 ? base + (c.skillBonus?.get(id) ?? 0) : base;
}

/** What a cast did to the caster: pose, how long it locks them, and a line for the player (auras on/off). */
export interface CastResult { anim: 'attack' | 'attack2' | 'cast' | 'jump'; ms: number; note?: string; rejected?: boolean }

const TAU = Math.PI * 2;
/** Melee MisslesForm 11 (Đoạn Hồn Thích): the caster lunges at the target. */
const DASH_FORM = 11;
/** Melee MisslesForm 9 (Khinh công): the caster flies to the spot. */
const JUMP_FORM = 9;
/** Melee MisslesForm 13 (Mê Ảnh Tung / Táp Đạp Lưu Tinh): blink to aim point (and optionally cast child FX). */
const BLINK_FORM = 13;
const DIR64 = TAU / 64;
/** Room a target takes up around its feet (on top of the missile's own collision radius); bosses are bigger. */
const reachOf = (t: Combatant) => 16 + (t.a.boss ? 12 : 0);

/** Angle of a→b in logic space (the map is drawn with y halved). */
export function logicAngle(ax: number, ay: number, bx: number, by: number): number {
  return Math.atan2((by - ay) * 2, bx - ax);
}

/** Facing 0–7 (0 = south, clockwise) as a logic-space angle. */
function facingAngle(dir: number): number {
  // direction8: atan2(-dx, dy) / 45°  =>  dx = -sin(t), dy = cos(t)
  const t = (dir & 7) * (Math.PI / 4);
  return Math.atan2(Math.cos(t) * 2, -Math.sin(t));
}


/**
 * Runs the original skill data for any Combatant: missile layouts (MisslesForm), generation timing
 * (MslsGenerate), missile movement (MoveKind), collisions, range damage, explosions, event skills and the
 * level curves. Owners only differ in how they choose skills (player input, monster AI, bots).
 */
export class SkillEngine {
  private missiles: Missile[] = [];
  private timers: Timer[] = [];
  private nextMid = 1;
  /** Aura switched on per owner (one at a time, like the original). */
  private auras = new Map<string, Aura>();
  /** `${owner}:${skill}` -> time a passive trigger may fire again. */
  private triggerReady = new Map<string, number>();
  /** `${owner}:${sourceSkill}` -> time an autocastskill (passive or active state) fires next. */
  private autoCastNext = new Map<string, number>();

  constructor(private port: EnginePort) {}

  /** Resolve max special resource stacks (special_point_base) from learned passives. */
  resolveSpMax(c: Combatant): number {
    let max = 0;
    for (const [id, lv] of c.skills) {
      if (lv <= 0) continue;
      const s = getSkill(id);
      if (!s || s.style !== SkillStyle.Passive || !s.attrs?.special_point_base) continue;
      const v = attr(s, 'special_point_base', levelOf(c, id) ?? lv);
      if (v && v[2] > 0) max += v[2];
    }
    return max;
  }

  /** Required special resource stacks (cost_sp P3) to cast `s` at `level`. */
  private spCost(s: SkillDef, level: number): number {
    const v = attr(s, 'cost_sp', level);
    return v && v[2] > 0 ? Math.floor(v[2]) : 0;
  }

  /** Remove any active stealth (`hide`) state when the combatant attacks or debuffs. */
  private breakHide(c: Combatant): void {
    if (!c.states?.size) return;
    for (const sid of [...c.states.keys()]) {
      if (getSkill(sid)?.attrs?.hide) this.port.removeState(c, sid);
    }
  }

  /** Why `c` cannot use `id` right now (null = it can, cooldown aside). */
  check(c: Combatant, id: number): string | null {
    if (attrOf(this.port.stats(c).bag, 'randmove') > 0) return 'Đang bị hoảng loạn.';
    const level = levelOf(c, id);
    const s = getSkill(id);
    if (!s || level === undefined) return 'Chưa học kỹ năng này.';
    if (level <= 0) return `Chưa luyện ${s.name}: cộng điểm kỹ năng trước (Kỹ năng, phím F).`; // learned at level 0 (learning.ts)
    if (!isCastable(s)) return tuningOf(id).disabled ?? 'Kỹ năng này không thi triển trực tiếp.';
    if (c.kind === 'player') {
      if (!weaponOk(s, c.weaponType)) return `Cần vũ khí: ${weaponName(s.weapon!)}.`;
      if (s.noHorse && c.a.mounted) return 'Không thể dùng khi đang cưỡi ngựa.';
    }
    if (c.kind === 'player') {
      const cost = skillResourceCost(s, level);
      if (!canPaySkillCost(cost, { hp: c.hp, mp: c.mp, maxHp: c.a.maxHp })) {
        return cost.resource === 'hp' ? 'Không đủ sinh lực dự trữ để thi triển.' : 'Không đủ nội lực.';
      }
      const needSp = this.spCost(s, level);
      if (needSp > 0 && (c.sp ?? 0) < needSp) {
        return `Cần ${needSp} tầng Âm Luật (hiện có ${c.sp ?? 0}).`;
      }
    } // monsters cast for free
    return null;
  }

  ready(c: Combatant, id: number): boolean {
    return (c.cooldowns.get(id) ?? 0) <= this.port.now();
  }

  /**
   * Cast `id` (already checked, in range). Spends the resolved resource once, starts the cooldown and runs the skill: missiles /
   * melee hits, a bùa lợi on yourself (and allies), an aura switched on or off, a jump (Khinh công) or a blink
   * (Mê Ảnh Tung).
   */
  cast(c: Combatant, id: number, target: Combatant | undefined, aim: Point, actionMs?: number): CastResult {
    const error = c.dead ? 'Đang trọng thương.' : this.check(c, id);
    if (error || !this.ready(c, id)) return { anim: 'cast', ms: 0, rejected: true, note: error ?? 'Kỹ năng chưa hồi phục.' };
    const s = getSkill(id)!;
    const level = levelOf(c, id)!;
    const now = this.port.now();
    if (c.kind === 'player') {
      const cost = skillResourceCost(s, level);
      if (cost.resource === 'hp') c.hp -= cost.amount;
      else c.mp -= cost.amount;
      const needSp = this.spCost(s, level);
      if (needSp > 0) {
        c.sp = Math.max(0, (c.sp ?? 0) - needSp);
        this.port.onSpChanged?.(c);
      }
    }
    const minTime = attr1(s, c.a.mounted ? 'skill_mintimepercastonhorse_v' : 'skill_mintimepercast_v', level);
    const cd = Math.max(s.cooldown ?? 0, minTime) * JX_TICK_MS + (tuningOf(id).cooldownMs ?? 0);
    if (cd > 0) c.cooldowns.set(id, now + cd);
    const cat = skillCategory(s);
    if (!s.attrs?.hide && (cat === 'attack' || cat === 'debuff')) this.breakHide(c);
    const to = target ? { x: target.a.x, y: target.a.y } : aim;
    this.port.emit({ t: 'cast', id: c.id, skill: id, x: Math.round(c.a.x), y: Math.round(c.a.y) });
    const anim = castAnim(s, c.a.mounted);
    const pose = Math.max(1, actionMs ?? skillActionMs(s, resolveSpeed('attack', SPEED.basePercent).cycleMs));

    if (s.style === SkillStyle.State && s.aura) {
      if (this.auras.get(c.id)?.s.id === id) {
        this.auras.delete(c.id);
        this.port.removeState(c, id);
        return { anim, ms: pose, note: `Đã tắt ${s.name}.` };
      }
      const old = this.auras.get(c.id);
      if (old) this.port.removeState(c, old.s.id);
      this.auras.set(c.id, { s, level, next: now });
      return { anim, ms: pose, note: `Đã bật ${s.name}.` };
    }
    if (s.style === SkillStyle.Melee && !s.child && s.form === JUMP_FORM) { // Khinh công: fly towards the aim point
      const reach = Math.min(s.radius || JUMP.maxRange, JUMP.maxRange);
      const d = isoDistance(c.a.x, c.a.y, to.x, to.y);
      const k = d > reach ? reach / d : 1;
      const ms = this.port.jump?.(c, c.a.x + (to.x - c.a.x) * k, c.a.y + (to.y - c.a.y) * k) ?? 0;
      return ms > 0 ? { anim: 'jump', ms } : { anim, ms: MIN_CAST_MS };
    }
    if (s.style === SkillStyle.Melee && (s.form === BLINK_FORM || !s.child)) { // Mê Ảnh Tung / Táp Đạp Lưu Tinh: blink to aim point
      const from = { x: c.a.x, y: c.a.y };
      const reach = attr1(s, 'skill_param1_v', level, 200);
      const d = isoDistance(c.a.x, c.a.y, to.x, to.y);
      const k = d > reach ? reach / d : 1;
      const dest = { x: c.a.x + (to.x - c.a.x) * k, y: c.a.y + (to.y - c.a.y) * k };
      this.port.blink?.(c, dest.x, dest.y);
      const child = s.child ? getSkill(s.child) : undefined;
      if (child) {
        this.launch(c.id, child, level, from, dest, target?.id, 0, 0, id);
      } else {
        this.port.addState(c, { skill: id, kind: 'buff', ms: 1500, by: c.id, level });
      }
      return { anim, ms: pose };
    }
    // One completed pose releases one primary cast. Secondary pulses / flight retain world timing.
    const from = { x: c.a.x, y: c.a.y }, destination = { ...to }, targetId = target?.id;
    this.after(pose / JX_TICK_MS, c.id, () => {
      const owner = this.port.get(c.id);
      if (owner && !owner.dead) this.launch(c.id, s, level, from, destination, targetId, 0, 0, id);
    }, true);
    return { anim, ms: pose };
  }

  /** Aura `c` has switched on, if any. */
  auraOf(c: Combatant): number | undefined {
    return this.auras.get(c.id)?.s.id;
  }

  /**
   * Keep aura `id` on for `c` (undefined = switch the current one off), without a pose or Nội lực: the aura sitting
   * in a hand slot of the skill bar (world/players.ts holdSlotAura). Its level follows the current skill level.
   * Returns true when something changed.
   */
  holdAura(c: Combatant, id: number | undefined): boolean {
    const cur = this.auras.get(c.id);
    if (id === undefined) {
      if (!cur) return false;
      this.auras.delete(c.id);
      this.port.removeState(c, cur.s.id);
      return true;
    }
    const s = getSkill(id), level = levelOf(c, id) ?? 0;
    if (!s?.aura || level <= 0) return false;
    if (cur?.s.id === id && cur.level === level) return false;
    if (cur && cur.s.id !== id) this.port.removeState(c, cur.s.id);
    this.auras.set(c.id, { s, level, next: cur?.s.id === id ? cur.next : this.port.now() });
    return true;
  }

  /** The owner died: passive "khi trọng thương" triggers. */
  onDeath(c: Combatant, killer: Combatant | undefined): void {
    this.trigger(c, 'death', killer);
  }

  /** Forget everything an owner still has scheduled (death, leaving the map). */
  cancel(ownerId: string): void {
    for (const t of this.timers) if (t.owner === ownerId) t.cancelled = true;
    this.timers = this.timers.filter(t => t.owner !== ownerId);
    this.auras.delete(ownerId);
    const prefix = `${ownerId}:`;
    for (const k of this.autoCastNext.keys()) if (k.startsWith(prefix)) this.autoCastNext.delete(k);
  }

  /** Interrupt unlaunched skill work; launched missiles and the held aura survive a flinch. */
  interrupt(ownerId: string): void {
    for (const t of this.timers) if (t.owner === ownerId && t.casting) t.cancelled = true;
    this.timers = this.timers.filter(t => t.owner !== ownerId || !t.casting);
  }

  clear(): void {
    this.timers = [];
    this.missiles = [];
    this.auras.clear();
    this.autoCastNext.clear();
  }

  // ======================= launching =======================

  /** Schedule one skill's missiles (or a melee skill's hits). Returns the tick of the last spawn. */
  private launch(ownerId: string, s: SkillDef, level: number, from: Point, aim: Point, targetId: string | undefined,
    delay: number, depth: number, root: number, inheritAngle?: number): number {
    if (depth > MAX_EVENT_DEPTH) return delay;
    if (s.style === SkillStyle.Melee) {
      const child = s.child ? getSkill(s.child) : undefined;
      if (!child) return delay;
      if (s.form === DASH_FORM && targetId && delay === 0) {
        // Lunge at the target before striking.
        const owner = this.port.get(ownerId), t = this.port.get(targetId);
        if (owner && t && !t.dead) this.port.dash?.(owner, t);
      }
      const hits = Math.max(1, s.childNum ?? 1);
      const childLevel = (s.childLevel ?? 0) > 0 ? s.childLevel! : level;
      let last = delay;
      for (let i = 0; i < hits; i++) {
        const at = delay + (s.wait ?? 0) + i * Math.max(1, s.genData ?? 3);
        last = Math.max(last, at + (child.wait ?? 0));
        this.after(at, ownerId, () => {
          const owner = this.port.get(ownerId);
          if (!owner || owner.dead) return;
          const t = targetId ? this.port.get(targetId) : undefined;
          const to = t && !t.dead ? { x: t.a.x, y: t.a.y } : aim;
          this.launch(ownerId, child, childLevel, { x: owner.a.x, y: owner.a.y }, to, targetId, 0, depth, root);
        });
      }
      return last;
    }
    const owner = this.port.get(ownerId);
    if (!owner) return delay;
    if (s.style === SkillStyle.State) { // bùa lợi on the caster (+ allies around when the skill allows)
      // Resource-stack generator (e.g. Tiêu Dao 2117 Âm Luật: special_point_add).
      const spAdd = attr(s, 'special_point_add', level);
      if (spAdd && spAdd[2] > 0) {
        const spMax = this.resolveSpMax(owner);
        owner.spMax = spMax;
        if (spMax > 0) {
          const prev = owner.sp ?? 0;
          const next = Math.min(spMax, prev + Math.floor(spAdd[2]));
          if (next !== prev) {
            owner.sp = next;
            this.port.onSpChanged?.(owner);
          }
        }
        return delay;
      }
      this.after(delay + (s.wait ?? 0), ownerId, () => {
        const o = this.port.get(ownerId);
        if (!o) return;
        const kind = skillCategory(s) === 'debuff' ? 'debuff' : 'buff';
        const hasSelfState = stateAttrs(s).length > 0;
        const ms = stateDurationMs(s, level);
        if (kind === 'buff' && hasSelfState) this.port.addState(o, { skill: s.id, kind, ms, by: o.id, level });
        const reach = s.radius ?? 0;
        if (hasSelfState && reach > 0 && (s.target ?? 0) & (Target.Ally | Target.Enemy)) {
          for (const t of this.port.combatants()) {
            if (t === o || t.dead || isoDistance(o.a.x, o.a.y, t.a.x, t.a.y) > reach) continue;
            const ok = kind === 'buff' ? this.port.friendly(o, t) : this.port.hostile(o, t);
            if (ok) this.port.addState(t, { skill: s.id, kind, ms, by: o.id, level });
          }
        }
        const startId = eventSkill(s, 'start', level);
        if (startId) {
          const ev = getSkill(startId);
          if (ev) this.launch(ownerId, ev, level, { x: o.a.x, y: o.a.y }, aim, targetId, 0, depth + 1, root);
        }
      });
      return delay + (s.wait ?? 0);
    }
    if (s.style !== SkillStyle.Missiles && s.style !== SkillStyle.StateMissile) return delay;
    const def = s.child ? getMissile(s.child) : undefined;
    if (!def) return delay;
    const src: Source = { id: owner.id, element: owner.element, kind: owner.kind };

    const n = Math.max(1, attr1(s, 'skill_misslenum_v', level, s.childNum ?? 1) || s.childNum || 1);
    const p1 = attr1(s, 'skill_param1_v', level, s.p1 ?? 0) || (s.p1 ?? 0);
    const same = Math.abs(aim.x - from.x) < 1 && Math.abs(aim.y - from.y) < 1;
    const base = inheritAngle ?? (same ? facingAngle(owner.a.dir) : logicAngle(from.x, from.y, aim.x, aim.y));
    const r = this.port.random;
    let last = delay;
    for (let i = 0; i < n; i++) {
      const k = i - (n - 1) / 2;
      let x = from.x, y = from.y, angle = base;
      switch (s.form ?? MissileForm.Wall) {
        case MissileForm.Wall: { // side by side, perpendicular to the aim; standing walls rise on the aim point
          const off = k * (p1 || 32);
          if ((def.move ?? MoveKind.Stand) === MoveKind.Stand) { x = aim.x; y = aim.y; }
          x += Math.cos(base + Math.PI / 2) * off;
          y += (Math.sin(base + Math.PI / 2) * off) / 2;
          break;
        }
        case MissileForm.Spread:
          angle = base + k * (p1 || 4) * DIR64;
          break;
        case MissileForm.Circle:
          angle = base + (i * TAU) / n;
          x += Math.cos(angle) * p1;
          y += (Math.sin(angle) * p1) / 2;
          break;
        case MissileForm.Random:
          angle = base + (r() - 0.5) * (TAU / 4);
          break;
        case MissileForm.Zone:
        case MissileForm.AtTarget: {
          const spread = n > 1 ? (p1 || 48) : 0;
          const a = r() * TAU, d = r() * spread;
          x = aim.x + Math.cos(a) * d;
          y = aim.y + (Math.sin(a) * d) / 2;
          break;
        }
        case MissileForm.AtFirer:
          break;
        default: { // Line (and the later melee-only forms): one behind the other along the aim
          const off = i * (p1 > 4 ? p1 : 0);
          x += Math.cos(base) * off;
          y += (Math.sin(base) * off) / 2;
        }
      }
      const at = delay + (s.wait ?? 0) + this.generateTime(s, i, n);
      last = Math.max(last, at);
      const pos = { x, y }, dir = angle, first = i === 0;
      this.after(at, ownerId, () => this.spawn(src, s, level, def, pos, dir, targetId, aim, depth, root, first));
    }
    return last;
  }

  /** MslsGenerate: tick offset of missile `i` of `n`. */
  private generateTime(s: SkillDef, i: number, n: number): number {
    const d = s.genData ?? 0;
    const r = this.port.random;
    switch (s.gen) {
      case GenerateStyle.Order: return i * d;
      case GenerateStyle.RandomOrder: return Math.max(0, i * d + Math.floor((r() - 0.3) * d));
      case GenerateStyle.RandomSame: return Math.floor(r() * d);
      case GenerateStyle.CenterExtend: return Math.round(Math.abs(i - (n - 1) / 2)) * d;
      default: return 0;
    }
  }

  /** `first`: the cast's first missile, which fires the skill's start event (once per cast). */
  private spawn(src: Source, s: SkillDef, level: number, def: MissileDef, at: Point, angle: number,
    targetId: string | undefined, aim: Point, depth: number, root: number, first: boolean): void {
    const now = this.port.now();
    const speed = attr1(s, 'missle_speed_v', level, def.speed ?? 0) || (def.speed ?? 0);
    let life = attr1(s, 'missle_lifetime_v', level, def.life ?? 1) || def.life || 1;
    const move = def.move ?? MoveKind.Stand;
    if (move === MoveKind.Parabola && speed > 0) {
      // Lobbed: lands on the aim point.
      angle = logicAngle(at.x, at.y, aim.x, aim.y);
      life = Math.max(2, Math.min(life, Math.ceil(isoDistance(at.x, at.y, aim.x, aim.y) / speed)));
    }
    const maxHits = Math.max(0, Math.floor(attr1(s, 'missle_hitcount', level, 0)));
    const m: Missile = {
      mid: this.nextMid++, def, skill: s, root, level, src, x: at.x, y: at.y, angle, speed: move === MoveKind.Stand ? 0 : speed,
      born: now, dies: now + life * JX_TICK_MS, last: now, targetId, aim, hitAgain: new Map(), areaAgain: 0,
      pulseNext: def.rangeDmg && def.autoExplode && def.dmgInterval ? now + def.dmgInterval * JX_TICK_MS : Infinity,
      flyNext: now + (s.events?.flyTicks ?? 1) * JX_TICK_MS, flyOn: !!eventSkill(s, 'fly', level),
      maxHits, hitsDealt: 0, targetHits: new Map(), depth, done: false,
    };
    this.missiles.push(m);
    if (def.fx?.fly || def.fx?.wait) {
      this.port.emit({
        t: 'msl', m: m.mid, k: def.id, x: Math.round(m.x), y: Math.round(m.y), a: +angle.toFixed(3),
        v: Math.round((m.speed * 1000) / JX_TICK_MS), l: Math.round(life * JX_TICK_MS),
        f: move === MoveKind.Follow || move === MoveKind.SingleLine ? targetId : undefined,
        o: move === MoveKind.Motion ? src.id : undefined,
        tx: move === MoveKind.Parabola ? Math.round(aim.x) : undefined,
        ty: move === MoveKind.Parabola ? Math.round(aim.y) : undefined,
      });
    }
    if (first) this.event(m, 'start');
  }

  // ======================= tick =======================

  update(): void {
    const now = this.port.now();
    if (this.timers.length) {
      const due = this.timers.filter(t => t.at <= now);
      if (due.length) {
        due.sort((a, b) => a.at - b.at);
        for (const t of due) {
          // A preceding hit can interrupt a cast due in this same world tick.
          if (t.cancelled) continue;
          t.cancelled = true;
          t.run();
        }
        this.timers = this.timers.filter(t => !t.cancelled);
      }
    }
    for (const m of this.missiles) this.step(m, now);
    this.missiles = this.missiles.filter(m => !m.done);
    for (const [ownerId, aura] of this.auras) this.pulseAura(ownerId, aura, now);
    this.tickAutoCast(now);
  }

  /** Periodic autocastskill on learned passives (e.g. 2116 -> 2117 [Âm Luật]) and active states (2133 -> 2134). */
  private tickAutoCast(now: number): void {
    if (typeof this.port.combatants !== 'function') return;
    for (const c of this.port.combatants()) {
      if (c.dead) continue;
      // Keep spMax synced for fighters who know a special_point_base passive.
      const spMax = this.resolveSpMax(c);
      if ((c.spMax ?? 0) !== spMax) {
        c.spMax = spMax;
        if ((c.sp ?? 0) > spMax) c.sp = spMax;
        this.port.onSpChanged?.(c);
      }
      // 1. Passive autocastskill
      for (const [id, rawLv] of c.skills) {
        if (rawLv <= 0) continue;
        const s = getSkill(id);
        if (!s || s.inactive || s.style !== SkillStyle.Passive || !s.attrs?.autocastskill) continue;
        this.runAutoCast(c, s, levelOf(c, id) ?? rawLv, now);
      }
      // 2. Active-state autocastskill (e.g. 2133 Phất Y -> 2134 Phất Y_Thuẫn)
      if (c.states) {
        for (const [skillId, st] of c.states) {
          const s = getSkill(skillId);
          if (!s || s.inactive || !s.attrs?.autocastskill) continue;
          this.runAutoCast(c, s, st.level ?? 1, now);
        }
      }
    }
  }

  private runAutoCast(c: Combatant, source: SkillDef, level: number, now: number): void {
    const v = attr(source, 'autocastskill', level);
    if (!v || !v[0]) return;
    const subId = Math.floor(v[0] / 256);
    const subLv = Math.max(1, v[0] % 256);
    const intervalTicks = Math.max(1, Math.floor((v[2] || 18 * 256 + 100) / 256));
    const chance = Math.min(100, (v[2] % 256) || 100);
    const key = `${c.id}:${source.id}`;
    const due = this.autoCastNext.get(key) ?? 0;
    if (due > now) return;
    this.autoCastNext.set(key, now + intervalTicks * JX_TICK_MS);
    if (chance < 100 && this.port.random() * 100 >= chance) return;
    const sub = getSkill(subId);
    if (!sub) return;
    const pos = { x: c.a.x, y: c.a.y };
    this.launch(c.id, sub, subLv, pos, pos, c.id, 0, 1, sub.id);
  }

  /** Auras keep their state on the owner and everyone in range (enemies for the hostile ones). */
  private pulseAura(ownerId: string, aura: Aura, now: number): void {
    const o = this.port.get(ownerId);
    if (!o || o.dead) { this.auras.delete(ownerId); return; }
    if (now < aura.next) return;
    aura.next = now + AURA_PULSE_MS;
    const s = aura.s;
    const kind = skillCategory(s) === 'debuff' ? 'debuff' : 'buff';
    const child = s.child ? getSkill(s.child) : undefined;
    const reach = s.radius || child?.radius || 180;
    // Hostile auras (e.g. Vô Hình Độc) show their foot aura on the caster without applying debuff attrs to them.
    const ownerVisualOnly = kind === 'debuff';
    this.port.addState(o, { skill: s.id, kind: 'buff', ms: AURA_STATE_MS, aura: true, by: o.id, level: aura.level, ...(ownerVisualOnly ? { visualOnly: true } : {}) });
    // skill_appendskill (Bế Nguyệt Phất Trần): the auras it carries, at the level of its P2 table.
    const extra = (tuningOf(s.id).appendSkills ?? []).map(getSkill).filter((x): x is SkillDef => !!x);
    const extraLevel = attr(s, 'skill_appendskill', aura.level)?.[1] || aura.level;
    for (const e of extra) this.port.addState(o, { skill: e.id, kind: 'buff', ms: AURA_STATE_MS, aura: true, by: o.id, level: extraLevel, ...(ownerVisualOnly ? { visualOnly: true } : {}) });
    for (const t of this.port.combatants()) {
      if (t === o || t.dead || isoDistance(o.a.x, o.a.y, t.a.x, t.a.y) > reach) continue;
      const ok = kind === 'buff' ? this.port.friendly(o, t) : this.port.hostile(o, t);
      if (!ok) continue;
      this.port.addState(t, { skill: s.id, kind, ms: AURA_STATE_MS, aura: true, by: o.id, level: aura.level });
      for (const e of extra) this.port.addState(t, { skill: e.id, kind, ms: AURA_STATE_MS, aura: true, by: o.id, level: extraLevel });
    }
  }

  private step(m: Missile, now: number): void {
    const until = Math.min(now, m.dies);
    // Sub-steps of at most half a cell so fast missiles do not tunnel through targets.
    while (!m.done && m.last < until) {
      const maxMs = m.speed > 0 ? Math.max(5, ((CELL / 2) / m.speed) * JX_TICK_MS) : until - m.last;
      const dt = Math.min(until - m.last, maxMs);
      m.last += dt;
      this.move(m, dt / JX_TICK_MS);
      while (m.def && m.flyOn && m.last >= m.flyNext) {
        m.flyNext += (m.skill.events?.flyTicks ?? 1) * JX_TICK_MS;
        this.event(m, 'fly');
      }
      if (!m.def.autoExplode || m.def.colVanish) this.collide(m);
      else if (m.last >= m.pulseNext && m.last < m.dies) { // lingering area (ice rain…): blasts every DmgInterval
        m.pulseNext += (m.def.dmgInterval ?? 1) * JX_TICK_MS;
        if (this.area(m)) {
          this.event(m, 'collide');
        }
      }
    }
    if (!m.done && now >= m.dies) {
      if (m.def.autoExplode && this.area(m)) this.event(m, 'collide');
      this.end(m, !!m.def.autoExplode);
    }
  }

  private move(m: Missile, ticks: number): void {
    const move = m.def.move ?? MoveKind.Stand;
    if (move === MoveKind.Motion) { // stays on its caster
      const o = this.port.get(m.src.id);
      if (o) { m.x = o.a.x; m.y = o.a.y; }
      return;
    }
    if (!m.speed) return;
    const homingReady = m.last - m.born >= (m.def.homingDelay ?? 0) * JX_TICK_MS;
    if (homingReady && (move === MoveKind.Follow || move === MoveKind.SingleLine) && m.targetId) {
      const t = this.port.get(m.targetId);
      if (t && !t.dead) {
        const want = logicAngle(m.x, m.y, t.a.x, t.a.y);
        let diff = ((want - m.angle + Math.PI * 3) % TAU) - Math.PI;
        const turn = move === MoveKind.SingleLine ? Math.PI : 0.35 * ticks;
        diff = Math.max(-turn, Math.min(turn, diff));
        m.angle += diff;
      }
    }
    const d = m.speed * ticks;
    m.x += Math.cos(m.angle) * d;
    m.y += (Math.sin(m.angle) * d) / 2;
  }

  /** Targets this missile's skill affects (enemies for attacks, friends for heals). */
  private affects(m: Missile, owner: Combatant, t: Combatant): boolean {
    if (t.dead) return false;
    const target = m.skill.target ?? Target.Enemy;
    if (target & Target.Enemy && this.port.hostile(owner, t)) return true;
    if (target & Target.Self && t.id === owner.id) return true;
    if (target & Target.Ally && t.id !== owner.id && this.port.friendly(owner, t)) return true;
    return false;
  }

  private collide(m: Missile): void {
    if (m.def.collide === 0) return;
    const owner = this.port.get(m.src.id);
    if (!owner) return;
    const now = m.last;
    const r = cellRadius(m.def.collide ?? 1);
    const again = (m.def.dmgInterval ?? 0) * JX_TICK_MS;
    if (m.def.rangeDmg) {
      if (now < m.areaAgain) return;
      let touched = false;
      for (const t of this.port.combatants()) {
        if (this.affects(m, owner, t) && isoDistance(m.x, m.y, t.a.x, t.a.y) <= r + reachOf(t)) { touched = true; break; }
      }
      if (!touched) return;
      m.areaAgain = again > 0 ? now + again : Infinity;
      this.area(m);
      this.event(m, 'collide');
      if (m.def.colVanish) this.end(m, true);
      return;
    }
    let best: Combatant | undefined, bestD = Infinity;
    for (const t of this.port.combatants()) {
      if (!this.affects(m, owner, t) || (m.hitAgain.get(t.id) ?? 0) > now) continue;
      const d = isoDistance(m.x, m.y, t.a.x, t.a.y);
      if (d <= r + reachOf(t) && d < bestD) { best = t; bestD = d; }
    }
    if (!best) return;
    m.hitAgain.set(best.id, again > 0 ? now + again : Infinity);
    this.strike(m, owner, best);
    this.event(m, 'collide', best.id);
    if (m.def.colVanish) this.end(m, true);
    else if (m.def.fx?.collide) this.port.emit({ t: 'mend', m: 0, k: m.def.id, x: Math.round(best.a.x), y: Math.round(best.a.y), c: 1 });
  }

  /** Range damage around the missile (DmgRange cells); returns whether any target was hit. */
  private area(m: Missile): boolean {
    const owner = this.port.get(m.src.id);
    if (!owner) return false;
    if (m.maxHits > 0 && m.hitsDealt >= m.maxHits) return false;
    const r = cellRadius(m.def.dmgRange ?? m.def.collide ?? 1);
    const perTargetCap = m.maxHits >= 10 ? 5 : m.maxHits > 0 ? 1 : Infinity;
    let hit = false;
    for (const t of [...this.port.combatants()]) {
      if (m.maxHits > 0 && m.hitsDealt >= m.maxHits && t.id !== owner.id) break;
      if (!this.affects(m, owner, t) || isoDistance(m.x, m.y, t.a.x, t.a.y) > r + reachOf(t)) continue;
      const curHits = m.targetHits.get(t.id) ?? 0;
      if (curHits >= perTargetCap) continue;
      m.targetHits.set(t.id, curHits + 1);
      // Friendly ally-count caps (e.g. 2139 Tiêu Dao Vũ: self + up to maxHits allies) don't count self against the ally cap.
      if (!(t.id === owner.id && !this.port.hostile(owner, t))) m.hitsDealt++;
      this.strike(m, owner, t);
      if (m.def.fx?.collide && this.port.hostile(owner, t)) {
        this.port.emit({ t: 'mend', m: 0, k: m.def.id, x: Math.round(t.a.x), y: Math.round(t.a.y), c: 1 });
      }
      hit = true;
    }
    return hit;
  }

  private end(m: Missile, collided: boolean): void {
    if (m.done) return;
    m.done = true;
    const fx = m.def.fx;
    if (fx?.fly || fx?.wait || (collided ? fx?.collide : fx?.vanish)) {
      this.port.emit({ t: 'mend', m: m.mid, k: m.def.id, x: Math.round(m.x), y: Math.round(m.y), c: collided ? 1 : 0 });
    }
    this.event(m, 'vanish');
  }

  // ======================= events =======================

  /** Event skill (tầng chiêu) of `m`'s skill at its level: core/events.ts. */
  private event(m: Missile, kind: SkillEventKind, targetId = m.targetId): void {
    const s = m.skill;
    const id = eventSkill(s, kind, m.level);
    if (!id) return;
    const ev = getSkill(id);
    if (!ev) return;
    const level = attr1(s, 'skill_eventskilllevel', m.level) || m.level;
    const atMissile = kind === 'fly' || kind === 'vanish';
    const target = !atMissile && targetId ? this.port.get(targetId) : undefined;
    const aim = atMissile ? { x: m.x, y: m.y } : (target && !target.dead ? { x: target.a.x, y: target.a.y } : m.aim);
    this.launch(m.src.id, ev, level, { x: m.x, y: m.y }, aim, targetId, 0, m.depth + 1, m.root, atMissile ? m.angle : undefined);
  }

  // ======================= damage =======================

  /**
   * One target touched by a missile. Attacks deal (random) damage and record their side states (choáng, chậm,
   * độc); heals restore Sinh lực; skills made of states record a bùa lợi / bùa hại. States have no effect yet.
   */
  private strike(m: Missile, owner: Combatant, t: Combatant): void {
    const s = m.skill, lv = m.level, r = this.port.random;
    const missRate = attr1(s, 'missle_missrate', lv, 0);
    if (missRate > 0 && r() * 100 < missRate) return;
    const hostile = this.port.hostile(owner, t);
    if (hostile) this.breakHide(owner);
    const states = stateAttrs(s);
    const root = getSkill(m.root);
    const attack = hasDamage(s) || (!states.length && !isHeal(s) && (!root || skillCategory(root) === 'attack'));
    if (!hostile) {
      if (isHeal(s)) this.port.heal(owner, t, healAmount(s, lv));
      else if (states.length) this.port.addState(t, { skill: s.id, kind: 'buff', ms: stateDurationMs(s, lv), by: owner.id, level: lv });
      return;
    }
    if (!attack) {
      if (states.length) this.port.addState(t, { skill: s.id, kind: 'debuff', ms: stateDurationMs(s, lv), by: owner.id, level: lv });
      return;
    }
    // Damage (formulas/damage.ts): lực tay of the skill for the owner → trúng / né, chí mạng, chí tử, kháng, ngũ hành;
    // then the control effects of the hit (formulas/effects.ts).
    const atk = this.port.stats(owner), def = this.port.stats(t);
    const hit = resolveHit(skillDamage(s, lv, m.root, atk), {
      skill: s, level: lv, attacker: atk, target: def, targetLife: t.hp, pvp: owner.kind === 'player' && t.kind === 'player',
    }, r);
    const ownerScale = atk.outgoingDamageMultiplier ?? 1;
    const scale = DAMAGE_SCALE * (tuningOf(m.root).damage ?? 1) * ownerScale;
    // Snapshot scaled poison once at application; later ticks must not scale it again.
    // hitEffects still applies poison reduction and the existing merge caps.
    if (hit.poison) hit.poison = { ...hit.poison, tick: hit.poison.tick * ownerScale };
    this.port.damage(owner, t, {
      dmg: hit.dmg > 0 ? Math.max(1, Math.round(hit.dmg * scale)) : 0, crit: hit.crit, miss: hit.miss, fatal: hit.fatal,
      effects: hitEffects(s, lv, atk, def, hit, r), skill: m.root,
    });
    // Passive triggers (120 skills): on hitting / being hit / low Sinh lực.
    this.trigger(owner, 'attack', t);
    if (!t.dead) {
      this.trigger(t, 'reply', owner);
      if (t.hp < t.a.maxHp * 0.3) this.trigger(t, 'rescue', t);
    }
  }

  /** Fire `c`'s passive skills of this kind (chance + cooldown from the data) at `other`. */
  private trigger(c: Combatant, kind: TriggerKind, other: Combatant | undefined): void {
    const now = this.port.now();
    for (const [id, rawLevel] of c.skills) {
      if (rawLevel <= 0) continue;
      const passive = getSkill(id);
      if (!passive || passive.inactive || !passive.attrs) continue;
      if (kind !== 'death' && passive.style !== SkillStyle.Passive) continue;
      const level = levelOf(c, id) ?? rawLevel;
      if (level <= 0) continue;
      for (const tr of triggersOf(passive, level)) {
        if (tr.kind !== kind) continue;
        const key = `${c.id}:${tr.skill}`;
        if ((this.triggerReady.get(key) ?? 0) > now || this.port.random() * 100 >= tr.chance) continue;
        this.triggerReady.set(key, now + tr.cooldownMs);
        const sub = getSkill(tr.skill)!;
        const at = other && !other.dead ? { x: other.a.x, y: other.a.y } : { x: c.a.x, y: c.a.y };
        this.port.emit({ t: 'cast', id: c.id, skill: sub.id, x: Math.round(c.a.x), y: Math.round(c.a.y) });
        this.launch(c.id, sub, tr.level, { x: c.a.x, y: c.a.y }, at, other?.id, 0, 1, sub.id);
      }
    }
  }

  // ======================= timers =======================

  private after(ticks: number, owner: string, run: () => void, casting = false): void {
    if (ticks <= 0) { run(); return; }
    this.timers.push({ at: this.port.now() + ticks * JX_TICK_MS, owner, run, casting });
  }
}
