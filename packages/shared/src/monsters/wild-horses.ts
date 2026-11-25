import type { Element } from '../characters/factions.js';
import { GEN_HORSES, type GenHorse } from '../items/horses.gen.js';
import type { MonsterDef } from './monsters.js';
import { monsterDamage } from './scaling.js';
import wildHorsesJson from './wild-horses.json' with { type: 'json' };

export const WILD_HORSE_MAP_ID = 9101;
export const WILD_HORSE_MIN_LEVEL = 120;
export const WILD_HORSE_MAX_LEVEL = 150;
export const WILD_HORSE_ID_BASE = 91000;

export type WildHorseTier = 'rare' | 'epic' | 'mythic';

export interface WildHorseMeta {
  horseId: string;
  reqLevel: number;
  tier: WildHorseTier;
  dropRate: number;
  respawnSec: number;
}

export interface WildHorseTierConfig {
  hp?: number;
  hp120?: number;
  hp130?: number;
  hp110?: number;
  damagePercent: number;
  resist: number;
  hitRecover: number;
  speed: number;
  attackCooldown: number;
  dropRate: number;
  respawnSec: number;
}

export interface WildHorseOverride {
  dropRate?: number;
  hp?: number;
  damagePercent?: number;
  respawnSec?: number;
}

export interface WildHorseConfig {
  testMode: boolean;
  testHp: number;
  tiers: Record<WildHorseTier, WildHorseTierConfig>;
  overrides: Record<string, WildHorseOverride>;
}

const ELEMENTS: Element[] = ['kim', 'moc', 'thuy', 'hoa', 'tho'];

function horseReqLevel(h: GenHorse): number {
  return h.req.find(([k]) => k === 'requirelevel')?.[1] ?? 0;
}

function tierOf(h: GenHorse, reqLevel: number): WildHorseTier {
  if (h.speedPct >= 110) return 'mythic';
  if (reqLevel <= 130) return 'rare';
  return 'epic';
}

const clampRate = (v: unknown, fallback: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
};

const clampMin = (v: unknown, min: number, fallback: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, n);
};

function cloneConfig(c: WildHorseConfig): WildHorseConfig {
  return structuredClone(c);
}

let activeConfig: WildHorseConfig = cloneConfig(wildHorsesJson as WildHorseConfig);

export function getWildHorseConfig(): WildHorseConfig {
  return cloneConfig(activeConfig);
}

const WILD_HORSES_RAW = GEN_HORSES.filter(h => {
  const req = horseReqLevel(h);
  return req >= WILD_HORSE_MIN_LEVEL && req <= WILD_HORSE_MAX_LEVEL;
});

function baseTierHp(h: GenHorse, reqLevel: number, tier: WildHorseTier, tc: WildHorseTierConfig): number {
  if (tier === 'rare') {
    return reqLevel <= 120 ? (tc.hp120 ?? tc.hp ?? 280_000) : (tc.hp130 ?? tc.hp ?? 360_000);
  }
  if (tier === 'epic') {
    return tc.hp ?? 520_000;
  }
  return h.speedPct === 110 ? (tc.hp110 ?? tc.hp ?? 780_000) : (tc.hp120 ?? tc.hp ?? 950_000);
}

function buildWildHorses(cfg: WildHorseConfig): MonsterDef[] {
  return WILD_HORSES_RAW.map((h, i) => {
    const reqLevel = horseReqLevel(h);
    const tier = tierOf(h, reqLevel);
    const tc = cfg.tiers[tier];
    const ov = cfg.overrides[h.id];
    const normalHp = ov?.hp !== undefined ? clampMin(ov.hp, 1, 1000) : baseTierHp(h, reqLevel, tier, tc);
    const hp = cfg.testMode ? clampMin(cfg.testHp, 1, 500) : normalHp;
    const damagePercent = ov?.damagePercent !== undefined ? clampMin(ov.damagePercent, 1, tc.damagePercent) : tc.damagePercent;
    const dropRate = ov?.dropRate !== undefined ? clampRate(ov.dropRate, tc.dropRate) : tc.dropRate;
    const respawnSec = ov?.respawnSec !== undefined ? clampMin(ov.respawnSec, 1, tc.respawnSec) : tc.respawnSec;
    const element = ELEMENTS[i % ELEMENTS.length];
    return {
      id: WILD_HORSE_ID_BASE + i,
      name: `${h.name} (Hoang)`,
      sprite: `horse:${h.look}`,
      level: reqLevel,
      element,
      hp,
      hpOverride: hp,
      damagePercent,
      damage: monsterDamage(reqLevel),
      resist: tc.resist,
      speed: tc.speed,
      skills: [[1, 1]],
      attackCooldown: tc.attackCooldown,
      vision: 380,
      leash: 900,
      scale: 1,
      hitRecover: tc.hitRecover,
      ...(tier !== 'rare' ? { boss: 1 as const } : {}),
      wildHorse: {
        horseId: h.id,
        reqLevel,
        tier,
        dropRate,
        respawnSec,
      },
    };
  });
}

/** 23 wild horse MonsterDefs (level 120–150) for Map 9101 ("Đồng cỏ thử nghiệm"). */
export const WILD_HORSE_MONSTERS: MonsterDef[] = buildWildHorses(activeConfig);

export function setWildHorseConfig(patch: Partial<WildHorseConfig>): WildHorseConfig {
  const next = cloneConfig(activeConfig);
  if (typeof patch.testMode === 'boolean') next.testMode = patch.testMode;
  if (patch.testHp !== undefined) next.testHp = Math.round(clampMin(patch.testHp, 1, next.testHp));
  if (patch.tiers) {
    for (const tier of ['rare', 'epic', 'mythic'] as const) {
      const p = patch.tiers[tier];
      if (!p) continue;
      const cur = next.tiers[tier];
      if (p.hp !== undefined) cur.hp = Math.round(clampMin(p.hp, 1, cur.hp ?? 500_000));
      if (p.hp120 !== undefined) cur.hp120 = Math.round(clampMin(p.hp120, 1, cur.hp120 ?? 280_000));
      if (p.hp130 !== undefined) cur.hp130 = Math.round(clampMin(p.hp130, 1, cur.hp130 ?? 360_000));
      if (p.hp110 !== undefined) cur.hp110 = Math.round(clampMin(p.hp110, 1, cur.hp110 ?? 780_000));
      if (p.damagePercent !== undefined) cur.damagePercent = Math.round(clampMin(p.damagePercent, 1, cur.damagePercent));
      if (p.resist !== undefined) cur.resist = clampRate(p.resist, cur.resist);
      if (p.hitRecover !== undefined) cur.hitRecover = Math.round(clampMin(p.hitRecover, 0, cur.hitRecover));
      if (p.speed !== undefined) cur.speed = Math.round(clampMin(p.speed, 1, cur.speed));
      if (p.attackCooldown !== undefined) cur.attackCooldown = clampMin(p.attackCooldown, 0.2, cur.attackCooldown);
      if (p.dropRate !== undefined) cur.dropRate = clampRate(p.dropRate, cur.dropRate);
      if (p.respawnSec !== undefined) cur.respawnSec = Math.round(clampMin(p.respawnSec, 1, cur.respawnSec));
    }
  }
  if (patch.overrides) {
    const clean: Record<string, WildHorseOverride> = {};
    for (const [id, ov] of Object.entries(patch.overrides)) {
      if (!ov || typeof ov !== 'object') continue;
      const entry: WildHorseOverride = {};
      if (ov.dropRate !== undefined) entry.dropRate = clampRate(ov.dropRate, 0.1);
      if (ov.hp !== undefined) entry.hp = Math.round(clampMin(ov.hp, 1, 500_000));
      if (ov.damagePercent !== undefined) entry.damagePercent = Math.round(clampMin(ov.damagePercent, 1, 500));
      if (ov.respawnSec !== undefined) entry.respawnSec = Math.round(clampMin(ov.respawnSec, 1, 60));
      if (Object.keys(entry).length) clean[id] = entry;
    }
    next.overrides = clean;
  }
  activeConfig = next;
  WILD_HORSE_MONSTERS.splice(0, WILD_HORSE_MONSTERS.length, ...buildWildHorses(activeConfig));
  return cloneConfig(activeConfig);
}

export function isWildHorseDef(def?: MonsterDef): boolean {
  return Boolean(def?.wildHorse);
}

/** Roll whether defeating a wild horse drops its mount item; returns `horseId` or `null`. */
export function rollWildHorseDrop(def: MonsterDef, rng: () => number = Math.random): string | null {
  const meta = def.wildHorse;
  if (!meta) return null;
  return rng() < meta.dropRate ? meta.horseId : null;
}
