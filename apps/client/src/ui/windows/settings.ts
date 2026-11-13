import { shortcutHelp } from '../../input/keymap';
import { assetCache } from '../../platform/assetCache';
import { DEFAULT_SETTINGS, settings } from '../../state/settings';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { bindSettingInputs } from '../kit/settingInputs';
import './settings.css';

const ID = 'settings-dlg';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Tùy chỉnh">
  <h4>Âm thanh</h4>
  <label class="check"><input type="checkbox" data-set="mute" /> Tắt tiếng</label>
  <label class="slider">Âm lượng chung <input type="range" min="0" max="100" data-set="master" /><span></span></label>
  <label class="slider">Hiệu ứng <input type="range" min="0" max="100" data-set="sfx" /><span></span></label>
  <label class="slider">Nhạc nền <input type="range" min="0" max="100" data-set="music" /><span></span></label>
  <h4>Giao diện</h4>
  <label class="check"><input type="checkbox" data-set="minimap" /> Hiện bản đồ nhỏ</label>
  <label class="slider">Độ phóng (%) <input type="range" min="100" max="200" step="50" data-set="zoom" /><span></span></label>
  <h4>Bộ nhớ đệm</h4>
  <div class="row spread"><span id="settings-cache">—</span><button type="button" class="btn" id="settings-cache-clear">Xóa bộ nhớ đệm</button></div>
  <h4>Phím tắt</h4>
  <div class="keys">
    ${shortcutHelp().map(([keys, what]) => `<span>${esc(keys)}</span><span>${esc(what)}</span>`).join('\n    ')}
  </div>
  <div class="row end"><button type="button" class="btn" id="settings-reset">Mặc định</button></div>
</section>`;

/** Tùy chỉnh (Hệ thống): sound, minimap, the list of shortcuts (input/keymap.ts). Values: state/settings.ts. */
export class SettingsWindow {
  constructor(parent: HTMLElement) {
    const el = mount(parent, HTML);
    dialogs.register(ID);
    bindSettingInputs(el, true);
    $('settings-reset').addEventListener('click', () => settings.set({ ...DEFAULT_SETTINGS }));
    const clear = $<HTMLButtonElement>('settings-cache-clear');
    clear.disabled = !assetCache.enabled;
    clear.addEventListener('click', () => {
      clear.disabled = true;
      $('settings-cache').textContent = 'Đang xóa…';
      void assetCache.clear().then(() => { clear.disabled = false; void this.showCache(); });
    });
  }

  open(): void {
    dialogs.open(ID);
    void this.showCache();
  }

  /** Size of the asset cache (platform/assetCache.ts); the dev build and app wrappers have none. */
  private async showCache(): Promise<void> {
    const el = $('settings-cache');
    if (!assetCache.enabled) { el.textContent = 'Không dùng ở bản dev'; return; }
    const s = await assetCache.stats();
    const mb = (n: number) => `${(n / 2 ** 20).toFixed(n < 10 * 2 ** 20 ? 1 : 0)} MB`;
    el.textContent = s ? `${mb(s.bytes)} / ${mb(s.budget)} (${s.files} tệp)` : 'Chưa sẵn sàng';
    el.title = s ? Object.entries(s.packs).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p}: ${mb(n)}`).join('\n') : '';
  }
}
