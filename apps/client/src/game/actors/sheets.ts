import Phaser from 'phaser';
import { jxSheetUrl, type Layer } from '../../art/jx';

// Original sheets as Phaser textures: loaded on demand, sliced into `${row}_${frame}` frames on first use.

export const jxTextureKey = (key: string) => `jx:${key}`;

/**
 * Queue missing sheets on the scene's loader. The loader ignores keys already queued or in flight, and a
 * stopped scene drops its queue, so callers simply ask again later if a sheet never shows up.
 */
export function requestSheets(scene: Phaser.Scene, keys: Iterable<string>): void {
  let added = false;
  for (const key of keys) {
    const tex = jxTextureKey(key);
    if (scene.textures.exists(tex)) continue;
    scene.load.image(tex, jxSheetUrl(key));
    added = true;
  }
  if (added && !scene.load.isLoading()) scene.load.start();
}

/** True once the sheet's texture exists; slices it into `${row}_${frame}` frames on first use. */
export function sheetReady(scene: Phaser.Scene, layer: Layer): boolean {
  const key = jxTextureKey(layer.key);
  if (!scene.textures.exists(key)) return false;
  const tex = scene.textures.get(key);
  if (tex.has('0_0')) return true;
  const [w, h, , , perDir, dirs, cols] = layer.meta;
  const rowsPerDir = Math.ceil(perDir / cols);
  for (let d = 0; d < dirs; d++) {
    for (let f = 0; f < perDir; f++) {
      tex.add(`${d}_${f}`, 0, (f % cols) * w, (d * rowsPerDir + Math.floor(f / cols)) * h, w, h);
    }
  }
  return true;
}
