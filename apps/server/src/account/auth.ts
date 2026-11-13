import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Application, Request, Response, NextFunction } from 'express';
import express from 'express';
import { MAX_CHARACTERS, lookOfOutfit, starterEquipment, type EquipSlot, type Outfit,
  FACTIONS, MAPS, PROGRESS_VERSION, SERIES, TOWN_MAP_ID, newProgress, snapToMap,
  type AuthResponse, type CharacterSummary, type Element,
} from '@vltk/shared';
import { db, type CharacterRecord } from './db.js';

// ---------- tokens: "<base64url(username)>.<hmac>" signed with a persisted secret ----------
const SECRET_PATH = 'data/secret';
function loadSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (existsSync(SECRET_PATH)) return readFileSync(SECRET_PATH, 'utf8').trim();
  mkdirSync('data', { recursive: true });
  const secret = randomBytes(32).toString('hex');
  writeFileSync(SECRET_PATH, secret);
  return secret;
}
const SECRET = loadSecret();

const sign = (payload: string) => createHmac('sha256', SECRET).update(payload).digest('base64url');

export function issueToken(username: string): string {
  const payload = Buffer.from(username).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: unknown): string | null {
  if (typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const username = Buffer.from(payload, 'base64url').toString();
  return db.getUser(username) ? username : null;
}

const hashPassword = (password: string, salt: string) => scryptSync(password, salt, 32).toString('hex');

/** Salt + hash of a new password (register; the bot dev API's accounts). */
export function newPassword(password: string): { salt: string; hash: string } {
  const salt = randomBytes(16).toString('hex');
  return { salt, hash: hashPassword(password, salt) };
}

// ---------- REST routes ----------
export type AuthedRequest = Request & { username?: string };

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const username = verifyToken(header.replace(/^Bearer\s+/i, ''));
  if (!username) { res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ' }); return; }
  req.username = username;
  next();
}

/** Hệ of a stored character (records before 2026-11-12 only had a faction). */
export const seriesOfRecord = (c: CharacterRecord): Element => c.series ?? FACTIONS[c.faction]?.element ?? 'kim';

/** Worn look of a stored character: its equipment's table rows, or the starter outfit. */
function lookOfRecord(c: CharacterRecord): CharacterSummary['look'] {
  const equip = c.equip && typeof c.equip === 'object' ? c.equip as Record<string, unknown> : null;
  if (!equip) return lookOfOutfit(starterEquipment(c.faction, c.gender));
  const outfit: Outfit = {};
  for (const [slot, it] of Object.entries(equip)) {
    const def = typeof it === 'string' ? it : (it as { def?: unknown } | null)?.def;
    if (typeof def === 'string') outfit[slot as EquipSlot] = def;
  }
  return lookOfOutfit(outfit);
}

const summary = (c: CharacterRecord): CharacterSummary => ({
  id: c.id, name: c.name, faction: c.faction, series: seriesOfRecord(c), gender: c.gender, level: c.level, mapId: c.mapId,
  look: lookOfRecord(c),
});

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export function registerAuthRoutes(app: Application): void {
  // The Vite dev server runs on another port: allow cross-origin calls to the REST API.
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
    if (req.method === 'OPTIONS') { res.sendStatus(204); return; }
    next();
  });
  app.use('/api', express.json());

  app.post('/api/register', (req, res) => {
    const { username, password } = req.body ?? {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      res.status(400).json({ error: 'Tên tài khoản 3–20 ký tự, chỉ gồm chữ, số, _' }); return;
    }
    if (typeof password !== 'string' || password.length < 4) {
      res.status(400).json({ error: 'Mật khẩu tối thiểu 4 ký tự' }); return;
    }
    if (db.getUser(username)) { res.status(409).json({ error: 'Tài khoản đã tồn tại' }); return; }
    db.addUser({ username, ...newPassword(password), characters: [] });
    res.json({ token: issueToken(username), username } satisfies AuthResponse);
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body ?? {};
    const user = typeof username === 'string' ? db.getUser(username) : undefined;
    if (!user || typeof password !== 'string' ||
        !timingSafeEqual(Buffer.from(hashPassword(password, user.salt)), Buffer.from(user.hash))) {
      res.status(401).json({ error: 'Sai tài khoản hoặc mật khẩu' }); return;
    }
    res.json({ token: issueToken(user.username), username: user.username } satisfies AuthResponse);
  });

  app.get('/api/characters', requireAuth, (req: AuthedRequest, res) => {
    res.json(db.listCharacters(req.username!).map(summary));
  });

  app.post('/api/characters', requireAuth, (req: AuthedRequest, res) => {
    // New characters choose hệ + giới (original newplayerini00–09); the faction comes at level 10.
    const { name, series, gender } = req.body ?? {};
    if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 16) {
      res.status(400).json({ error: 'Tên nhân vật 2–16 ký tự' }); return;
    }
    if (!SERIES.includes(series)) { res.status(400).json({ error: 'Ngũ hành không hợp lệ' }); return; }
    if (gender !== 'male' && gender !== 'female') { res.status(400).json({ error: 'Giới tính không hợp lệ' }); return; }
    if (db.nameTaken(name.trim())) { res.status(409).json({ error: 'Tên nhân vật đã có người dùng' }); return; }
    if (db.listCharacters(req.username!).length >= MAX_CHARACTERS) { res.status(400).json({ error: `Tối đa ${MAX_CHARACTERS} nhân vật` }); return; }
    const town = MAPS[TOWN_MAP_ID].raw.entry;
    const [x, y] = snapToMap(TOWN_MAP_ID, town.x, town.y);
    const char: CharacterRecord = {
      id: randomUUID(), owner: req.username!, name: name.trim(), faction: '', series, gender,
      level: 1, mapId: TOWN_MAP_ID, x, y, progress: newProgress(), progressVersion: PROGRESS_VERSION,
    };
    db.addCharacter(char);
    res.json(summary(char));
  });
}
