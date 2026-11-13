import { CAMP_COLORS, type Camp } from '@vltk/shared';
import type { MapMeta } from '@vltk/shared';
import type { MapActor, MapLabel } from '../../game/ports';
import { keyLabel } from '../../input/keymap';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import './bigmap.css';
import { assetUrl } from '../../art/assets';

const REDRAW_MS = 150;

const HTML = `
<section id="bigmap" class="dlg hidden" data-title="Bản đồ">
  <div class="bigmap-body">
    <canvas id="bigmap-canvas"></canvas>
  </div>
  <div class="row spread muted"><span>Click để chạy tới đó · ${keyLabel('bigmap')} / ${keyLabel('system')} để đóng</span><span id="bigmap-pos"></span></div>
</section>`;

/** A dev tool living in the big map window (dev/spawn-editor/): told when the map changes. */
export interface BigMapTool { mapChanged(): void }

/**
 * Bản đồ lớn (Tab): the whole map from the generated minimap.webp, with portals, town NPCs, monsters, players
 * and you. Click to walk there (the server finds the path); the map stays open so you can watch the way.
 */
export class BigMap {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private images = new Map<number, HTMLImageElement>();
  private image: HTMLImageElement | null = null;
  private meta: MapMeta | null = null;
  private lastDraw = 0;
  /** Canvas px per world px. */
  private k = 1;
  /** Dev tool layer (spawn editor): draws on top and may take the clicks. */
  overlay: { draw: (ctx: CanvasRenderingContext2D, k: number, dpr: number) => void; click: (x: number, y: number) => boolean } | null = null;
  /** Dev tool panel inside this window (installed by dev/). */
  tool: BigMapTool | null = null;

  constructor(parent: HTMLElement, onPick: (x: number, y: number) => void) {
    mount(parent, HTML);
    dialogs.register('bigmap');
    this.canvas = $<HTMLCanvasElement>('bigmap-canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0 || !this.meta) return;
      e.preventDefault();
      const [x, y] = this.toWorld(e);
      if (this.overlay?.click(Math.round(x), Math.round(y))) { this.lastDraw = 0; return; }
      onPick(Math.round(x), Math.round(y));
    });
    this.canvas.addEventListener('pointermove', e => {
      const [x, y] = this.toWorld(e);
      $('bigmap-pos').textContent = `Tọa độ ${Math.round(x / 8)}/${Math.round(y / 16)}`;
    });
    window.addEventListener('resize', () => { if (this.isOpen) this.layout(); });
  }

  get isOpen(): boolean {
    return dialogs.isOpen('bigmap');
  }

  setMap(meta: MapMeta): void {
    if (this.meta?.id === meta.id) return;
    this.meta = meta;
    dialogs.setTitle('bigmap', `Bản đồ · ${meta.name}`);
    this.image = this.images.get(meta.id) ?? null;
    this.lastDraw = 0;
    if (this.image) { if (this.isOpen) this.layout(); return; }
    const img = new Image();
    img.onload = () => {
      this.images.set(meta.id, img);
      if (this.meta !== meta) return;
      this.image = img;
      if (this.isOpen) this.layout();
    };
    img.src = assetUrl(`${meta.assets}/minimap.webp`);
  }

  toggle(open = !this.isOpen): void {
    dialogs.toggle('bigmap', open);
    if (open) this.layout();
  }

  /** Fit the whole map in the window, drawn at device pixels. */
  private layout(): void {
    if (!this.meta) return;
    const { width: mw, height: mh } = this.meta.raw.size;
    // Room for the window frame (jade border, title bar, footer) and the dev spawn editor when open.
    const side = $('spawn-editor')?.classList.contains('hidden') === false ? 312 : 0;
    const maxW = window.innerWidth * 0.94 - 60 - side, maxH = window.innerHeight * 0.9 - 100;
    const css = Math.min(maxW / mw, maxH / mh);
    const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
    this.canvas.style.width = `${Math.round(mw * css)}px`;
    this.canvas.style.height = `${Math.round(mh * css)}px`;
    this.canvas.width = Math.round(mw * css * dpr);
    this.canvas.height = Math.round(mh * css * dpr);
    this.k = css * dpr;
    this.lastDraw = 0;
  }

  private toWorld(e: PointerEvent): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * (this.canvas.width / this.k), ((e.clientY - r.top) / r.height) * (this.canvas.height / this.k)];
  }

  /** Fit again (the editor panel opened / closed). */
  relayout(): void {
    if (this.isOpen) this.layout();
  }

  /** Redraw on the next frame (the overlay changed). */
  dirty(): void {
    this.lastDraw = 0;
  }

  get mapId(): number | null {
    return this.meta?.id ?? null;
  }

  /** Throttled redraw while open. */
  draw(actors: Iterable<MapActor>, selfId: string, labels: MapLabel[]): void {
    const now = performance.now();
    if (!this.isOpen || !this.meta || now - this.lastDraw < REDRAW_MS) return;
    this.lastDraw = now;
    const { ctx, canvas, k } = this;
    const dpr = canvas.width / Math.max(1, canvas.clientWidth);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.image) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.image, 0, 0, canvas.width, canvas.height);
    }
    const text = (s: string, x: number, y: number, color: string) => {
      ctx.font = `${Math.round(12 * dpr)}px Segoe UI, Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = '#000';
      ctx.strokeText(s, x, y);
      ctx.fillStyle = color;
      ctx.fillText(s, x, y);
    };
    const dot = (x: number, y: number, r: number, color: string, outline = false) => {
      ctx.beginPath();
      ctx.arc(x * k, y * k, r * dpr, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      if (outline) { ctx.lineWidth = 1.5 * dpr; ctx.strokeStyle = '#000'; ctx.stroke(); }
    };
    for (const p of this.meta.portals) {
      ctx.beginPath();
      ctx.arc(p.x * k, p.y * k, 6 * dpr, 0, Math.PI * 2);
      ctx.lineWidth = 2 * dpr;
      ctx.strokeStyle = '#6fd2ff';
      ctx.stroke();
      text(`➜ ${p.label}`, p.x * k, p.y * k - 10 * dpr, '#bfeaff');
    }
    for (const l of labels) {
      dot(l.x, l.y, 3, '#7fe08a', true);
      text(l.name, l.x * k, l.y * k - 8 * dpr, '#9cf08a');
    }
    let self: MapActor | undefined;
    for (const a of actors) {
      if (a.id === selfId) { self = a; continue; }
      const s = a.state;
      if (s.hp <= 0 || s.kind === 'npc') continue;
      if (s.kind === 'monster') {
        const gold = Number(s.boss) >= 2 || s.boss === true;
        dot(a.x, a.y, gold ? 4.5 : s.boss === 1 ? 3.4 : 2, gold ? '#ffd700' : s.boss === 1 ? '#5cb8ff' : '#e0503c', !!s.boss);
      }
      else dot(a.x, a.y, 3, (CAMP_COLORS[(s.camp || 'new') as Camp] ?? '#ffffff'), true);
    }
    if (self) {
      dot(self.x, self.y, 5, '#ffe08a', true);
      text('Bạn', self.x * k, self.y * k - 10 * dpr, '#ffe08a');
    }
    this.overlay?.draw(ctx, k, dpr);
  }
}
