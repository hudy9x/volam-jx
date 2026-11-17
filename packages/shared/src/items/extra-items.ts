// Vật phẩm thường/xanh bổ sung thủ công (ngoài items.gen.ts).
// Nguồn: Client_VLTK_SHXT/settings/item/meleeweapon.txt dòng 61–70 (ParticularType = 6: Triền Thủ, cấp 1–10).
import type { GenItem } from './items.gen.js';

/** Sprite rơi mặt đất cho các món bổ sung thủ công (Triền Thủ dùng chung sprite với Bao tay). */
const EXTRA_GROUND_OBJS: Record<string, string> = {
  'melee-6-1': 'obj-items/obj_zb_014',
  'melee-6-2': 'obj-items/obj_zb_014',
  'melee-6-3': 'obj-items/obj_zb_014',
  'melee-6-4': 'obj-items/obj_zb_014',
  'melee-6-5': 'obj-items/obj_zb_014',
  'melee-6-6': 'obj-items/obj_zb_013',
  'melee-6-7': 'obj-items/obj_zb_013',
  'melee-6-8': 'obj-items/obj_zb_013',
  'melee-6-9': 'obj-items/obj_zb_013',
  'melee-6-10': 'obj-items/obj_zb_013',
  'gold-ext-532': 'obj-items/obj_zb_015',
  'gold-ext-533': 'obj-items/obj_zb_013',
  'gold-ext-534': 'obj-items/obj_zb_005',
  'gold-ext-535': 'obj-items/obj_zb_013',
  'gold-ext-536': 'obj-items/obj_zb_016',
};

export const extraGroundObjSprite = (defId: string): string | undefined => EXTRA_GROUND_OBJS[defId];

export const EXTRA_ITEMS: GenItem[] = [
  {
    id: 'melee-6-1', kind: 'melee', type: 6, level: 1,
    name: 'Phổ thông Triền Thủ', icon: 'items/obj-bangle18',
    price: 100, size: [1, 2], desc: 'Loại vũ khí thông thường của người sử dụng quyền thuật',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 20, 20]],
    req: [['requirelevel', 0], ['requirestr', 20], ['requiredex', 25]],
    look: 0,
  },
  {
    id: 'melee-6-2', kind: 'melee', type: 6, level: 2,
    name: 'Phổ thông Triền Thủ', icon: 'items/obj-bangle18',
    price: 1200, size: [1, 2], desc: 'Loại vũ khí thông thường của người sử dụng quyền thuật',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 28, 28]],
    req: [['requirelevel', 9], ['requirestr', 20], ['requiredex', 25]],
    look: 0,
  },
  {
    id: 'melee-6-3', kind: 'melee', type: 6, level: 3,
    name: 'Thô Mộc Triền Thủ', icon: 'items/obj-bangle18',
    price: 2700, size: [1, 2], desc: 'Loại vũ khí làm từ gỗ chỉ dùng để luyện tập',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 36, 36]],
    req: [['requirelevel', 18], ['requirestr', 30], ['requiredex', 25]],
    look: 0,
  },
  {
    id: 'melee-6-4', kind: 'melee', type: 6, level: 4,
    name: 'Hợp Kim Triền Thủ', icon: 'items/obj-bangle17',
    price: 4800, size: [1, 2], desc: 'Tinh chế từ nhiều loại sắt thép, có thể chống chọi với đao kiếm thông thường.',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 44, 44]],
    req: [['requirelevel', 27], ['requirestr', 40], ['requiredex', 35]],
    look: 0,
  },
  {
    id: 'melee-6-5', kind: 'melee', type: 6, level: 5,
    name: 'Đại Lực Triền Thủ', icon: 'items/obj-bangle17',
    price: 7500, size: [1, 2], desc: 'Hợp thành từ kim loại, khi sử dụng có thể đạt một sức mạnh cực lớn.',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 52, 52]],
    req: [['requirelevel', 36], ['requirestr', 50], ['requiredex', 35]],
    look: 0,
  },
  {
    id: 'melee-6-6', kind: 'melee', type: 6, level: 6,
    name: 'Thiết Quyền Triền Thủ', icon: 'items/obj-bangle17',
    price: 10800, size: [1, 2], desc: 'Loại vũ khí chuyên dùng của các cao thủ sử dụng tay không.',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 60, 60]],
    req: [['requirelevel', 45], ['requirestr', 60], ['requiredex', 35]],
    look: 0,
  },
  {
    id: 'melee-6-7', kind: 'melee', type: 6, level: 7,
    name: 'Ô Kim Triền Thủ', icon: 'items/obj-bangle03',
    price: 15000, size: [1, 2], desc: 'Làm từ Ô Kim, tuy nhẹ mà sát thương vô cùng lớn.',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 68, 68]],
    req: [['requirelevel', 54], ['requirestr', 70], ['requiredex', 45]],
    look: 0,
  },
  {
    id: 'melee-6-8', kind: 'melee', type: 6, level: 8,
    name: 'Huyền Thiết Triền Thủ', icon: 'items/obj-bangle03',
    price: 20000, size: [1, 2], desc: 'Tinh chế từ Huyền Thiết, sức mạnh vô song.',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 76, 76]],
    req: [['requirelevel', 63], ['requirestr', 80], ['requiredex', 45]],
    look: 0,
  },
  {
    id: 'melee-6-9', kind: 'melee', type: 6, level: 9,
    name: 'Hỏa Vân Triền Thủ', icon: 'items/obj-bangle15',
    price: 25000, size: [1, 2], desc: 'Loại vũ khí không rõ nguồn gốc, mang một sức mạnh siêu đẳng.',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 84, 84]],
    req: [['requirelevel', 72], ['requirestr', 90], ['requiredex', 45]],
    look: 0,
  },
  {
    id: 'melee-6-10', kind: 'melee', type: 6, level: 10,
    name: 'Mật Vân Triền Thủ', icon: 'items/obj-bangle15',
    price: 30000, size: [1, 2], desc: 'Một loại vũ khí huyền bí, có sát thương kinh người.',
    base: [['weapondamagemin_v', 1, 1], ['weapondamagemax_v', 1, 1], ['attackratingenhance_p', -30, -30], ['durability_v', 90, 90]],
    req: [['requirelevel', 81], ['requirestr', 100], ['requiredex', 55]],
    look: 0,
  },
];
