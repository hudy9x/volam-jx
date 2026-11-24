import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoPlay, DEFAULT_AUTO, normalizeAuto, normalizeBotScenario, getSkill, skillCategory, isCastable, ITEMS, QUALITY, type AutoHost, type AutoActor, type AutoActorState, type Item } from '../packages/shared/src/index.js';

function rig() {
  const actor = (id: string, boss: number, x: number): AutoActor => ({ id, x, y: 0, isSelf: false,
    state: { kind: 'monster', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss, sprite: '' } });
  const self: AutoActor & {state: AutoActorState} = { ...actor('self', 0, 0), isSelf: true };
  let acknowledge = true;
  const actors = [actor('normal', 0, 20), actor('blue', 1, 40), actor('gold', 2, 80)];
  let bag: (Item | null)[] = [];
  let slots: (number | null)[] = [];
  const casts: number[] = [], pickups: string[] = [], sold: number[] = [];
  const attack = Array.from({ length: 1500 }, (_, id) => getSkill(id)).find(s => s && s.id !== 1 && isCastable(s) && skillCategory(s) === 'attack')!.id;
  const host = { learnedSkills: () => slots.filter((id): id is number => id !== null), aura: (_id: number | null) => {}, self: () => self, actors: () => actors, safe: () => false, skillAt: (slot: 'left' | number) => slot === 'left' ? 1 : slots[slot] ?? null,
    usable: (id: number) => id === 1 || id === attack, ready: (id: number) => id === attack, cost: () => 0, range: () => 500, melee: () => false,
    cast: (id: number, target?: AutoActor) => { casts.push(id); if(acknowledge && target && skillCategory(getSkill(id)!) === 'attack') self.state.attackTarget = target.id; }, move() {}, bag: () => bag, money: () => 100000, use() {}, sell: (i: number) => sold.push(i), buy() {},
    wearable: () => false, drops: () => [{id: 'gear', def: Object.values(ITEMS).find(d => d.kind === 'melee')!.id, q: QUALITY.magic, owner: '', x: 1, y: 0}, {id: 'money', def: 'money', q: 0, owner: '', x: 5, y: 0}], pickup: (id: string) => pickups.push(id), train() {}, goTown() {}, respawn() {}, notice() {}, stop() {} } satisfies AutoHost;
  const auto = new AutoPlay(host);
  const opts = { ...DEFAULT_AUTO, autoMap: false, autoBuff: false, autoCurse: false, autoHp: 0, autoMp: 0, autoPickup: false, autoMoney: false, autoJunk: false };
  return { auto, opts, actors, casts, pickups, sold, attack, slots, host, self, acknowledge: (on: boolean) => { acknowledge = on; }, setBag: (b: (Item|null)[]) => { bag = b; } };
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
test('in-range loot runs in parallel without interrupting a living boss lock; far loot waits', () => {
  const r = rig();
  r.host.drops = () => [
    { id: 'near-money', def: 'money', q: 0, owner: '', x: 160, y: 0 },
    { id: 'far-money', def: 'money', q: 0, owner: '', x: 210, y: 0 },
  ];
  r.auto.start(); r.auto.update(1000, r.opts);
  r.auto.update(1250, { ...r.opts, autoMoney: true });
  assert.deepEqual(r.pickups, ['near-money']);
  assert.equal((r.auto as unknown as { target: string }).target, 'gold');
});
test('highest tier then nearest within tier; finish each gold, then each blue, then normal', () => {
  const r=rig(), log:string[]=[];r.host.cast=(_skill,target)=>{if(target){log.push(target.id);r.self.state.attackTarget=target.id;}};
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
    // The real server applies the utility before Auto may replace its queued order.
    (category==='buff'?r.self:gold).state.states=[skill.id];
    r.auto.update(1500,opts);assert.equal((r.auto as unknown as {target:string}).target,'gold');
  }
});
test('far pickup after kill completes before next lock; cannot steal focus in the next fight', () => {
  const r=rig();let ground=[{id:'money',def:'money',q:0,owner:'',x:210,y:0}];r.host.drops=()=>ground;
  const opts={...r.opts,autoMoney:true};r.auto.start();r.auto.update(1000,opts);assert.deepEqual(r.pickups,[]);
  r.actors[2].state.hp=0;r.auto.update(1250,opts);assert.deepEqual(r.pickups,['money']);
  ground=[];r.auto.update(1500,opts);assert.equal((r.auto as unknown as {target:string}).target,'blue');
  ground=[{id:'new-money',def:'money',q:0,owner:'',x:210,y:0}];r.auto.update(1750,opts);assert.deepEqual(r.pickups,['money']);
});
test('policy changes apply immediately but unchanged HP never abandons a fight', () => {
  const r=rig();r.actors[2].x=600;r.auto.start();r.auto.update(1000,r.opts);
  r.auto.update(1250,{...r.opts,autoPriority:'near'});assert.equal((r.auto as unknown as {focus:string}).focus,'normal');
  r.auto.update(1500,{...r.opts,autoPriority:'blue'});assert.equal((r.auto as unknown as {focus:string}).focus,'blue');
  r.auto.update(8000,{...r.opts,autoPriority:'blue'});assert.equal((r.auto as unknown as {focus:string|null}).focus,'blue');
  r.actors[1].state.hp=0;
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


test('600px local targets beat a boss across the map in both boss modes', () => {
  for(const autoPriority of ['boss','blue'] as const){
    const r=rig();r.actors[1].x=10000;r.actors[2].x=20000;
    r.auto.start();r.auto.update(1000,{...r.opts,autoPriority});
    assert.equal((r.auto as any).focus,'normal');
  }
});

test('an approach command is not engagement: take a newly encountered local monster', () => {
  for(const x of [1000,10000]){
    const r=rig();r.acknowledge(false);r.actors.splice(0,2);r.actors[0].x=x;
    r.auto.start();r.auto.update(1000,r.opts);
    r.actors.push({id:'on-road',x:100,y:0,isSelf:false,state:{...r.actors[0].state,boss:0}});
    r.auto.update(1250,r.opts);assert.equal((r.auto as any).focus,'on-road');
  }
});

test('server-confirmed engagement survives slow damage, missing mana, cooldown and a closer higher-tier boss', () => {
  for(const condition of ['slow','mana','cooldown','stun'] as const){
    const r=rig();r.actors.splice(1);r.auto.start();r.auto.update(1000,r.opts);
    r.actors.push({id:'new-gold',x:1,y:0,isSelf:false,state:{...r.actors[0].state,boss:2}});
    if(condition==='mana'){r.self.state.mp=0;r.host.ready=()=>false;}
    if(condition==='cooldown')r.host.ready=()=>false;
    if(condition==='stun')r.self.state.ctl=1;
    r.auto.update(8000,r.opts);r.auto.update(15000,r.opts);
    assert.equal((r.auto as any).focus,'normal',condition);
    assert.equal((r.auto as any).bans.size,0,condition);
  }
});

test('600px boundary is isometric and search-off still respects the original anchor radius', () => {
  const r=rig();r.actors[2].x=601;r.actors[1].x=600;
  r.auto.start();r.auto.update(1000,r.opts);assert.equal((r.auto as any).focus,'blue');
  const a=rig();a.actors[2].x=400;a.actors[1].x=250;a.self.x=0;
  a.auto.start();a.auto.update(1000,{...a.opts,autoSeek:false,autoRadius:300});assert.equal((a.auto as any).focus,'blue');
});


test('priority is local to a moving 600px isometric neighbourhood', () => {
  const r=rig();r.actors[2].x=0;r.actors[2].y=301;r.actors[1].x=0;r.actors[1].y=300;
  r.auto.start();r.auto.update(1000,r.opts);assert.equal((r.auto as any).focus,'blue');
});

test('transit stays stable without local enemies, and genuinely blocked travel can be skipped after 6s', () => {
  const r=rig();r.acknowledge(false);r.host.ready=()=>true;r.actors.splice(0,2);r.actors[0].x=10000;
  r.auto.start();r.auto.update(1000,r.opts);
  r.actors.push({id:'far-new-gold',x:2000,y:0,isSelf:false,state:{...r.actors[0].state}});
  r.auto.update(2000,r.opts);assert.equal((r.auto as any).focus,'gold');
  r.auto.update(7250,r.opts);assert.equal((r.auto as any).focus,null);assert.ok((r.auto as any).bans.has('gold'));
  r.auto.update(7500,r.opts);assert.equal((r.auto as any).focus,'far-new-gold');
});

test('long casting, cooldown, mana and control waits never count as blocked travel', () => {
  for(const reason of ['cast','mana','control','cooldown']){
    const r=rig();r.acknowledge(false);r.actors.splice(0,2);r.actors[0].x=10000;
    r.auto.start();r.auto.update(1000,r.opts);
    if(reason==='cast')r.self.state.anim='cast';
    if(reason==='control')r.self.state.ctl=1;
    if(reason==='mana'||reason==='cooldown')r.host.ready=()=>false;
    r.auto.update(15000,r.opts);assert.equal((r.auto as any).focus,'gold',reason);assert.equal((r.auto as any).bans.size,0);
    r.self.state.anim='idle';r.self.state.ctl=0;r.host.ready=()=>true;
    r.auto.update(15500,r.opts);assert.equal((r.auto as any).focus,'gold');
  }
});

test('an engaged target moving out of range is retried, never banned; buff, loot and closer enemies cannot steal it', () => {
  const r=rig();r.auto.start();r.auto.update(1000,r.opts);r.auto.update(1250,r.opts);
  r.actors[2].x=10000;
  r.auto.update(2000,r.opts);r.auto.update(9000,{...r.opts,autoMoney:true});r.auto.update(16000,r.opts);
  assert.equal((r.auto as any).focus,'gold');assert.equal((r.auto as any).bans.size,0);assert.deepEqual(r.pickups,['money']);
});

test('nearest mode also finishes confirmed combat, but manual input and invalid targets release it', () => {
  const r=rig();const opts={...r.opts,autoPriority:'near' as const};r.auto.start();r.auto.update(1000,opts);
  r.self.x=70;r.auto.update(1250,opts);assert.equal((r.auto as any).focus,'normal');
  r.auto.pause(1300);r.auto.update(4500,opts);assert.equal((r.auto as any).focus,'gold');
  r.actors.pop();r.auto.update(5000,opts);assert.equal((r.auto as any).focus,'blue');
});


test('a delayed server acknowledgement beats a newer travel choice', () => {
  const r=rig();r.acknowledge(false);r.actors.splice(0,2);r.actors[0].x=1000;
  r.auto.start();r.auto.update(1000,r.opts);
  r.actors.push({id:'road',x:100,y:0,isSelf:false,state:{...r.actors[0].state,boss:0}});
  r.auto.update(1250,r.opts);assert.equal((r.auto as any).focus,'road');
  r.self.state.attackTarget='gold';r.auto.update(1500,r.opts);
  assert.equal((r.auto as any).focus,'gold');assert.equal((r.auto as any).engaged,'gold');
});

test('explicit start discards a previous manual pause and attacks on its first update', () => {
  const r = rig(); r.auto.pause(1000); r.auto.start(); r.auto.update(1001, r.opts);
  assert.equal(r.casts.length, 1);
  r.auto.stop(); r.auto.pause(2000); r.auto.start(); r.auto.update(2001, r.opts);
  assert.equal(r.casts.length, 2);
});

test('a new target is detected within one server tick', () => {
  const r = rig(); const enemies = r.actors.splice(0); r.auto.start(); r.auto.update(1000, r.opts);
  r.actors.push(...enemies); r.auto.update(1050, r.opts);
  assert.equal(r.casts.length, 1);
});

test('missing buffs cast immediately on start outside safe zones, then curse and attack run', () => {
  const r = rig(); r.slots.push(41); // Thiên Vương curse, alongside learned self buffs
  r.host.learnedSkills = () => [33, 42]; r.host.usable = r.host.ready = () => true;
  const log: {id:number; target?:string}[] = [];
  r.host.cast = (id, target) => {
    log.push({id, target:target?.id});
    if (target && skillCategory(getSkill(id)!) === 'attack') r.self.state.attackTarget = target.id;
    if (skillCategory(getSkill(id)!) === 'buff') r.self.state.states = [...(r.self.state.states ?? []), id];
  };
  const opts = {...r.opts, autoBuff:true, autoCurse:true};
  // Inside safe zone (e.g. Điểm tập trung / thành): no buff is cast
  r.host.safe = () => true;
  r.auto.start(); r.auto.update(500, opts);
  assert.equal(log.length, 0);
  // Outside safe zone: buff immediately on start, then curse and attack
  r.host.safe = () => false;
  r.auto.start(); r.auto.update(1000,opts);
  assert.equal(skillCategory(getSkill(log[0].id)!), 'buff');
  for(let now=1050;now<=4000;now+=50) r.auto.update(now,opts);
  assert.ok(log.some(c=>c.id===33)); assert.ok(log.some(c=>c.id===42));
  assert.ok(log.some(c=>c.id===41 && c.target==='gold'), 'curse is applied to target');
  assert.ok(log.some(c=>skillCategory(getSkill(c.id)!)==='attack' && c.target==='gold'), 'attack follows buffs/curse');
});

test('manual monster focus wins over Auto priorities until a movement releases it', () => {
  const r = rig(); r.auto.start(); r.auto.update(1000,r.opts);
  r.auto.pause(1100, 'normal'); // explicit click, even though a gold boss is nearby
  r.self.state.attackTarget = 'normal';
  r.auto.update(4200,r.opts);
  assert.equal((r.auto as any).focus,'normal');
  r.self.state.anim='hurt'; r.auto.update(8000,r.opts);
  assert.equal((r.auto as any).focus,'normal');
  r.auto.pause(8100,null); r.self.state.attackTarget=''; r.auto.update(11200,r.opts);
  assert.equal((r.auto as any).focus,'gold');
});

test('manual focus survives a buff, range policy and lack of damage but ends with the enemy', () => {
  const r=rig(); r.auto.start(); r.auto.pause(1000,'normal');
  r.auto.pause(1100); // another skill temporarily occupies the queue
  r.actors[0].x=2000;
  r.auto.update(4200,{...r.opts,autoSeek:false,autoRadius:200});
  assert.equal((r.auto as any).focus,'normal');
  r.auto.update(16000,r.opts); assert.equal((r.auto as any).focus,'normal');
  r.actors[0].state.hp=0;r.auto.update(16100,r.opts);
  assert.equal((r.auto as any).focus,'gold');
});

test('toggling Auto preserves an explicit click selection; only walking releases it', () => {
  const r=rig();r.auto.pause(1000,'normal');r.auto.start();r.auto.update(1001,r.opts);
  assert.equal((r.auto as any).focus,'normal');
  r.auto.stop();r.auto.start();r.auto.update(1051,r.opts);
  assert.equal((r.auto as any).focus,'normal');
  r.auto.pause(1100,null);r.auto.start();r.auto.update(1101,r.opts);
  assert.equal((r.auto as any).focus,'gold');
});

test('death releases a manual selection even while Auto is off', () => {
  const r=rig();r.auto.pause(1000,'normal');r.self.state.hp=0;r.auto.update(1100,r.opts);
  r.self.state.hp=100;r.auto.start();r.auto.update(1200,r.opts);
  assert.equal((r.auto as any).focus,'gold');
});

test('an unacknowledged queued buff is not overwritten by the next attack or another buff', () => {
  const r=rig();r.host.learnedSkills=()=>[15,273];r.host.usable=r.host.ready=()=>true;
  const opts={...r.opts,autoBuff:true};r.auto.start();r.auto.update(1000,opts);
  r.auto.update(1050,opts);assert.equal(r.casts.at(-1),15);
  const sent=r.casts.length;
  for(let now=1100;now<2000;now+=50)r.auto.update(now,opts);
  assert.equal(r.casts.length,sent,'wait for the server to finish the current attack and apply the buff');
  assert.equal((r.auto as any).focus,'gold');
  r.self.state.states=[15];r.auto.update(2000,opts);assert.equal(r.casts.at(-1),273);
  r.self.state.states=[15,273];r.auto.update(2050,opts);
  assert.equal(skillCategory(getSkill(r.casts.at(-1)!)!),'attack');
});

test('a rejected utility times out without forgetting the enemy, and a manual command cancels the wait', () => {
  const r=rig();r.host.learnedSkills=()=>[15];r.host.usable=r.host.ready=()=>true;
  const opts={...r.opts,autoBuff:true};r.auto.start();r.auto.update(1000,opts);
  assert.equal(r.casts.at(-1),15);
  r.auto.update(4050,opts);assert.equal(skillCategory(getSkill(r.casts.at(-1)!)!),'attack');
  const t=rig();t.host.learnedSkills=()=>[15];t.host.usable=t.host.ready=()=>true;t.auto.start();t.auto.update(1000,opts);
  assert.equal(t.casts.at(-1),15);
  t.auto.pause(1100,null);t.auto.update(1300,opts);
  assert.equal(skillCategory(getSkill(t.casts.at(-1)!)!),'attack');
});

test('manual move waits autoManualPauseMs (150ms) and until running stops, then attacks immediately', () => {
  const r = rig();
  assert.equal(DEFAULT_AUTO.autoManualPauseMs, 150);
  r.auto.start();
  r.auto.update(1000, r.opts);
  const initialCasts = r.casts.length;

  r.auto.pause(1100, null);
  r.self.state.anim = 'run';
  // Within 150ms: still paused
  r.auto.update(1200, r.opts);
  assert.equal(r.casts.length, initialCasts);
  // After 150ms, still running to destination: still waits
  r.auto.update(1300, r.opts);
  assert.equal(r.casts.length, initialCasts);
  // Arrived (idle): attacks immediately on that tick
  r.self.state.anim = 'idle';
  r.auto.update(1350, r.opts);
  assert.ok(r.casts.length > initialCasts);
});

test('teammate drops are picked up in parallel during combat and manual pause; outsider drops skipped', () => {
  const r = rig();
  r.self.state.team = 'team-1';
  const def = Object.values(ITEMS).find(d => d.kind === 'melee')!.id;
  r.actors.push(
    { id: 'mate', x: 50, y: 0, isSelf: false, state: { kind: 'player', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss: 0, sprite: '', team: 'team-1' } },
    { id: 'stranger', x: 50, y: 0, isSelf: false, state: { kind: 'player', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss: 0, sprite: '', team: 'team-2' } },
  );
  r.host.drops = () => [
    { id: 'mate-gear', def, q: QUALITY.magic, owner: 'mate', team: 'team-1', x: 30, y: 0 },
    { id: 'stranger-gear', def, q: QUALITY.magic, owner: 'stranger', team: 'team-2', x: 20, y: 0 },
    { id: 'mate-no-actor', def, q: QUALITY.magic, owner: 'offline-mate', team: 'team-1', x: 40, y: 0 },
  ];
  const opts = { ...r.opts, autoPickup: true, autoMoney: true };
  r.auto.start();
  r.auto.pause(1000, null);
  // Even during manual pause and live boss combat, in-range teammate drops are picked up immediately without delay.
  r.auto.update(1050, opts);
  assert.deepEqual(r.pickups, ['mate-gear', 'mate-no-actor']);
});

test('autoLootPriority detects drops within 1200 and prioritizes looting over bosses and monsters', () => {
  const r = rig();
  r.self.state.team = 'team-1';
  const def = Object.values(ITEMS).find(d => d.kind === 'melee')!.id;
  r.host.drops = () => [
    { id: 'far-drop-1100', def, q: QUALITY.magic, owner: 'mate', team: 'team-1', x: 1100, y: 0 },
    { id: 'too-far-1300', def, q: QUALITY.magic, owner: 'mate', team: 'team-1', x: 1300, y: 0 },
  ];
  const opts = { ...r.opts, autoPickup: true, autoLootPriority: true };
  r.auto.start();
  r.auto.update(1000, opts);
  assert.deepEqual(r.pickups, ['far-drop-1100']);
  assert.equal(r.casts.length, 0);
  assert.equal((r.auto as unknown as { focus: string | null }).focus, null);
  // After far-drop-1100 is gone, too-far-1300 (> 1200) does not block fighting the boss.
  r.host.drops = () => [{ id: 'too-far-1300', def, q: QUALITY.magic, owner: 'mate', team: 'team-1', x: 1300, y: 0 }];
  r.auto.update(3000, opts);
  assert.equal((r.auto as unknown as { focus: string | null }).focus, 'gold');
});

test('autoSellAllBlue sells every blue gear regardless of lines/value, and works in town without autoMap', () => {
  const r = rig();
  const def = Object.values(ITEMS).find(d => d.kind === 'melee')!.id;
  r.setBag([
    { uid: 'ordinary', def, q: QUALITY.magic },
    { uid: 'valuable-6lines', def, q: QUALITY.magic, magic: [['lifemax_v', 200], ['allres_p', 20], ['attackspeed_v', 30], ['d', 1], ['e', 1], ['f', 1]] },
    { uid: 'gold-item', def, q: QUALITY.gold },
    { uid: 'potion', def: 'potion-2-5' },
  ]);
  r.auto.start();
  // autoSellBlue + autoKeepValuable keeps the 6-line item.
  r.auto.update(31000, { ...r.opts, autoSellBlue: true, autoKeepValuable: true });
  assert.deepEqual(r.sold, [0]);
  // autoSellAllBlue sells all blue items (both 0 and 1), even in town with autoMap & autoReturnTraining off.
  r.sold.length = 0;
  r.host.safe = () => true;
  r.auto.update(62000, { ...r.opts, autoMap: false, autoReturnTraining: false, autoSellAllBlue: true, autoKeepValuable: true });
  assert.deepEqual(r.sold, [0, 1]);
  assert.equal(normalizeAuto({ autoLootPriority: true, autoSellAllBlue: true }).autoLootPriority, true);
  assert.equal(normalizeAuto({ autoLootPriority: true, autoSellAllBlue: true }).autoSellAllBlue, true);
  assert.equal(normalizeAuto({ autoSellAllBlue: true, autoKeepValuable: true }).autoKeepValuable, false);
});

test('sellBatch sends a single batch for multiple junk items, and pickInRange throttles bursts', () => {
  const def = Object.values(ITEMS).find(d => d.kind === 'melee')!.id;
  const batches: number[][] = [];
  const r = rig();
  r.host.sellBatch = indices => batches.push(indices);
  r.setBag(Array.from({ length: 35 }, (_, i) => ({ uid: `blue-${i}`, def, q: QUALITY.magic })));
  r.auto.start();
  r.auto.update(31000, { ...r.opts, autoSellAllBlue: true });
  assert.equal(batches.length, 1);
  assert.equal(batches[0].length, 35);
  assert.equal(r.sold.length, 0);

  // Parallel pickup caps each burst at 2 items and waits 120ms before the next burst.
  const drops = Array.from({ length: 5 }, (_, i) => ({ id: `d-${i}`, def: 'money', q: 0, owner: '', x: i + 1, y: 0 }));
  r.host.drops = () => drops;
  r.pickups.length = 0;
  r.auto.update(31100, { ...r.opts, autoMoney: true });
  assert.deepEqual(r.pickups, ['d-0', 'd-1']);
  r.auto.update(31150, { ...r.opts, autoMoney: true });
  assert.deepEqual(r.pickups, ['d-0', 'd-1']);
  r.auto.update(31230, { ...r.opts, autoMoney: true });
  assert.deepEqual(r.pickups, ['d-0', 'd-1', 'd-2', 'd-3']);
  r.auto.update(31360, { ...r.opts, autoMoney: true });
  assert.deepEqual(r.pickups, ['d-0', 'd-1', 'd-2', 'd-3', 'd-4']);
});

test('autoPk prioritizes hostile players over golden bosses and monsters, and respects allies', () => {
  const r = rig();
  r.actors.length = 0;
  r.self.state.pk = 1;
  r.self.state.camp = 'justice';
  r.self.state.battleCamp = 'tong';
  r.actors.push(
    { id: 'gold-boss', x: 100, y: 0, isSelf: false, state: { kind: 'monster', level: 90, hp: 5000, maxHp: 5000, mp: 100, maxMp: 100, boss: 2, sprite: 'enemy157', battleCamp: 'kim' } },
    { id: 'ally-player', x: 80, y: 0, isSelf: false, state: { kind: 'player', level: 90, hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, boss: 0, sprite: '', pk: 1, camp: 'evil', battleCamp: 'tong' } },
    { id: 'enemy-player', x: 250, y: 0, isSelf: false, state: { kind: 'player', level: 90, hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, boss: 0, sprite: '', pk: 1, camp: 'evil', battleCamp: 'kim' } },
  );

  // Khi autoPk tắt: chỉ đánh gold-boss, bỏ qua người chơi
  r.auto.start();
  r.auto.update(1000, { ...r.opts, autoPk: false, autoPriority: 'boss' });
  assert.equal(r.self.state.attackTarget, 'gold-boss');

  // Khi autoPk bật: ưu tiên enemy-player cao hơn cả gold-boss dù xa hơn; bỏ qua ally-player
  r.self.state.attackTarget = '';
  r.auto.start();
  r.auto.update(2000, { ...r.opts, autoPk: true, autoPriority: 'boss' });
  assert.equal(r.self.state.attackTarget, 'enemy-player');
});

test('autoMonster=false skips all monsters and bosses, while still buffing, cursing and attacking enemy players', () => {
  const r = rig();
  r.slots.push(41); // Thiên Vương curse (debuff)
  r.host.learnedSkills = () => [100, 109]; // Thúy Yên buffs
  r.host.usable = r.host.ready = () => true;
  r.self.state.pk = 1;
  r.self.state.camp = 'justice';
  r.self.state.battleCamp = 'tong';
  const log: { id: number; target?: string }[] = [];
  r.host.cast = (id, target) => {
    log.push({ id, target: target?.id });
    if (skillCategory(getSkill(id)!) === 'buff') r.self.state.states = [...(r.self.state.states ?? []), id];
    if (target && skillCategory(getSkill(id)!) === 'debuff') target.state.states = [...(target.state.states ?? []), id];
    if (target && skillCategory(getSkill(id)!) === 'attack') r.self.state.attackTarget = target.id;
  };

  // Khi chỉ có quái/boss mà tắt autoMonster: vẫn tự buff đầy đủ nhưng không đánh quái
  const pveOffOpts = { ...r.opts, autoMonster: false, autoPk: true, autoBuff: true, autoCurse: true };
  r.auto.start();
  r.auto.update(1000, pveOffOpts);
  r.auto.update(1400, pveOffOpts);
  r.auto.update(1800, pveOffOpts);
  assert.deepEqual(log.map(c => c.id), [100, 109]);
  assert.equal((r.auto as unknown as { focus: string | null }).focus, null);

  // Khi xuất hiện người chơi địch: tự tung bùa hại lên người chơi địch rồi đánh người chơi đó, vẫn bỏ qua quái/boss
  r.actors.push({
    id: 'enemy-player', x: 200, y: 0, isSelf: false,
    state: { kind: 'player', level: 90, hp: 1000, maxHp: 1000, mp: 100, maxMp: 100, boss: 0, sprite: '', pk: 1, camp: 'evil', battleCamp: 'kim' },
  });
  r.auto.update(2200, pveOffOpts);
  assert.equal(log.at(-1)?.id, 41);
  assert.equal(log.at(-1)?.target, 'enemy-player');
  r.auto.update(2600, pveOffOpts);
  assert.equal(r.self.state.attackTarget, 'enemy-player');
  assert.equal(normalizeAuto({ autoMonster: false }).autoMonster, false);
  assert.equal(normalizeAuto({}).autoMonster, true);
});

test('pickInRange picks pass-by items within 180 iso with noWalk=true, and server noWalk never hijacks path or pending cast', async () => {
  const { DROPS } = await import('../packages/shared/src/index.js');
  const { Actor, Ground } = await import('../apps/server/src/net/schema.js');
  const { makeSim } = await import('../apps/server/src/world/entity.js');
  const { pickup } = await import('../apps/server/src/world/systems/drops.js');

  assert.equal(DROPS.pickupRange, 180);
  const r = rig();
  const calls: { id: string; noWalk?: boolean }[] = [];
  r.host.pickup = (id, noWalk) => calls.push({ id, noWalk });
  r.host.drops = () => [
    { id: 'pass-by-175', def: 'money', q: 0, owner: '', x: 175, y: 0 },
    { id: 'beyond-195', def: 'money', q: 0, owner: '', x: 195, y: 0 },
  ];
  r.auto.start();
  r.auto.update(1000, { ...r.opts, autoMoney: true });
  assert.deepEqual(calls, [{ id: 'pass-by-175', noWalk: true }]);

  // Server check: if player has already moved beyond 180 by the time noWalk packet arrives, do not overwrite pending/path
  const a = new Actor();
  Object.assign(a, { kind: 'player', x: 250, y: 0, hp: 100, maxHp: 100 });
  const sim = makeSim('p1', 'player', a, 'kim', 100);
  const pendingOrder = { skill: 1, targetId: 'm1', x: 300, y: 0, repathAt: 0, lock: true };
  sim.pending = pendingOrder;
  const g = new Ground();
  Object.assign(g, { x: 0, y: 0, def: 'money', q: 0, amount: 100, owner: '', team: '', ownerUntil: 0 });
  const w = {
    now: 1000,
    sims: new Map([[sim.id, sim]]),
    ground: new Map([['d1', { id: 'd1', item: null, money: 100, x: 0, y: 0, owner: '', team: '', ownerUntil: 0, until: 99999, g }]]),
    hooks: { notify() {}, log() {} },
  } as never;
  assert.equal(pickup(w, sim, 'd1', true), false);
  assert.equal(sim.pickup, undefined);
  assert.equal(sim.pending, pendingOrder);
});

test('canPaySkillCost checks cost_sp (Âm Luật); AutoPlay starts with left-hand skill and waits for cooldown/sp when autoRotate=false', async () => {
  const { skillResourceCost, canPaySkillCost } = await import('../packages/shared/src/index.js');
  const s2129 = getSkill(2129)!; // Thập Bộ Nhất Sát (requires 3 [Âm Luật], cooldown 3s)
  const s2124 = getSkill(2124)!; // Kiếm Quyết Phù Vân (no sp cost, cooldown 0)
  const cost2129 = skillResourceCost(s2129, 20);
  assert.equal(cost2129.sp, 3);
  assert.equal(canPaySkillCost(cost2129, { hp: 1000, mp: 1000, maxHp: 1000, sp: 2 }), false);
  assert.equal(canPaySkillCost(cost2129, { hp: 1000, mp: 1000, maxHp: 1000, sp: 3 }), true);

  const r = rig();
  r.self.state.mp = 1000;
  r.self.state.maxMp = 1000;
  (r.self.state as { sp?: number }).sp = 3;
  let cd2129Until = 0;
  let nowMs = 1000;
  r.host.skillAt = slot => (slot === 'left' ? 2129 : slot === 0 ? 2124 : null);
  r.host.usable = id => id === 2129 || id === 2124 || id === 1;
  r.host.resourceCost = id => {
    const s = getSkill(id);
    return s ? skillResourceCost(s, 20) : undefined;
  };
  r.host.ready = id => {
    const s = getSkill(id);
    if (!s) return false;
    if (id === 2129 && nowMs < cd2129Until) return false;
    return canPaySkillCost(skillResourceCost(s, 20), r.self.state);
  };
  r.host.cast = (id, target) => {
    r.casts.push(id);
    if (id === 2129) {
      (r.self.state as { sp?: number }).sp = Math.max(0, ((r.self.state as { sp?: number }).sp ?? 0) - 3);
      cd2129Until = nowMs + 3000;
    }
    if (target) r.self.state.attackTarget = target.id;
  };

  // 1) autoRotate = false: chỉ đánh chiêu tay trái (2129), khi đang hồi chiêu hoặc thiếu Âm Luật thì chờ chứ không nhảy sang 2124 hay đánh thường.
  const noRotateOpts = { ...r.opts, autoRotate: false };
  r.auto.start();
  r.auto.update(nowMs, noRotateOpts);
  assert.deepEqual(r.casts, [2129]);

  // Trong thời gian hồi chiêu 3s hoặc chưa đủ 3 tầng Âm Luật: không chuyển sang 2124 hay đánh thường (1)
  nowMs = 2000;
  r.auto.update(nowMs, noRotateOpts);
  assert.deepEqual(r.casts, [2129]);

  // Hết 3s cooldown nhưng mới có 2 tầng Âm Luật: vẫn chờ đủ 3 tầng
  nowMs = 4500;
  (r.self.state as { sp?: number }).sp = 2;
  r.auto.update(nowMs, noRotateOpts);
  assert.deepEqual(r.casts, [2129]);

  // Đủ 3 tầng Âm Luật và hết cooldown: tiếp tục đánh 2129
  nowMs = 5000;
  (r.self.state as { sp?: number }).sp = 3;
  r.auto.update(nowMs, noRotateOpts);
  assert.deepEqual(r.casts, [2129, 2129]);

  // 2) autoRotate = true: đòn đầu tiên vào mục tiêu vẫn ưu tiên chiêu tay trái (2129) khi đủ Âm Luật, sau đó mới xoay sang 2124 khi 2129 hồi chiêu.
  r.casts.length = 0;
  cd2129Until = 0;
  (r.self.state as { sp?: number }).sp = 3;
  nowMs = 10000;
  const rotateOpts = { ...r.opts, autoRotate: true };
  r.auto.start();
  r.auto.update(nowMs, rotateOpts);
  assert.equal(r.casts[0], 2129, 'first hit with autoRotate=true starts with left-hand mainSkill 2129');
  nowMs = 11300;
  r.auto.update(nowMs, rotateOpts);
  assert.deepEqual(r.casts, [2129, 2124], 'rotates to 2124 while 2129 is on cooldown');
});

test('auto-mounts on long travel (> 450 iso) for combat, return-to-anchor and loot, throttled at 1s and skipped without horse', () => {
  const r = rig();
  const mounts: boolean[] = [];
  const moves: { x: number; y: number }[] = [];
  r.self.state.horse = 'horse-1';
  r.self.state.mounted = false;
  r.host.mount = (on: boolean) => { mounts.push(on); r.self.state.mounted = on; };
  r.host.move = (x: number, y: number) => { moves.push({ x, y }); };

  // 1) Far enemy (> 450 iso): auto-mounts even before casting
  r.actors.splice(0, r.actors.length, {
    id: 'far', x: 700, y: 0, isSelf: false,
    state: { kind: 'monster', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss: 0, sprite: '' },
  });
  r.slots.push(2124);
  r.host.skillAt = slot => (slot === 'left' ? 2124 : r.slots[slot] ?? null);
  r.host.usable = id => id === 2124;
  r.host.ready = id => id === 2124;
  r.host.range = () => 300;

  r.auto.start();
  r.auto.update(1000, r.opts);
  assert.deepEqual(mounts, [true], 'should mount when approaching target > 450 iso');

  // 2) Throttling: if server hasn't confirmed mounted=true yet, does not spam mount within 1000ms
  mounts.length = 0;
  r.self.state.mounted = false;
  r.auto.update(1500, r.opts);
  assert.deepEqual(mounts, [], 'throttles mount command within 1000ms');
  r.auto.update(2100, r.opts);
  assert.deepEqual(mounts, [true], 'retries mount after 1000ms');

  // 3) Without a horse equipped, never sends mount
  mounts.length = 0;
  r.self.state.horse = '';
  r.self.state.mounted = false;
  r.auto.update(3500, r.opts);
  assert.deepEqual(mounts, []);

  // 4) Returning to anchor > 450 iso also auto-mounts (anchor was updated to 700 during autoSeek)
  r.self.state.horse = 'horse-1';
  r.actors.length = 0;
  r.self.x = 1300;
  r.auto.update(5000, { ...r.opts, autoSeek: false, autoReturn: true });
  assert.deepEqual(mounts, [true], 'mounts when returning to anchor > 450 iso');
  assert.ok(moves.length > 0);
});

test('auto-mounts when casting a horse-compatible attack skill (!noHorse)', () => {
  const r = rig();
  const mounts: boolean[] = [];
  r.self.state.horse = 'horse-1';
  r.self.state.mounted = false;
  r.host.mount = (on: boolean) => { mounts.push(on); };

  const mountedSkill = Array.from({ length: 2200 }, (_, id) => getSkill(id))
    .find(s => s && s.id !== 1 && isCastable(s) && skillCategory(s) === 'attack' && !s.noHorse)!.id;
  assert.equal(!!getSkill(mountedSkill)?.noHorse, false);
  r.actors.splice(0, r.actors.length, {
    id: 'near', x: 80, y: 0, isSelf: false,
    state: { kind: 'monster', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss: 0, sprite: '' },
  });
  r.host.skillAt = slot => (slot === 'left' ? mountedSkill : null);
  r.host.learnedSkills = () => [mountedSkill];
  r.host.usable = id => id === mountedSkill;
  r.host.usableIgnoreMount = id => id === mountedSkill;
  r.host.ready = id => id === mountedSkill;

  r.auto.start();
  r.auto.update(1000, r.opts);
  assert.deepEqual(mounts, [true], 'auto-mounts for horse-compatible attack skill');
  assert.deepEqual(r.casts, [mountedSkill], 'still casts the skill without blocking');
});

test('noHorse attack skill travels mounted when far, then dismounts and waits before casting', () => {
  const r = rig();
  const mounts: boolean[] = [];
  const moves: { x: number; y: number }[] = [];
  r.self.state.horse = 'horse-1';
  r.self.state.mounted = true;
  r.host.mount = (on: boolean) => { mounts.push(on); };
  r.host.move = (x: number, y: number) => { moves.push({ x, y }); };

  // 128 (Kháng Long Hữu Hối) is noHorse: true
  assert.equal(getSkill(128)?.noHorse, true);
  const foe: AutoActor = {
    id: 'foe', x: 700, y: 0, isSelf: false,
    state: { kind: 'monster', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss: 0, sprite: '' },
  };
  r.actors.splice(0, r.actors.length, foe);
  r.host.skillAt = slot => (slot === 'left' ? 128 : null);
  r.host.learnedSkills = () => [128];
  r.host.usableIgnoreMount = id => id === 128;
  r.host.usable = id => id === 128 && !r.self.state.mounted;
  r.host.ready = id => id === 128 && !r.self.state.mounted;
  r.host.range = () => 300;

  // 1) Far away (700 > 450): stays mounted and walks closer first
  r.auto.start();
  r.auto.update(1000, r.opts);
  assert.deepEqual(mounts, [], 'stays mounted while far');
  assert.equal(moves.length, 1, 'walks toward far target while mounted');
  assert.deepEqual(r.casts, []);

  // 2) Enters close range (120 <= 300): sends dismount and waits for confirmation before casting
  r.self.x = 580;
  r.auto.update(2000, r.opts);
  assert.deepEqual(mounts, [false], 'sends dismount when in range for noHorse skill');
  assert.deepEqual(r.casts, [], 'waits for server mounted=false confirmation');

  // 3) Server confirms mounted=false: immediately casts 128
  r.self.state.mounted = false;
  r.auto.update(2100, r.opts);
  assert.deepEqual(r.casts, [128]);
});

test('noHorse buff skill dismounts first when autoBuff is enabled, then casts buff', () => {
  const r = rig();
  const mounts: boolean[] = [];
  r.self.state.horse = 'horse-1';
  r.self.state.mounted = true;
  r.host.mount = (on: boolean) => { mounts.push(on); };

  // 1230 (Minh Kính Vô Di) is an auto-buff with noHorse: true
  assert.equal(getSkill(1230)?.noHorse, true);
  r.actors.length = 0;
  r.host.learnedSkills = () => [1230];
  r.host.usableIgnoreMount = id => id === 1230;
  r.host.usable = id => id === 1230 && !r.self.state.mounted;
  r.host.ready = id => id === 1230 && !r.self.state.mounted;

  const buffOpts = { ...r.opts, autoBuff: true };
  r.auto.start();
  r.auto.update(1000, buffOpts);
  assert.deepEqual(mounts, [false], 'sends dismount for noHorse buff');
  assert.deepEqual(r.casts, [], 'waits for dismount before casting buff');

  r.self.state.mounted = false;
  r.auto.update(1100, buffOpts);
  assert.deepEqual(r.casts, [1230], 'casts buff after server confirms dismount');
});
