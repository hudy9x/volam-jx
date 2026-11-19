const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { transformSync } = require('esbuild');

function loadModule(filePath) {
  const code = transformSync(fs.readFileSync(filePath, 'utf8'), {
    loader: 'ts',
    format: 'cjs',
  }).code;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, Math });
  return mod.exports;
}

const elementBadges = loadModule('apps/client/src/game/actors/elementBadges.ts');

function makeObject(extra = {}) {
  const state = {
    visible: true,
    destroyed: false,
    text: '',
    textureKey: '',
    style: {},
    scaleX: 1,
    x: 0,
    y: 0,
    displayWidth: 80,
    displayHeight: 16,
    ...extra,
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
        if (k === 'setTexture') o.textureKey = args[0];
        if (k === 'setDisplaySize') { o.displayWidth = args[0]; o.displayHeight = args[1]; }
        return r;
      };
    },
  });
}

function makeFakeContext() {
  const ops = [];
  const grad = { addColorStop: (...a) => ops.push(['stop', ...a]) };
  return {
    ops,
    clearRect: (...a) => ops.push(['clearRect', ...a]),
    beginPath: () => ops.push(['beginPath']),
    arc: (...a) => ops.push(['arc', ...a]),
    ellipse: (...a) => ops.push(['ellipse', ...a]),
    fill: () => ops.push(['fill']),
    stroke: () => ops.push(['stroke']),
    moveTo: (...a) => ops.push(['moveTo', ...a]),
    lineTo: (...a) => ops.push(['lineTo', ...a]),
    bezierCurveTo: (...a) => ops.push(['bezierCurveTo', ...a]),
    save: () => ops.push(['save']),
    restore: () => ops.push(['restore']),
    translate: (...a) => ops.push(['translate', ...a]),
    rotate: (...a) => ops.push(['rotate', ...a]),
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
  };
}

function makeScene() {
  const createdTextures = new Map();
  return {
    createdTextures,
    time: { now: 0 },
    cameras: { main: { worldView: {} } },
    textures: {
      exists: key => createdTextures.has(key),
      createCanvas: (key, w, h) => {
        const ctx = makeFakeContext();
        let refreshed = false;
        const tex = { key, w, h, ctx, getContext: () => ctx, refresh: () => { refreshed = true; }, get refreshed() { return refreshed; } };
        createdTextures.set(key, tex);
        return tex;
      },
    },
    add: {
      zone: () => makeObject(),
      text: () => makeObject(),
      graphics: () => makeObject(),
      image: (x, y, key) => makeObject({ x, y, textureKey: key, displayWidth: 18, displayHeight: 18 }),
    },
  };
}

const actorCode = transformSync(fs.readFileSync('apps/client/src/game/actors/ActorView.ts', 'utf8'), {
  loader: 'ts',
  format: 'esm',
}).code
  .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];\n/gm, '')
  .replace(/export\s*\{[\s\S]*?\};?\s*$/, '');

const ActorView = vm.runInNewContext(actorCode + ';ActorView', {
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
  isElement: elementBadges.isElement,
  ensureElementBadgeTexture: elementBadges.ensureElementBadgeTexture,
});

const ELEMENTS = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

for (const boss of [0, 1, 2]) {
  for (const series of ELEMENTS) {
    test(`monster boss=${boss} series=${series}: renders procedural gem badge to the left of name`, () => {
      const scene = makeScene();
      const state = { kind: 'monster', boss, series, hp: 100, maxHp: 100, anim: 'idle', animSeq: 0, x: 200, y: 300, dir: 0, name: 'Quái', level: 50, sprite: 'ani052' };
      const view = new ActorView(scene, 'm1', state, false, false);
      view.update(0.05);

      const expectedKey = `element-badge:${series}`;
      assert.equal(scene.createdTextures.has(expectedKey), true, 'creates procedural canvas texture');
      const tex = scene.createdTextures.get(expectedKey);
      assert.equal(tex.w, 36);
      assert.equal(tex.h, 36);
      assert.equal(tex.refreshed, true, 'refreshes canvas texture');
      assert.ok(tex.ctx.ops.some(op => op[0] === 'stroke'), 'draws vector Hanzi glyph');

      assert.ok(view.elementBadge, 'creates badge image');
      assert.equal(view.elementBadge.visible, true);
      assert.equal(view.elementBadge.textureKey, expectedKey);
      assert.equal(view.elementBadge.displayWidth, 18);
      assert.ok(view.elementBadge.x + view.elementBadge.displayWidth / 2 < view.label.x - view.label.displayWidth / 2, 'badge sits to the left of name');
      assert.ok(view.elementBadge.y < view.label.y && view.elementBadge.y > view.label.y - view.label.displayHeight, 'badge vertically aligned with name');

      // Hides on death
      state.hp = 0;
      view.update(0.05);
      assert.equal(view.elementBadge.visible, false, 'hides on death');

      // Shows again on revive, hides on culling, and destroys cleanly
      state.hp = 100;
      view.update(0.05);
      assert.equal(view.elementBadge.visible, true);
      view.jx.intersects = () => false;
      view.update(0.05);
      assert.equal(view.elementBadge.visible, false, 'hides when culled');
      view.destroy();
      assert.equal(view.elementBadge.destroyed, true, 'destroyed with actor');
    });
  }
}

test('players and NPCs do not create element badge', () => {
  for (const kind of ['player', 'npc']) {
    const scene = makeScene();
    const state = { kind, boss: 0, series: 'hoa', hp: 100, maxHp: 100, anim: 'idle', animSeq: 0, x: 200, y: 300, dir: 0, name: 'Người', level: 10, sprite: 'npc01', pk: 0, camp: 'new' };
    const view = new ActorView(scene, 'p1', state, false, false);
    view.update(0.05);
    assert.equal(view.elementBadge, null, `${kind} should not create element badge`);
    assert.equal(view.label.x, 200, `${kind} label remains centered`);
  }
});
