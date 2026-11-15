import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { MAP_CATALOG } from '../../packages/shared/src/maps/catalog.gen.js';
import { validateMapRegistry, type MapRegistry, type CustomMap } from '../../packages/shared/src/maps/registry.js';
import { decodeGrid, canStandAt } from '../../packages/shared/src/maps/nav/grid.js';
import type { ProjectStore } from './Store.js';
import { exportMap } from './export.js';
const originalIds = new Set(MAP_CATALOG.map(m => m.id));
export class PublicationStore {
  private busy = false;
  constructor(private projects: ProjectStore, readonly file: string, readonly mapsDir: string, private manifest: (id: number) => void = () => {}) {}
  private async read(): Promise<MapRegistry> {
    try { const cfg = JSON.parse(await fs.readFile(this.file, 'utf8')); validateMapRegistry(cfg, originalIds); return cfg; }
    catch(e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, maps: {} }; throw e; }
  }
  private revision(m?: CustomMap) { return createHash('sha256').update(JSON.stringify(m ?? null)).digest('hex'); }
  async status(id: number) { const m = (await this.read()).maps[String(id)]; return { map: m ?? null, revision: this.revision(m) }; }
  async set(id: number, enabled: boolean, projectRevision: number, expected: string, type: CustomMap['type'] = 'Field') {
    if (this.busy) throw Error('Đang cập nhật map. Vui lòng chờ.');
    if (typeof enabled !== 'boolean' || !['Field', 'City', 'Cave'].includes(type) || originalIds.has(id)) throw Error('Trạng thái hoặc loại map không hợp lệ.');
    this.busy = true;
    try {
      const p = await this.projects.read(id), cfg = await this.read(), old = cfg.maps[String(id)];
      if (p.revision !== projectRevision) throw Error('Project đã thay đổi. Mở lại bản lưu trước khi bật/tắt.');
      if (expected !== this.revision(old)) throw Error('Trạng thái map đã thay đổi ở tab khác. Mở lại bản lưu.');
      if (old?.enabled === enabled) return this.status(id);
      if (!enabled && !old) throw Error('Map chưa được đưa vào game.');
      let map: CustomMap;
      if (enabled) {
        const builds = path.join(this.projects.folder(id), 'builds');
        let build: string | undefined;
        const candidates = await fs.readdir(builds).catch((e: NodeJS.ErrnoException) => { if (e.code === 'ENOENT') return [] as string[]; throw e; });
        for (const candidate of candidates.filter(b => /^r\d+-[a-f0-9]{8}$/.test(b)).reverse()) {
          try { if (JSON.stringify(JSON.parse(await fs.readFile(path.join(builds, candidate, 'project.json'), 'utf8'))) === JSON.stringify(p)) { build = candidate; break; } }
          catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
        }
        build ??= await exportMap(this.projects, p);
        const folder = path.join(builds, build);
        const nav = JSON.parse(await fs.readFile(path.join(folder, 'nav.json'), 'utf8'));
        if (!canStandAt(decodeGrid(nav.navigation, nav.size), p.entry.x, p.entry.y)) throw Error('Điểm vào không nằm trong vùng đi lại chính hoặc thiếu khoảng trống 9px.');
        const parent = path.join(this.mapsDir, String(id)), staging = path.join(parent, `.${build}-${randomUUID()}`), target = path.join(parent, build);
        await fs.mkdir(parent, { recursive: true });
        try {
          const exists = await fs.stat(target).then(() => true, (e: NodeJS.ErrnoException) => { if (e.code === 'ENOENT') return false; throw e; });
          if (!exists) { await fs.cp(folder, staging, { recursive: true, errorOnExist: true }); await fs.rename(staging, target); }
        }
        finally { await fs.rm(staging, { recursive: true, force: true }); }
        this.manifest(id);
        if ((await this.projects.read(id)).revision !== p.revision) throw Error('Project đã thay đổi khi xuất. Bản xuất được giữ, chưa bật map.');
        map = { id, name: p.name, type, region: '', size: { width: p.width, height: p.height }, entry: p.entry, build, projectRevision: p.revision, enabled: true };
      } else map = { ...old!, enabled: false };
      cfg.maps[String(id)] = map; validateMapRegistry(cfg, originalIds);
      const latest = await this.read();
      if (this.revision(latest.maps[String(id)]) !== expected) throw Error('Trạng thái map đã thay đổi ở công cụ khác.');
      cfg.maps = { ...latest.maps, [String(id)]: map };
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try { await fs.mkdir(path.dirname(this.file), { recursive: true }); await fs.writeFile(tmp, JSON.stringify(cfg, null, 2) + '\n'); await fs.rename(tmp, this.file); }
      finally { await fs.rm(tmp, { force: true }); }
      return { map, revision: this.revision(map) };
    } finally { this.busy = false; }
  }
}
