// Tiny JSON-file store. Good enough for a prototype; swap for PostgreSQL later.
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { Bag, BotTemplate, ChatLine, Element, Equipment, Gender, Item, Progress } from '@vltk/shared';

export interface UserRecord {
  username: string;
  salt: string;
  hash: string;
  characters: string[];
  /** Kênh chat lines this account received while online (ids into DbShape.chat.lines, oldest first; world/chat.ts). */
  chat?: number[];
  /** Made by the bot dev API (dev/botAdmin.ts): only such accounts can be reset / deleted / logged in there. */
  bot?: true;
  /** Account-shared stash (3 pages = STASH_SIZE, shared across all characters of this account). */
  stash?: Bag;
  stashMoney?: number;
  stashKnb?: number;
}

/** Bot character: the template it was made / reset with, applied when it next enters the game (world/botSetup.ts). */
export interface BotRecord {
  /** Template file name ('' = not saved as a file). */
  template: string;
  setup: BotTemplate;
  /** Level rolled from setup.level and faction picked (setup.faction 'all' / '') when it was made. */
  level: number;
  faction: string;
  pending: boolean;
}

export interface CharacterRecord {
  id: string;
  owner: string;
  name: string;
  faction: string;
  gender: Gender;
  level: number;
  mapId: number;
  x: number;
  y: number;
  /** Horse in the horse slot. */
  horse?: string | null;
  mounted?: boolean;
  /**
   * Hành trang: BAG_SIZE concrete items (null = empty). Builds before 2026-11-12 stored table ids (strings); they are
   * turned into items when the character enters (world/inventory.ts restoreBag). Missing before items existed.
   */
  bag?: Bag | (string | null)[];
  /** Pieces that had no room when the bag became a size grid (2026-11-12); put back into the bag when room appears. */
  bagSpill?: Item[];
  /** Worn items per slot (same note); missing = never initialised (gets the faction starter set). */
  equip?: Equipment | Record<string, string>;
  /** Levels of learned skills (id -> level); missing = default level. */
  skills?: Record<string, number>;
  /** Tiền túi (lượng); missing = saved before money existed (gets START_MONEY). */
  money?: number;
  knb?: number;
  trainingReturn?: import('@vltk/shared').TrainingReturnPoint;
  auto?: import('@vltk/shared').CharacterAuto;
  /** Hệ chosen at creation; missing on records before 2026-11-12 (= the faction's ngũ hành). */
  series?: Element;
  /** Level / exp / points (characters/progression.ts); `level` above mirrors progress.level for the character list. */
  progress?: Progress;
  /** PROGRESS_VERSION the record was saved with; older ones restart at level 1 without a faction (user, 2026-11-12). */
  progressVersion?: number;
  /** Bot characters only (dev/botAdmin.ts). */
  bot?: BotRecord;
}

interface DbShape {
  marketSales?: import('@vltk/shared').MarketSale[];
  users: Record<string, UserRecord>;
  characters: Record<string, CharacterRecord>;
  /** Kênh chat lines (with their reactions), newest last; accounts keep the ids they saw (UserRecord.chat). */
  chat?: { nextId: number; lines: ChatLine[] };
}

const DB_PATH = resolve(process.env.DB_PATH ?? 'data/db.json');

function load(): DbShape {
  if (!existsSync(DB_PATH)) return { users: {}, characters: {} };
  return JSON.parse(readFileSync(DB_PATH, 'utf8')) as DbShape;
}

const data = load();
let saveTimer: NodeJS.Timeout | null = null;

function flush(): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 1));
  renameSync(tmp, DB_PATH);
}

/** Debounced write so frequent position saves do not hammer the disk. */
function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; flush(); }, 300);
}

export const db = {
  getUser: (username: string): UserRecord | undefined => data.users[username.toLowerCase()],
  addUser(user: UserRecord): void {
    data.users[user.username.toLowerCase()] = user;
    scheduleSave();
  },
  getCharacter: (id: string): CharacterRecord | undefined => data.characters[id],
  listCharacters(username: string): CharacterRecord[] {
    const user = db.getUser(username);
    return (user?.characters ?? []).map(id => data.characters[id]).filter(Boolean);
  },
  nameTaken: (name: string): boolean =>
    Object.values(data.characters).some(c => c.name.toLowerCase() === name.toLowerCase()),
  addCharacter(char: CharacterRecord): void {
    data.characters[char.id] = char;
    db.getUser(char.owner)?.characters.push(char.id);
    scheduleSave();
  },
  /** Every account (bot dev API lists its own accounts). */
  users: (): UserRecord[] => Object.values(data.users),
  /** Remove an account and its characters (bot dev API only). */
  deleteUser(username: string): void {
    const user = db.getUser(username);
    if (!user) return;
    for (const id of user.characters) delete data.characters[id];
    delete data.users[username.toLowerCase()];
    scheduleSave();
  },
  /** Replace a stored character (bot reset: fields it leaves out are gone). */
  replaceCharacter(char: CharacterRecord): void {
    data.characters[char.id] = char;
    scheduleSave();
  },
  updateCharacter(id: string, patch: Partial<CharacterRecord>): void {
    const char = data.characters[id];
    if (!char) return;
    Object.assign(char, patch);
    scheduleSave();
  },
  /** The chat store (created when missing); call `db.touch()` after changing it. */
  chat(): { nextId: number; lines: ChatLine[] } {
    return data.chat ??= { nextId: 1, lines: [] };
  },
  /** Line ids an account received (created when missing). */
  userChat(username: string): number[] | undefined {
    const u = db.getUser(username);
    return u ? (u.chat ??= []) : undefined;
  },
  marketSales: (): import('@vltk/shared').MarketSale[] => data.marketSales ??= [],
  touch: scheduleSave,
  flush,
};
