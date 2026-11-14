import { findPlace } from '../items/bag.js';
import { botTradeReasons } from '../bots/social.js';
import { isoDistance } from '../geometry.js';
import type { Point } from '../maps/nav/types.js';
import { KIND_SLOTS, QUALITY, SHOP_ITEMS, itemDef, potionMs, potionTotal, type Item, type ItemDef, type PotionStat } from '../items/index.js';
import { MONSTERS } from '../monsters/index.js';
import { getSkill, isCastable, skillCategory } from '../skills/index.js';
import { CLOSE_REACH, approachDistance, type AutoSettings } from './settings.js';

type Settings = AutoSettings;

/** A drop on the ground as auto-fight sees it (`owner` '' = anyone may take it; `def` 'money' for money). */
export interface AutoDrop { id: string; x: number; y: number; owner: string; def: string; q: number }

/**
 * What auto-fight reads of an actor: the fields of the room's `Actor` schema it needs (the client's decoded ActorState and
 * the bot's room state both fit).
 */
export interface AutoActorState {
  kind: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  boss: boolean | number;
  /** Monsters: original npc res name (training dummies are skipped by it). */
  sprite: string;
  /** Bùa lợi / bùa hại (skill ids) on it. */
  states?: Iterable<number>;
}

/** An actor as auto-fight sees it (the client's actor views and the bot's room actors fit this). */
export interface AutoActor {
  id: string;
  x: number;
  y: number;
  isSelf: boolean;
  state: AutoActorState;
}

/**
 * What auto-fight needs from the world scene and the interface. It only sends the same orders a player's clicks send —
 * it is one more source of input, next to the mouse, the keyboard and (later) touch.
 */
export interface AutoHost {
  self(): AutoActor | undefined;
  actors(): Iterable<AutoActor>;
  /** Town / safe map: no fighting. */
  safe(): boolean;
  /** Skill in a bar slot ('left' or key 0–8), null if empty / unknown. */
  skillAt(slot: 'left' | number): number | null;
  /** The worn weapon can use that skill and it is learned. */
  usable(skill: number): boolean;
  /** Off cooldown and enough Nội lực for it. */
  ready(skill: number): boolean;
  /** Nội lực one use costs (at the learned level). */
  cost(skill: number): number;
  /** How far the skill reaches at its level (shared castRange), and whether it is a close-combat one. */
  range(skill: number): number;
  melee(skill: number): boolean;
  /** `reach`: walk this close before casting (CastMsg.reach). */
  cast(skill: number, target: AutoActor | undefined, x: number, y: number, lock: boolean, reach?: number): void;
  move(x: number, y: number): void;
  /** The own hành trang, money, and orders on it. */
  bag(): readonly (Item | null)[];
  money(): number;
  use(index: number): void;
  sell(index: number): void;
  buy(defId: string, count: number): void;
  /** The own character may wear this row (sex, faction, level, potentials). */
  wearable(def: ItemDef): boolean;
  /** Drops on the ground of this map and picking one up (the server walks there first). */
  drops(): Iterable<AutoDrop>;
  pickup(id: string): void;
  /** Travel: the bãi luyện công of the own level (the server picks it), the town, revive. */
  train(quiet: boolean): void;
  goTown(): void;
  respawn(): void;
  notice(text: string): void;
  stop(why: string): void;
}

const TICK_MS = 150;
/** Re-send the lock this often while the target lives (the server drops it on errors, e.g. no Nội lực). */
const RELOCK_MS = 2000;
/** With rotation: next skill of the bar this often. */
const ROTATE_MS = 1200;
/** One buff per this long, and the same buff not again within BUFF_RETRY_MS when its state cannot be seen. */
const BUFF_GAP_MS = 800;
const BUFF_RETRY_MS = 15000;
/** Bùa hại: the same curse on the same target not again within this long; only on bosses or with this many monsters near. */
const CURSE_RETRY_MS = 10000;
const CURSE_RANGE = 420;
const CURSE_CROWD = 3;
const RETURN_GAP_MS = 1500;
/** Manual orders pause auto-fight this long (not the potions). */
const MANUAL_PAUSE_MS = 3000;
/** After an auto potion: wait until it has pumped (+ this) before the next one, unless the bar is below half the threshold. */
const POTION_SLACK_MS = 300;
const POTION_RUSH_GAP_MS = 500;
const STAT_NAMES: Record<PotionStat, string> = { hp: 'Sinh lực', mp: 'Nội lực' };
const BASIC_ATTACK = 1;
/** Nearest-mode target choice (jx-web-main state-and-save-01.js iD): keep the current one unless another is closer than half − 40. */
const SWITCH_FACTOR = 0.5;
const SWITCH_MARGIN = 40;
/**
 * Approach (how close: state/settings.ts approachDistance): targets further than WALK_BEYOND are walked to first (the
 * server gives a lock up beyond 1600), the walk re-sent every WALK_GAP_MS.
 */
const WALK_BEYOND = 1200;
const WALK_GAP_MS = 700;
/**
 * Stuck ("điểm kẹt"): we should be walking to the target but have not moved STALL_STEP in STALL_MS (no path, wall, cliff),
 * or we stand in reach and its Sinh lực has not dropped in NO_DAMAGE_MS → that target is left alone for BAN_MS. Two stalls
 * within NUDGE_WINDOW_MS: step NUDGE_STEP aside to get off the stuck spot.
 */
const STALL_MS = 1500;
const STALL_STEP = 12;
const NO_DAMAGE_MS = 6000;
const BAN_MS = 10000;
const NUDGE_WINDOW_MS = 8000;
const NUDGE_STEP = 240;
/** Loot (jx-web-main equipment-02.js hp): with a live target only drops this near; give up a drop after a try. */
const LOOT_NEAR = 220;
const PICKUP_WAIT_MS = 4000;
const PICKUP_RETRY_MS = 6000;
const PICKUP_TRIES = 2;
const FULL_NOTICE_MS = 60000;
/** Selling junk (jx-web-main every 30 s) and the town round (buy potions, then back to training). */
const JUNK_GAP_MS = 30000;
const TOWN_STEP_MS = 400;
const TRAVEL_GAP_MS = 8000;
const REVIVE_AFTER_MS = 3000;
/** Potions bought in town: this many of each, the best tier that costs at most POTION_BUDGET of the money (jx-web-main J9). */
const POTION_BUY = { hp: 15, mp: 10 };
const POTION_BUDGET = 0.2;
/** Training dummies (Cọc gỗ) never die: not worth a lock. */
const DUMMY_SPRITES = new Set(Object.values(MONSTERS).filter(d => d.dummy).map(d => d.sprite));

/**
 * Tự động đánh, after jx-web-main's auto-play (docs/auto-play.md):
 *  - drinks potions under the chosen % (and Nội lực under twice the skill's cost), buys them in town when the bag has none;
 *  - recasts the bùa lợi on keys 1–9, puts the bùa hại there on bosses / crowds;
 *  - picks the highest-ranked nearest monster, finishes it in boss modes (nearest mode may switch); walks to far ones, locks near
 *    ones with an approach distance (close combat right up to it, ranged skills a % of their range — approachDistance);
 *  - leaves a target it cannot reach (not moving) or does not hurt (Sinh lực not dropping), and steps off a stuck spot;
 *    with rotation, cycles the attack skills of keys 1–9 (including bosses);
 *  - picks up between kills what it may take (quality filter), sells white pieces it cannot wear;
 *  - looks for monsters further away when none is left (autoSeek), else walks back;
 *  - changes bãi luyện công with the level (autoMap; the server picks the map), revives and goes back after dying.
 * Runs like a player's hand — on the client (phím Z, game/WorldScene.ts) and as the bots' brain (apps/server/src/dev/bots/,
 * docs/bots.md); the server checks every order as usual. It stays on across maps.
 */
export class AutoPlay {
  private running = false;
  private anchor: Point | null = null;
  /** Selected enemy, independent of the last cast/lock interrupted by buffs or curses. */
  private focus: string | null = null;
  private focusPriority: Settings['autoPriority'] | null = null;
  private lootAfterKill = false;
  private target: string | null = null;
  private lockedAt = 0;
  private skillUsed = 0;
  private rotateIdx = 0;
  private nextTick = 0;
  private lastBuff = -Infinity;
  private buffTried = new Map<number, number>();
  private curseTried = new Map<string, number>();
  private lastReturn = -Infinity;
  private pausedUntil = 0;
  private bans = new Map<string, number>();
  /** Where we last moved (stall check), the target's Sinh lực when it last dropped, when it became the target, stalls. */
  private moved = { x: 0, y: 0, at: 0 };
  private hurt = { id: '', hp: 0, at: 0 };
  private stalls: number[] = [];
  private lastWalk = -Infinity;
  private picking: { id: string; until: number } | null = null;
  private pickTried = new Map<string, { n: number; at: number }>();
  private fullNoticeAt = -Infinity;
  private lastJunk = 0;
  private level = 0;
  private townStep = 0;
  private townNext = 0;
  private nextTravel = 0;
  private diedAt = 0;
  /** Per stat: until when the last auto potion pumps, when it was drunk, "out of potions" already said. */
  private potion = {
    hp: { until: 0, at: -Infinity, warned: false },
    mp: { until: 0, at: -Infinity, warned: false },
  };

  constructor(private host: AutoHost) {}

  start(): void {
    const self = this.host.self();
    this.running = true;
    // Started before the own character is known (new map): the spot is taken on the first update.
    this.anchor = self ? { x: self.x, y: self.y } : null;
    this.target = null;
    this.focus = null;
    this.lootAfterKill = false;
    this.buffTried.clear();
    this.pickTried.clear();
    this.bans.clear();
    this.picking = null;
    this.nextTick = 0;
    this.level = self?.state.level ?? 0;
    this.townStep = 0;
  }

  stop(): void {
    this.running = false;
    this.anchor = null;
    this.target = null;
    this.focus = null;
    this.lootAfterKill = false;
    this.picking = null;
  }

  /** The player clicked / cast by hand: let them, then carry on. */
  pause(now: number): void {
    this.pausedUntil = now + MANUAL_PAUSE_MS;
    this.target = null;
    this.focus = null;
    this.lootAfterKill = false;
  }

  update(now: number, opts: Settings): void {
    if (!this.running || now < this.nextTick) return;
    this.nextTick = now + TICK_MS;
    const self = this.host.self();
    if (!self) return;
    this.anchor ??= { x: self.x, y: self.y };
    if (isoDistance(self.x, self.y, this.moved.x, this.moved.y) >= STALL_STEP) this.moved = { x: self.x, y: self.y, at: now };
    if (self.state.hp <= 0) {
      if (!opts.autoRevive) { this.host.stop('Trọng thương: đã dừng tự động đánh.'); return; }
      if (!this.diedAt) this.diedAt = now;
      if (now - this.diedAt > REVIVE_AFTER_MS && now >= this.nextTravel) { this.nextTravel = now + TRAVEL_GAP_MS; this.host.respawn(); }
      return;
    }
    this.diedAt = 0;
    if (this.host.safe()) { this.town(now, opts); return; }
    this.townStep = 0;

    // Level up: the bãi luyện công of the new level (jx-web-main Xe on level up).
    if (self.state.level !== this.level) {
      this.level = self.state.level;
      if (opts.autoMap && now >= this.nextTravel) { this.nextTravel = now + TRAVEL_GAP_MS; this.host.train(true); return; }
    }
    const main = this.mainSkill();
    this.drink(now, self, 'hp', opts.autoHp, opts);
    this.drink(now, self, 'mp', opts.autoMp, opts, this.costOf(main));
    if (now < this.pausedUntil) return;
    if ((opts.autoJunk || opts.autoSellBlue) && now - this.lastJunk > JUNK_GAP_MS) { this.lastJunk = now; this.sellJunk(opts); }

    const previous = this.focus ? this.find(this.focus) : undefined;
    if (this.focus && (!previous || previous.state.hp <= 0)) this.lootAfterKill = true;
    const radius = opts.autoSeek ? Infinity : opts.autoRadius;
    const target = this.pickTarget(now, self, radius, opts);
    // Never replace a live combat order with a walk-to-loot order. Loot between kills (or while idle).
    if ((opts.autoPickup || opts.autoMoney) && (!target || this.lootAfterKill)) {
      const near = target ? LOOT_NEAR : opts.autoSeek ? 600 : opts.autoRadius;
      if (this.pick(now, self, near, !!target, opts)) { this.target = null; return; }
    }
    this.lootAfterKill = false;
    this.focus = target?.id ?? null;
    if (opts.autoBuff && this.buff(now, self)) return;
    if (target) {
      if (opts.autoSeek) this.anchor = { x: target.x, y: target.y };
      if (this.stuck(now, self, target, opts)) return;
      if (isoDistance(self.x, self.y, target.x, target.y) > WALK_BEYOND) { this.walkTo(now, target); return; }
      if (opts.autoCurse && this.curse(now, self, target)) return;
      this.attack(now, target, opts);
      return;
    }
    this.target = null;
    if (opts.autoReturn && !opts.autoSeek && isoDistance(self.x, self.y, this.anchor.x, this.anchor.y) > 60 && now - this.lastReturn > RETURN_GAP_MS) {
      this.lastReturn = now;
      this.host.move(this.anchor.x, this.anchor.y);
    }
  }

  // ======================= town round =======================

  /**
   * In town (revived, out of potions, or started there): buy potions, sell junk, then go to the bãi luyện công (autoMap)
   * — one step every TOWN_STEP_MS. Without autoMap, wait in town while retaining the character’s enabled preference.
   */
  private town(now: number, opts: Settings): void {
    if (!opts.autoMap) return;
    if (now < this.townNext) return;
    this.townNext = now + TOWN_STEP_MS;
    switch (this.townStep++) {
      case 0: if (opts.autoBuyPotion) this.buyPotions('hp'); return;
      case 1: if (opts.autoBuyPotion) this.buyPotions('mp'); return;
      case 2: if (opts.autoJunk || opts.autoSellBlue) this.sellJunk(opts); return;
      default:
        if (now >= this.nextTravel) { this.nextTravel = now + TRAVEL_GAP_MS; this.host.train(false); }
    }
  }

  private potionCount(stat: PotionStat): number {
    return this.host.bag().reduce((n, it) => n + (potionTotal(itemDef(it), stat) > 0 ? 1 : 0), 0);
  }

  /** Up to POTION_BUY of the best potion of the drug store whose cost stays within POTION_BUDGET of the money. */
  private buyPotions(stat: PotionStat): void {
    const have = this.potionCount(stat);
    if (have >= POTION_BUY[stat]) return;
    const n = POTION_BUY[stat] - have;
    const budget = this.host.money() * POTION_BUDGET;
    const best = SHOP_ITEMS.drug
      .filter(d => potionTotal(d, stat) > 0 && potionTotal(d, stat === 'hp' ? 'mp' : 'hp') === 0 && d.price * n <= budget)
      .sort((a, b) => potionTotal(b, stat) - potionTotal(a, stat))[0];
    if (!best) { this.host.notice(`Không đủ ngân lượng mua thuốc ${STAT_NAMES[stat]}.`); return; }
    this.host.buy(best.id, n);
  }

  // ======================= potions =======================

  /**
   * Drink a potion for `stat` when it is under `pct` % (Nội lực also under twice `need`, the main skill's cost) and the last
   * one has finished pumping (or the bar is under half of `pct`). The smallest potion that fills what is missing, else the
   * biggest. None left: back to town for more (autoBuyPotion + autoMap).
   */
  private drink(now: number, self: AutoActor, stat: PotionStat, pct: number, opts: Settings, need = 0): void {
    const cur = stat === 'hp' ? self.state.hp : self.state.mp;
    const max = stat === 'hp' ? self.state.maxHp : self.state.maxMp;
    const p = this.potion[stat];
    const low = (pct && cur * 100 < max * pct) || (need > 0 && cur < need * 2);
    if (!low || max <= 0) return;
    const rush = cur * 100 < max * pct / 2 && now - p.at >= POTION_RUSH_GAP_MS;
    if (now < p.until && !rush) return;
    const missing = max - cur;
    let best = -1, bestTotal = 0;
    this.host.bag().forEach((it, i) => {
      const total = potionTotal(itemDef(it), stat);
      if (total <= 0) return;
      const better = best < 0 || (total >= missing ? bestTotal < missing || total < bestTotal : bestTotal < missing && total > bestTotal);
      if (better) { best = i; bestTotal = total; }
    });
    if (best < 0) {
      if (!p.warned) this.host.notice(`Hết thuốc ${STAT_NAMES[stat]} trong hành trang.`);
      p.warned = true;
      if (stat === 'hp' && opts.autoBuyPotion && opts.autoMap && now >= this.nextTravel) {
        this.nextTravel = now + TRAVEL_GAP_MS;
        this.host.notice('Về thành mua thuốc.');
        this.host.goTown();
      }
      return;
    }
    p.warned = false;
    p.at = now;
    p.until = now + potionMs(itemDef(this.host.bag()[best])) + POTION_SLACK_MS;
    this.host.use(best);
  }

  // ======================= skills =======================

  private mainSkill(): number {
    const s = this.host.skillAt('left') ?? BASIC_ATTACK;
    // A hào quang on the left hand is on by itself (C2S.aura), it is not the attack.
    const primary = getSkill(s);
    if (primary && this.host.usable(s) && skillCategory(primary) === 'attack' && !primary.aura) return s;
    for (let key = 0; key < 9; key++) {
      const id = this.host.skillAt(key);
      const skill = id !== null ? getSkill(id) : undefined;
      if (skill && isCastable(skill) && skillCategory(skill) === 'attack' && this.host.usable(skill.id)) return skill.id;
    }
    return BASIC_ATTACK;
  }

  private costOf(id: number): number {
    return this.host.cost(id);
  }

  /** Attack skills of keys 1–9 + the left one, usable with the worn weapon (rotation list). */
  private attackSkills(): number[] {
    const out = new Set<number>([this.mainSkill()]);
    for (let key = 0; key < 9; key++) {
      const id = this.host.skillAt(key);
      const s = id !== null ? getSkill(id) : undefined;
      if (s && isCastable(s) && skillCategory(s) === 'attack' && this.host.usable(s.id)) out.add(s.id);
    }
    return [...out].filter(id => id !== BASIC_ATTACK || out.size === 1);
  }

  /** Lock the target with the main skill, or (rotation, including bosses) the next ready attack skill of the bar. */
  private attack(now: number, target: AutoActor, opts: Settings): void {
    let skill = this.mainSkill();
    if (opts.autoRotate) {
      const list = this.attackSkills().filter(id => this.host.ready(id));
      if (list.length > 1 && (target.id !== this.target || now - this.lockedAt > ROTATE_MS)) {
        this.rotateIdx = (this.rotateIdx + 1) % list.length;
        skill = list[this.rotateIdx];
      } else if (list.length) skill = list.includes(this.skillUsed) ? this.skillUsed : list[0];
    }
    if (!this.host.ready(skill)) skill = this.attackSkills().find(id => id !== BASIC_ATTACK && this.host.ready(id)) ?? BASIC_ATTACK;
    if (target.id !== this.target || skill !== this.skillUsed || now - this.lockedAt > RELOCK_MS) {
      this.host.cast(skill, target, target.x, target.y, true, this.reachOf(skill, opts));
      this.target = target.id;
      this.skillUsed = skill;
      this.lockedAt = now;
    }
  }

  private reachOf(skill: number, opts: Settings): number {
    return approachDistance(this.host.range(skill), this.host.melee(skill), opts);
  }

  /** A far target: walk towards it (the server finds the way round obstacles), the lock comes once it is near. */
  private walkTo(now: number, target: AutoActor): void {
    if (target.id !== this.target) { this.target = target.id; this.skillUsed = 0; }
    if (now - this.lastWalk < WALK_GAP_MS) return;
    this.lastWalk = now;
    this.lockedAt = -Infinity; // lock again as soon as we are near
    this.host.move(target.x, target.y);
  }

  /**
   * Stuck on this target: not moving while out of reach (no way there), or in reach but its Sinh lực does not drop (the
   * hits do not land) → leave it alone for a while; a second stall soon after → step aside from the stuck spot.
   */
  private stuck(now: number, self: AutoActor, target: AutoActor, opts: Settings): boolean {
    if (this.hurt.id !== target.id || target.state.hp < this.hurt.hp) this.hurt = { id: target.id, hp: target.state.hp, at: now };
    const since = Math.max(this.hurt.at, this.pausedUntil);
    const d = isoDistance(self.x, self.y, target.x, target.y);
    const near = d <= this.reachOf(this.mainSkill(), opts) + CLOSE_REACH;
    const stalled = !near && now - this.moved.at > STALL_MS && now - since > STALL_MS;
    const futile = near && now - since > NO_DAMAGE_MS;
    if (!stalled && !futile) return false;
    this.ban(now, target.id);
    this.focus = null;
    this.hurt = { id: '', hp: 0, at: now };
    this.target = null;
    if (stalled) {
      this.stalls = this.stalls.filter(at => now - at < NUDGE_WINDOW_MS);
      this.stalls.push(now);
      if (this.stalls.length >= 2) {
        this.stalls = [];
        // Step aside, away from where we were heading.
        const a = Math.atan2(self.y - target.y, self.x - target.x) + (Math.random() - 0.5) * Math.PI;
        this.host.move(self.x + Math.cos(a) * NUDGE_STEP, self.y + (Math.sin(a) * NUDGE_STEP) / 2);
        this.moved = { x: self.x, y: self.y, at: now };
      }
    }
    return true;
  }

  private ban(now: number, id: string): void {
    this.bans.set(id, now + BAN_MS);
    if (this.bans.size > 50) for (const [k, until] of this.bans) if (until <= now) this.bans.delete(k);
  }

  /** Recast one bùa lợi from keys 1–9 whose state is not on us (auras are toggles: left to the player). */
  private buff(now: number, self: AutoActor): boolean {
    if (now - this.lastBuff < BUFF_GAP_MS) return false;
    const active = new Set(self.state.states ?? []);
    for (let key = 0; key < 9; key++) {
      const id = this.host.skillAt(key);
      const s = id !== null ? getSkill(id) : undefined;
      if (!s || s.aura || !isCastable(s) || skillCategory(s) !== 'buff' || !this.host.usable(s.id)) continue;
      const carriers = [s.id, s.events?.start, s.child].filter((k): k is number => !!k);
      if (carriers.some(k => active.has(k))) continue;
      if (now - (this.buffTried.get(s.id) ?? -Infinity) < BUFF_RETRY_MS) continue;
      this.buffTried.set(s.id, now);
      this.lastBuff = now;
      this.target = null;
      this.hurt.at = now; this.moved.at = now;
      this.host.cast(s.id, undefined, self.x, self.y, false);
      return true;
    }
    return false;
  }

  /** A bùa hại from keys 1–9 on the target when it is a boss or many monsters are around (jx-web-main A6). */
  private curse(now: number, self: AutoActor, target: AutoActor): boolean {
    if (isoDistance(self.x, self.y, target.x, target.y) > CURSE_RANGE) return false;
    if (!target.state.boss) {
      let crowd = 0;
      for (const v of this.host.actors()) if (v.state.kind === 'monster' && v.state.hp > 0 && isoDistance(target.x, target.y, v.x, v.y) < CURSE_RANGE) crowd++;
      if (crowd < CURSE_CROWD) return false;
    }
    const on = new Set(target.state.states ?? []);
    for (let key = 0; key < 9; key++) {
      const id = this.host.skillAt(key);
      const s = id !== null ? getSkill(id) : undefined;
      if (!s || s.aura || !isCastable(s) || skillCategory(s) !== 'debuff' || !this.host.usable(s.id) || !this.host.ready(s.id)) continue;
      if (on.has(s.id) || (s.child && on.has(s.child))) continue;
      const k = `${s.id}|${target.id}`;
      if (now - (this.curseTried.get(k) ?? -Infinity) < CURSE_RETRY_MS) continue;
      this.curseTried.set(k, now);
      if (this.curseTried.size > 200) this.curseTried.clear();
      this.host.cast(s.id, target, target.x, target.y, false);
      this.hurt.at = now; this.moved.at = now;
      this.target = null;
      return true;
    }
    return false;
  }

  // ======================= targets =======================

  private find(id: string): AutoActor | undefined {
    for (const v of this.host.actors()) if (v.id === id) return v;
    return undefined;
  }

  private candidate(v: AutoActor, opts: Settings, now: number): boolean {
    if (v.isSelf || v.state.kind !== 'monster' || v.state.hp <= 0 || DUMMY_SPRITES.has(v.state.sprite)) return false;
    if (opts.autoSkipBoss && v.state.boss) return false;
    if (opts.autoPriority === 'blue' && Number(v.state.boss) >= 2) return false;
    return (this.bans.get(v.id) ?? 0) <= now;
  }

  /** Boss modes finish the selected enemy; nearest mode retains its historical distance hysteresis. */
  private pickTarget(now: number, self: AutoActor, radius: number, opts: Settings): AutoActor | undefined {
    if (this.focusPriority !== opts.autoPriority) { this.focus = null; this.focusPriority = opts.autoPriority; }
    const anchor = this.anchor!;
    let cur = this.focus ? this.find(this.focus) : undefined;
    if (cur && !this.candidate(cur, opts, now)) cur = undefined;
    if (cur && radius !== Infinity && isoDistance(anchor.x, anchor.y, cur.x, cur.y) > radius * 1.5) cur = undefined;
    if (cur && opts.autoPriority !== 'near') return cur;
    let best: AutoActor | undefined, bestD = Infinity, bestRank = -1;
    for (const v of this.host.actors()) {
      if (!this.candidate(v, opts, now)) continue;
      if (radius !== Infinity && isoDistance(anchor.x, anchor.y, v.x, v.y) > radius) continue;
      const d = isoDistance(self.x, self.y, v.x, v.y);
      const rank = opts.autoPriority === 'near' ? 0 : Number(v.state.boss);
      if (rank > bestRank || rank === bestRank && d < bestD) { best = v; bestD = d; bestRank = rank; }
    }
    if (cur && (!best || best.id === cur.id || bestD >= isoDistance(self.x, self.y, cur.x, cur.y) * SWITCH_FACTOR - SWITCH_MARGIN)) return cur;
    return best;
  }

  // ======================= loot =======================

  private wanted(d: AutoDrop, opts: Settings): boolean {
    if (d.def === 'money') return opts.autoMoney;
    if (!opts.autoPickup || findPlace([...this.host.bag()], itemDef({ def: d.def, uid: d.id })) < 0) return false;
    if (opts.autoLoot === 'money') return false;
    if (opts.autoLoot === 'magic') return d.q >= QUALITY.magic;
    return true;
  }

  /**
   * Walk to / take the nearest drop we may take within `near` (of us while fighting, of the spot otherwise); the server walks
   * there. True while busy with one. A drop that stays (bag full, someone else's) is left after PICKUP_TRIES.
   */
  private pick(now: number, self: AutoActor, near: number, fighting: boolean, opts: Settings): boolean {
    const exists = (id: string) => { for (const d of this.host.drops()) if (d.id === id) return true; return false; };
    if (this.picking) {
      if (now < this.picking.until && exists(this.picking.id)) return true;
      const failed = exists(this.picking.id);
      this.picking = null;
      if (failed && now - this.fullNoticeAt > FULL_NOTICE_MS) {
        this.fullNoticeAt = now;
        this.host.notice('Không nhặt được đồ (hành trang đầy hoặc chưa tới lượt): bỏ qua.');
      }
    }
    const from = fighting ? self : this.anchor!;
    let best: AutoDrop | undefined, bestD = Infinity;
    for (const d of this.host.drops()) {
      if ((d.owner && d.owner !== self.id) || !this.wanted(d, opts)) continue;
      const tried = this.pickTried.get(d.id);
      if (tried && (tried.n >= PICKUP_TRIES || now - tried.at < PICKUP_RETRY_MS)) continue;
      if (near !== Infinity && isoDistance(from.x, from.y, d.x, d.y) > near) continue;
      const dist = isoDistance(self.x, self.y, d.x, d.y);
      if (dist < bestD) { best = d; bestD = dist; }
    }
    if (!best) return false;
    const tried = this.pickTried.get(best.id);
    this.pickTried.set(best.id, { n: (tried?.n ?? 0) + 1, at: now });
    if (this.pickTried.size > 200) this.pickTried.clear();
    this.picking = { id: best.id, until: now + PICKUP_WAIT_MS };
    this.host.pickup(best.id);
    return true;
  }

  /** Tự bán đồ thừa: white pieces of equipment the character cannot wear (optionally ordinary blue gear; never gold, potions, books, the token). */
  private sellJunk(opts: Settings): void {
    this.host.bag().forEach((it, i) => {
      const def = itemDef(it);
      if (!it || !def || !KIND_SLOTS[def.kind].length || def.kind === 'horse') return;
      if ((it.q ?? QUALITY.normal) === QUALITY.magic) {
        if (opts.autoSellBlue && (!opts.autoKeepValuable || !botTradeReasons(it).length)) this.host.sell(i);
      } else if (opts.autoJunk && (it.q ?? QUALITY.normal) === QUALITY.normal && !this.host.wearable(def)) this.host.sell(i);
    });
  }
}
