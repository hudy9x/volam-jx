// Who may attack whom. Damage numbers of skills live in skills/engine/damage.ts. PK modes and camps (USER 2026-11-12):
// docs/pk-and-team.md.

/** Seconds of invulnerability after (re)spawning. */
export const SPAWN_PROTECTION = 3;

/**
 * Trận doanh (camp) of a character, shown by the colour of its name: tân thủ (no faction yet), chính phái, trung lập,
 * tà phái. Each faction's camp: DATA settings/faction/门派设定.ini `Camp=` (C_JUSTICE / C_BALANCE / C_EVIL).
 */
export type Camp = 'new' | 'justice' | 'balance' | 'evil';

export const FACTION_CAMPS: Record<string, Camp> = {
  shaolin: 'justice', emei: 'justice', gaibang: 'justice', wudang: 'justice',
  tianwang: 'balance', tangmen: 'balance', cuiyan: 'balance', kunlun: 'balance', huashan: 'balance',
  wudu: 'evil', tianren: 'evil',
};
export const campOf = (faction: string): Camp => FACTION_CAMPS[faction] ?? 'new';

export const CAMP_NAMES: Record<Camp, string> = { new: 'Tân thủ', justice: 'Chính phái', balance: 'Trung lập', evil: 'Tà phái' };
/** Name colours (the engine's, not in the client data — CHỌN from the original look: white, yellow, green, purple). */
export const CAMP_COLORS: Record<Camp, string> = { new: '#ffffff', justice: '#ffd94e', balance: '#7fe08a', evil: '#d58cff' };

/**
 * PK mode (original: Luyện công / Chiến đấu / Đồ sát): 0 = no player may be hit; 1 = players of another camp (name colour);
 * 2 = every player. Team mates are never hit, tân thủ neither (their name is white until they join a faction or a team).
 */
export type PkMode = 0 | 1 | 2;
export const PK_MODE_NAMES = ['Luyện công', 'Chiến đấu', 'Đồ sát'] as const;

export interface CombatantInfo {
  kind: 'player' | 'monster';
  id: string;
  dead: boolean;
  /** PK mode (players). */
  pk: number;
  /** Camp shown now: the own one, or the team leader's while in a team. */
  camp: Camp;
  /** Team id ('' = none). */
  team: string;
  protectedUntil: number;
}

export interface MapRules {
  safe: boolean;
  pvp: boolean;
}

/** Single source of truth for "may A hit B". Used by server for validation and by client for targeting hints. */
export function canAttack(a: CombatantInfo, b: CombatantInfo, rules: MapRules, now: number): boolean {
  if (a.id === b.id || a.dead || b.dead) return false;
  if (rules.safe) return false;
  if (b.protectedUntil > now) return false;
  if (a.kind === 'monster') return b.kind === 'player';
  if (b.kind === 'monster') return true;
  // player vs player
  return rules.pvp && pvpAllowed(a, b);
}

/** PK rule between two players (map rules aside). */
export function pvpAllowed(a: Pick<CombatantInfo, 'pk' | 'camp' | 'team'>, b: Pick<CombatantInfo, 'camp' | 'team'>): boolean {
  if (!a.pk) return false;
  if (a.team && a.team === b.team) return false;
  if (a.camp === 'new' || b.camp === 'new') return false;
  return a.pk >= 2 || a.camp !== b.camp;
}
