import assert from 'node:assert/strict';
import test from 'node:test';
import { Actor } from '../apps/server/src/net/schema.js';
import { makeSim } from '../apps/server/src/world/entity.js';
import { teamOnline, teamOrder } from '../apps/server/src/world/teams.js';
import { team, teamInvites } from '../apps/client/src/state/team.js';
import * as clientTeam from '../apps/client/src/state/team.js';
import type { TeamMsg } from '../packages/shared/src/index.js';

test('accepting one invitation invalidates all old invites, even after leaving; a leader can still recruit', () => {
  const events = new Map<string, { type: string; msg: any }[]>();
  for (const name of ['first', 'second', 'member', 'extra']) {
    const a = new Actor(); Object.assign(a, { name, faction: 'shaolin', hp: 100, maxHp: 100 });
    const sim = makeSim('invite-' + name, 'player', a, 'kim', 100); sim.charId = sim.id;
    const log: { type: string; msg: any }[] = []; events.set(name, log);
    teamOnline(sim.id, { sim, mapId: 140, send: (type, msg) => log.push({ type, msg }), notify: msg => log.push({ type: 'notice', msg }) });
  }
  const order = (name: string, op: string, target = '') => teamOrder('invite-' + name, op, target);
  order('second', 'invite', 'first');
  order('first', 'invite', 'member'); order('second', 'invite', 'member'); order('member', 'accept', 'first');
  order('second', 'invite', 'member'); assert.match(events.get('second')!.at(-1)!.msg, /đã ở trong/);
  order('first', 'invite', 'extra'); assert.equal(events.get('extra')!.at(-1)!.type, 'teamInvite');
  order('member', 'invite', 'extra'); assert.match(events.get('member')!.at(-1)!.msg, /Chỉ đội trưởng/);
  order('member', 'leave'); order('member', 'accept', 'second');
  assert.match(events.get('member')!.at(-1)!.msg, /hết hạn/, 'the other pending invitation must not survive joining and leaving');
  order('first', 'accept', 'second');
  assert.match(events.get('first')!.at(-1)!.msg, /hết hạn/, 'forming a team also invalidates the new leader\'s incoming invitations');
  order('second', 'invite', 'member'); order('member', 'accept', 'second');
  assert.equal(events.get('member')!.at(-1)!.type, 'team', 'a fresh invitation works after leaving');
  order('member', 'leave');
});

test('client clears all pending names on team confirmation, ignores late invites, and accepts new ones after leaving', () => {
  const handlers = clientTeam as typeof clientTeam & {
    receiveTeam(msg: TeamMsg | null): void;
    receiveTeamInvite(msg: { from: string }): void;
  };
  assert.equal(typeof handlers.receiveTeam, 'function');
  assert.equal(typeof handlers.receiveTeamInvite, 'function');
  team.set(null); teamInvites.set([]);
  handlers.receiveTeamInvite({ from: 'A' }); handlers.receiveTeamInvite({ from: 'B' });
  assert.deepEqual(teamInvites.get(), ['A', 'B']);
  const snapshot: TeamMsg = { id: 'team', leader: 'A', members: [] };
  handlers.receiveTeam(snapshot); assert.deepEqual(teamInvites.get(), []);
  handlers.receiveTeamInvite({ from: 'late' }); assert.deepEqual(teamInvites.get(), []);
  handlers.receiveTeam(null); handlers.receiveTeamInvite({ from: 'C' });
  assert.deepEqual(teamInvites.get(), ['C']);
  team.set(null); teamInvites.set([]);
});

test('captain marker follows formation, leadership transfer and dissolution', () => {
  const actors = ['captain-marker-a','captain-marker-b'].map(name => {
    const a=new Actor();Object.assign(a,{name,faction:'shaolin',hp:100,maxHp:100});
    const sim=makeSim(name,'player',a,'kim',100);sim.charId=name;
    teamOnline(name,{sim,mapId:140,send:()=>{},notify:()=>{}});return a;
  });
  assert.equal(actors[0].teamLeader,false);
  teamOrder('captain-marker-a','invite','captain-marker-b');teamOrder('captain-marker-b','accept','captain-marker-a');
  assert.equal(actors[0].teamLeader,true);assert.equal(actors[1].teamLeader,false);
  teamOrder('captain-marker-a','lead','captain-marker-b');
  assert.equal(actors[0].teamLeader,false);assert.equal(actors[1].teamLeader,true);
  teamOrder('captain-marker-b','leave');
  assert.equal(actors[0].teamLeader,false);assert.equal(actors[1].teamLeader,false);
});
