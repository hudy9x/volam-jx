import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const root = path.resolve(import.meta.dirname, '..');

test('Manager serves Boss page/API in same process, preserves nav loader and isolates source saves', { timeout: 20000 }, async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-manager-http-'));
  const probe = net.createServer(); probe.listen(0, '127.0.0.1'); await once(probe, 'listening');
  const port = (probe.address() as net.AddressInfo).port; await new Promise<void>(resolve => probe.close(() => resolve()));
  const boss = path.join(dir, 'boss'); await fs.mkdir(boss);
  for (const f of ['config.json', 'config.ts']) await fs.copyFile(path.join(root, 'packages/shared/src/bosses', f), path.join(boss, f));
  const child = spawn(process.execPath, ['--import', 'tsx', 'tools/map-manager/server.ts'], { cwd: root, env: { ...process.env, MAP_MANAGER_PORT: String(port), MAP_MANAGER_CONFIG: path.join(dir, 'npcs.json'), MAP_MANAGER_ZONES_CONFIG: path.join(dir, 'zones.json'), MAP_MANAGER_PORTALS_CONFIG: path.join(dir, 'portals.json'), MAP_MANAGER_SPAWNS_DIR: path.join(dir, 'spawns'), BOSS_CONFIG_DIR: boss }, stdio: ['ignore', 'pipe', 'pipe'] });
  let logs = ''; child.stdout!.on('data', b => { logs += b; }); child.stderr!.on('data', b => { logs += b; });
  const base = `http://localhost:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try { if ((await fetch(base)).ok) { ready = true; break; } } catch { /* starting */ }
      if (child.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, logs);
    assert.match(await (await fetch(base)).text(), /Quái \/ Boss Xanh/);
    const page = await (await fetch(`${base}/boss/`)).text(); assert.match(page, /data-manager-nav aria/); assert.match(page, /src="app.js"/);
    for (const file of ['app.js', 'dialogs.js', 'style.css']) assert.equal((await fetch(`${base}/boss/${file}`)).status, 200);
    const bootstrap = await (await fetch(`${base}/api/bootstrap`)).json(); assert.ok(bootstrap.monsters.some((m: { id: number }) => m.id === 0));
    const bossBootstrap = await (await fetch(`${base}/boss/api/bootstrap`)).json(); assert.ok(bossBootstrap.config.bosses.length > 0);
    const available = bootstrap.maps.find((m: { available: boolean; id: number }) => m.available && bossBootstrap.maps.some((b: { id: number }) => b.id === m.id));
    if (available) {
      const entry = await (await fetch(`${base}/api/maps/${available.id}/portal-entry`)).json();
      const snapped = await fetch(`${base}/boss/api/snap?mapId=${available.id}&x=${entry.x}&y=${entry.y}`);
      assert.equal(snapped.status, 200, await snapped.clone().text());
      const point = await snapped.json(); assert.deepEqual([point.x, point.y], [entry.x, entry.y]);
      const doc = await (await fetch(`${base}/api/maps/${available.id}/spawns`)).json();
      const file = { map: available.id, zones: [{ monsters: [[0, 10]], count: 1, respawn: 30, camps: 2, r: 0 }] };
      const save = () => fetch(`${base}/api/maps/${available.id}/spawns`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ file, revision: doc.revision }) });
      assert.equal((await save()).status, 200); assert.equal((await save()).status, 400);
      const raw = JSON.parse(await fs.readFile(path.join(dir, 'spawns', `${available.id}.json`), 'utf8'));
      assert.equal(raw.auto, false); assert.equal(raw.zones[0].x, undefined);
    }
    const cfg = bossBootstrap.config; cfg.bosses[0].level = cfg.bosses[0].level === 150 ? 151 : 150;
    const saved = await fetch(`${base}/boss/api/config`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }); assert.equal(saved.status, 200);
    assert.equal(JSON.parse(await fs.readFile(path.join(boss, 'config.json'), 'utf8')).bosses[0].level, cfg.bosses[0].level);
    const forbidden = await fetch(`${base}/boss/api/config`, { method: 'PUT', headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' }, body: JSON.stringify(cfg) }); assert.equal(forbidden.status, 403);
  } finally { child.kill('SIGTERM'); await once(child, 'exit').catch(() => {}); await fs.rm(dir, { recursive: true, force: true }); }
});
