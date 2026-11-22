// Combat stats: what the damage and effect formulas read, the same shape for players and monsters (so a skill works the
// same whoever uses it, AGENTS.md §5.2). Players: formulas/character.ts + the attribute bag; monsters: their level curve.
// Docs: docs/formulas/damage.md.
import type { Element } from '../characters/factions.js';
import { attr } from '../skills/core/formula.js';
import { getSkill } from '../skills/core/registry.js';
import { SkillStyle, type SkillDef } from '../skills/core/types.js';
import { addAttr, attrOf, type AttrBag } from './attrs.js';
import { RESIST_ATTR, RESIST_KINDS, type CharacterStats, type ResistKind } from './character.js';
import { monsterCurve } from './monster.js';
import { EFFECTS, RESIST } from './tuning.js';

export interface CombatStats {
  kind: 'player' | 'monster';
  /** Skill damage multiplier; absent means 1. Does not scale reflected damage. */
  outgoingDamageMultiplier?: number;
  level: number;
  /** Ngũ hành of the fighter (skills without their own series use it). */
  series: Element;
  /** Chính xác, Né tránh. */
  ar: number;
  def: number;
  /** Resist % (capped) and caps per kind. */
  resist: Record<ResistKind, number>;
  resistMax: Record<ResistKind, number>;
  /** Base physical damage (weapon + potential for players, the level curve for monsters). */
  physMin: number;
  physMax: number;
  /** Worn weapon (weaponTypeOf: -1 bare hands, 0–5 melee, 100+ hidden weapons); monsters -1. */
  weaponType: number;
  /** Everything else from equipment, passives and states (crit, elemental adds, steal, reductions, speeds…). */
  bag: AttrBag;
  /** % added to the damage of each skill id (addskilldamageN on learned skills: P1 skill, P3 %). */
  skillBonus: Record<number, number>;
  /** Hit recovery % and flinch frames (co giật, formulas/effects.ts). */
  hitRecover: number;
  hurtFrames: number;
}

/** Attributes that belong to the skill itself, not to the character (cast data, per-skill bonuses). */
const SKILL_OWN = /^(skill_|missle_|addskilldamage|addskillexp)/;

/**
 * P3 of addphysicsdamage_p is the weapon class it boosts (INFERRED from the passives: 0 kiếm, 1 đao, 2 côn, 3 thương,
 * 4 chùy, 5 song đao, 7 ám khí, 9 tay không; other values, e.g. 6 on auras, = any weapon — same reading as jx-web-main).
 */
export function weaponClass(weaponType: number): number {
  if (weaponType >= 100) return 7;
  if (weaponType < 0) return 9;
  return weaponType;
}
const CLASS_BOUND = new Set([0, 1, 2, 3, 4, 5, 7, 9]);
export const boostsWeapon = (p3: number, weaponType: number) => !CLASS_BOUND.has(p3) || p3 === weaponClass(weaponType);

/** Add one attribute of a skill (passive / state) to a bag, honouring the weapon class of addphysicsdamage_p. */
export function addSkillAttr(bag: AttrBag, name: string, v: [number, number, number], weaponType: number): void {
  if (SKILL_OWN.test(name)) return;
  if (name === 'addphysicsdamage_p' && !boostsWeapon(v[2], weaponType)) return;
  // On passives / states P2 is the duration (−1 = always), not a value: keep P1 (value) and P3 (max, period, weapon…).
  addAttr(bag, name, [v[0], 0, v[2]]);
}

/** Bag of the passive skills (style Passive) a fighter knows, at their levels (P2 = −1: always on). */
export function passiveBag(levels: Iterable<[number, number]>, weaponType: number): AttrBag {
  const bag: AttrBag = {};
  for (const [id, lv] of levels) {
    const s = getSkill(id);
    if (!s || lv <= 0 || s.inactive || s.style !== SkillStyle.Passive) continue;
    for (const name of Object.keys(s.attrs ?? {})) {
      const v = attr(s, name, lv);
      if (v) addSkillAttr(bag, name, v, weaponType);
    }
  }
  return bag;
}

/** % bonus per skill id from every learned skill's addskilldamageN (P1 = skill id, P3 = %; SRC GetEchoDamage "Cộng%"). */
export function skillBonuses(levels: Iterable<[number, number]>): Record<number, number> {
  const out: Record<number, number> = {};
  for (const [id, lv] of levels) {
    const s: SkillDef | undefined = getSkill(id);
    if (!s || lv <= 0 || s.inactive) continue;
    for (const name of Object.keys(s.attrs ?? {})) {
      if (!name.startsWith('addskilldamage')) continue;
      const v = attr(s, name, lv);
      if (v && v[0] > 0 && v[2]) out[v[0]] = (out[v[0]] ?? 0) + v[2];
    }
  }
  return out;
}

/** Combat stats of a player from its character stats. */
export function playerCombat(
  c: CharacterStats, level: number, series: Element, weaponType: number, bag: AttrBag, skillBonus: Record<number, number>,
): CombatStats {
  return {
    kind: 'player', level, series, ar: c.ar, def: c.def, resist: c.resist, resistMax: c.resistMax,
    physMin: c.physMin, physMax: c.physMax, weaponType, bag, skillBonus,
    hitRecover: EFFECTS.playerHitRecover + attrOf(bag, 'fasthitrecover_v'), hurtFrames: EFFECTS.playerHurtFrames,
  };
}

/**
 * Combat stats of a monster of `level` (standard.lua curve, formulas/monster.ts) with flat resist `resistPct` on every
 * kind (CHỌN until per-monster resists are imported, GP10), its states / passives in `bag`.
 */
export function monsterCombat(
  level: number, series: Element, resistPct: number, hitRecover: number, bag: AttrBag, skillBonus: Record<number, number> = {},
): CombatStats {
  const c = monsterCurve(level);
  const resist = {} as Record<ResistKind, number>, resistMax = {} as Record<ResistKind, number>;
  for (const k of RESIST_KINDS) {
    const cap = Math.min(RESIST.absoluteMax, RESIST.cap + attrOf(bag, 'allresmax_p') + attrOf(bag, RESIST_ATTR[k].max));
    resistMax[k] = cap;
    resist[k] = Math.max(-cap, Math.min(cap, resistPct + attrOf(bag, RESIST_ATTR[k].res) + attrOf(bag, 'allres_p')));
  }
  const ar = c.ar * (1 + attrOf(bag, 'attackratingenhance_p') / 100);
  const def = Math.max(0, c.def + attrOf(bag, 'adddefense_v'));
  return {
    kind: 'monster', level, series, ar, def, resist, resistMax, physMin: c.damage, physMax: c.damage, weaponType: -1, bag, skillBonus,
    hitRecover: hitRecover + attrOf(bag, 'fasthitrecover_v'), hurtFrames: EFFECTS.monsterHurtFrames,
  };
}
