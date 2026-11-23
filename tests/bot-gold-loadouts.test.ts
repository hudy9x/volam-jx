import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOT_GOLD_LOADOUTS, CANKHON_RING_ID, FACTIONS, FACTION_IDS, ITEMS, KIND_SLOTS, MAGIC_SLOTS, QUALITY, SERIES_KEYS,
  equipError, factionAllowsGender, fullSuite, getSkill, isMantleActive, resolveBotGoldLoadout, skillCategory,
  skillRoutes, weaponOk, weaponTypeOf, type EquipSlot, type Gender,
} from '../packages/shared/src/index.js';
import { buildBotGoldEquipment } from '../apps/server/src/world/botSetup.js';

test('gold-loadouts.json bao phủ đủ 12 phái × mọi tuyến kỹ năng và mọi itemId hợp lệ', () => {
  for (const faction of FACTION_IDS) {
    assert.ok(BOT_GOLD_LOADOUTS[faction], `Thiếu phái ${faction} trong gold-loadouts.json`);
    const routes = skillRoutes(faction);
    assert.ok(routes.length > 0, `Phái ${faction} phải có ít nhất 1 tuyến kỹ năng`);
    const genders: Gender[] = (['male', 'female'] as const).filter(g => factionAllowsGender(faction, g));
    const seriesIdx = SERIES_KEYS.indexOf(FACTIONS[faction].element);

    for (const route of routes) {
      const routeAtks = route.skills.map(id => getSkill(id)).filter((s): s is NonNullable<typeof s> => !!s && skillCategory(s) === 'attack');
      for (const gender of genders) {
        const resolved = resolveBotGoldLoadout(faction, route.id, gender);
        assert.ok(resolved, `Không resolve được loadout cho ${faction}.${route.id} (${gender})`);
        assert.equal(resolved.routeId, route.id, `Route không khớp cho ${faction}.${route.id}`);
        assert.equal(resolved.slots.horse, 'auto:horse', `Ngựa phải mặc định là auto:horse (${faction}.${route.id})`);

        for (const slot of [...MAGIC_SLOTS, 'mantle'] as EquipSlot[]) {
          const val = resolved.slots[slot];
          assert.ok(val, `Thiếu cấu hình ô ${slot} cho ${faction}.${route.id} (${gender})`);
          if (val === 'auto:green') continue;
          const def = ITEMS[val];
          assert.ok(def, `itemId không tồn tại: ${val} (${faction}.${route.id}.${slot})`);
          assert.ok(KIND_SLOTS[def.kind]?.includes(slot), `${val} (kind=${def.kind}) không lắp được vào ô ${slot}`);
          const err = equipError(def, { faction, gender, series: FACTIONS[faction].element, level: 150, str: 1000, dex: 1000 });
          assert.equal(err, null, `equipError cho ${faction}.${route.id} (${gender}) ô ${slot} (${val}): ${err}`);
          if (slot === 'weapon') {
            const wt = weaponTypeOf(def);
            for (const atk of routeAtks) {
              assert.ok(weaponOk(atk, wt), `${faction}.${route.id}: vũ khí ${def.name} (wt=${wt}) xung khắc chiêu ${atk.id}:${atk.name}`);
            }
          }
        }
      }
    }
  }
});

test('buildBotGoldEquipment lấp đủ 10 ô + Phi phong kích hoạt, đúng bộ chính và tôn trọng cờ ring (Cách A)', () => {
  for (const faction of FACTION_IDS) {
    const genders: Gender[] = (['male', 'female'] as const).filter(g => factionAllowsGender(faction, g));
    const seriesIdx = SERIES_KEYS.indexOf(FACTIONS[faction].element);

    for (const route of skillRoutes(faction)) {
      // Giả lập bot đang cộng điểm theo đúng tuyến `route`
      const skills: Record<number, number> = {};
      for (const id of route.skills) skills[id] = 20;

      for (const gender of genders) {
        // Trường hợp mặc định (ring = false): không ép Càn Khôn Giới Chỉ
        const built = buildBotGoldEquipment({ faction, gender, level: 150, skills, luck: 0, ring: false, random: () => 0 });
        assert.ok(built, `buildBotGoldEquipment trả null cho ${faction}.${route.id} (${gender})`);
        assert.equal(built.routeId, route.id);
        assert.equal(built.deferred.length, 0);

        for (const slot of [...MAGIC_SLOTS, 'mantle'] as EquipSlot[]) {
          const item = built.equip[slot];
          assert.ok(item, `Ô ${slot} bị trống cho ${faction}.${route.id} (${gender})`);
          const def = ITEMS[item.def];
          assert.ok(def, `Định nghĩa ${item.def} không tồn tại`);
          if (slot !== 'mantle') {
            assert.ok(def.gold || (item.q ?? 0) >= QUALITY.magic, `Ô ${slot} không được là đồ trắng (${faction}.${route.id})`);
          }
          assert.equal(
            equipError(def, { faction, gender, series: FACTIONS[faction].element, level: 150, str: 1000, dex: 1000 }),
            null,
            `${faction}.${route.id} (${gender}) ô ${slot} không mặc được`,
          );
        }

        assert.notEqual(built.equip.ring1?.def, CANKHON_RING_ID);
        assert.notEqual(built.equip.ring2?.def, CANKHON_RING_ID);
        assert.ok(isMantleActive(built.equip, seriesIdx), `Phi phong không kích hoạt ở gq=0 cho ${faction}.${route.id} (${gender})`);

        const resolved = resolveBotGoldLoadout(faction, route.id, gender)!;
        const ps = resolved.entry.primarySuite;
        const suiteId = typeof ps === 'number' ? ps : ps?.[gender];
        if (suiteId) {
          assert.ok(fullSuite(built.equip, suiteId), `${faction}.${route.id} (${gender}) chưa đủ full bộ chính #${suiteId}`);
        }

        // Trường hợp bật ring = true: đeo Càn Khôn Giới Chỉ vào 1 ô nhẫn
        const withRing = buildBotGoldEquipment({ faction, gender, level: 150, skills, luck: 5, ring: true, random: () => 0.5 });
        assert.ok(withRing);
        assert.ok(
          withRing.equip.ring1?.def === CANKHON_RING_ID || withRing.equip.ring2?.def === CANKHON_RING_ID,
          `${faction}.${route.id}: bật ring=true nhưng không có Càn Khôn Giới Chỉ`,
        );
      }
    }
  }
});
