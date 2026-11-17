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

export const DEFAULT_SPEED: SpeedConfiguration = Object.freeze(structuredClone(SPEED));

let activeSpeedConfig: SpeedConfiguration = structuredClone(SPEED);

export function getActiveSpeedConfig(): SpeedConfiguration {
  return activeSpeedConfig;
}

export function setActiveSpeedConfig(config: SpeedConfiguration): void {
  validateSpeedConfiguration(config);
  activeSpeedConfig = structuredClone(config);
}

export function resetSpeedConfig(): SpeedConfiguration {
  activeSpeedConfig = structuredClone(DEFAULT_SPEED);
  return activeSpeedConfig;
}

export function trackBasePercent(kind: SpeedKind, config: SpeedConfiguration = getActiveSpeedConfig()): number {
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
export function resolveSpeed(kind: SpeedKind, totalPercent: number, config: SpeedConfiguration = getActiveSpeedConfig(), mounted = false): ResolvedSpeed {
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
    stridePixels = mounted ? (config.run.horseStridePixels ?? 180) : (phase.stride ?? defaultStride);
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
export function totalSpeedPercents(bag: AttrBag, slowed: boolean, config: SpeedConfiguration = getActiveSpeedConfig()) {
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

/** Formats current speed configuration to exact TypeScript export string */
export function formatSpeedCode(config: SpeedConfiguration): string {
  const formatAttackPhases = (phases: readonly SpeedPhase[]): string => {
    const lines: string[] = [];
    for (let i = 0; i < phases.length; i += 2) {
      const p1 = phases[i];
      const p2 = phases[i + 1];
      if (p2) {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps} }, { minPercent: ${p2.minPercent}, fps: ${p2.fps} },`);
      } else {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps} },`);
      }
    }
    return lines.join('\n');
  };

  const formatRunPhases = (phases: readonly SpeedPhase[]): string => {
    const lines: string[] = [];
    for (let i = 0; i < phases.length; i += 2) {
      const p1 = phases[i];
      const p2 = phases[i + 1];
      const s1 = p1.stride ? `, stride: ${p1.stride}` : '';
      const s2 = p2 ? (p2.stride ? `, stride: ${p2.stride}` : '') : '';
      if (p2) {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps}${s1} }, { minPercent: ${p2.minPercent}, fps: ${p2.fps}${s2} },`);
      } else {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps}${s1} },`);
      }
    }
    return lines.join('\n');
  };

  return `export const SPEED = {
  basePercent: ${config.basePercent},
  minPercent: ${config.minPercent},
  maxPercent: ${config.maxPercent},
  run: {
    basePercent: ${config.run.basePercent ?? 100},
    distanceScale: ${config.run.distanceScale},
    stridePixels: ${config.run.stridePixels ?? 120},
    horseStridePixels: ${config.run.horseStridePixels ?? 180},
    referenceFrames: ${config.run.referenceFrames},
    phases: [
${formatRunPhases(config.run.phases)}
    ],
  },
  attack: {
    basePercent: ${config.attack.basePercent ?? 10},
    referenceFrames: ${config.attack.referenceFrames},
    phases: [
${formatAttackPhases(config.attack.phases)}
    ],
  },
} as const;
`;
}

