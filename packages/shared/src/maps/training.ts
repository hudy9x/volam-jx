// Bãi luyện công for auto-play (USER 2026-11-13: "tự động chọn bản đồ như jx-web-main"). jx-web-main's rule (systems/
// activities-and-stash-06.js Ue / Wo): the training zone is the last one whose lowest monster level is ≤ the character's
// level, and it changes on level up. Its zone table does not fit the monster levels of this game's spawn files (e.g. map 56
// "60–70" holds level 39–50 monsters here), so the candidates come from the spawn files (non-boss monster levels).
import { MAPS } from './index.js';
import { spawnsOf } from './spawns.js';

export interface TrainingMap { mapId: number; name: string; lo: number; hi: number }

/** Maps with monsters, outside towns, with their non-boss level range (from the spawn files; server side). */
export function trainingMaps(available: (mapId: number) => boolean = () => true): TrainingMap[] {
  const out: TrainingMap[] = [];
  for (const m of Object.values(MAPS)) {
    if (m.safe || !available(m.id)) continue;
    const file = spawnsOf(m.id);
    const levels = (file?.zones ?? []).filter(z => !z.boss).flatMap(z => z.monsters.map(([, lv]) => lv));
    if (levels.length < 3) continue;
    out.push({ mapId: m.id, name: m.name, lo: Math.min(...levels), hi: Math.max(...levels) });
  }
  return out.sort((a, b) => a.lo - b.lo || a.hi - b.hi || a.mapId - b.mapId);
}

/**
 * The map to train on at `level`: among maps whose lowest monster is ≤ level, the one with the highest lowest level (then the
 * narrower range, then the lower id); below every map, the easiest one.
 */
export function bestTrainingMap(list: TrainingMap[], level: number): TrainingMap | undefined {
  const fit = list.filter(t => t.lo <= level);
  if (!fit.length) return list[0];
  const top = Math.max(...fit.map(t => t.lo));
  return fit.filter(t => t.lo === top).sort((a, b) => (a.hi - a.lo) - (b.hi - b.lo) || a.mapId - b.mapId)[0];
}
