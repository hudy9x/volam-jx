import type { ShopId } from '@vltk/shared';
import { Store } from './store';

/**
 * The NPC shop open right now and its mode, like the original 买卖 window (ui3/npc买卖界面.ini: Mua / Bán / Sửa
 * toggles). While a shop is open in 'sell' mode, clicking a bag item offers to sell it (ui/windows/inventory.ts).
 */
export interface TradeState { shop: ShopId | null; mode: 'buy' | 'sell' }

export const trade = new Store<TradeState>({ shop: null, mode: 'buy' });
