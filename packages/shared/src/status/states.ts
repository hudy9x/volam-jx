// Trạng thái (bùa lợi / bùa hại, hào quang) on one combatant, with real effects (HU1, 2026-11-12): a state carries the
// attributes of its skill at the caster's level, and each attribute lasts its own P2 (frames; −1 = while the state is on,
// DATA script "{{1,18*120},{20,18*180}}"). Their sum (stateBag) joins the combatant's attribute bag (formulas/), so a
// bùa changes resists, Né, speed, damage… exactly like an item line. Same skill again = replaced (new level, new times);
// different skills add up (INFERRED). The server keeps one ActiveStates per combatant (systems/status.ts) and syncs ids +
// end times to clients (Actor.states / stateEnds). Docs: docs/formulas/effects.md.
import type { AttrBag, AttrValue } from '../formulas/attrs.js';
import { addSkillAttr } from '../formulas/combat.js';
import { FRAME_MS } from '../formulas/tuning.js';
import { stateAttrs } from '../skills/core/category.js';
import { attr } from '../skills/core/formula.js';
import { getSkill } from '../skills/core/registry.js';

export type StateKind = 'buff' | 'debuff';

/** A bùa lợi / bùa hại put on someone by a skill at a level. */
export interface StateApply {
  /** Skill whose icon, name, picture and attributes the state has. */
  skill: number;
  kind: StateKind;
  /** Duration of the state; 0 = until removed (auras refresh it). Attributes may end earlier (their own P2). */
  ms: number;
  by: string;
  /** Level of the skill when it was cast (its attributes at that level). */
  level?: number;
  /** Kept on by a hào quang pulse (short `ms`, refreshed): shown without a countdown. */
  aura?: boolean;
  /** Keep the state active for visuals/icons without applying its attribute modifiers (e.g. hostile aura on caster). */
  visualOnly?: boolean;
  /** Optional direct attribute overrides (used by battlefield consumables / pills). */
  attrs?: Record<string, AttrValue>;
}

/** One attribute of a state and when it ends (0 = with the state). */
export interface StateAttr { name: string; value: AttrValue; until: number }

/** One active state. `until` = server time it ends, 0 = while refreshed. */
export interface ActiveState { until: number; by: string; kind: StateKind; level: number; attrs: StateAttr[]; aura?: boolean }
/** Active states by skill id. */
export type ActiveStates = Map<number, ActiveState>;

/** Attributes of state skill `skillId` at `level` with their own end times from `now`. */
export function stateAttrsAt(skillId: number, level: number, stateUntil: number, now: number, isAura = false): StateAttr[] {
  const s = getSkill(skillId);
  if (!s || level <= 0) return [];
  const aura = isAura || !!s.aura;
  return stateAttrs(s).flatMap(name => {
    const v = attr(s, name, level);
    if (!v) return [];
    // Aura attributes last as long as the aura state itself (refreshed by pulses); they do not expire early on P2.
    const own = !aura && v[1] > 0 ? now + Math.round(v[1] * FRAME_MS) : 0;
    // Its own time when shorter than the state's; P2 −1 / 0 = as long as the state.
    const until = own && (stateUntil === 0 || own < stateUntil) ? own : 0;
    return [{ name, value: [v[0], v[1], v[2]] as AttrValue, until }];
  });
}

/** Put on or refresh a state; true when it was not active before (worth an fx event). */
export function applyState(states: ActiveStates, st: StateApply, now: number): boolean {
  const prev = states.get(st.skill);
  const fresh = !prev || (prev.until > 0 && prev.until <= now);
  const until = st.ms > 0 ? now + st.ms : 0;
  const level = st.level ?? prev?.level ?? 1;
  const aura = st.aura || !!getSkill(st.skill)?.aura;
  states.set(st.skill, {
    until, by: st.by, kind: st.kind, level,
    attrs: st.visualOnly ? [] : st.attrs
      ? Object.entries(st.attrs).map(([name, value]) => ({ name, value, until: 0 }))
      : stateAttrsAt(st.skill, level, until, now, aura),
    ...(aura ? { aura: true } : {}),
  });
  return fresh;
}

/** Drop the states (and attributes) that have ended; true when something changed. */
export function expireStates(states: ActiveStates, now: number): boolean {
  let changed = false;
  for (const [id, st] of states) {
    if (st.until > 0 && st.until <= now) { states.delete(id); changed = true; continue; }
    const before = st.attrs.length;
    st.attrs = st.attrs.filter(a => a.until === 0 || a.until > now);
    if (st.attrs.length !== before) changed = true;
  }
  return changed;
}

/** Sum of the attributes of every active state (weaponType: addphysicsdamage_p only for the matching weapon). */
export function stateBag(states: ActiveStates, weaponType: number): AttrBag {
  const bag: AttrBag = {};
  for (const st of states.values()) for (const a of st.attrs) addSkillAttr(bag, a.name, a.value, weaponType);
  return bag;
}

/** Skill ids + end times (epoch seconds, 0 = no end: also hào quang, refreshed every pulse), as synced to clients. */
export function stateList(states: ActiveStates): { ids: number[]; ends: number[] } {
  const ids = [...states.keys()];
  const ends = ids.map(id => { const st = states.get(id)!; return st.until && !st.aura ? Math.ceil(st.until / 1000) : 0; });
  return { ids, ends };
}

