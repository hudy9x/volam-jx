const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');
function load(file, globals = {}) {
  const code = transformSync(fs.readFileSync(file, 'utf8'), { loader: 'ts', format: 'cjs' }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    assert.ok(name in globals, `unexpected import ${name}`);
    return globals[name];
  }});
  return module.exports;
}
const sounds = load('apps/client/src/game/audio/sounds.gen.ts');
const played = [];
let skill;
const { fxSound } = load('apps/client/src/game/audio/fxSounds.ts', {
  '@vltk/shared': { getSkill: () => skill },
  './Audio': { audio: { play: (...args) => played.push(args) } },
  './sounds.gen': sounds,
});
function cast(id, gender, mounted = false) {
  played.length = 0;
  fxSound({ t: 'cast', id: 'caster', skill: id }, () => ({kind: 'player', gender, mounted, x: 10, y: 20}));
  assert.equal(played.length, 1);
  return played[0][0];
}
test('Hoa Son missing male casts use male action voice, female casts keep original voice', () => {
  skill = { melee: false, weapon: 0 };
  for (const id of [1363, 1364, 1368, 1369]) {
    assert.equal(sounds.SKILL_CAST[id][0], '');
    assert.equal(cast(id, 'male'), sounds.PLAYER_SND.m.attack);
    assert.equal(cast(id, 'female'), 'sound/skill/sound_k009');
  }
});
test('gender-specific Hoa Son casts remain unchanged', () => {
  skill = { melee: true, weapon: 0 };
  for (const id of [1347, 1351, 1355, 1360, 1361, 1362, 1372]) {
    assert.equal(cast(id, 'male'), 'sound/skill/sound_k003');
    assert.equal(cast(id, 'female'), 'sound/skill/sound_k008');
  }
});
test('missing cast voice keeps melee and mounted action fallbacks', () => {
  skill = { melee: true, weapon: 0 };
  assert.equal(cast(1363, 'male'), sounds.PLAYER_SND.m.cut);
  assert.equal(cast(1363, 'male', true), sounds.PLAYER_SND.m.rideCut);
});
