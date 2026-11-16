import assert from 'node:assert/strict';
import test from 'node:test';
import { autoBuffSkills, FACTION_IDS, getSkill, learnableSkills, levelCap, newProgress, tierOf } from '../packages/shared/src/index.js';
import { configureBotBuffs, maintainBotBuffs } from '../apps/server/src/world/botBuffs.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import type { World } from '../apps/server/src/world/World.js';

function rig(faction: string, level = 150) {
  const a = new Actor(); Object.assign(a, { faction, level, gender: 'male', hp: 100, maxHp: 100, mp: 100, maxMp: 100 });
  const sim = makeSim('buff-learning-' + faction, 'player', a, 'kim', 120);
  sim.progress = { series: 'kim', prog: { ...newProgress(), level, exp: 123, skillPoints: 0, potentialPoints: 17 }, skillExp: new Map([[319, 12345]]) };
  sim.skills = new Map([[1, 1], [2, 1], [53, 1]]);
  sim.equip = {}; sim.bag = [{ uid: 'kept', def: 'potion-2-5' }]; sim.money = 7654321; sim.knb = 12;
  let skillMessages = 0;
  const w = { hooks: { skills() { skillMessages++; }, progress() {} } } as unknown as World;
  return { sim, w, get skillMessages() { return skillMessages; } };
}

test('all 11 factions receive eligible upkeep buffs/auras at their level cap without spending or reallocating points', () => {
  for (const faction of FACTION_IDS) for (const level of [40, 69, 70, 90, 110, 120, 150]) {
    const { sim, w } = rig(faction, level);
    const before = structuredClone({ progress: sim.progress, equip: sim.equip, bag: sim.bag, money: sim.money, knb: sim.knb });
    const learned = learnableSkills(faction);
    const eligible = new Set([...autoBuffSkills(learned), ...learned.filter(id => getSkill(id)?.aura)]);
    configureBotBuffs(w, sim, { autoBuff: true });
    for (const id of eligible) {
      const s = getSkill(id)!;
      if ((tierOf(faction, id)?.level ?? 0) < 90 && (s.reqLevel ?? 1) <= level) {
        assert.equal(sim.skills.get(id), levelCap(s, level), `${faction}/${level}/${id}`);
      }
    }
    assert.deepEqual({ progress: sim.progress, equip: sim.equip, bag: sim.bag, money: sim.money, knb: sim.knb }, before);
    assert.equal(sim.skills.get(1), 1);
  }
});

test('old bot migration preserves offensive levels, practice progress, book locks and existing higher buff levels; repeated entry is idempotent', () => {
  const r = rig('cuiyan', 117);
  r.sim.skills.set(336, 17); r.sim.skills.set(109, 25);
  const before = structuredClone(r.sim.progress);
  assert.equal(configureBotBuffs(r.w, r.sim, { autoBuff: true }), true);
  assert.equal(r.sim.skills.get(100), 20); assert.equal(r.sim.skills.get(109), 25);
  assert.equal(r.sim.skills.get(336), 17);
  for (const id of [713, 1063, 1065]) assert.equal(r.sim.skills.has(id), false);
  assert.deepEqual(r.sim.progress, before);
  const saved = [...r.sim.skills]; const messages = r.skillMessages;
  assert.equal(maintainBotBuffs(r.w, r.sim), false);
  assert.equal(configureBotBuffs(r.w, r.sim, { autoBuff: true }), false);
  assert.deepEqual([...r.sim.skills], saved); assert.equal(r.skillMessages, messages);
});

test('new levels open and upgrade normal buffs while ordinary players and explicit bot opt-out remain unchanged', () => {
  const r = rig('tianwang', 40);
  configureBotBuffs(r.w, r.sim, { autoBuff: true });
  assert.equal(r.sim.skills.get(33), 20); assert.equal(r.sim.skills.has(42), false);
  r.sim.progress!.prog.level = 50;
  assert.equal(maintainBotBuffs(r.w, r.sim), true); assert.equal(r.sim.skills.get(42), 1);
  r.sim.progress!.prog.level = 51;
  maintainBotBuffs(r.w, r.sim); assert.equal(r.sim.skills.get(42), 2);
  const player = rig('tianwang'); assert.equal(maintainBotBuffs(player.w, player.sim), false);
  assert.equal(player.sim.skills.has(42), false);
  configureBotBuffs(player.w, player.sim, { autoBuff: false });
  player.sim.progress!.prog.level = 200; maintainBotBuffs(player.w, player.sim);
  assert.equal(player.sim.skills.has(42), false);
  const existing = [...r.sim.skills]; configureBotBuffs(r.w, r.sim, { autoBuff: false });
  r.sim.progress!.prog.level = 100; maintainBotBuffs(r.w, r.sim);
  assert.deepEqual([...r.sim.skills], existing, 'opt-out does not remove previously learned skills');
});
