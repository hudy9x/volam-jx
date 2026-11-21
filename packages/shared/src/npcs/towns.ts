// Town NPCs (Thợ rèn, Chủ dược điếm, Xa phu, Bán ngựa) with their original sprites and npcs.txt names. Clicking one
// opens its talk window on the client; the server validates what the chosen action does (buying only in town, …).
import { MAPS } from '../maps/index.js';
import placements from './town-placements.json';
import { applyTownPlacements, type TownPlacementConfig } from './placements.js';

export type NpcAction = 'shop' | 'drug' | 'kytran' | 'travel' | 'horse' | 'stash';

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
    {
      id: 'npc-tong-baodanh', name: 'Binh sĩ báo danh (Tống)', res: 'enemy029', action: 'travel', dx: 214, dy: -135, dir: 0,
      talk: {
        text: 'Quân Kim xâm phạm biên cương, Đại Tống đang chiêu mộ hào kiệt xuất chinh! Hiệp sĩ muốn tiến vào chiến trường nào?',
        options: [
          { label: 'Vào chiến trường Bình nguyên (326)', toMap: 326 },
          { label: 'Vào chiến trường Hà Tân (329)', toMap: 329 },
        ],
      },
    },
    // Trại Kim (hướng Bắc, gần điểm vào 2693, 1163 từ Chu Tiên trấn)
    { id: 'npc-ruong-kim', name: 'Rương chứa đồ', res: 'passerby198', action: 'stash', dx: 1574, dy: -1675, dir: 0 },
    {
      id: 'npc-kim-baodanh', name: 'Binh sĩ báo danh (Kim)', res: 'enemy031', action: 'travel', dx: 1714, dy: -1755, dir: 0,
      talk: {
        text: 'Thiết kỵ Đại Kim sắp nam tiến, hào kiệt thiên hạ ai muốn lập công hãy theo ta! Ngươi chọn chiến trường nào?',
        options: [
          { label: 'Vào chiến trường Bình nguyên (326)', toMap: 326 },
          { label: 'Vào chiến trường Hà Tân (329)', toMap: 329 },
        ],
      },
    },
  ],
  326: BATTLE_EXIT_NPCS,
  329: BATTLE_EXIT_NPCS,
};

/** Per-city settings saved by tools/map-manager; other maps keep their defaults. */
export const TOWN_NPCS = applyTownPlacements(DEFAULT_TOWN_NPCS, placements as TownPlacementConfig, MAPS);
