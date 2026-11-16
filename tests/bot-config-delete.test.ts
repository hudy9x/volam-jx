import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { BOT_ROSTER } from '../packages/shared/src/index.js';
import { ConfigStore } from '../tools/bots/ConfigStore.js';
import { RunManager } from '../tools/bots/RunManager.js';

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jx-config-delete-'));
  const store = new ConfigStore(dir);
  return { dir, store, remove: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
type Deletable = ConfigStore & { remove(kind: string, name: string): void };

test('deleting saved templates and scenarios removes only the chosen file and survives reload', () => {
  const r = fixture();
  try {
    r.store.save('templates', 'one', { title: 'Một' }); r.store.save('templates', 'two', { title: 'Hai' });
    r.store.save('scenarios', 'one', { title: 'Kịch bản' });
    const store = r.store as Deletable;
    store.remove('templates', 'one');
    assert.deepEqual(new ConfigStore(r.dir).list().templates, ['two']);
    assert.deepEqual(r.store.list().scenarios, ['one']);
    assert.equal((r.store.read('templates', 'two') as any).title, 'Hai');
    store.remove('scenarios', 'one'); assert.deepEqual(r.store.list().scenarios, []);
    assert.throws(() => store.remove('templates', 'one'), /ENOENT/);
  } finally { r.remove(); }
});

test('a referenced setup cannot be deleted until its saved scenario is removed; a bad scenario fails closed', () => {
  const r = fixture();
  try {
    r.store.save('templates', 'setup', {});
    r.store.save('scenarios', 'dependent', { title: 'Luyện công', initialSetup: [{ template: 'setup', usernames: ['botfixed_1'] }] });
    const store = r.store as Deletable;
    assert.throws(() => store.remove('templates', 'setup'), /Luyện công/);
    assert.ok(fs.existsSync(path.join(r.dir, 'templates/setup.json')));
    store.remove('scenarios', 'dependent');
    fs.writeFileSync(path.join(r.dir, 'broken.json'), '{');
    assert.throws(() => store.remove('templates', 'setup'), /broken/);
    store.remove('scenarios', 'broken'); store.remove('templates', 'setup');
    assert.deepEqual(store.list().templates, []);
  } finally { r.remove(); }
});

test('deletion rejects traversal, extra path fragments, invalid kind and missing names without deleting anything', () => {
  const r = fixture();
  try {
    r.store.save('templates', 'undefined', {}); const store = r.store as Deletable;
    for (const name of ['../secret', 'nested/file', '', undefined, null]) {
      assert.throws(() => store.remove('templates', name as string));
    }
    assert.throws(() => store.remove('other', 'undefined'));
    assert.deepEqual(r.store.list().templates, ['undefined']);
  } finally { r.remove(); }
});

test('a scenario is reserved throughout asynchronous start preparation and releases every failed start', async () => {
  const r = fixture(); const originalFetch = globalThis.fetch;
  const rejects: ((e: Error) => void)[] = [];
  try {
    r.store.save('scenarios', 'active', {});
    const manager = new RunManager(path.resolve('tools/bots'), r.dir) as RunManager & { usesScenario(name: string): boolean };
    globalThis.fetch = (() => new Promise((_resolve, reject) => rejects.push(reject))) as typeof fetch;
    const one = manager.start('active', [BOT_ROSTER[0].id], 'http://localhost:2568');
    const two = manager.start('active', [BOT_ROSTER[1].id], 'http://localhost:2568');
    // Attach rejection handlers before releasing requests.
    const failedOne = assert.rejects(one, /fixture/), failedTwo = assert.rejects(two, /fixture/);
    assert.equal(manager.usesScenario('active'), true);
    rejects[0](new Error('fixture')); await failedOne;
    assert.equal(manager.usesScenario('active'), true, 'a second in-flight start still reserves the file');
    rejects[1](new Error('fixture')); await failedTwo;
    assert.equal(manager.usesScenario('active'), false);
  } finally {
    for (const reject of rejects) reject(new Error('fixture cleanup'));
    globalThis.fetch = originalFetch; r.remove();
  }
});

test('real HTTP config deletion validates origin/path, refuses running scenarios and preserves files on conflicts', async () => {
  const r = fixture();
  const { handleConfigRequest } = await import('../tools/bots/ConfigRoutes.js');
  const runs = { usesScenario: (name: string) => name === 'running' };
  const server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url!, 'http://localhost').pathname);
    if (!handleConfigRequest(req, res, pathname, r.store, runs)) { res.writeHead(404); res.end(); }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as import('node:net').AddressInfo).port}`;
  try {
    r.store.save('templates', 'setup', {}); r.store.save('scenarios', 'running', {});
    r.store.save('scenarios', 'saved', { initialSetup: [{ template: 'setup', usernames: ['botfixed_1'] }] });
    const del = (url: string, origin = base) => fetch(base + url, { method: 'DELETE', headers: { Origin: origin } });
    assert.equal((await del('/api/config/templates/setup', 'https://other.example')).status, 403);
    assert.equal((await del('/api/config/scenarios/running')).status, 409);
    assert.equal((await del('/api/config/templates/setup')).status, 409);
    for (const url of ['/api/config/templates', '/api/config/templates/setup/extra', '/api/config/templates/..%2fsecret']) {
      assert.equal((await del(url)).status, 400);
    }
    assert.equal((await del('/api/config/scenarios/saved')).status, 200);
    assert.equal((await del('/api/config/templates/setup')).status, 200);
    assert.equal((await del('/api/config/templates/setup')).status, 404);
    assert.deepEqual(r.store.list().templates, []); assert.deepEqual(r.store.list().scenarios, ['running']);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve())); r.remove();
  }
});
