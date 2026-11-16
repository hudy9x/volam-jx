import { insideZone, validateSafeZones, type SafeZone, type ZonePoint } from '../../../packages/shared/src/maps/safe-zones.js';
import type { MapMeta } from '../../../packages/shared/src/maps/types.js';
export interface ZoneDocument { zones: SafeZone[]; revision: string; custom: boolean }
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

/** Pen edits map coordinates, independent of NPC selection/dragging and of camera transforms. */
export class SafeZonePen {
  zones: SafeZone[] = [];
  revision = '';
  custom = false;
  dirty = false;
  draft: ZonePoint[] | null = null;
  selected = '';
  vertex = -1;
  private dragging = false;
  private meta: Pick<MapMeta, 'type' | 'raw'> | null = null;
  constructor(private changed: () => void, private confirm: (text: string) => Promise<boolean>, private message: (text: string, error?: boolean) => void) {
    el('zone-new').onclick = () => { if (this.draft) return; this.draft = []; this.vertex = -1; this.render(); };
    el('zone-close').onclick = () => this.close();
    el('zone-undo').onclick = () => { this.draft?.pop(); this.render(); };
    el('zone-cancel').onclick = () => { this.draft = null; this.render(); };
    el<HTMLSelectElement>('zone-list').onchange = () => { this.selected = el<HTMLSelectElement>('zone-list').value; this.vertex = -1; this.render(); };
    el<HTMLInputElement>('zone-name').oninput = () => { const z = this.current(); if (z) { z.name = el<HTMLInputElement>('zone-name').value; this.dirty = true; this.changed(); } };
    el<HTMLInputElement>('zone-name').onchange = () => { const z = this.current(); if (z) { z.name = el<HTMLInputElement>('zone-name').value; this.dirty = true; this.render(); } };
    el<HTMLSelectElement>('zone-vertex').onchange = () => { this.vertex = Number(el<HTMLSelectElement>('zone-vertex').value); this.render(); };
    for (const axis of ['x', 'y'] as const) el<HTMLInputElement>(`zone-${axis}`).onchange = () => {
      const p = this.current()?.points[this.vertex]; if (!p) return;
      const old = p[axis]; p[axis] = Number(el<HTMLInputElement>(`zone-${axis}`).value);
      try { this.validate(); this.dirty = true; } catch (e) { p[axis] = old; this.message((e as Error).message, true); }
      this.render();
    };
    el('zone-remove-point').onclick = () => { const z = this.current(); if (!z || z.points.length <= 3 || this.vertex < 0) return; z.points.splice(this.vertex, 1); this.vertex = -1; this.dirty = true; this.render(); };
    el('zone-delete').onclick = async () => {
      const z = this.current(); if (!z || !await this.confirm(`Xóa vùng “${z.name}” khỏi bản nháp? Nếu xóa vùng cuối, cần vẽ lại hoặc Khôi phục an toàn toàn map trước khi lưu.`)) return;
      this.zones = this.zones.filter(x => x.id !== z.id); this.selected = this.zones[0]?.id ?? ''; this.vertex = -1; this.dirty = true; this.render();
    };
    el('zone-reset').onclick = async () => {
      if (!await this.confirm('Khôi phục toàn bộ map thành vùng an toàn? Thay đổi chỉ áp dụng khi bấm Lưu vùng an toàn.')) return;
      this.zones = []; this.draft = null; this.selected = ''; this.custom = false; this.vertex = -1; this.dirty = true; this.render();
    };
    el<HTMLInputElement>('zone-overlay').onchange = () => this.changed();
  }
  get unsaved() { return this.dirty || this.draft !== null; }
  private current() { return this.zones.find(z => z.id === this.selected); }
  load(meta: Pick<MapMeta, 'type' | 'raw'>, doc: ZoneDocument) {
    this.meta = meta; this.zones = doc.zones; this.revision = doc.revision; this.custom = doc.custom;
    this.draft = null; this.dirty = false; this.selected = this.zones[0]?.id ?? ''; this.vertex = -1; this.dragging = false; this.render();
  }
  validate() { if (!this.meta) throw Error('Chọn map thành thị trước.'); if (this.custom) validateSafeZones(this.zones, this.meta); }
  value() { if (this.draft !== null) throw Error('Khép vùng hoặc Hủy nét đang vẽ trước khi lưu.'); this.validate(); return this.custom ? this.zones : null; }
  saved(doc: ZoneDocument) { this.zones = doc.zones; this.revision = doc.revision; this.custom = doc.custom; this.dirty = false; this.render(); }
  private close() {
    if (!this.draft || this.draft.length < 3 || !this.meta) return;
    const zone: SafeZone = { id: `zone-${crypto.randomUUID()}`, name: `Vùng an toàn ${this.zones.length + 1}`, points: this.draft };
    try { validateSafeZones([...this.zones, zone], this.meta); }
    catch (e) { this.message((e as Error).message, true); return; }
    this.zones.push(zone); this.selected = zone.id; this.vertex = -1; this.draft = null; this.custom = true; this.dirty = true;
    this.message('Đã khép vùng kín. Có thể kéo các điểm để chỉnh ranh giới, rồi Lưu vùng an toàn.'); this.render();
  }
  private bounded(p: ZonePoint) {
    return { x: Math.max(0, Math.min(this.meta!.raw.size.width - 1, p.x)), y: Math.max(0, Math.min(this.meta!.raw.size.height - 1, p.y)) };
  }
  down(p: ZonePoint, zoom: number) {
    if (!this.meta || !['City', 'Capital'].includes(this.meta.type)) return;
    p = this.bounded(p);
    if (this.draft) {
      if (this.draft.length >= 3 && Math.hypot(p.x - this.draft[0].x, p.y - this.draft[0].y) * zoom < 14) { this.close(); return; }
      if (this.draft.length >= 256) { this.message('Mỗi vùng tối đa 256 điểm.', true); return; }
      this.draft.push(p); this.render(); return;
    }
    const z = this.current();
    if (z) {
      const vertex = z.points.findIndex(q => Math.hypot(q.x - p.x, q.y - p.y) * zoom < 14);
      if (vertex >= 0) { this.vertex = vertex; this.dragging = true; this.render(); return; }
      // Click an edge to add a control point; do not move the existing boundary yet.
      for (let i = 0; i < z.points.length && z.points.length < 256; i++) {
        const a = z.points[i], b = z.points[(i + 1) % z.points.length], dx = b.x - a.x, dy = b.y - a.y;
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
        const q = { x: Math.round(a.x + t * dx), y: Math.round(a.y + t * dy) };
        if (Math.hypot(q.x - p.x, q.y - p.y) * zoom < 8 && !z.points.some(v => v.x === q.x && v.y === q.y)) {
          z.points.splice(i + 1, 0, q); this.vertex = i + 1; this.dragging = true; this.dirty = true; this.render(); return;
        }
      }
    }
    const hit = [...this.zones].reverse().find(z => insideZone(p, z.points));
    if (hit) this.selected = hit.id;
    this.vertex = -1; this.render();
  }
  move(p: ZonePoint) {
    const z = this.current();
    if (this.dragging && z && this.vertex >= 0) { z.points[this.vertex] = this.bounded(p); this.dirty = true; this.render(); }
  }
  up() { if (!this.dragging) return; this.dragging = false; try { this.validate(); } catch (e) { this.message((e as Error).message, true); } }
  describe(p: ZonePoint) { return !this.custom || this.zones.some(z => insideZone(p, z.points)) ? 'Khu an toàn' : 'Khu chiến đấu'; }
  draw(ctx: CanvasRenderingContext2D, zoom: number) {
    if (!el<HTMLInputElement>('zone-overlay').checked) return;
    for (const z of this.zones) this.path(ctx, z.points, zoom, true, z.id === this.selected);
    if (this.draft) this.path(ctx, this.draft, zoom, false, true);
  }
  private path(ctx: CanvasRenderingContext2D, ps: ZonePoint[], zoom: number, closed: boolean, selected: boolean) {
    if (!ps.length) return;
    ctx.beginPath(); ctx.moveTo(ps[0].x, ps[0].y); for (const p of ps.slice(1)) ctx.lineTo(p.x, p.y);
    if (closed) { ctx.closePath(); ctx.fillStyle = '#b9d8bf30'; ctx.fill(); }
    ctx.strokeStyle = selected ? '#b9d8bf' : '#9ba69e'; ctx.lineWidth = 2 / zoom; ctx.stroke();
    if (!selected) return;
    ps.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, (i === this.vertex && closed ? 8 : 6) / zoom, 0, Math.PI * 2); ctx.fillStyle = '#142318'; ctx.fill(); ctx.stroke();
      ctx.font = `${12 / zoom}px system-ui`; ctx.fillStyle = '#e6e9e6'; ctx.textAlign = 'left'; ctx.fillText(String(i + 1), p.x + 9 / zoom, p.y - 7 / zoom);
    });
  }
  private render() {
    const z = this.current(), editing = this.draft !== null;
    el<HTMLSelectElement>('zone-list').replaceChildren(...this.zones.map(z => new Option(`${z.name} · ${z.points.length} điểm`, z.id)));
    el<HTMLSelectElement>('zone-list').value = this.selected;
    el<HTMLInputElement>('zone-name').value = z?.name ?? '';
    el<HTMLFieldSetElement>('zone-selected').disabled = !z || editing;
    el<HTMLSelectElement>('zone-vertex').replaceChildren(new Option('Chọn điểm trên map…', '-1'), ...(z?.points ?? []).map((p, i) => new Option(`${i + 1}: ${p.x}, ${p.y}`, String(i))));
    el<HTMLSelectElement>('zone-vertex').value = String(this.vertex);
    const p = z?.points[this.vertex];
    for (const axis of ['x', 'y'] as const) { el<HTMLInputElement>(`zone-${axis}`).value = p ? String(p[axis]) : ''; el<HTMLInputElement>(`zone-${axis}`).disabled = !p; }
    el<HTMLButtonElement>('zone-remove-point').disabled = !p || (z?.points.length ?? 0) <= 3;
    el<HTMLButtonElement>('zone-new').disabled = editing || this.zones.length >= 32;
    el<HTMLButtonElement>('zone-close').disabled = !editing || this.draft!.length < 3;
    el<HTMLButtonElement>('zone-undo').disabled = !this.draft?.length;
    el<HTMLButtonElement>('zone-cancel').disabled = !editing;
    el('zone-summary').textContent = `${this.custom ? `${this.zones.length} vùng · Bên ngoài được chiến đấu` : 'Chưa cấu hình: toàn map an toàn'}${editing ? ` · Đang vẽ ${this.draft!.length} điểm` : ''}${this.unsaved ? ' · Chưa lưu' : ''}`;
    this.changed();
  }
}
