import { itemDef, type Item } from '../items/items.js';
import { MAGIC_KINDS, magicRange } from '../items/magic.js';
import { MAGIC_ATTRIBS } from '../items/magicattrib.gen.js';
import { attrText } from '../items/describe.js';
import { CHAT } from '../protocol.js';

/** CHỌN thresholds for the user's "rare or large hidden option" rule, not original gameplay formulas. */
export const BOT_TRADE_RULES = { rareWeight: 1200, largeRatio: 0.9, botGapMs: 60_000, fleetGapMs: 5000, maxPending: 20 } as const;
export function botTradeReasons(item: Item): string[] {
  const def = itemDef(item);
  if (!def || !MAGIC_KINDS.includes(def.kind)) return [];
  const lines = item.magic?.filter(l => l[1] !== 0) ?? [];
  const reasons: string[] = lines.length > 5 ? [`${lines.length} dòng`] : [];
  for (const [index, [attr, value, hidden]] of (item.magic ?? []).entries()) {
    if (!hidden || !value) continue;
    const range = magicRange(attr, false);
    const fixed = def.gold?.lines[index];
    const max = fixed?.[0] === attr ? Math.max(Math.abs(fixed[1][0]), Math.abs(fixed[2][0])) : range ? Math.max(Math.abs(range[0]), Math.abs(range[1])) : 0;
    const rare = MAGIC_ATTRIBS.some(r => !r.prefix && r.attr === attr && r.kinds.includes(def.kind)
      && r.level <= def.level && value >= r.min && value <= r.max && (item.series === undefined || r.series === item.series)
      && (r.weights[def.kind] ?? 0) > 0 && (r.weights[def.kind] ?? 0) <= BOT_TRADE_RULES.rareWeight);
    if (rare || max > 0 && Math.abs(value) >= max * BOT_TRADE_RULES.largeRatio) reasons.push(`ẩn ${attrText(attr, value)}`);
  }
  return reasons;
}
export function botLootMessage(item: Item, selling: boolean): string | null {
  const reasons = botTradeReasons(item);
  if (!reasons.length) return null;
  return `${selling ? 'Rao bán' : 'Vừa nhặt'} [${itemDef(item)!.name}] — ${reasons.slice(0, 3).join('; ')}${selling ? '. Ai cần liên hệ.' : '.'}`.slice(0, CHAT.maxLength);
}
