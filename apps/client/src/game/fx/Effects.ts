import Phaser from 'phaser';
import { getSkill, type FxEvent } from '@vltk/shared';
import { ui, uiPx, textResolution, zoomPlate } from '../display';
import type { ActorView } from '../actors/ActorView';
import { SkillFx } from './SkillFx';
import { fxSound } from '../audio/fxSounds';

const STATE_COLORS = { buff: '#7dffa0', debuff: '#d99cff' } as const;

/** Turns server fx events into skill effects (SkillFx) and floating numbers. */
/** Cold / poison floating labels; stun is drawn as a persistent head glow. */
const CTL_TEXT = { slow: 'Chậm', poison: 'Trúng độc' } as const;
const CTL_COLOR = { slow: '#8fd8ff', poison: '#8fe34a' } as const;

export class Effects {
  readonly skills: SkillFx;

  constructor(
    private scene: Phaser.Scene,
    private views: Map<string, ActorView>,
    private selfId: string,
    private onSelfCast: (skillId: number) => void,
  ) {
    this.skills = new SkillFx(scene, id => views.get(id));
  }

  handle(events: FxEvent[]): void {
    const actor = (id: string) => {
      const v = this.views.get(id);
      return v && { kind: v.state.kind, sprite: v.state.sprite, gender: v.state.gender, mounted: v.state.mounted, x: v.x, y: v.y };
    };
    for (const e of events) {
      if (e.t === 'cast' && e.id === this.selfId) this.onSelfCast(e.skill);
      fxSound(e, actor);
      if (this.skills.handle(e)) continue;
      switch (e.t) {
        case 'hit': {
          const view = this.views.get(e.id);
          if (!view) break;
          if (e.miss) { this.floatText(view, 'Trượt', '#c8c8c8', 14); break; }
          if (e.fatal) this.floatText(view, 'Chí tử!', '#ff3df0', 16, -22);
          this.floatText(view, e.crit ? `${e.dmg}!` : `${e.dmg}`, this.damageColor(view, !!e.crit, !!e.dot), e.crit ? 22 : 16);
          break;
        }
        case 'ctl': { // choáng / chậm / độc started (formulas/effects.ts)
          if (e.kind === 'stun') break; // Actor.ctl drives the persistent glow above the head.
          const view = this.views.get(e.id);
          if (view) this.floatText(view, CTL_TEXT[e.kind], CTL_COLOR[e.kind], 13, -36);
          break;
        }
        case 'heal': {
          const view = this.views.get(e.id);
          if (view) this.floatText(view, `+${e.v}`, '#5dff7a', 16);
          break;
        }
        case 'st': { // a bùa lợi / bùa hại started (recorded only)
          const view = this.views.get(e.id);
          const name = getSkill(e.skill)?.name;
          if (view && name) this.floatText(view, name, STATE_COLORS[e.kind], 12, -20);
          break;
        }
        case 'die': break; // the die animation comes from the actor state
        case 'lvup': {
          const view = this.views.get(e.id);
          if (view) this.floatText(view, `Thăng cấp ${e.level}!`, '#ffe14d', 20, -30);
          break;
        }
      }
    }
  }

  update(): void {
    this.skills.update();
  }

  private damageColor(view: ActorView, crit: boolean, dot: boolean): string {
    if (dot) return '#7ee06a';
    if (view.id === this.selfId) return '#ff4b3a';
    return crit ? '#ffd23a' : '#ffffff';
  }

  private floatText(view: ActorView, value: string, color: string, size: number, dy = 0): void {
    const s = zoomPlate().textScale;
    const text = this.scene.add.text(view.x + (Math.random() - 0.5) * 24 * s, view.headY - 6 * s + dy * s, value, {
      resolution: textResolution(), fontFamily: 'Segoe UI, sans-serif', fontSize: uiPx(size), fontStyle: 'bold',
      color, stroke: '#000', strokeThickness: ui(4),
    }).setOrigin(0.5).setScale(s).setDepth(1e6 + 1);
    this.scene.tweens.add({
      targets: text, y: text.y - 42 * s, alpha: 0, duration: 900, ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  destroy(): void {
    this.skills.destroy();
  }
}
