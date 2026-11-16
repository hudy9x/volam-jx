/** Editor source format. World coordinates use the same pixels as game maps. */
export interface Asset { id: string; name: string; width: number; height: number }
export interface WorldObject {
  id: string; asset: string; name: string; x: number; y: number; scale: number;
  anchorX: number; anchorY: number; depthOffset: number;
  collider: { enabled: boolean; rx: number; ry: number; ox: number; oy: number };
}
export interface Project {
  version: 1; id: number; name: string; revision: number;
  width: number; height: number; entry: { x: number; y: number };
  ground: Asset | null; assets: Asset[]; objects: WorldObject[];
  /** Manual terrain blockers only. Object colliders compile separately. */
  blocked: number[];
}
export const CELL_W = 32, CELL_H = 16;
export function blankProject(id: number, name: string): Project {
  return { version: 1, id, name, revision: 0, width: 3584, height: 3584,
    entry: { x: 1792, y: 1792 }, ground: null, assets: [], objects: [], blocked: [] };
}
export function validateProject(value: unknown): asserts value is Project {
  const p = value as Project;
  const fail = (s: string): never => { throw Error(s); };
  const num = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
  const text = (v: unknown, max = 120) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  const asset = (a: Asset) => a && /^[a-f0-9]{64}$/.test(a.id) && text(a.name) && Number.isInteger(a.width) && Number.isInteger(a.height) && num(a.width, 1, 8192) && num(a.height, 1, 8192);
  if (!p || p.version !== 1 || !Number.isInteger(p.id) || !num(p.id, 1000, 999999) || !text(p.name) || !Number.isInteger(p.revision) || !num(p.revision, 0, 1e9)) fail('ID map phải từ 1000–999999; tên map không được trống.');
  if (!Number.isInteger(p.width) || !Number.isInteger(p.height) || !num(p.width, 32, 8192) || !num(p.height, 16, 8192) || p.width % CELL_W || p.height % CELL_H) fail('Kích thước tối đa 8192; rộng chia hết cho 32, cao chia hết cho 16.');
  if (!p.entry || !num(p.entry.x, 0, p.width - 1) || !num(p.entry.y, 0, p.height - 1)) fail('Điểm vào phải nằm trong map.');
  if (p.ground !== null && (!asset(p.ground) || p.ground.width !== p.width || p.ground.height !== p.height)) fail('Ground phải đúng kích thước map, không kéo giãn ảnh.');
  if (!Array.isArray(p.assets) || p.assets.length > 300 || p.assets.some(a => !asset(a)) || new Set(p.assets.map(a => a.id)).size !== p.assets.length) fail('Thư viện world không hợp lệ (tối đa 300 ảnh).');
  if (!Array.isArray(p.objects) || p.objects.length > 5000) fail('Tối đa 5000 world objects.');
  const ids = new Set<string>();
  for (const o of p.objects) {
    const a = p.assets.find(a => a.id === o.asset), c = o.collider;
    if (!a || !text(o.id) || ids.has(o.id) || !text(o.name) || !num(o.x, 0, p.width - 1) || !num(o.y, 0, p.height - 1) || !num(o.scale, .1, 4) || !num(o.anchorX, 0, a.width) || !num(o.anchorY, 0, a.height) || !num(o.depthOffset, -4096, 4096) || !c || typeof c.enabled !== 'boolean' || !num(c.rx, 1, 2048) || !num(c.ry, 1, 2048) || !num(c.ox, -8192, 8192) || !num(c.oy, -8192, 8192)) fail('World có tọa độ, anchor, tỷ lệ hoặc collider không hợp lệ.');
    ids.add(o.id);
  }
  const cells = p.width / CELL_W * (p.height / CELL_H);
  if (!Array.isArray(p.blocked) || p.blocked.length > cells || p.blocked.some(i => !Number.isInteger(i) || i < 0 || i >= cells) || new Set(p.blocked).size !== p.blocked.length) fail('Vùng cấm đi không hợp lệ.');
}
/** Compile manual blockers plus object footprints, without baking them back into source. */
export function navigationMask(p: Project): Uint8Array {
  const cols = p.width / CELL_W, rows = p.height / CELL_H;
  const mask = new Uint8Array(cols * rows);
  for (const i of p.blocked) mask[i] = 1;
  for (const o of p.objects) {
    const c = o.collider;
    if (!c.enabled) continue;
    const x = o.x + c.ox * o.scale, y = o.y + c.oy * o.scale;
    const rx = c.rx * o.scale, ry = c.ry * o.scale;
    for (let cy = Math.max(0, Math.floor((y - ry) / CELL_H)); cy <= Math.min(rows - 1, Math.floor((y + ry) / CELL_H)); cy++) {
      for (let cx = Math.max(0, Math.floor((x - rx) / CELL_W)); cx <= Math.min(cols - 1, Math.floor((x + rx) / CELL_W)); cx++) {
        // Ellipse intersects the cell rectangle; even a small trunk blocks its cell.
        const dx = Math.max(Math.abs((cx + .5) * CELL_W - x) - CELL_W / 2, 0);
        const dy = Math.max(Math.abs((cy + .5) * CELL_H - y) - CELL_H / 2, 0);
        if ((dx / rx) ** 2 + (dy / ry) ** 2 <= 1) mask[cy * cols + cx] = 1;
      }
    }
  }
  return mask;
}
