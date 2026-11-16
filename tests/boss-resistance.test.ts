import test from 'node:test';
import assert from 'node:assert/strict';
import { bossResistance, validateBossResistance, validateGoldenBossConfig, GOLDEN_BOSS_CONFIG, SHXT_BOSS_RESISTANCE, MONSTERS } from '../packages/shared/src/index.js';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { refreshMonsterCombat } from '../apps/server/src/world/systems/effects.js';
function monster(tier: number, id = 34) {
  const a = new Actor(); Object.assign(a, {boss:tier,level:150,hp:10000,maxHp:10000});
  const s = makeSim('m','monster',a,'moc',100);s.def=MONSTERS[id];refreshMonsterCombat(s);return s;
}
test('source coefficients, levels, five distinct resists and missing custom NPC', () => {
 assert.equal(Object.keys(SHXT_BOSS_RESISTANCE).length,43);
 assert.deepEqual(bossResistance(582,150).values,{phys:30,cold:75,fire:75,light:75,poison:95});
 for(const level of [10,50,90,100,150,200]) assert.equal(bossResistance(512,level).values.phys,Math.floor(1.5*level-75));
 assert.equal(bossResistance(1194,150).values.phys,243);
 assert.equal(bossResistance(10031,150).values.phys,25);
});
test('blue instance, normal isolation and repeated recomputation', () => {
 const plain=monster(0),blue=monster(1);
 assert.equal(plain.combat!.resist.phys,5);assert.equal(blue.combat!.resist.phys,50);
 assert.equal(blue.combat!.resistMax.phys,95);
 for(let i=0;i<3;i++) {refreshMonsterCombat(blue);assert.equal(blue.combat!.resist.phys,50);}
 assert.equal(MONSTERS[34].resist,0.05);
 const gold=monster(2,582);assert.equal(gold.combat!.resist.phys,30);
});
test('custom values including over-cap roundtrip and server validation', () => {
 const cfg=structuredClone(GOLDEN_BOSS_CONFIG);
 const values={phys:150,cold:40,fire:-20,light:70,poison:0},caps={phys:90,cold:80,fire:75,light:95,poison:0};
 cfg.bosses[0].resistance={mode:'custom',values,caps};
 assert.equal(validateGoldenBossConfig(cfg),null);
 assert.deepEqual(bossResistance(740,200,JSON.parse(JSON.stringify(cfg.bosses[0].resistance))),{values,caps});
 for(const invalid of [null,{}, {mode:'bad'}, {mode:'custom'}, {mode:'custom',values:{...values,phys:NaN},caps}, {mode:'custom',values,caps:{...caps,phys:96}}]) assert.ok(validateBossResistance(invalid));
 assert.equal(validateBossResistance(undefined),null);
 assert.equal(bossResistance(740,150,{mode:'shxt'}).values.phys,90);
});

test('boss bag bonuses, negative caps and damage use production resistance values', async () => {
 const { applyBossResistance, monsterCombat, resolveHit, skillDamage, getSkill } = await import('../packages/shared/src/index.js');
 const bag={physicsres_p:[20,0,0] as [number,number,number], allres_p:[-10,0,0] as [number,number,number], physicsresmax_p:[-20,0,0] as [number,number,number]};
 const stats=monsterCombat(150,'moc',5,0,bag);applyBossResistance(stats,1,34,150);
 assert.equal(stats.resist.phys,60);assert.equal(stats.resist.cold,40);assert.equal(stats.resistMax.phys,75);
 const original=MONSTERS[582];const gold=monster(2,582);
 gold.def={...original,resistance:{mode:'custom',values:{phys:150,cold:1,fire:2,light:3,poison:4},caps:{phys:90,cold:75,fire:75,light:75,poison:75}}};
 refreshMonsterCombat(gold);assert.equal(gold.combat!.resist.phys,90);assert.equal(gold.combat!.resist.cold,1);assert.equal(original.resistance,undefined);
 const s=getSkill(19)!;const atk=monsterCombat(100,'kim',0,0,{});atk.kind='player';
 const hit=(target: ReturnType<typeof monster>)=>resolveHit(skillDamage(s,20,19,atk),{skill:s,level:20,attacker:atk,target:target.combat!,targetLife:10000,pvp:false},()=>0.5).dmg;
 assert.ok(hit(monster(1)) < hit(monster(0)),'blue resistance reduces the same landed attack');
});
