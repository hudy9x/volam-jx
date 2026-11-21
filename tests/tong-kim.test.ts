import test from 'node:test';
import assert from 'node:assert/strict';
import {
  C2S,
  DEFAULT_BOT_SCENARIO,
  ITEMS,
  MAPS,
  SHOP_ITEMS,
  SHOP_OF,
  TK_BATTLE_MAP_ID,
  TK_MAP_LAYOUT,
  TK_SIGNUP_MAP_ID,
  canAttack,
  combatPairRules,
  combatRulesAt,
  isInTkSafeCamp,
  maxStackOf,
  normalizeBotScenario,
  tkHomeCampAt,
  tkKillPlayerPoints,
  tkRankForPoints,
  tkTitleOf,
  usableItem,
  type CombatantInfo,
} from '@vltk/shared';
import { tongKim } from '../apps/server/src/world/tongkim.js';
import { resolveCharacterMap } from '../apps/server/src/mapRegistry.js';
import { rememberTrainingReturn, resolveSavedTrainingReturn } from '../apps/server/src/world/trainingReturn.js';
import { db } from '../apps/server/src/account/db.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { TongKimBehavior } from '../tools/bots/runner/TongKimBehavior.js';

test('Tống Kim: công thức điểm PK + Liên trảm và 5 cấp quân hàm theo volam-3005', () => {
  // Binh sĩ (rank 1), liên trảm 1: kill = 60 + 60*1 = 120, streak = 10 + 1 = 11 -> 131
  assert.deepEqual(tkKillPlayerPoints(1, 1), { killPts: 120, streakPts: 11, total: 131 });
  // Đại tướng (rank 5), liên trảm 4: kill = 60 + 300 = 360, streak = 14 -> 374
  assert.deepEqual(tkKillPlayerPoints(5, 4), { killPts: 360, streakPts: 14, total: 374 });

  assert.equal(tkRankForPoints(0), 1);
  assert.equal(tkRankForPoints(999), 1);
  assert.equal(tkRankForPoints(1000), 2);
  assert.equal(tkRankForPoints(3000), 3);
  assert.equal(tkRankForPoints(6000), 4);
  assert.equal(tkRankForPoints(10000), 5);
  assert.equal(tkTitleOf('tong', 5), 'Tống Đại tướng');
  assert.equal(tkTitleOf('kim', 2), 'Kim Hiệu úy');
});

test('Tống Kim: canAttack ưu tiên battleCamp cho cả player và NPC chiến trường', () => {
  const now = 1000;
  const rules = { safe: false, pvp: true };
  const pTong: CombatantInfo = { kind: 'player', id: 'p1', dead: false, pk: 0, camp: 'justice', team: 't1', battleCamp: 'tong', protectedUntil: 0 };
  const pTong2: CombatantInfo = { kind: 'player', id: 'p2', dead: false, pk: 2, camp: 'evil', team: '', battleCamp: 'tong', protectedUntil: 0 };
  const pKim: CombatantInfo = { kind: 'player', id: 'p3', dead: false, pk: 0, camp: 'justice', team: 't1', battleCamp: 'kim', protectedUntil: 0 };
  const npcTong: CombatantInfo = { kind: 'monster', id: 'm1', dead: false, pk: 0, camp: 'new', team: '', battleCamp: 'tong', protectedUntil: 0 };
  const npcKim: CombatantInfo = { kind: 'monster', id: 'm2', dead: false, pk: 0, camp: 'new', team: '', battleCamp: 'kim', protectedUntil: 0 };

  // Cùng phe Tống không đánh nhau (dù PK=2 hay player vs NPC Tống)
  assert.equal(canAttack(pTong, pTong2, rules, now), false);
  assert.equal(canAttack(pTong2, pTong, rules, now), false);
  assert.equal(canAttack(pTong, npcTong, rules, now), false);
  assert.equal(canAttack(npcTong, pTong, rules, now), false);

  // Khác phe luôn đánh được nhau (kể cả cùng team cũ / PK=0 / NPC vs NPC khác phe)
  assert.equal(canAttack(pTong, pKim, rules, now), true);
  assert.equal(canAttack(pTong, npcKim, rules, now), true);
  assert.equal(canAttack(npcTong, pKim, rules, now), true);
  assert.equal(canAttack(npcTong, npcKim, rules, now), true);
});

test('Tống Kim: vùng an toàn Hậu doanh trên map 378 bảo vệ 2 chiều', () => {
  const meta = MAPS[TK_BATTLE_MAP_ID];
  assert.ok(meta, 'Map 378 phải tồn tại trong MAPS');
  const tongBase = TK_MAP_LAYOUT.tong.spawn;
  const kimBase = TK_MAP_LAYOUT.kim.spawn;
  const mid = { x: 9744, y: 5384 };

  assert.equal(tkHomeCampAt(TK_BATTLE_MAP_ID, tongBase.x, tongBase.y), 'tong');
  assert.equal(tkHomeCampAt(TK_BATTLE_MAP_ID, kimBase.x, kimBase.y), 'kim');
  assert.equal(tkHomeCampAt(TK_BATTLE_MAP_ID, mid.x, mid.y), null);
  assert.equal(isInTkSafeCamp(TK_BATTLE_MAP_ID, tongBase.x, tongBase.y), true);

  assert.equal(combatRulesAt(meta, tongBase).safe, true);
  assert.equal(combatRulesAt(meta, mid).safe, false);
  // Đánh từ ngoài vào trong Hậu doanh phải bị chặn (safe = true)
  assert.equal(combatPairRules(meta, mid, tongBase).safe, true);
  assert.equal(combatPairRules(meta, tongBase, mid).safe, true);
  assert.equal(combatPairRules(meta, mid, { x: 9600, y: 5400 }).safe, false);
});

test('Tống Kim: đăng ký kiểm cấp >= 60, phí 3.000 lượng, cân bằng phe và không đổi phe', () => {
  tongKim.stopMatch();
  const started = tongKim.startMatch({ mode: 1, signupSec: 60, durationSec: 300, allowSolo: true });
  assert.equal(started.ok, true);

  const mkPlayer = (charId: string, level: number, money: number) => {
    const a = new Actor();
    a.kind = 'player';
    a.name = charId;
    a.level = level;
    const sim = makeSim(charId, 'player', a, 'kim', 200);
    sim.charId = charId;
    sim.money = money;
    return sim;
  };

  // Cấp < 60 bị từ chối
  const low = mkPlayer('tk_test_low', 59, 10000);
  assert.equal(tongKim.registerPlayer(low, 'tong').ok, false);

  // Thiếu tiền (< 3000) bị từ chối
  const poor = mkPlayer('tk_test_poor', 80, 2999);
  assert.equal(tongKim.registerPlayer(poor, 'tong').ok, false);

  // Hợp lệ: trừ 3000 lượng
  const p1 = mkPlayer('tk_test_p1', 80, 10000);
  const r1 = tongKim.registerPlayer(p1, 'tong');
  assert.equal(r1.ok, true);
  assert.equal(p1.money, 7000);

  // Vào lại cùng phe không trừ thêm phí
  const r1Again = tongKim.registerPlayer(p1, 'tong');
  assert.equal(r1Again.ok, true);
  assert.equal(p1.money, 7000);

  // Đổi sang phe Kim giữa trận bị chặn
  assert.equal(tongKim.registerPlayer(p1, 'kim').ok, false);

  // Cân bằng phe (BALANCE_MEM = 2): thêm p2, p3 vào Tống (3 vs 0 -> ok vì trước khi vào 2 <= 0 + 2)
  assert.equal(tongKim.registerPlayer(mkPlayer('tk_test_p2', 80, 10000), 'tong').ok, true);
  assert.equal(tongKim.registerPlayer(mkPlayer('tk_test_p3', 80, 10000), 'tong').ok, true);
  // Người thứ 4 vào Tống (3 > 0 + 2) phải bị chặn!
  assert.equal(tongKim.registerPlayer(mkPlayer('tk_test_p4', 80, 10000), 'tong').ok, false);
  // Nhưng vào Kim thì được
  assert.equal(tongKim.registerPlayer(mkPlayer('tk_test_p4', 80, 10000), 'kim').ok, true);

  tongKim.stopMatch();
});

test('Tống Kim: tọa độ Nguyên Soái 720/469 (Tống) & 1677/224 (Kim), và Bot TongKimBehavior không vượt ngưỡng 30 msg/s', () => {
  assert.deepEqual(TK_MAP_LAYOUT.tong.marshal, { x: 5760, y: 7504 });
  assert.deepEqual(TK_MAP_LAYOUT.kim.marshal, { x: 13416, y: 3584 });

  const sent: { type: string; msg: unknown }[] = [];
  const sc = normalizeBotScenario({
    ...DEFAULT_BOT_SCENARIO,
    activities: { ...DEFAULT_BOT_SCENARIO.activities, grind: false, tongkim: true },
  });
  let meObj = { x: 2000, y: 2000, hp: 1000, maxHp: 1000, mp: 500, maxMp: 500, battleCamp: 'tong', states: [] as number[] };
  const fakeBot = {
    mapId: 37,
    rand: () => 0.2,
    bag: [],
    levels: { 1: 1 },
    bag: [] as unknown[],
    money: 0,
    autoSettings: sc.auto,
    tkState: {
      matchId: 1, mode: 1 as const, phase: 'fighting' as const, remainSec: 200,
      tongCount: 1, kimCount: 2, tongScore: 0, kimScore: 0,
      marshalSpawned: false, tongMarshalAlive: false, kimMarshalAlive: false, top10: [],
      me: { camp: 'tong' as const, points: 0, rank: 1, kills: 0, deaths: 0, npcKills: 0, streak: 0, maxStreak: 0, accum: 0, inCamp: true, campRemainSec: 170, gateWaitSec: 0 },
    },
    me: () => meObj,
    actors: () => [{ id: 'enemy1', isSelf: false, x: 9700, y: 5380, state: { kind: 'player', hp: 500, maxHp: 500, boss: 0, level: 80, mp: 100, maxMp: 100, sprite: '' } }],
    room: { state: { actors: new Map([['enemy1', { battleCamp: 'kim' }]]) } },
    host: { aura: () => {}, drops: () => [] as unknown[] },
    prepareCombat: () => false,
    attacks: () => [1],
    ready: () => true,
    range: () => 120,
    levelOf: () => 1,
    usable: () => true,
    cast: (skill: number, targetId: string | undefined, x: number, y: number) => sent.push({ type: C2S.cast, msg: { skill, targetId, x, y } }),
    send: (type: string, msg: unknown) => sent.push({ type, msg }),
    reviveIfDead: () => false,
  };

  const beh = new TongKimBehavior(fakeBot as never, sc, 0);
  // 1. Ở map 37 -> gửi teleport 323 đúng 1 lần dù update 20 lần trong 1 giây
  for (let t = 0; t < 1000; t += 50) beh.update(t);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], { type: C2S.teleport, msg: { mapId: TK_SIGNUP_MAP_ID } });

  // 2. Sang map 323 -> gửi register (chọn phe ít hơn = 'tong')
  sent.length = 0;
  fakeBot.mapId = TK_SIGNUP_MAP_ID;
  for (let t = 1000; t < 2000; t += 50) beh.update(t);
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], { type: C2S.tkAction, msg: { op: 'register', camp: 'tong' } });

  // 3. Sang map 378 ngoài tiền tuyến giao tranh -> tổng gói gửi trong 1s luôn <= 10 (dưới ngưỡng 30 msg/s)
  sent.length = 0;
  fakeBot.mapId = TK_BATTLE_MAP_ID;
  meObj = { ...meObj, x: 9600, y: 5380 };
  fakeBot.tkState.me.inCamp = false;
  for (let t = 2000; t < 3000; t += 50) beh.update(t);
  assert.ok(sent.length > 0 && sent.length <= 10, `expected 1..10 msg/s, got ${sent.length}`);
});

test('Tống Kim: Quân Nhu Quan có đủ 24 vật phẩm (Càn Khôn Đan, Chiến Cổ, Lệnh Bài, Hiệu Phù, 18 Hoàn) và Bí Bảo', () => {
  assert.equal(SHOP_ITEMS.tongkim.length, 24);
  for (const def of SHOP_ITEMS.tongkim) {
    assert.equal(SHOP_OF[def.id], 'tongkim');
    assert.ok((def.tkAccumPrice ?? 0) > 0, `${def.id} phải có giá điểm tích lũy`);
    assert.equal(maxStackOf(def), 50);
    assert.equal(usableItem(def), true);
  }
  assert.ok(ITEMS['tk-bibao']);
  assert.equal(usableItem(ITEMS['tk-bibao']), true);
  assert.equal(maxStackOf(ITEMS['tk-bibao']), 50);
});

test('Tống Kim: kẹt ở map 378 sau khi trận đóng tự chuyển về 323 (Tống/Kim) hoặc Tương Dương (78)', () => {
  tongKim.stopMatch();
  const prevUpdate = db.updateCharacter;
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  (db as { updateCharacter: typeof db.updateCharacter }).updateCharacter = (id, patch) => {
    updates.push({ id, patch: patch as Record<string, unknown> });
    return undefined;
  };
  try {
    const withKim = { id: 'c1', owner: 'u', name: 'A', faction: 'wudang', gender: 'male' as const, level: 90, mapId: TK_BATTLE_MAP_ID, x: 1000, y: 1000, tkCampLast: 'kim' as const };
    const r1 = resolveCharacterMap(withKim);
    assert.equal(r1, TK_SIGNUP_MAP_ID);
    assert.deepEqual(updates.at(-1)?.patch, { mapId: TK_SIGNUP_MAP_ID, x: 2693, y: 1163 });

    const noCamp = { id: 'c2', owner: 'u', name: 'B', faction: 'wudang', gender: 'male' as const, level: 90, mapId: TK_BATTLE_MAP_ID, x: 1000, y: 1000 };
    const r2 = resolveCharacterMap(noCamp);
    assert.equal(r2, 78);
    assert.equal(updates.at(-1)?.patch.mapId, 78);
  } finally {
    (db as { updateCharacter: typeof db.updateCharacter }).updateCharacter = prevUpdate;
  }
});

test('Tống Kim: không lưu và không quay lại map 378 làm điểm nhớ bãi luyện công', () => {
  const prevUpdate = db.updateCharacter;
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  (db as { updateCharacter: typeof db.updateCharacter }).updateCharacter = (id, patch) => {
    updates.push({ id, patch: patch as Record<string, unknown> });
    return undefined;
  };
  try {
    const sim = { a: { x: 1200, y: 800 }, charId: 'c3' } as never;
    rememberTrainingReturn(sim, TK_BATTLE_MAP_ID, TK_SIGNUP_MAP_ID);
    assert.equal(updates.length, 0);

    const charWith378 = {
      id: 'c3',
      owner: 'u',
      name: 'C',
      faction: 'wudang',
      gender: 'male' as const,
      level: 90,
      mapId: TK_SIGNUP_MAP_ID,
      x: 2693,
      y: 1163,
      trainingReturn: { mapId: TK_BATTLE_MAP_ID, x: 1200, y: 800 },
    };
    const resolved = resolveSavedTrainingReturn(charWith378, TK_SIGNUP_MAP_ID);
    assert.deepEqual(resolved, {});
    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0], { id: 'c3', patch: { trainingReturn: undefined } });
  } finally {
    (db as { updateCharacter: typeof db.updateCharacter }).updateCharacter = prevUpdate;
  }
});

test('Tống Kim: Bot TongKimBehavior tự uống Càn Khôn Tạo Hóa Đan, mua thuốc ở Hậu doanh và nhặt vật phẩm Tống Kim', async () => {
  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');
  const sc = normalizeBotScenario(DEFAULT_BOT_SCENARIO);
  const sent: { type: string; msg: unknown }[] = [];
  const meObj = { id: 'bot1', x: 9600, y: 5380, hp: 200, maxHp: 1000, mp: 100, maxMp: 500, battleCamp: 'tong', states: [] };
  const fakeBot = {
    mapId: TK_BATTLE_MAP_ID,
    rand: () => 0.1,
    levels: { 1: 1 },
    bag: [{ uid: 'u1', def: 'tk-zaohua-s', qty: 3 }, null, null, null] as unknown[],
    money: 50_000,
    autoSettings: sc.auto,
    tkState: {
      matchId: 1, mode: 1 as const, phase: 'fighting' as const, remainSec: 200,
      tongCount: 1, kimCount: 1, tongScore: 0, kimScore: 0,
      marshalSpawned: false, tongMarshalAlive: false, kimMarshalAlive: false, top10: [],
      me: { camp: 'tong' as const, points: 0, rank: 1, kills: 0, deaths: 0, npcKills: 0, streak: 0, maxStreak: 0, accum: 0, inCamp: false, campRemainSec: 0, gateWaitSec: 0 },
    },
    me: () => meObj,
    actors: () => [],
    room: { state: { actors: new Map() } },
    host: {
      aura: () => {},
      drops: () => [{ id: 'd-bibao', x: 9610, y: 5385, owner: '', team: '', def: 'tk-bibao', q: 1 }],
    },
    prepareCombat: () => false,
    attacks: () => [1],
    ready: () => true,
    range: () => 120,
    levelOf: () => 1,
    usable: () => true,
    cast: (skill: number, targetId: string | undefined, x: number, y: number) => sent.push({ type: C2S.cast, msg: { skill, targetId, x, y } }),
    send: (type: string, msg: unknown) => sent.push({ type, msg }),
    reviveIfDead: () => false,
  };

  const beh = new TongKimBehavior(fakeBot as never, sc, 0);
  beh.update(1000);
  assert.ok(sent.some(s => s.type === C2S.use && (s.msg as { index: number }).index === 0), 'bot phải uống Càn Khôn Tạo Hóa Đan');
  assert.ok(sent.some(s => s.type === C2S.pickup && (s.msg as { id: string }).id === 'd-bibao'), 'bot phải nhặt Tống Kim Bí Bảo trong tầm');

  // Về Hậu doanh khi thiếu thuốc -> tự mua thêm bình máu
  sent.length = 0;
  fakeBot.bag = [null, null, null, null];
  fakeBot.tkState.me.inCamp = true;
  beh.update(5000);
  assert.ok(sent.some(s => s.type === C2S.buy), 'bot ở Hậu doanh thiếu máu phải mua thuốc');
});

test('Tống Kim: AutoPlay tự nhặt vật phẩm Tống Kim kể cả khi chỉ lọc Đồ xanh (magic)', async () => {
  const { AutoPlay, DEFAULT_AUTO } = await import('@vltk/shared');
  const picked: string[] = [];
  const bag = Array.from({ length: 10 }, () => null);
  const auto = new AutoPlay({
    self: () => ({ id: 'p1', isSelf: true, x: 1000, y: 1000, state: { kind: 'player', hp: 1000, maxHp: 1000, mp: 500, maxMp: 500, boss: 0, level: 80, sprite: '' } }),
    actors: () => [],
    skills: () => [1],
    skillAt: () => 1,
    learnedSkills: () => [1],
    aura: () => {},
    ready: () => true,
    cost: () => 0,
    range: () => 120,
    melee: () => true,
    cast: () => {},
    move: () => {},
    bag: () => bag,
    money: () => 0,
    use: () => {},
    sell: () => {},
    buy: () => {},
    wearable: () => false,
    drops: () => [{ id: 'drop-tk-1', x: 1010, y: 1005, owner: '', team: '', def: 'tk-bibao', q: 0 }],
    pickup: id => picked.push(id),
    train: () => {},
    goTown: () => {},
    respawn: () => {},
    notice: () => {},
    safe: () => false,
    usable: () => true,
  } as never);
  auto.start();
  auto.update(1000, { ...DEFAULT_AUTO, autoPickup: true, autoLoot: 'magic', autoMoney: true });
  assert.deepEqual(picked, ['drop-tk-1']);
});

test('Tống Kim: Bot TongKimBehavior bơm máu 3 lớp (80% / 50% / 30% bơm liên tục 2 bình)', async () => {
  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');
  const sc = normalizeBotScenario(DEFAULT_BOT_SCENARIO);
  const sent: { type: string; msg: unknown }[] = [];
  const meObj = { id: 'bot1', x: 9600, y: 5380, hp: 750, maxHp: 1000, mp: 500, maxMp: 500, battleCamp: 'tong', states: [] };
  const fakeBot = {
    mapId: TK_BATTLE_MAP_ID,
    rand: () => 0.1,
    levels: { 1: 1 },
    bag: [
      { uid: 'p-small', def: 'potion-0-2', qty: 5 },
      { uid: 'p-big', def: 'tk-zaohua-b', qty: 5 },
      null,
    ] as unknown[],
    money: 50_000,
    autoSettings: sc.auto,
    tkState: {
      matchId: 1, mode: 1 as const, phase: 'fighting' as const, remainSec: 200,
      tongCount: 1, kimCount: 1, tongScore: 0, kimScore: 0,
      marshalSpawned: false, tongMarshalAlive: false, kimMarshalAlive: false, top10: [],
      me: { camp: 'tong' as const, points: 0, rank: 1, kills: 0, deaths: 0, npcKills: 0, streak: 0, maxStreak: 0, accum: 0, inCamp: false, campRemainSec: 0, gateWaitSec: 0 },
    },
    me: () => meObj,
    actors: () => [],
    room: { state: { actors: new Map() } },
    host: { aura: () => {}, drops: () => [] },
    prepareCombat: () => false,
    attacks: () => [1],
    ready: () => true,
    range: () => 120,
    levelOf: () => 1,
    usable: () => true,
    cast: () => {},
    send: (type: string, msg: unknown) => sent.push({ type, msg }),
    reviveIfDead: () => false,
  };

  const beh = new TongKimBehavior(fakeBot as never, sc, 0);
  // Lớp 1 (< 80%): bơm 1 bình
  beh.update(1000);
  assert.equal(sent.filter(s => s.type === C2S.use).length, 1);

  // Tụt sang lớp 2 (< 50%) ngay sau 100ms: vượt cooldown lớp 1, bơm ngay 1 bình lớn
  sent.length = 0;
  meObj.hp = 450;
  beh.update(1100);
  const tier2Uses = sent.filter(s => s.type === C2S.use);
  assert.equal(tier2Uses.length, 1);
  assert.equal((tier2Uses[0].msg as { index: number }).index, 1);

  // Tụt sang lớp 3 (< 30%) ngay sau 100ms: bơm liên tục 2 bình
  sent.length = 0;
  meObj.hp = 250;
  beh.update(1200);
  const tier3Uses = sent.filter(s => s.type === C2S.use);
  assert.equal(tier3Uses.length, 2);
});
