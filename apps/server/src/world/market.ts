import { KNB_PRICE, MAX_MONEY, MARKET_PRICING, valueMarketItem, TOKEN_ITEM_ID, addToBag, itemDef, type TradePostMsg, type ChatLine } from '@vltk/shared';
import { db } from '../account/db.js';
import { chatLineById, chatSay, chatRefresh } from './chat.js';
import type { Sim } from './entity.js';

type Trader = { sim: Sim; changed: () => void };
const online = new Map<string, Trader>();
export function marketOnline(sim: Sim, changed: () => void): void { online.set(sim.charId!, { sim, changed }); }
export function marketOffline(sim: Sim): void { if (online.get(sim.charId!)?.sim === sim) online.delete(sim.charId!); }
export function marketPost(sim: Sim, msg: TradePostMsg): string | null {
  const item = sim.bag?.find(it => it?.uid === msg?.uid);
  if (!item || !itemDef(item) || item.def === TOKEN_ITEM_ID || sim.dead) return 'Không thể rao món đồ này.';
  let valuation: ReturnType<typeof valueMarketItem> = null;
  if (msg.autoPrice) {
    const char = db.getCharacter(sim.charId!);
    if (!char?.bot || !db.getUser(char.owner)?.bot) return 'Chỉ bot được sử dụng định giá tự động.';
    valuation = valueMarketItem(item);
    if (!valuation) return 'Món đồ chưa đạt tiêu chí định giá tự động.';
    msg = { ...msg, currency: valuation.currency, price: valuation.price };
  }
  if (!['money','knb','contact'].includes(msg.currency)) return 'Đơn vị giá không hợp lệ.';
  if (msg.currency !== 'contact' && (!Number.isSafeInteger(msg.price) || msg.price <= 0 || msg.price > MAX_MONEY)) return 'Giá phải là số nguyên từ 1 đến 2 tỷ.';
  return chatSay(sim.charId!, sim.a.name, String(msg.text ?? '').trim() || 'Rao bán, mời liên hệ.', Date.now(), 'trade',
    { seller: sim.charId!, item: structuredClone(item), currency: msg.currency, price: msg.currency === 'contact' ? 0 : msg.price, ...(valuation ? { valuation } : {}) });
}
/** Synchronous validation + mutation: no await between checking inventory/payment and transferring the item. */
export function purchaseOffer(buyer: Sim, seller: Sim, line: ChatLine): string | null {
  const offer = line.offer;
  if (!offer || offer.sold || offer.currency === 'contact' || offer.seller !== seller.charId || buyer.charId === seller.charId) return 'Tin rao không thể mua.';
  if (buyer.dead || seller.dead || !buyer.bag || !seller.bag) return 'Nhân vật đang không thể giao dịch.';
  const index = seller.bag.findIndex(it => it?.uid === offer.item.uid);
  if (index < 0 || JSON.stringify(seller.bag[index]) !== JSON.stringify(offer.item)) return 'Món đồ đã thay đổi hoặc không còn trong túi người bán.';
  const key = offer.currency;
  if (!Number.isSafeInteger(offer.price) || offer.price <= 0 || (buyer[key] ?? 0) < offer.price) return 'Không đủ tiền mua.';
  if ((seller[key] ?? 0) + offer.price > MAX_MONEY) return 'Ví người bán đã đạt giới hạn.';
  if (!addToBag(buyer.bag, seller.bag[index]!)) return 'Hành trang không đủ chỗ.';
  seller.bag[index] = null;
  buyer[key] = (buyer[key] ?? 0) - offer.price; seller[key] = (seller[key] ?? 0) + offer.price;
  offer.sold = true;
  return null;
}
export function marketBuy(buyer: Sim, id: number): string | null {
  const line = chatLineById(id), seller = line?.offer ? online.get(line.offer.seller) : undefined;
  if (!line || !seller) return 'Người bán phải đang trực tuyến, tin rao còn hiệu lực.';
  const err = purchaseOffer(buyer, seller.sim, line);
  if (!err) {
    const offer = line.offer!, value = valueMarketItem(offer.item);
    const buyerChar = db.getCharacter(buyer.charId!), sellerChar = db.getCharacter(seller.sim.charId!);
    const sales = db.marketSales();
    if (value && offer.currency !== 'contact' && !sales.some(s => s.uid === offer.item.uid)) {
      sales.push({ at: Date.now(), offerId: line.id, uid: offer.item.uid, def: offer.item.def,
        group: value.group, score: value.score, currency: offer.currency, price: offer.price,
        buyer: buyer.charId!, seller: seller.sim.charId!,
        eligible: !!buyerChar && !!sellerChar && buyerChar.owner !== sellerChar.owner
          && !db.getUser(buyerChar.owner)?.bot });
      if (sales.length > MARKET_PRICING.history.maxSales) sales.splice(0, sales.length - MARKET_PRICING.history.maxSales);
    }
    chatRefresh(line); seller.changed(); online.get(buyer.charId!)?.changed(); db.touch(); db.flush();
  }
  return err;
}
export function buyKnb(sim: Sim, count: unknown, safe: boolean): string | null {
  if (!safe || sim.dead) return 'Chỉ mua Kim nguyên bảo trong thành.';
  const n = Number(count);
  if (!Number.isSafeInteger(n) || n < 1 || n > 99) return 'Số lượng phải từ 1 đến 99.';
  if ((sim.money ?? 0) < n * KNB_PRICE || (sim.knb ?? 0) + n > MAX_MONEY) return 'Không đủ ngân lượng hoặc ví đã đầy.';
  sim.money = (sim.money ?? 0) - n * KNB_PRICE; sim.knb = (sim.knb ?? 0) + n;
  return null;
}
