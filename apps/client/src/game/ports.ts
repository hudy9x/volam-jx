import type { TokenMsg, TeamOrderMsg, SuggestMsg, EquipSlot, FactionDef, MapMeta, NpcAction, Potential } from '@vltk/shared';
import type { ActorState } from '../state/actor';

/**
 * The contract between the world scene (Phaser) and the interface (HTML), like the skill engine's EnginePort:
 * the scene only knows these types, never the interface's code, so the whole interface can be redone (or swapped
 * for a mobile layout) without touching game/. ui/hud/Hud.ts implements WorldUi today.
 */

/** Orders the interface may give; the scene sends them to the server, which checks everything. */
export interface WorldActions {
  /** Next PK mode (Luyện công → Chiến đấu → Đồ sát). */
  tradePost: (msg: import('@vltk/shared').TradePostMsg) => void;
  tradeBuy: (id: number) => void;
  buyKnb: (count: number) => void;
  pk: () => void;
  /** Tổ đội order. */
  team: (msg: TeamOrderMsg) => void;
  /** Gợi ý cộng điểm: apply the plan of a route. */
  suggest: (msg: SuggestMsg) => void;
  respawn: () => void;
  moveTo: (x: number, y: number) => void;
  mount: (on: boolean) => void;
  equip: (index: number, slot?: EquipSlot) => void;
  unequip: (slot: EquipSlot) => void;
  /** Buy `count` new pieces of a row from an NPC shop (town only, table price). */
  buy: (item: string, count?: number) => void;
  /** Sell the bag item in slot `index` to an NPC shop. */
  sell: (index: number) => void;
  /** Use the bag item in slot `index` (thuốc). */
  use: (index: number) => void;
  /** Use the first bag piece of table row `defId` (keys 1–9, the quick bar), or say none is left. */
  useItem: (defId: string) => void;
  discard: (index: number) => void;
  /** Thợ rèn "Chế tạo": a blue piece of a row with ngũ hành `series` and lines per position (items/magic.ts). */
  forge: (item: string, series: number, lines: ([string, number] | null)[], token?: boolean) => void;
  /** Move a bag piece so its top-left cell is `to`. */
  bagMove: (from: number, to: number) => void;
  /** Sort/compact one page of bag or stash. */
  bagSort: (page: number, target?: 'bag' | 'stash') => void;
  /** Move/swap a piece inside the account stash. */
  stashMove: (from: number, to: number) => void;
  /** Transfer a piece from bag to account stash. */
  bagToStash: (from: number, to?: number, page?: number) => void;
  /** Transfer a piece from account stash to bag. */
  stashToBag: (from: number, to?: number, page?: number) => void;
  /** Deposit or withdraw money / KNB in the account stash. */
  stashCurrency: (op: 'deposit' | 'withdraw', currency: 'money' | 'knb', amount: number) => void;
  teleport: (mapId: number) => void;
  /** Dev: level of a learned skill. */
  setSkillLevel: (skill: number, level: number) => void;
  /** Spend potential points (Trang bị và Thuộc tính +). */
  addPotential: (stat: Potential, n: number) => void;
  /** Join a faction of the own hệ (level 10+). */
  joinFaction: (faction: string) => void;
  /** One skill point into a point skill. */
  raiseSkill: (skill: number) => void;
  /** Dev: gain levels (server DEV_TOOLS on). */
  devLevel: (levels: number) => void;
  /** Dev: add money (server DEV_TOOLS on). */
  devMoney: (amount: number) => void;
  /** Lệnh bài option (items/token.ts). */
  token: (msg: TokenMsg) => void;
  /** Kênh chat Thế giới: one line to every online character. */
  chat: (text: string, ch?: import('@vltk/shared').ChatChannel) => void;
  /** Put / take back a reaction on a chat line. */
  chatReact: (id: number, emoji: string) => void;
  /** Older lines of the own chat history, before line `before`. */
  chatMore: (before: number) => void;
}

/** Windows the scene opens (keys, NPCs). */
export type WindowId = 'bag' | 'char' | 'skills' | 'bigmap' | 'travel' | 'shop' | 'drugstore' | 'kytran' | 'horse-shop' | 'system' | 'team' | 'stash';

/** Which window each NPC action opens. */
export const NPC_WINDOWS: Record<NpcAction, WindowId> = { shop: 'shop', drug: 'drugstore', kytran: 'kytran', travel: 'travel', horse: 'horse-shop', stash: 'stash' };

/** One line of an NPC conversation. */
export interface NpcTalk {
  name: string;
  /** NPC res for the picture (tools/gen-assets.ts NPC_RES). */
  res: string;
  text: string;
  options: { label: string; run: () => void }[];
}

/** An actor as the maps draw it. */
export interface MapActor {
  id: string;
  x: number;
  y: number;
  state: { kind: string; hp: number; pk: number; camp?: string; team?: string; boss: boolean | number; name?: string; level?: number; faction?: string };
}

export interface ViewRect { x: number; y: number; width: number; height: number }
export interface MapLabel { x: number; y: number; name: string }

/** What the world scene needs from the interface. */
export interface WorldUi {
  /** Full-screen loading text; null hides it. */
  loading(text: string | null): void;
  notice(text: string): void;
  /** The scene is ready on a map: show the HUD for it. */
  show(meta: MapMeta, actions: WorldActions): void;
  /** The own character appeared. */
  setCharacter(actor: ActorState, faction: FactionDef | undefined): void;
  /** Every frame: own vitals, position, players on the map. */
  update(self: ActorState, players: number): void;
  /** Every frame (the maps throttle themselves). */
  drawMinimap(actors: Iterable<MapActor>, selfId: string, view: ViewRect): void;
  drawBigMap(actors: Iterable<MapActor>, selfId: string, labels: MapLabel[]): void;
  toggleWindow(id: WindowId, open?: boolean): void;
  /** Lên / xuống ngựa (explains when there is no horse). */
  toggleMount(): void;
  talk(npc: NpcTalk): void;
  /** Tự động đánh switch (the scene runs AutoPlay while it is on). */
  readonly auto: boolean;
  openAuto(): void;
  setAuto(on: boolean, why?: string): void;
  onAuto: ((on: boolean) => void) | null;
}
