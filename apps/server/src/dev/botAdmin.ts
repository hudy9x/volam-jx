import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { Application, NextFunction, Request, Response } from 'express';
import {
  BOT_CREATE_MAX, BOT_FILE_RE, FACTIONS, FACTION_IDS, LEVEL, MAPS, PROGRESS_VERSION, SERIES, TOWN_MAP_ID, bestTrainingMap,
  factionAllowsGender, newProgress, normalizeBotScenario, normalizeBotTemplate, snapToMap,
  type BotInfo, type BotLogin, type BotTemplate, type Element, type Gender,
} from '@vltk/shared';
import { issueToken, newPassword } from '../account/auth.js';
import { db, type CharacterRecord } from '../account/db.js';
import { BOTS_DIR, MAPS_DIR, devTools } from '../env.js';
import { isOnline, trainingList } from '../net/MapRoom.js';

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

  app.get('/api/dev/bots', local, (_req, res) => {
    res.json(botUsers().map(info).filter((b): b is BotInfo => !!b));
  });

  app.post('/api/dev/bots', local, (req, res) => {
    const t = normalizeBotTemplate(req.body?.template);
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

  // Runner: tokens of the bots to connect as (no passwords needed); offline ones first, at most `count` (0 = all).
  app.post('/api/dev/bots/login', local, (req, res) => {
    const prefix = typeof req.body?.prefix === 'string' ? req.body.prefix : '';
    const count = Math.max(0, Math.floor(Number(req.body?.count) || 0));
    const out: BotLogin[] = [];
    for (const user of botUsers().filter(u => u.username.startsWith(`${prefix}_`))) {
      const char = db.getCharacter(user.characters[0] ?? '');
      if (char) out.push({ username: user.username, token: issueToken(user.username), charId: char.id, mapId: char.mapId });
    }
    out.sort((a, b) => Number(isOnline(a.charId)) - Number(isOnline(b.charId)) || indexOf(a.username) - indexOf(b.username));
    res.json(count ? out.slice(0, count) : out);
  });

  // ---- templates (bots/templates/<name>.json) and scenarios (bots/<name>.json) ----
  const dirOf = (kind: string) => (kind === 'templates' ? path.join(BOTS_DIR, 'templates') : kind === 'scenarios' ? BOTS_DIR : null);
  const list = (dir: string) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort() : []);
  app.get('/api/dev/bots/files', local, (_req, res) => {
    res.json({ templates: list(dirOf('templates')!), scenarios: list(dirOf('scenarios')!), dir: BOTS_DIR });
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
    username: user.username, charId: c.id, name: c.name, faction: c.faction || c.bot?.faction || '',
    level: c.bot?.pending ? c.bot.level : c.level, mapId: c.mapId, online: isOnline(c.id), template: c.bot?.template ?? '',
    pending: !!c.bot?.pending,
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
  const series: Element = faction ? FACTIONS[faction].element as Element : SERIES[n % SERIES.length];
  const mapId = placeMap(t, level, n);
  const entry = MAPS[mapId].raw.entry;
  const a = Math.random() * Math.PI * 2, r = Math.random() * t.map.radius;
  const [x, y] = snapToMap(mapId, entry.x + Math.cos(a) * r, entry.y + (Math.sin(a) * r) / 2);
  return {
    id: randomUUID(), owner, name, faction: '', series, gender, level: 1, mapId, x, y,
    progress: newProgress(), progressVersion: PROGRESS_VERSION,
    bot: { template, setup: t, level, faction: level >= LEVEL.factionJoin || t.faction ? faction : '', pending: true },
  };
}

/** Map the bot appears on: town, the bãi luyện công of its level, or the n-th of the list; maps not generated here → town. */
function placeMap(t: BotTemplate, level: number, n: number): number {
  const has = (id: number) => fs.existsSync(path.join(MAPS_DIR, String(id), 'nav.json'));
  if (t.map.mode === 'training') return bestTrainingMap(trainingList(), level)?.mapId ?? TOWN_MAP_ID;
  if (t.map.mode === 'list') {
    const id = t.map.maps[n % t.map.maps.length];
    return id && has(id) ? id : TOWN_MAP_ID;
  }
  return TOWN_MAP_ID;
}
