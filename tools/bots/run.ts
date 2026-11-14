/**
 * Bot giả lập người chơi (docs/bots.md).
 *
 *   npm run bots -- <kịch bản>                    chạy theo bots/<kịch bản>.json (soạn ở trang /?bots)
 *   npm run bots -- <kịch bản> --server <url>     đổi server của kịch bản
 *   npm run bots -- <số bot> <giây> [server]      chế độ cũ: thử nhanh (runner/legacy.ts)
 *
 * Bot là tài khoản thật do trang /?bots tạo (API dev, DEV_TOOLS); mẫu nhân vật được áp khi bot vào game lần đầu. Runner lấy
 * token của các bot qua API dev, cho bot vào dần 3–5 bot/giây, chạy các hoạt động đồng thời và in trạng
 * thái mỗi 10 giây; chạy liên tục tới khi Ctrl+C thì cho bot thoát. Chỉ giả lập người chơi: đo hiệu năng server là công cụ riêng.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BOT_FILE_RE, normalizeBotTemplate, normalizeBotScenario, type BotLogin, type BotScenario } from '@vltk/shared';
import { makeBehavior } from './runner/behaviors.js';
import { BotClient, type RunStats } from './runner/BotClient.js';
import { runLegacy } from './runner/legacy.js';
import { between, rng } from './runner/rng.js';

const BOTS_DIR = path.resolve(process.env.BOTS_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), 'data'));
const STATUS_MS = 10_000;
const LOOP_MS = 25;

const args = process.argv.slice(2);
const pendingStops = new Set<string>(); let prepared = false;
process.on('message',(message:{type?:string;usernames?:string[]})=>{
  if(prepared||message?.type!=='stop'||!Array.isArray(message.usernames))return;
  message.usernames.forEach(id=>pendingStops.add(id));process.send?.({type:'stopped',usernames:message.usernames});
});
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
  const users = args.includes('--users') ? JSON.parse(args[args.indexOf('--users') + 1]) : undefined;
  if (users) sc.bots = { prefix: 'botfixed', count: 0, usernames: users };
  let cancelled = false;
  process.once('SIGTERM', () => { cancelled = true; });
  if (server) sc.server = server.replace(/\/+$/, '');
  if (sc.initialSetup?.length && sc.bots.usernames) {
    try {
      const response = await fetch(`${sc.server}/api/dev/bots`); if (!response.ok) throw new Error('Không đọc được danh sách bot.');
      const existing = new Set(((await response.json()) as { username: string }[]).map(b => b.username));
      for (const group of sc.initialSetup) {
        const missing = group.usernames.filter(id => sc.bots.usernames!.includes(id) && !existing.has(id) && !pendingStops.has(id));
        if (!missing.length) continue;
        const template = normalizeBotTemplate(JSON.parse(fs.readFileSync(path.join(BOTS_DIR,'templates',`${group.template}.json`),'utf8')));
        for (let i = 0; i < missing.length; i += 3) {
          if (cancelled) process.exit(0);
          const usernames = missing.slice(i, i + 3).filter(id=>!pendingStops.has(id)); if(!usernames.length)continue;
          const configured = await fetch(`${sc.server}/api/dev/bots/configure`, { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usernames,template,templateName:group.template}) });
          if (!configured.ok) throw new Error((await configured.json() as {error?:string}).error ?? 'Không khởi tạo được bot.');
          usernames.forEach(id => existing.add(id));
          await new Promise(resolve => setTimeout(resolve, 1000 / sc.joinPerSecond));
        }
      }
    } catch (e) { console.error(`Không chuẩn bị được bot: ${(e as Error).message}`); process.exit(1); }
  }
  if (cancelled) process.exit(0);
  if(sc.bots.usernames)sc.bots.usernames=sc.bots.usernames.filter(id=>!pendingStops.has(id));
  if(sc.bots.usernames?.length===0)process.exit(0);
  let logins: BotLogin[];
  try {
    const res = await fetch(`${sc.server}/api/dev/bots/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sc.bots),
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
  const bots = logins.map((login, i) => {
    const bot = new BotClient(login, sc, rng(sc.seed * 7919 + i + 1), run);
    bot.behavior = makeBehavior(bot, sc);
    return bot;
  });
  prepared=true;
  for(const bot of bots)if(pendingStops.has(bot.name))void bot.stop();
  console.log(`[bots] kịch bản "${name}" · ${sc.server} · ${bots.length} bot · chạy liên tục, dừng bằng Ctrl+C`);

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
      try { bot.behavior.update(now); bot.updateSocial(now); } catch (e) { run.errors++; run.lastError = `${bot.name}: ${(e as Error).message}`; }
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

  const ipcStatus = () => process.send?.({ type:'status', bots:bots.map((bot, i) => ({ username:bot.name, online:bot.online, stopped:bot.stopped, started:i < joined })) });
  const ipcTimer = process.send ? setInterval(ipcStatus, 500) : undefined;
  process.on('message', async (message: { type?:string; usernames?:string[] }) => {
    if (message?.type !== 'stop' || !Array.isArray(message.usernames)) return;
    await Promise.allSettled(bots.filter(bot => message.usernames!.includes(bot.name)).map(bot => bot.stop()));
    ipcStatus(); if (bots.every(bot => bot.stopped)) void end('đã dừng toàn bộ bot');
  });
  let ending = false;
  const end = async (why: string) => {
    if (ending) return;
    ending = true;
    console.log(`[bots] ${why}: cho ${bots.length} bot thoát…`);
    clearInterval(joinTimer); clearInterval(loop); clearInterval(status); if (ipcTimer) clearInterval(ipcTimer);
    await Promise.race([Promise.allSettled(bots.map(b => b.stop())), new Promise(r => setTimeout(r, 5000))]);
    process.exit(0);
  };
  process.on('SIGINT', () => void end('Ctrl+C'));
  process.on('SIGTERM', () => void end('SIGTERM'));

}
