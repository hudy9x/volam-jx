import Phaser from 'phaser';
import {
  coldMovement, CAMP_COLORS, SPEED, resolveSpeed, type Camp, jumpHeight,
  attackSpeedPct, castSpeedPct, speedPoints, totalSpeedPercents, attrOf,
} from '@vltk/shared';
import { makeLook, lookKey, hasNpc, type AssocKey } from '../../art/jx';
import type { ActorState } from '../../state/actor';
import { progress } from '../../state/progress';
import { FRAME_MS, JxSprite, type Source } from './PaperDoll';
import { ui, uiPx, textResolution, zoomPlate } from '../display';
import { StateDecor } from '../fx/StateDecor';
import { controlAppearance } from '../fx/controlEffects';

export type { ActorState };

/** Action keys; attacks use the snapshotted actionMs, while hurt/death have fallback playback rates. */
const ONE_SHOT_FPS: Partial<Record<AssocKey, number>> = { attack1: 18, attack2: 18, magic: 18, wound: 30, die: 18 };
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
  private readonly leaderFlag: Phaser.GameObjects.Graphics;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly decor: StateDecor;
  private jx: JxSprite | null = null;
  private sourceKey = '';
  private shown = false;
  /** Diagnostic A/B switch. State and animation clocks advance while culled. */
  cullingEnabled = true;
  private inView = true;
  private diedAt: number | null = null;
  x: number;
  y: number;
  private headHeight = DEFAULT_HEIGHT;
  /** Body height above the feet this frame (Khinh công). */
  private lift = 0;
  private lastBarKey = '';
  // animation clock
  private loopKey: AssocKey | null = null;
  private loopAt = 0;
  private loopFrame = 0;
  private oneShot: { key: AssocKey; start: number; ms: number; hold: boolean } | null = null;
  private seq = -1;
  private frozen: { at: number; key: AssocKey; frame: number; dir: number } | null = null;
  private drawnDir = 0;
  private attackTrace: {
    key: AssocKey;
    start: number;
    ms: number;
    frames: number;
    drawCount: number;
    phaseFps: number;
    phasePercent: number;
    cycleMs: number;
    totalPct: number;
    aspdText: string;
  } | null = null;
  private runTrace: {
    start: number;
    moveScale: number;
    loop: AssocKey;
    frames: number;
    cycleMs: number;
    phaseFps: number;
    phasePercent: number;
    runPoints: number;
    runBonus: number;
    totalRun: number;
  } | null = null;

  constructor(private scene: Phaser.Scene, readonly id: string, readonly state: ActorState, readonly isSelf: boolean,
    private peaceful: boolean) {
    this.x = state.x;
    this.y = state.y;
    this.anchor = scene.add.zone(this.x, this.y, 1, 1);
    this.label = scene.add.text(this.x, this.y, '', {
      resolution: textResolution(), fontFamily: 'Segoe UI, Tahoma, sans-serif', fontSize: uiPx(13), stroke: '#000', strokeThickness: ui(3),
    }).setOrigin(0.5, 1).setDepth(1e6);
    this.leaderFlag = scene.add.graphics().setDepth(1e6);
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
    const shot = this.oneShot;
    const lift = shot?.key === 'jump' ? jumpHeight(this.scene.time.now - shot.start, shot.ms) : 0;
    const camera = this.scene.cameras?.main;
    this.inView = !this.cullingEnabled || !camera || !this.jx ||
      this.jx.intersects(camera.worldView, this.x, this.y, this.wanted(), lift) ||
      (!!shot && this.jx.intersects(camera.worldView, this.x, this.y, shot.key, lift)) ||
      (!!this.frozen && this.jx.intersects(camera.worldView, this.x, this.y, this.frozen.key, lift));
    this.lift = 0;
    const dead = s.kind !== 'npc' && s.hp <= 0;
    if (dead) this.diedAt ??= this.scene.time.now;
    else this.diedAt = null;
    if (this.diedAt !== null && this.scene.time.now - this.diedAt >= 2000) {
      this.jx?.hide();
      this.shown = false;
    } else this.shown = !!this.jx && this.renderSprite();
    if (this.inView) {
      this.label.setVisible(true);
      this.bar.setVisible(true);
      this.drawPlate();
    } else {
      this.jx?.hide();
      this.leaderFlag.setVisible(false);
      this.label.setVisible(false);
      this.bar.setVisible(false);
      const s = this.state;
      const alive = s.hp > 0 || s.kind === 'npc';
      this.decor.update(alive ? [...(s.states ?? []), ...(s.passiveFx ?? [])] : [], this.x, this.y, this.headHeight, alive ? s.ctl ?? 0 : 0, false);
    }
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
    if (!source) { this.jx?.destroy(); this.jx = null; return; }
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
    const render = (...args: Parameters<JxSprite['render']>) => {
      if (this.inView) return jx.render(...args);
      // Keep the virtual pose/frame current, including a later freeze while off screen.
      const n = jx.framesOf(args[3]) || 1;
      jx.frames = n;
      jx.frame = Math.max(0, Math.min(n - 1, args[5](n)));
      jx.action = args[3];
      return false;
    };
    const alive = s.hp > 0 && s.kind !== 'npc';
    const control = controlAppearance(s.ctl ?? 0, alive);
    jx.tint = control.tint;
    if (control.frozen) {
      this.frozen ??= { at: now, key: (jx.action || this.wanted()) as AssocKey, frame: jx.frame, dir: this.drawnDir };
      const held = this.frozen;
      return render(this.x, this.y, this.y, held.key, held.dir, () => held.frame);
    }
    if (this.frozen) {
      // Exclude the pause from both animation clocks; death must always start immediately.
      if (this.oneShot) this.oneShot.start += now - this.frozen.at;
      this.loopAt = now;
      if (this.wanted() !== this.frozen.key) this.oneShot = null;
      this.frozen = null;
    }
    this.drawnDir = s.dir & 7;
    const key = this.wanted();
    const isOneShot = key in ONE_SHOT_FPS || key === 'jump';
    // Each server one-shot (new animSeq) plays once; moving cancels an unfinished attack; death holds its last frame.
    // A jump lasts its flight time (Actor.jumpMs).
    if (isOneShot && s.animSeq !== this.seq) {
      const frames = jx.framesOf(key) || 10;
      const ms = key === 'die' ? (frames * 1000) / ONE_SHOT_FPS.die! : key === 'jump' ? Math.max(1, s.jumpMs || 800) : s.actionMs || (key === 'attack1' || key === 'attack2' || key === 'magic' ? resolveSpeed('attack', SPEED.basePercent).cycleMs : (frames * 1000) / ONE_SHOT_FPS[key]!);
      this.oneShot = { key, start: now, ms, hold: key === 'die' };
      if (this.isSelf && (key === 'attack1' || key === 'attack2' || key === 'magic')) {
        const p = progress.get();
        const slowed = !!((s.ctl ?? 0) & 2);
        const totals = p?.combat ? totalSpeedPercents(p.combat.bag, slowed) : null;
        const isCast = key === 'magic';
        const aspdBonus = p?.combat ? `${attackSpeedPct(p.combat.bag)}% / ${castSpeedPct(p.combat.bag)}%` : '0% / 0%';
        const totalPct = totals ? (isCast ? totals.cast : totals.attack) : SPEED.basePercent;
        const resolved = resolveSpeed('attack', totalPct);
        this.attackTrace = {
          key, start: now, ms, frames, drawCount: 0,
          phaseFps: resolved.fps, phasePercent: resolved.phasePercent,
          cycleMs: resolved.cycleMs, totalPct, aspdText: aspdBonus,
        };
        const fpsVeLyThuyet = (frames * 1000 / ms).toFixed(2);
        console.log([
          `[TỐC ĐỘ ĐÁNH - BẮT ĐẦU]`,
          `• Hành động: ${key} (${isCast ? 'Nội công/magic' : 'Ngoại công/vũ khí'})`,
          `• Hiển thị F3/N: T.Độ đánh = ${aspdBonus} (Ngoại / Nội cộng thêm)`,
          `• Cài đặt tuning.ts: Nền ${SPEED.basePercent}% | Tổng ${totalPct}% -> Mốc: ${resolved.phasePercent}% | Chuẩn: ${SPEED.attack.referenceFrames} frames @ ${resolved.fps} FPS -> Thời lượng chuẩn: ${Math.round(resolved.cycleMs)}ms`,
          `• Server đồng bộ: actionMs = ${s.actionMs ?? 0}ms`,
          `• Client vẽ Canvas: Sprite sheet có ${frames} frames | Thời lượng vẽ: ${Math.round(ms)}ms -> FPS vẽ sprite: ${fpsVeLyThuyet} FPS`,
          `• So sánh: Chuẩn ${SPEED.attack.referenceFrames} frames @ ${resolved.fps} FPS (${Math.round(resolved.cycleMs)}ms) <=> Sprite ${frames} frames @ ${fpsVeLyThuyet} FPS (${Math.round(ms)}ms)`,
        ].join('\n'));
      }
    }
    this.seq = s.animSeq;
    let shot = this.oneShot;
    if (shot && !shot.hold && (now - shot.start >= shot.ms || s.anim === 'run')) {
      if (this.isSelf && this.attackTrace) {
        const actualMs = Math.max(1, now - this.attackTrace.start);
        const actualFps = (this.attackTrace.frames * 1000 / actualMs).toFixed(2);
        const screenFps = (this.attackTrace.drawCount * 1000 / actualMs).toFixed(1);
        console.log([
          `[TỐC ĐỘ ĐÁNH - KẾT THÚC]`,
          `• Hành động: ${this.attackTrace.key} | Thời gian chạy thực tế: ${Math.round(actualMs)}ms (Dự kiến: ${Math.round(this.attackTrace.ms)}ms)`,
          `• Canvas đã vẽ: ${this.attackTrace.drawCount} frames (FPS màn hình: ${screenFps} FPS)`,
          `• Sprite hoàn tất: ${this.attackTrace.frames} frames -> FPS vẽ thực tế đo được: ${actualFps} FPS`,
          `• So sánh đối chiếu: Cài đặt ${this.attackTrace.phaseFps} FPS (${Math.round(this.attackTrace.cycleMs)}ms) <=> Đo thực tế ${actualFps} FPS (${Math.round(actualMs)}ms) [Lệch: ${Math.round(actualMs - this.attackTrace.ms)}ms]`,
        ].join('\n'));
        this.attackTrace = null;
      }
      shot = this.oneShot = null;
    }
    if (shot?.key === 'die' && s.anim !== 'die') shot = this.oneShot = null; // revived

    if (shot) {
      if (this.isSelf && this.attackTrace) this.attackTrace.drawCount++;
      this.loopKey = null;
      const t = (now - shot.start) / shot.ms;
      if (shot.key === 'jump') this.lift = jumpHeight(now - shot.start, shot.ms);
      return render(this.x, this.y, this.y, shot.key, s.dir & 7, n => Math.min(n - 1, Math.floor(t * n)), this.lift);
    }
    if (key === 'die') {
      this.loopKey = null;
      return render(this.x, this.y, this.y, 'die', s.dir & 7, n => n - 1);
    }
    const loop = isOneShot ? (this.peaceful ? 'idle' : 'stand') : key;
    if (loop !== this.loopKey) {
      this.loopKey = loop;
      this.loopFrame = 0;
      this.loopAt = now;
    }
    // Integrate each interval so changing speed never rescales the elapsed history (which skips frames).
    // Only the running gait follows movement; standing and one-shot actions keep their own clocks.
    const running = loop === 'run' || loop === 'townRun';
    const cold = s.hp > 0 && !!((s.ctl ?? 0) & 2);
    const cycleMs = cold ? coldMovement().cycleMs : s.runMs ?? resolveSpeed('run', SPEED.basePercent).cycleMs / Math.max(0.001, s.moveScale ?? 1);
    if (this.isSelf) {
      if (running) {
        const p = progress.get();
        const slowed = !!((s.ctl ?? 0) & 2);
        const totals = p?.combat ? totalSpeedPercents(p.combat.bag, slowed) : null;
        const runBonus = p?.combat ? attrOf(p.combat.bag, 'fastwalkrun_p') : 0;
        const totalRun = totals ? totals.run : SPEED.basePercent;
        const runResolved = resolveSpeed('run', totalRun);
        const points = speedPoints(totalRun);
        const frames = jx.framesOf(loop) || 14;
        const spriteFps = (frames * 1000 / cycleMs).toFixed(2);

        if (!this.runTrace || this.runTrace.moveScale !== s.moveScale || this.runTrace.loop !== loop) {
          this.runTrace = {
            start: now, moveScale: s.moveScale ?? 1, loop,
            frames, cycleMs, phaseFps: runResolved.fps, phasePercent: runResolved.phasePercent,
            runPoints: points, runBonus, totalRun,
          };
          console.log([
            `[TỐC ĐỘ DI CHUYỂN - BẮT ĐẦU / ĐỔI TỐC]`,
            `• Hiển thị F3/N: T.Độ Chạy = ${points} điểm (Cộng thêm: ${runBonus}%)`,
            `• Cài đặt tuning.ts: Nền ${SPEED.basePercent}% | Tổng ${totalRun}% -> Mốc: ${runResolved.phasePercent}% | Chuẩn: ${SPEED.run.referenceFrames} frames @ ${runResolved.fps} FPS -> Chu kỳ chuẩn: ${Math.round(runResolved.cycleMs)}ms | moveScale: ${runResolved.multiplier.toFixed(2)}`,
            `• Server đồng bộ: moveScale = ${s.moveScale ?? 1} | Đang cưỡi: ${s.mounted ? 'Có' : 'Không'}`,
            `• Client vẽ Canvas: Sprite sheet có ${frames} frames | Chu kỳ vẽ 1 vòng bước: ${Math.round(cycleMs)}ms -> FPS vẽ sprite: ${spriteFps} FPS`,
            `• So sánh: Chuẩn ${SPEED.run.referenceFrames} frames @ ${runResolved.fps} FPS (${Math.round(runResolved.cycleMs)}ms) <=> Sprite ${frames} frames @ ${spriteFps} FPS (${Math.round(cycleMs)}ms)`,
          ].join('\n'));
        }
      } else if (this.runTrace) {
        const ranMs = now - this.runTrace.start;
        const cycles = (ranMs / this.runTrace.cycleMs).toFixed(1);
        console.log([
          `[TỐC ĐỘ DI CHUYỂN - DỪNG]`,
          `• Thời gian chạy: ${Math.round(ranMs)}ms | Hoàn thành: ~${cycles} chu kỳ bước chân (chu kỳ: ${Math.round(this.runTrace.cycleMs)}ms/bước)`,
        ].join('\n'));
        this.runTrace = null;
      }
    }
    // Cold running uses the shared fixed cycle with no additional visual slowdown.
    // Attack duration remains snapshotted by the server.
    this.loopFrame += Math.max(0, now - this.loopAt) / (running ? cycleMs : FRAME_MS) * (running && cold ? 1 : control.loopRate);
    this.loopAt = now;
    return render(this.x, this.y, this.y, loop, s.dir & 7, n => Math.floor(running ? this.loopFrame * n : this.loopFrame) % n);
  }

  private drawPlate(): void {
    const s = this.state;
    this.label.setVisible(s.kind === 'npc' || s.hp > 0);
    const plate = zoomPlate();
    if (this.shown && this.jx!.height > 0) this.headHeight = this.jx!.height + 8;
    const top = Math.round(this.y - this.lift - this.headHeight);
    this.leaderFlag.clear().setVisible(s.kind === 'player' && !!s.team && !!s.teamLeader && s.hp > 0);
    if (s.kind === 'player' && s.team && s.teamLeader && s.hp > 0) {
      const x=Math.round(this.x), y=top-ui(32);
      this.leaderFlag.lineStyle(ui(2),0x171b18,1).lineBetween(x,y,x,y+ui(16));
      this.leaderFlag.lineStyle(ui(1),0xffe7a0,1).lineBetween(x,y,x,y+ui(16));
      this.leaderFlag.fillStyle(0xffd05a,1).fillTriangle(x+ui(1),y,x+ui(13),y+ui(4),x+ui(1),y+ui(9));
    }
    // Players: the colour of their camp (own, or the team leader's) — shared CAMP_COLORS; Đồ sát is marked.
    // Monsters (USER 2026-11-14): normal = white (#ffffff), Boss Xanh (1) = blue (#5cb8ff), Boss Hoàng Kim (2) = gold (#ffd700).
    const color = s.kind === 'npc' ? '#9cf08a'
      : s.kind === 'monster' ? (Number(s.boss) >= 2 || s.boss === true ? '#ffd700' : s.boss === 1 ? '#5cb8ff' : '#ffffff')
      : CAMP_COLORS[(s.camp || 'new') as Camp] ?? '#ffffff';
    const text = s.kind === 'monster' ? `${s.name} (${s.level})` : `${s.name}${s.pk === 2 ? ' [Đồ sát]' : s.pk === 1 ? ' [Chiến đấu]' : ''}`;
    if (this.label.text !== text) this.label.setText(text);
    if (this.label.style.color !== color) this.label.setColor(color);
    if (this.label.scaleX !== plate.textScale) this.label.setScale(plate.textScale);
    this.label.setPosition(Math.round(this.x), top - Math.max(2, ui(plate.gapY)));
    if (s.hp > 0 || s.kind === 'npc') {
      // Under-foot pictures stay on the ground during a jump, the others rise with the body.
      this.decor.update([...(s.states ?? []), ...(s.passiveFx ?? [])], Math.round(this.x), Math.round(this.y), this.headHeight - 8 + this.lift, s.ctl ?? 0);
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

  destroy(): void {
    this.leaderFlag.destroy();
    this.label.destroy();
    this.bar.destroy();
    this.decor.destroy();
    this.anchor.destroy();
    this.jx?.destroy();
  }
}
