# Kiến trúc mã nguồn

> Cập nhật 2026-11-12, sau khi cấu trúc lại theo `docs/restructure-plan.md` (người dùng duyệt "triển khai theo hướng của bạn").
> Lý do chọn HTML/CSS cho giao diện và yêu cầu Web + Desktop + Mobile: `docs/ui-and-platforms.md`.
> Mục 8 ghi chỗ làm khác với đề xuất ban đầu.

## 1. Ba gói, phụ thuộc một chiều

```
packages/shared   luật + dữ liệu, TS thuần (không Phaser / Colyseus / DOM), chạy ở cả server và client
      ▲    ▲
      │    └── apps/client   vẽ (Phaser), giao diện (HTML), nhập liệu, mạng phía client
      └─────── apps/server   mô phỏng có thẩm quyền (Colyseus, 20 tick/giây), tài khoản
```

Mỗi thư mục chia **theo chủ đề**. Dữ liệu sinh từ client gốc (`*.gen.ts`, do tool ghi) nằm cạnh file chỉnh tay cùng chủ đề,
giống khuôn `skills/factions/<phái>/{skills.gen.ts, tuning.ts}`.

## 2. `packages/shared/src`

```
index.ts          xuất mọi chủ đề (mỗi thư mục có index.ts riêng)
protocol.ts       lệnh C2S / S2C, FxEvent, kiểu tin nhắn
geometry.ts       khoảng cách isometric, hướng, bước đi, mulberry32
formulas/         công thức trò chơi (docs/formulas/): tuning.ts (điểm xuất hằng số; EFFECTS ở effects/tuning.ts) · attrs.ts (túi thuộc tính) · character.ts (chỉ số)
                  · level.ts (exp, chia exp) · monster.ts (đường cong quái) · combat.ts (CombatStats) · damage.ts · effects.ts (điểm gọi) · effects/ (công thức từng hiệu ứng + tuning) · speed.ts · drops.ts
drops/            drops.gen.ts (bảng rơi gốc, gen:drops)
characters/       factions.ts (11 phái, hệ) · player.gen.ts (bảng nhân vật gốc, gen:player) · progression.ts (hệ, cấp, điểm, vào phái)
                  · player.ts (PLAYER_SPEED) · look.ts (lookOf: trang bị → paper-doll)
                  · starter.ts (đồ khởi đầu)            sau: level, điểm tiềm năng, chỉ số dẫn xuất
monsters/         monsters.gen.ts (npcs.txt) · monsters.ts (chỉnh tay, boss, cọc gỗ) · scaling.ts (máu / sát thương theo cấp)
npcs/             towns.ts — NPC trong thành (Thợ rèn, Chủ dược điếm, Xa phu, Bán ngựa): vị trí, lời thoại
items/            items.gen.ts (trang bị, mặt nạ, thuốc, danh sách hiệu thuốc gốc) · items.ts (ô, loại, `Item`) · equip.ts
                  (equipError, equipBonus) · potions.ts (thuốc: nhịp bơm) · shops.ts (tiền, giá bán, hàng từng NPC)
                  · describe.ts (tooltip) · horses.gen.ts · horses.ts (tốc độ ngựa) · bag.ts (hành trang lưới 6 × 10)
                  · magic.ts (ngũ hành, dòng xanh / ẩn, Chế tạo) · magicattrib.gen.ts (`gen:magic`)
skills/           kỹ năng (README.md riêng): core/ engine/ (SkillEngine, damage.ts, ai.ts) factions/<phái>/ common/ monsters/
status/           states.ts — trạng thái (bùa lợi / bùa hại): StateApply, thêm / làm mới / hết hạn. Sau: choáng, chậm, độc
combat/           rules.ts (canAttack: ai đánh được ai)  sau: trúng/né, chí mạng, kháng theo chỉ số (combat-formulas §2–§6)
maps/             catalog.gen.ts · index.ts (MAPS, lưới) · types.ts · spawns.ts (file quái) · nav/ (lưới đi, A*)
```

`packages/shared/spawns/<map>.json`: quái theo bản đồ (dữ liệu, không phải mã).

## 3. `apps/server/src`

```
index.ts          khởi động Colyseus + express, nạp lưới bản đồ và file quái
env.ts            cấu hình từ .env ở một chỗ (PORT, MAPS_DIR, SPAWNS_DIR, PERF, devTools())
net/              MapRoom.ts (mỗi map một room: kiểm tra tin nhắn → gọi world/, lưu nhân vật) · schema.ts (Actor, MapState)
account/          auth.ts (đăng ký / đăng nhập, token) · db.ts (data/db.json)
world/
  World.ts        giữ trạng thái chung + thứ tự tick; nối SkillEngine (EnginePort) với các hệ bên dưới
  entity.ts       Sim — người chơi, quái, boss, cọc gỗ là cùng một kiểu, khác dữ liệu và phần gắn thêm
  players.ts      vào map, hồi sinh, hồi máu, thực hiện lệnh đang chờ (đi vào tầm → ra chiêu, khóa mục tiêu)
  commands.ts     lệnh người chơi: đi, ra chiêu, PK, ngựa, đổi cấp chiêu (dev)
  inventory.ts    mặc / tháo / mua / bán / dùng / vứt, tiền túi, cộng chỉ số trang bị
  progress.ts     chỉ số (formulas), exp + lên cấp, điểm tiềm năng, vào phái, mở / cộng điểm / thục luyện kỹ năng
  targeting.ts    attackable (luật shared + cọc gỗ), tìm địch gần nhất
  systems/        movement (đường đi, A* theo ngân sách) · combat (trúng đòn, hồi máu, chết, lướt / dịch chuyển)
                  · jump (Khinh công: bay, khóa lệnh, không nhận sát thương khi đang bay) · potions (thuốc bơm theo nhịp)
                  · effects (chỉ số chiến đấu quái, choáng / chậm / độc / co giật, tốc chạy / tốc ra chiêu) · drops (vật rơi, nhặt)
                  · status (bùa) · spawner (sinh / hồi sinh quái) · portals · anim · sync (Sim → Actor, chỉ ghi khi đổi)
  ai/             monster.ts (thấy → đuổi → đánh → về) · boss.ts (khác biệt của boss; kịch bản riêng: ai/bosses/<tên>.ts khi cần)
dev/              devtools.ts (API lưu khu quái) · botAdmin.ts (API bot `/api/dev/bots`); UI/runner độc lập ở tools/bots/
```

## 4. `apps/client/src`

```
main.ts           nạp ui/kit/theme.css rồi app/
app/App.ts        luồng màn hình: đăng nhập → chọn nhân vật → đang tải → vào game; vào room, chuyển map, rời game;
                  route dev (?skills, ?gallery) và công cụ dev — nạp động, bản build chính thức không chứa dev/
net/              api.ts (HTTP: tài khoản, nhân vật, dev; phiên đăng nhập) · room.ts (joinMap; tin nhắn về bản thân → state/)
state/            dùng chung cho game và giao diện: settings.ts (Tùy chỉnh) · actor.ts (ActorState) · inventory.ts (+ tiền)
                  · skillbar.ts (cấp chiêu, chiêu / thuốc trên thanh phím, vũ khí, hồi chiêu) · trade.ts (cửa hàng NPC đang mở,
                  Mua / Bán) · store.ts (Store<T> có watch)
input/            keymap.ts (bảng phím duy nhất); tự động đánh = shared `auto/AutoPlay.ts` (một nguồn lệnh như chuột / phím, cũng là bộ não bot)
platform/         storage.ts (localStorage có try/catch; thay bằng kho native khi đóng gói Desktop / Mobile) · assetCache.ts
                  viewport.ts (2preset, render2×, layout fit và thông báo đổi khung dùng chung game/UI)
                  (đăng ký + nói chuyện với Service Worker, chỉ bản build web) · sw/ (sw.ts → /sw.js, tsconfig riêng lib WebWorker)
art/              tra cứu hình gốc dùng chung: jx/ (paper-doll, sheet, data.gen.ts) · icons.ts · cursors.ts (+ .gen) ·
                  assets.ts (**assetUrl()**: mọi URL tới public/assets đi qua đây, gắn `?v=` theo manifest — đừng ghép chuỗi 'assets/…')
game/             Phaser
  index.ts        tạo game, startWorld / stopWorld, addScene (dev)
  ports.ts        HỢP ĐỒNG với giao diện: WorldUi (cảnh cần gì từ giao diện), WorldActions (lệnh giao diện gửi), WindowId
  WorldScene.ts   bản đồ đang chơi: actor, hiệu ứng, chuột / phím → lệnh server, cấp dữ liệu cho WorldUi
  actors/         ActorView (culling theo bounds; ngoài khung vẫn chạy đồng hồ, ẩn sprite/tên/máu/decor) · PaperDoll · sheets (nạp texture) · npcs (NPC thành actor)
  fx/             Effects (fx từ server, số sát thương) · SkillFx · StateDecor (hình trạng thái trên người) · controlEffects (cấu hình/hàm thuần hình khống chế) · fx.gen.ts
  map/            MapView (streaming theo vùng; culling ground/object độc lập với vùng lưu giữ)
  audio/          Audio · fxSounds · sounds.gen.ts
ui/               giao diện HTML (bố cục desktop)
  kit/            theme.css · dialog.ts (+css: mọi cửa sổ) · tooltip.ts (+css) · dom.ts · slot.ts · settingInputs.ts
                  · money.ts (+css: tiền túi kiểu gốc)
  tips/           nội dung tooltip: itemTip.ts · skillTip.ts
  screens/        login · characters · loading (+ screens.css)
  hud/            Hud.ts (ghép mọi phần, implements WorldUi) · context.ts · vitals · status · minimap · quickbar · notices
  windows/        inventory · skills · bigmap · travel · shop (Thợ rèn + Chủ dược điếm) · tradeConfirm (Mua vào / Bán ra)
                  · horseShop · npcTalk · system · settings · auto · death
                  (mỗi cái một cặp .ts + .css; HTML nằm trong .ts, giữ nguyên id cũ)
dev/              index.ts · skill-lab/ (?skills) · gallery/ (?gallery) · map-viewer/ (maptest.html) · spawn-editor/
```

`index.html` chỉ còn `#game` (canvas) và `#ui` (giao diện do `app/` dựng). `apps/client/tools/` = tool sinh dữ liệu (`gen:*`).

## 5. Luật phụ thuộc trong client

| Thư mục | Được import |
|---|---|
| `app/` | mọi thứ (nơi nối các phần) |
| `ui/` | `state/`, `input/keymap`, `art/`, `platform/`, shared, và **chỉ kiểu** từ `game/ports.ts` |
| `game/` | `state/`, `input/`, `art/`, `platform/`, shared — **không** `ui/`, `net/`, `dev/`, `app/` |
| `input/` | `state/`, shared |
| `net/` | `state/`, `platform/`, shared |
| `state/` | `platform/`, shared |
| `art/`, `platform/` | shared |
| `dev/` | mọi thứ (chỉ chạy ở `npm run dev`, nạp động) |

Kiểm tra nhanh (không ra dòng nào là đúng):

```sh
cd apps/client/src
grep -rnE "from '(\.\./)+(ui|dev|app|net)/" game
grep -rnE "from '(\.\./)+(game|dev|app|net)(/|')" ui | grep -v "game/ports'"
grep -rnE "from '(\.\./)+(game|ui|dev|app|net|input)/" state
```

Server: `net/` → `world/` → shared; `world/` không import `net/` ngoài kiểu `Actor` / lớp schema.

## 6. Một chủ đề qua các tầng

| Chủ đề | shared | server | client |
|---|---|---|---|
| Quái / boss | `monsters/` (bảng, chỉnh tay, theo cấp), `maps/spawns.ts` | `systems/spawner.ts`, `ai/monster.ts`, `ai/boss.ts` | `game/actors/ActorView.ts`, `dev/spawn-editor/` |
| Kỹ năng | `skills/` (dữ liệu + SkillEngine) | `World.ts` cấp EnginePort, `systems/combat.ts` | `state/skillbar.ts`, `game/fx/`, `ui/windows/skills.ts`, `ui/hud/quickbar.ts` |
| Trạng thái (bùa…) | `status/` | `systems/status.ts`, `sync.ts` → `Actor.states` | `game/fx/StateDecor.ts` (trên người), `ui/hud/status.ts` (icon) |
| Hình hiệu ứng | `protocol.ts` FxEvent | `events` trong World | `game/fx/` |
| Hành trang | `items/` (`items.ts` bảng + `Item` món cụ thể, `bag.ts` lưới 6 × 10 theo cỡ, `equip.ts` luật mặc, `describe.ts` tooltip + `TIP_COLORS`) | `world/inventory.ts` (tạo món, đặt theo lưới, `moveBagItem`, chuyển dữ liệu cũ + `bagSpill`), `net/MapRoom.ts` gửi `S2C.inventory` | `net/room.ts` → `state/inventory.ts` → `ui/windows/inventory.ts` (hành trang), `ui/windows/character.ts` (Trang bị và Thuộc tính: ô mặc + thuộc tính, phím N), `ui/tips/itemTip.ts`, `ui/kit/slot.ts` (nền / viền ô) |
| Đồ xanh, dòng ẩn, Chế tạo | `items/magic.ts` (ngũ hành, `activeHidden`, `forgeChoices` / `forgeError` / `forgePrice`), `items/magicattrib.gen.ts` (`gen:magic`) | `world/inventory.ts` `forgeItem` (`C2S.forge`) | `ui/windows/forge.ts` (nút Chế tạo ở `shop.ts`) |
| Tiền, cửa hàng NPC | `items/shops.ts` (`START_MONEY`, `sellPrice`, `SHOP_ITEMS`), `InventoryMsg.money` | `world/inventory.ts` (`buyItem` / `sellItem`, chỉ trong thành), `Sim.money` lưu vào `db.json` | `state/trade.ts` (cửa hàng đang mở, Mua / Bán), `ui/windows/shop.ts`, `tradeConfirm.ts` (hộp Mua vào / Bán ra), `horseShop.ts`, `ui/kit/money.ts` |
| Cấp, tiềm năng, kỹ năng | `formulas/` (`characterStats`, `addExp`, `expShare`), `characters/progression.ts`, `skills/core/learning.ts` | `world/progress.ts`, `S2C.stats` | `state/progress.ts`, `ui/windows/character.ts` (phím N), `ui/windows/skills.ts` (điểm, vào phái) |
| Thuốc | `items/potions.ts` (`potionPumps`, `POTION_PULSE_MS`) | `world/inventory.ts` `useItem` → `systems/potions.ts` | phím 1–9 (`state/skillbar.ts` `itemAt`), `ui/hud/quickbar.ts`, bấm / chuột phải trong hành trang, shared `auto/AutoPlay.ts` (tự uống) |
| NPC trong thành | `npcs/towns.ts` | (chưa kiểm tra khoảng cách tới NPC) | `game/actors/npcs.ts`, `ui/windows/npcTalk.ts` |
| Nhân vật | `characters/` | `world/players.ts` | `ui/hud/vitals.ts` |
| Bóng đổ | — | — | `gen:assets` (bảng `主角动作阴影对应表.txt`, `<thân>b.spr`) → `art/jx` (`JX_SHADOWS`, `NPC_SHADOWS`, `Pose.shadow`) → `game/actors/PaperDoll.ts` (lớp dưới cùng); `docs/shadows.md` |
| Khinh công (nhảy) | `characters/jump.ts` (tốc độ, tầm, độ cao), `SkillEngine` (form 9) | `systems/jump.ts`, `Actor.jumpMs` | `game/actors/ActorView.ts` (động tác `jump`, nâng thân theo parabol) |

## 7. Việc thường gặp

- **Cửa sổ mới:** `ui/windows/<tên>.ts` (HTML trong file, `dialogs.register(id)`) + `<tên>.css`; tạo trong constructor của
  `ui/hud/Hud.ts` (đúng thứ tự vẽ). Nếu game cần mở nó (phím, NPC): thêm vào `WindowId` (`game/ports.ts`) và `Hud.toggleWindow`.
- **Phím tắt mới:** thêm vào `KEYS` trong `input/keymap.ts`, gắn trong `WorldScene.setupInput`; danh sách ở Tùy chỉnh tự cập nhật.
- **Lệnh mới từ giao diện lên server:** `C2S` trong `shared/protocol.ts` → xử lý ở `server/net/MapRoom.ts` (lệnh đổi hành trang:
  `inventoryOp(type, (sim, msg) => …)`, lệnh tiến trình: `progressOp`) → logic trong `server/world/` (commands / inventory…); phía
  client thêm vào `WorldActions` (`game/ports.ts`) và `WorldScene.makeActions()` (Auto dùng lại cùng các lệnh đó).
- **Boss có hành vi riêng:** `server/world/ai/bosses/<tên>.ts`, gọi từ `ai/boss.ts`. Số liệu boss vẫn ở `shared/monsters/`.
- **Trạng thái có tác dụng** (choáng, chậm, độc): luật ở `shared/status/`, áp lên Sim ở `server/world/systems/status.ts`.
- **Dữ liệu mới từ client gốc:** tool `gen:*` ghi `*.gen.ts` vào thư mục chủ đề; chỉnh tay ở file cạnh nó.
- **Bố cục mobile (sau này):** `ui/layouts/` + `input/touch.ts`; giao diện mobile chỉ cần implements `WorldUi`, game không đổi.

## 8. Khác với đề xuất ban đầu (`docs/restructure-plan.md`)

- `skills/engine/damage.ts` giữ nguyên chỗ (gắn chặt với dữ liệu chiêu). `combat/` mới có `rules.ts`; công thức theo chỉ số nhân vật sẽ đặt ở đây.
- Thư mục Phaser giữ tên `game/` (không đổi thành `world/`).
- Màn hình / cửa sổ / phần HUD là **cặp file phẳng** `<tên>.ts` + `<tên>.css` thay vì mỗi cái một thư mục.
- Thêm `art/` (tra cứu hình gốc dùng chung game + ui) và `ui/tips/` (nội dung tooltip).
- Chưa tạo thư mục rỗng: `ui/layouts/`, `input/touch.ts`, `server/world/ai/bosses/` — tạo khi có nội dung.
- Cờ bật / tắt Auto vẫn ở `Hud` (qua `WorldUi.auto / setAuto / onAuto`), chưa chuyển thành `state/`.
- `tools/` chưa tách workspace riêng (tùy chọn, mục 7 của đề xuất).


Công cụ bot độc lập: `tools/bots/{server.ts,ConfigStore.ts,RunManager.ts,ui/,run.ts,runner/,data/}`. UI chạy cổng4568 qua `npm run bots:ui`, không HMR theo game. Cấu hình đọc/lưu ở app riêng, API tạo/cập nhật/đăng nhập nhân vật vẫn qua `dev/botAdmin.ts`; luật trong shared/bots. [Hướng dẫn](../tools/bots/README.md).
