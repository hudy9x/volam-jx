import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GOLDEN_BOSS_CONFIG,
  GOLDEN_BOSS_DEFAULT_EXP,
  EXP_ELIXIR,
  monsterExp,
  newProgress,
  setExpElixirConfig,
  validateGoldenBossConfig,
} from '../packages/shared/src/index.js';
import { goldenBossFromEntry } from '../packages/shared/src/monsters/monsters.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim, type Sim } from '../apps/server/src/world/entity.js';
import { recordDamage, shareKillExp } from '../apps/server/src/world/progress.js';
import type { World } from '../apps/server/src/world/World.js';

function makePlayer(id: string, level: number, team = '', elixir?: 'normal' | 'special'): Sim {
  const a = new Actor();
  a.id = id;
  a.kind = 'player';
  a.name = id;
  a.x = 100;
  a.y = 100;
  a.level = level;
  a.team = team;
  const sim = makeSim(id, 'player', a, 'kim', 200);
  const prog = newProgress('kim', 'shaolin');
  prog.level = level;
  prog.exp = 0;
  sim.progress = { prog, skillExp: new Map() };
  if (elixir) sim.expBuff = { tier: elixir, until: Date.now() + 60_000 };
  return sim;
}

function makeMonster(id: string, level: number, boss: 0 | 1 | 2, expOverride?: number): Sim {
  const a = new Actor();
  a.id = id;
  a.kind = 'monster';
  a.name = 'Boss Test';
  a.x = 120;
  a.y = 120;
  a.level = level;
  a.boss = boss;
  a.hp = 100_000;
  a.maxHp = 100_000;
  const sim = makeSim(id, 'monster', a, 'kim', 200);
  const entry = structuredClone(GOLDEN_BOSS_CONFIG.bosses[0]);
  entry.level = level;
  if (boss === 2) {
    if (expOverride !== undefined) entry.exp = expOverride;
    else delete entry.exp;
    sim.def = goldenBossFromEntry(entry);
  }
  return sim;
}

function makeWorld(sims: Sim[]): { w: World; logs: { id: string; kind: string; text: string }[] } {
  const logs: { id: string; kind: string; text: string }[] = [];
  const w = {
    sims: new Map(sims.map(s => [s.id, s])),
    hooks: {
      log(sim: Sim, kind: string, text: string) { logs.push({ id: sim.id, kind, text }); },
      progress() {},
      sync() {},
      event() {},
    },
  } as unknown as World;
  return { w, logs };
}

test('Golden Boss default EXP is 4,000,000 and Tiên Thảo Lộ doubles it', () => {
  setExpElixirConfig(EXP_ELIXIR);
  assert.equal(GOLDEN_BOSS_DEFAULT_EXP, 4_000_000);

  const killer = makePlayer('p1', 150, 't1');
  const mate = makePlayer('p2', 150, 't1', 'normal');
  const outsider = makePlayer('p3', 150, '');
  const boss = makeMonster('b1', 150, 2);
  assert.equal(boss.def?.expOverride, 4_000_000);
  recordDamage(boss, outsider, 25_000); // 25% of 100_000 maxHp -> 1,000,000

  const { w, logs } = makeWorld([killer, mate, outsider, boss]);
  shareKillExp(w, boss, killer);

  assert.equal(killer.progress!.prog.exp, 4_000_000);
  // Mate gets 80% = 3,200,000, doubled by Tiên Thảo Lộ = 6,400,000
  assert.equal(mate.progress!.prog.exp, 6_400_000);
  assert.equal(outsider.progress!.prog.exp, 1_000_000);
  assert.ok(logs.some(l => l.id === 'p1' && l.text.includes('4.000.000')));
  assert.ok(logs.some(l => l.id === 'p2' && l.text.includes('6.400.000') && l.text.includes('×2')));

  // Killer with Tiên Thảo Lộ (special) gets 8,000,000
  const killerElixir = makePlayer('p4', 150, '', 'special');
  const boss2 = makeMonster('b2', 150, 2);
  const { w: w2 } = makeWorld([killerElixir, boss2]);
  shareKillExp(w2, boss2, killerElixir);
  assert.equal(killerElixir.progress!.prog.exp, 8_000_000);
});

test('Golden Boss custom EXP override and 0 EXP work; normal/blue monsters unchanged', () => {
  setExpElixirConfig(EXP_ELIXIR);
  const p1 = makePlayer('p1', 150, '', 'normal');
  const customBoss = makeMonster('b1', 150, 2, 6_000_000);
  assert.equal(customBoss.def?.expOverride, 6_000_000);
  const { w } = makeWorld([p1, customBoss]);
  shareKillExp(w, customBoss, p1);
  assert.equal(p1.progress!.prog.exp, 12_000_000);

  const p2 = makePlayer('p2', 150, '', 'normal');
  const zeroBoss = makeMonster('b2', 150, 2, 0);
  const { w: wZero, logs: zeroLogs } = makeWorld([p2, zeroBoss]);
  shareKillExp(wZero, zeroBoss, p2);
  assert.equal(p2.progress!.prog.exp, 0);
  assert.ok(zeroLogs.some(l => l.id === 'p2' && l.text.includes('0 kinh nghiệm')));

  const p3 = makePlayer('p3', 90);
  const normalMob = makeMonster('m1', 90, 0);
  const { w: wMob } = makeWorld([p3, normalMob]);
  shareKillExp(wMob, normalMob, p3);
  assert.equal(p3.progress!.prog.exp, monsterExp(90, 1));
});

test('validateGoldenBossConfig validates exp field', () => {
  const valid = structuredClone(GOLDEN_BOSS_CONFIG);
  valid.bosses[0].exp = 0;
  assert.equal(validateGoldenBossConfig(valid), null);
  valid.bosses[0].exp = 4_000_000;
  assert.equal(validateGoldenBossConfig(valid), null);
  delete valid.bosses[0].exp;
  assert.equal(validateGoldenBossConfig(valid), null);

  const neg = structuredClone(GOLDEN_BOSS_CONFIG);
  neg.bosses[0].exp = -1;
  assert.match(validateGoldenBossConfig(neg) ?? '', /exp/);

  const frac = structuredClone(GOLDEN_BOSS_CONFIG);
  frac.bosses[0].exp = 100.5;
  assert.match(validateGoldenBossConfig(frac) ?? '', /exp/);

  const huge = structuredClone(GOLDEN_BOSS_CONFIG);
  huge.bosses[0].exp = 2_000_000_001;
  assert.match(validateGoldenBossConfig(huge) ?? '', /exp/);
});
