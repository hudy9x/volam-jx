import { dialogs } from '../../../apps/client/src/ui/kit/dialog.js';
import { NPC_ACTION_LABELS, validatePlacements, type NpcPlacement } from '../../../packages/shared/src/npcs/placements.js';
import type { MapMeta } from '../../../packages/shared/src/maps/types.js';
import { SafeZonePen, type ZoneDocument } from './SafeZonePen.js';
import './main.css';
import { labelAction } from '../../ui/actions.js';
import { PortalEditor, type PortalDocument } from './PortalEditor.js';
import { SpawnEditor, type SpawnDocument, type SpawnMonster } from './SpawnEditor.js';
import { TkEditor, type TkDocument } from './TkEditor.js';
import { NavEditor, type NavOverrideDoc } from './NavEditor.js';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => $<HTMLInputElement>(id);
interface Town { id: number; name: string; type?: string; size: { width: number; height: number }; entry: { x: number; y: number }; available: boolean; enabled?: boolean; group: 'city' | 'training'; editable: boolean; battlefield?: boolean }
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
let mode: 'npc' | 'zones' | 'portals' | 'spawns' | 'tongkim' | 'nav' = 'npc';
let mapView: 'mini' | 'detail' = 'mini';
let showBlocked = false;
const pen = new SafeZonePen(() => { controls(); draw(); }, confirmDraft, (s, error) => status(s, error));
const portals = new PortalEditor(() => towns, () => { controls(); draw(); }, confirmDraft, (s, error) => status(s, error), id => api(`/api/maps/${id}/portal-entry`), standable);
const spawns = new SpawnEditor(() => { controls(); draw(); }, standable);
const tk = new TkEditor(() => { controls(); draw(); }, standable, nearestWalkablePt);
const navEd = new NavEditor(() => { controls(); draw(); });
const unsaved = () => dirty || pen.unsaved || portals.dirty || spawns.dirty || tk.dirty || navEd.dirty;
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
  $<HTMLButtonElement>('save').disabled = !(mode === 'portals' || mode === 'spawns' || mode === 'nav' ? town?.available : mode === 'tongkim' ? (town?.available && !!tk.config) : town?.editable) || busy || mode === 'portals' && portals.loading;
  const toggleBtn = $<HTMLButtonElement>('toggle-enabled');
  toggleBtn.hidden = !town;
  if (town) {
    const isEnabled = town.enabled !== false;
    toggleBtn.textContent = isEnabled ? 'Tắt map này' : 'Bật map này';
    toggleBtn.disabled = busy || (isEnabled && town.id === 37);
    toggleBtn.title = town.id === 37 ? 'Không thể tắt Biện Kinh (map an toàn mặc định).' : isEnabled ? 'Ẩn map khỏi danh sách người chơi và chuyển người đang ở đây về Biện Kinh.' : 'Mở lại map cho người chơi vào.';
  }
  $<HTMLButtonElement>('reload').disabled = !town || busy;
  $<HTMLFieldSetElement>('add-fields').disabled = !town?.editable || busy;
  $<HTMLFieldSetElement>('edit-fields').disabled = !current() || busy;
  $<HTMLButtonElement>('map-view').disabled = !town || busy;
  $<HTMLButtonElement>('blocked').disabled = !town || busy;
  $('blocked').setAttribute('aria-pressed', String(showBlocked));
  syncMapView();
  $<HTMLButtonElement>('npc-detail').disabled = !current() || busy;
  $('npc-panel').hidden = mode !== 'npc';
  $('zones-panel').hidden = mode !== 'zones';
  $('spawn-summary').textContent = `${spawns.file.zones.filter(z => z.boss !== true && z.boss !== 2).length} khu · ${spawns.file.fixed?.length ?? 0} điểm cố định cũ được giữ · ${spawns.dirty ? 'Chưa lưu' : 'Đã nạp bản lưu'}`;
  $('spawns-panel').hidden = mode !== 'spawns';
  $<HTMLFieldSetElement>('spawns-panel').disabled = !town || busy;
  $('portals-panel').hidden = mode !== 'portals';
  $<HTMLFieldSetElement>('portals-panel').disabled = !town || busy;
  $('tongkim-panel').hidden = mode !== 'tongkim';
  $<HTMLFieldSetElement>('tongkim-panel').disabled = !town?.available || busy;
  $('nav-panel').hidden = mode !== 'nav';
  $<HTMLFieldSetElement>('nav-panel').disabled = !town?.available || busy;
  $<HTMLFieldSetElement>('portal-fields').disabled = !portals.current() || busy;
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => { b.setAttribute('aria-pressed', String(mode === b.dataset.mode)); b.disabled = busy; });
  $('pan-tool').setAttribute('aria-pressed', String(field('pan').checked));
  $('mode-hint').textContent = mode === 'nav' ? 'N · Bấm/kéo trên bản đồ để tẩy hoặc vẽ vùng chặn (cọ ô 32×16).' : mode === 'tongkim' ? 'K · Chọn phe và điểm cần đặt, bấm/kéo trên bản đồ để cấu hình Tống Kim.' : mode === 'spawns' ? 'M · Bấm vùng trống để tạo điểm sinh; bấm điểm để chọn, kéo để di chuyển.' : mode === 'npc' ? 'V · Chọn NPC rồi bấm/kéo trên map để đặt.' : mode === 'zones' ? 'B · Vẽ và chỉnh đường bao vùng an toàn.' : 'T · Chọn điểm chuyển rồi bấm/kéo để di chuyển; lưu riêng với NPC và vùng an toàn.';
  $<HTMLFieldSetElement>('zones-panel').disabled = !town?.editable || busy;
  labelAction($('save'), 'save', mode === 'nav' ? 'Lưu vùng chặn' : mode === 'tongkim' ? 'Lưu Tống Kim' : mode === 'spawns' ? 'Lưu điểm sinh quái' : mode === 'zones' ? 'Lưu vùng an toàn' : mode === 'portals' ? 'Lưu điểm chuyển' : 'Lưu NPC', 'Ghi cấu hình của công cụ đang chọn vào nguồn game.', 'Ctrl/Cmd+S');
  if (mode === 'nav') { $('position').textContent = `Cọ: ${navEd.brush === 'unblock' ? 'Tẩy chặn (Mở đường)' : 'Vẽ chặn'} · ${navEd.brushSize}×${navEd.brushSize}`; }
  if (mode === 'tongkim') { $('position').textContent = tk.config ? `Tống Kim · ${tk.camp === 'tong' ? 'Phe Tống' : 'Phe Kim'}` : 'Chưa khởi tạo Tống Kim'; }
  if (mode === 'spawns') { const z = spawns.current(); $('position').textContent = z ? z.x === undefined ? 'Auto · Server chọn vị trí khi khởi tạo map' : `${standable(z.x, z.y!) ? 'Đi được' : 'Vị trí bị chặn'} · ${z.x}, ${z.y}` : 'Chưa chọn khu sinh quái'; }
  if (mode === 'portals') { const p = portals.current(); $('position').textContent = p ? `${p.label} · ${p.x}, ${p.y}` : 'Chưa chọn điểm chuyển'; }
  $('stage').style.pointerEvents = busy ? 'none' : '';
  $('summary').textContent = town ? `${town.name}${town.enabled === false ? ' (Đã tắt)' : ''} · ${mode === 'nav' ? `Vùng chặn · ${unsaved() ? 'Chưa lưu' : 'Đã nạp bản lưu'}` : mode === 'tongkim' ? `${tk.config ? 'Đã cấu hình Tống Kim' : 'Chưa cấu hình Tống Kim'} · ${unsaved() ? 'Chưa lưu' : 'Đã nạp bản lưu'}` : mode === 'spawns' ? `${spawns.file.zones.length} khu sinh · ${unsaved() ? 'Chưa lưu' : 'Đã nạp bản lưu'}` : mode === 'portals' ? `${portals.portals.length} điểm chuyển · ${unsaved() ? 'Có bản nháp chưa lưu' : 'Đã nạp bản lưu'}` : town.editable ? `${npcs.length} NPC · ${unsaved() ? 'Chưa lưu' : 'Đã nạp bản lưu'}` : 'Luyện công · Xem trước'}` : 'Chưa chọn bản đồ';
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
function nearestWalkablePt(x: number, y: number): { x: number; y: number } {
  if (!town) return { x, y };
  const cx = Math.max(0, Math.min(town.size.width - 1, Math.round(x)));
  const cy = Math.max(0, Math.min(town.size.height - 1, Math.round(y)));
  if (standable(cx, cy)) return { x: cx, y: cy };
  for (let r = 32; r <= 2400; r += 32) {
    for (let a = 0; a < 16; a++) {
      const ang = (Math.PI * 2 * a) / 16;
      const px = Math.max(0, Math.min(town.size.width - 1, Math.round(cx + Math.cos(ang) * r)));
      const py = Math.max(0, Math.min(town.size.height - 1, Math.round(cy + Math.sin(ang) * r * 0.5)));
      if (standable(px, py)) return { x: px, y: py };
    }
  }
  return { x: Math.round(town.entry.x), y: Math.round(town.entry.y) };
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
  if (!visible.length) $('npc-list').textContent = town && !town.editable ? 'Chọn công cụ Quái / Boss Xanh để chỉnh khu sinh quái.' : npcs.length ? 'Không có NPC khớp tìm kiếm.' : 'Chưa có NPC. Chọn chức năng bên dưới để thêm.';
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
  const [data, map, navFile, zoneDoc, portalDoc, spawnDoc, tkDoc, navOvDoc] = await Promise.all([
    t.editable ? api<{ npcs: NpcPlacement[]; revision: string }>(`/api/maps/${id}/npcs`) : Promise.resolve({ npcs: [] as NpcPlacement[], revision: '' }),
    api<MapJson>(`/assets/maps/${id}/map.json`),
    api<{ navigation: NonNullable<typeof nav> }>(`/assets/maps/${id}/nav.json`),
    t.editable ? api<ZoneDocument>(`/api/maps/${id}/safe-zones`) : Promise.resolve({ zones: [], custom: false, revision: '' }),
    api<PortalDocument>(`/api/maps/${id}/portals`),
    api<SpawnDocument>(`/api/maps/${id}/spawns`),
    api<TkDocument>(`/api/maps/${id}/tongkim`),
    api<NavOverrideDoc>(`/api/maps/${id}/nav-overrides`),
  ]);
  if (e !== epoch) return;
  town = t; npcs = data.npcs; revision = data.revision; selected = npcs[0]?.id ?? ''; dirty = false;
  meta = map; nav = navFile.navigation;
  const baseBlocked = Uint8Array.from(atob(nav.blockedBase64), c => c.charCodeAt(0));
  blocked = new Uint8Array(baseBlocked);
  navEd.setup(nav.columns, nav.rows, nav.cellSize.width, nav.cellSize.height, baseBlocked, blocked, navOvDoc);
  regions = Uint8Array.from(atob(meta.regions), c => c.charCodeAt(0));
  spawns.load(spawnDoc, t.entry);
  portals.load(t, portalDoc);
  tk.setup(t.id, t.size, tkDoc);
  pen.load({ type: t.editable ? 'City' : 'Field', raw: { size: t.size, entry: t.entry } }, zoneDoc);
  images.clear(); pending.clear(); failed.clear(); chunks.clear();
  $('empty').hidden = true; renderList(); inspector(); mapView = 'mini'; syncMapView(); fitMap(); renderMaps(); controls(); status(t.editable ? `Đã mở ${t.name}. Chọn NPC rồi click hoặc kéo trên map để đặt vị trí.` : `Đã mở ${t.name} để cấu hình. Chọn M để đặt quái / Boss Xanh.`);
}
function fitScale() { return town ? Math.min((canvas.clientWidth - 24) / town.size.width, (canvas.clientHeight - 24) / town.size.height) : 1; }
function fitMap() {
  if (!town) return;
  // Full-map overview always uses the lightweight minimap, never all ground/object chunks.
  mapView = 'mini'; syncMapView();
  zoom = fitScale(); panX = (canvas.clientWidth - town.size.width * zoom) / 2; panY = (canvas.clientHeight - town.size.height * zoom) / 2; draw();
}
function center() {
  if (!town) return;
  zoom = mapView === 'detail' ? 1 : Math.max(fitScale() * 8, zoom);
  panX = canvas.clientWidth / 2 - town.entry.x * zoom; panY = canvas.clientHeight / 2 - town.entry.y * zoom; draw();
}
function npcDetail() {
  const n = current(); if (!n) return;
  mapView = 'detail'; syncMapView();
  zoom = 1; panX = canvas.clientWidth / 2 - n.x; panY = canvas.clientHeight / 2 - n.y; draw();
}
function zoomAt(factor: number, x: number, y: number) { const z = Math.min(4, Math.max(Math.min(.008, fitScale() / 4), zoom * factor)); panX = x - (x - panX) * z / zoom; panY = y - (y - panY) * z / zoom; zoom = z; draw(); }
function ensureChunk(key: string) {
  const cacheKey = 'chunk:' + key;
  if (chunks.has(key) || pending.has(cacheKey) || failed.has(cacheKey)) return;
  const e = epoch; pending.add(cacheKey);
  void api<Chunk>(url(`objects/${key}.json`)).then(data => { if (e !== epoch) return; pending.delete(cacheKey); chunks.set(key, data); draw(); }).catch(() => { if (e !== epoch) return; pending.delete(cacheKey); failed.add(cacheKey); status('Thiếu một vùng vật thể map. Hãy kiểm tra bộ tài nguyên.', true); });
}
function draw() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height); $('zoom').textContent = `${Math.round(zoom / (mapView === 'mini' ? fitScale() : 1) * 100)}%`;
  $('zoom').title = mapView === 'mini' ? 'Minimap: 100% = vừa toàn map' : 'Map thật: 100% = ảnh gốc';
  if (!town || !meta) return;
  ctx.translate(panX, panY); ctx.scale(zoom, zoom);
  const mini = loadImage('minimap', url('minimap.webp')); if (mini) ctx.drawImage(mini, 0, 0, town.size.width, town.size.height);
  const x0 = Math.max(0, -panX / zoom), y0 = Math.max(0, -panY / zoom), x1 = Math.min(town.size.width, (r.width - panX) / zoom), y1 = Math.min(town.size.height, (r.height - panY) / zoom);
  const drawables: { depth: number; run: () => void }[] = [];
  const detailed = mapView === 'detail' && zoom >= .15;
  if (detailed) {
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
  if ((showBlocked || mode === 'nav') && nav) {
    const cw = nav.cellSize.width, ch = nav.cellSize.height; ctx.fillStyle = '#f2ad9b55';
    const stride = zoom < .1 && mode !== 'nav' ? 4 : 1;
    for (let y = Math.max(0, Math.floor(y0 / ch)); y < Math.min(nav.rows, Math.ceil(y1 / ch)); y += stride) for (let x = Math.max(0, Math.floor(x0 / cw)); x < Math.min(nav.columns, Math.ceil(x1 / cw)); x += stride) {
      const i = y * nav.columns + x; if (blocked[i >> 3] >> (i & 7) & 1) ctx.fillRect(x * cw, y * ch, cw * stride, ch * stride);
    }
  }
  for (const n of npcs) {
    const pick = n.id === selected; ctx.beginPath(); ctx.ellipse(n.x, n.y, (pick ? 9 : 6) / zoom, (pick ? 5 : 4) / zoom, 0, 0, Math.PI * 2);
    ctx.fillStyle = standable(n.x, n.y) ? (pick ? '#b9d8bf' : '#f0d88b') : '#f2ad9b'; ctx.fill(); ctx.lineWidth = 1.5 / zoom; ctx.strokeStyle = '#142318'; ctx.stroke();
    if (mapView === 'mini' && !pick) continue;
    ctx.font = `${12 / zoom}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 3 / zoom; ctx.strokeStyle = '#101211'; ctx.fillStyle = '#e6e9e6';
    const y = n.y - ((detailed ? (looks.find(l => l.res === n.res)?.anchorY ?? 80) : 0) + 12 / zoom);
    ctx.strokeText(n.name, n.x, y); ctx.fillText(n.name, n.x, y);
  }
  if (mode === 'zones') pen.draw(ctx, zoom);
  if (mode === 'portals') portals.draw(ctx, zoom);
  if (mode === 'spawns') spawns.draw(ctx, zoom);
  if (mode === 'tongkim') tk.draw(ctx, zoom);
  if (mode === 'nav') navEd.drawCursor(ctx, zoom);
}
function point(e: PointerEvent | WheelEvent) { const r = canvas.getBoundingClientRect(); return { x: Math.round((e.clientX - r.left - panX) / zoom), y: Math.round((e.clientY - r.top - panY) / zoom) }; }
let drag: { id: number; pan: boolean; clientX: number; clientY: number; x: number; y: number; panX: number; panY: number; npc?: NpcPlacement; zone?: boolean; portal?: boolean; spawn?: boolean; tk?: boolean; nav?: boolean } | null = null;
canvas.addEventListener('pointerdown', e => {
  if (!town || busy || drag) return; canvas.focus(); const p = point(e);
  const pan = field('pan').checked || spacePan || e.button === 1;
  if (mode === 'nav' && !pan && e.button === 0) {
    navEd.paint(p.x, p.y);
    drag = { id: e.pointerId, pan: false, nav: true, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, panX, panY };
    canvas.setPointerCapture(e.pointerId); e.preventDefault(); return;
  }
  if (mode === 'tongkim' && !pan && e.button === 0) {
    if (tk.pointerDown(p.x, p.y, zoom)) { drag = { id: e.pointerId, pan: false, tk: true, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, panX, panY }; canvas.setPointerCapture(e.pointerId); }
    e.preventDefault(); return;
  }
  if (mode === 'spawns' && !pan && e.button === 0) {
    if (spawns.down(p, zoom)) { drag = { id: e.pointerId, pan: false, spawn: true, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, panX, panY }; canvas.setPointerCapture(e.pointerId); }
    e.preventDefault(); return;
  }
  if (mode === 'portals' && !pan && e.button === 0) {
    if (portals.down(p, zoom)) { drag = { id: e.pointerId, pan: false, portal: true, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, panX, panY }; canvas.setPointerCapture(e.pointerId); }
    e.preventDefault(); return;
  }
  if (mode === 'zones' && !pan && e.button === 0) {
    if (!town.editable) return;
    pen.down(p, zoom);
    drag = { id: e.pointerId, pan: false, zone: true, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, panX, panY };
    canvas.setPointerCapture(e.pointerId); e.preventDefault(); return;
  }
  const hit = [...npcs].reverse().find(n => Math.hypot(n.x - p.x, n.y - p.y) * zoom < 18);
  if (!pan && e.button !== 0) return;
  if (mode === 'npc' && hit && !pan) { selected = hit.id; inspector(); renderList(); controls(); }
  if (mode === 'npc' && !pan && !hit && current()) change(() => { current()!.x = p.x; current()!.y = p.y; });
  drag = { id: e.pointerId, pan, clientX: e.clientX, clientY: e.clientY, x: p.x, y: p.y, panX, panY, npc: pan || mode !== 'npc' ? undefined : hit };
  canvas.setPointerCapture(e.pointerId); e.preventDefault(); draw();
});
canvas.addEventListener('pointermove', e => {
  const p = point(e); $('coords').textContent = `X: ${p.x} · Y: ${p.y}`;
  if (mode === 'zones' && town?.editable) $('position').textContent = pen.describe(p);
  if (mode === 'nav' && nav) { navEd.hoverCell = { col: Math.floor(p.x / nav.cellSize.width), row: Math.floor(p.y / nav.cellSize.height) }; if (!drag) draw(); }
  if (!drag || e.pointerId !== drag.id || !town) return;
  if (drag.pan) { panX = drag.panX + e.clientX - drag.clientX; panY = drag.panY + e.clientY - drag.clientY; }
  else if (drag.zone) pen.move(p);
  else if (drag.spawn) spawns.move(p);
  else if (drag.portal) portals.move(p);
  else if (drag.tk) tk.pointerMove(p.x, p.y);
  else if (drag.nav) navEd.paint(p.x, p.y);
  else if (drag.npc) { drag.npc.x = Math.max(0, Math.min(town.size.width - 1, p.x)); drag.npc.y = Math.max(0, Math.min(town.size.height - 1, p.y)); dirty = true; field('x').value = String(drag.npc.x); field('y').value = String(drag.npc.y); positionStatus(); controls(); }
  draw();
});
function endDrag(e: PointerEvent) { if (drag?.id === e.pointerId) { if (drag.zone) pen.up(); if (drag.tk) tk.pointerUp(); drag = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); renderList(); } }
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
new ResizeObserver(draw).observe($('stage'));
function setMode(next: typeof mode) { mode = next; field('editor-mode').value = mode; if (mode === 'npc') positionStatus(); controls(); draw(); status(mode === 'nav' ? 'Bấm hoặc kéo chuột trên bản đồ để tẩy hoặc vẽ vùng chặn.' : mode === 'tongkim' ? 'Chọn phe và điểm cần đặt, bấm/kéo trực tiếp trên bản đồ để cấu hình Tống Kim.' : mode === 'spawns' ? 'Bấm lên map để tạo điểm sinh quái mới (5 con/điểm).' : mode === 'portals' ? 'Chọn điểm chuyển rồi bấm/kéo trên map để đặt lại vị trí.' : mode === 'zones' ? 'Dùng Pen để vẽ hoặc chỉnh vùng an toàn.' : 'Chọn NPC rồi bấm/kéo trên map để đặt vị trí.'); }
field('editor-mode').onchange = () => setMode(field('editor-mode').value as typeof mode);
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode as typeof mode));
$('pan-tool').onclick = () => { field('pan').checked = !field('pan').checked; controls(); };
function syncMapView() {
  const button = $('map-view'); button.setAttribute('aria-checked', String(mapView === 'detail'));
  button.querySelectorAll<HTMLElement>('[data-view]').forEach(label => label.classList.toggle('active', label.dataset.view === mapView));
  button.dataset.tip = `Nền bản đồ (Z) · ${mapView === 'mini' ? 'Đang dùng Minimap. Chuyển sang map thật tại khu vực đang xem.' : 'Đang dùng Map thật (Realistic). Chuyển về Minimap toàn map.'}`;
}
$('map-view').onclick = () => {
  if (!town || busy) return;
  mapView = mapView === 'mini' ? 'detail' : 'mini'; syncMapView();
  if (mapView === 'mini') fitMap();
  else { if (zoom < .15) zoomAt(1 / zoom, canvas.clientWidth / 2, canvas.clientHeight / 2); else draw(); }
};
$('npc-detail').onclick = npcDetail;
$('center').onclick = center;
$('fit').onclick = fitMap;
$('plus').onclick = () => zoomAt(1.3, canvas.clientWidth / 2, canvas.clientHeight / 2);
$('minus').onclick = () => zoomAt(1 / 1.3, canvas.clientWidth / 2, canvas.clientHeight / 2);
$('blocked').onclick = () => { showBlocked = !showBlocked; controls(); draw(); }; field('search').oninput = renderList;
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
  if (!town) return;
  if (mode === 'nav') {
    const data = await api<NavOverrideDoc>(`/api/maps/${town.id}/nav-overrides`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(navEd.payload()) });
    navEd.saved(data);
    status('Đã lưu chỉnh sửa vùng chặn vào nav-overrides.json. Server tự nhận ngay; client cần reload (hoặc build lại bản production).');
    return;
  }
  if (mode === 'tongkim') {
    const data = await api<TkDocument>(`/api/maps/${town.id}/tongkim`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tk.payload()) });
    tk.saved(data);
    const portalDoc = await api<PortalDocument>(`/api/maps/${town.id}/portals`);
    portals.load(town, portalDoc);
    status('Đã lưu cấu hình Tống Kim & 4 cổng doanh trại. Khởi động lại server game (hoặc build lại nếu chạy production) để nhận map mới.');
    return;
  }
  if (mode === 'spawns') {
    const data = await api<SpawnDocument>(`/api/maps/${town.id}/spawns`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file: spawns.file, revision: spawns.revision }) });
    spawns.saved(data); status('Đã lưu điểm sinh quái. Khởi động lại server game để nhận cấu hình mới.'); return;
  }
  if (mode === 'portals') {
    const data = await api<PortalDocument>(`/api/maps/${town.id}/portals`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portals: portals.portals, revision: portals.revision }) });
    portals.saved(data); status('Đã lưu điểm chuyển. Khởi động lại server và tải lại client; production cần build lại.'); return;
  }
  if (!town.editable) return;
  if (mode === 'zones') {
    const zones = pen.value();
    const data = await api<ZoneDocument>(`/api/maps/${town.id}/safe-zones`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ zones, revision: pen.revision }) });
    pen.saved(data); status('Đã ghi vùng an toàn vào mã nguồn. Khởi động lại server và tải lại client để nhận cấu hình mới; bản production cần build lại.'); return;
  }
  const data = await api<{ npcs: NpcPlacement[]; revision: string }>(`/api/maps/${town.id}/npcs`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ npcs, revision }) });
  npcs = data.npcs; revision = data.revision; dirty = false; renderList(); inspector();
  status('Đã ghi cấu hình NPC vào mã nguồn game. Game dev có thể reload; bản game đã build cần build lại và tải lại client.');
}
$('save').onclick = () => void run(save);
$('toggle-enabled').onclick = () => void run(async () => {
  if (!town) return;
  const next = town.enabled === false;
  const res = await api<{ id: number; enabled: boolean }>(`/api/maps/${town.id}/enabled`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: next }) });
  town.enabled = res.enabled;
  const item = towns.find(m => m.id === res.id);
  if (item) item.enabled = res.enabled;
  renderMaps(); controls();
  status(res.enabled ? `Đã bật lại bản đồ ${town.name}.` : `Đã tắt bản đồ ${town.name} (ẩn khỏi danh sách map người chơi; ai đang ở đây sẽ được đưa về Biện Kinh).`);
});
$('reload').onclick = async () => { if (town && (!unsaved() || await confirmDraft('Bỏ mọi thay đổi NPC/vùng an toàn/điểm chuyển/sinh quái chưa lưu và mở lại cấu hình đã lưu?'))) void run(() => openTown(town!.id)); };
const MAP_TYPE_LABELS: Record<string, string> = {
  City: 'Thành thị',
  Capital: 'Kinh đô',
  Battlefield: 'Chiến trường',
  Duel: 'Đơn đấu',
  Field: 'Bãi luyện công',
  Cave: 'Hang động',
  Country: 'Thôn trấn',
  Tong: 'Môn phái',
  Others: 'Khác',
};
function renderMaps() {
  const query = field('map-search').value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
  const typeFilter = $<HTMLSelectElement>('map-type-filter').value;
  const matchesType = (m: Town) => typeFilter === 'all'
    ? true
    : typeFilter === 'city'
      ? (m.type === 'City' || m.type === 'Capital' || m.group === 'city')
      : m.type === typeFilter;
  const visible = towns.filter(m => matchesType(m) && `${m.name} ${m.id}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().includes(query));
  const list = $('map-list'); list.replaceChildren();
  for (const group of ['city', 'training'] as const) {
    const items = visible.filter(m => m.group === group).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    if (!items.length) continue;
    const section = document.createElement('section'), head = document.createElement('h3');
    head.textContent = `${group === 'city' ? 'Thành thị' : 'Luyện công & Khác'} (${items.length})`; section.append(head);
    for (const m of items) {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.map = String(m.id); b.dataset.available = String(m.available);
      b.className = 'map-card' + (town?.id === m.id ? ' selected' : ''); b.setAttribute('aria-pressed', String(town?.id === m.id));
      b.disabled = busy || !m.available;
      const image = document.createElement('img'); image.alt = ''; image.loading = 'lazy'; image.width = 84; image.height = 64;
      const base = `/assets/maps/${m.id}/`, version = versions[m.id] ? `?v=${encodeURIComponent(versions[m.id])}` : '';
      image.src = base + 'thumb.webp' + version;
      image.onerror = () => { image.onerror = () => { image.hidden = true; }; image.src = base + 'minimap.webp' + version; };
      const text = document.createElement('span'), name = document.createElement('strong'), hint = document.createElement('small');
      const typeLabel = m.type ? (MAP_TYPE_LABELS[m.type] ?? m.type) : '';
      name.textContent = m.name; hint.textContent = m.available ? `Map ${m.id}${typeLabel ? ` · ${typeLabel}` : ''}${m.enabled === false ? ' · Đã tắt' : ''}` : 'Chưa sinh tài nguyên';
      text.append(name, hint); b.append(image, text);
      b.onclick = async () => {
        if (busy || town?.id === m.id) return;
        if (unsaved() && !await confirmDraft('Bỏ bản nháp chưa lưu để chuyển bản đồ?')) return;
        void run(() => openTown(m.id));
      };
      section.append(b);
    }
    list.append(section);
  }
  if (!visible.length) list.textContent = 'Không tìm thấy bản đồ phù hợp.';
}
field('map-search').oninput = renderMaps;
$<HTMLSelectElement>('map-type-filter').onchange = renderMaps;
window.addEventListener('beforeunload', e => { if (unsaved()) { e.preventDefault(); e.returnValue = ''; } });
let spacePan = false;
const dialogOpen = () => !!document.querySelector('.dlg:not(.hidden)');
window.addEventListener('keydown', e => {
  if (dialogOpen()) { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') e.preventDefault(); return; }
  if (e.isComposing || busy) return;
  const target = e.target as HTMLElement, typing = !!target.closest('input,select,textarea,[contenteditable="true"]');
  const key = e.key.toLowerCase();
  if ((e.ctrlKey || e.metaKey) && key === 's') { e.preventDefault(); if (typing) target.blur(); void run(save); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || drag) return;
  if (key === ' ' && target.closest('button')) return;
  if (key === '?' || key === 'f1') { e.preventDefault(); $('shortcut-help').click(); }
  if (key === 'v') { e.preventDefault(); field('pan').checked = false; setMode('npc'); }
  if (key === 'b') { e.preventDefault(); field('pan').checked = false; setMode('zones'); }
  if (key === 't') { e.preventDefault(); field('pan').checked = false; setMode('portals'); }
  if (key === 'm') { e.preventDefault(); field('pan').checked = false; setMode('spawns'); }
  if (key === 'k') { e.preventDefault(); field('pan').checked = false; setMode('tongkim'); }
  if (key === 'n') { e.preventDefault(); field('pan').checked = false; setMode('nav'); }
  if (key === 'h') { e.preventDefault(); $('pan-tool').click(); }
  if (key === ' ') { e.preventDefault(); spacePan = true; canvas.style.cursor = 'grab'; }
  if (key === 'z') { e.preventDefault(); $('map-view').click(); }
  if (key === '0') { e.preventDefault(); fitMap(); }
  if (key === '+' || key === '=') { e.preventDefault(); $('plus').click(); }
  if (key === '-') { e.preventDefault(); $('minus').click(); }
  if ((key === 'delete' || key === 'backspace') && mode === 'spawns' && town) { e.preventDefault(); if (!e.repeat) spawns.removeSelected(); return; }
  if (key === 'delete' && town) { e.preventDefault(); if (mode === 'npc' && current()) $('remove').click(); if (mode === 'portals' && portals.current()) $('portal-remove').click(); }
});
window.addEventListener('keyup', e => { if (e.key === ' ' && spacePan) { e.preventDefault(); spacePan = false; canvas.style.cursor = ''; } });
window.addEventListener('blur', () => { spacePan = false; canvas.style.cursor = ''; });
const actions: [string, string, string, string, string?, boolean?][] = [
  ['reload', 'open', 'Mở bản lưu', 'Bỏ bản nháp và mở lại cấu hình đã lưu.'],
  ['refresh-maps', 'refresh', 'Làm mới map', 'Cập nhật danh sách, giữ bản nháp.'],
  ['center', 'entry', 'Về điểm vào', 'Di chuyển góc nhìn tới điểm vào map.', '', true],
  ['fit', 'fit', 'Toàn map', 'Về minimap và vừa toàn map.', '0', true],
  ['minus', 'minus', 'Thu nhỏ', 'Thu nhỏ góc nhìn.', '-', true],
  ['plus', 'plus', 'Phóng to', 'Phóng lớn góc nhìn.', '+', true],
  ['pan-tool', 'pan', 'Kéo khung', 'Kéo để di chuyển góc nhìn; giữ Space dùng tạm.', 'H', true],
  ['blocked', 'grid', 'Vùng chặn', 'Bật hoặc tắt lớp phủ vùng không đi được.'],
  ['shortcut-help', 'help', 'Phím tắt', 'Xem phím tắt của công cụ.', '?', true],
  ['add', 'npc', 'Thêm NPC', 'Thêm NPC dịch vụ tại điểm vào.'],
  ['snap', 'entry', 'Căn vị trí', 'Căn NPC về vùng đi được.'],
  ['npc-detail', 'export', 'Xem NPC thật', 'Xem NPC trên map thật để kiểm hướng.'],
  ['remove', 'delete', 'Xóa NPC', 'Xóa NPC đã chọn khỏi bản nháp.', 'Delete'],
  ['zone-new', 'zone', 'Vẽ vùng', 'Bắt đầu đường bao vùng an toàn.'],
  ['zone-close', 'check', 'Khép vùng', 'Nối điểm cuối về điểm đầu.'],
  ['zone-undo', 'undo', 'Lùi điểm', 'Bỏ điểm cuối của nét đang vẽ.'],
  ['zone-cancel', 'cancel', 'Hủy nét', 'Bỏ nét chưa khép.'],
  ['zone-remove-point', 'erase', 'Xóa đỉnh', 'Xóa đỉnh đang chọn, giữ ít nhất3đỉnh.'],
  ['zone-delete', 'delete', 'Xóa vùng', 'Xóa vùng khỏi bản nháp, cần lưu để áp dụng.'],
  ['zone-reset', 'reset', 'An toàn toàn map', 'Khôi phục bảo vệ toàn map; cần lưu.'],
  ['portal-add', 'portal', 'Thêm điểm', 'Thêm điểm chuyển tới map khác.'],
  ['portal-entry', 'entry', 'Dùng điểm vào', 'Dùng điểm vào đi được của map đích.'],
  ['portal-remove', 'delete', 'Xóa điểm', 'Xóa điểm chuyển khỏi bản nháp.', 'Delete'],
];
for (const [id, icon, label, hint, key, compact] of actions) labelAction($(id), icon, label, hint, key, compact);
for (const [name, icon, label, hint, key] of [['spawns', 'npc', 'Quái / Boss Xanh', 'Bấm map để tạo điểm sinh, bấm điểm để chọn, kéo để di chuyển.', 'M'], ['npc', 'npc', 'Đặt NPC', 'Đặt, kéo và xoay NPC dịch vụ.', 'V'], ['zones', 'zone', 'Vùng an toàn', 'Vẽ đường bao bằng Pen.', 'B'], ['portals', 'portal', 'Điểm chuyển map', 'Đặt lối đi tới map khác.', 'T'], ['tongkim', 'zone', 'Tống Kim', 'Cấu hình điểm tập trung, cổng ra/vào, Nguyên Soái & lính Tống Kim.', 'K'], ['nav', 'grid', 'Sửa vùng chặn', 'Tẩy vùng chặn bị sai hoặc vẽ chặn thêm.', 'N']]) { const button = document.querySelector<HTMLElement>(`[data-mode="${name}"]`)!; labelAction(button, icon, label, hint, key, true); const badge = document.createElement('span'); badge.className = 'tool-key'; badge.textContent = key; badge.setAttribute('aria-hidden', 'true'); button.append(badge); }
let helpFocus: HTMLElement | null = null;
dialogs.register('shortcuts-dialog', { onClose: () => helpFocus?.focus() });
$('shortcut-help').onclick = () => { helpFocus = document.activeElement as HTMLElement; dialogs.open('shortcuts-dialog'); $('close-shortcuts').focus(); };
$('close-shortcuts').onclick = () => dialogs.close('shortcuts-dialog');
$('shortcuts-dialog').addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const close = $('shortcuts-dialog').querySelector<HTMLElement>('.dlg-x')!; (document.activeElement === close ? $('close-shortcuts') : close).focus(); } });
const tip = $('action-tooltip');
function hideTip() { tip.hidden = true; document.querySelectorAll('[aria-describedby="action-tooltip"]').forEach(el => el.removeAttribute('aria-describedby')); }
function showTip(e: Event) {
  const button = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]'); if (!button || button.matches(':disabled') || dialogOpen()) return;
  hideTip(); tip.textContent = button.dataset.tip!; tip.hidden = false; button.setAttribute('aria-describedby', tip.id);
  const r = button.getBoundingClientRect(), t = tip.getBoundingClientRect(); tip.style.left = `${Math.max(8, Math.min(innerWidth - t.width - 8, r.left))}px`; tip.style.top = `${r.bottom + t.height + 12 > innerHeight ? Math.max(8, r.top - t.height - 8) : r.bottom + 8}px`;
}
document.addEventListener('pointerover', showTip); document.addEventListener('focusin', showTip); document.addEventListener('pointerout', hideTip); document.addEventListener('focusout', hideTip); document.addEventListener('pointerdown', hideTip); document.addEventListener('keydown', hideTip); window.addEventListener('scroll', hideTip, true); window.addEventListener('resize', hideTip);
void run(async () => {
  const [b, l] = await Promise.all([api<{ maps: Town[]; templates: Template[]; monsters: SpawnMonster[]; versions: Record<string, string> }>('/api/bootstrap'), api<Look[]>('/api/looks')]);
  spawns.setup(b.monsters);
  towns = b.maps; templates = b.templates; versions = b.versions; looks = l;
  renderMaps();
  templates.forEach((t, i) => $<HTMLSelectElement>('template').add(new Option(t.name, String(i))));
  Object.entries(NPC_ACTION_LABELS).forEach(([key, name]) => $<HTMLSelectElement>('action').add(new Option(name, key)));
  looks.forEach(l => { const o = new Option(`${l.label}${l.available ? '' : ' · Thiếu hình'}`, l.res); $<HTMLSelectElement>('res').add(o); });
  status(towns.length ? 'Chọn map ở sidebar. Dùng V để cài NPC, B khoanh vùng an toàn, T đặt điểm chuyển, M đặt quái/Boss Xanh.' : 'Chưa có bản đồ. Hãy sinh tài nguyên map trước.');
});

async function refreshMapList() {
  const b = await api<{ maps: Town[]; versions: Record<string, string> }>('/api/bootstrap');
  towns = b.maps; versions = b.versions; renderMaps();
}
$('refresh-maps').onclick = () => void run(refreshMapList);
window.addEventListener('focus', () => { if (!busy) void refreshMapList().catch(() => {}); });
setInterval(() => { if (!busy && !document.hidden) void refreshMapList().catch(() => {}); }, 10000);

window.addEventListener('manager:reload', e => { if (unsaved() || busy || drag || dialogOpen()) { e.preventDefault(); status('Code đã thay đổi. Lưu hoặc bỏ bản nháp, đóng hộp thoại để trang tự nạp lại.'); } });
