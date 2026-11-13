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
  const put = (lines: TipLine[], cls = '') => {
    for (const l of lines) {
      const d = document.createElement('div');
      if (cls) d.className = cls;
      for (const span of l) {
        const e = document.createElement('span');
        e.textContent = span.text;
        if (span.color) e.style.color = span.color;
        d.appendChild(e);
      }
      box.appendChild(d);
    }
  };
  const text = (cls: string, value: string) => put([[{ text: value }]], cls);
  put(t.head.slice(0, 1), 'tip-name');
  text(`muted ${CATEGORY_CLASS[cat]}`, `${SKILL_CATEGORY_NAMES[cat]}${s.aura ? ' (hào quang)' : ''}${tier ? ` · ${tier}` : ''}`);
  put(t.head.slice(1), 'tip-head');
  if (t.current.length) put(t.current, 'tip-attr');
  const blocked = isCastable(s) && !weaponOk(s, skillbar.weapon);
  put(t.limits, blocked ? 'tip-bad' : 'tip-limit');
  if (t.next) {
    text('tip-next', 'Đẳng cấp kế tiếp');
    put(t.next.length ? t.next : [[{ text: '(không đổi)' }]], 'tip-attr');
  }
  const hint = blocked ? 'Vũ khí đang cầm không dùng được chiêu này'
    : s.aura ? 'Đặt vào ô tay trái / phải: hào quang tự bật (phím 1–9: bấm để bật / tắt)'
      : isCastable(s) ? 'Kéo xuống thanh phím tắt, hoặc chọn rồi bấm Trái / Phải' : 'Bị động: luôn có hiệu lực';
  text(blocked ? 'tip-bad' : 'muted', hint);
}

/** Skill tooltip next to `anchor` (null hides it). */
export function showSkillTip(id: number | null, anchor?: HTMLElement, tier?: string): void {
  const s = id !== null ? getSkill(id) : undefined;
  if (!s || !anchor) { tooltip.hide(); return; }
  tooltip.show(anchor, box => fillSkillTip(box, s, tier), 'skill-tip');
}
