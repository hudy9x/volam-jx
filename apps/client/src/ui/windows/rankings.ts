import { FACTIONS, expToNext, moneyText, type RankingKind } from '@vltk/shared';
import { Api } from '../../net/api';
import { dialogs } from '../kit/dialog';
import { mount } from '../kit/dom';
import type { HudContext } from '../hud/context';
import './rankings.css';

const ID = 'rankings-dlg';
export class RankingsWindow {
  private el: HTMLElement;
  private kind: RankingKind = 'level';
  private request = 0;
  private timer = 0;
  constructor(parent: HTMLElement, private ctx: HudContext) {
    this.el = mount(parent, `<section id="${ID}" class="dlg hidden" data-title="Bảng xếp hạng">
      <div class="ranking-tabs" role="tablist" aria-label="Loại xếp hạng">
        <button type="button" class="btn" role="tab" id="ranking-level" aria-controls="ranking-panel" data-kind="level">Cấp độ</button>
        <button type="button" class="btn" role="tab" id="ranking-wealth" aria-controls="ranking-panel" data-kind="wealth">Tài phú</button>
      </div>
      <label class="ranking-filter">Môn phái <select aria-label="Lọc môn phái"><option value="">Tất cả</option></select></label>
      <p class="muted ranking-rule"></p>
      <div id="ranking-panel" role="tabpanel"><div class="ranking-scroll"><table><thead><tr><th>Hạng</th><th>Nhân vật</th><th>Môn phái</th><th class="ranking-value"></th></tr></thead><tbody></tbody></table></div></div>
      <p class="ranking-status muted" role="status" aria-live="polite"></p>
    </section>`);
    const filter = this.el.querySelector('select')!;
    for (const f of Object.values(FACTIONS)) filter.add(new Option(f.name, f.id));
    filter.addEventListener('change', () => void this.load());
    const tabs = [...this.el.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => { this.kind = tab.dataset.kind as RankingKind; void this.load(); });
      tab.addEventListener('keydown', e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); const next = e.key === 'Home' ? 0 : e.key === 'End' ? 1 : 1 - i;
        tabs[next].focus(); tabs[next].click();
      });
    });
    dialogs.register(ID, { onOpen: () => {
      void this.load(); this.timer = window.setInterval(() => void this.load(), 60_000);
    }, onClose: () => { clearInterval(this.timer); this.request++; } });
  }
  toggle(open?: boolean): void { dialogs.toggle(ID, open); }
  private async load(): Promise<void> {
    const request = ++this.request;
    const kind = this.kind;
    const body = this.el.querySelector('tbody')!;
    const status = this.el.querySelector<HTMLElement>('.ranking-status')!;
    this.el.querySelectorAll<HTMLButtonElement>('[role="tab"]').forEach(tab => {
      const active = tab.dataset.kind === kind;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      tab.classList.toggle('on', active);
    });
    this.el.querySelector('[role="tabpanel"]')!.setAttribute('aria-labelledby', `ranking-${kind}`);
    this.el.querySelector('.ranking-value')!.textContent = kind === 'level' ? 'Cấp · Kinh nghiệm' : 'Ngân lượng';
    this.el.querySelector('.ranking-rule')!.textContent = kind === 'level'
      ? 'Top 100 toàn máy chủ · Cùng cấp xét kinh nghiệm.'
      : 'Top 100 toàn máy chủ · Ngân lượng trong túi, không gồm rương tài khoản.';
    body.replaceChildren(); status.textContent = 'Đang tải bảng xếp hạng…';
    this.el.querySelector('[role="tabpanel"]')!.setAttribute('aria-busy', 'true');
    try {
      const result = await Api.rankings(kind, this.el.querySelector('select')!.value);
      if (request !== this.request) return;
      result.rows.forEach((r, i) => {
        const row = document.createElement('tr');
        row.classList.toggle('ranking-self', r.name === this.ctx.self()?.name);
        const next = expToNext(r.level);
        const percent = Number.isFinite(next) && next > 0 ? Math.min(100, r.exp / next * 100).toFixed(1) + '%' : 'Tối đa';
        for (const value of [String(i + 1), r.name, FACTIONS[r.faction]?.name ?? 'Chưa nhập phái',
          kind === 'level' ? `${r.level} · ${percent}` : moneyText(r.money)]) {
          const cell = document.createElement('td'); cell.textContent = value; row.append(cell);
        }
        body.append(row);
      });
      status.textContent = result.rows.length
        ? `Cập nhật ${new Date(result.updatedAt).toLocaleTimeString('vi-VN')} · Mỗi 60 giây · Gồm cả nhân vật offline.`
        : 'Chưa có nhân vật trong bảng xếp hạng này.';
    } catch (error) {
      if (request === this.request) status.textContent = error instanceof Error ? error.message : 'Không tải được bảng xếp hạng.';
    } finally {
      if (request === this.request) this.el.querySelector('[role="tabpanel"]')!.setAttribute('aria-busy', 'false');
    }
  }
}
