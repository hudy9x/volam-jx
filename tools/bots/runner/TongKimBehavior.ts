import {
  C2S,
  DEFAULT_BOT_TONGKIM,
  DROPS,
  ITEMS,
  SHOP_ITEMS,
  TK_BATTLE_MAP_ID,
  TK_MAP_LAYOUT,
  TK_SIGNUP_MAP_ID,
  autoAuraSkill,
  autoBuffSkills,
  isInTkSafeCamp,
  isoDistance,
  itemDef,
  itemQty,
  potionMs,
  potionTotal,
  roomFor,
  type BotScenario,
  type TkCamp,
} from '@vltk/shared';
import type { Behavior, BotClient } from './BotClient.js';

const TONG_WAYPOINTS: readonly { x: number; y: number }[] = [
  { x: 5648, y: 7472 },
  { x: 7600, y: 6200 },
  { x: 9744, y: 5384 },
  { x: 11400, y: 4800 },
  TK_MAP_LAYOUT.kim.marshal,
];

const KIM_WAYPOINTS: readonly { x: number; y: number }[] = [
  { x: 13168, y: 3560 },
  { x: 11400, y: 4800 },
  { x: 9744, y: 5384 },
  { x: 7600, y: 6200 },
  TK_MAP_LAYOUT.tong.marshal,
];

const OUTGOING_PORTAL: Record<TkCamp, { x: number; y: number }> = {
  tong: { x: 3088, y: 9072 },
  kim: { x: 16480, y: 1904 },
};

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

  constructor(private bot: BotClient, private sc: BotScenario, private botIndex: number) {}

  onMap(now: number): void {
    this.wpIndex = -1;
    this.lockedTargetId = '';
    this.lastPos = { x: 0, y: 0, at: now };
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

    // 1. Nếu chưa ở map báo danh (323) hoặc chiến trường (378) -> dịch chuyển tới 323.
    if (this.bot.mapId !== TK_SIGNUP_MAP_ID && this.bot.mapId !== TK_BATTLE_MAP_ID) {
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
    if (st?.phase === 'ended') {
      if (now >= this.nextLeaveAt) {
        this.nextLeaveAt = now + 3000;
        this.bot.send(C2S.tkAction, { op: 'leave' });
      }
      return;
    }

    // Đang trọng thương -> chờ server tự hồi sinh sau 5s tại Hậu doanh.
    if (me.hp <= 0) {
      this.lockedTargetId = '';
      this.wpIndex = -1;
      return;
    }

    // Bơm máu / nội lực (Survival Loop)
    this.upkeepPotions(me, now);

    // Giữ hào quang & bùa lợi
    this.upkeepBuffs(me, now);

    const myCamp = (me.battleCamp || st?.me?.camp || (this.botIndex % 2 === 0 ? 'tong' : 'kim')) as TkCamp;
    const inCamp = !!st?.me?.inCamp || isInTkSafeCamp(TK_BATTLE_MAP_ID, me.x, me.y);

    // Đang ở trong Hậu doanh an toàn
    if (inCamp) {
      this.lockedTargetId = '';
      this.wpIndex = -1;
      this.restockPotionsInCamp(now);
      if (!st || st.phase !== 'fighting' || (st.me?.gateWaitSec ?? 0) > 0) return;
      if (now >= this.nextCampExitAt) {
        this.nextCampExitAt = now + 2200 + this.bot.rand() * 800;
        const p = OUTGOING_PORTAL[myCamp];
        this.bot.send(C2S.move, { x: p.x, y: p.y });
        if (isoDistance(me.x, me.y, p.x, p.y) < 150) {
          this.bot.send(C2S.tkAction, { op: 'exitGate' });
        }
      }
      return;
    }

    if (st && st.phase !== 'fighting') return;

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
      if (isInTkSafeCamp(TK_BATTLE_MAP_ID, a.x, a.y)) continue;
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
    const list = myCamp === 'tong' ? TONG_WAYPOINTS : KIM_WAYPOINTS;
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

    const wp = list[Math.min(this.wpIndex, lastIdx)];
    const tx = wp.x + this.jitter.x;
    const ty = wp.y + this.jitter.y;

    if (isoDistance(me.x, me.y, wp.x, wp.y) < 320) {
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
}
