import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FACTIONS, MENPAI, ITEMS, SHOP_ITEMS, WEAPON_NAMES, campOf,
  SkillEngine, getSkill, getMissile, learnTiers, skillCategory, skillGrowth, levelCap, raiseError,
  skillDamage, resolveHit, passiveBag, skillBonuses, playerCombat, characterStats,
  forgeChoices, forgeError, planSkills, seriesPlan, suggestForgeLines, MAGIC_SLOTS, describeSkill, factionSuites, equipError,
  type Combatant, type EnginePort, type FxEvent,
} from '../packages/shared/src/index.js';

function makeFighter(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: 'p1',
    kind: 'player',
    a: { x: 100, y: 100, dir: 0, mounted: false, maxHp: 2000 },
    hp: 2000,
    mp: 1000,
    dead: false,
    element: 'tho',
    baseDamage: [80, 120],
    weaponType: 0,
    skills: new Map(),
    cooldowns: new Map(),
    sp: 0,
    spMax: 0,
    states: new Map(),
    ...overrides,
  };
}

function makeHarness(fighters: Combatant[]) {
  let now = 1000;
  const events: FxEvent[] = [];
  const blinked: Array<{ id: string; x: number; y: number }> = [];
  const addedStates: Array<{ id: string; skill: number; level?: number }> = [];
  const hits: Array<{ attacker: string; target: string; dmg: number }> = [];
  const byId = new Map(fighters.map(f => [f.id, f]));

  const port: EnginePort = {
    now: () => now,
    random: () => 0.25,
    combatants: () => byId.values(),
    get: id => byId.get(id),
    hostile: (a, b) => a.id !== b.id && !b.dead,
    friendly: (a, b) => a.id === b.id,
    damage: (a, b, hit) => {
      hits.push({ attacker: a.id, target: b.id, dmg: hit.dmg });
      b.hp = Math.max(0, b.hp - hit.dmg);
    },
    stats: c => {
      const bag = passiveBag(c.skills, c.weaponType);
      const cs = characterStats({
        series: c.element,
        level: 100,
        added: { str: 100, dex: 50, vit: 100, eng: 100 },
        bag,
        weapon: { kind: c.weaponType >= 100 ? 'ranged' : 'melee', min: c.baseDamage[0], max: c.baseDamage[1] },
      });
      return playerCombat(cs, 100, c.element, c.weaponType, bag, skillBonuses(c.skills));
    },
    heal: (_a, b, v) => { b.hp = Math.min(b.a.maxHp, b.hp + v); },
    addState: (t, st) => {
      addedStates.push({ id: t.id, skill: st.skill, level: st.level });
      t.states?.set(st.skill, { skill: st.skill, kind: st.kind, until: st.ms > 0 ? now + st.ms : 0, by: st.by, level: st.level } as any);
    },
    removeState: (t, sk) => { t.states?.delete(sk); },
    blink: (c, x, y) => {
      c.a.x = Math.round(x);
      c.a.y = Math.round(y);
      blinked.push({ id: c.id, x: c.a.x, y: c.a.y });
    },
    emit: e => events.push(e),
  };

  return {
    engine: new SkillEngine(port),
    advance(ms: number) { now += ms; },
    events, blinked, addedStates, hits,
  };
}

test('Tiêu Dao faction, weapons, items, skills and missiles are registered', () => {
  assert.equal(FACTIONS.xiaoyao?.name, 'Tiêu Dao');
  assert.equal(FACTIONS.xiaoyao?.element, 'tho');
  assert.equal(campOf('xiaoyao'), 'balance');
  assert.equal(MENPAI[12], 'xiaoyao');
  assert.equal(WEAPON_NAMES[103], 'Cổ Cầm');

  for (let lv = 1; lv <= 10; lv++) {
    const item = ITEMS[`range-3-${lv}`];
    assert.ok(item, `Missing Cổ Cầm range-3-${lv}`);
    assert.equal(item.kind, 'range');
    assert.equal(item.type, 3);
    assert.ok(SHOP_ITEMS.smith.some(x => x.id === item.id), `Cổ Cầm ${item.id} missing from Thợ rèn`);
  }

  const tiers = learnTiers('xiaoyao');
  assert.equal(tiers.length, 10);
  assert.ok(getSkill(2116), 'Di Cung Hoán Vũ');
  assert.ok(getSkill(2118), 'Táp Đạp Lưu Tinh');
  assert.ok(getSkill(2129), 'Thập Bộ Nhất Sát');
  assert.ok(getSkill(2136), 'Tùy Ý Khúc');
  assert.ok(getSkill(2142), 'Mai Hoa Tam Lộng');
  assert.ok(getMissile(275), 'Buff carrier missile 275');
  assert.ok(getMissile(645), 'Quảng Lăng Tán missile 645');
  assert.equal(getSkill(2128)?.stateFx?.key, 'skill/xiaoyao/st_253');
  assert.equal(getSkill(2139)?.stateFx?.key, 'skill/xiaoyao/st_254');
  assert.equal(skillCategory(getSkill(2136)!), 'attack');
  assert.equal(skillCategory(getSkill(2142)!), 'attack');
});

test('Di Cung Hoán Vũ (2116) regenerates [Âm Luật] stacks up to 10 and gates cost_sp skills', () => {
  const caster = makeFighter({
    weaponType: 0,
    skills: new Map([[2116, 20], [2118, 20], [2129, 20]]),
  });
  const h = makeHarness([caster]);

  // Without stacks, 2118 (costs 3 at lv20) and 2129 (costs 3) are rejected.
  assert.match(h.engine.check(caster, 2118) ?? '', /Âm Luật/);
  assert.match(h.engine.check(caster, 2129) ?? '', /Âm Luật/);

  // Advance 12 seconds in 1s steps: 2116 autocasts 2117 every 1s (+1 stack), capped at 10.
  for (let i = 0; i < 12; i++) {
    h.engine.update();
    h.advance(1000);
  }
  assert.equal(caster.spMax, 10);
  assert.equal(caster.sp, 10);

  // Cast Táp Đạp Lưu Tinh (2118, Form=13, child=2119): blinks within 280 px, spends 3 stacks, emits missile 638.
  const res = h.engine.cast(caster, 2118, undefined, { x: 500, y: 100 });
  assert.equal(res.rejected, undefined);
  assert.equal(caster.sp, 7);
  assert.equal(h.blinked.length, 1);
  assert.equal(h.blinked[0].x, 380); // 100 + 280 reach
  h.advance(100);
  h.engine.update();
  assert.ok(h.events.some(e => e.t === 'msl' && e.k === 638), 'Child FX missile 638 should spawn on blink');
});

test('Tiêu Dao Cầm lightingdamage_p + addlightingmagic_p & Túy Tửu add_damage_p deal scaled damage', () => {
  const skill = getSkill(2141)!; // Cao Sơn Lưu Thủy (90)
  const baseBag = passiveBag(new Map(), 103);
  const fullBag = passiveBag(new Map([[2137, 20], [2123, 20]]), 103);
  const csBase = characterStats({ series: 'tho', level: 100, added: { str: 20, dex: 20, vit: 100, eng: 200 }, bag: baseBag, weapon: { kind: 'ranged', min: 20, max: 40 } });
  const csFull = characterStats({ series: 'tho', level: 100, added: { str: 20, dex: 20, vit: 100, eng: 200 }, bag: fullBag, weapon: { kind: 'ranged', min: 20, max: 40 } });
  const atkBase = playerCombat(csBase, 100, 'tho', 103, baseBag, {});
  const atkFull = playerCombat(csFull, 100, 'tho', 103, fullBag, {});

  const dBase = skillDamage(skill, 20, 2141, atkBase);
  const dFull = skillDamage(skill, 20, 2141, atkFull);
  assert.ok(dBase.light[0] > 0 && dBase.light[1] > dBase.light[0], 'lightingdamage_p produces positive lightning range');
  assert.ok(dFull.light[0] > dBase.light[0] * 1.5, 'addlightingmagic_p from 2137 + 2123 boosts internal lightning');

  // Verify add_damage_p + me2waterdamage_p in resolveHit
  const targetWater = playerCombat(csBase, 100, 'thuy', 0, {}, {});
  const hitPlain = resolveHit(dBase, { skill, level: 20, attacker: atkBase, target: targetWater, targetLife: 5000, pvp: false }, () => 0.5);
  const hitBoosted = resolveHit(dBase, {
    skill, level: 20,
    attacker: { ...atkBase, bag: { add_damage_p: [10, 0, 0], me2waterdamage_p: [20, 0, 0] } },
    target: targetWater, targetLife: 5000, pvp: false,
  }, () => 0.5);
  assert.ok(hitBoosted.dmg > hitPlain.dmg * 1.25, `Expected boosted dmg (${hitBoosted.dmg}) > 1.25x plain (${hitPlain.dmg})`);
});

test('All 5 lyre SPR icons, blue-item forging for Cổ Cầm, 90/150 levelCap=20, and Trấn phái suggest priority', () => {
  // 1. All 5 lyre icons exist as WebP and are mapped across range-3-1..10
  const usedIcons = new Set<string>();
  for (let lv = 1; lv <= 10; lv++) {
    const it = ITEMS[`range-3-${lv}`];
    assert.ok(it);
    usedIcons.add(it.icon);
    const webp = path.join(process.cwd(), 'apps/client/public/assets', `${it.icon}.webp`);
    assert.ok(fs.existsSync(webp), `Missing extracted guqin icon: ${webp}`);
  }
  assert.equal(usedIcons.size, 5, 'Should use all 5 obj-lyre01..05 icons');

  // 2. Blue-item forge accepts Cổ Cầm (range-3-10)
  const guqin10 = ITEMS['range-3-10'];
  const c0 = forgeChoices(guqin10, 4, 0);
  assert.ok(c0.length > 0, 'Guqin should have forge prefix choices');
  assert.equal(forgeError(guqin10, 4, [[c0[0].attr, c0[0].max], null, null, null, null, null]), null);

  // 3. Skills 90 & 150 are practice skills with levelCap 20 at level 150
  for (const id of [2124, 2129, 2141, 2142]) {
    const s = getSkill(id)!;
    assert.equal(skillGrowth(s), 'practice', `Skill ${id} should be practice`);
    assert.equal(levelCap(s, 150), 20, `Skill ${id} should reach cap 20 at level 150`);
  }

  // 4. Suggest prioritizes Trấn phái Thiên Lý Độc Hành (2123, maxLevel 30) first
  assert.equal(getSkill(2123)?.maxLevel, 30);
  const plan = planSkills('xiaoyao', 'guqin', { 2123: 0, 2136: 0, 2137: 0, 2116: 0 }, 80, 30);
  const tpRow = plan.rows.find(r => r.id === 2123);
  assert.ok(tpRow && tpRow.to === 30, `Expected Trấn phái 2123 to max at 30 first, got ${tpRow?.to}`);
});

test('Kiếm Quyết Phù Vân (2124) spawns a straight trail of swords (639 + final 640) from caster to target', () => {
  assert.equal(getMissile(641)?.collide, 0, 'Invisible carrier M641 must have collide=0');
  assert.equal(getMissile(639)?.collide, 2, 'M639 should have collide=2');
  assert.equal(getMissile(640)?.collide, 2, 'M640 should have collide=2');

  const caster = makeFighter({ id: 'xy1', a: { x: 100, y: 100, dir: 6, mounted: false, maxHp: 2000 }, weaponType: 0, skills: new Map([[2124, 20]]) });
  const enemy = makeFighter({ id: 'm1', kind: 'monster', a: { x: 420, y: 100, dir: 2, mounted: false, maxHp: 5000 }, hp: 5000 });
  const h = makeHarness([caster, enemy]);

  const res = h.engine.cast(caster, 2124, enemy, { x: 420, y: 100 }, 50);
  assert.equal(res.rejected, undefined);

  // Step through cast release + M641 flight (10 ticks * ~55.56ms ≈ 556ms)
  for (let i = 0; i < 30; i++) {
    h.advance(30);
    h.engine.update();
  }

  const m639 = h.events.filter((e): e is Extract<FxEvent, { t: 'msl' }> => e.t === 'msl' && e.k === 639);
  const m640 = h.events.filter((e): e is Extract<FxEvent, { t: 'msl' }> => e.t === 'msl' && e.k === 640);
  assert.equal(m639.length, 3, `Expected 3 fly swords (639), got ${m639.length}`);
  assert.equal(m640.length, 1, `Expected 1 final vanish sword (640), got ${m640.length}`);

  // Swords must progress along the straight line from caster (x=100) toward target (x=420), not stack on x=420.
  assert.ok(m639[0].x > 150 && m639[0].x < m639[1].x && m639[1].x < m639[2].x && m639[2].x < m640[0].x,
    `Expected strictly increasing sword X trail, got ${[...m639, ...m640].map(e => e.x).join(' -> ')}`);
  // All swords inherit the carrier's travel angle (0 rad = east).
  for (const ev of [...m639, ...m640]) {
    assert.equal(ev.a, 0, `Expected sword ${ev.k} to inherit angle 0, got ${ev.a}`);
  }
});

test('suggestForgeLines fills valid max lines for weapon + all 9 remaining slots of Earth weapon seriesPlan', () => {
  const plan = seriesPlan(4, 4); // Vũ khí hệ Thổ, nhân vật hệ Thổ
  assert.equal(plan.series.helm, 4); // Nón Thổ
  assert.equal(plan.series.armor, 3); // Áo Hỏa
  assert.equal(plan.series.amulet, 3); // Dây chuyền Hỏa

  const guqin = ITEMS['range-3-10'];
  const wLines = suggestForgeLines(guqin, 4);
  assert.equal(forgeError(guqin, 4, wLines), null);
  assert.equal(wLines.filter(Boolean).length, 6);

  const PRIORITY_DEF = new Set([
    'allres_p', 'physicsres_p', 'coldres_p', 'fireres_p', 'lightingres_p', 'poisonres_p',
    'freezetimereduce_p', 'stuntimereduce_p', 'poisontimereduce_p',
    'fasthitrecover_v', 'lifereplenish_v', 'manareplenish_v', 'fastwalkrun_p', 'lifemax_v', 'allskill_v',
  ]);
  const SLOT_KIND = {
    helm: 'helm', armor: 'armor', amulet: 'amulet', belt: 'belt', boot: 'boot',
    cuff: 'cuff', ring1: 'ring', ring2: 'ring', pendant: 'pendant',
  } as const;
  for (const slot of MAGIC_SLOTS) {
    if (slot === 'weapon') continue;
    const kind = SLOT_KIND[slot];
    const def = SHOP_ITEMS.smith.filter(it => it.kind === kind && (!it.sex || it.sex === 'm')).sort((a, b) => b.level - a.level)[0];
    assert.ok(def, `Missing smith item for ${slot}`);
    const s = plan.series[slot]!;
    const lines = suggestForgeLines(def, s);
    assert.equal(forgeError(def, s, lines), null, `Invalid suggested lines for ${slot}`);
    // First 4 lines must pick from prioritized resistance / slow / stun / recovery whenever available
    const seen = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const availPriority = forgeChoices(def, s, i).filter(c => !seen.has(c.attr) && PRIORITY_DEF.has(c.attr));
      if (availPriority.length && lines[i]) {
        assert.ok(PRIORITY_DEF.has(lines[i]![0]), `Slot ${slot} line ${i + 1} (${lines[i]![0]}) should be in defensive priority set`);
      }
      if (lines[i]) seen.add(lines[i]![0]);
    }
  }
});

test('Vietnamese skill descriptions, 8 Xiaoyao SFX mp3s, and Mai Hoa Tam Lộng (2142 -> 2143) impact FX', () => {
  // 1. Di Cung Hoán Vũ (2116) & Lạc Nhạn Bình Sa (2138) descriptions
  const d2116 = describeSkill(getSkill(2116)!, 20, 20);
  const text2116 = [...d2116.head, ...d2116.current].map(l => l.map(s => s.text).join('')).join('\n');
  assert.match(text2116, /Hỗ trợ - bị động/);
  assert.match(text2116, /Mỗi 1 giây tự động nhận 1 tầng \[Âm Luật\]/);
  assert.match(text2116, /10 tầng \[Âm Luật\]/);
  assert.match(text2116, /Thời gian làm chậm: -30%/);

  const d2138 = describeSkill(getSkill(2138)!, 20, 20);
  const text2138 = [...d2138.head, ...d2138.current].map(l => l.map(s => s.text).join('')).join('\n');
  assert.match(text2138, /Điều kiện thi triển: 8 tầng \[Âm Luật\]/);

  // 2. All 8 Xiaoyao SFX mp3s exist
  for (const name of ['sf_xy_wgsx_a', 'sf_xy_stlx', 'sf_xy_sbys', 'sf_xy_gls_a', 'sf_xy_lyps', 'sf_xy_gsls', 'sf_xy_mhsn_a', 'sf_xy_ygsd']) {
    const mp3 = path.join(process.cwd(), 'apps/client/public/assets/sound/xiaoyao', `${name}.mp3`);
    assert.ok(fs.existsSync(mp3), `Missing SFX mp3: ${mp3}`);
  }

  // 3. Mai Hoa Tam Lộng (2142, lv20) collides mid-flight (colVanish=true), triggers impact FX + 2143 (M648) on target
  assert.equal(getMissile(647)?.colVanish, true);
  assert.equal(getMissile(645)?.colVanish, true);

  const caster = makeFighter({ id: 'xy2', a: { x: 100, y: 100, dir: 6, mounted: false, maxHp: 2000 }, weaponType: 103, skills: new Map([[2142, 20]]) });
  const enemy = makeFighter({ id: 'm2', kind: 'monster', a: { x: 260, y: 100, dir: 2, mounted: false, maxHp: 5000 }, hp: 5000 });
  const h = makeHarness([caster, enemy]);

  const res = h.engine.cast(caster, 2142, enemy, { x: 260, y: 100 }, 50);
  assert.equal(res.rejected, undefined);

  for (let i = 0; i < 30; i++) {
    h.advance(30);
    h.engine.update();
  }

  // M647 collided on enemy, spawning collide mend + 2143 (M648) + M648 collide FX on enemy
  const m647Hit = h.events.find(e => e.t === 'mend' && e.k === 647 && e.c === 1);
  const m648Spawn = h.events.find(e => e.t === 'msl' && e.k === 648);
  const m648Hit = h.events.find(e => e.t === 'mend' && e.k === 648 && e.c === 1 && e.x === 260);
  assert.ok(m647Hit, 'Expected M647 to emit collide FX on impact');
  assert.ok(m648Spawn, 'Expected M647 collide event to spawn 2143 Dương Quan Tam Điệp (M648)');
  assert.ok(m648Hit, 'Expected M648 range damage to emit collide FX at target position (260, 100)');
});

test('Tiêu Dao has separate male (29/30) and female (31/32) golden suites with matching gender icons & obj-sword56', () => {
  const maleSuites = factionSuites('xiaoyao', 'male');
  const femaleSuites = factionSuites('xiaoyao', 'female');
  assert.equal(maleSuites.length, 2, `Expected 2 male Xiaoyao golden suites, got ${maleSuites.length}`);
  assert.equal(femaleSuites.length, 2, `Expected 2 female Xiaoyao golden suites, got ${femaleSuites.length}`);
  assert.deepEqual(maleSuites.map(s => s.suite), [29, 30]);
  assert.deepEqual(femaleSuites.map(s => s.suite), [31, 32]);

  for (const s of maleSuites) {
    assert.equal(s.pieces.length, 5);
    for (const p of s.pieces) {
      assert.equal(equipError(p, { gender: 'male', faction: 'xiaoyao', level: 120 }), null);
      if (p.kind === 'armor' || p.kind === 'helm') {
        assert.match(p.icon, /^items\/obj-ma-/);
        assert.notEqual(equipError(p, { gender: 'female', faction: 'xiaoyao', level: 120 }), null);
      }
    }
  }
  for (const s of femaleSuites) {
    assert.equal(s.pieces.length, 5);
    for (const p of s.pieces) {
      assert.equal(equipError(p, { gender: 'female', faction: 'xiaoyao', level: 120 }), null);
      if (p.kind === 'armor' || p.kind === 'helm') {
        assert.match(p.icon, /^items\/obj-fm-/);
        assert.notEqual(equipError(p, { gender: 'male', faction: 'xiaoyao', level: 120 }), null);
      }
    }
  }

  assert.equal(ITEMS['gold-xy-29-2'].look, 161);
  assert.equal(ITEMS['gold-xy-29-3'].look, 161);
  assert.equal(ITEMS['gold-xy-30-1'].icon, 'items/obj-sword56');
  assert.equal(ITEMS['gold-xy-30-2'].look, 162);
  assert.equal(ITEMS['gold-xy-30-3'].look, 162);
  assert.equal(ITEMS['gold-xy-31-2'].look, 161);
  assert.equal(ITEMS['gold-xy-31-3'].look, 161);
  assert.equal(ITEMS['gold-xy-32-1'].icon, 'items/obj-sword56');
  assert.equal(ITEMS['gold-xy-32-2'].look, 162);
  assert.equal(ITEMS['gold-xy-32-3'].look, 162);
  assert.ok(fs.existsSync(path.join(process.cwd(), 'apps/client/public/assets/items/obj-sword56.webp')), 'Missing obj-sword56.webp');
});

test('level-0 passives (2127) do not trigger and tier-180 Mai Danh Ẩn Tính (2132) stays completely inactive', () => {
  const s2132 = getSkill(2132)!;
  assert.equal(s2132.inactive, true);
  assert.equal(s2132.reqLevel, 180);
  assert.equal(levelCap(s2132, 200), 0);
  assert.notEqual(raiseError(2132, { 2132: 0 }, 200, 10), null);

  // Fighter has 2127 at level 0 (unlearned points) and 2132 even at forced level 20 -> neither may trigger.
  const xy = makeFighter({
    id: 'xy-lv0',
    a: { x: 100, y: 100, dir: 6, mounted: false, maxHp: 3000 },
    weaponType: 0,
    skills: new Map([[2124, 20], [2127, 0], [2132, 20]]),
  });
  const bot = makeFighter({
    id: 'bot1',
    kind: 'player',
    a: { x: 180, y: 100, dir: 2, mounted: false, maxHp: 5000 },
    hp: 5000,
    skills: new Map([[1, 20]]),
  });
  const h = makeHarness([xy, bot]);

  // Xiaoyao attacks bot: level-0 2127 must NOT trigger 2128 (Túy Tửu).
  h.engine.cast(xy, 2124, bot, { x: 180, y: 100 }, 50);
  // Bot hits Xiaoyao: inactive 2132 must NOT trigger 2133 (Phất Y) / 2134 (Phất Y_Thuẫn).
  h.engine.cast(bot, 1, xy, { x: 100, y: 100 }, 50);
  for (let i = 0; i < 30; i++) {
    h.advance(30);
    h.engine.update();
  }

  assert.equal(xy.states?.has(2128) ?? false, false, 'level-0 2127 must not trigger 2128');
  assert.equal(xy.states?.has(2133) ?? false, false, 'inactive 2132 must not trigger 2133');
  assert.equal(xy.states?.has(2134) ?? false, false, 'inactive 2132 must not trigger 2134');
});





