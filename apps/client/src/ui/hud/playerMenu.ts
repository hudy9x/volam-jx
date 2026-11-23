import { CAMP_COLORS, FACTIONS, combatRulesAt, isTkBattleMap, type Camp } from '@vltk/shared';
import type { PlayerMenuTarget } from '../../game/ports';
import { $, mount } from '../kit/dom';
import { hudSize, localPoint } from '../kit/viewport';
import type { HudContext } from './context';
import './playerMenu.css';

const ID = 'player-ctx-menu';
const HTML = `
<div id="${ID}" class="hidden" role="menu" aria-label="Tác vụ người chơi">
  <div class="pcm-head">
    <div class="pcm-name" id="pcm-name"></div>
    <div class="pcm-sub" id="pcm-sub"></div>
  </div>
  <div class="pcm-list">
    <button type="button" class="pcm-item" id="pcm-team" role="menuitem">Mời tổ đội</button>
    <button type="button" class="pcm-item" id="pcm-inspect" role="menuitem">Xem thông tin</button>
    <button type="button" class="pcm-item danger" id="pcm-enmity" role="menuitem">Cừu sát</button>
    <button type="button" class="pcm-item" id="pcm-follow" role="menuitem">Theo sau</button>
  </div>
</div>`;

/** Floating context menu opened on another player/bot via Ctrl + Right-click (desktop) or long-press (mobile). */
export class PlayerContextMenu {
  private readonly parent: HTMLElement;
  private readonly el: HTMLElement;
  private target: PlayerMenuTarget | null = null;
  private readonly onDocPointerDown: (e: PointerEvent) => void;
  private readonly onKeyDown: (e: KeyboardEvent) => void;

  constructor(parent: HTMLElement, private readonly ctx: HudContext) {
    this.parent = parent;
    this.el = mount(parent, HTML);
    this.el.addEventListener('contextmenu', e => e.preventDefault());

    $('pcm-team').addEventListener('click', () => {
      const t = this.target;
      this.close();
      if (t) this.ctx.actions()?.team({ op: 'invite', name: t.name });
    });
    $('pcm-inspect').addEventListener('click', () => {
      const t = this.target;
      this.close();
      if (t) this.ctx.actions()?.inspect(t.id);
    });
    $('pcm-enmity').addEventListener('click', () => {
      const t = this.target;
      const self = this.ctx.self();
      this.close();
      if (!t) return;
      const cancelling = self?.enmityTarget === t.id;
      this.ctx.actions()?.enmity(cancelling ? '' : t.id);
    });
    $('pcm-follow').addEventListener('click', () => {
      const t = this.target;
      const self = this.ctx.self();
      this.close();
      if (!t) return;
      const stopping = self?.followTarget === t.id;
      this.ctx.actions()?.follow(stopping ? '' : t.id);
    });

    this.onDocPointerDown = (e: PointerEvent) => {
      if (this.el.classList.contains('hidden')) return;
      if (!this.el.contains(e.target as Node)) this.close();
    };
    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !this.el.classList.contains('hidden')) this.close();
    };
    document.addEventListener('pointerdown', this.onDocPointerDown, true);
    document.addEventListener('keydown', this.onKeyDown);
  }

  open(target: PlayerMenuTarget, clientX: number, clientY: number): void {
    const self = this.ctx.self();
    const meta = this.ctx.meta?.() ?? null;
    this.target = target;

    const nameEl = $('pcm-name');
    nameEl.textContent = target.name;
    nameEl.style.color = CAMP_COLORS[(target.camp || 'new') as Camp] ?? '#ffffff';

    const facName = target.faction ? (FACTIONS[target.faction]?.name ?? target.faction) : 'Vô môn phái';
    $('pcm-sub').textContent = `Cấp ${target.level} · ${facName}`;

    // 1. Mời tổ đội
    const teamBtn = $('pcm-team') as HTMLButtonElement;
    const sameTeam = !!self?.team && self.team === target.team;
    const notLeader = !!self?.team && !self.teamLeader;
    const targetHasTeam = !!target.team;
    teamBtn.disabled = sameTeam || notLeader || targetHasTeam;
    teamBtn.textContent = sameTeam ? 'Đã cùng tổ đội' : 'Mời tổ đội';
    teamBtn.title = notLeader ? 'Chỉ đội trưởng mới mời được người vào đội'
      : targetHasTeam && !sameTeam ? 'Người này đã ở trong tổ đội khác' : '';

    // 3. Cừu sát (ẩn/khóa trong chiến trường Tống Kim)
    const enmityBtn = $('pcm-enmity') as HTMLButtonElement;
    const inTk = (meta ? isTkBattleMap(meta.id) : false) || !!self?.battleCamp || !!target.battleCamp;
    const isCancelling = !!self?.enmityTarget && self.enmityTarget === target.id;
    if (inTk) {
      enmityBtn.classList.add('hidden');
    } else {
      enmityBtn.classList.remove('hidden');
      const inSafe = !!meta && !!self && combatRulesAt(meta, self).safe;
      const isNew = (self?.camp || 'new') === 'new' || (target.camp || 'new') === 'new';
      const noPvp = !!meta && !combatRulesAt(meta, self ?? { x: 0, y: 0 }).pvp;
      enmityBtn.disabled = !isCancelling && (inSafe || isNew || sameTeam || noPvp);
      enmityBtn.textContent = isCancelling ? 'Hủy cừu sát' : 'Cừu sát';
      enmityBtn.classList.toggle('active', isCancelling);
      enmityBtn.title = inSafe ? 'Trong khu vực an toàn không thể cừu sát'
        : isNew ? 'Tân thủ không thể tham gia cừu sát'
        : sameTeam ? 'Không thể cừu sát đồng đội'
        : noPvp ? 'Bản đồ này không cho phép cừu sát' : '';
    }

    // 4. Theo sau
    const followBtn = $('pcm-follow') as HTMLButtonElement;
    const isFollowing = !!self?.followTarget && self.followTarget === target.id;
    followBtn.disabled = !!self?.stallTitle;
    followBtn.textContent = isFollowing ? 'Dừng theo sau' : 'Theo sau';
    followBtn.classList.toggle('active', isFollowing);
    followBtn.title = self?.stallTitle ? 'Đang bày bán không thể theo sau' : '';

    this.el.classList.remove('hidden');
    const [px, py] = localPoint(this.parent, clientX, clientY);
    const { width: hudW, height: hudH } = hudSize();
    const w = this.el.offsetWidth || 168;
    const h = this.el.offsetHeight || 150;
    const left = Math.max(6, Math.min(px + 6, hudW - w - 6));
    const top = Math.max(6, Math.min(py + 6, hudH - h - 6));
    this.el.style.left = `${Math.round(left)}px`;
    this.el.style.top = `${Math.round(top)}px`;
  }

  close(): void {
    this.target = null;
    this.el.classList.add('hidden');
  }
}
