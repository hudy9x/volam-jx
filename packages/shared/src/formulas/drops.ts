// Monster drops (VT8) and the blue lines of a dropped piece (TB6 + luck). Tables: drops/drops.gen.ts (gen:drops).
// Rules and sources: docs/formulas/drops.md; research: docs/research/luck-drops.md.
import { DROP_TABLES, type DropTable } from '../drops/drops.gen.js';
import { ITEMS, type ItemDef, type ItemKind } from '../items/items.js';
import { MAGIC_ATTRIBS } from '../items/magicattrib.gen.js';
import { MAGIC_LINES, type MagicLine } from '../items/magic.js';
import { DROPS, LUCK } from './tuning.js';

/** Genre 0 Detail → our item kind (DATA goldennpc/各种类droprate文字描述.txt). */
export const DETAIL_KINDS: ItemKind[] = ['melee', 'range', 'armor', 'ring', 'amulet', 'boot', 'belt', 'helm', 'cuff', 'pendant'];

/**
 * Drop table of a monster: its custom table (`boss/*`, `goldennpc/*`) when present, else the band of its level
 * (npcdroprate10 … 90). The original picks it per map (maplist.ini NormalDropRate) or per boss; by level is our
 * simplification (CHỌN).
 */
export function dropTableFor(level: number, customTable?: string): DropTable | undefined {
  if (customTable && DROP_TABLES[customTable]) return DROP_TABLES[customTable];
  const band = Math.max(10, Math.min(90, Math.ceil(Math.max(1, level) / 10) * 10));
  return DROP_TABLES[`npcdroprate${band}`];
}

/** Item level range for a monster of `level` (INFERRED from the column names; jx-web-main reads them the same way). */
export function itemLevelRange(t: DropTable, level: number): [number, number] {
  let hi = Math.min(t.maxLevel || 10, Math.floor(level / Math.max(1, t.maxScale)));
  let lo = Math.max(t.minLevel || 1, Math.floor(level / Math.max(1, t.minScale)));
  if (lo > hi) [lo, hi] = [hi, lo];
  return [Math.max(1, lo), Math.max(1, hi)];
}

/** One roll of a table: an equipment row (our item def) or nothing. Other genres (quest items, scripts) are skipped. */
export function rollItem(t: DropTable, level: number, rng: () => number): ItemDef | null {
  let x = Math.floor(rng() * t.range);
  for (const [genre, detail, particular, rate, quality] of t.items) {
    if (x < rate) {
      if (genre !== 0) return null; // quest / script items (Genre 4, 6) not yet
      if (quality) return ITEMS[`gold-${detail}`] ?? null; // hoàng kim: Detail = goldequip row (TB11)
      const kind = DETAIL_KINDS[detail];
      const [lo, hi] = itemLevelRange(t, level);
      const lv = lo + Math.floor(rng() * (hi - lo + 1));
      return (kind && ITEMS[`${kind}-${particular}-${lv}`]) || null;
    }
    x -= rate;
  }
  return null;
}

/** Money of a kill: MoneyRate % chance; amount CHỌN (DROPS.moneyPerLevel). */
export function rollMoney(t: DropTable, level: number, rng: () => number): number {
  if (rng() * 100 >= t.moneyRate) return 0;
  return Math.max(1, Math.ceil(level * t.moneyScale * DROPS.moneyPerLevel * (0.5 + rng())));
}

/** Factor that divides the candidate threshold: max(0.2, 1 + 0.2 × (luck − 5)). */
export const luckFactor = (luck: number): number => Math.max(LUCK.minFactor, 1 + LUCK.perPoint * (luck - LUCK.neutral));

/**
 * Blue lines of a new piece (SRC KItemGenerator::Gen_MagicAttrib, R INFERRED):
 * Odd human lines (1, 3, 5 → index 0, 2, 4) are ALWAYS visible prefixes; even human lines (2, 4, 6 → index 1, 3, 5)
 * are ALWAYS hidden suffixes of the item's ngũ hành. Never skip a position and shift later lines into the wrong parity.
 */
export function rollMagicLines(def: ItemDef, series: number, luck: number, rng: () => number): MagicLine[] {
  const f = luckFactor(luck);
  // Count how many lines pass the luck threshold across the 6 slots (preserves drop-rate & luck scaling).
  let hits = 0;
  for (let pos = 0; pos < MAGIC_LINES; pos++) {
    const prefix = pos % 2 === 0;
    const threshold = Math.floor(rng() * LUCK.range) / f;
    const hasCand = MAGIC_ATTRIBS.some(r => r.prefix === prefix && r.level <= def.level
      && (prefix || r.series === -1 || r.series === series) && (r.weights[def.kind] ?? 0) > threshold);
    if (hasCand) hits++;
  }
  const out: MagicLine[] = [];
  const used = new Set<string>();
  for (let pos = 0; pos < hits; pos++) {
    const prefix = pos % 2 === 0;
    const threshold = Math.floor(rng() * LUCK.range) / f;
    let cands = MAGIC_ATTRIBS.filter(r => r.prefix === prefix && r.level <= def.level && !used.has(r.attr)
      && (prefix || r.series === -1 || r.series === series) && (r.weights[def.kind] ?? 0) > threshold);
    if (!cands.length) {
      cands = MAGIC_ATTRIBS.filter(r => r.prefix === prefix && r.level <= def.level && !used.has(r.attr)
        && (prefix || r.series === -1 || r.series === series) && (r.weights[def.kind] ?? 0) > 0);
    }
    if (!cands.length) break;
    const r = cands[Math.floor(rng() * cands.length)];
    used.add(r.attr);
    const v = r.min + Math.floor(rng() * (Math.max(r.min, r.max) - r.min + 1));
    out.push(prefix ? [r.attr, v] : [r.attr, v, 1]);
  }
  return out;
}
