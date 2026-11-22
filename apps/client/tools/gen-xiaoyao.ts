/**
 * Extracts Tiêu Dao (逍遥 / xiaoyao) assets & data from volam-3005 (updatejx16.pak + Client/Settings + Server/script/skill)
 * into standalone overlay *.gen.ts files so the 11 SHXT factions remain untouched.
 *
 *   npm run gen:xiaoyao -w @vltk/client
 *   VOLAM_3005=/Users/hudy/ws/volam-3005 JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT npm run gen:xiaoyao -w @vltk/client
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { PakReader } from './jx/pak.js';
import { readLuaTable, type LuaTable, type LuaValue } from './jx/lua.js';
import { decodeSpr, unionBox, type Spr } from './jx/spr.js';
import { tcvn3 } from './jx/source.js';
import { resolveAny } from './jx/hashindex.js';
import { updateManifest } from './jx/manifest.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLIENT = path.resolve(HERE, '..');
const PUBLIC = path.join(CLIENT, 'public/assets');
const SHARED = path.resolve(CLIENT, '../../packages/shared/src');
const VOLAM_3005 = path.resolve(process.env.VOLAM_3005 ?? '/Users/hudy/ws/volam-3005');
const SETTINGS = path.join(VOLAM_3005, 'Client/Settings');
const SERVER_SKILLS = path.join(VOLAM_3005, 'Server/script/skill');
const MAX_TEX = 4096;
const CONCURRENCY = 8;
const FORCE = process.argv.includes('--force');

const gbk = new TextDecoder('gbk');
const pak16 = new PakReader(path.join(VOLAM_3005, 'Client/data/updatejx16.pak'));

// ======================= helpers =======================

const npcresByGbk = new Map<string, string>();
for (const f of fs.readdirSync(path.join(SETTINGS, 'npcres'))) {
  npcresByGbk.set(gbk.decode(Buffer.from(f, 'latin1')), path.join(SETTINGS, 'npcres', f));
}

function readTextTable(filePath: string): { header: string[]; latin: string[][]; gbk: string[][] } {
  const buf = fs.readFileSync(filePath);
  const split = (s: string) => s.split(/\r?\n/).filter(Boolean).map(l => l.split('\t'));
  const latin = split(buf.toString('latin1'));
  const g = split(gbk.decode(buf));
  return { header: latin[0].map(s => s.trim()), latin: latin.slice(1), gbk: g.slice(1) };
}

function readSprBuffer(gamePath: string): Buffer | null {
  const norm = gamePath.trim().replace(/\//g, '\\').replace(/^([^\\])/, '\\$1');
  const fromPak = pak16.readSpr(norm);
  if (fromPak) return fromPak;
  const fromShxt = resolveAny(norm);
  if (fromShxt && fs.existsSync(fromShxt)) return fs.readFileSync(fromShxt);
  return null;
}

const jobs: Array<() => Promise<void>> = [];
async function runJobs(): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      await job();
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  jobs.length = 0;
}

// ======================= 1. Skills & Missiles & FX =======================

const SK = readTextTable(path.join(SETTINGS, 'Skills.txt'));
const MS = readTextTable(path.join(SETTINGS, 'Missles.txt'));
const skCol = (n: string) => SK.header.indexOf(n);
const msCol = (n: string) => MS.header.indexOf(n);
const skCell = (r: number, n: string, asGbk = false) => ((asGbk ? SK.gbk : SK.latin)[r]?.[skCol(n)] ?? '').trim();
const skNum = (r: number, n: string, fb = 0) => { const v = skCell(r, n); const x = Number(v); return v !== '' && Number.isFinite(x) ? x : fb; };
const msCell = (r: number, n: string, asGbk = false) => ((asGbk ? MS.gbk : MS.latin)[r]?.[msCol(n)] ?? '').trim();
const msNum = (r: number, n: string, fb = 0) => { const v = msCell(r, n); const x = Number(v); return v !== '' && Number.isFinite(x) ? x : fb; };

const xyLua = readLuaTable(fs.readFileSync(path.join(SERVER_SKILLS, 'xiaoyao.lua'), 'latin1'), 'SKILLS');
const advLua = readLuaTable(fs.readFileSync(path.join(SERVER_SKILLS, 'advancedskill.lua'), 'latin1'), 'SKILLS');

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

const fxMeta: Record<string, number[]> = {};
const queuedFx = new Set<string>();

function queueFxSheet(gamePath: string, key: string, opts?: { forceDirs?: number }): string | null {
  if (queuedFx.has(key)) return key;
  const buf = readSprBuffer(gamePath);
  if (!buf) {
    console.warn(`  [warn] missing fx spr: ${gamePath}`);
    return null;
  }
  queuedFx.add(key);
  const spr = decodeSpr(buf);
  const dirs = opts?.forceDirs ?? spr.directions;
  const per = Math.max(1, Math.floor(spr.frames.length / dirs));
  const used = spr.frames.slice(0, per * dirs);
  const box = unionBox(used);
  const cols = Math.max(1, Math.min(per, Math.floor(MAX_TEX / box.w)));
  const rowsPerPage = Math.max(1, Math.floor(MAX_TEX / box.h));
  const pp = cols * rowsPerPage;
  const total = per * dirs;
  const pages = Math.max(1, Math.ceil(total / pp));
  const meta = [box.w, box.h, box.x - spr.centerX, box.y - spr.centerY, per, dirs, cols, spr.additive ? 1 : 0, spr.interval, pages];
  fxMeta[key] = meta;

  const firstOut = path.join(PUBLIC, `${key}.webp`);
  if (!FORCE && fs.existsSync(firstOut)) return key;

  jobs.push(async () => {
    for (let p = 0; p < pages; p++) {
      const start = p * pp;
      const count = Math.min(pp, total - start);
      const rows = Math.ceil(count / cols);
      const W = Math.min(count, cols) * box.w;
      const H = rows * box.h;
      const px = Buffer.alloc(W * H * 4);
      for (let i = 0; i < count; i++) {
        const fr = used[start + i];
        if (!fr?.w) continue;
        const cx = (i % cols) * box.w + fr.x - box.x;
        const cy = Math.floor(i / cols) * box.h + fr.y - box.y;
        for (let y = 0; y < fr.h; y++) {
          const src = y * fr.w * 4;
          px.set(fr.rgba.subarray(src, src + fr.w * 4), ((cy + y) * W + cx) * 4);
        }
      }
      const out = path.join(PUBLIC, `${key}${p ? `.${p}` : ''}.webp`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 4 }).toFile(out);
    }
  });
  return key;
}

function queueIcon(gamePath: string, key: string): string | null {
  const out = path.join(PUBLIC, `${key}.webp`);
  if (!FORCE && fs.existsSync(out)) return key;
  const buf = readSprBuffer(gamePath);
  if (!buf) {
    console.warn(`  [warn] missing icon spr: ${gamePath}`);
    return null;
  }
  const spr = decodeSpr(buf);
  const fr = spr.frames[0];
  if (!fr?.w || !fr?.h) return null;
  jobs.push(async () => {
    const W = spr.width || fr.w;
    const H = spr.height || fr.h;
    const px = Buffer.alloc(W * H * 4);
    for (let y = 0; y < fr.h; y++) {
      const dy = fr.y + y;
      if (dy < 0 || dy >= H) continue;
      for (let x = 0; x < fr.w; x++) {
        const dx = fr.x + x;
        if (dx < 0 || dx >= W) continue;
        const s = (y * fr.w + x) * 4;
        const d = (dy * W + dx) * 4;
        px[d] = fr.rgba[s]; px[d + 1] = fr.rgba[s + 1]; px[d + 2] = fr.rgba[s + 2]; px[d + 3] = fr.rgba[s + 3];
      }
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 4 }).toFile(out);
  });
  return key;
}

// Verified Xiaoyao state FX overrides (fixing missing 242/243 -> 253/254 in updatejx16.pak)
const STATE_FX_MAP: Record<number, { spr: string; key: string; at: 'head' | 'body' | 'foot' }> = {
  242: { spr: '\\spr\\skill\\xiaoyao\\啖炙持觞.spr', key: 'skill/xiaoyao/st_253', at: 'body' },
  253: { spr: '\\spr\\skill\\xiaoyao\\啖炙持觞.spr', key: 'skill/xiaoyao/st_253', at: 'body' },
  243: { spr: '\\spr\\skill\\xiaoyao\\逍遥羽.spr', key: 'skill/xiaoyao/st_254', at: 'body' },
  254: { spr: '\\spr\\skill\\xiaoyao\\逍遥羽.spr', key: 'skill/xiaoyao/st_254', at: 'body' },
  192: { spr: '\\spr\\skill\\门派进阶\\土.spr', key: 'skill/xiaoyao/st_192', at: 'body' },
};

// Missile direction overrides (M645 header D=1 but AnimFileInfo = 320,16,1)
const MISSILE_FORCE_DIRS: Record<number, number> = { 645: 16 };

// Extract Xiaoyao missiles (275 buff carrier + 637..649)
const xiaoyaoMissiles: any[] = [];
const neededMissileIds = new Set([275, 637, 638, 639, 640, 641, 642, 644, 645, 646, 647, 648, 649]);

for (let r = 0; r < MS.latin.length; r++) {
  const id = msNum(r, 'MissleId', NaN);
  if (!neededMissileIds.has(id)) continue;
  const move = msNum(r, 'MoveKind');
  const height = msNum(r, 'MissleHeight');
  const collide = msNum(r, 'CollidRange', 1);
  const rangeDmg = msNum(r, 'IsRangeDmg') === 1;
  const dmgRange = msNum(r, 'DmgRange');
  const dmgInterval = msNum(r, 'DmgInterval');
  const life = msNum(r, 'LifeTime', 1);
  const speed = msNum(r, 'Speed');
  const zSpeed = msNum(r, 'ZSpeed');
  const zAcc = msNum(r, 'ZAcc');
  const loop = msNum(r, 'LoopPlay') === 1;
  const colVanish = msNum(r, 'ColVanish') === 1;
  const autoExplode = msNum(r, 'AutoExplode') === 1;

  const fx: Record<string, { key: string; tpf: number }> = {};
  const slots: Array<[string, string, string]> = [
    ['wait', 'AnimFile1', 'AnimFileInfo1'],
    ['fly', 'AnimFile2', 'AnimFileInfo2'],
    ['vanish', 'AnimFile3', 'AnimFileInfo3'],
    ['collide', 'AnimFile4', 'AnimFileInfo4'],
  ];
  for (const [slot, fCol, infoCol] of slots) {
    const sprPath = msCell(r, fCol, true);
    if (!sprPath) continue;
    const info = msCell(r, infoCol).split(',').map(Number);
    const tpf = info[2] > 0 ? info[2] : 1;
    const forceDirs = slot === 'fly' ? MISSILE_FORCE_DIRS[id] : undefined;
    const key = queueFxSheet(sprPath, `skill/xiaoyao/m${id}_${slot}`, forceDirs ? { forceDirs } : undefined);
    if (key) fx[slot] = { key, tpf };
  }

  const m: any = { id, name: tcvn3(msCell(r, 'MissleName')) || `m${id}` };
  if (move) m.move = move;
  if (height) m.height = height;
  if (collide !== 1) m.collide = collide;
  if (rangeDmg) m.rangeDmg = true;
  if (dmgRange) m.dmgRange = dmgRange;
  if (dmgInterval) m.dmgInterval = dmgInterval;
  if (life) m.life = life;
  if (speed) m.speed = speed;
  if (zSpeed) m.zSpeed = zSpeed;
  if (zAcc) m.zAcc = zAcc;
  if (loop) m.loop = true;
  if (colVanish) m.colVanish = true;
  if (autoExplode) m.autoExplode = true;
  if (Object.keys(fx).length) m.fx = fx;
  xiaoyaoMissiles.push(m);
}

// Extract Xiaoyao skills (2114..2143, excluding 2135 plain attack which is covered by common/1)
const XIAOYAO_SKILL_IDS = new Set([
  2114, 2115, 2116, 2117, 2118, 2119, 2120, 2121, 2122, 2123,
  2124, 2125, 2126, 2127, 2128, 2129, 2130, 2131, 2132, 2133, 2134,
  2136, 2137, 2138, 2139, 2140, 2141, 2142, 2143,
]);

const xiaoyaoSkills: any[] = [];
for (let r = 0; r < SK.latin.length; r++) {
  const id = skNum(r, 'SkillId', NaN);
  if (!XIAOYAO_SKILL_IDS.has(id)) continue;
  const name = tcvn3(skCell(r, 'SkillName')).trim();
  const desc = tcvn3(skCell(r, 'SkillDesc')).trim();
  const style = skNum(r, 'SkillStyle');
  const form = skNum(r, 'MisslesForm');
  const gen = skNum(r, 'MslsGenerate');
  const genData = skNum(r, 'MslsGenerateData');
  const child = skNum(r, 'ChildSkillId');
  const childNum = skNum(r, 'ChildSkillNum');
  const childLevel = skNum(r, 'ChildSkillLevel');
  const anim = skNum(r, 'CharAnimId');
  const radius = skNum(r, 'AttackRadius');
  const wait = skNum(r, 'WaitTime');
  const cooldown = skNum(r, 'TimePerCast');
  const melee = skNum(r, 'IsMelee') === 1;
  const weapon = skNum(r, 'EqtLimit', -2);
  const noHorse = skNum(r, 'HorseLimit') === 1;
  const p1 = skNum(r, 'Param1');
  const p2 = skNum(r, 'Param2');
  const series = skNum(r, 'Series', -1);
  const maxLevel = skNum(r, 'MaxLevel');
  const reqLevel = skNum(r, 'ReqLevel');
  const target = (skNum(r, 'TargetEnemy') ? 1 : 0) | (skNum(r, 'TargetAlly') ? 2 : 0) | (skNum(r, 'TargetSelf') ? 4 : 0);
  const aura = skNum(r, 'IsAura') === 1;
  const physical = skNum(r, 'IsPhysical') === 1;
  const costType = skNum(r, 'SkillCostType');
  const attrib = skNum(r, 'Attrib');
  const expSkill = skNum(r, 'IsExpSkill') === 1;
  const useAR = skNum(r, 'IsUseAR') === 1;
  const doHurt = skNum(r, 'DoHurt');

  const events: Record<string, number> = {};
  const startEv = skNum(r, 'StartEvent') ? skNum(r, 'StartSkillId') : 0;
  const flyEv = skNum(r, 'FlyEvent') ? skNum(r, 'FlySkillId') : 0;
  const flyTicks = skNum(r, 'FlyEventTime');
  const colEv = skNum(r, 'CollideEvent') ? skNum(r, 'CollidSkillId') : 0;
  const vanEv = skNum(r, 'VanishedEvent') ? skNum(r, 'VanishedSkillId') : 0;
  if (startEv) events.start = startEv;
  if (flyEv) { events.fly = flyEv; if (flyTicks) events.flyTicks = flyTicks; }
  if (colEv) events.collide = colEv;
  if (vanEv) events.vanish = vanEv;

  // PreCastSpr
  const preSpr = skCell(r, 'PreCastSpr', true);
  let pre: string | undefined;
  if (preSpr) {
    const k = preSpr.includes('kl_16_') ? 'skill/xiaoyao/pre_kl16' : `skill/xiaoyao/pre_${id}`;
    pre = queueFxSheet(preSpr, k) ?? undefined;
  }

  // Icon
  const iconSpr = skCell(r, 'SkillIcon', true);
  let icon: string | undefined;
  if (iconSpr && iconSpr.toLowerCase().endsWith('.spr')) {
    icon = queueIcon(iconSpr, `skill/xiaoyao/ic_${id}`) ?? undefined;
  }

  // StateFx
  const stateId = skNum(r, 'StateSpecialId');
  let stateFx: { key: string; at: 'head' | 'body' | 'foot' } | undefined;
  if (stateId && STATE_FX_MAP[stateId]) {
    const info = STATE_FX_MAP[stateId];
    const k = queueFxSheet(info.spr, info.key);
    if (k) stateFx = { key: k, at: info.at };
  }

  // Lua level attributes
  const scriptPath = skCell(r, 'LvlSetScript').toLowerCase();
  const luaTable: LuaTable | null = scriptPath.includes('advancedskill') ? advLua : scriptPath.includes('xiaoyao') ? xyLua : null;
  const attrs: Record<string, [Curve | null, Curve | null, Curve | null]> = {};
  if (luaTable) {
    for (let i = 1; i <= 20; i++) {
      const attrName = skCell(r, `LvlSetting${i}`);
      const dataKey = skCell(r, `LvlData${i}`);
      if (!attrName || !dataKey) continue;
      if (attrName === 'skill_desc' || attrName === 'addskillexp1') continue;
      const entry = luaTable[dataKey];
      if (!entry || typeof entry !== 'object') continue;
      const curve = toAttr(entry[attrName]);
      if (curve) attrs[attrName] = curve;
    }
  }

  const s: any = { id, name, style };
  if (desc) s.desc = desc;
  if (form) s.form = form;
  if (gen) s.gen = gen;
  if (genData) s.genData = genData;
  if (child) s.child = child;
  if (childNum) s.childNum = childNum;
  if (childLevel) s.childLevel = childLevel;
  if (anim) s.anim = anim;
  if (radius) s.radius = radius;
  if (wait) s.wait = wait;
  if (cooldown) s.cooldown = cooldown;
  if (melee) s.melee = true;
  if (weapon !== -2) s.weapon = weapon;
  if (noHorse) s.noHorse = true;
  if (p1) s.p1 = p1;
  if (p2) s.p2 = p2;
  if (series >= 0) s.series = series;
  if (maxLevel) s.maxLevel = maxLevel;
  if (reqLevel) s.reqLevel = reqLevel;
  if (target) s.target = target;
  if (aura) s.aura = true;
  if (physical) s.physical = true;
  if (costType) s.costType = costType;
  if (Object.keys(events).length) s.events = events;
  if (pre) s.pre = pre;
  if (icon) s.icon = icon;
  if (stateFx) s.stateFx = stateFx;
  if (Object.keys(attrs).length) s.attrs = attrs;
  if (attrib) s.attrib = attrib;
  if (expSkill) s.expSkill = true;
  if (useAR) s.useAR = true;
  if (doHurt) s.doHurt = doHurt;
  xiaoyaoSkills.push(s);
}

const LEARN = [
  { label: 'Cấp 10', level: 10, skills: [2114, 2115, 2136, 2137] },
  { label: 'Cấp 20', level: 20, skills: [2116] },
  { label: 'Cấp 30', level: 30, skills: [2118, 2138] },
  { label: 'Cấp 40', level: 40, skills: [2120, 2140] },
  { label: 'Cấp 50', level: 50, skills: [2121, 2122] },
  { label: 'Trấn phái', level: 60, skills: [2123] },
  { label: 'Cấp 90', level: 90, skills: [2124, 2141] },
  { label: 'Cấp 120', level: 120, skills: [2127] },
  { label: 'Cấp 150', level: 150, skills: [2129, 2142] },
  { label: 'Cấp 180', level: 180, skills: [2132] },
];

// ======================= 2. Guqin Items (range-3-1..10) & all 5 lyre SPR icons =======================

const RW = readTextTable(path.join(SETTINGS, 'item/rangeweapon.txt'));
const xiaoyaoItems: any[] = [];
const LYRE_SPRS: Array<[string, string]> = [
  ['\\spr\\item\\equip\\closeweapon\\obj-lyre01.spr', 'items/obj-lyre01'],
  ['\\spr\\item\\equip\\closeweapon\\obj-lyre02.spr', 'items/obj-lyre02'],
  ['\\spr\\item\\equip\\closeweapon\\obj-lyre03.spr', 'items/obj-lyre03'],
  ['\\spr\\item\\equip\\closeweapon\\obj-lyre04.spr', 'items/obj-lyre04'],
  ['\\spr\\item\\equip\\weapon\\obj-lyre05.spr', 'items/obj-lyre05'],
];
const guqinIcons = LYRE_SPRS.map(([spr, key]) => queueIcon(spr, key) ?? key);
queueIcon('\\spr\\item\\equip\\weapon\\obj-sword56.spr', 'items/obj-sword56');

// Assign Guqin visual tiers (251..254) and 5 icons (obj-lyre01..05) across levels 1..10
const guqinLookForLevel = (lv: number) => (lv <= 3 ? 251 : lv <= 6 ? 252 : lv <= 8 ? 253 : 254);
const guqinIconForLevel = (lv: number) => guqinIcons[Math.min(guqinIcons.length - 1, Math.floor((lv - 1) / 2))];
const GUQIN_NAMES = [
  'Mộc Cầm', 'Thanh Trúc Cầm', 'Ngô Đồng Cầm', 'Lục Ỷ Cầm', 'Tiêu Vĩ Cầm',
  'Hiệu Chung Cầm', 'Nhiễu Lương Cầm', 'Cửu Tiêu Hoàn Bội', 'Phục Hy Thức Cầm', 'Tiêu Dao Cổ Cầm',
];

for (let i = 0; i < RW.latin.length; i++) {
  const r = RW.latin[i];
  const particular = Number(r[3]);
  const level = Number(r[11]);
  if (particular !== 3 || !(level >= 1 && level <= 10)) continue;
  const num = (c: number) => parseInt((r[c] ?? '').trim(), 10);
  const price = num(10) || level * 500;
  const w = num(6) || 1;
  const h = num(7) || 4;
  // Base damage scale matching internal magic weapon (attr 28 = attackrating_v in SHXT; also add weapondamagemin/max for plain attack & tooltip)
  const arVal = num(13) || level * 4;
  const dmgMin = 4 + level * 4;
  const dmgMax = 8 + level * 7;
  const magicMin = 10 + level * 15;
  const magicMax = 20 + level * 25;
  const desc = tcvn3((r[8] ?? '').replace(/^"|"$/g, '')).trim();
  const base: [string, number, number][] = [
    ['weapondamagemin_v', dmgMin, dmgMin],
    ['weapondamagemax_v', dmgMax, dmgMax],
    ['attackrating_v', arVal, arVal],
    ['addlightingmagic_v', magicMin, magicMax],
  ];
  const req: [string, number][] = [];
  if (level > 1) req.push(['requirelevel', (level - 1) * 10]);
  xiaoyaoItems.push({
    id: `range-3-${level}`,
    kind: 'range',
    type: 3,
    level,
    name: GUQIN_NAMES[level - 1] ?? `Cổ Cầm cấp ${level}`,
    icon: guqinIconForLevel(level),
    price,
    size: [w, h],
    desc: desc || 'Đàn cổ bằng gỗ quý, tiếng nhạc du dương, hòa cùng nội lực tạo sóng âm lôi sát.',
    base,
    req,
    look: guqinLookForLevel(level),
  });
}

// ======================= 3. Character Paper-Doll (GuqinW + Xiaoyao outfits & weapons) =======================

type Sx = 'm' | 'f';
const ASSOC_KEYS: Record<string, string> = {
  FightStand: 'stand', NormalStand1: 'idle', NormalStand2: 'idle2', FightRun: 'run', NormalRun: 'townRun',
  Wound: 'wound', Die: 'die', Attack1: 'attack1', Attack2: 'attack2', Magic: 'magic', JunpFly: 'jump', JumpFly: 'jump',
};

const PARTS = [
  { id: 0, m: '男主角头部.txt', f: '女主角头部.txt', slot: 'helm' },
  { id: 1, m: '男主角发型.txt', f: '女主角发型.txt', slot: 'helm' },
  { id: 4, m: '男主角肩膀.txt', f: '女主角肩膀.txt', slot: 'armor' },
  { id: 5, m: '男主角躯体.txt', f: '女主角躯体.txt', slot: 'armor' },
  { id: 6, m: '男主角左手.txt', f: '女主角左手.txt', slot: 'armor' },
  { id: 7, m: '男主角右手.txt', f: '女主角右手.txt', slot: 'armor' },
  { id: 8, m: '男主角左手武器.txt', f: '女主角左手武器.txt', slot: 'weapon' },
  { id: 9, m: '男主角右手武器.txt', f: '女主角右手武器.txt', slot: 'weapon' },
] as const;

const charSheets: Record<string, [number, number, number, number, number, number, number]> = {};
const queuedChar = new Set<string>();

function queueCharSheet(folder: string, sprName: string): string | null {
  if (!sprName || !sprName.toLowerCase().endsWith('.spr')) return null;
  const base = sprName.replace(/\.spr$/i, '').toLowerCase();
  const key = `char/${folder}/${base}`;
  if (queuedChar.has(key)) return key;
  const gamePath = `\\spr\\npcres\\${folder}\\${sprName}`;
  const buf = readSprBuffer(gamePath);
  if (!buf) return null;
  queuedChar.add(key);
  const spr = decodeSpr(buf);
  const dirs = spr.directions;
  const per = Math.max(1, Math.floor(spr.frames.length / dirs));
  const used = spr.frames.slice(0, per * dirs);
  const box = unionBox(used);
  const cols = Math.max(1, Math.min(per, Math.floor(MAX_TEX / box.w)));
  const rowsPerDir = Math.ceil(per / cols);
  charSheets[key] = [box.w, box.h, box.x, box.y, per, dirs, cols];

  const out = path.join(PUBLIC, `${key}.webp`);
  if (!FORCE && fs.existsSync(out)) return key;

  jobs.push(async () => {
    const W = cols * box.w;
    const H = dirs * rowsPerDir * box.h;
    const px = Buffer.alloc(W * H * 4);
    for (let d = 0; d < dirs; d++) {
      for (let f = 0; f < per; f++) {
        const fr = used[d * per + f];
        if (!fr?.w) continue;
        const cx = (f % cols) * box.w + fr.x - box.x;
        const cy = (d * rowsPerDir + Math.floor(f / cols)) * box.h + fr.y - box.y;
        for (let y = 0; y < fr.h; y++) {
          const src = y * fr.w * 4;
          px.set(fr.rgba.subarray(src, src + fr.w * 4), ((cy + y) * W + cx) * 4);
        }
      }
    }
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(px, { raw: { width: W, height: H, channels: 4 } }).webp({ lossless: true, effort: 4 }).toFile(out);
  });
  return key;
}

function parseSort(text: string): Record<string, { dirs: (number[] | null)[]; lines: Record<number, number[]> }> {
  const out: Record<string, { dirs: (number[] | null)[]; lines: Record<number, number[]> }> = {};
  let cur: { dirs: (number[] | null)[]; lines: Record<number, number[]> } | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const sec = /^\[(.+)\]$/.exec(line);
    if (sec) { cur = out[sec[1]] = { dirs: [], lines: {} }; continue; }
    const kv = /^(Dir|Line)(\d+)=(.*)$/.exec(line);
    if (!cur || !kv) continue;
    const nums = kv[3].split(',').map(Number);
    if (kv[1] === 'Dir') cur.dirs[Number(kv[2]) - 1] = nums.slice(1);
    else cur.lines[nums[0]] = nums.slice(1);
  }
  return out;
}

const XY_ASSOC: Record<Sx, Record<number, [Record<string, string>, Record<string, string>]>> = { m: {}, f: {} };
const XY_PARTS: Record<Sx, Record<number, Record<number, Record<string, string>>>> = { m: {}, f: {} };
const XY_SORT: Record<Sx, Record<string, { dirs: (number[] | null)[]; lines: Record<number, number[]> }>> = { m: {}, f: {} };
const XY_SHADOWS: Record<Sx, Record<string, string>> = { m: {}, f: {} };

const WEAPON_ROWS = [247, 248, 249, 250, 251, 252, 253, 254];
const OUTFIT_ROWS = [161, 162, 163, 164];

const shadowTable = readTextTable(npcresByGbk.get('主角动作阴影对应表.txt')!);

for (const sx of ['m', 'f'] as Sx[]) {
  const folder = sx === 'm' ? 'man' : 'woman';
  const charName = sx === 'm' ? 'MainMan' : 'MainLady';
  const walkT = readTextTable(npcresByGbk.get(sx === 'm' ? '男主角未骑马关联表.txt' : '女主角未骑马关联表.txt')!);
  const rideT = readTextTable(npcresByGbk.get(sx === 'm' ? '男主角骑马关联表.txt' : '女主角骑马关联表.txt')!);
  const sortAll = parseSort(fs.readFileSync(npcresByGbk.get(sx === 'm' ? '男主角贴图顺序表.txt' : '女主角贴图顺序表.txt')!, 'latin1'));

  const shadowRow = shadowTable.latin.find(r => r[0]?.trim() === charName);
  if (shadowRow) {
    for (let i = 1; i < shadowTable.header.length; i += 2) {
      const act = shadowTable.header[i]?.trim();
      const sprName = shadowRow[i]?.trim();
      if (!act || !sprName || !act.startsWith('GuqinW')) continue;
      const key = queueCharSheet(folder, sprName);
      if (key) XY_SHADOWS[sx][act] = key;
    }
  }

  const neededActions = new Set<string>();
  const extractAssoc = (t: typeof walkT, rowIdx: number) => {
    const out: Record<string, string> = {};
    const row = t.latin[rowIdx];
    if (!row) return out;
    for (let c = 1; c < t.header.length; c++) {
      const mapped = ASSOC_KEYS[t.header[c]];
      const act = (row[c] ?? '').trim();
      if (mapped && act) {
        out[mapped] = act;
        neededActions.add(act);
      }
    }
    return out;
  };

  for (const wr of WEAPON_ROWS) {
    XY_ASSOC[sx][wr] = [extractAssoc(walkT, wr), extractAssoc(rideT, wr)];
  }
  // Keep GuqinW* sort sections
  for (const [sec, val] of Object.entries(sortAll)) {
    if (sec.startsWith('GuqinW')) XY_SORT[sx][sec] = val;
  }

  // Extract part tables for Xiaoyao outfits (161..164) & weapons (247..254)
  for (const p of PARTS) {
    const t = readTextTable(npcresByGbk.get(sx === 'm' ? p.m : p.f)!);
    const targetRows = p.slot === 'weapon' ? WEAPON_ROWS : OUTFIT_ROWS;
    XY_PARTS[sx][p.id] = {};
    for (const rowIdx of targetRows) {
      const row = t.latin[rowIdx];
      if (!row) continue;
      const actMap: Record<string, string> = {};
      for (const act of neededActions) {
        let col = t.header.indexOf(act);
        if (col < 0 && act === 'JumpFly') col = t.header.indexOf('Jump');
        if (col < 0) continue;
        const sprName = (row[col] ?? '').trim();
        if (!sprName) continue;
        const key = queueCharSheet(folder, sprName);
        if (key) actMap[act] = key;
      }
      if (Object.keys(actMap).length) XY_PARTS[sx][p.id][rowIdx] = actMap;
    }
  }
}

console.log(`Encoding ${jobs.length} Xiaoyao WebP sheets/icons...`);
await runJobs();

// ======================= 3b. Sound effects (8 SF_XY_*.wav -> mp3 + xiaoyao-sounds.gen.ts) =======================

const XY_WAVS: Array<[string, string]> = [
  ['\\sound\\skill\\SF_XY_Wgsx_a.wav', 'sound/xiaoyao/sf_xy_wgsx_a'],
  ['\\sound\\skill\\SF_XY_Stlx.wav', 'sound/xiaoyao/sf_xy_stlx'],
  ['\\sound\\skill\\SF_XY_Sbys.wav', 'sound/xiaoyao/sf_xy_sbys'],
  ['\\sound\\skill\\SF_XY_Gls_a.wav', 'sound/xiaoyao/sf_xy_gls_a'],
  ['\\sound\\skill\\SF_XY_Lyps.wav', 'sound/xiaoyao/sf_xy_lyps'],
  ['\\sound\\skill\\SF_XY_Gsls.wav', 'sound/xiaoyao/sf_xy_gsls'],
  ['\\sound\\skill\\SF_XY_Mhsn_a.wav', 'sound/xiaoyao/sf_xy_mhsn_a'],
  ['\\sound\\skill\\SF_XY_Ygsd.wav', 'sound/xiaoyao/sf_xy_ygsd'],
];
let encodedAudio = 0;
for (const [gamePath, key] of XY_WAVS) {
  const outMp3 = path.join(PUBLIC, `${key}.mp3`);
  if (!FORCE && fs.existsSync(outMp3)) continue;
  const wav = pak16.readWav(gamePath);
  if (!wav) { console.warn(`  [warn] missing wav: ${gamePath}`); continue; }
  fs.mkdirSync(path.dirname(outMp3), { recursive: true });
  const tmpWav = `${outMp3}.tmp.wav`;
  fs.writeFileSync(tmpWav, wav);
  try {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', tmpWav, '-codec:a', 'libmp3lame', '-q:a', '4', outMp3]);
    encodedAudio++;
  } finally {
    if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
  }
}
if (encodedAudio) console.log(`Encoded ${encodedAudio} Xiaoyao SFX mp3 files.`);

const XIAOYAO_SKILL_CAST: Record<number, [string, string]> = {
  2114: ['sound/skill/sound_k005', 'sound/skill/sound_k010'],
  2120: ['sound/skill/sound_k005', 'sound/skill/sound_k010'],
  2124: ['sound/skill/sound_k005', 'sound/skill/sound_k010'],
  2129: ['sound/skill/sound_k005', 'sound/skill/sound_k010'],
  2136: ['sound/skill/sound_k001', 'sound/skill/sound_k006'],
  2138: ['sound/skill/sound_k005', 'sound/skill/sound_k010'],
  2140: ['sound/skill/sound_k001', 'sound/skill/sound_k006'],
  2141: ['sound/skill/sound_k005', 'sound/skill/sound_k010'],
  2142: ['sound/skill/sound_k005', 'sound/skill/sound_k010'],
};
// [wait, fly, vanish, collide]
const XIAOYAO_MISSILE_SND: Record<number, [string, string, string, string]> = {
  637: ['', 'sound/xiaoyao/sf_xy_wgsx_a', '', ''],
  638: ['', 'sound/xiaoyao/sf_xy_stlx', '', ''],
  639: ['', 'sound/xiaoyao/sf_xy_wgsx_a', '', ''],
  640: ['', 'sound/xiaoyao/sf_xy_wgsx_a', '', ''],
  642: ['', 'sound/xiaoyao/sf_xy_sbys', '', ''],
  644: ['', 'sound/xiaoyao/sf_xy_lyps', '', ''],
  645: ['', 'sound/xiaoyao/sf_xy_gls_a', '', ''],
  646: ['', 'sound/xiaoyao/sf_xy_gsls', '', ''],
  647: ['', 'sound/xiaoyao/sf_xy_mhsn_a', '', ''],
  648: ['', 'sound/xiaoyao/sf_xy_ygsd', '', ''],
  649: ['', 'sound/xiaoyao/sf_xy_wgsx_a', '', ''],
};

pak16.close();

// ======================= 4. Write generated TypeScript files =======================

const banner = '// Generated by apps/client/tools/gen-xiaoyao.ts from volam-3005 (updatejx16.pak). Do not edit by hand.\n';

fs.mkdirSync(path.join(SHARED, 'skills/factions/xiaoyao'), { recursive: true });
fs.writeFileSync(
  path.join(SHARED, 'skills/factions/xiaoyao/skills.gen.ts'),
  `${banner}import type { LearnTier, SkillDef } from '../../core/types.js';\n\nexport const SKILLS: SkillDef[] = ${JSON.stringify(xiaoyaoSkills, null, 2)};\n\nexport const LEARN: LearnTier[] = ${JSON.stringify(LEARN, null, 2)};\n`,
);

fs.writeFileSync(
  path.join(SHARED, 'skills/factions/xiaoyao/missiles.gen.ts'),
  `${banner}import type { MissileDef } from '../../core/types.js';\n\nexport const XIAOYAO_MISSILES: MissileDef[] = ${JSON.stringify(xiaoyaoMissiles, null, 2)};\n`,
);

fs.writeFileSync(
  path.join(SHARED, 'items/xiaoyao-items.gen.ts'),
  `${banner}import type { ItemDef } from './items.js';\n\nexport const XIAOYAO_ITEMS: ItemDef[] = ${JSON.stringify(xiaoyaoItems, null, 2)};\n`,
);

fs.writeFileSync(
  path.join(CLIENT, 'src/game/fx/xiaoyao-fx.gen.ts'),
  `${banner}export const XIAOYAO_SKILL_FX: Record<string, readonly number[]> = ${JSON.stringify(fxMeta, null, 2)};\n`,
);

fs.writeFileSync(
  path.join(CLIENT, 'src/art/jx/xiaoyao.gen.ts'),
  `${banner}import type { AssocKey, Sx } from './data.gen';\n\nexport const XIAOYAO_SHEETS: Record<string, readonly number[]> = ${JSON.stringify(charSheets)};\nexport const XIAOYAO_ASSOC: Record<Sx, Record<number, [Partial<Record<AssocKey, string>>, Partial<Record<AssocKey, string>>]>> = ${JSON.stringify(XY_ASSOC)};\nexport const XIAOYAO_PARTS: Record<Sx, Record<number, Record<number, Record<string, string>>>> = ${JSON.stringify(XY_PARTS)};\nexport const XIAOYAO_SORT: Record<Sx, Record<string, { dirs: (number[] | null)[]; lines: Record<number, number[]> }>> = ${JSON.stringify(XY_SORT)};\nexport const XIAOYAO_SHADOWS: Record<Sx, Record<string, string>> = ${JSON.stringify(XY_SHADOWS)};\n`,
);

fs.writeFileSync(
  path.join(CLIENT, 'src/game/audio/xiaoyao-sounds.gen.ts'),
  `${banner}export const XIAOYAO_SKILL_CAST: Record<number, [string, string]> = ${JSON.stringify(XIAOYAO_SKILL_CAST)};\nexport const XIAOYAO_MISSILE_SND: Record<number, [string, string, string, string]> = ${JSON.stringify(XIAOYAO_MISSILE_SND)};\n`,
);

updateManifest(PUBLIC);
console.log(
  `Done! skills=${xiaoyaoSkills.length}, missiles=${xiaoyaoMissiles.length}, items=${xiaoyaoItems.length}, fx=${Object.keys(fxMeta).length}, charSheets=${Object.keys(charSheets).length}`,
);
