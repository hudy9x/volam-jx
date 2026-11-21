// Chiến trường Tống Kim (theo tài liệu volam-3005/documents/tong-kim, map báo danh 323 -> chiến trường Xung phong 378).
// TS thuần, dùng chung cho server, client và bot runner.
import { isoDistance } from '../geometry.js';

export type TkCamp = 'tong' | 'kim';
export type TkMode = 1 | 2; // 1: Bảo vệ Nguyên soái, 2: Cừu sát
export type TkPhase = 'closed' | 'signup' | 'fighting' | 'ended';
export type TkRank = 1 | 2 | 3 | 4 | 5;

export const TK_SIGNUP_MAP_ID = 323;
export const TK_BATTLE_MAP_ID = 378;

export const TK_MIN_LEVEL = 60;
export const TK_SIGNUP_FEE = 3000;
export const TK_BALANCE_DIFF = 2;
export const TK_MAX_PER_CAMP = 100;
export const TK_CAMP_KICK_SEC = 180;
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

/** Hằng số tính điểm gốc (volam-3005 Server/script/header/tongkim.lua). */
export const TK_POINTS = {
  killPlayerBase: 60,
  killNpcSoldier: 6,
  killNpcCaptain: 30,
  killNpcCommander: 90,
  killMarshal: 1000,
  streakBase: 10,
  winBonusPerRank: 400,
  top1Exp: 100_000_000,
  top1ElixirCount: 3,
  top2to10Exp: 100_000_000,
  top2to10ElixirCount: 1,
} as const;

export const TK_MODE_NAMES: Record<TkMode, string> = {
  1: 'Bảo vệ Nguyên soái',
  2: 'Cừu sát',
};

export const TK_CAMP_NAMES: Record<TkCamp, string> = {
  tong: 'Đại Tống',
  kim: 'Đại Kim',
};

export const TK_CAMP_COLORS: Record<TkCamp, string> = {
  tong: '#5cb8ff',
  kim: '#ff6b57',
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

export type TkNpcRole = 'soldier' | 'captain' | 'commander' | 'marshal';

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
}

/**
 * Bố trí chiến trường Xung phong (Map 378 — 19456x10752):
 * - Tống ở Tây Nam (SW), Kim ở Đông Bắc (NE), giao tranh dọc trục chéo qua trung tâm (9744, 5384).
 * Tất cả điểm đều đã kiểm tra walkable trên nav.json của map 378.
 */
export const TK_MAP_LAYOUT: Record<TkCamp, TkCampLayout> = {
  tong: {
    spawn: { x: 2808, y: 9248 },
    safeRadius: 1150,
    gateExit: { x: 5648, y: 7472 },
    marshal: { x: 7600, y: 6200 },
    frontlines: [
      { x: 8200, y: 6100 },
      { x: 8600, y: 5800 },
      { x: 9000, y: 5600 },
      { x: 9200, y: 5900 },
      { x: 8800, y: 5300 },
      { x: 9400, y: 5500 },
    ],
    npcSpawns: [
      { role: 'soldier', x: 7600, y: 6200, count: 6, radius: 320 },
      { role: 'soldier', x: 8600, y: 5800, count: 8, radius: 420 },
      { role: 'captain', x: 8100, y: 6000, count: 2, radius: 220 },
      { role: 'captain', x: 9000, y: 5600, count: 2, radius: 220 },
      { role: 'commander', x: 7900, y: 6100, count: 2, radius: 180 },
    ],
  },
  kim: {
    spawn: { x: 17168, y: 1504 },
    safeRadius: 1250,
    gateExit: { x: 13168, y: 3560 },
    marshal: { x: 11400, y: 4800 },
    frontlines: [
      { x: 11000, y: 4800 },
      { x: 10600, y: 5000 },
      { x: 10200, y: 5200 },
      { x: 10400, y: 4700 },
      { x: 10000, y: 5400 },
      { x: 10800, y: 5200 },
    ],
    npcSpawns: [
      { role: 'soldier', x: 11400, y: 4800, count: 6, radius: 320 },
      { role: 'soldier', x: 10500, y: 5100, count: 8, radius: 420 },
      { role: 'captain', x: 11000, y: 4900, count: 2, radius: 220 },
      { role: 'captain', x: 10200, y: 5200, count: 2, radius: 220 },
      { role: 'commander', x: 11200, y: 4850, count: 2, radius: 180 },
    ],
  },
};

/** Kiểm tra một điểm trên map 378 có nằm trong Hậu doanh an toàn của phe nào không. */
export function tkHomeCampAt(mapId: number, x: number, y: number): TkCamp | null {
  if (mapId !== TK_BATTLE_MAP_ID) return null;
  for (const camp of ['tong', 'kim'] as const) {
    const { spawn, safeRadius } = TK_MAP_LAYOUT[camp];
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
