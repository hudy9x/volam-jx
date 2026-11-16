import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { validateSafeZones, type SafeZoneConfig, type SafeZone } from '../../packages/shared/src/maps/safe-zones.js';
import type { MapMeta } from '../../packages/shared/src/maps/types.js';

export class SafeZoneStore {
  private saving = false;
  constructor(readonly file: string, private maps: Record<number, MapMeta>) {}
  private meta(id: number) {
    const meta = this.maps[id];
    if (!meta || !['City', 'Capital'].includes(meta.type)) throw Error('Chỉ khoanh vùng an toàn cho thành thị.');
    return meta;
  }
  private async config(): Promise<SafeZoneConfig> {
    try {
      const cfg = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (cfg?.version !== 1 || !cfg.maps || typeof cfg.maps !== 'object' || Array.isArray(cfg.maps)) throw Error('Cấu hình vùng an toàn nguồn không hợp lệ.');
      for (const [id, zones] of Object.entries(cfg.maps)) validateSafeZones(zones, this.meta(Number(id)));
      return cfg;
    } catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, maps: {} }; throw e; }
  }
  private revision(zones: SafeZone[] | null) { return createHash('sha256').update(JSON.stringify(zones)).digest('hex'); }
  async read(id: number) {
    this.meta(id); const cfg = await this.config(), zones = cfg.maps[String(id)] ?? null;
    return { zones: zones ?? [], custom: zones !== null, revision: this.revision(zones) };
  }
  /** null resets to full-map safety; an empty list must never silently open a whole city. */
  async save(id: number, value: unknown, revision: string) {
    if (this.saving) throw Error('Đang lưu vùng an toàn. Hãy thử lại sau.');
    this.saving = true;
    try {
      const meta = this.meta(id);
      if (value !== null) validateSafeZones(value, meta);
      const cfg = await this.config(), old = cfg.maps[String(id)] ?? null;
      if (revision !== this.revision(old)) throw Error('Vùng an toàn đã thay đổi ở tab khác. Mở lại bản lưu trước khi thử lại.');
      const zones = value === null ? null : (value as SafeZone[]).map(z => ({ id: z.id, name: z.name.trim(), points: z.points.map(p => ({ x: p.x, y: p.y })) }));
      if (zones === null) delete cfg.maps[String(id)]; else cfg.maps[String(id)] = zones;
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try { await fs.mkdir(path.dirname(this.file), { recursive: true }); await fs.writeFile(tmp, JSON.stringify(cfg, null, 2) + '\n'); await fs.rename(tmp, this.file); }
      finally { await fs.rm(tmp, { force: true }); }
      return { zones: zones ?? [], custom: zones !== null, revision: this.revision(zones) };
    } finally { this.saving = false; }
  }
}
