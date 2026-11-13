// Learning and levelling skills: which skills show up at which character level, which take skill points and which
// level by practice (thục luyện), and the limits on both. Research and sources: docs/research/skills-progression.md;
// rules in words: docs/formulas/skills.md. Numbers that are our choice are marked CHỌN.
import { attr } from './formula.js';
import { getSkill, tuningOf } from './registry.js';
import { PRACTICE } from '../../formulas/tuning.js';
import type { SkillDef } from './types.js';

/**
 * How a skill gains levels:
 *  - 'points'   1 skill point per level: normal skills, the five 90 skills + 1110 the original raises by points, and the
 *               120 skills (USER 2026-11-12).
 *  - 'practice' thục luyện: exp per landed hit against skill_skillexp_v (exp from level L to L+1) — 90 and 150 skills;
 *               speed from PRACTICE (formulas/tuning.ts) / SkillTuning.practiceHours.
 */
export type SkillGrowth = 'points' | 'practice';

/** 90 / 150 skills the original raises with points, with their prerequisite skills (skilllvlup.lua, DATA). */
export const POINT_SKILL_PREREQS: Record<number, number[]> = {
  351: [347, 303, 343, 345, 349], // Loạn Hoàn Kích (Đường Môn)
  390: [67, 70, 64, 356, 72], // Đoạn Cân Hủ Cốt (Ngũ Độc)
  332: [93, 89, 86, 92, 282], // Phổ Độ Chúng Sinh (Nga My)
  391: [136, 137, 140, 364, 143], // Nhiếp Hồn Loạn Tâm (Thiên Nhẫn)
  394: [392, 174, 393, 175, 90], // Túy Tiên Tá Cốt (Côn Lôn)
  1110: [45, 351], // Tích Lịch Loạn Hoàn Kích (Đường Môn 150)
};
/** skilllvlup.lua: every prerequisite ≥ 5; up to level 15 each must also be ≥ current level + 5 (DATA). */
const PREREQ_MIN = 5;
const PREREQ_LEAD = 5;
const PREREQ_LEAD_UNTIL = 15;

/** Learning tiers whose skills appear only through a bí kíp (Kỳ Trân Các, items/books.ts — user 2026-11-12). */
export const TIER_BOOKS = [90, 120, 150];

/** 150 skills stop at 20 until an unlock item (Mở sách kĩ năng cấp 150, mật tịch 21–23; not in the game yet). */
export const LEVEL_150_CAP = 20;

const hasExpTable = (s: SkillDef) => !!s.attrs?.skill_skillexp_v;

export function skillGrowth(s: SkillDef): SkillGrowth {
  if (POINT_SKILL_PREREQS[s.id]) return 'points';
  if (!s.expSkill || !hasExpTable(s)) return 'points'; // IsExpSkill without a table (Thất truyền, kinh mạch): points — CHỌN
  if ((s.reqLevel ?? 0) >= 120 && (s.reqLevel ?? 0) < 150) return 'points'; // 120: skill points (USER)
  return 'practice'; // 90 (addskillexp1) and 150 (USER: like 90)
}

/** Level a skill has when it appears: common / practice / kill-exp skills start at 1, point skills at 0 (DATA AddMagic(id[,1])). */
export const startLevel = (s: SkillDef): number => (s.pack === 'common' || skillGrowth(s) !== 'points' ? 1 : 0);

/** Highest level reachable now. */
export function levelCap(s: SkillDef, charLevel: number): number {
  const max = (s.reqLevel ?? 0) >= 150 ? Math.min(s.maxLevel ?? 20, LEVEL_150_CAP) : (s.maxLevel ?? 20);
  if (skillGrowth(s) !== 'points') return max;
  // The original refuses "phải đạt đến cấp %d mới có thể thăng cấp %s" (DATA stringtable G_PLAYER_4) but its formula is
  // not in the client: level − ReqLevel + 1 like jx-web-main (CHỌN, BACKLOG KN12).
  return Math.max(0, Math.min(max, charLevel - (s.reqLevel ?? 1) + 1));
}

/** Why one more point cannot go into `id` now, or null. `levels` = the character's current skill levels. */
export function raiseError(id: number, levels: Record<number, number>, charLevel: number, points: number): string | null {
  const s = getSkill(id);
  if (!s) return 'Kỹ năng không tồn tại.';
  if (s.pack === 'common') return `Kỹ năng ${s.name} không cần cộng điểm.`;
  const cur = levels[id];
  if (cur === undefined) return 'Chưa học kỹ năng này.';
  if (skillGrowth(s) !== 'points') return `Không thể sử dụng điểm kỹ năng để thăng cấp kỹ năng ${s.name}.`; // DATA G_PLAYER_1
  if (points <= 0) return 'Không còn điểm kỹ năng.';
  const cap = levelCap(s, charLevel);
  if (cur >= (s.maxLevel ?? 20)) return `${s.name} đã đạt cấp tối đa.`;
  if (cur >= cap) return `Phải đạt đến cấp ${(s.reqLevel ?? 1) + cur} mới có thể thăng cấp ${s.name}.`; // DATA G_PLAYER_4
  const pre = POINT_SKILL_PREREQS[id];
  if (pre) {
    const need = cur <= PREREQ_LEAD_UNTIL ? Math.max(PREREQ_MIN, cur + PREREQ_LEAD) : PREREQ_MIN;
    const low = pre.find(p => (levels[p] ?? 0) < need);
    if (low) return `Cần ${getSkill(low)?.name ?? low} đạt cấp ${need}.`;
  }
  return null;
}

/** Practice exp to go from `level` to the next (skill_skillexp_v), Infinity when none. */
export function skillExpToNext(s: SkillDef, level: number): number {
  const v = attr(s, 'skill_skillexp_v', level)?.[0];
  return v && v > 0 ? v : Infinity;
}

/** Total practice exp from level 1 to the cap (skill_skillexp_v). */
export function practiceTotal(s: SkillDef): number {
  const cap = (s.reqLevel ?? 0) >= 150 ? Math.min(s.maxLevel ?? 20, LEVEL_150_CAP) : (s.maxLevel ?? 20);
  let sum = 0;
  for (let l = 1; l < cap; l++) { const e = skillExpToNext(s, l); if (Number.isFinite(e)) sum += e; }
  return sum;
}

/** Hours of fighting to reach the cap: skill tuning > faction setting > PRACTICE.hours. */
export const practiceHours = (s: SkillDef): number =>
  tuningOf(s.id).practiceHours ?? (s.pack ? PRACTICE.factionHours[s.pack] : undefined) ?? PRACTICE.hours;

/**
 * Practice exp one landed hit gives: the original +1 (addskillexp1) scaled so the whole table takes practiceHours of
 * PRACTICE.hitsPerSecond hits (USER 2026-11-12). Docs: docs/formulas/skills.md.
 */
export function practicePerHit(s: SkillDef, _level: number): number {
  const total = practiceTotal(s);
  const hits = Math.max(1, practiceHours(s) * 3600 * PRACTICE.hitsPerSecond);
  return Math.max(1, Math.ceil(total / hits));
}
