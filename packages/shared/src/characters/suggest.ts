// Gợi ý cộng điểm (USER 2026-11-13: "tham khảo jx-web-main"). Tuyến võ công per faction and potential ratios are taken from
// jx-web-main (src/client/gameplay/skill-routes-01.js, config/potential-allocation.json; original skill ids). The client
// previews a plan, the server carries out the same plan (world/progress.ts applySuggestion). Hoa Sơn is not in jx-web-main:
// one route with every point skill (CHỌN).
import { isExternal } from '../formulas/damage.js';
import { equipError, type ItemViewer } from '../items/equip.js';
import { itemDef, type Bag, type Equipment, type ItemDef } from '../items/items.js';
import { getSkill, learnableSkills } from '../skills/core/registry.js';
import { raiseError, skillGrowth } from '../skills/core/learning.js';
import { POTENTIALS, type Potential } from '../formulas/character.js';

export interface SkillRoute { id: string; name: string; skills: number[]; finisher?: number }

/** Skill routes per faction: shared = Trấn Phái skill (maxLevel 30), routes = point skills of each weapon/combat line. */
const CATALOG: Record<string, { shared: number[]; routes: SkillRoute[] }> = {
  shaolin: {
    shared: [273], routes: [
      { id: 'staff', name: 'Côn pháp', skills: [4, 10, 11] }, { id: 'blade', name: 'Đao pháp', skills: [6, 10, 19] },
      { id: 'fist', name: 'Quyền pháp', skills: [8, 14, 271] }]
  },
  tianwang: {
    shared: [36], routes: [
      { id: 'spear', name: 'Thương pháp', skills: [23, 30, 35, 41] }, { id: 'blade', name: 'Đao pháp', skills: [24, 34, 37, 32] },
      { id: 'hammer', name: 'Chùy pháp', skills: [26, 29, 31, 324] }]
  },
  tangmen: {
    shared: [48], routes: [
      { id: 'dart', name: 'Phi tiêu', skills: [43, 45, 47, 341] }, { id: 'knife', name: 'Phi đao', skills: [43, 45, 50, 249] },
      { id: 'crossbow', name: 'Tụ tiễn', skills: [43, 45, 54, 58] },
      { id: 'trap', name: 'Bẫy', skills: [347, 303, 343, 345, 349, 351], finisher: 351 }]
  },
  wudu: {
    shared: [75], routes: [
      { id: 'blade', name: 'Đao pháp', skills: [60, 65, 384, 74] }, { id: 'palm', name: 'Chưởng pháp', skills: [62, 63, 68, 71] },
      { id: 'curse', name: 'Bùa chú', skills: [67, 70, 64, 73, 356, 72, 390], finisher: 390 }]
  },
  emei: {
    shared: [252], routes: [
      { id: 'sword', name: 'Kiếm pháp', skills: [77, 85, 385, 88] },
      { id: 'palm', name: 'Chưởng pháp', skills: [79, 80, 82, 91] },
      { id: 'support', name: 'Hỗ trợ', skills: [93, 89, 86, 92, 282, 332], finisher: 332 }]
  },
  cuiyan: {
    shared: [114], routes: [
      { id: 'blade', name: 'Đơn đao', skills: [95, 99, 105, 108] }, { id: 'dual', name: 'Song đao', skills: [97, 102, 113, 111] }]
  },
  gaibang: {
    shared: [130], routes: [
      { id: 'staff', name: 'Bổng pháp', skills: [115, 119, 124, 125] }, { id: 'palm', name: 'Chưởng pháp', skills: [116, 122, 274, 128] }]
  },
  tianren: {
    shared: [150], routes: [
      { id: 'spear', name: 'Mâu pháp', skills: [132, 135, 141, 142] },
      { id: 'fire', name: 'Đao pháp · Nội công', skills: [131, 145, 138, 148] },
      { id: 'curse', name: 'Bùa chú', skills: [136, 137, 140, 364, 143, 391], finisher: 391 }]
  },
  wudang: {
    shared: [166], routes: [
      { id: 'qi', name: 'Khí công', skills: [152, 153, 164, 165] }, { id: 'sword', name: 'Kiếm pháp', skills: [151, 155, 158, 267] }]
  },
  kunlun: {
    shared: [275], routes: [
      { id: 'blade', name: 'Đao pháp', skills: [167, 169, 178, 176] },
      { id: 'sword', name: 'Kiếm pháp · Lôi pháp', skills: [168, 179, 172, 182] },
      { id: 'curse', name: 'Bùa chú', skills: [392, 174, 393, 175, 181, 90, 394], finisher: 394 }]
  },
  huashan: {
    shared: [1358], routes: [
      { id: 'sword', name: 'Kiếm Tông', skills: [1349, 1350, 1347, 1351, 1354, 1355, 1360] },
      { id: 'qi', name: 'Khí Tông', skills: [1374, 1372, 1375, 1376, 1378, 1379, 1380] }]
  },
};

type Weights = Record<Potential, number>;
/** jx-web-main config/potential-allocation.json: % of the free points per potential. */
const POTENTIAL_DEFAULT: Record<'external' | 'internal', Weights> = {
  external: { str: 65, dex: 5, vit: 30, eng: 0 },
  internal: { str: 0, dex: 5, vit: 90, eng: 5 },
};
const POTENTIAL_OVERRIDE: Record<string, Record<string, Weights>> = {
  shaolin: { staff: { str: 55, dex: 15, vit: 30, eng: 0 }, fist: { str: 55, dex: 15, vit: 30, eng: 0 } },
  tianwang: { spear: { str: 55, dex: 15, vit: 30, eng: 0 }, blade: { str: 55, dex: 15, vit: 30, eng: 0 }, hammer: { str: 55, dex: 15, vit: 30, eng: 0 } },
  tangmen: { dart: { str: 0, dex: 70, vit: 30, eng: 0 }, knife: { str: 0, dex: 70, vit: 30, eng: 0 }, crossbow: { str: 0, dex: 70, vit: 30, eng: 0 } },
  wudu: { curse: { str: 0, dex: 5, vit: 85, eng: 10 } },
  emei: { palm: { str: 0, dex: 5, vit: 85, eng: 10 }, support: { str: 0, dex: 5, vit: 75, eng: 20 } },
  cuiyan: { dual: { str: 0, dex: 5, vit: 85, eng: 10 } },
  tianren: { fire: { str: 0, dex: 5, vit: 85, eng: 10 }, curse: { str: 0, dex: 5, vit: 85, eng: 10 } },
  wudang: { sword: { str: 50, dex: 15, vit: 25, eng: 10 }, qi: { str: 0, dex: 5, vit: 65, eng: 30 } },
  kunlun: { curse: { str: 0, dex: 5, vit: 85, eng: 10 } },
};

/** Routes of a faction: route skills + the shared ones, only skills the faction teaches. */
export function skillRoutes(faction: string): SkillRoute[] {
  const teach = new Set(learnableSkills(faction));
  const cat = CATALOG[faction];
  if (!cat) {
    const all = [...teach].filter(id => { const s = getSkill(id); return !!s && skillGrowth(s) === 'points'; });
    return all.length ? [{ id: 'all', name: 'Tất cả kỹ năng', skills: all }] : [];
  }
  return cat.routes.map(r => ({ ...r, skills: [...new Set([...r.skills, ...cat.shared])].filter(id => teach.has(id) && !!getSkill(id)) }));
}

/** The route most of the points already went into (route skills only, not the shared ones). */
export function guessRoute(faction: string, levels: Record<number, number>): SkillRoute | undefined {
  const routes = skillRoutes(faction);
  const shared = new Set(CATALOG[faction]?.shared ?? []);
  const score = (r: SkillRoute) => r.skills.reduce((n, id) => n + (shared.has(id) ? 0 : levels[id] ?? 0), 0);
  return routes.slice().sort((a, b) => score(b) - score(a))[0];
}

export interface SkillPlanRow { id: number; before: number; to: number; reason: string }
export interface SkillPlan { route: SkillRoute | null; rows: SkillPlanRow[]; spent: number; remaining: number }

/**
 * Skill points of a route (USER 2026-11-14):
 *  1. Always max the Trấn Phái skill first (within levelCap).
 *  2. Next, max the level-10 skills of the current route.
 *  3. Distribute remaining points evenly across the rest of the current route's skills.
 *  4. Keep any leftover points unspent (never spill into skills outside the current route).
 */
export function planSkills(faction: string, routeId: string | undefined, levels: Record<number, number>, charLevel: number, points: number): SkillPlan {
  const route = skillRoutes(faction).find(r => r.id === routeId) ?? guessRoute(faction, levels) ?? null;
  const budget = Math.max(0, Math.floor(points));
  if (!route) return { route: null, rows: [], spent: 0, remaining: budget };
  const lv = { ...levels };
  let left = budget;
  const shared = new Set(CATALOG[faction]?.shared ?? []);
  const tierTranPhai = route.skills.filter(id => shared.has(id) || (getSkill(id)?.maxLevel ?? 20) >= 30);
  const tierLv10 = route.skills.filter(id => !tierTranPhai.includes(id) && (getSkill(id)?.reqLevel ?? 0) === 10);
  const tierRouteRest = route.skills.filter(id => !tierTranPhai.includes(id) && !tierLv10.includes(id));

  for (const group of [tierTranPhai, tierLv10, tierRouteRest]) {
    while (left > 0) {
      let next: number | null = null;
      for (const id of group) {
        if (raiseError(id, lv, charLevel, left)) continue;
        if (next === null || (lv[id] ?? 0) < (lv[next] ?? 0)) next = id;
      }
      if (next === null) break;
      lv[next] = (lv[next] ?? 0) + 1;
      left--;
    }
  }
  const rows = route.skills.filter(id => levels[id] !== undefined || lv[id] !== undefined).map(id => {
    const s = getSkill(id)!;
    const reason = levels[id] === undefined ? `Cần cấp ${s.reqLevel ?? 1}` : skillGrowth(s) !== 'points' ? 'Luyện / bí kíp'
      : lv[id] === levels[id] ? (raiseError(id, lv, charLevel, 1) ?? '') : '';
    return { id, before: levels[id] ?? 0, to: lv[id] ?? 0, reason };
  }).concat(route.skills.filter(id => levels[id] === undefined && lv[id] === undefined).map(id => ({
    id, before: 0, to: 0, reason: `Cần cấp ${getSkill(id)?.reqLevel ?? 1}`,
  })));
  const rank = (id: number) => tierTranPhai.includes(id) ? 0 : tierLv10.includes(id) ? 1 : 2;
  rows.sort((a, b) => rank(a.id) - rank(b.id) || (getSkill(a.id)?.reqLevel ?? 0) - (getSkill(b.id)?.reqLevel ?? 0) || a.id - b.id);
  return { route, rows, spent: budget - left, remaining: left };
}

export interface PotentialPlan {
  route: SkillRoute | null;
  weights: Weights;
  /** 'override' = the route's own ratio, 'external' / 'internal' = the general one. */
  source: string;
  add: Weights;
  /** Points of `add` that make worn / bag pieces wearable (Sức mạnh, Thân pháp requirements). */
  forItems: Weights;
  spent: number;
  remaining: number;
}

/** Sức mạnh / Thân pháp the character must reach to wear its pieces (worn ones and bag pieces only these block). */
export function itemNeeds(equip: Equipment, bag: Bag, viewer: ItemViewer): { str: number; dex: number } {
  const need = { str: 0, dex: 0 };
  const consider = (def: ItemDef | undefined) => {
    if (!def) return;
    // Only pieces the character could wear apart from Sức mạnh / Thân pháp.
    if (equipError(def, { ...viewer, str: 1e9, dex: 1e9 })) return;
    for (const [name, v] of def.req) {
      if (name === 'requirestr') need.str = Math.max(need.str, v);
      if (name === 'requiredex') need.dex = Math.max(need.dex, v);
    }
  };
  for (const it of Object.values(equip)) consider(itemDef(it));
  for (const it of bag) consider(itemDef(it));
  return need;
}

/**
 * Potential points (jx-web-main planPotentialRoute): first what the pieces need (itemNeeds − current), then the free points
 * by the route's ratio — always into the potential furthest below its share of the free points.
 */
export function planPotential(
  faction: string, routeId: string | undefined, skills: Record<number, number>, added: Weights,
  current: { str: number; dex: number }, needs: { str: number; dex: number }, points: number,
): PotentialPlan {
  const route = skillRoutes(faction).find(r => r.id === routeId) ?? guessRoute(faction, skills) ?? null;
  const external = !!route?.skills.some(id => { const s = getSkill(id); return !!s && isExternal(s, 1); });
  const override = route ? POTENTIAL_OVERRIDE[faction]?.[route.id] : undefined;
  const weights = override ?? POTENTIAL_DEFAULT[external ? 'external' : 'internal'];
  const add: Weights = { str: 0, dex: 0, vit: 0, eng: 0 };
  const forItems: Weights = { str: 0, dex: 0, vit: 0, eng: 0 };
  let left = Math.max(0, Math.floor(points));
  for (const k of ['str', 'dex'] as const) {
    const n = Math.min(left, Math.max(0, needs[k] - current[k]));
    add[k] += n; forItems[k] += n; left -= n;
  }
  const free: Weights = { ...added };
  for (const k of POTENTIALS) free[k] += add[k];
  const eligible = POTENTIALS.filter(k => weights[k] > 0);
  let total = eligible.reduce((n, k) => n + free[k], 0);
  while (left > 0 && eligible.length) {
    total++;
    let next = eligible[0], gap = -Infinity;
    for (const k of eligible) {
      const g = (total * weights[k]) / 100 - free[k];
      if (g > gap) { next = k; gap = g; }
    }
    add[next]++; free[next]++; left--;
  }
  return {
    route, weights, source: override ? 'override' : external ? 'external' : 'internal', add, forItems,
    spent: Math.max(0, Math.floor(points)) - left, remaining: left
  };
}
