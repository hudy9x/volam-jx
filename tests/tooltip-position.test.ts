import test from 'node:test';
import assert from 'node:assert/strict';
import { computeTooltipPosition, type TooltipRect, type TooltipSize } from '../apps/client/src/ui/kit/tooltip-position.ts';

function overlaps(a: TooltipRect, b: TooltipRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function tipRect(pos: { left: number; top: number }, tip: TooltipSize): TooltipRect {
  return {
    left: pos.left,
    top: pos.top,
    right: pos.left + tip.width,
    bottom: pos.top + tip.height,
  };
}

const HUD: TooltipSize = { width: 1280, height: 720 };

test('places tooltip above anchor when there is enough room above', () => {
  const anchor: TooltipRect = { left: 600, top: 400, right: 636, bottom: 436 };
  const tip: TooltipSize = { width: 260, height: 180 };
  const pos = computeTooltipPosition(anchor, tip, HUD);
  const rect = tipRect(pos, tip);

  assert.equal(rect.bottom, anchor.top - 8);
  assert.equal(overlaps(rect, anchor), false);
});

test('places tooltip below anchor when above is tight but below has room', () => {
  const anchor: TooltipRect = { left: 600, top: 80, right: 636, bottom: 116 };
  const tip: TooltipSize = { width: 260, height: 180 };
  const pos = computeTooltipPosition(anchor, tip, HUD);
  const rect = tipRect(pos, tip);

  assert.equal(rect.top, anchor.bottom + 8);
  assert.equal(overlaps(rect, anchor), false);
});

test('places tall spear tooltip beside anchor instead of overlapping when neither above nor below fits', () => {
  // Spear 1x3 slots near upper-middle of inventory
  const anchor: TooltipRect = { left: 580, top: 150, right: 616, bottom: 258 };
  const tip: TooltipSize = { width: 340, height: 550 };
  const pos = computeTooltipPosition(anchor, tip, HUD);
  const rect = tipRect(pos, tip);

  assert.equal(overlaps(rect, anchor), false);
  assert.ok(rect.left >= 8 && rect.right <= HUD.width - 8);
  assert.ok(rect.top >= 8 && rect.bottom <= HUD.height - 8);
  // Anchor is on left half (cx=598 < 640), so tooltip goes to the right
  assert.equal(rect.left, anchor.right + 8);
});

test('places tall tooltip to the left when anchor is on the right half', () => {
  // Tall skill/item on the right side of the HUD
  const anchor: TooltipRect = { left: 900, top: 200, right: 936, bottom: 236 };
  const tip: TooltipSize = { width: 340, height: 520 };
  const pos = computeTooltipPosition(anchor, tip, HUD);
  const rect = tipRect(pos, tip);

  assert.equal(overlaps(rect, anchor), false);
  assert.equal(rect.right, anchor.left - 8);
  assert.ok(rect.left >= 8 && rect.top >= 8 && rect.bottom <= HUD.height - 8);
});

test('places long skill tooltip beside quickbar slot near bottom-right without covering it', () => {
  const anchor: TooltipRect = { left: 1180, top: 650, right: 1220, bottom: 690 };
  const tip: TooltipSize = { width: 340, height: 660 };
  const pos = computeTooltipPosition(anchor, tip, HUD);
  const rect = tipRect(pos, tip);

  assert.equal(overlaps(rect, anchor), false);
  assert.equal(rect.right, anchor.left - 8);
  assert.ok(rect.left >= 8 && rect.top >= 8 && rect.bottom <= HUD.height - 8);
});
