import {
  ITEMS, JX_TICK_MS, getSkill, isCastable, itemDef, learnTiers, skillCategory, tuningOf, usableItem, weaponOk, weaponTypeOf,
} from '@vltk/shared';
import { storage } from '../platform/storage';
import { inventory } from './inventory';
import { progress } from './progress';

/** Bar slots: chuột trái, chuột phải, phím 1–9 (0–8). */
export type BarSlot = 'left' | 'right' | number;
/** Keys 1–9 hold a skill id or an item row id (thuốc: the key uses the first such piece in the bag). */
type KeyEntry = number | string | null;
interface Bar { left: number | null; right: number | null; keys: KeyEntry[] }

export const BAR_KEYS = 9;
/** Công kích vật lý: every character has it. */
export const BASIC_SKILL = 1;

/** 'all': levels, character or weapon changed; 'bar': only what sits in the slots. */
export type SkillChange = 'all' | 'bar';
type Listener = (what: SkillChange) => void;

const emptyBar = (): Bar => ({ left: null, right: null, keys: Array(BAR_KEYS).fill(null) });

/**
 * Skills of the own character: learned levels (from the server), the worn weapon's type, what sits on the skill bar
 * (left / right mouse + keys 1–9, saved per character on this device; keys 1–9 also take usable items) and the
 * cooldowns shown on it. The world scene and auto-fight read it to cast; the quick bar and the skill window draw it.
 */
class SkillBarState {
  /** Learned skills: id -> level (0 = shown, no point yet: skills/core/learning.ts). */
  levels: Record<number, number> = {};
  /** Levels worn pieces add (allskill_v, S2C.skills bonus). */
  bonus: Record<number, number> = {};
  /** Practice exp toward the next level (practice / kill-exp skills). */
  exp: Record<number, number> = {};
  faction = '';
  weapon = -1;
  private storeKey = '';
  private bar: Bar = emptyBar();
  private cooldowns = new Map<number, { start: number; end: number }>();
  private listeners = new Set<Listener>();

  /** Called on every change (not right away). */
  watch(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private changed(what: SkillChange): void {
    for (const fn of this.listeners) fn(what);
  }

  /** Joined a faction (level 10): its skills now belong to the bar's lists. */
  setFaction(faction: string): void {
    if (faction === this.faction) return;
    this.faction = faction;
    this.changed('all');
  }

  /** New character in the world. */
  setCharacter(name: string, faction: string): void {
    if (this.faction === faction && this.storeKey === `vltk.skillbar.${name}`) return;
    this.faction = faction;
    this.storeKey = `vltk.skillbar.${name}`;
    this.bar = this.load() ?? emptyBar();
    if (this.barEmpty() && Object.keys(this.levels).length) this.fillDefaults();
    this.changed('all');
  }

  /** Levels the server says the character knows. */
  setLevels(levels: Record<number, number>, exp: Record<number, number> = {}, bonus: Record<number, number> = {}): void {
    this.levels = { ...levels };
    this.exp = { ...exp };
    this.bonus = { ...bonus };
    if (this.faction && this.barEmpty()) this.fillDefaults();
    this.changed('all');
  }

  setWeapon(type: number): void {
    if (type === this.weapon) return;
    this.weapon = type;
    this.changed('all');
  }

  /**
   * Level a skill is used at: learned + what worn pieces add, the bonus only when learned above 0 (same rule as the
   * engine's levelOf, which the server checks cost / damage with); 0 / undefined-as-0 = not learned.
   */
  levelOf(id: number): number {
    const raw = this.levels[id] ?? 0;
    const base = raw <= 0 && getSkill(id)?.pack === 'common' ? 1 : raw;
    return base > 0 ? base + (this.bonus[id] ?? 0) : base;
  }

  /** The worn weapon can use this skill. */
  usable(id: number): boolean {
    const s = getSkill(id);
    return !!s && weaponOk(s, this.weapon);
  }

  /** Skill in a bar slot, null if empty / not learned / an item. */
  skillAt(slot: BarSlot): number | null {
    const id = slot === 'left' ? this.bar.left : slot === 'right' ? this.bar.right : this.bar.keys[slot] ?? null;
    return typeof id === 'number' && this.levels[id] !== undefined ? id : null;
  }

  /** Whether the skill in a hand slot is a hào quang (it switches itself on, a click does not cast it). */
  isAuraSlot(slot: BarSlot): boolean {
    const id = this.skillAt(slot);
    return id !== null && !!getSkill(id)?.aura;
  }

  /**
   * Hào quang held by the hand slots (sent as C2S.aura, the server keeps it on): the right one first, then the left;
   * 0 = none. Only one aura runs at a time.
   */
  slotAura(): number {
    for (const slot of ['right', 'left'] as const) {
      const id = this.skillAt(slot);
      if (id !== null && getSkill(id)?.aura && this.levelOf(id) > 0) return id;
    }
    return 0;
  }

  /** Item row on key slot `slot` (0–8), null if none. */
  itemAt(slot: BarSlot): string | null {
    const id = typeof slot === 'number' ? this.bar.keys[slot] : null;
    return typeof id === 'string' && ITEMS[id] ? id : null;
  }

  /** Put a usable item row on key slot 0–8. Returns why it can't go there, or null. */
  assignItem(slot: BarSlot, defId: string): string | null {
    if (typeof slot !== 'number') return 'Ô chuột trái / phải chỉ đặt kỹ năng.';
    if (!usableItem(ITEMS[defId])) return 'Chỉ đặt được vật phẩm dùng được (thuốc) lên phím 1 – 9.';
    this.bar.keys[slot] = defId;
    this.save();
    this.changed('bar');
    return null;
  }

  /** Put a skill on a slot (null clears it). Returns why it can't go there, or null. */
  assign(slot: BarSlot, id: number | null): string | null {
    if (id !== null) {
      const s = getSkill(id);
      if (!s || !isCastable(s)) return 'Kỹ năng bị động / trạng thái không đặt lên thanh được.';
    }
    if (slot === 'left') this.bar.left = id;
    else if (slot === 'right') this.bar.right = id;
    else this.bar.keys[slot] = id;
    this.save();
    this.changed('bar');
    return null;
  }

  startCooldown(id: number): void {
    const s = getSkill(id);
    const ms = (s?.cooldown ?? 0) * JX_TICK_MS + (tuningOf(id).cooldownMs ?? 0);
    if (ms <= 0) return;
    const now = performance.now();
    this.cooldowns.set(id, { start: now, end: now + ms });
  }

  /** Whether skill `id` is off its cooldown (as far as this client sent it). */
  offCooldown(id: number, now = performance.now()): boolean {
    const cd = this.cooldowns.get(id);
    return !cd || now >= cd.end;
  }

  /** Part of the cooldown still to run on a slot's skill (1 = just used, 0 = ready). */
  cooldownLeft(slot: BarSlot, now = performance.now()): number {
    const id = this.skillAt(slot);
    const cd = id !== null ? this.cooldowns.get(id) : undefined;
    return cd && now < cd.end ? (cd.end - now) / (cd.end - cd.start) : 0;
  }

  /** Learned skills of the faction, in learning order. */
  learnedIds(): number[] {
    return learnTiers(this.faction).flatMap(t => t.skills).filter(id => this.levels[id] !== undefined);
  }

  private barEmpty(): boolean {
    return this.bar.left === null && this.bar.right === null && this.bar.keys.every(k => k === null);
  }

  /** First run: the faction's attacks that work with the current weapon. */
  private fillDefaults(): void {
    const usable = this.learnedIds().filter(id => {
      const s = getSkill(id)!;
      return isCastable(s) && weaponOk(s, this.weapon) && skillCategory(s) === 'attack' && this.levels[id] > 0;
    });
    this.bar.left = usable[0] ?? BASIC_SKILL;
    this.bar.right = usable[1] ?? usable[0] ?? BASIC_SKILL;
    this.bar.keys = Array.from({ length: BAR_KEYS }, (_, i) => usable[i] ?? null);
    this.save();
  }

  private load(): Bar | null {
    const b = storage.getJson<Bar>(this.storeKey);
    if (!b || !Array.isArray(b.keys)) return null;
    const key = (k: unknown): KeyEntry => (typeof k === 'number' || typeof k === 'string' ? k : null);
    return { left: b.left ?? null, right: b.right ?? null, keys: Array.from({ length: BAR_KEYS }, (_, i) => key(b.keys[i])) };
  }

  private save(): void {
    storage.setJson(this.storeKey, this.bar);
  }
}

export const skillbar = new SkillBarState();

// The worn weapon decides which skills work.
inventory.watch(inv => skillbar.setWeapon(weaponTypeOf(itemDef(inv.equip.weapon))), false);

// Joining a faction changes which skills the windows list.
progress.watch(p => { if (p && skillbar.faction !== p.faction && skillbar.faction !== undefined) skillbar.setFaction(p.faction); }, false);
