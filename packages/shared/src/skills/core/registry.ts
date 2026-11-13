import type { LearnTier, MissileDef, SkillDef, SkillPack, SkillTuning } from './types.js';

// Every pack (one per faction folder, plus common / monsters) registers here; skills are then looked up
// by their original id, whoever uses them (player, bot, monster, boss).

const skills = new Map<number, SkillDef>();
const missiles = new Map<number, MissileDef>();
const packs = new Map<string, SkillPack>();

export function registerMissiles(list: MissileDef[]): void {
  for (const m of list) missiles.set(m.id, m);
}

export function registerPack(pack: SkillPack): void {
  packs.set(pack.id, pack);
  for (const s of pack.skills) {
    if (skills.has(s.id)) continue; // first pack wins (shared child skills)
    s.pack = pack.id;
    skills.set(s.id, s);
  }
}

export const getSkill = (id: number): SkillDef | undefined => skills.get(id);
export const getMissile = (id: number): MissileDef | undefined => missiles.get(id);
export const getPack = (id: string): SkillPack | undefined => packs.get(id);
export const allPacks = (): SkillPack[] => [...packs.values()];

export function tuningOf(id: number): SkillTuning {
  const s = skills.get(id);
  return (s?.pack && packs.get(s.pack)?.tuning?.[id]) || {};
}

/** Learning tiers of a faction (empty for packs without a learn table). */
export function learnTiers(packId: string): LearnTier[] {
  return packs.get(packId)?.learn ?? [];
}

/** Every skill a faction can learn, in tier order. */
export function learnableSkills(packId: string): number[] {
  return learnTiers(packId).flatMap(t => t.skills).filter(id => skills.has(id));
}

/** Tier a learnable skill belongs to. */
export function tierOf(packId: string, id: number): LearnTier | undefined {
  return learnTiers(packId).find(t => t.skills.includes(id));
}
