import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { previewAssets } from '../tools/map-creator/PreviewAssets.js';
import { JX_ASSOC, JX_DEFAULT_LOOK, JX_PARTS, JX_SHADOWS, JX_SHEETS, NPC_SHEETS, NPC_SHADOWS } from '../apps/client/src/art/jx/data.gen.js';
import { MONSTERS } from '../packages/shared/src/monsters/monsters.js';
test('preview uses original sprite sizes, layered player, shadows and real monsters; serves only referenced sheets', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-preview-'));
  const put = async (key: string) => { const file = path.join(dir, `${key}.webp`); await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, 'fixture'); };
  try {
    for (const action of ['stand', 'run'] as const) {
      const column = JX_ASSOC.m[0][0][action]!;
      for (const [part, row] of Object.entries({ 0: JX_DEFAULT_LOOK.helm, 1: JX_DEFAULT_LOOK.helm, 4: JX_DEFAULT_LOOK.armor, 5: JX_DEFAULT_LOOK.armor, 6: JX_DEFAULT_LOOK.armor, 7: JX_DEFAULT_LOOK.armor, 8: 0, 9: 0 })) {
        const key = JX_PARTS.m[Number(part)]?.[row]?.[column]; if (key) await put(key);
      }
      if (JX_SHADOWS.m[column]) await put(JX_SHADOWS.m[column]);
    }
    const monster = Object.values(MONSTERS).find(m => !m.boss && !m.dummy && NPC_SHEETS[m.sprite]?.stand)!;
    const body = NPC_SHEETS[monster.sprite].stand!; await put(body);
    if (NPC_SHADOWS[body]) await put(NPC_SHADOWS[body]);
    const { data, files } = previewAssets(dir);
    assert.equal(data.player.scale, 1); assert.equal(data.monsters[0].name, monster.name);
    assert.deepEqual(data.monsters[0].stand.layers[0].meta, JX_SHEETS[body]);
    assert.ok(data.player.stand.layers.some(l => l.part === 5)); assert.ok(data.player.run.shadow);
    assert.ok(data.player.stand.layers.length > 1); assert.deepEqual(data.foot, [160, 202]);
    assert.equal(data.sheets.length, files.length); assert.equal(new Set(files).size, files.length);
    assert.ok(files.every(f => f.startsWith(dir + path.sep) && f.endsWith('.webp')));
    assert.ok(data.sheets.every((url, i) => url === `/api/preview/sheet/${i}`));
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
test('preview reports missing game sprites instead of displaying fake figures', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jx-preview-empty-'));
  try { assert.throws(() => previewAssets(dir), /Thiếu hình chơi thử/); }
  finally { await fs.rm(dir, { recursive: true, force: true }); }
});
