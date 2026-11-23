import {
  CAMP_COLORS, CAMP_NAMES, ELEMENT_NAMES, FACTIONS, PK_MODE_NAMES, SLOT_NAMES,
  itemDef, portraitFaction, seriesOf, wornActiveCount,
  type Camp, type EquipSlot, type Gender, type InspectResultMsg, type Item,
} from '@vltk/shared';
import { assetUrl } from '../../art/assets';
import { inspectResult } from '../../state/inspect';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { setSlotIcon } from '../kit/slot';
import { showItemTip } from '../tips/itemTip';
import './inspect.css';

const ID = 'inspect-panel';

/** Same 15-slot layout as CharacterWindow (ui3/玩家装备与人物状态_装备.ini). */
const SLOT_BOXES: [EquipSlot, number, number, number, number][] = [
  ['mask', 8, 31, 28, 28], ['helm', 48, 29, 54, 54], ['amulet', 110, 62, 54, 27],
  ['cuff', 8, 75, 28, 54], ['armor', 48, 91, 54, 80], ['weapon', 110, 102, 54, 106],
  ['ring1', 8, 133, 27, 27], ['ring2', 8, 163, 27, 27], ['belt', 48, 178, 54, 28],
  ['pendant', 8, 196, 28, 54], ['boot', 110, 219, 54, 54], ['horse', 48, 221, 54, 80],
  ['mantle', 8, 285, 27, 27], ['signet', 110, 285, 27, 27], ['ornament', 144, 285, 27, 27],
];

const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Thông tin nhân vật">
  <div class="insp-body">
    <div class="insp-info">
      <div class="insp-top">
        <img class="insp-face" id="insp-face" alt="" />
        <div class="insp-id">
          <div class="insp-name" id="insp-name"></div>
          <div class="insp-faction" id="insp-faction"></div>
        </div>
      </div>
      <div class="insp-grid">
        <span class="ca-l">Đẳng cấp</span><span class="ca-v green" id="insp-level"></span>
        <span class="ca-l">Ngũ hành</span><span class="ca-v green" id="insp-series"></span>
        <span class="ca-l">Trận doanh</span><span class="ca-v" id="insp-camp"></span>
        <span class="ca-l">Tài phú</span><span class="ca-v green" id="insp-fortune"></span>
        <span class="ca-l">Chế độ PK</span><span class="ca-v" id="insp-pk"></span>
      </div>
    </div>
    <div class="insp-equip">
      <div id="insp-slots"></div>
    </div>
  </div>
  <div class="insp-foot">
    <button type="button" class="btn" id="insp-close">Đóng</button>
  </div>
</section>`;

/** Read-only character inspection window (name, faction, level, and 15 equipped slots). */
export class InspectWindow {
  private data: InspectResultMsg | null = null;

  constructor(parent: HTMLElement) {
    mount(parent, HTML);
    dialogs.register(ID, { onClose: () => showItemTip(null) });
    $('insp-close').addEventListener('click', () => dialogs.toggle(ID, false));
    this.buildSlots();
    inspectResult.watch(msg => {
      if (!msg) return;
      this.data = msg;
      this.render(msg);
      dialogs.toggle(ID, true);
    }, false);
  }

  private buildSlots(): void {
    const box = $('insp-slots');
    for (const [slot, left, top, w, h] of SLOT_BOXES) {
      const el = document.createElement('div');
      el.className = 'slot';
      el.dataset.slot = slot;
      Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
      el.innerHTML = `<span class="slot-name">${SLOT_NAMES[slot]}</span>`;
      el.addEventListener('mouseenter', () => this.tip(this.data?.equip[slot], el, slot));
      el.addEventListener('click', () => this.tip(this.data?.equip[slot], el, slot));
      el.addEventListener('mouseleave', () => showItemTip(null));
      box.appendChild(el);
    }
  }

  private tip(item: Item | undefined, el: HTMLElement, slot: EquipSlot): void {
    if (!item || !this.data) { showItemTip(null); return; }
    const active = wornActiveCount(this.data.equip, slot, seriesOf(this.data.series));
    showItemTip(itemDef(item), el, { item, active, slot });
  }

  private render(msg: InspectResultMsg): void {
    const camp = (msg.camp || 'new') as Camp;
    const nameEl = $('insp-name');
    nameEl.textContent = msg.name;
    nameEl.style.color = CAMP_COLORS[camp] ?? '#ffffff';

    const fac = msg.faction ? (FACTIONS[msg.faction]?.name ?? msg.faction) : 'Vô môn phái';
    $('insp-faction').textContent = fac;
    $('insp-level').textContent = String(msg.level);
    $('insp-series').textContent = ELEMENT_NAMES[msg.series] ?? msg.series;

    const campEl = $('insp-camp');
    campEl.textContent = CAMP_NAMES[camp] ?? camp;
    campEl.style.color = CAMP_COLORS[camp] ?? '#ffffff';

    $('insp-fortune').textContent = msg.fortune > 0 ? msg.fortune.toLocaleString('vi-VN') : '0';
    $('insp-pk').textContent = PK_MODE_NAMES[msg.pk] ?? PK_MODE_NAMES[0];

    const face = $('insp-face') as HTMLImageElement;
    face.src = assetUrl(`portraits/${portraitFaction(msg.faction, msg.series, msg.gender as Gender)}.webp`);

    document.querySelectorAll<HTMLElement>('#insp-slots .slot').forEach(el => {
      const item = msg.equip[el.dataset.slot as EquipSlot];
      const def = itemDef(item);
      setSlotIcon(el, def, { quality: item?.q, wearable: def ? true : undefined });
    });
  }
}
