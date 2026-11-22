import type { SkillDef } from '../core/types.js';

/**
 * Hand-maintained SkillDef overrides (kept when gen:skills regenerates skills.gen.ts).
 * Keys are original skills.txt IDs.
 */
export const SKILL_OVERRIDES: Record<number, Partial<SkillDef>> = {
  // 1. Thiên Vương: Bá Vương Tạm Kim (#1060) giảm xuống 2 thức (2×3 = 6 tia) và giãn nhịp giữa các thức (5 ticks)
  1060: { childNum: 2, genData: 5 },

  // 5. Cái Bang: Bổng Huýnh Lược Địa (#1074) bắn 3 tia song song như Thiên Hạ Vô Cẩu
  1074: { form: 0, gen: 0, genData: 0, childNum: 3, p1: 36 },

  // 7. Võ Đang: Thiên Địa Vô Cực (#365) & Tạo Hóa Thái Thanh (#1078) ra chiêu nhanh hơn
  365: { wait: 1 },
  1078: { wait: 1 },

  // 8. Thúy Yên: Băng Tước Hoạt Kỳ (#1063) 3 tia từ người chơi tách dần 2 bên (~10° mỗi tia)
  1063: { form: 2, childNum: 3, p1: 1.8 },

  // Tiêu Dao: Thiên Lý Độc Hành (#2123, Trấn phái) tối đa cấp 30
  2123: { maxLevel: 30 },
};
