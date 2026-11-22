import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyDisabledMaps, applyMapRegistry, applyNavOverrides, MAPS, mapAssetSuffix, isMapEnabled, isTkBattleMap, TK_SIGNUP_ENTRY, TK_SIGNUP_MAP_ID, TOWN_MAP_ID, type MapRegistry } from '@vltk/shared';
import { MAPS_DIR } from './env.js';
import { db, type CharacterRecord } from './account/db.js';
import { tongKim } from './world/tongkim.js';
export const MAP_REGISTRY_FILE = path.resolve(process.env.MAP_REGISTRY_FILE ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/shared/src/maps/custom-maps.json'));
export const DISABLED_MAPS_FILE = path.resolve(process.env.MAP_DISABLED_FILE ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/shared/src/maps/disabled-maps.json'));
export const NAV_OVERRIDES_FILE = path.resolve(process.env.MAP_NAV_OVERRIDES_FILE ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../packages/shared/src/maps/nav-overrides.json'));
let lastCheck = 0, lastText = '', lastDisabledText = '', lastNavText = '';
let snapshot: MapRegistry = { version: 1, maps: {} };
export function registrySnapshot(): MapRegistry {
  return { version: 1, maps: Object.fromEntries(Object.entries(snapshot.maps).map(([id, m]) => [id, { ...m, enabled: m.enabled && mapAvailable(m.id) }])) };
}
export function refreshMapRegistry(force = false): void {
  if (!force && Date.now() - lastCheck < 250) return;
  lastCheck = Date.now();
  try {
    const text = fs.existsSync(MAP_REGISTRY_FILE) ? fs.readFileSync(MAP_REGISTRY_FILE, 'utf8') : '{"version":1,"maps":{}}';
    if (text !== lastText) { const value = JSON.parse(text); applyMapRegistry(value); snapshot = value; lastText = text; }
  } catch (e) {
    // Fail closed for custom maps if a registry is corrupt; original maps remain available.
    for (const m of Object.values(MAPS)) if (m.customBuild) m.enabled = false;
    for (const m of Object.values(snapshot.maps)) m.enabled = false;
    lastText = ''; console.error('[map registry]', (e as Error).message);
  }
  try {
    const dText = fs.existsSync(DISABLED_MAPS_FILE) ? fs.readFileSync(DISABLED_MAPS_FILE, 'utf8') : '{"version":1,"disabled":[]}';
    if (dText !== lastDisabledText) { applyDisabledMaps(JSON.parse(dText)); lastDisabledText = dText; }
  } catch (e) {
    lastDisabledText = ''; console.error('[disabled maps]', (e as Error).message);
  }
  try {
    const nText = fs.existsSync(NAV_OVERRIDES_FILE) ? fs.readFileSync(NAV_OVERRIDES_FILE, 'utf8') : '{"version":1,"maps":{}}';
    if (nText !== lastNavText) { applyNavOverrides(JSON.parse(nText)); lastNavText = nText; }
  } catch (e) {
    lastNavText = ''; console.error('[nav overrides]', (e as Error).message);
  }
}
export function mapAvailable(id: number, force = false): boolean {
  refreshMapRegistry(force);
  return isMapEnabled(id) && fs.existsSync(path.join(MAPS_DIR, mapAssetSuffix(id), 'nav.json')) && fs.existsSync(path.join(MAPS_DIR, mapAssetSuffix(id), 'map.json'));
}
export const XIANGYANG_MAP_ID = 78;

export function resolveCharacterMap(char: CharacterRecord): number {
  if (char.trainingReturn && !mapAvailable(char.trainingReturn.mapId, true)) {
    db.updateCharacter(char.id, { trainingReturn: undefined });
  }
  if (isTkBattleMap(char.mapId) && (tongKim.currentPhase === 'closed' || char.mapId !== tongKim.battleMapId || !tongKim.getEntry(char.id))) {
    if (char.tkCampLast && mapAvailable(TK_SIGNUP_MAP_ID, true)) {
      const pos = TK_SIGNUP_ENTRY[char.tkCampLast];
      db.updateCharacter(char.id, { mapId: TK_SIGNUP_MAP_ID, x: pos.x, y: pos.y });
      return TK_SIGNUP_MAP_ID;
    }
    const fallbackId = mapAvailable(XIANGYANG_MAP_ID, true) ? XIANGYANG_MAP_ID : TOWN_MAP_ID;
    const entry = MAPS[fallbackId].raw.entry;
    db.updateCharacter(char.id, { mapId: fallbackId, x: entry.x, y: entry.y });
    return fallbackId;
  }
  if (!mapAvailable(char.mapId, true)) {
    const entry = MAPS[TOWN_MAP_ID].raw.entry;
    const clearReturn = char.trainingReturn?.mapId === char.mapId ? { trainingReturn: undefined } : {};
    db.updateCharacter(char.id, { mapId: TOWN_MAP_ID, x: entry.x, y: entry.y, ...clearReturn });
    return TOWN_MAP_ID;
  }
  return char.mapId;
}
