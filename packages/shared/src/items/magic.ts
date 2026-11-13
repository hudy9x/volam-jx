// Ngũ hành of a piece, its magic lines (blue: settings/item/magicattrib.txt, TB6), hidden lines and their activation
// (TB7), and the Thợ rèn forge ("chế tạo": pick a piece and each line, values at their maximum). Display + forge only:
// what the lines do to a character is TB8.
import { MAGIC_ATTRIBS, type MagicAttribRow } from './magicattrib.gen.js';
import type { EquipSlot, Equipment, Item, ItemDef, ItemKind } from './items.js';

/** Ngũ hành of the original tables: 0 Kim, 1 Mộc, 2 Thủy, 3 Hỏa, 4 Thổ. */
export const SERIES_NAMES = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
/** Same order as FactionDef.element. */
export const SERIES_KEYS = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
/** Tương sinh: Kim → Thủy → Mộc → Hỏa → Thổ → Kim (GENERATES[a] = what a gives birth to). */
export const GENERATES = [2, 3, 1, 4, 0];

/** Lines of a blue piece: prefixes at 0, 2, 4 (always on), suffixes at 1, 3, 5 (hidden, of the piece's ngũ hành). */
export const MAGIC_LINES = 6;

/** A magic line of a piece: [attribute, value] and 1 when it is a hidden line. */
export type MagicLine = [attr: string, value: number, hidden?: 1];

/**
 * The two worn slots that activate the hidden lines of a slot, like the original (BACKLOG TB7, docs/equipment-gold-thientu.md
 * §2.1): Nón ← áo, dây chuyền · Áo ← nhẫn dưới, đai · …
 */
export const ACTIVATED_BY: Partial<Record<EquipSlot, [EquipSlot, EquipSlot]>> = {
  helm: ['armor', 'amulet'], armor: ['ring2', 'belt'], belt: ['pendant', 'cuff'], weapon: ['amulet', 'armor'],
  boot: ['weapon', 'helm'], cuff: ['boot', 'ring1'], amulet: ['belt', 'ring2'], ring1: ['weapon', 'helm'],
  ring2: ['cuff', 'pendant'], pendant: ['boot', 'ring1'],
};

/**
 * How many hidden lines of the piece worn in `slot` are active: one for each activating slot whose piece's ngũ hành
 * gives birth to this piece's, and one when the character's own ngũ hành does (`charSeries`, -1 = none). The first
 * hidden lines light up first. Our reading (🟡): the original engine is not available to check the exact rule.
 */
export function activeHidden(equip: Equipment, slot: EquipSlot, charSeries = -1): number {
  const item = equip[slot];
  if (item?.series === undefined) return 0;
  let n = 0;
  for (const from of ACTIVATED_BY[slot] ?? []) {
    const s = equip[from]?.series;
    if (s !== undefined && GENERATES[s] === item.series) n++;
  }
  if (charSeries >= 0 && GENERATES[charSeries] === item.series) n++;
  return n;
}

/** Slots with hidden lines (the ACTIVATED_BY graph), weapon first. */
export const MAGIC_SLOTS: EquipSlot[] = ['weapon', 'helm', 'armor', 'belt', 'boot', 'cuff', 'amulet', 'ring1', 'ring2', 'pendant'];

export interface SeriesPlan {
  /** Ngũ hành per slot. */
  series: Partial<Record<EquipSlot, number>>;
  /** Hidden lines lit per slot (activeHidden; a piece has at most 3). */
  lit: Partial<Record<EquipSlot, number>>;
  total: number;
}
const planCache = new Map<string, SeriesPlan>();

/**
 * Ngũ hành for every worn slot that lights the most hidden lines (activeHidden, capped at the 3 hidden lines a piece
 * has), given the weapon's ngũ hành (-1 = free) and the character's (-1 = none). Tries every combination (5^9 with the
 * weapon fixed); ties keep the first found. Forge window: "Ngũ hành theo vũ khí" (USER 2026-11-13).
 */
export function seriesPlan(weaponSeries: number, charSeries = -1): SeriesPlan {
  const key = `${weaponSeries}|${charSeries}`;
  const cached = planCache.get(key);
  if (cached) return cached;
  const n = MAGIC_SLOTS.length, idx = new Map(MAGIC_SLOTS.map((s, i) => [s, i]));
  const from = MAGIC_SLOTS.map(s => (ACTIVATED_BY[s] ?? []).map(f => idx.get(f)!));
  const cur = new Array<number>(n).fill(0), best = new Array<number>(n).fill(0);
  let bestTotal = -1;
  const score = () => {
    let t = 0;
    for (let i = 0; i < n; i++) {
      let k = charSeries >= 0 && GENERATES[charSeries] === cur[i] ? 1 : 0;
      for (const f of from[i]) if (GENERATES[cur[f]] === cur[i]) k++;
      t += Math.min(3, k);
    }
    return t;
  };
  const walk = (i: number) => {
    if (i === n) {
      const t = score();
      if (t > bestTotal) { bestTotal = t; best.splice(0, n, ...cur); }
      return;
    }
    const fixed = i === 0 && weaponSeries >= 0;
    for (let s = fixed ? weaponSeries : 0; s < (fixed ? weaponSeries + 1 : 5); s++) { cur[i] = s; walk(i + 1); }
  };
  walk(0);
  const series: SeriesPlan['series'] = {}, equip: Equipment = {} as Equipment;
  MAGIC_SLOTS.forEach((s, i) => { series[s] = best[i]; (equip as Record<string, Item>)[s] = { uid: '', def: '', series: best[i] }; });
  const lit: SeriesPlan['lit'] = {};
  for (const s of MAGIC_SLOTS) lit[s] = Math.min(3, activeHidden(equip, s, charSeries));
  const plan = { series, lit, total: bestTotal };
  planCache.set(key, plan);
  return plan;
}

/** Index of the hidden lines (in `item.magic`) that are on, for a worn piece. */
export function activeLines(item: Item, active: number): Set<number> {
  const on = new Set<number>();
  let k = 0;
  (item.magic ?? []).forEach((l, i) => { if (l[2] && k++ < active) on.add(i); });
  return on;
}

/** Item kinds that carry blue lines (the weight columns of magicattrib.txt). */
export const MAGIC_KINDS: ItemKind[] = ['melee', 'range', 'armor', 'ring', 'amulet', 'boot', 'belt', 'helm', 'cuff', 'pendant'];

const rowsOf = (attr: string, prefix: boolean) => MAGIC_ATTRIBS.filter(r => r.attr === attr && r.prefix === prefix);

/** Smallest and largest value of a line over every level (shown "[min-max]" like the SHXT tooltip). */
export function magicRange(attr: string, prefix: boolean): [number, number] | undefined {
  const rows = rowsOf(attr, prefix);
  if (!rows.length) return undefined;
  return [Math.min(...rows.map(r => r.min)), Math.max(...rows.map(r => r.max))];
}

/** What can go into line `pos` of a piece of row `def` with ngũ hành `series`. */
export interface ForgeChoice {
  attr: string;
  /** Allowed values: smallest of the lowest row … largest of the highest row ≤ the piece's level. */
  min: number;
  max: number;
  /** Best table row used (its level). */
  level: number;
}

/** Choices for line `pos` (even = prefix, odd = suffix of `series`), one per attribute, at most the piece's level. */
export function forgeChoices(def: ItemDef, series: number, pos: number): ForgeChoice[] {
  const prefix = pos % 2 === 0;
  const by = new Map<string, MagicAttribRow[]>();
  for (const r of MAGIC_ATTRIBS) {
    if (r.prefix !== prefix || r.level > def.level || !r.kinds.includes(def.kind)) continue;
    if (!prefix && r.series !== series) continue;
    by.set(r.attr, [...(by.get(r.attr) ?? []), r]);
  }
  return [...by].map(([attr, rows]) => {
    const best = rows.reduce((a, b) => (b.level > a.level ? b : a));
    return { attr, min: Math.min(...rows.map(r => r.min)), max: best.max, level: best.level };
  });
}

/** Lines asked for at the forge: [attribute, value] per position (null = empty). */
export type ForgeLines = ([string, number] | null)[];

/** Why a forge order is wrong, or null. The server runs it before making the piece. */
export function forgeError(def: ItemDef | undefined, series: number, lines: ForgeLines): string | null {
  if (!def || !MAGIC_KINDS.includes(def.kind)) return 'Thợ rèn không chế tạo được món này.';
  if (!Number.isInteger(series) || series < 0 || series > 4) return 'Ngũ hành không hợp lệ.';
  if (!Array.isArray(lines) || lines.length > MAGIC_LINES) return 'Tối đa 6 dòng thuộc tính.';
  const seen = new Set<string>();
  for (let pos = 0; pos < lines.length; pos++) {
    const l = lines[pos];
    if (!l) continue;
    const [attr, value] = l;
    const choice = forgeChoices(def, series, pos).find(c => c.attr === attr);
    if (!choice) return `Dòng ${pos + 1}: thuộc tính không có trên món này.`;
    if (seen.has(attr)) return 'Hai dòng trùng loại thuộc tính.';
    seen.add(attr);
    if (!Number.isInteger(value) || value < choice.min || value > choice.max) return `Dòng ${pos + 1}: giá trị phải trong ${choice.min} – ${choice.max}.`;
  }
  return null;
}

/** Price of a forged piece: the table price once for the piece and once more for each line (our pick). */
export const forgePrice = (def: ItemDef, lines: ForgeLines): number => def.price * (1 + lines.filter(Boolean).length);

/** The magic lines of a forged piece, in position order (empty positions dropped; suffixes marked hidden). */
export const forgedMagic = (lines: ForgeLines): MagicLine[] =>
  lines.flatMap((l, pos) => (l ? [(pos % 2 ? [l[0], l[1], 1] : [l[0], l[1]]) as MagicLine] : []));

/** Whether a stored line is a hidden one (for pieces made before the flag existed: none are). */
export const isHidden = (l: MagicLine): boolean => l[2] === 1;

/** Ngũ hành index of a character's faction element ('kim'… ; -1 when unknown). */
export const seriesOf = (element: string | undefined): number => (element ? SERIES_KEYS.indexOf(element) : -1);
