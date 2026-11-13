/**
 * public/assets/manifest.json: version (content hash) of every asset pack (docs/performance/05-cache-va-phien-ban.md §2,
 * packs in packages/shared/src/assets.ts). Each gen:* tool calls updateManifest() for the packs it wrote; `gen:manifest`
 * rebuilds any pack from disk.
 *
 * Version = SHA-1 of the sorted list "path + SHA-1 of the file": running a tool again without changing anything keeps
 * the version, so players keep their cache. File hashes are remembered by size + mtime in tools/.cache/asset-hashes.json
 * (not in git: it is about this machine's files), so only new / rewritten files are read again.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ASSET_MANIFEST, PLAIN_PACKS, packDirs, type AssetManifest, type AssetPack,
} from '../../../../packages/shared/src/assets.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ASSETS_DIR = path.resolve(HERE, '../../public/assets');
const MANIFEST_FILE = path.join(ASSETS_DIR, ASSET_MANIFEST);
const HASHES_FILE = path.resolve(HERE, '../.cache/asset-hashes.json');

/** rel path -> [size, mtimeMs, sha1] */
type HashCache = Record<string, [number, number, string]>;

const sha1 = (data: string | Buffer) => crypto.createHash('sha1').update(data).digest('hex');

function readJson<T>(file: string, fallback: T): T {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')) as T; } catch { return fallback; }
}

/** Write through a temporary file: a reader never sees half a file. */
function writeAtomic(file: string, text: string): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, file);
}

export function readManifest(): AssetManifest {
  const m = readJson<AssetManifest | null>(MANIFEST_FILE, null);
  return m?.format === 1 && m.packs ? m : { format: 1, packs: {} };
}

/** Every pack present on disk: core, the plain folders, one per map folder. */
export function packsOnDisk(): string[] {
  const maps = fs.existsSync(path.join(ASSETS_DIR, 'maps'))
    ? fs.readdirSync(path.join(ASSETS_DIR, 'maps'), { withFileTypes: true }).filter(d => d.isDirectory()).map(d => `map/${d.name}`)
    : [];
  return ['core', ...PLAIN_PACKS, ...maps.sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)))];
}

function listFiles(dir: string): string[] {
  const abs = path.join(ASSETS_DIR, dir);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter(d => d.isFile() && !d.name.startsWith('.') && !d.name.endsWith('.tmp'))
    .map(d => path.relative(ASSETS_DIR, path.join(d.parentPath, d.name)).split(path.sep).join('/'));
}

function hashPack(pack: string, cache: HashCache, seen: Set<string>): AssetPack | null {
  const files = packDirs(pack).flatMap(listFiles).sort();
  if (!files.length) return null;
  let bytes = 0;
  const lines: string[] = [];
  for (const rel of files) {
    const st = fs.statSync(path.join(ASSETS_DIR, rel));
    let entry = cache[rel];
    if (!entry || entry[0] !== st.size || entry[1] !== st.mtimeMs) {
      entry = [st.size, st.mtimeMs, sha1(fs.readFileSync(path.join(ASSETS_DIR, rel)))];
      cache[rel] = entry;
    }
    seen.add(rel);
    bytes += st.size;
    lines.push(`${rel}\0${entry[2]}`);
  }
  return { v: sha1(lines.join('\n')).slice(0, 10), bytes, ...(pack === 'core' ? { files } : {}) };
}

/** Recompute the given packs from disk and store them in manifest.json (a pack with no file is removed). */
export function updateManifest(packs: string[], quiet = false): AssetManifest {
  const t0 = Date.now();
  const cache = readJson<HashCache>(HASHES_FILE, {});
  const manifest = readManifest();
  const seen = new Set<string>();
  const changed: string[] = [];
  for (const pack of packs) {
    const before = manifest.packs[pack]?.v;
    const entry = hashPack(pack, cache, seen);
    if (entry) manifest.packs[pack] = entry;
    else delete manifest.packs[pack];
    if (entry?.v !== before) changed.push(pack);
  }
  // Forget hashes of files that disappeared from the packs just walked.
  for (const rel of Object.keys(cache)) {
    if (!seen.has(rel) && packs.some(p => packDirs(p).some(d => rel.startsWith(`${d}/`)))) delete cache[rel];
  }
  manifest.packs = Object.fromEntries(Object.entries(manifest.packs).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true })));
  writeAtomic(MANIFEST_FILE, `${JSON.stringify(manifest, null, 1)}\n`);
  writeAtomic(HASHES_FILE, JSON.stringify(cache));
  if (!quiet) {
    const what = packs.length > 6 ? `${packs.length} packs` : packs.join(', ');
    console.log(`manifest: ${what} (${changed.length} changed${changed.length && changed.length <= 6 ? `: ${changed.join(', ')}` : ''}) in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  return manifest;
}
