import { getSkill, isCastable, skillCategory, type SkillDef } from '../skills/index.js';

/** Automatic maintenance, independent of hotkeys. Teleports, stealth and manual support are not upkeep buffs. */
export function autoBuffSkills(learned: Iterable<number>): number[] {
  return [...new Set(learned)].filter(id => {
    const s = getSkill(id);
    if (!s || s.pack === 'common' || !isCastable(s) || s.aura || id === 713 || id === 716) return false;
    // Hoa Sơn's friendly fields are labelled support/attack in the source table.
    return skillCategory(s) === 'buff' || id === 1376 || id === 1380;
  }).sort((a, b) => Number(a === 1364 || a === 1369) - Number(b === 1364 || b === 1369));
}

/** One aura per caster. Nga My's 120 skill carries all five earlier auras. */
export function autoAuraSkill(learned: Iterable<number>, usable: (id: number) => boolean): number {
  const auras = [...new Set(learned)].map(getSkill).filter((s): s is SkillDef => !!s?.aura && usable(s.id));
  auras.sort((a, b) => (b.reqLevel ?? 0) - (a.reqLevel ?? 0) || a.id - b.id);
  return auras[0]?.id ?? 0;
}
