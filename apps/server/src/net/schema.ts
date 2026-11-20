import { schema, t, type SchemaType } from '@colyseus/schema';

/**
 * Everything a client needs to draw one actor (player or monster).
 * Gameplay-only data (paths, cooldowns, AI) lives in the server-side Sim objects, not here.
 */
export const Actor = schema({
  kind: t.string(),          // 'player' | 'monster'
  name: t.string(),
  sprite: t.string(),        // monsters: original npc res (e.g. ani052); '' for players
  faction: t.string(),       // faction id, '' for monsters
  series: t.string(),        // ngũ hành: 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho'
  gender: t.string(),        // 'male' | 'female' (players: picks the paper-doll set)
  level: t.uint8(),
  x: t.uint16(),
  y: t.uint16(),
  dir: t.uint8(),            // 0..7
  anim: t.string(),          // AnimState
  attackTarget: t.string(),  // last server-started offensive target; queued movement is not engagement
  animSeq: t.uint16(),       // bumps to restart one-shot animations (attack, hurt)
  moveScale: t.float32(),    // running animation rate relative to this actor's base gait (items / horse / slow / AI)
  actionMs: t.float32(),    // duration of the current one-shot, independent of sprite frame count
  jumpMs: t.uint16(),        // Khinh công: flight time of the jump in progress (anim 'jump'), 0 otherwise
  hp: t.uint32(),
  maxHp: t.uint32(),
  mp: t.uint32(),
  maxMp: t.uint32(),
  pk: t.uint8(),             // PK mode: 0 Luyện công, 1 Chiến đấu, 2 Đồ sát (shared combat/rules.ts)
  camp: t.string(),          // players: camp shown by the name colour (own, or the team leader's); '' monsters
  teamLeader: t.boolean(), // authoritative captain marker visible to nearby players
  team: t.string(),          // players: team id ('' = none; world/teams.ts)
  boss: t.uint8(),           // monsters: 0 normal (white), 1 Boss Xanh (blue), 2 Boss Hoàng Kim (gold)
  scale: t.float32(),
  protectedUntil: t.float64(), // server time (ms) until which the actor can't be hit
  horse: t.string(),         // horse in the horse slot, '' = none
  mounted: t.boolean(),
  // paper-doll rows of the equipped helm / armor / weapon / mantle (shared lookOf)
  helm: t.int16(),
  armor: t.int16(),
  weapon: t.int16(),
  mantle: t.int16(),
  // bùa lợi / bùa hại (skill ids) and when each ends (epoch seconds, 0 = while refreshed)
  states: t.array('uint16'),
  stateEnds: t.array('uint32'),
  passiveFx: t.array('uint16'), // visual-only passive effects; never counted as timed states
  ctl: t.uint8(),            // control effects on it: 1 choáng, 2 chậm, 4 độc (world/systems/effects.ts)
}, 'Actor');
export type Actor = SchemaType<typeof Actor>;

/** Something lying on the ground (monster drop, VT7): an item or money. The piece itself stays on the server. */
export const Ground = schema({
  x: t.int32(),
  y: t.int32(),
  def: t.string(),           // item def id ('armor-0-5'…) or 'money'
  q: t.uint8(),              // quality (0 white, 1 blue…) for the name colour
  amount: t.uint32(),        // money only
  owner: t.string(),         // session id of who may pick it up first ('' = anyone)
  team: t.string(),          // team id of the killer ('' = none; allows teammates to pick up)
  ownerUntil: t.uint32(),    // epoch seconds when anyone may pick it up
}, 'Ground');
export type Ground = SchemaType<typeof Ground>;

export const MapState = schema({
  mapId: t.uint32(),
  actors: t.map(Actor),
  ground: t.map(Ground),
}, 'MapState');
export type MapState = SchemaType<typeof MapState>;
