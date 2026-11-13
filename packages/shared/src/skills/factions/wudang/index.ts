import type { SkillPack } from '../../core/types.js';
import { LEARN, SKILLS } from './skills.gen.js';
import { TUNING } from './tuning.js';

export const wudang: SkillPack = { id: 'wudang', name: 'Võ Đang', skills: SKILLS, learn: LEARN, tuning: TUNING };
