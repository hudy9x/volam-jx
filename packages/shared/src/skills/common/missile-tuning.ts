import type { MissileDef } from '../core/types.js';

/**
 * Hand-maintained missile overrides (kept when gen:skills regenerates missiles.gen.ts).
 * Keys are original missles.txt IDs.
 */
export const MISSILE_OVERRIDES: Record<number, Partial<MissileDef>> = {
  // 1. Thiên Vương: Bá Vương Tạm Kim (#1060 -> #1088 -> #350) chậm lại để dễ nhìn rõ từng thức
  350: { speed: 24, life: 6 },

  // 2. Đường Môn: Bạo Vũ Lê Hoa (#302 -> #96) & Thiết Liên Tứ Sát (#1070 -> #332) xoay nhanh hơn
  96: { fx: { fly: { key: 'skill/fx/4543a8c4', tpf: 1 } } },
  332: { fx: { fly: { key: 'skill/fx/53144a68', tpf: 0.5 } } },

  // 3. Ngũ Độc: U Hồn Phệ Ảnh (#1067 -> #329) bay thẳng và xuyên qua mục tiêu
  329: { move: 1, colVanish: false },

  // 5. Cái Bang: rồng (#357 -> #166) & bổng (#359 -> #168, #1074 -> #336) bay song song trước khi bẻ lái vào quái
  166: { homingDelay: 5 },
  168: { homingDelay: 5 },
  336: { homingDelay: 5 },

  // 6. Côn Lôn: #1108 Phong Minh Ngọc Toái (#370 thiếu FX gốc) dùng cột lốc giống #373 (#179) & #375/#387 nổ khi biến mất
  370: {
    life: 15,
    fx: {
      fly: { key: 'skill/fx/ac0e461d', tpf: 1 },
      collide: { key: 'skill/fx/51880782', tpf: 1 },
    },
  },
  181: {
    fx: {
      fly: { key: 'skill/fx/f9c4889b', tpf: 2 },
      collide: { key: 'skill/fx/51880782', tpf: 1 },
      vanish: { key: 'skill/fx/51880782', tpf: 1 },
    },
  },
  193: {
    fx: {
      fly: { key: 'skill/fx/2381f7b9', tpf: 1 },
      collide: { key: 'skill/fx/51880782', tpf: 1 },
      vanish: { key: 'skill/fx/51880782', tpf: 1 },
    },
  },

  // 7. Võ Đang: Thiên Địa Vô Cực (#365 -> #173) & Tạo Hóa Thái Thanh (#1078 -> #340) hiển thị lâu hơn
  173: { life: 36 },
  340: { life: 45 },

  // 8. Thiên Nhẫn: Thiên Ngoại Lưu Tinh (#362 -> #171) rơi nhanh (14 -> 4 tick ≈ 222ms);
  //    Nghiệp Hỏa Phàn Thành (#363 -> #170) đứng yên tại điểm nổ thay vì trôi theo hướng đánh
  170: { move: 0, speed: 0 },
  171: { life: 4 },

  // 9. Tiêu Dao Kiếm (10 / 30 / 40 / 90): tăng tốc độ hiệu ứng & rơi kiếm nhanh gấp đôi (tpf: 1 -> 0.5)
  //    - #2114 Ngô Câu Sương Tuyết (M637): 10 frame chạy trong 5 ticks (~278ms)
  //    - #2118 Táp Đạp Lưu Tinh -> #2119 (M638): 20 frame vệt kiếm ảnh chạy hết trong 10 ticks (~556ms)
  //    - #2120 Ỷ Kiếm Phất Thiên (M649): 17 frame chạy hết trong 9 ticks (~500ms)
  //    - #2124 Kiếm Quyết Phù Vân (M641 -> M639/M640): đạn dẫn đường bay nhanh gấp đôi (speed 32->64, life 10->5),
  //      kiếm rơi M639/M640 chạy hết 18 frame trong 9 ticks (~500ms)
  637: {
    life: 5,
    fx: {
      fly: { key: 'skill/xiaoyao/m637_fly', tpf: 0.5 },
      collide: { key: 'skill/xiaoyao/m637_collide', tpf: 0.5 },
    },
  },
  638: {
    life: 10,
    fx: {
      fly: { key: 'skill/xiaoyao/m638_fly', tpf: 0.5 },
    },
  },
  639: {
    life: 9,
    fx: {
      fly: { key: 'skill/xiaoyao/m639_fly', tpf: 0.5 },
      collide: { key: 'skill/xiaoyao/m639_collide', tpf: 0.5 },
    },
  },
  640: {
    life: 9,
    fx: {
      fly: { key: 'skill/xiaoyao/m640_fly', tpf: 0.5 },
      collide: { key: 'skill/xiaoyao/m640_collide', tpf: 0.5 },
    },
  },
  641: { speed: 64, life: 5 },
  649: {
    life: 9,
    fx: {
      fly: { key: 'skill/xiaoyao/m649_fly', tpf: 0.5 },
      collide: { key: 'skill/xiaoyao/m649_collide', tpf: 0.5 },
    },
  },
};
