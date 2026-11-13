// Monster numbers by level. The original computes them per monster with a level script (npcs.txt LevelScript →
// script/npclevelscript/*.lua; docs/combat-formulas.md §8). The most common one, standard.lua, is a broken line per
// 10 levels: y = b + k × (L − (first level of the segment − 1)), with multipliers from level 30. Every monster uses it
// for now (the other 50 scripts and per-monster resists: GP10). Docs: docs/formulas/level.md, damage.md.

/** [first level, b, k] segments of standard.lua's exp column (DATA). */
const EXP_SEGMENTS: [number, number, number][] = [
  [1, 40, 5], [11, 120, 5], [21, 240, 5], [31, 360, 5], [41, 480, 5], [51, 600, 5],
  [61, 720, 5], [71, 800, 5], [81, 900, 5], [91, 1000, 5],
];
/** standard.lua multiplies exp × 1.5 from level 30 (DATA). */
const EXP_BOOST_FROM = 30;
const EXP_BOOST = 1.5;

/**
 * Exp a monster of `level` gives (whole kill, before sharing and the level gap): b + k × (L − (first − 1)) of its
 * segment, × 1.5 from level 30. Past level 100 the original reads npcs.txt parameters; the last segment is extended (CHỌN).
 * Bosses: × `bossMul`.
 */
export function monsterExp(level: number, bossMul = 1): number {
  const L = Math.max(1, Math.floor(level));
  const [first, b, k] = EXP_SEGMENTS.filter(([from]) => L >= from).pop()!;
  const exp = (b + k * (L - (first - 1))) * (L >= EXP_BOOST_FROM ? EXP_BOOST : 1);
  return Math.round(exp * bossMul);
}

/** standard.lua columns per 10-level segment (DATA): [first level, Sinh lực b, k, Chính xác b, k, Né b, k, damage b, k]. */
const CURVE: [number, number, number, number, number, number, number, number, number][] = [
  [1, 50, 3, 10, 3, 10, 0, 3, 0.3], [11, 122, 8, 50, 4, 50, 3, 8, 0.3], [21, 270, 30, 100, 5, 100, 5, 13, 0.4],
  [31, 900, 35, 250, 5, 150, 5, 20, 0.5], [41, 1450, 60, 400, 5, 200, 5, 29, 0.5], [51, 2100, 48, 500, 5, 300, 5, 39, 0.6],
  [61, 2950, 54, 600, 5, 400, 5, 50, 0.7], [71, 3500, 58, 700, 5, 500, 5, 65, 0.8], [81, 5050, 11, 800, 5, 600, 5, 85, 0.9],
  [91, 6450, 11, 900, 5, 800, 10, 112, 1],
];
/** standard.lua from level 30: Sinh lực × 5, Chính xác × 1.2, Né × 1.1 (DATA). */
const BOOST = { life: 5, ar: 1.2, def: 1.1 };

export interface MonsterCurve { life: number; ar: number; def: number; damage: number }

/** Sinh lực, Chính xác, Né tránh and damage (min = max) of an ordinary monster of `level` (standard.lua). */
export function monsterCurve(level: number): MonsterCurve {
  const L = Math.max(1, Math.floor(level));
  const [first, lb, lk, ab, ak, db, dk, mb, mk] = CURVE.filter(([from]) => L >= from).pop()!;
  const x = L - (first - 1);
  const boost = L >= EXP_BOOST_FROM;
  return {
    life: Math.round((lb + lk * x) * (boost ? BOOST.life : 1)),
    ar: Math.round((ab + ak * x) * (boost ? BOOST.ar : 1)),
    def: Math.round((db + dk * x) * (boost ? BOOST.def : 1)),
    damage: Math.max(1, Math.round(mb + mk * x)),
  };
}
