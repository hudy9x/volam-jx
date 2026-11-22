import { equipSkillBonus, equipmentFortune, isMantleActive, lookOf, wornActiveCount, itemNeeds, planPotential, planSkills, pointsAtLevel,
  BASIC_SKILLS, FACTIONS, LEVEL, POTENTIALS, addAttr, addExp, getExpElixirMultiplier, mergeBag, moveFactor, passiveBag, playerCombat, resolveSpeed, skillBonuses, stateBag, baseValue, characterStats, expAfterGap, expShare,
  expToNext, getSkill, isoDistance, itemDef, joinFactionError, learnableSkills, levelCap, monsterExp, newProgress, practicePerHit,
  TIER_BOOKS, learnTiers, raiseError, skillExpToNext, skillGrowth, startLevel, tierOf, weaponBaseDamage, weaponTypeOf,
  QUALITY, activeLines, bossMultiplier, seriesOf, passiveVisualSkills,
  type AttrBag, type BookEffect, type ItemViewer, type Element, type EquipSlot, type Equipment, type Item, type Potential, type Progress,
} from '@vltk/shared';
import { ArraySchema } from '@colyseus/schema';
import type { Sim } from './entity.js';
import { syncVitals } from './systems/sync.js';
import { refreshCamp } from './teams.js';
import type { World } from './World.js';

// Character progression on the server: stats from the shared formulas, exp from kills, level ups, potential points,
// joining a faction at level 10, skills that appear at their level, skill points and practice (thục luyện).
// Rules: packages/shared/src/formulas/ + skills/core/learning.ts; docs/formulas/.

/** Who wears / looks at items (equip requirements, items/equip.ts): sex, faction, hệ, level, Sức mạnh / Thân pháp now. */
export function viewerOf(sim: Sim): ItemViewer {
  const st = sim.stats;
  return {
    gender: sim.a.gender, faction: sim.a.faction, series: sim.progress?.series,
    level: sim.progress?.prog.level, str: st?.str, dex: st?.dex, fortune: sim.fortune,
  };
}

/** Learned levels + the levels worn pieces add (sim.skillBonus): what skills are used at. */
export function effectiveSkills(sim: Sim): Map<number, number> {
  if (!sim.skillBonus?.size) return sim.skills;
  const out = new Map(sim.skills);
  for (const [id, b] of sim.skillBonus) out.set(id, (out.get(id) ?? 0) + b);
  return out;
}

export interface PlayerProgress {
  series: Element;
  prog: Progress;
  /** Practice exp toward the next level of each practice / kill-exp skill. */
  skillExp: Map<number, number>;
}

/** Restore stored progress; records saved before levels existed restart at level 1 without a faction (user 2026-11-12). */
export function restoreProgress(stored: Partial<Progress> | undefined, fresh: boolean): Progress {
  const p = newProgress();
  if (fresh || !stored) return p;
  const n = (v: unknown, lo: number, hi: number) => (Number.isFinite(Number(v)) ? Math.max(lo, Math.min(hi, Math.floor(Number(v)))) : lo);
  p.level = n(stored.level, 1, LEVEL.max);
  p.exp = n(stored.exp, 0, 4e9);
  p.potentialPoints = n(stored.potentialPoints, 0, 5000);
  p.skillPoints = n(stored.skillPoints, 0, 1000);
  for (const k of POTENTIALS) p.added[k] = n(stored.added?.[k], 0, 5000);
  return p;
}

/**
 * Attributes of the worn items: base attributes (Né tránh, Sinh lực…; weapon damage goes through the weapon) and — TB8,
 * USER: blue pieces and hoàng kim môn phái (TB11) only — their magic lines: prefixes always, hidden lines when activated
 * (items/magic.ts activeHidden: ngũ hành tương sinh of the activating slots and of the character).
 */
export function equipmentBag(equip: Equipment, charSeries = -1, mounted = true): AttrBag {
  const bag: AttrBag = {};
  for (const [slot, item] of Object.entries(equip) as [EquipSlot, Item | undefined][]) {
    const def = itemDef(item);
    if (!def || !item) continue;
    // The horse (its tốc độ chạy fastwalkrun_p…) counts only while riding it (USER 2026-11-13).
    if (slot === 'horse' && !mounted) continue;
    // Phi phong chỉ có hiệu lực khi nhân vật đang đủ mốc Tài phú Binh giáp (chống tài phú ảo).
    if (slot === 'mantle' && !isMantleActive(equip, charSeries)) continue;
    for (const [name] of def.base) {
      if (name === 'weapondamagemin_v' || name === 'weapondamagemax_v' || name === 'durability_v') continue;
      addAttr(bag, name, baseValue(def, item, name) ?? 0);
    }
    if ((item.q !== QUALITY.magic && item.q !== QUALITY.gold) || !item.magic) continue;
    // Hoàng kim (TB13): the full set (or a Càn Khôn Giới Chỉ) turns every hidden line on. allskill_v → skill levels
    // (equipSkillBonus), not an attribute.
    const on = activeLines(item, wornActiveCount(equip, slot, charSeries));
    item.magic.forEach(([name, value, hidden], i) => { if (name !== 'allskill_v' && (!hidden || on.has(i))) addAttr(bag, name, value); });
  }
  return bag;
}

/** Recompute stats (Sinh lực / Nội lực tối đa, Chính xác, Né, kháng, lực tay) after level, points or equipment changed. */
export function refreshStats(sim: Sim, fresh = false): void {
  const pp = sim.progress!;
  const equip = sim.equip ?? {};
  const wtype = weaponTypeOf(itemDef(equip.weapon));
  const [min, max] = weaponBaseDamage(equip) ?? [1, 2];
  // Attribute bag: worn items + passive skills + bùa lợi / bùa hại / hào quang on it (formulas/attrs.ts).
  // Skill levels from the worn pieces (allskill_v): every learned skill (level > 0) of the faction / that skill.
  const plus = equipSkillBonus(equip, seriesOf(pp.series));
  const factionSkills = new Set(sim.a.faction ? learnableSkills(sim.a.faction) : []);
  sim.skillBonus = new Map();
  for (const [id, lv] of sim.skills) {
    if (lv <= 0) continue;
    const b = (factionSkills.has(id) ? plus.all : 0) + (plus.per[id] ?? 0);
    if (b) sim.skillBonus.set(id, b);
  }
  const levels = effectiveSkills(sim);
  const visuals = passiveVisualSkills(levels);
  if (visuals.join() !== [...sim.a.passiveFx].join()) sim.a.passiveFx = new ArraySchema<number>(...visuals);
  const seriesIdx = seriesOf(pp.series);
  sim.fortune = equipmentFortune(equip, seriesIdx);
  sim.a.mantle = isMantleActive(equip, seriesIdx) ? lookOf(equip).mantle : -1;
  const rawBag = mergeBag(mergeBag(equipmentBag(equip, seriesIdx, sim.a.mounted), passiveBag(levels, wtype)), stateBag(sim.states, wtype));
  // Tống Kim rank buff (SHXT skill 661): lifemax_p = 10 + 10*rank, allres_p = 5*(rank - 1).
  const bag = sim.a.battleCamp && sim.a.battleRank > 0
    ? mergeBag(rawBag, {
        lifemax_p: [10 + 10 * sim.a.battleRank, 0, 0],
        allres_p: [5 * Math.max(0, sim.a.battleRank - 1), 0, 0],
      })
    : rawBag;
  const stats = characterStats({
    series: pp.series, level: pp.prog.level, added: pp.prog.added, bag,
    weapon: { kind: !equip.weapon ? 'none' : wtype >= 100 ? 'ranged' : 'melee', min, max },
  });
  sim.stats = stats;
  sim.combat = playerCombat(stats, pp.prog.level, pp.series, wtype, bag, skillBonuses(levels));
  sim.moveScale = sim.devRunPercent !== undefined
    ? resolveSpeed('run', sim.devRunPercent).multiplier
    : moveFactor(bag, (sim.effects?.slowUntil ?? 0) > Date.now());
  sim.a.level = pp.prog.level;
  sim.a.maxHp = stats.life;
  sim.a.maxMp = stats.mana;
  sim.baseDamage = [stats.physMin, stats.physMax];
  if (fresh) { sim.hp = stats.life; sim.mp = stats.mana; }
  sim.hp = Math.min(sim.hp, stats.life);
  sim.mp = Math.min(sim.mp, stats.mana);
  syncVitals(sim);
}

/**
 * Skills the character has now: the basic attacks, the skills every character learns (Khinh công…) and, after joining,
 * the faction's skills whose ReqLevel is reached — each at its start level (0 for point skills, 1 for practice skills),
 * keeping levels already earned. Returns true when something was added.
 */
export function unlockSkills(sim: Sim, stored?: Record<string, number>): boolean {
  const level = sim.progress!.prog.level;
  const ids = [...BASIC_SKILLS, ...learnableSkills('common'), ...(sim.a.faction ? learnableSkills(sim.a.faction) : [])];
  let added = false;
  for (const id of ids) {
    const s = getSkill(id);
    if (!s) continue;
    if (s.inactive) {
      if ((sim.skills.get(id) ?? 0) > 0) { sim.skills.set(id, 0); added = true; }
      continue;
    }
    const start = BASIC_SKILLS.includes(id) ? Math.max(1, startLevel(s)) : startLevel(s);
    if (sim.skills.has(id)) {
      if ((sim.skills.get(id) ?? 0) < start) { sim.skills.set(id, start); added = true; }
      continue;
    }
    const kept = Number(stored?.[id]);
    // Tiers 90 / 120 / 150 appear only through a bí kíp (Kỳ Trân Các); already learned ones stay.
    if (!(kept >= 0 && stored && id in stored) && sim.a.faction && TIER_BOOKS.includes(tierOf(sim.a.faction, id)?.level ?? 0)) continue;
    if ((s.reqLevel ?? 1) > level && !BASIC_SKILLS.includes(id) && s.pack !== 'common') continue;
    sim.skills.set(id, Number.isFinite(kept) && kept >= start ? Math.min(kept, s.maxLevel ?? 20) : start);
    added = true;
  }
  return added;
}

/** Add exp; level ups give points, refill Sinh lực / Nội lực and open skills. Returns levels gained. */
export function gainExp(w: World, sim: Sim, gain: number): number {
  const p = sim.progress!.prog;
  const r = addExp(p.level, p.exp, gain);
  p.exp = r.exp;
  if (!r.levels) { w.hooks.progress(sim); return 0; }
  p.level = r.level;
  p.potentialPoints += r.levels * LEVEL.potentialPerLevel;
  p.skillPoints += r.levels * LEVEL.skillPointsPerLevel;
  refreshStats(sim, true);
  unlockSkills(sim);
  w.hooks.notify(sim, `Chúc mừng bạn đã thăng lên cấp ${p.level}! +${r.levels * LEVEL.potentialPerLevel} điểm tiềm năng, +${r.levels * LEVEL.skillPointsPerLevel} điểm kỹ năng.`);
  if (p.level >= LEVEL.factionJoin && !sim.a.faction) w.hooks.notify(sim, `Đã đủ cấp ${LEVEL.factionJoin}: có thể gia nhập môn phái (Kỹ năng → Gia nhập môn phái).`);
  w.events.push({ t: 'lvup', id: sim.id, level: p.level });
  w.hooks.progress(sim);
  w.hooks.skills(sim);
  return r.levels;
}

/** Record damage dealt to a monster (its exp is shared by damage when it dies). */
export function recordDamage(target: Sim, attacker: Sim, dmg: number): void {
  if (target.kind !== 'monster' || attacker.kind !== 'player' || dmg <= 0) return;
  (target.dmgBy ??= new Map()).set(attacker.id, (target.dmgBy.get(attacker.id) ?? 0) + dmg);
}

/**
 * A monster died. The killer gets 100 % of its exp and every other member of the killer's team near it LEVEL.teamExpPct %
 * (USER 2026-11-13, hit or not); any other player who hurt it gets exp × damage ÷ max Sinh lực. All after the level gap.
 */
export function shareKillExp(w: World, monster: Sim, killer?: Sim): void {
  const total = monster.def?.expOverride !== undefined
    ? monster.def.expOverride
    : monsterExp(monster.a.level, bossMultiplier(monster.a.boss));
  const near = (p: Sim | undefined): p is Sim => !!p && !p.dead && p.kind === 'player' && !!p.progress
    && isoDistance(p.a.x, p.a.y, monster.a.x, monster.a.y) <= LEVEL.expShareRange;
  const tag = monster.a.boss >= 2 ? 'Boss Hoàng Kim ' : monster.a.boss === 1 ? 'Boss Xanh ' : '';
  const who = `${tag}${monster.a.name} (cấp ${monster.a.level})`;
  // Kênh Hệ thống (USER 2026-11-13): the killer sees the kill (with its exp), the others the exp they got.
  const give = (p: Sim, exp: number, kill = false) => {
    const baseGain = exp > 0 ? expAfterGap(exp, p.progress!.prog.level, monster.a.level) : 0;
    const buff = p.expBuff && p.expBuff.until > Date.now() ? p.expBuff : undefined;
    const mul = buff ? Math.max(1, getExpElixirMultiplier(buff.tier)) : 1;
    const gain = Math.round(baseGain * mul);
    const mulTag = mul > 1 ? ` (×${mul})` : '';
    const pts = gain > 0 ? `+${gain.toLocaleString('vi-VN')} kinh nghiệm${mulTag}` : '';
    if (kill) w.hooks.log(p, 'kill', `Đánh bại ${who}${pts ? `: ${pts}` : total <= 0 ? ' (0 kinh nghiệm)' : ' (chênh cấp, không có kinh nghiệm)'}.`);
    else if (pts) w.hooks.log(p, 'exp', `${who}: ${pts}.`);
    if (gain > 0) gainExp(w, p, gain);
  };
  const done = new Set<string>();
  if (killer?.kind === 'player' && !near(killer)) w.hooks.log(killer, 'kill', `Đánh bại ${who} (ở xa, không nhận kinh nghiệm).`);
  if (killer?.kind === 'player' && near(killer)) {
    give(killer, total, true);
    done.add(killer.id);
    if (killer.a.team) for (const p of w.sims.values()) {
      if (p === killer || p.a.team !== killer.a.team || !near(p)) continue;
      give(p, Math.floor((total * LEVEL.teamExpPct) / 100));
      done.add(p.id);
    }
  }
  for (const [id, dmg] of monster.dmgBy ?? []) {
    const p = w.sims.get(id);
    if (done.has(id) || !near(p)) continue;
    give(p, expShare(total, monster.a.maxHp, dmg));
  }
  monster.dmgBy = undefined;
}

/** Spend potential points (F3 +). */
export function addPotential(w: World, sim: Sim, stat: Potential, n: number): boolean {
  const p = sim.progress!.prog;
  const k = Math.min(Math.floor(n), p.potentialPoints);
  if (!POTENTIALS.includes(stat) || !(k > 0)) return false;
  p.potentialPoints -= k;
  p.added[stat] += k;
  refreshStats(sim);
  w.hooks.progress(sim);
  return true;
}

/** Join a faction of the own hệ at level 10+: its skills of reached levels appear. */
export function joinFaction(w: World, sim: Sim, faction: string): boolean {
  const pp = sim.progress!;
  const err = joinFactionError({ level: pp.prog.level, faction: sim.a.faction, series: pp.series, gender: sim.a.gender as never }, faction);
  if (err) { w.hooks.notify(sim, err); return false; }
  sim.a.faction = faction;
  refreshCamp(sim);
  unlockSkills(sim);
  w.hooks.notify(sim, `Đã gia nhập ${FACTIONS[faction].name}. Mở Kỹ năng (F) để cộng điểm.`);
  w.hooks.progress(sim);
  w.hooks.skills(sim);
  return true;
}

/** One skill point into a point skill. */
export function raiseSkill(w: World, sim: Sim, id: number): boolean {
  const p = sim.progress!.prog;
  const levels = Object.fromEntries(sim.skills);
  const err = raiseError(id, levels, p.level, p.skillPoints);
  if (err) { w.hooks.notify(sim, err); return false; }
  sim.skills.set(id, (sim.skills.get(id) ?? 0) + 1);
  p.skillPoints--;
  refreshStats(sim); // passives and addskilldamage bonuses
  w.hooks.progress(sim);
  w.hooks.skills(sim);
  return true;
}

/**
 * Use a bí kíp (items/books.ts): 'learn' adds the next skill of the tier (learning order) at its start level; 'master' puts
 * the lowest learned skill of the tier at level 20. False (book kept) when it cannot be used now.
 */
export function useBook(w: World, sim: Sim, book: BookEffect): boolean {
  const p = sim.progress!.prog;
  const need = book.tier === 90 ? 80 : book.tier;
  if (!sim.a.faction) { w.hooks.notify(sim, 'Phải gia nhập môn phái mới lĩnh ngộ được bí kíp.'); return false; }
  if (p.level < need) { w.hooks.notify(sim, `Cần đạt cấp ${need}.`); return false; }
  const tier = learnTiers(sim.a.faction).filter(t => t.level === book.tier && t.label.startsWith('Cấp')).flatMap(t => t.skills).filter(id => getSkill(id));
  if (!tier.length) { w.hooks.notify(sim, `Môn phái không có kỹ năng cấp ${book.tier}.`); return false; }
  if (book.kind === 'learn') {
    const id = tier.find(i => !sim.skills.has(i));
    if (id === undefined) { w.hooks.notify(sim, `Đã lĩnh ngộ hết kỹ năng cấp ${book.tier}.`); return false; }
    const s = getSkill(id)!;
    sim.skills.set(id, startLevel(s));
    w.hooks.notify(sim, `Lĩnh ngộ được ${s.name}!`);
  } else {
    const learned = tier.filter(i => sim.skills.has(i) && (sim.skills.get(i) ?? 0) < 20).sort((a, b) => (sim.skills.get(a) ?? 0) - (sim.skills.get(b) ?? 0));
    if (!learned.length) { w.hooks.notify(sim, `Không có kỹ năng cấp ${book.tier} nào dưới cấp 20.`); return false; }
    const id = learned[0], s = getSkill(id)!;
    sim.skills.set(id, Math.min(20, s.maxLevel ?? 20));
    sim.progress!.skillExp.delete(id);
    w.hooks.notify(sim, `${s.name} đã đại thành: cấp ${sim.skills.get(id)}!`);
  }
  refreshStats(sim);
  w.hooks.skills(sim);
  return true;
}

/** Practice exp for a landed hit of a practice skill (90 / 150): level up when its table is reached. */
export function practice(w: World, sim: Sim, skillId: number | undefined): void {
  if (!skillId || sim.kind !== 'player' || !sim.progress) return;
  const s = getSkill(skillId);
  const lv = sim.skills.get(skillId);
  if (!s || !lv || skillGrowth(s) !== 'practice') return;
  addSkillExp(w, sim, skillId, practicePerHit(s, lv));
}

function addSkillExp(w: World, sim: Sim, id: number, gain: number): void {
  const s = getSkill(id)!;
  const pp = sim.progress!;
  let lv = sim.skills.get(id)!;
  let exp = (pp.skillExp.get(id) ?? 0) + gain;
  const cap = levelCap(s, pp.prog.level);
  let up = 0;
  while (lv < cap && exp >= skillExpToNext(s, lv)) { exp -= skillExpToNext(s, lv); lv++; up++; }
  if (lv >= cap) exp = Math.min(exp, skillExpToNext(s, lv) - 1);
  pp.skillExp.set(id, exp);
  if (up) {
    sim.skills.set(id, lv);
    refreshStats(sim);
    w.hooks.notify(sim, `${s.name} đã luyện thành cấp ${lv}.`);
    w.hooks.skills(sim);
  }
}

/** Exp needed for the next level. */
export const expNext = (sim: Sim) => expToNext(sim.progress!.prog.level);

/**
 * Gợi ý cộng điểm (characters/suggest.ts): the same plan the client previewed, carried out at once (skills: one point at a
 * time through raiseError; potentials: the planned amounts).
 */
export function applySuggestion(w: World, sim: Sim, kind: 'skills' | 'potential', route?: string): boolean {
  const p = sim.progress!.prog;
  if (!sim.a.faction) { w.hooks.notify(sim, 'Phải gia nhập môn phái trước.'); return false; }
  if (kind === 'skills') {
    const plan = planSkills(sim.a.faction, route, Object.fromEntries(sim.skills), p.level, p.skillPoints);
    let spent = 0;
    for (const row of plan.rows) for (let k = row.before; k < row.to; k++) {
      if (raiseError(row.id, Object.fromEntries(sim.skills), p.level, p.skillPoints)) break;
      sim.skills.set(row.id, (sim.skills.get(row.id) ?? 0) + 1);
      p.skillPoints--;
      spent++;
    }
    if (!spent) { w.hooks.notify(sim, 'Không có kỹ năng nào cộng thêm được.'); return false; }
    refreshStats(sim);
    w.hooks.notify(sim, `Đã cộng ${spent} điểm kỹ năng · ${plan.route?.name ?? ''}.`);
    w.hooks.progress(sim);
    w.hooks.skills(sim);
    return true;
  }
  const st = sim.stats!;
  const plan = planPotential(sim.a.faction, route, Object.fromEntries(sim.skills), p.added, { str: st.str, dex: st.dex },
    itemNeeds(sim.equip ?? {}, sim.bag ?? [], viewerOf(sim)), p.potentialPoints);
  if (!plan.spent) { w.hooks.notify(sim, 'Không còn điểm tiềm năng.'); return false; }
  for (const k of POTENTIALS) p.added[k] += plan.add[k];
  p.potentialPoints -= plan.spent;
  refreshStats(sim);
  w.hooks.notify(sim, `Đã cộng ${plan.spent} điểm tiềm năng · ${plan.route?.name ?? ''}.`);
  w.hooks.progress(sim);
  return true;
}

/** Tẩy tủy (lệnh bài): every potential point back (unspent), or every point skill back to its start level (points back). */
export function washPoints(w: World, sim: Sim, what: 'potential' | 'skills'): boolean {
  const p = sim.progress!.prog;
  const pts = pointsAtLevel(p.level);
  if (what === 'potential') {
    p.added = { str: 0, dex: 0, vit: 0, eng: 0 };
    p.potentialPoints = pts.potential;
    w.hooks.notify(sim, `Tẩy tủy tiềm năng: trả lại ${pts.potential} điểm tiềm năng.`);
  } else {
    for (const [id] of sim.skills) {
      const s = getSkill(id);
      if (s && skillGrowth(s) === 'points' && !BASIC_SKILLS.includes(id)) sim.skills.set(id, startLevel(s));
    }
    p.skillPoints = pts.skill;
    w.hooks.notify(sim, `Tẩy tủy kỹ năng: trả lại ${pts.skill} điểm kỹ năng (chiêu luyện / bí kíp giữ nguyên).`);
    w.hooks.skills(sim);
  }
  refreshStats(sim);
  w.hooks.progress(sim);
  return true;
}
