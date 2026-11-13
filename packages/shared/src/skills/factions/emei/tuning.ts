import type { SkillTuning } from '../../core/types.js';

/**
 * Hand adjustments for Nga My (kept when gen:skills runs again). Keys are original skill ids, e.g.
 *   29: { damage: 1.2 },          // Trảm Long Quyết hits 20% harder
 *   40: { disabled: 'Chưa hỗ trợ' },
 */
export const TUNING: Record<number, SkillTuning> = {
  // Bế Nguyệt Phất Trần (120): DATA script/skill/emei.lua — 712 skill_appendskill 86 (Lưu Thủy) and its sub-skills emei120_1–4
  // 89 (Mộng Điệp), 92 (Phật Tâm Từ Hữu), 282 (Thanh Âm Phạn Xướng), 332 (Phổ Độ Chúng Sinh): all five Nga My auras at once,
  // at the 712 level (level 20 → 40).
  712: { appendSkills: [86, 89, 92, 282, 332] },
};
