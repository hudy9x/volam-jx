import { HORSES, ITEMS, PK_MODE_NAMES, getSkill, weaponOk } from '@vltk/shared';
import { itemIconUrl, skillIconUrl } from '../../art/icons';
import { keyLabel } from '../../input/keymap';
import { bagCount, inventory } from '../../state/inventory';
import { skillbar, type BarSlot } from '../../state/skillbar';
import { $, mount } from '../kit/dom';
import { showItemTip } from '../tips/itemTip';
import { showSkillTip } from '../tips/skillTip';
import './quickbar.css';

/** Width of the original quick bar art; narrower windows scale the whole bar down. */
const QUICKBAR_W = 800;

const slot = (n: number, left: number) =>
  `<div class="sk-slot key" data-slot="${n}" style="left:${left}px"><img alt="" class="hidden" /><div class="cd"></div><span class="qty"></span><b class="key-no">${n + 1}</b></div>`;

// Positions match the original 800x92 art (assets/ui/quickbar.webp).
const HTML = `
<div id="quickbar">
  ${[15, 53, 91, 129, 167, 205, 243, 281, 319].map((left, i) => slot(i, left)).join('\n  ')}
  <div class="sk-slot mouse" data-slot="left" style="left:371px" title="Chuột trái"><img alt="" class="hidden" /><div class="cd"></div></div>
  <div class="sk-slot mouse" data-slot="right" style="left:409px" title="Chuột phải"><img alt="" class="hidden" /><div class="cd"></div></div>
  <button class="fn b-char" id="char-open" style="left:460px" title="Trang bị và Thuộc tính (${keyLabel('char')})"><kbd class="fn-key">${keyLabel('char')}</kbd></button>
  <button class="fn b-bag" id="bag-open" style="left:491px" title="Hành trang (${keyLabel('bag')})"><kbd class="fn-key">${keyLabel('bag')}</kbd></button>
  <button class="fn b-skill" id="skill-open" style="left:522px" title="Kỹ năng (${keyLabel('skills')})"><kbd class="fn-key">${keyLabel('skills')}</kbd></button>
  <button class="fn b-horse" id="horse-open" style="left:553px" title="Lên / xuống ngựa (${keyLabel('mount')})"><kbd class="fn-key">${keyLabel('mount')}</kbd></button>
  <button class="fn b-pk" id="pk-toggle" style="left:584px" title="Chế độ PK (${keyLabel('pk')})"><kbd class="fn-key">${keyLabel('pk')}</kbd></button>
  <button class="fn b-trade" id="shop-open" style="left:615px" title="Thợ rèn: trang bị cấp 1–10 (giao dịch trong thành) (${keyLabel('shop')})"><kbd class="fn-key">${keyLabel('shop')}</kbd></button>
  <button class="fn b-team" id="team-open" style="left:677px" title="Tổ đội (${keyLabel('team')})"><kbd class="fn-key">${keyLabel('team')}</kbd></button>
  <button class="fn b-kytran" id="kytran-open" style="left:722px" title="Kỳ Trân Các: bí kíp kỹ năng (${keyLabel('kytran')})"><kbd class="fn-key">${keyLabel('kytran')}</kbd></button>
  <button class="fn b-auto" id="auto-toggle" style="left:646px" title="Mở cài đặt Auto (${keyLabel('auto')})">AUTO<kbd class="fn-key">${keyLabel('auto')}</kbd></button>
  <button class="fn b-system" id="menu-open" style="left:739px" title="Hệ thống (${keyLabel('system')})"><kbd class="fn-key">${keyLabel('system')}</kbd></button>
</div>`;

export interface QuickbarHandlers {
  bag(): void;
  /** Trang bị và Thuộc tính. */
  character(): void;
  /** Start / stop tự động đánh. */
  auto(): void;
  /** Tự động đánh options window. */
  autoOptions(): void;
  /** Open (true) or toggle (undefined) the skill window. */
  skills(open?: boolean): void;
  mount(): void;
  pk(): void;
  shop(): void;
  system(): void;
  /** Kỳ Trân Các shop (bí kíp). */
  kytran(): void;
  /** Tổ đội window. */
  team(): void;
  notice(text: string): void;
  /** Use the first bag piece of an item row (an item on keys 1–9). */
  useItem(defId: string): void;
}

/**
 * The original quick bar at the bottom: skills on keys 1–9 and the two mouse buttons (state/skillbar.ts; drop a skill
 * from the skill window onto a slot, right click a key slot to clear it), usable items on keys 1–9 (dropped from the
 * bag; the number = pieces left in the bag), cooldowns, and the function buttons.
 */
export class Quickbar {
  private readonly el: HTMLElement;
  private readonly slots: HTMLElement[];

  constructor(parent: HTMLElement, h: QuickbarHandlers) {
    this.el = mount(parent, HTML);
    this.slots = [...this.el.querySelectorAll<HTMLElement>('.sk-slot')];
    for (const el of this.slots) {
      const slot = slotOf(el);
      el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', e => {
        e.preventDefault();
        el.classList.remove('drop');
        const item = e.dataTransfer?.getData('text/item');
        if (item) { const err = skillbar.assignItem(slot, item); if (err) h.notice(err); return; }
        const id = Number(e.dataTransfer?.getData('text/skill'));
        if (id) { const err = skillbar.assign(slot, id); if (err) h.notice(err); }
      });
      el.addEventListener('contextmenu', e => { e.preventDefault(); if (typeof slot === 'number') skillbar.assign(slot, null); });
      el.addEventListener('click', () => {
        const item = skillbar.itemAt(slot);
        if (item) h.useItem(item);
        else h.skills(true);
      });
      el.addEventListener('mouseenter', () => {
        const item = skillbar.itemAt(slot);
        if (item) showItemTip(ITEMS[item], el, { hint: `Còn ${bagCount(item)} trong hành trang` });
        else showSkillTip(skillbar.skillAt(slot), el);
      });
      el.addEventListener('mouseleave', () => showSkillTip(null));
    }
    inventory.watch(() => this.render(), false);
    $('bag-open').addEventListener('click', () => h.bag());
    $('char-open').addEventListener('click', () => h.character());
    $('skill-open').addEventListener('click', () => h.skills());
    $('horse-open').addEventListener('click', () => h.mount());
    $('pk-toggle').addEventListener('click', () => h.pk());
    $('shop-open').addEventListener('click', () => h.shop());
    $('menu-open').addEventListener('click', () => h.system());
    $('kytran-open').addEventListener('click', () => h.kytran());
    $('team-open').addEventListener('click', () => h.team());
    $('auto-toggle').addEventListener('click', () => h.auto());
    $('auto-toggle').addEventListener('contextmenu', e => { e.preventDefault(); h.autoOptions(); });
    skillbar.watch(() => this.render());
    const fit = () => document.documentElement.style.setProperty('--qb', String(Math.min(1, (window.innerWidth - 8) / QUICKBAR_W)));
    window.addEventListener('resize', fit);
    fit();
  }

  /** Icons of the slots (greyed when the worn weapon can't use the skill / no piece of the item is left). */
  render(): void {
    for (const el of this.slots) {
      const slot = slotOf(el);
      const itemId = skillbar.itemAt(slot);
      const def = itemId ? ITEMS[itemId] : undefined;
      const id = def ? null : skillbar.skillAt(slot);
      const s = id !== null ? getSkill(id) : undefined;
      const img = el.querySelector('img') as HTMLImageElement;
      const url = def ? itemIconUrl(def) : skillIconUrl(s);
      if (img.getAttribute('src') !== url) { if (url) img.src = url; else img.removeAttribute('src'); }
      img.classList.toggle('hidden', !url);
      const count = def ? bagCount(def.id) : 0;
      const qty = el.querySelector('.qty') as HTMLElement | null;
      if (qty) qty.textContent = def ? String(count) : '';
      el.classList.toggle('filled', !!s || !!def);
      el.classList.toggle('item', !!def);
      el.classList.toggle('blocked', def ? count === 0 : !!s && !weaponOk(s, skillbar.weapon));
    }
  }

  /** Every frame: cooldown shades. */
  update(): void {
    const now = performance.now();
    for (const el of this.slots) {
      (el.querySelector('.cd') as HTMLElement).style.transform = `scaleY(${skillbar.cooldownLeft(slotOf(el), now)})`;
    }
  }

  /** PK mode on the button: 0 Luyện công (off), 1 Chiến đấu (lit), 2 Đồ sát (lit red). */
  setPk(mode: number): void {
    const btn = $('pk-toggle');
    btn.classList.toggle('on', mode > 0);
    btn.classList.toggle('slaughter', mode === 2);
    btn.title = `PK: ${PK_MODE_NAMES[mode] ?? PK_MODE_NAMES[0]} — bấm / ${keyLabel('pk')} để đổi (Luyện công → Chiến đấu → Đồ sát)`;
  }

  /** PK greyed out on maps without PK. */
  /** Tự động đánh button lit while auto-fight runs. */
  setAuto(on: boolean): void {
    $('auto-toggle').classList.toggle('on', on);
  }

  setPkAllowed(pvp: boolean): void {
    $('pk-toggle').classList.toggle('off-map', !pvp);
  }

  setHorse(horseId: string, mounted: boolean): void {
    const horse = HORSES[horseId];
    const btn = $('horse-open');
    btn.classList.toggle('on', mounted);
    btn.title = horse ? `${horse.name}: ${mounted ? 'xuống ngựa' : 'lên ngựa'} (${keyLabel('mount')})` : `Chưa có ngựa (${keyLabel('mount')})`;
  }
}

function slotOf(el: HTMLElement): BarSlot {
  const s = el.dataset.slot!;
  return s === 'left' || s === 'right' ? s : Number(s);
}
