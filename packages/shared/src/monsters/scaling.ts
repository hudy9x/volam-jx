// How a monster's numbers follow its level. npcs.txt has no level: the spawn decides it (packages/shared/spawns/*.json),
// like the original server's AddNpc(id, level, …). Change the curves here to rebalance every monster at once.
import { monsterCurve } from '../formulas/monster.js';
import { DROPS } from '../formulas/tuning.js';
import type { MonsterDef } from './monsters.js';

/** Bosses: Sinh lực × this over an ordinary monster of their level (CHỌN; the original sets each boss by script). */
export const BOSS_LIFE = DROPS.goldBossLife;
export const BLUE_BOSS_LIFE = DROPS.blueBossLife;

/** Multiplier of Sinh lực and exp for a boss tier (0 = normal, 1 = Boss Xanh, 2 / true = Boss Hoàng Kim). */
export function bossMultiplier(boss: boolean | number = 0): number {
  if (boss === 1) return BLUE_BOSS_LIFE;
  if (boss) return BOSS_LIFE;
  return 1;
}

/** Sinh lực of a monster of `level` (formulas/monster.ts standard.lua curve; bosses × multiplier). */
export const monsterHp = (level: number, boss: boolean | number = 0) => monsterCurve(level).life * bossMultiplier(boss);
/** Base damage of a monster of `level` (standard.lua: min = max). */
export const monsterDamage = (level: number): [number, number] => { const d = monsterCurve(level).damage; return [d, d]; };

/**
 * Stats of a monster spawned at `level`: Sinh lực and damage from the level curve (GP10, 2026-11-12: every monster;
 * training dummies keep theirs), skill levels from npcs.txt Level "base|per".
 */
export function monsterAt(def: MonsterDef, level = def.level, bossTier?: boolean | number): { level: number; hp: number; damage: [number, number]; skills: [number, number][] } {
  if (def.dummy) return { level: def.level, hp: def.hp, damage: def.damage, skills: def.skills };
  const tier = bossTier ?? (def.boss ? 2 : 0);
  const skills: [number, number][] = def.skills.map(([id, lvl], i) => {
    const sc = def.skillScale?.[i];
    return [id, Math.max(1, Math.round(sc ? sc[0] + sc[1] * level : lvl))];
  });
  return { level, hp: Math.max(1, monsterHp(level, tier)), damage: monsterDamage(level), skills };
}
