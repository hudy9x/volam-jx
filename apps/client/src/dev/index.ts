import { addScene } from '../game';
import type { Hud } from '../ui/hud/Hud';
import { GalleryScene } from './gallery/GalleryScene';
import { SkillLabScene } from './skill-lab/SkillLabScene';
import { SpawnEditor } from './spawn-editor/spawnEditor';

// Dev-only tools, loaded by app/App.ts only in `npm run dev` (dynamic import, so the production build leaves them out).
// The map viewer has its own page: maptest.html -> map-viewer/harness.ts. `?bots` (bot-panel/BotPanel.ts) is imported by
// App.ts on its own: it needs neither Phaser nor a login.

/** `?gallery`: every armor look of levels 1–10 at 1:1. */
export const startGallery = () => addScene('gallery', GalleryScene);

/** `?skills`: every skill on dummies, no server. */
export const startSkillLab = () => addScene('skills', SkillLabScene);

/** Tools inside the game's interface: monster zones on the big map ("Quái (dev)"). */
export function installDevTools(hud: Hud): void {
  new SpawnEditor(hud.bigmap, text => hud.notice(text));
}
