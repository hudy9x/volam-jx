import { SPEED, resolveSpeed, validateSpeedConfiguration, type SpeedConfiguration, ELEMENT_NAMES, FACTIONS, FACTION_IDS, SKILL_CATEGORY_NAMES, learnTiers, skillCategory, type Element, type SkillDef } from '@vltk/shared';
import { skillIconUrl } from '../../art/icons';
import { assetUrl } from '../../art/assets';

export interface LabPanelHooks {
  faction(index: number): void;
  skill(index: number): void;
  level(delta: number): void;
  cast(): void;
  auto(): void;
  speed(kind: 'run' | 'attack', percent: number): void;
  mode(mode: string): void;
  mounted(on: boolean): void;
  configuration(config: SpeedConfiguration): void;
}

export interface LabPanelState {
  faction: number;
  skillIndex: number;
  /** Castable skills of the faction, in tier order (same order as ←/→). */
  skills: SkillDef[];
  level: number;
  maxLevel: number;
  auto: boolean;
  autoRun: boolean;
  mounted: boolean;
  attackPercent: number;
  runPercent: number;
  config: SpeedConfiguration;
}

const ELEMENT_COLORS: Record<Element, string> = { kim: '#e8c879', moc: '#86d67d', thuy: '#86c8ff', hoa: '#ff8f63', tho: '#cfa877' };

const CSS = `
#lab-panel { box-sizing:border-box; max-width:calc(100vw - 16px); overflow-y:auto; }
#lab-speed { display:grid; gap:5px; border:1px solid #4a3a20; padding:6px; }
#lab-speed label { display:flex; align-items:center; gap:4px; flex-wrap:wrap; }
#lab-speed input[type=number] { width:65px; }
#lab-speed input,#lab-speed select,#lab-speed button,#lab-speed textarea { color:#f1e6cf; background:#20190f; border:1px solid #675137; padding:4px; }
#lab-speed output { font-size:11px; line-height:1.4; color:#e8c879; white-space:pre-line; }
#lab-speed textarea { width:100%; height:140px; box-sizing:border-box; font-size:11px; }
#lab-speed details { font-size:12px; }
#lab-speed summary { cursor:pointer; }
#lab-speed .lab-error { color:#ff9988; font-size:11px; }
@media(max-width:600px) { #lab-panel { width:220px!important; top:90px!important; } #lab-factions img { height:24px!important; width:30px!important; } #lab-panel .lab-fname { font-size:9px!important; } }

#lab-panel { position: fixed; left: 8px; top: 76px; bottom: 8px; width: 300px; z-index: 20; display: flex; flex-direction: column; gap: 8px;
  background: #0c0905e6; border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 13px; color: #f1e6cf; user-select: none; }
#lab-panel .lab-head { color: var(--gold); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
#lab-factions { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
#lab-factions .lab-f { display: grid; justify-items: center; gap: 1px; padding: 3px 2px 2px; border: 1px solid #4a3a20; border-radius: 4px;
  background: #15100a; cursor: pointer; }
#lab-factions .lab-f:hover { border-color: var(--border); background: #1f170e; }
#lab-factions .lab-f.on { border-color: var(--gold); background: #2a2010; box-shadow: 0 0 6px #e8c87955; }
#lab-factions img { height: 38px; width: 46px; object-fit: contain; image-rendering: pixelated; pointer-events: none; }
#lab-factions .lab-fname { font-size: 11px; line-height: 1.1; white-space: nowrap; max-width:100%; overflow:hidden; text-overflow:ellipsis; pointer-events: none; }
#lab-controls { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
#lab-controls .lab-btn { padding: 3px 8px; border: 1px solid #4a3a20; border-radius: 4px; background: #1a140c; cursor: pointer; }
#lab-controls .lab-btn:hover { border-color: var(--gold); }
#lab-controls .lab-btn.on { border-color: var(--gold); color: var(--gold); }
#lab-controls .lab-level { min-width: 62px; text-align: center; }
#lab-skills { flex: 1; min-height: 90px; overflow-y: auto; display: grid; align-content: start; gap: 2px; padding-right: 2px; }
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
  private attackInput = document.createElement('input');
  private runInput = document.createElement('input');
  private modeInput = document.createElement('select');
  private mountedInput = document.createElement('input');
  private speedInfo = document.createElement('output');
  private configInput = document.createElement('textarea');
  private speedPresets: HTMLSelectElement[] = [];
  private configKey = '';

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
    this.root.append(div('lab-head', 'Môn phái'), factions, controls, this.buildSpeedControls(), div('lab-head', 'Chiêu'), this.list);
    document.body.appendChild(this.root);
    // Clicks on the panel stay off the game canvas underneath.
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
  }

  private buildSpeedControls(): HTMLElement {
    const box = div(''); box.id = 'lab-speed';
    box.append(div('lab-head', 'Thử tốc độ · 100% = tốc nền'));
    for (const [kind, text, input] of [['attack', 'Đánh', this.attackInput], ['run', 'Chạy', this.runInput]] as const) {
      const row = document.createElement('label'); row.textContent = text + ' %';
      input.type = 'number'; input.step = '1'; input.value = '100'; input.id = `lab-${kind}-percent`;
      input.addEventListener('input', () => { if (input.value !== '' && Number.isFinite(input.valueAsNumber)) this.hooks.speed(kind, input.valueAsNumber); });
      const preset = document.createElement('select'); preset.setAttribute('aria-label', `Mốc ${text.toLowerCase()}`);
      preset.addEventListener('change', () => { input.value = preset.value; this.hooks.speed(kind, Number(preset.value)); });
      this.speedPresets.push(preset); row.append(input, preset); box.append(row);
    }
    const mode = document.createElement('label'); mode.textContent = 'Chế độ'; this.modeInput.id = 'lab-speed-mode';
    for (const [value, text] of [['idle','Đứng'],['attack','Tự đánh'],['run','Tự chạy'],['both','Chạy & đánh']]) this.modeInput.add(new Option(text,value));
    this.modeInput.addEventListener('change', () => this.hooks.mode(this.modeInput.value)); mode.append(this.modeInput);
    const mounted = document.createElement('label'); this.mountedInput.type = 'checkbox'; this.mountedInput.id = 'lab-mounted';
    this.mountedInput.addEventListener('change', () => this.hooks.mounted(this.mountedInput.checked)); mounted.append(this.mountedInput, 'Cưỡi ngựa (cùng tổng tốc đã nhập)');
    this.speedInfo.id = 'lab-speed-info';
    const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Cài đặt bảng mốc · chỉ phiên thử';
    this.configInput.id = 'lab-speed-config'; this.configInput.value = JSON.stringify(SPEED, null, 2);
    this.configInput.setAttribute('aria-label', 'Cấu hình mốc tốc độ JSON');
    const apply = document.createElement('button'); apply.textContent = 'Áp dụng bảng thử'; apply.type = 'button';
    const reset = document.createElement('button'); reset.textContent = 'Khôi phục mặc định'; reset.type = 'button';
    const error = div('lab-error'); error.setAttribute('role','alert');
    apply.addEventListener('click', () => {
      try { const config = JSON.parse(this.configInput.value) as SpeedConfiguration; validateSpeedConfiguration(config); this.hooks.configuration(config); error.textContent = ''; }
      catch (e) { error.textContent = e instanceof Error ? e.message : String(e); }
    });
    reset.addEventListener('click', () => { const config = structuredClone(SPEED); this.configInput.value = JSON.stringify(config,null,2); this.hooks.configuration(config); error.textContent = ''; });
    details.append(summary, this.configInput, apply, reset, error);
    box.append(mode, mounted, this.speedInfo, details);
    return box;
  }

  render(st: LabPanelState): void {
    if (document.activeElement !== this.attackInput) this.attackInput.value = String(st.attackPercent);
    if (document.activeElement !== this.runInput) this.runInput.value = String(st.runPercent);
    this.modeInput.value = st.autoRun ? st.auto ? 'both' : 'run' : st.auto ? 'attack' : 'idle';
    this.mountedInput.checked = st.mounted;
    const configKey = JSON.stringify(st.config);
    if (configKey !== this.configKey) {
      this.configKey = configKey;
      this.speedPresets.forEach((el,i) => el.replaceChildren(...st.config[i === 0 ? 'attack' : 'run'].phases.map(p => new Option(`${p.minPercent}%`,String(p.minPercent)))));
    }
    const attack = resolveSpeed('attack', st.attackPercent, st.config), run = resolveSpeed('run', st.runPercent, st.config);
    this.speedPresets[0].value = String(attack.phasePercent); this.speedPresets[1].value = String(run.phasePercent);
    this.speedInfo.textContent = `Giới hạn ${st.config.minPercent}–${st.config.maxPercent}%\nĐánh: mốc ${attack.phasePercent}% · ${attack.fps} FPS chuẩn · ${Math.round(attack.cycleMs)} ms/đòn\nChạy: mốc ${run.phasePercent}% · ${run.fps} FPS chuẩn · ${Math.round(run.cycleMs)} ms/vòng\nTốc đánh mới áp dụng từ đòn kế tiếp; giữ hồi chiêu riêng.`;

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
