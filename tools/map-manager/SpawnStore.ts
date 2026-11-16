import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { bossTierOf, formatSpawnFile, spawnFileError, type SpawnFile } from '../../packages/shared/src/maps/spawns.js';
import type { MapMeta } from '../../packages/shared/src/maps/types.js';

/** Writes the existing runtime format; placement mode is per zone, not SpawnFile.auto. */
export class SpawnStore {
  private saving = false;
  constructor(readonly directory: string, private maps: Record<number, MapMeta>, private known: (id: number) => boolean, private standable: (id: number, x: number, y: number) => boolean) {}
  async read(id: number) {
    if (!this.maps[id]) throw Error('Không có bản đồ này.');
    let raw: string | null = null;
    try { raw = await fs.readFile(path.join(this.directory, `${id}.json`), 'utf8'); }
    catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
    const file: SpawnFile = raw === null ? { map: id, auto: false, zones: [] } : JSON.parse(raw);
    return { file, revision: createHash('sha256').update(raw ?? 'missing').digest('hex') };
  }
  async save(id: number, value: unknown, revision: string) {
    if (this.saving) throw Error('Đang lưu điểm sinh quái.'); this.saving = true;
    try {
      const meta = this.maps[id]; if (!meta) throw Error('Không có bản đồ này.');
      const old = await this.read(id);
      if (old.revision !== revision) throw Error('Điểm sinh quái đã đổi ở tab khác. Mở lại bản lưu; bản nháp vẫn được giữ.');
      const f = value as SpawnFile;
      const err = spawnFileError(f, this.known); if (err) throw Error(err);
      if (f.map !== id || !Array.isArray(f.fixed ?? [])) throw Error('Cấu hình bản đồ không hợp lệ.');
      const int = (n: unknown, lo: number, hi: number) => Number.isInteger(n) && Number(n) >= lo && Number(n) <= hi;
      const point = (x: number, y: number) => int(x, 0, meta.raw.size.width - 1) && int(y, 0, meta.raw.size.height - 1) && this.standable(id, x, y);
      // Existing legacy gold zones are ignored by runtime; preserve them, never edit them here.
      const gold = (file: SpawnFile) => file.zones.filter(z => bossTierOf(z.boss) === 2);
      if (JSON.stringify(gold(f)) !== JSON.stringify(gold(old.file))) throw Error('Hãy chỉnh Boss Hoàng Kim ở trang riêng.');
      for (const z of f.zones) {
        if (bossTierOf(z.boss) === 2) continue;
        if (![undefined, false, 1].includes(z.boss) || !int(z.count, 1, 60) || !int(z.respawn, 1, 3600) || z.camps !== undefined && !int(z.camps, 1, 100)) throw Error('Số lượng 1–60, số cụm Auto 1–100, hồi sinh 1–3600 giây; chỉ quái thường hoặc Boss Xanh.');
        if (z.monsters.some(m => !int(m[0], 0, 1e6) || !int(m[1], 1, 200))) throw Error('Quái và cấp phải là số nguyên hợp lệ.');
        if (z.x !== undefined && !point(z.x, z.y!)) throw Error('Điểm Manual nằm ngoài map, bị chặn hoặc không thuộc vùng đi lại chính.');
      }
      for (const fx of f.fixed ?? []) if (!point(fx.x, fx.y) || !int(fx.level, 1, 200)) throw Error('Điểm cố định không hợp lệ.');
      // Bound runtime work, including camps. Existing files remain readable even when over budget.
      const slots = f.zones.filter(z => bossTierOf(z.boss) < 2).reduce((n, z) => n + z.count * (z.x === undefined ? z.camps ?? 1 : 1), 0) + (f.fixed?.length ?? 0);
      if (slots > 5000) throw Error('Tối đa 5000 quái trên một bản đồ.');
      const file: SpawnFile = { map: id, auto: false, ...(old.file.note ? { note: old.file.note } : {}), zones: structuredClone(f.zones), ...(f.fixed?.length ? { fixed: structuredClone(f.fixed) } : {}) };
      const target = path.join(this.directory, `${id}.json`), tmp = `${target}.${randomUUID()}.tmp`;
      try { await fs.mkdir(this.directory, { recursive: true }); await fs.writeFile(tmp, formatSpawnFile(file)); await fs.rename(tmp, target); }
      finally { await fs.rm(tmp, { force: true }); }
      return await this.read(id);
    } finally { this.saving = false; }
  }
}
