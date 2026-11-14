import { MAX_TEAM, isoDistance, type TeamMsg } from '@vltk/shared';

/** Bot invitation cadence; this does not change server team rules. */
export const BOT_TEAM_INVITE = { gapMs: 5000, targetGapMs: 60_000 } as const;
export interface TeamCandidate { id: string; kind: string; name: string; hp: number; team: string; x: number; y: number }

/** A map-local view: only known, living players, no team stealing and no invitation spam. */
export class TeamInviter {
  private nextAt = 0;
  private invited = new Map<string, number>();

  next(now: number, self: TeamCandidate | undefined, actors: TeamCandidate[], team: TeamMsg | null | undefined): string | null {
    if (!self || self.hp <= 0 || team === undefined || now < this.nextAt) return null;
    if (self.team && (!team || team.id !== self.team || team.leader !== self.name)) return null;
    if (team && (team.leader !== self.name || team.members.length >= MAX_TEAM)) return null;
    for (const [name, until] of this.invited) if (until <= now) this.invited.delete(name);
    const members = new Set(team?.members.map(m => m.name) ?? []);
    // Outstanding invitations reserve slots until accepted or their server-side 60s expiry.
    const outstanding = [...this.invited.keys()].filter(name => !members.has(name)).length;
    if ((team?.members.length ?? 1) + outstanding >= MAX_TEAM) return null;
    const target = actors.filter(a => a.id !== self.id && a.name !== self.name && a.kind === 'player'
      && a.hp > 0 && !a.team && !members.has(a.name) && !this.invited.has(a.name))
      .sort((a, b) => isoDistance(self.x, self.y, a.x, a.y) - isoDistance(self.x, self.y, b.x, b.y) || a.name.localeCompare(b.name))[0];
    if (!target) return null;
    this.nextAt = now + BOT_TEAM_INVITE.gapMs;
    this.invited.set(target.name, now + BOT_TEAM_INVITE.targetGapMs);
    return target.name;
  }
}
