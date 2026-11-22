import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { applyDisabledMaps, TOWN_MAP_ID, type DisabledMapsConfig, type MapMeta } from '../../packages/shared/src/maps/index.js';

export class DisabledMapStore {
  private saving = false;
  constructor(
    readonly file: string,
    private maps: Record<number, MapMeta>,
  ) {}

  async readConfig(): Promise<DisabledMapsConfig> {
    try {
      const cfg = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (!cfg || cfg.version !== 1 || !Array.isArray(cfg.disabled)) throw Error('disabled-maps.json không hợp lệ.');
      return cfg as DisabledMapsConfig;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, disabled: [] };
      throw e;
    }
  }

  async setEnabled(id: number, enabled: boolean): Promise<{ id: number; enabled: boolean }> {
    const meta = this.maps[id];
    if (!meta) throw Error('Không có bản đồ này.');
    if (!enabled && id === TOWN_MAP_ID) throw Error('Không thể tắt Biện Kinh (map mặc định an toàn).');
    if (this.saving) throw Error('Đang lưu trạng thái bật/tắt bản đồ.');
    this.saving = true;
    try {
      const cfg = await this.readConfig();
      const set = new Set(cfg.disabled.map(Number).filter(n => Number.isInteger(n) && n > 0 && n !== TOWN_MAP_ID));
      if (enabled) set.delete(id);
      else set.add(id);
      const next: DisabledMapsConfig = { version: 1, disabled: [...set].sort((a, b) => a - b) };
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(tmp, JSON.stringify(next, null, 2) + '\n');
        await fs.rename(tmp, this.file);
      } finally {
        await fs.rm(tmp, { force: true });
      }
      applyDisabledMaps(next);
      return { id, enabled: !set.has(id) };
    } finally {
      this.saving = false;
    }
  }
}
