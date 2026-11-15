import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { ProjectStore } from './Store.js';
import { PublicationStore } from './PublicationStore.js';
import { updateManifest, ASSETS_DIR } from '../../apps/client/tools/jx/manifest.js';
import { exportMap } from './export.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.MAP_CREATOR_PORT ?? 4569);
const store = new ProjectStore(path.resolve(process.env.MAP_CREATOR_DIR ?? path.join(here, 'projects')));
const publications = new PublicationStore(store, path.resolve(process.env.MAP_REGISTRY_FILE ?? path.join(here, '../../packages/shared/src/maps/custom-maps.json')), path.resolve(process.env.MAP_CREATOR_MAPS_DIR ?? path.join(ASSETS_DIR, 'maps')), id => { if (!process.env.MAP_CREATOR_MAPS_DIR) updateManifest([`map/${id}`]); });
const bundle = await build({ entryPoints: [path.join(here, 'ui/main.ts')], bundle: true, write: false, outdir: path.join(here, '.bundle'), format: 'esm', platform: 'browser', target: 'es2022', plugins: [{ name: 'tool-dialog-style', setup(b) { b.onLoad({ filter: /[/\\]ui[/\\]kit[/\\](dialog|tooltip)\.css$/ }, () => ({ contents: '', loader: 'css' })); } }] });
const files = new Map(bundle.outputFiles.map(f => [`/${path.basename(f.path)}`, f.contents]));
const page = await fs.readFile(path.join(here, 'ui/index.html'));
const exporting = new Set<number>();
async function body(req: http.IncomingMessage, limit: number): Promise<Buffer> {
  const chunks: Buffer[] = []; let length = 0;
  for await (const chunk of req) { length += chunk.length; if (length > limit) throw Error('Dữ liệu vượt giới hạn upload.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
const server = http.createServer(async (req, res) => {
  const json = (data: unknown, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const host = req.headers.host ?? '';
    if (![`localhost:${port}`, `127.0.0.1:${port}`].includes(host)) { json({ error: 'Chỉ hỗ trợ truy cập localhost.' }, 403); return; }
    const u = new URL(req.url ?? '/', `http://${host}`);
    if (!['GET', 'HEAD'].includes(req.method ?? '') && req.headers.origin && req.headers.origin !== `http://${host}`) { json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403); return; }
    if (req.method === 'GET' && u.pathname === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(page); return; }
    if (req.method === 'GET' && files.has(u.pathname)) { res.setHeader('Content-Type', u.pathname.endsWith('.css') ? 'text/css' : 'text/javascript'); res.end(files.get(u.pathname)); return; }
    if (u.pathname === '/api/projects') {
      if (req.method === 'GET') { json(await store.list()); return; }
      if (req.method === 'POST') { const b = JSON.parse((await body(req, 4096)).toString()); json(await store.create(b.id, b.name)); return; }
    }
    const publication = /^\/api\/projects\/(\d+)\/publication$/.exec(u.pathname);
    if (publication) {
      const id = Number(publication[1]); await store.read(id);
      if (req.method === 'GET') { json(await publications.status(id)); return; }
      if (req.method === 'PUT') { const b = JSON.parse((await body(req, 4096)).toString()); json(await publications.set(id, b.enabled, b.projectRevision, b.revision, b.type)); return; }
    }
    const match = /^\/api\/projects\/(\d+)(?:\/(assets|export)(?:\/([a-f0-9]{64}))?)?$/.exec(u.pathname);
    if (match) {
      const id = Number(match[1]), action = match[2];
      if (!action && req.method === 'GET') { json(await store.read(id)); return; }
      if (!action && req.method === 'PUT') { json(await store.save(id, JSON.parse((await body(req, 4 * 1024 * 1024)).toString()))); return; }
      if (action === 'assets' && match[3] && req.method === 'GET') { const image = await fs.readFile(store.assetPath(id, match[3])); res.setHeader('Content-Type', 'image/webp'); res.end(image); return; }
      if (action === 'assets' && !match[3] && req.method === 'POST') { json(await store.upload(id, await body(req, 32 * 1024 * 1024), u.searchParams.get('name') ?? 'Ảnh')); return; }
      if (action === 'export' && req.method === 'POST') {
        if (exporting.has(id)) { json({ error: 'Map đang được xuất. Vui lòng chờ.' }, 409); return; }
        exporting.add(id);
        try { const p = await store.read(id); const result = await exportMap(store, p); json({ build: result, revision: p.revision, preview: `/preview/${id}/${result}` }); }
        finally { exporting.delete(id); }
        return;
      }
    }
    const preview = /^\/preview\/(\d+)\/(r\d+-[a-f0-9]{8})$/.exec(u.pathname);
    if (req.method === 'GET' && preview) { res.setHeader('Content-Type', 'image/webp'); res.end(await fs.readFile(path.join(store.folder(Number(preview[1])), 'builds', preview[2], 'preview.webp'))); return; }
    json({ error: 'Không tìm thấy.' }, 404);
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    json({ error: code === 'EEXIST' ? 'ID map đã tồn tại. Chọn ID khác.' : code === 'ENOENT' ? 'Project hoặc ảnh không tồn tại.' : (e as Error).message }, 400);
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Map Creator: http://localhost:${port}\nProjects: ${store.root}\nChạy độc lập game; Ctrl+C để dừng.`));
