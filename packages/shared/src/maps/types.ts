import type { GridDefinition, Point, Size } from './nav/types.js';

/** One generated map (catalog.gen.ts): what client and server need without loading the map itself. */
export interface MapCatalogEntry {
  id: number;
  name: string;
  /** settings/maplist.ini MapType: City, Capital, Field, Country, Cave, Tong, Battlefield, Others or ''. */
  type: string;
  /** Region of the maplist.ini area folder (Tây Bắc, Tây Nam, Hoa Bắc, Trung Nguyên, Lưỡng Hồ, Giang Nam, Đông Bắc, Đặc thù). */
  region?: string;
  size: Size;
  entry: Point;
}

/** Size and arrival point of a map (the navigation grid is loaded separately, see loadNav). */
export interface RawMapData {
  size: Size;
  entry: Point;
}

/** <assets>/nav.json written by apps/client/tools/gen-maps.ts. */
export interface NavFile extends RawMapData {
  id: number;
  name: string;
  navigation: GridDefinition;
}

export interface Portal {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Isometric radius in world px; stepping inside triggers the transfer. */
  radius: number;
  toMap: number;
  toX: number;
  toY: number;
}

export interface MapMeta {
  /** Missing means enabled (original maps). Custom maps keep metadata while disabled. */
  enabled?: boolean;
  customBuild?: string;
  id: number;
  name: string;
  /** maplist.ini MapType (see MapCatalogEntry). */
  type: string;
  /** Region of the map (MapCatalogEntry.region). */
  region: string;
  /**
   * Folder (relative to the client's public/) produced by apps/client/tools/gen-maps.ts from the original
   * client: map.json, ground/<rx>_<ry>.webp (512x512 regions), objects/<cx>_<cy>.json + atlases, minimap.webp.
   */
  assets: string;
  music?: string;
  /** Town: no combat at all, regen HP/MP. */
  safe: boolean;
  /** Whether players may attack each other here (when both are not in safe mode). */
  pvp: boolean;
  portals: Portal[];
  raw: RawMapData;
}
