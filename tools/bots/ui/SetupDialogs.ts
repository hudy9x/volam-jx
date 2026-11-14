import { MAPS, mapLevelBand } from '@vltk/shared';
import { assetUrl } from './assets';
import { dialogs } from '../../../apps/client/src/ui/kit/dialog';

/** Dev forms reuse the game's window manager (dragging, close and Escape). */
export class SetupDialogs {
  private finishMaps?: (ids: number[] | null) => void;
  private finishName?: (name: string | null) => void;
  private ids = new Set<number>();
  private available: number[] = [];
  private root: HTMLElement;
  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.innerHTML = `<div class="bp-shade hidden" id="bp-dialog-shade"></div>
      <section class="dlg hidden bp-map-dialog" id="bot-map-dialog" data-title="Chọn bản đồ" role="dialog" aria-label="Chọn bản đồ" aria-modal="true">
        <div class="bp-row"><input id="bm-search" placeholder="Tìm bản đồ..." aria-label="Tìm bản đồ"><button id="bm-all">Chọn tất cả</button><button id="bm-none">Bỏ chọn</button></div>
        <div class="bp-map-layout"><div id="bm-list" class="bp-map-list"></div><figure><img id="bm-preview" alt="Ảnh xem trước bản đồ"><figcaption id="bm-caption"></figcaption><p id="bm-image-error" hidden>Chưa có ảnh xem trước.</p></figure></div>
        <div class="bp-row"><span id="bm-count"></span><button id="bm-cancel">Hủy</button><button id="bm-ok" class="bp-main">OK</button></div>
      </section>
      <section class="dlg hidden bp-name-dialog" id="bot-name-dialog" data-title="Lưu Thiết lập" role="dialog" aria-label="Lưu Thiết lập" aria-modal="true">
        <label class="bp-f"><span id="bn-label">Tên template thiết lập</span><input id="bn-name" maxlength="80" placeholder="Ví dụ: Luyện công cấp cao" autocomplete="off"></label>
        <p class="bp-note">Chỉ lưu các thông số để dùng lại; không cập nhật nhân vật.</p><p id="bn-error" role="alert"></p>
        <div class="bp-row"><button id="bn-cancel">Hủy</button><button id="bn-save" class="bp-main">Lưu Thiết lập</button></div>
      </section>`;
    parent.append(this.root);
    const closed = () => { this.el('bp-dialog-shade').classList.add('hidden'); };
    dialogs.register('bot-map-dialog', { onClose: () => { closed(); this.finishMaps?.(null); this.finishMaps = undefined; } });
    dialogs.register('bot-name-dialog', { onClose: () => { closed(); this.finishName?.(null); this.finishName = undefined; } });
    this.el('bm-search').addEventListener('input', () => this.render());
    this.el('bm-all').onclick = () => { this.ids = new Set(this.available); this.render(); };
    this.el('bm-none').onclick = () => { this.ids.clear(); this.render(); };
    this.el('bm-list').addEventListener('change', e => { const box = e.target as HTMLInputElement; const id = Number(box.value); box.checked ? this.ids.add(id) : this.ids.delete(id); this.preview(id); this.count(); });
    this.el('bm-list').addEventListener('click', e => { const label = (e.target as HTMLElement).closest<HTMLElement>('[data-map]'); if (label) this.preview(Number(label.dataset.map)); });
    this.el('bm-cancel').onclick = () => dialogs.close('bot-map-dialog');
    this.el('bm-ok').onclick = () => { if (!this.ids.size) { this.el('bm-count').textContent = 'Chọn ít nhất một bản đồ.'; return; } const fn = this.finishMaps; this.finishMaps = undefined; fn?.([...this.ids]); dialogs.close('bot-map-dialog'); };
    this.el('bn-cancel').onclick = () => dialogs.close('bot-name-dialog');
    this.el('bn-save').onclick = () => { const name = this.input('bn-name').value.trim(); if (!name) { this.el('bn-error').textContent = 'Vui lòng nhập tên template.'; this.input('bn-name').focus(); return; } const fn = this.finishName; this.finishName = undefined; fn?.(name); dialogs.close('bot-name-dialog'); };
    this.input('bn-name').addEventListener('keydown', e => { if (e.key === 'Enter') this.el('bn-save').click(); });
    this.el('bm-preview').addEventListener('error', () => { this.el('bm-image-error').hidden = false; });
  }
  private el(id: string): HTMLElement { return this.root.querySelector(`#${id}`)!; }
  private input(id: string): HTMLInputElement { return this.el(id) as HTMLInputElement; }
  private count(): void { this.el('bm-count').textContent = `${this.ids.size} / ${this.available.length} bản đồ đã chọn`; }
  private preview(id: number): void {
    const m = MAPS[id]; if (!m) return;
    this.el('bm-image-error').hidden = true;
    (this.el('bm-preview') as HTMLImageElement).src = assetUrl(`${m.assets}/minimap.webp`);
    this.el('bm-caption').textContent = `${m.name} · ID ${id}`;
  }
  private render(): void {
    const query = this.input('bm-search').value.toLocaleLowerCase();
    const list = this.el('bm-list'); list.replaceChildren();
    for (const id of this.available.filter(id => `${MAPS[id].name} ${id}`.toLocaleLowerCase().includes(query))) {
      const label = document.createElement('label'); label.className = 'bp-c'; label.dataset.map = String(id);
      const box = document.createElement('input'); box.type = 'checkbox'; box.value = String(id); box.checked = this.ids.has(id);
      const band = mapLevelBand(id);
      label.append(box, `${MAPS[id].name} · ${id} · ${MAPS[id].safe ? 'Thành thị' : `Bãi luyện công${band ? ` cấp ${band.join('–')}` : ''}`}`); list.append(label);
    }
    if (!list.childElementCount) list.textContent = 'Không có bản đồ khớp tên.';
    this.count();
  }
  pickMaps(available: number[], selected: number[]): Promise<number[] | null> {
    this.available = available; this.ids = new Set(selected.filter(id => available.includes(id)));
    this.input('bm-search').value = ''; this.render(); if (available.length) this.preview(available[0]);
    this.el('bp-dialog-shade').classList.remove('hidden'); dialogs.open('bot-map-dialog'); this.input('bm-search').focus();
    return new Promise(resolve => { this.finishMaps = resolve; });
  }
  askName(kind: 'template' | 'scenario' = 'template'): Promise<string | null> {
    const scenario = kind === 'scenario';
    dialogs.setTitle('bot-name-dialog', scenario ? 'Lưu kịch bản' : 'Lưu Thiết lập');
    this.el('bn-label').textContent = scenario ? 'Tên template kịch bản' : 'Tên template thiết lập';
    this.el('bn-save').textContent = scenario ? 'Lưu kịch bản' : 'Lưu Thiết lập';
    this.input('bn-name').value = ''; this.el('bn-error').textContent = '';
    this.el('bp-dialog-shade').classList.remove('hidden'); dialogs.open('bot-name-dialog'); this.input('bn-name').focus();
    return new Promise(resolve => { this.finishName = resolve; });
  }
}
