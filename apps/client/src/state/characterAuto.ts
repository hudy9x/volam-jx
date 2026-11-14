import { DEFAULT_AUTO, normalizeAuto, type CharacterAuto } from '@vltk/shared';
import { storage } from '../platform/storage';
import { settings } from './settings';
import { Store } from './store';
export const characterAuto = new Store<CharacterAuto>({ enabled: false, settings: { ...DEFAULT_AUTO }, revision: 0 });
let id = '', applying = false, ready = false;
let send: ((config: CharacterAuto) => void) | null = null;
const key = () => `vltk.auto.character.${id}`;
function apply(value: CharacterAuto): void {
  applying = true;
  characterAuto.set(value); settings.set(value.settings);
  applying = false;
}
export function beginCharacterAuto(charId: string, sender: (config: CharacterAuto) => void): void {
  id = charId; send = sender; ready = false;
  const cache = storage.getJson<CharacterAuto>(key());
  apply({ enabled: cache?.enabled === true, settings: normalizeAuto(cache?.settings), revision: Number(cache?.revision) || 0 });
}
export function receiveCharacterAuto(config: CharacterAuto): void {
  if (!id) return;
  const value = { enabled: config?.enabled === true, settings: normalizeAuto(config?.settings), revision: Number(config?.revision) || 0 };
  apply(value); ready = true; storage.setJson(key(), value);
}
export function setCharacterAutoEnabled(enabled: boolean): void {
  if (!id || !ready || applying) return;
  const value = { ...characterAuto.get(), enabled, settings: normalizeAuto(settings.get()) };
  characterAuto.set(value); storage.setJson(key(), value); send?.(value);
}
settings.watch(s => {
  if (applying || !id || !ready) return;
  const opts = normalizeAuto(s);
  if (JSON.stringify(opts) === JSON.stringify(characterAuto.get().settings)) return;
  const value = { ...characterAuto.get(), settings: opts };
  characterAuto.set(value); storage.setJson(key(), value); send?.(value);
});
