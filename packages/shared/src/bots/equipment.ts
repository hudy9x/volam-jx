import { forgeChoices, magicRange, type ForgeLines } from '../items/magic.js';
import type { ItemDef } from '../items/items.js';

/** USER 2026-11-14: every bot's green weapon has both steals at the table-wide maximum.
 * Bot-only option override: these two prefixes may exceed the row allowed by the weapon's tier.
 * Other options still obey the ordinary forge choices. Player crafting is unchanged.
 */
export function botGreenLines(def: ItemDef, series: number): ForgeLines {
  const weapon = def.kind === 'melee' || def.kind === 'range';
  const required = new Map(weapon ? [[0, 'steallifeenhance_p'], [2, 'stealmanaenhance_p']] : []);
  const seen = new Set(required.values());
  return Array.from({ length: 6 }, (_, pos) => {
    const attr = required.get(pos);
    if (attr) {
      const range = magicRange(attr, true);
      if (!range) throw new Error(`Missing mandatory bot weapon option: ${attr}`);
      return [attr, range[1]];
    }
    const choice = forgeChoices(def, series, pos).find(c => !seen.has(c.attr) && c.max > 0);
    if (!choice) return null;
    seen.add(choice.attr); return [choice.attr, choice.max];
  });
}
