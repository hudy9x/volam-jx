import { getSkill, maxLevelOf, isCastable, skillCategory } from '../skills/index.js';
import { dropTableFor, rollEquipmentFromTable } from '../formulas/drops.js';
import { ITEMS, type ItemDef } from '../items/items.js';
import { GOLDEN_BOSS_CONFIG } from './config.js';
import {
  BOSS_FACTIONS,
  GOLDEN_BOSS_SPECIAL_ITEMS,
  GOLD_SUITES,
  type GoldenBossConfig,
  type GoldenBossEntry,
  type GoldenBossGlobalSettings,
} from './types.js';

export * from './types.js';
export * from '../formulas/boss-resistance.js';
import { validateBossResistance } from '../formulas/boss-resistance.js';
export { GOLDEN_BOSS_CONFIG } from './config.js';

let currentConfig: GoldenBossConfig = GOLDEN_BOSS_CONFIG;
let byIdMap = new Map<number, GoldenBossEntry>(currentConfig.bosses.map(b => [b.id, b]));

/** Lấy cấu hình Boss Hoàng Kim hiện hành trong bộ nhớ. */
export function getGoldenBossConfig(): GoldenBossConfig {
  return currentConfig;
}

/** Cập nhật cấu hình Boss Hoàng Kim trong bộ nhớ (khi lưu từ công cụ web hoặc tải lại file). */
export function setGoldenBossConfig(cfg: GoldenBossConfig): void {
  currentConfig = cfg;
  byIdMap = new Map(cfg.bosses.map(b => [b.id, b]));
}

/** Tra cứu thông tin cài đặt của một Boss Hoàng Kim theo ID NPC. */
export function goldenBossById(id: number): GoldenBossEntry | undefined {
  return byIdMap.get(id);
}

/** Lấy danh sách các Boss Hoàng Kim đang bật (`enabled = true`) trên bản đồ `mapId`. */
export function goldenBossesForMap(mapId: number): GoldenBossEntry[] {
  return currentConfig.bosses.filter(b => b.enabled && b.mapId === mapId);
}

/**
 * Tính thời gian chờ (ms) tới lần xuất hiện tiếp theo của Boss Hoàng Kim dựa theo `settings.spawnMode`:
 * - 'continuous': xuất hiện lần đầu sau 2s, khi chết tạo lại sau `continuousRespawnSec` giây (mặc định 10s).
 * - 'fixedTimes': tính mốc giờ cố định gần nhất trong tương lai (vd: "08:30", "22:15").
 * - 'hourlyMinutes': tính mốc phút trong giờ gần nhất trong tương lai (vd: phút 5, 10, 30, 45 của mỗi giờ).
 */
export function nextGoldenBossSpawnDelayMs(
  nowMs: number,
  settings: GoldenBossGlobalSettings = currentConfig.settings,
  isInitialSpawn = false,
): number {
  if (settings.spawnMode === 'continuous') {
    if (isInitialSpawn) return 2000;
    return Math.max(1, Math.round(settings.continuousRespawnSec || 10)) * 1000;
  }

  if (settings.spawnMode === 'hourlyMinutes') {
    const mins = [...new Set(settings.hourlyMinutes.map(m => Math.floor(Number(m))).filter(m => m >= 0 && m <= 59))].sort((a, b) => a - b);
    if (!mins.length) return 60_000;
    const now = new Date(nowMs);
    for (let hOffset = 0; hOffset <= 2; hOffset++) {
      for (const m of mins) {
        const cand = new Date(now.getTime());
        cand.setHours(now.getHours() + hOffset, m, 0, 0);
        const diff = cand.getTime() - nowMs;
        if (diff > 1000) return diff;
      }
    }
    return 3600_000;
  }

  if (settings.spawnMode === 'fixedTimes') {
    const parsed = settings.fixedTimes
      .map(s => {
        const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
        if (!m) return null;
        const hh = Number(m[1]), mm = Number(m[2]);
        return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 ? [hh, mm] as const : null;
      })
      .filter((x): x is readonly [number, number] => !!x);
    if (!parsed.length) return 3600_000;
    const now = new Date(nowMs);
    let bestDiff = Infinity;
    for (let dOffset = 0; dOffset <= 1; dOffset++) {
      for (const [hh, mm] of parsed) {
        const cand = new Date(now.getTime());
        cand.setDate(now.getDate() + dOffset);
        cand.setHours(hh, mm, 0, 0);
        const diff = cand.getTime() - nowMs;
        if (diff > 1000 && diff < bestDiff) bestDiff = diff;
      }
    }
    return Number.isFinite(bestDiff) ? bestDiff : 3600_000;
  }

  return 10_000;
}

export interface GoldenBossRollRates {
  goldRatePct: number;
  specialRatePct: number;
  equipRatePct: number;
  specialItems?: readonly string[];
}

/**
 * Quay 1 lần vật phẩm rơi ra từ Boss Hoàng Kim theo bộ tỉ lệ `rates` truyền vào.
 */
export function rollGoldenBossItemWithRates(
  bossId: number,
  level: number,
  rates: GoldenBossRollRates,
  rng: () => number,
): ItemDef | null {
  const boss = byIdMap.get(bossId);
  const goldRate = Math.max(0, Number(rates.goldRatePct) || 0);
  const specialRate = Math.max(0, Number(rates.specialRatePct) || 0);
  const blueRate = Math.max(0, Number(rates.equipRatePct) || 0);
  const roll = rng() * 100;

  // 1. Trúng nhóm Trang bị Hoàng Kim
  if (roll < goldRate) {
    const pool = (boss?.goldDrops ?? []).filter(id => ITEMS[id]);
    if (pool.length > 0) {
      const pick = pool[Math.floor(rng() * pool.length)];
      return ITEMS[pick] ?? null;
    }
    // Nếu Boss chưa gắn đồ HK riêng, thử lấy đồ HK thuộc môn phái của Boss
    const factionSuites = new Set(GOLD_SUITES.filter(s => s.faction === boss?.faction).map(s => s.suite));
    const factionPool = Object.values(ITEMS).filter(it => it.gold && factionSuites.has(it.gold.suite));
    if (factionPool.length > 0) {
      return factionPool[Math.floor(rng() * factionPool.length)] ?? null;
    }
  }

  // 2. Trúng nhóm Vật phẩm Đặc biệt
  if (roll < goldRate + specialRate) {
    const ids = rates.specialItems?.length ? rates.specialItems : GOLDEN_BOSS_SPECIAL_ITEMS;
    const spPool = ids.map(id => ITEMS[id]).filter((it): it is ItemDef => !!it);
    if (spPool.length > 0) {
      return spPool[Math.floor(rng() * spPool.length)] ?? null;
    }
  }

  // 3. Trúng nhóm Trang bị Xanh
  if (roll < goldRate + specialRate + blueRate) {
    const levelTable = dropTableFor(Math.max(90, level));
    if (levelTable) {
      return rollEquipmentFromTable(levelTable, Math.max(90, level), rng);
    }
  }

  return null;
}

/**
 * Quay 1 lần vật phẩm rơi ra từ Boss Hoàng Kim dựa theo tỉ lệ cài đặt trong `settings`:
 * - `goldRatePct` %: Rơi 1 trang bị Hoàng Kim trong danh sách `boss.goldDrops` (nếu Boss có gắn đồ HK).
 * - `specialRatePct` %: Rơi 1 vật phẩm đặc biệt (Bí kíp 90/120/150, Đại thành bí kíp, Ngũ Hoa Ngọc Lộ Hoàn...).
 * - `blueRatePct` %: Rơi 1 trang bị xanh theo cấp độ của Boss.
 */
export function rollGoldenBossItem(bossId: number, level: number, rng: () => number): ItemDef | null {
  const { settings } = currentConfig;
  return rollGoldenBossItemWithRates(
    bossId,
    level,
    {
      goldRatePct: settings.goldRatePct,
      specialRatePct: settings.specialRatePct,
      equipRatePct: settings.blueRatePct,
    },
    rng,
  );
}

/** Kiểm tra tính hợp lệ của toàn bộ cấu hình Boss Hoàng Kim (bao gồm ràng buộc không trùng ID trang bị Hoàng Kim). */
export function validateGoldenBossConfig(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'Dữ liệu cấu hình không hợp lệ.';
  const cfg = raw as GoldenBossConfig;
  if (!cfg.settings || typeof cfg.settings !== 'object') return 'Thiếu phần cài đặt chung (settings).';
  const s = cfg.settings;
  if (!['continuous', 'fixedTimes', 'hourlyMinutes'].includes(s.spawnMode)) {
    return 'Chế độ xuất hiện (spawnMode) không hợp lệ.';
  }
  if (!Number.isFinite(s.continuousRespawnSec) || s.continuousRespawnSec < 1 || s.continuousRespawnSec > 86400) {
    return 'Thời gian hồi sinh liên tục phải từ 1 đến 86400 giây.';
  }
  if (!Array.isArray(s.fixedTimes)) return 'Danh sách giờ cố định (fixedTimes) phải là mảng.';
  for (const t of s.fixedTimes) {
    if (typeof t !== 'string' || !/^([01]?\d|2[0-3]):[0-5]\d$/.test(t.trim())) {
      return `Giờ cố định "${t}" không đúng định dạng HH:mm (ví dụ: 08:30, 22:15).`;
    }
  }
  if (!Array.isArray(s.hourlyMinutes)) return 'Danh sách số phút mỗi giờ (hourlyMinutes) phải là mảng.';
  for (const m of s.hourlyMinutes) {
    if (!Number.isInteger(m) || m < 0 || m > 59) {
      return `Số phút "${m}" phải là số nguyên từ 0 đến 59.`;
    }
  }
  if (!Number.isInteger(s.dropRolls) || s.dropRolls < 1 || s.dropRolls > 100) {
    return 'Số lượng tung ra (dropRolls) phải từ 1 đến 100.';
  }
  for (const [label, val] of [
    ['Trang bị Xanh', s.blueRatePct],
    ['Vật phẩm Đặc biệt', s.specialRatePct],
    ['Trang bị Hoàng Kim', s.goldRatePct],
  ] as const) {
    if (typeof val !== 'number' || !Number.isFinite(val) || val < 0 || val > 100) {
      return `Tỉ lệ rơi ${label} phải từ 0% đến 100%.`;
    }
  }
  if (s.blueRatePct + s.specialRatePct + s.goldRatePct > 100.001) {
    return `Tổng 3 tỉ lệ rơi (Xanh ${s.blueRatePct}% + Đặc biệt ${s.specialRatePct}% + Hoàng Kim ${s.goldRatePct}%) không được vượt quá 100%.`;
  }

  if (!Array.isArray(cfg.bosses) || !cfg.bosses.length) {
    return 'Danh sách Boss không được để trống.';
  }
  const validFactions = new Set(BOSS_FACTIONS.map(f => f.id));
  const usedGoldByBoss = new Map<string, string>();
  const seenBossIds = new Set<number>();

  for (const b of cfg.bosses) {
    if (!b || typeof b !== 'object') return 'Mục Boss không hợp lệ.';
    for (const [key, min, max, integer] of [
      ['hp', 1, 2_000_000_000, true],
      ['damagePercent', 1, 10000, false],
      ['attackCooldown', 0.05, 60, false],
      ['leash', 50, 10000, false],
    ] as const) {
      const value = b[key];
      if (value !== undefined && (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value)))) {
        return `Boss #${b.id}: ${key} phải từ ${min} đến ${max}${integer ? ' (số nguyên)' : ''}.`;
      }
    }
    if (b.controlReduction !== undefined) {
      if (!b.controlReduction || typeof b.controlReduction !== 'object' || Array.isArray(b.controlReduction)) return `Boss #${b.id}: mức giảm hiệu ứng không hợp lệ.`;
      for (const [key,max] of [['hurt',100],['cold',77],['stun',95],['poison',95]] as const) {
        const value=b.controlReduction[key];
        if (value !== undefined && (!Number.isFinite(value) || value < 0 || value > max)) return `Boss #${b.id}: giảm ${key} phải từ 0 đến ${max}%.`;
      }
    }
    if (b.skillLevelsFixed !== undefined && typeof b.skillLevelsFixed !== 'boolean') return `Boss #${b.id}: chế độ cấp kỹ năng không hợp lệ.`;
    if (!Array.isArray(b.skills) || b.skills.length < 1 || b.skills.length > 32) return `Boss #${b.id}: cần từ 1 đến 32 kỹ năng.`;
    const skillIds = new Set<number>();
    for (const pair of b.skills) {
      if (!Array.isArray(pair) || pair.length !== 2) return `Boss #${b.id}: kỹ năng phải gồm mã và cấp.`;
      const [id, level] = pair;
      const skill = getSkill(id);
      if (!Number.isInteger(id) || !skill || skillIds.has(id)) return `Boss #${b.id}: kỹ năng không tồn tại hoặc bị trùng (#${id}).`;
      if (!Number.isInteger(level) || level < 1 || level > maxLevelOf(skill)) return `Boss #${b.id}: cấp ${skill.name} phải từ 1 đến ${maxLevelOf(skill)}.`;
      skillIds.add(id);
    }
    if (!b.skills.some(([id]) => isCastable(getSkill(id)!) && skillCategory(getSkill(id)!) === 'attack')) return `Boss #${b.id}: cần ít nhất một chiêu tấn công chủ động.`;
    const resistanceError = validateBossResistance(b.resistance);
    if (resistanceError) return resistanceError;
    if (!Number.isInteger(b.id) || b.id <= 0) return `ID Boss không hợp lệ: ${b.id}`;
    if (seenBossIds.has(b.id)) return `Trùng ID Boss: #${b.id}`;
    seenBossIds.add(b.id);
    if (!b.name || typeof b.name !== 'string') return `Boss #${b.id} thiếu tên.`;
    if (!validFactions.has(b.faction)) return `Boss ${b.name} (#${b.id}) có hệ phái không hợp lệ: ${b.faction}`;
    if (!Number.isInteger(b.mapId) || b.mapId <= 0) return `Boss ${b.name} (#${b.id}) có bản đồ không hợp lệ.`;
    if (!Number.isFinite(b.x) || !Number.isFinite(b.y) || b.x < 0 || b.y < 0) {
      return `Boss ${b.name} (#${b.id}) có tọa độ (x, y) không hợp lệ.`;
    }
    if (!Array.isArray(b.goldDrops)) return `Boss ${b.name} (#${b.id}): goldDrops phải là mảng.`;
    for (const gid of b.goldDrops) {
      if (typeof gid !== 'string' || !/^gold-\d+$/.test(gid)) {
        return `Boss ${b.name} (#${b.id}) có mã trang bị Hoàng Kim không hợp lệ: ${gid}`;
      }
      const prevOwner = usedGoldByBoss.get(gid);
      if (prevOwner && prevOwner !== `${b.name} (#${b.id})`) {
        return `Trang bị Hoàng Kim ${gid} đã được chọn cho ${prevOwner}, không thể chọn trùng cho ${b.name} (#${b.id})!`;
      }
      usedGoldByBoss.set(gid, `${b.name} (#${b.id})`);
    }
  }
  return null;
}

/** Xuất nội dung file TypeScript `packages/shared/src/bosses/config.ts`. */
export function formatGoldenBossConfigTs(cfg: GoldenBossConfig): string {
  return `// File cài đặt Boss Hoàng Kim trong game (được đọc/ghi trực tiếp bởi công cụ web tools/boss).
// Bạn có thể chỉnh sửa qua giao diện \`npm run boss\` và bấm Lưu cài đặt.
import type { GoldenBossConfig } from './types.js';

export const GOLDEN_BOSS_CONFIG: GoldenBossConfig = ${JSON.stringify(cfg, null, 2)};
`;
}
