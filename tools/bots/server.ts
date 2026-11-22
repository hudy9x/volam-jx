import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { MAPS } from '@vltk/shared';
import { ConfigStore } from './ConfigStore.js';
import { handleConfigRequest } from './ConfigRoutes.js';
import { RunManager } from './RunManager.js';
import { build } from 'esbuild';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.resolve(HERE, '../../apps/client/public/assets');
const PORT = Number(process.env.BOTS_UI_PORT ?? 4568);
const GAME_SERVER_URL = process.env.GAME_SERVER_URL ?? 'http://localhost:2567';
const WATCH_MODE = process.env.BOTS_UI_WATCH === '1';
const instanceVersion = randomUUID();
const reloadScript = `(() => {
let version; let pending = false;
setInterval(async () => {
  if (pending) return; pending = true;
  try {
    const r = await fetch('/__tool-version', { cache: 'no-store' }); if (!r.ok) return;
    const next = await r.text();
    if (!version) { version = next; return; }
    if (next !== version) location.reload();
  } catch {} finally { pending = false; }
}, 1000);
})();`;
// Bundle once at startup: no Vite/HMR connection, no filesystem watcher and no dependency on the game tab.
const bundle = await build({ entryPoints: [path.join(HERE, 'ui/main.ts')], bundle: true, write: false,
  outdir: path.join(HERE, '.bundle'), format: 'esm', platform: 'browser', target: 'es2022',
  external: ['/assets/*'], define: { __GAME_SERVER_URL__: JSON.stringify(GAME_SERVER_URL) }, minify: false });
const files = new Map(bundle.outputFiles.map(file => [`/${path.basename(file.path)}`, file.contents]));
const page = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Quản lý bot</title><link rel="stylesheet" href="/main.css"></head><body><script type="module" src="/main.js"></script>${WATCH_MODE ? '<script src="/__tool-reload.js"></script>' : ''}</body></html>`;
const mime: Record<string,string> = { '.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg','.json':'application/json','.woff2':'font/woff2' };
const dataDir = path.resolve(process.env.BOTS_DIR ?? path.join(HERE,'data'));
const store = new ConfigStore(dataDir);
const runs = new RunManager(HERE, path.resolve(process.env.BOTS_DIR ?? path.join(HERE,'data')));
const server = http.createServer((req,res) => {
  let pathname: string;
  try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); } catch { res.writeHead(400);res.end();return; }
  res.setHeader('Cache-Control','no-cache');
  if(pathname==='/api/maps'&&req.method==='GET'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify(Object.keys(MAPS).map(Number).filter(id=>fs.existsSync(path.join(ASSETS,'maps',String(id),'nav.json')))));return;}
  if(handleConfigRequest(req,res,pathname,store,runs)) return;
  if (pathname.startsWith('/api/runner/')) {
    res.setHeader('Content-Type','application/json; charset=utf-8');
    if (pathname==='/api/runner/status'&&req.method==='GET') {res.end(JSON.stringify(runs.status()));return;}
    if(req.method!=='POST'||req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`) {res.writeHead(403);res.end(JSON.stringify({error:'Yêu cầu không hợp lệ.'}));return;}
    let raw='';req.on('data',chunk=>{raw+=chunk;if(raw.length>65536)req.destroy();});req.on('end',async()=>{
      try{const body=JSON.parse(raw);if(pathname==='/api/runner/start')await runs.replace(body.scenario,body.usernames,body.server);else if(pathname==='/api/runner/resume')await runs.resume(body.usernames,body.server);else if(pathname==='/api/runner/toggle')await runs.toggleScenario(body.scenario,body.server);else if(pathname==='/api/runner/stop')runs.stop(body.usernames);else if(pathname==='/api/runner/tactic')runs.setTkTactic(body.tactic,body.camp);else throw Error('Không có thao tác này.');res.end(JSON.stringify(runs.status()));}
      catch(error){res.writeHead(400);res.end(JSON.stringify({error:(error as Error).message}));}
    });return;
  }
  if (!['GET','HEAD'].includes(req.method ?? '')) { res.writeHead(405);res.end();return; }

  if (pathname === '/__tool-version') { res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(req.method==='HEAD'?undefined:instanceVersion);return; }
  if (pathname === '/__tool-reload.js') { res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(req.method==='HEAD'?undefined:reloadScript);return; }
  if (pathname === '/') { res.setHeader('Content-Type','text/html; charset=utf-8');res.end(req.method==='HEAD'?undefined:page);return; }
  const body = files.get(pathname);
  if (body) { res.setHeader('Content-Type',pathname.endsWith('.css')?'text/css':'text/javascript');res.end(req.method==='HEAD'?undefined:body);return; }
  if (pathname.startsWith('/assets/')) {
    const file = path.resolve(ASSETS, pathname.slice('/assets/'.length));
    if (!file.startsWith(ASSETS+path.sep)) { res.writeHead(403);res.end();return; }
    fs.stat(file,(error,stat) => {
      if (error || !stat.isFile()) {res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',mime[path.extname(file)]??'application/octet-stream');res.setHeader('Content-Length',stat.size);
      if (req.method==='HEAD') res.end(); else fs.createReadStream(file).on('error',()=>res.destroy()).pipe(res);
    });return;
  }
  res.writeHead(404);res.end('Not found');
});
server.listen(PORT, '127.0.0.1', () => console.log(`Bot tools: http://localhost:${PORT}\nGame server: ${GAME_SERVER_URL}\n${WATCH_MODE ? 'Đang tự theo dõi thay đổi mã công cụ bot (tự nạp lại khi sửa tools/bots hoặc shared/bots).' : 'Không tự reload khi game thay đổi. Khởi động lại bots:ui để nạp sửa đổi công cụ.'}`));

for(const signal of ['SIGINT','SIGTERM'] as const)process.on(signal,()=>{runs.close();server.close();setTimeout(()=>process.exit(0),5500).unref();});
