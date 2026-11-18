import { SKILL_CATEGORY_NAMES, getSkill, skillCategory, stateLines } from '@vltk/shared';
import type { ActorState } from '../../state/actor';
import { progress } from '../../state/progress';
import { mount } from '../kit/dom';
import './status.css';
import { assetUrl } from '../../art/assets';

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
    const nowSec = Date.now() / 1000;
    const left = ends.map(e => (e ? Math.max(0, Math.ceil(e - nowSec)) : -1));
    const sig = `${ids.join(',')}|${left.join(',')}`;
    if (sig !== this.sig) {
      this.sig = sig;
      this.el.replaceChildren(...ids.map((id, i) => {
        const s = getSkill(id);
        const el = document.createElement('div');
        const cat = s ? skillCategory(s) : 'buff';
        el.className = `st-icon${cat === 'buff' || cat === 'support' ? '' : ' debuff'}`;
        if (s?.icon) { const img = document.createElement('img'); img.src = assetUrl(`${s.icon}.webp`); img.alt = ''; el.appendChild(img); }
        if (left[i] >= 0) { const t = document.createElement('span'); t.textContent = `${left[i]}`; el.appendChild(t); }
        el.title = s ? [`${s.name} · ${cat === 'debuff' || cat === 'attack' ? 'Bùa hại' : SKILL_CATEGORY_NAMES[cat]}`,
          ...stateLines(s, 10)].join('\n') : `#${id}`;
        return el;
      }));
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
