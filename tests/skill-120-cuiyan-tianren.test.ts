import assert from 'node:assert/strict';
import test from 'node:test';
import { MapSchema } from '@colyseus/schema';
import {
  attr, attr1, EFFECTS, getSkill, isoDistance, JX_TICK_MS, MAPS, registerNav,
} from '@vltk/shared';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim, type Sim } from '../apps/server/src/world/entity.js';
import { World } from '../apps/server/src/world/World.js';
import { applyHit, castNow, kill } from '../apps/server/src/world/systems/combat.js';
import { addState } from '../apps/server/src/world/systems/status.js';
import { refreshMonsterCombat } from '../apps/server/src/world/systems/effects.js';
import { attackable, isConfused, isHidden } from '../apps/server/src/world/targeting.js';
import { commandCast, commandMove } from '../apps/server/src/world/commands.js';
import { updatePlayer } from '../apps/server/src/world/players.js';
import { updateMonster } from '../apps/server/src/world/ai/monster.js';

function makeWorld(mapId = 140): World {
  const map = MAPS[mapId];
  registerNav(mapId, {
    kind: 'grid',
    columns: 64,
    rows: 64,
    cellSize: { width: map.raw.size.width / 64, height: map.raw.size.height / 64 },
    blockedBase64: Buffer.alloc(512).toString('base64'),
  });
  const actors = new MapSchema<Actor>();
  const world = new World(mapId, actors, {
    transfer() {},
    notify() {},
    log() {},
    announce() {},
    progress() {},
    skills() {},
    inventory() {},
  });
  world.rules.safe = false;
  world.rules.pvp = true;
  world.now = 100_000;
  return world;
}

function addPlayer(w: World, id: string, opts: { x: number; y: number; camp?: string; pk?: number; team?: string }): Sim {
  const a = new Actor();
  a.id = id;
  a.name = id;
  a.kind = 'player';
  a.x = opts.x;
  a.y = opts.y;
  a.hp = 1000;
  a.maxHp = 1000;
  a.mp = 1000;
  a.maxMp = 1000;
  a.level = 120;
  a.camp = opts.camp ?? 'balance';
  a.pk = opts.pk ?? 2;
  a.team = opts.team ?? '';
  a.protectedUntil = 0;
  const sim = makeSim(id, 'player', a, 'water');
  sim.hp = 1000;
  sim.mp = 1000;
  sim.speed = 240;
  sim.combat = {
    level: 120, element: 'water', weapon: [50, 80], basePhys: 50,
    attackRating: 1000, defense: 100, hitRecover: 0,
    resists: { phys: 0, cold: 0, fire: 0, light: 0, poison: 0 },
    bag: {}, bonuses: {},
  };
  w.add(sim);
  return sim;
}

function addMonster(w: World, id: string, x: number, y: number, boss = 0): Sim {
  const a = new Actor();
  a.id = id;
  a.name = id;
  a.kind = 'monster';
  a.x = x;
  a.y = y;
  a.hp = 5000;
  a.maxHp = 5000;
  a.level = 90;
  a.boss = boss;
  const sim = makeSim(id, 'monster', a, 'fire');
  sim.hp = 5000;
  sim.speed = 180;
  sim.home = { x, y };
  sim.def = {
    id: 1, name: id, sprite: 'enemy001', element: 'fire', level: 90,
    hp: 5000, speed: 180, vision: 400, leash: 800, attackCooldown: 1,
    resist: 0, exp: 100, skills: [1],
  };
  sim.skills.set(1, 1);
  refreshMonsterCombat(sim);
  w.add(sim);
  return sim;
}

test('Thúy Yên 713 (Ngự Tuyết Ẩn): thông số override, vô hình, miễn sát thương và phá ẩn khi đánh', () => {
  const s713 = getSkill(713)!;
  assert.ok(s713, 'skill 713 phải tồn tại');
  assert.equal(s713.noHorse, true, '713 cấm cưỡi ngựa');
  assert.equal(attr(s713, 'hide', 20)?.[1], 15 * 18, 'hide lv20 kéo dài 15s');
  assert.equal(attr(s713, 'fastwalkrun_p', 20)?.[0], 30, 'fastwalkrun_p lv20 = +30%');
  assert.equal(attr1(s713, 'skill_mintimepercast_v', 20), 35 * 18, 'cooldown lv20 = 35s');

  const w = makeWorld();
  const [sx, sy] = [2000, 2000];
  const cy = addPlayer(w, 'cuiyan', { x: sx, y: sy, camp: 'balance', pk: 2 });
  const enemy = addPlayer(w, 'enemy', { x: sx + 40, y: sy, camp: 'evil', pk: 2 });
  const mob = addMonster(w, 'mob1', sx + 50, sy, 0);
  const boss = addMonster(w, 'boss1', sx + 60, sy, 2);

  cy.skills.set(713, 20);
  cy.skills.set(1, 1);
  mob.target = cy.id;
  boss.target = cy.id;

  // Bật Ngự Tuyết Ẩn
  addState(w, cy, { skill: 713, kind: 'buff', ms: 15_000, by: cy.id, level: 20 });
  // Refresh combat bag thủ công giống refreshStats (cho player không có progress)
  cy.combat!.bag = { hide: [1, 270, 0], fastwalkrun_p: [30, 270, 0] };

  assert.equal(isHidden(cy), true, 'Thúy Yên đang ở trạng thái hide');
  assert.equal(attackable(w, enemy, cy), false, 'Đối thủ không thể target Thúy Yên đang tàng hình');
  assert.equal(attackable(w, mob, cy), false, 'Quái không thể target Thúy Yên đang tàng hình');
  assert.equal(attackable(w, boss, cy), false, 'Boss không thể target Thúy Yên đang tàng hình');

  // Quái & Boss cập nhật AI phải mất target Thúy Yên ngay (có thể chuyển sang người khác đang hiện hình)
  updateMonster(w, mob, 0.05);
  updateMonster(w, boss, 0.05);
  assert.notEqual(mob.target, cy.id, 'Quái mất target Thúy Yên khi tàng hình');
  assert.notEqual(boss.target, cy.id, 'Boss mất target Thúy Yên khi tàng hình');

  // Không chịu sát thương khi đang tàng hình
  const hpBefore = cy.hp;
  applyHit(w, enemy, cy, { dmg: 400, crit: false });
  applyHit(w, mob, cy, { dmg: 300, crit: false, dot: true });
  assert.equal(cy.hp, hpBefore, 'Thúy Yên không chịu sát thương khi đang Ngự Tuyết Ẩn');

  // Ra chiêu tấn công sẽ phá tàng hình
  const res = w.engine.cast(cy, 1, enemy, { x: enemy.a.x, y: enemy.a.y });
  assert.equal(res.rejected, undefined);
  assert.equal(cy.states.has(713), false, 'State 713 bị xóa khi Thúy Yên tấn công');
});

test('Thiên Nhẫn 715 -> 723 (Ma Âm Phệ Phách): cooldown 15s, hoảng loạn cả người & quái, và autodeathskill 100%', () => {
  const s715 = getSkill(715)!;
  assert.ok(s715, 'skill 715 phải tồn tại');
  assert.equal(attr1(s715, 'skill_mintimepercast_v', 20), 15 * 18, 'cooldown lv20 = 15s');

  const w = makeWorld();
  w.random = () => 0.5; // 50% >= missRate 15% ở lv20 -> trúng
  const [sx, sy] = [2000, 2000];
  const tr = addPlayer(w, 'tianren', { x: sx, y: sy, camp: 'evil', pk: 2 });
  const victimPlayer = addPlayer(w, 'victimP', { x: sx + 40, y: sy, camp: 'justice', pk: 2 });
  const victimMob = addMonster(w, 'victimM', sx - 40, sy, 0);
  const victimBoss = addMonster(w, 'victimB', sx, sy + 30, 2);

  tr.skills.set(715, 20);
  victimPlayer.skills.set(1, 1);

  // 1. Cast chủ động 715
  const castRes = w.engine.cast(tr, 715, undefined, { x: sx, y: sy }, 50);
  assert.equal(castRes.rejected, undefined);
  // Bước qua timer pose + life của missile 273 (1 tick)
  w.now += 200;
  w.engine.update();
  w.now += Math.ceil(2 * JX_TICK_MS);
  w.engine.update();

  assert.equal(tr.states.has(715), false, 'Không gắn buff rỗng 715 lên bản thân Thiên Nhẫn');
  assert.equal(victimPlayer.states.has(723), true, 'Người chơi địch bị dính hoảng loạn 723');
  assert.equal(victimMob.states.has(723), true, 'Quái thường bị dính hoảng loạn 723');
  assert.equal(victimBoss.states.has(723), true, 'Boss bị dính hoảng loạn 723');

  // Gắn bag randmove cho player test (không có progress) và kiểm tra cấm đánh / chạy loạn
  victimPlayer.combat!.bag = { randmove: [1, 72, 0] };
  assert.equal(isConfused(victimPlayer), true);
  assert.equal(isConfused(victimMob), true);
  assert.equal(isConfused(victimBoss), true);

  // Người chơi hoảng loạn không thể cast hoặc di chuyển tay
  assert.ok(w.engine.check(victimPlayer, 1), 'SkillEngine.check chặn cast khi đang hoảng loạn');
  commandMove(w, victimPlayer, sx + 300, sy);
  assert.equal(victimPlayer.path.length, 0, 'commandMove bị chặn khi đang hoảng loạn');
  commandCast(w, victimPlayer, 1, tr.id, tr.a.x, tr.a.y);
  assert.equal(victimPlayer.pending, null, 'commandCast bị chặn khi đang hoảng loạn');

  // Cập nhật nhiều tick: cả người chơi và quái/boss tự chạy loạn nhưng luôn giữ gọn trong EFFECTS.randMove.maxRadius (50 px)
  const pBefore = { x: victimPlayer.a.x, y: victimPlayer.a.y };
  const mBefore = { x: victimMob.a.x, y: victimMob.a.y };
  let pMoved = false, mMoved = false;
  for (let i = 0; i < 12; i++) {
    w.random = () => (i * 0.27) % 1;
    w.now += 200;
    updatePlayer(w, victimPlayer, 0.2);
    updateMonster(w, victimMob, 0.2);
    if (victimPlayer.a.x !== pBefore.x || victimPlayer.a.y !== pBefore.y) pMoved = true;
    if (victimMob.a.x !== mBefore.x || victimMob.a.y !== mBefore.y) mMoved = true;
    assert.ok(isoDistance(pBefore.x, pBefore.y, victimPlayer.a.x, victimPlayer.a.y) <= EFFECTS.randMove.maxRadius + 2, 'Người chơi hoảng loạn không vượt quá bán kính cho phép');
    assert.ok(isoDistance(mBefore.x, mBefore.y, victimMob.a.x, victimMob.a.y) <= EFFECTS.randMove.maxRadius + 2, 'Quái hoảng loạn không vượt quá bán kính cho phép');
  }
  assert.equal(pMoved, true, 'Người chơi bị hoảng loạn tự chạy ngẫu nhiên');
  assert.equal(mMoved, true, 'Quái bị hoảng loạn tự chạy ngẫu nhiên');

  // 2. Kiểm tra missle_missrate: roll < 15% phải trượt khi cast chủ động
  victimMob.states.clear();
  refreshMonsterCombat(victimMob);
  w.random = () => 0.05; // 5% < 15% missRate -> trượt
  w.now += 20_000;
  w.engine.cast(tr, 715, undefined, { x: sx, y: sy }, 50);
  w.now += 200;
  w.engine.update();
  w.now += Math.ceil(2 * JX_TICK_MS);
  w.engine.update();
  assert.equal(victimMob.states.has(723), false, 'Cast chủ động trượt khi roll < missle_missrate');

  // 3. Kiểm tra autodeathskill: khi Thiên Nhẫn tử vong, gọi 723 tầng 60 (missRate = 0%) -> 100% trúng kể cả roll = 0.01
  victimPlayer.states.clear();
  victimPlayer.combat!.bag = {};
  victimMob.states.clear();
  refreshMonsterCombat(victimMob);
  w.random = () => 0.01;
  kill(w, tr, victimPlayer);
  w.now += Math.ceil(2 * JX_TICK_MS);
  w.engine.update();

  assert.equal(victimPlayer.states.has(723), true, 'autodeathskill gắn hoảng loạn 100% lên người chơi địch khi Thiên Nhẫn chết');
  assert.equal(victimMob.states.has(723), true, 'autodeathskill gắn hoảng loạn 100% lên quái khi Thiên Nhẫn chết');
});
