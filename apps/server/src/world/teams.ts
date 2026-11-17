import { randomBytes } from 'node:crypto';
import { MAX_TEAM, campOf, type TeamMsg } from '@vltk/shared';
import type { Sim } from './entity.js';

// Tổ đội (USER 2026-11-12; like jx-web-main's party: invite by name, accept / refuse, leave, kick, pass the lead).
// Teams live in the server process, across map rooms: a member keeps its team while travelling (MapRoom tells this module
// when a character comes online / goes offline). While in a team every member shows the leader's camp (name colour) and
// team mates never hit each other (shared combat/rules.ts). Docs: docs/pk-and-team.md.

/** What a map room offers for one online character. */
export interface TeamSeat {
  sim: Sim;
  mapId: number;
  send(type: string, msg: unknown): void;
  notify(text: string): void;
}

interface Team { id: string; leader: string; members: string[] }

const seats = new Map<string, TeamSeat>();        // charId -> online seat
const names = new Map<string, string>();          // charId -> name (kept while in a team, also offline)
const teamOf = new Map<string, Team>();           // charId -> team
const invites = new Map<string, Map<string, number>>(); // invited charId -> inviter charId -> expiry ms
const leaving = new Map<string, NodeJS.Timeout>(); // charId -> removal timer after going offline
const INVITE_MS = 60_000;
/** A member offline this long (logout, crash) leaves the team; map travel reconnects within it. */
const OFFLINE_GRACE_MS = 30_000;

const charByName = (name: string): string | undefined => {
  const low = name.trim().toLowerCase();
  for (const [id, seat] of seats) if (seat.sim.a.name.toLowerCase() === low) return id;
  return undefined;
};

/** A character entered a map (login or travel). */
export function teamOnline(charId: string, seat: TeamSeat): void {
  seats.set(charId, seat);
  names.set(charId, seat.sim.a.name);
  const t = leaving.get(charId);
  if (t) { clearTimeout(t); leaving.delete(charId); }
  refreshCamp(seat.sim);
  const team = teamOf.get(charId);
  if (team) broadcast(team); else seat.send('team', null);
}

/** A character left a map: it stays in its team for OFFLINE_GRACE_MS (travel), then leaves. */
export function teamOffline(charId: string, sim: Sim): void {
  if (seats.get(charId)?.sim !== sim) return;
  seats.delete(charId);
  invites.delete(charId);
  const team = teamOf.get(charId);
  if (!team) return;
  leaving.set(charId, setTimeout(() => { leaving.delete(charId); if (!seats.has(charId)) removeMember(charId, 'đã rời game'); }, OFFLINE_GRACE_MS));
  broadcast(team);
}

/** Camp and team id shown on the actor: the leader's camp while in a team (the leader's faction, online or last known). */
export function refreshCamp(sim: Sim): void {
  const charId = sim.charId;
  const team = charId ? teamOf.get(charId) : undefined;
  sim.a.teamLeader = !!team && team.leader === charId;
  if (!team) { sim.a.team = ''; sim.a.camp = campOf(sim.a.faction); return; }
  sim.a.team = team.id;
  const leader = seats.get(team.leader)?.sim ?? (team.leader === charId ? sim : undefined);
  sim.a.camp = campOf(leader?.a.faction ?? lastFaction.get(team.leader) ?? sim.a.faction);
  if (team.leader === charId) lastFaction.set(charId, sim.a.faction);
}
const lastFaction = new Map<string, string>();

/** One order of the team window. Returns nothing; tells the players what happened. */
export function teamOrder(charId: string, op: string, name = ''): void {
  const me = seats.get(charId);
  if (!me) return;
  const team = teamOf.get(charId);
  switch (op) {
    case 'invite': {
      const target = charByName(name);
      if (!target) { me.notify(`Không tìm thấy "${name}" đang trực tuyến.`); return; }
      if (target === charId) return;
      if (team && team.leader !== charId) { me.notify('Chỉ đội trưởng mới mời được người vào đội.'); return; }
      if (team && team.members.length >= MAX_TEAM) { me.notify(`Tổ đội đã đủ ${MAX_TEAM} người.`); return; }
      if (teamOf.has(target)) { me.notify(`${names.get(target)} đã ở trong một tổ đội khác.`); return; }
      let list = invites.get(target);
      if (!list) invites.set(target, list = new Map());
      list.set(charId, Date.now() + INVITE_MS);
      seats.get(target)!.send('teamInvite', { from: me.sim.a.name });
      me.notify(`Đã mời ${names.get(target)} vào tổ đội.`);
      return;
    }
    case 'accept':
    case 'decline': {
      const from = charByName(name);
      const at = from ? invites.get(charId)?.get(from) : undefined;
      if (!from || !at || at < Date.now()) { me.notify('Lời mời đã hết hạn.'); invites.get(charId)?.delete(from ?? ''); return; }
      invites.get(charId)!.delete(from);
      const inviter = seats.get(from)!;
      if (op === 'decline') { inviter.notify(`${me.sim.a.name} từ chối vào tổ đội.`); return; }
      if (team) { me.notify('Bạn đã ở trong một tổ đội.'); return; }
      let t = teamOf.get(from);
      if (t && t.leader !== from) { me.notify(`${inviter.sim.a.name} không còn là đội trưởng.`); return; }
      if (!t) {
        t = { id: randomBytes(6).toString('base64url'), leader: from, members: [from] };
        teamOf.set(from, t);
      }
      if (t.members.length >= MAX_TEAM) { me.notify(`Tổ đội đã đủ ${MAX_TEAM} người.`); return; }
      t.members.push(charId);
      teamOf.set(charId, t);
      for (const id of t.members) {
        invites.delete(id);
        const s = seats.get(id);
        if (s) { refreshCamp(s.sim); s.notify(`${me.sim.a.name} đã vào tổ đội.`); }
      }
      broadcast(t);
      return;
    }
    case 'leave':
      if (team) removeMember(charId, 'rời tổ đội');
      return;
    case 'disband': {
      if (!team || team.leader !== charId) return;
      for (const id of [...team.members]) {
        teamOf.delete(id);
        const s = seats.get(id);
        if (s) { refreshCamp(s.sim); s.send('team', null); s.notify('Đội trưởng đã giải tán tổ đội.'); }
      }
      return;
    }
    case 'kick': {
      if (!team || team.leader !== charId) return;
      const target = team.members.find(id => (names.get(id) ?? '').toLowerCase() === name.trim().toLowerCase());
      if (target && target !== charId) { seats.get(target)?.notify('Bạn đã bị mời ra khỏi tổ đội.'); removeMember(target, 'bị mời ra khỏi tổ đội'); }
      return;
    }
    case 'lead': {
      if (!team || team.leader !== charId) return;
      const target = team.members.find(id => (names.get(id) ?? '').toLowerCase() === name.trim().toLowerCase());
      if (!target || target === charId) return;
      team.leader = target;
      for (const id of team.members) { const s = seats.get(id); if (s) { refreshCamp(s.sim); s.notify(`${names.get(target)} trở thành đội trưởng.`); } }
      broadcast(team);
      return;
    }
  }
}

function removeMember(charId: string, why: string): void {
  const team = teamOf.get(charId);
  if (!team) return;
  teamOf.delete(charId);
  team.members = team.members.filter(id => id !== charId);
  const seat = seats.get(charId);
  if (seat) { refreshCamp(seat.sim); seat.send('team', null); }
  const name = names.get(charId) ?? '';
  if (team.members.length <= 1) {
    // One left: the team ends.
    for (const id of team.members) { teamOf.delete(id); const s = seats.get(id); if (s) { refreshCamp(s.sim); s.send('team', null); s.notify('Tổ đội đã giải tán.'); } }
    return;
  }
  if (team.leader === charId) team.leader = team.members.find(id => seats.has(id)) ?? team.members[0];
  for (const id of team.members) { const s = seats.get(id); if (s) { refreshCamp(s.sim); s.notify(`${name} ${why}.`); } }
  broadcast(team);
}

function teamMsg(team: Team): TeamMsg {
  return {
    id: team.id,
    leader: names.get(team.leader) ?? '',
    members: team.members.map(id => {
      const s = seats.get(id);
      const a = s?.sim.a;
      return {
        name: names.get(id) ?? '', online: !!s, level: a?.level ?? 0, faction: a?.faction ?? '', camp: a?.camp ?? '',
        mapId: s?.mapId ?? 0, hp: a?.hp ?? 0, maxHp: a?.maxHp ?? 0,
      };
    }),
  };
}

function broadcast(team: Team): void {
  const msg = teamMsg(team);
  for (const id of team.members) seats.get(id)?.send('team', msg);
}

// Members' Sinh lực / map in the team window: refreshed every 2 s.
setInterval(() => {
  const done = new Set<Team>();
  for (const t of teamOf.values()) if (!done.has(t)) { done.add(t); broadcast(t); }
}, 2000).unref();

/** Whether two characters (sim ids of this process) are team mates — drops, exp. */
export const sameTeam = (a: Sim | undefined, b: Sim | undefined): boolean => !!a?.a.team && a.a.team === b?.a.team;
