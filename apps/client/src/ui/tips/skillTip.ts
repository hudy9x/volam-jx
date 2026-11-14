import {
  SKILL_CATEGORY_NAMES, describeSkill, getSkill, isCastable, maxLevelOf,
  skillCategory, weaponOk, type SkillCategory, type SkillDef, type TipLine,
} from '@vltk/shared';
import { skillbar } from '../../state/skillbar';
import { tooltip } from '../kit/tooltip';

export const CATEGORY_CLASS: Record<SkillCategory, string> = { attack: 'c-attack', support: 'c-support', buff: 'c-buff', debuff: 'c-debuff', passive: 'c-passive' };

/**
 * Full description in the original layout (KSkill::GetDesc: name, required level, description, school, current level,
 * every attribute of the level, weapon / horse limits, then "Đẳng cấp kế tiếp"), plus our notes on what is not
 * wired into gameplay yet. Display only. Levels and weapon: state/skillbar.ts.
 */
export function fillSkillTip(box: HTMLElement, s: SkillDef, tier?: string): void {
  const level = Math.max(1, skillbar.levelOf(s.id));
  const max = maxLevelOf(s);
  const t = describeSkill(s, level, max);
  const cat = skillCategory(s);
  const section = (): HTMLElement => {
    const sec = document.createElement('div');
    sec.className = 'tip-section';
    return sec;
  };
  const put = (parent: HTMLElement, lines: TipLine[], cls = '') => {
    for (const l of lines) {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      for (const span of l) {
        const e = document.createElement('span');
        e.textContent = span.text;
        d.appendChild(e);
      }
      parent.appendChild(d);
    }
  };
  const text = (parent: HTMLElement, cls: string, value: string) => put(parent, [[{ text: value }]], cls);
  const flush = (sec: HTMLElement) => { if (sec.childElementCount) box.appendChild(sec); };

  // Section 1: Tên, phân loại, mô tả cơ bản & cấp hiện tại
  const s1 = section();
  put(s1, t.head.slice(0, 1), 'tip-name');
  text(s1, 'tip-head', `${SKILL_CATEGORY_NAMES[cat]}${s.aura ? ' (hào quang)' : ''}${tier ? ` · ${tier}` : ''}`);
  put(s1, t.head.slice(1), 'tip-head');
  flush(s1);

  // Section 2: Chỉ số / hiệu quả ở cấp hiện tại
  const s2 = section();
  if (t.current.length) put(s2, t.current, 'tip-attr');
  flush(s2);

  // Section 3: Yêu cầu vũ khí / cưỡi ngựa
  const blocked = isCastable(s) && !weaponOk(s, skillbar.weapon);
  const s3 = section();
  put(s3, t.limits, blocked ? 'tip-bad' : 'tip-limit');
  flush(s3);

  // Section 4: Đẳng cấp kế tiếp
  if (t.next) {
    const s4 = section();
    text(s4, 'tip-next', 'Đẳng cấp kế tiếp');
    put(s4, t.next.length ? t.next : [[{ text: '(không đổi)' }]], 'tip-attr');
    flush(s4);
  }

  // Section 5: Ghi chú / cảnh báo
  const s5 = section();
  const hint = blocked ? 'Vũ khí đang cầm không dùng được chiêu này'
    : s.aura ? 'Đặt vào ô tay trái / phải: hào quang tự bật (phím 1–9: bấm để bật / tắt)'
      : isCastable(s) ? 'Kéo xuống thanh phím tắt, hoặc chọn rồi bấm Trái / Phải' : 'Bị động: luôn có hiệu lực';
  text(s5, blocked ? 'tip-bad' : 'tip-note', hint);
  flush(s5);
}

/** Skill tooltip next to `anchor` (null hides it). */
export function showSkillTip(id: number | null, anchor?: HTMLElement, tier?: string): void {
  const s = id !== null ? getSkill(id) : undefined;
  if (!s || !anchor) { tooltip.hide(); return; }
  tooltip.show(anchor, box => fillSkillTip(box, s, tier), 'skill-tip');
}
