// What a player character looks like: the paper-doll rows drawn for the worn equipment.
import { DEFAULT_LOOK, ITEMS, type EquipSlot, type Equipment, type Outfit } from '../items/items.js';

/** Part-table rows the paper-doll draws for these table rows (starter outfit, previews). */
export function lookOfOutfit(outfit: Outfit): { helm: number; armor: number; weapon: number } {
  const row = (slot: EquipSlot, fallback: number) => ITEMS[outfit[slot] ?? '']?.look ?? fallback;
  return { helm: row('helm', DEFAULT_LOOK.helm), armor: row('armor', DEFAULT_LOOK.armor), weapon: row('weapon', DEFAULT_LOOK.weapon) };
}

/** Table rows of worn items. */
export const outfitOf = (equip: Equipment): Outfit =>
  Object.fromEntries(Object.entries(equip).filter(([, it]) => it).map(([slot, it]) => [slot, it!.def])) as Outfit;

/** Part-table rows the paper-doll draws for this equipment. */
export const lookOf = (equip: Equipment) => lookOfOutfit(outfitOf(equip));
