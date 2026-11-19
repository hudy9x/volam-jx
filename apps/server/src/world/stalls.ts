import {
  BAG_SIZE, MAPS, MAX_MONEY, S2C, STALL_PAGES, STALL_SIZE, TOKEN_ITEM_ID, TOWN_PORTAL_ID,
  addToBag, findPlace, fitsAt, itemDef, moneyText, moveOrSwapInGrid,
  type Bag, type Item, type StallClosedMsg, type StallDetailMsg, type StallListMsg,
  type StallPrice, type StallSummary, type TradeCurrency,
} from '@vltk/shared';
import type { Sim } from './entity.js';

/**
 * Chợ Bày Bán theo thành thị (City Bazaar / Stall):
 * - Mỗi nhân vật có tối đa 1 gian hàng (2 tab × 60 ô = STALL_SIZE = 120).
 * - Chỉ hiển thị gian hàng khi chủ sạp đang trực tuyến (online) trên server.
 * - Khi chủ sạp thoát game, gian hàng tự động đóng và hoàn trả toàn bộ vật phẩm về hành trang (hoặc bagSpill).
 *
 * GHI CHÚ KIẾN TRÚC CHO KỸ NĂNG ỦY THÁC (Offline Entrustment — tương lai):
 * - StallState được thiết kế thuần dữ liệu JSON-serializable, không giữ tham chiếu Sim trực tiếp, và có sẵn
 *   trường `entrustedUntil?: number`.
 * - Khi triển khai kỹ năng Ủy thác sau này: lưu StallState vào DB, và trong `stallOffline()` nếu
 *   `entrustedUntil > Date.now()` thì KHÔNG đóng sạp / KHÔNG hoàn đồ, giữ sạp hiển thị và cộng tiền vào DB.
 */

export const STALL_TITLE_MAX = 48;
/** Grace period when transferring between maps so travelling while online keeps the stall alive. */
const TRANSFER_GRACE_MS = 30_000;

export interface StallSeat {
  sim: Sim;
  mapId: number;
  send(type: string, msg: unknown): void;
  notify(text: string): void;
  /** Sync owner's inventory to client and persist character to DB. */
  syncAndSave(): void;
}

export interface StallState {
  charId: string;
  sellerName: string;
  sellerCamp: string;
  mapId: number;
  title: string;
  open: boolean;
  items: Bag;
  prices: Record<string, StallPrice>;
  /** Reserved for future Offline Entrustment (Kỹ năng Ủy thác): epoch ms until which the stall stays open offline. */
  entrustedUntil?: number;
}

const seats = new Map<string, StallSeat>();          // charId -> online seat
const stalls = new Map<string, StallState>();        // charId -> stall state
const closingTimers = new Map<string, NodeJS.Timeout>(); // charId -> delayed cleanup on map transfer

const isTown = (mapId: number): boolean => !!MAPS[mapId]?.safe;
const townName = (mapId: number): string => MAPS[mapId]?.name ?? `Thành #${mapId}`;
const countItems = (items: Bag): number => items.reduce((n, it) => n + (it ? 1 : 0), 0);
const isValidCurrency = (c: unknown): c is TradeCurrency => c === 'money' || c === 'knb';

function emptyStallBag(): Bag {
  return Array<Item | null>(STALL_SIZE).fill(null);
}

function isEntrusted(stall: StallState, now = Date.now()): boolean {
  return !!stall.entrustedUntil && stall.entrustedUntil > now;
}

function isStallVisible(stall: StallState): boolean {
  return stall.open && (seats.has(stall.charId) || isEntrusted(stall)) && countItems(stall.items) > 0;
}

function makeDetail(stall: StallState, isOwner: boolean): StallDetailMsg {
  const seat = seats.get(stall.charId);
  if (seat) {
    stall.sellerName = seat.sim.a.name;
    stall.sellerCamp = seat.sim.a.camp || 'new';
  }
  return {
    charId: stall.charId,
    sellerName: stall.sellerName,
    sellerCamp: stall.sellerCamp,
    mapId: stall.mapId,
    title: stall.title,
    open: stall.open,
    isOwner,
    items: stall.items.slice(),
    prices: { ...stall.prices },
  };
}

function broadcastClosed(charId: string, mapId: number, reason?: string): void {
  const msg: StallClosedMsg = { charId, reason };
  for (const [id, s] of seats) {
    if (id !== charId && s.mapId === mapId) s.send(S2C.stallClosed, msg);
  }
}

function returnAllItemsToSim(stall: StallState, sim: Sim): boolean {
  let moved = false;
  if (!sim.bag) return false;
  for (let i = 0; i < stall.items.length; i++) {
    const it = stall.items[i];
    if (!it) continue;
    stall.items[i] = null;
    delete stall.prices[it.uid];
    if (!addToBag(sim.bag, it, BAG_SIZE)) {
      sim.bagSpill = [...(sim.bagSpill ?? []), it];
    }
    moved = true;
  }
  return moved;
}

function closeAndReturnStall(charId: string, fallbackSim?: Sim): void {
  const stall = stalls.get(charId);
  if (!stall) return;
  if (isEntrusted(stall)) return; // Future Offline Entrustment hook
  const seat = seats.get(charId);
  const sim = seat?.sim ?? fallbackSim;
  const wasOpen = stall.open;
  stall.open = false;
  if (sim) returnAllItemsToSim(stall, sim);
  stalls.delete(charId);
  if (wasOpen) broadcastClosed(charId, stall.mapId, 'Gian hàng đã đóng.');
}

/** A character entered a map room. */
export function stallOnline(charId: string, seat: StallSeat): void {
  const timer = closingTimers.get(charId);
  if (timer) { clearTimeout(timer); closingTimers.delete(charId); }
  seats.set(charId, seat);
  const stall = stalls.get(charId);
  if (stall) {
    stall.sellerName = seat.sim.a.name;
    stall.sellerCamp = seat.sim.a.camp || 'new';
  }
}

/**
 * A character left a map room.
 * - `transfer = true`: keep the stall alive during TRANSFER_GRACE_MS so moving to another map doesn't wipe it.
 * - `transfer = false` (actual disconnect/logout): close the stall immediately and return items to bag/bagSpill
 *   before the caller persists the character to DB.
 */
export function stallOffline(charId: string, sim: Sim, transfer = false): void {
  if (seats.get(charId)?.sim !== sim) return;
  seats.delete(charId);
  const stall = stalls.get(charId);
  if (!stall || isEntrusted(stall)) return;
  if (transfer) {
    const prev = closingTimers.get(charId);
    if (prev) clearTimeout(prev);
    closingTimers.set(charId, setTimeout(() => {
      closingTimers.delete(charId);
      if (!seats.has(charId)) closeAndReturnStall(charId, sim);
    }, TRANSFER_GRACE_MS));
    return;
  }
  closeAndReturnStall(charId, sim);
}

/** Send the list of open stalls in the character's current town. */
export function sendStallList(charId: string): void {
  const seat = seats.get(charId);
  if (!seat) return;
  if (!isTown(seat.mapId)) {
    seat.notify('Chỉ có thể mở Chợ khi đang ở trong thành thị.');
    return;
  }
  const list: StallSummary[] = [];
  for (const stall of stalls.values()) {
    if (stall.mapId !== seat.mapId || !isStallVisible(stall)) continue;
    const ownerSeat = seats.get(stall.charId);
    if (ownerSeat) {
      stall.sellerName = ownerSeat.sim.a.name;
      stall.sellerCamp = ownerSeat.sim.a.camp || 'new';
    }
    list.push({
      charId: stall.charId,
      sellerName: stall.sellerName,
      sellerCamp: stall.sellerCamp,
      mapId: stall.mapId,
      title: stall.title,
      itemCount: countItems(stall.items),
    });
  }
  const mine = stalls.get(charId);
  const msg: StallListMsg = {
    mapId: seat.mapId,
    stalls: list,
    myStall: mine
      ? { mapId: mine.mapId, open: mine.open, title: mine.title, itemCount: countItems(mine.items) }
      : null,
  };
  seat.send(S2C.stallList, msg);
}

/** Open a stall dialog: own stall (editable when closed) or another player's open stall in the same town. */
export function inspectStall(viewerCharId: string, targetCharId: string): void {
  const viewer = seats.get(viewerCharId);
  if (!viewer) return;
  if (!isTown(viewer.mapId)) {
    viewer.notify('Chỉ có thể xem hoặc bày bán Chợ khi đang ở trong thành thị.');
    return;
  }
  if (!targetCharId || targetCharId === viewerCharId) {
    let mine = stalls.get(viewerCharId);
    if (mine && mine.mapId !== viewer.mapId) {
      if (mine.open || countItems(mine.items) > 0) {
        viewer.notify(`Bạn đang có quầy hàng tại ${townName(mine.mapId)}, hãy về đó để quản lý hoặc thu hồi đồ.`);
        return;
      }
      mine.mapId = viewer.mapId;
    }
    if (!mine) {
      mine = {
        charId: viewerCharId,
        sellerName: viewer.sim.a.name,
        sellerCamp: viewer.sim.a.camp || 'new',
        mapId: viewer.mapId,
        title: '',
        open: false,
        items: emptyStallBag(),
        prices: {},
      };
      stalls.set(viewerCharId, mine);
    }
    viewer.send(S2C.stallDetail, makeDetail(mine, true));
    return;
  }
  const target = stalls.get(targetCharId);
  if (!target || target.mapId !== viewer.mapId || !isStallVisible(target)) {
    viewer.notify('Gian hàng này đã đóng hoặc không còn ở thành thị này.');
    sendStallList(viewerCharId);
    return;
  }
  viewer.send(S2C.stallDetail, makeDetail(target, false));
}

function getEditableOwnStall(charId: string): { seat: StallSeat; stall: StallState } | null {
  const seat = seats.get(charId);
  if (!seat) return null;
  if (!isTown(seat.mapId)) {
    seat.notify('Chỉ có thể thao tác quầy hàng khi đang ở trong thành thị.');
    return null;
  }
  const stall = stalls.get(charId);
  if (!stall) {
    seat.notify('Chưa mở quầy hàng.');
    return null;
  }
  if (stall.mapId !== seat.mapId) {
    seat.notify(`Quầy hàng của bạn đang ở ${townName(stall.mapId)}.`);
    return null;
  }
  if (stall.open) {
    seat.notify('Đang bày bán: hãy bấm Ngưng bày bán trước khi chỉnh sửa đồ hoặc giá.');
    return null;
  }
  return { seat, stall };
}

/** Move an item from the owner's bag into the stall (2 tabs × 60 cells). */
export function stallPut(charId: string, from: number, to?: number, page?: number): boolean {
  const ctx = getEditableOwnStall(charId);
  if (!ctx) return false;
  const { seat, stall } = ctx;
  const bag = seat.sim.bag;
  if (!bag || !Number.isInteger(from) || from < 0 || from >= BAG_SIZE) return false;
  const item = bag[from];
  if (!item) return false;
  if (item.def === TOKEN_ITEM_ID || item.def === TOWN_PORTAL_ID) {
    seat.notify('Vật phẩm này không thể bày bán.');
    return false;
  }
  const def = itemDef(item);
  if (!def) return false;
  const dst = (Number.isInteger(to) && to! >= 0 && to! < STALL_SIZE && fitsAt(stall.items, def, to!, -1))
    ? to!
    : findPlace(stall.items, def, -1, (Number.isInteger(page) && page! >= 0 && page! < STALL_PAGES) ? page! : -1, STALL_SIZE);
  if (dst < 0) {
    seat.notify('Quầy hàng không đủ chỗ trống.');
    return false;
  }
  bag[from] = null;
  stall.items[dst] = item;
  seat.syncAndSave();
  seat.send(S2C.stallDetail, makeDetail(stall, true));
  return true;
}

/** Take an item back from the stall into the owner's bag. */
export function stallTake(charId: string, from: number, to?: number, page?: number): boolean {
  const ctx = getEditableOwnStall(charId);
  if (!ctx) return false;
  const { seat, stall } = ctx;
  const bag = seat.sim.bag;
  if (!bag || !Number.isInteger(from) || from < 0 || from >= STALL_SIZE) return false;
  const item = stall.items[from];
  if (!item) return false;
  const def = itemDef(item);
  if (!def) return false;
  const dst = (Number.isInteger(to) && to! >= 0 && to! < BAG_SIZE && fitsAt(bag, def, to!, -1))
    ? to!
    : findPlace(bag, def, -1, (Number.isInteger(page) && page! >= 0) ? page! : -1, BAG_SIZE);
  if (dst < 0) {
    seat.notify('Hành trang không đủ chỗ trống.');
    return false;
  }
  stall.items[from] = null;
  delete stall.prices[item.uid];
  bag[dst] = item;
  seat.syncAndSave();
  seat.send(S2C.stallDetail, makeDetail(stall, true));
  return true;
}

/** Rearrange / swap items inside the 2-tab stall grid. */
export function stallMove(charId: string, from: number, to: number): boolean {
  const ctx = getEditableOwnStall(charId);
  if (!ctx) return false;
  const { seat, stall } = ctx;
  if (!Number.isInteger(from) || !Number.isInteger(to)) return false;
  if (!moveOrSwapInGrid(stall.items, from, to, STALL_SIZE)) return false;
  seat.send(S2C.stallDetail, makeDetail(stall, true));
  return true;
}

/** Set or clear (price = 0) the price of an item currently in the owner's stall. */
export function stallSetPrice(charId: string, uid: string, price: number, currency: TradeCurrency): boolean {
  const ctx = getEditableOwnStall(charId);
  if (!ctx) return false;
  const { seat, stall } = ctx;
  if (!isValidCurrency(currency)) {
    seat.notify('Chỉ hỗ trợ Ngân lượng hoặc Kim nguyên bảo.');
    return false;
  }
  const item = stall.items.find(it => it?.uid === uid);
  if (!item) {
    seat.notify('Không tìm thấy vật phẩm trong quầy hàng.');
    return false;
  }
  const cleanPrice = Math.floor(Number(price));
  if (!Number.isSafeInteger(cleanPrice) || cleanPrice < 0 || cleanPrice > MAX_MONEY) {
    seat.notify('Giá bán không hợp lệ.');
    return false;
  }
  if (cleanPrice === 0) delete stall.prices[uid];
  else stall.prices[uid] = { price: cleanPrice, currency };
  seat.send(S2C.stallDetail, makeDetail(stall, true));
  return true;
}

/** Open the stall to the town's bazaar with an advertisement title. */
export function stallOpen(charId: string, rawTitle: string): boolean {
  const ctx = getEditableOwnStall(charId);
  if (!ctx) return false;
  const { seat, stall } = ctx;
  const title = String(rawTitle ?? '').replace(/\s+/g, ' ').trim();
  if (!title || title.length > STALL_TITLE_MAX) {
    seat.notify(`Lời mời chào cần dài từ 1 đến ${STALL_TITLE_MAX} ký tự.`);
    return false;
  }
  const itemsInStall = stall.items.filter((it): it is Item => !!it);
  if (!itemsInStall.length) {
    seat.notify('Hãy đặt ít nhất 1 vật phẩm vào quầy trước khi bày bán.');
    return false;
  }
  const unpriced = itemsInStall.filter(it => !(stall.prices[it.uid]?.price > 0));
  if (unpriced.length > 0) {
    seat.notify(`Còn ${unpriced.length} vật phẩm chưa định giá. Hãy định giá hoặc rút ra trước khi bày bán.`);
    return false;
  }
  stall.title = title;
  stall.open = true;
  seat.notify(`Đã mở gian hàng "${title}" tại ${townName(stall.mapId)}.`);
  seat.send(S2C.stallDetail, makeDetail(stall, true));
  sendStallList(charId);
  return true;
}

/** Pause / close the stall from public listing while keeping items inside so the owner can edit or retrieve them. */
export function stallClose(charId: string): boolean {
  const seat = seats.get(charId);
  if (!seat) return false;
  const stall = stalls.get(charId);
  if (!stall) return false;
  if (!stall.open) return false;
  stall.open = false;
  broadcastClosed(charId, stall.mapId, 'Chủ sạp đã ngưng bày bán.');
  seat.notify('Đã ngưng bày bán. Bạn có thể chỉnh sửa giá hoặc rút đồ về hành trang.');
  seat.send(S2C.stallDetail, makeDetail(stall, true));
  if (isTown(seat.mapId)) sendStallList(charId);
  return true;
}

/** Buy one item atomically from an open stall in the same town. */
export function stallBuy(
  buyerCharId: string,
  sellerCharId: string,
  uid: string,
  expectedPrice: number,
  expectedCurrency: TradeCurrency,
): boolean {
  const buyerSeat = seats.get(buyerCharId);
  if (!buyerSeat) return false;
  if (!isTown(buyerSeat.mapId)) {
    buyerSeat.notify('Chỉ có thể mua đồ ở Chợ khi đang ở trong thành thị.');
    return false;
  }
  if (buyerCharId === sellerCharId) {
    buyerSeat.notify('Không thể tự mua vật phẩm trong gian hàng của chính mình.');
    return false;
  }
  const stall = stalls.get(sellerCharId);
  const sellerSeat = seats.get(sellerCharId);
  if (!stall || stall.mapId !== buyerSeat.mapId || !isStallVisible(stall) || !sellerSeat) {
    buyerSeat.notify('Gian hàng đã đóng hoặc người bán không còn trực tuyến.');
    sendStallList(buyerCharId);
    return false;
  }
  const idx = stall.items.findIndex(it => it?.uid === uid);
  if (idx < 0 || !stall.items[idx]) {
    buyerSeat.notify('Vật phẩm này đã được bán hoặc không còn trong quầy.');
    buyerSeat.send(S2C.stallDetail, makeDetail(stall, false));
    return false;
  }
  const item = stall.items[idx]!;
  const def = itemDef(item);
  if (!def) return false;
  const entry = stall.prices[uid];
  if (!entry || entry.price <= 0 || entry.price !== expectedPrice || entry.currency !== expectedCurrency) {
    buyerSeat.notify('Giá vật phẩm đã thay đổi, vui lòng xem lại.');
    buyerSeat.send(S2C.stallDetail, makeDetail(stall, false));
    return false;
  }
  const buyer = buyerSeat.sim;
  const seller = sellerSeat.sim;
  if (!buyer.bag) return false;

  const isKnb = entry.currency === 'knb';
  const buyerBal = isKnb ? (buyer.knb ?? 0) : (buyer.money ?? 0);
  const sellerBal = isKnb ? (seller.knb ?? 0) : (seller.money ?? 0);
  if (buyerBal < entry.price) {
    buyerSeat.notify(isKnb ? 'Không đủ Kim nguyên bảo.' : 'Không đủ ngân lượng.');
    return false;
  }
  if (sellerBal + entry.price > MAX_MONEY) {
    buyerSeat.notify('Ví của người bán đã đầy, không thể hoàn tất giao dịch.');
    return false;
  }
  const dst = findPlace(buyer.bag, def, -1, -1, BAG_SIZE);
  if (dst < 0) {
    buyerSeat.notify('Hành trang của bạn không đủ chỗ trống.');
    return false;
  }

  // Atomic transfer
  if (isKnb) {
    buyer.knb = buyerBal - entry.price;
    seller.knb = sellerBal + entry.price;
  } else {
    buyer.money = buyerBal - entry.price;
    seller.money = sellerBal + entry.price;
  }
  stall.items[idx] = null;
  delete stall.prices[uid];
  buyer.bag[dst] = item;

  buyerSeat.syncAndSave();
  sellerSeat.syncAndSave();

  const priceLabel = isKnb ? `${entry.price.toLocaleString('vi-VN')} KNB` : `${moneyText(entry.price)} lượng`;
  buyerSeat.notify(`Đã mua ${def.name} từ ${seller.a.name} với giá ${priceLabel}.`);
  sellerSeat.notify(`${buyer.a.name} đã mua ${def.name} trong gian hàng của bạn (+${priceLabel}).`);

  if (countItems(stall.items) === 0) {
    stall.open = false;
    sellerSeat.notify('Gian hàng của bạn đã bán hết toàn bộ vật phẩm và tự động đóng.');
    broadcastClosed(sellerCharId, stall.mapId, 'Gian hàng đã bán hết vật phẩm.');
    sellerSeat.send(S2C.stallDetail, makeDetail(stall, true));
    sendStallList(buyerCharId);
  } else {
    buyerSeat.send(S2C.stallDetail, makeDetail(stall, false));
    sellerSeat.send(S2C.stallDetail, makeDetail(stall, true));
  }
  return true;
}

/** Test-only helper to clear in-memory stall state between unit tests. */
export function resetStallsForTest(): void {
  for (const t of closingTimers.values()) clearTimeout(t);
  closingTimers.clear();
  seats.clear();
  stalls.clear();
}
