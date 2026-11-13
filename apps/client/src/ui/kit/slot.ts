import type { ItemDef } from '@vltk/shared';
import { itemIconUrl } from '../../art/icons';

/** Frame of coloured pieces by Item.q (ui3/随身物品.ini [Settings]: BGSpriteColor gold, BGPurpleColor, BGPlatinaColor). */
const QUALITY_CLASS = ['', '', 'q-purple', 'q-gold', 'q-plat'];

export interface SlotLook {
  /** Item.q of the piece (frame of tím / hoàng kim / bạch kim; white and blue pieces have none). */
  quality?: number;
  /** Background like the original bag: true = can wear / use (green), false = cannot (dark red), undefined = plain. */
  wearable?: boolean;
}

/**
 * Show an item's original icon (1:1, centred) in a `.slot` box, or empty it; the icon is kept when it is already that one.
 * The box gets the frame of the piece's quality and the green / dark red background of the original bag.
 */
export function setSlotIcon(el: HTMLElement, item: ItemDef | undefined, look: SlotLook = {}): void {
  el.classList.remove('q-purple', 'q-gold', 'q-plat', 'wear-ok', 'wear-no');
  if (item) {
    const q = QUALITY_CLASS[look.quality ?? 0];
    if (q) el.classList.add(q);
    if (look.wearable !== undefined) el.classList.add(look.wearable ? 'wear-ok' : 'wear-no');
  }
  const want = item ? itemIconUrl(item) : '';
  const img = el.querySelector('img');
  if ((img?.getAttribute('src') ?? '') === want) return;
  img?.remove();
  el.classList.toggle('filled', !!item);
  if (!item) return;
  const icon = document.createElement('img');
  icon.src = want;
  icon.alt = item.name;
  icon.draggable = false;
  el.prepend(icon);
}
