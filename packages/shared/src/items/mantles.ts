// Phi phong Hoàng kim (10 bậc + Cao Cấp Vô Cực) theo docs/phi-phong-va-tai-phu.md.
// Nguồn chỉ số: Client_VLTK_SHXT/settings/item/goldequip.txt dòng 3465–3490 (không dùng 3 nhánh kỹ năng đặc biệt).
import type { ItemDef } from './items.js';

/** Giá mua Phi phong tại Kỳ Trân Các (USER 2026-11-19: 100 KNB, yêu cầu đủ Tài phú Binh giáp). */
export const MANTLE_KNB_PRICE = 100;

export interface MantleSpec {
  id: string;
  tier: number;
  level: number;
  name: string;
  icon: string;
  /** Row index (0..10) into MANTLE_PARTS / preview-{m,f}-{look}.webp. */
  look: number;
  fortuneReq: number;
  hp: number;
  hpPct: number;
  mp: number;
  mpPct: number;
  skillEnhance: number;
  heavyHit: number;
  /** Relative drop weight when a Boss Đại Hoàng Kim (tier 'major') drops a mantle. */
  dropWeight: number;
}

export const MANTLE_SPECS: readonly MantleSpec[] = [
  { id: 'mantle-1',  tier: 1,  level: 1,  name: 'Phi phong Lăng Vân',       icon: 'items/pifeng_01', look: 0,  fortuneReq: 200,     hp: 484,  hpPct: 3,  mp: 360,  mpPct: 3,  skillEnhance: 7,   heavyHit: 1, dropWeight: 32 },
  { id: 'mantle-2',  tier: 2,  level: 2,  name: 'Phi phong Tuyệt Thế',      icon: 'items/pifeng_02', look: 1,  fortuneReq: 500,     hp: 624,  hpPct: 5,  mp: 440,  mpPct: 5,  skillEnhance: 13,  heavyHit: 1, dropWeight: 24 },
  { id: 'mantle-3',  tier: 3,  level: 3,  name: 'Phi phong Phá Quân',       icon: 'items/pifeng_03', look: 2,  fortuneReq: 1500,    hp: 780,  hpPct: 7,  mp: 520,  mpPct: 7,  skillEnhance: 20,  heavyHit: 1, dropWeight: 18 },
  { id: 'mantle-4',  tier: 4,  level: 4,  name: 'Phi phong Ngạo Tuyết',     icon: 'items/pifeng_04', look: 3,  fortuneReq: 5000,    hp: 952,  hpPct: 11, mp: 600,  mpPct: 11, skillEnhance: 36,  heavyHit: 2, dropWeight: 12 },
  { id: 'mantle-5',  tier: 5,  level: 5,  name: 'Phi phong Kinh Lôi',       icon: 'items/pifeng_05', look: 4,  fortuneReq: 10000,   hp: 1368, hpPct: 17, mp: 680,  mpPct: 17, skillEnhance: 60,  heavyHit: 3, dropWeight: 8 },
  { id: 'mantle-6',  tier: 6,  level: 6,  name: 'Phi phong Ngự Phong',      icon: 'items/pifeng_06', look: 5,  fortuneReq: 27000,   hp: 1680, hpPct: 25, mp: 760,  mpPct: 25, skillEnhance: 84,  heavyHit: 3, dropWeight: 5 },
  { id: 'mantle-7',  tier: 7,  level: 7,  name: 'Phi phong Phệ Quang',      icon: 'items/pifeng_07', look: 6,  fortuneReq: 54000,   hp: 2016, hpPct: 35, mp: 840,  mpPct: 35, skillEnhance: 108, heavyHit: 4, dropWeight: 3 },
  { id: 'mantle-8',  tier: 8,  level: 8,  name: 'Phi phong Khấp Thần',      icon: 'items/pifeng_08', look: 7,  fortuneReq: 120000,  hp: 2392, hpPct: 47, mp: 920,  mpPct: 47, skillEnhance: 132, heavyHit: 4, dropWeight: 2 },
  { id: 'mantle-9',  tier: 9,  level: 9,  name: 'Phi phong Kình Thiên',     icon: 'items/pifeng_09', look: 8,  fortuneReq: 240000,  hp: 2798, hpPct: 61, mp: 1000, mpPct: 61, skillEnhance: 156, heavyHit: 5, dropWeight: 1 },
  { id: 'mantle-10', tier: 10, level: 10, name: 'Phi phong Vô Cực',         icon: 'items/pifeng_10', look: 9,  fortuneReq: 280000,  hp: 3234, hpPct: 77, mp: 1080, mpPct: 77, skillEnhance: 180, heavyHit: 6, dropWeight: 1 },
  { id: 'mantle-11', tier: 10, level: 10, name: 'Phi phong Cao Cấp Vô Cực', icon: 'items/pifeng_11', look: 10, fortuneReq: 280000,  hp: 3234, hpPct: 77, mp: 1080, mpPct: 77, skillEnhance: 180, heavyHit: 6, dropWeight: 1 },
];

export const MANTLE_ITEMS: ItemDef[] = MANTLE_SPECS.map(m => ({
  id: m.id,
  kind: 'mantle',
  type: 0,
  level: m.level,
  name: m.name,
  icon: m.icon,
  look: m.look,
  price: 999,
  knbPrice: MANTLE_KNB_PRICE,
  size: [1, 1],
  desc: `${m.name} (Bậc ${m.tier}). Đeo vào hiển thị áo choàng trên nhân vật.`,
  base: [],
  req: [['require_fortune_value', m.fortuneReq]],
  fixedMagic: [
    ['lifemax_v', m.hp, 0],
    ['lifemax_p', m.hpPct, 0],
    ['manamax_v', m.mp, 0],
    ['manamax_p', m.mpPct, 0],
    ['skill_enhance', m.skillEnhance, 0],
    ['enhancehit_rate', m.heavyHit, 0],
  ],
}));

export const MANTLE_BY_ID: Record<string, MantleSpec> = Object.fromEntries(MANTLE_SPECS.map(m => [m.id, m]));

/** Roll a random Phi phong when a Boss Đại Hoàng Kim (tier 'major') drops one. */
export function rollMajorBossMantle(random: () => number = Math.random): ItemDef {
  const total = MANTLE_SPECS.reduce((s, m) => s + m.dropWeight, 0);
  let r = random() * total;
  for (let i = 0; i < MANTLE_SPECS.length; i++) {
    r -= MANTLE_SPECS[i].dropWeight;
    if (r <= 0) return MANTLE_ITEMS[i];
  }
  return MANTLE_ITEMS[0];
}
