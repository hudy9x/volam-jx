/**
 * The ground art is isometric: one world px on Y covers twice the distance of X.
 * Legacy formula: hypot(dx, dy * 2) (core/helpers-and-config-01.js).
 */
export function isoDistance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(bx - ax, (by - ay) * 2);
}

/**
 * 8-way direction, legacy convention (render/projectiles-01.js):
 * 0 = south (+y), 1 = SW, 2 = west, 3 = NW, 4 = north, 5 = NE, 6 = east, 7 = SE.
 */
export function direction8(dx: number, dy: number): number {
  if (!dx && !dy) return 0;
  return ((Math.round(Math.atan2(-dx, dy) / (Math.PI / 4)) % 8) + 8) % 8;
}

/** Unit vector for a direction in screen space (y already squashed for iso). */
export function normalize(dx: number, dy: number): [number, number] {
  const len = Math.hypot(dx, dy) || 1;
  return [dx / len, dy / len];
}

/** Move from a toward b by at most `step` world px, measured isometrically. Returns [x, y, arrived]. */
export function stepToward(ax: number, ay: number, bx: number, by: number, step: number): [number, number, boolean] {
  const dist = isoDistance(ax, ay, bx, by);
  if (dist <= step || dist === 0) return [bx, by, true];
  const t = step / dist;
  return [ax + (bx - ax) * t, ay + (by - ay) * t, false];
}

/** Deterministic PRNG (mulberry32) so spawns can be seeded on the server. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
