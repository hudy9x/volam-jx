import type { SkillPack } from '../core/types.js';
import { LEARN, SKILLS } from './skills.gen.js';
import { TUNING } from './tuning.js';

export const common: SkillPack = { id: 'common', name: 'Thông dụng', skills: SKILLS, learn: LEARN, tuning: TUNING };
