// Fallback lookup by PAK path hash: finds files whose name the extractor did not recover
// (they sit in data_extract/<pak>/_unnamed/<type>/<id>.<type>).
import fs from 'node:fs';
import path from 'node:path';
import { EXTRACT, resolveFile } from './source.js';

const gbkEncoder = (() => {
  // Node has no GBK encoder; build one from the decoder for the double-byte range.
  const dec = new TextDecoder('gbk');
  const map = new Map<string, number[]>();
  for (let hi = 0x81; hi <= 0xfe; hi++) for (let lo = 0x40; lo <= 0xfe; lo++) {
    if (lo === 0x7f) continue;
    const ch = dec.decode(new Uint8Array([hi, lo]));
    if (ch.length === 1 && ch !== '�' && !map.has(ch)) map.set(ch, [hi, lo]);
  }
  return (s: string): Uint8Array => {
    const out: number[] = [];
    for (const ch of s) {
      const c = ch.codePointAt(0)!;
      if (c < 0x80) out.push(c);
      else { const b = map.get(ch); if (b) out.push(...b); else out.push(0x3f); }
    }
    return new Uint8Array(out);
  };
})();

/** Kingsoft g_FileName2Id over the GBK bytes of a normalised path (leading "\", backslashes). */
export function jxHash(gamePath: string): number {
  let p = gamePath.replace(/\//g, '\\');
  if (!p.startsWith('\\')) p = '\\' + p;
  const bytes = gbkEncoder(p);
  let id = 0;
  for (let i = 0; i < bytes.length; i++) {
    let c = bytes[i] > 127 ? bytes[i] - 256 : bytes[i];
    if (c >= 65 && c <= 90) c += 32;
    // (id + (i+1)*c) % 0x8000000B, then * 0xFFFFFFEF, all mod 2^32
    const sum = (id + (i + 1) * c) >>> 0;
    const mod = Number(BigInt(sum) % 0x8000000bn);
    id = Number((BigInt(mod) * 0xffffffefn) & 0xffffffffn);
  }
  return (id ^ 0x12345678) >>> 0;
}

let byId: Map<number, string> | null = null;
function idIndex(): Map<number, string> {
  if (byId) return byId;
  byId = new Map();
  for (const pak of fs.readdirSync(EXTRACT)) {
    const manifest = path.join(EXTRACT, pak, '_manifest.tsv');
    if (!fs.existsSync(manifest)) continue;
    const lines = fs.readFileSync(manifest, 'utf8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split('\t');
      if (c.length < 10 || c[6] || c[5] !== 'ok') continue;
      byId.set(parseInt(c[0], 16) >>> 0, path.join(EXTRACT, pak, c[9].trim()));
    }
  }
  return byId;
}

/** Named lookup first, then by hash (unnamed files). */
export function resolveAny(gamePath: string): string | null {
  return resolveFile(gamePath) ?? idIndex().get(jxHash(gamePath)) ?? null;
}
