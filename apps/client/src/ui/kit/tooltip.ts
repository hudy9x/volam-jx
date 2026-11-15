import { mount } from './dom';
import './tooltip.css';
import { hudSize, localPoint } from './viewport';

/**
 * The one floating tooltip of the HUD (#item-tip): items, skills, states. Shown next to the hovered element — above it
 * when there is room, otherwise below — and kept inside the window. Builders of the content: ui/tips/.
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
    fill(el);
    const r = anchor.getBoundingClientRect();
    el.classList.remove('hidden');
    const w = el.offsetWidth, h = el.offsetHeight;
    const parent = el.parentElement!;
    const [x, top] = localPoint(parent, r.left + r.width / 2, r.top);
    const [, bottom] = localPoint(parent, r.left, r.bottom);
    const { width, height } = hudSize();
    el.style.left = `${Math.max(8, Math.min(width - w - 8, x - w / 2))}px`;
    el.style.top = `${Math.max(8, Math.min(height - h - 8, top - h - 8 >= 8 ? top - h - 8 : bottom + 8))}px`;
  },

  hide(): void {
    el?.classList.add('hidden');
    el?.classList.remove(...BOX_CLASSES);
  },
};
