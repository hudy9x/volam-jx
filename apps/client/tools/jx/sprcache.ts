// Lazy, cached single-frame access to SPR files (map art reuses a few thousand frames many times).
import fs from 'node:fs';
import { resolveAny } from './hashindex.js';

export interface Frame { x: number; y: number; w: number; h: number; rgba: Uint8Array; canvasW: number; canvasH: number; count: number }

const EMPTY = new Uint8Array(0);
const buffers = new Map<string, Buffer | null>();
const frames = new Map<string, Frame | null>();
let frameBytes = 0;
const MAX_FRAME_BYTES = 1.5 * 2 ** 30;

function sprBuffer(path: string): Buffer | null {
  let b = buffers.get(path);
  if (b === undefined) {
    const file = resolveAny(path);
    b = file ? fs.readFileSync(file) : null;
    if (b && b.toString('latin1', 0, 3) !== 'SPR') b = null;
    buffers.set(path, b);
  }
  return b;
}

export function sprFrameCount(path: string): number {
  const b = sprBuffer(path);
  return b ? b.readUInt16LE(12) : 0;
}

/** Decoded frame (RGBA) or null when the file/frame is missing. */
export function getFrame(path: string, index: number): Frame | null {
  const key = `${path}#${index}`;
  const hit = frames.get(key);
  if (hit !== undefined) {
    frames.delete(key); frames.set(key, hit); // LRU touch
    return hit;
  }
  const f = decodeFrame(path, index);
  frames.set(key, f);
  frameBytes += f?.rgba.length ?? 0;
  while (frameBytes > MAX_FRAME_BYTES) {
    const [k, v] = frames.entries().next().value as [string, Frame | null];
    frames.delete(k);
    frameBytes -= v?.rgba.length ?? 0;
  }
  return f;
}

/** Drop every cached file and frame (between maps of a long run). */
export function clearSprCache(): void {
  buffers.clear();
  frames.clear();
  frameBytes = 0;
}

function decodeFrame(path: string, index: number): Frame | null {
  const buf = sprBuffer(path);
  if (!buf) return null;
  const canvasW = buf.readUInt16LE(4), canvasH = buf.readUInt16LE(6);
  const count = buf.readUInt16LE(12), colors = buf.readUInt16LE(14);
  if (index < 0 || index >= count) return null;
  const pal = 32, table = pal + colors * 3, base = table + count * 8;
  const off = base + buf.readUInt32LE(table + index * 8), len = buf.readUInt32LE(table + index * 8 + 4);
  if (len < 8 || off + len > buf.length) return null;
  const w = buf.readInt16LE(off), h = buf.readInt16LE(off + 2), x = buf.readInt16LE(off + 4), y = buf.readInt16LE(off + 6);
  if (w <= 0 || h <= 0) return { x, y, w: 0, h: 0, rgba: EMPTY, canvasW, canvasH, count };
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
  return { x, y, w, h, rgba, canvasW, canvasH, count };
}

/** Alpha-composite `src` (w x h, sub-rect sx..sx+sw) onto an RGBA canvas at (dx, dy), clipped. */
export function blit(dst: Uint8Array, dw: number, dh: number, src: Uint8Array, w: number, h: number, dx: number, dy: number,
  sx = 0, sw = w): void {
  const x0 = Math.max(0, dx), y0 = Math.max(0, dy);
  const x1 = Math.min(dw, dx + sw), y1 = Math.min(dh, dy + h);
  for (let y = y0; y < y1; y++) {
    let s = ((y - dy) * w + (x0 - dx + sx)) * 4, d = (y * dw + x0) * 4;
    for (let x = x0; x < x1; x++, s += 4, d += 4) {
      const a = src[s + 3];
      if (!a) continue;
      if (a === 255) { dst[d] = src[s]; dst[d + 1] = src[s + 1]; dst[d + 2] = src[s + 2]; dst[d + 3] = 255; continue; }
      const ia = 255 - a, da = dst[d + 3];
      const oa = a + ((da * ia) / 255);
      dst[d] = (src[s] * a + (dst[d] * da * ia) / 255) / oa;
      dst[d + 1] = (src[s + 1] * a + (dst[d + 1] * da * ia) / 255) / oa;
      dst[d + 2] = (src[s + 2] * a + (dst[d + 2] * da * ia) / 255) / oa;
      dst[d + 3] = oa;
    }
  }
}
