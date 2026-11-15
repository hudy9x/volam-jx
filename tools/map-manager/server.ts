import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';
import { MAPS, DEFAULT_TOWN_NPCS, setNavLoader, getGrid, nearestWalkable, canStandAt, type NavFile } from '../../packages/shared/src/index.js';
import { NPC_ACTION_LABELS } from '../../packages/shared/src/npcs/placements.js';
import { JX_SHEETS, NPC_SHEETS, JX_FOOT } from '../../apps/client/src/art/jx/data.gen.js';
import { SafeZoneStore } from './SafeZoneStore.js';
import { NpcConfigStore } from './ConfigStore.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const assets = path.join(root, 'apps/client/public/assets'), port = Number(process.env.MAP_MANAGER_PORT ?? 4570);
const configFile = path.resolve(process.env.MAP_MANAGER_CONFIG ?? path.join(root, 'packages/shared/src/npcs/town-placements.json'));
const templates = DEFAULT_TOWN_NPCS[37].map(n => ({ ...n, label: NPC_ACTION_LABELS[n.action] }));
// Appearance is independent of action; retain old sprites for saved placements.
const looks = [...templates.map(n => ({ res: n.res, name: n.name })),
  { res: 'passerby004_1', name: 'Thợ rèn · hình cũ cố định' },
  { res: 'passerby037_1', name: 'Bán ngựa · hình cũ cố định' },
  { res: 'passerby040_1', name: 'Xa phu · hình cũ cố định' }];
const allowedRes = new Set(looks.map(n => n.res));
setNavLoader(id => {
  const file = path.join(assets, 'maps', String(id), 'nav.json');
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as NavFile).navigation : null;
});
const defaults = (id: number) => (DEFAULT_TOWN_NPCS[id] ?? []).map(n => {
  const m = MAPS[id], [x, y] = nearestWalkable(getGrid(id), m.raw.entry.x + n.dx, m.raw.entry.y + n.dy);
  return { id: n.id, name: n.name, action: n.action, res: n.res, dir: n.dir, x: Math.round(x), y: Math.round(y) };
});
const zoneStore = new SafeZoneStore(path.resolve(process.env.MAP_MANAGER_ZONES_CONFIG ?? path.join(root, 'packages/shared/src/maps/town-safe-zones.json')), MAPS);
const store = new NpcConfigStore(configFile, MAPS, allowedRes, defaults, (id, x, y) => canStandAt(getGrid(id), x, y));
const bundle = await build({ entryPoints: [path.join(here, 'ui/main.ts')], outdir: path.join(here, '.bundle'), bundle: true, write: false, platform: 'browser', format: 'esm', target: 'es2022', plugins: [{ name: 'tool-dialog-style', setup(b) { b.onLoad({ filter: /[/\\]ui[/\\]kit[/\\](dialog|tooltip)\.css$/ }, () => ({ contents: '', loader: 'css' })); } }] });
const files = new Map(bundle.outputFiles.map(f => [`/${path.basename(f.path)}`, f.contents]));
const page = fs.readFileSync(path.join(here, 'ui/index.html'));
let manifest: { packs: Record<string, { v: string }> } | null = null;
try { manifest = JSON.parse(fs.readFileSync(path.join(assets, 'manifest.json'), 'utf8')); } catch { /* Unversioned dev assets still work. */ }
const imageCache = new Map<string, Buffer>();
async function jsonBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 128 * 1024) throw Error('Cấu hình quá lớn.'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString());
}
const server = http.createServer(async (req, res) => {
  const json = (v: unknown, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(v)); };
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host ?? '')) { json({ error: 'Chỉ truy cập qua localhost.' }, 403); return; }
    if (!['GET', 'HEAD'].includes(req.method ?? '') && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403); return; }
    const u = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (req.method === 'GET' && u.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page); return; }
    if (req.method === 'GET' && files.has(u.pathname)) { res.setHeader('Content-Type', u.pathname.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(files.get(u.pathname)); return; }
    if (req.method === 'GET' && u.pathname === '/api/bootstrap') {
      const maps = Object.values(MAPS).filter(m => ['City', 'Capital', 'Field', 'Cave', 'Country'].includes(m.type)).map(m => ({ id: m.id, name: m.name, size: m.raw.size, entry: m.raw.entry, group: ['City', 'Capital'].includes(m.type) ? 'city' : 'training', editable: ['City', 'Capital'].includes(m.type),
        available: fs.existsSync(path.join(assets, 'maps', String(m.id), 'nav.json')) && fs.existsSync(path.join(assets, 'maps', String(m.id), 'map.json')) }));
      json({ maps, templates, labels: NPC_ACTION_LABELS, versions: Object.fromEntries(maps.map(m => [m.id, manifest?.packs[`map/${m.id}`]?.v ?? ''])) }); return;
    }
    const zoneMatch = /^\/api\/maps\/(\d+)\/safe-zones$/.exec(u.pathname);
    if (zoneMatch) {
      const id = Number(zoneMatch[1]);
      if (req.method === 'GET') { json(await zoneStore.read(id)); return; }
      if (req.method === 'PUT') { const body = await jsonBody(req); json(await zoneStore.save(id, body.zones, body.revision)); return; }
    }
    const match = /^\/api\/maps\/(\d+)\/(npcs|snap)$/.exec(u.pathname);
    if (match) {
      const id = Number(match[1]), meta = MAPS[id];
      if (!meta || !['City', 'Capital'].includes(meta.type)) throw Error('Chỉ chỉnh NPC thành thị.');
      if (match[2] === 'npcs' && req.method === 'GET') { json(await store.read(id)); return; }
      if (match[2] === 'npcs' && req.method === 'PUT') { const b = await jsonBody(req); json(await store.save(id, b.npcs, b.revision)); return; }
      if (match[2] === 'snap' && req.method === 'POST') {
        const b = await jsonBody(req); if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || b.x < 0 || b.y < 0 || b.x >= meta.raw.size.width || b.y >= meta.raw.size.height) throw Error('Điểm nằm ngoài map.');
        const [x, y] = nearestWalkable(getGrid(id), b.x, b.y); json({ x: Math.round(x), y: Math.round(y), moved: x !== b.x || y !== b.y }); return;
      }
    }
    if (req.method === 'GET' && u.pathname === '/api/npc-image') {
      const npc = u.searchParams.get('res') ?? '', dir = Number(u.searchParams.get('dir') ?? 0);
      if (!allowedRes.has(npc) || !Number.isInteger(dir) || dir < 0 || dir > 7) throw Error('Hình NPC không hợp lệ.');
      const key = `${npc}:${dir}`, sheet = NPC_SHEETS[npc]?.stand ?? NPC_SHEETS[npc]?.idle;
      if (!sheet) throw Error('Chưa có hình NPC. Chạy generator tài nguyên trước.');
      const [w, h, bx, by, , dirs, columns] = JX_SHEETS[sheet];
      const row = dirs >= 8 ? Math.round(dir * dirs / 8) % dirs : Math.floor(dir * dirs / 8);
      const index = row * JX_SHEETS[sheet][4];
      if (!imageCache.has(key)) imageCache.set(key, await sharp(path.join(assets, `${sheet}.webp`)).extract({ left: index % columns * w, top: Math.floor(index / columns) * h, width: w, height: h }).png().toBuffer());
      res.setHeader('Content-Type', 'image/png'); res.setHeader('X-Anchor-X', JX_FOOT[0] - bx); res.setHeader('X-Anchor-Y', JX_FOOT[1] - by); res.end(imageCache.get(key)); return;
    }
    if (req.method === 'GET' && u.pathname === '/api/looks') {
      json(looks.map(n => { const key = NPC_SHEETS[n.res]?.stand ?? NPC_SHEETS[n.res]?.idle; const m = key && JX_SHEETS[key]; return { res: n.res, label: `${n.name} · ${m ? m[5] : 0} hướng`, directions: m ? m[5] : 0, available: !!m && fs.existsSync(path.join(assets, `${key}.webp`)), width: m ? m[0] : 0, height: m ? m[1] : 0, anchorX: m ? JX_FOOT[0] - m[2] : 0, anchorY: m ? JX_FOOT[1] - m[3] : 0 }; })); return;
    }
    if (req.method === 'GET' && u.pathname.startsWith('/assets/')) {
      const file = path.resolve(assets, decodeURIComponent(u.pathname.slice(8)));
      if (!file.startsWith(assets + path.sep)) { json({ error: 'Đường dẫn không hợp lệ.' }, 403); return; }
      const stat = await fs.promises.stat(file); if (!stat.isFile()) throw Error('Không có tài nguyên.');
      res.setHeader('Content-Type', ({ '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' } as Record<string, string>)[path.extname(file)] ?? 'application/octet-stream');
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res); return;
    }
    json({ error: 'Không tìm thấy.' }, 404);
  } catch (e) { json({ error: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'Thiếu tài nguyên map hoặc hình NPC. Hãy sinh tài nguyên trước.' : (e as Error).message }, 400); }
});
server.listen(port, '127.0.0.1', () => console.log(`Map Manager: http://localhost:${port}\nLưu NPC vào ${configFile}\nCtrl+C để dừng. Không kết nối HMR game.`));
