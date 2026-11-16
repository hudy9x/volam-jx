import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoPlay, DEFAULT_AUTO, type AutoHost, type AutoActor, type TrainingMap } from '../packages/shared/src/index.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim, type Sim } from '../apps/server/src/world/entity.js';
import { resolveTrainingTarget } from '../apps/server/src/net/MapRoom.js';
import { db, type CharacterRecord } from '../apps/server/src/account/db.js';

test('AutoPlay does not trigger train on initial level sync; only triggers on real level up', () => {
  const trainCalls: boolean[] = [];
  const selfActor: AutoActor = {
    id: 'bot_1', x: 100, y: 100, isSelf: true,
    state: { kind: 'player', level: 125, hp: 1000, maxHp: 1000, mp: 500, maxMp: 500, boss: 0, sprite: '' },
  };
  const host: AutoHost = {
    learnedSkills: () => [1],
    aura: () => {},
    self: () => selfActor,
    actors: () => [selfActor],
    safe: () => false,
    prepareCombat: () => false,
    skillAt: () => 1,
    usable: () => true,
    ready: () => true,
    cost: () => 0,
    range: () => 100,
    melee: () => true,
    cast: () => {},
    move: () => {},
    bag: () => [],
    money: () => 10000,
    use: () => {},
    sell: () => {},
    buy: () => {},
    wearable: () => false,
    drops: () => [],
    pickup: () => {},
    train: quiet => trainCalls.push(quiet),
    goTown: () => {},
    respawn: () => {},
    notice: () => {},
    stop: () => {},
  };

  const auto = new AutoPlay(host);
  const opts = { ...DEFAULT_AUTO, autoMap: true };

  // 1. Initial start when state might not be synced yet (this.level = 0)
  (auto as any).level = 0;
  auto.start();

  // 2. First update with level 125: must sync level but NOT call train
  auto.update(1000, opts);
  assert.equal(trainCalls.length, 0, 'Initial level sync must not trigger train()');

  // 3. Subsequent update with same level: no train
  auto.update(1050, opts);
  assert.equal(trainCalls.length, 0, 'Same level update must not trigger train()');

  // 4. Real level up: from 125 to 126
  selfActor.state.level = 126;
  auto.update(20000, opts);
  assert.equal(trainCalls.length, 1, 'Real level up must trigger train()');
  assert.equal(trainCalls[0], true);
});

test('resolveTrainingTarget confines bots to their configured setup.map.maps', () => {
  const dummyTrainingList: TrainingMap[] = [
    { mapId: 2, name: 'Hoa Sơn', lo: 10, hi: 19 },
    { mapId: 19, name: 'Kiếm Các Tây Nam', lo: 20, hi: 29 },
    { mapId: 140, name: 'Dược Vương Cốc', lo: 50, hi: 60 },
    { mapId: 26, name: 'Trúc Tơ Động tầng 1', lo: 110, hi: 119 },
    { mapId: 179, name: 'La Tiêu Sơn', lo: 120, hi: 129 },
    { mapId: 68, name: 'Thanh Loa Đảo', lo: 130, hi: 139 },
  ];

  const charId = 'test_bot_char_confinement';
  const charRecord: CharacterRecord = {
    id: charId,
    owner: 'test_bot_owner',
    name: 'TestBot',
    faction: 'shaolin',
    gender: 'male',
    level: 125,
    mapId: 140,
    x: 1000,
    y: 1000,
    bot: {
      template: 'test_tpl',
      level: 125,
      faction: 'shaolin',
      pending: false,
      setup: {
        prefix: 'botfixed', password: 'pass', faction: 'shaolin', gender: 'male', level: [110, 150],
        potential: 'suggest', skills: 'suggest', tiers: true, autoBuff: true, gear: 'gold', ring: false,
        horse: 'random', money: 10000, hpPotion: 'potion-2-5', hpCount: 20, mpPotion: 'potion-2-5', mpCount: 20,
        map: { mode: 'training', maps: [140], radius: 200 },
      },
    },
  };
  db.addCharacter(charRecord);

  const actor = new Actor();
  Object.assign(actor, { kind: 'player', name: 'TestBot', level: 125, hp: 1000, maxHp: 1000, mp: 500, maxMp: 500 });
  const sim = makeSim('test_sess', 'player', actor, 'kim', 100);
  sim.charId = charId;
  sim.progress = { series: 'kim', prog: { level: 125, exp: 0, potential: 0, skillPoints: 0 }, skillExp: new Map() };

  // Case 1: Bot is in map 140 (which is in its allowed maps and non-safe): stays in 140
  const r1 = resolveTrainingTarget(sim, 140, dummyTrainingList);
  assert.equal(r1.alreadyThere, true);
  assert.equal(r1.targetMapId, undefined);

  // Case 2: Bot is in town 37 (after reviving or buying potions): goes to 140, NEVER 179 (La Tiêu Sơn)
  const r2 = resolveTrainingTarget(sim, 37, dummyTrainingList);
  assert.equal(r2.alreadyThere, false);
  assert.equal(r2.targetMapId, 140, 'Bot must return to map 140, not level 125 bãi 179');

  // Case 3: Bot was wrongly in map 179 (La Tiêu Sơn): redirects back to 140
  const r3 = resolveTrainingTarget(sim, 179, dummyTrainingList);
  assert.equal(r3.alreadyThere, false);
  assert.equal(r3.targetMapId, 140, 'Bot in unapproved map 179 must redirect to allowed map 140');

  // Case 4: Bot has multiple allowed maps [2, 19]: selects closest fit within allowed maps
  charRecord.bot!.setup.map.maps = [2, 19];
  db.replaceCharacter(charRecord);

  // Bot level 25 in town: chooses map 19
  sim.progress.prog.level = 25;
  const r4 = resolveTrainingTarget(sim, 37, dummyTrainingList);
  assert.equal(r4.alreadyThere, false);
  assert.equal(r4.targetMapId, 19);

  // Bot level 25 already in map 2 (allowed map): stays in map 2
  const r5 = resolveTrainingTarget(sim, 2, dummyTrainingList);
  assert.equal(r5.alreadyThere, true);

  // Case 5: Ordinary player (no bot record) chooses best map by level across whole server
  const playerActor = new Actor();
  Object.assign(playerActor, { kind: 'player', name: 'Player', level: 125, hp: 1000, maxHp: 1000, mp: 500, maxMp: 500 });
  const playerSim = makeSim('player_sess', 'player', playerActor, 'kim', 100);
  playerSim.progress = { series: 'kim', prog: { level: 125, exp: 0, potential: 0, skillPoints: 0 }, skillExp: new Map() };

  const r6 = resolveTrainingTarget(playerSim, 37, dummyTrainingList);
  assert.equal(r6.alreadyThere, false);
  assert.equal(r6.targetMapId, 179, 'Ordinary player should train in La Tiêu Sơn 179 for level 125');
});
