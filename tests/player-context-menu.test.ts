import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AutoPlay,
  DEFAULT_AUTO,
  ENMITY_COUNTDOWN_MS,
  MAPS,
  PROGRESS_VERSION,
  canAttack,
  isEnmityActive,
  registerNav,
  type AutoActor,
  type AutoHost,
  type CombatantInfo,
} from '@vltk/shared';
import { World } from '../apps/server/src/world/World.js';
import { addPlayer, updatePlayer } from '../apps/server/src/world/players.js';
import { commandEnmity, commandFollow, commandMove } from '../apps/server/src/world/commands.js';
import { kill } from '../apps/server/src/world/systems/combat.js';
import { attackable } from '../apps/server/src/world/targeting.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { MapSchema } from '@colyseus/schema';

function makeWorld(mapId = 140): { world: World; notices: Map<string, string[]> } {
  const map = MAPS[mapId]!;
  registerNav(mapId, {
    kind: 'grid',
    columns: 64,
    rows: 64,
    cellSize: { width: map.raw.size.width / 64, height: map.raw.size.height / 64 },
    blockedBase64: Buffer.alloc(512).toString('base64'),
  });
  const notices = new Map<string, string[]>();
  const world = new World(mapId, new MapSchema<Actor>(), {
    transfer: () => {},
    notify: (sim, text) => {
      const list = notices.get(sim.id) ?? [];
      list.push(text);
      notices.set(sim.id, list);
    },
    log: () => {},
    announce: () => {},
    progress: () => {},
    inventory: () => {},
    skills: () => {},
  });
  return { world, notices };
}

function spawnTestPlayer(world: World, sessionId: string, name: string, faction: string, x: number, y: number) {
  return addPlayer(world, sessionId, {
    id: `char-${sessionId}`,
    name,
    faction,
    gender: 'male',
    level: 80,
    x,
    y,
    progressVersion: PROGRESS_VERSION,
    progress: { level: 80, exp: 0, potentialPoints: 0, skillPoints: 0, spent: { str: 0, dex: 0, vit: 0, eng: 0 } },
  });
}

describe('Cừu sát (enmity 1v1) rules & server lifecycle', () => {
  it('allows both players to attack after 10s countdown regardless of PK=0 and same camp', () => {
    const now = 1_000_000;
    const baseA: CombatantInfo = {
      kind: 'player', id: 'a', dead: false, pk: 0, camp: 'justice', team: '',
      enmityTarget: 'b', enmityAt: now + ENMITY_COUNTDOWN_MS, protectedUntil: 0,
    };
    const baseB: CombatantInfo = {
      kind: 'player', id: 'b', dead: false, pk: 0, camp: 'justice', team: '',
      enmityTarget: 'a', enmityAt: now + ENMITY_COUNTDOWN_MS, protectedUntil: 0,
    };
    // Counting down: neither side may attack yet
    assert.equal(isEnmityActive(baseA, baseB, now + 5_000), false);
    assert.equal(canAttack(baseA, baseB, { safe: false, pvp: true }, now + 5_000), false);
    assert.equal(canAttack(baseB, baseA, { safe: false, pvp: true }, now + 5_000), false);

    // Countdown finished: both sides may attack each other
    const after = now + ENMITY_COUNTDOWN_MS;
    assert.equal(isEnmityActive(baseA, baseB, after), true);
    assert.equal(canAttack(baseA, baseB, { safe: false, pvp: true }, after), true);
    assert.equal(canAttack(baseB, baseA, { safe: false, pvp: true }, after), true);

    // Still blocked in safe zones, non-PvP maps, same team, or Tống Kim
    assert.equal(canAttack(baseA, baseB, { safe: true, pvp: true }, after), false);
    assert.equal(canAttack(baseA, baseB, { safe: false, pvp: false }, after), false);
    assert.equal(isEnmityActive({ ...baseA, team: 't1' }, { ...baseB, team: 't1' }, after), false);
    assert.equal(isEnmityActive({ ...baseA, battleCamp: 'tong' }, { ...baseB, battleCamp: 'kim' }, after), false);
  });

  it('runs full 10s countdown on server, clears on cancel/death/leave, and blocks in Tống Kim', () => {
    const { world, notices } = makeWorld(140);
    world.rules = { safe: false, pvp: true };
    world.now = 500_000;

    const a = spawnTestPlayer(world, 'p1', 'KiemKhach', 'wudang', 1000, 1000);
    const b = spawnTestPlayer(world, 'p2', 'BotTest', 'shaolin', 1080, 1000);
    a.a.protectedUntil = 0;
    b.a.protectedUntil = 0;
    a.a.pk = 0;
    b.a.pk = 0;

    // Start enmity
    commandEnmity(world, a, b.id);
    assert.equal(a.a.enmityTarget, b.id);
    assert.equal(b.a.enmityTarget, a.id);
    assert.equal(a.a.enmityAt, world.now + ENMITY_COUNTDOWN_MS);
    assert.equal(attackable(world, a, b), false);
    assert.equal(attackable(world, b, a), false);

    // Advance 10 seconds
    world.now += ENMITY_COUNTDOWN_MS;
    updatePlayer(world, a, 0.05);
    assert.equal(attackable(world, a, b), true);
    assert.equal(attackable(world, b, a), true);

    // Death clears enmity on both sides
    kill(world, b, a);
    assert.equal(a.a.enmityTarget, '');
    assert.equal(b.a.enmityTarget, '');
    assert.equal(a.enmity, undefined);
    assert.equal(b.enmity, undefined);

    // Blocked in Tống Kim battlefield
    const { world: tkWorld, notices: tkNotices } = makeWorld(378);
    tkWorld.now = 600_000;
    const t1 = spawnTestPlayer(tkWorld, 'tk1', 'Tong1', 'wudang', 2000, 2000);
    const t2 = spawnTestPlayer(tkWorld, 'tk2', 'Kim1', 'shaolin', 2050, 2000);
    t1.a.battleCamp = 'tong';
    t2.a.battleCamp = 'kim';
    commandEnmity(tkWorld, t1, t2.id);
    assert.equal(t1.a.enmityTarget, '');
    assert.ok((tkNotices.get('tk1') ?? []).some(m => m.includes('Tống Kim')));
    assert.ok((notices.get('p1') ?? []).length > 0);
  });

  it('makes AutoPlay (and bots) fight back against active enmity opponent even when autoPk=false', () => {
    const now = Date.now();
    const casts: Array<{ skill: number; targetId?: string }> = [];
    const self: AutoActor = {
      id: 'bot1', x: 1000, y: 1000, isSelf: true,
      state: {
        kind: 'player', level: 80, hp: 2000, maxHp: 2000, mp: 1000, maxMp: 1000,
        boss: false, sprite: '', pk: 0, camp: 'justice', team: '',
        enmityTarget: 'attacker1', enmityAt: now - 1000, protectedUntil: 0,
      },
    };
    const attacker: AutoActor = {
      id: 'attacker1', x: 1050, y: 1000, isSelf: false,
      state: {
        kind: 'player', level: 80, hp: 2000, maxHp: 2000, mp: 1000, maxMp: 1000,
        boss: false, sprite: '', pk: 0, camp: 'justice', team: '',
        enmityTarget: 'bot1', enmityAt: now - 1000, protectedUntil: 0,
      },
    };
    const host: AutoHost = {
      learnedSkills: () => [1],
      aura: () => {},
      self: () => self,
      actors: () => [self, attacker],
      safe: () => false,
      skillAt: slot => (slot === 'left' ? 1 : null),
      usable: () => true,
      ready: () => true,
      cost: () => 0,
      range: () => 200,
      melee: () => false,
      cast: (skill, target) => casts.push({ skill, targetId: target?.id }),
      move: () => {},
      bag: () => [],
      money: () => 0,
      use: () => {},
      sell: () => {},
      buy: () => {},
      wearable: () => false,
      drops: () => [],
      pickup: () => {},
      train: () => {},
      stop: () => {},
    };
    const auto = new AutoPlay(host);
    auto.start(now);
    auto.update(now + 200, { ...DEFAULT_AUTO, autoPk: false });
    assert.equal(casts.length, 1);
    assert.equal(casts[0]!.targetId, 'attacker1');
  });
});

describe('Theo sau (server-side follow)', () => {
  it('follows target within same map without spamming C2S and cancels on move or target leave', () => {
    const { world, notices } = makeWorld(140);
    world.now = 100_000;
    const entry = MAPS[140]!.raw.entry;
    const follower = spawnTestPlayer(world, 'f1', 'NguoiTheo', 'wudang', entry.x, entry.y);
    const leader = spawnTestPlayer(world, 'l1', 'DoiTruong', 'shaolin', entry.x + 180, entry.y);

    commandFollow(world, follower, leader.id);
    assert.equal(follower.a.followTarget, leader.id);
    assert.ok(follower.follow);

    // Tick causes server to compute path toward leader
    updatePlayer(world, follower, 0.05);
    assert.ok(follower.path.length > 0, 'follower should path toward leader');

    // Manual move cancels follow
    commandMove(world, follower, entry.x + 10, entry.y);
    assert.equal(follower.a.followTarget, '');
    assert.equal(follower.follow, undefined);

    // Re-follow, then remove leader from map -> auto-cancels with notice
    commandFollow(world, follower, leader.id);
    world.removeSim(leader.id);
    updatePlayer(world, follower, 0.05);
    assert.equal(follower.a.followTarget, '');
    assert.equal(follower.follow, undefined);
    assert.ok((notices.get('f1') ?? []).some(m => m.includes('rời khỏi bản đồ')));
  });
});
