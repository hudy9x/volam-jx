// Levels and experience. Rules and sources: docs/formulas/level.md.
import { LEVEL_EXP } from '../characters/player.gen.js';
import { LEVEL } from './tuning.js';

/** Exp needed to go from `level` to the next (level_exp.txt); Infinity at the max level. */
export const expToNext = (level: number): number => (level >= LEVEL.max ? Infinity : LEVEL_EXP[level - 1] ?? Infinity);

/**
 * Exp a player gets from `exp` after the level gap to the monster (SRC KPlayer::AddSelfExp): full within 5 levels,
 * (295 − 19 × gap) / 200 up to 15, then 1; at or above a level-100+ monster: − gap / 200.
 */
export function expAfterGap(exp: number, playerLevel: number, monsterLevel: number): number {
  const gap = Math.abs(playerLevel - monsterLevel);
  let out: number;
  if (playerLevel >= monsterLevel && monsterLevel >= 100) out = exp - (exp * gap) / 200;
  else if (gap <= LEVEL.fullExpGap) out = exp;
  else if (gap <= LEVEL.reducedExpGap) out = (exp * (295 - 19 * gap)) / 200;
  else out = 1;
  return Math.max(1, Math.floor(out * LEVEL.rate));
}

/**
 * Each attacker's part of a monster's exp: exp × damage dealt ÷ the monster's max Sinh lực (SRC KNpcDeathCalcExp).
 * `damage` = what each attacker dealt; result in the same order.
 */
export const expShare = (exp: number, maxLife: number, damage: number): number =>
  maxLife > 0 ? Math.floor((exp * Math.min(damage, maxLife)) / maxLife) : 0;

export interface LevelUp { level: number; exp: number; levels: number }

/** Add `gain` exp: new level / leftover exp and how many levels were gained. */
export function addExp(level: number, exp: number, gain: number): LevelUp {
  let l = level, e = exp + Math.max(0, gain), n = 0;
  while (l < LEVEL.max && e >= expToNext(l)) { e -= expToNext(l); l++; n++; }
  if (l >= LEVEL.max) e = 0;
  return { level: l, exp: e, levels: n };
}
