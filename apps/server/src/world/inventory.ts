import { moneyText } from '@vltk/shared';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  BAG_SIZE, BUY_MAX, HORSES, ITEMS, MAPS, TOKEN_ITEM_ID, nearestTown, KIND_SLOTS, MAX_MONEY, QUALITY, SHOP_OF, addToBag, bagValid, createGold, createItem,
  equipError, findPlace, fitsAt, forgeError, forgePrice, forgedMagic, itemDef, lookOf, packBag, restoreItem,
  roomFor, sellPrice, usableItem, weaponTypeOf,
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
  sim.equip![slot] = item;
  applyEquipment(sim);
  return true;
}

/** Take off a worn item into the first free bag slot. */
export function unequipItem(w: World, sim: Sim, slot: string): boolean {
  const item = sim.equip?.[slot as EquipSlot];
  if (!item || sim.dead) return false;
  if (!addToBag(sim.bag!, item)) { w.hooks.notify(sim, 'Hành trang không đủ chỗ.'); return false; }
  delete sim.equip![slot as EquipSlot];
  applyEquipment(sim);
  return true;
}

/**
 * Buy `count` new pieces of a row an NPC shop sells (items/shops.ts), at its table price, in town only. Each piece takes
 * its own bag cell (the original potions do not stack: potion.txt "是否叠放" = 0).
 */
export function buyItem(w: World, sim: Sim, defId: string, count = 1): boolean {
  const def = ITEMS[defId];
  if (!def || !SHOP_OF[defId] || sim.dead) return false;
  if (!w.rules.safe) { w.hooks.notify(sim, 'Chỉ mua được đồ trong thành.'); return false; }
  const n = Math.max(1, Math.min(BUY_MAX, Math.floor(count) || 1));
  const cost = def.price * n;
  // Original NPC line (stringresource.txt 10089).
  if (cost > (sim.money ?? 0)) { w.hooks.notify(sim, 'Khách quan hình như chưa đủ tiền.'); return false; }
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

/** Move a bag piece so its top-left cell is `to` (where it fits, the cells it leaves counting as free). */
export function moveBagItem(sim: Sim, from: number, to: number): boolean {
  const bag = sim.bag!;
  const item = bag[from];
  if (!item || from === to || !fitsAt(bag, itemDef(item), to, from)) return false;
  bag[from] = null;
  bag[to] = item;
  return true;
}

/**
 * Sell the piece in bag slot `index` (a quarter of its table price). Anywhere: the hành trang has its own "Bán" button
 * (USER 2026-11-12), not only an NPC shop in town.
 */
export function sellItem(w: World, sim: Sim, index: number): boolean {
  const item = sim.bag?.[index];
  const def = itemDef(item);
  if (!item || !def || sim.dead) return false;
  const gain = sellPrice(def);
  sim.bag![index] = null;
  addMoney(sim, gain);
  w.hooks.notify(sim, `Bán ${def.name}: ${moneyText(gain)} lượng.`);
  w.hooks.log(sim, 'sell', `Bán ${def.name}: +${moneyText(gain)} lượng.`);
  return true;
}

/** Use the piece in bag slot `index` (thuốc: drunk at once, its pumps start; systems/potions.ts). */
export function useItem(w: World, sim: Sim, index: number): boolean {
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
  sim.bag![index] = null;
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
  const item = sim.bag?.[index];
  const def = itemDef(item);
  if (!item || !def || sim.dead) return false;
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
