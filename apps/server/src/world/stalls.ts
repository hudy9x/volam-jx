import {
  BAG_SIZE, MAPS, MAX_MONEY, S2C, STALL_MIN_LEVEL, STALL_NPC_CLEARANCE, STALL_SIZE,
  TOKEN_ITEM_ID, TOWN_PORTAL_ID, findPlace, itemDef, moneyText,
  type Bag, type Item, type StallClosedMsg, type StallDetailMsg, type StallPrice, type TradeCurrency,
} from '@vltk/shared';
import type { Sim } from './entity.js';

/**
 * Cơ chế Bày bán (Player Stall theo JX1):
 * - Không có túi sạp riêng: người chơi định giá trực tiếp lên vật phẩm trong 2 trang đầu Hành trang (0..STALL_SIZE-1 = 120 ô).
 * - Khi mở sạp, tên sạp hiển thị trên đầu nhân vật (Actor.stallTitle); người mua click vào nhân vật để mở 1 trang lớn 120 ô (10×12).
 * - Đang bày bán: khóa di chuyển, khóa đổi ô túi, khóa dùng/bán/vứt/trang bị, khóa cưỡi ngựa và không mua sạp khác.
 * - Khi vật phẩm đổi chủ (mua/bán), tự động xóa stallPrice.
 */

export const STALL_TITLE_MAX = 20;
const TRANSFER_GRACE_MS = 30_000;

export interface StallSeat {
  sim: Sim;
  actorId: string;
  mapId: number;
  send(type: string, msg: unknown): void;
  notify(text: string): void;
  /** Sync owner's inventory to client and persist character to DB. */
  syncAndSave(): void;
  /** Stop any in-progress movement when opening stall. */
  stopMove?: () => void;
  /** Positions of town NPCs on the current map for PermitRegion clearance check. */
  npcPositions?: () => readonly { x: number; y: number }[];
}

const seats = new Map<string, StallSeat>();          // charId -> online seat
const closingTimers = new Map<string, NodeJS.Timeout>();

const isTown = (mapId: number): boolean => !!MAPS[mapId]?.safe;
const isValidCurrency = (c: unknown): c is TradeCurrency => c === 'money' || c === 'knb';

function pricedItemsInBag(bag: Bag | undefined): { idx: number; item: Item; price: StallPrice }[] {
  if (!bag) return [];
  const out: { idx: number; item: Item; price: StallPrice }[] = [];
  const limit = Math.min(STALL_SIZE, bag.length);
  for (let i = 0; i < limit; i++) {
    const it = bag[i];
    if (it && it.stallPrice && it.stallPrice.price > 0 && isValidCurrency(it.stallPrice.currency)) {
      out.push({ idx: i, item: it, price: it.stallPrice });
    }
  }
  return out;
}

function makeDetail(seat: StallSeat, isOwner: boolean): StallDetailMsg {
  const items = Array<Item | null>(STALL_SIZE).fill(null);
  const prices: Record<string, StallPrice> = {};
  for (const { idx, item, price } of pricedItemsInBag(seat.sim.bag)) {
    items[idx] = item;
    prices[item.uid] = price;
  }
  return {
    charId: seat.sim.charId!,
    sellerName: seat.sim.a.name,
    sellerCamp: seat.sim.a.camp || 'new',
    mapId: seat.mapId,
    title: seat.sim.a.stallTitle,
    open: !!seat.sim.a.stallTitle,
    isOwner,
    items,
    prices,
  };
}

function broadcastClosed(charId: string, mapId: number, reason?: string): void {
  const msg: StallClosedMsg = { charId, reason };
  for (const [id, s] of seats) {
    if (id !== charId && s.mapId === mapId) s.send(S2C.stallClosed, msg);
  }
}

/** A character entered a map room. */
export function stallOnline(charId: string, seat: StallSeat): void {
  const timer = closingTimers.get(charId);
  if (timer) { clearTimeout(timer); closingTimers.delete(charId); }
  seats.set(charId, seat);
}

/** A character left a map room. */
export function stallOffline(charId: string, sim: Sim, transfer = false): void {
  if (seats.get(charId)?.sim !== sim) return;
  const seat = seats.get(charId)!;
  seats.delete(charId);
  if (!sim.a.stallTitle) return;
  if (transfer) {
    const prev = closingTimers.get(charId);
    if (prev) clearTimeout(prev);
    closingTimers.set(charId, setTimeout(() => {
      closingTimers.delete(charId);
      if (!seats.has(charId)) {
        const had = !!sim.a.stallTitle;
        sim.a.stallTitle = '';
        if (had) broadcastClosed(charId, seat.mapId, 'Chủ sạp đã rời khỏi thành thị.');
      }
    }, TRANSFER_GRACE_MS));
    return;
  }
  sim.a.stallTitle = '';
  broadcastClosed(charId, seat.mapId, 'Gian hàng đã đóng.');
}

/** Set or clear (price = 0) the stall price directly on an item in the first 2 bag pages (0..119). */
export function stallSetPrice(charId: string, uid: string, price: number, currency: TradeCurrency): boolean {
  const seat = seats.get(charId);
  if (!seat || !seat.sim.bag) return false;
  if (seat.sim.a.stallTitle) {
    seat.notify('Đang bày bán: hãy ngưng bày bán trước khi sửa giá.');
    return false;
  }
  if (!isValidCurrency(currency)) {
    seat.notify('Chỉ hỗ trợ Ngân lượng hoặc Kim nguyên bảo.');
    return false;
  }
  const idx = seat.sim.bag.findIndex(it => it?.uid === uid);
  if (idx < 0) {
    seat.notify('Không tìm thấy vật phẩm trong hành trang.');
    return false;
  }
  if (idx >= STALL_SIZE) {
    seat.notify('Chỉ có thể định giá vật phẩm ở 2 trang đầu Hành trang.');
    return false;
  }
  const item = seat.sim.bag[idx]!;
  const cleanPrice = Math.floor(Number(price));
  if (!Number.isSafeInteger(cleanPrice) || cleanPrice < 0 || cleanPrice > MAX_MONEY) {
    seat.notify('Giá bán không hợp lệ.');
    return false;
  }
  if (cleanPrice === 0) {
    delete item.stallPrice;
  } else {
    if (item.def === TOKEN_ITEM_ID || item.def === TOWN_PORTAL_ID) {
      seat.notify('Vật phẩm này không thể bày bán.');
      return false;
    }
    item.stallPrice = { price: cleanPrice, currency };
  }
  seat.syncAndSave();
  return true;
}

/** Open the player stall in place (PermitTrade: town safe zone, not mounted, not dead/fighting, level >= 60, away from NPCs). */
export function stallOpen(charId: string, rawTitle: string): boolean {
  const seat = seats.get(charId);
  if (!seat) return false;
  const sim = seat.sim;
  if (sim.a.stallTitle) {
    seat.notify('Bạn đang bày bán rồi.');
    return false;
  }
  if (sim.a.hp <= 0) {
    seat.notify('Không thể bày bán khi đã tử vong.');
    return false;
  }
  if (sim.a.mounted) {
    seat.notify('Trong lúc cưỡi ngựa không thể bày bán!');
    return false;
  }
  if (!isTown(seat.mapId) || sim.a.attackTarget) {
    seat.notify('Trạng thái không được bảo vệ không thể thực hiện.');
    return false;
  }
  if (sim.a.level < STALL_MIN_LEVEL) {
    seat.notify(`Đẳng cấp dưới ${STALL_MIN_LEVEL} không thể bày bán.`);
    return false;
  }
  const npcs = seat.npcPositions?.() ?? [];
  for (const npc of npcs) {
    if (Math.hypot(sim.a.x - npc.x, sim.a.y - npc.y) <= STALL_NPC_CLEARANCE) {
      seat.notify('Bạn không thể bày bán quá gần NPC chức năng.');
      return false;
    }
  }
  const title = String(rawTitle ?? '').replace(/\s+/g, ' ').trim();
  if (!title || title.length > STALL_TITLE_MAX) {
    seat.notify(`Lời mời chào cần dài từ 1 đến ${STALL_TITLE_MAX} ký tự.`);
    return false;
  }
  if (pricedItemsInBag(sim.bag).length === 0) {
    seat.notify('Bạn chưa định giá cho bất kỳ vật phẩm nào.');
    return false;
  }
  seat.stopMove?.();
  sim.a.stallTitle = title;
  seat.syncAndSave();
  seat.notify(`Đã mở sạp "${title}".`);
  return true;
}

/** Close the player stall (never blocked by PermitTrade). */
export function stallClose(charId: string): boolean {
  const seat = seats.get(charId);
  if (!seat) return false;
  if (!seat.sim.a.stallTitle) return false;
  seat.sim.a.stallTitle = '';
  broadcastClosed(charId, seat.mapId, 'Chủ sạp đã ngưng bày bán.');
  seat.syncAndSave();
  seat.notify('Đã ngưng bày bán.');
  return true;
}

/** Open another player's stall window (120-cell single page) by charId or actorId (sessionId). */
export function inspectStall(viewerCharId: string, targetId: string): void {
  const viewer = seats.get(viewerCharId);
  if (!viewer) return;
  if (!isTown(viewer.mapId)) {
    viewer.notify('Chỉ có thể xem sạp hàng khi đang ở trong thành thị.');
    return;
  }
  let targetSeat = seats.get(targetId);
  if (!targetSeat) {
    for (const s of seats.values()) {
      if (s.actorId === targetId) { targetSeat = s; break; }
    }
  }
  if (!targetSeat || targetSeat.mapId !== viewer.mapId || !targetSeat.sim.a.stallTitle) {
    viewer.notify('Người bày bán đã cất đi rồi.');
    return;
  }
  if (pricedItemsInBag(targetSeat.sim.bag).length === 0) {
    viewer.notify('Gian hàng hiện không còn vật phẩm nào.');
    return;
  }
  viewer.send(S2C.stallDetail, makeDetail(targetSeat, targetSeat.sim.charId === viewerCharId));
}

/** Buy one item atomically from an open player stall in the same town. */
export function stallBuy(
  buyerCharId: string,
  sellerCharId: string,
  uid: string,
  expectedPrice: number,
  expectedCurrency: TradeCurrency,
): boolean {
  const buyerSeat = seats.get(buyerCharId);
  if (!buyerSeat) return false;
  const buyer = buyerSeat.sim;
  if (buyer.a.stallTitle) return false; // JX1 §5: đang bày bán không mua sạp người khác
  if (!isTown(buyerSeat.mapId) || buyer.a.hp <= 0 || buyer.a.attackTarget) {
    buyerSeat.notify('Trạng thái không được bảo vệ không thể thực hiện.');
    return false;
  }
  if (buyerCharId === sellerCharId) {
    buyerSeat.notify('Không thể tự mua vật phẩm trong sạp của chính mình.');
    return false;
  }
  const sellerSeat = seats.get(sellerCharId);
  if (!sellerSeat || sellerSeat.mapId !== buyerSeat.mapId || !sellerSeat.sim.a.stallTitle) {
    buyerSeat.notify('Người bày bán đã cất đi rồi.');
    buyerSeat.send(S2C.stallClosed, { charId: sellerCharId, reason: 'Người bày bán đã cất đi rồi.' } satisfies StallClosedMsg);
    return false;
  }
  const seller = sellerSeat.sim;
  if (!seller.bag || !buyer.bag) return false;

  const idx = seller.bag.findIndex((it, i) => i < STALL_SIZE && it?.uid === uid);
  if (idx < 0 || !seller.bag[idx]) {
    buyerSeat.notify('Vật phẩm này đã được bán ra rồi!');
    buyerSeat.send(S2C.stallDetail, makeDetail(sellerSeat, false));
    return false;
  }
  const item = seller.bag[idx]!;
  const def = itemDef(item);
  if (!def) return false;
  const entry = item.stallPrice;
  if (!entry || entry.price <= 0 || entry.price !== expectedPrice || entry.currency !== expectedCurrency) {
    buyerSeat.notify('Giá vật phẩm đã thay đổi, vui lòng xem lại.');
    buyerSeat.send(S2C.stallDetail, makeDetail(sellerSeat, false));
    return false;
  }

  const isKnb = entry.currency === 'knb';
  const buyerBal = isKnb ? (buyer.knb ?? 0) : (buyer.money ?? 0);
  const sellerBal = isKnb ? (seller.knb ?? 0) : (seller.money ?? 0);
  if (buyerBal < entry.price) {
    buyerSeat.notify(isKnb ? 'Bạn không có đủ Kim nguyên bảo.' : 'Bạn không có đủ ngân lượng.');
    return false;
  }
  if (sellerBal + entry.price > MAX_MONEY) {
    buyerSeat.notify('Ví của người bán đã đầy, không thể hoàn tất giao dịch.');
    return false;
  }
  const dst = findPlace(buyer.bag, def, -1, -1, BAG_SIZE);
  if (dst < 0) {
    buyerSeat.notify('Khoảng trống trong túi không đủ.');
    return false;
  }

  // Atomic transfer + reset price on owner change (JX1 §3)
  if (isKnb) {
    buyer.knb = buyerBal - entry.price;
    seller.knb = sellerBal + entry.price;
  } else {
    buyer.money = buyerBal - entry.price;
    seller.money = sellerBal + entry.price;
  }
  seller.bag[idx] = null;
  delete item.stallPrice;
  buyer.bag[dst] = item;

  buyerSeat.syncAndSave();
  sellerSeat.syncAndSave();

  const priceLabel = isKnb ? `${entry.price.toLocaleString('vi-VN')} KNB` : `${moneyText(entry.price)} lượng`;
  buyerSeat.notify(`Đã mua ${def.name} từ ${seller.a.name} với giá ${priceLabel}.`);
  sellerSeat.notify(`${buyer.a.name} đã mua ${def.name} trong sạp của bạn (+${priceLabel}).`);

  if (pricedItemsInBag(seller.bag).length === 0) {
    seller.a.stallTitle = '';
    sellerSeat.notify('Sạp của bạn đã bán hết vật phẩm và tự động đóng.');
    broadcastClosed(sellerCharId, sellerSeat.mapId, 'Gian hàng đã bán hết vật phẩm.');
  } else {
    buyerSeat.send(S2C.stallDetail, makeDetail(sellerSeat, false));
  }
  return true;
}

/** Test-only helper to clear in-memory stall state between unit tests. */
export function resetStallsForTest(): void {
  for (const t of closingTimers.values()) clearTimeout(t);
  closingTimers.clear();
  seats.clear();
}
