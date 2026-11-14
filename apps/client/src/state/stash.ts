import { STASH_SIZE, type StashMsg } from '@vltk/shared';
import { Store } from './store';

/** Account-shared stash (3 pages = STASH_SIZE), synced from server via S2C.stash. */
export const stash = new Store<StashMsg>({ stash: Array(STASH_SIZE).fill(null) });

