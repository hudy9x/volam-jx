// Full skill tooltip, built like the original client (KSkill::GetDesc + GetDescAboutLevel) from the level curves and
// the original sentence templates of settings/magicdesc.ini (magicdesc.gen.ts). Display only: nothing here changes
// how a skill plays.
import { eventFromLevel, eventSkill, shownEvents } from './events.js';
import { attr } from './formula.js';
import { skillRange } from './info.js';
import { skillActionMs, skillResourceCost } from './casting.js';
import { getSkill, tuningOf } from './registry.js';
import type { SkillDef } from './types.js';
import { huashanSkillInfo } from '../factions/huashan/routes.js';
import { skillCategory, SKILL_CATEGORY_NAMES } from './category.js';
import { HORSE_LIMIT_TEXT, MAGIC_DESC, SKILL_ATTRIB_TEXT, WEAPON_LIMIT_TEXT } from './magicdesc.gen.js';
import { EFFECTS, STATIC_SHIELD } from '../../formulas/tuning.js';

/** A run of text with an optional colour (CSS colour). */
export interface TipSpan { text: string; color?: string }
/** One tooltip line. */
export type TipLine = TipSpan[];

export interface SkillTooltip {
  /** Name, required level, description, school, current level. */
  head: TipLine[];
  /** Everything the current level does. */
  current: TipLine[];
  /** Weapon / horse limits. */
  limits: TipLine[];
  /** "Đẳng cấp kế tiếp" (null at max level). */
  next: TipLine[] | null;
}

/** Colour names of the original texts. */
const COLORS: Record<string, string> = {
  red: '#ff5a4a', white: '#ffffff', cyan: '#5ee3ff', green: '#7ce07c', wood: '#8fd26a', yellow: '#ffe14d',
  pink: '#ff9fd6', metal: '#f0d77a', earth: '#d8a466', water: '#6fb8ff', blue: '#7f9cff', fire: '#ff7a45',
  orange: '#ffa94d', gold: '#ffd24a', purple: '#c88cff', gray: '#a0a0a0',
};
const color = (name: string) => COLORS[name.toLowerCase()] ?? (/^[#\d]/.test(name) ? (name.includes(',') ? `rgb(${name})` : name) : undefined);

const SERIES = ['Hệ Kim', 'Hệ Mộc', 'Hệ Thủy', 'Hệ Hỏa', 'Hệ Thổ'];
const COST_KIND = ['Nội lực', 'Sinh lực', 'Thể lực', 'Tiền'];
const FACTION_NAMES = ['Thiếu Lâm', 'Thiên Vương', 'Đường Môn', 'Ngũ Độc', 'Nga My', 'Thúy Yên', 'Cái Bang', 'Thiên Nhẫn', 'Võ Đang', 'Côn Lôn', 'Hoa Sơn'];

/** Damage attributes in the engine's order (KMagicAttrib.h magic_damage_begin … end). */
const DAMAGE_ORDER = [
  'attackrating_v', 'attackrating_p', 'ignoredefense_p', 'magicdamage_v', 'seriesdamage_p', 'physicsdamage_v',
  'colddamage_v', 'firedamage_v', 'lightingdamage_v', 'lightingdamage_p', 'poisondamage_v', 'physicsenhance_p', 'steallife_p',
  'stealmana_p', 'stealstamina_p', 'knockback_p', 'deadlystrike_p', 'fatallystrike_p', 'stun_p', 'randmove',
];
const DAMAGE = new Set(DAMAGE_ORDER);
/** Not listed with the damage (GetDescAboutLevel skips ignoredefense…seriesdamage; ngũ hành has its own line). */
const DAMAGE_HIDDEN = new Set(['ignoredefense_p', 'magicdamage_v', 'seriesdamage_p']);
/** Shown on their own line. */
const OWN_LINE = new Set(['skill_cost_v', 'skill_costtype_v', 'skill_attackradius', 'seriesdamage_p']);

/** Extra school/branch headers not present in SHXT magicdesc.gen.ts (Tiêu Dao 1301..1306). */
const EXTRA_ATTRIB_TEXT: Record<string, string> = {
  1301: 'Võ công lưu phái: Kiếm pháp (Ngoại công)',
  1302: 'Võ công lưu phái: Cầm pháp (Nội công)',
  1303: 'Võ công lưu phái: Kiếm pháp (Hỗ trợ)',
  1304: 'Võ công lưu phái: Cầm pháp (Hỗ trợ)',
  1305: 'Võ công lưu phái: Hỗ trợ - bị động',
  1306: 'Võ công lưu phái: Hỗ trợ - chủ động',
};

/** Our own sentences for attributes magicdesc.ini has no line for (same token rules; not original text). */
const EXTRA_DESC: Record<string, string> = {
  autoattackskill: 'Khi tấn công có xác suất <color=orange>#d9-%<color> tự thi triển <color=water>#l4-<color> <color=orange>cấp #d7-<color>',
  autorescueskill: 'Khi lâm nguy có xác suất <color=orange>#d9-%<color> tự thi triển <color=water>#l4-<color> <color=orange>cấp #d7-<color>',
  autocastskill: 'Mỗi <color=orange>#f6- giây<color> tự động kích hoạt <color=water>#l4-<color> (tỉ lệ <color=orange>#d9-%<color>)',
  special_point_base: 'Tối đa tích lũy: <color=orange>#d3- tầng [Âm Luật]<color>',
  cost_sp: '<color=orange>Điều kiện thi triển: <color><color=yellow>#d3- tầng [Âm Luật]<color>',
  lightingdamage_p: 'Lôi sát nội công: <color=orange>#d1-%<color>',
  addlightingmagic_p: 'Lôi sát nội công: <color=orange>#d1+%<color>',
  add_damage_p: 'Sát thương tăng: <color=orange>#d1+%<color>, duy trì <color=orange>#f2- giây<color>',
  me2waterdamage_p: 'Tăng sát thương lên hệ Thủy: <color=orange>#d1+%<color>',
  water2medamage_p: 'Giảm sát thương từ hệ Thủy: <color=orange>#d1+%<color>',
  anti_block_rate: 'Bỏ qua tỉ lệ đỡ đòn: <color=orange>#d1+%<color>',
  unravel_effect: 'Hóa giải hiệu ứng bất lợi: <color=orange>#d1+<color>',
  staticmagicshield_p: 'Hộ thuẫn hấp thụ sát thương bằng <color=orange>#d1-%<color> nội lực tối đa, duy trì <color=orange>#f2- giây<color>',
  missle_hitcount: 'Số lần tấn công / mục tiêu tối đa: <color=orange>#d1-<color>',
  invincibility: 'Bất tử trong lúc thi triển',
  hidebodyunlock: 'Không thể bị chọn làm mục tiêu',
};

/** Template for an attribute (skills.txt names some without the "skill_" prefix magicdesc.ini uses). */
function template(name: string): string | undefined {
  const t = MAGIC_DESC[name] ?? MAGIC_DESC[`skill_${name}`] ?? MAGIC_DESC[name.replace(/^skill_/, '')] ?? EXTRA_DESC[name];
  return t?.replace('] h#', '] #'); // stray "h" in the Vietnamese skill_addskilldamage line
}

/** Parse `<color=x>…<color>` and `<enter>` into spans (an `<enter>` starts a new line). */
export function richText(text: string, base?: string): TipLine[] {
  const lines: TipLine[] = [[]];
  let cur = base;
  for (const part of text.split(/(<color(?:=[^>]*)?>|<enter>|<bclr(?:=[^>]*)?>)/i)) {
    if (!part) continue;
    const tag = /^<color(?:=([^>]*))?>$/i.exec(part);
    if (tag) { cur = tag[1] ? color(tag[1].trim()) ?? base : base; continue; }
    if (/^<enter>$/i.test(part)) { lines.push([]); continue; }
    if (/^<bclr/i.test(part)) continue;
    lines[lines.length - 1].push(cur ? { text: part, color: cur } : { text: part });
  }
  return lines.filter(l => l.some(s => s.text.trim()));
}

/** Value picked by the token's index character (KMagicDesc::GetDesc). */
function pick(idx: string, v: [number, number, number]): number {
  switch (idx) {
    case '1': return v[0];
    case '2': return v[1];
    case '3': return v[2];
    case 'A': case '4': return Math.floor(v[0] / 256);
    case '6': return Math.floor(v[2] / 256);
    case '7': return ((v[0] % 256) + 256) % 256;
    case '9': return ((v[2] % 256) + 256) % 256;
    default: return v[0];
  }
}

/** Fill one magicdesc.ini template. */
export function formatAttr(tpl: string, v: [number, number, number]): string {
  let out = '';
  for (let i = 0; i < tpl.length; i++) {
    const ch = tpl[i];
    if (ch !== '#' || i + 2 >= tpl.length) { out += ch; continue; }
    const type = tpl[i + 1], idx = tpl[i + 2], sign = tpl[i + 3] ?? '';
    const known = 'dfklsxmw'.includes(type);
    if (!known) { out += ch; continue; }
    let n = pick(idx, v);
    // The engine always eats 4 characters; keep the 4th when it is text (":", "]", " ") rather than a sign.
    const eats = sign === '+' || sign === '~' || sign === '-';
    switch (type) {
      case 'd':
        if (sign === '+') { out += n >= 0 ? '+' : '-'; n = Math.abs(n); }
        else if (sign === '~' && n > 0) out += '-';
        out += String(n);
        break;
      case 'f': out += n < 0 ? 'vĩnh viễn' : String(Math.floor(n / 18)); break;
      case 'l': {
        // Auto-cast attributes pack flags above the 16-bit skill id; the engine prints "[ name ]".
        const name = n > 0 ? getSkill(n & 0xffff)?.name ?? `#${n & 0xffff}` : 'Võ công vốn có';
        out += out.endsWith('[') ? name : `[${name}]`;
        break;
      }
      case 's': out += SERIES[n] ?? 'Vô hệ'; break;
      case 'k': out += COST_KIND[n] ?? 'Nội lực'; break;
      case 'x': out += n ? 'Nữ' : 'Nam'; break;
      case 'm': out += FACTION_NAMES[n] ?? ''; break;
      case 'w': out += n === 9 ? 'tàn ảnh kéo dài' : 'tàn ảnh'; break;
    }
    i += eats ? 3 : 2;
  }
  return out;
}

/** One attribute as tooltip lines ([] when the original has no sentence for it). */
export function describeAttr(skill: SkillDef, name: string, level: number): TipLine[] {
  const v = attr(skill, name, level);
  if (!v) return [];
  if (name === 'skill_mintimepercastonhorse_v' && skill.noHorse) return [];
  if (name === 'skill_param1_v' && skill.form === 13) {
    return richText(`Khoảng cách di hình tối đa: <color=orange>${Math.floor(v[0])}<color>`);
  }
  if (name === 'ignoreskill_p') {
    return richText(`Xác suất bỏ qua bùa hại: <color=orange>+${v[0]}%<color>`);
  }
  if (name === 'lifereplenish_p') {
    return richText(`Tăng hiệu quả hồi sinh lực: <color=orange>+${v[0]}%<color>`);
  }
  if (name === 'hide') {
    const sec = v[1] < 0 ? 'vĩnh viễn' : `${Math.floor(v[1] / 18)} giây`;
    return richText(`Ẩn thân <color=orange>${sec}<color>: vô hình với quái, boss, đối thủ và không chịu sát thương; tấn công sẽ hiện hình`);
  }
  if (name === 'randmove') {
    const sec = v[1] < 0 ? 'vĩnh viễn' : `${Math.floor(v[1] / 18)} giây`;
    return richText(`Hoảng loạn <color=orange>${sec}<color>: không thể tấn công hoặc điều khiển, chạy loạn trong bán kính <color=orange>${EFFECTS.randMove.maxRadius}<color>`);
  }
  if (name === 'missle_missrate') {
    const hitRate = Math.max(0, 100 - Math.floor(v[0]));
    if (skill.id === 716) return richText(`Đồng đội xung quanh: <color=orange>${hitRate}%<color> xóa sạch trạng thái dị thường`);
    if (skill.id === 738) return [];
    return richText(`Xác suất trúng: <color=orange>${hitRate}%<color>`);
  }
  if (name === 'ignorenegativestate_p') {
    if (skill.id === 716) return [];
    if (skill.id === 738) {
      const miss = attr(skill, 'missle_missrate', level)?.[0] ?? 0;
      const hitRate = Math.max(0, 100 - Math.floor(miss));
      const sec = v[1] < 0 ? 'vĩnh viễn' : `${Math.floor(v[1] / 18)} giây`;
      return richText(`Bản thân: <color=orange>${hitRate}%<color> xóa sạch và miễn dịch trạng thái dị thường trong <color=orange>${sec}<color> (dùng được khi đang hoảng loạn)`);
    }
  }
  if (name === 'skill_appendskill') {
    const extra = tuningOf(skill.id).appendSkills ?? [];
    if (extra.length) {
      const names = extra.map(id => getSkill(id)?.name).filter(Boolean).join(', ');
      return [
        ...richText(`Gộp ${extra.length} vòng sáng: <color=water>${names}<color>`),
        ...richText(`Cấp hiệu lực theo chiêu thấp nhất trong ${extra.length} chiêu hỗ trợ (tối đa cấp <color=orange>${v[1]}<color>)`),
      ];
    }
  }
  if (name === 'autocastskill' && Math.floor(v[0] / 256) === 2117) {
    const sec = Math.max(1, Math.floor(Math.floor(v[2] / 256) / 18));
    return richText(`Mỗi <color=orange>${sec} giây<color> tự động nhận <color=orange>1 tầng [Âm Luật]<color>`);
  }
  if (name === 'autoreplyskill' || name === 'autoattackskill' || name === 'autorescueskill' || name === 'autodeathskill') {
    const subId = Math.floor(v[0] / 256);
    const subLv = Math.max(1, v[0] % 256);
    const sub = getSkill(subId);
    const subName = sub?.name ?? `#${subId}`;
    if (name === 'autodeathskill') {
      const chance = Math.min(100, Math.floor(v[2]));
      const rm = sub ? attr(sub, 'randmove', subLv) : null;
      const hits = sub ? attr(sub, 'missle_hitcount', subLv)?.[0] : null;
      if (rm && hits) {
        const sec = Math.floor(rm[1] / 18);
        return richText(`Khi trọng thương: <color=orange>${chance}%<color> khiến tối đa <color=orange>${hits}<color> địch xung quanh hoảng loạn trong <color=orange>${sec} giây<color>`);
      }
      return richText(`Khi trọng thương: <color=orange>${chance}%<color> tự thi triển <color=water>[${subName}]<color> cấp <color=orange>${subLv}<color>`);
    }
    const cdTicks = Math.floor(v[2] / 256);
    const cdSec = Math.round((cdTicks / 18) * 10) / 10;
    const rawChance = v[2] % 256;
    const chance = rawChance === 0 ? 100 : Math.min(100, rawChance);
    const cdNote = cdSec > 0 ? ` (giãn cách <color=orange>${cdSec} giây<color>)` : '';
    if (name === 'autoreplyskill') {
      return richText(`Khi bị trúng đòn: <color=orange>${chance}%<color> tự thi triển <color=water>[${subName}]<color> <color=orange>cấp ${subLv}<color>${cdNote}`);
    }
    if (name === 'autoattackskill') {
      const head = richText(`Khi tấn công: <color=orange>${chance}%<color> gắn bùa <color=water>[${subName}]<color> <color=orange>cấp ${subLv}<color>${cdNote}`);
      const subLines = sub && (subId === 719 || subId === 720) ? levelBlock(sub, subLv, 1, new Set([skill.id, subId])) : [];
      return [...head, ...subLines];
    }
    if (name === 'autorescueskill') {
      const head = richText(`Khi sinh lực dưới <color=orange>25%<color>: <color=orange>${chance}%<color> tự kích hoạt${cdNote}`);
      const shield = sub ? describeAttr(sub, 'staticmagicshield_p', subLv) : [];
      const speedId = sub?.events?.start;
      const speedSkill = speedId ? getSkill(speedId) : undefined;
      const speed = speedSkill ? describeAttr(speedSkill, 'fastwalkrun_p', subLv) : [];
      const speedDur = speedSkill ? attr(speedSkill, 'fastwalkrun_p', subLv)?.[1] : 0;
      const speedLine = speed.length && speedDur
        ? richText(`Tăng tốc độ di chuyển: <color=orange>+${attr(speedSkill!, 'fastwalkrun_p', subLv)?.[0]}%<color> trong <color=orange>${Math.floor(speedDur / 18)} giây<color>`)
        : speed;
      return [...head, ...shield, ...speedLine];
    }
  }
  if (name === 'poison2decmana_p') {
    const sec = v[1] < 0 ? 'vĩnh viễn' : `${Math.floor(v[1] / 18)} giây`;
    return richText(`Mục tiêu trúng độc bị rút thêm nội lực bằng <color=orange>${v[0]}%<color> độc sát, duy trì <color=orange>${sec}<color>`);
  }
  if (name === 'staticmagicshield_p') {
    const pct = Math.round(v[0] * STATIC_SHIELD.scale);
    const capPct = Math.round(STATIC_SHIELD.maxHpRatio * 100);
    const sec = v[1] < 0 ? 'vĩnh viễn' : `${Math.floor(v[1] / 18)} giây`;
    return richText(`Hộ thuẫn hấp thụ sát thương bằng <color=orange>${pct}%<color> nội lực tối đa (tối đa <color=orange>${capPct}%<color> sinh lực), duy trì <color=orange>${sec}<color>`);
  }
  const tpl = template(name);
  if (!tpl) return [];
  return richText(formatAttr(tpl, v));
}

const line = (text: string, c?: string): TipLine => [c ? { text, color: c } : { text }];

/** What one level of a skill does (GetDescAboutLevel). `depth` limits the "Tầng" recursion. */
function levelBlock(s: SkillDef, level: number, depth = 0, seen = new Set<number>([s.id])): TipLine[] {
  const out: TipLine[] = [];
  const series = attr(s, 'seriesdamage_p', level);
  if (series && series[0]) out.push(line(`Ngũ hành tương khắc: ${series[0]}%`));
  if (depth === 0) {
    const cost = skillResourceCost(s, level);
    if (cost.amount) out.push(line(`Tiêu hao ${cost.resource === 'hp' ? 'sinh lực' : 'nội lực'}: ${cost.amount}`));
    if (s.cooldown && s.cooldown > 0) out.push(line(`Thời gian giãn cách: ${Math.round((s.cooldown / 18) * 10) / 10} giây`));
    if (tuningOf(s.id).timing) out.push(line(`Nhịp xuất chiêu riêng: ${Math.round(skillActionMs(s, 0))} ms (không phụ thuộc tốc độ đánh)`));
    if (cost.resource === 'hp' && cost.minRemainingHpRatio > 0) out.push(line(`Sau thi triển cần còn ít nhất ${cost.minRemainingHpRatio * 100}% sinh lực tối đa.`));
    const range = skillRange(s, level);
    if (range) out.push(line(`Phạm vi hiệu quả: ${range}`));
  }
  const names = Object.keys(s.attrs ?? {});
  for (const n of DAMAGE_ORDER) if (names.includes(n) && !DAMAGE_HIDDEN.has(n)) out.push(...describeAttr(s, n, level));
  for (const n of names) {
    if (DAMAGE.has(n) || OWN_LINE.has(n)) continue;
    out.push(...describeAttr(s, n, level));
  }
  // Tầng chiêu (core/events.ts): child skills fired on start / fly / collide / vanish. A layer that opens at a later
  // skill level is listed as "mở ở cấp N" until then; skill_showevent hides layers the original does not describe.
  if (depth < 2) {
    let tier = depth + 2;
    for (const kind of ['start', 'fly', 'collide', 'vanish'] as const) {
      const from = eventFromLevel(s, kind);
      if (!from || tier > 4) continue;
      const open = level >= from;
      const id = eventSkill(s, kind, open ? level : from);
      if (!id || seen.has(id)) continue;
      if (open && !shownEvents(s, level).includes(kind)) continue;
      seen.add(id);
      const k = getSkill(id);
      if (!k) continue;
      const head: TipLine = [{ text: `Tầng ${tier++}: `, color: '#8fa0ff' }, { text: k.name, color: '#ffe14d' }];
      if (!open) { out.push([...head, { text: ` (mở ở cấp ${from})`, color: '#a0a0a0' }]); continue; }
      const lines = levelBlock(k, level, depth + 1, seen);
      if (lines.length) out.push(head, ...lines);
    }
  }
  return out;
}

/** Original-style tooltip of a skill at `level` (owner-independent: no equipment bonuses yet). */
export function describeSkill(s: SkillDef, level: number, maxLevel: number): SkillTooltip {
  const head: TipLine[] = [];
  const title: TipLine = [{ text: s.name, color: '#ffe14d' }];
  if ((s.series ?? -1) >= 0) title.push({ text: ` (${SERIES[s.series!]?.toLowerCase()})`, color: '#ffe14d' });
  head.push(title);
  if (s.reqLevel) head.push(line(`Đẳng cấp yêu cầu: ${s.reqLevel}`, '#d8d0b8'));
  const school = s.pack === 'huashan' ? huashanSkillInfo(s.id) : undefined;
  if (school) head.push(line(`Tuyến: ${school.route} · ${school.role ?? SKILL_CATEGORY_NAMES[skillCategory(s)]}`));
  const desc = school?.desc ?? s.desc;
  if (desc) head.push(...richText(desc, '#ffffff'));
  if (school?.note) head.push(line(school.note));
  const attribText = s.attrib ? (SKILL_ATTRIB_TEXT[String(s.attrib)] ?? EXTRA_ATTRIB_TEXT[String(s.attrib)]) : undefined;
  if (attribText) head.push(...richText(attribText));
  head.push(line(`Đẳng cấp hiện thời: ${level}`));
  const limits: TipLine[] = [];
  if (s.weapon !== undefined) {
    const key = s.weapon === -2 ? 'F2' : s.weapon === -1 ? 'F1' : String(s.weapon);
    const t = WEAPON_LIMIT_TEXT[key];
    if (t) limits.push(...richText(`Vũ khí: ${t}`));
  }
  if (s.noHorse) limits.push(...(HORSE_LIMIT_TEXT['1'] ? richText(HORSE_LIMIT_TEXT['1']) : [line('Không dùng được khi cưỡi ngựa', '#ff9a7a')]));
  const tip: SkillTooltip = {
    head,
    current: levelBlock(s, level),
    limits,
    next: level < maxLevel ? levelBlock(s, level + 1) : null,
  };
  // Nothing listed for any level (e.g. passives whose attributes have no sentence): no "Đẳng cấp kế tiếp" block.
  if (!tip.current.length && !tip.next?.length) tip.next = null;
  return tip;
}
