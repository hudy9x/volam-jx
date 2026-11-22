import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { reloadClient } from './reload.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import sharp from 'sharp';
import { applyDisabledMaps, applyMapRegistry, applyNavOverrides, mapAssetSuffix, MAPS, DEFAULT_MAP_PORTALS, DEFAULT_TOWN_NPCS, setNavLoader, getGrid, nearestWalkable, canStandAt, type NavFile } from '../../packages/shared/src/index.js';
import { NPC_ACTION_LABELS } from '../../packages/shared/src/npcs/placements.js';
import { JX_SHEETS, NPC_SHEETS, JX_FOOT } from '../../apps/client/src/art/jx/data.gen.js';
import { SafeZoneStore } from './SafeZoneStore.js';
import { PortalStore } from './PortalStore.js';
import { TkMapStore } from './TkMapStore.js';
import { DisabledMapStore } from './DisabledMapStore.js';
import { NavOverrideStore } from './NavOverrideStore.js';
import { MONSTERS, bossTierOf } from '../../packages/shared/src/index.js';
import { SpawnStore } from './SpawnStore.js';
import { handleBossRequest } from '../boss/server.js';
import { NpcConfigStore } from './ConfigStore.js';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const assets = path.join(root, 'apps/client/public/assets'), port = Number(process.env.MAP_MANAGER_PORT ?? 4570);
const registryFile = path.resolve(process.env.MAP_REGISTRY_FILE ?? path.join(root, 'packages/shared/src/maps/custom-maps.json'));
const disabledFile = path.resolve(process.env.MAP_DISABLED_FILE ?? path.join(root, 'packages/shared/src/maps/disabled-maps.json'));
const navOverridesFile = path.resolve(process.env.MAP_NAV_OVERRIDES_FILE ?? path.join(root, 'packages/shared/src/maps/nav-overrides.json'));
function refreshRegistry() {
  const cfg = fs.existsSync(registryFile) ? JSON.parse(fs.readFileSync(registryFile, 'utf8')) : { version: 1, maps: {} };
  applyMapRegistry(cfg);
  const dCfg = fs.existsSync(disabledFile) ? JSON.parse(fs.readFileSync(disabledFile, 'utf8')) : { version: 1, disabled: [] };
  applyDisabledMaps(dCfg);
  const nCfg = fs.existsSync(navOverridesFile) ? JSON.parse(fs.readFileSync(navOverridesFile, 'utf8')) : { version: 1, maps: {} };
  applyNavOverrides(nCfg);
}
refreshRegistry();
const configFile = path.resolve(process.env.MAP_MANAGER_CONFIG ?? path.join(root, 'packages/shared/src/npcs/town-placements.json'));
const templates = DEFAULT_TOWN_NPCS[37].map(n => ({ ...n, label: NPC_ACTION_LABELS[n.action] }));
// Appearance is independent of action; retain old sprites for saved placements.
const looks = [...templates.map(n => ({ res: n.res, name: n.name })),
  { res: 'passerby004_1', name: 'Thợ rèn · hình cũ cố định' },
  { res: 'passerby037_1', name: 'Bán ngựa · hình cũ cố định' },
  { res: 'passerby040_1', name: 'Xa phu · hình cũ cố định' },
  { res: 'enemy029', name: 'Binh sĩ Tống (Tống Kim)' },
  { res: 'enemy031', name: 'Binh sĩ Kim (Tống Kim)' }];
const allowedRes = new Set(looks.map(n => n.res));
setNavLoader(id => {
  const file = path.join(assets, 'maps', mapAssetSuffix(id), 'nav.json');
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as NavFile).navigation : null;
});
const defaults = (id: number) => (DEFAULT_TOWN_NPCS[id] ?? []).map(n => {
  const m = MAPS[id], [x, y] = nearestWalkable(getGrid(id), m.raw.entry.x + n.dx, m.raw.entry.y + n.dy);
  return { id: n.id, name: n.name, action: n.action, res: n.res, dir: n.dir, x: Math.round(x), y: Math.round(y) };
});
const zoneStore = new SafeZoneStore(path.resolve(process.env.MAP_MANAGER_ZONES_CONFIG ?? path.join(root, 'packages/shared/src/maps/town-safe-zones.json')), MAPS);
const portalStore = new PortalStore(path.resolve(process.env.MAP_MANAGER_PORTALS_CONFIG ?? path.join(root, 'packages/shared/src/maps/map-portals.json')), MAPS, DEFAULT_MAP_PORTALS, (id, x, y) => canStandAt(getGrid(id), x, y));
const tkMapStore = new TkMapStore(path.resolve(process.env.MAP_MANAGER_TK_MAPS_CONFIG ?? path.join(root, 'packages/shared/src/battle/tk-maps.json')), MAPS, (id, x, y) => canStandAt(getGrid(id), x, y));
const disabledStore = new DisabledMapStore(disabledFile, MAPS);
const navOverrideStore = new NavOverrideStore(navOverridesFile, MAPS);
const spawnStore = new SpawnStore(path.resolve(process.env.MAP_MANAGER_SPAWNS_DIR ?? path.join(root, 'packages/shared/spawns')), MAPS, id => !!MONSTERS[id], (id, x, y) => canStandAt(getGrid(id), x, y));
const store = new NpcConfigStore(configFile, MAPS, allowedRes, defaults, (id, x, y) => canStandAt(getGrid(id), x, y));
const bundle = await build({ entryPoints: [path.join(here, 'ui/main.ts')], outdir: path.join(here, '.bundle'), bundle: true, write: false, platform: 'browser', format: 'esm', target: 'es2022', plugins: [{ name: 'tool-dialog-style', setup(b) { b.onLoad({ filter: /[/\\]ui[/\\]kit[/\\](dialog|tooltip)\.css$/ }, () => ({ contents: '', loader: 'css' })); } }] });
const files = new Map(bundle.outputFiles.map(f => [`/${path.basename(f.path)}`, f.contents]));
const instanceVersion = randomUUID();
const page = fs.readFileSync(path.join(here, 'ui/index.html'), 'utf8').replace('</body>', '<script src="/__tool-reload.js"></script></body>');
let manifest: { packs: Record<string, { v: string }> } | null = null;
try { manifest = JSON.parse(fs.readFileSync(path.join(assets, 'manifest.json'), 'utf8')); } catch { /* Unversioned dev assets still work. */ }
const imageCache = new Map<string, Buffer>();
async function jsonBody(req: http.IncomingMessage) {
  const chunks: Buffer[] = []; let bytes = 0;
  for await (const chunk of req) { bytes += chunk.length; if (bytes > 1024 * 1024) throw Error('Cấu hình quá lớn.'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString());
}
const server = http.createServer(async (req, res) => {
  const json = (v: unknown, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(v)); };
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(req.headers.host ?? '')) { json({ error: 'Chỉ truy cập qua localhost.' }, 403); return; }
    if (!['GET', 'HEAD'].includes(req.method ?? '') && req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) { json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403); return; }
    refreshRegistry();
    const u = new URL(req.url ?? '/', `http://${req.headers.host}`);
    if (u.pathname === '/__tool-version') { res.end(instanceVersion); return; }
    if (u.pathname === '/__tool-reload.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(reloadClient); return; }
    if (u.pathname === '/boss') { res.writeHead(302, { Location: '/boss/' }); res.end(); return; }
    if (u.pathname.startsWith('/boss/')) {
      req.url = u.pathname.slice(5) + u.search;
      await handleBossRequest(req, res, true); return;
    }
    const spawnMatch = /^\/api\/maps\/(\d+)\/spawns$/.exec(u.pathname);
    if (spawnMatch) {
      const id = Number(spawnMatch[1]);
      if (!MAPS[id]) throw Error('Không có bản đồ này.');
      if (req.method === 'GET') { json(await spawnStore.read(id)); return; }
      if (req.method === 'PUT') {
        if (!fs.existsSync(path.join(assets, 'maps', mapAssetSuffix(id), 'nav.json')) || !fs.existsSync(path.join(assets, 'maps', mapAssetSuffix(id), 'map.json'))) throw Error('Map thiếu tài nguyên.');
        const b = await jsonBody(req); json(await spawnStore.save(id, b.file, b.revision)); return;
      }
    }
    if (req.method === 'GET' && u.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page); return; }
    if (req.method === 'GET' && files.has(u.pathname)) { res.setHeader('Content-Type', u.pathname.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(files.get(u.pathname)); return; }
    if (req.method === 'GET' && u.pathname === '/api/bootstrap') {
      try { manifest = JSON.parse(fs.readFileSync(path.join(assets, 'manifest.json'), 'utf8')); } catch { /* keep existing versions */ }
      const maps = Object.values(MAPS).filter(m => ['City', 'Capital', 'Field', 'Cave', 'Country', 'Tong', 'Battlefield', 'Others'].includes(m.type)).map(m => ({ id: m.id, name: m.name, type: m.type === 'Battlefield' && /^Đơn đấu/i.test(m.name) ? 'Duel' : m.type, size: m.raw.size, entry: m.raw.entry, enabled: m.enabled !== false, group: ['City', 'Capital'].includes(m.type) ? 'city' : 'training', editable: ['City', 'Capital'].includes(m.type), battlefield: m.type === 'Battlefield',
        available: fs.existsSync(path.join(assets, 'maps', mapAssetSuffix(m.id), 'nav.json')) && fs.existsSync(path.join(assets, 'maps', mapAssetSuffix(m.id), 'map.json')) }));
      json({ monsters: Object.values(MONSTERS).filter(m => bossTierOf(m.boss) < 2 && !m.dummy).map(m => ({ id: m.id, name: m.name, level: m.level })), maps, templates, labels: NPC_ACTION_LABELS, versions: Object.fromEntries(maps.map(m => [m.id, manifest?.packs[`map/${m.id}`]?.v ?? ''])) }); return;
    }
    const portalMatch = /^\/api\/maps\/(\d+)\/(portals|portal-entry)$/.exec(u.pathname);
    if (portalMatch) {
      const id = Number(portalMatch[1]);
      if (!MAPS[id]) throw Error('Không có bản đồ này.');
      if (portalMatch[2] === 'portals') {
        if (req.method === 'GET') { json(await portalStore.read(id)); return; }
        if (req.method === 'PUT') { const b = await jsonBody(req); json(await portalStore.save(id, b.portals, b.revision)); return; }
      } else if (req.method === 'GET') {
        const e = MAPS[id].raw.entry, [x, y] = nearestWalkable(getGrid(id), e.x, e.y); json({ x: Math.round(x), y: Math.round(y) }); return;
      }
    }
    const enabledMatch = /^\/api\/maps\/(\d+)\/enabled$/.exec(u.pathname);
    if (enabledMatch && req.method === 'POST') {
      const id = Number(enabledMatch[1]);
      const b = await jsonBody(req);
      json(await disabledStore.setEnabled(id, Boolean(b?.enabled)));
      return;
    }
    const navOvMatch = /^\/api\/maps\/(\d+)\/nav-overrides$/.exec(u.pathname);
    if (navOvMatch) {
      const id = Number(navOvMatch[1]);
      if (req.method === 'GET') { json(await navOverrideStore.read(id)); return; }
      if (req.method === 'PUT') { const b = await jsonBody(req); json(await navOverrideStore.save(id, b.override, b.revision)); return; }
    }
    const tkMatch = /^\/api\/maps\/(\d+)\/tongkim$/.exec(u.pathname);
    if (tkMatch) {
      const id = Number(tkMatch[1]), meta = MAPS[id];
      if (!meta) throw Error('Không có bản đồ này.');
      if (req.method === 'GET') {
        const [tk, p] = await Promise.all([tkMapStore.read(id), portalStore.read(id)]);
        const findP = (pid: string) => p.portals.find(x => x.id === pid);
        const tongOut = findP('tk-tong-out'), tongBack = findP('tk-tong-back'), kimOut = findP('tk-kim-out'), kimBack = findP('tk-kim-back');
        json({
          ...tk,
          portals: {
            tongOut: tongOut ? { x: tongOut.x, y: tongOut.y } : null,
            tongBack: tongBack ? { x: tongBack.x, y: tongBack.y } : null,
            kimOut: kimOut ? { x: kimOut.x, y: kimOut.y } : null,
            kimBack: kimBack ? { x: kimBack.x, y: kimBack.y } : null,
          },
        });
        return;
      }
      if (req.method === 'PUT') {
        const b = await jsonBody(req);
        const saved = await tkMapStore.save(id, b.config, b.revision);
        if (b.portals && typeof b.portals === 'object') {
          const tkPortals = [];
          const cfg = saved.config;
          const pt = (v: unknown) => v && typeof v === 'object' && Number.isFinite(Number((v as { x?: unknown }).x)) && Number.isFinite(Number((v as { y?: unknown }).y))
            ? { x: Math.round(Number((v as { x: number }).x)), y: Math.round(Number((v as { y: number }).y)) }
            : null;
          const tOut = pt(b.portals.tongOut), tBack = pt(b.portals.tongBack), kOut = pt(b.portals.kimOut), kBack = pt(b.portals.kimBack);
          if (tOut) tkPortals.push({ id: 'tk-tong-out', label: 'Ra chiến trường (Tống)', x: tOut.x, y: tOut.y, radius: 64, toMap: id, toX: cfg.tong.gateExit.x, toY: cfg.tong.gateExit.y });
          if (tBack) tkPortals.push({ id: 'tk-tong-back', label: 'Về Hậu doanh (Tống)', x: tBack.x, y: tBack.y, radius: 64, toMap: id, toX: cfg.tong.spawn.x, toY: cfg.tong.spawn.y });
          if (kOut) tkPortals.push({ id: 'tk-kim-out', label: 'Ra chiến trường (Kim)', x: kOut.x, y: kOut.y, radius: 64, toMap: id, toX: cfg.kim.gateExit.x, toY: cfg.kim.gateExit.y });
          if (kBack) tkPortals.push({ id: 'tk-kim-back', label: 'Về Hậu doanh (Kim)', x: kBack.x, y: kBack.y, radius: 64, toMap: id, toX: cfg.kim.spawn.x, toY: cfg.kim.spawn.y });
          await portalStore.replaceTkPortals(id, tkPortals);
        }
        json({ ...saved, portals: b.portals ?? null });
        return;
      }
      if (req.method === 'DELETE') {
        const b = await jsonBody(req);
        json(await tkMapStore.remove(id, b.revision));
        return;
      }
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
      if (!meta || !['City', 'Capital', 'Battlefield'].includes(meta.type)) throw Error('Chỉ chỉnh NPC thành thị hoặc chiến trường.');
      if (match[2] === 'npcs' && req.method === 'GET') { json(await store.read(id)); return; }
      if (match[2] === 'npcs' && req.method === 'PUT') { const b = await jsonBody(req); json(await store.save(id, b.npcs, b.revision)); return; }
      if (match[2] === 'snap' && req.method === 'POST') {
        const b = await jsonBody(req); if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || b.x < 0 || b.y < 0 || b.x >= meta.raw.size.width || b.y >= meta.raw.size.height) throw Error('Điểm nằm ngoài map.');
        const [x, y] = nearestWalkable(getGrid(id), b.x, b.y); json({ x: Math.round(x), y: Math.round(y), moved: x !== b.x || y !== b.y }); return;
      }
    }
    if (req.method === 'GET' && u.pathname === '/api/monster-image') {
      const monster = MONSTERS[Number(u.searchParams.get('id'))];
      if (!monster) throw Error('Không có loại quái này.');
      const sheet = NPC_SHEETS[monster.sprite]?.stand ?? NPC_SHEETS[monster.sprite]?.idle;
      if (!sheet) throw Error('Chưa có hình quái.');
      const key = `monster:${monster.id}`;
      if (!imageCache.has(key)) { const [width, height] = JX_SHEETS[sheet]; imageCache.set(key, await sharp(path.join(assets, `${sheet}.webp`)).extract({ left: 0, top: 0, width, height }).trim().resize(64, 64, { fit: 'inside', withoutEnlargement: true }).png().toBuffer()); }
      res.setHeader('Content-Type', 'image/png'); res.end(imageCache.get(key)); return;
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
      const relative = decodeURIComponent(u.pathname.slice(8));
      const mapPath = /^maps\/(\d+)\/(.*)$/.exec(relative);
      const mapped = mapPath && MAPS[Number(mapPath[1])]?.customBuild ? `maps/${mapAssetSuffix(Number(mapPath[1]))}/${mapPath[2]}` : relative;
      const file = path.resolve(assets, mapped);
      if (!file.startsWith(assets + path.sep)) { json({ error: 'Đường dẫn không hợp lệ.' }, 403); return; }
      const stat = await fs.promises.stat(file); if (!stat.isFile()) throw Error('Không có tài nguyên.');
      res.setHeader('Content-Type', ({ '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' } as Record<string, string>)[path.extname(file)] ?? 'application/octet-stream');
      fs.createReadStream(file).on('error', () => res.destroy()).pipe(res); return;
    }
    json({ error: 'Không tìm thấy.' }, 404);
  } catch (e) { json({ error: (e as NodeJS.ErrnoException).code === 'ENOENT' ? 'Thiếu tài nguyên map hoặc hình NPC. Hãy sinh tài nguyên trước.' : (e as Error).message }, 400); }
});
server.listen(port, '127.0.0.1', () => console.log(`Map Manager: http://localhost:${port}\nLưu NPC vào ${configFile}\nCtrl+C để dừng. Không kết nối HMR game.`));
