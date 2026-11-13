import { CAMP_COLORS, type Camp } from '@vltk/shared';
import type { MapMeta } from '@vltk/shared';
import type { MapActor, ViewRect } from '../../game/ports';
import { keyLabel } from '../../input/keymap';
import { settings } from '../../state/settings';
import { assetUrl } from '../../art/assets';
import { $, mount } from '../kit/dom';
import './minimap.css';

const REDRAW_MS = 100;
/**
 * World px shown across the canvas. The original maps are big (Biện Kinh is 37376 x 26112), so the minimap is a
 * window that follows the player instead of the whole map squeezed into 200 px.
 */
const SPAN = 5600;

/**
 * Flag of a minimap click (destination). The server finds the path and does not say when the order ends, so the
 * flag goes away when the player is there, has stood still for a while (arrived at the nearest walkable point,
 * blocked, or stopped by another order) or walks clearly away from it (another order).
 */
const FLAG_ARRIVE = 48;
const FLAG_STILL_MS = 1200;
const FLAG_AWAY = 320;
interface Flag { x: number; y: number; at: number; still: number; lx: number; ly: number; min: number }

/** Minimap from the generated minimap.webp: portals, actors, camera rectangle. Click = walk there. */
class Minimap {
  private readonly ctx: CanvasRenderingContext2D;
  /** Decoded minimap per map id, so going back to a map shows it at once. */
  private images = new Map<number, HTMLImageElement>();
  private image: HTMLImageElement | null = null;
  private meta: MapMeta | null = null;
  private lastDraw = 0;
  /** Current window: world x/y of the canvas' top-left corner and canvas px per world px. */
  private win = { x: 0, y: 0, k: 1 };
  private flag: Flag | null = null;

  constructor(private readonly canvas: HTMLCanvasElement, onPick: (x: number, y: number) => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', e => {
      if (!this.meta || e.button !== 0) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = ((e.clientX - rect.left) / rect.width) * canvas.width;
      const py = ((e.clientY - rect.top) / rect.height) * canvas.height;
      const x = Math.round(this.win.x + px / this.win.k), y = Math.round(this.win.y + py / this.win.k);
      this.plant(x, y);
      onPick(x, y);
    });
  }

  /** Flag at a destination the player was sent to (world px); a line joins the player to it until arrival. */
  plant(x: number, y: number): void {
    const now = performance.now();
    this.flag = { x, y, at: now, still: now, lx: NaN, ly: NaN, min: Infinity };
    this.lastDraw = 0;
  }

  setMap(meta: MapMeta): void {
    if (this.meta?.id === meta.id) return;
    this.meta = meta;
    this.flag = null;
    this.lastDraw = 0;
    this.image = this.images.get(meta.id) ?? null;
    if (this.image) return;
    const img = new Image();
    img.onload = () => {
      this.images.set(meta.id, img);
      if (this.meta !== meta) return;
      this.image = img;
      this.lastDraw = 0;
    };
    img.src = assetUrl(`${meta.assets}/minimap.webp`);
  }

  /** Throttled redraw, call every frame. */
  draw(actors: Iterable<MapActor>, selfId: string, view: ViewRect): void {
    const now = performance.now();
    if (!this.meta || now - this.lastDraw < REDRAW_MS) return;
    this.lastDraw = now;
    const { ctx, canvas } = this;
    const { width: mw, height: mh } = this.meta.raw.size;

    // Window centred on the camera, clamped to the map (whole map when it is small enough).
    const span = Math.min(SPAN, Math.max(mw, mh));
    const k = Math.min(canvas.width, canvas.height) / span;
    const vw = canvas.width / k, vh = canvas.height / k;
    const cx = view.x + view.width / 2, cy = view.y + view.height / 2;
    const wx = mw <= vw ? (mw - vw) / 2 : Math.max(0, Math.min(mw - vw, cx - vw / 2));
    const wy = mh <= vh ? (mh - vh) / 2 : Math.max(0, Math.min(mh - vh, cy - vh / 2));
    this.win = { x: wx, y: wy, k };
    const toX = (x: number) => (x - wx) * k, toY = (y: number) => (y - wy) * k;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (this.image) {
      const s = this.image.width / mw; // minimap px per world px
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.image, wx * s, wy * s, vw * s, vh * s, 0, 0, canvas.width, canvas.height);
    }

    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#6fd2ff';
    for (const p of this.meta.portals) {
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    let self: MapActor | undefined;
    for (const a of actors) {
      if (a.id === selfId) { self = a; continue; }
      const s = a.state;
      if (s.hp <= 0) continue;
      const [color, r] = s.kind === 'monster'
        ? (Number(s.boss) >= 2 || s.boss === true ? ['#ffd700', 3.2] : s.boss === 1 ? ['#5cb8ff', 2.4] : ['#e0503c', 1.5])
        : s.kind === 'player' ? [(CAMP_COLORS[(s.camp || 'new') as Camp] ?? '#ffffff'), 2] : ['#7fe08a', 2];
      ctx.fillStyle = color as string;
      ctx.beginPath();
      ctx.arc(toX(a.x), toY(a.y), r as number, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 1;
    ctx.strokeRect(toX(view.x), toY(view.y), view.width * k, view.height * k);

    if (self && this.flag) this.trackFlag(this.flag, self, now);
    if (self && this.flag) {
      const fx = toX(this.flag.x), fy = toY(this.flag.y);
      ctx.strokeStyle = 'rgba(255, 224, 138, 0.85)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(toX(self.x), toY(self.y));
      ctx.lineTo(fx, fy);
      ctx.stroke();
      drawFlag(ctx, fx, fy);
    }

    if (self) {
      ctx.fillStyle = '#ffe08a';
      ctx.strokeStyle = '#000';
      ctx.beginPath();
      ctx.arc(toX(self.x), toY(self.y), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  private trackFlag(f: Flag, self: MapActor, now: number): void {
    const d = Math.hypot(self.x - f.x, self.y - f.y);
    if (Math.hypot(self.x - f.lx, self.y - f.ly) > 2 || Number.isNaN(f.lx)) { f.still = now; f.lx = self.x; f.ly = self.y; }
    f.min = Math.min(f.min, d);
    if (d <= FLAG_ARRIVE || d > f.min + FLAG_AWAY || (now - f.at > FLAG_STILL_MS && now - f.still > FLAG_STILL_MS)) this.flag = null;
  }
}

/** Small red flag planted at (x, y): pole + pennant, dark outline so it shows on any ground. */
function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#000';
  ctx.fillStyle = '#e8402c';
  ctx.beginPath();
  ctx.moveTo(x + 0.5, y - 12);
  ctx.lineTo(x + 9, y - 9);
  ctx.lineTo(x + 0.5, y - 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#f2e6c0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y + 1);
  ctx.lineTo(x, y - 12);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.beginPath();
  ctx.ellipse(x, y + 1, 3, 1.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

const HTML = `
<div id="hud-minimap" class="frame">
  <div class="mm-head">
    <span id="hud-map"></span>
    <span class="mm-btns">
      <button class="mm-btn world" id="travel-open" title="Chuyển bản đồ (${keyLabel('travel')})"></button>
      <button class="mm-btn switch" id="bigmap-open" title="Bản đồ lớn (${keyLabel('bigmap')})"></button>
      <button class="mm-btn fold" id="minimap-toggle" title="Thu gọn bản đồ nhỏ">–</button>
    </span>
  </div>
  <canvas id="minimap" width="200" height="200" title="Click để chạy tới vị trí đó (cắm cờ)"></canvas>
  <div class="mm-foot"><span id="hud-pos"></span><span id="hud-players"></span></div>
</div>`;

export interface MinimapHandlers {
  moveTo(x: number, y: number): void;
  openTravel(): void;
  toggleBigMap(): void;
}

/** Top right: map name, Chuyển bản đồ / Bản đồ lớn / thu gọn buttons, the minimap, position and players. */
export class MinimapPanel {
  private readonly map: Minimap;

  constructor(parent: HTMLElement, handlers: MinimapHandlers) {
    mount(parent, HTML);
    this.map = new Minimap($<HTMLCanvasElement>('minimap'), handlers.moveTo);
    $('travel-open').addEventListener('click', () => handlers.openTravel());
    $('bigmap-open').addEventListener('click', () => handlers.toggleBigMap());
    $('minimap-toggle').addEventListener('click', () => settings.set({ minimap: !settings.get().minimap }));
    settings.watch(s => {
      $('hud-minimap').classList.toggle('collapsed', !s.minimap);
      const btn = $('minimap-toggle');
      btn.textContent = s.minimap ? '–' : '+';
      btn.title = s.minimap ? 'Thu gọn bản đồ nhỏ' : 'Mở bản đồ nhỏ';
    });
  }

  setMap(meta: MapMeta): void {
    $('hud-map').textContent = meta.name;
    $('hud-map').title = `${meta.name}${meta.safe ? ' · Thành thị (không thể động võ)' : meta.pvp ? ' · Cho phép PK' : ''}`;
    this.map.setMap(meta);
  }

  /** Destination chosen elsewhere (Bản đồ lớn): same flag + line as a minimap click. */
  plant(x: number, y: number): void {
    this.map.plant(x, y);
  }

  setPos(text: string): void {
    $('hud-pos').textContent = text;
  }

  setPlayers(n: number): void {
    $('hud-players').textContent = `${n} người`;
    $('hud-players').title = `${n} người chơi trên bản đồ`;
  }

  draw(actors: Iterable<MapActor>, selfId: string, view: ViewRect): void {
    this.map.draw(actors, selfId, view);
  }
}
