// Town NPCs (Thợ rèn, Chủ dược điếm, Xa phu, Bán ngựa) with their original sprites and npcs.txt names. Clicking one
// opens its talk window on the client; the server validates what the chosen action does (buying only in town, …).
import { MAPS } from '../maps/index.js';
import placements from './town-placements.json';
import { applyTownPlacements, type TownPlacementConfig } from './placements.js';

export type NpcAction = 'shop' | 'drug' | 'kytran' | 'travel' | 'horse' | 'stash' | 'tkRecruit' | 'tkQuartermaster' | 'tkScout' | 'tkGate';

export interface TownNpcTalk {
  text: string;
  options: { label: string; toMap: number }[];
}

export interface TownNpc {
  id: string;
  name: string;
  /** Original npc res (tools/gen-assets.ts NPC_RES). */
  res: string;
  action: NpcAction;
  /** Offset from the map entry; snapped onto walkable ground. */
  dx: number;
  dy: number;
  dir: number;
  /** Chiến trường Tống Kim camp owner (for Mộ Binh Quan / Đặc thám / Cổng xuất trận). */
  tkCamp?: 'tong' | 'kim';
  /** Optional custom talk dialog with direct map travel options. */
  talk?: TownNpcTalk;
}

/** What each NPC says (our original-style lines: the NPC scripts are server files, not in the client). */
export const NPC_LINES: Record<NpcAction, { text: string; option: string }> = {
  shop: { text: 'Binh khí, giáp trụ đều do tay ta rèn ra. Khách quan muốn xem món nào?', option: 'Giao dịch' },
  drug: { text: 'Thuốc của bổn tiệm đều là thượng phẩm, trị thương hồi khí rất nhanh. Khách quan cần loại nào?', option: 'Giao dịch' },
  kytran: { text: 'Kỳ Trân Các có đủ bí kíp võ công thượng thừa. Khách quan muốn xem quyển nào?', option: 'Xem bí kíp' },
  travel: { text: 'Khách quan muốn đi đâu? Ngồi xe của ta, đường xa mấy cũng tới nơi.', option: 'Đi bản đồ khác' },
  horse: { text: 'Ngựa của ta toàn là giống tốt, ngày đi nghìn dặm. Khách quan xem thử con nào?', option: 'Mua ngựa' },
  stash: { text: 'Rương chứa đồ này liên thông giữa mọi nhân vật trong cùng tài khoản. Khách quan cứ yên tâm cất giữ bảo vật.', option: 'Mở rương chứa đồ' },
  tkRecruit: { text: 'Chiến trường Tống Kim đang chiêu mộ hào kiệt (cấp ≥ 60, phí 3.000 lượng). Hiệp sĩ muốn gia nhập phe nào?', option: 'Báo danh chiến trường' },
  tkQuartermaster: { text: 'Ta là Quân Nhu Quan, phụ trách đổi điểm tích lũy Tống Kim lấy kinh nghiệm (1 điểm = 100 EXP).', option: 'Đổi điểm tích lũy' },
  tkScout: { text: 'Tiền tuyến đang giao tranh dữ dội! Ta có thể dẫn đường đưa hiệp sĩ ra thẳng tiền tuyến ngay lập tức.', option: 'Ra thẳng tiền tuyến' },
  tkGate: { text: 'Cổng doanh trại thông ra chiến trường Xung phong. Sau khi vào doanh trại 5 giây có thể xuất trận.', option: 'Xuất trận qua cổng' },
};

/** Thợ rèn, Chủ dược điếm, Xa phu, Bán ngựa và Rương chứa đồ around the entry of every city (Biện Kinh, Lâm An, Phượng Tường, …). */
const CITY: TownNpc[] = [
  { id: 'npc-thoren', name: 'Thợ rèn', res: 'passerby004_4', action: 'shop', dx: -150, dy: -50, dir: 0 },
  { id: 'npc-duocdiem', name: 'Chủ dược điếm', res: 'passerby007', action: 'drug', dx: -110, dy: 90, dir: 0 },
  // Kỳ Trân Các keeper (name chosen by the agent at the user's request, 2026-11-12); sprite of the original Chủ tạp hóa.
  { id: 'npc-kytran', name: 'Bách Bảo Lão Nhân', res: 'passerby023', action: 'kytran', dx: 90, dy: 100, dir: 0 },
  { id: 'npc-xaphu', name: 'Xa phu', res: 'passerby040_4', action: 'travel', dx: 160, dy: -40, dir: 0 },
  { id: 'npc-banngua', name: 'Bán ngựa', res: 'passerby037_4', action: 'horse', dx: 10, dy: -140, dir: 0 },
  { id: 'npc-ruong', name: 'Rương chứa đồ', res: 'passerby198', action: 'stash', dx: -70, dy: -130, dir: 0 },
];

const BATTLE_EXIT_NPCS: TownNpc[] = [
  {
    id: 'npc-tk-tong-ve', name: 'Binh sĩ báo danh (Tống)', res: 'enemy029', action: 'travel', dx: -120, dy: 40, dir: 0,
    talk: {
      text: 'Chiến sự đang ác liệt. Hiệp sĩ muốn rút lui về Điểm báo danh Tống Kim chỉnh đốn binh mã không?',
      options: [{ label: 'Quay lại Điểm báo danh Tống Kim', toMap: 323 }],
    },
  },
  {
    id: 'npc-tk-kim-ve', name: 'Binh sĩ báo danh (Kim)', res: 'enemy031', action: 'travel', dx: 120, dy: 40, dir: 0,
    talk: {
      text: 'Đại quân Kim quốc đang trấn giữ tiền tuyến. Dũng sĩ cần quay về Điểm báo danh Tống Kim chăng?',
      options: [{ label: 'Quay lại Điểm báo danh Tống Kim', toMap: 323 }],
    },
  },
];

export const DEFAULT_TOWN_NPCS: Record<number, TownNpc[]> = {
  ...Object.fromEntries(Object.values(MAPS).filter(m => m.type === 'Capital' || m.type === 'City').map(m => [m.id, CITY])),
  140: [
    { id: 'npc-xaphu', name: 'Xa phu', res: 'passerby040_4', action: 'travel', dx: 120, dy: -40, dir: 0 },
  ],
  323: [
    // Trại Tống (hướng Nam, gần điểm vào 766, 3035 từ Tương Dương)
    { id: 'npc-ruong-tong', name: 'Rương chứa đồ', res: 'passerby198', action: 'stash', dx: 354, dy: -215, dir: 0 },
    { id: 'npc-tong-baodanh', name: 'Mộ Binh Quan (Tống)', res: 'enemy029', action: 'tkRecruit', tkCamp: 'tong', dx: 214, dy: -135, dir: 0 },
    { id: 'npc-tong-quannhu', name: 'Quân Nhu Quan (Tống)', res: 'enemy029', action: 'tkQuartermaster', tkCamp: 'tong', dx: 90, dy: -170, dir: 0 },
    { id: 'npc-tong-xaphu', name: 'Xa phu Tống Kim', res: 'passerby040_4', action: 'travel', dx: -60, dy: -80, dir: 0 },
    // Trại Kim (hướng Bắc, gần điểm vào 2693, 1163 từ Chu Tiên trấn)
    { id: 'npc-ruong-kim', name: 'Rương chứa đồ', res: 'passerby198', action: 'stash', dx: 1574, dy: -1675, dir: 0 },
    { id: 'npc-kim-baodanh', name: 'Mộ Binh Quan (Kim)', res: 'enemy031', action: 'tkRecruit', tkCamp: 'kim', dx: 1714, dy: -1755, dir: 0 },
    { id: 'npc-kim-quannhu', name: 'Quân Nhu Quan (Kim)', res: 'enemy031', action: 'tkQuartermaster', tkCamp: 'kim', dx: 1830, dy: -1700, dir: 0 },
    { id: 'npc-kim-xaphu', name: 'Xa phu Tống Kim', res: 'passerby040_4', action: 'travel', dx: 1960, dy: -1820, dir: 0 },
  ],
  378: [
    // Hậu doanh Tống (dưới cùng góc Tây Nam, quanh 2704, 9224; entry 378 = 9744, 5384)
    { id: 'npc-tk378-drug-tong', name: 'Chủ dược điếm (Tống)', res: 'passerby007', action: 'drug', tkCamp: 'tong', dx: -7140, dy: 3790, dir: 0 },
    { id: 'npc-tk378-stash-tong', name: 'Rương chứa đồ (Tống)', res: 'passerby198', action: 'stash', tkCamp: 'tong', dx: -6940, dy: 3790, dir: 0 },
    // Hậu doanh Kim (trên cùng góc Đông Bắc, quanh 17136, 1640)
    { id: 'npc-tk378-drug-kim', name: 'Chủ dược điếm (Kim)', res: 'passerby007', action: 'drug', tkCamp: 'kim', dx: 7492, dy: -3794, dir: 0 },
    { id: 'npc-tk378-stash-kim', name: 'Rương chứa đồ (Kim)', res: 'passerby198', action: 'stash', tkCamp: 'kim', dx: 7292, dy: -3794, dir: 0 },
  ],
  326: BATTLE_EXIT_NPCS,
  329: BATTLE_EXIT_NPCS,
};

/** Per-city settings saved by tools/map-manager; other maps keep their defaults. */
export const TOWN_NPCS = applyTownPlacements(DEFAULT_TOWN_NPCS, placements as TownPlacementConfig, MAPS);
