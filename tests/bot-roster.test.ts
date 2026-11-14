import assert from 'node:assert/strict';
import { botGreenLines, forgedMagic, magicRange, BOT_DUAL_POTION, ITEMS, SHOP_ITEMS, potionTotal, BOT_LEVEL_BANDS, DEFAULT_BOT_TEMPLATE, HORSES, MAPS, botHorsePool, botMapIds, normalizeBotTemplate, BOT_ROSTER, FACTIONS, factionAllowsGender, normalizeBotScenario } from '../packages/shared/src/index.js';

// Roster edits must keep every saved scenario's identity stable and every character valid.
assert.equal(BOT_ROSTER.length, 200);
assert.equal(new Set(BOT_ROSTER.map(b => b.id)).size, 200);
assert.equal(new Set(BOT_ROSTER.map(b => b.name.toLowerCase())).size, 200);
for (const b of BOT_ROSTER) {
  assert.match(b.id, /^botfixed_\d{3}$/);
  assert.ok(b.name.trim().length >= 2 && b.name.length <= 16, b.name);
  assert.ok(FACTIONS[b.faction], b.name);
  assert.ok(factionAllowsGender(b.faction, b.gender), b.name);
}
const counts = Object.keys(FACTIONS).map(id => BOT_ROSTER.filter(b => b.faction === id).length);
assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, 'All eleven factions should be represented evenly');

const ids = ['botfixed_200', 'botfixed_001'];
assert.deepEqual(normalizeBotScenario({ bots: { usernames: [...ids, ids[0]] } }).bots.usernames, ids);
// Explicit empty selection must never fall back to "all prefix bots".
assert.deepEqual(normalizeBotScenario({ bots: { usernames: [] } }).bots.usernames, []);
assert.equal(normalizeBotScenario({ bots: { prefix: 'bot', count: 10 } }).bots.usernames, undefined);
assert.deepEqual(normalizeBotScenario({ bots: { usernames: ['<script>', 1, ...ids] } }).bots.usernames, ids);
console.log('Bot roster and scenario compatibility checks passed');

assert.deepEqual(BOT_LEVEL_BANDS, [[40,69],[70,90],[110,150]]);
assert.equal(DEFAULT_BOT_TEMPLATE.tiers, true);
assert.equal(DEFAULT_BOT_TEMPLATE.ring, false);
assert.equal(normalizeBotTemplate({ gear: 'green', title: 'Luyện công' }).gear, 'green');
assert.equal(normalizeBotTemplate({ title: 'Luyện công' }).title, 'Luyện công');
for (const level of [40, 69, 70, 90, 110, 150]) {
  const pool = botHorsePool(level); assert.ok(pool.length > 0);
  for (const id of pool) assert.ok(Number(HORSES[id].req.find(([k]) => k === 'requirelevel')?.[1] ?? 0) <= level);
  if (level >= 110) { const eligible = Object.values(HORSES).filter(h => Number(h.req.find(([k]) => k === 'requirelevel')?.[1] ?? 0) <= level); const strongest = Math.max(...eligible.map(h => h.speedPct)); assert.ok(pool.every(id => HORSES[id].speedPct >= strongest - 10)); }
}
assert.ok(botMapIds('town').every(id => MAPS[id].safe));
assert.ok(botMapIds('training').every(id => !MAPS[id].safe));
assert.ok(botMapIds('town').length && botMapIds('training').length);
console.log('Bot level bands, template titles, horse eligibility/strength and map groups passed');

// USER: both mandatory weapon prefixes must survive the six-line selection even on low-tier weapons.
for (const def of SHOP_ITEMS.smith.filter(d => d.kind === 'melee' || d.kind === 'range')) {
  for (let series = 0; series < 5; series++) {
    const lines = botGreenLines(def, series);
    const magic = forgedMagic(lines);
    for (const attr of ['steallifeenhance_p', 'stealmanaenhance_p']) {
      const line = magic.find(l => l[0] === attr);
      assert.ok(line, `${def.id}: missing ${attr}`);
      assert.equal(line[1], magicRange(attr, true)![1]);
      assert.equal(line[2], undefined, 'Steals must be always-active prefixes');
    }
    const attrs = magic.map(l => l[0]);
    assert.equal(new Set(attrs).size, attrs.length);
    assert.ok(magic.length <= 6);
  }
}
assert.equal(DEFAULT_BOT_TEMPLATE.hpPotion, BOT_DUAL_POTION);
assert.equal(DEFAULT_BOT_TEMPLATE.mpPotion, BOT_DUAL_POTION);
assert.ok(DEFAULT_BOT_TEMPLATE.hpCount + DEFAULT_BOT_TEMPLATE.mpCount > 0);
assert.equal(potionTotal(ITEMS[BOT_DUAL_POTION], 'hp'), 5000);
assert.equal(potionTotal(ITEMS[BOT_DUAL_POTION], 'mp'), 5000);
assert.equal(normalizeBotTemplate({}).hpPotion, BOT_DUAL_POTION);
assert.equal(normalizeBotTemplate({ hpPotion: '', hpCount: 0 }).hpCount, 0);
console.log('All smith weapon types/tiers/elements retain max active HP/MP steals; dual potion defaults passed');
