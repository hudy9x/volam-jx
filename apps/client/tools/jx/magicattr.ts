import fs from 'node:fs';
import path from 'node:path';

/**
 * Magic attribute names by id (`lifemax_v` = 85, `allskill_v` = 139 …) as the original client's exe stores them
 * (the engine's MAGIC_ATTRIB_STRING table, compiled in). Read-only; nothing is copied into the repo.
 *
 * - The strings sit in reverse order right before "skill_begin" and end at "magic_end".
 * - One entry is missing from the binary (id 45, an unused item slot whose string the linker merged), so ids ≥ 45 are
 *   shifted by one; the gap is put back here.
 * - Checked 2026-11-12 against the Chinese row names of `settings/item/magicattrib_ge.txt` (85 生命 life, 101–105 resists,
 *   111 跑速 run speed, 126 外普 physical %, 139 +skill level, 146 会心 deadly strike, 166 命中 hit, 168–172 内X伤 internal
 *   damage …): **ids up to VERIFIED_MAX are right**. Above it the SHXT data uses newer attributes (格挡 block, 加深伤害,
 *   对金系伤害…) that this table does not describe — callers must not trust those names.
 */
export const VERIFIED_MAX = 176;

export function readMagicAttribNames(clientRoot: string): string[] {
  const files = fs.readdirSync(clientRoot).filter(f => /\.(exe|dll)$/i.test(f));
  const needle = Buffer.from('\0skill_begin\0', 'latin1');
  for (const f of files) {
    const buf = fs.readFileSync(path.join(clientRoot, f));
    const at = buf.indexOf(needle);
    if (at < 0) continue;
    // Walk backwards over NUL-terminated strings (with alignment padding) until "magic_end".
    const names: string[] = ['skill_begin'];
    let end = at;
    while (names.length < 400) {
      let e = end;
      while (e > 0 && buf[e - 1] === 0) e--;
      let s = e;
      while (s > 0 && buf[s - 1] >= 0x20 && buf[s - 1] < 0x7f) s--;
      const str = buf.toString('latin1', s, e);
      if (!str) break;
      names.push(str);
      if (str === 'magic_end') break;
      end = s - 1;
    }
    if (names[names.length - 1] !== 'magic_end' || names[44] !== 'item_usagetime_v') continue;
    names.splice(45, 0, '');
    return names;
  }
  throw new Error(`No magic attribute table (skill_begin … magic_end) in the exe / dll files of ${clientRoot}`);
}
