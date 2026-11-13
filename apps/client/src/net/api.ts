import type { AuthResponse, CharacterSummary, Element, Gender, SpawnFile } from '@vltk/shared';
import { storage } from '../platform/storage';

// HTTP side of the game server: account, characters, dev tools. The map rooms (WebSocket) are in room.ts.

/** Game server (REST + WebSocket). Override with ?server=http://host:port */
export const SERVER_URL =
  new URLSearchParams(location.search).get('server') ?? `${location.protocol}//${location.hostname}:2567`;

const TOKEN_KEY = 'vltk.token';

export const session = {
  get token(): string | null {
    return storage.get(TOKEN_KEY);
  },
  set token(value: string | null) {
    // Private mode: storage ignores it and the session lives in memory only.
    if (value) storage.set(TOKEN_KEY, value);
    else storage.remove(TOKEN_KEY);
    memoryToken = value;
  },
};
let memoryToken: string | null = null;
export const currentToken = () => session.token ?? memoryToken;

async function api<T>(path: string, body?: unknown, method = body ? 'POST' : 'GET'): Promise<T> {
  const token = currentToken();
  const res = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Lỗi máy chủ (${res.status})`);
  return json as T;
}

export const Api = {
  login: (username: string, password: string) => api<AuthResponse>('/api/login', { username, password }),
  register: (username: string, password: string) => api<AuthResponse>('/api/register', { username, password }),
  characters: () => api<CharacterSummary[]>('/api/characters'),
  createCharacter: (name: string, series: Element, gender: Gender) =>
    api<CharacterSummary>('/api/characters', { name, series, gender }),
  /** Dev tool: monster spawns of a map. */
  spawns: (mapId: number) => api<SpawnFile>(`/api/dev/spawns/${mapId}`),
  saveSpawns: (mapId: number, file: SpawnFile) => api<SpawnFile>(`/api/dev/spawns/${mapId}`, file, 'PUT'),
};
