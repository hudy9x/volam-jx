import { Server } from 'colyseus';
import { refreshMapRegistry, registrySnapshot } from './mapRegistry.js';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Encoder } from '@colyseus/schema';
import fs from 'node:fs';
import path from 'node:path';
import { MAP_ROOM, getExpElixirConfig, mapAssetSuffix, setExpElixirConfig, setNavLoader, setSpawnLoader, type NavFile, type SpawnFile } from '@vltk/shared';
import { registerAuthRoutes } from './account/auth.js';
import { db } from './account/db.js';
import { registerDevRoutes } from './dev/devtools.js';
import { registerBotRoutes } from './dev/botAdmin.js';
import { MAPS_DIR, PORT, SPAWNS_DIR, devTools } from './env.js';
import { registerRankingRoutes } from './account/rankingRoutes.js';
import { LIVE_WORLDS } from './net/MapRoom.js';
import { MapRoom } from './net/MapRoom.js';
import { tongKim } from './world/tongkim.js';

// Training maps hold 100–300 monsters (packages/shared/spawns): the full state of a room is far above the
// default 8 KB encode buffer.
Encoder.BUFFER_SIZE = 256 * 1024;

refreshMapRegistry(true);

// Map grids live next to the generated map art (env.ts MAPS_DIR); monster spawns in SPAWNS_DIR.
setNavLoader(mapId => {
  const file = path.join(MAPS_DIR, mapAssetSuffix(mapId), 'nav.json');
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, 'utf8')) as NavFile).navigation : null;
});

setSpawnLoader(mapId => {
  const file = path.join(SPAWNS_DIR, `${mapId}.json`);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) as SpawnFile : null;
});

const server = new Server({
  transport: new WebSocketTransport(),
  greet: false,
  express: app => {
    registerAuthRoutes(app);
    registerRankingRoutes(app, function* () {
      for (const world of LIVE_WORLDS.values()) for (const sim of world.sims.values()) {
        if (!sim.charId) continue;
        yield { id: sim.charId, name: sim.a.name, faction: sim.a.faction,
          level: sim.progress?.prog.level ?? sim.a.level, exp: sim.progress?.prog.exp ?? 0,
          money: sim.money ?? 0 };
      }
    });
    registerDevRoutes(app, SPAWNS_DIR);
    registerBotRoutes(app);
    const savedElixir = db.getExpElixir();
    if (savedElixir) setExpElixirConfig(savedElixir);
    app.get('/api/exp-elixir', (_req, res) => { res.json({ config: getExpElixirConfig() }); });
    app.put('/api/exp-elixir', (req, res) => {
      const body = req.body as { normal?: number; special?: number };
      const next = setExpElixirConfig({ normal: body?.normal, special: body?.special });
      db.setExpElixir(next);
      for (const world of LIVE_WORLDS.values()) {
        for (const sim of world.sims.values()) {
          if (sim.kind === 'player' && sim.expBuff && sim.expBuff.until > Date.now()) world.hooks.progress(sim);
        }
      }
      res.json({ ok: true, config: next });
    });
    app.get('/api/maps', (_req, res) => { refreshMapRegistry(true); res.setHeader('Cache-Control', 'no-store'); res.json(registrySnapshot()); });
    app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
    app.get('/api/dev/tongkim/status', (_req, res) => {
      res.json(tongKim.snapshotFor());
    });
    app.post('/api/dev/tongkim/start', (req, res) => {
      if (!devTools()) { res.status(403).json({ error: 'DEV_TOOLS tắt.' }); return; }
      const b = (req.body ?? {}) as { mode?: 1 | 2 | 3; signupSec?: number; durationSec?: number; marshalDelaySec?: number; endSec?: number; allowSolo?: boolean; respawnStepsSec?: number[] };
      const r = tongKim.startMatch({
        mode: b.mode === 3 ? 3 : b.mode === 2 ? 2 : 1,
        signupSec: b.signupSec,
        durationSec: b.durationSec,
        marshalDelaySec: b.marshalDelaySec,
        endSec: b.endSec,
        allowSolo: b.allowSolo ?? true,
        respawnStepsSec: b.respawnStepsSec,
      });
      res.status(r.ok ? 200 : 409).json(r);
    });
    app.post('/api/dev/tongkim/stop', (_req, res) => {
      if (!devTools()) { res.status(403).json({ error: 'DEV_TOOLS tắt.' }); return; }
      res.json(tongKim.stopMatch(LIVE_WORLDS.get(tongKim.battleMapId)));
    });
  },
});

// Đồng hồ Tống Kim chạy nền ngay cả khi map 378 chưa có phòng mở.
setInterval(() => {
  if (!LIVE_WORLDS.has(tongKim.battleMapId)) tongKim.tickBattleWorld(undefined, Date.now());
}, 1000).unref();

// One room per map: clients join with { mapId } and Colyseus routes them to that map's instance.
server.define(MAP_ROOM, MapRoom).filterBy(['mapId']);

server.onShutdown(() => db.flush());

await server.listen(PORT);
console.log(`[server] Colyseus listening on ws://localhost:${PORT}`);
