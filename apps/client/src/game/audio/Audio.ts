import { settings, type Settings } from '../../state/settings';
import { assetUrl } from '../../art/assets';

/** Beyond this distance (world px, isometric: screen y counts double) a sound is silent. */
const HEAR_RADIUS = 1100;
/** Most sounds playing at once, and of one sound (ten players fighting stay readable). */
const MAX_VOICES = 14;
const MAX_SAME = 3;
/** The same sound again within this time is dropped (many missiles of one cast hit together). */
const SAME_GAP_MS = 70;
/** A sound whose file arrives later than this is not played any more. */
const LATE_MS = 400;

const url = (key: string) => assetUrl(`${key}.mp3`);

/**
 * Sound effects (Web Audio: decoded once, panned and faded by the distance to the listener) and the map music
 * (a looping <audio>). Volumes and mute come from Tùy chỉnh (state/settings.ts). Browsers only allow sound after
 * the first click / key press; nothing plays before that.
 */
class AudioSystem {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  private voices = 0;
  private playing = new Map<string, number>();
  private last = new Map<string, number>();
  private music: HTMLAudioElement | null = null;
  private musicKey = '';
  private playlistKey = '';
  private playlist: string[] = [];
  private playlistIdx = 0;
  private musicVolume = 1;
  private opts: Settings = settings.get();
  /** Who hears: the own character (world px). */
  listener: { x: number; y: number } | null = null;

  constructor() {
    settings.watch(s => this.apply(s));
    const unlock = () => {
      const ctx = this.context();
      if (ctx?.state === 'suspended') void ctx.resume();
      if (this.music?.paused && this.musicKey) void this.music.play().catch(() => undefined);
    };
    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    this.ctx = new Ctor();
    this.master = this.ctx.createGain();
    this.sfx = this.ctx.createGain();
    this.sfx.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.apply(this.opts);
    return this.ctx;
  }

  private apply(s: Settings): void {
    this.opts = s;
    if (this.master) this.master.gain.value = s.mute ? 0 : s.master / 100;
    if (this.sfx) this.sfx.gain.value = s.sfx / 100;
    if (this.music) this.music.volume = this.musicLevel();
  }

  private musicLevel(): number {
    const s = this.opts;
    return s.mute ? 0 : Math.max(0, Math.min(1, (s.master / 100) * (s.music / 100) * this.musicVolume));
  }

  private load(key: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(key);
    if (!p) {
      const ctx = this.context();
      p = !ctx ? Promise.resolve(null) : fetch(url(key))
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(String(r.status)))))
        .then(b => ctx.decodeAudioData(b))
        .catch(() => null);
      this.buffers.set(key, p);
    }
    return p;
  }

  /**
   * Play a sound effect at a world point (omit x/y for interface sounds). Quietly does nothing when muted,
   * too far, too busy, or before the first user gesture.
   */
  play(key: string | undefined, x?: number, y?: number, gain = 1): void {
    if (!key || this.opts.mute || this.opts.master <= 0 || this.opts.sfx <= 0) return;
    const ctx = this.context();
    if (!ctx || ctx.state !== 'running' || !this.sfx) return;
    let volume = gain, pan = 0;
    if (x !== undefined && y !== undefined && this.listener) {
      const dx = x - this.listener.x, dy = (y - this.listener.y) * 2;
      const d = Math.hypot(dx, dy);
      if (d >= HEAR_RADIUS) return;
      const k = 1 - d / HEAR_RADIUS;
      volume *= 0.15 + 0.85 * k * k;
      pan = Math.max(-0.8, Math.min(0.8, dx / 700));
    }
    const now = performance.now();
    if (now - (this.last.get(key) ?? -1e9) < SAME_GAP_MS) return;
    if (this.voices >= MAX_VOICES || (this.playing.get(key) ?? 0) >= MAX_SAME) return;
    this.last.set(key, now);
    void this.load(key).then(buffer => {
      if (!buffer || !this.sfx || performance.now() - now > LATE_MS) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = volume;
      let node: AudioNode = src;
      if (pan && ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        p.pan.value = pan;
        node.connect(p);
        node = p;
      }
      node.connect(g);
      g.connect(this.sfx);
      this.voices++;
      this.playing.set(key, (this.playing.get(key) ?? 0) + 1);
      src.onended = () => {
        this.voices--;
        this.playing.set(key, (this.playing.get(key) ?? 1) - 1);
        g.disconnect();
      };
      src.start();
    });
  }

  /** Loop a map's music (`volume` 0–100 from the original table); the same track keeps playing. */
  playMusic(key: string | undefined, volume = 100): void {
    if (!key) { this.stopMusic(); return; }
    this.musicVolume = volume / 100;
    if (key === this.musicKey && !this.playlistKey && this.music) { this.music.volume = this.musicLevel(); return; }
    this.stopMusic();
    this.startTrack(key, true);
  }

  /** Play a shuffled playlist of tracks in sequence (used for Tống Kim battlefield). */
  playPlaylist(keys: readonly string[], volume = 100): void {
    if (!keys.length) { this.stopMusic(); return; }
    const sig = keys.join('|');
    this.musicVolume = volume / 100;
    if (sig === this.playlistKey && this.music) { this.music.volume = this.musicLevel(); return; }
    this.stopMusic();
    this.playlistKey = sig;
    this.playlist = [...keys];
    for (let i = this.playlist.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.playlist[i], this.playlist[j]] = [this.playlist[j], this.playlist[i]];
    }
    this.playlistIdx = 0;
    this.playPlaylistCurrent();
  }

  private playPlaylistCurrent(): void {
    const key = this.playlist[this.playlistIdx];
    if (!key) return;
    const el = this.startTrack(key, false);
    el.onended = () => {
      if (!this.playlistKey || !this.playlist.length) return;
      this.playlistIdx = (this.playlistIdx + 1) % this.playlist.length;
      this.playPlaylistCurrent();
    };
  }

  private startTrack(key: string, loop: boolean): HTMLAudioElement {
    const el = new Audio(url(key));
    el.loop = loop;
    el.volume = this.musicLevel();
    this.music = el;
    this.musicKey = key;
    void el.play().catch(() => undefined); // starts on the first click if the browser blocks it
    return el;
  }

  stopMusic(): void {
    if (this.music) {
      this.music.onended = null;
      this.music.pause();
    }
    this.music = null;
    this.musicKey = '';
    this.playlistKey = '';
    this.playlist = [];
  }
}

export const audio = new AudioSystem();
