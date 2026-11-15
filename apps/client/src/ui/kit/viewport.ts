import { gameViewport, watchViewport } from '../../platform/viewport';

/** Client coordinates -> unscaled local CSS coordinates (also works under nested transforms). */
export function localPoint(el: HTMLElement, clientX: number, clientY: number): [number, number] {
  const r = el.getBoundingClientRect();
  return [(clientX - r.left) * (el.offsetWidth / (r.width || 1)), (clientY - r.top) * (el.offsetHeight / (r.height || 1))];
}
export function hudSize(): { width: number; height: number } {
  const frame = gameViewport();
  if (frame) return { width: frame.width, height: frame.height };
  const hud = document.getElementById('hud');
  return { width: hud?.offsetWidth || window.innerWidth, height: hud?.offsetHeight || window.innerHeight };
}
export function bindHudViewport(root: HTMLElement): void {
  watchViewport(layout => {
    if (!layout) return;
    Object.assign(root.style, {
      left: `${layout.left}px`, top: `${layout.top}px`, right: 'auto', bottom: 'auto',
      width: `${layout.width}px`, height: `${layout.height}px`, transform: `scale(${layout.scale})`,
    });
    root.style.setProperty('--hud-w', `${layout.width}px`);
    root.style.setProperty('--hud-h', `${layout.height}px`);
    root.dataset.viewport = layout.id;
    root.dispatchEvent(new Event('viewportchange'));
  });
}
