import { autoBuffSkills, getSkill, isCastable, learnableSkills, levelCap, tierOf, type BotTemplate } from '@vltk/shared';
import type { Sim } from './entity.js';
import { refreshStats } from './progress.js';
import type { World } from './World.js';

// Runtime-only eligibility, set from the authenticated character record at join. Ordinary players never enter this map.
const training = new WeakMap<Sim, { level: number; faction: string }>();

/** Bot provisioning, like tier setup: add upkeep buffs without reallocating any existing points or skills. */
export function configureBotBuffs(w: World, sim: Sim, setup: Pick<BotTemplate, 'autoBuff'>): boolean {
  if (setup.autoBuff === false) { training.delete(sim); return false; }
  training.set(sim, { level: -1, faction: '' });
  return maintainBotBuffs(w, sim);
}

/** Once per level/faction; also upgrades old bots on entry. Books and offensive progress remain untouched. */
export function maintainBotBuffs(w: World, sim: Sim): boolean {
  const state = training.get(sim);
  if (!state || !sim.progress) return false;
  const level = sim.progress.prog.level, faction = sim.a.faction;
  if (state.level === level && state.faction === faction) return false;
  state.level = level; state.faction = faction;
  const learned = learnableSkills(faction);
  const upkeep = new Set(autoBuffSkills(learned));
  for (const id of learned) if (getSkill(id)?.aura) upkeep.add(id);
  let changed = false;
  for (const id of upkeep) {
    const s = getSkill(id)!;
    // Only normal faction skills; never unlock a book tier, stealth or situational rescue skills here.
    if (!isCastable(s) || (tierOf(faction, id)?.level ?? 0) >= 90 || (s.reqLevel ?? 1) > level) continue;
    const cap = levelCap(s, level);
    if (cap > (sim.skills.get(id) ?? 0)) { sim.skills.set(id, cap); changed = true; }
  }
  if (changed) {
    refreshStats(sim);
    w.hooks.skills(sim);
    w.hooks.progress(sim);
  }
  return changed;
}
