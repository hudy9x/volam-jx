import { dialogs } from '../../../apps/client/src/ui/kit/dialog.js';
import { navigationMask, validateProject, CELL_W, CELL_H, type Project, type Asset, type WorldObject } from '../model.js';
import type { CustomMap } from '../../../packages/shared/src/maps/registry.js';
import './main.css';
import { MapPreview } from './Preview.js';
import { tools, labelAction } from './actions.js';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => $<HTMLInputElement>(id);
const canvas = $<HTMLCanvasElement>('canvas'), ctx = canvas.getContext('2d')!;
let project: Project | null = null, selected = '', chosenAsset = '', mode = 'select';
let dirty = false, busy = false, zoom = 1, panX = 0, panY = 0;
let play: MapPreview | null = null, previewFrame = 0;
let editCamera = { zoom: 1, panX: 0, panY: 0 };
let publication: { map: CustomMap | null; revision: string } | null = null;
let publicationConfirm: ((value: boolean) => void) | null = null;
let publicationFocus: HTMLElement | null = null;
dialogs.register('publication-confirm', { onClose: () => { $('publication-backdrop').hidden = true; const done = publicationConfirm; publicationConfirm = null; done?.(false); publicationFocus?.focus(); } });
$('publication-confirm').addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const buttons = Array.from($('publication-confirm').querySelectorAll<HTMLButtonElement>('button'));
  if (e.shiftKey && document.activeElement === buttons[0]) { e.preventDefault(); buttons[buttons.length - 1].focus(); }
  else if (!e.shiftKey && document.activeElement === buttons[buttons.length - 1]) { e.preventDefault(); buttons[0].focus(); }
});
$('publication-no').onclick = () => dialogs.close('publication-confirm');
$('publication-yes').onclick = () => { const done = publicationConfirm; publicationConfirm = null; dialogs.close('publication-confirm'); done?.(true); };
function confirmPublication(text: string, accept = 'Xác nhận', title = 'Map trong game'): Promise<boolean> {
  $('publication-yes').textContent = accept; $('publication-confirm').setAttribute('aria-label', title); $('publication-confirm').querySelector('.dlg-title')!.textContent = title;
  publicationFocus = document.activeElement as HTMLElement; $('publication-message').textContent = text; $('publication-backdrop').hidden = false; dialogs.open('publication-confirm'); $('publication-no').focus();
  return new Promise(resolve => { publicationConfirm = resolve; });
}
let history: string[] = [], future: string[] = [];
const images = new Map<string, HTMLImageElement>();
let mask: Uint8Array = new Uint8Array(0), painted = new Set<number>();
const assetUrl = (a: string) => `/api/projects/${project!.id}/assets/${a}`;
const selectedObject = () => project?.objects.find(o => o.id === selected);
const status = (text: string, error = false) => { $('status').textContent = text; $('status').classList.toggle('error', error); };
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options), data = await res.json();
  if (!res.ok) throw Error(data.error ?? 'Yêu cầu thất bại.'); return data;
}
async function run(task: () => Promise<void>) {
  if (busy) return;
  busy = true; controls();
  try { await task(); } catch (e) { status((e as Error).message, true); }
  finally { busy = false; controls(); }
}
function controls() {
  for (const id of ['save', 'export', 'reload', 'backup']) $<HTMLButtonElement>(id).disabled = !project || busy || !!play;
  $<HTMLButtonElement>('toggle-map').disabled = !project || !publication || dirty || busy || !!play;
  const enabled = !!publication?.map?.enabled;
  $('toggle-map').classList.toggle('is-map-open', enabled);
  labelAction($('toggle-map'), 'pulse', enabled ? 'Đóng map' : 'Mở map', enabled ? 'Ngừng cho vào map; người chơi được về Biện Kinh. Giữ thiết kế.' : 'Đưa bản đã lưu vào game và Map Manager.');
  $<HTMLSelectElement>('map-type').disabled = !project || busy || enabled || !!play;
  $('publication-state').textContent = !publication?.map ? 'Chưa mở' : `${enabled ? 'Đang mở' : 'Đã đóng'} · Thiết kế bản ${publication.map.projectRevision}`;
  $('publication-state').classList.toggle('is-open', enabled);
  $('publication-hint').textContent = !project ? 'Chọn map để thiết lập.' : dirty ? 'Có thay đổi chưa lưu. Lưu thiết kế trước khi mở hoặc đóng map.' : project && publication?.map && publication.map.projectRevision !== project.revision ? 'Có thiết kế mới. Đóng rồi mở map để áp dụng bản đã lưu.' : enabled ? 'Người chơi vào được qua Xa phu. Đóng map sẽ đưa họ về Biện Kinh.' : 'Mở map để người chơi vào được. Lưu thiết kế không tự mở map.';
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-mode]')) b.disabled = !project?.ground || busy || !!play;
  $('brush-control').hidden = !!play || mode !== 'block' && mode !== 'erase';
  $<HTMLButtonElement>('new').disabled = busy || !!play;
  input('map-name').disabled = !project || busy || !!play;
  $<HTMLButtonElement>('map-settings').disabled = !project || busy || !!play;
  $<HTMLButtonElement>('try-map').disabled = !project?.ground || busy;
  labelAction($('try-map'), play ? 'disable' : 'enable', play ? 'Dừng thử' : 'Chơi thử', 'Nhân vật và quái dùng hình gốc, không lưu spawn.');
  $('preview-home').hidden = $('preview-zoom').hidden = !play;
  $('try-map').setAttribute('aria-pressed', String(!!play));
  document.querySelector<HTMLElement>('.tool-context')!.hidden = !!play;
  document.querySelector<HTMLElement>('.editor>.hint')!.hidden = !!play;
  input('grid').disabled = input('collision').disabled = !!play;
  $<HTMLSelectElement>('projects').disabled = busy || !!play;
  $<HTMLFieldSetElement>('resources').disabled = !project || busy || !!play;
  $<HTMLFieldSetElement>('map-fields').disabled = !project || busy || !!play;
  $<HTMLFieldSetElement>('object-fields').disabled = !selectedObject() || busy || !!play;
  $('stage').style.pointerEvents = busy ? 'none' : '';
  $('state').textContent = project ? `#${project.id} · ${dirty ? 'Chưa lưu' : `Đã lưu · bản ${project.revision}`}${busy ? ' · Đang xử lý…' : ''}` : 'Chưa mở map';
  $<HTMLButtonElement>('undo').disabled = !history.length || busy || !!play;
  $<HTMLButtonElement>('redo').disabled = !future.length || busy || !!play;
}
function checkpoint() { if (!project) return; history.push(JSON.stringify(project)); if (history.length > 50) history.shift(); future = []; }
function changed() {
  if (!project) return;
  dirty = true; painted = new Set(project.blocked); mask = navigationMask(project);
  $('preview').hidden = true; controls(); draw();
}
function setMode(next: string) {
  mode = next;
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
  const tool = tools.find(t => t.mode === mode)!;
  $('active-tool').textContent = `${tool.label} · ${tool.key}`; $('tool-hint').textContent = tool.hint;
  $('brush-control').hidden = !!play || mode !== 'block' && mode !== 'erase';
  canvas.style.cursor = mode === 'pan' ? 'grab' : mode === 'select' ? 'default' : 'crosshair';
}
async function projectList() {
  const list = await api<{ id: number; name: string }[]>('/api/projects');
  const select = $<HTMLSelectElement>('projects'); select.replaceChildren(new Option('Chọn map…', ''));
  list.forEach(p => select.add(new Option(`${p.name} · #${p.id}`, String(p.id))));
  select.value = project ? String(project.id) : '';
}
async function loadImages() {
  if (!project) return;
  const assets = [...project.assets, ...(project.ground ? [project.ground] : [])];
  await Promise.all(assets.map(async a => {
    if (images.has(a.id)) return;
    const image = new Image(); image.src = assetUrl(a.id); await image.decode(); images.set(a.id, image);
  }));
}
async function openProject(id: number) {
  const p = await api<Project>(`/api/projects/${id}`);
  publication = await api(`/api/projects/${id}/publication`);
  input('map-type').value = publication?.map?.type ?? 'Field';
  project = p; selected = ''; chosenAsset = ''; history = []; future = []; images.clear(); dirty = false;
  await loadImages(); painted = new Set(p.blocked); mask = navigationMask(p); render(); fit();
  status(`Đã mở ${p.name}.`);
}
function render() {
  $('empty').hidden = !!project;
  $('stage-empty').hidden = !!project?.ground;
  $('dimensions').textContent = project ? `${project.width} × ${project.height} px · ${project.objects.length} vật thể` : 'Chưa có map';
  $('object-count').textContent = String(project?.objects.length ?? 0);
  input('map-name').value = project?.name ?? '';
  input('entry-x').value = String(project?.entry.x ?? 0); input('entry-y').value = String(project?.entry.y ?? 0);
  $('ground-info').textContent = project?.ground ? `${project.ground.name} · ${project.width}×${project.height}` : 'Chưa có ảnh nền';
  renderLists(); inspector(); controls(); draw();
}
function renderLists() {
  const query = input('search').value.toLocaleLowerCase('vi');
  $('assets').replaceChildren(...(project?.assets ?? []).filter(a => a.name.toLocaleLowerCase('vi').includes(query)).map(a => {
    const b = document.createElement('button'); b.className = `asset${chosenAsset === a.id ? ' selected' : ''}`;
    const img = document.createElement('img'); img.src = assetUrl(a.id); img.alt = '';
    const text = document.createElement('span'); text.textContent = `${a.name} (${a.width}×${a.height})`;
    b.append(img, text); b.setAttribute('aria-pressed', String(chosenAsset === a.id));
    b.onclick = () => { chosenAsset = a.id; setMode('place'); renderLists(); status(`Click map để đặt ${a.name}. Có thể đặt nhiều lần.`); };
    return b;
  }));
  const oq = input('object-search').value.toLocaleLowerCase('vi');
  $('objects').replaceChildren(...(project?.objects ?? []).filter(o => o.name.toLocaleLowerCase('vi').includes(oq)).map(o => {
    const b = document.createElement('button'); b.textContent = o.name; b.className = o.id === selected ? 'selected' : '';
    b.onclick = () => { selected = o.id; setMode('select'); inspector(); renderLists(); draw(); controls(); }; return b;
  }));
  if (project && !project.assets.length) $('assets').textContent = 'Chưa có ảnh vật thể.';
  if (project && !project.objects.length) $('objects').textContent = 'Chưa đặt vật thể.';
}
function inspector() {
  const o = selectedObject(); $('selection-empty').hidden = !!o; $('object-fields').hidden = !o;
  $<HTMLFieldSetElement>('object-fields').disabled = !o || busy;
  input('object-name').value = o?.name ?? '';
  document.querySelectorAll<HTMLInputElement>('[data-prop]').forEach(el => { el.value = String(o?.[el.dataset.prop as 'x'] ?? ''); });
  document.querySelectorAll<HTMLInputElement>('[data-collider]').forEach(el => { el.value = String(o?.collider[el.dataset.collider as 'rx'] ?? ''); });
  input('collider-enabled').checked = o?.collider.enabled ?? false;
}
function mutate(change: () => void) {
  if (!project || busy) return;
  const before = JSON.stringify(project);
  change();
  try { validateProject(project); } catch (e) { project = JSON.parse(before); inspector(); render(); status((e as Error).message, true); return; }
  history.push(before); if (history.length > 50) history.shift(); future = [];
  changed(); render();
}
function fit() {
  if (!project) return;
  const r = canvas.getBoundingClientRect(); zoom = Math.min((r.width - 40) / project.width, (r.height - 40) / project.height);
  panX = (r.width - project.width * zoom) / 2; panY = (r.height - project.height * zoom) / 2; draw();
}
function zoomAt(factor: number, x: number, y: number) {
  const next = Math.max(.025, Math.min(4, zoom * factor)); panX = x - (x - panX) * next / zoom; panY = y - (y - panY) * next / zoom; zoom = next; draw();
}
function worldPoint(e: PointerEvent | WheelEvent) {
  const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left - panX) / zoom, y: (e.clientY - r.top - panY) / zoom };
}
function draw() {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) { canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
  $('zoom').textContent = `${Math.round(zoom * 100)}%`;
  if (!project) return;
  ctx.translate(panX, panY); ctx.scale(zoom, zoom);
  ctx.fillStyle = '#202621'; ctx.fillRect(0, 0, project.width, project.height);
  if (project.ground && images.has(project.ground.id)) ctx.drawImage(images.get(project.ground.id)!, 0, 0);
  const layers = project.objects.map(o => ({ depth: o.y + o.depthOffset, draw: () => { const image = images.get(o.asset); if (image) ctx.drawImage(image, o.x - o.anchorX * o.scale, o.y - o.anchorY * o.scale, image.width * o.scale, image.height * o.scale); } }));
  for (const actor of play?.actors ?? []) layers.push({ depth: actor.y, draw: () => play!.draw(ctx, actor, zoom) });
  for (const layer of layers.sort((a, b) => a.depth - b.depth)) layer.draw();
  const cols = project.width / CELL_W;
  if (!play && input('collision').checked) {
    ctx.fillStyle = 'rgba(242,100,80,.32)';
    for (let i = 0; i < mask.length; i++) if (mask[i]) ctx.fillRect(i % cols * CELL_W, Math.floor(i / cols) * CELL_H, CELL_W, CELL_H);
  }
  if (!play && input('grid').checked) {
    const stepX = zoom < .2 ? 512 : zoom < .5 ? 128 : CELL_W, stepY = zoom < .2 ? 512 : zoom < .5 ? 64 : CELL_H;
    ctx.beginPath(); ctx.strokeStyle = '#b9d8bf40'; ctx.lineWidth = 1 / zoom;
    for (let x = 0; x <= project.width; x += stepX) { ctx.moveTo(x, 0); ctx.lineTo(x, project.height); }
    for (let y = 0; y <= project.height; y += stepY) { ctx.moveTo(0, y); ctx.lineTo(project.width, y); } ctx.stroke();
  }
  const o = selectedObject();
  if (o && !play) {
    const a = project.assets.find(a => a.id === o.asset)!;
    ctx.strokeStyle = '#b9d8bf'; ctx.lineWidth = 2 / zoom;
    ctx.strokeRect(o.x - o.anchorX * o.scale, o.y - o.anchorY * o.scale, a.width * o.scale, a.height * o.scale);
    ctx.beginPath(); ctx.moveTo(o.x - 8 / zoom, o.y); ctx.lineTo(o.x + 8 / zoom, o.y); ctx.moveTo(o.x, o.y - 8 / zoom); ctx.lineTo(o.x, o.y + 8 / zoom); ctx.stroke();
    if (o.collider.enabled) { const c = o.collider; ctx.beginPath(); ctx.ellipse(o.x + c.ox * o.scale, o.y + c.oy * o.scale, c.rx * o.scale, c.ry * o.scale, 0, 0, Math.PI * 2); ctx.strokeStyle = '#f2ad9b'; ctx.stroke(); }
  }
  if (play) return;
  const e = project.entry;
  ctx.beginPath(); ctx.arc(e.x, e.y, 6 / zoom, 0, Math.PI * 2); ctx.fillStyle = '#b9d8bf'; ctx.fill(); ctx.strokeStyle = '#142318'; ctx.lineWidth = 2 / zoom; ctx.stroke();
  ctx.font = `${12 / zoom}px system-ui`; ctx.fillStyle = '#e6e9e6'; ctx.fillText('Điểm vào', e.x + 10 / zoom, e.y - 8 / zoom);
}
let drag: { pointer: number; x: number; y: number; panX: number; panY: number; object?: WorldObject; ox: number; oy: number; type: string } | null = null;
function paint(x: number, y: number) {
  if (!project) return;
  const cols = project.width / CELL_W, rows = project.height / CELL_H, radius = Math.max(0, Math.min(11, Number(input('brush').value) - 1));
  const cx = Math.floor(x / CELL_W), cy = Math.floor(y / CELL_H);
  for (let yy = cy - radius; yy <= cy + radius; yy++) for (let xx = cx - radius; xx <= cx + radius; xx++) {
    if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
    if (mode === 'block') painted.add(yy * cols + xx); else painted.delete(yy * cols + xx);
  }
  project.blocked = [...painted]; $('preview').hidden = true; dirty = true; mask = navigationMask(project); controls(); draw();
}
canvas.addEventListener('pointerdown', e => {
  if (!project || busy || drag) return;
  canvas.focus(); const p = worldPoint(e); const inside = p.x >= 0 && p.y >= 0 && p.x < project.width && p.y < project.height;
  if (e.button === 1 || mode === 'pan' || spacePan) {
    e.preventDefault(); drag = { pointer: e.pointerId, x: e.clientX, y: e.clientY, panX, panY, ox: 0, oy: 0, type: 'pan' };
  } else if (e.button === 0 && inside) {
    if (play) { e.preventDefault(); if (!play.move(p)) status('Vị trí bị chặn hoặc không có đường đi.', true); return; }
    if (mode === 'place') {
      const a = project.assets.find(a => a.id === chosenAsset);
      if (!a) { status('Chọn một ảnh vật thể trong thư viện trước.', true); return; }
      mutate(() => { const o: WorldObject = { id: crypto.randomUUID(), asset: a.id, name: a.name, x: Math.round(p.x), y: Math.round(p.y), scale: 1, anchorX: a.width / 2, anchorY: a.height, depthOffset: 0, collider: { enabled: false, rx: 24, ry: 12, ox: 0, oy: 0 } }; project!.objects.push(o); selected = o.id; }); return;
    }
    if (mode === 'entry') { mutate(() => { project!.entry = { x: Math.floor(p.x), y: Math.floor(p.y) }; }); return; }
    if (mode === 'block' || mode === 'erase') {
      checkpoint(); drag = { pointer: e.pointerId, x: p.x, y: p.y, panX, panY, ox: 0, oy: 0, type: 'paint' }; paint(p.x, p.y);
    } else {
      const o = [...project.objects].sort((a, b) => b.y + b.depthOffset - a.y - a.depthOffset).find(o => {
        const a = project!.assets.find(a => a.id === o.asset)!;
        return p.x >= o.x - o.anchorX * o.scale && p.y >= o.y - o.anchorY * o.scale && p.x <= o.x + (a.width - o.anchorX) * o.scale && p.y <= o.y + (a.height - o.anchorY) * o.scale;
      });
      selected = o?.id ?? ''; inspector(); renderLists(); controls(); draw();
      if (!o) return;
      checkpoint(); drag = { pointer: e.pointerId, x: p.x, y: p.y, panX, panY, object: o, ox: o.x, oy: o.y, type: 'object' };
    }
  }
  if (drag) canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  const p = worldPoint(e); $('coords').textContent = `X: ${Math.round(p.x)} · Y: ${Math.round(p.y)}`;
  if (!drag || drag.pointer !== e.pointerId || !project) return;
  if (drag.type === 'pan') { panX = drag.panX + e.clientX - drag.x; panY = drag.panY + e.clientY - drag.y; draw(); }
  else if (drag.type === 'paint') {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(p.x - drag.x) / CELL_W, Math.abs(p.y - drag.y) / CELL_H)));
    for (let i = 1; i <= n; i++) paint(drag.x + (p.x - drag.x) * i / n, drag.y + (p.y - drag.y) * i / n);
    drag.x = p.x; drag.y = p.y;
  } else if (drag.object) {
    drag.object.x = Math.max(0, Math.min(project.width - 1, Math.round(drag.ox + p.x - drag.x)));
    drag.object.y = Math.max(0, Math.min(project.height - 1, Math.round(drag.oy + p.y - drag.y)));
    changed(); inspector();
  }
});
function endDrag(e: PointerEvent) { if (drag?.pointer === e.pointerId) { drag = null; if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId); render(); } }
canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', e => { e.preventDefault(); const r = canvas.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY * .0015), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
new ResizeObserver(() => { if (play) centerPlayer(); draw(); }).observe($('stage'));
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b => b.onclick = () => setMode(b.dataset.mode!));
$('fit').onclick = fit;
$('zoom-in').onclick = () => zoomAt(1.25, canvas.clientWidth / 2, canvas.clientHeight / 2);
$('zoom-out').onclick = () => zoomAt(.8, canvas.clientWidth / 2, canvas.clientHeight / 2);
input('grid').onchange = draw; input('collision').onchange = draw;
input('search').oninput = renderLists; input('object-search').oninput = renderLists;
function restore(from: string[], to: string[]) {
  if (!project || !from.length || busy) return;
  const rev = project.revision; to.push(JSON.stringify(project)); project = JSON.parse(from.pop()!); project!.revision = rev;
  if (!project!.objects.some(o => o.id === selected)) selected = '';
  void run(async () => { await loadImages(); changed(); render(); });
}
$('undo').onclick = () => restore(history, future); $('redo').onclick = () => restore(future, history);
input('map-name').onchange = () => mutate(() => { project!.name = input('map-name').value; });
for (const axis of ['x', 'y'] as const) input(`entry-${axis}`).onchange = () => mutate(() => { project!.entry[axis] = Number(input(`entry-${axis}`).value); });
input('object-name').onchange = () => mutate(() => { selectedObject()!.name = input('object-name').value; });
document.querySelectorAll<HTMLInputElement>('[data-prop]').forEach(el => el.onchange = () => mutate(() => { (selectedObject()![el.dataset.prop as 'x'] as number) = Number(el.value); }));
document.querySelectorAll<HTMLInputElement>('[data-collider]').forEach(el => el.onchange = () => mutate(() => { selectedObject()!.collider[el.dataset.collider as 'rx'] = Number(el.value); }));
input('collider-enabled').onchange = () => mutate(() => { selectedObject()!.collider.enabled = input('collider-enabled').checked; });
$('duplicate').onclick = () => mutate(() => { const o = structuredClone(selectedObject()!); o.id = crypto.randomUUID(); o.x = Math.min(project!.width - 1, o.x + 32); o.y = Math.min(project!.height - 1, o.y + 16); project!.objects.push(o); selected = o.id; });
$('delete').onclick = () => mutate(() => { project!.objects = project!.objects.filter(o => o.id !== selected); selected = ''; });
async function save() {
  if (!project) return;
  validateProject(project);
  project = await api<Project>(`/api/projects/${project.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(project) });
  dirty = false; await projectList(); controls(); status(`Đã lưu ${project.name} · bản ${project.revision}.`);
}
$('save').onclick = () => void run(save);
$('toggle-map').onclick = async () => {
  if (!project || !publication || busy || dirty) return;
  const enabled = !publication.map?.enabled;
  if (!await confirmPublication(enabled ? `Mở “${project.name}” cho người chơi? Thiết kế đã lưu sẽ được đưa vào game và Map Manager.` : `Đóng “${project.name}”? Người chơi trong map sẽ về Biện Kinh. Thiết kế và ảnh nguồn vẫn được giữ.`, enabled ? 'Mở map' : 'Đóng map')) return;
  void run(async () => {
    status(enabled ? 'Đang chuẩn bị mở map…' : 'Đang đóng map…');
    publication = await api(`/api/projects/${project!.id}/publication`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled, projectRevision: project!.revision, revision: publication!.revision, type: input('map-type').value }) });
    status(enabled ? 'Đã mở map. Người chơi vào được qua Xa phu; Map Manager đã nhận map.' : 'Đã đóng map. Người chơi được về Biện Kinh; thiết kế được giữ nguyên.');
  });
};
$('export').onclick = () => void run(async () => {
  await save(); status('Đang tạo ảnh xem trước từ thiết kế…');
  const r = await api<{ build: string; preview: string }>(`/api/projects/${project!.id}/export`, { method: 'POST' });
  const a = $<HTMLAnchorElement>('preview'); a.href = r.preview; a.hidden = false;
  status(`Đã tạo ảnh xem trước. Bấm Mở ảnh xem trước ở cột thuộc tính. Trạng thái trong game không thay đổi.`);
});
$('backup').onclick = () => {
  if (!project) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `map-${project.id}-project.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
$('reload').onclick = async () => { if (project && (!dirty || await confirmPublication('Bỏ thay đổi chưa lưu và mở lại thiết kế đã lưu?', 'Bỏ thay đổi', 'Mở bản lưu'))) void run(() => openProject(project!.id)); };
$<HTMLSelectElement>('projects').onchange = async e => {
  const select = e.target as HTMLSelectElement, id = Number(select.value);
  if (!id || dirty && !await confirmPublication('Bỏ thay đổi chưa lưu để mở map khác?', 'Bỏ thay đổi', 'Đổi map')) { select.value = String(project?.id ?? ''); return; }
  void run(() => openProject(id));
};
dialogs.register('create-dialog', { onClose: () => $('new').focus() });
$('create-dialog').addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const elements = Array.from($('create-dialog').querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'));
  const first = elements[0], last = elements[elements.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});
$('pick-ground').onclick = () => input('ground').click();
$('pick-world').onclick = () => input('world').click();
$('new').onclick = () => { dialogs.open('create-dialog'); input('new-name').focus(); };
$('cancel-create').onclick = () => { dialogs.close('create-dialog'); $('new').focus(); };
$('create').onclick = () => void run(async () => {
  $('create-error').textContent = '';
  try {
    if (dirty && !await confirmPublication('Bỏ thay đổi chưa lưu để tạo map mới?', 'Bỏ thay đổi', 'Tạo map mới')) return;
    const p = await api<Project>('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: Number(input('new-id').value), name: input('new-name').value.trim() }) });
    await openProject(p.id); await projectList(); dialogs.close('create-dialog'); $('new').focus();
  } catch (e) { $('create-error').textContent = (e as Error).message; }
});
async function upload(files: FileList | null, ground: boolean) {
  if (!project || !files?.length) return;
  if (ground && (project.objects.length || project.blocked.length) && !await confirmPublication('Thay nền sẽ xóa vật thể đã đặt và vùng tô chặn. Ảnh trong thư viện vẫn được giữ. Có thể hoàn tác trước khi lưu.', 'Thay nền', 'Thay ảnh nền')) return;
  checkpoint();
  try {
    for (const file of Array.from(files)) {
      status(`Đang tải ${file.name}…`);
      const a = await api<Asset>(`/api/projects/${project.id}/assets?name=${encodeURIComponent(file.name)}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: file });
      if (ground) {
        if (a.width % CELL_W || a.height % CELL_H) throw Error('Ảnh nền rộng phải chia hết cho 32, cao chia hết cho 16. Hãy chỉnh kích thước ảnh và thêm lại.');
        project.ground = a; project.width = a.width; project.height = a.height; project.entry = { x: a.width / 2, y: a.height / 2 }; project.objects = []; project.blocked = []; selected = '';
      } else if (!project.assets.some(x => x.id === a.id)) { if (project.assets.length >= 300) throw Error('Thư viện tối đa 300 ảnh.'); project.assets.push(a); chosenAsset = a.id; }
      changed();
    }
  } finally { await loadImages(); render(); if (ground) fit(); }
  status(ground ? 'Đã thêm ảnh nền. Đặt điểm vào và vật thể, rồi lưu thiết kế.' : 'Đã thêm ảnh vật thể. Chọn ảnh rồi click map để đặt.');
}
input('ground').onchange = () => void run(async () => { try { await upload(input('ground').files, true); } finally { input('ground').value = ''; } });
input('world').onchange = () => void run(async () => { try { await upload(input('world').files, false); } finally { input('world').value = ''; } });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
let spacePan = false;
const dialogOpen = () => !!document.querySelector('.dlg:not(.hidden)');
window.addEventListener('keydown', e => {
  if (dialogOpen() || e.isComposing) return;
  if (play) {
    if (e.key === 'Escape') { e.preventDefault(); stopPreview(); }
    if ((e.ctrlKey || e.metaKey) && ['s', 'z', 'd'].includes(e.key.toLowerCase())) e.preventDefault();
    if (e.key === '+' || e.key === '=') $('zoom-in').click();
    if (e.key === '-') $('zoom-out').click();
    return;
  }
  const target = e.target as HTMLElement;
  const typing = !!target.closest('input,textarea,select,[contenteditable="true"]');
  const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase();
  if (mod && key === 's') { e.preventDefault(); if (project && !busy) { if (typing) target.blur(); void run(save); } return; }
  if (typing || busy || drag) return;
  if (mod) {
    if (key === 'z') { e.preventDefault(); if (e.shiftKey) restore(future, history); else restore(history, future); }
    if (key === 'd' && selected) { e.preventDefault(); $('duplicate').click(); }
    return;
  }
  if (e.altKey) return;
  if (key === '?' || key === 'f1') { e.preventDefault(); $('shortcut-help').click(); return; }
  if (!project?.ground) return;
  if (key === ' ') { e.preventDefault(); spacePan = true; canvas.style.cursor = 'grab'; return; }
  const tool = tools.find(t => t.key.toLowerCase() === key);
  if (tool) { e.preventDefault(); setMode(tool.mode); return; }
  if (key === '0') { e.preventDefault(); fit(); }
  if (key === '+' || key === '=') { e.preventDefault(); $('zoom-in').click(); }
  if (key === '-') { e.preventDefault(); $('zoom-out').click(); }
  if ((key === '[' || key === ']') && (mode === 'block' || mode === 'erase')) {
    e.preventDefault(); input('brush').value = String(Math.max(1, Math.min(12, Number(input('brush').value) + (key === ']' ? 1 : -1))));
  }
  if ((key === 'delete' || key === 'backspace') && selected) { e.preventDefault(); $('delete').click(); }
});
function releasePan() { spacePan = false; setMode(mode); }
window.addEventListener('keyup', e => { if (e.key === ' ' && spacePan) { e.preventDefault(); releasePan(); } });
window.addEventListener('blur', releasePan);

// All actions keep text for assistive technology; compact tools expose descriptions on focus and hover.
for (const tool of tools) {
  const button = document.querySelector<HTMLElement>(`[data-mode="${tool.mode}"]`)!;
  labelAction(button, tool.mode, tool.label, tool.hint, tool.key, true);
  const key = document.createElement('span'); key.className = 'tool-key'; key.textContent = tool.key; key.setAttribute('aria-hidden', 'true'); button.append(key);
}
const actionLabels: [string, string, string, string, string?, boolean?][] = [
  ['new', 'new', 'Tạo map', 'Bắt đầu một thiết kế mới.'],
  ['save', 'save', 'Lưu thiết kế', 'Lưu thay đổi để sửa tiếp; không cập nhật map trong game.', 'Ctrl/Cmd+S'],
  ['reload', 'open', 'Mở bản lưu', 'Bỏ bản nháp và mở lại thiết kế đã lưu.'],
  ['backup', 'backup', 'Tải thiết kế JSON', 'Tải bố cục dự phòng; không kèm ảnh nguồn.'],
  ['export', 'export', 'Tạo ảnh xem trước', 'Lưu thiết kế và tạo bộ xuất để xem; không mở map trong game.'],
  ['pick-ground', 'upload', 'Thêm nền', 'Thêm ảnh đất, cỏ và đường đi.'],
  ['pick-world', 'place', 'Thêm ảnh', 'Thêm ảnh cây, đá hoặc công trình có nền trong suốt.'],
  ['undo', 'undo', 'Hoàn tác', 'Bỏ thao tác chỉnh sửa gần nhất.', 'Ctrl/Cmd+Z', true],
  ['redo', 'redo', 'Làm lại', 'Áp lại thao tác vừa hoàn tác.', 'Ctrl/Cmd+Shift+Z', true],
  ['fit', 'fit', 'Vừa khung', 'Xem toàn bộ map.', '0', true],
  ['zoom-out', 'minus', 'Thu nhỏ', 'Thu nhỏ tại giữa khung.', '-', true],
  ['zoom-in', 'plus', 'Phóng to', 'Phóng to tại giữa khung.', '+', true],
  ['duplicate', 'duplicate', 'Nhân bản', 'Tạo bản sao vật thể đang chọn.', 'Ctrl/Cmd+D'],
  ['delete', 'delete', 'Xóa vật thể', 'Xóa vật thể đang chọn; có thể hoàn tác.', 'Delete'],
  ['shortcut-help', 'help', 'Phím tắt', 'Xem thao tác chuột và bàn phím.', '?', true],
  ['map-settings', 'settings', 'Thuộc tính map', 'Chỉnh điểm vào của map.', '', true],
];
for (const [id, name, label, hint, key, compact] of actionLabels) labelAction($(id), name, label, hint, key, compact);
let settingsFocus: HTMLElement | null = null;
dialogs.register('map-settings-dialog', { onClose: () => settingsFocus?.focus() });
$('map-settings').onclick = () => { settingsFocus = document.activeElement as HTMLElement; dialogs.open('map-settings-dialog'); input('entry-x').focus(); };
$('close-map-settings').onclick = () => dialogs.close('map-settings-dialog');
$('map-settings-dialog').addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const els = Array.from($('map-settings-dialog').querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)'));
  if (e.shiftKey && document.activeElement === els[0]) { e.preventDefault(); els.at(-1)!.focus(); }
  else if (!e.shiftKey && document.activeElement === els.at(-1)) { e.preventDefault(); els[0].focus(); }
});
function centerPlayer() { if (!play) return; panX = canvas.clientWidth / 2 - play.actors[0].x * zoom; panY = canvas.clientHeight / 2 - play.actors[0].y * zoom; }
function stopPreview() {
  cancelAnimationFrame(previewFrame); play = null; ({ zoom, panX, panY } = editCamera); controls(); setMode(mode); draw();
  $('preview-hint').textContent = 'Thử tỷ lệ với nhân vật và quái thật.'; status('Đã dừng chơi thử. Thiết kế giữ nguyên.');
}
$('try-map').onclick = () => {
  if (play) { stopPreview(); return; }
  void run(async () => {
    if (!project?.ground) return;
    status('Đang tải nhân vật và quái thật…');
    const next = new MapPreview(); await next.load(project, images.get(project.ground.id)!);
    editCamera = { zoom, panX, panY }; play = next; zoom = 1; centerPlayer();
    $('preview-hint').textContent = 'Bấm map để đi · Cuộn để zoom · Esc dừng · Không chiến đấu, không lưu spawn.';
    canvas.style.cursor = 'crosshair'; status(`Đang thử: nhân vật + ${play.actors.length - 1} quái. Hình gốc 1:1, dùng chung tỷ lệ với cây/đất.`);
    let last = performance.now();
    const frame = (now: number) => { if (!play) return; const dt = Math.min(.05, Math.max(0, (now - last) / 1000)); last = now; if (!document.hidden) { play.tick(dt); if (play.actors[0].moving) centerPlayer(); draw(); $('coords').textContent = `Nhân vật X: ${Math.round(play.actors[0].x)} · Y: ${Math.round(play.actors[0].y)}`; } previewFrame = requestAnimationFrame(frame); };
    previewFrame = requestAnimationFrame(frame);
  });
};
$('preview-home').onclick = () => { if (play && project) { play.home(project.entry); centerPlayer(); draw(); } };
$('preview-zoom').onclick = () => { zoom = 1; centerPlayer(); draw(); };
let helpFocus: HTMLElement | null = null;
dialogs.register('shortcuts-dialog', { onClose: () => helpFocus?.focus() });
$('shortcut-help').onclick = () => { helpFocus = document.activeElement as HTMLElement; dialogs.open('shortcuts-dialog'); $('close-shortcuts').focus(); };
$('close-shortcuts').onclick = () => dialogs.close('shortcuts-dialog');
$('shortcuts-dialog').addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); const close = $('shortcuts-dialog').querySelector<HTMLElement>('.dlg-x')!; (document.activeElement === close ? $('close-shortcuts') : close).focus(); }
});
const shortcuts = [...tools.map(t => [t.key, t.label]), ['Space + kéo', 'Kéo khung tạm thời'], ['Cuộn / + / −', 'Zoom'], ['0', 'Vừa khung'], ['[ / ]', 'Giảm / tăng cỡ cọ'], ['Ctrl/Cmd+S', 'Lưu thiết kế'], ['Ctrl/Cmd+Z', 'Hoàn tác'], ['Ctrl/Cmd+Shift+Z', 'Làm lại'], ['Ctrl/Cmd+D', 'Nhân bản'], ['Delete', 'Xóa vật thể']];
for (const [key, label] of shortcuts) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = key; dd.textContent = label; $('shortcut-list').append(dt, dd); }
const tip = $('action-tooltip');
function hideTip() { tip.hidden = true; document.querySelectorAll('[aria-describedby="action-tooltip"]').forEach(el => el.removeAttribute('aria-describedby')); }
function showTip(e: Event) {
  const button = (e.target as HTMLElement).closest<HTMLElement>('[data-tip]');
  if (!button || button.matches(':disabled') || dialogOpen()) return;
  hideTip(); tip.textContent = button.dataset.tip!; tip.hidden = false; button.setAttribute('aria-describedby', tip.id);
  const r = button.getBoundingClientRect(), t = tip.getBoundingClientRect();
  tip.style.left = `${Math.max(8, Math.min(window.innerWidth - t.width - 8, r.left))}px`;
  tip.style.top = `${r.bottom + t.height + 12 > window.innerHeight ? Math.max(8, r.top - t.height - 8) : r.bottom + 8}px`;
}
document.addEventListener('pointerover', showTip); document.addEventListener('focusin', showTip);
document.addEventListener('pointerout', hideTip); document.addEventListener('focusout', hideTip);
document.addEventListener('pointerdown', hideTip); document.addEventListener('keydown', hideTip);
window.addEventListener('scroll', hideTip, true); window.addEventListener('resize', hideTip);
void run(projectList);
