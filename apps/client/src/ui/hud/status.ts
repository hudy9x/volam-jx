import { SKILL_CATEGORY_NAMES, SkillStyle, TK_ALL_ITEMS, getSkill, skillCategory, stateLines, weaponOk, type ItemDef } from '@vltk/shared';
import type { ActorState } from '../../state/actor';
import { progress } from '../../state/progress';
import { skillbar } from '../../state/skillbar';
import { mount } from '../kit/dom';
import './status.css';
import { assetUrl } from '../../art/assets';

const TK_BUFF_BY_STATE = new Map<number, ItemDef>(
  TK_ALL_ITEMS.flatMap(it => (it.tkItem?.kind === 'buff' ? [[it.tkItem.stateId, it] as const] : [])),
);

function fmtBadge(sec: number): string {
  if (sec >= 3600) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    return `${h}h${String(m).padStart(2, '0')}`;
  }
  if (sec >= 60) return `${Math.ceil(sec / 60)}p`;
  return `${sec}s`;
}

function fmtFullTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

/** Own bùa lợi / bùa hại under the portrait: icon + seconds left, and active Tiên Thảo Lộ countdown below them. */
export class StatusIcons {
  private readonly el: HTMLElement;
  private readonly elixirEl: HTMLElement;
  private sig = '';
  private elixirSig = '';

  constructor(parent: HTMLElement) {
    const wrap = mount(parent, '<div id="hud-top-status"><div id="hud-states"></div><div id="hud-elixir"></div></div>');
    this.el = wrap.querySelector('#hud-states')!;
    this.elixirEl = wrap.querySelector('#hud-elixir')!;
  }

  update(self: ActorState): void {
    const ids = [...(self.states ?? [])], ends = [...(self.stateEnds ?? [])];
    const stateSet = new Set(ids);
    const nowSec = Date.now() / 1000;
    const left = ends.map(e => (e ? Math.max(0, Math.ceil(e - nowSec)) : -1));
    const sp = self.sp ?? 0, spMax = self.spMax ?? 0;

    // Active passive skills (learned level > 0 and matching current weapon if weapon-restricted).
    const passives: Array<{ id: number; lv: number }> = [];
    for (const [idStr, rawLv] of Object.entries(skillbar.levels)) {
      const id = Number(idStr);
      if (stateSet.has(id) || rawLv <= 0) continue;
      const s = getSkill(id);
      if (!s || s.inactive || s.style !== SkillStyle.Passive || !s.icon) continue;
      if (!weaponOk(s, skillbar.weapon)) continue;
      passives.push({ id, lv: skillbar.levelOf(id) });
    }
    passives.sort((a, b) => a.id - b.id);

    const sig = `${ids.join(',')}|${left.join(',')}|${passives.map(p => `${p.id}:${p.lv}`).join(',')}|${sp}/${spMax}`;
    if (sig !== this.sig) {
      this.sig = sig;
      const nodes: HTMLElement[] = [];

      for (const { id, lv } of passives) {
        const s = getSkill(id)!;
        const el = document.createElement('div');
        const hasSp = !!s.attrs?.special_point_base;
        el.className = `st-icon passive${hasSp ? ' sp' : ''}`;
        if (s.icon) {
          const img = document.createElement('img');
          img.src = assetUrl(`${s.icon}.webp`);
          img.alt = s.name;
          el.appendChild(img);
        }
        if (hasSp && spMax > 0) {
          const t = document.createElement('span');
          t.className = 'sp-count';
          t.textContent = String(sp);
          el.appendChild(t);
        }
        const lines = [
          `${s.name} · Bị động (cấp ${lv})`,
          ...(hasSp && spMax > 0 ? [`Âm Luật hiện có: ${sp} / ${spMax} tầng`] : []),
          ...stateLines(s, lv),
        ];
        el.title = lines.join('\n');
        nodes.push(el);
      }

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const s = getSkill(id);
        const tkItem = s ? undefined : TK_BUFF_BY_STATE.get(id);
        const el = document.createElement('div');
        const cat = s ? skillCategory(s) : 'buff';
        el.className = `st-icon${cat === 'buff' || cat === 'support' ? '' : ' debuff'}`;
        const iconPath = s?.icon ?? tkItem?.icon;
        if (iconPath) { const img = document.createElement('img'); img.src = assetUrl(`${iconPath}.webp`); img.alt = ''; el.appendChild(img); }
        if (left[i] >= 0) { const t = document.createElement('span'); t.textContent = `${left[i]}`; el.appendChild(t); }
        el.title = s
          ? [`${s.name} · ${cat === 'debuff' || cat === 'attack' ? 'Bùa hại' : SKILL_CATEGORY_NAMES[cat]}`, ...stateLines(s, 10)].join('\n')
          : tkItem
            ? `${tkItem.name}\n${tkItem.desc}`
            : `#${id}`;
        nodes.push(el);
      }

      this.el.replaceChildren(...nodes);
    }

    const exp = progress.get()?.expBuff;
    const remSec = exp && exp.until > Date.now() ? Math.max(1, Math.ceil((exp.until - Date.now()) / 1000)) : 0;
    const nextElixirSig = remSec > 0 ? `${exp!.tier}|${exp!.mul}|${remSec}` : '';
    if (nextElixirSig !== this.elixirSig) {
      this.elixirSig = nextElixirSig;
      if (remSec <= 0) {
        this.elixirEl.replaceChildren();
        return;
      }
      const iconName = exp!.tier === 'special' ? 'items/xiancaolu-sp.webp' : 'items/xiancaolu.webp';
      const label = exp!.tier === 'special' ? 'Tiên Thảo Lộ đặc biệt' : 'Tiên Thảo Lộ';
      const box = document.createElement('div');
      box.className = 'st-icon elixir';
      const img = document.createElement('img');
      img.src = assetUrl(iconName);
      img.alt = label;
      const t = document.createElement('span');
      t.textContent = fmtBadge(remSec);
      box.append(img, t);
      box.title = `${label} (×${exp!.mul} kinh nghiệm)\nCòn lại: ${fmtFullTime(remSec)}`;
      this.elixirEl.replaceChildren(box);
    }
  }
}
