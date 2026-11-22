// Direct read-only reader for Kingsoft JX1 .pak archives (updatejx15.pak, updatejx16.pak, ...).
// Supports index tables anchored at EOF (real_idx_off = file_size - count * 16), UCL NRV2B (method 0x20)
// and raw entries (method 0), plus automatic SPR magic alignment for patched archives whose offsets shifted.
import fs from 'node:fs';
import { jxHash } from './hashindex.js';

export interface PakEntry {
  id: number;
  off: number;
  orig: number;
  comp: number;
  method: number;
}

/** UCL NRV2B 8-bit decompressor (Kingsoft JX1 method 0x20). */
export function uclDecompress(src: Buffer, origSize: number): Buffer {
  const dst = Buffer.alloc(origSize);
  let ilen = 0, olen = 0, bb = 0, bc = 0, lastMOff = 1;
  const getBit = () => {
    if (bc === 0) {
      if (ilen >= src.length) return 0;
      bb = src[ilen++];
      bc = 8;
    }
    bc--;
    return (bb >>> bc) & 1;
  };
  while (ilen < src.length) {
    while (getBit()) {
      if (olen >= origSize || ilen >= src.length) return dst;
      dst[olen++] = src[ilen++];
    }
    let mOff = 1;
    for (;;) {
      mOff = (mOff << 1) | getBit();
      if (getBit()) break;
    }
    if (mOff === 2) {
      mOff = lastMOff;
    } else {
      if (ilen >= src.length) break;
      mOff = ((mOff - 3) << 8) | src[ilen++];
      if ((mOff >>> 0) === 0xffffffff) break;
      mOff = (mOff + 1) >>> 0;
      lastMOff = mOff;
    }
    let mLen = getBit();
    mLen = (mLen << 1) | getBit();
    if (mLen === 0) {
      mLen = 1;
      do {
        mLen = (mLen << 1) | getBit();
      } while (!getBit());
      mLen += 2;
    }
    mLen += mOff > 0xd00 ? 1 : 0;
    let mPos = olen - mOff;
    if (mPos < 0) break;
    if (olen < origSize) dst[olen++] = dst[mPos++];
    do {
      if (olen >= origSize) break;
      dst[olen++] = dst[mPos++];
    } while (--mLen > 0);
  }
  return dst;
}

const SPR_MAGIC = Buffer.from('SPR\0', 'latin1');
const RIFF_MAGIC = Buffer.from('RIFF', 'latin1');

export class PakReader {
  private fd: number;
  private entries = new Map<number, PakEntry>();

  constructor(public readonly filePath: string) {
    this.fd = fs.openSync(filePath, 'r');
    const st = fs.fstatSync(this.fd);
    const hdr = Buffer.alloc(32);
    fs.readSync(this.fd, hdr, 0, 32, 0);
    if (hdr.toString('latin1', 0, 4) !== 'PACK') {
      throw new Error(`Not a JX1 PAK archive: ${filePath}`);
    }
    const count = hdr.readUInt32LE(4);
    const realIdxOff = st.size - count * 16;
    const idx = Buffer.alloc(count * 16);
    fs.readSync(this.fd, idx, 0, idx.length, realIdxOff);
    for (let i = 0; i < count; i++) {
      const o = i * 16;
      const id = idx.readUInt32LE(o);
      this.entries.set(id, {
        id,
        off: idx.readUInt32LE(o + 4),
        orig: idx.readUInt32LE(o + 8),
        comp: idx.readUInt32LE(o + 12) & 0x00ffffff,
        method: idx[o + 15],
      });
    }
  }

  has(gamePath: string): boolean {
    return this.entries.has(jxHash(gamePath));
  }

  /** Read and decompress an .spr entry, handling the 0..48 byte offset shift in patched updatejx15/16 archives. */
  readSpr(gamePath: string): Buffer | null {
    const e = this.entries.get(jxHash(gamePath));
    if (!e) return null;
    const probe = Buffer.alloc(96);
    const readLen = fs.readSync(this.fd, probe, 0, probe.length, e.off);
    const p = probe.subarray(0, readLen).indexOf(SPR_MAGIC);
    if (p < 0) {
      // Fallback: try reading directly at e.off
      const raw = Buffer.alloc(e.comp);
      fs.readSync(this.fd, raw, 0, e.comp, e.off);
      return e.method === 0x20 ? uclDecompress(raw, e.orig) : raw;
    }
    const startOff = e.method === 0x20 ? e.off + p - 1 : e.off + p;
    const raw = Buffer.alloc(e.comp);
    fs.readSync(this.fd, raw, 0, e.comp, startOff);
    return e.method === 0x20 ? uclDecompress(raw, e.orig) : raw;
  }

  /** Read and decompress a .wav entry (aligning RIFF header when offsets shifted in patched PAKs). */
  readWav(gamePath: string): Buffer | null {
    const e = this.entries.get(jxHash(gamePath));
    if (!e) return null;
    const probe = Buffer.alloc(96);
    const readLen = fs.readSync(this.fd, probe, 0, probe.length, e.off);
    const p = probe.subarray(0, readLen).indexOf(RIFF_MAGIC);
    const startOff = p >= 0 ? (e.method === 0x20 ? e.off + p - 1 : e.off + p) : e.off;
    const raw = Buffer.alloc(e.comp);
    fs.readSync(this.fd, raw, 0, e.comp, startOff);
    const out = e.method === 0x20 ? uclDecompress(raw, e.orig) : raw;
    return out.subarray(0, 4).equals(RIFF_MAGIC) ? out : null;
  }

  close(): void {
    fs.closeSync(this.fd);
  }
}
