// Skill system: data packs (one folder per faction + common + monsters, generated from the original client by
// apps/client/tools/gen-skills.ts) and the engine that runs them for any owner.
import { registerMissiles, registerPack } from './core/registry.js';
import { MISSILES } from './common/missiles.gen.js';
import { common } from './common/index.js';
import { monsters } from './monsters/index.js';
import { shaolin } from './factions/shaolin/index.js';
import { huashan } from './factions/huashan/index.js';
import { tianwang } from './factions/tianwang/index.js';
import { tangmen } from './factions/tangmen/index.js';
import { wudu } from './factions/wudu/index.js';
import { emei } from './factions/emei/index.js';
import { cuiyan } from './factions/cuiyan/index.js';
import { gaibang } from './factions/gaibang/index.js';
import { tianren } from './factions/tianren/index.js';
import { wudang } from './factions/wudang/index.js';
import { kunlun } from './factions/kunlun/index.js';

registerMissiles(MISSILES);
for (const pack of [shaolin, tianwang, tangmen, wudu, emei, cuiyan, gaibang, tianren, wudang, kunlun, huashan, common, monsters]) {
  registerPack(pack);
}

export * from './core/types.js';
export * from './core/formula.js';
export * from './core/events.js';
export * from './core/learning.js';
export * from './core/registry.js';
export * from './core/info.js';
export * from './core/category.js';
export * from './core/describe.js';
export * from './core/magicdesc.gen.js';
export * from './core/tuning.js';
export * from './engine/types.js';
export * from './engine/SkillEngine.js';
export * from './engine/ai.js';
