/** A read-only comparison snapshot, carried in the URL; never changes a game character. */
export interface GameSpeedSample {
  name: string; faction: string; gender: string; mounted: boolean; horse: string;
  skill: number; level: number;
  /** Total percentages AFTER buffs/slow, BEFORE the final phase cap. */
  attack: number; cast: number; run: number;
  /** Character-window values have different units from the totals above. */
  attackBonus: number; castBonus: number; runPoints: number;
}
export function speedLabUrl(base: string, sample: GameSpeedSample): string {
  const url = new URL(base);
  url.search = ''; url.hash = '';
  url.searchParams.set('skills', '');
  url.searchParams.set('speedSample', JSON.stringify(sample));
  return url.href;
}
export function readSpeedSample(search: string): GameSpeedSample | null {
  try {
    const s = JSON.parse(new URLSearchParams(search).get('speedSample') ?? 'null');
    if (!s || ['name','faction','gender','horse'].some(k => typeof s[k] !== 'string') || typeof s.mounted !== 'boolean' ||
        ['skill','level','attack','cast','run','attackBonus','castBonus','runPoints'].some(k => typeof s[k] !== 'number' || !Number.isFinite(s[k]))) return null;
    return s as GameSpeedSample;
  } catch { return null; }
}
