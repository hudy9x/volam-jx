import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { configuredPortals, validatePortals, type PortalConfig } from '../../packages/shared/src/maps/portals.js';
import type { MapMeta, Portal } from '../../packages/shared/src/maps/types.js';
export class PortalStore {
  private saving = false;
  constructor(readonly file: string, private maps: Record<number, MapMeta>, private defaults: Record<number, Portal[]>, private standable: (id: number, x: number, y: number) => boolean) {}
  private async config(): Promise<PortalConfig> {
    try { const cfg = JSON.parse(await fs.readFile(this.file, 'utf8')); if (cfg.version !== 1 || !cfg.maps || typeof cfg.maps !== 'object' || Array.isArray(cfg.maps)) throw Error('Cấu hình điểm chuyển map không hợp lệ.'); return cfg; }
    catch (e) { if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, maps: {} }; throw e; }
  }
  private revision(list: Portal[]) { return createHash('sha256').update(JSON.stringify(list)).digest('hex'); }
  private meta(id: number) { const m = this.maps[id]; if (!m) throw Error('Không có bản đồ này.'); return m; }
  async read(id: number) {
    this.meta(id); const cfg = await this.config(), portals = configuredPortals(id, this.defaults[id] ?? [], cfg);
    return { portals, revision: this.revision(portals), custom: Object.hasOwn(cfg.maps, String(id)) };
  }
  async save(id: number, value: unknown, revision: string) {
    if (this.saving) throw Error('Đang lưu điểm chuyển map.'); this.saving = true;
    try {
      validatePortals(value, this.meta(id), this.maps);
      const old = await this.read(id); if (old.revision !== revision) throw Error('Điểm chuyển map đã đổi ở tab khác. Bản nháp được giữ; mở lại bản lưu.');
      for (const p of value) {
        if (this.maps[p.toMap].enabled === false) throw Error(`${p.label}: map đích đang đóng.`);
        if (!this.standable(id, p.x, p.y)) throw Error(`${p.label}: điểm đặt bị chặn hoặc không ở vùng đi lại chính.`);
        if (!this.standable(p.toMap, p.toX, p.toY)) throw Error(`${p.label}: điểm đến bị chặn hoặc thiếu tài nguyên map đích.`);
      }
      const cfg = await this.config(), portals = value.map(p => ({ id: p.id, label: p.label.trim(), x: p.x, y: p.y, radius: p.radius, toMap: p.toMap, toX: p.toX, toY: p.toY }));
      cfg.maps[String(id)] = portals; const tmp = `${this.file}.${randomUUID()}.tmp`;
      try { await fs.mkdir(path.dirname(this.file), { recursive: true }); await fs.writeFile(tmp, JSON.stringify(cfg, null, 2) + '\n'); await fs.rename(tmp, this.file); }
      finally { await fs.rm(tmp, { force: true }); }
      return { portals, revision: this.revision(portals), custom: true };
    } finally { this.saving = false; }
  }

  async replaceTkPortals(id: number, tkPortals: Portal[]) {
    if (this.saving) throw Error('Đang lưu điểm chuyển map.');
    this.saving = true;
    try {
      const m = this.meta(id);
      const cfg = await this.config();
      const existing = configuredPortals(id, this.defaults[id] ?? [], cfg).filter(
        p => !p.id.startsWith('tk-tong-') && !p.id.startsWith('tk-kim-'),
      );
      const next = [...existing, ...tkPortals];
      validatePortals(next, m, this.maps);
      for (const p of tkPortals) {
        if (!this.standable(id, p.x, p.y)) throw Error(`${p.label}: điểm đặt (${p.x}, ${p.y}) bị chặn.`);
        if (!this.standable(p.toMap, p.toX, p.toY)) throw Error(`${p.label}: điểm đến (${p.toX}, ${p.toY}) bị chặn.`);
      }
      cfg.maps[String(id)] = next.map(p => ({ id: p.id, label: p.label.trim(), x: p.x, y: p.y, radius: p.radius, toMap: p.toMap, toX: p.toX, toY: p.toY }));
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try { await fs.mkdir(path.dirname(this.file), { recursive: true }); await fs.writeFile(tmp, JSON.stringify(cfg, null, 2) + '\n'); await fs.rename(tmp, this.file); }
      finally { await fs.rm(tmp, { force: true }); }
      return { portals: cfg.maps[String(id)], revision: this.revision(cfg.maps[String(id)]) };
    } finally { this.saving = false; }
  }
}
