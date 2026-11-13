/// <reference lib="webworker" />
/**
 * Asset cache of the web build (docs/performance/05-cache-va-phien-ban.md §5). Built into /sw.js by vite.config.ts
 * (esbuild, one file); registered by platform/assetCache.ts in production only. Desktop / Mobile wrappers serve the
 * assets from their own disk instead (§6) and do not register it.
 *
 * - Only GET requests under assets/ are handled; manifest.json and music/ (Range requests) go to the network.
 * - One Cache Storage cache per pack + version ("vltk:<pack>:<v>"), keyed by the URL without `?v=`; cache first.
 * - A request whose version is not the one of the manifest the worker holds goes to the network uncached.
 * - IndexedDB "vltk-assets" keeps size + last use of every cached file: total size, least recently used first.
 * - Over budget: drop whole map packs (oldest first, never the protected ones), then the least recently used files of
 *   npc / char / items / skill. core is never dropped.
 */
import { ASSET_MANIFEST, packOf, type AssetManifest } from '@vltk/shared/src/assets';
import type { CacheStats, SwRequest } from './messages';

declare const self: ServiceWorkerGlobalScope;

const META = 'vltk:meta';
const PREFIX = 'vltk:';
/** Packs whose files can be dropped one by one (the maps go as whole packs, core never). */
const LRU_PACKS = new Set(['npc', 'char', 'items', 'skill']);
const PRECACHE_PARALLEL = 6;

/** Root of the assets: `?base=` of the worker URL (a CDN), else assets/ next to the worker. */
const ASSETS = new URL(
  (new URL(self.location.href).searchParams.get('base') ?? 'assets').replace(/\/?$/, '/'),
  self.registration.scope,
).href;

const cacheName = (pack: string, v: string) => `${PREFIX}${pack}:${v}`;
function parseName(name: string): { pack: string; v: string } | null {
  if (!name.startsWith(PREFIX) || name === META) return null;
  const rest = name.slice(PREFIX.length), cut = rest.lastIndexOf(':');
  return cut > 0 ? { pack: rest.slice(0, cut), v: rest.slice(cut + 1) } : null;
}

// ======================= manifest =======================

let manifest: AssetManifest | null = null;

async function getManifest(): Promise<AssetManifest | null> {
  if (!manifest) {
    const res = await (await caches.open(META)).match('manifest');
    manifest = res ? ((await res.json()) as AssetManifest) : null;
  }
  return manifest;
}

async function setManifest(m: AssetManifest): Promise<void> {
  manifest = m;
  await (await caches.open(META)).put('manifest', new Response(JSON.stringify(m)));
}

async function fetchManifest(): Promise<AssetManifest | null> {
  try {
    const res = await fetch(ASSETS + ASSET_MANIFEST, { cache: 'no-cache' });
    return res.ok ? ((await res.json()) as AssetManifest) : null;
  } catch {
    return null;
  }
}

// ======================= index (IndexedDB) =======================

interface Entry { url: string; pack: string; v: string; bytes: number; lastUsed: number }

let db: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  return (db ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('vltk-assets', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('entries', { keyPath: 'url' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

const index = new Map<string, Entry>();
let total = 0;
let loaded: Promise<void> | null = null;
const dirty = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushDone: Promise<void> | null = null;

function loadIndex(): Promise<void> {
  return (loaded ??= openDb().then(d => new Promise<void>(resolve => {
    const req = d.transaction('entries').objectStore('entries').getAll();
    req.onsuccess = () => {
      for (const e of req.result as Entry[]) { index.set(e.url, e); total += e.bytes; }
      resolve();
    };
    req.onerror = () => resolve();
  })).catch(() => undefined));
}

/** Write changed entries a little later, in one transaction (not on every request); resolves once written. */
function scheduleFlush(): Promise<void> {
  if (flushTimer) return flushDone!;
  flushDone = new Promise(resolve => {
    flushTimer = setTimeout(() => { flushTimer = null; void flush().then(resolve); }, 2000);
  });
  return flushDone;
}

async function flush(): Promise<void> {
  if (!dirty.size) return;
  const urls = [...dirty];
  dirty.clear();
  try {
    const d = await openDb();
    await new Promise<void>(resolve => {
      const tx = d.transaction('entries', 'readwrite');
      const store = tx.objectStore('entries');
      for (const url of urls) {
        const e = index.get(url);
        if (e) store.put(e); else store.delete(url);
      }
      tx.oncomplete = tx.onerror = tx.onabort = () => resolve();
    });
  } catch { /* storage refused: the index lasts as long as the worker */ }
}

function remember(e: Entry): void {
  const old = index.get(e.url);
  if (old) total -= old.bytes;
  index.set(e.url, e);
  total += e.bytes;
  dirty.add(e.url);
}

function forget(url: string): void {
  const e = index.get(url);
  if (!e) return;
  total -= e.bytes;
  index.delete(url);
  dirty.add(url);
}

// ======================= budget + cleanup =======================

let budgetOverride = 0;
let protectedPacks = new Set<string>();
let quota = 0;

async function budget(): Promise<number> {
  if (budgetOverride) return budgetOverride;
  if (!quota) quota = (await self.navigator.storage?.estimate?.())?.quota ?? 0;
  const mobile = /Android|iPhone|iPad|Mobile/i.test(self.navigator.userAgent);
  const cap = mobile ? 500 * 2 ** 20 : 2 * 2 ** 30;
  return quota ? Math.min(quota * (mobile ? 0.3 : 0.5), cap) : cap;
}

async function dropPack(pack: string): Promise<void> {
  for (const name of await caches.keys()) if (parseName(name)?.pack === pack) await caches.delete(name);
  for (const e of [...index.values()]) if (e.pack === pack) forget(e.url);
}

let cleaning: Promise<void> | null = null;
function cleanup(): Promise<void> {
  return (cleaning ??= (async () => {
    const limit = await budget();
    if (total <= limit) return;
    const target = limit * 0.85;
    // 1. Whole maps, least recently used first.
    const maps = new Map<string, number>();
    for (const e of index.values()) {
      if (e.pack.startsWith('map/') && !protectedPacks.has(e.pack)) maps.set(e.pack, Math.max(maps.get(e.pack) ?? 0, e.lastUsed));
    }
    for (const [pack] of [...maps].sort((a, b) => a[1] - b[1])) {
      if (total <= target) break;
      await dropPack(pack);
    }
    // 2. Single files of the sprite packs.
    if (total > target) {
      const files = [...index.values()].filter(e => LRU_PACKS.has(e.pack)).sort((a, b) => a.lastUsed - b.lastUsed);
      for (const e of files) {
        if (total <= target) break;
        await (await caches.open(cacheName(e.pack, e.v))).delete(e.url);
        forget(e.url);
      }
    }
    await flush();
  })().finally(() => { cleaning = null; }));
}

// ======================= caching =======================

async function store(cache: Cache, key: string, pack: string, v: string, res: Response): Promise<void> {
  const blob = await res.blob();
  await cache.put(key, new Response(blob, { status: res.status, statusText: res.statusText, headers: res.headers }));
  await loadIndex();
  remember({ url: key, pack, v, bytes: blob.size, lastUsed: Date.now() });
  if (total > (await budget())) await cleanup();
}

async function handle(event: FetchEvent, rel: string): Promise<Response> {
  const req = event.request;
  const m = await getManifest();
  const pack = packOf(rel);
  const current = m?.packs[pack]?.v;
  const v = new URL(req.url).searchParams.get('v') ?? current;
  if (!v || v !== current) return fetch(req);
  const key = ASSETS + rel;
  const cache = await caches.open(cacheName(pack, v));
  const hit = await cache.match(key);
  if (hit) {
    event.waitUntil(loadIndex().then(() => {
      const e = index.get(key);
      if (e) { e.lastUsed = Date.now(); dirty.add(key); }
      return scheduleFlush();
    }));
    return hit;
  }
  const res = await fetch(req);
  if (res.status === 200 && (res.type === 'basic' || res.type === 'cors')) {
    event.waitUntil(store(cache, key, pack, v, res.clone()).then(scheduleFlush));
  }
  return res;
}

/** Download every file of core (small) that is not cached yet. */
async function precacheCore(): Promise<void> {
  const core = (await getManifest())?.packs.core;
  if (!core?.files) return;
  const cache = await caches.open(cacheName('core', core.v));
  const todo: string[] = [];
  for (const f of core.files) if (!(await cache.match(ASSETS + f))) todo.push(f);
  let next = 0;
  await Promise.all(Array.from({ length: PRECACHE_PARALLEL }, async () => {
    while (next < todo.length) {
      const f = todo[next++];
      try {
        const res = await fetch(`${ASSETS}${f}?v=${core.v}`);
        if (res.ok) await store(cache, ASSETS + f, 'core', core.v, res);
      } catch { /* offline: fetched on first use instead */ }
    }
  }));
  await flush();
}

/** Drop every cache (and index entry) whose pack version is not the manifest's. */
async function dropStale(): Promise<void> {
  const m = await getManifest();
  if (!m) return;
  await loadIndex();
  for (const name of await caches.keys()) {
    const p = parseName(name);
    if (p && m.packs[p.pack]?.v !== p.v) await caches.delete(name);
  }
  for (const e of [...index.values()]) if (m.packs[e.pack]?.v !== e.v) forget(e.url);
  await flush();
}

// ======================= events =======================

self.addEventListener('install', event => {
  void self.skipWaiting(); // only versioned asset caches live here: a new worker can take over at once
  event.waitUntil((async () => {
    const m = await fetchManifest();
    if (m) await setManifest(m);
    await precacheCore();
  })().catch(() => undefined));
});

self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([self.clients.claim(), dropStale().catch(() => undefined)]));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(ASSETS) || req.headers.has('range')) return;
  const rel = decodeURIComponent(req.url.slice(ASSETS.length).split(/[?#]/)[0]);
  if (rel === ASSET_MANIFEST || rel.startsWith('music/')) return;
  event.respondWith(handle(event, rel));
});

async function stats(): Promise<CacheStats> {
  await loadIndex();
  const packs: Record<string, number> = {};
  for (const e of index.values()) packs[e.pack] = (packs[e.pack] ?? 0) + e.bytes;
  return { bytes: total, budget: await budget(), files: index.size, packs };
}

async function onMessage(msg: SwRequest): Promise<unknown> {
  switch (msg.type) {
    case 'manifest': {
      const old = await getManifest();
      if (JSON.stringify(old?.packs) === JSON.stringify(msg.manifest.packs)) return true;
      await setManifest(msg.manifest);
      await dropStale();
      await precacheCore();
      return true;
    }
    case 'protect':
      protectedPacks = new Set(msg.packs);
      return true;
    case 'budget':
      budgetOverride = msg.mb > 0 ? msg.mb * 2 ** 20 : 0;
      await cleanup();
      return true;
    case 'stats':
      return stats();
    case 'clear': {
      for (const name of await caches.keys()) if (parseName(name)) await caches.delete(name);
      await loadIndex();
      for (const url of [...index.keys()]) forget(url);
      await flush();
      await precacheCore();
      return true;
    }
  }
}

self.addEventListener('message', event => {
  const port = event.ports[0];
  const work = onMessage(event.data as SwRequest).then(
    reply => port?.postMessage({ ok: true, reply }),
    err => port?.postMessage({ ok: false, error: String(err) }),
  );
  event.waitUntil(work);
});
