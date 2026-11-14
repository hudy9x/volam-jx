// Tùy chọn Tự động đánh (auto/AutoPlay.ts). Dùng chung cho client (state/settings.ts lưu theo máy) và bot (kịch bản
// bots/<tên>.json, apps/server/src/dev/bots/). TS thuần.

export interface AutoSettings {
  /** Bán kính quanh chỗ bắt đầu, bỏ qua boss, tự dùng bùa lợi trên thanh phím, quay về chỗ cũ khi hết quái. */
  autoRadius: number;
  autoSkipBoss: boolean;
  autoBuff: boolean;
  autoReturn: boolean;
  /** Tự tìm quái ở xa khi quanh đây hết quái; tự nhặt đồ / tiền rơi. */
  autoSeek: boolean;
  autoPickup: boolean;
  /**
   * (jx-web-main auto-play) mục tiêu ưu tiên ('near' gần nhất / 'boss' boss trước), xoay chiêu phím 1–9, tự dùng bùa hại,
   * tự đổi bãi luyện công theo cấp, tự hồi sinh rồi quay lại, tự về thành mua thuốc khi hết, tự bán đồ trắng không mặc được,
   * lọc đồ nhặt ('all' / 'magic' đồ xanh trở lên + tiền / 'money' chỉ tiền).
   */
  autoPriority: 'near' | 'boss';
  autoRotate: boolean;
  autoCurse: boolean;
  autoMap: boolean;
  autoRevive: boolean;
  autoBuyPotion: boolean;
  autoJunk: boolean;
  /** Nhặt tiền độc lập với bộ lọc đồ; bán xanh thường, giữ món có giá trị nếu bật bảo vệ. */
  autoMoney: boolean;
  autoSellBlue: boolean;
  autoKeepValuable: boolean;
  autoLoot: 'all' | 'magic' | 'money';
  /**
   * Tiếp cận quái: chiêu tầm xa đứng cách quái bao nhiêu % tầm chiêu (30–100); chiêu cận chiến áp sát quái
   * (tắt = đứng ở tầm của chiêu).
   */
  autoReachPct: number;
  autoMeleeClose: boolean;
  /** Uống thuốc khi Sinh lực / Nội lực dưới bao nhiêu % (0 = không uống). */
  autoHp: number;
  autoMp: number;
}

export const DEFAULT_AUTO: AutoSettings = {
  autoRadius: 500, autoSkipBoss: false, autoBuff: true, autoReturn: true, autoSeek: true, autoPickup: true,
  autoPriority: 'boss', autoRotate: true, autoCurse: true, autoMap: true, autoRevive: true, autoBuyPotion: true, autoJunk: true,
  autoMoney: true, autoSellBlue: false, autoKeepValuable: true,
  autoLoot: 'all', autoHp: 50, autoMp: 20, autoReachPct: 60, autoMeleeClose: true,
};

/** Auto-fight approach: "áp sát" distance, and the range up to which a skill counts as close combat. */
export const CLOSE_REACH = 40;
const MELEE_RANGE = 120;

/**
 * How close auto-fight walks before using a skill of `range` (AutoPlay.ts, shown in the client's auto window): right up to
 * the target for close combat (autoMeleeClose), else autoReachPct % of the range, never closer than CLOSE_REACH.
 */
export function approachDistance(range: number, melee: boolean, opts: Pick<AutoSettings, 'autoReachPct' | 'autoMeleeClose'>): number {
  if (melee || range <= MELEE_RANGE) return opts.autoMeleeClose ? CLOSE_REACH : Math.max(CLOSE_REACH, range);
  return Math.max(CLOSE_REACH, Math.round((range * opts.autoReachPct) / 100));
}

export interface CharacterAuto { enabled: boolean; settings: AutoSettings; revision: number }
/** Only known, bounded fields cross the network or enter a character cache. */
export function normalizeAuto(raw: unknown): AutoSettings {
  const out = { ...DEFAULT_AUTO };
  const v = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  for (const key of Object.keys(out) as (keyof AutoSettings)[]) {
    if (typeof out[key] === 'boolean' && typeof v[key] === 'boolean') (out as unknown as Record<string, unknown>)[key] = v[key];
  }
  for (const [key, min, max] of [['autoRadius',200,1200],['autoReachPct',30,100],['autoHp',0,90],['autoMp',0,90]] as const) {
    if (typeof v[key] === 'number' && Number.isFinite(v[key])) out[key] = Math.max(min, Math.min(max, Math.round(v[key])));
  }
  if (v.autoPriority === 'boss' || v.autoPriority === 'near') out.autoPriority = v.autoPriority;
  if (v.autoLoot === 'all' || v.autoLoot === 'magic' || v.autoLoot === 'money') out.autoLoot = v.autoLoot;
  return out;
}
