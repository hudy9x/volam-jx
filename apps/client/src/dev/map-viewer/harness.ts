// Dev-only viewer for the generated original maps (maptest.html). Not part of the game bundle.
import Phaser from 'phaser';
import { MAPS, canStandAt, getGrid, registerNav, type NavFile } from '@vltk/shared';
import { MapView } from '../../game/map/MapView';

const q = new URLSearchParams(location.search);
const meta = MAPS[Number(q.get('map') ?? 37)];
const start = { x: Number(q.get('x') ?? meta.raw.entry.x), y: Number(q.get('y') ?? meta.raw.entry.y) };

class Viewer extends Phaser.Scene {
  private map!: MapView;
  private marker!: Phaser.GameObjects.Container;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private t0 = performance.now();
  constructor() { super('viewer'); }

  create(): void {
    const { width, height } = meta.raw.size;
    this.cameras.main.setBounds(0, 0, width, height).setBackgroundColor('#000');
    // Stand-in actor (40x90 box, feet at its origin) to check occlusion: depth = feet y, like ActorView.
    const body = this.add.rectangle(0, -45, 40, 90, 0xff3366, 0.85).setStrokeStyle(2, 0xffffff);
    this.marker = this.add.container(start.x, start.y, [body]);
    this.cameras.main.centerOn(start.x, start.y);
    this.map = new MapView(this, meta);
    (window as any).__map = { scene: this, view: this.map, marker: this.marker, ready: false };
    this.map.ready(start.x, start.y).then(() => {
      (window as any).__map.ready = true;
      (window as any).__map.readyMs = Math.round(performance.now() - this.t0);
    });
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as any;
    this.cameras.main.startFollow(this.marker, true, 0.2, 0.2);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      const cam = this.cameras.main;
      cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 0.25, 2));
    });
  }

  update(_t: number, dms: number): void {
    const k = this.keys, v = 600 * dms / 1000;
    const dx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    const dy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    this.marker.x += dx * v; this.marker.y += dy * v * 0.5;
    this.marker.setDepth(this.marker.y);
    this.map.update(this.cameras.main.worldView);
    const grid = getGrid(meta.id);
    (document.getElementById('info') as HTMLElement).textContent =
      `${meta.name} ${Math.round(this.marker.x)},${Math.round(this.marker.y)} ${canStandAt(grid, this.marker.x, this.marker.y) ? 'walkable' : 'blocked'} · ` +
      `objects ${this.children.length} · fps ${Math.round(this.game.loop.actualFps)}`;
  }
}

// The grid is not bundled any more: fetch the map's nav.json first.
fetch(`${meta.assets}/nav.json`).then(r => r.json()).then((nav: NavFile) => {
  registerNav(meta.id, nav.navigation);
  new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', backgroundColor: '#000000',
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    scene: [Viewer],
  });
});
