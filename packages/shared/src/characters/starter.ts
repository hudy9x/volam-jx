// The outfit a new character wears the first time it enters the world.
import type { Gender } from './factions.js';
import { ITEMS, sexOf, type Outfit } from '../items/items.js';

/**
 * Starter outfit per faction: [armor type, helm type, weapon kind + type] for male; female outfits are
 * the same type + 7. Level 1 items; only used the first time a character enters the world.
 */
const STARTER: Record<string, { outfit: number; femaleOutfit?: number; weapon: string }> = {
  shaolin: { outfit: 0, weapon: 'melee-2' },        // Sa Di phục, côn
  tianwang: { outfit: 4, weapon: 'melee-4' },       // Tỏa Tử giáp, chùy
  tangmen: { outfit: 3, weapon: 'range-0' },        // trường bào, phi tiêu
  wudu: { outfit: 5, weapon: 'melee-1' },           // đao
  emei: { outfit: 0, femaleOutfit: 7, weapon: 'melee-0' },  // Sa Ni phục, kiếm
  cuiyan: { outfit: 3, femaleOutfit: 10, weapon: 'melee-1' }, // Cẩm Sam, đao (Phong Hoa Tuyết Nguyệt needs one)
  gaibang: { outfit: 6, weapon: 'melee-2' },        // áo vải thô, bổng
  tianren: { outfit: 2, weapon: 'melee-3' },        // thương
  wudang: { outfit: 1, weapon: 'melee-0' },         // đạo bào, kiếm
  kunlun: { outfit: 1, weapon: 'melee-1' },         // đạo bào, đao
  huashan: { outfit: 1, femaleOutfit: 8, weapon: 'melee-0' }, // đạo bào / nữ thức đạo y, kiếm
  xiaoyao: { outfit: 1, femaleOutfit: 8, weapon: 'melee-0' }, // Tiêu Dao: khởi đầu với kiếm (có thể đổi sang Cổ Cầm)
};

/** Table rows of the starter outfit (the server makes the pieces). */
export function starterEquipment(faction: string, gender: Gender | string): Outfit {
  const s = STARTER[faction];
  if (!s) return {};
  const outfit = sexOf(gender) === 'f' ? s.femaleOutfit ?? s.outfit + 7 : s.outfit;
  const pick = (id: string) => (ITEMS[id] ? id : undefined);
  return Object.fromEntries(Object.entries({
    armor: pick(`armor-${outfit}-1`), helm: pick(`helm-${outfit}-1`), weapon: pick(`${s.weapon}-1`),
  }).filter(([, v]) => v)) as Outfit;
}
