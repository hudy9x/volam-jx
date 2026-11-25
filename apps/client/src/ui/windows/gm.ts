import {
  DEFAULT_SPEED,
  attrOf,
  formatSpeedCode,
  getActiveSpeedConfig,
  getExpElixirConfig,
  getWildHorseConfig,
  resetSpeedConfig,
  resolveSpeed,
  setActiveSpeedConfig,
  setExpElixirConfig,
  setWildHorseConfig,
  speedPoints,
  trackBasePercent,
  validateSpeedConfiguration,
  type SpeedConfiguration,
  type SpeedPhase,
} from '@vltk/shared';
import { SERVER_URL } from '../../net/api';
import { progress } from '../../state/progress';
import type { HudContext } from '../hud/context';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import './gm.css';

const ID = 'gm-dlg';

interface PhaseTableCtrl {
  container: HTMLElement;
  getPhases(): SpeedPhase[];
  getBasePercent(): number;
  getStridePixels?(): number;
  getHorseStridePixels?(): number;
  getDistanceScale?(): number;
  setPhases(phases: readonly SpeedPhase[], basePercent: number, stride?: number, horseStride?: number, distScale?: number): void;
}

export class GmToolWindow {
  private currentConfig: SpeedConfiguration;
  private initialConfig: SpeedConfiguration;
  private runTableCtrl!: PhaseTableCtrl;
  private attackTableCtrl!: PhaseTableCtrl;
  private statusEl!: HTMLElement;

  // Live player testing state
  private liveRunPercent = 100;
  private liveAttackPercent = 10;
  private liveMounted = false;

  constructor(parent: HTMLElement, private ctx: HudContext) {
    this.initialConfig = structuredClone(getActiveSpeedConfig());

    // Restore cached dev speed from localStorage if available
    try {
      const cached = localStorage.getItem('vltk.dev_speed');
      if (cached) {
        const parsed = JSON.parse(cached) as SpeedConfiguration;
        validateSpeedConfiguration(parsed);
        setActiveSpeedConfig(parsed);
      }
    } catch {
      // ignore invalid cached speed
    }

    this.currentConfig = structuredClone(getActiveSpeedConfig());

    const HTML = `
<section id="${ID}" class="dlg hidden" data-title="GM Tool · Thử Nghiệm Tốc Độ">
  <div class="gm-tabs" role="tablist">
    <button type="button" class="gm-tab on" id="gm-tab-speed">Tốc độ Di chuyển & Đánh</button>
    <button type="button" class="gm-tab" id="gm-tab-exp">Tiên Thảo Lộ (EXP)</button>
    <button type="button" class="gm-tab" id="gm-tab-horse">Ngựa hoang (9101)</button>
  </div>

  <div id="gm-panel-speed">
  <!-- Live Player Controls Box -->
  <div class="gm-box">
    <div class="gm-box-title">
      <span>1. Thử nghiệm trực tiếp trên nhân vật (Live Test)</span>
      <span style="font-size:10px; color:#86c8ff; text-transform:none;">Áp dụng ngay không cần tháo đồ</span>
    </div>
    <div class="gm-live-grid">
      <!-- Run Speed Test -->
      <div class="gm-live-card">
        <h4>Tốc độ Chạy (Di chuyển)</h4>
        <div class="gm-row">
          <label>Mức %: <input type="number" id="gm-live-run-input" min="50" max="260" step="5" value="100" /></label>
          <label><input type="checkbox" id="gm-live-mounted" /> Cưỡi ngựa</label>
        </div>
        <div class="gm-row">
          <input type="range" id="gm-live-run-slider" min="50" max="260" step="10" value="100" />
        </div>
        <div class="gm-presets" id="gm-run-presets">
          ${[50, 70, 100, 120, 140, 160, 180, 200, 220, 240, 260]
            .map(p => `<button type="button" class="gm-preset-btn${p === 100 ? ' active' : ''}" data-pct="${p}">${p}%</button>`)
            .join('')}
        </div>
        <div class="gm-val-info" id="gm-live-run-info">F3: 10 điểm | 8 FPS (1000ms/vòng) | 120 px/s</div>
      </div>

      <!-- Attack Speed Test -->
      <div class="gm-live-card">
        <h4>Tốc độ Đánh / Xuất chiêu</h4>
        <div class="gm-row">
          <label>Mức %: <input type="number" id="gm-live-attack-input" min="5" max="260" step="5" value="10" /></label>
        </div>
        <div class="gm-row">
          <input type="range" id="gm-live-attack-slider" min="5" max="260" step="5" value="10" />
        </div>
        <div class="gm-presets" id="gm-attack-presets">
          ${[5, 10, 20, 30, 50, 70, 85, 110, 130, 150, 180, 220, 260]
            .map(p => `<button type="button" class="gm-preset-btn${p === 10 ? ' active' : ''}" data-pct="${p}">${p}%</button>`)
            .join('')}
        </div>
        <div class="gm-val-info" id="gm-live-attack-info">Ngoại/Nội công: 14 FPS | 1429 ms/đòn</div>
      </div>
    </div>

    <div class="gm-live-actions">
      <button type="button" class="btn primary" id="gm-live-apply">⚡ Áp dụng tốc độ cho nhân vật</button>
      <button type="button" class="btn" id="gm-live-restore">Hủy override (Về tốc độ đồ thật)</button>
    </div>
  </div>

  <!-- Tuning & Table Box -->
  <div class="gm-box">
    <div class="gm-box-title">
      <span>2. Cài đặt Frame, Sải chân, Quãng đường (Bảng mốc SPEED)</span>
    </div>

    <div class="gm-subtabs">
      <button type="button" class="gm-subtab-btn on" id="gm-subtab-run">Mốc Tốc Độ Chạy</button>
      <button type="button" class="gm-subtab-btn" id="gm-subtab-attack">Mốc Tốc Độ Đánh</button>
    </div>

    <div id="gm-tuning-tables"></div>
  </div>

  <!-- Status and Global Actions -->
  <div class="gm-status-bar" id="gm-status">Sẵn sàng thử nghiệm và trích xuất cấu hình.</div>
  <div class="gm-global-bar">
    <button type="button" class="gm-btn-apply" id="gm-act-apply-game">Áp dụng bảng vào Game</button>
    <button type="button" class="gm-btn-save" id="gm-act-save">💾 Lưu cài đặt (Save)</button>
    <button type="button" class="gm-btn-reset" id="gm-act-reset">↺ Khôi phục gốc (Reset)</button>
    <button type="button" class="gm-btn-copy" id="gm-act-copy">📋 Sao chép mã TS</button>
  </div>
  </div>

  <div id="gm-panel-exp" hidden>
    <div class="gm-box">
      <div class="gm-box-title">
        <span>Hệ số nhân kinh nghiệm Tiên Thảo Lộ</span>
        <span style="font-size:10px; color:#86c8ff; text-transform:none;">Áp dụng khi đánh quái (vd: 2, 10, 100)</span>
      </div>
      <div class="gm-live-grid">
        <div class="gm-live-card">
          <h4>Tiên Thảo Lộ (1 giờ)</h4>
          <div class="gm-row">
            <label>Nhân lần: <input type="number" id="gm-exp-normal" min="1" max="10000" step="1" value="${getExpElixirConfig().normal}" /></label>
          </div>
          <div class="gm-row">
            ${[2, 5, 10, 50, 100].map(m => `<button type="button" class="gm-preset-btn gm-exp-preset" data-tier="normal" data-val="${m}">×${m}</button>`).join('')}
          </div>
        </div>
        <div class="gm-live-card">
          <h4>Tiên Thảo Lộ đặc biệt (8 giờ)</h4>
          <div class="gm-row">
            <label>Nhân lần: <input type="number" id="gm-exp-special" min="1" max="10000" step="1" value="${getExpElixirConfig().special}" /></label>
          </div>
          <div class="gm-row">
            ${[2, 5, 10, 50, 100].map(m => `<button type="button" class="gm-preset-btn gm-exp-preset" data-tier="special" data-val="${m}">×${m}</button>`).join('')}
          </div>
        </div>
      </div>
    </div>
    <div class="gm-status-bar" id="gm-exp-status">Có thể đặt hệ số tùy ý (×2, ×10, ×100...) và lưu áp dụng ngay.</div>
    <div class="gm-global-bar">
      <button type="button" class="gm-btn-save" id="gm-exp-save">💾 Lưu hệ số EXP</button>
    </div>
  </div>

  <div id="gm-panel-horse" hidden>
    <div class="gm-box">
      <div class="gm-box-title">
        <span>Chế độ TEST & Tỉ lệ rơi ngựa (Map 9101)</span>
        <span style="font-size:10px; color:#86c8ff; text-transform:none;">Áp dụng nóng không cần restart server</span>
      </div>
      <div class="gm-live-grid">
        <div class="gm-live-card">
          <h4>Chế độ TEST (HP cực thấp)</h4>
          <div class="gm-row">
            <label><input type="checkbox" id="gm-horse-test-mode" /> Bật chế độ TEST (đặt toàn bộ ngựa hoang về 500 HP, giữ nguyên sát thương & các chỉ số khác)</label>
          </div>
          <div class="gm-row">
            <label>HP khi TEST: <input type="number" id="gm-horse-test-hp" min="1" max="10000000" step="100" value="${getWildHorseConfig().testHp}" /></label>
          </div>
        </div>
        <div class="gm-live-card">
          <h4>Tỉ lệ rơi ngựa (%) theo bậc</h4>
          <div class="gm-row">
            <label>Tuấn mã 120–130 (rare %): <input type="number" id="gm-horse-rate-rare" min="0" max="100" step="1" value="${Math.round(getWildHorseConfig().tiers.rare.dropRate * 100)}" /></label>
          </div>
          <div class="gm-row">
            <label>Thần mã 140–150 (epic %): <input type="number" id="gm-horse-rate-epic" min="0" max="100" step="1" value="${Math.round(getWildHorseConfig().tiers.epic.dropRate * 100)}" /></label>
          </div>
          <div class="gm-row">
            <label>Tuyệt thế Thần mã (mythic %): <input type="number" id="gm-horse-rate-mythic" min="0" max="100" step="1" value="${Math.round(getWildHorseConfig().tiers.mythic.dropRate * 100)}" /></label>
          </div>
          <div class="gm-row">
            <button type="button" class="gm-preset-btn" id="gm-horse-preset-100">100% (Test nhặt)</button>
            <button type="button" class="gm-preset-btn" id="gm-horse-preset-default">Mặc định (25 / 18 / 12%)</button>
          </div>
        </div>
      </div>
    </div>
    <div class="gm-status-bar" id="gm-horse-status">Chỉnh tỉ lệ rơi hoặc bật chế độ TEST 500 HP rồi bấm Lưu để áp dụng ngay trên Map 9101.</div>
    <div class="gm-global-bar">
      <button type="button" class="gm-btn-save" id="gm-horse-save">💾 Lưu & Áp dụng ngay</button>
    </div>
  </div>
</section>`;

    mount(parent, HTML);
    dialogs.register(ID);
    this.statusEl = $('gm-status')!;

    this.initTuningTables();
    this.bindLiveControls();
    this.bindGlobalActions();
    this.bindExpControls();
    this.bindWildHorseControls();
  }

  private bindExpControls(): void {
    const tabSpeed = $('gm-tab-speed')!;
    const tabExp = $('gm-tab-exp')!;
    const tabHorse = $('gm-tab-horse')!;
    const panelSpeed = $('gm-panel-speed')!;
    const panelExp = $('gm-panel-exp')!;
    const panelHorse = $('gm-panel-horse')!;
    const selectMainTab = (which: 'speed' | 'exp' | 'horse') => {
      tabSpeed.classList.toggle('on', which === 'speed');
      tabExp.classList.toggle('on', which === 'exp');
      tabHorse.classList.toggle('on', which === 'horse');
      panelSpeed.hidden = which !== 'speed';
      panelExp.hidden = which !== 'exp';
      panelHorse.hidden = which !== 'horse';
      if (which === 'exp') void this.loadExpConfig();
      if (which === 'horse') void this.loadWildHorseConfig();
    };
    tabSpeed.addEventListener('click', () => selectMainTab('speed'));
    tabExp.addEventListener('click', () => selectMainTab('exp'));
    tabHorse.addEventListener('click', () => selectMainTab('horse'));

    const normalInput = $('gm-exp-normal') as HTMLInputElement;
    const specialInput = $('gm-exp-special') as HTMLInputElement;
    panelExp.querySelectorAll<HTMLButtonElement>('.gm-exp-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val ?? '2';
        if (btn.dataset.tier === 'special') specialInput.value = val;
        else normalInput.value = val;
      });
    });

    $('gm-exp-save')?.addEventListener('click', async () => {
      const normal = Math.max(1, Number(normalInput.value) || 2);
      const special = Math.max(1, Number(specialInput.value) || 2);
      const status = $('gm-exp-status')!;
      try {
        const res = await fetch(`${SERVER_URL}/api/exp-elixir`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ normal, special }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
        setExpElixirConfig(data.config);
        status.textContent = `Đã lưu: Tiên Thảo Lộ ×${data.config.normal}, Đặc biệt ×${data.config.special}.`;
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e);
        status.classList.add('error');
      }
    });
  }

  private async loadExpConfig(): Promise<void> {
    try {
      const res = await fetch(`${SERVER_URL}/api/exp-elixir`);
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data.config) {
        setExpElixirConfig(data.config);
        ($('gm-exp-normal') as HTMLInputElement).value = String(data.config.normal);
        ($('gm-exp-special') as HTMLInputElement).value = String(data.config.special);
      }
    } catch {
      // ignore
    }
  }

  private bindWildHorseControls(): void {
    const testModeInput = $('gm-horse-test-mode') as HTMLInputElement;
    const testHpInput = $('gm-horse-test-hp') as HTMLInputElement;
    const rareInput = $('gm-horse-rate-rare') as HTMLInputElement;
    const epicInput = $('gm-horse-rate-epic') as HTMLInputElement;
    const mythicInput = $('gm-horse-rate-mythic') as HTMLInputElement;
    const status = $('gm-horse-status')!;

    $('gm-horse-preset-100')?.addEventListener('click', () => {
      rareInput.value = '100';
      epicInput.value = '100';
      mythicInput.value = '100';
    });

    $('gm-horse-preset-default')?.addEventListener('click', () => {
      rareInput.value = '25';
      epicInput.value = '18';
      mythicInput.value = '12';
    });

    $('gm-horse-save')?.addEventListener('click', async () => {
      const testMode = testModeInput.checked;
      const testHp = Math.max(1, Math.round(Number(testHpInput.value) || 500));
      const toRate = (el: HTMLInputElement, fallbackPct: number) => {
        const pct = Number(el.value);
        const clamped = Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : fallbackPct;
        return clamped / 100;
      };
      const cur = getWildHorseConfig();
      const payload = {
        testMode,
        testHp,
        tiers: {
          rare: { ...cur.tiers.rare, dropRate: toRate(rareInput, 25) },
          epic: { ...cur.tiers.epic, dropRate: toRate(epicInput, 18) },
          mythic: { ...cur.tiers.mythic, dropRate: toRate(mythicInput, 12) },
        },
      };
      try {
        const res = await fetch(`${SERVER_URL}/api/dev/wild-horses`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
        if (data.config) setWildHorseConfig(data.config);
        status.textContent = data.config?.testMode
          ? `Đã bật chế độ TEST (${data.config.testHp} HP) · Tỉ lệ rơi: ${Math.round(data.config.tiers.rare.dropRate * 100)}% / ${Math.round(data.config.tiers.epic.dropRate * 100)}% / ${Math.round(data.config.tiers.mythic.dropRate * 100)}%.`
          : `Đã lưu chế độ thường · Tỉ lệ rơi: ${Math.round(data.config.tiers.rare.dropRate * 100)}% / ${Math.round(data.config.tiers.epic.dropRate * 100)}% / ${Math.round(data.config.tiers.mythic.dropRate * 100)}%.`;
        status.classList.remove('error');
      } catch (e) {
        status.textContent = e instanceof Error ? e.message : String(e);
        status.classList.add('error');
      }
    });
  }

  private async loadWildHorseConfig(): Promise<void> {
    try {
      const res = await fetch(`${SERVER_URL}/api/dev/wild-horses`);
      if (!res.ok) return;
      const data = await res.json().catch(() => ({}));
      if (data.config) {
        const cfg = setWildHorseConfig(data.config);
        ($('gm-horse-test-mode') as HTMLInputElement).checked = cfg.testMode;
        ($('gm-horse-test-hp') as HTMLInputElement).value = String(cfg.testHp);
        ($('gm-horse-rate-rare') as HTMLInputElement).value = String(Math.round(cfg.tiers.rare.dropRate * 100));
        ($('gm-horse-rate-epic') as HTMLInputElement).value = String(Math.round(cfg.tiers.epic.dropRate * 100));
        ($('gm-horse-rate-mythic') as HTMLInputElement).value = String(Math.round(cfg.tiers.mythic.dropRate * 100));
      }
    } catch {
      // ignore
    }
  }

  toggle(open?: boolean): void {
    dialogs.toggle(ID, open);
    if (this.isOpen()) {
      this.syncLiveFromProgress();
    }
  }

  isOpen(): boolean {
    return dialogs.isOpen(ID);
  }

  private setStatus(msg: string, isError = false): void {
    if (!this.statusEl) return;
    this.statusEl.textContent = msg;
    this.statusEl.classList.toggle('error', isError);
  }

  private syncLiveFromProgress(): void {
    const p = progress.get()?.combat;
    if (p) {
      const runBonus = attrOf(p.bag, 'fastwalkrun_p');
      const attackBonus = attrOf(p.bag, 'attackspeed_v') + attrOf(p.bag, 'attackspeed_yan_v');
      const runBase = trackBasePercent('run', this.currentConfig);
      const attackBase = trackBasePercent('attack', this.currentConfig);
      this.liveRunPercent = runBase + runBonus;
      this.liveAttackPercent = attackBase + attackBonus;
      this.updateLiveUi();
    }
  }

  private bindLiveControls(): void {
    const runInput = $('gm-live-run-input') as HTMLInputElement;
    const runSlider = $('gm-live-run-slider') as HTMLInputElement;
    const mountedCheck = $('gm-live-mounted') as HTMLInputElement;
    const attackInput = $('gm-live-attack-input') as HTMLInputElement;
    const attackSlider = $('gm-live-attack-slider') as HTMLInputElement;

    const onRunChange = (val: number) => {
      this.liveRunPercent = Math.max(50, Math.min(260, val));
      runInput.value = String(this.liveRunPercent);
      runSlider.value = String(this.liveRunPercent);
      this.updateRunPresetActive();
      this.updateLiveUi();
    };

    runInput?.addEventListener('input', () => onRunChange(Number(runInput.value) || 100));
    runSlider?.addEventListener('input', () => onRunChange(Number(runSlider.value) || 100));

    mountedCheck?.addEventListener('change', () => {
      this.liveMounted = mountedCheck.checked;
      this.updateLiveUi();
    });

    const onAttackChange = (val: number) => {
      this.liveAttackPercent = Math.max(5, Math.min(260, val));
      attackInput.value = String(this.liveAttackPercent);
      attackSlider.value = String(this.liveAttackPercent);
      this.updateAttackPresetActive();
      this.updateLiveUi();
    };

    attackInput?.addEventListener('input', () => onAttackChange(Number(attackInput.value) || 10));
    attackSlider?.addEventListener('input', () => onAttackChange(Number(attackSlider.value) || 10));

    // Preset buttons
    $('gm-run-presets')?.querySelectorAll<HTMLButtonElement>('.gm-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => onRunChange(Number(btn.dataset.pct)));
    });
    $('gm-attack-presets')?.querySelectorAll<HTMLButtonElement>('.gm-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => onAttackChange(Number(btn.dataset.pct)));
    });

    // Apply Live to player
    $('gm-live-apply')?.addEventListener('click', () => {
      this.ctx.actions()?.devSpeed({
        runPercent: this.liveRunPercent,
        attackPercent: this.liveAttackPercent,
        mounted: this.liveMounted,
      });
      this.setStatus(`Đã áp dụng tốc độ nhân vật: Chạy ${this.liveRunPercent}% | Đánh ${this.liveAttackPercent}%.`);
    });

    // Restore player speed
    $('gm-live-restore')?.addEventListener('click', () => {
      this.ctx.actions()?.devSpeed({
        runPercent: null,
        attackPercent: null,
      });
      this.syncLiveFromProgress();
      this.setStatus('Đã hủy override, đưa nhân vật về tốc độ trang bị thật.');
    });

    this.updateLiveUi();
  }

  private updateRunPresetActive(): void {
    $('gm-run-presets')?.querySelectorAll<HTMLButtonElement>('.gm-preset-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.pct) === this.liveRunPercent);
    });
  }

  private updateAttackPresetActive(): void {
    $('gm-attack-presets')?.querySelectorAll<HTMLButtonElement>('.gm-preset-btn').forEach(btn => {
      btn.classList.toggle('active', Number(btn.dataset.pct) === this.liveAttackPercent);
    });
  }

  private updateLiveUi(): void {
    const runRes = resolveSpeed('run', this.liveRunPercent, this.currentConfig, this.liveMounted);
    const pts = speedPoints(this.liveRunPercent);
    const runInfo = $('gm-live-run-info');
    if (runInfo) {
      runInfo.textContent = `F3: ${pts} điểm | ${runRes.fps} FPS (${Math.round(runRes.cycleMs)}ms/vòng) | Vận tốc: ${Math.round(runRes.velocity ?? 0)} px/s`;
    }

    const atkRes = resolveSpeed('attack', this.liveAttackPercent, this.currentConfig);
    const atkInfo = $('gm-live-attack-info');
    if (atkInfo) {
      atkInfo.textContent = `Ngoại/Nội công: ${atkRes.fps} FPS | ${Math.round(atkRes.cycleMs)} ms/đòn (Mốc: ${atkRes.phasePercent}%)`;
    }
  }

  private initTuningTables(): void {
    const container = $('gm-tuning-tables');
    if (!container) return;

    const onDirty = () => {
      this.setStatus('Bảng mốc đã chỉnh sửa (chưa áp dụng/lưu).');
      this.updateLiveUi();
    };

    const runBase = trackBasePercent('run', this.currentConfig);
    const atkBase = trackBasePercent('attack', this.currentConfig);

    this.runTableCtrl = this.createTable(
      'run',
      this.currentConfig.run.phases,
      runBase,
      2,
      this.currentConfig.run.stridePixels ?? 120,
      this.currentConfig.run.horseStridePixels ?? 180,
      this.currentConfig.run.distanceScale ?? 1.15,
      onDirty,
    );

    this.attackTableCtrl = this.createTable(
      'attack',
      this.currentConfig.attack.phases,
      atkBase,
      3,
      0,
      0,
      1,
      onDirty,
    );

    this.attackTableCtrl.container.style.display = 'none';
    container.append(this.runTableCtrl.container, this.attackTableCtrl.container);

    const btnRun = $('gm-subtab-run');
    const btnAtk = $('gm-subtab-attack');

    btnRun?.addEventListener('click', () => {
      btnRun.classList.add('on');
      btnAtk?.classList.remove('on');
      this.runTableCtrl.container.style.display = 'block';
      this.attackTableCtrl.container.style.display = 'none';
    });

    btnAtk?.addEventListener('click', () => {
      btnAtk.classList.add('on');
      btnRun?.classList.remove('on');
      this.attackTableCtrl.container.style.display = 'block';
      this.runTableCtrl.container.style.display = 'none';
    });
  }

  private createTable(
    kind: 'run' | 'attack',
    initialPhases: readonly SpeedPhase[],
    basePercent: number,
    defaultStep: number,
    initialStride: number,
    initialHorseStride: number,
    initialDistanceScale: number,
    onDirty: () => void,
  ): PhaseTableCtrl {
    const isRun = kind === 'run';
    const box = document.createElement('div');

    let currentPhases: SpeedPhase[] = initialPhases.map(p => ({ ...p }));
    let currentBase = basePercent;
    let currentStride = initialStride;
    let currentHorseStride = initialHorseStride;
    let currentDistScale = initialDistanceScale;

    // 1. Base bar
    const baseBar = document.createElement('div');
    baseBar.className = 'gm-base-bar';
    if (isRun) {
      baseBar.style.gridTemplateColumns = 'repeat(5, 1fr)';
    }

    const basePctLbl = document.createElement('label');
    basePctLbl.textContent = isRun ? 'Base Chạy (%)' : 'Base Đánh (%)';
    const basePctInput = document.createElement('input');
    basePctInput.type = 'number';
    basePctInput.value = String(basePercent);
    basePctLbl.appendChild(basePctInput);

    const baseFpsLbl = document.createElement('label');
    baseFpsLbl.textContent = 'Base FPS';
    const baseFpsInput = document.createElement('input');
    baseFpsInput.type = 'number';
    const initPhase = initialPhases.find(p => p.minPercent === basePercent) || initialPhases[0];
    baseFpsInput.value = String(initPhase?.fps ?? (isRun ? 8 : 14));
    baseFpsLbl.appendChild(baseFpsInput);

    const stepLbl = document.createElement('label');
    stepLbl.textContent = 'Step (+FPS)';
    const stepInput = document.createElement('input');
    stepInput.type = 'number';
    stepInput.value = String(defaultStep);
    stepLbl.appendChild(stepInput);

    let strideInput: HTMLInputElement | null = null;
    let distScaleInput: HTMLInputElement | null = null;
    if (isRun) {
      const strideLbl = document.createElement('label');
      strideLbl.textContent = 'Sải đi bộ (px)';
      strideInput = document.createElement('input');
      strideInput.type = 'number';
      strideInput.value = String(initialStride);
      strideLbl.appendChild(strideInput);

      const distLbl = document.createElement('label');
      distLbl.textContent = 'Dist Scale';
      distScaleInput = document.createElement('input');
      distScaleInput.type = 'number';
      distScaleInput.step = '0.05';
      distScaleInput.value = String(initialDistanceScale);
      distLbl.appendChild(distScaleInput);

      baseBar.append(basePctLbl, baseFpsLbl, stepLbl, strideLbl, distLbl);
    } else {
      baseBar.append(basePctLbl, baseFpsLbl, stepLbl);
    }

    const baseActions = document.createElement('div');
    baseActions.className = 'gm-base-actions';
    const applyStepBtn = document.createElement('button');
    applyStepBtn.type = 'button';
    applyStepBtn.textContent = 'Điền tự động theo Step';
    applyStepBtn.title = 'Lấy Base làm chuẩn, mỗi hàng tiếp theo cộng dồn một lượng bằng Step';
    baseActions.appendChild(applyStepBtn);
    baseBar.appendChild(baseActions);

    // 2. Header
    const header = document.createElement('div');
    header.className = `gm-phase-header${isRun ? '' : ' attack'}`;
    if (isRun) {
      header.innerHTML = `<div>Mốc (%)</div><div>FPS</div><div>Step</div><div>Áp</div><div>Sải (px)</div><div>V.Tốc</div><div></div>`;
    } else {
      header.innerHTML = `<div>Mốc (%)</div><div>FPS</div><div>Step</div><div>Áp</div><div>Chu kỳ (ms)</div><div></div>`;
    }

    // 3. Rows
    const tableRows = document.createElement('div');
    tableRows.className = 'gm-phase-table';

    const renderRows = () => {
      tableRows.replaceChildren();
      currentPhases.sort((a, b) => a.minPercent - b.minPercent);

      currentPhases.forEach((p, idx) => {
        const isBase = p.minPercent === currentBase;
        const row = document.createElement('div');
        row.className = `gm-phase-row${isRun ? '' : ' attack'}${isBase ? ' is-base' : ''}`;

        const pctInput = document.createElement('input');
        pctInput.type = 'number';
        pctInput.value = String(p.minPercent);
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

        const stepVal = p.step ?? (Number(stepInput.value) || (isRun ? 2 : 3));
        const rowStepInput = document.createElement('input');
        rowStepInput.type = 'number';
        rowStepInput.value = String(stepVal);
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
          const strideVal = p.stride ?? currentStride;
          const strideRowInput = document.createElement('input');
          strideRowInput.type = 'number';
          strideRowInput.value = String(strideVal);

          const velLabel = document.createElement('div');
          velLabel.className = 'gm-row-calc';
          velLabel.textContent = `${Math.round((p.fps / 8) * strideVal)} px/s`;

          fpsInput.addEventListener('change', () => {
            const val = Number(fpsInput.value);
            if (Number.isFinite(val) && val > 0) {
              p.fps = val;
              if (isBase) baseFpsInput.value = String(val);
              const curStride = p.stride ?? currentStride;
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
          const cycleLabel = document.createElement('div');
          cycleLabel.className = 'gm-row-calc';
          cycleLabel.textContent = `${Math.round((20 * 1000) / p.fps)} ms`;

          fpsInput.addEventListener('change', () => {
            const val = Number(fpsInput.value);
            if (Number.isFinite(val) && val > 0) {
              p.fps = val;
              if (isBase) baseFpsInput.value = String(val);
              cycleLabel.textContent = `${Math.round((20 * 1000) / val)} ms`;
              onDirty();
            }
          });

          row.append(pctInput, fpsInput, rowStepInput, applyRowBtn, cycleLabel, delBtn);
        }

        tableRows.appendChild(row);
      });
    };

    basePctInput.addEventListener('change', () => {
      const val = Number(basePctInput.value);
      if (Number.isFinite(val)) {
        currentBase = val;
        renderRows();
        onDirty();
      }
    });

    baseFpsInput.addEventListener('change', () => {
      const val = Number(baseFpsInput.value);
      if (Number.isFinite(val) && val > 0) {
        const bp = currentPhases.find(p => p.minPercent === currentBase);
        if (bp) bp.fps = val;
        renderRows();
        onDirty();
      }
    });

    if (strideInput) {
      strideInput.addEventListener('change', () => {
        const val = Number(strideInput!.value);
        if (Number.isFinite(val) && val > 0) {
          currentStride = val;
          renderRows();
          onDirty();
        }
      });
    }

    if (distScaleInput) {
      distScaleInput.addEventListener('change', () => {
        const val = Number(distScaleInput!.value);
        if (Number.isFinite(val) && val > 0) {
          currentDistScale = val;
          onDirty();
        }
      });
    }

    applyStepBtn.addEventListener('click', () => {
      const baseFps = Number(baseFpsInput.value);
      const step = Number(stepInput.value);
      if (!Number.isFinite(baseFps) || !Number.isFinite(step)) return;

      let baseIdx = currentPhases.findIndex(p => p.minPercent === currentBase);
      if (baseIdx < 0) {
        currentPhases.push({ minPercent: currentBase, fps: baseFps });
        currentPhases.sort((a, b) => a.minPercent - b.minPercent);
        baseIdx = currentPhases.findIndex(p => p.minPercent === currentBase);
      }

      currentPhases.forEach((p, i) => {
        if (i === baseIdx) p.fps = baseFps;
        else if (i > baseIdx) p.fps = baseFps + (i - baseIdx) * step;
        else p.fps = Math.max(1, baseFps - (baseIdx - i) * step);
      });

      renderRows();
      onDirty();
    });

    // 4. Footer Add Row
    const footer = document.createElement('div');
    footer.className = 'gm-table-footer';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.textContent = '+ Thêm mốc mới';
    addBtn.addEventListener('click', () => {
      const last = currentPhases.at(-1);
      const step = Number(stepInput.value) || (isRun ? 2 : 3);
      const nextPct = last ? last.minPercent + 20 : (isRun ? 100 : 10);
      const nextFps = last ? last.fps + step : (isRun ? 8 : 14);
      const newPhase: SpeedPhase = { minPercent: nextPct, fps: nextFps };
      if (isRun) newPhase.stride = currentStride;
      currentPhases.push(newPhase);
      renderRows();
      onDirty();
    });
    footer.appendChild(addBtn);

    renderRows();
    box.append(baseBar, header, tableRows, footer);

    return {
      container: box,
      getPhases(): SpeedPhase[] {
        return currentPhases.map(p => ({ ...p }));
      },
      getBasePercent(): number {
        return currentBase;
      },
      getStridePixels(): number {
        return currentStride;
      },
      getHorseStridePixels(): number {
        return currentHorseStride;
      },
      getDistanceScale(): number {
        return currentDistScale;
      },
      setPhases(phases: readonly SpeedPhase[], basePct: number, stride?: number, horseStride?: number, distScale?: number): void {
        currentPhases = phases.map(p => ({ ...p }));
        currentBase = basePct;
        basePctInput.value = String(basePct);
        const bp = phases.find(p => p.minPercent === basePct) || phases[0];
        if (bp) baseFpsInput.value = String(bp.fps);
        if (stride && strideInput) {
          currentStride = stride;
          strideInput.value = String(stride);
        }
        if (horseStride) currentHorseStride = horseStride;
        if (distScale && distScaleInput) {
          currentDistScale = distScale;
          distScaleInput.value = String(distScale);
        }
        renderRows();
      },
    };
  }

  private buildConfigFromTables(): SpeedConfiguration {
    const runPhases = this.runTableCtrl.getPhases();
    const attackPhases = this.attackTableCtrl.getPhases();
    if (!runPhases.length || !attackPhases.length) {
      throw new Error('Bảng mốc không được để trống.');
    }

    const cfg: SpeedConfiguration = structuredClone(this.currentConfig);
    cfg.run = {
      ...cfg.run,
      basePercent: this.runTableCtrl.getBasePercent(),
      distanceScale: this.runTableCtrl.getDistanceScale ? this.runTableCtrl.getDistanceScale() : cfg.run.distanceScale,
      stridePixels: this.runTableCtrl.getStridePixels ? this.runTableCtrl.getStridePixels() : (cfg.run.stridePixels ?? 120),
      horseStridePixels: this.runTableCtrl.getHorseStridePixels ? this.runTableCtrl.getHorseStridePixels() : (cfg.run.horseStridePixels ?? 180),
      phases: runPhases,
    };

    cfg.attack = {
      ...cfg.attack,
      basePercent: this.attackTableCtrl.getBasePercent(),
      phases: attackPhases,
    };

    const allMin = Math.min(...runPhases.map(p => p.minPercent), ...attackPhases.map(p => p.minPercent));
    const allMax = Math.max(...runPhases.map(p => p.minPercent), ...attackPhases.map(p => p.minPercent));
    if (Number.isFinite(allMin) && allMin > 0) cfg.minPercent = allMin;
    if (Number.isFinite(allMax) && allMax >= 10) cfg.maxPercent = allMax;

    validateSpeedConfiguration(cfg);
    return cfg;
  }

  private bindGlobalActions(): void {
    // 1. Apply to Game
    $('gm-act-apply-game')?.addEventListener('click', () => {
      try {
        const cfg = this.buildConfigFromTables();
        setActiveSpeedConfig(cfg);
        this.currentConfig = cfg;
        this.ctx.actions()?.devSpeed({ config: cfg });
        this.setStatus('Đã áp dụng bảng mốc vào Game (Client sprite & Server physics).');
        this.updateLiveUi();
      } catch (e) {
        this.setStatus(e instanceof Error ? e.message : String(e), true);
      }
    });

    // 2. Save
    $('gm-act-save')?.addEventListener('click', async () => {
      try {
        const cfg = this.buildConfigFromTables();
        setActiveSpeedConfig(cfg);
        this.currentConfig = cfg;
        localStorage.setItem('vltk.dev_speed', JSON.stringify(cfg));

        const res = await fetch(`${SERVER_URL}/api/dev/speed`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ config: cfg, persist: true }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Lỗi máy chủ (${res.status})`);
        }

        this.ctx.actions()?.devSpeed({ config: cfg });
        this.setStatus('💾 Đã lưu cấu hình SPEED vào tuning.ts và bộ nhớ trình duyệt!');
        this.updateLiveUi();
      } catch (e) {
        this.setStatus(`Lưu thất bại: ${e instanceof Error ? e.message : String(e)}`, true);
      }
    });

    // 3. Reset to Original Snapshot
    $('gm-act-reset')?.addEventListener('click', () => {
      try {
        const original = structuredClone(this.initialConfig || DEFAULT_SPEED);
        resetSpeedConfig();
        setActiveSpeedConfig(original);
        this.currentConfig = original;
        localStorage.removeItem('vltk.dev_speed');

        const runBase = trackBasePercent('run', original);
        const atkBase = trackBasePercent('attack', original);
        this.runTableCtrl.setPhases(original.run.phases, runBase, original.run.stridePixels, original.run.horseStridePixels, original.run.distanceScale);
        this.attackTableCtrl.setPhases(original.attack.phases, atkBase);

        this.ctx.actions()?.devSpeed({ reset: true });
        this.setStatus('↺ Đã khôi phục toàn bộ cài đặt gốc ban đầu (Snapshot & tốc độ nhân vật).');
        this.syncLiveFromProgress();
      } catch (e) {
        this.setStatus(`Khôi phục lỗi: ${e instanceof Error ? e.message : String(e)}`, true);
      }
    });

    // 4. Copy TypeScript code
    $('gm-act-copy')?.addEventListener('click', async () => {
      try {
        const cfg = this.buildConfigFromTables();
        const code = formatSpeedCode(cfg);
        await navigator.clipboard.writeText(code);
        this.setStatus('📋 Đã sao chép khối mã export const SPEED = { ... } as const; vào clipboard!');
      } catch (e) {
        this.setStatus(`Không thể sao chép: ${e instanceof Error ? e.message : String(e)}`, true);
      }
    });
  }
}
