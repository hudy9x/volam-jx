import { CURSORS } from './cursors.gen';
import { assetUrl } from './assets';

/** Cursors of the original client ([CursorList], tools/gen-ui.ts). Desktop only: touch screens have none. */
export type CursorKind = 'normal' | 'attack' | 'talk' | 'pick' | 'buy' | 'sell' | 'repair' | 'view' | 'help' | 'bind' | 'unbind';

/** CSS value of a cursor (falls back to the browser's when the PNG is missing). */
export const cursorCss = (kind: CursorKind) => `var(--cur-${kind}, default)`;

/** Define --cur-<kind> on the page once; ui/kit/theme.css uses --cur-normal everywhere, the game canvas switches per hover. */
export function installCursors(): void {
  const root = document.documentElement.style;
  for (const [kind, c] of Object.entries(CURSORS)) {
    // Absolute: a relative url() inside a custom property resolves against the stylesheet that uses it (/src/).
    const url = new URL(assetUrl(c.url), document.baseURI).href;
    root.setProperty(`--cur-${kind}`, `url("${url}") ${c.x} ${c.y}, ${kind === 'normal' ? 'default' : 'pointer'}`);
  }
}
