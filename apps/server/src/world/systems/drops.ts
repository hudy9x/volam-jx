import { moneyText } from '@vltk/shared';
import {
  DROPS,
  GOLDEN_BOSS_SPECIAL_ITEMS,
  ITEMS,
  MAX_BAG_POTIONS,
  addToBag,
  bagPotionCount,
  createGold,
  createItem,
  dropTableFor,
  getGoldenBossConfig,
  isStackablePotion,
  isoDistance,
  itemDef,
  itemQty,
  nearestWalkable,
  resolveDropProfile,
  rollEquipmentFromTable,
  rollGoldenBossItemWithRates,
  rollMajorBossMantle,
  rollMagicLines,
  rollMoneyWithProfile,
  type DropProfile,
  type DropTable,
  type Item,
  type ItemDef,
  type MonsterDropTier,
} from '@vltk/shared';
import { Ground } from '../../net/schema.js';
import type { Sim } from '../entity.js';
import { addMoney, newItemUid } from '../inventory.js';
import { setPath } from './movement.js';
import { sameTeam } from '../teams.js';
import type { World } from '../World.js';

// Monster drops on the ground (VT7–VT9). Tables and blue lines: packages/shared/src/formulas/drops.ts; numbers:
// formulas/tuning.ts DROPS (60 s on the ground, 20 s for the killer only — USER 2026-11-12). Docs: docs/formulas/drops.md.

export interface GroundDrop {
  id: string;
  item: Item | null;
  money: number;
  x: number;
  y: number;
  /** Sim id of the killer (first pick), team id of the killer, and until when. */
  owner: string;
  team: string;
  ownerUntil: number;
  until: number;
  g: Ground;
}

let nextDrop = 1;

function rollProfileItem(
  tier: 0 | 1 | 2,
  monsterId: number | undefined,
  level: number,
  table: DropTable,
  profile: DropProfile,
  rng: () => number,
): ItemDef | null {
  if (tier >= 2 && monsterId !== undefined) {
    return rollGoldenBossItemWithRates(monsterId, level, profile, rng);
  }
  const roll = rng() * 100;
  if (roll < profile.specialRatePct) {
    const ids = profile.specialItems?.length ? profile.specialItems : GOLDEN_BOSS_SPECIAL_ITEMS;
    const pool = ids.map(id => ITEMS[id]).filter((it): it is ItemDef => !!it);
    if (pool.length > 0) return pool[Math.floor(rng() * pool.length)] ?? null;
  }
  if (roll < profile.specialRatePct + profile.equipRatePct) {
    return rollEquipmentFromTable(table, level, rng);
  }
  return null;
}

function buildDroppedItem(
  def: ItemDef,
  magicEnabled: boolean,
  luck: number,
  rng: () => number,
): Item {
  const item = def.gold ? createGold(def, newItemUid(), luck) : createItem(def, newItemUid());
  if (magicEnabled && !def.gold && !def.stack && def.kind !== 'potion') {
    const series = Math.floor(rng() * 5);
    const lines = rollMagicLines(def, series, luck, rng);
    if (lines.length) {
      item.q = 1;
      item.magic = lines;
      item.series = series;
    }
  }
  return item;
}

/** A monster died to `killer`: roll its table (rolls per kill), put the items / money around the corpse. */
export function dropLoot(w: World, monster: Sim, killer: Sim | undefined): void {
  if (!killer || killer.kind !== 'player' || monster.def?.dummy) return;
  const level = monster.a.level;
  const tier: MonsterDropTier = monster.a.boss >= 2 ? 2 : monster.a.boss === 1 ? 1 : 0;
  const levelTable = dropTableFor(level);
  const t = (tier >= 2 ? dropTableFor(level, monster.def?.dropTable) : undefined) ?? levelTable;
  if (!t) return;
  const luck = killer.stats?.luck ?? 5;
  const bossCfg = getGoldenBossConfig();
  const goldenEntry = tier >= 2 && monster.def ? bossCfg.bosses.find(b => b.id === monster.def!.id) : undefined;
  const profile = resolveDropProfile(tier, monster.def?.id, goldenEntry?.tier, tier >= 2 ? bossCfg.settings : undefined);
  const magicEnabled = Boolean(t.magic || levelTable?.magic || tier >= 2);
  const effectiveLuck = luck + profile.luckBonus;
  const out: { item: Item | null; money: number }[] = [];

  for (let i = 0; i < profile.rolls; i++) {
    const def = rollProfileItem(tier, monster.def?.id, level, t, profile, Math.random);
    if (!def) continue;
    out.push({ item: buildDroppedItem(def, magicEnabled, effectiveLuck, Math.random), money: 0 });
  }

  // Bảo đảm số món tối thiểu (minItems) cho Boss Xanh / Boss Hoàng Kim nếu các lượt tung bị trượt.
  const equipTable = tier >= 2 ? (dropTableFor(Math.max(90, level)) ?? t) : (levelTable ?? t);
  while (out.length < profile.minItems) {
    const def = rollEquipmentFromTable(equipTable, tier >= 2 ? Math.max(90, level) : level, Math.random);
    if (!def) break;
    out.push({ item: buildDroppedItem(def, magicEnabled, effectiveLuck, Math.random), money: 0 });
  }

  const moneyTable = t.moneyRate > 0 ? t : (levelTable ?? t);
  const money = rollMoneyWithProfile(level, moneyTable.moneyScale, profile.moneyRatePct, profile.moneyMul, Math.random);
  if (money) out.push({ item: null, money });
  // Boss Đại Hoàng Kim (tier 'major'): có tỉ lệ rơi Phi phong Hoàng kim (USER 2026-11-19).
  if (goldenEntry?.tier === 'major' && Math.random() < 0.25) {
    const mantleDef = rollMajorBossMantle(Math.random);
    out.push({ item: createItem(mantleDef, newItemUid()), money: 0 });
  }
  const total = out.length;
  out.forEach((d, i) => put(w, monster.a.x, monster.a.y, i, total, d.item, d.money, killer.id, killer.a.team ?? ''));
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function dropOffset(i: number, total: number): [number, number] {
  if (total <= 6) {
    const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5;
    const r = i ? 28 + Math.random() * 20 : 0;
    return [Math.cos(a) * r, Math.sin(a) * r * 0.5];
  }
  // Số lượng nhiều (boss): rải đều theo xoắn ốc góc vàng trong phạm vi 200–250 px (isometric Y × 0.5) để tên đồ không đè lên nhau.
  const maxR = Math.min(250, 200 + Math.max(0, total - 8) * 2);
  const r = i === 0 ? 0 : maxR * Math.sqrt((i + 0.5) / total) * (0.9 + Math.random() * 0.2);
  const clampedR = Math.min(250, r);
  const a = i * GOLDEN_ANGLE + (Math.random() - 0.5) * 0.25;
  return [Math.cos(a) * clampedR, Math.sin(a) * clampedR * 0.5];
}

function put(w: World, x: number, y: number, i: number, total: number, item: Item | null, money: number, owner: string, team = ''): void {
  const [dx, dy] = dropOffset(i, total);
  const [sx, sy] = nearestWalkable(w.grid, x + dx, y + dy);
  const id = `d${nextDrop++}`;
  const g = new Ground();
  Object.assign(g, {
    x: Math.round(sx), y: Math.round(sy), def: item ? item.def : 'money', q: item?.q ?? 0, amount: money,
    owner, team, ownerUntil: Math.ceil((w.now + DROPS.ownerMs) / 1000),
  });
  w.ground.set(id, { id, item, money, x: g.x, y: g.y, owner, team, ownerUntil: w.now + DROPS.ownerMs, until: w.now + DROPS.lifeMs, g });
  w.groundSync?.set(id, g);
}

/**
 * Throw a piece of the own bag on the ground at the player's feet (hành trang "Vứt"): it lies there like a monster drop
 * (DROPS.lifeMs) and only its thrower may take it back during DROPS.ownerMs.
 */
export function throwItem(w: World, sim: Sim, item: Item): void {
  put(w, sim.a.x, sim.a.y, 1 + Math.floor(Math.random() * 6), 1, item, 0, sim.id, sim.a.team ?? '');
}

/** Rơi vật phẩm chiến trường Tống Kim (không rơi tiền/trang bị). */
export function dropBattleItem(w: World, x: number, y: number, item: Item, owner: string): void {
  put(w, x, y, 0, 1, item, 0, owner, '');
}

/** Every tick: remove drops whose time is over; open them to everyone after the owner time. */
export function updateDrops(w: World): void {
  for (const [id, d] of w.ground) {
    if (d.until <= w.now) { w.ground.delete(id); w.groundSync?.delete(id); continue; }
    if (d.owner && d.ownerUntil <= w.now) { d.owner = ''; d.g.owner = ''; d.team = ''; d.g.team = ''; }
  }
}

/** Pick up drop `id`: walk there first when far (sim.pickup), then take it into the bag / purse. */
export function pickup(w: World, sim: Sim, id: string): boolean {
  const d = w.ground.get(id);
  if (!d || sim.dead) return false;
  // The killer and their team mates first (VT7: "người đánh chết quái + tổ đội").
  const inTeam = sameTeam(w.sims.get(d.owner), sim) || (!!d.team && d.team === sim.a.team);
  if (d.owner && d.owner !== sim.id && !inTeam) { w.hooks.notify(sim, 'Vật phẩm này chưa thuộc về bạn.'); return false; }
  if (isoDistance(sim.a.x, sim.a.y, d.x, d.y) > DROPS.pickupRange) {
    sim.pickup = id;
    sim.pending = null;
    setPath(w, sim, { x: d.x, y: d.y });
    return false;
  }
  if (d.item) {
    if (isStackablePotion(itemDef(d.item)) && bagPotionCount(sim.bag!) + itemQty(d.item) > MAX_BAG_POTIONS) {
      w.hooks.notify(sim, `Hành trang đã đạt tối đa ${MAX_BAG_POTIONS} bình thuốc.`);
      return false;
    }
    if (!addToBag(sim.bag!, d.item)) { w.hooks.notify(sim, 'Hành trang không đủ chỗ.'); return false; }
    sim.pickedUp = d.item;
    w.hooks.log(sim, 'item', `Nhặt được ${itemDef(d.item)?.name ?? 'vật phẩm'}.`);
  } else {
    addMoney(sim, d.money);
    w.hooks.notify(sim, `Nhặt được ${moneyText(d.money)} lượng.`);
    w.hooks.log(sim, 'money', `Nhặt được ${moneyText(d.money)} lượng.`);
  }
  w.ground.delete(id);
  w.groundSync?.delete(id);
  sim.pickup = undefined;
  return true;
}

/** A player walking to a drop: take it once in range (returns true when the inventory changed). */
export function updatePickup(w: World, sim: Sim): boolean {
  const id = sim.pickup;
  if (!id) return false;
  const d = w.ground.get(id);
  if (!d) { sim.pickup = undefined; return false; }
  if (isoDistance(sim.a.x, sim.a.y, d.x, d.y) > DROPS.pickupRange) {
    if (!sim.path.length) sim.pickup = undefined; // stopped elsewhere (another order)
    return false;
  }
  return pickup(w, sim, id);
}
