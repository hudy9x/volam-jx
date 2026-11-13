import {
  CANKHON_RING_ID, HORSE_IDS, ITEMS, LEVEL, MAX_MONEY, QUALITY, addToBag, expToNext, factionSuites, itemDef, starterEquipment,
  type BotTemplate, type EquipSlot, type ItemDef,
} from '@vltk/shared';
import { setMounted } from './commands.js';
import type { Sim } from './entity.js';
import { applyEquipment, equipItem, makeItem, outfitItems } from './inventory.js';
import { addPotential, applySuggestion, gainExp, joinFaction, refreshStats } from './progress.js';
import { useToken } from './token.js';
import type { World } from './World.js';

/**
 * Mẫu bot (shared bots/index.ts BotTemplate, dev/botAdmin.ts) applied to a fresh level-1 character the first time it enters the
 * game, with the same functions players and the lệnh bài use: level up, join the faction, points by the suggestion, tier
 * skills, gold set + ring + horse worn, money and potions. `level` / `faction` were rolled when the bot was made.
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
  if (sim.a.faction && t.gear === 'gold') {
    // A set it can wear whole at its level (hoàng kim môn phái need level 80–99), else the set needing the lowest level: the
    // pieces it cannot wear yet stay in the bag (equipItem refuses them), the starter piece stays worn there.
    const all = factionSuites(sim.a.faction);
    const top = (st: (typeof all)[number]) => Math.max(...st.pieces.map(reqLevel));
    const fit = all.filter(st => top(st) <= p.level);
    const suite = fit.length ? fit[Math.floor(Math.random() * fit.length)] : [...all].sort((a, b) => top(a) - top(b))[0];
    if (suite && useToken(w, sim, 'gold', suite.suite)) for (const def of suite.pieces) wear.add(def.id);
  }
  if (t.ring && useToken(w, sim, 'ring')) wear.add(CANKHON_RING_ID);
  // Ngẫu nhiên: among the horses its level allows.
  const horses = HORSE_IDS.filter(id => reqLevel(ITEMS[id]) <= p.level);
  const horseId = t.horse === 'random' ? horses[Math.floor(Math.random() * horses.length)] : t.horse;
  const horse = horseId ? makeItem(horseId) : null;
  if (horse && addToBag(sim.bag!, horse)) wear.add(horse.def);

  if (t.potential === 'suggest') { if (sim.a.faction) applySuggestion(w, sim, 'potential'); }
  else addPotential(w, sim, t.potential, p.potentialPoints);

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

const reqLevel = (d: ItemDef | undefined) => Number(d?.req?.find(([k]) => k === 'requirelevel')?.[1] ?? 0);
