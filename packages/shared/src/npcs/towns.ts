// Town NPCs (Thợ rèn, Chủ dược điếm, Xa phu, Bán ngựa) with their original sprites and npcs.txt names. Clicking one
// opens its talk window on the client; the server validates what the chosen action does (buying only in town, …).
import { MAPS } from '../maps/index.js';
import placements from './town-placements.json';
import { applyTownPlacements, type TownPlacementConfig } from './placements.js';

export type NpcAction = 'shop' | 'drug' | 'kytran' | 'travel' | 'horse' | 'stash';

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

export const DEFAULT_TOWN_NPCS: Record<number, TownNpc[]> = {
  ...Object.fromEntries(Object.values(MAPS).filter(m => m.type === 'Capital' || m.type === 'City').map(m => [m.id, CITY])),
  140: [
    { id: 'npc-xaphu', name: 'Xa phu', res: 'passerby040_4', action: 'travel', dx: 120, dy: -40, dir: 0 },
  ],
};

/** Per-city settings saved by tools/map-manager; other maps keep their defaults. */
export const TOWN_NPCS = applyTownPlacements(DEFAULT_TOWN_NPCS, placements as TownPlacementConfig, MAPS);
