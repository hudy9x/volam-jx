import type { Portal } from '../../../packages/shared/src/maps/types.js';
export interface PortalDocument { portals: Portal[]; revision: string; custom: boolean }
export interface PortalMap { id: number; name: string; size: { width: number; height: number }; entry: { x: number; y: number }; available: boolean; enabled?: boolean }
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => el<HTMLInputElement>(id);
export class PortalEditor {
  portals: Portal[] = []; revision = ''; dirty = false; selected = ''; loading = false;
  private source: PortalMap | null = null; private sequence = 0;
  constructor(private maps: () => PortalMap[], private changed: () => void, private confirm: (s: string) => Promise<boolean>, private message: (s: string, error?: boolean) => void, private entry: (id: number) => Promise<{ x: number; y: number }>, private standable: (x: number, y: number) => boolean) {
    field('portal-list').onchange = () => { this.selected = field('portal-list').value; this.render(); };
    for (const [id, key] of [['portal-label', 'label'], ['portal-x', 'x'], ['portal-y', 'y'], ['portal-radius', 'radius'], ['portal-to-x', 'toX'], ['portal-to-y', 'toY']] as const) {
      field(id).oninput = () => { const p = this.current(); if (!p) return; if (key === 'label') p.label = field(id).value; else p[key] = field(id).value === '' ? NaN : Number(field(id).value); this.dirty = true; this.list(); this.position(); this.changed(); };
    }
    el('portal-add').onclick = () => { if (!this.source) return; const target = this.maps().find(m => m.id !== this.source!.id && m.available && m.enabled !== false); if (!target) { this.message('Chưa có map đích đang mở và đủ tài nguyên.', true); return; } const p: Portal = { id: `portal-${crypto.randomUUID()}`, label: `Tới ${target.name}`, x: Math.round(this.source.entry.x), y: Math.round(this.source.entry.y), radius: 40, toMap: target.id, toX: target.entry.x, toY: target.entry.y }; this.portals.push(p); this.selected = p.id; this.dirty = true; this.render(); void this.arrival(target.id); };
    el('portal-remove').onclick = async () => { const p = this.current(); if (p && await this.confirm(`Xóa điểm “${p.label}” khỏi bản nháp? Chỉ áp dụng khi lưu điểm chuyển.`)) { this.portals = this.portals.filter(o => o.id !== p.id); this.selected = this.portals[0]?.id ?? ''; this.dirty = true; this.render(); } };
    field('portal-target').onchange = () => { const p = this.current(); if (!p) return; const oldName = this.maps().find(m => m.id === p.toMap)?.name; const next = Number(field('portal-target').value), nextName = this.maps().find(m => m.id === next)?.name ?? 'Map đích'; if (p.label === oldName) p.label = nextName; else if (p.label === `Tới ${oldName}`) p.label = `Tới ${nextName}`; p.toMap = next; p.toX = NaN; p.toY = NaN; this.dirty = true; this.render(); void this.arrival(p.toMap); };
    el('portal-entry').onclick = () => { const p = this.current(); if (p) void this.arrival(p.toMap); };
  }
  current() { return this.portals.find(p => p.id === this.selected); }
  load(source: PortalMap, doc: PortalDocument) { this.sequence++; this.loading = false; this.source = source; this.portals = structuredClone(doc.portals); this.revision = doc.revision; this.dirty = false; this.selected = this.portals[0]?.id ?? ''; this.render(); }
  saved(doc: PortalDocument) { this.portals = doc.portals; this.revision = doc.revision; this.dirty = false; this.render(); }
  private async arrival(id: number) {
    const p = this.current(), seq = ++this.sequence; if (!p) return; this.loading = true; this.changed();
    try { const point = await this.entry(id); if (seq !== this.sequence || this.current() !== p || p.toMap !== id) return; p.toX = point.x; p.toY = point.y; this.dirty = true; this.render(); }
    catch (e) { if (seq === this.sequence) this.message((e as Error).message, true); }
    finally { if (seq === this.sequence) { this.loading = false; this.changed(); } }
  }
  private list() { const select = el<HTMLSelectElement>('portal-list'); select.replaceChildren(...this.portals.map(p => new Option(p.label || 'Chưa đặt tên', p.id))); if (!this.portals.length) select.add(new Option('Chưa có điểm chuyển', '')); select.value = this.selected; }
  position() { const p = this.current(); el('portal-position').textContent = p ? `${Number.isFinite(p.x + p.y) && this.standable(p.x, p.y) ? 'Điểm đặt đi được' : 'Điểm đặt bị chặn hoặc không hợp lệ'} · ${this.dirty ? 'Chưa lưu' : 'Đã nạp bản lưu'}` : 'Thêm điểm chuyển để bắt đầu.'; }
  render() {
    this.list(); const p = this.current(); el('portal-fields').hidden = !p; el<HTMLFieldSetElement>('portal-fields').disabled = !p;
    const targets = this.maps().filter(m => m.id !== this.source?.id && (m.available && m.enabled !== false || m.id === p?.toMap));
    const select = el<HTMLSelectElement>('portal-target'); select.replaceChildren(...targets.map(m => { const o = new Option(`${m.name}${m.enabled === false ? ' · Đã tắt' : ''}`, String(m.id)); o.disabled = !m.available || m.enabled === false; return o; }));
    if (p && !targets.some(m => m.id === p.toMap)) select.add(new Option(`Map ${p.toMap} · Không còn tồn tại`, String(p.toMap)));
    if (p) { field('portal-label').value = p.label; for (const [id, key] of [['portal-x', 'x'], ['portal-y', 'y'], ['portal-radius', 'radius'], ['portal-to-x', 'toX'], ['portal-to-y', 'toY']] as const) field(id).value = Number.isFinite(p[key]) ? String(p[key]) : ''; select.value = String(p.toMap); }
    this.position(); this.changed();
  }
  down(point: { x: number; y: number }, zoom: number): boolean {
    const hit = [...this.portals].reverse().find(p => Math.hypot(p.x - point.x, p.y - point.y) * zoom < 18);
    if (hit) this.selected = hit.id; else this.move(point);
    this.render(); return !!this.current();
  }
  move(point: { x: number; y: number }) { const p = this.current(); if (!p || !this.source) return; p.x = Math.max(0, Math.min(this.source.size.width - 1, Math.round(point.x))); p.y = Math.max(0, Math.min(this.source.size.height - 1, Math.round(point.y))); this.dirty = true; field('portal-x').value = String(p.x); field('portal-y').value = String(p.y); this.position(); this.changed(); }
  draw(ctx: CanvasRenderingContext2D, zoom: number) {
    for (const p of this.portals) {
      if (!Number.isFinite(p.x + p.y + p.radius)) continue;
      const selected = p.id === this.selected; ctx.lineWidth = 2 / zoom; ctx.strokeStyle = this.standable(p.x, p.y) ? '#b9d8bf' : '#f2ad9b'; ctx.fillStyle = '#263a2c';
      if (selected) { ctx.beginPath(); ctx.ellipse(p.x, p.y, p.radius, p.radius / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 9 / zoom); ctx.lineTo(p.x + 9 / zoom, p.y); ctx.lineTo(p.x, p.y + 9 / zoom); ctx.lineTo(p.x - 9 / zoom, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (selected) { ctx.font = `${12 / zoom}px system-ui`; ctx.textAlign = 'center'; ctx.strokeStyle = '#101211'; ctx.lineWidth = 3 / zoom; ctx.fillStyle = '#e6e9e6'; ctx.strokeText(p.label, p.x, p.y - 16 / zoom); ctx.fillText(p.label, p.x, p.y - 16 / zoom); }
    }
  }
}
