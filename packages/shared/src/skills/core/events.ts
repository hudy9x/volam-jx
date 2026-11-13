// Tầng chiêu (skill layers): child skills a skill fires when a missile starts / flies / hits / vanishes.
// skills.txt names the child in its event columns (StartEvent…); the per-level attribute skill_<kind>event
// = [on (0/1), -, child id] switches it on from a skill level (Nhân Kiếm Hợp Nhất: kiếm rơi from level 11,
// vòng tròn from level 16). When the attribute exists it decides; the column alone means "always".
// skill_showevent (bit 1 start, 2 fly, 4 collide, 8 vanish) tells the description which layers to show.
// Rà soát 11 phái: docs/skills-layers.md.
import { attr } from './formula.js';
import type { SkillDef } from './types.js';

export type SkillEventKind = 'start' | 'fly' | 'collide' | 'vanish';

const ATTR: Record<SkillEventKind, string> = {
  start: 'skill_startevent', fly: 'skill_flyevent', collide: 'skill_collideevent', vanish: 'skill_vanishedevent',
};
const SHOW_BIT: Record<SkillEventKind, number> = { start: 1, fly: 2, collide: 4, vanish: 8 };

/** Child skill fired on `kind` at skill `level`, or 0 when that layer is off. */
export function eventSkill(s: SkillDef, kind: SkillEventKind, level: number): number {
  const a = attr(s, ATTR[kind], level);
  if (a) return a[0] ? a[2] || s.events?.[kind] || 0 : 0;
  return s.events?.[kind] ?? 0;
}

/** Level from which a layer is on (1 = always, 0 = never within maxLevel). */
export function eventFromLevel(s: SkillDef, kind: SkillEventKind): number {
  const max = s.maxLevel ?? 20;
  for (let l = 1; l <= max; l++) if (eventSkill(s, kind, l)) return l;
  return 0;
}

/** Layers the original description shows at `level` (skill_showevent bits); all on layers when absent. */
export function shownEvents(s: SkillDef, level: number): SkillEventKind[] {
  const bits = attr(s, 'skill_showevent', level)?.[0];
  return (Object.keys(ATTR) as SkillEventKind[]).filter(k => eventSkill(s, k, level) && (bits === undefined || bits & SHOW_BIT[k]));
}
