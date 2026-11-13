# Nhật ký các vòng làm việc

Mới nhất ở trên. Mỗi vòng: người dùng yêu cầu gì → đã làm gì → commit.

## 2026-11-13 · Hướng dẫn bot + rà soát tool sinh asset (sau vòng 35, chưa commit)

- Người dùng: viết lại cách dùng bot ngắn gọn, có ảnh chụp, dẫn vào `CLAUDE.md` / `AGENTS.md`. → `docs/bots-guide.md` + `docs/images/bots/`
  (4 ảnh WebP, chụp trên server thử `:2569` DB nháp).
- Người dùng: rà tool nào không chạy và sửa. → chạy thật đủ 14 tool / lệnh: tất cả exit 0, sinh lại `*.gen.ts` khớp git. Sửa: `gen:skills`
  tìm hình ở thư mục khác khi tên duy nhất (đạn 139 Truy Tinh Trục Nguyệt có hình bay); biến thừa trong `gen-maps.ts` (typecheck tool sạch).
  Báo thiếu của `gen:assets` (≈4 700), `gen:sounds` (121), `gen:skills` (5) đã tra theo tên + mã băm PAK + `jx-web-main`: dữ liệu gốc thiếu thật.
  Tài liệu: `gen:gold` là tool duy nhất sinh icon hoàng kim / bí kíp / Lệnh bài / Thổ Địa Phù → thêm vào quy trình máy mới; thêm
  `gen:player` / `gen:drops` / `audit:skills` / `doc-gold`, gói PAK, file mod rời, dung lượng mới (`docs/regenerate-assets.md`, `AGENTS.md`, `README.md`).

## 2026-11-13 · Bot giả lập người chơi (vòng 35, nhánh `feature/bots`)

- Người dùng: cần trang cài đặt bot + lệnh chạy theo cài đặt; **tách bot (giả lập người chơi) khỏi đo đếm**; bot chạy được trên server
  dev + `db.json` thật; làm bot trước. Làm song song với phiên PF4 nên dùng worktree riêng.
- `AutoPlay` chuyển sang `packages/shared/src/auto/` (+ `AutoSettings`, `approachDistance`); client `Settings` mở rộng `AutoSettings`.
- `packages/shared/src/bots/`: `BotTemplate`, `BotScenario`, kiểm tra / mặc định, chia hành vi theo tỉ lệ.
- Server: API `/api/dev/bots` (`dev/botAdmin.ts`: tạo / đặt lại / xóa / token / file mẫu + kịch bản trong `bots/`), cờ `UserRecord.bot`,
  `CharacterRecord.bot`; `world/botSetup.ts` áp mẫu khi bot vào game lần đầu (hàm lệnh bài + gợi ý cộng điểm).
- Runner `npm run bots -- <kịch bản>` (`dev/bots.ts` + `dev/bots/`): 6 kiểu hành vi, nhịp giống người, tự vào lại, trạng thái mỗi 10 s;
  chế độ cũ `<số> <giây>` giữ ở `legacy.ts`. Trang `/?bots` (`dev/bot-panel/`).
- Kiểm chứng trên server thử nghiệm `:2569`: 6 bot cấp 99–120 mặc đủ bộ hoàng kim, 21 bot đủ 6 kiểu hành vi 40 s không lỗi, trang thử bằng
  Playwright. `docs/bots.md` viết lại theo hai phần; BACKLOG §10: BT0, BT2–BT4 xong, thêm BT9 (kịch bản đo).

## 2026-11-13 · Cache asset phần web (PF4) + cờ bản đồ nhỏ (vòng 34)

- Người dùng: "triển khai" phương án cache (`docs/performance/05-cache-va-phien-ban.md`), sau đó làm bot. → `art/assets.ts assetUrl()`
  thay mọi chỗ ghép URL; `packages/shared/src/assets.ts` (gói: core = ui + portraits + sound, char, npc, skill, items, music, map/<id>);
  `tools/jx/manifest.ts` + `gen:manifest`, các `gen:*` tự cập nhật `public/assets/manifest.json` (hash nội dung, nhớ hash theo cỡ + mtime);
  `app/App.ts` nạp manifest đầu tiên (mất mạng dùng bản lưu); Service Worker `platform/sw/sw.ts` (cache-first theo gói + phiên bản,
  IndexedDB chỉ mục, ngân sách + dọn bản đồ cũ rồi LRU, tải trước core) + `platform/assetCache.ts`; build `assetsDir: 'app'`,
  `copyPublicDir: false`, `vite preview` gửi header cache; Tùy chỉnh → Bộ nhớ đệm + nút Xóa. Đo Playwright: lần 2 mở trang 217 / 218
  request `/assets` từ SW, 300 byte qua mạng (lần 1: 22 MB).
- Người dùng: click bản đồ nhỏ phải cắm cờ ở điểm đến + đường thẳng từ nhân vật tới cờ. → `ui/hud/minimap.ts` (cả click Bản đồ lớn).

## 2026-11-13 · Icon kỹ năng luôn có màu (vòng 33c)

- Người dùng: cửa sổ Kỹ năng đừng bôi xám icon; xám chỉ ở thanh phím tắt. → `skills.css` bỏ lọc xám của `.unlearned` (cấp 0) và
  `.blocked` (vũ khí không dùng được); thanh phím tắt giữ xám khi vũ khí không hợp.

## 2026-11-13 · Bỏ phím hàng F (vòng 33c)

- Người dùng: bỏ hàng phím F (có bàn phím khó bấm). → Trang bị và Thuộc tính đổi F3 → **C** (`input/keymap.ts`; bỏ capture F3 ở
  WorldScene); nhãn trên thanh phím tắt, tooltip, bảng Phím tắt trong Tùy chỉnh tự đổi theo. Không còn phím F1–F12 nào.

## 2026-11-13 · Số phím tắt trên thanh phím tắt (vòng 33b)

- Người dùng: số 1 → 9 phải hiện trước cả icon chiêu cho dễ nhìn; bên phải cũng hiện phím tắt nổi lên (Q W E R hoặc agent gợi ý).
  → `quickbar.ts/css`: ô 1–9 có chiêu / vật phẩm hiện số vàng góc trên-trái, đè lên icon (ô trống đã có số trong ảnh gốc); mỗi nút chức
  năng có nhãn phím nổi ở góc trên-phải, lấy từ `input/keymap.ts` (F3, I, F, M, P, B, Z, G, K, Esc). **Giữ phím cũ, không đổi sang
  Q W E R** (agent chọn: phím đã quen, Q W E R để dành cho chiêu sau này).

## 2026-11-13 · Gọn khung chat (vòng 33b)

- Người dùng: tab Thế giới / Hệ thống, "online" và Kỳ Trân Các xếp chưa hợp lý. → `chat.css`: đầu khung chat thành một dải liền
  (tab · online · nút thu gọn) dính vào thân; thu gọn = chỉ dải đó, rộng vừa nội dung; khung đặt sát trên thanh phím tắt
  (`bottom = 92px × --qb + 4px`). Nút thu gọn "–" / "+"; bấm tab khi đang thu gọn thì mở ra. Nút Bảo Vật giữ chỗ gốc (đầu phải thanh).

## 2026-11-13 · Số người online + màu thanh máu (commit cùng vòng 33)

- Người dùng: hiện tổng người online ở kênh Thế giới (góc trên phải, "4 online"); thanh máu trên đầu người chơi luôn xanh lá, chỉ đỏ khi
  bật chế độ chiến đấu. → `world/chat.ts` gửi `S2C.online { n }` (tổng nhân vật online mọi bản đồ) mỗi khi vào / rời, MapRoom gửi thêm
  cho người mới vào; `ui/hud/chat.ts` hiện "N online" cạnh nút thu gọn. `ActorView` thanh máu: người chơi xanh lá (cả mình, trước là
  vàng với người khác), `pk > 0` đỏ; quái đỏ như cũ. Thử Playwright: 1 → 2 online, đổi bản đồ giữ 2, thoát về 1.

## 2026-11-13 · Thanh % kinh nghiệm, kênh Hệ thống, chat bấm để gõ (vòng 33)

- Người dùng: thanh % kinh nghiệm dưới Nội lực; kênh **Hệ thống** cạnh Thế giới ghi đánh quái, nhặt đồ, nhặt lượng, chuyển bản đồ,
  mua / bán — chỉ lưu ở frontend, tối đa 100, mới ở dưới; chat phải bấm vào ô mới gõ, bấm ra ngoài thì mất focus; style lại theo game.
- Làm: `vitals.ts` thanh exp cao 12 px như HP / MP, chữ `xx.xx%`. Server `WorldHooks.log` → `S2C.log` (`LogMsg { kind, text }`) ở
  `progress.ts shareKillExp` (người giết: "Đánh bại X (cấp N): +exp", đồng đội / người góp sát thương: dòng exp), `drops.ts pickup`,
  `inventory.ts` mua / chế tạo / bán. Client `state/syslog.ts` (localStorage `vltk.syslog.<tên>`, 100 dòng, ghi gộp 0,5 s), `Hud.ts`
  ghi "Vào bản đồ". `ui/hud/chat.ts`: 2 tab (ảnh tab gốc), chấm vàng khi tab ẩn có dòng mới, nhớ tab đang mở; bỏ Enter mở chat,
  `pointerdown` (capture) ngoài ô chat → blur. `chat.css` viết lại theo màu theme (khung teal, chữ viền đen, màu theo loại dòng).
- Thử Playwright: Enter không focus, click focus, click bản đồ blur; mua / đổi bản đồ / giết Hươu Đốm / nhặt Thục Cẩm y / Auto về
  thành mua thuốc đều ra dòng; lưu 7 dòng localStorage; exp 65.00 %. Thông báo giữa màn hình (mua / bán / nhặt lượng) giữ nguyên.

## 2026-11-13 · tài liệu bot + hiệu năng server (chưa commit, không có code)

- Người dùng: dự án để đánh giá hiệu suất / ổn định; hỏi Redis có tách luồng được không (trả lời: không, chia theo bản đồ khi cần); muốn
  trang web cài đặt + tạo tài khoản bot, `npm run bots` chạy theo cài đặt. → Viết `docs/bots.md` (hiện trạng bot / PERF, thiết kế
  `/?bots` + API dev + runner, danh sách cài đặt, số đo, cách đo chính xác, chỗ có thể nghẽn), nhóm **BT0–BT8** trong `BACKLOG.md` §10;
  liên kết từ AGENTS.md, README.md, `docs/performance/README.md`.

## 2026-11-13 · Lệnh bài trong Kỳ Trân Các (vòng 33)

- Người dùng: bán lệnh bài cho GM ở Kỳ Trân Các giá 1 lượng → `SHOP_ITEMS.kytran` thêm `TOKEN_ITEM` (giá 1, bán lại 0). Mua như món
  khác của Kỳ Trân Các (trong thành, `buyItem`).

## Vòng 32 — 2026-11-13 · tư thế chiêu vũ khí, hào quang tự bật, hút sinh lực, Thổ Địa Phù, ngựa, chat · commit `git log -1`

- Người dùng: chiêu đao / thương trên ngựa vẽ tư thế buff; hào quang (La Hán Trận, Lưu Thủy…) đặt ô trái / phải phải tự bật, chiêu
  như Như Lai Thiên Diệp vẫn phải bấm.
- Đã xác minh: `CharAnimId` = cột của bảng `男主角(未)骑马关联表.txt` (9 Attack1, 10 Attack2, 11 Magic); trên ngựa Magic = `RideMagic`
  (giơ vũ khí lên), còn đi bộ `MeleeWMagic` là động tác chém. **Suy luận**: chiêu ngoại công (`IsPhysical`) có `EqtLimit` 0–3 (kiếm / đao /
  côn / thương) mà tư thế Magic thì trên ngựa dùng `RideCut` (`castAnim(s, mounted)`, `skills/core/info.ts`). Ám khí Đường Môn, chiêu nội
  công giữ `RideMagic`. Thời gian tư thế giữ như cũ.
- Hào quang = cột `IsAura` (La Hán Trận, 6 hào quang Nga My, Thất Tinh Trận, Vô Hình Độc; Như Lai Thiên Diệp không phải). `C2S.aura`:
  client gửi hào quang ở ô tay (phải ưu tiên, rồi trái); server `holdSlotAura` giữ bật mỗi tick (không tư thế, không tốn nội lực, cả trong
  thành — CHỌN), tắt khi vũ khí / ngựa không hợp, tự bật lại sau khi hồi sinh / đổi bản đồ. Click ô hào quang = đánh bằng chiêu tay kia
  (hoặc Công kích vật lý); Auto không coi hào quang là chiêu đánh; bấm hào quang khác ở phím 1–9 bị chặn khi ô tay đang giữ hào quang.
- Kiểm chứng: `typecheck`; script tạm chạy `World` (bật / đổi / tắt hào quang, chặn bấm tay, tư thế 19 trên ngựa = attack, đi bộ = cast);
  ảnh ghép sprite `RideMagic` / `RideCut` / `MeleeWMagic`. Chưa chạy trình duyệt.
- Phần 2 (cùng ngày, người dùng: đi bộ chiêu đao lại "xuất chưởng"): dựng ảnh mọi tư thế 5 loại vũ khí × đi bộ / ngựa. Đi bộ: đao Magic =
  xuất chưởng, Attack2 = giơ cao chém xuống; thương Attack2 = bổ xuống; côn Attack1 = bổ xuống; chùy cả 3 cột đều vung; tay không đúng.
  → `castAnim`: chiêu ngoại công có tư thế Magic dùng đao / thương → Attack2, côn → Attack1 khi đi bộ; mọi vũ khí cận chiến → RideCut trên ngựa;
  kiếm / chùy đi bộ giữ Magic.
- **Hút sinh lực / nội lực** chưa từng được áp (không có trong mã / lịch sử git, chỉ có dữ liệu + mô tả): thêm `lifeSteal`
  (`formulas/damage.ts`, trần `STEAL.maxPct` 50 %) = `steallife_p` / `stealmana_p` của chiêu + `steallifeenhance_p` / `stealmanaenhance_p`
  của vũ khí / bùa, áp trong `applyHit` (đòn trực tiếp, không độc / phản đòn).
- **Thổ Địa Phù vĩnh cửu** (`items/books.ts`, icon gốc `obj_townportal.spr` qua `gen:gold`): mọi nhân vật có 1 (`ensureToken`), chuột phải
  → thành của vùng (`maps/index.ts nearestTown`: Tây Bắc Phượng Tường, Tây Nam Thành Đô, Hoa Bắc Biện Kinh, Trung Nguyên + Lưỡng Hồ Tương
  Dương, Giang Nam Lâm An; còn lại / bản đồ chưa dựng → Biện Kinh), không mất khi dùng.
- **Lệnh bài → Nhận đồ xanh**: mở cửa sổ Chế tạo ở chế độ lệnh bài (miễn phí, mọi nơi; server kiểm tra có lệnh bài). Cửa sổ Chế tạo có nút
  **Ngũ hành theo vũ khí** (`items/magic.ts seriesPlan`: thử mọi tổ hợp 10 ô, vũ khí đang mặc cố định) + dòng phương án cả bộ.
- Phần 3: hình hào quang dưới chân luôn vẽ **sau** thân nhân vật (trên bóng đổ, `StateDecor` depth y − 0,5); bỏ icon trạng thái trên đầu
  nhân vật (HUD góc trên trái `ui/hud/status.ts` đã có sẵn).
- Hình dưới chân nâng lên 10 px (`StateDecor` `FOOT_LIFT`, chỉnh bằng mắt theo ảnh người dùng gửi).
- Phần 4: **ngựa chỉ cộng tốc độ khi cưỡi** (`equipmentBag(…, mounted)` bỏ ô Ngựa khi đi bộ; trước đó cộng cả khi xuống ngựa, còn khi cưỡi
  thì tính hai lần vì `updateSpeed` nhân thêm `horseSpeed`; nay chỉ còn `fastwalkrun_p` của ngựa qua túi thuộc tính, lên / xuống ngựa
  tính lại chỉ số). **Tốc độ hiển thị số nguyên** `speedPoints` (% / 10, phần lẻ ≥ 0,8 làm tròn lên): F3, tooltip ngựa, cửa hàng ngựa.
  **Bùa vô hạn**: `stateDurationMs` coi P2 −1 là vô hạn cả trạng thái → Như Lai Thiên Diệp, Túy Điệp Cuồng Vũ không bao giờ hết / không đếm
  ngược; nay −1 = theo trạng thái. **Hào quang không đếm ngược** (`StateApply.aura`, `stateList` gửi 0). **Chế tạo**: chọn Loại (Kiếm, Đao,
  Bổng, Thương, Chùy, Song đao; ám khí) + Cấp (mặc định cấp cao nhất nhân vật mặc được).
- **Kênh chat Thế giới** (người dùng yêu cầu, GD2 phần 1): `world/chat.ts` (mọi phòng bản đồ, 120 ký tự, 1,5 giây / dòng, giữ 30 dòng gửi khi
  vào bản đồ), `C2S.chat` / `S2C.chat`, client `state/chat.ts` + `ui/hud/chat.ts` (góc dưới trái, Enter để gõ, Esc thoát, thu gọn được).
  Thử trên trình duyệt thật 2 nhân vật (Playwright, server 2568): tin qua lại, HTML hiện nguyên chữ.
- **Reaction emoji** cho dòng chat (USER): 👍 ❤️ 😂 😮 😢 😡 (`CHAT.reactions`); "☺+" khi rê chuột (luôn hiện trên màn cảm ứng) mở bảng
  chọn, bấm chip = thả / gỡ, rê chip = ai đã thả; `C2S.chatReact` / `S2C.chatReacts`. **Lịch sử chat theo tài khoản** (USER): db giữ 2000
  dòng gần nhất (kèm reaction, `DbShape.chat`), mỗi tài khoản giữ id của 200 dòng nó nhận khi online (`UserRecord.chat`), vào bản đồ thì
  gửi lịch sử của chính tài khoản đó. Thử Playwright: 2 người thả / cộng / gỡ đồng bộ; khởi động lại server vẫn còn lịch sử + reaction;
  tài khoản thứ 3 (offline lúc đó) không thấy dòng cũ. Chromium thử nghiệm thiếu font emoji (hiện ô vuông), máy thật có font thì bình thường.
- **Lịch sử chat tải theo cuộn** (USER): vào bản đồ nhận 30 dòng mới nhất (`CHAT.page`), cuộn lên đầu khung → `C2S.chatMore { before }` →
  `S2C.chatOlder { lines, done }` (30 dòng cũ hơn), chèn lên trên giữ nguyên chỗ đang đọc, hết thì "— Hết lịch sử —"; tài khoản giữ 1000
  dòng, kho chung 5000. Khung bám dòng mới nhất (cả khi HUD chưa hiện: ResizeObserver). Tin ngày khác hiện kèm ngày. Thử Playwright với 75
  dòng dựng sẵn: 30 → 60 → 75, vị trí đọc giữ nguyên. Người dùng hỏi chat có cần ở canvas không: đã là HTML (`ui/hud/chat.ts`).
- **Reaction kiểu Facebook** (USER): mỗi người 1 emoji / dòng (chọn emoji khác = thay, chọn lại = gỡ; `chatReact`), bảng chọn đánh dấu
  emoji của mình; bấm chip emoji → cửa sổ `ui/windows/chatReacts.ts` (tab "Tất cả N" + từng emoji, danh sách tên, "(bạn)"), Esc đóng
  (`dialog.ts`). Thử Playwright 2 người: thả / đổi / gỡ, cửa sổ đúng, Esc đóng.

## 2026-11-13 · tài liệu hiệu năng tải tài nguyên (commit riêng trước vòng 32, không có code)

- Người dùng: web không tải nổi hàng trăm MB / 15 GB asset; hỏi hướng tối ưu, rồi chọn làm đo lường, giới hạn bộ nhớ texture, tải theo
  ưu tiên, cache (nhấn mạnh cache, và đánh giá lúc đầu tải trước gì / sau đó lưu đệm gì); yêu cầu tài liệu đánh số trong một thư mục riêng.
- Đọc mã: bản đồ đã tải / gỡ theo vùng (`MapView`); sheet nhân vật / quái / hiệu ứng / icon tải khi cần nhưng **không bao giờ gỡ** (kể cả
  khi đổi bản đồ); mỗi actor xin 9 động tác; actor ngoài màn hình cũng tải; hai bộ tải FIFO không ưu tiên; chưa có phiên bản / cache.
- Viết `docs/performance/` (README + 01–05) và nhóm **PF** trong `tasks/BACKLOG.md` §9 (PF0 xong = phân tích; PF1–PF4 chưa làm).

## Vòng 31 — 2026-11-13 · Auto tiếp cận / chỗ kẹt, dọn codebase · commit `db43168`, `6a3ad06`

- Người dùng: Auto đánh mà không gây sát thương, cận chiến phải áp sát, cần cài đặt phạm vi tiếp cận, bắt đầu chậm, không tránh vật cản,
  tự khắc phục chỗ kẹt; rà codebase cho gọn; hỏi về database.
- Đo bằng bài thử không trình duyệt (World + AutoPlay, 11 phái × 3 chiêu): quái gần nhất xa hơn 1600 → server bỏ lệnh khóa → đứng yên
  (5 / 9 chiêu thử 0 trúng); 24 chiêu đạn bay ngắn hơn AttackRadius. Sau khi sửa 32 / 33 đánh chết quái, đứng yên lâu nhất 0,8 s.
- Làm: đi bộ tới quái xa, `CastMsg.reach` + `autoReachPct` / `autoMeleeClose` (cửa sổ Auto → Tiếp cận quái), `missileReach` giới hạn
  `castRange`, bỏ mục tiêu khi kẹt / không mất máu + bước sang bên, Auto nhanh hơn (`docs/auto-play.md`). Trình duyệt: Thiên Vương 150 áp
  sát 40, trúng sau ~2 s; chết → tự hồi sinh → mua thuốc → về bãi chạy được (trước đây chưa thử).
- Dọn (agent rà + `tsc --noUnusedLocals`, nay bật luôn trong tsconfig): gỡ chế độ sát thương ngẫu nhiên, `resist` / hp / mp không dùng,
  9 export chết, `PkMsg.on`; `skillbar.levelOf` (client tính nội lực / tầm / sát thương theo cấp thật như server); `WorldActions` dựng
  một lần; server `env.ts` + `devTools()` (lệnh dev đổi cấp chiêu nay cần DEV_TOOLS — trước đó ai cũng gửi được); `inventoryOp` /
  `progressOp` gọn; tooltip tự tắt khi đóng cửa sổ; chữ "chưa có tác dụng" của trạng thái đã bỏ; sửa tool `audit:skills` (hỏng từ trước)
  và sinh lại `docs/skills-audit.md` (241 / 247; 6 chiêu Hoa Sơn ⚠️).

## Vòng 30 — 2026-11-13 · thuộc tính hoàng kim lên nhân vật, Càn Khôn Giới Chỉ, popup kỹ năng, ngoại hình hoàng kim

- Người dùng: đủ bộ chưa bật hết dòng ẩn; không có danh sách bộ; dòng tăng kỹ năng không có tác dụng; thêm Càn Khôn Giới Chỉ hiện hết dòng
  ẩn; cấp chiêu vượt 20 / 30 màu xanh dương; bỏ mô tả khi bấm chiêu (popup nhỏ). Sau đó: đủ bộ hoàng kim / Thiên Tứ bật dòng ẩn của mọi món
  (cài đặt được); áo hoàng kim Thiếu Lâm không hiện.
- Nguyên nhân: tooltip ô mặc không tính đủ bộ; danh sách bộ không có trong mã; `allskill_v` không cộng cấp và tooltip lấy nhầm P1 làm mã
  chiêu; `goldequipres.txt` trống mã bộ phận 8 món.
- Làm: `HIDDEN_LINES`, `wornActiveCount`, `equipSkillBonus` + `levelOf` (như jx-web-main), `SkillsMsg.bonus`, Càn Khôn Giới Chỉ (dòng
  428 bảng mod: không thể phá hủy + võ công vốn có +2, thêm bật dòng ẩn), ngoại hình mượn món thường cùng loại (`gen:gold`) + `gen:assets`.
- Thử: đủ bộ Hám Thiên → 0 dòng xám, danh sách 5/5; cấp chiêu 19 + 1 (18 + 4 với chiêu riêng), đeo nhẫn → 19 + 3; 76 / 76 ngoại hình
  hoàng kim có sprite.

## Vòng 29 — 2026-11-13 · Auto theo jx-web-main

- Người dùng: Auto tự đánh, tự tìm quái, tự nhặt, tự chọn bản đồ như jx-web-main. Một agent đọc mã jx-web-main (số liệu trong
  `docs/auto-play.md`). Bảng bãi của jx-web-main không khớp cấp quái ở đây → chọn bãi từ file quái (`bestTrainingMap`).
- Thử: cấp 150 bật Auto trong Biện Kinh → tự sang Mạc Cao Quật (quái 101–109), đánh + uống thuốc liên tục 4 phút.

## Vòng 28 — 2026-11-13 · sửa màu ô / mặc đồ sau khi cộng tiềm năng, tổ đội theo màn hình, gợi ý cộng điểm, tẩy tủy

- Lỗi: cộng đủ Sức mạnh vẫn "Cần 135 Sức mạnh" và ô không xanh — hành trang giữ chỉ số lúc vẽ (không vẽ lại khi S2C.stats đổi), lần vẽ đầu
  có thể chưa có nhân vật. Sửa: lấy chỉ số lúc bấm, vẽ lại khi cấp / sức / thân / phái đổi, khi mở hành trang, khi nhân vật đã đồng bộ.
- Tổ đội: danh sách người chơi trong màn hình (camera), Mời / Đồng đội / Đã có đội; Giải tán; tự từ chối lời mời; hỏi lại trước khi mời
  ra / bổ nhiệm (như jx-web-main).
- Gợi ý cộng điểm (tuyến + tỷ lệ của jx-web-main), lệnh bài Tẩy tủy tiềm năng / kỹ năng.
- Thử Playwright: tẩy tủy → gợi ý tiềm năng (Sức 445 / Thân 137 / Sinh khí 248) → bộ hoàng kim Thiên Vương xanh, chuột phải mặc được; gợi ý
  kỹ năng dùng hết điểm; danh sách người chơi xung quanh hiện người cùng bản đồ.

## Vòng 27 — 2026-11-13 · kinh nghiệm tổ đội

- Người dùng: làm đơn giản — người giết quái 100 %, còn lại trong đội 80 % kể cả người không đánh.
- `shareKillExp(w, monster, killer)` + `LEVEL.teamExpPct = 80`; đồng đội phải đứng gần quái (768, như chia exp gốc — agent chọn).
- Thử: quái 435 exp → người giết 435, đồng đội không đánh 348, người ngoài đội đánh 40 % được 174, đồng đội ở xa 0.

## Vòng 26 — 2026-11-13 · bùa lợi / hào quang cho người cùng màu chữ, phản đòn, Bế Nguyệt Phất Trần

- Người dùng: rà xem bùa lợi có ảnh hưởng người cùng màu chữ ở gần (La Hán Trận phản đòn, Nga My tăng tốc / máu, Nga My 120 vừa đánh vừa
  hồi máu), bùa hại Thiên Nhẫn / Côn Lôn / Ngũ Độc; có thì áp dụng.
- Engine đã có bùa diện rộng theo cờ `TargetAlly` / `TargetEnemy`; đồng minh nay = cùng đội hoặc cùng phe (vòng 25). Thêm: phản đòn
  (`damageReturn`), 712 bật 5 hào quang (script `emei.lua` emei120_1–4; `gen:skills` chỉ giữ 1 `skill_appendskill`). Chiêu "vừa đánh vừa
  hồi máu" là 1114 (150) → 1115, đã chạy sẵn. Bảng chi tiết: `docs/pk-and-team.md`.
- Thử ở server: Nga My 712 → Võ Đang cạnh bên nhận 6 trạng thái, Ngũ Độc không; La Hán Trận cấp 20 phản 200 / 1000.

## Vòng 25 — 2026-11-13 · PK theo màu chữ, tổ đội, phím tắt

- Người dùng: PK theo màu chữ (chính / tà / trung lập), trong tổ đội mang màu đội trưởng, có tổ đội (như jx-web-main), phím tắt cho thanh
  dưới và tổ đội.
- Phe từng phái: DATA `settings/faction/门派设定.ini` (Camp=). Màu chữ, luật PK: engine, không có dữ liệu → theo mô tả người dùng / bản gốc.
- Thử: 2 trình duyệt, mời + đồng ý xuyên bản đồ (37 ↔ 140), tân thủ mang phe đội trưởng, rời đội về tân thủ; 9 trường hợp `pvpAllowed`.

## Vòng 24 — 2026-11-13 · màn chọn / tạo nhân vật theo hình gốc, nhớ nhân vật cuối

- Người dùng: lưu nhân vật chọn cuối (mở game vào thẳng, chỉ thoát mới chọn lại); làm lại màn chọn nhân vật, đủ thì ẩn nút tạo, màn tạo
  là màn khác; tìm hình gốc trong SHXT.
- Hình gốc tìm thấy trong `spr/ui3/登入界面/` (nền `登入-底图2.jpg`, khung `登入-新建角色2.spr`, nút `选存档角色按钮/*`, `新建角色按钮/*`,
  ô `角色信息窗口`), bố cục `ui/ui3/新建角色.ini`; màn chọn gốc không có `.ini` (bố cục agent đặt). `gen:ui` xuất vào `assets/ui/login/`.
- Thử Playwright: chọn (nhân vật đứng, ô thông tin, 3 nút), tạo (đổi hệ / giới), vào game, tải lại trang → vào thẳng nhân vật cũ (~1,4 s).

## Vòng 23 — 2026-11-12 · lệnh bài, 4 rương, Auto nhặt đồ / tìm quái, chuột phải, Vứt / Bán

- Người dùng: lệnh bài (cấp 150, exp 100 triệu–1 tỷ, học chiêu 90/120/150 bỏ qua luyện, 10000 vạn lượng, chọn bộ hoàng kim, đổi phái,
  đổi giới tính — điểm về mặc định, giữ đồ + cấp); hành trang thêm 4 rương có tab; Auto tự đánh / tìm quái / nhặt đồ; chuột phải mặc /
  tháo / dùng thuốc; nút Vứt (click = ném ra đất) và Bán trong hành trang.
- Agent chọn: lệnh bài có sẵn cho mọi nhân vật (cấp lại khi mất), icon gốc "Lệnh bài thông hành" (`taskobj126.spr`, `gen:gold`); đồ vứt
  nằm trên đất 60 giây như đồ rơi, 20 giây đầu chỉ người vứt nhặt; bán trong hành trang được ở mọi nơi; chiêu học bằng lệnh bài lấy cấp
  tối đa mà cấp nhân vật cho phép (`levelCap`); đổi phái được mọi phái hợp giới tính (hệ đổi theo phái); đổi giới tính bị từ chối nếu phái
  không nhận giới đó; 4 rương mở sẵn (không mua / mở khóa).
- Thử Playwright: cấp 11 → 150, nhận bộ Mộng Long 5 món, tab rương, vứt (1 món trên đất), đổi phái Thiếu Lâm → Thiên Vương, đổi giới tính.

## Vòng 22 — 2026-11-12 · tốc độ thục luyện, chiêu 120 cộng điểm, tên NPC

- Người dùng: NPC agent tự đặt tên → **Bách Bảo Lão Nhân**; chiêu 120 cộng điểm; thục luyện tối đa trong 1 giờ, mọi phái, chỉnh được toàn
  bộ và ghi đè theo chiêu (sau này phái mạnh luyện lâu hơn).
- `PRACTICE` (`formulas/tuning.ts`: hours, hitsPerSecond, factionHours) + `SkillTuning.practiceHours`; `practicePerHit` chia đều tổng exp.
  Bỏ luyện chiêu 120 bằng exp quái. Cửa sổ Kỹ năng ghi "+N mỗi đòn trúng, tối đa sau khoảng X giờ". Tài liệu nghiên cứu
  `docs/research/skill-practice.md` (gốc: 220–1250 giờ).
- Kiểm tra: mọi chiêu 90 / 150 cần ≈ 3 600 đòn; ghi đè 3 giờ → 10 777 đòn; typecheck.

## Vòng 21 — 2026-11-12 · Kỳ Trân Các + bí kíp (KN13); chiêu 150 luyện như 90

- Người dùng: chiêu 150 luyện như 80/90; làm Kỳ Trân Các (nút dưới thanh menu + NPC, tên chưa đặt) bán bí kíp 90 / 120 / 150 (chuột phải →
  hiện 1 chiêu, tự chọn) và Đại thành bí kíp (1 chiêu lên 20); TB12 / TB15 tạm ghi lại; nghiên cứu thời gian thục luyện (agent).
- `items/books.ts` (6 bí kíp, icon mật tịch gốc), shop `kytran`, `useBook` (chiêu kế tiếp của tầng theo thứ tự học; đại thành chiêu thấp nhất),
  chiêu tầng 90 / 120 / 150 không còn tự hiện. Nút gốc `主界面\奇珍阁按钮_vn.spr` ("Bảo Vật", 74 × 61, `gen:ui`), NPC "Chưởng quỹ Kỳ Trân
  Các" (hình Chủ tạp hóa gốc). Giá: 50 vạn – 300 vạn lượng (CHỌN).
- Kiểm tra: typecheck; `World` (3 bí kíp 90 → 3 chiêu, lần 4 báo hết; đại thành → 20; cấp 50 bị từ chối); Playwright (cửa sổ, NPC, nút).

## Vòng 20 — 2026-11-12 · bước 8 (phần 1): hoàng kim môn phái (TB11, TB13, TB14)

- `gen:gold` → `items/gold.gen.ts`: 140 món của 28 bộ (bảng mod goldequip + magicattrib_ge, TB0; hình `goldequipres`). `items/gold.ts`:
  `createGold` (phẩm chất 0–10 theo may mắn, dòng min→max), `SUITES`, `fullSuite`. Boss rơi theo bảng gốc (`Quality=1`), thẻ "Hoàng kim
  (dev)" ở Thợ rèn (server chặn khi `DEV_TOOLS=0`); Thợ rèn thường không bán hoàng kim.
- Chỉ số: dòng 1/3/5 luôn, 2/4/6 khi kích hoạt hoặc đủ bộ. `gen:assets` xuất hình mặc hoàng kim (+377 sheet).
- Kiểm tra: typecheck; `World` (1 món +192 sinh lực, đủ bộ 560 → 1400, hình mặc), tỉ lệ rơi Cổ Bách 0,054 %/lần tung.

## Vòng 19 — 2026-11-12 · bước 7: rơi đồ, nhặt đồ, may mắn, chỉ số đồ xanh (VT7–VT10, VT12, TB6, TB8)

- Dùng bảng rơi gốc của `data_extract` (update01 có đủ npcdroprate10–90, boss, goldennpc) → không cần bảng bản mod. `gen:drops` → 48 bảng;
  `gen:magic` thêm trọng số từng loại món.
- `formulas/drops.ts`: bảng theo dải cấp, RandRate, cấp món, tiền, dòng xanh `rand(1e6) / hệ số may mắn` (may mắn 5 trung tính: vũ khí
  cấp 10 trung bình 2,4 dòng như gốc). Server `systems/drops.ts` (`MapState.ground`, quyền người giết 20 s, 60 s, nhặt / đi tới nhặt);
  TB8: dòng đồ xanh cộng vào chỉ số (ẩn khi kích hoạt). Client `GroundView` (icon gốc, tên màu, con trỏ nhặt). `docs/formulas/drops.md`.
- Kiểm tra: typecheck; mô phỏng dòng / tỉ lệ rơi; `World` (rơi, quyền nhặt, đi tới nhặt, hết hạn, áo xanh +120 sinh lực); Playwright
  (quái rơi 35 lượng, bấm nhặt); 4 bot.

## Vòng 18 — 2026-11-12 · bước 6: lõi chiến đấu (GP4–GP6, GP10, HU1, HU2)

- `formulas/`: `combat.ts` (CombatStats chung người / quái, bị động, % chiêu), `damage.ts` (lực tay → trúng / né → chí mạng / chí tử →
  kháng + ngũ hành → PK), `effects.ts` (choáng / chậm / độc / co giật, gộp độc), `speed.ts`; hằng số mới trong `tuning.ts` (HIT, CRIT,
  PVP, EFFECTS, SPEED). `status/states.ts`: bùa mang thuộc tính theo cấp, hết hạn riêng, `stateBag`. Quái theo `standard.lua`.
- Engine dùng pipeline mới (`DAMAGE_MODE = formula`); `gen:skills` xuất `useAR` (IsUseAR) và `doHurt` (DoHurt).
- Server: `systems/effects.ts` (chỉ số quái, hiệu ứng, độc theo nhịp, `moveScale`, tốc ra chiêu), nội lực hộ thân, hồi sinh lực / nội lực
  từ bùa, bùa đổi → tính lại chỉ số + gửi F3. Client: chữ Trượt / Chí tử / Choáng / Chậm / Trúng độc, F3 lực tay theo chiêu trên thanh,
  tốc chạy, tốc đánh. Tài liệu `docs/formulas/damage.md`, `effects.md`, `speed.md`.
- Kiểm tra: typecheck; `World` (lực tay, trúng 81 %, ngũ hành, Kim Chung Tráo +50/+45/−15/+49 180 s, Sư Tử Hống choáng 64 %/1,5 s,
  chậm 0,5, độc 42/nhịp; trận cấp 1 / 10 / 30 / 60); Playwright (đòn 13–18 theo công thức, F3); 4 bot.

## Vòng 17 — 2026-11-12 · bước 5: cấp, exp, tiềm năng, vào phái, học / luyện kỹ năng

- 3 agent nghiên cứu xong → `docs/research/` (skills-progression, effects-buffs, luck-drops).
- **Module công thức** `packages/shared/src/formulas/` (tuning, attrs, character, level, monster) + `docs/formulas/` (README, character,
  level, skills), link từ `CLAUDE.md` / `AGENTS.md`. Bảng gốc nhân vật: `npm run gen:player` → `characters/player.gen.ts`.
- **GP1–GP2**: tạo nhân vật theo hệ + giới, cấp 1; exp đánh quái chia theo sát thương + chênh lệch cấp; +5 tiềm năng / +1 kỹ năng mỗi cấp;
  F3 hiện số thật + nút +; thanh kinh nghiệm; nhân vật cũ về cấp 1 (giữ hệ, đồ, tiền).
- **Vào phái cấp 10** cùng hệ (cửa sổ Kỹ năng). **KN5 / KN12 / KN4**: chiêu hiện theo ReqLevel (90 = 80), cộng điểm có giới hạn theo cấp và
  chiêu tiền đề, thục luyện chiêu 90 / 150 theo đòn trúng, 120 theo exp (CHỌN). **TB5** điều kiện mặc đồ.
- Dev: "+1 cấp" ở F3. Kiểm tra: typecheck, `World` (chuyển dữ liệu, exp quái thật, lên cấp, vào phái, cộng điểm, thục luyện), Playwright
  (F3, +10 cấp, cộng Sinh khí → Sinh lực, vào Thiếu Lâm, cộng điểm chiêu), 4 bot.

## Vòng 16 — 2026-11-12 · bước 4: tầng chiêu 90 / 150 (KN10, KN11)

- Người dùng: chạy bước 4 → 8, commit mỗi bước; đặc biệt chú ý sát thương / hiệu ứng / bùa, công thức ở module riêng có tài liệu.
- Mở 3 agent nghiên cứu chạy nền (cách lên cấp chiêu 90/120/150 + chọn phái; tham số hiệu ứng / bùa / sát thương; may mắn + rơi đồ).
- **KN10**: `skills/core/events.ts` (`eventSkill`) — thuộc tính `skill_<kind>event` quyết định tầng theo cấp, cột `skills.txt` chỉ dùng
  khi không có thuộc tính (trước đó 21 chiêu bật tầng từ cấp 1). Mô tả: "Tầng N … (mở ở cấp 11)". `gen:skills` gom chiêu con chỉ nêu ở
  P3 thuộc tính (+4 chiêu, vd. vòng tròn 162 của Nhân Kiếm Hợp Nhất). `docs/skills-layers.md`: bảng 28 chiêu.
- **KN11**: tên chiêu con Thiên Vương 1084 / 1086 / 1087 / 1088 (`tools/data/subskill-names.ts`).
- Kiểm tra: typecheck; `World`: 368 cấp 10 / 11 / 16 = 3 kiếm / + kiếm rơi / + vòng tròn khi trúng.

## Sau vòng 15 — 2026-11-12 · nút AUTO trên thanh dưới (commit sau `26090af`)

- Người dùng: đưa chế độ Auto vào 1 icon cho dễ nhìn. Bản gốc không có icon auto (`spr/ui3/主界面` chỉ có nhân vật, hành trang, kỹ năng,
  ngựa, PK, giao dịch…), nên vẽ bằng CSS nút tròn 28 × 28 chữ "AUTO" (màu đồng / ngọc của thanh), ô 646 px. Click = bật / tắt (như Z),
  chuột phải = cửa sổ Tự động đánh; đang chạy thì chữ xanh + viền vàng sáng. Trong thành Auto vẫn tự dừng như trước.
- Kiểm tra: typecheck, Playwright (bản đồ 140: bật / sáng, chuột phải mở tùy chọn, bấm lại tắt).

## Vòng 15 — 2026-11-12 · cửa sổ Trang bị và Thuộc tính, tách hành trang (commit sau `ceef178`)

- Người dùng: commit vòng 14 (`ceef178`), rồi style lại dialog Trang bị và Thuộc tính theo ảnh (bản ghép F3 của SHXT), tách hành trang
  thành dialog khác, thêm icon ở thanh menu dưới để mở.
- `ui/windows/character.ts` + `.css`: trái = trang thuộc tính (`ui3/玩家装备与人物状态_属性.ini`: thứ tự, màu giá trị), phải = 15 ô trang bị
  đúng kích thước `_装备.ini` (3 cột kéo sát như ảnh), PK, nút Vật phẩm (mở / đóng hành trang) và Đóng. Giá trị chưa có nguồn hiện "—".
- `inventory.ts` chỉ còn hành trang ("Hành trang", lưới + tiền). Thanh dưới: nút `b-char` (ảnh gốc `人物属性按钮`, đã có từ `gen:ui`)
  ở vị trí đầu, các nút sau dịch 31 px. Phím **F3** (`KEYS.char`, chặn thanh tìm của trình duyệt).
- Kiểm tra: typecheck, Playwright :2568 / :5174 (nút mở, Vật phẩm mở hành trang, tooltip ô vũ khí, F3 đóng / mở).

## Vòng 14 — 2026-11-12 · hành trang lưới, tooltip kiểu SHXT, đồ xanh + dòng ẩn, Thợ rèn Chế tạo (commit `ceef178`)

- Người dùng gửi 3 ảnh SHXT (hành trang, tooltip đồ xanh, tooltip hoàng kim Bạch Hổ), muốn style theo đó + Thợ rèn "chọn thiết bị và
  chọn từng thuộc tính với giá trị max"; sau khi xem nghiên cứu: "tự chọn option hợp lý nhất, triển khai".
- Nghiên cứu dữ liệu gốc: `ui3/随身物品.ini` `[ItemBox]` HUnits 6 × VUnits 10, 168 × 280 px (ô 28 px); `[Settings]` màu ô hoàng kim
  243,194,70, tím 188,40,255, bạch kim 240,240,240. Nền xanh / đỏ sẫm theo điều kiện mặc **không có trong ini** (lấy mẫu ảnh: 0,51,34 /
  50,0,1). `\settings\item\magicattrib.txt` (update01): tiền tố (`是否前缀` = 1, không hệ) / hậu tố (theo ngũ hành) — khớp ảnh 2: dòng hiện là
  tiền tố, dòng xám là hậu tố cùng hệ món (Kim); `[min-max]` trong ảnh = min / max của thuộc tính qua mọi cấp. Màu chữ tooltip không có
  trong dữ liệu → lấy mẫu ảnh (`TIP_COLORS`).
- **TB18**: `items/bag.ts` (lưới, tìm chỗ, xếp lại, `roomFor`), server đặt món theo cỡ (mua, tháo, đổi đồ), `C2S.bagMove` kéo thả. Bag cũ
  không hợp lệ được xếp lại; món không vừa giữ trong `bagSpill` (db: nhân vật "123123" 47 món → 32 vào lưới, 15 chờ; không mất món nào).
- **TB4 / TB7**: tooltip căn giữa theo thứ tự ảnh (tên, loại, giá, Ngũ hành, mô tả, cơ bản, yêu cầu đỏ, dòng xanh / vàng, dòng ẩn xám);
  dòng ẩn sáng khi mặc theo `activeHidden` (2 ô kích hoạt + hệ nhân vật, suy luận). `equipError` kiểm thêm phái / hệ (`missesReq`, `canWear`).
- **TB6 + Chế tạo**: `gen:magic` → `magicattrib.gen.ts`; `items/magic.ts` (`forgeChoices`, `forgeError`, `forgePrice` = giá × (1 + số dòng),
  agent chọn); cửa sổ `ui/windows/forge.ts` (nút "Chế tạo" ở Thợ rèn): loại, món (cấp cao nhất mặc định), 5 hệ, 6 dòng (chọn thuộc tính →
  giá trị tối đa, sửa được), xem trước tooltip; server `forgeItem` (trong thành, kiểm tra lại, chỉ số cơ bản tối đa, q = xanh).
- Agent chọn (chờ người dùng xem): danh sách bộ hoàng kim sẽ **hiện đủ, món chưa có màu xám** (TB13); Chế tạo là chức năng chơi thật có
  thu tiền; hoàng kim / bộ (ảnh 3) chờ TB11 vì chưa có món hoàng kim nào trong game.
- Kiểm tra: typecheck, luật phụ thuộc client, Playwright trên :2568 / :5174 (chế tạo áo 5 dòng 60000 lượng, tooltip, mặc, mua 12 món khác cỡ,
  kéo áo 2 × 3 sang ô (4,7), đai hệ Thổ làm sáng dòng ẩn đầu của áo hệ Kim), `restoreBag` trên bản sao db.

## Sau vòng 13 — 2026-11-12 · sửa lỗi bấm NPC (commit sau `c219294`)

- Người dùng: chỉ bấm được Chủ dược điếm, Xa phu / Bán ngựa bấm được 1 lần. Nguyên nhân (có từ commit mốc `9558ad7`): `npcTalk.ts`
  vẽ chân dung bằng cách thay toàn bộ nội dung khung ảnh, xóa luôn `<img id="npc-face">` dùng để tìm khung → từ lần nói chuyện thứ hai
  `$('npc-face')` là null, lỗi JS, cửa sổ thoại không mở (NPC nào bấm đầu tiên thì được). Sửa: id đặt trên chính khung ảnh.
  Playwright: 4 NPC × 3 lần (đóng bằng Rời khỏi / chọn chức năng rồi Esc) đều mở.

## Vòng 13 — 2026-11-12 · bước 3: VT1 thuốc + VT3 tiền + Auto uống thuốc (commit chung với vòng 12, sau `63c8d49`)

- Người dùng chốt: vật phẩm dùng được đặt lên phím 1–9; bình máu / mana uống **không độ trễ**, bơm theo dải (bình 5000 = 500 mỗi 0,2 s);
  phải có chủ hiệu thuốc; giá do agent quyết. Sau đó: "làm cả phần Tiền lượng, hiển thị căn cứ theo mã gốc".
- **VT1**: `gen:assets` xuất 44 dòng `potion.txt` (cột hiệu ứng: thuộc tính, giá trị mỗi nhịp, thời gian theo vòng game). Kiểm chứng:
  giá trị × thời gian / 10 = tổng khớp mô tả gốc (Cửu Chuyển 5000, bản đặc biệt 10000, Hồi Thiên Tái Tạo 6000); `magicdesc.ini` ghi
  "mỗi nửa giây" (= 10 vòng). Ta giữ giá trị + số nhịp, đổi nhịp thành 0,2 s (`items/potions.ts`, server `systems/potions.ts`).
  Phím 1–9 nhận vật phẩm (kéo từ hành trang), hiện số còn lại; bấm / chuột phải trong hành trang để uống.
- **VT3**: tiền túi trên `Sim` / `db.json` / `InventoryMsg.money`; 20000 khởi đầu (quà tân thủ gốc). Mua theo giá bảng (hộp Mua vào có số
  lượng, tối đa 99), bán = giá / 4 (chế độ Bán của cửa hàng + click hành trang), chỉ trong thành, câu thiếu tiền gốc. Hiển thị theo
  `ui3/随身物品.ini` (icon `yingliangtubiao.spr` → `gen:ui` `money.webp`, số trơn màu 255,217,78) và `买卖确认.ini` (màu tên / giá /
  thiếu tiền / đơn vị); cửa hàng bên trái, hành trang bên phải như StartPos gốc. Thợ rèn / Bán ngựa hết giá 0. Nút dev +100 vạn.
- **Chủ dược điếm** (`npcs.txt`, sprite `passerby007`) ở mọi thành, bán danh sách gốc `buysell.txt` dòng 53 (15 bình Sinh lực / Nội lực /
  hỗn hợp cấp 1–5), bỏ thuốc giải độc.
- **GP9**: Auto tự uống thuốc theo % Sinh lực / Nội lực (Hệ thống → Tự động đánh).
- `items.gen.ts` tách mảng theo nhóm (một mảng 1383 dòng làm `tsc` báo TS2590).
- Kiểm tra: typecheck, thử trên `World` (giá, thiếu tiền, bán, ngoài thành, 10 nhịp × 500 trong 1,8 s, 2 bình bơm song song, chết dừng bơm),
  thử `AutoPlay` (chọn bình), Playwright (NPC, hiệu thuốc, Mua vào 3 bình, thiếu tiền, bán, phím 1–2, hết thuốc, tải lại trang), 4 bot 30 s.

## Vòng 12 — 2026-11-12 · bước 2: TB1–TB4 nền trang bị (commit chung với vòng 13, sau `63c8d49`)

- **TB1** món đồ cụ thể `Item` (uid, def, giá trị đã gieo, độ bền…); hành trang + ô mặc + db lưu `Item`; id chuỗi cũ tự chuyển.
- **TB2** `gen:assets` xuất đủ cột 10 bảng trang bị (+ ngựa): giá, kích thước ô, mô tả, thuộc tính cơ bản (sát thương vũ khí, né tránh,
  độ bền, chính xác…), yêu cầu (cấp, sức mạnh, thân pháp, giới, hệ, phái); bỏ Sinh lực / Nội lực tạm theo cấp; sát thương cơ bản từ vũ khí.
- **TB3** thêm ô Mặt nạ / Phi phong / Ấn / Trang sức; 839 mặt nạ gốc (thẻ Mặt nạ ở Thợ rèn). Ba ô sau chưa có đồ (bảng chỉ có dòng giữ chỗ).
- **TB4** tooltip vật phẩm bằng câu gốc `magicdesc.ini`, màu theo chất lượng, yêu cầu không đạt tô đỏ.
- Việc mới: TB18 hành trang dạng lưới theo kích thước ô, TB19 mặt nạ biến hình NPC.
- Kiểm tra: typecheck, Playwright (hành trang chuyển từ dữ liệu cũ, tooltip vũ khí / áo / ngựa / mặt nạ, thẻ Mặt nạ 839 món), 4 bot 30 s.

## Vòng 11 — 2026-11-12 · đổi tên thư mục, bóng đổ, Khinh công, `.env` (commit sau `9558ad7`)

- Người dùng đổi thư mục cha thành `study-me` và đổi tên: `vltk-online` → `jx-system-online`, `Client_VLTK_SHXT` → `jx-origin`,
  `vltk-web-main` → `jx-web-main`; xóa `jx1-vs2022-main`, `jx1-gameplay-research`, `jxdocs-master` (có virus) → bỏ qua, trích dẫn cũ
  đánh dấu "(đã xóa)".
- Repo git cũ không đi theo → tạo repo mới, commit mốc `9558ad7` (nhánh `feature/skill-system`, không có `main` / remote). Người dùng
  bảo bỏ toàn bộ asset trong `apps/client/public/assets/` khỏi git (trừ `portraits/`, không có tool sinh).
- `doc-gold.ts` hết phụ thuộc mã engine: tên thuộc tính đọc từ exe client (`tools/jx/magicattr.ts`), đối chiếu tên Trung trong
  `magicattrib_ge.txt` → đúng tới mã 176; bảng engine cũ lệch ở 140–176 nên tài liệu hoàng kim trước đó sai 64 dòng → sinh lại.
- Đổi tên ở 22 file (tool, tài liệu, `package.json`, `AGENTS.md`, `README.md`), `CLAUDE.md` thư mục cha, bộ nhớ Claude Code.
- Người dùng: "triển khai theo thứ tự" → bước 1 xong (chưa commit):
  - **HU3–HU6 bóng đổ**: `gen:assets` xuất bóng người (`主角动作阴影对应表.txt`) + bóng quái / NPC (`<thân>b.spr`, tra theo hash);
    `PaperDoll` vẽ lớp bóng dưới cùng; bỏ elip tạm. +5,6 MB.
  - **KN9 Khinh công**: `gen:assets` xuất động tác nhảy (`JumpFly` ↔ cột `Jump` của bảng bộ phận); server bay thật
    (`world/systems/jump.ts`, `Actor.jumpMs`): 1,2 × tốc độ chạy, tối đa 400 px (bán kính chiêu), dừng trước vật cản, khóa lệnh,
    **không nhận sát thương khi bay**; client động tác nhảy + nâng thân parabol (`characters/jump.ts`, độ cao là số mình tự chọn).
    Mê Ảnh Tung (form 13) vẫn dịch chuyển tức thời. Skill lab nhảy được.
  - Kiểm tra: typecheck (cả tool), thử `World` trực tiếp (bay, giới hạn, tường, miễn sát thương), Playwright nam / nữ trên 2568 / 5174,
    4 bot 30 s, build thử.
- Người dùng báo server in "optional .env file not found" → thêm `apps/server/.env.example` (mọi biến server + mặc định), `.env` cục bộ
  (không vào git), ghi bước `cp` vào README / AGENTS / regenerate-assets. Người dùng bảo commit vòng 11 rồi làm bước 2 (TB1–TB4).

## Điều tra bóng đổ — 2026-11-12 · chưa commit (chỉ tài liệu)

- Người dùng hỏi bản gốc có bóng đổ cho nhân vật / NPC / quái không, rồi hỏi tiếp vật thể bản đồ (cây cối) → đã xác minh bằng mã
  engine (`KNpcRes`, `KNpcResNode`) và giải mã file trong `spr.pak`: nhân vật dùng bộ bóng `MA/FM_YY_999_*`, quái dùng `<thân>b.spr`,
  vật thể bản đồ vẽ sẵn bóng trong hình. Người dùng bảo "lưu lại tài liệu" → `docs/shadows.md`; việc làm bóng ghi vào `BACKLOG`.

## Vòng 10 — 2026-11-12 · chưa commit (TB8 thu hẹp, VT9, Khinh công)

- TB8: "HK" chỉ là đồ hoàng kim (môn phái), không gồm Thiên Tứ → Thiên Tứ chuyển vào TB17.
- VT9: quyền nhặt / bảng rơi theo người đánh chết quái.
- Người dùng báo Khinh công không có động tác nhảy, và khi đang nhảy thì chiêu đánh ra không được tính sát thương → agent điều tra:
  210 đang dùng nhánh dịch chuyển tức thời chung với Mê Ảnh Tung; `gen:assets` bỏ qua cột động tác `JumpFly`; engine gốc có trạng thái
  nhảy parabol (`DoJump`) và vẫn nhận sát thương khi đang bay → việc mới KN9, chờ duyệt.
- Người dùng nhờ ghi lại toàn bộ trạng thái → `tasks/CURRENT.md` viết lại (commit, game đang có gì, tiến độ theo nhóm, quyết định,
  việc chờ). Người dùng sắp đổi tên thư mục cha → bỏ đường dẫn tuyệt đối trong `docs/regenerate-assets.md`; ghi việc chép bộ nhớ Claude Code.

## Vòng 9 — 2026-11-12 · commit `3bd96bd` (quyết định VT7, TB8, VT10)

- VT7: đồ rơi tồn tại 60 giây, 20 giây đầu ưu tiên người đánh chết quái + tổ đội.
- VT10: chưa quyết; người dùng muốn nghiên cứu riêng may mắn (tỉ lệ rơi, chất lượng, đồ / thuộc tính hiếm) kèm bảng tiêu chí xếp hạng
  vật phẩm và số liệu → việc mới VT12.
- TB8: chỉ số có tác dụng cho đồ xanh và đồ hoàng kim; các loại khác ghi vào việc mới TB17.

## Vòng 8 — 2026-11-12 · commit `3790af2` (danh sách việc + tài liệu trang bị)

- Người dùng xin danh sách việc tiếp theo, có bóng đổ (`docs/shadows.md`), vật phẩm đầy đủ (hoàng kim, Thiên Tứ), rơi đồ / tiền →
  nhóm việc BD / VP / TH / HK / RD / NV trong `BACKLOG.md`; thứ tự đề xuất trong `CURRENT.md` §4.
- Người dùng muốn task riêng cho **hoàng kim môn phái** và **Thiên Tứ**, tài liệu đủ tên, bộ, thuộc tính, min / max, và ghi chú các
  loại trang bị khác → `docs/equipment-gold-thientu.md` sinh bằng `apps/client/tools/doc-gold.ts` (đọc bảng mod `settings/item/`,
  câu mô tả `magicdesc.ini`, tên thuộc tính từ `MAGIC_ATTRIB_STRING` của engine). Phát hiện: Thiên Tứ không trùng đủ 5 món với bản
  hoàng kim (110/140 trùng tên), bảng cường hóa đánh số theo dòng `platinaequip`, Hoa Sơn không có bộ hoàng kim môn phái cổ điển.
- Người dùng chốt: tool được đọc bảng mod (TB0, ghi `AGENTS.md` §7); làm hoàng kim môn phái + Thiên Tứ trước rồi các loại khác;
  bảo commit; muốn task chia nhóm rõ hơn → `BACKLOG.md` viết lại theo 8 nhóm: Trang bị (TB), Vật phẩm / tiền / rơi đồ (VT), Kỹ năng (KN),
  Hiệu ứng (HU), Giao diện (GD), Gameplay (GP), Event và nhiệm vụ (SK, mới thêm từ tài liệu nghiên cứu 05–07), Hạ tầng (HT); có bảng đổi mã cũ.

## Vòng 7 — 2026-11-12 · commit `d8a677b` (cấu trúc lại codebase)

- Người dùng hỏi giao diện đã tổ chức gọn chưa (sẽ làm lại toàn bộ UI), xin danh sách màn hình, hỏi nên làm giao diện bằng HTML/CSS hay
  canvas, và dặn **luôn cân nhắc Web + Desktop app + Mobile** → ghi vào `AGENTS.md` §1; phân tích lưu ở `docs/ui-and-platforms.md`
  (khuyến nghị: HTML/CSS cho giao diện, canvas cho thứ gắn với thế giới).
- Người dùng muốn cấu trúc lại codebase trước; agent đề xuất `docs/restructure-plan.md`; người dùng: "triển khai theo hướng của bạn".
- Đã làm, không đổi hành vi:
  - shared chia theo chủ đề: `characters/ monsters/ npcs/ items/ status/ combat/ maps/nav/` (NPC trong thành chuyển từ client sang).
  - server: `World.ts` 805 dòng → `world/` (World = thứ tự tick, entity, players, commands, inventory, targeting, `systems/`, `ai/` quái + boss);
    `net/`, `account/`, `dev/`.
  - client: `app/ net/ state/ input/ platform/ art/ game/ ui/ dev/`; `ui/hud.ts` 601 dòng + `index.html` + `style.css` →
    `ui/kit|tips|screens|hud|windows` (mỗi phần một cặp .ts + .css); hợp đồng `game/ports.ts` (WorldUi / WorldActions) để game không
    import giao diện; bảng phím `input/keymap.ts`; công cụ dev nạp động nên bản build chính thức không chứa.
  - Tool `gen-*` ghi vào chỗ mới; `docs/architecture.md` + AGENTS / README / skills README cập nhật.
- Kiểm tra: typecheck (cả tool), 4 bot 40 s, Playwright chụp 16 màn trước / sau (khung, chữ, vị trí như cũ), skill lab / gallery /
  maptest / công cụ khu quái, mua đồ, mặc đồ, chuyển map, khóa mục tiêu, phím 1–9, Auto; build thử (không chép `public/`).
- Người dùng thêm `docs/shadows.md` (bóng đổ gốc), bảo commit (`d8a677b`, gồm cả tài liệu, `tasks/`, `CLAUDE.md`), rồi xin danh sách
  việc tiếp theo có bóng đổ, vật phẩm đầy đủ (hoàng kim, Thiên Tứ) và rơi đồ / tiền → agent đối chiếu bảng gốc, ghi nhóm việc
  BD / VP / TH / HK / RD vào `BACKLOG.md` (chưa commit phần này).

## Vòng 6 — 2026-11-12 · commit `b9ad7c2`

- Người dùng liệt kê việc còn thiếu (icon chuột, lực tay / điểm tiềm năng / chỉ số chiêu, thuộc tính trang bị, đánh liên tục + auto,
  tốc độ / chí mạng / chí tử / chính xác, rơi đồ / may mắn / phúc duyên). Agent rà client gốc, tìm trên mạng, đọc mã engine
  `jx1-vs2022-main` (đã xóa) (chỉ lấy cơ chế) → viết `docs/combat-formulas.md`. Người dùng dặn chưa mượn công thức của `jx-web-main`.
- Người dùng hỏi thiếu kỹ năng cấp 70 (Võ Đang có trạng thái "nội lực hộ thân"): không có cấp 70; thứ thiếu là kỹ năng **thất truyền**
  (Võ Đang: Chân Vũ Thất Tiệt → Âm Dương Khí Quyết) và 3 kỹ năng chung → đã thêm.
- Thêm phái Hoa Sơn; mô tả kỹ năng đầy đủ khi rê chuột (không đổi sát thương); con trỏ chuột gốc; Auto; khóa mục tiêu.
- Người dùng báo hình hiệu ứng có nền (Long Toàn Kiếm Khí, Tạo Hóa Thái Thanh, Thương Tùng Nghênh Khách, Ma Vân Kiếm Khí) →
  tìm ra cờ cộng sáng trong header SPR + nền xám (8,8,8) chồng lớp → sửa trong `gen:skills`, sinh lại 235 hiệu ứng.
- Tạo `tasks/` + `CLAUDE.md` để phiên sau biết điểm dừng (chưa commit).

## Vòng 5 — 2026-11-11 · commit `55b2bef`

- Duyệt: ngựa giá 0 lượng; menu Hệ thống (Thoát game, Chuyển nhân vật, Tùy chỉnh có âm lượng / tắt tiếng); cửa sổ kéo thả;
  quái tự sinh + công cụ dev; làm lại giao diện cho giống võ lâm online.
- Giao diện dựng từ `spr/ui3` (`gen:ui`), một loại cửa sổ `ui/dialog.ts`; ngựa thành vật phẩm (54 loại); âm thanh + nhạc gốc
  (`gen:sounds`); quái theo bản đồ (`gen:spawns`, công cụ dev trên bản đồ lớn); sửa bảng TCVN3 chữ hoa.
- `.gitignore` hình ngựa mới, `npc/*`, `music/*`.

## Vòng 4 — 2026-11-11 · commit `881adc9`

- Dựng toàn bộ bản đồ gốc từ `maplist.ini` (299 bản đồ, 297 dựng được, khoảng 14 GB), danh sách bản đồ có ảnh thu nhỏ, tìm không dấu.
  Ảnh bản đồ ngoài 37 / 140 không đưa vào git.

## Vòng 2–3 — 2026-11-11 · commit `c2d1926`

- Hệ kỹ năng giai đoạn 1: gói kỹ năng theo phái (`gen:skills`), bộ máy dùng chung, thanh kỹ năng + bảng F, cọc gỗ.
- Theo người dùng: sát thương ngẫu nhiên; chia 5 loại chiêu; trạng thái chỉ ghi nhận; chiêu 120; bản đồ lớn (Tab), thu gọn minimap.

## Vòng 1 — 2026-11-11 · commit `ee5a703` (và `c47bc5e` asset)

- Codebase ban đầu: hình gốc 1:1 (người dùng xác nhận "rất tốt"), ghép trang bị, hành trang, Thợ rèn, Xa phu,
  Biện Kinh + Dược Vương Cốc, `?gallery`.

## Cài đặt máy macOS — 2026-11-13

- Bản project hiện tại không có `.git`, không đối chiếu được commit cũ.
- Đã chạy `npm install` thành công và tạo `apps/server/.env` từ mẫu nếu chưa có.
- Client gốc: `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`; truyền qua `JX_CLIENT` khi gen.
- Đã thử sáu lệnh gen: assets, skills, maps (37 140), ui, sounds, gold; đều bị chặn vì thiếu `data_extract/` và `_manifest.tsv`.
- Có các PAK trong `data/`, nhưng thiếu tool `tools/jxpak/jxpak.py` được tài liệu yêu cầu trong cả project và client được cung cấp. Tool `volam-shxt/scripts/unpack_pak.py` dùng định dạng đầu ra khác, không thay thế trực tiếp được.
- Chưa sinh xong asset. Bước tiếp theo: khôi phục tool jxpak cùng thư viện phụ trợ hoặc cung cấp bản `data_extract` đúng định dạng, rồi chạy lại sáu lệnh.

## 2026-11-13 — Hoàn tất gen asset trên macOS

Người dùng yêu cầu tận dụng bộ giải nén volam-shxt. Thêm bộ chuyển đổi `tools/jxpak/from-volam.py` và hướng dẫn, tạo data_extract theo package.ini; phục hồi tên WAV và tên sprite quái từ ResFilePath. Giải nén 155.654 file đúng kích thước, một entry SPR nguồn hỏng được báo rõ. Sáu lệnh gen thành công, gồm hai bản đồ 37/140; tổng 9.439 sheet, 1.193 quái, 295 âm thanh + 30 nhạc, giao diện, hiệu ứng và icon hoàng kim. Không commit (bản copy không có .git). Chi tiết CURRENT.md.

Kiểm chứng cuối (2026-11-13): `npm run typecheck` và `npm run build` đều thành công. Build có cảnh báo chunk lớn hiện có. Chưa kiểm thử gameplay trong trình duyệt.

## Khởi động game trên macOS — 2026-11-13

- Người dùng yêu cầu cài package và thử khởi động game: `npm install` thành công (up to date).
- Đã thử trên cổng riêng 2568/5174, DB riêng `/tmp/jx-game-smoke/db.json`: trình duyệt đăng ký tài khoản thử, tạo KiemThuMac, vào Biện Kinh; thấy bản đồ, nhân vật, NPC và HUD hiển thị. Không ghi tài khoản thử vào DB chính.
- Đã khởi động bản chính bằng `npm run dev`: client http://localhost:5173 và Colyseus ws://localhost:2567, cả hai HTTP 200. Giữ tiến trình chạy để người dùng dùng; tab trình duyệt ở màn đăng nhập.
- Đã tắt hai tiến trình server/client thử nghiệm sau khi kiểm tra. Ảnh kiểm tra ở `/tmp/jx-game-smoke/game-running.jpg`.

## Điều tra bảng thuộc tính trang bị — 2026-11-13

- Repo hiện có commit `03158ba initial commit`, khác ghi chú cũ chưa có .git. Không có chỉ mục GitNexus/runner ở repo; đã lần trực tiếp mã và kiểm chứng qua WebSocket thật.
- Chưa sửa code gameplay. Nguyên nhân đã xác nhận: equipItem/unequipItem → applyEquipment → refreshStats tính lại sim.stats/sim.combat; nhưng inventoryOp trong MapRoom chỉ sendInventory (inventory + skills), không sendStats. Client progress.get() giữ snapshot cũ; render lại cũng đọc dữ liệu cũ. onJoin có sendStats nên reload/vào lại mới đúng.
- Tái hiện trên server riêng :2568, DB `/tmp/jx-game-smoke/equipment-db.json`, không đụng dữ liệu game chính: trước mặc vũ khí lực tay 8/9; sau mặc nhận inventory + skills, 0 stats, vẫn 8/9; reconnect nhận stats và lực tay 11/14.
- Hướng sửa đề xuất (chưa triển khai): gửi StatsMsg mới sau mặc/tháo trang bị thành công, dùng dữ liệu server đã tính; không chỉ ép render UI. Cần kiểm tra cả mặc/tháo, đổi món và các chỉ số kháng/tốc độ/lực tay.
- Đã tắt server thử :2568. Bản chính :2567/:5173 được giữ nguyên.

## Sửa đồng bộ thuộc tính trang bị — 2026-11-13

- Người dùng đã duyệt sửa. `MapRoom.inventoryOp` giữ tham chiếu stats trước thao tác, gửi S2C.stats nếu thao tác thành công đã tính lại stats. Bao phủ mặc/tháo/đổi đồ và dùng bí kíp có tính lại stats; thao tác hành trang không ảnh hưởng stats không gửi thừa. `refreshStats` hiện luôn tạo đối tượng stats mới.
- Đã kiểm tra qua WebSocket thật trên :2568 và DB riêng: mặc vũ khí, đổi sang món có chỉ số khác, tháo, mặc lại đều nhận đúng 1 stats mới; lực tay/tốc độ đánh cập nhật ngay; snapshot stats/combat bằng sau reconnect. Mặc ô trống thất bại và chuyển đồ trong túi không gửi stats thừa.
- `npm run typecheck` và `git diff --check` thành công. Không đổi công thức hoặc giao diện, cơ chế thông điệp dùng chung Web/Desktop/Mobile.
- Đã tắt server thử :2568. Server chính :2567 được watcher tự khởi động lại với code mới; client :5173 vẫn chạy. Phiên cũ bị ngắt khi server khởi động lại có thể cần vào game lại một lần.
- Không commit/push. Commit gốc vẫn `03158ba`. Script kiểm tra tạm: `/tmp/jx-game-smoke/verified-equipment-stats.mts` (chạy từ gốc repo để resolve package, xem bản sao cũ để tái hiện trước sửa).

## Kiểm tra chỉ số từ buff/hào quang — 2026-11-13

- Chỉ điều tra theo yêu cầu, chưa sửa thêm gameplay; giữ thay đổi trang bị đã được duyệt ở MapRoom.ts. Repo `03158ba`, không có chỉ mục GitNexus; kiểm trực tiếp nguồn và chạy thực tế.
- Luồng addState/removeState/expireStates → statesChanged → refreshStats + hooks.progress → S2C.stats → client progress.watch → renderStats đã đầy đủ.
- WebSocket thật, cổng thử :2568, DB riêng `/tmp/jx-game-smoke/buff-network-db.json`: Tĩnh Tâm Quyết 33 chính xác 370→658, nhận 1 stats; Lưu Thủy 86 +66% fastwalkrun_p, nhận stats; đổi sang Phổ Độ Chúng Sinh 332 kháng vật công 0→40 và các kháng khác thay đổi, tắt về baseline, không reconnect.
- Mô phỏng World/SkillEngine thật với đồng hồ điều khiển: buff áp dụng/làm mới cấp/đến hạn; từng thuộc tính hết hạn trước state; aura lên bản thân/đồng minh/rời phạm vi/đổi/tắt; Bế Nguyệt Phất Trần 712 cùng các aura kèm theo — đều phát progress với đúng snapshot. Aura kèm theo/đồng minh có thể lưu tới 2,5s do AURA_STATE_MS (hạn gốc), không phải UI kẹt.
- Phát hiện lỗi mới: clearStates(sim) dùng khi chết/hồi sinh chỉ refreshStats mà không hooks.progress. Tái hiện buff 33: trước chết client AR=360; chết server AR=72, 0 progress; revive vẫn 0 progress, client AR còn 360. Khi không có sự kiện stats khác, bảng giữ số cũ. Chưa sửa vì yêu cầu chỉ kiểm tra. Hướng xử lý: đồng bộ stats sau clear trạng thái trong vòng đời chết/hồi sinh, gửi sau khi các cập nhật liên quan đã hoàn tất.
- Phạm vi: kiểm các đường đồng bộ và chiêu đại diện, chưa rà từng chiêu 11 phái. Kỹ năng chỉ hồi máu không tự tăng các chỉ số tấn công/kháng; Sinh lực hiện tại đi qua schema actor.
- Đã tắt server thử, không thay đổi DB/bản chạy chính. Script kiểm tra ở `/tmp/jx-game-smoke/check-buff-{stats,network}.mts`, đưa về gốc repo khi chạy để resolve package.

## 2026-11-13 — Commit sửa đồng bộ thuộc tính trang bị

Người dùng yêu cầu commit trạng thái hiện tại. Commit `fix(server): sync recalculated stats after inventory changes` gồm MapRoom.ts và ba file tasks. Đã kiểm chứng WebSocket và typecheck ở vòng sửa; diff kiểm tra sạch. Lỗi buff bị xóa khi chết/hồi sinh chỉ ghi nhận, chưa sửa. Không push. Hash xem git log theo tiêu đề commit.
