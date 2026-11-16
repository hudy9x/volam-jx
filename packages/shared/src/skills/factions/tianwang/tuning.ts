import type { SkillTuning } from '../../core/types.js';

/** All editable Thiên Vương casting rules. Durations match volamidle's effective
 * action cadence, not its per-hit damage/cost normalization. One cast retains
 * the complete original combo and pays the full skill_cost_v once. */
export const TIANWANG_CASTING = {
  cyclesMs: {
    slow: 500,
    medium: 400,
    // 👇 ĐÂY LÀ CHỖ CHỈNH NHỊP CHIÊU 90 & 150 (Thương 323, Chùy 324, Đao 322, 150: 1058, 1059, 1060...)
    // Mặc định hiện tại: 2000 / 7 ≈ 285.7 ms (~3.5 combo/giây)
    // - Muốn xả 2 combo/giây: đổi thành 500
    // - Muốn xả 1.5 combo/giây: đổi thành 666
    // - Muốn xả 1 combo/giây: đổi thành 1000
    // fast: 2000 / 7
    fast: 2500 / 7
  },
  groups: {
    slow: [29, 30, 34],
    medium: [31, 35, 37],
    fast: [32, 41, 322, 323, 324, 325, 1058, 1059, 1060],
  },
  affectedByCold: true,
  costMultiplier: 1,
  lifeCost: { resource: 'hp' as const, minRemainingHpRatio: 0.25, minRemainingHp: 1 },
  lifeSkills: [29, 30, 31, 32, 33, 34, 35, 37, 40, 41, 42, 322, 323, 324, 325, 1058, 1059, 1060],
};

/** Hand tuning survives gen:skills. Skill IDs, never the caster's faction,
 * determine these rules; monsters retain their existing free-cast policy. */
export const TUNING: Record<number, SkillTuning> = {};
for (const id of TIANWANG_CASTING.lifeSkills) {
  TUNING[id] = { cost: TIANWANG_CASTING.costMultiplier, resourceCost: TIANWANG_CASTING.lifeCost };
}
for (const group of ['slow', 'medium', 'fast'] as const) {
  for (const id of TIANWANG_CASTING.groups[group]) {
    TUNING[id] = {
      ...TUNING[id], timing: {
        cycleMs: TIANWANG_CASTING.cyclesMs[group], affectedByCold: TIANWANG_CASTING.affectedByCold,
      }
    };
  }
}
