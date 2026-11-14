import { SPEED, resolveSpeed, validateSpeedConfiguration, trackBasePercent, type SpeedConfiguration, type SpeedPhase, ELEMENT_NAMES, FACTIONS, FACTION_IDS, SKILL_CATEGORY_NAMES, learnTiers, skillCategory, type Element, type SkillDef } from '@vltk/shared';
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
  source: string;
}

const ELEMENT_COLORS: Record<Element, string> = { kim: '#e8c879', moc: '#86d67d', thuy: '#86c8ff', hoa: '#ff8f63', tho: '#cfa877' };

const CSS = `
#lab-panel { box-sizing: border-box; max-width: calc(100vw - 16px); position: fixed; left: 8px; top: 76px; bottom: 8px; width: 330px; z-index: 20; display: flex; flex-direction: column; gap: 8px;
  background: #0c0905f0; border: 1px solid var(--border); border-radius: 6px; padding: 8px; font-size: 13px; color: #f1e6cf; user-select: none; }
.lab-main-title { font-size: 13px; font-weight: bold; color: var(--gold); text-align: center; letter-spacing: .06em; padding-bottom: 2px; }
#lab-panel .lab-head { color: var(--gold); font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }

#lab-tabs { display: flex; gap: 4px; border-bottom: 1px solid #4a3a20; padding-bottom: 6px; }
.lab-tab-btn { flex: 1; text-align: center; padding: 5px 8px; border: 1px solid #4a3a20; border-radius: 4px; background: #15100a; color: #b9ab90; cursor: pointer; font-size: 12px; font-weight: bold; }
.lab-tab-btn:hover { border-color: var(--border); background: #1f170e; color: #f1e6cf; }
.lab-tab-btn.on { border-color: var(--gold); background: #2a2010; color: var(--gold); box-shadow: 0 0 6px #e8c87955; }

#lab-tab-skills { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; min-height: 0; }
#lab-tab-speed { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 2px; min-height: 0; }

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

#lab-speed { display: grid; gap: 6px; border: 1px solid #4a3a20; padding: 6px; border-radius: 4px; background: #120e08; }
#lab-speed label { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
#lab-speed input[type=number] { width: 62px; }
#lab-speed input, #lab-speed select, #lab-speed button { color: #f1e6cf; background: #20190f; border: 1px solid #675137; padding: 3px 5px; border-radius: 3px; font-size: 12px; }
#lab-speed output { font-size: 11px; line-height: 1.4; color: #e8c879; white-space: pre-line; }
#lab-speed .lab-source { font-size: 11px; line-height: 1.4; color: #bfb59b; }

#lab-speed-tuning { margin-top: 4px; display: grid; gap: 6px; border: 1px solid #4a3a20; padding: 6px; border-radius: 4px; background: #100b06; }
.lab-subtabs { display: flex; gap: 4px; }
.lab-subtab-btn { flex: 1; text-align: center; padding: 4px 6px; border: 1px solid #4a3a20; border-radius: 3px; background: #15100a; color: #9d8c70; cursor: pointer; font-size: 11px; font-weight: bold; }
.lab-subtab-btn.on { border-color: var(--gold); background: #22180c; color: var(--gold); }

.lab-base-bar { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #18120a; border: 1px solid #3c2f1b; padding: 5px; border-radius: 4px; align-items: center; }
.lab-base-bar.has-stride { grid-template-columns: repeat(4, 1fr); }
.lab-base-bar label { display: flex; flex-direction: column; font-size: 10px; color: #bfb59b; gap: 2px; }
.lab-base-bar input { width: 100%; box-sizing: border-box; }
.lab-base-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 2px; }
.lab-base-actions button { font-size: 10px; padding: 2px 6px; cursor: pointer; }

.lab-phase-table { display: flex; flex-direction: column; gap: 2px; max-height: 200px; overflow-y: auto; padding-right: 2px; }
.lab-phase-header { display: grid; grid-template-columns: 1fr 1fr 28px; gap: 4px; font-size: 10px; color: #8d7c60; font-weight: bold; padding: 2px 4px; text-transform: uppercase; }
.lab-phase-header.run { grid-template-columns: 44px 36px 36px 30px 42px 50px 20px; gap: 3px; }

.lab-phase-row { display: grid; grid-template-columns: 1fr 1fr 28px; gap: 4px; align-items: center; padding: 1px 0; }
.lab-phase-row.run { grid-template-columns: 44px 36px 36px 30px 42px 50px 20px; gap: 3px; }
.lab-phase-row.is-base input { border-color: var(--gold); color: #fff3db; background: #2a2010; font-weight: bold; }
.lab-phase-row input { width: 100%; box-sizing: border-box; text-align: center; }
.lab-phase-row .btn-del { padding: 2px 0; text-align: center; cursor: pointer; border: 1px solid #4a2820; background: #20100c; color: #ff9988; border-radius: 3px; font-size: 11px; line-height: 1; }
.lab-phase-row .btn-del:hover { background: #3a1610; border-color: #ff5544; }
.btn-apply-row { padding: 3px 0; text-align: center; cursor: pointer; border: 1px solid #675137; background: #261e12; color: var(--gold); border-radius: 3px; font-size: 10px; font-weight: bold; line-height: 1; }
.btn-apply-row:hover { border-color: var(--gold); background: #3a2c1a; box-shadow: 0 0 4px #e8c87944; }
.lab-row-vel { font-size: 10px; color: #86c8ff; text-align: center; white-space: nowrap; font-family: monospace; }

.lab-table-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
.lab-table-footer button { padding: 2px 8px; font-size: 11px; cursor: pointer; }

.lab-global-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-top: 6px; }
.lab-global-actions button { padding: 5px 6px; cursor: pointer; font-size: 11px; font-weight: bold; }
.lab-global-actions .btn-copy { grid-column: span 2; background: #261e12; border-color: var(--gold); color: var(--gold); }
.lab-global-actions .btn-copy:hover { background: #352a19; box-shadow: 0 0 6px #e8c87955; }
.lab-error { color: #ff9988; font-size: 11px; min-height: 14px; }

@media(max-width:600px) { #lab-panel { width:220px!important; top:90px!important; } #lab-factions img { height:24px!important; width:30px!important; } #lab-panel .lab-fname { font-size:9px!important; } }
`;

/** Element made of plain divs: nothing takes keyboard focus, so Space / arrows keep driving the lab. */
function div(cls: string, text = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.className = cls;
  if (text) el.textContent = text;
  return el;
}

interface TrackTableController {
  container: HTMLDivElement;
  getPhases(): SpeedPhase[];
  getBasePercent(): number;
  getStridePixels?(): number;
  setPhases(phases: readonly SpeedPhase[], basePercent: number, defaultStride?: number): void;
}

function createPhaseTable(
  kind: 'attack' | 'run',
  initialPhases: readonly SpeedPhase[],
  basePercent: number,
  defaultStep: number,
  initialStride: number,
  onDirty: () => void,
): TrackTableController {
  const container = div('');
  container.className = 'lab-track-table';

  let currentPhases: SpeedPhase[] = initialPhases.map(p => ({ ...p }));
  let currentBasePct = basePercent;
  let currentDefaultStride = initialStride;

  // 1. Fixed Base Bar on top
  const isRun = kind === 'run';
  const baseBar = div(`lab-base-bar${isRun ? ' has-stride' : ''}`);

  const basePctLabel = document.createElement('label');
  basePctLabel.textContent = 'Base (%)';
  const basePctInput = document.createElement('input');
  basePctInput.type = 'number';
  basePctInput.value = String(basePercent);
  basePctLabel.appendChild(basePctInput);

  const baseFpsLabel = document.createElement('label');
  baseFpsLabel.textContent = 'Base FPS';
  const baseFpsInput = document.createElement('input');
  baseFpsInput.type = 'number';
  const initBasePhase = initialPhases.find(p => p.minPercent === basePercent) || initialPhases[0];
  baseFpsInput.value = String(initBasePhase?.fps ?? (isRun ? 6 : 14));
  baseFpsLabel.appendChild(baseFpsInput);

  const stepLabel = document.createElement('label');
  stepLabel.textContent = 'Step (+FPS)';
  const stepInput = document.createElement('input');
  stepInput.type = 'number';
  stepInput.value = String(defaultStep);
  stepLabel.appendChild(stepInput);

  let strideInput: HTMLInputElement | null = null;
  if (isRun) {
    const strideLabel = document.createElement('label');
    strideLabel.textContent = 'Sải nền (px)';
    strideInput = document.createElement('input');
    strideInput.type = 'number';
    strideInput.value = String(initialStride);
    strideLabel.appendChild(strideInput);
    baseBar.append(basePctLabel, baseFpsLabel, stepLabel, strideLabel);
  } else {
    baseBar.append(basePctLabel, baseFpsLabel, stepLabel);
  }

  const baseActions = div('lab-base-actions');
  const applyStepBtn = document.createElement('button');
  applyStepBtn.type = 'button';
  applyStepBtn.textContent = isRun ? 'Điền theo Step & Sải chân' : 'Điền tự động theo Step';
  applyStepBtn.title = 'Lấy Base làm chuẩn, mỗi hàng tiếp theo cộng dồn một lượng bằng Step';
  baseActions.appendChild(applyStepBtn);
  baseBar.appendChild(baseActions);

  // 2. Table Header
  const header = div(`lab-phase-header${isRun ? ' run' : ''}`);
  if (isRun) {
    header.append(div('', 'Mốc (%)'), div('', 'FPS'), div('', 'Step'), div('', 'Áp'), div('', 'Sải (px)'), div('', 'V.Tốc'), div('', ''));
  } else {
    header.append(div('', 'Mốc (%)'), div('', 'FPS'), div('', ''));
  }

  // 3. Rows container
  const tableRows = div('lab-phase-table');

  function renderRows(): void {
    tableRows.replaceChildren();
    const sorted = [...currentPhases].sort((a, b) => a.minPercent - b.minPercent);
    currentPhases = sorted;

    sorted.forEach((p, idx) => {
      const isBase = p.minPercent === currentBasePct;
      const row = div(`lab-phase-row${isRun ? ' run' : ''}${isBase ? ' is-base' : ''}`);

      const pctInput = document.createElement('input');
      pctInput.type = 'number';
      pctInput.value = String(p.minPercent);
      pctInput.title = isBase ? 'Mốc nền (Base)' : `Mốc % thứ ${idx + 1}`;
      pctInput.addEventListener('change', () => {
        const val = Number(pctInput.value);
        if (Number.isFinite(val)) {
          p.minPercent = val;
          onDirty();
        }
      });

      const fpsInput = document.createElement('input');
      fpsInput.type = 'number';
      fpsInput.value = String(p.fps);
      fpsInput.title = `FPS cho mốc ${p.minPercent}%`;

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-del';
      delBtn.textContent = '×';
      delBtn.title = 'Xóa mốc này';
      delBtn.addEventListener('click', () => {
        if (currentPhases.length <= 1) return;
        currentPhases = currentPhases.filter(item => item !== p);
        renderRows();
        onDirty();
      });

      if (isRun) {
        const strideVal = p.stride ?? currentDefaultStride;
        const strideRowInput = document.createElement('input');
        strideRowInput.type = 'number';
        strideRowInput.value = String(strideVal);
        strideRowInput.title = `Độ dài sải chân 1 chu kỳ bước (px) tại mốc ${p.minPercent}%`;

        const stepVal = p.step ?? (Number(stepInput.value) || 1);
        const rowStepInput = document.createElement('input');
        rowStepInput.type = 'number';
        rowStepInput.value = String(stepVal);
        rowStepInput.title = `Step (+FPS) cho mốc ${p.minPercent}%`;
        rowStepInput.addEventListener('change', () => {
          const val = Number(rowStepInput.value);
          if (Number.isFinite(val)) p.step = val;
        });

        const applyRowBtn = document.createElement('button');
        applyRowBtn.type = 'button';
        applyRowBtn.className = 'btn-apply-row';
        applyRowBtn.textContent = 'Áp';
        applyRowBtn.title = `Áp dụng Step ${rowStepInput.value} từ mốc ${p.minPercent}% cho tới các mốc còn lại`;
        applyRowBtn.addEventListener('click', () => {
          const startFps = p.fps;
          const sVal = Number(rowStepInput.value);
          if (!Number.isFinite(startFps) || !Number.isFinite(sVal)) return;
          p.step = sVal;
          for (let i = idx + 1; i < currentPhases.length; i++) {
            currentPhases[i].fps = startFps + (i - idx) * sVal;
          }
          renderRows();
          onDirty();
        });

        const velLabel = div('lab-row-vel', `${Math.round((p.fps / 8) * strideVal)} px/s`);

        fpsInput.addEventListener('change', () => {
          const val = Number(fpsInput.value);
          if (Number.isFinite(val) && val > 0) {
            p.fps = val;
            if (isBase) baseFpsInput.value = String(val);
            const curStride = p.stride ?? currentDefaultStride;
            velLabel.textContent = `${Math.round((p.fps / 8) * curStride)} px/s`;
            onDirty();
          }
        });

        strideRowInput.addEventListener('change', () => {
          const val = Number(strideRowInput.value);
          if (Number.isFinite(val) && val > 0) {
            p.stride = val;
            velLabel.textContent = `${Math.round((p.fps / 8) * val)} px/s`;
            onDirty();
          }
        });

        row.append(pctInput, fpsInput, rowStepInput, applyRowBtn, strideRowInput, velLabel, delBtn);
      } else {
        fpsInput.addEventListener('change', () => {
          const val = Number(fpsInput.value);
          if (Number.isFinite(val) && val > 0) {
            p.fps = val;
            if (isBase) baseFpsInput.value = String(val);
            onDirty();
          }
        });
        row.append(pctInput, fpsInput, delBtn);
      }

      tableRows.appendChild(row);
    });
  }

  // Base changes
  basePctInput.addEventListener('change', () => {
    const val = Number(basePctInput.value);
    if (Number.isFinite(val)) {
      currentBasePct = val;
      renderRows();
      onDirty();
    }
  });

  baseFpsInput.addEventListener('change', () => {
    const val = Number(baseFpsInput.value);
    if (Number.isFinite(val) && val > 0) {
      const baseP = currentPhases.find(p => p.minPercent === currentBasePct);
      if (baseP) baseP.fps = val;
      renderRows();
      onDirty();
    }
  });

  if (strideInput) {
    strideInput.addEventListener('change', () => {
      const val = Number(strideInput!.value);
      if (Number.isFinite(val) && val > 0) {
        currentDefaultStride = val;
        renderRows();
        onDirty();
      }
    });
  }

  // Apply step logic
  applyStepBtn.addEventListener('click', () => {
    const baseFps = Number(baseFpsInput.value);
    const step = Number(stepInput.value);
    if (!Number.isFinite(baseFps) || !Number.isFinite(step)) return;

    // Ensure base exists in current phases
    let baseIdx = currentPhases.findIndex(p => p.minPercent === currentBasePct);
    if (baseIdx < 0) {
      currentPhases.push({ minPercent: currentBasePct, fps: baseFps });
      currentPhases.sort((a, b) => a.minPercent - b.minPercent);
      baseIdx = currentPhases.findIndex(p => p.minPercent === currentBasePct);
    }

    currentPhases.forEach((p, i) => {
      if (i === baseIdx) {
        p.fps = baseFps;
      } else if (i > baseIdx) {
        p.fps = baseFps + (i - baseIdx) * step;
      } else {
        p.fps = Math.max(1, baseFps - (baseIdx - i) * step);
      }
      if (isRun && !p.stride) {
        p.stride = currentDefaultStride;
      }
    });

    renderRows();
    onDirty();
  });

  // 4. Footer: Add Row button
  const footer = div('lab-table-footer');
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ Thêm mốc mới';
  addBtn.addEventListener('click', () => {
    const last = currentPhases.at(-1);
    const step = Number(stepInput.value) || (isRun ? 1 : 2);
    const nextPct = last ? last.minPercent + 20 : 100;
    const nextFps = last ? last.fps + step : (isRun ? 10 : 20);
    const newPhase: SpeedPhase = { minPercent: nextPct, fps: nextFps };
    if (isRun) newPhase.stride = currentDefaultStride;
    currentPhases.push(newPhase);
    renderRows();
    onDirty();
  });
  footer.appendChild(addBtn);

  renderRows();
  container.append(baseBar, header, tableRows, footer);

  return {
    container,
    getPhases(): SpeedPhase[] {
      return currentPhases.map(p => ({ ...p }));
    },
    getBasePercent(): number {
      return currentBasePct;
    },
    getStridePixels(): number {
      return currentDefaultStride;
    },
    setPhases(phases: readonly SpeedPhase[], basePct: number, defaultStride?: number): void {
      currentPhases = phases.map(p => ({ ...p }));
      currentBasePct = basePct;
      basePctInput.value = String(basePct);
      const bPhase = phases.find(p => p.minPercent === basePct) || phases[0];
      if (bPhase) baseFpsInput.value = String(bPhase.fps);
      if (defaultStride && strideInput) {
        currentDefaultStride = defaultStride;
        strideInput.value = String(defaultStride);
      }
      renderRows();
    },
  };
}

/** Formats current speed configuration to exact TypeScript export string requested by user */
function formatSpeedCode(config: SpeedConfiguration): string {
  const formatAttackPhases = (phases: readonly SpeedPhase[]): string => {
    const lines: string[] = [];
    for (let i = 0; i < phases.length; i += 2) {
      const p1 = phases[i];
      const p2 = phases[i + 1];
      if (p2) {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps} }, { minPercent: ${p2.minPercent}, fps: ${p2.fps} },`);
      } else {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps} },`);
      }
    }
    return lines.join('\n');
  };

  const formatRunPhases = (phases: readonly SpeedPhase[]): string => {
    const lines: string[] = [];
    for (let i = 0; i < phases.length; i += 2) {
      const p1 = phases[i];
      const p2 = phases[i + 1];
      const s1 = p1.stride ? `, stride: ${p1.stride}` : '';
      const s2 = p2 ? (p2.stride ? `, stride: ${p2.stride}` : '') : '';
      if (p2) {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps}${s1} }, { minPercent: ${p2.minPercent}, fps: ${p2.fps}${s2} },`);
      } else {
        lines.push(`      { minPercent: ${p1.minPercent}, fps: ${p1.fps}${s1} },`);
      }
    }
    return lines.join('\n');
  };

  return `export const SPEED = {
  basePercent: ${config.basePercent},
  minPercent: ${config.minPercent},
  maxPercent: ${config.maxPercent},
  run: {
    basePercent: ${config.run.basePercent ?? 100},
    distanceScale: ${config.run.distanceScale},
    stridePixels: ${config.run.stridePixels ?? 120},
    horseStridePixels: ${config.run.horseStridePixels ?? 180},
    referenceFrames: ${config.run.referenceFrames},
    phases: [
${formatRunPhases(config.run.phases)}
    ],
  },
  attack: {
    basePercent: ${config.attack.basePercent ?? 10},
    referenceFrames: ${config.attack.referenceFrames},
    phases: [
${formatAttackPhases(config.attack.phases)}
    ],
  },
} as const;
`;
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

  // Tabs
  private tabSkillsBtn = div('lab-tab-btn on', 'Chiêu thức');
  private tabSpeedBtn = div('lab-tab-btn', 'Tốc độ');
  private tabSkillsContent = div('');
  private tabSpeedContent = div('');

  // Speed controls
  private attackInput = document.createElement('input');
  private runInput = document.createElement('input');
  private modeInput = document.createElement('select');
  private mountedInput = document.createElement('input');
  private speedInfo = document.createElement('output');
  private sourceInfo = div('lab-source');
  private speedPresets: HTMLSelectElement[] = [];

  // Track tables
  private attackTableCtrl!: TrackTableController;
  private runTableCtrl!: TrackTableController;
  private lastConfig: SpeedConfiguration = SPEED;
  private configKey = '';

  constructor(private hooks: LabPanelHooks) {
    this.style.textContent = CSS;
    document.head.appendChild(this.style);
    this.root.id = 'lab-panel';

    // Top Tab Switcher
    const tabs = div('');
    tabs.id = 'lab-tabs';
    tabs.append(this.tabSkillsBtn, this.tabSpeedBtn);
    this.tabSkillsBtn.addEventListener('click', () => this.switchTab('skills'));
    this.tabSpeedBtn.addEventListener('click', () => this.switchTab('speed'));

    // --- Tab 1: Chiêu thức ---
    this.tabSkillsContent.id = 'lab-tab-skills';
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
    this.tabSkillsContent.append(div('lab-head', 'Môn phái'), factions, controls, div('lab-head', 'Chiêu'), this.list);

    // --- Tab 2: Tốc độ ---
    this.tabSpeedContent.id = 'lab-tab-speed';
    this.tabSpeedContent.style.display = 'none';
    this.tabSpeedContent.append(this.buildSpeedControls());

    this.root.append(div('lab-main-title', 'VTLK - SKILL Test'), tabs, this.tabSkillsContent, this.tabSpeedContent);
    document.body.appendChild(this.root);
    // Clicks on the panel stay off the game canvas underneath.
    this.root.addEventListener('pointerdown', e => e.stopPropagation());
  }

  switchTab(tab: 'skills' | 'speed'): void {
    const isSkills = tab === 'skills';
    this.tabSkillsBtn.classList.toggle('on', isSkills);
    this.tabSpeedBtn.classList.toggle('on', !isSkills);
    this.tabSkillsContent.style.display = isSkills ? 'flex' : 'none';
    this.tabSpeedContent.style.display = isSkills ? 'none' : 'flex';
  }

  private buildCurrentConfig(): SpeedConfiguration {
    const attackPhases = this.attackTableCtrl.getPhases();
    const runPhases = this.runTableCtrl.getPhases();
    if (!attackPhases.length || !runPhases.length) {
      throw new Error('Bảng mốc không được để trống.');
    }

    const config: SpeedConfiguration = structuredClone(this.lastConfig || SPEED);
    const runBase = this.runTableCtrl.getBasePercent();
    const attackBase = this.attackTableCtrl.getBasePercent();
    config.attack = { ...config.attack, basePercent: attackBase, phases: attackPhases };
    config.run = {
      ...config.run,
      basePercent: runBase,
      phases: runPhases,
      stridePixels: this.runTableCtrl.getStridePixels ? this.runTableCtrl.getStridePixels() : (config.run.stridePixels ?? 120),
    };

    // Auto update minPercent / maxPercent from phases
    const allMin = Math.min(...attackPhases.map(p => p.minPercent), ...runPhases.map(p => p.minPercent));
    const allMax = Math.max(...attackPhases.map(p => p.minPercent), ...runPhases.map(p => p.minPercent));
    if (Number.isFinite(allMin) && allMin > 0) config.minPercent = allMin;
    if (Number.isFinite(allMax) && allMax >= 10) config.maxPercent = allMax;
    return config;
  }

  private buildSpeedControls(): HTMLElement {
    const box = div(''); box.id = 'lab-speed';
    const attackBase = trackBasePercent('attack', SPEED);
    const runBase = trackBasePercent('run', SPEED);
    box.append(div('lab-head', `Thử tốc độ · Đánh nền ${attackBase}% · Chạy nền ${runBase}%`));

    // Attack speed row
    {
      const row = document.createElement('label'); row.textContent = 'Đánh tổng %';
      this.attackInput.type = 'number'; this.attackInput.step = '1'; this.attackInput.value = String(attackBase);
      this.attackInput.id = 'lab-attack-percent';
      this.attackInput.addEventListener('input', () => {
        if (this.attackInput.value !== '' && Number.isFinite(this.attackInput.valueAsNumber)) {
          this.hooks.speed('attack', this.attackInput.valueAsNumber);
        }
      });
      const preset = document.createElement('select'); preset.setAttribute('aria-label', 'Mốc đánh');
      preset.addEventListener('change', () => {
        this.attackInput.value = preset.value;
        this.hooks.speed('attack', Number(preset.value));
      });
      this.speedPresets.push(preset);
      row.append(this.attackInput, preset);
      box.append(row);
    }

    // Run speed row
    {
      const row = document.createElement('label'); row.textContent = 'Chạy tổng %';
      this.runInput.type = 'number'; this.runInput.step = '1'; this.runInput.value = String(runBase);
      this.runInput.id = 'lab-run-percent';
      this.runInput.addEventListener('input', () => {
        if (this.runInput.value !== '' && Number.isFinite(this.runInput.valueAsNumber)) {
          this.hooks.speed('run', this.runInput.valueAsNumber);
        }
      });
      const preset = document.createElement('select'); preset.setAttribute('aria-label', 'Mốc chạy');
      preset.addEventListener('change', () => {
        this.runInput.value = preset.value;
        this.hooks.speed('run', Number(preset.value));
      });
      this.speedPresets.push(preset);
      row.append(this.runInput, preset);
      box.append(row);
    }

    const mode = document.createElement('label'); mode.textContent = 'Chế độ'; this.modeInput.id = 'lab-speed-mode';
    for (const [value, text] of [['idle','Đứng'],['attack','Tự đánh'],['run','Tự chạy'],['both','Chạy & đánh']]) {
      this.modeInput.add(new Option(text, value));
    }
    this.modeInput.addEventListener('change', () => this.hooks.mode(this.modeInput.value));
    mode.append(this.modeInput);

    const mounted = document.createElement('label'); this.mountedInput.type = 'checkbox'; this.mountedInput.id = 'lab-mounted';
    this.mountedInput.addEventListener('change', () => this.hooks.mounted(this.mountedInput.checked));
    mounted.append(this.mountedInput, 'Cưỡi ngựa (sải chân dài hơn)');

    this.speedInfo.id = 'lab-speed-info';
    this.sourceInfo.id = 'lab-speed-source';

    // Tuning section with 2 sub-tabs (Mốc Đánh & Mốc Chạy)
    const tuningBox = div('');
    tuningBox.id = 'lab-speed-tuning';
    tuningBox.append(div('lab-head', 'Cài đặt mốc speed · theo hàng & sải chân'));

    const subtabs = div('lab-subtabs');
    const attackSubtabBtn = div('lab-subtab-btn on', 'Mốc Tốc Độ Đánh');
    const runSubtabBtn = div('lab-subtab-btn', 'Mốc Tốc Độ Chạy');
    subtabs.append(attackSubtabBtn, runSubtabBtn);

    const error = div('lab-error'); error.setAttribute('role', 'alert');
    const onDirty = () => { error.textContent = ''; };

    this.attackTableCtrl = createPhaseTable('attack', SPEED.attack.phases, attackBase, 3, 0, onDirty);
    this.runTableCtrl = createPhaseTable('run', SPEED.run.phases, runBase, 2, SPEED.run.stridePixels ?? 120, onDirty);

    this.runTableCtrl.container.style.display = 'none';

    attackSubtabBtn.addEventListener('click', () => {
      attackSubtabBtn.classList.add('on');
      runSubtabBtn.classList.remove('on');
      this.attackTableCtrl.container.style.display = 'block';
      this.runTableCtrl.container.style.display = 'none';
    });

    runSubtabBtn.addEventListener('click', () => {
      runSubtabBtn.classList.add('on');
      attackSubtabBtn.classList.remove('on');
      this.runTableCtrl.container.style.display = 'block';
      this.attackTableCtrl.container.style.display = 'none';
    });

    // Global action buttons
    const actions = div('lab-global-actions');
    const apply = document.createElement('button');
    apply.textContent = 'Áp dụng bảng thử';
    apply.type = 'button';
    apply.title = 'Áp dụng cả bảng mốc đánh và mốc chạy vào game';

    const reset = document.createElement('button');
    reset.textContent = 'Khôi phục mặc định';
    reset.type = 'button';
    reset.title = 'Khôi phục bảng mốc chuẩn ban đầu';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'btn-copy';
    copyBtn.textContent = '📋 Sao chép mã SPEED (TypeScript)';
    copyBtn.type = 'button';
    copyBtn.title = 'Sao chép toàn bộ khối mã export const SPEED = { ... } as const; để dán vào tuning.ts';

    actions.append(apply, reset, copyBtn);

    apply.addEventListener('click', () => {
      try {
        const config = this.buildCurrentConfig();
        validateSpeedConfiguration(config);
        this.hooks.configuration(config);
        error.textContent = '';
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : String(e);
      }
    });

    reset.addEventListener('click', () => {
      const config = structuredClone(SPEED);
      const aBase = trackBasePercent('attack', config);
      const rBase = trackBasePercent('run', config);
      this.attackTableCtrl.setPhases(config.attack.phases, aBase);
      this.runTableCtrl.setPhases(config.run.phases, rBase, config.run.stridePixels ?? 120);
      this.hooks.configuration(config);
      error.textContent = '';
    });

    copyBtn.addEventListener('click', async () => {
      try {
        const config = this.buildCurrentConfig();
        const code = formatSpeedCode(config);
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(code);
        } else {
          const ta = document.createElement('textarea');
          ta.value = code;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
        }
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Đã sao chép mã SPEED vào bộ nhớ đệm!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
        error.textContent = '';
      } catch (e) {
        error.textContent = e instanceof Error ? e.message : String(e);
      }
    });

    tuningBox.append(subtabs, this.attackTableCtrl.container, this.runTableCtrl.container, actions, error);
    box.append(mode, mounted, this.speedInfo, this.sourceInfo, tuningBox);
    return box;
  }

  render(st: LabPanelState): void {
    this.sourceInfo.textContent = st.source;
    if (document.activeElement !== this.attackInput) this.attackInput.value = String(st.attackPercent);
    if (document.activeElement !== this.runInput) this.runInput.value = String(st.runPercent);
    this.modeInput.value = st.autoRun ? st.auto ? 'both' : 'run' : st.auto ? 'attack' : 'idle';
    this.mountedInput.checked = st.mounted;
    this.lastConfig = st.config;

    const configKey = JSON.stringify(st.config);
    if (configKey !== this.configKey) {
      this.configKey = configKey;
      this.speedPresets[0]?.replaceChildren(...st.config.attack.phases.map(p => new Option(`${p.minPercent}%`, String(p.minPercent))));
      this.speedPresets[1]?.replaceChildren(...st.config.run.phases.map(p => new Option(`${p.minPercent}%`, String(p.minPercent))));
    }

    const attack = resolveSpeed('attack', st.attackPercent, st.config), run = resolveSpeed('run', st.runPercent, st.config, st.mounted);
    if (this.speedPresets[0]) this.speedPresets[0].value = String(attack.phasePercent);
    if (this.speedPresets[1]) this.speedPresets[1].value = String(run.phasePercent);
    this.speedInfo.textContent = `Giới hạn ${st.config.minPercent}–${st.config.maxPercent}%\nĐánh: mốc ${attack.phasePercent}% · ${attack.fps} FPS · ${Math.round(attack.cycleMs)} ms/đòn\nChạy: mốc ${run.phasePercent}% · ${run.fps} FPS · Sải ${run.stridePixels}px · V.Tốc ${Math.round(run.velocity ?? 0)} px/s · ${Math.round(run.cycleMs)} ms/vòng\nTốc đánh mới áp dụng từ đòn kế tiếp; giữ hồi chiêu riêng.`;

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
    const tiers = learnTiers(FACTION_IDS[st.faction]);
    const imported = st.skills.filter(s => !tiers.some(t => t.skills.includes(s.id))).map(s => s.id);
    for (const tier of [{ label: 'Chiêu từ nhân vật', skills: imported }, ...tiers]) {
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
