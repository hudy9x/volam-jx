import {
  FACTIONS, POTENTIALS, getSkill, itemNeeds, planPotential, planSkills, skillRoutes, type Potential, type SuggestMsg,
} from '@vltk/shared';
import { inventory } from '../../state/inventory';
import { itemViewer, progress } from '../../state/progress';
import { skillbar } from '../../state/skillbar';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import type { HudContext } from '../hud/context';
import './suggest.css';

const ID = 'suggest-dlg';
const NAMES: Record<Potential, string> = { str: 'Sức mạnh', dex: 'Thân pháp', vit: 'Sinh khí', eng: 'Nội công' };
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Gợi ý cộng điểm">
  <div id="sg-tabs" class="row"></div>
  <div id="sg-body"></div>
</section>`;

/**
 * Gợi ý cộng điểm (USER 2026-11-13, like jx-web-main): pick a tuyến võ công of the faction, preview where the free skill
 * points (lowest skill of the route first, within the level cap and prerequisites) or potential points (first what the
 * pieces need, then the route's ratio) would go, and apply. Plans: packages/shared/src/characters/suggest.ts; the server
 * runs the same plan.
 */
export class SuggestWindow {
  private kind: SuggestMsg['kind'] = 'skills';
  private route: string | undefined;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID);
    progress.watch(() => this.render(), false);
    skillbar.watch(() => this.render());
  }

  open(kind: SuggestMsg['kind']): void {
    this.kind = kind;
    dialogs.open(ID);
    this.render();
  }

  private render(): void {
    if ($(ID).classList.contains('hidden')) return;
    const p = progress.get();
    const faction = p?.faction ?? '';
    const body = $('sg-body');
    if (!p || !FACTIONS[faction]) {
      $('sg-tabs').replaceChildren();
      body.innerHTML = '<p class="muted">Gia nhập môn phái để xem tuyến võ công.</p>';
      return;
    }
    const levels = skillbar.levels;
    const routes = skillRoutes(faction);
    const plan = this.kind === 'skills'
      ? planSkills(faction, this.route, levels, p.progress.level, p.progress.skillPoints)
      : null;
    const viewer = itemViewer(this.ctx.self());
    const inv = inventory.get();
    const pot = this.kind === 'potential' && viewer
      ? planPotential(faction, this.route, levels, p.progress.added, { str: p.stats.str, dex: p.stats.dex },
        itemNeeds(inv.equip, inv.bag, viewer), p.progress.potentialPoints)
      : null;
    const current = plan?.route?.id ?? pot?.route?.id;
    $('sg-tabs').replaceChildren(...routes.map(r => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `btn sm${r.id === current ? ' on' : ''}`;
      b.textContent = r.name;
      b.addEventListener('click', () => { this.route = r.id; this.render(); });
      return b;
    }));
    const kinds = `<div class="row sg-kinds">
      <button type="button" class="btn sm${this.kind === 'skills' ? ' on' : ''}" data-k="skills">Điểm kỹ năng (${p.progress.skillPoints})</button>
      <button type="button" class="btn sm${this.kind === 'potential' ? ' on' : ''}" data-k="potential">Điểm tiềm năng (${p.progress.potentialPoints})</button></div>`;
    if (plan) {
      body.innerHTML = `${kinds}<p class="muted">Ưu tiên cộng tối đa kỹ năng Trấn Phái trước, sau đó đến các kỹ năng cấp 10, rồi san đều điểm cho tuyến kỹ năng hiện tại; điểm dư được giữ lại.</p>
        <table class="sg-table"><thead><tr><th>Kỹ năng</th><th>Hiện tại → Đề xuất</th></tr></thead><tbody>${plan.rows.map(r =>
        `<tr class="${r.to > r.before ? 'up' : 'same'}"><td>${getSkill(r.id)?.name ?? r.id}</td><td>${r.before} → <b>${r.to}</b>${r.to > r.before ? ` (+${r.to - r.before})` : r.reason ? ` <small class="muted">${r.reason}</small>` : ''}</td></tr>`).join('')}</tbody></table>
        <p>Cộng <b>${plan.spent}</b> điểm · còn <b>${plan.remaining}</b>.</p>
        <button type="button" class="btn" id="sg-apply" ${plan.spent ? '' : 'disabled'}>Đồng ý · ${plan.route?.name ?? ''}</button>`;
    } else if (pot) {
      const src = pot.source === 'override' ? 'Tỷ lệ riêng của tuyến' : `Tỷ lệ chung ${pot.source === 'external' ? 'ngoại công' : 'nội công'}`;
      body.innerHTML = `${kinds}<p class="muted">Trước hết đủ Sức mạnh / Thân pháp cho đồ đang mặc và đồ trong hành trang mặc được, phần còn
        lại theo tỷ lệ của tuyến (${src}). Giữ điểm đã cộng.</p>
        <table class="sg-table"><thead><tr><th>Tiềm năng</th><th>Tỷ lệ</th><th>Cộng thêm</th></tr></thead><tbody>${POTENTIALS.map(k =>
        `<tr class="${pot.add[k] ? 'up' : 'same'}"><td>${NAMES[k]}</td><td>${pot.weights[k]}%</td><td><b>+${pot.add[k]}</b>${pot.forItems[k] ? ` <small class="muted">(${pot.forItems[k]} cho trang bị)</small>` : ''}</td></tr>`).join('')}</tbody></table>
        <p>Cộng <b>${pot.spent}</b> điểm · còn <b>${pot.remaining}</b>.</p>
        <button type="button" class="btn" id="sg-apply" ${pot.spent ? '' : 'disabled'}>Đồng ý · Tiềm năng ${pot.route?.name ?? ''}</button>`;
    }
    body.querySelectorAll<HTMLElement>('.sg-kinds button').forEach(b => b.addEventListener('click', () => {
      this.kind = b.dataset.k as SuggestMsg['kind'];
      this.render();
    }));
    body.querySelector('#sg-apply')?.addEventListener('click', () => this.ctx.actions()?.suggest({ kind: this.kind, route: current }));
  }
}
