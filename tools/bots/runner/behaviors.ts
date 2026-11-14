import { AutoPlay, type BotScenario } from '@vltk/shared';
import type { Behavior, BotClient } from './BotClient.js';

/** Activities run together; announcements and invitations are handled by BotClient. */
export function makeBehavior(bot: BotClient, sc: BotScenario): Behavior {
  return sc.activities.grind ? new Grind(bot) : new Social(bot);
}
class Grind implements Behavior {
  readonly kind = 'grind';
  private auto: AutoPlay;
  constructor(private bot: BotClient) { this.auto = new AutoPlay(bot.host); }
  onMap(): void { this.auto.start(); }
  update(now: number): void {
    if (this.bot.autoStopped && now - this.bot.autoStopped > 8000) { this.bot.autoStopped = 0; this.auto.start(); }
    if (!this.bot.autoStopped) this.auto.update(now, this.bot.autoSettings);
  }
}
class Social implements Behavior {
  readonly kind = 'idle';
  constructor(private bot: BotClient) {}
  onMap(): void {}
  update(now: number): void { this.bot.reviveIfDead(now, 5000); }
}
