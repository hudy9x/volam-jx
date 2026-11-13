import { $, mount } from '../kit/dom';
import './screens.css';

const HTML = `
<section id="screen-loading" class="screen hidden">
  <div class="loading-text" id="loading-text">Đang tải…</div>
</section>`;

/** Full-screen "Đang tải…" (assets, entering a map, travelling). */
export class LoadingScreen {
  readonly el: HTMLElement;

  constructor(root: HTMLElement) {
    this.el = mount(root, HTML);
  }

  /** Show the text; null hides the screen. */
  set(text: string | null): void {
    this.el.classList.toggle('hidden', text === null);
    if (text) $('loading-text').textContent = text;
  }
}
