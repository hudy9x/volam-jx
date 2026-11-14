// Action speed. Rules and sources: docs/formulas/speed.md.
import { attrOf, type AttrBag } from './attrs.js';
import { EFFECTS, SPEED } from './tuning.js';

export type SpeedKind = 'run' | 'attack';
export interface SpeedConfiguration {
  basePercent: number;
  minPercent: number; maxPercent: number;
  run: { distanceScale: number; referenceFrames: number; phases: readonly SpeedPhase[] };
  attack: { referenceFrames: number; phases: readonly SpeedPhase[] };
}
export interface SpeedPhase { minPercent: number; fps: number }
export interface ResolvedSpeed { percent: number; phasePercent: number; fps: number; multiplier: number; cycleMs: number }

export function validateSpeedConfiguration(config: SpeedConfiguration): void {
  const base = config.basePercent ?? 10;
  if (!(config.minPercent > 0 && config.minPercent <= base && config.maxPercent >= base) ||
      !Number.isFinite(config.minPercent + config.maxPercent) ||
      !Number.isFinite(config.run.distanceScale) || config.run.distanceScale <= 0)
    throw new Error(`Giới hạn tốc độ phải chứa mốc nền ${base}%; hệ số quãng đường phải dương.`);
  for (const kind of ['run', 'attack'] as const) {
    const track = config[kind];
    if (!Number.isInteger(track.referenceFrames) || track.referenceFrames < 1 ||
        track.phases[0]?.minPercent !== config.minPercent ||
        track.phases.at(-1)?.minPercent !== config.maxPercent || !track.phases.some(p => p.minPercent === base))
      throw new Error(`Bảng ${kind} phải có mốc sàn, mốc nền ${base}% và trần.`);
    track.phases.forEach((p, i) => {
      const prev = track.phases[i - 1];
      if (!Number.isFinite(p.minPercent + p.fps) || p.fps <= 0 ||
          (prev && (p.minPercent <= prev.minPercent || p.fps < prev.fps)))
        throw new Error(`Mốc ${kind} phải tăng dần và FPS phải dương, không giảm.`);
    });
  }
}
validateSpeedConfiguration(SPEED);

/** Compose all buffs/slows first, then choose one phase with one final floor/cap. */
export function resolveSpeed(kind: SpeedKind, totalPercent: number, config: SpeedConfiguration = SPEED): ResolvedSpeed {
  const base = config.basePercent ?? 10;
  const percent = Math.max(config.minPercent, Math.min(config.maxPercent, Number.isNaN(totalPercent) ? base : totalPercent));
  const track = config[kind];
  let phase = track.phases[0];
  for (const p of track.phases) { if (p.minPercent > percent + 1e-9) break; phase = p; }
  const baseline = track.phases.find(p => p.minPercent === base)!;
  return { percent, phasePercent: phase.minPercent, fps: phase.fps,
    multiplier: phase.fps / baseline.fps, cycleMs: track.referenceFrames * 1000 / phase.fps };
}

export function attackSpeedPct(bag: AttrBag): number {
  return attrOf(bag, 'attackspeed_v') + attrOf(bag, 'attackspeed_yan_v');
}
export function castSpeedPct(bag: AttrBag): number {
  return attrOf(bag, 'castspeed_v') + attrOf(bag, 'castspeed_yan_v');
}
/** Common game/lab adapter: UI bonuses are not total percentages; slow applies before capping. */
export function totalSpeedPercents(bag: AttrBag, slowed: boolean, config: SpeedConfiguration = SPEED) {
  const base = config.basePercent ?? 10;
  const slow = slowed ? EFFECTS.slowFactor : 1;
  return {
    attack: (base + attackSpeedPct(bag)) * slow,
    cast: (base + castSpeedPct(bag)) * slow,
    run: (base + attrOf(bag, 'fastwalkrun_p')) * slow,
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

