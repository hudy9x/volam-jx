/**
 * Tài liệu trang bị hoàng kim môn phái + Thiên Tứ: `npx tsx tools/doc-gold.ts` (chạy trong apps/client)
 *   -> docs/equipment-gold-thientu.md
 * Chỉ đọc: jx-origin/settings/item/{goldequip,magicattrib_ge,platinaequip,platina_magicrate,platina_magicattr}.txt
 * (file rời của bản mod SHXT), skills.txt + script/skill/special/platina.lua (data_extract), và bảng tên thuộc tính trong exe
 * của client (`jx/magicattr.ts`, chỉ tin mã ≤ VERIFIED_MAX). Câu mô tả: magicdesc.ini qua formatAttr.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tcvn3, CLIENT_ROOT, readTable, readGameFile } from './jx/source.ts';
import { readLuaTable } from './jx/lua.ts';
import { VERIFIED_MAX, readMagicAttribNames } from './jx/magicattr.ts';
import { MAGIC_DESC, formatAttr } from '../../../packages/shared/src/index.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../../../docs/equipment-gold-thientu.md');
const gbk = new TextDecoder('gbk');
const ITEM = `${CLIENT_ROOT}/settings/item`;
const raw = (f: string) => fs.readFileSync(`${ITEM}/${f}`).toString('latin1').split(/\r?\n/).filter(l => l.length).map(l => l.split('\t'));
const cell = (r: string[], i: number) => (r[i] ?? '').trim();
const num = (r: string[], i: number) => Number(cell(r, i));
const nameOf = (s: string) => {
  const b = Buffer.from(s, 'latin1');
  const ascii = [...b].filter(x => (x >= 65 && x <= 90) || (x >= 97 && x <= 122)).length;
  const high = [...b].filter(x => x >= 128).length;
  return high > 0 && ascii < high * 0.5 ? `${gbk.decode(b).trim()} (tên gốc tiếng Trung)` : tcvn3(s).trim();
};

// ---------- attribute id -> name (client exe, jx/magicattr.ts) ----------
const ATTR_NAME = readMagicAttribNames(CLIENT_ROOT);

const SLOT = ['Vũ khí', 'Ám khí', 'Áo', 'Nhẫn', 'Dây chuyền', 'Giày', 'Đai', 'Nón', 'Hộ uyển', 'Ngọc bội', 'Ngựa', 'Mặt nạ', 'Áo choàng', 'Ấn', 'Trang sức'];
const SERIES = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];
const FACTION = ['Thiếu Lâm', 'Thiên Vương', 'Đường Môn', 'Ngũ Độc', 'Nga My', 'Thúy Yên', 'Cái Bang', 'Thiên Nhẫn', 'Võ Đang', 'Côn Lôn', 'Hoa Sơn'];
const REQ: Record<number, (v: number) => string> = {
  32: v => `Sức mạnh ${v}`, 33: v => `Thân pháp ${v}`, 34: v => `Sinh khí ${v}`, 35: v => `Nội công ${v}`, 36: v => `cấp ${v}`,
  37: v => `hệ ${SERIES[v] ?? v}`, 38: v => (v ? 'nữ' : 'nam'), 39: v => `môn phái ${FACTION[v] ?? v}`, 46: v => `chuyển sinh ${v}`, 47: v => `phúc ${v}`,
};

const strip = (s: string) => s.replace(/<color[^>]*>|<bclr[^>]*>/gi, '').replace(/<enter>/gi, ' ').replace(/\s+/g, ' ').trim();
/** One attribute sentence (original magicdesc.ini wording); a range "a–b" where min and max differ. */
function sentence(type: number, vmin: number[], vmax: number[]): string {
  if (type > VERIFIED_MAX) return `(mã thuộc tính ${type}, tên chưa xác minh): ${vmin.join('/')}${vmax.join('/') !== vmin.join('/') ? ` → ${vmax.join('/')}` : ''}`;
  const name = ATTR_NAME[type] ?? `#${type}`;
  const tpl = MAGIC_DESC[name];
  if (!tpl) return `\`${name}\` (mã ${type}): ${vmin.join('/')}${vmax.join('/') !== vmin.join('/') ? ` → ${vmax.join('/')}` : ''}`;
  const a = strip(formatAttr(tpl, vmin as [number, number, number]));
  const b = strip(formatAttr(tpl, vmax as [number, number, number]));
  if (a === b) return a;
  const pa = a.split(/(\d+)/), pb = b.split(/(\d+)/);
  if (pa.length === pb.length && pa.every((x, i) => i % 2 === 1 || x === pb[i])) return pa.map((x, i) => (i % 2 === 1 && x !== pb[i] ? `${x}–${pb[i]}` : x)).join('');
  return `${a} → ${b}`;
}

// ---------- tables ----------
const GE = raw('magicattrib_ge.txt'); // GE[k] = line k (1-based, row 0 = header)
const geLine = (k: number) => {
  const r = GE[k];
  if (!r) return `(không có dòng ${k})`;
  const t = num(r, 4);
  return sentence(t, [num(r, 5), num(r, 7), num(r, 9)], [num(r, 6), num(r, 8), num(r, 10)]);
};
const gold = raw('goldequip.txt');
const plat = raw('platinaequip.txt');
const PA = raw('platina_magicattr.txt'); // PA[k] = line k (1-based)
const paLine = (k: number) => { const r = PA[k]; return r ? sentence(num(r, 0), [num(r, 1), num(r, 2), num(r, 3)], [num(r, 1), num(r, 2), num(r, 3)]) : `(không có dòng ${k})`; };
const rates = raw('platina_magicrate.txt').slice(1);

// platinum bonus skills: skills.txt + script/skill/special/platina.lua
const SK = readTable('\\settings\\skills.txt', 'latin1');
const skH = SK.header.map(h => h.trim());
const skCol = (n: string) => skH.indexOf(n);
const skRow = new Map(SK.rows.map(r => [Number(r[skCol('SkillId')]), r]));
const platLua = readLuaTable(gbk.decode(readGameFile('script/skill/special/platina.lua')), 'SKILLS') as Record<string, Record<string, unknown>>;
const list = (t: unknown): unknown[] => (Array.isArray(t) ? t : t && typeof t === 'object'
  ? Object.keys(t).filter(k => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b)).map(k => (t as Record<string, unknown>)[k]) : []);
const curve = (pts: unknown, lv: number): number => {
  const p = list(pts).map(x => list(x)).map(x => [Number(x[0]), Number(x[1])]).sort((a, b) => a[0] - b[0]);
  if (!p.length) return 0;
  if (lv <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (lv <= p[i][0]) { const [x0, y0] = p[i - 1], [x1, y1] = p[i]; return Math.floor(y0 + (y1 - y0) * (lv - x0) / (x1 - x0)); }
  const [x0, y0] = p[p.length - 2] ?? p[0], [x1, y1] = p[p.length - 1];
  return x1 === x0 ? y1 : Math.floor(y0 + (y1 - y0) * (lv - x0) / (x1 - x0));
};
function platSkill(id: number, levels: number[]): string {
  if (!id) return '—';
  const r = skRow.get(id);
  if (!r) return `#${id} (không có trong skills.txt)`;
  const label = `#${id} ${gbk.decode(Buffer.from(r[skCol('SkillName')], 'latin1')).trim()}`;
  const parts: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const attr = (r[skCol(`LvlSetting${i}`)] ?? '').trim(), data = (r[skCol(`LvlData${i}`)] ?? '').trim();
    if (!attr || !data) continue;
    const raw = (platLua as Record<string, Record<string, unknown>> | null)?.[data]?.[attr];
    const tbl = raw ? list(raw) : undefined;
    if (!tbl) { parts.push(`${attr} (${data}: không có trong platina.lua)`); continue; }
    const id2 = ATTR_NAME.indexOf(attr);
    const at = (lv: number) => [0, 1, 2].map(k => (tbl[k] ? curve(tbl[k], lv) : 0));
    const byLv = levels.map(lv => ({ lv, v: at(lv) }));
    const fmt = (v: number[]) => (MAGIC_DESC[attr] ? strip(formatAttr(MAGIC_DESC[attr], v as [number, number, number])) : `\`${attr}\` ${v.join('/')}`);
    const first = byLv.find(x => x.v[0] !== 0) ?? byLv[byLv.length - 1];
    parts.push(levels.length > 1 && byLv.some(x => fmt(x.v) !== fmt(first.v))
      ? byLv.map(x => `+${x.lv}: ${fmt(x.v)}`).join('; ')
      : `${fmt(first.v)}${first.lv !== levels[0] ? ` (từ +${first.lv})` : ''}`);
    void id2;
  }
  return `${label}: ${parts.join(' · ') || 'không có thuộc tính'}`;
}

interface Item { row: number; r: string[]; name: string; suite: number }
const reqText = (r: string[]) => {
  const out: string[] = [];
  for (let k = 34; k < 46; k += 2) { const t = num(r, k); if (t > 0 && REQ[t]) out.push(REQ[t](num(r, k + 1))); }
  return out.join(', ') || 'không';
};
const baseText = (r: string[]) => {
  const out: string[] = [];
  for (let k = 13; k < 34; k += 3) {
    const t = num(r, k);
    if (!(t > 0)) continue;
    const lo = num(r, k + 1), hi = num(r, k + 2);
    out.push(sentence(t, [lo, 0, 0], [hi, 0, 0]));
  }
  return out.join(' · ') || '—';
};
const facOf = (r: string[]) => { for (let k = 34; k < 46; k += 2) if (num(r, k) === 39) return num(r, k + 1); return -1; };

const goldItems: Item[] = gold.slice(1).map((r, i) => ({ row: i + 1, r, name: nameOf(r[0]), suite: num(r, 52) }))
  .filter(it => it.suite >= 1 && it.suite <= 28 && !it.name.startsWith('[') && !it.name.includes('(kỳ hạn)'));
const thienTu: Item[] = plat.slice(1).map((r, i) => ({ row: i + 1, r, name: nameOf(r[0]), suite: num(r, 58) }))
  .filter(it => it.name.startsWith('[Thiên Tứ]') && it.suite >= 1 && it.suite <= 28);
const norm = (s: string) => s.replace(/^\[[^\]]+\]\s*/, '').replace(/\s*\(kỳ hạn\)/, '').toLowerCase().replace(/\s+/g, '');
// platina_magicrate: column PlatinaItem k = platinaequip.txt line k + 1 (checked: 120/120 comments match)
const rateByRow = new Map<number, string[][]>();
for (const r of rates) { const row = num(r, 0) + 1; if (!rateByRow.has(row)) rateByRow.set(row, []); rateByRow.get(row)!.push(r); }
const sameName = (a: Item, b: Item) => norm(a.name) === norm(b.name);

// ---------- write ----------
const L: string[] = [];
const P = (s = '') => L.push(s);
const setName = (items: Item[]) => {
  const words = items.map(i => i.name.split(' '));
  const out: string[] = [];
  for (let k = 0; k < words[0].length; k++) { const w = words[0][k]; if (words.every(x => (x[k] ?? '').toLowerCase() === w.toLowerCase())) out.push(w); else break; }
  return out.join(' ') || items[0].name;
};
const suites = [...new Set(goldItems.map(i => i.suite))].sort((a, b) => a - b);
const byFaction = new Map<number, number[]>();
for (const s of suites) { const f = facOf(goldItems.find(i => i.suite === s)!.r); if (!byFaction.has(f)) byFaction.set(f, []); byFaction.get(f)!.push(s); }
let matched = 0, withRates = 0;

P('# Trang bị hoàng kim môn phái và Thiên Tứ (bạch kim)');
P();
P('> Sinh tự động từ bảng của client gốc (chỉ đọc) bằng `apps/client/tools/doc-gold.ts` — đừng sửa tay, chạy lại tool (mục 6).');
P('> Bảng: `jx-origin/settings/item/` — `goldequip.txt`, `magicattrib_ge.txt`, `platinaequip.txt`, `platina_magicrate.txt`,');
P('> `platina_magicattr.txt` là **file rời của bản mod SHXT**, không có trong `data_extract` (được phép đọc: `AGENTS.md` §7, `tasks/BACKLOG.md` TB0). Kỹ năng bạch kim:');
P('> `data_extract/slistcache/settings/skills.txt` + `script/skill/special/platina.lua`. Câu mô tả thuộc tính lấy nguyên văn `magicdesc.ini`');
P('> (như tooltip gốc); mã thuộc tính → tên đọc từ bảng chuỗi trong exe của client (`tools/jx/magicattr.ts`, kiểm chứng tới mã 176).');
P('> Cơ chế (phẩm chất, dòng ẩn, bộ): đọc từ mã engine fork `jx1-vs2022-main` và ghi chép `jx1-gameplay-research/09…` §6–§7 (cả hai đã xóa 2026-11-12).');
P('> Ký hiệu: ✅ đọc thẳng từ bảng / mã · 🟡 suy luận · ❓ chưa rõ.');
P();
P('## 1. Tóm tắt');
P();
P(`- **Hoàng kim môn phái**: ${suites.length} bộ × 5 món = ${goldItems.length} món (\`goldequip.txt\` dòng ${goldItems[0].row}–${goldItems.at(-1)!.row}, số bộ 1–28), cho 10 phái gốc. ✅`);
P('  Hoa Sơn (phái thứ 11 của bản mod) **không có** bộ hoàng kim môn phái cổ điển; Hoa Sơn chỉ có ở các họ bộ đời sau (mục 5).');
const ttSame = thienTu.filter(t => goldItems.some(g => g.suite === t.suite && sameName(g, t)));
const ttSlotDiff = ttSame.filter(t => goldItems.some(g => g.suite === t.suite && sameName(g, t) && num(g.r, 2) !== num(t.r, 2)));
P(`- **Thiên Tứ**: ${thienTu.length} món "[Thiên Tứ] …" trong \`platinaequip.txt\` (số bộ 1–28) = **bạch kim của cùng 28 bộ môn phái**, yêu cầu cấp 120. ✅`);
P(`  ${ttSame.length}/${thienTu.length} món trùng tên một món hoàng kim cùng bộ; ${thienTu.length - ttSame.length} món là món khác của bộ (vd. Thiên Tứ Mộng Long có nhẫn thay giày).`);
P(`  ${ttSlotDiff.length} món trùng tên nhưng **khác ô** trong bảng mod (có thể là lỗi bảng 🟡) — ghi ngay ở từng món.`);
P('- Mỗi bộ cùng số bộ còn có các bản biến thể "[Định thời]", "[Hạn chế thời gian]", "[限时白金]" (bạch kim có thời hạn) — ghi ở mục 5.');
P();
P('| Môn phái | Bộ (số bộ trong bảng) |');
P('|---|---|');
for (const [f, ss] of byFaction) P(`| ${FACTION[f]} | ${ss.map(s => `${setName(goldItems.filter(i => i.suite === s))} (${s})`).join(' · ')} |`);
P();
P('## 2. Cách đọc');
P();
P('- **Khoảng giá trị hoàng kim** "a–b": mỗi dòng có loại thuộc tính cố định; khi món đồ sinh ra, engine lấy phẩm chất `q` (0–10, theo may mắn của');
P('  lệnh tạo đồ) và tính `giá trị = min + (max − min) × q / 10` cho từng tham số (✅ `KItemGenerator::Gen_GoldEquipment`). a = q 0, b = q 10.');
P('- **Dòng hiện / ẩn**: theo engine, dòng 1, 3, 5 luôn có hiệu lực; dòng 2, 4, 6 là **thuộc tính ẩn**, chỉ có hiệu lực khi được kích hoạt bằng');
P('  ngũ hành tương sinh (hệ nhân vật / hệ hai món ở ô kích hoạt) hoặc khi **mặc đủ bộ** (✅ mã engine fork; 🟡 với bản SHXT vì engine thật không có).');
P('  Bảng ô kích hoạt và luật tương sinh: tài liệu 09 §6.');
P('- **Bộ 1–28 không có dòng thưởng bộ** (cột "扩展套装…" để trống, không có trong `suite_activate_count.txt`): lợi ích của đủ bộ là kích hoạt mọi');
P('  thuộc tính ẩn. ✅ bảng / 🟡 cơ chế.');
P('- **Thiên Tứ** (bạch kim): mỗi dòng có hai chỉ số dòng — một ở **+0** và một ở **+10** (cột "魔法属性索引k(0级)/(10级)"); món có cấp cường hóa');
P('  +0…+10. Giá trị ở các cấp giữa: ❓ (engine fork không có bộ nâng cấp bạch kim; hợp lý nhất là nội suy). Ngoài 6 dòng còn có:');
P('  - **Kỹ năng bạch kim** mở ở **+6** và ở **+10** (cột "6级技能ID", "10级技能ID"): trạng thái bị động, tác dụng tính từ `platina.lua` theo cấp');
P('    kỹ năng (giả định cấp kỹ năng = cấp cường hóa ❓). Tên kỹ năng gốc là tiếng Trung (白金… = "bạch kim …").');
P('  - **Dòng thêm khi cường hóa** (`platina_magicrate.txt`): ở mỗi cấp +5…+9, mỗi "dòng thêm" (1, 2, …) chọn ngẫu nhiên một trong tối đa 3 thuộc tính');
P('    của `platina_magicattr.txt` theo tỉ lệ %. Ý nghĩa cột "ActiveRate" (luôn 100) và thời điểm quay: ❓.');
P('- **Yêu cầu** lấy từ 6 cột yêu cầu; **cơ bản** = 7 thuộc tính cơ bản (phòng thủ, độ bền, sát thương vũ khí…).');
P('- Một số câu gốc của `magicdesc.ini` hơi lạ (vd. `armordefense_v` ghi "Né tránh") — giữ nguyên văn bản gốc.');
P();
P('## 2.1 Thứ tự ô kích hoạt (nhắc lại từ tài liệu 09 §6)');
P();
P('Nón ← {áo, dây chuyền} · Áo ← {nhẫn 2, đai} · Đai ← {ngọc bội, hộ uyển} · Vũ khí ← {dây chuyền, áo} · Giày ← {vũ khí, nón} ·');
P('Hộ uyển ← {giày, nhẫn 1} · Dây chuyền ← {đai, nhẫn 2} · Nhẫn 1 ← {vũ khí, nón} · Nhẫn 2 ← {hộ uyển, ngọc bội} · Ngọc bội ← {giày, nhẫn 1}.');
P('Tương sinh: Kim → Thủy → Mộc → Hỏa → Thổ → Kim.');
P();
P('## 3–4. Từng bộ, từng món');
P();
for (const [f, ss] of byFaction) {
  P(`### ${FACTION[f]}`);
  P();
  for (const s of ss) {
    const items = goldItems.filter(i => i.suite === s);
    const plats = thienTu.filter(t => t.suite === s);
    P(`#### Bộ ${setName(items)} (số bộ ${s})`);
    P();
    P(`- Hoàng kim (5 món): ${items.map(i => `${i.name} (${SLOT[num(i.r, 2)]})`).join(' · ')}`);
    P(`- Thiên Tứ (${plats.length} món): ${plats.map(i => `${i.name.replace('[Thiên Tứ] ', '')} (${SLOT[num(i.r, 2)]})`).join(' · ')}`);
    const onlyGold = items.filter(g => !plats.some(t => sameName(g, t))), onlyPlat = plats.filter(t => !items.some(g => sameName(g, t)));
    if (onlyGold.length || onlyPlat.length) P(`- Khác món giữa hai bản: chỉ hoàng kim có ${onlyGold.map(i => i.name).join(', ') || '—'}; chỉ Thiên Tứ có ${onlyPlat.map(i => i.name.replace('[Thiên Tứ] ', '')).join(', ') || '—'}.`);
    P();
    P(`##### Hoàng kim — bộ ${setName(items)}`);
    P();
    for (const g of items) {
      const r = g.r;
      P(`###### ${g.name} — ${SLOT[num(r, 2)]}`);
      P();
      P(`- Hệ **${SERIES[num(r, 9)] ?? cell(r, 9)}** · cấp đồ ${cell(r, 11)} · giá ${cell(r, 10)} lượng · ô túi ${cell(r, 6)}×${cell(r, 7)} · \`goldequip.txt\` dòng ${g.row}`);
      P(`- Yêu cầu: ${reqText(r)}`);
      P(`- Cơ bản: ${baseText(r)}`);
      P();
      P('| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |');
      P('|---|---|---|');
      for (let k = 0; k < 6; k++) { const gi = num(r, 46 + k); P(`| ${k + 1} | ${k % 2 ? 'ẩn' : 'hiện'} | ${gi > 0 ? geLine(gi) : '—'} |`); }
      P();
    }
    P(`##### Thiên Tứ — bộ ${setName(items)}`);
    P();
    for (const t of plats) {
      const r = t.r;
      const g = items.find(x => sameName(x, t));
      if (g) matched++;
      P(`###### ${t.name} — ${SLOT[num(r, 2)]}${g && num(g.r, 2) !== num(r, 2) ? ` (bản hoàng kim cùng tên là ${SLOT[num(g.r, 2)]} — bảng mod lệch ô 🟡)` : ''}`);
      P();
      P(`- Hệ **${SERIES[num(r, 9)] ?? cell(r, 9)}** · cấp đồ ${cell(r, 11)} · giá ${cell(r, 10)} lượng · ô túi ${cell(r, 6)}×${cell(r, 7)} · \`platinaequip.txt\` dòng ${t.row}`);
      P(`- Yêu cầu: ${reqText(r)}`);
      P(`- Cơ bản: ${baseText(r)}`);
      P();
      P('| # | Dòng | Ở +0 | Ở +10 |');
      P('|---|---|---|---|');
      for (let k = 0; k < 6; k++) {
        const t0 = num(r, 46 + 2 * k), t10 = num(r, 47 + 2 * k);
        P(`| ${k + 1} | ${k % 2 ? 'ẩn' : 'hiện'} | ${t0 > 0 ? geLine(t0) : '—'} | ${t10 > 0 ? geLine(t10) : '—'} |`);
      }
      P();
      P(`- Kỹ năng ở +6: ${platSkill(num(r, 59), [6, 7, 8, 9, 10])}`);
      P(`- Kỹ năng ở +10: ${platSkill(num(r, 60), [10])}`);
      const rr = rateByRow.get(t.row);
      if (rr?.length) {
        withRates++;
        const slots = [...new Set(rr.map(x => num(x, 2)))].sort((a, b) => a - b);
        for (const sNo of slots) {
          const per = rr.filter(x => num(x, 2) === sNo).sort((a, b) => num(a, 1) - num(b, 1));
          const txt = per.map(x => {
            const opts = [[num(x, 4), num(x, 5)], [num(x, 6), num(x, 7)], [num(x, 8), num(x, 9)]].filter(([pp]) => pp > 0);
            return `+${cell(x, 1)}: ${opts.map(([pp, idx]) => `${pp}% ${paLine(idx)}`).join(' / ')}`;
          }).join('; ');
          P(`- Dòng thêm ${sNo} khi cường hóa: ${txt}`);
        }
      } else P('- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.');
      P();
    }
  }
}
// ---------- other kinds ----------
P('## 5. Các loại trang bị khác (ghi chú, chưa mô tả chi tiết)');
P();
P('Đếm từ `goldequip.txt` / `platinaequip.txt` theo số bộ và tiền tố tên. Ý nghĩa tiền tố là 🟡 suy từ tên; cấp yêu cầu ✅.');
P();
const fam = new Map<string, { sets: Set<number>; items: number; lv: Set<number>; fac: Set<string>; file: string; sample: string }>();
const reqLv = (r: string[]) => { for (let k = 34; k < 46; k += 2) if (num(r, k) === 36) return num(r, k + 1); return 0; };
for (const [file, rows, sc] of [['goldequip', gold, 52], ['platinaequip', plat, 58]] as const) {
  rows.slice(1).forEach(r => {
    const n = nameOf(r[0]);
    const s = num(r, sc);
    const pre = /^\[([^\]]+)\]/.exec(n)?.[1];
    const base = n.replace(/^\[[^\]]+\]\s*/, '');
    const chinese = n.includes('(tên gốc tiếng Trung)');
    let key: string;
    if (pre) key = `[${pre}] (tiền tố)`;
    else if (n.includes('(kỳ hạn)')) key = '… (kỳ hạn) (hậu tố)';
    else if (file === 'goldequip' && s >= 1 && s <= 28) key = 'Hoàng kim môn phái (mục 3–4)';
    else if (chinese) key = '(tên gốc tiếng Trung, chưa dịch)';
    else key = base.split(' ').slice(0, 2).join(' ');
    const k = `${file}|${key}`;
    const f = fam.get(k) ?? { sets: new Set(), items: 0, lv: new Set(), fac: new Set(), file, sample: n };
    f.sets.add(s); f.items++; f.lv.add(reqLv(r)); const fc = facOf(r); f.fac.add(fc >= 0 ? FACTION[fc] : '—');
    fam.set(k, f);
  });
}
for (const file of ['goldequip', 'platinaequip']) {
  P(`### ${file === 'goldequip' ? 'Hoàng kim' : 'Bạch kim'} (\`${file}.txt\`)`);
  P();
  P('| Họ / tiền tố | Số món | Số bộ | Cấp yêu cầu | Môn phái | Ví dụ |');
  P('|---|---|---|---|---|---|');
  const all = [...fam].filter(([k]) => k.startsWith(file + '|')).sort((a, b) => b[1].items - a[1].items);
  const list = all.filter(([, f]) => f.items >= 4), small = all.filter(([, f]) => f.items < 4);
  for (const [k, f] of list) {
    const lv = [...f.lv].filter(x => x > 0);
    P(`| ${k.split('|')[1]} | ${f.items} | ${f.sets.size} | ${lv.length ? `${Math.min(...lv)}–${Math.max(...lv)}` : '—'} | ${f.fac.size > 3 ? `${f.fac.size} phái` : [...f.fac].join(', ')} | ${f.sample.slice(0, 60)} |`);
  }
  if (small.length) P(`| ${small.length} họ nhỏ khác (dưới 4 món) | ${small.reduce((a, [, f]) => a + f.items, 0)} | | | | ${small.slice(0, 6).map(([, f]) => f.sample.slice(0, 28)).join(' · ')} … |`);
  P();
}
P('Trang bị ngoài hai bảng trên (đã có trong BACKLOG nhóm VP):');
P();
P('| Loại | Bảng | Ghi chú |');
P('|---|---|---|');
P('| Trắng (thường) | `meleeweapon`, `rangeweapon`, `armor`, `helm`, `boot`, `belt`, `cuff`, `ring`, `amulet`, `pendant` (10 bảng, cấp 1–10) | Game đã có tên / hình; chưa có chỉ số đầy đủ (VP2) |');
P('| Xanh (dòng ngẫu nhiên) | `magicattrib.txt` 330 dòng | VP6 |');
P('| Tím (khảm) | `magicattriblevel.txt` 480 dòng | Khảm đá, 5 % hỏng (tài liệu 09 §10) |');
P('| Mặt nạ, áo choàng | `mask.txt` 840, `mantle.txt` 3 (file rời) | VP3 |');
P('| Ngựa | `horse.txt` 33 loại × 10 cấp + ngựa hoàng kim / bạch kim (tiền tố ở bảng trên) | Game đã có 54 ngựa, chỉ có tốc độ |');
P();
P('## 6. Chưa rõ và cách sinh lại');
P();
P('- ❓ Giá trị bạch kim ở +1…+9 (nội suy giữa +0 và +10?), cách nâng cấp (nguyên liệu, tỉ lệ thành công): chỉ có bảng.');
P('- ❓ Cấp kỹ năng bạch kim = cấp cường hóa? (bảng chỉ ghi kỹ năng mở ở +6 / +10).');
P('- ❓ Cột `ActiveRate` của `platina_magicrate.txt` (luôn 100) và các cột `可熔炼…`, `是否可升星装备`, `可镶嵌星辰石数量`, `装备突破祝福值` (để trống ở các món này).');
P('- 🟡 Dòng ẩn / kích hoạt bộ theo engine fork; bản SHXT thật có thể khác.');
P(`- Kiểm tra khi sinh: ${goldItems.length} món hoàng kim, ${thienTu.length} món Thiên Tứ (${matched} trùng tên món hoàng kim); ${withRates} món Thiên Tứ có bảng dòng thêm khi cường hóa (\`platina_magicrate.txt\` có 120 món).`);
P('- Sinh lại: `cd apps/client && npx tsx tools/doc-gold.ts` (cần `../jx-origin`; đặt `JX_CLIENT` nếu ở chỗ khác).');
fs.writeFileSync(OUT, L.join('\n') + '\n');
console.log('wrote', OUT, L.length, 'lines; matched', matched, '/', goldItems.length, 'rates', withRates);
