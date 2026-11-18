import { BAG_SIZE, itemQty, type InventoryMsg } from '@vltk/shared';
import { Store } from './store';

/** Hành trang + worn items + tiền túi of the own character, as the server last sent them (net/room.ts writes it). */
export const inventory = new Store<InventoryMsg>({ bag: Array(BAG_SIZE).fill(null), equip: {}, money: 0 });

/** First bag slot holding a piece of table row `defId` (-1: none). */
export const bagIndexOf = (defId: string): number => inventory.get().bag.findIndex(it => it?.def === defId);

/** How many pieces of table row `defId` the bag holds (summing stack counts). */
export const bagCount = (defId: string): number => inventory.get().bag.reduce((n, it) => n + (it?.def === defId ? itemQty(it) : 0), 0);
