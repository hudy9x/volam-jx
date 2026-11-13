import {
  AutoPlay, C2S, MAPS, approachDistance, getSkill, isMelee, isoDistance, type BotBehavior, type BotScenario,
} from '@vltk/shared';
import type { Behavior, BotClient } from './BotClient.js';
import { between } from './rng.js';

/**
 * Kiểu hành vi của bot (shared BOT_BEHAVIORS; tỉ lệ trong kịch bản). Each one only sends the orders a player could send.
 * Luyện quái runs the client's AutoPlay as is; the others are small loops of their own.
 */
export function makeBehavior(kind: BotBehavior, bot: BotClient, sc: BotScenario): Behavior {
  switch (kind) {
    case 'grind': return new Grind(bot, sc);
    case 'pk': return new Pk(bot, sc);
    case 'wander': return new Wander(bot, sc);
    case 'idle': return new Idle(bot);
    case 'travel': return new Travel(bot, sc);
    case 'crowd': return new Crowd(bot, sc);
  }
}

/** AutoPlay starts itself again this long after it stopped (e.g. "trong thành không thể động võ" without autoMap). */
const AUTO_RESTART_MS = 8000;

/** Luyện quái: AutoPlay (shared auto/AutoPlay.ts) with the scenario's Auto options — targets, potions, loot, town round, revive. */
class Grind implements Behavior {
  readonly kind = 'grind';
  private auto: AutoPlay;
  constructor(private bot: BotClient, private sc: BotScenario) { this.auto = new AutoPlay(bot.host); }
  onMap(): void { this.auto.start(); }
  update(now: number): void {
    if (this.bot.autoStopped && now - this.bot.autoStopped > AUTO_RESTART_MS) { this.bot.autoStopped = 0; this.auto.start(); }
    if (!this.bot.autoStopped) this.auto.update(now, this.sc.auto);
  }
}

/** Đứng yên: in the game doing nothing (revives after dying). */
class Idle implements Behavior {
  readonly kind = 'idle';
  constructor(private bot: BotClient) {}
  onMap(): void {}
  update(now: number): void { this.bot.reviveIfDead(now, 5000); }
}

/** Đi dạo: a random spot within the radius of where it entered the map, every 2–6 s. */
class Wander implements Behavior {
  readonly kind: BotBehavior = 'wander';
  protected home = { x: 0, y: 0 };
  protected next = 0;
  constructor(protected bot: BotClient, protected sc: BotScenario) {}
  onMap(now: number): void { this.home = { x: 0, y: 0 }; this.next = now + between(this.bot.rand, 500, 2000); }
  update(now: number): void {
    if (this.bot.reviveIfDead(now)) return;
    this.walk(now, this.sc.wander.radius);
  }
  protected walk(now: number, radius: number): void {
    const me = this.bot.me();
    if (!me) return;
    if (!this.home.x) this.home = { x: me.x, y: me.y };
    if (now < this.next) return;
    this.next = now + between(this.bot.rand, 2000, 6000);
    const a = this.bot.rand() * Math.PI * 2, r = this.bot.rand() * radius;
    this.bot.send(C2S.move, { x: Math.round(this.home.x + Math.cos(a) * r), y: Math.round(this.home.y + (Math.sin(a) * r) / 2) });
  }
}

/** Đi bản đồ: another map of the list every `every` s (± 20 %), strolling in between. */
class Travel extends Wander {
  readonly kind = 'travel';
  private leaveAt = 0;
  onMap(now: number): void {
    super.onMap(now);
    this.leaveAt = now + this.sc.travel.every * 1000 * between(this.bot.rand, 0.8, 1.2);
  }
  update(now: number): void {
    if (this.bot.reviveIfDead(now)) return;
    if (now >= this.leaveAt) {
      const maps = this.sc.travel.maps.filter(id => id !== this.bot.mapId);
      if (maps.length) this.bot.send(C2S.teleport, { mapId: maps[Math.floor(this.bot.rand() * maps.length)] });
      this.leaveAt = now + 10_000; // the server may refuse (map not generated): try again later
      return;
    }
    this.walk(now, 200);
  }
}

/** Dồn một chỗ: everyone on one spot of one map (worst case for collisions + state sync); can keep casting there. */
class Crowd implements Behavior {
  readonly kind = 'crowd';
  private next = 0;
  private spot: { x: number; y: number } | null = null;
  constructor(private bot: BotClient, private sc: BotScenario) {}
  onMap(): void { this.spot = null; this.next = 0; }
  update(now: number): void {
    if (this.bot.reviveIfDead(now) || now < this.next) return;
    const c = this.sc.crowd;
    if (this.bot.mapId !== c.mapId) { this.next = now + 10_000; this.bot.send(C2S.teleport, { mapId: c.mapId }); return; }
    const me = this.bot.me();
    if (!me) return;
    if (!this.spot) {
      const entry = MAPS[c.mapId].raw.entry;
      const a = this.bot.rand() * Math.PI * 2, r = this.bot.rand() * c.radius;
      this.spot = { x: (c.x || entry.x) + Math.cos(a) * r, y: (c.y || entry.y) + (Math.sin(a) * r) / 2 };
    }
    this.next = now + between(this.bot.rand, 800, 1500);
    if (isoDistance(me.x, me.y, this.spot.x, this.spot.y) > 40) {
      this.bot.send(C2S.move, { x: Math.round(this.spot.x), y: Math.round(this.spot.y) });
      return;
    }
    if (!c.cast || this.bot.safe()) return;
    const skill = this.bot.attacks().find(id => this.bot.ready(id, now));
    if (skill) this.bot.cast(skill, undefined, this.spot.x + between(this.bot.rand, -80, 80), this.spot.y + between(this.bot.rand, -40, 40), false);
  }
}

/**
 * PK: goes to the bãi luyện công of its level (C2S.train, like auto-fight), turns PK on and hunts players there — the nearest,
 * one of another camp, or a random one — with the bar's attacks (locked, at the approach distance of the Auto options).
 * Without a target it strolls. Tân thủ (no faction) cannot PK: it only strolls.
 */
class Pk extends Wander {
  readonly kind = 'pk';
  private target = '';
  private targetSince = 0;
  private lockedAt = 0;
  private skill = 0;
  private orderAt = 0;
  onMap(now: number): void { super.onMap(now); this.target = ''; this.orderAt = now + between(this.bot.rand, 1000, 3000); }
  update(now: number): void {
    if (this.bot.reviveIfDead(now)) return;
    const me = this.bot.me();
    if (!me) return;
    if (this.bot.safe() || !MAPS[this.bot.mapId]?.pvp) {
      if (now >= this.orderAt) { this.orderAt = now + 10_000; this.bot.send(C2S.train, { quiet: true }); }
      this.walk(now, 150);
      return;
    }
    if (me.camp === 'new') { this.walk(now, this.sc.wander.radius); return; }
    if (me.pk !== this.sc.pk.mode) {
      if (now >= this.orderAt) { this.orderAt = now + 3000; this.bot.send(C2S.pk, { mode: this.sc.pk.mode }); }
      return;
    }
    const t = this.pick(now, me);
    if (!t) { this.walk(now, this.sc.wander.radius); return; }
    const ready = this.bot.attacks().filter(id => this.bot.ready(id, now));
    const skill = ready.includes(this.skill) && now - this.lockedAt < 1500 ? this.skill : ready[Math.floor(this.bot.rand() * ready.length)] ?? 1;
    if (t.id !== this.target || skill !== this.skill || now - this.lockedAt > 2000) {
      const s = getSkill(skill);
      const reach = approachDistance(this.bot.range(skill), !!s && isMelee(s), this.sc.auto);
      this.bot.cast(skill, t.id, t.x, t.y, true, reach);
      if (t.id !== this.target) this.targetSince = now;
      this.target = t.id;
      this.skill = skill;
      this.lockedAt = now;
    }
  }

  /** Keep the target while it lives (at most 20 s), else choose one by the scenario's rule. */
  private pick(now: number, me: any): { id: string; x: number; y: number } | undefined {
    const players = this.bot.actors().filter(a => !a.isSelf && a.state.kind === 'player' && a.state.hp > 0 &&
      (!(a.state as any).team || (a.state as any).team !== me.team) &&
      (this.sc.pk.target !== 'enemy' || (a.state as any).camp !== me.camp));
    const cur = players.find(a => a.id === this.target);
    if (cur && now - this.targetSince < 20_000) return cur;
    if (!players.length) return undefined;
    if (this.sc.pk.target === 'random') return players[Math.floor(this.bot.rand() * players.length)];
    return players.reduce((b, a) => (isoDistance(me.x, me.y, a.x, a.y) < isoDistance(me.x, me.y, b.x, b.y) ? a : b));
  }
}
