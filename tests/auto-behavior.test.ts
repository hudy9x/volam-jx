import assert from 'node:assert/strict';
import test from 'node:test';
import { AutoPlay, DEFAULT_AUTO, getSkill, skillCategory, isCastable, ITEMS, QUALITY, type AutoHost, type AutoActor, type Item } from '../packages/shared/src/index.js';

function rig() {
  const actor = (id: string, boss: number, x: number): AutoActor => ({ id, x, y: 0, isSelf: false,
    state: { kind: 'monster', level: 100, hp: 100, maxHp: 100, mp: 100, maxMp: 100, boss, sprite: '' } });
  const self = { ...actor('self', 0, 0), isSelf: true };
  const actors = [actor('normal', 0, 20), actor('blue', 1, 40), actor('gold', 2, 80)];
  let bag: (Item | null)[] = [];
  let slots: (number | null)[] = [];
  const casts: number[] = [], pickups: string[] = [], sold: number[] = [];
  const attack = Array.from({ length: 1500 }, (_, id) => getSkill(id)).find(s => s && s.id !== 1 && isCastable(s) && skillCategory(s) === 'attack')!.id;
  const host = { self: () => self, actors: () => actors, safe: () => false, skillAt: (slot: 'left' | number) => slot === 'left' ? 1 : slots[slot] ?? null,
    usable: (id: number) => id === 1 || id === attack, ready: (id: number) => id === attack, cost: () => 0, range: () => 500, melee: () => false,
    cast: (id: number) => casts.push(id), move() {}, bag: () => bag, money: () => 100000, use() {}, sell: (i: number) => sold.push(i), buy() {},
    wearable: () => false, drops: () => [{id: 'gear', def: Object.values(ITEMS).find(d => d.kind === 'melee')!.id, q: QUALITY.magic, owner: '', x: 1, y: 0}, {id: 'money', def: 'money', q: 0, owner: '', x: 5, y: 0}], pickup: (id: string) => pickups.push(id), train() {}, goTown() {}, respawn() {}, notice() {}, stop() {} } satisfies AutoHost;
  const auto = new AutoPlay(host);
  const opts = { ...DEFAULT_AUTO, autoMap: false, autoBuff: false, autoCurse: false, autoHp: 0, autoMp: 0, autoPickup: false, autoMoney: false, autoJunk: false };
  return { auto, opts, actors, casts, pickups, sold, attack, slots, setBag: (b: (Item|null)[]) => { bag = b; } };
}
test('priority upgrades current normal target to blue and golden boss; skip still works', () => {
  const r = rig(); const gold = r.actors.pop()!, blue = r.actors.pop()!;
  r.slots.push(r.attack); r.auto.start(); r.auto.update(1000, r.opts);
  r.actors.push(blue); r.auto.update(4000, r.opts);
  // Observe cast target through host behavior separately by replacing actor hp: the internal target is what subsequent locks use.
  assert.equal((r.auto as unknown as { target: string }).target, 'blue');
  r.actors.push(gold); r.auto.update(7000, r.opts);
  assert.equal((r.auto as unknown as { target: string }).target, 'gold');
  r.auto.update(10000, { ...r.opts, autoSkipBoss: true });
  assert.equal((r.auto as unknown as { target: string }).target, 'normal');
  assert.ok(r.casts.every(id => id === r.attack));
});
test('money pickup independent of equipment pickup and full inventory', () => {
  const r = rig(); r.setBag(Array.from({length: 300}, (_, i) => ({uid: String(i), def: 'potion-2-5'})));
  r.auto.start(); r.auto.update(1000, {...r.opts, autoPickup: true, autoMoney: true});
  assert.deepEqual(r.pickups, ['money']);
});
test('blue selling is opt-in and never sells golden gear or potions', () => {
  const r = rig(); const def = Object.values(ITEMS).find(d => d.kind === 'melee')!.id;
  r.setBag([{uid:'a', def, q: QUALITY.magic}, {uid:'b', def, q: QUALITY.gold}, {uid:'c', def:'potion-2-5'}, {uid:'valuable', def, q: QUALITY.magic, magic: [['a',1],['b',1],['c',1],['d',1],['e',1],['f',1]]}]);
  r.auto.start(); r.auto.update(31000, r.opts); assert.deepEqual(r.sold, []);
  r.auto.update(62000, {...r.opts, autoSellBlue: true}); assert.deepEqual(r.sold, [0]);
});
