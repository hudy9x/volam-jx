// Character stats (F3 numbers) from hệ, level, potentials and the attribute bag (equipment, passives, bùa).
// Same result on server (combat) and client (window). Rules and sources: docs/formulas/character.md.
import { LEVEL_ADD, NEW_PLAYER } from '../characters/player.gen.js';
import type { Element } from '../characters/factions.js';
import { attrOf, type AttrBag } from './attrs.js';
import { RESIST, STATS } from './tuning.js';

/** Resistance kinds: vật lý (phòng thủ), độc, băng, hỏa, lôi. */
export type ResistKind = 'phys' | 'poison' | 'cold' | 'fire' | 'light';
export const RESIST_KINDS: ResistKind[] = ['phys', 'poison', 'cold', 'fire', 'light'];
/** Attribute of each resist and of its cap. */
export const RESIST_ATTR: Record<ResistKind, { res: string; max: string }> = {
  phys: { res: 'physicsres_p', max: 'physicsresmax_p' },
  poison: { res: 'poisonres_p', max: 'poisonresmax_p' },
  cold: { res: 'coldres_p', max: 'coldresmax_p' },
  fire: { res: 'fireres_p', max: 'fireresmax_p' },
  light: { res: 'lightingres_p', max: 'lightingresmax_p' },
};

export type Potential = 'str' | 'dex' | 'vit' | 'eng';
export const POTENTIALS: Potential[] = ['str', 'dex', 'vit', 'eng'];
/** Attribute that adds to each potential (equipment, bùa). */
const POTENTIAL_ATTR: Record<Potential, string> = { str: 'strength_v', dex: 'dexterity_v', vit: 'vitality_v', eng: 'energy_v' };

/** What a character's stats are computed from. */
export interface CharacterInput {
  series: Element;
  level: number;
  /** Points the player added to each potential (on top of the hệ's starting values). */
  added: Record<Potential, number>;
  /** Equipment + passive skills + states (formulas/attrs.ts). */
  bag: AttrBag;
  /**
   * Worn weapon: 'melee' (Sức mạnh adds damage), 'ranged' (ám khí: Thân pháp), 'none' (bare hands: Sức mạnh), with its
   * rolled damage range.
   */
  weapon: { kind: 'melee' | 'ranged' | 'none'; min: number; max: number };
}

export interface CharacterStats {
  /** Potentials: starting + added + from items / bùa. */
  str: number; dex: number; vit: number; eng: number; luck: number;
  life: number; mana: number;
  /** Chính xác, Né tránh. */
  ar: number; def: number;
  /** Physical damage of a plain hit before skill % (weapon + potential). */
  physMin: number; physMax: number;
  /** Resist % (already capped) and the cap of each kind. */
  resist: Record<ResistKind, number>;
  resistMax: Record<ResistKind, number>;
}

/** Starting potentials of a hệ (newplayerini). */
export const basePotentials = (series: Element): Record<Potential, number> => {
  const p = NEW_PLAYER[series];
  return { str: p.str, dex: p.dex, vit: p.vit, eng: p.eng };
};

export function characterStats(input: CharacterInput): CharacterStats {
  const { series, level, bag } = input;
  const base = basePotentials(series);
  const add = LEVEL_ADD[series];
  const pot = (k: Potential) => base[k] + input.added[k] + attrOf(bag, POTENTIAL_ATTR[k]);
  const str = pot('str'), dex = pot('dex'), vit = pot('vit'), eng = pot('eng');
  const luck = STATS.defaultLuck + attrOf(bag, 'lucky_v');

  // level_add.txt: Sinh khí × LifePerVitality + cấp × LifePerLevel (checked on 9 of 10 new-character files), then items.
  const life = Math.max(STATS.minLife,
    (vit * add.lifePerVitality + level * add.lifePerLevel + attrOf(bag, 'lifemax_v')) * (1 + attrOf(bag, 'lifemax_p') / 100));
  const mana = Math.max(STATS.minMana,
    (eng * add.manaPerEnergy + level * add.manaPerLevel + attrOf(bag, 'manamax_v')) * (1 + attrOf(bag, 'manamax_p') / 100));

  // Chính xác / Né tránh: base from Thân pháp, then points and % from items and skills.
  const arBase = Math.max(0, dex * STATS.arPerDex + STATS.arBase) + attrOf(bag, 'attackrating_v') + attrOf(bag, 'attackratingenhance_v');
  const ar = arBase * (1 + (attrOf(bag, 'attackrating_p') + attrOf(bag, 'attackratingenhance_p')) / 100);
  const def = Math.max(0, dex / STATS.defDexDivisor + attrOf(bag, 'adddefense_v') + attrOf(bag, 'armordefense_v'))
    * (1 + attrOf(bag, 'armordefenseenhance_p') / 100);

  // Physical damage: weapon (× its enhance %) + potential bonus.
  const w = input.weapon;
  const pct = 1 + attrOf(bag, 'weapondamageenhance_p') / 100;
  const bonus = w.kind === 'ranged' ? Math.floor(dex / STATS.dexDamageDivisor) : Math.floor(str / STATS.strDamageDivisor);
  const flat = attrOf(bag, 'addphysicsdamage_v');
  const physMin = Math.floor(w.min * pct) + bonus + flat;
  const physMax = Math.max(physMin, Math.floor(w.max * pct) + bonus + flat);

  const resist = {} as Record<ResistKind, number>, resistMax = {} as Record<ResistKind, number>;
  for (const k of RESIST_KINDS) {
    const cap = Math.min(RESIST.absoluteMax, RESIST.cap + attrOf(bag, 'allresmax_p') + attrOf(bag, RESIST_ATTR[k].max));
    resistMax[k] = cap;
    const raw = add.resist[k] + attrOf(bag, RESIST_ATTR[k].res) + attrOf(bag, 'allres_p');
    resist[k] = Math.max(-cap, Math.min(cap, raw));
  }
  return {
    str, dex, vit, eng, luck,
    life: Math.round(life), mana: Math.round(mana), ar: Math.round(ar), def: Math.round(def), physMin, physMax, resist, resistMax,
  };
}
