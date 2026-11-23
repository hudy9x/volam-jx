import type { InspectResultMsg } from '@vltk/shared';
import { Store } from './store';

/** Latest S2C.inspect response (other player's info & equipped gear). */
export const inspectResult = new Store<InspectResultMsg | null>(null);
