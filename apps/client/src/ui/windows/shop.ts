import { knbPurchaseResult } from '../../state/market';
import { KNB_PRICE, BUY_MAX, KIND_NAMES, SHOP_ITEMS, SHOP_NAMES, SMITH_KINDS, moneyText, roomFor, sellPrice, type ItemDef, type ItemKind, type ShopId } from '@vltk/shared';
import { itemViewer } from '../../state/progress';
import { keyLabel } from '../../input/keymap';
import { bagIndexOf, inventory } from '../../state/inventory';
import { trade } from '../../state/trade';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { moneyHtml, setMoney } from '../kit/money';
import { setSlotIcon } from '../kit/slot';
import type { HudContext } from '../hud/context';
import { showItemTip } from '../tips/itemTip';
import type { TradeConfirm } from './tradeConfirm';
import './shop.css';

const ID = 'shop-panel';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Thợ rèn">
  <div id="shop-tabs" class="tabs"></div>
  <label class="check" id="shop-all-row"><input type="checkbox" id="shop-all" /> Hiện cả đồ của giới tính khác</label>
  <div id="shop-list"></div>
  <div id="shop-knb" class="hidden"><p>Kim nguyên bảo: 100 vạn lượng / 1 Kim nguyên bảo</p>
    <label>Số lượng <input type="number" id="shop-knb-count" min="1" max="99" value="1" /></label>
    <button type="button" class="btn" id="shop-buy-knb">Mua Kim nguyên bảo</button></div>
  <div class="shop-foot">
    <div class="trade-modes">
      <button type="button" class="tab" data-mode="buy">Mua</button>
      <button type="button" class="tab" data-mode="sell">Bán</button>
      <button type="button" class="btn sm" id="shop-forge" title="Chọn trang bị, ngũ hành và từng dòng thuộc tính (giá trị tối đa)">Chế tạo</button>
    </div>
    ${moneyHtml('shop-money')}
  </div>
  <div class="muted" id="shop-hint"></div>
</section>`;

/**
 * NPC shops (Thợ rèn: equipment of levels 1–10 by kind + masks; Chủ dược điếm: the original drug store list), like the
 * original 买卖 window: Mua / Bán modes, prices of the original tables, tiền túi at the bottom. Buying goes through the
 * Mua vào box (quantity); in Bán mode a click on a bag item sells it for a quarter of its price. Town only (the server
 * checks). Each buy makes new pieces (their values rolled by the server).
 */
export class ShopWindow {
  private shop: ShopId = 'smith';
  private tab: ItemKind = 'armor';
  private allSexes = false;

  /** `openForge`: Thợ rèn → Chế tạo (windows/forge.ts), on the kind of the current tab. */
  constructor(parent: HTMLElement, private ctx: HudContext, private confirm: TradeConfirm, openForge: (kind: ItemKind) => void) {
    mount(parent, HTML);
    $('shop-buy-knb').addEventListener('click', () => {
      const n = Number($<HTMLInputElement>('shop-knb-count').value);
      if (!Number.isInteger(n) || n < 1 || n > 99) { this.ctx.notice('Số lượng phải từ 1 đến 99.'); return; }
      $<HTMLButtonElement>('shop-buy-knb').disabled = true;
      this.ctx.actions()?.buyKnb(n);
    });
    const knbLabel = () => { const n = Number($<HTMLInputElement>('shop-knb-count').value); $('shop-buy-knb').textContent = `Mua ${n || 0} Kim nguyên bảo · ${moneyText(n * KNB_PRICE)} lượng`; };
    $('shop-knb-count').addEventListener('input', knbLabel); knbLabel();
    knbPurchaseResult.watch(() => { $<HTMLButtonElement>('shop-buy-knb').disabled = false; });
    $('shop-forge').addEventListener('click', () => openForge(this.tab));
    dialogs.register(ID, {
      onClose: () => trade.set({ shop: null, mode: 'buy' }),
    });
    const tabs = $('shop-tabs');
    // Dev builds: hoàng kim môn phái for tests (in play they drop from bosses; the server checks DEV_TOOLS).
    for (const kind of import.meta.env.DEV ? [...SMITH_KINDS, 'gold' as ItemKind] : SMITH_KINDS) {
      const btn = document.createElement('button');
      btn.className = 'tab';
      btn.type = 'button';
      btn.dataset.kind = kind;
      btn.textContent = KIND_NAMES[kind] ?? SHOP_NAMES.gold;
      btn.addEventListener('click', () => { this.tab = kind; this.render(); });
      tabs.appendChild(btn);
    }
    $<HTMLInputElement>('shop-all').addEventListener('change', e => {
      this.allSexes = (e.target as HTMLInputElement).checked;
      this.render();
    });
    document.querySelectorAll<HTMLElement>('#shop-panel .trade-modes .tab').forEach(btn => btn.addEventListener('click', () => {
      trade.set({ shop: this.shop, mode: btn.dataset.mode as 'buy' | 'sell' });
      if (btn.dataset.mode === 'sell') this.ctx.openBag();
    }));
    trade.watch(t => this.renderMode(t.mode));
    inventory.watch(inv => { setMoney($('shop-money'), inv.money); this.renderPrices(); });
  }

  /** Open `shop` (or close it when it is already open and `open` is not given). */
  toggle(shop: ShopId, open?: boolean): void {
    const isOpen = dialogs.isOpen(ID);
    if (open === false || (open === undefined && isOpen && this.shop === shop)) { dialogs.close(ID); return; }
    this.shop = shop;
    $('shop-knb').classList.toggle('hidden', shop !== 'kytran');
    dialogs.setTitle(ID, SHOP_NAMES[shop]);
    trade.set({ shop, mode: 'buy' });
    this.render();
    dialogs.open(ID);
  }

  /** Rows on sale: Thợ rèn by tab and the character's sex (or both), the drug store all of its list. */
  private rows(): ItemDef[] {
    if (this.shop === 'smith' && (this.tab as string) === 'gold') {
      return [...SHOP_ITEMS.gold].sort((a, b) => a.gold!.suite - b.gold!.suite || a.kind.localeCompare(b.kind));
    }
    const all = SHOP_ITEMS[this.shop];
    if (this.shop !== 'smith') return all;
    const sex = this.ctx.self()?.gender === 'female' ? 'f' : 'm';
    return all.filter(it => it.kind === this.tab && (this.allSexes || !it.sex || it.sex === sex))
      .sort((a, b) => a.type - b.type || a.level - b.level);
  }

  render(): void {
    const smith = this.shop === 'smith';
    $('shop-tabs').classList.toggle('hidden', !smith);
    $('shop-all-row').classList.toggle('hidden', !smith);
    $('shop-forge').classList.toggle('hidden', !smith);
    document.querySelectorAll<HTMLElement>('#shop-tabs .tab').forEach(t => t.classList.toggle('on', t.dataset.kind === this.tab));
    const self = this.ctx.self();
    const viewer = itemViewer(self);
    $('shop-list').replaceChildren(...this.rows().map(def => {
      const el = document.createElement('div');
      el.className = 'shop-item';
      const isKnb = !!(def.knbPrice && def.knbPrice > 0);
      el.dataset.price = String(isKnb ? def.knbPrice : def.price);
      el.dataset.currency = isKnb ? 'knb' : 'money';
      el.innerHTML = '<div class="slot"></div><div class="grow"><div class="fname"></div><div class="muted"></div><div class="price"></div></div>';
      setSlotIcon(el.querySelector('.slot') as HTMLElement, def);
      (el.querySelector('.fname') as HTMLElement).textContent = def.name;
      const sub = [def.gold ? `Bộ ${def.gold.suite}` : def.kind === 'mask' || def.kind === 'potion' || def.kind === 'book' || def.kind === 'token' ? '' : `Cấp ${def.level}`, def.sex ? (def.sex === 'm' ? 'Nam' : 'Nữ') : '']
        .filter(Boolean).join(' · ');
      (el.querySelector('.muted') as HTMLElement).textContent = sub;
      (el.querySelector('.price') as HTMLElement).textContent = isKnb ? `${def.knbPrice!.toLocaleString('vi-VN')} KNB` : `${moneyText(def.price)} lượng`;
      el.addEventListener('click', () => this.buy(def));
      el.addEventListener('mouseenter', () => showItemTip(def, el, { viewer, hint: 'Click: mua' }));
      el.addEventListener('mouseleave', () => showItemTip(null));
      return el;
    }));
    this.renderPrices();
  }

  /** Prices the character cannot pay in the original "not enough money" colour. */
  private renderPrices(): void {
    const inv = inventory.get();
    document.querySelectorAll<HTMLElement>('#shop-list .shop-item').forEach(el => {
      const bal = el.dataset.currency === 'knb' ? (inv.knb ?? 0) : inv.money;
      el.classList.toggle('short', Number(el.dataset.price) > bal);
    });
  }

  private renderMode(mode: 'buy' | 'sell'): void {
    document.querySelectorAll<HTMLElement>('#shop-panel .trade-modes .tab').forEach(b => b.classList.toggle('on', b.dataset.mode === mode));
    $(ID).classList.toggle('selling', mode === 'sell');
    $('shop-hint').textContent = mode === 'sell'
      ? `Click vật phẩm trong hành trang (${keyLabel('bag')}) để bán: NPC trả 1/4 giá.`
      : 'Click vật phẩm để mua. Chỉ giao dịch được trong thành.';
  }

  /** Mua vào box: up to BUY_MAX at once, no more than the bag has room for (by size). */
  private buy(def: ItemDef): void {
    if (trade.get().mode !== 'buy') trade.set({ shop: this.shop, mode: 'buy' });
    const free = roomFor(inventory.get().bag, def, BUY_MAX);
    if (!free) { this.ctx.notice('Hành trang không đủ chỗ.'); return; }
    const isKnb = !!(def.knbPrice && def.knbPrice > 0);
    this.confirm.open({
      mode: 'buy', def, unit: isKnb ? def.knbPrice! : def.price, currency: isKnb ? 'knb' : 'money', max: free,
      ok: n => this.ctx.actions()?.buy(def.id, n),
    });
  }
}

/** Bán ra box for bag slot `index` (the bag window calls it while a shop is in Bán mode). */
export function askSell(confirm: TradeConfirm, ctx: HudContext, index: number, def: ItemDef): void {
  confirm.open({
    mode: 'sell', def, unit: sellPrice(def), max: 1,
    // The slot may have changed meanwhile: sell what is there only if it is still that row.
    ok: () => { const i = inventory.get().bag[index]?.def === def.id ? index : bagIndexOf(def.id); if (i >= 0) ctx.actions()?.sell(i); },
  });
}
