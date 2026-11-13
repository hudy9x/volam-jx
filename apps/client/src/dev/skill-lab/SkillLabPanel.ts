import { ELEMENT_NAMES, FACTIONS, FACTION_IDS, SKILL_CATEGORY_NAMES, learnTiers, skillCategory, type Element, type SkillDef } from '@vltk/shared';
import { skillIconUrl } from '../../art/icons';
import { assetUrl } from '../../art/assets';

export interface LabPanelHooks {
  faction(index: number): void;
  skill(index: number): void;
  level(delta: number): void;
  cast(): void;
  auto(): void;
}

export interface LabPanelState {
  faction: number;
  skillIndex: number;
  /** Castable skills of the faction, in tier order (same order as ←/→). */
  skills: SkillDef[];
  level: number;
  maxLevel: number;
  auto: boolean;
}

const ELEMENT_COLORS: Record<Element, string> = { kim: '#e8c879', moc: '#86d67d', thuy: '#86c8ff', hoa: '#ff8f63', tho: '#cfa877' };

const CSS = `
#lab-panel { position: fixed; left: 8px; top: 76px; bottom: 8px; width: 300px; z-index: 20; display: flex; flex-direction: column; gap: 8px;
  background: #0c0905e6; border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 13px; color: #f1e6cf; user-select: none; }
#lab-panel .lab-head { color: var(--gold); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
#lab-factions { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; }
#lab-factions .lab-f { display: grid; justify-items: center; gap: 1px; padding: 3px 2px 2px; border: 1px solid #4a3a20; border-radius: 4px;
  background: #15100a; cursor: pointer; }
#lab-factions .lab-f:hover { border-color: var(--border); background: #1f170e; }
#lab-factions .lab-f.on { border-color: var(--gold); background: #2a2010; box-shadow: 0 0 6px #e8c87955; }
#lab-factions img { height: 38px; width: 46px; object-fit: contain; image-rendering: pixelated; pointer-events: none; }
#lab-factions .lab-fname { font-size: 11px; line-height: 1.1; white-space: nowrap; pointer-events: none; }
#lab-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
#lab-controls .lab-btn { padding: 3px 8px; border: 1px solid #4a3a20; border-radius: 4px; background: #1a140c; cursor: pointer; }
#lab-controls .lab-btn:hover { border-color: var(--gold); }
#lab-controls .lab-btn.on { border-color: var(--gold); color: var(--gold); }
#lab-controls .lab-level { min-width: 62px; text-align: center; }
#lab-skills { flex: 1; overflow-y: auto; display: grid; align-content: start; gap: 2px; padding-right: 2px; }
#lab-skills .lab-tier { margin-top: 6px; color: var(--gold); font-size: 12px; border-bottom: 1px solid #4a3a20; }
#lab-skills .lab-s { display: flex; align-items: center; gap: 8px; padding: 3px 4px; border: 1px solid transparent; border-radius: 4px; cursor: pointer; }
#lab-skills .lab-s:hover { border-color: var(--border); background: #1a140c; }
#lab-skills .lab-s.on { border-color: var(--gold); background: #2a2010; }
#lab-skills .lab-icon { width: 34px; height: 34px; flex: none; display: grid; place-items: center; background: #0e0b07; border: 1px solid #4a3a20;
  border-radius: 4px; overflow: hidden; }
#lab-skills .lab-icon img { max-width: 100%; max-height: 100%; image-rendering: pixelated; pointer-events: none; }
#lab-skills .lab-sname { line-height: 1.15; pointer-events: none; }
#lab-skills .lab-sid { color: #8d7c60; font-size: 11px; }
#lab-skills .lab-s.passive .lab-sname { color: #b9ab90; }
#lab-skills .lab-s.passive .lab-icon { border-style: dashed; }
`;

/** Element made of plain divs: nothing takes keyboard focus, so Space / arrows keep driving the lab. */
function div(cls: string, text = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.className = cls;
  if (text) el.textContent = text;
  return el;
}

/**
 * Click-to-pick panel of the skill lab (`?skills`): the 10 factions (portraits) and the current faction's
 * castable skills with their original icons, grouped by learning tier, plus level / cast / auto buttons.
 */
export class SkillLabPanel {
  private root = div('');
  private style = document.createElement('style');
  private factionEls: HTMLDivElement[] = [];
  private skillEls: HTMLDivElement[] = [];
  private list = div('');
  private levelEl = div('lab-level');
  private autoEl = div('lab-btn', 'Tự đánh');
  private listFaction = -1;

  constructor(private hooks: LabPanelHooks) {
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    this.root.id = 'lab-panel';

    const factions = div('');
    factions.id = 'lab-factions';
    FACTION_IDS.forEach((id, i) => {
      const f = FACTIONS[id];
      const el = div('lab-f');
      el.title = `${f.name} · Hệ ${ELEMENT_NAMES[f.element]}`;
      const img = document.createElement('img');
      img.src = assetUrl(`portraits/${id}.png`);
      img.alt = '';
      img.draggable = false;
      const name = div('lab-fname', f.name);
      name.style.color = ELEMENT_COLORS[f.element];
      el.append(img, name);
      el.addEventListener('click', () => hooks.faction(i));
      factions.appendChild(el);
      this.factionEls.push(el);
    });

    const controls = div('');
    controls.id = 'lab-controls';
    const minus = div('lab-btn', '−'), plus = div('lab-btn', '+'), cast = div('lab-btn', 'Đánh');
    minus.title = 'Giảm cấp chiêu (phím −)';
    plus.title = 'Tăng cấp chiêu (phím +)';
    cast.title = 'Đánh cọc gỗ (Space)';
    this.autoEl.title = 'Tự đánh liên tục (A)';
    minus.addEventListener('click', () => hooks.level(-1));
    plus.addEventListener('click', () => hooks.level(1));
    cast.addEventListener('click', () => hooks.cast());
    this.autoEl.addEventListener('click', () => hooks.auto());
    controls.append(minus, this.levelEl, plus, cast, this.autoEl);

    this.list.id = 'lab-skills';
    this.root.append(div('lab-head', 'Môn phái'), factions, controls, div('lab-head', 'Chiêu'), this.list);
    document.body.appendChild(this.root);
    // Clicks on the panel stay off the game canvas underneath.
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
  }

  render(st: LabPanelState): void {
    this.factionEls.forEach((el, i) => el.classList.toggle('on', i === st.faction));
    if (this.listFaction !== st.faction || this.skillEls.length !== st.skills.length) this.buildList(st);
    this.skillEls.forEach((el, i) => el.classList.toggle('on', i === st.skillIndex));
    this.skillEls[st.skillIndex]?.scrollIntoView({ block: 'nearest' });
    this.levelEl.textContent = st.skills.length ? `Cấp ${st.level}/${st.maxLevel}` : '';
    this.autoEl.classList.toggle('on', st.auto);
  }

  private buildList(st: LabPanelState): void {
    this.listFaction = st.faction;
    this.skillEls = [];
    const index = new Map(st.skills.map((s, i) => [s.id, i]));
    const nodes: HTMLElement[] = [];
    for (const tier of learnTiers(FACTION_IDS[st.faction])) {
      const ids = tier.skills.filter(id => index.has(id));
      if (!ids.length) continue;
      nodes.push(div('lab-tier', tier.label));
      for (const id of ids) {
        const i = index.get(id)!, s = st.skills[i];
        const el = div(skillCategory(s) === 'passive' ? 'lab-s passive' : 'lab-s');
        const icon = div('lab-icon');
        const url = skillIconUrl(s);
        if (url) {
          const img = document.createElement('img');
          img.src = url;
          img.alt = '';
          img.draggable = false;
          icon.appendChild(img);
        }
        const name = div('lab-sname', s.name);
        name.appendChild(div('lab-sid', `#${s.id} · ${SKILL_CATEGORY_NAMES[skillCategory(s)]}${s.aura ? ' (hào quang)' : ''}`));
        el.append(icon, name);
        el.addEventListener('click', () => this.hooks.skill(i));
        this.skillEls[i] = el;
        nodes.push(el);
      }
    }
    if (!nodes.length) nodes.push(div('lab-sid', 'Phái này chưa có chiêu chủ động.'));
    this.list.replaceChildren(...nodes);
  }

  destroy(): void {
    this.root.remove();
    this.style.remove();
  }
}
