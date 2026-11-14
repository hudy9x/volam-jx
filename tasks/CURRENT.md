# Điểm dừng hiện tại

> **2026-11-14 · Sửa lỗi giật tốc độ chạy do Aura và thêm log đối chiếu tốc độ (commit theo USER; mã xem `git log -1`):** xử lý dứt điểm hiện tượng dao động nhịp chạy (moveScale 1.67 <=> 1.17) khi mang hào quang (như Lưu Thủy Nga My +66% chạy, P2=18 frames ~1000ms). Cập nhật `packages/shared/src/status/states.ts` (`stateAttrsAt`, `applyState`) để thuộc tính hào quang không bị hết hạn sớm theo P2 mà tồn tại suốt thời lượng aura. Bổ sung log console devtool plain-text trong `ActorView.ts` so sánh chuẩn cấu hình (frames/FPS/thời lượng) với sprite thực tế khi đánh và chạy. Bổ sung test aura speed attributes trong `tests/speed-phases.test.ts`. Đạt `npm run test:speed` (5/5 pass), `npm run typecheck` (0 lỗi), `npm run build` đạt. Commit theo yêu cầu USER, không push; giữ các thay đổi ngoài phạm vi (keymap N, docs Tống Kim / kiến trúc, untracked docs).


> **2026-11-14 · Tách tài liệu Auto / Rao bán theo USER (commit tài liệu; mã xem git log -1):** `docs/auto.md` ghi điều khiển Z/dialog/quick toggle, lưu DB/cache từng nhân vật, resume, chọn chiêu/boss, loot và bán NPC; `docs/rao-ban.md` ghi tin gắn món/preview, giá lượng/KNB/liên hệ, giao dịch, lịch sử công khai và bot rao. Mỗi tài liệu có mã nguồn, kiểm chứng thực tế, giới hạn và commit triển khai `a7180d3`/`7491d71`. AGENTS mục0 + CLAUDE/GEMINI + `.agents/rules/auto-rao-ban.md` always_on bắt buộc đọc đúng chủ đề khi nhắc từ khóa; đọc cả hai nếu liên quan cả hai. README/bots-guide dẫn trực tiếp; `auto-and-market.md` chỉ giữ liên kết tương thích, không nhân bản nghiệp vụ. Kiểm link và diff; chỉ đổi tài liệu, không chạy lại gameplay. Commit tài liệu theo USER, không push; giữ ActorView/frameTrace (xóa đã stage), đổi C→N, kiến trúc và nghiên cứu Tống Kim ngoài commit.

> **2026-11-14 · Auto theo nhân vật + Mua bán/KNB theo USER (checkpoint theo yêu cầu USER; mã xem git log -1):** đã commit checkpoint trước `a7180d3` (12 file Auto/bot, giữ staged xóa frameTrace và mọi thay đổi ngoài phạm vi). Z/AUTO chỉ mở dialog; nút Chạy/Dừng và play/pause cạnh tên, DB CharacterRecord.auto + cache từng charId, server đối chiếu cache và reload tiếp tục; trong thành tắt autoMap thì chờ. Bot ghi Auto kịch bản vào DB và dừng tắt. Mua bán có chat thường, tin snapshot món do server lấy, preview ảnh/thuộc tính, rao từ hành trang theo lượng/KNB/liên hệ, mua trực tiếp khi seller online; chống thiếu tiền/full bag/UID hoặc thuộc tính đổi/tự mua/replay/trần ví; lưu hai ví và món, tin sold. Lịch sử Mua bán công khai cho người vào sau; Thế giới vẫn riêng tài khoản. KNB mặc định0, Kỳ Trân Các trong thành giá100vạn/đơn vị, hiển thị dưới lượng; moneyText và tiền đất/log dùng vạn. Tài liệu `docs/auto-and-market.md`. Typecheck/build đạt (chunk lớn có sẵn); test:auto4 + test:market6 + test:bots6 đạt. WS thật lượng/KNB/replay/DB/rejoin đạt; Chromium1440/390px Z/start/reload/pause/rao/preview đạt, UI mua KNB + Kỳ Trân Các + số dư đạt, đã xem ảnh. Tất cả dùng2568/5174, DB `/tmp/jx-market-auto/db.json`, không đụng game người dùng; chưa native/mobile thật. Không bán offline/đổi trang bị/escrow. Giữ thay đổi ActorView/frameTrace/keymap/character, kiến trúc, nghiên cứu Tống Kim từ phiên khác, Bản snapshot commit kiểm riêng: typecheck và16test đạt, không lấy phụ thuộc ActorView đang sửa ở working tree. Commit riêng phần Auto/Mua bán/KNB theo yêu cầu USER, không push; phần keymap chỉ lấy hướng dẫn Z, giữ đổi C→N ngoài commit.

> **2026-11-14 · Auto/bot theo USER (đã commit a7180d3):** sửa xoay chiêu cả boss, fallback sang chiêu sẵn sàng và lọc đánh thường khỏi vòng có chiêu thật; bot refresh thanh chiêu theo cưỡi/noHorse. Mặc định mới không bỏ boss, ưu tiên Hoàng Kim→Xanh→thường; sửa lỗi giữ mục tiêu thường dù boss xuất hiện. Thêm nhặt ngân lượng độc lập, bỏ qua trang bị không vừa túi, bán xanh opt-in + giữ món đủ tiêu chí rao; preset30 bật bán bảo vệ. Cấu hình cũ đã lưu vẫn giữ lựa chọn, cần đổi/chạy lại; không reset tài khoản. test:auto 3 ca, test:bots 6 ca, typecheck và build đạt (cảnh báo chunk lớn có sẵn). Chưa xác minh combat/nhặt bán qua WS hoặc QA trực quan mới; chưa sửa dữ liệu game thật. HEAD7b9be06; giữ mọi thay đổi ngoài phạm vi và staged xóa frameTrace.

> **2026-11-14 · Commit toàn bộ tạo Boss theo USER (mã xem git log -1):** `feat(boss): integrate configurable golden boss spawning and drops` hoàn tất phần còn lại sau aec1052: MONSTERS theo cấu hình44Boss, điểm xuất hiện/lịch/hồi sinh, bảng rơi, API reload và gen-assets + metadata/cache141sheet/22res/39shadowmapping. Kèm kết quả5BossWS/Chromium từ vòng trước; không ghi ảnh WebP sinh vào git. README bỏ ghi chú tích hợp chưa commit. Bản commit kiểm riêng ở /tmp/jx-boss-integration-check: typecheck toàn repo, tsc tool và build đạt; WS5Boss + API tắt/bật đạt trên2571/DBriêng, sau2,10–2,18s. Build báo asset runtime do snapshot không chứa asset sinh và chunk lớn có sẵn. Giữ thay đổi keymap/kiến trúc theo phímN, ActorView/frameTrace và nghiên cứu Tống Kim ngoài commit, kể cả phần frameTrace đã stage trước phiên. Không push.

> **2026-11-14 · Kiểm chứng xuất hiện 5 Boss Hoàng Kim (đạt):** USER yêu cầu test3–5Boss. Chạy server riêng2568/client5174, DB `/tmp/jx-boss-spawn-test/db.json`, AUTH_SECRET thử riêng; không gọi API thay đổi game2567 hoặc tool4567. Dùng cấu hình hiện tại continuous10s, không ghi config. 5Boss cấp95/HP390300: Huyền Giác Đại Sư740/map320; Đường Bất Nhiễm741/map340; Thanh Tuyệt Sư Thái743/map21; Mạnh Thương Lương583/map224; Đạo Thanh Chân Nhân562/map6. WebSocket thật xác nhận ban đầu chưa có, sau2,09–2,19s đúng1con/mục, boss2/sprite/cấp/HP/tọa độ đúng cấu hình/nav. Reload tắt740: chỉ740mất,4conkhác vẫn có; bật lại đủ5,không trùng. Chromium1440×1000 xác nhận5sprite có texture thật/đang vẽ/trong camera, tên vàng#ffd700; không pageerror hoặc assetHTTP4xx/5xx; đã xem cả5ảnh. Chỉ đổi camera client thử để quan sát, nhân vật thử đứng ở điểm vào map. Script/kết quả/ảnh `/tmp/jx-boss-spawn-test/`. HEADaec1052; phần tích hợp gameplay được test là working tree chưa commit, không phải chỉ HEAD. Không sửa mã/asset/config/gameplay; không commit/push. Chưa test đánh chết/hồi sinh tự nhiên, cân bằng hay native/mobile; reload là bài kiểm tra vòng xuất hiện riêng.

> **2026-11-14 · Commit tool Boss theo USER (mã xem `git log -1`):** `feat(boss-tool): improve golden boss administration UX` gồm tools/boss, script npm, shared/bosses + export làm phụ thuộc cần thiết và tracking. Tích hợp gameplay trong monsters/spawner/drops/combat/devtools, asset generator, keymap và nghiên cứu Tống Kim vẫn ngoài commit. API Áp dụng cần phần tích hợp game dev đang có trong working tree; checkout riêng commit này chưa cung cấp route reload game. Kiểm bản index độc lập: typecheck toàn repo, tsc tool, bootstrap44Boss/dialog bundle đạt. Không push.

> **2026-11-14 · Review và sửa UI/UX tool Boss Hoàng Kim (hoàn tất):** theo `docs/tools-ui-ux-guidelines.md`, chỉnh `tools/boss` hiện có: danh sách Boss trước cấu hình chung, điều hướng nhanh, token xanh trung tính, bảng cuộn riêng, 44 Boss có tìm/lọc/số kết quả/trạng thái bật-tắt, danh sách đồ rơi thu gọn. Chỉ mở thông số lịch đang dùng; báo lỗi giá trị thay vì tự clamp. Dialog dùng lại `ui/kit/dialog.ts` bundle độc lập, kéo/Esc/focus/Tab, Hủy giữ nguyên; bulk trang bị đúng kết quả lọc, xác nhận tọa độ qua snap và bỏ phản hồi cũ khi đổi/hủy. Tách Lưu (ghi cấu hình) và Áp dụng (API game), chặn gửi trùng, lỗi giữ bản nháp; UI/README nêu game dev watcher có thể tự reload khi lưu. Tool chỉ loopback, asset theo manifest; README mới có cách dùng/giới hạn nền tảng. Chromium1440×1000/390×844 và ảnh render đạt; test trạng thái/lỗi/duplicate409 dùng upstream giả và PUT hợp lệ giả lập, hash config không đổi, không gọi game thật. Typecheck toàn repo + tsc tool riêng + build đạt (cảnh báo chunk lớn có sẵn). Chưa thử wrapper native/điện thoại thật. HEAD38645fb, không commit/push; giữ mọi thay đổi gameplay/Boss/dữ liệu đang có. Tool thử :4577; ảnh/script `/tmp/jx-boss-ui/`.

> **2026-11-14 · GD8 guideline tool (checkpoint theo yêu cầu USER; mã xem git log -1):** tạo `docs/tools-ui-ux-guidelines.md` làm nguồn duy nhất dựa trên Bot UI: tokens/style/component, form/template readonly, save-vs-apply, bulk selection, bảng/dialog/status, responsive/a11y, app độc lập và checklist tự kiểm. Root AGENTS/CLAUDE/GEMINI + tools/AGENTS + `.agents/rules/tools-ui-ux.md` always_on yêu cầu đọc toàn bộ trước khi đề xuất/kế hoạch/code tool. Đã đối chiếu tài liệu chính thức Gemini/Antigravity cho vị trí rule, kiểm link/frontmatter/diff; không thay UI hoặc mã chạy. USER đã yêu cầu commit riêng guideline với title `docs(tools): establish shared UI UX guidelines for AI agents`; không push. Commit nền465ae65/main; giữ thay đổi Boss/asset/keymap/nghiên cứu đang có. Quy tắc repo không tự áp dụng được cho chat không truy cập repo.

> **2026-11-14 · Checkpoint bot theo yêu cầu USER:** checkpoint `feat(bots): ship standalone bot tools and continuous scenarios` (mã commit: `git log -1`) gồm tools/bots, roster200, UI chạy trực tiếp, preset30, protocol pickup và tài liệu. Kèm4phụthuộc client bị thiếu ở HEAD nền: speedSample/frameTrace/PaperDoll.frame-action/ActorState.ctl; không thay công thức tốc độ. Đã kiểm bản index độc lập tại/tmp: typecheck, test:bots6checks, test:speed4checks, build và diff-check đều đạt. Giữ Boss/asset/keymap/Tống Kim/nghiên cứu ngoài commit; không push. Các điểm dừng cũ bên dưới là lịch sử, mốc mã hiện tại xem git log.

> **2026-11-14 · BT10 app bot riêng + preset + chạy từ bảng (hoàn tất):** UI/runner/config chuyển `tools/bots`, `npm run bots:ui`→localhost4568, build UI1lần không Vite/HMR; ConfigStore tự đọc/lưu và preview không cần gamefrontend. App.ts?bots chỉ chuyển4568. Spawn thêmboth thành+bãi(default). Có3templatecap40–69/70–90/110–150 và `luyen-cong-30` (30têncốđịnh,10/dải,3/s,liên tục), initialSetup chỉtạoaccountthiếu/giữprogresscũ. Bảng có chọn/chạy kịchbản chỉkhichecktên, Online theoIPC/connection vàcộtKịchbản, dừngriêngIDkhôngdừngngườikhác. CLI/root/serveraliases vàpaths/types/checks/docs đãđổi. Typecheck/test:bots6checks/build/diff đạt; Chromium desktop/mobile,2botđúngcheckbox/levels/stopsubset, UIreloadvẫnonline,invalid/cross-originblock, chạyđủ30botOnline10/dải vàdọnsạch đềuđạt trênDBriêng/tmp/jx-bots-tool. HEAD897f9ec/main khớp bàn giao, giữ việcboss/speed/assetskhác; khôngcommit/push, khôngchạybotởDBthật. Côngcụ4568 đượcgiữmở; test2568/4570 đãdừngcuốivòng.

> **2026-11-14 · BT10 scenario liên tục + BT8 một phần:** UI template/custom readonly giống nhân vật, lưu hỏi tên + commandcopy; bỏ duration/seed/tỉ lệ/modes cũ. Chỉ3activitygrind/chat/sell đồng thời, grind có autoAcceptTeam mặc định bật. Chỉ chat/rao khi groundpickup thành công và món>5dòng hoặc ẩn hiếm(weight≤1200)/lớn(≥90%max); gold theo maxdòngriêng. DedupeUID,60s/bot,5s/runner; không tự giao dịch. Join3/4/5(s mặc định3) từng người cáchđều, duration luôn0 vàrunnerkhôngtimerkểcảfilecũ; Ctrl+C dừng. Chromium1440/390,unitroster/social,APIclamp,WS nhậnđộiON/OFF và1tinworldsaupickup,runnerjoin809/1135/1462ms vàcònonlinequáduration1/Ctrl+Coffline đều đạt. Build, typecheck toàn repo chạy lại cuối vòng và diff-check đều đạt. DBriêng/tmp/jx-bot-social; HEADf9ccdd8/main, chưa commit/push, giữ công việc khác.

> **2026-11-14 · Áp dụng bảng tốc độ mới theo USER (hoàn tất, commit `897f9ec`):** nền mặc định 10% (`basePercent = 10`, 10% = 1 điểm chạy, lượng frame tại 10% bằng mốc 50% cũ), mở rộng dải mốc 5%–260% theo USER. Đánh (chuẩn 20 frame): 5–260% (16–40 FPS). Chạy (chuẩn 8 frame): 5–260% (6–13 FPS). Bảng F3 / N hiển thị `T.Độ Chạy` = `speedPoints(totals.run)` (nền 10% = 1 điểm). `?skills` mặc định 10%, hiển thị `10% = tốc nền`. Đạt `npm run test:speed` (4 test pass), `npm run typecheck`, `npm run build`, `git diff --check`. Đã commit phần tốc độ theo yêu cầu USER (`897f9ec`); không push. Chi tiết `docs/formulas/speed.md` §13.

> **2026-11-14 · Lưu hướng dẫn cấu hình speed theo USER:** bổ sung speed.md§12 và đường dẫn AGENTS: vai trò speed.ts/tuning.ts, mức nền100% chưa có khóa cấu hình, ví dụ79→179 và giảm nền, phân biệt mốc/FPS/frame/quãng đường, lưu ý không thay mọi số100. Chỉ tài liệu, không đổi công thức/commit; HEADf9ccdd8/main, giữ việc khác.

> **2026-11-14 · BT10 bổ sung theo USER (hoàn tất):** bỏ picker/summary map lặp ở form chính, chỉ chọn tại Nâng cao. Vũ khí xanh bot bắt buộc hútSL10%+NL10% max toàn bảng, hai prefix luôn bật, ngoại lệ option chỉ cho bot kể cả cấp vũ khí thấp; helper `shared/src/bots/equipment.ts`. Default thuốc Ngũ Hoa Ngọc Lộ Hoàn hồi5000SL+5000NL, 50+50=100bình chung; dropdown ưu tiên dual. Thêm giải thích5input scenario ngay tại form. Roster tests quét mọi loại/cấp/hệ vũ khí; WS3band xác nhận maxsteals/100pills/skillcaps; Chromium desktop/mobile và typecheck/build/diff đạt. DB riêng `/tmp/jx-bot-options`, không DB thật/commit/push; HEADf9ccdd8 main, giữ việc khác.

> **2026-11-14 · Đã đọc log USER79:** file speed-frames-1794623781070.json có320mẫu; atk79/cast75/run104→tổng179/175/204, actionMs500, moveScale2. Đo thực median đòn500ms, chạy2,996855vòng/s; renderer~31,885FPS. Game khớp mốc150đánh/200chạy. Lab nhập79tổng sẽ là1000ms, cần179ngoại/175nội và204chạy để so cùng điều kiện. Chưa có loglab ghép cặp, chưa đổi công thức hoặc commit. Chi tiết cuối speed.md.

> **2026-11-14 · BT10 form thiết lập theo USER (hoàn tất):** template có tiêu đề/select nhóm Tự cài đặt và template đã lưu, chọn tự tải + khóa toàn bộ form để review. Ba dải40–69/70–90/110–150; xanh/gold; ngựa random đủ cấp, từ110 chỉ nhóm tốc gần mạnh nhất; auto học90/120/150 đủ điều kiện; bỏ giới chỉ. Bỏ tạo/nạp, dùng Cập nhật thiết lập (upsert offline roster, giữ identity/charId/mật khẩu cũ) và Lưu Thiết lập (dialog hỏi tên, chỉ lưu, không áp). Dialog map dùng kit/dialog, preview minimap, cuộn, lựa chọn thành/bãi mặc định tất cả đã sinh, OK cập nhật ID; advanced có ID đăng nhập. Bảng roster cập nhật cấp/đồ/ngựa/map/title. Typecheck/build/diff/roster tests và Chromium1440/390 đạt; WebSocket3phái/3band mặc10ô xanh, ngựa đủ cấp, skill đúngcap; gold5món bộ đã mặc, online skip. DB/scenario riêng `/tmp/jx-bot-config-v2*`, không DB thật. HEAD `f9ccdd8` main khớp bàn giao, chưa commit/push; giữ GP6/Tống Kim/KN14 đang có.

> **2026-11-14 · Chờ log trường hợp79 của USER:** đã thêm nút dev Ghi frame10giây trong game, tảiJSON frame/nhịp/vị trí/thuộc tính/mốc. Chưa xác minh trường hợp79; kết quả so game/lab trước chỉ đúng bộ mẫu thử. Typecheck đạt; chưa kiểm thao tác tải trong trình duyệt, chưa commit.

> **2026-11-14 · Đổi phím nhân vật theo USER:** Trang bị và Thuộc tính mở bằng **N** thay C do trùng. Khai báo ở `apps/client/src/input/keymap.ts` → KEYS.char; HUD/help tự theo bảng. Hướng dẫn đối chiếu tốc cập nhật N→Thử tốc độ. HEAD f9ccdd8/main, chưa commit phần đổi phím; giữ thay đổi khác.

> **2026-11-14 · GP6 đối chiếu game / skills** (HEAD `f9ccdd8`, main, bổ sung chưa commit): USER thấy lệch cả đánh/chạy. Xác minh đơn vị khác nhau: C hiển thị đánh cộng thêm/chạy điểm; lab nhập tổng%. Thêm C→Thử tốc độ (dev) mang snapshot tổng ngoại/nội/chạy sau bùa/chậm, phái/chiêu/cấp/giới/ngựa quaURL; tooltip và nhãn giải thích rõ, không sửa mốc/FPS. Chromium game thật + WebSocket/DB riêng: game/lab cùng3vòng/s và400ms/đòn với mẫu đánh+125/nội+90/chạy20điểm; chưa có số từ tài khoản USER để quy mọi khác biệt về đơn vị. Typecheck/4test/build đạt, không pageerror. Chi tiết speed.md§11; không sửa DB thật, không commit/push và giữ Bot/Tống Kim/KN14 đang có.

> **2026-11-14 · GP6 commit theo yêu cầu USER** (commit `f9ccdd8`, nhánh thực tế `main`; khác nhánh `feature/skill-system` ghi trong AGENTS, không tự đổi nhánh): đã lưu cấu hình tốc độ và chỉ dẫn AI tại `packages/shared/src/formulas/tuning.ts` → `SPEED`, `AGENTS.md` §6 và `docs/formulas/speed.md` §10.1. Commit gồm mốc đánh/chạy, chuẩn hóa hoạt ảnh, cài đặt `?skills` và kiểm tra tốc độ; không push. Các thay đổi Bot/KN14/Tống Kim khác được giữ ngoài commit. Kiểm chứng: typecheck/test:speed/build và các kiểm tra trình duyệt/WebSocket ở §10.4.

> **2026-11-14 · GP6 đã áp dụng mốc volamidle + trang thử theo USER** (commit nền `460930c`, chưa commit): cấu hình chung `tuning.ts SPEED` tổng25–300%, đánh20frame/chạy8frame, distanceScale1.15. Cộng Dương/chậm trước chọn mốc; server snapshot duration/Actor.actionMs, client chuẩn hóa bộ đi chân/cưỡi. Pose hoàn tất phát1chiêu chính; tầng phụ giữ nhịp riêng. `?skills` có nhập/chọn mốc đánh/chạy, Đứng/Tự đánh/Tự chạy/Chạy&đánh, cưỡi và sửa/reset cấu hình thử không ảnh hưởng game. Typecheck/3test/build đạt; Chromium75tổ hợpFPS/frame-count, tự đánh800/400/285,7ms, đi chân/ngựa cùng200%=3vòng/s;2WebSocket thật nhận đúngphase/duration/mount. DB riêng, server thử2569 (2568 đang có phiên khác), không đụng DB/server chính. Chi tiết speed.md§10. Chưa thử wrapper native; giữ toàn bộ thay đổi Bot/KN14/Tống Kim khác, không commit/push.

> **2026-11-14 · BT10 hoàn tất (USER duyệt triển khai):** 200 danh tính tĩnh `shared/src/bots/roster.ts` (tên/giới/phái cố định), chọn tên/lọc/chọn hàng loạt, mẫu sức mạnh riêng, Nâng cao và input thống nhất; activity selector chỉ hiện tùy chọn tương ứng. Scenario lưu usernames cụ thể, lệnh hiển thị có sao chép và yêu cầu lưu sau khi sửa. API tạo kiểm trùng và idempotent, reset giữ charId/identity; legacy prefix/count tương thích, bot cũ giữ nguyên. Đã kiểm typecheck/build/diff, test roster/schema, API200 reset đảo thứ tự, Chromium desktop/mobile, runner2bot và setup thực. Chỉ dùng DB `/tmp/jx-bot-roster/db.json`, không sửa DB thật. Không thêm dependency, chưa kiểm native wrapper. Commit nền `460930c`, chưa commit/push; giữ thay đổi GP6/skill-lab/Tống Kim đang có. Hướng dẫn `docs/bots-guide.md`.

> **2026-11-14 · GP6 đối chiếu mốc (chỉ đọc):** USER thấy quá nhanh, yêu cầu bảng2cột và tham khảo volamidle/SHXT. Xác minh `volamidle/src/client/speed/config.ts`: tổng25–300%, bảng chạy chuẩn8frame3→36FPS, đánh chuẩn20frame5→70FPS; chọn mốc thấp hơn, có trần. Bản hiện tại chạy18FPSảnh×rate tuyến tính chưa trần/chưa chuẩn hóa sheet; ngựa10frame tổng200% hiện36FPS, volamidle30FPSảnh (nhanh hơn20%). SHXT chỉ xác minh cấu hình nền, chưa chứng minh bảng mốc tương đương. Chi tiết speed.md§9. Chưa đổi gameplay/commit; giữ công việc KN14/KN15/Tống Kim khác.

> **2026-11-14 · Chốt lại phạm vi session (USER):** session này chỉ điều tra và xử lý việc chiêu **80/120/150 chưa nhận đúng hỗ trợ kỹ năng** (KN14), gồm dữ liệu/mapping, bonus thực chiến và hiển thị hỗ trợ. Chưa triển khai code. **Hoa Sơn phân tuyến Kiếm Tông/Khí Tông + Gợi ý cộng điểm + mô tả bảng Kỹ năng** tách KN15, bàn giao tại `docs/huashan-skill-routes.md`; người dùng tự tạo session riêng. Không tự gộp cân bằng sát thương, cơ chế khí trường/kích nổ hoặc thục luyện vào hai việc này. Commit nền `460930c`; lần này chỉ thêm tài liệu và cập nhật tasks, không commit/push; giữ các thay đổi GP6/Tống Kim đang có.

> **2026-11-14 · Hoa Sơn/KN15 (chỉ điều tra):** KN14 vẫn chưa triển khai. Đã xác minh28 entry học/21 icon/7 cặp trùng do cùng đường dẫn nguồn; bảng học dựng tay đưa cả chiêu thành phần/kích hoạt thành entry. Hoa Sơn thiếu CATALOG tuyến nên Gợi ý trộn hai tông và luôn dùng tỷ lệ ngoại công65/5/30/0; tái hiện người cấp60 đã cộng1372=20 vẫn bị gợi ý1349 (bị động làm giảm hồi nội lực-10000). Cơ chế Khí Tông và tiến trình1363/1368 còn thiếu/lệch, cần rà trước triển khai. Chi tiết đầu HISTORY; BACKLOG KN15. Commit `460930c`; giữ GP6/Tống Kim, chỉ sửa tasks, không commit/push. Chờ duyệt hướng xử lý.

> **2026-11-14 · Tống Kim — chờ duyệt gameplay:** USER cho tự thiết kế phần thiếu nguồn. Đã có `docs/tong-kim-gameplay-proposal.md`: Bảo vệ Nguyên Soái, PK, năm quân hàm, 27 món chiến đấu và soái sáu nhóm chiêu. Chưa được duyệt viết code; số tự chọn gắn CHỌN. Commit nền `460930c`; giữ thay đổi GP6 đồng thời.

> **2026-11-14 · GP6 đã sửa nhịp di chuyển theo yêu cầu USER** (commit nền `460930c`, chưa commit): thêm `Actor.moveScale`, truyền hệ số nhịp chạy qua `followPath` cho mọi client; `ActorView` tích lũy phase theo hệ số, áp dụng cả đi chân/cưỡi/chậm. Typecheck/build/diff-check đạt; Chromium 36 tổ hợp30/60/120FPS + cảnh Phaser thật; hai WebSocket nhận đúng tốc/bị chậm/hết chậm/lên-xuống ngựa. Dùng server thử2568/Vite5174 và DB riêng, không chỉnh DB thật. Phần tốc đánh/xuất chiêu vẫn chờ triển khai; cadence hiện tại là lựa chọn trải nghiệm, chưa chứng minh công thức engine gốc. Chưa kiểm wrapper native. Chi tiết `docs/formulas/speed.md` §8; giữ nguyên thay đổi Tống Kim và công việc khác.

> **2026-11-14 · GP6 bổ sung di chuyển** (commit nền `460930c`, chỉ điều tra): đã xác minh nhịp chạy client cố định 18 frame/s, tách rời hệ số dịch chuyển server, cả `RideRun`. Schema chưa truyền tốc/cadence tới mọi actor. Bản PAK và file rời `basevalue.ini` khớp: `RunFrame=14`, `WalkFrame=12`; số10/5 là RunSpeed/WalkSpeed. Đã bổ sung `docs/formulas/speed.md` §7 và BACKLOG GP6; cadence theo tốc là đề xuất, chưa chứng minh cách engine gốc tính. Chưa sửa gameplay/commit/push; giữ nguyên thay đổi Tống Kim và công việc khác đang có.

> **2026-11-14 · Tống Kim/SHXT:** đã viết lại tài liệu theo USER, cao cấp trước, một trận/tầng, lịch mở tùy lúc, bắt buộc báo danh+sảnh chờ. Nguồn PAK ở `docs/research/tong-kim-shxt-sources.md`; điều phối/điểm/thưởng/thời lượng còn thiếu, chưa thể coi là đặc tả 1:1 hoàn chỉnh. Commit `460930c`, chưa code/commit. Xem mục cuối cùng bên dưới.

> Điều tra mới nhất **2026-11-14 · KN14** (chưa triển khai, commit `bb9ae2e`): đã xác minh thiếu mapping bảng ngoài việc khác nguồn Lua; hỗ trợ34/45 vẫn có tác dụng dù mất tooltip; Thúy Yên111 đã hỗ trợ1065=58%, thiếu1093=58%; Côn Lôn173 có hỗ trợ trong Lua rời nhưng cả hai bảng không khai báo; Hoa Sơn1384 cần cơ chế candetonate chưa được engine xử lý. Cần kiểm tra nguy cơ cộng root+child hai lần, độc1066 đổi duration/period và độ phủ bảng rời trước khi đổi nguồn. Chi tiết/số liệu/giới hạn ở đầu `tasks/HISTORY.md`. Chỉ cập nhật tasks, giữ thay đổi đang có; không commit/push. Chờ người dùng duyệt phạm vi triển khai; chưa tự đổi chính sách PAK sang mod.

> Điểm dừng mới nhất **2026-11-14**: rà soát cơ chế **Tốc độ đánh & Xuất chiêu** đối chiếu `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT` (`settings/npc/player/basevalue.ini`, `game.exe`, `settings/magicdesc.ini`, `script/skill/*.lua`) và lập tài liệu kỹ thuật chi tiết tại **`docs/formulas/speed.md`** + cập nhật **`tasks/BACKLOG.md` mục `GP6`** (chưa sửa code, chờ người dùng triển khai sau):
> - Xác minh chuẩn gốc: `AttackFrame = 18`, `CastFrame = 18` ở `18 FPS` (`1000 ms` ở `0%` tốc độ đánh); số frame thực tế `floor(18 * 100 / (100 + pct))` (tối thiểu `6 frames` = `333 ms` ở `158%+`).
> - Ghi nhận 4 nguyên nhân khiến tốc độ đánh hiện tại cố định và quá nhanh: (1) `ActorView.ts:11,112` khóa cứng hoạt ảnh `attack1`/`attack2`/`magic` ở `30 FPS` (~400–533 ms), `combat.ts:28` gọi `playOnce` quên nhân `scale` và chưa đồng bộ thời lượng động tác xuống client; (2) `SkillEngine.ts:144` đặt chu kỳ gốc `530–600 ms` thay vì `1000 ms`; (3) `SkillEngine.ts:241,325` hẹn giờ các thức liên hoàn (`genData`, `wait`) theo `JX_TICK_MS` cố định, không nhân `scale`; (4) `speed.ts:17` & `character.ts:142` chưa cộng `attackspeed_yan_v` / `castspeed_yan_v` (Dương).

> Trước đó **2026-11-14**: phân loại 3 bậc **Quái thường (tên Trắng `#ffffff`) / Boss Xanh (`boss = 1`, tên Xanh dương `#5cb8ff`) / Boss Hoàng Kim (`boss = 2`, tên Vàng `#ffd700`)** chuẩn VLTK 1 (USER 2026-11-14, GP11):
> - Cập nhật màu tên trên đầu (`ActorView.ts`), chấm bản đồ nhỏ (`minimap.ts`) và bản đồ lớn (`bigmap.ts`).
> - Bổ sung 20 **Boss Hoàng Kim** kinh điển trong `packages/shared/src/monsters/monsters.ts` (`GOLDEN_BOSS_LIST`: *Cổ Bách, Vương Tá, Huyền Giác Đại Sư, Hàn Mông, Đường Bất Nhiễm, Lam Y Y, Bạch Doanh Doanh, Đường Phong, Thanh Tuyệt Sư Thái, Hà Liên Phiêu, Chung Linh Tú, Yến Hiểu Tranh, Hà Nhân Ngã, Mạnh Thương Lương, Gia Luật Tị Ly, Đoan Mộc Duệ, Hoàn Nhan Tuyết Y, Đạo Thanh Chân Nhân, Đơn Tư Nam, Tuyền Cơ Tử*) kèm bộ kỹ năng 90 môn phái và bảng rơi `boss/*droprate`.
> - Phân bổ trên toàn bộ **40 bãi luyện công** (`gen-spawns.ts` + `spawns/*.json`) và **Dược Vương Cốc (`140.json`)**: mỗi bãi có 2 điểm **Boss Xanh** cố định (`boss: 1`, máu/exp ×5, 4 lần tung đồ), 1 điểm **Boss Hoàng Kim** cố định ở sâu trong bản đồ (`boss: 2`, máu/exp ×12, 8 lần tung đồ `boss/*droprate` có tỉ lệ rơi Hoàng Kim môn phái), kèm 3% tỉ lệ quái thường khi hồi sinh tự hóa thành **Boss Xanh** ngay tại bãi (`DROPS.blueBossChance`).
> - Đã chạy `gen:spawns`, `gen:skills`, `gen:assets` (sinh thêm 103 sprite sheet hình + bóng của 20 Boss Hoàng Kim vào `public/assets/npc/`), kiểm chứng `npm run typecheck` và `git diff --check` đạt; đã commit (xem `git log -1`), không push.

> Trước đó **2026-11-14**: chỉnh sửa cửa sổ **Trang bị và Thuộc tính** (`Chạy` → `T.Độ Chạy`, `Công kích` → `T.Độ đánh`, giá trị `T.Độ đánh` dạng `125/90` không có `%`, đồng bộ nền ô đang mặc xanh/đỏ theo điều kiện mặc giống hành trang, tự đổi sang nền đỏ khi tẩy tủy tiềm năng mà vẫn giữ nguyên trang bị và thuộc tính đang kích hoạt), **Tooltip trang bị** (tô màu riêng tên hệ Ngũ hành `Kim`/`Mộc`/`Thủy`/`Hỏa`/`Thổ`, xóa dòng `"Click / chuột phải..."`, thêm dòng gợi ý 2 món + hệ tương sinh kích dòng ẩn cho đồ xanh), và **hiệu ứng 2 tia beam vàng xoay quanh viền** trang bị Hoàng kim (`.slot.filled.q-gold`, chu kỳ `4s`, dày `1px`, góc `80°`). Kiểm chứng `npm run typecheck` và `git diff --check` đạt; đã commit (`bb9ae2e`), không push.

> Trước đó **2026-11-14**: đã khảo sát bản đồ gốc, kết xuất ảnh xem trước và lập tài liệu thiết kế chi tiết **Chiến trường Tống Kim (Chế độ PK & 26 Vật phẩm Quân Nhu)** tại **`docs/tong-kim-battlefield.md`** (cập nhật `tasks/BACKLOG.md` mục **SK1**, `AGENTS.md`, `tasks/HISTORY.md`), kèm đầy đủ đường dẫn tham khảo sang `/Users/hudy/ws/volamidle.pages.dev/src` và `settings/item/004/magicscript.txt`. Commit nền ghi ở vòng này (đã cũ; hiện tại `bb9ae2e`): `e2b67ea fix: increase fullExpGap default value to 200 in tuning formulas`.

> Trước đó **2026-11-13**: đã chỉnh lại giao diện và logic bảng Kỹ năng võ công (cột `0` bên trái, kỹ năng `common` tự học không cần cộng điểm, cột rộng bằng icon `40px`, hàng chân `.sk-foot` chứa cấp + nút `+` đỏ đô chữ vàng, màu cấp trang bị `.boosted` sáng hơn).

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
| Giao diện | GD | 3 | 2 | 3 | 2 | GD1 F3, GD2 chat, GD4 mobile |
| Gameplay | GP | 3 | 7 | 8 | 1 | GP1–GP2 cấp / tiềm năng; GP4 công thức sát thương (⏸) |
| Event và nhiệm vụ | SK | 0 | 1 | 10 | 0 | SK1 đang nghiên cứu SHXT, cao cấp trước; thiếu script điều phối/điểm/thưởng; chưa có gameplay |
| Hạ tầng | HT | 2 | 1 | 7 | 0 | HT1 đóng gói Desktop / Mobile |
| Hiệu năng tải (cache) | PF | 2 | 0 | 6 | 2 | **Cache còn dở:** PF6 server thật phục vụ asset (⏸ chờ chọn nginx / Caddy / CDN), PF7 Desktop / Mobile (⏸ chờ HT1), PF8 đo + kiểm chứng đủ (sau PF1), PF9 việc nhỏ (CSS chưa `?v=`); PF1–PF3 chưa làm |
| Bot + hiệu năng server | BT | 5 | 1 | 5 | 0 | **Phần 1 bot xong** (vòng 35, `/?bots` + `npm run bots -- <kịch bản>`); Phần 2 đo đếm: BT1 số đo → BT9 kịch bản đo → BT5 baseline → BT6 sửa nghẽn |

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

## Sửa buff chết/hồi sinh và điều tra bản đồ — 2026-11-13

- Người dùng đã duyệt sửa lỗi buff chết/hồi sinh, sau đó yêu cầu điều tra vì sao chỉ có 2 bản đồ.
- Đã thêm hooks.progress cho người chơi ở cuối kill (sau clearStates, tháo cưỡi và tính lại stats), và cuối revive (sau clearStates/clearEffects/syncVitals). Gửi snapshot hoàn chỉnh, không gửi sớm trước khi bỏ bonus ngựa. Không đổi công thức hoặc giao thức; client Web/Desktop/Mobile nhận cùng StatsMsg.
- Test tái hiện trước sửa thất bại do 0 progress khi chết; sau sửa pass các trường hợp buff chết/hồi sinh, chết khi cưỡi ngựa, aura chết/hồi sinh, không có trạng thái. Kiểm tra các luồng buff/làm mới/hết hạn/aura/đồng minh/712 trước đó vẫn pass. `npm run typecheck` và `git diff --check` đạt. Script tạm ở `/tmp/jx-game-smoke/check-buff-lifecycle.mts` (đưa về gốc repo khi chạy).
- Đã xác minh từ bảng gốc qua JX_CLIENT: maplist.ini có 977 mục ID, sau loại đường dẫn trùng và kiểm tra .wor còn 299 bản đồ phân biệt. Trên máy chỉ có 2 thư mục bản đồ kèm nav.json: 37, 140. Có 297 bản đồ nguồn chưa sinh (chưa bảo đảm tất cả render được; docs ghi 356/357 hỏng).
- Nguyên nhân: quy trình cài đặt đã chạy gen:maps -- 37 140 theo bước tối thiểu. gen-maps.writeCatalog dựng catalog.gen.ts từ các thư mục có nav.json; MAPS dựng từ catalog, TravelWindow liệt kê Object.values(MAPS). Không phải cửa sổ đang lọc mất bản đồ. Không được thêm tay catalog vì thiếu ảnh/lưới đi lại.
- Muốn sinh phần còn thiếu: `JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT npm run gen:maps -w @vltk/client -- --skip-existing`. Docs ước lượng toàn bộ khoảng 15–16GB, vài giờ. Chưa chạy vì người dùng chỉ yêu cầu điều tra.
- Chưa commit/push thay đổi mới; commit cuối c65b55d. Không đụng dữ liệu tài khoản thật để thử.

## Ảnh động màn chọn / tạo nhân vật — 2026-11-13

- Theo yêu cầu người dùng: thay paper-doll nhỏ ở cả hai màn bằng ảnh động lớn gốc. Đã khôi phục tên theo hash: `角色_{hệ}_{giới}_0.spr`, 10 tổ hợp. Bộ này theo hệ/giới, không theo từng phái; màn chọn dùng hệ của phái, màn tạo dùng hệ đang chọn.
- `tools/gen-login-figures.ts` được gọi trong `gen:ui`: sinh WebP lossless + `art/login-figures.gen.ts`, cập nhật manifest core. Đã chạy toàn bộ `gen:ui` thành công với JX_CLIENT hiện tại.
- Kiểm chứng: typecheck/build đạt (cảnh báo chunk lớn có sẵn); Playwright kiểm tra 10 ảnh tải được, frame thay đổi, không pageerror; xem màn chọn 3 nhân vật và tạo mới ở desktop + viewport 390×844. Sửa căn giữa grid để màn nhỏ không cắt bên phải. Chưa thử wrapper Desktop/Mobile thật; cùng DOM/CSS và assetUrl dùng chung.
- Preview: `/tmp/jx-character-preview/select-updated.png`, `create-updated.png`, `create-mobile.png`. Không sửa DB thật. Không commit/push; commit nền hiện tại `c65b55d`. Giữ nguyên các thay đổi server và nhật ký từ công việc khác đang có sẵn.

## Danh sách đề xuất Phượng Tường + 40 bãi — 2026-11-13

- Người dùng muốn xem danh sách, cần Phượng Tường và 40 bãi luyện công cấp 10–200. Chưa chạy gen thêm.
- Đã xác minh bảng maplist.ini gốc: Phượng Tường ID 1 (City). Trong 299 bản đồ phân biệt chỉ 21 Field (nhãn UI Luyện công), 42 Cave. Đề xuất 40 bãi = 21 Field + 19 Cave; tên từ bảng gốc, cấp quái thực tế từ spawn project (ước lượng của tool cũ, không phải cấp chính thức client).
- Danh sách 40 ID đề xuất, theo cấp hiện tại: 2,3,19,4,43,70,167,5,22,24,92,21,56,41,14,74,90,195,23,6,26,27,179,193,68,122,38,28,7,39,50,40,224,336,93,319,342,320,340,341. Phượng Tường 1 thêm riêng, không tính trong 40.
- Cấp quái hiện có trong toàn bộ spawn của 299 map cao nhất 111; danh sách 40 hiện trải 19–111. Muốn phủ 10–200 cần người dùng duyệt phân bổ lại cấp quái thay vì chỉ sinh ảnh/nav.
- Đã gửi câu hỏi lựa chọn: dùng cả hang động + chia lại cấp 10–200, hoặc giữ cấp quái hiện có và chỉ gen thêm. Đang chờ câu trả lời; không tự sửa số liệu.
- Quan sát git status có thêm thay đổi UI chọn/tạo nhân vật và tool hình đăng nhập từ công việc khác; không chỉnh/commit các file đó.

## Đang triển khai 41 bản đồ — 2026-11-13

- Người dùng đã chọn 40 bãi gồm cả hang động, phân bổ cấp quái 10–200. Đã bắt đầu gen Phượng Tường (1) + 40 ID đề xuất, giữ 37/140. Log `/tmp/jx-maps-41.log`; gen:maps có --skip-existing để chạy tiếp khi ngắt. Chưa hoàn tất.
- Đã thêm bảng cấp 20 mốc (10–19, 20–29, …, 190–199, 200), mỗi mốc hai bãi tại packages/shared/src/maps/training-levels.ts; gen-spawns ưu tiên bảng và chặn mức quái trong band, có khu quái đúng cấp đầu mốc để Auto chọn đúng cấp.
- Tài liệu danh sách + lệnh tái sinh: docs/training-maps.md. Sau gen:maps: chạy gen:spawns chỉ 40 ID, gen:skills, gen:assets; kiểm tra 43 catalog, nav/spawn, cấp10–200, Auto, typecheck/build và trình duyệt trên cổng thử.
- Không commit/push, không sửa thay đổi UI màn nhân vật của công việc khác.

## Sửa nhịp và hoạt cảnh khi chọn nhân vật — 2026-11-13

- Người dùng báo giật, yêu cầu chưa chọn idle tối màu, click phát động tác gốc. Nguyên nhân xác minh: nhiều SPR idle/action ghi interval=1; code trước dùng 1 ms trực tiếp, một số khác 250 ms.
- gen-login-figures sinh cả hậu tố 0 idle + 1 action (20 sheet); chung crop, anchor và tỷ lệ theo vùng idle để giữ vị trí/kích thước khi đổi động tác. Interval action nguồn 50/80/100/120 ms được giữ; giá trị 1 dùng 80 ms (chọn cho UI, chưa xác minh engine gốc).
- figure.ts: idle tĩnh, action một lần khi click/tap/chọn mũi tên, trở lại idle; bấm lại phát lại, đổi nhân vật hủy action cũ, preload/decode trước khi chạy và dùng requestAnimationFrame theo thời gian. Áp dụng màn chọn và tạo mới; không đổi hình trong thế giới.
- Kiểm chứng: generator chạy thành công; Playwright kiểm tra 10 biến thể, idle tĩnh, click chạy action, hoàn tất về idle, click lại phát từ đầu và hủy action khi đổi chọn; không pageerror. Typecheck/build và diff --check đạt, cảnh báo chunk lớn hiện có. Chưa kiểm thử wrapper native thật.
- Không commit/push. Các thay đổi map/server khác đang có sẵn được giữ nguyên. Script kiểm tra tạm `/tmp/jx-character-preview/check-actions.cjs`.

## Hoàn tất Phượng Tường + 40 bãi — 2026-11-13

- Đã triển khai theo lựa chọn người dùng: 41 bản đồ mới, giữ 37/140, catalog tổng 43. Tất cả gen:maps thành công, không có FAILED. Manifest cache được các tool cập nhật.
- Đã thêm `packages/shared/src/maps/training-levels.ts`: 20 mốc, hai bãi mỗi mốc; 10–19 tới 190–199 và 200. gen-spawns ưu tiên bảng, clamp cấp quái trong band, khu đầu đúng cấp đầu mốc cho Auto; giữ nguyên bảo vệ auto:false. Đã kiểm tra cả 40 file được chọn là auto, không có file chỉnh tay bị ghi đè. Các spawn ngoài danh sách không thay đổi.
- Đã chạy gen:spawns (40 written), gen:skills và gen:assets (ảnh/hiệu ứng hiện có đủ, không cần encode mới). Không thay công thức chỉ số/exp/damage, cấp quái áp dụng công thức hiện có. Tên/hình gốc, cấp quái là cấu hình riêng theo USER.
- Kiểm tra tất cả 40 file spawn: monster ID hợp lệ, cấp đầu đúng band, không vượt band/200, trung tâm zone + điểm vào trên vùng đi lại. Auto chọn đúng mốc ở mọi cấp10–200. Lưu ý Trúc Tơ tầng3 (28) có 2 zone do hình dạng/lưới nhỏ; vẫn có đủ3 lựa chọn monster/cấp để vào danh sách Auto.
- Trình duyệt thật trên server thử :2568 / :5174 và DB riêng: Xa phu hiển thị43, chuyển tới Phượng Tường/Hoa Sơn/Mạc Cao Quật, hình và minimap tải được. WebSocket phòng thật: Hoa Sơn142 quái cấp10–19, Mạc Cao Quật153 quái cấp200, Mạc Bắc Thảo Nguyên154 quái cấp200.
- `npm run typecheck`, `npm run build`, kiểm tra tsc riêng gen-spawns và `git diff --check` đạt. Build chỉ có cảnh báo chunk lớn có sẵn. Chưa kiểm chứng wrapper Desktop/Mobile thực tế; metadata/giao thức/tài nguyên dùng chung.
- Đã chạy lại --catalog sau khi hoàn tất spawn để watcher nạp đủ dữ liệu. Tắt hai tiến trình thử; bản chính :2567/:5173 giữ chạy. Không chỉnh DB thật.
- Danh sách20 mốc +40bãi và lệnh sinh lại: docs/training-maps.md. Ảnh: `/tmp/jx-map-smoke/phuong-tuong.jpg`, `list-43.jpg`; script kiểm tra tạm cùng thư mục (đưa về gốc repo khi chạy).
- Không commit/push. Giữ nguyên thay đổi UI màn nhân vật của công việc khác đang có sẵn.

## Commit giao diện chọn / tạo nhân vật — 2026-11-13

- Người dùng yêu cầu commit: ảnh động gốc, sửa nhịp, idle tối màu và phát hoạt cảnh khi chọn. Commit `fix(client): use original character selection animations` (hash xem git log -1). Không push.
- Kiểm chứng trước commit: typecheck/build và Playwright 10 tổ hợp + phát lại/hủy/về idle đạt; diff --check sạch. Các thay đổi bản đồ/server từ công việc khác không nằm trong commit này.

## Điều tra bộ lọc Thành thị — 2026-11-13

- Người dùng báo bấm Thành thị chỉ thấy Biện Kinh, thắc mắc thiếu Phượng Tường. Chưa sửa gameplay/UI.
- Dữ liệu hiện tại: Phượng Tường1 type City → Thành thị; Biện Kinh37 type Capital → Kinh thành. travel.ts lọc chính xác nhãn MAP_TYPE_NAMES, nên hiện hai tab riêng, mỗi tab có một thành.
- Bấm thử trình duyệt trên :5174/:2568, DB thử riêng: tiêu đề43; Thành thị chỉ hiện Phượng Tường; Kinh thành chỉ hiện Biện Kinh. Không tái hiện mô tả người dùng trên bản hiện tại. Ảnh `/tmp/jx-map-smoke/filter-city.jpg`.
- Tab IAB localhost:5173 đang ở màn đăng nhập khi kiểm tra, không tương tác tài khoản thật. Vite :5173 đang phục vụ module shared trực tiếp từ repo, không thấy dấu hiệu prebundle shared cũ; chưa xác minh tab/trình duyệt người dùng đang xem có giữ bản cũ hay không.
- Đã hỏi người dùng tiêu đề Xa phu là43 hay2 để phân biệt dữ liệu cũ; chưa kết luận do cache. Nếu muốn cảhai thành cùng một tab cần gộp City/Capital trong bộ lọc, hiện chưa được yêu cầu đổi cách phân loại.
- Đã tắt hai tiến trình thử, giữ bản chính và các thay đổi đang có. Commit hiện tại1241445 từ công việc UI nhân vật; chưa commit phần map/server.

## Gộp Thành thị và sửa thẻ bản đồ ít mục — 2026-11-13

- Người dùng yêu cầu gộp Kinh thành/Thành thị và sửa thẻ bị kéo cao như ảnh chụp.
- Đổi nhãn Capital sang Thành thị trong MAP_TYPE_NAMES; City vẫn Thành thị. travel.ts vốn lọc/khử trùng theo nhãn, nên có đúng một tab Thành thị và hiện Biện Kinh + Phượng Tường. Không đổi type gốc, luật an toàn, catalog hay tài nguyên.
- travel.css: align-content:start cho danh sách và thẻ, align-items:start cho danh sách, tránh grid giãn hàng và dàn nội dung khi còn1–2mục. Giữ chiều rộng auto-fill và cuộn nhiều bản đồ.
- Kiểm tra trình duyệt trên cổng thử/DB riêng: Tất cả43; Thành thị2 đúng tên; tìm Phượng Tường còn1; không khớp0; thẻ cao151.9px ở cả1 và2 kết quả, không còn giãn theo list469.5px; danh sách43 vẫn cuộn (scrollHeight1458>clientHeight470). Viewport390×844: hai thẻ nằm gọn trong khung, không tràn ngang; đã reset viewport sau thử. Chưa kiểm wrapper native Desktop/Mobile thực tế, cùng DOM/CSS.
- npm run typecheck và git diff --check đạt. Ảnh `/tmp/jx-map-smoke/cities-merged-desktop.jpg`, `cities-merged-mobile.jpg`.
- Đã tắt server/client thử :2568/:5174, giữ bản chính; không sửa DB thật, không commit/push. Commit nền1241445, các thay đổi map/server chưa commit vẫn giữ nguyên.

## Xa phu hiển thị cấp quái — 2026-11-13

- Người dùng yêu cầu thay mô tả loại map/PK bằng cấp quái và sắp theo cấp để so với cấp nhân vật.
- Chuyển bảng40bãi từ tools/data/training-maps.ts sang shared/src/maps/training-levels.ts, xuất mapLevelBand dùng chung UI + gen-spawns, tránh import tool vào client và tránh sao chép bảng cấp. Dược Vương Cốc giữ band3–7 theo spawn hiện có; hai thành ghi Thành thị · An toàn.
- TravelWindow sắp thành an toàn đầu, các bãi theo min/max tăng dần, tên làm tiêu chí phụ. Mô tả Quái cấp X–Y, đỏ + Vượt cấp của bạn khi min lớn hơn cấp nhân vật; giữ Đang ở đây. Đọc lại cấp khi mở và theo dõi thay đổi cấp để làm mới khi đang mở; không chặn đi tới bãi khó.
- Kiểm tra trình duyệt thật DB riêng :2568/:5174: đủ43 mục đúng thứ tự3–7 tới200, nhân vật1 các bãi đỏ; dùng nút dev lên11, mở lại thì3–7/10–19 không đỏ,20–29 trở lên vẫn cảnh báo. Ảnh `/tmp/jx-map-smoke/map-levels.jpg`.
- npm run typecheck, tsc riêng gen-spawns sau di chuyển bảng, git diff --check đều đạt. Cùng DOM/CSS/metadata cho3nền tảng; không kiểm wrapper native. Đã tắt server thử, không sửa DB thật. Không commit/push.

## Chốt commit bản đồ và Xa phu — 2026-11-13

- Người dùng yêu cầu commit toàn bộ trạng thái hiện tại của công việc này. Commit `feat: add leveled training maps and improve travel picker` (hash xem git log -1).
- Bao gồm43 bản đồ trong catalog,40 file spawn cấp10–200 và bảng cấp dùng chung/tool gen; giao diện Xa phu gộp Thành thị, CSS thẻ ít mục, sắp theo cấp và cảnh báo vượt cấp; bản sửa đồng bộ buff khi chết/hồi sinh; tài liệu và tiến độ liên quan.
- Asset sinh không đưa vào git, cần tái sinh theo docs/training-maps.md trên máy khác. Các kiểm chứng typecheck, tsc tool và trình duyệt/World/WebSocket đã ghi ở các mục trên; git diff --check sạch trước commit. Không push.

## Tra cứu Tống Kim — 2026-11-13

Đã xác minh maplist.ini gốc: ID44 Chiến trường Tống Kim (Battlefield), có file .wor trong data_extract; ID323/324/325 điểm báo danh sơ/trung/cao dùng chung hình bản đồ. Chưa gen các map này, chưa có trong43map hiện tại. Gameplay Tống Kim vẫn chưa triển khai (BACKLOG SK1). Chỉ tra cứu, không gen/sửa code. Commit nền21bbcb5.

## Chỉnh giao diện bảng Kỹ năng võ công — 2026-11-13

- Theo yêu cầu người dùng: chuyển cột kỹ năng `Khác` từ cuối phải sang đầu bên trái với nhãn `0`; các cột mốc cấp bỏ chữ `Cấp `, chỉ hiển thị `10`, `20`, `30`, `40`, `50`, `60`, `90`, `120`, `150`.
- Kỹ năng cột `0` (`s.pack === 'common'`: Khinh công, Vũ Lộ Xuân Phong, Kiếp Phú Tế Bần, Công kích vật lý) tự động học và dùng được ngay mà không cần cộng điểm kỹ năng (`learning.ts`, `SkillEngine.ts`, `progress.ts`, `skillbar.ts`, `skills.ts`).
- Độ rộng mỗi cột kỹ năng (`.sk-col`, `.sk-col-head`) rộng đúng `40px` bằng độ rộng ô icon skill (`.sk-cell`).
- Tách phần chân `.sk-foot` thành hàng riêng bên dưới `.sk-ico` (`36×36`), không đè lên icon skill: bên trái là số cấp (`.lv`), bên phải là nút `.sk-add` màu đỏ đô (`#781217`), dấu `+` màu vàng (`var(--gold)`), bấm cộng 1 điểm kỹ năng (`raiseSkill`).
- Đổi màu cấp cộng thêm từ trang bị (`.boosted`) sang xanh dương sáng (`#66e6ff`) dễ nhìn trên nền tối.
- Kiểm chứng: `npm run typecheck` và `git diff --check` đạt. Đã commit `feat(skills): restyle skill window layout and auto-learn common skills` (hash xem `git log -1`), không push.

## Review tài liệu Tống Kim — 2026-11-14

- Người dùng yêu cầu điều tra/review `docs/tong-kim-battlefield.md`, chưa yêu cầu triển khai hoặc sửa thiết kế. Đã đối chiếu tài liệu với mã hiện tại, nguồn volamidle được dẫn và bảng loose `Client_VLTK_SHXT/settings/item/004/magicscript.txt` (nguồn mod, không đồng nhất với PAK gốc).
- Commit hiện tại `bb9ae2e`; có nhiều thay đổi gameplay/quái/drop/map chưa commit từ công việc khác, giữ nguyên.
- Phát hiện: BACKLOG ghi 18 Hoàn nhưng danh mục đủ 26 = 20 Hoàn + 3 hiệu lệnh + 3 bẫy; nhiều dẫn chiếu dòng magicscript sai (Chiến Cổ thực tế dòng158, Kháng Đơn Chi Giác216; các dẫn chiếu bẫy cần phân biệt bao sự kiện với món dùng trực tiếp); đường dẫn formulas/stats.ts không tồn tại (hiện có character.ts/combat.ts).
- Cần bổ sung trước triển khai: vòng đời/trận độc lập theo phân tầng; lịch mở, giới hạn và cân bằng phe; quyền vào/ra mọi đường chuyển map + Auto/respawn/token; tách score/rank/tk_merit, cấp/trừ điểm một lần và lưu bền; cấu hình spawn/AI/NPC theo tầng và tọa độ nav; thứ tự công thức và buff khi chết/rời/reconnect; stack Item + giao dịch nguyên tử; tiêu chí nghiệm thu Web/Desktop/Mobile. Luật drop120s/chỉ killer khác quyết định chung60s/killer+tổ đội phải ghi rõ ngoại lệ/chờ duyệt.
- Chưa sửa tài liệu thiết kế/code, không commit/push; chỉ ghi điểm dừng theo quy ước tasks. Các đề xuất review chưa là quyết định USER.

## Tống Kim chuyển chuẩn VLTK-SHXT — 2026-11-14

- USER: lấy cơ chế SHXT làm chuẩn, ngoại lệ lịch mở tùy lúc; tối đa1trận/tầng trên toàn server; chỉ cao cấp trước, sơ/trung cùng cơ chế/bộ lọc cấp để sau; bắt buộc điểm báo danh và sảnh chờ. Chưa yêu cầu code gameplay.
- Đã viết lại `docs/tong-kim-battlefield.md`, lập sổ nguồn PAK `docs/research/tong-kim-shxt-sources.md`, giữ thiết kế volamidle cũ ở `docs/research/tong-kim-volamidle-legacy.md` (không áp dụng). Cập nhật AGENTS và SK1 sang nghiên cứu một phần.
- Xác minh PAK: cấp40–59/60–89/từ90; map báo danh323/324/325; Giới Kiều384/385/386 theo tầng, Bình nguyên326/327/328. Map44 chưa đủ liên kết để coi là cao cấp SHXT. Tuyến bắt buộc báo danh→sảnh chờ→Hậu doanh→Đại doanh→chiến đấu; vị trí NPC và chi tiết sảnh chờ còn thiếu. Đề xuất325+328 chưa phải USER chốt địa hình.
- Có18Hoàn178–195, thêm Ngoại Độc; Binh Sĩ Hiệu Phù triệu hồi2lính; lệnh bẫy393–397 dùng skill gốc và50lượt; skill661 máu/kháng theo cấp trạng thái. Bỏ mặc địnhvolamidle20phút/hồi sinh tăng dần/26món/nhân buff0–20%; thiếu nguồn cho điều phối, điểm/thưởng và thời lượng.
- Đã tra tên và hash PAK nhưng chưa thấy battlehead/battleinfo và các tên điều phối thử; không kết luận đã đủ luật server. Nguồn chính thức web khác năm/nhánh chỉ ghi tham chiếu. Không dùng dữ liệu Miễn Phí/CTC tự thay SHXT.
- Tool gen-maps hiện khử trùng .wor theoIDđầu, cần hỗ trợ maplogic325/328 dùng chungảnh323/326 khi triển khai; chưa chạygen/sửaasset.
- Commit hiện tại460930c (khác ghi chúreviewtrướcbb9ae2e). Giữ nguyên thay đổi nghiên cứu tốc độ/KN14 đang có từ công việc khác. Chỉ thay tài liệu/tracking, không code/gameplay/clientgốc, không commit/push. Kiểm tra liên kết nội bộ và diff --check trước kết thúc.

## Đề xuất gameplay Tống Kim đủ vòng chơi — 2026-11-14

- USER cho phép tự thiết kế phần thiếu nguồn, rồi người dùng duyệt trước triển khai. Mục tiêu: PK, danh hiệu, dùng vật phẩm, Nguyên soái nhiều kỹ năng mạnh. Không tự viết code trong lượt này.
- Đã tạo `docs/tong-kim-gameplay-proposal.md`, cập nhật tài liệu chính/AGENTS/SK1 để phân biệt DATA và CHỌN; thiếu script SHXT không còn là chặn thiết kế. Đề xuất chưa phải phê duyệt thực hiện.
- Phương án: Bảo vệ Nguyên Soái; map325 có báo danh/sảnh chờ, map328 chiến đấu; từ90; 32người/phe, chênh tối đa2 khi nhận người mới; phí3000lượng. Báo danh10phút + chuẩn bị1phút + đánh60phút + kết thúc2phút, soái xuất hiện phút30; giờ mở tùy đặt.
- Quân trạng/assist/điểm phe/tích lũy tách riêng; quân hàm0/1000/3000/6000/10000, +20–60%HP và0–20điểm kháng theo ánh xạCHỌN skill661. Hồi sinh10giây, bảo vệ5giây; giữ điểm và buffQuânNhu còn hạn. Thắng ưu tiên soái còn sống rồi điểmphe/PK/hòa, không kết thúc ngay khi soái chết.
- 27món chiến đấu=18Hoàn+3hiệu lệnh+HiệuPhù+5lệnh bẫy; thêm ChiêuThư thành28định nghĩa. Có giá/nguồn nhận, điểm khởi đầu1000mộtlần/nhânvật, giới hạn stack/charges/summon/trap, luật tương tác/tiêu hao và thưởng cuối trận rõ. Các nhóm đồ phụ/Cờ/đổiEXP/tuần để sau.
- Hai soáiHP6triệu,6nhómchiêu,3phase, tầm giữdoanh/cảnhbáo/AI và tiêu chí cân bằng đội6–10người150hạ3–5phút. Đây là chỉ số ban đầu phải đo khi làm, không khẳng định đã chạy cân bằng. Registry hiện có357/359/361/362/375 và5skillbẫy, thiếu491/492/510/661/433; phải bổ sung qua generator/pack, không sửagen.ts.
- Commit nền460930c lúc kiểm tra. Có thay đổi GP6/hoạtảnh di chuyển đồng thời từ công việc khác; giữ nguyên. Chỉ sửa docs/tracking cho task này, chưa code/gameplay/gen/commit/push. Kiểm tra liên kết, số lượng/mốc và diff --check cho tài liệu liên quan.

## Đánh giá sẵn sàng triển khai Tống Kim — 2026-11-14

- Người dùng hỏi đã đủ điều kiện triển khai chưa; đây là đánh giá sẵn sàng, chưa phải lệnh viết code.
- Kết luận: đủ thiết kế/phạm vi để bắt đầu bản cao cấp theo `docs/tong-kim-gameplay-proposal.md`; thiếu script SHXT đã được xử lý bằng phương án CHỌN theo ủy quyền thiết kế. Không cần tiếp tục chờ nguồn cũ.
- Các việc gen/map logic/skill chiến trường còn thiếu/stack và charges/AI soái là hạng mục triển khai đã biết, không phải điều kiện bắt người dùng bổ sung. HP/damage/nhịp soái, cân bằng và tải32v32 phải đo khi thực hiện; chưa khẳng định đã đạt. Web là nơi kiểm chứng đầu, Desktop/Mobile dùng chung luật và cần kiểm chứng điều khiển/chạy native riêng.
- Commit nền460930c, giữ nguyên thay đổi GP6/Hoa Sơn/công việc khác. Vẫn chờ USER duyệt thực hiện, không code/gen/commit/push trong lượt này.
