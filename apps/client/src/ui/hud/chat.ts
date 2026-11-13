import { CHAT, type ChatLine } from '@vltk/shared';
import { chat, chatLoading, chatOnlineCount, type ChatView } from '../../state/chat';
import { SYSLOG_KEEP, syslog, type SysLog } from '../../state/syslog';
import { storage } from '../../platform/storage';
import { $, mount } from '../kit/dom';
import type { HudContext } from './context';
import './chat.css';

const HTML = `
<div id="hud-chat" class="on-world">
  <div class="chat-head" role="tablist">
    <button type="button" class="chat-tab on" id="chat-tab-world" role="tab" data-ch="world">Thế giới</button>
    <button type="button" class="chat-tab" id="chat-tab-sys" role="tab" data-ch="sys">Hệ thống<i class="chat-dot"></i></button>
    <span class="chat-online" id="chat-online" title="Số nhân vật đang trực tuyến (mọi bản đồ)"></span>
    <button type="button" class="chat-fold" id="chat-fold" title="Thu gọn / mở khung chat">–</button>
  </div>
  <div class="chat-body">
    <div class="chat-log" id="chat-log" role="log" aria-live="polite"></div>
    <div class="chat-log sys-log" id="sys-log" role="log"></div>
    <input id="chat-input" type="text" maxlength="${CHAT.maxLength}" autocomplete="off"
      placeholder="Bấm vào đây để chat (Thế giới)" aria-label="Nội dung chat" />
  </div>
</div>`;

const FOLD_KEY = 'vltk.chatFolded';
const TAB_KEY = 'vltk.chatTab';
type Channel = 'world' | 'sys';
/** Hệ thống line time with seconds (many lines a minute under Auto). */
const hhmmss = (at: number) => new Date(at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
/** Time of a line; older days with their date. */
const hhmm = (at: number) => {
  const d = new Date(at), time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? time : `${d.getDate()}/${d.getMonth() + 1} ${time}`;
};

/**
 * Khung chat (USER 2026-11-13), bottom left above the quick bar, two tabs:
 * - Thế giới: every online character on every map (server world/chat.ts). Typing needs a click / tap on the box; a click
 *   anywhere else (the map too) leaves it, as do Esc and Enter on an empty line. While it has focus the game's hotkeys
 *   are off (WorldScene "typing"). Lines are plain text (textContent).
 * - Hệ thống: the own character's kills / exp, pick-ups, map changes, buying / selling (state/syslog.ts, kept on this
 *   device only, 100 lines, newest at the bottom). A dot on the tab = new lines while another tab is shown.
 */
export class ChatBox {
  private readonly log: HTMLElement;
  private readonly sys: HTMLElement;
  private readonly input: HTMLInputElement;
  private readonly root: HTMLElement;
  private channel: Channel = 'world';

  constructor(parent: HTMLElement, private ctx: HudContext) {
    const root = this.root = mount(parent, HTML);
    this.log = $('chat-log');
    this.sys = $('sys-log');
    this.input = $<HTMLInputElement>('chat-input');
    const folded = (() => { try { return storage.getJson<boolean>(FOLD_KEY) === true; } catch { return false; } })();
    const fold = (f: boolean) => {
      root.classList.toggle('folded', f);
      $('chat-fold').textContent = f ? '+' : '–';
      $('chat-fold').title = f ? 'Mở khung chat' : 'Thu gọn khung chat';
      try { storage.setJson(FOLD_KEY, f); } catch { /* per-device convenience only */ }
    };
    fold(folded);
    $('chat-fold').addEventListener('click', () => fold(!root.classList.contains('folded')));
    // A tab of the folded box opens it on that channel.
    for (const ch of ['world', 'sys'] as const) $(`chat-tab-${ch}`).addEventListener('click', () => { this.show(ch); fold(false); });
    this.input.addEventListener('keydown', e => {
      e.stopPropagation(); // not the game's / windows' keys (Esc closes windows)
      if (e.key === 'Enter') {
        const text = this.input.value.trim();
        if (text) this.ctx.actions()?.chat(text);
        this.input.value = '';
        if (!text) this.input.blur();
      } else if (e.key === 'Escape') this.input.blur();
    });
    // A press anywhere but the box leaves it. Capture phase: the game canvas stops the browser's own focus change.
    document.addEventListener('pointerdown', e => {
      if (document.activeElement === this.input && e.target !== this.input) this.input.blur();
    }, true);
    this.sys.addEventListener('scroll', () => {
      if (this.sys.clientHeight > 0) this.sysStick = this.sys.scrollHeight - this.sys.scrollTop - this.sys.clientHeight < 24;
    }, { passive: true });
    new ResizeObserver(() => { if (this.sysStick) this.sys.scrollTop = this.sys.scrollHeight; }).observe(this.sys);
    syslog.watch(v => this.renderSys(v));
    let saved: string | null = null;
    try { saved = storage.getJson<string>(TAB_KEY); } catch { /* per-device convenience only */ }
    this.show(saved === 'sys' ? 'sys' : 'world');
    // Scrolling near the top asks for the previous page of the account's history (server world/chat.ts chatOlder).
    // `stick`: the player reads the newest lines (follow the bottom). Kept while the box is hidden / resized too.
    this.log.addEventListener('scroll', () => {
      if (this.log.clientHeight > 0) this.stick = this.log.scrollHeight - this.log.scrollTop - this.log.clientHeight < 24;
      if (this.log.scrollTop < 30 && !this.stick) this.loadOlder();
    }, { passive: true });
    new ResizeObserver(() => { if (this.stick) this.log.scrollTop = this.log.scrollHeight; }).observe(this.log);
    chat.watch(v => this.render(v));
    chatOnlineCount.watch(n => { $('chat-online').textContent = n ? `${n} online` : ''; });
  }

  /**
   * Reactions under a line (count chips; own ones lit; hover = who) and a "+" that opens the picker of CHAT.reactions.
   * Click a chip = the list of who reacted (ui/windows/chatReacts.ts). One reaction per person: picking another in the
   * "+" picker replaces it, the same one takes it back. The "+" shows on hover (desktop) and always on touch screens.
   */
  private reactRow(l: ChatLine, self: string | undefined): HTMLElement {
    const box = document.createElement('span');
    box.className = 'chat-reacts';
    for (const e of CHAT.reactions) {
      const who = l.reacts?.[e];
      if (!who?.length) continue;
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = `chat-react${self && who.includes(self) ? ' mine' : ''}`;
      chip.textContent = `${e} ${who.length}`;
      chip.title = `${who.slice(0, 10).join(', ')}${who.length > 10 ? '…' : ''} · bấm để xem tất cả`;
      chip.addEventListener('click', () => this.onShowReacts?.(l.id, e));
      box.appendChild(chip);
    }
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'chat-react-add';
    add.textContent = '☺+';
    add.title = 'Thả cảm xúc';
    add.addEventListener('click', ev => { ev.stopPropagation(); this.openPicker(l.id, add); });
    box.appendChild(add);
    return box;
  }

  private openPicker(id: number, anchor: HTMLElement): void {
    this.picker?.remove();
    const pick = document.createElement('div');
    pick.className = 'chat-picker';
    const self = this.ctx.self()?.name;
    const mine = CHAT.reactions.find(e => self && chat.get().lines.find(l => l.id === id)?.reacts?.[e]?.includes(self));
    for (const e of CHAT.reactions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = e;
      if (e === mine) { b.classList.add('mine'); b.title = 'Bấm để gỡ'; }
      b.addEventListener('click', () => { this.ctx.actions()?.chatReact(id, e); pick.remove(); });
      pick.appendChild(b);
    }
    $('hud-chat').appendChild(pick);
    const box = $('hud-chat').getBoundingClientRect(), a = anchor.getBoundingClientRect();
    pick.style.left = `${Math.max(0, Math.min(a.left - box.left - 60, box.width - 210))}px`;
    pick.style.top = `${a.top - box.top - 36}px`;
    this.picker = pick;
    setTimeout(() => document.addEventListener('pointerdown', e => { if (!pick.contains(e.target as Node)) pick.remove(); }, { once: true }));
  }

  private picker: HTMLElement | null = null;
  private sysStick = true;
  private sysAdded = 0;

  /** Show a tab (remembered on this device). */
  private show(ch: Channel): void {
    this.channel = ch;
    this.root.classList.toggle('on-world', ch === 'world');
    this.root.classList.toggle('on-sys', ch === 'sys');
    $('chat-tab-world').classList.toggle('on', ch === 'world');
    $('chat-tab-sys').classList.toggle('on', ch === 'sys');
    $('chat-tab-world').setAttribute('aria-selected', String(ch === 'world'));
    $('chat-tab-sys').setAttribute('aria-selected', String(ch === 'sys'));
    if (ch === 'sys') { $('chat-tab-sys').classList.remove('new'); this.sysStick = true; this.sys.scrollTop = this.sys.scrollHeight; }
    else { this.stick = true; this.log.scrollTop = this.log.scrollHeight; }
    try { storage.setJson(TAB_KEY, ch); } catch { /* per-device convenience only */ }
  }

  /** The Hệ thống lines (oldest on top). A new line while the tab is hidden lights its dot. */
  private renderSys({ lines, added }: SysLog): void {
    if (added > this.sysAdded && this.channel !== 'sys') $('chat-tab-sys').classList.add('new');
    this.sysAdded = added;
    const head = document.createElement('div');
    head.className = 'chat-more';
    head.textContent = lines.length ? `— ${lines.length} / ${SYSLOG_KEEP} dòng gần nhất, lưu trên máy này —` : 'Chưa có thông báo hệ thống.';
    this.sys.replaceChildren(head, ...lines.map(l => {
      const row = document.createElement('div');
      row.className = `chat-line sys-${l.kind}`;
      const time = document.createElement('span');
      time.className = 'chat-time';
      time.textContent = hhmmss(l.at);
      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = l.text;
      row.append(time, text);
      return row;
    }));
    if (this.sysStick) this.sys.scrollTop = this.sys.scrollHeight;
  }

  /** Opens the "who reacted" window (set by the Hud). */
  onShowReacts: ((lineId: number, emoji: string) => void) | null = null;

  private loadOlder(): void {
    const v = chat.get(), first = v.lines[0];
    const actions = this.ctx.actions();
    if (v.done || v.loading || !first || !actions) return;
    chatLoading();
    actions.chatMore(first.id);
  }

  private firstId = -1;
  private stick = true;

  private render(v: ChatView): void {
    const { lines } = v;
    const fromBottom = this.log.scrollHeight - this.log.scrollTop;
    const prepended = this.firstId >= 0 && lines.length > 0 && lines[0].id < this.firstId;
    // Entering a map replaces the lines (a new page from the server): show the newest.
    if (!prepended && lines[0]?.id !== this.firstId) this.stick = true;
    const atBottom = this.stick;
    this.firstId = lines[0]?.id ?? -1;
    const self = this.ctx.self()?.name;
    const head = document.createElement('div');
    head.className = 'chat-more';
    head.textContent = v.loading ? 'Đang tải tin cũ…' : v.done ? (lines.length ? '— Hết lịch sử —' : '') : '↑ Cuộn lên để xem tin cũ';
    this.log.replaceChildren(head, ...lines.map(l => {
      const row = document.createElement('div');
      row.className = 'chat-line';
      const time = document.createElement('span');
      time.className = 'chat-time';
      time.textContent = hhmm(l.at);
      const from = document.createElement('span');
      from.className = `chat-from${l.from === self ? ' me' : ''}`;
      from.textContent = `${l.from}:`;
      const text = document.createElement('span');
      text.className = 'chat-text';
      text.textContent = l.text;
      row.append(time, from, text, this.reactRow(l, self));
      return row;
    }));
    // Older lines put on top keep what the player was reading in place; new ones follow the bottom.
    if (prepended && !atBottom) this.log.scrollTop = this.log.scrollHeight - fromBottom;
    else if (atBottom) this.log.scrollTop = this.log.scrollHeight;
    // Not enough lines to scroll yet: fetch the next page right away.
    if (!v.done && !v.loading && this.log.clientHeight > 0 && this.log.scrollHeight <= this.log.clientHeight + 4) this.loadOlder();
  }
}
