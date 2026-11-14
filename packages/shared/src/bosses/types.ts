// Cấu hình và kiểu dữ liệu cho hệ thống Boss Hoàng Kim theo 10 môn phái (packages/shared/src/bosses/).
// Được sử dụng chung bởi game server (@vltk/server), client (@vltk/client) và công cụ quản trị web (tools/boss).
import type { Element } from '../characters/factions.js';

/** Chế độ xuất hiện của Boss Hoàng Kim trên toàn máy chủ. */
export type GoldenBossSpawnMode = 'continuous' | 'fixedTimes' | 'hourlyMinutes';

/** Phân nhóm cấp bậc của Boss Hoàng Kim. */
export type GoldenBossTier = 'major' | 'minor' | 'newboss' | 'special';

/** Cài đặt chung ở đầu trang cho toàn bộ Boss Hoàng Kim. */
export interface GoldenBossGlobalSettings {
  /**
   * Chế độ thời gian xuất hiện:
   * - 'continuous': Hiển thị liên tục, chết sẽ tự tạo lại sau `continuousRespawnSec` giây (chỉ nên dùng khi test).
   * - 'fixedTimes': Xuất hiện theo danh sách khung giờ cố định trong ngày (vd: ["08:30", "22:15"]).
   * - 'hourlyMinutes': Xuất hiện theo đúng các mốc phút trong mỗi giờ (vd: [5, 10, 30, 45] -> 7h05, 7h10, 7h30, 7h45...).
   */
  spawnMode: GoldenBossSpawnMode;
  /** Số giây tạo lại sau khi chết ở chế độ 'continuous' (mặc định 10s để test nhanh). */
  continuousRespawnSec: number;
  /** Danh sách giờ cố định định dạng "HH:mm" (24h), dùng khi spawnMode = 'fixedTimes'. */
  fixedTimes: string[];
  /** Danh sách số phút trong mỗi giờ (0–59, vd: [5, 10, 30, 45]), dùng khi spawnMode = 'hourlyMinutes'. */
  hourlyMinutes: number[];
  /** Số lần tung bảng rơi (số lượng vật phẩm tối đa tung ra) mỗi khi hạ gục Boss Hoàng Kim. */
  dropRolls: number;
  /** Tỉ lệ rơi Trang bị Xanh (%) trên mỗi lần tung (0–100). */
  blueRatePct: number;
  /** Tỉ lệ rơi Vật phẩm Đặc biệt (%) trên mỗi lần tung (0–100: Bí kíp 90/120/150, Đại thành bí kíp, thuốc quý...). */
  specialRatePct: number;
  /** Tỉ lệ rơi Trang bị Hoàng Kim (%) trên mỗi lần tung (0–100: lấy từ danh sách `goldDrops` của Boss đó). */
  goldRatePct: number;
}

/** Cấu hình chi tiết cho từng Boss Hoàng Kim. */
export interface GoldenBossEntry {
  /** ID NPC gốc trong npcs.txt (hoặc ID riêng của Boss). */
  id: number;
  /** Tên hiển thị của Boss Hoàng Kim. */
  name: string;
  /** Mã môn phái ('shaolin' .. 'kunlun') hoặc 'special' cho Boss tổng hợp. */
  faction: string;
  /** Phân loại: 'major' (Đại Hoàng Kim), 'minor' (Tiểu Hoàng Kim), 'newboss' (Boss 10 Phái), 'special' (Đặc biệt). */
  tier: GoldenBossTier;
  /** Ngũ hành của Boss ('kim' | 'moc' | 'thuy' | 'hoa' | 'tho'). */
  element: Element;
  /** Mã ngoại hình sprite (vd: 'boss018', 'boss046', 'enemy044'). */
  sprite: string;
  /** Cấp độ của Boss khi xuất hiện. */
  level: number;
  /** Cho phép Boss xuất hiện trong game hay tạm tắt. */
  enabled: boolean;
  /** Danh sách kỹ năng Boss sử dụng: [skillId, skillLevel]. */
  skills: [number, number][];
  /**
   * Danh sách ID trang bị Hoàng Kim ('gold-1' .. 'gold-140') rơi ra từ Boss này.
   * Ràng buộc: Mỗi ID trang bị Hoàng Kim chỉ được gắn cho tối đa 1 Boss duy nhất.
   */
  goldDrops: string[];
  /** ID bản đồ nơi Boss xuất hiện. */
  mapId: number;
  /** Tọa độ X chính xác trên bản đồ (world px). */
  x: number;
  /** Tọa độ Y chính xác trên bản đồ (world px). */
  y: number;
}

/** Toàn bộ cấu hình Boss Hoàng Kim lưu trong packages/shared/src/bosses/config.{ts,json}. */
export interface GoldenBossConfig {
  settings: GoldenBossGlobalSettings;
  bosses: GoldenBossEntry[];
}

/** Nhãn hiển thị cho từng bậc Boss. */
export const GOLDEN_BOSS_TIER_LABELS: Record<GoldenBossTier, string> = {
  major: 'Đại Hoàng Kim',
  minor: 'Tiểu Hoàng Kim',
  newboss: 'Boss 10 Phái',
  special: 'Boss Đặc Biệt',
};

/** Danh sách nhóm môn phái chuẩn của Boss Hoàng Kim. */
export interface BossFactionGroup {
  id: string;
  name: string;
  element: Element;
  menpai: number;
}

export const BOSS_FACTIONS: readonly BossFactionGroup[] = [
  { id: 'shaolin', name: 'Thiếu Lâm', element: 'kim', menpai: 0 },
  { id: 'tianwang', name: 'Thiên Vương', element: 'kim', menpai: 1 },
  { id: 'tangmen', name: 'Đường Môn', element: 'moc', menpai: 2 },
  { id: 'wudu', name: 'Ngũ Độc', element: 'moc', menpai: 3 },
  { id: 'emei', name: 'Nga My', element: 'thuy', menpai: 4 },
  { id: 'cuiyan', name: 'Thúy Yên', element: 'thuy', menpai: 5 },
  { id: 'gaibang', name: 'Cái Bang', element: 'hoa', menpai: 6 },
  { id: 'tianren', name: 'Thiên Nhẫn', element: 'hoa', menpai: 7 },
  { id: 'wudang', name: 'Võ Đang', element: 'tho', menpai: 8 },
  { id: 'kunlun', name: 'Côn Lôn', element: 'tho', menpai: 9 },
  { id: 'special', name: 'Đặc Biệt / Tổng Hợp', element: 'kim', menpai: -1 },
];

/** Thông tin 28 bộ trang bị Hoàng Kim Môn Phái (suite 1–28 trong GEN_GOLD, mỗi bộ 5 món = 140 món). */
export interface GoldSuiteMeta {
  suite: number;
  name: string;
  branch: string;
  faction: string;
  menpai: number;
}

export const GOLD_SUITES: readonly GoldSuiteMeta[] = [
  // Thiếu Lâm (menpai 0)
  { suite: 1, name: 'Bộ Mộng Long', branch: 'Thiếu Lâm Quyền', faction: 'shaolin', menpai: 0 },
  { suite: 2, name: 'Bộ Phục Ma', branch: 'Thiếu Lâm Côn', faction: 'shaolin', menpai: 0 },
  { suite: 3, name: 'Bộ Tứ Không', branch: 'Thiếu Lâm Đao', faction: 'shaolin', menpai: 0 },
  // Thiên Vương (menpai 1)
  { suite: 4, name: 'Bộ Hám Thiên', branch: 'Thiên Vương Chùy', faction: 'tianwang', menpai: 1 },
  { suite: 5, name: 'Bộ Kế Nghiệp', branch: 'Thiên Vương Thương', faction: 'tianwang', menpai: 1 },
  { suite: 6, name: 'Bộ Ngự Long', branch: 'Thiên Vương Đao', faction: 'tianwang', menpai: 1 },
  // Nga My (menpai 4)
  { suite: 7, name: 'Bộ Vô Gian', branch: 'Nga My Kiếm', faction: 'emei', menpai: 4 },
  { suite: 8, name: 'Bộ Vô Ma', branch: 'Nga My Chưởng', faction: 'emei', menpai: 4 },
  { suite: 9, name: 'Bộ Vô Trần', branch: 'Nga My Phụ Trợ', faction: 'emei', menpai: 4 },
  // Thúy Yên (menpai 5)
  { suite: 10, name: 'Bộ Tê Hoàng', branch: 'Thúy Yên Đao', faction: 'cuiyan', menpai: 5 },
  { suite: 11, name: 'Bộ Bích Hải', branch: 'Thúy Yên Song Đao', faction: 'cuiyan', menpai: 5 },
  // Ngũ Độc (menpai 3)
  { suite: 12, name: 'Bộ U Lung', branch: 'Ngũ Độc Chưởng', faction: 'wudu', menpai: 3 },
  { suite: 13, name: 'Bộ Minh Ảo', branch: 'Ngũ Độc Đao', faction: 'wudu', menpai: 3 },
  { suite: 14, name: 'Bộ Chú Phược', branch: 'Ngũ Độc Bùa', faction: 'wudu', menpai: 3 },
  // Đường Môn (menpai 2)
  { suite: 15, name: 'Bộ Băng Hàn', branch: 'Đường Môn Phi Đao', faction: 'tangmen', menpai: 2 },
  { suite: 16, name: 'Bộ Thiên Quang', branch: 'Đường Môn Tụ Tiễn', faction: 'tangmen', menpai: 2 },
  { suite: 17, name: 'Bộ Sâm Hoang', branch: 'Đường Môn Phi Tiêu', faction: 'tangmen', menpai: 2 },
  { suite: 18, name: 'Bộ Địa Phách', branch: 'Đường Môn Bẫy', faction: 'tangmen', menpai: 2 },
  // Cái Bang (menpai 6)
  { suite: 19, name: 'Bộ Đồng Cừu', branch: 'Cái Bang Chưởng', faction: 'gaibang', menpai: 6 },
  { suite: 20, name: 'Bộ Địch Khái', branch: 'Cái Bang Bổng', faction: 'gaibang', menpai: 6 },
  // Thiên Nhẫn (menpai 7)
  { suite: 21, name: 'Bộ Ma Sát', branch: 'Thiên Nhẫn Kích', faction: 'tianren', menpai: 7 },
  { suite: 22, name: 'Bộ Ma Hoàng', branch: 'Thiên Nhẫn Đao', faction: 'tianren', menpai: 7 },
  { suite: 23, name: 'Bộ Ma Thị', branch: 'Thiên Nhẫn Bùa', faction: 'tianren', menpai: 7 },
  // Võ Đang (menpai 8)
  { suite: 24, name: 'Bộ Lăng Nhạc', branch: 'Võ Đang Khí', faction: 'wudang', menpai: 8 },
  { suite: 25, name: 'Bộ Cập Phong', branch: 'Võ Đang Kiếm', faction: 'wudang', menpai: 8 },
  // Côn Lôn (menpai 9)
  { suite: 26, name: 'Bộ Sương Tinh', branch: 'Côn Lôn Đao', faction: 'kunlun', menpai: 9 },
  { suite: 27, name: 'Bộ Lôi Khung', branch: 'Côn Lôn Kiếm', faction: 'kunlun', menpai: 9 },
  { suite: 28, name: 'Bộ Vụ Ảo', branch: 'Côn Lôn Bùa', faction: 'kunlun', menpai: 9 },
];

/** Danh sách ID vật phẩm đặc biệt rơi ra từ Boss Hoàng Kim khi trúng nhóm 'specialRatePct'. */
export const GOLDEN_BOSS_SPECIAL_ITEMS: readonly string[] = [
  'book-90',
  'book-120',
  'book-150',
  'book-max-90',
  'book-max-120',
  'book-max-150',
  'potion-2-5',
  'potion-0-5',
  'potion-1-5',
];
