import assert from 'node:assert/strict';
import test from 'node:test';
import { newProgress, getSkill } from '../packages/shared/src/index.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { refreshStats } from '../apps/server/src/world/progress.js';
import { SKILL_FX } from '../apps/client/src/game/fx/fx.gen.js';

test('Kunlun passive visuals are synced independently; no duplicate timed stats and removed on unlearning', () => {
  const actor = new Actor(); actor.faction = 'kunlun';
  const sim = makeSim('kunlun-fx', 'player', actor, 'tho', 100);
  sim.progress = {series:'tho', prog:newProgress(), skillExp:new Map()};
  sim.skills = new Map([[173,20],[178,20]]);
  refreshStats(sim, true);
  assert.deepEqual([...actor.passiveFx], [173,178]);
  assert.equal(sim.states.size, 0);
  assert.equal(actor.states.length, 0);
  const before = structuredClone(sim.stats);
  const visuals = actor.passiveFx;
  refreshStats(sim);
  assert.deepEqual(sim.stats, before);
  assert.equal(actor.passiveFx, visuals, 'no repeated array patches when unchanged');
  for (const id of actor.passiveFx) assert.ok(SKILL_FX[getSkill(id)!.stateFx!.key]);
  sim.skills.set(173,0); refreshStats(sim);
  assert.deepEqual([...actor.passiveFx], [178]);
  sim.skills.clear(); refreshStats(sim);
  assert.deepEqual([...actor.passiveFx], []);
});

test('legacy bot configs migrate to buff on; a newly saved explicit off stays off across normalization', async () => {
  const {normalizeBotScenario,normalizeBotTemplate,DEFAULT_BOT_TEMPLATE} = await import('../packages/shared/src/index.js');
  assert.equal(normalizeBotScenario({auto:{autoBuff:false}}).auto.autoBuff,true);
  assert.equal(normalizeBotTemplate({tiers:true}).autoBuff,true);
  assert.equal(DEFAULT_BOT_TEMPLATE.autoBuff,true);
  const scenario=normalizeBotScenario({buffVersion:1,auto:{autoBuff:false}});
  assert.equal(scenario.auto.autoBuff,false);
  assert.equal(normalizeBotScenario(scenario).auto.autoBuff,false);
  const setup=normalizeBotTemplate({...DEFAULT_BOT_TEMPLATE,autoBuff:false});
  assert.equal(normalizeBotTemplate(setup).autoBuff,false);
});

test('bot character opt-out is applied to runtime settings and prevents automatic aura selection', async () => {
  const {normalizeBotScenario} = await import('../packages/shared/src/index.js');
  const {BotClient} = await import('../tools/bots/runner/BotClient.js');
  const sc=normalizeBotScenario({auto:{autoBuff:false}}); // legacy => on
  const stats={orders:0,dropped:0,deaths:0,rejoins:0,transfers:0,errors:0,lastError:''};
  for(const [choice,expected]of [[undefined,true],[true,true],[false,false]] as const){
    const bot=new BotClient({username:'test',token:'',charId:'test',mapId:140,autoBuff:choice},sc,()=>0,stats);
    bot.levels={712:20,86:20};
    assert.equal(bot.autoSettings.autoBuff,expected);
    const sent: any[]=[];bot.send=(t,m)=>sent.push({t,m});
    bot.host.aura(null);
    assert.equal(sent.at(-1).m.skill,expected?712:0);
  }
});
