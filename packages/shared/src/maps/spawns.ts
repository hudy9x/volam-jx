// Monster spawns per map: packages/shared/spawns/<map id>.json. The original server's spawn data is not in the
// client, so these are our own: written by apps/client/tools/gen-spawns.ts (auto, by map kind / region / level)
// or placed by hand with the dev tool on the big map (Tab → "Quái (dev)"), which the server saves here.

/** One group of monsters. */
export interface SpawnZone {
  /** Centre (world px). Without x / y the server picks `camps` random walkable spots at start. */
  x?: number;
  y?: number;
  /** Spread around the centre (world px, isometric: half as tall). */
  r?: number;
  /** Random spots when x / y are absent (default 1). */
  camps?: number;
  /** [monster id (npcs.txt row, shared monsters/monsters.ts), level]: each slot picks one at random. */
  monsters: [number, number][];
  /** Monsters per zone (per camp for random zones). */
  count: number;
  /** Seconds before a dead monster comes back. */
  respawn: number;
  /** Boss tier: undefined/false = normal, 1 = Boss Xanh (blue), 2/true = Boss Hoàng Kim (gold). */
  boss?: boolean | 1 | 2;
}

/** Normalize a boss flag or tier number into 0 (normal), 1 (Boss Xanh), or 2 (Boss Hoàng Kim). */
export function bossTierOf(b?: boolean | number): 0 | 1 | 2 {
  if (b === 1) return 1;
  if (b === 2 || b === true) return 2;
  return 0;
}

/** A single monster at an exact spot (training dummies). */
export interface SpawnFixed {
  monster: number;
  level: number;
  x: number;
  y: number;
}

export interface SpawnFile {
  map: number;
  /** Written by gen-spawns (regenerated freely); the dev tool saves with auto: false and gen-spawns keeps it. */
  auto?: boolean;
  note?: string;
  zones: SpawnZone[];
  fixed?: SpawnFixed[];
}

let spawnLoader: ((mapId: number) => SpawnFile | null) | null = null;
const spawnCache = new Map<number, SpawnFile | null>();

/** Where spawn files come from (the server reads packages/shared/spawns/<id>.json). */
export function setSpawnLoader(loader: (mapId: number) => SpawnFile | null): void {
  spawnLoader = loader;
  spawnCache.clear();
}

/** The map's spawn file, or null (no monsters). */
export function spawnsOf(mapId: number): SpawnFile | null {
  if (!spawnCache.has(mapId)) spawnCache.set(mapId, spawnLoader?.(mapId) ?? null);
  return spawnCache.get(mapId)!;
}

/** Replace the cached file (after the dev tool saved it). */
export function setSpawns(mapId: number, file: SpawnFile | null): void {
  spawnCache.set(mapId, file);
}

/** JSON text of a spawn file, one zone per line (readable diffs). */
export function formatSpawnFile(f: SpawnFile): string {
  const head = [`"map": ${f.map}`, `"auto": ${!!f.auto}`, ...(f.note ? [`"note": ${JSON.stringify(f.note)}`] : [])];
  const list = (name: string, items: unknown[]) => `"${name}": [\n${items.map(i => `  ${JSON.stringify(i)}`).join(',\n')}\n ]`;
  const parts = [...head, list('zones', f.zones), ...(f.fixed?.length ? [list('fixed', f.fixed)] : [])];
  return `{\n ${parts.join(',\n ')}\n}\n`;
}

/** Check a spawn file sent by the dev tool; returns an error message or null. */
export function spawnFileError(file: unknown, monsterExists: (id: number) => boolean): string | null {
  const f = file as SpawnFile;
  if (!f || typeof f !== 'object' || !Array.isArray(f.zones)) return 'zones phải là mảng';
  if (f.zones.length > 200) return 'quá nhiều khu (tối đa 200)';
  const num = (v: unknown, lo: number, hi: number) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  for (const [i, z] of f.zones.entries()) {
    if (!Array.isArray(z.monsters) || !z.monsters.length) return `khu ${i + 1}: chưa có quái`;
    for (const m of z.monsters) {
      if (!Array.isArray(m) || !monsterExists(m[0]) || !num(m[1], 1, 200)) return `khu ${i + 1}: quái / cấp không hợp lệ`;
    }
    if (!num(z.count, 1, 60) || !num(z.respawn, 1, 3600)) return `khu ${i + 1}: số lượng 1–60, hồi sinh 1–3600 giây`;
    if ((z.x !== undefined || z.y !== undefined) && !(num(z.x, 0, 1e6) && num(z.y, 0, 1e6))) return `khu ${i + 1}: tọa độ sai`;
    if (z.r !== undefined && !num(z.r, 0, 3000)) return `khu ${i + 1}: bán kính 0–3000`;
  }
  for (const fx of f.fixed ?? []) {
    if (!monsterExists(fx.monster) || !num(fx.level, 1, 200) || !num(fx.x, 0, 1e6) || !num(fx.y, 0, 1e6)) return 'fixed: không hợp lệ';
  }
  return null;
}
