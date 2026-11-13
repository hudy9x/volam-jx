// Monsters: every fighting NPC of the original npcs.txt (monsters.gen.ts, id = row), plus a few hand-tuned ones.
// npcs.txt has no level: the level comes from the spawn (packages/shared/spawns/*.json), like the original
// server's AddNpc(id, level, …); hit points and damage follow the level (scaling.ts). Skills are original skill
// ids with a level, exactly like npcs.txt Skill1–4 / Level1–4; bosses may borrow any faction's skills.
import type { Element } from '../characters/factions.js';
import { monsterDamage, monsterHp } from './scaling.js';
import { GEN_MONSTERS, type GenMonster } from './monsters.gen.js';

export interface MonsterDef {
  id: number;
  name: string;
  /** Original npc res (assets/npc/<res>). */
  sprite: string;
  /** Level of the stats below; a spawn at another level scales them (monsterAt). */
  level: number;
  element: Element;
  hp: number;
  /** Base (ngoại công) damage the skills scale from. */
  damage: [number, number];
  resist: number;
  speed: number;
  /** [skill id, level] — any skill of any pack. */
  skills: [number, number][];
  /** npcs.txt Level "base|per": skill level = base + per × monster level (generated monsters). */
  skillScale?: [number, number][];
  /** Seconds between two attacks. */
  attackCooldown: number;
  vision: number;
  leash: number;
  scale: number;
  /** Boss tier: undefined/false = normal (white), 1 = Boss Xanh (blue), 2/true = Boss Hoàng Kim (gold). */
  boss?: boolean | 1 | 2;
  /** Optional custom drop table key in DROP_TABLES (e.g. 'boss/gubodroprate'). */
  dropTable?: string;
  /** Training dummy: never moves or fights back, heals to full a few seconds after the last hit. */
  dummy?: boolean;
  /** npcs.txt HitRecover: % shorter flinch (≥ 100: never flinches; formulas/effects.ts). */
  hitRecover?: number;
}

/** npcs.txt Series order. */
const SERIES: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

const DEFAULT_LEVEL = 10;

function fromGen(g: GenMonster): MonsterDef {
  return {
    id: g.id, name: g.name, sprite: g.sprite, level: DEFAULT_LEVEL, element: SERIES[g.series] ?? 'kim',
    hp: monsterHp(DEFAULT_LEVEL, g.boss), damage: monsterDamage(DEFAULT_LEVEL), resist: g.boss ? 0.2 : 0.05,
    // Original RunSpeed (≈6) -> world px/s; VisionRadius / ActiveRadius are in original pixels.
    speed: Math.round((g.speed || 6) * 28), skills: g.skills.map(([id, base]) => [id, Math.max(1, base)]),
    skillScale: g.skills.map(([, base, per]) => [base, per]),
    attackCooldown: g.boss ? 1.2 : 1.6, vision: Math.round(g.vision * 0.65), leash: g.active, scale: 1,
    hitRecover: g.hitRecover || 0,
    ...(g.boss ? { boss: true } : {}),
  };
}

function goldenBoss(
  id: number, name: string, sprite: string, element: Element, skills: number[], dropTable: string,
): MonsterDef {
  return {
    id, name, sprite, level: 90, element,
    hp: monsterHp(90, 2), damage: monsterDamage(90), resist: 0.25,
    speed: 210,
    skills: skills.map(s => [s, 10]),
    skillScale: skills.map(() => [2, 0.1]),
    attackCooldown: 1.2, vision: 420, leash: 1100, scale: 1,
    hitRecover: 60, boss: 2, dropTable,
  };
}

/**
 * 20 Đại Hoàng Kim / Tiểu Hoàng Kim kinh điển của VLTK 1 (ID dòng gốc trong npcs.txt, Việt hóa tên hiển thị +
 * gán chiêu thức môn phái và bảng rơi boss/*). Dùng để phân bổ lên 40 bãi luyện công theo cấp và ngũ hành.
 */
export const GOLDEN_BOSS_LIST: MonsterDef[] = [
  // Hệ Kim (Thiếu Lâm, Thiên Vương)
  goldenBoss(566, 'Cổ Bách', 'boss018', 'kim', [322, 323, 40], 'boss/gubodroprate'),
  goldenBoss(739, 'Vương Tá', 'boss024', 'kim', [325, 323, 40], 'boss/gubodroprate'),
  goldenBoss(740, 'Huyền Giác Đại Sư', 'boss003', 'kim', [318, 319, 321], 'boss/gubodroprate'),
  goldenBoss(748, 'Hàn Mông', 'boss009', 'kim', [325, 40, 322], 'boss/gubodroprate'),
  // Hệ Mộc (Đường Môn, Ngũ Độc)
  goldenBoss(741, 'Đường Bất Nhiễm', 'boss019', 'moc', [302, 339, 342], 'boss/lanyiyidroprate'),
  goldenBoss(582, 'Lam Y Y', 'boss008', 'moc', [353, 355, 71], 'boss/lanyiyidroprate'),
  goldenBoss(742, 'Bạch Doanh Doanh', 'boss007', 'moc', [353, 355, 71], 'boss/lanyiyidroprate'),
  goldenBoss(522, 'Đường Phong', 'enemy157', 'moc', [302, 351, 342], 'boss/lanyiyidroprate'),
  // Hệ Thủy (Nga My, Thúy Yên)
  goldenBoss(743, 'Thanh Tuyệt Sư Thái', 'boss004', 'thuy', [328, 380, 88], 'boss/helianpiaodroprate'),
  goldenBoss(568, 'Hà Liên Phiêu', 'boss002', 'thuy', [328, 380, 88], 'boss/helianpiaodroprate'),
  goldenBoss(567, 'Chung Linh Tú', 'boss005', 'thuy', [336, 337, 108], 'boss/zhonglingxiudroprate'),
  goldenBoss(744, 'Yến Hiểu Tranh', 'boss023', 'thuy', [336, 337, 108], 'boss/zhonglingxiudroprate'),
  // Hệ Hỏa (Cái Bang, Thiên Nhẫn)
  goldenBoss(745, 'Hà Nhân Ngã', 'boss013', 'hoa', [357, 359, 128], 'boss/herenwodroprate'),
  goldenBoss(583, 'Mạnh Thương Lương', 'boss012', 'hoa', [357, 359, 128], 'boss/mengcanglangdroprate'),
  goldenBoss(563, 'Gia Luật Tị Ly', 'boss011', 'hoa', [361, 362, 148], 'boss/yelvbilidroprate'),
  goldenBoss(565, 'Đoan Mộc Duệ', 'boss015', 'hoa', [361, 362, 148], 'boss/duanmuruidroprate'),
  goldenBoss(564, 'Hoàn Nhan Tuyết Y', 'boss014', 'hoa', [361, 362, 141], 'boss/wanyanxueyidroprate'),
  // Hệ Thổ (Võ Đang, Côn Lôn)
  goldenBoss(562, 'Đạo Thanh Chân Nhân', 'boss001', 'tho', [365, 368, 164], 'boss/daoqingzhenrendroprate'),
  goldenBoss(746, 'Đơn Tư Nam', 'boss022', 'tho', [368, 365, 165], 'boss/daoqingzhenrendroprate'),
  goldenBoss(747, 'Tuyền Cơ Tử', 'boss017', 'tho', [372, 375, 182], 'boss/daoqingzhenrendroprate'),
];

/** Hand-tuned monsters of Dược Vương Cốc (legacy encounter "map-140"), its boss, golden bosses and the training dummy. */
const HAND: Record<number, MonsterDef> = {
  // npcs.txt: Linh Miêu / Kim Miêu throw fur (Ném lông 197), Kim Tơ Hầu throws stones (Ném đá 196), deer bite (53).
  34: { id: 34, name: 'Linh Miêu', sprite: 'ani052', level: 3, element: 'moc', hp: 320, damage: [25, 35], resist: 0.05,
    speed: 170, skills: [[197, 3]], attackCooldown: 1.6, vision: 260, leash: 650, scale: 1 },
  42: { id: 42, name: 'Hươu Đốm', sprite: 'ani061', level: 5, element: 'tho', hp: 400, damage: [28, 40], resist: 0.08,
    speed: 160, skills: [[53, 5]], attackCooldown: 1.5, vision: 240, leash: 650, scale: 1 },
  38: { id: 38, name: 'Kim Tơ Hầu', sprite: 'ani056', level: 7, element: 'thuy', hp: 360, damage: [30, 42], resist: 0.06,
    speed: 180, skills: [[196, 7]], attackCooldown: 1.7, vision: 280, leash: 650, scale: 1 },
  // Boss Hoàng Kim Dược Vương Cốc (own id, not an npcs.txt row): its fur throw plus Phá Thiên Trảm (Thiên Vương 90) and Phiêu Tuyết Xuyên Vân (Nga My).
  10031: { id: 10031, name: 'Kim Miêu Vương', sprite: 'ani049', level: 10, element: 'kim', hp: 4000, damage: [70, 100], resist: 0.2,
    speed: 190, skills: [[197, 10], [322, 8], [80, 10]], attackCooldown: 1.2, vision: 320, leash: 900, scale: 1, boss: 2, dropTable: 'boss/gubodroprate' },
  // npcs.txt row 413 "Cọc gỗ" (enemy178).
  413: { id: 413, name: 'Cọc gỗ', sprite: 'enemy178', level: 1, element: 'kim', hp: 50000, damage: [0, 0], resist: 0,
    speed: 0, skills: [], attackCooldown: 99, vision: 0, leash: 0, scale: 1, dummy: true },
  ...Object.fromEntries(GOLDEN_BOSS_LIST.map(b => [b.id, b])),
};

export const MONSTERS: Record<number, MonsterDef> = {
  ...Object.fromEntries(GEN_MONSTERS.map(g => [g.id, fromGen(g)])),
  ...HAND,
};
