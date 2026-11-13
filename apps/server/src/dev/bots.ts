/**
 * Bot giả lập người chơi (docs/bots.md).
 *
 *   npm run bots -- <kịch bản>                    chạy theo bots/<kịch bản>.json (soạn ở trang /?bots)
 *   npm run bots -- <kịch bản> --server <url>     đổi server của kịch bản
 *   npm run bots -- <số bot> <giây> [server]      chế độ cũ: thử nhanh (dev/bots/legacy.ts)
 *
 * Bot là tài khoản thật do trang /?bots tạo (API dev, DEV_TOOLS); mẫu nhân vật được áp khi bot vào game lần đầu. Runner lấy
 * token của các bot qua API dev, cho bot vào dần theo `joinPerSecond`, chia hành vi theo tỉ lệ (hạt giống `seed`) và in trạng
 * thái mỗi 10 giây; Ctrl+C (hoặc hết `duration`) thì cho bot thoát. Chỉ giả lập người chơi: đo hiệu năng server là công cụ riêng.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOT_BEHAVIORS, BOT_FILE_RE, normalizeBotScenario, splitBehaviors, type BotLogin, type BotScenario } from '@vltk/shared';
import { makeBehavior } from './bots/behaviors.js';
import { BotClient, type RunStats } from './bots/BotClient.js';
import { runLegacy } from './bots/legacy.js';
import { between, rng, shuffle } from './bots/rng.js';

const BOTS_DIR = path.resolve(process.env.BOTS_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../../bots'));
const STATUS_MS = 10_000;
const LOOP_MS = 25;

const args = process.argv.slice(2);
if (!args.length || /^\d+$/.test(args[0])) {
  await runLegacy(Number(args[0] ?? 1), Number(args[1] ?? 20), args[2] ?? 'http://localhost:2567');
} else {
  await runScenario(args[0], args.includes('--server') ? args[args.indexOf('--server') + 1] : undefined);
}

function loadScenario(name: string): BotScenario {
  const file = path.join(BOTS_DIR, `${name}.json`);
  if (!BOT_FILE_RE.test(name) || !fs.existsSync(file)) {
    const have = fs.existsSync(BOTS_DIR) ? fs.readdirSync(BOTS_DIR).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)) : [];
    console.error(`Không có kịch bản "${name}" (${file}).${have.length ? ` Có: ${have.join(', ')}.` : ''} Soạn ở trang /?bots.`);
    process.exit(1);
  }
  return normalizeBotScenario(JSON.parse(fs.readFileSync(file, 'utf8')));
}

async function runScenario(name: string, server?: string): Promise<void> {
  const sc = loadScenario(name);
  if (server) sc.server = server.replace(/\/+$/, '');
  let logins: BotLogin[];
  try {
    const res = await fetch(`${sc.server}/api/dev/bots/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: sc.bots.prefix, count: sc.bots.count }),
    });
    if (!res.ok) throw new Error(`${res.status} ${((await res.json().catch(() => ({}))) as { error?: string }).error ?? ''}`);
    logins = await res.json() as BotLogin[];
  } catch (e) {
    console.error(`Không lấy được danh sách bot từ ${sc.server}: ${(e as Error).message}`);
    console.error('Server phải đang chạy với DEV_TOOLS (mặc định bật) và runner chạy cùng máy (hoặc server đặt BOT_API_REMOTE=1).');
    process.exit(1);
  }
  if (!logins.length) {
    console.error(`Server ${sc.server} chưa có bot tiền tố "${sc.bots.prefix}_". Tạo ở trang /?bots trước.`);
    process.exit(1);
  }

  const run: RunStats = { orders: 0, dropped: 0, deaths: 0, rejoins: 0, transfers: 0, errors: 0, lastError: '' };
  const rand = rng(sc.seed);
  const kinds = shuffle(splitBehaviors(sc.behaviors, logins.length), rand);
  const bots = logins.map((login, i) => {
    const bot = new BotClient(login, sc, rng(sc.seed * 7919 + i + 1), run);
    bot.behavior = makeBehavior(kinds[i], bot, sc);
    return bot;
  });
  const split = Object.entries(BOT_BEHAVIORS).map(([k, b]) => [b.name, kinds.filter(x => x === k).length] as const).filter(([, n]) => n);
  console.log(`[bots] kịch bản "${name}" · ${sc.server} · ${bots.length} bot (${split.map(([n, c]) => `${n} ${c}`).join(', ')}) · ` +
    `vào ${sc.joinPerSecond} bot/giây · ${sc.duration ? `${sc.duration} giây` : 'chạy tới khi Ctrl+C'}`);

  // Join a few per second (a login storm is not what players do).
  let joined = 0;
  const joinTimer = setInterval(() => {
    if (joined >= bots.length) { clearInterval(joinTimer); return; }
    void bots[joined++].connect();
  }, 1000 / sc.joinPerSecond);

  // One loop for every bot: each decides every tickMs (± 30 %).
  const loop = setInterval(() => {
    const now = performance.now();
    for (const bot of bots) {
      if (!bot.online || now < bot.nextTick) continue;
      bot.nextTick = now + sc.human.tickMs * between(bot.rand, 0.7, 1.3);
      try { bot.behavior.update(now); } catch (e) { run.errors++; run.lastError = `${bot.name}: ${(e as Error).message}`; }
    }
  }, LOOP_MS);

  let last = { orders: 0, at: performance.now() };
  const status = setInterval(() => {
    const now = performance.now();
    const online = bots.filter(b => b.online);
    const maps = new Map<number, number>();
    for (const b of online) maps.set(b.mapId, (maps.get(b.mapId) ?? 0) + 1);
    const mapText = [...maps].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, n]) => `${id}:${n}`).join(' ');
    const perSec = Math.round((run.orders - last.orders) / ((now - last.at) / 1000));
    last = { orders: run.orders, at: now };
    console.log(`[bots ${new Date().toLocaleTimeString('vi-VN')}] online ${online.length}/${bots.length} · bản đồ ${mapText || '-'} · ` +
      `lệnh/s ${perSec}${run.dropped ? ` (bỏ ${run.dropped} vì vượt giới hạn)` : ''} · chết ${run.deaths} · đổi bản đồ ${run.transfers} · ` +
      `vào lại ${run.rejoins} · lỗi ${run.errors}${run.lastError ? ` (gần nhất: ${run.lastError})` : ''}`);
    run.lastError = '';
  }, STATUS_MS);

  let ending = false;
  const end = async (why: string) => {
    if (ending) return;
    ending = true;
    console.log(`[bots] ${why}: cho ${bots.length} bot thoát…`);
    clearInterval(joinTimer); clearInterval(loop); clearInterval(status);
    await Promise.race([Promise.allSettled(bots.map(b => b.stop())), new Promise(r => setTimeout(r, 5000))]);
    process.exit(0);
  };
  process.on('SIGINT', () => void end('Ctrl+C'));
  process.on('SIGTERM', () => void end('SIGTERM'));
  if (sc.duration) setTimeout(() => void end(`hết ${sc.duration} giây`), sc.duration * 1000);
}
