// Character progression: hệ (chosen at creation), level / exp, potential and skill points, joining a faction at level 10.
// Numbers: formulas/tuning.ts (LEVEL); stats: formulas/character.ts. Docs: docs/formulas/level.md.
import { LEVEL } from '../formulas/tuning.js';
import type { Potential } from '../formulas/character.js';
import { FACTIONS, ELEMENT_NAMES, factionAllowsGender, type Element, type FactionDef, type Gender } from './factions.js';

export const SERIES: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];
/** Skills every character starts with (DATA newplayerini [FSKILLS]: 53, 1, 2 = Công kích vật lý; 229–232 are not combat skills). */
export const BASIC_SKILLS = [1, 2, 53];

/** Stored progress of a character (db, sent to its owner). */
export interface Progress {
  level: number;
  exp: number;
  /** Unspent potential / skill points. */
  potentialPoints: number;
  skillPoints: number;
  /** Points spent on each potential. */
  added: Record<Potential, number>;
}

/** Saved progress format; records with another version restart at level 1 without a faction (user, 2026-11-12). */
export const PROGRESS_VERSION = 1;

export const newProgress = (): Progress => ({
  level: 1, exp: 0, potentialPoints: 0, skillPoints: 0, added: { str: 0, dex: 0, vit: 0, eng: 0 },
});

/** Points a character of `level` has earned in all (spent + unspent). */
export const pointsAtLevel = (level: number) => ({
  potential: (level - 1) * LEVEL.potentialPerLevel,
  skill: (level - 1) * LEVEL.skillPointsPerLevel,
});

/** Factions a character of hệ `series` and `gender` may join (same ngũ hành, faction's gender rule). */
export const factionsFor = (series: Element, gender: Gender): FactionDef[] =>
  Object.values(FACTIONS).filter(f => f.element === series && factionAllowsGender(f.id, gender));

/** Why `faction` cannot be joined now, or null. */
export function joinFactionError(p: { level: number; faction: string; series: Element; gender: Gender }, faction: string): string | null {
  const f = FACTIONS[faction];
  if (!f) return 'Môn phái không tồn tại.';
  if (p.faction) return 'Đã gia nhập môn phái.';
  if (p.level < LEVEL.factionJoin) return `Cần đạt cấp ${LEVEL.factionJoin} mới gia nhập được môn phái.`;
  if (f.element !== p.series) return `${f.name} chỉ nhận đệ tử hệ ${ELEMENT_NAMES[f.element]}.`;
  if (!factionAllowsGender(faction, p.gender)) return `${f.name} chỉ nhận đệ tử ${f.gender === 'male' ? 'nam' : 'nữ'}.`;
  return null;
}

/** Portrait of a character: its faction's, or before joining the first faction of its hệ that takes its sex (CHỌN). */
export function portraitFaction(faction: string, series: Element, gender: Gender): string {
  return FACTIONS[faction] ? faction : factionsFor(series, gender)[0]?.id ?? 'shaolin';
}
