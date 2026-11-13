import { keyLabel } from '../../input/keymap';
import { $, mount } from '../kit/dom';
import './notices.css';

/** Server / game messages in the middle of the screen (4 at most, 4 s each) and the "auto-fight on" line. */
export class Notices {
  private readonly box: HTMLElement;

  constructor(parent: HTMLElement) {
    this.box = mount(parent, '<div id="notices"></div>');
    mount(parent, `<div id="auto-badge" class="hidden">Đang tự động đánh · <b>${keyLabel('auto')}</b> để dừng</div>`);
  }

  notice(text: string): void {
    const el = document.createElement('div');
    el.className = 'notice';
    el.textContent = text;
    this.box.appendChild(el);
    setTimeout(() => el.remove(), 4000);
    while (this.box.childElementCount > 4) this.box.firstElementChild?.remove();
  }

  setAutoBadge(on: boolean): void {
    $('auto-badge').classList.toggle('hidden', !on);
  }
}
