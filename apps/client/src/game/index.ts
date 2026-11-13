import Phaser from 'phaser';
import { WorldScene, type WorldData } from './WorldScene';
import { DPR } from './display';

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
export function bootGame(onProgress: (p: number) => void): Promise<void> {
  if (booted) return booted;
  booted = new Promise(resolve => {
    // Device-pixel canvas shown at CSS size (zoom 1/DPR): the original art is drawn pixel for pixel.
    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game',
      // Sounds and music go through game/audio (one AudioContext, Tùy chỉnh volumes).
      audio: { noAudio: true },
      backgroundColor: '#000000',
      roundPixels: true,
      scale: { mode: Phaser.Scale.NONE, width: window.innerWidth * DPR, height: window.innerHeight * DPR, zoom: 1 / DPR },
      scene: [new BootScene(onProgress, resolve), WorldScene],
    });
    window.addEventListener('resize', () => game?.scale.resize(window.innerWidth * DPR, window.innerHeight * DPR));
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
