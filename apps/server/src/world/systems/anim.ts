import type { AnimState } from '@vltk/shared';
import type { Sim } from '../entity.js';
import type { World } from '../World.js';

// Animation state synced to clients: one-shot animations (attack, hurt, die) lock the pose for a while;
// otherwise the loop follows movement.

export function playOnce(w: World, sim: Sim, anim: AnimState, seconds: number): void {
  sim.a.anim = anim;
  sim.a.animSeq = (sim.a.animSeq + 1) & 0xffff;
  sim.animUntil = w.now + seconds * 1000;
}

export function setAnim(sim: Sim, anim: AnimState): void {
  sim.animUntil = 0;
  if (sim.a.anim !== anim) sim.a.anim = anim;
}

/** Looping animation follows movement once no one-shot animation is playing. */
export function resolveAnim(w: World, sim: Sim): void {
  if (sim.dead || w.now < sim.animUntil) return;
  setAnim(sim, sim.path.length ? 'run' : 'idle');
}
