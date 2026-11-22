import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BAG_SIZE, ITEMS, MAX_BAG_POTIONS, TOKEN, TOKEN_ITEM_ID, bagPotionCount, itemQty,
  type Item,
} from '@vltk/shared';
import { useToken } from '../apps/server/src/world/token.js';
import type { Sim } from '../apps/server/src/world/entity.js';
import type { World } from '../apps/server/src/world/World.js';

function makeSim(bagEntries: [number, Item][] = []): { sim: Sim; notices: string[]; world: World } {
  const bag: (Item | null)[] = Array(BAG_SIZE).fill(null);
  bag[0] = { uid: 'u-token', def: TOKEN_ITEM_ID };
  for (const [idx, it] of bagEntries) bag[idx] = it;
  const notices: string[] = [];
  const sim = {
    id: 'sess-1',
    charId: 'char-1',
    kind: 'player',
    dead: false,
    bag,
    progress: { prog: { level: 150, exp: 0 } },
    a: { faction: 'shaolin', gender: 'male' },
    skills: new Map(),
  } as unknown as Sim;
  const world = {
    hooks: {
      notify: (_s: Sim, text: string) => { notices.push(text); },
      log: () => {},
      skills: () => {},
      progress: () => {},
    },
  } as unknown as World;
  return { sim, notices, world };
}

test('horse150 gives one random horse from Bôn Tiêu, Phiên Vũ, Dương Sa', () => {
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const { sim, notices, world } = makeSim();
    const changed = useToken(world, sim, 'horse150');
    assert.equal(changed, true);
    const horse = sim.bag!.find((it, idx) => idx > 0 && it !== null);
    assert.ok(horse, 'horse item should be added to bag');
    assert.ok((TOKEN.horsePool as readonly string[]).includes(horse.def), `unexpected horse ${horse.def}`);
    seen.add(horse.def);
    assert.match(notices[0] ?? '', new RegExp(`Nhận được ngựa ${ITEMS[horse.def]?.name}`));
  }
  assert.ok(seen.size >= 2, 'random horse pool should pick multiple horses across runs');
});

test('horse150 fails cleanly when bag has no 2x3 room', () => {
  const fillers: [number, Item][] = [];
  for (let i = 1; i < BAG_SIZE; i++) fillers.push([i, { uid: `fill-${i}`, def: 'potion-0-1', qty: 1 }]);
  const { sim, notices, world } = makeSim(fillers);
  assert.equal(useToken(world, sim, 'horse150'), false);
  assert.equal(notices[0], 'Hành trang không đủ chỗ.');
});

test('potionMax fills Ngũ Hoa Ngọc Lộ Hoàn up to MAX_BAG_POTIONS (60)', () => {
  const { sim, notices, world } = makeSim();
  assert.equal(useToken(world, sim, 'potionMax'), true);
  assert.equal(bagPotionCount(sim.bag!), MAX_BAG_POTIONS);
  const totalDual = sim.bag!.reduce((sum, it) => sum + (it?.def === TOKEN.potionId ? itemQty(it) : 0), 0);
  assert.equal(totalDual, 60);
  assert.equal(notices[0], `Nhận được 60 × ${ITEMS[TOKEN.potionId]?.name}.`);

  // Already at max -> refuses
  assert.equal(useToken(world, sim, 'potionMax'), false);
  assert.equal(notices[1], `Hành trang đã đạt tối đa ${MAX_BAG_POTIONS} bình thuốc.`);
});

test('potionMax only tops up remaining room up to 60 when other potions exist', () => {
  const { sim, notices, world } = makeSim([[1, { uid: 'p1', def: 'potion-0-5', qty: 25 }]]);
  assert.equal(useToken(world, sim, 'potionMax'), true);
  assert.equal(bagPotionCount(sim.bag!), 60);
  const added = sim.bag!.reduce((sum, it) => sum + (it?.def === TOKEN.potionId ? itemQty(it) : 0), 0);
  assert.equal(added, 35);
  assert.equal(notices[0], `Nhận được 35 × ${ITEMS[TOKEN.potionId]?.name}.`);
});
