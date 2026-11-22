import type { AttrCurves, SkillDef } from '../core/types.js';

export type SkillOverride = Omit<Partial<SkillDef>, 'attrs'> & {
  attrs?: Record<string, AttrCurves | undefined>;
};

/**
 * Hand-maintained SkillDef overrides (kept when gen:skills regenerates skills.gen.ts).
 * Keys are original skills.txt IDs.
 */
export const SKILL_OVERRIDES: Record<number, SkillOverride> = {
  // 1. Thiên Vương: Bá Vương Tạm Kim (#1060) giảm xuống 2 thức (2×3 = 6 tia) và giãn nhịp giữa các thức (5 ticks)
  1060: { childNum: 2, genData: 5 },

  // 5. Cái Bang: Bổng Huýnh Lược Địa (#1074) bắn 3 tia song song như Thiên Hạ Vô Cẩu
  1074: { form: 0, gen: 0, genData: 0, childNum: 3, p1: 36 },

  // 7. Võ Đang: Thiên Địa Vô Cực (#365) & Tạo Hóa Thái Thanh (#1078) ra chiêu nhanh hơn
  365: { wait: 1 },
  1078: { wait: 1 },

  // 8. Thúy Yên: Băng Tước Hoạt Kỳ (#1063) 3 tia từ người chơi tách dần 2 bên (~10° mỗi tia)
  1063: { form: 2, childNum: 3, p1: 1.8 },

  // Tiêu Dao: cân bằng tổng thể về mặt bằng SHXT (bị động, Kiếm 90/150, Cổ Cầm 90/150)
  2121: {
    attrs: {
      fastwalkrun_p: [[[1, 6], [20, 40], [21, 40]], [[1, -1], [20, -1]], null],
    },
  },
  2122: {
    attrs: {
      lifemax_v: [[[1, 30], [20, 600], [30, 900]], [[1, -1], [20, -1]], null],
    },
  },
  // Thiên Lý Độc Hành (#2123, Trấn phái) tối đa cấp 30; tốc đánh/ra chiêu giữ theo chuẩn Võ Đang cấp 30 (65/65).
  2123: {
    maxLevel: 30,
    attrs: {
      attackspeed_v: [[[1, 20], [20, 50], [30, 65], [35, 72]], [[1, -1], [30, -1]], null],
      lifemax_p: [[[1, 5], [30, 20], [35, 23]], [[1, -1], [30, -1]], null],
      addlightingdamage_v: [[[1, 20], [30, 150], [35, 175]], [[1, -1], [2, -1]], null],
      addlightingmagic_p: [[[1, 5], [20, 25], [30, 35], [35, 40]], [[1, -1], [2, -1]], null],
      me2waterdamage_p: [[[1, 10], [35, 10]], [[1, -1], [30, -1]], null],
      water2medamage_p: [[[1, 10], [35, 10]], [[1, -1], [30, -1]], null],
    },
  },
  2124: {
    attrs: {
      physicsenhance_p: [[[1, 20], [20, 300], [33, 495]], null, null],
      lightingdamage_v: [[[1, 20], [15, 150], [20, 350], [26, 470]], null, [[1, 20], [15, 150], [20, 350], [26, 470]]],
      stun_p: undefined,
    },
  },
  2125: {
    attrs: {
      physicsenhance_p: [[[1, 20], [20, 300], [33, 495]], null, null],
      lightingdamage_v: [[[1, 20], [15, 150], [20, 350], [26, 470]], null, [[1, 20], [15, 150], [20, 350], [26, 470]]],
      stun_p: undefined,
    },
  },
  2126: {
    attrs: {
      physicsenhance_p: [[[1, 20], [20, 300], [33, 495]], null, null],
      lightingdamage_v: [[[1, 20], [15, 150], [20, 350], [26, 470]], null, [[1, 20], [15, 150], [20, 350], [26, 470]]],
      stun_p: [[[1, 3], [20, 15], [21, 15]], [[1, 1], [20, 12], [21, 12]], null],
    },
  },
  2129: {
    cooldown: 54, // 54 ticks = 3s
    attrs: {
      physicsenhance_p: [[[1, 40], [20, 500], [33, 825]], null, null],
      lightingdamage_v: [[[1, 30], [15, 180], [20, 450], [26, 650]], null, [[1, 30], [15, 180], [20, 450], [26, 650]]],
    },
  },
  2130: {
    attrs: {
      hidebodyunlock: [[[1, 1], [2, 1]], [[1, 6], [2, 6]], null],
      invincibility: [[[1, 1], [2, 1]], [[1, 6], [2, 6]], null],
      frozen_action: [[[1, 1], [2, 1]], [[1, 6], [2, 6]], null],
    },
  },
  2141: {
    attrs: {
      lightingdamage_p: [[[1, 1], [20, 16], [33, 27]], null, null],
      stun_p: [[[1, 3], [20, 30], [21, 30]], [[1, 1], [20, 12], [21, 12]], null],
    },
  },
  2142: {
    attrs: {
      lightingdamage_p: [[[1, 2], [20, 30], [33, 50]], null, null],
    },
  },
  2143: {
    attrs: {
      lightingdamage_p: [[[1, 1], [20, 18], [33, 30]], null, null],
      stun_p: [[[1, 3], [20, 25], [21, 25]], [[1, 1], [20, 12], [21, 12]], null],
    },
  },

  // Tiêu Dao: Mai Danh Ẩn Tính (#2132) thuộc nhóm cấp 180 / Thất truyền (volam-3005 factionhead.lua:532);
  // hiện game chỉ mới hỗ trợ đến kỹ năng cấp 150 nên giữ ở cột 180 ở trạng thái inactive.
  2132: { inactive: true, reqLevel: 180 },

  // Thúy Yên 120: Ngự Tuyết Ẩn (#713) — đồng bộ theo volam-3005 (cuiyan.lua):
  // ẩn thân 5s -> 15s, tăng tốc chạy +1% -> +30%, hồi chiêu 60s -> 40s (lv10) -> 35s (lv20) -> 30s (lv30)
  713: {
    attrs: {
      hide: [[[1, 1], [20, 1]], [[1, 5 * 18], [20, 15 * 18], [21, 15 * 18]], null],
      fastwalkrun_p: [[[1, 1], [20, 30], [21, 30]], [[1, 5 * 18], [20, 15 * 18], [21, 15 * 18]], null],
      skill_mintimepercast_v: [[[1, 60 * 18], [10, 40 * 18], [30, 30 * 18], [31, 30 * 18]], null, null],
      skill_mintimepercastonhorse_v: [[[1, 60 * 18], [10, 40 * 18], [30, 30 * 18], [31, 30 * 18]], null, null],
    },
  },

  // Thiên Nhẫn 120: Ma Âm Phệ Phách (#715) — đồng bộ hồi chiêu 45s -> 15s theo volam-3005 (tianren.lua)
  715: {
    attrs: {
      skill_mintimepercast_v: [[[1, 45 * 18], [20, 15 * 18], [21, 15 * 18]], null, null],
      skill_mintimepercastonhorse_v: [[[1, 45 * 18], [20, 15 * 18], [21, 15 * 18]], null, null],
    },
  },
};
