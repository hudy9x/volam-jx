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
};
