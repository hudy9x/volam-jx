import source from './map-portals.json';
import type { MapMeta, Portal } from './types.js';
export interface PortalConfig { version: 1; maps: Record<string, Portal[]> }
/** A missing override preserves defaults; an explicit empty list removes all portals on that map. */
export function configuredPortals(id: number, fallback: readonly Portal[], config: PortalConfig = source as PortalConfig): Portal[] {
  return (config.maps[String(id)] ?? fallback).map(p => ({ ...p }));
}
export function validatePortals(value: unknown, from: MapMeta, maps: Record<number, MapMeta>): asserts value is Portal[] {
  if (!Array.isArray(value) || value.length > 64) throw Error('Tối đa 64 điểm chuyển map.');
  const ids = new Set<string>();
  const point = (x: unknown, y: unknown, m: MapMeta) => Number.isInteger(x) && Number.isInteger(y) && Number(x) >= 0 && Number(y) >= 0 && Number(x) < m.raw.size.width && Number(y) < m.raw.size.height;
  for (const p of value) {
    if (!p || typeof p.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.id) || ids.has(p.id)) throw Error('ID điểm chuyển bị trùng hoặc không hợp lệ.');
    ids.add(p.id);
    if (typeof p.label !== 'string' || !p.label.trim() || p.label.length > 80) throw Error('Tên điểm chuyển không được trống, tối đa80ký tự.');
    const dest = maps[p.toMap];
    if (!Number.isInteger(p.toMap) || !dest || (dest.id === from.id && !p.id.startsWith('tk-'))) throw Error('Chọn một map đích khác map đang chỉnh.');
    if (!point(p.x, p.y, from) || !point(p.toX, p.toY, dest)) throw Error(`${p.label}: tọa độ nằm ngoài bản đồ.`);
    if (!Number.isInteger(p.radius) || p.radius < 8 || p.radius > 256) throw Error('Bán kính điểm chuyển phải từ8đến256pixel.');
  }
}
