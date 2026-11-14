import { setupToolDialog } from '/dialogs.js';
// Công cụ Quản trị Boss Hoàng Kim VLTK 1 (tools/boss/public/app.js)

// Skill hints support hover, keyboard focus and touch.
const supportsAnchorArea = typeof CSS !== 'undefined' && CSS.supports('position-area: block-start');

function wireInterestHints(root = document) {
  for (const trigger of root.querySelectorAll('[interestfor]')) {
    const id = trigger.getAttribute('interestfor');
    if (!id) continue;
    const hint = document.getElementById(id);
    if (!hint || hint.getAttribute('popover') !== 'hint') continue;

    const hintText = (hint.textContent || '').trim().replace(/\s+/g, ' ');
    const triggerName = (
      trigger.getAttribute('aria-label') ||
      trigger.textContent ||
      trigger.querySelector('img')?.getAttribute('alt') ||
      ''
    ).trim().replace(/\s+/g, ' ');

    if (hintText && hintText !== triggerName && !hint.hasAttribute('role')) {
      hint.setAttribute('role', 'tooltip');
    }
    if (!triggerName && !trigger.hasAttribute('aria-labelledby')) {
      trigger.setAttribute('aria-labelledby', id);
    } else if (!trigger.hasAttribute('aria-describedby') && !trigger.hasAttribute('aria-expanded')) {
      trigger.setAttribute('aria-describedby', id);
    }

    // Fallback mở và định vị popover cạnh icon skill khi trình duyệt chưa có native interestfor / anchor positioning
    if (!trigger.dataset.hintWired) {
      trigger.dataset.hintWired = '1';
      const showHint = () => {
        try {
          if (typeof hint.showPopover === 'function' && !hint.matches(':popover-open')) {
            hint.showPopover();
          }
        } catch { /* ignore */ }
        if (!supportsAnchorArea) {
          const r = trigger.getBoundingClientRect();
          hint.style.position = 'fixed';
          hint.style.inset = 'auto';
          hint.style.margin = '0';
          hint.style.left = `${Math.max(8, Math.round(r.left + r.width / 2 - hint.offsetWidth / 2))}px`;
          hint.style.top = `${Math.max(8, Math.round(r.top - hint.offsetHeight - 6))}px`;
        }
      };
      const hideHint = () => {
        try {
          if (typeof hint.hidePopover === 'function' && hint.matches(':popover-open')) {
            hint.hidePopover();
          }
        } catch { /* ignore */ }
      };
      trigger.addEventListener('click', showHint);
      trigger.addEventListener('pointerenter', showHint);
      trigger.addEventListener('pointerleave', hideHint);
      trigger.addEventListener('focus', showHint);
      trigger.addEventListener('blur', hideHint);
    }
  }
}

// Khai báo state toàn cục của ứng dụng
let saving = false;
let applying = false;
let bootstrap = null;
let state = null;
let originalSnapshot = '';
let activeFactionFilter = 'all';
let editingBossIdForGold = null;
let tempSelectedGold = new Set();
let activeGoldDialogFaction = 'all';

let editingBossIdForMap = null;
let tempMapId = null;
let tempMapX = 0;
let tempMapY = 0;
const minimapImages = new Map();
let mapRequest = 0;
let mapPending = false;

const $ = (id) => document.getElementById(id);

async function init() {
  setupToolDialog('dlg-gold');
  setupToolDialog('dlg-map');
  $('dlg-map').addEventListener('toolclose', () => { mapRequest++; mapPending = false; });

  for (const input of document.querySelectorAll('input[type=number]')) {
    input.required = !['inp-add-minute'].includes(input.id);
    input.addEventListener('input', () => input.setCustomValidity(''));
  }
  const res = await fetch('/api/bootstrap');
  if (!res.ok) throw new Error('Không tải được cấu hình. Hãy thử tải lại trang.');
  bootstrap = await res.json();
  originalSnapshot = JSON.stringify(bootstrap.config);
  state = structuredClone(bootstrap.config);

  bindGlobalEvents();
  bindGoldDialogEvents();
  bindMapDialogEvents();
  renderAll();
  markDirty();
}

function markDirty() {
  const isDirty = JSON.stringify(state) !== originalSnapshot;
  const el = $('save-status');
  if (isDirty) {
    el.textContent = 'Có thay đổi chưa lưu';
    el.className = 'save-status dirty';
  } else {
    el.textContent = 'Đang xem bản đã lưu';
    el.className = 'save-status';
  }
  $('btn-save').disabled = !isDirty || saving || applying;
  $('btn-reset').disabled = !isDirty || saving || applying;
  $('btn-apply').disabled = isDirty || saving || applying;
  $('btn-apply').title = isDirty ? 'Lưu thiết lập trước khi áp dụng vào game.' : 'Áp dụng bản đã lưu vào game đang chạy.';
  renderHeaderStats();
}

function renderHeaderStats() {
  const enabledCount = state.bosses.filter(b => b.enabled).length;
  const totalGoldAssigned = state.bosses.reduce((sum, b) => sum + b.goldDrops.length, 0);
  $('header-stats').innerHTML = `
    <span class="stat-pill">Boss đang bật: <strong>${enabledCount}/${state.bosses.length}</strong></span>
    <span class="stat-pill">Trang bị HK đã phân bổ: <strong>${totalGoldAssigned}/140</strong></span>
  `;
}

// ==================== SECTION 1: CÀI ĐẶT CHUNG ====================

function bindGlobalEvents() {
  // Chế độ xuất hiện
  for (const radio of document.querySelectorAll('input[name="spawnMode"]')) {
    radio.addEventListener('change', (e) => {
      state.settings.spawnMode = e.target.value;
      markDirty();
      renderGlobalSettings();
    });
  }

  window.addEventListener('beforeunload', event => {
    if (state && JSON.stringify(state) !== originalSnapshot) { event.preventDefault(); event.returnValue = ''; }
  });
  $('btn-apply').addEventListener('click', () => void applyConfig());

  // Thời gian hồi sinh liên tục (giây)
  $('inp-continuous-sec').addEventListener('input', (e) => {
    if (!e.target.checkValidity()) return;
    const v = Number(e.target.value);
    state.settings.continuousRespawnSec = v;
    markDirty();
  });

  // Thêm giờ cố định
  $('btn-add-time').addEventListener('click', () => {
    const val = $('inp-add-time').value.trim();
    if (!val) return;
    if (!state.settings.fixedTimes.includes(val)) {
      state.settings.fixedTimes.push(val);
      state.settings.fixedTimes.sort();
      markDirty();
      renderGlobalSettings();
    }
  });

  for (const btn of document.querySelectorAll('[data-preset-time]')) {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-preset-time');
      if (t && !state.settings.fixedTimes.includes(t)) {
        state.settings.fixedTimes.push(t);
        state.settings.fixedTimes.sort();
        markDirty();
        renderGlobalSettings();
      }
    });
  }

  // Chọn nhanh mốc phút (5p, 10p, 30p, 45p...)
  for (const btn of document.querySelectorAll('.minute-toggle')) {
    btn.addEventListener('click', () => {
      const m = Number(btn.getAttribute('data-min'));
      const idx = state.settings.hourlyMinutes.indexOf(m);
      if (idx >= 0) {
        if (state.settings.hourlyMinutes.length > 1) state.settings.hourlyMinutes.splice(idx, 1);
      } else {
        state.settings.hourlyMinutes.push(m);
        state.settings.hourlyMinutes.sort((a, b) => a - b);
      }
      markDirty();
      renderGlobalSettings();
    });
  }

  $('btn-add-minute').addEventListener('click', () => {
    const raw = $('inp-add-minute').value.trim();
    if (raw === '') return;
    if (!$('inp-add-minute').reportValidity()) return;
    const m = Number(raw);
    if (!Number.isFinite(m)) return;
    if (!state.settings.hourlyMinutes.includes(m)) {
      state.settings.hourlyMinutes.push(m);
      state.settings.hourlyMinutes.sort((a, b) => a - b);
      $('inp-add-minute').value = '';
      markDirty();
      renderGlobalSettings();
    }
  });

  // Số lần tung & Tỉ lệ rơi 3 nhóm
  $('inp-drop-rolls').addEventListener('input', (e) => {
    if (!e.target.checkValidity()) return;
    state.settings.dropRolls = Number(e.target.value);
    markDirty();
    renderDropRatesSummary();
  });

  const bindRatePair = (inpId, rngId, key) => {
    const update = (val) => {
      const field = $(inpId);
      const value = Number(val);
      field.value = String(val);
      if (!field.checkValidity()) return;
      state.settings[key] = value;
      $(rngId).value = String(value);
      markDirty();
      renderDropRatesSummary();
    };
    $(inpId).addEventListener('input', e => update(e.target.value));
    $(rngId).addEventListener('input', e => update(e.target.value));
  };

  bindRatePair('inp-rate-blue', 'rng-rate-blue', 'blueRatePct');
  bindRatePair('inp-rate-special', 'rng-rate-special', 'specialRatePct');
  bindRatePair('inp-rate-gold', 'rng-rate-gold', 'goldRatePct');

  // Tìm kiếm & lọc Boss
  $('inp-search').addEventListener('input', () => renderBossSections());
  $('sel-tier').addEventListener('change', () => renderBossSections());

  // Lưu & Hoàn tác
  $('btn-reset').addEventListener('click', () => {
    state = JSON.parse(originalSnapshot);
    markDirty();
    renderAll();
  });

  $('btn-save').addEventListener('click', () => void saveConfig());
}

function renderGlobalSettings() {
  const s = state.settings;
  for (const [id,mode] of [['controls-continuous','continuous'],['controls-fixed','fixedTimes'],['controls-hourly','hourlyMinutes']]) {
    $(id).hidden = s.spawnMode !== mode;
    for (const control of $(id).querySelectorAll('input,button')) control.disabled = s.spawnMode !== mode;
  }
  for (const radio of document.querySelectorAll('input[name="spawnMode"]')) {
    radio.checked = radio.value === s.spawnMode;
  }
  $('mode-card-continuous').classList.toggle('active', s.spawnMode === 'continuous');
  $('mode-card-fixed').classList.toggle('active', s.spawnMode === 'fixedTimes');
  $('mode-card-hourly').classList.toggle('active', s.spawnMode === 'hourlyMinutes');

  $('inp-continuous-sec').value = String(s.continuousRespawnSec);

  // Render chip giờ cố định
  const fixedEl = $('fixed-times-list');
  fixedEl.innerHTML = s.fixedTimes.map(t => `
    <span class="time-chip">
      ${t}
      <button type="button" data-rm-time="${t}" aria-label="Xóa khung giờ ${t}">✕</button>
    </span>
  `).join('');
  for (const btn of fixedEl.querySelectorAll('[data-rm-time]')) {
    btn.addEventListener('click', () => {
      const t = btn.getAttribute('data-rm-time');
      state.settings.fixedTimes = state.settings.fixedTimes.filter(x => x !== t);
      markDirty();
      renderGlobalSettings();
    });
  }

  // Render chip số phút mỗi giờ
  for (const btn of document.querySelectorAll('.minute-toggle')) {
    const m = Number(btn.getAttribute('data-min'));
    btn.classList.toggle('selected', s.hourlyMinutes.includes(m));
    btn.setAttribute('aria-pressed', String(s.hourlyMinutes.includes(m)));
  }
  const minsEl = $('hourly-minutes-list');
  minsEl.innerHTML = s.hourlyMinutes.map(m => `
    <span class="time-chip">
      Phút :${String(m).padStart(2, '0')} (${m}p)
      <button type="button" data-rm-min="${m}" aria-label="Xóa mốc phút ${m}">✕</button>
    </span>
  `).join('');
  for (const btn of minsEl.querySelectorAll('[data-rm-min]')) {
    btn.addEventListener('click', () => {
      const m = Number(btn.getAttribute('data-rm-min'));
      if (state.settings.hourlyMinutes.length <= 1) return;
      state.settings.hourlyMinutes = state.settings.hourlyMinutes.filter(x => x !== m);
      markDirty();
      renderGlobalSettings();
    });
  }

  const sample7 = s.hourlyMinutes.map(m => `7h${String(m).padStart(2, '0')}`).join(', ');
  const sample8 = s.hourlyMinutes.map(m => `8h${String(m).padStart(2, '0')}`).join(', ');
  $('hourly-preview').textContent = s.hourlyMinutes.length
    ? `Lịch mẫu: ${sample7} · ${sample8} (lặp lại mỗi giờ)`
    : 'Chưa chọn mốc phút nào.';

  // Drop inputs
  $('inp-drop-rolls').value = String(s.dropRolls);
  $('inp-rate-blue').value = String(s.blueRatePct);
  $('rng-rate-blue').value = String(s.blueRatePct);
  $('inp-rate-special').value = String(s.specialRatePct);
  $('rng-rate-special').value = String(s.specialRatePct);
  $('inp-rate-gold').value = String(s.goldRatePct);
  $('rng-rate-gold').value = String(s.goldRatePct);
  renderDropRatesSummary();
}

function renderDropRatesSummary() {
  const s = state.settings;
  $('bar-blue').style.width = `${s.blueRatePct}%`;
  $('bar-special').style.width = `${s.specialRatePct}%`;
  $('bar-gold').style.width = `${s.goldRatePct}%`;

  const totalPct = Math.round((s.blueRatePct + s.specialRatePct + s.goldRatePct) * 10) / 10;
  const valid = totalPct <= 100.00001;
  $('inp-rate-gold').setCustomValidity(valid ? '' : 'Tổng ba tỉ lệ không được vượt 100%. Hãy giảm một tỉ lệ.');
  const emptyPct = Math.max(0, Math.round((100 - totalPct) * 10) / 10);
  const probAtLeastOneGold = (1 - Math.pow(1 - s.goldRatePct / 100, s.dropRolls)) * 100;

  $('rate-summary').innerHTML = `
    <span>Tổng tỉ lệ: <strong>${totalPct}%</strong> (Xanh <strong>${s.blueRatePct}%</strong> · Đặc biệt <strong>${s.specialRatePct}%</strong> · Hoàng Kim <strong>${s.goldRatePct}%</strong>${emptyPct > 0 ? ` · Trượt ${emptyPct}%` : ''})</span>
    <span class="badge badge-gold">Xác suất rơi ≥ 1 món Hoàng Kim / Boss (${s.dropRolls} lần tung): <strong>${probAtLeastOneGold.toFixed(1)}%</strong> (khi Boss có bảng Hoàng Kim)</span>
  `;
}

// ==================== SECTION 2: DANH SÁCH BOSS THEO HỆ PHÁI ====================

function renderFactionTabs() {
  const tabsEl = $('faction-tabs');
  const counts = { all: state.bosses.length };
  for (const f of bootstrap.factions) {
    counts[f.id] = state.bosses.filter(b => b.faction === f.id).length;
  }

  const allTab = `<button type="button" aria-pressed="${activeFactionFilter === 'all'}" class="faction-tab ${activeFactionFilter === 'all' ? 'active' : ''}" data-faction-tab="all">Tất cả (${counts.all})</button>`;
  const fTabs = bootstrap.factions.map(f => `
    <button type="button" aria-pressed="${activeFactionFilter === f.id}" class="faction-tab ${activeFactionFilter === f.id ? 'active' : ''}" data-faction-tab="${f.id}">
      ${f.name} <span class="muted">(${counts[f.id] || 0})</span>
    </button>
  `).join('');

  tabsEl.innerHTML = allTab + fTabs;
  for (const btn of tabsEl.querySelectorAll('[data-faction-tab]')) {
    btn.addEventListener('click', () => {
      activeFactionFilter = btn.getAttribute('data-faction-tab');
      renderFactionTabs();
      renderBossSections();
    });
  }
}

function getGoldItemMap() {
  const map = new Map();
  for (const suite of bootstrap.goldSuites) {
    for (const item of suite.items) {
      map.set(item.id, item);
    }
  }
  return map;
}

function getMapById(id) {
  return bootstrap.maps.find(m => m.id === id);
}

function renderBossSections() {
  const query = $('inp-search').value.trim().toLowerCase();
  const tierFilter = $('sel-tier').value;
  const goldMap = getGoldItemMap();
  const container = $('faction-sections');

  const factionsToShow = activeFactionFilter === 'all'
    ? bootstrap.factions
    : bootstrap.factions.filter(f => f.id === activeFactionFilter);

  const htmlBlocks = [];

  for (const faction of factionsToShow) {
    const bosses = state.bosses.filter(b => {
      if (b.faction !== faction.id) return false;
      if (tierFilter !== 'all' && b.tier !== tierFilter) return false;
      if (query) {
        const mName = getMapById(b.mapId)?.name || '';
        const hay = `${b.name} ${b.id} ${b.sprite} ${mName} ${b.mapId}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });

    if (!bosses.length) continue;

    const captionId = `cap-faction-${faction.id}`;
    const rowsHtml = bosses.map(b => {
      const tierLabel = bootstrap.tierLabels[b.tier] || b.tier;
      const mapInfo = getMapById(b.mapId);
      const tileX = Math.round(b.x / 8);
      const tileY = Math.round(b.y / 16);

      // Kỹ năng inline với icon + popover="hint" khi hover
      const skillsHtml = b.skills.map(([sid, slv], idx) => {
        const sk = bootstrap.skills[sid];
        const skName = sk?.name || `Kỹ năng #${sid}`;
        const iconUrl = sk?.icon || '';
        const tipId = `sk-tip-${b.id}-${sid}-${idx}`;
        return `
          <button type="button" class="skill-chip" interestfor="${tipId}" aria-label="${skName} (Cấp ${slv})">
            ${iconUrl ? `<img src="${iconUrl}" alt="${skName}" loading="lazy" />` : `<span>#${sid}</span>`}
            <span class="skill-lv-badge">${slv}</span>
          </button>
          <div popover="hint" id="${tipId}" class="skill-tooltip">${skName} · ID #${sid} · Cấp ${slv}</div>
        `;
      }).join('');

      // Bảng rơi trang bị Hoàng Kim
      const goldTagsHtml = b.goldDrops.map(gid => {
        const gItem = goldMap.get(gid);
        const gName = gItem ? gItem.name : gid;
        const gIcon = gItem ? gItem.icon : '';
        return `
          <span class="gold-tag" title="${gName} (${gid})">
            ${gIcon ? `<img src="${gIcon}" alt="" loading="lazy" />` : ''}
            <span>${gName}</span>
            <button type="button" data-rm-gold="${b.id}:${gid}" aria-label="Gỡ ${gName} khỏi ${b.name}">✕</button>
          </span>
        `;
      }).join('');

      return `
        <tr class="${b.enabled ? '' : 'boss-disabled'}" data-boss-row="${b.id}">
          <th scope="row">
            <div class="boss-name-cell">
              <label class="boss-name-top">
                <input type="checkbox" data-toggle-boss="${b.id}" ${b.enabled ? 'checked' : ''} aria-label="Bật xuất hiện ${b.name}" />
                <span class="boss-gold-name">${b.name}<span class="boss-state"> · ${b.enabled ? 'Đang bật' : 'Đã tắt'}</span></span>
              </label>
              <div>
                <span class="badge ${b.tier === 'major' ? 'badge-gold' : b.tier === 'newboss' ? 'badge-blue' : 'badge-warn'}">${tierLabel}</span>
              </div>
            </div>
          </th>
          <td>
            <div class="boss-sprite-box">
              <img src="/bosses/${b.sprite}.png" alt="${b.name}" loading="lazy" />
            </div>
          </td>
          <td>
            <small class="muted">ID #${b.id}</small>
            <label class="inline-field" style="margin-top:4px;">
              <span class="muted">Cấp:</span>
              <input type="number" data-boss-level="${b.id}" value="${b.level}" min="1" max="200" aria-label="Cấp của ${b.name}" style="width:80px;" />
            </label>
          </td>
          <td>
            <div class="skills-inline">
              ${skillsHtml}
            </div>
          </td>
          <td>
            <div class="gold-cell-wrap">
              <div class="gold-tags">
                ${goldTagsHtml ? `<details><summary>${b.goldDrops.length} món Hoàng Kim đã gắn</summary>${goldTagsHtml}</details>` : '<span class="muted">Chưa gắn trang bị Hoàng Kim</span>'}
              </div>
              <div>
                <button type="button" class="btn btn-sm" data-open-gold="${b.id}">
                  Chọn vật phẩm rơi (${b.goldDrops.length} món)
                </button>
              </div>
            </div>
          </td>
          <td>
            <div class="map-cell-wrap">
              <div class="map-badge-line">
                <strong>${mapInfo ? `${mapInfo.name} (#${b.mapId})` : `Map #${b.mapId}`}</strong>
                ${mapInfo?.levelBand ? `<span class="badge badge-blue">Cấp ${mapInfo.levelBand.join('–')}</span>` : ''}
              </div>
              <div class="coord-text">
                Tọa độ: X=${b.x}, Y=${b.y} <span class="muted">(Ô ${tileX}/${tileY})</span>
              </div>
              <div>
                <button type="button" class="btn btn-sm" data-open-map="${b.id}">
                  Chọn vị trí
                </button>
              </div>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    htmlBlocks.push(`
      <div class="faction-block">
        <div class="faction-block-head">
          <h3 id="${captionId}">Phái ${faction.name} · Hệ ${faction.elementLabel} (${bosses.length} Boss)</h3>
        </div>
        <div tabindex="0" role="region" aria-labelledby="${captionId}" class="table-wrapper">
          <table class="boss-table">
            <thead>
              <tr>
                <th>Tên Boss &amp; Phân loại</th>
                <th>Ảnh Boss</th>
                <th>ID &amp; Cấp</th>
                <th>Kỹ năng</th>
                <th>Bảng rơi Trang bị Hoàng Kim</th>
                <th>Bản đồ và vị trí</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      </div>
    `);
  }

  $('filter-count').textContent = `Hiển thị ${htmlBlocks.reduce((sum, block) => sum + (block.match(/data-boss-row=/g) || []).length, 0)}/${state.bosses.length} Boss`;
  container.innerHTML = htmlBlocks.length
    ? htmlBlocks.join('')
    : '<p class="muted" style="text-align:center;padding:30px;">Không tìm thấy Boss Hoàng Kim nào khớp bộ lọc.</p>';

  // Gắn sự kiện trên bảng
  for (const chk of container.querySelectorAll('[data-toggle-boss]')) {
    chk.addEventListener('change', () => {
      const id = Number(chk.getAttribute('data-toggle-boss'));
      const boss = state.bosses.find(x => x.id === id);
      if (boss) {
        boss.enabled = chk.checked;
        markDirty();
        chk.closest('tr').classList.toggle('boss-disabled', !boss.enabled);
        chk.closest('tr').querySelector('.boss-state').textContent = boss.enabled ? ' · Đang bật' : ' · Đã tắt';
      }
    });
  }

  for (const inp of container.querySelectorAll('[data-boss-level]')) {
    inp.addEventListener('change', () => {
      const id = Number(inp.getAttribute('data-boss-level'));
      const boss = state.bosses.find(x => x.id === id);
      if (boss) {
        if (!inp.reportValidity()) return;
        boss.level = Number(inp.value);
        markDirty();
      }
    });
  }

  for (const rmBtn of container.querySelectorAll('[data-rm-gold]')) {
    rmBtn.addEventListener('click', () => {
      const [bIdStr, gid] = rmBtn.getAttribute('data-rm-gold').split(':');
      const boss = state.bosses.find(x => x.id === Number(bIdStr));
      if (boss) {
        boss.goldDrops = boss.goldDrops.filter(x => x !== gid);
        markDirty();
        renderBossSections();
      }
    });
  }

  for (const btn of container.querySelectorAll('[data-open-gold]')) {
    btn.addEventListener('click', () => openGoldDialog(Number(btn.getAttribute('data-open-gold'))));
  }

  for (const btn of container.querySelectorAll('[data-open-map]')) {
    btn.addEventListener('click', () => openMapDialog(Number(btn.getAttribute('data-open-map'))));
  }

  // Khởi tạo ARIA & hover cho các icon kỹ năng vừa render
  wireInterestHints(container);
}

// ==================== DIALOG 1: CHỌN TRANG BỊ HOÀNG KIM ====================

function bindGoldDialogEvents() {
  const dlg = $('dlg-gold');
  $('btn-close-gold').addEventListener('click', () => dlg.close());
  $('btn-cancel-gold').addEventListener('click', () => dlg.close());

  $('inp-gold-search').addEventListener('input', () => renderGoldDialogSuites());

  $('btn-gold-clear-boss').addEventListener('click', () => {
    tempSelectedGold.clear();
    renderGoldDialogSuites();
  });

  $('btn-gold-select-faction').addEventListener('click', () => {
    const lockedByOther = getLockedGoldOwners(editingBossIdForGold);
    for (const checkbox of $('gold-suites-container').querySelectorAll('[data-gold-chk]:not(:disabled)')) {
      tempSelectedGold.add(checkbox.dataset.goldChk);
    }
    renderGoldDialogSuites();
  });

  $('btn-apply-gold').addEventListener('click', () => {
    const boss = state.bosses.find(b => b.id === editingBossIdForGold);
    if (boss) {
      boss.goldDrops = [...tempSelectedGold];
      markDirty();
      renderBossSections();
    }
    dlg.close();
  });
}

function getLockedGoldOwners(currentBossId) {
  const owners = new Map();
  for (const b of state.bosses) {
    if (b.id === currentBossId) continue;
    for (const gid of b.goldDrops) {
      owners.set(gid, `${b.name} (#${b.id})`);
    }
  }
  return owners;
}

function openGoldDialog(bossId) {
  const boss = state.bosses.find(b => b.id === bossId);
  if (!boss) return;
  editingBossIdForGold = bossId;
  tempSelectedGold = new Set(boss.goldDrops);
  activeGoldDialogFaction = boss.faction === 'special' ? 'all' : boss.faction;
  $('inp-gold-search').value = '';

  $('dlg-gold-title').textContent = `Chọn Trang Bị Hoàng Kim · ${boss.name} (#${boss.id})`;
  $('dlg-gold-sub').textContent = 'Trang bị Hoàng Kim đã được chọn cho Boss khác sẽ bị khóa để đảm bảo mỗi món chỉ thuộc về 1 Boss duy nhất.';

  renderGoldDialogFactionTabs();
  renderGoldDialogSuites();
  $('dlg-gold').showModal();
}

function renderGoldDialogFactionTabs() {
  const fList = bootstrap.factions.filter(f => f.id !== 'special');
  const tabsEl = $('gold-faction-tabs');
  tabsEl.className = 'faction-tabs';
  tabsEl.innerHTML = `
    <button type="button" class="faction-tab ${activeGoldDialogFaction === 'all' ? 'active' : ''}" data-gold-ftab="all">Tất cả 10 phái (140 món)</button>
    ${fList.map(f => `
      <button type="button" class="faction-tab ${activeGoldDialogFaction === f.id ? 'active' : ''}" data-gold-ftab="${f.id}">
        ${f.name}
      </button>
    `).join('')}
  `;
  for (const btn of tabsEl.querySelectorAll('[data-gold-ftab]')) {
    btn.addEventListener('click', () => {
      activeGoldDialogFaction = btn.getAttribute('data-gold-ftab');
      renderGoldDialogFactionTabs();
      renderGoldDialogSuites();
    });
  }
}

function renderGoldDialogSuites() {
  const query = $('inp-gold-search').value.trim().toLowerCase();
  const lockedByOther = getLockedGoldOwners(editingBossIdForGold);
  const container = $('gold-suites-container');

  const suites = bootstrap.goldSuites.filter(s => {
    if (activeGoldDialogFaction !== 'all' && s.faction !== activeGoldDialogFaction) return false;
    if (query) {
      return (
        s.name.toLowerCase().includes(query) ||
        s.branch.toLowerCase().includes(query) ||
        s.items.some(it => `${it.name} ${it.id} ${it.kindLabel}`.toLowerCase().includes(query))
      );
    }
    return true;
  });

  container.innerHTML = suites.map(s => {
    const availableInSuite = s.items.filter(it => !lockedByOther.has(it.id));
    const allSelected = availableInSuite.length > 0 && availableInSuite.every(it => tempSelectedGold.has(it.id));

    const itemsHtml = s.items.map(it => {
      const owner = lockedByOther.get(it.id);
      const isChecked = tempSelectedGold.has(it.id);
      const isLocked = !!owner;
      return `
        <label class="gold-item-card ${isChecked ? 'checked' : ''} ${isLocked ? 'locked' : ''}">
          <input type="checkbox" data-gold-chk="${it.id}" ${isChecked ? 'checked' : ''} ${isLocked ? 'disabled' : ''} />
          <div class="gold-item-icon">
            <img src="${it.icon}" alt="${it.name}" loading="lazy" />
          </div>
          <div class="gold-item-info">
            <div class="gold-item-title">${it.name}</div>
            <div class="gold-item-meta">${it.kindLabel} · Hệ ${it.series} · Cấp ${it.reqLevel} · <code>${it.id}</code></div>
            <div class="gold-item-lines">${it.lines.slice(0, 3).join(' · ')}</div>
            ${isLocked ? `<div class="locked-owner">Đã gắn cho: ${owner}</div>` : ''}
          </div>
        </label>
      `;
    }).join('');

    return `
      <div class="suite-card">
        <div class="suite-head">
          <div>
            <h4>${s.name} · <span class="muted">${s.branch} (Bộ #${s.suite})</span></h4>
          </div>
          <button type="button" class="btn btn-sm" data-toggle-suite="${s.suite}" ${availableInSuite.length === 0 ? 'disabled' : ''}>
            ${allSelected ? 'Bỏ chọn bộ này' : '+ Chọn cả bộ (5 món)'}
          </button>
        </div>
        <div class="suite-items-grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('') || '<p class="muted">Không có trang bị khớp bộ lọc. Hãy đổi tên tìm kiếm hoặc phái.</p>';
  $('btn-gold-select-faction').disabled = !container.querySelector('[data-gold-chk]:not(:disabled)');

  for (const chk of container.querySelectorAll('[data-gold-chk]')) {
    chk.addEventListener('change', () => {
      const gid = chk.getAttribute('data-gold-chk');
      if (chk.checked) tempSelectedGold.add(gid);
      else tempSelectedGold.delete(gid);
      chk.closest('.gold-item-card').classList.toggle('checked', chk.checked);
      $('dlg-gold-count').textContent = `Đang chọn ${tempSelectedGold.size} trang bị Hoàng Kim cho Boss này`;
    });
  }

  for (const btn of container.querySelectorAll('[data-toggle-suite]')) {
    btn.addEventListener('click', () => {
      const suiteNum = Number(btn.getAttribute('data-toggle-suite'));
      const suite = bootstrap.goldSuites.find(x => x.suite === suiteNum);
      if (!suite) return;
      const unlocked = suite.items.filter(it => !lockedByOther.has(it.id));
      const allIn = unlocked.every(it => tempSelectedGold.has(it.id));
      for (const it of unlocked) {
        if (allIn) tempSelectedGold.delete(it.id);
        else tempSelectedGold.add(it.id);
      }
      renderGoldDialogSuites();
    });
  }

  $('dlg-gold-count').innerHTML = `Đang chọn <strong>${tempSelectedGold.size}</strong> trang bị Hoàng Kim cho Boss này`;
}

// ==================== DIALOG 2: BẢN ĐỒ MINI & CHỌN TỌA ĐỘ ====================

function bindMapDialogEvents() {
  const dlg = $('dlg-map');
  $('btn-close-map').addEventListener('click', () => dlg.close());
  $('btn-cancel-map').addEventListener('click', () => dlg.close());

  $('inp-map-search').addEventListener('input', () => renderMapPickerList());

  for (const [id,axis] of [['inp-pick-x','x'],['inp-pick-y','y']]) {
    $(id).addEventListener('change', () => {
      if (!$(id).reportValidity()) return;
      if (axis === 'x') tempMapX = Number($(id).value);
      else tempMapY = Number($(id).value);
      updateMapSummaryAndDraw();
    });
  }

  const canvas = $('minimap-canvas');
  canvas.addEventListener('pointerdown', async (e) => {
    if (e.button !== 0 || !tempMapId) return;
    const mapMeta = getMapById(tempMapId);
    if (!mapMeta) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = Math.round(((e.clientX - rect.left) / rect.width) * mapMeta.width);
    const rawY = Math.round(((e.clientY - rect.top) / rect.height) * mapMeta.height);

    const requestedMap = tempMapId;
    const request = ++mapRequest;
    mapPending = true;
    $('btn-apply-map').disabled = true;
    // Gọi API snap vào ô đi được gần nhất
    try {
      const res = await fetch(`/api/snap?mapId=${tempMapId}&x=${rawX}&y=${rawY}`);
      if (!res.ok) throw new Error('Không xác định được vị trí.');
      const snapped = await res.json();
      if (request !== mapRequest || tempMapId !== requestedMap) return;
      if (Number.isFinite(snapped.x) && Number.isFinite(snapped.y)) {
        tempMapX = snapped.x;
        tempMapY = snapped.y;
      } else {
        tempMapX = rawX;
        tempMapY = rawY;
      }
    } catch {
      if (request !== mapRequest) return;
      $('dlg-map-summary').textContent = 'Không kiểm tra được vị trí. Hãy chọn lại khi có kết nối.';
      return;
    } finally {
      if (request === mapRequest) { mapPending = false; $('btn-apply-map').disabled = false; }
    }
    $('inp-pick-x').value = String(tempMapX);
    $('inp-pick-y').value = String(tempMapY);
    updateMapSummaryAndDraw();
  });

  canvas.addEventListener('pointermove', (e) => {
    const mapMeta = getMapById(tempMapId);
    if (!mapMeta) return;
    const rect = canvas.getBoundingClientRect();
    const hx = Math.round(((e.clientX - rect.left) / rect.width) * mapMeta.width);
    const hy = Math.round(((e.clientY - rect.top) / rect.height) * mapMeta.height);
    $('minimap-hover-pos').textContent = `Con trỏ: X=${hx}, Y=${hy} (Ô ${Math.round(hx / 8)}/${Math.round(hy / 16)})`;
  });

  $('btn-apply-map').addEventListener('click', async () => {
    if (mapPending || !$('inp-pick-x').reportValidity() || !$('inp-pick-y').reportValidity()) return;
    const boss = state.bosses.find(b => b.id === editingBossIdForMap);
    const selectedMap = tempMapId;
    const request = ++mapRequest;
    mapPending = true;
    $('btn-apply-map').disabled = true;
    try {
      const res = await fetch(`/api/snap?mapId=${selectedMap}&x=${tempMapX}&y=${tempMapY}`);
      const point = await res.json();
      if (!res.ok || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw new Error('Vị trí không hợp lệ.');
      if (request !== mapRequest || selectedMap !== tempMapId || !boss) return;
      boss.mapId = selectedMap;
      boss.x = point.x;
      boss.y = point.y;
      markDirty();
      renderBossSections();
      dlg.close();
    } catch {
      $('dlg-map-summary').textContent = 'Không kiểm tra được vị trí. Hãy kiểm tra kết nối và xác nhận lại.';
    } finally {
      if (request === mapRequest) { mapPending = false; $('btn-apply-map').disabled = false; }
    }
  });
}

function openMapDialog(bossId) {
  const boss = state.bosses.find(b => b.id === bossId);
  if (!boss) return;
  mapRequest++;
  mapPending = false;
  $('btn-apply-map').disabled = false;
  editingBossIdForMap = bossId;
  tempMapId = boss.mapId;
  tempMapX = boss.x;
  tempMapY = boss.y;

  $('dlg-map-title').textContent = `Chọn Bản Đồ & Tọa Độ · ${boss.name} (#${boss.id})`;
  $('inp-map-search').value = '';
  $('inp-pick-x').value = String(tempMapX);
  $('inp-pick-y').value = String(tempMapY);

  renderMapPickerList();
  $('dlg-map').showModal();
  loadAndDrawMinimap(tempMapId);
}

function renderMapPickerList() {
  const query = $('inp-map-search').value.trim().toLowerCase();
  const listEl = $('map-picker-list');
  const maps = bootstrap.maps.filter(m => !query || `${m.name} ${m.id} ${m.typeLabel}`.toLowerCase().includes(query));

  listEl.innerHTML = maps.map(m => {
    const bossCount = state.bosses.filter(b => b.enabled && b.mapId === m.id).length;
    return `
      <button type="button" class="map-row-btn ${m.id === tempMapId ? 'active' : ''}" data-pick-map="${m.id}">
        <span>${m.name} <small class="muted">#${m.id}</small></span>
        <span>
          ${m.levelBand ? `<span class="badge badge-blue">${m.levelBand.join('–')}</span>` : `<span class="muted">${m.typeLabel}</span>`}
          ${bossCount > 0 ? `<span class="badge badge-gold" title="Số Boss trên bản đồ này">${bossCount} Boss</span>` : ''}
        </span>
      </button>
    `;
  }).join('') || '<p class="muted">Không có bản đồ khớp. Hãy đổi từ khóa.</p>';

  for (const btn of listEl.querySelectorAll('[data-pick-map]')) {
    btn.addEventListener('click', async () => {
      const newMapId = Number(btn.getAttribute('data-pick-map'));
      if (newMapId === tempMapId) return;
      tempMapId = newMapId;
      const request = ++mapRequest;
      mapPending = true;
      $('btn-apply-map').disabled = true;
      const m = getMapById(newMapId);
      if (m) {
        // Mặc định lấy điểm vào bản đồ và snap vào ô đi được
        try {
          const res = await fetch(`/api/snap?mapId=${newMapId}&x=${m.entry.x}&y=${m.entry.y}`);
          if (!res.ok) throw new Error('Không tải được vị trí.');
          const snapped = await res.json();
          if (request !== mapRequest) return;
          tempMapX = snapped.x ?? m.entry.x;
          tempMapY = snapped.y ?? m.entry.y;
        } catch {
          if (request !== mapRequest) return;
          tempMapX = m.entry.x;
          tempMapY = m.entry.y;
        }
        $('inp-pick-x').value = String(tempMapX);
        $('inp-pick-y').value = String(tempMapY);
      }
      if (request !== mapRequest) return;
      mapPending = false;
      $('btn-apply-map').disabled = false;
      renderMapPickerList();
      loadAndDrawMinimap(tempMapId);
    });
  }
}

function loadAndDrawMinimap(mapId) {
  const m = getMapById(mapId);
  if (!m) return;
  updateMapSummaryAndDraw();
  if (minimapImages.has(mapId)) {
    drawMinimapCanvas(m, minimapImages.get(mapId));
    return;
  }
  const img = new Image();
  img.onload = () => {
    minimapImages.set(mapId, img);
    if (tempMapId === mapId) drawMinimapCanvas(m, img);
  };
  img.onerror = () => {
    if (tempMapId !== mapId) return;
    const canvas = $('minimap-canvas');
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    $('dlg-map-summary').textContent = 'Không tải được ảnh bản đồ. Có thể nhập tọa độ hoặc chọn lại bản đồ để thử lại.';
  };
  img.src = m.minimapUrl;
}

function updateMapSummaryAndDraw() {
  const m = getMapById(tempMapId);
  if (!m) { $('btn-apply-map').disabled = true; $('dlg-map-summary').textContent = 'Bản đồ chưa có ảnh xem trước. Hãy chọn bản đồ khác.'; return; }
  $('inp-pick-x').max = String(m.width);
  $('inp-pick-y').max = String(m.height);
  const tileX = Math.round(tempMapX / 8);
  const tileY = Math.round(tempMapY / 16);
  $('minimap-info').textContent = `${m.name} (ID #${m.id} · ${m.typeLabel}${m.levelBand ? ` · Cấp ${m.levelBand.join('–')}` : ''})`;
  $('minimap-tile-coord').textContent = `Ô VLTK: ${tileX}/${tileY}`;
  $('dlg-map-summary').innerHTML = `Bản đồ: <strong>${m.name} (#${m.id})</strong> · Tọa độ chính xác: <code>X=${tempMapX}, Y=${tempMapY}</code> (Ô ${tileX}/${tileY})`;

  const img = minimapImages.get(tempMapId);
  if (img) drawMinimapCanvas(m, img);
}

function drawMinimapCanvas(mapMeta, img) {
  const canvas = $('minimap-canvas');
  const wrap = $('minimap-canvas-wrap');
  const maxW = Math.max(100, wrap.clientWidth - 24);
  const maxH = Math.max(160, wrap.clientHeight - 24);
  const scale = Math.min(maxW / mapMeta.width, maxH / mapMeta.height);
  const dpr = Math.min(2, window.devicePixelRatio || 1);

  const cssW = Math.round(mapMeta.width * scale);
  const cssH = Math.round(mapMeta.height * scale);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);

  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, cssW, cssH);
  ctx.drawImage(img, 0, 0, cssW, cssH);

  // Vẽ điểm entry của bản đồ (xanh lá)
  if (mapMeta.entry) {
    const ex = mapMeta.entry.x * scale;
    const ey = mapMeta.entry.y * scale;
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(ex, ey, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vẽ các Boss Hoàng Kim khác trên cùng bản đồ (xanh dương)
  for (const other of state.bosses) {
    if (other.id === editingBossIdForMap || other.mapId !== mapMeta.id || !other.enabled) continue;
    const ox = other.x * scale;
    const oy = other.y * scale;
    ctx.fillStyle = '#5cb8ff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ox, oy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 11px sans-serif';
    ctx.fillStyle = '#5cb8ff';
    ctx.fillText(other.name, ox + 8, oy + 4);
  }

  // Vẽ vị trí Boss đang chọn (vàng rực + tâm ngắm)
  const bx = tempMapX * scale;
  const by = tempMapY * scale;
  const currentBoss = state.bosses.find(b => b.id === editingBossIdForMap);

  ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, by, 13, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(bx - 18, by);
  ctx.lineTo(bx + 18, by);
  ctx.moveTo(bx, by - 18);
  ctx.lineTo(bx, by + 18);
  ctx.stroke();

  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (currentBoss) {
    const label = `${currentBoss.name} (${Math.round(tempMapX / 8)}/${Math.round(tempMapY / 16)})`;
    ctx.font = 'bold 12px sans-serif';
    const tw = ctx.measureText(label).width;
    const lx = Math.min(cssW - tw - 12, Math.max(6, bx - tw / 2));
    const ly = Math.max(20, by - 16);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(lx - 4, ly - 13, tw + 8, 18);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth = 1;
    ctx.strokeRect(lx - 4, ly - 13, tw + 8, 18);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(label, lx, ly);
  }

  ctx.restore();
}

// ==================== LƯU CÀI ĐẶT ====================

function validateInputs() {
  renderDropRatesSummary();
  for (const field of document.querySelectorAll('input[type=number]:not(:disabled)')) {
    if (field.closest('.dlg') || field.id === 'inp-add-minute') continue;
    if (field.value === '') field.setCustomValidity('Vui lòng nhập giá trị.');
    else if (field.id !== 'inp-rate-gold') field.setCustomValidity('');
    if (!field.reportValidity()) return false;
  }
  if (state.settings.spawnMode === 'fixedTimes' && !state.settings.fixedTimes.length) {
    $('save-status').textContent = 'Hãy thêm ít nhất một giờ xuất hiện.';
    $('inp-add-time').focus();
    return false;
  }
  return true;
}
async function saveConfig() {
  if (saving || applying || !validateInputs()) return;
  saving = true;
  const payload = JSON.stringify(state);
  markDirty();
  $('save-status').textContent = 'Đang lưu thiết lập…';
  // Keep the editable draft stable while the request is in flight.
  document.querySelector('main').inert = true;
  try {
    const res = await fetch('/api/config', { method:'PUT', headers:{'Content-Type':'application/json'}, body:payload });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Không thể lưu thiết lập.');
    originalSnapshot = payload;
    saving = false;
    markDirty();
    $('save-status').textContent = 'Đã lưu thiết lập. Chọn Áp dụng vào game để cập nhật.';
  } catch (err) {
    saving = false;
    markDirty();
    $('save-status').textContent = `Lưu thất bại: ${err.message} Dữ liệu đã nhập được giữ lại.`;
    $('save-status').className = 'save-status error';
  } finally { document.querySelector('main').inert = false; }
}
async function applyConfig() {
  if (applying || saving || JSON.stringify(state) !== originalSnapshot) return;
  applying = true;
  markDirty();
  document.querySelector('main').inert = true;
  $('save-status').textContent = 'Đang áp dụng bản đã lưu vào game…';
  try {
    const res = await fetch('/api/apply', { method:'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Game chưa nhận cấu hình.');
    applying = false;
    markDirty();
    $('save-status').textContent = 'Game đã nhận cấu hình đã lưu.';
  } catch (error) {
    applying = false;
    markDirty();
    $('save-status').textContent = `${error.message} Bản đã lưu vẫn được giữ; có thể thử áp dụng lại.`;
    $('save-status').className = 'save-status error';
  } finally { document.querySelector('main').inert = false; }
}

function renderAll() {
  renderHeaderStats();
  renderGlobalSettings();
  renderFactionTabs();
  renderBossSections();
}

void init().catch(error => {
  $('save-status').textContent = `${error.message} Tải lại trang để thử lại.`;
  $('save-status').className = 'save-status error';
});
