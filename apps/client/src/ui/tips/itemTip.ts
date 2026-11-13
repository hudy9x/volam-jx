import { inventory } from '../../state/inventory';
import {
  HORSES, TIP_COLORS, describeItem, moneyText, speedPoints, type Item, type ItemDef, type ItemTipContext, type ItemViewer, type TipLine,
} from '@vltk/shared';
import { tooltip } from '../kit/tooltip';


export interface ItemTipOptions extends ItemTipContext {
  /** The piece itself (its rolled values); without it the table row is shown with min ~ max. */
  item?: Item | null;
  /** Requirements this character misses are red. */
  viewer?: ItemViewer | null;
  /** What a click does. */
  hint?: string;
}

/**
 * Item tooltip next to `anchor` (null hides it), in the order of the SHXT tooltip: name (colour of its quality), kind and
 * level, price, ngũ hành, description, base attributes, requirements (red when missed), magic lines (blue / gold; hidden
 * ones gray until activated, with the [min-max] of the attribute). Display only.
 */
export function showItemTip(def: ItemDef | null | undefined, anchor?: HTMLElement, opts: ItemTipOptions = {}): void {
  if (!def || !anchor) { tooltip.hide(); return; }
  tooltip.show(anchor, tip => fillItemTip(tip, def, opts), 'item-tip');
}

/** The item tooltip's lines into `tip` (the tooltip box, or an inline preview such as the forge's). */
export function fillItemTip(tip: HTMLElement, def: ItemDef, opts: ItemTipOptions = {}): void {
  const t = describeItem(def, opts.item ?? undefined, opts.viewer ?? undefined, { active: opts.active, equip: inventory.get().equip });
  const put = (lines: TipLine[], cls: string) => {
    for (const l of lines) {
      const d = document.createElement('div');
      d.className = cls;
      for (const span of l) {
        const e = document.createElement('span');
        e.textContent = span.text;
        if (span.color) e.style.color = span.color;
        d.appendChild(e);
      }
      tip.appendChild(d);
    }
  };
  const text = (cls: string, value: string, color = TIP_COLORS.text) => { if (value) put([[{ text: value, color }]], cls); };
  put([t.name], 'tip-name');
  text('tip-sub', t.sub, '');
  if (t.price) text('tip-price', `Giá: ${moneyText(t.price)} lượng`);
  put(t.series, 'tip-series');
  put(t.desc, 'tip-desc');
  put(t.base, 'tip-stats');
  const horse = def.kind === 'horse' ? HORSES[def.id] : undefined;
  if (horse) text('tip-note', `Khi cưỡi: tốc độ chạy +${speedPoints(horse.speedPct)}.`, '');
  put(t.req.map(r => r.line), 'tip-req');
  put(t.magic, 'tip-magic');
  put(t.suite, 'tip-suite');
  text('tip-hint', opts.hint ?? '', '');
}

/** Run speed bonus of a horse as tốc độ chạy points (formulas/speed.ts speedPoints; the horse shop shows it too). */
export const horseSpeedPoints = (horse: { speedPct: number }) => speedPoints(horse.speedPct);
