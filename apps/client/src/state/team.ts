import type { TeamMsg } from '@vltk/shared';
import { Store } from './store';

/** The own tổ đội as the server last sent it (null = not in a team); net/room.ts writes it. */
export const team = new Store<TeamMsg | null>(null);
/** Pending invitations (inviter names), newest last; the team window answers them. */
export const teamInvites = new Store<string[]>([]);
