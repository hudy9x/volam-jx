import { MAPS, snapToMap, type TownNpc } from '@vltk/shared';
import type { ActorState } from '../../state/actor';

// Town NPCs (data: packages/shared/src/npcs/) as client-side actors next to the map entry.

export function npcState(mapId: number, npc: TownNpc): ActorState {
  const entry = MAPS[mapId].raw.entry;
  const [x, y] = snapToMap(mapId, entry.x + npc.dx, entry.y + npc.dy);
  return {
    kind: 'npc', name: npc.name, sprite: npc.res, faction: '', gender: '', level: 0, x, y, dir: npc.dir,
    anim: 'idle', animSeq: 0, jumpMs: 0, hp: 1, maxHp: 1, mp: 0, maxMp: 0, pk: 0, boss: false, scale: 1, protectedUntil: 0,
    horse: '', mounted: false, helm: -1, armor: -1, weapon: 0,
  };
}
