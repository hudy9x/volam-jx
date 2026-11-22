import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { applyNavOverrides, clearMapNavigation, type MapMeta, type MapNavOverride, type NavOverridesConfig } from '../../packages/shared/src/maps/index.js';

export class NavOverrideStore {
  private saving = false;
  constructor(
    readonly file: string,
    private maps: Record<number, MapMeta>,
  ) {}

  private async config(): Promise<NavOverridesConfig> {
    try {
      const cfg = JSON.parse(await fs.readFile(this.file, 'utf8'));
      if (!cfg || cfg.version !== 1 || !cfg.maps || typeof cfg.maps !== 'object' || Array.isArray(cfg.maps)) {
        throw Error('nav-overrides.json không hợp lệ.');
      }
      return cfg as NavOverridesConfig;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return { version: 1, maps: {} };
      throw e;
    }
  }

  private normalize(raw?: MapNavOverride): { unblock: number[]; block: number[] } {
    const unblock = [...new Set((raw?.unblock ?? []).map(Number).filter(n => Number.isInteger(n) && n >= 0))].sort((a, b) => a - b);
    const blockSet = new Set((raw?.block ?? []).map(Number).filter(n => Number.isInteger(n) && n >= 0));
    const block = [...blockSet].filter(n => !unblock.includes(n)).sort((a, b) => a - b);
    return { unblock, block };
  }

  private revision(ov: { unblock: number[]; block: number[] }): string {
    return createHash('sha256').update(JSON.stringify(ov)).digest('hex');
  }

  async read(id: number): Promise<{ override: { unblock: number[]; block: number[] }; revision: string }> {
    if (!this.maps[id]) throw Error('Không có bản đồ này.');
    const cfg = await this.config();
    const override = this.normalize(cfg.maps[String(id)]);
    return { override, revision: this.revision(override) };
  }

  async save(id: number, value: unknown, revision: string): Promise<{ override: { unblock: number[]; block: number[] }; revision: string }> {
    if (!this.maps[id]) throw Error('Không có bản đồ này.');
    if (this.saving) throw Error('Đang lưu vùng chặn.');
    this.saving = true;
    try {
      const old = await this.read(id);
      if (old.revision !== revision) throw Error('Vùng chặn đã đổi ở tab khác. Bản nháp được giữ; hãy mở lại bản lưu.');
      const nextOv = this.normalize(value as MapNavOverride);
      if (nextOv.unblock.length + nextOv.block.length > 200_000) throw Error('Số lượng ô chỉnh sửa quá lớn.');
      const cfg = await this.config();
      if (nextOv.unblock.length || nextOv.block.length) cfg.maps[String(id)] = nextOv;
      else delete cfg.maps[String(id)];
      const tmp = `${this.file}.${randomUUID()}.tmp`;
      try {
        await fs.mkdir(path.dirname(this.file), { recursive: true });
        await fs.writeFile(tmp, JSON.stringify(cfg, null, 2) + '\n');
        await fs.rename(tmp, this.file);
      } finally {
        await fs.rm(tmp, { force: true });
      }
      applyNavOverrides(cfg);
      clearMapNavigation(id);
      return { override: nextOv, revision: this.revision(nextOv) };
    } finally {
      this.saving = false;
    }
  }
}
