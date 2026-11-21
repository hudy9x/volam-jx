import type { AnimState } from '@vltk/shared';

/** Decoded `Actor` schema instance (mutated in place by the Colyseus decoder), or a client-only NPC. */
export interface ActorState {
  kind: 'player' | 'monster' | 'npc';
  name: string;
  /** Monsters / NPCs: original npc res name (e.g. ani052). */
  sprite: string;
  faction: string;
  /** Ngũ hành: 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho'. */
  series?: string;
  gender: string;
  level: number;
  x: number;
  y: number;
  dir: number;
  anim: AnimState;
  animSeq: number;
  attackTarget?: string;
  /** Running animation rate from the server; absent on static NPCs / local previews. */
  moveScale?: number;
  /** Optional lab override for the complete running cycle, in milliseconds. */
  runMs?: number;
  /** Server-snapshotted duration of the current one-shot. */
  actionMs?: number;
  /** Server control flags: 1 stun, 2 slow, 4 poison. */
  ctl?: number;
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
  teamLeader?: boolean;
  /** Players: non-empty while player stall is open. */
  stallTitle?: string;
  /** Boss tier: 0/false = normal (white), 1 = Boss Xanh (blue), 2/true = Boss Hoàng Kim (gold). */
  boss: boolean | number;
  scale: number;
  protectedUntil: number;
  /** Horse in the horse slot ('' = none). */
  horse: string;
  mounted: boolean;
  /** Part-table rows of the equipped helm / armor / weapon / mantle (see shared lookOf). */
  helm: number;
  armor: number;
  weapon: number;
  mantle?: number;
  /** Bùa lợi / bùa hại (skill ids) and their ends (epoch seconds); recorded only. */
  states?: Iterable<number>;
  stateEnds?: Iterable<number>;
  /** Visuals for learned passives; no timed buff or duplicated attributes. */
  passiveFx?: Iterable<number>;
}
