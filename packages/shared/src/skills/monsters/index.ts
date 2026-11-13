import type { SkillPack } from '../core/types.js';
import { LEARN, SKILLS } from './skills.gen.js';
import { TUNING } from './tuning.js';

export const monsters: SkillPack = { id: 'monsters', name: 'Quái', skills: SKILLS, learn: LEARN, tuning: TUNING };
