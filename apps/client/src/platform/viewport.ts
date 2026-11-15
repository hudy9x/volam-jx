/** Fixed world frames. Backing pixels and CSS size are independent of device DPR. */
export const RENDER_SCALE = 2;
export const VIEWPORTS = {
  '1280x720': { width: 1280, height: 720 },
  '1280x800': { width: 1280, height: 800 },
} as const;
export type ViewportId = keyof typeof VIEWPORTS;
export type ViewportChoice = ViewportId | 'auto';
export interface ViewportLayout {
  id: ViewportId;
  width: number;
  height: number;
  scale: number;
  left: number;
  top: number;
}
export function viewportChoice(value: unknown): ViewportChoice {
  return value === '1280x720' || value === '1280x800' ? value : 'auto';
}
export function computeViewport(width: number, height: number, choice: ViewportChoice = 'auto'): ViewportLayout {
  const w = Math.max(1, width), h = Math.max(1, height);
  const id = choice === 'auto'
    ? (Math.abs(Math.log((w / h) / (1280 / 720))) <= Math.abs(Math.log((w / h) / (1280 / 800))) ? '1280x720' : '1280x800')
    : choice;
  const frame = VIEWPORTS[id];
  const scale = Math.min(w / frame.width, h / frame.height);
  return { id, ...frame, scale, left: (w - frame.width * scale) / 2, top: (h - frame.height * scale) / 2 };
}

let current: ViewportLayout | null = null;
const listeners = new Set<(layout: ViewportLayout | null) => void>();
export const gameViewport = () => current;
export function publishViewport(layout: ViewportLayout | null): void {
  current = layout;
  for (const fn of listeners) fn(layout);
}
export function watchViewport(fn: (layout: ViewportLayout | null) => void): () => void {
  listeners.add(fn);
  fn(current);
  return () => { listeners.delete(fn); };
}
