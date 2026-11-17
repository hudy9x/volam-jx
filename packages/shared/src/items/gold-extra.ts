// Bộ trang bị Hoàng Kim mở rộng bổ sung thủ công (gộp vào Bộ Mộng Long, suite 1).
// Nguồn: Client_VLTK_SHXT/settings/item/platinaequip.txt dòng 532–536.
import type { ItemDef } from './items.js';

/** IDs trong gold.gen.ts được thay thế bởi bản mở rộng (vd. gold-5 Mộng Long Đạt Ma Tăng hài thay bằng gold-ext-534). */
export const EXCLUDED_GOLD_IDS = new Set<string>(['gold-5']);

export const EXTRA_GOLD: ItemDef[] = [
  {
    id: 'gold-ext-532', kind: 'amulet', type: 1, level: 10,
    name: 'Mộng Long Chi Tịnh Sa Niệm Châu', icon: 'items/obj-neck17',
    price: 99999, size: [2, 1], desc: 'Trang bị Hoàng Kim',
    base: [], req: [['requirelevel', 120], ['requiremenpai', 0]],
    gold: {
      suite: 1, series: 2,
      lines: [
        ['allres_p', [18, -1, 0], [22, -1, 0]],
        ['lightingres_p', [20, -1, 0], [25, -1, 0]],
        ['coldres_p', [20, -1, 0], [25, -1, 0]],
        ['fireres_p', [20, -1, 0], [25, -1, 0]],
        ['addphysicsdamage_p', [30, -1, 6], [50, -1, 6]],
        ['poisontimereduce_p', [30, -1, 0], [50, -1, 0]],
      ],
    },
  },
  {
    id: 'gold-ext-533', kind: 'melee', type: 6, level: 10,
    name: 'Mộng Long Chi Bồ Đề Tiền Thủ', icon: 'items/obj-bangle15',
    price: 99999, size: [1, 2], desc: 'Trang bị Hoàng Kim',
    base: [['weapondamagemin_v', 60, 60], ['weapondamagemax_v', 100, 100], ['attackratingenhance_p', 0, 0], ['durability_v', 99, 99]],
    req: [['requirelevel', 120], ['requiremenpai', 0]],
    look: 0,
    gold: {
      suite: 1, series: 1,
      lines: [
        ['lifemax_v', [320, -1, 0], [400, -1, 0]],
        ['attackratingenhance_v', [900, -1, 0], [1000, -1, 0]],
        ['addphysicsdamage_p', [50, -1, 6], [100, -1, 6]],
        ['addphysicsdamage_v', [30, -1, 0], [50, -1, 0]],
        ['stealmanaenhance_p', [4, -1, 0], [8, -1, 0]],
        ['allskill_v', [1, -1, 273], [3, -1, 273]],
      ],
    },
  },
  {
    id: 'gold-ext-534', kind: 'boot', type: 0, level: 10,
    name: 'Mộng Long Chi Độ Thủy Ngoa', icon: 'items/obj-shoes05',
    price: 99999, size: [2, 2], desc: 'Trang bị Hoàng Kim',
    base: [['armordefense_v', 160, 160], ['durability_v', 80, 80]],
    req: [['requirelevel', 120], ['requiremenpai', 0]],
    gold: {
      suite: 1, series: 3,
      lines: [
        ['lifemax_v', [320, -1, 0], [400, -1, 0]],
        ['fastwalkrun_p', [50, -1, 0], [70, -1, 0]],
        ['manamax_v', [320, -1, 0], [400, -1, 0]],
        ['physicsres_p', [30, -1, 0], [35, -1, 0]],
        ['addphysicsdamage_p', [30, -1, 6], [50, -1, 6]],
      ],
    },
  },
  {
    id: 'gold-ext-535', kind: 'cuff', type: 1, level: 10,
    name: 'Mộng Long Chi Hàng Ma Uyển', icon: 'items/obj-bangle20',
    price: 99999, size: [1, 2], desc: 'Trang bị Hoàng Kim',
    base: [['armordefense_v', 135, 135], ['durability_v', 80, 80]],
    req: [['requirelevel', 120], ['requiremenpai', 0]],
    gold: {
      suite: 1, series: 4,
      lines: [
        ['lifemax_v', [320, -1, 0], [400, -1, 0]],
        ['physicsres_p', [30, -1, 0], [35, -1, 0]],
        ['manamax_v', [320, -1, 0], [400, -1, 0]],
        ['stuntimereduce_p', [40, -1, 0], [60, -1, 0]],
        ['addphysicsdamage_p', [30, -1, 6], [50, -1, 6]],
      ],
    },
  },
  {
    id: 'gold-ext-536', kind: 'ring', type: 0, level: 10,
    name: 'Mộng Long Chi Minh Vương Giới', icon: 'items/obj-ring07',
    price: 99999, size: [1, 1], desc: 'Trang bị Hoàng Kim',
    base: [], req: [['requirelevel', 120], ['requiremenpai', 0]],
    gold: {
      suite: 1, series: 3,
      lines: [
        ['lifemax_v', [320, -1, 0], [400, -1, 0]],
        ['allskill_v', [1, -1, 0], [1, -1, 0]],
        ['manamax_v', [320, -1, 0], [400, -1, 0]],
        ['fireres_p', [25, -1, 0], [25, -1, 0]],
        ['allres_p', [5, -1, 0], [5, -1, 0]],
      ],
    },
  },
];
