// Horses of the original horse table (horses.gen.ts, `npm run gen:assets -w @vltk/client`). A horse is an
// item: bought from the Bán ngựa NPC, worn in the Ngựa equipment slot, ridden with M.
import { GEN_HORSES, type GenHorse } from './horses.gen.js';

export interface HorseDef extends GenHorse {
  /** Run speed multiplier while mounted. */
  speed: number;
  /** Row in the original horse part tables (马前/马中/马后). */
  jxRow: number;
}

/**
 * Original speed bonus (+10% … +120%) scaled to the prototype's run speed: +100% (Phiên Vũ) = x1.4.
 * Change here to tune every horse at once.
 */
export const horseSpeed = (pct: number) => 1 + pct / 250;

export const HORSES: Record<string, HorseDef> = Object.fromEntries(GEN_HORSES.map(h => [h.id, { ...h, speed: horseSpeed(h.speedPct), jxRow: h.look }]));

/** Shop order: the five colour series by level, then the named horses and mounts. */
export const HORSE_IDS = GEN_HORSES.map(h => h.id);

/** Horse ids saved by older builds. */
export const LEGACY_HORSES: Record<string, string> = {
  phieuvu: GEN_HORSES.find(h => h.name === 'Phiên Vũ')?.id ?? '',
};
