import { configuredPortals } from './portals.js';
import customSource from './custom-maps.json';
import { customMapMeta, validateMapRegistry, type MapRegistry } from './registry.js';
import { decodeGrid, nearestWalkable } from './nav/grid.js';
import type { GridDefinition, NavigationGrid } from './nav/types.js';
import { MAP_CATALOG } from './catalog.gen.js';
import type { MapMeta } from './types.js';

export const TOWN_MAP_ID = 37;

/** Maps whose type makes them towns (no fighting, regen). */
const TOWN_TYPES = new Set(['City', 'Capital']);

/**
 * City of each maplist.ini region (Thổ Địa Phù, items/books.ts): Tây Bắc Phượng Tường, Tây Nam Thành Đô, Hoa Bắc Biện Kinh,
 * Trung Nguyên + Lưỡng Hồ Tương Dương, Giang Nam Lâm An. The region → city choice is ours (CHỌN: the original server script
 * that picks the town is not in the client); anything else (Đông Bắc, Đặc thù…) goes to Biện Kinh.
 */
const REGION_TOWN: Record<string, number> = {
  'Tây Bắc': 1, 'Tây Nam': 11, 'Hoa Bắc': 37, 'Trung Nguyên': 78, 'Lưỡng Hồ': 78, 'Giang Nam': 176,
};

/** Nearest city for map `mapId` (itself when it is a city); `has` = whether a map can be entered here (its grid exists). */
export function nearestTown(mapId: number, has: (id: number) => boolean = () => true): number {
  const m = MAP_CATALOG.find(c => c.id === mapId);
  const town = m && TOWN_TYPES.has(m.type) ? m.id : REGION_TOWN[m?.region ?? ''] ?? TOWN_MAP_ID;
  return has(town) ? town : TOWN_MAP_ID;
}

/**
 * Hand-made parts of some maps: portals on the original exit traps. Everything else (name, type, region, size,
 * entry) comes from the generated catalog; monsters come from packages/shared/spawns/<id>.json (spawns.ts).
 */
const EXTRA: Record<number, Partial<MapMeta>> = {
  37: {
    music: 'assets/music/music130.mp3',
    safe: true,
    pvp: false,
    portals: [
      { id: 'to-140', label: 'Dược Vương Cốc', x: 20368, y: 15704, radius: 40, toMap: 140, toX: 5280, toY: 9600 },
    ],
  },
  140: {
    safe: false,
    pvp: true,
    portals: [
      { id: 'to-37', label: 'Biện Kinh', x: 4720, y: 10040, radius: 40, toMap: 37, toX: 20600, toY: 15860 },
    ],
  },
  323: {
    safe: true,
    pvp: false,
  },
};

export const DEFAULT_MAP_PORTALS = Object.fromEntries(Object.entries(EXTRA).map(([id, m]) => [id, (m.portals ?? []).map(p => ({ ...p }))]));
export * from './portals.js';

/**
 * Every map rendered from the original client (apps/client/tools/gen-maps.ts → catalog.gen.ts). Maps are drawn
 * from assets/maps/<id>/ and walked on the grid in its nav.json (loadNav). Towns are safe; elsewhere PK is allowed.
 */
export const MAPS: Record<number, MapMeta> = Object.fromEntries(MAP_CATALOG.map(m => {
  const town = TOWN_TYPES.has(m.type);
  const meta: MapMeta = {
    id: m.id, name: m.name, type: m.type, region: m.region ?? '', assets: `assets/maps/${m.id}`,
    safe: town, pvp: !town, raw: { size: m.size, entry: m.entry },
    ...EXTRA[m.id], portals: configuredPortals(m.id, EXTRA[m.id]?.portals ?? []),
  };
  return [m.id, meta];
}));

/** Runtime registry shared by the game and admin tools. Generated catalog stays untouched. */
const originalIds = new Set(MAP_CATALOG.map(m => m.id));
export function applyMapRegistry(value: unknown): void {
  validateMapRegistry(value, originalIds);
  const registry = value as MapRegistry;
  for (const id of Object.keys(MAPS).map(Number)) if (!originalIds.has(id) && !registry.maps[String(id)]) { delete MAPS[id]; clearMapNavigation(id); }
  for (const m of Object.values(registry.maps)) {
    if (MAPS[m.id]?.customBuild !== m.build) clearMapNavigation(m.id);
    MAPS[m.id] = { ...customMapMeta(m), portals: configuredPortals(m.id, []) };
  }
}
export const isMapEnabled = (id: number) => !!MAPS[id] && MAPS[id].enabled !== false;
export const mapAssetSuffix = (id: number) => `${id}${MAPS[id]?.customBuild ? '/' + MAPS[id].customBuild : ''}`;
export * from './registry.js';

// ======================= navigation grids (loaded on demand) =======================

let navLoader: ((mapId: number) => GridDefinition | null) | null = null;
const navDefs = new Map<number, GridDefinition>();
const grids = new Map<number, NavigationGrid>();
export function clearMapNavigation(id: number): void { navDefs.delete(id); grids.delete(id); }
applyMapRegistry(customSource);

/** Where grids come from: the server reads assets/maps/<id>/nav.json from disk. */
export function setNavLoader(loader: (mapId: number) => GridDefinition | null): void {
  navLoader = loader;
}

/** Hand over an already fetched grid (client tools). */
export function registerNav(mapId: number, nav: GridDefinition): void {
  navDefs.set(mapId, nav);
}

/** Is the grid of this map available without the loader (registered or already decoded)? */
export function hasNav(mapId: number): boolean {
  return navDefs.has(mapId) || grids.has(mapId);
}

/** Decoded navigation grid (largest walkable component only), cached per map. */
export function getGrid(mapId: number): NavigationGrid {
  let grid = grids.get(mapId);
  if (!grid) {
    const meta = MAPS[mapId];
    if (!meta) throw new Error(`Unknown map ${mapId}`);
    const def = navDefs.get(mapId) ?? navLoader?.(mapId);
    if (!def) throw new Error(`No navigation grid for map ${mapId} (run npm run gen:maps -w @vltk/client -- ${mapId})`);
    grid = decodeGrid(def, meta.raw.size);
    grids.set(mapId, grid);
  }
  return grid;
}

/** Snap any point onto a standable cell of the map. */
export function snapToMap(mapId: number, x: number, y: number): [number, number] {
  return nearestWalkable(getGrid(mapId), x, y);
}

/** Names of the map types for the map list. */
export const MAP_TYPE_NAMES: Record<string, string> = {
  City: 'Thành thị', Capital: 'Thành thị', Field: 'Luyện công', Country: 'Thôn trấn', Cave: 'Hang động',
  Tong: 'Môn phái', Battlefield: 'Chiến trường', Others: 'Khác', '': 'Khác',
};

/** Display category for a map (splits Đơn đấu maps out of Chiến trường into their own tab). */
export function mapTypeLabel(m: Pick<MapMeta, 'type' | 'name'>): string {
  if (m.type === 'Battlefield' && /^Đơn đấu\b/i.test(m.name.trim())) return 'Đơn đấu';
  return MAP_TYPE_NAMES[m.type] ?? 'Khác';
}

export type { MapMeta, MapCatalogEntry, NavFile, Portal, RawMapData } from './types.js';
export * from './spawns.js';
export * from './training.js';

export * from './training-levels.js';
