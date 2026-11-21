import type { Item, StallPrice, TradeCurrency } from './items/items.js';
export type { StallPrice, TradeCurrency };
import type { Progress } from './characters/progression.js';
import type { CharacterStats, Potential } from './formulas/character.js';
import type { CombatStats } from './formulas/combat.js';
import type { Element } from './characters/factions.js';
import type { TokenOp } from './items/token.js';

/** Server simulation rate. */
export const TICK_RATE = 20;
export const TICK_MS = 1000 / TICK_RATE;

/** Name of the Colyseus room type; one room instance per map id. */
export const MAP_ROOM = 'map';

/**
 * 'attack' / 'attack2' = ngoại công poses, 'cast' = nội công (skills.txt CharAnimId 9 / 10 / 11), 'jump' = Khinh công in
 * flight (Actor.jumpMs long, see characters/jump.ts).
 */
export type AnimState = 'idle' | 'run' | 'attack' | 'attack2' | 'cast' | 'hurt' | 'die' | 'jump';

// ---------- client -> server ----------
export interface MoveMsg { x: number; y: number }
export interface CastMsg {
  /** Original skill id (see skills/). */
  skill: number;
  /** Actor id under the cursor, if any. */
  targetId?: string;
  /** Aim point in world coordinates. */
  x: number;
  y: number;
  /**
   * Lock the target (left click on an enemy, like the original): keep using the skill on it, walking after it,
   * until it dies or another order (move / cast) comes.
   */
  lock?: boolean;
  /**
   * Walk this close (logic px) before casting, never further than the skill reaches (auto-fight: "khoảng cách tiếp
   * cận"); missing = the skill's full range, like a click.
   */
  reach?: number;
}
/** PK mode 0 Luyện công / 1 Chiến đấu / 2 Đồ sát. */
export interface PkMsg { mode: number }
export interface MountMsg { on: boolean }
/** Kênh chat (USER 2026-11-13): 'world' = Thế giới, every online character. */
export type ChatChannel = 'world' | 'trade';
/** 'contact' is read-only compatibility for old chat snapshots; new posts accept money/knb only. */
export interface TradeOffer { seller: string; item: Item; currency: TradeCurrency | 'contact'; price: number; sold?: boolean; valuation?: import('./formulas/market.js').ItemValuation }
export interface TradePostMsg { uid: string; currency: TradeCurrency; price: number; text: string; autoPrice?: boolean }
/** Player stall (Bày bán trực tiếp trên hành trang: 2 trang × 60 ô = 120 ô hiển thị 1 trang 10×12 cho người mua). */
export interface StallDetailMsg {
  charId: string;
  sellerName: string;
  sellerCamp: string;
  mapId: number;
  title: string;
  open: boolean;
  isOwner: boolean;
  items: (Item | null)[];
  prices: Record<string, StallPrice>;
}
export interface StallClosedMsg { charId: string; reason?: string }
export interface StallInspectMsg { charId: string }
export interface StallPriceMsg { uid: string; price: number; currency: TradeCurrency }
export interface StallOpenMsg { title: string }
export interface StallBuyMsg { sellerCharId: string; uid: string; price: number; currency: TradeCurrency }
export interface ChatMsg { text: string; ch?: ChatChannel }
/** `id` numbers the lines of the server run; `reacts` = emoji → names of who put it (CHAT.reactions only). */
export interface ChatLine { id: number; ch: ChatChannel; offer?: TradeOffer; from: string; text: string; at: number; reacts?: Record<string, string[]> }
/** Put / take back (same emoji again) a reaction on line `id`. */
export interface ChatReactMsg { id: number; emoji: string }
/** Older lines of the own account's history, before line `before` (scrolling up). */
export interface ChatMoreMsg { before: number }
/** Answer to ChatMoreMsg, oldest first; `done` = nothing older is kept. */
export interface ChatOlderMsg { lines: ChatLine[]; done: boolean }
/** A line's reactions changed. */
export interface ChatReactsMsg { id: number; reacts: Record<string, string[]> }
export const CHAT = {
  maxLength: 120,
  /** One line per character every this many ms (anti-spam). */
  minGapMs: 1500,
  /** Lines kept in the db (all accounts) and per account (shown on entering a map; USER: saved per account). */
  storeLines: 5000,
  accountLines: 1000,
  /** Lines sent on entering a map, and per scroll-up page (C2S.chatMore). */
  page: 30,
  /** Trade channel filter: 30 minutes window, max 50 lines. */
  tradeWindowMs: 30 * 60 * 1000,
  tradeMaxLines: 50,
  /** Reactions people can put on a line (USER 2026-11-13: "chọn vài cái thôi"). */
  reactions: ['👍', '❤️', '😂', '😮', '😢', '😡'] as readonly string[],
  /** Reaction clicks per character every this many ms. */
  reactGapMs: 300,
} as const;
/**
 * Hào quang on a hand slot (chuột trái / phải) of the skill bar: the server keeps it switched on by itself while it can
 * (alive, out of town, enough Nội lực, right weapon / horse); 0 = no aura in the hand slots.
 */
export interface AuraMsg { skill: number }
/** Wear the item in bag slot `index` (rings: optional target slot). */
export interface EquipMsg { index: number; slot?: string }
/** Take off the item in an equipment slot (goes to the first free bag slot). */
export interface UnequipMsg { slot: string }
/** Buy `count` (1–BUY_MAX, default 1) new pieces of a table row from an NPC shop (items/shops.ts), in town. */
export interface BuyMsg { item: string; count?: number }
/** Sell one item (`index`) or multiple items (`indices`) in bag slots to an NPC shop (sellPrice). */
export interface SellMsg { index?: number; indices?: number[] }
/** Use the item in bag slot `index` (thuốc: items/potions.ts). */
export interface UseMsg { index: number }
/** Thợ rèn "Chế tạo" (items/magic.ts): a new blue piece of table row `item`, ngũ hành `series`, lines per position. */
/** `token`: opened from the lệnh bài ("Nhận đồ xanh"): free and anywhere while the character carries one. */
export interface ForgeMsg { item: string; series: number; lines: ([string, number] | null)[]; token?: boolean }
/** Move the bag piece at `from` so its top-left cell is `to` (it must fit there; items/bag.ts). */
export interface BagMoveMsg { from: number; to: number }
/** Move/swap a piece inside the account stash. */
export interface StashMoveMsg { from: number; to: number }
/** Transfer a piece between bag and account stash (optional `to` cell or `page` tab). */
export interface BagStashTransferMsg { from: number; to?: number; page?: number }
/** Deposit or withdraw money / KNB in the account stash. */
export interface StashCurrencyMsg { op: 'deposit' | 'withdraw'; currency: 'money' | 'knb'; amount: number }
/** Sort / compact one page of bag or stash. */
export interface BagSortMsg { page: number; target?: 'bag' | 'stash' }
/** Split `qty` units out of a stacked item at `from` into `to` or the next free slot. */
export interface BagSplitMsg { from: number; qty: number; target?: 'bag' | 'stash'; to?: number }
/** Throw away the item in bag slot `index`. */
export interface DiscardMsg { index: number }
/** Auto-play: go to the bãi luyện công of the own level (maps/training.ts; the server picks the map). */
export interface TrainingReturnPoint { mapId: number; x: number; y: number }
export interface TrainMsg { quiet?: boolean; returnPrevious?: boolean }
/** Map travel (Xa phu / "Bản đồ" button). */
export interface TeleportMsg { mapId: number }
/** Dev: set the level of a learned skill (1..max). */
export interface SkillLevelMsg { skill: number; level: number }
/** Pick up drop `id` from the ground (walks there when far; MapState.ground). */
export interface PickupMsg { id: string }
/** Spend `n` potential points on one potential (F3). */
export interface AddPotentialMsg { stat: Potential; n: number }
/** Join a faction of the own hệ (level 10+, no faction yet). */
export interface JoinFactionMsg { faction: string }
/** One skill point into a point skill (skills/core/learning.ts). */
export interface RaiseSkillMsg { skill: number }
/** Tổ đội order (apps/server/src/world/teams.ts): invite / accept / decline by name, leave, kick / lead a member. */
export interface TeamOrderMsg { op: 'invite' | 'accept' | 'decline' | 'leave' | 'kick' | 'lead' | 'disband'; name?: string }
/** Players in one team at most (original JX1 team: 8). */
export const MAX_TEAM = 8;
/** Gợi ý cộng điểm (characters/suggest.ts): spend the free skill / potential points like the preview of route `route`. */
export interface SuggestMsg { kind: 'skills' | 'potential'; route?: string }
/** Lệnh bài option (items/token.ts): `suite` for 'gold', `faction` for 'faction'. */
export interface TokenMsg { op: TokenOp; suite?: number; faction?: string }
/** Dev (server DEV_TOOLS on): add money until earning it exists (drops, VT7–VT9). */
export interface DevMoneyMsg { amount: number }
/** Dev (server DEV_TOOLS on): gain `levels` levels (exactly the exp they need). */
export interface DevLevelMsg { levels: number }
/** Dev (server DEV_TOOLS on): customize player speed or speed configuration live. */
export interface DevSpeedMsg {
  runPercent?: number | null;
  attackPercent?: number | null;
  mounted?: boolean;
  config?: import('./formulas/speed.js').SpeedConfiguration;
  reset?: boolean;
}

export const C2S = {
  move: 'move',
  cast: 'cast',
  pk: 'pk',
  respawn: 'respawn',
  mount: 'mount',
  equip: 'equip',
  unequip: 'unequip',
  buy: 'buy',
  sell: 'sell',
  use: 'use',
  discard: 'discard',
  forge: 'forge',
  bagMove: 'bagMove',
  bagSort: 'bagSort',
  bagSplit: 'bagSplit',
  stashMove: 'stashMove',
  stashCurrency: 'stashCurrency',
  bagToStash: 'bagToStash',
  stashToBag: 'stashToBag',
  teleport: 'teleport',
  skillLevel: 'skillLevel',
  addPotential: 'addPotential',
  pickup: 'pickup',
  joinFaction: 'joinFaction',
  raiseSkill: 'raiseSkill',
  devMoney: 'devMoney',
  devLevel: 'devLevel',
  devSpeed: 'devSpeed',
  token: 'token',
  team: 'team',
  suggest: 'suggest',
  train: 'train',
  aura: 'aura',
  autoConfig: 'autoConfig',
  tradePost: 'tradePost',
  tradeBuy: 'tradeBuy',
  buyKnb: 'buyKnb',
  chat: 'chat',
  chatReact: 'chatReact',
  chatMore: 'chatMore',
  stallInspect: 'stallInspect',
  stallPrice: 'stallPrice',
  stallOpen: 'stallOpen',
  stallClose: 'stallClose',
  stallBuy: 'stallBuy',
} as const;

// ---------- server -> client ----------
/** Visual events are batched once per tick into one `fx` message. Missiles fly on the client by themselves. */
export type FxEvent =
  /** Caster starts a skill (pose comes from the actor state); client plays the skill's PreCastSpr. */
  | { t: 'cast'; id: string; skill: number; x: number; y: number }
  /**
   * Missile `k` (missles.txt id) appeared: angle `a` in logic space (screen y doubled), `v` logic px/s, lives `l` ms.
   * `f` = homing on that actor, `o` = stays on that actor, `tx,ty` = lobbed onto that point.
   */
  | { t: 'msl'; m: number; k: number; x: number; y: number; a: number; v: number; l: number; f?: string; o?: string; tx?: number; ty?: number }
  /** Missile gone (`m` 0 = hit effect only): `c` 1 = collided / exploded (collide effect), 0 = faded out. */
  | { t: 'mend'; m: number; k: number; x: number; y: number; c: 0 | 1 }
  /** Damage applied. */
  | { t: 'hit'; id: string; dmg: number; crit?: boolean; dot?: boolean; miss?: boolean; fatal?: boolean }
  /** A control effect started on `id` (choáng / chậm / độc) for `ms`; Actor.ctl keeps the running ones. */
  | { t: 'ctl'; id: string; kind: 'stun' | 'slow' | 'poison'; ms: number }
  /** Sinh lực restored. */
  | { t: 'heal'; id: string; v: number }
  /** A bùa lợi / bùa hại (state of skill `skill`) started on `id` (recorded only; the list syncs in Actor.states). */
  | { t: 'st'; id: string; skill: number; kind: 'buff' | 'debuff' }
  | { t: 'die'; id: string; by: string }
  /** `id` reached `level` (level-up glow + sound). */
  | { t: 'lvup'; id: string; level: number };

export interface TransferMsg { mapId: number }
/** The own team (owner-only, on changes and every 2 s); members in order, `leader` = name. */
export interface TeamMsg {
  id: string;
  leader: string;
  members: { name: string; online: boolean; level: number; faction: string; camp: string; mapId: number; hp: number; maxHp: number }[];
}
export interface TeamInviteMsg { from: string }
/** Owner-only, after any change: hành trang + worn items of the own character (concrete items, items/items.ts) + tiền túi. */
export interface InventoryMsg { pickedUp?: Item; bag: (Item | null)[]; equip: Partial<Record<string, Item>>; money: number; knb?: number }
/** Account-shared stash (3 pages = STASH_SIZE) + shared money & KNB. */
export interface StashMsg { stash: (Item | null)[]; money: number; knb: number }
export interface NoticeMsg { text: string }
/** Characters online on every map (kênh Thế giới header — USER 2026-11-13). */
export interface OnlineMsg { n: number }
/** What a Hệ thống line is about (its colour on the client). Map changes are written by the client itself. */
export type LogKind = 'kill' | 'exp' | 'item' | 'money' | 'buy' | 'sell' | 'map';
/** Owner-only: something happened to the own character (kênh Hệ thống — USER 2026-11-13; kept only on the client). */
export interface LogMsg { kind: LogKind; text: string }
/**
 * Owner-only, after any change: hệ, level / exp / points (characters/progression.ts) and the derived stats
 * (formulas/character.ts) the F3 window shows.
 */
export interface StatsMsg {
  /** Owner-only last field departure point. */
  trainingReturn?: TrainingReturnPoint;
  /** Active Tiên Thảo Lộ EXP buff. */
  expBuff?: { until: number; tier: 'normal' | 'special'; mul: number };
  series: Element; faction: string; progress: Progress; expNext: number; stats: CharacterStats;
  /** Tài phú Binh giáp hiện tại tính từ trang bị đang mặc (formulas/fortune.ts). */
  fortune?: number;
  /** Combat stats (attribute bag, skill bonuses): F3 shows the lực tay of the skills on the bar with formulas/damage.ts. */
  combat?: CombatStats;
}
/** Owner-only: levels of the skills the character knows (id -> level). */
export interface SkillsMsg {
  levels: Record<number, number>;
  /** Practice exp toward the next level of practice skills (id -> exp). */
  exp?: Record<number, number>;
  /** Levels worn pieces add (allskill_v): shown in blue over the learned level. */
  bonus?: Record<number, number>;
}

export const S2C = {
  fx: 'fx',
  transfer: 'transfer',
  notice: 'notice',
  inventory: 'inventory',
  stash: 'stash',
  skills: 'skills',
  stats: 'stats',
  /** TeamMsg | null (not in a team). */
  team: 'team',
  /** TeamInviteMsg. */
  teamInvite: 'teamInvite',
  /** ChatLine (one line) or ChatLine[] (the account's last CHAT.page lines, on entering a map). */
  autoConfig: 'autoConfig',
  tradePost: 'tradePost',
  tradeBuy: 'tradeBuy',
  buyKnb: 'buyKnb',
  chat: 'chat',
  /** ChatReactsMsg. */
  chatReacts: 'chatReacts',
  /** ChatOlderMsg. */
  chatOlder: 'chatOlder',
  /** LogMsg: one line for the Hệ thống channel (client-only history, ui/hud/chat.ts). */
  log: 'log',
  /** OnlineMsg: characters in the world (all maps), to everyone when it changes and on entering a map. */
  online: 'online',
  /** Player stall messages. */
  stallDetail: 'stallDetail',
  stallClosed: 'stallClosed',
} as const;

// ---------- REST ----------
export interface AuthResponse { token: string; username: string }
export interface CharacterSummary {
  id: string;
  name: string;
  /** '' until the character joins a faction (level 10). */
  faction: string;
  /** Ngũ hành chosen at creation. */
  series: Element;
  gender: 'male' | 'female';
  level: number;
  mapId: number;
  /** Paper-doll rows of the worn helm / armor / weapon (character select preview). */
  look?: { helm: number; armor: number; weapon: number };
}

/** Characters one account may have (server check; the select screen hides "Tạo nhân vật" when full). */
export const MAX_CHARACTERS = 3;
