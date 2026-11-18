// Item tooltip (TB4), built like the skill tooltip: the original sentence of each attribute from settings/magicdesc.ini
// (MAGIC_DESC). Colours and order follow the SHXT tooltips: name in the colour of the piece's quality, info white,
// requirements red when missed, blue lines blue (gold pieces: gold), hidden lines gray until activated, each magic line
// with the [min-max] of its attribute. Display only.
import { formatAttr, richText, type TipLine } from '../skills/core/describe.js';
import { MAGIC_DESC } from '../skills/core/magicdesc.gen.js';
import { missesReq, type ItemViewer } from './equip.js';
import { getExpElixirMultiplier } from './elixirs.js';
import {
  KIND_NAMES, KIND_SLOTS, QUALITY, QUALITY_NAMES, SLOT_NAMES, itemQty, maxStackOf,
  type EquipSlot, type Equipment, type Item, type ItemDef,
} from './items.js';
import { SUITE_SIZE, lineParam3, suiteOf } from './gold.js';
import { ACTIVATED_BY, GENERATES, MAGIC_KINDS, SERIES_NAMES, activeLines, isHidden, magicRange } from './magic.js';
import { POTION_PULSE_MS, potionPumps } from './potions.js';

export type { ItemViewer } from './equip.js';

/** Tooltip colours (sampled from SHXT screenshots: the client data has no values for them). */
export const TIP_COLORS = {
  text: '#f0f0f0', blue: '#7b8cff', gold: '#ffe98c', hidden: '#8c968c', red: '#ff4646', green: '#58d070', desc: '#d8c9a3',
};
/** Name colours by quality (Item.q): trắng, xanh, tím, hoàng kim, bạch kim. */
export const QUALITY_COLORS = [TIP_COLORS.text, TIP_COLORS.blue, '#c88cff', TIP_COLORS.gold, '#f0f0f0'];
/** Colours of the five elements (0 Kim, 1 Mộc, 2 Thủy, 3 Hỏa, 4 Thổ) on item tooltips. */
export const SERIES_COLORS = ['#ffd24a', '#58d070', '#6fb8ff', '#ff4646', '#d8a466'];

/** Where a piece is shown: worn pieces light up their activated hidden lines. */
export interface ItemTipContext {
  /** Hidden lines active (gold.ts wornActiveCount); undefined = not worn (none). */
  active?: number;
  /** Worn slot when inspecting an equipped piece (disambiguates ring1 vs ring2). */
  slot?: EquipSlot;
  /** The viewer's worn pieces: the hoàng kim set list marks the worn ones (TB13). */
  equip?: Equipment;
}

export interface ItemTooltip {
  name: TipLine;
  /** Kind · level · quality. */
  sub: string;
  /** "Thuộc tính Ngũ hành: Kim" (pieces with a ngũ hành). */
  series: TipLine[];
  /** Base attributes (damage, Né tránh, durability…). */
  base: TipLine[];
  /** Magic lines (blue / gold; hidden lines gray until active). */
  magic: TipLine[];
  /** Requirements; `bad` = this viewer does not meet it. */
  req: { line: TipLine; bad: boolean }[];
  desc: TipLine[];
  /** Original price (lượng). */
  price: number;
  /** Hoàng kim: "Bộ <name> (n/5)" and every piece of the set, worn ones green, missing ones gray (TB13). */
  suite: TipLine[];
}

const RED = TIP_COLORS.red;
const GRAY = TIP_COLORS.hidden;

/** Our own sentences where magicdesc.ini has none (not original text). */
const EXTRA_DESC: Record<string, string> = {
  item_usagetime_v: 'Có thời hạn sử dụng: #d1- (chưa áp dụng)',
};

function line(name: string, value: number, max?: number, color = TIP_COLORS.text, p3 = value): TipLine[] {
  const tpl = MAGIC_DESC[name] ?? EXTRA_DESC[name];
  if (!tpl) return [[{ text: `Thuộc tính ${name.replace(/^attr/, 'mã ')} (chưa rõ tên): ${value}`, color: GRAY }]];
  const lines = richText(formatAttr(tpl, [value, 0, p3]), color);
  if (max !== undefined && max > value && lines.length) lines[lines.length - 1].push({ text: ` ~ ${max}`, color: GRAY });
  return lines;
}

/** Plain sentence of an attribute at `value` (forge choices). */
export const attrText = (name: string, value: number): string => line(name, value).map(l => l.map(s => s.text).join('')).join(' ');

/** A magic line in one colour, with the [min-max] of its attribute. */
function magicLine(name: string, value: number, prefix: boolean, color: string, p3 = value): TipLine[] {
  const range = name === 'allskill_v' ? null : magicRange(name, prefix);
  return line(name, value, undefined, TIP_COLORS.text, p3).map((l, i, all) => [
    ...l.map(s => ({ text: s.text, color })),
    ...(range && i === all.length - 1 ? [{ text: ` [${range[0]}-${range[1]}]`, color }] : []),
  ]);
}

/**
 * Thuốc: what it pumps, in our sentence (the original "Phục hồi sinh lực mỗi nửa giây: N điểm" no longer holds: pulses
 * come every POTION_PULSE_MS here), then the effects this game does not have yet, in gray.
 */
function potionLines(def: ItemDef): TipLine[] {
  const pumps = potionPumps(def);
  const every = String(POTION_PULSE_MS / 1000).replace('.', ',');
  const out: TipLine[] = pumps.map(p => [{
    text: `Phục hồi ${p.stat === 'hp' ? 'sinh lực' : 'nội lực'}: ${p.per * p.pulses} điểm (${p.per} điểm mỗi ${every} giây)`,
  }]);
  for (const [name, value] of def.use ?? []) {
    if (name === 'lifepotion_v' || name === 'manapotion_v') { if (value > 0) continue; }
    for (const l of line(name, value)) out.push([...l.map(s => ({ ...s, color: GRAY })), { text: ' (chưa có tác dụng)', color: GRAY }]);
  }
  return out;
}

/** Tooltip of a piece (`item`) or of a bare table row (shops: min ~ max of rolled values). */
export function describeItem(def: ItemDef, item?: Item, viewer?: ItemViewer, ctx: ItemTipContext = {}): ItemTooltip {
  const q = item?.q ?? 0;
  const base: TipLine[] = def.kind === 'potion' ? potionLines(def) : [];
  if (def.elixir) {
    const mul = getExpElixirMultiplier(def.elixir.tier);
    const hours = Math.round((def.elixir.durationMs / 3_600_000) * 10) / 10;
    base.push([{ text: `Nhân ${mul} lần kinh nghiệm đánh quái trong ${hours} giờ`, color: TIP_COLORS.green }]);
  }
  if (item && maxStackOf(def) > 1) {
    base.push([{ text: `Số lượng: ${itemQty(item)} / ${maxStackOf(def)}`, color: TIP_COLORS.text }]);
  }
  def.base.forEach(([name, lo, hi], i) => {
    if (name === 'fastwalkrun_p' || name === 'attackratingenhance_p') { if (!lo && !hi) return; }
    const value = item?.base?.[i] ?? lo;
    if (name === 'durability_v') {
      const cur = item?.dur ?? value;
      base.push([{ text: `Độ bền: ${cur} / ${value}`, color: cur <= 0 ? RED : TIP_COLORS.text }]);
      return;
    }
    base.push(...line(name, value, item ? undefined : hi));
  });
  const lineColor = q >= QUALITY.gold ? TIP_COLORS.gold : TIP_COLORS.blue;
  const on = item && ctx.active ? activeLines(item, ctx.active) : new Set<number>();
  const magic = (item?.magic ?? []).flatMap((l, i) =>
    magicLine(l[0], l[1], !isHidden(l), isHidden(l) && !on.has(i) ? GRAY : lineColor, l[0] === 'allskill_v' ? lineParam3(def, i) : l[1]));
  const set = suiteOf(def);
  const suite: TipLine[] = [];
  if (set) {
    const worn = new Set(Object.values(ctx.equip ?? {}).map(it => it?.def));
    const n = set.pieces.filter(p => worn.has(p.id)).length;
    suite.push([{ text: `Bộ ${set.name} (${n}/${set.pieces.length})`, color: TIP_COLORS.gold }]);
    for (const p of set.pieces) suite.push([{ text: `  ${p.name}`, color: worn.has(p.id) ? TIP_COLORS.green : GRAY }]);
    suite.push([{ text: 'Mặc đủ bộ: kích hoạt toàn bộ thuộc tính ẩn', color: n >= Math.min(set.pieces.length, SUITE_SIZE) ? TIP_COLORS.green : GRAY }]);
  } else if (item && item.series !== undefined && (item.q === QUALITY.magic || !item.q) && MAGIC_KINDS.includes(def.kind)) {
    const gen = GENERATES.indexOf(item.series);
    const pair = (s: EquipSlot) => (ACTIVATED_BY[s] ?? []).map(k => SLOT_NAMES[k]).join(' + ');
    const slots = ctx.slot && ACTIVATED_BY[ctx.slot] ? [ctx.slot] : KIND_SLOTS[def.kind].filter(k => ACTIVATED_BY[k]);
    if (gen >= 0 && slots.length) {
      const need = slots.length === 1 ? pair(slots[0]) : `${pair('ring1')} (nhẫn trên) / ${pair('ring2')} (nhẫn dưới)`;
      suite.push([
        { text: `Cần ${need} hệ `, color: GRAY },
        { text: SERIES_NAMES[gen], color: SERIES_COLORS[gen] ?? GRAY },
        { text: ' để kích hoạt dòng ẩn', color: GRAY },
      ]);
    }
  }
  // A zero level / Sức mạnh / Thân pháp means "none" (sex, ngũ hành and faction use 0 as a value).
  const req = def.req.filter(([name, value]) => value > 0 || !/^require(level|str|dex)$/.test(name)).flatMap(([name, value]) => {
    const bad = !!viewer && missesReq(name, value, viewer);
    return line(name, value, undefined, bad ? RED : TIP_COLORS.text).map(l => ({ line: l, bad }));
  });
  const sub = [KIND_NAMES[def.kind], def.kind === 'horse' || def.kind === 'mask' || def.kind === 'potion' || def.kind === 'elixir' ? '' : `Cấp ${def.level}`, q ? QUALITY_NAMES[q] : '']
    .filter(Boolean).join(' · ');
  const s = item?.series ?? def.gold?.series;
  const series: TipLine[] = s !== undefined && SERIES_NAMES[s] ? [[
    { text: 'Thuộc tính Ngũ hành: ', color: TIP_COLORS.text },
    { text: SERIES_NAMES[s], color: SERIES_COLORS[s] ?? TIP_COLORS.text },
  ]] : [];
  return {
    name: [{ text: def.name, color: QUALITY_COLORS[q] }], sub, series, base, magic, req,
    desc: def.desc ? richText(def.desc, TIP_COLORS.desc) : [], price: def.price, suite,
  };
}
