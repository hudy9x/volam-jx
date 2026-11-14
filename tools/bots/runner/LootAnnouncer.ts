import { BOT_TRADE_RULES, botLootMessage, type Item } from '@vltk/shared';

/** Only explicit ground pickups are enqueued; setup, shops and reconnect inventories never enter this queue. */
export class LootAnnouncer {
  private pending: Item[] = [];
  lastItem: Item | null = null;
  private seen = new Set<string>();
  private nextAt = 0;
  constructor(private options: { chat: boolean; sell: boolean }) {}
  pickedUp(item: Item): void {
    if ((!this.options.chat && !this.options.sell) || this.seen.has(item.uid)) return;
    this.seen.add(item.uid);
    if (this.seen.size > 2000) this.seen.delete(this.seen.values().next().value!);
    if (!botLootMessage(item, this.options.sell)) return;
    if (this.pending.length >= BOT_TRADE_RULES.maxPending) this.pending.shift();
    this.pending.push(item);
  }
  next(now: number, bag: readonly (Item | null)[]): string | null {
    this.lastItem = null;
    if (now < this.nextAt) return null;
    while (this.pending.length) {
      const item = this.pending.shift()!;
      if (!bag.some(it => it?.uid === item.uid)) continue;
      const message = botLootMessage(item, this.options.sell);
      if (message) { this.lastItem = item; this.nextAt = now + BOT_TRADE_RULES.botGapMs; return message; }
    }
    return null;
  }
}
