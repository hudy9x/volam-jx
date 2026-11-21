import { CHAT, type ChatLine, type ChatOlderMsg, type ChatReactsMsg } from '@vltk/shared';
import { Store } from './store';

/** Lines kept on screen (newest last): at most the account's saved history (server world/chat.ts). */
export const CHAT_KEEP = CHAT.accountLines;

export interface ChatView {
  lines: ChatLine[];
  /** Nothing older to load (scrolling up asks for the next page: C2S.chatMore). */
  done: boolean;
  /** A page was asked for and has not come back yet. */
  loading: boolean;
}

/** Kênh chat as the server sent it (net/room.ts writes; ui/hud/chat.ts shows and asks for older pages). */
export const chat = new Store<ChatView>({ lines: [], done: true, loading: false });

/** Characters online on every map (S2C.online), shown in the kênh Thế giới header. */
export const chatOnlineCount = new Store<number>(0);

function pruneTradeLines(lines: ChatLine[], now = Date.now()): ChatLine[] {
  const cutoff = now - CHAT.tradeWindowMs;
  const world: ChatLine[] = [];
  const trade: ChatLine[] = [];
  for (const l of lines) {
    if (l.ch === 'trade') { if (l.at >= cutoff) trade.push(l); }
    else world.push(l);
  }
  const keptTrade = trade.slice(-CHAT.tradeMaxLines);
  const kept = new Set(keptTrade.map(l => l.id));
  return lines.filter(l => (l.ch === 'trade' ? kept.has(l.id) : world.includes(l)));
}

/**
 * One new line, or the account's last CHAT.page lines sent on entering a map (they replace what is shown, so travel
 * does not repeat them; fewer than a page = nothing older).
 */
export function receiveChat(msg: ChatLine | ChatLine[]): void {
  const v = chat.get();
  if (Array.isArray(msg)) {
    const lines = pruneTradeLines(msg);
    chat.set({ lines, done: msg.length < CHAT.page, loading: false });
  } else {
    const next = v.lines.some(l => l.id === msg.id) ? v.lines.map(l => l.id === msg.id ? msg : l) : [...v.lines, msg].slice(-CHAT_KEEP);
    chat.set({ ...v, lines: pruneTradeLines(next) });
  }
}

/** An older page (scrolling up): put before what is shown. */
export function receiveOlder(msg: ChatOlderMsg): void {
  const v = chat.get();
  const have = new Set(v.lines.map(l => l.id));
  chat.set({ lines: pruneTradeLines([...msg.lines.filter(l => !have.has(l.id)), ...v.lines]), done: msg.done || !msg.lines.length, loading: false });
}

export const chatLoading = (): void => chat.set({ ...chat.get(), loading: true });

/** New reactions of a line. */
export function receiveReacts(msg: ChatReactsMsg): void {
  const v = chat.get();
  const i = v.lines.findIndex(l => l.id === msg.id);
  if (i < 0) return;
  const lines = v.lines.slice();
  lines[i] = { ...lines[i], reacts: Object.keys(msg.reacts).length ? msg.reacts : undefined };
  chat.set({ ...v, lines });
}
