import {
  C2S,
  DEFAULT_BOT_TONGKIM,
  DROPS,
  ITEMS,
  MAPS,
  SHOP_ITEMS,
  TK_BATTLE_MAP_ID,
  TK_MAP_LAYOUT,
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
  type TkCamp,
} from '@vltk/shared';
import type { Behavior, BotClient } from './BotClient.js';

// 3 mũi tiến công gọng kìm (Trung lộ, Cánh Trái Tây Bắc, Cánh Phải Đông Nam) — tọa độ lấy từ TK_MAP_LAYOUT walkable.
const TONG_LANES_378: readonly (readonly { x: number; y: number }[])[] = [
  // Mũi 0: Trung lộ
  [{ x: 5648, y: 7472 }, { x: 7600, y: 6200 }, { x: 9744, y: 5384 }, { x: 11400, y: 4800 }, TK_MAP_LAYOUT.kim.marshal],
  // Mũi 1: Vòng cung Cánh Trái (Tây Bắc)
  [{ x: 5648, y: 7472 }, { x: 7568, y: 5224 }, { x: 9232, y: 4792 }, { x: 10500, y: 3500 }, { x: 11504, y: 3192 }, TK_MAP_LAYOUT.kim.marshal],
  // Mũi 2: Vòng cung Cánh Phải (Đông Nam)
  [{ x: 5648, y: 7472 }, { x: 7800, y: 7200 }, { x: 8816, y: 6792 }, { x: 11200, y: 5800 }, { x: 12200, y: 5400 }, TK_MAP_LAYOUT.kim.marshal],
];

const KIM_LANES_378: readonly (readonly { x: number; y: number }[])[] = [
  // Mũi 0: Trung lộ
  [{ x: 13168, y: 3560 }, { x: 11400, y: 4800 }, { x: 9744, y: 5384 }, { x: 7600, y: 6200 }, TK_MAP_LAYOUT.tong.marshal],
  // Mũi 1: Vòng cung Cánh Trái (Tây Bắc)
  [{ x: 13168, y: 3560 }, { x: 11504, y: 3192 }, { x: 10500, y: 3500 }, { x: 9232, y: 4792 }, { x: 7568, y: 5224 }, TK_MAP_LAYOUT.tong.marshal],
  // Mũi 2: Vòng cung Cánh Phải (Đông Nam)
  [{ x: 13168, y: 3560 }, { x: 12200, y: 5400 }, { x: 11200, y: 5800 }, { x: 9520, y: 6168 }, { x: 7800, y: 7200 }, TK_MAP_LAYOUT.tong.marshal],
];

function lanesFor(battleMapId: number, camp: TkCamp): readonly (readonly { x: number; y: number }[])[] {
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
  private jitter = { x: 0, y: 0 };
  private lastPos = { x: 0, y: 0, at: 0 };
  private atkIndex = 0;
  private lockedTargetId = '';
  private nextEscapeJumpAt = 0;
  private escapeAngleFlip = 1;
  private lastHp = -1;
  private dmgStreakStartAt = 0;
  private lastHpDropAt = 0;
  private nextTkItemUseAt = 0;
  private nextClarionAt = 0;

  constructor(private bot: BotClient, private sc: BotScenario, private botIndex: number) {}

  onMap(now: number): void {
    this.wpIndex = -1;
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
      this.lastHp = 0;
      this.dmgStreakStartAt = 0;
      return;
    }

    // Theo dõi chuỗi nhận sát thương liên tục
    this.trackDamageStreak(me, now);

    const myCamp = (me.battleCamp || st?.me?.camp || (this.botIndex % 2 === 0 ? 'tong' : 'kim')) as TkCamp;
    const inCamp = !!st?.me?.inCamp || isInTkSafeCamp(battleMapId, me.x, me.y);

    // Bơm máu / nội lực (Survival Loop) & dùng vật phẩm Tống Kim nhặt được
    this.upkeepPotions(me, now);
    this.useTkBagItems(me, inCamp, now);

    // Giữ hào quang & bùa lợi
    this.upkeepBuffs(me, now);

    // Đang ở trong Hậu doanh an toàn
    if (inCamp) {
      this.lockedTargetId = '';
      this.wpIndex = -1;
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

    // 3b. Đang bay Khinh công -> chờ tiếp đất rồi mới hành động tiếp.
    if ((me.jumpMs ?? 0) > 0 || me.anim === 'jump') return;

    // 3c. Khinh công thoát vây công (>= 3 địch gần) hoặc bị đánh mất máu liên tục trong 2s.
    if (this.tryEscapeJump(me, myCamp, now)) return;

    // 3d. Còn ít bình máu (<= 2) và có tiền -> chạy về cổng Hậu doanh mua máu rồi quay lại.
    if (this.retreatToBuyPotions(myCamp, now)) return;

    // 4. Giao tranh ngoài tiền tuyến: tìm mục tiêu phe địch ưu tiên.
    const scanRadius = this.sc.tongkim?.scanRadius ?? DEFAULT_BOT_TONGKIM.scanRadius;
    const target = this.pickTarget(me, myCamp, scanRadius);
    // Nhặt vật phẩm Tống Kim rơi trong tầm (song song khi giao tranh) hoặc chạy tới nhặt khi không có địch.
    if (this.pickupTkDrops(me, now, !!target)) return;
    if (target) {
      if (this.bot.prepareCombat(now)) return;
      const attacks = this.bot.attacks();
      const skill = attacks.length ? attacks[this.atkIndex++ % attacks.length] : 1;
      if (this.bot.ready(skill, now) && now >= this.nextCastAt) {
        this.nextCastAt = now + 260;
        const range = Math.max(60, this.bot.range(skill));
        const reach = Math.max(48, Math.round(range * 0.85));
        this.bot.cast(skill, target.id, target.x, target.y, true, reach);
      }
      return;
    }

    // 5. Không thấy địch -> tiến quân theo Waypoint về trung tâm & Nguyên Soái địch.
    this.advanceWaypoints(me, myCamp, now);
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
    const needHp = Math.max(0, 12 - this.countPotions('hp'));
    const needMp = Math.max(0, 6 - this.countPotions('mp'));
    if (needHp === 0 && needMp === 0) return;

    const tryBuy = (stat: 'hp' | 'mp', want: number): boolean => {
      if (want <= 0) return false;
      const budget = Math.floor(this.bot.money * 0.6);
      const other = stat === 'hp' ? 'mp' : 'hp';
      const cand = SHOP_ITEMS.drug
        .filter(d => potionTotal(d, stat) > 0 && potionTotal(d, other) === 0 && d.price > 0 && d.price <= budget)
        .sort((a, b) => potionTotal(b, stat) - potionTotal(a, stat))[0];
      if (!cand) return false;
      const qty = Math.min(want, Math.floor(budget / cand.price));
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

  private pickTarget(me: any, myCamp: TkCamp, scanRadius: number): { id: string; x: number; y: number } | null {
    const actors = this.bot.actors();
    let best: { id: string; x: number; y: number; tier: number; dist: number } | null = null;
    for (const a of actors) {
      if (a.isSelf || a.state.hp <= 0) continue;
      const raw = (this.bot.room?.state as any)?.actors?.get(a.id);
      const otherCamp = raw?.battleCamp as string | undefined;
      if (!otherCamp || otherCamp === myCamp) continue;
      if (isInTkSafeCamp(this.bot.mapId, a.x, a.y)) continue;
      const dist = isoDistance(me.x, me.y, a.x, a.y);
      if (dist > scanRadius) continue;

      // Trọng số ưu tiên: Nguyên Soái (0) > Người chơi (1) > Tướng/Boss Xanh (2) > Binh sĩ (3)
      const isMarshal = a.state.kind === 'monster' && Number(a.state.boss) >= 2;
      const isPlayer = a.state.kind === 'player';
      const isOfficer = a.state.kind === 'monster' && Number(a.state.boss) === 1;
      const tier = isMarshal ? 0 : isPlayer ? 1 : isOfficer ? 2 : 3;
      const lockedBonus = a.id === this.lockedTargetId ? -120 : 0;

      if (!best || tier < best.tier || (tier === best.tier && dist + lockedBonus < best.dist)) {
        best = { id: a.id, x: a.x, y: a.y, tier, dist: dist + lockedBonus };
      }
    }
    this.lockedTargetId = best?.id ?? '';
    return best ? { id: best.id, x: best.x, y: best.y } : null;
  }

  private advanceWaypoints(me: any, myCamp: TkCamp, now: number): void {
    const lanes = lanesFor(this.bot.mapId, myCamp);
    const list = lanes[this.botIndex % lanes.length];
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

  private retreatToBuyPotions(myCamp: TkCamp, now: number): boolean {
    if (this.countPotions('hp') > 2) return false;
    const canBuyHp = SHOP_ITEMS.drug.some(d => potionTotal(d, 'hp') > 0 && potionTotal(d, 'mp') === 0 && d.price > 0 && d.price <= this.bot.money);
    if (!canBuyHp) return false;
    if (now >= this.nextMoveAt) {
      this.nextMoveAt = now + 800;
      const back = backPortalFor(this.bot.mapId, myCamp);
      this.bot.send(C2S.move, { x: back.x, y: back.y });
    }
    return true;
  }

  private useTkBagItems(me: any, inCamp: boolean, now: number): void {
    if (now < this.nextTkItemUseAt) return;
    const active = new Set<number>([...(me.states ?? [])]);
    const hpRatio = me.maxHp > 0 ? me.hp / me.maxHp : 1;
    const mpRatio = me.maxMp > 0 ? me.mp / me.maxMp : 1;
    const fighting = this.bot.tkState?.phase === 'fighting';

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
      if (eff.kind === 'clarion' && !inCamp && fighting && now >= this.nextClarionAt) {
        this.nextClarionAt = now + 8000;
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
