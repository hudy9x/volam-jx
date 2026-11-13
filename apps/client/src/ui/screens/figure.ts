import { FOOT_X, FOOT_Y, jxSheetUrl, lookPreview, makeLook } from '../../art/jx';

/** Original frame time (18 per second); the standing pose is played a little slower, like the original login figures. */
const FRAME_MS = 1000 / 12;
const timers = new WeakMap<HTMLElement, number>();

/**
 * A character standing at 1:1 from its original paper-doll sheets (CSS sprites), feet at the bottom centre of `el`,
 * playing the standing pose. Used by the character select / create screens (no Phaser there).
 */
export function showFigure(el: HTMLElement, gender: string, look: { helm: number; armor: number; weapon: number } | undefined, dir = 0): void {
  const old = timers.get(el);
  if (old) clearInterval(old);
  el.replaceChildren();
  if (!look) return;
  const layers = lookPreview(makeLook(gender, look.helm, look.armor, look.weapon, '', false), dir);
  const cx = el.clientWidth / 2 || 60, cy = el.clientHeight || 200;
  const parts = layers.map(part => {
    const [w, h, bx, by, , dirs, cols] = part.meta;
    const perDir = part.meta[4];
    const rowsPerDir = Math.ceil(perDir / cols);
    const div = document.createElement('div');
    Object.assign(div.style, {
      position: 'absolute', left: `${cx + bx - FOOT_X}px`, top: `${cy + by - FOOT_Y}px`, width: `${w}px`, height: `${h}px`,
      backgroundImage: `url(${jxSheetUrl(part.key)})`, backgroundSize: `${cols * w}px ${dirs * rowsPerDir * h}px`,
    });
    el.appendChild(div);
    return { div, w, h, perDir, cols, rowsPerDir, row: part.row };
  });
  let frame = 0;
  const draw = () => {
    for (const p of parts) {
      const f = frame % p.perDir;
      p.div.style.backgroundPosition = `${-(f % p.cols) * p.w}px ${-(p.row * p.rowsPerDir + Math.floor(f / p.cols)) * p.h}px`;
    }
  };
  draw();
  timers.set(el, window.setInterval(() => {
    if (!el.isConnected) { clearInterval(timers.get(el)); return; }
    frame++;
    draw();
  }, FRAME_MS));
}
