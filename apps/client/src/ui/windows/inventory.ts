import { initMarket, openMarketPost } from './market';
import {
  BAG_CELL_PX, BAG_COLS, BAG_PAGES, BAG_PAGE_SIZE, BAG_ROWS, BAG_SIZE, KIND_SLOTS, STALL_SIZE, TOWN_PORTAL_ID,
  bagCover, bagPage, canWear, equipError, findPlace, fitsAt, itemDef, itemQty,
  itemSize, moneyText, overlappingAt, sellPrice, usableItem, type InventoryMsg, type Item, type ItemViewer,
} from '@vltk/shared';
import { itemViewer, progress } from '../../state/progress';
import { inventory } from '../../state/inventory';
import { ownStallTitle } from '../../state/stall';
import { trade } from '../../state/trade';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { clearGridDropPreview, getActiveGridDrag, gridCellAt, setActiveGridDrag, updateGridDropPreview } from '../kit/itemGrid';
import { moneyHtml, setMoney } from '../kit/money';
import { setSlotIcon } from '../kit/slot';
import { tooltip } from '../kit/tooltip';
import { localPoint } from '../kit/viewport';
import type { HudContext } from '../hud/context';
import { showItemTip } from '../tips/itemTip';
import { askSell } from './shop';
import { TOKEN_ITEM_ID } from '@vltk/shared';
import type { TradeConfirm } from './tradeConfirm';
import './inventory.css';

const ID = 'bag-panel';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Hành trang">
  <div id="bag-tabs" class="bag-tabs">${Array.from({ length: BAG_PAGES }, (_, p) =>
  `<button type="button" class="bag-tab${p ? '' : ' on'}" data-page="${p}">${p + 1}</button>`).join('')}</div>
  <div class="row spread muted"><span id="bag-mode-hint">Vật phẩm</span><span class="row" style="gap:6px"><span id="bag-count"></span><button type="button" class="btn sm" id="bag-sort" title="Sắp xếp gọn lại trang hiện tại">Xếp</button></span></div>
  <div id="bag-grid" style="--cell: ${BAG_CELL_PX}px; --cols: ${BAG_COLS}; --rows: ${BAG_ROWS}"></div>
  <div class="bag-money">${moneyHtml('bag-money')}</div><div id="bag-knb">0 Kim nguyên bảo</div>
  <div class="row bag-actions">
    <button type="button" class="btn sm" id="bag-split" title="Bật rồi click vào chồng vật phẩm để tách (hoặc Shift+Click)">Tách</button>
    <button type="button" class="btn sm" id="bag-throw" title="Bật rồi click vào món để vứt xuống đất (nhặt lại được trong 60 giây)">Vứt</button>
    <button type="button" class="btn sm" id="bag-announce">Rao bán</button>
    <button type="button" class="btn sm" id="bag-sell" title="Bật rồi click vào món để bán (1/4 giá)">Bán</button>
    <button type="button" class="btn sm" id="bag-price" title="Bật rồi click vào món (trang 1–2) để định giá bày bán">Định giá</button>
    <button type="button" class="btn sm" id="bag-stall" title="Mở / Ngưng sạp bày bán tại chỗ">Bày bán</button>
  </div>
  ${import.meta.env.DEV ? '<button type="button" class="btn sm" id="bag-dev-money" title="Dev: cộng 100 vạn lượng">+100 vạn</button>' : ''}
</section>`;

/**
 * Hành trang (I), like the original bag window (ui3/随身物品.ini): the bag (state/inventory.ts) and tiền túi under it; worn
 * items are in the Trang bị và Thuộc tính window (windows/character.ts). The bag is a 6 x 10 grid of 28 px cells
 * where each piece takes its size (items/bag.ts), green when the character can wear / use it, dark red when not, a
 * frame for tím / hoàng kim / bạch kim pieces. Click: wear / use (thuốc); with a shop in Bán mode: sell. Drag a piece to
 * another place of the grid; usable items also onto keys 1–9 (mouse only: touch dragging comes with the mobile UI).
 */
export class InventoryWindow {
  private inv: InventoryMsg = inventory.get();
  /** Page shown: 0 = hành trang, 1–4 = rương mở rộng (items/bag.ts). */
  private page = 0;
  /** Click mode of the bag's own buttons: throw on the ground / sell / price (USER 2026-11-12). */
  private mode: 'none' | 'throw' | 'sell' | 'announce' | 'split' | 'price' = 'none';
  private pendingRender = false;

  constructor(parent: HTMLElement, private ctx: HudContext, private confirm: TradeConfirm) {
    mount(parent, HTML);
    initMarket(parent, ctx);
    $('bag-announce').addEventListener('click', () => this.setMode(this.mode === 'announce' ? 'none' : 'announce'));
    dialogs.register(ID, { onClose: () => this.setMode('none') });
    this.buildBag();
    $('bag-tabs').querySelectorAll<HTMLElement>('.bag-tab').forEach(tab => {
      const page = Number(tab.dataset.page);
      tab.addEventListener('click', () => this.showPage(page));
      // Do NOT switch page on dragover: replacing the grid DOM mid-drag cancels the browser drag session.
      tab.addEventListener('dragover', e => {
        if (!getActiveGridDrag()) return;
        e.preventDefault();
        tab.classList.add('drop-over');
      });
      tab.addEventListener('dragleave', () => tab.classList.remove('drop-over'));
      tab.addEventListener('drop', e => {
        tab.classList.remove('drop-over');
        const drag = getActiveGridDrag();
        if (!drag) return;
        e.preventDefault();
        e.stopPropagation();
        if (drag.source === 'stash') {
          this.ctx.actions()?.stashToBag(drag.index, undefined, page);
          return;
        }
        const from = drag.index;
        const to = findPlace(this.inv.bag, itemDef(this.inv.bag[from]), from, page, BAG_SIZE);
        if (to < 0) this.ctx.notice('Trang này không đủ chỗ.');
        else if (to !== from) this.ctx.actions()?.bagMove(from, to);
      });
    });
    $('bag-sort').addEventListener('click', () => this.ctx.actions()?.bagSort(this.page, 'bag'));
    $('bag-split').addEventListener('click', () => this.setMode(this.mode === 'split' ? 'none' : 'split'));
    $('bag-throw').addEventListener('click', () => this.setMode(this.mode === 'throw' ? 'none' : 'throw'));
    $('bag-sell').addEventListener('click', () => this.setMode(this.mode === 'sell' ? 'none' : 'sell'));
    $('bag-price').addEventListener('click', () => {
      if (this.ctx.self()?.stallTitle) { this.ctx.notice('Hãy ngưng bày bán trước khi sửa giá.'); return; }
      this.setMode(this.mode === 'price' ? 'none' : 'price');
    });
    $('bag-stall').addEventListener('click', () => {
      this.setMode('none');
      if (this.ctx.self()?.stallTitle) this.ctx.actions()?.stallClose();
      else this.onStallOpen?.();
    });
    inventory.watch(inv => {
      this.inv = inv;
      if (getActiveGridDrag()?.source === 'bag') { this.pendingRender = true; return; }
      this.renderBag();
    }, false);
    ownStallTitle.watch(() => this.renderBag(), false);
    // Green / dark red cells follow level and potentials (S2C.stats), not only bag changes.
    // Only when what wearing depends on changed (exp arrives every kill and would redraw the bag mid-drag).
    let wearKey = '', retries = 0;
    progress.watch(p => {
      const key = p ? `${p.progress.level}|${p.stats.str}|${p.stats.dex}|${p.faction}|${p.series}|${this.ctx.self()?.gender ?? ''}` : '';
      if (key !== wearKey) { wearKey = key; this.renderBag(); }
      // Stats may come before the own actor is synced (no viewer yet): draw again once it is there.
      if (p && !this.ctx.self() && retries++ < 20) setTimeout(() => { wearKey = ''; progress.set(progress.get()); }, 500);
      if (this.ctx.self()) retries = 0;
    }, false);
    trade.watch(t => $('bag-grid').classList.toggle('selling', !!t.shop && t.mode === 'sell'));
    if (import.meta.env.DEV) $('bag-dev-money').addEventListener('click', () => this.ctx.actions()?.devMoney(1_000_000));
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
    if (dialogs.isOpen(ID)) this.renderBag(); // wearable colours with the current character
  }

  private showPage(page: number): void {
    if (page === this.page) return;
    this.page = page;
    $('bag-tabs').querySelectorAll<HTMLElement>('.bag-tab').forEach(t => t.classList.toggle('on', Number(t.dataset.page) === page));
    this.renderBag();
  }

  private setMode(mode: 'none' | 'throw' | 'sell' | 'announce' | 'split' | 'price'): void {
    this.mode = mode;
    $('bag-announce').classList.toggle('on', mode === 'announce');
    $('bag-grid').classList.toggle('announcing', mode === 'announce');
    $('bag-split').classList.toggle('on', mode === 'split');
    $('bag-throw').classList.toggle('on', mode === 'throw');
    $('bag-sell').classList.toggle('on', mode === 'sell');
    $('bag-price').classList.toggle('on', mode === 'price');
    $('bag-grid').classList.toggle('throwing', mode === 'throw');
    $('bag-grid').classList.toggle('selling-own', mode === 'sell');
    $('bag-grid').classList.toggle('pricing', mode === 'price');
    $('bag-mode-hint').textContent = mode === 'announce' ? 'Click vào vật phẩm muốn rao bán'
      : mode === 'split' ? 'Click vào chồng vật phẩm muốn tách'
      : mode === 'throw' ? 'Click vào món để vứt xuống đất'
      : mode === 'sell' ? 'Click vào món để bán'
      : mode === 'price' ? 'Click món (trang 1–2) để định giá' : 'Vật phẩm';
  }

  private viewer(): ItemViewer | null {
    const self = this.ctx.self();
    return itemViewer(self);
  }

  private tip(item: Item | null | undefined, el: HTMLElement, hint: string): void {
    showItemTip(itemDef(item), el, { item, viewer: this.viewer(), stallPrice: item?.stallPrice, hint });
  }

  private selling(): boolean {
    const t = trade.get();
    return this.mode === 'sell' || (!!t.shop && t.mode === 'sell');
  }

  /** Bag cell under a point of the grid (for drops), with the grab offset of the dragged piece. */
  private cellAt(e: DragEvent, grab: [number, number]): number {
    return gridCellAt($('bag-grid'), e, grab, this.page);
  }

  private buildBag(): void {
    const grid = $('bag-grid');
    grid.addEventListener('dragover', e => {
      const drag = getActiveGridDrag();
      if (!drag) return;
      e.preventDefault();
      const to = this.cellAt(e, drag.grab);
      const def = drag.source === 'bag' ? itemDef(this.inv.bag[drag.index]) : drag.def;
      if (drag.source === 'stash') {
        const ok = to >= 0 && !!def && fitsAt(this.inv.bag, def, to, -1);
        updateGridDropPreview(grid, to, def, ok);
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        return;
      }
      const hits = to >= 0 ? overlappingAt(this.inv.bag, def, to, drag.index, BAG_SIZE) : null;
      const ok = !!hits && (hits.length === 0 || hits.length === 1);
      updateGridDropPreview(grid, to, def, ok);
      if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? 'move' : 'none';
    });
    grid.addEventListener('dragleave', e => {
      if (!grid.contains(e.relatedTarget as Node | null)) clearGridDropPreview(grid);
    });
    grid.addEventListener('drop', e => {
      clearGridDropPreview(grid);
      const drag = getActiveGridDrag();
      if (!drag) return;
      e.preventDefault();
      const to = this.cellAt(e, drag.grab);
      if (to < 0) return;
      if (drag.source === 'stash') {
        this.ctx.actions()?.stashToBag(drag.index, to);
        return;
      }
      if (to !== drag.index) this.ctx.actions()?.bagMove(drag.index, to);
    });
  }

  /** One element per piece, placed on its cells. */
  private bagPiece(i: number, item: Item): HTMLElement {
    const def = itemDef(item)!;
    const [w, h] = itemSize(def);
    const el = document.createElement('div');
    el.className = 'slot bag-item';
    el.dataset.uid = item.uid;
    const local = i % BAG_PAGE_SIZE;
    el.style.left = `${(local % BAG_COLS) * BAG_CELL_PX}px`;
    el.style.top = `${Math.floor(local / BAG_COLS) * BAG_CELL_PX}px`;
    el.style.width = `${w * BAG_CELL_PX}px`;
    el.style.height = `${h * BAG_CELL_PX}px`;
    const viewer = this.viewer();
    setSlotIcon(el, def, { quality: item.q, wearable: usableItem(def) || !KIND_SLOTS[def.kind].length || canWear(def, viewer), qty: itemQty(item) });
    if (item.stallPrice && item.stallPrice.price > 0 && i < STALL_SIZE) {
      el.classList.add('stall-priced');
      const tag = document.createElement('span');
      tag.className = `stall-price-tag${item.stallPrice.currency === 'knb' ? ' knb' : ''}`;
      tag.textContent = item.stallPrice.currency === 'knb' ? `${item.stallPrice.price} KNB` : moneyText(item.stallPrice.price);
      el.appendChild(tag);
    }
    el.draggable = true;
    // Wear / use: click or right click (USER 2026-11-12, the original uses items with the right button).
    const wearOrUse = () => {
      if (usableItem(def)) { this.useAt(i, def); return; }
      if (!KIND_SLOTS[def.kind].length) { this.ctx.notice(`${def.name} chưa dùng được.`); return; }
      // The viewer now (potentials may have been added since the bag was drawn).
      const now = this.viewer();
      const err = now ? equipError(def, now) : null;
      if (err) { this.ctx.notice(err); return; }
      this.ctx.actions()?.equip(i);
    };
    el.addEventListener('click', e => {
      const qty = itemQty(item);
      if (this.mode === 'split' || (e.shiftKey && qty > 1)) {
        tooltip.hide();
        if (qty <= 1) { this.ctx.notice('Vật phẩm này chỉ có 1 cái, không thể tách.'); return; }
        this.confirm.open({
          mode: 'split', def, unit: 0, max: qty - 1, initial: Math.max(1, Math.floor(qty / 2)),
          ok: count => { this.ctx.actions()?.bagSplit(i, count, 'bag'); if (this.mode === 'split') this.setMode('none'); },
        });
        return;
      }
      if (this.mode === 'announce') {
        tooltip.hide();
        if (item.def === TOKEN_ITEM_ID) { this.ctx.notice('Lệnh bài không thể rao bán.'); return; }
        openMarketPost(item); this.setMode('none'); return;
      }
      if (this.mode === 'price') {
        tooltip.hide();
        if (this.ctx.self()?.stallTitle) { this.ctx.notice('Hãy ngưng bày bán trước khi sửa giá.'); return; }
        if (i >= STALL_SIZE) { this.ctx.notice('Chỉ có thể định giá vật phẩm ở 2 trang đầu Hành trang.'); return; }
        if (item.def === TOKEN_ITEM_ID || item.def === TOWN_PORTAL_ID) { this.ctx.notice('Vật phẩm này không thể bày bán.'); return; }
        this.onStallPrice?.(item);
        return;
      }
      if (this.mode === 'throw') { tooltip.hide(); this.ctx.actions()?.discard(i); return; }
      if (this.selling()) { askSell(this.confirm, this.ctx, i, def); return; }
      wearOrUse();
    });
    el.addEventListener('contextmenu', e => { e.preventDefault(); wearOrUse(); });
    el.addEventListener('dragstart', e => {
      tooltip.hide();
      setActiveGridDrag({ source: 'bag', index: i, grab: localPoint(el, e.clientX, e.clientY), def });
      e.dataTransfer?.setData('text/bag', String(i));
      if (usableItem(def)) e.dataTransfer?.setData('text/item', item.def);
    });
    el.addEventListener('dragend', () => {
      if (getActiveGridDrag()?.source === 'bag') setActiveGridDrag(null);
      if (this.pendingRender) { this.pendingRender = false; this.renderBag(); }
    });
    el.addEventListener('mouseenter', () => {
      const qty = itemQty(item);
      const hint = this.mode === 'split' ? 'Click: tách vật phẩm'
        : this.mode === 'price' ? 'Click: định giá bày bán'
        : this.mode === 'throw' ? 'Click: vứt xuống đất'
        : this.selling() ? `Click: bán (${moneyText(sellPrice(def))} lượng)`
          : qty > 1 ? 'Shift+Click: tách · Kéo đè lên cùng loại: gộp' : '';
      this.tip(item, el, hint);
    });
    el.addEventListener('mouseleave', () => showItemTip(null));
    return el;
  }

  /** Use a usable piece: the lệnh bài opens its menu here, anything else goes to the server. */
  private useAt(i: number, def: { id: string }): void {
    if (def.id === TOKEN_ITEM_ID) { this.onToken?.(); return; }
    this.ctx.actions()?.use(i);
  }

  /** Opens the lệnh bài menu (windows/token.ts), set by the HUD. */
  onToken: (() => void) | null = null;
  /** Opens the price dialog for a bag item (windows/bazaar.ts), set by the HUD. */
  onStallPrice: ((item: Item) => void) | null = null;
  /** Opens the stall title prompt (windows/bazaar.ts), set by the HUD. */
  onStallOpen: (() => void) | null = null;

  private renderBag(): void {
    const stalling = !!ownStallTitle.get();
    const stallBtn = $('bag-stall');
    stallBtn.textContent = stalling ? 'Ngưng bán' : 'Bày bán';
    stallBtn.classList.toggle('on', stalling);
    const pieces: HTMLElement[] = [];
    this.inv.bag.forEach((item, i) => { if (item && itemDef(item) && bagPage(i) === this.page) pieces.push(this.bagPiece(i, item)); });
    // A piece under the mouse is replaced: its mouseleave never comes, so drop its tooltip now.
    if ($('bag-grid').querySelector('.bag-item:hover')) tooltip.hide();
    $('bag-grid').replaceChildren(...pieces);
    const cover = bagCover(this.inv.bag);
    const used = cover.slice(this.page * BAG_PAGE_SIZE, (this.page + 1) * BAG_PAGE_SIZE).filter(c => c >= 0).length;
    $('bag-count').textContent = `${used}/${BAG_PAGE_SIZE} ô`;
    setMoney($('bag-money'), this.inv.money);
    $('bag-knb').textContent = `${(this.inv.knb ?? 0).toLocaleString('vi-VN')} Kim nguyên bảo`;
  }
}
