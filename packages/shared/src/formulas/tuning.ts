// Every number the formulas use, grouped by topic, each with its source. Change balance HERE, nowhere else.
// Docs: docs/formulas/README.md (why each rule is what it is).
//
// Source tags:  DATA  original client file (jx-origin/data_extract) — verified
//               SRC   engine notes (docs/combat-formulas.md; the fan engine source is deleted, cannot be re-checked)
//               WEB   JX1-era articles · JXWEB ../jx-web-main (not authoritative) · CHỌN our own pick
//               USER  decided by the user

/** Levels, points, experience. */
export const LEVEL = {
  /** Highest level (DATA level_exp.txt has 200 rows). */
  max: 200,
  /** Potential points per level up (DATA stringresource.txt 10027 · SRC PLAYER_LEVEL_ADD_ATTRIBUTE). */
  potentialPerLevel: 5,
  /** Skill points per level up (DATA stringresource.txt 10027 · SRC PLAYER_LEVEL_ADD_SKILL). */
  skillPointsPerLevel: 1,
  /** Level from which a character can (must) join a faction (USER 2026-11-12; DATA newplayerini isect=-1 = no faction). */
  factionJoin: 10,
  /** Only players within this many original map units of a dying monster share its exp (SRC KNpcDeathCalcExp). */
  expShareRange: 768,
  /**
   * Tổ đội (USER 2026-11-13, simple rule instead of the original split): the killer gets 100 % of the monster's exp, every other
   * team mate near the monster (expShareRange) this %, whether they hit it or not.
   */
  teamExpPct: 80,
  /** Level difference: full exp up to this gap (SRC KPlayer::AddSelfExp). */
  fullExpGap: 200,
  /** Gap up to which exp falls as (295 − 19 × gap) / 200 (SRC); beyond it 1 exp. */
  reducedExpGap: 15,
  /** Server exp rate (SRC: server config; 1 = original). */
  rate: 1,
} as const;

/** Potentials → derived stats. */
export const STATS = {
  /** Chính xác = Thân pháp × 4 − 28 (SRC SetBaseAttackRating · WEB · JXWEB). */
  arPerDex: 4,
  arBase: -28,
  /** Né tránh = Thân pháp ÷ 4 (SRC SetBaseDefence · JXWEB). */
  defDexDivisor: 4,
  /** Sức mạnh per point of physical damage for melee weapons and bare hands (WEB 52pk 2004 · JXWEB; missing in SRC). */
  strDamageDivisor: 5,
  /** Thân pháp per point of physical damage for hidden weapons (ám khí) (JXWEB, no original source — CHỌN). */
  dexDamageDivisor: 5,
  /** Nội công per point of internal (nội công) damage; 0 = no bonus (unknown in every source — CHỌN off). */
  energyDamageDivisor: 0,
  /** Floors so a heavily cursed character keeps something (CHỌN; 1 keeps the original new-character values, e.g. Kim Nội lực 16). */
  minLife: 1,
  minMana: 1,
  /** Player luck when nothing else gives any (USER 2026-11-12: 5; DATA newplayerini iluck=0). */
  defaultLuck: 5,
} as const;

/** Resistances (kháng), % (SRC GameDataDef · WEB official site). */
export const RESIST = {
  /** Default cap of each resist; *resmax_p attributes raise it (SRC MAX_RESIST 75 · WEB · JXWEB). */
  cap: 75,
  /** Absolute cap after five-element changes (SRC 95 · JXWEB). */
  absoluteMax: 95,
} as const;

/** One original game loop (frame): 18 per second (DATA script "18*120" = 120 s). */
export const FRAME_MS = 1000 / 18;

/** Hit chance (trúng / né) for skills with IsUseAR (SRC KNpc::CheckHitTarget). */
export const HIT = {
  /** Floor: 40 in the engine notes (SRC), 5 in an old article (WEB) — the engine value is used. */
  min: 40,
  /** Ceiling (SRC: above 99 → 95). */
  max: 95,
} as const;

/** Chí mạng / chí tử (SRC ReceiveDamage; WEB). */
export const CRIT = {
  /** Chí mạng doubles the physical part (SRC MAX_DEATLY_STRIKE_ENHANCEP = 200 · WEB "会心 = 双倍"). */
  physMultiplier: 2,
  /** Chí tử: each elemental part becomes the target's current Sinh lực × 30–50 % (SRC). */
  fatalMinPct: 30,
  fatalMaxPct: 50,
  /** Highest chí mạng chance: passives stack deadlystrikeenhance_p (no cap in the data — JXWEB caps at 75, CHỌN). */
  maxCritPct: 75,
} as const;

/** Player vs player damage (SRC: server setting, unknown; DATA mod pkrate.ini rate=20 has no known meaning — CHỌN). */
export const PVP = { damageScale: 0.5 } as const;

/** Hút sinh lực / nội lực (formulas/damage.ts lifeSteal): cap of skill + item % (CHỌN, no data). */
export const STEAL = { maxPct: 50 } as const;

/** Control effects (choáng, chậm, độc, co giật). Docs: docs/formulas/effects.md. */
export const EFFECTS = {
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

/** Action speed (tốc đánh / tốc xuất chiêu). Docs: docs/formulas/speed.md. */
export const SPEED = {
  /** Frames of one attack / cast at 0 % speed (DATA basevalue.ini AttackFrame / CastFrame). */
  attackFrames: 18,
  castFrames: 18,
  /** Shortest action whatever the speed (CHỌN, the SRC table stops at 6 frames for +158 %). */
  minFrames: 6,
} as const;

/** Drops on the ground (VT7–VT9) and boss tier multipliers (GP11). Docs: docs/formulas/drops.md, research docs/research/luck-drops.md. */
export const DROPS = {
  /** A drop lasts this long (USER 2026-11-12: 60 s; the original ≈ 8.3 s). */
  lifeMs: 60_000,
  /** Only the killer may pick it up during the first … (USER: 20 s; party members too once parties exist). */
  ownerMs: 20_000,
  /** Rolls of a monster's drop table per kill (npcs.txt Treasure: ordinary 1, blue boss 4, golden boss 8 — CHỌN). */
  rolls: 1,
  blueBossRolls: 4,
  bossRolls: 8,
  /** Sinh lực and exp multipliers by boss tier: 1 = Boss Xanh (Thủ lĩnh), 2 = Boss Hoàng Kim (CHỌN / USER). */
  blueBossLife: 5,
  goldBossLife: 12,
  /** Chance for an ordinary spawn slot to spawn as a Boss Xanh (1) on each respawn (DATA maplist.ini AutoGoldenNpc idea — CHỌN 3%). */
  blueBossChance: 0.03,
  /** Picking up from this far (original map units; CHỌN, the original walks next to the item). */
  pickupRange: 80,
  /** Money of one drop: ⌈level × MoneyScale / 10 × U(0.5, 1.5)⌉ (CHỌN: the original formula is server script). */
  moneyPerLevel: 0.1,
} as const;

/** Luck (may mắn) and blue lines. */
export const LUCK = {
  /** Candidate threshold denominator: rand(1 000 000) (INFERRED from item notes "2 per million", "1/1000"). */
  range: 1_000_000,
  /** Luck changes the threshold by 20 % per point (SRC: ÷ (1 + 0.2 × luck)). */
  perPoint: 0.2,
  /** The default luck (5, USER) is the neutral point: blue items roll like the original at 0 (CHỌN, research option B). */
  neutral: 5,
  /** Lowest factor (very low luck). */
  minFactor: 0.2,
} as const;

/**
 * Thục luyện speed (USER 2026-11-12: "within 1 hour" for every faction, 80 / 90 / 150 alike; adjustable). The original
 * needs 220–1250 h of hits (docs/research/skill-practice.md); here every landed hit is worth totalExp / (hours × hits per
 * hour), so any skill reaches its cap in `hours`. Override per faction here, per skill in factions/<id>/tuning.ts
 * (`practiceHours`) — e.g. make a strong faction train longer.
 */
export const PRACTICE = {
  /** Hours of fighting from level 1 to the cap (20; 150 skills stop at 20 until their unlock items). */
  hours: 1,
  /** Landed hits per second the speed is computed for (CHỌN: one hit on one target per second). */
  hitsPerSecond: 1,
  /** Per faction id: hours (e.g. { shaolin: 2 }). Per skill: SkillTuning.practiceHours. */
  factionHours: {} as Record<string, number>,
};

/**
 * Dòng ẩn of worn pieces (USER 2026-11-13): wearing a full set of these kinds turns on every hidden line of **every** worn piece
 * (its own and the others). Set a kind to false to keep the old rule (only its own pieces: TB13). `thientu` waits for TB12
 * (Thiên Tứ pieces are not in the game yet). A worn Càn Khôn Giới Chỉ always turns every hidden line on.
 */
export const HIDDEN_LINES = {
  fullSetRevealsAll: { gold: true, thientu: true } as Record<'gold' | 'thientu', boolean>,
};
