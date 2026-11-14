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
  const t = describeItem(def, opts.item ?? undefined, opts.viewer ?? undefined, {
    active: opts.active, slot: opts.slot, equip: inventory.get().equip,
  });
  const section = (): HTMLElement => {
    const s = document.createElement('div');
    s.className = 'tip-section';
    return s;
  };
  const put = (parent: HTMLElement, lines: TipLine[], cls: string) => {
    for (const l of lines) {
      const d = document.createElement('div');
      d.className = cls;
      for (const span of l) {
        const e = document.createElement('span');
        e.textContent = span.text;
        if (span.color) e.style.color = span.color;
        d.appendChild(e);
      }
      parent.appendChild(d);
    }
  };
  const text = (parent: HTMLElement, cls: string, value: string, color = TIP_COLORS.text) => {
    if (value) put(parent, [[{ text: value, color }]], cls);
  };
  const flush = (sec: HTMLElement) => { if (sec.childElementCount) tip.appendChild(sec); };

  // Section 1: Thông tin mô tả trang bị
  const s1 = section();
  put(s1, [t.name], 'tip-name');
  text(s1, 'tip-sub', t.sub, '');
  if (t.price) text(s1, 'tip-price', `Giá: ${moneyText(t.price)} lượng`);
  put(s1, t.series, 'tip-series');
  put(s1, t.desc, 'tip-desc');
  flush(s1);

  // Section 2: Giá trị mặc định & yêu cầu
  const s2 = section();
  put(s2, t.base, 'tip-stats');
  const horse = def.kind === 'horse' ? HORSES[def.id] : undefined;
  if (horse) text(s2, 'tip-note', `Khi cưỡi: tốc độ chạy +${speedPoints(horse.speedPct)}.`, '');
  put(s2, t.req.map(r => r.line), 'tip-req');
  flush(s2);

  // Section 3: Các dòng ẩn / hiện
  const s3 = section();
  put(s3, t.magic, 'tip-magic');
  flush(s3);

  // Section 4: Danh sách trang bị của bộ / kích hoạt dòng ẩn
  const s4 = section();
  put(s4, t.suite, 'tip-suite');
  flush(s4);

  // Section 5: Mô tả khác
  const s5 = section();
  text(s5, 'tip-hint', opts.hint ?? '', '');
  flush(s5);
}

/** Run speed bonus of a horse as tốc độ chạy points (formulas/speed.ts speedPoints; the horse shop shows it too). */
export const horseSpeedPoints = (horse: { speedPct: number }) => speedPoints(horse.speedPct);
