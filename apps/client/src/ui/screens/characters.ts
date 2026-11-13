import {
  ELEMENT_NAMES, FACTIONS, MAPS, MAX_CHARACTERS, type CharacterSummary,
} from '@vltk/shared';
import { $, mount } from '../kit/dom';
import { selectFigure, showFigure } from './figure';
import { fitStage } from './stage';
import './screens.css';
import { assetUrl } from '../../art/assets';

/** A function: asset URLs carry the manifest version, known only once the app has started (art/assets.ts). */
const html = () => `
<section id="screen-chars" class="login-screen hidden">
  <div class="stage" style="background-image: url(${assetUrl('ui/login/bg2.webp')})">
    <div id="char-slots"></div>
    <p id="char-message" class="stage-msg"></p>
    <div class="stage-buttons">
      <button type="button" class="sprbtn sel-ok" id="char-enter" title="Vào game (Enter)"></button>
      <button type="button" class="sprbtn sel-new" id="char-new" title="Tạo nhân vật mới"></button>
      <button type="button" class="sprbtn sel-cancel" id="logout" title="Đăng xuất"></button>
    </div>
  </div>
</section>`;

export interface CharactersHandlers {
  enter(char: CharacterSummary): void;
  /** Open the new-character screen. */
  create(): void;
  logout(): void;
}

/** Text colours of the five hệ (ui3/新建角色.ini comments: 金 255,251,179 · 木 0,255,120 · 水 78,124,255 · 火 255,90,0 · 土 254,207,179). */
export const SERIES_COLORS = { kim: 'rgb(255,251,179)', moc: 'rgb(0,255,120)', thuy: 'rgb(78,124,255)', hoa: 'rgb(255,90,0)', tho: 'rgb(254,207,179)' };

/**
 * Chọn nhân vật on the original login background (spr/ui3/登入界面): the account's characters standing side by side with
 * the original info box ("Nhân vật / Đẳng cấp"), the original buttons Xác nhận / Tạo nhân vật / Hủy bỏ (= đăng xuất).
 * "Tạo nhân vật" is hidden when the account already has MAX_CHARACTERS. Click = choose, double click / Enter = play.
 */
export class CharactersScreen {
  readonly el: HTMLElement;
  private chars: CharacterSummary[] = [];
  private selected = 0;

  constructor(root: HTMLElement, private handlers: CharactersHandlers) {
    this.el = mount(root, html());
    fitStage(this.el);
    $('logout').addEventListener('click', () => handlers.logout());
    $('char-new').addEventListener('click', () => handlers.create());
    $('char-enter').addEventListener('click', () => this.enter());
    document.addEventListener('keydown', e => {
      if (this.el.classList.contains('hidden')) return;
      if (e.key === 'Enter') this.enter();
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') this.select(this.selected + (e.key === 'ArrowLeft' ? -1 : 1));
    });
  }

  private enter(): void {
    const c = this.chars[this.selected];
    if (c) this.handlers.enter(c);
  }

  private select(i: number): void {
    if (!this.chars.length) return;
    this.selected = (i + this.chars.length) % this.chars.length;
    this.el.querySelectorAll<HTMLElement>('#char-slots .char-slot').forEach((el, k) => {
      const selected = k === this.selected;
      el.classList.toggle('selected', selected);
      selectFigure(el.querySelector<HTMLElement>('.char-figure')!, selected, selected);
    });
  }

  /** Fill the list (and show `message`, e.g. why the game was left). `prefer` = id of the character to select. */
  render(chars: CharacterSummary[], message?: string, prefer?: string): void {
    this.chars = chars;
    const at = chars.findIndex(c => c.id === prefer);
    this.selected = at >= 0 ? at : Math.min(this.selected, Math.max(0, chars.length - 1));
    const slots = $('char-slots');
    slots.replaceChildren();
    slots.style.setProperty('--n', String(Math.max(1, chars.length)));
    chars.forEach((c, i) => {
      const slot = document.createElement('div');
      slot.className = `char-slot${i === this.selected ? ' selected' : ''}`;
      const who = FACTIONS[c.faction]?.name ?? 'Chưa vào phái';
      slot.innerHTML = `<div class="char-figure"></div>
        <div class="char-info"><span class="v name"></span><span class="v lv"></span></div>
        <div class="char-meta"></div>`;
      (slot.querySelector('.name') as HTMLElement).textContent = c.name;
      (slot.querySelector('.lv') as HTMLElement).textContent = String(c.level);
      const meta = slot.querySelector('.char-meta') as HTMLElement;
      meta.textContent = `Hệ ${ELEMENT_NAMES[c.series]} · ${who} · ${MAPS[c.mapId]?.name ?? ''}`;
      meta.style.color = SERIES_COLORS[c.series];
      slot.addEventListener('click', () => this.select(i));
      slot.addEventListener('dblclick', () => { this.select(i); this.enter(); });
      slots.appendChild(slot);
      // The original large login artwork follows the faction element, independently of equipped items.
      requestAnimationFrame(() => showFigure(slot.querySelector('.char-figure') as HTMLElement, c.gender, c.series, c.faction, { selected: i === this.selected }));
    });
    if (!chars.length) {
      const empty = document.createElement('p');
      empty.className = 'stage-empty';
      empty.textContent = 'Chưa có nhân vật nào — bấm "Tạo nhân vật".';
      slots.appendChild(empty);
    }
    $('char-new').classList.toggle('hidden', chars.length >= MAX_CHARACTERS);
    $('char-enter').classList.toggle('hidden', !chars.length);
    $('char-message').textContent = message ?? '';
  }
}
