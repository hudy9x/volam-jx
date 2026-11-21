import { CHAT, S2C, type ChatLine, type ChatOlderMsg, type ChatReactsMsg, type OnlineMsg } from '@vltk/shared';
import { db } from '../account/db.js';

// Kênh chat Thế giới (USER 2026-11-13): every online character, on every map. Lives in the server process across map
// rooms like the teams (world/teams.ts): each MapRoom registers its broadcast.
// Saved per account (USER 2026-11-13): the lines (with their reactions) are kept in the db (DbShape.chat, the last
// CHAT.storeLines), and every account online when a line is said records its id (UserRecord.chat, the last
// CHAT.accountLines). Entering a map (login or travel) sends that account's own history.

type Broadcast = (type: string, msg: unknown) => void;
const rooms = new Set<Broadcast>();
const store = db.chat();
const byId = new Map(store.lines.map(l => [l.id, l]));
/** Accounts online (username -> characters of it in the world). */
const accounts = new Map<string, number>();
const lastAt = new Map<string, number>(); // charId -> time of the last line sent
const lastReactAt = new Map<string, number>();

export function chatRoomOpen(send: Broadcast): () => void {
  rooms.add(send);
  return () => rooms.delete(send);
}

/** A character of `username` entered a map: it receives (and records) the lines said from now on. */
export function chatOnline(username: string): void {
  const key = username.toLowerCase();
  accounts.set(key, (accounts.get(key) ?? 0) + 1);
  sendOnline();
}

export function chatOffline(username: string): void {
  const key = username.toLowerCase(), n = (accounts.get(key) ?? 0) - 1;
  if (n > 0) accounts.set(key, n); else accounts.delete(key);
  sendOnline();
}

/** Characters in the world (USER 2026-11-13: "4 online" in the kênh Thế giới header), to every map. */
export const onlineCount = (): number => [...accounts.values()].reduce((a, n) => a + n, 0);
function sendOnline(): void {
  const msg: OnlineMsg = { n: onlineCount() };
  for (const send of rooms) send(S2C.online, msg);
}

/** The account's saved lines (oldest first), still in the store. Trade channel is filtered to last 30m & max 50 lines. */
const accountLines = (username: string, now = Date.now()): ChatLine[] => {
  const tradeCutoff = now - CHAT.tradeWindowMs;
  const recentTrade = store.lines
    .filter(l => l.ch === 'trade' && l.at >= tradeCutoff)
    .slice(-CHAT.tradeMaxLines);
  const seenWorld = (db.userChat(username) ?? [])
    .map(id => byId.get(id))
    .filter((l): l is ChatLine => !!l && l.ch !== 'trade');
  return [...seenWorld, ...recentTrade].sort((a, b) => a.id - b.id).slice(-CHAT.accountLines);
};

/** The account's last CHAT.page lines, for a character entering a map (older ones load on scrolling up: chatOlder). */
export const chatHistoryFor = (username: string): ChatLine[] => accountLines(username).slice(-CHAT.page);

/** One page of the account's lines said before line `before` (oldest first) and whether that was the oldest. */
export function chatOlder(username: string, before: unknown): ChatOlderMsg {
  if (!Number.isFinite(Number(before))) return { lines: [], done: true };
  const lines = accountLines(username);
  const end = lines.findIndex(l => l.id >= Number(before));
  const stop = end < 0 ? lines.length : end;
  const start = Math.max(0, stop - CHAT.page);
  return { lines: lines.slice(start, stop), done: start === 0 };
}

/** One line from a character; returns why it was refused (shown to the sender only), or null. */
export function chatSay(charId: string, name: string, raw: unknown, now = Date.now(), ch: 'world' | 'trade' = 'world', offer?: import('@vltk/shared').TradeOffer): string | null {
  // Control characters out, spaces collapsed, length capped. Clients show it as plain text (textContent).
  const text = String(raw ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, CHAT.maxLength);
  if (!text) return null;
  const last = lastAt.get(charId);
  const wait = last === undefined ? 0 : last + CHAT.minGapMs - now;
  if (wait > 0) return `Nói chậm thôi: chờ ${Math.ceil(wait / 1000)} giây nữa.`;
  lastAt.set(charId, now);
  const line: ChatLine = { id: store.nextId++, ch, ...(offer ? { offer } : {}), from: name, text, at: now };
  store.lines.push(line);
  byId.set(line.id, line);
  while (store.lines.length > CHAT.storeLines) byId.delete(store.lines.shift()!.id);
  for (const user of accounts.keys()) {
    const ids = db.userChat(user);
    if (!ids) continue;
    ids.push(line.id);
    if (ids.length > CHAT.accountLines) ids.splice(0, ids.length - CHAT.accountLines);
  }
  db.touch();
  for (const send of rooms) send(S2C.chat, line);
  return null;
}

/**
 * Reaction (CHAT.reactions) of character `name` on line `id`: one per person per line (USER 2026-11-13, like Facebook) —
 * another emoji replaces the old one, the same emoji again takes it back. Any stored line can get one. Everyone online
 * sees the new reactions (S2C.chatReacts); they are saved with the line.
 */
export function chatReact(charId: string, name: string, id: unknown, emoji: unknown, now = Date.now()): void {
  const line = byId.get(Number(id));
  const e = String(emoji ?? '');
  if (!line || !CHAT.reactions.includes(e)) return;
  const last = lastReactAt.get(charId);
  if (last !== undefined && now - last < CHAT.reactGapMs) return;
  lastReactAt.set(charId, now);
  const reacts = line.reacts ??= {};
  const had = reacts[e]?.includes(name) ?? false;
  for (const k of Object.keys(reacts)) {
    reacts[k] = reacts[k].filter(n => n !== name);
    if (!reacts[k].length) delete reacts[k];
  }
  if (!had) (reacts[e] ??= []).push(name);
  if (!Object.keys(reacts).length) delete line.reacts;
  db.touch();
  for (const send of rooms) send(S2C.chatReacts, { id: line.id, reacts: line.reacts ?? {} } satisfies ChatReactsMsg);
}

export const chatLineById = (id: number): ChatLine | undefined => byId.get(id);

export function chatRefresh(line: ChatLine): void { for (const send of rooms) send(S2C.chat, line); }
