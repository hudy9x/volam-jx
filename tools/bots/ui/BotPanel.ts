import {
  BOT_LEVEL_BANDS, botMapIds, BOT_ROSTER, BOT_IDENTITIES, BOT_TONGKIM_TACTICS, BOT_TONGKIM_TACTIC_IDS, ELEMENT_NAMES, DEFAULT_AUTO, DEFAULT_BOT_SCENARIO, DEFAULT_BOT_TEMPLATE, FACTIONS, FACTION_IDS, HORSES, MAPS,
  SHOP_ITEMS, potionTotal, type AutoSettings, type BotInfo, type BotScenario, type BotTemplate, type BotTongKimTactic,
} from '@vltk/shared';
import { SERVER_URL } from './config';
import { storage } from '../../../apps/client/src/platform/storage';
import { SetupDialogs } from './SetupDialogs';
import './botPanel.css';

/** Dev bot roster, readonly template review, bulk configuration and scenario command builder.
 * Uses the server's local-only bot API. Configuration is applied on the next game entry.
 */
export function startBotPanel(): void {
  document.title = 'Bot — jx-system-online';
  const root = document.createElement('div');
  root.id = 'bots-page';
  root.innerHTML = PAGE;
  document.body.append(root);
  new BotPanel(root);
}

const API = `${SERVER_URL}/api/dev/bots`;
const LAST_KEY = 'vltk.botPanel.last';

const AUTO_LABELS: Record<keyof AutoSettings, string> = {
  autoMoney: 'Tự nhặt ngân lượng', autoLootPriority: 'Ưu tiên nhặt đồ (phạm vi 1200)', autoSellBlue: 'Tự bán đồ xanh trong túi', autoSellAllBlue: 'Tự bán toàn bộ đồ xanh (bất kể dòng)', autoKeepValuable: 'Giữ đồ xanh có giá trị để rao bán',
  autoRadius: 'Bán kính quanh chỗ bắt đầu', autoMonster: 'Tự động đánh quái', autoSkipBoss: 'Bỏ qua boss', autoPk: 'Tự động đánh người (ưu tiên hơn quái)', autoBuff: 'Tự động buff kỹ năng đã học và duy trì hào quang', autoReturn: 'Quay về chỗ cũ khi hết quái',
  autoSeek: 'Tìm quái ở xa', autoPickup: 'Tự nhặt đồ', autoSort: 'Tự sắp xếp hành trang khi hết chỗ', autoPriority: 'Mục tiêu ưu tiên', autoRotate: 'Xoay chiêu',
  autoCurse: 'Tự dùng bùa hại', autoMap: 'Tự đổi bãi luyện công theo cấp', autoReturnTraining: 'Tự quay lại bãi luyện công trước đó', autoRevive: 'Tự hồi sinh khi trọng thương',
  autoBuyPotion: 'Hết thuốc về thành mua', autoJunk: 'Tự bán đồ trắng không mặc được', autoLoot: 'Lọc đồ nhặt',
  autoManualPauseMs: 'Độ trễ thao tác tay (ms)',
  autoReachPct: 'Tầm xa: đứng ở % tầm chiêu', autoMeleeClose: 'Cận chiến áp sát', autoHp: 'Uống thuốc khi Sinh lực < %',
  autoMp: 'Uống thuốc khi Nội lực < %',
};
const SELECTS: Partial<Record<keyof AutoSettings, [string, string][]>> = {
  autoPriority: [['near', 'Gần nhất'], ['boss', 'Hoàng Kim → Boss Xanh → quái thường'], ['blue', 'Boss Xanh → Quái thường (bỏ Hoàng Kim)']],
  autoLoot: [['all', 'Tất cả'], ['magic', 'Đồ xanh trở lên + tiền'], ['money', 'Chỉ tiền']],
};

const esc = (v: string) => v.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const opt = (value: string, label: string) => `<option value="${esc(value)}">${esc(label)}</option>`;
const potionOptions = (stat: 'hp' | 'mp') => {
  const dual = SHOP_ITEMS.drug.filter(d => potionTotal(d, 'hp') > 0 && potionTotal(d, 'mp') > 0);
  const single = SHOP_ITEMS.drug.filter(d => potionTotal(d, stat) > 0 && potionTotal(d, stat === 'hp' ? 'mp' : 'hp') === 0);
  return opt('', 'Không mang thuốc') + '<optgroup label="Hồi cả Sinh lực và Nội lực (ưu tiên)">' + dual.map(d => opt(d.id, `${d.name} (${potionTotal(d, 'hp')} SL + ${potionTotal(d, 'mp')} NL)`)).join('') + '</optgroup><optgroup label="Chỉ hồi một chỉ số">' + single.map(d => opt(d.id, `${d.name} (${potionTotal(d, stat)})`)).join('') + '</optgroup>';
};

const f = (label: string, input: string, hint = '') => `<label class="bp-f"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const num = (id: string, min = 0, max = 1e9, step = 1) => `<input id="${id}" type="number" min="${min}" max="${max}" step="${step}">`;
const chk = (id: string, label: string) => `<label class="bp-c"><input id="${id}" type="checkbox"> ${label}</label>`;
const sel = (id: string, options: string) => `<select id="${id}">${options}</select>`;
const tkTacticOptions = (withDefault = false) =>
  (withDefault ? opt('default', 'Theo mặc định kịch bản') : '') +
  BOT_TONGKIM_TACTIC_IDS.map(id => opt(id, BOT_TONGKIM_TACTICS[id].name)).join('');
const tkTacticGuide = (id: string) =>
  `<ul id="${id}" class="bp-tactic-list">${BOT_TONGKIM_TACTIC_IDS.map(k => `<li data-tactic="${k}"><strong>${esc(BOT_TONGKIM_TACTICS[k].name)}:</strong> ${esc(BOT_TONGKIM_TACTICS[k].note)}</li>`).join('')}</ul>`;

const PAGE = `
<header class="bp-head">
  <div><small>ĐIỀU KHIỂN BOT</small><h1>Đội hình giang hồ</h1></div>
  <span id="bp-server"></span>
  <span id="bp-status" class="bp-status" role="status" aria-live="polite"></span>
</header>
<div class="bp-cols">
<section class="bp-card" id="template-card">
  <h2>2. Thiết lập nhân vật</h2>
  <div class="bp-row bp-file-actions">${f('Thiết lập đã lưu', sel('bt-file', '<optgroup label="Tự cài đặt">' + opt('', 'Tự cài đặt') + '</optgroup><optgroup label="Danh sách template thiết lập"></optgroup>'))}<button type="button" id="bt-delete" class="bp-danger" disabled>Xóa thiết lập</button></div>
  <p id="bt-review" class="bp-note">Tự chỉnh thông số bên dưới, rồi cập nhật nhân vật hoặc lưu để dùng lại.</p>
  <fieldset id="bt-fields">
    <div class="bp-grid">
      ${f('Cấp', sel('bt-level', BOT_LEVEL_BANDS.map(([lo, hi]) => opt(`${lo}-${hi}`, `Cấp ${lo}–${hi}`)).join('')), 'Dải 150–200 tự động dùng kỹ năng 150 và trang bị Hoàng kim môn phái.')}
      ${f('Trang bị', sel('bt-gear', opt('green', 'Đồ xanh') + opt('gold', 'Hoàng kim môn phái')), 'Món chưa đủ điều kiện mặc sẽ ở trong hành trang.')}
      ${f('Ngựa', '<input id="bt-horse" value="Ngẫu nhiên theo cấp độ" readonly>', 'Dải 110–200 chỉ chọn nhóm ngựa mạnh nhất trong số đủ cấp cưỡi.')}
      ${f('Bản đồ xuất hiện', sel('bt-mapmode', opt('training', 'Bãi luyện công') + opt('town', 'Thành thị') + opt('both', 'Bãi luyện công + Thành thị')))}
    </div>
    <p class="bp-note">Chọn bản đồ xuất hiện ban đầu trong Nâng cao. Khi luyện công, Auto vẫn có thể về thành mua thuốc rồi quay lại bãi.</p>
    <label class="bp-c"><input id="bt-weapon-steal" type="checkbox" checked disabled>Vũ khí xanh bắt buộc hút Sinh lực + Nội lực tối đa (10% mỗi loại)</label>
    ${chk('bt-tiers', 'Tự học hết kỹ năng 90 / 120 / 150 khi đủ cấp')}
    ${chk('bt-autobuff', 'Tự động buff kỹ năng đã học và duy trì hào quang')}
    <details><summary>Cài đặt thiết lập nâng cao</summary><div class="bp-grid">
      ${f('ID đăng nhập của nhân vật đã chọn', '<textarea id="bt-logins" readonly rows="2" placeholder="Chọn nhân vật ở mục 1"></textarea>', 'Mỗi nhân vật có một ID cố định. Dùng ID này để đăng nhập.')}
      ${f('Mật khẩu chung', '<input id="bt-password" autocomplete="off">', 'Dùng khi khởi tạo tài khoản chưa có; cập nhật không đổi mật khẩu tài khoản đã tồn tại.')}
      ${f('Danh sách ID bản đồ', '<input id="bt-maps" readonly><button id="bt-map-edit" type="button">Chọn bản đồ…</button>')}
      ${f('Bán kính rải (px)', num('bt-radius', 0, 2000))}
      ${f('Điểm tiềm năng', sel('bt-potential', opt('suggest', 'Theo gợi ý tuyến') + opt('str', 'Dồn Sức mạnh') + opt('dex', 'Dồn Thân pháp') + opt('vit', 'Dồn Sinh khí') + opt('eng', 'Dồn Nội công')))}
      ${f('Điểm kỹ năng', sel('bt-skills', opt('suggest', 'Theo gợi ý tuyến') + opt('none', 'Không cộng')))}
      ${f('Tiền túi (lượng)', num('bt-money', 0, 2e9, 10000))}
      ${f('Thuốc dùng khi thiếu Sinh lực', sel('bt-hp', potionOptions('hp')), 'Mặc định Ngũ Hoa Ngọc Lộ Hoàn: hồi cả Sinh lực và Nội lực.')}${f('Số bình Sinh lực', num('bt-hpn', 0, 200))}
      ${f('Thuốc dùng khi thiếu Nội lực', sel('bt-mp', potionOptions('mp')), 'Cùng loại ở hai mục: số bình được cộng vào một kho thuốc chung.')}${f('Số bình Nội lực', num('bt-mpn', 0, 200))}
    </div></details>
  </fieldset>
  <div class="bp-row bp-act"><button id="bt-update" class="bp-main">Cập nhật thiết lập</button><button id="bt-save">Lưu Thiết lập</button></div>
  <p class="bp-note">Cập nhật cho toàn bộ tên đã chọn: đặt lại cấp, đồ và tiến trình; giữ danh tính. Bỏ qua bot online. Lưu Thiết lập chỉ lưu template, không áp dụng.</p>
</section>

<section class="bp-card">
  <h2>1. Chọn nhân vật <span id="bl-picked"></span></h2><p class="bp-note">200 danh tính cố định · áp mẫu giữ nguyên tên, giới tính và môn phái.</p>
  <div id="bp-summary" class="bp-summary"></div>
  <div class="bp-row">
    <input id="bl-filter" placeholder="lọc: tên, phái, bản đồ…">
    ${sel('bl-faction', opt('', 'Tất cả môn phái') + FACTION_IDS.map(id => opt(id, FACTIONS[id].name)).join(''))}
    ${sel('bl-gender', opt('', 'Nam và nữ') + opt('male', 'Nam') + opt('female', 'Nữ'))}
    <select id="bl-setup" aria-label="Lọc theo thiết lập nhân vật"><option value="">Tất cả thiết lập nhân vật</option></select>
    <button id="bl-del" class="bp-danger">Xóa</button>
    <button id="bl-refresh">Làm mới</button>
  </div>
  <div class="bp-row bp-run-actions">${f('Chọn kịch bản', sel('bl-scenario', opt('', 'Chọn kịch bản đã lưu')))}<button id="bl-run" class="bp-main" disabled>Chạy kịch bản</button><button id="bl-resume" disabled>Chạy tiếp</button><button id="bl-stop" disabled>Dừng bot đã chọn</button></div>
  <div class="bp-tabs" role="tablist" aria-label="Trạng thái nhân vật">
    <button type="button" id="bl-tab-all" role="tab" aria-controls="bl-panel" aria-selected="false" tabindex="-1" data-state="all">Tất cả <span id="bl-count-all">(0)</span></button>
    <button type="button" id="bl-tab-online" role="tab" aria-controls="bl-panel" aria-selected="true" data-state="online">Online <span id="bl-count-online">(0)</span></button>
    <button type="button" id="bl-tab-offline" role="tab" aria-controls="bl-panel" aria-selected="false" tabindex="-1" data-state="offline">Offline <span id="bl-count-offline">(0)</span></button>
    <button type="button" id="bl-tab-new" role="tab" aria-controls="bl-panel" aria-selected="false" tabindex="-1" data-state="new">Chưa thiết lập <span id="bl-count-new">(0)</span></button>
  </div>
  <form id="bl-quick-select" class="bp-row bp-quick-select" aria-label="Chọn nhanh nhân vật">
    <span>Chọn nhanh</span>
    <button type="button" data-count="10">Chọn 10</button><button type="button" data-count="20">Chọn 20</button><button type="button" data-count="30">Chọn 30</button>
    <label class="bp-f"><span>Số lượng nhân vật</span><input id="bl-count-input" type="number" min="1" step="1" value="10" required aria-describedby="bl-quick-hint"></label>
    <button type="submit" id="bl-select-count">Chọn</button>
  </form>
  <p id="bl-quick-hint" class="bp-note">Chọn các nhân vật đầu tiên theo thứ tự bảng trong tab và bộ lọc hiện tại, thay lựa chọn trong kết quả lọc; lựa chọn ngoài kết quả lọc được giữ.</p>
  <p id="bl-quick-status" class="bp-note" role="status"></p>
  <div id="bl-panel" role="tabpanel" aria-labelledby="bl-tab-online" tabindex="0" class="bp-table"><table><thead><tr><th><label class="bp-select-cell" title="Chọn hoặc bỏ chọn kết quả lọc hiện tại"><input id="bl-all" type="checkbox" aria-label="Chọn tất cả kết quả lọc hiện tại"></label></th><th>Nhân vật</th><th>Phái / Hệ</th><th>Cấp</th><th>Bản đồ</th><th>Trang bị</th><th>Ngựa</th><th>Trạng thái</th><th>Thiết lập</th><th>Kịch bản</th></tr></thead>
  <tbody id="bl-body"></tbody></table></div>
  <p id="bl-results" class="bp-note" role="status"></p>
  <p class="bp-note">Checkbox đầu bảng chỉ chọn/bỏ chọn kết quả lọc trong tab hiện tại; lựa chọn ở tab khác được giữ. Bot đang online không đặt lại / xóa được (tắt runner trước).</p>
</section>

<section class="bp-card" id="scenario-card">
  <h2>3. Kịch bản chạy</h2>
  <div class="bp-row bp-file-actions">${f('Kịch bản đã lưu', sel('sc-file', '<optgroup label="Tự cài đặt">' + opt('', 'Tự cài đặt') + '</optgroup><optgroup label="Danh sách template kịch bản"></optgroup>'))}<button type="button" id="sc-delete" class="bp-danger" disabled>Xóa kịch bản</button></div>
  <p id="sc-review" class="bp-note">Tự chọn hoạt động bên dưới rồi lưu kịch bản để có lệnh chạy.</p>
  <p class="bp-run-note">Chạy liên tục · không giới hạn thời gian · dừng bằng Ctrl+C</p>
  <fieldset id="sc-fields">
    <h3>Hoạt động</h3>
    <div class="bp-activities">${chk('sc-grind', 'Luyện công')}${chk('sc-tongkim', 'Tống Kim')}${chk('sc-chat', 'Chat')}${chk('sc-sell', 'Rao bán đồ')}</div>
    <fieldset id="sc-tk-options" class="bp-team-mode" hidden><legend>Cấu hình Chiến trường Tống Kim</legend>
      <div class="bp-grid">
        ${f('Chọn phe', sel('sc-tk-camp', opt('auto', 'Tự cân bằng Tống / Kim') + opt('tong', 'Ưu tiên phe Tống') + opt('kim', 'Ưu tiên phe Kim')), 'Tự cân bằng sẽ chia xen kẽ Tống/Kim để không vướng lệch quân số.')}
        ${f('Chiến thuật mặc định', sel('sc-tk-tactic', tkTacticOptions()), 'Chọn cách di chuyển và giao tranh cho bot khi vào chiến trường.')}
        ${f('Tỉ lệ qua Đặc thám (%)', '<input id="sc-tk-scout" type="number" min="0" max="100" value="50">', 'Xác suất bot nhảy thẳng ra tiền tuyến qua Đặc thám thay vì chạy qua cổng.')}
        ${f('Ngưỡng bơm máu (%)', '<input id="sc-tk-hp" type="number" min="10" max="95" value="70">', 'Tự uống thuốc hồi sinh lực khi HP dưới ngưỡng này.')}
        ${f('Bán kính quét địch (px)', '<input id="sc-tk-scan" type="number" min="200" max="1600" value="850">', 'Tầm phát hiện mục tiêu địch xung quanh bot.')}
      </div>
      ${tkTacticGuide('sc-tk-tactic-guide')}
    </fieldset>
    <fieldset id="sc-team-options" class="bp-team-mode"><legend>Tổ đội khi luyện công</legend>
      <label class="bp-c"><input type="radio" name="sc-team-mode" id="sc-team-invite" value="invite">Chủ động mời người khác</label>
      <label class="bp-c"><input type="radio" name="sc-team-mode" id="sc-team" value="accept">Tự chấp nhận lời mời</label>
      <label class="bp-c"><input type="radio" name="sc-team-mode" id="sc-team-off" value="off">Tắt tự động tổ đội</label>
      <p class="bp-note">Chỉ chọn một chế độ. Chủ động mời người chơi chưa có đội trong cùng bản đồ, khi chưa có đội hoặc đang làm đội trưởng còn chỗ; không mời lặp một người trong 60 giây.</p>
    </fieldset>
    <p class="bp-note">Luyện công, Chat và Rao bán có thể bật cùng nhau. Chat chỉ báo món vừa nhặt đáng chú ý theo thuộc tính hoặc bộ tiêu chí định giá. Bật Rao bán thì tự đánh giá đồ xanh/hoàng kim vừa nhặt và đăng giá trên kênh Mua bán để người chơi mua ngay. Giá khởi điểm theo bộ tiêu chí chung, chưa tự điều chỉnh theo thị trường. Món không đạt tiêu chí sẽ không rao.</p>
    <details id="sc-auto-options"><summary>Thiết lập luyện công</summary><div class="bp-grid" id="sc-auto"></div></details>
    <details><summary>Cài đặt kịch bản nâng cao</summary><div class="bp-grid">
      ${f('Tốc độ vào game', sel('sc-join', opt('3', '3 bot/giây (mặc định)') + opt('4', '4 bot/giây') + opt('5', '5 bot/giây')), 'Bot vào lần lượt, giãn đều trong mỗi giây để giảm tải. Tổng số lấy từ những tên đã chọn ở mục 1.')}
      ${f('Địa chỉ máy chủ game', '<input id="sc-server">', 'Nơi bot kết nối vào game; chạy trên máy này thì giữ mặc định.')}
      ${f('Ghi chú (không bắt buộc)', '<input id="sc-note" placeholder="Ví dụ: Luyện công và rao đồ tốt">', 'Chỉ để nhận biết kịch bản, không ảnh hưởng bot.')}
      ${chk('sc-reconnect', 'Tự vào lại khi mất kết nối')}
    </div></details>
  </fieldset>
  <div class="bp-row bp-act"><button id="sc-save" class="bp-main">Lưu kịch bản</button></div>
  <div id="sc-cmd" class="bp-cmd"></div><button id="sc-copy" disabled>Sao chép lệnh</button>
  <p id="sc-picked" class="bp-note"></p>
  <p class="bp-note">Lưu chỉ tạo kịch bản. Chạy lệnh tại thư mục dự án để bot bắt đầu; Ctrl+C để dừng.</p>
</section>
</div>`;

class BotPanel {
  private bots: BotInfo[] = BOT_ROSTER.map(b=>({username:b.id,name:b.name,gender:b.gender,faction:b.faction,charId:'',level:0,mapId:0,online:false,pending:false,template:''}));
  private running = new Map<string,{username:string;title:string;phase:string}>();
  private assignments: Record<string,string> = {};
  private scenarioTitles: Record<string,string> = {};
  private runnerErrorAt = 0;
  private runBusy = false;
  private tkRunning = false;
  private tkLiveTactics: { all: BotTongKimTactic | null; tong: BotTongKimTactic | null; kim: BotTongKimTactic | null } = { all: null, tong: null, kim: null };
  private tkTacticBusy = false;
  private picked = new Set<string>();
  private rosterTab: 'all' | 'online' | 'offline' | 'new' = 'online';
  private loadedSelection?: string[];
  private rosterLoaded = false;
  private savedScenario = '';
  private savingScenario = false;
  private updating = false;
  private setupDialogs: SetupDialogs;
  private availableMaps: number[] = [];
  private selectedMaps: number[] = [];
  private templateTitle = '';
  private loadingTemplate = false;
  private templateRequest = 0;
  private scenarioBase: BotScenario = structuredClone(DEFAULT_BOT_SCENARIO);
  private scenarioRequest = 0;
  private loadingScenario = false;
  private configBusy = false;
  private customTemplate: BotTemplate = structuredClone(DEFAULT_BOT_TEMPLATE);

  constructor(private root: HTMLElement) {
    this.$('bp-server').textContent = `Server: ${SERVER_URL}`;
    this.$('sc-auto').innerHTML = (Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]).map(k => {
      const d = DEFAULT_AUTO[k];
      if (typeof d === 'boolean') return chk(`sc-a-${k}`, AUTO_LABELS[k]);
      if (SELECTS[k]) return f(AUTO_LABELS[k], sel(`sc-a-${k}`, SELECTS[k]!.map(([v, l]) => opt(v, l)).join('')), k === 'autoPriority' ? 'Chọn bậc cao nhất, gần nhất rồi đánh đến chết. Boss Xanh bỏ Hoàng Kim; bật Bỏ qua boss thì chỉ đánh quái thường.' : '');
      return f(AUTO_LABELS[k], num(`sc-a-${k}`, 0, 100000));
    }).join('');
    this.setupDialogs = new SetupDialogs(root);
    this.$('bt-level').addEventListener('change', () => {
      if (this.val('bt-level').startsWith('150-')) {
        this.set('bt-gear', 'gold');
        this.$<HTMLInputElement>('bt-tiers').checked = true;
      }
    });
    this.organize();
    this.writeTemplate(DEFAULT_BOT_TEMPLATE);
    void this.loadMaps();
    this.writeScenario({ ...DEFAULT_BOT_SCENARIO, bots: { prefix: 'botfixed', count: 0, usernames: [] }, behaviors: { grind: 100 }, server: SERVER_URL });
    this.showActivities();

    this.$('bt-file').addEventListener('change', () => void this.chooseTemplate());
    this.$('bt-mapmode').addEventListener('change', () => { this.selectedMaps = this.mapOptions(); this.renderMapSelection(); });
    this.on('bt-map-edit', () => void this.pickMaps());
    this.on('bt-save', () => void this.saveTemplate());
    this.on('bt-delete', () => void this.deleteFile('templates'));
    this.$('sc-file').addEventListener('change', () => void this.chooseScenario());
    this.$('sc-a-autoSellAllBlue')?.addEventListener('change', () => {
      if (this.on_('sc-a-autoSellAllBlue')) this.set('sc-a-autoKeepValuable', false);
    });
    this.$('sc-a-autoKeepValuable')?.addEventListener('change', () => {
      if (this.on_('sc-a-autoKeepValuable')) this.set('sc-a-autoSellAllBlue', false);
    });
    for (const id of ['sc-grind', 'sc-tongkim', 'sc-chat', 'sc-sell']) this.$(id).addEventListener('change', () => this.showActivities());
    this.on('sc-save', () => void this.saveScenario());
    this.on('sc-delete', () => void this.deleteFile('scenarios'));
    this.on('bl-run', () => void this.runSelected());
    this.on('bl-resume', () => void this.resumeSelected());
    this.on('bl-stop', () => void this.stopSelected());
    this.on('tk-live-apply', () => void this.applyLiveTkTactic());
    this.$('sc-tk-tactic').addEventListener('change', () => this.highlightTacticGuide('sc-tk-tactic-guide', this.val('sc-tk-tactic')));
    this.$('tk-live-tactic').addEventListener('change', () => this.highlightTacticGuide('tk-live-tactic-guide', this.val('tk-live-tactic')));
    this.highlightTacticGuide('sc-tk-tactic-guide', this.val('sc-tk-tactic'));
    this.highlightTacticGuide('tk-live-tactic-guide', this.val('tk-live-tactic'));
    this.$('bl-scenario').addEventListener('change', () => this.updateRunActions());
    this.on('bt-update', () => void this.updateSetup());
    this.$('bl-all').addEventListener('change', () => {
      const checked = this.on_('bl-all');
      for (const b of this.filtered()) checked ? this.picked.add(b.username) : this.picked.delete(b.username);
      this.savedScenario = ''; this.showCommand(); this.renderList();
    });
    this.root.querySelectorAll<HTMLButtonElement>('[data-count]').forEach(button => {
      button.addEventListener('click', () => {
        const count = Number(button.dataset.count);
        this.set('bl-count-input', count); this.selectCount(count);
      });
    });
    this.$('bl-quick-select').addEventListener('submit', e => {
      e.preventDefault(); this.selectCount(this.$<HTMLInputElement>('bl-count-input').valueAsNumber);
    });
    const tabs = [...this.root.querySelectorAll<HTMLButtonElement>('[role="tab"][data-state]')];
    const activateTab = (tab: HTMLButtonElement) => {
      this.rosterTab = tab.dataset.state as typeof this.rosterTab;
      for (const button of tabs) {
        button.setAttribute('aria-selected', String(button === tab)); button.tabIndex = button === tab ? 0 : -1;
      }
      this.$('bl-panel').setAttribute('aria-labelledby', tab.id);
      this.renderList(); this.$('bl-panel').scrollTo(0, 0);
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', e => {
        const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i + tabs.length - 1) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : -1;
        if (next < 0) return;
        e.preventDefault(); tabs[next].focus(); activateTab(tabs[next]);
      });
    });
    for (const id of ['bl-faction', 'bl-gender', 'bl-setup']) this.$(id).addEventListener('change', () => { this.$('bl-quick-status').textContent = ''; this.renderList(); });
    this.on('sc-copy', () => { void navigator.clipboard.writeText(`npm run bots -- ${this.savedScenario}`).then(() => this.status('Đã sao chép lệnh chạy.'), () => this.status('Không sao chép được; hãy chọn và sao chép lệnh bên cạnh.', true)); });
    this.root.addEventListener('input', e => { if ((e.target as HTMLElement).closest('#scenario-card')) { this.savedScenario = ''; this.showCommand(); } });
    this.root.addEventListener('change', e => { if ((e.target as HTMLElement).closest('#scenario-card')) { this.savedScenario = ''; this.showCommand(); } });
    this.on('bl-del', () => void this.bulk('delete'));
    this.on('bl-refresh', () => void this.refresh());
    this.$('bl-filter').addEventListener('input', () => this.renderList());
    this.$('bl-body').addEventListener('change', e => {
      const box = e.target as HTMLInputElement;
      if (box.dataset.user) box.checked ? this.picked.add(box.dataset.user) : this.picked.delete(box.dataset.user);
      this.savedScenario = ''; this.showCommand(); this.updatePicked();
    });

    void this.refreshFiles().then(() => this.restoreLast());
    void this.refresh();
    setInterval(() => void this.refresh(true), 5000);
    void this.refreshRuns(); setInterval(() => void this.refreshRuns(), 1000);
  }

  private $<T extends HTMLElement = HTMLElement>(id: string): T { return this.root.querySelector(`#${id}`) as T; }
  private on(id: string, fn: () => void): void { this.$(id).addEventListener('click', fn); }
  private val(id: string): string { return this.$<HTMLInputElement>(id).value.trim(); }
  private n(id: string): number { return Number(this.val(id)) || 0; }
  private on_(id: string): boolean { return this.$<HTMLInputElement>(id).checked; }
  private set(id: string, v: string | number | boolean): void {
    const el = this.$<HTMLInputElement>(id);
    if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!v; else el.value = String(v);
  }

  private status(text: string, bad = false): void {
    const s = this.$('bp-status');
    s.textContent = text;
    s.classList.toggle('bad', bad);
  }

  private async call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const url = path === '/maps' ? '/api/maps' : path === '/files' || path.startsWith('/files/') ? `/api/config${path.slice('/files'.length)}` : `${API}${path}`;
    const res = await fetch(url, {
      method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error ?? `${res.status}`);
    return json as T;
  }

  // ---------- forms ----------

  private readTemplate(): BotTemplate {
    const level = this.val('bt-level').split('-').map(Number) as [number, number];
    return {
      title: this.templateTitle, prefix: 'botfixed', password: this.val('bt-password'), faction: 'all', gender: 'mix', level,
      potential: this.val('bt-potential') as BotTemplate['potential'], skills: this.val('bt-skills') as BotTemplate['skills'],
      tiers: this.on_('bt-tiers'), autoBuff: this.on_('bt-autobuff'), gear: this.val('bt-gear') as BotTemplate['gear'], ring: false, horse: 'random',
      money: this.n('bt-money'), hpPotion: this.val('bt-hp'), hpCount: this.n('bt-hpn'), mpPotion: this.val('bt-mp'), mpCount: this.n('bt-mpn'),
      map: { mode: this.val('bt-mapmode') as BotTemplate['map']['mode'], maps: [...this.selectedMaps], radius: this.n('bt-radius') },
    };
  }

  private writeTemplate(t: BotTemplate): void {
    const level = this.$<HTMLSelectElement>('bt-level');
    level.innerHTML = BOT_LEVEL_BANDS.map(([lo, hi]) => opt(`${lo}-${hi}`, `Cấp ${lo}–${hi}`)).join('');
    const band = t.level.join('-');
    if (!BOT_LEVEL_BANDS.some(b => b.join('-') === band)) level.add(new Option(`Cấp ${t.level.join('–')} (template cũ)`, band));
    this.set('bt-level', band); this.set('bt-password', t.password);
    const gear = this.$<HTMLSelectElement>('bt-gear'); gear.innerHTML = opt('green', 'Đồ xanh') + opt('gold', 'Hoàng kim môn phái');
    if (t.gear === 'starter') gear.add(new Option('Đồ khởi đầu (template cũ)', 'starter'));
    this.set('bt-potential', t.potential); this.set('bt-skills', t.skills); this.set('bt-tiers', t.tiers); this.set('bt-autobuff', t.autoBuff); this.set('bt-gear', t.gear);
    this.set('bt-money', t.money); this.set('bt-hp', t.hpPotion); this.set('bt-hpn', t.hpCount); this.set('bt-mp', t.mpPotion); this.set('bt-mpn', t.mpCount);
    this.set('bt-mapmode', t.map.mode === 'list' ? 'both' : t.map.mode); this.set('bt-radius', t.map.radius);
    this.selectedMaps = [...t.map.maps]; this.templateTitle = t.title ?? ''; this.renderMapSelection();
  }

  private mapOptions(): number[] { return botMapIds(this.val('bt-mapmode') as 'town' | 'training' | 'both').filter(id => this.availableMaps.includes(id)); }
  private renderMapSelection(): void {
    this.set('bt-maps', this.selectedMaps.join(', '));
  }
  private async loadMaps(): Promise<void> {
    try { this.availableMaps = await this.call<number[]>('/maps'); this.selectedMaps = this.selectedMaps.filter(id => this.mapOptions().includes(id)); this.renderMapSelection(); }
    catch (e) { this.status(`Không tải được danh sách bản đồ: ${(e as Error).message}`, true); }
  }
  private async pickMaps(): Promise<void> {
    if (this.val('bt-file') || this.loadingTemplate) return;
    const ids = await this.setupDialogs.pickMaps(this.mapOptions(), this.selectedMaps);
    if (ids) { this.selectedMaps = ids; this.renderMapSelection(); }
  }
  private async chooseTemplate(): Promise<void> {
    const name = this.val('bt-file'); const request = ++this.templateRequest;
    if (!name) {
      this.loadingTemplate = false; this.customTemplate = { ...this.readTemplate(), title: '' }; this.writeTemplate(this.customTemplate);
      const band = BOT_LEVEL_BANDS.find(b => b[0] <= this.customTemplate.level[0] && b[1] >= this.customTemplate.level[0]) ?? BOT_LEVEL_BANDS[0];
      this.$('bt-level').innerHTML = BOT_LEVEL_BANDS.map(([lo, hi]) => opt(`${lo}-${hi}`, `Cấp ${lo}–${hi}`)).join('');
      this.set('bt-level', band.join('-'));
      this.$('bt-gear').innerHTML = opt('green', 'Đồ xanh') + opt('gold', 'Hoàng kim môn phái'); this.set('bt-gear', this.customTemplate.gear === 'starter' ? 'green' : this.customTemplate.gear);
      this.$<HTMLFieldSetElement>('bt-fields').disabled = false;
      this.$('bt-review').textContent = 'Tự chỉnh thông số bên dưới, rồi cập nhật nhân vật hoặc lưu để dùng lại.'; this.updateFileActions(); return;
    }
    this.customTemplate = this.$<HTMLFieldSetElement>('bt-fields').disabled ? this.customTemplate : this.readTemplate();
    this.$<HTMLFieldSetElement>('bt-fields').disabled = true; this.loadingTemplate = true;
    this.$('bt-review').textContent = 'Đang tải template…';
    this.updateFileActions();
    try {
      const t = await this.call<BotTemplate>(`/files/templates/${name}`); if (request !== this.templateRequest) return;
      this.writeTemplate(t); this.templateTitle = t.title || name; this.remember('templates', name);
      const legacy = !BOT_LEVEL_BANDS.some(b => b.join('-') === t.level.join('-')) || t.gear === 'starter' || t.horse !== 'random' || t.ring || t.map.mode === 'list';
      this.$('bt-review').textContent = `Đang xem “${this.templateTitle}” — chỉ đọc. Chọn Tự cài đặt để chỉnh.${legacy ? ' Template cũ: cập nhật sẽ dùng ngựa theo cấp, không có giới chỉ; hãy chọn lại dải cấp/trang bị nếu cần.' : ''}`;
    } catch (e) { if (request === this.templateRequest) { this.status(`Không tải được template: ${(e as Error).message}`, true); this.set('bt-file', ''); this.writeTemplate(this.customTemplate); this.$<HTMLFieldSetElement>('bt-fields').disabled = false; this.$('bt-review').textContent = 'Tự cài đặt'; } }
    finally { if (request === this.templateRequest) this.loadingTemplate = false; this.updateFileActions(); }
  }
  private async saveTemplate(): Promise<void> {
    if (this.loadingTemplate || this.configBusy || this.savingScenario) return;
    const template = this.readTemplate();
    const title = await this.setupDialogs.askName(); if (!title) return;
    const name = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    if (!name) { this.status('Tên thiết lập cần có ít nhất một chữ hoặc số.', true); return; }
    if ([...this.$<HTMLSelectElement>('bt-file').options].some(o => o.value === name) && !confirm(`Ghi đè thiết lập “${title}” đã lưu?`)) return;
    this.configBusy = true; this.updateFileActions();
    try { await this.call(`/files/templates/${name}`, 'PUT', { ...template, title }); await this.refreshFiles(); this.status(`Đã lưu thiết lập “${title}”. Chưa áp dụng cho nhân vật.`); }
    catch (e) { this.status(`Không lưu được thiết lập: ${(e as Error).message}`, true); }
    finally { this.configBusy = false; this.updateFileActions(); }
  }


  private readScenario(): BotScenario {
    const auto = { ...DEFAULT_AUTO } as Record<string, unknown>;
    for (const k of Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]) {
      const d = DEFAULT_AUTO[k]; auto[k] = typeof d === 'boolean' ? this.on_(`sc-a-${k}`) : typeof d === 'number' ? this.n(`sc-a-${k}`) : this.val(`sc-a-${k}`);
    }
    return { ...this.scenarioBase, version: 1, buffVersion: 1, duration: 0, note: this.val('sc-note'), server: this.val('sc-server'),
      bots: { prefix: 'botfixed', count: 0, usernames: [...this.picked] }, joinPerSecond: this.n('sc-join'), reconnect: this.on_('sc-reconnect'),
      activities: { grind: this.on_('sc-grind'), tongkim: this.on_('sc-tongkim'), chat: this.on_('sc-chat'), sell: this.on_('sc-sell'), autoAcceptTeam: this.on_('sc-team'), autoInviteTeam: this.on_('sc-team-invite') },
      tongkim: {
        campPreference: this.val('sc-tk-camp') as 'auto' | 'tong' | 'kim',
        tactic: this.val('sc-tk-tactic') as BotTongKimTactic,
        exitViaScoutRatio: Math.max(0, Math.min(100, this.n('sc-tk-scout'))) / 100,
        hpHealThreshold: Math.max(10, Math.min(95, this.n('sc-tk-hp'))) / 100,
        scanRadius: Math.max(200, Math.min(1600, this.n('sc-tk-scan'))),
      },
      auto: auto as unknown as AutoSettings };
  }

  private writeScenario(s: BotScenario): void {
    this.scenarioBase = structuredClone(s);
    if (s.bots.usernames) { this.picked = new Set(s.bots.usernames); this.loadedSelection = undefined; }
    else { this.loadedSelection = [s.bots.prefix, String(s.bots.count)]; }
    this.set('sc-note', s.note); this.set('sc-server', s.server); this.set('sc-join', s.joinPerSecond); this.set('sc-reconnect', s.reconnect);
    this.set('sc-grind', s.activities.grind); this.set('sc-tongkim', !!s.activities.tongkim); this.set('sc-chat', s.activities.chat); this.set('sc-sell', s.activities.sell); this.set('sc-team', !s.activities.autoInviteTeam && s.activities.autoAcceptTeam); this.set('sc-team-invite', s.activities.autoInviteTeam); this.set('sc-team-off', !s.activities.autoInviteTeam && !s.activities.autoAcceptTeam);
    this.set('sc-tk-camp', s.tongkim?.campPreference ?? 'auto');
    this.set('sc-tk-tactic', s.tongkim?.tactic ?? 'charge');
    this.highlightTacticGuide('sc-tk-tactic-guide', s.tongkim?.tactic ?? 'charge');
    this.set('sc-tk-scout', Math.round((s.tongkim?.exitViaScoutRatio ?? 0.5) * 100));
    this.set('sc-tk-hp', Math.round((s.tongkim?.hpHealThreshold ?? 0.7) * 100));
    this.set('sc-tk-scan', s.tongkim?.scanRadius ?? 850);
    for (const k of Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]) this.set(`sc-a-${k}`, s.auto[k] as string | number | boolean);
    this.showActivities(); this.renderList();
  }

  private showCommand(): void {
    const name = this.savedScenario;
    this.$('sc-cmd').textContent = name ? this.picked.size ? `npm run bots -- ${name}` : 'Đã lưu kịch bản. Chọn nhân vật và kịch bản ở mục 1 để chạy.' : 'Lưu kịch bản để nhận lệnh chạy đúng cấu hình đã chọn.';
    this.$<HTMLButtonElement>('sc-copy').disabled = !name || !this.picked.size;
  }

  private updatePicked(): void {
    const shown = this.filtered(), selected = shown.filter(b => this.picked.has(b.username)).length;
    const all = this.$<HTMLInputElement>('bl-all');
    all.checked = shown.length > 0 && selected === shown.length;
    all.indeterminate = selected > 0 && selected < shown.length;
    all.disabled = shown.length === 0;
    this.updateRunActions();
    this.set('bt-logins', [...this.picked].join(', '));
    this.$('bl-picked').textContent = `${this.picked.size} / 200 đã chọn`;
    if (!this.$('sc-picked')) return;
    this.$('sc-picked').textContent = `${this.picked.size} nhân vật · ${[...this.picked].slice(0, 4).map(id => BOT_IDENTITIES.get(id)?.name ?? id).join(', ')}${this.picked.size > 4 ? '…' : ''}`;
  }

  private showActivities(): void {
    const tk = this.on_('sc-tongkim');
    const grind = this.on_('sc-grind');
    this.$('sc-tk-options').hidden = !tk;
    this.$('sc-team-options').hidden = !grind || tk;
    this.$('sc-auto-options').hidden = !grind;
  }
  private organize(): void {
    const cards = [...this.root.querySelectorAll<HTMLElement>('.bp-card')];
    const [template, list, scenario] = cards;
    list.id = 'roster-card'; template.id = 'template-card'; scenario.id = 'scenario-card';
    this.root.querySelector('.bp-cols')!.prepend(list);
    const overview=document.createElement('section');overview.className='bp-card';overview.id='scenario-overview';
    overview.innerHTML=`<h2>Kịch bản</h2><div id="bl-scenario-cards" class="bp-scenario-grid"></div>
      <div id="tk-live-box" class="bp-team-mode" hidden>
        <h3>Chiến thuật Tống Kim đang chạy</h3>
        <div class="bp-grid">
          ${f('Áp dụng cho', sel('tk-live-camp', opt('all', 'Tất cả bot Tống Kim') + opt('tong', 'Chỉ phe Tống') + opt('kim', 'Chỉ phe Kim')))}
          ${f('Chiến thuật', sel('tk-live-tactic', tkTacticOptions(true)))}
        </div>
        <div class="bp-row"><button type="button" id="tk-live-apply" class="bp-main">Áp dụng chiến thuật</button><span id="tk-live-status" class="bp-note" role="status" aria-live="polite">Đang dùng theo mặc định kịch bản.</span></div>
        ${tkTacticGuide('tk-live-tactic-guide')}
      </div>`;
    list.before(overview);
    for (const input of this.root.querySelectorAll<HTMLInputElement>('input:not([type=checkbox])')) if (!input.closest('label')) input.setAttribute('aria-label', input.placeholder || input.id);
    for (const select of this.root.querySelectorAll('select')) if (!select.closest('label') && !select.hasAttribute('aria-label')) select.setAttribute('aria-label', select.id);
  }

  // ---------- files ----------

  private updateFileActions(): void {
    const busy = this.configBusy || this.savingScenario;
    for (const [select, button] of [['bt-file', 'bt-delete'], ['sc-file', 'sc-delete']]) {
      this.$<HTMLSelectElement>(select).disabled = busy;
      this.$<HTMLButtonElement>(button).disabled = busy || this.loadingTemplate || this.loadingScenario || !this.val(select);
      this.$(button).title = this.val(select) ? 'Chỉ xóa mẫu đã lưu, không xóa nhân vật.' : 'Chọn một mẫu đã lưu để xóa.';
    }
    this.$<HTMLButtonElement>('bt-save').disabled = busy;
    this.$<HTMLButtonElement>('sc-save').disabled = busy;
  }

  private async deleteFile(kind: 'templates' | 'scenarios'): Promise<void> {
    if (this.configBusy || this.savingScenario || this.loadingTemplate || this.loadingScenario) return;
    const id = kind === 'templates' ? 'bt-file' : 'sc-file';
    const name = this.val(id); if (!name) return;
    const title = this.$<HTMLSelectElement>(id).selectedOptions[0]?.textContent || name;
    const label = kind === 'templates' ? 'thiết lập nhân vật' : 'kịch bản';
    if (!confirm(`Xóa mẫu ${label} “${title}”?\nChỉ xóa mẫu đã lưu; nhân vật và thiết lập đã áp dụng được giữ nguyên.`)) return;
    this.configBusy = true; this.updateFileActions();
    this.status(`Đang xóa mẫu ${label}…`);
    try {
      await this.call(`/files/${kind}/${name}`, 'DELETE');
      const selects = kind === 'templates' ? ['bt-file'] : ['sc-file', 'bl-scenario'];
      for (const select of selects) for (const option of [...this.$<HTMLSelectElement>(select).options]) {
        if (option.value === name) option.remove();
      }
      this.set(id, ''); this.remember(kind, '');
      if (kind === 'templates') await this.chooseTemplate(); else await this.chooseScenario();
      await this.refreshFiles();
      this.status(`Đã xóa mẫu ${label} “${title}”. Dữ liệu trên form được giữ ở Tự cài đặt.`);
    } catch (e) { this.status(`Không xóa được mẫu ${label}: ${(e as Error).message}`, true); }
    finally { this.configBusy = false; this.updateFileActions(); }
  }

  private async refreshFiles(): Promise<void> {
    try {
      const files = await this.call<{ templates: string[]; titles: Record<string, string>; scenarios: string[]; scenarioTitles: Record<string, string>; dir: string }>('/files');
      const selected = this.val('bt-file');
      this.$('bt-file').innerHTML = '<optgroup label="Tự cài đặt">' + opt('', 'Tự cài đặt') + '</optgroup><optgroup label="Danh sách template thiết lập">' + files.templates.map(n => opt(n, files.titles?.[n] || n)).join('') + '</optgroup>';
      this.set('bt-file', selected);
      const scenario = this.val('sc-file');
      this.$('sc-file').innerHTML = '<optgroup label="Tự cài đặt">' + opt('', 'Tự cài đặt') + '</optgroup><optgroup label="Danh sách template kịch bản">' + files.scenarios.map(n => opt(n, files.scenarioTitles?.[n] || n)).join('') + '</optgroup>';
      this.set('sc-file', scenario);
      this.scenarioTitles=Object.fromEntries(files.scenarios.map(name=>[name,files.scenarioTitles?.[name]||name]));
      this.renderScenarioCards();
      const runScenario = this.val('bl-scenario');
      this.$('bl-scenario').innerHTML = opt('', 'Chọn kịch bản đã lưu') + files.scenarios.map(name=>opt(name, files.scenarioTitles?.[name] || name)).join('');
      this.set('bl-scenario', runScenario); this.updateRunActions();
      this.$('bt-file').title = this.$('sc-file').title = `Lưu ở ${files.dir}`;
    } catch { /* status shows the server problem */ }
    finally { this.updateFileActions(); }
  }

  private async chooseScenario(): Promise<void> {
    const name = this.val('sc-file'); const request = ++this.scenarioRequest;
    this.savedScenario = ''; this.showCommand();
    if (!name) { this.loadingScenario = false; this.$<HTMLFieldSetElement>('sc-fields').disabled = false; this.$('sc-review').textContent = 'Tự chọn hoạt động rồi lưu kịch bản.'; this.updateFileActions(); return; }
    this.loadingScenario = true; this.$<HTMLFieldSetElement>('sc-fields').disabled = true; this.$('sc-review').textContent = 'Đang tải kịch bản…';
    this.updateFileActions();
    try {
      const data = await this.call<BotScenario>(`/files/scenarios/${name}`); if (request !== this.scenarioRequest) return;
      this.writeScenario(data); if (this.loadedSelection && this.rosterLoaded) await this.refresh();
      if (request !== this.scenarioRequest) return;
      this.savedScenario = name; this.showCommand();
      this.$('sc-review').textContent = `Đang xem “${data.title || name}” — chỉ đọc. Chọn Tự cài đặt để chỉnh.`;
    } catch (e) { if (request === this.scenarioRequest) { this.status(`Không tải được kịch bản: ${(e as Error).message}`, true); this.set('sc-file', ''); this.$<HTMLFieldSetElement>('sc-fields').disabled = false; this.$('sc-review').textContent = 'Tự cài đặt'; } }
    finally { if (request === this.scenarioRequest) this.loadingScenario = false; this.updateFileActions(); }
  }
  private async saveScenario(): Promise<void> {
    if (this.savingScenario || this.loadingScenario || this.configBusy) return;
    const data = this.readScenario();
    if (!data.activities.grind && !data.activities.tongkim && !data.activities.chat && !data.activities.sell) { this.status('Bật ít nhất một hoạt động.', true); return; }
    const title = await this.setupDialogs.askName('scenario'); if (!title) return;
    const name = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    if (!name) { this.status('Tên kịch bản cần có ít nhất một chữ hoặc số.', true); return; }
    if ([...this.$<HTMLSelectElement>('sc-file').options].some(o => o.value === name) && !confirm(`Ghi đè kịch bản “${title}”?`)) return;
    this.savingScenario = true;
    this.updateFileActions();
    try {
      const saved = await this.call<BotScenario>(`/files/scenarios/${name}`, 'PUT', { ...data, title });
      await this.refreshFiles(); this.writeScenario(saved); this.set('sc-file', name); this.$<HTMLFieldSetElement>('sc-fields').disabled = true;
      this.savedScenario = name; this.showCommand(); this.remember('scenarios', name);
      this.$('sc-review').textContent = `Đã lưu “${title}” — chỉ đọc. Chọn Tự cài đặt để chỉnh.`;
      this.status(this.picked.size ? 'Đã lưu kịch bản chạy liên tục. Sao chép lệnh để bắt đầu.' : 'Đã lưu kịch bản. Chọn nhân vật và kịch bản ở mục 1 để chạy.');
    } catch (e) { this.status(`Không lưu được kịch bản: ${(e as Error).message}`, true); }
    finally { this.savingScenario = false; this.updateFileActions(); }
  }

  private remember(kind: string, name: string): void {
    const last = storage.getJson<Record<string, string>>(LAST_KEY) ?? {};
    storage.setJson(LAST_KEY, { ...last, [kind]: name });
  }

  private restoreLast(): void { this.showCommand(); }

  // ---------- bots ----------

  private async updateSetup(): Promise<void> {
    if (this.updating || this.loadingTemplate) return;
    if (!this.picked.size) { this.status('Chọn nhân vật cần cập nhật ở mục 1.', true); return; }
    if (this.val('bt-file') && !BOT_LEVEL_BANDS.some(b => b.join('-') === this.val('bt-level'))) { this.status('Template cũ có dải cấp khác. Chọn Tự cài đặt rồi chọn dải cấp mới.', true); return; }
    if (!this.selectedMaps.length) { this.status('Chọn ít nhất một bản đồ xuất hiện.', true); return; }
    this.updating = true; this.$<HTMLButtonElement>('bt-update').disabled = true;
    try {
      const r = await this.call<{ updated: string[]; skipped: string[] }>('/configure', 'POST', { usernames: [...this.picked], template: this.readTemplate(), templateName: this.val('bt-file') });
      await this.refresh(); this.status(`Đã cập nhật thiết lập cho ${r.updated.length} nhân vật${r.skipped.length ? `; bỏ qua ${r.skipped.length} đang online` : ''}.`);
    } catch (e) { this.status(`Không cập nhật được: ${(e as Error).message}`, true); }
    finally { this.updating = false; this.$<HTMLButtonElement>('bt-update').disabled = false; }
  }

  private async bulk(op: 'delete'): Promise<void> {
    const usernames = [...this.picked].filter(id => this.bots.some(b => b.username === id && b.charId));
    if (!usernames.length) { this.status('Chưa chọn bot nào.', true); return; }
    if (op === 'delete' && !confirm(`Xóa hẳn ${usernames.length} tài khoản bot?`)) return;
    try {
      const body = { usernames };
      const r = await this.call<{ reset?: string[]; deleted?: string[]; skipped: string[] }>(`/${op}`, 'POST', body);
      const done = (r.reset ?? r.deleted ?? []).length;
      this.status(`Đã xóa ${done} bot${r.skipped.length ? ` · bỏ qua ${r.skipped.length} bot đang online` : ''}.`);
      if (op === 'delete') { for (const u of r.deleted ?? []) this.picked.delete(u); this.savedScenario = ''; this.showCommand(); }
      await this.refresh();
    } catch (e) { this.status(`Lỗi: ${(e as Error).message}`, true); }
  }

  private async refresh(quiet = false): Promise<void> {
    try {
      const existing = await this.call<BotInfo[]>('');
      this.rosterLoaded = true;
      this.bots = [...BOT_ROSTER.map(b => existing.find(e => e.username === b.id) ?? { username: b.id, name: b.name, gender: b.gender, faction: b.faction, charId: '', level: 0, mapId: 0, online: false, pending: false, template: '' }), ...existing.filter(b => !BOT_IDENTITIES.has(b.username))];
      if (this.loadedSelection) { const [prefix, count] = this.loadedSelection; const matches = existing.filter(b => b.username.startsWith(`${prefix}_`)); this.picked = new Set((Number(count) ? matches.slice(0, Number(count)) : matches).map(b => b.username)); this.loadedSelection = undefined; }
      this.renderSummary();
      this.renderList();
    } catch (e) {
      if (!quiet || !this.bots.length) {
        this.status(`Không gọi được API bot ở ${SERVER_URL}: ${(e as Error).message}. Server phải đang chạy, DEV_TOOLS bật, cùng máy.`, true);
      }
    }
  }

  private updateRunActions(): void {
    if(!this.$('bl-run'))return;
    this.root.querySelectorAll<HTMLButtonElement>('[data-toggle-scenario]').forEach(button=>{button.disabled=this.runBusy||!Object.values(this.assignments).includes(button.dataset.toggleScenario!);});
    this.$<HTMLSelectElement>('bl-scenario').disabled = !this.picked.size || this.runBusy;
    this.$<HTMLButtonElement>('bl-run').disabled = !this.picked.size || !this.val('bl-scenario') || this.runBusy;
    this.$<HTMLButtonElement>('bl-resume').disabled = this.runBusy || ![...this.picked].some(id=>this.assignments[id]&&!this.running.has(id));
    this.$<HTMLButtonElement>('bl-stop').disabled = ![...this.picked].some(id=>this.running.has(id)) || this.runBusy;
  }
  private async runnerCall(path:string, body?:unknown): Promise<{
    assignments:Record<string,string>;
    bots:{username:string;title:string;phase:string}[];
    errors:{message:string;at:number}[];
    tkTactics?:{all:BotTongKimTactic|null;tong:BotTongKimTactic|null;kim:BotTongKimTactic|null};
    tkRunning?:boolean;
  }> {
    const response=await fetch(`/api/runner/${path}`,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Không điều khiển được bộ chạy bot.');return result;
  }
  private highlightTacticGuide(guideId: string, selected: string): void {
    const list = this.$(guideId);
    if (!list) return;
    list.querySelectorAll<HTMLLIElement>('li[data-tactic]').forEach(li => {
      li.classList.toggle('active', li.dataset.tactic === selected);
    });
  }
  private renderTkLiveBox(): void {
    const box = this.$('tk-live-box');
    if (!box) return;
    box.hidden = !this.tkRunning;
    this.$<HTMLButtonElement>('tk-live-apply').disabled = this.tkTacticBusy || !this.tkRunning;
    const t = this.tkLiveTactics;
    const label = (v: BotTongKimTactic | null) => v ? BOT_TONGKIM_TACTICS[v].name : 'Theo kịch bản';
    const parts: string[] = [];
    if (t.all) parts.push(`Chung: ${label(t.all)}`);
    if (t.tong) parts.push(`Tống: ${label(t.tong)}`);
    if (t.kim) parts.push(`Kim: ${label(t.kim)}`);
    this.$('tk-live-status').textContent = parts.length ? `Đang ghi đè nóng · ${parts.join(' · ')}` : 'Đang dùng chiến thuật mặc định của kịch bản.';
  }
  private async applyLiveTkTactic(): Promise<void> {
    if (this.tkTacticBusy || !this.tkRunning) return;
    const camp = this.val('tk-live-camp') as 'all' | 'tong' | 'kim';
    const tactic = this.val('tk-live-tactic');
    this.tkTacticBusy = true;
    this.renderTkLiveBox();
    try {
      const state = await this.runnerCall('tactic', { camp, tactic });
      if (state.tkTactics) this.tkLiveTactics = state.tkTactics;
      if (typeof state.tkRunning === 'boolean') this.tkRunning = state.tkRunning;
      const scopeName = camp === 'tong' ? 'phe Tống' : camp === 'kim' ? 'phe Kim' : 'toàn bộ bot Tống Kim';
      const tacticName = tactic === 'default' ? 'mặc định kịch bản' : BOT_TONGKIM_TACTICS[tactic as BotTongKimTactic].name;
      this.status(`Đã đổi nóng chiến thuật ${scopeName} sang “${tacticName}”.`);
    } catch (error) {
      this.status((error as Error).message, true);
    } finally {
      this.tkTacticBusy = false;
      this.renderTkLiveBox();
    }
  }
  private async refreshRuns(): Promise<void> {
    try{const before=JSON.stringify([[...this.running.values()],this.assignments,this.tkRunning,this.tkLiveTactics]); const state=await this.runnerCall('status');this.running=new Map(state.bots.map(bot=>[bot.username,bot]));this.assignments=state.assignments;
      if(state.tkTactics) this.tkLiveTactics=state.tkTactics;
      if(typeof state.tkRunning==='boolean') this.tkRunning=state.tkRunning;
      const error=state.errors.at(-1);if(error&&error.at>this.runnerErrorAt){this.runnerErrorAt=error.at;this.status(error.message,true);}
      this.renderTkLiveBox();
      if(before!==JSON.stringify([[...this.running.values()],this.assignments,this.tkRunning,this.tkLiveTactics])){this.renderScenarioCards();this.renderList();void this.refresh(true);}
    }catch{/* Game API and runner startup show errors on explicit actions. */}
  }
  private async runSelected(): Promise<void> {
    if(!this.picked.size||!this.val('bl-scenario')||this.runBusy)return;
    this.runBusy=true;this.updateRunActions();
    try{const state=await this.runnerCall('start',{scenario:this.val('bl-scenario'),usernames:[...this.picked],server:SERVER_URL});this.running=new Map(state.bots.map(bot=>[bot.username,bot]));this.assignments=state.assignments;this.renderScenarioCards();this.status(`Đã bắt đầu ${this.picked.size} nhân vật; bot sẽ vào lần lượt 3–5 mỗi giây.`);this.renderList();}
    catch(error){this.status((error as Error).message,true);}finally{this.runBusy=false;this.updateRunActions();}
  }
  private async resumeSelected(): Promise<void> {
    if(this.runBusy)return;
    const users=[...this.picked].filter(id=>!this.running.has(id)&&!this.bots.find(b=>b.username===id)?.online);
    this.runBusy=true;this.updateRunActions();
    try {await this.runnerCall('resume',{usernames:users,server:SERVER_URL});await this.refreshRuns();this.status('Đã chạy tiếp theo kịch bản đã gán.');}
    catch(error){this.status((error as Error).message,true);}finally{this.runBusy=false;this.updateRunActions();}
  }
  private renderScenarioCards():void {
    const host=this.$('bl-scenario-cards');if(!host)return;
    host.innerHTML=Object.entries(this.scenarioTitles).map(([name,title])=>{
      const count=Object.values(this.assignments).filter(s=>s===name).length;
      const running=[...this.running.values()].filter(bot=>this.assignments[bot.username]===name);
      const active=running.length>0;
      const phase=!active?'Đã dừng':running.every(bot=>bot.phase==='stopping')?'Đang dừng':running.some(bot=>bot.phase==='online')?'Đang chạy':'Đang chuẩn bị';
      return `<article class="bp-scenario-item"><div><strong>${esc(title)}</strong><div class="bp-note">${count} bot · ${phase}</div></div><button data-toggle-scenario="${esc(name)}" aria-label="${active?'Dừng':'Chạy'} ${esc(title)}" title="${active?'Dừng':'Chạy'} ${esc(title)}" ${!count||this.runBusy?'disabled':''}>${active?'❚❚':'▶'}</button></article>`;
    }).join('')||'<p class="bp-note">Chưa có kịch bản. Lưu kịch bản bên dưới để bắt đầu.</p>';
    host.querySelectorAll<HTMLButtonElement>('[data-toggle-scenario]').forEach(button=>button.onclick=async()=>{
      if(this.runBusy)return;this.runBusy=true;this.updateRunActions();this.renderScenarioCards();
      try {await this.runnerCall('toggle',{scenario:button.dataset.toggleScenario,server:SERVER_URL});await this.refreshRuns();}
      catch(error){this.status((error as Error).message,true);}finally{this.runBusy=false;this.updateRunActions();this.renderScenarioCards();}
    });
  }
  private async stopSelected(): Promise<void> {
    if(!this.picked.size||this.runBusy)return;this.runBusy=true;this.updateRunActions();
    try{await this.runnerCall('stop',{usernames:[...this.picked]});this.status('Đang dừng các bot đã chọn; những bot khác tiếp tục chạy.');await this.refreshRuns();}
    catch(error){this.status((error as Error).message,true);}finally{this.runBusy=false;this.updateRunActions();}
  }

  private selectCount(count: number): void {
    if (!Number.isSafeInteger(count) || count < 1) {
      this.$('bl-quick-status').textContent = 'Nhập số lượng nguyên dương hợp lệ.'; return;
    }
    const shown = this.filtered();
    if (!shown.length) { this.$('bl-quick-status').textContent = 'Không có nhân vật trong kết quả lọc hiện tại.'; return; }
    for (const b of shown) this.picked.delete(b.username);
    for (const b of shown.slice(0, count)) this.picked.add(b.username);
    this.savedScenario = ''; this.showCommand(); this.renderList();
    const selected = Math.min(count, shown.length);
    this.$('bl-quick-status').textContent = selected < count
      ? `Chỉ có ${shown.length} nhân vật khớp bộ lọc; đã chọn ${selected} nhân vật.`
      : `Đã chọn ${selected} nhân vật đầu tiên trong kết quả lọc.`;
  }

  private botTab(b: BotInfo): 'online' | 'offline' | 'new' {
    return b.online ? 'online' : b.charId ? 'offline' : 'new';
  }

  private setupKey(b: BotInfo): string {
    return !b.charId ? 'unset' : b.template ? `template:${b.template}` : b.templateTitle ? `custom:${b.templateTitle}` : 'custom';
  }

  private refreshSetupFilter(): void {
    const select = this.$<HTMLSelectElement>('bl-setup'), selected = select.value;
    const options = new Map<string, string>([['custom', 'Tự cài đặt'], ['unset', 'Chưa thiết lập']]);
    for (const b of this.bots) if (b.charId) options.set(this.setupKey(b), b.templateTitle || b.template || 'Tự cài đặt');
    // A refresh must not silently widen an active filter if its last character disappears.
    if (selected && !options.has(selected)) options.set(selected, select.selectedOptions[0]?.textContent ?? 'Thiết lập đã chọn');
    const html = opt('', 'Tất cả thiết lập nhân vật') + [...options].sort((a, b) => a[1].localeCompare(b[1], 'vi')).map(([key, label]) => opt(key, label)).join('');
    if (select.innerHTML !== html) { select.innerHTML = html; select.value = selected; }
  }

  private filtered(): BotInfo[] {
    const q = this.val('bl-filter').toLowerCase();
    return this.bots.filter(b => (!this.val('bl-faction') || b.faction === this.val('bl-faction')) && (!this.val('bl-gender') || b.gender === this.val('bl-gender')) && (!this.val('bl-setup') || this.setupKey(b) === this.val('bl-setup')) && (this.rosterTab === 'all' || this.botTab(b) === this.rosterTab)).filter(b => [b.username, b.name, FACTIONS[b.faction]?.name ?? '', MAPS[b.mapId]?.name ?? '', String(b.mapId), b.template]
      .some(s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').includes(q.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd'))));
  }

  private renderSummary(): void {
    this.$('bp-summary').textContent = `${this.bots.filter(b => b.charId).length} đã thiết lập / 200 · ${this.bots.filter(b => b.online).length} online`;
  }

  private renderList(): void {
    if (!this.$('bl-body')) return;
    this.refreshSetupFilter();
    this.updatePicked();
    this.$('bl-count-all').textContent = `(${this.bots.length})`;
    for (const state of ['online', 'offline', 'new'] as const) {
      this.$(`bl-count-${state}`).textContent = `(${this.bots.filter(b => this.botTab(b) === state).length})`;
    }
    this.$('bl-results').textContent = `Hiển thị ${this.filtered().length} / ${this.rosterTab === 'all' ? this.bots.length : this.bots.filter(b => this.botTab(b) === this.rosterTab).length} nhân vật trong tab.`;
    const empty = this.filtered().length === 0;
    this.root.querySelectorAll<HTMLButtonElement>('#bl-quick-select button').forEach(button => { button.disabled = empty; });
    const rows = this.filtered().slice(0, 1000).map(b => `<tr class="${b.online ? 'on' : ''}">
      <td><label class="bp-select-cell"><input type="checkbox" aria-label="Chọn ${esc(b.name)}" data-user="${esc(b.username)}" ${this.picked.has(b.username) ? 'checked' : ''}></label></td>
      <td class="bp-name" title="${esc(b.username)}">${esc(b.name)} <span class="bp-gender ${b.gender === 'female' ? 'female' : 'male'}" role="img" aria-label="${b.gender === 'female' ? 'Nữ' : 'Nam'}" title="${b.gender === 'female' ? 'Nữ' : 'Nam'}">${b.gender === 'female' ? '♀' : '♂'}</span></td><td>${esc(FACTIONS[b.faction]?.name ?? '—')} / ${ELEMENT_NAMES[FACTIONS[b.faction]?.element] ?? '—'}</td><td>${b.level || '—'}</td>
      <td>${esc(MAPS[b.mapId]?.name ?? (b.mapId ? String(b.mapId) : '—'))}</td><td>${b.gear === 'green' ? 'Đồ xanh' : b.gear === 'gold' ? 'Hoàng kim' : '—'}</td><td>${esc(b.horse === 'random' ? 'Theo cấp' : HORSES[b.horse ?? '']?.name ?? '—')}</td><td>${b.online ? '🟢 Online' : this.running.has(b.username) ? ({preparing:'Đang chuẩn bị',queued:'Chờ vào game',reconnecting:'Đang vào lại',stopping:'Đang dừng'}[this.running.get(b.username)!.phase] ?? 'Đang vào game') : !b.charId ? 'Chưa thiết lập' : b.pending ? '🔴 Offline · Chờ áp mẫu' : '🔴 Offline'}</td><td>${esc(b.templateTitle || b.template || (b.charId ? 'Tự cài đặt' : '—'))}</td><td>${esc(this.scenarioTitles[this.assignments[b.username]] ?? this.running.get(b.username)?.title ?? this.assignments[b.username] ?? '—')}</td></tr>`);
    this.$('bl-body').innerHTML = rows.join('') || '<tr><td colspan="10" class="bp-empty">Không có nhân vật khớp bộ lọc.</td></tr>';
  }
}
