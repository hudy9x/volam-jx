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
  TK_POINTS,
  TK_SIGNUP_MAP_ID,
  canAttack,
  combatPairRules,
  combatRulesAt,
  isInTkSafeCamp,
  maxStackOf,
  normalizeBotScenario,
  tkBotRewardMultiplier,
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

test('Tống Kim: Quân Nhu Quan có đủ 29 vật phẩm (Càn Khôn Đan, Chiến Cổ, Lệnh Bài, Hiệu Phù, 18 Hoàn, 5 Lệnh Bẫy) và Bí Bảo', () => {
  assert.equal(SHOP_ITEMS.tongkim.length, 29);
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

test('Tống Kim: giết NPC chiến trường không có slot sau khi trận đóng không gây crash TypeError', async () => {
  const { kill } = await import('../apps/server/src/world/systems/combat.js');
  tongKim.stopMatch();
  const a = new Actor();
  a.id = 'tk-npc-dead';
  a.kind = 'monster';
  a.res = 'enemy029';
  a.level = 80;
  a.hp = 100;
  a.maxHp = 100;
  a.battleCamp = 'kim';
  const target = makeSim(a.id, 'monster', a, 'wood', 120);
  const w = {
    now: 5000,
    meta: MAPS[TK_BATTLE_MAP_ID],
    grid: null,
    sims: new Map([[target.id, target]]),
    events: [] as unknown[],
    engine: { cancel: () => {}, onDeath: () => {} },
    hooks: { progress: () => {}, announce: () => {}, notify: () => {} },
  };
  assert.doesNotThrow(() => kill(w as never, target));
  assert.equal(target.dead, true);
  assert.ok((target.removeAt ?? 0) > 5000);
});

test('Bot Manager & Chiến thuật Tống Kim: dải cấp 150–200 dùng Hoàng Kim + skill 150, và bot chia 3 cánh gọng kìm', async () => {
  const { BOT_LEVEL_BANDS, normalizeBotTemplate } = await import('@vltk/shared');
  assert.ok(BOT_LEVEL_BANDS.some(([lo, hi]) => lo === 150 && hi === 200), 'phải có dải cấp 150–200');
  const norm = normalizeBotTemplate({ level: [150, 200], gear: 'green', tiers: false });
  assert.deepEqual(norm.level, [150, 200]);
  assert.equal(norm.gear, 'gold');
  assert.equal(norm.tiers, true);

  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');
  const sc = normalizeBotScenario(DEFAULT_BOT_SCENARIO);
  const destinations: { x: number; y: number }[] = [];
  for (let idx = 0; idx < 3; idx++) {
    const sent: { type: string; msg: unknown }[] = [];
    const fakeBot = {
      mapId: TK_BATTLE_MAP_ID,
      rand: () => 0.5,
      levels: { 1: 1 },
      bag: [],
      money: 0,
      autoSettings: sc.auto,
      tkState: {
        matchId: 1, mode: 1 as const, phase: 'fighting' as const, remainSec: 200,
        tongCount: 3, kimCount: 3, tongScore: 0, kimScore: 0,
        marshalSpawned: false, tongMarshalAlive: false, kimMarshalAlive: false, top10: [],
        me: { camp: 'tong' as const, points: 0, rank: 1, kills: 0, deaths: 0, npcKills: 0, streak: 0, maxStreak: 0, accum: 0, inCamp: false, campRemainSec: 0, gateWaitSec: 0 },
      },
      me: () => ({ id: `b${idx}`, x: 5648, y: 7472, hp: 1000, maxHp: 1000, mp: 500, maxMp: 500, battleCamp: 'tong', states: [] }),
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
    const beh = new TongKimBehavior(fakeBot as never, sc, idx);
    beh.update(1000);
    const mv = sent.find(s => s.type === C2S.move);
    assert.ok(mv, `bot ${idx} phải gửi lệnh di chuyển`);
    destinations.push(mv.msg as { x: number; y: number });
  }
  // 3 bot chia 3 cánh khác nhau nên tọa độ y đích khác biệt rõ rệt
  const ys = destinations.map(d => d.y);
  assert.ok(new Set(ys).size === 3, `3 cánh phải có 3 tọa độ y khác nhau: ${ys.join(', ')}`);
});

test('Tống Kim: hạ 1 Nguyên Soái trận vẫn tiếp tục tới hết giờ, phe còn Soái thắng, dọn NPC và đóng sau <= 10s', () => {
  tongKim.stopMatch();
  tongKim.startMatch({ mode: 1, signupSec: 10, durationSec: 300, marshalDelaySec: 5, endSec: 60, allowSolo: true });
  const now = Date.now();
  const p = new Actor();
  p.id = 'p-win';
  p.name = 'AnhHung';
  p.kind = 'player';
  p.level = 90;
  p.pk = 1;
  const pSim = makeSim(p.id, 'player', p, 'metal', 120);
  pSim.charId = 'char-win';
  tongKim.registerPlayer(pSim, 'tong');

  const m = new Actor();
  m.id = 'kim-marshal';
  m.name = 'Kim Nguyên Soái';
  m.kind = 'monster';
  m.res = 'enemy031';
  m.level = 100;
  m.battleCamp = 'kim';
  const mSim = makeSim(m.id, 'monster', m, 'wood', 120);
  mSim.tkCamp = 'kim';
  mSim.tkRole = 'marshal';

  const removed: string[] = [];
  const transferred: { id: string; mapId: number }[] = [];
  const w = {
    now,
    meta: MAPS[TK_BATTLE_MAP_ID],
    sims: new Map([[pSim.id, pSim], [mSim.id, mSim]]),
    removeSim: (id: string) => { removed.push(id); w.sims.delete(id); },
    hooks: {
      announce: () => {},
      notify: () => {},
      log: () => {},
      transfer: (sim: { id: string }, mapId: number) => transferred.push({ id: sim.id, mapId }),
    },
  };

  // Đẩy sang fighting rồi giết Nguyên Soái Kim -> trận tiếp tục đánh (không dừng ngay)
  tongKim.tickBattleWorld(undefined, now + 15_000);
  assert.equal(tongKim.snapshotFor('char-win', now + 15_000).phase, 'fighting');
  (tongKim as any).npcsSpawned = true;
  (tongKim as any).marshalSpawned = true;
  (tongKim as any).tongMarshalId = 'tong-marshal';
  (tongKim as any).kimMarshalId = mSim.id;

  w.now = now + 20_000;
  tongKim.onTkKill(w as never, mSim, pSim);
  const midSnap = tongKim.snapshotFor('char-win', now + 20_000);
  assert.equal(midSnap.phase, 'fighting', 'giết 1 Nguyên Soái không dừng trận ngay');
  assert.equal(midSnap.tongMarshalAlive, true);
  assert.equal(midSnap.kimMarshalAlive, false);

  // Hết giờ (sau 300s fighting) -> phe còn Nguyên Soái (Tống) thắng, dọn NPC & tắt PK ngay
  const endAt = now + 315_000;
  w.now = endAt;
  tongKim.tickBattleWorld(w as never, endAt);
  const endSnap = tongKim.snapshotFor('char-win', endAt);
  assert.equal(endSnap.phase, 'ended');
  assert.equal(endSnap.winner, 'tong');
  assert.equal(pSim.a.pk, 0);
  assert.ok(removed.includes(mSim.id), 'phải dọn NPC chiến trường khi trận kết thúc');

  // Sau 10s -> tự đóng trận và chuyển toàn bộ người chơi về 323
  tongKim.tickBattleWorld(w as never, endAt + 10_500);
  assert.equal(tongKim.snapshotFor(undefined, endAt + 10_500).phase, 'closed');
  assert.ok(transferred.some(t => t.id === pSim.id && t.mapId === TK_SIGNUP_MAP_ID));
});

test('PvP ngũ hành: khắc hệ (Kim đánh Mộc) nhân 0.4, không khắc (Kim đánh Thổ/Hỏa) nhân 0.2', async () => {
  const { resolveHit } = await import('@vltk/shared');
  const makeTarget = (series: 'kim' | 'moc' | 'tho' | 'hoa') => ({
    series,
    level: 90,
    def: 0,
    resist: { phys: 0, cold: 0, fire: 0, light: 0, poison: 0 },
    resistMax: { phys: 75, cold: 75, fire: 75, light: 75, poison: 75 },
    bag: {},
  });
  const attacker = { series: 'kim' as const, level: 90, ar: 9999, bag: {} };
  const skill = { id: 1, name: 'Test', useAR: false, pack: 'common', series: -1 } as never;
  const parts = { phys: [1000, 1000] as [number, number], cold: [0, 0] as [number, number], fire: [0, 0] as [number, number], light: [0, 0] as [number, number], poison: null };

  const vsWood = resolveHit(parts, { attacker, target: makeTarget('moc'), skill, level: 1, targetLife: 10000, pvp: true } as never, () => 0.5);
  const vsEarth = resolveHit(parts, { attacker, target: makeTarget('tho'), skill, level: 1, targetLife: 10000, pvp: true } as never, () => 0.5);
  const vsFire = resolveHit(parts, { attacker, target: makeTarget('hoa'), skill, level: 1, targetLife: 10000, pvp: true } as never, () => 0.5);

  assert.equal(vsWood.dmg, 400);
  assert.equal(vsEarth.dmg, 200);
  assert.equal(vsFire.dmg, 200);
});

test('Tống Kim: Bot TongKimBehavior Khinh công thoát vây (>= 3 địch / mất máu 2s), chạy về mua máu và dùng vật phẩm TK', async () => {
  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');
  const sc = normalizeBotScenario(DEFAULT_BOT_SCENARIO);
  const sent: { type: string; msg: unknown }[] = [];
  const casts: { skill: number; x: number; y: number }[] = [];

  const meObj: any = { id: 'bot1', x: 9600, y: 5380, hp: 1000, maxHp: 1000, mp: 500, maxMp: 500, battleCamp: 'tong', states: [], mounted: false, ctl: 0, jumpMs: 0, anim: 'idle' };
  const enemyActors = [
    { id: 'e1', isSelf: false, x: 9680, y: 5390, state: { hp: 500, kind: 'player', boss: 0 } },
    { id: 'e2', isSelf: false, x: 9650, y: 5440, state: { hp: 500, kind: 'player', boss: 0 } },
    { id: 'e3', isSelf: false, x: 9540, y: 5420, state: { hp: 500, kind: 'player', boss: 0 } },
  ];
  const rawActors = new Map([
    ['e1', { battleCamp: 'kim', attackTarget: 'bot1' }],
    ['e2', { battleCamp: 'kim', attackTarget: 'bot1' }],
    ['e3', { battleCamp: 'kim', attackTarget: '' }],
  ]);

  const fakeBot = {
    mapId: TK_BATTLE_MAP_ID,
    rand: () => 0.1,
    levels: { 1: 1, 210: 1 },
    bag: [
      { uid: 'p1', def: 'potion-0-2', qty: 5 },
      { uid: 'tk1', def: 'tk-bibao', qty: 1 },
      { uid: 'tk2', def: 'tk-chienco', qty: 1 },
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
    actors: () => enemyActors,
    room: { state: { actors: rawActors } },
    host: { aura: () => {}, drops: () => [] },
    prepareCombat: () => false,
    attacks: () => [1],
    ready: () => true,
    range: () => 120,
    levelOf: () => 1,
    usable: () => true,
    cast: (skill: number, _tid: string | undefined, x: number, y: number) => { casts.push({ skill, x, y }); },
    send: (type: string, msg: unknown) => sent.push({ type, msg }),
    reviveIfDead: () => {},
  };

  const beh = new TongKimBehavior(fakeBot as never, sc, 0);
  // 1. Có >= 3 địch gần -> dùng Khinh công (210) và tự mở vật phẩm Tống Kim trong túi
  beh.update(1000);
  assert.ok(casts.some(c => c.skill === 210), 'phải dùng Khinh công (210) khi có >= 3 địch áp sát');
  assert.ok(sent.some(s => s.type === C2S.use && (s.msg as any).index === 1), 'phải tự dùng vật phẩm Tống Kim (tk-bibao) trong túi');

  // 2. Chỉ còn 1 địch nhưng mất máu liên tục trong 2s -> nhảy Khinh công lần nữa sau cooldown
  enemyActors.length = 1;
  meObj.hp = 900;
  beh.update(8000);
  meObj.hp = 850;
  beh.update(8700);
  meObj.hp = 800;
  beh.update(9400);
  meObj.hp = 760;
  beh.update(10100);
  assert.equal(casts.filter(c => c.skill === 210).length, 2, 'phải nhảy Khinh công khi mất máu liên tục >= 2s');

  // 3. Ít bình máu (<= 2) -> chạy về cổng Hậu doanh (4592, 8080) mua máu
  fakeBot.bag[0] = { uid: 'p1', def: 'potion-0-2', qty: 2 };
  sent.length = 0;
  enemyActors.length = 0;
  beh.update(12000);
  const moveMsg = sent.find(s => s.type === C2S.move);
  assert.ok(moveMsg, 'phải gửi lệnh di chuyển về cổng Hậu doanh');
  assert.deepEqual(moveMsg.msg, { x: 4592, y: 8080 });
});

test('Thưởng kết thúc Tống Kim cho bot: 200 vạn + 50M EXP & hệ số Top 1/3/5/10', () => {
  assert.equal(TK_POINTS.botBaseMoney, 2_000_000);
  assert.equal(TK_POINTS.botBaseExp, 50_000_000);
  assert.equal(tkBotRewardMultiplier(1, 100), 5);
  assert.equal(tkBotRewardMultiplier(2, 100), 3.5);
  assert.equal(tkBotRewardMultiplier(3, 100), 3.5);
  assert.equal(tkBotRewardMultiplier(4, 100), 3);
  assert.equal(tkBotRewardMultiplier(5, 100), 3);
  assert.equal(tkBotRewardMultiplier(6, 100), 2);
  assert.equal(tkBotRewardMultiplier(10, 100), 2);
  assert.equal(tkBotRewardMultiplier(11, 100), 1);
  assert.equal(tkBotRewardMultiplier(0, 100), 1);
  assert.equal(tkBotRewardMultiplier(1, 0), 1);
});

test('Đa map Tống Kim: cấu hình nhiều map, startMatch/register chuyển đúng battleMapId & vùng an toàn', async () => {
  const {
    TK_MAPS, applyTkMaps, isTkBattleMap, isInTkSafeCamp, tkHomeCampAt,
    TK_BATTLE_MAP_ID, TK_SIGNUP_MAP_ID, MAPS,
  } = await import('../packages/shared/src/index.js');
  const { tongKim } = await import('../apps/server/src/world/tongkim.js');

  const snapshotOriginal = structuredClone(TK_MAPS);
  try {
    applyTkMaps({
      version: 1,
      maps: {
        ...snapshotOriginal,
        '381': {
          id: 381,
          name: 'Thâm lâm (sơ cấp)',
          tong: {
            spawn: { x: 2000, y: 10000 },
            safeRadius: 800,
            gateExit: { x: 4000, y: 8000 },
            marshal: { x: 4200, y: 7800 },
            frontlines: [{ x: 8000, y: 6000 }],
            npcSpawns: [],
          },
          kim: {
            spawn: { x: 16000, y: 2000 },
            safeRadius: 800,
            gateExit: { x: 13000, y: 4000 },
            marshal: { x: 12800, y: 4200 },
            frontlines: [{ x: 9000, y: 6000 }],
            npcSpawns: [],
          },
        },
      },
    });

    assert.equal(isTkBattleMap(378), true);
    assert.equal(isTkBattleMap(381), true);
    assert.equal(tkHomeCampAt(381, 2000, 10000), 'tong');
    assert.equal(tkHomeCampAt(381, 16000, 2000), 'kim');
    assert.equal(isInTkSafeCamp(381, 8000, 6000), false);

    const mgr = tongKim;
    mgr.stopMatch();
    const bad = mgr.startMatch({ battleMapId: 999999 });
    assert.equal(bad.ok, false);

    const okStart = mgr.startMatch({ mode: 1, battleMapId: 381, signupSec: 20, durationSec: 300, allowSolo: true });
    assert.equal(okStart.ok, true);
    assert.equal(mgr.battleMapId, 381);
    assert.equal(mgr.snapshotFor().battleMapId, 381);

    const fakeSim: any = {
      charId: 'tk-multi-1',
      a: { name: 'Tester', faction: 'shaolin', level: 100 },
      progress: { prog: { level: 100 } },
      money: 50000,
    };
    const fakeWorld: any = {
      meta: MAPS[TK_SIGNUP_MAP_ID],
      hooks: { notify: () => {} },
    };
    const reg = mgr.handleAction(fakeWorld, fakeSim, { op: 'register', camp: 'tong' });
    assert.deepEqual(reg.transfer, { mapId: 381, x: 2000, y: 10000 });
    mgr.stopMatch();
    assert.equal(TK_BATTLE_MAP_ID, 378);
  } finally {
    applyTkMaps({ version: 1, maps: snapshotOriginal });
  }
});

test('TkMapStore & PortalStore.replaceTkPortals: lưu atomic, chống stale revision và giữ portal khác', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { MAPS, DEFAULT_MAP_PORTALS } = await import('../packages/shared/src/index.js');
  const { TkMapStore } = await import('../tools/map-manager/TkMapStore.js');
  const { PortalStore } = await import('../tools/map-manager/PortalStore.js');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-map-store-'));
  const tkFile = path.join(tmpDir, 'tk-maps.json');
  const portalFile = path.join(tmpDir, 'map-portals.json');
  try {
    const tkStore = new TkMapStore(tkFile, MAPS, () => true);
    const pStore = new PortalStore(portalFile, MAPS, DEFAULT_MAP_PORTALS, () => true);

    const init = await tkStore.read(381);
    assert.equal(init.configured, false);

    const saved = await tkStore.save(381, {
      id: 381,
      tong: { spawn: { x: 2000, y: 10000 }, safeRadius: 900, gateExit: { x: 4000, y: 8000 }, marshal: { x: 4100, y: 7900 }, frontlines: [], npcSpawns: [] },
      kim: { spawn: { x: 16000, y: 2000 }, safeRadius: 900, gateExit: { x: 13000, y: 4000 }, marshal: { x: 12900, y: 4100 }, frontlines: [], npcSpawns: [] },
    }, init.revision);
    assert.equal(saved.configured, true);

    await assert.rejects(() => tkStore.save(381, saved.config, init.revision), /đổi ở tab khác/);

    // Giữ nguyên portal khác khi replaceTkPortals
    const pInit = await pStore.read(381);
    await pStore.save(381, [{ id: 'custom-other', label: 'Khác', x: 1000, y: 1000, radius: 40, toMap: 323, toX: 1500, toY: 1500 }], pInit.revision);
    const replaced = await pStore.replaceTkPortals(381, [
      { id: 'tk-tong-out', label: 'Ra chiến trường (Tống)', x: 2400, y: 9600, radius: 64, toMap: 381, toX: 4000, toY: 8000 },
      { id: 'tk-tong-back', label: 'Về Hậu doanh (Tống)', x: 3200, y: 8800, radius: 64, toMap: 381, toX: 2000, toY: 10000 },
    ]);
    assert.equal(replaced.portals.some(p => p.id === 'custom-other'), true);
    assert.equal(replaced.portals.some(p => p.id === 'tk-tong-out'), true);
    assert.equal(replaced.portals.some(p => p.id === 'tk-tong-back'), true);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Chiến thuật Bot Tống Kim: chuẩn hóa kịch bản, tách 3 cánh đa-map và RunManager.setTkTactic', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  const { normalizeBotScenario, isoDistance } = await import('../packages/shared/src/index.js');
  const { buildTacticalLanes } = await import('../tools/bots/runner/TkTactics.js');
  const { RunManager } = await import('../tools/bots/RunManager.js');

  const legacy = normalizeBotScenario({ version: 1, activities: { tongkim: true } });
  assert.equal(legacy.tongkim?.tactic, 'charge');

  for (const tactic of ['charge', 'flank', 'tactical', 'defend', 'random'] as const) {
    const parsed = normalizeBotScenario({ version: 1, tongkim: { tactic } });
    assert.equal(parsed.tongkim?.tactic, tactic);
  }
  const invalid = normalizeBotScenario({ version: 1, tongkim: { tactic: 'unknown' } });
  assert.equal(invalid.tongkim?.tactic, 'charge');

  // Map ngoài 378 phải tách rõ 3 cánh (không còn bóp hẹp ±550px như cũ)
  for (const mapId of [329, 384, 868]) {
    const lanes = buildTacticalLanes(mapId, 'tong');
    assert.equal(lanes.length, 3);
    assert.ok(lanes[1].length >= 3 && lanes[2].length >= 3);
    const leftMid = lanes[1][1];
    const rightMid = lanes[2][1];
    assert.ok(isoDistance(leftMid.x, leftMid.y, rightMid.x, rightMid.y) >= 1200, `Map ${mapId} phải tách rõ cánh trái/phải`);
  }

  // RunManager.setTkTactic đổi nóng & chặn giá trị sai
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tk-tactic-mgr-'));
  try {
    const mgr = new RunManager(path.resolve('tools/bots'), tmpDir);
    mgr.setTkTactic('tactical', 'all');
    assert.equal(mgr.status().tkTactics.all, 'tactical');
    mgr.setTkTactic('defend', 'kim');
    assert.equal(mgr.status().tkTactics.kim, 'defend');
    mgr.setTkTactic('default', 'all');
    assert.equal(mgr.status().tkTactics.all, null);
    assert.equal(mgr.status().tkTactics.kim, null);
    assert.throws(() => mgr.setTkTactic('bad-tactic', 'all'), /không hợp lệ/);
    assert.throws(() => mgr.setTkTactic('flank', 'neutral'), /không hợp lệ/);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Chiến thuật Bot Tống Kim: tactical (cứu Soái, kiting, khắc hệ), defend, đổi nóng & không vượt 30 msg/s', async () => {
  const { DEFAULT_BOT_SCENARIO, TK_MAP_LAYOUT, C2S, isoDistance } = await import('../packages/shared/src/index.js');
  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');
  const { TkCampDirector } = await import('../tools/bots/runner/TkTactics.js');

  const director = new TkCampDirector();
  const sent: { type: string; payload: any; at: number }[] = [];
  let castCalls: { skill: number; targetId?: string }[] = [];
  const rawActors = new Map<string, any>();
  let actorList: any[] = [];
  const meState: any = {
    id: 'bot-t1',
    x: 9000,
    y: 5500,
    hp: 4000,
    maxHp: 4000,
    mp: 1500,
    maxMp: 1500,
    battleCamp: 'tong',
    faction: 'tangmen',
    series: 'moc',
    states: [],
    mounted: false,
    jumpMs: 0,
    anim: 'stand',
  };
  let rngState = 12345;
  const fakeBot: any = {
    name: 'bot-t1',
    mapId: 378,
    bag: [{ uid: 'p1', def: 'potion-0-5', qty: 10 }],
    money: 100000,
    levels: { 339: 20 },
    stats: { faction: 'tangmen', series: 'moc' },
    autoSettings: { autoBuff: false },
    tkState: { phase: 'fighting', mode: 1, battleMapId: 378, tongCount: 10, kimCount: 10, me: { camp: 'tong', inCamp: false, gateWaitSec: 0 } },
    room: { state: { actors: rawActors } },
    host: { drops: () => [], aura: () => {} },
    me: () => meState,
    actors: () => actorList,
    rand: () => { rngState = (rngState * 1664525 + 1013904223) >>> 0; return rngState / 0x100000000; },
    send: (type: string, payload: any) => { sent.push({ type, payload, at: now }); },
    prepareCombat: () => false,
    attacks: () => [339],
    range: () => 420,
    ready: () => true,
    usable: () => true,
    levelOf: () => 20,
    cast: (skill: number, targetId?: string) => { castCalls.push({ skill, targetId }); sent.push({ type: C2S.cast, payload: { skill, targetId }, at: now }); },
    reviveIfDead: () => {},
  };

  let now = 10_000;
  const sc = { ...DEFAULT_BOT_SCENARIO, tongkim: { ...DEFAULT_BOT_SCENARIO.tongkim!, tactic: 'tactical' as const } };
  const beh = new TongKimBehavior(fakeBot, sc, 6, director);

  // 1. Ưu tiên mục tiêu bị khắc hệ (Mộc khắc Thổ) & máu thấp thay vì chỉ gần hơn 40px
  rawActors.set('enemy-kim', { battleCamp: 'kim', series: 'kim', maxHp: 4000 });
  rawActors.set('enemy-tho', { battleCamp: 'kim', series: 'tho', maxHp: 4000 });
  actorList = [
    { id: 'enemy-kim', isSelf: false, x: 9260, y: 5500, state: { hp: 3800, maxHp: 4000, kind: 'player', boss: 0 } },
    { id: 'enemy-tho', isSelf: false, x: 9300, y: 5500, state: { hp: 1200, maxHp: 4000, kind: 'player', boss: 0 } },
  ];
  beh.update(now);
  assert.equal(castCalls.at(-1)?.targetId, 'enemy-tho', 'Chiến thuật tổng hợp phải ưu tiên mục tiêu khắc hệ + máu thấp');

  // 2. Kiting khi địch áp sát phái tầm xa (< 185px)
  const movesBeforeKite = sent.filter(s => s.type === C2S.move).length;
  actorList = [
    { id: 'enemy-tho', isSelf: false, x: 9080, y: 5500, state: { hp: 3000, maxHp: 4000, kind: 'player', boss: 0 } },
  ];
  now += 1500;
  beh.update(now);
  const kiteMoves = sent.filter(s => s.type === C2S.move);
  assert.equal(kiteMoves.length, movesBeforeKite + 1, 'Phái tầm xa phải lùi kiting khi địch áp sát');
  assert.ok(kiteMoves.at(-1)!.payload.x < meState.x, 'Kiting phải lùi ra xa địch ở bên phải');

  // 3. Phản ứng cứu Nguyên Soái nhà khi có cảnh báo trên TkCampDirector
  actorList = [];
  meState.x = 6800;
  meState.y = 6900;
  now += 1500;
  director.reportMarshalThreat(378, 'tong', { x: TK_MAP_LAYOUT.tong.marshal.x, y: TK_MAP_LAYOUT.tong.marshal.y, hpRatio: 0.7, enemyCount: 2, at: now });
  beh.update(now);
  const rescueMove = sent.filter(s => s.type === C2S.move).at(-1)!.payload;
  assert.ok(isoDistance(rescueMove.x, rescueMove.y, TK_MAP_LAYOUT.tong.marshal.x, TK_MAP_LAYOUT.tong.marshal.y) < 400, 'Phải chạy về cứu Nguyên Soái nhà khi có cảnh báo');

  // 4. Đổi nóng sang `defend` -> giữ quanh sân nhà, không lao sang Nguyên Soái Kim
  director.clear();
  beh.setLiveTactic('defend', 'tong');
  assert.equal(beh.effectiveTactic(378, 'tong'), 'defend');
  now += 1500;
  beh.update(now);
  const defendMove = sent.filter(s => s.type === C2S.move).at(-1)!.payload;
  assert.ok(
    isoDistance(defendMove.x, defendMove.y, TK_MAP_LAYOUT.tong.marshal.x, TK_MAP_LAYOUT.tong.marshal.y) <
    isoDistance(defendMove.x, defendMove.y, TK_MAP_LAYOUT.kim.marshal.x, TK_MAP_LAYOUT.kim.marshal.y),
    'Chế độ defend phải giữ vị trí phía sân nhà',
  );

  // 5. Đổi nóng sang `flank` & mô phỏng 5 giây (nhịp 150ms) kiểm chứng không vượt ngưỡng 30 msg/s
  beh.setLiveTactic('flank');
  const startCount = sent.length;
  const startAt = now;
  for (let i = 0; i < 34; i++) {
    now += 150;
    beh.update(now);
  }
  const perSec = (sent.length - startCount) / ((now - startAt) / 1000);
  assert.ok(perSec < 15, `Nhịp gửi lệnh phải thấp hơn rất nhiều so với 30 msg/s (thực tế: ${perSec.toFixed(2)}/s)`);
});

test('Chiến lược Nguyên Soái (thủ Soái vs 70% tổng lực diệt Soái bỏ qua bot) & Binh Sĩ Hiệu Phù 70/20/10', async () => {
  const { DEFAULT_BOT_SCENARIO, TK_MAP_LAYOUT, C2S, isoDistance, rollClarionNpcRole } = await import('../packages/shared/src/index.js');
  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');
  const { TkCampDirector, resolveMarshalEndgame } = await import('../tools/bots/runner/TkTactics.js');

  // 1. Kiểm chứng tỉ lệ Binh Sĩ Hiệu Phù: 70% Binh sĩ / 20% Hiệu úy / 10% Thống lĩnh
  const counts = { soldier: 0, captain: 0, commander: 0 };
  for (let i = 0; i < 100; i++) {
    counts[rollClarionNpcRole(() => (i + 0.5) / 100)]++;
  }
  assert.equal(counts.soldier, 70);
  assert.equal(counts.captain, 20);
  assert.equal(counts.commander, 10);

  // 2. Kiểm chứng phân bổ 70% quân tổng lực khi phe mình mất Nguyên Soái
  const lostState = { mode: 1, marshalSpawned: true, tongMarshalAlive: false, kimMarshalAlive: true };
  let rushers = 0;
  for (let i = 0; i < 20; i++) {
    if (resolveMarshalEndgame(lostState, 'tong', i) === 'rush_enemy_marshal') rushers++;
    assert.equal(resolveMarshalEndgame(lostState, 'kim', i), 'defend_marshal');
  }
  assert.equal(rushers, 14, 'Phải có đúng 70% (14/20) bot phe mất Soái lao thẳng diệt Soái địch');

  // 3. Kiểm chứng bot thuộc 70% phe mất Soái bỏ qua bot địch dọc đường, lao thẳng tới Nguyên Soái Kim & đánh Nguyên Soái khi vào tầm
  const director = new TkCampDirector();
  const moves: { x: number; y: number }[] = [];
  const casts: string[] = [];
  const rawActors = new Map<string, any>();
  let actorList: any[] = [];
  const meState: any = {
    id: 'bot-rush',
    x: 9000,
    y: 5500,
    hp: 4000,
    maxHp: 4000,
    mp: 1500,
    maxMp: 1500,
    battleCamp: 'tong',
    faction: 'shaolin',
    series: 'kim',
    states: [],
    mounted: false,
    jumpMs: 0,
    anim: 'stand',
  };
  let now = 20_000;
  const fakeBot: any = {
    name: 'bot-rush',
    mapId: 378,
    bag: [{ uid: 'p1', def: 'potion-0-5', qty: 10 }],
    money: 100000,
    levels: { 318: 20 },
    stats: { faction: 'shaolin', series: 'kim' },
    autoSettings: { autoBuff: false },
    tkState: { phase: 'fighting', mode: 1, battleMapId: 378, marshalSpawned: true, tongMarshalAlive: false, kimMarshalAlive: true, tongCount: 10, kimCount: 10, me: { camp: 'tong', inCamp: false, gateWaitSec: 0 } },
    room: { state: { actors: rawActors } },
    host: { drops: () => [], aura: () => {} },
    me: () => meState,
    actors: () => actorList,
    rand: () => 0.5,
    send: (type: string, payload: any) => { if (type === C2S.move) moves.push(payload); },
    prepareCombat: () => false,
    attacks: () => [318],
    range: () => 180,
    ready: () => true,
    usable: () => true,
    levelOf: () => 20,
    cast: (_skill: number, targetId?: string) => { if (targetId) casts.push(targetId); },
    reviveIfDead: () => {},
  };

  const sc = { ...DEFAULT_BOT_SCENARIO, tongkim: { ...DEFAULT_BOT_SCENARIO.tongkim!, tactic: 'tactical' as const } };
  const rushBeh = new TongKimBehavior(fakeBot, sc, 0, director); // index 0 -> thuộc nhóm 70%

  // 3a. Trước khi xuất kích: còn đồng đội nhóm 70% ở xa -> bot phải chạy về tập trung tại điểm Nguyên Soái phe mình vừa chết
  director.reportBot(378, 'tong', {
    id: 'bot-rush-2',
    x: 8500,
    y: 5900,
    lane: 0,
    role: 'vanguard',
    exitedAt: 1000,
    seenAt: now,
    isRusher: true,
  });
  rawActors.set('kim-bot-1', { battleCamp: 'kim', series: 'moc', maxHp: 4000 });
  actorList = [{ id: 'kim-bot-1', isSelf: false, x: 9120, y: 5500, state: { hp: 3000, maxHp: 4000, kind: 'player', boss: 0 } }];
  rushBeh.update(now);
  assert.equal(casts.length, 0, 'Đang tập kết về điểm Nguyên Soái phe mình phải bỏ qua bot phe địch');
  assert.ok(moves.length >= 1);
  assert.ok(
    isoDistance(moves.at(-1)!.x, moves.at(-1)!.y, TK_MAP_LAYOUT.tong.marshal.x, TK_MAP_LAYOUT.tong.marshal.y) < 350,
    'Chưa đủ 100% quân -> phải tập trung về điểm Nguyên Soái phe mình trước',
  );

  // 3b. Khi đủ 100% nhóm 70% có mặt tại điểm Nguyên Soái phe mình -> kích hoạt Wave 1 (cánh Trái lane=1)
  meState.x = TK_MAP_LAYOUT.tong.marshal.x + 60;
  meState.y = TK_MAP_LAYOUT.tong.marshal.y;
  now += 1500;
  director.reportBot(378, 'tong', {
    id: 'bot-rush-2',
    x: TK_MAP_LAYOUT.tong.marshal.x - 80,
    y: TK_MAP_LAYOUT.tong.marshal.y,
    lane: 0,
    role: 'vanguard',
    exitedAt: 1000,
    seenAt: now,
    isRusher: true,
    siegeRole: 'slayer',
  });
  // `bot-rush` (Thiếu Lâm, index 0) là `breacher` (Mở đường) -> chủ động đánh bot địch chắn đường
  actorList = [{ id: 'kim-bot-1', isSelf: false, x: meState.x + 120, y: meState.y, state: { hp: 3000, maxHp: 4000, kind: 'player', boss: 0 } }];
  rushBeh.update(now);
  assert.equal(casts.at(-1), 'kim-bot-1', 'Tiểu đội Mở đường (breacher) phải chủ động đánh bot địch chắn đường');
  const wave1 = director.getSiegeWave(378, 'tong', TK_MAP_LAYOUT.kim.marshal, now);
  assert.equal(wave1.waveNumber, 1);
  assert.equal(wave1.lane, 1, 'Đợt 1 phải bọc sườn theo Cánh Trái (lane 1)');
  assert.equal(wave1.leaderId, 'bot-rush', 'Đội trưởng phải ưu tiên breacher (Thiếu Lâm)');

  // 3c. Tiểu đội Sát thủ Soái (`slayer`, Đường Môn, index 3): bỏ qua bot địch ở xa 300px, bám Đội trưởng nếu chạy vọt lên trước, và đánh Nguyên Soái khi vào tầm
  const slayerMoves: { x: number; y: number }[] = [];
  const slayerCasts: string[] = [];
  const slayerMe: any = { ...meState, id: 'bot-slayer', faction: 'tangmen', x: 9800, y: 5000 };
  const slayerBot: any = {
    ...fakeBot,
    name: 'bot-slayer',
    stats: { faction: 'tangmen', series: 'moc' },
    me: () => slayerMe,
    actors: () => [
      { id: 'kim-bot-far', isSelf: false, x: slayerMe.x + 300, y: slayerMe.y, state: { hp: 3000, maxHp: 4000, kind: 'player', boss: 0 } },
    ],
    send: (type: string, payload: any) => { if (type === C2S.move) slayerMoves.push(payload); },
    cast: (_skill: number, targetId?: string) => { if (targetId) slayerCasts.push(targetId); },
  };
  rawActors.set('kim-bot-far', { battleCamp: 'kim', series: 'moc', maxHp: 4000 });
  const slayerBeh = new TongKimBehavior(slayerBot, sc, 3, director);
  slayerBeh.update(now);
  assert.equal(slayerCasts.length, 0, 'Sát thủ Soái (slayer) phải bỏ qua bot địch ở xa 300px');
  assert.ok(
    slayerMoves.length >= 1 && isoDistance(slayerMoves.at(-1)!.x, slayerMoves.at(-1)!.y, meState.x, meState.y) < 300,
    'Sát thủ Soái chạy vọt quá xa Đội trưởng phải quay về bám Đội trưởng',
  );

  // Khi Nguyên Soái Kim ở trong tầm -> phải tấn công Nguyên Soái Kim ngay
  rawActors.set('kim-marshal', { battleCamp: 'kim', series: 'hoa', maxHp: 5_000_000 });
  slayerBot.actors = () => [
    { id: 'kim-bot-far', isSelf: false, x: slayerMe.x + 300, y: slayerMe.y, state: { hp: 3000, maxHp: 4000, kind: 'player', boss: 0 } },
    { id: 'kim-marshal', isSelf: false, x: slayerMe.x + 200, y: slayerMe.y, state: { hp: 4_000_000, maxHp: 5_000_000, kind: 'monster', boss: 2 } },
  ];
  now += 1000;
  slayerBeh.update(now);
  assert.equal(slayerCasts.at(-1), 'kim-marshal', 'Phải đánh Nguyên Soái địch ngay khi vào tầm');

  // 3d. Khi Wave 1 bị đánh tan sau >= 12s (các bot hồi sinh về sân nhà) -> tự gom Wave 2 và đổi sang Cánh Phải (lane 2)
  now += 13_000;
  director.reportBot(378, 'tong', { id: 'bot-rush', x: TK_MAP_LAYOUT.tong.marshal.x, y: TK_MAP_LAYOUT.tong.marshal.y, lane: 1, role: 'vanguard', exitedAt: now, seenAt: now, isRusher: true, siegeRole: 'breacher' });
  director.reportBot(378, 'tong', { id: 'bot-slayer', x: TK_MAP_LAYOUT.tong.marshal.x + 50, y: TK_MAP_LAYOUT.tong.marshal.y, lane: 1, role: 'vanguard', exitedAt: now, seenAt: now, isRusher: true, siegeRole: 'slayer' });
  assert.equal(director.resolveMarshalEndgame(378, 'tong', fakeBot.tkState, 0, TK_MAP_LAYOUT.tong.marshal, now), 'rally_for_rush', 'Wave 1 tan vỡ -> phải chuyển về gom Wave 2');
  assert.equal(director.resolveMarshalEndgame(378, 'tong', fakeBot.tkState, 0, TK_MAP_LAYOUT.tong.marshal, now + 500), 'rush_enemy_marshal', 'Đủ 100% ở điểm tập kết -> xuất kích Wave 2');
  const wave2 = director.getSiegeWave(378, 'tong', TK_MAP_LAYOUT.kim.marshal, now + 500);
  assert.equal(wave2.waveNumber, 2);
  assert.equal(wave2.lane, 2, 'Đợt 2 phải đổi sang bọc sườn Cánh Phải (lane 2)');

  // 4. Phe đang thắng (Tống còn Soái, Kim mất Soái): dưới 30s CHƯA co về thủ Soái, sau 30s MỚI dồn về bảo vệ Nguyên Soái nhà
  director.clear();
  fakeBot.tkState.matchId = 99;
  fakeBot.tkState.tongMarshalAlive = true;
  fakeBot.tkState.kimMarshalAlive = false;
  meState.x = 9000;
  meState.y = 5500;
  actorList = [];
  now += 2000;
  assert.equal(
    director.resolveMarshalEndgame(378, 'tong', fakeBot.tkState, 0, TK_MAP_LAYOUT.tong.marshal, now),
    'none',
    'Ngay khi vừa hạ Soái địch (0s) chưa co về thủ Soái',
  );
  assert.equal(
    director.resolveMarshalEndgame(378, 'tong', fakeBot.tkState, 0, TK_MAP_LAYOUT.tong.marshal, now + 29_000),
    'none',
    'Ở 29s (< 30s) vẫn chưa co về thủ Soái',
  );
  now += 30_500;
  assert.equal(
    director.resolveMarshalEndgame(378, 'tong', fakeBot.tkState, 0, TK_MAP_LAYOUT.tong.marshal, now),
    'defend_marshal',
    'Sau 30s phe đang thắng phải chuyển sang bảo vệ Nguyên Soái nhà',
  );
  rushBeh.update(now);
  assert.ok(
    isoDistance(moves.at(-1)!.x, moves.at(-1)!.y, TK_MAP_LAYOUT.tong.marshal.x, TK_MAP_LAYOUT.tong.marshal.y) < 450,
    'Sau 30s phe còn Nguyên Soái phải dồn về bảo vệ Nguyên Soái phe mình',
  );
});

test('Chế độ Tàng hình kiểm thử (devStealth): ẩn với quái/boss/bot/người chơi khác và bật/tắt qua Dialog `', async () => {
  const { attackable, isHidden } = await import('../apps/server/src/world/targeting.js');
  const { DEFAULT_BOT_SCENARIO } = await import('../packages/shared/src/index.js');
  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');

  const tester = new Actor();
  tester.id = 'tester-1';
  tester.name = 'Tester';
  tester.kind = 'player';
  tester.level = 120;
  tester.hp = 5000;
  tester.maxHp = 5000;
  tester.battleCamp = 'tong';
  tester.pk = 1;
  const testerSim = makeSim(tester.id, 'player', tester, 'kim', 120);
  testerSim.charId = 'char-tester-stealth';

  const boss = new Actor();
  boss.id = 'boss-1';
  boss.name = 'Boss';
  boss.kind = 'monster';
  boss.level = 100;
  boss.boss = 2;
  boss.hp = 100000;
  boss.maxHp = 100000;
  boss.battleCamp = 'kim';
  const bossSim = makeSim(boss.id, 'monster', boss, 'hoa', 120);

  const enemyPlayer = new Actor();
  enemyPlayer.id = 'enemy-p';
  enemyPlayer.name = 'Dich';
  enemyPlayer.kind = 'player';
  enemyPlayer.level = 120;
  enemyPlayer.hp = 5000;
  enemyPlayer.maxHp = 5000;
  enemyPlayer.battleCamp = 'kim';
  enemyPlayer.pk = 1;
  const enemySim = makeSim(enemyPlayer.id, 'player', enemyPlayer, 'moc', 120);

  const fakeWorld = {
    now: Date.now(),
    meta: MAPS[TK_BATTLE_MAP_ID],
    hooks: { announce: () => {}, notify: () => {}, log: () => {}, transfer: () => {} },
  };

  // Trước khi bật -> có thể bị đánh
  assert.equal(isHidden(testerSim), false);
  assert.equal(attackable(fakeWorld as never, bossSim, testerSim), true);
  assert.equal(attackable(fakeWorld as never, enemySim, testerSim), true);

  // Bật devStealth -> ẩn hoàn toàn với boss, quái, người chơi khác và bot
  tongKim.handleAction(fakeWorld as never, testerSim, { op: 'devStealth' });
  assert.equal(testerSim.a.stealth, true);
  assert.equal(isHidden(testerSim), true);
  assert.equal(tongKim.snapshotFor(testerSim.charId, Date.now()).me?.stealth, true);
  assert.equal(attackable(fakeWorld as never, bossSim, testerSim), false);
  assert.equal(attackable(fakeWorld as never, enemySim, testerSim), false);

  // Bot Tống Kim không target người chơi đang stealth
  const casts: string[] = [];
  const rawActors = new Map<string, any>([['tester-1', { battleCamp: 'tong', stealth: true, maxHp: 5000 }]]);
  const fakeBot: any = {
    name: 'kim-bot',
    mapId: 378,
    bag: [{ uid: 'p1', def: 'potion-0-5', qty: 10 }],
    money: 50000,
    levels: { 318: 20 },
    stats: { faction: 'shaolin', series: 'kim' },
    autoSettings: { autoBuff: false },
    tkState: { phase: 'fighting', mode: 1, battleMapId: 378, tongCount: 5, kimCount: 5, me: { camp: 'kim', inCamp: false, gateWaitSec: 0 } },
    room: { state: { actors: rawActors } },
    host: { drops: () => [], aura: () => {} },
    me: () => ({ id: 'kim-bot', x: 9000, y: 5500, hp: 4000, maxHp: 4000, mp: 1000, maxMp: 1000, battleCamp: 'kim', states: [] }),
    actors: () => [{ id: 'tester-1', isSelf: false, x: 9100, y: 5500, state: { hp: 5000, maxHp: 5000, kind: 'player', boss: 0, stealth: true } }],
    rand: () => 0.5,
    send: () => {},
    prepareCombat: () => false,
    attacks: () => [318],
    range: () => 200,
    ready: () => true,
    usable: () => true,
    levelOf: () => 20,
    cast: (_s: number, targetId?: string) => { if (targetId) casts.push(targetId); },
    reviveIfDead: () => {},
  };
  const beh = new TongKimBehavior(fakeBot, DEFAULT_BOT_SCENARIO, 0);
  beh.update(10_000);
  assert.equal(casts.length, 0, 'Bot không được phát hiện hoặc tấn công người chơi đang bật Tàng hình');

  // Tắt lại -> trở về bình thường
  tongKim.handleAction(fakeWorld as never, testerSim, { op: 'devStealth' });
  assert.equal(testerSim.a.stealth, false);
  assert.equal(isHidden(testerSim), false);
});

test('Nguyên Soái Tống Kim quay về home (returning) không reset đầy máu; NPC khác vẫn reset bình thường', async () => {
  const { updateMonster } = await import('../apps/server/src/world/ai/monster.js');

  const makeNpc = (id: string, tkRole: 'marshal' | 'soldier', maxHp: number, curHp: number) => {
    const a = new Actor();
    a.id = id;
    a.kind = 'monster';
    a.x = 5760;
    a.y = 7504;
    a.hp = curHp;
    a.maxHp = maxHp;
    a.battleCamp = 'tong';
    const sim = makeSim(id, 'monster', a, 'hoa', 160);
    sim.hp = curHp;
    sim.home = { x: 5760, y: 7504 };
    sim.tkCamp = 'tong';
    sim.tkRole = tkRole;
    sim.returning = true;
    sim.path = [];
    sim.combat = { bag: {} } as never;
    sim.def = {
      id: 9006, name: id, sprite: 'enemy004', level: 100, element: 'hoa',
      hp: maxHp, damage: [100, 200], resist: 0, speed: 160, vision: 800, leash: 1000,
      attackCooldown: 1, boundedHome: tkRole === 'marshal',
    };
    return sim;
  };

  const w = { now: 1000, sims: new Map(), events: [], meta: MAPS[TK_BATTLE_MAP_ID] } as never;

  const marshal = makeNpc('tong-marshal', 'marshal', 5_000_000, 1_234_567);
  updateMonster(w, marshal, 0.05);
  assert.equal(marshal.returning, false);
  assert.equal(marshal.hp, 1_234_567, 'Nguyên Soái không được reset đầy HP khi kết thúc returning');
  assert.equal(marshal.a.hp, 1_234_567);

  const soldier = makeNpc('tong-soldier', 'soldier', 36_000, 10_000);
  updateMonster(w, soldier, 0.05);
  assert.equal(soldier.returning, false);
  assert.equal(soldier.hp, 36_000, 'NPC khác vẫn reset đầy HP khi kết thúc returning');
});

test('5 Lệnh Bẫy Ngũ Hành cấp 20 (khắc hệ lớn trong Tống Kim) & cấu hình thưởng 50× Phi Tốc + ngẫu nhiên cho bot', async () => {
  const { ITEMS, TK_BOT_REWARD_DEFAULT_ITEM, TK_BOT_REWARD_POOL, TK_BOT_REWARD_QTY, getSkill, resolveHit } = await import('@vltk/shared');

  const traps: [string, number][] = [
    ['tk-trap-phys', 343],
    ['tk-trap-poison', 303],
    ['tk-trap-cold', 345],
    ['tk-trap-fire', 347],
    ['tk-trap-light', 349],
  ];
  for (const [id, skillId] of traps) {
    const def = ITEMS[id];
    assert.ok(def && def.tkItem?.kind === 'trap', `${id} phải là vật phẩm bẫy`);
    assert.equal(def.tkItem.skillId, skillId);
    assert.equal(def.tkItem.level, 20);
    assert.ok(getSkill(skillId), `Skill bẫy #${skillId} phải tồn tại`);
  }

  // Kiểm chứng sát thương bẫy cấp 20 (vd Lôi Kích Thuật 349 hệ Thổ) khắc hệ (đánh Thủy) lớn hơn rõ rệt so với không khắc (đánh Hỏa)
  const lightTrap = getSkill(349)!;
  const attacker = { series: 'kim' as const, level: 100, ar: 9999, bag: {} };
  const makeTarget = (series: 'thuy' | 'hoa') => ({
    series,
    level: 100,
    def: 0,
    resist: { phys: 50, cold: 50, fire: 50, light: 50, poison: 50 },
    resistMax: { phys: 75, cold: 75, fire: 75, light: 75, poison: 75 },
    bag: {},
  });
  const parts = { phys: [0, 0] as [number, number], cold: [0, 0] as [number, number], fire: [0, 0] as [number, number], light: [1500, 1500] as [number, number], poison: null };
  const counterDmg = resolveHit(parts, { attacker, target: makeTarget('thuy'), skill: lightTrap, level: 20, targetLife: 10000, pvp: true } as never, () => 0.5).dmg;
  const normalDmg = resolveHit(parts, { attacker, target: makeTarget('hoa'), skill: lightTrap, level: 20, targetLife: 10000, pvp: true } as never, () => 0.5).dmg;
  assert.ok(counterDmg > normalDmg * 2, `Sát thương bẫy khắc hệ (${counterDmg}) phải lớn hơn gấp >2× không khắc (${normalDmg})`);

  // Xuyên Tâm Thích (#343/#344) có hiệu ứng co giật 100% và sát thương vật lý cấp 20 = 1600
  const physTrap = getSkill(343)!;
  const physExplode = getSkill(344)!;
  assert.equal(physTrap.doHurt, 100);
  assert.equal(physExplode.doHurt, 100);

  // Kiểm chứng thưởng vật phẩm bot kết thúc trận
  assert.equal(TK_BOT_REWARD_QTY, 50);
  assert.equal(TK_BOT_REWARD_DEFAULT_ITEM, 'tk-pill-190');
  assert.ok(TK_BOT_REWARD_POOL.includes('tk-wardrum'));
  assert.ok(TK_BOT_REWARD_POOL.includes('tk-pill-178'));
  assert.ok(TK_BOT_REWARD_POOL.includes('tk-pill-180'));
  assert.ok(TK_BOT_REWARD_POOL.includes('tk-pill-179'));
  assert.ok(TK_BOT_REWARD_POOL.includes('tk-trap-light'));
});

test('Binh Sĩ Hiệu Phù triệu hồi không tái sinh khi chết (vẫn cộng điểm/rơi đồ); NPC thường vẫn tái sinh', async () => {
  const { ITEMS } = await import('@vltk/shared');
  const { tongKim } = await import('../apps/server/src/world/tongkim.js');

  tongKim.stopMatch();
  const now = Date.now();
  const prevMatch = tongKim.startMatch({ mode: 1, battleMapId: TK_BATTLE_MAP_ID, signupSec: 1, durationSec: 600, marshalDelaySec: 300, endSec: 5, allowSolo: true });
  assert.equal(prevMatch.ok, true);

  const added: any[] = [];
  const drops: any[] = [];
  const sims = new Map<string, any>();
  const fakeWorld: any = {
    now: now + 2_000,
    nextMonsterId: 1,
    meta: MAPS[TK_BATTLE_MAP_ID],
    grid: null,
    sims,
    ground: new Map(),
    groundSync: new Map(),
    add(sim: any) { sims.set(sim.id, sim); added.push(sim); },
    removeSim(id: string) { sims.delete(id); },
    hooks: {
      notify() {},
      log() {},
      announce() {},
      progress() {},
      inventory() {},
      transfer() {},
      dropAdded(d: any) { drops.push(d); },
    },
  };

  try {
    // Đăng ký 1 Tống (dùng Hiệu Phù) và 1 Kim (giết lính triệu hồi)
    const makePlayer = (id: string, camp: 'tong' | 'kim') => {
      const a = new Actor();
      a.id = id;
      a.kind = 'player';
      a.name = id;
      a.level = 100;
      a.x = 7000;
      a.y = 6000;
      a.battleCamp = camp;
      const sim = makeSim(id, 'player', a, 'kim', 200);
      sim.charId = `char-${id}`;
      sim.money = 100_000;
      sim.bag = Array(60).fill(null);
      return sim;
    };
    const tongP = makePlayer('p-tong-clarion', 'tong');
    const kimP = makePlayer('p-kim-clarion', 'kim');
    tongKim.registerPlayer(tongP, 'tong');
    tongKim.registerPlayer(kimP, 'kim');
    sims.set(tongP.id, tongP);
    sims.set(kimP.id, kimP);

    // Chuyển sang pha fighting (signupSec tối thiểu 10s)
    const fightAt = now + 15_000;
    fakeWorld.now = fightAt;
    tongKim.tickBattleWorld(fakeWorld, fightAt);
    const beforeCount = added.length;

    // Dùng Binh Sĩ Hiệu Phù -> gọi 2 lính có tkSummoned = true
    const clarionDef = ITEMS['tk-clarion'];
    assert.ok(clarionDef);
    const ok = tongKim.useBattleItem(fakeWorld, tongP, clarionDef);
    assert.equal(ok, true);
    const summoned = added.slice(beforeCount);
    assert.equal(summoned.length, 2);
    for (const s of summoned) {
      assert.equal(s.tkSummoned, true, 'Lính gọi từ Binh Sĩ Hiệu Phù phải có tkSummoned = true');
    }

    // Kim hạ 2 lính triệu hồi -> vẫn được cộng điểm, nhưng không đưa vào hàng chờ respawn
    const respawnsBefore = ((tongKim as any).npcRespawns as any[]).length;
    for (const s of summoned) {
      const handled = tongKim.onTkKill(fakeWorld, s, kimP);
      assert.equal(handled, true);
    }
    const respawnsAfterSummonKill = ((tongKim as any).npcRespawns as any[]).length;
    assert.equal(respawnsAfterSummonKill, respawnsBefore, 'Lính triệu hồi từ Hiệu Phù chết không được đưa vào npcRespawns');
    const kimEntry = (tongKim as any).entries.get(kimP.charId);
    assert.ok(kimEntry.points > 0, 'Hạ lính triệu hồi vẫn phải cộng điểm tích lũy bình thường');

    // Kiểm chứng NPC chiến trường bình thường chết vẫn được xếp hàng tái sinh
    const normalNpc = added.find(s => s.kind === 'monster' && s.tkCamp === 'tong' && !s.tkSummoned && s.tkRole === 'soldier');
    assert.ok(normalNpc, 'Phải có lính thường trực phe Tống');
    tongKim.onTkKill(fakeWorld, normalNpc, kimP);
    assert.equal(((tongKim as any).npcRespawns as any[]).length, respawnsBefore + 1, 'NPC thường trực chết vẫn phải tái sinh bình thường');
  } finally {
    tongKim.stopMatch(fakeWorld);
  }
});

test('Đứng quá 20s trong điểm tập trung Hậu doanh tự động đẩy ra ngoài điểm đáp (không đá về báo danh)', async () => {
  const { TK_CAMP_KICK_SEC, TK_MAP_LAYOUT, isInTkSafeCamp } = await import('@vltk/shared');
  const { tongKim } = await import('../apps/server/src/world/tongkim.js');

  assert.equal(TK_CAMP_KICK_SEC, 20);

  tongKim.stopMatch();
  const now = Date.now();
  const started = tongKim.startMatch({ mode: 1, battleMapId: TK_BATTLE_MAP_ID, signupSec: 1, durationSec: 600, marshalDelaySec: 300, endSec: 5, allowSolo: true });
  assert.equal(started.ok, true);

  const transfers: any[] = [];
  const notifies: string[] = [];
  const sims = new Map<string, any>();
  const fakeWorld: any = {
    now: now + 2_000,
    nextMonsterId: 1,
    meta: MAPS[TK_BATTLE_MAP_ID],
    grid: null,
    sims,
    add(sim: any) { sims.set(sim.id, sim); },
    removeSim(id: string) { sims.delete(id); },
    hooks: {
      notify(_sim: any, msg: string) { notifies.push(msg); },
      log() {},
      announce() {},
      progress() {},
      inventory() {},
      transfer(sim: any, mapId: number, x: number, y: number) { transfers.push({ id: sim.id, mapId, x, y }); },
    },
  };

  try {
    const a = new Actor();
    a.id = 'p-camp-idle';
    a.kind = 'player';
    a.name = 'CampIdle';
    a.level = 100;
    a.x = TK_MAP_LAYOUT.tong.spawn.x;
    a.y = TK_MAP_LAYOUT.tong.spawn.y;
    a.battleCamp = 'tong';
    const sim = makeSim(a.id, 'player', a, 'kim', 200);
    sim.charId = 'char-camp-idle';
    sim.money = 100_000;
    tongKim.registerPlayer(sim, 'tong');
    sims.set(sim.id, sim);

    // Khai chiến tại t = now + 15_000 (signupSec tối thiểu 10s)
    const fightAt = now + 15_000;
    fakeWorld.now = fightAt;
    tongKim.tickBattleWorld(fakeWorld, fightAt);
    // Sau 19s: vẫn ở trong doanh trại
    fakeWorld.now = fightAt + 19_000;
    tongKim.tickBattleWorld(fakeWorld, fightAt + 19_000);
    assert.equal(isInTkSafeCamp(TK_BATTLE_MAP_ID, sim.a.x, sim.a.y), true, 'Chưa đủ 20s vẫn ở trong doanh trại');
    assert.equal(transfers.length, 0);

    // Đủ 20s (t = fightAt + 20_000): tự động đẩy ra ngoài cổng, không transfer về 323
    fakeWorld.now = fightAt + 20_000;
    tongKim.tickBattleWorld(fakeWorld, fightAt + 20_000);
    assert.equal(transfers.length, 0, 'Không được chuyển về điểm báo danh 323');
    assert.equal(isInTkSafeCamp(TK_BATTLE_MAP_ID, sim.a.x, sim.a.y), false, 'Phải được đẩy ra khỏi vùng an toàn Hậu doanh');
    assert.equal(sim.a.pk, 1);
    assert.equal((tongKim as any).entries.get(sim.charId).inCamp, false);
    assert.ok(notifies.some(m => m.includes('20 giây') && m.includes('ngoài cổng')));
  } finally {
    tongKim.stopMatch(fakeWorld);
  }
});

test('Nguyên Soái mất >= 20% HP: cắt cử đúng 30% về bảo vệ + điều Nga Mi về buff Từ Hàng Phổ Độ (#93), cân bằng 70/70 & 30/30 hai phe', async () => {
  const { DEFAULT_BOT_SCENARIO, TK_MAP_LAYOUT, C2S, isoDistance } = await import('../packages/shared/src/index.js');
  const { TongKimBehavior } = await import('../tools/bots/runner/TongKimBehavior.js');
  const { TkCampDirector, isMarshalRusherSlot, isMarshalDefenseReserve } = await import('../tools/bots/runner/TkTactics.js');

  // 1. Cân bằng tuyệt đối giữa Tống (botIndex chẵn) và Kim (botIndex lẻ)
  let tongRush = 0, kimRush = 0, tongDef = 0, kimDef = 0;
  for (let i = 0; i < 20; i++) {
    if (i % 2 === 0) {
      if (isMarshalRusherSlot(i)) tongRush++;
      if (isMarshalDefenseReserve(i)) tongDef++;
    } else {
      if (isMarshalRusherSlot(i)) kimRush++;
      if (isMarshalDefenseReserve(i)) kimDef++;
    }
  }
  assert.equal(tongRush, 7, 'Phe Tống (10 bot chẵn) phải có đúng 70% (7/10) rusher');
  assert.equal(kimRush, 7, 'Phe Kim (10 bot lẻ) phải có đúng 70% (7/10) rusher');
  assert.equal(tongDef, 3, 'Phe Tống phải có đúng 30% (3/10) dự bị bảo vệ Soái');
  assert.equal(kimDef, 3, 'Phe Kim phải có đúng 30% (3/10) dự bị bảo vệ Soái');

  // 2. Khi Nguyên Soái Tống mất 22% HP (còn 78% <= 80%) trong lúc cả 2 Soái đều sống
  const director = new TkCampDirector();
  const now = 50_000;
  const bothAlive = { matchId: 77, mode: 1, marshalSpawned: true, tongMarshalAlive: true, kimMarshalAlive: true };
  // Trước khi báo mất 20% -> chưa ai phải về
  assert.equal(director.resolveMarshalEndgame(378, 'tong', bothAlive, 0, TK_MAP_LAYOUT.tong.marshal, now, 'shaolin'), 'none');

  director.reportOwnMarshalHp(378, 'tong', 0.78, now);
  let defenders = 0;
  for (let i = 0; i < 20; i += 2) {
    if (director.resolveMarshalEndgame(378, 'tong', bothAlive, i, TK_MAP_LAYOUT.tong.marshal, now, 'shaolin') === 'support_hurt_marshal') {
      defenders++;
    }
  }
  assert.equal(defenders, 3, 'Đúng 30% (3/10) bot thường phe Tống về bảo vệ khi Soái mất >= 20% máu');
  // Nga Mi dù ở slot ngoài 30% (vd index 18 -> 9 % 10 >= 3) vẫn được điều về buff máu cho Soái
  assert.equal(director.resolveMarshalEndgame(378, 'tong', bothAlive, 18, TK_MAP_LAYOUT.tong.marshal, now, 'emei'), 'support_hurt_marshal');

  // 3. Bot Nga Mi chạy về gần Nguyên Soái và chủ động cast Từ Hàng Phổ Độ (#93) lên Nguyên Soái
  const moves: { x: number; y: number }[] = [];
  const casts: { skill: number; targetId?: string }[] = [];
  const emeiMe: any = { id: 'emei-1', x: 9000, y: 5500, hp: 4000, maxHp: 4000, mp: 2000, maxMp: 2000, battleCamp: 'tong', faction: 'emei', states: [] };
  const rawActors = new Map<string, any>([['tong-marshal', { battleCamp: 'tong', maxHp: 5_000_000 }]]);
  let actorList: any[] = [];
  const emeiBot: any = {
    name: 'emei-1',
    mapId: 378,
    bag: [{ uid: 'p1', def: 'potion-0-5', qty: 10 }],
    money: 100000,
    levels: { 93: 20, 328: 20 },
    stats: { faction: 'emei', series: 'thuy' },
    autoSettings: { autoBuff: false },
    tkState: { ...bothAlive, phase: 'fighting', battleMapId: 378, tongCount: 10, kimCount: 10, me: { camp: 'tong', inCamp: false, gateWaitSec: 0 } },
    room: { state: { actors: rawActors } },
    host: { drops: () => [], aura: () => {} },
    me: () => emeiMe,
    actors: () => actorList,
    rand: () => 0.5,
    send: (type: string, payload: any) => { if (type === C2S.move) moves.push(payload); },
    prepareCombat: () => false,
    attacks: () => [328],
    range: () => 360,
    ready: () => true,
    usable: () => true,
    levelOf: (id: number) => (id === 93 || id === 328 ? 20 : 0),
    cast: (skill: number, targetId?: string) => { casts.push({ skill, targetId }); },
    reviveIfDead: () => {},
  };
  const sc = { ...DEFAULT_BOT_SCENARIO, tongkim: { ...DEFAULT_BOT_SCENARIO.tongkim!, tactic: 'tactical' as const } };
  const emeiBeh = new TongKimBehavior(emeiBot, sc, 18, director);

  // Khi đang ở xa (9000, 5500) -> chạy về sát Nguyên Soái Tống
  emeiBeh.update(now + 100);
  assert.ok(moves.length >= 1 && isoDistance(moves.at(-1)!.x, moves.at(-1)!.y, TK_MAP_LAYOUT.tong.marshal.x, TK_MAP_LAYOUT.tong.marshal.y) < 300, 'Nga Mi phải chạy về sát Nguyên Soái nhà');

  // Khi đã áp sát trong tầm 380px -> cast Từ Hàng Phổ Độ (#93) lên Nguyên Soái
  emeiMe.x = TK_MAP_LAYOUT.tong.marshal.x + 120;
  emeiMe.y = TK_MAP_LAYOUT.tong.marshal.y;
  actorList = [{ id: 'tong-marshal', isSelf: false, x: TK_MAP_LAYOUT.tong.marshal.x, y: TK_MAP_LAYOUT.tong.marshal.y, state: { hp: 3_900_000, maxHp: 5_000_000, kind: 'monster', boss: 2 } }];
  emeiBeh.update(now + 1000);
  assert.deepEqual(casts.at(-1), { skill: 93, targetId: 'tong-marshal' }, 'Nga Mi phải cast Từ Hàng Phổ Độ (#93) lên Nguyên Soái đang mất máu');
});

test('Điểm báo danh 323 & Điểm tập trung Hậu doanh 2 phe: rải ngẫu nhiên quanh tâm để tránh trùng vị trí', async () => {
  const { scatterTkPoint } = await import('../apps/server/src/world/tongkim.js');
  const { TK_SIGNUP_ENTRY, isoDistance } = await import('../packages/shared/src/index.js');

  const center = TK_SIGNUP_ENTRY.tong;
  const pts = new Set<string>();
  for (let i = 0; i < 20; i++) {
    const p = scatterTkPoint(center, 60, 240);
    const d = isoDistance(center.x, center.y, p.x, p.y);
    assert.ok(d >= 55 && d <= 250, `Điểm rải (${p.x},${p.y}) phải nằm trong bán kính 60..240px quanh tâm (thực tế ${d.toFixed(1)})`);
    pts.add(`${p.x},${p.y}`);
  }
  assert.ok(pts.size >= 15, '20 lần rải phải tạo nhiều tọa độ khác nhau, không đứng chồng 1 điểm');
});
