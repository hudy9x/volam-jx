import { HORSES, type Gender } from '@vltk/shared';
import {
  JX_ASSOC, JX_FOOT, JX_PARTS, JX_SHADOWS, JX_SHEETS, JX_SORT, NPC_SHADOWS, NPC_SHEETS, type AssocKey, type NpcAction, type Sx,
} from './data.gen';
import { XIAOYAO_ASSOC, XIAOYAO_PARTS, XIAOYAO_SHADOWS, XIAOYAO_SHEETS, XIAOYAO_SORT } from './xiaoyao.gen';
import { MANTLE_PARTS, MANTLE_SHEETS } from './mantles.gen';
import { assetUrl } from '../assets';

/**
 * Original JX1 art catalog (tools/gen-assets.ts): which sheet to draw for a look / action / facing. Pure lookups,
 * shared by the game (Phaser, game/actors/) and the interface (horse / NPC previews). Drawn at 1:1.
 * Players are paper-dolls of up to 11 layers (head, hair, shoulder, body, both arms, both weapons, three horse
 * parts); which sprite each layer uses depends on the equipped rows, the weapon's action set (association
 * table) and whether the character rides. Draw order comes from the original 贴图顺序表 per action, facing and
 * sometimes frame. Monsters and NPCs are single sprites per action.
 * Shadows (docs/shadows.md) are sprites of their own drawn under everything, same facing and frame progress as the
 * body: players one set for every outfit (and horse) per action, monsters / NPCs "<body>b" when the original has it.
 */
export type { AssocKey, NpcAction, Sx };

export interface Look {
  sx: Sx;
  helm: number;
  armor: number;
  weapon: number;
  /** Horse row when mounted, -1 on foot. */
  horse: number;
  /** Mantle (Phi phong) row when worn & active, -1 when none. */
  mantle?: number;
}

export interface Layer {
  part: number;
  key: string;
  /** [cell w, cell h, box x, box y, frames per direction, directions, columns] */
  meta: readonly number[];
}

export interface Pose {
  /** Action column (e.g. MeleeWStand), keys the draw-order table. */
  action: string;
  layers: Layer[];
  body: Layer;
  /** Ground shadow, when the original has one for this action / sprite. */
  shadow?: Layer;
}

/** Part id given to shadow layers (not a paper-doll part). */
export const SHADOW_PART = -1;
const sheetMeta = (key: string): readonly number[] | undefined => JX_SHEETS[key] ?? XIAOYAO_SHEETS[key];
const assocOf = (sx: Sx, weapon: number) => JX_ASSOC[sx][weapon] ?? XIAOYAO_ASSOC[sx][weapon];
const shadowLayer = (key: string | undefined): Layer | undefined => {
  const meta = key ? sheetMeta(key) : undefined;
  return key && meta ? { part: SHADOW_PART, key, meta } : undefined;
};

const PART_SLOT: Record<number, 'helm' | 'armor' | 'weapon' | 'horse'> = {
  0: 'helm', 1: 'helm', 4: 'armor', 5: 'armor', 6: 'armor', 7: 'armor', 8: 'weapon', 9: 'weapon', 12: 'horse', 13: 'horse', 14: 'horse',
};
const BODY = 5;

export const FOOT_X = JX_FOOT[0];
export const FOOT_Y = JX_FOOT[1];

export function makeLook(gender: Gender | string, helm: number, armor: number, weapon: number, horseId: string, mounted: boolean, mantle = -1): Look {
  const sx: Sx = gender === 'female' ? 'f' : 'm';
  const horse = mounted && horseId ? HORSES[horseId]?.jxRow ?? -1 : -1;
  return { sx, helm, armor, weapon: assocOf(sx, weapon) ? weapon : 0, horse, mantle };
}

export const lookKey = (l: Look) => `${l.sx}|${l.helm}|${l.armor}|${l.weapon}|${l.horse}|${l.mantle ?? -1}`;
const poseCache = new Map<string, Pose | null>();

/** Layers of one game action for a look; falls back to the fighting stance when an action is missing. */
export function poseFor(look: Look, key: AssocKey): Pose | null {
  const cacheKey = `${lookKey(look)}|${key}`;
  let pose = poseCache.get(cacheKey);
  if (pose !== undefined) return pose;
  const set = assocOf(look.sx, look.weapon)?.[look.horse >= 0 ? 1 : 0];
  const action = set?.[key] ?? set?.stand;
  pose = null;
  if (action) {
    const layers: Layer[] = [];
    const isGuqin = action.startsWith('GuqinW');
    for (const [partStr, rows] of Object.entries(JX_PARTS[look.sx])) {
      const part = Number(partStr);
      const slot = PART_SLOT[part];
      const row = look[slot];
      const xyPart = XIAOYAO_PARTS[look.sx][part];
      let sheet = row >= 0 ? (rows[row]?.[action] ?? xyPart?.[row]?.[action]) : undefined;
      // Original volam-3005 npcres tables fall back all outfits to Xiaoyao default row (161) for GuqinW* actions.
      if (!sheet && isGuqin && (slot === 'helm' || slot === 'armor')) {
        sheet = xyPart?.[161]?.[action];
      }
      const meta = sheet ? sheetMeta(sheet) : undefined;
      if (sheet && meta) layers.push({ part, key: sheet, meta });
    }
    const mantleRow = look.mantle ?? -1;
    if (mantleRow >= 0) {
      const mKey = MANTLE_PARTS[look.sx][mantleRow]?.[action];
      const mMeta = mKey ? MANTLE_SHEETS[mKey] : undefined;
      if (mKey && mMeta) layers.push({ part: 16, key: mKey, meta: mMeta });
    }
    const body = layers.find(l => l.part === BODY);
    const shadowKey = JX_SHADOWS[look.sx][action] ?? XIAOYAO_SHADOWS[look.sx][action];
    if (body) pose = { action, layers, body, shadow: shadowLayer(shadowKey) };
  }
  poseCache.set(cacheKey, pose);
  return pose;
}

/**
 * Back-to-front part ids. The table has one `DirN` per sprite direction (Dir1 = facing the viewer, then
 * clockwise like the sprite rows) and `Line` overrides keyed by the frame index within the whole sprite
 * (direction * frames per direction + frame).
 */
export function drawOrder(sx: Sx, pose: Pose, dir: number, frame: number): number[] {
  const table = JX_SORT[sx][pose.action] ?? XIAOYAO_SORT[sx][pose.action];
  const def = JX_SORT[sx].DEFAULT;
  const [, , , , perDir, dirs] = pose.body.meta;
  const row = spriteRow(dir, dirs);
  return table?.lines[row * perDir + frame] ?? table?.dirs[row] ?? def.dirs[row] ?? def.dirs[0] ?? [];
}

/** Sprite row for one of our 8 facings (0 = south, clockwise: SW, W, NW, N, NE, E, SE). */
export function spriteRow(dir: number, dirs: number): number {
  if (dirs >= 8) return Math.round((dir * dirs) / 8) % dirs;
  return Math.floor((dir * dirs) / 8);
}

// ======================= monsters / NPCs =======================

export function npcSheet(res: string, action: NpcAction): Layer | null {
  const set = NPC_SHEETS[res];
  const key = set?.[action] ?? set?.stand ?? set?.idle;
  return key ? { part: BODY, key, meta: JX_SHEETS[key] } : null;
}

/** Monster / NPC pose: one body sprite and its shadow, if any. */
export function npcPose(res: string, action: NpcAction): Pose | null {
  const body = npcSheet(res, action);
  return body ? { action: '', layers: [body], body, shadow: shadowLayer(NPC_SHADOWS[body.key]) } : null;
}

export const hasNpc = (res: string) => !!NPC_SHEETS[res];

// ======================= files =======================

export const jxSheetUrl = (key: string) => assetUrl(`${key}.webp`);

/** Horse parts (back to front) for a static preview: standing pose, first frame, given facing. */
export function horsePreview(horseRow: number, dir = 2): { key: string; meta: readonly number[]; row: number }[] {
  const action = JX_ASSOC.m[0][1].stand!;
  const parts = JX_PARTS.m;
  const order = JX_SORT.m[action]?.dirs[dir] ?? JX_SORT.m.DEFAULT.dirs[dir] ?? [14, 13, 12];
  return order
    .filter(part => part >= 12 && parts[part]?.[horseRow]?.[action])
    .map(part => {
      const key = parts[part][horseRow][action];
      const meta = JX_SHEETS[key];
      return { key, meta, row: spriteRow(dir, meta[5]) };
    });
}

/**
 * Layers (back to front) of a standing character for a static / CSS-animated preview (character select): `frame` within the
 * direction, `dir` our facing (0 = south). Each: sheet key, meta, sprite row and part.
 */
export function lookPreview(look: Look, dir = 0, key: AssocKey = 'stand'): { key: string; meta: readonly number[]; row: number; part: number }[] {
  const pose = poseFor(look, key);
  if (!pose) return [];
  const order = drawOrder(look.sx, pose, dir, 0);
  const byPart = new Map(pose.layers.map(l => [l.part, l]));
  return order.filter(p => byPart.has(p)).map(p => {
    const l = byPart.get(p)!;
    return { key: l.key, meta: l.meta, row: spriteRow(dir, l.meta[5]), part: p };
  });
}
