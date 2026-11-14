import { DEFAULT_AUTO, type AutoSettings } from '@vltk/shared';
import { snapZoom, type ZoomPct } from '../game/display';
import { storage } from '../platform/storage';

/**
 * Player options of this device (Tùy chỉnh): sound volumes, mute, interface toggles, auto-fight options (shared
 * auto/settings.ts, the same options a bot scenario sets).
 */
export interface Settings extends AutoSettings {
  /** Tắt tiếng. */
  mute: boolean;
  /** Âm lượng chung, hiệu ứng, nhạc nền: 0–100. */
  master: number;
  sfx: number;
  music: number;
  /** Bản đồ nhỏ đang mở. */
  minimap: boolean;
  /** Độ phóng camera (%): 100 | 150 | 200. */
  zoom: ZoomPct;
  /** Tổ đội: tự từ chối mọi lời mời. */
  teamRefuse: boolean;
}

const KEY = 'vltk.settings';
export const DEFAULT_SETTINGS: Settings = {
  ...DEFAULT_AUTO, mute: false, master: 80, sfx: 80, music: 50, minimap: true, zoom: 100, teamRefuse: false,
};

type Listener = (s: Settings) => void;

class SettingsStore {
  private value: Settings;
  private listeners = new Set<Listener>();

  constructor() {
    const saved: Partial<Settings> = storage.getJson<Partial<Settings>>(KEY) ?? {};
    // Older builds kept the minimap flag on its own.
    if (storage.get('vltk.minimap.hidden') === '1' && saved.minimap === undefined) saved.minimap = false;
    if (saved.zoom !== undefined) saved.zoom = snapZoom(saved.zoom);
    this.value = { ...DEFAULT_SETTINGS, ...saved, ...DEFAULT_AUTO };
  }

  get(): Settings {
    return this.value;
  }

  set(patch: Partial<Settings>): void {
    if (patch.zoom !== undefined) patch = { ...patch, zoom: snapZoom(patch.zoom) };
    this.value = { ...this.value, ...patch };
    const global = { ...this.value } as Partial<Settings>;
    for (const key of Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]) delete global[key];
    storage.setJson(KEY, global);
    for (const fn of this.listeners) fn(this.value);
  }

  /** Called now and on every change. */
  watch(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.value);
    return () => this.listeners.delete(fn);
  }
}

export const settings = new SettingsStore();
