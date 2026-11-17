import type { ActiveStates, CharacterStats, CombatStats, Bag, Element, Equipment, Item, MonsterDef, Point } from '@vltk/shared';
import type { PlayerProgress } from './progress.js';
import type { Effects } from './systems/effects.js';
import type { Actor } from '../net/schema.js';

// ---------------------------------------------------------------------------
// Server-side simulation objects. Players, monsters, bosses and training dummies are all one `Sim`; what differs
// is their data and the optional parts below. The synced `Actor` schema only carries what clients draw;
// everything else (paths, cooldowns, AI) stays here.
// ---------------------------------------------------------------------------

/** Every player (and a monster without known skills) can also swing plainly (Công kích vật lý). */
export const BASIC_ATTACK = 1;

/**
 * `lock`: keep attacking the target (left click on an enemy) until it dies or another order comes.
 * `reach`: walk this close to the target before casting (auto-fight), capped by the skill's range; `engaged`: the lock has
 * struck once, so the target may step a little out of `reach` (REACH_SLACK) before we walk after it again.
 */
export interface PendingCast {
  skill: number; targetId?: string; x: number; y: number; repathAt: number; lock?: boolean; reach?: number; engaged?: boolean;
}

/** One monster place of the map (systems/spawner.ts): who spawns there, and when again after dying. */
export interface SpawnSlot { monsterId: number; level: number; x: number; y: number; respawnMs: number; respawnAt: number; simId: string | null; boss: 0 | 1 | 2; fixed: boolean }

export interface Sim {
  /** One-shot ground-pickup metadata, consumed by sendInventory; never persisted. */
  pickedUp?: Item;
  id: string;
  kind: 'player' | 'monster';
  a: Actor;
  element: Element;
  speed: number;
  hp: number;
  mp: number;
  dead: boolean;
  path: Point[];
  pending: PendingCast | null;
  /** Persistent offensive intent, separate from the action interrupted by control or temporary skills. */
  lockedAttack?: PendingCast;
  /** Skill pose: no moving / casting until then. */
  castUntil: number;
  /** Learned skills (id -> level); monsters: their MonsterDef skills. */
  skills: Map<number, number>;
  /** Levels worn pieces add (allskill_v; world/progress.ts refreshStats). */
  skillBonus?: Map<number, number>;
  cooldowns: Map<number, number>;
  /** Ngoại công base damage (weapon / monster damage). */
  baseDamage: [number, number];
  weaponType: number;
  /** One-shot animation (attack/hurt/die) locked until this time. */
  animUntil: number;
  /** Bùa lợi / bùa hại by skill id (recorded only; until 0 = while refreshed). Synced as Actor.states / stateEnds. */
  states: ActiveStates;
  stateSig: string;
  lastDamagedAt: number;
  lastAttackAt: number;
  /** Combat stats from the shared formulas (players: world/progress.ts; monsters: systems/effects.ts). */
  combat?: CombatStats;
  /** Choáng / chậm / độc running on it (systems/effects.ts). */
  effects?: Effects;
  /** Movement factor: fastwalkrun_p of items / bùa, slows (systems/effects.ts refreshMoveScale). */
  moveScale?: number;
  /** Dev-override for testing run speed percentage live. */
  devRunPercent?: number;
  /** Dev-override for testing attack speed percentage live. */
  devAttackPercent?: number;
  /** Fractional cold position retained behind integer network coordinates. */
  coldPosition?: { x: number; y: number; syncedX: number; syncedY: number };
  /** Khinh công in flight (systems/jump.ts): from, to, start time, length (ms). No damage taken meanwhile. */
  jump?: { fx: number; fy: number; tx: number; ty: number; start: number; ms: number };
  // players
  charId?: string;
  owner?: string;
  /** Hào quang on a hand slot of the skill bar (C2S.aura): kept on by world/players.ts holdSlotAura. */
  slotAura?: number;
  /** Drop the player is walking to pick up (systems/drops.ts). */
  pickup?: string;
  /** Hệ, level / exp / points, practice exp (world/progress.ts). */
  progress?: PlayerProgress;
  /** Derived stats from the shared formulas (formulas/character.ts). */
  stats?: CharacterStats;
  sessionId?: string;
  /** Hành trang (BAG_SIZE slots) and worn items; server-authoritative, sent to the owner only. */
  bag?: Bag;
  /** Pieces waiting for room in the bag (restoreBag); saved with the character, not shown. */
  bagSpill?: Item[];
  equip?: Equipment;
  /** Tiền túi (lượng); sent with the inventory. */
  money?: number;
  knb?: number;
  /** Thuốc being pumped (systems/potions.ts): points per pulse, pulses left, time of the next one. */
  potions?: { stat: 'hp' | 'mp'; per: number; left: number; next: number }[];
  // monsters (ai/monster.ts)
  def?: MonsterDef;
  /** Damage each player dealt (exp is shared by it when the monster dies). */
  dmgBy?: Map<string, number>;
  home?: Point;
  slot?: SpawnSlot;
  target?: string | null;
  /** Skill the monster is closing in to use, and its range. */
  plan?: { id: number; range: number } | null;
  nextAttack?: number;
  repathAt?: number;
  wanderAt?: number;
  returning?: boolean;
  removeAt?: number;
}

export function makeSim(id: string, kind: Sim['kind'], a: Actor, element: Element, speed: number): Sim {
  return {
    id, kind, a, element, speed, hp: a.hp, mp: a.mp, dead: false, path: [], pending: null,
    castUntil: 0, skills: new Map(), cooldowns: new Map(), baseDamage: [10, 20], weaponType: -1,
    animUntil: 0, states: new Map(), stateSig: '', lastDamagedAt: 0, lastAttackAt: 0,
  };
}
