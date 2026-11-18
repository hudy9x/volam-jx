import type { MonsterDef } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';

// What bosses do differently from ordinary monsters. A boss is a monster with `boss > 0` (1 = Boss Xanh, 2 = Boss Hoàng Kim;
// its numbers: packages/shared/src/monsters/); the rest of its behaviour is ai/monster.ts. Today the differences are:
//   - configured Golden Bosses return to their spawn radius; other bosses keep chasing,
//   - it picks a random skill each attack (shared skills/engine/ai.ts chooseSkill),
//   - a Golden Boss's death is announced to the whole map.
// Boss-specific scripts (phases by Sinh lực, summons…) go into ai/bosses/<name>.ts and are called from here.

/** Ordinary monsters and configured Golden Bosses have a home radius. */
export function leashes(def: MonsterDef, sim?: Sim): boolean {
  return !!def.boundedHome || (!def.boss && !sim?.a.boss);
}

/** A monster died: Golden Bosses tell everyone who beat them. */
export function onMonsterKilled(w: World, monster: Sim, killer: Sim | undefined): void {
  if (!killer) return;
  if (monster.a.boss >= 2 || monster.def?.boss) {
    w.hooks.announce(`${killer.a.name} đã hạ gục Boss Hoàng Kim ${monster.a.name}!`);
  }
}
