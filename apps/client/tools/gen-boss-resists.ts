// SHXT NPC resistance data only; no sprites/assets are regenerated.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GOLDEN_BOSS_CONFIG } from '../../../packages/shared/src/bosses/config.js';
import { readTable, readGameFile, resolveFile } from './jx/source.js';
const t = readTable('settings/npcs.txt', 'latin1');
const fields = { phys: 'PhysicsResist', cold: 'ColdResist', fire: 'FireResist', light: 'LightResist', poison: 'PoisonResist' };
// Check the source formula rather than guessing A|B semantics.
const lib = readGameFile('script/npclevelscript/lib.lua').toString('latin1');
if (!/floor\(k\*x\+c\)/.test(lib)) throw new Error('Unsupported SHXT Linear formula');
const data: Record<string, unknown> = {};
for (const b of GOLDEN_BOSS_CONFIG.bosses) {
  const row = t.rows[b.id];
  if (!row) { console.warn(`No SHXT source: ${b.id} ${b.name}`); continue; }
  const cell = (name: string) => row[t.header.indexOf(name)];
  if (!cell('LevelScript')?.toLowerCase().endsWith('makeboss.lua')) throw new Error(`Unsupported LevelScript: ${b.id}`);
  const coefficients: Record<string, number[]> = {}, caps: Record<string, number> = {};
  for (const [kind, col] of Object.entries(fields)) {
    const raw = cell(col)?.split('|');
    if (!raw || raw.length !== 2 || raw.some(x => !x.trim() || !Number.isFinite(Number(x)))) throw new Error(`Invalid ${col}: ${b.id}`);
    coefficients[kind] = raw.map(Number);
    const cap = cell(col + 'Max');
    if (!cap?.trim() || !Number.isFinite(Number(cap))) throw new Error(`Invalid cap: ${b.id}`);
    caps[kind] = Number(cap);
  }
  data[b.id] = { coefficients, caps };
}
const target = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/shared/src/bosses/resistance-data.json');
fs.writeFileSync(target, JSON.stringify(data, null, 2) + '\n');
console.log(`Generated ${Object.keys(data).length} profiles from ${resolveFile('settings/npcs.txt')}`);
