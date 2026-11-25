import fs from 'node:fs';
import path from 'node:path';
import type { Application } from 'express';
import {
  MAPS,
  MONSTERS,
  monsterAt,
  DEFAULT_SPEED,
  formatExpElixirCode,
  formatSpeedCode,
  formatSpawnFile,
  getActiveSpeedConfig,
  getDropConfig,
  getExpElixirConfig,
  getWildHorseConfig,
  setActiveSpeedConfig,
  setDropConfig,
  setExpElixirConfig,
  setGoldenBossConfig,
  setSpawns,
  setWildHorseConfig,
  spawnFileError,
  spawnsOf,
  syncGoldenBossMonsters,
  syncGoldenSettingsToDropConfig,
  syncWildHorseMonsters,
  validateGoldenBossConfig,
  validateSpeedConfiguration,
  type GoldenBossConfig,
  type SpawnFile,
  type SpeedConfiguration,
  type WildHorseConfig,
} from '@vltk/shared';
import { requireAuth, type AuthedRequest } from '../account/auth.js';
import { db } from '../account/db.js';
import { LIVE_WORLDS } from '../net/MapRoom.js';
import { devTools } from '../env.js';
import { reloadSpawns } from '../world/systems/spawner.js';
import { refreshMonsterCombat, refreshMoveScale } from '../world/systems/effects.js';

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
    res.json({
      ok: true,
      combatTuningVersion: 1,
      appliedBosses: cfg.bosses.map(b => {
        const def = MONSTERS[b.id];
        return { id: b.id, name: b.name, hp: monsterAt(def, b.level, 2).hp, exp: def.expOverride,
          damagePercent: def.damagePercent ?? 100, controlReduction: {hurt:def.hitRecover ?? 0,cold:def.controlReduction?.cold ?? 0,stun:def.controlReduction?.stun ?? 0,poison:def.controlReduction?.poison ?? 0}, attackCooldown: def.attackCooldown, attackCycleMs: def.attackCycleMs, leash: def.leash, skills: monsterAt(def, b.level, 2).skills, skillLevelsFixed: !def.skillScale };
      }),
    });
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

  app.get('/api/dev/exp-elixir', (_req, res) => {
    res.json({ config: getExpElixirConfig() });
  });

  app.put('/api/dev/exp-elixir', (req, res) => {
    const body = req.body as { normal?: number; special?: number; persist?: boolean };
    const next = setExpElixirConfig({ normal: body?.normal, special: body?.special });
    db.setExpElixir(next);
    if (body?.persist !== false) {
      const file = path.resolve(process.cwd(), 'packages/shared/src/items/elixirs.ts');
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const replaced = content.replace(/export const EXP_ELIXIR: ExpElixirConfig = \{[\s\S]*?\};\n?/m, formatExpElixirCode(next));
        fs.writeFileSync(file, replaced, 'utf8');
      }
    }
    res.json({ ok: true, config: next });
  });

  const wildHorsesPath = path.resolve(spawnsDir, '../src/monsters/wild-horses.json');

  app.get('/api/dev/wild-horses', (_req, res) => {
    res.json({ config: getWildHorseConfig() });
  });

  app.put('/api/dev/wild-horses', (req, res) => {
    if (!devTools()) { res.status(403).json({ error: 'DEV_TOOLS tắt.' }); return; }
    const patch = (req.body ?? {}) as Partial<WildHorseConfig>;
    const prev = getWildHorseConfig();
    const next = setWildHorseConfig(patch);
    syncWildHorseMonsters();
    try {
      const tmp = `${wildHorsesPath}.tmp`;
      fs.writeFileSync(tmp, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
      fs.renameSync(tmp, wildHorsesPath);
    } catch {
      // Ignore write error in read-only environments
    }
    for (const world of LIVE_WORLDS.values()) {
      for (const sim of world.sims.values()) {
        if (sim.kind !== 'monster' || !sim.def?.wildHorse || sim.dead) continue;
        const def = MONSTERS[sim.def.id];
        if (!def) continue;
        sim.def = def;
        const newMaxHp = def.hpOverride ?? def.hp;
        sim.a.maxHp = newMaxHp;
        if (!next.testMode && prev.testMode && sim.hp <= prev.testHp) {
          sim.hp = newMaxHp;
        } else {
          sim.hp = Math.min(sim.hp, newMaxHp);
        }
        sim.a.hp = Math.round(sim.hp);
        refreshMonsterCombat(sim);
      }
    }
    console.log(`[dev] updated wild-horses config (testMode=${next.testMode}, testHp=${next.testHp})`);
    res.json({ ok: true, config: next });
  });
}
