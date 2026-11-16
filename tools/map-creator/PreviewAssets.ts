import fs from 'node:fs';
import path from 'node:path';
import { JX_ASSOC, JX_DEFAULT_LOOK, JX_PARTS, JX_SHADOWS, JX_SORT, JX_SHEETS, NPC_SHEETS, NPC_SHADOWS, JX_FOOT } from '../../apps/client/src/art/jx/data.gen.js';
import { MONSTERS } from '../../packages/shared/src/monsters/monsters.js';
export interface PreviewLayer { part: number; sheet: number; meta: readonly number[] }
export interface PreviewPose { layers: PreviewLayer[]; shadow?: PreviewLayer; orders: number[][]; lines: Record<number, number[]>; frames: number }
export interface PreviewFigure { name: string; scale: number; stand: PreviewPose; run: PreviewPose }
/** Read-only adapter over the exact generated game sprite tables. Only referenced sheets are served. */
export function previewAssets(assets: string) {
  const sheets: string[] = [];
  const layer = (part: number, key: string): PreviewLayer => {
    if (!JX_SHEETS[key] || !fs.existsSync(path.join(assets, `${key}.webp`))) throw Error(`Thiếu hình chơi thử: ${key}. Chạy gen:assets trước.`);
    let sheet = sheets.indexOf(key); if (sheet < 0) sheet = sheets.push(key) - 1;
    return { part, sheet, meta: JX_SHEETS[key] };
  };
  const playerPose = (key: 'stand' | 'run'): PreviewPose => {
    const action = JX_ASSOC.m[0][0][key]!;
    const rows: Record<number, number> = { 0: JX_DEFAULT_LOOK.helm, 1: JX_DEFAULT_LOOK.helm, 4: JX_DEFAULT_LOOK.armor, 5: JX_DEFAULT_LOOK.armor, 6: JX_DEFAULT_LOOK.armor, 7: JX_DEFAULT_LOOK.armor, 8: 0, 9: 0 };
    const layers = Object.entries(rows).flatMap(([part, row]) => { const k = JX_PARTS.m[Number(part)]?.[row]?.[action]; return k ? [layer(Number(part), k)] : []; });
    const order = JX_SORT.m[action] ?? JX_SORT.m.DEFAULT, fallback = JX_SORT.m.DEFAULT;
    return { layers, shadow: JX_SHADOWS.m[action] ? layer(-1, JX_SHADOWS.m[action]) : undefined, frames: layers.find(l => l.part === 5)!.meta[4], orders: order.dirs.map((d, i) => d ?? fallback.dirs[i] ?? []), lines: order.lines };
  };
  const player: PreviewFigure = { name: 'Nhân vật thử', scale: 1, stand: playerPose('stand'), run: playerPose('run') };
  const monsters: PreviewFigure[] = [];
  const seen = new Set<string>();
  for (const m of Object.values(MONSTERS)) {
    if (m.boss || m.dummy || seen.has(m.sprite)) continue;
    const key = NPC_SHEETS[m.sprite]?.stand ?? NPC_SHEETS[m.sprite]?.idle;
    if (!key || !fs.existsSync(path.join(assets, `${key}.webp`))) continue;
    seen.add(m.sprite);
    const body = layer(5, key), shadowKey = NPC_SHADOWS[key];
    const stand: PreviewPose = { layers: [body], frames: body.meta[4], orders: Array.from({ length: 8 }, () => [5]), lines: {}, shadow: shadowKey && fs.existsSync(path.join(assets, `${shadowKey}.webp`)) ? layer(-1, shadowKey) : undefined };
    monsters.push({ name: m.name, scale: m.scale, stand, run: stand });
    if (monsters.length === 3) break;
  }
  if (!monsters.length) throw Error('Chưa có hình quái để chơi thử. Chạy gen:assets trước.');
  return { data: { foot: JX_FOOT, player, monsters, sheets: sheets.map((_, i) => `/api/preview/sheet/${i}`) }, files: sheets.map(key => path.join(assets, `${key}.webp`)) };
}
