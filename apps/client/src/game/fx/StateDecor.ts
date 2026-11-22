import Phaser from 'phaser';
import { JX_TICK_MS, getSkill, stateFxOf } from '@vltk/shared';
import { CONTROL_FX } from './fx.gen';
import { CONTROL_VISUALS } from './controlEffects';
import { fxMeta, fxReady, showFx } from './SkillFx';

interface Shown { start: number; fx?: Phaser.GameObjects.Image }

/** Between the ground shadow (PaperDoll SHADOW_DEPTH −0.6) and the body (0): pictures under the feet. */
const UNDER_FEET = -0.5;
/**
 * Pictures under the feet are raised this many px (USER 2026-11-13: centred on the logic point they looked lower than
 * the feet, the character seemed to float). Tune by eye.
 */
const FOOT_LIFT = 10;

/**
 * Bùa lợi / bùa hại / hào quang of one actor: the original state picture on the body. Pictures under the feet (hào
 * quang rings) are always behind the character; the others follow their "behind" frames like the original.
 * Their icons are not drawn over the head: the HUD lists the own ones under the portrait (ui/hud/status.ts).
 */
export class StateDecor {
  private shown = new Map<number, Shown>();
  private stun: Shown | null = null;

  constructor(private scene: Phaser.Scene) {
    // Load before a short stun starts, rather than spending its duration waiting for the sheet.
    fxReady(scene, CONTROL_FX.stun.key);
  }

  /** `ids` = state skill ids; (x, y) feet; `height` of the body. */
  update(ids: Iterable<number>, x: number, y: number, height: number, ctl = 0, visible = true): void {
    const now = this.scene.time.now;
    if (ctl & 1) {
      this.stun ??= { start: now };
      const key = CONTROL_FX.stun.key;
      this.stun.fx?.setVisible(visible);
      if (visible && fxReady(this.scene, key)) {
        const m = fxMeta(key)!;
        const ms = m[8] >= 20 ? m[8] : JX_TICK_MS;
        const col = Math.floor((now - this.stun.start) / ms) % m[4];
        this.stun.fx ??= this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0);
        showFx(this.stun.fx, key, 0, col, x, y);
        // SPR offsets refer to a human's feet; centre the glow above any actor's actual head.
        this.stun.fx.setPosition(Math.round(x - m[0] / 2), Math.round(y - height - CONTROL_VISUALS.stunHeadGap - m[1] / 2))
          .setDepth(y + CONTROL_VISUALS.stunDepth).setVisible(true);
      }
    } else {
      this.stun?.fx?.destroy();
      this.stun = null;
    }
    const list = [...ids];
    for (const [id, v] of this.shown) {
      if (list.includes(id)) continue;
      v.fx?.destroy();
      this.shown.delete(id);
    }
    for (const id of list) {
      const s = getSkill(id);
      if (!s) continue;
      let v = this.shown.get(id);
      if (!v) this.shown.set(id, v = { start: now });
      v.fx?.setVisible(visible);
      if (!visible) continue;
      const sfx = stateFxOf(s);
      if (!sfx || !fxReady(this.scene, sfx.key)) continue;
      const m = fxMeta(sfx.key)!;
      const ms = m[8] >= 20 ? m[8] : JX_TICK_MS;
      const col = Math.floor((now - v.start) / ms) % m[4];
      const py = sfx.at === 'foot' ? y - FOOT_LIFT : sfx.at === 'head' ? y - height + 8 : y - Math.round(height * 0.45);
      v.fx ??= this.scene.add.image(0, 0, '__DEFAULT').setOrigin(0, 0);
      showFx(v.fx, sfx.key, 0, col, x, py);
      const behind = sfx.at === 'foot' || (sfx.behind && col >= sfx.behind[0] && col <= sfx.behind[1]);
      v.fx.setDepth(y + (sfx.at === 'foot' ? UNDER_FEET : behind ? -0.5 : 0.5)).setVisible(true);
    }
  }

  destroy(): void {
    this.stun?.fx?.destroy();
    this.stun = null;
    for (const v of this.shown.values()) v.fx?.destroy();
    this.shown.clear();
  }
}
