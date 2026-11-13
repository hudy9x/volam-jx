import { MAPS, MAP_TYPE_NAMES, type MapMeta } from '@vltk/shared';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import type { HudContext } from '../hud/context';
import './travel.css';
import { assetUrl } from '../../art/assets';

const ID = 'travel-panel';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Xa phu · Chuyển bản đồ">
  <input id="travel-search" type="search" placeholder="Tìm bản đồ (gõ không dấu cũng được)…" autocomplete="off" />
  <div id="travel-types" class="tabs"></div>
  <div id="travel-list"></div>
</section>`;

/** Xa phu · Chuyển bản đồ (T, NPC): every generated map as a card, towns first; search and kind filter on top. */
export class TravelWindow {
  private query = '';
  private type = '';
  private meta: MapMeta | null = null;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID);
    $<HTMLInputElement>('travel-search').addEventListener('input', e => {
      this.query = fold((e.target as HTMLInputElement).value);
      this.render();
    });
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
  }

  /** The map we are on ("Đang ở đây"). */
  setMap(meta: MapMeta): void {
    this.meta = meta;
    this.render();
  }

  private render(): void {
    const order = ['Capital', 'City', 'Country', 'Field', 'Cave', 'Others', '', 'Tong', 'Battlefield'];
    const rank = (t: string) => (order.indexOf(t) + 99) % 99;
    const all = Object.values(MAPS).sort((a, b) => rank(a.type) - rank(b.type) || a.name.localeCompare(b.name, 'vi'));
    const kinds = [...new Set(all.map(m => MAP_TYPE_NAMES[m.type] ?? 'Khác'))];
    dialogs.setTitle(ID, `Xa phu · Chuyển bản đồ (${all.length})`);
    $('travel-types').replaceChildren(...['', ...kinds].map(k => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `tab${k === this.type ? ' on' : ''}`;
      btn.textContent = k || 'Tất cả';
      btn.addEventListener('click', () => { this.type = k; this.render(); });
      return btn;
    }));
    const list = all.filter(m => (!this.type || (MAP_TYPE_NAMES[m.type] ?? 'Khác') === this.type)
      && (!this.query || fold(m.name).includes(this.query) || String(m.id) === this.query));
    $('travel-list').replaceChildren(...list.map(m => {
      const here = m.id === this.meta?.id;
      const el = document.createElement('div');
      el.className = `map-card${here ? ' here' : ''}`;
      el.title = here ? 'Bạn đang ở đây' : `Đi tới ${m.name}`;
      el.innerHTML = '<div class="map-thumb"><img alt="" loading="lazy" /></div><div class="fname"></div><div class="muted"></div>';
      const img = el.querySelector('img') as HTMLImageElement;
      img.src = assetUrl(`${m.assets}/thumb.webp`);
      img.onerror = () => { img.onerror = null; img.src = assetUrl(`${m.assets}/minimap.webp`); };
      (el.querySelector('.fname') as HTMLElement).textContent = m.name;
      (el.querySelector('.muted') as HTMLElement).textContent = here ? 'Đang ở đây' : `${MAP_TYPE_NAMES[m.type] ?? 'Khác'}${m.safe ? '' : ' · cho phép PK'}`;
      if (!here) el.addEventListener('click', () => { dialogs.close(ID); this.ctx.actions()?.teleport(m.id); });
      return el;
    }));
  }
}

/** Lowercase without Vietnamese marks, for searching map names typed without diacritics. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
}
