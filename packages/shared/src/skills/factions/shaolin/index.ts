import type { SkillPack } from '../../core/types.js';
import { LEARN, SKILLS } from './skills.gen.js';
import { TUNING } from './tuning.js';

export const shaolin: SkillPack = { id: 'shaolin', name: 'Thiếu Lâm', skills: SKILLS, learn: LEARN, tuning: TUNING };
