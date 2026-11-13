import type { SkillTuning } from '../../core/types.js';

/**
 * Hand adjustments for Võ Đang (kept when gen:skills runs again). Keys are original skill ids, e.g.
 *   29: { damage: 1.2 },          // Trảm Long Quyết hits 20% harder
 *   40: { disabled: 'Chưa hỗ trợ' },
 */
export const TUNING: Record<number, SkillTuning> = {};
