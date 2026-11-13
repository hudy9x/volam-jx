# Cấu trúc lại codebase — đề xuất

> 2026-11-12 · **Đã làm** (người dùng: "triển khai theo hướng của bạn"), bước 1–6; bước 7 (tách `tools/`) chưa làm.
> Cấu trúc thật và các chỗ làm khác đề xuất: **`docs/architecture.md`** (mục 8). File này giữ lại làm lịch sử lý do.
> Nền tảng mục tiêu Web + Desktop + Mobile (`AGENTS.md` §1). Phân tích giao diện: `docs/ui-and-platforms.md`.

## 1. Hiện trạng

| Chỗ | Vấn đề |
|---|---|
| `apps/server/src/game/World.ts` (805 dòng) | Một class làm hết: người chơi, lệnh, hành trang, sinh quái, AI quái, sát thương, trạng thái, di chuyển, hoạt ảnh, đồng bộ schema |
| `apps/client/src/ui/hud.ts` (601 dòng) + `index.html` + `style.css` | Xem `docs/ui-and-platforms.md` §3 |
| `apps/client/src/game/` | Lẫn cảnh Phaser, hình hiệu ứng, tự động đánh, NPC trong thành, công cụ dev (skill lab, gallery) |
| NPC trong thành (`apps/client/src/game/npcs.ts`) | Chỉ có ở client; server không biết NPC đứng đâu |
| `packages/shared/src/data/` | Gom theo loại (data) chứ không theo chủ đề; logic quái (`monsterAt`), trang bị (`equipError`, `lookOf`) nằm chung bảng |
| Từ "hiệu ứng" | Chỉ 2 thứ khác nhau: trạng thái gameplay (bùa, choáng, độc) và hình hiệu ứng (sprite chiêu, số sát thương) |
| `apps/client/tools/` | Nằm trong client nhưng ghi cả vào shared (`*.gen.ts`, `spawns/`) |

Giữ nguyên vì đã tốt: `packages/shared/src/skills/` (core / engine / factions / common / monsters, `tuning.ts` cạnh `*.gen.ts`),
shared thuần TS, server quyết định mọi thứ, `EnginePort`, `ui/dialog.ts`, `HudActions`.

## 2. Nguyên tắc

1. **Chia theo chủ đề, không theo loại file.** Mọi thứ về quái ở một chỗ. Áp khuôn của `skills/` cho mọi chủ đề: `*.gen.ts`
   (tool ghi) + file chỉnh tay đặt cạnh nhau.
2. **Phụ thuộc một chiều:** `shared` ← `server`; `shared` ← `client`. Shared không biết Phaser / Colyseus / DOM (như hiện nay).
3. **Trong client:** `game/` (Phaser) và `ui/` (HTML) không import nhau; cả hai đọc `state/` và gửi lệnh qua `input/`.
   Chỉ `net/` chạm vào Colyseus Room.
4. **Một kiểu đối tượng chiến đấu:** người chơi, bot, quái, boss, cọc gỗ khác nhau ở dữ liệu và phần gắn thêm (hành trang, AI,
   kịch bản boss), không phải nhánh code riêng. Boss = quái có `boss: true` + (khi cần) kịch bản riêng.
5. **Đồ dev tách riêng** (`dev/`), không lẫn giao diện người chơi; bản build chính thức bỏ được.
6. **Phần riêng nền tảng** gom vào `apps/client/src/platform/` và các vỏ `apps/desktop`, `apps/mobile` (khi làm).

## 3. Từ vựng (tên thư mục)

| Tiếng Việt | Trong code | Thư mục |
|---|---|---|
| Nhân vật người chơi, phái, ngoại hình, (sau: cấp, điểm tiềm năng, chỉ số) | `character`, `faction` | shared `characters/` |
| Quái, boss, cọc gỗ | `monster` (+ `boss`) | shared `monsters/`, server `world/ai/` |
| NPC (Thợ rèn, Xa phu, Bán ngựa…) | `npc` | shared `npcs/` |
| Kỹ năng, đạn | `skill`, `missile` | shared `skills/` (giữ nguyên) |
| **Trạng thái**: bùa lợi, bùa hại, choáng, chậm, độc | `status` (tên trường hiện tại `states` giữ được) | shared `status/`, server `world/systems/status.ts` |
| **Hình hiệu ứng**: sprite chiêu, số sát thương, hình trạng thái trên người | `fx` | client `game/fx/` |
| Sát thương, trúng/né, chí mạng, ai đánh được ai | `combat` | shared `combat/` |
| Vật phẩm, trang bị, ngựa | `item`, `horse` | shared `items/` |
| Bản đồ, cổng, lưới đi, quái theo bản đồ | `map`, `nav`, `spawn` | shared `maps/` |

## 4. Cây thư mục đề xuất

### `packages/shared/src` — luật + dữ liệu (chạy ở cả server và client)

```
protocol.ts        lệnh C2S / S2C, FxEvent (tách thư mục khi lớn)
geometry.ts
characters/        factions.ts · look.ts (lookOf: trang bị → hàng paper-doll)
                   sau: level.ts, potential.ts, stats.ts (docs/combat-formulas.md §1–§2)
monsters/          monsters.gen.ts · monsters.ts (chỉnh tay, boss, cọc gỗ) · scaling.ts (monsterAt, monsterHp, monsterDamage)
npcs/              towns.ts — NPC trong thành (chuyển từ client để server kiểm tra được)
skills/            giữ nguyên core/ engine/ factions/<phái>/ common/ monsters/
status/            định nghĩa trạng thái (loại, thời lượng, cộng dồn); sau: tác dụng choáng / chậm / độc
combat/            rules.ts (canAttack, từ combat.ts) · damage.ts (từ skills/engine/damage.ts + DAMAGE_MODE ngẫu nhiên)
                   sau: hit.ts (trúng/né, chí mạng), resist.ts
items/             items.gen.ts · items.ts · horses.gen.ts · horses.ts · equip.ts (equipError, weaponTypeOf)
maps/              catalog.gen.ts · index.ts · types.ts · spawns.ts · nav/ (grid, pathfinding)
index.ts
```

`packages/shared/spawns/*.json` giữ nguyên chỗ (dữ liệu, không phải mã).

### `apps/server/src` — mô phỏng có thẩm quyền

```
index.ts
net/               MapRoom.ts (mỏng: kiểm tra tin nhắn → gọi lệnh) · schema.ts (Actor, MapState)
account/           auth.ts · db.ts (sau: PostgreSQL)
world/
  World.ts         danh sách đối tượng + thứ tự tick, gọi các hệ bên dưới
  entity.ts        Sim: phần chung (vị trí, máu, kỹ năng, trạng thái) + phần gắn thêm (người chơi: hành trang, lệnh chờ;
                   quái: slot sinh, AI)
  commands.ts      lệnh người chơi: đi, ra chiêu, khóa mục tiêu, PK, ngựa, hồi sinh, chuyển map
  inventory.ts     mặc / tháo / mua / vứt, cộng chỉ số trang bị
  systems/
    movement.ts    A*, đi theo đường, hướng mặt
    combat.ts      nhận đòn từ SkillEngine: trừ máu, hồi máu, chết, lướt / dịch chuyển (dash, blink)
    status.ts      thêm / bỏ / hết hạn trạng thái (sau: tác dụng)
    spawner.ts     slot quái từ spawns/*.json, hồi sinh, nạp lại khi công cụ dev lưu
    portals.ts     cổng chuyển bản đồ
    anim.ts        hoạt ảnh một lần / lặp
    sync.ts        Sim → schema Actor (chỉ ghi khi đổi)
  ai/
    monster.ts     quái thường: thấy → đuổi → đánh → về (leash)
    boss.ts        hành vi chung của boss (sau: giai đoạn theo % máu, gọi đệ tử…)
    bosses/        kịch bản riêng từng boss, khi cần
dev/               devtools.ts (API lưu spawn) · bots.ts
```

### `apps/client/src` — vẽ, giao diện, nhập liệu

```
main.ts            chỉ khởi động app/
app/               luồng màn hình: đăng nhập → chọn nhân vật → tải → vào game; route dev (?skills, ?gallery)
net/               api.ts (HTTP) · room.ts (mọi onMessage / send) → ghi vào state/
state/             trạng thái phía client: phiên, bản thân, hành trang, kỹ năng + thanh phím, settings, auto, bản đồ
input/             intents.ts (đi tới, ra chiêu ô X, khóa mục tiêu, mở cửa sổ…) · keymap.ts (bảng phím duy nhất)
                   keyboard.ts · pointer.ts · touch.ts (mobile) · auto/ (AutoPlay = một nguồn lệnh như bàn phím)
platform/          web / desktop / mobile: lưu trữ, toàn màn hình, xoay ngang, vùng tai thỏ
game/              Phaser
  WorldScene.ts · boot.ts · display.ts
  actors/          ActorView.ts · nameplate.ts (tên + máu trên đầu) · jx/ (ghép nhân vật gốc)
  fx/              Effects.ts (fx từ server) · SkillFx.ts · floating.ts (số sát thương) · StateDecor.ts · fx.gen.ts
  map/             MapView.ts · portals.ts
  audio/           Audio.ts · fxSounds.ts · sounds.gen.ts
ui/
  kit/             dialog.ts · tooltip.ts · slot.ts · tabs.ts · cursors.ts (+ .gen) · theme.css (màu, khung ngọc, nút đá)
  layouts/         desktop.ts · mobile.ts (thành phần nào đặt ở đâu)
  screens/         login/ · characters/ · loading/
  hud/             vitals/ · status/ · minimap/ · quickbar/ · notices/
  windows/         inventory/ · skills/ · bigmap/ · travel/ · shop/ · horse-shop/ · npc-talk/ · system/ · settings/ · auto/ · death/
dev/               skill-lab/ · gallery/ · map-viewer/ (maptest) · spawn-editor/
```

Mỗi `ui/windows/<x>/` = `<x>.ts` (tự tạo HTML) + `<x>.css`. `index.html` chỉ còn `#game` và chỗ gắn giao diện.

### Sau này (không gấp)

```
tools/             workspace riêng: gen-*.ts, jx/ (PAK, SPR, Lua, TCVN3), data/ (bảng dịch tay) — đổi lệnh npm -w
apps/desktop/      vỏ Electron hoặc Tauri
apps/mobile/       vỏ Capacitor hoặc Tauri 2
```

## 5. Một chủ đề đi qua các tầng

**Quái / boss**

| Tầng | File | Việc |
|---|---|---|
| shared | `monsters/monsters.gen.ts` | bảng gốc `npcs.txt` (tool ghi) |
| shared | `monsters/monsters.ts`, `scaling.ts` | chỉnh tay, boss; máu / sát thương theo cấp |
| shared | `maps/spawns.ts` + `spawns/<map>.json` | quái nào ở đâu, cấp mấy |
| server | `world/systems/spawner.ts` | sinh, hồi sinh |
| server | `world/ai/monster.ts`, `boss.ts`, `bosses/` | hành vi |
| client | `game/actors/ActorView.ts` | vẽ |
| client | `dev/spawn-editor/` | công cụ đặt quái |

**Kỹ năng:** shared `skills/` (dữ liệu + `SkillEngine`) → server `World` cấp `EnginePort` → `FxEvent` → client `game/fx/`.

**Trạng thái:** shared `status/` (định nghĩa) → server `systems/status.ts` → schema `Actor.states` → client `game/fx/StateDecor.ts`
(hình trên người) + `ui/hud/status/` (icon).

## 6. Thứ tự làm

Mỗi bước không đổi hành vi; kiểm tra xong mới sang bước sau; mỗi bước một commit (khi người dùng bảo commit).

1. **Shared:** chia `data/` và `combat.ts` theo chủ đề; sửa đường ghi của `gen-assets.ts`, `gen-skills.ts`, `gen-spawns.ts`.
   Kiểm: `typecheck`, chạy thử tool gen ghi đúng chỗ mới.
2. **Server:** tách `World.ts` thành `entity` / `commands` / `inventory` / `systems/` / `ai/`; `MapRoom` mỏng.
   Kiểm: `typecheck`, `bots 4 60`, chơi thử bằng Playwright trên cổng 2568 / 5174.
3. **Client tầng dưới:** `net/`, `state/`, `input/` (keymap, intents, AutoPlay) — chưa đụng giao diện.
4. **Client giao diện:** tách `hud.ts` thành `hud/` + `windows/`; HTML ra khỏi `index.html`; CSS theo thành phần + `kit/`.
   Giữ y hình (so ảnh chụp trước / sau).
5. **`dev/`:** gom skill lab, gallery, maptest, spawn editor, nút dev.
6. **Tài liệu:** `docs/architecture.md` (cây + luật phụ thuộc), cập nhật `AGENTS.md` §4, README, `skills/README.md`;
   có thể thêm kiểm tra tự động luật import.
7. (Tùy chọn) `tools/` thành workspace riêng.

## 7. Chờ người dùng quyết

1. Duyệt cây thư mục, hoặc sửa chỗ nào.
2. Thứ tự: 1 → 2 → 3 → 4 (đề xuất), hay làm client trước.
3. Commit các file tài liệu đang chưa commit (`AGENTS.md`, `CLAUDE.md`, `tasks/`, `docs/…`, `README.md`) trước khi cấu trúc lại,
   để có mốc sạch và `git mv` giữ lịch sử.
4. Có chuyển `tools/` ra workspace riêng không.
