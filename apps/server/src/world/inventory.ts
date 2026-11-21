import { moneyText } from '@vltk/shared';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  BAG_SIZE, BUY_MAX, HORSES, ITEMS, MAPS, MAX_BAG_POTIONS, STALL_SIZE, STASH_SIZE, TOKEN_ITEM_ID, nearestTown, KIND_SLOTS, MAX_MONEY, QUALITY, SHOP_OF,
  addToBag, bagPotionCount, bagValid, createGold, createItem, equipError, findPlace, fitsAt, forgeError, forgePrice, forgedMagic, fortuneRequirement,
  getExpElixirMultiplier, isStackablePotion, itemDef, itemQty, lookOf, maxStackOf, moveOrSwapInGrid, overlappingAt, packBag, restoreItem, roomFor, sellPrice,
  sortGridPage, splitStackInGrid, usableItem, weaponTypeOf,
  type Bag, type EquipSlot, type Equipment, type ForgeLines, type Item, type Outfit,
} from '@vltk/shared';
import type { Sim } from './entity.js';
import { updateSpeed } from './systems/movement.js';
import { drinkPotion } from './systems/potions.js';
import { refreshStats, useBook, viewerOf } from './progress.js';
import { throwItem } from './systems/drops.js';
import type { World } from './World.js';
import { MAPS_DIR, devTools } from '../env.js';

// Hành trang / trang bị / tiền túi: server-authoritative; MapRoom sends the owner the new inventory after each change.
// Item data, concrete items, wearing rules, potions, shops and prices: packages/shared/src/items/.

/** Id of a new piece. */
export const newItemUid = () => randomBytes(9).toString('base64url');

/** Make a new piece of table row `defId` (white, base values rolled). */
export function makeItem(defId: string): Item | null {
  const def = ITEMS[defId];
  return def ? createItem(def, newItemUid()) : null;
}

/** Wear the item in bag slot `index`; whatever was worn there goes back into that bag slot. */
export function equipItem(w: World, sim: Sim, index: number, wanted?: string): boolean {
  if (sim.a.stallTitle) return false;
  const item = sim.bag?.[index];
  const def = itemDef(item);
  if (!item || !def || sim.dead) return false;
  const slots = KIND_SLOTS[def.kind];
  if (!slots.length) return false;
  const err = equipError(def, viewerOf(sim));
  if (err) { w.hooks.notify(sim, err); return false; }
  const slot = slots.includes(wanted as EquipSlot) ? wanted as EquipSlot : slots.find(s => !sim.equip![s]) ?? slots[0];
  // What was worn goes back where the new piece was, or wherever it fits in the grid.
  const old = sim.equip![slot];
  const bag = sim.bag!;
  bag[index] = null;
  if (old) {
    const at = fitsAt(bag, itemDef(old), index) ? index : findPlace(bag, itemDef(old));
    if (at < 0) { bag[index] = item; w.hooks.notify(sim, 'Hành trang không đủ chỗ cho món đang mặc.'); return false; }
    bag[at] = old;
  }
  delete item.stallPrice;
  sim.equip![slot] = item;
  applyEquipment(sim);
  return true;
}

/** Take off a worn item into the first free bag slot. */
export function unequipItem(w: World, sim: Sim, slot: string): boolean {
  if (sim.a.stallTitle) return false;
  const item = sim.equip?.[slot as EquipSlot];
  if (!item || sim.dead) return false;
  if (!addToBag(sim.bag!, item)) { w.hooks.notify(sim, 'Hành trang không đủ chỗ.'); return false; }
  delete sim.equip![slot as EquipSlot];
  applyEquipment(sim);
  return true;
}

/**
 * Buy `count` new pieces of a row an NPC shop sells (items/shops.ts), at its table price, in town only.
 * Stackable potions automatically merge into existing stacks and respect MAX_BAG_POTIONS.
 */
export function buyItem(w: World, sim: Sim, defId: string, count = 1): boolean {
  if (sim.a.stallTitle) return false;
  const def = ITEMS[defId];
  if (!def || !SHOP_OF[defId] || sim.dead) return false;
  if (!w.rules.safe) { w.hooks.notify(sim, 'Chỉ mua được đồ trong thành.'); return false; }
  const n = Math.max(1, Math.min(BUY_MAX, Math.floor(count) || 1));
  if (def.knbPrice && def.knbPrice > 0) {
    const reqFortune = fortuneRequirement(def);
    if (reqFortune > 0 && (sim.fortune ?? 0) < reqFortune) {
      w.hooks.notify(sim, `Cần đạt Tài phú binh giáp ${reqFortune.toLocaleString('vi-VN')} để mua ${def.name}.`);
      return false;
    }
    const knbCost = def.knbPrice * n;
    if (knbCost > (sim.knb ?? 0)) {
      w.hooks.notify(sim, `Không đủ Kim nguyên bảo (cần ${knbCost.toLocaleString('vi-VN')} KNB).`);
      return false;
    }
    const room = roomFor(sim.bag!, def, n);
    if (room < n) { w.hooks.notify(sim, room ? `Hành trang chỉ còn chỗ cho ${room} món.` : 'Hành trang không đủ chỗ.'); return false; }
    for (let k = 0; k < n; k++) addToBag(sim.bag!, makeItem(defId)!);
    sim.knb = (sim.knb ?? 0) - knbCost;
    w.hooks.notify(sim, `Mua ${n > 1 ? `${n} ` : ''}${def.name}: ${knbCost.toLocaleString('vi-VN')} KNB.`);
    w.hooks.log(sim, 'buy', `Mua ${n > 1 ? `${n} ` : ''}${def.name}: −${knbCost.toLocaleString('vi-VN')} KNB.`);
    return true;
  }
  const cost = def.price * n;
  // Original NPC line (stringresource.txt 10089).
  if (cost > (sim.money ?? 0)) { w.hooks.notify(sim, 'Khách quan hình như chưa đủ tiền.'); return false; }
  if (isStackablePotion(def)) {
    const can = Math.max(0, MAX_BAG_POTIONS - bagPotionCount(sim.bag!));
    if (n > can) {
      w.hooks.notify(sim, can
        ? `Hành trang chỉ mang tối đa ${MAX_BAG_POTIONS} bình thuốc (còn chứa được ${can} bình).`
        : `Hành trang đã đạt tối đa ${MAX_BAG_POTIONS} bình thuốc.`);
      return false;
    }
  }
  const room = roomFor(sim.bag!, def, n);
  if (room < n) { w.hooks.notify(sim, room ? `Hành trang chỉ còn chỗ cho ${room} món.` : 'Hành trang không đủ chỗ.'); return false; }
  if (SHOP_OF[defId] === 'gold' && !devTools()) return false; // dev-only shop
  for (let k = 0; k < n; k++) addToBag(sim.bag!, def.gold ? createGold(def, newItemUid(), sim.stats?.luck ?? 5) : makeItem(defId)!);
  sim.money = (sim.money ?? 0) - cost;
  w.hooks.notify(sim, `Mua ${n > 1 ? `${n} ` : ''}${def.name}: ${moneyText(cost)} lượng.`);
  w.hooks.log(sim, 'buy', `Mua ${n > 1 ? `${n} ` : ''}${def.name}: −${moneyText(cost)} lượng.`);
  return true;
}

/**
 * Thợ rèn "Chế tạo": a new blue piece of a row the smith sells, with the asked ngũ hành and lines (items/magic.ts checks
 * them against magicattrib.txt), base values at their maximum. Town only; costs forgePrice.
 */
export function forgeItem(w: World, sim: Sim, defId: string, series: number, lines: ForgeLines, token = false): boolean {
  if (sim.a.stallTitle) return false;
  const def = ITEMS[defId];
  if (!def || SHOP_OF[defId] !== 'smith' || sim.dead) return false;
  // Lệnh bài "Nhận đồ xanh" (USER 2026-11-13): free, anywhere, while the character carries the lệnh bài.
  const viaToken = token && !!sim.bag?.some(it => it?.def === TOKEN_ITEM_ID);
  if (!w.rules.safe && !viaToken) { w.hooks.notify(sim, 'Chỉ chế tạo được trong thành.'); return false; }
  const err = forgeError(def, series, lines);
  if (err) { w.hooks.notify(sim, err); return false; }
  const cost = viaToken ? 0 : forgePrice(def, lines);
  if (cost > (sim.money ?? 0)) { w.hooks.notify(sim, 'Khách quan hình như chưa đủ tiền.'); return false; }
  const item = createItem(def, newItemUid(), () => 0.999999);
  item.series = series;
  const magic = forgedMagic(lines);
  if (magic.length) { item.magic = magic; item.q = QUALITY.magic; }
  if (!addToBag(sim.bag!, item)) { w.hooks.notify(sim, 'Hành trang không đủ chỗ.'); return false; }
  sim.money = (sim.money ?? 0) - cost;
  w.hooks.notify(sim, viaToken ? `Nhận ${def.name} (Lệnh bài).` : `Chế tạo ${def.name}: ${moneyText(cost)} lượng.`);
  w.hooks.log(sim, 'buy', viaToken ? `Nhận ${def.name} (Lệnh bài).` : `Chế tạo ${def.name}: −${moneyText(cost)} lượng.`);
  return true;
}

/** Move or swap a bag piece so its top-left cell is `to`. */
export function moveBagItem(sim: Sim, from: number, to: number): boolean {
  if (sim.a.stallTitle || !sim.bag) return false;
  const ok = moveOrSwapInGrid(sim.bag, from, to, BAG_SIZE);
  if (ok) {
    for (let i = STALL_SIZE; i < sim.bag.length; i++) {
      if (sim.bag[i]?.stallPrice) delete sim.bag[i]!.stallPrice;
    }
  }
  return ok;
}

/** Sort/compact one page of bag or stash. */
export function sortGrid(grid: Bag, page: number, size: number): boolean {
  return sortGridPage(grid, page, size);
}

/** Split `qty` units from a stacked item in bag or stash into a free slot. */
export function splitGridItem(grid: Bag, from: number, qty: number, size: number, to = -1): boolean {
  return splitStackInGrid(grid, from, qty, newItemUid, to, size);
}

/** Restore an account's shared stash (STASH_SIZE slots). */
export function restoreStash(raw: unknown): Bag {
  const list = Array.isArray(raw) ? raw : [];
  let stash: Bag = Array.from({ length: STASH_SIZE }, (_, i) => restoreItem(list[i], newItemUid));
  if (!bagValid(stash, STASH_SIZE)) {
    stash = packBag(stash.filter((it): it is Item => !!it), STASH_SIZE).bag;
  }
  return stash;
}

/** Move or swap a piece inside the account stash. */
export function moveStashItem(stash: Bag, from: number, to: number): boolean {
  return moveOrSwapInGrid(stash, from, to, STASH_SIZE);
}

/** Transfer a piece between two grids (bag <-> account stash), supporting swap when dropping onto 1 item. */
export function transferBetweenGrids(
  w: World, sim: Sim, src: Bag, srcSize: number, dst: Bag, dstSize: number,
  from: number, to?: number, page?: number, dstName = 'rương',
): boolean {
  if (sim.dead) return false;
  if (!w.rules.safe) { w.hooks.notify(sim, 'Chỉ sử dụng rương chứa đồ trong thành.'); return false; }
  const item = src[from];
  const def = itemDef(item);
  if (!item || !def || from < 0 || from >= srcSize) return false;
  if (dst === sim.bag && src !== sim.bag && isStackablePotion(def)) {
    if (bagPotionCount(dst) + itemQty(item) > MAX_BAG_POTIONS) {
      w.hooks.notify(sim, `Hành trang chỉ mang tối đa ${MAX_BAG_POTIONS} bình thuốc.`);
      return false;
    }
  }

  if (to !== undefined && Number.isInteger(to) && to >= 0 && to < dstSize) {
    if (fitsAt(dst, def, to, -1, undefined, dstSize)) {
      src[from] = null;
      dst[to] = item;
      return true;
    }
    const hits = overlappingAt(dst, def, to, -1, dstSize);
    if (hits && hits.length === 1) {
      const otherIdx = hits[0];
      const other = dst[otherIdx];
      const otherDef = itemDef(other);
      const maxStack = maxStackOf(def);
      if (other && other.def === item.def && maxStack > 1 && itemQty(other) < maxStack) {
        const take = Math.min(itemQty(item), maxStack - itemQty(other));
        other.qty = itemQty(other) + take;
        const rem = itemQty(item) - take;
        if (rem <= 0) src[from] = null; else item.qty = rem;
        return true;
      }
      if (other && otherDef && fitsAt(src, otherDef, from, from, undefined, srcSize)) {
        src[from] = other;
        dst[otherIdx] = null;
        dst[to] = item;
        return true;
      }
    }
    w.hooks.notify(sim, `Vị trí này trong ${dstName} không đủ chỗ.`);
    return false;
  }

  const targetPage = page !== undefined && Number.isInteger(page) && page >= 0 ? page : -1;
  if (targetPage < 0 && maxStackOf(def) > 1) {
    if (!addToBag(dst, item, dstSize)) {
      w.hooks.notify(sim, `${dstName.charAt(0).toUpperCase() + dstName.slice(1)} không đủ chỗ.`);
      return false;
    }
    src[from] = null;
    return true;
  }
  const place = findPlace(dst, def, -1, targetPage, dstSize);
  if (place < 0) {
    w.hooks.notify(sim, `${dstName.charAt(0).toUpperCase() + dstName.slice(1)} không đủ chỗ.`);
    return false;
  }
  src[from] = null;
  dst[place] = item;
  return true;
}

/** Deposit or withdraw money / KNB between a character and the account-shared stash. */
export function transferStashCurrency(
  w: World, sim: Sim, user: { stashMoney?: number; stashKnb?: number },
  op: 'deposit' | 'withdraw', currency: 'money' | 'knb', rawAmount: number,
): boolean {
  if (sim.dead) return false;
  if (!w.rules.safe) { w.hooks.notify(sim, 'Chỉ sử dụng rương chứa đồ trong thành.'); return false; }
  const amount = Math.floor(Number(rawAmount));
  if (!(amount > 0) || !Number.isFinite(amount)) return false;

  const isMoney = currency === 'money';
  const label = isMoney ? 'lượng' : 'Kim nguyên bảo';
  const fmt = (n: number) => (isMoney ? `${moneyText(n)} lượng` : `${n.toLocaleString('vi-VN')} Kim nguyên bảo`);
  const charVal = Math.max(0, Math.floor((isMoney ? sim.money : sim.knb) ?? 0));
  const stashVal = Math.max(0, Math.floor((isMoney ? user.stashMoney : user.stashKnb) ?? 0));

  if (op === 'deposit') {
    if (amount > charVal) { w.hooks.notify(sim, `Không đủ ${label} để gửi.`); return false; }
    if (stashVal + amount > MAX_MONEY) { w.hooks.notify(sim, `${isMoney ? 'Ngân lượng' : 'Kim nguyên bảo'} trong rương đã đạt giới hạn.`); return false; }
    if (isMoney) { sim.money = charVal - amount; user.stashMoney = stashVal + amount; }
    else { sim.knb = charVal - amount; user.stashKnb = stashVal + amount; }
    w.hooks.notify(sim, `Đã gửi ${fmt(amount)} vào rương chứa đồ.`);
    return true;
  }

  if (op === 'withdraw') {
    if (amount > stashVal) { w.hooks.notify(sim, `Trong rương không đủ ${label}.`); return false; }
    if (charVal + amount > MAX_MONEY) { w.hooks.notify(sim, `${isMoney ? 'Ngân lượng' : 'Kim nguyên bảo'} mang theo đã đạt giới hạn.`); return false; }
    if (isMoney) { user.stashMoney = stashVal - amount; sim.money = charVal + amount; }
    else { user.stashKnb = stashVal - amount; sim.knb = charVal + amount; }
    w.hooks.notify(sim, `Đã rút ${fmt(amount)} từ rương chứa đồ.`);
    return true;
  }

  return false;
}

/**
 * Sell the piece in bag slot `index` (a quarter of its table price). Anywhere: the hành trang has its own "Bán" button
 * (USER 2026-11-12), not only an NPC shop in town.
 */
export function sellItem(w: World, sim: Sim, index: number): boolean {
  if (sim.a.stallTitle) return false;
  const item = sim.bag?.[index];
  const def = itemDef(item);
  if (!item || !def || sim.dead) return false;
  const qty = itemQty(item);
  const gain = sellPrice(def) * qty;
  delete item.stallPrice;
  sim.bag![index] = null;
  addMoney(sim, gain);
  w.hooks.notify(sim, `Bán ${qty > 1 ? `${qty} ` : ''}${def.name}: ${moneyText(gain)} lượng.`);
  w.hooks.log(sim, 'sell', `Bán ${qty > 1 ? `${qty} ` : ''}${def.name}: +${moneyText(gain)} lượng.`);
  return true;
}

/** Use the piece in bag slot `index` (thuốc: drunk at once, its pumps start; systems/potions.ts). */
export function useItem(w: World, sim: Sim, index: number): boolean {
  if (sim.a.stallTitle) return false;
  const item = sim.bag?.[index];
  const def = itemDef(item);
  if (!item || !def || sim.dead) return false;
  if (!usableItem(def)) { w.hooks.notify(sim, `${def.name} chưa dùng được.`); return false; }
  if (def.kind === 'token') { w.hooks.notify(sim, 'Mở Lệnh bài trong hành trang (chuột phải).'); return false; }
  if (def.kind === 'portal') { useTownPortal(w, sim); return false; } // vĩnh cửu: never used up
  if (def.book) {
    if (!useBook(w, sim, def.book)) return false;
    sim.bag![index] = null;
    return true;
  }
  if (def.elixir) {
    const qty = itemQty(item);
    if (qty > 1) item.qty = qty - 1; else sim.bag![index] = null;
    sim.expBuff = { until: Date.now() + def.elixir.durationMs, tier: def.elixir.tier };
    const mul = getExpElixirMultiplier(def.elixir.tier);
    const hours = Math.round((def.elixir.durationMs / 3_600_000) * 10) / 10;
    w.hooks.notify(sim, `Đã dùng ${def.name}: nhân ${mul} lần kinh nghiệm trong ${hours} giờ.`);
    w.hooks.progress(sim);
    return true;
  }
  const qty = itemQty(item);
  if (qty > 1) item.qty = qty - 1; else sim.bag![index] = null;
  drinkPotion(sim, def);
  return true;
}

/** Thổ Địa Phù: back to the entrance of the nearest city (maps/index.ts nearestTown), Biện Kinh when unknown / not built. */
function useTownPortal(w: World, sim: Sim): void {
  const town = nearestTown(w.meta.id, id => fs.existsSync(path.join(MAPS_DIR, String(id), 'nav.json')));
  const entry = MAPS[town].raw.entry;
  sim.pending = null;
  sim.path = [];
  w.hooks.notify(sim, `Thổ Địa Phù: về ${MAPS[town].name}.`);
  w.hooks.transfer(sim, town, entry.x, entry.y);
}

/** Add money to the purse, capped at MAX_MONEY (sales, drops, the lệnh bài, the dev button). False for nothing to add. */
export function addMoney(sim: Sim, amount: number): boolean {
  const n = Math.floor(amount);
  if (!(n > 0)) return false;
  sim.money = Math.min(MAX_MONEY, (sim.money ?? 0) + n);
  return true;
}

/** Throw the piece in bag slot `index` on the ground (systems/drops.ts throwItem; the thrower may pick it up again). */
export function discardItem(w: World, sim: Sim, index: number): boolean {
  if (sim.a.stallTitle) return false;
  const item = sim.bag?.[index];
  const def = itemDef(item);
  if (!item || !def || sim.dead) return false;
  delete item.stallPrice;
  sim.bag![index] = null;
  throwItem(w, sim, item);
  w.hooks.notify(sim, `Đã vứt ${def.name} xuống đất.`);
  return true;
}

/** Paper-doll rows, the weapon the skills use and the stats (world/progress.ts refreshStats) from the worn items. */
export function applyEquipment(sim: Sim, fresh = false): void {
  const equip = sim.equip!;
  const look = lookOf(equip);
  sim.a.helm = look.helm;
  sim.a.armor = look.armor;
  sim.a.weapon = look.weapon;
  sim.a.mantle = look.mantle;
  // The horse slot: taking the horse off also dismounts.
  const horse = equip.horse?.def;
  sim.a.horse = horse && HORSES[horse] ? horse : '';
  if (!sim.a.horse && sim.a.mounted) sim.a.mounted = false;
  updateSpeed(sim);
  sim.weaponType = weaponTypeOf(itemDef(equip.weapon));
  refreshStats(sim, fresh);
}

/**
 * Stored hành trang as this build knows it (older builds saved table ids: a fresh piece is made for each). Bags saved
 * before the size grid (one cell per piece) are laid out again; what does not fit waits in `spill` (saved with the
 * character) and goes back in as soon as there is room when the character enters again. Nothing is thrown away.
 */
export function restoreBag(raw: unknown, rawSpill?: unknown): { bag: Bag; spill: Item[] } {
  const list = Array.isArray(raw) ? raw : [];
  let bag: Bag = Array.from({ length: BAG_SIZE }, (_, i) => restoreItem(list[i], newItemUid));
  const spill = (Array.isArray(rawSpill) ? rawSpill : []).map(r => restoreItem(r, newItemUid)).filter((it): it is Item => !!it);
  const waiting: Item[] = [];
  if (!bagValid(bag)) {
    const packed = packBag(bag.filter((it): it is Item => !!it));
    bag = packed.bag;
    waiting.push(...packed.lost);
  }
  for (const item of spill) if (!addToBag(bag, item)) waiting.push(item);
  if (waiting.length) console.warn(`[bag] ${waiting.length} món chờ chỗ trong hành trang lưới (bagSpill): ${waiting.map(it => it.def).join(', ')}`);
  return { bag, spill: waiting };
}

/** Stored worn items this build still knows, each in a slot it fits. */
export function restoreEquipment(raw: unknown): Equipment {
  const out: Equipment = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [slot, value] of Object.entries(raw)) {
    const item = restoreItem(value, newItemUid);
    const def = itemDef(item);
    if (item && def && KIND_SLOTS[def.kind].includes(slot as EquipSlot)) out[slot as EquipSlot] = item;
  }
  return out;
}

/** New pieces for a starter outfit (table rows per slot). */
export function outfitItems(outfit: Outfit): Equipment {
  const out: Equipment = {};
  for (const [slot, defId] of Object.entries(outfit)) {
    const item = defId ? makeItem(defId) : null;
    if (item) out[slot as EquipSlot] = item;
  }
  return out;
}
