// Control-effect tuning only. Sources and maintenance: docs/formulas/effects.md.
/** Control effects (choáng, chậm, độc, co giật). Docs: docs/formulas/effects.md. */
export const EFFECTS = {
  /** USER 2026-11-15: trial doubled stun duration; chance and time-reduction stats stay unchanged. */
  stunDurationMultiplier: 2,
  /** Cap of freezetimereduce_p (DATA gamesetting.ini [ServerConfig] FreezeTimeReduceMax=77). */
  freezeReduceMax: 77,
  /** Caps of stun / poison time reduction (SRC absolute 95 — CHỌN, no data). */
  stunReduceMax: 95,
  poisonReduceMax: 95,
  /** Slow time when colddamage_v has no P2 (every Nga My / Thúy Yên / Thiếu Lâm cold skill): not in the data — CHỌN 1.5 s. */
  defaultSlowFrames: 27,
  /** Speed while slowed: the engine runs a slowed character every other frame (INFERRED, not verifiable) → 50 %. */
  slowFactor: 0.5,
  /** Highest poison damage per tick on a player / a monster after stacking (DATA [ServerConfig] PlayerPoisonDamageMax / NpcPoisonDamageMax). */
  playerPoisonTickMax: 600,
  npcPoisonTickMax: 123456,
  /** Poison period when P3 is missing (DATA: almost every skill uses 10). */
  defaultPoisonPeriod: 10,
  /** Flinch length of players (DATA basevalue.ini HurtFrame=12) and their base hit recovery % (SRC 6). */
  playerHurtFrames: 12,
  playerHitRecover: 6,
  /** Monsters without HurtFrame in npcs.txt (DATA: most common 10). */
  monsterHurtFrames: 10,
} as const;
