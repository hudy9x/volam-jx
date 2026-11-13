import { dialogs } from '../kit/dialog';
import { mount } from '../kit/dom';
import './system.css';

const ID = 'menu-dlg';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Hệ thống">
  <div class="menu-list">
    <button type="button" class="btn" data-menu="auto">Tự động đánh</button>
    <button type="button" class="btn" data-menu="settings">Tùy chỉnh</button>
    <button type="button" class="btn" data-menu="switch">Chuyển nhân vật</button>
    <button type="button" class="btn" data-menu="quit">Thoát game</button>
    <button type="button" class="btn" data-menu="back">Trở lại</button>
  </div>
</section>`;

export interface SystemHandlers {
  openAuto(): void;
  openSettings(): void;
  switchCharacter(): void;
  quit(): void;
}

/** Hệ thống (Esc on an empty screen): Tự động đánh, Tùy chỉnh, Chuyển nhân vật, Thoát game. */
export class SystemWindow {
  constructor(parent: HTMLElement, h: SystemHandlers) {
    const el = mount(parent, HTML);
    dialogs.register(ID);
    el.querySelectorAll<HTMLButtonElement>('[data-menu]').forEach(btn => btn.addEventListener('click', () => {
      dialogs.close(ID);
      const what = btn.dataset.menu;
      if (what === 'auto') h.openAuto();
      else if (what === 'settings') h.openSettings();
      else if (what === 'switch') h.switchCharacter();
      else if (what === 'quit') h.quit();
    }));
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
  }
}
