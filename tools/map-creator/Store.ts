import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { blankProject, validateProject, type Project, type Asset } from './model.js';

export class ProjectStore {
  constructor(readonly root: string) {}
  folder(id: number): string {
    if (!Number.isInteger(id) || id < 1000 || id > 999999) throw Error('ID project không hợp lệ.');
    return path.join(this.root, String(id));
  }
  async list(): Promise<{ id: number; name: string; revision: number }[]> {
    await fs.mkdir(this.root, { recursive: true });
    const result = [];
    for (const dir of await fs.readdir(this.root)) {
      if (!/^\d+$/.test(dir)) continue;
      try { const p = await this.read(Number(dir)); result.push({ id: p.id, name: p.name, revision: p.revision }); } catch { /* Skip unrelated or incomplete folders. */ }
    }
    return result.sort((a, b) => a.id - b.id);
  }
  async create(id: number, name: string): Promise<Project> {
    const p = blankProject(id, name); validateProject(p);
    await fs.mkdir(this.root, { recursive: true });
    await fs.mkdir(this.folder(id)); // Refuse overwrite, including an existing export folder.
    await fs.mkdir(path.join(this.folder(id), 'assets'));
    await this.atomic(path.join(this.folder(id), 'project.json'), p);
    return p;
  }
  async read(id: number): Promise<Project> {
    const p = JSON.parse(await fs.readFile(path.join(this.folder(id), 'project.json'), 'utf8'));
    validateProject(p); return p;
  }
  private saving = new Set<number>();
  async save(id: number, value: unknown): Promise<Project> {
    if (this.saving.has(id)) throw Error('Project đang được lưu hoặc xuất. Thử lại sau.');
    this.saving.add(id);
    try {
      validateProject(value);
      if (value.id !== id) throw Error('Không được đổi ID project khi lưu.');
      const old = await this.read(id);
      if (old.revision !== value.revision) throw Error('Project đã được lưu ở tab khác. Giữ bản đang sửa, tải lại sau khi sao lưu JSON.');
      for (const a of [...value.assets, ...(value.ground ? [value.ground] : [])]) {
        const m = await sharp(this.assetPath(id, a.id)).metadata();
        if (m.width !== a.width || m.height !== a.height) throw Error('Kích thước ảnh không khớp ảnh đã upload.');
      }
      const p = structuredClone(value); p.name = p.name.trim(); p.revision++;
      await this.atomic(path.join(this.folder(id), 'project.json'), p);
      return p;
    } finally { this.saving.delete(id); }
  }
  async upload(id: number, bytes: Buffer, name: string): Promise<Asset> {
    await this.read(id);
    if (!bytes.length || bytes.length > 32 * 1024 * 1024) throw Error('Ảnh tối đa 32 MB.');
    const image = sharp(bytes, { limitInputPixels: 8192 * 8192, animated: false });
    const meta = await image.metadata();
    if (!['png', 'jpeg', 'webp'].includes(meta.format ?? '') || (meta.pages ?? 1) > 1 || !meta.width || !meta.height || meta.width > 8192 || meta.height > 8192 || (meta.orientation ?? 1) !== 1) throw Error('Dùng PNG/JPG/WebP tĩnh, tối đa 8192×8192, ảnh đã xoay đúng chiều.');
    const output = await image.webp({ lossless: true }).toBuffer();
    const hash = createHash('sha256').update(output).digest('hex');
    await fs.writeFile(this.assetPath(id, hash), output, { flag: 'wx' }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    return { id: hash, name: name.slice(0, 120).trim() || 'Ảnh', width: meta.width, height: meta.height };
  }
  assetPath(id: number, asset: string): string {
    if (!/^[a-f0-9]{64}$/.test(asset)) throw Error('Ảnh không hợp lệ.');
    return path.join(this.folder(id), 'assets', `${asset}.webp`);
  }
  async atomic(file: string, value: unknown): Promise<void> {
    const tmp = `${file}.${randomUUID()}.tmp`;
    try { await fs.writeFile(tmp, JSON.stringify(value, null, 2)); await fs.rename(tmp, file); }
    finally { await fs.rm(tmp, { force: true }); }
  }
}
