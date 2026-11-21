import {
  BAG_CELL_PX, MAX_MONEY, STALL_SIZE,
  itemDef, itemQty, itemSize, moneyText,
  type Item, type ItemViewer, type StallDetailMsg, type TradeCurrency,
} from '@vltk/shared';
import { itemViewer } from '../../state/progress';
import { stallClosed, stallDetail } from '../../state/stall';
import type { HudContext } from '../hud/context';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { setSlotIcon } from '../kit/slot';
import { tooltip } from '../kit/tooltip';
import { showItemTip } from '../tips/itemTip';
import type { TradeConfirm } from './tradeConfirm';
import './bazaar.css';

const STALL_ID = 'stall-dlg';
const PRICE_ID = 'stall-price-dlg';
const TITLE_ID = 'stall-title-dlg';
const STALL_GRID_COLS = 10;
const STALL_GRID_ROWS = 12; // 10 cols × 12 rows = 120 cells in 1 single page

const HTML = `
<section id="${STALL_ID}" class="dlg hidden" data-title="Sạp hàng">
  <div id="stall-status" class="stall-status hidden"></div>
  <div class="row spread muted"><span>Chạm / click vật phẩm để mua</span><span id="stall-count"></span></div>
  <div id="stall-grid" style="--cell: ${BAG_CELL_PX}px; --cols: ${STALL_GRID_COLS}; --rows: ${STALL_GRID_ROWS}"></div>
  <div id="stall-note" class="muted stall-note"></div>
</section>

<section id="${PRICE_ID}" class="dlg hidden" data-title="Định giá vật phẩm">
  <div class="stall-form">
    <div id="stall-price-item" class="stall-form-item"></div>
    <div class="stall-cur-row">
      <button type="button" class="btn sm on" id="stall-cur-money">Ngân lượng</button>
      <button type="button" class="btn sm" id="stall-cur-knb">Kim nguyên bảo</button>
    </div>
    <input id="stall-price-input" type="number" inputmode="numeric" min="1" max="${MAX_MONEY}" step="1" placeholder="Nhập giá bán" />
    <div id="stall-price-preview" class="stall-form-preview"></div>
    <div class="stall-form-btns">
      <button type="button" class="btn sm" id="stall-price-ok">Lưu giá</button>
      <button type="button" class="btn sm" id="stall-price-clear">Bỏ giá</button>
      <button type="button" class="btn sm" id="stall-price-cancel">Hủy</button>
    </div>
  </div>
</section>

<section id="${TITLE_ID}" class="dlg hidden" data-title="Bày bán">
  <div class="stall-form">
    <label for="stall-title-input" class="muted">Lời mời chào (1–20 ký tự):</label>
    <input id="stall-title-input" type="text" maxlength="20" placeholder="VD: Bán đồ Hoàng Kim" />
    <div class="stall-form-btns">
      <button type="button" class="btn sm" id="stall-title-ok">Bày bán ngay</button>
      <button type="button" class="btn sm" id="stall-title-cancel">Hủy</button>
    </div>
  </div>
</section>`;

const formatPrice = (price: number, currency: TradeCurrency): string =>
  currency === 'knb' ? `${price.toLocaleString('vi-VN')} KNB` : `${moneyText(price)} lượng`;

export class BazaarWindow {
  private detail: StallDetailMsg | null = null;
  private pricingUid = '';
  private pricingCur: TradeCurrency = 'money';
  private lastTitle = '';
  private mobilePickedUid = '';

  constructor(parent: HTMLElement, private ctx: HudContext, private confirm: TradeConfirm) {
    mount(parent, HTML);
    dialogs.register(STALL_ID, {
      onClose: () => {
        this.mobilePickedUid = '';
        tooltip.hide();
      },
    });
    dialogs.register(PRICE_ID, { onClose: () => { this.pricingUid = ''; } });
    dialogs.register(TITLE_ID);

    this.bindEvents();

    stallDetail.watch(detail => {
      this.detail = detail;
      if (!detail) return;
      if (!dialogs.isOpen(STALL_ID)) dialogs.toggle(STALL_ID, true);
      this.renderStall();
    }, false);

    stallClosed.watch(closed => {
      if (!closed) return;
      if (this.detail && this.detail.charId === closed.charId) {
        this.detail = null;
        if (dialogs.isOpen(STALL_ID)) {
          dialogs.close(STALL_ID);
          if (closed.reason) this.ctx.notice(closed.reason);
        }
      }
    }, false);
  }

  private viewer(): ItemViewer | null {
    return itemViewer(this.ctx.self());
  }

  private bindEvents(): void {
    const setCur = (c: TradeCurrency) => {
      this.pricingCur = c;
      $('stall-cur-money').classList.toggle('on', c === 'money');
      $('stall-cur-knb').classList.toggle('on', c === 'knb');
      this.updatePricePreview();
    };
    $('stall-cur-money').addEventListener('click', () => setCur('money'));
    $('stall-cur-knb').addEventListener('click', () => setCur('knb'));
    const priceInput = $<HTMLInputElement>('stall-price-input');
    priceInput.addEventListener('input', () => this.updatePricePreview());
    priceInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.submitPrice(); });
    $('stall-price-ok').addEventListener('click', () => this.submitPrice());
    $('stall-price-clear').addEventListener('click', () => {
      if (!this.pricingUid) return;
      this.ctx.actions()?.stallPrice(this.pricingUid, 0, this.pricingCur);
      dialogs.close(PRICE_ID);
    });
    $('stall-price-cancel').addEventListener('click', () => dialogs.close(PRICE_ID));

    const titleInput = $<HTMLInputElement>('stall-title-input');
    titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') this.submitOpenStall(); });
    $('stall-title-ok').addEventListener('click', () => this.submitOpenStall());
    $('stall-title-cancel').addEventListener('click', () => dialogs.close(TITLE_ID));
  }

  private renderStall(): void {
    const d = this.detail;
    if (!d) return;
    const dlg = $(STALL_ID);
    dlg.dataset.title = d.title ? `Sạp: ${d.sellerName}` : `Sạp của ${d.sellerName}`;
    const titleEl = dlg.querySelector<HTMLElement>('.dlg-title');
    if (titleEl) titleEl.textContent = dlg.dataset.title;

    const statusEl = $('stall-status');
    statusEl.className = 'stall-status open';
    statusEl.textContent = d.title || 'Đang bày bán';

    $('stall-note').textContent = 'Hover để xem thông tin · Click để mua ngay.';

    const grid = $('stall-grid');
    const pieces: HTMLElement[] = [];
    const occ = new Uint8Array(STALL_GRID_COLS * STALL_GRID_ROWS);
    const placeItem = (w: number, h: number): [number, number] | null => {
      for (let y = 0; y <= STALL_GRID_ROWS - h; y++) {
        for (let x = 0; x <= STALL_GRID_COLS - w; x++) {
          let free = true;
          for (let dy = 0; dy < h && free; dy++) {
            for (let dx = 0; dx < w; dx++) {
              if (occ[(y + dy) * STALL_GRID_COLS + (x + dx)]) { free = false; break; }
            }
          }
          if (!free) continue;
          for (let dy = 0; dy < h; dy++) {
            for (let dx = 0; dx < w; dx++) occ[(y + dy) * STALL_GRID_COLS + (x + dx)] = 1;
          }
          return [x, y];
        }
      }
      return null;
    };
    let count = 0;
    const limit = Math.min(STALL_SIZE, d.items.length);
    for (let i = 0; i < limit; i++) {
      const item = d.items[i];
      const def = item ? itemDef(item) : undefined;
      if (item && def && d.prices[item.uid]?.price > 0) {
        const [w, h] = itemSize(def);
        const pos = placeItem(w, h);
        if (!pos) continue;
        count++;
        pieces.push(this.stallPiece(pos[0], pos[1], item, d));
      }
    }
    if (grid.querySelector('.bag-item:hover')) tooltip.hide();
    grid.replaceChildren(...pieces);
    $('stall-count').textContent = `${count} món đang bán`;
  }

  private stallPiece(col: number, row: number, item: Item, d: StallDetailMsg): HTMLElement {
    const def = itemDef(item)!;
    const [w, h] = itemSize(def);
    const el = document.createElement('div');
    el.className = 'slot bag-item';
    if (this.mobilePickedUid === item.uid) el.classList.add('mobile-picked');
    el.dataset.uid = item.uid;
    el.style.left = `${col * BAG_CELL_PX}px`;
    el.style.top = `${row * BAG_CELL_PX}px`;
    el.style.width = `${w * BAG_CELL_PX}px`;
    el.style.height = `${h * BAG_CELL_PX}px`;

    setSlotIcon(el, def, { quality: item.q, wearable: true, qty: itemQty(item) });

    const price = d.prices[item.uid];
    const badge = document.createElement('span');
    badge.className = `stall-price-tag${price.currency === 'knb' ? ' knb' : ''}`;
    badge.textContent = price.currency === 'knb' ? `${price.price} KNB` : moneyText(price.price);
    el.appendChild(badge);

    el.addEventListener('mouseenter', () => {
      showItemTip(def, el, { item, viewer: this.viewer(), stallPrice: price, hint: 'Click để mua' });
    });
    el.addEventListener('mouseleave', () => showItemTip(null));

    el.addEventListener('click', () => {
      if (window.matchMedia?.('(pointer: coarse)').matches && this.mobilePickedUid !== item.uid) {
        this.mobilePickedUid = item.uid;
        this.renderStall();
        const picked = $('stall-grid').querySelector<HTMLElement>('.mobile-picked');
        if (picked) showItemTip(def, picked, { item, viewer: this.viewer(), stallPrice: price, hint: 'Chạm lần nữa để mua' });
        return;
      }
      this.mobilePickedUid = '';
      tooltip.hide();
      this.confirm.open({
        mode: 'buy',
        def,
        unit: price.price,
        currency: price.currency,
        max: 1,
        ok: () => this.ctx.actions()?.stallBuy(d.charId, item.uid, price.price, price.currency),
      });
    });
    return el;
  }

  /** Called by InventoryWindow when clicking an item in ĐỊNH GIÁ mode. */
  openPriceDialog(item: Item): void {
    const def = itemDef(item);
    const existing = item.stallPrice;
    this.pricingUid = item.uid;
    this.pricingCur = existing?.currency ?? 'money';
    $('stall-price-item').textContent = def?.name ?? item.def;
    $('stall-cur-money').classList.toggle('on', this.pricingCur === 'money');
    $('stall-cur-knb').classList.toggle('on', this.pricingCur === 'knb');
    const input = $<HTMLInputElement>('stall-price-input');
    input.value = existing && existing.price > 0 ? String(existing.price) : '';
    this.updatePricePreview();
    dialogs.toggle(PRICE_ID, true);
    setTimeout(() => input.focus(), 20);
  }

  private updatePricePreview(): void {
    const val = Math.floor(Number($<HTMLInputElement>('stall-price-input').value));
    const el = $('stall-price-preview');
    if (!Number.isSafeInteger(val) || val <= 0) {
      el.textContent = 'Nhập số nguyên dương (hoặc bấm Bỏ giá).';
      return;
    }
    el.textContent = `Giá hiển thị: ${formatPrice(val, this.pricingCur)}`;
  }

  private submitPrice(): void {
    if (!this.pricingUid) return;
    const val = Math.floor(Number($<HTMLInputElement>('stall-price-input').value));
    if (!Number.isSafeInteger(val) || val <= 0 || val > MAX_MONEY) {
      this.ctx.notice('Giá bán phải là số nguyên dương hợp lệ.');
      return;
    }
    this.ctx.actions()?.stallPrice(this.pricingUid, val, this.pricingCur);
    dialogs.close(PRICE_ID);
  }

  /** Called by InventoryWindow when clicking BÀY BÁN. */
  openTitleDialog(): void {
    const input = $<HTMLInputElement>('stall-title-input');
    input.value = this.lastTitle || '';
    dialogs.toggle(TITLE_ID, true);
    setTimeout(() => input.focus(), 20);
  }

  private submitOpenStall(): void {
    const title = $<HTMLInputElement>('stall-title-input').value.trim();
    if (!title) {
      this.ctx.notice('Hãy nhập lời mời chào cho sạp hàng.');
      return;
    }
    this.lastTitle = title;
    this.ctx.actions()?.stallOpen(title);
    dialogs.close(TITLE_ID);
  }
}
