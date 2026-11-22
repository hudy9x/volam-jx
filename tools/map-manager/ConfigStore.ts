import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { validatePlacements, type NpcPlacement, type TownPlacementConfig } from '../../packages/shared/src/npcs/placements.js';
import type { MapMeta } from '../../packages/shared/src/maps/types.js';

export class NpcConfigStore {
  private saving = false;
  constructor(readonly file: string, private maps: Record<number, MapMeta>, private allowedRes: ReadonlySet<string>, private defaults: (id: number) => NpcPlacement[], private checkPosition: (id: number, x: number, y: number) => boolean) {}
  private async config(): Promise<TownPlacementConfig> {
    try {
      const config = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (config.version !== 1 || !config.maps || typeof config.maps !== 'object' || Array.isArray(config.maps)) throw Error('Cấu hình NPC nguồn không hợp lệ.');
      return config;
    } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, maps: {} }; throw e; }
  }
  private revision(list: NpcPlacement[]): string { return createHash('sha256').update(JSON.stringify(list)).digest('hex'); }
  private meta(id: number): MapMeta {
    const m = this.maps[id]; if (!m || !['City', 'Capital', 'Battlefield'].includes(m.type)) throw Error('Chỉ chỉnh NPC thành thị hoặc chiến trường.'); return m;
  }
  async read(id: number): Promise<{ npcs: NpcPlacement[]; revision: string; custom: boolean }> {
    this.meta(id); const cfg = await this.config(), list = cfg.maps[String(id)] ?? this.defaults(id);
    return { npcs: list, revision: this.revision(list), custom: Object.hasOwn(cfg.maps, String(id)) };
  }
  async save(id: number, value: unknown, revision: string) {
    if (this.saving) throw Error('Đang lưu cấu hình. Hãy thử lại sau.');
    this.saving = true;
    try {
      validatePlacements(value, this.meta(id), this.allowedRes);
      for (const n of value) if (!this.checkPosition(id, n.x, n.y)) throw Error(`${n.name}: vị trí bị chặn. Chọn điểm đi được hoặc dùng nút Căn về vùng đi được.`);
      const cfg = await this.config(), old = cfg.maps[String(id)] ?? this.defaults(id);
      if (this.revision(old) !== revision) throw Error('NPC map này đã được sửa ở tab hoặc công cụ khác. Bản nháp vẫn được giữ; mở lại bản lưu trước khi thử lại.');
      const list = value.map(n => ({ id: n.id, name: n.name.trim(), res: n.res, action: n.action, x: n.x, y: n.y, dir: n.dir }));
      cfg.maps[String(id)] = list;
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try { await fs.mkdir(path.dirname(this.file), { recursive: true }); await fs.writeFile(tmp, JSON.stringify(cfg, null, 2) + '\n'); await fs.rename(tmp, this.file); }
      finally { await fs.rm(tmp, { force: true }); }
      return { npcs: list, revision: this.revision(list), custom: true };
    } finally { this.saving = false; }
  }
}
