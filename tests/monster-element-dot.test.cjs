const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

function makeObject() {
  const calls = [];
  const state = {
    visible: true,
    destroyed: false,
    text: '',
    style: {},
    scaleX: 1,
    x: 0,
    y: 0,
    displayWidth: 80,
    displayHeight: 16,
    calls,
  };
  return new Proxy(state, {
    get(o, k, r) {
      if (k in o) return o[k];
      return (...args) => {
        if (k === 'setVisible') o.visible = args[0];
        if (k === 'destroy') o.destroyed = true;
        if (k === 'setText') o.text = args[0];
        if (k === 'setColor') o.style.color = args[0];
        if (k === 'setScale') o.scaleX = args[0];
        if (k === 'setPosition') { o.x = args[0]; o.y = args[1]; }
        if (k === 'clear') o.calls.length = 0;
        if (k === 'fillStyle' || k === 'lineStyle' || k === 'fillCircle' || k === 'strokeCircle' || k === 'fillRect') {
          o.calls.push([k, ...args]);
        }
        return r;
      };
    },
  });
}

const code = transformSync(fs.readFileSync('apps/client/src/game/actors/ActorView.ts', 'utf8'), {
  loader: 'ts',
  format: 'esm',
}).code
  .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm, '')
  .replace(/export\s*\{[\s\S]*?\};?\s*$/, '');

const ActorView = vm.runInNewContext(code + ';ActorView', {
  makeLook: () => ({}),
  lookKey: () => 'look',
  hasNpc: () => true,
  JxSprite: class { height = 80; framesOf() { return 8; } intersects() { return true; } render() { return true; } hide() {} destroy() {} },
  StateDecor: class { update() {} destroy() {} },
  ui: x => x,
  uiPx: x => x,
  textResolution: () => 2,
  zoomPlate: () => ({ textScale: 1, gapY: 7, barW: 44, barBossW: 70, barH: 4, zoom: 1 }),
  controlAppearance: () => ({ loopRate: 1, tint: 0xffffff }),
  CAMP_COLORS: { new: '#fff' },
  resolveSpeed: () => ({ cycleMs: 800 }),
  trackBasePercent: () => 100,
  getActiveSpeedConfig: () => ({}),
  SPEED: { basePercent: 100 },
  FRAME_MS: 1000 / 18,
});

const EXPECTED_COLORS = {
  kim: 0xffdf4a,
  moc: 0x3fd65c,
  thuy: 0x3ea4ff,
  hoa: 0xff3b30,
  tho: 0xb5743a,
};

for (const boss of [0, 1, 2]) {
  for (const [series, expectedColor] of Object.entries(EXPECTED_COLORS)) {
    test(`monster boss=${boss} series=${series}: draws colored circle to the left of name`, () => {
      const scene = { time: { now: 0 }, cameras: { main: { worldView: {} } }, add: { zone: makeObject, text: makeObject, graphics: makeObject } };
      const state = { kind: 'monster', boss, series, hp: 100, maxHp: 100, anim: 'idle', animSeq: 0, x: 200, y: 300, dir: 0, name: 'Quái', level: 50, sprite: 'ani052' };
      const view = new ActorView(scene, 'm1', state, false, false);
      view.update(0.05);

      const fillIdx = view.bar.calls.findIndex(c => c[0] === 'fillCircle');
      assert.notEqual(fillIdx, -1, 'should draw filled circle');
      const [, dotX, dotY, dotR] = view.bar.calls[fillIdx];
      const fillStyleBefore = view.bar.calls[fillIdx - 1];
      assert.equal(fillStyleBefore[0], 'fillStyle');
      assert.equal(fillStyleBefore[1], expectedColor, `series ${series} color`);
      const strokeCall = view.bar.calls.find(c => c[0] === 'strokeCircle');
      assert.ok(strokeCall, 'should draw dark outline around circle');
      assert.ok(dotX + dotR < view.label.x - view.label.displayWidth / 2, 'circle must sit to the left of the name label');
      assert.ok(dotY < view.label.y && dotY > view.label.y - view.label.displayHeight, 'circle vertically aligned with name');

      // Hides when dead
      state.hp = 0;
      view.update(0.05);
      assert.equal(view.bar.calls.some(c => c[0] === 'fillCircle'), false, 'circle hidden on death');
    });
  }
}

test('players and NPCs do not draw monster element circle', () => {
  for (const kind of ['player', 'npc']) {
    const scene = { time: { now: 0 }, cameras: { main: { worldView: {} } }, add: { zone: makeObject, text: makeObject, graphics: makeObject } };
    const state = { kind, boss: 0, series: 'hoa', hp: 100, maxHp: 100, anim: 'idle', animSeq: 0, x: 200, y: 300, dir: 0, name: 'Người', level: 10, sprite: 'npc01', pk: 0, camp: 'new' };
    const view = new ActorView(scene, 'p1', state, false, false);
    view.update(0.05);
    assert.equal(view.bar.calls.some(c => c[0] === 'fillCircle'), false, `${kind} should not draw element dot`);
    assert.equal(view.label.x, 200, `${kind} label remains centered`);
  }
});
