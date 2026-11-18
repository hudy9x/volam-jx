export interface TooltipRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface TooltipSize {
  width: number;
  height: number;
}

export interface TooltipPoint {
  left: number;
  top: number;
}

const DEFAULT_PAD = 8;
const DEFAULT_GAP = 8;

function overlapArea(a: TooltipRect, b: TooltipRect): number {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x * y;
}

/**
 * Compute a HUD-local position for a tooltip so it stays inside `bounds` and avoids covering `anchor`.
 * Preference order: above -> below -> side (left when anchor is on the right half, right otherwise).
 */
export function computeTooltipPosition(
  anchor: TooltipRect,
  tip: TooltipSize,
  bounds: TooltipSize,
  pad = DEFAULT_PAD,
  gap = DEFAULT_GAP,
): TooltipPoint {
  const maxX = Math.max(pad, bounds.width - tip.width - pad);
  const maxY = Math.max(pad, bounds.height - tip.height - pad);
  const clampX = (x: number) => Math.max(pad, Math.min(maxX, x));
  const clampY = (y: number) => Math.max(pad, Math.min(maxY, y));

  const cx = (anchor.left + anchor.right) / 2;
  const cy = (anchor.top + anchor.bottom) / 2;
  const centeredLeft = clampX(cx - tip.width / 2);
  const centeredTop = clampY(cy - tip.height / 2);

  const tryPlace = (g: number): TooltipPoint | null => {
    const aboveTop = anchor.top - g - tip.height;
    if (aboveTop >= pad) return { left: centeredLeft, top: aboveTop };

    const belowTop = anchor.bottom + g;
    if (belowTop + tip.height <= bounds.height - pad) return { left: centeredLeft, top: belowTop };

    const rightLeft = anchor.right + g;
    const leftLeft = anchor.left - g - tip.width;
    const rightFits = rightLeft + tip.width <= bounds.width - pad;
    const leftFits = leftLeft >= pad;

    const preferLeft = cx > bounds.width / 2;
    if (preferLeft) {
      if (leftFits) return { left: leftLeft, top: centeredTop };
      if (rightFits) return { left: rightLeft, top: centeredTop };
    } else {
      if (rightFits) return { left: rightLeft, top: centeredTop };
      if (leftFits) return { left: leftLeft, top: centeredTop };
    }
    return null;
  };

  const exact = tryPlace(gap);
  if (exact) return exact;

  if (gap > 2) {
    const tight = tryPlace(2);
    if (tight) return tight;
  }

  // Fallback when viewport is too tight on all 4 sides: pick the clamped candidate with minimal overlap.
  const candidates: TooltipPoint[] = [
    { left: centeredLeft, top: clampY(anchor.top - gap - tip.height) },
    { left: centeredLeft, top: clampY(anchor.bottom + gap) },
    { left: clampX(anchor.right + gap), top: centeredTop },
    { left: clampX(anchor.left - gap - tip.width), top: centeredTop },
  ];

  let best = candidates[0];
  let bestOverlap = Infinity;
  for (const c of candidates) {
    const rect: TooltipRect = {
      left: c.left,
      top: c.top,
      right: c.left + tip.width,
      bottom: c.top + tip.height,
    };
    const area = overlapArea(rect, anchor);
    if (area < bestOverlap) {
      bestOverlap = area;
      best = c;
    }
  }
  return best;
}
