import type { AssetManifest } from '@vltk/shared';
import type { CacheStats, SwRequest } from './sw/messages';

export type { CacheStats };

/**
 * Page side of the asset cache (docs/performance/05-cache-va-phien-ban.md §5): registers /sw.js (platform/sw/sw.ts) in
 * the production web build and talks to it. Dev (`npm run dev`) and the Desktop / Mobile wrappers (assets on their own
 * disk, §6; not http(s)) do without: every call is then a no-op and stats() gives null.
 */
const supported = (): boolean =>
  import.meta.env.PROD && typeof navigator !== 'undefined' && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol);

let ready: Promise<ServiceWorker | null> = Promise.resolve(null);

function ask<T>(msg: SwRequest): Promise<T | null> {
  return ready.then(worker => {
    if (!worker) return null;
    return new Promise<T | null>(resolve => {
      const channel = new MessageChannel();
      const timer = setTimeout(() => resolve(null), 30_000);
      channel.port1.onmessage = e => {
        clearTimeout(timer);
        const data = e.data as { ok: boolean; reply?: T };
        resolve(data.ok ? (data.reply ?? null) : null);
      };
      worker.postMessage(msg, [channel.port2]);
    });
  }).catch(() => null);
}

export const assetCache = {
  get enabled(): boolean { return supported(); },

  /** Once at start-up with the manifest the page uses; `base` = absolute asset root when it is not assets/. */
  start(manifest: AssetManifest | null, base?: string): void {
    if (!supported()) return;
    const url = base ? `sw.js?base=${encodeURIComponent(base)}` : 'sw.js';
    ready = navigator.serviceWorker.register(url)
      .then(() => navigator.serviceWorker.ready)
      .then(reg => reg.active)
      .catch(() => null);
    if (manifest) void ask({ type: 'manifest', manifest });
    const budget = Number(new URLSearchParams(location.search).get('cacheBudget'));
    if (budget > 0) void ask({ type: 'budget', mb: budget });
  },

  /** Packs the cleanup must keep (the map being played and its town). */
  protect(packs: string[]): void {
    void ask({ type: 'protect', packs });
  },

  stats(): Promise<CacheStats | null> {
    return supported() ? ask<CacheStats>({ type: 'stats' }) : Promise.resolve(null);
  },

  clear(): Promise<unknown> {
    return ask({ type: 'clear' });
  },

  /** Ask the browser not to evict our storage on its own (once, after entering the game). */
  persist(): void {
    if (!supported()) return;
    void navigator.storage?.persisted?.().then(done => (done ? true : navigator.storage.persist())).catch(() => undefined);
  },
};
