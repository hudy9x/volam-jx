import type { MapMeta } from '@vltk/shared';
import type { WorldActions } from '../../game/ports';
import type { ActorState } from '../../state/actor';

/** What the HUD parts and windows share: the world's orders, the own character, notices. */
/** A player seen on screen (tổ đội window). */
export interface NearbyPlayer { name: string; level: number; camp?: string; faction?: string; team?: string; dist: number }

export interface HudContext {
  /** Orders for the world (null outside a map). */
  actions(): WorldActions | null;
  /** The own character's synced state (null before entering). */
  self(): ActorState | null;
  notice(text: string): void;
  /** Show the hành trang window (shops in Bán mode). */
  openBag(): void;
  /** Open / close the hành trang window (Trang bị và Thuộc tính → Vật phẩm). */
  toggleBag(): void;
  /** Other players in view (tổ đội invitations), nearest first. */
  nearbyPlayers?(): NearbyPlayer[];
  /** Gợi ý cộng điểm window (skill or potential points). */
  suggest?(kind: 'skills' | 'potential'): void;
  /** Current map metadata (null before entering a map). */
  meta?(): MapMeta | null;
}
