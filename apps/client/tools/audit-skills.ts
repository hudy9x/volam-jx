/**
 * Checks every skill of every faction with the shared engine (no server, no browser) and writes
 * docs/skills-audit.md: category, whether casting it does what its category says, effect art, notes.
 *
 *   npm run audit:skills -w @vltk/client
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FACTIONS, FACTION_IDS, SKILL_CATEGORY_NAMES, SkillEngine, SkillStyle, WEAPON_NAMES, castRange, getMissile, getSkill,
  isCastable, learnTiers, monsterCombat, skillCategory, stateFxOf, triggersOf, tuningOf,
  type Combatant, type EnginePort, type SkillDef, type StateApply,
} from '@vltk/shared';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../../docs/skills-audit.md');

let now = 0;
const mk = (id: string, kind: Combatant['kind'], x: number, y: number): Combatant => ({
  id, kind, a: { x, y, dir: 6, mounted: false, maxHp: 1e6 }, hp: 1e6, dead: false, element: 'kim', mp: 1e9,
  baseDamage: [60, 100], weaponType: -2, skills: new Map(), cooldowns: new Map(),
});
const caster = mk('caster', 'player', 0, 0);
const ally = mk('ally', 'player', -60, 20);
const dummies = [[300, 0], [380, -50], [380, 50], [470, 0], [300, -100], [300, 100], [560, -60], [560, 60]].map(([x, y], i) => mk(`d${i}`, 'monster', x, y));
const all = [caster, ally, ...dummies];

interface Result { hits: number; heals: number; buffs: Set<number>; debuffs: Set<number>; moved: boolean; events: number; error?: string }
let res: Result;
const port: EnginePort = {
  now: () => now, random: Math.random, combatants: () => all, get: id => all.find(c => c.id === id),
  hostile: (a, b) => a.kind !== b.kind && !b.dead, friendly: (a, b) => a.kind === b.kind && !b.dead,
  damage: () => { res.hits++; },
  heal: () => { res.heals++; },
  addState: (_t, st: StateApply) => { (st.kind === 'buff' ? res.buffs : res.debuffs).add(st.skill); },
  removeState: () => {},
  dash: (a, b) => { a.a.x = b.a.x - 40; a.a.y = b.a.y; res.moved = true; },
  blink: (a, x, y) => { a.a.x = x; a.a.y = y; res.moved = true; },
  emit: () => { res.events++; },
  // Level-10 curve stats (formulas/combat.ts), weapon damage from baseDamage — like the skill lab (dev/skill-lab).
  stats: c => ({ ...monsterCombat(10, c.element, 0, 0, {}), kind: c.kind, physMin: c.baseDamage[0], physMax: c.baseDamage[1], weaponType: c.weaponType }),
};

function run(s: SkillDef, level = 10): Result {
  res = { hits: 0, heals: 0, buffs: new Set(), debuffs: new Set(), moved: false, events: 0 };
  const engine = new SkillEngine(port);
  caster.skills = new Map([[s.id, level]]);
  caster.weaponType = s.weapon ?? -1;
  caster.cooldowns.clear();
  const cat = skillCategory(s);
  const self = cat === 'support' || cat === 'buff' || s.style === SkillStyle.State;
  caster.a.x = self ? 0 : 300 - Math.min(300, Math.max(16, castRange(s, level) * 0.85));
  caster.a.y = 0;
  ally.a.x = caster.a.x - 60;
  try {
    if (self) engine.cast(caster, s.id, undefined, { x: s.style === SkillStyle.Melee && !s.child ? 300 : caster.a.x, y: 0 });
    else engine.cast(caster, s.id, dummies[0], { x: 300, y: 0 });
    for (let i = 0; i < 240; i++) { now += 25; engine.update(); } // 6 s
  } catch (e) { res.error = (e as Error).message; }
  now += 10000;
  return res;
}

/** Any original art: pre-cast effect, missile fly / hit, state picture — on the skill or what it runs. */
function hasArt(s: SkillDef, seen = new Set<number>()): boolean {
  if (seen.has(s.id)) return false;
  seen.add(s.id);
  if (s.pre || stateFxOf(s)) return true;
  if ((s.style === SkillStyle.Missiles || s.style === SkillStyle.StateMissile) && s.child && getMissile(s.child)?.fx) return true;
  const kids = [s.style !== SkillStyle.Missiles && s.style !== SkillStyle.StateMissile ? s.child : undefined, s.events?.start, s.events?.fly, s.events?.collide, s.events?.vanish];
  return kids.some(id => { const k = id ? getSkill(id) : undefined; return !!k && hasArt(k, seen); });
}

const STYLE_NOTE: Record<number, string> = { 4: 'đặt bẫy / gọi NPC (SkillStyle 4) chưa hỗ trợ', 13: 'cướp đồ / tiền (SkillStyle 13) chưa hỗ trợ' };
const tick = (ok: boolean) => (ok ? '✅' : '⚠️');

const lines: string[] = [];
const summary: string[] = [];
let total = 0, okTotal = 0;
for (const fid of FACTION_IDS) {
  const f = FACTIONS[fid];
  const rows: string[] = [];
  let ok = 0, n = 0;
  for (const tier of learnTiers(fid)) {
    for (const id of tier.skills) {
      const s = getSkill(id);
      if (!s) continue;
      n++;
      const cat = skillCategory(s);
      let works = false, result = '', note = '';
      if (tuningOf(id).disabled) { result = 'Tắt'; note = tuningOf(id).disabled!; }
      else if (cat === 'passive') {
        works = true;
        const tr = triggersOf(s, 10);
        result = tr.length ? `Bị động, tự kích hoạt: ${tr.map(t => getSkill(t.skill)?.name).join(', ')}` : 'Bị động (ghi nhận)';
      } else if (!isCastable(s)) {
        result = 'Chưa dùng được';
        note = STYLE_NOTE[s.style] ?? `SkillStyle ${s.style}`;
      } else {
        const r = run(s);
        if (r.error) { result = 'Lỗi'; note = r.error; }
        else if (cat === 'attack') { works = r.hits > 0; result = works ? `Trúng ${r.hits} đòn` : 'Không trúng'; }
        else if (cat === 'support') { works = r.heals > 0 || r.moved || r.buffs.size > 0; result = r.heals ? `Hồi máu ${r.heals} lần` : r.moved ? 'Dịch chuyển' : r.buffs.size ? 'Ghi nhận bùa lợi' : 'Không có tác dụng'; }
        else if (cat === 'buff') { works = r.buffs.size > 0; result = works ? `Ghi nhận bùa lợi${s.aura ? ' (hào quang)' : ''}` : 'Không ghi nhận'; }
        else if (cat === 'debuff') { works = r.debuffs.size > 0; result = works ? `Ghi nhận bùa hại trên ${r.debuffs.size > 1 ? `${r.debuffs.size} loại` : 'mục tiêu'}` : 'Không ghi nhận'; }
        if (r.debuffs.size && cat === 'attack') note = 'kèm bùa hại (choáng / chậm / độc…)';
        if (s.weapon !== undefined) note = [note, `cần ${WEAPON_NAMES[s.weapon] ?? s.weapon}`].filter(Boolean).join(' · ');
      }
      if (works) ok++;
      const art = hasArt(s) ? '✅' : '—';
      rows.push(`| ${tier.label} | ${s.name} | ${s.id} | ${SKILL_CATEGORY_NAMES[cat]}${s.aura ? ' (hào quang)' : ''} | ${tick(works)} ${result} | ${art} | ${note} |`);
    }
  }
  total += n; okTotal += ok;
  summary.push(`| ${f.name} | ${n} | ${ok} | ${n - ok} |`);
  lines.push(`## ${f.name}\n\n| Mốc | Chiêu | Mã | Loại | Kết quả | Hiệu ứng gốc | Ghi chú |\n|---|---|---|---|---|---|---|\n${rows.join('\n')}\n`);
}

const md = `# Kiểm tra kỹ năng theo phái

Sinh bằng \`npm run audit:skills -w @vltk/client\` (bộ máy kỹ năng chạy không cần server, mỗi chiêu cấp 10 trên 8 cọc gỗ
và 1 đồng đội). Chỉ kiểm tra chiêu có làm đúng loại của nó; sát thương / tác dụng thật: \`docs/formulas/\`.

- ✅ = làm đúng loại của nó (tấn công trúng đích, hồi máu, ghi nhận bùa lợi / bùa hại, bị động).
- ⚠️ = chưa dùng được hoặc không ra kết quả — xem cột Ghi chú.

| Phái | Kỹ năng | ✅ | ⚠️ |
|---|---|---|---|
${summary.join('\n')}
| **Tổng** | **${total}** | **${okTotal}** | **${total - okTotal}** |

${lines.join('\n')}`;
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(summary.join('\n'));
console.log(`total ${total}, ok ${okTotal} -> ${path.relative(process.cwd(), OUT)}`);
