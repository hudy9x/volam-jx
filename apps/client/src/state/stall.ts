import type { StallClosedMsg, StallDetailMsg } from '@vltk/shared';
import { Store } from './store';

/** Currently inspected player stall (120-cell single-page shop; S2C.stallDetail). */
export const stallDetail = new Store<StallDetailMsg | null>(null);
/** Notification when a stall closes while a viewer may have it open (S2C.stallClosed). */
export const stallClosed = new Store<StallClosedMsg | null>(null);
/** Own character's active stall title ('' when not stalling). */
export const ownStallTitle = new Store<string>('');
