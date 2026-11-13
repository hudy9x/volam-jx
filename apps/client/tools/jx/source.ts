// Read-only access to the unpacked original client (jx-origin/data_extract).
// Resolves game paths ("\spr\npcres\man\x.spr") to the copy the game actually uses (PAK priority),
// and reads its GBK/TCVN3 tab-separated tables.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
/** Client root; override with JX_CLIENT=/path/to/jx-origin. */
export const CLIENT_ROOT = path.resolve(process.env.JX_CLIENT ?? path.join(HERE, '../../../../../jx-origin'));
export const EXTRACT = path.join(CLIENT_ROOT, 'data_extract');

/** Normalise a game path: backslashes, leading "\", lowercase ASCII. */
export function gamePath(p: string): string {
  let s = p.trim().replace(/\//g, '\\');
  if (!s.startsWith('\\')) s = '\\' + s;
  return s.replace(/[A-Z]/g, c => c.toLowerCase());
}

let index: Map<string, string> | null = null;

/** game path -> absolute file on disk (winning copy only: `overridden_by` empty). */
function fileIndex(): Map<string, string> {
  if (index) return index;
  index = new Map();
  for (const pak of fs.readdirSync(EXTRACT)) {
    const manifest = path.join(EXTRACT, pak, '_manifest.tsv');
    if (!fs.existsSync(manifest)) continue;
    const lines = fs.readFileSync(manifest, 'utf8').split('\n');
    for (let i = 1; i < lines.length; i++) {
      const c = lines[i].split('\t');
      if (c.length < 10 || c[6] || !c[8] || c[5] !== 'ok') continue;
      index.set(gamePath(c[8]), path.join(EXTRACT, pak, c[9].trim()));
    }
  }
  return index;
}

export function resolveFile(p: string): string | null {
  return fileIndex().get(gamePath(p)) ?? null;
}

export function readGameFile(p: string): Buffer {
  const file = resolveFile(p);
  if (!file) throw new Error(`Not in client: ${p}`);
  return fs.readFileSync(file);
}

/** All indexed game paths starting with a prefix (normalised). */
export function listGameFiles(prefix: string): string[] {
  const want = gamePath(prefix);
  return [...fileIndex().keys()].filter(k => k.startsWith(want));
}

const gbk = new TextDecoder('gbk');

/** Tab-separated table: header row + rows. Cells decoded as GBK (TCVN3 text survives as latin-ish garbage; use tcvn3()). */
export function readTable(p: string, encoding: 'gbk' | 'latin1' = 'gbk'): { header: string[]; rows: string[][] } {
  const buf = readGameFile(p);
  const text = encoding === 'gbk' ? gbk.decode(buf) : buf.toString('latin1');
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  return { header: lines[0].split('\t').map(s => s.trim()), rows: lines.slice(1).map(l => l.split('\t')) };
}

/** Same as readTable but lets callers look cells up by column name. */
export function readRecords(p: string, encoding: 'gbk' | 'latin1' = 'gbk'): Record<string, string>[] {
  const { header, rows } = readTable(p, encoding);
  return rows.map(r => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])));
}

// ---------------- TCVN3 (ABC) -> Unicode ----------------
const TCVN3: Record<string, string> = {
  '¸': 'á', 'µ': 'à', '¶': 'ả', '·': 'ã', '¹': 'ạ', '¨': 'ă', '¾': 'ắ', '»': 'ằ', '¼': 'ẳ', '½': 'ẵ', 'Æ': 'ặ',
  '©': 'â', 'Ê': 'ấ', 'Ç': 'ầ', 'È': 'ẩ', 'É': 'ẫ', 'Ë': 'ậ', '®': 'đ', 'Ð': 'é', 'Ì': 'è', 'Î': 'ẻ', 'Ï': 'ẽ',
  'Ñ': 'ẹ', 'ª': 'ê', 'Õ': 'ế', 'Ò': 'ề', 'Ó': 'ể', 'Ô': 'ễ', 'Ö': 'ệ', 'Ý': 'í', '×': 'ì', 'Ø': 'ỉ', 'Ü': 'ĩ',
  'Þ': 'ị', 'ã': 'ó', 'ß': 'ò', 'á': 'ỏ', 'â': 'õ', 'ä': 'ọ', '«': 'ô', 'è': 'ố', 'å': 'ồ', 'æ': 'ổ', 'ç': 'ỗ',
  'é': 'ộ', '¬': 'ơ', 'í': 'ớ', 'ê': 'ờ', 'ë': 'ở', 'ì': 'ỡ', 'î': 'ợ', 'ó': 'ú', 'ï': 'ù', 'ñ': 'ủ', 'ò': 'ũ',
  'ô': 'ụ', '­': 'ư', 'ø': 'ứ', 'õ': 'ừ', 'ö': 'ử', '÷': 'ữ', 'ù': 'ự', 'ý': 'ý', 'ú': 'ỳ', 'û': 'ỷ',
  'ü': 'ỹ', 'þ': 'ỵ',
  // Upper-case base letters (TCVN 5712 VN3): A1–A7 = Ă Â Ê Ô Ơ Ư Đ ("¤ng" = Ông, "¢m" = Âm, "¦ng" = Ưng).
  '¡': 'Ă', '¢': 'Â', '£': 'Ê', '¤': 'Ô', '¥': 'Ơ', '¦': 'Ư', '§': 'Đ',
};

/** Decode a TCVN3 string that was read as latin1. */
export function tcvn3(latin1: string): string {
  let out = '';
  for (const ch of latin1) out += TCVN3[ch] ?? ch;
  // Capitalise the first letter of each word like the game UI does for names.
  return out.trim();
}
