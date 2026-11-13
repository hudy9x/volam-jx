import { ASSET_MANIFEST, assetPath, packOf, type AssetManifest } from '@vltk/shared';

/**
 * The one door to asset URLs (docs/performance/05-cache-va-phien-ban.md §3): every file under public/assets is asked
 * for through assetUrl(), which adds the version of its pack (`?v=`, from assets/manifest.json) so HTTP caches and the
 * Service Worker can keep it for good. Without a manifest (not generated yet) URLs carry no version.
 *
 * `base` per platform: Web = 'assets' or a CDN (VITE_ASSET_BASE); a Desktop / Mobile wrapper serves the same paths
 * from its own disk (§6). Same files, same paths: callers never know where they come from.
 */
let base = ((import.meta.env.VITE_ASSET_BASE as string | undefined) ?? 'assets').replace(/\/$/, '');
let manifest: AssetManifest = { format: 1, packs: {} };

/** Set once at start-up (app/App.ts), before anything is drawn. */
export function initAssets(m: AssetManifest | null, assetBase?: string): void {
  if (m?.format === 1 && m.packs) manifest = m;
  if (assetBase) base = assetBase.replace(/\/$/, '');
}

export const assetManifest = (): AssetManifest => manifest;

/** URL of the manifest itself (never versioned: always asked again). */
export const manifestUrl = (): string => `${base}/${ASSET_MANIFEST}`;

/** 'ui/jade.webp' or 'assets/ui/jade.webp' → 'assets/ui/jade.webp?v=3f9a1c'. */
export function assetUrl(path: string): string {
  const rel = assetPath(path);
  const v = manifest.packs[packOf(rel)]?.v;
  return v ? `${base}/${rel}?v=${v}` : `${base}/${rel}`;
}
