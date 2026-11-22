// 11 môn phái (jx-web-main public/data.js JX.factions + helpers-and-config-01.js gender rule; Hoa Sơn from
// jx-origin settings/faction/门派设定.ini: index 10, hệ Thủy, nam và nữ).
export type Element = 'kim' | 'moc' | 'thuy' | 'hoa' | 'tho';
export type Gender = 'male' | 'female';

export interface FactionDef {
  id: string;
  name: string;
  element: Element;
  /** Restricted gender, if any. */
  gender?: Gender;
}

export const ELEMENT_NAMES: Record<Element, string> = {
  kim: 'Kim', moc: 'Mộc', thuy: 'Thủy', hoa: 'Hỏa', tho: 'Thổ',
};

/** Ngũ hành khắc: Kim > Mộc > Thổ > Thủy > Hỏa > Kim (seriesdamage_p, formulas/damage.ts). */
export const ELEMENT_COUNTERS: Record<Element, Element> = {
  kim: 'moc', moc: 'tho', tho: 'thuy', thuy: 'hoa', hoa: 'kim',
};

export const FACTIONS: Record<string, FactionDef> = {
  shaolin: { id: 'shaolin', name: 'Thiếu Lâm', element: 'kim', gender: 'male' },
  tianwang: { id: 'tianwang', name: 'Thiên Vương', element: 'kim' },
  tangmen: { id: 'tangmen', name: 'Đường Môn', element: 'moc' },
  wudu: { id: 'wudu', name: 'Ngũ Độc', element: 'moc' },
  emei: { id: 'emei', name: 'Nga My', element: 'thuy', gender: 'female' },
  cuiyan: { id: 'cuiyan', name: 'Thúy Yên', element: 'thuy', gender: 'female' },
  gaibang: { id: 'gaibang', name: 'Cái Bang', element: 'hoa' },
  tianren: { id: 'tianren', name: 'Thiên Nhẫn', element: 'hoa' },
  wudang: { id: 'wudang', name: 'Võ Đang', element: 'tho' },
  kunlun: { id: 'kunlun', name: 'Côn Lôn', element: 'tho' },
  huashan: { id: 'huashan', name: 'Hoa Sơn', element: 'thuy' },
  xiaoyao: { id: 'xiaoyao', name: 'Tiêu Dao', element: 'tho' },
};

export const FACTION_IDS = Object.keys(FACTIONS);

export function factionAllowsGender(factionId: string, gender: Gender): boolean {
  const f = FACTIONS[factionId];
  return !!f && (!f.gender || f.gender === gender);
}
