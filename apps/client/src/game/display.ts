/**
 * The canvas is rendered at device pixels (1 art pixel = 1 screen pixel, as in the original client) even when
 * the OS scales the page (125 %, 150 % …). World-space text and bars are sized with `ui()` so they stay
 * readable; when the camera zooms in (100 % – 300 %), world-space labels and HP bars scale down via `ZOOM_PLATES`
 * so they stay proportional to the character instead of blowing up.
 */
export const DPR = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
export const ui = (px: number) => Math.round(px * DPR);
export const uiPx = (px: number) => `${ui(px)}px`;

/** Fixed camera zoom levels (%) selectable in Tùy chỉnh and via mouse wheel. */
export const ZOOM_STEPS = [100, 150, 200] as const;
export type ZoomPct = (typeof ZOOM_STEPS)[number];

export interface ZoomPlate {
  /** Camera zoom factor (1.0 – 2.0). */
  zoom: number;
  /** Scale applied to world-space text (actor names, ground drops, portals, floating numbers). */
  textScale: number;
  /** Normal actor HP bar width before `ui()` DPR scaling. */
  barW: number;
  /** Boss HP bar width before `ui()` DPR scaling. */
  barBossW: number;
  /** HP bar height before `ui()` DPR scaling. */
  barH: number;
  /** Vertical gap between the HP bar / head top and the name label before `ui()` DPR scaling. */
  gapY: number;
}

/** Per-step tuning for character names and HP bars at each fixed zoom level. */
export const ZOOM_PLATES: Record<ZoomPct, ZoomPlate> = {
  100: { zoom: 1.0, textScale: 1.00, barW: 44, barBossW: 70, barH: 4.0, gapY: 7.0 },
  150: { zoom: 1.5, textScale: 0.67, barW: 30, barBossW: 48, barH: 2.7, gapY: 4.7 },
  200: { zoom: 2.0, textScale: 0.50, barW: 22, barBossW: 36, barH: 2.0, gapY: 3.5 },
};

/** Snap any zoom percentage to the nearest step in `ZOOM_STEPS`. */
export function snapZoom(pct: number): ZoomPct {
  if (!Number.isFinite(pct)) return 100;
  let best: ZoomPct = ZOOM_STEPS[0];
  let bestDiff = Math.abs(pct - best);
  for (const s of ZOOM_STEPS) {
    const d = Math.abs(pct - s);
    if (d < bestDiff) { best = s; bestDiff = d; }
  }
  return best;
}

/** Move one discrete step up (+1) or down (-1) in `ZOOM_STEPS`. */
export function stepZoom(current: number, dir: -1 | 1): ZoomPct {
  const cur = snapZoom(current);
  const idx = ZOOM_STEPS.indexOf(cur);
  return ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, idx + dir))];
}

let activeZoom: ZoomPct = 100;

export function setActiveZoom(pct: number): ZoomPct {
  activeZoom = snapZoom(pct);
  return activeZoom;
}

export function zoomPlate(): ZoomPlate {
  return ZOOM_PLATES[activeZoom];
}

