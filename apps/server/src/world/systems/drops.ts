import {
  DROPS, addToBag, createGold, createItem, dropTableFor, isoDistance, itemDef, nearestWalkable, rollItem, rollMagicLines, rollMoney, type Item,
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
  /** Sim id of the killer (first pick), and until when. */
  owner: string;
  ownerUntil: number;
  until: number;
  g: Ground;
}

let nextDrop = 1;

/** A monster died to `killer`: roll its table (rolls per kill), put the items / money around the corpse. */
export function dropLoot(w: World, monster: Sim, killer: Sim | undefined): void {
  if (!killer || killer.kind !== 'player' || monster.def?.dummy) return;
  const level = monster.a.level;
  const tier = monster.a.boss;
  const levelTable = dropTableFor(level);
  const t = (tier >= 2 ? dropTableFor(level, monster.def?.dropTable) : undefined) ?? levelTable;
  if (!t) return;
  const luck = killer.stats?.luck ?? 5;
  const rolls = tier >= 2 ? DROPS.bossRolls : tier === 1 ? DROPS.blueBossRolls : DROPS.rolls;
  const out: { item: Item | null; money: number }[] = [];
  for (let i = 0; i < rolls; i++) {
    let def = rollItem(t, level, Math.random);
    if (!def && t !== levelTable && levelTable) def = rollItem(levelTable, level, Math.random);
    if (!def) continue;
    const item = def.gold ? createGold(def, newItemUid(), luck) : createItem(def, newItemUid());
    if ((t.magic || levelTable?.magic) && !def.gold) {
      const series = Math.floor(Math.random() * 5);
      const lines = rollMagicLines(def, series, luck + (tier >= 2 ? 3 : tier === 1 ? 1 : 0), Math.random);
      if (lines.length) { item.q = 1; item.magic = lines; item.series = series; }
    }
    out.push({ item, money: 0 });
  }
  const moneyTable = t.moneyRate > 0 ? t : (levelTable ?? t);
  const moneyMul = tier >= 2 ? 4 : tier === 1 ? 2 : 1;
  const money = rollMoney(moneyTable, level, Math.random) * moneyMul;
  if (money) out.push({ item: null, money });
  out.forEach((d, i) => put(w, monster.a.x, monster.a.y, i, d.item, d.money, killer.id));
}

function put(w: World, x: number, y: number, i: number, item: Item | null, money: number, owner: string): void {
  const a = (i / 6) * Math.PI * 2 + Math.random() * 0.5, r = i ? 28 + Math.random() * 20 : 0;
  const [sx, sy] = nearestWalkable(w.grid, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.5);
  const id = `d${nextDrop++}`;
  const g = new Ground();
  Object.assign(g, {
    x: Math.round(sx), y: Math.round(sy), def: item ? item.def : 'money', q: item?.q ?? 0, amount: money,
    owner, ownerUntil: Math.ceil((w.now + DROPS.ownerMs) / 1000),
  });
  w.ground.set(id, { id, item, money, x: g.x, y: g.y, owner, ownerUntil: w.now + DROPS.ownerMs, until: w.now + DROPS.lifeMs, g });
  w.groundSync?.set(id, g);
}

/**
 * Throw a piece of the own bag on the ground at the player's feet (hành trang "Vứt"): it lies there like a monster drop
 * (DROPS.lifeMs) and only its thrower may take it back during DROPS.ownerMs.
 */
export function throwItem(w: World, sim: Sim, item: Item): void {
  put(w, sim.a.x, sim.a.y, 1 + Math.floor(Math.random() * 6), item, 0, sim.id);
}

/** Every tick: remove drops whose time is over; open them to everyone after the owner time. */
export function updateDrops(w: World): void {
  for (const [id, d] of w.ground) {
    if (d.until <= w.now) { w.ground.delete(id); w.groundSync?.delete(id); continue; }
    if (d.owner && d.ownerUntil <= w.now) { d.owner = ''; d.g.owner = ''; }
  }
}

/** Pick up drop `id`: walk there first when far (sim.pickup), then take it into the bag / purse. */
export function pickup(w: World, sim: Sim, id: string): boolean {
  const d = w.ground.get(id);
  if (!d || sim.dead) return false;
  // The killer and their team mates first (VT7: "người đánh chết quái + tổ đội").
  if (d.owner && d.owner !== sim.id && !sameTeam(w.sims.get(d.owner), sim)) { w.hooks.notify(sim, 'Vật phẩm này chưa thuộc về bạn.'); return false; }
  if (isoDistance(sim.a.x, sim.a.y, d.x, d.y) > DROPS.pickupRange) {
    sim.pickup = id;
    sim.pending = null;
    setPath(w, sim, { x: d.x, y: d.y });
    return false;
  }
  if (d.item) {
    if (!addToBag(sim.bag!, d.item)) { w.hooks.notify(sim, 'Hành trang không đủ chỗ.'); return false; }
    sim.pickedUp = d.item;
    w.hooks.log(sim, 'item', `Nhặt được ${itemDef(d.item)?.name ?? 'vật phẩm'}.`);
  } else {
    addMoney(sim, d.money);
    w.hooks.notify(sim, `Nhặt được ${d.money} lượng.`);
    w.hooks.log(sim, 'money', `Nhặt được ${d.money.toLocaleString('vi-VN')} lượng.`);
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
