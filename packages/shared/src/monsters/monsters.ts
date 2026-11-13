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
  boss?: boolean;
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

/** Hand-tuned monsters of Dược Vương Cốc (legacy encounter "map-140"), its boss and the training dummy. */
const HAND: Record<number, MonsterDef> = {
  // npcs.txt: Linh Miêu / Kim Miêu throw fur (Ném lông 197), Kim Tơ Hầu throws stones (Ném đá 196), deer bite (53).
  34: { id: 34, name: 'Linh Miêu', sprite: 'ani052', level: 3, element: 'moc', hp: 320, damage: [25, 35], resist: 0.05,
    speed: 170, skills: [[197, 3]], attackCooldown: 1.6, vision: 260, leash: 650, scale: 1 },
  42: { id: 42, name: 'Hươu Đốm', sprite: 'ani061', level: 5, element: 'tho', hp: 400, damage: [28, 40], resist: 0.08,
    speed: 160, skills: [[53, 5]], attackCooldown: 1.5, vision: 240, leash: 650, scale: 1 },
  38: { id: 38, name: 'Kim Tơ Hầu', sprite: 'ani056', level: 7, element: 'thuy', hp: 360, damage: [30, 42], resist: 0.06,
    speed: 180, skills: [[196, 7]], attackCooldown: 1.7, vision: 280, leash: 650, scale: 1 },
  // Boss (own id, not an npcs.txt row): its fur throw plus Phá Thiên Trảm (Thiên Vương 90) and Phiêu Tuyết Xuyên Vân (Nga My).
  10031: { id: 10031, name: 'Kim Miêu Vương', sprite: 'ani049', level: 10, element: 'kim', hp: 4000, damage: [70, 100], resist: 0.2,
    speed: 190, skills: [[197, 10], [322, 8], [80, 10]], attackCooldown: 1.2, vision: 320, leash: 900, scale: 1, boss: true },
  // npcs.txt row 413 "Cọc gỗ" (enemy178).
  413: { id: 413, name: 'Cọc gỗ', sprite: 'enemy178', level: 1, element: 'kim', hp: 50000, damage: [0, 0], resist: 0,
    speed: 0, skills: [], attackCooldown: 99, vision: 0, leash: 0, scale: 1, dummy: true },
};

export const MONSTERS: Record<number, MonsterDef> = {
  ...Object.fromEntries(GEN_MONSTERS.map(g => [g.id, fromGen(g)])),
  ...HAND,
};
