import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AutoPlay, BAG_SIZE, DEFAULT_AUTO, ITEMS, MAX_BAG_POTIONS, POTION_STACK_MAX, SHOP_ITEMS, STACK_LIMITS_BY_ID,
  addToBag, bagPotionCount, createItem, getExpElixirConfig, itemQty, moveOrSwapInGrid, restoreItem, roomFor,
  setExpElixirConfig, sortGridPage, splitStackInGrid,
  type AutoHost, type Bag, type Item,
} from '@vltk/shared';
import { buyItem, sellItem, splitGridItem, useItem } from '../apps/server/src/world/inventory.ts';
import { shareKillExp } from '../apps/server/src/world/progress.ts';
import type { Sim } from '../apps/server/src/world/entity.ts';
import type { World } from '../apps/server/src/world/World.ts';

function emptyBag(): Bag {
  return Array(BAG_SIZE).fill(null);
}

function makeSim(bag: Bag, money = 1_000_000): Sim {
  return {
    id: 'p1', kind: 'player', dead: false, hp: 100, mp: 100, money, bag, equip: {},
    a: { x: 0, y: 0, maxHp: 100, maxMp: 100 } as Sim['a'],
    skills: new Map(), path: [],
  } as unknown as Sim;
}

function makeWorld(): { world: World; notices: string[] } {
  const notices: string[] = [];
  const world = {
    now: 1000,
    rules: { safe: true },
    hooks: {
      notify: (_sim: Sim, text: string) => notices.push(text),
      log: () => undefined,
    },
  } as unknown as World;
  return { world, notices };
}

test('potions stack up to 50 per slot and cap at 50 total across the bag', () => {
  const bag = emptyBag();
  const hpDef = ITEMS['potion-0-5'];
  const mpDef = ITEMS['potion-1-5'];
  assert.ok(hpDef && mpDef);

  assert.equal(roomFor(bag, hpDef, 99), MAX_BAG_POTIONS);
  for (let i = 0; i < 30; i++) {
    assert.equal(addToBag(bag, createItem(hpDef, `hp-${i}`)), true);
  }
  assert.equal(bag.filter(Boolean).length, 1);
  assert.equal(itemQty(bag[0]), 30);
  assert.equal(bagPotionCount(bag), 30);
  assert.equal(roomFor(bag, mpDef, 99), 20);

  for (let i = 0; i < 20; i++) {
    assert.equal(addToBag(bag, createItem(mpDef, `mp-${i}`)), true);
  }
  assert.equal(bag.filter(Boolean).length, 2);
  assert.equal(bagPotionCount(bag), 50);
  assert.equal(roomFor(bag, hpDef, 10), 0);
  assert.equal(roomFor(bag, mpDef, 10), 0);
});

test('buyItem, useItem, sellItem, moveOrSwapInGrid and restoreItem handle stacked potions', () => {
  const bag = emptyBag();
  const sim = makeSim(bag);
  const { world, notices } = makeWorld();

  assert.equal(buyItem(world, sim, 'potion-0-5', 25), true);
  assert.equal(buyItem(world, sim, 'potion-0-5', 15), true);
  assert.equal(bag.filter(Boolean).length, 1);
  assert.equal(itemQty(bag[0]), 40);

  // Exceeding 50 total potions in bag is rejected.
  assert.equal(buyItem(world, sim, 'potion-1-5', 11), false);
  assert.ok(notices.at(-1)?.includes('50 bình thuốc'));

  // Buying remaining 10 succeeds.
  assert.equal(buyItem(world, sim, 'potion-1-5', 10), true);
  assert.equal(bagPotionCount(bag), 50);

  // Drinking 1 decrements stack instead of deleting slot.
  assert.equal(useItem(world, sim, 0), true);
  assert.equal(itemQty(bag[0]), 39);

  // Moving onto same potion stack merges.
  bag[5] = { ...createItem(ITEMS['potion-0-5'], 'extra-hp'), qty: 5 };
  assert.equal(moveOrSwapInGrid(bag, 5, 0, BAG_SIZE), true);
  assert.equal(bag[5], null);
  assert.equal(itemQty(bag[0]), 44);

  // Selling a stack pays qty * sellPrice.
  const beforeMoney = sim.money!;
  assert.equal(sellItem(world, sim, 1), true);
  assert.equal(bag[1], null);
  assert.equal(sim.money! - beforeMoney, Math.floor(ITEMS['potion-1-5'].price / 4) * 10);

  // restoreItem preserves valid stack qty and clamps at POTION_STACK_MAX.
  const restored = restoreItem({ uid: 'r1', def: 'potion-0-5', qty: 42 }, () => 'new');
  assert.equal(restored?.qty, 42);
  const clamped = restoreItem({ uid: 'r2', def: 'potion-0-5', qty: 99 }, () => 'new');
  assert.equal(clamped?.qty, POTION_STACK_MAX);
});

test('sortGridPage(-1) compacts across pages and merges stacks', () => {
  const bag = emptyBag();
  const armor = ITEMS['armor-0-1'];
  assert.ok(armor);
  // Put two separated stacks on different pages.
  bag[0] = { ...createItem(ITEMS['potion-0-5'], 'p1'), qty: 10 };
  bag[65] = { ...createItem(ITEMS['potion-0-5'], 'p2'), qty: 15 };
  bag[125] = createItem(armor, 'a1');

  assert.equal(sortGridPage(bag, -1, BAG_SIZE), true);
  assert.equal(bag[0]?.def, armor.id);
  const hpSlot = bag.find(it => it?.def === 'potion-0-5');
  assert.equal(itemQty(hpSlot), 25);
  assert.equal(bag.filter(it => it?.def === 'potion-0-5').length, 1);
});

test('AutoPlay counts stacked potions and sorts fragmented bag to pick up drops when autoSort is enabled', () => {
  const bag = emptyBag();
  const ring = ITEMS['ring-0-1'];
  const armor = ITEMS['armor-0-1']; // 2x3 item
  assert.ok(ring && armor);

  // Fragment every page so no 2x3 space is free until sorted.
  for (let p = 0; p < 5; p++) {
    const base = p * 60;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 6; c++) {
        if ((r + c) % 2 === 0) bag[base + r * 6 + c] = createItem(ring, `r-${p}-${r}-${c}`);
      }
    }
  }
  bag[1] = { ...createItem(ITEMS['potion-0-5'], 'hp-stack'), qty: 15 };

  let sortCalls = 0;
  let pickupCalls = 0;
  let buyCalls = 0;
  const host: AutoHost = {
    learnedSkills: () => [],
    aura: () => undefined,
    self: () => ({ id: 'me', x: 100, y: 100, isSelf: true, state: { kind: 'player', level: 10, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss: 0, sprite: '' } }),
    actors: () => [],
    safe: () => false,
    skillAt: () => null,
    usable: () => true,
    ready: () => true,
    cost: () => 0,
    range: () => 100,
    melee: () => true,
    cast: () => undefined,
    move: () => undefined,
    bag: () => bag,
    money: () => 100_000,
    use: () => undefined,
    sell: () => undefined,
    buy: () => { buyCalls++; },
    sortBag: () => {
      sortCalls++;
      sortGridPage(bag, -1, BAG_SIZE);
    },
    wearable: () => true,
    drops: () => [{ id: 'drop-armor', x: 110, y: 110, owner: '', def: armor.id, q: 1 }],
    pickup: () => { pickupCalls++; },
    train: () => undefined,
    goTown: () => undefined,
    respawn: () => undefined,
    notice: () => undefined,
    stop: () => undefined,
  };

  const auto = new AutoPlay(host);
  auto.start();

  // With autoSort: false, fragmented bag cannot fit 2x3 armor.
  auto.update(100, { ...DEFAULT_AUTO, autoSort: false });
  assert.equal(sortCalls, 0);
  assert.equal(pickupCalls, 0);

  // With autoSort: true, AutoPlay sorts the bag first, then picks up the armor on the next tick.
  auto.update(200, { ...DEFAULT_AUTO, autoSort: true });
  assert.equal(sortCalls, 1);
  auto.update(300, { ...DEFAULT_AUTO, autoSort: true });
  assert.equal(pickupCalls, 1);
  assert.equal(buyCalls, 0);
});

test('splitStackInGrid and splitGridItem split stacks cleanly and STACK_LIMITS_BY_ID configures custom items', () => {
  const bag = emptyBag();
  const hpDef = ITEMS['potion-0-5'];
  assert.ok(hpDef);
  bag[0] = { ...createItem(hpDef, 'stack-1'), qty: 30 };

  assert.equal(splitGridItem(bag, 0, 12, BAG_SIZE), true);
  assert.equal(itemQty(bag[0]), 18);
  assert.equal(itemQty(bag[1]), 12);
  assert.notEqual(bag[0]?.uid, bag[1]?.uid);

  // Invalid split quantities fail.
  assert.equal(splitStackInGrid(bag, 0, 0, () => 'x'), false);
  assert.equal(splitStackInGrid(bag, 0, 18, () => 'x'), false);

  // Dragging split stack back onto original stack merges them.
  assert.equal(moveOrSwapInGrid(bag, 1, 0, BAG_SIZE), true);
  assert.equal(bag[1], null);
  assert.equal(itemQty(bag[0]), 30);

  // Custom item configured via STACK_LIMITS_BY_ID stacks without potion cap interference.
  const customId = 'ring-0-1';
  STACK_LIMITS_BY_ID[customId] = 99;
  try {
    const customDef = ITEMS[customId];
    assert.ok(customDef);
    const customBag = emptyBag();
    assert.equal(roomFor(customBag, customDef, 150), 150);
    assert.equal(addToBag(customBag, { ...createItem(customDef, 'c1'), qty: 60 }), true);
    assert.equal(addToBag(customBag, { ...createItem(customDef, 'c2'), qty: 50 }), true);
    assert.equal(itemQty(customBag[0]), 99);
    assert.equal(itemQty(customBag[1]), 11);
  } finally {
    delete STACK_LIMITS_BY_ID[customId];
  }
});

test('Tiên Thảo Lộ & Tiên Thảo Lộ đặc biệt stack, activate expBuff and multiply kill EXP by configured rate (2x, 10x, 100x)', () => {
  const prev = getExpElixirConfig();
  try {
    const normalDef = ITEMS['xiancaolu'];
    const specialDef = ITEMS['xiancaolu-sp'];
    assert.ok(normalDef && specialDef);
    assert.ok(SHOP_ITEMS.kytran.some(d => d.id === 'xiancaolu'));
    assert.ok(SHOP_ITEMS.kytran.some(d => d.id === 'xiancaolu-sp'));

    const bag = emptyBag();
    const sim = makeSim(bag, 1_000_000);
    sim.progress = { series: 0, prog: { level: 10, exp: 0, potentialPoints: 0, skillPoints: 0 }, skillExp: new Map() };
    const { world } = makeWorld();
    (world as any).events = [];
    (world as any).sims = new Map([['p1', sim]]);
    (world as any).hooks.progress = () => undefined;
    (world as any).hooks.skills = () => undefined;

    // Elixirs stack up to 50 and do not consume the 50-potion HP/MP cap.
    assert.equal(buyItem(world, sim, 'potion-0-5', 50), true);
    assert.equal(buyItem(world, sim, 'xiancaolu', 5), true);
    assert.equal(buyItem(world, sim, 'xiancaolu-sp', 3), true);
    assert.equal(bagPotionCount(bag), 50);

    const elixirIdx = bag.findIndex(it => it?.def === 'xiancaolu');
    assert.ok(elixirIdx >= 0);
    assert.equal(useItem(world, sim, elixirIdx), true);
    assert.equal(itemQty(bag[elixirIdx]), 4);
    assert.equal(sim.expBuff?.tier, 'normal');

    const monster = {
      id: 'm1', kind: 'monster', dead: true,
      a: { x: 10, y: 10, level: 10, boss: 0, name: 'Heo rừng', maxHp: 100 },
    } as unknown as Sim;

    setExpElixirConfig({ normal: 10, special: 100 });
    const expBefore = sim.progress.prog.exp;
    const lvBefore = sim.progress.prog.level;
    shareKillExp(world, monster, sim);
    assert.ok(sim.progress.prog.level > lvBefore || sim.progress.prog.exp > expBefore);

    // Special elixir uses special multiplier (100x).
    const spIdx = bag.findIndex(it => it?.def === 'xiancaolu-sp');
    assert.ok(spIdx >= 0);
    assert.equal(useItem(world, sim, spIdx), true);
    assert.equal(sim.expBuff?.tier, 'special');
    assert.equal(itemQty(bag[spIdx]), 2);
  } finally {
    setExpElixirConfig(prev);
  }
});
