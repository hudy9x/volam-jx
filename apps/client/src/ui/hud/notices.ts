import { $, mount } from '../kit/dom';
import './notices.css';

/** Server / game messages in the middle of the screen (4 at most, 4 s each) and the "auto-fight on" line. */
export class Notices {
  private readonly box: HTMLElement;
  onAutoToggle: (() => void) | null = null;

  constructor(parent: HTMLElement) {
    this.box = mount(parent, '<div id="notices"></div>');
    mount(parent, `<button type="button" id="auto-badge" aria-label="Chạy auto" aria-pressed="false">▶ Auto</button>`);
    $('auto-badge').addEventListener('click', () => this.onAutoToggle?.());
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
    const button = $('auto-badge');
    button.textContent = on ? '❚❚ Auto' : '▶ Auto';
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', on ? 'Dừng auto' : 'Chạy auto');
  }
}
