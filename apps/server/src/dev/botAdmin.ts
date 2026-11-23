import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Application, NextFunction, Request, Response } from 'express';
import {
  BOT_LEVEL_BANDS, botMapIds, BOT_IDENTITIES, BOT_CREATE_MAX, BOT_FILE_RE, FACTIONS, FACTION_IDS, ITEMS, MAX_MONEY, MAPS, PROGRESS_VERSION, SERIES, TOWN_MAP_ID, addToBag, bestTrainingMap,
  factionAllowsGender, newProgress, normalizeBotScenario, normalizeBotTemplate, snapToMap,
  type BotInfo, type BotLogin, type BotTemplate, type Element, type Gender, type Item,
} from '@vltk/shared';
import { issueToken, newPassword } from '../account/auth.js';
import { db, type CharacterRecord } from '../account/db.js';
import { BOTS_DIR, MAPS_DIR, devTools } from '../env.js';
import { LIVE_WORLDS, isOnline, trainingList } from '../net/MapRoom.js';
import { addMoney } from '../world/inventory.js';

/**
 * Bot dev API (docs/bots.md; page /?bots = apps/client/src/dev/bot-panel): make bot accounts from a template, list / reset /
 * delete them, hand the runner (`npm run bots`, src/dev/bots.ts) login tokens, read / write templates and scenarios in the
 * repo's bots/. Only with DEV_TOOLS, only from this machine (BOT_API_REMOTE=1 lets the LAN in), and only on accounts it made
 * itself (UserRecord.bot). The template is applied when the bot first enters the game (world/botSetup.ts).
 */
export function registerBotRoutes(app: Application): void {
  if (!devTools()) return;
  const local = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.socket.remoteAddress ?? '';
    if (process.env.BOT_API_REMOTE === '1' || ip === '::1' || ip.startsWith('127.') || ip === '::ffff:127.0.0.1') { next(); return; }
    res.status(403).json({ error: 'API bot chỉ nhận yêu cầu từ máy chạy server (đặt BOT_API_REMOTE=1 để mở cho mạng LAN).' });
  };

  app.get('/api/dev/bots/maps', local, (_req, res) => { res.json(Object.keys(MAPS).map(Number).filter(id => fs.existsSync(path.join(MAPS_DIR, String(id), 'nav.json')))); });

  app.get('/api/dev/bots', local, (_req, res) => {
    res.json(botUsers().map(info).filter((b): b is BotInfo => !!b));
  });

  // One action for the fixed roster: initialise unused identities or reconfigure existing offline characters.
  app.post('/api/dev/bots/configure', local, (req, res) => {
    const ids = Array.isArray(req.body?.usernames) ? [...new Set(req.body.usernames)] as string[] : [];
    if (!ids.length || ids.some(id => !BOT_IDENTITIES.has(id))) { res.status(400).json({ error: 'Chọn nhân vật trong danh sách 200 tên.' }); return; }
    const t = normalizeBotTemplate(req.body?.template);
    if (!BOT_LEVEL_BANDS.some(([lo, hi]) => t.level[0] === lo && t.level[1] === hi)) { res.status(400).json({ error: 'Chọn dải cấp 40–69, 70–90, 110–150 hoặc 150–200.' }); return; }
    if (!['green', 'gold'].includes(t.gear) || !['training', 'town', 'both'].includes(t.map.mode)) { res.status(400).json({ error: 'Kiểm tra trang bị và loại bản đồ.' }); return; }
    const allowed = botMapIds(t.map.mode as 'training' | 'town' | 'both').filter(id => fs.existsSync(path.join(MAPS_DIR, String(id), 'nav.json')));
    const requestedMaps: unknown[] = Array.isArray(req.body?.template?.map?.maps) ? req.body.template.map.maps : [];
    t.map.maps = [...new Set(requestedMaps.filter((id): id is number => typeof id === 'number' && allowed.includes(id)))];
    if (!t.map.maps.length) { res.status(400).json({ error: 'Chọn ít nhất một bản đồ đã được sinh thuộc loại xuất hiện.' }); return; }
    t.ring = false; t.horse = 'random';
    for (const id of ids) {
      const identity = BOT_IDENTITIES.get(id)!; const user = db.getUser(id);
      if (user && (!user.bot || db.getCharacter(user.characters[0] ?? '')?.name !== identity.name) || !user && db.nameTaken(identity.name)) {
        res.status(409).json({ error: `Tên hoặc tài khoản ${identity.name} đã được sử dụng.` }); return;
      }
    }
    const updated: string[] = [], skipped: string[] = [];
    for (const id of ids) {
      const user = db.getUser(id); const old = user && db.getCharacter(user.characters[0] ?? '');
      if (old && isOnline(old.id)) { skipped.push(id); continue; }
      if (!user) db.addUser({ username: id, ...newPassword(t.password), characters: [], bot: true });
      const fresh = botCharacter(id, BOT_IDENTITIES.get(id)!.name, t, templateName(req.body?.templateName), Number(id.split('_')[1]));
      if (old) db.replaceCharacter({ ...fresh, id: old.id }); else db.addCharacter(fresh);
      updated.push(id);
    }
    res.json({ updated, skipped });
  });

  app.post('/api/dev/bots', local, (req, res) => {
    const t = normalizeBotTemplate(req.body?.template);
    if (Array.isArray(req.body?.usernames)) {
      const ids = [...new Set(req.body.usernames)] as string[];
      if (!ids.length || ids.some(id => !BOT_IDENTITIES.has(id))) { res.status(400).json({ error: 'Chọn nhân vật trong danh sách cố định.' }); return; }
      // Preflight every identity before writing any account; no suffixes or silent substitutions.
      for (const id of ids) {
        const identity = BOT_IDENTITIES.get(id)!;
        const user = db.getUser(id);
        if (user && (!user.bot || db.getCharacter(user.characters[0] ?? '')?.name !== identity.name)) {
          res.status(409).json({ error: `Tài khoản ${id} đã được sử dụng.` }); return;
        }
        if (!user && db.nameTaken(identity.name)) { res.status(409).json({ error: `Tên ${identity.name} đã được sử dụng.` }); return; }
      }
      const created: string[] = [];
      for (const id of ids) {
        if (db.getUser(id)) continue;
        const identity = BOT_IDENTITIES.get(id)!;
        db.addUser({ username: id, ...newPassword(t.password), characters: [], bot: true });
        db.addCharacter(botCharacter(id, identity.name, t, templateName(req.body?.templateName), Number(id.split('_')[1])));
        created.push(id);
      }
      res.json({ created }); return;
    }
    if (t.prefix === 'botfixed') { res.status(400).json({ error: 'Tiền tố botfixed dành riêng cho danh sách nhân vật cố định. Hãy chọn tên để tạo.' }); return; }
    const count = Math.max(1, Math.min(BOT_CREATE_MAX, Math.floor(Number(req.body?.count) || 1)));
    const name = templateName(req.body?.templateName);
    let n = nextIndex(t.prefix);
    const created: string[] = [];
    for (let i = 0; i < count; i++, n++) {
      const username = `${t.prefix}_${n}`;
      if (db.getUser(username)) { i--; continue; }
      db.addUser({ username, ...newPassword(t.password), characters: [], bot: true });
      db.addCharacter(botCharacter(username, charName(t.prefix, n), t, name, n));
      created.push(username);
    }
    console.log(`[bots] created ${created.length} bots (${t.prefix}_…) from template "${name || '-'}"`);
    res.json({ created });
  });

  // Đặt lại theo mẫu: back to a fresh level-1 character (same name) with the template pending; online bots are skipped.
  app.post('/api/dev/bots/reset', local, (req, res) => {
    const t = normalizeBotTemplate(req.body?.template);
    const name = templateName(req.body?.templateName);
    const done: string[] = [], skipped: string[] = [];
    selected(req.body?.usernames).forEach((user, i) => {
      const char = db.getCharacter(user.characters[0] ?? '');
      if (!char || isOnline(char.id)) { skipped.push(user.username); return; }
      const fresh = botCharacter(user.username, char.name, t, name, i);
      db.replaceCharacter({ ...fresh, id: char.id });
      done.push(user.username);
    });
    res.json({ reset: done, skipped });
  });

  app.post('/api/dev/bots/delete', local, (req, res) => {
    const done: string[] = [], skipped: string[] = [];
    for (const user of selected(req.body?.usernames)) {
      if (user.characters.some(isOnline)) { skipped.push(user.username); continue; }
      db.deleteUser(user.username);
      done.push(user.username);
    }
    if (done.length) console.log(`[bots] deleted ${done.length} bots`);
    res.json({ deleted: done, skipped });
  });

  // Tặng bạc cho toàn bộ bot (cả đang online trong World lẫn offline/pending trong db.json).
  app.post('/api/dev/bots/grant-money', local, (req, res) => {
    const raw = Number(req.body?.amount ?? 1_000_000);
    const amount = Number.isFinite(raw) ? Math.floor(raw) : 0;
    if (amount <= 0) { res.status(400).json({ error: 'Số lượng bạc phải > 0.' }); return; }
    const onlineSims = new Map<string, { w: NonNullable<ReturnType<typeof LIVE_WORLDS.get>>; sim: any }>();
    for (const w of LIVE_WORLDS.values()) {
      for (const sim of w.sims.values()) {
        if (sim.kind === 'player' && sim.charId) onlineSims.set(sim.charId, { w, sim });
      }
    }
    let updated = 0;
    let onlineCount = 0;
    for (const user of botUsers()) {
      for (const charId of user.characters) {
        const char = db.getCharacter(charId);
        if (!char) continue;
        const live = onlineSims.get(charId);
        if (live) {
          addMoney(live.sim, amount);
          live.w.hooks.inventory(live.sim);
          db.updateCharacter(charId, { money: live.sim.money });
          onlineCount++;
        } else if (char.bot?.pending) {
          char.bot.setup.money = Math.min(MAX_MONEY, (char.bot.setup.money ?? 0) + amount);
          db.updateCharacter(charId, { bot: char.bot });
        } else {
          db.updateCharacter(charId, { money: Math.min(MAX_MONEY, (char.money ?? 0) + amount) });
        }
        updated++;
      }
    }
    db.flush();
    console.log(`[bots] granted +${amount.toLocaleString('vi-VN')} money to ${updated} bots (${onlineCount} online)`);
    res.json({ ok: true, amount, updated, online: onlineCount });
  });

  // Tặng vật phẩm (vd: 50x Chiến Cổ + 50x Lệnh Bài) cho toàn bộ bot (online + offline trong db.json).
  app.post('/api/dev/bots/grant-items', local, (req, res) => {
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    const grants: { id: string; qty: number }[] = [];
    for (const entry of rawItems) {
      const id = typeof entry?.id === 'string' ? entry.id : '';
      const qty = Math.floor(Number(entry?.qty ?? 0));
      if (ITEMS[id] && qty > 0 && qty <= 500) grants.push({ id, qty });
    }
    if (!grants.length) { res.status(400).json({ error: 'Danh sách vật phẩm không hợp lệ.' }); return; }
    const onlineSims = new Map<string, { w: NonNullable<ReturnType<typeof LIVE_WORLDS.get>>; sim: any }>();
    for (const w of LIVE_WORLDS.values()) {
      for (const sim of w.sims.values()) {
        if (sim.kind === 'player' && sim.charId) onlineSims.set(sim.charId, { w, sim });
      }
    }
    let updated = 0;
    let onlineCount = 0;
    for (const user of botUsers()) {
      for (const charId of user.characters) {
        const char = db.getCharacter(charId);
        if (!char) continue;
        const live = onlineSims.get(charId);
        if (live && live.sim.bag) {
          for (const g of grants) {
            const item: Item = { uid: `grant-${g.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, def: g.id, q: 0, qty: g.qty };
            if (!addToBag(live.sim.bag, item)) (live.sim.bagSpill ??= []).push(item);
          }
          live.w.hooks.inventory(live.sim);
          db.updateCharacter(charId, { bag: live.sim.bag });
          onlineCount++;
        } else {
          const bag: (Item | null)[] = Array.isArray(char.bag) ? [...char.bag] : Array(60).fill(null);
          for (const g of grants) {
            const item: Item = { uid: `grant-${g.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, def: g.id, q: 0, qty: g.qty };
            addToBag(bag, item);
          }
          db.updateCharacter(charId, { bag });
        }
        updated++;
      }
    }
    db.flush();
    console.log(`[bots] granted items (${grants.map(g => `${g.qty}x ${g.id}`).join(', ')}) to ${updated} bots (${onlineCount} online)`);
    res.json({ ok: true, grants, updated, online: onlineCount });
  });

  // Runner: tokens of the bots to connect as (no passwords needed); offline ones first, at most `count` (0 = all).
  app.post('/api/dev/bots/login', local, (req, res) => {
    const prefix = typeof req.body?.prefix === 'string' ? req.body.prefix : '';
    const count = Math.max(0, Math.floor(Number(req.body?.count) || 0));
    const explicit = Array.isArray(req.body?.usernames) ? [...new Set(req.body.usernames)] as string[] : undefined;
    if (explicit && (!explicit.length || explicit.some(id => typeof id !== 'string' || !db.getUser(id)?.bot || !db.getUser(id)?.characters.length))) {
      res.status(400).json({ error: 'Danh sách đã chọn rỗng hoặc có bot chưa được tạo. Tạo các nhân vật đã chọn trước khi chạy.' }); return;
    }
    const out: BotLogin[] = [];
    for (const user of explicit ? explicit.map(id => db.getUser(id)!) : botUsers().filter(u => u.username.startsWith(`${prefix}_`))) {
      const char = db.getCharacter(user.characters[0] ?? '');
      if (char) out.push({ username: user.username, token: issueToken(user.username), charId: char.id, mapId: char.mapId, autoBuff: normalizeBotTemplate(char.bot?.setup).autoBuff });
    }
    if (!explicit) out.sort((a, b) => Number(isOnline(a.charId)) - Number(isOnline(b.charId)) || indexOf(a.username) - indexOf(b.username));
    res.json(!explicit && count ? out.slice(0, count) : out);
  });

  // ---- templates (bots/templates/<name>.json) and scenarios (bots/<name>.json) ----
  const dirOf = (kind: string) => (kind === 'templates' ? path.join(BOTS_DIR, 'templates') : kind === 'scenarios' ? BOTS_DIR : null);
  const list = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort() : []);
  app.get('/api/dev/bots/files', local, (_req, res) => {
    const templates = list(dirOf('templates')!);
    const titles = Object.fromEntries(templates.map(name => { try { const raw = JSON.parse(fs.readFileSync(path.join(dirOf('templates')!, `${name}.json`), 'utf8')); return [name, raw.title || name]; } catch { return [name, name]; } }));
    const scenarios = list(dirOf('scenarios')!);
    const scenarioTitles = Object.fromEntries(scenarios.map(name => { try { return [name, JSON.parse(fs.readFileSync(path.join(BOTS_DIR, `${name}.json`), 'utf8')).title || name]; } catch { return [name, name]; } }));
    res.json({ templates, titles, scenarios, scenarioTitles, dir: BOTS_DIR });
  });
  app.get('/api/dev/bots/files/:kind/:name', local, (req, res) => {
    const dir = dirOf(String(req.params.kind)), name = String(req.params.name);
    const file = dir && BOT_FILE_RE.test(name) ? path.join(dir, `${name}.json`) : '';
    if (!file || !fs.existsSync(file)) { res.status(404).json({ error: 'Không có file này' }); return; }
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    res.json(req.params.kind === 'templates' ? normalizeBotTemplate(raw) : normalizeBotScenario(raw));
  });
  app.put('/api/dev/bots/files/:kind/:name', local, (req, res) => {
    const kind = String(req.params.kind), dir = dirOf(kind), name = String(req.params.name);
    if (!dir || !BOT_FILE_RE.test(name)) { res.status(400).json({ error: 'Tên file: chữ thường, số, - _ (tối đa 40 ký tự)' }); return; }
    const value = kind === 'templates' ? normalizeBotTemplate(req.body) : normalizeBotScenario(req.body);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}.json`), `${JSON.stringify(value, null, 2)}\n`);
    console.log(`[bots] saved ${kind}/${name}.json`);
    res.json(value);
  });
}

const botUsers = () => db.users().filter(u => u.bot).sort((a, b) => a.username.localeCompare(b.username) || indexOf(a.username) - indexOf(b.username));
const indexOf = (username: string) => Number(username.slice(username.lastIndexOf('_') + 1)) || 0;
const templateName = (v: unknown) => (typeof v === 'string' && BOT_FILE_RE.test(v) ? v : '');
const selected = (names: unknown) => (Array.isArray(names) ? names : [])
  .map(n => (typeof n === 'string' ? db.getUser(n) : undefined))
  .filter((u): u is NonNullable<typeof u> => !!u?.bot);

function info(user: { username: string; characters: string[] }): BotInfo | null {
  const c = db.getCharacter(user.characters[0] ?? '');
  if (!c) return null;
  return {
    username: user.username, charId: c.id, gender: c.gender, name: c.name, faction: c.faction || c.bot?.faction || '',
    level: c.bot?.pending ? c.bot.level : c.level, mapId: c.mapId, online: isOnline(c.id), template: c.bot?.template ?? '',
    pending: !!c.bot?.pending, gear: c.bot?.setup.gear, horse: c.bot?.pending ? c.bot.setup.horse : c.horse || c.bot?.setup.horse, templateTitle: c.bot?.setup.title || c.bot?.template,
  };
}

function nextIndex(prefix: string): number {
  let max = 0;
  for (const u of db.users()) if (u.username.startsWith(`${prefix}_`)) max = Math.max(max, indexOf(u.username));
  return max + 1;
}

/** Character name: Bot12 (capitalised prefix + number), another letter when taken (2–16 characters). */
function charName(prefix: string, n: number): string {
  const base = `${prefix[0].toUpperCase()}${prefix.slice(1)}${n}`.slice(0, 15);
  if (!db.nameTaken(base)) return base;
  for (const c of 'abcdefghijklmnopqrstuvwxyz') if (!db.nameTaken(`${base}${c}`)) return `${base}${c}`;
  return `${base.slice(0, 8)}${randomUUID().slice(0, 6)}`;
}

/**
 * A fresh level-1 character for a bot (as POST /api/characters makes one) with the template pending: level rolled in the
 * template's range, faction 'all' = the n-th faction, sex by the template (or the faction's), where it appears.
 */
function botCharacter(owner: string, name: string, t: BotTemplate, template: string, n: number): CharacterRecord {
  const level = t.level[0] + Math.floor(Math.random() * (t.level[1] - t.level[0] + 1));
  const faction = t.faction === 'all' ? FACTION_IDS[n % FACTION_IDS.length] : t.faction;
  let gender: Gender = t.gender === 'mix' ? (n % 2 ? 'female' : 'male') : t.gender;
  if (faction && !factionAllowsGender(faction, gender)) gender = gender === 'male' ? 'female' : 'male';
  const identity = BOT_IDENTITIES.get(owner);
  if (identity) { gender = identity.gender; }
  const fixedFaction = identity?.faction ?? faction;
  const series: Element = fixedFaction ? FACTIONS[fixedFaction].element as Element : SERIES[n % SERIES.length];
  const mapId = placeMap(t, level, n);
  const entry = MAPS[mapId].raw.entry;
  const a = Math.random() * Math.PI * 2, r = Math.random() * t.map.radius;
  const [x, y] = snapToMap(mapId, entry.x + Math.cos(a) * r, entry.y + (Math.sin(a) * r) / 2);
  return {
    id: randomUUID(), owner, name, faction: '', series, gender, level: 1, mapId, x, y,
    progress: newProgress(), progressVersion: PROGRESS_VERSION,
    bot: { template, setup: t, level, faction: fixedFaction, pending: true },
  };
}

/** Map the bot appears on: town, the bãi luyện công of its level, or the n-th of the list; maps not generated here → town. */
function placeMap(t: BotTemplate, level: number, n: number): number {
  const has = (id: number) => fs.existsSync(path.join(MAPS_DIR, String(id), 'nav.json'));
  if (t.map.mode === 'training' || t.map.mode === 'town' || t.map.mode === 'both') {
    const selected = t.map.maps.filter(id => has(id) && (t.map.mode === 'both' ? MAPS[id] : t.map.mode === 'town' ? MAPS[id]?.safe : MAPS[id] && !MAPS[id].safe));
    if (selected.length) return selected[n % selected.length];
    return t.map.mode === 'training' ? bestTrainingMap(trainingList(), level)?.mapId ?? TOWN_MAP_ID : TOWN_MAP_ID;
  }
  if (t.map.mode === 'list') {
    const id = t.map.maps[n % t.map.maps.length];
    return id && has(id) ? id : TOWN_MAP_ID;
  }
  return TOWN_MAP_ID;
}
