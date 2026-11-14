import assert from 'node:assert/strict';
import test from 'node:test';
import { FACTIONS, describeSkill, getSkill, guessRoute, learnableSkills, levelCap, planPotential, planSkills, raiseError, skillGrowth, skillRoutes } from '../packages/shared/src/index.js';
import { huashanSkillInfo } from '../packages/shared/src/skills/factions/huashan/routes.js';

const zero = { str: 0, dex: 0, vit: 0, eng: 0 };
const known = (faction: string, level: number) => Object.fromEntries(learnableSkills(faction)
  .filter(id => (getSkill(id)!.reqLevel ?? 1) <= level).map(id => [id, 0]));

test('level 60 Qi investment selects Qi, respects trấn phái priority and never adds Sword passive', () => {
  const levels = { ...known('huashan', 60), 1372: 20 };
  const before = structuredClone(levels);
  const plan = planSkills('huashan', undefined, levels, 60, 50);
  assert.equal(guessRoute('huashan', levels)?.id, 'qi');
  assert.equal(guessRoute('huashan', { 1377: 10, 1365: 20 })?.id, 'qi');
  assert.equal(plan.route?.id, 'qi');
  assert.equal(plan.rows.find(r => r.id === 1358)?.to, 1); // Level cap at character level 60.
  assert.equal(plan.rows.find(r => r.id === 1374)?.to, 20);
  assert.equal(plan.rows.some(r => r.id === 1349), false);
  assert.equal(plan.spent, 50);
  assert.deepEqual(levels, before);
});

test('both Hoa Sơn routes keep Trấn phái → level 10 priority and retain surplus', () => {
  for (const route of skillRoutes('huashan')) {
    const levels = known('huashan', 200);
    const first = planSkills('huashan', route.id, levels, 200, 30);
    assert.equal(first.rows.find(r => r.id === 1358)?.to, 30);
    assert.ok(first.rows.filter(r => r.id !== 1358).every(r => r.to === 0));
    const lv10 = route.skills.filter(id => getSkill(id)?.reqLevel === 10);
    const second = planSkills('huashan', route.id, levels, 200, 30 + lv10.length * 20);
    for (const id of lv10) assert.equal(second.rows.find(r => r.id === id)?.to, 20);
    assert.ok(second.rows.filter(r => !lv10.includes(r.id) && r.id !== 1358).every(r => r.to === 0));
    const full = planSkills('huashan', route.id, levels, 200, 1000);
    assert.ok(full.remaining > 0);
    assert.equal(full.spent + full.remaining, 1000);
    assert.ok(full.rows.every(r => r.to === levelCap(getSkill(r.id)!, 200)));
  }
});

test('explicit combat type controls potential without losing equipment requirements or existing investment', () => {
  const levels = { ...known('huashan', 60), 1349: 20, 1372: 20 };
  const qi = planPotential('huashan', 'qi', levels, zero, { str: 20, dex: 20 }, { str: 30, dex: 25 }, 115);
  assert.equal(qi.source, 'internal');
  assert.deepEqual(qi.weights, { str: 0, dex: 5, vit: 90, eng: 5 });
  assert.deepEqual(qi.forItems, { str: 10, dex: 5, vit: 0, eng: 0 });
  assert.equal(qi.add.str, 10);
  assert.equal(qi.spent, 115);
  assert.equal(planPotential('huashan', 'sword', levels, zero, zero, zero, 100).source, 'external');
  assert.equal(levels[1349], 20);
});

test('metadata covers all 28 learning entries and distinguishes shared icons and corrected descriptions', () => {
  assert.equal(learnableSkills('huashan').length, 28);
  for (const id of learnableSkills('huashan')) {
    const text = describeSkill(getSkill(id)!, 1, 20).head.flat().map(s => s.text).join('\n');
    assert.match(text, /Tuyến: (Kiếm Tông|Khí Tông|Dùng chung)/);
    assert.ok(huashanSkillInfo(id));
  }
  const text = (id: number) => describeSkill(getSkill(id)!, 1, 20).head.flat().map(s => s.text).join('\n');
  assert.match(text(1381), /bảo vệ.*hồi phục/);
  assert.doesNotMatch(text(1381), /gây sát thương diện rộng/);
  assert.match(text(1365), /hồi sinh lực/);
  for (const id of [1348, 1352, 1357, 1377, 1384]) assert.match(text(id), /chưa được hỗ trợ/);
  assert.match(text(1364), /thục luyện/);
  assert.equal(skillGrowth(getSkill(1363)!), 'points');
  assert.equal(skillGrowth(getSkill(1364)!), 'practice');
});

test('preview can be replayed by the server point loop; no route spills, practice changes or overspending', () => {
  for (const faction of Object.keys(FACTIONS)) for (const route of skillRoutes(faction)) {
    for (const level of [10, 60, 90, 120, 150, 200]) {
      const levels = known(faction, level);
      const plan = planSkills(faction, route.id, levels, level, 111);
      const applied = { ...levels };
      let left = 111;
      for (const row of plan.rows) for (let k = row.before; k < row.to; k++) {
        assert.equal(raiseError(row.id, applied, level, left), null);
        applied[row.id]++; left--;
      }
      assert.equal(left, plan.remaining);
      for (const row of plan.rows) assert.equal(applied[row.id] ?? 0, row.to);
      for (const id of Object.keys(levels).map(Number)) if (!route.skills.includes(id)) assert.equal(applied[id], levels[id]);
    }
  }
});
