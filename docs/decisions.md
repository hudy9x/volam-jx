# Quyết định thiết kế & lịch sử các vòng

> Lưu trữ chi tiết các quyết định đã chốt theo thời gian (tách từ `AGENTS.md` để giữ prompt đầu phiên gọn nhẹ).

## 6. Quyết định hiện tại (đừng tự đổi)

- **Bày bán trực tiếp trên Hành trang & lọc Mua bán (USER 2026-11-21, `eabe757`):** bỏ cửa sổ Chợ thành thị; người chơi định giá trực tiếp (`Item.stallPrice`) trên 2 trang đầu Hành trang (`0..119`, Ngân lượng + KNB, cấm Lệnh bài/Thổ Địa Phù), lời mời chào tối đa 20 ký tự, yêu cầu trong thành thị an toàn, không chiến đấu/cưỡi ngựa, cấp ≥ 60, cách NPC > 80 px. Mở sạp đồng bộ `Actor.stallTitle`, vẽ bảng hiệu 3 mảnh SPR gốc (`stall-left/mid/right.webp`), khóa di chuyển/chiêu/ngựa/túi; người mua click nhân vật mở 1 trang 120 ô (`10×12`), xóa `stallPrice` khi đổi chủ. Hành trang xếp 2 nút/hàng. Kênh chat `trade` lọc 30 phút / tối đa 50 tin. Chi tiết ở `docs/rao-ban.md`.

- **EXP Boss Hoàng Kim (USER 2026-11-19):** mặc định `GOLDEN_BOSS_DEFAULT_EXP = 4.000.000` cho mọi Boss Hoàng Kim (không cần sửa config cũ); từng boss có trường tùy chọn `exp` (`0–2.000.000.000`, để trống = 4.000.000), chỉnh riêng hoặc hàng loạt trong tool Boss, Apply xác nhận `exp` thực nhận từ server. Khi người chơi dùng Tiên Thảo Lộ, EXP nhận được nhân đôi theo `EXP_ELIXIR` (`normal/special = 2`), giữ luật chia tổ đội/sát thương; Boss Xanh và quái thường giữ công thức cũ.

- **Sát thương/giảm hiệu ứng Boss (USER2026-11-19):** damagePercent100%mặcđịnh,1–10000, nhân direct/chiêucon/độc một lần lúcgắn (giữtrần), không nhânheal/phảnđòn/duration. controlReduction hurt0–100(default60)→hitRecover,cold0–77/stun0–95/poison0–95(default0) cộng bag/passive/state theo côngthứccũ; chỉ giảm thời gianbosschịu, khôngbuffthờigianbossgâylênngười. Tool chỉnh riêng/nhóm,Apply xác nhận thông sốserver; không tựđổiconfigthật.

- **Kỹ năng Boss (USER2026-11-18):** tool chọn chiêu/cấp riêng hoặc thay cùng danh sách cho nhóm, thêm150đúngphái giữ chiêu/cấp cũ/không trùng. Config chỉnh qua editor có skillLevelsFixed:true dùng đúng cấp luyện, config cũ giữ scale; AI chỉ random attack đã gán và ưu tiên đủ tầm, không tự học150. Backend kiểm1–32chiêu/mã/cấp/trùng/ít nhất1attack, Apply xác nhận skill thực nhận; vẫn chỉnh riêng.

- **Chọn nhiều Boss (USER2026-11-18):** chọn từng con/môn phái trong kết quả hiển thị/chọn kết quả lọc, độc lập bật xuất hiện; giữ lựa chọn qua lọc và đếm cả IDẩn. Cập nhật chung HP/nhịp chỉ chép trường đã chọn vào bản nháp của mọi IDtích (kể cảẩn), Giữ từng Boss không đổi; vẫn chỉnh riêng sau cập nhật. Không liên kết cấu hình nhóm lâu dài; Lưu/Áp dụng như cũ.

- **Boss Hoàng Kim HP/nhịp/phạm vi (USER2026-11-18):** tool Boss có hp tùy chọn (trống→theo cấp), attackCooldown giây (nhập rõ→điều khiển cả pose/tung chiêu/actionMs, vẫn giữ multiplier tốc/băng và cooldown kỹ năng), leash bán kính isometric từ home mặc định1100. Boss cấu hình quay về nếu bản thân/mục tiêu ngoài radius; không đổi BossXanh. Áp dụng đòi server xác nhận thông số/version, server cũ phải restart; boss sinh lại theo lịch. Không tự đổi config thật hoặc reset DB. Luật server chung3nền tảng.

- **Quay lại bãi và Auto độc lập (USER2026-11-17):** autoMap giữ đổi bãi theo cấp; autoReturnTraining mặc địnhtrue (mẫu cũ thiếu→bật, explicitfalsegiữtắt) quay lại điểm CharacterRecord.trainingReturn={mapId,x,y}. Bật cảhai từthành ưu tiên điểmnhớ; hồi sinh chỉdo autoRevive. Server ghi điểm khi chuyển bãi hợp lệ→thành (ThổĐịaPhù/Auto/teleport/hồi sinh), không ghiđè thành→thành/bãi→bãi. Xa phu và Auto dùngchung train{returnPrevious:true}, giữđúngtọađộ; bịchặn tìmđiểmđứnggầnnhất/báorõ, mapmất/tắt/hỏng hoặcbotngoàilist thìchặn. Botcũ chưađiểm ởthành bootstrap bãi trongsetup.maps; khôngreset/tựsửamẫu. Người thường thiếuđiểm chỉfallback bãitheocấp khi autoMapbật. Chung3nềntảng, cần nạp server/runner/tool/client mới.

- **Gán kịch bản bot và cờ đội trưởng (USER2026-11-17):** tools/bots giữ gán username→scenario trong BOTS_DIR/.assignments.json (gitignore), độc lập trạng thái runner; dừng chỉ Offline/giữ gán. Chạy tiếp theo từng kịch bản cũ; chọn kịch bản mới rồi chạy ghi đè bot được chọn, bot đang chạy do tool quản lý được dừng/chờ Offline rồi khởi động lại. Thẻ kịch bản trên roster hiện tên/tổng bot/play-pause toàn nhóm. Không tự nhận quyền dừng CLI ngoài tool; chưa có dữ liệu gán từ lượt dừng trước bản này. Cờ vàng đội trưởng lấy Actor.teamLeader server, cập nhật nhường/rời/giải tán, ẩn chết/culling; chung renderer ba nền tảng.

- **Xóa mẫu bot (USER2026-11-16):** tool có Xóa thiết lập/Xóa kịch bản cạnh selector, xác nhận trước khi xóa; chỉ xóa file mẫu, giữ nhân vật/tiến trình/setup đã áp dụng và giữ form ở Tự cài đặt. Mẫu nhân vật còn được scenario.initialSetup tham chiếu thì chặn/báo tên kịch bản; scenario đang chạy/chuẩn bị do tool quản lý thì phải dừng trước. Giữ snapshot cấu hình trong nhân vật, không cascade xóa DB hoặc tự dừng bot. Danh sách chạy/lệnh cũ được gỡ theo mẫu đã xóa. Nguồn ConfigStore/ConfigRoutes/RunManager; tool vẫn đóng gói lúc khởi động, không HMR.

- **Băng di chuyển cố định (USER2026-11-16):** `formulas/effects/tuning.ts EFFECTS.coldMovement` =60isođơnvị/s,4FPSchuẩn8frame,2giây/vòng,sải120; chung người/quái/BossXanh/HoàngKim/kểcảcưỡingựa. Bỏ nhân tốc gốc/bonus/distanceScale/AI trong nhánhbăng; giữ giảmthờigian/trần77 và tốcđánh/cast cũ. Client dùng helpercoldMovement, không nhâncoldLoopRate thêm cho vòngchạy. Server giữtọađộlẻ khi băng để giảm sai số làmtròn mạng. Xem docs/formulas/effects.md§3; quyết định này thay đềxuất băng75px/s trướcđây.

- **Bot xuống ngựa, học buff và lời mời tổ đội (USER2026-11-16):** bot tự xuống ngựa khi chiêu phái ưu tiên cần đi bộ và có quái trong600px, hoặc cần buff/hào quang đi bộ; chờ Actor xác nhận/giãn thử1giây, vẫn xử lý thuốc/hồi sinh/về thành, không tự lên lại. Không xoay đòn common khi có chiêu phái dùng được. Bot bật tự buff được cấp buff/hào quang thường ở cấp tối đa hợp lệ như bước thiết lập riêng, kể cả bot cũ hết điểm; không tiêu/phân lại điểm, không reset hoặc giảm tiến trình. Không tự mở tầng bí kíp90/120/150 hoặc học ẩn thân/hỗ trợ tình huống; không đổi gợi ý người chơi. `world/botBuffs.ts` áp khi vào map/lưu và kiểm tăng cấp/đổi phái. Vào đội xóa toàn bộ lời mời chờ server/client (cả đội trưởng mới), bỏ gói mời muộn; đang có đội không nhận mời mới, đội trưởng vẫn mời thêm nếu chưa8. Cần nạp lại server/runner/client để nhận mã, không tự reset bot.

- **Vùng an toàn thành thị (USER 2026-11-15):** Pen trong Map Manager, nguồn `packages/shared/src/maps/town-safe-zones.json`; map chưa cấu hình giữ an toàn toàn map. Trong polygon/biên cấm cast chủ động và sát thương cả hai phía; ngoài vùng giữ luật PK, không tự bật mode PK. Giữ hào quang ô tay/bị động, hiệu ứng vẫn hết hạn nhưng không gây sát thương trong vùng. Quyền dịch vụ NPC tách khỏi luật chiến đấu; không tự đổi ID/action hoặc sinh quái. Lưu cần restart server/reload client, production build lại; không live-patch. Kiểm `npm run test:safe-zones`.

- **Map Manager tự reload (USER2026-11-16):** npm run map:manager chạy supervisor riêng/watch mã toolManager/Boss/toolsUI/kit, restart và reload tab; trì hoãn khi có nháp. Đây là ngoại lệ được USER duyệt với luật tool không auto reload cũ; vẫn không nối HMR/game hoặc theo dõi assets/DB/config.

- **UX sinh quái mới (USER2026-11-16):** chọnM/bấm vùng trống trênmap tạođiểm ngay; điểm cũ chọn/kéo; bảng phải đã bỏ selector/hướng dẫn/XY/Đặtlại/nútxóa theoUSER, Del/Backspace xóa bảnnháp khi khôngnhậpliệu. BỏThêmkhu/ôXY/ManualAuto. Điểm mới5con kểcảBossXanh, radius220/respawn30; chọnquái cóảnh/poolnhiềuloài. Giữ dữliệuAuto cũ, không còn bộchọn/chuyểnManual trongUI. Quyếtđịnh này thay mặcđịnh khu mớiAuto ở ghi chú trước.

- **Sinh quái và gom Boss trong Map Manager (USER 2026-11-16):** công cụ Quái/Boss Xanh (M), từng khu Manual có X/Y hoặc Auto thiếu X/Y (giữ tương thích file cũ; khu mới đặt bằng click map), server chọn cụm khi khởi tạo map. Giữ cách đặt file cũ; lưu atomic/CAS riêng `packages/shared/spawns/<id>.json`, luôn auto:false bảo vệ khỏi generator (khác mode vị trí Auto), giữ fixed/note/legacy gold, restart server game để nhận; không live-patch room. Boss Hoàng Kim ở page `/boss/`, tái sử dụng handler/UI `tools/boss` cùng tiến trình, nguồn config.json/config.ts và Lưu/Áp dụng cũ; `npm run boss` vẫn tương thích. Kiểm `test:map-manager`; config thử dùng MAP_MANAGER_SPAWNS_DIR/BOSS_CONFIG_DIR. Không ghép nghiệp vụ spawn vào Map Creator.

- **Map Manager (USER 2026-11-15):** tool riêng `tools/map-manager`, `npm run map:manager` → localhost4570. Đã bổ sung quái/Boss Xanh và trang Boss Hoàng Kim theo USER2026-11-16. Lưu ghi trực tiếp `packages/shared/src/npcs/town-placements.json`; shared `towns.ts` dùng adapter tọa độ tuyệt đối→offset để game nhận cấu hình. Giữ NPC mặc định ở map chưa chỉnh và Dược Vương Cốc; không sửa *.gen.ts. Watcher dev có thể reload, bản production cần build/tải lại; chưa live-patch scene. Preview mặc định minimap vừa toàn map, zoom không tự đổi sang ground; dùng Xem NPC trên map thật để kiểm hướng tại chỗ. Điểm chuyển map dùng `packages/shared/src/maps/map-portals.json`, adapter MapMeta.portals giữ mặc định37↔140 khi chưa override; tool đặt/kéo/chọn đích và điểm đến, lưu riêng/CAS/nav hai đầu, không tự tạo chiều về. Lưu cần restart server/reload client/build production, không live-patch room. Icon/tooltip dùng chung tools/ui/actions.ts. Hướng dẫn tools/map-manager/README.md.

- **Map Creator (USER 2026-11-15):** tool độc lập `tools/map-creator`, `npm run map:creator` → localhost4569. USER upload ground/world rồi sắp xếp/cài đặt world và lưu project. Quái/Boss Xanh cấu hình bằng tool spawn riêng sau, không gộp nghiệp vụ spawn vào editor địa hình. Nguồn ảnh/project ở `tools/map-creator/projects` (gitignore); xuất bộ map vào project. Bật/Tắt publish qua PublicationStore và manifest, registry riêng `packages/shared/src/maps/custom-maps.json`, build bất biến ở assets/maps/id/build. Map bật vào game/hiện Manager; map tắt giữ dữ liệu/hiện nhãn quản trị, chặn join/teleport. Server đọc registry lúc chạy; người online/offline ở map tắt/mất đăng ký/thiếu map.json hoặc nav.json về Biện Kinh37. Cài code mới cần restart/build client; registry và bộ asset phải phân phối cùng nhau. Preview Chơi thử dùng sprite gốc/nhân vật ghép lớp/quái đứng và nav bản nháp trong tool, không đăng nhập/spawn server/ghi spawn; dừng giữ bản nháp và camera. Hướng dẫn `tools/map-creator/README.md`; không tự chép vào public/assets hoặc sửa catalog.gen.ts bằng tay.

- **Viewport game + HUD/input (USER 2026-11-15):** `platform/viewport.ts` là nguồn duy nhất của2preset/renderScale2/layout fit;
  `game/index.ts` đặt canvas và MSAA, `game/display.ts` dùng world units cho chữ/thanh máu và resolution2, camera=2×zoom100/150/200.
  HUD dùng khung1280×H và transform theo fit (`ui/kit/viewport.ts`), không dùng tọa độ màn hình trực tiếp cho dialog/tooltip/grid.
  Tùy chỉnh lưu `viewport=auto|1280x720|1280x800`; CSS trong HUD dùng --hud-w/h và container query. Bản đồ nhỏ/lớn có mật độ pixel riêng;
  modal tiềm năng native tự căn theo khung. Web/Desktop dùng chung; Mobile chưa có bố cục chạm riêng, không tự hạ render2×.
  Culling ground/actor, PF2/PF3 và thay đổi nội suy không nằm trong lượt triển khai này. Chi tiết docs/performance/02-do-luong.md §9.

- **Auto buff toàn bộ kỹ năng + bot mặc định bật (USER2026-11-14):** lấy kỹ năng đã học, không phụ thuộc thanh phím/giới hạn2buff; bỏ Ngự Tuyết Ẩn, không spam hỗ trợ giải trạng thái. Hào quang phù hợp đã học, Nga My ưu tiên Bế Nguyệt Phất Trần120 gộp5aura; dừng Auto người chơi trả aura tay. BotTemplate.autoBuff mặc địnhtrue, bot cũ mặc địnhbật; scenario cũfalse cũng migrate bật, scenario mới buffVersion1 giữ lựa chọnfalse rõ ràng. Thiết lập nhân vật hoặc kịch bản mới bỏtick thì không tựbuff/aura. Côn Lôn173/178 dùng Actor.passiveFx riêng, không thêm vàoActiveStates hoặc nhân chỉ số. Chi tiết `docs/auto.md`.

- **Ưu tiên mục tiêu Auto/bot (USER chốt vùng gần600px):** AutoPlay chung cả người chơi/bot. Trước tiên xét quái trong600px isometric quanh nhân vật, xếp `boss` Hoàng Kim→Xanh→thường / `blue` Xanh→thường (bỏ Hoàng Kim) / `near` gần nhất. Hết quái gần mới đi tìm xa. Đang đi được chọn quái gần mới gặp; chỉ chốt giao chiến sau server xác nhận `Actor.attackTarget` từ đòn tấn công thực sự bắt đầu. Đã giao chiến thì đánh tới chết/mất/không hợp lệ, cả3chếđộ; không đổi vì boss mới, buff hoặc HPkhônggiảm6giây. Chỉ tạm bỏ đích chưa giao chiến khi không tiến ngoài tầm>6giây, loại thời gian thi triển/khống chế/chờchiêu/nộilực; địch đã đánh bị kẹt thì retry/nudge vẫn giữ. Giữ focus riêng khỏi cast, loot giữa kills/idle, ngoại lệ điều khiển tay/đổi cấu hình/radius/SkipBoss/về thành khẩn cấp. Quyết định này thay bậc boss toànmap và ngoại lệ bỏ do HPkhônggiảm cũ; xem `docs/auto.md`.

- **Phím tắt, Hành trang, Rương chứa đồ tài khoản, Tooltip & Dòng rơi (USER 2026-11-14):**
  - **Phím tắt (`input/keymap.ts` — Phương án B):** `Q` Nhân vật (`char`), `W` Hành trang (`bag`), `E` Kỹ năng (`skills`), `R` Ngựa (`mount`), `A` PK (`pk`), `D` Thợ rèn (`shop`), `Z` Auto (`auto`), `P` Tổ đội (`team`), `T` Chuyển map (`travel`), `V` Kỳ Trân Các (`kytran`), `Tab` Bản đồ lớn, `Esc` Hệ thống.
  - **Hành trang & Kéo thả/Sắp xếp:** giữ đủ 5 tab đánh số `1–5` (cao `20px`); `moveOrSwapInGrid` (`items/bag.ts`) cho phép thả đè lên 1 món khác để hoán đổi vị trí; nút `Xếp` (`C2S.bagSort` / `sortGridPage`) gom gọn trang hiện tại. Không tự chuyển tab khi `dragover` lên tab (chỉ highlight và chuyển khi `drop`), hoãn redraw khi đang kéo.
  - **NPC Rương chứa đồ (`npc-ruong`, `npcs/towns.ts`):** đặt tại tất cả thành thị; có 3 tab `1–3` (`STASH_PAGES = 3`, `STASH_SIZE = 180`), kéo thả qua lại 2 chiều với Hành trang (`C2S.bagToStash`, `C2S.stashToBag`, `C2S.stashMove`, `S2C.stash`), đồng thời cho phép **gửi / rút Ngân lượng & Kim nguyên bảo** (`C2S.stashCurrency`). Toàn bộ vật phẩm và tiền trong rương lưu ở `UserRecord.stash` / `stashMoney` / `stashKnb` (`account/db.ts`) để chia sẻ giữa mọi nhân vật trong cùng tài khoản.
  - **Tooltip trang bị (`ui/tips/itemTip.ts`, `ui/kit/tooltip.css`):** chia thành 5 `.tip-section` tách biệt với padding rộng (`12px 16px`) và khoảng cách `9px` giữa các phần (mô tả cơ bản, chỉ số mặc định & yêu cầu, dòng ẩn/hiện, bộ/kích hoạt dòng ẩn, ghi chú).
  - **Thứ tự dòng vật phẩm rơi (`formulas/drops.ts rollMagicLines`):** không bỏ qua vị trí gây lệch chẵn/lẻ; các dòng rơi ra luôn điền tuần tự từ 1: dòng lẻ (`1, 3, 5`) luôn là thuộc tính **Hiện** (`prefix`), dòng chẵn (`2, 4, 6`) luôn là thuộc tính **Ẩn** (`suffix`).

- **Auto theo nhân vật + Mua bán/KNB (USER2026-11-14):** Z và nút AUTO chỉ mở cài đặt; chạy/dừng qua dialog hoặc play/pause cạnh bảng tên. `CharacterRecord.auto` lưu enabled/settings, cache `vltk.auto.character.<charId>`, server đối chiếu và reload tiếp tục nếu enabled; không dùng Auto toàn máy cho nhân vật khác. Tắt autoMap trong thành thì chờ, không tự tắt. Bot ghi Auto từ kịch bản vào char; rao món đủ tiêu chí lên kênh Mua bán có giá lượng/KNB do server tính theo `formulas/data/market-pricing.json` (USER2026-11-14), người chơi mua ngay được. Giá khởi điểm cấu hình, chưa học cung cầu/tự giảm giá; giao dịch thành công lưu riêng `db.marketSales`. Mua bán có lịch sử công khai, item snapshot do server lấy, preview đầy đủ; chỉ giá lượng/KNB (USER2026-11-14 bỏ Liên hệ), chưa đổi trang bị. Server chặn tin contact mới; tin cũ chỉ xem snapshot, cần rao lại bằng tiền. Mua trực tiếp yêu cầu seller online và món chưa đổi; không escrow/offline. KNB là ví riêng, mặc định0, mua ở Kỳ Trân Các trong thành100vạn/đơn vị. Tiền hiển thị qua moneyText theo vạn từ10000. Chi tiết Auto ở [`docs/auto.md`](docs/auto.md); Rao bán/Mua bán/KNB ở [`docs/rao-ban.md`](docs/rao-ban.md).

- **Design tool dùng chung (USER2026-11-14, GD8):** nguồn duy nhất là [`docs/tools-ui-ux-guidelines.md`](docs/tools-ui-ux-guidelines.md). Mọi AI phải đọc trước khi đề xuất/lập kế hoạch/tạo/sửa UI/UX tool theo điều kiện ở mục0; không tự dùng style riêng. Các entrypoint Claude/Gemini/Antigravity và tools/AGENTS chỉ dẫn lại nguồn này.

- **Công cụ bot độc lập (USER2026-11-14):** UI/runner/cấu hình ở `tools/bots`, mở `npm run bots:ui` → localhost4568, không Vite/HMR theo game. Game chỉ giữ API tác động thế giới, shared giữ luật. Bảng chọn nhân vật chia4tab Tất cả/Online/Offline/Chưa thiết lập có tổng số cuối tên tab; bỏ select trạng thái. Giới tính ♂ vàng cho Nam / ♀ xanh dương cho Nữ sau tên, Online/Offline có 🟢/🔴. Checkbox đầu bảng chọn/bỏ kết quả lọc trong tab hiện tại, có trạng thái chọn một phần, giữ lựa chọn tab khác. Chọn nhanh10/20/30 hoặc số nhập chọn Nđầu tiên theo thứ tự kết quả lọc tab hiện tại, thay lựa chọn trong phạm vi đó/giữ ngoài phạm vi, thiếu người thì chọn số thực tế và báo rõ. Có chọn/chạy kịch bản theo checkbox, Online theo kết nối thật và cột tên kịch bản; dừng riêng ID qua IPC. Có3template40–69/70–90/110–150 và `luyen-cong-30` (10tên/dải,3bot/s,liên tục); initialSetup chỉ khởi tạo tài khoản thiếu, không reset tiến trình cũ. Spawn cho phép `both` thành+bãi; không chặn Auto về thành mua thuốc.

- **Kịch bản bot (USER2026-11-14):** luôn chạy liên tục tớiCtrl+C, không duration; bot vào lần lượt3–5/giây(default3). UI chỉLuyện công/Chat/Rao bán đồng thời, template readonly hoặcTự cài đặt. Luyện công có radio Chủ động mời/Tự nhận lời mời/Tắt; autoInviteTeam và autoAcceptTeam loại trừ nhau, file bật cả hai ưu tiên mời, file cũ thiếu invite mặc địnhfalse. Mời người sống/chưa đội trong cùng map khi chưa có đội hoặc đội trưởng còn chỗ, 5s/bot và60s/tên, tính lời mời chờ vào8chỗ. Chat/rao chỉ khi nhặt đất thành công: món>5dòng hoặcẩnhiếm/lớn; không tựrao inventorybanđầu/buy/forge/rejoin. Dùng `InventoryMsg.pickedUp` mộtlần, `bots/social.ts`/LootAnnouncer, chốnglặp vàcooldown. Không làm PK/dạo/crowd trong scenario mới, không tự giao dịch.

- **Vũ khí/thuốc bot (USER2026-11-14, BT10):** mọi vũ khí xanh do thiết lập bot tạo phải có hai prefix luôn bật hút Sinh lực/Nội lực max toàn bảng (hiện10% mỗi loại), kể cả vũ khí cấp thấp; `bots/equipment.ts botGreenLines`, ngoại lệ chỉ bot, không sửa chế tạo người chơi. Thuốc mặc định Ngũ Hoa Ngọc Lộ Hoàn hồi cảSL/NL; ưu tiên nhóm thuốc kép. Picker bản đồ chỉ ở thiết lập Nâng cao, không lặp dưới Ngựa.

- **Form bot (USER2026-11-14, BT10):** `/?bots` chọn Tự cài đặt hoặc template tự tải/readonly; chỉ dải40–69/70–90/110–150, trang bị xanh/hoàng kim môn phái, ngựa random đủ cấp (từ110 chọn nhóm mạnh), tự học90/120/150 đủ cấp mặc định bật, không giới chỉ. Cập nhật thiết lập upsert hàng loạt ID roster và cập nhật bảng; Lưu Thiết lập hỏi tên và chỉ lưu template. Bỏ nút tạo/nạp ở form nhân vật. Bãi luyện công/Thành thị mặc định chọn tất cả map đã sinh đúng nhóm, chọn qua dialog preview và OK, không tự thay danh sách bằng bãi theo cấp. Nâng cao hiển thị ID đăng nhập; mật khẩu cũ không đổi khi cập nhật.

- **Bot roster200 (USER2026-11-14, BT10):** `packages/shared/src/bots/roster.ts` là 200 danh tính cố định (ID/tên/giới/phái), hệ theo phái. Tạo/áp mẫu/chạy lại không phân lại danh tính theo thứ tự chọn. Scenario mới lưu `bots.usernames` cụ thể; có trường này thì không fallback sang prefix/count, khi chạy danh sách rỗng/chưa tạo phải báo lỗi; Lưu kịch bản được phép chưa chọn nhân vật (USER2026-11-14), chỉ lưu mẫu hoạt động, không tự chạy. Giữ tương thích scenario cũ thiếu usernames. Trang `/?bots` chọn tên trước, cấu hình cấp/đồ sau, command copy sau khi lưu.

- **Mốc tốc độ & Sải chân (USER 2026-11-14, GP6 + cập nhật nền chạy 100% & đồng bộ vận tốc bước chân):** cấu hình chung **`packages/shared/src/formulas/tuning.ts` → `SPEED`**. Tốc đánh nền 10% (5–260%, 13–28 FPS, chuẩn 20 frames); Tốc chạy nền 100% (10 điểm, 50–260%, 5–24 FPS, chuẩn 8 frames). Bổ sung sải chân `stridePixels: 120` px (ngựa `180` px) và vận tốc thực tế `velocity = (fps / 8) * stride` giúp nhịp bước chân khớp hoàn hảo với tốc độ dịch chuyển map (chống trượt chân). Bảng F3 / N hiển thị `T.Độ Chạy` = `speedPoints(totals.run)` (nền 100% = 10 điểm). Panel `?skills` đổi title `VTLK - SKILL Test`, chia 2 tab Chiêu thức & Tốc độ, giao diện bảng theo hàng có cột Step + nút Áp và nút sao chép mã TS `export const SPEED`. Chi tiết `docs/formulas/speed.md` §13–14. Kiểm tra `npm run test:speed`.

- **Tống Kim theo SHXT (USER 2026-11-14):** cơ chế theo `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`, chỉ ngoại lệ lịch mở có thể đặt bất kỳ lúc nào. Mỗi thời điểm tối đa 1 trận/tầng Sơ–Trung–Cao trên toàn server; **chỉ làm cao cấp trước**, sơ/trung dùng chung cơ chế và bộ lọc cấp để sau. Bắt buộc điểm báo danh + sảnh chờ, không truyền thẳng vào chiến đấu. Tài liệu `docs/tong-kim-battlefield.md` thay thế thiết kế vay volamidle (bản cũ lưu nghiên cứu); các số 20 phút, 26 món, buff quân hàm 0–20% không còn là mặc định đã chốt. PAK Chiêu Thư phân cấp40–59/60–89/từ90, báo danh323/324/325; không tự coi đề xuất map328 hoặc thể thức Bảo vệ Nguyên Soái là lựa chọn USER. **Chỉ đạo tiếp theo USER 2026-11-14:** phần thiếu dữ liệu agent được tự thiết kế gameplay và trình duyệt; mục tiêu PK, danh hiệu, dùng vật phẩm và soái nhiều chiêu mạnh. Phương án CHỌN tại `docs/tong-kim-gameplay-proposal.md` (Bảo vệ Nguyên Soái, 27 món chiến đấu, 6 nhóm chiêu soái) **chưa được duyệt triển khai**; không tiếp tục coi thiếu script server là chặn thiết kế và không ghi số tự chọn thành dữ liệu gốc.

- **Phượng Tường + 40 bãi (USER 2026-11-13) & Quái / Boss 3 bậc (USER 2026-11-14):** thêm thành Phượng Tường (1), giữ Biện Kinh (37) / Dược Vương Cốc (140); 40 bãi Field + Cave chia cấp 10–200, hai bản đồ/mốc. Bảng chỉnh tay `packages/shared/src/maps/training-levels.ts`, tài liệu `docs/training-maps.md`; `gen-spawns` ưu tiên bảng này và giữ quái trong band. Đây là cấp riêng của project, không phải dữ liệu cấp từ client gốc. Tổng hiện có 43 bản đồ đã sinh. Bộ lọc Xa phu gộp `City` và `Capital` dưới nhãn **Thành thị** (USER 2026-11-13); giữ nguyên type gốc và luật thành an toàn. Quái chia 3 bậc (`Actor.boss = 0 | 1 | 2`): **Quái thường (`0`)** tên Trắng `#ffffff`, **Boss Xanh (`1`)** tên Xanh dương `#5cb8ff` (máu/exp ×5, 4 lần tung đồ, 2 điểm cố định/bãi + 3% tự hóa xanh khi hồi sinh), **Boss Hoàng Kim (`2`)** tên Vàng `#ffd700` (máu/exp ×12, 8 lần tung bảng `boss/*droprate`, 20 Đại/Tiểu Hoàng Kim trong `GOLDEN_BOSS_LIST` đặt 1 con ở sâu mỗi bãi).

- **Công thức** (2026-11-12): mọi phép tính chỉ số / cấp / sát thương / hiệu ứng nằm ở `packages/shared/src/formulas/`, hằng số chỉ ở
  `formulas/tuning.ts` (riêng `EFFECTS` được xuất lại từ nguồn duy nhất `formulas/effects/tuning.ts`, USER 2026-11-15; ghi nguồn DATA / SRC / WEB / JXWEB / CHỌN / USER), tài liệu `docs/formulas/`. Không viết công thức ở chỗ khác.
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

