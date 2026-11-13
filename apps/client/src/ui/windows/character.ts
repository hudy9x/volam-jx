import { PK_MODE_NAMES,
  ELEMENT_NAMES, SLOT_NAMES, wornActiveCount, attrOf, getSkill, itemDef, moveFactor, portraitFaction, speedPoints, seriesOf, skillDamage,
  type EquipSlot, type Gender, type InventoryMsg, type Item,
} from '@vltk/shared';
import { itemViewer, ownSeries, progress } from '../../state/progress';
import { BASIC_SKILL, skillbar } from '../../state/skillbar';
import type { ActorState } from '../../state/actor';
import { inventory } from '../../state/inventory';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { setSlotIcon } from '../kit/slot';
import type { HudContext } from '../hud/context';
import { showItemTip } from '../tips/itemTip';
import './character.css';
import { assetUrl } from '../../art/assets';

const ID = 'char-panel';

/**
 * Worn slots where the original equipment page puts them (ui3/玩家装备与人物状态_装备.ini: Left, Top, Width, Height), with
 * the three columns pulled closer together like the merged SHXT window (Left 46 → 8, 119 → 48, 217 → 110; Top − 20).
 */
const SLOT_BOXES: [EquipSlot, number, number, number, number][] = [
  ['mask', 8, 31, 28, 28], ['helm', 48, 29, 54, 54], ['amulet', 110, 62, 54, 27],
  ['cuff', 8, 75, 28, 54], ['armor', 48, 91, 54, 80], ['weapon', 110, 102, 54, 106],
  ['ring1', 8, 133, 27, 27], ['ring2', 8, 163, 27, 27], ['belt', 48, 178, 54, 28],
  ['pendant', 8, 196, 28, 54], ['boot', 110, 219, 54, 54], ['horse', 48, 221, 54, 80],
  ['mantle', 8, 285, 27, 27], ['signet', 110, 285, 27, 27], ['ornament', 144, 285, 27, 27],
];

/** One "label value" cell; `id` = the value element. */
const cell = (label: string, id: string, cls = '') => `<span class="ca-l">${label}</span><span class="ca-v ${cls}" id="${id}"></span>`;
const plus = (id: string) => `<button type="button" class="ca-plus" id="${id}" disabled title="Cộng 1 điểm tiềm năng (Shift: 10)">+</button>`;

const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Trang bị và Thuộc tính">
  <div class="char-body">
    <div class="char-attr">
      <div class="ca-grid ca-top">
        ${cell('Tên', 'ca-name', 'ca-name')}
        ${cell('Xưng hiệu', 'ca-title', 'ca-title')}
      </div>
      <div class="ca-grid ca-pair">
        ${cell('Phúc duyên', 'ca-luck', 'green')}${cell('Danh vọng', 'ca-fame', 'green')}
        ${cell('Đẳng cấp', 'ca-level', 'green')}${cell('Xếp hạng', 'ca-rank', 'green')}
      </div>
      <div class="ca-mid">
        <img class="ca-face" id="ca-face" alt="" />
        <div class="ca-grid ca-vit">
          ${cell('Sinh lực', 'ca-hp', 'green')}${cell('Nội lực', 'ca-mp', 'green')}
          ${cell('Thể lực', 'ca-sta', 'green')}${cell('Thuộc tính', 'ca-series', 'green')}
        </div>
      </div>
      <div class="ca-grid ca-top">${cell('Kinh nghiệm', 'ca-exp')}</div>
      <div class="row ca-suggest"><button type="button" class="btn sm" id="ca-suggest" title="Gợi ý cộng điểm tiềm năng theo tuyến võ công">Gợi ý</button></div>
      <div class="ca-grid ca-points">
        ${cell('Sức mạnh', 'ca-str')}${plus('ca-add-str')}${cell('Thân pháp', 'ca-dex')}${plus('ca-add-dex')}
        ${cell('Sinh khí', 'ca-vit')}${plus('ca-add-vit')}${cell('Nội công', 'ca-ene')}${plus('ca-add-ene')}
      </div>
      <div class="ca-grid ca-top">
        ${cell('Lực tay trái', 'ca-dmg-l')}
        ${cell('Lực tay phải', 'ca-dmg-r')}
      </div>
      <div class="ca-grid ca-pair">
        ${cell('Chính xác', 'ca-hit')}${cell('Phòng thủ', 'ca-res-phy')}
        ${cell('Né tránh', 'ca-def')}${cell('Kháng băng', 'ca-res-cold')}
        ${cell('Chạy', 'ca-run')}${cell('Kháng lôi', 'ca-res-light')}
        ${cell('Công kích', 'ca-aspd')}${cell('Kháng hỏa', 'ca-res-fire')}
        ${cell('Tiềm năng', 'ca-points', 'red')}${cell('Kháng độc', 'ca-res-poison')}
      </div>
    </div>
    <div class="char-equip">
      <div class="ce-pk">PK <span id="ce-pk"></span></div>
      <div id="ce-slots"></div>
    </div>
  </div>
  <div class="char-foot">
    ${import.meta.env.DEV ? '<button type="button" class="btn" id="char-dev-level" title="Dev: lên 1 cấp (Shift: 10)">+1 cấp</button>' : ''}
    <button type="button" class="btn" id="char-items">Vật phẩm</button>
    <button type="button" class="btn" id="char-close">Đóng</button>
  </div>
</section>`;

/** Shown for values the prototype does not have yet (danh hiệu, danh vọng, xếp hạng, thể lực). */
const NA = '—';
const NA_TIP = 'Chưa có trong bản thử nghiệm';

/**
 * Trang bị và Thuộc tính (C, quick-bar button), laid out like the merged SHXT window: the character page of
 * ui3/玩家装备与人物状态_属性.ini on the left (value colours from it), the worn items of _装备.ini on the right, "Vật phẩm"
 * opens the bag. Values without a source yet show "—". Click a worn item: take it off into the bag.
 */
export class CharacterWindow {
  private inv: InventoryMsg = inventory.get();
  private shown = '';

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID);
    this.buildSlots();
    $('char-items').addEventListener('click', () => this.ctx.toggleBag());
    $('char-close').addEventListener('click', () => dialogs.close(ID));
    for (const id of ['ca-title', 'ca-luck', 'ca-fame', 'ca-rank', 'ca-sta']) {
      const el = $(id);
      el.textContent = NA;
      el.title = NA_TIP;
      el.classList.add('na');
    }
    inventory.watch(inv => { this.inv = inv; this.renderEquip(); }, false);
    for (const [stat, id] of [['str', 'ca-add-str'], ['dex', 'ca-add-dex'], ['vit', 'ca-add-vit'], ['eng', 'ca-add-ene']] as const) {
      $(id).addEventListener('click', e => this.ctx.actions()?.addPotential(stat, (e as MouseEvent).shiftKey ? 10 : 1));
    }
    $('ca-suggest').addEventListener('click', () => this.ctx.suggest?.('potential'));
    progress.watch(() => this.renderStats(), false);
    skillbar.watch(() => this.renderStats());
    if (import.meta.env.DEV) $('char-dev-level').addEventListener('click', e => this.ctx.actions()?.devLevel((e as MouseEvent).shiftKey ? 10 : 1));
  }

  /** Level, exp, potentials, points, Chính xác / Né / kháng / lực tay from the server's formulas (formulas/character.ts). */
  private renderStats(): void {
    const p = progress.get();
    if (!p) return;
    const st = p.stats, pr = p.progress;
    const set = (id: string, v: string) => { const el = $(id); el.textContent = v; el.classList.remove('na'); el.title = ''; };
    set('ca-level', String(pr.level));
    set('ca-exp', Number.isFinite(p.expNext) ? `${pr.exp}/${p.expNext}` : String(pr.exp));
    set('ca-str', String(st.str)); set('ca-dex', String(st.dex)); set('ca-vit', String(st.vit)); set('ca-ene', String(st.eng));
    set('ca-points', String(pr.potentialPoints));
    set('ca-hit', String(st.ar)); set('ca-def', String(st.def));
    // Lực tay of the skills on the left / right mouse slots (formulas/damage.ts skillDamage, same as the server).
    const hand = (slot: 'left' | 'right') => {
      const id = skillbar.skillAt(slot) ?? BASIC_SKILL;
      const s = getSkill(id);
      if (!s || !p.combat) return `${st.physMin}/${st.physMax}`;
      const d = skillDamage(s, Math.max(1, skillbar.levelOf(id)), id, p.combat);
      const lo = d.phys[0] + d.cold[0] + d.fire[0] + d.light[0], hi = d.phys[1] + d.cold[1] + d.fire[1] + d.light[1];
      return `${Math.round(lo)}/${Math.round(hi)}${d.poison ? ` +độc ${Math.round(d.poison.tick)}` : ''}`;
    };
    set('ca-dmg-l', hand('left')); set('ca-dmg-r', hand('right'));
    if (p.combat) {
      set('ca-run', String(speedPoints(moveFactor(p.combat.bag, false) * 100)));
      set('ca-aspd', `${attrOf(p.combat.bag, 'attackspeed_v')}% / ${attrOf(p.combat.bag, 'castspeed_v')}%`);
      $('ca-aspd').title = 'Tốc độ đánh ngoại công / nội công (formulas/speed.ts)';
    }
    set('ca-res-phy', `${st.resist.phys}%`); set('ca-res-cold', `${st.resist.cold}%`); set('ca-res-light', `${st.resist.light}%`);
    set('ca-res-fire', `${st.resist.fire}%`); set('ca-res-poison', `${st.resist.poison}%`);
    set('ca-series', `hệ ${ELEMENT_NAMES[p.series]}`);
    for (const id of ['ca-add-str', 'ca-add-dex', 'ca-add-vit', 'ca-add-ene']) ($(id) as HTMLButtonElement).disabled = pr.potentialPoints <= 0;
    const self = this.ctx.self();
    if (self) $<HTMLImageElement>('ca-face').src = assetUrl(`portraits/${portraitFaction(self.faction, p.series, self.gender as Gender)}.png`);
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
    if (dialogs.isOpen(ID)) { this.shown = ''; this.update(); }
  }

  /** Values from the own character (called every frame by the HUD; writes only what changed, only while open). */
  update(self: ActorState | null = this.ctx.self()): void {
    if (!self || !dialogs.isOpen(ID)) return;
    const key = `${self.name}|${self.level}|${self.hp}|${self.maxHp}|${self.mp}|${self.maxMp}|${self.pk}|${self.faction}`;
    if (key === this.shown) return;
    this.shown = key;
    $('ca-name').textContent = self.name;
    $('ca-hp').textContent = `${Math.max(0, Math.round(self.hp))}/${self.maxHp}`;
    $('ca-mp').textContent = `${Math.max(0, Math.round(self.mp))}/${self.maxMp}`;
    $('ce-pk').textContent = PK_MODE_NAMES[self.pk] ?? PK_MODE_NAMES[0];
    this.renderStats();
  }

  private buildSlots(): void {
    const box = $('ce-slots');
    for (const [slot, left, top, w, h] of SLOT_BOXES) {
      const el = document.createElement('div');
      el.className = `slot ce-slot`;
      el.dataset.slot = slot;
      Object.assign(el.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
      el.innerHTML = `<span class="slot-name">${SLOT_NAMES[slot]}</span>`;
      el.addEventListener('click', () => { if (this.inv.equip[slot]) this.ctx.actions()?.unequip(slot); });
      // Right click takes it off too (USER 2026-11-12: chuột phải mặc / tháo).
      el.addEventListener('contextmenu', e => { e.preventDefault(); if (this.inv.equip[slot]) this.ctx.actions()?.unequip(slot); });
      el.addEventListener('mouseenter', () => this.tip(this.inv.equip[slot], el, slot));
      el.addEventListener('mouseleave', () => showItemTip(null));
      box.appendChild(el);
    }
  }

  private tip(item: Item | undefined, el: HTMLElement, slot: EquipSlot): void {
    const self = this.ctx.self();
    const active = wornActiveCount(this.inv.equip, slot, seriesOf(ownSeries(self)));
    showItemTip(itemDef(item), el, {
      item, viewer: itemViewer(self), active, hint: 'Click / chuột phải: tháo xuống hành trang',
    });
  }

  private renderEquip(): void {
    document.querySelectorAll<HTMLElement>('#ce-slots .slot').forEach(el => {
      const item = this.inv.equip[el.dataset.slot as EquipSlot];
      setSlotIcon(el, itemDef(item), { quality: item?.q });
    });
  }
}
