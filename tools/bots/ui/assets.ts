import { assetPath, packOf, type AssetManifest } from '@vltk/shared';
let manifest: AssetManifest | null = null;
export function setManifest(value: AssetManifest): void { manifest = value; }
export function assetUrl(path: string): string {
  const rel = assetPath(path); const version = manifest?.packs[packOf(rel)]?.v;
  return `/assets/${rel}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
}
