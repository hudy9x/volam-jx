import type { ItemDef } from './items.js';

export type TkItemEffect =
  | { kind: 'battlePotion' }
  | { kind: 'buff'; stateId: number; durationMs: number; attrs: Record<string, [number, number, number]>; aoeRadius?: number }
  | { kind: 'clarion'; count: number }
  | { kind: 'bibao'; minAccum: number; maxAccum: number };

const pill = (
  id: string,
  stateId: number,
  name: string,
  icon: string,
  tkAccumPrice: number,
  desc: string,
  attrs: Record<string, [number, number, number]>,
): ItemDef => ({
  id,
  kind: 'elixir',
  type: stateId,
  level: 1,
  name,
  icon,
  price: 0,
  tkAccumPrice,
  size: [1, 1],
  maxStack: 50,
  desc,
  base: [],
  req: [],
  tkItem: { kind: 'buff', stateId, durationMs: 180_000, attrs },
});

/**
 * 22 vật phẩm Quân Nhu Tống Kim + Tống Kim Bí Bảo (theo volam-3005/documents/tong-kim).
 * Mua bằng điểm tích lũy Tống Kim tại Quân Nhu Quan (map 323), chỉ sử dụng trong chiến trường (378), trừ Bí Bảo.
 */
export const TK_BATTLE_ITEMS: ItemDef[] = [
  // ---- Càn Khôn Tạo Hóa Đan (Đại / Trung / Tiểu) ----
  {
    id: 'tk-zaohua-b',
    kind: 'elixir',
    type: 9001,
    level: 3,
    name: 'Càn Khôn Tạo Hóa Đan (Đại)',
    icon: 'items/obj-potion13',
    price: 0,
    tkAccumPrice: 300,
    size: [1, 1],
    maxStack: 50,
    desc: 'Vật phẩm chiến trường: hồi phục 2.000 Sinh lực và Nội lực mỗi nhịp (tổng 20.000).',
    base: [],
    req: [],
    use: [['lifepotion_v', 2000, 100], ['manapotion_v', 2000, 100]],
    tkItem: { kind: 'battlePotion' },
  },
  {
    id: 'tk-zaohua-m',
    kind: 'elixir',
    type: 9002,
    level: 2,
    name: 'Càn Khôn Tạo Hóa Đan (Trung)',
    icon: 'items/obj-potion13',
    price: 0,
    tkAccumPrice: 180,
    size: [1, 1],
    maxStack: 50,
    desc: 'Vật phẩm chiến trường: hồi phục 1.000 Sinh lực và Nội lực mỗi nhịp (tổng 10.000).',
    base: [],
    req: [],
    use: [['lifepotion_v', 1000, 100], ['manapotion_v', 1000, 100]],
    tkItem: { kind: 'battlePotion' },
  },
  {
    id: 'tk-zaohua-s',
    kind: 'elixir',
    type: 9003,
    level: 1,
    name: 'Càn Khôn Tạo Hóa Đan (Tiểu)',
    icon: 'items/obj-potion13',
    price: 0,
    tkAccumPrice: 100,
    size: [1, 1],
    maxStack: 50,
    desc: 'Vật phẩm chiến trường: hồi phục 500 Sinh lực và Nội lực mỗi nhịp (tổng 5.000).',
    base: [],
    req: [],
    use: [['lifepotion_v', 500, 100], ['manapotion_v', 500, 100]],
    tkItem: { kind: 'battlePotion' },
  },

  // ---- Đạo cụ chiến thuật (Chiến Cổ, Lệnh Bài, Binh Sĩ Hiệu Phù) ----
  {
    id: 'tk-wardrum',
    kind: 'elixir',
    type: 9010,
    level: 1,
    name: 'Chiến Cổ',
    icon: 'items/tk-wardrum',
    price: 0,
    tkAccumPrice: 500,
    size: [1, 1],
    maxStack: 50,
    desc: 'Trong 3 phút, tăng +30% Sinh lực tối đa và +30% Kháng tất cả cho đồng đội xung quanh.',
    base: [],
    req: [],
    tkItem: { kind: 'buff', stateId: 9101, durationMs: 180_000, aoeRadius: 450, attrs: { lifemax_p: [30, 0, 0], allres_p: [30, 0, 0] } },
  },
  {
    id: 'tk-token',
    kind: 'elixir',
    type: 9011,
    level: 1,
    name: 'Lệnh Bài Chiến Trường',
    icon: 'items/tk-token',
    price: 0,
    tkAccumPrice: 500,
    size: [1, 1],
    maxStack: 50,
    desc: 'Trong 3 phút, tăng +30% tốc độ di chuyển và +50 tốc độ xuất chiêu cho đồng đội xung quanh.',
    base: [],
    req: [],
    tkItem: { kind: 'buff', stateId: 9102, durationMs: 180_000, aoeRadius: 450, attrs: { fastwalkrun_p: [30, 0, 0], attackspeed_v: [50, 0, 0], castspeed_v: [50, 0, 0] } },
  },
  {
    id: 'tk-clarion',
    kind: 'elixir',
    type: 9012,
    level: 1,
    name: 'Binh Sĩ Hiệu Phù',
    icon: 'items/tk-clarion',
    price: 0,
    tkAccumPrice: 400,
    size: [1, 1],
    maxStack: 50,
    desc: 'Triệu hồi 2 Binh sĩ phe mình hỗ trợ chiến đấu tại chỗ (tối đa 20 lần/phe/trận).',
    base: [],
    req: [],
    tkItem: { kind: 'clarion', count: 2 },
  },

  // ---- 18 loại Hoàn Tống Kim (3 phút) — dùng chung icon Hoàn (items/obj-potion15) theo VLTK-SHXT ----
  pill('tk-pill-178', 9103, 'Ngoại Phổ Hoàn', 'items/obj-potion15', 150, 'Tăng +50% sát thương Vật lý ngoại công trong 3 phút.', { addphysicsdamage_p: [50, 0, 0] }),
  pill('tk-pill-179', 9104, 'Ngoại Độc Hoàn', 'items/obj-potion15', 150, 'Tăng +50 sát thương Độc ngoại công trong 3 phút.', { addpoisondamage_v: [50, 0, 10] }),
  pill('tk-pill-180', 9105, 'Ngoại Băng Hoàn', 'items/obj-potion15', 150, 'Tăng +100 sát thương Băng ngoại công trong 3 phút.', { addcolddamage_v: [100, 0, 100] }),
  pill('tk-pill-181', 9106, 'Nội Phổ Hoàn', 'items/obj-potion15', 150, 'Tăng +100 sát thương Vật lý nội công trong 3 phút.', { addphysicsmagic_v: [100, 0, 100] }),
  pill('tk-pill-182', 9107, 'Nội Độc Hoàn', 'items/obj-potion15', 150, 'Tăng +50 sát thương Độc nội công trong 3 phút.', { addpoisonmagic_v: [50, 0, 10] }),
  pill('tk-pill-183', 9108, 'Nội Băng Hoàn', 'items/obj-potion15', 150, 'Tăng +100 sát thương Băng nội công trong 3 phút.', { addcoldmagic_v: [100, 0, 100] }),
  pill('tk-pill-184', 9109, 'Nội Hỏa Hoàn', 'items/obj-potion15', 150, 'Tăng +100 sát thương Hỏa nội công trong 3 phút.', { addfiremagic_v: [100, 0, 100] }),
  pill('tk-pill-185', 9110, 'Nội Lôi Hoàn', 'items/obj-potion15', 150, 'Tăng +100 sát thương Lôi nội công trong 3 phút.', { addlightingmagic_v: [100, 0, 100] }),
  pill('tk-pill-186', 9111, 'Trường Mệnh Hoàn', 'items/obj-potion15', 150, 'Tăng +500 Sinh lực tối đa trong 3 phút.', { lifemax_v: [500, 0, 0] }),
  pill('tk-pill-187', 9112, 'Gia Bào Hoàn', 'items/obj-potion15', 150, 'Tăng +20% tốc độ di chuyển trong 3 phút.', { fastwalkrun_p: [20, 0, 0] }),
  pill('tk-pill-188', 9113, 'Cao Thiểm Hoàn', 'items/obj-potion15', 150, 'Tăng +500 Né tránh trong 3 phút.', { adddefense_v: [500, 0, 0] }),
  pill('tk-pill-189', 9114, 'Cao Trung Hoàn', 'items/obj-potion15', 150, 'Tăng +500 Chính xác trong 3 phút.', { attackratingenhance_v: [500, 0, 0] }),
  pill('tk-pill-190', 9115, 'Phi Tốc Hoàn', 'items/obj-potion15', 200, 'Tăng +50 tốc độ đánh & xuất chiêu trong 3 phút.', { attackspeed_v: [50, 0, 0], castspeed_v: [50, 0, 0] }),
  pill('tk-pill-191', 9116, 'Phổ Phòng Hoàn', 'items/obj-potion15', 150, 'Tăng +50% Phòng thủ Vật lý trong 3 phút.', { physicsres_p: [50, 0, 0] }),
  pill('tk-pill-192', 9117, 'Băng Phòng Hoàn', 'items/obj-potion15', 150, 'Tăng +50% Kháng Băng trong 3 phút.', { coldres_p: [50, 0, 0] }),
  pill('tk-pill-193', 9118, 'Lôi Phòng Hoàn', 'items/obj-potion15', 150, 'Tăng +50% Kháng Lôi trong 3 phút.', { lightingres_p: [50, 0, 0] }),
  pill('tk-pill-194', 9119, 'Hỏa Phòng Hoàn', 'items/obj-potion15', 150, 'Tăng +50% Kháng Hỏa trong 3 phút.', { fireres_p: [50, 0, 0] }),
  pill('tk-pill-195', 9120, 'Độc Phòng Hoàn', 'items/obj-potion15', 150, 'Tăng +50% Kháng Độc trong 3 phút.', { poisonres_p: [50, 0, 0] }),
];

/** Tống Kim Bí Bảo (chỉ rơi từ lính/Thống lĩnh trên chiến trường, không bán trong shop). */
export const TK_BIBAO_ITEM: ItemDef = {
  id: 'tk-bibao',
  kind: 'elixir',
  type: 9020,
  level: 1,
  name: 'Tống Kim Bí Bảo',
  icon: 'items/tk-bibao',
  price: 0,
  size: [1, 1],
  maxStack: 50,
  desc: 'Bảo vật chiến trường Tống Kim. Mở ra nhận 50–150 điểm tích lũy hoặc thuốc chiến trường.',
  base: [],
  req: [],
  tkItem: { kind: 'bibao', minAccum: 50, maxAccum: 150 },
};

export const TK_ALL_ITEMS: ItemDef[] = [...TK_BATTLE_ITEMS, TK_BIBAO_ITEM];
export const TK_SHOP_ITEMS: ItemDef[] = TK_BATTLE_ITEMS;
export const TK_DROP_BUFF_IDS: readonly string[] = TK_BATTLE_ITEMS
  .filter(it => it.id.startsWith('tk-pill-') || it.id === 'tk-zaohua-s')
  .map(it => it.id);
export const TK_DROP_COMMON_IDS: readonly string[] = [
  ...TK_DROP_BUFF_IDS,
  'tk-bibao',
];
export const TK_DROP_OFFICER_IDS: readonly string[] = [
  'tk-zaohua-m', 'tk-zaohua-b', 'tk-wardrum', 'tk-token', 'tk-clarion', 'tk-bibao',
  ...TK_DROP_BUFF_IDS,
];
