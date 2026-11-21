import { FACTIONS, TOKEN, factionAllowsGender, factionSuites } from '@vltk/shared';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import type { HudContext } from '../hud/context';
import './token.css';

const ID = 'token-dlg';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Lệnh bài">
  <div id="token-main" class="token-list">
    <button type="button" class="btn" data-op="level">Thăng cấp ${TOKEN.level}</button>
    <button type="button" class="btn" data-op="exp">Nhận ${TOKEN.expMin / 1e6} triệu – ${TOKEN.expMax / 1e9} tỷ kinh nghiệm</button>
    <button type="button" class="btn" data-op="skills">Học kỹ năng cấp 90 / 120 / 150 (cấp tối đa)</button>
    <button type="button" class="btn" data-op="money">Nhận ${TOKEN.money / 10_000} vạn lượng</button>
    <button type="button" class="btn" data-op="tkAccum">Nhận ${TOKEN.tkAccum.toLocaleString('vi-VN')} điểm tích lũy</button>
    <button type="button" class="btn" data-op="gold">Nhận bộ hoàng kim môn phái…</button>
    <button type="button" class="btn" data-op="faction">Đổi môn phái…</button>
    <button type="button" class="btn" data-op="graduate">Xuất sư / Về trận doanh phái (màu đỏ ↔ màu phái)</button>
    <button type="button" class="btn" data-op="forge">Nhận đồ xanh (mở Chế tạo, miễn phí, ở mọi nơi)</button>
    <button type="button" class="btn" data-op="ring">Nhận Càn Khôn Giới Chỉ (kích hoạt toàn bộ thuộc tính ẩn)</button>
    <button type="button" class="btn" data-op="gender">Đổi giới tính</button>
    <button type="button" class="btn" data-op="washPotential">Tẩy tủy: trả lại toàn bộ điểm tiềm năng</button>
    <button type="button" class="btn" data-op="washSkills">Tẩy tủy: trả lại toàn bộ điểm kỹ năng</button>
    <p class="muted">Đổi phái / giới tính: điểm tiềm năng và điểm kỹ năng trả về mặc định, giữ nguyên trang bị và cấp. Tẩy tủy: trả lại điểm để
      cộng lại (nút Gợi ý ở Trang bị (C) / Kỹ năng).</p>
  </div>
  <div id="token-sub" class="token-list hidden">
    <div id="token-sub-title" class="muted"></div>
    <div id="token-sub-list" class="token-list"></div>
    <button type="button" class="btn sm" id="token-back">← Quay lại</button>
  </div>
</section>`;

/**
 * Lệnh bài menu (USER 2026-11-12; packages/shared/src/items/token.ts): opened from the bag piece (click / right click);
 * every option is checked and carried out by the server (apps/server/src/world/token.ts).
 */
export class TokenWindow {
  /** "Nhận đồ xanh": opens the Thợ rèn forge in lệnh bài mode (set by the Hud). */
  onForge: (() => void) | null = null;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID, { onClose: () => this.back() });
    $('token-main').querySelectorAll<HTMLButtonElement>('button[data-op]').forEach(b => b.addEventListener('click', () => {
      const op = b.dataset.op!;
      if (op === 'forge') { dialogs.close(ID); this.onForge?.(); } else if (op === 'gold') this.suites();
      else if (op === 'faction') this.factions();
      else if (op === 'gender') { if (confirm('Đổi giới tính? Điểm tiềm năng và kỹ năng sẽ trả về mặc định.')) this.send({ op: 'gender' }); }
      else if (op === 'washPotential' || op === 'washSkills') {
        if (confirm(op === 'washPotential' ? 'Tẩy tủy toàn bộ điểm tiềm năng?' : 'Tẩy tủy toàn bộ điểm kỹ năng (chiêu luyện / bí kíp giữ nguyên)?')) this.send({ op });
      } else this.send({ op: op as 'level' | 'exp' | 'skills' | 'money' | 'ring' | 'graduate' | 'tkAccum' });
    }));
    $('token-back').addEventListener('click', () => this.back());
  }

  open(): void {
    this.back();
    dialogs.open(ID);
  }

  private send(msg: Parameters<NonNullable<ReturnType<HudContext['actions']>>['token']>[0]): void {
    this.ctx.actions()?.token(msg);
  }

  private back(): void {
    $('token-main').classList.remove('hidden');
    $('token-sub').classList.add('hidden');
  }

  private sub(title: string, items: { label: string; pick: () => void }[]): void {
    $('token-sub-title').textContent = title;
    $('token-sub-list').replaceChildren(...items.map(it => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = it.label;
      b.addEventListener('click', it.pick);
      return b;
    }));
    $('token-main').classList.add('hidden');
    $('token-sub').classList.remove('hidden');
  }

  private suites(): void {
    const faction = this.ctx.self()?.faction ?? '';
    if (!faction) { this.ctx.notice('Phải gia nhập môn phái trước.'); return; }
    this.sub(`Chọn bộ hoàng kim ${FACTIONS[faction]?.name ?? ''} (vào hành trang):`, factionSuites(faction).map(s => ({
      label: `${s.name} — ${s.pieces.map(p => p.name.replace(s.name, '').trim()).join(', ')}`,
      pick: () => this.send({ op: 'gold', suite: s.suite }),
    })));
  }

  private factions(): void {
    const self = this.ctx.self();
    const gender = self?.gender === 'female' ? 'female' : 'male';
    this.sub('Chọn môn phái mới (điểm tiềm năng / kỹ năng trả về mặc định):', Object.values(FACTIONS)
      .filter(f => f.id !== self?.faction && factionAllowsGender(f.id, gender))
      .map(f => ({ label: f.name, pick: () => { if (confirm(`Chuyển sang ${f.name}?`)) { this.send({ op: 'faction', faction: f.id }); this.back(); } } })));
  }
}
