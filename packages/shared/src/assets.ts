/**
 * Asset packs and their versions (docs/performance/05-cache-va-phien-ban.md §2). Every file under
 * apps/client/public/assets belongs to one pack; a pack's version is a hash of its content, written into
 * public/assets/manifest.json by the gen:* tools (apps/client/tools/jx/manifest.ts). The client adds `?v=<version>`
 * to every asset URL so caches can keep files for a year, and the Service Worker keeps one cache per pack + version.
 *
 * Pure (no DOM, no Node): used by the client, its Service Worker and the tools.
 */

export interface AssetPack {
  /** Content hash of the pack (changes only when a file of the pack changes). */
  v: string;
  bytes: number;
  /** Files of the pack (relative to assets/); only for `core`, which the Service Worker downloads up front. */
  files?: string[];
}

export interface AssetManifest {
  format: 1;
  packs: Record<string, AssetPack>;
}

/** File name of the manifest inside assets/. */
export const ASSET_MANIFEST = 'manifest.json';

/** Folders of the `core` pack (small, needed by the first screens; always kept in the cache). */
export const CORE_DIRS = ['ui', 'portraits', 'sound'] as const;

/** Packs other than core and the maps (one folder each). */
export const PLAIN_PACKS = ['char', 'npc', 'skill', 'items', 'music'] as const;

/** Path relative to assets/ ('assets/ui/x.webp', '/assets/ui/x.webp?v=1' and 'ui/x.webp' all give 'ui/x.webp'). */
export function assetPath(path: string): string {
  return path.split(/[?#]/)[0].replace(/^\/+/, '').replace(/^assets\//, '');
}

/** Pack of an asset path: 'maps/37/ground/1_2.webp' → 'map/37', 'ui/jade.webp' → 'core', 'char/man/x.webp' → 'char'. */
export function packOf(path: string): string {
  const parts = assetPath(path).split('/');
  if (parts[0] === 'maps' && parts.length > 2) return `map/${parts[1]}`;
  if ((CORE_DIRS as readonly string[]).includes(parts[0])) return 'core';
  return parts[0];
}

/** Folders (relative to assets/) that make up a pack. */
export function packDirs(pack: string): string[] {
  if (pack === 'core') return [...CORE_DIRS];
  if (pack.startsWith('map/')) return [`maps/${pack.slice(4)}`];
  return [pack];
}
