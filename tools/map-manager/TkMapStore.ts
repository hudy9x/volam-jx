import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import {
  TK_BATTLE_MAP_ID,
  validateTkBattleMap,
  type TkBattleMapConfig,
  type TkCamp,
  type TkMapsFile,
} from '../../packages/shared/src/battle/tongkim.js';
import type { MapMeta } from '../../packages/shared/src/maps/types.js';

export class TkMapStore {
  private saving = false;
  constructor(
    readonly file: string,
    private maps: Record<number, MapMeta>,
    private standable: (id: number, x: number, y: number) => boolean,
  ) {}

  private async config(): Promise<TkMapsFile> {
    try {
      const cfg = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (!cfg || cfg.version !== 1 || !cfg.maps || typeof cfg.maps !== 'object' || Array.isArray(cfg.maps)) {
        throw Error('Cấu hình map Tống Kim không hợp lệ.');
      }
      return cfg as TkMapsFile;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, maps: {} };
      throw e;
    }
  }

  private revision(cfg: TkBattleMapConfig | null): string {
    return createHash('sha256').update(JSON.stringify(cfg)).digest('hex');
  }

  private meta(id: number): MapMeta {
    const m = this.maps[id];
    if (!m) throw Error('Không có bản đồ này.');
    return m;
  }

  async read(id: number): Promise<{ config: TkBattleMapConfig | null; revision: string; configured: boolean }> {
    this.meta(id);
    const file = await this.config();
    const config = file.maps[String(id)] ?? null;
    return { config, revision: this.revision(config), configured: Boolean(config) };
  }

  async save(id: number, value: unknown, revision: string): Promise<{ config: TkBattleMapConfig; revision: string; configured: boolean }> {
    if (this.saving) throw Error('Đang lưu cấu hình Tống Kim.');
    this.saving = true;
    try {
      const m = this.meta(id);
      const next = validateTkBattleMap({ ...(value && typeof value === 'object' ? value : {}), id, name: m.name }, m);
      const old = await this.read(id);
      if (old.revision !== revision) {
        throw Error('Cấu hình Tống Kim của map này đã đổi ở tab khác. Bản nháp được giữ; hãy mở lại bản lưu.');
      }
      for (const camp of ['tong', 'kim'] as const satisfies readonly TkCamp[]) {
        const c = next[camp];
        const label = camp === 'tong' ? 'Tống' : 'Kim';
        if (!this.standable(id, c.spawn.x, c.spawn.y)) throw Error(`Phe ${label}: Điểm tập trung (${c.spawn.x}, ${c.spawn.y}) bị chặn.`);
        if (!this.standable(id, c.gateExit.x, c.gateExit.y)) throw Error(`Phe ${label}: Điểm đáp ngoài cổng (${c.gateExit.x}, ${c.gateExit.y}) bị chặn.`);
        if (!this.standable(id, c.marshal.x, c.marshal.y)) throw Error(`Phe ${label}: Nguyên Soái (${c.marshal.x}, ${c.marshal.y}) bị chặn.`);
        for (let i = 0; i < c.frontlines.length; i++) {
          const f = c.frontlines[i];
          if (!this.standable(id, f.x, f.y)) throw Error(`Phe ${label}: Tiền tuyến #${i + 1} (${f.x}, ${f.y}) bị chặn.`);
        }
        for (let i = 0; i < c.npcSpawns.length; i++) {
          const g = c.npcSpawns[i];
          if (!this.standable(id, g.x, g.y)) throw Error(`Phe ${label}: Cụm NPC #${i + 1} (${g.x}, ${g.y}) bị chặn.`);
        }
      }
      const file = await this.config();
      file.maps[String(id)] = next;
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(tmp, JSON.stringify(file, null, 2) + '\n');
        await fs.rename(tmp, this.file);
      } finally {
        await fs.rm(tmp, { force: true });
      }
      return { config: next, revision: this.revision(next), configured: true };
    } finally {
      this.saving = false;
    }
  }

  async remove(id: number, revision: string): Promise<{ config: null; revision: string; configured: boolean }> {
    if (id === TK_BATTLE_MAP_ID) throw Error(`Không thể xóa map Tống Kim mặc định (${TK_BATTLE_MAP_ID}).`);
    if (this.saving) throw Error('Đang lưu cấu hình Tống Kim.');
    this.saving = true;
    try {
      this.meta(id);
      const old = await this.read(id);
      if (old.revision !== revision) throw Error('Cấu hình Tống Kim đã đổi ở tab khác.');
      const file = await this.config();
      delete file.maps[String(id)];
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(tmp, JSON.stringify(file, null, 2) + '\n');
        await fs.rename(tmp, this.file);
      } finally {
        await fs.rm(tmp, { force: true });
      }
      return { config: null, revision: this.revision(null), configured: false };
    } finally {
      this.saving = false;
    }
  }
}
