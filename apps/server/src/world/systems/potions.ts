import { attrOf, POTION_PULSE_MS, potionPumps, type ItemDef } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';
import { syncVitals } from './sync.js';

// Thuốc (VT1, items/potions.ts): every potion drunk pumps on its own — the first pulse right away, then one every
// POTION_PULSE_MS — so drinking again never waits. Pulses on a full bar are lost (like the original). Death ends them.

/** Start the pumps of a potion (messages arrive between ticks: the clock is read now, not the last tick's w.now). */
export function drinkPotion(sim: Sim, def: ItemDef): void {
  const now = Date.now();
  for (const p of potionPumps(def)) (sim.potions ??= []).push({ stat: p.stat, per: p.per, left: p.pulses, next: now });
  pump(sim, now);
}

/** Pulses that are due (World.update, players with running potions). */
export function updatePotions(w: World, sim: Sim): void {
  pump(sim, w.now);
}

function pump(sim: Sim, now: number): void {
  const runs = sim.potions;
  if (!runs) return;
  const lifeMult = 1 + Math.max(0, sim.combat?.bag ? attrOf(sim.combat.bag, 'lifereplenish_p') : 0) / 100;
  for (const r of runs) {
    while (r.left > 0 && now >= r.next) {
      if (r.stat === 'hp') sim.hp = Math.min(sim.a.maxHp, sim.hp + Math.round(r.per * lifeMult));
      else sim.mp = Math.min(sim.a.maxMp, sim.mp + r.per);
      r.left--;
      r.next += POTION_PULSE_MS;
    }
  }
  const left = runs.filter(r => r.left > 0);
  sim.potions = left.length ? left : undefined;
  syncVitals(sim);
}
