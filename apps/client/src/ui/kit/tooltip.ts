import { mount } from './dom';
import './tooltip.css';
import { computeTooltipPosition } from './tooltip-position';
import { hudSize, localPoint } from './viewport';

/**
 * The one floating tooltip of the HUD (#item-tip): items, skills, states. Shown next to the hovered element — above,
 * below, or beside it without covering the anchor — and kept inside the window. Builders of the content: ui/tips/.
 */
let el: HTMLElement | null = null;
const BOX_CLASSES = ['skill-tip', 'item-tip'];

export const tooltip = {
  mount(parent: HTMLElement): void {
    el = mount(parent, '<div id="item-tip" class="hidden"></div>');
  },

  /** Fill the tooltip and show it next to `anchor`. `cls`: extra class of the box (skill-tip: wider; item-tip: centred). */
  show(anchor: HTMLElement, fill: (box: HTMLElement) => void, cls?: string): void {
    if (!el) return;
    el.replaceChildren();
    el.classList.remove(...BOX_CLASSES);
    if (cls) el.classList.add(cls);
    el.style.left = '0px';
    el.style.top = '0px';
    fill(el);
    const r = anchor.getBoundingClientRect();
    el.classList.remove('hidden');
    const w = el.offsetWidth, h = el.offsetHeight;
    const parent = el.parentElement!;
    const [left, top] = localPoint(parent, r.left, r.top);
    const [right, bottom] = localPoint(parent, r.right, r.bottom);
    const pos = computeTooltipPosition({ left, top, right, bottom }, { width: w, height: h }, hudSize());
    el.style.left = `${pos.left}px`;
    el.style.top = `${pos.top}px`;
  },

  hide(): void {
    el?.classList.add('hidden');
    el?.classList.remove(...BOX_CLASSES);
  },
};
