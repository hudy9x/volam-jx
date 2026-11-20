import Phaser from 'phaser';
import { JX_TICK_MS, MoveKind, getMissile, getSkill, isoDistance, logicAngle, type FxEvent, type FxRef, type MissileDef } from '@vltk/shared';
import { SKILL_FX } from './fx.gen';
import { assetUrl } from '../../art/assets';

/** Something the effects can follow (actor views). */
export interface FxAnchor { x: number; y: number }

const MAX_TEX = 4096;
const TAU = Math.PI * 2;

// ======================= sheets =======================

const pageTex = (key: string, page: number) => (page ? `fx:${key}.${page}` : `fx:${key}`);
const pageUrl = (key: string, page: number) => assetUrl(`${key}${page ? `.${page}` : ''}.webp`);

/** [cell w, cell h, left, top (from the anchor), frames/dir, dirs, cols, additive, sprite ms, pages] */
const meta = (key: string) => SKILL_FX[key];

function perPage(m: readonly number[]): number {
  return m[6] * Math.max(1, Math.floor(MAX_TEX / m[1]));
}

/** Queue the sheet's pages; true once all are loaded (and sliced into frames "0", "1", …). */
export function fxReady(scene: Phaser.Scene, key: string): boolean {
  const m = meta(key);
  if (!m) return false;
  const pages = m[9] || 1;
  let ready = true, queued = false;
  for (let p = 0; p < pages; p++) {
    const tex = pageTex(key, p);
    if (scene.textures.exists(tex)) continue;
    ready = false;
    scene.load.image(tex, pageUrl(key, p));
    queued = true;
  }
  if (queued && !scene.load.isLoading()) scene.load.start();
  if (!ready) return false;
  const first = scene.textures.get(pageTex(key, 0));
  if (!first.has('0')) {
    const total = m[4] * m[5], pp = perPage(m);
    for (let p = 0; p < pages; p++) {
      const tex = scene.textures.get(pageTex(key, p));
      const count = Math.min(pp, total - p * pp);
      for (let i = 0; i < count; i++) tex.add(String(i), 0, (i % m[6]) * m[0], Math.floor(i / m[6]) * m[1], m[0], m[1]);
    }
  }
  return true;
}

/** Sheet row for a direction given as a logic-space angle (row 0 = south, clockwise like the characters). */
export function fxRow(key: string, angle: number): number {
  const dirs = meta(key)?.[5] ?? 1;
  if (dirs <= 1) return 0;
  const frac = (((Math.atan2(-Math.cos(angle), Math.sin(angle)) / TAU) % 1) + 1) % 1;
  return Math.round(frac * dirs) % dirs;
}

/** Point an image at frame `col` of `row` of an effect sheet, anchored at (x, y). */
export function showFx(img: Phaser.GameObjects.Image, key: string, row: number, col: number, x: number, y: number): void {
  const m = meta(key)!;
  const index = row * m[4] + Math.min(m[4] - 1, col);
  const pp = perPage(m), page = Math.floor(index / pp);
  const tex = pageTex(key, page), frame = String(index - page * pp);
  if (img.texture.key !== tex || img.frame.name !== frame) img.setTexture(tex, frame);
  img.setPosition(Math.round(x + m[2]), Math.round(y + m[3]));
  img.setBlendMode(m[7] ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
}

const framesPerDir = (key: string) => meta(key)?.[4] ?? 1;

// ======================= effects =======================

interface OneShot { img: Phaser.GameObjects.Image; key: string; tpf: number; row: number; x: number; y: number; start: number; depth: number; follow?: FxAnchor; until: number }

interface Flying {
  def: MissileDef;
  img: Phaser.GameObjects.Image;
  fx: FxRef | undefined;
  x: number;
  y: number;
  angle: number;
  /** Logic px per ms. */
  speed: number;
  born: number;
  dies: number;
  last: number;
  height: number;
  follow?: string;
  owner?: string;
  from?: FxAnchor;
  to?: FxAnchor;
}

/**
 * Draws the original skill effects for the engine's fx events: pre-cast effects on the caster, missiles
 * (flown locally from their spawn event: straight, homing, lobbed, or riding the caster) and their hit /
 * vanish effects. Works for any caster, so the same code serves the world and the skill lab.
 */
export class SkillFx {
  private flying = new Map<number, Flying>();
  private shots: OneShot[] = [];

  constructor(private scene: Phaser.Scene, private anchorOf: (id: string) => FxAnchor | undefined) {}

  /** Handles cast / msl / mend; returns false for events it does not draw. */
  handle(e: FxEvent): boolean {
    switch (e.t) {
      case 'cast': {
        const s = getSkill(e.skill);
        const at = this.anchorOf(e.id) ?? { x: e.x, y: e.y };
        if (s?.pre) this.oneShot(s.pre, at.x, at.y, { follow: this.anchorOf(e.id), depthBias: 2 });
        return true;
      }
      case 'msl': this.spawn(e); return true;
      case 'mend': {
        const f = e.m ? this.flying.get(e.m) : undefined;
        if (f) { f.img.destroy(); this.flying.delete(e.m); }
        const def = f?.def ?? getMissile(e.k);
        const end = e.c ? def?.fx?.collide ?? def?.fx?.vanish : def?.fx?.vanish;
        // Falling meteors (zSpeed < 0) start high in the sky (def.height) and land at ground level (z = 0).
        const height = def?.zSpeed && def.zSpeed < 0 ? 0 : def?.height;
        if (end) this.oneShot(end.key, e.x, e.y, { tpf: end.tpf, angle: f?.angle, height });
        return true;
      }
      default: return false;
    }
  }

  /** Play an effect sheet once at a point (or on a moving anchor). */
  oneShot(key: string, x: number, y: number, opts: { tpf?: number; angle?: number; height?: number; follow?: FxAnchor; depthBias?: number } = {}): void {
    const m = meta(key);
    if (!m) return;
    // Pre-cast sheets carry their own speed (sprite ms/frame); missile effects use missles.txt ticks.
    const tpf = opts.tpf ?? (m[8] >= 20 ? m[8] / JX_TICK_MS : 1);
    const img = this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setVisible(false);
    const now = this.scene.time.now;
    this.shots.push({
      img, key, tpf, row: opts.angle !== undefined ? fxRow(key, opts.angle) : 0, x, y: y - (opts.height ?? 0), start: now,
      depth: y + (opts.depthBias ?? 1), follow: opts.follow, until: now + 1500,
    });
  }

  private spawn(e: Extract<FxEvent, { t: 'msl' }>): void {
    const def = getMissile(e.k);
    if (!def) return;
    const now = this.scene.time.now;
    const img = this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0).setVisible(false);
    this.flying.set(e.m, {
      def, img, fx: def.fx?.fly ?? def.fx?.wait, x: e.x, y: e.y, angle: e.a, speed: e.v / 1000, born: now, dies: now + e.l, last: now,
      height: def.height ?? 0, follow: e.f, owner: e.o,
      from: e.tx !== undefined ? { x: e.x, y: e.y } : undefined,
      to: e.tx !== undefined && e.ty !== undefined ? { x: e.tx, y: e.ty } : undefined,
    });
  }

  update(): void {
    const now = this.scene.time.now;
    for (const [id, f] of this.flying) {
      if (now >= f.dies + 400) { f.img.destroy(); this.flying.delete(id); continue; } // its mend got lost
      this.move(f, Math.min(now, f.dies));
      if (!f.fx || !fxReady(this.scene, f.fx.key)) continue;
      const frames = framesPerDir(f.fx.key);
      const t = Math.floor((now - f.born) / (f.fx.tpf * JX_TICK_MS));
      const col = f.def.loop ? t % frames : Math.min(frames - 1, t);
      let z = f.height;
      if (f.from && f.to) { // lobbed: arc over the flight
        const k = Math.min(1, (now - f.born) / Math.max(1, f.dies - f.born));
        z += 4 * Math.min(140, isoDistance(f.from.x, f.from.y, f.to.x, f.to.y) / 3) * k * (1 - k);
      } else if (f.def.zSpeed && f.def.zSpeed < 0 && f.height > 0) { // falling meteor (Thiên Ngoại Lưu Tinh…)
        const k = Math.min(1, (now - f.born) / Math.max(1, f.dies - f.born));
        z = Math.max(0, f.height * (1 - k));
      }
      showFx(f.img, f.fx.key, fxRow(f.fx.key, f.angle), col, f.x, f.y - z);
      f.img.setDepth(f.y + 1).setVisible(true);
    }
    this.shots = this.shots.filter(s => {
      if (!fxReady(this.scene, s.key)) {
        if (now > s.until) { s.img.destroy(); return false; }
        return true;
      }
      if (!s.img.visible) s.start = Math.max(s.start, now - 50); // started late: play from the beginning
      const col = Math.floor((now - s.start) / (s.tpf * JX_TICK_MS));
      if (col >= framesPerDir(s.key)) { s.img.destroy(); return false; }
      const x = s.follow ? s.follow.x : s.x, y = s.follow ? s.follow.y : s.y;
      showFx(s.img, s.key, s.row, col, x, y);
      s.img.setDepth(s.follow ? s.follow.y + 2 : s.depth).setVisible(true);
      return true;
    });
  }

  private move(f: Flying, until: number): void {
    const dt = until - f.last;
    if (dt <= 0) return;
    f.last = until;
    const move = f.def.move ?? MoveKind.Stand;
    if (f.owner) {
      const o = this.anchorOf(f.owner);
      if (o) { f.x = o.x; f.y = o.y; }
      return;
    }
    if (!f.speed) return;
    const homingReady = f.last - f.born >= (f.def.homingDelay ?? 0) * JX_TICK_MS;
    if (homingReady && f.follow) {
      const t = this.anchorOf(f.follow);
      if (t) {
        const want = logicAngle(f.x, f.y, t.x, t.y);
        let diff = ((want - f.angle + Math.PI * 3) % TAU) - Math.PI;
        const turn = move === MoveKind.SingleLine ? Math.PI : 0.35 * (dt / JX_TICK_MS);
        diff = Math.max(-turn, Math.min(turn, diff));
        f.angle += diff;
      }
    }
    const d = f.speed * dt;
    f.x += Math.cos(f.angle) * d;
    f.y += (Math.sin(f.angle) * d) / 2;
  }

  destroy(): void {
    for (const f of this.flying.values()) f.img.destroy();
    for (const s of this.shots) s.img.destroy();
    this.flying.clear();
    this.shots = [];
  }
}
