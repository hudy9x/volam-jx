// Ported from jx-web-main/src/client/maps/types.ts (navigation subset).
export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface GridDefinition {
  kind: 'grid';
  cellSize: Size;
  columns: number;
  rows: number;
  /** 1 bit per cell, row-major, LSB first; 1 = blocked. */
  blockedBase64: string;
}
export interface NavigationGrid {
  w: number; h: number; gw: number; gh: number; cw: number; ch: number;
  ok: Uint8Array; free: number; comp: Int32Array; isl: number[];
}
