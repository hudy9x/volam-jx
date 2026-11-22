import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Chỉ theo dõi mã nguồn của công cụ bot & phần shared liên quan; không quét data/, assets hay game client/server.
const roots = ['tools/bots', 'packages/shared/src/bots', 'packages/shared/src/battle'];
const IGNORE_DIRS = new Set(['node_modules', 'data', '.bundle']);

function snapshot(): string {
  const files: string[] = [];
  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || IGNORE_DIRS.has(entry.name)) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(ts|js|css|html)$/.test(entry.name)) {
        const stat = fs.statSync(file);
        files.push(`${file}:${stat.mtimeMs}:${stat.size}`);
      }
    }
  };
  for (const dir of roots) visit(path.join(root, dir));
  return files.sort().join('\n');
}

let child: ChildProcess | undefined;
let stopping = false;
let restarting = false;

function start(): void {
  child = spawn(process.execPath, ['--import', 'tsx', 'tools/bots/server.ts'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, BOTS_UI_WATCH: '1' },
  });
  child.on('exit', code => {
    if (!stopping && !restarting && code) {
      console.error('Bot tools lỗi. Sửa code để tự chạy lại.');
    }
  });
}

let previous = snapshot();
start();

const timer = setInterval(() => {
  if (stopping || restarting) return;
  let next: string;
  try { next = snapshot(); } catch { return; }
  if (next === previous) return;
  previous = next;
  restarting = true;
  console.log('Mã công cụ bot thay đổi · đang nạp lại bots:ui…');
  const launch = () => { if (stopping) return; restarting = false; start(); };
  if (child && child.exitCode === null && child.signalCode === null) {
    child.once('exit', launch);
    child.kill('SIGTERM');
  } else {
    launch();
  }
}, 500);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    stopping = true;
    clearInterval(timer);
    if (child && child.exitCode === null && child.signalCode === null) {
      child.once('exit', () => process.exit(0));
      child.kill(signal);
    } else {
      process.exit(0);
    }
  });
}
