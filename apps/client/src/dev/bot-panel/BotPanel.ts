import {
  BOT_BEHAVIORS, DEFAULT_AUTO, DEFAULT_BOT_SCENARIO, DEFAULT_BOT_TEMPLATE, FACTIONS, FACTION_IDS, HORSE_IDS, ITEMS, MAPS,
  SHOP_ITEMS, potionTotal, type AutoSettings, type BotBehavior, type BotInfo, type BotScenario, type BotTemplate,
} from '@vltk/shared';
import { SERVER_URL } from '../../net/api';
import { storage } from '../../platform/storage';
import './botPanel.css';

/**
 * `/?bots` (dev only, desktop): bot giả lập người chơi — docs/bots.md. Three parts:
 *  1. Mẫu tài khoản: make N bot accounts from a template (applied when each bot first enters the game), save templates as
 *     bots/templates/<name>.json;
 *  2. Danh sách bot: overview, filter, reset to the template being edited, delete;
 *  3. Kịch bản chạy: behaviors and their share, Auto options, human-like pacing → bots/<name>.json, run with
 *     `npm run bots -- <name>`.
 * Talks to the server's bot dev API (apps/server/src/dev/botAdmin.ts; DEV_TOOLS, same machine only). Measuring the server is a
 * separate tool.
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
  autoRadius: 'Bán kính quanh chỗ bắt đầu', autoSkipBoss: 'Bỏ qua boss', autoBuff: 'Tự dùng bùa lợi', autoReturn: 'Quay về chỗ cũ khi hết quái',
  autoSeek: 'Tìm quái ở xa', autoPickup: 'Tự nhặt đồ', autoPriority: 'Mục tiêu ưu tiên', autoRotate: 'Xoay chiêu',
  autoCurse: 'Tự dùng bùa hại', autoMap: 'Tự đổi bãi luyện công theo cấp', autoRevive: 'Tự hồi sinh rồi quay lại',
  autoBuyPotion: 'Hết thuốc về thành mua', autoJunk: 'Tự bán đồ trắng không mặc được', autoLoot: 'Lọc đồ nhặt',
  autoReachPct: 'Tầm xa: đứng ở % tầm chiêu', autoMeleeClose: 'Cận chiến áp sát', autoHp: 'Uống thuốc khi Sinh lực < %',
  autoMp: 'Uống thuốc khi Nội lực < %',
};
const SELECTS: Partial<Record<keyof AutoSettings, [string, string][]>> = {
  autoPriority: [['near', 'Gần nhất'], ['boss', 'Boss trước']],
  autoLoot: [['all', 'Tất cả'], ['magic', 'Đồ xanh trở lên + tiền'], ['money', 'Chỉ tiền']],
};

const opt = (value: string, label: string) => `<option value="${value}">${label}</option>`;
const factionOptions = [opt('all', 'Chia đều 11 phái'), opt('', 'Chưa vào phái (hệ chia đều)'),
  ...FACTION_IDS.map(id => opt(id, FACTIONS[id].name))].join('');
const potionOptions = (stat: 'hp' | 'mp') => [opt('', '— không —'),
  ...SHOP_ITEMS.drug.filter(d => potionTotal(d, stat) > 0).map(d => opt(d.id, `${d.name} (${potionTotal(d, stat)})`))].join('');
const horseOptions = [opt('', 'Không'), opt('random', 'Ngẫu nhiên (theo cấp)'), ...HORSE_IDS.map(id => opt(id, ITEMS[id]?.name ?? id))].join('');

const f = (label: string, input: string, hint = '') => `<label class="bp-f"><span>${label}</span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
const num = (id: string, min = 0, max = 1e9, step = 1) => `<input id="${id}" type="number" min="${min}" max="${max}" step="${step}">`;
const chk = (id: string, label: string) => `<label class="bp-c"><input id="${id}" type="checkbox"> ${label}</label>`;
const sel = (id: string, options: string) => `<select id="${id}">${options}</select>`;

const PAGE = `
<header class="bp-head">
  <h1>Bot giả lập người chơi</h1>
  <span id="bp-server"></span>
  <span id="bp-status" class="bp-status"></span>
</header>
<div class="bp-cols">
<section class="bp-card">
  <h2>1. Mẫu tài khoản</h2>
  <div class="bp-row">
    ${sel('bt-file', '')}<input id="bt-name" placeholder="tên mẫu (vd. luyen-90)"><button id="bt-load">Nạp</button><button id="bt-save">Lưu mẫu</button>
  </div>
  <div class="bp-grid">
    ${f('Tiền tố tài khoản', '<input id="bt-prefix">', 'bot…: bot_1, bot_2…')}
    ${f('Mật khẩu chung', '<input id="bt-password">', 'để đăng nhập bot bằng trình duyệt')}
    ${f('Môn phái', sel('bt-faction', factionOptions))}
    ${f('Giới tính', sel('bt-gender', [opt('mix', 'Xen kẽ'), opt('male', 'Nam'), opt('female', 'Nữ')].join('')), 'phái chỉ nhận một giới thì theo phái')}
    ${f('Cấp từ', num('bt-lvmin', 1, 200))}
    ${f('đến', num('bt-lvmax', 1, 200), 'cấp < 10 thì chưa vào phái')}
    ${f('Điểm tiềm năng', sel('bt-potential', [opt('suggest', 'Theo gợi ý tuyến'), opt('str', 'Dồn Sức mạnh'), opt('dex', 'Dồn Thân pháp'), opt('vit', 'Dồn Sinh khí'), opt('eng', 'Dồn Nội công')].join('')))}
    ${f('Điểm kỹ năng', sel('bt-skills', [opt('suggest', 'Theo gợi ý tuyến'), opt('none', 'Không cộng')].join('')))}
    ${f('Trang bị', sel('bt-gear', [opt('starter', 'Đồ khởi đầu'), opt('gold', 'Bộ hoàng kim môn phái')].join('')), 'hoàng kim cần cấp 80–99; món chưa đủ cấp để trong túi')}
    ${f('Ngựa', sel('bt-horse', horseOptions))}
    ${f('Tiền túi (lượng)', num('bt-money', 0, 2e9, 10000))}
    ${f('Bản đồ xuất hiện', sel('bt-mapmode', [opt('training', 'Bãi luyện công theo cấp'), opt('town', 'Thành (Biện Kinh)'), opt('list', 'Rải đều danh sách')].join('')))}
    ${f('Danh sách bản đồ', '<input id="bt-maps" placeholder="37, 140">', 'id cách nhau dấu phẩy')}
    ${f('Bán kính rải (px)', num('bt-radius', 0, 2000))}
    ${f('Thuốc Sinh lực', sel('bt-hp', potionOptions('hp')))}
    ${f('số bình', num('bt-hpn', 0, 200))}
    ${f('Thuốc Nội lực', sel('bt-mp', potionOptions('mp')))}
    ${f('số bình', num('bt-mpn', 0, 200))}
  </div>
  <div class="bp-row">${chk('bt-tiers', 'Học hết chiêu 90 / 120 / 150')}${chk('bt-ring', 'Càn Khôn Giới Chỉ')}</div>
  <div class="bp-row bp-act">
    <span>Tạo</span>${num('bt-count', 1, 500)}<span>bot theo mẫu này</span><button id="bt-create" class="bp-main">Tạo bot</button>
  </div>
  <p class="bp-note">Mẫu được áp khi bot vào game lần đầu (cấp, phái, điểm, chiêu, đồ…), bằng đúng các hàm của lệnh bài / gợi ý cộng điểm.</p>
</section>

<section class="bp-card">
  <h2>2. Danh sách bot</h2>
  <div id="bp-summary" class="bp-summary"></div>
  <div class="bp-row">
    <input id="bl-filter" placeholder="lọc: tên, phái, bản đồ…">
    <button id="bl-all">Chọn hết</button><button id="bl-reset">Áp lại mẫu đang soạn</button><button id="bl-del" class="bp-danger">Xóa</button>
    <button id="bl-refresh">Làm mới</button>
  </div>
  <div class="bp-table"><table><thead><tr><th></th><th>Tài khoản</th><th>Nhân vật</th><th>Phái</th><th>Cấp</th><th>Bản đồ</th><th>Trạng thái</th><th>Mẫu</th></tr></thead>
  <tbody id="bl-body"></tbody></table></div>
  <p class="bp-note">Bot đang online không đặt lại / xóa được (tắt runner trước).</p>
</section>

<section class="bp-card">
  <h2>3. Kịch bản chạy</h2>
  <div class="bp-row">
    ${sel('sc-file', '')}<input id="sc-name" placeholder="tên kịch bản (vd. dong-vui)"><button id="sc-load">Nạp</button><button id="sc-save" class="bp-main">Lưu kịch bản</button>
  </div>
  <div id="sc-cmd" class="bp-cmd"></div>
  <div class="bp-grid">
    ${f('Ghi chú', '<input id="sc-note">')}
    ${f('Server', '<input id="sc-server">')}
    ${f('Tiền tố bot', '<input id="sc-prefix">')}
    ${f('Số bot', num('sc-count', 0, 100000), '0 = tất cả bot có tiền tố này')}
    ${f('Vào game (bot / giây)', num('sc-join', 1, 1000))}
    ${f('Thời lượng (giây)', num('sc-duration', 0, 604800), '0 = chạy tới khi Ctrl+C')}
    ${f('Hạt giống ngẫu nhiên', num('sc-seed', 0, 2147483647), 'giữ nguyên = chạy lại ra cùng cách chia')}
  </div>
  <h3>Tỉ lệ hành vi</h3>
  <div class="bp-grid" id="sc-behaviors"></div>
  <h3>Tùy chọn hành vi</h3>
  <div class="bp-grid">
    ${f('PK: chế độ', sel('sc-pkmode', [opt('2', 'Đồ sát'), opt('1', 'Chiến đấu (khác phe)')].join('')))}
    ${f('PK: mục tiêu', sel('sc-pktarget', [opt('nearest', 'Gần nhất'), opt('enemy', 'Khác phe'), opt('random', 'Ngẫu nhiên')].join('')))}
    ${f('Đi dạo: bán kính', num('sc-wander', 20, 5000))}
    ${f('Đi bản đồ: mỗi (giây)', num('sc-every', 5, 3600))}
    ${f('Đi bản đồ: danh sách', '<input id="sc-travel" placeholder="37, 140">')}
    ${f('Dồn một chỗ: bản đồ', num('sc-cmap', 1, 100000))}
    ${f('Dồn: x', num('sc-cx', 0, 100000), '0 = điểm vào bản đồ')}
    ${f('Dồn: y', num('sc-cy', 0, 100000))}
    ${f('Dồn: bán kính', num('sc-cr', 0, 2000))}
  </div>
  <div class="bp-row">${chk('sc-ccast', 'Dồn một chỗ: liên tục ra chiêu (bản đồ cho đánh nhau)')}${chk('sc-reconnect', 'Rớt mạng thì tự vào lại')}</div>
  <h3>Giống người</h3>
  <div class="bp-grid">
    ${f('Chu kỳ ra quyết định (ms)', num('sc-tick', 50, 5000))}
    ${f('Phản ứng chậm từ (ms)', num('sc-rmin', 0, 5000))}
    ${f('đến (ms)', num('sc-rmax', 0, 5000))}
    ${f('Lệnh tối đa / giây', num('sc-maxo', 1, 30), 'server cho tối đa 30')}
  </div>
  <h3>Tự động đánh (hành vi Luyện quái)</h3>
  <div class="bp-grid" id="sc-auto"></div>
</section>
</div>`;

class BotPanel {
  private bots: BotInfo[] = [];
  private picked = new Set<string>();

  constructor(private root: HTMLElement) {
    this.$('bp-server').textContent = `Server: ${SERVER_URL}`;
    this.$('sc-behaviors').innerHTML = (Object.entries(BOT_BEHAVIORS) as [BotBehavior, { name: string; note: string }][])
      .map(([k, b]) => f(b.name, num(`sc-b-${k}`, 0, 1000), b.note)).join('');
    this.$('sc-auto').innerHTML = (Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]).map(k => {
      const d = DEFAULT_AUTO[k];
      if (typeof d === 'boolean') return chk(`sc-a-${k}`, AUTO_LABELS[k]);
      if (SELECTS[k]) return f(AUTO_LABELS[k], sel(`sc-a-${k}`, SELECTS[k]!.map(([v, l]) => opt(v, l)).join('')));
      return f(AUTO_LABELS[k], num(`sc-a-${k}`, 0, 100000));
    }).join('');
    this.writeTemplate(DEFAULT_BOT_TEMPLATE);
    this.writeScenario({ ...DEFAULT_BOT_SCENARIO, server: SERVER_URL });
    this.$<HTMLInputElement>('bt-count').value = '10';

    this.on('bt-load', () => void this.loadFile('templates'));
    this.on('bt-save', () => void this.saveFile('templates'));
    this.on('sc-load', () => void this.loadFile('scenarios'));
    this.on('sc-save', () => void this.saveFile('scenarios'));
    this.on('bt-create', () => void this.create());
    this.on('bl-all', () => {
      const shown = this.filtered();
      const all = shown.every(b => this.picked.has(b.username));
      for (const b of shown) all ? this.picked.delete(b.username) : this.picked.add(b.username);
      this.renderList();
    });
    this.on('bl-reset', () => void this.bulk('reset'));
    this.on('bl-del', () => void this.bulk('delete'));
    this.on('bl-refresh', () => void this.refresh());
    this.$('bl-filter').addEventListener('input', () => this.renderList());
    this.$('bl-body').addEventListener('change', e => {
      const box = e.target as HTMLInputElement;
      if (box.dataset.user) box.checked ? this.picked.add(box.dataset.user) : this.picked.delete(box.dataset.user);
    });
    this.$('sc-name').addEventListener('input', () => this.showCommand());

    void this.refreshFiles().then(() => this.restoreLast());
    void this.refresh();
    setInterval(() => void this.refresh(true), 5000);
  }

  private $<T extends HTMLElement = HTMLElement>(id: string): T { return this.root.querySelector(`#${id}`) as T; }
  private on(id: string, fn: () => void): void { this.$(id).addEventListener('click', fn); }
  private val(id: string): string { return this.$<HTMLInputElement>(id).value.trim(); }
  private n(id: string): number { return Number(this.val(id)) || 0; }
  private on_(id: string): boolean { return this.$<HTMLInputElement>(id).checked; }
  private set(id: string, v: string | number | boolean): void {
    const el = this.$<HTMLInputElement>(id);
    if (el.type === 'checkbox') el.checked = !!v; else el.value = String(v);
  }

  private status(text: string, bad = false): void {
    const s = this.$('bp-status');
    s.textContent = text;
    s.classList.toggle('bad', bad);
  }

  private async call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((json as { error?: string }).error ?? `${res.status}`);
    return json as T;
  }

  // ---------- forms ----------

  private readTemplate(): BotTemplate {
    const maps = (id: string) => this.val(id).split(/[\s,;]+/).map(Number).filter(x => Number.isInteger(x) && MAPS[x]);
    return {
      prefix: this.val('bt-prefix'), password: this.val('bt-password'), faction: this.val('bt-faction'),
      gender: this.val('bt-gender') as BotTemplate['gender'], level: [this.n('bt-lvmin'), this.n('bt-lvmax')],
      potential: this.val('bt-potential') as BotTemplate['potential'], skills: this.val('bt-skills') as BotTemplate['skills'],
      tiers: this.on_('bt-tiers'), gear: this.val('bt-gear') as BotTemplate['gear'], ring: this.on_('bt-ring'), horse: this.val('bt-horse'),
      money: this.n('bt-money'), hpPotion: this.val('bt-hp'), hpCount: this.n('bt-hpn'), mpPotion: this.val('bt-mp'), mpCount: this.n('bt-mpn'),
      map: { mode: this.val('bt-mapmode') as BotTemplate['map']['mode'], maps: maps('bt-maps'), radius: this.n('bt-radius') },
    };
  }

  private writeTemplate(t: BotTemplate): void {
    this.set('bt-prefix', t.prefix); this.set('bt-password', t.password); this.set('bt-faction', t.faction); this.set('bt-gender', t.gender);
    this.set('bt-lvmin', t.level[0]); this.set('bt-lvmax', t.level[1]); this.set('bt-potential', t.potential); this.set('bt-skills', t.skills);
    this.set('bt-tiers', t.tiers); this.set('bt-gear', t.gear); this.set('bt-ring', t.ring); this.set('bt-horse', t.horse);
    this.set('bt-money', t.money); this.set('bt-hp', t.hpPotion); this.set('bt-hpn', t.hpCount); this.set('bt-mp', t.mpPotion);
    this.set('bt-mpn', t.mpCount); this.set('bt-mapmode', t.map.mode); this.set('bt-maps', t.map.maps.join(', ')); this.set('bt-radius', t.map.radius);
  }

  private readScenario(): BotScenario {
    const maps = this.val('sc-travel').split(/[\s,;]+/).map(Number).filter(x => Number.isInteger(x) && MAPS[x]);
    const behaviors: Partial<Record<BotBehavior, number>> = {};
    for (const k of Object.keys(BOT_BEHAVIORS) as BotBehavior[]) if (this.n(`sc-b-${k}`) > 0) behaviors[k] = this.n(`sc-b-${k}`);
    const auto = { ...DEFAULT_AUTO } as Record<string, unknown>;
    for (const k of Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]) {
      const d = DEFAULT_AUTO[k];
      auto[k] = typeof d === 'boolean' ? this.on_(`sc-a-${k}`) : typeof d === 'number' ? this.n(`sc-a-${k}`) : this.val(`sc-a-${k}`);
    }
    return {
      version: 1, note: this.val('sc-note'), server: this.val('sc-server'), bots: { prefix: this.val('sc-prefix'), count: this.n('sc-count') },
      joinPerSecond: this.n('sc-join'), duration: this.n('sc-duration'), seed: this.n('sc-seed'), behaviors,
      pk: { mode: this.n('sc-pkmode') as 1 | 2, target: this.val('sc-pktarget') as BotScenario['pk']['target'] },
      wander: { radius: this.n('sc-wander') }, travel: { every: this.n('sc-every'), maps },
      crowd: { mapId: this.n('sc-cmap'), x: this.n('sc-cx'), y: this.n('sc-cy'), radius: this.n('sc-cr'), cast: this.on_('sc-ccast') },
      auto: auto as unknown as AutoSettings,
      human: { tickMs: this.n('sc-tick'), reactionMs: [this.n('sc-rmin'), this.n('sc-rmax')], maxOrdersPerSec: this.n('sc-maxo') },
      reconnect: this.on_('sc-reconnect'),
    };
  }

  private writeScenario(s: BotScenario): void {
    this.set('sc-note', s.note); this.set('sc-server', s.server); this.set('sc-prefix', s.bots.prefix); this.set('sc-count', s.bots.count);
    this.set('sc-join', s.joinPerSecond); this.set('sc-duration', s.duration); this.set('sc-seed', s.seed);
    for (const k of Object.keys(BOT_BEHAVIORS) as BotBehavior[]) this.set(`sc-b-${k}`, s.behaviors[k] ?? 0);
    this.set('sc-pkmode', s.pk.mode); this.set('sc-pktarget', s.pk.target); this.set('sc-wander', s.wander.radius);
    this.set('sc-every', s.travel.every); this.set('sc-travel', s.travel.maps.join(', '));
    this.set('sc-cmap', s.crowd.mapId); this.set('sc-cx', s.crowd.x); this.set('sc-cy', s.crowd.y); this.set('sc-cr', s.crowd.radius);
    this.set('sc-ccast', s.crowd.cast); this.set('sc-reconnect', s.reconnect);
    this.set('sc-tick', s.human.tickMs); this.set('sc-rmin', s.human.reactionMs[0]); this.set('sc-rmax', s.human.reactionMs[1]);
    this.set('sc-maxo', s.human.maxOrdersPerSec);
    for (const k of Object.keys(DEFAULT_AUTO) as (keyof AutoSettings)[]) this.set(`sc-a-${k}`, s.auto[k] as string | number | boolean);
  }

  private showCommand(): void {
    const name = this.val('sc-name');
    this.$('sc-cmd').innerHTML = name
      ? `Chạy (gốc repo): <code>npm run bots -- ${name}</code> · dừng: Ctrl+C`
      : 'Đặt tên rồi lưu kịch bản để có lệnh chạy.';
  }

  // ---------- files ----------

  private async refreshFiles(): Promise<void> {
    try {
      const files = await this.call<{ templates: string[]; scenarios: string[]; dir: string }>('/files');
      const fill = (id: string, names: string[], empty: string) => {
        this.$(id).innerHTML = [opt('', names.length ? '— đã lưu —' : empty), ...names.map(n => opt(n, n))].join('');
      };
      fill('bt-file', files.templates, '(chưa có mẫu)');
      fill('sc-file', files.scenarios, '(chưa có kịch bản)');
      this.$('bt-file').title = this.$('sc-file').title = `Lưu ở ${files.dir}`;
    } catch { /* status shows the server problem */ }
  }

  private async loadFile(kind: 'templates' | 'scenarios', name = ''): Promise<void> {
    const pre = kind === 'templates' ? 'bt' : 'sc';
    name ||= this.val(`${pre}-file`) || this.val(`${pre}-name`);
    if (!name) { this.status('Chọn một file đã lưu.', true); return; }
    try {
      const data = await this.call<BotTemplate | BotScenario>(`/files/${kind}/${name}`);
      if (kind === 'templates') this.writeTemplate(data as BotTemplate); else this.writeScenario(data as BotScenario);
      this.set(`${pre}-name`, name);
      this.remember(kind, name);
      this.showCommand();
      this.status(`Đã nạp ${kind === 'templates' ? 'mẫu' : 'kịch bản'} "${name}".`);
    } catch (e) { this.status(`Không nạp được: ${(e as Error).message}`, true); }
  }

  private async saveFile(kind: 'templates' | 'scenarios'): Promise<void> {
    const pre = kind === 'templates' ? 'bt' : 'sc';
    const name = this.val(`${pre}-name`);
    if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(name)) { this.status('Tên file: chữ thường không dấu, số, - _ (vd. luyen-90).', true); return; }
    try {
      const saved = await this.call<BotTemplate | BotScenario>(`/files/${kind}/${name}`, 'PUT', kind === 'templates' ? this.readTemplate() : this.readScenario());
      if (kind === 'templates') this.writeTemplate(saved as BotTemplate); else this.writeScenario(saved as BotScenario);
      this.remember(kind, name);
      await this.refreshFiles();
      this.showCommand();
      this.status(`Đã lưu ${kind === 'templates' ? `bots/templates/${name}.json` : `bots/${name}.json`}.`);
    } catch (e) { this.status(`Không lưu được: ${(e as Error).message}`, true); }
  }

  private remember(kind: string, name: string): void {
    const last = storage.getJson<Record<string, string>>(LAST_KEY) ?? {};
    storage.setJson(LAST_KEY, { ...last, [kind]: name });
  }

  private restoreLast(): void {
    const last = storage.getJson<Record<string, string>>(LAST_KEY) ?? {};
    if (last.templates) void this.loadFile('templates', last.templates);
    if (last.scenarios) void this.loadFile('scenarios', last.scenarios);
    this.showCommand();
  }

  // ---------- bots ----------

  private async create(): Promise<void> {
    const count = this.n('bt-count');
    try {
      const r = await this.call<{ created: string[] }>('', 'POST', { template: this.readTemplate(), count, templateName: this.val('bt-name') });
      this.status(`Đã tạo ${r.created.length} bot: ${r.created.slice(0, 3).join(', ')}${r.created.length > 3 ? '…' : ''}`);
      await this.refresh();
    } catch (e) { this.status(`Không tạo được: ${(e as Error).message}`, true); }
  }

  private async bulk(op: 'reset' | 'delete'): Promise<void> {
    const usernames = [...this.picked];
    if (!usernames.length) { this.status('Chưa chọn bot nào.', true); return; }
    if (op === 'delete' && !confirm(`Xóa hẳn ${usernames.length} tài khoản bot?`)) return;
    if (op === 'reset' && !confirm(`Đặt lại ${usernames.length} bot về cấp 1 với mẫu đang soạn?`)) return;
    try {
      const body = op === 'reset' ? { usernames, template: this.readTemplate(), templateName: this.val('bt-name') } : { usernames };
      const r = await this.call<{ reset?: string[]; deleted?: string[]; skipped: string[] }>(`/${op}`, 'POST', body);
      const done = (r.reset ?? r.deleted ?? []).length;
      this.status(`${op === 'reset' ? 'Đã đặt lại' : 'Đã xóa'} ${done} bot${r.skipped.length ? ` · bỏ qua ${r.skipped.length} bot đang online` : ''}.`);
      if (op === 'delete') for (const u of r.deleted ?? []) this.picked.delete(u);
      await this.refresh();
    } catch (e) { this.status(`Lỗi: ${(e as Error).message}`, true); }
  }

  private async refresh(quiet = false): Promise<void> {
    try {
      this.bots = await this.call<BotInfo[]>('');
      for (const u of this.picked) if (!this.bots.some(b => b.username === u)) this.picked.delete(u);
      this.renderSummary();
      this.renderList();
    } catch (e) {
      if (!quiet || !this.bots.length) {
        this.status(`Không gọi được API bot ở ${SERVER_URL}: ${(e as Error).message}. Server phải đang chạy, DEV_TOOLS bật, cùng máy.`, true);
      }
    }
  }

  private filtered(): BotInfo[] {
    const q = this.val('bl-filter').toLowerCase();
    if (!q) return this.bots;
    return this.bots.filter(b => [b.username, b.name, FACTIONS[b.faction]?.name ?? '', MAPS[b.mapId]?.name ?? '', String(b.mapId), b.template]
      .some(s => s.toLowerCase().includes(q)));
  }

  private renderSummary(): void {
    const count = (key: (b: BotInfo) => string) => {
      const m = new Map<string, number>();
      for (const b of this.bots) m.set(key(b), (m.get(key(b)) ?? 0) + 1);
      return [...m].sort((a, b) => b[1] - a[1]).map(([k, n]) => `<span class="bp-chip">${k} <b>${n}</b></span>`).join('');
    };
    const band = (lv: number) => (lv < 10 ? '1–9' : lv < 50 ? '10–49' : lv < 90 ? '50–89' : lv < 120 ? '90–119' : '120+');
    const online = this.bots.filter(b => b.online).length, pending = this.bots.filter(b => b.pending).length;
    this.$('bp-summary').innerHTML = `
      <div><b>${this.bots.length}</b> bot · <b>${online}</b> online · <b>${pending}</b> chờ áp mẫu</div>
      <div><i>Phái</i> ${count(b => FACTIONS[b.faction]?.name ?? 'Chưa vào phái')}</div>
      <div><i>Cấp</i> ${count(b => band(b.level))}</div>
      <div><i>Bản đồ</i> ${count(b => MAPS[b.mapId]?.name ?? String(b.mapId))}</div>`;
  }

  private renderList(): void {
    const rows = this.filtered().slice(0, 1000).map(b => `<tr class="${b.online ? 'on' : ''}">
      <td><input type="checkbox" data-user="${b.username}" ${this.picked.has(b.username) ? 'checked' : ''}></td>
      <td>${b.username}</td><td>${b.name}</td><td>${FACTIONS[b.faction]?.name ?? '—'}</td><td>${b.level}</td>
      <td>${MAPS[b.mapId]?.name ?? b.mapId}</td><td>${b.online ? 'online' : b.pending ? 'chờ áp mẫu' : 'offline'}</td><td>${b.template || '—'}</td></tr>`);
    this.$('bl-body').innerHTML = rows.join('') || '<tr><td colspan="8" class="bp-empty">Chưa có bot. Tạo ở mục 1.</td></tr>';
  }
}
