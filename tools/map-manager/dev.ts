import fs from 'node:fs';
import path from 'node:path';
import { spawn, type ChildProcess } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
// Only tool code and bundled UI primitives: never traverse game assets, DB, or game source.
const roots = ['tools/map-manager', 'tools/boss', 'tools/ui', 'apps/client/src/ui/kit'];
function snapshot() {
  const files: string[] = [];
  const visit = (dir: string) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'bosses') continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(file);
    else if (/\.(ts|js|css|html)$/.test(entry.name)) { const stat = fs.statSync(file); files.push(`${file}:${stat.mtimeMs}:${stat.size}`); }
  } };
  for (const dir of roots) visit(path.join(root, dir));
  return files.sort().join('\n');
}
let child: ChildProcess | undefined, stopping = false, restarting = false;
function start() { child = spawn(process.execPath, ['--import', 'tsx', 'tools/map-manager/server.ts'], { cwd: root, stdio: 'inherit', env: process.env }); child.on('exit', code => { if (!stopping && !restarting && code) console.error('Map Manager lỗi. Sửa code để tự chạy lại.'); }); }
let previous = snapshot();
start();
const timer = setInterval(() => {
  if (stopping || restarting) return;
  let next: string; try { next = snapshot(); } catch { return; }
  if (next === previous) return; previous = next; restarting = true;
  console.log('Mã tool thay đổi · đang nạp lại Map Manager…');
  const launch = () => { if (stopping) return; restarting = false; start(); };
  if (child && child.exitCode === null && child.signalCode === null) { child.once('exit', launch); child.kill('SIGTERM'); } else launch();
}, 500);
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { stopping = true; clearInterval(timer); if (child && child.exitCode === null && child.signalCode === null) { child.once('exit', () => process.exit(0)); child.kill(signal); } else process.exit(0); });
