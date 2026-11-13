/**
 * Rebuild public/assets/manifest.json from disk (docs/performance/05-cache-va-phien-ban.md §2). The gen:* tools keep it
 * up to date by themselves; run this when it is missing or out of step (files copied by hand, a tool interrupted).
 *
 *   npm run gen:manifest -w @vltk/client               every pack (the first run reads every file: minutes on /mnt)
 *   npm run gen:manifest -w @vltk/client -- core map/37
 */
import { packsOnDisk, updateManifest } from './jx/manifest.ts';

const args = process.argv.slice(2);
const packs = args.length ? args : packsOnDisk();
const m = updateManifest(packs);
const total = Object.values(m.packs).reduce((n, p) => n + p.bytes, 0);
console.log(`${Object.keys(m.packs).length} packs, ${(total / 2 ** 20).toFixed(0)} MB`);
