import {
  TK_BATTLE_MAP_ID,
  TK_CAMP_NAMES,
  TK_MODE_NAMES,
  TK_SIGNUP_MAP_ID,
  tkTitleOf,
  type TkActionMsg,
  type TkCamp,
  type TkStateMsg,
} from '@vltk/shared';
import { tkState } from '../../state/tongkim';
import { mount } from '../kit/dom';
import './tongkim.css';

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function phaseLabel(phase: TkStateMsg['phase']): string {
  switch (phase) {
    case 'signup': return 'Đang báo danh';
    case 'fighting': return 'Đang giao chiến';
    case 'ended': return 'Kết thúc';
    default: return 'Chưa mở trận';
  }
}

function victoryIconSvg(): string {
  return `<svg class="tk-result-svg tk-svg-win" viewBox="0 0 96 96" aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="rgba(255, 206, 68, 0.16)" stroke="#ffd659" stroke-width="3"/>
    <path d="M22 60 L28 32 L41 45 L48 24 L55 45 L68 32 L74 60 Z" fill="#ffd659" stroke="#fff2b2" stroke-width="2" stroke-linejoin="round"/>
    <rect x="24" y="63" width="48" height="8" rx="3" fill="#e8a825"/>
    <circle cx="48" cy="21" r="4" fill="#fff2b2"/>
    <circle cx="27" cy="29" r="3.2" fill="#fff2b2"/>
    <circle cx="69" cy="29" r="3.2" fill="#fff2b2"/>
  </svg>`;
}

function defeatIconSvg(): string {
  return `<svg class="tk-result-svg tk-svg-lose" viewBox="0 0 96 96" aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="rgba(224, 72, 58, 0.16)" stroke="#e65c4f" stroke-width="3"/>
    <path d="M48 18 L72 28 V48 C72 63 61 73 48 79 C35 73 24 63 24 48 V28 Z" fill="rgba(160, 42, 34, 0.85)" stroke="#ff8a7a" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M47 22 L42 40 L53 49 L44 63 L50 76" fill="none" stroke="#1a1414" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M47 22 L42 40 L53 49 L44 63 L50 76" fill="none" stroke="#ffd2c9" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function drawIconSvg(): string {
  return `<svg class="tk-result-svg tk-svg-draw" viewBox="0 0 96 96" aria-hidden="true">
    <circle cx="48" cy="48" r="44" fill="rgba(170, 196, 224, 0.15)" stroke="#b7cbe0" stroke-width="3"/>
    <path d="M28 68 L66 30 M66 30 L56 30 M66 30 L66 40" stroke="#e4eef8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M68 68 L30 30 M30 30 L40 30 M30 30 L30 40" stroke="#e4eef8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

/**
 * Dialog thông tin Chiến trường Tống Kim (trong suốt, bật/tắt bằng phím ` hoặc nút chạm)
 * + Bảng xếp hạng Top 10 + Dialog kết thúc trận đấu thắng/thua (dùng chung Web / Desktop / Mobile).
 */
export class TongKimHud {
  private readonly toggleBtn: HTMLButtonElement;
  private readonly dialog: HTMLElement;
  private readonly boardModal: HTMLElement;
  private readonly endModal: HTMLElement;
  private mapId = 0;
  private send: ((msg: TkActionMsg) => void) | null = null;
  private panelOpen = false;
  private boardOpen = false;
  private unsub: () => void;
  private readonly onKeyDown: (e: KeyboardEvent) => void;

  constructor(parent: HTMLElement) {
    this.toggleBtn = mount(parent, '<button type="button" id="tk-toggle" class="hidden" title="Bật/tắt bảng Tống Kim (phím `)">Tống Kim (`)</button>') as HTMLButtonElement;
    this.dialog = mount(parent, '<div id="tk-hud" class="hidden"></div>');
    this.boardModal = mount(parent, '<div id="tk-board" class="hidden"></div>');
    this.endModal = mount(parent, '<div id="tk-end" class="hidden"></div>');

    this.toggleBtn.addEventListener('click', () => {
      this.panelOpen = !this.panelOpen;
      this.render();
    });
    this.dialog.addEventListener('click', e => this.onClick(e));
    this.boardModal.addEventListener('click', e => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tk-close]');
      if (btn) { this.boardOpen = false; this.boardModal.classList.add('hidden'); }
    });
    this.endModal.addEventListener('click', e => {
      const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tk-end-close]');
      if (btn && this.send) {
        this.endModal.classList.add('hidden');
        this.send({ op: 'leave' });
      }
    });

    this.onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Backquote' && e.key !== '`') return;
      if (this.mapId !== TK_SIGNUP_MAP_ID && this.mapId !== TK_BATTLE_MAP_ID) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      e.preventDefault();
      this.panelOpen = !this.panelOpen;
      this.render();
    };
    window.addEventListener('keydown', this.onKeyDown);
    this.unsub = tkState.watch(() => this.render(), false);
  }

  bind(mapId: number, send: (msg: TkActionMsg) => void): void {
    this.mapId = mapId;
    this.send = send;
    // Ở map báo danh (323) mở sẵn để dễ thao tác; ở map chiến trường (378) thu gọn, nhấn phím ` để bật/tắt.
    this.panelOpen = mapId === TK_SIGNUP_MAP_ID;
    this.boardOpen = false;
    this.boardModal.classList.add('hidden');
    this.endModal.classList.add('hidden');
    this.render();
  }

  hide(): void {
    this.mapId = 0;
    this.toggleBtn.classList.add('hidden');
    this.dialog.classList.add('hidden');
    this.boardModal.classList.add('hidden');
    this.endModal.classList.add('hidden');
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.unsub();
    this.toggleBtn.remove();
    this.dialog.remove();
    this.boardModal.remove();
    this.endModal.remove();
  }

  private onClick(e: Event): void {
    const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tk-act]');
    if (!btn || !this.send) return;
    const act = btn.dataset.tkAct;
    if (act === 'closePanel') {
      this.panelOpen = false;
      this.render();
      return;
    }
    if (act === 'board') {
      this.boardOpen = !this.boardOpen;
      this.renderBoard();
      return;
    }
    if (act === 'scout') this.send({ op: 'scout' });
    else if (act === 'exitGate') this.send({ op: 'exitGate' });
    else if (act === 'leave') this.send({ op: 'leave' });
    else if (act === 'devStart1') this.send({ op: 'devStart', mode: 1, signupSec: 20, durationSec: 300, marshalDelaySec: 45 });
    else if (act === 'devStart2') this.send({ op: 'devStart', mode: 2, signupSec: 20, durationSec: 300 });
    else if (act === 'devStop') this.send({ op: 'devStop' });
    else if (act === 'regTong') this.send({ op: 'register', camp: 'tong' });
    else if (act === 'regKim') this.send({ op: 'register', camp: 'kim' });
  }

  private render(): void {
    const activeMap = this.mapId === TK_SIGNUP_MAP_ID || this.mapId === TK_BATTLE_MAP_ID;
    const st = tkState.get();
    if (!activeMap || !st) {
      this.toggleBtn.classList.add('hidden');
      this.dialog.classList.add('hidden');
      this.boardModal.classList.add('hidden');
      this.endModal.classList.add('hidden');
      return;
    }

    const isBattle = this.mapId === TK_BATTLE_MAP_ID;
    const me = st.me;
    const rankTitle = me?.camp && me.rank ? tkTitleOf(me.camp as TkCamp, me.rank) : '';

    // Nút pill nhỏ luôn hiện ở góc để bấm chuột/chạm Mobile + hiển thị đồng hồ
    this.toggleBtn.classList.remove('hidden');
    this.toggleBtn.textContent = st.phase !== 'closed'
      ? `Tống Kim (\`) · ${fmtTime(st.remainSec)}`
      : 'Tống Kim (`)';

    if (!this.panelOpen) {
      this.dialog.classList.add('hidden');
    } else {
      this.dialog.classList.remove('hidden');

      const actions: string[] = [];
      if (st.phase !== 'closed') {
        actions.push(`<button type="button" class="tk-btn" data-tk-act="board">Top 10</button>`);
      }
      if (isBattle && st.phase === 'fighting' && me?.inCamp) {
        actions.push(`<button type="button" class="tk-btn tk-btn-go" data-tk-act="scout">Ra tiền tuyến</button>`);
        actions.push(`<button type="button" class="tk-btn" data-tk-act="exitGate">${me.gateWaitSec > 0 ? `Cổng (${me.gateWaitSec}s)` : 'Qua cổng'}</button>`);
      }
      if (isBattle) {
        actions.push(`<button type="button" class="tk-btn tk-btn-warn" data-tk-act="leave">Rời trận</button>`);
      }
      if (!isBattle && (st.phase === 'signup' || st.phase === 'fighting')) {
        actions.push(`<button type="button" class="tk-btn tk-btn-tong" data-tk-act="regTong">Vào Tống</button>`);
        actions.push(`<button type="button" class="tk-btn tk-btn-kim" data-tk-act="regKim">Vào Kim</button>`);
      }
      if (st.devTools) {
        if (st.phase === 'closed') {
          actions.push(`<button type="button" class="tk-btn tk-btn-dev" data-tk-act="devStart1">Mở Nguyên Soái (Test)</button>`);
          actions.push(`<button type="button" class="tk-btn tk-btn-dev" data-tk-act="devStart2">Mở Cừu Sát (Test)</button>`);
        } else {
          actions.push(`<button type="button" class="tk-btn tk-btn-warn" data-tk-act="devStop">Đóng trận</button>`);
        }
      }

      const meRow = isBattle && me?.camp
        ? `<div class="tk-me">
            <span class="tk-camp-${me.camp}">${rankTitle || TK_CAMP_NAMES[me.camp as TkCamp]}</span>
            <span>Điểm: <b>${me.points.toLocaleString('vi-VN')}</b></span>
            <span>Hạ/Chết: <b>${me.kills}/${me.deaths}</b></span>
            <span>Liên trảm: <b>${me.streak}</b></span>
            ${me.inCamp && st.phase === 'fighting' ? `<span class="tk-camp-warn">Doanh trại: ${me.campRemainSec}s</span>` : ''}
          </div>`
        : me
          ? `<div class="tk-me"><span>Tích lũy hiện có: <b>${me.accum.toLocaleString('vi-VN')}</b> điểm</span>${st.phase === 'closed' && st.nextSchedule ? `<span>Lịch kế tiếp: ${st.nextSchedule}</span>` : ''}</div>`
          : '';

      const marshalRow = st.mode === 1 && st.marshalSpawned && st.phase === 'fighting'
        ? `<div class="tk-marshal">Nguyên Soái: <b class="tk-camp-tong">Tống ${st.tongMarshalAlive ? 'Còn' : 'Tử'}</b> · <b class="tk-camp-kim">Kim ${st.kimMarshalAlive ? 'Còn' : 'Tử'}</b></div>`
        : '';

      this.dialog.innerHTML = `
        <div class="tk-top">
          <span class="tk-title">Tống Kim · ${st.phase === 'closed' ? phaseLabel(st.phase) : `${TK_MODE_NAMES[st.mode]} · ${phaseLabel(st.phase)}`}</span>
          <div class="tk-top-right">
            ${st.phase !== 'closed' ? `<span class="tk-clock">${fmtTime(st.remainSec)}</span>` : ''}
            <button type="button" class="tk-x" data-tk-act="closePanel" title="Ẩn (phím \`)">×</button>
          </div>
        </div>
        ${st.phase !== 'closed' ? `
        <div class="tk-scores">
          <span class="tk-camp-tong">Tống (${st.tongCount}): <b>${st.tongScore.toLocaleString('vi-VN')}</b></span>
          <span class="tk-vs">VS</span>
          <span class="tk-camp-kim">Kim (${st.kimCount}): <b>${st.kimScore.toLocaleString('vi-VN')}</b></span>
        </div>` : ''}
        ${marshalRow}
        ${meRow}
        <div class="tk-actions">${actions.join('')}</div>
      `;
    }

    if (this.boardOpen) this.renderBoard();
    this.renderEndDialog(st, isBattle);
  }

  private renderEndDialog(st: TkStateMsg, isBattle: boolean): void {
    if (!isBattle || st.phase !== 'ended') {
      this.endModal.classList.add('hidden');
      return;
    }
    this.endModal.classList.remove('hidden');
    const myCamp = st.me?.camp || '';
    const isDraw = st.winner === 'draw' || !st.winner;
    const isWin = !isDraw && !!myCamp && st.winner === myCamp;
    const winCamp = st.winner === 'tong' || st.winner === 'kim' ? st.winner : null;
    const winScore = winCamp === 'tong' ? st.tongScore : winCamp === 'kim' ? st.kimScore : Math.max(st.tongScore, st.kimScore);
    const headline = isDraw ? 'TRẬN ĐẤU HÒA' : isWin ? 'CHIẾN THẮNG!' : 'THẤT BẠI';
    const headCls = isDraw ? 'tk-res-draw' : isWin ? 'tk-res-win' : 'tk-res-lose';
    const icon = isDraw ? drawIconSvg() : isWin ? victoryIconSvg() : defeatIconSvg();
    const myRankTitle = myCamp && st.me?.rank ? tkTitleOf(myCamp as TkCamp, st.me.rank) : '';

    this.endModal.innerHTML = `
      <div class="tk-end-box">
        <div class="tk-end-icon">${icon}</div>
        <div class="tk-end-title ${headCls}">${headline}</div>
        <div class="tk-end-reason">${st.winReason || 'Chiến trường Tống Kim đã kết thúc.'}</div>
        <div class="tk-end-winscore">
          ${winCamp
            ? `Phe thắng: <b class="tk-camp-${winCamp}">${TK_CAMP_NAMES[winCamp]}</b> — Điểm phe thắng: <b>${winScore.toLocaleString('vi-VN')}</b>`
            : `Điểm hai phe bằng nhau: <b>${winScore.toLocaleString('vi-VN')}</b>`}
        </div>
        <div class="tk-end-versus">
          <span class="tk-camp-tong">Đại Tống: <b>${st.tongScore.toLocaleString('vi-VN')}</b></span>
          <span>·</span>
          <span class="tk-camp-kim">Đại Kim: <b>${st.kimScore.toLocaleString('vi-VN')}</b></span>
        </div>
        ${st.me?.camp ? `
        <div class="tk-end-me">
          <span>${myRankTitle}</span>
          <span>Điểm cá nhân: <b>${st.me.points.toLocaleString('vi-VN')}</b></span>
          <span>PK: <b>${st.me.kills}/${st.me.deaths}</b></span>
          <span>Max Liên trảm: <b>${st.me.maxStreak}</b></span>
        </div>` : ''}
        <div class="tk-end-foot">
          <button type="button" class="tk-btn tk-btn-go tk-end-close-btn" data-tk-end-close="1">Đóng (Về điểm báo danh)</button>
        </div>
      </div>
    `;
  }

  private renderBoard(): void {
    const st = tkState.get();
    if (!this.boardOpen || !st) {
      this.boardModal.classList.add('hidden');
      return;
    }
    this.boardModal.classList.remove('hidden');
    const rows = st.top10.length
      ? st.top10.map(r => `
        <tr>
          <td>#${r.rankPos}</td>
          <td class="tk-camp-${r.camp}">${r.name}</td>
          <td>${tkTitleOf(r.camp, r.rank)}</td>
          <td><b>${r.points.toLocaleString('vi-VN')}</b></td>
          <td>${r.kills}/${r.deaths}</td>
          <td>${r.npcKills}</td>
          <td>${r.maxStreak}</td>
        </tr>`).join('')
      : '<tr><td colspan="7" class="tk-empty">Chưa có chiến công nào.</td></tr>';

    this.boardModal.innerHTML = `
      <div class="tk-board-box">
        <div class="tk-board-head">
          <span>Bảng xếp hạng Chiến trường Tống Kim #${st.matchId}</span>
          <button type="button" class="tk-btn" data-tk-close="1">Đóng</button>
        </div>
        <table class="tk-table">
          <thead><tr><th>Hạng</th><th>Nhân vật</th><th>Quân hàm</th><th>Điểm</th><th>PK</th><th>NPC</th><th>Max LT</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }
}
