import Phaser from 'phaser';
import { WorldScene, type WorldData } from './WorldScene';
import { DPR } from './display';
import { computeViewport, publishViewport, RENDER_SCALE } from '../platform/viewport';
import { settings } from '../state/settings';

// The Phaser game: one canvas for the whole session, the world scene restarted for every map.

/** Nothing to preload any more (all art streams in on demand); kept as the first scene for the progress hook. */
class BootScene extends Phaser.Scene {
  constructor(private onProgress: (p: number) => void, private onReady: () => void) { super('boot'); }

  create(): void {
    this.onProgress(1);
    this.onReady();
  }
}

let game: Phaser.Game | null = null;
let booted: Promise<void> | null = null;

/** Create the Phaser game on first use; resolves when all shared sheets are ready. */
export function bootGame(onProgress: (p: number) => void, fixedViewport = true): Promise<void> {
  if (booted) return booted;
  booted = new Promise(resolve => {
    const layout = fixedViewport ? computeViewport(window.innerWidth, window.innerHeight, settings.get().viewport) : null;
    publishViewport(layout);
    const host = document.getElementById('game')!;
    const placeHost = () => {
      const v = fixedViewport ? computeViewport(window.innerWidth, window.innerHeight, settings.get().viewport) : null;
      if (v) Object.assign(host.style, { inset: 'auto', left: `${v.left}px`, top: `${v.top}px`, width: `${v.width * v.scale}px`, height: `${v.height * v.scale}px` });
      return v;
    };
    placeHost();
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      // Sounds and music go through game/audio (one AudioContext, Tùy chỉnh volumes).
      audio: { noAudio: true },
      backgroundColor: '#000000',
      roundPixels: true,
      render: { antialiasGL: !fixedViewport },
      scale: {
        mode: Phaser.Scale.NONE,
        width: layout ? layout.width * RENDER_SCALE : window.innerWidth * DPR,
        height: layout ? layout.height * RENDER_SCALE : window.innerHeight * DPR,
        zoom: layout ? layout.scale / RENDER_SCALE : 1 / DPR,
        autoRound: !fixedViewport,
      },
      scene: [new BootScene(onProgress, resolve), WorldScene],
    });
    const resize = () => {
      if (!game?.isBooted) return;
      const v = placeHost();
      if (v) {
        game.scale.setZoom(v.scale / RENDER_SCALE);
        if (game.scale.width !== v.width * RENDER_SCALE || game.scale.height !== v.height * RENDER_SCALE) game.scale.resize(v.width * RENDER_SCALE, v.height * RENDER_SCALE);
        // Scale.NONE leaves stale CSS dimensions when its zoom becomes exactly 1.
        game.canvas.style.width = `${v.width * v.scale}px`;
        game.canvas.style.height = `${v.height * v.scale}px`;
        game.scale.refresh();
        publishViewport(v);
      } else game.scale.resize(window.innerWidth * DPR, window.innerHeight * DPR);
      game.scale.updateBounds();
    };
    window.addEventListener('resize', resize);
    if (fixedViewport) game.events.once(Phaser.Core.Events.READY, () => {
      resize();
      let choice = settings.get().viewport;
      settings.watch(value => { if (choice !== value.viewport) { choice = value.viewport; resize(); } });
    });
  });
  return booted;
}

/** (Re)start the world scene with a freshly joined room. */
export function startWorld(data: WorldData): void {
  if (!game) throw new Error('bootGame() first');
  const scene = game.scene.getScene('world');
  if (scene?.sys.isActive()) scene.scene.restart(data);
  else game.scene.start('world', data);
}

export const getGame = () => game;

/** Run an extra scene on the game canvas (dev tools: gallery, skill lab). */
export function addScene(key: string, scene: Phaser.Types.Scenes.SceneType): void {
  game?.scene.add(key, scene, true);
}

export function stopWorld(): void {
  const scene = game?.scene.getScene('world');
  if (scene?.sys.isActive()) scene.scene.stop();
}
