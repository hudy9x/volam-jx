import type { TownNpc, NpcAction } from './towns.js';
import type { MapMeta } from '../maps/types.js';

export interface NpcPlacement { id: string; name: string; res: string; action: NpcAction; x: number; y: number; dir: number }
export interface TownPlacementConfig { version: 1; maps: Record<string, NpcPlacement[]> }
export const NPC_ACTION_LABELS: Record<NpcAction, string> = {
  shop: 'Thợ rèn', drug: 'Hiệu thuốc', kytran: 'Kỳ Trân Các', travel: 'Xa phu', horse: 'Bán ngựa', stash: 'Rương chứa đồ',
  tkRecruit: 'Mộ Binh Quan', tkQuartermaster: 'Quân Nhu Quan', tkScout: 'Đặc thám tiền tuyến', tkGate: 'Cổng xuất trận',
};
/** Shared by editor validation and game adapters. No filesystem or DOM dependencies. */
export function validatePlacements(value: unknown, meta: MapMeta, allowedRes: ReadonlySet<string>): asserts value is NpcPlacement[] {
  if (!['City', 'Capital', 'Battlefield'].includes(meta.type)) throw Error('Chỉ chỉnh NPC của map thành thị hoặc chiến trường.');
  if (!Array.isArray(value) || value.length > 60) throw Error('Mỗi bản đồ tối đa 60 NPC.');
  const ids = new Set<string>();
  for (const n of value as NpcPlacement[]) {
    if (!n || typeof n.id !== 'string' || !/^npc-[a-zA-Z0-9_-]{1,80}$/.test(n.id) || ids.has(n.id)) throw Error('ID NPC bị trùng hoặc không hợp lệ.');
    if (typeof n.name !== 'string' || !n.name.trim() || n.name.length > 80) throw Error('Tên NPC phải có 1–80 ký tự.');
    if (!Object.hasOwn(NPC_ACTION_LABELS, n.action) || !allowedRes.has(n.res)) throw Error('Chức năng hoặc hình NPC không hợp lệ.');
    if (!Number.isInteger(n.x) || !Number.isInteger(n.y) || n.x < 0 || n.y < 0 || n.x >= meta.raw.size.width || n.y >= meta.raw.size.height) throw Error('Tọa độ phải là số nguyên nằm trong map.');
    if (!Number.isInteger(n.dir) || n.dir < 0 || n.dir > 7) throw Error('Hướng đứng phải từ 0 đến 7.');
    ids.add(n.id);
  }
}
/** Adapt absolute editor coordinates to the existing entry-relative NPC contract. */
export function applyTownPlacements(defaults: Record<number, TownNpc[]>, config: TownPlacementConfig, maps: Record<number, MapMeta>): Record<number, TownNpc[]> {
  const result = { ...defaults };
  for (const [id, list] of Object.entries(config.maps)) {
    const numId = Number(id), meta = maps[numId];
    if (!meta || !['City', 'Capital', 'Battlefield'].includes(meta.type)) continue;
    const prevById = new Map((defaults[numId] ?? []).map(n => [n.id, n]));
    result[numId] = list.map(n => {
      const prev = prevById.get(n.id);
      return {
        id: n.id, name: n.name, res: n.res, action: n.action,
        dx: n.x - meta.raw.entry.x, dy: n.y - meta.raw.entry.y, dir: n.dir,
        ...(prev?.tkCamp ? { tkCamp: prev.tkCamp } : {}),
        ...(prev?.talk ? { talk: prev.talk } : {}),
      };
    });
  }
  return result;
}
