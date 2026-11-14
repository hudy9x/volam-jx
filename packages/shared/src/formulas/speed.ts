// Action speed. Rules and sources: docs/formulas/speed.md.
import { attrOf, type AttrBag } from './attrs.js';
import { EFFECTS, SPEED } from './tuning.js';

export type SpeedKind = 'run' | 'attack';
export interface SpeedConfiguration {
  basePercent: number;
  minPercent: number; maxPercent: number;
  run: {
    basePercent?: number;
    distanceScale: number;
    stridePixels?: number;
    horseStridePixels?: number;
    referenceFrames: number;
    phases: readonly SpeedPhase[];
  };
  attack: {
    basePercent?: number;
    referenceFrames: number;
    phases: readonly SpeedPhase[];
  };
}
export interface SpeedPhase { minPercent: number; fps: number; stride?: number; step?: number }
export interface ResolvedSpeed {
  percent: number;
  phasePercent: number;
  fps: number;
  multiplier: number;
  cycleMs: number;
  stridePixels?: number;
  velocity?: number;
}

export function trackBasePercent(kind: SpeedKind, config: SpeedConfiguration = SPEED): number {
  if (kind === 'run') return config.run?.basePercent ?? 100;
  return config.attack?.basePercent ?? config.basePercent ?? 10;
}

export function validateSpeedConfiguration(config: SpeedConfiguration): void {
  for (const kind of ['run', 'attack'] as const) {
    const track = config[kind];
    const base = trackBasePercent(kind, config);
    if (!Number.isInteger(track.referenceFrames) || track.referenceFrames < 1 ||
      !track.phases.length || !track.phases.some(p => p.minPercent === base))
      throw new Error(`Bảng ${kind} phải có mốc nền ${base}%.`);
    track.phases.forEach((p) => {
      if (!Number.isFinite(p.minPercent + p.fps) || p.fps <= 0)
        throw new Error(`Mốc ${kind}: FPS và % phải là số hợp lệ, FPS phải dương.`);
    });
  }
}
validateSpeedConfiguration(SPEED);

/** Compose all buffs/slows first, then choose one phase with one final floor/cap. */
export function resolveSpeed(kind: SpeedKind, totalPercent: number, config: SpeedConfiguration = SPEED, mounted = false): ResolvedSpeed {
  const base = trackBasePercent(kind, config);
  const track = config[kind];
  const sorted = [...track.phases].sort((a, b) => a.minPercent - b.minPercent);
  const minPct = sorted[0]?.minPercent ?? (kind === 'run' ? 50 : 5);
  const maxPct = sorted.at(-1)?.minPercent ?? 260;
  const percent = Math.max(minPct, Math.min(maxPct, Number.isNaN(totalPercent) ? base : totalPercent));
  let phase = sorted[0];
  for (const p of sorted) { if (p.minPercent > percent + 1e-9) break; phase = p; }
  const baseline = track.phases.find(p => p.minPercent === base) || sorted[0];
  const cycleMs = track.referenceFrames * 1000 / phase.fps;

  let stridePixels: number | undefined;
  let velocity: number | undefined;
  if (kind === 'run') {
    const defaultStride = mounted ? (config.run.horseStridePixels ?? 180) : (config.run.stridePixels ?? 120);
    stridePixels = phase.stride ?? defaultStride;
    velocity = (phase.fps / config.run.referenceFrames) * stridePixels;
  }

  return {
    percent, phasePercent: phase.minPercent, fps: phase.fps,
    multiplier: phase.fps / baseline.fps, cycleMs,
    stridePixels, velocity,
  };
}

export function attackSpeedPct(bag: AttrBag): number {
  return attrOf(bag, 'attackspeed_v') + attrOf(bag, 'attackspeed_yan_v');
}
export function castSpeedPct(bag: AttrBag): number {
  return attrOf(bag, 'castspeed_v') + attrOf(bag, 'castspeed_yan_v');
}
/** Common game/lab adapter: UI bonuses are not total percentages; slow applies before capping. */
export function totalSpeedPercents(bag: AttrBag, slowed: boolean, config: SpeedConfiguration = SPEED) {
  const runBase = trackBasePercent('run', config);
  const attackBase = trackBasePercent('attack', config);
  const slow = slowed ? EFFECTS.slowFactor : 1;
  return {
    attack: (attackBase + attackSpeedPct(bag)) * slow,
    cast: (attackBase + castSpeedPct(bag)) * slow,
    run: (runBase + attrOf(bag, 'fastwalkrun_p')) * slow,
  };
}
export function attackTiming(bag: AttrBag, external: boolean, slowed: boolean): ResolvedSpeed {
  return resolveSpeed('attack', totalSpeedPercents(bag, slowed)[external ? 'attack' : 'cast']);
}

/**
 * Tốc độ chạy shown as a whole number (USER 2026-11-13): % / 10 — 10 % = 1, 100 % = 10, 200 % = 20 — rounded down
 * unless the decimal part is 0,8 or more (21 % → 2, 138 % → 14, 239 % → 24). Display only.
 */
export function speedPoints(pct: number): number {
  const v = pct / 10, whole = Math.floor(v);
  return v - whole >= 0.8 - 1e-9 ? whole + 1 : whole;
}

export const moveFactor = (bag: AttrBag, slowed: boolean): number =>
  resolveSpeed('run', totalSpeedPercents(bag, slowed).run).multiplier;

