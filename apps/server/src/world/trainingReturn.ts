import { MAPS, snapToMap, type TrainingReturnPoint } from '@vltk/shared';
import { db, type CharacterRecord } from '../account/db.js';
import { mapAvailable } from '../mapRegistry.js';
import type { Sim } from './entity.js';

/** Remember the departure point only on a valid field → town transfer, including revival. */
export function rememberTrainingReturn(sim: Sim, fromMapId: number, toMapId: number): void {
  if (!sim.charId || !MAPS[fromMapId] || MAPS[fromMapId].safe || !MAPS[toMapId]?.safe || !mapAvailable(fromMapId)) return;
  const { x, y } = sim.a;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  db.updateCharacter(sim.charId, { trainingReturn: { mapId: fromMapId, x, y } });
}

/** The server owns the saved coordinates; clients send an intention, never a destination. */
export function resolveSavedTrainingReturn(char: CharacterRecord, currentMapId: number): { point?: TrainingReturnPoint; error?: string; adjusted?: boolean } {
  if (!MAPS[currentMapId]?.safe) return { error: 'Chỉ trở lại bãi luyện công từ trong thành.' };
  const point = char.trainingReturn;
  if (!point) return {};
  if (!Number.isInteger(point.mapId) || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !mapAvailable(point.mapId, true) || MAPS[point.mapId]?.safe) {
    return { error: 'Bãi luyện công đã lưu không còn hợp lệ hoặc chưa có dữ liệu. Hãy chọn bãi khác.' };
  }
  const size = MAPS[point.mapId].raw.size;
  if (point.x < 0 || point.y < 0 || point.x >= size.width || point.y >= size.height) return { error: 'Tọa độ quay lại đã lưu không hợp lệ.' };
  const allowed = char.bot?.setup.map.maps;
  if (allowed?.length && !allowed.includes(point.mapId)) return { error: 'Bãi đã lưu không còn nằm trong thiết lập bản đồ của bot. Hãy chọn bãi khác.' };
  try {
    const [x, y] = snapToMap(point.mapId, point.x, point.y);
    return { point: { mapId: point.mapId, x, y }, adjusted: x !== point.x || y !== point.y };
  } catch { return { error: 'Không tìm được điểm đứng hợp lệ gần vị trí đã lưu.' }; }
}
