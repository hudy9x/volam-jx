import type { Curve, SkillDef } from './types.js';

/**
 * Value of a level curve at `x` (script/skill/head.lua `Link` with the default `Line`): straight segments
 * between the points, extended past both ends with the first / last segment.
 */
export function link(x: number, points: Curve): number {
  const n = points.length;
  if (n === 0) return 0;
  if (n === 1) return points[0][1];
  let a = points[0], b = points[1];
  if (x > points[n - 1][0]) { a = points[n - 2]; b = points[n - 1]; }
  else if (x >= points[0][0]) {
    for (let i = 1; i < n; i++) {
      if (x <= points[i][0]) { a = points[i - 1]; b = points[i]; break; }
    }
  }
  if (b[0] === a[0]) return b[1];
  return ((b[1] - a[1]) * (x - a[0])) / (b[0] - a[0]) + a[1];
}

/** [p1, p2, p3] of a level attribute (floored like GetSkillLevelData), or null when the skill has none. */
export function attr(skill: SkillDef, name: string, level: number): [number, number, number] | null {
  const curves = skill.attrs?.[name];
  if (!curves) return null;
  return [0, 1, 2].map(i => (curves[i] ? Math.floor(link(level, curves[i]!)) : 0)) as [number, number, number];
}

/** p1 of an attribute, or `fallback` when absent. */
export function attr1(skill: SkillDef, name: string, level: number, fallback = 0): number {
  return attr(skill, name, level)?.[0] ?? fallback;
}
