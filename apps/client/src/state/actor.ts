import type { AnimState } from '@vltk/shared';

/** Decoded `Actor` schema instance (mutated in place by the Colyseus decoder), or a client-only NPC. */
export interface ActorState {
  kind: 'player' | 'monster' | 'npc';
  name: string;
  /** Monsters / NPCs: original npc res name (e.g. ani052). */
  sprite: string;
  faction: string;
  gender: string;
  level: number;
  x: number;
  y: number;
  dir: number;
  anim: AnimState;
  animSeq: number;
  /** Khinh công: flight time of the jump in progress (anim 'jump'), 0 otherwise. */
  jumpMs: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  /** PK mode: 0 Luyện công, 1 Chiến đấu, 2 Đồ sát. */
  pk: number;
  /** Players: camp shown by the name colour (own or the team leader's). */
  camp?: string;
  /** Players: team id ('' = none). */
  team?: string;
  boss: boolean;
  scale: number;
  protectedUntil: number;
  /** Horse in the horse slot ('' = none). */
  horse: string;
  mounted: boolean;
  /** Part-table rows of the equipped helm / armor / weapon (see shared lookOf). */
  helm: number;
  armor: number;
  weapon: number;
  /** Bùa lợi / bùa hại (skill ids) and their ends (epoch seconds); recorded only. */
  states?: Iterable<number>;
  stateEnds?: Iterable<number>;
}
