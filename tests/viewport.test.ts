import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeViewport, RENDER_SCALE, viewportChoice } from '../apps/client/src/platform/viewport';
import { localPoint } from '../apps/client/src/ui/kit/viewport';
import { gridCellAt } from '../apps/client/src/ui/kit/itemGrid';

test('fixed backing budget and letterbox bounds survive desktop, Retina, portrait and tiny windows', () => {
  for (const [w, h] of [[1920, 1080], [1500, 1001], [390, 844], [800, 600], [7680, 4320], [1, 1]]) {
    for (const choice of ['auto', '1280x720', '1280x800'] as const) {
      const v = computeViewport(w, h, choice);
      assert.equal(v.width, 1280);
      assert.ok(v.height === 720 || v.height === 800);
      assert.ok(v.width * v.height * RENDER_SCALE ** 2 <= 4096000);
      assert.ok(v.left >= -1e-8 && v.top >= -1e-8);
      assert.ok(v.left + v.width * v.scale <= w + 1e-8);
      assert.ok(v.top + v.height * v.scale <= h + 1e-8);
    }
  }
  assert.equal(computeViewport(1920, 1080).id, '1280x720');
  assert.equal(computeViewport(1500, 1001).id, '1280x800');
  assert.equal(viewportChoice('obsolete'), 'auto');
});

test('a drag keeps its grabbed point and grid destination under fractional HUD transforms', () => {
  for (const scale of [0.3046875, 0.625, 1, 1.171875, 1.5, 2]) {
    const element = (w: number, h: number, x: number, y: number) => ({
      offsetWidth: w, offsetHeight: h,
      getBoundingClientRect: () => ({ left: x, top: y, width: w * scale, height: h * scale }),
    }) as unknown as HTMLElement;
    const grab = localPoint(element(56, 84, 30, 72), 30 + 12 * scale, 72 + 19 * scale);
    assert.ok(Math.abs(grab[0] - 12) < 1e-8 && Math.abs(grab[1] - 19) < 1e-8);
    const grid = element(168, 280, 90, 304);
    const e = { clientX: 90 + (3 * 28 + 12) * scale, clientY: 304 + (7 * 28 + 19) * scale } as DragEvent;
    assert.equal(gridCellAt(grid, e, grab, 2), 2 * 60 + 7 * 6 + 3);
    assert.equal(gridCellAt(grid, { clientX: -1000, clientY: -1000 } as DragEvent, grab, 0), -1);
  }
});
