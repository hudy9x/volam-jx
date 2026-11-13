// JX1 client region file (`<map>\v_YYY\XXX_region_c.dat`), reverse-engineered from the SHXT client.
//
// File: u32 sectionCount (=6), then sectionCount x {u32 offset, u32 length}; offsets are relative to the
// end of that table (4 + 8 * count).
//   0 obstacles   16 x 32 cells x u32 (index = x * 32 + y; cell = 32 x 32 logic = 32 x 16 screen px).
//                 value = (shape << 4) | kind; kind 1/2/4..., shape 1 = full cell, 2..5 = corner triangles.
//   1 traps       u32 count, 8 reserved bytes, count x {u8 x, u8 y, u16 run, u32 scriptHash}.
//   2, 3          unused in client files.
//   4 ground      u32 tileCount, u32 decalCount, u32 tileBytes (byte offset of the decal list, from section start)
//                 tiles:  u16 h, u16 v, u16 frame, u16 nameLen, char name[nameLen] (incl. NUL);
//                         drawn at screen (h * 32, v * 32) inside the region (64 x 64 tiles, h/v even).
//                 decals: 146 bytes: i32 x, i32 y (absolute logic), char name[128], u16 w, u16 h, u16 frame,
//                         u8 0, u8 layer (1|2), i16 order. Flat, drawn on the ground, (x, y/2) = frame top-left.
//   5 objects     u32 count, u16 a, u16 pointCount, u16 lineCount, 6 reserved, count x 228 bytes:
//                   0  u32 props
//                   4  4 x {i32 x, y, z} image corners LT, RT, RB, LB (absolute logic; z = height)
//                  52  u16 w, u16 h (frame size)
//                  56  char name[128]
//                 184  u16, u16, u16 frame, u16 frameCount, u16, i16 (-1)
//                 196  {i32 x, y, z} sort point 1; 208 sort point 2 (zero = sort by point, else by line)
//                 220  8 bytes runtime cache
// Screen projection: sx = x, sy = y / 2 - z * sqrt(3) / 2 (h ~= ceil((LT.z - RB.z) * 0.866)).
export const REGION_W = 512;
export const REGION_H = 512;
export const CELL_W = 32;
export const CELL_H = 16;
export const REGION_COLS = 16;
export const REGION_ROWS = 32;
export const Z_SCALE = Math.sqrt(3) / 2;

export interface GroundTile { h: number; v: number; frame: number; spr: string }
export interface Decal { x: number; y: number; spr: string; w: number; h: number; frame: number; layer: number; order: number }
export interface Trap { x: number; y: number; run: number; hash: number }
export interface Obj {
  props: number;
  corners: [number, number, number][];
  w: number; h: number; spr: string; frame: number; frameCount: number;
  sort1: [number, number]; sort2: [number, number] | null;
}
export interface Region {
  /** 512 obstacle values, index = x * 32 + y. Empty when the region has no obstacle section. */
  obstacles: Uint32Array | null;
  traps: Trap[];
  tiles: GroundTile[];
  decals: Decal[];
  objects: Obj[];
}

const gbk = new TextDecoder('gbk');
function cstr(buf: Buffer, start: number, max: number): string {
  let end = start;
  while (end < start + max && end < buf.length && buf[end] !== 0) end++;
  return gbk.decode(buf.subarray(start, end));
}

export function parseRegion(buf: Buffer): Region {
  const count = buf.readUInt32LE(0);
  const base = 4 + count * 8;
  const sec = (i: number): Buffer | null => {
    if (i >= count) return null;
    const off = buf.readUInt32LE(4 + i * 8), len = buf.readUInt32LE(8 + i * 8);
    return len ? buf.subarray(base + off, base + off + len) : null;
  };
  const region: Region = { obstacles: null, traps: [], tiles: [], decals: [], objects: [] };

  const obs = sec(0);
  if (obs && obs.length >= REGION_COLS * REGION_ROWS * 4) {
    region.obstacles = new Uint32Array(REGION_COLS * REGION_ROWS);
    for (let i = 0; i < region.obstacles.length; i++) region.obstacles[i] = obs.readUInt32LE(i * 4);
  }

  const traps = sec(1);
  if (traps) {
    const n = traps.readUInt32LE(0);
    for (let i = 0; i < n && 12 + i * 8 + 8 <= traps.length; i++) {
      const p = 12 + i * 8;
      region.traps.push({ x: traps[p], y: traps[p + 1], run: traps.readUInt16LE(p + 2), hash: traps.readUInt32LE(p + 4) });
    }
  }

  const ground = sec(4);
  if (ground) {
    const tiles = ground.readUInt32LE(0), decals = ground.readUInt32LE(4), tileBytes = ground.readUInt32LE(8);
    let p = 12;
    for (let i = 0; i < tiles; i++) {
      const h = ground.readUInt16LE(p), v = ground.readUInt16LE(p + 2), frame = ground.readUInt16LE(p + 4), len = ground.readUInt16LE(p + 6);
      region.tiles.push({ h, v, frame, spr: cstr(ground, p + 8, len) });
      p += 8 + len;
    }
    p = tileBytes;
    for (let i = 0; i < decals && p + 146 <= ground.length; i++, p += 146) {
      region.decals.push({
        x: ground.readInt32LE(p), y: ground.readInt32LE(p + 4), spr: cstr(ground, p + 8, 128),
        w: ground.readUInt16LE(p + 136), h: ground.readUInt16LE(p + 138), frame: ground.readUInt16LE(p + 140),
        layer: ground[p + 143], order: ground.readInt16LE(p + 144),
      });
    }
  }

  const objs = sec(5);
  if (objs) {
    const n = objs.readUInt32LE(0);
    for (let i = 0; i < n && 16 + (i + 1) * 228 <= objs.length; i++) {
      const p = 16 + i * 228;
      const corners: [number, number, number][] = [];
      for (let k = 0; k < 4; k++) corners.push([objs.readInt32LE(p + 4 + k * 12), objs.readInt32LE(p + 8 + k * 12), objs.readInt32LE(p + 12 + k * 12)]);
      const s2: [number, number] = [objs.readInt32LE(p + 208), objs.readInt32LE(p + 212)];
      region.objects.push({
        props: objs.readUInt32LE(p), corners,
        w: objs.readUInt16LE(p + 52), h: objs.readUInt16LE(p + 54), spr: cstr(objs, p + 56, 128),
        frame: objs.readUInt16LE(p + 188), frameCount: objs.readUInt16LE(p + 190),
        sort1: [objs.readInt32LE(p + 196), objs.readInt32LE(p + 200)],
        sort2: s2[0] || s2[1] ? s2 : null,
      });
    }
  }
  return region;
}
