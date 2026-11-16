import type { IncomingMessage, ServerResponse } from 'node:http';
import { ConfigInUseError, type ConfigStore } from './ConfigStore.js';

/** Saved configuration only: deleting a file never changes accounts or stops a runner. */
export function handleConfigRequest(req: IncomingMessage, res: ServerResponse, pathname: string,
  store: ConfigStore, runs: { usesScenario(name: string): boolean }): boolean {
  if (pathname !== '/api/config' && !pathname.startsWith('/api/config/')) return false;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const fail = (error: unknown) => {
    const code = (error as NodeJS.ErrnoException).code;
    res.writeHead(code === 'CONFIG_IN_USE' ? 409 : code === 'ENOENT' ? 404 : 400);
    res.end(JSON.stringify({ error: (error as Error).message }));
  };
  try {
    if (pathname === '/api/config' && req.method === 'GET') { res.end(JSON.stringify(store.list())); return true; }
    const parts = pathname.split('/'), kind = parts[3], name = parts[4];
    if (parts.length !== 5 || !kind || !name) throw Error('Chọn một cấu hình đã lưu.');
    if (req.method === 'GET') { res.end(JSON.stringify(store.read(kind, name))); return true; }
    if (!['PUT', 'DELETE'].includes(req.method ?? '') || req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) {
      res.writeHead(403); res.end(JSON.stringify({ error: 'Yêu cầu không hợp lệ.' })); return true;
    }
    if (req.method === 'DELETE') {
      if (kind === 'scenarios' && runs.usesScenario(name)) throw new ConfigInUseError('Kịch bản đang chạy hoặc chuẩn bị chạy. Hãy dừng các bot dùng kịch bản này trước khi xóa.');
      store.remove(kind, name);
      res.end(JSON.stringify({ deleted: name })); return true;
    }
    let raw = '';
    req.on('data', chunk => { raw += chunk; if (raw.length > 65536) req.destroy(); });
    req.on('end', () => { try { res.end(JSON.stringify(store.save(kind, name, JSON.parse(raw)))); } catch (error) { fail(error); } });
  } catch (error) { fail(error); }
  return true;
}
