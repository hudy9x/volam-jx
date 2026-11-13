import { FACTIONS, type Element, type ItemViewer, type StatsMsg } from '@vltk/shared';
import type { ActorState } from './actor';
import { Store } from './store';

/** Hệ, level / exp / points and derived stats of the own character, as the server last sent them (S2C.stats). */
export const progress = new Store<StatsMsg | null>(null);

/** Hệ of the own character: the one chosen at creation (progress), else its faction's (older records). */
export function ownSeries(self: ActorState | null | undefined): Element | undefined {
  return progress.get()?.series ?? FACTIONS[self?.faction ?? '']?.element;
}

/** Who looks at / wears an item: sex, faction, hệ, level and potentials (item requirements, items/equip.ts). */
export function itemViewer(self: ActorState | null): ItemViewer | null {
  if (!self) return null;
  const p = progress.get();
  return {
    gender: self.gender, faction: self.faction, series: ownSeries(self),
    level: p?.progress.level, str: p?.stats.str, dex: p?.stats.dex,
  };
}
