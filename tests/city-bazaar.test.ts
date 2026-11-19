import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BAG_PAGE_SIZE, BAG_SIZE, MAX_MONEY, S2C, STALL_SIZE, TOKEN_ITEM_ID, TOWN_PORTAL_ID,
  type Item, type StallDetailMsg, type StallListMsg,
} from '@vltk/shared';
import {
  inspectStall, resetStallsForTest, sendStallList, stallBuy, stallClose, stallMove, stallOffline, stallOnline,
  stallOpen, stallPut, stallSetPrice, stallTake, type StallSeat,
} from '../apps/server/src/world/stalls.js';
import type { Sim } from '../apps/server/src/world/entity.js';

function makePlayer(charId: string, name: string, mapId: number, opts: { money?: number; knb?: number; camp?: string; items?: Item[] } = {}) {
  const bag: (Item | null)[] = Array(BAG_SIZE).fill(null);
  (opts.items ?? []).forEach((it, idx) => { bag[idx] = it; });
  const sim = {
    id: `sess-${charId}`,
    charId,
    kind: 'player',
    a: { name, camp: opts.camp ?? 'justice' },
    bag,
    bagSpill: [] as Item[],
    money: opts.money ?? 500_000,
    knb: opts.knb ?? 10,
  } as unknown as Sim;
  const messages: { type: string; msg: unknown }[] = [];
  const notices: string[] = [];
  let saved = 0;
  const seat: StallSeat = {
    sim,
    mapId,
    send: (type, msg) => messages.push({ type, msg }),
    notify: text => notices.push(text),
    syncAndSave: () => { saved++; },
  };
  stallOnline(charId, seat);
  const last = <T>(type: string): T | undefined => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].type === type) return messages[i].msg as T;
    return undefined;
  };
  return { sim, seat, messages, notices, last, savedCount: () => saved };
}

const makeItem = (uid: string, def = 'ring-0-1'): Item => ({ uid, def, q: 1 });

test('City Bazaar: 2-tab stall, pricing, town isolation, atomic buy (money & KNB), and auto-close', () => {
  resetStallsForTest();
  const seller = makePlayer('c-seller', 'ChủSạp', 37, {
    money: 10_000,
    knb: 2,
    camp: 'free',
    items: [
      makeItem('u-token', TOKEN_ITEM_ID),
      makeItem('u-portal', TOWN_PORTAL_ID),
      makeItem('u-ring1', 'ring-0-1'),
      makeItem('u-ring2', 'ring-0-2'),
    ],
  });
  const buyer = makePlayer('c-buyer', 'NgườiMua', 37, { money: 200_000, knb: 5 });
  const otherTown = makePlayer('c-other', 'KháchPT', 1, { money: 200_000, knb: 5 });
  const fieldPlayer = makePlayer('c-field', 'NgoàiThành', 140, { money: 200_000, knb: 5 });

  // Non-town cannot open bazaar
  sendStallList('c-field');
  assert.match(fieldPlayer.notices.at(-1) ?? '', /trong thành thị/);

  // Open own stall in Biện Kinh (37)
  inspectStall('c-seller', '');
  const initDetail = seller.last<StallDetailMsg>(S2C.stallDetail);
  assert.ok(initDetail && initDetail.isOwner && initDetail.items.length === STALL_SIZE);

  // Token and Town Portal cannot be put into stall
  assert.equal(stallPut('c-seller', 0), false);
  assert.equal(stallPut('c-seller', 1), false);

  // Put item 1 into tab 0 (page 0) and item 2 into tab 1 (page 1)
  assert.equal(stallPut('c-seller', 2, undefined, 0), true);
  assert.equal(stallPut('c-seller', 3, undefined, 1), true);
  const afterPut = seller.last<StallDetailMsg>(S2C.stallDetail)!;
  const idx1 = afterPut.items.findIndex(it => it?.uid === 'u-ring1');
  const idx2 = afterPut.items.findIndex(it => it?.uid === 'u-ring2');
  assert.ok(idx1 >= 0 && idx1 < BAG_PAGE_SIZE);
  assert.ok(idx2 >= BAG_PAGE_SIZE && idx2 < STALL_SIZE);

  // Move inside stall
  assert.equal(stallMove('c-seller', idx1, 5), true);
  assert.equal(seller.last<StallDetailMsg>(S2C.stallDetail)!.items[5]?.uid, 'u-ring1');

  // Cannot open stall while items are unpriced
  assert.equal(stallOpen('c-seller', 'Bán đồ xịn'), false);

  // Price item 1 in money, item 2 in KNB
  assert.equal(stallSetPrice('c-seller', 'u-ring1', 50_000, 'money'), true);
  assert.equal(stallSetPrice('c-seller', 'u-ring2', 3, 'knb'), true);

  // Open stall
  assert.equal(stallOpen('c-seller', 'Shop Nhẫn VIP'), true);

  // Locked while open
  assert.equal(stallTake('c-seller', 5), false);
  assert.equal(stallSetPrice('c-seller', 'u-ring1', 60_000, 'money'), false);

  // Town isolation: visible in Biện Kinh (37), hidden in Phượng Tường (1)
  sendStallList('c-buyer');
  const bkList = buyer.last<StallListMsg>(S2C.stallList)!;
  assert.equal(bkList.stalls.length, 1);
  assert.equal(bkList.stalls[0].title, 'Shop Nhẫn VIP');
  assert.equal(bkList.stalls[0].sellerCamp, 'free');
  assert.equal(bkList.stalls[0].itemCount, 2);

  sendStallList('c-other');
  assert.equal(otherTown.last<StallListMsg>(S2C.stallList)!.stalls.length, 0);

  // Self-buy blocked; wrong price blocked
  assert.equal(stallBuy('c-seller', 'c-seller', 'u-ring1', 50_000, 'money'), false);
  assert.equal(stallBuy('c-buyer', 'c-seller', 'u-ring1', 40_000, 'money'), false);

  // Buy item 1 with money
  assert.equal(stallBuy('c-buyer', 'c-seller', 'u-ring1', 50_000, 'money'), true);
  assert.equal(buyer.sim.money, 150_000);
  assert.equal(seller.sim.money, 60_000);
  assert.ok(buyer.sim.bag!.some(it => it?.uid === 'u-ring1'));
  // Duplicate buy fails
  assert.equal(stallBuy('c-buyer', 'c-seller', 'u-ring1', 50_000, 'money'), false);

  // Buy item 2 with KNB -> last item sold -> stall auto-closes
  assert.equal(stallBuy('c-buyer', 'c-seller', 'u-ring2', 3, 'knb'), true);
  assert.equal(buyer.sim.knb, 2);
  assert.equal(seller.sim.knb, 5);
  assert.ok(buyer.sim.bag!.some(it => it?.uid === 'u-ring2'));
  assert.equal(seller.last<StallDetailMsg>(S2C.stallDetail)!.open, false);

  sendStallList('c-buyer');
  assert.equal(buyer.last<StallListMsg>(S2C.stallList)!.stalls.length, 0);
});

test('City Bazaar: disconnect closes stall and returns all items to bag or bagSpill', () => {
  resetStallsForTest();
  const seller = makePlayer('c-off', 'ThoátGame', 37, { items: [makeItem('u-1', 'ring-0-1')] });
  const buyer = makePlayer('c-watch', 'NgườiXem', 37, { money: 100_000 });

  inspectStall('c-off', '');
  assert.equal(stallPut('c-off', 0), true);
  assert.equal(stallSetPrice('c-off', 'u-1', 10_000, 'money'), true);
  assert.equal(stallOpen('c-off', 'Sạp sắp tắt'), true);
  assert.equal(seller.sim.bag!.some(it => it?.uid === 'u-1'), false);

  // Fill seller bag completely to test bagSpill fallback
  for (let i = 0; i < BAG_SIZE; i++) seller.sim.bag![i] = makeItem(`fill-${i}`, 'ring-0-1');

  // Actual logout -> stall disappears and item is returned safely into bagSpill
  stallOffline('c-off', seller.sim, false);
  sendStallList('c-watch');
  assert.equal(buyer.last<StallListMsg>(S2C.stallList)!.stalls.length, 0);
  assert.ok(seller.sim.bagSpill!.some(it => it.uid === 'u-1'));
});

test('City Bazaar: pause/resume editing and MAX_MONEY overflow guard', () => {
  resetStallsForTest();
  const seller = makePlayer('c-rich', 'ĐạiGia', 37, { money: MAX_MONEY - 100, items: [makeItem('u-vip', 'ring-0-1')] });
  const buyer = makePlayer('c-b', 'Khách', 37, { money: 10_000 });

  inspectStall('c-rich', '');
  assert.equal(stallPut('c-rich', 0), true);
  assert.equal(stallSetPrice('c-rich', 'u-vip', 500, 'money'), true);
  assert.equal(stallOpen('c-rich', 'Đồ quý'), true);

  // Seller wallet would exceed MAX_MONEY -> blocked without changing money/items
  assert.equal(stallBuy('c-b', 'c-rich', 'u-vip', 500, 'money'), false);
  assert.equal(buyer.sim.money, 10_000);

  // Close stall -> can retrieve item back to bag
  assert.equal(stallClose('c-rich'), true);
  assert.equal(stallTake('c-rich', 0), true);
  assert.ok(seller.sim.bag!.some(it => it?.uid === 'u-vip'));
});
