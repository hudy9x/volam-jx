import { PK_MODE_NAMES,
  ELEMENT_NAMES, SLOT_NAMES, wornActiveCount, canWear, getSkill, itemDef, portraitFaction, speedPoints, attackSpeedPct, castSpeedPct, totalSpeedPercents, resolveSpeed, seriesOf, skillDamage,
  type EquipSlot, type Gender, type InventoryMsg, type Item, type Potential,
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
import { gameViewport, watchViewport } from '../../platform/viewport';

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
const plus = (id: string) => `<button type="button" class="ca-plus" id="${id}" disabled title="Cộng điểm tiềm năng">+</button>`;
const POT_LABELS: Record<Potential, string> = { str: 'Sức mạnh', dex: 'Thân pháp', vit: 'Sinh khí', eng: 'Nội công' };

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
        ${cell('T.Độ Chạy', 'ca-run')}${cell('Kháng lôi', 'ca-res-light')}
        ${cell('T.Độ đánh', 'ca-aspd')}${cell('Kháng hỏa', 'ca-res-fire')}
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
    ${import.meta.env.DEV ? '<button type="button" class="btn" id="char-speed-test">Thử tốc độ</button>' : ''}
    <button type="button" class="btn" id="char-items">Vật phẩm</button>
    <button type="button" class="btn" id="char-close">Đóng</button>
  </div>
</section>
<dialog id="ca-pot-dlg" class="ca-pot-dlg" closedby="any" aria-labelledby="ca-pot-title">
  <form method="dialog" class="ca-pot-form" id="ca-pot-form">
    <div class="ca-pot-head" id="ca-pot-title"></div>
    <div class="ca-pot-row ca-pot-presets">
      <button type="button" class="btn2 ca-pot-preset" data-v="10">10</button>
      <button type="button" class="btn2 ca-pot-preset" data-v="20">20</button>
      <button type="button" class="btn2 ca-pot-preset" data-v="50">50</button>
      <button type="button" class="btn2 ca-pot-preset" data-v="100">100</button>
      <button type="button" class="btn2 ca-pot-preset" data-v="all">Tất cả</button>
    </div>
    <div class="ca-pot-row ca-pot-actions">
      <input type="number" class="ca-pot-input" id="ca-pot-input" min="1" step="1" inputmode="numeric" autofocus aria-label="Số điểm tiềm năng" />
      <button type="submit" class="btn2 ca-pot-icon ca-pot-ok" value="ok" title="Đồng ý (Enter)" aria-label="Đồng ý">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M6.2 11.4 2.8 8l1.1-1.1 2.3 2.3 5.9-5.9L13.2 4.4z"/></svg>
      </button>
      <button type="button" class="btn2 ca-pot-icon ca-pot-cancel" id="ca-pot-cancel" title="Hủy bỏ (Esc)" aria-label="Hủy bỏ">
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M4.2 3.1 8 6.9l3.8-3.8 1.1 1.1L9.1 8l3.8 3.8-1.1 1.1L8 9.1l-3.8 3.8-1.1-1.1L6.9 8 3.1 4.2z"/></svg>
      </button>
    </div>
  </form>
</dialog>`;

/** Shown for values the prototype does not have yet (danh hiệu, danh vọng, xếp hạng, thể lực). */
const NA = '—';
const NA_TIP = 'Chưa có trong bản thử nghiệm';

/**
 * Trang bị và Thuộc tính (N, quick-bar button), laid out like the merged SHXT window: the character page of
 * ui3/玩家装备与人物状态_属性.ini on the left (value colours from it), the worn items of _装备.ini on the right, "Vật phẩm"
 * opens the bag. Values without a source yet show "—". Click a worn item: take it off into the bag.
 */
export class CharacterWindow {
  private inv: InventoryMsg = inventory.get();
  private shown = '';
  private potStat: Potential | null = null;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID);
    this.buildSlots();
    if (import.meta.env.DEV) $('char-speed-test').addEventListener('click', async () => {
      const p = progress.get(), self = this.ctx.self();
      if (!p?.combat || !self) return;
      const id = skillbar.skillAt('left') ?? BASIC_SKILL;
      const totals = totalSpeedPercents(p.combat.bag, !!((self.ctl ?? 0) & 2));
      const { speedLabUrl } = await import('../../dev/skill-lab/speedSample');
      const url = speedLabUrl(location.href, {
        name: self.name, faction: self.faction, gender: self.gender, mounted: self.mounted, horse: self.horse,
        skill: id, level: Math.max(1, skillbar.levelOf(id)), ...totals,
        attackBonus: attackSpeedPct(p.combat.bag), castBonus: castSpeedPct(p.combat.bag),
        runPoints: speedPoints(totals.run),
      });
      window.open(url, '_blank', 'noopener');
    });
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
      $(id).addEventListener('click', () => this.openPotDialog(stat));
    }
    this.setupPotDialog();
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
      const totals = totalSpeedPercents(p.combat.bag, !!((this.ctx.self()?.ctl ?? 0) & 2));
      const run = resolveSpeed('run', totals.run), attack = resolveSpeed('attack', totals.attack), cast = resolveSpeed('attack', totals.cast);
      set('ca-run', String(speedPoints(totals.run)));
      set('ca-aspd', `${attackSpeedPct(p.combat.bag)}/${castSpeedPct(p.combat.bag)}`);
      $('ca-run').title = `Điểm chạy (nền 10% = 1 điểm). Tổng ${totals.run}% → mốc ${run.phasePercent}% · ${Math.round(run.cycleMs)} ms/vòng. Dùng Thử tốc độ để chuyển đúng chỉ số sang ?skills.`;
      $('ca-aspd').title = `Ngoại / nội công: % cộng thêm (nền 10%). Tổng ${totals.attack}/${totals.cast}% → mốc ${attack.phasePercent}/${cast.phasePercent}% · ${Math.round(attack.cycleMs)}/${Math.round(cast.cycleMs)} ms/đòn. ?skills nhập tổng %, không phải số cộng thêm.`;
    }
    set('ca-res-phy', `${st.resist.phys}%`); set('ca-res-cold', `${st.resist.cold}%`); set('ca-res-light', `${st.resist.light}%`);
    set('ca-res-fire', `${st.resist.fire}%`); set('ca-res-poison', `${st.resist.poison}%`);
    set('ca-series', `hệ ${ELEMENT_NAMES[p.series]}`);
    for (const id of ['ca-add-str', 'ca-add-dex', 'ca-add-vit', 'ca-add-ene']) ($(id) as HTMLButtonElement).disabled = pr.potentialPoints <= 0;
    const potDlg = $('ca-pot-dlg') as HTMLDialogElement;
    if (potDlg.open && this.potStat) {
      if (pr.potentialPoints <= 0) potDlg.close();
      else {
        $('ca-pot-title').textContent = `${POT_LABELS[this.potStat]} (còn ${pr.potentialPoints})`;
        ($('ca-pot-input') as HTMLInputElement).max = String(pr.potentialPoints);
      }
    }
    const self = this.ctx.self();
    if (self) $<HTMLImageElement>('ca-face').src = assetUrl(`portraits/${portraitFaction(self.faction, p.series, self.gender as Gender)}.png`);
    this.renderEquip();
  }

  private openPotDialog(stat: Potential): void {
    const avail = progress.get()?.progress.potentialPoints ?? 0;
    if (avail <= 0) return;
    this.potStat = stat;
    $('ca-pot-title').textContent = `${POT_LABELS[stat]} (còn ${avail})`;
    const input = $('ca-pot-input') as HTMLInputElement;
    input.max = String(avail);
    input.value = '1';
    const dlg = $('ca-pot-dlg') as HTMLDialogElement;
    dlg.returnValue = '';
    dlg.showModal();
    this.placePotDialog();
    input.select();
  }

  /** Native modal dialogs live in the top layer, outside the HUD's transform. */
  private placePotDialog(): void {
    const dlg = $('ca-pot-dlg') as HTMLDialogElement, frame = gameViewport();
    if (!dlg.open || !frame) return;
    Object.assign(dlg.style, {
      position: 'fixed', margin: '0',
      left: `${frame.left + frame.width * frame.scale / 2}px`, top: `${frame.top + frame.height * frame.scale / 2}px`,
      transform: `translate(-50%, -50%) scale(${frame.scale})`,
    });
  }

  private setupPotDialog(): void {
    watchViewport(() => this.placePotDialog());
    const dlg = $('ca-pot-dlg') as HTMLDialogElement;
    const input = $('ca-pot-input') as HTMLInputElement;
    dlg.querySelectorAll<HTMLButtonElement>('.ca-pot-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const avail = progress.get()?.progress.potentialPoints ?? 0;
        const raw = btn.dataset.v;
        const val = raw === 'all' ? avail : Math.min(Number(raw), avail);
        input.value = String(Math.max(1, val));
        input.focus();
      });
    });
    $('ca-pot-cancel').addEventListener('click', () => dlg.close('cancel'));
    $('ca-pot-form').addEventListener('submit', () => {
      const n = Math.floor(Number(input.value));
      if (this.potStat && Number.isFinite(n) && n > 0) this.ctx.actions()?.addPotential(this.potStat, n);
    });
    dlg.addEventListener('close', () => {
      dlg.returnValue = '';
      this.potStat = null;
    });
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const outside = (e: PointerEvent) => {
        const r = dlg.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      dlg.addEventListener('pointerdown', e => { pressedOutside = outside(e); });
      dlg.addEventListener('pointerup', e => { if (pressedOutside && outside(e)) dlg.close(); });
    }
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
    if (dialogs.isOpen(ID)) { this.shown = ''; this.update(); this.renderEquip(); }
  }

  /** Values from the own character (called every frame by the HUD; writes only what changed, only while open). */
  update(self: ActorState | null = this.ctx.self()): void {
    if (!self || !dialogs.isOpen(ID)) return;
    const key = `${self.name}|${self.level}|${self.hp}|${self.maxHp}|${self.mp}|${self.maxMp}|${self.pk}|${self.faction}|${self.ctl}|${self.moveScale}|${self.actionMs}`;
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
      item, viewer: itemViewer(self), active, slot,
    });
  }

  private renderEquip(): void {
    const viewer = itemViewer(this.ctx.self());
    document.querySelectorAll<HTMLElement>('#ce-slots .slot').forEach(el => {
      const item = this.inv.equip[el.dataset.slot as EquipSlot];
      const def = itemDef(item);
      setSlotIcon(el, def, { quality: item?.q, wearable: def ? canWear(def, viewer) : undefined });
    });
  }
}
