import { HORSES, HORSE_IDS, ITEMS, moneyText } from '@vltk/shared';
import { FOOT_X, FOOT_Y, horsePreview, jxSheetUrl } from '../../art/jx';
import { keyLabel } from '../../input/keymap';
import { inventory } from '../../state/inventory';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { moneyHtml, setMoney } from '../kit/money';
import type { HudContext } from '../hud/context';
import { horseSpeedPoints, showItemTip } from '../tips/itemTip';
import type { TradeConfirm } from './tradeConfirm';
import './horseShop.css';
import { assetUrl } from '../../art/assets';

const ID = 'horse-shop';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Bán ngựa">
  <div class="horse-shop">
    <div class="horse-view">
      <div class="horse-preview" id="horse-view"></div>
      <div class="fname" id="horse-view-name"></div>
      <div class="speed" id="horse-view-speed"></div>
      <div class="desc" id="horse-view-desc"></div>
      <div class="price" id="horse-view-price"></div>
      <button type="button" class="btn coins" id="horse-buy">Mua</button>
    </div>
    <div id="horse-list"></div>
  </div>
  <div class="row spread">
    <div class="muted">Ngựa mua về nằm trong hành trang (${keyLabel('bag')}): mặc vào ô Ngựa rồi bấm ${keyLabel('mount')} để cưỡi. Click đúp để mua nhanh.</div>
    ${moneyHtml('horse-money')}
  </div>
</section>`;

/**
 * Bán ngựa (NPC): every horse of the original table with its icon and price; the chosen one drawn at 1:1 on the left.
 * Buying goes through the Mua vào box.
 */
export class HorseShopWindow {
  private pick = HORSE_IDS[0];

  constructor(parent: HTMLElement, private ctx: HudContext, private confirm: TradeConfirm) {
    mount(parent, HTML);
    dialogs.register(ID);
    $('horse-buy').addEventListener('click', () => this.buy(this.pick));
    inventory.watch(inv => { setMoney($('horse-money'), inv.money); this.renderPrice(); });
    $('horse-list').replaceChildren(...HORSE_IDS.map(id => {
      const horse = HORSES[id];
      const cell = document.createElement('div');
      cell.className = 'horse-cell';
      cell.dataset.horse = id;
      cell.innerHTML = '<img alt="" /><span></span>';
      (cell.querySelector('img') as HTMLImageElement).src = assetUrl(`${horse.icon}.webp`);
      (cell.querySelector('span') as HTMLElement).textContent = horse.name;
      cell.addEventListener('click', () => this.choose(id));
      cell.addEventListener('dblclick', () => this.buy(id));
      cell.addEventListener('mouseenter', () => showItemTip(ITEMS[id], cell, { hint: 'Click: xem · Click đúp: mua' }));
      cell.addEventListener('mouseleave', () => showItemTip(null));
      return cell;
    }));
    this.choose(this.pick);
  }

  toggle(open = !dialogs.isOpen(ID)): void {
    if (!open) { dialogs.close(ID); return; }
    dialogs.open(ID);
    fillPreview($('horse-view'), HORSES[this.pick].jxRow);
  }

  private choose(id: string): void {
    const horse = HORSES[id];
    if (!horse) return;
    this.pick = id;
    document.querySelectorAll<HTMLElement>('#horse-list .horse-cell').forEach(c => c.classList.toggle('sel', c.dataset.horse === id));
    $('horse-view-name').textContent = horse.name;
    $('horse-view-speed').textContent = `Tốc độ chạy +${horseSpeedPoints(horse)} (khi cưỡi)`;
    $('horse-view-desc').textContent = horse.desc;
    this.renderPrice();
    // Draw once the window is visible (the preview box needs its size).
    if (dialogs.isOpen(ID)) fillPreview($('horse-view'), horse.jxRow);
    else $('horse-view').dataset.row = '';
  }

  /** Price of the chosen horse, in the "not enough money" colour when it is too dear. */
  private renderPrice(): void {
    const def = ITEMS[this.pick];
    const el = $('horse-view-price');
    el.textContent = `Giá: ${moneyText(def?.price ?? 0)} lượng`;
    el.classList.toggle('short', (def?.price ?? 0) > inventory.get().money);
  }

  private buy(id: string): void {
    const def = ITEMS[id];
    if (def) this.confirm.open({ mode: 'buy', def, unit: def.price, max: 1, ok: () => this.ctx.actions()?.buy(id) });
  }
}

/** Static horse picture built from the three JX horse layers (CSS sprites, first frame, facing west). */
function fillPreview(el: HTMLElement, horseRow: number): void {
  if (el.dataset.row === String(horseRow)) return;
  el.dataset.row = String(horseRow);
  el.replaceChildren();
  if (horseRow < 0) return;
  const box = el.getBoundingClientRect();
  const k = 1, cx = (box.width || 196) / 2, cy = (box.height || 170) - 14; // 1:1, foot point inside the box
  for (const part of horsePreview(horseRow)) {
    const [w, h, bx, by, perDir, dirs, cols] = part.meta;
    const rowsPerDir = Math.ceil(perDir / cols);
    const layer = document.createElement('div');
    Object.assign(layer.style, {
      position: 'absolute',
      left: `${cx + (bx - FOOT_X) * k}px`,
      top: `${cy + (by - FOOT_Y) * k}px`,
      width: `${w * k}px`,
      height: `${h * k}px`,
      backgroundImage: `url(${jxSheetUrl(part.key)})`,
      backgroundSize: `${cols * w * k}px ${dirs * rowsPerDir * h * k}px`,
      backgroundPosition: `0 ${-part.row * rowsPerDir * h * k}px`,
    });
    el.appendChild(layer);
  }
}
