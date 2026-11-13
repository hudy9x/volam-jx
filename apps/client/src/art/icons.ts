import type { ItemDef, SkillDef } from '@vltk/shared';
import { assetUrl } from './assets';

// Original icons (tools/gen-assets.ts, gen-skills.ts) as page URLs, for the interface and the dev tools.

export const itemIconUrl = (item: ItemDef) => assetUrl(`${item.icon}.webp`);
export const skillIconUrl = (s: SkillDef | undefined) => (s?.icon ? assetUrl(`${s.icon}.webp`) : '');
