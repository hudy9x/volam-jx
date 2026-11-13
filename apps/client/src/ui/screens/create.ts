import {
  ELEMENT_NAMES, LEVEL, SERIES, factionsFor, type Element, type Gender,
} from '@vltk/shared';
import { $, mount } from '../kit/dom';
import { SERIES_COLORS } from './characters';
import { showFigure } from './figure';
import { fitStage } from './stage';
import './screens.css';
import { assetUrl } from '../../art/assets';

/** Ngũ hành buttons of ui3/新建角色.ini ([Gold] … [Earth]: Left 372, Top 70 / 132 / 195 / 257 / 323). */
const SERIES_TOPS: Record<Element, number> = { kim: 70, moc: 132, thuy: 195, hoa: 257, tho: 323 };

/** A function: asset URLs carry the manifest version, known only once the app has started (art/assets.ts). */
const html = () => `
<section id="screen-create" class="login-screen hidden">
  <div class="stage" style="background-image: url(${assetUrl('ui/login/bg2.webp')})">
    <div class="stage-layer" style="background-image: url(${assetUrl('ui/login/new-window.webp')})"></div>
    <div class="create-gender male" data-gender="male"><div class="char-figure"></div><span>Nam</span></div>
    <div class="create-gender female" data-gender="female"><div class="char-figure"></div><span>Nữ</span></div>
    ${SERIES.map(s => `<button type="button" class="series-btn" data-series="${s}" title="Hệ ${ELEMENT_NAMES[s]}"
      style="top: ${SERIES_TOPS[s]}px; background-image: url(${assetUrl(`ui/login/series-${s}.webp`)})"></button>`).join('')}
    <div id="create-property" class="create-property"></div>
    <p id="create-error" class="stage-msg create-error"></p>
    <form id="create-form">
      <input id="create-name" name="name" required minlength="2" maxlength="16" autocomplete="off" placeholder="2–16 ký tự" />
      <button type="submit" class="sprbtn sel-ok create-ok" title="Tạo nhân vật (Enter)"></button>
      <button type="button" class="sprbtn sel-cancel create-cancel" id="create-cancel" title="Quay lại chọn nhân vật (Esc)"></button>
    </form>
  </div>
</section>`;

export interface CreateHandlers {
  /** Create the character on the server; throws with the message to show. */
  create(name: string, series: Element, gender: Gender): Promise<void>;
  cancel(): void;
}

/**
 * Tạo nhân vật as its own screen, laid out like ui3/新建角色.ini on the original pictures: the five ngũ hành buttons in the
 * middle (check boxes), the male figure left and the female figure right (click to choose), a line about the chosen hệ
 * ([PropertyShow]), then name + Xác nhận / Hủy bỏ on the bottom bar. A new character has a hệ and no faction; it joins
 * one of its hệ at level 10 (original newplayerini).
 */
export class CreateScreen {
  readonly el: HTMLElement;
  private series: Element = 'kim';
  private gender: Gender = 'male';

  constructor(root: HTMLElement, handlers: CreateHandlers) {
    this.el = mount(root, html());
    fitStage(this.el);
    this.el.querySelectorAll<HTMLElement>('.series-btn').forEach(b =>
      b.addEventListener('click', () => { this.series = b.dataset.series as Element; this.render(true); }));
    this.el.querySelectorAll<HTMLElement>('.create-gender').forEach(g =>
      g.addEventListener('click', () => { this.gender = g.dataset.gender as Gender; this.render(true); }));
    $('create-cancel').addEventListener('click', () => handlers.cancel());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !this.el.classList.contains('hidden')) handlers.cancel(); });
    $('create-form').addEventListener('submit', async (e: SubmitEvent) => {
      e.preventDefault();
      $('create-error').textContent = '';
      try {
        await handlers.create(($('create-name') as HTMLInputElement).value, this.series, this.gender);
        ($('create-name') as HTMLInputElement).value = '';
      } catch (err) {
        $('create-error').textContent = (err as Error).message;
      }
    });
  }

  open(): void {
    $('create-error').textContent = '';
    this.render();
    requestAnimationFrame(() => ($('create-name') as HTMLInputElement).focus());
  }

  private render(animate = false): void {
    this.el.querySelectorAll<HTMLElement>('.series-btn').forEach(b => b.classList.toggle('on', b.dataset.series === this.series));
    for (const gender of ['male', 'female'] as const) {
      const box = this.el.querySelector<HTMLElement>(`.create-gender.${gender}`)!;
      box.classList.toggle('on', gender === this.gender);
      requestAnimationFrame(() => showFigure(box.querySelector('.char-figure') as HTMLElement, gender, this.series, '', { selected: gender === this.gender, animate: animate && gender === this.gender }));
    }
    const factions = factionsFor(this.series, this.gender).map(f => f.name);
    const prop = $('create-property');
    prop.style.color = SERIES_COLORS[this.series];
    prop.textContent = `Hệ ${ELEMENT_NAMES[this.series]} · ${this.gender === 'male' ? 'Nam' : 'Nữ'} — cấp ${LEVEL.factionJoin} gia nhập `
      + (factions.length ? factions.join(' hoặc ') : 'môn phái cùng hệ');
  }
}
