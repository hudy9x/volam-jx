import Phaser from 'phaser';
import type { MapMeta } from '@vltk/shared';
import { assetUrl } from '../../art/assets';

/** public/assets/maps/<id>/map.json (tools/gen-maps.ts). */
interface MapJson {
  id: number; width: number; height: number; regionSize: number; cols: number; rows: number; chunk: number;
  /** 1 bit per region (row-major, LSB first): region file exists. */
  regions: string;
  chunks: string[];
}
/** objects/<cx>_<cy>.json */
interface ChunkJson {
  pages: string[];
  /** [page, x, y, w, h] in the atlas pages */
  frames: [number, number, number, number, number][];
  /** [frame, worldX, worldY, srcX, srcW, depth]: a whole object (srcX 0, srcW w) or one vertical depth strip */
  pieces: [number, number, number, number, number, number][];
}

interface RegionState { key: string; image?: Phaser.GameObjects.Image; dead?: boolean }
interface ChunkState { textures: string[]; images: Phaser.GameObjects.Image[]; dead?: boolean }

/** Pieces outside the view (+ this margin) are hidden: Phaser does not cull plain images by itself. */
const CULL_MARGIN = 96;

const GROUND_DEPTH = -1e7;
/** Load what intersects the view grown by this much; drop what is outside the larger unload margin. */
const GROUND_LOAD = 384, GROUND_KEEP = 1400;
/** Objects are indexed by the region file that owns them but can stick out by their own size (tall buildings). */
const OBJECT_LOAD = 900, OBJECT_KEEP = 2000;
const MAX_PARALLEL = 6;

/**
 * Streams an original-client map around the camera: 512x512 ground regions (flat) and per-chunk object
 * atlases whose pieces are depth-sorted against actors (depth = world y of the sort point / line).
 */
export class MapView {
  private json: MapJson | null = null;
  private regionBits: Uint8Array | null = null;
  private chunkSet = new Set<string>();
  private regions = new Map<string, RegionState>();
  private chunks = new Map<string, ChunkState>();
  private pending = 0;
  private queue: (() => void)[] = [];
  private destroyed = false;
  private readonly prefix: string;
  private readonly base: string;
  /** Diagnostic A/B switch; streaming remains independent of visibility. */
  cullingEnabled = true;
  private lastCull = { x: NaN, y: NaN, w: 0, h: 0 };

  constructor(private scene: Phaser.Scene, meta: MapMeta) {
    this.prefix = `map${meta.id}`;
    this.base = meta.assets.replace(/\/$/, '');
  }

  /** Loads map.json plus everything needed to draw a view of the camera's size centred on (x, y). */
  async ready(x: number, y: number): Promise<void> {
    if (!this.json) {
      const res = await fetch(assetUrl(`${this.base}/map.json`));
      if (!res.ok) throw new Error(`map.json ${res.status}`);
      this.json = (await res.json()) as MapJson;
      this.regionBits = Uint8Array.from(atob(this.json.regions), c => c.charCodeAt(0));
      this.chunkSet = new Set(this.json.chunks);
    }
    const cam = this.scene.cameras.main;
    const w = cam.width / cam.zoom, h = cam.height / cam.zoom;
    await Promise.all(this.ensure(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h)));
  }

  /** Call every frame with the camera's world view. */
  update(view: Phaser.Geom.Rectangle): void {
    if (!this.json || this.destroyed) return;
    void this.ensure(view);
    this.evict(view);
    this.cull(view, false);
  }

  /** Hide object pieces that are off screen; only re-run when the view moved noticeably (or forced). */
  private cull(view: Phaser.Geom.Rectangle, force: boolean): void {
    const l = this.lastCull;
    if (!force && Math.abs(view.x - l.x) < 24 && Math.abs(view.y - l.y) < 24 && view.width === l.w && view.height === l.h) return;
    this.lastCull = { x: view.x, y: view.y, w: view.width, h: view.height };
    const x0 = view.x - CULL_MARGIN, y0 = view.y - CULL_MARGIN, x1 = view.right + CULL_MARGIN, y1 = view.bottom + CULL_MARGIN;
    for (const r of this.regions.values()) {
      const img = r.image;
      if (img) img.visible = !this.cullingEnabled || (img.x < x1 && img.x + img.width > x0 && img.y < y1 && img.y + img.height > y0);
    }
    for (const c of this.chunks.values()) for (const img of c.images) {
      img.visible = img.x < x1 && img.x + img.width > x0 && img.y < y1 && img.y + img.height > y0;
    }
  }

  destroy(): void {
    this.destroyed = true;
    for (const r of this.regions.values()) this.dropRegion(r);
    for (const c of this.chunks.values()) this.dropChunk(c);
    this.regions.clear();
    this.chunks.clear();
    this.queue = [];
  }

  // ---------------------------------------------------------------- streaming

  private ensure(view: Phaser.Geom.Rectangle): Promise<void>[] {
    const j = this.json!;
    const rs = j.regionSize, jobs: Promise<void>[] = [];
    const [gx0, gy0, gx1, gy1] = this.span(view, GROUND_LOAD, rs);
    for (let gy = gy0; gy <= gy1; gy++) for (let gx = gx0; gx <= gx1; gx++) {
      const key = `${gx}_${gy}`;
      if (this.regions.has(key) || !this.hasRegion(gx, gy)) continue;
      jobs.push(this.loadRegion(key, gx, gy));
    }
    const cs = rs * j.chunk;
    const [cx0, cy0, cx1, cy1] = this.span(view, OBJECT_LOAD, cs);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const key = `${cx}_${cy}`;
      if (this.chunks.has(key) || !this.chunkSet.has(key)) continue;
      jobs.push(this.loadChunk(key));
    }
    return jobs;
  }

  private evict(view: Phaser.Geom.Rectangle): void {
    const j = this.json!;
    const [gx0, gy0, gx1, gy1] = this.span(view, GROUND_KEEP, j.regionSize);
    for (const [key, r] of this.regions) {
      const [gx, gy] = key.split('_').map(Number);
      if (gx < gx0 || gx > gx1 || gy < gy0 || gy > gy1) { this.dropRegion(r); this.regions.delete(key); }
    }
    const [cx0, cy0, cx1, cy1] = this.span(view, OBJECT_KEEP, j.regionSize * j.chunk);
    for (const [key, c] of this.chunks) {
      const [cx, cy] = key.split('_').map(Number);
      if (cx < cx0 || cx > cx1 || cy < cy0 || cy > cy1) { this.dropChunk(c); this.chunks.delete(key); }
    }
  }

  /** Cell range [x0, y0, x1, y1] of size `cell` touched by the view grown by `margin`, clamped to the map. */
  private span(view: Phaser.Geom.Rectangle, margin: number, cell: number): [number, number, number, number] {
    const j = this.json!;
    const maxX = Math.ceil(j.width / cell) - 1, maxY = Math.ceil(j.height / cell) - 1;
    return [
      Math.max(0, Math.floor((view.x - margin) / cell)), Math.max(0, Math.floor((view.y - margin) / cell)),
      Math.min(maxX, Math.floor((view.right + margin) / cell)), Math.min(maxY, Math.floor((view.bottom + margin) / cell)),
    ];
  }

  private hasRegion(gx: number, gy: number): boolean {
    const i = gy * this.json!.cols + gx;
    return !!this.regionBits && ((this.regionBits[i >> 3] >> (i & 7)) & 1) === 1;
  }

  private async loadRegion(key: string, gx: number, gy: number): Promise<void> {
    const state: RegionState = { key: `${this.prefix}-g-${key}` };
    this.regions.set(key, state);
    const img = await this.image(assetUrl(`${this.base}/ground/${key}.webp`));
    if (!img || state.dead || this.destroyed) return;
    if (!this.scene.textures.exists(state.key)) this.scene.textures.addImage(state.key, img);
    const rs = this.json!.regionSize;
    this.lastCull.x = NaN; // a retained region must receive the current visibility on completion
    state.image = this.scene.add.image(gx * rs, gy * rs, state.key).setOrigin(0).setDepth(GROUND_DEPTH);
  }

  private async loadChunk(key: string): Promise<void> {
    const state: ChunkState = { textures: [], images: [] };
    this.chunks.set(key, state);
    let data: ChunkJson;
    try {
      const res = await fetch(assetUrl(`${this.base}/objects/${key}.json`));
      data = (await res.json()) as ChunkJson;
    } catch { return; }
    const pages = await Promise.all(data.pages.map(p => this.image(assetUrl(`${this.base}/objects/${p}`))));
    if (state.dead || this.destroyed) return;
    const textures = this.scene.textures;
    const pageKeys = pages.map((img, i) => {
      const tk = `${this.prefix}-o-${key}-${i}`;
      if (img && !textures.exists(tk)) textures.addImage(tk, img);
      state.textures.push(tk);
      return img ? tk : null;
    });
    for (const [frame, wx, wy, sx, sw, depth] of data.pieces) {
      const [page, fx, fy, , fh] = data.frames[frame];
      const tk = pageKeys[page];
      if (!tk) continue;
      const tex = textures.get(tk);
      const name = `${frame}:${sx}:${sw}`;
      if (!tex.has(name)) tex.add(name, 0, fx + sx, fy, sw, fh);
      state.images.push(this.scene.add.image(wx, wy, tk, name).setOrigin(0).setDepth(depth));
    }
    this.lastCull.x = NaN; // new pieces: re-cull on the next update
  }

  private dropRegion(r: RegionState): void {
    r.dead = true;
    r.image?.destroy();
    if (this.scene.textures.exists(r.key)) this.scene.textures.remove(r.key);
  }

  private dropChunk(c: ChunkState): void {
    c.dead = true;
    for (const img of c.images) img.destroy();
    for (const tk of c.textures) if (this.scene.textures.exists(tk)) this.scene.textures.remove(tk);
  }

  /** HTMLImageElement loader with a small concurrency cap (independent of the scene's Phaser loader). */
  private image(url: string): Promise<HTMLImageElement | null> {
    return new Promise(resolve => {
      const run = () => {
        this.pending++;
        const img = new Image();
        const done = (ok: boolean) => {
          this.pending--;
          this.queue.shift()?.();
          resolve(ok ? img : null);
        };
        img.onload = () => done(true);
        img.onerror = () => { console.warn('map image failed', url); done(false); };
        img.src = url;
      };
      if (this.pending < MAX_PARALLEL) run(); else this.queue.push(run);
    });
  }
}
