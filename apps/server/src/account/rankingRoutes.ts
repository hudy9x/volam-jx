import type { Application } from 'express';
import { FACTIONS, type RankingEntry, type RankingResponse } from '@vltk/shared';
import { requireAuth } from './auth.js';
import { db } from './db.js';
import { rankingSnapshot, rankCharacters } from './rankings.js';

export function registerRankingRoutes(app: Application, online: () => Iterable<RankingEntry>): void {
  let snapshot: RankingEntry[] = [];
  let updatedAt = 0;
  app.get('/api/rankings', requireAuth, (req, res) => {
    const kind = req.query.kind;
    const faction = req.query.faction ?? '';
    if ((kind !== 'level' && kind !== 'wealth') || typeof faction !== 'string' || (faction && !FACTIONS[faction])) {
      res.status(400).json({ error: 'Loại xếp hạng hoặc môn phái không hợp lệ.' }); return;
    }
    if (!updatedAt || Date.now() - updatedAt >= 60_000) {
      snapshot = rankingSnapshot(db.users().flatMap(u => db.listCharacters(u.username)), online());
      updatedAt = Date.now();
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json({ updatedAt, rows: rankCharacters(snapshot, kind, faction) } satisfies RankingResponse);
  });
}
