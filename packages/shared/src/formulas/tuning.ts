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

// Effect settings live with their formulas; keep the public tuning entry point stable.
export { EFFECTS } from './effects/tuning.js';

/** USER 2026-11-14: speed phases with run baseline = 100% (100% = 10 points) and attack baseline = 10%.
 * Percent is TOTAL speed (run: 100 = baseline, 120 = +20%; attack: 10 = baseline). Tune all platforms here.
 * Reference frames define a cycle, never the frame count of an individual sprite. */
export const SPEED = {
  basePercent: 10,
  minPercent: 5,
  maxPercent: 260,
  run: {
    basePercent: 100,
    distanceScale: 1.15,
    stridePixels: 120,
    horseStridePixels: 180,
    referenceFrames: 8,
    phases: [
      { minPercent: 50, fps: 5, stride: 120 },
      { minPercent: 70, fps: 6, stride: 120 },
      { minPercent: 100, fps: 8, stride: 120 },
      { minPercent: 120, fps: 10, stride: 120 },
      { minPercent: 140, fps: 12, stride: 120 },
      { minPercent: 160, fps: 14, stride: 120 },
      { minPercent: 180, fps: 16, stride: 120 },
      { minPercent: 200, fps: 18, stride: 120 },
      { minPercent: 220, fps: 20, stride: 120 },
      { minPercent: 240, fps: 22, stride: 120 },
      { minPercent: 260, fps: 24, stride: 120 },
    ],
  },
  attack: {
    basePercent: 10,
    referenceFrames: 20,
    phases: [
      { minPercent: 5, fps: 13 }, { minPercent: 10, fps: 14 },
      { minPercent: 20, fps: 15 }, { minPercent: 30, fps: 16 },
      { minPercent: 50, fps: 17 }, { minPercent: 70, fps: 28 },
      { minPercent: 85, fps: 32 }, { minPercent: 110, fps: 35 },
      { minPercent: 130, fps: 38 }, { minPercent: 150, fps: 41 },
      { minPercent: 160, fps: 44 }, { minPercent: 180, fps: 47 },
      { minPercent: 200, fps: 50 }, { minPercent: 220, fps: 53 },
      { minPercent: 240, fps: 56 }, { minPercent: 260, fps: 59 },
    ],
  },
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

/** CHỌN: cấu hình giá rao bot; xem docs/rao-ban.md. */
export { default as MARKET_PRICING } from './data/market-pricing.json';
