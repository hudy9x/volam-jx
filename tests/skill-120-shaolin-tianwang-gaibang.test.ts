import assert from 'node:assert/strict';
import test from 'node:test';
import { MapSchema } from '@colyseus/schema';
import {
  attr1, getSkill, ITEMS, JX_TICK_MS, MAPS, potionPumps, registerNav, triggersOf,
} from '@vltk/shared';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim, type Sim } from '../apps/server/src/world/entity.js';
import { World } from '../apps/server/src/world/World.js';
import { applyHit, heal } from '../apps/server/src/world/systems/combat.js';
import { addState } from '../apps/server/src/world/systems/status.js';
import { drinkPotion } from '../apps/server/src/world/systems/potions.js';

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

function addPlayer(w: World, id: string, opts: { x: number; y: number; camp?: string }): Sim {
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
  a.pk = 2;
  a.protectedUntil = 0;
  const sim = makeSim(id, 'player', a, 'metal');
  sim.hp = 2000;
  sim.mp = 1000;
  sim.speed = 240;
  sim.combat = {
    level: 120, element: 'metal', weapon: [50, 80], basePhys: 50,
    attackRating: 1000, defense: 100, hitRecover: 0,
    resists: { phys: 0, cold: 0, fire: 0, light: 0, poison: 0 },
    bag: {}, bonuses: {},
  };
  w.add(sim);
  return sim;
}

test('Thiếu Lâm 709 (Đại Thừa Như Lai Chú): phản độc, phản bùa (không lặp vô hạn) và autoreplyskill 100%', () => {
  const s709 = getSkill(709)!;
  assert.equal(attr1(s709, 'returnskill_p', 20), 80, 'returnskill_p lv20 = 80%');
  assert.equal(attr1(s709, 'poisondamagereturn_p', 20), 45, 'poisondamagereturn_p lv20 = 45%');
  const tr20 = triggersOf(s709, 20)[0];
  assert.equal(tr20.skill, 20, 'autoreplyskill gọi Sư Tử Hống (20)');
  assert.equal(tr20.level, 20);
  assert.equal(tr20.chance, 100, 'autoreplyskill lv1..25 kích hoạt 100% khi hết CD');
  assert.ok(tr20.cooldownMs <= Math.ceil(5.3 * 18 * JX_TICK_MS), 'CD lv20 ~5.25s');

  const w = makeWorld();
  w.random = () => 0.1; // 10% < 80% -> luôn phản bùa
  const sl = addPlayer(w, 'shaolin', { x: 2000, y: 2000, camp: 'justice' });
  const wd = addPlayer(w, 'wudu', { x: 2040, y: 2000, camp: 'evil' });
  sl.combat!.bag = { poisondamagereturn_p: [45, -1, 0], returnskill_p: [80, -1, 0] };

  // 1. Phản sát thương độc: tick độc 200 dmg -> phản floor(200 * 45%) = 90 dmg về Ngũ Độc
  const wdHpBefore = wd.hp;
  applyHit(w, wd, sl, { dmg: 200, crit: false, dot: true });
  assert.equal(wd.hp, wdHpBefore - 90, 'Phản 45% độc sát về người hạ độc');

  // 2. Phản bùa chú: Ngũ Độc gắn bùa 719 lên Thiếu Lâm -> Thiếu Lâm không dính, bùa phản ngược về Ngũ Độc
  addState(w, sl, { skill: 719, kind: 'debuff', ms: 6000, by: wd.id, level: 20 });
  assert.equal(sl.states.has(719), false, 'Thiếu Lâm phản bùa thành công nên không dính 719');
  assert.equal(wd.states.has(719), true, 'Người thi triển dính ngược bùa 719 bị phản');

  // 3. Chống vòng lặp phản kép khi cả 2 đều có returnskill_p
  wd.states.clear();
  wd.combat!.bag = { returnskill_p: [100, -1, 0] };
  addState(w, sl, { skill: 720, kind: 'debuff', ms: 6000, by: wd.id, level: 20 });
  assert.equal(sl.states.has(720), false);
  assert.equal(wd.states.has(720), true, 'Bùa đã phản 1 lần không bị phản ngược lần 2');
});

test('Thiên Vương 708 (Đảo Hư Thiên): lifereplenish_p tăng hồi máu và ignoreskill_p bỏ qua bùa hại', () => {
  const s708 = getSkill(708)!;
  assert.equal(attr1(s708, 'allres_p', 20), 10);
  assert.equal(attr1(s708, 'allresmax_p', 20), 5);
  assert.equal(attr1(s708, 'lifereplenish_p', 20), 35);
  assert.equal(attr1(s708, 'lifereplenish_p', 28), 50);
  assert.equal(attr1(s708, 'ignoreskill_p', 28), 100);

  const w = makeWorld();
  w.random = () => 0.5; // 50% < 71% (lv20) -> bỏ qua bùa
  const tw = addPlayer(w, 'tianwang', { x: 2000, y: 2000, camp: 'balance' });
  const tr = addPlayer(w, 'tianren', { x: 2040, y: 2000, camp: 'evil' });
  tw.combat!.bag = { lifereplenish_p: [35, -1, 0], ignoreskill_p: [71, -1, 0] };

  // 1. Bỏ qua bùa hại 723 từ Thiên Nhẫn
  addState(w, tw, { skill: 723, kind: 'debuff', ms: 4000, by: tr.id, level: 20 });
  assert.equal(tw.states.has(723), false, 'Thiên Vương bỏ qua bùa hại nhờ ignoreskill_p');
  assert.equal(tr.states.has(723), false, 'Bỏ qua bùa không phản ngược lên đối phương');

  // 2. Tăng hiệu quả hồi máu từ heal() và thuốc uống (+35%)
  tw.hp = 1000;
  heal(w, tw, 200);
  assert.equal(tw.hp, 1270, 'heal(200) với +35% lifereplenish_p hồi đúng 270 HP');

  const hpPotion = Object.values(ITEMS).find(i => i.kind === 'potion' && potionPumps(i).some(p => p.stat === 'hp'))!;
  const basePer = potionPumps(hpPotion).find(p => p.stat === 'hp')!.per;
  tw.hp = 1000;
  drinkPotion(tw, hpPotion);
  assert.equal(tw.hp, 1000 + Math.round(basePer * 1.35), 'Nhịp đầu uống thuốc với +35% lifereplenish_p hồi tăng đúng 35%');
});

test('Cái Bang 714 -> 720 (Hỗn Thiên Khí Công): xác suất 10% (CD 12s) và debuff 720 đủ 6 dòng gồm fastwalkrun_p', () => {
  const s714 = getSkill(714)!;
  const tr20 = triggersOf(s714, 20)[0];
  assert.equal(tr20.skill, 720);
  assert.equal(tr20.level, 20);
  assert.equal(tr20.chance, 10, 'Xác suất kích hoạt lv20 = 10%');
  assert.equal(Math.round(tr20.cooldownMs), Math.round(12 * 18 * JX_TICK_MS), 'Cooldown nội tại = 12s');

  const s720 = getSkill(720)!;
  assert.equal(attr1(s720, 'physicsres_p', 25), -20);
  assert.equal(attr1(s720, 'fireres_p', 25), -20);
  assert.equal(attr1(s720, 'physicsresmax_p', 20), -10);
  assert.equal(attr1(s720, 'fireresmax_p', 20), -15);
  assert.equal(attr1(s720, 'fastwalkrun_p', 23), -50);
  assert.equal(attr1(s720, 'rangedamagereturn_p', 20), -30);
});
