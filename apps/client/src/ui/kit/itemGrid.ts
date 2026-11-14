import { BAG_CELL_PX, BAG_COLS, BAG_PAGE_SIZE, BAG_ROWS } from '@vltk/shared';

export type GridSource = 'bag' | 'stash';

export interface ActiveGridDrag {
  source: GridSource;
  index: number;
  grab: [number, number];
}

let activeDrag: ActiveGridDrag | null = null;

export const getActiveGridDrag = (): ActiveGridDrag | null => activeDrag;
export const setActiveGridDrag = (drag: ActiveGridDrag | null): void => { activeDrag = drag; };

/** Compute the target grid slot index under a pointer DragEvent, respecting grab offset. */
export function gridCellAt(gridEl: HTMLElement, e: DragEvent, grab: [number, number], page: number): number {
  const r = gridEl.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left - grab[0]) / BAG_CELL_PX + 0.5);
  const y = Math.floor((e.clientY - r.top - grab[1]) / BAG_CELL_PX + 0.5);
  return x < 0 || y < 0 || x >= BAG_COLS || y >= BAG_ROWS ? -1 : page * BAG_PAGE_SIZE + y * BAG_COLS + x;
}

