import type { TkStateMsg } from '@vltk/shared';
import { Store } from './store';

export const tkState = new Store<TkStateMsg | null>(null);
