import type { MapSchema } from '@colyseus/schema';
import { MAPS, SkillEngine, attrOf, getGrid, type EnginePort, type FxEvent, type LogKind, type MapMeta, type MapRules, type NavigationGrid } from '@vltk/shared';
import type { Actor, Ground } from '../net/schema.js';
import { updateMonster } from './ai/monster.js';
import type { Sim, SpawnSlot } from './entity.js';
import { regen, updatePlayer } from './players.js';
import { tongKim } from './tongkim.js';
import { resolveAnim } from './systems/anim.js';
import { applyHit, blink, dash, heal } from './systems/combat.js';
import { startJump, updateJump } from './systems/jump.js';
import { combatOf, updateEffects } from './systems/effects.js';
import { updateDrops, updatePickup, type GroundDrop } from './systems/drops.js';
import { updatePotions } from './systems/potions.js';
import { snapPortals } from './systems/portals.js';
import { createSpawnSlots, updateSlots } from './systems/spawner.js';
import { addState, expireStates, removeState } from './systems/status.js';
import { attackable, friendly } from './targeting.js';

// One map's simulation (server-authoritative, TICK_RATE per second). This class only holds the shared state and
// runs the tick in order; the work is in the files next to it:
//   entity.ts      Sim (players, monsters, bosses, dummies)      players.ts   enter, revive, regen, queued orders
//   commands.ts    player orders (move, cast, PK, horse…)       inventory.ts hành trang / trang bị
//   targeting.ts   who may hit whom, nearest enemy              ai/          monster + boss behaviour
//   systems/       movement, combat (hits, death), jump (Khinh công), status (bùa), spawner, portals, anim, sync

export interface WorldHooks {
  /** Player stepped into a portal. */
  transfer(sim: Sim, mapId: number, x: number, y: number): void;
  /** Private message to one player. */
  notify(sim: Sim, text: string): void;
  /** Owner-only line of the Hệ thống channel (kills, exp, pick-ups, buying / selling). */
  log(sim: Sim, kind: LogKind, text: string): void;
  /** Message to everyone in the room. */
  announce(text: string): void;
  /** Owner-only: level / exp / points / stats changed (world/progress.ts). */
  progress(sim: Sim): void;
  /** Owner-only: learned skills or their levels changed. */
  skills(sim: Sim): void;
  /** Owner-only: bag / money changed by the world (picking up). */
  inventory(sim: Sim): void;
}

const MAX_ASTAR_PER_TICK = 6;

export class World {
  readonly meta: MapMeta;
  readonly grid: NavigationGrid;
  readonly rules: MapRules;
  readonly sims = new Map<string, Sim>();
  /** Fx events of this tick, drained by MapRoom (takeEvents). */
  readonly events: FxEvent[] = [];
  readonly engine: SkillEngine;
  /** Server time of the current tick (ms). */
  now = Date.now();
  random = Math.random;
  /** A* searches left this tick (systems/movement.ts). */
  astarBudget = 0;
  /** Monster places of the map (systems/spawner.ts). */
  slots: SpawnSlot[] = [];
  nextMonsterId = 1;

  /** Items / money on the ground (systems/drops.ts) and their synced copies (MapState.ground, set by MapRoom). */
  readonly ground = new Map<string, GroundDrop>();
  groundSync: MapSchema<Ground> | null = null;

  constructor(mapId: number, readonly actors: MapSchema<Actor>, readonly hooks: WorldHooks) {
    this.meta = MAPS[mapId];
    if (!this.meta) throw new Error(`Unknown map ${mapId}`);
    this.grid = getGrid(mapId);
    this.rules = { safe: this.meta.safe, pvp: this.meta.pvp };
    snapPortals(this);
    // What the shared skill engine may read and change in this world.
    const port: EnginePort = {
      now: () => this.now,
      random: () => this.random(),
      combatants: () => this.sims.values(),
      get: id => this.sims.get(id),
      // A Khinh công jumper in flight, stealthed (`hide`, Ngự Tuyết Ẩn 713), or untargetable/invincible caster (2130) cannot be hit.
      hostile: (a, b) => {
        const target = b as Sim;
        if (target.jump) return false;
        const bag = combatOf(target).bag;
        if (target.a.stealth || attrOf(bag, 'invincibility') > 0 || attrOf(bag, 'hidebodyunlock') > 0 || attrOf(bag, 'hide') > 0) return false;
        return attackable(this, a as Sim, target, true);
      },
      friendly: (a, b) => friendly(this, a as Sim, b as Sim),
      damage: (a, b, hit) => applyHit(this, a as Sim, b as Sim, hit),
      stats: c => combatOf(c as Sim),
      heal: (_a, b, v) => heal(this, b as Sim, v),
      addState: (t, st) => addState(this, t as Sim, st),
      removeState: (t, skill) => removeState(this, t as Sim, skill),
      dash: (a, b) => dash(this, a as Sim, b as Sim),
      blink: (a, x, y) => blink(this, a as Sim, x, y),
      jump: (a, x, y) => startJump(this, a as Sim, x, y),
      onSpChanged: c => {
        const sim = c as Sim;
        sim.a.sp = Math.max(0, Math.min(255, sim.sp ?? 0));
        sim.a.spMax = Math.max(0, Math.min(255, sim.spMax ?? 0));
      },
      emit: e => this.events.push(e),
    };
    this.engine = new SkillEngine(port);
    createSpawnSlots(this);
  }

  /** Put a new Sim into the world (and its Actor into the synced state). */
  add(sim: Sim): void {
    this.sims.set(sim.id, sim);
    this.actors.set(sim.id, sim.a);
  }

  removeSim(id: string): void {
    this.engine.cancel(id);
    this.sims.delete(id);
    this.actors.delete(id);
  }

  update(dtMs: number): void {
    this.now = Date.now();
    const dt = Math.min(dtMs, 200) / 1000;
    this.astarBudget = MAX_ASTAR_PER_TICK;

    updateSlots(this);
    if (this.meta.id === tongKim.battleMapId) tongKim.tickBattleWorld(this, this.now);
    updateDrops(this);
    for (const sim of this.sims.values()) {
      if (sim.dead) {
        if (sim.removeAt && this.now >= sim.removeAt) this.removeSim(sim.id);
        continue;
      }
      if (sim.states.size) expireStates(this, sim);
      if (sim.kind === 'player') regen(this, sim, dt);
      if (sim.potions) updatePotions(this, sim);
      if (sim.dead) continue;
      if (sim.jump) updateJump(this, sim);
      if (sim.effects) updateEffects(this, sim, (by, dmg) => applyHit(this, by ?? sim, sim, { dmg, crit: false, dot: true }));
      if (sim.dead) continue;
      if (sim.kind === 'player') { updatePlayer(this, sim, dt); if (sim.pickup && updatePickup(this, sim)) this.hooks.inventory(sim); }
      else updateMonster(this, sim, dt);
      resolveAnim(this, sim);
    }
    this.engine.update();
  }

  /** Drain the fx events gathered during this tick. */
  takeEvents(): FxEvent[] {
    return this.events.splice(0, this.events.length);
  }
}
