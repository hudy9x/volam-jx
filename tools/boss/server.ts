import fs from 'node:fs';
import { buildSync } from 'esbuild';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SHXT_BOSS_RESISTANCE, mapAssetSuffix,
  assetPath,
  packOf,
  BOSS_FACTIONS,
  ELEMENT_NAMES,
  GEN_GOLD,
  GOLDEN_BOSS_CONFIG,
  GOLDEN_BOSS_DEFAULT_EXP,
  GOLDEN_BOSS_TIER_LABELS,
  GOLD_SUITES,
  MAGIC_DESC,
  MAPS,
  mapTypeLabel,
  applyDropConfigToGoldenSettings,
  formatAttr,
  formatGoldenBossConfigTs,
  getDropConfig,
  getSkill, allPacks, learnableSkills, maxLevelOf, isCastable, skillCategory,
  isWalkable,
  getGrid,
  mapLevelBand,
  setDropConfig,
  setGoldenBossConfig,
  setNavLoader,
  snapToMap,
  syncGoldenSettingsToDropConfig,
  validateDropConfig,
  validateGoldenBossConfig,
  type DropConfig,
  type GoldenBossConfig,
  type NavFile,
} from '../../packages/shared/src/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '../..');
const PUBLIC_DIR = path.join(HERE, 'public');
const CLIENT_ASSETS_DIR = path.join(REPO_ROOT, 'apps/client/public/assets');
const MAPS_DIR = path.join(CLIENT_ASSETS_DIR, 'maps');
const configDirectory = path.resolve(process.env.BOSS_CONFIG_DIR ?? path.join(REPO_ROOT, 'packages/shared/src/bosses'));
const CONFIG_JSON_PATH = path.join(configDirectory, 'config.json');
const CONFIG_TS_PATH = path.join(configDirectory, 'config.ts');
const DROP_CONFIG_PATH = path.resolve(process.env.DROP_CONFIG_PATH ?? path.join(REPO_ROOT, 'packages/shared/src/drops/drop-config.json'));

const manifestFile = path.join(CLIENT_ASSETS_DIR, 'manifest.json');
let assetManifest: { packs: Record<string, { v: string }> } | null = null;
function assetUrl(input: string): string {
  const rel = assetPath(input);
  const version = assetManifest?.packs[packOf(rel)]?.v;
  return `/assets/${rel}${version ? `?v=${encodeURIComponent(version)}` : ''}`;
}
const dialogBundle = buildSync({ entryPoints: [path.join(PUBLIC_DIR, 'dialogs.js')], bundle: true, write: false, format: 'esm', loader: { '.css': 'empty' } });
const resistanceBundle = buildSync({ entryPoints: [path.join(REPO_ROOT, 'packages/shared/src/formulas/boss-resistance.ts')], bundle: true, write: false, format: 'esm' });
let applying = false;

const PORT = Number(process.env.BOSS_PORT) || 4567;
const GAME_SERVER_URL = process.env.GAME_SERVER_URL || 'http://localhost:2567';

// Đăng ký bộ đọc nav.json để snap tọa độ click trên minimap vào đúng ô đi được
const standalone = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (standalone) setNavLoader(mapId => {
  const file = path.join(MAPS_DIR, mapAssetSuffix(mapId), 'nav.json');
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as NavFile).navigation : null;
});

const KIND_LABELS: Record<string, string> = {
  melee: 'Vũ khí cận chiến',
  range: 'Vũ khí tầm xa',
  armor: 'Áo',
  helm: 'Nón',
  belt: 'Đai lưng',
  boot: 'Giày',
  cuff: 'Hộ uyển',
  amulet: 'Dây chuyền',
  ring: 'Nhẫn',
  pendant: 'Ngọc bội',
};

const SERIES_LABELS = ['Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'];

function stripTags(s: string): string {
  return s.replace(/<color[^>]*>|<bclr[^>]*>/gi, '').replace(/<enter>/gi, ' ').replace(/\s+/g, ' ').trim();
}

function formatGoldLine(attr: string, min: number[], max: number[]): string {
  if (attr === 'allskill_v') {
    const skId = min[2] || max[2];
    const skName = skId > 0 ? (getSkill(skId)?.name ?? `#${skId}`) : 'Võ công vốn có';
    const vMin = min[0], vMax = max[0];
    return `Kỹ năng [${skName}]: +${vMin === vMax ? vMin : `${vMin}–${vMax}`} cấp`;
  }
  const tpl = MAGIC_DESC[attr];
  if (!tpl) return `${attr}: ${min[0]}–${max[0]}`;
  const a = stripTags(formatAttr(tpl, min as [number, number, number]));
  const b = stripTags(formatAttr(tpl, max as [number, number, number]));
  if (a === b) return a;
  const pa = a.split(/(\d+)/), pb = b.split(/(\d+)/);
  if (pa.length === pb.length && pa.every((x, i) => i % 2 === 1 || x === pb[i])) {
    return pa.map((x, i) => (i % 2 === 1 && x !== pb[i] ? `${x}–${pb[i]}` : x)).join('');
  }
  return `${a} → ${b}`;
}

function loadDropConfigFile(): DropConfig {
  if (fs.existsSync(DROP_CONFIG_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DROP_CONFIG_PATH, 'utf8')) as DropConfig;
      if (!validateDropConfig(parsed)) return parsed;
    } catch {
      // Fallback sang getDropConfig()
    }
  }
  return getDropConfig();
}

function loadCurrentConfig(): GoldenBossConfig {
  let base: GoldenBossConfig = GOLDEN_BOSS_CONFIG;
  if (fs.existsSync(CONFIG_JSON_PATH)) {
    try {
      base = JSON.parse(fs.readFileSync(CONFIG_JSON_PATH, 'utf8')) as GoldenBossConfig;
    } catch {
      base = GOLDEN_BOSS_CONFIG;
    }
  }
  const dropCfg = loadDropConfigFile();
  setDropConfig(dropCfg);
  const merged: GoldenBossConfig = {
    ...base,
    settings: applyDropConfigToGoldenSettings(dropCfg, base.settings),
  };
  setGoldenBossConfig(merged);
  return merged;
}

function buildBootstrap() {
  assetManifest = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : null;
  const config = loadCurrentConfig();

  // 1. Tập hợp toàn bộ kỹ năng được Boss sử dụng + các kỹ năng môn phái
  const skillIds = new Set<number>();
  for (const b of config.bosses) {
    for (const [sid] of b.skills) skillIds.add(sid);
  }
  for (const pack of allPacks()) for (const skill of pack.skills) skillIds.add(skill.id);
  const learnable = new Set(allPacks().flatMap(p => learnableSkills(p.id)));
  const skills: Record<number, { id: number; name: string; icon: string; pack: string; maxLevel: number; reqLevel: number; selectable: boolean }> = {};
  for (const id of skillIds) {
    const s = getSkill(id);
    if (!s) continue;
    skills[id] = {
      id: s.id,
      name: s.name,
      pack: s.pack ?? 'monsters', maxLevel: maxLevelOf(s), reqLevel: s.reqLevel ?? 0,
      selectable: isCastable(s) && skillCategory(s) === 'attack' && (learnable.has(id) || s.pack === 'common' || s.pack === 'monsters'),
      icon: s.icon ? assetUrl(`${s.icon}.webp`) : '',
    };
  }

  // 2. Tập hợp 28 bộ trang bị Hoàng Kim (140 món) theo môn phái
  const goldSuites = GOLD_SUITES.map(suiteMeta => {
    const items = GEN_GOLD.filter(g => g.gold.suite === suiteMeta.suite).map(g => {
      const reqLv = g.req.find(r => r[0] === 'requirelevel')?.[1] ?? 90;
      return {
        id: g.id,
        name: g.name,
        kind: g.kind,
        kindLabel: KIND_LABELS[g.kind] ?? g.kind,
        icon: assetUrl(`${g.icon}.webp`),
        suite: suiteMeta.suite,
        suiteName: suiteMeta.name,
        faction: suiteMeta.faction,
        series: SERIES_LABELS[g.gold.series] ?? 'Kim',
        reqLevel: reqLv,
        lines: g.gold.lines.map(([attr, min, max]) => formatGoldLine(attr, min, max)),
      };
    });
    return {
      ...suiteMeta,
      items,
    };
  });

  // 3. Danh sách bản đồ có minimap.webp
  const availableMaps = Object.values(MAPS)
    .filter(m => fs.existsSync(path.join(MAPS_DIR, mapAssetSuffix(m.id), 'minimap.webp')))
    .map(m => {
      const band = mapLevelBand(m.id) ?? null;
      return {
        id: m.id,
        name: m.name,
        type: m.type,
        typeLabel: mapTypeLabel(m),
        region: m.region,
        safe: m.safe,
        levelBand: band,
        width: m.raw.size.width,
        height: m.raw.size.height,
        entry: m.raw.entry,
        portals: m.portals,
        minimapUrl: assetUrl(`maps/${m.id}/minimap.webp`),
      };
    })
    .sort((a, b) => {
      const la = a.levelBand?.[0] ?? (a.safe ? 999 : 500);
      const lb = b.levelBand?.[0] ?? (b.safe ? 999 : 500);
      return la - lb || a.id - b.id;
    });

  return {
    config,
    resistanceSources: SHXT_BOSS_RESISTANCE,
    skillPacks: allPacks().map(p => ({id:p.id, name:p.name})),
    factions: BOSS_FACTIONS.map(f => ({
      ...f,
      elementLabel: ELEMENT_NAMES[f.element],
    })),
    tierLabels: GOLDEN_BOSS_TIER_LABELS,
    skills,
    goldSuites,
    maps: availableMaps,
  };
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};

function serveStaticFile(res: http.ServerResponse, filePath: string): void {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  fs.createReadStream(filePath).pipe(res);
}

export async function handleBossRequest(req: http.IncomingMessage, res: http.ServerResponse, mounted = false): Promise<void> {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (req.method === 'GET' && pathname === '/resistance.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(resistanceBundle.outputFiles[0].text); return;
  }

  // API: GET /api/bootstrap
  if (req.method === 'GET' && pathname === '/api/bootstrap') {
    const data = buildBootstrap();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
    return;
  }

  // API: GET /api/snap?mapId=...&x=...&y=...
  if (req.method === 'GET' && pathname === '/api/snap') {
    const mapId = Number(url.searchParams.get('mapId'));
    const rawX = Number(url.searchParams.get('x'));
    const rawY = Number(url.searchParams.get('y'));
    if (!MAPS[mapId] || !Number.isFinite(rawX) || !Number.isFinite(rawY)) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Tham số mapId, x, y không hợp lệ.' }));
      return;
    }
    try {
      const grid = getGrid(mapId);
      const walkable = isWalkable(grid, rawX, rawY);
      const [sx, sy] = snapToMap(mapId, rawX, rawY);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ x: Math.round(sx), y: Math.round(sy), walkable }));
    } catch (error) {
      console.error('[boss-tool] Không đọc được vị trí:', error);
      res.writeHead(422, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Chưa kiểm tra được vùng đi lại của bản đồ. Hãy chọn bản đồ khác hoặc sinh lại dữ liệu bản đồ.' }));
    }
    return;
  }

  // API: PUT /api/config -> Lưu cài đặt vào packages/shared/src/bosses/config.{json,ts}
  if (req.method === 'PUT' && pathname === '/api/config') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    let body: GoldenBossConfig;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as GoldenBossConfig;
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'JSON gửi lên không hợp lệ.' }));
      return;
    }

    const err = validateGoldenBossConfig(body)
      || (!Number.isInteger(body.settings.continuousRespawnSec) ? 'Thời gian hồi sinh phải là số nguyên giây.' : null)
      || (body.settings.spawnMode === 'fixedTimes' && !body.settings.fixedTimes.length ? 'Hãy thêm ít nhất một giờ xuất hiện.' : null)
      || (body.settings.spawnMode === 'hourlyMinutes' && !body.settings.hourlyMinutes.length ? 'Hãy chọn ít nhất một mốc phút.' : null)
      || (body.bosses.some(b => !Number.isInteger(b.level) || b.level < 1 || b.level > 200) ? 'Cấp Boss phải là số nguyên từ 1 đến 200.' : null);
    if (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err }));
      return;
    }

    // Ghi vào cả config.json, config.ts trong packages/shared/src/bosses/ và đồng bộ sang drop-config.json
    fs.writeFileSync(CONFIG_JSON_PATH, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
    fs.writeFileSync(CONFIG_TS_PATH, formatGoldenBossConfigTs(body), 'utf8');
    setGoldenBossConfig(body);

    const nextDropCfg = syncGoldenSettingsToDropConfig(loadDropConfigFile(), body.settings);
    const dropErr = validateDropConfig(nextDropCfg);
    if (dropErr) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: dropErr }));
      return;
    }
    fs.writeFileSync(DROP_CONFIG_PATH, `${JSON.stringify(nextDropCfg, null, 2)}\n`, 'utf8');
    setDropConfig(nextDropCfg);

    console.log(`[boss-tool] Đã lưu cấu hình Boss Hoàng Kim (${body.bosses.length} Boss) -> bosses/config.{ts,json} & drop-config.json`);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      savedAt: new Date().toISOString(),
      files: ['packages/shared/src/bosses/config.ts', 'packages/shared/src/bosses/config.json', 'packages/shared/src/drops/drop-config.json'],
    }));
    return;
  }

  if (req.method === 'POST' && pathname === '/api/apply') {
    if (applying) {
      res.writeHead(409, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Đang áp dụng cấu hình. Hãy chờ kết quả.' }));
      return;
    }
    applying = true;
    try {
      const config = loadCurrentConfig();
      const resp = await fetch(`${GAME_SERVER_URL}/api/dev/bosses/reload`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config), signal: AbortSignal.timeout(3000),
      });
      if (!resp.ok) throw new Error('Game từ chối cấu hình. Kiểm tra server dev và thử lại.');
      const result = await resp.json() as { combatTuningVersion?: number; appliedBosses?: {id: number; name: string; hp: number; exp?: number; damagePercent?: number; controlReduction?: {hurt:number;cold:number;stun:number;poison:number}; attackCycleMs?: number; leash: number; skills?: [number, number][]; skillLevelsFixed?: boolean}[] };
      if (result.combatTuningVersion !== 1 || !Array.isArray(result.appliedBosses)) {
        throw new Error('Game từ chối xác nhận HP và nhịp đánh mới. Hãy khởi động lại server game rồi Áp dụng lại.');
      }
      for (const b of config.bosses) {
        const applied = result.appliedBosses.find(a => a.id === b.id);
        if (!applied || (b.hp !== undefined && applied.hp !== b.hp)
          || applied.exp !== (b.exp ?? GOLDEN_BOSS_DEFAULT_EXP)
          || (b.attackCooldown !== undefined && applied.attackCycleMs !== b.attackCooldown * 1000)
          || applied.leash !== (b.leash ?? 1100)
          || applied.damagePercent !== (b.damagePercent ?? 100)
          || (b.controlReduction && (['hurt','cold','stun','poison'] as const).some(key => applied.controlReduction?.[key] !== (b.controlReduction?.[key] ?? (key==='hurt'?60:0))))
          || (b.skillLevelsFixed && (!applied.skillLevelsFixed || JSON.stringify(applied.skills) !== JSON.stringify(b.skills)))) {
          throw new Error(`Game từ chối xác nhận thông số của ${b.name}. Hãy khởi động lại server game rồi Áp dụng lại.`);
        }
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, appliedBosses: result.appliedBosses }));
    } catch (error) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: error instanceof Error && error.message.startsWith('Game từ chối') ? error.message : 'Không kết nối được game. Hãy kiểm tra server dev đang chạy.' }));
    } finally { applying = false; }
    return;
  }
  if (pathname === '/dialogs.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(dialogBundle.outputFiles[0].text);
    return;
  }

  // Static: /assets/* từ apps/client/public/assets/*
  if (pathname.startsWith('/assets/')) {
    const rel = pathname.slice('/assets/'.length);
    const safePath = path.resolve(CLIENT_ASSETS_DIR, rel);
    if (!safePath.startsWith(CLIENT_ASSETS_DIR + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    serveStaticFile(res, safePath);
    return;
  }

  // Static: từ tools/boss/public/*
  const reqFile = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (reqFile === 'index.html' && mounted) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(fs.readFileSync(path.join(PUBLIC_DIR, 'index.html'), 'utf8').replace('data-manager-nav hidden', 'data-manager-nav').replace('</body>', '<script src="/__tool-reload.js"></script></body>')); return;
  }
  const safePublicPath = path.resolve(PUBLIC_DIR, reqFile);
  if (!safePublicPath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    res.end();
    return;
  }
  serveStaticFile(res, safePublicPath);
}

if (standalone) http.createServer(handleBossRequest).listen(PORT, '127.0.0.1', () => {
  console.log(`\n=============================================================`);
  console.log(`  ⚔️  Công cụ Quản trị Boss Hoàng Kim VLTK 1`);
  console.log(`  🌐 Mở trình duyệt: http://localhost:${PORT}`);
  console.log(`  📁 File lưu: packages/shared/src/bosses/config.{ts,json}`);
  console.log(`=============================================================\n`);
});
