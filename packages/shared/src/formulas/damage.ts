// Damage of one hit, in two steps like the original:
//   1. skillDamage  — "lực tay" of a skill for an attacker (what F3 shows): ranges per part (vật lý, băng, hỏa, lôi, độc).
//   2. resolveHit   — one hit on a target: trúng / né, chí mạng, chí tử, kháng (with caps), ngũ hành, PK; rolls the ranges.
// Effects of the hit (choáng, chậm, độc, co giật): formulas/effects.ts. Rules and sources: docs/formulas/damage.md.
import { ELEMENT_COUNTERS, type Element } from '../characters/factions.js';
import { attr } from '../skills/core/formula.js';
import type { SkillDef } from '../skills/core/types.js';
import { attrOf, type AttrBag } from './attrs.js';
import type { ResistKind } from './character.js';
import type { CombatStats } from './combat.js';
import { CRIT, HEAVY_HIT, HIT, PVP, RESIST, STATIC_SHIELD, STEAL } from './tuning.js';

export type Range = [number, number];
export type ElementPart = 'cold' | 'fire' | 'light';
export const ELEMENT_PARTS: ElementPart[] = ['cold', 'fire', 'light'];

/** "Lực tay" of a skill: ranges of each part before the target (min, max). */
export interface DamageParts {
  phys: Range;
  cold: Range;
  fire: Range;
  light: Range;
  /** Độc: damage per tick, total time and period in frames. */
  poison: { tick: number; frames: number; period: number } | null;
}

const SERIES_ORDER: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
const SKILL_ATTR: Record<ElementPart | 'poison', string> = {
  cold: 'colddamage_v', fire: 'firedamage_v', light: 'lightingdamage_v', poison: 'poisondamage_v',
};
/** Equipment / passive adds: ngoại công skills take add*damage_v, nội công skills add*magic_v (SRC GetEchoDamage). */
const ADD_EXTERNAL: Record<ElementPart | 'poison' | 'phys', string> = {
  phys: 'addphysicsdamage_v', cold: 'addcolddamage_v', fire: 'addfiredamage_v', light: 'addlightingdamage_v', poison: 'addpoisondamage_v',
};
const ADD_INTERNAL: Record<ElementPart | 'poison' | 'phys', string> = {
  phys: 'addphysicsmagic_v', cold: 'addcoldmagic_v', fire: 'addfiremagic_v', light: 'addlightingmagic_v', poison: 'addpoisonmagic_v',
};
const RESIST_OF: Record<ElementPart | 'phys' | 'poison', ResistKind> = { phys: 'phys', cold: 'cold', fire: 'fire', light: 'light', poison: 'poison' };
const ANTI_RES: Record<ResistKind, string> = {
  phys: 'anti_physicsres_p', poison: 'anti_poisonres_p', cold: 'anti_coldres_p', fire: 'anti_fireres_p', light: 'anti_lightingres_p',
};

/** [P1, P3 || P1] of a skill attribute at a level (min / max of a damage range). */
const range = (s: SkillDef, name: string, level: number): Range => {
  const v = attr(s, name, level);
  return v ? [v[0], Math.max(v[0], v[2] || v[0])] : [0, 0];
};
const scale = ([a, b]: Range, k: number): Range => [a * k, b * k];
const add = ([a, b]: Range, [c, d]: Range): Range => [a + c, b + d];

/** Ngoại công (uses the weapon / external adds) or nội công. */
export const isExternal = (s: SkillDef, level: number): boolean => !!attr(s, 'physicsenhance_p', level)?.[0] || !!s.physical;

/**
 * Lực tay of skill `s` at `level` for attacker `a`; `root` = the skill the player cast (its addskilldamage bonuses).
 * SRC KPlayer::GetEchoDamage, docs/formulas/damage.md §1.
 */
export function skillDamage(s: SkillDef, level: number, root: number, a: CombatStats): DamageParts {
  const bonus = (a.skillBonus[root] ?? 0) + (root !== s.id ? a.skillBonus[s.id] ?? 0 : 0) + attrOf(a.bag, 'skill_enhance');
  const k = (100 + bonus) / 100;
  const external = isExternal(s, level);
  const adds = external ? ADD_EXTERNAL : ADD_INTERNAL;
  const base: Range = [a.physMin, a.physMax];
  // Weapon mastery (addphysicsdamage_p of passives / states, weapon class checked when the bag was built).
  const mastery = attrOf(a.bag, 'addphysicsdamage_p');

  let phys: Range = [0, 0];
  const enhance = attr(s, 'physicsenhance_p', level)?.[0] ?? 0;
  if (enhance) phys = add(phys, scale(base, (100 + enhance * k + mastery) / 100));
  phys = add(phys, scale(range(s, 'physicsdamage_v', level), k));
  const parts: DamageParts = { phys, cold: [0, 0], fire: [0, 0], light: [0, 0], poison: null };
  for (const el of ELEMENT_PARTS) parts[el] = scale(range(s, SKILL_ATTR[el], level), k);
  // Tiêu Dao Cầm (internal lightning % scaling): lightingdamage_p + addlightingmagic_p.
  const lightPct = attr(s, 'lightingdamage_p', level)?.[0] ?? 0;
  const lightMagicBoost = 1 + attrOf(a.bag, 'addlightingmagic_p') / 100;
  if (lightPct > 0) {
    const baseLight = lightPct * 18 * lightMagicBoost * k;
    parts.light = add(parts.light, [baseLight * 0.9, baseLight * 1.1]);
  } else if (!external && parts.light[1] > 0 && lightMagicBoost !== 1) {
    parts.light = scale(parts.light, lightMagicBoost);
  }
  const anyDamage = enhance || phys[1] > 0 || lightPct > 0 || ELEMENT_PARTS.some(el => parts[el][1] > 0) || attr(s, 'poisondamage_v', level);
  // A plain hit (Công kích vật lý, monster swings): the base physical damage with the weapon mastery.
  if (!anyDamage) parts.phys = scale(base, (100 + mastery) / 100);
  // Adds from equipment / passives / states (physical add only on ngoại công skills and plain hits).
  if (!anyDamage || external) parts.phys = add(parts.phys, [attrOf(a.bag, adds.phys), attrOf(a.bag, adds.phys, 2) || attrOf(a.bag, adds.phys)]);
  for (const el of ELEMENT_PARTS) {
    const lo = attrOf(a.bag, adds[el]), hi = attrOf(a.bag, adds[el], 2) || lo;
    if (lo || hi) parts[el] = add(parts[el], [lo, Math.max(lo, hi)]);
  }
  // Hỏa sát tối đa +% / Lôi sát tối thiểu +% (magicdesc.ini: fireenhance_p, lightingenhance_p).
  parts.fire[1] *= 1 + attrOf(a.bag, 'fireenhance_p') / 100;
  parts.light[0] = Math.min(parts.light[1], parts.light[0] * (1 + attrOf(a.bag, 'lightingenhance_p') / 100));
  // Độc: P1 per tick, P2 frames, P3 period (+ adds per tick).
  const p = attr(s, 'poisondamage_v', level);
  const addTick = attrOf(a.bag, adds.poison);
  if ((p && p[0] > 0) || addTick > 0) {
    parts.poison = { tick: (p?.[0] ?? 0) * k + addTick, frames: p?.[1] && p[1] > 0 ? p[1] : 60, period: p?.[2] || attrOf(a.bag, adds.poison, 2) || 10 };
  }
  return parts;
}

/** Hit chance % (SRC CheckHitTarget): AR × 100 / (AR + Né × (100 − bỏ qua né)/100), kept within [HIT.min, HIT.max]. */
export function hitChance(ar: number, def: number, ignoreDefPct = 0): number {
  const d = (def * (100 - Math.min(100, ignoreDefPct))) / 100;
  if (d < 0) return HIT.max;
  if (ar <= 0) return 0;
  const c = ar + d === 0 ? 50 : (ar * 100) / (ar + d);
  return Math.max(HIT.min, Math.min(HIT.max, c));
}

/** Who hits whom with what (one hit). */
export interface HitContext {
  skill: SkillDef;
  level: number;
  attacker: CombatStats;
  target: CombatStats;
  /** Target's current Sinh lực (chí tử). */
  targetLife: number;
  pvp: boolean;
}

export interface HitOutcome {
  miss: boolean;
  /** Damage dealt now (độc comes later, `poison`). */
  dmg: number;
  crit: boolean;
  /** Trọng kích (enhancehit_rate): scales all direct damage parts by HEAVY_HIT.multiplier. */
  heavy?: boolean;
  fatal: boolean;
  /** Damage of each part after resists (cold > 0 = the hit can slow). */
  parts: Record<'phys' | ElementPart, number>;
  /** Poison put on the target (per tick after its resist, frames, period). */
  poison: { tick: number; frames: number; period: number } | null;
}

/** Resist % the target opposes to `kind` from this attacker / skill: capped resist − attacker's piercing ± ngũ hành. */
export function effectiveResist(kind: ResistKind, ctx: HitContext): number {
  const { attacker: a, target: t, skill, level } = ctx;
  const cap = Math.min(RESIST.absoluteMax, t.resistMax[kind]);
  // Kẹp trần kháng trước khi áp dụng xuyên kháng / ngũ hành khắc chế để đồ overcap kháng không vô hiệu hóa tương khắc.
  let r = Math.min(cap, t.resist[kind]) - attrOf(a.bag, ANTI_RES[kind]) - attrOf(a.bag, 'anti_allres_p');
  // Ngũ hành (SRC ReceiveDamage): a skill of the series that counters the target lowers its resist by seriesdamage_p, a
  // countered one raises it.
  const series = (skill.series ?? -1) >= 0 ? SERIES_ORDER[skill.series!] : a.series;
  const pct = attr(skill, 'seriesdamage_p', level)?.[0] ?? 0;
  if (ELEMENT_COUNTERS[series] === t.series) r -= pct;
  else if (ELEMENT_COUNTERS[t.series] === series) r += pct;
  return Math.max(-t.resistMax[kind], Math.min(cap, r));
}

/** One hit: rolls every range (`rng` in [0, 1)). */
export function resolveHit(parts: DamageParts, ctx: HitContext, rng: () => number): HitOutcome {
  const { skill, level, attacker: a, target: t } = ctx;
  const out: HitOutcome = { miss: false, dmg: 0, crit: false, fatal: false, parts: { phys: 0, cold: 0, fire: 0, light: 0 }, poison: null };
  if (skill.useAR) {
    const ar = a.ar * (1 + (attr(skill, 'attackrating_p', level)?.[0] ?? 0) / 100);
    const ignore = (attr(skill, 'ignoredefense_p', level)?.[0] ?? 0) + attrOf(a.bag, 'ignoredefense_p');
    if (rng() * 100 >= hitChance(ar, t.def, ignore)) { out.miss = true; return out; }
  }
  const critPct = (attr(skill, 'deadlystrike_p', level)?.[0] ?? 0) + attrOf(a.bag, 'deadlystrikeenhance_p') + attrOf(a.bag, 'deadlystrike_p');
  out.crit = rng() * 100 < Math.min(CRIT.maxCritPct, critPct);
  const heavyPct = attrOf(a.bag, 'enhancehit_rate') - attrOf(t.bag, 'anti_enhancehit_rate');
  out.heavy = heavyPct > 0 && rng() * 100 < Math.min(HEAVY_HIT.maxPct, heavyPct);
  const fatalPct = (attr(skill, 'fatallystrike_p', level)?.[0] ?? 0) - attrOf(t.bag, 'fatallystrikeres_p');
  out.fatal = fatalPct > 0 && rng() * 100 < fatalPct;
  const roll = ([lo, hi]: Range) => lo + (hi - lo) * rng();
  const after = (kind: 'phys' | ElementPart, v: number) => (v * (100 - effectiveResist(RESIST_OF[kind], ctx))) / 100;

  let phys = roll(parts.phys);
  if (out.crit) phys *= CRIT.physMultiplier;
  if (out.heavy) phys *= HEAVY_HIT.multiplier;
  out.parts.phys = after('phys', phys);
  for (const el of ELEMENT_PARTS) {
    if (parts[el][1] <= 0) continue;
    let v = out.fatal ? ctx.targetLife * (CRIT.fatalMinPct + (CRIT.fatalMaxPct - CRIT.fatalMinPct) * rng()) / 100 : roll(parts[el]);
    if (out.heavy) v *= HEAVY_HIT.multiplier;
    out.parts[el] = after(el, v);
  }
  const attackSeries = (skill.series ?? -1) >= 0 ? SERIES_ORDER[skill.series!] : a.series;
  const pvpScale = ctx.pvp
    ? (ELEMENT_COUNTERS[attackSeries] === t.series ? PVP.counterDamageScale : PVP.damageScale)
    : 1;
  let dmg = out.parts.phys + out.parts.cold + out.parts.fire + out.parts.light;
  // Bonus / series damage modifiers (e.g. Tiêu Dao Túy Tửu add_damage_p, Thiên Lý Độc Hành me2waterdamage_p / water2medamage_p).
  const addDmgPct = attrOf(a.bag, 'add_damage_p');
  if (addDmgPct !== 0) dmg *= Math.max(0.1, 1 + addDmgPct / 100);
  if (t.series === 'thuy') {
    const vsWater = attrOf(a.bag, 'me2waterdamage_p');
    if (vsWater !== 0) dmg *= Math.max(0.1, 1 + vsWater / 100);
  }
  if (a.series === 'thuy') {
    const fromWater = attrOf(t.bag, 'water2medamage_p');
    if (fromWater > 0) dmg *= Math.max(0.2, 1 - fromWater / 100);
  }
  if (ctx.pvp) dmg *= pvpScale;
  out.dmg = dmg > 0 ? Math.max(1, Math.round(dmg)) : 0;
  if (parts.poison && parts.poison.tick > 0) {
    const tick = (parts.poison.tick * (100 - effectiveResist('poison', ctx))) / 100 * pvpScale;
    if (tick > 0) out.poison = { ...parts.poison, tick: Math.max(1, Math.round(tick)) };
  }
  return out;
}

/**
 * Phản đòn (La Hán Trận, Minh Kính Vô Di, trang bị): part of the damage a target took goes back to the attacker —
 * meleedamagereturn_p / _v for melee skills, rangedamagereturn_p / _v for the others (DATA magicdesc "Phản đòn cận chiến /
 * tầm xa"), lowered by the attacker's returnres_p (+ melee_returnres_p for melee) "kháng phản đòn". The returned damage is
 * not returned again. How the engine rounds / caps it is not in the data (CHỌN: % of the damage taken + points, ≥ 0).
 */
/**
 * Hút sinh lực / nội lực: the attacker gets back that % of the damage a direct hit dealt — the skill's steallife_p /
 * stealmana_p (DATA magicdesc "Hút Sinh lực: x%", e.g. Thâu Thiên Hoán Nhật, Vân Long Kích) plus steallifeenhance_p /
 * stealmanaenhance_p of weapons and bùa ("Hút sinh lực: +x%"). Adding the two and the cap (STEAL.maxPct) are CHỌN: the
 * engine code is not in the client.
 */
export function lifeSteal(dmg: number, attackerBag: AttrBag, s: SkillDef | undefined, level: number): { hp: number; mp: number } {
  if (dmg <= 0) return { hp: 0, mp: 0 };
  const skill = (name: string) => (s ? attr(s, name, level)?.[0] ?? 0 : 0);
  const pct = (own: string, item: string) => Math.min(STEAL.maxPct, Math.max(0, skill(own) + attrOf(attackerBag, item) + attrOf(attackerBag, own)));
  return {
    hp: Math.floor((dmg * pct('steallife_p', 'steallifeenhance_p')) / 100),
    mp: Math.floor((dmg * pct('stealmana_p', 'stealmanaenhance_p')) / 100),
  };
}

export function damageReturn(dmg: number, targetBag: AttrBag, attackerBag: AttrBag, melee: boolean): number {
  if (dmg <= 0) return 0;
  const pct = attrOf(targetBag, melee ? 'meleedamagereturn_p' : 'rangedamagereturn_p');
  const flat = attrOf(targetBag, melee ? 'meleedamagereturn_v' : 'rangedamagereturn_v');
  const back = (dmg * Math.max(0, pct)) / 100 + Math.max(0, flat);
  const res = Math.min(100, attrOf(attackerBag, 'returnres_p') + (melee ? attrOf(attackerBag, 'melee_returnres_p') : 0));
  return Math.max(0, Math.round(back * (1 - Math.max(0, res) / 100)));
}

/** Lượng máu ảo của Hộ Thuẫn Nội Lực tĩnh (`staticmagicshield_p`), quy đổi theo `STATIC_SHIELD.scale` và kẹp trần theo `STATIC_SHIELD.maxHpRatio × maxHp`. */
export function staticShieldPool(maxMp: number, maxHp: number, shieldPct: number): number {
  if (maxMp <= 0 || maxHp <= 0 || shieldPct <= 0) return 0;
  const raw = Math.round((maxMp * shieldPct * STATIC_SHIELD.scale) / 100);
  const cap = Math.round(maxHp * STATIC_SHIELD.maxHpRatio);
  return Math.max(0, Math.min(raw, cap));
}
