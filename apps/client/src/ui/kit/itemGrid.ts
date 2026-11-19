import { localPoint } from './viewport';
import { BAG_CELL_PX, BAG_COLS, BAG_PAGE_SIZE, BAG_ROWS, itemSize, type ItemDef } from '@vltk/shared';

export type GridSource = 'bag' | 'stash' | 'stall';

export interface ActiveGridDrag {
  source: GridSource;
  index: number;
  grab: [number, number];
  def?: ItemDef;
}

let activeDrag: ActiveGridDrag | null = null;
let previewEl: HTMLElement | null = null;

export const getActiveGridDrag = (): ActiveGridDrag | null => activeDrag;
export const setActiveGridDrag = (drag: ActiveGridDrag | null): void => {
  activeDrag = drag;
  if (!drag) clearGridDropPreview();
};

/** Compute the target grid slot index under a pointer DragEvent, respecting grab offset. */
export function gridCellAt(gridEl: HTMLElement, e: DragEvent, grab: [number, number], page: number): number {
  const [px, py] = localPoint(gridEl, e.clientX, e.clientY);
  const x = Math.floor((px - grab[0]) / BAG_CELL_PX + 0.5);
  const y = Math.floor((py - grab[1]) / BAG_CELL_PX + 0.5);
  return x < 0 || y < 0 || x >= BAG_COLS || y >= BAG_ROWS ? -1 : page * BAG_PAGE_SIZE + y * BAG_COLS + x;
}

/** Highlight the exact cell footprint where a dragged item will land in a 6×10 grid. */
export function updateGridDropPreview(gridEl: HTMLElement, to: number, def: ItemDef | undefined, ok: boolean): void {
  if (to < 0 || !def) {
    clearGridDropPreview(gridEl);
    return;
  }
  const [w, h] = itemSize(def);
  const local = to % BAG_PAGE_SIZE;
  const col = local % BAG_COLS;
  const row = Math.floor(local / BAG_COLS);
  const visW = Math.max(1, Math.min(w, BAG_COLS - col));
  const visH = Math.max(1, Math.min(h, BAG_ROWS - row));
  const inBounds = col + w <= BAG_COLS && row + h <= BAG_ROWS;
  if (!previewEl) {
    previewEl = document.createElement('div');
    previewEl.className = 'grid-drop-preview';
  }
  if (previewEl.parentElement !== gridEl) gridEl.appendChild(previewEl);
  previewEl.style.left = `${col * BAG_CELL_PX}px`;
  previewEl.style.top = `${row * BAG_CELL_PX}px`;
  previewEl.style.width = `${visW * BAG_CELL_PX}px`;
  previewEl.style.height = `${visH * BAG_CELL_PX}px`;
  previewEl.classList.toggle('ok', ok && inBounds);
  previewEl.classList.toggle('bad', !ok || !inBounds);
}

/** Remove the drop highlight from `gridEl` (or everywhere if omitted). */
export function clearGridDropPreview(gridEl?: HTMLElement): void {
  if (!previewEl) return;
  if (!gridEl || previewEl.parentElement === gridEl) previewEl.remove();
}
