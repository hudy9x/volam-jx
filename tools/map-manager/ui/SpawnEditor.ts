import { bossTierOf, type SpawnFile } from '../../../packages/shared/src/maps/spawns.js';
export interface SpawnDocument { file: SpawnFile; revision: string }
export interface SpawnMonster { id: number; name: string; level: number }
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => el<HTMLInputElement>(id);
export class SpawnEditor {
  file: SpawnFile = { map: 0, zones: [] }; revision = ''; dirty = false; selected = -1;
  private monsters: SpawnMonster[] = [];
  constructor(private changed: () => void, private standable: (x: number, y: number) => boolean) {
    input('spawn-tier').onchange = () => { const z = this.current(); if (!z) return; if (input('spawn-tier').value === '1') z.boss = 1; else delete z.boss; this.dirty = true; this.render(); };
    for (const [id, key] of [['spawn-radius', 'r'], ['spawn-count', 'count'], ['spawn-respawn', 'respawn']] as const) input(id).oninput = () => { const z = this.current(); if (!z) return; z[key] = input(id).value === '' ? NaN : Number(input(id).value); this.dirty = true; this.changed(); };
    input('spawn-search').oninput = () => this.pool();
    el('spawn-pool-add').onclick = () => { const z = this.current(), m = this.monsters.find(m => m.id === Number(input('spawn-monster').value)); if (!z || !m) return; if (!z.monsters.some(([id]) => id === m.id)) z.monsters.push([m.id, m.level]); this.dirty = true; this.render(); };
  }
  removeSelected() { if (!this.current()) return; this.file.zones.splice(this.selected, 1); this.selected = -1; this.dirty = true; this.render(); }
  setup(monsters: SpawnMonster[]) { this.monsters = monsters; this.pool(); }
  current() { const z = this.file.zones[this.selected]; return z && bossTierOf(z.boss) < 2 ? z : undefined; }
  load(doc: SpawnDocument, _entry: { x: number; y: number }) { this.file = structuredClone(doc.file); this.revision = doc.revision; this.selected = this.file.zones.findIndex(z => bossTierOf(z.boss) < 2); this.dirty = false; this.render(); }
  saved(doc: SpawnDocument) { this.file = doc.file; this.revision = doc.revision; this.dirty = false; this.render(); }
  private pool() { const q = input('spawn-search').value.toLocaleLowerCase('vi'); const select = el<HTMLSelectElement>('spawn-monster'); const value = select.value; select.replaceChildren(...this.monsters.filter(m => `${m.name} ${m.id}`.toLocaleLowerCase('vi').includes(q)).map(m => new Option(`${m.name} · #${m.id}`, String(m.id)))); if ([...select.options].some(o => o.value === value)) select.value = value; const cards = el('spawn-monster-cards'); cards.replaceChildren(...this.monsters.filter(m => `${m.name} ${m.id}`.toLocaleLowerCase('vi').includes(q)).map(m => { const button = document.createElement('button'); button.type = 'button'; const image = document.createElement('img'); image.loading = 'lazy'; image.src = `/api/monster-image?id=${m.id}`; image.alt = ''; image.onerror = () => { image.hidden = true; }; const name = document.createElement('span'); name.textContent = m.name; button.append(image, name); button.setAttribute('aria-pressed', String(select.value === String(m.id))); button.onclick = () => { select.value = String(m.id); cards.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === button))); }; return button; })); if (!cards.childElementCount) cards.textContent = 'Không có loại quái khớp tìm kiếm.'; el<HTMLButtonElement>('spawn-pool-add').disabled = !select.options.length; }
  render() {
    const z = this.current(); el('spawn-fields').hidden = !z;
    if (z) {
      input('spawn-tier').value = String(bossTierOf(z.boss));
      for (const [id, n] of [['spawn-radius', z.r ?? 120], ['spawn-count', z.count], ['spawn-respawn', z.respawn]] as const) input(id).value = String(n);
      el('spawn-pool').replaceChildren(...z.monsters.map(([id, level], i) => {
        const row = document.createElement('div'); row.className = 'spawn-pool-row';
        const label = document.createElement('label'); label.textContent = `${this.monsters.find(m => m.id === id)?.name ?? 'Quái'} · #${id} · Cấp`;
        const n = document.createElement('input'); n.type = 'number'; n.min = '1'; n.max = '200'; n.value = String(level); n.oninput = () => { z.monsters[i][1] = n.value === '' ? NaN : Number(n.value); this.dirty = true; this.changed(); }; label.append(n);
        const remove = document.createElement('button'); remove.textContent = 'Bỏ'; remove.setAttribute('aria-label', `Bỏ quái ${id}`); remove.disabled = z.monsters.length <= 1; remove.onclick = () => { z.monsters.splice(i, 1); this.dirty = true; this.render(); }; const image = document.createElement('img'); image.src = `/api/monster-image?id=${id}`; image.alt = ''; image.onerror = () => { image.hidden = true; }; row.append(image, label, remove); return row;
      }));
    }
    el('spawn-summary').textContent = `${this.file.zones.filter(z => bossTierOf(z.boss) < 2).length} khu · ${this.file.fixed?.length ?? 0} điểm cố định cũ được giữ · ${this.dirty ? 'Chưa lưu' : 'Đã nạp bản lưu'}`;
    this.changed();
  }
  down(p: { x: number; y: number }, zoom: number) {
    const hit = this.file.zones.map((z, i) => ({ z, i })).reverse().find(({ z }) => bossTierOf(z.boss) < 2 && z.x !== undefined && Math.hypot(z.x - p.x, z.y! - p.y) * zoom < 18)?.i ?? -1;
    if (hit >= 0) { this.selected = hit; this.render(); return true; }
    const previous = this.current(), monster = this.monsters[0]; if (!monster) return false;
    this.file.zones.push({ x: Math.round(p.x), y: Math.round(p.y), monsters: previous ? structuredClone(previous.monsters) : [[monster.id, monster.level]], count: 5, respawn: 30, r: 220, ...(previous?.boss === 1 ? { boss: 1 as const } : {}) });
    this.selected = this.file.zones.length - 1; this.dirty = true; this.render(); return true;
  }
  move(p: { x: number; y: number }) { const z = this.current(); if (!z) return; z.x = Math.round(p.x); z.y = Math.round(p.y); delete z.camps; this.dirty = true; this.render(); }
  draw(ctx: CanvasRenderingContext2D, zoom: number) {
    this.file.zones.forEach((z, i) => {
      if (bossTierOf(z.boss) === 2 || z.x === undefined || !Number.isFinite(z.x + z.y!)) return;
      ctx.strokeStyle = this.standable(z.x, z.y!) ? bossTierOf(z.boss) === 1 ? '#5cb8ff' : '#b9d8bf' : '#f2ad9b'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2 / zoom;
      if (i === this.selected && Number.isFinite(z.r)) { ctx.beginPath(); ctx.ellipse(z.x, z.y!, z.r!, z.r! / 2, 0, 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.arc(z.x, z.y!, (i === this.selected ? 8 : 5) / zoom, 0, Math.PI * 2); ctx.fill();
      if (i === this.selected) { ctx.font = `${12 / zoom}px system-ui`; ctx.textAlign = 'center'; ctx.fillText(`${bossTierOf(z.boss) === 1 ? 'Boss Xanh' : 'Quái'} · Khu ${i + 1}`, z.x, z.y! - 14 / zoom); }
    });
  }
}
