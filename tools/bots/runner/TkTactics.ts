import {
  ELEMENT_COUNTERS,
  MAPS,
  TK_BATTLE_MAP_ID,
  TK_MAP_LAYOUT,
  TK_MAPS,
  isoDistance,
  tkMapLayout,
  type BotTongKimTactic,
  type Element,
  type TkCamp,
} from '@vltk/shared';

export type ConcreteTkTactic = Exclude<BotTongKimTactic, 'random'>;
export type TkBotRole = 'vanguard' | 'flanker' | 'guard' | 'support';
export type TkSiegeRole = 'breacher' | 'slayer' | 'support';
export type TkMarshalEndgame = 'none' | 'defend_marshal' | 'rally_for_rush' | 'rush_enemy_marshal';

export const MARSHAL_DEFEND_DELAY_MS = 30_000;
export const MARSHAL_RALLY_RADIUS = 450;
export const MARSHAL_RALLY_MAX_WAIT_MS = 22_000;
export const MARSHAL_WAVE_COLLAPSE_AFTER_MS = 12_000;
export const MARSHAL_SQUAD_COHESION_RADIUS = 320;
export const MARSHAL_BREACH_RADIUS = 720;

const BREACHER_FACTIONS = new Set(['shaolin', 'tianwang', 'gaibang', 'wudu']);

/**
 * Kiểm tra xem bot có thuộc nhóm 70% tổng lực diệt Soái khi phe mình mất Nguyên Soái hay không.
 */
export function isMarshalRusherSlot(botIndex: number): boolean {
  return (Math.abs(botIndex) % 10) < 7;
}

/**
 * Phân 3 tiểu đội trong nhóm 70% công thành:
 * - `support`: Nga Mi — bám cụm đồng đội, bật Chiến Cổ/Lệnh Bài/hào quang.
 * - `breacher`: Cận chiến/AoE (Thiếu Lâm, Thiên Vương, Cái Bang, Ngũ Độc hoặc 20% đầu) — mở đường & khống chế bot địch.
 * - `slayer`: DPS/Tầm xa — bám Đội trưởng, ưu tiên dồn sát thương Nguyên Soái địch, chỉ tự vệ khi địch áp sát.
 */
export function assignSiegeRole(botIndex: number, faction?: string): TkSiegeRole {
  if (faction === 'emei') return 'support';
  if ((faction && BREACHER_FACTIONS.has(faction)) || (Math.abs(botIndex) % 10) < 2) return 'breacher';
  return 'slayer';
}

/**
 * Hàm thuần kiểm tra nhanh vai trò endgame (không tính thời gian trễ 30s & tập kết 100% trên Director).
 */
export function resolveMarshalEndgame(
  tkState: { mode?: number; marshalSpawned?: boolean; tongMarshalAlive?: boolean; kimMarshalAlive?: boolean } | null | undefined,
  myCamp: TkCamp,
  botIndex: number,
): TkMarshalEndgame {
  if (!tkState || tkState.mode !== 1 || !tkState.marshalSpawned) return 'none';
  const myAlive = myCamp === 'tong' ? !!tkState.tongMarshalAlive : !!tkState.kimMarshalAlive;
  const enemyAlive = myCamp === 'tong' ? !!tkState.kimMarshalAlive : !!tkState.tongMarshalAlive;
  if (myAlive && !enemyAlive) return 'defend_marshal';
  if (!myAlive && enemyAlive) return isMarshalRusherSlot(botIndex) ? 'rush_enemy_marshal' : 'none';
  return 'none';
}

export interface Point2D {
  x: number;
  y: number;
}

export interface TkTargetCandidate {
  id: string;
  x: number;
  y: number;
  dist: number;
  hp: number;
  maxHp: number;
  kind: 'player' | 'monster';
  boss: number;
  series?: Element;
}

export interface TkScoringContext {
  mySeries?: Element;
  lockedTargetId: string;
  focusTargetId?: string;
  myMarshal: Point2D;
  marshalThreatened: boolean;
  defending: boolean;
}

export interface TkBotPresence {
  id: string;
  x: number;
  y: number;
  lane: number;
  role: TkBotRole;
  exitedAt: number;
  seenAt: number;
  /** Thuộc nhóm 70% tổng lực diệt Soái địch khi phe mình mất Nguyên Soái. */
  isRusher?: boolean;
  /** Vai trò tiểu đội công thành (breacher / slayer / support). */
  siegeRole?: TkSiegeRole;
}

export interface TkSiegeWaveSnapshot {
  waveNumber: number;
  state: 'rallying' | 'marching';
  lane: 1 | 2;
  leaderId: string;
  leaderPos: Point2D | null;
  engaged: boolean;
}

export interface TkMarshalAlert {
  x: number;
  y: number;
  hpRatio: number;
  enemyCount: number;
  at: number;
}

export interface TkFocusHint {
  id: string;
  x: number;
  y: number;
  hpRatio: number;
  at: number;
}

const PRESENCE_TTL_MS = 5000;
const ALERT_TTL_MS = 4500;
const FOCUS_TTL_MS = 3200;
const REGROUP_WINDOW_MS = 3200;
const REGROUP_RADIUS = 380;

// 3 mũi tiến công gọng kìm cho map mặc định 378 (Trung lộ, Cánh Trái Tây Bắc, Cánh Phải Đông Nam).
export const TONG_LANES_378: readonly (readonly Point2D[])[] = [
  [{ x: 5648, y: 7472 }, { x: 7600, y: 6200 }, { x: 9744, y: 5384 }, { x: 11400, y: 4800 }, TK_MAP_LAYOUT.kim.marshal],
  [{ x: 5648, y: 7472 }, { x: 7568, y: 5224 }, { x: 9232, y: 4792 }, { x: 10500, y: 3500 }, { x: 11504, y: 3192 }, TK_MAP_LAYOUT.kim.marshal],
  [{ x: 5648, y: 7472 }, { x: 7800, y: 7200 }, { x: 8816, y: 6792 }, { x: 11200, y: 5800 }, { x: 12200, y: 5400 }, TK_MAP_LAYOUT.kim.marshal],
];

export const KIM_LANES_378: readonly (readonly Point2D[])[] = [
  [{ x: 13168, y: 3560 }, { x: 11400, y: 4800 }, { x: 9744, y: 5384 }, { x: 7600, y: 6200 }, TK_MAP_LAYOUT.tong.marshal],
  [{ x: 13168, y: 3560 }, { x: 11504, y: 3192 }, { x: 10500, y: 3500 }, { x: 9232, y: 4792 }, { x: 7568, y: 5224 }, TK_MAP_LAYOUT.tong.marshal],
  [{ x: 13168, y: 3560 }, { x: 12200, y: 5400 }, { x: 11200, y: 5800 }, { x: 9520, y: 6168 }, { x: 7800, y: 7200 }, TK_MAP_LAYOUT.tong.marshal],
];

function clampToMap(mapId: number, x: number, y: number): Point2D {
  const size = MAPS[mapId]?.raw.size;
  if (!size) return { x: Math.round(x), y: Math.round(y) };
  const pad = 160;
  return {
    x: Math.round(Math.max(pad, Math.min(size.width - pad, x))),
    y: Math.round(Math.max(pad, Math.min(size.height - pad, y))),
  };
}

function thinWaypoints(points: { p: Point2D; along: number }[], minGap = 900, maxCount = 4): Point2D[] {
  const sorted = [...points].sort((a, b) => a.along - b.along);
  const picked: Point2D[] = [];
  for (const item of sorted) {
    if (!picked.length || isoDistance(picked[picked.length - 1].x, picked[picked.length - 1].y, item.p.x, item.p.y) >= minGap) {
      picked.push(item.p);
      if (picked.length >= maxCount) break;
    }
  }
  return picked;
}

/**
 * Sinh 3 mũi tiến công rõ rệt (Trung lộ / Cánh Trái / Cánh Phải) cho mọi map Tống Kim.
 * Tận dụng sẵn `frontlines` + `npcSpawns` trong `tk-maps.json`; nếu map chưa rải đủ 2 cánh
 * sẽ tự tạo vòng cung rộng 22% chiều dài trục chiến trường (tối thiểu 950 px).
 */
export function buildTacticalLanes(battleMapId: number, camp: TkCamp): readonly (readonly Point2D[])[] {
  if (battleMapId === 378) return camp === 'tong' ? TONG_LANES_378 : KIM_LANES_378;
  const cfg = tkMapLayout(battleMapId) ?? TK_MAPS[TK_BATTLE_MAP_ID];
  const mine = cfg[camp];
  const enemy = cfg[camp === 'tong' ? 'kim' : 'tong'];

  const start = mine.gateExit;
  const end = enemy.marshal;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;

  const centerBand = Math.max(420, len * 0.1);
  const centerPts: { p: Point2D; along: number }[] = [];
  const leftPts: { p: Point2D; along: number }[] = [];
  const rightPts: { p: Point2D; along: number }[] = [];

  const pool: Point2D[] = [
    ...mine.frontlines,
    ...enemy.frontlines,
    ...mine.npcSpawns.map(g => ({ x: g.x, y: g.y })),
    ...enemy.npcSpawns.map(g => ({ x: g.x, y: g.y })),
  ];

  for (const p of pool) {
    const rx = p.x - start.x;
    const ry = p.y - start.y;
    const along = rx * ux + ry * uy;
    if (along < len * 0.12 || along > len * 0.88) continue;
    const perp = rx * nx + ry * ny;
    if (Math.abs(perp) <= centerBand) centerPts.push({ p, along });
    else if (perp > centerBand) leftPts.push({ p, along });
    else rightPts.push({ p, along });
  }

  const flankOffset = Math.max(950, Math.min(2200, Math.round(len * 0.22)));
  const synthArc = (sign: -1 | 0 | 1): Point2D[] => [
    clampToMap(battleMapId, start.x + dx * 0.35 + nx * flankOffset * sign, start.y + dy * 0.35 + ny * flankOffset * sign),
    clampToMap(battleMapId, start.x + dx * 0.68 + nx * flankOffset * sign, start.y + dy * 0.68 + ny * flankOffset * sign),
  ];

  const midCenter = centerPts.length ? thinWaypoints(centerPts) : synthArc(0);
  const midLeft = leftPts.length >= 2 ? thinWaypoints(leftPts) : synthArc(1);
  const midRight = rightPts.length >= 2 ? thinWaypoints(rightPts) : synthArc(-1);

  return [
    [start, ...midCenter, end],
    [start, ...midLeft, end],
    [start, ...midRight, end],
  ];
}

/** Phân vai đội hình dựa trên môn phái và chỉ số bot. */
export function assignTkRole(botIndex: number, faction?: string): TkBotRole {
  if (faction === 'emei') return 'support';
  const slot = Math.abs(botIndex) % 10;
  if (slot < 2) return 'guard';
  if (slot < 6) return 'flanker';
  return 'vanguard';
}

/** Chấm điểm mục tiêu theo Utility Scoring (ưu tiên loại, máu thấp, ngũ hành khắc, focus fire, cứu Soái). */
export function scoreTargetUtility(c: TkTargetCandidate, ctx: TkScoringContext): number {
  const isMarshal = c.kind === 'monster' && c.boss >= 2;
  const isPlayer = c.kind === 'player';
  const isOfficer = c.kind === 'monster' && c.boss === 1;
  let score = isMarshal ? 900 : isPlayer ? 520 : isOfficer ? 340 : 180;

  score -= c.dist * 0.45;

  const hpRatio = c.maxHp > 0 ? c.hp / c.maxHp : 1;
  if (hpRatio < 0.35) score += 260;
  else if (hpRatio < 0.6) score += 110;

  if (ctx.mySeries && c.series) {
    if (ELEMENT_COUNTERS[ctx.mySeries] === c.series) score += 170;
    else if (ELEMENT_COUNTERS[c.series] === ctx.mySeries) score -= 90;
  }

  if (ctx.focusTargetId && c.id === ctx.focusTargetId) score += 220;
  if (ctx.lockedTargetId && c.id === ctx.lockedTargetId) score += 85;

  if (ctx.defending || ctx.marshalThreatened) {
    const distToMarshal = isoDistance(c.x, c.y, ctx.myMarshal.x, ctx.myMarshal.y);
    if (distToMarshal <= 850) score += 420;
    else if (ctx.defending && distToMarshal > 1800) score -= 240;
  }

  return score;
}

/** Tính tọa độ thả diều (kiting) cho phái tầm xa khi bị địch áp sát. */
export function computeKitePoint(
  me: Point2D,
  enemy: Point2D,
  safeAnchor: Point2D,
  stepDist = 230,
  strafeSign: 1 | -1 = 1,
): Point2D {
  const awayX = me.x - enemy.x;
  const awayY = me.y - enemy.y;
  const awayLen = Math.hypot(awayX, awayY) || 1;

  const homeX = safeAnchor.x - me.x;
  const homeY = safeAnchor.y - me.y;
  const homeLen = Math.hypot(homeX, homeY) || 1;

  let vx = (awayX / awayLen) * 0.72 + (homeX / homeLen) * 0.28;
  let vy = (awayY / awayLen) * 0.72 + (homeY / homeLen) * 0.28;
  const norm = Math.hypot(vx, vy) || 1;
  vx /= norm;
  vy /= norm;

  // Lệch nhẹ 20° để tránh chạy lùi thành 1 đường thẳng dễ bị chắn góc.
  const angle = Math.atan2(vy, vx) + strafeSign * 0.35;
  return {
    x: Math.round(me.x + Math.cos(angle) * stepDist),
    y: Math.round(me.y + Math.sin(angle) * stepDist),
  };
}

interface CampBoard {
  bots: Map<string, TkBotPresence>;
  marshalAlert: TkMarshalAlert | null;
  focusTarget: TkFocusHint | null;
  randomChoice: Map<string, ConcreteTkTactic>;
  endgameMatchKey: string;
  enemyMarshalDiedAt: number;
  myMarshalDiedAt: number;
  waveNumber: number;
  waveState: 'rallying' | 'marching';
  waveRallyStartedAt: number;
  waveLaunchedAt: number;
  waveLane: 1 | 2;
  waveLeaderId: string;
}

const CONCRETE_TACTICS: readonly ConcreteTkTactic[] = ['charge', 'flank', 'tactical', 'defend'];

/**
 * Bảng điều phối cấp phe (Blackboard trong bộ nhớ tiến trình `tools/bots`).
 * Không gửi thêm gói mạng nào lên game server; các bot cùng phe chia sẻ thông tin chiến trường tức thời.
 */
export class TkCampDirector {
  private boards = new Map<string, CampBoard>();

  private board(mapId: number, camp: TkCamp): CampBoard {
    const key = `${mapId}:${camp}`;
    let b = this.boards.get(key);
    if (!b) {
      b = {
        bots: new Map(),
        marshalAlert: null,
        focusTarget: null,
        randomChoice: new Map(),
        endgameMatchKey: '',
        enemyMarshalDiedAt: 0,
        myMarshalDiedAt: 0,
        waveNumber: 0,
        waveState: 'rallying',
        waveRallyStartedAt: 0,
        waveLaunchedAt: 0,
        waveLane: 1,
        waveLeaderId: '',
      };
      this.boards.set(key, b);
    }
    return b;
  }

  private prune(b: CampBoard, now: number): void {
    for (const [id, p] of b.bots) {
      if (now - p.seenAt > PRESENCE_TTL_MS) b.bots.delete(id);
    }
    if (b.marshalAlert && now - b.marshalAlert.at > ALERT_TTL_MS) b.marshalAlert = null;
    if (b.focusTarget && now - b.focusTarget.at > FOCUS_TTL_MS) b.focusTarget = null;
  }

  reportBot(mapId: number, camp: TkCamp, presence: TkBotPresence): void {
    const b = this.board(mapId, camp);
    b.bots.set(presence.id, presence);
    if (b.bots.size > 120) this.prune(b, presence.seenAt);
  }

  reportMarshalThreat(mapId: number, camp: TkCamp, alert: TkMarshalAlert): void {
    const b = this.board(mapId, camp);
    b.marshalAlert = alert;
  }

  getMarshalAlert(mapId: number, camp: TkCamp, now: number): TkMarshalAlert | null {
    const b = this.board(mapId, camp);
    this.prune(b, now);
    return b.marshalAlert;
  }

  reportFocusTarget(mapId: number, camp: TkCamp, hint: TkFocusHint): void {
    const b = this.board(mapId, camp);
    if (!b.focusTarget || hint.hpRatio < b.focusTarget.hpRatio || hint.at - b.focusTarget.at > 1200) {
      b.focusTarget = hint;
    }
  }

  getFocusTarget(mapId: number, camp: TkCamp, now: number): TkFocusHint | null {
    const b = this.board(mapId, camp);
    this.prune(b, now);
    return b.focusTarget;
  }

  /** Chọn lane ít đồng đội nhất; vai `flanker` ưu tiên 2 cánh (1 & 2). */
  pickLane(mapId: number, camp: TkCamp, laneCount: number, botIndex: number, role: TkBotRole, now: number): number {
    if (laneCount <= 1) return 0;
    const b = this.board(mapId, camp);
    this.prune(b, now);
    const counts = Array<number>(laneCount).fill(0);
    for (const p of b.bots.values()) {
      if (p.lane >= 0 && p.lane < laneCount) counts[p.lane]++;
    }
    const candidates = role === 'flanker' && laneCount >= 3
      ? [1, 2]
      : Array.from({ length: laneCount }, (_, i) => i);
    let bestLane = candidates[Math.abs(botIndex) % candidates.length];
    let bestCount = counts[bestLane];
    for (const lane of candidates) {
      if (counts[lane] < bestCount) {
        bestCount = counts[lane];
        bestLane = lane;
      }
    }
    return bestLane;
  }

  /** Gom tốp ngắn (tối đa 3.2s) gần cổng ra trận để tránh chạy lẻ chết lẻ. */
  shouldRegroup(mapId: number, camp: TkCamp, botId: string, x: number, y: number, gateExit: Point2D, exitedAt: number, now: number): boolean {
    if (exitedAt <= 0 || now - exitedAt > REGROUP_WINDOW_MS) return false;
    if (isoDistance(x, y, gateExit.x, gateExit.y) > REGROUP_RADIUS) return false;
    const b = this.board(mapId, camp);
    this.prune(b, now);
    if (b.bots.size < 4) return false;
    let nearGate = 0;
    for (const p of b.bots.values()) {
      if (p.id === botId || isoDistance(p.x, p.y, gateExit.x, gateExit.y) <= REGROUP_RADIUS) nearGate++;
    }
    return nearGate < 3;
  }

  /** Bốc 1 chiến thuật cố định cho phe trong trận khi chọn chế độ `random`. */
  resolveRandomTactic(mapId: number, camp: TkCamp, matchKey: string, rand: () => number): ConcreteTkTactic {
    const b = this.board(mapId, camp);
    const existing = b.randomChoice.get(matchKey);
    if (existing) return existing;
    const picked = CONCRETE_TACTICS[Math.floor(rand() * CONCRETE_TACTICS.length) % CONCRETE_TACTICS.length];
    b.randomChoice.set(matchKey, picked);
    if (b.randomChoice.size > 16) b.randomChoice.clear();
    return picked;
  }

  private pickWaveLeader(b: CampBoard): TkBotPresence | null {
    const existing = b.waveLeaderId ? b.bots.get(b.waveLeaderId) : undefined;
    if (existing && existing.isRusher) return existing;
    let best: TkBotPresence | null = null;
    for (const p of b.bots.values()) {
      if (!p.isRusher) continue;
      if (!best || (p.siegeRole === 'breacher' && best.siegeRole !== 'breacher')) {
        best = p;
      }
    }
    b.waveLeaderId = best?.id ?? '';
    return best;
  }

  /** Thông tin đợt công thành hiện tại (Đội trưởng, cánh bọc sườn, đã vào vùng giao chiến quanh Soái địch chưa). */
  getSiegeWave(mapId: number, camp: TkCamp, enemyMarshalPos: Point2D, now: number): TkSiegeWaveSnapshot {
    const b = this.board(mapId, camp);
    this.prune(b, now);
    const leader = this.pickWaveLeader(b);
    const leaderPos = leader ? { x: leader.x, y: leader.y } : null;
    const engaged = !!leaderPos && isoDistance(leaderPos.x, leaderPos.y, enemyMarshalPos.x, enemyMarshalPos.y) <= MARSHAL_BREACH_RADIUS;
    return {
      waveNumber: b.waveNumber,
      state: b.waveState,
      lane: b.waveLane,
      leaderId: b.waveLeaderId,
      leaderPos,
      engaged,
    };
  }

  /**
   * Điều phối chiến lược chế độ Nguyên Soái theo thời gian thực trên toàn phe:
   * - Phe đang thắng (`myAlive && !enemyAlive`): chờ đúng 30s (`MARSHAL_DEFEND_DELAY_MS`) rồi mới dồn toàn lực về bảo vệ Soái nhà.
   * - Phe mất Nguyên Soái (`!myAlive && enemyAlive`): tổ chức thành từng **Đợt (Wave)** lặp lại:
   *   tập kết đủ quân tại điểm Nguyên Soái phe mình vừa chết (`rally_for_rush`) -> xuất kích bọc sườn cùng Đội trưởng (`rush_enemy_marshal`)
   *   -> khi đợt bị đánh tan sẽ tự động gom đợt mới và đổi cánh.
   */
  resolveMarshalEndgame(
    mapId: number,
    camp: TkCamp,
    tkState: { matchId?: number; mode?: number; marshalSpawned?: boolean; tongMarshalAlive?: boolean; kimMarshalAlive?: boolean } | null | undefined,
    botIndex: number,
    myMarshalPos: Point2D,
    now: number,
  ): TkMarshalEndgame {
    if (!tkState || tkState.mode !== 1 || !tkState.marshalSpawned) return 'none';
    const b = this.board(mapId, camp);
    this.prune(b, now);
    const matchKey = `${mapId}:${tkState.matchId ?? 0}`;
    if (b.endgameMatchKey !== matchKey) {
      b.endgameMatchKey = matchKey;
      b.enemyMarshalDiedAt = 0;
      b.myMarshalDiedAt = 0;
      b.waveNumber = 0;
      b.waveState = 'rallying';
      b.waveRallyStartedAt = 0;
      b.waveLaunchedAt = 0;
      b.waveLane = 1;
      b.waveLeaderId = '';
    }

    const myAlive = camp === 'tong' ? !!tkState.tongMarshalAlive : !!tkState.kimMarshalAlive;
    const enemyAlive = camp === 'tong' ? !!tkState.kimMarshalAlive : !!tkState.tongMarshalAlive;

    // 1. Phe đang thắng (còn Soái, địch mất Soái): chỉ dồn về bảo vệ Soái nhà sau 30s.
    if (myAlive && !enemyAlive) {
      if (b.enemyMarshalDiedAt === 0) b.enemyMarshalDiedAt = now;
      return now - b.enemyMarshalDiedAt >= MARSHAL_DEFEND_DELAY_MS ? 'defend_marshal' : 'none';
    }

    // 2. Phe mất Nguyên Soái: nhóm 70% tổ chức theo từng Đợt (Wave) lặp lại.
    if (!myAlive && enemyAlive) {
      if (b.myMarshalDiedAt === 0) {
        b.myMarshalDiedAt = now;
        b.waveRallyStartedAt = now;
      }
      if (!isMarshalRusherSlot(botIndex)) return 'none';

      let rusherCount = 0;
      let arrivedCount = 0;
      let forwardCount = 0;
      for (const p of b.bots.values()) {
        if (!p.isRusher) continue;
        rusherCount++;
        const dHome = isoDistance(p.x, p.y, myMarshalPos.x, myMarshalPos.y);
        if (dHome <= MARSHAL_RALLY_RADIUS) arrivedCount++;
        else if (dHome > 950) forwardCount++;
      }

      if (b.waveState === 'rallying') {
        if (b.waveRallyStartedAt === 0) b.waveRallyStartedAt = now;
        const allArrived = rusherCount > 0 && arrivedCount === rusherCount;
        const timedOut = now - b.waveRallyStartedAt >= MARSHAL_RALLY_MAX_WAIT_MS;
        if (allArrived || timedOut) {
          b.waveState = 'marching';
          b.waveNumber++;
          b.waveLaunchedAt = now;
          b.waveLane = b.waveNumber % 2 === 1 ? 1 : 2; // Luân phiên Cánh Trái (1) / Cánh Phải (2)
          b.waveLeaderId = '';
          this.pickWaveLeader(b);
        }
      } else if (
        now - b.waveLaunchedAt >= MARSHAL_WAVE_COLLAPSE_AFTER_MS &&
        rusherCount >= 2 &&
        forwardCount <= 1 &&
        arrivedCount >= 1
      ) {
        // Đợt tấn công đã tan vỡ (phần lớn đã hồi sinh về sân nhà) -> gom Đợt mới thay vì chạy lẻ nạp mạng.
        b.waveState = 'rallying';
        b.waveRallyStartedAt = now;
        b.waveLeaderId = '';
      }

      return b.waveState === 'marching' ? 'rush_enemy_marshal' : 'rally_for_rush';
    }

    return 'none';
  }

  clear(): void {
    this.boards.clear();
  }
}

export const TK_CAMP_DIRECTOR = new TkCampDirector();
