import type { StallClosedMsg, StallDetailMsg, StallListMsg } from '@vltk/shared';
import { Store } from './store';

/** Open stalls in the current town (S2C.stallList). */
export const stallList = new Store<StallListMsg>({ mapId: 0, stalls: [], myStall: null });
/** Currently inspected stall (own editable stall or another player's open stall; S2C.stallDetail). */
export const stallDetail = new Store<StallDetailMsg | null>(null);
/** Notification when a stall closes while a viewer may have it open (S2C.stallClosed). */
export const stallClosed = new Store<StallClosedMsg | null>(null);
