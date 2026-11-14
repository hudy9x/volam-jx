import { Store } from './store';
export const marketResult = new Store<{ kind: 'post' | 'buy'; error?: string } | null>(null);

export const knbPurchaseResult = new Store<{ error?: string } | null>(null);
