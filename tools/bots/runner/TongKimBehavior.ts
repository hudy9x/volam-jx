import {
  C2S,
  DEFAULT_BOT_TONGKIM,
  DROPS,
  ITEMS,
  MAPS,
  SHOP_ITEMS,
  TK_BATTLE_MAP_ID,
  TK_MAPS,
  TK_SIGNUP_MAP_ID,
  autoAuraSkill,
  autoBuffSkills,
  isInTkSafeCamp,
  isTkBattleMap,
  isoDistance,
  itemDef,
  itemQty,
  potionMs,
  potionTotal,
  roomFor,
  tkMapLayout,
  type BotScenario,
  type BotTongKimTactic,
  type Element,
  type TkCamp,
} from '@vltk/shared';
import type { Behavior, BotClient } from './BotClient.js';
import {
  KIM_LANES_378,
  MARSHAL_SQUAD_COHESION_RADIUS,
  TK_CAMP_DIRECTOR,
  TONG_LANES_378,
  assignSiegeRole,
  assignTkRole,
  buildTacticalLanes,
  computeKitePoint,
  isMarshalRusherSlot,
  scoreTargetUtility,
  type ConcreteTkTactic,
  type Point2D,
  type TkBotRole,
  type TkCampDirector,
  type TkMarshalEndgame,
  type TkSiegeRole,
} from './TkTactics.js';

function legacyLanesFor(battleMapId: number, camp: TkCamp): readonly (readonly Point2D[])[] {
  if (battleMapId === 378) return camp === 'tong' ? TONG_LANES_378 : KIM_LANES_378;
  const cfg = tkMapLayout(battleMapId) ?? TK_MAPS[TK_BATTLE_MAP_ID];
  const mine = cfg[camp];
  const enemy = cfg[camp === 'tong' ? 'kim' : 'tong'];
  const midX = Math.round((mine.gateExit.x + enemy.gateExit.x) / 2);
  const midY = Math.round((mine.gateExit.y + enemy.gateExit.y) / 2);
  const dx = enemy.gateExit.x - mine.gateExit.x;
  const dy = enemy.gateExit.y - mine.gateExit.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = Math.round((-dy / len) * 550);
  const ny = Math.round((dx / len) * 550);
  return [
    [mine.gateExit, { x: midX, y: midY }, enemy.marshal],
    [mine.gateExit, { x: midX + nx, y: midY + ny }, enemy.marshal],
    [mine.gateExit, { x: midX - nx, y: midY - ny }, enemy.marshal],
  ];
}

const OUTGOING_PORTAL_378: Record<TkCamp, { x: number; y: number }> = {
  tong: { x: 3088, y: 9072 },
  kim: { x: 16480, y: 1904 },
};

const BACK_PORTAL_378: Record<TkCamp, { x: number; y: number }> = {
  tong: { x: 4592, y: 8080 },
  kim: { x: 14088, y: 3088 },
};

function outgoingPortalFor(mapId: number, camp: TkCamp): { point: { x: number; y: number }; hasPortal: boolean } {
  const portal = MAPS[mapId]?.portals.find(p => p.id === `tk-${camp}-out`);
  if (portal) return { point: { x: portal.x, y: portal.y }, hasPortal: true };
  if (mapId === 378) return { point: OUTGOING_PORTAL_378[camp], hasPortal: true };
  const cfg = tkMapLayout(mapId);
  if (cfg) return { point: cfg[camp].spawn, hasPortal: false };
  return { point: OUTGOING_PORTAL_378[camp], hasPortal: false };
}

function backPortalFor(mapId: number, camp: TkCamp): { x: number; y: number } {
  const portal = MAPS[mapId]?.portals.find(p => p.id === `tk-${camp}-back`);
  if (portal) return { x: portal.x, y: portal.y };
  if (mapId === 378) return BACK_PORTAL_378[camp];
  const cfg = tkMapLayout(mapId);
  if (cfg) return cfg[camp].gateExit;
  return BACK_PORTAL_378[camp];
}

const KHINH_CONG_ID = 210;

/**
 * Bot PK Chiến trường Tống Kim — Giai đoạn 1 (Non nớt / Naive FSM).
 * Bám sát kiến trúc `thiet-ke-bot-pk-co-ban.md` trên `tools/bots` (Single-Process).
 */
export class TongKimBehavior implements Behavior {
  readonly kind = 'tongkim' as const;
  private nextTeleportAt = 0;
  private nextRegisterAt = 0;
  private nextCampExitAt = 0;
  private nextHpPotionAt = 0;
  private hpTierLast: 0 | 1 | 2 | 3 = 0;
  private nextMpPotionAt = 0;
  private nextBuyAt = 0;
  private nextPickAt = 0;
  private pickTried = new Map<string, number>();
  private nextBuffAt = 0;
  private nextMoveAt = 0;
  private nextCastAt = 0;
  private nextLeaveAt = 0;
  private wpIndex = -1;
  private assignedLane = -1;
  private exitedCampAt = 0;
  private wasInCamp = true;
  private jitter = { x: 0, y: 0 };
  private lastPos = { x: 0, y: 0, at: 0 };
  private atkIndex = 0;
  private lockedTargetId = '';
  private nextEscapeJumpAt = 0;
  private escapeAngleFlip = 1;
  private kiteStrafeSign: 1 | -1 = 1;
  private nextKiteAt = 0;
  private lastHp = -1;
  private dmgStreakStartAt = 0;
  private lastHpDropAt = 0;
  private nextTkItemUseAt = 0;
  private nextClarionAt = 0;
  private nextTrapAt = 0;
  private lastOwnMarshalHp = new Map<string, number>();
  private liveTacticAll: BotTongKimTactic | null = null;
  private liveTacticByCamp: Partial<Record<TkCamp, BotTongKimTactic>> = {};

  constructor(
    private bot: BotClient,
    private sc: BotScenario,
    private botIndex: number,
    private director: TkCampDirector = TK_CAMP_DIRECTOR,
  ) {}

  /** Đổi chiến thuật nóng từ tool bot (IPC) mà không cần khởi động lại bot. */
  setLiveTactic(tactic: BotTongKimTactic | null, camp?: TkCamp): void {
    if (camp) {
      if (tactic) this.liveTacticByCamp[camp] = tactic;
      else delete this.liveTacticByCamp[camp];
    } else {
      this.liveTacticAll = tactic;
    }
    this.assignedLane = -1;
    this.wpIndex = -1;
  }

  /** Chiến thuật thực tế đang áp dụng cho phe hiện tại (giải quyết `random` ổn định theo trận). */
  effectiveTactic(mapId: number, camp: TkCamp): ConcreteTkTactic {
    const raw = this.liveTacticByCamp[camp]
      ?? this.liveTacticAll
      ?? this.sc.tongkim?.tactic
      ?? DEFAULT_BOT_TONGKIM.tactic;
    if (raw !== 'random') return raw;
    const matchKey = `${mapId}:${this.bot.tkState?.mode ?? 1}`;
    return this.director.resolveRandomTactic(mapId, camp, matchKey, this.bot.rand);
  }

  onMap(now: number): void {
    this.wpIndex = -1;
    this.assignedLane = -1;
    this.exitedCampAt = 0;
    this.wasInCamp = true;
    this.lockedTargetId = '';
    this.lastPos = { x: 0, y: 0, at: now };
    this.lastHp = -1;
    this.dmgStreakStartAt = 0;
    this.lastHpDropAt = 0;
    this.rollJitter();
  }

  private rollJitter(): void {
    this.jitter = {
      x: Math.round((this.bot.rand() - 0.5) * 300),
      y: Math.round((this.bot.rand() - 0.5) * 160),
    };
  }

  update(now: number): void {
    const me = this.bot.me();
    if (!me) return;

    // 1. Nếu chưa ở map báo danh (323) hoặc chiến trường -> dịch chuyển tới 323.
    const battleMapId = this.bot.tkState?.battleMapId ?? TK_BATTLE_MAP_ID;
    if (this.bot.mapId !== TK_SIGNUP_MAP_ID && this.bot.mapId !== battleMapId && !isTkBattleMap(this.bot.mapId)) {
      if (me.hp <= 0) { this.bot.reviveIfDead(now, 2000); return; }
      if (now >= this.nextTeleportAt) {
        this.nextTeleportAt = now + 4000;
        this.bot.send(C2S.teleport, { mapId: TK_SIGNUP_MAP_ID });
      }
      return;
    }

    // 2. Ở điểm báo danh (323): chờ trận mở -> tự cân bằng phe và báo danh vào 378.
    if (this.bot.mapId === TK_SIGNUP_MAP_ID) {
      this.restockPotionsInCamp(now);
      const st = this.bot.tkState;
      if (!st || (st.phase !== 'signup' && st.phase !== 'fighting')) return;
      if (now >= this.nextRegisterAt) {
        this.nextRegisterAt = now + 2500 + this.bot.rand() * 1000;
        const pref = this.sc.tongkim?.campPreference ?? DEFAULT_BOT_TONGKIM.campPreference;
        const camp: TkCamp = pref !== 'auto'
          ? pref
          : st.tongCount < st.kimCount ? 'tong'
          : st.kimCount < st.tongCount ? 'kim'
          : (this.botIndex % 2 === 0 ? 'tong' : 'kim');
        this.bot.send(C2S.tkAction, { op: 'register', camp });
      }
      return;
    }

    // 3. Ở chiến trường Xung phong (378):
    const st = this.bot.tkState;
    if (st?.phase === 'ended' || st?.phase === 'closed') {
      if (now >= this.nextLeaveAt) {
        this.nextLeaveAt = now + 1200;
        this.bot.send(C2S.tkAction, { op: 'leave' });
      }
      return;
    }

    // Đang trọng thương -> chờ server tự hồi sinh sau 5s tại Hậu doanh.
    if (me.hp <= 0) {
      this.lockedTargetId = '';
      this.wpIndex = -1;
      this.assignedLane = -1;
      this.wasInCamp = true;
      this.lastHp = 0;
      this.dmgStreakStartAt = 0;
      return;
    }

    // Theo dõi chuỗi nhận sát thương liên tục
    this.trackDamageStreak(me, now);

    const myCamp = (me.battleCamp || st?.me?.camp || (this.botIndex % 2 === 0 ? 'tong' : 'kim')) as TkCamp;
    const inCamp = !!st?.me?.inCamp || isInTkSafeCamp(battleMapId, me.x, me.y);

    // Bơm máu / nội lực (Survival Loop) & dùng vật phẩm Tống Kim khi ở trong Hậu doanh (mở Bí Bảo, buff trước)
    this.upkeepPotions(me, now);
    if (inCamp) this.useTkBagItems(me, true, 'none', now);

    // Giữ hào quang & bùa lợi
    this.upkeepBuffs(me, now);

    // Đang ở trong Hậu doanh an toàn
    if (inCamp) {
      this.lockedTargetId = '';
      this.wpIndex = -1;
      this.assignedLane = -1;
      this.wasInCamp = true;
      this.restockPotionsInCamp(now);
      if (!st || st.phase !== 'fighting' || (st.me?.gateWaitSec ?? 0) > 0) return;
      if (now >= this.nextCampExitAt) {
        this.nextCampExitAt = now + 2200 + this.bot.rand() * 800;
        const { point: p, hasPortal } = outgoingPortalFor(this.bot.mapId, myCamp);
        this.bot.send(C2S.move, { x: p.x, y: p.y });
        if (!hasPortal || isoDistance(me.x, me.y, p.x, p.y) < 150) {
          this.bot.send(C2S.tkAction, { op: 'exitGate' });
        }
      }
      return;
    }

    if (st && st.phase !== 'fighting') return;

    if (this.wasInCamp) {
      this.wasInCamp = false;
      this.exitedCampAt = now;
    }

    const tactic = this.effectiveTactic(this.bot.mapId, myCamp);
    const faction = me.faction ?? this.bot.stats?.faction;
    const role: TkBotRole = assignTkRole(this.botIndex, faction);
    const siegeRole: TkSiegeRole = assignSiegeRole(this.botIndex, faction);
    let endgame: TkMarshalEndgame = 'none';
    if (tactic !== 'charge') {
      const cfg = tkMapLayout(this.bot.mapId) ?? TK_MAPS[TK_BATTLE_MAP_ID];
      const myMarshalAlive = myCamp === 'tong' ? !!st?.tongMarshalAlive : !!st?.kimMarshalAlive;
      const enemyMarshalAlive = myCamp === 'tong' ? !!st?.kimMarshalAlive : !!st?.tongMarshalAlive;
      const isRusher = !!st && st.mode === 1 && !!st.marshalSpawned && !myMarshalAlive && enemyMarshalAlive && isMarshalRusherSlot(this.botIndex);
      this.director.reportBot(this.bot.mapId, myCamp, {
        id: me.id ?? this.bot.name,
        x: me.x,
        y: me.y,
        lane: this.assignedLane,
        role,
        exitedAt: this.exitedCampAt,
        seenAt: now,
        isRusher,
        siegeRole,
      });
      endgame = this.director.resolveMarshalEndgame(this.bot.mapId, myCamp, st, this.botIndex, cfg[myCamp].marshal, now);
      if (tactic === 'tactical' || tactic === 'defend') {
        this.scanOwnMarshalThreat(myCamp, now);
      }
    }

    // Dùng vật phẩm Tống Kim (bật sẵn buff tại điểm tập kết, giữ Bẫy/Hiệu Phù khi giao tranh thật sự)
    this.useTkBagItems(me, inCamp, endgame, now);

    // 3b. Đang bay Khinh công -> chờ tiếp đất rồi mới hành động tiếp.
    if ((me.jumpMs ?? 0) > 0 || me.anim === 'jump') return;

    // 3c. Khinh công thoát vây công (>= 3 địch gần) hoặc bị đánh mất máu liên tục trong 2s.
    if (this.tryEscapeJump(me, myCamp, now)) return;

    // 3d. Còn ít bình máu (<= 2) và có tiền + chỗ trống -> chạy về cổng Hậu doanh mua máu rồi quay lại (bỏ qua khi đang cảm tử diệt Soái).
    if (this.retreatToBuyPotions(myCamp, endgame, now)) return;

    // 3e. Chiến thuật tổng hợp: rút về cụm đồng đội khi bị áp đảo quân số (1 vs 3+) và máu dưới 55%.
    if (tactic === 'tactical' && endgame === 'none' && this.tryTacticalFallback(me, myCamp, role, now)) return;

    // 4. Giao tranh ngoài tiền tuyến: tìm mục tiêu phe địch ưu tiên.
    const scanRadius = this.sc.tongkim?.scanRadius ?? DEFAULT_BOT_TONGKIM.scanRadius;
    const target = this.pickTarget(me, myCamp, scanRadius, tactic, endgame, siegeRole, now);
    // Nhặt vật phẩm Tống Kim rơi trong tầm (song song khi giao tranh) hoặc chạy tới nhặt khi không có địch.
    if (this.pickupTkDrops(me, now, !!target || endgame !== 'none')) return;
    if (target) {
      if (this.bot.prepareCombat(now)) return;
      const attacks = this.bot.attacks();
      const skill = attacks.length ? attacks[this.atkIndex++ % attacks.length] : 1;
      const range = Math.max(60, this.bot.range(skill));
      // Thả diều (kiting) cho phái tầm xa trong chế độ Chiến thuật tổng hợp.
      if (tactic === 'tactical' && endgame !== 'rush_enemy_marshal' && range >= 240 && this.tryRangeKite(me, target, myCamp, range, now)) {
        return;
      }
      if (this.bot.ready(skill, now) && now >= this.nextCastAt) {
        this.nextCastAt = now + 260;
        const reach = Math.max(48, Math.round(range * 0.85));
        this.bot.cast(skill, target.id, target.x, target.y, true, reach);
      }
      return;
    }

    // 5. Không thấy địch -> điều quân theo chiến thuật đang chọn.
    if (tactic === 'charge') {
      this.advanceWaypoints(me, myCamp, now);
    } else {
      this.advanceTactical(me, myCamp, tactic, role, siegeRole, endgame, now);
    }
  }

  private countPotions(stat: 'hp' | 'mp'): number {
    let total = 0;
    for (const it of this.bot.bag) {
      const def = itemDef(it);
      if (def && potionTotal(def, stat) > 0) total += itemQty(it);
    }
    return total;
  }

  private restockPotionsInCamp(now: number): void {
    if (now < this.nextBuyAt) return;
    const needHp = Math.max(0, 50 - this.countPotions('hp'));
    const needMp = Math.max(0, 15 - this.countPotions('mp'));
    if (needHp === 0 && needMp === 0) return;

    const tryBuy = (stat: 'hp' | 'mp', want: number): boolean => {
      if (want <= 0) return false;
      const budget = Math.floor(this.bot.money * 0.6);
      const other = stat === 'hp' ? 'mp' : 'hp';
      const cand = SHOP_ITEMS.drug
        .filter(d => potionTotal(d, stat) > 0 && potionTotal(d, other) === 0 && d.price > 0 && d.price <= budget && roomFor(this.bot.bag, d, 1) > 0)
        .sort((a, b) => potionTotal(b, stat) - potionTotal(a, stat))[0];
      if (!cand) return false;
      const room = roomFor(this.bot.bag, cand, want);
      const qty = Math.min(want, room, Math.floor(budget / cand.price));
      if (qty <= 0) return false;
      this.nextBuyAt = now + 2500;
      this.bot.send(C2S.buy, { item: cand.id, count: qty });
      return true;
    };

    if (!tryBuy('hp', needHp)) tryBuy('mp', needMp);
  }

  private upkeepPotions(me: any, now: number): void {
    const baseThreshold = Math.max(0.8, this.sc.tongkim?.hpHealThreshold ?? DEFAULT_BOT_TONGKIM.hpHealThreshold);
    const hpRatio = me.maxHp > 0 ? me.hp / me.maxHp : 1;
    const mpRatio = me.maxMp > 0 ? me.mp / me.maxMp : 1;

    // Bơm máu 3 lớp: Lớp 1 (<80%) bơm 1 bình theo nhịp hồi; Lớp 2 (<50%) bơm nhanh (1s); Lớp 3 (<30%) bơm liên tục 2 bình (0.8s).
    const hpTier: 0 | 1 | 2 | 3 = hpRatio < 0.30 ? 3 : hpRatio < 0.50 ? 2 : hpRatio < baseThreshold ? 1 : 0;
    if (hpTier === 0) this.hpTierLast = 0;
    const tierEscalated = hpTier > this.hpTierLast;
    const needHp = hpTier > 0 && (now >= this.nextHpPotionAt || tierEscalated);
    const needMp = mpRatio < 0.35 && (now >= this.nextMpPotionAt || mpRatio < 0.18);
    if (!needHp && !needMp) return;

    const pickPotion = (stat: 'hp' | 'mp', preferLargest: boolean, skipSlot = -1): { index: number; def: NonNullable<ReturnType<typeof itemDef>>; qty: number } | null => {
      const missing = stat === 'hp' ? Math.max(1, me.maxHp - me.hp) : Math.max(1, me.maxMp - me.mp);
      let best: { index: number; def: NonNullable<ReturnType<typeof itemDef>>; qty: number; score: number } | null = null;
      for (let i = 0; i < this.bot.bag.length; i++) {
        if (i === skipSlot) continue;
        const item = this.bot.bag[i];
        const def = itemDef(item);
        if (!def) continue;
        const heal = potionTotal(def, stat);
        if (heal <= 0) continue;
        const score = preferLargest
          ? -heal
          : heal >= missing ? heal - missing : 1_000_000 - heal;
        if (!best || score < best.score) {
          best = { index: i, def, qty: itemQty(item), score };
        }
      }
      return best;
    };

    if (needHp) {
      const preferLargest = hpTier >= 2;
      const first = pickPotion('hp', preferLargest);
      if (first) {
        this.hpTierLast = hpTier;
        const ms = hpTier === 3 ? 800 : hpTier === 2 ? 1000 : Math.max(900, potionMs(first.def) + 250);
        this.nextHpPotionAt = now + ms;
        this.bot.send(C2S.use, { index: first.index });
        if (hpTier === 3) {
          if (first.qty >= 2) {
            this.bot.send(C2S.use, { index: first.index });
          } else {
            const second = pickPotion('hp', true, first.index);
            if (second) this.bot.send(C2S.use, { index: second.index });
          }
        }
        return;
      }
    }

    if (needMp) {
      const mp = pickPotion('mp', mpRatio < 0.18);
      if (mp) {
        this.nextMpPotionAt = now + Math.max(900, potionMs(mp.def) + 250);
        this.bot.send(C2S.use, { index: mp.index });
      }
    }
  }

  private pickupTkDrops(me: any, now: number, hasTarget: boolean): boolean {
    const drops = this.bot.host.drops();
    let bestInRange: { id: string; dist: number } | null = null;
    let bestNearby: { id: string; x: number; y: number; dist: number } | null = null;

    for (const d of drops) {
      if (d.owner && d.owner !== me.id) continue;
      const triedAt = this.pickTried.get(d.id);
      if (triedAt && now - triedAt < 2500) continue;
      const isMoney = d.def === 'money';
      const def = isMoney ? undefined : ITEMS[d.def];
      if (!isMoney && (!def || roomFor(this.bot.bag, def, d.q || 1) <= 0)) continue;

      const isTkDrop = d.def.startsWith('tk-') || !!def?.tkItem;
      const dist = isoDistance(me.x, me.y, d.x, d.y);
      if (dist <= DROPS.pickupRange && (!bestInRange || dist < bestInRange.dist)) {
        bestInRange = { id: d.id, dist };
      } else if (!hasTarget && (isTkDrop || isMoney) && dist <= 480 && (!bestNearby || dist < bestNearby.dist)) {
        bestNearby = { id: d.id, x: d.x, y: d.y, dist };
      }
    }

    if (bestInRange && now >= this.nextPickAt) {
      this.nextPickAt = now + 450;
      this.pickTried.set(bestInRange.id, now);
      if (this.pickTried.size > 200) this.pickTried.clear();
      this.bot.send(C2S.pickup, { id: bestInRange.id });
      return false;
    }

    if (!hasTarget && bestNearby) {
      if (now >= this.nextMoveAt) {
        this.nextMoveAt = now + 600;
        this.bot.send(C2S.move, { x: bestNearby.x, y: bestNearby.y });
      }
      return true;
    }
    return false;
  }

  private upkeepBuffs(me: any, now: number): void {
    if (!this.bot.autoSettings.autoBuff || now < this.nextBuffAt) return;
    const learned = Object.keys(this.bot.levels).map(Number).filter(id => this.bot.levelOf(id) > 0);
    const aura = autoAuraSkill(learned, id => this.bot.usable(id));
    this.bot.host.aura(aura);
    const active = new Set<number>([...(me.states ?? [])]);
    for (const id of autoBuffSkills(learned)) {
      if (active.has(id) || !this.bot.ready(id, now)) continue;
      this.nextBuffAt = now + 900;
      this.bot.cast(id, undefined, me.x, me.y, false);
      return;
    }
  }

  private pickTarget(
    me: any,
    myCamp: TkCamp,
    scanRadius: number,
    tactic: ConcreteTkTactic,
    endgame: TkMarshalEndgame,
    siegeRole: TkSiegeRole,
    now: number,
  ): { id: string; x: number; y: number } | null {
    // Đang tập kết tại điểm Nguyên Soái phe mình vừa chết -> bỏ qua địch để gom đủ quân cho Đợt công thành.
    if (endgame === 'rally_for_rush') {
      this.lockedTargetId = '';
      return null;
    }

    const actors = this.bot.actors();
    const useUtility = tactic === 'tactical' || tactic === 'defend' || endgame === 'defend_marshal' || (endgame === 'rush_enemy_marshal' && siegeRole === 'breacher');
    const mySeries = (this.bot.stats?.series ?? (me.series as Element | undefined)) as Element | undefined;
    const cfg = tkMapLayout(this.bot.mapId) ?? TK_MAPS[TK_BATTLE_MAP_ID];
    const myMarshal = cfg[myCamp].marshal;
    const myDistToMarshal = isoDistance(me.x, me.y, myMarshal.x, myMarshal.y);
    const alert = useUtility ? this.director.getMarshalAlert(this.bot.mapId, myCamp, now) : null;
    const focus = tactic === 'tactical' && endgame === 'none' ? this.director.getFocusTarget(this.bot.mapId, myCamp, now) : null;

    let bestLegacy: { id: string; x: number; y: number; tier: number; dist: number } | null = null;
    let bestUtil: { id: string; x: number; y: number; score: number; hpRatio: number; isPriority: boolean } | null = null;
    let selfDefenseTarget: { id: string; x: number; y: number; dist: number } | null = null;

    for (const a of actors) {
      if (a.isSelf || a.state.hp <= 0) continue;
      const raw = (this.bot.room?.state as any)?.actors?.get(a.id);
      if (raw?.stealth) continue;
      const otherCamp = raw?.battleCamp as string | undefined;
      if (!otherCamp || otherCamp === myCamp) continue;
      if (isInTkSafeCamp(this.bot.mapId, a.x, a.y)) continue;
      const dist = isoDistance(me.x, me.y, a.x, a.y);
      if (dist > scanRadius) continue;

      const isMarshal = a.state.kind === 'monster' && Number(a.state.boss) >= 2;

      // Nhóm 70% công thành (phân 3 tiểu đội: slayer / support / breacher):
      if (endgame === 'rush_enemy_marshal') {
        if (isMarshal) {
          this.lockedTargetId = a.id;
          return { id: a.id, x: a.x, y: a.y };
        }
        if (siegeRole === 'slayer') {
          // Sát thủ Soái: bỏ qua địch ở xa, chỉ đánh trả tự vệ nếu bị áp sát <= 160 px.
          if (dist <= 160 && (!selfDefenseTarget || dist < selfDefenseTarget.dist)) {
            selfDefenseTarget = { id: a.id, x: a.x, y: a.y, dist };
          }
          continue;
        }
        if (siegeRole === 'support') {
          // Nga Mi hỗ trợ: chỉ đánh trả nếu địch áp sát <= 280 px, ưu tiên bám cụm đồng đội.
          if (dist <= 280 && (!selfDefenseTarget || dist < selfDefenseTarget.dist)) {
            selfDefenseTarget = { id: a.id, x: a.x, y: a.y, dist };
          }
          continue;
        }
        // `breacher` (Mở đường): rơi xuống `scoreTargetUtility` để chủ động đánh & khống chế bot địch chắn đường!
      }

      // Phe còn Nguyên Soái đang dồn về thủ Soái: bỏ qua địch ngoài vùng bảo vệ nếu bản thân còn xa Soái nhà.
      if (endgame === 'defend_marshal') {
        const enemyDistToMarshal = isoDistance(a.x, a.y, myMarshal.x, myMarshal.y);
        if (myDistToMarshal > 900 && enemyDistToMarshal > 950) continue;
      }

      if (!useUtility) {
        // Trọng số ưu tiên cũ: Nguyên Soái (0) > Người chơi (1) > Tướng/Boss Xanh (2) > Binh sĩ (3)
        const isPlayer = a.state.kind === 'player';
        const isOfficer = a.state.kind === 'monster' && Number(a.state.boss) === 1;
        const tier = isMarshal ? 0 : isPlayer ? 1 : isOfficer ? 2 : 3;
        const lockedBonus = a.id === this.lockedTargetId ? -120 : 0;

        if (!bestLegacy || tier < bestLegacy.tier || (tier === bestLegacy.tier && dist + lockedBonus < bestLegacy.dist)) {
          bestLegacy = { id: a.id, x: a.x, y: a.y, tier, dist: dist + lockedBonus };
        }
        continue;
      }

      const maxHp = Math.max(1, Number(a.state.maxHp || raw?.maxHp || a.state.hp || 1));
      const hp = Number(a.state.hp || 0);
      const boss = Number(a.state.boss || 0);
      const series = (raw?.series as Element | undefined);
      const score = scoreTargetUtility(
        { id: a.id, x: a.x, y: a.y, dist, hp, maxHp, kind: a.state.kind === 'player' ? 'player' : 'monster', boss, series },
        {
          mySeries,
          lockedTargetId: this.lockedTargetId,
          focusTargetId: focus?.id,
          myMarshal,
          marshalThreatened: !!alert || endgame === 'defend_marshal',
          defending: tactic === 'defend' || endgame === 'defend_marshal',
        },
      );
      if (!bestUtil || score > bestUtil.score) {
        bestUtil = {
          id: a.id,
          x: a.x,
          y: a.y,
          score,
          hpRatio: hp / maxHp,
          isPriority: a.state.kind === 'player' || boss >= 1,
        };
      }
    }

    if (endgame === 'rush_enemy_marshal' && siegeRole !== 'breacher') {
      this.lockedTargetId = selfDefenseTarget?.id ?? '';
      return selfDefenseTarget ? { id: selfDefenseTarget.id, x: selfDefenseTarget.x, y: selfDefenseTarget.y } : null;
    }

    if (!useUtility) {
      this.lockedTargetId = bestLegacy?.id ?? '';
      return bestLegacy ? { id: bestLegacy.id, x: bestLegacy.x, y: bestLegacy.y } : null;
    }

    if (bestUtil && bestUtil.isPriority && bestUtil.hpRatio < 0.42) {
      this.director.reportFocusTarget(this.bot.mapId, myCamp, {
        id: bestUtil.id,
        x: bestUtil.x,
        y: bestUtil.y,
        hpRatio: bestUtil.hpRatio,
        at: now,
      });
    }
    this.lockedTargetId = bestUtil?.id ?? '';
    return bestUtil ? { id: bestUtil.id, x: bestUtil.x, y: bestUtil.y } : null;
  }

  private scanOwnMarshalThreat(myCamp: TkCamp, now: number): void {
    const cfg = tkMapLayout(this.bot.mapId) ?? TK_MAPS[TK_BATTLE_MAP_ID];
    const marshalPos = cfg[myCamp].marshal;
    let marshalHpRatio = 1;
    let marshalHp = -1;
    let enemyNearMarshal = 0;

    for (const a of this.bot.actors()) {
      if (a.state.hp <= 0) continue;
      const raw = (this.bot.room?.state as any)?.actors?.get(a.id);
      if (raw?.stealth) continue;
      const camp = raw?.battleCamp as string | undefined;
      if (camp === myCamp && a.state.kind === 'monster' && Number(a.state.boss) >= 2) {
        const maxHp = Math.max(1, Number(a.state.maxHp || raw?.maxHp || 1));
        marshalHp = a.state.hp;
        marshalHpRatio = a.state.hp / maxHp;
      } else if (camp && camp !== myCamp && !isInTkSafeCamp(this.bot.mapId, a.x, a.y)) {
        if (isoDistance(a.x, a.y, marshalPos.x, marshalPos.y) <= 680) {
          enemyNearMarshal++;
        }
      }
    }

    const key = `${this.bot.mapId}:${myCamp}`;
    const prevHp = this.lastOwnMarshalHp.get(key);
    const hpJustDropped = marshalHp >= 0 && prevHp !== undefined && marshalHp < prevHp;
    if (marshalHp >= 0) this.lastOwnMarshalHp.set(key, marshalHp);

    if (enemyNearMarshal > 0 || hpJustDropped) {
      this.director.reportMarshalThreat(this.bot.mapId, myCamp, {
        x: marshalPos.x,
        y: marshalPos.y,
        hpRatio: marshalHpRatio,
        enemyCount: enemyNearMarshal,
        at: now,
      });
    }
  }

  private findNearestAllyCluster(me: any, myCamp: TkCamp, maxRange = 1600): Point2D | null {
    const allies: Point2D[] = [];
    for (const a of this.bot.actors()) {
      if (a.isSelf || a.state.hp <= 0 || a.state.kind !== 'player') continue;
      const raw = (this.bot.room?.state as any)?.actors?.get(a.id);
      if (raw?.battleCamp !== myCamp) continue;
      if (isInTkSafeCamp(this.bot.mapId, a.x, a.y)) continue;
      if (isoDistance(me.x, me.y, a.x, a.y) <= maxRange) {
        allies.push({ x: a.x, y: a.y });
      }
    }
    if (!allies.length) return null;
    let best: Point2D = allies[0];
    let bestNeighbors = -1;
    for (const p of allies) {
      let neighbors = 0;
      for (const q of allies) {
        if (isoDistance(p.x, p.y, q.x, q.y) <= 450) neighbors++;
      }
      if (neighbors > bestNeighbors) {
        bestNeighbors = neighbors;
        best = p;
      }
    }
    return best;
  }

  private tryTacticalFallback(me: any, myCamp: TkCamp, role: TkBotRole, now: number): boolean {
    if (role === 'guard') return false;
    const hpRatio = me.maxHp > 0 ? me.hp / me.maxHp : 1;
    if (hpRatio >= 0.55) return false;
    let enemies = 0;
    let allies = 0;
    for (const a of this.bot.actors()) {
      if (a.isSelf || a.state.hp <= 0) continue;
      const raw = (this.bot.room?.state as any)?.actors?.get(a.id);
      const camp = raw?.battleCamp as string | undefined;
      if (!camp || isInTkSafeCamp(this.bot.mapId, a.x, a.y)) continue;
      const d = isoDistance(me.x, me.y, a.x, a.y);
      if (camp === myCamp && a.state.kind === 'player' && d <= 450) allies++;
      else if (camp !== myCamp && d <= 380) enemies++;
    }
    if (enemies < 3 || allies > 0) return false;
    if (now >= this.nextMoveAt) {
      this.nextMoveAt = now + 650;
      const anchor = this.findNearestAllyCluster(me, myCamp) ?? backPortalFor(this.bot.mapId, myCamp);
      this.bot.send(C2S.move, { x: anchor.x, y: anchor.y });
    }
    return true;
  }

  private tryRangeKite(me: any, target: { id: string; x: number; y: number }, myCamp: TkCamp, range: number, now: number): boolean {
    if (now < this.nextKiteAt || now < this.nextMoveAt) return false;
    const dist = isoDistance(me.x, me.y, target.x, target.y);
    const dangerDist = Math.min(185, Math.round(range * 0.45));
    if (dist >= dangerDist) return false;
    const anchor = this.findNearestAllyCluster(me, myCamp, 1200) ?? backPortalFor(this.bot.mapId, myCamp);
    const kiteTo = computeKitePoint(me, target, anchor, 220, this.kiteStrafeSign);
    this.kiteStrafeSign = this.kiteStrafeSign === 1 ? -1 : 1;
    this.nextKiteAt = now + 1150;
    this.nextMoveAt = now + 550;
    this.bot.send(C2S.move, { x: kiteTo.x, y: kiteTo.y });
    return true;
  }

  private advanceWaypoints(me: any, myCamp: TkCamp, now: number): void {
    const lanes = legacyLanesFor(this.bot.mapId, myCamp);
    const list = lanes[this.botIndex % lanes.length];
    this.followLane(me, list, now);
  }

  private advanceTactical(me: any, myCamp: TkCamp, tactic: ConcreteTkTactic, role: TkBotRole, siegeRole: TkSiegeRole, endgame: TkMarshalEndgame, now: number): void {
    const cfg = tkMapLayout(this.bot.mapId) ?? TK_MAPS[TK_BATTLE_MAP_ID];
    const mine = cfg[myCamp];
    const enemy = cfg[myCamp === 'tong' ? 'kim' : 'tong'];

    // 0a. Chiến lược Nguyên Soái: phe mình còn Soái, phe địch mất Soái -> 100% dồn về bảo vệ Nguyên Soái phe mình.
    if (endgame === 'defend_marshal') {
      const angle = ((this.botIndex % 12) / 12) * Math.PI * 2;
      const ring = 180 + (this.botIndex % 3) * 65;
      const gx = Math.round(mine.marshal.x + Math.cos(angle) * ring + Math.round(this.jitter.x * 0.3));
      const gy = Math.round(mine.marshal.y + Math.sin(angle) * ring * 0.5 + Math.round(this.jitter.y * 0.3));
      if (isoDistance(me.x, me.y, gx, gy) > 180 && now >= this.nextMoveAt) {
        this.nextMoveAt = now + 750;
        this.bot.send(C2S.move, { x: gx, y: gy });
      }
      return;
    }

    // 0b. Chiến lược Nguyên Soái: phe mình mất Soái -> nhóm 70% tập kết thành Đợt tại điểm Nguyên Soái phe mình trước.
    if (endgame === 'rally_for_rush') {
      const angle = ((this.botIndex % 14) / 14) * Math.PI * 2;
      const ring = 90 + (this.botIndex % 3) * 45;
      const rx = Math.round(mine.marshal.x + Math.cos(angle) * ring);
      const ry = Math.round(mine.marshal.y + Math.sin(angle) * ring * 0.5);
      if (isoDistance(me.x, me.y, rx, ry) > 120 && now >= this.nextMoveAt) {
        this.nextMoveAt = now + 750;
        this.bot.send(C2S.move, { x: rx, y: ry });
      }
      return;
    }

    // 0c. Đợt công thành (Wave): hành quân bọc sườn theo Đội trưởng (luân phiên cánh Trái/Phải) -> đồng loạt ập vào Soái địch.
    if (endgame === 'rush_enemy_marshal') {
      const wave = this.director.getSiegeWave(this.bot.mapId, myCamp, enemy.marshal, now);
      const myId = me.id ?? this.bot.name;
      const isLeader = wave.leaderId === myId;

      // Tiểu đội Hỗ trợ (Nga Mi): bám giữa đội hình / Đội trưởng để phủ hào quang & Chiến Cổ.
      if (siegeRole === 'support') {
        const anchor = wave.leaderPos ?? this.findNearestAllyCluster(me, myCamp, 2400) ?? enemy.marshal;
        if (isoDistance(me.x, me.y, anchor.x, anchor.y) > 200 && now >= this.nextMoveAt) {
          this.nextMoveAt = now + 750;
          this.bot.send(C2S.move, { x: anchor.x + Math.round(this.jitter.x * 0.35), y: anchor.y + Math.round(this.jitter.y * 0.35) });
        }
        return;
      }

      // Trên đường hành quân bọc sườn (!wave.engaged): đồng đội giữ đội hình quanh Đội trưởng, không chạy vọt lên lẻ nạp mạng.
      if (!wave.engaged && !isLeader && wave.leaderPos) {
        const distToLeader = isoDistance(me.x, me.y, wave.leaderPos.x, wave.leaderPos.y);
        const myDistEnemy = isoDistance(me.x, me.y, enemy.marshal.x, enemy.marshal.y);
        const leaderDistEnemy = isoDistance(wave.leaderPos.x, wave.leaderPos.y, enemy.marshal.x, enemy.marshal.y);
        const tooFarAhead = myDistEnemy + 240 < leaderDistEnemy;
        const tooFarBehind = distToLeader > MARSHAL_SQUAD_COHESION_RADIUS;
        if (tooFarAhead || tooFarBehind) {
          if (now >= this.nextMoveAt) {
            this.nextMoveAt = now + 750;
            this.bot.send(C2S.move, {
              x: wave.leaderPos.x + Math.round(this.jitter.x * 0.4),
              y: wave.leaderPos.y + Math.round(this.jitter.y * 0.4),
            });
          }
          return;
        }
      }

      // Khi đã vào vùng công thành (wave.engaged) -> dồn thẳng vào Nguyên Soái địch; chưa vào -> đi theo cánh bọc sườn của Wave.
      if (wave.engaged) {
        if (isoDistance(me.x, me.y, this.lastPos.x, this.lastPos.y) > 25) {
          this.lastPos = { x: me.x, y: me.y, at: now };
        } else if (now - this.lastPos.at > 3500) {
          this.lastPos.at = now;
          this.rollJitter();
        }
        if (now >= this.nextMoveAt) {
          this.nextMoveAt = now + 750;
          this.bot.send(C2S.move, {
            x: enemy.marshal.x + Math.round(this.jitter.x * 0.45),
            y: enemy.marshal.y + Math.round(this.jitter.y * 0.45),
          });
        }
        return;
      }

      const lanes = buildTacticalLanes(this.bot.mapId, myCamp);
      const flankLane = lanes[wave.lane] ?? lanes[0];
      if (this.assignedLane !== wave.lane) {
        this.assignedLane = wave.lane;
        this.wpIndex = -1;
      }
      this.followLane(me, flankLane, now);
      return;
    }

    // 1. Phản ứng cứu Nguyên Soái nhà khi có cảnh báo (ưu tiên nhóm Hộ vệ hoặc bot đứng gần sân nhà).
    if (tactic === 'tactical' || tactic === 'defend') {
      const alert = this.director.getMarshalAlert(this.bot.mapId, myCamp, now);
      if (alert && (tactic === 'defend' || role === 'guard' || isoDistance(me.x, me.y, alert.x, alert.y) <= 2600)) {
        if (now >= this.nextMoveAt) {
          this.nextMoveAt = now + 750;
          this.bot.send(C2S.move, { x: alert.x + this.jitter.x, y: alert.y + this.jitter.y });
        }
        return;
      }
    }

    // 2. Chế độ Thủ Soái phản công: giữ tuyến phòng thủ quanh Nguyên Soái & 35% sân nhà.
    if (tactic === 'defend') {
      const dx = enemy.marshal.x - mine.marshal.x;
      const dy = enemy.marshal.y - mine.marshal.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const depth = role === 'guard' ? 0.08 : 0.28;
      const slot = (this.botIndex % 5) - 2;
      const guardX = Math.round(mine.marshal.x + dx * depth + nx * slot * 260 + this.jitter.x);
      const guardY = Math.round(mine.marshal.y + dy * depth + ny * slot * 260 + this.jitter.y);
      if (isoDistance(me.x, me.y, guardX, guardY) > 220 && now >= this.nextMoveAt) {
        this.nextMoveAt = now + 950;
        this.bot.send(C2S.move, { x: guardX, y: guardY });
      }
      return;
    }

    // 3. Vai Hộ vệ trong Chiến thuật tổng hợp: tuần tra tiền tiêu quanh Nguyên Soái nhà.
    if (tactic === 'tactical' && role === 'guard') {
      const dx = enemy.marshal.x - mine.marshal.x;
      const dy = enemy.marshal.y - mine.marshal.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const slot = (this.botIndex % 3) - 1;
      const gx = Math.round(mine.marshal.x + dx * 0.14 + nx * slot * 240 + this.jitter.x);
      const gy = Math.round(mine.marshal.y + dy * 0.14 + ny * slot * 240 + this.jitter.y);
      if (isoDistance(me.x, me.y, gx, gy) > 260 && now >= this.nextMoveAt) {
        this.nextMoveAt = now + 950;
        this.bot.send(C2S.move, { x: gx, y: gy });
      }
      return;
    }

    // 4. Vai Hỗ trợ (Nga Mi) trong Chiến thuật tổng hợp: bám cụm đồng đội đông nhất.
    if (tactic === 'tactical' && role === 'support') {
      const cluster = this.findNearestAllyCluster(me, myCamp, 2400);
      if (cluster && isoDistance(me.x, me.y, cluster.x, cluster.y) > 260) {
        if (now >= this.nextMoveAt) {
          this.nextMoveAt = now + 850;
          this.bot.send(C2S.move, { x: cluster.x + Math.round(this.jitter.x * 0.4), y: cluster.y + Math.round(this.jitter.y * 0.4) });
        }
        return;
      }
    }

    // 5. Gom tốp ngắn ngay ngoài cổng để đẩy theo nhóm (3–5 bot).
    if (this.director.shouldRegroup(this.bot.mapId, myCamp, me.id ?? this.bot.name, me.x, me.y, mine.gateExit, this.exitedCampAt, now)) {
      if (now >= this.nextMoveAt) {
        this.nextMoveAt = now + 900;
        this.bot.send(C2S.move, { x: mine.gateExit.x + this.jitter.x, y: mine.gateExit.y + this.jitter.y });
      }
      return;
    }

    // 6. Tách 3 cánh thật theo dữ liệu từng map + chọn cánh ít người nhất.
    const lanes = buildTacticalLanes(this.bot.mapId, myCamp);
    if (this.assignedLane < 0 || this.assignedLane >= lanes.length) {
      this.assignedLane = this.director.pickLane(this.bot.mapId, myCamp, lanes.length, this.botIndex, role, now);
      this.wpIndex = -1;
    }
    this.followLane(me, lanes[this.assignedLane], now);
  }

  private followLane(me: any, list: readonly Point2D[], now: number): void {
    const lastIdx = list.length - 1;
    // Khi mới ra khỏi doanh trại, chọn waypoint tiếp theo hướng thẳng sang phe địch (không quay lùi).
    if (this.wpIndex < 0) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < list.length; i++) {
        const d = isoDistance(me.x, me.y, list[i].x, list[i].y);
        if (d < bestDist) { bestDist = d; bestIdx = i; }
      }
      this.wpIndex = Math.min(lastIdx, bestIdx + 1);
    }

    const curIdx = Math.min(this.wpIndex, lastIdx);
    const wp = list[curIdx];
    // Dàn hàng ngang vuông góc trục chiến trường theo chỉ số bot để tránh dồn cục 1 điểm.
    const lineSlot = (Math.floor(this.botIndex / 3) % 5) - 2;
    const spread = curIdx === lastIdx ? 70 : 125;
    const tx = wp.x + Math.round(lineSlot * spread * -0.48) + this.jitter.x;
    const ty = wp.y + Math.round(lineSlot * spread * -0.88) + this.jitter.y;

    if (isoDistance(me.x, me.y, wp.x, wp.y) < 340) {
      this.wpIndex = Math.min(lastIdx, this.wpIndex + 1);
      this.rollJitter();
    }

    // Chống kẹt: nếu tọa độ không đổi quá 3.5 giây -> đổi jitter hoặc tiến tiếp tới waypoint kế (không quay ngược).
    if (isoDistance(me.x, me.y, this.lastPos.x, this.lastPos.y) > 25) {
      this.lastPos = { x: me.x, y: me.y, at: now };
    } else if (now - this.lastPos.at > 3500) {
      this.lastPos.at = now;
      this.rollJitter();
      this.wpIndex = Math.min(lastIdx, this.wpIndex + 1);
    }

    if (now >= this.nextMoveAt) {
      this.nextMoveAt = now + 950;
      this.bot.send(C2S.move, { x: tx, y: ty });
    }
  }

  private trackDamageStreak(me: any, now: number): void {
    if (this.lastHp >= 0 && me.hp < this.lastHp) {
      this.lastHpDropAt = now;
      if (this.dmgStreakStartAt === 0) this.dmgStreakStartAt = now;
    } else if (this.dmgStreakStartAt > 0 && now - this.lastHpDropAt > 850) {
      this.dmgStreakStartAt = 0;
    }
    this.lastHp = me.hp;
  }

  private tryEscapeJump(me: any, myCamp: TkCamp, now: number): boolean {
    if (now < this.nextEscapeJumpAt || ((me.ctl ?? 0) & 1)) return false;
    const nearby: { x: number; y: number; dist: number }[] = [];
    for (const a of this.bot.actors()) {
      if (a.isSelf || a.state.hp <= 0) continue;
      const raw = (this.bot.room?.state as any)?.actors?.get(a.id);
      if (raw?.stealth) continue;
      const otherCamp = raw?.battleCamp as string | undefined;
      if (!otherCamp || otherCamp === myCamp) continue;
      if (isInTkSafeCamp(this.bot.mapId, a.x, a.y)) continue;
      const dist = isoDistance(me.x, me.y, a.x, a.y);
      if (dist <= 340 || (raw?.attackTarget === me.id && dist <= 400)) {
        nearby.push({ x: a.x, y: a.y, dist: Math.max(1, dist) });
      }
    }
    const crowded = nearby.length >= 3;
    const sustainedDmg = this.dmgStreakStartAt > 0 && now - this.dmgStreakStartAt >= 2000 && nearby.length >= 1;
    if (!crowded && !sustainedDmg) return false;

    if (me.mounted) {
      this.nextEscapeJumpAt = now + 220;
      this.bot.send(C2S.mount, {});
      return true;
    }
    if (!this.bot.ready(KHINH_CONG_ID, now)) return false;

    let vx = 0;
    let vy = 0;
    for (const e of nearby) {
      vx += (me.x - e.x) / e.dist;
      vy += (me.y - e.y) / e.dist;
    }
    const home = backPortalFor(this.bot.mapId, myCamp);
    const hDist = Math.max(1, isoDistance(me.x, me.y, home.x, home.y));
    vx += ((home.x - me.x) / hDist) * 0.4;
    vy += ((home.y - me.y) / hDist) * 0.4;

    const norm = Math.hypot(vx, vy);
    let angle = norm > 0.01 ? Math.atan2(vy, vx) : Math.atan2(home.y - me.y, home.x - me.x);
    angle += this.escapeAngleFlip * 0.35;
    this.escapeAngleFlip *= -1;

    const jx = me.x + Math.cos(angle) * 360;
    const jy = me.y + Math.sin(angle) * 360;
    this.nextEscapeJumpAt = now + 6000;
    this.dmgStreakStartAt = 0;
    this.lockedTargetId = '';
    this.wpIndex = -1;
    this.bot.cast(KHINH_CONG_ID, undefined, jx, jy, false);
    return true;
  }

  private retreatToBuyPotions(myCamp: TkCamp, endgame: TkMarshalEndgame, now: number): boolean {
    if (endgame === 'rush_enemy_marshal' || endgame === 'rally_for_rush') return false;
    if (this.countPotions('hp') > 2) return false;
    const canBuyHp = SHOP_ITEMS.drug.some(d =>
      potionTotal(d, 'hp') > 0 && potionTotal(d, 'mp') === 0 && d.price > 0 && d.price <= this.bot.money && roomFor(this.bot.bag, d, 1) > 0,
    );
    if (!canBuyHp) return false;
    if (now >= this.nextMoveAt) {
      this.nextMoveAt = now + 800;
      const back = backPortalFor(this.bot.mapId, myCamp);
      this.bot.send(C2S.move, { x: back.x, y: back.y });
    }
    return true;
  }

  private useTkBagItems(me: any, inCamp: boolean, endgame: TkMarshalEndgame, now: number): void {
    if (now < this.nextTkItemUseAt) return;
    const active = new Set<number>([...(me.states ?? [])]);
    const hpRatio = me.maxHp > 0 ? me.hp / me.maxHp : 1;
    const mpRatio = me.maxMp > 0 ? me.mp / me.maxMp : 1;
    const fighting = this.bot.tkState?.phase === 'fighting';
    const rallying = endgame === 'rally_for_rush';

    for (let i = 0; i < this.bot.bag.length; i++) {
      const def = itemDef(this.bot.bag[i]);
      const eff = def?.tkItem;
      if (!eff) continue;
      if (eff.kind === 'bibao') {
        this.nextTkItemUseAt = now + 1000;
        this.bot.send(C2S.use, { index: i });
        return;
      }
      if (eff.kind === 'buff' && !active.has(eff.stateId) && (!eff.aoeRadius || (!inCamp && fighting))) {
        this.nextTkItemUseAt = now + 1000;
        this.bot.send(C2S.use, { index: i });
        return;
      }
      if (eff.kind === 'clarion' && !inCamp && !rallying && fighting && now >= this.nextClarionAt) {
        this.nextClarionAt = now + 8000;
        this.nextTkItemUseAt = now + 1000;
        this.bot.send(C2S.use, { index: i });
        return;
      }
      if (eff.kind === 'trap' && !inCamp && !rallying && fighting && now >= this.nextTrapAt) {
        this.nextTrapAt = now + 4500;
        this.nextTkItemUseAt = now + 1000;
        this.bot.send(C2S.use, { index: i });
        return;
      }
      if (eff.kind === 'battlePotion' && !inCamp && now >= this.nextHpPotionAt && (hpRatio < 0.75 || mpRatio < 0.45)) {
        this.nextHpPotionAt = now + 1000;
        this.nextTkItemUseAt = now + 1000;
        this.bot.send(C2S.use, { index: i });
        return;
      }
    }
  }
}
