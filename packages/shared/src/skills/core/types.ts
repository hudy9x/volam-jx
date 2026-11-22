// Skill data model. Mirrors the original client tables (settings/skills.txt, settings/missles.txt and the
// per-faction level curves in script/skill/<faction>.lua) closely enough that the generator can copy them
// without interpretation; the engine (../engine) gives them meaning. Units are the original ones:
// distances in logic pixels (= isoDistance), times in engine ticks (JX_TICK_MS).

/** The original engine runs its game logic at 18 frames per second. */
export const JX_TICK_MS = 1000 / 18;

/** One level curve: points [level, value] joined by straight lines (head.lua `Link`). */
export type Curve = [number, number][];
/** Up to three parameters per level attribute (p1, p2, p3), e.g. colddamage_v = [min, slow ticks, max]. */
export type AttrCurves = [Curve | null, Curve | null, Curve | null];

/** skills.txt SkillStyle. */
export const SkillStyle = {
  Missiles: 0,
  Melee: 1,
  /** Active state: buff or aura (IsAura) on the caster / allies. */
  State: 2,
  Passive: 3,
  CreateNpc: 4,
  /** A state carried by a missile (sub-skills of the 120 skills). */
  StateMissile: 14,
} as const;

/** skills.txt MisslesForm: how several missiles of one cast are laid out. */
export const MissileForm = {
  Wall: 0, Line: 1, Spread: 2, Circle: 3, Random: 4, Zone: 5, AtTarget: 6, AtFirer: 7,
} as const;

/** skills.txt MslsGenerate: when each missile of one cast appears. */
export const GenerateStyle = {
  SameTime: 1, Order: 2, RandomOrder: 3, RandomSame: 4, CenterExtend: 5,
} as const;

/** missles.txt MoveKind. */
export const MoveKind = {
  Stand: 0, Line: 1, Random: 2, Circle: 3, Helix: 4, Follow: 5, Motion: 6, Parabola: 7, SingleLine: 8,
} as const;

/** Target flags (skills.txt TargetEnemy / TargetAlly / TargetSelf). */
export const Target = { Enemy: 1, Ally: 2, Self: 4 } as const;

/** Weapon a skill needs (skills.txt EqtLimit). Melee item types 0–5, ám khí 100 + type, -1 bare hand, -2 any. */
export const WEAPON_NAMES: Record<number, string> = {
  [-1]: 'Tay không', 0: 'Kiếm', 1: 'Đao', 2: 'Côn', 3: 'Thương', 4: 'Chùy', 5: 'Song đao', 6: 'Triền thủ',
  100: 'Phi tiêu', 101: 'Phi đao', 102: 'Tụ tiễn', 103: 'Cổ Cầm',
};
export const ANY_WEAPON = -2;

export interface SkillEvents {
  /** Cast when each missile appears. */
  start?: number;
  /** Cast every `flyTicks` while each missile flies. */
  fly?: number;
  flyTicks?: number;
  /** Cast where a missile hits something. */
  collide?: number;
  /** Cast where a missile disappears. */
  vanish?: number;
}

export interface SkillDef {
  /** Original SkillId (globally unique). */
  id: number;
  name: string;
  desc?: string;
  /** Pack (faction folder) the skill belongs to; set by the registry. */
  pack?: string;
  style: number;
  form?: number;
  gen?: number;
  /** Ticks between generated missiles (Order styles); for melee: ticks between hits. */
  genData?: number;
  /** Missile id (style Missiles) or child skill id (Melee). */
  child?: number;
  childNum?: number;
  childLevel?: number;
  /** Caster animation (CharAnimId): 9 attack, 10 second attack, 11 magic. */
  anim?: number;
  /** Cast range (AttackRadius), logic px. */
  radius?: number;
  /** Ticks from the cast until the missiles appear. */
  wait?: number;
  /** Cooldown (TimePerCast), ticks. */
  cooldown?: number;
  melee?: boolean;
  weapon?: number;
  /** Cannot be used on horseback. */
  noHorse?: boolean;
  p1?: number;
  p2?: number;
  /** Ngũ hành: 0 kim, 1 mộc, 2 thủy, 3 hỏa, 4 thổ, -1 none. */
  series?: number;
  maxLevel?: number;
  reqLevel?: number;
  target?: number;
  aura?: boolean;
  physical?: boolean;
  costType?: number;
  events?: SkillEvents;
  /** Effect played on the caster when casting (PreCastSpr) — fx sheet key. */
  pre?: string;
  /** Icon sheet key. */
  icon?: string;
  /** Picture of the state this skill puts on its targets. */
  stateFx?: StateFx;
  /** Level attributes: LvlSettingN -> curves of its LvlDataN table. */
  attrs?: Record<string, AttrCurves>;
  /** skills.txt Attrib: gamesetting.ini [SkillAttrib] tooltip line ("Võ công lưu phái: …"; 9999 = trấn phái). */
  attrib?: number;
  /** Levels by use (thục luyện), like the 90 skills. */
  expSkill?: boolean;
  /** skills.txt IsUseAR: the hit can miss (Chính xác vs Né tránh, formulas/damage.ts). Without it the skill always lands. */
  useAR?: boolean;
  /** skills.txt DoHurt: % chance the hit makes the target flinch (co giật, formulas/effects.ts). */
  doHurt?: number;
  /** Chưa hỗ trợ trong bản hiện tại (vd. kỹ năng cấp 180 khi game mới mở đến cấp 150): luôn inactive, không cộng điểm/kích hoạt. */
  inactive?: boolean;
}

/** Picture drawn on a character while a state lasts (settings/npcres/状态图形对照表.txt via StateSpecialId). */
export interface StateFx {
  key: string;
  at: 'head' | 'body' | 'foot';
  /** Frames [from, to] drawn behind the character (rings that wrap around it). */
  behind?: [number, number];
}

/** An effect sheet plus its playback speed. */
export interface FxRef {
  key: string;
  /** Engine ticks per animation frame. */
  tpf: number;
}

export interface MissileDef {
  id: number;
  name: string;
  move?: number;
  height?: number;
  /** Collision radius, in map cells (1 = the missile's own cell). */
  collide?: number;
  /** Damages everything within `dmgRange` cells instead of one target. */
  rangeDmg?: boolean;
  dmgRange?: number;
  /** Ticks before the same target can be hit again. */
  dmgInterval?: number;
  life?: number;
  /** Logic px per tick. */
  speed?: number;
  zSpeed?: number;
  zAcc?: number;
  loop?: boolean;
  /** Disappears on its first hit. */
  colVanish?: boolean;
  /** Explodes (area damage + collide effect) at the end of its life. */
  autoExplode?: boolean;
  p1?: number;
  p2?: number;
  p3?: number;
  /** Ticks to fly straight before homing (`MoveKind.Follow` / `SingleLine`). */
  homingDelay?: number;
  fx?: { wait?: FxRef; fly?: FxRef; vanish?: FxRef; collide?: FxRef };
}

/** A learning tier of a faction (skills_table.lua): which skills come at which level. */
export interface LearnTier {
  label: string;
  level: number;
  skills: number[];
}

/** Hand adjustments kept in each pack's tuning.ts (the generator never overwrites them). */
export interface SkillTuning {
  /** Damage multiplier. */
  damage?: number;
  /** Per-cast resource cost multiplier. */
  cost?: number;
  /** Fixed action duration; absent uses the actor's attack/cast speed. */
  timing?: { cycleMs: number; affectedByCold: boolean };
  /** Resource override, independent of the ambiguous original costType enum. */
  resourceCost?: { resource: 'hp' | 'mp'; minRemainingHpRatio: number; minRemainingHp: number };
  /** Extra cooldown in ms (on top of TimePerCast). */
  cooldownMs?: number;
  /** Turn the skill off with a reason shown to players. */
  disabled?: string;
  /**
   * Auras that come with this aura (original skill_appendskill, spread over sub-skills in the script; gen:skills keeps only one):
   * they pulse on the same people, at the level of the skill_appendskill P2 table (or the aura's level).
   */
  appendSkills?: number[];
  /** Practice skills (thục luyện): hours of fighting to reach the max level — overrides PRACTICE (formulas/tuning.ts). */
  practiceHours?: number;
}

export interface SkillPack {
  id: string;
  name: string;
  skills: SkillDef[];
  learn?: LearnTier[];
  tuning?: Record<number, SkillTuning>;
}
