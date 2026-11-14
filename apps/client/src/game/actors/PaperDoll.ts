import Phaser from 'phaser';
import {
  FOOT_X, FOOT_Y, drawOrder, npcPose, poseFor, spriteRow,
  type AssocKey, type Layer, type Look, type NpcAction, type Pose,
} from '../../art/jx';
import { jxTextureKey, requestSheets, sheetReady } from './sheets';

/** The original engine runs at 18 frames per second. */
export const FRAME_MS = 1000 / 18;
/** Parts that define the figure's height (head, hair, body, horse) — weapons are ignored. */
const HEIGHT_PARTS = new Set([0, 1, 5, 12, 13, 14]);
const RETRY_MS = 3000;
/** Poses requested as soon as a look appears, so the common actions don't pop in later (others: when first drawn). */
const PREFETCH: AssocKey[] = ['stand', 'idle', 'run', 'townRun', 'attack1', 'attack2', 'magic', 'wound', 'die'];
/** Shadows sit under the actor's other ground decorations (StateDecor draws under-foot effects at depth - 0.5). */
const SHADOW_DEPTH = -0.6;

export type Source = { kind: 'look'; look: Look } | { kind: 'npc'; res: string };

/**
 * One actor drawn from original JX sheets at 1:1 (positions rounded to whole pixels so the art stays sharp).
 * Players use the layered paper-doll; monsters / NPCs a single layer. Images are pooled and re-sorted every frame.
 */
export class JxSprite {
  private images: Phaser.GameObjects.Image[] = [];
  private shadow: Phaser.GameObjects.Image | null = null;
  private source!: Source;
  private requestedAt = -Infinity;
  /** Poses already asked for with the current source. */
  private asked = new Set<AssocKey>();
  /** Figure height above the feet in world px (nameplates, click boxes). */
  height = 0;
  /** Frames per direction of the pose drawn last (callers time one-shots with it). */
  frames = 1;
  frame = 0;
  action = '';

  constructor(private scene: Phaser.Scene, source: Source) {
    this.setSource(source);
  }

  get mounted(): boolean {
    return this.source.kind === 'look' && this.source.look.horse >= 0;
  }

  setSource(source: Source): void {
    this.source = source;
    this.requestedAt = -Infinity;
    this.asked.clear();
  }

  private pose(key: AssocKey): Pose | null {
    const s = this.source;
    if (s.kind === 'look') return poseFor(s.look, key);
    return npcPose(s.res, NPC_KEY[key]);
  }

  private request(wanted: AssocKey): void {
    const keys = new Set<string>();
    for (const k of PREFETCH.includes(wanted) ? PREFETCH : [wanted, ...PREFETCH]) {
      const pose = this.pose(k);
      for (const l of pose?.layers ?? []) keys.add(l.key);
      if (pose?.shadow) keys.add(pose.shadow.key);
    }
    requestSheets(this.scene, keys);
  }

  /** Number of frames per direction of a pose (0 when unknown). */
  framesOf(key: AssocKey): number {
    return this.pose(key)?.body.meta[4] ?? 0;
  }

  /**
   * Draw `key` at the feet position. `frame` is the frame within one direction. Falls back to the standing
   * pose while the wanted one loads; returns false (drawing nothing) until anything is ready. `lift` raises the
   * body above its feet (Khinh công); the shadow stays on the ground.
   */
  render(x: number, y: number, depth: number, key: AssocKey, dir: number, frame: (frames: number) => number, lift = 0): boolean {
    const now = this.scene.time.now;
    let pose = this.pose(key);
    const ready = !!pose && pose.layers.every(l => sheetReady(this.scene, l));
    // A pose outside PREFETCH (the jump) is asked for the first time it is wanted.
    if (now - this.requestedAt > RETRY_MS || (!ready && pose && !this.asked.has(key))) {
      this.requestedAt = now;
      this.asked.add(key);
      this.request(key);
    }
    if (!ready || !pose) {
      pose = this.pose('stand');
      if (!pose || !pose.layers.every(l => sheetReady(this.scene, l))) { this.hide(); return false; }
    }
    const bodyFrames = pose.body.meta[4];
    this.frames = bodyFrames;
    const f = Math.max(0, Math.min(bodyFrames - 1, frame(bodyFrames)));
    this.frame = f; this.action = key;
    let layers = pose.layers;
    if (layers.length > 1 && this.source.kind === 'look') {
      const order = drawOrder(this.source.look.sx, pose, dir, f);
      layers = layers.slice().sort((a, b) => rank(order, a.part) - rank(order, b.part));
    }
    const fx = Math.round(x), fy = Math.round(y), by = Math.round(y - lift);
    if (pose.shadow && sheetReady(this.scene, pose.shadow)) {
      this.shadow ??= this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0);
      this.place(this.shadow, pose.shadow, fx, fy, depth + SHADOW_DEPTH, dir, f, bodyFrames);
    } else this.shadow?.setVisible(false);
    let used = 0, height = 0;
    for (const layer of layers) {
      const img = this.images[used] ?? (this.images[used] = this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0));
      this.place(img, layer, fx, by, depth + used * 0.001, dir, f, bodyFrames);
      used++;
      if (HEIGHT_PARTS.has(layer.part)) height = Math.max(height, FOOT_Y - layer.meta[3]);
    }
    for (let i = used; i < this.images.length; i++) this.images[i].setVisible(false);
    this.height = height;
    return true;
  }

  private place(img: Phaser.GameObjects.Image, layer: Layer, x: number, y: number, depth: number,
    dir: number, frame: number, bodyFrames: number): void {
    const [, , bx, by, perDir, dirs] = layer.meta;
    const col = perDir === bodyFrames ? frame : Math.min(perDir - 1, Math.floor((frame * perDir) / bodyFrames));
    const key = jxTextureKey(layer.key), name = `${spriteRow(dir, dirs)}_${col}`;
    if (img.texture.key !== key || img.frame.name !== name) img.setTexture(key, name);
    img.setPosition(x + bx - FOOT_X, y + by - FOOT_Y).setDepth(depth).setVisible(true).setAlpha(1);
  }

  hide(): void {
    for (const img of this.images) img.setVisible(false);
    this.shadow?.setVisible(false);
  }

  destroy(fade: boolean): void {
    const images = this.shadow ? [this.shadow, ...this.images] : this.images;
    this.images = [];
    this.shadow = null;
    if (!fade) { for (const img of images) img.destroy(); return; }
    this.scene.tweens.add({ targets: images, alpha: 0, duration: 600, onComplete: () => images.forEach(img => img.destroy()) });
  }
}

/** Parts missing from an order list go behind everything. */
const rank = (order: number[], part: number) => {
  const i = order.indexOf(part);
  return i < 0 ? -1 : i;
};

const NPC_KEY: Record<AssocKey, NpcAction> = {
  stand: 'stand', idle: 'idle', idle2: 'idle', run: 'run', townRun: 'run', wound: 'wound', die: 'die',
  attack1: 'attack1', attack2: 'attack1', magic: 'magic', jump: 'run',
};
