import Phaser from 'phaser';
import { CAMP_COLORS, type Camp, jumpHeight } from '@vltk/shared';
import { makeLook, lookKey, hasNpc, type AssocKey } from '../../art/jx';
import type { ActorState } from '../../state/actor';
import { FRAME_MS, JxSprite, type Source } from './PaperDoll';
import { ui, uiPx, zoomPlate } from '../display';
import { StateDecor } from '../fx/StateDecor';

export type { ActorState };

/** Playback of one-shot actions: attacks a little faster than the original 18 fps so they fit the cooldowns. */
const ONE_SHOT_FPS: Partial<Record<AssocKey, number>> = { attack1: 30, attack2: 30, magic: 30, wound: 30, die: 18 };
const DEFAULT_HEIGHT = 90;

/**
 * One actor on screen, drawn from the original client art at 1:1. `peaceful` (town) uses the relaxed stand
 * and run of the original game; elsewhere players hold the fighting stance of their weapon. The ground shadow
 * (original shadow sprites, docs/shadows.md) is drawn by JxSprite; actors without one have none, like the original.
 * Khinh công ('jump'): the jump pose plays over the whole flight while the body rises on a parabola above its shadow.
 */
export class ActorView {
  /** Invisible point at the feet; the camera follows it. */
  readonly anchor: Phaser.GameObjects.Zone;
  private readonly label: Phaser.GameObjects.Text;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly decor: StateDecor;
  private jx: JxSprite | null = null;
  private sourceKey = '';
  private shown = false;
  x: number;
  y: number;
  private headHeight = DEFAULT_HEIGHT;
  /** Body height above the feet this frame (Khinh công). */
  private lift = 0;
  private lastBarKey = '';
  // animation clock
  private loopKey: AssocKey | null = null;
  private loopStart = 0;
  private oneShot: { key: AssocKey; start: number; ms: number; hold: boolean } | null = null;
  private seq = -1;

  constructor(private scene: Phaser.Scene, readonly id: string, readonly state: ActorState, readonly isSelf: boolean,
    private peaceful: boolean) {
    this.x = state.x;
    this.y = state.y;
    this.anchor = scene.add.zone(this.x, this.y, 1, 1);
    this.label = scene.add.text(this.x, this.y, '', {
      fontFamily: 'Segoe UI, Tahoma, sans-serif', fontSize: uiPx(13), stroke: '#000', strokeThickness: ui(3),
    }).setOrigin(0.5, 1).setDepth(1e6);
    this.bar = scene.add.graphics().setDepth(1e6);
    this.decor = new StateDecor(scene);
    this.syncSource();
  }

  /** Called every frame. */
  update(dt: number): void {
    const s = this.state;
    const dx = s.x - this.x, dy = s.y - this.y;
    if (Math.abs(dx) > 400 || Math.abs(dy) > 400) { this.x = s.x; this.y = s.y; }
    else {
      const k = 1 - Math.exp(-dt * 14);
      this.x += dx * k;
      this.y += dy * k;
    }
    this.anchor.setPosition(this.x, this.y);
    this.syncSource();
    this.lift = 0;
    this.shown = !!this.jx && this.renderSprite();
    this.drawPlate();
  }

  /** (Re)build the sprite source when equipment, horse or res changes. */
  private syncSource(): void {
    const s = this.state;
    let source: Source | null = null, key = '';
    if (s.kind === 'player') {
      const look = makeLook(s.gender, s.helm, s.armor, s.weapon, s.horse, s.mounted);
      source = { kind: 'look', look };
      key = lookKey(look);
    } else if (hasNpc(s.sprite)) {
      source = { kind: 'npc', res: s.sprite };
      key = s.sprite;
    }
    if (key === this.sourceKey) return;
    this.sourceKey = key;
    if (!source) { this.jx?.destroy(false); this.jx = null; return; }
    if (this.jx) this.jx.setSource(source);
    else this.jx = new JxSprite(this.scene, source);
  }

  private wanted(): AssocKey {
    const s = this.state;
    switch (s.anim) {
      case 'run': return this.peaceful ? 'townRun' : 'run';
      case 'attack': return 'attack1';
      case 'attack2': return 'attack2';
      case 'cast': return 'magic';
      case 'hurt': return 'wound';
      case 'die': return 'die';
      case 'jump': return 'jump';
      default: return this.peaceful || s.kind === 'npc' ? 'idle' : 'stand';
    }
  }

  private renderSprite(): boolean {
    const s = this.state, now = this.scene.time.now, jx = this.jx!;
    const key = this.wanted();
    const isOneShot = key in ONE_SHOT_FPS || key === 'jump';
    // Each server one-shot (new animSeq) plays once; moving cancels an unfinished attack; death holds its last frame.
    // A jump lasts its flight time (Actor.jumpMs).
    if (isOneShot && s.animSeq !== this.seq) {
      const frames = jx.framesOf(key) || 10;
      const ms = key === 'jump' ? Math.max(1, s.jumpMs || 800) : (frames * 1000) / ONE_SHOT_FPS[key]!;
      this.oneShot = { key, start: now, ms, hold: key === 'die' };
    }
    this.seq = s.animSeq;
    let shot = this.oneShot;
    if (shot && !shot.hold && (now - shot.start >= shot.ms || s.anim === 'run')) shot = this.oneShot = null;
    if (shot?.key === 'die' && s.anim !== 'die') shot = this.oneShot = null; // revived

    if (shot) {
      const t = (now - shot.start) / shot.ms;
      if (shot.key === 'jump') this.lift = jumpHeight(now - shot.start, shot.ms);
      return jx.render(this.x, this.y, this.y, shot.key, s.dir & 7, n => Math.min(n - 1, Math.floor(t * n)), this.lift);
    }
    if (key === 'die') return jx.render(this.x, this.y, this.y, 'die', s.dir & 7, n => n - 1);
    if (key !== this.loopKey) { this.loopKey = key; this.loopStart = now; }
    const loop = isOneShot ? (this.peaceful ? 'idle' : 'stand') : key;
    return jx.render(this.x, this.y, this.y, loop, s.dir & 7, n => Math.floor((now - this.loopStart) / FRAME_MS) % n);
  }

  private drawPlate(): void {
    const s = this.state;
    const plate = zoomPlate();
    if (this.shown && this.jx!.height > 0) this.headHeight = this.jx!.height + 8;
    const top = Math.round(this.y - this.lift - this.headHeight);
    // Players: the colour of their camp (own, or the team leader's) — shared CAMP_COLORS; Đồ sát is marked.
    const color = s.kind === 'npc' ? '#9cf08a'
      : s.kind === 'monster' ? (s.boss ? '#ff9b3d' : '#9fd8ff')
      : CAMP_COLORS[(s.camp || 'new') as Camp] ?? '#ffffff';
    const text = s.kind === 'monster' ? `${s.name} (${s.level})` : `${s.name}${s.pk === 2 ? ' [Đồ sát]' : s.pk === 1 ? ' [Chiến đấu]' : ''}`;
    if (this.label.text !== text) this.label.setText(text);
    if (this.label.style.color !== color) this.label.setColor(color);
    if (this.label.scaleX !== plate.textScale) this.label.setScale(plate.textScale);
    this.label.setPosition(Math.round(this.x), top - Math.max(2, ui(plate.gapY)));
    if (s.hp > 0 || s.kind === 'npc') {
      // Under-foot pictures stay on the ground during a jump, the others rise with the body.
      this.decor.update(s.states ?? [], Math.round(this.x), Math.round(this.y), this.headHeight - 8 + this.lift);
    } else this.decor.update([], 0, 0, 0);

    const w = Math.max(10, ui(s.boss ? plate.barBossW : plate.barW)), bh = Math.max(2, ui(plate.barH));
    const ratio = s.maxHp ? Math.max(0, s.hp / s.maxHp) : 0;
    const barKey = `${Math.round(this.x)},${top},${ratio.toFixed(3)},${s.pk},${plate.zoom}`;
    if (barKey === this.lastBarKey) return;
    this.lastBarKey = barKey;
    this.bar.clear();
    if (s.hp <= 0 || s.kind === 'npc') return;
    const bx = Math.round(this.x - w / 2);
    this.bar.fillStyle(0x000000, 0.7).fillRect(bx - 1, top - bh - 1, w + 2, bh + 2);
    // Players (self too): green, red once they turn PK on (Chiến đấu / Đồ sát) — USER 2026-11-13. Monsters red.
    const barColor = s.kind === 'monster' ? 0xd8402f : s.pk > 0 ? 0xd8402f : 0x4fd16b;
    this.bar.fillStyle(barColor, 1)
      .fillRect(bx, top - bh, Math.round(w * ratio), bh);
  }

  /** Point (world) hit test for clicking on the actor. */
  contains(wx: number, wy: number): boolean {
    if (this.state.hp <= 0 && this.state.kind !== 'npc') return false;
    const half = this.jx?.mounted ? 44 : 26;
    return Math.abs(wx - this.x) <= half && wy >= this.y - this.headHeight && wy <= this.y + 8;
  }

  /** Top-of-head position for floating text. */
  get headY(): number {
    return this.y - this.lift - this.headHeight;
  }

  setPeaceful(on: boolean): void {
    this.peaceful = on;
  }

  destroy(fade: boolean): void {
    this.label.destroy();
    this.bar.destroy();
    this.decor.destroy();
    this.anchor.destroy();
    this.jx?.destroy(fade && this.shown);
  }
}
