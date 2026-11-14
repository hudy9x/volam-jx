import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Server settings from the environment (apps/server/.env, documented in .env.example), read in one place so every module
// agrees. Colyseus loads .env while it is imported: import this module after 'colyseus'.

const SRC = path.dirname(fileURLToPath(import.meta.url));

export const PORT = Number(process.env.PORT ?? 2567);
/** Map grids, next to the generated map art (apps/client/tools/gen-maps.ts). */
export const MAPS_DIR = path.resolve(process.env.MAPS_DIR ?? path.join(SRC, '../../client/public/assets/maps'));
/** Monster spawns per map (apps/client/tools/gen-spawns.ts, the dev tool of the big map). */
export const SPAWNS_DIR = path.resolve(process.env.SPAWNS_DIR ?? path.join(SRC, '../../../packages/shared/spawns'));
/** Bot templates (templates/<name>.json) and run scenarios (<name>.json): the repo's bots/ (docs/bots.md). */
export const BOTS_DIR = path.resolve(process.env.BOTS_DIR ?? path.join(SRC, '../../../tools/bots/data'));
/** Print tick timings. */
export const PERF = !!process.env.PERF;

/** Dev orders and routes (spawn editor, +levels, +money, skill levels, the gold shop); DEV_TOOLS=0 turns them off. */
export const devTools = (): boolean => process.env.DEV_TOOLS !== '0';
