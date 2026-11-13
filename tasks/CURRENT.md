# Điểm dừng hiện tại

> Điểm dừng mới nhất **2026-11-13**: đã sửa đồng bộ bảng thuộc tính khi mặc/tháo/đổi trang bị; kiểm chứng WebSocket và typecheck đạt. Commit hiện tại: `git log -1` — `fix(server): sync recalculated stats after inventory changes`. Lỗi mất buff khi chết/hồi sinh đã tái hiện, **chưa sửa**. Các mục lịch sử bên dưới được giữ nguyên.

> Cập nhật: **2026-11-13** (vòng 23–31: lệnh bài, 4 rương, màn chọn / tạo nhân vật gốc, PK + tổ đội, bùa theo màu chữ, exp tổ đội,
> gợi ý cộng điểm + tẩy tủy, Auto theo jx-web-main, thuộc tính hoàng kim + Càn Khôn Giới Chỉ + popup kỹ năng; vòng 31: Auto tiếp cận /
> chỗ kẹt + dọn codebase; **vòng 32**: tư thế chiêu vũ khí, hào quang ô tay tự bật, hút sinh lực, Thổ Địa Phù, lệnh bài Nhận đồ xanh,
> tốc độ ngựa, kênh chat Thế giới + reaction + lịch sử theo tài khoản; **vòng 33**: lệnh bài ở Kỳ Trân Các 1 lượng, thanh % kinh nghiệm,
> kênh Hệ thống (chỉ lưu ở client), chat bấm để gõ, "N online", thanh máu xanh / đỏ khi PK; commit cuối `git log -1`;
> **vòng 34**: PF4 cache asset phần web — `assetUrl()`, `manifest.json`, Service Worker, nút xóa bộ nhớ đệm; cờ trên bản đồ nhỏ;
> **vòng 35**: bot giả lập người chơi — trang `/?bots`, `npm run bots -- <kịch bản>`, AutoPlay chuyển sang shared)
> Trước đó: **2026-11-12** · nhánh `feature/skill-system` (không có `main`, không có remote) · commit cuối: vòng 12–13 (`git log -1`).
> Đầu phiên sau: đối chiếu `git status` / `git log -1` với mục này. Commit cuối: vòng 15 (cửa sổ Trang bị và Thuộc tính,
> tách hành trang, nút + F3); trước đó `ceef178` (vòng 14). Bước 2 (TB1–TB4) và bước 3 (VT1 thuốc + VT3 tiền + GP9 uống thuốc)
> **đã commit** (vòng 12, 13 trong `tasks/HISTORY.md`). Sau đó: sửa lỗi bấm NPC lần thứ hai (`472ea7e`). Vòng 14 đã commit (`ceef178`).

## 1. Trạng thái repo

| Commit | Nội dung |
|---|---|
| (vòng 15, `git log -1`) | **GD1** cửa sổ Trang bị và Thuộc tính (F3, nút thanh dưới), hành trang thành cửa sổ riêng |
| `ceef178` (vòng 14) | **TB18** hành trang lưới 6 × 10 theo cỡ + kéo thả; tooltip / ô theo ảnh SHXT; **TB6** bảng `magicattrib.txt` (`gen:magic`) + **Thợ rèn → Chế tạo**; **TB7** dòng ẩn + kích hoạt tương sinh (hiển thị) |
| `472ea7e` | Sửa NPC chỉ mở thoại lần đầu |
| `c219294` (vòng 12–13) | **TB1–TB4** món đồ cụ thể, đủ cột bảng, 15 ô mặc, tooltip gốc; **VT1** thuốc trên phím 1–9 (bơm 0,2 s); **VT3** tiền lượng, Chủ dược điếm, Mua / Bán theo giá gốc; **GP9** Auto uống thuốc |
| `63c8d49` (vòng 11) | Đổi tên thư mục + tham chiếu đã xóa; `tools/jx/magicattr.ts` (tên thuộc tính từ exe) + sinh lại tài liệu hoàng kim; **HU3–HU6 bóng đổ**; **KN9 Khinh công bay thật**; `apps/server/.env.example` |
| `9558ad7` | **Repo tạo lại** sau khi chuyển thư mục sang `study-me/jx-system-online` (mốc; gồm mọi thứ đến hết vòng 10). Lịch sử cũ (`b9ad7c2` … `3bd96bd`) đã mất |

Asset mới (bóng, động tác nhảy, icon thuốc, NPC Chủ dược điếm, icon ngân lượng) đã sinh trên máy này; máy khác phải chạy lại
`gen:assets` và `gen:ui`. Mỗi máy tạo `apps/server/.env` từ `apps/server/.env.example` (không vào git).

Thư mục làm việc: `/mnt/e/study-me` gồm `jx-system-online/` (repo), `jx-origin/` (client gốc), `jx-web-main/` (tham khảo).
Các thư mục `jx1-vs2022-main`, `jx1-gameplay-research`, `jxdocs-master` **đã bị xóa** (người dùng: có virus) — đừng tìm lại.
Bộ nhớ Claude Code đã chuyển sang `~/.claude/projects/-mnt-e-study-me/memory/`.

Server dev của người dùng (nếu đang chạy từ đường dẫn cũ) phải tắt và chạy lại `npm run dev`. Agent thử nghiệm ở `:2568` / `:5174` (mục 6).

## 2. Game hiện có gì

- Client Phaser 4 + giao diện HTML theo hình gốc; server Colyseus 20 tick/giây; ~300 bản đồ gốc (37, 140 trong git), quái theo file spawn.
- 11 phái (cả Hoa Sơn), kỹ năng từ bảng gốc + thất truyền + 3 kỹ năng chung, hiệu ứng 1:1, mô tả kỹ năng kiểu gốc.
- Click trái khóa mục tiêu, Auto (Z, tự uống thuốc), con trỏ gốc, âm thanh / nhạc gốc, bóng đổ, Khinh công bay, ngựa (54 loại).
- Hành trang **lưới 6 × 10 theo cỡ món** (kéo thả) + 15 ô mặc (món đồ cụ thể, tooltip kiểu SHXT, nền xanh / đỏ sẫm theo điều kiện mặc),
  **Thợ rèn → Chế tạo** đồ xanh (chọn món, ngũ hành, từng dòng, giá trị tối đa; dòng ẩn sáng theo tương sinh — chỉ hiển thị), **tiền túi** (20000 khởi đầu), Thợ rèn / **Chủ dược điếm** / Bán ngựa
  bán theo giá bảng gốc (mua nhiều, bán = 1/4 giá), **thuốc** trên phím 1–9 (bơm mỗi 0,2 giây, không độ trễ).
- **Chưa có:** cấp / exp, tiềm năng, rơi đồ (cả tiền rơi), kho, tác dụng của thuộc tính trang bị (TB8), hoàng kim, chat, tổ đội, bang hội, event.
  Sát thương theo **công thức** gốc, bùa / hiệu ứng có tác dụng (2026-11-12, `docs/formulas/`).

## 3. Tiến độ theo nhóm (`tasks/BACKLOG.md`)

| Nhóm | Mã | ✅ | 🟡 | ⬜ | ⏸ | Việc nổi bật đang chờ |
|---|---|---|---|---|---|---|
| Trang bị | TB | 5 | 4 | 11 | 0 | TB11 hoàng kim môn phái → TB12 Thiên Tứ → TB13 bộ; TB8 chỉ số có tác dụng; TB19 mặt nạ |
| Vật phẩm, tiền, rơi đồ | VT | 2 | 1 | 8 | 1 | VT12 nghiên cứu may mắn, VT7–VT9 rơi đồ (cả tiền), VT5 kho (VT1, VT3 xong) |
| Kỹ năng | KN | 6 | 1 | 8 | 0 | KN12 giới hạn cấp chiêu, KN5 học chiêu bằng điểm, KN1 rà phase 2 |
| Hiệu ứng | HU | 6 | 0 | 1 | 2 | HU7; HU1–HU2 trạng thái có tác dụng (⏸) — HU3–HU6 bóng đổ xong |
| Giao diện | GD | 2 | 2 | 3 | 2 | GD1 F3, GD2 chat, GD4 mobile |
| Gameplay | GP | 3 | 7 | 8 | 1 | GP1–GP2 cấp / tiềm năng; GP4 công thức sát thương (⏸) |
| Event và nhiệm vụ | SK | 0 | 0 | 11 | 0 | SK0 nền event trước, rồi Tống Kim, Dã Tẩu… |
| Hạ tầng | HT | 2 | 1 | 7 | 0 | HT1 đóng gói Desktop / Mobile |
| Hiệu năng tải (cache) | PF | 2 | 0 | 6 | 2 | **Cache còn dở:** PF6 server thật phục vụ asset (⏸ chờ chọn nginx / Caddy / CDN), PF7 Desktop / Mobile (⏸ chờ HT1), PF8 đo + kiểm chứng đủ (sau PF1), PF9 việc nhỏ (CSS chưa `?v=`); PF1–PF3 chưa làm |
| Bot + hiệu năng server | BT | 4 | 0 | 6 | 0 | **Phần 1 bot xong** (vòng 35, `/?bots` + `npm run bots -- <kịch bản>`); Phần 2 đo đếm: BT1 số đo → BT9 kịch bản đo → BT5 baseline → BT6 sửa nghẽn |

Người dùng hỏi **"thống kê công việc"**: in bảng trên (đếm lại từ `BACKLOG.md`) + liệt kê mọi mục 🟡 / ⬜ / ⏸ đáng chú ý, **luôn có
phần cache còn dở PF6–PF9** tới khi chúng xong.

## 4. Quyết định đã chốt và đang chờ

Đã chốt (chi tiết trong `AGENTS.md` §6, `tasks/BACKLOG.md`):
- Nền tảng mục tiêu **Web + Desktop app + Mobile**; mọi câu trả lời kỹ thuật phải cân nhắc cả ba (`AGENTS.md` §1).
- Cấu trúc codebase theo `docs/architecture.md` (đã làm, `d8a677b`).
- **TB0**: tool được đọc bảng file rời `settings/item/` (bản mod) khi `data_extract` không có (`AGENTS.md` §7).
- Phạm vi trang bị: **TB11 hoàng kim môn phái + TB12 Thiên Tứ trước, sau đó TB15** các loại khác.
- **TB8**: chỉ số trang bị có tác dụng cho **đồ xanh + đồ hoàng kim môn phái**; Thiên Tứ và loại khác ở TB17 (làm sau).
- **VT7**: đồ rơi tồn tại **60 giây**; **20 giây đầu** chỉ người đánh chết quái + tổ đội được nhặt.
- **VT9**: quyền nhặt / bảng rơi theo **người đánh chết quái**; chia exp vẫn theo sát thương như bản gốc.
- **VT1 thuốc**: đặt lên phím 1–9, uống không độ trễ, bơm theo dải (bình 5000 = 500 mỗi 0,2 giây); có chủ hiệu thuốc; giá agent quyết.
- **VT3 tiền**: làm cả phần tiền lượng, hiển thị theo giao diện gốc.
- Sát thương theo công thức + bùa / hiệu ứng có tác dụng (USER bỏ tạm dừng 2026-11-12); jx-web-main chỉ tham khảo (không lấy tốc độ, hiệu ứng).

- **Chốt 2026-11-12 (chạy bước 4 → 8):** được **commit sau mỗi bước**; **bỏ tạm dừng GP4 / HU1 / HU2** (sát thương theo công thức,
  trạng thái có tác dụng); nhân vật **về cấp 1**, **cấp 10 chọn phái**, kỹ năng hiện đủ khi đạt cấp học; chiêu 90 / 120 / 150 có chiêu
  lên bằng thục luyện, có chiêu cộng điểm được (nghiên cứu lại bản gốc + jx-web-main); **may mắn mặc định 5**; agent tự chọn các điểm
  chưa rõ của công thức nhưng **công thức phải nằm ở module riêng dễ chỉnh / dùng lại**, có tài liệu trong `docs/` và link từ
  `CLAUDE.md`, `AGENTS.md`; chỉ còn **một phiên** làm việc.

Đang chờ người dùng:
0k. **Vòng 34 (đã commit)** — PF4 web làm xong (`docs/performance/05-cache-va-phien-ban.md` §0); **phần cache còn lại = BACKLOG PF6–PF9**. Agent tự chọn, chờ xem:
   bản build **không chép** `public/assets` vào `dist/` (phải phục vụ `/assets` riêng); chưa có file cấu hình server thật — **còn chờ
   chọn nơi phục vụ asset** (nginx / Caddy / CDN, §8.1), `vite preview` đã gửi đúng header để thử; ngân sách mặc định theo tài liệu
   (2 GB máy tính / 500 MB điện thoại); không có thông báo "Có bản cập nhật" (không cần). Desktop / Mobile chờ HT1.
   Cờ bản đồ nhỏ: cờ đỏ + đường vàng, tự mất khi tới nơi / đứng yên 1,2 s / đi xa cờ 320; bấm Bản đồ lớn cũng cắm cờ.
   `gen:manifest` toàn bộ đã chạy trên máy này (303 gói, 297 bản đồ, 14,4 GB, lần đầu 26 phút); máy khác chạy lại một lần
   (bản đồ chưa có trong manifest thì URL không có `?v=`: vẫn chạy, chỉ không được cache lâu). Bot đã làm ở vòng 35 (mục 0i).
0h. **Vòng 32 (đã commit)** — agent tự chọn, chờ xem: chiêu ngoại công kiếm / đao / côn / thương có tư thế Magic → trên ngựa dùng
   `RideCut` (chém xuống) cho cả thương (bảng gốc không ghi, suy luận từ hình); hào quang ở ô tay bật cả trong thành, không tốn nội lực;
   cả 2 ô cùng là hào quang thì ô phải thắng (chỉ 1 hào quang một lúc); click ô hào quang = đánh bằng chiêu tay kia. Chưa thử trình duyệt.
   Phần 2: tư thế đi bộ đao / thương = Attack2, côn = Attack1, kiếm / chùy giữ Magic; hút sinh lực: cộng % chiêu + % đồ, trần 50 %;
   Thổ Địa Phù: vùng → thành do agent chọn (Lưỡng Hồ → Tương Dương, Đông Bắc / Đặc thù → Biện Kinh), không có độ trễ dùng, không có
   phù quay lại chỗ cũ; Nhận đồ xanh miễn phí; phương án ngũ hành dùng luật dòng ẩn suy luận hiện có (`activeHidden`).
   Phần 4: tốc độ ngựa khi cưỡi giờ = 100 % + `fastwalkrun_p` (bỏ hệ số `horseSpeed` cũ nên ngựa chậm hơn trước); chat Thế giới
   1,5 giây / dòng, 120 ký tự, chưa có lọc từ ngữ / chặn người; reaction 6 emoji (agent chọn), lịch sử theo tài khoản = dòng nhận khi
   online (200 / tài khoản, kho chung 2000) — tài khoản offline không thấy dòng nói lúc vắng mặt.
0j. **Vòng 33 (đã commit)** — agent tự chọn, chờ xem: kênh Hệ thống ghi giết quái kèm exp, exp chia cho đồng đội, nhặt đồ / lượng,
   mua / chế tạo / bán, vào bản đồ (thông báo giữa màn hình vẫn giữ); Enter không còn mở ô chat; "online" = số nhân vật (một tài khoản
   2 nhân vật = 2); thanh máu đỏ cả khi Đồ sát; thanh máu của chính mình cũng đỏ khi bật PK.
0i. **Vòng 35 (đã commit) — bot giả lập người chơi** (`docs/bots.md`): tách bot (Phần 1, xong) khỏi đo đếm (Phần 2, chưa làm, chờ
   người dùng bảo bắt đầu). Dùng: `npm run dev` → `/?bots` (mẫu tài khoản, tạo bot, kịch bản) → `npm run bots -- <tên>`. Agent tự chọn,
   chờ xem: bot thấp cấp nhận bộ hoàng kim cần cấp thấp nhất (món chưa đủ cấp để trong túi); ngựa ngẫu nhiên chỉ trong số cưỡi được;
   thanh kỹ năng bot = chiêu tấn công cấp học cao nhất + 2 bùa lợi + 2 bùa hại + hào quang ô phải; bot PK tự về bãi luyện theo cấp rồi
   bật PK, bot tân thủ chỉ đi dạo. Chưa có: bot tự cộng điểm khi lên cấp / mặc đồ nhặt, hành vi tổ đội / chat / ra vào (BT8).
0g. **Hiệu năng tải tài nguyên (PF, 2026-11-13)** — người dùng chọn làm PF1 đo lường, PF2 giới hạn bộ nhớ texture, PF3 tải theo ưu tiên,
   PF4 cache (nhấn mạnh cache). Đã viết hướng dẫn `docs/performance/` (chưa có code). Chờ duyệt để bắt đầu PF1, và chờ chọn: nơi phục vụ
   asset bản build (tự chạy nginx / Caddy hay CDN), bộ đóng gói Desktop / Mobile (đề xuất Tauri 2), ngân sách cache — `05-cache-va-phien-ban.md` §8.
0d. **Vòng 23–26** — agent tự chọn, chờ xem: lệnh bài có sẵn mọi nhân vật (công cụ thử, không theo gốc); bán trong hành trang ở mọi
   nơi; đồ vứt nằm đất 60 s (người vứt nhặt trước); 4 rương mở sẵn; đổi phái được mọi phái hợp giới; bố cục màn chọn nhân vật (gốc không
   có .ini); chưa có nút Xóa nhân vật; màu chữ phe (vàng / xanh lá / tím / trắng); người bị đánh không cần bật PK; chưa có sát khí / tù;
   exp tổ đội: giết 100 % / đồng đội gần 80 % (vòng 27, đồng đội phải ở gần quái); phản đòn = % sát thương nhận, không phản lại lần nữa. Phím G / K / B.
0f. **Vòng 31** — agent tự chọn, chờ xem: Auto đứng ở 60 % tầm chiêu tầm xa, cận chiến áp sát 40 (chỉnh trong cửa sổ Auto); quái xa hơn
   1200 thì đi bộ tới; kẹt 1,5 s / không mất máu 6 s → bỏ con đó 10 s; kẹt 2 lần → bước sang bên 240. `castRange` không vượt quãng đạn bay
   (ảnh hưởng cả bấm tay và quái). Lệnh dev đổi cấp chiêu cần DEV_TOOLS. **Database (HT6)**: agent đã trả lời phương án, chờ người dùng chọn.
   6 chiêu Hoa Sơn ⚠️ trong `docs/skills-audit.md` (phân loại chưa rà). Thiên Vương 150 thử nghiệm giết quái Mạc Cao Quật chậm (~30 s / con).
0e. **Vòng 28–30** — agent tự chọn, chờ xem: bãi luyện công lấy từ file spawn của mình (dữ liệu quái chỉ tới cấp ~109, trên cấp 101 đều
   về Mạc Cao Quật); Auto chưa tự mặc đồ / cưỡi ngựa / sửa đồ, chưa thử trên trình duyệt phần về thành mua thuốc và tự hồi sinh;
   8 món hoàng kim thiếu hình trong `goldequipres.txt` mượn hình món thường cùng loại, cùng cấp (**suy luận**, kiểm bằng dữ liệu 76/76,
   chưa chụp màn hình); khóa Thiên Tứ trong `HIDDEN_LINES` chờ TB12; Càn Khôn Giới Chỉ = dòng 428 bảng mod + bật mọi dòng ẩn (USER).
0c. **Vòng 21–22** — ủy thác / Bạch Câu Hoàn kỹ năng chưa làm. (Giá vật phẩm: USER giao agent tự quyết, không cần chờ duyệt.)
0b. **Vòng 17–19** — đã chốt: 120 cộng điểm, 150 thục luyện như 90, thục luyện 1 giờ. Còn chờ: may mắn 5
   là mức **trung tính** (đang dùng) hay cộng thẳng (dòng hiếm gấp đôi gốc). Bảng rơi: chỉ dùng bảng gốc data_extract (không cần bản mod).
   Các số CHỌN của chiến đấu (trúng 40 %, trần chí mạng 75 %, chậm 1,5 s mặc định / 50 %, PK × 0,5, boss sinh lực × 12…) nằm trong
   `formulas/tuning.ts`, giải thích ở `docs/formulas/`.
0a. **Vòng 14** — agent tự chọn, chờ người dùng xem: (a) danh sách bộ hoàng kim (TB13) sẽ **hiện đủ, món chưa có màu xám** thay vì ẩn;
   (b) Chế tạo là chức năng chơi thật, giá = giá bảng × (1 + số dòng); (c) luật sáng dòng ẩn (mỗi ô kích hoạt tương sinh + hệ nhân vật
   tương sinh = 1 dòng) là **suy luận**; (d) màu chữ tooltip lấy mẫu từ ảnh (`TIP_COLORS`), màu ô theo `随身物品.ini` + mẫu ảnh;
   (e) nhân vật "123123" trong `db.json` có 15 món chưa vừa lưới, đang chờ trong `bagSpill` (dọn hành trang rồi vào lại để nhận).
0. **Bước 3 (vòng 13)** — các lựa chọn agent tự đặt, chờ người dùng xem (giá đã giao agent quyết): giá = giá bảng gốc; tiền khởi đầu 20000 (quà tân thủ gốc);
   bán = 1/4 giá (ghi chép cũ, nguồn đã xóa); hiệu thuốc = `buysell.txt` dòng 53 bỏ giải độc; uống 2 bình liền thì **cả hai cùng bơm**;
   thuốc không chồng ô (bảng gốc); Auto mặc định uống khi Sinh lực < 50 %, Nội lực < 20 %; số tiền hiện dạng số trơn (suy luận từ
   `随身物品.ini`, không có mã engine để xác minh); nút dev +100 vạn lượng.
1. **KN9 Khinh công** đã làm theo cách hiểu "người đang bay **không nhận** sát thương" (bản gốc vẫn nhận) — người dùng xem thử,
   đổi được ở `World.ts` (`hostile`) + `systems/combat.ts` (`applyHit`). Độ cao bay (`JUMP.peak*`) và Khinh công bị chặn trong thành
   (mọi chiêu đều bị chặn ở bản đồ an toàn) chờ người dùng nhận xét.
2. **VT10 may mắn**: chưa quyết; chờ kết quả **VT12** (nghiên cứu may mắn + bảng tiêu chí xếp hạng vật phẩm + số liệu).
3. **Bắt đầu nhóm việc nào** (mục 5).
4. **GP4 / HU1 / HU2**: khi nào bật công thức sát thương và cho trạng thái có tác dụng ("làm sau").
5. **GD5 / GD6**: làm lại giao diện (công nghệ, mobile) và hình 1:1 trên điện thoại — quyết khi làm.
6. Phím **Z** / Auto không cần Bạch Câu Hoàn (agent tự chọn, có thể đổi); xóa `../jx-web-main.zip` (355 MB)? — **không tự xóa**.

## 5. Bước tiếp theo gợi ý (agent đề xuất, người dùng chưa duyệt)

Chỗ đặt code cho từng việc: `docs/architecture.md` §6–§7. Thứ tự:

1. ~~HU3–HU6 bóng đổ + KN9 Khinh công~~ — xong 2026-11-12 (`63c8d49`).
2. ~~TB1–TB4 nền trang bị~~ — xong 2026-11-12 (vòng 12–13). Việc mới tách ra: TB18 hành trang lưới, TB19 mặt nạ biến hình.
3. ~~VT1 thuốc + VT3 tiền (+ phần uống thuốc của GP9 Auto)~~ — xong 2026-11-12 (vòng 12–13).
3b. ~~TB18 hành trang lưới, tooltip SHXT, TB6 bảng + Chế tạo, TB7 dòng ẩn (hiển thị)~~ — xong 2026-11-12 (vòng 14, `ceef178`).
3c. ~~GD1 cửa sổ Trang bị và Thuộc tính~~ — xong phần giao diện (vòng 15, đã commit); số liệu còn "—" chờ GP1–GP3.
4. ~~KN10 tầng chiêu 90 / 150 + KN11 tên chiêu 1084~~ — xong 2026-11-12 (vòng 16).
5. ~~GP1–GP2 cấp, exp, tiềm năng + KN5, KN12, TB5~~ — xong 2026-11-12 (vòng 17).
6. ~~Lõi chiến đấu GP4–GP6, HU1, HU2, GP10 (đường cong)~~ — xong 2026-11-12 (vòng 18).
7. ~~VT12, VT7–VT9 rơi đồ + nhặt, TB8 chỉ số đồ xanh~~ — xong 2026-11-12 (vòng 19).
8. ~~TB11 hoàng kim môn phái, TB13 đủ bộ, TB14 hình mặc~~ — xong 2026-11-12 (vòng 20). Còn: **TB12 Thiên Tứ** (dữ liệu + cường hóa
   +0…+10 + kỹ năng bạch kim; chỉ số Thiên Tứ có tác dụng là TB17 — USER để sau), **TB15** hoàng kim đời sau.
9. Còn lại: nhóm KN, GP, GD, **SK** (bắt đầu bằng SK0 nền event), HT.
10. **PF hiệu năng tải** (người dùng chọn 2026-11-13): PF1 → PF2 → PF3, PF4 song song sau PF1 — theo `docs/performance/README.md`.

## 6. Ghi chú để làm tiếp nhanh

- Tài liệu: `docs/architecture.md` (cấu trúc mã), `docs/combat-formulas.md` (công thức), `docs/equipment-gold-thientu.md` (hoàng kim /
  Thiên Tứ, sinh bằng `cd apps/client && npx tsx tools/doc-gold.ts`), `docs/shadows.md` (bóng đổ), `docs/ui-and-platforms.md`,
  `docs/regenerate-assets.md`; nghiên cứu cơ chế: `jx1-gameplay-research/` (đã xóa) (09 vật phẩm / rơi đồ, 05–07 event).
- Kiểm tra sau khi sửa: `npm run typecheck`; bot: `npx tsx apps/server/src/dev/bots.ts 4 30 http://localhost:2568`.
  Luật phụ thuộc client: lệnh grep trong `docs/architecture.md` §5.
- Tool sinh dữ liệu không nằm trong `typecheck`; kiểm bằng một tsconfig tạm (`include: apps/client/tools/**/*.ts`,
  `allowImportingTsExtensions`, `types: ["node"]`).
- Server + client thử nghiệm (không đụng server của người dùng):
  - `cd apps/server && PORT=2568 DB_PATH=<scratch>/test-db.json SPAWNS_DIR=<scratch>/spawns-copy npx tsx src/index.ts`
  - `cd apps/client && npx vite --port 5174 --strictPort`, mở `http://127.0.0.1:5174/?server=http%3A%2F%2Flocalhost%3A2568`
  - Tắt bằng pid lấy từ `ss -ltnp` (đừng `pkill -f`, sẽ giết luôn shell).
- Chạy thử trên trình duyệt bằng Playwright có sẵn trên máy: `/root/.npm/_npx/9833c18b2d85bc59/node_modules/playwright-core`, Chromium
  `/root/.cache/ms-playwright/chromium-1148/chrome-linux/chrome` (cờ `--use-gl=angle --use-angle=swiftshader --no-proxy-server`).
  Bản dev có `window.__vltk.room()` / `window.__vltk.game()` để đọc trạng thái. Lần tải đầu trên `/mnt` mất 1–3 phút.
  Phím do Phaser xử lý (F, Tab…) có thể trễ khi đang chụp ảnh bằng swiftshader: chờ trạng thái DOM thay vì chờ cố định;
  Tab trong lúc chụp ảnh không mở được Bản đồ lớn ở cả bản cũ lẫn bản mới (chạy riêng thì mở bình thường).
- Build thử không chép 15 GB `public/`: `npx vite build --config <scratch>/vite.build.mjs` với `publicDir: false`, `outDir` trong scratch.
- Proxy công ty chặn GitHub / trang Trung Quốc (407): WebFetch/curl không mở được, chỉ WebSearch dùng được.
- Script nháp (chụp màn trước / sau, chơi thử) nằm trong scratchpad của phiên, sẽ mất; viết lại khi cần (HT8: đưa vào repo).

## 7. Vấn đề đã biết

- Auto chết nhanh trong bầy quái: quái cũng đánh ngẫu nhiên 50–150 mỗi đòn (đã có thuốc tự uống, nhưng chưa có nguồn kiếm tiền ngoài
  nút dev / bán đồ).
- Hành trang lưới: kéo thả chỉ bằng chuột (HTML5 drag), chưa có chạm cho mobile; ô 28 px nhỏ cho ngón tay (GD4 / GD6).
- Tên "Thất Bảo cà sa (Nữ)" nhưng bảng gốc yêu cầu giới tính Nam (dữ liệu gốc, chưa xử lý).
- Tooltip ô thuốc trên phím 1–9 không tự cập nhật số "Còn N" khi đang mở (rê chuột lại là đúng).
- Mô tả kỹ năng chưa cộng điểm từ trang bị / kỹ năng hỗ trợ; `addblockrate` (Hạo Nhiên Chi Khí) chưa rõ nghĩa nên không hiện.
- Tên đạn Hoa Sơn trong `missiles.gen.ts` lỗi mã; `gen:skills` thiếu 6 file hình gốc (`born01`, `BZ_棰`, `mag_npc_短毛`,
  `mag_tr_09_偷天换日`, `kl_17/18_魔法施放`).
- Bản đồ 356 Trường đấu (1) và 357 Đơn đấu Bình nguyên hỏng từ dữ liệu gốc.
- Đường Môn (bẫy) quá mạnh; chiêu hút máu / nguyền chưa có tác dụng.
- Server chưa kiểm tra người chơi đứng gần NPC khi mua đồ (chỉ kiểm tra "trong thành"); dữ liệu NPC đã ở shared nên làm được.
- Bảng mod: 6 món Thiên Tứ trùng tên món hoàng kim nhưng khác ô; ~320 món hoàng kim tên tiếng Trung chưa dịch.

## Cài đặt máy macOS — 2026-11-13 (đã sinh asset)

- Bản project hiện tại không có `.git`, không đối chiếu được commit cũ; không commit/push.
- Đã `npm install`, tạo `apps/server/.env` từ mẫu nếu chưa có.
- Client gốc: `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`; truyền qua `JX_CLIENT` khi gen (trỏ tới cha của `data/`).
- Đã thêm `tools/jxpak/from-volam.py` + README: tái dùng hash/NRV2B từ `volam-shxt/scripts/unpack_pak.py`, hỗ trợ cờ 1/32, SPR nén frame cờ 17, thứ tự package.ini, manifest 10 cột và tên tương đối WAV/NPC. Không sửa nguồn client.
- Đã tạo `data_extract`: 28 gói, 155.655 ID bản thắng; 155.654 giải nén đúng kích thước, 11.120 ID có tên. Một entry nguồn lỗi `ui:8420d4fe` (七剑光环.spr), payload 32 byte zero dù cờ SPR. Báo trong extraction-report.json; tool trả mã 1 để không che lỗi.
- Cả sáu lệnh gen đã thành công: assets, skills, maps (37 Biện Kinh + 140 Dược Vương Cốc), ui, sounds, gold. Chưa gen toàn bộ ~300 bản đồ.
- Kết quả: 9.439 sprite sheet (~438 MB), 1.383 vật phẩm, 54 ngựa, 1.193 quái (63 nhóm hình theo spawn); 238 hiệu ứng kỹ năng, giao diện + 11 con trỏ; 295 âm thanh + 30 nhạc; 140 món hoàng kim. Các generator tự cập nhật manifest.
- Cảnh báo thiếu đúng số đã ghi trong docs: 4.726 tham chiếu hình, 5 hình kỹ năng, 121 âm thanh/nhạc (nguồn không có). Entry UI lỗi không cản sáu lệnh gen.
- Đã kiểm tra kích thước file trong manifest, thứ tự bản thắng, JSON hai bản đồ; xem ảnh thumb Biện Kinh.

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

## Chốt commit — 2026-11-13

- Người dùng yêu cầu commit code hiện tại. Gồm bản sửa MapRoom.ts và cập nhật CURRENT/BACKLOG/HISTORY về điều tra trang bị, kết quả kiểm tra buff/hào quang.
- Kiểm chứng đã hoàn tất: WebSocket thật mặc/đổi/tháo/mặc lại cập nhật ngay, thao tác túi không gửi thừa stats; typecheck thành công. `git diff --check` sạch trước commit.
- Commit: `fix(server): sync recalculated stats after inventory changes` (hash xem `git log -1`). Không push.
- Việc chờ tiếp: lỗi đồng bộ chỉ số khi mất buff do chết/hồi sinh, chưa được yêu cầu sửa.
