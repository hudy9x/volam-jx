import { Server } from 'colyseus';
import { refreshMapRegistry, registrySnapshot } from './mapRegistry.js';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { Encoder } from '@colyseus/schema';
import fs from 'node:fs';
import path from 'node:path';
import { MAP_ROOM, mapAssetSuffix, setNavLoader, setSpawnLoader, type NavFile, type SpawnFile } from '@vltk/shared';
import { registerAuthRoutes } from './account/auth.js';
import { db } from './account/db.js';
import { registerDevRoutes } from './dev/devtools.js';
import { registerBotRoutes } from './dev/botAdmin.js';
import { MAPS_DIR, PORT, SPAWNS_DIR } from './env.js';
import { registerRankingRoutes } from './account/rankingRoutes.js';
import { LIVE_WORLDS } from './net/MapRoom.js';
import { MapRoom } from './net/MapRoom.js';

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
    app.get('/api/maps', (_req, res) => { refreshMapRegistry(true); res.setHeader('Cache-Control', 'no-store'); res.json(registrySnapshot()); });
    app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  },
});

// One room per map: clients join with { mapId } and Colyseus routes them to that map's instance.
server.define(MAP_ROOM, MapRoom).filterBy(['mapId']);

server.onShutdown(() => db.flush());

await server.listen(PORT);
console.log(`[server] Colyseus listening on ws://localhost:${PORT}`);
