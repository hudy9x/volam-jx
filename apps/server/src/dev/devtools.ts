import fs from 'node:fs';
import path from 'node:path';
import type { Application } from 'express';
import {
  MAPS,
  MONSTERS,
  DEFAULT_SPEED,
  formatSpeedCode,
  formatSpawnFile,
  getActiveSpeedConfig,
  getDropConfig,
  setActiveSpeedConfig,
  setDropConfig,
  setGoldenBossConfig,
  setSpawns,
  spawnFileError,
  spawnsOf,
  syncGoldenBossMonsters,
  syncGoldenSettingsToDropConfig,
  validateGoldenBossConfig,
  validateSpeedConfiguration,
  type GoldenBossConfig,
  type SpawnFile,
  type SpeedConfiguration,
} from '@vltk/shared';
import { requireAuth, type AuthedRequest } from '../account/auth.js';
import { LIVE_WORLDS } from '../net/MapRoom.js';
import { devTools } from '../env.js';
import { reloadSpawns } from '../world/systems/spawner.js';
import { refreshMoveScale } from '../world/systems/effects.js';

/**
 * Dev tool of the big map (client: dev/spawn-editor/spawnEditor.ts): read / save a map's monster spawns. Saving writes
 * packages/shared/spawns/<id>.json (auto: false, so gen-spawns keeps it) and respawns that map at once.
 * Off when DEV_TOOLS=0.
 */
export function registerDevRoutes(app: Application, spawnsDir: string): void {
  if (!devTools()) return;
  const mapOf = (raw: string) => {
    const id = Number(raw);
    return Number.isInteger(id) && MAPS[id] ? id : null;
  };
  app.get('/api/dev/spawns/:map', requireAuth, (req, res) => {
    const id = mapOf(String(req.params.map));
    if (id === null) { res.status(404).json({ error: 'Không có bản đồ này' }); return; }
    res.json(spawnsOf(id) ?? { map: id, auto: false, zones: [] });
  });
  app.put('/api/dev/spawns/:map', requireAuth, (req: AuthedRequest, res) => {
    const id = mapOf(String(req.params.map));
    if (id === null) { res.status(404).json({ error: 'Không có bản đồ này' }); return; }
    const err = spawnFileError(req.body, m => !!MONSTERS[m]);
    if (err) { res.status(400).json({ error: err }); return; }
    const body = req.body as SpawnFile;
    const file: SpawnFile = {
      map: id, auto: false,
      note: typeof body.note === 'string' ? body.note.slice(0, 300) : `Sửa tay bằng công cụ dev (${req.username}).`,
      zones: body.zones.map(z => ({
        ...(z.x !== undefined ? { x: Math.round(z.x), y: Math.round(z.y!) } : {}),
        ...(z.r !== undefined ? { r: Math.round(z.r) } : {}),
        ...(z.camps ? { camps: Math.round(z.camps) } : {}),
        monsters: z.monsters.map(([m, l]) => [m, Math.round(l)] as [number, number]),
        count: Math.round(z.count), respawn: Math.round(z.respawn), ...(z.boss ? { boss: z.boss === 1 ? 1 : 2 } : {}),
      })),
      ...(body.fixed?.length ? { fixed: body.fixed } : {}),
    };
    fs.mkdirSync(spawnsDir, { recursive: true });
    fs.writeFileSync(path.join(spawnsDir, `${id}.json`), formatSpawnFile(file));
    setSpawns(id, file);
    const world = LIVE_WORLDS.get(id);
    if (world) reloadSpawns(world);
    console.log(`[dev] ${req.username} saved spawns of map ${id}: ${file.zones.length} zones`);
    res.json(file);
  });
  app.post('/api/dev/bosses/reload', (req, res) => {
    const cfg = req.body as GoldenBossConfig;
    const err = validateGoldenBossConfig(cfg);
    if (err) { res.status(400).json({ error: err }); return; }
    setGoldenBossConfig(cfg);
    setDropConfig(syncGoldenSettingsToDropConfig(getDropConfig(), cfg.settings));
    syncGoldenBossMonsters(cfg);
    for (const world of LIVE_WORLDS.values()) reloadSpawns(world);
    console.log(`[dev] reloaded Golden Boss config (${cfg.bosses.filter(b => b.enabled).length} enabled bosses)`);
    res.json({ ok: true });
  });

  app.get('/api/dev/speed', (_req, res) => {
    res.json({
      config: getActiveSpeedConfig(),
      default: DEFAULT_SPEED,
    });
  });

  app.put('/api/dev/speed', (req, res) => {
    const body = req.body as { config?: SpeedConfiguration; persist?: boolean; reset?: boolean };
    try {
      let nextConfig: SpeedConfiguration;
      if (body.reset) {
        nextConfig = DEFAULT_SPEED;
      } else if (body.config) {
        validateSpeedConfiguration(body.config);
        nextConfig = body.config;
      } else {
        res.status(400).json({ error: 'Thiếu cấu hình tốc độ (config).' });
        return;
      }

      setActiveSpeedConfig(nextConfig);

      if (body.persist !== false) {
        const tuningFile = path.resolve(process.cwd(), 'packages/shared/src/formulas/tuning.ts');
        if (fs.existsSync(tuningFile)) {
          const content = fs.readFileSync(tuningFile, 'utf8');
          const replaced = content.replace(/export const SPEED = \{[\s\S]*?\} as const;\n?/m, formatSpeedCode(nextConfig));
          fs.writeFileSync(tuningFile, replaced, 'utf8');
          console.log('[dev] Đã lưu cấu hình SPEED vào packages/shared/src/formulas/tuning.ts');
        }
      }

      for (const world of LIVE_WORLDS.values()) {
        for (const sim of world.sims.values()) {
          if (sim.kind === 'player') {
            refreshMoveScale(world, sim);
            sim.a.moveScale = sim.moveScale ?? 1;
          }
        }
      }

      res.json({ ok: true, config: getActiveSpeedConfig() });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  });
}
