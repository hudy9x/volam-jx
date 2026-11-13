import type { Room } from '@colyseus/sdk';
import { MAPS, nearestTown, type AssetManifest, type CharacterSummary } from '@vltk/shared';
import { initAssets, manifestUrl } from '../art/assets';
import { installCursors } from '../art/cursors';
import { bootGame, getGame, startWorld, stopWorld } from '../game';
import { audio } from '../game/audio/Audio';
import { Api, session } from '../net/api';
import { joinMap } from '../net/room';
import { Hud } from '../ui/hud/Hud';
import { CharactersScreen } from '../ui/screens/characters';
import { LoadingScreen } from '../ui/screens/loading';
import { LoginScreen } from '../ui/screens/login';
import { CreateScreen } from '../ui/screens/create';
import { assetCache } from '../platform/assetCache';
import { storage } from '../platform/storage';

/** Id of the character played last on this device (start-up enters it directly). */
const LAST_KEY = 'vltk.lastCharacter';
const lastCharacter = {
  get: (): string | null => storage.get(LAST_KEY),
  set: (id: string | null) => (id ? storage.set(LAST_KEY, id) : storage.remove(LAST_KEY)),
};

/**
 * The whole client: screens in order (đăng nhập → chọn nhân vật → đang tải → trong game), joining a map room and
 * travelling between maps, leaving the world. Wires net/, game/ and ui/ together; none of them knows the others.
 */
export async function startApp(root: HTMLElement): Promise<void> {
  const manifest = await loadManifest();
  initAssets(manifest);
  assetCache.start(manifest);
  installCursors();
  const login = new LoginScreen(root, {
    submit: async (action, username, password) => {
      const res = action === 'register' ? await Api.register(username, password) : await Api.login(username, password);
      session.token = res.token;
      await openCharacters();
    },
  });
  const chars = new CharactersScreen(root, {
    enter: char => void enterWorld(char),
    create: () => { showScreen('create'); create.open(); },
    logout: () => { session.token = null; lastCharacter.set(null); showScreen('login'); },
  });
  const create = new CreateScreen(root, {
    create: async (name, series, gender) => {
      const made = await Api.createCharacter(name, series, gender);
      await openCharacters(undefined, made.id);
    },
    cancel: () => showScreen('chars'),
  });
  const loading = new LoadingScreen(root);
  const hud = new Hud(root, loading);

  let room: Room | null = null;
  let current: CharacterSummary | null = null;

  function showScreen(id: 'login' | 'chars' | 'create' | null): void {
    login.el.classList.toggle('hidden', id !== 'login');
    chars.el.classList.toggle('hidden', id !== 'chars');
    create.el.classList.toggle('hidden', id !== 'create');
  }

  /**
   * The character list. `auto` (start-up): go straight into the game with the character played last on this device
   * (USER 2026-11-12: only leaving the game — Hệ thống → chọn nhân vật / thoát — asks to choose again).
   */
  async function openCharacters(message?: string, prefer?: string, auto = false): Promise<void> {
    let list: CharacterSummary[];
    try {
      list = await Api.characters();
    } catch {
      session.token = null;
      showScreen('login');
      if (message) login.error(message);
      return;
    }
    const last = lastCharacter.get();
    const resume = auto && !message ? list.find(c => c.id === last) : undefined;
    if (resume) { void enterWorld(resume); return; }
    chars.render(list, message, prefer ?? last ?? undefined);
    showScreen('chars');
  }

  // ---- vào game / chuyển map ----

  async function enterWorld(char: CharacterSummary): Promise<void> {
    current = char;
    lastCharacter.set(char.id);
    showScreen(null);
    assetCache.persist();
    loading.set('Đang tải tài nguyên…');
    await bootGame(p => loading.set(`Đang tải tài nguyên… ${Math.round(p * 100)}%`));
    await joinAndStart(char.mapId);
  }

  async function joinAndStart(mapId: number): Promise<void> {
    loading.set(`Đang vào ${MAPS[mapId]?.name ?? 'bản đồ'}…`);
    try {
      room = await joinMap(mapId, current!.id);
      await firstState(room);
    } catch (err) {
      backToCharacters(`Không vào được bản đồ: ${(err as Error).message}`);
      return;
    }
    assetCache.protect([`map/${mapId}`, `map/${nearestTown(mapId)}`]);
    startWorld({ room, ui: hud, onTransfer: transfer, onDisconnect: backToCharacters });
  }

  async function transfer(mapId: number): Promise<void> {
    const old = room;
    room = null;
    loading.set(`Đang dịch chuyển tới ${MAPS[mapId]?.name ?? 'bản đồ mới'}…`);
    await old?.leave().catch(() => undefined);
    await joinAndStart(mapId);
  }

  function leaveWorld(): void {
    audio.stopMusic();
    stopWorld();
    hud.hide();
    loading.set(null);
    room?.leave().catch(() => undefined);
    room = null;
  }

  function backToCharacters(message: string): void {
    leaveWorld();
    void openCharacters(message || undefined);
  }

  // Hệ thống menu: back to the character list, or log out to the login screen.
  hud.setApp({
    switchCharacter: () => { lastCharacter.set(null); backToCharacters(''); },
    quit: () => {
      leaveWorld();
      lastCharacter.set(null);
      session.token = null;
      showScreen('login');
    },
  });

  // ---- khởi động ----

  if (import.meta.env.DEV) {
    // Dev-only handle for debugging / automated browser tests.
    Object.assign(window, { __vltk: { room: () => room, game: getGame } });
    const params = new URLSearchParams(location.search);
    // `?bots`: bot dev page (no game, no login; docs/bots.md).
    if (params.has('bots')) { void import('../dev/bot-panel/BotPanel').then(m => m.startBotPanel()); return; }
    const route = params.has('gallery') ? 'gallery' : params.has('skills') ? 'skills' : null;
    if (route) {
      loading.set('Đang tải…');
      void Promise.all([import('../dev'), bootGame(() => undefined)]).then(([dev]) => {
        loading.set(null);
        if (route === 'gallery') dev.startGallery(); else dev.startSkillLab();
      });
      return;
    }
    void import('../dev').then(dev => dev.installDevTools(hud));
  }
  if (session.token) void openCharacters(undefined, undefined, true);
  else showScreen('login');
}

/** Last manifest seen, to start when the network fails (assets then come from the caches). */
const MANIFEST_KEY = 'vltk.assetManifest';

/**
 * assets/manifest.json (pack versions, art/assets.ts) — always asked again, small. Missing (assets not generated yet)
 * or unreachable: the copy saved last time, else none (URLs without a version).
 */
async function loadManifest(): Promise<AssetManifest | null> {
  try {
    const res = await fetch(manifestUrl(), { cache: 'no-cache', signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const m = (await res.json()) as AssetManifest;
      storage.setJson(MANIFEST_KEY, m);
      return m;
    }
  } catch { /* offline: fall back below */ }
  return storage.getJson<AssetManifest>(MANIFEST_KEY);
}

/** joinOrCreate resolves before the first state patch; the scene needs mapId + actors. */
function firstState(r: Room): Promise<void> {
  if ((r.state as { mapId?: number } | undefined)?.mapId) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Hết thời gian chờ dữ liệu bản đồ')), 10_000);
    r.onStateChange.once(() => { clearTimeout(timer); resolve(); });
  });
}
