import { beginCharacterAuto, receiveCharacterAuto } from '../state/characterAuto';
import { C2S, type CharacterAuto } from '@vltk/shared';
import { Client, type Room } from '@colyseus/sdk';
import { marketResult, knbPurchaseResult } from '../state/market';
import { receiveTeam, receiveTeamInvite } from '../state/team';
import { chatOnlineCount, receiveChat, receiveOlder, receiveReacts } from '../state/chat';
import { addSyslog } from '../state/syslog';
import { MAP_ROOM, S2C, type InventoryMsg, type StashMsg, type SkillsMsg, type StatsMsg, type ChatLine, type ChatOlderMsg, type ChatReactsMsg, type LogMsg, type OnlineMsg, type StallClosedMsg, type StallDetailMsg, type StallListMsg } from '@vltk/shared';
import { inventory } from '../state/inventory';
import { stash } from '../state/stash';
import { stallClosed, stallDetail, stallList } from '../state/stall';
import { progress } from '../state/progress';
import { skillbar } from '../state/skillbar';
import { SERVER_URL, currentToken, Api, syncMapRegistry } from './api';

// WebSocket side: one Colyseus room per map. Messages about the own character go into state/; the world scene
// listens to the rest (fx, notices, transfer) itself.

const colyseus = new Client(SERVER_URL);

export async function joinMap(mapId: number, charId: string): Promise<Room> {
  await syncMapRegistry();
  mapId = (await Api.enterMap(charId)).mapId;
  const room = await colyseus.joinOrCreate(MAP_ROOM, { mapId, charId, token: currentToken() });
  beginCharacterAuto(charId, value => room.send(C2S.autoConfig, value));
  room.onMessage(S2C.autoConfig, (msg: CharacterAuto) => receiveCharacterAuto(msg));
  // The server sends the bag right after joining, before the scene exists: listen immediately.
  room.onMessage(S2C.buyKnb, (msg: { error?: string }) => knbPurchaseResult.set(msg));
  room.onMessage(S2C.tradePost, (msg: { error?: string }) => marketResult.set({ kind: 'post', ...msg }));
  room.onMessage(S2C.tradeBuy, (msg: { error?: string }) => marketResult.set({ kind: 'buy', ...msg }));
  room.onMessage(S2C.inventory, (msg: InventoryMsg) => inventory.set(msg));
  room.onMessage(S2C.stash, (msg: StashMsg) => stash.set(msg));
  room.onMessage(S2C.skills, (msg: SkillsMsg) => skillbar.setLevels(msg.levels, msg.exp, msg.bonus));
  room.onMessage(S2C.stats, (msg: StatsMsg) => progress.set(msg));
  room.onMessage(S2C.team, receiveTeam);
  room.onMessage(S2C.chat, (msg: ChatLine | ChatLine[]) => receiveChat(msg));
  room.onMessage(S2C.chatReacts, (msg: ChatReactsMsg) => receiveReacts(msg));
  room.onMessage(S2C.chatOlder, (msg: ChatOlderMsg) => receiveOlder(msg));
  room.onMessage(S2C.log, (msg: LogMsg) => addSyslog(msg));
  room.onMessage(S2C.online, (msg: OnlineMsg) => chatOnlineCount.set(Math.max(0, Number(msg?.n) || 0)));
  room.onMessage(S2C.teamInvite, receiveTeamInvite);
  room.onMessage(S2C.stallList, (msg: StallListMsg) => stallList.set(msg));
  room.onMessage(S2C.stallDetail, (msg: StallDetailMsg) => stallDetail.set(msg));
  room.onMessage(S2C.stallClosed, (msg: StallClosedMsg) => stallClosed.set(msg));
  return room;
}
