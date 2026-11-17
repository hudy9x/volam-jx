import { syncMapRegistry } from '../../net/api';
import { isMapEnabled, MAPS, MAP_TYPE_NAMES, mapLevelBand, type MapMeta } from '@vltk/shared';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import type { HudContext } from '../hud/context';
import './travel.css';
import { progress } from '../../state/progress';
import { assetUrl } from '../../art/assets';

const ID = 'travel-panel';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Xa phu · Chuyển bản đồ">
  <button type="button" class="btn" id="travel-return" disabled>Trở lại bãi luyện công</button>
  <p class="muted" id="travel-return-note"></p>
  <input id="travel-search" type="search" placeholder="Tìm bản đồ (gõ không dấu cũng được)…" autocomplete="off" />
  <div id="travel-types" class="tabs"></div>
  <div id="travel-list"></div>
</section>`;

/** Xa phu · Chuyển bản đồ (T, NPC): every generated map as a card, towns first; search and kind filter on top. */
export class TravelWindow {
  private query = '';
  private level = 0;
  private type = '';
  private meta: MapMeta | null = null;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    progress.watch(p => {
      this.renderReturn();
      const level = p?.progress.level ?? 0;
      if (level === this.level) return;
      this.level = level;
      if (dialogs.isOpen(ID)) { this.render(); void syncMapRegistry().then(() => { if (dialogs.isOpen(ID)) this.render(); }).catch(e => this.ctx.notice((e as Error).message)); }
    }, false);
    dialogs.register(ID);
    $('travel-return').addEventListener('click', () => { dialogs.close(ID); this.ctx.actions()?.returnTraining(); });
    $<HTMLInputElement>('travel-search').addEventListener('input', e => {
      this.query = fold((e.target as HTMLInputElement).value);
      this.render();
    });
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
    if (dialogs.isOpen(ID)) { this.render(); void syncMapRegistry().then(() => { if (dialogs.isOpen(ID)) this.render(); }).catch(e => this.ctx.notice((e as Error).message)); }
  }

  /** The map we are on ("Đang ở đây"). */
  setMap(meta: MapMeta): void {
    this.meta = meta;
    this.render();
  }

  private renderReturn(): void {
    const point = progress.get()?.trainingReturn;
    const button = $<HTMLButtonElement>('travel-return');
    button.disabled = !point || !this.meta?.safe || !isMapEnabled(point.mapId);
    $('travel-return-note').textContent = point
      ? `Điểm đã lưu: ${MAPS[point.mapId]?.name ?? point.mapId} (${point.x}, ${point.y}).${!this.meta?.safe ? ' Chỉ trở lại từ trong thành.' : ''}`
      : 'Chưa có điểm quay lại. Điểm được lưu khi rời bãi về thành bằng Thổ Địa Phù, Auto hoặc hồi sinh.';
  }

  private render(): void {
    this.renderReturn();
    const level = progress.get()?.progress.level ?? this.ctx.self()?.level ?? 0;
    const all = Object.values(MAPS).filter(m => isMapEnabled(m.id)).sort((a, b) => Number(b.safe) - Number(a.safe)
      || (mapLevelBand(a.id)?.[0] ?? Infinity) - (mapLevelBand(b.id)?.[0] ?? Infinity)
      || (mapLevelBand(a.id)?.[1] ?? Infinity) - (mapLevelBand(b.id)?.[1] ?? Infinity)
      || a.name.localeCompare(b.name, 'vi'));
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
      const band = mapLevelBand(m.id);
      const above = !!band && level > 0 && band[0] > level;
      const detail = el.querySelector('.muted') as HTMLElement;
      detail.textContent = m.safe ? 'Thành thị · An toàn' : band
        ? `Quái cấp ${band[0] === band[1] ? band[0] : `${band[0]}–${band[1]}`}${above ? ' · Vượt cấp của bạn' : ''}`
        : 'Chưa có dữ liệu cấp quái';
      if (here) detail.textContent += ' · Đang ở đây';
      detail.classList.toggle('map-level-high', above);
      if (!here) el.addEventListener('click', () => { dialogs.close(ID); this.ctx.actions()?.teleport(m.id); });
      return el;
    }));
  }
}

/** Lowercase without Vietnamese marks, for searching map names typed without diacritics. */
function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim();
}
