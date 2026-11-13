// Attribute bag: the sum of magic attributes from every source (base, equipment lines, passive skills, auras, bùa lợi /
// bùa hại). Each original attribute has three parameters [P1, P2, P3] (e.g. lightingdamage_v: P1 min, P3 max;
// poisondamage_v: P1 per tick, P2 total time, P3 period; stun_p: P1 chance, P2 time). Sources are added, never
// rebuilt by hand, so a new source (title, set bonus…) only needs to call `add`.
export type AttrValue = [number, number, number];
export type AttrBag = Record<string, AttrValue>;

/** Add `v` (× `scale`) to attribute `name`. */
export function addAttr(bag: AttrBag, name: string, v: Partial<AttrValue> | number, scale = 1): void {
  const a = (bag[name] ??= [0, 0, 0]);
  const p = typeof v === 'number' ? [v, 0, 0] : v;
  for (let i = 0; i < 3; i++) a[i] += (p[i] ?? 0) * scale;
}

/** Merge `from` into `into`. */
export function mergeBag(into: AttrBag, from: AttrBag, scale = 1): AttrBag {
  for (const [name, v] of Object.entries(from)) addAttr(into, name, v, scale);
  return into;
}

/** Parameter `i` (0 = P1) of `name`, 0 when absent. */
export const attrOf = (bag: AttrBag, name: string, i = 0): number => bag[name]?.[i] ?? 0;
