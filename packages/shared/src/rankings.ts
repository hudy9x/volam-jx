/** Public leaderboard data only; no account or inventory information. */
export type RankingKind = 'level' | 'wealth';
export interface RankingEntry {
  id: string;
  name: string;
  faction: string;
  level: number;
  exp: number;
  money: number;
}
export interface RankingResponse {
  updatedAt: number;
  rows: RankingEntry[];
}
