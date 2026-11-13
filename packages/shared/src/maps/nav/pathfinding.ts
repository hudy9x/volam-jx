import type { NavigationGrid, Point } from './types.js';
import { clamp, clearSegment, nearestWalkable } from './grid.js';

/**
 * Per-grid scratch buffers, reused between searches (generation stamps instead of clearing).
 * The original maps are big (Biện Kinh: 1168 x 1632 cells), so the search must not allocate per call.
 */
interface Scratch { cost: Float32Array; prev: Int32Array; seen: Uint32Array; closed: Uint32Array; gen: number; heapF: Float64Array; heapC: Int32Array }
const scratch = new WeakMap<NavigationGrid, Scratch>();

function buffers(grid: NavigationGrid): Scratch {
  let s = scratch.get(grid);
  if (!s) {
    const n = grid.gw * grid.gh;
    s = { cost: new Float32Array(n), prev: new Int32Array(n), seen: new Uint32Array(n), closed: new Uint32Array(n), gen: 0,
      heapF: new Float64Array(1024), heapC: new Int32Array(1024) };
    scratch.set(grid, s);
  }
  if (++s.gen === 0xffffffff) { s.seen.fill(0); s.closed.fill(0); s.gen = 1; }
  return s;
}

/** Slightly greedy A* (weight > 1): long paths expand far fewer cells, at most a few % longer. */
const WEIGHT = 1.15;

/**
 * A* over the walkable cells (8 neighbours, no corner cutting), then string-pulled so the result is a short list
 * of waypoints with actor clearance between them. `budget` = max expanded cells.
 */
export function findPath(grid: NavigationGrid | null, start: Point, destination: Point, budget = 8000): Point[] | null {
  if (!grid || !grid.free) return null;
  const { gw, gh, cw, ch } = grid;
  const sx = clamp(Math.floor(start.x / cw), 0, gw - 1), sy = clamp(Math.floor(start.y / ch), 0, gh - 1);
  let dx = clamp(Math.floor(destination.x / cw), 0, gw - 1), dy = clamp(Math.floor(destination.y / ch), 0, gh - 1);
  const ok = grid.ok;
  if (!ok[dy * gw + dx]) {
    const [x, y] = nearestWalkable(grid, destination.x, destination.y);
    dx = Math.floor(x / cw); dy = Math.floor(y / ch);
  }
  const s = buffers(grid);
  const { cost, prev, seen, closed, gen } = s;
  let heapF = s.heapF, heapC = s.heapC, size = 0;
  const diag = Math.hypot(cw, ch);
  // Octile distance for non-square cells: exact on an empty grid, so admissible.
  const estimate = (x: number, y: number) => {
    const ax = Math.abs(x - dx), ay = Math.abs(y - dy), d = Math.min(ax, ay);
    return (d * diag + (ax - d) * cw + (ay - d) * ch) * WEIGHT;
  };
  const push = (f: number, c: number) => {
    if (size === heapF.length) {
      const nf = new Float64Array(size * 2), nc = new Int32Array(size * 2);
      nf.set(heapF); nc.set(heapC); heapF = s.heapF = nf; heapC = s.heapC = nc;
    }
    let i = size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heapF[p] <= f) break;
      heapF[i] = heapF[p]; heapC[i] = heapC[p]; i = p;
    }
    heapF[i] = f; heapC[i] = c;
  };
  const pop = (): number => {
    const top = heapC[0];
    const f = heapF[--size], c = heapC[size];
    let i = 0;
    for (;;) {
      const l = 2 * i + 1;
      if (l >= size) break;
      const r = l + 1, m = r < size && heapF[r] < heapF[l] ? r : l;
      if (heapF[m] >= f) break;
      heapF[i] = heapF[m]; heapC[i] = heapC[m]; i = m;
    }
    heapF[i] = f; heapC[i] = c;
    return top;
  };

  const startCell = sy * gw + sx, goal = dy * gw + dx;
  cost[startCell] = 0; prev[startCell] = -1; seen[startCell] = gen;
  push(estimate(sx, sy), startCell);
  let visited = 0;
  while (size && visited < budget) {
    const cell = pop();
    if (closed[cell] === gen) continue;
    closed[cell] = gen;
    visited++;
    if (cell === goal) return smooth(grid, cell, prev, start);
    const x = cell % gw, y = (cell - x) / gw, base = cost[cell];
    for (let oy = -1; oy <= 1; oy++) {
      const ny = y + oy;
      if (ny < 0 || ny >= gh) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const nx = x + ox;
        if ((!ox && !oy) || nx < 0 || nx >= gw) continue;
        const n = ny * gw + nx;
        if (!ok[n] || closed[n] === gen) continue;
        if (ox && oy && (!ok[y * gw + nx] || !ok[ny * gw + x])) continue;
        const c = base + (ox && oy ? diag : ox ? cw : ch);
        if (seen[n] === gen && c >= cost[n]) continue;
        seen[n] = gen; cost[n] = c; prev[n] = cell;
        push(c + estimate(nx, ny), n);
      }
    }
  }
  return null;
}

/** Cell chain -> waypoints (cell centres), dropping every point the actor can skip in a straight line. */
function smooth(grid: NavigationGrid, goal: number, prev: Int32Array, start: Point): Point[] {
  const cells: number[] = [];
  for (let c = goal; c !== -1; c = prev[c]) cells.push(c);
  cells.reverse();
  const at = (c: number): Point => ({ x: (c % grid.gw + 0.5) * grid.cw, y: (Math.floor(c / grid.gw) + 0.5) * grid.ch });
  const out: Point[] = [at(cells[0])];
  let from: Point = start, i = 0;
  while (i < cells.length - 1) {
    // Furthest cell reachable in a straight line (bounded look-ahead keeps this linear-ish).
    let best = i + 1;
    for (let j = Math.min(cells.length - 1, i + 96); j > i + 1; j--) {
      if (clearSegment(grid, from, at(cells[j]), true)) { best = j; break; }
    }
    const p = at(cells[best]);
    out.push(p);
    from = p; i = best;
  }
  return out;
}
