export * from './roster.js';
export * from './equipment.js';
export * from './social.js';
// Bot giả lập người chơi (docs/bots.md). Hai loại cài đặt, dùng chung cho trang /?bots (client dev), API dev của server
// (apps/server/src/dev/botAdmin.ts) và runner `npm run bots` (tools/bots/runner/):
//  - BotTemplate: mẫu tài khoản, áp một lần khi tạo / đặt lại bot (cấp, phái, điểm, chiêu, đồ, tiền, thuốc, bản đồ);
//  - BotScenario: kịch bản chạy (bots/<tên>.json), mỗi lần `npm run bots -- <tên>` đọc.
// Đo hiệu năng là phần riêng (BACKLOG BT, nhóm đo đếm), không nằm ở đây. TS thuần.
import { DEFAULT_AUTO, type AutoSettings } from '../auto/settings.js';
import type { Gender } from '../characters/factions.js';
import { FACTIONS } from '../characters/factions.js';
import { HORSES } from '../items/horses.js';
import { ITEMS } from '../items/items.js';
import { MAPS } from '../maps/index.js';

/** Bot account names start with this; the dev API touches only accounts it created (UserRecord.bot), never others. */
export const BOT_ACCOUNT_PREFIX = 'bot';
/** Template / scenario file names (bots/<name>.json, bots/templates/<name>.json). */
export const BOT_FILE_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;
/** Tiền tố tên tài khoản: bot…, chữ thường + số; tài khoản = `<prefix>_<n>`. */
export const BOT_PREFIX_RE = /^bot[a-z0-9]{0,8}$/;
/** Most bots one create call makes. */
export const BOT_CREATE_MAX = 500;

export type BotPotential = 'suggest' | 'str' | 'dex' | 'vit' | 'eng';
export const BOT_LEVEL_BANDS: readonly [number, number][] = [[40, 69], [70, 90], [110, 150], [150, 200]];
export const botMapIds = (mode: 'town' | 'training' | 'both'): number[] => Object.values(MAPS).filter(m => mode === 'town' ? m.safe : mode === 'both' ? m.safe || ['Field', 'Cave'].includes(m.type) || m.id === 140 : ['Field', 'Cave'].includes(m.type) || m.id === 140).map(m => m.id);

/** CHỌN: high-level bots use only horses within 10 speed points of the strongest eligible mount. */
export function botHorsePool(level: number): string[] {
  const eligible = Object.values(HORSES).filter(h => Number(h.req?.find(([k]) => k === 'requirelevel')?.[1] ?? 0) <= level);
  const best = Math.max(0, ...eligible.map(h => h.speedPct));
  return eligible.filter(h => level < 110 || h.speedPct >= best - 10).map(h => h.id);
}

export type BotMapMode = 'town' | 'training' | 'both' | 'list';

export interface BotTemplate {
  title?: string;
  /** Tiền tố tài khoản (BOT_PREFIX_RE) và mật khẩu chung (đăng nhập bot bằng trình duyệt để xem). */
  prefix: string;
  password: string;
  /** Môn phái: id / 'all' = chia đều 11 phái / '' = chưa vào phái (hệ chia đều). */
  faction: string;
  gender: 'male' | 'female' | 'mix';
  /** Cấp: ngẫu nhiên trong [min, max]. Dưới cấp gia nhập phái thì chưa vào phái. */
  level: [number, number];
  /** Điểm tiềm năng: theo gợi ý tuyến (characters/suggest.ts) hoặc dồn hết vào một thuộc tính. */
  potential: BotPotential;
  /** Điểm kỹ năng theo gợi ý tuyến; không cộng. */
  skills: 'suggest' | 'none';
  /** Học hết chiêu 90 / 120 / 150 ở cấp tối đa nhân vật cho phép (như lệnh bài). */
  tiers: boolean;
  /** Maintain learned beneficial buffs and the faction aura. */
  autoBuff: boolean;
  /** Green forge loadout / faction gold suite; starter retained for legacy templates. */
  gear: 'starter' | 'green' | 'gold';
  /** Càn Khôn Giới Chỉ (bật mọi dòng ẩn). */
  ring: boolean;
  /** Ngựa: '' không / 'random' / id hàng ngựa; có ngựa thì cưỡi. */
  horse: string;
  /** Tiền túi (lượng). */
  money: number;
  /** Thuốc: id hàng thuốc + số bình (0 = không). */
  hpPotion: string;
  hpCount: number;
  mpPotion: string;
  mpCount: number;
  /**
   * Chỗ xuất hiện: các thành hoặc bãi luyện công đã chọn / legacy list; ngẫu nhiên trong bán kính
   * `radius` quanh điểm vào bản đồ.
   */
  map: { mode: BotMapMode; maps: number[]; radius: number };
}

/** Ngũ Hoa Ngọc Lộ Hoàn: original potion-2-5, pumps both HP and MP. */
export const BOT_DUAL_POTION = 'potion-2-5';

export const DEFAULT_BOT_TEMPLATE: BotTemplate = {
  prefix: 'bot', password: 'botpass', faction: 'all', gender: 'mix', level: [40, 69], potential: 'suggest', skills: 'suggest',
  tiers: true, autoBuff: true, gear: 'green', ring: false, horse: 'random', money: 1_000_000,
  hpPotion: BOT_DUAL_POTION, hpCount: 50, mpPotion: BOT_DUAL_POTION, mpCount: 50,
  map: { mode: 'both', maps: botMapIds('both'), radius: 200 },
};

export type BotBehavior = 'grind' | 'pk' | 'tongkim' | 'wander' | 'idle' | 'travel' | 'crowd';

export const BOT_BEHAVIORS: Record<BotBehavior, { name: string; note: string }> = {
  grind: { name: 'Luyện quái', note: 'Tự động đánh thật (AutoPlay) theo tùy chọn Auto bên dưới' },
  pk: { name: 'PK', note: 'Bật PK, đánh người chơi ở bãi luyện công' },
  tongkim: { name: 'Tống Kim', note: 'Tự động báo danh và PK trên chiến trường Tống Kim (323 → 378)' },
  wander: { name: 'Đi dạo', note: 'Đi ngẫu nhiên quanh chỗ xuất hiện' },
  idle: { name: 'Đứng yên', note: 'Vào game rồi không làm gì' },
  travel: { name: 'Đi bản đồ', note: 'Đổi bản đồ mỗi X giây' },
  crowd: { name: 'Dồn một chỗ', note: 'Cùng đứng một điểm (va chạm + gửi trạng thái nặng nhất)' },
};

export const BOT_TONGKIM_TACTIC_IDS = ['charge', 'flank', 'tactical', 'defend', 'random'] as const;
export type BotTongKimTactic = (typeof BOT_TONGKIM_TACTIC_IDS)[number];

export const BOT_TONGKIM_TACTICS: Record<BotTongKimTactic, { name: string; note: string }> = {
  charge: { name: 'Xung phong (Cũ)', note: 'Giữ nguyên hành vi hiện tại: tiến thẳng theo tuyến cố định, gặp địch là đánh.' },
  flank: { name: 'Gọng kìm 3 cánh', note: 'Tách 3 mũi bám theo tiền tuyến và cụm NPC của từng map (hoặc tự mở vòng cung rộng 22% trục chiến trường), tự đổi cánh ít đồng đội nhất sau mỗi lần hồi sinh, gom tốp ngắn (≤ 3,2s) ngoài cổng trước khi đẩy.' },
  tactical: { name: 'Chiến thuật tổng hợp', note: 'Tách 3 cánh + phân vai (Chủ lực / Bọc hậu / Hộ vệ Nguyên Soái / Nga Mi bám cụm đồng đội) + phản ứng quay về cứu Nguyên Soái nhà + dồn hỏa lực mục tiêu yếu + ưu tiên khắc hệ ngũ hành + thả diều (kiting) cho phái tầm xa + rút về cụm đồng đội khi bị áp đảo (1 vs 3+, HP < 55%).' },
  defend: { name: 'Thủ Soái phản công', note: 'Giữ đội hình bảo vệ Nguyên Soái và nửa sân nhà, ưu tiên dọn địch xâm nhập rồi mới phản công.' },
  random: { name: 'Ngẫu nhiên theo phe', note: 'Mỗi trận tự bốc chiến thuật riêng cho phe Tống và phe Kim.' },
};

export interface BotTongKimConfig {
  campPreference: 'auto' | 'tong' | 'kim';
  tactic: BotTongKimTactic;
  exitViaScoutRatio: number;
  hpHealThreshold: number;
  scanRadius: number;
}

export const DEFAULT_BOT_TONGKIM: BotTongKimConfig = {
  campPreference: 'auto',
  tactic: 'charge',
  exitViaScoutRatio: 0.5,
  hpHealThreshold: 0.7,
  scanRadius: 850,
};

export const DEFAULT_BOT_ACTIVITIES = { grind: true, chat: true, sell: true, tongkim: false, autoAcceptTeam: true, autoInviteTeam: false };
export interface BotScenario {
  title?: string;
  /** Optional presets used only to initialise missing selected accounts, never reset existing progress. */
  initialSetup?: { template: string; usernames: string[] }[];
  activities: typeof DEFAULT_BOT_ACTIVITIES;
  version: 1;
  note: string;
  /** Server bot vào (mặc định server dev của người dùng). */
  server: string;
  /** Bot nào: tài khoản bot có tiền tố này; `count` 0 = tất cả. */
  bots: { prefix: string; count: number; usernames?: string[] };
  /** Tốc độ vào game (bot / giây). */
  joinPerSecond: number;
  /** Giây; 0 = chạy tới khi Ctrl+C. */
  duration: number;
  /** Hạt giống ngẫu nhiên: cùng hạt giống → cùng cách chia hành vi + cùng nhịp. */
  seed: number;
  /** Tỉ lệ hành vi (trọng số). */
  behaviors: Partial<Record<BotBehavior, number>>;
  pk: { mode: 1 | 2; target: 'nearest' | 'enemy' | 'random' };
  wander: { radius: number };
  travel: { every: number; maps: number[] };
  crowd: { mapId: number; x: number; y: number; radius: number; cast: boolean };
  /** Tùy chọn Auto của hành vi Luyện quái (như cửa sổ Tự động đánh). */
  auto: AutoSettings;
  /** Cấu hình riêng cho hoạt động Chiến trường Tống Kim. */
  tongkim?: BotTongKimConfig;
  /** Marks an explicit choice made after learned-skill buff migration. */
  buffVersion?: 1;
  /** Giống người: chu kỳ ra quyết định (ms), độ trễ phản ứng ngẫu nhiên [min, max] ms, lệnh tối đa / giây mỗi bot. */
  human: { tickMs: number; reactionMs: [number, number]; maxOrdersPerSec: number };
  /** Rớt mạng / bị đá thì tự vào lại. */
  reconnect: boolean;
}

export const DEFAULT_BOT_SCENARIO: BotScenario = {
  version: 1, title: '', activities: { ...DEFAULT_BOT_ACTIVITIES }, note: '', server: 'http://localhost:2567', bots: { prefix: 'bot', count: 0 }, joinPerSecond: 3, duration: 0, seed: 1,
  behaviors: { grind: 100 },
  pk: { mode: 2, target: 'nearest' },
  wander: { radius: 300 },
  travel: { every: 60, maps: [37, 140] },
  crowd: { mapId: 37, x: 0, y: 0, radius: 80, cast: false },
  auto: { ...DEFAULT_AUTO }, buffVersion: 1,
  tongkim: { ...DEFAULT_BOT_TONGKIM },
  human: { tickMs: 150, reactionMs: [80, 250], maxOrdersPerSec: 8 },
  reconnect: true,
};

// ---------- kiểm tra / điền mặc định (file, body API có thể thiếu trường hoặc sai) ----------

const num = (v: unknown, def: number, lo: number, hi: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, Math.round(n))) : def;
};
const bool = (v: unknown, def: boolean): boolean => (typeof v === 'boolean' ? v : def);
const pick = <T extends string>(v: unknown, options: readonly T[], def: T): T => (options.includes(v as T) ? v as T : def);
const mapList = (v: unknown, def: number[]): number[] => {
  const list = Array.isArray(v) ? v.map(Number).filter(id => Number.isInteger(id) && MAPS[id]) : [];
  return list.length ? [...new Set(list)] : def;
};
const record = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});

/** A template from a file / request body: unknown fields dropped, missing / wrong ones = default. */
export function normalizeBotTemplate(raw: unknown): BotTemplate {
  const r = record(raw), d = DEFAULT_BOT_TEMPLATE;
  const lv = Array.isArray(r.level) ? r.level : [r.level, r.level];
  const lo = num(lv[0], d.level[0], 1, 200), hi = num(lv[1], d.level[1], 1, 200);
  const m = record(r.map);
  const potion = (v: unknown) => (typeof v === 'string' && ITEMS[v]?.kind === 'potion' ? v : '');
  const levelBand: [number, number] = [Math.min(lo, hi), Math.max(lo, hi)];
  const highEnd150 = levelBand[0] >= 150;
  return {
    title: typeof r.title === 'string' ? r.title.trim().slice(0, 80) : '',
    prefix: typeof r.prefix === 'string' && BOT_PREFIX_RE.test(r.prefix) ? r.prefix : d.prefix,
    password: typeof r.password === 'string' && r.password.length >= 4 && r.password.length <= 40 ? r.password : d.password,
    faction: r.faction === 'all' || r.faction === '' || (typeof r.faction === 'string' && FACTIONS[r.faction]) ? r.faction as string : d.faction,
    gender: pick(r.gender, ['male', 'female', 'mix'] as const, d.gender),
    level: levelBand,
    potential: pick(r.potential, ['suggest', 'str', 'dex', 'vit', 'eng'] as const, d.potential),
    skills: pick(r.skills, ['suggest', 'none'] as const, d.skills),
    tiers: highEnd150 ? true : bool(r.tiers, d.tiers),
    autoBuff: bool(r.autoBuff, true),
    gear: highEnd150 ? 'gold' : pick(r.gear, ['starter', 'green', 'gold'] as const, d.gear),
    ring: bool(r.ring, d.ring),
    horse: r.horse === 'random' || (typeof r.horse === 'string' && HORSES[r.horse]) ? r.horse as string : '',
    money: num(r.money, d.money, 0, 2_000_000_000),
    hpPotion: r.hpPotion === undefined ? d.hpPotion : potion(r.hpPotion), hpCount: num(r.hpCount, d.hpCount, 0, 200),
    mpPotion: r.mpPotion === undefined ? d.mpPotion : potion(r.mpPotion), mpCount: num(r.mpCount, d.mpCount, 0, 200),
    map: {
      mode: pick(m.mode, ['town', 'training', 'both', 'list'] as const, d.map.mode),
      maps: mapList(m.maps, d.map.maps),
      radius: num(m.radius, d.map.radius, 0, 2000),
    },
  };
}

/** A scenario from a file / request body: unknown fields dropped, missing / wrong ones = default. */
export function normalizeBotScenario(raw: unknown): BotScenario {
  const r = record(raw), d = DEFAULT_BOT_SCENARIO;
  const activities = record(r.activities);
  const b = record(r.bots), pk = record(r.pk), wa = record(r.wander), tr = record(r.travel), cr = record(r.crowd);
  const h = record(r.human), a = record(r.auto), beh = record(r.behaviors), tk = record(r.tongkim);
  const behaviors: Partial<Record<BotBehavior, number>> = {};
  for (const k of Object.keys(BOT_BEHAVIORS) as BotBehavior[]) {
    const w = num(beh[k], 0, 0, 1000);
    if (w > 0) behaviors[k] = w;
  }
  const auto = { ...DEFAULT_AUTO };
  for (const k of Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]) {
    const def = DEFAULT_AUTO[k], v = a[k];
    if (typeof def === 'boolean') (auto as Record<string, unknown>)[k] = bool(v, def);
    else if (typeof def === 'number') (auto as Record<string, unknown>)[k] = num(v, def, 0, 100_000);
    else if (typeof v === 'string') (auto as Record<string, unknown>)[k] = v;
  }
  auto.autoBuff = r.buffVersion === 1 ? auto.autoBuff : true;
  auto.autoPriority = pick(auto.autoPriority, ['near', 'boss', 'blue'] as const, DEFAULT_AUTO.autoPriority);
  auto.autoLoot = pick(auto.autoLoot, ['all', 'magic', 'money'] as const, DEFAULT_AUTO.autoLoot);
  const rx = Array.isArray(h.reactionMs) ? h.reactionMs : [];
  const r0 = num(rx[0], d.human.reactionMs[0], 0, 5000), r1 = num(rx[1], d.human.reactionMs[1], 0, 5000);
  const crowdMap = num(cr.mapId, d.crowd.mapId, 1, 100_000);
  return {
    version: 1,
    title: typeof r.title === 'string' ? r.title.trim().slice(0, 80) : '',
    ...(Array.isArray(r.initialSetup) ? { initialSetup: r.initialSetup.flatMap(value => { const group = record(value); return typeof group.template === 'string' && BOT_FILE_RE.test(group.template) && Array.isArray(group.usernames) ? [{ template: group.template, usernames: group.usernames.filter((id): id is string => typeof id === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(id)).slice(0, 200) }] : []; }).slice(0, 20) } : {}),
    activities: { grind: bool(activities.grind, true), chat: bool(activities.chat, true), sell: bool(activities.sell, true), tongkim: bool(activities.tongkim, false), autoAcceptTeam: !bool(activities.autoInviteTeam, false) && bool(activities.autoAcceptTeam, true), autoInviteTeam: bool(activities.autoInviteTeam, false) },
    note: typeof r.note === 'string' ? r.note.slice(0, 500) : '',
    server: typeof r.server === 'string' && /^https?:\/\/[^\s]+$/.test(r.server) ? r.server.replace(/\/+$/, '') : d.server,
    bots: {
      prefix: typeof b.prefix === 'string' && BOT_PREFIX_RE.test(b.prefix) ? b.prefix : d.bots.prefix,
      count: num(b.count, d.bots.count, 0, 100_000),
      ...(Array.isArray(b.usernames) ? { usernames: [...new Set(b.usernames.filter((v): v is string => typeof v === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(v)))].slice(0, 500) } : {}),
    },
    joinPerSecond: num(r.joinPerSecond, d.joinPerSecond, 3, 5),
    duration: 0,
    seed: num(r.seed, d.seed, 0, 2 ** 31 - 1),
    behaviors: Object.keys(behaviors).length ? behaviors : { ...d.behaviors },
    pk: { mode: num(pk.mode, d.pk.mode, 1, 2) as 1 | 2, target: pick(pk.target, ['nearest', 'enemy', 'random'] as const, d.pk.target) },
    wander: { radius: num(wa.radius, d.wander.radius, 20, 5000) },
    travel: { every: num(tr.every, d.travel.every, 5, 3600), maps: mapList(tr.maps, d.travel.maps) },
    crowd: {
      mapId: MAPS[crowdMap] ? crowdMap : d.crowd.mapId,
      x: num(cr.x, d.crowd.x, 0, 100_000), y: num(cr.y, d.crowd.y, 0, 100_000),
      radius: num(cr.radius, d.crowd.radius, 0, 2000), cast: bool(cr.cast, d.crowd.cast),
    },
    auto, buffVersion: 1,
    tongkim: {
      campPreference: pick(tk.campPreference, ['auto', 'tong', 'kim'] as const, DEFAULT_BOT_TONGKIM.campPreference),
      tactic: pick(tk.tactic, BOT_TONGKIM_TACTIC_IDS, DEFAULT_BOT_TONGKIM.tactic),
      exitViaScoutRatio: Math.max(0, Math.min(1, Number.isFinite(Number(tk.exitViaScoutRatio)) ? Number(tk.exitViaScoutRatio) : DEFAULT_BOT_TONGKIM.exitViaScoutRatio)),
      hpHealThreshold: Math.max(0.1, Math.min(0.95, Number.isFinite(Number(tk.hpHealThreshold)) ? Number(tk.hpHealThreshold) : DEFAULT_BOT_TONGKIM.hpHealThreshold)),
      scanRadius: num(tk.scanRadius, DEFAULT_BOT_TONGKIM.scanRadius, 200, 1600),
    },
    human: {
      tickMs: num(h.tickMs, d.human.tickMs, 50, 5000),
      reactionMs: [Math.min(r0, r1), Math.max(r0, r1)],
      maxOrdersPerSec: num(h.maxOrdersPerSec, d.human.maxOrdersPerSec, 1, 30),
    },
    reconnect: bool(r.reconnect, d.reconnect),
  };
}

/**
 * How many bots get each behavior: `total` split by the weights (largest remainder), in a fixed behavior order — the
 * runner then shuffles who gets which with the scenario's seed.
 */
export function splitBehaviors(weights: Partial<Record<BotBehavior, number>>, total: number): BotBehavior[] {
  const entries = (Object.keys(BOT_BEHAVIORS) as BotBehavior[]).map(k => [k, weights[k] ?? 0] as const).filter(([, w]) => w > 0);
  const sum = entries.reduce((s, [, w]) => s + w, 0);
  if (!sum || total <= 0) return [];
  const shares = entries.map(([k, w]) => ({ k, exact: (total * w) / sum, n: Math.floor((total * w) / sum) }));
  let left = total - shares.reduce((s, x) => s + x.n, 0);
  for (const s of [...shares].sort((a, b) => (b.exact - b.n) - (a.exact - a.n))) { if (left <= 0) break; s.n++; left--; }
  return shares.flatMap(s => Array<BotBehavior>(s.n).fill(s.k));
}

/** One bot of the dev API's list (GET /api/dev/bots). */
export interface BotInfo {
  username: string;
  charId: string;
  gender?: Gender;
  gear?: BotTemplate['gear'];
  templateTitle?: string;
  horse?: string;
  name: string;
  faction: string;
  level: number;
  mapId: number;
  online: boolean;
  /** Template the bot was made / last reset with (file name, '' = unsaved). */
  template: string;
  /** Template not applied yet (it is applied when the bot next enters the game). */
  pending: boolean;
}

/** A bot the runner may connect as (POST /api/dev/bots/login). */
export interface BotLogin { username: string; token: string; charId: string; mapId: number; autoBuff?: boolean }
