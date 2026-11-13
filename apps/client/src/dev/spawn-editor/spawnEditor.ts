import { MAPS, MONSTERS, isoDistance, type SpawnFile, type SpawnZone } from '@vltk/shared';
import { hasNpc } from '../../art/jx';
import { Api } from '../../net/api';
import { $, mount } from '../../ui/kit/dom';
import type { BigMap, BigMapTool } from '../../ui/windows/bigmap';
import './spawnEditor.css';

const NEW_ZONE = { r: 220, count: 5, respawn: 30 };

const PANEL = `
<div id="spawn-editor" class="hidden">
  <div class="se-head"><b>Khu quái (dev)</b> <span class="muted" id="se-sum"></span></div>
  <div class="muted" id="se-note"></div>
  <div id="se-zones"></div>
  <div id="se-zone">
    <div class="row"><input id="se-monster" list="se-monsters" placeholder="Tìm quái (tên hoặc số)…" autocomplete="off" />
      <input id="se-level" type="number" min="1" max="200" value="10" title="Cấp" />
      <button type="button" class="btn2" id="se-add-monster">Thêm</button></div>
    <datalist id="se-monsters"></datalist>
    <div id="se-monster-list"></div>
    <div class="se-grid">
      <label>Số lượng <input id="se-count" type="number" min="1" max="60" /></label>
      <label>Bán kính <input id="se-r" type="number" min="0" max="3000" step="20" /></label>
      <label>Hồi sinh (giây) <input id="se-respawn" type="number" min="1" max="3600" /></label>
      <label class="check"><input id="se-boss" type="checkbox" /> Boss</label>
    </div>
    <button type="button" class="btn2" id="se-delete">Xóa khu</button>
  </div>
  <div class="muted" id="se-hint">Click lên bản đồ: thêm khu mới với quái đang chọn · click vào vòng tròn: chọn khu.</div>
  <div class="row"><button type="button" class="btn sm" id="se-save">Lưu</button><button type="button" class="btn sm" id="se-reload">Tải lại</button><span class="muted" id="se-status"></span></div>
</div>`;
const TOGGLE = '<button type="button" class="btn2" id="se-toggle" title="Công cụ dev: đặt khu quái của bản đồ này">Quái (dev)</button>';

/**
 * Dev tool on the big map ("Quái (dev)"): see the monster zones of the current map, add one by clicking the map,
 * pick a zone by clicking its circle, change monsters / level / count / radius / respawn, save. The server
 * writes packages/shared/spawns/<id>.json and respawns the map at once. Monsters without art need
 * `npm run gen:assets` (their name shows in red).
 */
export class SpawnEditor implements BigMapTool {
  private file: SpawnFile | null = null;
  private mapId: number | null = null;
  private sel = -1;
  private open = false;
  private dirty = false;

  constructor(private bigmap: BigMap, private notice: (text: string) => void) {
    if (!import.meta.env.DEV) return;
    // The panel sits next to the map canvas, the switch in the window's footer.
    mount($('bigmap-canvas').parentElement!, PANEL);
    mount($('bigmap-pos').parentElement!, TOGGLE);
    bigmap.tool = this;
    $('se-toggle').addEventListener('click', () => this.toggle());
    $('se-monsters').replaceChildren(...Object.values(MONSTERS).filter(m => !m.dummy).map(m => {
      const o = document.createElement('option');
      o.value = `${m.id} · ${m.name}${m.boss ? ' (boss)' : ''}${hasNpc(m.sprite) ? '' : ' – chưa có hình'}`;
      return o;
    }));
    $('se-add-monster').addEventListener('click', () => this.addMonster());
    $<HTMLInputElement>('se-monster').addEventListener('keydown', e => { if (e.key === 'Enter') this.addMonster(); });
    for (const [id, key] of [['se-count', 'count'], ['se-r', 'r'], ['se-respawn', 'respawn']] as const) {
      $<HTMLInputElement>(id).addEventListener('change', e => {
        const z = this.zone();
        if (!z) return;
        const v = Number((e.target as HTMLInputElement).value);
        if (Number.isFinite(v)) { z[key] = Math.max(key === 'r' ? 0 : 1, Math.round(v)); this.changed(); }
      });
    }
    $<HTMLInputElement>('se-boss').addEventListener('change', e => {
      const z = this.zone();
      if (!z) return;
      if ((e.target as HTMLInputElement).checked) z.boss = true; else delete z.boss;
      this.changed();
    });
    $('se-delete').addEventListener('click', () => {
      if (!this.file || this.sel < 0) return;
      this.file.zones.splice(this.sel, 1);
      this.sel = Math.min(this.sel, this.file.zones.length - 1);
      this.changed();
    });
    $('se-save').addEventListener('click', () => void this.save());
    $('se-reload').addEventListener('click', () => void this.load(true));
  }

  /** The big map switched maps: drop the edit. */
  mapChanged(): void {
    if (this.mapId !== this.bigmap.mapId) { this.file = null; this.sel = -1; this.dirty = false; if (this.open) void this.load(); }
  }

  private toggle(): void {
    this.open = !this.open;
    $('spawn-editor').classList.toggle('hidden', !this.open);
    this.bigmap.overlay = this.open ? { draw: (ctx, k, dpr) => this.draw(ctx, k, dpr), click: (x, y) => this.click(x, y) } : null;
    this.bigmap.relayout();
    if (this.open) void this.load(); else this.bigmap.dirty();
  }

  private async load(force = false): Promise<void> {
    const id = this.bigmap.mapId;
    if (id === null) return;
    if (!force && this.file && this.mapId === id) { this.render(); return; }
    $('se-status').textContent = 'Đang tải…';
    try {
      this.file = await Api.spawns(id);
      this.mapId = id;
      this.sel = this.file.zones.length ? 0 : -1;
      this.dirty = false;
      $('se-status').textContent = '';
    } catch (err) {
      $('se-status').textContent = (err as Error).message;
    }
    this.render();
  }

  private async save(): Promise<void> {
    if (!this.file || this.mapId === null) return;
    $('se-status').textContent = 'Đang lưu…';
    try {
      this.file = await Api.saveSpawns(this.mapId, { ...this.file, auto: false });
      this.dirty = false;
      $('se-status').textContent = 'Đã lưu, quái đã sinh lại.';
      const noArt = new Set(this.file.zones.flatMap(z => z.monsters.map(([m]) => MONSTERS[m])).filter(m => m && !hasNpc(m.sprite)).map(m => m!.name));
      if (noArt.size) this.notice(`Quái chưa có hình: ${[...noArt].join(', ')} — chạy npm run gen:assets -w @vltk/client`);
    } catch (err) {
      $('se-status').textContent = (err as Error).message;
    }
    this.render();
  }

  private zone(): SpawnZone | undefined {
    return this.file?.zones[this.sel];
  }

  private changed(): void {
    this.dirty = true;
    $('se-status').textContent = 'Chưa lưu';
    this.render();
  }

  /** Monster typed in the box ("123 · Sói xám" or a number) added to the selected zone, or to new zones. */
  private picked(): [number, number] | null {
    const raw = $<HTMLInputElement>('se-monster').value.trim();
    const id = Number(/^(\d+)/.exec(raw)?.[1]);
    const level = Math.max(1, Math.min(200, Math.round(Number($<HTMLInputElement>('se-level').value) || 10)));
    return MONSTERS[id] ? [id, level] : null;
  }

  private addMonster(): void {
    const m = this.picked();
    if (!m) { $('se-status').textContent = 'Chọn quái trong danh sách'; return; }
    const z = this.zone();
    if (!z) { $('se-status').textContent = 'Click lên bản đồ để tạo khu trước'; return; }
    z.monsters.push(m);
    this.changed();
  }

  // ---------------- map layer ----------------

  private click(x: number, y: number): boolean {
    if (!this.file) return true;
    const hit = this.file.zones.findIndex(z => z.x !== undefined && isoDistance(x, y, z.x, z.y!) <= Math.max(120, z.r ?? 120));
    if (hit >= 0) { this.sel = hit; this.render(); return true; }
    const m = this.picked() ?? this.zone()?.monsters[0];
    if (!m) { $('se-status').textContent = 'Chọn quái trước (ô tìm quái)'; return true; }
    this.file.zones.push({ x, y, ...NEW_ZONE, monsters: [[m[0], m[1]]] });
    this.sel = this.file.zones.length - 1;
    this.changed();
    return true;
  }

  private draw(ctx: CanvasRenderingContext2D, k: number, dpr: number): void {
    if (!this.file || this.mapId !== this.bigmap.mapId) return;
    this.file.zones.forEach((z, i) => {
      if (z.x === undefined || z.y === undefined) return;
      const r = Math.max(60, z.r ?? 120) * k;
      ctx.beginPath();
      ctx.ellipse(z.x * k, z.y * k, r, r / 2, 0, 0, Math.PI * 2);
      ctx.fillStyle = i === this.sel ? 'rgba(255,220,90,0.35)' : z.boss ? 'rgba(255,120,40,0.3)' : 'rgba(255,60,60,0.22)';
      ctx.fill();
      ctx.lineWidth = (i === this.sel ? 2 : 1) * dpr;
      ctx.strokeStyle = i === this.sel ? '#ffe27a' : '#ff6a55';
      ctx.stroke();
      ctx.font = `${Math.round(10 * dpr)}px Tahoma, sans-serif`;
      ctx.textAlign = 'center';
      const label = `${z.count}× cấp ${z.monsters.map(([, l]) => l).join('/')}`;
      ctx.lineWidth = 3 * dpr;
      ctx.strokeStyle = '#000';
      ctx.strokeText(label, z.x * k, z.y * k + 4 * dpr);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, z.x * k, z.y * k + 4 * dpr);
    });
  }

  // ---------------- panel ----------------

  private render(): void {
    this.bigmap.dirty();
    const f = this.file;
    const name = (id: number) => MONSTERS[id]?.name ?? `#${id}`;
    $('se-sum').textContent = f ? `${MAPS[this.mapId ?? 0]?.name ?? ''} · ${f.zones.length} khu · ${f.zones.reduce((n, z) => n + z.count * (z.x === undefined ? z.camps ?? 1 : 1), 0)} quái${f.auto ? ' · tự sinh' : ''}${this.dirty ? ' · chưa lưu' : ''}` : '';
    $('se-note').textContent = f?.note ?? '';
    $('se-zones').replaceChildren(...(f?.zones ?? []).map((z, i) => {
      const el = document.createElement('div');
      el.className = `se-z${i === this.sel ? ' sel' : ''}`;
      el.textContent = `${i + 1}. ${z.monsters.map(([m, l]) => `${name(m)} ${l}`).join(', ')} ×${z.count}${z.x === undefined ? ` · ${z.camps ?? 1} chỗ ngẫu nhiên` : ''}${z.boss ? ' · boss' : ''}`;
      el.addEventListener('click', () => { this.sel = i; this.render(); });
      return el;
    }));
    const z = this.zone();
    $('se-zone').classList.toggle('hidden-zone', !z);
    if (!z) return;
    $('se-monster-list').replaceChildren(...z.monsters.map(([m, l], i) => {
      const el = document.createElement('div');
      const art = MONSTERS[m] && hasNpc(MONSTERS[m].sprite);
      el.className = `se-m${art ? '' : ' noart'}`;
      el.title = art ? '' : 'Chưa có hình: chạy npm run gen:assets -w @vltk/client sau khi lưu';
      el.innerHTML = '<span></span><button type="button" title="Bỏ">✕</button>';
      (el.querySelector('span') as HTMLElement).textContent = `${m} · ${name(m)} · cấp ${l}`;
      (el.querySelector('button') as HTMLButtonElement).addEventListener('click', () => {
        if (z.monsters.length <= 1) { $('se-status').textContent = 'Khu cần ít nhất một loại quái'; return; }
        z.monsters.splice(i, 1);
        this.changed();
      });
      return el;
    }));
    $<HTMLInputElement>('se-count').value = String(z.count);
    $<HTMLInputElement>('se-r').value = String(z.r ?? 120);
    $<HTMLInputElement>('se-respawn').value = String(z.respawn);
    $<HTMLInputElement>('se-boss').checked = !!z.boss;
  }
}
