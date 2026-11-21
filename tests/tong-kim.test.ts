import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAPS,
  TK_BATTLE_MAP_ID,
  TK_MAP_LAYOUT,
  canAttack,
  combatPairRules,
  combatRulesAt,
  isInTkSafeCamp,
  tkHomeCampAt,
  tkKillPlayerPoints,
  tkRankForPoints,
  tkTitleOf,
  type CombatantInfo,
} from '@vltk/shared';
import { tongKim } from '../apps/server/src/world/tongkim.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';

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
