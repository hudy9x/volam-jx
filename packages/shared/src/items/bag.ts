// Hành trang as a grid like the original (ui3/随身物品.ini [ItemBox]: HUnits 6, VUnits 10, 168 x 280 px = 28 px cells):
// each piece takes `ItemDef.size` cells (áo 2 x 3, nhẫn 1 x 1…). A bag is BAG_SIZE entries; a piece sits at the index of
// its top-left cell and the other cells it covers stay null (BACKLOG TB18). The bag has BAG_PAGES pages (hành trang +
// 4 rương mở rộng): index = page × BAG_PAGE_SIZE + row × BAG_COLS + col; a piece never spans two pages.
import {
  BAG_PAGE_SIZE, BAG_SIZE, itemDef, itemQty, maxStackOf,
  type Bag, type Item, type ItemDef,
} from './items.js';
import { MAX_BAG_POTIONS } from './stack-config.js';
import { bagPotionCount, isStackablePotion } from './items.js';

export const BAG_COLS = 6;
export const BAG_ROWS = 10;
/** Pixel size of one bag cell in the original window. */
export const BAG_CELL_PX = 28;

/** Cells a row takes: [width, height], within the bag. */
export function itemSize(def: ItemDef | undefined): [number, number] {
  const [w, h] = def?.size ?? [1, 1];
  return [Math.max(1, Math.min(BAG_COLS, w || 1)), Math.max(1, Math.min(BAG_ROWS, h || 1))];
}

/** Page of a bag index. */
export const bagPage = (i: number): number => Math.floor(i / BAG_PAGE_SIZE);
/** Column, row (within its page) and page of a bag index. */
function cellOf(i: number): [number, number, number] {
  const local = i % BAG_PAGE_SIZE;
  return [local % BAG_COLS, Math.floor(local / BAG_COLS), bagPage(i)];
}
const indexOf = (x: number, y: number, page: number) => page * BAG_PAGE_SIZE + y * BAG_COLS + x;

/** For each cell, the index of the piece covering it (-1: free). `skip` = indices to leave out (being moved/swapped). */
export function bagCover(bag: Bag, skip: number | number[] = -1, size = bag.length || BAG_SIZE): number[] {
  const cover = Array<number>(size).fill(-1);
  const skipSet = Array.isArray(skip) ? new Set(skip) : null;
  for (let i = 0; i < Math.min(bag.length, size); i++) {
    const item = bag[i];
    if (!item || (skipSet ? skipSet.has(i) : i === skip)) continue;
    const [w, h] = itemSize(itemDef(item));
    const [x0, y0, page] = cellOf(i);
    for (let y = y0; y < Math.min(BAG_ROWS, y0 + h); y++)
      for (let x = x0; x < Math.min(BAG_COLS, x0 + w); x++) cover[indexOf(x, y, page)] = i;
  }
  return cover;
}

/** Whether `def` fits with its top-left cell at `at` (cells covered by `skip` count as free). */
export function fitsAt(
  bag: Bag, def: ItemDef | undefined, at: number, skip: number | number[] = -1,
  cover?: number[], size = bag.length || BAG_SIZE,
): boolean {
  if (!def || !Number.isInteger(at) || at < 0 || at >= size) return false;
  const grid = cover ?? bagCover(bag, skip, size);
  const [w, h] = itemSize(def);
  const [x0, y0, page] = cellOf(at);
  if (x0 + w > BAG_COLS || y0 + h > BAG_ROWS) return false;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (grid[indexOf(x, y, page)] >= 0) return false;
  return true;
}

/**
 * First top-left cell (page by page, row by row) where `def` fits; -1 when the bag has no room for it. `page` = only that
 * page (dropping a piece on a rương tab).
 */
export function findPlace(bag: Bag, def: ItemDef | undefined, skip: number | number[] = -1, page = -1, size = bag.length || BAG_SIZE): number {
  const cover = bagCover(bag, skip, size);
  const from = page >= 0 ? page * BAG_PAGE_SIZE : 0;
  const to = page >= 0 ? Math.min(size, from + BAG_PAGE_SIZE) : size;
  for (let at = from; at < to; at++) if (fitsAt(bag, def, at, skip, cover, size)) return at;
  return -1;
}

/** Whether every piece of a bag sits inside it without overlapping another. */
export function bagValid(bag: Bag, size = BAG_SIZE): boolean {
  const used = Array<boolean>(size).fill(false);
  for (let i = 0; i < bag.length; i++) {
    const item = bag[i];
    if (!item) continue;
    if (i >= size) return false;
    const [w, h] = itemSize(itemDef(item));
    const [x0, y0, page] = cellOf(i);
    if (x0 + w > BAG_COLS || y0 + h > BAG_ROWS) return false;
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
      if (used[indexOf(x, y, page)]) return false;
      used[indexOf(x, y, page)] = true;
    }
  }
  return true;
}

/** Lay pieces out again, biggest first; `lost` = what did not fit. */
export function packBag(items: Item[], size = BAG_SIZE): { bag: Bag; lost: Item[] } {
  const bag: Bag = Array(size).fill(null);
  const lost: Item[] = [];
  const area = (it: Item) => { const [w, h] = itemSize(itemDef(it)); return w * h; };
  for (const item of [...items].sort((a, b) => area(b) - area(a))) {
    const at = findPlace(bag, itemDef(item), -1, -1, size);
    if (at < 0) lost.push(item); else bag[at] = item;
  }
  return { bag, lost };
}

/** Merge stackable items of the same `def` up to `maxStackOf(def)`, preserving order. */
function mergeStacks(items: Item[]): Item[] {
  const out: Item[] = [];
  for (const raw of items) {
    const def = itemDef(raw);
    const maxStack = maxStackOf(def);
    if (maxStack <= 1) { out.push(raw); continue; }
    let rem = itemQty(raw);
    for (const existing of out) {
      if (existing.def !== raw.def) continue;
      const cur = itemQty(existing);
      if (cur >= maxStack) continue;
      const take = Math.min(rem, maxStack - cur);
      existing.qty = cur + take;
      rem -= take;
      if (rem <= 0) break;
    }
    if (rem > 0) out.push(rem === itemQty(raw) ? raw : { ...raw, qty: rem });
  }
  return out;
}

/** Put `item` into existing stacks first (if stackable), then the first place it fits; false when there is none. */
export function addToBag(bag: Bag, item: Item, size = bag.length || BAG_SIZE): boolean {
  const def = itemDef(item);
  const maxStack = maxStackOf(def);
  if (maxStack <= 1) {
    const at = findPlace(bag, def, -1, -1, size);
    if (at < 0) return false;
    bag[at] = item;
    return true;
  }
  const limit = Math.min(bag.length, size);
  let rem = itemQty(item);
  const fills: { index: number; add: number }[] = [];
  for (let i = 0; i < limit && rem > 0; i++) {
    const existing = bag[i];
    if (!existing || existing.def !== item.def) continue;
    const cur = itemQty(existing);
    if (cur >= maxStack) continue;
    const add = Math.min(rem, maxStack - cur);
    fills.push({ index: i, add });
    rem -= add;
  }
  const placements: { at: number; qty: number }[] = [];
  if (rem > 0) {
    const sim = [...bag];
    while (rem > 0) {
      const at = findPlace(sim, def, -1, -1, size);
      if (at < 0) return false;
      const qty = Math.min(rem, maxStack);
      sim[at] = { ...item, qty };
      placements.push({ at, qty });
      rem -= qty;
    }
  }
  for (const f of fills) bag[f.index]!.qty = itemQty(bag[f.index]) + f.add;
  for (let k = 0; k < placements.length; k++) {
    const p = placements[k];
    bag[p.at] = k === 0 && fills.length === 0 && placements.length === 1
      ? (p.qty > 1 ? { ...item, qty: p.qty } : item)
      : { ...item, uid: k === 0 ? item.uid : `${item.uid}-${k}`, qty: p.qty };
  }
  return true;
}

/** How many pieces of `def` the bag can still take (accounting for stacking and bag potion cap). */
export function roomFor(bag: Bag, def: ItemDef, upTo: number, size = bag.length || BAG_SIZE): number {
  let limit = Math.max(0, Math.floor(upTo));
  if (size === BAG_SIZE && isStackablePotion(def)) {
    limit = Math.min(limit, Math.max(0, MAX_BAG_POTIONS - bagPotionCount(bag)));
  }
  if (limit <= 0) return 0;
  const maxStack = maxStackOf(def);
  let n = 0;
  if (maxStack > 1) {
    const bagLen = Math.min(bag.length, size);
    for (let i = 0; i < bagLen && n < limit; i++) {
      const it = bag[i];
      if (!it || it.def !== def.id) continue;
      const space = maxStack - itemQty(it);
      if (space > 0) n += Math.min(space, limit - n);
    }
  }
  if (n >= limit) return n;
  const copy = [...bag];
  while (n < limit) {
    const at = findPlace(copy, def, -1, -1, size);
    if (at < 0) break;
    copy[at] = { uid: '', def: def.id };
    n += Math.min(maxStack, limit - n);
  }
  return n;
}

/** Indices of distinct items overlapping the footprint of `def` placed at `at` (ignoring `skip`). */
export function overlappingAt(bag: Bag, def: ItemDef | undefined, at: number, skip = -1, size = bag.length || BAG_SIZE): number[] | null {
  if (!def || !Number.isInteger(at) || at < 0 || at >= size) return null;
  const [w, h] = itemSize(def);
  const [x0, y0, page] = cellOf(at);
  if (x0 + w > BAG_COLS || y0 + h > BAG_ROWS) return null;
  const cover = bagCover(bag, skip, size);
  const hit = new Set<number>();
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const idx = cover[indexOf(x, y, page)];
      if (idx >= 0) hit.add(idx);
    }
  }
  return [...hit];
}

/** Move `from` to `to`, or swap if `to` overlaps at most 1 item that fits back into `from` (or the same page). */
export function moveOrSwapInGrid(bag: Bag, from: number, to: number, size = bag.length || BAG_SIZE): boolean {
  const item = bag[from];
  const def = itemDef(item);
  if (!item || !def || from === to || from < 0 || from >= size) return false;
  const hits = overlappingAt(bag, def, to, from, size);
  if (!hits) return false;
  if (hits.length === 0) {
    bag[from] = null;
    bag[to] = item;
    return true;
  }
  if (hits.length !== 1) return false;
  const otherIdx = hits[0];
  const other = bag[otherIdx];
  const otherDef = itemDef(other);
  if (!other || !otherDef) return false;
  const maxStack = maxStackOf(def);
  if (maxStack > 1 && other.def === item.def && itemQty(other) < maxStack) {
    const take = Math.min(itemQty(item), maxStack - itemQty(other));
    other.qty = itemQty(other) + take;
    const rem = itemQty(item) - take;
    if (rem <= 0) bag[from] = null; else item.qty = rem;
    return true;
  }
  // Simulate placing `item` at `to` with both `from` and `otherIdx` cleared.
  const simCover = bagCover(bag, [from, otherIdx], size);
  const [w, h] = itemSize(def);
  const [x0, y0, page] = cellOf(to);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) simCover[indexOf(x, y, page)] = to;
  let otherDest = fitsAt(bag, otherDef, from, [from, otherIdx], simCover, size) ? from : -1;
  if (otherDest < 0) {
    const fromPage = bagPage(from);
    const start = fromPage * BAG_PAGE_SIZE;
    const end = Math.min(size, start + BAG_PAGE_SIZE);
    for (let at = start; at < end; at++) {
      if (fitsAt(bag, otherDef, at, [from, otherIdx], simCover, size)) { otherDest = at; break; }
    }
  }
  if (otherDest < 0) return false;
  bag[from] = null;
  bag[otherIdx] = null;
  bag[to] = item;
  bag[otherDest] = other;
  return true;
}

/** Compact and sort all items on `page` (or the whole grid when `page === -1`), merging stackable items first. */
export function sortGridPage(bag: Bag, page: number, size = bag.length || BAG_SIZE): boolean {
  const all = page === -1;
  const start = all ? 0 : page * BAG_PAGE_SIZE;
  const end = all ? size : Math.min(size, start + BAG_PAGE_SIZE);
  if ((!all && page < 0) || start >= size) return false;
  const raw: Item[] = [];
  for (let i = start; i < end; i++) {
    const it = bag[i];
    if (it) { raw.push(it); bag[i] = null; }
  }
  if (!raw.length) return false;
  const items = mergeStacks(raw);
  const area = (it: Item) => { const [w, h] = itemSize(itemDef(it)); return w * h; };
  items.sort((a, b) => area(b) - area(a) || (itemDef(a)?.name ?? '').localeCompare(itemDef(b)?.name ?? ''));
  for (const item of items) {
    const at = findPlace(bag, itemDef(item), -1, all ? -1 : page, size);
    if (at >= 0) bag[at] = item;
  }
  return true;
}

/** Split `qty` units out of a stacked item at `from` into `to` (or first free cell on the same page / whole grid). */
export function splitStackInGrid(
  bag: Bag, from: number, qty: number, newUid: () => string, to = -1, size = bag.length || BAG_SIZE,
): boolean {
  const item = bag[from];
  const def = itemDef(item);
  const cur = itemQty(item);
  const maxStack = maxStackOf(def);
  const splitQty = Math.floor(qty);
  if (!item || !def || maxStack <= 1 || cur <= 1 || !Number.isInteger(splitQty) || splitQty < 1 || splitQty >= cur) return false;
  if (from < 0 || from >= size) return false;

  let dest = -1;
  if (to >= 0 && to < size && to !== from) {
    const existing = bag[to];
    if (existing && existing.def === item.def && itemQty(existing) + splitQty <= maxStack) {
      existing.qty = itemQty(existing) + splitQty;
      item.qty = cur - splitQty;
      return true;
    }
    if (fitsAt(bag, def, to, -1, undefined, size)) dest = to;
  }
  if (dest < 0) dest = findPlace(bag, def, -1, bagPage(from), size);
  if (dest < 0) dest = findPlace(bag, def, -1, -1, size);
  if (dest < 0) return false;

  item.qty = cur - splitQty;
  bag[dest] = { ...item, uid: newUid(), qty: splitQty };
  return true;
}
