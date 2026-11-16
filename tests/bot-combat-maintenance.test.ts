import assert from 'node:assert/strict';
import test from 'node:test';
import { C2S, DEFAULT_AUTO, getSkill, normalizeBotScenario, starterEquipment } from '../packages/shared/src/index.js';
import { BotClient, type RunStats } from '../tools/bots/runner/BotClient.js';
import { makeBehavior } from '../tools/bots/runner/behaviors.js';

function rig(faction = 'shaolin', levels: Record<number, number> = { 1: 1, 2: 1, 53: 1, 319: 20 }) {
  const sc = normalizeBotScenario({ buffVersion: 1, auto: { ...DEFAULT_AUTO, autoMap: false, autoBuff: false,
    autoPickup: false, autoMoney: false, autoHp: 0, autoMp: 0, autoJunk: false } });
  const stats: RunStats = { orders: 0, dropped: 0, deaths: 0, rejoins: 0, transfers: 0, errors: 0, lastError: '' };
  const bot = new BotClient({ username: 'test', token: '', charId: 'test', mapId: 140 }, sc, () => 0, stats);
  const self = { kind: 'player', faction, gender: 'male', level: 150, hp: 10000, maxHp: 10000, mp: 10000, maxMp: 10000,
    mounted: true, states: [] as number[], x: 0, y: 0, boss: 0, sprite: '' };
  const enemy = { ...self, kind: 'monster', mounted: false, x: 100 };
  bot.room = { sessionId: 'self', state: { actors: new Map([['self', self], ['enemy', enemy]]) } } as any;
  bot.online = true; bot.levels = levels;
  const weapon = starterEquipment(faction, 'male').weapon!;
  bot.equip = { weapon: { uid: 'weapon', def: weapon } };
  const sent: { type: string; msg: any }[] = [];
  bot.send = (type, msg) => { sent.push({ type, msg }); };
  bot.host.safe = () => false;
  (bot as any).layoutBar();
  bot.behavior = makeBehavior(bot, sc); bot.behavior.onMap(0);
  return { bot, self, enemy, sent, sc };
}

test('grinding requests dismount, waits for server acknowledgement without attack spam, then uses the learned 90 skill', () => {
  const r = rig(); r.sent.length = 0;
  r.bot.behavior.update(1000);
  assert.deepEqual(r.sent, [{ type: C2S.mount, msg: { on: false } }]);
  r.bot.behavior.update(1250); assert.equal(r.sent.length, 1);
  r.bot.behavior.update(2100); assert.equal(r.sent.filter(x => x.type === C2S.mount).length, 2);
  assert.equal(r.sent.filter(x => x.type === C2S.cast).length, 0);
  r.self.mounted = false; r.bot.behavior.update(2400);
  assert.equal(r.sent.find(x => x.type === C2S.cast)?.msg.skill, 319);
  assert.equal(r.self.mounted, false);
});

test('learned 150 attack works after dismount and basic variants never enter a rotation with faction attacks', () => {
  const r = rig('wudang', { 1: 1, 2: 1, 53: 1, 153: 20, 365: 20, 1079: 20 });
  r.bot.behavior.update(1000); assert.ok(r.sent.some(x => x.type === C2S.mount));
  r.self.mounted = false;
  for (let i = 0; i < 30; i++) r.bot.behavior.update(2000 + i * 1000);
  const ids = r.sent.filter(x => x.type === C2S.cast).map(x => x.msg.skill);
  assert.ok(ids.includes(1079));
  assert.ok(ids.length > 1);
  assert.ok(ids.every(id => getSkill(id)?.pack !== 'common'));
});

test('mounted-compatible combat stays mounted; town, death and social-only activity do not dismount', () => {
  const r = rig('wudu', { 1: 1, 2: 1, 53: 1, 355: 20 });
  r.bot.behavior.update(1000); assert.ok(r.sent.some(x => x.type === C2S.cast && x.msg.skill === 355));
  assert.ok(!r.sent.some(x => x.type === C2S.mount));
  for (const mode of ['town', 'dead', 'social'] as const) {
    const t = rig();
    if (mode === 'town') t.bot.host.safe = () => true;
    if (mode === 'dead') t.self.hp = 0;
    if (mode === 'social') t.bot.behavior = makeBehavior(t.bot, normalizeBotScenario({ activities: { grind: false } }));
    t.sent.length = 0; t.bot.behavior.update(1000);
    assert.ok(!t.sent.some(x => x.type === C2S.mount), mode);
  }
});

test('an unmounted upkeep field can request dismount without an enemy only when auto buff is enabled', () => {
  const r = rig('huashan', { 1: 1, 1376: 20 });
  r.sc.auto.autoBuff = true; (r.bot.room!.state as any).actors.delete('enemy');
  r.sent.length = 0; r.bot.behavior.update(1000);
  assert.ok(r.sent.some(x => x.type === C2S.mount));
  r.self.mounted = false; r.bot.behavior.update(2000);
  assert.ok(r.sent.some(x => x.type === C2S.cast && x.msg.skill === 1376));
  const off = rig('huashan', { 1: 1, 1376: 20 });
  (off.bot.room!.state as any).actors.delete('enemy'); off.bot.behavior.update(1000);
  assert.ok(!off.sent.some(x => x.type === C2S.mount));
});

test('dismount waiting still allows healing and death handling; distant travel keeps the horse', () => {
  const r = rig(); r.sc.auto.autoHp = 50;
  r.self.hp = 10; r.bot.bag = [{ uid: 'potion', def: 'potion-2-5' }];
  r.bot.behavior.update(1000);
  assert.ok(r.sent.some(x => x.type === C2S.use));
  assert.ok(r.sent.some(x => x.type === C2S.mount));
  r.self.hp = 0; r.bot.behavior.update(2000); r.bot.behavior.update(8000);
  assert.ok(r.sent.some(x => x.type === C2S.respawn));
  const travel = rig(); travel.enemy.x = 2000; (travel.bot as any).actorCache.at = -1;
  travel.bot.behavior.update(1000);
  assert.ok(!travel.sent.some(x => x.type === C2S.mount));
});
