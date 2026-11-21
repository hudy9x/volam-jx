/**
 * Automatic monster spawns (packages/shared/spawns/<map id>.json) for maps that have none yet.
 *
 *   npm run gen:spawns -w @vltk/client            new / auto files only (hand-edited files are kept)
 *   npm run gen:spawns -w @vltk/client -- 70 92   only these maps
 *   then: npm run gen:skills && npm run gen:assets (monster skills + art of the monsters now used)
 *
 * The original client has no spawn data (it lives on the game server), so this picks monsters itself:
 *   - level band per map: the table below (estimates of the original training levels) or by map kind,
 *     higher further from the entry and on deeper floors ("tầng N");
 *   - monsters: wild animals of that level band, themed by the map name (snow, desert, water, caves), plus
 *     the original regional bandits (Tây Bắc sơn tặc, Giang Nam sơn tặc…) from level 20;
 *   - zones spread over the walkable area (nav.json), away from the entry; villages only on the outskirts.
 * Towns, faction maps and battlefields get nothing. Fine-tune with the dev tool on the big map (Tab).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAP_CATALOG } from '../../../packages/shared/src/maps/catalog.gen.ts';
import { formatSpawnFile, type SpawnFile, type SpawnZone } from '../../../packages/shared/src/maps/spawns.ts';
import { GEN_MONSTERS } from '../../../packages/shared/src/monsters/monsters.gen.ts';
import { GOLDEN_BOSS_LIST } from '../../../packages/shared/src/monsters/monsters.ts';
import { decodeGrid } from '../../../packages/shared/src/maps/nav/grid.ts';
import { TRAINING_BANDS } from '../../../packages/shared/src/maps/training-levels.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MAPS_DIR = path.resolve(HERE, '../public/assets/maps');
const OUT = path.resolve(HERE, '../../../packages/shared/spawns');
const SPAWN_LEVELS_OUT = path.resolve(HERE, '../../../packages/shared/src/maps/spawn-levels.gen.ts');

/** Estimated level bands of known training maps (map id -> [min, max]). */
const LEVELS: Record<number, [number, number]> = {
  // Luyện công
  2: [20, 30], 3: [20, 30], 7: [70, 80], 19: [20, 30], 21: [30, 40], 41: [40, 50], 43: [20, 30], 56: [40, 50],
  68: [50, 60], 70: [30, 40], 74: [40, 50], 90: [40, 50], 92: [30, 40], 122: [60, 70], 167: [30, 40], 179: [50, 60],
  193: [50, 60], 195: [40, 50], 319: [90, 100], 320: [90, 100], 342: [90, 100],
  // Hang động
  4: [20, 30], 5: [30, 40], 6: [40, 50], 8: [80, 90], 9: [60, 70], 10: [50, 60], 14: [40, 50], 22: [30, 40], 23: [40, 50],
  24: [30, 40], 26: [40, 50], 27: [50, 60], 28: [60, 70], 38: [60, 70], 39: [70, 80], 40: [80, 90], 50: [70, 80],
  51: [60, 70], 52: [70, 80], 65: [50, 60], 66: [60, 70], 67: [70, 80], 69: [50, 60], 71: [30, 40], 72: [40, 50],
  73: [50, 60], 75: [60, 70], 76: [30, 40], 77: [40, 50], 79: [20, 30], 82: [50, 60], 83: [60, 70], 91: [70, 80],
  93: [90, 100], 94: [70, 80], 224: [90, 100], 336: [90, 100], 340: [100, 110], 341: [100, 110],
  55: [70, 80], 113: [40, 50], 114: [60, 70], 136: [30, 40], 206: [70, 80], 207: [80, 90],
  225: [90, 100], 226: [90, 100], 227: [90, 100], 321: [90, 100], 322: [90, 100],
};

/** npcs.txt rows of wild animals by strength. */
const TIER1 = [31, 34, 42, 35, 36, 37, 38, 43, 41, 12, 9, 10, 11];
const TIER2 = [5, 6, 7, 21, 20, 27, 29, 30, 44, 45, 46, 15, 16, 17, 19, 39, 25];
const TIER3 = [0, 1, 2, 3, 4, 8, 13, 14, 18, 22, 23, 24, 26, 28, 40];
/** Animals that fit a map name. */
const THEMES: [RegExp, number[]][] = [
  [/tuyết|trường bạch|băng/i, [4, 8, 40, 2, 16]],
  [/sa mạc|mạc |mạc$|hoang|cát/i, [44, 26, 46, 39, 19]],
  [/đảo|hồ|giang|thủy|hà |nguyên đầu/i, [18, 21, 20, 41, 22]],
  [/động|huyệt|tháp|mê cung|địa đạo|quật|giếng/i, [27, 28, 29, 30, 45, 46, 44, 21]],
];
/** Original regional bandits (sơn tặc 1 / 2) by map region. */
const BANDITS: Record<string, number[]> = {
  'Tây Bắc': [149, 150], 'Tây Nam': [151, 152], 'Giang Nam': [153, 154], 'Lưỡng Hồ': [155, 156],
  'Đông Bắc': [157, 158], 'Hoa Bắc': [159, 160], 'Trung Nguyên': [161, 162], 'Đặc thù': [163, 164, 165],
};
const CAVE_WORDS = /động|tháp|mê cung|địa đạo|huyệt|quật|giếng|cốc/i;

const known = new Set(GEN_MONSTERS.map(m => m.id));
const nameOf = new Map(GEN_MONSTERS.map(m => [m.id, m.name]));

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** What kind of spawns a map gets: level band and minimum distance from the entry, or null for none. */
function plan(m: (typeof MAP_CATALOG)[number]): { band: [number, number]; away: number; perZone: [number, number] } | null {
  const training = TRAINING_BANDS.get(m.id);
  if (training) return { band: training, away: 700, perZone: [4, 7] };
  const floor = Number(/tầng\s*(\d+)/i.exec(m.name)?.[1] ?? 1);
  const deeper = (b: [number, number]): [number, number] => [b[0] + 5 * (floor - 1), b[1] + 5 * (floor - 1)];
  if (LEVELS[m.id]) return { band: LEVELS[m.id], away: 700, perZone: [4, 7] };
  switch (m.type) {
    case 'Field': return { band: [30, 50], away: 700, perZone: [4, 7] };
    case 'Cave': return { band: deeper([50, 60]), away: 600, perZone: [4, 6] };
    case 'Country': return { band: [1, 10], away: 1500, perZone: [3, 5] };
    case '': return CAVE_WORDS.test(m.name) && !/phòng|điện|đường|sảnh|các$/i.test(m.name) ? { band: deeper([45, 55]), away: 600, perZone: [4, 6] } : null;
    default: return null; // City, Capital, Tong, Battlefield, Others
  }
}

/** Monster types of a map: themed animals + level-tier animals (+ regional bandits from level 20). */
function poolOf(m: (typeof MAP_CATALOG)[number], mid: number, rng: () => number): number[] {
  const tier = mid <= 20 ? TIER1 : mid <= 50 ? TIER2 : TIER3;
  const pick = (list: number[], n: number) => [...list].filter(id => known.has(id)).sort(() => rng() - 0.5).slice(0, n);
  const themed = THEMES.filter(([re]) => re.test(m.name)).flatMap(([, ids]) => ids);
  const animals = [...new Set([...pick(themed, 2), ...pick(tier, 4)])].slice(0, 4);
  const bandits = mid >= 20 ? pick(BANDITS[m.region ?? ''] ?? [], 2) : [];
  return [...animals, ...bandits];
}

function generate(m: (typeof MAP_CATALOG)[number]): SpawnFile | null {
  const p = plan(m);
  if (!p) return null;
  const navFile = path.join(MAPS_DIR, String(m.id), 'nav.json');
  if (!fs.existsSync(navFile)) return null;
  const g = decodeGrid(JSON.parse(fs.readFileSync(navFile, 'utf8')).navigation, m.size);
  const rng = mulberry32(m.id * 2654435761);
  const cells: number[] = [];
  for (let i = 0; i < g.ok.length; i++) if (g.ok[i]) cells.push(i);
  if (!cells.length) return null;
  const area = cells.length * g.cw * g.ch;
  const want = Math.max(m.type === 'Country' ? 2 : 3, Math.min(m.type === 'Country' ? 10 : 28, Math.round(area / 900_000)));
  const at = (cell: number) => ({ x: (cell % g.gw + 0.5) * g.cw, y: (Math.floor(cell / g.gw) + 0.5) * g.ch });
  const iso = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, (a.y - b.y) * 2);
  const spots: { x: number; y: number }[] = [];
  for (let tries = 0; spots.length < want && tries < 40000; tries++) {
    const c = at(cells[Math.floor(rng() * cells.length)]);
    if (iso(c, m.entry) < p.away) continue;
    if (spots.some(s => iso(s, c) < 650)) continue;
    spots.push(c);
  }
  if (!spots.length) return null;
  const mid = (p.band[0] + p.band[1]) / 2;
  const pool = poolOf(m, mid, rng);
  if (!pool.length) return null;
  const far = Math.max(...spots.map(s => iso(s, m.entry)));
  const training = TRAINING_BANDS.has(m.id);
  const zones: SpawnZone[] = spots.map((s, index) => {
    // Further from the entry = closer to the top of the band.
    const t = far > p.away ? (iso(s, m.entry) - p.away) / (far - p.away) : 0;
    // Auto selects by the lowest monster level: each configured bãi starts at its exact stage.
    const level = training && index === 0 ? p.band[0] : Math.round(p.band[0] + (p.band[1] - p.band[0]) * t);
    const kinds = [...pool].sort(() => rng() - 0.5).slice(0, 1 + Math.floor(rng() * 2));
    return {
      x: Math.round(s.x), y: Math.round(s.y), r: 220,
      monsters: kinds.map(id => {
        const varied = Math.max(1, level + Math.floor(rng() * 3) - 1);
        const monsterLevel = !training ? varied : index === 0 ? p.band[0]
          : Math.max(p.band[0], Math.min(p.band[1], varied));
        return [id, monsterLevel] as [number, number];
      }),
      count: p.perZone[0] + Math.floor(rng() * (p.perZone[1] - p.perZone[0] + 1)),
      respawn: Math.round(20 + level / 3),
    };
  });
  // Sort spots by distance from map entry so Boss Xanh and Boss Hoàng Kim sit deeper inside the map.
  const deepSpots = [...spots].sort((a, b) => iso(b, m.entry) - iso(a, m.entry));
  const bossLevel = p.band[1];
  const blueMonsterId = pool[pool.length - 1];
  for (const bs of deepSpots.slice(1, 3)) {
    zones.push({
      x: Math.round(bs.x), y: Math.round(bs.y), r: 60,
      monsters: [[blueMonsterId, bossLevel]],
      count: 1, respawn: 60, boss: 1,
    });
  }
  const goldBoss = GOLDEN_BOSS_LIST[m.id % GOLDEN_BOSS_LIST.length];
  if (goldBoss && deepSpots[0]) {
    zones.push({
      x: Math.round(deepSpots[0].x), y: Math.round(deepSpots[0].y), r: 40,
      monsters: [[goldBoss.id, bossLevel]],
      count: 1, respawn: 180, boss: 2,
    });
  }
  const names = [...new Set(pool.map(id => nameOf.get(id)))].join(', ');
  return {
    map: m.id, auto: true,
    note: `Tự sinh (${TRAINING_BANDS.has(m.id) ? 'cấp theo yêu cầu 2026-11-13' : 'ước lượng'}): ${m.name}, cấp ${p.band[0]}–${p.band[1]}${m.region ? `, vùng ${m.region}` : ''}: ${names}; Boss Xanh + Boss Hoàng Kim ${goldBoss.name}.`,
    zones,
  };
}

const only = process.argv.slice(2).map(Number).filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
let written = 0, kept = 0, none = 0;
const used = new Set<number>();
for (const m of MAP_CATALOG) {
  if (only.length && !only.includes(m.id)) continue;
  const file = path.join(OUT, `${m.id}.json`);
  if (fs.existsSync(file)) {
    const old = JSON.parse(fs.readFileSync(file, 'utf8')) as SpawnFile;
    if (old.auto === false) { kept++; for (const z of old.zones) for (const [id] of z.monsters) used.add(id); continue; }
  }
  const spawns = generate(m);
  if (!spawns) { none++; if (fs.existsSync(file)) fs.rmSync(file); continue; }
  fs.writeFileSync(file, formatSpawnFile(spawns));
  for (const z of spawns.zones) for (const [id] of z.monsters) used.add(id);
  written++;
}
console.log(`spawns: ${written} written, ${kept} hand-edited kept, ${none} maps without monsters; ${used.size} monster kinds -> ${path.relative(process.cwd(), OUT)}`);

// Keep client-readable level bands in sync with all spawn files.
const bands: Record<number, [number, number]> = {};
for (const name of fs.readdirSync(OUT).filter(f => /^\d+\.json$/.test(f)).sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)))) {
  const sf = JSON.parse(fs.readFileSync(path.join(OUT, name), 'utf8')) as SpawnFile;
  const levels = (sf.zones ?? []).filter(z => !z.boss).flatMap(z => z.monsters.map(([, lv]) => lv));
  if (levels.length) bands[sf.map] = [Math.min(...levels), Math.max(...levels)];
}
fs.writeFileSync(
  SPAWN_LEVELS_OUT,
  `// Generated by apps/client/tools/gen-spawns.ts from packages/shared/spawns/*.json. Do not edit.\nexport const SPAWN_LEVEL_BANDS: Record<number, [number, number]> = ${JSON.stringify(bands)};\n`,
);
console.log(`spawn-levels: ${Object.keys(bands).length} maps -> ${path.relative(process.cwd(), SPAWN_LEVELS_OUT)}`);
console.log('next: npm run gen:skills && npm run gen:assets (monster skills and art)');
