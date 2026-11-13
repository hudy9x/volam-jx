import { skillCategory } from '../core/category.js';
import { castRange, isCastable } from '../core/info.js';
import { getSkill } from '../core/registry.js';
import type { SkillEngine } from './SkillEngine.js';
import type { Combatant } from './types.js';

/**
 * Skill choice for computer-controlled owners (monsters, bosses, bots): a random usable attack, preferring
 * the ones that already reach `distance`. Returns the skill and the range to close in to.
 */
export function chooseSkill(engine: SkillEngine, c: Combatant, distance: number, random = Math.random): { id: number; range: number } | null {
  const usable: { id: number; range: number }[] = [];
  for (const [id, level] of c.skills) {
    const s = getSkill(id);
    if (!s || !isCastable(s) || skillCategory(s) !== 'attack') continue;
    if (!engine.ready(c, id) || engine.check(c, id)) continue;
    usable.push({ id, range: castRange(s, level) });
  }
  if (!usable.length) return null;
  const inRange = usable.filter(u => u.range >= distance);
  const pool = inRange.length ? inRange : usable;
  return pool[Math.floor(random() * pool.length)];
}
