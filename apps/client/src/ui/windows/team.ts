import { CAMP_COLORS, CAMP_NAMES, FACTIONS, MAPS, MAX_TEAM, type Camp, type TeamMsg, type TeamOrderMsg } from '@vltk/shared';
import { keyLabel } from '../../input/keymap';
import { settings } from '../../state/settings';
import { team, teamInvites } from '../../state/team';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import type { HudContext } from '../hud/context';
import './team.css';

const ID = 'team-dlg';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Tổ đội">
  <div id="team-invites"></div>
  <div id="team-head" class="muted"></div>
  <div id="team-members"></div>
  <div class="team-h2">Người chơi xung quanh <span class="muted">(trong màn hình)</span></div>
  <div id="team-nearby"></div>
  <div class="row team-actions">
    <button type="button" class="btn sm" id="team-leave">Rời tổ đội</button>
    <button type="button" class="btn sm" id="team-disband">Giải tán</button>
  </div>
  <label class="check team-refuse"><input type="checkbox" id="team-refuse" /> Tự từ chối lời mời tổ đội</label>
  <p class="muted team-help">Trong tổ đội mọi người mang màu chữ (phe) của đội trưởng và không đánh nhau; người giết quái nhận 100 % kinh
    nghiệm, đồng đội ở gần 80 %. Tối đa ${MAX_TEAM} người. Phím ${keyLabel('team')}.</p>
</section>`;

/**
 * Tổ đội (G), like jx-web-main's party window: invitations to answer, members (leader ★, level, faction, map, Sinh lực;
 * the leader may pass the lead or send someone away, after a confirmation), the players seen on screen with a "Mời" button
 * (refreshed every second while open — no name to type), leave / disband, and "refuse invitations". The server does
 * everything (apps/server/src/world/teams.ts).
 */
export class TeamWindow {
  private timer = 0;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID, { onClose: () => { clearInterval(this.timer); this.timer = 0; } });
    $('team-leave').addEventListener('click', () => { if (confirm('Rời tổ đội?')) this.order({ op: 'leave' }); });
    $('team-disband').addEventListener('click', () => { if (confirm('Giải tán tổ đội? Mọi thành viên sẽ rời đội.')) this.order({ op: 'disband' }); });
    const refuse = $('team-refuse') as HTMLInputElement;
    settings.watch(s => { refuse.checked = s.teamRefuse; });
    refuse.addEventListener('change', () => {
      settings.set({ teamRefuse: refuse.checked });
      this.ctx.notice(refuse.checked ? 'Sẽ tự từ chối lời mời tổ đội.' : 'Nhận lời mời tổ đội.');
    });
    team.watch(() => this.render());
    teamInvites.watch(list => {
      if (settings.get().teamRefuse && list.length) {
        for (const from of list) this.order({ op: 'decline', name: from });
        teamInvites.set([]);
        return;
      }
      this.render();
      if (list.length) { this.toggle(true); this.ctx.notice(`${list[list.length - 1]} mời bạn vào tổ đội (${keyLabel('team')}).`); }
    });
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
    const shown = !$(ID).classList.contains('hidden');
    if (shown) {
      this.render();
      if (!this.timer) this.timer = window.setInterval(() => this.renderNearby(), 1000);
    } else { clearInterval(this.timer); this.timer = 0; }
  }

  private order(msg: TeamOrderMsg): void {
    this.ctx.actions()?.team(msg);
  }

  private me(): string {
    return this.ctx.self()?.name ?? '';
  }

  private render(): void {
    const t: TeamMsg | null = team.get();
    const me = this.me();
    const lead = !!t && t.leader === me;
    $('team-invites').replaceChildren(...teamInvites.get().map(from => {
      const row = document.createElement('div');
      row.className = 'team-invite row';
      row.innerHTML = `<span class="grow"></span><button type="button" class="btn sm">Đồng ý</button><button type="button" class="btn sm">Từ chối</button>`;
      (row.querySelector('span') as HTMLElement).textContent = `${from} mời bạn vào tổ đội`;
      const [ok, no] = row.querySelectorAll('button');
      const answer = (op: 'accept' | 'decline') => { this.order({ op, name: from }); teamInvites.set(teamInvites.get().filter(n => n !== from)); };
      ok.addEventListener('click', () => answer('accept'));
      no.addEventListener('click', () => answer('decline'));
      return row;
    }));
    $('team-head').textContent = t ? `Tổ đội ${t.members.length}/${MAX_TEAM} · đội trưởng ${t.leader}`
      : 'Chưa có tổ đội — bấm "Mời" một người chơi xung quanh để lập đội (bạn là đội trưởng).';
    $('team-members').replaceChildren(...(t?.members ?? []).map(m => {
      const row = document.createElement('div');
      row.className = `team-member${m.online ? '' : ' offline'}`;
      row.innerHTML = `<div class="row"><b class="grow"></b><span class="muted lv"></span></div><div class="muted where"></div>
        <div class="hpbar"><i></i></div><div class="row tm-actions"></div>`;
      const nameEl = row.querySelector('b') as HTMLElement;
      nameEl.textContent = `${m.name === t!.leader ? '★ ' : ''}${m.name}${m.name === me ? ' (bạn)' : ''}`;
      nameEl.style.color = CAMP_COLORS[(m.camp || 'new') as Camp] ?? '#fff';
      (row.querySelector('.lv') as HTMLElement).textContent = m.online ? `Cấp ${m.level}` : 'Ngoại tuyến';
      (row.querySelector('.where') as HTMLElement).textContent = m.online
        ? `${FACTIONS[m.faction]?.name ?? CAMP_NAMES[(m.camp || 'new') as Camp]} · ${MAPS[m.mapId]?.name ?? ''}` : '';
      (row.querySelector('.hpbar i') as HTMLElement).style.width = `${m.maxHp ? Math.round((m.hp * 100) / m.maxHp) : 0}%`;
      if (lead && m.name !== me) {
        const acts = row.querySelector('.tm-actions') as HTMLElement;
        for (const [label, op, ask] of [['Bổ nhiệm', 'lead', `Bổ nhiệm ${m.name} làm đội trưởng?`], ['Mời ra', 'kick', `Mời ${m.name} ra khỏi tổ đội?`]] as const) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn sm'; b.textContent = label;
          b.addEventListener('click', () => { if (confirm(ask)) this.order({ op, name: m.name }); });
          acts.appendChild(b);
        }
      }
      return row;
    }));
    $('team-leave').classList.toggle('hidden', !t);
    $('team-disband').classList.toggle('hidden', !lead);
    this.renderNearby();
  }

  /** Players inside the screen, nearest first: "Mời" for the leader (or without a team); team mates and full teams marked. */
  private renderNearby(): void {
    const t = team.get();
    const lead = !t || t.leader === this.me();
    const full = !!t && t.members.length >= MAX_TEAM;
    const mates = new Set(t?.members.map(m => m.name));
    const near = this.ctx.nearbyPlayers?.() ?? [];
    const box = $('team-nearby');
    if (!near.length) { box.innerHTML = '<div class="muted">Không có người chơi nào trong màn hình.</div>'; return; }
    box.replaceChildren(...near.slice(0, 20).map(n => {
      const row = document.createElement('div');
      row.className = 'team-near row';
      row.innerHTML = `<b class="grow"></b><span class="muted"></span>`;
      const nameEl = row.querySelector('b') as HTMLElement;
      nameEl.textContent = n.name;
      nameEl.style.color = CAMP_COLORS[(n.camp || 'new') as Camp] ?? '#fff';
      (row.querySelector('span') as HTMLElement).textContent = `Cấp ${n.level} · ${FACTIONS[n.faction ?? '']?.name ?? 'Tân thủ'}`;
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn sm';
      if (mates.has(n.name)) { b.textContent = 'Đồng đội'; b.disabled = true; }
      else if (n.team) { b.textContent = 'Đã có đội'; b.disabled = true; }
      else if (!lead || full) { b.textContent = 'Mời'; b.disabled = true; b.title = full ? `Tổ đội đã đủ ${MAX_TEAM} người` : 'Chỉ đội trưởng mới mời được'; }
      else { b.textContent = 'Mời'; b.addEventListener('click', () => this.order({ op: 'invite', name: n.name })); }
      row.appendChild(b);
      return row;
    }));
  }
}
