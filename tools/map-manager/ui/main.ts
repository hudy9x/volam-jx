import { dialogs } from '../../../apps/client/src/ui/kit/dialog.js';
import { NPC_ACTION_LABELS, validatePlacements, type NpcPlacement } from '../../../packages/shared/src/npcs/placements.js';
import type { MapMeta } from '../../../packages/shared/src/maps/types.js';
import './main.css';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => $<HTMLInputElement>(id);
interface Town { id: number; name: string; size: { width: number; height: number }; entry: { x: number; y: number }; available: boolean; group: 'city' | 'training'; editable: boolean }
interface Template { id: string; name: string; res: string; action: NpcPlacement['action']; dir: number }
interface Look { res: string; label: string; available: boolean; directions: number; width: number; height: number; anchorX: number; anchorY: number }
interface MapJson { regionSize: number; cols: number; rows: number; chunk: number; regions: string; chunks: string[] }
interface Chunk { pages: string[]; frames: number[][]; pieces: number[][] }
const canvas = $<HTMLCanvasElement>('canvas'), ctx = canvas.getContext('2d')!;
let towns: Town[] = [], templates: Template[] = [], looks: Look[] = [], versions: Record<string, string> = {};
let town: Town | null = null, npcs: NpcPlacement[] = [], revision = '', selected = '', dirty = false, busy = false;
let zoom = 1, panX = 0, panY = 0, meta: MapJson | null = null, nav: { columns: number; rows: number; blockedBase64: string; cellSize: { width: number; height: number } } | null = null;
let blocked = new Uint8Array(0), regions = new Uint8Array(0);
const images = new Map<string, HTMLImageElement>(), pending = new Set<string>(), failed = new Set<string>(), chunks = new Map<string, Chunk>();
let epoch = 0;
const current = () => npcs.find(n => n.id === selected);
let resolveConfirm: ((value: boolean) => void) | null = null;
let returnFocus: HTMLElement | null = null;
dialogs.register('confirm-panel', { onClose: () => {
  $('confirm-backdrop').hidden = true;
  const done = resolveConfirm; resolveConfirm = null; done?.(false); returnFocus?.focus();
} });
function confirmDraft(message: string): Promise<boolean> {
  if (resolveConfirm) return Promise.resolve(false);
  returnFocus = document.activeElement as HTMLElement;
  $('confirm-message').textContent = message; $('confirm-backdrop').hidden = false;
  dialogs.open('confirm-panel'); $('confirm-no').focus();
  return new Promise(resolve => { resolveConfirm = resolve; });
}
$('confirm-yes').onclick = () => { const done = resolveConfirm; resolveConfirm = null; dialogs.close('confirm-panel'); done?.(true); };
$('confirm-no').onclick = () => dialogs.close('confirm-panel');
$('confirm-panel').addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const all = Array.from($('confirm-panel').querySelectorAll<HTMLElement>('button'));
  if (e.shiftKey && document.activeElement === all[0]) { e.preventDefault(); all[all.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === all[all.length - 1]) { e.preventDefault(); all[0].focus(); }
});

const status = (s: string, error = false) => { $('status').textContent = s; $('status').classList.toggle('error', error); };
const url = (rel: string) => `/assets/maps/${town!.id}/${rel}${versions[town!.id] ? `?v=${encodeURIComponent(versions[town!.id])}` : ''}`;
async function api<T>(url: string, options?: RequestInit): Promise<T> { const r = await fetch(url, options); const v = await r.json(); if (!r.ok) throw Error(v.error ?? 'Không thể tải dữ liệu.'); return v; }
async function run(task: () => Promise<void>) {
  if (busy) return; busy = true; controls();
  try { await task(); } catch (e) { status((e as Error).message, true); } finally { busy = false; controls(); }
}
function controls() {
  $('map-list').querySelectorAll<HTMLButtonElement>('button[data-map]').forEach(b => { b.disabled = busy || b.dataset.available !== 'true'; });
  $<HTMLButtonElement>('save').disabled = !town?.editable || busy;
  $<HTMLButtonElement>('reload').disabled = !town || busy;
  $<HTMLFieldSetElement>('add-fields').disabled = !town?.editable || busy;
  $<HTMLFieldSetElement>('edit-fields').disabled = !current() || busy;
  $('stage').style.pointerEvents = busy ? 'none' : '';
  $('summary').textContent = town ? `${town.name} · ${town.editable ? `${npcs.length} NPC · ${dirty ? 'Chưa lưu' : 'Đã nạp bản lưu'}` : 'Luyện công · Xem trước'}` : 'Chưa chọn bản đồ';
}
function loadImage(key: string, src: string): HTMLImageElement | null {
  if (images.has(key)) return images.get(key)!;
  if (pending.has(key) || failed.has(key)) return null;
  const e = epoch, img = new Image(); pending.add(key);
  img.onload = () => { if (e !== epoch) return; pending.delete(key); images.set(key, img); draw(); };
  img.onerror = () => { if (e !== epoch) return; pending.delete(key); failed.add(key); status('Thiếu hình map hoặc NPC. Kiểm tra tài nguyên đã sinh, sau đó mở lại bản lưu để thử lại.', true); };
  img.src = src; return null;
}
function standable(x: number, y: number): boolean {
  if (!nav) return false;
  return [x - 9, x, x + 9].every(xx => { const col = Math.floor(xx / nav!.cellSize.width), row = Math.floor(y / nav!.cellSize.height), i = row * nav!.columns + col; return col >= 0 && row >= 0 && col < nav!.columns && row < nav!.rows && !(blocked[i >> 3] >> (i & 7) & 1); });
}
function renderList() {
  const q = field('search').value.toLocaleLowerCase('vi');
  const visible = npcs.filter(n => `${n.name} ${NPC_ACTION_LABELS[n.action]}`.toLocaleLowerCase('vi').includes(q));
  $('npc-list').replaceChildren(...visible.map(n => {
    const b = document.createElement('button'), text = document.createElement('span'), small = document.createElement('small');
    text.textContent = n.name; small.textContent = `${NPC_ACTION_LABELS[n.action]} · ${n.x}, ${n.y}`;
    b.append(text, small); b.className = selected === n.id ? 'selected' : '';
    b.onclick = () => { if (busy) return; selected = n.id; inspector(); renderList(); controls(); draw(); };
    return b;
  }));
  if (!visible.length) $('npc-list').textContent = town && !town.editable ? 'Map luyện công: chỉ xem trước. Spawn quái/Boss Xanh sẽ được bổ sung sau.' : npcs.length ? 'Không có NPC khớp tìm kiếm.' : 'Chưa có NPC. Chọn chức năng bên dưới để thêm.';
}
function inspector() {
  const n = current(); $('edit-fields').hidden = !n; $('no-selection').hidden = !!n;
  if (!n) { positionStatus(); return; }
  field('name').value = n.name; field('x').value = String(n.x); field('y').value = String(n.y);
  $<HTMLSelectElement>('action').value = n.action; $<HTMLSelectElement>('res').value = n.res;
  const dirs = looks.find(l => l.res === n.res)?.directions ?? 0;
  const compass = ['Nam (S)', 'Tây Nam (SW)', 'Tây (W)', 'Tây Bắc (NW)', 'Bắc (N)', 'Đông Bắc (NE)', 'Đông (E)', 'Đông Nam (SE)'];
  const values = dirs >= 8 ? [0, 1, 2, 3, 4, 5, 6, 7] : dirs === 2 ? [0, 4] : [n.dir];
  // Keep legacy direction values intact until the user explicitly changes them.
  if (!values.includes(n.dir)) values.push(n.dir);
  const direction = $<HTMLSelectElement>('dir');
  direction.replaceChildren(...values.map(d => new Option(dirs >= 8 ? compass[d] : dirs === 2 ? `Hình ${Math.floor(d * 2 / 8) + 1} / 2` : 'Hướng cố định của hình gốc', String(d))));
  direction.value = String(n.dir); direction.disabled = dirs < 2;
  $('direction-hint').textContent = dirs >= 8 ? 'Đổi hướng chỉ đổi hình hiển thị, giữ nguyên chức năng NPC.' : dirs === 2 ? 'Hình gốc có 2 hướng để chọn.' : 'Chọn hình 8 hướng ở trên để xoay NPC.';
  const img = $<HTMLImageElement>('npc-image'); $('preview-state').textContent = '';
  img.onerror = () => { $('preview-state').textContent = 'Chưa có hình NPC. Cần sinh tài nguyên.'; };
  img.src = `/api/npc-image?res=${encodeURIComponent(n.res)}&dir=${n.dir}`;
  positionStatus();
}
function positionStatus() {
  const n = current(); $('position').textContent = n ? `${n.name} · ${standable(n.x, n.y) ? 'Đi được' : 'Vị trí bị chặn'}` : 'Chưa chọn NPC';
}
function change(edit: () => void) {
  if (!town?.editable || busy) return; const old = structuredClone(npcs); edit();
  try { validatePlacements(npcs, { type: 'City', raw: { size: town.size } } as MapMeta, new Set(looks.map(l => l.res))); }
  catch (e) { npcs = old; inspector(); status((e as Error).message, true); return; }
  dirty = true; renderList(); inspector(); controls(); draw();
}
async function openTown(id: number) {
  const t = towns.find(t => t.id === id); if (!t?.available) throw Error('Map này chưa có tài nguyên. Hãy sinh map trước.');
  const e = ++epoch;
  const [data, map, navFile] = await Promise.all([
    t.editable ? api<{ npcs: NpcPlacement[]; revision: string }>(`/api/maps/${id}/npcs`) : Promise.resolve({ npcs: [] as NpcPlacement[], revision: '' }),
    api<MapJson>(`/assets/maps/${id}/map.json`),
    api<{ navigation: NonNullable<typeof nav> }>(`/assets/maps/${id}/nav.json`),
  ]);
  if (e !== epoch) return;
  town = t; npcs = data.npcs; revision = data.revision; selected = npcs[0]?.id ?? ''; dirty = false;
  meta = map; nav = navFile.navigation; blocked = Uint8Array.from(atob(nav.blockedBase64), c => c.charCodeAt(0)); regions = Uint8Array.from(atob(meta.regions), c => c.charCodeAt(0));
  images.clear(); pending.clear(); failed.clear(); chunks.clear();
  $('empty').hidden = true; renderList(); inspector(); center(); renderMaps(); controls(); status(t.editable ? `Đã mở ${t.name}. Chọn NPC rồi click hoặc kéo trên map để đặt vị trí.` : `Đã mở ${t.name} để xem trước. Cài spawn quái/Boss Xanh sẽ được bổ sung sau.`);
}
function center() { if (!town) return; zoom = 1; panX = canvas.clientWidth / 2 - town.entry.x; panY = canvas.clientHeight / 2 - town.entry.y; draw(); }
function zoomAt(factor: number, x: number, y: number) { const z = Math.min(4, Math.max(.008, zoom * factor)); panX = x - (x - panX) * z / zoom; panY = y - (y - panY) * z / zoom; zoom = z; draw(); }
function ensureChunk(key: string) {
  const cacheKey = 'chunk:' + key;
  if (chunks.has(key) || pending.has(cacheKey) || failed.has(cacheKey)) return;
  const e = epoch; pending.add(cacheKey);
  void api<Chunk>(url(`objects/${key}.json`)).then(data => { if (e !== epoch) return; pending.delete(cacheKey); chunks.set(key, data); draw(); }).catch(() => { if (e !== epoch) return; pending.delete(cacheKey); failed.add(cacheKey); status('Thiếu một vùng vật thể map. Hãy kiểm tra bộ tài nguyên.', true); });
}
function draw() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height); $('zoom').textContent = `${Math.round(zoom * 100)}%`;
  if (!town || !meta) return;
  ctx.translate(panX, panY); ctx.scale(zoom, zoom);
  const mini = loadImage('minimap', url('minimap.webp')); if (mini) ctx.drawImage(mini, 0, 0, town.size.width, town.size.height);
  const x0 = Math.max(0, -panX / zoom), y0 = Math.max(0, -panY / zoom), x1 = Math.min(town.size.width, (r.width - panX) / zoom), y1 = Math.min(town.size.height, (r.height - panY) / zoom);
  const drawables: { depth: number; run: () => void }[] = [];
  if (zoom >= .15) {
    for (let y = Math.max(0, Math.floor(y0 / 512)); y <= Math.min(meta.rows - 1, Math.floor(y1 / 512)); y++) for (let x = Math.max(0, Math.floor(x0 / 512)); x <= Math.min(meta.cols - 1, Math.floor(x1 / 512)); x++) {
      const i = y * meta.cols + x; if (!(regions[i >> 3] >> (i & 7) & 1)) continue;
      const key = `${x}_${y}`, img = loadImage('ground:' + key, url(`ground/${key}.webp`)); if (img) ctx.drawImage(img, x * 512, y * 512);
    }
    for (const key of meta.chunks) {
      const [cx, cy] = key.split('_').map(Number), size = meta.chunk * 512;
      if (cx * size > x1 + 1000 || (cx + 1) * size < x0 - 1000 || cy * size > y1 + 1000 || (cy + 1) * size < y0 - 1000) continue;
      ensureChunk(key); const chunk = chunks.get(key); if (!chunk) continue;
      for (const [frame, x, y, sx, sw, depth] of chunk.pieces) {
        const [page, fx, fy, , fh] = chunk.frames[frame];
        if (x + sw < x0 || x > x1 || y + fh < y0 || y > y1) continue;
        const img = loadImage('page:' + chunk.pages[page], url('objects/' + chunk.pages[page]));
        if (img) drawables.push({ depth, run: () => ctx.drawImage(img, fx + sx, fy, sw, fh, x, y, sw, fh) });
      }
    }
    for (const n of npcs) {
      const look = looks.find(l => l.res === n.res), img = loadImage(`npc:${n.res}:${n.dir}`, `/api/npc-image?res=${encodeURIComponent(n.res)}&dir=${n.dir}`);
      if (img && look) drawables.push({ depth: n.y, run: () => ctx.drawImage(img, n.x - look.anchorX, n.y - look.anchorY) });
    }
    drawables.sort((a, b) => a.depth - b.depth).forEach(d => d.run());
  }
  if (field('blocked').checked && nav) {
    const cw = nav.cellSize.width, ch = nav.cellSize.height; ctx.fillStyle = '#f2ad9b55';
    const stride = zoom < .1 ? 4 : 1;
    for (let y = Math.max(0, Math.floor(y0 / ch)); y < Math.min(nav.rows, Math.ceil(y1 / ch)); y += stride) for (let x = Math.max(0, Math.floor(x0 / cw)); x < Math.min(nav.columns, Math.ceil(x1 / cw)); x += stride) {
      const i = y * nav.columns + x; if (blocked[i >> 3] >> (i & 7) & 1) ctx.fillRect(x * cw, y * ch, cw * stride, ch * stride);
    }
  }
  for (const n of npcs) {
    const pick = n.id === selected; ctx.beginPath(); ctx.ellipse(n.x, n.y, (pick ? 9 : 6) / zoom, (pick ? 5 : 4) / zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = standable(n.x, n.y) ? (pick ? '#b9d8bf' : '#f0d88b') : '#f2ad9b'; ctx.fill(); ctx.lineWidth = 1.5 / zoom; ctx.strokeStyle = '#142318'; ctx.stroke();
    ctx.font = `${12 / zoom}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3 / zoom; ctx.strokeStyle = '#101211'; ctx.fillStyle = '#e6e9e6';
    const y = n.y - ((zoom >= .15 ? (looks.find(l => l.res === n.res)?.anchorY ?? 80) : 0) + 12 / zoom);
    ctx.strokeText(n.name, n.x, y); ctx.fillText(n.name, n.x, y);
  }
}
function point(e: PointerEvent | WheelEvent) { const r = canvas.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left - panX) / zoom), y: Math.round((e.clientY - r.top - panY) / zoom) }; }
let drag: { id: number; pan: boolean; clientX: number; clientY: number; x: number; y: number; panX: number; panY: number; npc?: NpcPlacement } | null = null;
canvas.addEventListener('pointerdown', e => {
  if (!town || busy || drag) return; canvas.focus(); const p = point(e);
  const pan = field('pan').checked || e.button === 1;
  const hit = [...npcs].reverse().find(n => Math.hypot(n.x - p.x, n.y - p.y) * zoom < 18);
  if (!pan && e.button !== 0) return;
  if (hit && !pan) { selected = hit.id; inspector(); renderList(); controls(); }
  if (!pan && !hit && current()) change(() => { current()!.x = p.x; current()!.y = p.y; });
  drag = { id: e.pointerId, pan, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, panX, panY, npc: pan ? undefined : hit };
  canvas.setPointerCapture(e.pointerId); e.preventDefault(); draw();
});
canvas.addEventListener('pointermove', e => {
  const p = point(e); $('coords').textContent = `X: ${p.x} · Y: ${p.y}`;
  if (!drag || e.pointerId !== drag.id || !town) return;
  if (drag.pan) { panX = drag.panX + e.clientX - drag.clientX; panY = drag.panY + e.clientY - drag.clientY; }
  else if (drag.npc) { drag.npc.x = Math.max(0, Math.min(town.size.width - 1, p.x)); drag.npc.y = Math.max(0, Math.min(town.size.height - 1, p.y)); dirty = true; field('x').value = String(drag.npc.x); field('y').value = String(drag.npc.y); positionStatus(); controls(); }
  draw();
});
function endDrag(e: PointerEvent) { if (drag?.id === e.pointerId) { drag = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); renderList(); } }
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
new ResizeObserver(draw).observe($('stage'));
$('center').onclick = center;
$('fit').onclick = () => { if (!town) return; zoom = Math.min((canvas.clientWidth - 24) / town.size.width, (canvas.clientHeight - 24) / town.size.height); panX = (canvas.clientWidth - town.size.width * zoom) / 2; panY = (canvas.clientHeight - town.size.height * zoom) / 2; draw(); };
$('plus').onclick = () => zoomAt(1.3, canvas.clientWidth / 2, canvas.clientHeight / 2);
$('minus').onclick = () => zoomAt(1 / 1.3, canvas.clientWidth / 2, canvas.clientHeight / 2);
field('blocked').onchange = draw; field('search').oninput = renderList;
for (const id of ['name', 'x', 'y', 'action', 'res', 'dir']) field(id).onchange = () => change(() => {
  const n = current()!; if (id === 'name') n.name = field(id).value;
  else if (id === 'x' || id === 'y' || id === 'dir') n[id] = Number(field(id).value);
  else if (id === 'action') n.action = field(id).value as NpcPlacement['action']; else n.res = field(id).value;
});
// Text and numeric edits update the draft on input, including browser automation and touch keyboards.
for (const id of ['name', 'x', 'y'] as const) field(id).oninput = () => {
  const n = current(); if (!n || busy) return;
  if (id === 'name') n.name = field(id).value;
  else if (field(id).value !== '' && Number.isFinite(Number(field(id).value))) n[id] = Number(field(id).value);
  dirty = true; renderList(); positionStatus(); controls(); draw();
};
$('snap').onclick = () => void run(async () => {
  const n = current()!; const p = await api<{ x: number; y: number; moved: boolean }>(`/api/maps/${town!.id}/snap`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x: n.x, y: n.y }) });
  n.x = p.x; n.y = p.y; dirty = true; renderList(); inspector(); draw(); status(p.moved ? 'Đã căn NPC về điểm đi được. Bấm Lưu để ghi cấu hình.' : 'NPC đã ở vùng đi được.');
});
$('add').onclick = () => change(() => {
  const t = templates[Number($<HTMLSelectElement>('template').value)];
  const n: NpcPlacement = { id: `npc-${crypto.randomUUID()}`, name: t.name, action: t.action, res: t.res, dir: t.dir, x: Math.round(town!.entry.x), y: Math.round(town!.entry.y) };
  npcs.push(n); selected = n.id;
});
$('remove').onclick = async () => { const n = current(); if (n && await confirmDraft(`Xóa NPC “${n.name}” khỏi bản nháp của ${town!.name}? Chỉ ghi vào game khi bấm Lưu.`)) change(() => { npcs = npcs.filter(o => o.id !== n.id); selected = npcs[0]?.id ?? ''; }); };
async function save() {
  if (!town?.editable) return;
  const data = await api<{ npcs: NpcPlacement[]; revision: string }>(`/api/maps/${town.id}/npcs`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ npcs, revision }) });
  npcs = data.npcs; revision = data.revision; dirty = false; renderList(); inspector();
  status('Đã ghi cấu hình NPC vào mã nguồn game. Game dev có thể reload; bản game đã build cần build lại và tải lại client.');
}
$('save').onclick = () => void run(save);
$('reload').onclick = async () => { if (town && (!dirty || await confirmDraft('Bỏ thay đổi chưa lưu và mở lại cấu hình đã lưu?'))) void run(() => openTown(town!.id)); };
function renderMaps() {
  const query = field('map-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
  const visible = towns.filter(m => `${m.name} ${m.id}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().includes(query));
  const list = $('map-list'); list.replaceChildren();
  for (const group of ['city', 'training'] as const) {
    const items = visible.filter(m => m.group === group).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    if (!items.length) continue;
    const section = document.createElement('section'), head = document.createElement('h3');
    head.textContent = `${group === 'city' ? 'Thành thị' : 'Luyện công'} (${items.length})`; section.append(head);
    for (const m of items) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.map = String(m.id); b.dataset.available = String(m.available);
      b.className = 'map-card' + (town?.id === m.id ? ' selected' : ''); b.setAttribute('aria-pressed', String(town?.id === m.id));
      b.disabled = busy || !m.available;
      const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy'; image.width = 84; image.height = 64;
      const base = `/assets/maps/${m.id}/`, version = versions[m.id] ? `?v=${encodeURIComponent(versions[m.id])}` : '';
      image.src = base + 'thumb.webp' + version;
      image.onerror = () => { image.onerror = () => { image.hidden = true; }; image.src = base + 'minimap.webp' + version; };
      const text = document.createElement('span'), name = document.createElement('strong'), hint = document.createElement('small');
      name.textContent = m.name; hint.textContent = m.available ? `Map ${m.id}${m.editable ? '' : ' · Xem trước'}` : 'Chưa sinh tài nguyên';
      text.append(name, hint); b.append(image, text);
      b.onclick = async () => {
        if (busy || town?.id === m.id) return;
        if (dirty && !await confirmDraft('Bỏ bản nháp chưa lưu để chuyển bản đồ?')) return;
        void run(() => openTown(m.id));
      };
      section.append(b);
    }
    list.append(section);
  }
  if (!visible.length) list.textContent = 'Không tìm thấy bản đồ phù hợp.';
}
field('map-search').oninput = renderMaps;
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (!busy) void run(save); } });
void run(async () => {
  const [b, l] = await Promise.all([api<{ maps: Town[]; templates: Template[]; versions: Record<string, string> }>('/api/bootstrap'), api<Look[]>('/api/looks')]);
  towns = b.maps; templates = b.templates; versions = b.versions; looks = l;
  renderMaps();
  templates.forEach((t, i) => $<HTMLSelectElement>('template').add(new Option(t.name, String(i))));
  Object.entries(NPC_ACTION_LABELS).forEach(([key, name]) => $<HTMLSelectElement>('action').add(new Option(name, key)));
  looks.forEach(l => { const o = new Option(`${l.label}${l.available ? '' : ' · Thiếu hình'}`, l.res); $<HTMLSelectElement>('res').add(o); });
  status(towns.length ? 'Chọn bản đồ ở sidebar. Thành thị cho phép cài NPC; luyện công hiện chỉ xem trước.' : 'Chưa có bản đồ. Hãy sinh tài nguyên map trước.');
});
