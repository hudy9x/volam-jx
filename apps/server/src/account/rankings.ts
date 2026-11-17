import { START_MONEY, type RankingEntry, type RankingKind } from '@vltk/shared';
import type { CharacterRecord } from './db.js';

/** Overlay authoritative online values on saved offline records without mutating either. */
export function rankingSnapshot(records: CharacterRecord[], online: Iterable<RankingEntry>): RankingEntry[] {
  const rows = new Map(records.map(c => [c.id, {
    id: c.id, name: c.name, faction: c.faction,
    level: c.progress?.level ?? c.level, exp: c.progress?.exp ?? 0,
    money: c.money ?? START_MONEY,
  }]));
  for (const row of online) if (rows.has(row.id)) rows.set(row.id, { ...row });
  return [...rows.values()];
}

export function rankCharacters(rows: RankingEntry[], kind: RankingKind, faction = ''): RankingEntry[] {
  return rows.filter(r => !faction || r.faction === faction).sort((a, b) =>
    (kind === 'wealth' ? b.money - a.money : b.level - a.level || b.exp - a.exp)
    || a.id.localeCompare(b.id)).slice(0, 100);
}
