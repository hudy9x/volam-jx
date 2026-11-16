import type { TeamMsg, TeamInviteMsg } from '@vltk/shared';
import { Store } from './store';

/** The own tổ đội as the server last sent it (null = not in a team); net/room.ts writes it. */
export const team = new Store<TeamMsg | null>(null);
/** Pending invitations (inviter names), newest last; the team window answers them. */
export const teamInvites = new Store<string[]>([]);

/** A confirmed membership invalidates every pending invitation. */
export function receiveTeam(msg: TeamMsg | null): void {
  if (msg) teamInvites.set([]);
  team.set(msg);
}

/** Ignore invitations queued before the server confirmed that we joined a team. */
export function receiveTeamInvite(msg: TeamInviteMsg): void {
  if (team.get()) return;
  const list = teamInvites.get().filter(name => name !== msg.from);
  teamInvites.set([...list, msg.from].slice(-5));
}
