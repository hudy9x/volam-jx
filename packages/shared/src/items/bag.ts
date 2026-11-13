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

/** For each cell, the index of the piece covering it (-1: free). `skip` = a piece to leave out (being moved). */
export function bagCover(bag: Bag, skip = -1): number[] {
  const cover = Array<number>(BAG_SIZE).fill(-1);
  bag.forEach((item, i) => {
    if (!item || i === skip || i >= BAG_SIZE) return;
    const [w, h] = itemSize(itemDef(item));
    const [x0, y0, page] = cellOf(i);
    for (let y = y0; y < Math.min(BAG_ROWS, y0 + h); y++)
      for (let x = x0; x < Math.min(BAG_COLS, x0 + w); x++) cover[indexOf(x, y, page)] = i;
  });
  return cover;
}

/** Whether `def` fits with its top-left cell at `at` (cells covered by `skip` count as free). */
export function fitsAt(bag: Bag, def: ItemDef | undefined, at: number, skip = -1, cover = bagCover(bag, skip)): boolean {
  if (!def || !Number.isInteger(at) || at < 0 || at >= BAG_SIZE) return false;
  const [w, h] = itemSize(def);
  const [x0, y0, page] = cellOf(at);
  if (x0 + w > BAG_COLS || y0 + h > BAG_ROWS) return false;
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (cover[indexOf(x, y, page)] >= 0) return false;
  return true;
}

/**
 * First top-left cell (page by page, row by row) where `def` fits; -1 when the bag has no room for it. `page` = only that
 * page (dropping a piece on a rương tab).
 */
export function findPlace(bag: Bag, def: ItemDef | undefined, skip = -1, page = -1): number {
  const cover = bagCover(bag, skip);
  const from = page >= 0 ? page * BAG_PAGE_SIZE : 0;
  const to = page >= 0 ? from + BAG_PAGE_SIZE : BAG_SIZE;
  for (let at = from; at < to; at++) if (fitsAt(bag, def, at, skip, cover)) return at;
  return -1;
}

/** Whether every piece of a bag sits inside it without overlapping another. */
export function bagValid(bag: Bag): boolean {
  const used = Array<boolean>(BAG_SIZE).fill(false);
  for (let i = 0; i < bag.length; i++) {
    const item = bag[i];
    if (!item) continue;
    if (i >= BAG_SIZE) return false;
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
export function packBag(items: Item[]): { bag: Bag; lost: Item[] } {
  const bag: Bag = Array(BAG_SIZE).fill(null);
  const lost: Item[] = [];
  const area = (it: Item) => { const [w, h] = itemSize(itemDef(it)); return w * h; };
  for (const item of [...items].sort((a, b) => area(b) - area(a))) {
    const at = findPlace(bag, itemDef(item));
    if (at < 0) lost.push(item); else bag[at] = item;
  }
  return { bag, lost };
}

/** Put `item` into the first place it fits; false when there is none. */
export function addToBag(bag: Bag, item: Item): boolean {
  const at = findPlace(bag, itemDef(item));
  if (at < 0) return false;
  bag[at] = item;
  return true;
}

/** How many pieces of `def` the bag can still take (each in its own place). */
export function roomFor(bag: Bag, def: ItemDef, upTo: number): number {
  const copy = [...bag];
  let n = 0;
  while (n < upTo) {
    const at = findPlace(copy, def);
    if (at < 0) break;
    copy[at] = { uid: '', def: def.id };
    n++;
  }
  return n;
}
