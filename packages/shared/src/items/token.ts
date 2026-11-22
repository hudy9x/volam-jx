// Lệnh bài (USER 2026-11-12): one per character, always in the hành trang (given again when missing). Right click (or click)
// opens its menu (client ui/windows/token.ts); the server carries out each option (apps/server/src/world/token.ts):
//  - Thăng cấp 150 · nhận ngẫu nhiên 100 triệu – 1 tỷ kinh nghiệm · học hết kỹ năng cấp 90 / 120 / 150 của môn phái ở cấp tối
//    đa (bỏ qua thục luyện) · nhận 10 000 vạn lượng · nhận một bộ hoàng kim môn phái (chọn bộ) · đổi phái · đổi giới tính
//    (điểm tiềm năng / kỹ năng về mặc định, giữ đồ và cấp).
// A test / trial helper the user asked for — not in the original; the icon is the original "Lệnh bài thông hành"
// (questkey.txt, taskobj126.spr). Numbers here (CHỌN from the user's words).
import { MENPAI } from './equip.js';
import { SUITES } from './gold.js';
import { sexOf, type ItemDef } from './items.js';
import type { Gender } from '../characters/factions.js';
export { TOKEN_ITEM, TOKEN_ITEM_ID, TOWN_PORTAL_ITEM, TOWN_PORTAL_ID } from './books.js';

/** Options; 'faction' / 'gender' reset potential + skill points to their defaults, keep items and level (USER 2026-11-12). */
export type TokenOp = 'level' | 'exp' | 'skills' | 'money' | 'gold' | 'faction' | 'gender' | 'washPotential' | 'washSkills' | 'ring' | 'graduate' | 'tkAccum' | 'horse150' | 'potionMax';

export const TOKEN = {
  /** "Thăng cấp 150". */
  level: 150,
  /** "Nhận random điểm kinh nghiệm từ 100 triệu đến 1 tỉ". */
  expMin: 100_000_000,
  expMax: 1_000_000_000,
  /** "Nhận 10000 vạn lượng" = 100 000 000 lượng. */
  money: 100_000_000,
  /** "Nhận 100000 điểm tích lũy". */
  tkAccum: 100_000,
  /** Skill tiers "Học kĩ năng 90, 120, 150". */
  tiers: [90, 120, 150] as const,
  /** Ngựa 150 ngẫu nhiên: Bôn Tiêu, Phiên Vũ, Dương Sa. */
  horsePool: ['horse-60', 'horse-70', 'horse-260'] as const,
  /** Ngũ Hoa Ngọc Lộ Hoàn tối đa 60 lọ. */
  potionId: 'potion-2-5',
  potionMax: 60,
};

/** Hoàng kim môn phái sets a faction can take: suite number, a name (the words its pieces share) and the pieces. */
export function factionSuites(faction: string, gender?: Gender | string): { suite: number; name: string; pieces: ItemDef[] }[] {
  const sx = gender ? sexOf(gender) : undefined;
  const out: { suite: number; name: string; pieces: ItemDef[] }[] = [];
  for (const [k, pieces] of Object.entries(SUITES)) {
    const menpai = pieces[0]?.req.find(r => r[0] === 'requiremenpai')?.[1];
    if (menpai === undefined || MENPAI[menpai] !== faction) continue;
    if (sx && pieces.some(p => p.sex && p.sex !== sx)) continue;
    const words = pieces.map(p => p.name.split(' '));
    const common: string[] = [];
    for (let i = 0; words.every(w => w[i] !== undefined && w[i] === words[0][i]); i++) common.push(words[0][i]);
    out.push({ suite: Number(k), name: common.join(' ') || pieces[0].name, pieces });
  }
  return out.sort((a, b) => a.suite - b.suite);
}
