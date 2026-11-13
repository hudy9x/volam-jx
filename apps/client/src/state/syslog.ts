import type { LogKind, LogMsg } from '@vltk/shared';
import { storage } from '../platform/storage';
import { Store } from './store';

/**
 * Kênh Hệ thống (USER 2026-11-13): what happened to the own character — kills and exp, pick-ups (items, lượng), map
 * changes, buying / selling. Kept only on this device: the last SYSLOG_KEEP lines per character in localStorage (the
 * server sends them once, S2C.log, and never stores them). Newest last.
 */
export const SYSLOG_KEEP = 100;

export interface SysLine { at: number; kind: LogKind; text: string }

export interface SysLog {
  lines: SysLine[];
  /** Lines received in this session (a new one lights the tab; loading the saved ones does not). */
  added: number;
}

export const syslog = new Store<SysLog>({ lines: [], added: 0 });

let key = '';

/** The character whose lines are shown / saved (on entering the world). */
export function syslogFor(charName: string): void {
  const k = `vltk.syslog.${charName}`;
  if (k === key) return;
  if (saveTimer && key) { clearTimeout(saveTimer); storage.setJson(key, syslog.get().lines); } // the previous character's last burst
  saveTimer = 0;
  key = k;
  const saved = storage.getJson<SysLine[]>(k);
  const lines = Array.isArray(saved) ? saved.filter(l => l && typeof l.text === 'string').slice(-SYSLOG_KEEP) : [];
  syslog.set({ lines, added: syslog.get().added });
}

let saveTimer = 0;

/** A character is known (its saved lines are loaded). */
export const syslogReady = (): boolean => key !== '';

export function addSyslog(msg: LogMsg): void {
  const v = syslog.get();
  syslog.set({ lines: [...v.lines, { at: Date.now(), kind: msg.kind, text: String(msg.text) }].slice(-SYSLOG_KEEP), added: v.added + 1 });
  // Many kills a second under Auto: write once the burst is over.
  if (!key) return;
  const k = key;
  clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => { saveTimer = 0; storage.setJson(k, syslog.get().lines); }, 500);
}
