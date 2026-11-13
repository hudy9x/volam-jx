# Kỹ năng (skills/)

Mọi kỹ năng là **dữ liệu gốc** (id gốc trong `settings/skills.txt`) và một bộ máy chung chạy chúng cho bất kỳ đối tượng
nào: người chơi, bot, quái, boss, cọc gỗ. Đối tượng chỉ giữ danh sách `id → cấp`.

```
core/        types.ts      kiểu dữ liệu (SkillDef, MissileDef, LearnTier, SkillTuning)
             formula.ts    đường cong theo cấp như head.lua (Link): attr(skill, 'colddamage_v', level)
             registry.ts   sổ đăng ký: getSkill(id), getMissile(id), learnTiers(phái)…
             info.ts       thông tin cho UI/AI: loại chiêu, tầm, tiêu hao, vũ khí cần, tóm tắt sát thương
             describe.ts   mô tả đầy đủ kiểu client gốc (KSkill::GetDesc): describeSkill(skill, cấp, cấp tối đa)
             magicdesc.gen.ts  SINH TỰ ĐỘNG — câu gốc của settings/magicdesc.ini, lưu phái, giới hạn vũ khí / ngựa
             tuning.ts     hằng số cân bằng chung (sát thương vũ khí giả định, PvP, chí mạng…)
engine/      SkillEngine.ts  ra chiêu, bố trí đạn (MisslesForm), thời điểm sinh đạn (MslsGenerate), cách bay
                             (MoveKind), va chạm, sát thương vùng, nổ, sự kiện con (start/fly/collide/vanish), trạng thái
             ai.ts           chooseSkill(): quái / boss / bot chọn chiêu
             types.ts        Combatant (đối tượng dùng chiêu) + EnginePort (thế giới cung cấp cho bộ máy)
factions/<phái>/  skills.gen.ts  SINH TỰ ĐỘNG — chiêu của phái (kể cả chiêu con) + mốc học (LEARN, có tầng Thất truyền)
                                 11 phái; huashan = Hoa Sơn (tên Hán Việt: apps/client/tools/data/huashan.ts)
                  tuning.ts      chỉnh tay cho phái này (gen:skills không ghi đè)
                  index.ts       gói SkillPack của phái
common/      đánh thường (1, 2, 53…), 3 kỹ năng mọi phái học (210 Khinh công, 397 Vũ Lộ Xuân Phong, 400 Kiếp Phú Tế Bần)
             + missiles.gen.ts (mọi loại đạn, id gốc trong missles.txt)
monsters/    chiêu chỉ quái dùng (Ném lông 197, Ném đá 196)
index.ts     đăng ký mọi gói
```

## Sinh lại từ client gốc

`npm run gen:skills -w @vltk/client` ghi đè mọi `*.gen.ts` và `apps/client/src/game/fx/fx.gen.ts`, chuyển hiệu ứng /
icon sang `apps/client/public/assets/skill/`. Không sửa tay file `.gen.ts`; chỉnh ở `tuning.ts`:

```ts
// factions/tianwang/tuning.ts
export const TUNING: Record<number, SkillTuning> = {
  29: { damage: 1.2 },                 // Trảm Long Quyết mạnh thêm 20%
  1060: { cooldownMs: 3000 },          // Bá Vương Tạm Kim hồi 3 giây
  40: { disabled: 'Đang bảo trì' },    // tắt hẳn
};
```

## Gắn kỹ năng cho đối tượng khác

```ts
// Quái / boss (monsters/monsters.ts): [id, cấp] — mượn được chiêu của bất kỳ phái nào
31: { name: 'Kim Miêu Vương', skills: [[197, 10], [322, 8], [80, 10]], … }

// Người chơi: apps/server/src/world/players.ts addPlayer nạp learnableSkills(phái) (+ đánh thường 1), cấp lưu trong nhân vật
// Bot: apps/server/src/dev/bots.ts lọc learnableSkills(phái) theo vũ khí đang cầm
// Nơi khác (client, test): new SkillEngine(port) với một EnginePort — xem apps/client/src/dev/skill-lab/SkillLabScene.ts
```

Thêm phái/chiêu mới: thêm vào bảng gốc (hoặc danh sách `FACTIONS` trong `tools/gen-skills.ts`), chạy `gen:skills`,
đăng ký gói trong `index.ts`.
