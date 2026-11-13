import { DROPS, MONSTERS, bossTierOf, canStandAt, getSkill, isoDistance, maxLevelOf, monsterAt, mulberry32, nearestWalkable, spawnsOf, type Point } from '@vltk/shared';
import { Actor } from '../../net/schema.js';
import { BASIC_ATTACK, makeSim } from '../entity.js';
import { refreshMonsterCombat } from './effects.js';
import type { World } from '../World.js';

// Monster slots from packages/shared/spawns/<map>.json (zones around a point, random camps, fixed spots):
// spawn each slot's monster, respawn it some time after it dies. Numbers by level: shared monsters/scaling.ts.

export function createSpawnSlots(w: World): void {
  const file = spawnsOf(w.meta.id);
  if (!file) return;
  const rng = mulberry32((w.meta.id * 7919) ^ Date.now());
  const avoid: Point[] = [w.meta.raw.entry, ...w.meta.portals, ...w.meta.portals.map(p => ({ x: p.toX, y: p.toY }))];
  const g = w.grid;
  const known = (id: number) => !!MONSTERS[id];
  for (const f of file.fixed ?? []) {
    if (!known(f.monster)) continue;
    const [x, y] = nearestWalkable(g, f.x, f.y);
    w.slots.push({ monsterId: f.monster, level: f.level, x, y, respawnMs: 3000, respawnAt: 0, simId: null, boss: 0, fixed: true });
  }
  const camps: Point[] = [];
  const randomCamp = (): Point | null => {
    for (let tries = 0; tries < 20000; tries++) {
      const cell = Math.floor(rng() * g.gw * g.gh);
      if (!g.ok[cell]) continue;
      const x = (cell % g.gw + 0.5) * g.cw, y = (Math.floor(cell / g.gw) + 0.5) * g.ch;
      if (!canStandAt(g, x, y)) continue;
      if (camps.some(c => isoDistance(c.x, c.y, x, y) < 380)) continue;
      if (avoid.some(c => isoDistance(c.x, c.y, x, y) < 450)) continue;
      camps.push({ x, y });
      return { x, y };
    }
    return null;
  };
  for (const z of file.zones) {
    const monsters = z.monsters.filter(([id]) => known(id));
    if (!monsters.length) continue;
    const centres = z.x !== undefined && z.y !== undefined ? [{ x: z.x, y: z.y }]
      : Array.from({ length: Math.max(1, z.camps ?? 1) }, randomCamp).filter((c): c is Point => !!c);
    const r = z.r ?? 120;
    for (const c of centres) {
      for (let i = 0; i < z.count; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * r;
        const [x, y] = nearestWalkable(g, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.5);
        const [monsterId, level] = monsters[Math.floor(rng() * monsters.length)];
        const zoneTier = bossTierOf(z.boss);
        const defTier = bossTierOf(MONSTERS[monsterId].boss);
        const boss: 0 | 1 | 2 = zoneTier || defTier;
        w.slots.push({
          monsterId, level, x, y, respawnMs: z.respawn * 1000, respawnAt: boss >= 2 ? w.now + 5000 : 0, simId: null,
          boss, fixed: false,
        });
      }
    }
  }
}

/** Dev tool saved new spawns: remove every monster of this map and spawn again. */
export function reloadSpawns(w: World): void {
  for (const [id, sim] of w.sims) {
    if (sim.kind !== 'monster') continue;
    w.engine.cancel(id);
    w.sims.delete(id);
    w.actors.delete(id);
  }
  w.slots = [];
  createSpawnSlots(w);
}

/** Spawn the monster of every empty slot whose respawn time has come. */
export function updateSlots(w: World): void {
  for (const slot of w.slots) {
    if (slot.simId || w.now < slot.respawnAt) continue;
    const def = MONSTERS[slot.monsterId];
    if (!def) continue;
    // Ordinary monster slots in training zones have a chance (AutoGoldenNpc / blueBossChance) to spawn as a Boss Xanh (1).
    const bossTier: 0 | 1 | 2 = slot.boss || (!slot.fixed && !def.dummy && Math.random() < DROPS.blueBossChance ? 1 : 0);
    const stats = monsterAt(def, slot.level, bossTier);
    // Skills this build knows (others: the basic attack), at most their max level.
    const skills = stats.skills.filter(([sid]) => getSkill(sid)).map(([sid, lvl]) => [sid, Math.min(lvl, maxLevelOf(getSkill(sid)!))] as [number, number]);
    if (!skills.length && !def.dummy) skills.push([BASIC_ATTACK, 1]);
    const id = `m${w.nextMonsterId++}`;
    const a = new Actor();
    Object.assign(a, {
      kind: 'monster', name: def.name, sprite: def.sprite, faction: '', level: stats.level,
      x: Math.round(slot.x), y: Math.round(slot.y), dir: def.dummy ? 1 : Math.floor(Math.random() * 8), anim: 'idle', animSeq: 0, jumpMs: 0,
      hp: stats.hp, maxHp: stats.hp, mp: 0, maxMp: 0, pk: 0, camp: '', team: '', boss: bossTier, scale: def.scale, protectedUntil: 0,
    });
    const sim = makeSim(id, 'monster', a, def.element, def.speed);
    sim.hp = stats.hp;
    sim.def = def;
    sim.skills = new Map(skills);
    sim.baseDamage = stats.damage;
    sim.home = { x: slot.x, y: slot.y };
    sim.slot = slot;
    sim.target = null;
    sim.nextAttack = 0;
    sim.wanderAt = w.now + 2000 + Math.random() * 4000;
    slot.simId = id;
    refreshMonsterCombat(sim);
    w.add(sim);
  }
}
