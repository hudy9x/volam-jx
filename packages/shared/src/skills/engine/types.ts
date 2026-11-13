import type { Element } from '../../characters/factions.js';
import type { FxEvent } from '../../protocol.js';
import type { StateApply } from '../../status/states.js';
import type { CombatStats } from '../../formulas/combat.js';
import type { HitEffects } from '../../formulas/effects.js';

export type { StateApply };

/**
 * Anything that can use skills: players, bots, monsters, bosses, test dummies. The world (server room or the
 * client-side lab) owns these objects; the engine only reads them and spends Nội lực / sets cooldowns.
 */
export interface Combatant {
  id: string;
  kind: 'player' | 'monster';
  /** Position (world px), facing (0–7) and the few drawn fields the engine needs. */
  a: { x: number; y: number; dir: number; mounted: boolean; maxHp: number; boss?: boolean };
  hp: number;
  dead: boolean;
  element: Element;
  mp: number;
  /** Ngoại công base damage (weapon roll) — formula mode only. */
  baseDamage: [number, number];
  /** Equipped weapon type for EqtLimit (-1 bare hand); ignored for monsters. */
  weaponType: number;
  /** Learned skills: original id -> level. */
  skills: Map<number, number>;
  /** Levels added by worn pieces (allskill_v) to skills learned above 0; the skill is used at learned + bonus. */
  skillBonus?: Map<number, number>;
  /** Skill id -> time (ms) it is ready again. */
  cooldowns: Map<number, number>;
}

export interface HitResult {
  dmg: number;
  crit: boolean;
  /** Trượt (the target's Né tránh won: skills with IsUseAR). */
  miss?: boolean;
  /** Chí tử landed. */
  fatal?: boolean;
  /** Choáng / chậm / độc / co giật this hit puts on the target (formulas/effects.ts). */
  effects?: HitEffects;
  /** Skill the player used (root of the cast; practice exp, kill credit). */
  skill?: number;
}

export interface EnginePort {
  now(): number;
  random(): number;
  combatants(): Iterable<Combatant>;
  get(id: string): Combatant | undefined;
  /** May `a` hurt `b` now (PK rules, safe zone, spawn protection…). */
  hostile(a: Combatant, b: Combatant): boolean;
  /** Is `b` a valid target of `a`'s support skills (heals, bùa lợi). */
  friendly(a: Combatant, b: Combatant): boolean;
  damage(attacker: Combatant, target: Combatant, hit: HitResult): void;
  /** Combat stats of a fighter (formulas/combat.ts): what the damage formula reads. */
  stats(c: Combatant): CombatStats;
  heal(caster: Combatant, target: Combatant, amount: number): void;
  addState(target: Combatant, state: StateApply): void;
  removeState(target: Combatant, skill: number): void;
  /** Lunge next to `target` (melee dash skills); optional — without it the caster stays put. */
  dash?(caster: Combatant, target: Combatant): void;
  /** Appear at a point at once (Mê Ảnh Tung); optional. */
  blink?(caster: Combatant, x: number, y: number): void;
  /**
   * Fly towards a point (Khinh công, characters/jump.ts): the caster cannot act and takes no damage until landing.
   * Returns the flight time in ms, 0 when there is no room to jump. Optional — without it Khinh công does nothing.
   */
  jump?(caster: Combatant, x: number, y: number): number;
  emit(e: FxEvent): void;
}
