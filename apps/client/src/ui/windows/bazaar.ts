import {
  BAG_CELL_PX, BAG_COLS, BAG_PAGE_SIZE, BAG_ROWS, CAMP_COLORS, KIND_SLOTS, MAPS, MAX_MONEY, STALL_PAGES, STALL_SIZE,
  TOKEN_ITEM_ID, TOWN_PORTAL_ID, bagCover, bagPage, canWear, findPlace, fitsAt, itemDef, itemQty, itemSize, moneyText,
  overlappingAt, usableItem, type Camp, type Item, type ItemViewer, type StallDetailMsg, type StallListMsg, type StallPrice,
  type TradeCurrency,
} from '@vltk/shared';
import { itemViewer, progress } from '../../state/progress';
import { stallClosed, stallDetail, stallList } from '../../state/stall';
import type { HudContext } from '../hud/context';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { clearGridDropPreview, getActiveGridDrag, gridCellAt, setActiveGridDrag, updateGridDropPreview } from '../kit/itemGrid';
import { setSlotIcon } from '../kit/slot';
import { tooltip } from '../kit/tooltip';
import { localPoint } from '../kit/viewport';
import { showItemTip } from '../tips/itemTip';
import type { TradeConfirm } from './tradeConfirm';
import './bazaar.css';

const BAZAAR_ID = 'bazaar-dlg';
const STALL_ID = 'stall-dlg';
const PRICE_ID = 'stall-price-dlg';
const TITLE_ID = 'stall-title-dlg';

const HTML = `
<section id="${BAZAAR_ID}" class="dlg hidden" data-title="Chợ thành thị">
  <div class="bazaar-head">
    <input id="bazaar-search" class="bazaar-search" type="text" placeholder="Tìm lời mời chào hoặc người bán…" />
    <button type="button" class="btn sm" id="bazaar-refresh">Làm mới</button>
    <button type="button" class="btn sm" id="bazaar-my-stall">Bày bán</button>
  </div>
  <div id="bazaar-list" class="bazaar-list"></div>
</section>

<section id="${STALL_ID}" class="dlg hidden" data-title="Quầy hàng">
  <div id="stall-status" class="stall-status hidden"></div>
  <div id="stall-tabs" class="bag-tabs">${Array.from({ length: STALL_PAGES }, (_, p) =>
    `<button type="button" class="bag-tab${p ? '' : ' on'}" data-page="${p}">Quầy ${p + 1}</button>`).join('')}</div>
  <div class="row spread muted"><span id="stall-mode-hint">Vật phẩm</span><span id="stall-count"></span></div>
  <div id="stall-grid" style="--cell: ${BAG_CELL_PX}px; --cols: ${BAG_COLS}; --rows: ${BAG_ROWS}"></div>
  <div id="stall-owner-actions" class="stall-actions hidden">
    <button type="button" class="btn sm" id="stall-put-mode" title="Bật rồi click vật phẩm trong Hành trang để đặt vào quầy">Đặt đồ</button>
    <button type="button" class="btn sm" id="stall-price-mode" title="Bật rồi click vật phẩm trong quầy để định giá">Định giá</button>
    <button type="button" class="btn sm" id="stall-open-btn">Bày bán ngay</button>
    <button type="button" class="btn sm hidden" id="stall-close-btn">Ngưng bày bán</button>
  </div>
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

<section id="${TITLE_ID}" class="dlg hidden" data-title="Lời mời chào">
  <div class="stall-form">
    <div class="muted" style="font-size:12px">Nhập lời rao bán hiển thị trong danh sách Chợ (tối đa 48 ký tự):</div>
    <input id="stall-title-input" type="text" maxlength="48" placeholder="VD: Bán đồ Hoàng Kim giá rẻ" />
    <div class="stall-form-btns">
      <button type="button" class="btn sm" id="stall-title-ok">Bày bán ngay</button>
      <button type="button" class="btn sm" id="stall-title-cancel">Hủy</button>
    </div>
  </div>
</section>`;

export class BazaarWindow {
  private listData: StallListMsg = stallList.get();
  private detail: StallDetailMsg | null = null;
  private page = 0;
  private ownerMode: 'none' | 'put' | 'price' = 'none';
  private pricingUid: string | null = null;
  private pricingCur: TradeCurrency = 'money';
  private pendingRender = false;
  private mobilePickedUid: string | null = null;
  /** Opens Hành trang next to Quầy hàng when editing own stall (set by HUD). */
  onOpenBag: (() => void) | null = null;

  constructor(parent: HTMLElement, private ctx: HudContext, private confirm: TradeConfirm) {
    mount(parent, HTML);
    dialogs.register(BAZAAR_ID);
    dialogs.register(STALL_ID, {
      onClose: () => {
        this.setOwnerMode('none');
        this.mobilePickedUid = null;
        tooltip.hide();
      },
    });
    dialogs.register(PRICE_ID, { onClose: () => { this.pricingUid = null; } });
    dialogs.register(TITLE_ID);

    this.bindBazaar();
    this.bindStall();
    this.bindForms();

    stallList.watch(data => {
      this.listData = data;
      if (dialogs.isOpen(BAZAAR_ID)) this.renderList();
    }, false);
    stallDetail.watch(detail => {
      if (!detail) return;
      this.detail = detail;
      if (!dialogs.isOpen(STALL_ID)) {
        this.page = 0;
        this.updateTabs();
        dialogs.open(STALL_ID);
        if (detail.isOwner && !detail.open) this.onOpenBag?.();
      }
      if (detail.open) this.setOwnerMode('none');
      if (getActiveGridDrag()?.source === 'stall') { this.pendingRender = true; return; }
      this.renderStall();
    }, false);
    stallClosed.watch(closed => {
      if (!closed) return;
      if (this.detail && !this.detail.isOwner && this.detail.charId === closed.charId && dialogs.isOpen(STALL_ID)) {
        dialogs.close(STALL_ID);
        this.ctx.notice(closed.reason || 'Gian hàng đã đóng.');
      }
      if (dialogs.isOpen(BAZAAR_ID)) this.ctx.actions()?.stallList();
    }, false);
    progress.watch(() => { if (dialogs.isOpen(STALL_ID) && this.detail) this.renderStall(); }, false);
  }

  toggle(open?: boolean): void {
    const want = open ?? !dialogs.isOpen(BAZAAR_ID);
    if (!want) {
      dialogs.close(BAZAAR_ID);
      return;
    }
    const meta = this.ctx.meta?.() ?? null;
    if (!meta?.safe) {
      this.ctx.notice('Chỉ có thể mở Chợ khi đang ở trong thành thị.');
      return;
    }
    dialogs.setTitle(BAZAAR_ID, `Chợ — ${meta.name}`);
    dialogs.open(BAZAAR_ID);
    this.ctx.actions()?.stallList();
    this.renderList();
  }

  /** Called by InventoryWindow when clicking a bag item; consumes the click if owner is in Put mode. */
  handleBagClick(index: number, item: Item): boolean {
    if (!dialogs.isOpen(STALL_ID) || !this.detail?.isOwner || this.detail.open || this.ownerMode !== 'put') return false;
    if (item.def === TOKEN_ITEM_ID || item.def === TOWN_PORTAL_ID) {
      this.ctx.notice('Vật phẩm này không thể bày bán.');
      return true;
    }
    this.ctx.actions()?.stallPut(index, undefined, this.page);
    return true;
  }

  private bindBazaar(): void {
    $('bazaar-search').addEventListener('input', () => this.renderList());
    $('bazaar-refresh').addEventListener('click', () => this.ctx.actions()?.stallList());
    $('bazaar-my-stall').addEventListener('click', () => this.ctx.actions()?.stallInspect(''));
  }

  private bindStall(): void {
    $('stall-tabs').querySelectorAll<HTMLElement>('.bag-tab').forEach(tab => {
      const page = Number(tab.dataset.page);
      tab.addEventListener('click', () => {
        if (page === this.page) return;
        this.page = page;
        this.updateTabs();
        this.renderStall();
      });
      tab.addEventListener('dragover', e => {
        if (!this.canEdit() || !getActiveGridDrag()) return;
        e.preventDefault();
        tab.classList.add('drop-over');
      });
      tab.addEventListener('dragleave', () => tab.classList.remove('drop-over'));
      tab.addEventListener('drop', e => {
        tab.classList.remove('drop-over');
        if (!this.canEdit()) return;
        const drag = getActiveGridDrag();
        if (!drag || !this.detail) return;
        e.preventDefault();
        e.stopPropagation();
        if (drag.source === 'bag') {
          this.ctx.actions()?.stallPut(drag.index, undefined, page);
          return;
        }
        if (drag.source === 'stall') {
          const from = drag.index;
          const to = findPlace(this.detail.items, itemDef(this.detail.items[from]), from, page, STALL_SIZE);
          if (to < 0) this.ctx.notice('Tab quầy hàng này không đủ chỗ.');
          else if (to !== from) this.ctx.actions()?.stallMove(from, to);
        }
      });
    });

    const grid = $('stall-grid');
    grid.addEventListener('dragover', e => {
      if (!this.canEdit() || !this.detail) return;
      const drag = getActiveGridDrag();
      if (!drag || (drag.source !== 'bag' && drag.source !== 'stall')) return;
      e.preventDefault();
      const to = gridCellAt(grid, e, drag.grab, this.page);
      const def = drag.source === 'stall' ? itemDef(this.detail.items[drag.index]) : drag.def;
      if (drag.source === 'bag') {
        const ok = to >= 0 && !!def && fitsAt(this.detail.items, def, to, -1);
        updateGridDropPreview(grid, to, def, ok);
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        return;
      }
      const hits = to >= 0 ? overlappingAt(this.detail.items, def, to, drag.index, STALL_SIZE) : null;
      const ok = !!hits && (hits.length === 0 || hits.length === 1);
      updateGridDropPreview(grid, to, def, ok);
      if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? 'move' : 'none';
    });
    grid.addEventListener('dragleave', e => {
      if (!grid.contains(e.relatedTarget as Node | null)) clearGridDropPreview(grid);
    });
    grid.addEventListener('drop', e => {
      clearGridDropPreview(grid);
      if (!this.canEdit()) return;
      const drag = getActiveGridDrag();
      if (!drag) return;
      e.preventDefault();
      const to = gridCellAt(grid, e, drag.grab, this.page);
      if (to < 0) return;
      if (drag.source === 'bag') {
        this.ctx.actions()?.stallPut(drag.index, to);
      } else if (drag.source === 'stall' && to !== drag.index) {
        this.ctx.actions()?.stallMove(drag.index, to);
      }
    });

    $('stall-put-mode').addEventListener('click', () => this.setOwnerMode(this.ownerMode === 'put' ? 'none' : 'put'));
    $('stall-price-mode').addEventListener('click', () => this.setOwnerMode(this.ownerMode === 'price' ? 'none' : 'price'));
    $('stall-open-btn').addEventListener('click', () => this.openTitlePrompt());
    $('stall-close-btn').addEventListener('click', () => this.ctx.actions()?.stallClose());
  }

  private bindForms(): void {
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

  private canEdit(): boolean {
    return !!this.detail?.isOwner && !this.detail.open;
  }

  private setOwnerMode(mode: 'none' | 'put' | 'price'): void {
    this.ownerMode = mode;
    $('stall-put-mode').classList.toggle('on', mode === 'put');
    $('stall-price-mode').classList.toggle('on', mode === 'price');
    $('stall-grid').classList.toggle('pricing', mode === 'price');
    $('stall-mode-hint').textContent = mode === 'put' ? 'Click món trong Hành trang để đặt vào quầy'
      : mode === 'price' ? 'Click món trong quầy để định giá'
      : this.detail?.isOwner ? (this.detail.open ? 'Đang bày bán' : 'Quầy hàng của bạn') : 'Chọn vật phẩm để mua';
  }

  private updateTabs(): void {
    $('stall-tabs').querySelectorAll<HTMLElement>('.bag-tab')
      .forEach(t => t.classList.toggle('on', Number(t.dataset.page) === this.page));
  }

  private renderList(): void {
    const meta = this.ctx.meta?.() ?? null;
    const mapName = meta?.name ?? MAPS[this.listData.mapId]?.name ?? 'Thành thị';
    dialogs.setTitle(BAZAAR_ID, `Chợ — ${mapName}`);

    const mine = this.listData.myStall;
    const myBtn = $('bazaar-my-stall');
    myBtn.textContent = mine?.open ? 'Quầy của tôi (Đang bán)' : mine && mine.itemCount > 0 ? 'Quầy của tôi' : 'Bày bán';

    const query = $<HTMLInputElement>('bazaar-search').value.trim().toLowerCase();
    const rows = this.listData.stalls.filter(s =>
      !query || s.title.toLowerCase().includes(query) || s.sellerName.toLowerCase().includes(query),
    );
    const listEl = $('bazaar-list');
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'bazaar-empty';
      empty.textContent = query ? 'Không tìm thấy gian hàng phù hợp.' : `Hiện chưa có gian hàng nào bày bán tại ${mapName}.`;
      listEl.replaceChildren(empty);
      return;
    }
    listEl.replaceChildren(...rows.map(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'bazaar-row';
      const main = document.createElement('div');
      main.className = 'bazaar-row-main';
      const title = document.createElement('div');
      title.className = 'bazaar-row-title';
      title.textContent = s.title;
      const seller = document.createElement('div');
      seller.className = 'bazaar-row-seller';
      seller.textContent = s.sellerName;
      seller.style.color = CAMP_COLORS[(s.sellerCamp || 'new') as Camp] ?? '#ffffff';
      main.append(title, seller);
      const count = document.createElement('span');
      count.className = 'bazaar-row-count';
      count.textContent = `${s.itemCount} món`;
      btn.append(main, count);
      btn.addEventListener('click', () => this.ctx.actions()?.stallInspect(s.charId));
      return btn;
    }));
  }

  private viewer(): ItemViewer | null {
    return itemViewer(this.ctx.self());
  }

  private renderStall(): void {
    const d = this.detail;
    if (!d) return;
    const mapName = MAPS[d.mapId]?.name ?? `Thành #${d.mapId}`;
    dialogs.setTitle(STALL_ID, d.isOwner ? `Quầy hàng của tôi (${mapName})` : `${d.title} — ${d.sellerName}`);

    const statusEl = $('stall-status');
    if (d.isOwner) {
      statusEl.classList.remove('hidden');
      statusEl.classList.toggle('open', d.open);
      statusEl.textContent = d.open
        ? `Đang bày bán: "${d.title}"`
        : 'Chưa mở bán · Đặt đồ từ Hành trang, định giá rồi bấm Bày bán ngay.';
    } else {
      statusEl.classList.add('hidden');
    }

    const actionsEl = $('stall-owner-actions');
    actionsEl.classList.toggle('hidden', !d.isOwner);
    $('stall-put-mode').classList.toggle('hidden', d.open);
    $('stall-price-mode').classList.toggle('hidden', d.open);
    $('stall-open-btn').classList.toggle('hidden', d.open);
    $('stall-close-btn').classList.toggle('hidden', !d.open);

    $('stall-note').textContent = d.isOwner
      ? (d.open ? 'Bấm Ngưng bày bán để chỉnh giá hoặc rút đồ về Hành trang.' : 'Kéo thả đồ qua lại Hành trang ↔ Quầy, hoặc bật nút Đặt đồ để click nhanh.')
      : 'Rê chuột xem thuộc tính & giá bán · Click vào món để mua.';

    this.setOwnerMode(d.isOwner && !d.open ? this.ownerMode : 'none');

    const grid = $('stall-grid');
    if (grid.querySelector('.bag-item:hover')) tooltip.hide();
    const pieces: HTMLElement[] = [];
    d.items.forEach((item, i) => {
      if (item && itemDef(item) && bagPage(i) === this.page) pieces.push(this.stallPiece(i, item, d));
    });
    grid.replaceChildren(...pieces);
    const cover = bagCover(d.items, -1, STALL_SIZE);
    const used = cover.slice(this.page * BAG_PAGE_SIZE, (this.page + 1) * BAG_PAGE_SIZE).filter(c => c >= 0).length;
    $('stall-count').textContent = `${used}/${BAG_PAGE_SIZE} ô`;
  }

  private stallPiece(i: number, item: Item, d: StallDetailMsg): HTMLElement {
    const def = itemDef(item)!;
    const [w, h] = itemSize(def);
    const el = document.createElement('div');
    const price = d.prices[item.uid];
    el.className = 'slot bag-item';
    if (this.mobilePickedUid === item.uid) el.classList.add('mobile-picked');
    const local = i % BAG_PAGE_SIZE;
    el.style.left = `${(local % BAG_COLS) * BAG_CELL_PX}px`;
    el.style.top = `${Math.floor(local / BAG_COLS) * BAG_CELL_PX}px`;
    el.style.width = `${w * BAG_CELL_PX}px`;
    el.style.height = `${h * BAG_CELL_PX}px`;
    const viewer = this.viewer();
    setSlotIcon(el, def, {
      quality: item.q,
      wearable: usableItem(def) || !KIND_SLOTS[def.kind].length || canWear(def, viewer),
      qty: itemQty(item),
    });
    if (price && price.price > 0) {
      const check = document.createElement('span');
      check.className = 'stall-checked';
      check.setAttribute('aria-label', 'Đã định giá');
      check.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.5l2.6 2.6L10 3.2"/></svg>';
      el.appendChild(check);
    }

    const editable = d.isOwner && !d.open;
    el.draggable = editable;
    el.addEventListener('dragstart', e => {
      if (!editable) return;
      tooltip.hide();
      setActiveGridDrag({ source: 'stall', index: i, grab: localPoint(el, e.clientX, e.clientY), def });
      e.dataTransfer?.setData('text/stall', String(i));
    });
    el.addEventListener('dragend', () => {
      if (getActiveGridDrag()?.source === 'stall') setActiveGridDrag(null);
      if (this.pendingRender) { this.pendingRender = false; this.renderStall(); }
    });

    el.addEventListener('mouseenter', () => {
      const hint = d.isOwner
        ? (d.open ? 'Đang bày bán' : this.ownerMode === 'price' ? 'Click: định giá vật phẩm' : 'Click: rút về Hành trang · Kéo để sắp xếp')
        : 'Click: mua vật phẩm';
      showItemTip(def, el, { item, viewer: this.viewer(), stallPrice: price, hint });
    });
    el.addEventListener('mouseleave', () => showItemTip(null));

    el.addEventListener('click', () => {
      if (d.isOwner) {
        if (d.open) {
          this.ctx.notice('Đang bày bán: bấm Ngưng bày bán để chỉnh sửa.');
          return;
        }
        tooltip.hide();
        if (this.ownerMode === 'price') {
          this.openPricePrompt(item, price);
        } else {
          this.ctx.actions()?.stallTake(i);
        }
        return;
      }
      if (!price || price.price <= 0) return;
      // On touch devices (no hover), tap 1 shows tooltip + price, tap 2 opens confirm dialog.
      const isTouch = window.matchMedia?.('(hover: none)').matches;
      if (isTouch && this.mobilePickedUid !== item.uid) {
        this.mobilePickedUid = item.uid;
        this.renderStall();
        const picked = $('stall-grid').querySelector<HTMLElement>('.mobile-picked');
        if (picked) showItemTip(def, picked, { item, viewer: this.viewer(), stallPrice: price, hint: 'Chạm lần nữa để mua' });
        return;
      }
      this.mobilePickedUid = null;
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

  private openPricePrompt(item: Item, existing?: StallPrice): void {
    const def = itemDef(item);
    this.pricingUid = item.uid;
    this.pricingCur = existing?.currency ?? 'money';
    $('stall-price-item').textContent = def?.name ?? item.def;
    $('stall-cur-money').classList.toggle('on', this.pricingCur === 'money');
    $('stall-cur-knb').classList.toggle('on', this.pricingCur === 'knb');
    const input = $<HTMLInputElement>('stall-price-input');
    input.value = existing?.price ? String(existing.price) : '';
    this.updatePricePreview();
    dialogs.open(PRICE_ID);
    input.focus();
  }

  private updatePricePreview(): void {
    const val = Math.floor(Number($<HTMLInputElement>('stall-price-input').value));
    const el = $('stall-price-preview');
    if (!Number.isSafeInteger(val) || val <= 0) {
      el.textContent = '';
      return;
    }
    el.textContent = this.pricingCur === 'knb'
      ? `= ${val.toLocaleString('vi-VN')} Kim nguyên bảo`
      : `= ${moneyText(val)} lượng`;
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

  private openTitlePrompt(): void {
    const d = this.detail;
    if (!d || !d.isOwner) return;
    const items = d.items.filter((it): it is Item => !!it);
    if (!items.length) {
      this.ctx.notice('Hãy đặt ít nhất 1 vật phẩm vào quầy trước khi bày bán.');
      return;
    }
    const unpriced = items.filter(it => !(d.prices[it.uid]?.price > 0));
    if (unpriced.length) {
      this.ctx.notice(`Còn ${unpriced.length} vật phẩm chưa định giá. Hãy định giá hoặc rút ra trước khi bày bán.`);
      return;
    }
    const input = $<HTMLInputElement>('stall-title-input');
    input.value = d.title || '';
    dialogs.open(TITLE_ID);
    input.focus();
  }

  private submitOpenStall(): void {
    const title = $<HTMLInputElement>('stall-title-input').value.trim();
    if (!title) {
      this.ctx.notice('Vui lòng nhập lời mời chào.');
      return;
    }
    this.ctx.actions()?.stallOpen(title);
    dialogs.close(TITLE_ID);
  }
}
