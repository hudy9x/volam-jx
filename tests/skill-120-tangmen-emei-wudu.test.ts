import assert from 'node:assert/strict';
import test from 'node:test';
import { MapSchema } from '@colyseus/schema';
import {
  attr1, castAnim, getMissile, getSkill, JX_TICK_MS, MAPS, registerNav, triggersOf,
} from '@vltk/shared';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim, type Sim } from '../apps/server/src/world/entity.js';
import { World } from '../apps/server/src/world/World.js';
import { applyHit } from '../apps/server/src/world/systems/combat.js';
import { addState } from '../apps/server/src/world/systems/status.js';

function makeWorld(mapId = 140): World {
  const map = MAPS[mapId];
  registerNav(mapId, {
    kind: 'grid',
    columns: 64,
    rows: 64,
    cellSize: { width: map.raw.size.width / 64, height: map.raw.size.height / 64 },
    blockedBase64: Buffer.alloc(512).toString('base64'),
  });
  const w = new World(mapId, new MapSchema<Actor>(), {
    transfer() {}, notify() {}, log() {}, announce() {}, progress() {}, skills() {}, inventory() {},
  });
  w.rules.safe = false;
  w.rules.pvp = true;
  w.now = 100_000;
  return w;
}

function addPlayer(w: World, id: string, opts: { x: number; y: number; camp?: string; pk?: number; team?: string }): Sim {
  const a = new Actor();
  a.id = id;
  a.name = id;
  a.kind = 'player';
  a.x = opts.x;
  a.y = opts.y;
  a.hp = 2000;
  a.maxHp = 2000;
  a.mp = 1000;
  a.maxMp = 1000;
  a.level = 120;
  a.camp = opts.camp ?? 'justice';
  a.pk = opts.pk ?? 2;
  a.team = opts.team ?? '';
  a.protectedUntil = 0;
  const sim = makeSim(id, 'player', a, 'wood');
  sim.hp = 2000;
  sim.mp = 1000;
  sim.speed = 240;
  sim.combat = {
    level: 120, element: 'wood', weapon: [50, 80], basePhys: 50,
    attackRating: 1000, defense: 100, hitRecover: 0,
    resists: { phys: 0, cold: 0, fire: 0, light: 0, poison: 0 },
    resist: { phys: 0, cold: 0, fire: 0, light: 0, poison: 0 },
    resistMax: { phys: 75, cold: 75, fire: 75, light: 75, poison: 75 },
    bag: {}, bonuses: {}, skillBonus: {},
  };
  w.add(sim);
  return sim;
}

test('Đường Môn 710 (Mê Ảnh Tung): tầm blink 520, cooldown đi bộ 3s / trên ngựa 5s ở lv20', () => {
  const s710 = getSkill(710)!;
  assert.ok(s710);
  assert.equal(attr1(s710, 'skill_param1_v', 1), 120);
  assert.equal(attr1(s710, 'skill_param1_v', 20), 520);
  assert.equal(attr1(s710, 'skill_mintimepercast_v', 20), 3 * 18);
  assert.equal(attr1(s710, 'skill_mintimepercastonhorse_v', 20), 5 * 18);

  const w = makeWorld();
  const tm = addPlayer(w, 'tm', { x: 2000, y: 2000, camp: 'balance' });
  tm.skills.set(710, 20);

  // Blink đi bộ tới khoảng cách 800 -> bị kẹp đúng 520 px, CD = 3s
  const resFoot = w.engine.cast(tm, 710, undefined, { x: 2800, y: 2000 });
  assert.equal(resFoot.rejected, undefined);
  assert.equal(tm.a.x, 2520, 'Blink xa tối đa 520 px ở lv20');
  assert.equal(Math.round((tm.cooldowns.get(710)! - w.now) / 100), 30, 'CD đi bộ = 3s');

  // Blink trên ngựa -> CD = 5s
  w.now += 4000;
  tm.a.mounted = true;
  const resHorse = w.engine.cast(tm, 710, undefined, { x: 2000, y: 2000 });
  assert.equal(resHorse.rejected, undefined);
  assert.equal(Math.round((tm.cooldowns.get(710)! - w.now) / 100), 50, 'CD trên ngựa = 5s');
});

test('Nga Mi 712 (Bế Nguyệt Phất Trần): bán kính 320 và cấp 5 aura con lấy theo min(5 chiêu con, cap 712)', () => {
  const s712 = getSkill(712)!;
  assert.ok(s712);
  assert.equal(s712.radius, 320, 'Bán kính vòng sáng 712 = 320');

  const w = makeWorld();
  const em = addPlayer(w, 'emei', { x: 2000, y: 2000, camp: 'justice', team: 't1' });
  const allyNear = addPlayer(w, 'allyNear', { x: 2300, y: 2000, camp: 'justice', team: 't1' }); // dist 300 <= 320
  const allyFar = addPlayer(w, 'allyFar', { x: 2350, y: 2000, camp: 'justice', team: 't1' });   // dist 350 > 320

  em.skills.set(712, 20);
  // Trường hợp 1: thiếu 1 trong 5 aura con (332 chưa học) -> không kích hoạt 5 aura con
  em.skills.set(86, 20);
  em.skills.set(89, 20);
  em.skills.set(92, 20);
  em.skills.set(282, 20);
  w.engine.holdAura(em, 712);
  w.engine.update();
  assert.equal(allyNear.states.has(86), false, 'Chưa học đủ 5 aura con -> không bật aura con');

  // Trường hợp 2: học đủ 5 chiêu, chiêu thấp nhất là 282 cấp 12 -> cả 5 aura con chạy ở cấp 12 cho đồng đội trong bán kính 320
  em.skills.set(282, 12);
  em.skills.set(332, 20);
  w.now += 1500;
  w.engine.update();
  for (const id of [86, 89, 92, 282, 332]) {
    assert.equal(em.states.get(id)?.level, 12, `Bản thân nhận aura ${id} ở cấp min = 12`);
    assert.equal(allyNear.states.get(id)?.level, 12, `Đồng đội trong 320 nhận aura ${id} ở cấp min = 12`);
    assert.equal(allyFar.states.has(id), false, `Đồng đội ngoài 320 không nhận aura ${id}`);
  }

  // Trường hợp 3: 712 cấp 10 (cap 10), 5 chiêu đều cấp 20 -> bị kẹp bởi cap 10 của 712
  em.skills.set(712, 10);
  em.skills.set(282, 20);
  w.engine.holdAura(em, 712);
  w.now += 1500;
  w.engine.update();
  assert.equal(allyNear.states.get(86)?.level, 10, 'Cấp aura bị kẹp bởi cap của 712 (lv10 -> 10)');
});

test('Ngũ Độc 711 -> 719 (Hấp Tinh Yểm): xác suất 30% ở lv20 và poison2decmana_p trừ nội lực theo độc sát', () => {
  const s711 = getSkill(711)!;
  const tr20 = triggersOf(s711, 20)[0];
  assert.equal(tr20.skill, 719);
  assert.equal(tr20.level, 20);
  assert.equal(tr20.chance, 30, 'Xác suất kích hoạt lv20 = 30%');
  assert.equal(Math.round(tr20.cooldownMs), Math.round(10 * 18 * JX_TICK_MS), 'Cooldown nội tại = 10s');

  const w = makeWorld();
  const wd = addPlayer(w, 'wudu', { x: 2000, y: 2000, camp: 'evil', pk: 2 });
  const victim = addPlayer(w, 'victim', { x: 2040, y: 2000, camp: 'justice', pk: 2 });

  // Gắn debuff 719 lv20 (poison2decmana_p = 85%)
  addState(w, victim, { skill: 719, kind: 'debuff', ms: 6000, by: wd.id, level: 20 });
  victim.combat!.bag = { poison2decmana_p: [85, 108, 0] };

  // Đòn trực tiếp (không phải dot) không kích hoạt poison2decmana_p
  const mpStart = victim.mp;
  applyHit(w, wd, victim, { dmg: 200, crit: false, dot: false });
  assert.equal(victim.mp, mpStart, 'Đòn trực tiếp không trừ nội lực bởi poison2decmana_p');

  // Tick độc sát (dot: true) 200 dmg -> trừ thêm floor(200 * 85%) = 170 MP
  applyHit(w, wd, victim, { dmg: 200, crit: false, dot: true });
  assert.equal(victim.mp, mpStart - 170, 'Độc sát DoT trừ đúng 85% sát thương độc vào nội lực');
});

test('Ngũ Độc Kỳ Kinh (75, Trấn phái max 30): tốc đánh ngoại công & nội công = +20% ở cấp 30+, giữ nguyên các chỉ số khác', () => {
  const s75 = getSkill(75)!;
  assert.ok(s75);
  assert.equal(attr1(s75, 'attackspeed_v', 30), 20);
  assert.equal(attr1(s75, 'attackspeed_v', 31), 20);
  assert.equal(attr1(s75, 'castspeed_v', 30), 20);
  assert.equal(attr1(s75, 'castspeed_v', 31), 20);
  // Các dòng cũ vẫn được giữ nguyên
  assert.equal(attr1(s75, 'addpoisondamage_v', 30), 100);
  assert.equal(attr1(s75, 'addpoisonmagic_v', 30), 100);
  assert.equal(attr1(s75, 'deadlystrikeenhance_p', 30), 45);
});

test('Đường Môn 60/90/150: xuất hiện ngay (wait=0), Bạo Vũ Lê Hoa (302) & Thiết Liên Tứ Sát (1070) bung tia ngay lập tức, Tiểu Lý Phi Đao (249) / Nhiếp Hồn Nguyệt Ảnh (339) / Vô Ảnh Xuyên (1069) bay nhanh gấp đôi', () => {
  for (const id of [58, 249, 301, 302, 339, 340, 341, 342, 1069, 1070, 1071, 1097, 1098]) {
    assert.equal(getSkill(id)?.wait ?? 0, 0, `Skill ${id} should have wait=0`);
  }
  // Tiểu Lý Phi Đao (#249 -> M106): bay thẳng speed=64
  assert.equal(getSkill(249)?.form, 1);
  assert.equal(getMissile(106)?.move, 1);
  assert.equal(getMissile(106)?.speed, 64);
  assert.equal(getMissile(106)?.life, 6);

  // Nhiếp Hồn Nguyệt Ảnh (#339 -> M149): speed 64, life 8
  assert.equal(attr1(getSkill(339)!, 'missle_speed_v', 20), 64);
  assert.equal(getMissile(149)?.speed, 64);
  assert.equal(getMissile(149)?.life, 8);

  // Vô Ảnh Xuyên (#1069 -> M331): speed 80, life 7
  assert.equal(attr1(getSkill(1069)!, 'missle_speed_v', 20), 80);
  assert.equal(getMissile(331)?.speed, 80);
  assert.equal(getMissile(331)?.life, 7);

  // Bạo Vũ Lê Hoa (#302) & Thiết Liên Tứ Sát (#1070) ở lv20 bung ngay 8 tia (#301 M126 / #1098 M360) ngay khi tâm xoáy xuất hiện
  const w = makeWorld();
  const tm = addPlayer(w, 'tm-fast', { x: 2000, y: 2000, camp: 'balance' });
  tm.weaponType = 102; // Nỏ
  tm.skills.set(302, 20);
  tm.skills.set(1070, 20);

  w.engine.cast(tm, 302, undefined, { x: 2200, y: 2000 }, 10);
  w.now += 20;
  w.engine.update();
  const ev302 = w.takeEvents();
  assert.ok(ev302.some(e => e.t === 'msl' && e.k === 96), 'M96 vortex spawns immediately');
  assert.equal(ev302.filter(e => e.t === 'msl' && e.k === 126).length, 8, '8 rays of Truy Tinh Trục Điện (M126) burst immediately on start');

  w.engine.cast(tm, 1070, undefined, { x: 2200, y: 2000 }, 10);
  w.now += 20;
  w.engine.update();
  const ev1070 = w.takeEvents();
  assert.ok(ev1070.some(e => e.t === 'msl' && e.k === 332), 'M332 vortex spawns immediately');
  assert.equal(ev1070.filter(e => e.t === 'msl' && e.k === 360).length, 8, '8 rays of Thiết Sa Xạ Tinh (M360) burst immediately on start');

  // Pose ném ám khí (Phi tiêu 100, Phi đao 101, Tụ tiễn 102): dùng attack (DartThrow MG01) thay vì cast (FreeMagic MG02)
  assert.equal(castAnim(getSkill(341)!, false), 'attack', 'Tán Hoa Tiêu (100) uses DartThrow (attack)');
  assert.equal(castAnim(getSkill(249)!, false), 'attack', 'Tiểu Lý Phi Đao (101) uses DartThrow (attack)');
  assert.equal(castAnim(getSkill(302)!, false), 'attack', 'Bạo Vũ Lê Hoa (102) uses DartThrow (attack)');
});

test('Đường Môn 150 (1110 Tích Lịch Loạn Hoàn Kích): 30% đúng mục tiêu, 70% quanh 50px & không nổ sớm trước mặt địch', async () => {
  const { resolveTichLichLanding } = await import('../packages/shared/src/skills/engine/SkillEngine.js');
  const { isoDistance } = await import('../packages/shared/src/geometry.js');

  const aim = { x: 2300, y: 2000 };
  // 30% (< 0.3) -> đúng ngay aim
  assert.deepEqual(resolveTichLichLanding(aim, () => 0.1), aim);
  // 70% (>= 0.3) -> xung quanh aim bán kính <= 50 px
  const scattered = resolveTichLichLanding(aim, () => 0.65);
  const sd = isoDistance(aim.x, aim.y, scattered.x, scattered.y);
  assert.ok(sd > 0 && sd <= 51, `Điểm rơi rải (${scattered.x},${scattered.y}) phải nằm quanh địch trong 50px (thực tế ${sd.toFixed(1)})`);

  // Khi cast #1110 vào mục tiêu cách 300px -> đạn M374 bay hết quỹ đạo tới điểm rơi (tx=2300), không nổ sớm ở ~120px trước mặt
  const w = makeWorld();
  const tm = addPlayer(w, 'tm-1110', { x: 2000, y: 2000, camp: 'justice', pk: 2 });
  tm.skills.set(1110, 20);
  const target = addPlayer(w, 'victim-1110', { x: 2300, y: 2000, camp: 'evil', pk: 2 });
  // Đặt random = 0.1 để rơi chính xác tại mục tiêu (2300, 2000)
  w.random = () => 0.1;
  const pose = w.engine.cast(tm, 1110, target, { x: target.a.x, y: target.a.y }, 10);
  assert.equal(pose.rejected, undefined, `Cast #1110 không bị từ chối (${pose.note ?? ''})`);
  w.now += 20;
  w.engine.update();
  const castEv = w.takeEvents();
  const msl = castEv.find(e => e.t === 'msl' && e.k === 374) as any;
  assert.ok(msl && msl.tx === 2300 && msl.ty === 2000, 'Quả bom M374 phải nhắm thẳng tới đúng điểm rơi (2300, 2000)');

  // Giả lập bước tới khi hạ cánh -> tạo bẫy M161 (#1113) ngay tại (2300, 2000) thay vì nổ sớm trước mặt
  let trapMsl: any = null;
  for (let i = 0; i < 40; i++) {
    w.now += 60;
    w.engine.update();
    const evs = w.takeEvents();
    const found = evs.find(e => e.t === 'msl' && e.k === 161);
    if (found) { trapMsl = found; break; }
  }
  assert.ok(trapMsl, 'Sau khi quả bom hạ cánh phải đặt bẫy M161 (#1113)');
  assert.equal(trapMsl.x, 2300, 'Bẫy #1113 phải đặt đúng ngay tại tọa độ X của mục tiêu (2300)');
  assert.equal(trapMsl.y, 2000, 'Bẫy #1113 phải đặt đúng ngay tại tọa độ Y của mục tiêu (2000)');
});
