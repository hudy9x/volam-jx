// Hoàng kim môn phái (TB11) and sets (TB13): 28 faction sets × 5 pieces (gold.gen.ts, gen:gold). Rules: docs/formulas/drops.md
// §Hoàng kim; every piece: docs/equipment-gold-thientu.md.
import { luckFactor } from '../formulas/drops.js';
import { HIDDEN_LINES } from '../formulas/tuning.js';
import { ITEMS, QUALITY, type Equipment, type Item, type ItemDef } from './items.js';
import { createItem, itemDef, type EquipSlot } from './items.js';
import { activeHidden, activeLines } from './magic.js';
import type { MagicLine } from './magic.js';

/** Pieces of a set. */
export const SUITE_SIZE = 5;
/** All rows of each suite (1–28). */
export const SUITES: Record<number, ItemDef[]> = {};
for (const def of Object.values(ITEMS)) if (def.gold) (SUITES[def.gold.suite] ??= []).push(def);

/**
 * A new hoàng kim piece: quality 0–10 (SRC KItemGenerator::Gen_GoldEquipment: rolled from the creator's luck; here
 * ⌊rand × 11 × luck factor⌋ capped at 10 — CHỌN), each line = min + (max − min) × quality / 10. Lines 2, 4, 6 are hidden
 * (on when activated or with the full set).
 */
export function createGold(def: ItemDef, uid: string, luck: number, random: () => number = Math.random): Item {
  const item = createItem(def, uid, random);
  const gq = Math.min(10, Math.floor(random() * 11 * luckFactor(luck)));
  item.q = QUALITY.gold;
  item.series = def.gold!.series;
  item.gq = gq;
  item.magic = def.gold!.lines.map(([name, lo, hi], i): MagicLine => {
    const v = Math.round(lo[0] + ((hi[0] - lo[0]) * gq) / 10);
    return i % 2 === 1 ? [name, v, 1] : [name, v];
  });
  return item;
}

/** Pieces of `suite` worn now. */
export const suiteWorn = (equip: Equipment, suite: number): number =>
  Object.values(equip).filter(it => it && ITEMS[it.def]?.gold?.suite === suite).length;

/** The full set is worn: every hidden line of its pieces is on (DATA: suites 1–28 have no set-bonus lines; SRC). */
export const fullSuite = (equip: Equipment, suite: number): boolean => suiteWorn(equip, suite) >= SUITE_SIZE;

/** P3 of magic line `i` of a piece (allskill_v: the skill id, 0 = võ công vốn có): from the gold row / the fixed lines. */
export function lineParam3(def: ItemDef | undefined, i: number): number {
  if (!def) return 0;
  if (def.gold) return def.gold.lines[i]?.[1]?.[2] ?? 0;
  return def.fixedMagic?.[i]?.[2] ?? 0;
}

/**
 * Every hidden line of every worn piece is on: a worn Càn Khôn Giới Chỉ (`revealHidden`), or a full set of a kind
 * HIDDEN_LINES.fullSetRevealsAll turns on (hoàng kim môn phái by default; Thiên Tứ once it exists).
 */
export function revealsHidden(equip: Equipment): boolean {
  if (Object.values(equip).some(it => !!itemDef(it)?.revealHidden)) return true;
  if (!HIDDEN_LINES.fullSetRevealsAll.gold) return false;
  const suites = new Set(Object.values(equip).map(it => itemDef(it)?.gold?.suite).filter((s): s is number => s !== undefined));
  return [...suites].some(s => fullSuite(equip, s));
}

/**
 * How many hidden lines of the piece worn in `slot` are on: all with the full set (TB13) or a Càn Khôn Giới Chỉ, else one per
 * activating ngũ hành (items/magic.ts activeHidden). Server stats and tooltips use the same rule.
 */
export function wornActiveCount(equip: Equipment, slot: EquipSlot, charSeries = -1): number {
  const def = itemDef(equip[slot]);
  if (revealsHidden(equip) || (def?.gold && fullSuite(equip, def.gold.suite))) return 6;
  return activeHidden(equip, slot, charSeries);
}

/**
 * Skill levels the worn pieces add (allskill_v, like jx-web-main attributes-01.js): P3 > 0 = that skill, P3 = 0 = every learned
 * skill ("võ công vốn có"). Only active lines of blue / gold pieces count.
 */
export function equipSkillBonus(equip: Equipment, charSeries = -1): { all: number; per: Record<number, number> } {
  const out = { all: 0, per: {} as Record<number, number> };
  for (const [slot, item] of Object.entries(equip) as [EquipSlot, Item | undefined][]) {
    const def = itemDef(item);
    if (!item || !def || (item.q !== QUALITY.magic && item.q !== QUALITY.gold) || !item.magic) continue;
    const on = activeLines(item, wornActiveCount(equip, slot, charSeries));
    item.magic.forEach(([name, value, hidden], i) => {
      if (name !== 'allskill_v' || (hidden && !on.has(i))) return;
      const skill = lineParam3(def, i);
      if (skill > 0) out.per[skill] = (out.per[skill] ?? 0) + value; else out.all += value;
    });
  }
  return out;
}

/** Hoàng kim set of a piece: its suite, name (the words its pieces share) and the pieces. */
export function suiteOf(def: ItemDef | undefined): { suite: number; name: string; pieces: ItemDef[] } | undefined {
  if (!def?.gold) return undefined;
  const pieces = SUITES[def.gold.suite] ?? [];
  const words = pieces.map(p => p.name.split(' '));
  const common: string[] = [];
  for (let i = 0; words.length && words.every(w => w[i] !== undefined && w[i] === words[0][i]); i++) common.push(words[0][i]);
  return { suite: def.gold.suite, name: common.join(' ') || def.name, pieces };
}
