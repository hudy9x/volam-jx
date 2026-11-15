import {
  BAG_CELL_PX, BAG_COLS, BAG_PAGE_SIZE, BAG_ROWS, KIND_SLOTS, STASH_PAGES, STASH_SIZE,
  bagCover, bagPage, canWear, findPlace, itemDef, itemSize, overlappingAt, usableItem,
  type Item, type ItemViewer, type StashMsg,
} from '@vltk/shared';
import { itemViewer, progress } from '../../state/progress';
import { inventory } from '../../state/inventory';
import { stash } from '../../state/stash';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { getActiveGridDrag, gridCellAt, setActiveGridDrag } from '../kit/itemGrid';
import { moneyHtml, setMoney } from '../kit/money';
import { setSlotIcon } from '../kit/slot';
import { tooltip } from '../kit/tooltip';
import { localPoint } from '../kit/viewport';
import type { HudContext } from '../hud/context';
import { showItemTip } from '../tips/itemTip';
import './stash.css';

const ID = 'stash-panel';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Rương chứa đồ">
  <div id="stash-tabs" class="bag-tabs">${Array.from({ length: STASH_PAGES }, (_, p) =>
    `<button type="button" class="bag-tab${p ? '' : ' on'}" data-page="${p}">${p + 1}</button>`).join('')}</div>
  <div class="row spread muted"><span>Dùng chung tài khoản</span><span class="row" style="gap:6px"><span id="stash-count"></span><button type="button" class="btn sm" id="stash-sort" title="Sắp xếp gọn lại trang hiện tại">Xếp</button></span></div>
  <div id="stash-grid" style="--cell: ${BAG_CELL_PX}px; --cols: ${BAG_COLS}; --rows: ${BAG_ROWS}"></div>
  <div class="bag-money">${moneyHtml('stash-money')}</div>
  <div id="stash-knb" class="stash-knb">0 Kim nguyên bảo</div>
  <div class="stash-bank">
    <div class="stash-bank-tabs">
      <button type="button" class="btn sm on" id="stash-cur-money" data-cur="money">Ngân lượng</button>
      <button type="button" class="btn sm" id="stash-cur-knb" data-cur="knb">KNB</button>
    </div>
    <div class="row stash-bank-row">
      <input type="number" id="stash-amount" min="1" step="1" placeholder="Số lượng" />
      <button type="button" class="btn sm" id="stash-deposit" title="Gửi từ hành trang vào rương">Gửi</button>
      <button type="button" class="btn sm" id="stash-withdraw" title="Rút từ rương về hành trang">Rút</button>
    </div>
  </div>
  <div class="muted stash-note">Kéo thả vật phẩm qua lại giữa Hành trang và Rương chứa đồ.</div>
</section>`;

/**
 * Rương chứa đồ (NPC Thủ khố / Rương chứa đồ in town): 3 tabs × 60 cells, shared across all characters of the account.
 */
export class StashWindow {
  private data: StashMsg = stash.get();
  private page = 0;
  private currency: 'money' | 'knb' = 'money';
  private pendingRender = false;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID);
    this.buildGrid();
    $('stash-tabs').querySelectorAll<HTMLElement>('.bag-tab').forEach(tab => {
      const page = Number(tab.dataset.page);
      tab.addEventListener('click', () => this.showPage(page));
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
        if (drag.source === 'bag') {
          this.ctx.actions()?.bagToStash(drag.index, undefined, page);
          return;
        }
        const from = drag.index;
        const to = findPlace(this.data.stash, itemDef(this.data.stash[from]), from, page, STASH_SIZE);
        if (to < 0) this.ctx.notice('Trang rương này không đủ chỗ.');
        else if (to !== from) this.ctx.actions()?.stashMove(from, to);
      });
    });
    $('stash-sort').addEventListener('click', () => this.ctx.actions()?.bagSort(this.page, 'stash'));
    const setCurrency = (c: 'money' | 'knb') => {
      this.currency = c;
      $('stash-cur-money').classList.toggle('on', c === 'money');
      $('stash-cur-knb').classList.toggle('on', c === 'knb');
    };
    $('stash-cur-money').addEventListener('click', () => setCurrency('money'));
    $('stash-cur-knb').addEventListener('click', () => setCurrency('knb'));
    const sendCurrency = (op: 'deposit' | 'withdraw') => {
      const input = $<HTMLInputElement>('stash-amount');
      const raw = Math.floor(Number(input.value));
      const fallback = op === 'deposit'
        ? (this.currency === 'money' ? inventory.get().money : (inventory.get().knb ?? 0))
        : (this.currency === 'money' ? this.data.money : this.data.knb);
      const amount = Number.isFinite(raw) && raw > 0 ? raw : fallback;
      if (!(amount > 0)) {
        this.ctx.notice(op === 'deposit' ? 'Không có số dư để gửi.' : 'Trong rương không có số dư để rút.');
        return;
      }
      this.ctx.actions()?.stashCurrency(op, this.currency, amount);
      input.value = '';
    };
    $('stash-deposit').addEventListener('click', () => sendCurrency('deposit'));
    $('stash-withdraw').addEventListener('click', () => sendCurrency('withdraw'));
    stash.watch(msg => {
      this.data = msg;
      if (getActiveGridDrag()?.source === 'stash') { this.pendingRender = true; return; }
      this.render();
    }, false);
    let wearKey = '';
    progress.watch(p => {
      const key = p ? `${p.progress.level}|${p.stats.str}|${p.stats.dex}|${p.faction}|${p.series}|${this.ctx.self()?.gender ?? ''}` : '';
      if (key !== wearKey) { wearKey = key; if (dialogs.isOpen(ID)) this.render(); }
    }, false);
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
    if (dialogs.isOpen(ID)) {
      this.render();
      this.ctx.openBag();
    }
  }

  private showPage(page: number): void {
    if (page === this.page) return;
    this.page = page;
    $('stash-tabs').querySelectorAll<HTMLElement>('.bag-tab').forEach(t => t.classList.toggle('on', Number(t.dataset.page) === page));
    this.render();
  }

  private viewer(): ItemViewer | null {
    return itemViewer(this.ctx.self());
  }

  private buildGrid(): void {
    const grid = $('stash-grid');
    grid.addEventListener('dragover', e => {
      const drag = getActiveGridDrag();
      if (!drag) return;
      e.preventDefault();
      if (drag.source === 'bag') {
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
        return;
      }
      const to = gridCellAt(grid, e, drag.grab, this.page);
      const def = itemDef(this.data.stash[drag.index]);
      const hits = to >= 0 ? overlappingAt(this.data.stash, def, to, drag.index, STASH_SIZE) : null;
      const ok = !!hits && (hits.length === 0 || hits.length === 1);
      if (e.dataTransfer) e.dataTransfer.dropEffect = ok ? 'move' : 'none';
    });
    grid.addEventListener('drop', e => {
      const drag = getActiveGridDrag();
      if (!drag) return;
      e.preventDefault();
      const to = gridCellAt(grid, e, drag.grab, this.page);
      if (to < 0) return;
      if (drag.source === 'bag') {
        this.ctx.actions()?.bagToStash(drag.index, to);
        return;
      }
      if (to !== drag.index) this.ctx.actions()?.stashMove(drag.index, to);
    });
  }

  private piece(i: number, item: Item): HTMLElement {
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
    setSlotIcon(el, def, { quality: item.q, wearable: usableItem(def) || !KIND_SLOTS[def.kind].length || canWear(def, viewer) });
    el.draggable = true;
    el.addEventListener('dragstart', e => {
      tooltip.hide();
      setActiveGridDrag({ source: 'stash', index: i, grab: localPoint(el, e.clientX, e.clientY) });
      e.dataTransfer?.setData('text/stash', String(i));
    });
    el.addEventListener('dragend', () => {
      if (getActiveGridDrag()?.source === 'stash') setActiveGridDrag(null);
      if (this.pendingRender) { this.pendingRender = false; this.render(); }
    });
    el.addEventListener('mouseenter', () => {
      showItemTip(def, el, { item, viewer: this.viewer(), hint: 'Kéo sang Hành trang để lấy ra' });
    });
    el.addEventListener('mouseleave', () => showItemTip(null));
    return el;
  }

  private render(): void {
    const pieces: HTMLElement[] = [];
    this.data.stash.forEach((item, i) => {
      if (item && itemDef(item) && bagPage(i) === this.page) pieces.push(this.piece(i, item));
    });
    if ($('stash-grid').querySelector('.bag-item:hover')) tooltip.hide();
    $('stash-grid').replaceChildren(...pieces);
    const cover = bagCover(this.data.stash, -1, STASH_SIZE);
    const used = cover.slice(this.page * BAG_PAGE_SIZE, (this.page + 1) * BAG_PAGE_SIZE).filter(c => c >= 0).length;
    $('stash-count').textContent = `${used}/${BAG_PAGE_SIZE} ô`;
    setMoney($('stash-money'), this.data.money ?? 0);
    $('stash-knb').textContent = `${(this.data.knb ?? 0).toLocaleString('vi-VN')} Kim nguyên bảo`;
  }
}

