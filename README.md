# Võ Lâm Online — prototype (Phaser + Colyseus)

Prototype MMORPG 2D kiểu VLTK 1, viết lại từ đầu. Hình ảnh (nhân vật, trang phục, quái, NPC, icon, bản đồ) lấy
từ client gốc `../jx-origin/data_extract` ở **độ phân giải gốc 1:1**; gameplay tham khảo `../jx-web-main`.

Phạm vi hiện có: tạo tài khoản → tạo nhân vật (10 môn phái, giới hạn giới tính) → vào thành Biện Kinh →
đi qua cổng sang Dược Vương Cốc → đánh quái (spawn, AI, hồi sinh) → bật PK đánh người chơi khác →
trọng thương → về thành hồi sinh. Nhân vật ghép từng lớp như JX1 theo trang bị đang mặc (toàn bộ áo, mũ, vũ khí
cấp 1–10 của nam và nữ), hành trang 60 ô + 10 ô trang bị, Thợ rèn bán đồ miễn phí, Xa phu / nút **Chuyển map**,
ngựa Phiêu Vũ, minimap + bản đồ lớn. Toàn bộ ~300 bản đồ của client gốc dựng lại từ dữ liệu vùng (Biện Kinh
37376×26112 px…); Biện Kinh và Dược Vương Cốc có cổng, quái, NPC, các bản đồ còn lại để đi thăm qua Xa phu.
Kỹ năng của cả 11 phái (10 phái + Hoa Sơn của bản mod), kỹ năng thất truyền mỗi phái và 3 kỹ năng chung (Khinh công, Vũ Lộ
Xuân Phong, Kiếp Phú Tế Bần) nạp thẳng từ bảng gốc (cấp 1–20, hiệu ứng gốc 1:1), chia 5 loại: tấn công, hỗ trợ, bùa lợi
(gồm hào quang), bùa hại, bị động; người chơi, bot, quái, boss dùng chung một bộ máy ra chiêu. Tạm thời sát thương là
số ngẫu nhiên và bùa lợi / bùa hại chỉ được ghi nhận (hiện trên người và trên HUD), chưa có tác dụng. Cạnh điểm đến
Dược Vương Cốc có 3 cọc gỗ để thử chiêu.

## Chạy

Yêu cầu Node.js 22+.

**Map Creator:** `npm run map:creator` → http://localhost:4569. Upload ground/world, kéo thả và chỉnh collider, lưu/mở project, xuất bộ map. Chạy độc lập game; chưa đăng ký map vào game. [Hướng dẫn](tools/map-creator/README.md).

**Map Manager:** `npm run map:manager` → http://localhost:4570. Đặt NPC theo từng thành thị; Lưu ghi trực tiếp cấu hình nguồn game. [Hướng dẫn](tools/map-manager/README.md).

```sh
npm install          # .npmrc đã bật legacy-peer-deps (npm treo khi giải peer deps qua proxy)
cp apps/server/.env.example apps/server/.env   # cấu hình server (cổng, DB, AUTH_SECRET…); thiếu file thì dùng mặc định
npm run dev          # server :2567 + client :5173
```

`apps/server/.env` không vào git (có thể chứa `AUTH_SECRET`); các biến và giá trị mặc định ghi trong `apps/server/.env.example`.
Biến đặt sẵn ở shell được ưu tiên hơn file (vd. `PORT=2568 npm run dev -w @vltk/server`).

Mở http://localhost:5173. Muốn thử PK: mở thêm một tab ẩn danh (cùng trình duyệt sẽ dùng chung đăng nhập),
tạo tài khoản thứ hai, cả hai sang Dược Vương Cốc và bấm **P** (hoặc nút PK).

Dữ liệu tài khoản/nhân vật nằm ở `apps/server/data/db.json` (JSON, xoá file để reset).

### Điều khiển

| Thao tác | Tác dụng |
|---|---|
| Click / giữ chuột trái trên mặt đất | Di chuyển |
| Click chuột trái vào quái (hoặc người khi đang PK) | **Khóa mục tiêu**: đánh liên tục bằng chiêu ô **Chuột trái** (tự chạy lại gần) tới khi mục tiêu chết hoặc ra lệnh khác |
| Chuột phải | Chiêu ô **Chuột phải** tại con trỏ, một lần (chiêu hỗ trợ như Từ Hàng Phổ Độ: lên bản thân) |
| **Z** / Hệ thống → **Tự động đánh** | Mở cài đặt Auto; bấm Chạy/Dừng hoặc ▶/❚❚ cạnh bảng tên. Cài đặt và trạng thái lưu theo nhân vật, reload tự tiếp tục nếu đang bật |
| Phím **1**–**9** | Chiêu trên thanh tại con trỏ |
| **F** / nút **Kỹ năng** (thanh phím tắt) | Bảng kỹ năng dạng lưới: cột cấp 10 → 150, hàng là icon chiêu; rê chuột xem mô tả đầy đủ như bản gốc; kéo xuống ô 1–9 / T / P, Trái / Phải, − / + cấp (dev) |
| Click minimap | Chạy tới vị trí đó (tự tìm đường) |
| **I** / nút **Hành trang** | Trang bị (11 ô, có ô **Ngựa**) + hành trang 60 ô. Click đồ trong túi: mặc; click ô trang bị: tháo; chuột phải: vứt |
| Click **Thợ rèn** / nút **Cửa hàng** | Mua đồ cấp 1–10 giá 0 lượng (chỉ trong thành) |
| Click **Bán ngựa** | 54 loại ngựa gốc, giá 0 lượng; ngựa vào hành trang, mặc vào ô Ngựa |
| Click **Xa phu** / **T** / nút bản đồ thế giới trên minimap | Danh sách mọi bản đồ (ảnh thu nhỏ, tên, loại; tìm không dấu, lọc theo loại): click để đi |
| **Tab** / nút kính lúp trên minimap | Bản đồ lớn toàn cảnh; click để chạy tới đó (bản dev: nút **Quái (dev)** đặt khu quái) |
| Nút **–** / **+** trên minimap | Thu gọn / mở bản đồ nhỏ (cũng có trong Tùy chỉnh) |
| **M** / nút ngựa | Lên/xuống ngựa |
| **P** / nút PK | Bật/tắt PK (Đồ Sát) |
| **Esc** | Đóng cửa sổ trên cùng; không còn cửa sổ thì mở **Hệ thống** (Tùy chỉnh âm thanh, Chuyển nhân vật, Thoát game) |
| Kéo thanh tiêu đề cửa sổ | Di chuyển cửa sổ (click đúp để về chỗ cũ) |
| Lăn chuột | Zoom |

## Cấu trúc

Chi tiết từng file, luật phụ thuộc giữa các thư mục và cách thêm cửa sổ / phím / lệnh / boss: [docs/architecture.md](docs/architecture.md).

```
packages/shared/src/  TS thuần, dùng chung client + server (không Phaser/Colyseus/DOM) — chia theo chủ đề
  characters/         11 phái, ngoại hình (paper-doll), đồ khởi đầu        ← chỉnh số liệu ở các thư mục này
  monsters/           monsters.gen.ts (npcs.txt) + monsters.ts (chỉnh tay, boss, cọc gỗ) + scaling.ts (theo cấp)
  items/              items/horses.gen.ts (sinh tự động) + items.ts, equip.ts, horses.ts
  npcs/               NPC trong thành (Thợ rèn, Xa phu, Bán ngựa)
  skills/             kỹ năng — xem skills/README.md (factions/<phái>/ skills.gen.ts + tuning.ts; core/; engine/ SkillEngine)
  status/             trạng thái bùa lợi / bùa hại (ghi nhận; sau: choáng, chậm, độc)
  combat/             canAttack (luật PK); sau: công thức theo chỉ số
  maps/               MAPS (catalog.gen.ts + phần làm tay), spawns, nav/ (lưới đi lại + A*)
  protocol.ts         tên message, kiểu payload client ↔ server
apps/server/src/      Colyseus 0.18
  net/                MapRoom (mỗi map 1 room, filterBy mapId) + schema đồng bộ (Actor)
  world/              World.ts (thứ tự tick) + players, commands, inventory, targeting, systems/ (di chuyển, trúng đòn,
                      trạng thái, sinh quái, cổng…), ai/ (quái, boss)
  account/            đăng ký/đăng nhập (scrypt + token HMAC), lưu nhân vật (JSON)
  dev/                API công cụ dev + API bot (botAdmin.ts); runner nằm riêng tools/bots/
apps/client/src/      Phaser 4 + Vite
  app/                luồng màn hình (đăng nhập → chọn nhân vật → tải → vào game), chuyển map
  game/               Phaser: WorldScene, actors/ (sprite gốc, paper-doll), fx/ (hiệu ứng chiêu, số sát thương), map/, audio/;
                      ports.ts = hợp đồng với giao diện
  ui/                 giao diện HTML: kit/ (khung cửa sổ, tooltip, theme), screens/, hud/, windows/ (mỗi cửa sổ .ts + .css)
  state/ input/ net/  dữ liệu dùng chung (settings, hành trang, thanh kỹ năng) · phím tắt + tự động đánh · HTTP + room
  art/ platform/      tra cứu hình gốc (jx, icon, con trỏ) · lưu trữ thiết bị
  dev/                ?skills, ?gallery, maptest.html, công cụ đặt quái (không vào bản build chính thức)
apps/client/tools/    gen-*.ts: client gốc → asset + *.gen.ts; jx/ đọc data_extract, giải mã SPR, bảng Lua, TCVN3/GBK
apps/client/public/assets/  char/ (263 MB), npc/, items/, skill/ (33 MB), maps/<id>/ (đủ ~297 bản đồ ≈ 15 GB), ui/,
                      music/, portraits/ — sinh bằng tool (không phải mã nguồn)
docs/                 architecture.md (cấu trúc mã), skills-audit.md (sinh bởi audit:skills), regenerate-assets.md (dựng lại asset),
                      combat_effects_worked_examples.md, combat-formulas.md (công thức JX1, có nguồn),
                      ui-and-platforms.md (màn hình, HTML vs canvas, Web/Desktop/Mobile), restructure-plan.md,
                      shadows.md (bóng đổ nhân vật / quái / vật thể trong bản gốc, chưa làm),
                      equipment-gold-thientu.md (đồ hoàng kim môn phái + Thiên Tứ: tên, bộ, thuộc tính min–max; `tools/doc-gold.ts`)
```

### Cách dùng codebase này

**Gốc repo (npm workspaces: `packages/*`, `apps/*`)**

| Thư mục | Vai trò | Có trong git? |
|---|---|---|
| `packages/shared` | luật chơi + dữ liệu dùng chung (`@vltk/shared`), TS thuần | có |
| `apps/server` | Colyseus, mô phỏng 20 tick/giây, lưu tài khoản (`data/db.json`, bị `.gitignore`) | có |
| `apps/client` | Phaser 4 + Vite, giao diện, **các tool sinh asset** | có, trừ `public/assets/**` (sinh tự động; chỉ `portraits/` có trong git) |
| `docs/` | tài liệu | có |
| `node_modules/`, `dist/` | cài đặt / build | không |

**Luồng dữ liệu: client gốc → tool → mã + asset → chạy**

```
../jx-origin/data/*.pak
   └─ jxpak.py all ─────────────► ../jx-origin/data_extract/   (PAK giải nén, nguồn duy nhất của tool)
        ├─ gen:assets ──► public/assets/{char,npc,items}   +  art/jx/data.gen.ts, shared/{items,monsters}/*.gen.ts
        ├─ gen:skills ──► public/assets/skill             +  shared/skills/**/*.gen.ts, game/fx/fx.gen.ts
        ├─ gen:maps ────► public/assets/maps/<id>/ (+nav.json) + shared/maps/catalog.gen.ts
        ├─ gen:ui ──────► public/assets/ui                (khung, nút, thanh phím tắt gốc) + art/cursors.gen.ts
        ├─ gen:sounds ──► public/assets/{sound,music}     +  game/audio/sounds.gen.ts
        └─ gen:spawns ──► packages/shared/spawns/<id>.json (quái theo bản đồ; công cụ dev sửa tiếp)
shared (*.gen.ts + phần chỉnh tay) ──► server (world/ + SkillEngine)  và  client (game/ + ui/)
```

- **Quy tắc sửa:** file `*.gen.ts` do tool ghi, **đừng sửa tay**; chỉnh tay ở file cùng thư mục
  (`tuning.ts` của từng phái, `characters/factions.ts`, `monsters/monsters.ts`, `items/items.ts`, phần cổng/quái/nhạc trong `maps/`).
- **Chạy hằng ngày:** chỉ cần `npm install` + `npm run dev`. Asset đã có sẵn trong `public/assets`, không phải chạy lại tool.
- **Chỉ chạy lại tool khi** thêm đồ, ngựa, quái, NPC, bản đồ hoặc kỹ năng mới, hoặc dựng asset trên máy khác
  (xem [docs/regenerate-assets.md](docs/regenerate-assets.md), gồm cả lệnh nén codebase mà bỏ `public/assets`).
- **Typecheck:** `npm run typecheck` (shared + server + client). **Build client:** `npm run build`.

**Lệnh thường dùng**

| Lệnh | Việc |
|---|---|
| `npm run dev` | server `:2567` + client `:5173` |
| `npm run bots -- <kịch bản>` | bot giả lập người chơi theo `tools/bots/data/<kịch bản>.json` (quản lý tại `npm run bots:ui`, localhost:4568); `npm run bots -- 4 60` = thử nhanh |
| `npm run gen:assets -w @vltk/client` | nhân vật, quái, NPC, icon, danh mục đồ |
| `npm run gen:skills -w @vltk/client` | gói kỹ năng 11 phái + thất truyền + kỹ năng chung + hiệu ứng/icon + `core/magicdesc.gen.ts` |
| `npm run gen:maps -w @vltk/client -- 37 140` | bản đồ (bỏ id để làm hết) |
| `npm run gen:ui -w @vltk/client` | giao diện gốc `spr/ui3` → `public/assets/ui` |
| `npm run gen:sounds -w @vltk/client` | âm thanh gốc (WAV → MP3) + nhạc nền theo bản đồ |
| `npm run gen:spawns -w @vltk/client` | quái tự sinh cho bản đồ chưa có file spawn (giữ file đã sửa tay) |
| `npm run gen:gold -w @vltk/client` | bảng hoàng kim môn phái + icon hoàng kim / bí kíp / Lệnh bài / Thổ Địa Phù (máy mới phải chạy) |
| `npm run gen:player` / `gen:drops` / `gen:magic` | bảng cấp + nhân vật mới / bảng rơi đồ / dòng đồ xanh (chỉ `*.gen.ts`, đã có trong git) |
| `npm run audit:skills -w @vltk/client` | kiểm tra mọi kỹ năng → `docs/skills-audit.md` |

**Trang phụ của client:** `/?gallery` (xem trang phục/động tác), `/?skills` (thử từng chiêu không cần server),
`/maptest.html?map=37` (xem bản đồ riêng).

### Luồng mạng

- Client chỉ gửi **ý định**: `move {x,y}`, `cast {skill, targetId?, x, y}` (skill = id gốc), `pk {on}`, `respawn`.
- Server (20 tick/giây) tìm đường, mô phỏng, kiểm tra vũ khí/nội lực/tầm đánh/luật PK; SkillEngine sinh đạn, tính va chạm, sát thương.
- Trạng thái nhân vật/quái đồng bộ qua Colyseus Schema (`Actor`). Hiệu ứng gửi gộp mỗi tick trong một
  message `fx` (cast, msl, mend, hit, heal, st, die). Đạn chỉ gửi lúc xuất hiện và lúc mất; client tự bay
  (thẳng, đuổi mục tiêu, vòng cung, bám người).
- Chuyển map: server lưu map/vị trí mới rồi gửi `transfer`; client rời room cũ và vào room của map mới.

### Giao diện

- Toàn bộ giao diện dựng từ ảnh gốc `spr/ui3` (`npm run gen:ui`): khung ngọc bích, thanh tiêu đề đá có hai đồng tiền, nút đá,
  thanh phím tắt gốc 800×92 (ô 1–9, T/P, nút chức năng), thanh sinh lực/nội lực gốc. Màn hình HiDPI phóng ảnh theo pixel.
- **Mọi cửa sổ cùng một loại** (`apps/client/src/ui/kit/dialog.ts`): mỗi cửa sổ trong `ui/windows/` tạo `<section class="dlg" data-title="…">` →
  thanh tiêu đề + nút ✕, kéo thả bằng thanh tiêu đề (vị trí nhớ trong trình duyệt, click đúp để về chỗ cũ), cửa sổ mở/click
  sau cùng nằm trên. **Esc** đóng cửa sổ trên cùng; không còn cửa sổ nào thì mở **Hệ thống**. Cửa sổ trọng thương không đóng bằng Esc.
- **Con trỏ chuột gốc** (`[CursorList]`, file `.cur` chuyển sang PNG bằng `gen:ui`): thường, tấn công (rê lên quái), nói chuyện
  (rê lên NPC), mua (ô hàng ở cửa hàng / bán ngựa). `art/cursors.ts` + `art/cursors.gen.ts`.
- **Hệ thống** (Esc / nút bánh răng): Tự động đánh, Tùy chỉnh, Chuyển nhân vật, Thoát game, Trở lại. **Tùy chỉnh**: tắt tiếng, âm lượng chung,
  hiệu ứng, nhạc nền, hiện bản đồ nhỏ, danh sách phím tắt (lưu trên thiết bị, `state/settings.ts`).
- **Kỹ năng (F)**: lưới cột theo cấp học 10 / 20 / 30 / 40 / 50 / 60 / 90 / 120 / 150 (cột 10 gộp Nhập môn, cột 60 gộp Trấn phái
  — đánh dấu "TP"; cột 120 có kỹ năng thất truyền "TT"; cột "Khác" có 3 kỹ năng chung + đánh thường), mỗi ô là icon gốc + cấp,
  viền màu theo loại chiêu, mờ nếu sai vũ khí. Click: xem chi tiết, −/+ cấp (dev), Trái/Phải; kéo xuống ô 1–9 / T / P; click đúp:
  đặt vào ô chuột trái.
- **Mô tả kỹ năng** (rê chuột / khung chi tiết) dựng như client gốc (`KSkill::GetDesc`): tên + hệ, đẳng cấp yêu cầu, mô tả, lưu phái,
  đẳng cấp hiện thời, mọi thuộc tính của cấp đó bằng câu gốc của `settings/magicdesc.ini` (ngũ hành tương khắc, tiêu hao, phạm vi,
  sát thương, xác suất tự thi triển, "Tầng 2: …" của chiêu con), giới hạn vũ khí / ngựa, rồi **Đẳng cấp kế tiếp**. Chỉ để hiển thị
  (`packages/shared/src/skills/core/describe.ts`), không đổi cách chiêu vận hành; cuối mô tả ghi rõ phần chưa có tác dụng.
- **Tự động đánh** (Z mở cài đặt, nút Chạy/Dừng): đứng ở đâu đánh quanh đó; khóa con quái gần nhất trong phạm vi bằng chiêu ô chuột trái, tự dùng lại bùa lợi
  đặt ở phím 1–9 khi hết, bỏ qua boss / cọc gỗ, hết quái thì quay về; bấm tay thì tạm dừng 3 giây; tự dừng khi trọng thương, vào
  thành, chuyển bản đồ. Chạy ở client như tay người chơi (`packages/shared/src/auto/AutoPlay.ts`, cũng là bộ não bot), server kiểm tra mọi lệnh như thường. Bản gốc cần
  Bạch Câu Hoàn và có uống thuốc / nhặt đồ / về thành; ở đây chưa có thuốc nên dễ trọng thương khi bị cả bầy quái vây.
- NPC trong thành mở cửa sổ hội thoại kiểu gốc (hình NPC, lời thoại, lựa chọn) trước khi vào cửa hàng / xa phu / bán ngựa.

### Ngựa

- 54 loại ngựa của `settings/item/004/horse.txt` (mỗi tên một con; 31 bộ hình, kể cả Sư tử, Lạc đà, Hươu đốm…). Ngựa là
  vật phẩm: mua ở NPC **Bán ngựa** (đứng cạnh Thợ rèn và Xa phu ở cả 7 thành), giá 0 lượng, vào hành trang, mặc vào ô **Ngựa**
  (I), bấm **M** để lên/xuống. Tốc độ: `+% gốc / 250` (Phiên Vũ +100% gốc = ×1,4), chỉnh một chỗ ở `horseSpeed` (`items/horses.ts`).
- Nhân vật cũ đang có Phiêu Vũ được chuyển sang ô Ngựa tự động.

### Âm thanh

- `npm run gen:sounds` đọc bảng gốc: tiếng ra chiêu nam/nữ (`skills.txt` ManCastSnd/FMCastSnd), tiếng đạn bay / tan / trúng
  (`missles.txt` SndFile2–4), tiếng quái bị đánh / chết / tấn công (`npc动作声音表.txt`), tiếng nhân vật (`主角动作声音表.txt`,
  vung vũ khí theo loại, trúng đòn, ngã, trên ngựa), nhạc nền theo bản đồ (`settings/music/musicset.txt`, 247 bản đồ, 30 bài).
- Phát bằng Web Audio (`apps/client/src/game/audio`): nhỏ dần theo khoảng cách tới nhân vật, lệch trái/phải, giới hạn số tiếng
  cùng lúc (ồn đến đâu cũng nghe rõ). Trình duyệt chỉ cho phát sau lần click / bấm phím đầu tiên.

### Quái theo bản đồ

- Server gốc giữ dữ liệu spawn, client không có, nên mỗi bản đồ có file riêng `packages/shared/spawns/<id>.json`:
  các khu (tâm, bán kính, danh sách `[id quái, cấp]`, số lượng, thời gian hồi sinh, boss) hoặc khu đặt ngẫu nhiên (`camps`),
  và quái đứng yên (`fixed`, như cọc gỗ). Id quái = dòng trong `npcs.txt` (`monsters/monsters.gen.ts`, 1193 quái có hình);
  `npcs.txt` không có cấp nên cấp lấy theo khu, sinh lực tăng theo cấp (`monsterAt`, `monsters/scaling.ts`).
- `npm run gen:spawns` tự đặt quái cho bản đồ Luyện công, Hang động, Thôn trấn và các động/tháp: cấp theo bảng ước lượng trong tool
  (xa lối vào và tầng sâu thì cao hơn), thú hoang hợp cấp và hợp tên bản đồ (tuyết, sa mạc, đảo/hồ, hang), cộng sơn tặc đúng vùng
  của bản đồ (Tây Bắc, Tây Nam, Giang Nam…) từ cấp 20. Thành, môn phái, chiến trường không có quái. Hiện có 134 bản đồ có quái.
- **Công cụ dev**: bản đồ lớn (Tab) → **Quái (dev)**: thấy các khu, click lên bản đồ để thêm khu với quái đang chọn, click vòng tròn
  để chọn khu, sửa quái/cấp/số lượng/bán kính/hồi sinh/boss, **Lưu** → server ghi file (`auto: false`, `gen:spawns` sẽ giữ nguyên)
  và sinh lại quái ngay. Quái mới chưa có hình thì chạy `npm run gen:skills -w @vltk/client && npm run gen:assets -w @vltk/client`.
  API: `GET/PUT /api/dev/spawns/:map` (cần đăng nhập; tắt bằng `DEV_TOOLS=0`; đổi thư mục bằng `SPAWNS_DIR`).

### Hình ảnh từ client gốc (1:1)

Tất cả hình nhân vật/quái/NPC/icon/bản đồ được sinh từ `../jx-origin/data_extract` (đổi đường dẫn bằng
biến `JX_CLIENT`). Không cần chạy lại trừ khi muốn thêm đồ, ngựa, quái, NPC hoặc bản đồ:

```sh
npm run gen:assets -w @vltk/client     # ~3 phút lần đầu, sau đó chỉ sheet mới (thêm --force để làm lại hết)
npm run gen:maps -w @vltk/client       # mọi bản đồ của maplist.ini (~300, ~16 GB, vài giờ); tham số: id bản đồ,
                                       # --skip-existing chạy tiếp phần còn thiếu, --nav chỉ lưới, --catalog chỉ danh mục
```

- **Nhân vật** ghép từ tối đa 11 lớp: đầu, tóc (theo mũ), vai, thân, hai tay (theo áo), vũ khí trái/phải, 3 phần
  ngựa. Bảng gốc: `人物类型.txt` → bảng bộ phận nam/nữ, bảng liên kết vũ khí → động tác (đứng chiến đấu / đứng
  thường / chạy / đâm / chém / nội công / trúng đòn / ngã, và bộ cưỡi ngựa), `贴图顺序表` cho thứ tự vẽ theo
  hướng và từng khung hình. Trong thành dùng tư thế thường, ngoài thành dùng tư thế chiến đấu của vũ khí.
- **Trang bị → hình**: `*res.txt` cho số bộ phận của từng món; hàng trong bảng bộ phận = số bộ phận − 2.
- Sheet là WebP lossless ở độ phân giải gốc, tải dần khi cần. Game dùng khung **1280×720 /1280×800**, render **2×**, tắt MSAA,
  làm tròn tọa độ; phóng/thu theo tỉ lệ và căn giữa cửa sổ. **Tùy chỉnh → Khung game** chọn tự động hoặc một trong2khung;
  HUD/cửa sổ/chuột/cảm ứng bám cùng khung, lăn chuột để zoom100/150/200%. Canvas tối đa2560×1600, không tăng theo DPR/màn4K.
  Gallery/skill-lab/maptest giữ cách dựng riêng. Xem `docs/performance/02-do-luong.md` §9.
- Xem toàn bộ áo/mũ cấp 1–10 nam và nữ, mọi động tác, 8 hướng, có/không ngựa: `http://localhost:5173/?gallery`
  (phím 1–9 động tác, ←/→ hướng, W vũ khí, H mũ, M ngựa). Xem bản đồ riêng: `/maptest.html?map=37`.
- Asset: toàn bộ `apps/client/public/assets/` không vào git (trừ `portraits/`), kể cả ảnh Biện Kinh (37) / Dược Vương Cốc (140);
  sinh lại bằng các lệnh `gen:*` (`docs/regenerate-assets.md`). Bản đồ không có điểm vào làm tay dùng giữa vùng đi lại lớn nhất; quái theo file spawn, NPC
  (Thợ rèn, Xa phu, Bán ngựa) ở 7 thành; chưa có cổng ngoài Biện Kinh ↔ Dược Vương Cốc.
- Ngựa: `packages/shared/src/items/horses.gen.ts` (từ `horse.txt`); Phiêu Vũ (bảng gốc ghi "Phiên Vũ") là bộ `ma_h*_012_*`.
- Chữ TCVN3: các chữ hoa A1–A7 là Ă Â Ê Ô Ơ Ư Đ (trước đây bị lệch, ra "Êm" thay vì "Âm", "Ơ Chùy" thay vì "Ô Chùy").

### Kỹ năng từ client gốc

```sh
npm run gen:skills -w @vltk/client     # vài giây (hiệu ứng đã có thì bỏ qua); --force để mã hoá lại hiệu ứng
```

- Nguồn: `settings/skills.txt`, `settings/missles.txt`, đường cong theo cấp trong `script/skill/<phái>.lua`, danh sách
  học theo mốc trong `script/global/skills_table.lua` (cấp 120/150 lấy theo ReqLevel). Chi tiết: `packages/shared/src/skills/README.md`.
- Hiệu ứng nền đen (chiêu 150, Hoa Sơn…) vẽ cộng sáng theo cờ trong header SPR (byte 22); `gen:skills` trừ mức nền xám (4 hoặc 8)
  để khí trường chồng nhiều lớp không lộ ô vuông. Đổi cách xử lý thì chạy lại với `--force`.
- Kỹ năng thất truyền (id 1220–1229, Hoa Sơn 1370; bị động, yêu cầu cấp 120) theo `advancedskill.lua`; 3 kỹ năng chung (210, 397, 400)
  theo `add_misc` của `skills_table.lua`.
- **Hoa Sơn** (index 10 của `settings/faction/门派设定.ini`, hệ Thủy, nam + nữ): bảng gốc chỉ có tên tiếng Trung nên tên Hán Việt và
  mô tả dịch tay trong `apps/client/tools/data/huashan.ts`; công thức ở file rời `jx-origin/script/skill/huashan.lua` (không
  nằm trong PAK). Không có `add_hs` trong `skills_table.lua` nên mốc học xếp theo ReqLevel. Phân loại chiêu Hoa Sơn chưa rà.
- Chiêu hiện khi đạt cấp học; cộng điểm kỹ năng hoặc thục luyện (`docs/formulas/skills.md`), cấp lưu theo nhân vật.
- Sát thương theo công thức gốc (`packages/shared/src/formulas/`, `docs/formulas/damage.md`), một đường cho người chơi, quái, boss.
- Bùa lợi / bùa hại (kể cả choáng / chậm / độc của chiêu tấn công, hào quang, chiêu 120) có tác dụng (`docs/formulas/effects.md`):
  server giữ theo mã chiêu và thời gian (`Actor.states` / `stateEnds`), client vẽ hình trạng thái gốc trên người
  (`状态图形对照表.txt`), icon trên đầu, danh sách của mình dưới thanh máu.
- Kiểm tra toàn bộ phái: `npm run audit:skills -w @vltk/client` → `docs/skills-audit.md`.
- Chiêu cần đúng loại vũ khí như bản gốc (vd. Trảm Long Quyết cần chùy). Quái/boss bỏ qua điều kiện vũ khí và nội lực.
- Xem thử từng chiêu không cần server: `http://localhost:5173/?skills` — bảng trái: click môn phái / chiêu (icon gốc),
  −/+ cấp, Đánh, Tự đánh; phím tắt ↑/↓ phái, ←/→ chiêu, +/− cấp, Space đánh cọc gỗ, A tự đánh.

## Bot và load test

```sh
npm run bots -- 4 60                     # 4 bot trong 60 giây
PERF=1 npm run dev                       # server in thời gian tick mỗi 10 giây
npm run bots -- 80 60                    # 80 bot (40v40) cùng PK trong Dược Vương Cốc
```

Kết quả đo trên máy dev (WSL, 1 process): 80 bot (cưỡi ngựa qua cổng), khoảng 50–60 người + 45–50 quái cùng
đánh trong một room, tick p50 ≈ 1–2 ms, p99 ≈ 5–23 ms (ngân sách 50 ms). Sự kiện fx khoảng 23 KB/s mỗi client (ước lượng JSON),
chưa tính patch state. Bot spam chiêu liên tục nên đây là mức tải nặng hơn chơi thật.

Bot giả lập người chơi: `npm run bots:ui` → [localhost:4568](http://localhost:4568/), chọn tên + kịch bản rồi Chạy ngay tại bảng; hoặc `npm run bots -- luyen-cong-30`. Có3template cấp và mẫu30bot, xem [tools/bots/README.md](tools/bots/README.md).

## Ghi chú môi trường (WSL + ổ /mnt)

Sự kiện thay đổi file từ ổ Windows không tới được WSL, nên Vite (`watch.usePolling`) và server
(`CHOKIDAR_USEPOLLING=1`) đều đã bật polling. `public/assets/**` (hàng chục nghìn file sinh tự động) được loại khỏi
watcher; nếu không, polling làm mỗi file tĩnh mất ~9 giây mới trả về. Nếu chuyển repo sang ổ Linux có thể bỏ polling.

## Chưa làm (bước tiếp theo gợi ý)

Danh sách đầy đủ có trạng thái: `tasks/BACKLOG.md`; điểm dừng hiện tại và bước tiếp theo: `tasks/CURRENT.md`.


- Chỉ số trang bị mới có Sinh lực/Nội lực (hardcode theo loại × cấp); chưa có thuộc tính ẩn, kháng, yêu cầu.
- Ngựa chỉ có tốc độ (chưa có thuộc tính khác của bảng gốc); chưa có tiền nên mọi thứ giá 0 lượng.
- Cấp quái của `gen:spawns` là ước lượng; chỉnh dần bằng công cụ dev. Chưa có exp khi giết quái.
- Kỹ năng: bùa lợi / bùa hại / bị động mới được ghi nhận, chưa có tác dụng; sát thương đang ngẫu nhiên. Mô tả kỹ năng chưa cộng
  thêm điểm từ trang bị / kỹ năng hỗ trợ.
- Tự động đánh chưa có uống thuốc, nhặt đồ, về thành sửa đồ.
- Exp/level, rơi đồ, thuốc, thuộc tính trang bị, chat, tổ đội, bang hội (công thức đã tổng hợp trong `docs/combat-formulas.md`).
  Hoạt cảnh bản đồ (nước, lửa) đang đứng yên ở khung đầu.
- Client prediction cho chính mình (hiện chỉ nội suy), interest management (`StateView`) cho map đông người.
- Lưu trữ thật (PostgreSQL), nhiều process + Redis presence.
- Chưa có lên cấp / điểm kỹ năng / điểm tiềm năng; số liệu quái là bản đơn giản để cân bằng thử.

Tài nguyên hình ảnh/âm thanh là của game gốc (Kingsoft/VNG), chỉ dùng cho prototype nội bộ.

**Auto theo nhân vật:** [hướng dẫn và bản đồ mã nguồn](docs/auto.md). **Rao bán / Mua bán / Kim nguyên bảo:** [hướng dẫn và bản đồ mã nguồn](docs/rao-ban.md).
