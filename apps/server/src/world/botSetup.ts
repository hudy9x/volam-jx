import {
  botGreenLines, botHorsePool, characterStats, createGold, equipError, expToNext, FACTIONS, forgedMagic, getSkill,
  guessRoute, itemDef, itemNeeds, ITEMS, KIND_SLOTS, LEVEL, MAGIC_SLOTS, MAX_MONEY, QUALITY, resolveBotGoldLoadout,
  SERIES_KEYS, seriesPlan, SHOP_ITEMS, skillCategory, starterEquipment, weaponOk, weaponTypeOf, addToBag, CANKHON_RING_ID,
  type BotTemplate, type Element, type EquipSlot, type Equipment, type Gender, type Item, type ItemDef, type Progress,
} from '@vltk/shared';
import type { CharacterRecord } from '../account/db.js';
import { setMounted } from './commands.js';
import type { Sim } from './entity.js';
import { applyEquipment, equipItem, makeItem, newItemUid, outfitItems } from './inventory.js';
import { addPotential, applySuggestion, gainExp, joinFaction, refreshStats } from './progress.js';
import { useToken } from './token.js';
import type { World } from './World.js';

const GOLD_LOADOUT_SLOTS: readonly EquipSlot[] = [...MAGIC_SLOTS, 'mantle'];

export interface BotGoldBuildResult {
  routeId: string;
  /** Equipment items keyed by target slot (wearable at `level`, ignoring str/dex which potential allocation satisfies). */
  equip: Equipment;
  /** Gold pieces from the JSON whose requirelevel > `level` (placed in bag until the bot reaches that level). */
  deferred: Item[];
  /** Explicit horse item ID when JSON specifies one instead of `'auto:horse'`. */
  explicitHorse?: string;
}

/**
 * Xây dựng bộ trang bị Hoàng Kim môn phái cho bot theo `packages/shared/src/bots/gold-loadouts.json`:
 *  1. Khớp đúng môn phái + tuyến kỹ năng đang theo (`guessRoute`) + giới tính.
 *  2. Lấp các ô có sẵn ID Hoàng Kim (bộ chính + món HK lẻ khác cùng phái) + Phi phong.
 *  3. Các ô `'auto:green'` được rèn đồ xanh chuẩn ngũ hành (`seriesPlan` + `botGreenLines`) hợp giới tính & loại vũ khí.
 *  4. Nếu `ring === true`, thay 1 ô nhẫn (ưu tiên ô nhẫn xanh/trống, fallback `ring2`) bằng Càn Khôn Giới Chỉ.
 */
export function buildBotGoldEquipment(opts: {
  faction: string;
  gender: Gender | string;
  level: number;
  skills: Record<number, number>;
  luck?: number;
  ring?: boolean;
  random?: () => number;
}): BotGoldBuildResult | null {
  const f = FACTIONS[opts.faction];
  if (!f) return null;
  const gender: Gender = opts.gender === 'female' ? 'female' : 'male';
  const route = guessRoute(opts.faction, opts.skills);
  const resolved = resolveBotGoldLoadout(opts.faction, route?.id, gender);
  if (!resolved) return null;

  const element = SERIES_KEYS.indexOf(f.element);
  const plan = seriesPlan(element, element);
  const outfit = starterEquipment(opts.faction, gender);
  const routeAtks = (route?.skills ?? []).map(id => getSkill(id)).filter((s): s is NonNullable<typeof s> => !!s && skillCategory(s) === 'attack');
  const weaponCompatible = (d: ItemDef) => !routeAtks.length || routeAtks.every(s => weaponOk(s, weaponTypeOf(d)));
  const luck = opts.luck ?? 5;
  const rand = opts.random ?? Math.random;

  const makeGreenForSlot = (slot: EquipSlot): Item | null => {
    const base = ITEMS[outfit[slot] ?? ''];
    const baseOk = SHOP_ITEMS.smith.filter(d => KIND_SLOTS[d.kind]?.includes(slot)
      && (slot === 'weapon' ? weaponCompatible(d) : true)
      && !equipError(d, { faction: opts.faction, gender, series: f.element, level: opts.level }));
    const typed = slot !== 'weapon' && base
      ? baseOk.filter(d => d.kind === base.kind && d.type === base.type)
      : baseOk;
    const candidates = typed.length ? typed : baseOk;
    const def = candidates.sort((a, b) => reqLevel(b) - reqLevel(a) || b.level - a.level)[0];
    if (!def) return null;
    const item = makeItem(def.id);
    if (!item) return null;
    item.series = plan.series[slot] ?? element;
    item.magic = forgedMagic(botGreenLines(def, item.series));
    item.q = QUALITY.magic;
    return item;
  };

  const equip: Equipment = {};
  const deferred: Item[] = [];
  const greenSlots = new Set<EquipSlot>();

  for (const slot of GOLD_LOADOUT_SLOTS) {
    const spec = resolved.slots[slot];
    if (!spec) continue;
    if (spec === 'auto:green') {
      const green = makeGreenForSlot(slot);
      if (green) { equip[slot] = green; greenSlots.add(slot); }
      continue;
    }
    const def = ITEMS[spec];
    if (!def) continue;
    const item = def.gold ? createGold(def, newItemUid(), luck, rand) : makeItem(def.id);
    if (!item) continue;
    if (reqLevel(def) > opts.level) {
      deferred.push(item);
    } else {
      equip[slot] = item;
    }
  }

  if (opts.ring) {
    const ringItem = makeItem(CANKHON_RING_ID);
    if (ringItem) {
      const targetSlot: EquipSlot =
        !equip.ring2 || greenSlots.has('ring2') ? 'ring2'
          : !equip.ring1 || greenSlots.has('ring1') ? 'ring1'
            : 'ring2';
      equip[targetSlot] = ringItem;
    }
  }

  const horseSpec = resolved.slots.horse;
  const explicitHorse = horseSpec && horseSpec !== 'auto:horse' && ITEMS[horseSpec]?.kind === 'horse' ? horseSpec : undefined;
  return { routeId: resolved.routeId, equip, deferred, explicitHorse };
}

/**
 * Mẫu bot (shared bots/index.ts BotTemplate, dev/botAdmin.ts) applied to a fresh level-1 character the first time it enters the
 * game, with the same functions players and the lệnh bài use: level up, join the faction, points by the suggestion, tier
 * skills, gold loadout (gold-loadouts.json) / green loadout + horse worn, money and potions.
 */
export function applyBotSetup(w: World, sim: Sim, t: BotTemplate, level: number, faction: string): void {
  const p = sim.progress!.prog;
  const to = Math.min(LEVEL.max, Math.max(1, level));
  while (p.level < to) if (!gainExp(w, sim, expToNext(p.level) - p.exp)) break;
  if (faction && p.level >= LEVEL.factionJoin) joinFaction(w, sim, faction);
  // Made without a faction (level 1): wear the faction's starter outfit where nothing is worn (as a new character of it would).
  if (sim.a.faction) {
    for (const [slot, item] of Object.entries(outfitItems(starterEquipment(sim.a.faction, sim.a.gender)))) {
      if (!sim.equip![slot as EquipSlot]) sim.equip![slot as EquipSlot] = item;
    }
    applyEquipment(sim);
  }
  if (sim.a.faction && t.skills === 'suggest') applySuggestion(w, sim, 'skills');
  if (sim.a.faction && t.tiers) useToken(w, sim, 'skills');

  // Pieces go into the bag first: the potential suggestion counts what they need (strength / dexterity), then they are worn.
  const wear = new Set<string>();
  const slottedWear: { uid: string; slot: EquipSlot }[] = [];
  let explicitHorse: string | undefined;

  if (sim.a.faction && t.gear === 'green') {
    const outfit = starterEquipment(sim.a.faction, sim.a.gender);
    const element = SERIES_KEYS.indexOf(FACTIONS[sim.a.faction].element);
    const plan = seriesPlan(element, element);
    for (const slot of MAGIC_SLOTS) {
      const base = ITEMS[outfit[slot] ?? ''];
      const candidates = SHOP_ITEMS.smith.filter(d => KIND_SLOTS[d.kind]?.includes(slot)
        && (!base || d.kind === base.kind && d.type === base.type)
        && !equipError(d, { faction: sim.a.faction, gender: sim.a.gender, level: p.level }));
      const def = candidates.sort((a, b) => reqLevel(b) - reqLevel(a) || b.level - a.level)[0];
      if (!def) continue;
      const item = makeItem(def.id); if (!item) continue;
      item.series = plan.series[slot] ?? element;
      const lines = botGreenLines(def, item.series);
      item.magic = forgedMagic(lines); item.q = QUALITY.magic;
      if (addToBag(sim.bag!, item)) slottedWear.push({ uid: item.uid, slot });
    }
    if (t.ring && useToken(w, sim, 'ring')) wear.add(CANKHON_RING_ID);
  } else if (sim.a.faction && t.gear === 'gold') {
    const built = buildBotGoldEquipment({
      faction: sim.a.faction,
      gender: sim.a.gender,
      level: p.level,
      skills: Object.fromEntries(sim.skills),
      luck: sim.stats?.luck ?? 5,
      ring: t.ring,
    });
    if (built) {
      explicitHorse = built.explicitHorse;
      for (const [slot, item] of Object.entries(built.equip) as [EquipSlot, Item | undefined][]) {
        if (item && addToBag(sim.bag!, item)) slottedWear.push({ uid: item.uid, slot });
      }
      for (const item of built.deferred) addToBag(sim.bag!, item);
    }
  } else if (t.ring && useToken(w, sim, 'ring')) {
    wear.add(CANKHON_RING_ID);
  }

  // Ngẫu nhiên: among the horses its level allows (unless gold-loadouts.json sets an explicit horse).
  const horses = botHorsePool(p.level);
  const horseId = explicitHorse ?? (t.horse === 'random' ? horses[Math.floor(Math.random() * horses.length)] : t.horse);
  const horse = horseId ? makeItem(horseId) : null;
  if (horse && addToBag(sim.bag!, horse)) wear.add(horse.def);

  if (t.potential === 'suggest') { if (sim.a.faction) applySuggestion(w, sim, 'potential'); }
  else addPotential(w, sim, t.potential, p.potentialPoints);

  for (const { uid, slot } of slottedWear) {
    const index = sim.bag!.findIndex(it => it?.uid === uid);
    if (index >= 0) equipItem(w, sim, index, slot);
  }
  for (const def of wear) {
    const index = sim.bag!.findIndex(it => it?.def === def && (def !== CANKHON_RING_ID && itemDef(it)?.kind !== 'horse' ? (it.q ?? 0) >= QUALITY.gold : true));
    if (index >= 0) equipItem(w, sim, index);
  }
  if (sim.a.horse) setMounted(w, sim, true);

  sim.money = Math.min(MAX_MONEY, Math.max(0, t.money));
  for (const [def, count] of [[t.hpPotion, t.hpCount], [t.mpPotion, t.mpCount]] as const) {
    for (let i = 0; def && i < count; i++) {
      const it = makeItem(def);
      if (!it || !addToBag(sim.bag!, it)) break;
    }
  }
  refreshStats(sim, true);
}

/** Đảm bảo `prog.added` đủ Sức mạnh / Thân pháp cho `equip` mới (ưu tiên lấy từ điểm dư, nếu thiếu thì điều chuyển từ vit/eng). */
function ensurePotentialForEquip(
  prog: Progress,
  series: Element,
  faction: string,
  gender: Gender | string,
  equip: Equipment,
): void {
  const base = characterStats({ series, level: prog.level, added: prog.added, bag: {}, weapon: { kind: 'none', min: 1, max: 2 } });
  const need = itemNeeds(equip, [], {
    faction,
    gender: gender === 'female' ? 'female' : 'male',
    series,
    level: prog.level,
    str: base.str,
    dex: base.dex,
  });
  for (const [stat, cur, req] of [
    ['str', base.str, need.str] as const,
    ['dex', base.dex, need.dex] as const,
  ]) {
    let deficit = Math.max(0, req - cur);
    if (deficit <= 0) continue;
    const fromFree = Math.min(deficit, Math.max(0, prog.potentialPoints));
    if (fromFree > 0) {
      prog.added[stat] += fromFree;
      prog.potentialPoints -= fromFree;
      deficit -= fromFree;
    }
    for (const donor of ['vit', 'eng'] as const) {
      if (deficit <= 0) break;
      const take = Math.min(deficit, Math.max(0, prog.added[donor]));
      if (take > 0) {
        prog.added[donor] -= take;
        prog.added[stat] += take;
        deficit -= take;
      }
    }
  }
}

/** Mặc lại bộ trang bị Hoàng Kim theo `gold-loadouts.json` cho bot đang online (giữ nguyên ngựa, hành trang, tiền, kỹ năng). */
export function regearSimGold(w: World, sim: Sim, ring = false): boolean {
  if (!sim.a.faction || !sim.progress || !sim.equip) return false;
  const built = buildBotGoldEquipment({
    faction: sim.a.faction,
    gender: sim.a.gender,
    level: sim.progress.prog.level,
    skills: Object.fromEntries(sim.skills),
    luck: sim.stats?.luck ?? 5,
    ring,
  });
  if (!built) return false;
  for (const slot of GOLD_LOADOUT_SLOTS) {
    if (built.equip[slot]) sim.equip[slot] = built.equip[slot];
    else delete sim.equip[slot];
  }
  if (built.explicitHorse) {
    const h = makeItem(built.explicitHorse);
    if (h) sim.equip.horse = h;
  }
  ensurePotentialForEquip(sim.progress.prog, sim.progress.series, sim.a.faction, sim.a.gender, sim.equip);
  applyEquipment(sim);
  refreshStats(sim, true);
  w.hooks.inventory(sim);
  w.hooks.progress(sim);
  w.hooks.skills(sim);
  return true;
}

/** Mặc lại bộ trang bị Hoàng Kim theo `gold-loadouts.json` cho bot offline trong `db.json` (giữ nguyên ngựa, hành trang, tiền, kỹ năng). */
export function regearCharRecordGold(char: CharacterRecord): Partial<CharacterRecord> | null {
  if (!char.faction || char.bot?.pending) return null;
  const skills: Record<number, number> = {};
  for (const [k, v] of Object.entries(char.skills ?? {})) skills[Number(k)] = Number(v);
  const built = buildBotGoldEquipment({
    faction: char.faction,
    gender: char.gender,
    level: char.level,
    skills,
    luck: 5,
    ring: !!char.bot?.setup?.ring,
  });
  if (!built) return null;

  const prevEquip = (char.equip && typeof char.equip === 'object' ? { ...char.equip } : {}) as Equipment;
  for (const slot of GOLD_LOADOUT_SLOTS) {
    if (built.equip[slot]) prevEquip[slot] = built.equip[slot];
    else delete prevEquip[slot];
  }
  let horse = char.horse;
  if (built.explicitHorse) {
    const h = makeItem(built.explicitHorse);
    if (h) { prevEquip.horse = h; horse = h.def; }
  }

  const prog: Progress | undefined = char.progress
    ? { ...char.progress, added: { ...char.progress.added } }
    : undefined;
  const series = (char.series ?? FACTIONS[char.faction]?.element ?? 'kim') as Element;
  if (prog) ensurePotentialForEquip(prog, series, char.faction, char.gender, prevEquip);

  return { equip: prevEquip, ...(prog ? { progress: prog } : {}), ...(horse !== undefined ? { horse } : {}) };
}

const reqLevel = (d: ItemDef | undefined) => Number(d?.req?.find(([k]) => k === 'requirelevel')?.[1] ?? 0);
