import source from './town-safe-zones.json';
import type { MapMeta } from './types.js';
import type { MapRules } from '../combat/rules.js';
import { isInTkSafeCamp } from '../battle/tongkim.js';

export interface ZonePoint { x: number; y: number }
export interface SafeZone { id: string; name: string; points: ZonePoint[] }
export interface SafeZoneConfig { version: 1; maps: Record<string, SafeZone[]> }
export const TOWN_SAFE_ZONES = source as SafeZoneConfig;
const cross = (a: ZonePoint, b: ZonePoint, c: ZonePoint) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const onSegment = (p: ZonePoint, a: ZonePoint, b: ZonePoint) => cross(a, b, p) === 0 && p.x >= Math.min(a.x, b.x) && p.x <= Math.max(a.x, b.x) && p.y >= Math.min(a.y, b.y) && p.y <= Math.max(a.y, b.y);
function intersects(a: ZonePoint, b: ZonePoint, c: ZonePoint, d: ZonePoint): boolean {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  return onSegment(a, c, d) || onSegment(b, c, d) || onSegment(c, a, b) || onSegment(d, a, b) || (abC * abD < 0 && cdA * cdB < 0);
}
/** Boundary belongs to the safe zone. No dependency on rendering or nav walkability. */
export function insideZone(p: ZonePoint, points: readonly ZonePoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[j], b = points[i];
    // Small tolerance for interpolated client positions on a boundary.
    if (Math.abs(cross(a, b, p)) < 1e-7 && p.x >= Math.min(a.x, b.x) - 1e-7 && p.x <= Math.max(a.x, b.x) + 1e-7 && p.y >= Math.min(a.y, b.y) - 1e-7 && p.y <= Math.max(a.y, b.y) + 1e-7) return true;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
export function validateSafeZones(value: unknown, meta: Pick<MapMeta, 'type' | 'raw'>): asserts value is SafeZone[] {
  if (!['City', 'Capital'].includes(meta.type)) throw Error('Chỉ khoanh vùng an toàn cho thành thị.');
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) throw Error('Cần 1–32 vùng kín. Dùng Khôi phục an toàn toàn map nếu muốn bỏ cấu hình.');
  const ids = new Set<string>();
  for (const zone of value as SafeZone[]) {
    if (!zone || typeof zone.id !== 'string' || !/^zone-[a-zA-Z0-9_-]{1,80}$/.test(zone.id) || ids.has(zone.id)) throw Error('ID vùng bị trùng hoặc không hợp lệ.');
    ids.add(zone.id);
    if (typeof zone.name !== 'string' || !zone.name.trim() || zone.name.length > 80) throw Error('Tên vùng cần 1–80 ký tự.');
    const ps = zone.points;
    if (!Array.isArray(ps) || ps.length < 3 || ps.length > 256) throw Error('Mỗi vùng cần 3–256 điểm.');
    for (const p of ps) if (!p || !Number.isSafeInteger(p.x) || !Number.isSafeInteger(p.y) || p.x < 0 || p.y < 0 || p.x >= meta.raw.size.width || p.y >= meta.raw.size.height) throw Error('Điểm vùng phải là tọa độ nguyên nằm trong map.');
    if (new Set(ps.map(p => `${p.x},${p.y}`)).size !== ps.length) throw Error('Vùng có điểm trùng nhau.');
    const area = ps.reduce((sum, p, i) => sum + p.x * ps[(i + 1) % ps.length].y - p.y * ps[(i + 1) % ps.length].x, 0);
    if (!area) throw Error('Vùng cần có diện tích, không đặt các điểm trên một đường thẳng.');
    for (let i = 0; i < ps.length; i++) {
      const next = (i + 1) % ps.length;
      if (onSegment(ps[i], ps[next], ps[(i + 2) % ps.length]) || onSegment(ps[(i + 2) % ps.length], ps[i], ps[next])) throw Error('Các cạnh kề không được chồng lên nhau.');
      for (let j = i + 1; j < ps.length; j++) {
        if (j === next || (j + 1) % ps.length === i) continue;
        if (intersects(ps[i], ps[next], ps[j], ps[(j + 1) % ps.length])) throw Error('Đường bao tự cắt. Hãy sửa các điểm giao nhau.');
      }
    }
  }
}
/** No per-map record = old full-map policy. A configured city is combat-enabled outside all polygons. */
export function combatRulesAt(meta: Pick<MapMeta, 'id' | 'safe' | 'pvp'>, point: ZonePoint, fallback: MapRules = meta, config: SafeZoneConfig = TOWN_SAFE_ZONES): MapRules {
  if (isInTkSafeCamp(meta.id, point.x, point.y)) return { safe: true, pvp: false };
  const zones = config.maps[String(meta.id)];
  if (!zones?.length) return { safe: !!fallback.safe, pvp: !!fallback.pvp };
  const safe = zones.some(z => insideZone(point, z.points));
  return { safe, pvp: !safe };
}
export function combatPairRules(meta: Pick<MapMeta, 'id' | 'safe' | 'pvp'>, a: ZonePoint, b: ZonePoint, fallback: MapRules = meta, config: SafeZoneConfig = TOWN_SAFE_ZONES): MapRules {
  const ar = combatRulesAt(meta, a, fallback, config), br = combatRulesAt(meta, b, fallback, config);
  return { safe: ar.safe || br.safe, pvp: ar.pvp && br.pvp };
}
