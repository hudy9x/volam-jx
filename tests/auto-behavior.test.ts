import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoPlay, DEFAULT_AUTO, normalizeAuto, normalizeBotScenario, getSkill, skillCategory, isCastable, ITEMS, QUALITY, type AutoHost, type AutoActor, type Item } from '../packages/shared/src/index.js';

function rig() {
  const actor = (id: string, boss: number, x: number): AutoActor => ({ id, x, y: 0, isSelf: false,
    state: { kind: 'monster', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss, sprite: '' } });
  const self = { ...actor('self', 0, 0), isSelf: true };
  const actors = [actor('normal', 0, 20), actor('blue', 1, 40), actor('gold', 2, 80)];
  let bag: (Item | null)[] = [];
  let slots: (number | null)[] = [];
  const casts: number[] = [], pickups: string[] = [], sold: number[] = [];
  const attack = Array.from({ length: 1500 }, (_, id) => getSkill(id)).find(s => s && s.id !== 1 && isCastable(s) && skillCategory(s) === 'attack')!.id;
  const host = { learnedSkills: () => slots.filter((id): id is number => id !== null), aura: (_id: number | null) => {}, self: () => self, actors: () => actors, safe: () => false, skillAt: (slot: 'left' | number) => slot === 'left' ? 1 : slots[slot] ?? null,
    usable: (id: number) => id === 1 || id === attack, ready: (id: number) => id === attack, cost: () => 0, range: () => 500, melee: () => false,
    cast: (id: number) => casts.push(id), move() {}, bag: () => bag, money: () => 100000, use() {}, sell: (i: number) => sold.push(i), buy() {},
    wearable: () => false, drops: () => [{id: 'gear', def: Object.values(ITEMS).find(d => d.kind === 'melee')!.id, q: QUALITY.magic, owner: '', x: 1, y: 0}, {id: 'money', def: 'money', q: 0, owner: '', x: 5, y: 0}], pickup: (id: string) => pickups.push(id), train() {}, goTown() {}, respawn() {}, notice() {}, stop() {} } satisfies AutoHost;
  const auto = new AutoPlay(host);
  const opts = { ...DEFAULT_AUTO, autoMap: false, autoBuff: false, autoCurse: false, autoHp: 0, autoMp: 0, autoPickup: false, autoMoney: false, autoJunk: false };
  return { auto, opts, actors, casts, pickups, sold, attack, slots, host, self, setBag: (b: (Item|null)[]) => { bag = b; } };
}
test('priority finishes the current target, then picks the highest tier; skip still works', () => {
  const r = rig(); const gold = r.actors.pop()!, blue = r.actors.pop()!;
  r.slots.push(r.attack); r.auto.start(); r.auto.update(1000, r.opts);
  r.actors.push(blue); r.auto.update(2000, r.opts);
  assert.equal((r.auto as unknown as { target: string }).target, 'normal');
  r.actors[0].state.hp = 0; r.auto.update(4000, r.opts);
  // Observe cast target through host behavior separately by replacing actor hp: the internal target is what subsequent locks use.
  assert.equal((r.auto as unknown as { target: string }).target, 'blue');
  r.actors.push(gold); blue.state.hp = 0; r.auto.update(7000, r.opts);
  assert.equal((r.auto as unknown as { target: string }).target, 'gold');
  r.actors[0].state.hp = 100; r.auto.update(10000, { ...r.opts, autoSkipBoss: true });
  assert.equal((r.auto as unknown as { target: string }).target, 'normal');
  assert.ok(r.casts.every(id => id === r.attack));
});
test('money pickup independent of equipment pickup and full inventory', () => {
  const r = rig(); r.actors.forEach(a => { a.state.hp = 0; }); r.setBag(Array.from({length: 300}, (_, i) => ({uid: String(i), def: 'potion-2-5'})));
  r.auto.start(); r.auto.update(1000, {...r.opts, autoPickup: true, autoMoney: true});
  assert.deepEqual(r.pickups, ['money']);
});
test('blue selling is opt-in and never sells golden gear or potions', () => {
  const r = rig(); const def = Object.values(ITEMS).find(d => d.kind === 'melee')!.id;
  r.setBag([{uid:'a', def, q: QUALITY.magic}, {uid:'b', def, q: QUALITY.gold}, {uid:'c', def:'potion-2-5'}, {uid:'valuable', def, q: QUALITY.magic, magic: [['a',1],['b',1],['c',1],['d',1],['e',1],['f',1]]}]);
  r.auto.start(); r.auto.update(31000, r.opts); assert.deepEqual(r.sold, []);
  r.auto.update(62000, {...r.opts, autoSellBlue: true}); assert.deepEqual(r.sold, [0]);
});
test('Auto waits in town instead of clearing enabled state when map travel is disabled', () => {
  const r = rig();
  const host = (r.auto as unknown as { host: AutoHost }).host;
  let stopped = false;
  host.safe = () => true; host.stop = () => { stopped = true; };
  r.auto.start(); r.auto.update(1000, {...r.opts, autoMap:false});
  assert.equal(stopped,false);
});

test('boss focus is retained when another boss of the same tier moves closer', () => {
  const r = rig(); r.actors[2].x = 600; r.auto.start(); r.auto.update(1000, r.opts);
  const other = {...r.actors[2], id:'other-gold', x:10, state:{...r.actors[2].state}}; r.actors.push(other);
  r.auto.update(1250, r.opts);
  assert.equal((r.auto as unknown as {target:string}).target, 'gold');
});
test('loot cannot interrupt a living boss lock', () => {
  const r = rig(); r.auto.start(); r.auto.update(1000, r.opts);
  r.auto.update(1250, {...r.opts, autoMoney:true});
  assert.deepEqual(r.pickups, []);
  assert.equal((r.auto as unknown as {target:string}).target, 'gold');
});
test('highest tier then nearest within tier; finish each gold, then each blue, then normal', () => {
  const r=rig(), log:string[]=[];r.host.cast=(_skill,target)=>{if(target)log.push(target.id);};
  const gold=r.actors[2],blue=r.actors[1];
  r.actors.push({...gold,id:'far-gold',x:500,state:{...gold.state}}, {...blue,id:'near-blue',x:10,state:{...blue.state}});
  r.auto.start();r.auto.update(1000,r.opts);assert.equal(log.at(-1),'gold');
  // Movement makes another gold nearer, but cannot steal the active focus.
  r.self.x=490;gold.state.hp=99;r.auto.update(1250,r.opts);assert.equal((r.auto as unknown as {focus:string}).focus,'gold');
  gold.state.hp=0;r.auto.update(1500,r.opts);assert.equal(log.at(-1),'far-gold');
  r.actors.find(a=>a.id==='far-gold')!.state.hp=0;r.auto.update(1750,r.opts);assert.equal(log.at(-1),'blue');
  blue.state.hp=0;r.auto.update(2000,r.opts);assert.equal(log.at(-1),'near-blue');
  r.actors.find(a=>a.id==='near-blue')!.state.hp=0;r.auto.update(2250,r.opts);assert.equal(log.at(-1),'normal');
});
test('blue priority excludes gold, chooses closest blue and finishes it before normal', () => {
  const r=rig();const opts={...r.opts,autoPriority:'blue' as const};r.actors[2].x=1;
  const blue=r.actors[1];r.actors.push({...blue,id:'other-blue',x:600,state:{...blue.state}});
  r.auto.start();r.auto.update(1000,opts);assert.equal((r.auto as unknown as {focus:string}).focus,'blue');
  blue.state.hp=0;r.auto.update(1250,opts);assert.equal((r.auto as unknown as {focus:string}).focus,'other-blue');
  r.actors.find(a=>a.id==='other-blue')!.state.hp=0;r.auto.update(1500,opts);assert.equal((r.auto as unknown as {focus:string}).focus,'normal');
  r.actors[0].state.hp=0;r.auto.update(1750,opts);assert.equal((r.auto as unknown as {focus:string|null}).focus,null);
});
test('buff and curse replace the server cast but preserve selected enemy and resume that enemy', () => {
  for(const category of ['buff','debuff'] as const){
    const r=rig();const skill=Array.from({length:1500},(_,id)=>getSkill(id)).find(s=>s&&!s.aura&&isCastable(s)&&skillCategory(s)===category)!;
    assert.ok(skill);r.host.usable=()=>true;r.host.ready=()=>true;
    r.actors[2].x=300;const gold=r.actors[2];r.auto.start();r.auto.update(1000,r.opts);
    r.slots.push(skill.id);r.actors.push({...gold,id:'closer-gold',x:1,state:{...gold.state}});
    const opts={...r.opts,autoBuff:category==='buff',autoCurse:category==='debuff'};
    r.auto.update(1250,opts);assert.equal((r.auto as unknown as {focus:string}).focus,'gold');
    r.auto.update(1500,opts);assert.equal((r.auto as unknown as {target:string}).target,'gold');
  }
});
test('pickup after kill completes before next lock; cannot steal focus in the next fight', () => {
  const r=rig();let ground=[{id:'money',def:'money',q:0,owner:'',x:5,y:0}];r.host.drops=()=>ground;
  const opts={...r.opts,autoMoney:true};r.auto.start();r.auto.update(1000,opts);assert.deepEqual(r.pickups,[]);
  r.actors[2].state.hp=0;r.auto.update(1250,opts);assert.deepEqual(r.pickups,['money']);
  ground=[];r.auto.update(1500,opts);assert.equal((r.auto as unknown as {target:string}).target,'blue');
  ground=[{id:'new-money',def:'money',q:0,owner:'',x:5,y:0}];r.auto.update(1750,opts);assert.deepEqual(r.pickups,['money']);
});
test('nearest mode may switch, policy changes apply immediately and genuine no-damage targets still time out', () => {
  const r=rig();r.actors[2].x=600;r.auto.start();r.auto.update(1000,r.opts);
  r.auto.update(1250,{...r.opts,autoPriority:'near'});assert.equal((r.auto as unknown as {focus:string}).focus,'normal');
  r.auto.update(1500,{...r.opts,autoPriority:'blue'});assert.equal((r.auto as unknown as {focus:string}).focus,'blue');
  r.auto.update(8000,{...r.opts,autoPriority:'blue'});assert.equal((r.auto as unknown as {focus:string|null}).focus,null);
  r.auto.update(8250,{...r.opts,autoPriority:'blue'});assert.equal((r.auto as unknown as {focus:string}).focus,'normal');
});

test('blue preference survives both player and bot configuration normalizers', () => {
  assert.equal(normalizeAuto({autoPriority:'blue'}).autoPriority,'blue');
  assert.equal(normalizeBotScenario({auto:{autoPriority:'blue'}}).auto.autoPriority,'blue');
});

test('all 11 factions maintain learned buffs with empty hotkeys, excluding stealth and manual cleanse', async () => {
  const { allPacks, learnableSkills } = await import('../packages/shared/src/index.js');
  const expected: Record<string, number[]> = {shaolin:[15,273], tianwang:[33,42], tangmen:[], wudu:[], emei:[], cuiyan:[100,109], gaibang:[277,130], tianren:[150,715], wudang:[157], kunlun:[171], huashan:[1376,1380,1358,1364,1369]};
  for (const p of allPacks().filter(p => !['common', 'monsters'].includes(p.id))) {
    const r = rig(); r.actors.length = 0;
    const learned = [...learnableSkills(p.id), ...learnableSkills('common')];
    r.host.learnedSkills = () => learned;
    r.host.usable = () => true; r.host.ready = () => true;
    r.host.cast = id => { r.casts.push(id); r.self.state.states = [...(r.self.state.states ?? []), id]; };
    r.auto.start();
    for (let i = 0; i < 20; i++) r.auto.update(1000 + i * 1000, {...r.opts, autoBuff: true});
    assert.deepEqual(new Set(r.casts), new Set(expected[p.id]), p.name);
    assert.ok(!r.casts.includes(713), 'never cast Ngự Tuyết Ẩn');
    assert.ok(!r.casts.includes(716), 'do not spam manual cleanse');
  }
});

test('Thúy Yên gets both real buffs despite knowing 120 stealth; does not require a shortcut', () => {
  const r = rig(); r.actors.length = 0;
  r.host.learnedSkills = () => [100, 109, 713]; r.host.usable = r.host.ready = () => true;
  r.host.cast = id => { r.casts.push(id); r.self.state.states = [...(r.self.state.states ?? []), id]; };
  r.auto.start();
  for (let i = 0; i < 4; i++) r.auto.update(1000 + i * 1000, {...r.opts, autoBuff: true});
  assert.deepEqual(r.casts, [100, 109]);
});

test('unready buffs do not block later buffs; active and unusable ones are skipped', () => {
  const r = rig(); r.actors.length = 0;
  r.host.learnedSkills = () => [15, 273, 33, 42];
  r.host.usable = id => id !== 42; r.host.ready = id => id !== 15;
  r.self.state.states = [273];
  r.auto.start(); r.auto.update(1000, {...r.opts, autoBuff: true});
  assert.deepEqual(r.casts, [33]);
});

test('aura chooses learned 120 Nga My over earlier auras, respects usability and restores manual aura on stop', () => {
  const r = rig(); const aura: (number | null)[] = [];
  r.host.learnedSkills = () => [86, 89, 92, 282, 332, 712, 1114];
  r.host.usable = () => true; r.host.aura = id => aura.push(id);
  r.host.safe = () => true;
  r.auto.start(); r.auto.update(1000, {...r.opts, autoBuff: true}); assert.equal(aura.at(-1), 712);
  r.host.usable = id => id !== 712;
  r.auto.update(1250, {...r.opts, autoBuff: true}); assert.equal(aura.at(-1), 332);
  r.auto.update(1500, r.opts); assert.equal(aura.at(-1), null);
  r.auto.stop(); assert.equal(aura.at(-1), null);
});

test('death clears buff retry so revival immediately restores missing learned buffs', () => {
  const r = rig(); r.actors.length = 0;
  r.host.learnedSkills = () => [100]; r.host.usable = r.host.ready = () => true;
  const opts = {...r.opts, autoBuff: true};
  r.auto.start(); r.auto.update(1000, opts); assert.deepEqual(r.casts, [100]);
  r.self.state.hp = 0; r.auto.update(1250, opts);
  r.self.state.hp = 100; r.auto.update(1500, opts); assert.deepEqual(r.casts, [100, 100]);
});

test('acknowledged short buffs can be renewed before the 15s failure retry guard', () => {
  const r = rig(); r.actors.length = 0;
  r.host.learnedSkills = () => [100]; r.host.usable = r.host.ready = () => true;
  const opts = {...r.opts, autoBuff: true};
  r.auto.start(); r.auto.update(1000, opts);
  r.self.state.states = [100]; r.auto.update(1250, opts);
  r.self.state.states = []; r.auto.update(2000, opts);
  assert.deepEqual(r.casts, [100,100]);
});

test('unacknowledged buff commands are throttled, and disabling autoBuff does not cast', () => {
  const r = rig(); r.actors.length = 0;
  r.host.learnedSkills = () => [100]; r.host.usable = r.host.ready = () => true;
  r.auto.start();
  for(let now=1000;now<15000;now+=1000)r.auto.update(now,{...r.opts,autoBuff:true});
  assert.deepEqual(r.casts,[100]);
  r.auto.update(17000,r.opts); assert.deepEqual(r.casts,[100]);
});
