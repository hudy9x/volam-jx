import {
  CAMP_NAMES, CANKHON_RING_ID, FACTIONS, LEVEL, campOf, factionAllowsGender, pointsAtLevel, type Element, MAX_MONEY, TOKEN, TOKEN_ITEM, TOKEN_ITEM_ID, TOWN_PORTAL_ID, addToBag, createGold, expToNext, factionSuites, findPlace, getSkill,
  learnTiers, levelCap, type Item, type TokenOp,
} from '@vltk/shared';
import { db } from '../account/db.js';
import type { Sim } from './entity.js';
import { addMoney, makeItem, newItemUid } from './inventory.js';
import { gainExp, refreshStats, unlockSkills, washPoints } from './progress.js';
import { refreshCamp } from './teams.js';
import type { World } from './World.js';

// Lệnh bài (USER 2026-11-12; packages/shared/src/items/token.ts): every character carries one; its menu options run here.

/** Give the lệnh bài back when the character has none (bag or worn); false when the bag is full. */
export function ensureToken(sim: Sim): boolean {
  let added = false;
  // Thổ Địa Phù vĩnh cửu (items/books.ts) too: every character carries one.
  for (const def of [TOKEN_ITEM.id, TOWN_PORTAL_ID]) {
    if (sim.bag?.some(it => it?.def === def) || sim.bagSpill?.some(it => it.def === def)) continue;
    added = addToBag(sim.bag!, { uid: newItemUid(), def }) || added;
  }
  return added;
}

/** One option of the lệnh bài menu (the character must carry it). Returns true when the inventory changed. */
export function useToken(w: World, sim: Sim, op: TokenOp, suite?: number, faction?: string): boolean {
  if (sim.dead || !sim.progress) return false;
  if (!sim.bag?.some(it => it?.def === TOKEN_ITEM_ID)) { w.hooks.notify(sim, 'Không có Lệnh bài trong hành trang.'); return false; }
  const p = sim.progress.prog;
  switch (op) {
    case 'level': {
      const to = Math.min(LEVEL.max, TOKEN.level);
      if (p.level >= to) { w.hooks.notify(sim, `Đã đạt cấp ${p.level}.`); return false; }
      while (p.level < to) if (!gainExp(w, sim, expToNext(p.level) - p.exp)) break;
      return false;
    }
    case 'exp': {
      const gain = TOKEN.expMin + Math.floor(Math.random() * (TOKEN.expMax - TOKEN.expMin + 1));
      w.hooks.notify(sim, `Nhận được ${gain.toLocaleString('vi-VN')} điểm kinh nghiệm.`);
      gainExp(w, sim, gain);
      return false;
    }
    case 'skills':
      learnTierSkills(w, sim);
      return false;
    case 'money': {
      if ((sim.money ?? 0) >= MAX_MONEY) { w.hooks.notify(sim, 'Ngân lượng đã đầy.'); return false; }
      addMoney(sim, TOKEN.money);
      w.hooks.notify(sim, `Nhận được ${TOKEN.money / 10_000} vạn lượng.`);
      return true;
    }
    case 'tkAccum': {
      if (!sim.charId) return false;
      const char = db.getCharacter(sim.charId);
      if (!char) return false;
      const next = Math.max(0, Math.floor(char.tkAccum ?? 0)) + TOKEN.tkAccum;
      db.updateCharacter(sim.charId, { tkAccum: next });
      w.hooks.notify(sim, `Nhận được ${TOKEN.tkAccum.toLocaleString('vi-VN')} điểm tích lũy Tống Kim (hiện có ${next.toLocaleString('vi-VN')}).`);
      return false;
    }
    case 'gold':
      return giveSuite(w, sim, Number(suite));
    case 'faction':
      return changeFaction(w, sim, String(faction ?? ''));
    case 'gender':
      return changeGender(w, sim);
    case 'ring': {
      const made = makeItem(CANKHON_RING_ID);
      if (!made || !addToBag(sim.bag!, made)) { w.hooks.notify(sim, 'Hành trang không đủ chỗ.'); return false; }
      w.hooks.notify(sim, 'Nhận được Càn Khôn Giới Chỉ.');
      return true;
    }
    case 'washPotential':
    case 'washSkills':
      washPoints(w, sim, op === 'washPotential' ? 'potential' : 'skills');
      return false;
    case 'graduate':
      return toggleGraduate(w, sim);
  }
  return false;
}

/** Xuất sư (camp 'free', red name colour) / trở về trận doanh môn phái. */
function toggleGraduate(w: World, sim: Sim): boolean {
  if (!sim.a.faction) { w.hooks.notify(sim, 'Phải gia nhập môn phái trước.'); return false; }
  sim.graduated = !sim.graduated;
  refreshCamp(sim);
  if (sim.graduated) {
    w.hooks.notify(sim, 'Đã xuất sư (màu đỏ — trận doanh Xuất sư).');
  } else {
    const camp = campOf(sim.a.faction, false);
    w.hooks.notify(sim, `Đã trở về trận doanh ${CAMP_NAMES[camp]} (${FACTIONS[sim.a.faction]?.name ?? sim.a.faction}).`);
  }
  return false;
}

/**
 * Every skill of the faction's 90 / 120 / 150 tiers, learned at once at the highest level the character's level allows
 * (skills/core/learning.ts levelCap) — no bí kíp, no thục luyện.
 */
function learnTierSkills(w: World, sim: Sim): void {
  if (!sim.a.faction) { w.hooks.notify(sim, 'Phải gia nhập môn phái trước.'); return; }
  const level = sim.progress!.prog.level;
  const ids = learnTiers(sim.a.faction)
    .filter(t => (TOKEN.tiers as readonly number[]).includes(t.level) && t.label.startsWith('Cấp'))
    .flatMap(t => t.skills);
  const names: string[] = [];
  let low = 0;
  for (const id of ids) {
    const s = getSkill(id);
    if (!s) continue;
    const cap = levelCap(s, level);
    if (cap < 1) { low++; continue; }
    if ((sim.skills.get(id) ?? 0) >= cap) continue;
    sim.skills.set(id, cap);
    sim.progress!.skillExp.delete(id);
    names.push(`${s.name} (${cap})`);
  }
  if (names.length) {
    refreshStats(sim);
    w.hooks.skills(sim);
    w.hooks.notify(sim, `Đã học: ${names.join(', ')}.`);
  } else w.hooks.notify(sim, 'Không còn kỹ năng cấp 90 / 120 / 150 nào để học thêm.');
  if (low) w.hooks.notify(sim, `${low} kỹ năng chưa đủ cấp nhân vật để học (thăng cấp rồi dùng lại).`);
}

/** A whole hoàng kim môn phái set of the own faction (5 pieces, rolled with the character's luck) into the bag. */
function giveSuite(w: World, sim: Sim, suite: number): boolean {
  if (!sim.a.faction) { w.hooks.notify(sim, 'Phải gia nhập môn phái trước.'); return false; }
  const set = factionSuites(sim.a.faction).find(s => s.suite === suite);
  if (!set) { w.hooks.notify(sim, 'Bộ trang bị không thuộc môn phái của bạn.'); return false; }
  const bag = sim.bag!;
  const copy = [...bag];
  const pieces: Item[] = set.pieces.map(def => createGold(def, newItemUid(), sim.stats?.luck ?? 5));
  for (const it of pieces) {
    const at = findPlace(copy, set.pieces.find(d => d.id === it.def));
    if (at < 0) { w.hooks.notify(sim, `Hành trang (cả rương) không đủ chỗ cho ${pieces.length} món.`); return false; }
    copy[at] = it;
  }
  for (const it of pieces) addToBag(bag, it);
  w.hooks.notify(sim, `Nhận được bộ ${set.name} (${pieces.length} món).`);
  return true;
}

/**
 * Potential and skill points back to their defaults (every point the level gave, unspent), skills of the faction learned
 * again from scratch (start levels; tiers 90 / 120 / 150 need bí kíp again). Items and level stay.
 */
function resetPoints(sim: Sim): void {
  const p = sim.progress!.prog;
  const pts = pointsAtLevel(p.level);
  p.added = { str: 0, dex: 0, vit: 0, eng: 0 };
  p.potentialPoints = pts.potential;
  p.skillPoints = pts.skill;
  sim.skills.clear();
  sim.progress!.skillExp.clear();
  unlockSkills(sim);
  refreshStats(sim, true);
}

/** Đổi phái: any faction that takes the character's sex (the hệ becomes the faction's); level ≥ the joining level. */
function changeFaction(w: World, sim: Sim, faction: string): boolean {
  const f = FACTIONS[faction];
  if (!f) { w.hooks.notify(sim, 'Môn phái không tồn tại.'); return false; }
  if (faction === sim.a.faction) { w.hooks.notify(sim, `Đang ở ${f.name}.`); return false; }
  if (sim.progress!.prog.level < LEVEL.factionJoin) { w.hooks.notify(sim, `Cần đạt cấp ${LEVEL.factionJoin}.`); return false; }
  if (!factionAllowsGender(faction, sim.a.gender as never)) { w.hooks.notify(sim, `${f.name} chỉ nhận đệ tử ${f.gender === 'male' ? 'nam' : 'nữ'}.`); return false; }
  sim.a.faction = faction;
  sim.graduated = false;
  sim.progress!.series = f.element as Element;
  refreshCamp(sim);
  resetPoints(sim);
  w.hooks.notify(sim, `Đã chuyển sang ${f.name}. Điểm tiềm năng và kỹ năng đã trả về để cộng lại.`);
  w.hooks.progress(sim);
  w.hooks.skills(sim);
  return true;
}

/** Đổi giới tính: refused when the faction takes only the current sex (change faction first). */
function changeGender(w: World, sim: Sim): boolean {
  const next = sim.a.gender === 'female' ? 'male' : 'female';
  const f = FACTIONS[sim.a.faction];
  if (f && !factionAllowsGender(f.id, next as never)) { w.hooks.notify(sim, `${f.name} chỉ nhận đệ tử ${f.gender === 'male' ? 'nam' : 'nữ'}: đổi phái trước.`); return false; }
  sim.a.gender = next;
  resetPoints(sim);
  w.hooks.notify(sim, `Đã đổi sang nhân vật ${next === 'female' ? 'nữ' : 'nam'}. Điểm tiềm năng và kỹ năng đã trả về để cộng lại.`);
  w.hooks.progress(sim);
  w.hooks.skills(sim);
  return true;
}
