import { BUY_MAX, moneyText, type ItemDef } from '@vltk/shared';
import { inventory } from '../../state/inventory';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import './tradeConfirm.css';

const ID = 'trade-dlg';
// Layout of the original buy / sell box (ui3/买卖确认.ini): item name, quantity with + / − (2 digits), price,
// currency, Đồng ý / Hủy. Colours from the same file.
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Mua vào">
  <div class="trade-box">
    <div class="trade-name" id="trade-name"></div>
    <div class="trade-qty" id="trade-qty-row">
      <button type="button" class="btn sm" id="trade-dec" title="Bớt">−</button>
      <input id="trade-qty" type="text" inputmode="numeric" maxlength="2" />
      <button type="button" class="btn sm" id="trade-inc" title="Thêm">+</button>
    </div>
    <div class="trade-price"><span id="trade-price"></span> <span class="trade-cur">lượng</span></div>
    <div class="trade-left muted" id="trade-left"></div>
    <div class="row trade-btns">
      <button type="button" class="btn" id="trade-ok">Đồng ý</button>
      <button type="button" class="btn" id="trade-cancel">Hủy</button>
    </div>
  </div>
</section>`;

export interface TradeAsk {
  mode: 'buy' | 'sell' | 'split';
  def: ItemDef;
  /** Price of one piece (buy: table price; sell: what the NPC pays; split: unused). */
  unit: number;
  /** Most pieces at once (buy: BUY_MAX and the free bag cells; sell: 1; split: curQty - 1). */
  max: number;
  /** Initial quantity (defaults to 1). */
  initial?: number;
  /** Called with the quantity on Đồng ý. */
  ok: (count: number) => void;
}

/** The buy / sell box of the NPC shops (one at a time; Enter = Đồng ý, Esc = Hủy). */
export class TradeConfirm {
  private ask: TradeAsk | null = null;
  private count = 1;

  constructor(parent: HTMLElement) {
    mount(parent, HTML);
    dialogs.register(ID, { onClose: () => { this.ask = null; } });
    const qty = $<HTMLInputElement>('trade-qty');
    qty.addEventListener('input', () => this.setCount(Number(qty.value.replace(/\D/g, '')) || 1, false));
    qty.addEventListener('keydown', e => { if (e.key === 'Enter') this.confirm(); });
    $('trade-dec').addEventListener('click', () => this.setCount(this.count - 1));
    $('trade-inc').addEventListener('click', () => this.setCount(this.count + 1));
    $('trade-ok').addEventListener('click', () => this.confirm());
    $('trade-cancel').addEventListener('click', () => dialogs.close(ID));
    inventory.watch(() => { if (this.ask) this.render(); }, false);
  }

  open(ask: TradeAsk): void {
    this.ask = { ...ask, max: ask.mode === 'split' ? Math.max(1, ask.max) : Math.max(1, Math.min(ask.max, BUY_MAX)) };
    const start = Math.max(1, Math.min(this.ask.max, Math.floor(ask.initial ?? 1)));
    this.count = start;
    $<HTMLInputElement>('trade-qty').maxLength = ask.mode === 'split' ? 4 : 2;
    dialogs.setTitle(ID, ask.mode === 'buy' ? 'Mua vào' : ask.mode === 'sell' ? 'Bán ra' : 'Tách vật phẩm');
    $('trade-qty-row').classList.toggle('hidden', ask.mode === 'sell' || this.ask.max <= 1);
    $('trade-price').parentElement!.classList.toggle('hidden', ask.mode === 'split');
    $('trade-name').textContent = ask.def.name;
    this.setCount(start);
    dialogs.open(ID);
    $('trade-ok').focus();
  }

  private setCount(n: number, writeBox = true): void {
    if (!this.ask) return;
    this.count = Math.max(1, Math.min(this.ask.max, Math.floor(n)));
    if (writeBox) $<HTMLInputElement>('trade-qty').value = String(this.count);
    this.render();
  }

  private render(): void {
    const a = this.ask;
    if (!a) return;
    const total = a.unit * this.count;
    const money = inventory.get().money;
    const short = a.mode === 'buy' && total > money;
    const price = $('trade-price');
    price.textContent = moneyText(total);
    price.classList.toggle('short', short);
    $('trade-left').textContent = a.mode === 'buy'
      ? `Tiền túi: ${moneyText(money)} lượng`
      : a.mode === 'split'
        ? `Tách ${this.count} · Còn lại ${a.max + 1 - this.count}`
        : '';
    $<HTMLButtonElement>('trade-ok').disabled = short;
  }

  private confirm(): void {
    const a = this.ask;
    if (!a || $<HTMLButtonElement>('trade-ok').disabled) return;
    const n = this.count;
    dialogs.close(ID);
    a.ok(n);
  }
}
