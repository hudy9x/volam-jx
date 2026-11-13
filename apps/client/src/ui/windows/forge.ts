import {
  ITEMS, KIND_NAMES, KIND_SLOTS, MAGIC_KINDS, MAGIC_LINES, MAGIC_SLOTS, QUALITY, SERIES_NAMES, SHOP_ITEMS, attrText, forgeChoices,
  forgeError, forgePrice, forgedMagic, moneyText, seriesOf, seriesPlan,
  type EquipSlot, type ForgeChoice, type ForgeLines, type Item, type ItemDef, type ItemKind,
} from '@vltk/shared';
import { itemViewer, ownSeries } from '../../state/progress';
import { inventory } from '../../state/inventory';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { setSlotIcon } from '../kit/slot';
import type { HudContext } from '../hud/context';
import { fillItemTip } from '../tips/itemTip';
import './forge.css';

const ID = 'forge-panel';

/** Names of the weapon / ám khí row types (meleeweapon.txt / rangeweapon.txt DetailType). */
const TYPE_NAMES: Partial<Record<ItemKind, string[]>> = {
  melee: ['Kiếm', 'Đao', 'Bổng (côn)', 'Thương', 'Chùy', 'Song đao'],
  range: ['Phi tiêu', 'Phi đao', 'Tụ tiễn'],
};
const typeName = (kind: ItemKind, type: number, rows: ItemDef[]) =>
  TYPE_NAMES[kind]?.[type] ?? rows.find(it => it.type === type)?.name ?? `Loại ${type + 1}`;
const reqLevel = (it: ItemDef) => it.req.find(r => r[0] === 'requirelevel')?.[1] ?? 0;
const itemDefOf = (id: string | undefined) => (id ? ITEMS[id] : undefined);
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Thợ rèn · Chế tạo">
  <div class="forge-body">
    <div class="forge-form">
      <div class="forge-pick">
        <select id="forge-kind" aria-label="Loại trang bị"></select>
        <select id="forge-type" aria-label="Loại"></select>
        <select id="forge-level" aria-label="Cấp"></select>
      </div>
      <div class="forge-series" id="forge-series"></div>
      <div class="forge-plan">
        <button type="button" class="btn sm" id="forge-auto" title="Chọn ngũ hành cho món này để dòng ẩn sáng nhiều nhất, theo vũ khí đang mặc và hệ nhân vật">Ngũ hành theo vũ khí</button>
        <div class="muted" id="forge-plan"></div>
      </div>
      <div id="forge-lines"></div>
      <div class="forge-foot">
        <button type="button" class="btn sm" id="forge-max">Tất cả giá trị tối đa</button>
        <button type="button" class="btn sm" id="forge-clear">Xóa dòng</button>
      </div>
      <div class="forge-foot">
        <span>Giá: <b id="forge-price"></b> lượng</span>
        <button type="button" class="btn" id="forge-make">Chế tạo</button>
      </div>
      <div class="error" id="forge-error"></div>
    </div>
    <div class="forge-preview">
      <div class="slot" id="forge-icon"></div>
      <div id="forge-tip"></div>
    </div>
  </div>
</section>`;

/**
 * Thợ rèn → Chế tạo: pick a piece the smith sells, its ngũ hành and each of the 6 lines of settings/item/magicattrib.txt
 * (1, 3, 5 always on; 2, 4, 6 hidden lines of the chosen ngũ hành), each at its largest value for the piece's level
 * (lower it in the box). The server checks everything again (items/magic.ts forgeError) and charges forgePrice.
 */
export class ForgeWindow {
  private kind: ItemKind = 'melee';
  private def: ItemDef | undefined;
  private series = 0;
  private lines: ForgeLines = Array(MAGIC_LINES).fill(null);
  /** Opened from the lệnh bài ("Nhận đồ xanh"): free, anywhere (server checks the lệnh bài). */
  private token = false;
  /** Row type of the kind (weapons: 0 Kiếm, 1 Đao, 2 Bổng, 3 Thương, 4 Chùy, 5 Song đao; ám khí 0–2). */
  private type = -1;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    mount(parent, HTML);
    dialogs.register(ID);
    const kind = $<HTMLSelectElement>('forge-kind');
    for (const k of MAGIC_KINDS) kind.add(new Option(KIND_NAMES[k], k));
    kind.addEventListener('change', () => { this.kind = kind.value as ItemKind; this.pickItem(); });
    $<HTMLSelectElement>('forge-type').addEventListener('change', e => {
      this.type = Number((e.target as HTMLSelectElement).value);
      this.pickItem(undefined, this.def?.level);
    });
    $<HTMLSelectElement>('forge-level').addEventListener('change', e => {
      this.def = ITEMS[(e.target as HTMLSelectElement).value];
      this.trimLines();
      this.render();
    });
    const series = $('forge-series');
    SERIES_NAMES.forEach((name, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tab';
      b.dataset.series = String(i);
      b.textContent = name;
      b.addEventListener('click', () => { this.series = i; this.trimLines(); this.render(); });
      series.appendChild(b);
    });
    $('forge-max').addEventListener('click', () => {
      this.lines = this.lines.map((l, pos) => (l ? [l[0], this.choice(pos, l[0])?.max ?? l[1]] : null));
      this.render();
    });
    $('forge-clear').addEventListener('click', () => { this.lines = Array(MAGIC_LINES).fill(null); this.render(); });
    $('forge-make').addEventListener('click', () => {
      if (!this.def || this.error()) return;
      this.ctx.actions()?.forge(this.def.id, this.series, this.lines, this.token);
    });
    $('forge-auto').addEventListener('click', () => {
      const s = this.plannedSeries();
      if (s === undefined) return;
      this.series = s;
      this.trimLines();
      this.render();
    });
    inventory.watch(() => this.renderPrice());
  }

  /** Open with the character's own ngũ hành and the kind the smith window shows. */
  open(kind?: ItemKind, token = false): void {
    this.token = token;
    dialogs.setTitle(ID, token ? 'Lệnh bài · Nhận đồ xanh' : 'Thợ rèn · Chế tạo');
    const self = this.ctx.self();
    const own = seriesOf(ownSeries(self));
    if (!dialogs.isOpen(ID) && own >= 0) this.series = own;
    if (kind && MAGIC_KINDS.includes(kind) && kind !== this.kind) { this.kind = kind; this.def = undefined; this.type = -1; }
    $<HTMLSelectElement>('forge-kind').value = this.kind;
    this.pickItem(this.def?.id);
    dialogs.open(ID);
  }

  /**
   * Rows of the current kind the smith sells (the character's sex): a Loại list (weapon type, or the row family named after
   * its first piece) and a Cấp list 1–10. Default type: the worn weapon's for weapons; default level: the highest whose
   * requirelevel the character meets (USER 2026-11-13). Keeps `keep` (a row id) or `level` when given.
   */
  private pickItem(keep?: string, level?: number): void {
    const sex = this.ctx.self()?.gender === 'female' ? 'f' : 'm';
    const rows = SHOP_ITEMS.smith.filter(it => it.kind === this.kind && (!it.sex || it.sex === sex))
      .sort((a, b) => a.type - b.type || a.level - b.level);
    const types = [...new Set(rows.map(it => it.type))];
    const kept = keep ? rows.find(it => it.id === keep) : undefined;
    if (kept) this.type = kept.type;
    if (!types.includes(this.type)) {
      const worn = itemDefOf(inventory.get().equip.weapon?.def);
      this.type = worn && worn.kind === this.kind && types.includes(worn.type) ? worn.type : types[0] ?? 0;
    }
    const typeSel = $<HTMLSelectElement>('forge-type');
    typeSel.replaceChildren(...types.map(t => new Option(typeName(this.kind, t, rows), String(t))));
    typeSel.value = String(this.type);
    typeSel.hidden = types.length < 2;

    const list = rows.filter(it => it.type === this.type);
    const sel = $<HTMLSelectElement>('forge-level');
    sel.replaceChildren(...list.map(it => new Option(`Cấp ${it.level} · ${it.name} (yêu cầu cấp ${reqLevel(it)})`, it.id)));
    const me = this.ctx.self()?.level ?? 1;
    const fit = list.filter(it => reqLevel(it) <= me).pop() ?? list[0];
    this.def = kept ?? (level !== undefined ? list.find(it => it.level === level) : undefined) ?? fit;
    if (this.def) sel.value = this.def.id;
    this.trimLines();
    this.render();
  }

  private choice(pos: number, attr: string): ForgeChoice | undefined {
    return this.def ? forgeChoices(this.def, this.series, pos).find(c => c.attr === attr) : undefined;
  }

  /** Drop lines the piece / ngũ hành no longer allows; clamp the others. */
  private trimLines(): void {
    this.lines = this.lines.map((l, pos) => {
      const c = l && this.choice(pos, l[0]);
      return l && c ? [l[0], Math.max(c.min, Math.min(c.max, l[1]))] : null;
    });
  }

  private error(): string | null {
    return forgeError(this.def, this.series, this.lines);
  }

  /**
   * Plan of ngũ hành for the 10 slots (items/magic.ts seriesPlan) from the worn weapon's ngũ hành (free when it has
   * none) and the character's: the slot the current kind goes to, and a line listing the whole plan.
   */
  private plan(): { slot: EquipSlot; plan: ReturnType<typeof seriesPlan>; weapon: number } | undefined {
    if (!this.def) return undefined;
    const equip = inventory.get().equip;
    const weapon = equip.weapon?.series ?? -1;
    const plan = seriesPlan(weapon, seriesOf(ownSeries(this.ctx.self())));
    const slots = KIND_SLOTS[this.def.kind];
    // Rings: the slot whose worn ring does not already match the plan (upper first).
    const slot = slots.find(s => equip[s]?.series !== plan.series[s]) ?? slots[0];
    return slot ? { slot, plan, weapon } : undefined;
  }

  private plannedSeries(): number | undefined {
    const p = this.plan();
    return p ? p.plan.series[p.slot] : undefined;
  }

  private renderPlan(): void {
    const p = this.plan();
    const box = $('forge-plan');
    if (!p) { box.textContent = ''; return; }
    const name: Partial<Record<EquipSlot, string>> = {
      weapon: 'Vũ khí', helm: 'Nón', armor: 'Áo', belt: 'Đai', boot: 'Giày', cuff: 'Bao tay', amulet: 'Dây chuyền',
      ring1: 'Nhẫn trên', ring2: 'Nhẫn dưới', pendant: 'Ngọc bội',
    };
    const head = p.weapon >= 0 ? `Vũ khí đang mặc hệ ${SERIES_NAMES[p.weapon]}` : 'Chưa mặc vũ khí có ngũ hành (tự chọn cả vũ khí)';
    box.textContent = `${head} → ${MAGIC_SLOTS.map(s => `${name[s]} ${SERIES_NAMES[p.plan.series[s]!]}`).join(' · ')}`
      + ` (mỗi món sáng ${Math.min(...MAGIC_SLOTS.map(s => p.plan.lit[s]!))}–3 dòng ẩn khi mặc đủ bộ). Món này: ${name[p.slot]} → ${SERIES_NAMES[p.plan.series[p.slot]!]}.`;
  }

  private render(): void {
    document.querySelectorAll<HTMLElement>('#forge-series .tab')
      .forEach(b => b.classList.toggle('on', Number(b.dataset.series) === this.series));
    const box = $('forge-lines');
    box.replaceChildren();
    const def = this.def;
    for (let pos = 0; pos < MAGIC_LINES; pos++) {
      const row = document.createElement('div');
      row.className = `forge-line${pos % 2 ? ' hidden-line' : ''}`;
      const label = document.createElement('span');
      label.className = 'forge-label';
      label.textContent = pos % 2 ? `${pos + 1}. Ẩn (${SERIES_NAMES[this.series]})` : `${pos + 1}. Hiện`;
      const sel = document.createElement('select');
      sel.add(new Option('— trống —', ''));
      const used = new Set(this.lines.filter((l, i) => l && i !== pos).map(l => l![0]));
      const choices = def ? forgeChoices(def, this.series, pos) : [];
      for (const c of choices) {
        const o = new Option(`${attrText(c.attr, c.max)} (tối đa)`, c.attr);
        o.disabled = used.has(c.attr);
        sel.add(o);
      }
      const cur = this.lines[pos];
      sel.value = cur?.[0] ?? '';
      const value = document.createElement('input');
      value.type = 'number';
      value.className = 'forge-value';
      const c = cur ? choices.find(x => x.attr === cur[0]) : undefined;
      value.disabled = !c;
      if (c) { value.min = String(c.min); value.max = String(c.max); value.value = String(cur![1]); value.title = `${c.min} – ${c.max}`; }
      sel.addEventListener('change', () => {
        const pick = choices.find(x => x.attr === sel.value);
        this.lines[pos] = pick ? [pick.attr, pick.max] : null;
        this.render();
      });
      value.addEventListener('change', () => {
        if (!c) return;
        const n = Math.round(Number(value.value));
        this.lines[pos] = [c.attr, Number.isFinite(n) ? Math.max(c.min, Math.min(c.max, n)) : c.max];
        this.render();
      });
      row.append(label, sel, value);
      box.appendChild(row);
    }
    this.renderPreview();
    this.renderPlan();
    this.renderPrice();
  }

  /** The piece as it will come out (base values at their maximum), in the item tooltip's layout. */
  private renderPreview(): void {
    const tip = $('forge-tip');
    tip.replaceChildren();
    const def = this.def;
    setSlotIcon($('forge-icon'), def);
    if (!def) return;
    const magic = forgedMagic(this.lines);
    const item: Item = {
      uid: '', def: def.id, series: this.series, base: def.base.map(([, , hi]) => hi),
      ...(magic.length ? { magic, q: QUALITY.magic } : {}),
    };
    const self = this.ctx.self();
    fillItemTip(tip, def, { item, viewer: itemViewer(self) });
  }

  private renderPrice(): void {
    if (!this.def) return;
    const price = this.token ? 0 : forgePrice(this.def, this.lines);
    const el = $('forge-price');
    el.textContent = this.token ? '0 (Lệnh bài)' : moneyText(price);
    el.classList.toggle('short', price > inventory.get().money);
    const err = this.error();
    $('forge-error').textContent = err ?? '';
    $<HTMLButtonElement>('forge-make').disabled = !!err;
  }
}
