/**
 * Skills of the original client -> data packs in packages/shared/src/skills (one folder per faction, plus
 * common/ and monsters/) and their effect art at 1:1 in public/assets/skill.
 *
 *   npm run gen:skills -w @vltk/client            (add -- --force to re-encode every sheet)
 *
 * Sources (the copy the game uses, see tools/jx/source.ts):
 *   settings/skills.txt            skill rows (style, missile layout, range, events, icon, level attribute names)
 *   settings/missles.txt           missiles (movement, lifetime, collision, fly / hit sprites)
 *   script/skill/<faction>.lua     level curves (SKILLS = { table = { attr = {{{1,20},{20,80}}} } })
 *   script/global/skills_table.lua what each faction learns at which tier (add_tw, add_sl, …)
 *
 * Writes skills.gen.ts / missiles.gen.ts (overwritten every run) and creates tuning.ts / index.ts next to them
 * only when missing, so hand tuning survives regeneration.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { updateManifest } from './jx/manifest.ts';
import { CLIENT_ROOT, listGameFiles, readGameFile, readTable, resolveFile, tcvn3 } from './jx/source.js';
import { HUASHAN_LEARN, HUASHAN_TEXT } from './data/huashan.js';
import { SUBSKILL_NAMES } from './data/subskill-names.js';
import { jxHash, resolveAny } from './jx/hashindex.js';
import { decodeSpr, unionBox, type Spr } from './jx/spr.js';
import { readLuaTable, type LuaTable, type LuaValue } from './jx/lua.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '..');
const PUBLIC = path.join(CLIENT, 'public/assets');
const SHARED_SKILLS = path.resolve(CLIENT, '../../packages/shared/src/skills');
const FX_TS = path.join(CLIENT, 'src/game/fx/fx.gen.ts');
const CACHE_FILE = path.join(HERE, '.cache/skills-meta.json');
const FORCE = process.argv.includes('--force');
const MAX_TEX = 4096;

const gbk = new TextDecoder('gbk');

// ======================= tables =======================

interface Table { header: string[]; latin: string[][]; gbk: string[][]; col: (name: string) => number }

function table(p: string): Table {
  const buf = readGameFile(p);
  const split = (t: string) => t.split(/\r?\n/).filter(l => l.length).map(l => l.split('\t'));
  const latin = split(buf.toString('latin1')), g = split(gbk.decode(buf));
  const header = latin[0].map(s => s.trim());
  return { header, latin: latin.slice(1), gbk: g.slice(1), col: name => header.indexOf(name) };
}

const SK = table('settings/skills.txt');
const MS = table('settings/missles.txt');

const cellOf = (t: Table, r: number, name: string, asGbk = false) => ((asGbk ? t.gbk : t.latin)[r]?.[t.col(name)] ?? '').trim();
const numOf = (t: Table, r: number, name: string, fallback = 0) => {
  const v = cellOf(t, r, name);
  if (v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const skillRow = new Map<number, number>();
SK.latin.forEach((_, r) => { const id = numOf(SK, r, 'SkillId', NaN); if (Number.isFinite(id) && !skillRow.has(id)) skillRow.set(id, r); });
const missileRow = new Map<number, number>();
MS.latin.forEach((_, r) => { const id = numOf(MS, r, 'MissleId', NaN); if (Number.isFinite(id) && !missileRow.has(id)) missileRow.set(id, r); });

// ======================= level curves (Lua) =======================

const luaCache = new Map<string, LuaTable | null>();
function luaSkills(script: string): LuaTable | null {
  if (luaCache.has(script)) return luaCache.get(script)!;
  let t: LuaTable | null = null;
  // Loose mod files (jx-origin/script/skill/huashan.lua is not in any PAK).
  const loose = path.join(CLIENT_ROOT, script.replace(/\\/g, '/').replace(/^\//, ''));
  const file = resolveFile(script) ?? resolveAny(script) ?? (fs.existsSync(loose) ? loose : null);
  if (file) {
    try { t = readLuaTable(fs.readFileSync(file).toString('latin1'), 'SKILLS'); }
    catch (e) { console.warn(`  lua ${script}: ${(e as Error).message}`); }
  }
  luaCache.set(script, t);
  return t;
}

type Curve = [number, number][];
function toCurve(v: LuaValue): Curve | null {
  if (!v || typeof v !== 'object') return null;
  const pts: Curve = [];
  for (let i = 1; v[String(i)] !== undefined; i++) {
    const p = v[String(i)];
    if (p && typeof p === 'object' && typeof p['1'] === 'number' && typeof p['2'] === 'number') pts.push([p['1'], p['2']]);
  }
  return pts.length ? pts : null;
}
function toAttr(v: LuaValue): [Curve | null, Curve | null, Curve | null] | null {
  if (!v || typeof v !== 'object') return null;
  const a: [Curve | null, Curve | null, Curve | null] = [toCurve(v['1']), toCurve(v['2']), toCurve(v['3'])];
  return a.some(Boolean) ? a : null;
}

// ======================= effect sheets =======================

/** [cell w, cell h, x of cell's left edge from the anchor, y of top edge, frames/dir, dirs, cols, blend (1 = add), sprite ms/frame, pages] */
type FxMeta = number[];
const cache: Record<string, FxMeta> = fs.existsSync(CACHE_FILE) && !FORCE ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : {};
const fxMeta: Record<string, FxMeta> = {};
const fxJobs = new Map<string, () => Promise<void>>();
const iconJobs = new Map<string, () => Promise<void>>();
const missingArt = new Set<string>();

/** Effect sprites by file name: a few table paths name the wrong folder (missles.txt points to spr/skill/补充/mag_npc_短毛.spr, the file
 * is in spr/skill/npc/). Used only when the name is unique under spr/skill. */
let skillSprByName: Map<string, string[]> | null = null;
const movedArt = new Set<string>();
function sprFile(p: string): string | null {
  const file = resolveFile(p) ?? resolveAny(p);
  if (file || !/^\\?spr\\skill\\/i.test(p)) return file;
  skillSprByName ??= listGameFiles('\\spr\\skill\\').reduce((m, k) => {
    const name = k.slice(k.lastIndexOf('\\') + 1);
    m.set(name, [...(m.get(name) ?? []), k]);
    return m;
  }, new Map<string, string[]>());
  const lower = p.toLowerCase(), same = skillSprByName.get(lower.slice(lower.lastIndexOf('\\') + 1));
  if (same?.length !== 1) return null; // only an unambiguous match
  movedArt.add(`${p} -> ${same[0]}`);
  return resolveFile(same[0]);
}

/** Queue an effect sprite; returns its sheet key or null when the client lacks the file. */
function fxSheet(gamePathStr: string): string | null {
  if (!gamePathStr || gamePathStr === '0') return null;
  const file = sprFile(gamePathStr);
  if (!file) { missingArt.add(gamePathStr); return null; }
  const key = `skill/fx/${jxHash(gamePathStr).toString(16).padStart(8, '0')}`;
  if (fxMeta[key] || fxJobs.has(key)) return key;
  const out = path.join(PUBLIC, `${key}.webp`);
  if (cache[key] && fs.existsSync(out)) { fxMeta[key] = cache[key]; return key; }
  fxJobs.set(key, async () => {
    const spr = decodeSpr(fs.readFileSync(file));
    const meta = await writeFxSheet(spr, out);
    fxMeta[key] = cache[key] = meta;
  });
  return key;
}

function iconSheet(gamePathStr: string): string | undefined {
  if (!gamePathStr) return undefined;
  const file = sprFile(gamePathStr);
  if (!file) { missingArt.add(gamePathStr); return undefined; }
  const key = `skill/icon/${jxHash(gamePathStr).toString(16).padStart(8, '0')}`;
  const out = path.join(PUBLIC, `${key}.webp`);
  if (!iconJobs.has(key) && (FORCE || !fs.existsSync(out))) {
    iconJobs.set(key, async () => {
      const spr = decodeSpr(fs.readFileSync(file));
      const f = spr.frames.find(fr => fr.w > 0);
      if (!f) return;
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await sharp(Buffer.from(f.rgba), { raw: { width: f.w, height: f.h, channels: 4 } }).webp({ lossless: true }).toFile(out);
    });
  }
  return key;
}

async function writeFxSheet(spr: Spr, out: string): Promise<FxMeta> {
  const dirs = Math.max(1, spr.directions);
  const per = Math.max(1, Math.floor(spr.frames.length / dirs));
  const total = per * dirs;
  const box = unionBox(spr.frames);
  // Anchor: the sprite's centre point; (0,0) means "the canvas centre" for these effects.
  const [ax, ay] = spr.centerX || spr.centerY ? [spr.centerX, spr.centerY] : [Math.round(spr.width / 2), Math.round(spr.height / 2)];
  const cols = Math.max(1, Math.min(total, Math.floor(MAX_TEX / box.w)));
  const rowsPerPage = Math.max(1, Math.floor(MAX_TEX / box.h));
  const perPage = cols * rowsPerPage;
  const pages = Math.ceil(total / perPage);
  // Additive art (black background): the SPR header flag, else (sprites outside missles.txt) fully opaque + dark.
  let opaque = 0, dark = 0, seen = 0;
  const greys = new Map<number, number>();
  for (const f of spr.frames) {
    for (let i = 0; i < f.rgba.length; i += 4) {
      if (!f.rgba[i + 3]) continue;
      seen++;
      if (f.rgba[i + 3] >= 224) opaque++;
      if (f.rgba[i] + f.rgba[i + 1] + f.rgba[i + 2] < 60) dark++;
      if (f.rgba[i] === f.rgba[i + 1] && f.rgba[i] === f.rgba[i + 2] && f.rgba[i] <= 16) greys.set(f.rgba[i], (greys.get(f.rgba[i]) ?? 0) + 1);
    }
  }
  const additive = spr.additive || (seen > 0 && opaque / seen >= 0.97 && dark / seen >= 0.15) ? 1 : 0;
  // Their "black" is the palette's darkest grey (4,4,4 or 8,8,8), not 0: added once it is invisible, but the fields that
  // stay up (Long Toàn Kiếm Khí, Ma Vân Kiếm Khí) overlap and every layer lifts the whole box. Take that level off.
  const floor = additive ? [...greys].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0 : 0;
  if (floor) {
    const lut = new Uint8Array(256);
    for (let v = 0; v < 256; v++) lut[v] = Math.round((Math.max(0, v - floor) * 255) / (255 - floor));
    for (const f of spr.frames) for (let i = 0; i < f.rgba.length; i += 4) {
      if (!f.rgba[i + 3]) continue;
      f.rgba[i] = lut[f.rgba[i]]; f.rgba[i + 1] = lut[f.rgba[i + 1]]; f.rgba[i + 2] = lut[f.rgba[i + 2]];
    }
  }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  for (let page = 0; page < pages; page++) {
    const count = Math.min(perPage, total - page * perPage);
    const W = Math.min(count, cols) * box.w, H = Math.ceil(count / cols) * box.h;
    const px = new Uint8Array(W * H * 4);
    for (let k = 0; k < count; k++) {
      const f = spr.frames[page * perPage + k];
      if (!f?.w) continue;
      const cx = (k % cols) * box.w + (f.x - box.x), cy = Math.floor(k / cols) * box.h + (f.y - box.y);
      for (let y = 0; y < f.h; y++) {
        const src = y * f.w * 4;
        px.set(f.rgba.subarray(src, src + f.w * 4), ((cy + y) * W + cx) * 4);
      }
    }
    const file = page ? out.replace(/\.webp$/, `.${page}.webp`) : out;
    await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 4 }).toFile(file);
  }
  return [box.w, box.h, box.x - ax, box.y - ay, per, dirs, cols, additive, spr.interval, pages];
}

/** "frames,dirs,interval" of missles.txt -> engine ticks per sprite frame. */
function ticksPerFrame(info: string, key: string | null): number {
  const [frames, dirs, interval] = info.split(',').map(Number);
  const meta = key ? fxMeta[key] ?? cache[key] : undefined;
  if (!frames || !meta) return Math.max(1, interval || 1);
  const ticks = (frames / Math.max(1, dirs || 1)) * Math.max(1, interval || 1);
  return Math.max(0.25, ticks / meta[4]);
}

// ======================= missiles =======================

const missiles = new Map<number, Record<string, unknown>>();
const STATUS = ['wait', 'fly', 'vanish', 'collide'] as const;

function missileDef(id: number): void {
  if (missiles.has(id)) return;
  const r = missileRow.get(id);
  if (r === undefined) { console.warn(`  missile ${id} not in missles.txt`); return; }
  const n = (k: string) => numOf(MS, r, k);
  const def: Record<string, unknown> = { id, name: tcvn3(cellOf(MS, r, 'MissleName')) };
  const put = (k: string, v: number) => { if (v) def[k] = v; };
  put('move', n('MoveKind'));
  put('height', n('MissleHeight'));
  put('collide', n('CollidRange'));
  if (n('IsRangeDmg')) def.rangeDmg = true;
  put('dmgRange', n('DmgRange'));
  put('dmgInterval', n('DmgInterval'));
  put('life', n('LifeTime'));
  put('speed', n('Speed'));
  put('zSpeed', n('Zspeed'));
  put('zAcc', n('Zacc'));
  if (n('LoopPlay')) def.loop = true;
  if (n('ColVanish')) def.colVanish = true;
  if (n('AutoExplode')) def.autoExplode = true;
  put('p1', n('Param1'));
  put('p2', n('Param2'));
  put('p3', n('Param3'));
  // Two art sets per status (AnimFileN / AnimFileBN); the first one is the normal effect.
  const fx: Record<string, { key: string; info: string }> = {};
  STATUS.forEach((status, i) => {
    for (const set of ['', 'B']) {
      const file = cellOf(MS, r, `AnimFile${set}${i + 1}`, true);
      if (!file || file === '0') continue;
      const key = fxSheet(file);
      if (key) { fx[status] = { key, info: cellOf(MS, r, `AnimFileInfo${set}${i + 1}`) }; break; }
    }
  });
  if (Object.keys(fx).length) def.fx = fx;
  missiles.set(id, def);
}

// ======================= skills =======================

const skills = new Map<number, Record<string, unknown>>();
/** Styles whose ChildSkillId is a missile (missiles, and the 14 "state + missile" rows); otherwise a skill. */
const MISSILE_STYLES = new Set([0, 14]);
/** Skill ids each skill references (child skill, events). */
function refsOf(r: number): number[] {
  const out: number[] = [];
  const style = numOf(SK, r, 'SkillStyle');
  const child = numOf(SK, r, 'ChildSkillId');
  if (!MISSILE_STYLES.has(style) && child > 0) out.push(child);
  for (const [flag, id] of [['StartEvent', 'StartSkillId'], ['FlyEvent', 'FlySkillId'], ['CollideEvent', 'CollidSkillId'], ['VanishedEvent', 'VanishedSkillId']]) {
    if (numOf(SK, r, flag) && numOf(SK, r, id) > 0) out.push(numOf(SK, r, id));
  }
  return out;
}

/**
 * Skills a skill calls through its level attributes: passive triggers (auto*skill = id * 256 + level), appended
 * skills (skill_appendskill = id) and level-gated layers (skill_<kind>event P3 = child skill id, e.g. Nhân Kiếm Hợp
 * Nhất's ring 162 from level 16, which no skills.txt column names).
 */
function attrRefs(def: Record<string, unknown>): number[] {
  const out: number[] = [];
  const attrs = (def.attrs ?? {}) as Record<string, [Curve | null, Curve | null, Curve | null]>;
  for (const [name, curves] of Object.entries(attrs)) {
    if (/^skill_(start|fly|collide|vanished)event$/.test(name)) {
      for (const [, id] of curves[2] ?? []) if (id > 0) out.push(id);
      continue;
    }
    const v = curves[0]?.[0]?.[1];
    if (!v) continue;
    if (/^auto\w*skill$/.test(name)) out.push(Math.floor(v / 256));
    else if (name === 'skill_appendskill') out.push(v);
  }
  return [...new Set(out)].filter(id => skillRow.has(id));
}

// ======================= state effects (StateSpecialId) =======================

/** settings/npcres/状态图形对照表.txt: StatusN -> sprite drawn on the character while a state lasts. */
const STATES = table('\\settings\\npcres\\状态图形对照表.txt');
const stateRow = new Map<number, number>();
STATES.latin.forEach((row, r) => { const m = /^Status(\d+)$/.exec(row[0]?.trim() ?? ''); if (m) stateRow.set(Number(m[1]), r); });
const PLACES: Record<string, string> = { Head: 'head', Body: 'body', Foot: 'foot' };

function stateFx(id: number): Record<string, unknown> | undefined {
  const r = stateRow.get(id);
  if (r === undefined) return undefined;
  const c = (i: number) => (STATES.gbk[r]?.[i] ?? '').trim();
  const key = c(1) && c(1) !== 'Special' ? fxSheet(c(1)) : null;
  if (!key) return undefined;
  const fx: Record<string, unknown> = { key, at: PLACES[c(2)] ?? 'body' };
  const from = Number(c(4)), to = Number(c(5));
  if (c(4) !== '' && c(5) !== '' && to > from) fx.behind = [from, to];
  return fx;
}

function skillDef(id: number): Record<string, unknown> | null {
  if (skills.has(id)) return skills.get(id)!;
  const r = skillRow.get(id);
  if (r === undefined) return null;
  const n = (k: string, fallback = 0) => numOf(SK, r, k, fallback);
  const text = HUASHAN_TEXT[id];
  const def: Record<string, unknown> = { id, name: text?.name ?? SUBSKILL_NAMES[id] ?? tcvn3(cellOf(SK, r, 'SkillName')) };
  const desc = text?.desc ?? tcvn3(cellOf(SK, r, 'SkillDesc'));
  if (desc) def.desc = desc;
  def.style = n('SkillStyle');
  // gamesetting.ini [SkillAttrib] line of the tooltip ("Võ công lưu phái: …", 9999 = trấn phái).
  if (n('Attrib') > 0) def.attrib = n('Attrib');
  if (n('IsExpSkill') > 0) def.expSkill = true;
  const put = (k: string, v: number, skip = 0) => { if (v !== skip) def[k] = v; };
  put('form', n('MisslesForm'));
  put('gen', n('MslsGenerate'));
  put('genData', n('MslsGenerateData'));
  put('child', n('ChildSkillId'));
  put('childNum', n('ChildSkillNum'));
  put('childLevel', n('ChildSkillLevel'));
  put('anim', n('CharAnimId'));
  put('radius', n('AttackRadius'));
  put('wait', n('WaitTime'));
  put('cooldown', n('TimePerCast'));
  if (n('IsMelee')) def.melee = true;
  put('weapon', n('EqtLimit', -2), -2);
  if (n('HorseLimit')) def.noHorse = true;
  put('p1', n('Param1'));
  put('p2', n('Param2'));
  put('series', n('Series', -1), -1);
  put('maxLevel', n('MaxLevel'));
  put('reqLevel', n('ReqLevel'));
  const target = (n('TargetEnemy') ? 1 : 0) | (n('TargetAlly') ? 2 : 0) | (n('TargetSelf') ? 4 : 0);
  put('target', target);
  if (n('IsAura')) def.aura = true;
  if (n('IsPhysical')) def.physical = true;
  // Hit check against Né tránh (IsUseAR) and chance to make the target flinch (DoHurt, %): formulas/damage.ts, effects.ts.
  if (n('IsUseAR')) def.useAR = true;
  put('doHurt', n('DoHurt'));
  put('costType', n('SkillCostType'));
  const events: Record<string, number> = {};
  if (n('StartEvent') && n('StartSkillId') > 0) events.start = n('StartSkillId');
  if (n('FlyEvent') && n('FlySkillId') > 0) { events.fly = n('FlySkillId'); events.flyTicks = Math.max(1, n('FlyEventTime')); }
  if (n('CollideEvent') && n('CollidSkillId') > 0) events.collide = n('CollidSkillId');
  if (n('VanishedEvent') && n('VanishedSkillId') > 0) events.vanish = n('VanishedSkillId');
  if (Object.keys(events).length) def.events = events;
  const pre = fxSheet(cellOf(SK, r, 'PreCastSpr', true));
  if (pre) def.pre = pre;
  const sfx = n('StateSpecialId') > 0 ? stateFx(n('StateSpecialId')) : undefined;
  if (sfx) def.stateFx = sfx;
  const icon = iconSheet(cellOf(SK, r, 'SkillIcon', true));
  if (icon) def.icon = icon;

  const script = cellOf(SK, r, 'LvlSetScript', true);
  const lua = script ? luaSkills(script) : null;
  const attrs: Record<string, unknown> = {};
  for (let i = 1; i <= 20; i++) {
    const name = cellOf(SK, r, `LvlSetting${i}`), data = cellOf(SK, r, `LvlData${i}`);
    if (!name || !data || !lua) continue;
    const tbl = lua[data];
    const a = tbl && typeof tbl === 'object' ? toAttr(tbl[name]) : null;
    if (a) attrs[name] = a;
  }
  if (Object.keys(attrs).length) def.attrs = attrs;
  if (MISSILE_STYLES.has(def.style as number) && (def.child as number) > 0) missileDef(def.child as number);
  skills.set(id, def);
  return def;
}

// ======================= packs =======================

const FACTIONS: [code: string, id: string, name: string][] = [
  ['sl', 'shaolin', 'Thiếu Lâm'], ['tw', 'tianwang', 'Thiên Vương'], ['tm', 'tangmen', 'Đường Môn'], ['wu', 'wudu', 'Ngũ Độc'],
  ['em', 'emei', 'Nga My'], ['cy', 'cuiyan', 'Thúy Yên'], ['gb', 'gaibang', 'Cái Bang'], ['tr', 'tianren', 'Thiên Nhẫn'],
  ['wd', 'wudang', 'Võ Đang'], ['kl', 'kunlun', 'Côn Lôn'], ['hs', 'huashan', 'Hoa Sơn'],
];

/**
 * "Kỹ năng thất truyền" (script/skill/advancedskill.lua, ReqLevel 120, level tied to Kinh mạch): one per faction;
 * each fires a state skill (1230–1239) when hit / attacking / nearly dead. Hoa Sơn's is Hạo Nhiên Chi Khí.
 */
const LOST: Record<string, number> = { sl: 1220, tw: 1221, wu: 1222, tm: 1223, em: 1224, cy: 1225, tr: 1226, gb: 1227, wd: 1228, kl: 1229, hs: 1370 };
/** Skills every faction gets (skills_table.lua add_misc): Khinh công, Vũ Lộ Xuân Phong, Kiếp Phú Tế Bần. */
const COMMON_LEARN = [210, 397, 400];

interface Tier { label: string; level: number; skills: number[] }

/** Tiers of one faction from skills_table.lua `add_<code>(lvl)`. */
function learnTable(code: string): Tier[] {
  const src = gbk.decode(readGameFile('script/global/skills_table.lua'));
  const start = src.indexOf(`function add_${code}(`);
  if (start < 0) return [];
  const end = src.indexOf('\nend', start);
  const body = src.slice(start, end);
  const tiers = new Map<string, Tier>();
  let gate = 10;
  for (const line of body.split('\n')) {
    const g = /lvl\s*>=\s*(\d+)/.exec(line);
    if (g) gate = Number(g[1]);
    const m = /AddMagic\((\d+)/.exec(line);
    if (!m) continue;
    const id = Number(m[1]);
    if (!skillRow.has(id)) continue;
    const comment = line.includes('--') ? line.slice(line.indexOf('--')) : '';
    const note = /[（(](入门|镇派|\d+级)/.exec(comment)?.[1];
    let label: string, level: number;
    if (note === '入门') [label, level] = ['Nhập môn', 10];
    else if (note === '镇派') [label, level] = ['Trấn phái', 61];
    else if (note) { level = parseInt(note, 10); label = `Cấp ${level}`; }
    else if (gate <= 10) [label, level] = ['Nhập môn', 10];
    else if (gate >= 90) [label, level] = ['Cấp 90', 90];
    else { level = gate - 10; label = `Cấp ${level}`; }
    const t = tiers.get(label) ?? { label, level, skills: [] };
    if (!t.skills.includes(id)) t.skills.push(id);
    tiers.set(label, t);
  }
  // "Trấn phái" sorts right after Cấp 60 and is learned at 60 too.
  return [...tiers.values()].sort((a, b) => a.level - b.level).map(t => ({ ...t, level: t.level === 61 ? 60 : t.level }));
}

// Every skill referenced by another one (child or event): not a root the player learns.
const referenced = new Set<number>();
for (const r of skillRow.values()) for (const id of refsOf(r)) referenced.add(id);
// GBK names read as TCVN3 leave Latin-1 symbols behind (º, ¯, Ê…); the Vietnamese letters in that range are fine.
const LATIN1_VI = 'àáâãèéêìíòóôõùúýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝ';
const cleanName = (s: string) =>
  ![...s].some(ch => ch.charCodeAt(0) >= 0xa0 && ch.charCodeAt(0) <= 0xff && !LATIN1_VI.includes(ch)) && !/^Kỹ năng phụ/.test(s);

/** 120 / 150 skills: not in skills_table.lua; roots in the faction's script with that ReqLevel. */
function highTiers(id: string, known: Set<number>): Tier[] {
  const out: Tier[] = [];
  // Real skill names have spaces; "Xxx_Yyy" rows are sub-effects; later copies repeat an existing name.
  const names = new Set([...known].map(k => tcvn3(cellOf(SK, skillRow.get(k)!, 'SkillName'))));
  for (const level of [120, 150]) {
    const list: number[] = [];
    for (const [sid, r] of skillRow) {
      if (known.has(sid) || referenced.has(sid)) continue;
      if (numOf(SK, r, 'ReqLevel') !== level) continue;
      const script = cellOf(SK, r, 'LvlSetScript', true).toLowerCase();
      if (script !== `\\script\\skill\\${id}.lua`) continue;
      const name = tcvn3(cellOf(SK, r, 'SkillName'));
      if (!cleanName(name) || name.includes('_') || !name.includes(' ') || names.has(name)) continue;
      names.add(name);
      list.push(sid);
    }
    if (list.length) out.push({ label: `Cấp ${level}`, level, skills: list.sort((a, b) => a - b) });
  }
  return out;
}

const owner = new Map<number, string>();
/** Assign a root and everything it references to a pack (first pack wins). */
function collect(roots: number[], pack: string): number[] {
  const order: number[] = [];
  const stack = [...roots];
  while (stack.length) {
    const id = stack.shift()!;
    if (owner.has(id)) continue;
    const def = skillDef(id);
    if (!def) { console.warn(`  skill ${id} (${pack}) not in skills.txt`); continue; }
    owner.set(id, pack);
    order.push(id);
    stack.push(...refsOf(skillRow.get(id)!), ...attrRefs(def));
  }
  return order;
}

interface Pack { dir: string; id: string; name: string; varName: string; skills: number[]; learn?: Tier[] }
const packs: Pack[] = [];
for (const [code, id, name] of FACTIONS) {
  const learn = code === 'hs' ? HUASHAN_LEARN.map(t => ({ ...t, skills: [...t.skills] })) : learnTable(code);
  const known = new Set(learn.flatMap(t => t.skills));
  if (code !== 'hs') learn.push(...highTiers(id, known));
  if (LOST[code]) learn.push({ label: 'Thất truyền', level: 120, skills: [LOST[code]] });
  learn.sort((a, b) => a.level - b.level);
  const roots = learn.flatMap(t => t.skills);
  packs.push({ dir: `factions/${id}`, id, name, varName: id, skills: collect(roots, id), learn });
}
// Basic attacks (players without a usable skill, many monsters) and the ngũ hành basic attacks.
packs.push({
  dir: 'common', id: 'common', name: 'Thông dụng', varName: 'common',
  skills: collect([1, 2, 53, 445, 446, 447, 448, 449, ...COMMON_LEARN], 'common'),
  learn: [{ label: 'Thông dụng', level: 1, skills: COMMON_LEARN }],
});
// Skills only monsters use: npcs.txt Skill1–4 of the hand-made monsters and of every monster in a spawn file
// (packages/shared/spawns/*.json, tools/gen-spawns.ts / the dev tool).
function spawnMonsterSkills(): number[] {
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/shared/spawns');
  if (!fs.existsSync(dir)) return [];
  const ids = new Set<number>();
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
    const file = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    for (const z of file.zones ?? []) for (const [id] of z.monsters ?? []) ids.add(id);
  }
  const npcs = readTable('\\settings\\npcs.txt', 'latin1');
  const out: number[] = [];
  for (const id of ids) {
    const row = npcs.rows[id];
    if (!row) continue;
    for (let k = 1; k <= 4; k++) { const sk = Number(row[npcs.header.indexOf(`Skill${k}`)]); if (sk > 0) out.push(sk); }
  }
  return [...new Set(out)];
}
packs.push({ dir: 'monsters', id: 'monsters', name: 'Quái', varName: 'monsters', skills: collect([196, 197, ...spawnMonsterSkills()], 'monsters') });

// ======================= art =======================

async function runJobs(jobs: Map<string, () => Promise<void>>, label: string): Promise<void> {
  const list = [...jobs.values()];
  let done = 0;
  const worker = async () => {
    while (list.length) {
      await list.shift()!();
      if (++done % 25 === 0) process.stdout.write(`\r  ${label} ${done}/${jobs.size}`);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  if (jobs.size) process.stdout.write(`\r  ${label} ${jobs.size}/${jobs.size}\n`);
}

const t0 = Date.now();
// Control states are not learned skills, so their art must be collected explicitly.
const stunFx = stateFx(50);
if (!stunFx) throw new Error('Missing Status50 stun effect');
console.log(`skills: ${skills.size}, missiles: ${missiles.size}, fx sheets: ${fxJobs.size} new / ${Object.keys(fxMeta).length} cached, icons: ${iconJobs.size} new`);
await runJobs(fxJobs, 'fx');
await runJobs(iconJobs, 'icons');
fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));

// Ticks per frame need the sheet frame counts, so missiles get their fx refs now.
for (const m of missiles.values()) {
  const fx = m.fx as Record<string, { key: string; info: string }> | undefined;
  if (!fx) continue;
  m.fx = Object.fromEntries(Object.entries(fx).map(([status, f]) => [status, { key: f.key, tpf: +ticksPerFrame(f.info, f.key).toFixed(2) }]));
}

// ======================= write =======================

const HEADER = '// Generated by apps/client/tools/gen-skills.ts from the original client tables. Do not edit by hand';
const lines = (list: unknown[]) => `[\n${list.map(x => `  ${JSON.stringify(x)}`).join(',\n')}\n]`;

function writeIfMissing(file: string, text: string): void {
  if (!fs.existsSync(file)) fs.writeFileSync(file, text);
}

for (const p of packs) {
  const dir = path.join(SHARED_SKILLS, p.dir);
  fs.mkdirSync(dir, { recursive: true });
  const up = p.dir.split('/').map(() => '..').join('/');
  const defs = p.skills.map(id => skills.get(id)!).filter(Boolean);
  fs.writeFileSync(path.join(dir, 'skills.gen.ts'), `${HEADER} —
// put hand changes in tuning.ts next to this file. Pack "${p.id}" (${p.name}): ${defs.length} skills.
import type { LearnTier, SkillDef } from '${up}/core/types.js';

export const SKILLS: SkillDef[] = ${lines(defs)};

/** Learning tiers (skills_table.lua; 120 / 150 from skills.txt ReqLevel). */
export const LEARN: LearnTier[] = ${p.learn ? lines(p.learn) : '[]'};
`);
  writeIfMissing(path.join(dir, 'tuning.ts'), `import type { SkillTuning } from '${up}/core/types.js';

/**
 * Hand adjustments for ${p.name} (kept when gen:skills runs again). Keys are original skill ids, e.g.
 *   29: { damage: 1.2 },          // Trảm Long Quyết hits 20% harder
 *   40: { disabled: 'Chưa hỗ trợ' },
 */
export const TUNING: Record<number, SkillTuning> = {};
`);
  writeIfMissing(path.join(dir, 'index.ts'), `import type { SkillPack } from '${up}/core/types.js';
import { LEARN, SKILLS } from './skills.gen.js';
import { TUNING } from './tuning.js';

export const ${p.varName}: SkillPack = { id: '${p.id}', name: '${p.name}', skills: SKILLS, learn: LEARN, tuning: TUNING };
`);
}

fs.writeFileSync(path.join(SHARED_SKILLS, 'common/missiles.gen.ts'), `${HEADER}. ${missiles.size} missiles.
import type { MissileDef } from '../core/types.js';

export const MISSILES: MissileDef[] = ${lines([...missiles.values()].sort((a, b) => (a.id as number) - (b.id as number)))};
`);

// Tooltip texts of the original client: settings/magicdesc.ini [Descript] and gamesetting.ini lines.
{
  const iniSections = (file: string) => {
    const out: Record<string, Record<string, string>> = {};
    let sec = '';
    for (const raw of readGameFile(file).toString('latin1').split(/\r?\n/)) {
      const line = raw.trim();
      const m = /^\[(.+)\]$/.exec(line);
      if (m) { sec = m[1]; out[sec] ??= {}; continue; }
      const eq = line.indexOf('=');
      if (!sec || eq <= 0 || line.startsWith(';') || line.startsWith('//')) continue;
      out[sec][line.slice(0, eq).trim()] = tcvn3(line.slice(eq + 1));
    }
    return out;
  };
  const md = iniSections('\\settings\\magicdesc.ini').Descript ?? {};
  const gs = iniSections('\\settings\\gamesetting.ini');
  const desc = Object.fromEntries(Object.entries(md).filter(([, v]) => v.trim()));
  fs.writeFileSync(path.join(SHARED_SKILLS, 'core/magicdesc.gen.ts'), `${HEADER} (settings/magicdesc.ini, settings/gamesetting.ini).
/**
 * Attribute -> tooltip template. Tokens: #d<i><s> number, #f<i> frames as seconds (/18), #l<i> skill name,
 * #s<i> ngũ hành, #k<i> cost kind, #x<i> sex, #m<i> faction; <i>: 1/2/3 = P1/P2/P3, 4/A = P1/256, 7 = P1%256,
 * 6 = P3/256, 9 = P3%256; <s>: '+' sign, '~' minus when positive, else plain. <color=x>…<color> colours text.
 */
export const MAGIC_DESC: Record<string, string> = ${JSON.stringify(desc, null, 0).replace(/","/g, '",\n  "')};

/** gamesetting.ini [SkillAttrib]: SkillDef.attrib -> "Võ công lưu phái: …". */
export const SKILL_ATTRIB_TEXT: Record<string, string> = ${JSON.stringify(gs.SkillAttrib ?? {})};
/** gamesetting.ini [WeaponLimit]: weapon (-2 = F2, -1 = F1) -> text. */
export const WEAPON_LIMIT_TEXT: Record<string, string> = ${JSON.stringify(gs.WeaponLimit ?? {})};
/** gamesetting.ini [HorseLimit]. */
export const HORSE_LIMIT_TEXT: Record<string, string> = ${JSON.stringify(gs.HorseLimit ?? {})};
`);
}

fs.mkdirSync(path.dirname(FX_TS), { recursive: true });
const usedFx = Object.fromEntries(Object.entries(fxMeta).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(FX_TS, `${HEADER}.
// Skill effect sheets in public/assets/<key>.webp (+ .1.webp … when paged):
// [cell w, cell h, cell left from anchor, cell top from anchor, frames/dir, dirs, cols, additive, sprite ms/frame, pages]
export const SKILL_FX: Record<string, readonly number[]> = ${JSON.stringify(usedFx)};
export const CONTROL_FX = ${JSON.stringify({ stun: stunFx })} as const;
`);

// ======================= report =======================

const WEAPON: Record<number, string> = { [-2]: 'mọi', [-1]: 'tay không', 0: 'kiếm', 1: 'đao', 2: 'côn', 3: 'thương', 4: 'chùy', 5: 'song đao', 100: 'phi tiêu', 101: 'phi đao', 102: 'tụ tiễn' };
const STYLE = ['bắn', 'cận chiến', 'trạng thái', 'bị động', 'gọi NPC'];
for (const p of packs) {
  console.log(`\n${p.name} (${p.skills.length} skills incl. children)`);
  for (const t of p.learn ?? []) {
    console.log(`  ${t.label}: ${t.skills.map(id => {
      const d = skills.get(id)!;
      return `${d.name}[${id} ${STYLE[d.style as number] ?? d.style}${d.weapon !== undefined ? ' ' + WEAPON[d.weapon as number] : ''}]`;
    }).join(', ')}`);
  }
}
const size = Object.keys(fxMeta).reduce((n, k) => n + (fs.existsSync(path.join(PUBLIC, `${k}.webp`)) ? fs.statSync(path.join(PUBLIC, `${k}.webp`)).size : 0), 0);
if (movedArt.size) console.log(`art found in another folder: ${movedArt.size}\n  ${[...movedArt].join('\n  ')}`);
console.log(`\nfx sheets: ${Object.keys(fxMeta).length} (${(size / 1e6).toFixed(1)} MB), missing art: ${missingArt.size}${missingArt.size ? '\n  ' + [...missingArt].slice(0, 20).join('\n  ') : ''}`);
updateManifest(['skill']);
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
