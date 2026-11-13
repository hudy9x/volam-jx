import { SKILL_CATEGORY_NAMES, getSkill, skillCategory, stateLines } from '@vltk/shared';
import type { ActorState } from '../../state/actor';
import { mount } from '../kit/dom';
import './status.css';
import { assetUrl } from '../../art/assets';

/** Own bùa lợi / bùa hại under the portrait: icon + seconds left (recorded only, no effect yet). */
export class StatusIcons {
  private readonly el: HTMLElement;
  private sig = '';

  constructor(parent: HTMLElement) {
    this.el = mount(parent, '<div id="hud-states"></div>');
  }

  update(self: ActorState): void {
    const ids = [...(self.states ?? [])], ends = [...(self.stateEnds ?? [])];
    const now = Date.now() / 1000;
    const left = ends.map(e => (e ? Math.max(0, Math.ceil(e - now)) : -1));
    const sig = `${ids.join(',')}|${left.join(',')}`;
    if (sig === this.sig) return;
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
}
