import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rankCharacters, rankingSnapshot } from '../apps/server/src/account/rankings.ts';
import { START_MONEY, type RankingEntry } from '@vltk/shared';
import type { CharacterRecord } from '../apps/server/src/account/db.ts';
const row = (id: string, level = 10, exp = 0, money = 0, faction = 'shaolin'): RankingEntry => ({ id, name: id, level, exp, money, faction });
test('level precedes exp, ties have a deterministic order; input is not mutated', () => {
  const input = [row('c', 10, 90), row('b', 11, 0), row('a', 11, 0)];
  assert.deepEqual(rankCharacters(input, 'level').map(r => r.id), ['a', 'b', 'c']);
  assert.equal(input[0].id, 'c');
  assert.deepEqual(rankCharacters([row('a', 10, 2), row('b', 10, 4)], 'level').map(r => r.id), ['b', 'a']);
});
test('wealth uses wallet, filters before top 100 and includes zero balances', () => {
  const input = Array.from({ length: 110 }, (_, i) => row(String(i), 10, 0, i, 'shaolin'));
  input.push(row('other', 10, 0, 0, 'emei'));
  assert.equal(rankCharacters(input, 'wealth').length, 100);
  assert.equal(rankCharacters(input, 'wealth')[0].money, 109);
  assert.deepEqual(rankCharacters(input, 'wealth', 'emei').map(r => r.id), ['other']);
});
test('snapshot overlays online values, retains offline and excludes non-character actors', () => {
  const records = [row('a', 10, 1, 20), row('b', 12, 4, 30)] as unknown as CharacterRecord[];
  const result = rankingSnapshot(records, [row('a', 15, 5, 300), row('monster', 999)]);
  assert.deepEqual(result.map(r => [r.id, r.level, r.money]), [['a', 15, 300], ['b', 12, 30]]);
  assert.equal(records[0].level, 10);
  assert.equal('owner' in result[0], false);
});
test('legacy missing wallet uses starter amount and explicit zero remains zero', () => {
  const a = { ...row('a'), money: undefined } as unknown as CharacterRecord;
  const b = row('b') as unknown as CharacterRecord;
  assert.deepEqual(rankingSnapshot([a, b], []).map(r => r.money), [START_MONEY, 0]);
});
test('HTTP endpoint requires authentication, validates filters and returns public ranked data', async () => {
  const { mkdtempSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const dir = mkdtempSync(join(tmpdir(), 'jx-rankings-'));
  process.env.DB_PATH = join(dir, 'db.json');
  process.env.AUTH_SECRET = 'rankings-test-only';
  const { default: express } = await import('express');
  const { registerRankingRoutes } = await import('../apps/server/src/account/rankingRoutes.ts');
  const { issueToken } = await import('../apps/server/src/account/auth.ts');
  const { db } = await import('../apps/server/src/account/db.ts');
  db.addUser({ username: 'tester', salt: '', hash: '', characters: [] });
  db.addCharacter({ ...row('test-character', 20, 5, 999), owner: 'tester', gender: 'male', mapId: 37, x: 0, y: 0 } as CharacterRecord);
  const app = express();
  registerRankingRoutes(app, () => [row('test-character', 21, 9, 1200)]);
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}/api/rankings`;
  const headers = { Authorization: `Bearer ${issueToken('tester')}` };
  try {
    assert.equal((await fetch(`${url}?kind=level`)).status, 401);
    assert.equal((await fetch(`${url}?kind=power`, { headers })).status, 400);
    assert.equal((await fetch(`${url}?kind=wealth&faction=invalid`, { headers })).status, 400);
    const result = await (await fetch(`${url}?kind=wealth`, { headers })).json();
    assert.equal(result.rows[0].money, 1200);
    assert.equal(result.rows[0].level, 21);
    assert.equal('owner' in result.rows[0], false);
    const empty = await (await fetch(`${url}?kind=level&faction=emei`, { headers })).json();
    assert.deepEqual(empty.rows, []);
    assert.equal(empty.updatedAt, result.updatedAt);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    db.flush();
    rmSync(dir, { recursive: true, force: true });
  }
});
