import {
  ITEMS,
  MAX_MONEY,
  TK_BALANCE_DIFF,
  TK_BATTLE_MAP_ID,
  TK_BOT_REWARD_DEFAULT_ITEM,
  TK_BOT_REWARD_POOL,
  TK_BOT_REWARD_QTY,
  TK_CAMP_KICK_SEC,
  TK_CAMP_NAMES,
  TK_DEFAULT_TIMING,
  TK_DROP_COMMON_IDS,
  TK_DROP_OFFICER_IDS,
  TK_EXP_PER_ACCUM,
  TK_GATE_WAIT_SEC,
  TK_MAX_PER_CAMP,
  TK_MIN_LEVEL,
  TK_MODE_NAMES,
  TK_POINTS,
  TK_SCHEDULE,
  TK_SIEGE,
  TK_SIGNUP_ENTRY,
  TK_SIGNUP_FEE,
  TK_SIGNUP_MAP_ID,
  TK_TOWER_SKILLS,
  addToBag,
  createItem,
  getSkill,
  isInTkSafeCamp,
  isoDistance,
  maxLevelOf,
  nearestWalkable,
  tkBattleMapOptions,
  tkBotRewardMultiplier,
  tkHomeCampAt,
  tkKillPlayerPoints,
  tkMapLayout,
  tkRankForPoints,
  tkRespawnDelayMs,
  tkTitleOf,
  tkTowerDamageScale,
  tkTowerHpScale,
  tkTowerKillDamageMul,
  tkTowerSkillForElement,
  tkTowerSpriteFor,
  rollClarionNpcRole,
  type Element,
  type Item,
  type ItemDef,
  type MonsterDef,
  type Portal,
  type TkActionMsg,
  type TkBattleMapConfig,
  type TkCamp,
  type TkLaneId,
  type TkLeaderEntry,
  type TkMinionType,
  type TkMode,
  type TkNpcRole,
  type TkPhase,
  type TkRank,
  type TkStateMsg,
  type TkTowerSpec,
  type TkTowerStatus,
} from '@vltk/shared';
import { db } from '../account/db.js';
import { devTools } from '../env.js';
import { Actor } from '../net/schema.js';
import { BASIC_ATTACK, makeSim, type Sim } from './entity.js';
import { addMoney } from './inventory.js';
import { gainExp, refreshStats } from './progress.js';
import { revive } from './players.js';
import { dropBattleItem } from './systems/drops.js';
import { refreshMonsterCombat } from './systems/effects.js';
import { drinkPotion } from './systems/potions.js';
import { addState } from './systems/status.js';
import type { World } from './World.js';

interface TkPlayerEntry {
  charId: string;
  name: string;
  faction: string;
  camp: TkCamp;
  points: number;
  rank: TkRank;
  kills: number;
  deaths: number;
  npcKills: number;
  streak: number;
  maxStreak: number;
  online: boolean;
  paidFee: boolean;
  inCamp: boolean;
  enteredCampAt: number;
}

interface TkNpcRespawn {
  camp: TkCamp;
  role: Exclude<TkNpcRole, 'marshal'>;
  x: number;
  y: number;
  respawnAt: number;
}

export interface TkStartOptions {
  mode?: TkMode;
  signupSec?: number;
  durationSec?: number;
  marshalDelaySec?: number;
  endSec?: number;
  allowSolo?: boolean;
  /** Bậc thời gian hồi sinh cho Mode 3 (giây), mặc định [30, 60, 90]. */
  respawnStepsSec?: number[];
}

const TK_NPC_STATS: Record<TkNpcRole, { hp: number; level: number; scale: number; boss: 0 | 1 | 2; respawnMs: number; damage: [number, number]; skills: [number, number][] }> = {
  soldier: { hp: 36_000, level: 80, scale: 1.0, boss: 0, respawnMs: 25_000, damage: [180, 260], skills: [[1, 1]] },
  captain: { hp: 70_000, level: 90, scale: 1.12, boss: 0, respawnMs: 45_000, damage: [320, 460], skills: [[1, 1], [322, 10]] },
  commander: { hp: 180_000, level: 95, scale: 1.24, boss: 0, respawnMs: 70_000, damage: [520, 740], skills: [[1, 1], [322, 14], [362, 12], [1055, 10]] },
  deputy: { hp: 320_000, level: 98, scale: 1.32, boss: 0, respawnMs: 90_000, damage: [650, 920], skills: [[1, 1], [322, 18], [362, 15], [365, 12], [1058, 14]] },
  general: { hp: 600_000, level: 100, scale: 1.42, boss: 1, respawnMs: 120_000, damage: [800, 1150], skills: [[1, 1], [322, 20], [362, 18], [365, 16], [1061, 16], [1070, 14]] },
  marshal: { hp: 5_000_000, level: 100, scale: 1.6, boss: 2, respawnMs: 0, damage: [1100, 1650], skills: [[1, 1], [322, 20], [362, 20], [365, 20], [357, 20]] },
};

const TK_NPC_TITLES: Record<TkCamp, Record<TkNpcRole, string>> = {
  tong: { soldier: 'Tống Binh', captain: 'Tống Hiệu úy', commander: 'Tống Thống lĩnh', deputy: 'Tống Phó tướng', general: 'Tống Đại tướng', marshal: 'Tống Nguyên Soái' },
  kim: { soldier: 'Kim Binh', captain: 'Kim Hiệu úy', commander: 'Kim Thống lĩnh', deputy: 'Kim Phó tướng', general: 'Kim Đại tướng', marshal: 'Kim Nguyên Soái' },
};

/** NpcResType đối chiếu từ volam-3005/Server/Settings/Npcs.txt (dòng 633-644). */
const TK_NPC_SPRITES: Record<TkCamp, Record<TkNpcRole, string>> = {
  tong: {
    soldier: 'enemy034',
    captain: 'enemy029',
    commander: 'enemy026',
    deputy: 'enemy021',
    general: 'enemy017',
    marshal: 'enemy004',
  },
  kim: {
    soldier: 'enemy028',
    captain: 'enemy031',
    commander: 'enemy036',
    deputy: 'enemy024',
    general: 'enemy023',
    marshal: 'enemy006',
  },
};

const TK_NPC_ID_OFFSET: Record<TkNpcRole, number> = {
  soldier: 1, captain: 2, commander: 3, deputy: 4, general: 5, marshal: 6,
};

const TK_ELEMENTS: readonly Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

function makeTkMonsterDef(camp: TkCamp, role: TkNpcRole, element: Element): MonsterDef {
  const s = TK_NPC_STATS[role];
  const sprite = TK_NPC_SPRITES[camp][role];
  const isMarshal = role === 'marshal';
  const isGeneral = role === 'general';
  return {
    id: (camp === 'tong' ? 9000 : 9010) + TK_NPC_ID_OFFSET[role],
    name: TK_NPC_TITLES[camp][role],
    sprite,
    level: s.level,
    element,
    hp: s.hp,
    damage: s.damage,
    // Chỉ Nguyên Soái và Đại tướng mới có kháng và giảm hiệu ứng (tăng dần theo cấp bậc).
    resist: isMarshal ? 0.75 : isGeneral ? 0.40 : 0,
    ...(isMarshal ? {
      resistance: {
        mode: 'custom' as const,
        values: { phys: 75, cold: 75, fire: 75, light: 75, poison: 75 },
        caps: { phys: 75, cold: 75, fire: 75, light: 75, poison: 75 },
      },
      controlReduction: { hurt: 95, cold: 77, stun: 95, poison: 90 },
      attackCycleMs: 420,
      boundedHome: true,
    } : isGeneral ? {
      resistance: {
        mode: 'custom' as const,
        values: { phys: 40, cold: 40, fire: 40, light: 40, poison: 40 },
        caps: { phys: 40, cold: 40, fire: 40, light: 40, poison: 40 },
      },
      controlReduction: { hurt: 60, cold: 45, stun: 60, poison: 50 },
    } : {}),
    boss: s.boss || undefined,
    scale: s.scale,
    speed: isMarshal ? 160 : 180,
    vision: isMarshal ? 800 : 520,
    leash: isMarshal ? 1000 : 1200,
    attackCooldown: isMarshal ? 0.6 : isGeneral ? 1.2 : 1.7,
    skills: s.skills,
    expOverride: 0,
    hitRecover: isMarshal ? 95 : isGeneral ? 60 : 0,
  };
}

/** Rải ngẫu nhiên quanh tâm (tỉ lệ iso Y = 0.5) để bot & người chơi không đứng chồng khít lên 1 tọa độ. */
export function scatterTkPoint(
  center: { x: number; y: number },
  minR = 60,
  maxR = 240,
  rand: () => number = Math.random,
): { x: number; y: number } {
  const angle = rand() * Math.PI * 2;
  const dist = minR + rand() * Math.max(0, maxR - minR);
  return {
    x: Math.round(center.x + Math.cos(angle) * dist),
    y: Math.round(center.y + Math.sin(angle) * dist * 0.5),
  };
}

class TongKimManager {
  private matchId = 0;
  private currentBattleMapId = TK_BATTLE_MAP_ID;
  private mode: TkMode = 1;
  private phase: TkPhase = 'closed';
  private phaseEndsAt = 0;
  private marshalSpawnAt = 0;
  private marshalSpawned = false;
  private tongMarshalId: string | null = null;
  private kimMarshalId: string | null = null;
  private winner: 'tong' | 'kim' | 'draw' | '' = '';
  private winReason = '';
  private allowSolo = false;
  private timing: { signupSec: number; marshalDelaySec: number; durationSec: number; endSec: number; respawnStepsSec: number[] } = {
    ...TK_DEFAULT_TIMING,
    respawnStepsSec: [...TK_SIEGE.respawnStepsSec],
  };
  private entries = new Map<string, TkPlayerEntry>();
  private npcRespawns: TkNpcRespawn[] = [];
  private npcsSpawned = false;
  private lastScheduleMinuteKey = '';
  private rewardsGranted = false;
  private clarionUses: Record<TkCamp, number> = { tong: 0, kim: 0 };
  private devStealthChars = new Set<string>();
  private siegeNextWaveAt = 0;
  private siegeWaveNo = 0;
  private siegeTowers = new Map<string, { spec: TkTowerSpec; camp: TkCamp; simId: string; hp: number; maxHp: number; alive: boolean; invuln: boolean }>();

  isDevStealth(charId?: string): boolean {
    return !!charId && this.devStealthChars.has(charId);
  }

  toggleDevStealth(sim: Sim): boolean {
    if (!sim.charId) return false;
    const next = !this.devStealthChars.has(sim.charId);
    if (next) this.devStealthChars.add(sim.charId);
    else this.devStealthChars.delete(sim.charId);
    sim.a.stealth = next;
    return next;
  }

  get currentPhase(): TkPhase { return this.phase; }
  get currentMatchId(): number { return this.matchId; }
  get battleMapId(): number { return this.currentBattleMapId; }
  private layout(): TkBattleMapConfig { return tkMapLayout(this.currentBattleMapId) ?? tkMapLayout(TK_BATTLE_MAP_ID)!; }

  /** Chọn tọa độ ngẫu nhiên walkable trong vùng an toàn Hậu doanh của phe để tránh đứng chồng nhau. */
  private safeCampSpawn(w: World, camp: TkCamp, center = this.layout()[camp].spawn): [number, number] {
    for (let i = 0; i < 4; i++) {
      const p = scatterTkPoint(center, 60, 240);
      const [sx, sy] = nearestWalkable(w.grid, p.x, p.y);
      if (isInTkSafeCamp(this.currentBattleMapId, sx, sy)) return [sx, sy];
    }
    return nearestWalkable(w.grid, center.x, center.y);
  }

  /** Tọa độ ngẫu nhiên quanh điểm báo danh map 323 của phe để tránh đứng chồng nhau. */
  private signupPoint(camp: TkCamp): { x: number; y: number } {
    return scatterTkPoint(TK_SIGNUP_ENTRY[camp], 60, 240);
  }

  /** Kiểm tra lịch tự động (gọi mỗi giây từ server). */
  tickSchedule(now = Date.now()): void {
    if (this.phase !== 'closed') return;
    const d = new Date(now);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}:${d.getMinutes()}`;
    if (key === this.lastScheduleMinuteKey) return;
    const slot = TK_SCHEDULE.find(s => s.hour === d.getHours() && s.minute === d.getMinutes());
    if (!slot) return;
    this.lastScheduleMinuteKey = key;
    this.startMatch({ mode: slot.mode, allowSolo: false });
  }

  nextScheduleLabel(now = Date.now()): string {
    const d = new Date(now);
    const mins = d.getHours() * 60 + d.getMinutes();
    for (const s of TK_SCHEDULE) {
      if (s.hour * 60 + s.minute > mins) {
        return `${String(s.hour).padStart(2, '0')}:${String(s.minute).padStart(2, '0')} (${TK_MODE_NAMES[s.mode]})`;
      }
    }
    const first = TK_SCHEDULE[0];
    return `Ngày mai ${String(first.hour).padStart(2, '0')}:${String(first.minute).padStart(2, '0')}`;
  }

  /** Mở trận mới (tự động hoặc qua dev/admin). */
  startMatch(opts: TkStartOptions & { battleMapId?: number } = {}): { ok: boolean; message: string; matchId: number } {
    if (this.phase !== 'closed') {
      return { ok: false, message: `Chiến trường Tống Kim trận #${this.matchId} đang ở giai đoạn ${this.phase}.`, matchId: this.matchId };
    }
    const requestedMapId = Number.isInteger(opts.battleMapId) ? Number(opts.battleMapId) : TK_BATTLE_MAP_ID;
    const cfg = tkMapLayout(requestedMapId);
    if (!cfg) {
      return { ok: false, message: `Map #${requestedMapId} chưa được cấu hình cho chiến trường Tống Kim.`, matchId: this.matchId };
    }
    const now = Date.now();
    this.matchId++;
    this.currentBattleMapId = cfg.id;
    this.mode = opts.mode === 3 ? 3 : opts.mode === 2 ? 2 : 1;
    const customSteps = Array.isArray(opts.respawnStepsSec)
      ? opts.respawnStepsSec.map(v => Math.round(Number(v))).filter(v => Number.isFinite(v) && v >= 1 && v <= 600)
      : [];
    this.timing = {
      signupSec: Math.max(5, Math.min(1800, Math.floor(opts.signupSec ?? TK_DEFAULT_TIMING.signupSec))),
      marshalDelaySec: Math.max(5, Math.min(3600, Math.floor(opts.marshalDelaySec ?? TK_DEFAULT_TIMING.marshalDelaySec))),
      durationSec: Math.max(30, Math.min(7200, Math.floor(opts.durationSec ?? TK_DEFAULT_TIMING.durationSec))),
      endSec: Math.max(5, Math.min(300, Math.floor(opts.endSec ?? TK_DEFAULT_TIMING.endSec))),
      respawnStepsSec: customSteps.length ? customSteps : [...TK_SIEGE.respawnStepsSec],
    };
    this.allowSolo = !!opts.allowSolo;
    this.phase = 'signup';
    this.phaseEndsAt = now + this.timing.signupSec * 1000;
    this.marshalSpawnAt = 0;
    this.marshalSpawned = false;
    this.tongMarshalId = null;
    this.kimMarshalId = null;
    this.winner = '';
    this.winReason = '';
    this.entries.clear();
    this.npcRespawns = [];
    this.npcsSpawned = false;
    this.rewardsGranted = false;
    this.clarionUses = { tong: 0, kim: 0 };
    this.siegeNextWaveAt = 0;
    this.siegeWaveNo = 0;
    this.siegeTowers.clear();
    return {
      ok: true,
      matchId: this.matchId,
      message: `Chiến trường Tống Kim #${this.matchId} (${TK_MODE_NAMES[this.mode]}) đã mở báo danh (${this.timing.signupSec}s)!`,
    };
  }

  /** Dừng trận ngay (dev/admin). */
  stopMatch(w?: World): { ok: boolean; message: string } {
    if (this.phase === 'closed') return { ok: false, message: 'Hiện không có trận Tống Kim nào đang mở.' };
    if (w) {
      this.clearBattleNpcs(w);
      this.evacuateAll(w);
    }
    this.phase = 'closed';
    this.entries.clear();
    this.npcRespawns = [];
    this.npcsSpawned = false;
    this.tongMarshalId = null;
    this.kimMarshalId = null;
    return { ok: true, message: `Đã đóng chiến trường Tống Kim #${this.matchId}.` };
  }

  counts(): { tong: number; kim: number; tongScore: number; kimScore: number } {
    let tong = 0, kim = 0, tongScore = 0, kimScore = 0;
    for (const e of this.entries.values()) {
      if (e.camp === 'tong') { tong++; tongScore += e.points; }
      else { kim++; kimScore += e.points; }
    }
    return { tong, kim, tongScore, kimScore };
  }

  getEntry(charId: string): TkPlayerEntry | undefined {
    return this.entries.get(charId);
  }

  /** Người chơi đăng ký tại Mộ Binh Quan (map 323). */
  registerPlayer(sim: Sim, camp: TkCamp): { ok: boolean; message: string; spawn?: { x: number; y: number } } {
    if (!sim.charId) return { ok: false, message: 'Không xác định được nhân vật.' };
    if (this.phase !== 'signup' && this.phase !== 'fighting') {
      return { ok: false, message: `Chiến trường Tống Kim hiện chưa mở báo danh (lịch kế tiếp: ${this.nextScheduleLabel()}).` };
    }
    const level = sim.progress?.prog.level ?? sim.a.level;
    if (level < TK_MIN_LEVEL) {
      return { ok: false, message: `Cần đạt cấp ${TK_MIN_LEVEL} trở lên mới có thể tham gia chiến trường Tống Kim.` };
    }
    const existing = this.entries.get(sim.charId);
    if (existing) {
      if (existing.camp !== camp) {
        return { ok: false, message: `Bạn đã báo danh phe ${TK_CAMP_NAMES[existing.camp]} trong trận này, không thể đổi phe.` };
      }
      return { ok: true, message: `Quay lại doanh trại phe ${TK_CAMP_NAMES[camp]}!`, spawn: this.layout()[camp].spawn };
    }
    const { tong, kim } = this.counts();
    const myCount = camp === 'tong' ? tong : kim;
    const otherCount = camp === 'tong' ? kim : tong;
    if (myCount >= TK_MAX_PER_CAMP) {
      return { ok: false, message: `Quân số phe ${TK_CAMP_NAMES[camp]} đã đạt tối đa (${TK_MAX_PER_CAMP} người).` };
    }
    if (myCount > otherCount + TK_BALANCE_DIFF) {
      return { ok: false, message: `Phe ${TK_CAMP_NAMES[camp]} đang đông hơn đối phương (${tong} Tống vs ${kim} Kim, tối đa chênh ${TK_BALANCE_DIFF}). Hãy chọn phe còn lại hoặc chờ cân bằng.` };
    }
    const money = sim.money ?? 0;
    if (money < TK_SIGNUP_FEE) {
      return { ok: false, message: `Cần ${TK_SIGNUP_FEE.toLocaleString('vi-VN')} lượng phí báo danh.` };
    }
    sim.money = money - TK_SIGNUP_FEE;
    const char = db.getCharacter(sim.charId);
    let campSwitchedNote = '';
    if (char) {
      if (char.tkCampLast && char.tkCampLast !== camp) {
        campSwitchedNote = ' (Đã đổi phe so với trận trước)';
      }
      db.updateCharacter(sim.charId, { tkCampLast: camp });
    }
    this.entries.set(sim.charId, {
      charId: sim.charId,
      name: sim.a.name,
      faction: sim.a.faction,
      camp,
      points: 0,
      rank: 1,
      kills: 0,
      deaths: 0,
      npcKills: 0,
      streak: 0,
      maxStreak: 0,
      online: false,
      paidFee: true,
      inCamp: true,
      enteredCampAt: Date.now(),
    });
    return {
      ok: true,
      message: `Báo danh phe ${TK_CAMP_NAMES[camp]} thành công (-${TK_SIGNUP_FEE.toLocaleString('vi-VN')} lượng)${campSwitchedNote}!`,
      spawn: this.layout()[camp].spawn,
    };
  }

  /** Gọi khi nhân vật bước vào map 378. */
  onEnterBattleMap(w: World, sim: Sim): boolean {
    if (!sim.charId) return false;
    const entry = this.entries.get(sim.charId);
    if (!entry || this.phase === 'closed') {
      const char = db.getCharacter(sim.charId);
      const destId = char?.tkCampLast ? TK_SIGNUP_MAP_ID : 78;
      const destPos = char?.tkCampLast ? this.signupPoint(char.tkCampLast) : { x: 12800, y: 8960 };
      setTimeout(() => {
        if (!w.sims.has(sim.id)) return;
        w.hooks.notify(sim, 'Chiến trường Tống Kim đã kết thúc hoặc bạn chưa báo danh.');
        w.hooks.transfer(sim, destId, destPos.x, destPos.y);
      }, 250);
      return false;
    }
    entry.online = true;
    entry.inCamp = true;
    entry.enteredCampAt = w.now;
    sim.a.battleCamp = entry.camp;
    sim.a.battleRank = entry.rank;
    sim.a.pk = this.phase === 'fighting' ? 1 : 0;
    const [sx, sy] = this.safeCampSpawn(w, entry.camp);
    sim.a.x = sx;
    sim.a.y = sy;
    sim.path = [];
    if (sim.progress) {
      refreshStats(sim, false);
      w.hooks.progress(sim);
    }
    return true;
  }

  /** Gọi khi nhân vật rời map 378 (chuyển map / thoát game). */
  onLeaveBattleMap(sim: Sim): void {
    if (sim.charId) {
      const entry = this.entries.get(sim.charId);
      if (entry) {
        entry.online = false;
        entry.streak = 0;
      }
    }
    if (sim.a.battleCamp || sim.a.battleRank) {
      sim.a.battleCamp = '';
      sim.a.battleRank = 0;
      if (sim.progress) refreshStats(sim, false);
    }
  }

  /** Bước qua cổng hoặc portal trên map chiến trường (xuất trận ngẫu nhiên quanh điểm đích, hoặc về Hậu doanh). */
  useBattlePortal(w: World, sim: Sim, portal: Portal): boolean {
    if (!sim.charId || w.meta.id !== this.currentBattleMapId) return false;
    const entry = this.entries.get(sim.charId);
    if (!entry) return false;
    const portalCamp: TkCamp | null = portal.id.includes('-tong-') ? 'tong' : portal.id.includes('-kim-') ? 'kim' : null;
    if (portalCamp && portalCamp !== entry.camp) {
      sim.path = [];
      w.hooks.notify(sim, `Đây là cổng truyền tống của phe ${TK_CAMP_NAMES[portalCamp]}!`);
      return true;
    }
    const isOutgoing = portal.id.endsWith('-out');
    if (isOutgoing) {
      if (this.phase !== 'fighting') {
        sim.path = [];
        w.hooks.notify(sim, 'Trận đấu chưa khai chiến, hãy chờ trong doanh trại.');
        return true;
      }
      const waitMs = TK_GATE_WAIT_SEC * 1000 - (w.now - entry.enteredCampAt);
      if (entry.inCamp && waitMs > 0) {
        sim.path = [];
        w.hooks.notify(sim, `Cần chờ thêm ${Math.ceil(waitMs / 1000)} giây mới có thể xuất trận.`);
        return true;
      }
      const angle = Math.random() * Math.PI * 2;
      const dist = 40 + Math.random() * 110;
      const [tx, ty] = nearestWalkable(w.grid, portal.toX + Math.cos(angle) * dist, portal.toY + Math.sin(angle) * dist * 0.5);
      sim.a.x = tx;
      sim.a.y = ty;
      sim.path = [];
      sim.queuedMove = undefined;
      sim.pending = null;
      sim.lockedAttack = undefined;
      sim.a.attackTarget = '';
      sim.a.pk = 1;
      entry.inCamp = false;
      return true;
    }
    // Portal quay về Hậu doanh (rải ngẫu nhiên quanh điểm đáp trong vùng an toàn)
    const [bx, by] = this.safeCampSpawn(w, entry.camp, { x: portal.toX, y: portal.toY });
    sim.a.x = bx;
    sim.a.y = by;
    sim.path = [];
    sim.queuedMove = undefined;
    sim.pending = null;
    sim.lockedAttack = undefined;
    sim.a.attackTarget = '';
    entry.inCamp = true;
    entry.enteredCampAt = w.now;
    w.hooks.notify(sim, `Đã quay về điểm tập kết Hậu doanh phe ${TK_CAMP_NAMES[entry.camp]}.`);
    return true;
  }

  /** Đẩy người chơi/bot ra điểm đáp bên ngoài cổng khi đứng quá lâu trong Hậu doanh. */
  private pushOutOfCamp(w: World, sim: Sim, entry: TkPlayerEntry): void {
    const outPortal = w.meta.portals?.find(p => p.id === `tk-${entry.camp}-out`);
    const base = outPortal ? { x: outPortal.toX, y: outPortal.toY } : this.layout()[entry.camp].gateExit;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 110;
    let [x, y] = nearestWalkable(w.grid, base.x + Math.cos(angle) * dist, base.y + Math.sin(angle) * dist * 0.5);
    if (isInTkSafeCamp(this.currentBattleMapId, x, y)) {
      [x, y] = nearestWalkable(w.grid, base.x, base.y);
    }
    sim.a.x = x;
    sim.a.y = y;
    sim.path = [];
    sim.queuedMove = undefined;
    sim.pending = null;
    sim.lockedAttack = undefined;
    sim.a.attackTarget = '';
    sim.a.pk = 1;
    entry.inCamp = false;
  }

  /** Bước qua cổng doanh trại ra chiến trường (sau 5s chờ). */
  exitGate(w: World, sim: Sim): { ok: boolean; message: string } {
    if (!sim.charId) return { ok: false, message: 'Không xác định được nhân vật.' };
    const entry = this.entries.get(sim.charId);
    if (!entry || w.meta.id !== this.currentBattleMapId) return { ok: false, message: 'Bạn không ở trong chiến trường Tống Kim.' };
    if (this.phase !== 'fighting') return { ok: false, message: 'Trận đấu chưa khai chiến, hãy chờ trong doanh trại.' };
    if (sim.dead) return { ok: false, message: 'Đang chờ hồi sinh.' };
    const waitMs = TK_GATE_WAIT_SEC * 1000 - (w.now - entry.enteredCampAt);
    if (entry.inCamp && waitMs > 0) {
      return { ok: false, message: `Cần chờ thêm ${Math.ceil(waitMs / 1000)} giây mới có thể xuất trận qua cổng.` };
    }
    const target = this.layout()[entry.camp].gateExit;
    const angle = Math.random() * Math.PI * 2;
    const dist = 200 + Math.random() * 100;
    let [x, y] = nearestWalkable(w.grid, Math.round(target.x + Math.cos(angle) * dist), Math.round(target.y + Math.sin(angle) * dist));
    if (isInTkSafeCamp(this.currentBattleMapId, x, y)) {
      [x, y] = nearestWalkable(w.grid, target.x, target.y);
    }
    sim.a.x = x;
    sim.a.y = y;
    sim.path = [];
    sim.pending = null;
    sim.lockedAttack = undefined;
    sim.a.pk = 1;
    entry.inCamp = false;
    return { ok: true, message: 'Đã xuất trận qua cổng doanh trại!' };
  }

  /** Nói chuyện với Đặc thám / Trinh sát để nhảy thẳng ra tiền tuyến. */
  scoutToFrontline(w: World, sim: Sim): { ok: boolean; message: string } {
    if (!sim.charId) return { ok: false, message: 'Không xác định được nhân vật.' };
    const entry = this.entries.get(sim.charId);
    if (!entry || w.meta.id !== this.currentBattleMapId) return { ok: false, message: 'Bạn không ở trong chiến trường Tống Kim.' };
    if (this.phase !== 'fighting') return { ok: false, message: 'Trận đấu chưa khai chiến.' };
    if (sim.dead) return { ok: false, message: 'Đang chờ hồi sinh.' };
    const layoutCamp = this.layout()[entry.camp];
    const list = layoutCamp.frontlines.length ? layoutCamp.frontlines : [layoutCamp.gateExit];
    const pick = list[Math.floor(Math.random() * list.length)];
    const [x, y] = nearestWalkable(w.grid, pick.x, pick.y);
    sim.a.x = x;
    sim.a.y = y;
    sim.path = [];
    sim.pending = null;
    sim.lockedAttack = undefined;
    sim.a.pk = 1;
    entry.inCamp = false;
    return { ok: true, message: 'Đặc thám đã đưa bạn ra thẳng tiền tuyến!' };
  }

  /** Đổi điểm tích lũy Tống Kim lấy EXP tại Quân Nhu Quan (map 323). */
  exchangeAccumForExp(w: World, sim: Sim, requested: number): { ok: boolean; message: string } {
    if (!sim.charId || !sim.progress) return { ok: false, message: 'Không xác định được nhân vật.' };
    if (w.meta.id !== TK_SIGNUP_MAP_ID) return { ok: false, message: 'Chỉ có thể đổi điểm tích lũy tại Quân Nhu Quan (Điểm báo danh 323).' };
    const char = db.getCharacter(sim.charId);
    if (!char) return { ok: false, message: 'Không tìm thấy dữ liệu nhân vật.' };
    const have = Math.max(0, Math.floor(char.tkAccum ?? 0));
    if (have <= 0) return { ok: false, message: 'Bạn chưa có điểm tích lũy Tống Kim nào để đổi.' };
    const spend = requested > 0 ? Math.min(have, Math.floor(requested)) : have;
    if (spend <= 0) return { ok: false, message: 'Số điểm đổi không hợp lệ.' };
    const remainAccum = have - spend;
    db.updateCharacter(sim.charId, { tkAccum: remainAccum });
    const expGain = spend * TK_EXP_PER_ACCUM;
    gainExp(w, sim, expGain);
    w.hooks.log(sim, 'exp', `Đổi ${spend.toLocaleString('vi-VN')} điểm tích lũy Tống Kim nhận +${expGain.toLocaleString('vi-VN')} kinh nghiệm.`);
    return { ok: true, message: `Đổi thành công ${spend.toLocaleString('vi-VN')} điểm tích lũy → +${expGain.toLocaleString('vi-VN')} EXP (còn ${remainAccum.toLocaleString('vi-VN')} điểm).` };
  }

  /** Tick chính cho map 378 (gọi mỗi tick của World map 378, hoặc timer nền khi phòng rỗng). */
  tickBattleWorld(w?: World, now = Date.now()): void {
    this.tickSchedule(now);
    if (this.phase === 'closed') return;

    // 1. Chuyển pha theo đồng hồ server
    if (this.phase === 'signup' && now >= this.phaseEndsAt) {
      const { tong, kim } = this.counts();
      if (!this.allowSolo && (tong === 0 || kim === 0)) {
        if (w) {
          w.hooks.announce('Một trong hai phe không có người tham chiến. Trận Tống Kim bị hủy!');
          this.evacuateAll(w);
        }
        this.phase = 'closed';
        this.entries.clear();
        return;
      }
      this.phase = 'fighting';
      this.phaseEndsAt = now + this.timing.durationSec * 1000;
      this.marshalSpawnAt = now + this.timing.marshalDelaySec * 1000;
      if (w) {
        for (const sim of w.sims.values()) {
          if (sim.kind === 'player' && sim.charId) {
            sim.a.pk = 1;
            const e = this.entries.get(sim.charId);
            if (e) e.enteredCampAt = now;
          }
        }
        if (this.mode === 1 && !this.npcsSpawned) {
          this.spawnBattleNpcs(w);
        } else if (this.mode === 3 && !this.npcsSpawned) {
          this.spawnSiegeTowers(w);
          this.siegeNextWaveAt = now + 3000;
        }
        w.hooks.announce(`Chiến trường Tống Kim (${TK_MODE_NAMES[this.mode]}) đã KHAI CHIẾN! Hãy xuất trận!`);
      }
    } else if (this.phase === 'fighting') {
      if (w && this.mode === 1 && !this.npcsSpawned) this.spawnBattleNpcs(w);
      if (w && this.mode === 1 && !this.marshalSpawned && now >= this.marshalSpawnAt) {
        this.spawnMarshals(w);
      }
      if (w && this.mode === 3 && !this.npcsSpawned) {
        this.spawnSiegeTowers(w);
        this.siegeNextWaveAt = now + 3000;
      }
      if (w && this.mode === 3 && this.npcsSpawned && now >= this.siegeNextWaveAt) {
        this.spawnSiegeWaves(w, now);
      }
      if (now >= this.phaseEndsAt) {
        const { tongScore, kimScore } = this.counts();
        const tongAlive = !!this.tongMarshalId;
        const kimAlive = !!this.kimMarshalId;
        let win: 'tong' | 'kim' | 'draw';
        let reason: string;
        if (this.mode === 3) {
          const stats = this.siegeEndStats(w);
          const diff = stats.tongPct - stats.kimPct;
          if (Math.abs(diff) > 1e-6) {
            win = diff > 0 ? 'tong' : 'kim';
            reason = `Hết giờ — phe ${TK_CAMP_NAMES[win]} thắng nhờ tổng HP công trình còn lại cao hơn (Tống ${(stats.tongPct * 100).toFixed(1)}% vs Kim ${(stats.kimPct * 100).toFixed(1)}%)!`;
          } else {
            win = 'draw';
            reason = `Hết giờ — hai phe hòa nhau về tổng HP công trình (${(stats.tongPct * 100).toFixed(1)}%)!`;
          }
        } else if (this.mode === 1 && this.marshalSpawned && tongAlive !== kimAlive) {
          win = tongAlive ? 'tong' : 'kim';
          reason = `Hết giờ — phe ${TK_CAMP_NAMES[win]} bảo toàn được Nguyên Soái và hạ gục Nguyên Soái đối phương để giành chiến thắng!`;
        } else {
          win = tongScore > kimScore ? 'tong' : kimScore > tongScore ? 'kim' : 'draw';
          const marshalNote = this.mode === 1 && this.marshalSpawned
            ? (tongAlive ? ' (cả hai Nguyên Soái đều còn sống)' : ' (cả hai Nguyên Soái đều đã ngã xuống)')
            : '';
          reason = win === 'draw'
            ? `Hết giờ${marshalNote} — hai phe hòa nhau (${tongScore} điểm)!`
            : `Hết giờ${marshalNote} — phe ${TK_CAMP_NAMES[win]} thắng theo tổng điểm (${tongScore} Tống vs ${kimScore} Kim)!`;
        }
        this.finishMatch(w, win, reason, now);
      }
    } else if (this.phase === 'ended' && now >= this.phaseEndsAt) {
      if (w) {
        this.clearBattleNpcs(w);
        this.evacuateAll(w);
      }
      this.phase = 'closed';
      this.entries.clear();
      this.npcRespawns = [];
      this.npcsSpawned = false;
      this.tongMarshalId = null;
      this.kimMarshalId = null;
      return;
    }

    if (!w) return;

    // Đồng bộ HP trụ hiện tại cho snapshot
    if (this.mode === 3 && this.siegeTowers.size) {
      for (const t of this.siegeTowers.values()) {
        if (!t.alive) continue;
        const ts = w.sims.get(t.simId);
        if (ts) t.hp = Math.max(0, ts.hp);
      }
    }

    // 2. Xử lý hồi sinh & luật doanh trại cho người chơi trên map 378
    for (const sim of w.sims.values()) {
      if (sim.kind !== 'player' || !sim.charId) continue;
      const entry = this.entries.get(sim.charId);
      if (!entry) continue;

      if (sim.dead && sim.tkRespawnAt && now >= sim.tkRespawnAt) {
        sim.tkRespawnAt = undefined;
        const [rx, ry] = this.safeCampSpawn(w, entry.camp);
        revive(w, sim, rx, ry);
        sim.a.pk = this.phase === 'fighting' ? 1 : 0;
        entry.inCamp = true;
        entry.enteredCampAt = now;
        w.hooks.notify(sim, `Đã hồi sinh tại Hậu doanh phe ${TK_CAMP_NAMES[entry.camp]}.`);
        continue;
      }
      if (sim.dead) continue;

      const campHere = tkHomeCampAt(this.currentBattleMapId, sim.a.x, sim.a.y);
      if (campHere && campHere !== entry.camp) {
        // Không cho địch xâm nhập Hậu doanh đối phương
        const push = this.layout()[campHere].gateExit;
        const [px, py] = nearestWalkable(w.grid, push.x, push.y);
        sim.a.x = px;
        sim.a.y = py;
        sim.path = [];
        w.hooks.notify(sim, 'Không thể xâm nhập Hậu doanh đối phương!');
        continue;
      }

      if (campHere === entry.camp) {
        if (!entry.inCamp) {
          entry.inCamp = true;
          entry.enteredCampAt = now;
        } else if (this.phase === 'fighting' && now - entry.enteredCampAt >= TK_CAMP_KICK_SEC * 1000) {
          this.pushOutOfCamp(w, sim, entry);
          w.hooks.notify(sim, `Bạn ở trong doanh trại quá ${TK_CAMP_KICK_SEC} giây, đã tự động xuất trận ra ngoài cổng!`);
        }
      } else {
        entry.inCamp = false;
      }
    }

    // 3. Tái sinh NPC chiến trường (Hiệu úy / Thống lĩnh / Binh sĩ)
    if (this.phase === 'fighting' && this.mode === 1 && this.npcRespawns.length) {
      for (let i = this.npcRespawns.length - 1; i >= 0; i--) {
        const r = this.npcRespawns[i];
        if (now >= r.respawnAt) {
          this.npcRespawns.splice(i, 1);
          this.spawnOneNpc(w, r.camp, r.role, r.x, r.y);
        }
      }
    }
  }

  /** Xử lý khi 1 thực thể bị hạ gục trên map chiến trường. Trả về true nếu đã xử lý kiểu Tống Kim. */
  onTkKill(w: World, target: Sim, killer?: Sim): boolean {
    if (w.meta.id !== this.currentBattleMapId || this.phase !== 'fighting') return false;

    if (target.kind === 'player' && target.charId) {
      const victim = this.entries.get(target.charId);
      if (victim) {
        victim.deaths++;
        victim.streak = 0;
        const delayMs = tkRespawnDelayMs(this.mode, victim.deaths, this.timing.respawnStepsSec);
        target.tkRespawnAt = w.now + delayMs;
        w.hooks.notify(target, `Bạn đã tử trận! Tự động hồi sinh tại doanh trại sau ${Math.round(delayMs / 1000)} giây (không mất EXP/đồ).`);
      }
      if (killer?.kind === 'player' && killer.charId && victim) {
        const atk = this.entries.get(killer.charId);
        if (atk && atk.camp !== victim.camp) {
          atk.kills++;
          atk.streak++;
          if (atk.streak > atk.maxStreak) atk.maxStreak = atk.streak;
          const { killPts, streakPts, total } = tkKillPlayerPoints(victim.rank, atk.streak);
          this.awardPoints(w, killer, atk, total, `Hạ gục ${victim.name} (+${killPts} điểm, Liên trảm ${atk.streak} +${streakPts} điểm).`);
        }
      }
      return true;
    }

    if (target.kind === 'monster' && target.tkTowerId && target.tkCamp && target.tkTowerTier) {
      const towerCamp = target.tkCamp;
      const winCamp: TkCamp = towerCamp === 'tong' ? 'kim' : 'tong';
      const entryRec = this.siegeTowers.get(target.tkTowerId);
      if (entryRec) {
        entryRec.alive = false;
        entryRec.hp = 0;
      }
      this.refreshSiegeInvuln(w);
      let creditPlayer = killer?.kind === 'player' ? killer : undefined;
      if (!creditPlayer && target.dmgBy?.size) {
        let bestDmg = 0;
        for (const [id, dmg] of target.dmgBy) {
          const cand = w.sims.get(id);
          if (cand?.kind === 'player' && cand.a.battleCamp === winCamp && dmg > bestDmg) {
            bestDmg = dmg;
            creditPlayer = cand;
          }
        }
      }
      const pts = TK_SIEGE.towerPoints[target.tkTowerTier];
      if (creditPlayer?.charId) {
        const atk = this.entries.get(creditPlayer.charId);
        if (atk && atk.camp === winCamp) {
          atk.npcKills++;
          this.awardPoints(w, creditPlayer, atk, pts, `Phá hủy ${target.a.name} (+${pts} điểm tích lũy)!`);
        }
      }
      const teamBonus = TK_SIEGE.towerTeamBonus[target.tkTowerTier];
      for (const s of w.sims.values()) {
        if (s.kind !== 'player' || !s.charId || s === creditPlayer) continue;
        const e = this.entries.get(s.charId);
        if (e && e.camp === winCamp) {
          this.awardPoints(w, s, e, teamBonus, `Đồng đội phá hủy ${target.a.name} (+${teamBonus} điểm)!`);
        }
      }
      const killerName = creditPlayer?.a.name ?? `phe ${TK_CAMP_NAMES[winCamp]}`;
      if (target.tkTowerTier === 'nexus') {
        this.spawnRuinedNexus(w, towerCamp, target.a.x, target.a.y);
        w.hooks.announce(`${target.a.name} đã bị ${killerName} phá hủy! Phe ${TK_CAMP_NAMES[winCamp]} giành chiến thắng!`);
        this.finishMatch(w, winCamp, `Phe ${TK_CAMP_NAMES[winCamp]} đã phá hủy Nhà Chính quân địch!`, Date.now());
      } else {
        const aliveLeft = [...this.siegeTowers.values()].filter(t => t.camp === towerCamp && t.alive).length;
        const dmgScale = tkTowerDamageScale(aliveLeft);
        const dmgNote = dmgScale <= 0
          ? ` Phe ${TK_CAMP_NAMES[towerCamp]} chỉ còn ${aliveLeft} trụ — sát thương trụ trở về bình thường!`
          : ` Sát thương trụ còn lại của phe ${TK_CAMP_NAMES[towerCamp]} giảm còn ${Math.round(dmgScale * 100)}%!`;
        const winBonusPct = Math.round((tkTowerKillDamageMul(this.siegeDestroyedEnemyTowers(winCamp)) - 1) * 100);
        const bonusNote = winBonusPct > 0 ? ` Phe ${TK_CAMP_NAMES[winCamp]} được tăng +${winBonusPct}% sát thương toàn quân!` : '';
        w.hooks.announce(`${target.a.name} đã bị ${killerName} phá hủy!${dmgNote}${bonusNote}`);
        for (const sim of w.sims.values()) {
          if (sim.kind !== 'player') continue;
          if (sim.a.battleCamp === towerCamp) w.hooks.notify(sim, `${target.a.name} của phe ta đã bị phá hủy!`, 'danger');
          else if (sim.a.battleCamp === winCamp) w.hooks.notify(sim, `Đã phá hủy ${target.a.name} của quân địch!`, 'victory');
        }
      }
      return true;
    }

    if (target.kind === 'monster' && target.tkCamp && target.tkRole) {
      const npcCamp = target.tkCamp;
      const role = target.tkRole;
      let creditPlayer = killer?.kind === 'player' ? killer : undefined;
      if (!creditPlayer && target.dmgBy?.size) {
        let bestDmg = 0;
        for (const [id, dmg] of target.dmgBy) {
          const cand = w.sims.get(id);
          if (cand?.kind === 'player' && cand.a.battleCamp && cand.a.battleCamp !== npcCamp && dmg > bestDmg) {
            bestDmg = dmg;
            creditPlayer = cand;
          }
        }
      }
      if (creditPlayer && creditPlayer.charId) {
        const atk = this.entries.get(creditPlayer.charId);
        if (atk && atk.camp !== npcCamp) {
          atk.npcKills++;
          const pts = role === 'marshal' ? TK_POINTS.killMarshal
            : role === 'general' ? TK_POINTS.killNpcGeneral
            : role === 'deputy' ? TK_POINTS.killNpcDeputy
            : role === 'commander' ? TK_POINTS.killNpcCommander
            : role === 'captain' ? TK_POINTS.killNpcCaptain
            : TK_POINTS.killNpcSoldier;
          this.awardPoints(w, creditPlayer, atk, pts, `Hạ gục ${target.a.name} (+${pts} điểm tích lũy).`);
        }
      }
      if (role === 'marshal') {
        if (npcCamp === 'tong') this.tongMarshalId = null;
        else this.kimMarshalId = null;
        const winCamp: TkCamp = npcCamp === 'tong' ? 'kim' : 'tong';
        const killerName = creditPlayer?.a.name ?? killer?.a.name ?? `phe ${TK_CAMP_NAMES[winCamp]}`;
        const otherAlive = winCamp === 'tong' ? !!this.tongMarshalId : !!this.kimMarshalId;
        if (otherAlive) {
          w.hooks.announce(`${target.a.name} đã bị ${killerName} hạ gục! Phe ${TK_CAMP_NAMES[winCamp]} đang chiếm ưu thế — hãy bảo vệ Nguyên Soái tới hết giờ!`);
        } else {
          w.hooks.announce(`${target.a.name} đã bị ${killerName} hạ gục! Cả hai Nguyên Soái đều đã ngã xuống — thắng bại sẽ phân định bằng tổng điểm khi hết giờ!`);
        }
        for (const sim of w.sims.values()) {
          if (sim.kind !== 'player') continue;
          if (sim.a.battleCamp === npcCamp) {
            w.hooks.notify(sim, 'Nguyên soái quân ta đã bị ám sát. Tổng tấn công phe địch', 'danger');
          } else if (sim.a.battleCamp === winCamp) {
            w.hooks.notify(sim, 'Nguyên soái quân địch đã bị giết.', 'victory');
          }
        }
      } else {
        // Rơi vật phẩm chiến trường khi hạ binh sĩ/tướng phe địch (không rơi trang bị/bạc)
        if (creditPlayer) {
          const dropPool = (role === 'commander' || role === 'deputy' || role === 'general')
            ? TK_DROP_OFFICER_IDS
            : TK_DROP_COMMON_IDS;
          const dropChance = role === 'general' ? 1.0
            : (role === 'commander' || role === 'deputy') ? 0.85
            : role === 'captain' ? 0.65
            : 0.45;
          const dropCount = role === 'general' ? 2 : (role === 'commander' || role === 'deputy') && Math.random() < 0.4 ? 2 : 1;
          if (Math.random() < dropChance) {
            for (let di = 0; di < dropCount; di++) {
              const dropId = dropPool[Math.floor(Math.random() * dropPool.length)];
              const def = ITEMS[dropId];
              if (def) {
                dropBattleItem(
                  w,
                  target.a.x + (di ? 28 : 0),
                  target.a.y + (di ? 14 : 0),
                  createItem(def, `tkd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
                  creditPlayer.id,
                );
              }
            }
          }
        }
        const respawnMs = TK_NPC_STATS[role].respawnMs;
        if (respawnMs > 0 && target.home && !target.tkSummoned && !target.tkMinionType) {
          this.npcRespawns.push({ camp: npcCamp, role, x: target.home.x, y: target.home.y, respawnAt: w.now + respawnMs });
        }
      }
      return true;
    }

    return false;
  }

  /** Sử dụng vật phẩm Tống Kim (18 Hoàn, Chiến Cổ, Lệnh Bài, Hiệu Phù, Càn Khôn Tạo Hóa Đan, Bí Bảo). */
  useBattleItem(w: World, sim: Sim, def: ItemDef): boolean {
    const eff = def.tkItem;
    if (!eff) return false;
    if (eff.kind === 'bibao') {
      if (!sim.charId) return false;
      const char = db.getCharacter(sim.charId);
      if (!char) return false;
      const bonus = eff.minAccum + Math.floor(Math.random() * (eff.maxAccum - eff.minAccum + 1));
      db.updateCharacter(sim.charId, { tkAccum: (char.tkAccum ?? 0) + bonus });
      w.hooks.notify(sim, `Mở ${def.name}: nhận +${bonus} điểm tích lũy Tống Kim!`);
      w.hooks.log(sim, 'item', `Mở ${def.name}: +${bonus} điểm tích lũy Tống Kim.`);
      return true;
    }
    if (w.meta.id !== this.currentBattleMapId) {
      w.hooks.notify(sim, `${def.name} chỉ có thể sử dụng trong Chiến trường Tống Kim.`);
      return false;
    }
    if (eff.kind === 'battlePotion') {
      drinkPotion(sim, def);
      return true;
    }
    if (eff.kind === 'buff') {
      const myCamp = sim.a.battleCamp;
      if (eff.aoeRadius && myCamp) {
        let count = 0;
        for (const ally of w.sims.values()) {
          if (ally.dead || ally.a.battleCamp !== myCamp) continue;
          if (isoDistance(sim.a.x, sim.a.y, ally.a.x, ally.a.y) <= eff.aoeRadius) {
            addState(w, ally, { skill: eff.stateId, kind: 'buff', ms: eff.durationMs, by: sim.id, attrs: eff.attrs });
            count++;
          }
        }
        w.hooks.notify(sim, `Kích hoạt ${def.name} (+3 phút cho ${count} đồng đội)!`);
      } else {
        addState(w, sim, { skill: eff.stateId, kind: 'buff', ms: eff.durationMs, by: sim.id, attrs: eff.attrs });
        w.hooks.notify(sim, `Đã dùng ${def.name} (hiệu lực 3 phút).`);
      }
      return true;
    }
    if (eff.kind === 'clarion') {
      const myCamp = sim.a.battleCamp;
      if (myCamp !== 'tong' && myCamp !== 'kim') return false;
      if (this.phase !== 'fighting') {
        w.hooks.notify(sim, 'Chỉ có thể gọi binh sĩ chi viện khi trận đấu đang giao chiến.');
        return false;
      }
      if (this.clarionUses[myCamp] >= 20) {
        w.hooks.notify(sim, `Phe ${TK_CAMP_NAMES[myCamp]} đã dùng tối đa 20 lần Binh Sĩ Hiệu Phù trong trận này.`);
        return false;
      }
      this.clarionUses[myCamp]++;
      const spawnedTitles: string[] = [];
      for (let i = 0; i < eff.count; i++) {
        const ox = (i === 0 ? -45 : 45);
        const [sx, sy] = nearestWalkable(w.grid, sim.a.x + ox, sim.a.y + 20);
        const role = rollClarionNpcRole();
        this.spawnOneNpc(w, myCamp, role, sx, sy, true);
        spawnedTitles.push(TK_NPC_TITLES[myCamp][role]);
      }
      w.hooks.notify(sim, `Đã triệu hồi ${eff.count} chi viện (${spawnedTitles.join(', ')}) (${this.clarionUses[myCamp]}/20)!`);
      return true;
    }
    if (eff.kind === 'trap') {
      if (this.phase !== 'fighting') {
        w.hooks.notify(sim, 'Chỉ có thể đặt bẫy khi trận đấu đang giao chiến.');
        return false;
      }
      const ok = w.engine.castByItem(sim, eff.skillId, eff.level, { x: sim.a.x, y: sim.a.y });
      if (!ok) return false;
      w.hooks.notify(sim, `Đã đặt ${def.name}!`);
      return true;
    }
    return false;
  }

  private awardPoints(w: World, sim: Sim, entry: TkPlayerEntry, pts: number, logText: string): void {
    entry.points += pts;
    const nextRank = tkRankForPoints(entry.points);
    w.hooks.log(sim, 'kill', logText);
    if (nextRank > entry.rank) {
      entry.rank = nextRank;
      sim.a.battleRank = nextRank;
      if (sim.progress) {
        refreshStats(sim, false);
        w.hooks.progress(sim);
      }
      const title = tkTitleOf(entry.camp, nextRank);
      w.hooks.notify(sim, `Chúc mừng! Bạn đã thăng quân hàm lên ${title}!`);
      w.hooks.announce(`${entry.name} lập đại công, thăng hàm ${title}!`);
    }
  }

  private finishMatch(w: World | undefined, winner: 'tong' | 'kim' | 'draw', reason: string, now: number): void {
    if (this.phase === 'ended' || this.phase === 'closed') return;
    this.phase = 'ended';
    this.winner = winner;
    this.winReason = reason;
    // Dừng giao tranh ngay: dọn NPC chiến trường, tắt PK và đóng trận sau thời gian xem kết quả ngắn (tối đa 10s).
    this.phaseEndsAt = now + Math.min(this.timing.endSec, 10) * 1000;
    this.npcRespawns = [];
    this.npcsSpawned = false;
    this.tongMarshalId = null;
    this.kimMarshalId = null;
    if (w) {
      this.clearBattleNpcs(w);
      for (const sim of w.sims.values()) {
        if (sim.kind === 'player') {
          sim.a.pk = 0;
          sim.path = [];
          sim.pending = null;
          sim.lockedAttack = undefined;
        }
      }
      w.hooks.announce(`KẾT THÚC TỐNG KIM: ${reason}`);
    }
    if (!this.rewardsGranted) {
      this.rewardsGranted = true;
      this.grantEndRewards(w);
    }
  }

  private grantEndRewards(w?: World): void {
    const sorted = this.leaderboard();
    const onlineByChar = new Map<string, Sim>();
    if (w) {
      for (const sim of w.sims.values()) {
        if (sim.kind === 'player' && sim.charId) onlineByChar.set(sim.charId, sim);
      }
    }

    // 1. Cộng tích lũy trận + thưởng phe thắng (400 * rank) vào char.tkAccum
    for (const entry of this.entries.values()) {
      const winBonus = this.winner === entry.camp ? TK_POINTS.winBonusPerRank * entry.rank : 0;
      const totalAccum = entry.points + winBonus;
      const char = db.getCharacter(entry.charId);
      if (char && totalAccum > 0) {
        db.updateCharacter(entry.charId, { tkAccum: (char.tkAccum ?? 0) + totalAccum });
      }
      const sim = onlineByChar.get(entry.charId);
      if (sim && w) {
        const bonusTxt = winBonus > 0 ? ` (gồm +${winBonus} thưởng phe thắng)` : '';
        w.hooks.log(sim, 'exp', `Tổng kết Tống Kim: nhận +${totalAccum.toLocaleString('vi-VN')} điểm tích lũy${bonusTxt}.`);
      }
    }

    // 2. Thưởng Top 10 (100.000.000 EXP + 3 / 1 Tiên Thảo Lộ đặc biệt)
    const elixirDef = ITEMS['xiancaolu-sp'];
    for (let i = 0; i < Math.min(10, sorted.length); i++) {
      const top = sorted[i];
      if (top.points <= 0) continue;
      const expReward = i === 0 ? TK_POINTS.top1Exp : TK_POINTS.top2to10Exp;
      const elixirCount = i === 0 ? TK_POINTS.top1ElixirCount : TK_POINTS.top2to10ElixirCount;
      const sim = onlineByChar.get(top.charId);
      if (sim && w) {
        gainExp(w, sim, expReward);
        if (elixirDef && sim.bag) {
          const item: Item = { uid: `tk-${this.matchId}-${i}-${Date.now()}`, def: elixirDef.id, q: 0, qty: elixirCount };
          if (!addToBag(sim.bag, item)) (sim.bagSpill ??= []).push(item);
          w.hooks.inventory(sim);
        }
        w.hooks.notify(sim, `Hạng ${i + 1} Tống Kim! Nhận +${expReward.toLocaleString('vi-VN')} EXP và ${elixirCount} Tiên Thảo Lộ đặc biệt!`);
      }
    }

    // 3. Thưởng kết thúc trận cho Bot (200 vạn + 50 triệu EXP, nhân hệ số Top 10/5/3/1)
    const rankByChar = new Map<string, number>();
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].points > 0) rankByChar.set(sorted[i].charId, i + 1);
    }
    for (const entry of this.entries.values()) {
      const char = db.getCharacter(entry.charId);
      const user = char ? db.getUser(char.owner) : undefined;
      if (!char || (!user?.bot && !char.bot)) continue;
      const mult = tkBotRewardMultiplier(rankByChar.get(entry.charId) ?? 0, entry.points);
      const moneyReward = Math.round(TK_POINTS.botBaseMoney * mult);
      const expReward = Math.round(TK_POINTS.botBaseExp * mult);
      const randomItemId = TK_BOT_REWARD_POOL[Math.floor(Math.random() * TK_BOT_REWARD_POOL.length)];
      const rewardDefs = [TK_BOT_REWARD_DEFAULT_ITEM, randomItemId];
      const grantItemsToBag = (bag: (Item | null)[], spill?: Item[]) => {
        for (const defId of rewardDefs) {
          if (!ITEMS[defId]) continue;
          const item: Item = { uid: `tk-bot-${this.matchId}-${defId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, def: defId, q: 0, qty: TK_BOT_REWARD_QTY };
          if (!addToBag(bag, item) && spill) spill.push(item);
        }
      };
      const sim = onlineByChar.get(entry.charId);
      if (sim && w) {
        addMoney(sim, moneyReward);
        gainExp(w, sim, expReward);
        if (sim.bag) grantItemsToBag(sim.bag, sim.bagSpill ??= []);
        w.hooks.inventory(sim);
        const multTxt = mult > 1 ? ` (×${mult})` : '';
        const itemNames = rewardDefs.map(id => `${TK_BOT_REWARD_QTY}× ${ITEMS[id]?.name ?? id}`).join(' + ');
        w.hooks.log(sim, 'exp', `Thưởng bot Tống Kim${multTxt}: +${moneyReward.toLocaleString('vi-VN')} lượng, +${expReward.toLocaleString('vi-VN')} EXP, ${itemNames}.`);
      } else {
        const bag: (Item | null)[] = Array.isArray(char.bag) ? [...char.bag] : Array(60).fill(null);
        grantItemsToBag(bag);
        db.updateCharacter(entry.charId, {
          money: Math.min(MAX_MONEY, (char.money ?? 0) + moneyReward),
          bag,
        });
      }
    }
  }

  private spawnBattleNpcs(w: World): void {
    this.npcsSpawned = true;
    const layout = this.layout();
    for (const camp of ['tong', 'kim'] as const) {
      for (const group of layout[camp].npcSpawns) {
        for (let i = 0; i < group.count; i++) {
          const angle = (Math.PI * 2 * i) / Math.max(1, group.count);
          const r = group.count > 1 ? group.radius * 0.65 : 0;
          const [x, y] = nearestWalkable(w.grid, group.x + Math.cos(angle) * r, group.y + Math.sin(angle) * r * 0.5);
          this.spawnOneNpc(w, camp, group.role, x, y);
        }
      }
    }
  }

  private spawnMarshals(w: World): void {
    this.marshalSpawned = true;
    const layout = this.layout();
    const [tx, ty] = nearestWalkable(w.grid, layout.tong.marshal.x, layout.tong.marshal.y);
    const [kx, ky] = nearestWalkable(w.grid, layout.kim.marshal.x, layout.kim.marshal.y);
    this.tongMarshalId = this.spawnOneNpc(w, 'tong', 'marshal', tx, ty).id;
    this.kimMarshalId = this.spawnOneNpc(w, 'kim', 'marshal', kx, ky).id;
    w.hooks.announce('Tống Nguyên Soái và Kim Nguyên Soái đã xuất trận! Hãy bảo vệ Nguyên Soái phe mình và hạ gục Nguyên Soái đối phương để giành ưu thế chiến thắng!');
  }

  private spawnOneNpc(w: World, camp: TkCamp, role: TkNpcRole, x: number, y: number, summoned = false): Sim {
    const idx = w.nextMonsterId++;
    const element = TK_ELEMENTS[idx % TK_ELEMENTS.length];
    const def = makeTkMonsterDef(camp, role, element);
    const s = TK_NPC_STATS[role];
    const id = `tk_${camp}_${role}_${idx}`;
    const a = new Actor();
    a.kind = 'monster';
    a.name = def.name;
    a.sprite = def.sprite;
    a.series = def.element;
    a.level = s.level;
    a.x = Math.round(x);
    a.y = Math.round(y);
    a.dir = camp === 'tong' ? 1 : 5;
    a.anim = 'idle';
    a.moveScale = 1;
    a.hp = s.hp;
    a.maxHp = s.hp;
    a.mp = 9999;
    a.maxMp = 9999;
    a.boss = s.boss;
    a.scale = s.scale;
    a.battleCamp = camp;
    a.battleRank = role === 'marshal' ? 5 : role === 'general' ? 5 : role === 'deputy' ? 4 : role === 'commander' ? 3 : role === 'captain' ? 2 : 1;
    const sim = makeSim(id, 'monster', a, def.element, def.speed);
    sim.def = def;
    sim.home = { x, y };
    sim.baseDamage = s.damage;
    sim.tkCamp = camp;
    sim.tkRole = role;
    if (summoned) sim.tkSummoned = true;
    for (const [sid, lvl] of s.skills) {
      const sk = getSkill(sid);
      if (sk) sim.skills.set(sid, Math.min(lvl, maxLevelOf(sk)));
    }
    if (!sim.skills.size) sim.skills.set(BASIC_ATTACK, 1);
    refreshMonsterCombat(sim);
    w.add(sim);
    return sim;
  }

  private clearBattleNpcs(w: World): void {
    for (const [id, sim] of [...w.sims]) {
      if (sim.kind === 'monster' && sim.tkCamp) {
        w.removeSim(id);
      }
    }
    this.siegeTowers.clear();
  }

  private towerTitle(camp: TkCamp, spec: TkTowerSpec): string {
    const campTxt = camp === 'tong' ? 'Tống' : 'Kim';
    if (spec.tier === 'nexus') return `${campTxt} Long Trụ (Nhà Chính)`;
    if (spec.tier === 'guard') return `${campTxt} Trụ Bảo Vệ`;
    const laneTxt = spec.lane === 'top' ? 'Trên' : spec.lane === 'bot' ? 'Dưới' : 'Giữa';
    return `${campTxt} Trụ Đường ${laneTxt}`;
  }

  private spawnSiegeTowers(w: World): void {
    this.npcsSpawned = true;
    this.siegeTowers.clear();
    const layout = this.layout();
    const hpScale = tkTowerHpScale(this.entries.size);
    for (const camp of ['tong', 'kim'] as const) {
      const siege = layout[camp].siege;
      if (!siege) continue;
      for (const spec of siege.towers) {
        const [x, y] = nearestWalkable(w.grid, spec.x, spec.y);
        const maxHp = spec.tier === 'nexus'
          ? TK_SIEGE.towerBaseHp.nexus
          : Math.round(TK_SIEGE.towerBaseHp[spec.tier] * hpScale);
        const sprite = tkTowerSpriteFor(camp, spec.tier, spec.element);
        const skillId = tkTowerSkillForElement(spec.element);
        const def: MonsterDef = {
          id: (camp === 'tong' ? 9100 : 9200) + (spec.tier === 'nexus' ? 9 : spec.tier === 'guard' ? 5 : 1),
          name: this.towerTitle(camp, spec),
          sprite,
          level: 100,
          element: spec.element,
          hp: maxHp,
          damage: [1000, 1200],
          resist: 0,
          boss: spec.tier === 'nexus' ? 2 : 1,
          scale: spec.tier === 'nexus' ? 1.1 : 1.0,
          speed: 0,
          vision: TK_SIEGE.towerRange,
          leash: 0,
          attackCooldown: TK_SIEGE.towerAttackMs / 1000,
          skills: TK_TOWER_SKILLS.map(sid => [sid, 20] as [number, number]),
          expOverride: 0,
          hitRecover: 100,
        };
        const id = `tk_tower_${spec.id}_${w.nextMonsterId++}`;
        const a = new Actor();
        a.kind = 'monster';
        a.name = def.name;
        a.sprite = sprite;
        a.series = spec.element;
        a.level = 100;
        a.x = Math.round(x);
        a.y = Math.round(y);
        a.dir = camp === 'tong' ? 1 : 5;
        a.anim = 'idle';
        a.moveScale = 1;
        a.hp = maxHp;
        a.maxHp = maxHp;
        a.mp = 9999;
        a.maxMp = 9999;
        a.boss = spec.tier === 'nexus' ? 2 : 1;
        a.scale = def.scale ?? 1;
        a.battleCamp = camp;
        a.battleRank = spec.tier === 'nexus' ? 5 : spec.tier === 'guard' ? 4 : 3;
        a.tkTower = spec.tier === 'outer' ? 1 : spec.tier === 'guard' ? 2 : 3;
        a.tkInvuln = spec.tier !== 'outer';
        const sim = makeSim(id, 'monster', a, spec.element, 0);
        sim.def = def;
        sim.home = { x, y };
        sim.baseDamage = def.damage;
        sim.tkCamp = camp;
        sim.tkTowerId = spec.id;
        sim.tkTowerTier = spec.tier;
        sim.tkLane = spec.lane;
        sim.tkTowerInvuln = spec.tier !== 'outer';
        for (const sid of TK_TOWER_SKILLS) sim.skills.set(sid, 20);
        sim.skills.set(skillId, 20);
        refreshMonsterCombat(sim);
        w.add(sim);
        this.siegeTowers.set(spec.id, {
          spec,
          camp,
          simId: id,
          hp: maxHp,
          maxHp,
          alive: true,
          invuln: spec.tier !== 'outer',
        });
      }
    }
    this.refreshSiegeInvuln(w);
  }

  private refreshSiegeInvuln(w: World): void {
    for (const camp of ['tong', 'kim'] as const) {
      const list = [...this.siegeTowers.values()].filter(t => t.camp === camp);
      const aliveCount = list.filter(t => t.alive).length;
      const outerBroken = list.some(t => t.spec.tier === 'outer' && !t.alive);
      const allGuardsBroken = list.filter(t => t.spec.tier === 'guard').every(t => !t.alive);
      for (const t of list) {
        if (!t.alive) { t.invuln = false; continue; }
        t.invuln = t.spec.tier === 'outer' ? false : t.spec.tier === 'guard' ? !outerBroken : !allGuardsBroken;
        const sim = w.sims.get(t.simId);
        if (sim) {
          sim.tkTowerInvuln = t.invuln;
          sim.tkCampAliveTowers = aliveCount;
          sim.a.tkInvuln = t.invuln;
        }
      }
    }
  }

  private spawnRuinedNexus(w: World, camp: TkCamp, x: number, y: number): void {
    const id = `tk_ruin_${camp}_${w.nextMonsterId++}`;
    const a = new Actor();
    a.kind = 'monster';
    a.name = camp === 'tong' ? 'Tống Long Trụ Vỡ' : 'Kim Long Trụ Vỡ';
    a.sprite = 'enemy192';
    a.series = 'tho';
    a.level = 100;
    a.x = Math.round(x);
    a.y = Math.round(y);
    a.dir = camp === 'tong' ? 1 : 5;
    a.anim = 'idle';
    a.moveScale = 1;
    a.hp = 1;
    a.maxHp = 1;
    a.mp = 1;
    a.maxMp = 1;
    a.boss = 1;
    a.scale = 1.1;
    a.battleCamp = camp;
    a.tkTower = 4;
    const sim = makeSim(id, 'monster', a, 'tho', 0);
    sim.tkCamp = camp;
    sim.home = { x, y };
    sim.def = {
      id: 9999,
      name: a.name,
      sprite: 'enemy192',
      level: 100,
      element: 'tho',
      hp: 1,
      damage: [0, 0],
      resist: 0,
      speed: 0,
      vision: 0,
      leash: 0,
      attackCooldown: 10,
      skills: [],
      scale: 1.1,
      expOverride: 0,
    };
    w.add(sim);
  }

  private spawnSiegeWaves(w: World, now: number): void {
    this.siegeWaveNo++;
    this.siegeNextWaveAt = now + TK_SIEGE.waveIntervalMs;
    const layout = this.layout();
    const isSiegeWave = this.siegeWaveNo % 3 === 0;
    for (const camp of ['tong', 'kim'] as const) {
      const enemyCamp: TkCamp = camp === 'tong' ? 'kim' : 'tong';
      const siege = layout[camp].siege;
      if (!siege) continue;
      for (const lane of ['top', 'mid', 'bot'] as const) {
        const wps = siege.lanes[lane];
        if (!wps.length) continue;
        let current = 0;
        for (const s of w.sims.values()) {
          if (!s.dead && s.tkMinionType && s.tkCamp === camp && s.tkLane === lane) current++;
        }
        if (current >= TK_SIEGE.maxMinionsPerLane) continue;
        const enemyOuter = [...this.siegeTowers.values()].find(t => t.camp === enemyCamp && t.spec.tier === 'outer' && t.spec.lane === lane);
        const spawnSuper = Boolean(enemyOuter && !enemyOuter.alive);
        const batch: TkMinionType[] = ['melee', 'melee', 'melee', 'ranged', 'ranged'];
        if (isSiegeWave) batch.push('siege');
        if (spawnSuper) batch.push('super');
        const room = Math.max(0, TK_SIEGE.maxMinionsPerLane - current);
        for (let i = 0; i < Math.min(batch.length, room); i++) {
          this.spawnSiegeMinion(w, camp, lane, batch[i], wps, i);
        }
      }
    }
  }

  private spawnSiegeMinion(w: World, camp: TkCamp, lane: TkLaneId, type: TkMinionType, waypoints: readonly { x: number; y: number }[], slotIdx: number): Sim {
    const idx = w.nextMonsterId++;
    const element = TK_ELEMENTS[idx % TK_ELEMENTS.length];
    const start = waypoints[0];
    const spreadAngle = (Math.PI * 2 * slotIdx) / 6;
    const [x, y] = nearestWalkable(w.grid, start.x + Math.cos(spreadAngle) * 70, start.y + Math.sin(spreadAngle) * 35);
    const sprite = type === 'siege'
      ? (camp === 'tong' ? 'enemy021' : 'enemy024')
      : type === 'super'
        ? (camp === 'tong' ? 'enemy017' : 'enemy023')
        : type === 'ranged'
          ? (camp === 'tong' ? 'enemy026' : 'enemy036')
          : (camp === 'tong' ? 'enemy029' : 'enemy031');
    const hp = type === 'super' ? 720_000 : type === 'siege' ? 480_000 : type === 'melee' ? 180_000 : 120_000;
    const dmg: [number, number] = type === 'super' ? [550, 750] : type === 'siege' ? [450, 620] : type === 'ranged' ? [260, 360] : [200, 280];
    const scale = type === 'super' ? 1.28 : type === 'siege' ? 1.15 : 0.95;
    const label = type === 'super' ? 'Siêu Binh' : type === 'siege' ? 'Phó Tướng' : type === 'ranged' ? 'Cung Thủ' : 'Bộ Binh';
    const skills: [number, number][] = type === 'siege' ? [[148, 12]] : type === 'ranged' ? [[47, 10]] : [[1, 1]];
    const def: MonsterDef = {
      id: (camp === 'tong' ? 9300 : 9400) + (type === 'super' ? 4 : type === 'siege' ? 3 : type === 'ranged' ? 2 : 1),
      name: `${camp === 'tong' ? 'Tống' : 'Kim'} ${label}`,
      sprite,
      level: 90,
      element,
      hp,
      damage: dmg,
      resist: 0,
      scale,
      speed: type === 'siege' ? 145 : 175,
      vision: type === 'siege' ? 620 : 480,
      leash: 0,
      attackCooldown: type === 'siege' ? 1.8 : 1.4,
      skills,
      expOverride: 0,
    };
    const id = `tk_minion_${camp}_${lane}_${idx}`;
    const a = new Actor();
    a.kind = 'monster';
    a.name = def.name;
    a.sprite = sprite;
    a.series = element;
    a.level = 90;
    a.x = Math.round(x);
    a.y = Math.round(y);
    a.dir = camp === 'tong' ? 1 : 5;
    a.anim = 'idle';
    a.moveScale = 1;
    a.hp = hp;
    a.maxHp = hp;
    a.mp = 9999;
    a.maxMp = 9999;
    a.scale = scale;
    a.battleCamp = camp;
    a.battleRank = type === 'super' ? 3 : type === 'siege' ? 2 : 1;
    const sim = makeSim(id, 'monster', a, element, def.speed);
    sim.def = def;
    sim.home = { x, y };
    sim.baseDamage = dmg;
    sim.tkCamp = camp;
    sim.tkRole = type === 'super' ? 'general' : type === 'siege' ? 'commander' : 'soldier';
    sim.tkLane = lane;
    sim.tkMinionType = type;
    sim.tkWaypoints = waypoints.map(p => ({ x: p.x, y: p.y }));
    sim.tkWaypointIdx = Math.min(1, waypoints.length - 1);
    for (const [sid, lvl] of skills) {
      const sk = getSkill(sid);
      if (sk) sim.skills.set(sid, Math.min(lvl, maxLevelOf(sk)));
    }
    if (!sim.skills.size) sim.skills.set(BASIC_ATTACK, 1);
    refreshMonsterCombat(sim);
    w.add(sim);
    return sim;
  }

  /** Số công trình phe địch đã bị phá hủy trong Mode 3 (dùng tính buff sát thương toàn phe). */
  siegeDestroyedEnemyTowers(camp: TkCamp): number {
    if (this.mode !== 3 || this.phase !== 'fighting' || !this.siegeTowers.size) return 0;
    let count = 0;
    for (const t of this.siegeTowers.values()) {
      if (t.camp !== camp && !t.alive) count++;
    }
    return count;
  }

  private siegeEndStats(w?: World): {
    tongHp: number;
    tongMaxHp: number;
    kimHp: number;
    kimMaxHp: number;
    tongPct: number;
    kimPct: number;
  } {
    let tongHp = 0, tongMaxHp = 0, kimHp = 0, kimMaxHp = 0;
    for (const t of this.siegeTowers.values()) {
      const sim = w?.sims.get(t.simId);
      const hp = t.alive ? Math.max(0, sim ? sim.hp : t.hp) : 0;
      const maxHp = Math.max(1, t.maxHp);
      if (t.camp === 'tong') { tongHp += hp; tongMaxHp += maxHp; }
      else { kimHp += hp; kimMaxHp += maxHp; }
    }
    return {
      tongHp,
      tongMaxHp,
      kimHp,
      kimMaxHp,
      tongPct: tongMaxHp > 0 ? tongHp / tongMaxHp : 0,
      kimPct: kimMaxHp > 0 ? kimHp / kimMaxHp : 0,
    };
  }

  private siegeTowerSnapshots(): TkTowerStatus[] | undefined {
    if (this.mode !== 3 || !this.siegeTowers.size) return undefined;
    const out: TkTowerStatus[] = [];
    for (const t of this.siegeTowers.values()) {
      out.push({
        id: t.spec.id,
        camp: t.camp,
        tier: t.spec.tier,
        lane: t.spec.lane,
        element: t.spec.element,
        x: t.spec.x,
        y: t.spec.y,
        hp: t.alive ? t.hp : 0,
        maxHp: t.maxHp,
        alive: t.alive,
        invuln: t.invuln,
      });
    }
    return out;
  }

  private evacuateAll(w: World): void {
    for (const sim of [...w.sims.values()]) {
      if (sim.kind !== 'player') continue;
      const camp = (sim.a.battleCamp || 'tong') as TkCamp;
      const back = this.signupPoint(camp);
      w.hooks.transfer(sim, TK_SIGNUP_MAP_ID, back.x, back.y);
    }
  }

  leaderboard(): TkLeaderEntry[] {
    const arr = [...this.entries.values()];
    arr.sort((a, b) => b.points - a.points || b.kills - a.kills || a.deaths - b.deaths || a.charId.localeCompare(b.charId));
    return arr.map((e, idx) => ({
      rankPos: idx + 1,
      charId: e.charId,
      name: e.name,
      camp: e.camp,
      faction: e.faction,
      points: e.points,
      kills: e.kills,
      deaths: e.deaths,
      npcKills: e.npcKills,
      maxStreak: e.maxStreak,
      rank: e.rank,
    }));
  }

  snapshotFor(charId?: string, now = Date.now()): TkStateMsg {
    const { tong, kim, tongScore, kimScore } = this.counts();
    const remainSec = this.phase === 'closed' ? 0 : Math.max(0, Math.ceil((this.phaseEndsAt - now) / 1000));
    const entry = charId ? this.entries.get(charId) : undefined;
    const char = charId ? db.getCharacter(charId) : undefined;
    const campRemainSec = entry && entry.inCamp && this.phase === 'fighting'
      ? Math.max(0, Math.ceil(TK_CAMP_KICK_SEC - (now - entry.enteredCampAt) / 1000))
      : 0;
    const gateWaitSec = entry && entry.inCamp && this.phase === 'fighting'
      ? Math.max(0, Math.ceil(TK_GATE_WAIT_SEC - (now - entry.enteredCampAt) / 1000))
      : 0;
    return {
      matchId: this.matchId,
      battleMapId: this.currentBattleMapId,
      ...(devTools() ? { availableMaps: tkBattleMapOptions() } : {}),
      mode: this.mode,
      phase: this.phase,
      remainSec,
      tongCount: tong,
      kimCount: kim,
      tongScore,
      kimScore,
      marshalSpawned: this.marshalSpawned,
      tongMarshalAlive: !!this.tongMarshalId,
      kimMarshalAlive: !!this.kimMarshalId,
      winner: this.winner,
      winReason: this.winReason,
      nextSchedule: this.nextScheduleLabel(now),
      devTools: devTools(),
      me: charId ? {
        camp: entry?.camp ?? '',
        points: entry?.points ?? 0,
        rank: entry?.rank ?? 0,
        kills: entry?.kills ?? 0,
        deaths: entry?.deaths ?? 0,
        npcKills: entry?.npcKills ?? 0,
        streak: entry?.streak ?? 0,
        maxStreak: entry?.maxStreak ?? 0,
        accum: Math.max(0, Math.floor(char?.tkAccum ?? 0)),
        inCamp: entry?.inCamp ?? false,
        campRemainSec,
        gateWaitSec,
        stealth: this.isDevStealth(charId),
      } : undefined,
      towers: this.siegeTowerSnapshots(),
      top10: this.leaderboard().slice(0, 10),
    };
  }

  /** Xử lý C2S.tkAction từ MapRoom. */
  handleAction(w: World, sim: Sim, msg: TkActionMsg): { sendInventory?: boolean; transfer?: { mapId: number; x: number; y: number } } {
    switch (msg.op) {
      case 'register': {
        if (w.meta.id !== TK_SIGNUP_MAP_ID) {
          w.hooks.notify(sim, 'Hãy đến Điểm báo danh Tống Kim (323) để báo danh.');
          return {};
        }
        const camp: TkCamp = msg.camp === 'kim' ? 'kim' : 'tong';
        const res = this.registerPlayer(sim, camp);
        w.hooks.notify(sim, res.message);
        if (!res.ok || !res.spawn) return {};
        return { sendInventory: true, transfer: { mapId: this.currentBattleMapId, x: res.spawn.x, y: res.spawn.y } };
      }
      case 'exitGate': {
        const res = this.exitGate(w, sim);
        w.hooks.notify(sim, res.message);
        return {};
      }
      case 'scout': {
        const res = this.scoutToFrontline(w, sim);
        w.hooks.notify(sim, res.message);
        return {};
      }
      case 'leave': {
        if (w.meta.id !== this.currentBattleMapId) return {};
        const camp = (sim.a.battleCamp || 'tong') as TkCamp;
        const back = this.signupPoint(camp);
        w.hooks.notify(sim, 'Đã rời chiến trường quay về Điểm báo danh.');
        return { transfer: { mapId: TK_SIGNUP_MAP_ID, x: back.x, y: back.y } };
      }
      case 'exchangeExp': {
        const res = this.exchangeAccumForExp(w, sim, Number(msg.amount ?? 0));
        w.hooks.notify(sim, res.message);
        return {};
      }
      case 'devStart': {
        if (!devTools()) {
          w.hooks.notify(sim, 'Chỉ cho phép mở trận thủ công khi bật DEV_TOOLS.');
          return {};
        }
        const res = this.startMatch({
          mode: msg.mode === 3 ? 3 : msg.mode === 2 ? 2 : 1,
          battleMapId: msg.battleMapId,
          signupSec: msg.signupSec ?? 30,
          durationSec: msg.durationSec ?? 600,
          marshalDelaySec: msg.marshalDelaySec ?? 60,
          endSec: 10,
          allowSolo: true,
          respawnStepsSec: msg.respawnStepsSec,
        });
        w.hooks.notify(sim, res.message);
        return {};
      }
      case 'devStop': {
        if (!devTools()) return {};
        const res = this.stopMatch(w.meta.id === this.currentBattleMapId ? w : undefined);
        w.hooks.notify(sim, res.message);
        return {};
      }
      case 'devStealth': {
        if (!devTools()) {
          w.hooks.notify(sim, 'Chỉ cho phép bật Tàng hình kiểm thử khi bật DEV_TOOLS.');
          return {};
        }
        const on = this.toggleDevStealth(sim);
        w.hooks.notify(sim, on
          ? 'Đã bật chế độ Tàng hình kiểm thử (quái, boss, bot và người chơi khác không thể phát hiện).'
          : 'Đã tắt chế độ Tàng hình kiểm thử.');
        return {};
      }
      default:
        return {};
    }
  }
}

export const tongKim = new TongKimManager();
