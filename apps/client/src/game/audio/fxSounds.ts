import { getSkill, type FxEvent } from '@vltk/shared';
import { audio } from './Audio';
import { MISSILE_SND, NPC_SND, PLAYER_SND, SKILL_CAST } from './sounds.gen';

/** What the sounds need to know about an actor. */
export interface SoundActor {
  kind: string;
  /** NPC / monster res (npc动作声音表 row). */
  sprite: string;
  gender: string;
  mounted: boolean;
  x: number;
  y: number;
}

const sex = (a: SoundActor) => (a.gender === 'female' ? PLAYER_SND.f : PLAYER_SND.m);

/** The original sounds of one server fx event: cast, missile fly / hit, wound, death. */
export function fxSound(e: FxEvent, actor: (id: string) => SoundActor | undefined): void {
  switch (e.t) {
    case 'cast': {
      const a = actor(e.id);
      const s = getSkill(e.skill);
      if (!a || !s) return;
      const cast = SKILL_CAST[e.skill];
      if (a.kind === 'player') {
        // Skill sound (male / female caster), otherwise the weapon swing of the pose.
        if (cast) { audio.play(a.gender === 'female' ? cast[1] : cast[0], a.x, a.y); return; }
        const p = sex(a), w = s.weapon ?? -1;
        const swing = w >= 100 ? p.throw
          : s.melee ? (a.mounted ? p.rideCut : w === 3 ? p.puncture : w === 2 || w === 4 ? p.pound : p.cut)
            : (a.mounted ? p.rideMagic : p.magic);
        audio.play(swing ?? p.attack, a.x, a.y);
        return;
      }
      const npc = NPC_SND[a.sprite];
      audio.play((s.melee ? npc?.attack : npc?.magic ?? npc?.attack) ?? cast?.[0], a.x, a.y);
      return;
    }
    case 'msl':
      audio.play(MISSILE_SND[e.k]?.[1], e.x, e.y, 0.8);
      return;
    case 'mend': {
      const snd = MISSILE_SND[e.k];
      audio.play(e.c ? snd?.[3] : snd?.[2], e.x, e.y);
      return;
    }
    case 'hit': {
      const a = actor(e.id);
      if (!a || e.dot) return;
      if (a.kind === 'player') { const p = sex(a); audio.play(a.mounted ? p.rideWound ?? p.wound : p.wound, a.x, a.y, 0.7); }
      else audio.play(NPC_SND[a.sprite]?.wound, a.x, a.y, 0.7);
      return;
    }
    case 'die': {
      const a = actor(e.id);
      if (!a) return;
      if (a.kind === 'player') { const p = sex(a); audio.play(a.mounted ? p.rideDie ?? p.die : p.die, a.x, a.y); }
      else audio.play(NPC_SND[a.sprite]?.die, a.x, a.y);
      return;
    }
  }
}
