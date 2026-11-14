import { Client, type Room } from '@colyseus/sdk';
import {
  BOT_TRADE_RULES, C2S, JX_TICK_MS, MAPS, MAP_ROOM, S2C, TOWN_MAP_ID, castRange, equipError, getSkill, isCastable, isMelee, itemDef, skillCategory, skillCost,
  tuningOf, weaponOk, weaponTypeOf,
  type AutoActor, type AutoDrop, type AutoHost, type BotBehavior, type BotLogin, type BotScenario, type InventoryMsg, type Item,
  type SkillDef, type SkillsMsg, type StatsMsg, type TransferMsg,
} from '@vltk/shared';
import { LootAnnouncer } from './LootAnnouncer.js';
import { between } from './rng.js';

/** Counters the runner prints (tools/bots/run.ts). Player-simulation only: server measurements are a separate tool. */
export interface RunStats {
  orders: number;
  dropped: number;
  deaths: number;
  rejoins: number;
  transfers: number;
  errors: number;
  lastError: string;
}

/** What a behavior does with its bot (behaviors.ts). */
export interface Behavior {
  readonly kind: BotBehavior;
  /** Entered a map (first join, transfer, rejoin). */
  onMap(now: number): void;
  update(now: number): void;
}

const BASIC_ATTACK = 1;
const REJOIN_MS: [number, number] = [3000, 8000];

/**
 * One simulated player: a real account (made by the bot dev API) in a real room through @colyseus/sdk, sending only the orders
 * a browser sends. It keeps what the server tells the owner (skills, bag, money, stats) and the room state, lays out a skill bar
 * like a first-time player (best attacks on the left hand and keys, bùa lợi / bùa hại after them, a hào quang on the right
 * hand) and offers all that to its behavior — the grinding one runs the client's AutoPlay on it (AutoHost).
 */
export class BotClient {
  room: Room | null = null;
  mapId: number;
  behavior!: Behavior;
  online = false;
  stopped = false;
  nextTick = 0;
  levels: Record<number, number> = {};
  bonus: Record<number, number> = {};
  bag: (Item | null)[] = [];
  equip: Partial<Record<string, Item>> = {};
  money = 0;
  stats: StatsMsg | null = null;
  /** Skill bar: left hand + keys 1–9 (skill ids); the hào quang held by the hand slot. */
  left = BASIC_ATTACK;
  keys: (number | null)[] = Array(9).fill(null);
  aura = 0;
  private barMounted = false;
  readonly host: AutoHost;

  private client: Client;
  private announcer: LootAnnouncer;
  private static nextWorldChatAt = 0;
  private cooldowns = new Map<number, number>();
  private sentAt: number[] = [];
  private queueAt = 0;
  private leaving = false;
  private actorCache: { at: number; list: AutoActor[] } = { at: -1, list: [] };

  constructor(readonly login: BotLogin, private sc: BotScenario, readonly rand: () => number, private run: RunStats) {
    this.announcer = new LootAnnouncer(sc.activities);
    this.mapId = login.mapId;
    this.client = new Client(sc.server);
    this.host = this.makeHost();
  }

  get name(): string { return this.login.username; }

  // ======================= connection =======================

  async connect(): Promise<void> {
    if (this.stopped) return;
    try {
      const room = await this.client.joinOrCreate(MAP_ROOM, { mapId: this.mapId, token: this.login.token, charId: this.login.charId });
      if (this.stopped) { await room.leave(true); return; }
      this.wire(room);
    } catch (e) {
      this.fail(e);
      this.scheduleRejoin();
    }
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.leaving = true;
    this.room?.send(C2S.autoConfig, { enabled: false, settings: this.sc.auto });
    try { await this.room?.leave(true); } catch { /* already gone */ }
    this.online = false;
  }

  private wire(room: Room): void {
    this.room = room;
    this.leaving = false;
    this.online = true;
    this.actorCache.at = -1;
    let autoSynced = false;
    room.onMessage(S2C.autoConfig, () => {
      if (autoSynced) return; autoSynced = true;
      room.send(C2S.autoConfig, { enabled: this.sc.activities.grind, settings: this.sc.auto });
    });
    room.onMessage(S2C.tradePost, () => {});
    room.onMessage(S2C.inventory, (msg: InventoryMsg) => {
      this.bag = msg.bag; this.equip = msg.equip; this.money = msg.money;
      this.layoutBar();
      if (msg.pickedUp) this.announcer.pickedUp(msg.pickedUp);
    });
    room.onMessage(S2C.skills, (msg: SkillsMsg) => { this.levels = msg.levels; this.bonus = msg.bonus ?? {}; this.layoutBar(); });
    room.onMessage(S2C.stats, (msg: StatsMsg) => { this.stats = msg; });
    room.onMessage(S2C.fx, (events: { t: string; id?: string }[]) => {
      for (const e of events) if (e.t === 'die' && e.id === room.sessionId) this.run.deaths++;
    });
    room.onMessage(S2C.transfer, (msg: TransferMsg) => void this.transfer(msg.mapId));
    room.onMessage(S2C.teamInvite, (msg: { from: string }) => {
      if (this.sc.activities.grind && this.sc.activities.autoAcceptTeam && !this.me()?.team && typeof msg?.from === 'string') this.send(C2S.team, { op: 'accept', name: msg.from });
    });
    for (const type of [S2C.notice, S2C.team, S2C.chat, S2C.chatReacts, S2C.chatOlder, S2C.log, S2C.online]) {
      room.onMessage(type, () => undefined);
    }
    room.onLeave(() => {
      this.online = false;
      if (this.leaving || this.stopped) return;
      this.run.errors++;
      this.run.lastError = `${this.name}: mất kết nối`;
      this.scheduleRejoin();
    });
    room.onError((code, message) => this.fail(new Error(`${code} ${message ?? ''}`)));
    this.behavior.onMap(performance.now());
  }

  private async transfer(mapId: number): Promise<void> {
    this.run.transfers++;
    this.leaving = true;
    this.online = false;
    try { await this.room?.leave(true); } catch { /* gone */ }
    this.room = null;
    this.mapId = mapId;
    await this.connect();
  }

  private scheduleRejoin(): void {
    if (this.stopped || !this.sc.reconnect) return;
    setTimeout(() => { this.run.rejoins++; void this.connect(); }, between(this.rand, ...REJOIN_MS));
  }

  updateSocial(now: number): void {
    if (!this.online || this.stopped || now < BotClient.nextWorldChatAt) return;
    while (this.sentAt.length && now - this.sentAt[0] > 1000) this.sentAt.shift();
    if (this.sentAt.length >= this.sc.human.maxOrdersPerSec) return;
    const message = this.announcer.next(now, this.bag);
    if (message) {
      const item = this.announcer.lastItem;
      if (this.sc.activities.sell && item) this.send(C2S.tradePost, { uid: item.uid, currency: 'contact', price: 0, text: message });
      else this.send(C2S.chat, { text: message });
      BotClient.nextWorldChatAt = now + BOT_TRADE_RULES.fleetGapMs;
    }
  }

  private fail(e: unknown): void {
    this.run.errors++;
    this.run.lastError = `${this.name}: ${(e as Error)?.message ?? e}`;
  }

  // ======================= orders =======================

  /**
   * Send an order like a hand would: at most maxOrdersPerSec (the rest dropped), each after a random reaction delay, in order.
   * The setup orders on joining (hào quang) go through here too.
   */
  send(type: string, msg: unknown): void {
    const room = this.room;
    if (!room || !this.online) return;
    const now = performance.now();
    while (this.sentAt.length && now - this.sentAt[0] > 1000) this.sentAt.shift();
    if (this.sentAt.length >= this.sc.human.maxOrdersPerSec) { this.run.dropped++; return; }
    this.sentAt.push(now);
    this.run.orders++;
    const at = Math.max(this.queueAt, now + between(this.rand, ...this.sc.human.reactionMs));
    this.queueAt = at;
    setTimeout(() => { if (this.room === room && this.online) room.send(type, msg); }, at - now);
  }

  /** The own actor in the room state (Actor schema). */
  me(): any {
    return (this.room?.state as any)?.actors?.get(this.room!.sessionId);
  }

  safe(): boolean { return !!MAPS[this.mapId]?.safe; }

  /** Dead for at least `after` ms: revive (in town when on another map — the server moves us). */
  private diedAt = 0;
  reviveIfDead(now: number, after = 3000): boolean {
    const me = this.me();
    if (!me) return true;
    if (me.hp > 0) { this.diedAt = 0; return false; }
    if (!this.diedAt) this.diedAt = now;
    if (now - this.diedAt > after) { this.diedAt = now + 5000; this.send(C2S.respawn, {}); }
    return true;
  }

  // ======================= skills =======================

  levelOf(id: number): number {
    const base = this.levels[id] ?? (id === BASIC_ATTACK ? 1 : 0);
    return base > 0 ? base + (this.bonus[id] ?? 0) : base;
  }

  weapon(): number { return weaponTypeOf(itemDef(this.equip.weapon)); }

  usable(id: number): boolean {
    const s = getSkill(id);
    if (!s || this.levelOf(id) <= 0 || !weaponOk(s, this.weapon())) return false;
    return !(s.noHorse && this.me()?.mounted);
  }

  ready(id: number, now = performance.now()): boolean {
    const s = getSkill(id);
    if (!s || !this.usable(id) || now < (this.cooldowns.get(id) ?? 0)) return false;
    return (this.me()?.mp ?? 0) >= skillCost(s, Math.max(1, this.levelOf(id)));
  }

  range(id: number): number { const s = getSkill(id); return s ? castRange(s, Math.max(1, this.levelOf(id))) : 0; }

  /** Cast like a click: the client's cooldown guess starts (skillbar.startCooldown). */
  cast(skill: number, targetId: string | undefined, x: number, y: number, lock: boolean, reach?: number): void {
    const s = getSkill(skill);
    const ms = (s?.cooldown ?? 0) * JX_TICK_MS + (tuningOf(skill).cooldownMs ?? 0);
    if (ms > 0) this.cooldowns.set(skill, performance.now() + ms);
    this.send(C2S.cast, { skill, targetId, x: Math.round(x), y: Math.round(y), lock, reach });
  }

  /** Attack skills of the bar the bot can use now, strongest first. */
  attacks(): number[] {
    return [...new Set([this.left, ...this.keys].filter((id): id is number => id !== null))]
      .filter(id => { const s = getSkill(id); return !!s && skillCategory(s) === 'attack' && this.usable(id); });
  }

  /**
   * Bar of a first-time player (state/skillbar.ts fillDefaults, plus what auto-fight looks for): learned attacks that work with
   * the weapon, latest learned first (stronger), on the left hand and keys; then bùa lợi and bùa hại; a hào quang on the right
   * hand is sent once (C2S.aura, the server keeps it on).
   */
  private layoutBar(): void {
    const weapon = this.weapon();
    this.barMounted = !!this.me()?.mounted;
    const learned = Object.keys(this.levels).map(Number).filter(id => this.levelOf(id) > 0)
      .map(getSkill).filter((s): s is SkillDef => !!s && isCastable(s) && weaponOk(s, weapon) && !(s.noHorse && this.barMounted))
      .sort((a, b) => (b.reqLevel ?? 0) - (a.reqLevel ?? 0) || this.levelOf(b.id) - this.levelOf(a.id));
    const of = (cat: string, n: number) => learned.filter(s => !s.aura && skillCategory(s) === cat).slice(0, n).map(s => s.id);
    const attacks = of('attack', 5);
    this.left = attacks[0] ?? BASIC_ATTACK;
    const keys = [...attacks, ...of('buff', 2), ...of('debuff', 2)];
    this.keys = Array.from({ length: 9 }, (_, i) => keys[i] ?? null);
    const aura = learned.find(s => s.aura)?.id ?? 0;
    if (aura !== this.aura) { this.aura = aura; this.send(C2S.aura, { skill: aura }); }
  }

  // ======================= AutoHost (shared auto/AutoPlay.ts) =======================

  /** Actors of the room as auto-fight sees them (rebuilt at most once per 100 ms). */
  actors(): AutoActor[] {
    const now = performance.now();
    if (now - this.actorCache.at < 100) return this.actorCache.list;
    const list: AutoActor[] = [];
    const self = this.room?.sessionId;
    (this.room?.state as any)?.actors?.forEach((a: any, id: string) => list.push({ id, x: a.x, y: a.y, isSelf: id === self, state: a }));
    this.actorCache = { at: now, list };
    return list;
  }

  private makeHost(): AutoHost {
    return {
      self: () => this.actors().find(a => a.isSelf),
      actors: () => this.actors(),
      safe: () => this.safe(),
      skillAt: slot => {
        if (this.barMounted !== !!this.me()?.mounted) this.layoutBar();
        return slot === 'left' ? this.left : this.keys[slot] ?? null;
      },
      usable: id => this.usable(id),
      ready: id => this.ready(id),
      cost: id => { const s = getSkill(id); return s ? skillCost(s, Math.max(1, this.levelOf(id))) : 0; },
      range: id => this.range(id),
      melee: id => { const s = getSkill(id); return !!s && isMelee(s); },
      cast: (skill, target, x, y, lock, reach) => this.cast(skill, target?.id, x, y, lock, reach),
      move: (x, y) => this.send(C2S.move, { x: Math.round(x), y: Math.round(y) }),
      bag: () => this.bag,
      money: () => this.money,
      use: index => this.send(C2S.use, { index }),
      sell: index => this.send(C2S.sell, { index }),
      buy: (item, count) => this.send(C2S.buy, { item, count }),
      wearable: def => {
        const me = this.me();
        if (!me || !this.stats) return false;
        return !equipError(def, {
          gender: me.gender, faction: me.faction, series: this.stats.series, level: this.stats.progress.level,
          str: this.stats.stats.str, dex: this.stats.stats.dex,
        });
      },
      drops: () => {
        const out: AutoDrop[] = [];
        (this.room?.state as any)?.ground?.forEach((g: any, id: string) => out.push({ id, x: g.x, y: g.y, owner: g.owner, def: g.def, q: g.q }));
        return out;
      },
      pickup: id => this.send(C2S.pickup, { id }),
      train: quiet => this.send(C2S.train, { quiet }),
      goTown: () => this.send(C2S.teleport, { mapId: TOWN_MAP_ID }),
      respawn: () => this.send(C2S.respawn, {}),
      notice: () => undefined,
      stop: () => { this.autoStopped = performance.now(); },
    };
  }

  /** When AutoPlay last stopped itself (the grinding behavior starts it again after a while). */
  autoStopped = 0;
}
