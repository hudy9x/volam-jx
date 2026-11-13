import { ELEMENT_NAMES, portraitFaction, type Element, type FactionDef, type Gender } from '@vltk/shared';
import type { ActorState } from '../../state/actor';
import { $, mount } from '../kit/dom';
import './vitals.css';
import { assetUrl } from '../../art/assets';

const HTML = `
<div id="hud-char" class="frame">
  <div class="portrait"><img id="hud-portrait" alt="" /></div>
  <div class="info">
    <div class="hud-name" id="hud-name"></div>
    <div class="hud-sub" id="hud-sub"></div>
    <div class="vbar hp" title="Sinh lực"><i id="hud-hp"></i><span id="hud-hp-text"></span></div>
    <div class="vbar mp" title="Nội lực"><i id="hud-mp"></i><span id="hud-mp-text"></span></div>
    <div class="vbar exp" id="hud-exp-bar" title="Kinh nghiệm"><i id="hud-exp"></i><span id="hud-exp-text"></span></div>
  </div>
</div>`;

/** Top left: portrait, name, faction · level, Sinh lực / Nội lực / Kinh nghiệm bars. */
export class Vitals {
  constructor(parent: HTMLElement) {
    mount(parent, HTML);
  }

  /** Name, faction (or hệ before joining) · level, portrait; again whenever level / faction change. */
  setCharacter(actor: ActorState, faction: FactionDef | undefined, series?: Element): void {
    $('hud-name').textContent = actor.name;
    const who = faction?.name ?? (series ? `Hệ ${ELEMENT_NAMES[series]}` : '');
    $('hud-sub').textContent = `${who} · Cấp ${actor.level}`;
    const portrait = $<HTMLImageElement>('hud-portrait');
    const src = assetUrl(`portraits/${portraitFaction(actor.faction, series ?? faction?.element ?? 'kim', actor.gender as Gender)}.png`);
    if (portrait.getAttribute('src') === src) return;
    portrait.src = src;
    portrait.onerror = () => { portrait.onerror = null; portrait.removeAttribute('src'); };
  }

  setHp(hp: number, maxHp: number): void {
    $('hud-hp').style.width = `${(100 * Math.max(0, hp)) / Math.max(1, maxHp)}%`;
    $('hud-hp-text').textContent = `${Math.max(0, hp)} / ${maxHp}`;
  }

  /** Exp toward the next level (title shows the numbers). */
  setExp(exp: number, next: number): void {
    const pct = Number.isFinite(next) && next > 0 ? Math.min(100, (100 * exp) / next) : 100;
    $('hud-exp').style.width = `${pct}%`;
    // Percent under Nội lực (USER 2026-11-13), cut (not rounded) to 2 decimals so 99.999 % never reads 100 %.
    $('hud-exp-text').textContent = Number.isFinite(next) ? `${(Math.floor(pct * 100) / 100).toFixed(2)}%` : 'Cấp tối đa';
    $('hud-exp-bar').title = Number.isFinite(next) ? `Kinh nghiệm ${exp} / ${next} (${pct.toFixed(1)}%)` : 'Kinh nghiệm: cấp tối đa';
  }

  setMp(mp: number, maxMp: number): void {
    $('hud-mp').style.width = `${(100 * mp) / Math.max(1, maxMp)}%`;
    $('hud-mp-text').textContent = `${mp} / ${maxMp}`;
  }
}
