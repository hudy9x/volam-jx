import {
  MAPS,
  TK_BATTLE_MAP_ID,
  TK_CAMP_NAMES,
  TK_MODE_NAMES,
  TK_SIGNUP_MAP_ID,
  isTkBattleMap,
  tkBattleMapOptions,
  tkTitleOf,
  type TkActionMsg,
  type TkCamp,
  type TkStateMsg,
} from '@vltk/shared';
import { assetUrl } from '../../art/assets';
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
  private readonly boardModal: HTMLElement;
  private readonly endModal: HTMLElement;
  private mapId = 0;
  private selectedBattleMapId = TK_BATTLE_MAP_ID;
  private send: ((msg: TkActionMsg) => void) | null = null;
  private panelOpen = false;
  private lastBoardHtml = '';
  private unsub: () => void;
  private readonly onKeyDown: (e: KeyboardEvent) => void;

  constructor(parent: HTMLElement) {
    this.toggleBtn = mount(parent, '<button type="button" id="tk-toggle" class="hidden" title="Bật/tắt bảng Tống Kim (phím `)">Tống Kim (`)</button>') as HTMLButtonElement;
    this.boardModal = mount(parent, '<div id="tk-board" class="hidden"></div>');
    this.endModal = mount(parent, '<div id="tk-end" class="hidden"></div>');

    this.toggleBtn.addEventListener('click', () => {
      this.panelOpen = !this.panelOpen;
      this.render();
    });
    this.boardModal.addEventListener('click', e => {
      const target = e.target as HTMLElement | null;
      if (target === this.boardModal || target?.closest('[data-tk-close]')) {
        this.panelOpen = false;
        this.render();
        return;
      }
      this.onClick(e);
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
      if (this.mapId !== TK_SIGNUP_MAP_ID && !isTkBattleMap(this.mapId) && this.mapId !== tkState.get()?.battleMapId) return;
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
    // Mặc định luôn thu gọn khi vào map báo danh (323) hoặc chiến trường; nhấn phím ` hoặc nút Tống Kim để mở.
    this.panelOpen = false;
    this.lastBoardHtml = '';
    this.boardModal.classList.add('hidden');
    this.endModal.classList.add('hidden');
    this.render();
  }

  hide(): void {
    this.mapId = 0;
    this.toggleBtn.classList.add('hidden');
    this.boardModal.classList.add('hidden');
    this.endModal.classList.add('hidden');
  }

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.unsub();
    this.toggleBtn.remove();
    this.boardModal.remove();
    this.endModal.remove();
  }

  private onClick(e: Event): void {
    const mapBtn = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tk-map]');
    if (mapBtn) {
      const id = Number(mapBtn.dataset.tkMap);
      if (Number.isInteger(id) && id > 0) {
        this.selectedBattleMapId = id;
        this.render();
      }
      return;
    }
    const btn = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-tk-act]');
    if (!btn || !this.send) return;
    const act = btn.dataset.tkAct;
    if (act === 'scout') this.send({ op: 'scout' });
    else if (act === 'exitGate') this.send({ op: 'exitGate' });
    else if (act === 'leave') this.send({ op: 'leave' });
    else if (act === 'devStart1') this.send({ op: 'devStart', mode: 1, battleMapId: this.selectedBattleMapId, signupSec: 20, durationSec: 600, marshalDelaySec: 45 });
    else if (act === 'devStart2') this.send({ op: 'devStart', mode: 2, battleMapId: this.selectedBattleMapId, signupSec: 20, durationSec: 600 });
    else if (act === 'devStart3') this.send({ op: 'devStart', mode: 3, battleMapId: this.selectedBattleMapId, signupSec: 20, durationSec: 900 });
    else if (act === 'devStop') this.send({ op: 'devStop' });
    else if (act === 'devStealth') this.send({ op: 'devStealth' });
    else if (act === 'regTong') this.send({ op: 'register', camp: 'tong' });
    else if (act === 'regKim') this.send({ op: 'register', camp: 'kim' });
  }

  private render(): void {
    const st = tkState.get();
    const isBattle = this.mapId !== TK_SIGNUP_MAP_ID && (this.mapId === st?.battleMapId || isTkBattleMap(this.mapId));
    const activeMap = this.mapId === TK_SIGNUP_MAP_ID || isBattle;
    if (!activeMap || !st) {
      this.toggleBtn.classList.add('hidden');
      this.boardModal.classList.add('hidden');
      this.endModal.classList.add('hidden');
      return;
    }

    const me = st.me;
    const rankTitle = me?.camp && me.rank ? tkTitleOf(me.camp as TkCamp, me.rank) : '';

    // Nút pill nhỏ luôn hiện ở góc để bấm chuột/chạm Mobile + hiển thị đồng hồ
    this.toggleBtn.classList.remove('hidden');
    this.toggleBtn.textContent = st.phase !== 'closed'
      ? `Tống Kim (\`) · ${fmtTime(st.remainSec)}`
      : 'Tống Kim (`)';

    if (!this.panelOpen) {
      this.boardModal.classList.add('hidden');
    } else {
      this.boardModal.classList.remove('hidden');

      const actions: string[] = [];
      if (isBattle && st.phase === 'fighting' && me?.inCamp) {
        actions.push(`<button type="button" class="btn sm" data-tk-act="scout">Ra tiền tuyến</button>`);
        actions.push(`<button type="button" class="btn2" data-tk-act="exitGate">${me.gateWaitSec > 0 ? `Cổng (${me.gateWaitSec}s)` : 'Qua cổng'}</button>`);
      }
      if (isBattle) {
        actions.push(`<button type="button" class="btn2 tk-btn-danger" data-tk-act="leave">Rời trận</button>`);
      }
      if (!isBattle && (st.phase === 'signup' || st.phase === 'fighting')) {
        actions.push(`<button type="button" class="btn sm" data-tk-act="regTong">Vào Tống</button>`);
        actions.push(`<button type="button" class="btn sm" data-tk-act="regKim">Vào Kim</button>`);
      }
      let mapPickerHtml = '';
      if (st.devTools) {
        if (st.phase === 'closed') {
          const mapChoices = st.availableMaps?.length ? st.availableMaps : tkBattleMapOptions();
          if (mapChoices.length && !mapChoices.some(m => m.id === this.selectedBattleMapId)) {
            this.selectedBattleMapId = mapChoices.some(m => m.id === st.battleMapId) ? st.battleMapId : mapChoices[0].id;
          }
          if (mapChoices.length) {
            const cardsHtml = mapChoices.map(m => {
              const base = MAPS[m.id]?.assets ?? `assets/maps/${m.id}`;
              const thumb = assetUrl(`${base}/thumb.webp`);
              const mini = assetUrl(`${base}/minimap.webp`);
              const sel = m.id === this.selectedBattleMapId ? ' selected' : '';
              return `<button type="button" class="tk-map-card${sel}" data-tk-map="${m.id}" aria-pressed="${m.id === this.selectedBattleMapId}">
                <img src="${thumb}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${mini}'">
                <span class="tk-map-card-name"><b>${m.id}</b> · ${m.name}</span>
              </button>`;
            }).join('');
            mapPickerHtml = `<div class="tk-map-grid" role="group" aria-label="Chọn chiến trường Tống Kim">${cardsHtml}</div>`;
          }
          actions.push(`<button type="button" class="btn sm" data-tk-act="devStart1">Mở Nguyên Soái (Test)</button>`);
          actions.push(`<button type="button" class="btn sm" data-tk-act="devStart2">Mở Cừu Sát (Test)</button>`);
          actions.push(`<button type="button" class="btn sm" data-tk-act="devStart3">Mở Phá Trụ (Test)</button>`);
        } else {
          actions.push(`<button type="button" class="btn2 tk-btn-danger" data-tk-act="devStop">Đóng trận</button>`);
        }
        const stealthOn = !!me?.stealth;
        actions.push(`<button type="button" class="${stealthOn ? 'btn sm' : 'btn2'}" data-tk-act="devStealth" aria-pressed="${stealthOn}">${stealthOn ? 'Tàng hình: Đang bật' : 'Tàng hình: Tắt'}</button>`);
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

      let marshalRow = st.mode === 1 && st.marshalSpawned && st.phase === 'fighting'
        ? `<div class="tk-marshal">Nguyên Soái: <b class="tk-camp-tong">Tống ${st.tongMarshalAlive ? 'Còn' : 'Tử'}</b> · <b class="tk-camp-kim">Kim ${st.kimMarshalAlive ? 'Còn' : 'Tử'}</b></div>`
        : '';
      if (st.mode === 3 && st.phase === 'fighting' && st.towers?.length) {
        const tongAlive = st.towers.filter(t => t.camp === 'tong' && t.alive).length;
        const kimAlive = st.towers.filter(t => t.camp === 'kim' && t.alive).length;
        const tNex = st.towers.find(t => t.camp === 'tong' && t.tier === 'nexus');
        const kNex = st.towers.find(t => t.camp === 'kim' && t.tier === 'nexus');
        const tPct = tNex ? Math.ceil((tNex.hp / Math.max(1, tNex.maxHp)) * 100) : 0;
        const kPct = kNex ? Math.ceil((kNex.hp / Math.max(1, kNex.maxHp)) * 100) : 0;
        marshalRow = `<div class="tk-marshal">Trụ còn: <b class="tk-camp-tong">Tống ${tongAlive}/6 (${tPct}%)</b> · <b class="tk-camp-kim">Kim ${kimAlive}/6 (${kPct}%)</b></div>`;
      }

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

      const boardSection = st.phase !== 'closed'
        ? `<div class="tk-board-rank">
            <div class="tk-board-subhead">Bảng xếp hạng Chiến trường Tống Kim #${st.matchId}</div>
            <table class="tk-table">
              <thead><tr><th>Hạng</th><th>Nhân vật</th><th>Quân hàm</th><th>Điểm</th><th>PK</th><th>NPC</th><th>Max LT</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
        : '';

      const titleText = st.phase === 'closed'
        ? `Tống Kim · ${phaseLabel(st.phase)}`
        : `Tống Kim · ${TK_MODE_NAMES[st.mode]} · ${phaseLabel(st.phase)} (${fmtTime(st.remainSec)})`;

      const nextHtml = `
        <div class="dlg tk-board-box">
          <div class="dlg-head">
            <span class="coin"></span>
            <h3 class="dlg-title">${titleText}</h3>
            <span class="coin"></span>
            <button type="button" class="dlg-x" data-tk-close="1" title="Đóng (phím \`)"></button>
          </div>
          <div class="dlg-body">
            <div class="tk-board-summary">
              ${st.phase !== 'closed' ? `
              <div class="tk-scores">
                <span class="tk-camp-tong">Tống (${st.tongCount}): <b>${st.tongScore.toLocaleString('vi-VN')}</b></span>
                <span class="tk-vs">VS</span>
                <span class="tk-camp-kim">Kim (${st.kimCount}): <b>${st.kimScore.toLocaleString('vi-VN')}</b></span>
              </div>` : ''}
              ${marshalRow}
              ${meRow}
              ${mapPickerHtml}
              ${actions.length ? `<div class="tk-actions">${actions.join('')}</div>` : ''}
            </div>
            ${boardSection}
          </div>
        </div>
      `;
      if (nextHtml !== this.lastBoardHtml) {
        this.lastBoardHtml = nextHtml;
        this.boardModal.innerHTML = nextHtml;
      }
    }

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
    const icon = isDraw
      ? drawIconSvg()
      : `<img class="tk-end-badge" src="${isWin ? '/assets/ui/tk-win-badge.webp' : '/assets/ui/tk-lose-badge.webp'}" alt="${headline}">`;
    const myRankTitle = myCamp && st.me?.rank ? tkTitleOf(myCamp as TkCamp, st.me.rank) : '';

    this.endModal.innerHTML = `
      <div class="jade tk-end-box">
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
          <button type="button" class="btn coins" data-tk-end-close="1">Đóng (Về điểm báo danh)</button>
        </div>
      </div>
    `;
  }
}
