# AGENTS.md — hướng dẫn cho AI agent làm việc trong `jx-system-online`

Đọc file này đầu mỗi phiên. Chi tiết người dùng chạy/đọc nằm trong `README.md`; ở đây chỉ có những điều agent cần biết để
không làm sai.

## 0. Bắt đầu và kết thúc phiên (bắt buộc)

- **UI/UX tool — bắt buộc đọc trước:** khi người dùng đề cập tạo tool/công cụ quản trị, giao diện tool, dashboard, form, component hoặc style của bất kỳ công cụ nào trong `tools/` (kể cả lúc chưa có thư mục), đọc toàn bộ [`docs/tools-ui-ux-guidelines.md`](docs/tools-ui-ux-guidelines.md) **trước khi đề xuất thiết kế, lập kế hoạch hoặc viết/sửa mã**. Áp dụng cho mọi AI session (ChatGPT/Codex, Claude, Gemini, Antigravity); dùng guideline làm nguồn chuẩn duy nhất, không tự tạo style riêng. Đọc thêm `tools/AGENTS.md` khi làm trong tools.

- **Đầu phiên:** đọc `tasks/CURRENT.md` — commit cuối, việc dở dang, điều đang chờ người dùng quyết định, bước tiếp theo gợi ý.
  Toàn bộ đầu việc ở `tasks/BACKLOG.md`, lịch sử các vòng ở `tasks/HISTORY.md`, quy ước ở `tasks/README.md`.
  Kiểm tra nhanh `git status` / `git log -1` có khớp với `CURRENT.md` không; lệch thì báo người dùng.
- Người dùng nói "làm tiếp" / "tiếp tục": tóm tắt điểm dừng từ `CURRENT.md` và hỏi lại mục nào cần họ chọn (các bước gợi ý
  **chưa được duyệt**), không tự bắt đầu viết code.
- Người dùng hỏi "thống kê công việc": bảng tiến độ `CURRENT.md` §3 (đếm lại từ `BACKLOG.md`) + các việc chưa xong đáng chú ý,
  kể cả phần còn dở của việc đã làm một phần (vd. cache PF6–PF9).
- **Cuối phiên, sau mỗi commit, hoặc khi đổi hướng:** cập nhật `tasks/CURRENT.md` (ngày, commit, trạng thái, việc chờ quyết định),
  tick `tasks/BACKLOG.md`, thêm mục vào `tasks/HISTORY.md`. Phần luật / quyết định lâu dài thì ghi vào file này (mục 6).

## 1. Dự án là gì

Prototype MMORPG 2D kiểu **Võ Lâm Truyền Kỳ 1 (JX1)**: **Phaser 4 + Vite** (client), **Colyseus 0.18** (server),
npm workspaces (`packages/shared`, `apps/server`, `apps/client`), TypeScript, Node 22+. Hình ảnh và dữ liệu lấy từ client gốc
`../jx-origin` ở độ phân giải **1:1**. Gameplay tham khảo `../jx-web-main`, nhưng người dùng dặn **chưa mượn công thức**
của nó (chỉ tham khảo phần người dùng chỉ định); công thức lấy từ `docs/combat-formulas.md`.

**Nền tảng mục tiêu: Web, Desktop app và Mobile** (người dùng yêu cầu 2026-11-12, luôn áp dụng). Mọi câu trả lời và quyết định
kỹ thuật (giao diện, nhập liệu chuột / phím / cảm ứng, dựng hình và tỉ lệ, tài nguyên và dung lượng, mạng, lưu trữ, thư viện,
đóng gói) phải cân nhắc cả ba: nói rõ phương án chạy được ở nền tảng nào, chỗ nào phải làm riêng. Hiện client mới được làm và
thử cho trình duyệt desktop (chuột + bàn phím).

## 2. Cách làm việc với người dùng (quan trọng)

- **Trả lời bằng tiếng Việt.**
- Người dùng hay **xem hướng đi trước khi viết code** ("đừng sửa gì vội"). Chỉ sửa/triển khai sau khi được đồng ý rõ ràng.
  Khi câu hỏi là điều tra/thảo luận thì trả lời, không tự ý sửa code.
- **Không `git commit` / `push` nếu không được yêu cầu.** Nhánh làm việc: `feature/skill-system`. Repo được tạo lại 2026-11-12
  (commit mốc `9558ad7`) sau khi chuyển thư mục; lịch sử cũ (đến `3bd96bd`) đã mất, không có nhánh `main`, không có remote.
- Việc cần kiểm tra thì kiểm tra bằng dữ liệu gốc, không đoán. Phân biệt rõ điều **đã xác minh** với **suy luận**.

## 3. Lệnh

| Lệnh (gốc repo) | Việc |
|---|---|
| `npm install` | cài đặt (`.npmrc` đã bật `legacy-peer-deps`); `cp apps/server/.env.example apps/server/.env` (cấu hình server, không vào git) |
| `npm run dev` | server `:2567` + client `:5173` |
| `npm run typecheck` | `tsc` cho shared + server + client — chạy sau khi sửa code |
| `npm run build` | build client |
| `npm run bots -- <kịch bản>` | bot giả lập theo `tools/bots/data/<kịch bản>.json` (UI riêng `npm run bots:ui`, localhost4568; **cách dùng `docs/bots-guide.md`**, thiết kế `docs/bots.md`); `npm run bots -- 4 60` = chế độ cũ thử nhanh; `PERF=1 npm run dev` in thời gian tick |
| `npm run gen:assets -w @vltk/client` | nhân vật/quái/NPC/icon + `items.gen.ts`, `horses.gen.ts`, `monsters.gen.ts` (shared), `art/jx/data.gen.ts` |
| `npm run gen:skills -w @vltk/client` | kỹ năng 11 phái (+ thất truyền, 3 kỹ năng chung) + hiệu ứng/icon (`*.gen.ts`, cả `core/magicdesc.gen.ts`) |
| `npm run gen:maps -w @vltk/client -- 37 140` | bản đồ (bỏ id = tất cả ~300, ~16 GB, vài giờ) |
| `npm run gen:ui -w @vltk/client` | giao diện gốc `spr/ui3` → `public/assets/ui` + con trỏ chuột gốc (`ui/cursor/*.png`, `src/art/cursors.gen.ts`) |
| `npm run gen:sounds -w @vltk/client` | âm thanh gốc → MP3 + nhạc nền theo bản đồ + `game/audio/sounds.gen.ts` |
| `npm run gen:manifest -w @vltk/client` | dựng lại `public/assets/manifest.json` (phiên bản gói asset cho cache); tool `gen:*` tự cập nhật, chỉ chạy khi lệch |
| `npm run gen:magic -w @vltk/client` | dòng thuộc tính đồ xanh `magicattrib.txt` → `packages/shared/src/items/magicattrib.gen.ts` (vài giây) |
| `npm run gen:spawns -w @vltk/client` | quái tự sinh → `packages/shared/spawns/<id>.json` (giữ file `auto: false`) |
| `npm run gen:gold -w @vltk/client` | `items/gold.gen.ts` + **icon hoàng kim / bí kíp / Lệnh bài / Thổ Địa Phù** (`gen:assets` không sinh; máy mới phải chạy) |
| `npm run gen:player` · `gen:drops -w @vltk/client` | `characters/player.gen.ts` (bảng cấp / nhân vật mới) · `drops/drops.gen.ts` (bảng rơi đồ) |
| `npm run audit:skills -w @vltk/client` | kiểm tra mọi kỹ năng → `docs/skills-audit.md` |

Có kiểm tra tốc độ riêng `npm run test:speed` (Node test runner); chưa có bộ test tổng thể. Kiểm chứng thêm bằng `typecheck`, `bots`, `/?skills`, `/?gallery`, `/maptest.html?map=37`, và chạy trình duyệt
thật bằng Playwright trên server thử nghiệm cổng 2568 / 5174 (cách làm ở `tasks/CURRENT.md` mục 5) — đừng dùng server :2567 / :5173
của người dùng.

## 4. Bản đồ mã nguồn

Chi tiết từng file, luật phụ thuộc và "việc thường gặp" (thêm cửa sổ, phím, lệnh, boss…): **`docs/architecture.md`**.
Chia theo chủ đề; `*.gen.ts` nằm cạnh file chỉnh tay cùng chủ đề.

```
packages/shared/src/   luật + dữ liệu dùng chung (TS thuần, không Phaser/Colyseus/DOM)  ← chỉnh số liệu ở đây
  characters/ monsters/ npcs/ items/ status/ combat/ skills/ maps/(nav/) · protocol.ts geometry.ts
packages/shared/spawns/ quái theo bản đồ (JSON; gen:spawns hoặc công cụ dev trên bản đồ lớn ghi)
apps/server/src/       net/ (MapRoom, schema Actor) · account/ (auth, db) · dev/ (devtools, botAdmin = API bot, API chạy trong game; runner ở tools/bots)
                       world/ (World.ts = thứ tự tick · entity players commands inventory targeting · systems/ · ai/ quái + boss)
apps/client/src/       app/ (luồng màn hình) · net/ · state/ · input/ (keymap) · platform/ · art/ (hình gốc dùng chung)
                       game/ (Phaser; ports.ts = hợp đồng với giao diện) · ui/ (kit/ tips/ screens/ hud/ windows/) · dev/
apps/client/tools/     gen-*.ts + jx/ (đọc data_extract, giải mã SPR, bảng Lua, TCVN3/GBK) + data/ (bảng làm tay, vd. tên Hoa Sơn)
apps/client/public/assets/   SINH TỰ ĐỘNG, hơn 15 GB, KHÔNG phải mã nguồn
docs/                  skills-audit.md · regenerate-assets.md · combat_effects_worked_examples.md · combat-formulas.md ·
                       architecture.md (cấu trúc mã) · ui-and-platforms.md (màn hình, HTML vs canvas, 3 nền tảng) ·
                       restructure-plan.md (đề xuất cấu trúc lại, đã làm 2026-11-12) · shadows.md (bóng đổ gốc: file SPR bóng riêng) ·
                       equipment-gold-thientu.md (hoàng kim môn phái + Thiên Tứ, sinh bằng tools/doc-gold.ts) ·
                       skills-layers.md (tầng chiêu 90 / 150 mở theo cấp) ·
                       **formulas/** (công thức trò chơi: README.md mục lục, character, level, skills… — mã ở shared/src/formulas) ·
                       research/ (nghiên cứu 2026-11-12: skills-progression, effects-buffs, luck-drops) ·
                       **performance/** (tải / lưu đệm tài nguyên: README.md mục lục, 01–05 = phân tích + PF1–PF4 trong BACKLOG §9) ·
                       **bots-guide.md** (cách dùng bot, có ảnh `images/bots/`) · **bots.md** (thiết kế bot + đo hiệu năng server, BACKLOG §10) ·
                       **tong-kim-battlefield.md** (Tống Kim theo SHXT, cao cấp trước, điểm báo danh + sảnh chờ; nguồn PAK ở docs/research/tong-kim-shxt-sources.md, BACKLOG SK1)
tasks/                 CURRENT.md (điểm dừng) · BACKLOG.md · HISTORY.md — xem mục 0
```

## 5. Quy tắc quan trọng

1. **File `*.gen.ts` do tool ghi, không sửa tay.** Chỉnh tay ở file cùng thư mục: `factions/<phái>/tuning.ts`,
   `monsters/monsters.ts`, `items/*.ts`, `characters/factions.ts`, phần cổng/quái/nhạc trong `maps/`. Tool chạy lại sẽ ghi đè mọi chỉnh sửa trong `*.gen.ts`.
2. **Kỹ năng không phụ thuộc chủ thể.** Kỹ năng = `id gốc + cấp`; người chơi, bot, quái, boss dùng chung `SkillEngine`.
   AI chỉ chọn chiêu nào. Mỗi phái một thư mục riêng.
3. **Server quyết định mọi thứ** (20 tick/giây). Client chỉ gửi ý định (`move`, `cast`, `pk`, `respawn`).
   Giao thức nằm trong `packages/shared/src/protocol.ts`.
4. **Không đụng `public/assets/**` bằng tay**, không đọc hàng loạt (hàng chục nghìn file, ổ `/mnt` rất chậm).
   Dùng tool `gen:*`; đo dung lượng thì tránh `du` toàn thư mục (quá thời gian).
5. **Hình ảnh 1:1 đã được chấp nhận ("rất tốt")**: canvas theo pixel thật của thiết bị, `roundPixels`, WebP lossless.
   **Không đổi cách dựng hình.**
6. **Asset không vào git:** toàn bộ `apps/client/public/assets/` nằm trong `.gitignore` (người dùng yêu cầu 2026-11-12), trừ `portraits/`
   (không có tool sinh). Sinh lại bằng `gen:*` theo `docs/regenerate-assets.md`.
7. **Vite không được poll `public/assets/**`** (mỗi file tĩnh sẽ mất ~9 s). Vite và server đã bật polling cho WSL
   (`CHOKIDAR_USEPOLLING=1`); giữ nguyên cấu hình này.
8. Dữ liệu tài khoản ở `apps/server/data/db.json` (bị `.gitignore`); xóa file để reset.

## 6. Quyết định hiện tại (đừng tự đổi)

- **Auto theo nhân vật + Mua bán/KNB (USER2026-11-14):** Z và nút AUTO chỉ mở cài đặt; chạy/dừng qua dialog hoặc play/pause cạnh bảng tên. `CharacterRecord.auto` lưu enabled/settings, cache `vltk.auto.character.<charId>`, server đối chiếu và reload tiếp tục nếu enabled; không dùng Auto toàn máy cho nhân vật khác. Tắt autoMap trong thành thì chờ, không tự tắt. Bot ghi Auto từ kịch bản vào char; rao món đủ tiêu chí lên kênh Mua bán dạng liên hệ. Mua bán có lịch sử công khai, item snapshot do server lấy, preview đầy đủ; giá lượng/KNB hoặc liên hệ, chưa đổi trang bị. Mua trực tiếp yêu cầu seller online và món chưa đổi; không escrow/offline. KNB là ví riêng, mặc định0, mua ở Kỳ Trân Các trong thành100vạn/đơn vị. Tiền hiển thị qua moneyText theo vạn từ10000. Chi tiết `docs/auto-and-market.md`.

- **Design tool dùng chung (USER2026-11-14, GD8):** nguồn duy nhất là [`docs/tools-ui-ux-guidelines.md`](docs/tools-ui-ux-guidelines.md). Mọi AI phải đọc trước khi đề xuất/lập kế hoạch/tạo/sửa UI/UX tool theo điều kiện ở mục0; không tự dùng style riêng. Các entrypoint Claude/Gemini/Antigravity và tools/AGENTS chỉ dẫn lại nguồn này.

- **Công cụ bot độc lập (USER2026-11-14):** UI/runner/cấu hình ở `tools/bots`, mở `npm run bots:ui` → localhost4568, không Vite/HMR theo game. Game chỉ giữ API tác động thế giới, shared giữ luật. Bảng chọn nhân vật có chọn/chạy kịch bản theo checkbox, Online theo kết nối thật và cột tên kịch bản; dừng riêng ID qua IPC. Có3template40–69/70–90/110–150 và `luyen-cong-30` (10tên/dải,3bot/s,liên tục); initialSetup chỉ khởi tạo tài khoản thiếu, không reset tiến trình cũ. Spawn cho phép `both` thành+bãi; không chặn Auto về thành mua thuốc.

- **Kịch bản bot (USER2026-11-14):** luôn chạy liên tục tớiCtrl+C, không duration; bot vào lần lượt3–5/giây(default3). UI chỉLuyện công/Chat/Rao bán đồng thời, template readonly hoặcTự cài đặt. Luyện công có auto nhận lời mời tổ đội. Chat/rao chỉ khi nhặt đất thành công: món>5dòng hoặcẩnhiếm/lớn; không tựrao inventorybanđầu/buy/forge/rejoin. Dùng `InventoryMsg.pickedUp` mộtlần, `bots/social.ts`/LootAnnouncer, chốnglặp vàcooldown. Không làm PK/dạo/crowd trong scenario mới, không tự giao dịch.

- **Vũ khí/thuốc bot (USER2026-11-14, BT10):** mọi vũ khí xanh do thiết lập bot tạo phải có hai prefix luôn bật hút Sinh lực/Nội lực max toàn bảng (hiện10% mỗi loại), kể cả vũ khí cấp thấp; `bots/equipment.ts botGreenLines`, ngoại lệ chỉ bot, không sửa chế tạo người chơi. Thuốc mặc định Ngũ Hoa Ngọc Lộ Hoàn hồi cảSL/NL; ưu tiên nhóm thuốc kép. Picker bản đồ chỉ ở thiết lập Nâng cao, không lặp dưới Ngựa.

- **Form bot (USER2026-11-14, BT10):** `/?bots` chọn Tự cài đặt hoặc template tự tải/readonly; chỉ dải40–69/70–90/110–150, trang bị xanh/hoàng kim môn phái, ngựa random đủ cấp (từ110 chọn nhóm mạnh), tự học90/120/150 đủ cấp mặc định bật, không giới chỉ. Cập nhật thiết lập upsert hàng loạt ID roster và cập nhật bảng; Lưu Thiết lập hỏi tên và chỉ lưu template. Bỏ nút tạo/nạp ở form nhân vật. Bãi luyện công/Thành thị mặc định chọn tất cả map đã sinh đúng nhóm, chọn qua dialog preview và OK, không tự thay danh sách bằng bãi theo cấp. Nâng cao hiển thị ID đăng nhập; mật khẩu cũ không đổi khi cập nhật.

- **Bot roster200 (USER2026-11-14, BT10):** `packages/shared/src/bots/roster.ts` là 200 danh tính cố định (ID/tên/giới/phái), hệ theo phái. Tạo/áp mẫu/chạy lại không phân lại danh tính theo thứ tự chọn. Scenario mới lưu `bots.usernames` cụ thể; có trường này thì không fallback sang prefix/count, danh sách rỗng/chưa tạo phải báo lỗi. Giữ tương thích scenario cũ thiếu usernames. Trang `/?bots` chọn tên trước, cấu hình cấp/đồ sau, command copy sau khi lưu.

- **Mốc tốc độ (USER 2026-11-14, GP6 + cập nhật nền 10% và dải 260%):** cấu hình chung **`packages/shared/src/formulas/tuning.ts` → `SPEED`** (`basePercent = 10`, tổng 5–260%, chạy 8 frame / đánh 20 frame, distanceScale 1.15). Nền mặc định 10% (10% = 1 điểm chạy, lượng frame tại 10% bằng mốc 50% cũ). Đánh: 10% = 16 FPS (1250ms) → 260% = 40 FPS (500ms). Chạy: 10% = 6 FPS (1333ms) → 260% = 13 FPS (615ms). `resolveSpeed` chọn mốc sau buff/chậm, gồm Dương. `Actor.actionMs` giữ thời lượng đòn, `Actor.moveScale` giữ nhịp chạy; client chuẩn hóa thời lượng cho mọi sheet đi chân/cưỡi, không đổi pixel 1:1. Hoàn tất pose phát 1 chiêu chính; đạn/tầng phụ/bẫy/độc giữ nhịp riêng. `?skills` có nhập tốc/tự đánh-chạy/cưỡi và config chỉ phiên thử; muốn chỉnh tốc game lâu dài thì sửa SPEED ở file trên. Bảng F3 / N hiển thị `T.Độ Chạy` = `speedPoints(totals.run)` (nền 10% = 1 điểm). Hướng dẫn cấu hình ở docs/formulas/speed.md §12–13. Kiểm tra `npm run test:speed`.

- **Tống Kim theo SHXT (USER 2026-11-14):** cơ chế theo `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`, chỉ ngoại lệ lịch mở có thể đặt bất kỳ lúc nào. Mỗi thời điểm tối đa 1 trận/tầng Sơ–Trung–Cao trên toàn server; **chỉ làm cao cấp trước**, sơ/trung dùng chung cơ chế và bộ lọc cấp để sau. Bắt buộc điểm báo danh + sảnh chờ, không truyền thẳng vào chiến đấu. Tài liệu `docs/tong-kim-battlefield.md` thay thế thiết kế vay volamidle (bản cũ lưu nghiên cứu); các số 20 phút, 26 món, buff quân hàm 0–20% không còn là mặc định đã chốt. PAK Chiêu Thư phân cấp40–59/60–89/từ90, báo danh323/324/325; không tự coi đề xuất map328 hoặc thể thức Bảo vệ Nguyên Soái là lựa chọn USER. **Chỉ đạo tiếp theo USER 2026-11-14:** phần thiếu dữ liệu agent được tự thiết kế gameplay và trình duyệt; mục tiêu PK, danh hiệu, dùng vật phẩm và soái nhiều chiêu mạnh. Phương án CHỌN tại `docs/tong-kim-gameplay-proposal.md` (Bảo vệ Nguyên Soái, 27 món chiến đấu, 6 nhóm chiêu soái) **chưa được duyệt triển khai**; không tiếp tục coi thiếu script server là chặn thiết kế và không ghi số tự chọn thành dữ liệu gốc.

- **Phượng Tường + 40 bãi (USER 2026-11-13) & Quái / Boss 3 bậc (USER 2026-11-14):** thêm thành Phượng Tường (1), giữ Biện Kinh (37) / Dược Vương Cốc (140); 40 bãi Field + Cave chia cấp 10–200, hai bản đồ/mốc. Bảng chỉnh tay `packages/shared/src/maps/training-levels.ts`, tài liệu `docs/training-maps.md`; `gen-spawns` ưu tiên bảng này và giữ quái trong band. Đây là cấp riêng của project, không phải dữ liệu cấp từ client gốc. Tổng hiện có 43 bản đồ đã sinh. Bộ lọc Xa phu gộp `City` và `Capital` dưới nhãn **Thành thị** (USER 2026-11-13); giữ nguyên type gốc và luật thành an toàn. Quái chia 3 bậc (`Actor.boss = 0 | 1 | 2`): **Quái thường (`0`)** tên Trắng `#ffffff`, **Boss Xanh (`1`)** tên Xanh dương `#5cb8ff` (máu/exp ×5, 4 lần tung đồ, 2 điểm cố định/bãi + 3% tự hóa xanh khi hồi sinh), **Boss Hoàng Kim (`2`)** tên Vàng `#ffd700` (máu/exp ×12, 8 lần tung bảng `boss/*droprate`, 20 Đại/Tiểu Hoàng Kim trong `GOLDEN_BOSS_LIST` đặt 1 con ở sâu mỗi bãi).

- **Công thức** (2026-11-12): mọi phép tính chỉ số / cấp / sát thương / hiệu ứng nằm ở `packages/shared/src/formulas/`, hằng số chỉ ở
  `formulas/tuning.ts` (ghi nguồn DATA / SRC / WEB / JXWEB / CHỌN / USER), tài liệu `docs/formulas/`. Không viết công thức ở chỗ khác.
- **Tiến trình** (USER 2026-11-12): tạo nhân vật chọn hệ + giới, bắt đầu cấp 1; **cấp 10 gia nhập phái cùng hệ** (cửa sổ Kỹ năng);
  chiêu hiện khi đạt ReqLevel (không cần nhiệm vụ); chiêu thường cộng điểm, chiêu 90 thục luyện (5 chiêu 90 + 1110 cộng điểm, có
  tiền đề); nhân vật lưu trước đó về cấp 1. May mắn mặc định 5. Chi tiết `docs/formulas/level.md`, `skills.md`.
- **Chiêu 90 / 120 / 150 chỉ có qua bí kíp ở Kỳ Trân Các** (USER 2026-11-12): nút "Bảo Vật" (ảnh gốc) trên thanh dưới + NPC **Bách Bảo Lão Nhân**. Bí kíp cấp 90 / 120 / 150: chuột phải → hiện chiêu kế tiếp của tầng; Đại thành bí kíp:
  một chiêu của tầng lên cấp 20 (`items/books.ts`, `world/progress.ts useBook`). Chiêu **150 luyện như 90** (thục luyện mỗi đòn trúng), chiêu **120 cộng điểm**; thục luyện tới tối đa trong **1 giờ** (`PRACTICE`
  trong `formulas/tuning.ts`, ghi đè theo phái / theo chiêu `practiceHours`). NPC Kỳ Trân Các: **Bách Bảo Lão Nhân**.

- **Sát thương theo công thức** (USER bỏ tạm dừng 2026-11-12): chế độ ngẫu nhiên cũ đã gỡ (vòng 31); lực tay, trúng / né,
  chí mạng ×2 / chí tử, kháng + trần, ngũ hành (`seriesdamage_p`), PK × 0,5 — `formulas/damage.ts`, `docs/formulas/damage.md`. Một đường
  cho người chơi, quái, boss. Quái lấy sinh lực / chính xác / né / sát thương theo `standard.lua` (boss sinh lực × 12, CHỌN).
- **Bùa lợi / bùa hại / hào quang / bị động có tác dụng** (USER 2026-11-12): thuộc tính chiêu ở cấp người dùng, mỗi thuộc tính hết hạn theo
  P2 riêng, cộng vào túi thuộc tính; **choáng / chậm / độc / co giật** theo tham số gốc (`formulas/effects.ts`, `docs/formulas/effects.md`).
  Không dùng cách của jx-web-main cho hiệu ứng / tốc độ (người dùng: sai).
- Kỹ năng chia 5 loại: Tấn công, Hỗ trợ, Bùa lợi (gồm hào quang), Bùa hại, Bị động (`core/category.ts`).
- Thiên Vương + Nga My đã rà từng chiêu; 8 phái còn lại chạy nhưng chưa rà (phase 2). Đường Môn (bẫy) đang quá mạnh.
- **Hoa Sơn** là phái thứ 11 (bản mod; index 10 `门派设定.ini`, hệ Thủy, nam + nữ). Tên/mô tả Hán Việt dịch tay trong
  `apps/client/tools/data/huashan.ts` (bảng gốc chỉ có tiếng Trung), công thức ở file rời `jx-origin/script/skill/huashan.lua`.
  Mốc học xếp theo ReqLevel (không có `add_hs`). Phân loại chiêu Hoa Sơn chưa rà. Chân dung `portraits/huashan.png`.
- Mỗi phái có tầng **Thất truyền** (1220–1229, Hoa Sơn 1370; cột 120, nhãn "TT"); mọi người chơi học thêm 3 kỹ năng chung
  210 / 397 / 400 (`learnableSkills('common')`, cột "Khác"). Không thêm chiêu cũ mà bảng học hiện tại không dạy. Không có kỹ năng cấp 70.
- **Mô tả kỹ năng** = `skills/core/describe.ts` (`describeSkill`), dựng như `KSkill::GetDesc` bằng câu gốc `magicdesc.ini`
  (`core/magicdesc.gen.ts`). Chỉ hiển thị, **không** ảnh hưởng sát thương; câu tự viết (không có trong bản gốc) nằm ở `EXTRA_DESC`.
- **Hào quang ở ô tay tự bật** (USER 2026-11-13, vòng 32): skill `aura` (cột `IsAura`) đặt ở ô chuột trái / phải → client gửi `C2S.aura`,
  server `holdSlotAura` (`world/players.ts`) giữ bật, không tư thế / nội lực, cả trong thành (CHỌN); ô phải ưu tiên. Bùa thường (Như Lai
  Thiên Diệp…) vẫn phải bấm. **Tư thế chiêu vũ khí** (`castAnim`, suy luận từ hình): chiêu ngoại công CharAnimId 11 → đi bộ đao / thương
  Attack2, côn Attack1 (chém / bổ xuống), kiếm / chùy giữ Magic; trên ngựa mọi vũ khí cận chiến `RideCut`.
- **Thổ Địa Phù vĩnh cửu** (USER 2026-11-13): mọi nhân vật có 1 (`ensureToken`), về thành của vùng (`nearestTown`, mặc định Biện Kinh).
  **Lệnh bài → Nhận đồ xanh** = cửa sổ Chế tạo miễn phí ở mọi nơi; nút "Ngũ hành theo vũ khí" (`seriesPlan`).
  **Hút sinh lực / nội lực** có tác dụng (`formulas/damage.ts lifeSteal`).
- **Ngựa** (USER 2026-11-13): tốc độ chạy của ngựa chỉ cộng khi đang cưỡi (`equipmentBag` mounted); tốc độ chạy hiển thị số nguyên
  `speedPoints` (10 % = 1, phần lẻ ≥ 0,8 làm tròn lên). Hào quang không hiện đếm ngược.
- **Chat** (USER 2026-11-13): kênh Thế giới `world/chat.ts` + `ui/hud/chat.ts` (bấm vào ô mới gõ được, bấm ra ngoài là thoát — Enter không mở ô chat); reaction 6 emoji (`CHAT.reactions`); lịch sử lưu
  **theo tài khoản** (mỗi người 1 emoji / dòng, bấm emoji = cửa sổ danh sách người thả `ui/windows/chatReacts.ts`) (dòng nhận được khi online, 1000 dòng; kho chung 5000 dòng trong db), tải 30 dòng mỗi lần theo cuộn (`C2S.chatMore`).
  Khung chat là HTML (không vẽ trong canvas). Kênh khác (tổ đội, mật, phe) chưa có.
- **Kênh Hệ thống** (USER 2026-11-13): tab cạnh Thế giới; giết quái + exp, nhặt đồ / lượng, mua / bán / chế tạo (server `hooks.log` →
  `S2C.log`, **không lưu ở server**), đổi bản đồ (client tự ghi). Chỉ lưu ở client: `state/syslog.ts`, 100 dòng mỗi nhân vật trong
  localStorage, mới ở dưới. Thanh kinh nghiệm dưới Nội lực hiện % (cắt, không làm tròn, 2 chữ số). Góc phải đầu khung chat: "N online"
  (`S2C.online`, số nhân vật trên mọi bản đồ). Thanh máu trên đầu người chơi (cả mình): xanh lá, **đỏ khi bật PK** (Chiến đấu / Đồ sát); quái đỏ.
  Thanh phím tắt: số 1–9 đè lên icon, nhãn phím nổi trên mỗi nút chức năng (lấy từ `KEYS`, đổi phím ở `input/keymap.ts` là tự đổi theo).
- **Click trái vào địch = khóa mục tiêu** (`CastMsg.lock`, server đánh lại cho tới khi mục tiêu chết / lệnh khác); chuột phải, phím 1–9 = một lần.
- **Tự động đánh** (phím Z, nút AUTO trên thanh dưới — chuột phải mở tùy chọn, Hệ thống → Tự động đánh): `packages/shared/src/auto/AutoPlay.ts` (tùy chọn `AutoSettings` cùng chỗ) chạy ở client và làm bộ não bot, chỉ gửi lệnh như tay người chơi.
  Tùy chọn trong `settings` (`autoRadius`, `autoSkipBoss`, `autoBuff`, `autoReturn`, `autoHp` / `autoMp` = % để tự uống thuốc).
  Chưa có nhặt đồ / về thành.
- **Cache asset** (PF4 web, USER 2026-11-13, `docs/performance/05-cache-va-phien-ban.md`): mọi URL tới `public/assets` đi qua
  `art/assets.ts assetUrl()` (gắn `?v=` = hash gói trong `manifest.json`); tool sinh asset mới phải gọi `updateManifest([...gói])`
  (`tools/jx/manifest.ts`). Bản build web có Service Worker (`platform/sw/sw.ts`), không chép `public/` vào `dist/`.
- **Bản đồ nhỏ** (USER 2026-11-13): click (hoặc click Bản đồ lớn) = cắm cờ + đường thẳng từ nhân vật tới cờ; cờ tự mất khi tới nơi,
  đứng yên > 1,2 s hoặc đi xa cờ (lệnh khác) — server không báo hết lệnh nên là suy luận phía client (`ui/hud/minimap.ts`).
- **Bot giả lập người chơi** (USER 2026-11-13, cách dùng `docs/bots-guide.md`, thiết kế `docs/bots.md`): tách khỏi phần đo hiệu năng. Tài khoản bot có cờ `UserRecord.bot`; API dev
  `/api/dev/bots` (`dev/botAdmin.ts`, cần `DEV_TOOLS`, chỉ nhận từ cùng máy trừ khi `BOT_API_REMOTE=1`) chỉ đụng tới tài khoản đó. Mẫu
  (`BotTemplate`) áp khi bot vào game lần đầu (`world/botSetup.ts`, dùng lại hàm lệnh bài / gợi ý cộng điểm, đừng viết lại); kịch bản
  (`BotScenario`) ở `tools/bots/data/<tên>.json`, mẫu ở `tools/bots/data/templates/` (có vào git). Bot chạy được trên server dev + `db.json` thật (USER).
- **Con trỏ chuột gốc**: `art/cursors.ts` đặt `--cur-*` (URL tuyệt đối); `ui/kit/theme.css` dùng `--cur-normal` cho cả trang, canvas
  đổi theo đối tượng dưới chuột (`WorldScene.setCursor`).
- **Mọi cửa sổ dùng `ui/kit/dialog.ts`** (khung gốc, kéo thả, Esc đóng cửa sổ trên cùng, Esc khi trống = Hệ thống). Cửa sổ mới:
  `ui/windows/<tên>.ts` (HTML trong file) + `<tên>.css`, `dialogs.register(id)`, tạo trong `ui/hud/Hud.ts`; đừng tự làm khung khác.
- **Giao diện = HTML/CSS, canvas chỉ cho thứ gắn với thế giới** (đề xuất trong `docs/ui-and-platforms.md`, cấu trúc đã làm theo).
  `game/` không import `ui/`; giao diện chỉ nói chuyện với cảnh qua `game/ports.ts` (`WorldUi`, `WorldActions`). Phím tắt chỉ khai báo
  ở `input/keymap.ts`. Công cụ dev nằm trong `dev/`, nạp động nên bản build chính thức không chứa.
- **Đồ rơi trên đất** (BACKLOG VT7, chốt 2026-11-12): tồn tại 60 giây; 20 giây đầu chỉ người đánh chết quái + tổ đội được nhặt.
- **Trang bị lên nhân vật** (vòng 30, `docs/formulas/equipment.md`): đủ bộ hoàng kim môn phái (sau này Thiên Tứ) bật **mọi dòng ẩn của mọi
  món đang mặc** — chỉnh ở `formulas/tuning.ts` `HIDDEN_LINES`; Càn Khôn Giới Chỉ (lệnh bài) cũng bật hết; `allskill_v` cộng cấp chiêu
  (P3 = chiêu, 0 = võ công vốn có), cấp hiệu lực = học + trang bị (`levelOf`), hiện xanh dương; tooltip hoàng kim có danh sách bộ.
  Cửa sổ Kỹ năng: bấm chiêu = popup nhỏ (cộng điểm, tay trái / phải), mô tả chỉ khi rê chuột.
- **Chỉ số trang bị có tác dụng** (TB8): đồ xanh và đồ hoàng kim môn phái; Thiên Tứ và loại khác ghi ở TB17, làm sau.
- **Món đồ cụ thể** (TB1, 2026-11-12): hành trang / ô mặc lưu `Item { uid, def, q?, base?, dur?, magic? }` (`items/items.ts`), `def` = id dòng
  bảng; dữ liệu cũ (id chuỗi) tự chuyển khi nạp. Thêm loại / dòng thuộc tính mới vào `Item`, đừng quay lại lưu chuỗi. 15 ô mặc (thêm
  Mặt nạ, Phi phong, Ấn, Trang sức). Sinh lực / Nội lực không còn cộng tạm theo cấp đồ; chỉ cộng `lifemax_v` / `manamax_v` có trong bảng.
- **Trang bị và Thuộc tính** (GD1, vòng 15): cửa sổ riêng `ui/windows/character.ts` (phím **N** — USER 2026-11-14 đổi từ C do trùng; trước đó bỏ phím hàng F, nút `b-char`) chứa 15 ô mặc + bảng thuộc tính;
  **hành trang là cửa sổ khác** (`inventory.ts`, phím I, nút Vật phẩm). Ô mặc theo kích thước `玩家装备与人物状态_装备.ini`.
- **Hành trang lưới** (TB18, 2026-11-12): 6 × 10 ô 28 px như `随身物品.ini`; món chiếm `ItemDef.size` ô, nằm ở chỉ số ô trên-trái
  (`items/bag.ts`); mọi chỗ thêm món vào hành trang phải dùng `addToBag` / `findPlace` / `roomFor`, đừng tìm ô `null`. Món không vừa khi
  nạp dữ liệu cũ nằm trong `Sim.bagSpill` (lưu kèm nhân vật), không bị bỏ.
- **Đồ xanh / dòng ẩn / Chế tạo** (TB6, TB7, vòng 14): `Item.series` (0 Kim … 4 Thổ) + `Item.magic` theo vị trí: tiền tố (dòng 1, 3, 5)
  luôn hiện; hậu tố cùng hệ món = **dòng ẩn**, xám đến khi kích hoạt (`activeHidden`: mỗi ô kích hoạt tương sinh + hệ nhân vật
  tương sinh = 1 dòng; **suy luận**). Thợ rèn → Chế tạo: chọn món, hệ, từng dòng, giá trị mặc định tối đa; giá = giá bảng × (1 + số dòng)
  (agent chọn). Dòng chưa có tác dụng (TB8).
- **Màu tooltip / ô** (vòng 14): `TIP_COLORS` trong `items/describe.ts` lấy mẫu ảnh SHXT (dữ liệu client không có); viền ô theo `随身物品.ini`;
  nền ô xanh = mặc / dùng được, đỏ sẫm = không. Danh sách bộ hoàng kim (TB13): hiện đủ, món đang mặc xanh lá, món chưa có xám.
- **Quyền nhặt đồ rơi / chạy bảng rơi** (VT9): người đánh chết quái (+ tổ đội), không theo bản gốc (người gây nhiều sát thương nhất).
- **Khinh công** (KN9, người dùng yêu cầu): đang bay thì không nhận sát thương (bản gốc vẫn nhận).
  May mắn (VT10) **chưa quyết**: chờ nghiên cứu VT12 (may mắn + bảng xếp hạng vật phẩm).
- **Hành trang + 4 rương** (USER 2026-11-12, vòng 23): `BAG_PAGES` = 5 trang × 60 ô (`BAG_PAGE_SIZE`), chỉ số = trang × 60 + ô; món không
  vắt qua 2 trang (`items/bag.ts`); tab "Túi / Rương 1–4", kéo món lên tab để chuyển. Click / **chuột phải** = mặc / dùng; chuột phải ô mặc = tháo.
  Nút **Vứt** (click món = ném xuống đất, người vứt nhặt lại được, `throwItem`) và **Bán** (bán 1/4 giá **ở mọi nơi**, không cần NPC).
- **Lệnh bài** (USER 2026-11-12): mỗi nhân vật luôn có 1 (`ensureToken`), chuột phải mở menu: thăng cấp 150, 100 triệu–1 tỷ exp, học hết chiêu
  90 / 120 / 150 ở cấp tối đa, 10000 vạn lượng, chọn bộ hoàng kim môn phái, **đổi phái / đổi giới tính** (điểm tiềm năng + kỹ năng về mặc
  định, giữ đồ + cấp; đổi giới tính vào lại bản đồ). `items/token.ts`, `world/token.ts`, `ui/windows/token.ts`. Không theo bản gốc.
- **PK + tổ đội** (USER 2026-11-12, vòng 25, `docs/pk-and-team.md`): phe theo `门派设定.ini` (chính vàng / trung lập xanh / tà tím / tân thủ
  trắng); PK 3 chế độ (Luyện công / Chiến đấu = khác màu chữ / Đồ sát), không đánh tổ đội; trong đội mọi người mang phe đội trưởng.
  Tổ đội xuyên bản đồ ở `world/teams.ts` (tối đa 8). Đồng minh của chiêu hỗ trợ = cùng đội hoặc cùng phe (`targeting.ts friendly`).
  Phím G tổ đội, K Kỳ Trân Các, B Thợ rèn. Vòng 26: hào quang / bùa lợi diện rộng áp cho người cùng đội / màu chữ; Bế Nguyệt Phất Trần 712
  bật đủ 5 hào quang Nga My (`appendSkills`); **phản đòn** có tác dụng (`damageReturn`).
  Vòng 28: cửa sổ tổ đội = danh sách người chơi trong màn hình + Mời, Giải tán, tự từ chối lời mời; **gợi ý cộng điểm** tiềm năng / kỹ
  năng theo tuyến (`characters/suggest.ts`, `docs/formulas/level.md`); lệnh bài **tẩy tủy** tiềm năng / kỹ năng.
  Exp tổ đội (USER 2026-11-13): người giết quái 100 %, đồng đội ở gần 80 % (`LEVEL.teamExpPct`), người ngoài đội theo sát thương.
- **Chọn / tạo nhân vật** (USER 2026-11-12, vòng 24): hai màn riêng trên hình gốc 800 × 600 (`spr/ui3/登入界面`, `gen:ui` → `assets/ui/login/`):
  chọn = nhân vật đứng (paper-doll gốc, `ui/screens/figure.ts`) + ô "Nhân vật / Đẳng cấp" + nút Xác nhận / Tạo nhân vật (ẩn khi đủ
  `MAX_CHARACTERS` = 3) / Hủy bỏ (đăng xuất); tạo = bố cục `新建角色.ini` (5 nút ngũ hành, nam trái / nữ phải, tên + Xác nhận / Hủy bỏ).
  Màn thu nhỏ khi màn hình < 800 × 600 (`stage.ts`), còn lại 1:1. **Nhân vật chơi gần nhất** lưu ở máy (`vltk.lastCharacter`): mở game
  vào thẳng; chỉ Hệ thống → chọn nhân vật / thoát mới phải chọn lại. Hình nhân vật động riêng của màn gốc (`选存档人物`) không có tên trong
  PAK nên dùng sprite trong game. Chưa có nút Xóa nhân vật (có hình gốc `sel-del`).
- **Auto** (vòng 29, theo jx-web-main, `docs/auto-play.md`): chọn mục tiêu / xoay chiêu / bùa hại / nhặt có lọc / bán đồ thừa / tự đổi bãi
  luyện công theo cấp (`maps/training.ts`, `C2S.train`) / hết thuốc về thành mua / chết tự hồi sinh; không tắt khi đổi bản đồ.
  Vòng 31: quái xa > 1200 thì đi bộ tới; **khoảng cách tiếp cận** `CastMsg.reach` (tầm xa = `autoReachPct` % tầm, cận chiến áp sát);
  bỏ mục tiêu khi kẹt / không mất máu, kẹt lặp lại thì bước sang bên. `castRange` không vượt quãng đạn bay (`missileReach`).
- **Thuốc** (VT1, người dùng chốt 2026-11-12): vật phẩm dùng được đặt lên **phím 1–9** (kéo từ hành trang) hoặc bấm / chuột phải trong
  hành trang. Uống **không có độ trễ**, mỗi bình bơm riêng: giá trị mỗi nhịp và số nhịp theo `potion.txt` (giá trị × thời gian / 10 =
  tổng, khớp mô tả gốc), nhưng **mỗi nhịp 0,2 giây** (`POTION_PULSE_MS`; bản gốc ≈ 0,56 giây). Chết thì dừng bơm. Chỉ bình Sinh lực /
  Nội lực có tác dụng; thể lực, giải độc, thuốc 5 phút chưa có.
- **Tiền** (VT3, 2026-11-12): tiền túi (lượng) server giữ, lưu theo nhân vật; nhân vật mới / cũ chưa có tiền nhận 20000 (quà tân thủ gốc,
  `stringresource.txt` 10016). Cửa hàng NPC bán **giá bảng gốc** (giá do agent chọn theo bảng, người dùng giao), mua nhiều nhất 99 món một lần,
  bán cho NPC = giá / 4; chỉ giao dịch trong thành. Hiệu thuốc (Chủ dược điếm) = danh sách gốc `buysell.txt` dòng 53 bỏ thuốc giải độc.
  Hiển thị theo giao diện gốc (`随身物品.ini`, `买卖确认.ini`): icon ngân lượng, số trơn màu 255,217,78; giá thiếu tiền màu 0,135,133.
  Nút dev "+100 vạn" (chỉ bản dev, server `DEV_TOOLS`) thay cho nguồn kiếm tiền tới khi có rơi đồ.
- **Giá vật phẩm** (USER 2026-11-12): agent tự quyết (ưu tiên giá bảng gốc; món không có giá gốc như bí kíp Kỳ Trân Các 50–300 vạn
  lượng thì agent đặt), ghi giá trong `items/*.ts`, không cần hỏi lại người dùng.
- Ngựa là vật phẩm (ô `horse`), bán ở NPC Bán ngựa theo giá bảng. Âm lượng / tắt tiếng trong Hệ thống → Tùy chỉnh.
- Quái: `npcs.txt` không có cấp, cấp lấy từ file spawn; cấp trong `gen:spawns` chỉ là ước lượng.
- Chưa có: exp/level, điểm tiềm năng, rơi đồ (cả tiền rơi), kho, thuộc tính trang bị, chat, tổ đội, bang hội, hoạt cảnh bản đồ,
  client prediction (danh sách đầy đủ: `tasks/BACKLOG.md`).

## 7. Dữ liệu client gốc `../jx-origin`

Đọc `../jx-origin/CLAUDE.md` trước khi đọc bất kỳ file nào trong đó. Tóm tắt:

- **Thư mục tham khảo đã xóa** (người dùng, 2026-11-12, có virus): `jx1-vs2022-main` (mã engine fork), `jx1-gameplay-research`
  (ghi chép 01–09), `jxdocs-master`. Trích dẫn tới chúng trong `docs/`, `tasks/` là nguồn lịch sử, không mở lại được. Bảng tên thuộc tính
  (mã → `lifemax_v`…) nay đọc từ exe của client: `apps/client/tools/jx/magicattr.ts` (chỉ tin mã ≤ 176; trên đó bản SHXT có thuộc
  tính mới chưa xác định tên). Bảng cũ của engine fork lệch ở mã 140–176 — tài liệu hoàng kim sinh trước đó đã sai, đã sinh lại.
- **Nguồn dữ liệu duy nhất cho tool**: `data_extract/` (28 PAK giải nén, khoảng 7,1 GB; chỉ mục `data_extract/index.md`;
  `_manifest.tsv` mỗi PAK, dòng có `overridden_by` rỗng = bản game dùng). Giải nén PAK: `python3 tools/jxpak/jxpak.py all` (cần `gcc`).
  Tool nào cần gói PAK nào (và cách giải nén một phần bằng `--paks`): `docs/regenerate-assets.md` mục "Gói PAK nào cần cho tool nào".
- **Ngoại lệ (người dùng đồng ý 2026-11-12, BACKLOG TB0):** bảng không có trong `data_extract` thì tool được đọc file rời
  `jx-origin/settings/item/` (bản mod SHXT): `goldequip`, `platinaequip`, `magicattrib_ge`, `magicattriblevel`, `mask`, `mantle`,
  `magicscript`, `platina_*`… Ghi rõ trong tool / tài liệu là bảng mod. Ví dụ: `apps/client/tools/doc-gold.ts`.
- Bảng gốc: `data_extract/slistcache/settings/` (`skills.txt`, `npcs.txt`, `missles.txt`, `magicdesc.ini`, `item/…`, `npcres/…`).
  Bảng `settings/` loose trong thư mục client là **bản mod** (khác bản gốc); công thức kỹ năng theo cấp ở `script/skill/<phái>.lua`
  (cú pháp Lua 4.0, mảng `{{cấp, giá trị},...}` nội suy tuyến tính).
- **Mã hóa: không có UTF-8.** Tiếng Việt là TCVN3 (chữ hoa A1–A7 = Ă Â Ê Ô Ơ Ư Đ), tiếng Trung là GBK. Dùng `tools/jx/source.ts` (`tcvn3()`, `readTable()`) hoặc
  `iconv -f gbk -t utf-8 -c`. **Đọc thôi, không ghi ngược** vào file client.
- **Không đọc `config.ini` của client** (chứa mật khẩu lab dạng plaintext).
- `../jx-origin/document/*.md` chỉ là tóm tắt, **có nhiều chỗ sai**; ưu tiên bảng gốc. Tài liệu đã kiểm chứng:
  `jx-origin/document/combat_damage_and_status_effects_research.md` (sát thương nguyên tố, lực tay, hiệu ứng) và
  `docs/combat_effects_worked_examples.md`.
- Server game gốc **không nằm trong client** (chạy trong VMware). Công thức chỉ số / trúng / sát thương / exp / may mắn đã tổng hợp
  trong `docs/combat-formulas.md`, có ghi nguồn: dữ liệu client, mã nguồn engine JX1 ở `jx1-vs2022-main` (đã xóa) (bản fan sửa từ mã bị lộ,
  chỉ đọc để lấy cơ chế, không chép code) và bài viết thời JX1. Mục "cần kiểm chứng" ở cuối tài liệu đó.

## 8. Kiến thức nền JX1 đã xác minh

- Tốc độ game gốc: **18 tick/giây** (`18*45` = 45 giây trong script).
- **Id trang bị → hàng bảng bộ phận = part id − 2.** Thứ tự vẽ theo hướng dùng `Dir(d+1)` (8 hướng).
- **Phiêu Vũ** (bảng gốc ghi "Phiên Vũ") = hàng ngựa 11 = bộ sprite `ma_h*_012_*` (không phải 013).
- Id bản đồ khớp client gốc: 37 = Biện Kinh, 140 = Dược Vương Cốc. Kỹ năng 120 = id 708–717; 150 ≈ 1055–1110.
- Quái dùng chiêu như người chơi: `npcs.txt` có `Skill1–4` + `Level1–4`, `AuraSkillId`, `PasstSkillId`.
- **SPR header `Reserved[1]` (byte 22) = 1** = hiệu ứng nền đen, vẽ cộng sáng (59/59 file nền đen có cờ, 0/212 file khác có; engine
  mình có không dùng trường này nên là suy luận từ dữ liệu). Nền của chúng là xám (4,4,4)/(8,8,8) chứ không phải 0: `gen:skills` trừ
  mức đó đi, nếu không khí trường đứng lâu (Long Toàn / Ma Vân Kiếm Khí) chồng nhiều lớp sẽ lộ ô vuông.
- `stun_p` (P1 xác suất %, P2 thời lượng tick), `colddamage_v` (P2 = thời gian chậm), `poisondamage_v` (P1 mỗi nhịp, P2 tổng, P3 chu kỳ);
  `…timereduce_p` có thể âm (kéo dài). Chi tiết trong tài liệu nghiên cứu ở trên.

## 9. Dựng lại asset / nén codebase

Xem `docs/regenerate-assets.md`. Tóm tắt: nén codebase bỏ `node_modules`, `.git`, `public/assets/{char,npc,items,skill,maps}`;
trên máy mới chạy `npm install`, giải nén PAK, rồi `gen:assets`, `gen:skills`, `gen:ui`, `gen:sounds`, `gen:gold` (icon hoàng kim / lệnh bài), `gen:maps -- 37 140`.
Nhạc nền do `gen:sounds` chép từ `jx-origin/music/`. `portraits` (11 PNG; `huashan.png` cắt từ ảnh chụp trong game)
**không có tool sinh**.

## 10. Môi trường

WSL, repo nằm trên ổ Windows `/mnt/e` (I/O chậm, không có sự kiện file-watch). Shell mặc định là zsh: glob không khớp sẽ báo lỗi,
nhớ đặt dấu nháy quanh `*.ts` khi truyền cho `grep --include`. Không có Wine nên không chạy được client gốc.
