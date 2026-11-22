import assert from 'node:assert/strict';
import test from 'node:test';
import { MapSchema } from '@colyseus/schema';
import {
  attr, attr1, getSkill, JX_TICK_MS, MAPS, monsterCombat, registerNav, triggersOf,
} from '@vltk/shared';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim, type Sim } from '../apps/server/src/world/entity.js';
import { World } from '../apps/server/src/world/World.js';
import { addState } from '../apps/server/src/world/systems/status.js';
import { applyHitEffects } from '../apps/server/src/world/systems/effects.js';

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

function addPlayer(w: World, id: string, opts: { x: number; y: number; camp?: string; team?: string }): Sim {
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
  a.team = opts.team ?? '';
  a.protectedUntil = 0;
  const sim = makeSim(id, 'player', a, 'earth');
  sim.hp = 2000;
  sim.mp = 1000;
  sim.speed = 240;
  sim.combat = monsterCombat(120, 'earth', 0, 0, {}, {});
  w.add(sim);
  return sim;
}

test('Võ Đang 716 -> 738 (Xuất Ứ Bất Nhiễm): giải sạch dị thường cho đồng đội & bản thân, miễn dịch 3s ở lv20', () => {
  const s716 = getSkill(716)!;
  const s738 = getSkill(738)!;
  assert.equal(attr1(s716, 'skill_mintimepercast_v', 20), 10 * 18, 'CD 716 lv20 = 10s');
  assert.equal(attr1(s716, 'missle_missrate', 20), 0, '716 lv20 giải đồng đội 100%');
  assert.equal(attr1(s738, 'missle_missrate', 20), 0, '738 lv20 giải & miễn dịch bản thân 100%');
  assert.equal(attr(s738, 'ignorenegativestate_p', 20)?.[1], 3 * 18, '738 lv20 miễn dịch 3s');

  const w = makeWorld();
  const wd = addPlayer(w, 'wudang', { x: 2000, y: 2000, camp: 'justice', team: 't1' });
  const ally = addPlayer(w, 'ally', { x: 2100, y: 2000, camp: 'justice', team: 't1' });
  const enemy = addPlayer(w, 'enemy', { x: 2050, y: 2000, camp: 'evil' });
  wd.skills.set(716, 20);

  // Gắn sẵn debuff + khống chế lên cả Võ Đang và đồng đội
  addState(w, wd, { skill: 723, kind: 'debuff', ms: 4000, by: enemy.id, level: 20 });
  wd.combat!.bag = { randmove: [1, 72, 0] };
  applyHitEffects(w, enemy, wd, { stunMs: 2000, slowMs: 3000, hurtMs: 0, poison: null });
  addState(w, ally, { skill: 720, kind: 'debuff', ms: 9000, by: enemy.id, level: 20 });
  applyHitEffects(w, enemy, ally, { stunMs: 2000, slowMs: 3000, hurtMs: 0, poison: null });

  // Võ Đang vẫn bấm được 716 dù đang bị hoảng loạn
  assert.equal(w.engine.check(wd, 716), null, 'Cho phép bấm 716 khi đang hoảng loạn');
  const res = w.engine.cast(wd, 716, undefined, { x: 2000, y: 2000 }, 50);
  assert.equal(res.rejected, undefined);

  // Bước qua pose + missile 274/275
  w.now += 100;
  w.engine.update();
  w.now += Math.ceil(6 * JX_TICK_MS);
  w.engine.update();

  // Cả Võ Đang và đồng đội được xóa sạch debuff + khống chế
  assert.equal(wd.states.has(723), false, 'Võ Đang được xóa hoảng loạn 723');
  assert.equal(wd.effects, undefined, 'Võ Đang được xóa choáng/chậm');
  assert.equal(ally.states.has(720), false, 'Đồng đội được xóa debuff 720');
  assert.equal(ally.effects, undefined, 'Đồng đội được xóa choáng/chậm');
  assert.equal(wd.states.has(738), true, 'Võ Đang nhận buff miễn dịch 738');

  // Trong thời gian miễn dịch (ignorenegativestate_p = 100): miễn hoàn toàn debuff & khống chế mới
  wd.combat!.bag = { ignorenegativestate_p: [100, 54, 0] };
  addState(w, wd, { skill: 723, kind: 'debuff', ms: 4000, by: enemy.id, level: 20 });
  assert.equal(wd.states.has(723), false, 'Miễn dịch debuff mới khi có 738');
  applyHitEffects(w, enemy, wd, { stunMs: 2000, slowMs: 3000, hurtMs: 500, poison: null });
  assert.equal(wd.effects, undefined, 'Miễn dịch choáng/chậm/co giật khi có 738');
});

test('Côn Lôn 717 -> 721 + 722 (Lưỡng Nghi Chân Khí): ngưỡng HP < 25%, tỉ lệ 70% (CD 20s) và khiên 1s -> 5s', () => {
  const s717 = getSkill(717)!;
  const tr20 = triggersOf(s717, 20)[0];
  assert.equal(tr20.skill, 721);
  assert.equal(tr20.level, 20);
  assert.equal(tr20.chance, 70, 'Xác suất autorescueskill lv20 = 70%');
  assert.equal(Math.round(tr20.cooldownMs), Math.round(20 * 18 * JX_TICK_MS), 'CD nội tại = 20s');

  const s721 = getSkill(721)!;
  assert.equal(attr(s721, 'staticmagicshield_p', 1)?.[0], 1800);
  assert.equal(attr(s721, 'staticmagicshield_p', 20)?.[0], 50000);
  assert.equal(attr(s721, 'staticmagicshield_p', 1)?.[1], 1 * 18);
  assert.equal(attr(s721, 'staticmagicshield_p', 20)?.[1], 5 * 18);

  const w = makeWorld();
  w.random = () => 0.1; // 10% < 70% -> kích hoạt khi HP < 25%
  const kl = addPlayer(w, 'kunlun', { x: 2000, y: 2000, camp: 'balance' });
  const enemy = addPlayer(w, 'enemy', { x: 2030, y: 2000, camp: 'evil' });
  kl.skills.set(717, 20);
  enemy.skills.set(1, 1);

  // HP = 28% (560/2000) bị đánh nhẹ còn ~26% (>= 25%) -> CHƯA kích hoạt
  kl.hp = 560;
  w.engine.cast(enemy, 1, kl, { x: kl.a.x, y: kl.a.y }, 50);
  w.now += 150;
  w.engine.update();
  w.now += 300;
  w.engine.update();
  if (kl.hp >= kl.a.maxHp * 0.25) {
    assert.equal(kl.states.has(721), false, 'HP >= 25% chưa kích hoạt 721');
  }

  // HP = 20% (400/2000) bị đánh -> kích hoạt 721 + 722
  kl.hp = 400;
  w.now += 1000;
  w.engine.cast(enemy, 1, kl, { x: kl.a.x, y: kl.a.y }, 50);
  w.now += 150;
  w.engine.update();
  w.now += Math.ceil(6 * JX_TICK_MS);
  w.engine.update();
  assert.equal(kl.states.has(721), true, 'HP < 25% kích hoạt Khiên 721');
  assert.equal(kl.states.has(722), true, 'Khiên 721 tự gọi Gia Tốc 722');
  assert.ok((kl.shieldHp ?? 0) > 0 && (kl.shieldHp ?? 0) <= kl.a.maxHp, 'shieldHp được cấp và kẹp an toàn <= MaxHP');
});
