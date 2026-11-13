import {
  BAG_CELL_PX, BAG_COLS, BAG_PAGES, BAG_PAGE_SIZE, BAG_ROWS, KIND_SLOTS, bagCover, bagPage, canWear, equipError, findPlace, fitsAt, itemDef,
  itemSize, moneyText,
  sellPrice, usableItem, type InventoryMsg, type Item, type ItemViewer,
} from '@vltk/shared';
import { itemViewer, progress } from '../../state/progress';
import { inventory } from '../../state/inventory';
import { trade } from '../../state/trade';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { moneyHtml, setMoney } from '../kit/money';
import { setSlotIcon } from '../kit/slot';
import { tooltip } from '../kit/tooltip';
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
    `<button type="button" class="bag-tab${p ? '' : ' on'}" data-page="${p}">${p ? `Rương ${p}` : 'Túi'}</button>`).join('')}</div>
  <div class="row spread muted"><span id="bag-mode-hint">Vật phẩm</span><span id="bag-count"></span></div>
  <div id="bag-grid" style="--cell: ${BAG_CELL_PX}px; --cols: ${BAG_COLS}; --rows: ${BAG_ROWS}"></div>
  <div class="bag-money">${moneyHtml('bag-money')}</div>
  <div class="row bag-actions">
    <button type="button" class="btn sm" id="bag-throw" title="Bật rồi click vào món để vứt xuống đất (nhặt lại được trong 60 giây)">Vứt</button>
    <button type="button" class="btn sm" id="bag-sell" title="Bật rồi click vào món để bán (1/4 giá)">Bán</button>
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
  /** Click mode of the bag's own buttons: throw on the ground / sell (USER 2026-11-12). */
  private mode: 'none' | 'throw' | 'sell' = 'none';

  constructor(parent: HTMLElement, private ctx: HudContext, private confirm: TradeConfirm) {
    mount(parent, HTML);
    dialogs.register(ID, { onClose: () => this.setMode('none') });
    this.buildBag();
    $('bag-tabs').querySelectorAll<HTMLElement>('.bag-tab').forEach(tab => {
      const page = Number(tab.dataset.page);
      tab.addEventListener('click', () => this.showPage(page));
      // Drop a piece on a tab: it goes to the first place it fits in that page.
      tab.addEventListener('dragover', e => { if (this.dragging >= 0) { e.preventDefault(); this.showPage(page); } });
    });
    $('bag-throw').addEventListener('click', () => this.setMode(this.mode === 'throw' ? 'none' : 'throw'));
    $('bag-sell').addEventListener('click', () => this.setMode(this.mode === 'sell' ? 'none' : 'sell'));
    inventory.watch(inv => { this.inv = inv; this.renderBag(); }, false);
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

  private setMode(mode: 'none' | 'throw' | 'sell'): void {
    this.mode = mode;
    $('bag-throw').classList.toggle('on', mode === 'throw');
    $('bag-sell').classList.toggle('on', mode === 'sell');
    $('bag-grid').classList.toggle('throwing', mode === 'throw');
    $('bag-grid').classList.toggle('selling-own', mode === 'sell');
    $('bag-mode-hint').textContent = mode === 'throw' ? 'Click vào món để vứt xuống đất' : mode === 'sell' ? 'Click vào món để bán' : 'Vật phẩm';
  }

  private viewer(): ItemViewer | null {
    const self = this.ctx.self();
    return itemViewer(self);
  }

  private tip(item: Item | null | undefined, el: HTMLElement, hint: string): void {
    showItemTip(itemDef(item), el, { item, viewer: this.viewer(), hint });
  }

  private selling(): boolean {
    const t = trade.get();
    return this.mode === 'sell' || (!!t.shop && t.mode === 'sell');
  }

  /** Bag cell under a point of the grid (for drops), with the grab offset of the dragged piece. */
  private cellAt(e: DragEvent): number {
    const r = $('bag-grid').getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - this.grab[0]) / BAG_CELL_PX + 0.5);
    const y = Math.floor((e.clientY - r.top - this.grab[1]) / BAG_CELL_PX + 0.5);
    return x < 0 || y < 0 || x >= BAG_COLS || y >= BAG_ROWS ? -1 : this.page * BAG_PAGE_SIZE + y * BAG_COLS + x;
  }

  /** Bag index being dragged inside the grid and where in the piece it was grabbed (px). */
  private dragging = -1;
  private grab: [number, number] = [0, 0];

  private buildBag(): void {
    const grid = $('bag-grid');
    grid.addEventListener('dragover', e => {
      if (this.dragging < 0) return;
      e.preventDefault();
      const to = this.cellAt(e);
      const ok = to >= 0 && fitsAt(this.inv.bag, itemDef(this.inv.bag[this.dragging]), to, this.dragging);
      if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? 'move' : 'none';
    });
    $('bag-tabs').addEventListener('drop', e => {
      if (this.dragging < 0) return;
      e.preventDefault();
      const from = this.dragging;
      const to = findPlace(this.inv.bag, itemDef(this.inv.bag[from]), from, this.page);
      if (to < 0) this.ctx.notice('Rương này không đủ chỗ.');
      else if (to !== from) this.ctx.actions()?.bagMove(from, to);
    });
    grid.addEventListener('drop', e => {
      if (this.dragging < 0) return;
      e.preventDefault();
      const from = this.dragging, to = this.cellAt(e);
      if (to >= 0 && to !== from && fitsAt(this.inv.bag, itemDef(this.inv.bag[from]), to, from)) this.ctx.actions()?.bagMove(from, to);
    });
  }

  /** One element per piece, placed on its cells. */
  private bagPiece(i: number, item: Item): HTMLElement {
    const def = itemDef(item)!;
    const [w, h] = itemSize(def);
    const el = document.createElement('div');
    el.className = 'slot bag-item';
    const local = i % BAG_PAGE_SIZE;
    el.style.left = `${(local % BAG_COLS) * BAG_CELL_PX}px`;
    el.style.top = `${Math.floor(local / BAG_COLS) * BAG_CELL_PX}px`;
    el.style.width = `${w * BAG_CELL_PX}px`;
    el.style.height = `${h * BAG_CELL_PX}px`;
    const viewer = this.viewer();
    setSlotIcon(el, def, { quality: item.q, wearable: usableItem(def) || !KIND_SLOTS[def.kind].length || canWear(def, viewer) });
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
    el.addEventListener('click', () => {
      if (this.mode === 'throw') { tooltip.hide(); this.ctx.actions()?.discard(i); return; }
      if (this.selling()) { askSell(this.confirm, this.ctx, i, def); return; }
      wearOrUse();
    });
    el.addEventListener('contextmenu', e => { e.preventDefault(); wearOrUse(); });
    el.addEventListener('dragstart', e => {
      tooltip.hide();
      this.dragging = i;
      const r = el.getBoundingClientRect();
      this.grab = [e.clientX - r.left, e.clientY - r.top];
      e.dataTransfer?.setData('text/bag', String(i));
      if (usableItem(def)) e.dataTransfer?.setData('text/item', item.def);
    });
    el.addEventListener('dragend', () => { this.dragging = -1; });
    el.addEventListener('mouseenter', () => {
      const hint = this.mode === 'throw' ? 'Click: vứt xuống đất'
        : this.selling() ? `Click: bán (${moneyText(sellPrice(def))} lượng)`
        : '';
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

  private renderBag(): void {
    const pieces: HTMLElement[] = [];
    this.inv.bag.forEach((item, i) => { if (item && itemDef(item) && bagPage(i) === this.page) pieces.push(this.bagPiece(i, item)); });
    // A piece under the mouse is replaced: its mouseleave never comes, so drop its tooltip now.
    if ($('bag-grid').querySelector('.bag-item:hover')) tooltip.hide();
    $('bag-grid').replaceChildren(...pieces);
    const cover = bagCover(this.inv.bag);
    const used = cover.slice(this.page * BAG_PAGE_SIZE, (this.page + 1) * BAG_PAGE_SIZE).filter(c => c >= 0).length;
    $('bag-count').textContent = `${used}/${BAG_PAGE_SIZE} ô`;
    setMoney($('bag-money'), this.inv.money);
  }
}
