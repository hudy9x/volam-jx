import type { PreviewFigure, PreviewLayer, PreviewPose } from '../PreviewAssets.js';
import { navigationMask, CELL_W, CELL_H, type Project } from '../model.js';
import { decodeGrid, nearestWalkable, canStandAt } from '../../../packages/shared/src/maps/nav/grid.js';
import { findPath } from '../../../packages/shared/src/maps/nav/pathfinding.js';
import type { NavigationGrid, Point } from '../../../packages/shared/src/maps/nav/types.js';
import { direction8, stepToward } from '../../../packages/shared/src/geometry.js';
import { resolveSpeed, trackBasePercent } from '../../../packages/shared/src/formulas/speed.js';
interface Actor extends Point { figure: PreviewFigure; dir: number; moving: boolean; elapsed: number }
interface Data { foot: readonly number[]; player: PreviewFigure; monsters: PreviewFigure[]; sheets: string[] }
export class MapPreview {
  actors: Actor[] = [];
  private sheets: HTMLImageElement[] = [];
  private data!: Data;
  private grid!: NavigationGrid;
  private path: Point[] = [];
  private run = resolveSpeed('run', trackBasePercent('run'));
  async load(p: Project, ground: HTMLImageElement): Promise<void> {
    const res = await fetch('/api/preview'), data = await res.json();
    if (!res.ok) throw Error(data.error ?? 'Không tải được nhân vật thử.');
    this.data = data;
    this.sheets = await Promise.all(this.data.sheets.map(async src => { const img = new Image(); img.src = src; await img.decode(); return img; }));
    const blocked = navigationMask(p), cols = p.width / CELL_W, rows = p.height / CELL_H;
    // Match export's alpha threshold at each navigation cell center, without a full-sized RGBA allocation.
    const sample = document.createElement('canvas'); sample.width = cols; sample.height = rows;
    const ctx = sample.getContext('2d', { willReadFrequently: true })!; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(ground, 0, 0, cols, rows); const rgba = ctx.getImageData(0, 0, cols, rows).data;
    const bytes = new Uint8Array(Math.ceil(blocked.length / 8));
    for (let i = 0; i < blocked.length; i++) if (blocked[i] || rgba[i * 4 + 3] < 128) bytes[i >> 3] |= 1 << (i & 7);
    let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
    this.grid = decodeGrid({ kind: 'grid', columns: cols, rows, cellSize: { width: CELL_W, height: CELL_H }, blockedBase64: btoa(binary) }, { width: p.width, height: p.height });
    this.home(p.entry);
  }
  home(entry: Point): void {
    const [x, y] = nearestWalkable(this.grid, entry.x, entry.y);
    this.actors = [{ x, y, figure: this.data.player, dir: 0, moving: false, elapsed: 0 }]; this.path = [];
    const offsets = [[160, 0], [-128, 64], [64, -112]];
    this.data.monsters.forEach((figure, i) => {
      const [mx, my] = nearestWalkable(this.grid, Math.max(0, Math.min(this.grid.w - 1, x + offsets[i][0])), Math.max(0, Math.min(this.grid.h - 1, y + offsets[i][1])));
      if (Math.hypot(mx - x, my - y) < 24) return;
      if (this.actors.some(a => Math.hypot(a.x - mx, a.y - my) < 24)) return;
      this.actors.push({ x: mx, y: my, figure, dir: (i + 2) % 8, moving: false, elapsed: 0 });
    });
  }
  move(point: Point): boolean {
    if (!canStandAt(this.grid, point.x, point.y)) return false;
    const path = findPath(this.grid, this.actors[0], point);
    if (!path) return false;
    this.path = path; return true;
  }
  tick(dt: number): void {
    const player = this.actors[0]; let remaining = (this.run.velocity ?? 0) * dt;
    while (this.path.length && remaining > 0) {
      const point = this.path[0], dx = point.x - player.x, dy = point.y - player.y;
      player.dir = direction8(dx, dy);
      const dist = Math.hypot(dx, dy * 2), [x, y, arrived] = stepToward(player.x, player.y, point.x, point.y, remaining);
      if (!canStandAt(this.grid, x, y)) { this.path = []; break; }
      player.x = x; player.y = y; remaining -= dist;
      if (arrived) this.path.shift();
    }
    player.moving = !!this.path.length;
    for (const a of this.actors) a.elapsed += dt;
  }
  draw(ctx: CanvasRenderingContext2D, a: Actor, zoom: number): void {
    const pose: PreviewPose = a.moving ? a.figure.run : a.figure.stand;
    const frame = Math.floor(a.elapsed * (a.moving ? 1000 / this.run.cycleMs * pose.frames : 18)) % pose.frames;
    const drawLayer = (layer: PreviewLayer) => {
      const [w, h, bx, by, frames, dirs, columns] = layer.meta;
      const row = dirs >= 8 ? Math.round(a.dir * dirs / 8) % dirs : Math.floor(a.dir * dirs / 8);
      const f = Math.min(frames - 1, Math.floor(frame * frames / pose.frames)), index = row * frames + f, scale = a.figure.scale;
      ctx.drawImage(this.sheets[layer.sheet], index % columns * w, Math.floor(index / columns) * h, w, h,
        Math.round(a.x) + (bx - this.data.foot[0]) * scale, Math.round(a.y) + (by - this.data.foot[1]) * scale, w * scale, h * scale);
    };
    if (pose.shadow) drawLayer(pose.shadow);
    const body = pose.layers.find(l => l.part === 5)!, dirs = body.meta[5];
    const row = dirs >= 8 ? Math.round(a.dir * dirs / 8) % dirs : Math.floor(a.dir * dirs / 8);
    const order = pose.lines[row * pose.frames + frame] ?? pose.orders[row] ?? [];
    for (const part of order) { const layer = pose.layers.find(l => l.part === part); if (layer) drawLayer(layer); }
    const height = Math.max(...pose.layers.filter(l => [0, 1, 5].includes(l.part)).map(l => (this.data.foot[1] - l.meta[3]) * a.figure.scale));
    ctx.font = `${12 / zoom}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3 / zoom; ctx.strokeStyle = '#101211'; ctx.fillStyle = a === this.actors[0] ? '#b9d8bf' : '#ffffff';
    ctx.strokeText(a.figure.name, a.x, a.y - height - 8 / zoom); ctx.fillText(a.figure.name, a.x, a.y - height - 8 / zoom); ctx.textAlign = 'start';
  }
}
