/**
 * Original sounds -> web audio, and the tables that say when to play them.
 *
 *   npm run gen:sounds -w @vltk/client            incremental (existing files are kept)
 *   npm run gen:sounds -w @vltk/client -- --force
 *
 * Sources (jx-origin):
 *   settings/skills.txt          ManCastSnd / FMCastSnd: cast sound per skill, male / female caster
 *   settings/missles.txt         SndFile1–4: missile wait / fly / vanish / collide (same order as AnimFile1–4)
 *   settings/npcres/npc动作声音表.txt   monster / NPC: Wound, Die, Attack1, Attack2, Magic
 *   settings/npcres/主角动作声音表.txt  player actions (MainMan / MainLady)
 *   settings/music/musicset.txt  map id -> background music (+ volume); the mp3 files are loose in music/
 * Outputs:
 *   public/assets/sound/**.mp3   sound effects (mono 22 kHz MP3, ~10x smaller than the WAVs)
 *   public/assets/music/*.mp3    background music (copied as is)
 *   src/game/audio/sounds.gen.ts
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { updateManifest } from './jx/manifest.ts';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { CLIENT_ROOT, readTable, resolveFile } from './jx/source.ts';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '..');
const PUBLIC = path.join(CLIENT, 'public/assets');
const FORCE = process.argv.includes('--force');
const CONCURRENCY = 8;

/** game path -> asset key (public/assets/<key>.mp3); queued for conversion. */
const wanted = new Map<string, string>();
const missing = new Set<string>();

/** 32-bit FNV-1a, for file names that are not ASCII (冰爆.wav). */
function fnv(s: string): string {
  let h = 0x811c9dc5;
  for (const b of Buffer.from(s, 'utf8')) h = Math.imul(h ^ b, 0x01000193) >>> 0;
  return h.toString(16).padStart(8, '0');
}

/** Sound reference ("\sound\skill\x.wav" or a bare "x.wav" under \sound\) -> asset key, or '' when absent. */
function sound(ref: string | undefined): string {
  let p = (ref ?? '').trim();
  if (!p || p === '0' || !/\.wav$/i.test(p)) return '';
  if (!p.includes('\\')) p = `\\sound\\${p}`;
  if (!p.startsWith('\\')) p = `\\${p}`;
  const known = wanted.get(p);
  if (known !== undefined) return known;
  if (!resolveFile(p)) { missing.add(p); wanted.set(p, ''); return ''; }
  const rel = p.replace(/^\\sound\\/i, '').replace(/\.wav$/i, '').split('\\');
  const name = rel.pop()!;
  const safe = /^[\x20-\x7e]+$/.test(name) ? name.toLowerCase().replace(/[^a-z0-9_-]/g, '_') : `x${fnv(name)}`;
  const key = ['sound', ...rel.map(d => d.toLowerCase()), safe].join('/');
  wanted.set(p, key);
  return key;
}

const col = (header: string[], name: string) => header.indexOf(name);

// ---------------- skills: cast sound ----------------
const skillCast: Record<number, [string, string]> = {};
{
  const t = readTable('\\settings\\skills.txt');
  const id = col(t.header, 'SkillId'), man = col(t.header, 'ManCastSnd'), lady = col(t.header, 'FMCastSnd');
  for (const r of t.rows) {
    const n = Number(r[id]);
    if (!Number.isFinite(n) || skillCast[n]) continue;
    const m = sound(r[man]), f = sound(r[lady]);
    // Keep missing genders empty: borrowing the other voice makes male/female casts sound wrong.
    if (m || f) skillCast[n] = [m, f];
  }
}

// ---------------- missiles: wait / fly / vanish / collide ----------------
const missileSnd: Record<number, [string, string, string, string]> = {};
{
  const t = readTable('\\settings\\missles.txt');
  const id = col(t.header, 'MissleId');
  const cols = [1, 2, 3, 4].map(k => col(t.header, `SndFile${k}`));
  for (const r of t.rows) {
    const n = Number(r[id]);
    if (!Number.isFinite(n) || missileSnd[n]) continue;
    const s = cols.map(c => sound(r[c])) as [string, string, string, string];
    if (s.some(Boolean)) missileSnd[n] = s;
  }
}

// ---------------- monsters / NPCs ----------------
type NpcSnd = Partial<Record<'wound' | 'die' | 'attack' | 'attack2' | 'magic', string>>;
const npcSnd: Record<string, NpcSnd> = {};
{
  const t = readTable('\\settings\\npcres\\npc动作声音表.txt');
  const keys = { Wound: 'wound', Die: 'die', Attack1: 'attack', Attack2: 'attack2', Magic: 'magic' } as const;
  for (const r of t.rows) {
    const res = r[0]?.trim();
    if (!res) continue;
    const set: NpcSnd = {};
    for (const [c, k] of Object.entries(keys)) { const s = sound(r[col(t.header, c)]); if (s) set[k] = s; }
    if (Object.keys(set).length) npcSnd[res] = set;
  }
}

// ---------------- player actions ----------------
type PlayerSnd = Record<string, string>;
const playerSnd: { m: PlayerSnd; f: PlayerSnd } = { m: {}, f: {} };
{
  const t = readTable('\\settings\\npcres\\主角动作声音表.txt');
  /** Original action -> what the game calls it. */
  const keys: Record<string, string> = {
    FreeWound: 'wound', FreeDie: 'die', FreeAttack: 'attack', MeleeWCut: 'cut', MeleeWPuncture: 'puncture',
    DoubleWPound: 'pound', DartThrow: 'throw', FreeMagic: 'magic', RideWound: 'rideWound', RideDie: 'rideDie',
    RideCut: 'rideCut', RideMagic: 'rideMagic', NormalRun: 'run', RideRun: 'rideRun',
  };
  for (const r of t.rows) {
    const k = keys[r[0]?.trim()];
    if (!k) continue;
    const m = sound(r[1]), f = sound(r[2]);
    if (m) playerSnd.m[k] = m;
    if (f) playerSnd.f[k] = f;
  }
}

// ---------------- map music ----------------
const mapMusic: Record<number, [string, number]> = {};
const musicFiles = new Set<string>();
{
  const t = readTable('\\settings\\music\\musicset.txt');
  for (const r of t.rows) {
    const id = Number(r[0]), file = (r[1] ?? '').trim();
    if (!Number.isFinite(id) || !file) continue;
    const name = path.basename(file.replace(/\\/g, '/')).toLowerCase();
    if (!fs.existsSync(path.join(CLIENT_ROOT, 'music', name))) { missing.add(file); continue; }
    musicFiles.add(name);
    mapMusic[id] = [`music/${name.replace(/\.mp3$/, '')}`, Math.max(0, Math.min(100, Number(r[2]) || 100))];
  }
}

// ---------------- convert / copy ----------------
const t0 = Date.now();
const jobs = [...wanted].filter(([, key]) => key).map(([game, key]) => async () => {
  const out = path.join(PUBLIC, `${key}.mp3`);
  if (!FORCE && fs.existsSync(out)) return 0;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await run('ffmpeg', ['-v', 'error', '-y', '-i', resolveFile(game)!, '-ac', '1', '-ar', '22050', '-b:a', '64k', out]);
  return 1;
});
let next = 0, made = 0;
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  while (next < jobs.length) { const done = await jobs[next++](); made += done; }
}));
let copied = 0;
for (const name of musicFiles) {
  const out = path.join(PUBLIC, 'music', name);
  if (!FORCE && fs.existsSync(out)) continue;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(path.join(CLIENT_ROOT, 'music', name), out);
  copied++;
}

const ts = `// Generated by tools/gen-sounds.ts from the original sound tables. Do not edit by hand.
/* eslint-disable */
/** Asset keys: public/assets/<key>.mp3. */

/** skill id -> cast sound [male caster, female caster] (skills.txt ManCastSnd / FMCastSnd). */
export const SKILL_CAST: Record<number, [string, string]> = ${JSON.stringify(skillCast)};

/** missile id -> [wait, fly, vanish, collide] (missles.txt SndFile1–4); '' = none. */
export const MISSILE_SND: Record<number, [string, string, string, string]> = ${JSON.stringify(missileSnd)};

/** npc res -> action sounds (npc动作声音表.txt). */
export const NPC_SND: Record<string, Partial<Record<'wound' | 'die' | 'attack' | 'attack2' | 'magic', string>>> = ${JSON.stringify(npcSnd)};

/** Player action sounds by sex (主角动作声音表.txt). */
export const PLAYER_SND: { m: Record<string, string>; f: Record<string, string> } = ${JSON.stringify(playerSnd)};

/** map id -> [music key, volume 0–100] (settings/music/musicset.txt). */
export const MAP_MUSIC: Record<number, [string, number]> = ${JSON.stringify(mapMusic)};
`;
fs.mkdirSync(path.join(CLIENT, 'src/game/audio'), { recursive: true });
fs.writeFileSync(path.join(CLIENT, 'src/game/audio/sounds.gen.ts'), ts);

const size = (dir: string) => fs.existsSync(dir) ? fs.readdirSync(dir, { recursive: true }).reduce((n, f) => {
  const p = path.join(dir, String(f));
  return n + (fs.statSync(p).isFile() ? fs.statSync(p).size : 0);
}, 0) : 0;
console.log(`skills with a cast sound: ${Object.keys(skillCast).length}, missiles: ${Object.keys(missileSnd).length}, npc res: ${Object.keys(npcSnd).length}, maps with music: ${Object.keys(mapMusic).length}`);
console.log(`sounds: ${jobs.length} (${made} converted now), ${(size(path.join(PUBLIC, 'sound')) / 2 ** 20).toFixed(1)} MB; music: ${musicFiles.size} files (${copied} copied), ${(size(path.join(PUBLIC, 'music')) / 2 ** 20).toFixed(0)} MB`);
if (missing.size) console.log(`missing in the client (skipped): ${missing.size}, e.g. ${[...missing].slice(0, 6).join(', ')}`);
updateManifest(['core', 'music']);
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
