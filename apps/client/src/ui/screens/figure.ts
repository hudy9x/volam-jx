import { FACTIONS, type Element, type Gender } from '@vltk/shared';
import { assetUrl } from '../../art/assets';
import { LOGIN_FIGURES } from '../../art/login-figures.gen';

type Figure = { sprite: HTMLElement; key: string; generation: number; raf?: number };
const figures = new WeakMap<HTMLElement, Figure>();
const decoded = new Map<string, Promise<void>>();

function preload(url: string): Promise<void> {
  let ready = decoded.get(url);
  if (!ready) {
    const image = new Image();
    image.src = url;
    ready = image.decode();
    decoded.set(url, ready);
    void ready.catch(() => decoded.delete(url));
  }
  return ready;
}

function draw(figure: Figure, pose: 'idle' | 'action', frame = 0): void {
  if (figure.sprite.dataset.pose === pose && figure.sprite.dataset.frame === String(frame)) return;
  const key = `${figure.key}-${pose}`, art = LOGIN_FIGURES[key];
  Object.assign(figure.sprite.style, {
    backgroundImage: `url("${assetUrl(`ui/login/figures/${key}.webp`)}")`,
    backgroundSize: `${art.columns * art.width}px ${Math.ceil(art.frames / art.columns) * art.height}px`,
    backgroundPosition: `${-(frame % art.columns) * art.width}px ${-Math.floor(frame / art.columns) * art.height}px`,
  });
  figure.sprite.dataset.pose = pose;
  figure.sprite.dataset.frame = String(frame);
}

/** Cancel the previous action immediately; clicking a selected figure replays its action once. */
export function selectFigure(el: HTMLElement, selected: boolean, animate = false): void {
  const figure = figures.get(el);
  if (!figure) return;
  const generation = ++figure.generation;
  if (figure.raf !== undefined) cancelAnimationFrame(figure.raf);
  draw(figure, 'idle');
  if (!selected || !animate) return;
  const art = LOGIN_FIGURES[`${figure.key}-action`];
  const url = assetUrl(`ui/login/figures/${figure.key}-action.webp`);
  void preload(url).then(() => {
    if (figure.generation !== generation || !el.isConnected || el.closest('.login-screen.hidden')) return;
    const start = performance.now();
    const tick = (now: number) => {
      if (figure.generation !== generation) return;
      if (!el.isConnected || el.closest('.login-screen.hidden')) { draw(figure, 'idle'); return; }
      const frame = Math.floor((now - start) / art.interval);
      if (frame >= art.frames) { draw(figure, 'idle'); return; }
      draw(figure, 'action', frame);
      figure.raf = requestAnimationFrame(tick);
    };
    tick(start);
  }).catch(() => { /* Keep the idle image if the action cannot be loaded. */ });
}

/** Original artwork is keyed by element/gender. Both poses share a crop and remain anchored at the feet. */
export function showFigure(el: HTMLElement, gender: Gender, series: Element, faction = '',
  options: { selected?: boolean; animate?: boolean } = {}): void {
  const previous = figures.get(el);
  if (previous) { previous.generation++; if (previous.raf !== undefined) cancelAnimationFrame(previous.raf); }
  el.replaceChildren();
  const key = `${FACTIONS[faction]?.element ?? series}-${gender}`;
  const art = LOGIN_FIGURES[`${key}-idle`];
  if (!art) return;
  // Scale only by height so wide weapons (e.g. Thiếu Lâm staff) don't shrink the character down.
  const scale = el.clientHeight > 0 ? Math.min(1, el.clientHeight / art.idleHeight) : 1;
  const sprite = document.createElement('div');
  sprite.className = 'login-figure-sprite';
  sprite.setAttribute('aria-hidden', 'true');
  Object.assign(sprite.style, { width: `${art.width}px`, height: `${art.height}px`,
    left: `calc(50% - ${art.anchorX * scale}px)`, top: `${el.clientHeight - art.anchorY * scale}px`, bottom: 'auto',
    transform: `scale(${scale})`, transformOrigin: 'top left' });
  el.appendChild(sprite);
  figures.set(el, { sprite, key, generation: 0 });
  // Decode the action in advance so the first click does not flash an unloaded sprite sheet.
  void preload(assetUrl(`ui/login/figures/${key}-action.webp`)).catch(() => {});
  selectFigure(el, options.selected ?? false, options.animate ?? false);
}
