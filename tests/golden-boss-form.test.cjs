const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync(new URL('../tools/boss/public/app.js', `file://${__filename}`), 'utf8');
const validation = source.slice(source.indexOf('function validateInputs()'), source.indexOf('async function saveConfig()'));

function field(combat, value, min = 0, max = 2_000_000_000) {
  return {
    value, dataset: { combat }, id: '', error: '',
    closest() { return null; },
    setCustomValidity(message) { this.error = message; },
    reportValidity() {
      return !this.error && (this.value === '' || (Number.isInteger(Number(this.value)) && Number(this.value) >= min && Number(this.value) <= max));
    },
  };
}

function validate(fields) {
  const context = vm.createContext({
    renderDropRatesSummary() {},
    document: { querySelectorAll() { return fields; } },
    state: { settings: { spawnMode: 'continuous' } },
  });
  vm.runInContext(validation, context);
  return context.validateInputs();
}

test('saving one custom EXP boss permits other bosses to use blank defaults', () => {
  const fields = [field('exp:1', '6000000'), field('exp:2', ''), field('exp:3', '0'), field('hp:2', '', 1)];
  assert.equal(validate(fields), true);
  // Clear any previous invalid state when using the default again.
  fields[1].error = 'Vui lòng nhập giá trị.';
  assert.equal(validate(fields), true);
});

test('EXP limits remain enforced, including zero and the upper bound', () => {
  for (const value of ['0', '2000000000', '']) assert.equal(validate([field('exp:1', value)]), true);
  for (const value of ['-1', '100.5', '2000000001']) assert.equal(validate([field('exp:1', value)]), false);
});

test('required combat fields still block saving when blank', () => {
  for (const key of ['attackCooldown', 'damagePercent', 'leash']) {
    assert.equal(validate([field(`${key}:1`, '')]), false);
  }
});

test('UI saves before applying, preserves drafts on failure and permits retry', async () => {
  const elements = Object.fromEntries(['save-status', 'btn-save', 'btn-reset', 'btn-apply'].map(id => [id, {}]));
  const calls = [];
  let failSave = false;
  let failApply = false;
  const main = { inert: false };
  const state = { settings: { spawnMode: 'continuous' }, bosses: [{ id: 1, name: 'Boss', exp: 6_000_000 }, { id: 2 }] };
  const context = vm.createContext({
    state, originalSnapshot: '{}', saving: false, applying: false,
    $: id => elements[id], renderHeaderStats() {}, renderDropRatesSummary() {},
    document: { querySelectorAll: () => [field('exp:1', '6000000'), field('exp:2', '')], querySelector: () => main },
    async fetch(url, options) {
      calls.push({ url, options });
      const failed = url === 'api/config' ? failSave : failApply;
      return { ok: !failed, async json() { return failed ? { error: 'Test failure' } : { ok: true }; } };
    },
  });
  const markDirty = source.slice(source.indexOf('function markDirty()'), source.indexOf('\n}', source.indexOf('function markDirty()')) + 2);
  const flow = source.slice(source.indexOf('async function saveConfig()'), source.indexOf('function renderAll()'));
  vm.runInContext(`${validation}\n${markDirty}\n${flow}`, context);
  await context.applyConfig();
  assert.equal(calls.length, 0, 'unsaved drafts cannot be applied');
  failSave = true;
  await context.saveConfig();
  assert.equal(elements['btn-apply'].disabled, true);
  assert.equal(main.inert, false);
  assert.equal(state.bosses[0].exp, 6_000_000);
  failSave = false;
  await context.saveConfig();
  assert.equal(elements['btn-apply'].disabled, false);
  assert.equal(JSON.parse(calls.at(-1).options.body).bosses[1].exp, undefined);
  failApply = true;
  await context.applyConfig();
  assert.match(elements['save-status'].textContent, /Test failure/);
  assert.equal(elements['btn-apply'].disabled, false);
  failApply = false;
  await context.applyConfig();
  assert.match(elements['save-status'].textContent, /Game đã xác nhận/);
  assert.equal(main.inert, false);
  assert.deepEqual(calls.map(c => c.url), ['api/config', 'api/config', 'api/apply', 'api/apply']);
});
