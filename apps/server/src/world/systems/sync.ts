import { ArraySchema } from '@colyseus/schema';
import { stateList } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';

// Sim -> synced Actor schema. Fields are written only when they change (each write is a patch to every client).

/** Sinh lực / Nội lực as whole numbers. */
export function syncVitals(sim: Sim): void {
  const hp = Math.max(0, Math.ceil(sim.hp)), mp = Math.max(0, Math.floor(sim.mp));
  if (sim.a.hp !== hp) sim.a.hp = hp;
  if (sim.a.mp !== mp) sim.a.mp = mp;
}

/** Actor.states (skill ids) + stateEnds (epoch seconds, 0 = no end). */
export function syncStates(sim: Sim): void {
  const { ids, ends } = stateList(sim.states);
  const sig = `${ids.join(',')}|${ends.join(',')}`;
  if (sig === sim.stateSig) return;
  sim.stateSig = sig;
  sim.a.states = new ArraySchema<number>(...ids);
  sim.a.stateEnds = new ArraySchema<number>(...ends);
}

/** Actor.ctl: 1 choáng, 2 chậm, 4 độc while they run. */
export function syncEffects(w: World, sim: Sim): void {
  const e = sim.effects;
  const ctl = !e ? 0 : (e.stunUntil > w.now ? 1 : 0) | (e.slowUntil > w.now ? 2 : 0) | (e.poison && e.poison.endsAt > w.now ? 4 : 0);
  if (sim.a.ctl !== ctl) sim.a.ctl = ctl;
}
