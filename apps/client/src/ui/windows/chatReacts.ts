import { CHAT } from '@vltk/shared';
import { chat } from '../../state/chat';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import './chatReacts.css';

const ID = 'chat-reacts-dlg';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Cảm xúc">
  <div class="cr-tabs" id="cr-tabs" role="tablist"></div>
  <div class="cr-list" id="cr-list"></div>
</section>`;

/**
 * Who put which reaction on a chat line (USER 2026-11-13, like Facebook): tabs "Tất cả N" + one per emoji with its count,
 * then the names. Opened by clicking a reaction chip (ui/hud/chat.ts); Esc / ✕ closes it (ui/kit/dialog.ts). Follows
 * the live reactions while open.
 */
export class ChatReactsWindow {
  private lineId = -1;
  private tab = '';

  constructor(parent: HTMLElement, private self: () => string | undefined) {
    mount(parent, HTML);
    dialogs.register(ID, { onClose: () => { this.lineId = -1; } });
    chat.watch(() => { if (this.lineId >= 0) this.render(); }, false);
  }

  open(lineId: number, emoji = ''): void {
    this.lineId = lineId;
    this.tab = emoji;
    this.render();
    dialogs.open(ID);
  }

  private render(): void {
    const line = chat.get().lines.find(l => l.id === this.lineId);
    const reacts = line?.reacts ?? {};
    const emojis = CHAT.reactions.filter(e => reacts[e]?.length);
    if (this.tab && !emojis.includes(this.tab)) this.tab = '';
    const all = emojis.flatMap(e => reacts[e].map(name => ({ e, name })));
    dialogs.setTitle(ID, line ? `Cảm xúc · ${line.from}: ${line.text.length > 24 ? `${line.text.slice(0, 24)}…` : line.text}` : 'Cảm xúc');

    const tab = (key: string, label: string) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `cr-tab${this.tab === key ? ' on' : ''}`;
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(this.tab === key));
      b.textContent = label;
      b.addEventListener('click', () => { this.tab = key; this.render(); });
      return b;
    };
    $('cr-tabs').replaceChildren(tab('', `Tất cả ${all.length}`), ...emojis.map(e => tab(e, `${e} ${reacts[e].length}`)));

    const me = this.self();
    const rows = (this.tab ? all.filter(r => r.e === this.tab) : all).map(r => {
      const row = document.createElement('div');
      row.className = `cr-row${r.name === me ? ' me' : ''}`;
      const icon = document.createElement('span');
      icon.className = 'cr-emoji';
      icon.textContent = r.e;
      const name = document.createElement('span');
      name.textContent = r.name === me ? `${r.name} (bạn)` : r.name;
      row.append(icon, name);
      return row;
    });
    if (!rows.length) {
      const empty = document.createElement('div');
      empty.className = 'muted';
      empty.textContent = 'Chưa có ai thả cảm xúc.';
      rows.push(empty);
    }
    $('cr-list').replaceChildren(...rows);
  }
}
