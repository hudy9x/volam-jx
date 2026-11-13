/**
 * The login screens are the original 800 x 600 pictures. They stay 1:1 on screens big enough and shrink to fit on
 * smaller ones (phones, small windows) — the only place the interface scales, since these are full-screen pictures.
 */
export function fitStage(screen: HTMLElement): void {
  const stage = screen.querySelector<HTMLElement>('.stage');
  if (!stage) return;
  const fit = () => {
    const k = Math.min(1, window.innerWidth / 800, window.innerHeight / 600);
    stage.style.setProperty('--k', String(k));
  };
  fit();
  window.addEventListener('resize', fit);
}
