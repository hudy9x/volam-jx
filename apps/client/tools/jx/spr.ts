// Kingsoft JX1 .spr decoder (already PAK-decompressed bytes).
// Layout: "SPR\0", u16 width, height, centerX, centerY, frames, colors, directions, interval, 12 reserved,
// palette (colors x RGB), frame table (frames x {u32 offset, u32 length}) then per frame:
// i16 w, h, x, y followed by RLE rows of (count, alpha) pairs; alpha 0 = skip, else `count` palette indices.
export interface SprFrame {
  /** Bounding box inside the canvas (gw x gh). */
  x: number; y: number; w: number; h: number;
  /** RGBA, w*h*4 (empty when w or h is 0). */
  rgba: Uint8Array;
}

export interface Spr {
  width: number; height: number; centerX: number; centerY: number;
  frames: SprFrame[]; directions: number; interval: number;
  /**
   * Header word Reserved[1] (offset 22). The engine source we have leaves Reserved[] unused, but in this client it is 1
   * on exactly the effects drawn on a black background (150 skills, Hoa Sơn, fireworks: 59/59) and 0 on all the other
   * effect art (0/212): the later engine's "lighten / add" flag.
   */
  additive: boolean;
}

export function decodeSpr(buf: Buffer): Spr {
  if (buf.toString('latin1', 0, 3) !== 'SPR') throw new Error('not an SPR');
  const width = buf.readUInt16LE(4), height = buf.readUInt16LE(6);
  const centerX = buf.readUInt16LE(8), centerY = buf.readUInt16LE(10);
  const count = buf.readUInt16LE(12), colors = buf.readUInt16LE(14);
  const directions = Math.max(1, buf.readUInt16LE(16)), interval = buf.readUInt16LE(18);
  const pal = 32, table = pal + colors * 3, base = table + count * 8;
  const frames: SprFrame[] = [];
  for (let i = 0; i < count; i++) {
    const off = base + buf.readUInt32LE(table + i * 8), len = buf.readUInt32LE(table + i * 8 + 4);
    if (len < 8 || off + len > buf.length) { frames.push({ x: 0, y: 0, w: 0, h: 0, rgba: new Uint8Array(0) }); continue; }
    const w = buf.readInt16LE(off), h = buf.readInt16LE(off + 2), x = buf.readInt16LE(off + 4), y = buf.readInt16LE(off + 6);
    if (w <= 0 || h <= 0) { frames.push({ x, y, w: 0, h: 0, rgba: new Uint8Array(0) }); continue; }
    const rgba = new Uint8Array(w * h * 4);
    let p = off + 8, px = 0, py = 0;
    const end = off + len;
    while (p + 1 < end && py < h) {
      const n = buf[p], a = buf[p + 1];
      p += 2;
      if (a !== 0) {
        let o = (py * w + px) * 4;
        for (let k = 0; k < n && px + k < w; k++, o += 4) {
          const c = buf[p + k] * 3 + pal;
          rgba[o] = buf[c]; rgba[o + 1] = buf[c + 1]; rgba[o + 2] = buf[c + 2]; rgba[o + 3] = a;
        }
        p += n;
      }
      px += n;
      while (px >= w) { px -= w; py++; }
    }
    frames.push({ x, y, w, h, rgba });
  }
  return { width, height, centerX, centerY, frames, directions, interval, additive: buf.readUInt16LE(22) === 1 };
}

/** Union bounding box of all non-empty frames, in canvas coordinates. */
export function unionBox(frames: SprFrame[]): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const f of frames) {
    if (!f.w) continue;
    x0 = Math.min(x0, f.x); y0 = Math.min(y0, f.y);
    x1 = Math.max(x1, f.x + f.w); y1 = Math.max(y1, f.y + f.h);
  }
  if (x0 === Infinity) return { x: 0, y: 0, w: 1, h: 1 };
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
