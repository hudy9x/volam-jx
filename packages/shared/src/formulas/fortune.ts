// Tài phú Binh giáp (docs/formulas/fortune.md — CHỌN / USER 2026-11-19).
// Pure formula shared by server (authoritative buy/equip/stats) and client (F3 display & shop/bag checks).
import { fullSuite, wornActiveCount } from '../items/gold.js';
import { itemDef, QUALITY, type EquipSlot, type Equipment, type Item, type ItemDef } from '../items/items.js';
import { activeLines, isHidden } from '../items/magic.js';
import { MAGIC_ATTRIBS } from '../items/magicattrib.gen.js';
import { FORTUNE } from './tuning.js';

/** Max rolled value of a blue magic attribute for a given item kind and level (fallback 0). */
function maxMagicValue(def: ItemDef, attrName: string): number {
  let best = 0;
  for (const r of MAGIC_ATTRIBS) {
    if (r.attr !== attrName || r.level > def.level) continue;
    if (!r.kinds.includes(def.kind)) continue;
    if (r.max > best) best = r.max;
  }
  return best;
}

/** Roll ratio in [minRatio, 1] for one magic line. */
function lineRatio(item: Item, def: ItemDef, attrName: string, value: number, lineIdx: number): number {
  if (value <= 0) return 0;
  if (def.fixedMagic) return 1;
  if (def.gold) {
    const g = def.gold.lines[lineIdx];
    if (g) {
      const lo = g[1][0], hi = g[2][0];
      if (hi > lo) return Math.max(0.2, Math.min(1, (value - lo) / (hi - lo)));
      return 1;
    }
    return Math.max(0.2, Math.min(1, (item.gq ?? 5) / 10));
  }
  const hi = maxMagicValue(def, attrName);
  if (hi <= 0) return 0.5;
  return Math.max(0.1, Math.min(1, value / hi));
}

/** Base points of a single worn item before magic lines and slot/enhance multipliers. */
function basePoints(item: Item, def: ItemDef): number {
  const lv = Math.max(1, def.level || 1);
  if (def.revealHidden) return FORTUNE.base.revealHidden;
  if (def.kind === 'horse') return lv * FORTUNE.base.horsePerLevel;
  if (def.kind === 'mask') return FORTUNE.base.mask;
  if (def.kind === 'signet' || def.kind === 'ornament') return lv * FORTUNE.base.specialSlotPerLevel;
  if (def.gold || item.q === QUALITY.gold) return FORTUNE.base.goldBase + (item.gq ?? 0) * FORTUNE.base.goldPerQuality;
  if (item.q === QUALITY.magic) return lv * FORTUNE.base.magicPerLevel;
  return lv * FORTUNE.base.normalPerLevel;
}

/** Fortune points contributed by one worn piece in `slot`. Excludes `mantle` to avoid self-boosting loops. */
export function itemFortune(item: Item | undefined, slot: EquipSlot, activeHiddenCount = 0): number {
  if (!item || slot === 'mantle') return 0;
  const def = itemDef(item);
  if (!def || def.kind === 'mantle') return 0;

  let pts = basePoints(item, def);
  const magic = item.magic ?? [];
  if (magic.length) {
    const on = activeLines(item, activeHiddenCount);
    const perLine = def.gold || item.q === QUALITY.gold
      ? FORTUNE.line.gold
      : FORTUNE.line.magic;
    for (let i = 0; i < magic.length; i++) {
      const l = magic[i];
      const ratio = lineRatio(item, def, l[0], l[1], i);
      if (ratio <= 0) continue;
      const actMul = !isHidden(l) || on.has(i) ? 1 : FORTUNE.inactiveHiddenMul;
      pts += perLine * ratio * actMul;
    }
  }

  const slotMul = FORTUNE.slotMul[slot] ?? 1;
  return pts * slotMul;
}

/** Total Tài phú Binh giáp of a character's worn equipment (excludes `mantle`). */
export function equipmentFortune(equip: Equipment, charSeries = -1): number {
  let total = 0;
  const goldSuites = new Set<number>();
  for (const [slot, item] of Object.entries(equip) as [EquipSlot, Item | undefined][]) {
    if (!item || slot === 'mantle') continue;
    const active = wornActiveCount(equip, slot, charSeries);
    total += itemFortune(item, slot, active);
    const suite = itemDef(item)?.gold?.suite;
    if (suite !== undefined) goldSuites.add(suite);
  }
  for (const s of goldSuites) {
    if (fullSuite(equip, s)) total += FORTUNE.fullGoldSuiteBonus;
  }
  return Math.floor(total);
}

/** Fortune requirement of an ItemDef (`require_fortune_value`), or 0 if none. */
export function fortuneRequirement(def: ItemDef | undefined): number {
  if (!def) return 0;
  const r = def.req.find(([n]) => n === 'require_fortune_value');
  return r ? Math.max(0, r[1]) : 0;
}

/** Whether the worn mantle currently meets its Tài phú Binh giáp requirement. */
export function isMantleActive(equip: Equipment, charSeries = -1): boolean {
  const m = equip.mantle;
  if (!m) return false;
  const def = itemDef(m);
  if (!def) return false;
  const req = fortuneRequirement(def);
  if (req <= 0) return true;
  return equipmentFortune(equip, charSeries) >= req;
}
