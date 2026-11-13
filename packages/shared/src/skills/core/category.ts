import { attr, link } from './formula.js';
import { getSkill } from './registry.js';
import { DEFAULT_STATE_MS } from './tuning.js';
import { JX_TICK_MS, SkillStyle, Target, type SkillDef } from './types.js';

// What a skill is for, read from its original data: attacks (damage attributes), heals, bùa lợi (states on
// yourself / allies, auras), bùa hại (states on enemies), passives. States act through formulas/attrs.ts (docs/formulas/effects.md).

export type SkillCategory = 'attack' | 'support' | 'buff' | 'debuff' | 'passive';

export const SKILL_CATEGORY_NAMES: Record<SkillCategory, string> = {
  attack: 'Tấn công', support: 'Hỗ trợ', buff: 'Bùa lợi', debuff: 'Bùa hại', passive: 'Bị động',
};

/** Attributes that are damage (the rest with a duration are states). */
const DAMAGE_ATTRS = new Set([
  'physicsenhance_p', 'physicsdamage_v', 'colddamage_v', 'firedamage_v', 'lightingdamage_v', 'poisondamage_v', 'magicdamage_v',
]);
/** Attributes about the skill itself, never a state. */
const SKILL_ATTR = /^(skill_|missle_|addskill|deadlystrike_p$|attackrating_p$|seriesdamage_p$|ignoredefense_p$|auto\w*skill$)/;

/** Names of the state attributes the prototype shows (others show their original key). */
const STATE_LABELS: Record<string, string> = {
  physicsres_p: 'Kháng vật công', coldres_p: 'Kháng băng', fireres_p: 'Kháng hỏa', lightingres_p: 'Kháng lôi', poisonres_p: 'Kháng độc',
  allres_p: 'Kháng tất cả', physicsresmax_p: 'Kháng vật công tối đa', fireresmax_p: 'Kháng hỏa tối đa', allresmax_p: 'Kháng tối đa',
  fastwalkrun_p: 'Tốc độ di chuyển', attackratingenhance_p: 'Chính xác', adddefense_v: 'Né tránh', addphysicsdamage_p: 'Sát thương vật lý',
  lifereplenish_v: 'Hồi sinh lực', lifereplenish_p: 'Hồi sinh lực (%)', manareplenish_v: 'Hồi nội lực', staminareplenish_v: 'Hồi thể lực',
  meleedamagereturn_p: 'Phản đòn cận chiến', rangedamagereturn_p: 'Phản đòn tầm xa', poisondamagereturn_p: 'Phản độc',
  stun_p: 'Choáng', hide: 'Ẩn thân', randmove: 'Hoảng loạn', ignorenegativestate_p: 'Miễn trạng thái xấu',
  staticmagicshield_p: 'Khiên nội lực', poisontimereduce_p: 'Thời gian trúng độc', attackspeed_v: 'Tốc độ đánh', castspeed_v: 'Tốc độ xuất chiêu',
  lifemax_p: 'Sinh lực tối đa', manamax_p: 'Nội lực tối đa', ignoreskill_p: 'Bỏ qua bùa chú', returnskill_p: 'Phản bùa chú',
  poison2decmana_p: 'Độc hút nội lực', addcolddamage_v: 'Băng sát', addcoldmagic_v: 'Băng sát nội công', coldenhance_p: 'Tăng băng sát',
  addphysicsmagic_v: 'Vật lý nội công', lifemax_yan_p: 'Sinh lực tối đa',
};

export const stateLabel = (name: string) => STATE_LABELS[name] ?? name;

const hasAttrs = (s: SkillDef, test: (name: string) => boolean) => Object.keys(s.attrs ?? {}).some(test);
const isStateAttr = (s: SkillDef, name: string) =>
  !SKILL_ATTR.test(name) && !DAMAGE_ATTRS.has(name) && (name === 'stun_p' || !!s.attrs?.[name]?.[1]);

/** Damage attributes on the skill itself. */
export const hasDamage = (s: SkillDef) => hasAttrs(s, n => DAMAGE_ATTRS.has(n));
/** State attributes (value + duration) on the skill itself. */
export const stateAttrs = (s: SkillDef) => Object.keys(s.attrs ?? {}).filter(n => isStateAttr(s, n));
export const isHeal = (s: SkillDef) => !!s.attrs?.lifereplenish_v && s.style !== SkillStyle.State;

/** The skill plus the skills it runs (melee child, events) — damage may sit on any of them. */
function family(s: SkillDef, depth = 0, out: SkillDef[] = []): SkillDef[] {
  if (out.includes(s) || depth > 4) return out;
  out.push(s);
  const kids = [s.style === SkillStyle.Melee ? s.child : undefined, s.events?.start, s.events?.fly, s.events?.collide, s.events?.vanish];
  for (const id of kids) { const k = id ? getSkill(id) : undefined; if (k) family(k, depth + 1, out); }
  return out;
}

export function skillCategory(s: SkillDef): SkillCategory {
  const target = s.target ?? 0;
  if (s.style === SkillStyle.Passive) return 'passive';
  if (s.style === SkillStyle.State) return target & Target.Enemy && !(target & (Target.Ally | Target.Self)) ? 'debuff' : 'buff';
  if (target & Target.Enemy) {
    const fam = family(s);
    if (fam.some(hasDamage)) return 'attack';
    return fam.some(k => stateAttrs(k).length) ? 'debuff' : 'attack';
  }
  if (isHeal(s)) return 'support';
  return stateAttrs(s).length ? 'buff' : 'support';
}

/** Picture of the state of `s` (auras keep it on their pulse skill). */
export function stateFxOf(s: SkillDef) {
  if (s.stateFx) return s.stateFx;
  const child = s.style === SkillStyle.State && s.child ? getSkill(s.child) : undefined;
  return child?.stateFx;
}

/**
 * How long the state of `s` lasts (ms), from the attributes' p2 (ticks): the longest timed attribute. P2 −1 = "as long as
 * the state" (Như Lai Thiên Diệp lifemax_yan_p next to 2160-tick lines): it does not make the state endless; only a state
 * whose attributes are all −1 is (0 = as long as it is on: passives, auras).
 */
export function stateDurationMs(s: SkillDef, level: number): number {
  let ticks = 0, endless = false;
  for (const name of stateAttrs(s)) {
    const t = attr(s, name, level)?.[1] ?? 0;
    if (t < 0) endless = true;
    else ticks = Math.max(ticks, t);
  }
  return ticks > 0 ? ticks * JX_TICK_MS : endless ? 0 : DEFAULT_STATE_MS;
}

/** "Kháng vật công 31" lines of a state at a level (tooltips; nothing applies them yet). */
export function stateLines(s: SkillDef, level: number): string[] {
  return stateAttrs(s).map(name => {
    const v = attr(s, name, level)?.[0] ?? 0;
    const unit = name.endsWith('_p') ? '%' : '';
    return `${stateLabel(name)} ${v > 0 ? '+' : ''}${v}${unit}`;
  });
}

export type TriggerKind = 'attack' | 'reply' | 'rescue' | 'death';
export const TRIGGER_NAMES: Record<TriggerKind, string> = {
  attack: 'Khi đánh trúng', reply: 'Khi bị đánh', rescue: 'Khi sinh lực thấp', death: 'Khi trọng thương',
};
export interface Trigger { kind: TriggerKind; skill: number; level: number; chance: number; cooldownMs: number }

/** Passive triggers (auto<kind>skill = skill id * 256 + level; p3 = cooldown ticks * 256 + chance %). */
export function triggersOf(s: SkillDef, level: number): Trigger[] {
  const out: Trigger[] = [];
  for (const kind of ['attack', 'reply', 'rescue', 'death'] as TriggerKind[]) {
    const curves = s.attrs?.[`auto${kind}skill`];
    if (!curves?.[0]) continue;
    const a = Math.floor(link(level, curves[0]));
    const c = curves[2] ? Math.floor(link(level, curves[2])) : 100;
    const skill = Math.floor(a / 256);
    if (!getSkill(skill)) continue;
    out.push({ kind, skill, level: Math.max(1, a % 256), chance: Math.min(100, c % 256 || 100), cooldownMs: Math.floor(c / 256) * JX_TICK_MS });
  }
  return out;
}
