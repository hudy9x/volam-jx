/**
 * Old quick mode of the runner (tools/bots/run.ts), kept for smoke tests:
 *
 *   npm run bots -- <count> <seconds> [endpoint=http://localhost:2567]
 *
 * Each bot registers/logs in, creates a character, joins the town, walks through the portal
 * to Dược Vương Cốc (exercising map transfer) on horseback, turns PK on and keeps casting at the nearest
 * monster or player. Prints per-bot traffic and the room's view of the fight.
 */
import { Client, type Room } from '@colyseus/sdk';
import {
  C2S, HORSE_IDS, SERIES, ITEMS, MAPS, MAP_ROOM, S2C, TOWN_MAP_ID, getSkill, isCastable, isoDistance,
  itemDef, learnableSkills, skillCategory, starterEquipment, weaponOk, weaponTypeOf, type Item,
  type CharacterSummary, type FxEvent, type InventoryMsg, type TransferMsg,
} from '@vltk/shared';

let ENDPOINT = 'http://localhost:2567';
let SECONDS = 20;

async function api<T>(path: string, body?: unknown, token?: string): Promise<T> {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(`${path}: ${json.error}`);
  return json as T;
}

interface Stats { fx: number; hits: number; dmg: number; kills: number; bytes: number; transfers: number; maps: number[] }

async function runBot(index: number): Promise<Stats> {
  const username = `bot_${index}`;
  const password = 'botpass';
  const auth = await api<{ token: string }>('/api/login', { username, password })
    .catch(() => api<{ token: string }>('/api/register', { username, password }));
  let chars = await api<CharacterSummary[]>('/api/characters', undefined, auth.token);
  if (!chars.length) {
    // New characters: hệ + giới, level 1 without a faction (joins at level 10).
    const series = SERIES[index % SERIES.length];
    const gender = index % 2 ? 'female' : 'male';
    await api('/api/characters', { name: `Bot${index}`, series, gender }, auth.token);
    chars = await api<CharacterSummary[]>('/api/characters', undefined, auth.token);
  }
  const char = chars[0];
  const client = new Client(ENDPOINT);
  const stats: Stats = { fx: 0, hits: 0, dmg: 0, kills: 0, bytes: 0, transfers: 0, maps: [] };
  // Attacks of the faction that work with the starter weapon (bots never change equipment).
  const weapon = weaponTypeOf(ITEMS[starterEquipment(char.faction, char.gender).weapon ?? '']);
  const skills = (char.faction ? learnableSkills(char.faction) : []).filter(id => {
    const s = getSkill(id)!;
    return isCastable(s) && skillCategory(s) === 'attack' && weaponOk(s, weapon) && !s.noHorse;
  });
  if (!skills.length) skills.push(1);

  let mapId = char.mapId;
  /** Bag from the last inventory message (to find the bought horse). */
  let bag: (Item | null)[] = [];
  let room: Room = await client.joinOrCreate(MAP_ROOM, { mapId, token: auth.token, charId: char.id });
  const end = Date.now() + SECONDS * 1000;

  const wire = (r: Room) => {
    stats.maps.push(mapId);
    r.onMessage(S2C.fx, (events: FxEvent[]) => {
      stats.fx += events.length;
      stats.bytes += JSON.stringify(events).length;
      for (const e of events) {
        if (e.t === 'hit' && e.id === r.sessionId) { stats.hits++; stats.dmg += e.dmg; }
        if (e.t === 'die' && e.by === r.sessionId) stats.kills++;
      }
    });
    r.onMessage(S2C.notice, () => {});
    r.onMessage(S2C.inventory, (msg: InventoryMsg) => { bag = msg.bag; });
    r.onMessage(S2C.stats, () => undefined);
    r.onMessage(S2C.skills, () => {});
    for (const type of [S2C.online, S2C.chat, S2C.chatReacts, S2C.chatOlder, S2C.team, S2C.teamInvite, S2C.log]) r.onMessage(type, () => {});
    r.onMessage(S2C.transfer, async (msg: TransferMsg) => {
      stats.transfers++;
      await r.leave();
      mapId = msg.mapId;
      room = await client.joinOrCreate(MAP_ROOM, { mapId, token: auth.token, charId: char.id });
      wire(room);
    });
  };
  wire(room);

  while (Date.now() < end) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 200));
    const state = room.state as any;
    const me = state?.actors?.get(room.sessionId);
    if (!me) continue;
    if (me.hp <= 0) { room.send(C2S.respawn, {}); continue; }
    if (state.mapId === TOWN_MAP_ID) {
      // Horses are items: buy one from the Bán ngựa list (town only) and wear it.
      if (!me.horse) {
        const index = bag.findIndex(it => itemDef(it)?.kind === 'horse');
        if (index >= 0) room.send(C2S.equip, { index });
        else room.send(C2S.buy, { item: HORSE_IDS[0] });
      }
      else if (!me.mounted) room.send(C2S.mount, { on: true });
      const portal = MAPS[TOWN_MAP_ID].portals[0];
      room.send(C2S.move, { x: portal.x, y: portal.y });
      continue;
    }
    if (!me.pk) room.send(C2S.pk, { mode: 2 });
    // nearest living target
    let best: { id: string; x: number; y: number } | null = null, bestDist = Infinity;
    state.actors.forEach((a: any, id: string) => {
      if (id === room.sessionId || a.hp <= 0) return;
      const d = isoDistance(me.x, me.y, a.x, a.y);
      if (d < bestDist) { bestDist = d; best = { id, x: a.x, y: a.y }; }
    });
    if (!best) continue;
    const target = best as { id: string; x: number; y: number };
    const skill = skills[Math.floor(Math.random() * skills.length)];
    room.send(C2S.cast, { skill, targetId: target.id, x: target.x, y: target.y });
  }
  await room.leave();
  return stats;
}

export async function runLegacy(COUNT: number, seconds: number, endpoint: string): Promise<void> {
  ENDPOINT = endpoint;
  SECONDS = seconds;
  const started = Date.now();
  const results = await Promise.allSettled(Array.from({ length: COUNT }, (_, i) => runBot(i)));
  const ok = results.filter(r => r.status === 'fulfilled') as PromiseFulfilledResult<Stats>[];
  for (const r of results) if (r.status === 'rejected') console.error('bot failed:', r.reason?.message ?? r.reason);
  const sum = (k: keyof Omit<Stats, 'maps'>) => ok.reduce((s, r) => s + r.value[k], 0);
  const secs = (Date.now() - started) / 1000;
  console.log(JSON.stringify({
    bots: COUNT, ok: ok.length, seconds: Math.round(secs),
    transfers: sum('transfers'), kills: sum('kills'), hitsTaken: sum('hits'), dmgTaken: sum('dmg'),
    fxEventsPerBotPerSec: Math.round(sum('fx') / Math.max(1, ok.length) / secs),
    fxJsonKBPerBotPerSec: +(sum('bytes') / 1024 / Math.max(1, ok.length) / secs).toFixed(1),
    mapsVisited: ok[0]?.value.maps,
  }, null, 1));
  process.exit(0);
}
