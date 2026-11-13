type Listener<T> = (value: T) => void;

/** A value the game, the interface and the network share: one writer, any number of watchers. */
export class Store<T> {
  private listeners = new Set<Listener<T>>();

  constructor(private value: T) {}

  get(): T {
    return this.value;
  }

  set(value: T): void {
    this.value = value;
    for (const fn of this.listeners) fn(value);
  }

  /** Called on every change (and right away unless `now` is false). Returns the function that stops watching. */
  watch(fn: Listener<T>, now = true): () => void {
    this.listeners.add(fn);
    if (now) fn(this.value);
    return () => this.listeners.delete(fn);
  }
}
