import fs from 'node:fs';
import path from 'node:path';
import type { Application } from 'express';
import { MAPS, MONSTERS, formatSpawnFile, setSpawns, spawnFileError, spawnsOf, type SpawnFile } from '@vltk/shared';
import { requireAuth, type AuthedRequest } from '../account/auth.js';
import { LIVE_WORLDS } from '../net/MapRoom.js';
import { devTools } from '../env.js';
import { reloadSpawns } from '../world/systems/spawner.js';

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
}
