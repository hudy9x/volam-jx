import type { MapMeta } from './types.js';
export interface CustomMap {
  id: number; name: string; type: 'Field' | 'City' | 'Cave'; region: string;
  size: { width: number; height: number }; entry: { x: number; y: number };
  build: string; projectRevision: number; enabled: boolean;
}
export interface MapRegistry { version: 1; maps: Record<string, CustomMap> }
export function validateMapRegistry(value: unknown, originalIds: ReadonlySet<number>): asserts value is MapRegistry {
  const v = value as MapRegistry;
  if (!v || v.version !== 1 || !v.maps || typeof v.maps !== 'object' || Array.isArray(v.maps) || Object.keys(v.maps).length > 1000) throw Error('Danh sách map tự dựng không hợp lệ.');
  for (const [key, m] of Object.entries(v.maps)) {
    if (!m || !Number.isSafeInteger(m.id) || m.id < 1000 || m.id > 999999 || key !== String(m.id) || originalIds.has(m.id)) throw Error('ID map bị trùng với map gốc hoặc không hợp lệ.');
    if (typeof m.name !== 'string' || !m.name.trim() || m.name.length > 120 || !['Field', 'City', 'Cave'].includes(m.type) || typeof m.region !== 'string' || m.region.length > 80 || typeof m.enabled !== 'boolean') throw Error('Thông tin map không hợp lệ.');
    if (!/^r\d+-[a-f0-9]{8}$/.test(m.build) || !Number.isSafeInteger(m.projectRevision) || m.projectRevision < 1) throw Error('Bản xuất map không hợp lệ.');
    const { width, height } = m.size ?? {}, { x, y } = m.entry ?? {};
    if (![width, height, x, y].every(Number.isSafeInteger) || width < 32 || height < 16 || width > 8192 || height > 8192 || width % 32 || height % 16 || x < 0 || y < 0 || x >= width || y >= height) throw Error('Kích thước hoặc điểm vào map không hợp lệ.');
  }
}
export function customMapMeta(m: CustomMap): MapMeta {
  return { id: m.id, name: m.name, type: m.type, region: m.region, assets: `assets/maps/${m.id}/${m.build}`,
    safe: m.type === 'City', pvp: m.type !== 'City', portals: [], raw: { size: m.size, entry: m.entry }, enabled: m.enabled, customBuild: m.build };
}
