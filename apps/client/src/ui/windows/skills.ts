import {
  ELEMENT_NAMES, LEVEL, factionsFor, getPack, getSkill, isCastable, learnTiers, maxLevelOf, raiseError, skillCategory, skillExpToNext,
  practicePerHit, skillGrowth, weaponOk, type Gender, type SkillDef,
} from '@vltk/shared';
import { skillIconUrl } from '../../art/icons';
import { progress } from '../../state/progress';
import { BASIC_SKILL, skillbar } from '../../state/skillbar';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { tooltip } from '../kit/tooltip';
import type { HudContext } from '../hud/context';
import { CATEGORY_CLASS, fillSkillTip, showSkillTip } from '../tips/skillTip';
import './skills.css';
import { localPoint } from '../kit/viewport';

const ID = 'skill-panel';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Kỹ năng võ công">
  <div class="row spread sk-head"><span id="skill-points"></span><button type="button" class="btn sm" id="skill-suggest" title="Gợi ý cộng điểm kỹ năng theo tuyến võ công">Gợi ý</button><span id="skill-faction"></span></div>
  <div id="skill-join" class="hidden"></div>
  <div id="skill-grid"></div>
  <div id="skill-pop" class="hidden"></div>
  <div class="muted hint">Bấm chiêu: cộng điểm / đặt tay trái, phải. Rê chuột: mô tả. Kéo chiêu xuống ô 1–9, T hoặc P. Cấp màu xanh dương = có
    cộng thêm từ trang bị.</div>
</section>
<section id="skill-description" class="dlg hidden" data-title="Mô tả kỹ năng">
  <div class="sk-description-body"></div>
</section>`;

/** Columns of the skill window: learning level (tiers of the same level share a column). */
const COLUMN_LEVELS = [10, 20, 30, 40, 50, 60, 90, 120, 150, 180];
/** Small corner tags on skill cells. */
const TIER_TAGS: Record<string, string> = { 'Trấn phái': 'TP', 'Thất truyền': 'TT' };

/**
 * Kỹ năng võ công (F): the skills the character has (they appear at their ReqLevel; skills/core/learning.ts) by learning
 * tier, with the original icons, the full description of the selected one, the + that spends a skill point (point
 * skills) or the practice progress (thục luyện), Trái / Phải buttons. Before joining: the factions of the own hệ to join
 * at level 10. Drag a skill onto a quick bar slot. Levels, bar, weapon: state/skillbar.ts.
 */
export class SkillsWindow {
  private selected: number | null = null;
  /** The small popup under the clicked skill is open (USER 2026-11-13: no long description on click). */
  private popOpen = false;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID);
    dialogs.register('skill-description');
    $('skill-suggest').addEventListener('click', () => this.ctx.suggest?.('skills'));
    skillbar.watch(what => { if (what === 'all') this.render(); });
    // A click outside the popup and the cells closes it.
    document.addEventListener('mousedown', e => {
      const t = e.target as HTMLElement;
      if (this.popOpen && !t.closest('#skill-pop') && !t.closest('.sk-cell')) { this.popOpen = false; $('skill-pop').classList.add('hidden'); }
    });
    progress.watch(() => { if (dialogs.isOpen(ID)) this.render(); }, false);
  }

  toggle(open = !dialogs.isOpen(ID)): void {
    dialogs.toggle(ID, open);
    if (open) this.render();
    else tooltip.hide();
  }

  /** Skill points, faction line and — level 10+ without a faction — the factions of the own hệ to join. */
  private renderHead(): void {
    const p = progress.get();
    const self = this.ctx.self();
    $('skill-points').textContent = p ? `Điểm kỹ năng: ${p.progress.skillPoints}` : '';
    $('skill-faction').textContent = skillbar.faction ? '' : p ? `Hệ ${ELEMENT_NAMES[p.series]} · chưa vào môn phái` : '';
    const join = $('skill-join');
    const can = !!p && !!self && !skillbar.faction && p.progress.level >= LEVEL.factionJoin;
    join.classList.toggle('hidden', !p || !!skillbar.faction);
    if (!p || skillbar.faction || !self) return;
    const options = factionsFor(p.series, self.gender as Gender);
    join.replaceChildren(Object.assign(document.createElement('div'), {
      className: 'muted',
      textContent: can ? 'Gia nhập môn phái (chỉ chọn được một lần):' : `Đạt cấp ${LEVEL.factionJoin} để gia nhập: ${options.map(f => f.name).join(', ')}.`,
    }));
    if (!can) return;
    const row = document.createElement('div');
    row.className = 'row';
    for (const f of options) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn';
      b.textContent = f.name;
      b.addEventListener('click', () => { if (confirm(`Gia nhập ${f.name}? Không đổi được về sau.`)) this.ctx.actions()?.joinFaction(f.id); });
      row.appendChild(b);
    }
    join.appendChild(row);
  }

  private assign(slot: 'left' | 'right', id: number): void {
    const err = skillbar.assign(slot, id);
    if (err) this.ctx.notice(err);
  }

  /** One column per learning level (10 … 150), the original icons stacked in each. */
  private render(): void {
    const faction = skillbar.faction;
    const levels = skillbar.levels;
    const pack = getPack(faction);
    dialogs.setTitle(ID, `Kỹ năng võ công · ${pack?.name ?? 'Chưa vào môn phái'}`);
    this.renderHead();
    const tiers = learnTiers(faction);
    // Other tiers + the skills every faction learns (Khinh công, Vũ Lộ Xuân Phong, Kiếp Phú Tế Bần) + the basic attack.
    const other = [...tiers.filter(t => !COLUMN_LEVELS.includes(t.level)), ...learnTiers('common')]
      .flatMap(t => t.skills.map(id => ({ id, tier: t.label })));
    const columns = [
      { label: '0', ids: [...other, { id: BASIC_SKILL, tier: 'Thông dụng' }] },
      ...COLUMN_LEVELS.map(level => ({
        label: String(level),
        ids: tiers.filter(t => t.level === level).flatMap(t => t.skills.map(id => ({ id, tier: t.label }))),
      })),
    ];
    const known = (id: number) => {
      const s = getSkill(id);
      return !!s && (levels[id] !== undefined || !!s.inactive);
    };
    if (this.selected === null || !known(this.selected)) this.selected = skillbar.learnedIds().find(id => isCastable(getSkill(id)!)) ?? null;
    $('skill-grid').replaceChildren(...columns.filter(c => c.ids.some(e => known(e.id))).map(col => {
      const el = document.createElement('div');
      el.className = 'sk-col';
      const head = document.createElement('div');
      head.className = 'sk-col-head';
      head.textContent = col.label;
      el.append(head, ...col.ids.filter(e => known(e.id)).map(e => this.cell(getSkill(e.id)!, e.tier)));
      return el;
    }));
    this.renderDetail();
  }

  /** Level shown on a cell / in the popup: learned + what the worn pieces add (blue when they add). */
  private shownLevel(id: number): { total: number; base: number; bonus: number } {
    const s = getSkill(id);
    if (s?.inactive) return { total: 0, base: 0, bonus: 0 };
    const raw = skillbar.levels[id] ?? 0;
    const base = raw <= 0 && s?.pack === 'common' ? 1 : raw;
    const total = skillbar.levelOf(id);
    return { total, base, bonus: total - base };
  }

  private cell(s: SkillDef, tier: string): HTMLElement {
    const shown = this.shownLevel(s.id);
    const level = shown.base;
    const isCommon = s.pack === 'common';
    const castable = !s.inactive && isCastable(s) && (level > 0 || isCommon);
    const el = document.createElement('div');
    el.className = `sk-cell ${CATEGORY_CLASS[skillCategory(s)]}${s.id === this.selected ? ' sel' : ''}${!s.inactive && (level > 0 || isCommon) ? '' : ' unlearned'}`;
    el.classList.toggle('blocked', castable && !weaponOk(s, skillbar.weapon));
    el.draggable = castable;
    el.innerHTML = '<div class="sk-ico"><img alt="" draggable="false"/></div><div class="sk-foot"><span class="lv"></span><button type="button" class="sk-add">+</button></div>';
    const ico = el.querySelector('.sk-ico') as HTMLElement;
    const img = el.querySelector('img') as HTMLImageElement;
    if (s.icon) img.src = skillIconUrl(s); else img.remove();
    const lv = el.querySelector('.lv') as HTMLElement;
    lv.textContent = String(shown.total);
    lv.classList.toggle('boosted', shown.bonus > 0);
    if (shown.bonus > 0) lv.title = `Cấp học ${shown.base} + ${shown.bonus} từ trang bị`;
    const add = el.querySelector('.sk-add') as HTMLButtonElement;
    if (isCommon || s.inactive) {
      add.remove();
    } else {
      const p = progress.get();
      const err = p ? raiseError(s.id, skillbar.levels, p.progress.level, p.progress.skillPoints) : 'Đang tải…';
      add.classList.toggle('off', !!err);
      add.title = err ?? 'Cộng 1 điểm kỹ năng';
      add.addEventListener('mousedown', e => e.stopPropagation());
      add.addEventListener('dblclick', e => e.stopPropagation());
      add.addEventListener('click', e => {
        e.stopPropagation();
        if (err) { this.ctx.notice(err); return; }
        this.ctx.actions()?.raiseSkill(s.id);
      });
    }
    el.dataset.id = String(s.id);
    const tagText = TIER_TAGS[tier];
    if (tagText) {
      const tag = document.createElement('span');
      tag.className = `tag${tier === 'Thất truyền' ? ' lost' : ''}`;
      tag.textContent = tagText;
      tag.title = tier;
      ico.appendChild(tag);
    }
    el.addEventListener('click', () => { this.selected = s.id; this.popOpen = true; showSkillTip(null); this.render(); });
    el.addEventListener('dblclick', () => { if (castable) this.assign('left', s.id); });
    el.addEventListener('dragstart', e => e.dataTransfer?.setData('text/skill', String(s.id)));
    el.addEventListener('mouseenter', () => showSkillTip(s.id, el, tier));
    el.addEventListener('mouseleave', () => showSkillTip(null));
    return el;
  }

  /**
   * The small popup under the clicked skill: name, level (learned + equipment, blue), + (point skills) or practice progress,
   * Trái / Phải. The description is the hover tooltip only.
   */
  private renderDetail(): void {
    const box = $('skill-pop');
    const s = this.selected !== null ? getSkill(this.selected) : undefined;
    const cell = s ? document.querySelector<HTMLElement>(`#skill-grid .sk-cell[data-id="${s.id}"]`) : null;
    if (!s || !this.popOpen || !cell) { box.classList.add('hidden'); return; }
    const { total, base: level, bonus } = this.shownLevel(s.id);
    const castable = isCastable(s) && (level > 0 || s.pack === 'common');
    const p = progress.get();
    box.innerHTML = `<div class="sk-pop-name"></div>
      <div class="sk-level"><span></span><button type="button" class="btn2 sk-plus" title="Cộng 1 điểm kỹ năng">+</button></div>
      <div class="sk-grow muted"></div>
      <div class="row"><button type="button" class="btn2" data-to="left">Tay trái</button><button type="button" class="btn2" data-to="right">Tay phải</button></div>
      <button type="button" class="btn2" data-description>Mô tả</button>
      ${import.meta.env.DEV ? '<div class="row dev"><button type="button" class="btn2" data-d="-1" title="Dev: đổi cấp">−</button><button type="button" class="btn2" data-d="1" title="Dev: đổi cấp">+</button></div>' : ''}`;
    (box.querySelector('.sk-pop-name') as HTMLElement).textContent = s.name;
    box.querySelector('[data-description]')?.addEventListener('click', () => {
      tooltip.hide();
      const content = document.querySelector<HTMLElement>('#skill-description .sk-description-body')!;
      content.replaceChildren();
      fillSkillTip(content, s);
      content.scrollTop = 0;
      dialogs.setTitle('skill-description', s.name);
      dialogs.open('skill-description');
    });
    const lvEl = box.querySelector('.sk-level span') as HTMLElement;
    lvEl.innerHTML = bonus > 0
      ? `Cấp <b class="boosted">${total}</b>/${maxLevelOf(s)} <small class="muted">(${level} + ${bonus} trang bị)</small>`
      : `Cấp ${level}/${maxLevelOf(s)}`;
    const growth = skillGrowth(s);
    const plus = box.querySelector('.sk-plus') as HTMLButtonElement;
    const grow = box.querySelector('.sk-grow') as HTMLElement;
    if (s.pack === 'common') {
      plus.remove();
      grow.textContent = '';
    } else if (growth === 'points') {
      const err = p ? raiseError(s.id, skillbar.levels, p.progress.level, p.progress.skillPoints) : 'Đang tải…';
      plus.disabled = !!err;
      plus.title = err ?? 'Cộng 1 điểm kỹ năng';
      grow.textContent = err && level < maxLevelOf(s) ? err : '';
      plus.addEventListener('click', () => this.ctx.actions()?.raiseSkill(s.id));
    } else {
      plus.remove();
      const next = skillExpToNext(s, level);
      const exp = skillbar.exp[s.id] ?? 0;
      grow.textContent = `Thục luyện: ${exp}${Number.isFinite(next) ? ` / ${next}` : ''} (+${practicePerHit(s, level)} mỗi đòn trúng)`;
    }
    box.querySelectorAll<HTMLButtonElement>('.dev button').forEach(b => b.addEventListener('click', () => {
      const n = Math.max(1, Math.min(maxLevelOf(s), level + Number(b.dataset.d)));
      if (n !== level) this.ctx.actions()?.setSkillLevel(s.id, n);
    }));
    box.querySelectorAll<HTMLButtonElement>('[data-to]').forEach(b => {
      b.disabled = !castable;
      b.title = b.dataset.to === 'left' ? 'Đặt vào ô chuột trái (T)' : 'Đặt vào ô chuột phải (P)';
      b.addEventListener('click', () => { this.assign(b.dataset.to as 'left' | 'right', s.id); this.popOpen = false; box.classList.add('hidden'); });
    });
    // Under the cell, inside the window.
    const panel = $(ID), r = cell.getBoundingClientRect();
    const [x, y] = localPoint(panel, r.left, r.bottom);
    box.classList.remove('hidden');
    box.style.left = `${Math.max(4, Math.min(x - panel.clientLeft, panel.clientWidth - box.offsetWidth - 4))}px`;
    box.style.top = `${Math.min(y - panel.clientTop + 2, panel.clientHeight - box.offsetHeight - 4)}px`;
  }
}
