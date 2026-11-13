import { attr1 } from './formula.js';
import { getMissile, tuningOf } from './registry.js';
import { CELL } from './tuning.js';
import { ANY_WEAPON, MissileForm, MoveKind, SkillStyle, WEAPON_NAMES, type SkillDef } from './types.js';

/** Skills the engine can use: attacks, heals, bùa lợi / bùa hại, auras (toggle) — everything but passives. */
export function isCastable(s: SkillDef): boolean {
  const castStyle = s.style === SkillStyle.Missiles || s.style === SkillStyle.Melee || s.style === SkillStyle.State
    || s.style === SkillStyle.StateMissile;
  return castStyle && !tuningOf(s.id).disabled;
}

export function maxLevelOf(s: SkillDef): number {
  return Math.max(1, s.maxLevel ?? 20);
}

/**
 * Ngoại công skill of a hand weapon with the Magic pose: the column that swings the weapon down (chém / bổ xuống), from
 * the sprites of the 未骑马关联表 (EqtLimit 0 kiếm, 1 đao, 2 côn, 3 thương, 4 chùy):
 * đao Attack2 = MeleeWPuncture (raised, cut down; Magic = MeleeWMagic is a palm push), thương Attack2 = RangeWCut,
 * côn Attack1 = RangeWCut. Kiếm and chùy keep Magic on foot (kiếm khí / a swing already).
 * Mounted every weapon uses RideCut (Attack1); RideMagic only raises the weapon like a bùa.
 */
const SWING_ON_FOOT: Record<number, 'attack' | 'attack2'> = { 1: 'attack2', 2: 'attack', 3: 'attack2' };
const HAND_WEAPONS = new Set([0, 1, 2, 3, 4]);

/**
 * Pose of the caster: 'attack' / 'attack2' (ngoại công) or 'cast' (nội công) — skills.txt CharAnimId = column of the
 * 关联表 (9 Attack1, 10 Attack2, 11 Magic). Ngoại công skills of a hand weapon with Magic swing the weapon instead
 * (SWING_ON_FOOT; **suy luận** from the sprites: the original rule lives in the engine).
 */
export function castAnim(s: SkillDef, mounted = false): 'attack' | 'attack2' | 'cast' {
  if (s.anim === 9) return 'attack';
  if (s.anim === 10) return 'attack2';
  const w = s.weapon ?? -2;
  if (!s.physical || !HAND_WEAPONS.has(w)) return 'cast';
  return mounted ? 'attack' : SWING_ON_FOOT[w] ?? 'cast';
}

export function skillRange(s: SkillDef, level: number): number {
  return attr1(s, 'skill_attackradius', level, s.radius ?? 0) || s.radius || 0;
}

/** Collision / damage radius (logic px) for a range given in map cells. */
export const cellRadius = (cells: number) => Math.max(20, (Math.max(1, cells) - 0.5) * CELL + 12);

/** No skill is cast from closer than this (logic px): range 0 (self / around the caster) still needs a step. */
const MIN_CAST_RANGE = 16;

/** Layouts whose missiles leave the caster and fly toward the aim, and the moves that fly (not stand / lob). */
const FLYING_FORMS = new Set<number>([MissileForm.Line, MissileForm.Spread, MissileForm.Circle]);
const FLYING_MOVES = new Set<number>([MoveKind.Line, MoveKind.Follow, MoveKind.SingleLine]);

/**
 * How far a flying missile of `s` gets before it vanishes (speed × lifetime, as SkillEngine.spawn reads them) plus its
 * collision radius; Infinity for skills whose missiles do not fly from the caster (strikes on the target, areas, lobs).
 */
export function missileReach(s: SkillDef, level: number): number {
  if (s.style !== SkillStyle.Missiles || !s.child || !FLYING_FORMS.has(s.form ?? MissileForm.Wall)) return Infinity;
  const m = getMissile(s.child);
  if (!m || !FLYING_MOVES.has(m.move ?? MoveKind.Stand)) return Infinity;
  const speed = attr1(s, 'missle_speed_v', level, m.speed ?? 0) || (m.speed ?? 0);
  const life = attr1(s, 'missle_lifetime_v', level, m.life ?? 1) || m.life || 1;
  return speed > 0 ? Math.round(speed * life + cellRadius(m.collide ?? 1)) : Infinity;
}

/**
 * How close the caster should be to the target before casting. Areas around the caster (MisslesForm AtFirer)
 * only reach as far as their blast, and flying missiles only as far as they fly (missileReach), whatever AttackRadius
 * says: casting from further away hits nothing (24 attack skills fly shorter than their AttackRadius, e.g. Tam Giới
 * Quy Thiền 432 / 512, Tứ Tượng Đồng Quy 192 / 416).
 */
export function castRange(s: SkillDef, level: number): number {
  let r = skillRange(s, level);
  if (s.style === SkillStyle.Missiles && s.form === MissileForm.AtFirer && s.child) {
    const m = getMissile(s.child);
    if (m) r = Math.min(r || Infinity, Math.round(cellRadius(m.dmgRange ?? m.collide ?? 1) * 0.8));
  }
  return Math.max(MIN_CAST_RANGE, Math.min(r, missileReach(s, level)));
}

/** Close-combat skill (Melee style, or flagged melee in skills.txt): auto-fight walks right up to the target. */
export const isMelee = (s: SkillDef): boolean => s.style === SkillStyle.Melee || !!s.melee;

export function skillCost(s: SkillDef, level: number): number {
  return Math.max(0, Math.round(attr1(s, 'skill_cost_v', level) * (tuningOf(s.id).cost ?? 1)));
}

export function weaponOk(s: SkillDef, weaponType: number): boolean {
  const need = s.weapon ?? ANY_WEAPON;
  return need === ANY_WEAPON || need === weaponType;
}

export function weaponName(type: number): string {
  return WEAPON_NAMES[type] ?? `Vũ khí ${type}`;
}

/** Weapon type of an equipped weapon item (shared/data/items kind + type), -1 = bare hand. */
export function weaponTypeOf(item: { kind: string; type: number } | undefined): number {
  if (!item) return -1;
  if (item.kind === 'range') return 100 + item.type;
  if (item.kind === 'melee') return item.type <= 5 ? item.type : -1;
  return -1;
}

