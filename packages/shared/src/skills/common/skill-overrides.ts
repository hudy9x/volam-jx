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

  // 9. Đường Môn (cấp 60 / 90 / 150): xuất hiện ngay khi ra chiêu (wait: 0);
  //    Bạo Vũ Lê Hoa (#302 -> #301) & Thiết Liên Tứ Sát (#1070 -> #1098) bung tia ám khí ngay lập tức;
  //    Tiểu Lý Phi Đao (#249), Nhiếp Hồn Nguyệt Ảnh (#339) & Vô Ảnh Xuyên (#1069) bay nhanh gấp đôi (2x).
  58: { wait: 0 },
  249: { form: 1, wait: 0 },
  301: { wait: 0 },
  302: {
    wait: 0,
    events: { start: 301, fly: 301, flyTicks: 15 },
    attrs: {
      skill_startevent: [[[1, 0], [10, 0], [10, 1], [20, 1]], null, [[1, 301], [20, 301]]],
    },
  },
  339: {
    wait: 0,
    attrs: {
      missle_speed_v: [[[1, 56], [20, 64], [21, 64]], null, null],
    },
  },
  340: { wait: 0 },
  341: { wait: 0 },
  342: { wait: 0 },
  1069: {
    wait: 0,
    attrs: {
      missle_speed_v: [[[1, 64], [20, 80], [21, 80]], null, null],
    },
  },
  1070: {
    wait: 0,
    events: { start: 1098, fly: 1098, flyTicks: 12 },
    attrs: {
      skill_startevent: [[[1, 0], [10, 0], [10, 1], [20, 1]], null, [[1, 1098], [20, 1098]]],
    },
  },
  1071: { wait: 0 },
  1097: { wait: 0 },
  1098: { wait: 0 },

  // Ngũ Độc: Ngũ Độc Kỳ Kinh (#75, Trấn phái max 30) — tốc độ đánh ngoại công & nội công đạt +20% ở cấp 30 (giữ nguyên các dòng khác)
  75: {
    attrs: {
      castspeed_v: [[[1, 1], [30, 20], [31, 20]], [[1, -1], [30, -1]], null],
      attackspeed_v: [[[1, 1], [30, 20], [31, 20]], [[1, -1], [30, -1]], null],
    },
  },

  // Tiêu Dao: cân bằng tổng thể về mặt bằng SHXT (bị động, Kiếm 90/150, Cổ Cầm 90/150) & tăng tốc chiêu Kiếm 10/30/40/90 gấp đôi
  2114: { wait: 1 },
  2118: { wait: 0 },
  2119: { wait: 0 },
  2120: { wait: 1 },
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
    events: { fly: 2125, flyTicks: 1.5, vanish: 2126 },
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

  // Thiên Vương 120: Đảo Hư Thiên (#708) — đồng bộ theo volam-3005 (tianwang.lua):
  // lifereplenish_p 1% -> 35% (lv20) -> 50% (lv28), ignoreskill_p 1% -> 100% (lv28)
  708: {
    attrs: {
      lifereplenish_p: [[[1, 1], [20, 35], [28, 50], [29, 50]], [[1, -1], [2, -1]], null],
      ignoreskill_p: [[[1, 1], [28, 100], [29, 100]], [[1, -1], [2, -1]], null],
    },
  },

  // Thiếu Lâm 120: Đại Thừa Như Lai Chú (#709) — đồng bộ theo volam-3005 (shaolin.lua):
  // returnskill_p 5% -> 80%, autoreplyskill Sư Tử Hống (20) 100% khi hết CD (10s -> 4s ở lv25)
  709: {
    attrs: {
      returnskill_p: [[[1, 5], [20, 80], [21, 80]], [[1, -1], [2, -1]], null],
      autoreplyskill: [
        [[1, 20 * 256 + 1], [20, 20 * 256 + 20], [21, 20 * 256 + 21]],
        [[1, -1], [2, -1]],
        [[1, 10 * 18 * 256], [25, 4 * 18 * 256], [26, 5 * 18 * 256 + 5], [31, 5 * 18 * 256 + 10]],
      ],
    },
  },

  // Đường Môn 120: Mê Ảnh Tung (#710) — đồng bộ theo volam-3005 (tangmen.lua):
  // tầm dịch chuyển 120 -> 520, hồi chiêu đi bộ 15s -> 3s, trên ngựa 15s -> 5s
  710: {
    attrs: {
      skill_param1_v: [[[1, 120], [20, 520], [21, 520]], null, null],
      skill_mintimepercast_v: [[[1, 15 * 18], [20, 3 * 18], [21, 3 * 18]], null, null],
      skill_mintimepercastonhorse_v: [[[1, 15 * 18], [20, 5 * 18], [21, 5 * 18]], null, null],
    },
  },

  // Ngũ Độc 120: Hấp Tinh Yểm (#711) — đồng bộ theo volam-3005 (wudu.lua):
  // xác suất gắn bùa 719 khi đánh trúng 1% -> 30%, cooldown nội tại 10s
  711: {
    attrs: {
      autoattackskill: [
        [[1, 719 * 256 + 1], [20, 719 * 256 + 20], [21, 719 * 256 + 21]],
        [[1, -1], [20, -1]],
        [[1, 10 * 18 * 256 + 1], [20, 10 * 18 * 256 + 30], [21, 10 * 18 * 256 + 30]],
      ],
    },
  },

  // Nga Mi 120: Bế Nguyệt Phất Trần (#712) — bán kính vòng sáng 320 theo volam-3005 (Skills.txt)
  712: { radius: 320 },

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

  // Cái Bang 120: Hỗn Thiên Khí Công (#714 -> #720) — đồng bộ theo volam-3005 (gaibang.lua):
  // xác suất gắn bùa 720 khi đánh trúng 1% -> 10% (CD 12s), debuff 720 đủ 6 dòng kể cả fastwalkrun_p (-9% -> -50%)
  714: {
    attrs: {
      autoattackskill: [
        [[1, 720 * 256 + 1], [20, 720 * 256 + 20], [21, 720 * 256 + 21]],
        [[1, -1], [20, -1]],
        [[1, 12 * 18 * 256 + 1], [20, 12 * 18 * 256 + 10], [21, 12 * 18 * 256 + 10]],
      ],
    },
  },
  720: {
    attrs: {
      physicsres_p: [[[1, -1], [25, -20], [26, -20]], [[1, 3 * 18], [15, 8 * 18], [20, 9 * 18], [21, 9 * 18]], null],
      fireres_p: [[[1, -1], [25, -20], [26, -20]], [[1, 3 * 18], [15, 8 * 18], [20, 9 * 18], [21, 9 * 18]], null],
      physicsresmax_p: [[[1, -1], [20, -10], [21, -10]], [[1, 3 * 18], [15, 8 * 18], [20, 9 * 18], [21, 9 * 18]], null],
      fireresmax_p: [[[1, -1], [20, -15], [21, -15]], [[1, 3 * 18], [15, 8 * 18], [20, 9 * 18], [21, 9 * 18]], null],
      fastwalkrun_p: [[[1, -9], [23, -50]], [[1, 3 * 18], [15, 8 * 18], [20, 9 * 18], [21, 9 * 18]], null],
      rangedamagereturn_p: [[[1, -4], [15, -25], [20, -30], [21, -30]], [[1, 3 * 18], [15, 8 * 18], [20, 9 * 18], [21, 9 * 18]], null],
    },
  },

  // Thiên Nhẫn 120: Ma Âm Phệ Phách (#715) — đồng bộ hồi chiêu 45s -> 15s theo volam-3005 (tianren.lua)
  715: {
    attrs: {
      skill_mintimepercast_v: [[[1, 45 * 18], [20, 15 * 18], [21, 15 * 18]], null, null],
      skill_mintimepercastonhorse_v: [[[1, 45 * 18], [20, 15 * 18], [21, 15 * 18]], null, null],
    },
  },

  // Võ Đang 120: Xuất Ứ Bất Nhiễm (#716 -> #738) — đồng bộ theo volam-3005 (wudang.lua):
  // hồi chiêu 35s -> 10s, tỉ lệ giải đồng đội 10% -> 100% (miss 90% -> 0%), bản thân 15% -> 100% (miss 85% -> 0%)
  716: {
    attrs: {
      missle_missrate: [[[1, 90], [10, 50], [20, 0], [21, 0]], null, null],
      skill_mintimepercast_v: [[[1, 35 * 18], [20, 10 * 18], [21, 10 * 18]], null, null],
      skill_mintimepercastonhorse_v: [[[1, 35 * 18], [20, 10 * 18], [21, 10 * 18]], null, null],
    },
  },
  738: {
    attrs: {
      missle_missrate: [[[1, 85], [15, 20], [20, 0], [21, 0]], null, null],
    },
  },

  // Côn Lôn 120: Lưỡng Nghi Chân Khí (#717 -> #721 + #722) — đồng bộ theo volam-3005 (kunlun.lua):
  // xác suất autorescueskill 15% -> 70% (CD 20s), khiên 721 1800 -> 50000 trong 1s -> 5s
  717: {
    attrs: {
      autorescueskill: [
        [[1, 721 * 256 + 1], [20, 721 * 256 + 20], [21, 721 * 256 + 21]],
        [[1, -1], [20, -1]],
        [[1, 20 * 18 * 256 + 15], [20, 20 * 18 * 256 + 70], [21, 20 * 18 * 256 + 70]],
      ],
    },
  },
  721: {
    attrs: {
      staticmagicshield_p: [[[1, 1800], [20, 50000], [21, 50050]], [[1, 1 * 18], [20, 5 * 18], [21, 5 * 18]], null],
    },
  },

  // 5 Cạm bẫy Đường Môn / Lệnh Bẫy Tống Kim (cấp 20): tăng sát thương gấp ~3.75–4x cho PvP cấp 100–200,
  // Xuyên Tâm Thích (#343/#344) bật hiệu ứng co giật 100% (`doHurt: 100`) như sát thương vật lý mạnh.
  343: {
    doHurt: 100,
    attrs: {
      physicsdamage_v: [[[1, 200], [20, 1600]], null, [[1, 200], [20, 1600]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  344: {
    doHurt: 100,
    attrs: {
      physicsdamage_v: [[[1, 200], [20, 1600]], null, [[1, 200], [20, 1600]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  303: {
    attrs: {
      poisondamage_v: [[[1, 24], [20, 160]], [[1, 100], [20, 100]], [[1, 10], [20, 10]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  304: {
    attrs: {
      poisondamage_v: [[[1, 24], [20, 160]], [[1, 100], [20, 100]], [[1, 10], [20, 10]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  345: {
    attrs: {
      colddamage_v: [[[1, 180], [20, 1500]], [[1, 12], [20, 36]], [[1, 180], [20, 1500]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  346: {
    attrs: {
      colddamage_v: [[[1, 180], [20, 1500]], [[1, 12], [20, 36]], [[1, 180], [20, 1500]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  347: {
    attrs: {
      firedamage_v: [[[1, 200], [20, 1600]], null, [[1, 200], [20, 1600]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  348: {
    attrs: {
      firedamage_v: [[[1, 200], [20, 1600]], null, [[1, 200], [20, 1600]]],
      seriesdamage_p: [[[1, 10], [20, 35]], null, null],
    },
  },
  349: {
    attrs: {
      lightingdamage_v: [[[1, 180], [20, 1500]], null, [[1, 180], [20, 1500]]],
      stun_p: [[[1, 5], [20, 25]], [[1, 10], [20, 25]], null],
      seriesdamage_p: [[[1, 15], [20, 50], [21, 52]], null, null],
    },
  },
  350: {
    attrs: {
      lightingdamage_v: [[[1, 180], [20, 1500]], null, [[1, 180], [20, 1500]]],
      stun_p: [[[1, 5], [20, 25]], [[1, 10], [20, 25]], null],
      seriesdamage_p: [[[1, 15], [20, 50], [21, 52]], null, null],
    },
  },
};
