import type { MonsterDef } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';

// What bosses do differently from ordinary monsters. A boss is a monster with `boss: true` (its numbers:
// packages/shared/src/monsters/); the rest of its behaviour is ai/monster.ts. Today the differences are:
//   - it never gives up the chase (no leash),
//   - it picks a random skill each attack (shared skills/engine/ai.ts chooseSkill),
//   - its death is announced to the whole map.
// Boss-specific scripts (phases by Sinh lực, summons…) go into ai/bosses/<name>.ts and are called from here.

/** Ordinary monsters run home past their leash range; bosses keep chasing. */
export function leashes(def: MonsterDef): boolean {
  return !def.boss;
}

/** A monster died: bosses tell everyone who beat them. */
export function onMonsterKilled(w: World, monster: Sim, killer: Sim | undefined): void {
  if (monster.def?.boss && killer) w.hooks.announce(`${killer.a.name} đã hạ gục ${monster.a.name}!`);
}
