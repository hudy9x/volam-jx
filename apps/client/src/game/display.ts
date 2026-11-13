/**
 * The canvas is rendered at device pixels (1 art pixel = 1 screen pixel, as in the original client) even when
 * the OS scales the page (125 %, 150 % …). World-space text and bars are sized with `ui()` so they stay
 * readable; the art itself is never scaled unless the player zooms with the mouse wheel.
 */
export const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
export const ui = (px: number) => Math.round(px * DPR);
export const uiPx = (px: number) => `${ui(px)}px`;
