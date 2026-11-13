import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import { build as esbuild } from 'esbuild';
import { defineConfig, type Plugin } from 'vite';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(HERE, 'public/assets');
const TYPES: Record<string, string> = {
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.mp3': 'audio/mpeg',
};

/**
 * Cache-Control of an asset (docs/performance/05-cache-va-phien-ban.md §4): versioned URLs (`?v=`, art/assets.ts) are
 * kept for a year; manifest.json and unversioned URLs (CSS url(/assets/ui/…)) are asked again (ETag → 304); music a week.
 * The same table goes into the real web server's configuration.
 */
function assetCacheControl(rel: string, versioned: boolean): string {
  if (rel === 'manifest.json') return 'no-cache';
  if (versioned) return 'public, max-age=31536000, immutable';
  if (rel.startsWith('music/')) return 'public, max-age=604800';
  return 'no-cache';
}

/** Serve one file of public/assets: ETag / 304 and single Range requests (music). */
function sendAsset(req: IncomingMessage, res: ServerResponse, next: () => void, cacheControl: (rel: string, versioned: boolean) => string): void {
  const [pathname, query = ''] = (req.url ?? '').split('?');
  const rel = decodeURIComponent(pathname).replace(/^\/+/, '');
  const file = path.join(ASSETS, rel);
  if (!file.startsWith(ASSETS + path.sep)) return next();
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) return next();
    const etag = `W/"${st.size.toString(16)}-${Math.floor(st.mtimeMs).toString(16)}"`;
    res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream');
    res.setHeader('Cache-Control', cacheControl(rel, /(^|&)v=/.test(query)));
    res.setHeader('ETag', etag);
    res.setHeader('Accept-Ranges', 'bytes');
    if (req.headers['if-none-match'] === etag) { res.statusCode = 304; res.end(); return; }
    const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
    let start = 0, end = st.size - 1;
    if (range && (range[1] || range[2])) {
      start = range[1] ? Number(range[1]) : Math.max(0, st.size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), st.size - 1) : st.size - 1;
      if (start > end) { res.statusCode = 416; res.setHeader('Content-Range', `bytes */${st.size}`); res.end(); return; }
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${st.size}`);
    }
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') { res.end(); return; }
    fs.createReadStream(file, { start, end }).pipe(res);
  });
}

/**
 * public/assets is left out of the dev watcher (below), so Vite only knows the files that existed when it
 * started. The generators keep adding art (gen:maps runs for hours): serve /assets/** straight from disk.
 * Dev: always `no-cache` (a regenerated file shows at once). `vite preview` (the built game): the production headers,
 * so the caches can be tried locally; the build itself does not copy the 15 GB of assets (copyPublicDir: false).
 */
function serveGeneratedAssets(): Plugin {
  return {
    name: 'serve-generated-assets',
    configureServer(server) {
      server.middlewares.use('/assets', (req, res, next) => sendAsset(req, res, next, () => 'no-cache'));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/assets', (req, res, next) => sendAsset(req, res, next, assetCacheControl));
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? '';
        res.setHeader('Cache-Control', url.startsWith('/app/') ? 'public, max-age=31536000, immutable' : 'no-cache');
        next();
      });
    },
  };
}

/** /sw.js (src/platform/sw/sw.ts) as one classic script: a Service Worker cannot share the app's chunks. */
function serviceWorker(): Plugin {
  return {
    name: 'service-worker',
    apply: 'build',
    async generateBundle() {
      const out = await esbuild({
        entryPoints: [path.join(HERE, 'src/platform/sw/sw.ts')],
        bundle: true, write: false, format: 'iife', target: 'es2020', minify: true, legalComments: 'none',
      });
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: out.outputFiles[0].text });
    },
  };
}

export default defineConfig({
  plugins: [serveGeneratedAssets(), serviceWorker()],
  server: {
    port: 5173,
    host: true,
    // File-change events don't reach WSL from Windows drives (/mnt/*): poll instead. The generated art
    // (tens of thousands of files, see tools/gen-*.ts) is not watched — polling it made every request slow.
    watch: { usePolling: true, interval: 300, ignored: ['**/public/assets/**', '**/tools/.cache/**'] },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    // Hashed code under /app/, game assets under /assets/ (served apart, see serveGeneratedAssets): one cache rule each.
    assetsDir: 'app',
    copyPublicDir: false,
  },
});
