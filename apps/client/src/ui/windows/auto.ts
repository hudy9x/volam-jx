import { approachDistance, castRange, getSkill, isMelee } from '@vltk/shared';
import { keyLabel } from '../../input/keymap';
import { settings } from '../../state/settings';
import { skillbar } from '../../state/skillbar';
import { dialogs } from '../kit/dialog';
import { $, mount } from '../kit/dom';
import { bindSettingInputs } from '../kit/settingInputs';
import './auto.css';

const ID = 'auto-dlg';
const HTML = `
<section id="${ID}" class="dlg hidden" data-title="Tự động đánh">
  <button type="button" class="btn" id="auto-on">▶ Chạy auto</button>
  <p class="muted">${keyLabel('auto')} mở cài đặt. Lưu riêng cho nhân vật; tự tiếp tục sau khi tải lại nếu đang bật.</p>
  <div class="tabs auto-tabs" role="tablist" aria-label="Cài đặt Auto">
    ${[['combat', 'Chiến đấu'], ['training', 'Bãi luyện'], ['loot', 'Nhặt đồ'], ['potions', 'Thuốc']].map(([id, title], i) => `<button type="button" class="tab${i === 0 ? ' on' : ''}" id="auto-tab-${id}" role="tab" aria-controls="auto-panel-${id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${title}</button>`).join('')}
  </div>
  <div class="auto-panels">
  <div id="auto-panel-combat" role="tabpanel" aria-labelledby="auto-tab-combat" tabindex="0">
  <div class="auto-h">Đánh quái</div>
  <label class="row">Ưu tiên mục tiêu <select data-set="autoPriority"><option value="near">Gần nhất</option><option value="boss">Hoàng Kim → Boss Xanh → quái thường</option><option value="blue">Boss Xanh → Quái thường (bỏ Hoàng Kim)</option></select></label>
  <label class="check"><input type="checkbox" data-set="autoSkipBoss" /> Bỏ qua boss</label>
  <label class="check"><input type="checkbox" data-set="autoRotate" /> Xoay chiêu: dùng lần lượt chiêu tấn công trên phím 1 – 9 (cả khi đánh boss)</label>
  <label class="check"><input type="checkbox" data-set="autoBuff" /> Tự dùng bùa lợi đặt trên phím 1 – 9</label>
  <label class="check"><input type="checkbox" data-set="autoCurse" /> Tự dùng bùa hại trên phím 1 – 9 (lên boss hoặc khi có từ 3 quái)</label>
  <div class="auto-h">Tiếp cận quái</div>
  <label class="slider">Chiêu tầm xa: đứng cách quái (% tầm chiêu) <input type="range" min="30" max="100" step="5" data-set="autoReachPct" /><span></span></label>
  <label class="check"><input type="checkbox" data-set="autoMeleeClose" /> Chiêu cận chiến: áp sát quái</label>
  <div class="muted" id="auto-reach"></div>
  <p class="muted">Ưu tiên boss: chọn bậc cao nhất rồi con gần nhất, giữ đánh đến khi hạ mục tiêu; nhặt đồ giữa các lượt đánh. Chế độ Gần nhất có thể đổi sang con gần hơn hẳn. Bấm đất hoặc ra chiêu bằng tay sẽ tạm dừng 3 giây.</p>
  </div>
  <div id="auto-panel-training" role="tabpanel" aria-labelledby="auto-tab-training" tabindex="0" hidden>
  <div class="auto-h">Tìm quái và bãi luyện công</div>
  <label class="check"><input type="checkbox" data-set="autoSeek" /> Tự tìm quái khắp bản đồ khi quanh đây đã hết</label>
  <label class="slider">Phạm vi quanh chỗ đứng (khi không tự tìm) <input type="range" min="200" max="1200" step="50" data-set="autoRadius" /><span></span></label>
  <label class="check"><input type="checkbox" data-set="autoReturn" /> Hết quái thì quay về chỗ bắt đầu (khi không tự tìm quái)</label>
  <label class="check"><input type="checkbox" data-set="autoMap" /> Tự đổi bãi luyện công theo cấp (lên cấp, từ trong thành)</label>
  <label class="check"><input type="checkbox" data-set="autoRevive" /> Trọng thương thì tự hồi sinh và quay lại bãi</label>
  <p class="muted">Tự tìm đường vòng vật cản; đứng kẹt hoặc đánh mãi không mất máu thì bỏ mục tiêu 10 giây. Auto vẫn bật khi đổi bản đồ; trong thành sẽ mua thuốc, bán đồ thừa rồi đi bãi nếu bật “Tự đổi bãi”.</p>
  </div>
  <div id="auto-panel-loot" role="tabpanel" aria-labelledby="auto-tab-loot" tabindex="0" hidden>
  <div class="auto-h">Nhặt đồ và bán đồ</div>
  <label class="check"><input type="checkbox" data-set="autoPickup" /> Tự nhặt đồ rơi (của mình hoặc không chủ)</label>
  <label class="check"><input type="checkbox" data-set="autoMoney" /> Tự nhặt ngân lượng (kể cả khi túi đầy)</label>
  <label class="check"><input type="checkbox" data-set="autoSellBlue" /> Tự bán đồ xanh trong túi (mỗi 30 giây)</label>
  <label class="check"><input type="checkbox" data-set="autoKeepValuable" /> Giữ đồ xanh trên 5 dòng hoặc có dòng ẩn hiếm / cao để rao bán</label>
  <label class="row">Nhặt <select data-set="autoLoot"><option value="all">Tất cả</option><option value="magic">Đồ xanh trở lên + tiền</option><option value="money">Chỉ tiền</option></select></label>
  <label class="check"><input type="checkbox" data-set="autoJunk" /> Tự bán đồ trắng không mặc được (mỗi 30 giây)</label>
  </div>
  <div id="auto-panel-potions" role="tabpanel" aria-labelledby="auto-tab-potions" tabindex="0" hidden>
  <div class="auto-h">Thuốc</div>
  <label class="slider">Uống thuốc khi Sinh lực dưới (%) <input type="range" min="0" max="90" step="5" data-set="autoHp" /><span></span></label>
  <label class="slider">Uống thuốc khi Nội lực dưới (%) <input type="range" min="0" max="90" step="5" data-set="autoMp" /><span></span></label>
  <label class="check"><input type="checkbox" data-set="autoBuyPotion" /> Hết thuốc Sinh lực thì về thành mua (≤ 20% ngân lượng) rồi quay lại</label>
  <p class="muted">Nội lực dưới 2 lần chi phí chiêu cũng uống thuốc. Bản gốc cần Bạch Câu Hoàn; prototype cho dùng tự do.</p>
  </div>
  </div>
</section>`;

/** Tự động đánh (Hệ thống, or the auto key): the switch and its options (state/settings.ts). The fighting: shared auto/AutoPlay.ts. */
export class AutoWindow {
  constructor(parent: HTMLElement, setAuto: (on: boolean) => void) {
    const el = mount(parent, HTML);
    dialogs.register(ID);
    $('auto-on').addEventListener('click', () => setAuto($('auto-on').dataset.on !== 'true'));
    const tabs = [...el.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const selectTab = (tab: HTMLButtonElement) => {
      for (const item of tabs) {
        const selected = item === tab;
        item.classList.toggle('on', selected);
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
        $(item.getAttribute('aria-controls')!).hidden = !selected;
      }
      el.querySelector('.auto-panels')!.scrollTop = 0;
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => selectTab(tab));
      tab.addEventListener('keydown', e => {
        const next = e.key === 'ArrowRight' ? (index + 1) % tabs.length
          : e.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length
          : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        e.preventDefault();
        selectTab(tabs[next]);
        tabs[next].focus();
      });
    });
    bindSettingInputs(el);
    settings.watch(() => this.showReach());
    skillbar.watch(() => this.showReach());
  }

  /** What the approach settings mean for the skill of the left mouse button. */
  private showReach(): void {
    const id = skillbar.skillAt('left');
    const s = id !== null ? getSkill(id) : undefined;
    if (!s) { $('auto-reach').textContent = ''; return; }
    const range = castRange(s, Math.max(1, skillbar.levelOf(s.id)));
    $('auto-reach').textContent = `${s.name} (chuột trái): tầm ${range} → đứng cách quái khoảng ${approachDistance(range, isMelee(s), settings.get())}.`;
  }

  open(): void {
    dialogs.open(ID);
  }

  setChecked(on: boolean): void {
    $('auto-on').dataset.on = String(on);
    $('auto-on').textContent = on ? '❚❚ Dừng auto' : '▶ Chạy auto';
  }
}
