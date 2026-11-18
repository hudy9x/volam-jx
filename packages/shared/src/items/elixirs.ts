import type { ItemDef } from './items.js';

export type ExpElixirTier = 'normal' | 'special';

export interface ExpElixirEffect {
  tier: ExpElixirTier;
  durationMs: number;
}

export interface ExpElixirConfig {
  /** Hệ số nhân kinh nghiệm của Tiên Thảo Lộ thường (vd: 2, 10, 100). */
  normal: number;
  /** Hệ số nhân kinh nghiệm của Tiên Thảo Lộ đặc biệt (vd: 2, 10, 100). */
  special: number;
}

/** Cấu hình mặc định hệ số nhân kinh nghiệm của Tiên Thảo Lộ (có thể chỉnh trực tiếp ở đây hoặc qua GM Tool). */
export const EXP_ELIXIR: ExpElixirConfig = {
  normal: 2,
  special: 2,
};

let activeConfig: ExpElixirConfig = { ...EXP_ELIXIR };

export function getExpElixirConfig(): ExpElixirConfig {
  return { ...activeConfig };
}

export function setExpElixirConfig(next: Partial<ExpElixirConfig>): ExpElixirConfig {
  const clamp = (v: unknown, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 1 ? Math.min(10_000, Math.round(n * 100) / 100) : fallback;
  };
  activeConfig = {
    normal: clamp(next.normal, activeConfig.normal),
    special: clamp(next.special, activeConfig.special),
  };
  return getExpElixirConfig();
}

export function getExpElixirMultiplier(tier: ExpElixirTier): number {
  return tier === 'special' ? activeConfig.special : activeConfig.normal;
}

export function formatExpElixirCode(cfg: ExpElixirConfig): string {
  return `export const EXP_ELIXIR: ExpElixirConfig = {\n  normal: ${cfg.normal},\n  special: ${cfg.special},\n};\n`;
}

export const ELIXIR_ITEMS: ItemDef[] = [
  {
    id: 'xiancaolu',
    kind: 'elixir',
    type: 1,
    level: 1,
    name: 'Tiên Thảo Lộ',
    icon: 'items/xiancaolu',
    price: 10000,
    size: [1, 1],
    maxStack: 50,
    desc: 'Nội 1 giờ, nhân kinh nghiệm nhận được khi đánh quái (tái sử dụng làm mới thời gian).',
    base: [],
    req: [],
    elixir: { tier: 'normal', durationMs: 3_600_000 },
  },
  {
    id: 'xiancaolu-sp',
    kind: 'elixir',
    type: 2,
    level: 2,
    name: 'Tiên Thảo Lộ đặc biệt',
    icon: 'items/xiancaolu-sp',
    price: 50000,
    size: [1, 1],
    maxStack: 50,
    desc: 'Nội 8 giờ, nhân kinh nghiệm nhận được khi đánh quái (tái sử dụng làm mới thời gian).',
    base: [],
    req: [],
    elixir: { tier: 'special', durationMs: 8 * 3_600_000 },
  },
];
