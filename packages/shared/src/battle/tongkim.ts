// Chiến trường Tống Kim (theo tài liệu volam-3005/documents/tong-kim, map báo danh 323 -> chiến trường tùy chọn, mặc định 378).
// TS thuần, dùng chung cho server, client và bot runner.
import { isoDistance } from '../geometry.js';
import type { Element } from '../characters/factions.js';
import type { MapMeta } from '../maps/types.js';
import tkMapsSource from './tk-maps.json' with { type: 'json' };

export type TkCamp = 'tong' | 'kim';
export type TkMode = 1 | 2 | 3; // 1: Bảo vệ Nguyên soái, 2: Cừu sát, 3: Phá Trụ
export type TkLaneId = 'top' | 'mid' | 'bot';
export type TkTowerTier = 'outer' | 'guard' | 'nexus';
export type TkMinionType = 'melee' | 'ranged' | 'siege' | 'super';
export type TkPhase = 'closed' | 'signup' | 'fighting' | 'ended';
export type TkRank = 1 | 2 | 3 | 4 | 5;

export const TK_SIGNUP_MAP_ID = 323;
export const TK_BATTLE_MAP_ID = 378;

export const TK_MIN_LEVEL = 60;
export const TK_SIGNUP_FEE = 3000;
export const TK_BALANCE_DIFF = 2;
export const TK_MAX_PER_CAMP = 100;
export const TK_CAMP_KICK_SEC = 60;
export const TK_GATE_WAIT_SEC = 5;
export const TK_RESPAWN_DELAY_MS = 5000;
export const TK_EXP_PER_ACCUM = 100;

/** Khung giờ tự động mở trận trong ngày (HH:MM, theo volam-3005 TONGKIM_TIMER). */
export const TK_SCHEDULE: readonly { hour: number; minute: number; mode: TkMode }[] = [
  { hour: 10, minute: 50, mode: 1 },
  { hour: 12, minute: 50, mode: 2 },
  { hour: 14, minute: 50, mode: 1 },
  { hour: 16, minute: 50, mode: 2 },
  { hour: 18, minute: 50, mode: 1 },
  { hour: 20, minute: 50, mode: 2 },
  { hour: 22, minute: 50, mode: 1 },
];

export const TK_DEFAULT_TIMING = {
  signupSec: 180,
  marshalDelaySec: 300,
  durationSec: 900,
  endSec: 60,
} as const;

/** Hằng số tính điểm gốc (volam-3005 Server/script/header/tongkim.lua + cân bằng cho trận 10 phút). */
export const TK_POINTS = {
  killPlayerBase: 60,
  killNpcSoldier: 25,
  killNpcCaptain: 80,
  killNpcCommander: 220,
  killNpcDeputy: 380,
  killNpcGeneral: 600,
  killMarshal: 2500,
  streakBase: 10,
  winBonusPerRank: 400,
  top1Exp: 100_000_000,
  top1ElixirCount: 3,
  top2to10Exp: 100_000_000,
  top2to10ElixirCount: 1,
  botBaseMoney: 2_000_000,
  botBaseExp: 50_000_000,
} as const;

export const TK_MODE_NAMES: Record<TkMode, string> = {
  1: 'Bảo vệ Nguyên soái',
  2: 'Cừu sát',
  3: 'Phá Trụ',
};

/** Hằng số cân bằng cho chế độ Phá Trụ (Mode 3). */
export const TK_SIEGE = {
  /** Tầm bắn trụ (iso px), lớn hơn tầm đánh xa nhất của người chơi (600 px) để chống góc lag. */
  towerRange: 750,
  /** Nhịp bắn của trụ (ms). */
  towerAttackMs: 500,
  /** Số mục tiêu người chơi tối đa trụ bắn cùng lúc khi bị băng trụ đông. */
  towerMaxMultiTargets: 6,
  /** Bán kính nổ lan AoE quanh mục tiêu khi trụ bắn người chơi (iso px). */
  towerSplashRadius: 200,
  /** Sóng xung chấn 360° mỗi mốc mất 25% HP trụ: gây % maxHP + choáng. */
  towerPulsePct: 0.40,
  towerPulseStunMs: 1500,
  /** Giảm sát thương người chơi/bot gây lên lính đẩy đường. */
  minionPlayerDmgMul: 0.5,
  /** Sát thương trụ lên người chơi theo chuỗi hit liên tiếp (% maxHP xuyên kháng & xuyên khiên). */
  towerPlayerHitPct: [0.50, 0.75, 1.00] as readonly number[],
  /** Thời gian giữ chuỗi hit trên mục tiêu (ms). */
  towerRampResetMs: 4000,
  /** Thời gian giữ ưu tiên Call for Help khi đánh đồng minh trong tầm trụ (ms). */
  towerCallForHelpMs: 3000,
  /** Sát thương trụ lên lính (% maxHP mỗi phát). */
  towerMinionHitPct: { melee: 0.35, ranged: 0.55, siege: 0.14, super: 0.10 } as Record<TkMinionType, number>,
  /** Máu gốc trụ (chưa nhân sĩ số). */
  towerBaseHp: { outer: 3_000_000, guard: 4_500_000, nexus: 8_000_000 } as Record<TkTowerTier, number>,
  /** Trần sát thương tối đa trụ nhận mỗi giây (% maxHP/s). */
  towerDpsCapPct: { withMinion: 0.05, backdoor: 0.015 },
  /** Hệ số giảm sát thương khi không có lính địch trong tầm trụ (chống đẩy lén). */
  backdoorDmgMul: 0.3,
  /** Chu kỳ sinh đợt lính mới (ms). */
  waveIntervalMs: 30_000,
  /** Số lính tối đa mỗi đường / mỗi phe để bảo đảm hiệu năng server 20 tick/s. */
  maxMinionsPerLane: 18,
  /** Thời gian hồi sinh tăng dần theo tiến độ trận đấu (ms). */
  respawnMinMs: 5_000,
  respawnMaxMs: 25_000,
  /** Điểm Tống Kim thưởng khi phá hủy công trình. */
  towerPoints: { outer: 800, guard: 1200, nexus: 3000 } as Record<TkTowerTier, number>,
  /** Điểm thưởng thêm cho toàn phe khi phá trụ. */
  towerTeamBonus: { outer: 200, guard: 350, nexus: 1000 } as Record<TkTowerTier, number>,
} as const;

/** Chiêu cố định 90/150 nội công của Thiên Nhẫn (#362, #1076), Võ Đang (#365, #1078) và Côn Lôn (#375, #1081). */
export const TK_TOWER_SKILLS = [362, 1076, 365, 1078, 375, 1081] as const;

export function tkTowerHpScale(totalParticipants: number): number {
  const extra = Math.max(0, totalParticipants - 10) * 0.08;
  return 1 + Math.min(4, extra);
}

export function tkRespawnDelayMs(mode: TkMode, elapsedSec: number, durationSec: number): number {
  if (mode !== 3) return TK_RESPAWN_DELAY_MS;
  const ratio = durationSec > 0 ? Math.max(0, Math.min(1, elapsedSec / durationSec)) : 0;
  return Math.round(TK_SIEGE.respawnMinMs + (TK_SIEGE.respawnMaxMs - TK_SIEGE.respawnMinMs) * ratio);
}

export function tkTowerSkillForElement(_el: Element, idx = 0): number {
  return TK_TOWER_SKILLS[Math.abs(idx) % TK_TOWER_SKILLS.length];
}

export function tkTowerSpriteFor(camp: TkCamp, tier: TkTowerTier, el: Element): string {
  if (tier === 'nexus') return camp === 'tong' ? 'enemy190' : 'enemy191';
  switch (el) {
    case 'kim': return 'enemy231';
    case 'moc': return 'enemy229';
    case 'thuy': return 'enemy228';
    case 'hoa': return 'enemy227';
    case 'tho': return 'enemy230';
  }
}

export const TK_CAMP_NAMES: Record<TkCamp, string> = {
  tong: 'Đại Tống',
  kim: 'Đại Kim',
};

/** Màu tên giống Chính phái (#e8b878) cho Tống và Tà phái (#d58cff) cho Kim. */
export const TK_CAMP_COLORS: Record<TkCamp, string> = {
  tong: '#e8b878',
  kim: '#d58cff',
};

export interface TkRankInfo {
  rank: TkRank;
  minPoints: number;
  tongTitle: string;
  kimTitle: string;
  /** SHXT skill 661: lifemax_p = 10 + 10 * rank */
  lifeMaxPct: number;
  /** SHXT skill 661: allres_p = 5 * (rank - 1) */
  allResPct: number;
}

export const TK_RANKS: readonly TkRankInfo[] = [
  { rank: 1, minPoints: 0, tongTitle: 'Tống Binh', kimTitle: 'Kim Binh', lifeMaxPct: 20, allResPct: 0 },
  { rank: 2, minPoints: 1000, tongTitle: 'Tống Hiệu úy', kimTitle: 'Kim Hiệu úy', lifeMaxPct: 30, allResPct: 5 },
  { rank: 3, minPoints: 3000, tongTitle: 'Tống Thống lĩnh', kimTitle: 'Kim Thống lĩnh', lifeMaxPct: 40, allResPct: 10 },
  { rank: 4, minPoints: 6000, tongTitle: 'Tống Phó tướng', kimTitle: 'Kim Phó tướng', lifeMaxPct: 50, allResPct: 15 },
  { rank: 5, minPoints: 10000, tongTitle: 'Tống Đại tướng', kimTitle: 'Kim Đại tướng', lifeMaxPct: 60, allResPct: 20 },
];

export function tkRankForPoints(points: number): TkRank {
  let rank: TkRank = 1;
  for (const r of TK_RANKS) {
    if (points >= r.minPoints) rank = r.rank;
  }
  return rank;
}

export function tkRankInfo(rank: number): TkRankInfo {
  return TK_RANKS[Math.max(0, Math.min(TK_RANKS.length - 1, Math.floor(rank) - 1))] ?? TK_RANKS[0];
}

export function tkTitleOf(camp: TkCamp, rank: number): string {
  const info = tkRankInfo(rank);
  return camp === 'tong' ? info.tongTitle : info.kimTitle;
}

/**
 * Công thức điểm hạ người chơi gốc volam-3005 (death_tongkim.lua):
 * killPts = 60 + 60 * victimRank; streakPts = 10 + newStreak.
 */
export function tkKillPlayerPoints(victimRank: number, newStreak: number): { killPts: number; streakPts: number; total: number } {
  const r = Math.max(1, Math.min(5, Math.floor(victimRank) || 1));
  const killPts = TK_POINTS.killPlayerBase + TK_POINTS.killPlayerBase * r;
  const streakPts = TK_POINTS.streakBase + Math.max(1, Math.floor(newStreak));
  return { killPts, streakPts, total: killPts + streakPts };
}

/**
 * Hệ số nhân thưởng Tống Kim cho bot theo thứ hạng bảng tổng sắp (1-based).
 * Top 1: ×5, Top 2–3: ×3.5, Top 4–5: ×3, Top 6–10: ×2, ngoài Top 10 (hoặc 0 điểm): ×1.
 */
export function tkBotRewardMultiplier(rankPos: number, points: number): number {
  if (!(points > 0) || rankPos <= 0 || rankPos > 10) return 1;
  if (rankPos === 1) return 5;
  if (rankPos <= 3) return 3.5;
  if (rankPos <= 5) return 3;
  return 2;
}

export type TkNpcRole = 'soldier' | 'captain' | 'commander' | 'deputy' | 'general' | 'marshal';

/**
 * Tỉ lệ triệu hồi ngẫu nhiên của Binh Sĩ Hiệu Phù:
 * 70% Binh sĩ (`soldier`), 20% Hiệu úy (`captain`), 10% Thống lĩnh (`commander`).
 */
export function rollClarionNpcRole(rand: () => number = Math.random): 'soldier' | 'captain' | 'commander' {
  const r = rand();
  if (r < 0.7) return 'soldier';
  if (r < 0.9) return 'captain';
  return 'commander';
}

export interface TkTowerSpec {
  id: string;
  tier: TkTowerTier;
  lane?: TkLaneId;
  element: Element;
  x: number;
  y: number;
}

export interface TkSiegeCampConfig {
  towers: readonly TkTowerSpec[];
  lanes: Record<TkLaneId, readonly { x: number; y: number }[]>;
}

export interface TkCampLayout {
  /** Điểm hồi sinh / vào Hậu doanh (an toàn). */
  spawn: { x: number; y: number };
  /** Bán kính vùng an toàn Hậu doanh (tính theo isoDistance từ spawn). */
  safeRadius: number;
  /** Điểm bên ngoài cổng khi bước qua cổng doanh trại. */
  gateExit: { x: number; y: number };
  /** Tọa độ Nguyên Soái khi xuất hiện (Mode 1). */
  marshal: { x: number; y: number };
  /** 6 điểm tiền tuyến khi dùng Đặc thám / Trinh sát. */
  frontlines: readonly { x: number; y: number }[];
  /** Các tuyến sinh lính/tướng khi khai chiến Mode 1. */
  npcSpawns: readonly { role: Exclude<TkNpcRole, 'marshal'>; x: number; y: number; count: number; radius: number }[];
  /** Cấu hình 6 trụ & 3 đường cho chế độ Phá Trụ (Mode 3). */
  siege?: TkSiegeCampConfig;
}

export interface TkBattleMapConfig {
  id: number;
  name?: string;
  tong: TkCampLayout;
  kim: TkCampLayout;
}

export interface TkMapsFile {
  version: 1;
  maps: Record<string, TkBattleMapConfig>;
}

const TK_NPC_ROLES = new Set<Exclude<TkNpcRole, 'marshal'>>(['soldier', 'captain', 'commander', 'deputy', 'general']);

function cloneCampLayout(c: TkCampLayout): TkCampLayout {
  return {
    spawn: { x: c.spawn.x, y: c.spawn.y },
    safeRadius: c.safeRadius,
    gateExit: { x: c.gateExit.x, y: c.gateExit.y },
    marshal: { x: c.marshal.x, y: c.marshal.y },
    frontlines: c.frontlines.map(p => ({ x: p.x, y: p.y })),
    npcSpawns: c.npcSpawns.map(g => ({ role: g.role, x: g.x, y: g.y, count: g.count, radius: g.radius })),
    ...(c.siege ? {
      siege: {
        towers: c.siege.towers.map(t => ({ ...t })),
        lanes: {
          top: c.siege.lanes.top.map(p => ({ x: p.x, y: p.y })),
          mid: c.siege.lanes.mid.map(p => ({ x: p.x, y: p.y })),
          bot: c.siege.lanes.bot.map(p => ({ x: p.x, y: p.y })),
        },
      },
    } : {}),
  };
}

function validatePoint(p: unknown, label: string, meta?: MapMeta): { x: number; y: number } {
  if (!p || typeof p !== 'object') throw Error(`${label}: thiếu tọa độ.`);
  const x = Number((p as { x?: unknown }).x), y = Number((p as { y?: unknown }).y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0) throw Error(`${label}: tọa độ không hợp lệ.`);
  if (meta && (x >= meta.raw.size.width || y >= meta.raw.size.height)) throw Error(`${label}: tọa độ nằm ngoài kích thước bản đồ.`);
  return { x: Math.round(x), y: Math.round(y) };
}

export function validateTkCampLayout(value: unknown, campName: string, meta?: MapMeta): TkCampLayout {
  if (!value || typeof value !== 'object') throw Error(`Phe ${campName}: thiếu dữ liệu bố trí.`);
  const raw = value as Partial<TkCampLayout>;
  const spawn = validatePoint(raw.spawn, `Phe ${campName} · Điểm tập trung`, meta);
  const safeRadius = Number(raw.safeRadius);
  if (!Number.isFinite(safeRadius) || safeRadius < 100 || safeRadius > 5000) {
    throw Error(`Phe ${campName} · Bán kính an toàn phải từ 100 đến 5000 px.`);
  }
  const gateExit = validatePoint(raw.gateExit, `Phe ${campName} · Điểm ngoài cổng`, meta);
  const marshal = validatePoint(raw.marshal, `Phe ${campName} · Nguyên Soái`, meta);
  const frontlinesRaw = Array.isArray(raw.frontlines) ? raw.frontlines : [];
  if (frontlinesRaw.length > 24) throw Error(`Phe ${campName} · Tối đa 24 điểm tiền tuyến.`);
  const frontlines = frontlinesRaw.map((p, idx) => validatePoint(p, `Phe ${campName} · Tiền tuyến #${idx + 1}`, meta));
  const npcSpawnsRaw = Array.isArray(raw.npcSpawns) ? raw.npcSpawns : [];
  if (npcSpawnsRaw.length > 64) throw Error(`Phe ${campName} · Tối đa 64 cụm sinh lính/tướng.`);
  const npcSpawns = npcSpawnsRaw.map((g, idx) => {
    if (!g || typeof g !== 'object') throw Error(`Phe ${campName} · Cụm NPC #${idx + 1} không hợp lệ.`);
    const role = (g as { role?: unknown }).role as Exclude<TkNpcRole, 'marshal'>;
    if (!TK_NPC_ROLES.has(role)) throw Error(`Phe ${campName} · Loại NPC không hợp lệ.`);
    const pt = validatePoint(g, `Phe ${campName} · Cụm NPC #${idx + 1}`, meta);
    const count = Math.round(Number((g as { count?: unknown }).count));
    const radius = Math.round(Number((g as { radius?: unknown }).radius));
    if (!Number.isFinite(count) || count < 1 || count > 30) throw Error(`Phe ${campName} · Số lượng cụm NPC #${idx + 1} phải từ 1 đến 30.`);
    if (!Number.isFinite(radius) || radius < 0 || radius > 2000) throw Error(`Phe ${campName} · Bán kính cụm NPC #${idx + 1} phải từ 0 đến 2000 px.`);
    return { role, x: pt.x, y: pt.y, count, radius };
  });
  return { spawn, safeRadius: Math.round(safeRadius), gateExit, marshal, frontlines, npcSpawns, ...(raw.siege ? { siege: raw.siege } : {}) };
}

export function validateTkBattleMap(value: unknown, meta?: MapMeta): TkBattleMapConfig {
  if (!value || typeof value !== 'object') throw Error('Cấu hình map Tống Kim không hợp lệ.');
  const raw = value as Partial<TkBattleMapConfig>;
  const id = Math.round(Number(raw.id));
  if (!Number.isInteger(id) || id <= 0) throw Error('ID map Tống Kim không hợp lệ.');
  const name = typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim().slice(0, 80) : meta?.name;
  return {
    id,
    ...(name ? { name } : {}),
    tong: validateTkCampLayout(raw.tong, 'Tống', meta),
    kim: validateTkCampLayout(raw.kim, 'Kim', meta),
  };
}

/** Toàn bộ các map Tống Kim đã cấu hình (đọc từ tk-maps.json). */
export const TK_MAPS: Record<number, TkBattleMapConfig> = {};

export function applyTkMaps(value: unknown): void {
  const file = value as Partial<TkMapsFile> | null;
  if (!file || file.version !== 1 || !file.maps || typeof file.maps !== 'object' || Array.isArray(file.maps)) {
    throw Error('tk-maps.json không hợp lệ.');
  }
  const next: Record<number, TkBattleMapConfig> = {};
  for (const [k, v] of Object.entries(file.maps)) {
    const cfg = validateTkBattleMap({ ...(v as object), id: (v as TkBattleMapConfig)?.id ?? Number(k) });
    next[cfg.id] = cfg;
  }
  for (const k of Object.keys(TK_MAPS)) delete TK_MAPS[Number(k)];
  for (const [k, v] of Object.entries(next)) TK_MAPS[Number(k)] = v;
}

applyTkMaps(tkMapsSource);

/** Alias giữ tương thích cho map mặc định 378. */
export const TK_MAP_LAYOUT: Record<TkCamp, TkCampLayout> = {
  get tong() { return TK_MAPS[TK_BATTLE_MAP_ID]?.tong ?? cloneCampLayout(Object.values(TK_MAPS)[0].tong); },
  get kim() { return TK_MAPS[TK_BATTLE_MAP_ID]?.kim ?? cloneCampLayout(Object.values(TK_MAPS)[0].kim); },
};

export function tkMapLayout(mapId: number): TkBattleMapConfig | undefined {
  return TK_MAPS[mapId];
}

export function isTkBattleMap(mapId: number): boolean {
  return Boolean(TK_MAPS[mapId]);
}

export function tkBattleMapOptions(): { id: number; name: string }[] {
  return Object.values(TK_MAPS)
    .sort((a, b) => a.id - b.id)
    .map(m => ({ id: m.id, name: m.name || `Chiến trường #${m.id}` }));
}

/** Kiểm tra một điểm trên map Tống Kim có nằm trong Hậu doanh an toàn của phe nào không. */
export function tkHomeCampAt(mapId: number, x: number, y: number): TkCamp | null {
  const layout = TK_MAPS[mapId];
  if (!layout) return null;
  for (const camp of ['tong', 'kim'] as const) {
    const { spawn, safeRadius } = layout[camp];
    if (isoDistance(x, y, spawn.x, spawn.y) <= safeRadius) return camp;
  }
  return null;
}

export function isInTkSafeCamp(mapId: number, x: number, y: number): boolean {
  return tkHomeCampAt(mapId, x, y) !== null;
}

/** Tọa độ điểm đến trên map 323 (Điểm báo danh) theo phe. */
export const TK_SIGNUP_ENTRY: Record<TkCamp, { x: number; y: number }> = {
  tong: { x: 766, y: 3035 },
  kim: { x: 2693, y: 1163 },
};
