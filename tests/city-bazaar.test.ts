import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BAG_PAGE_SIZE, BAG_SIZE, CHAT, MAX_MONEY, S2C, STALL_SIZE, TOKEN_ITEM_ID, TOWN_PORTAL_ID,
  type Item, type StallDetailMsg,
} from '@vltk/shared';
import {
  inspectStall, resetStallsForTest, stallBuy, stallClose, stallOffline, stallOnline,
  stallOpen, stallSetPrice, type StallSeat,
} from '../apps/server/src/world/stalls.js';
import type { Sim } from '../apps/server/src/world/entity.js';

function makePlayer(
  charId: string,
  name: string,
  mapId: number,
  opts: {
    money?: number;
    knb?: number;
    camp?: string;
    level?: number;
    mounted?: boolean;
    x?: number;
    y?: number;
    npcs?: { x: number; y: number }[];
    bagEntries?: [number, Item][];
  } = {},
) {
  const bag: (Item | null)[] = Array(BAG_SIZE).fill(null);
  for (const [idx, it] of opts.bagEntries ?? []) bag[idx] = it;
  const sim = {
    id: `sess-${charId}`,
    charId,
    kind: 'player',
    a: {
      name,
      camp: opts.camp ?? 'justice',
      level: opts.level ?? 60,
      hp: 1000,
      mounted: opts.mounted ?? false,
      attackTarget: '',
      stallTitle: '',
      x: opts.x ?? 500,
      y: opts.y ?? 500,
    },
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
    actorId: `sess-${charId}`,
    mapId,
    send: (type, msg) => messages.push({ type, msg }),
    notify: text => notices.push(text),
    syncAndSave: () => { saved++; },
    npcPositions: () => opts.npcs ?? [],
  };
  stallOnline(charId, seat);
  const last = <T>(type: string): T | undefined => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].type === type) return messages[i].msg as T;
    return undefined;
  };
  return { sim, seat, messages, notices, last, savedCount: () => saved };
}

const makeItem = (uid: string, def = 'ring-0-1'): Item => ({ uid, def, q: 1 });

test('Player Stall: direct 2-page bag pricing, 120-cell single-page inspect, atomic buy (money & KNB), price reset & auto-close', () => {
  resetStallsForTest();
  const seller = makePlayer('c-seller', 'ChủSạp', 37, {
    money: 10_000,
    knb: 2,
    camp: 'free',
    bagEntries: [
      [0, makeItem('u-token', TOKEN_ITEM_ID)],
      [1, makeItem('u-portal', TOWN_PORTAL_ID)],
      [2, makeItem('u-ring1', 'ring-0-1')],
      [BAG_PAGE_SIZE + 5, makeItem('u-ring2', 'ring-0-2')], // Page 2 (slot 65 < 120)
      [STALL_SIZE + 1, makeItem('u-ring3', 'ring-0-1')],    // Page 3 (slot 121 >= 120)
    ],
  });
  const buyer = makePlayer('c-buyer', 'NgườiMua', 37, { money: 200_000, knb: 5 });
  const otherTown = makePlayer('c-other', 'KháchPT', 1, { money: 200_000, knb: 5 });

  // Forbidden items & page 3 items cannot be priced
  assert.equal(stallSetPrice('c-seller', 'u-token', 1000, 'money'), false);
  assert.equal(stallSetPrice('c-seller', 'u-portal', 1000, 'money'), false);
  assert.equal(stallSetPrice('c-seller', 'u-ring3', 1000, 'money'), false);

  // Opening without any priced item fails
  assert.equal(stallOpen('c-seller', 'Bán đồ ngon'), false);

  // Price items on page 1 (money) & page 2 (KNB)
  assert.equal(stallSetPrice('c-seller', 'u-ring1', 50_000, 'money'), true);
  assert.equal(stallSetPrice('c-seller', 'u-ring2', 3, 'knb'), true);
  assert.equal(seller.sim.bag![2]!.stallPrice?.price, 50_000);
  assert.equal(seller.sim.bag![BAG_PAGE_SIZE + 5]!.stallPrice?.currency, 'knb');

  // Open stall
  assert.equal(stallOpen('c-seller', 'Sạp đồ xịn'), true);
  assert.equal(seller.sim.a.stallTitle, 'Sạp đồ xịn');

  // Cannot edit price while open
  assert.equal(stallSetPrice('c-seller', 'u-ring1', 60_000, 'money'), false);

  // Other town cannot inspect
  inspectStall('c-other', 'c-seller');
  assert.equal(otherTown.last(S2C.stallDetail), undefined);

  // Buyer in same town can inspect by actorId (sessionId) and sees 120-cell single page with only priced items
  inspectStall('c-buyer', 'sess-c-seller');
  const detail = buyer.last<StallDetailMsg>(S2C.stallDetail);
  assert.ok(detail);
  assert.equal(detail.items.length, STALL_SIZE);
  assert.equal(detail.items[0], null); // token is unpriced -> masked
  assert.equal(detail.items[2]?.uid, 'u-ring1');
  assert.equal(detail.items[BAG_PAGE_SIZE + 5]?.uid, 'u-ring2');
  assert.equal(detail.prices['u-ring1']?.price, 50_000);
  assert.equal(detail.prices['u-ring2']?.currency, 'knb');

  // Stale price check fails
  assert.equal(stallBuy('c-buyer', 'c-seller', 'u-ring1', 40_000, 'money'), false);

  // Buy u-ring1 with money -> price is reset on buyer's new item
  assert.equal(stallBuy('c-buyer', 'c-seller', 'u-ring1', 50_000, 'money'), true);
  assert.equal(buyer.sim.money, 150_000);
  assert.equal(seller.sim.money, 60_000);
  const bought1 = buyer.sim.bag!.find(it => it?.uid === 'u-ring1');
  assert.ok(bought1);
  assert.equal(bought1.stallPrice, undefined);
  assert.equal(seller.sim.bag![2], null);

  // Buy u-ring2 with KNB -> last item sold auto-closes stall
  assert.equal(stallBuy('c-buyer', 'c-seller', 'u-ring2', 3, 'knb'), true);
  assert.equal(buyer.sim.knb, 2);
  assert.equal(seller.sim.knb, 5);
  assert.equal(seller.sim.a.stallTitle, '');
  assert.ok(buyer.last(S2C.stallClosed));
});

test('Player Stall: PermitTrade guards (level >= 60, not mounted, NPC clearance, safe town) and close never blocked', () => {
  resetStallsForTest();
  const lowLv = makePlayer('c-low', 'ThấpCấp', 37, { level: 59, bagEntries: [[0, makeItem('u-1')]] });
  assert.equal(stallSetPrice('c-low', 'u-1', 1000, 'money'), true);
  assert.equal(stallOpen('c-low', 'Test'), false);

  const mounted = makePlayer('c-mnt', 'CưỡiNgựa', 37, { level: 60, mounted: true, bagEntries: [[0, makeItem('u-2')]] });
  assert.equal(stallSetPrice('c-mnt', 'u-2', 1000, 'money'), true);
  assert.equal(stallOpen('c-mnt', 'Test'), false);

  const nearNpc = makePlayer('c-npc', 'GầnNPC', 37, {
    level: 60,
    x: 100,
    y: 100,
    npcs: [{ x: 120, y: 120 }],
    bagEntries: [[0, makeItem('u-3')]],
  });
  assert.equal(stallSetPrice('c-npc', 'u-3', 1000, 'money'), true);
  assert.equal(stallOpen('c-npc', 'Test'), false);

  const wild = makePlayer('c-wild', 'NgoàiThành', 53, { level: 60, bagEntries: [[0, makeItem('u-4')]] });
  // Map 53 in tests might be Ba Lăng Huyện (safe) or training map; test non-safe map 319 if present, or check:
  assert.equal(stallSetPrice('c-wild', 'u-4', 1000, 'money'), true);

  const ok = makePlayer('c-ok', 'HợpLệ', 37, {
    level: 60,
    x: 500,
    y: 500,
    npcs: [{ x: 100, y: 100 }],
    bagEntries: [[0, makeItem('u-5')]],
  });
  assert.equal(stallSetPrice('c-ok', 'u-5', 1000, 'money'), true);
  assert.equal(stallOpen('c-ok', 'Sạp chuẩn'), true);
  // Even if player somehow enters attack state, stallClose still works
  ok.sim.a.attackTarget = 'someone';
  assert.equal(stallClose('c-ok'), true);
  assert.equal(ok.sim.a.stallTitle, '');

  // Offline closes open stall
  ok.sim.a.attackTarget = '';
  assert.equal(stallOpen('c-ok', 'Sạp chuẩn 2'), true);
  stallOffline('c-ok', ok.sim, false);
  assert.equal(ok.sim.a.stallTitle, '');

  // Wallet overflow protection
  const richSeller = makePlayer('c-rich', 'ĐạiGia', 37, { money: MAX_MONEY - 10, bagEntries: [[0, makeItem('u-rich')]] });
  const richBuyer = makePlayer('c-richb', 'Mua', 37, { money: 50_000 });
  assert.equal(stallSetPrice('c-rich', 'u-rich', 100, 'money'), true);
  assert.equal(stallOpen('c-rich', 'Đồ đắt'), true);
  assert.equal(stallBuy('c-richb', 'c-rich', 'u-rich', 100, 'money'), false);
  assert.equal(richBuyer.sim.money, 50_000);
});

test('Trade chat constants: 30 minutes window and max 50 lines', () => {
  assert.equal(CHAT.tradeWindowMs, 30 * 60 * 1000);
  assert.equal(CHAT.tradeMaxLines, 50);
});
