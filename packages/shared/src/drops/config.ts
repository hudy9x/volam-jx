import rawConfig from './drop-config.json' with { type: 'json' };

/** Nhóm quái/boss áp dụng cấu hình rơi đồ (0 = quái thường, 1 = Boss Xanh, 2 = Boss Hoàng Kim). */
export type MonsterDropTier = 0 | 1 | 2;

/** Bộ thông số rơi đồ đầy đủ cho một loại quái/boss. */
export interface DropProfile {
  /** Số lần tung đồ tối đa khi quái/boss bị hạ (chưa tính bọc tiền). */
  rolls: number;
  /** Số món đồ tối thiểu chắc chắn rơi; nếu tung thiếu sẽ tung bù cho đủ. */
  minItems: number;
  /** Xác suất (%) rơi 1 trang bị trong mỗi lần tung (0–100). */
  equipRatePct: number;
  /** Điểm may mắn cộng thêm cho người kết liễu khi tung dòng xanh của trang bị. */
  luckBonus: number;
  /** Xác suất (%) rơi bọc ngân lượng khi hạ quái/boss (0–100, tung 1 lần). */
  moneyRatePct: number;
  /** Hệ số nhân lượng ngân lượng rơi ra so với mức cơ bản theo cấp quái. */
  moneyMul: number;
  /** Xác suất (%) rơi 1 vật phẩm đặc biệt trong mỗi lần tung (0–100). */
  specialRatePct: number;
  /** Xác suất (%) rơi 1 trang bị Hoàng Kim trong mỗi lần tung (0–100). */
  goldRatePct: number;
  /** Danh sách ID vật phẩm đặc biệt riêng cho nhóm này (bỏ trống sẽ dùng danh sách mặc định). */
  specialItems?: readonly string[];
}

/** Bản vá một phần thông số rơi đồ (dùng cho `byTier` và `overrides`, trường nào bỏ trống sẽ kế thừa). */
export type DropProfilePatch = Partial<DropProfile>;

/** Cấu trúc file cấu hình rơi đồ `packages/shared/src/drops/drop-config.json`. */
export interface DropConfig {
  version: number;
  profiles: {
    normal: DropProfile;
    blueBoss: DropProfile;
    goldenBoss: {
      default: DropProfile;
      byTier?: Record<string, DropProfilePatch>;
    };
  };
  overrides?: Record<string, DropProfilePatch>;
}

/** Thông số cài đặt từ Boss Hoàng Kim (`bosses/config.json`) dùng để đồng bộ khi chưa có override riêng. */
export interface GoldenSettingsSync {
  dropRolls?: number;
  blueRatePct?: number;
  specialRatePct?: number;
  goldRatePct?: number;
}

function validateProfile(name: string, p: DropProfilePatch, full: boolean): string | null {
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  if (full) {
    const req: (keyof DropProfile)[] = [
      'rolls', 'minItems', 'equipRatePct', 'luckBonus', 'moneyRatePct', 'moneyMul', 'specialRatePct', 'goldRatePct',
    ];
    for (const k of req) {
      if (!num(p[k])) return `${name}: thiếu hoặc sai kiểu trường "${k}".`;
    }
  }
  if (p.rolls !== undefined && (!Number.isInteger(p.rolls) || p.rolls < 0 || p.rolls > 100)) {
    return `${name}: "rolls" phải là số nguyên từ 0 đến 100.`;
  }
  if (p.minItems !== undefined && (!Number.isInteger(p.minItems) || p.minItems < 0)) {
    return `${name}: "minItems" phải là số nguyên >= 0.`;
  }
  if (p.rolls !== undefined && p.minItems !== undefined && p.minItems > p.rolls) {
    return `${name}: "minItems" (${p.minItems}) không được lớn hơn "rolls" (${p.rolls}).`;
  }
  for (const k of ['equipRatePct', 'moneyRatePct', 'specialRatePct', 'goldRatePct'] as const) {
    const v = p[k];
    if (v !== undefined && (!num(v) || v < 0 || v > 100)) {
      return `${name}: "${k}" phải nằm trong khoảng 0..100.`;
    }
  }
  if (p.moneyMul !== undefined && (!num(p.moneyMul) || p.moneyMul < 0)) {
    return `${name}: "moneyMul" phải >= 0.`;
  }
  if (p.luckBonus !== undefined && !num(p.luckBonus)) {
    return `${name}: "luckBonus" phải là số hợp lệ.`;
  }
  const sum = (p.equipRatePct ?? 0) + (p.specialRatePct ?? 0) + (p.goldRatePct ?? 0);
  if (sum > 100.001) {
    return `${name}: tổng equipRatePct + specialRatePct + goldRatePct (${sum.toFixed(1)}%) vượt quá 100%.`;
  }
  if (p.specialItems !== undefined && (!Array.isArray(p.specialItems) || p.specialItems.some(id => typeof id !== 'string'))) {
    return `${name}: "specialItems" phải là mảng chuỗi ID vật phẩm.`;
  }
  return null;
}

/** Kiểm tra tính hợp lệ của toàn bộ `DropConfig`; trả về `null` nếu hợp lệ hoặc thông báo lỗi. */
export function validateDropConfig(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return 'drop-config.json: dữ liệu gốc phải là object.';
  const cfg = raw as Partial<DropConfig>;
  if (typeof cfg.version !== 'number' || !Number.isInteger(cfg.version) || cfg.version < 1) {
    return 'drop-config.json: "version" phải là số nguyên >= 1.';
  }
  if (!cfg.profiles || typeof cfg.profiles !== 'object') return 'drop-config.json: thiếu "profiles".';
  const errNormal = validateProfile('profiles.normal', cfg.profiles.normal ?? {}, true);
  if (errNormal) return errNormal;
  const errBlue = validateProfile('profiles.blueBoss', cfg.profiles.blueBoss ?? {}, true);
  if (errBlue) return errBlue;
  const gb = cfg.profiles.goldenBoss;
  if (!gb || typeof gb !== 'object') return 'drop-config.json: thiếu "profiles.goldenBoss".';
  const errGbDef = validateProfile('profiles.goldenBoss.default', gb.default ?? {}, true);
  if (errGbDef) return errGbDef;
  if (gb.byTier) {
    for (const [tier, patch] of Object.entries(gb.byTier)) {
      const err = validateProfile(`profiles.goldenBoss.byTier.${tier}`, patch ?? {}, false);
      if (err) return err;
    }
  }
  if (cfg.overrides) {
    for (const [id, patch] of Object.entries(cfg.overrides)) {
      const err = validateProfile(`overrides.${id}`, patch ?? {}, false);
      if (err) return err;
    }
  }
  return null;
}

let activeDropConfig: DropConfig = rawConfig as DropConfig;

/** Lấy cấu hình rơi đồ hiện hành trong bộ nhớ. */
export function getDropConfig(): DropConfig {
  return activeDropConfig;
}

/** Cập nhật cấu hình rơi đồ trong bộ nhớ (ném lỗi nếu cấu hình không hợp lệ). */
export function setDropConfig(cfg: DropConfig): void {
  const err = validateDropConfig(cfg);
  if (err) throw new Error(err);
  activeDropConfig = cfg;
}

/** Khôi phục cấu hình rơi đồ mặc định từ `drop-config.json`. */
export function resetDropConfig(): void {
  activeDropConfig = rawConfig as DropConfig;
}

function mergePatch(base: DropProfile, patch?: DropProfilePatch): DropProfile {
  if (!patch) return { ...base };
  return {
    rolls: patch.rolls ?? base.rolls,
    minItems: patch.minItems ?? base.minItems,
    equipRatePct: patch.equipRatePct ?? base.equipRatePct,
    luckBonus: patch.luckBonus ?? base.luckBonus,
    moneyRatePct: patch.moneyRatePct ?? base.moneyRatePct,
    moneyMul: patch.moneyMul ?? base.moneyMul,
    specialRatePct: patch.specialRatePct ?? base.specialRatePct,
    goldRatePct: patch.goldRatePct ?? base.goldRatePct,
    specialItems: patch.specialItems ?? base.specialItems,
  };
}

/**
 * Xác định bộ thông số rơi đồ cuối cùng cho một quái/boss khi bị hạ:
 * 1. Chọn profile gốc theo `tier` (`normal` | `blueBoss` | `goldenBoss.default`).
 * 2. Với Boss Hoàng Kim, đồng bộ tỉ lệ từ `goldenSettings` (`bosses/config.json`), sau đó áp `byTier[goldenTier]`.
 * 3. Áp `overrides[monsterId]` nếu có cấu hình riêng cho quái/boss đó.
 */
export function resolveDropProfile(
  tier: MonsterDropTier,
  monsterId?: number,
  goldenTier?: string,
  goldenSettings?: GoldenSettingsSync,
): DropProfile {
  const cfg = activeDropConfig;
  let profile: DropProfile;
  if (tier >= 2) {
    profile = { ...cfg.profiles.goldenBoss.default };
    if (goldenSettings) {
      if (typeof goldenSettings.dropRolls === 'number' && goldenSettings.dropRolls > 0) profile.rolls = goldenSettings.dropRolls;
      if (typeof goldenSettings.blueRatePct === 'number') profile.equipRatePct = goldenSettings.blueRatePct;
      if (typeof goldenSettings.specialRatePct === 'number') profile.specialRatePct = goldenSettings.specialRatePct;
      if (typeof goldenSettings.goldRatePct === 'number') profile.goldRatePct = goldenSettings.goldRatePct;
    }
    if (goldenTier && cfg.profiles.goldenBoss.byTier?.[goldenTier]) {
      profile = mergePatch(profile, cfg.profiles.goldenBoss.byTier[goldenTier]);
    }
  } else if (tier === 1) {
    profile = { ...cfg.profiles.blueBoss };
  } else {
    profile = { ...cfg.profiles.normal };
  }

  if (monsterId !== undefined && cfg.overrides?.[String(monsterId)]) {
    profile = mergePatch(profile, cfg.overrides[String(monsterId)]);
  }
  profile.minItems = Math.min(profile.minItems, profile.rolls);
  return profile;
}
