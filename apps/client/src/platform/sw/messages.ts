import type { AssetManifest } from '@vltk/shared/src/assets';

/** Page → Service Worker messages (platform/assetCache.ts ↔ platform/sw/sw.ts). Replies go back on the message port. */
export type SwRequest =
  /** The page loaded this manifest: drop the caches of packs whose version changed, download the new core. */
  | { type: 'manifest'; manifest: AssetManifest }
  /** Packs the cleanup must never drop (the map being played, its town). */
  | { type: 'protect'; packs: string[] }
  /** Test override of the cache budget in MB (`?cacheBudget=50`); 0 = automatic. */
  | { type: 'budget'; mb: number }
  | { type: 'stats' }
  /** Empty every asset cache (core is downloaded again). */
  | { type: 'clear' };

export interface CacheStats {
  bytes: number;
  budget: number;
  files: number;
  /** bytes per pack */
  packs: Record<string, number>;
}
