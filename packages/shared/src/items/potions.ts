// Thuốc (VT1): the potions of settings/item/004/potion.txt. Each effect of a row is [attribute, value per pulse, time in
// original game loops]; the original pumps once every 10 loops (≈ 0,56 s at 18 loops/s — magicdesc.ini: "Phục hồi sinh
// lực mỗi nửa giây"), time / 10 times, so value × time / 10 is the total (Cửu Chuyển Hoàn Hồn đan: 500 × 10 = 5000, as
// its description says). Here (user's rule, 2026-11-12) the same pulses come every POTION_PULSE_MS, and there is no
// delay between two potions: each one pumps on its own.
import type { ItemDef } from './items.js';

/** Time between two pulses of a potion (the original: 10 game loops ≈ 556 ms). */
export const POTION_PULSE_MS = 200;
/** Original game loops per pulse. */
const LOOPS_PER_PULSE = 10;

export type PotionStat = 'hp' | 'mp';
/** One running effect of a potion: `per` points every pulse, `pulses` times (the first one right away). */
export interface PotionPump { stat: PotionStat; per: number; pulses: number }

/** Attributes a potion pumps; the others (Thể lực, giải độc, 5-minute pills…) have no effect in this game yet. */
const PUMPED: Record<string, PotionStat> = { lifepotion_v: 'hp', manapotion_v: 'mp' };

/** What drinking `def` pumps (empty: nothing this game knows). */
export function potionPumps(def: ItemDef | undefined): PotionPump[] {
  return (def?.use ?? []).flatMap(([name, value, time]) => {
    const stat = PUMPED[name];
    return stat && value > 0 ? [{ stat, per: value, pulses: Math.max(1, Math.round(time / LOOPS_PER_PULSE)) }] : [];
  });
}

/** Has an effect when used (right click / keys 1–9). */
export const usableItem = (def: ItemDef | undefined): boolean =>
  potionPumps(def).length > 0 || !!def?.elixir || !!def?.book || !!def?.tkItem || def?.kind === 'token' || def?.kind === 'portal';

/** Sinh lực or Nội lực a potion gives in all. */
export const potionTotal = (def: ItemDef | undefined, stat: PotionStat): number =>
  potionPumps(def).reduce((sum, p) => sum + (p.stat === stat ? p.per * p.pulses : 0), 0);

/** How long a potion keeps pumping (ms, first pulse at 0). */
export const potionMs = (def: ItemDef | undefined): number =>
  Math.max(0, ...potionPumps(def).map(p => (p.pulses - 1) * POTION_PULSE_MS));
