/**
 * Per-device storage (settings, window positions, skill bar, login token). The browser, a desktop wrapper
 * (Electron / Tauri) and a mobile wrapper (Capacitor / Tauri 2) all give the page localStorage; a native store
 * can replace this file later without touching its users. Failures (private mode, blocked storage) are ignored:
 * the values then last for this session only.
 */
export const storage = {
  get(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  set(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* private mode */ }
  },
  remove(key: string): void {
    try { localStorage.removeItem(key); } catch { /* private mode */ }
  },
  /** Parsed JSON, or null when missing / unreadable. */
  getJson<T>(key: string): T | null {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null; } catch { return null; }
  },
  setJson(key: string, value: unknown): void {
    storage.set(key, JSON.stringify(value));
  },
};
