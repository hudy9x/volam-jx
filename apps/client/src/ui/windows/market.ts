import { itemDef, moneyText, CHAT, type Item, type ChatLine, type TradeCurrency } from '@vltk/shared';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { setSlotIcon } from '../kit/slot';
import { fillItemTip } from '../tips/itemTip';
import { marketResult } from '../../state/market';
import type { HudContext } from '../hud/context';
import './market.css';
let ctx: HudContext;
let currentItem: Item | null = null, currentLine: ChatLine | null = null;
export function initMarket(parent: HTMLElement, context: HudContext): void {
  ctx = context;
  if (document.getElementById('market-dialog')) return;
  mount(parent, `<section class="dlg hidden" id="market-dialog" data-title="Mua bán vật phẩm">
    <div id="market-icon" class="slot"></div><div class="item-tip" id="market-preview"></div>
    <form id="market-form">
      <label>Hình thức <select id="market-currency"><option value="money">Ngân lượng</option><option value="knb">Kim nguyên bảo</option></select></label>
      <label id="market-price-row">Giá <input id="market-price" type="number" min="1" max="2000000000" step="1" required value="1" /></label>
      <label>Lời rao <input id="market-text" maxlength="${CHAT.maxLength}" placeholder="Mô tả thêm về vật phẩm (không bắt buộc)" /></label>
      <p class="muted" id="market-price-hint"></p>
      <button type="submit" class="btn" id="market-post">Đăng lên kênh Mua bán</button>
    </form>
    <p id="market-offer-info"></p><button type="button" class="btn hidden" id="market-buy">Mua vật phẩm</button>
    <p id="market-result" role="status"></p>
  </section>`);
  dialogs.register('market-dialog');
  const currency = $<HTMLSelectElement>('market-currency'), price = $<HTMLInputElement>('market-price');
  const update = () => {
    $('market-price-hint').textContent = currency.value === 'money' ? `${moneyText(Number(price.value))} lượng` : `${price.value} Kim nguyên bảo`;
  };
  currency.addEventListener('change', update); price.addEventListener('input', update); update();
  $('market-form').addEventListener('submit', e => {
    e.preventDefault(); if (!currentItem) return;
    $<HTMLButtonElement>('market-post').disabled = true; $('market-result').textContent = 'Đang đăng tin…';
    ctx.actions()?.tradePost({ uid: currentItem.uid, currency: currency.value as TradeCurrency, price: Number(price.value), text: $<HTMLInputElement>('market-text').value });
  });
  $('market-buy').addEventListener('click', () => {
    if (!currentLine?.offer) return;
    $<HTMLButtonElement>('market-buy').disabled = true;
    ctx.actions()?.tradeBuy(currentLine.id);
  });
  marketResult.watch(result => {
    if (!result) return;
    $('market-result').textContent = result.error || (result.kind === 'post' ? 'Đã đăng tin lên kênh Mua bán.' : 'Mua thành công.');
    $<HTMLButtonElement>('market-post').disabled = false;
    $<HTMLButtonElement>('market-buy').disabled = !result.error && result.kind === 'buy';
    if (!result.error && result.kind === 'post') dialogs.close('market-dialog');
  });
}
export function offerPrice(line: ChatLine): string {
  const o = line.offer!;
  return o.sold ? 'Đã bán' : o.currency === 'contact' ? 'Tin liên hệ cũ · ngừng hỗ trợ' : o.currency === 'knb' ? `${o.price.toLocaleString('vi-VN')} Kim nguyên bảo` : `${moneyText(o.price)} lượng`;
}
function preview(item: Item): void {
  const def = itemDef(item); if (!def) return;
  setSlotIcon($('market-icon'), def, { quality: item.q });
  $('market-preview').replaceChildren(); fillItemTip($('market-preview'), def, { item });
  $('market-result').textContent = '';
  $<HTMLButtonElement>('market-post').disabled = false; $<HTMLButtonElement>('market-buy').disabled = false;
  dialogs.open('market-dialog');
}
export function openMarketPost(item: Item): void {
  currentItem = item; currentLine = null;
  $('market-form').classList.remove('hidden'); $('market-buy').classList.add('hidden'); $('market-offer-info').textContent = '';
  $<HTMLInputElement>('market-text').value = ''; preview(item);
}
export function openMarketPreview(line: ChatLine): void {
  if (!line.offer) return;
  currentLine = line; currentItem = null;
  $('market-form').classList.add('hidden');
  $('market-offer-info').textContent = line.offer.currency === 'contact' ? `${line.from} · Tin liên hệ cũ đã ngừng hỗ trợ. Người bán cần đăng lại với giá Ngân lượng hoặc Kim nguyên bảo.` : `${line.from} · ${offerPrice(line)}. Người bán phải trực tuyến để mua.${line.offer.valuation ? ' ' + line.offer.valuation.reasons.join(' · ') : ''}`;
  $('market-buy').textContent = `Mua với giá ${offerPrice(line)}`;
  $('market-buy').classList.toggle('hidden', line.offer.currency === 'contact' || !!line.offer.sold || line.from === ctx.self()?.name);
  preview(line.offer.item);
}
