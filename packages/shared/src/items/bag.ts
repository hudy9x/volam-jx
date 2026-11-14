// Hành trang as a grid like the original (ui3/随身物品.ini [ItemBox]: HUnits 6, VUnits 10, 168 x 280 px = 28 px cells):
// each piece takes `ItemDef.size` cells (áo 2 x 3, nhẫn 1 x 1…). A bag is BAG_SIZE entries; a piece sits at the index of
// its top-left cell and the other cells it covers stay null (BACKLOG TB18). The bag has BAG_PAGES pages (hành trang +
// 4 rương mở rộng): index = page × BAG_PAGE_SIZE + row × BAG_COLS + col; a piece never spans two pages.
import { BAG_PAGE_SIZE, BAG_SIZE, itemDef, type Bag, type Item, type ItemDef } from './items.js';

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

/** Put `item` into the first place it fits; false when there is none. */
export function addToBag(bag: Bag, item: Item, size = bag.length || BAG_SIZE): boolean {
  const at = findPlace(bag, itemDef(item), -1, -1, size);
  if (at < 0) return false;
  bag[at] = item;
  return true;
}

/** How many pieces of `def` the bag can still take (each in its own place). */
export function roomFor(bag: Bag, def: ItemDef, upTo: number, size = bag.length || BAG_SIZE): number {
  const copy = [...bag];
  let n = 0;
  while (n < upTo) {
    const at = findPlace(copy, def, -1, -1, size);
    if (at < 0) break;
    copy[at] = { uid: '', def: def.id };
    n++;
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

/** Compact and sort all items on `page` (largest first, then by name). */
export function sortGridPage(bag: Bag, page: number, size = bag.length || BAG_SIZE): boolean {
  const start = page * BAG_PAGE_SIZE;
  const end = Math.min(size, start + BAG_PAGE_SIZE);
  if (page < 0 || start >= size) return false;
  const items: Item[] = [];
  for (let i = start; i < end; i++) {
    const it = bag[i];
    if (it) { items.push(it); bag[i] = null; }
  }
  if (!items.length) return false;
  const area = (it: Item) => { const [w, h] = itemSize(itemDef(it)); return w * h; };
  items.sort((a, b) => area(b) - area(a) || (itemDef(a)?.name ?? '').localeCompare(itemDef(b)?.name ?? ''));
  for (const item of items) {
    const at = findPlace(bag, itemDef(item), -1, page, size);
    if (at >= 0) bag[at] = item;
  }
  return true;
}
