# Auto — cài đặt, lưu và chạy theo nhân vật

> Nguồn chuẩn cho chủ đề **Auto / AUTO / tự động đánh** trong game và bot. Cập nhật 2026-11-14. Mã triển khai: `a7180d3` (chọn chiêu/boss/loot) và `7491d71` (lưu theo nhân vật, nút điều khiển và khôi phục).

## Hai tùy chọn đi bãi độc lập — USER 2026-11-17

- **Tự đổi bãi luyện công theo cấp** (`autoMap`): giữ lựa chọn bãi theo cấp khi tăng cấp thật hoặc xuất phát từ thành nếu không bật quay lại. Bot vẫn giới hạn trong `bot.setup.map.maps`.
- **Tự quay lại bãi luyện công trước đó** (`autoReturnTraining`, mặc định bật): sau chuỗi tiếp tế trong thành, gửi ý định trở lại điểm lưu; không chọn bãi theo cấp. Cấu hình cũ thiếu trường được chuẩn hóa bật, lựa chọn false mới được giữ. Nếu bật cả hai, từ thành ưu tiên điểm quay lại; tăng cấp tại bãi vẫn xét autoMap. Tắt cả hai thì chờ trong thành, không tự về thành mua thuốc.
- **Tự hồi sinh** (`autoRevive`) chỉ quyết định hồi sinh; đi tiếp do hai lựa chọn trên quyết định. `autoReturn` cũ vẫn là quay về chỗ bắt đầu khi hết quái trong cùng map, không phải tính năng trở lại từ thành.
- Server lưu riêng `CharacterRecord.trainingReturn={mapId,x,y}` khi chuyển từ bãi hợp lệ về thành: Thổ Địa Phù, Auto về tiếp tế, chuyển thành thủ công và hồi sinh. Không ghi đè khi đi giữa các thành hoặc giữa các bãi. Điểm lấy từ Actor trên server ngay trước chuyển, tồn tại qua đổi phòng/đăng nhập lại/khởi động lại server; không chứa tọa độ do client gửi.
- Xa phu có **Trở lại bãi luyện công**, hiển thị map/tọa độ qua StatsMsg owner-only. Chỉ dùng trong thành và khi còn sống; chưa có điểm thì nút khóa. Auto và Xa phu cùng dùng `C2S.train {returnPrevious:true}`. Map/tọa độ hợp lệ giữ nguyên; điểm bị chặn tìm điểm đứng hợp lệ gần nhất và báo rõ; map tắt/mất dữ liệu/tọa độ hỏng báo lỗi, không chuyển ngầm sang cửa map khác. Bot không trở lại map ngoài danh sách thiết lập hiện tại.
- Bot cũ ở thành chưa có điểm nhớ: khi bật quay lại, chọn bãi hợp lệ trong danh sách thiết lập làm điểm khởi đầu. Không tự reset bot hoặc sửa file mẫu/DB hàng loạt. Nhân vật thường chưa có điểm chỉ chọn bãi theo cấp khi autoMap bật; tắt autoMap thì báo chưa có điểm và giữ trong thành.
- Luật chung Web/Desktop/Mobile; client mới nhận tùy chọn và Xa phu, runner mới nhận đường gửi returnPrevious. Cần nạp lại server/runner/tool/client; không tác động runner đang chạy để cập nhật nóng. Kiểm riêng cổng2578/5184 vì2568/5174 đang có phiên thử khác, DB/artifacts `/tmp/jx-return-live`; unit + WS thật + browser desktop/mobile, chưa native/điện thoại thật.

## Điều khiển và lưu cài đặt đã triển khai

- Cửa sổ cài đặt rộng tối đa 560px, tự co theo màn hình; chia 4 tab **Chiến đấu / Bãi luyện / Nhặt đồ / Thuốc**. Chạy/Dừng luôn ở phía trên; đổi tab giữ nguyên giá trị. Tab hỗ trợ phím trái/phải, Home/End; nội dung cuộn riêng khi thiếu chiều cao.

- **Z** hoặc nút AUTO trên thanh chức năng mở hộp thoại; **Shift + Z** bật/tắt nhanh Auto play. **Chạy auto / Dừng auto** trong hộp thoại và nút **▶ / ❚❚ Auto** ngay bên trái ô Cấp, cùng hàng chỉ số trên cùng (nút gọn62×20, viền vuông xanh sẫm; đang chạy màu xanh lá) bật/tắt.
- Mỗi nhân vật có `CharacterRecord.auto` gồm cài đặt và trạng thái bật. Server xác thực nhân vật từ kết nối, chuẩn hóa giá trị và lưu DB; không lấy ID nhân vật do client gửi.
- Cache `vltk.auto.character.<charId>` giúp hiện cài đặt nhanh. Khi vào bản đồ, bản server luôn đối chiếu và thay cache cũ. localStorage bị chặn/hỏng vẫn lấy được server. Không dùng cài đặt Auto toàn máy cho nhân vật khác.
- Reload/đăng nhập lại tự tiếp tục nếu lần trước bật. Đây là Auto trong phiên chơi, không chạy khi người chơi đã đóng game. Trong thành, nếu tắt cả tự đổi bãi và tự quay lại thì chờ, không tự tắt trạng thái đã lưu.
- Bot lấy lựa chọn từ kịch bản, ghi cấu hình Auto đang chạy vào nhân vật; dừng runner ghi trạng thái tắt. Tổ đội khi luyện công chọn một chế độ mời/nhận/tắt, xem [hướng dẫn bot](bots-guide.md); không tự mời/nhận khi tắt luyện công.


## Kỹ năng, quái và boss

- Người chơi dùng chiêu tấn công trên thanh phím; bot tự xếp chiêu đã học theo ReqLevel, vũ khí và trạng thái cưỡi. **USER2026-11-16:** khi có quái trong600px và chiêu phái ưu tiên cần đi bộ, bot gửi xuống ngựa rồi chờ Actor xác nhận trước khi đánh. Buff/hào quang cần đi bộ cũng có thể yêu cầu xuống ngựa khi bật tự buff. Lệnh thử lại giãn1giây; chờ vẫn uống thuốc/hồi sinh/về thành theo Auto. Chiêu dùng được trên ngựa thì giữ cưỡi, không thêm vòng tự lên lại ngựa. Bot xếp lại thanh sau xác nhận; các đòn common1/2/53 không xen vào khi có chiêu phái dùng được.
- Xoay chiêu áp dụng cả trên boss. Khi chiêu chính chưa sẵn sàng, tìm chiêu tấn công khác dùng được trước khi đánh thường. Không đưa đánh thường vào vòng xoay khi có chiêu tấn công thật.
- Chiêu 90/120/150 vẫn cần đủ điều kiện cấp và đã học. Không có tầng chiêu 70 riêng trong dữ liệu hiện tại. Template bot có tùy chọn tự học đủ điều kiện; chạy kịch bản không tự reset tiến trình tài khoản cũ.
- Có3chế độ dùng chung cho Auto và bot: **Hoàng Kim (2) → Boss Xanh (1) → quái thường (0)** (`boss`, mặc định); **Boss Xanh → Quái thường** (`blue`, bỏ Hoàng Kim); **Gần nhất** (`near`). Bật Bỏ qua boss vẫn loại mọi boss, chỉ đánh quái thường.
- **USER chốt vùng gần600px:** ưu tiên tập quái hợp lệ trong bán kính600px isometric quanh vị trí hiện tại; bên trong vùng này mới xếp Hoàng Kim→Xanh→thường hoặc Xanh→thường (bỏ Hoàng Kim), rồi chọn gần nhất trong cùng bậc. Không có quái gần mới chọn đích xa; giữ đích xa ổn định cho tới khi gặp quái gần. Chế độ Gần nhất dùng cùng vùng và chọn theo khoảng cách, không xếp bậc.
- **Đang đi được đổi, đã đánh thì giữ:** lệnh cast có thể mới chỉ xếp hàng chạy tới, chưa là giao chiến. Server chỉ ghi `Actor.attackTarget` sau kiểm tra hồi chiêu/tầm/điều kiện và thực sự bắt đầu chiêu tấn công vào địch. Auto dùng xác nhận đó để chốt mục tiêu, giữ qua buff/debuff/không mất máu/boss mới/nhặt đồ; áp dụng cả3chế độ và bot. Hạ xong mới xét lại quanh vị trí hiện tại. Mục tiêu chết/mất/không hợp lệ, thao tác tay, đổi chế độ, phạm vi tìm giới hạn, về thành khẩn cấp vẫn là ngoại lệ.
- `autoSeek:true` cho tìm xa khi hết quái gần, không làm bậc boss xa vượt qua quái trong600px. `autoSeek:false` vẫn lọc theo bán kính quanh điểm bắt đầu (`autoRadius`), rồi áp dụng ưu tiên600px trong tập hợp lệ; không tự nới vùng cài đặt.
- Mục tiêu tập trung (`focus`) tách khỏi lệnh đánh gần nhất (`target`): buff/debuff tạm thay lệnh server nhưng không làm quên mục tiêu; xong bùa khóa lại đúng con cũ. Không gửi lệnh nhặt giữa lúc có mục tiêu sống; nhặt gần giữa các lượt hạ mục tiêu hoặc khi hết mục tiêu. Thuốc/hồi sinh/về thành khẩn cấp, điều khiển tay và đổi cấu hình vẫn hoạt động.
- Cài đặt cũ đã lưu không bị mặc định mới ghi đè. Muốn đánh boss, tắt **Bỏ qua boss** và chọn ưu tiên boss. Mục tiêu phải cùng bản đồ, còn sống, trong vùng tìm kiếm và không đang bị loại tạm vì kẹt/không gây sát thương.

## Lịch sử điều tra bỏ boss giữa trận trước bản vùng gần (2026-11-14)

Đã tái hiện2ca thất bại trên mã trước sửa: (1) boss cùng bậc khác gần hơn hẳn khiến đổi mục tiêu; (2) tiền rơi gần làm gửi pickup và xóa mục tiêu đang đánh. Server `world/systems/drops.ts` khi đi nhặt sẽ xóa `sim.pending`, nên nhân vật rời đòn đánh để chạy nhặt. Buff/curse cũng từng xóa trường giữ mục tiêu, lần chọn sau có thể đổi boss.

Bản sửa trước tách focus/lệnh đánh, trì hoãn loot giữa các lượt hạ mục tiêu, giữ focus qua buff/curse và đặt lại đồng hồ chống kẹt khi dùng bùa. **Ngoại lệ cũ sau đây đã được thay bởi bản600px bên dưới:** mục tiêu bị loại sau đứng không tiến được1,5giây hoặc ở tầm mà không mất máu6giây, bỏ tạm10giây; phạm vi `autoSeek:false` vẫn giới hạn theo bán kính. Đây là suy luận chống kẹt, không phải phát hiện đường đi/kháng hoàn hảo. Không khẳng định đã chẩn đoán dữ liệu phiên chơi cụ thể của USER.

`test:auto`12ca gồm chọn bậc/gần nhất/giữ mục tiêu/chuỗi2Hoàng Kim→2Xanh→thường, blue bỏ vàng, buff/debuff, loot giữa trận, đổi cấu hình, chống kẹt và chuẩn hóa. Hai ca hồi quy được chạy fail trước sửa rồi pass sau sửa. `test:bots`10 + `test:market`13, typecheck/build đạt.

WS thật trên2568, DB riêng `/tmp/jx-auto-focus/db.json`: runner Auto đánh mục tiêu kiểm soát, boss sống mất máu trong8giây dù đưa boss khác cùng bậc tới gần hơn và thêm tiền rơi cạnh nhân vật; không đổi khóa/không pickup giữa trận. Sau khi giảm HP các mục tiêu thử về1 để đòn engine kết liễu, quan sát đúng thứ tự Hoàng Kim1→Hoàng Kim2→Xanh→thường. Đây là kiểm luồng lệnh/engine, không đo cân bằng boss thật. Chromium1440/390 kiểm lựa chọn blue ở tool và Auto, lưu kịch bản, lưu DB nhân vật/reload vẫn blue; đã xem ảnh. Không sửa spawn/config/DB game thật; chưa native/mobile thật. Script/ảnh tại `/tmp/jx-auto-focus/`.


## Vùng gần600px và xác nhận giao chiến từ server

- Mã chọn/giữ mục tiêu vẫn dùng chung `AutoPlay` cho client và runner bot; không cần đổi kịch bản để nhận quy tắc mới. Hằng số `AUTO_NEAR_RADIUS=600`, tính theo isometric; vùng này di chuyển theo nhân vật.
- `Actor.attackTarget` là địch của đòn tấn công đã bắt đầu ở server. Lệnh tiếp cận, chưa đủ nội lực/hồi chiêu hoặc cast bị từ chối không xác nhận giao chiến. Buff không xóa xác nhận; di chuyển tay, chết/hồi sinh và room mới xóa. Auto giữ trạng thái giao chiến đã xác nhận qua những lần địch đi xa hay buff thay lệnh đánh.
- **Bỏ điều kiện bỏ địch chỉ vì6giây HPkhônggiảm.** Đánh chậm, đánh hụt, khiên, thiếu nội lực và chờ hồi chiêu không làm nhảy sang địch khác. Khi đã giao chiến, kể cả đứng kẹt lúc đuổi theo thì thử lại đường/né sang bên và vẫn giữ đúng địch.
- Chỉ tạm bỏ một **đích chưa giao chiến** khi liên tục hơn6giây đứng ngoài tầm mà không đi được12px. Thời gian này không cộng khi đang thi triển/đánh/bị thương/nhảy, bị choáng hoặc chiêu chưa sẵn sàng vì hồi chiêu/nội lực. Dùng tầm chiêu thực tế đang gửi (kể cả đánh thường thay thế), không mặc định tầm chiêu chính. Đích bị kẹt tạm bỏ10giây; kẹt lặp lại có bước né như trước. Đây vẫn là suy luận từ chuyển động, không phải chứng minh đường đi hoàn hảo.
- Kiểm hồi quy:4ca mới fail trên mã cũ (boss xa thắng quái gần, không đổi đích khi đi, bỏ địch khi HPđứng yên, biên600px). Sau sửa `test:auto`34ca gồm bộ22ca cũ và12ca mới, thêm kiểm server thực tế xếp hàng/tầm/hồi chiêu/từ chối không xác nhận, buff giữ xác nhận/di chuyển tay xóa; xác nhận trễ vẫn khóa địch đã ra đòn dù đã chọn đích di chuyển khác; kiểm isometric/đổi chế độ/lọc radius/blue/đích kẹt và bảo toàn giao chiến.
- WS thật bot chế độboss: thường90px trước vàng2200px; sau hạ chạy tới đích xa, gặp quái mới trên đường thì dừng; giữ quái đó12,5giây HPkhônggiảm dù có vàng gần và tiền rơi; chỉ sau hạ mới chọn vàng tiếp. Chromium client thật chế độblue: cùng luồng với xanhxa/xanhgần, thêmvàngtrongvùng vẫn bỏ;1440/390 khôngpageerror/trànngang, đã xem ảnh. Damage/HP được điều khiển riêng ở harness để tái hiện không mất máu; không tuyên bố đo cân bằng chiến đấu thật.
- DB/script/ảnh riêng `/tmp/jx-auto-near/`, server2568/client5174; không sửa DB/game thật, không đổi cấu hình đang chạy. Cần nạp lại server/client/runner để có schema và mã mới; chưa wrapperDesktop/Mobile/điệnthoạithật, dùng chung luật cho ba nền tảng.

## Nhặt đồ và bán cho NPC

- **Nhặt đồ tổ đội và nhặt song song (USER 2026-11-20):** Server đồng bộ thêm `Ground.team` (mã tổ đội của người kết liễu). `AutoPlay` cho phép nhặt đồ rơi của chính mình, của đồng đội cùng tổ đội (`canTake`), hoặc đồ vô chủ. Các vật phẩm/ngân lượng đã nằm trong tầm nhặt (`DROPS.pickupRange = 80`) được gửi lệnh nhặt **song song ngay lập tức** (`pickInRange`), không bị delay hay khóa bởi thao tác đánh quái, combat hoặc `manualPauseAt`.
- **Ưu tiên nhặt đồ phạm vi 1200 (`autoLootPriority`, mặc định tắt):** Khi bật, Auto quét đồ rơi hợp lệ trong bán kính `AUTO_LOOT_PRIORITY_RADIUS = 1200` đơn vị isometric và ưu tiên chạy tới nhặt trước mọi hành động khác (kể cả đang đánh quái thường hay Boss).
- Nhặt ngân lượng là tùy chọn riêng, không cần chỗ trong túi và không phụ thuộc bật nhặt trang bị. Trang bị chỉ nhặt khi còn vùng trống đủ kích thước.
- Lọc đồ: tất cả, xanh trở lên hoặc chỉ tiền; kết hợp công tắc nhặt ngân lượng độc lập.
- Tự bán đồ trắng không mặc được; tùy chọn **Tự bán đồ xanh trong túi** (`autoSellBlue`, giữ món đạt tiêu chí `autoKeepValuable` nếu bật) và **Tự bán toàn bộ đồ xanh** (`autoSellAllBlue`, bán mọi đồ xanh bất kể số dòng hay thuộc tính) kiểm tra mỗi 30 giây (cả khi đứng trong thành nếu tắt đi bãi) và khi về thành. Mặc định cả hai đều tắt cho cài đặt mới; preset `luyen-cong-30` bật `autoSellBlue` kèm bảo vệ.
- Bảo vệ đồ xanh có giá trị: món trên 5 dòng hoặc có dòng ẩn hiếm/cao theo tiêu chí đáng chú ý của bot; bổ sung giữ món đạt bộ định giá xanh/hoàng kim trong [Rao bán](rao-ban.md). Không bán hoàng kim, ngựa, thuốc, bí kíp, lệnh bài hoặc đồ đang mặc. Đồ xanh dự trữ trong túi vẫn có thể bị bán nếu bật bán xanh và không thuộc nhóm được bảo vệ (hoặc khi bật `autoSellAllBlue`).
- Túi toàn món được bảo vệ thì bỏ qua trang bị không vừa, vẫn nhặt tiền; cần dọn túi. Tự bán NPC khác với đăng tin Rao bán, không tự biến thành giao dịch người chơi.

## Bản đồ mã nguồn

| Phần | File |
|---|---|
| Cài đặt mặc định, chuẩn hóa và kiểu bản lưu | `packages/shared/src/auto/settings.ts` |
| Bộ não Auto chung người chơi/bot | `packages/shared/src/auto/AutoPlay.ts` |
| Database nhân vật | `apps/server/src/account/db.ts` → `CharacterRecord.auto` |
| Nhận/lưu/gửi cài đặt theo kết nối | `apps/server/src/net/MapRoom.ts` → `C2S/S2C.autoConfig` |
| Cache và đối chiếu server | `apps/client/src/state/characterAuto.ts` |
| Cài đặt runtime, tách khỏi cấu hình toàn máy | `apps/client/src/state/settings.ts` |
| Dialog và nút điều khiển | `apps/client/src/ui/windows/auto.ts`, `apps/client/src/ui/hud/Hud.ts`, `notices.ts` |
| Phím Z và nối bộ não vào game | `apps/client/src/input/keymap.ts`, `apps/client/src/game/WorldScene.ts` |
| Thanh chiêu, đồng bộ Auto của bot | `tools/bots/runner/BotClient.ts` |

## Kiểm chứng và giới hạn

- `npm run test:auto`: 12ca; xem phần kiểm chứng bổ sung ở trên.
- `npm run test:market`: có ca tách cache từng nhân vật, server thay cache cũ và localStorage lỗi; các ca còn lại thuộc tài liệu Rao bán.
- Typecheck/build và `npm run test:bots` đạt. WebSocket thật xác nhận lưu DB và khôi phục khi vào lại. Chromium desktop1440 và viewport390px xác nhận Z chỉ mở, nút chạy/dừng, reload tiếp tục và quick pause; đã xem ảnh.
- Kiểm thử riêng cổng2568/5174, DB `/tmp/jx-market-auto/db.json`; không tác động game người dùng. Chưa kiểm wrapper native/điện thoại thật hoặc cân bằng kỹ năng/boss toàn bộ môn phái.
- Cache dùng localStorage trên web và wrapper cung cấp API này; server vẫn là nguồn đối chiếu. Trạng thái enabled không đồng nghĩa tự chơi khi đã đóng game.


## Tự buff toàn bộ kỹ năng đã học — USER 2026-11-14

- Auto người chơi và bot đọc các kỹ năng đã học có cấp hiệu lực >0, không cần đặt trên thanh phím, không giới hạn hai buff. Chỉ dùng khi đúng vũ khí/ngựa, đủ nội lực và hết hồi chiêu. Buff đang có không thi triển lại; sau khi server xác nhận rồi hết trạng thái thì được dùng lại, không phải chờ chặn thử lại15giây. Lệnh chưa được xác nhận vẫn giãn15giây; giữa các buff cách ít nhất800ms. Hồi sinh xóa lịch thử buff cũ.
- Loại **Ngự Tuyết Ẩn713**, không tự spam giải trạng thái **Xuất Ứ Bất Nhiễm716**; hồi máu/dịch chuyển vẫn là hỗ trợ theo tình huống, không nằm trong vòng buff duy trì. Không tự thi triển Vũ Lộ Xuân Phong397 (bảng hiện tại không có thuộc tính có lợi để áp dụng).
- Hào quang được chọn từ kỹ năng đã học, đủ điều kiện, ưu tiên tầng cao hơn. Thiếu Lâm La Hán Trận, Võ Đang Thất Tinh Trận; Nga My ưu tiên **Bế Nguyệt Phất Trần712 (cấp120)**, mang kèm86/89/92/282/332; chưa học712 thì chọn hào quang cấp cao nhất đã học. Ngũ Độc duy trì Vô Hình Độc (hào quang gây hại). Server giữ một hào quang chính, tự khôi phục sau hồi sinh/hết hạn chế trang bị. Hào quang được chọn cả trong thành, buff thi triển vẫn chỉ ngoài thành.
- Auto người chơi dùng lựa chọn trên trong lúc bật **Tự buff**; dừng Auto/tắt Tự buff trả lại hào quang đặt ở tay (phải ưu tiên). Không sửa/lưu đè thanh phím. Hào quang tay do người chơi đặt vẫn chạy độc lập khi Auto tắt. Với bot bỏ tick tự buff thì không tự chọn hào quang.
- Hoa Sơn có Huyễn Nhãn Vân Yên và các trạng thái kiếm pháp, trường có lợi1376/1380; ưu tiên buff thường trước hai trạng thái1364/1369 làm giảm hồi nội lực. Đây không phải triển khai thêm khí trường/kích nổ hay sửa lỗi hồi nội lực âm đã được điều tra. Nếu hết nội lực thì Auto chờ điều kiện thi triển; bộ kỹ năng Kiếm Tông có1349 vẫn chịu lỗi cũ. Kiểm WS11phái dùng Hoa Sơn Khí Tông; không khẳng định đã cân bằng hoặc hoàn thiện toàn bộ Hoa Sơn.

### Thiết lập tạo bot và cấu hình cũ

- **Bổ sung học buff cơ bản — USER2026-11-16:** server cấp các buff duy trì/hào quang thường của phái ở cấp tối đa hợp lệ theo cấp nhân vật. Đây là bước cấp kỹ năng riêng cho bot, tương tự thiết lập tầng chiêu; không tiêu hoặc phân lại điểm kỹ năng, không giảm chiêu đã có, không tẩy nhân vật. Gợi ý cộng điểm của người chơi giữ nguyên. Chỉ áp dụng khi thiết lập nhân vật cho phép tự buff; không tự mở bí kíp90/120/150, Ngự TuyếtẨn hoặc hỗ trợ theo tình huống.
- Áp dụng cả bot mới và bot đã tạo ngay khi vào map bằng bản server mới, lưu bổ sung vào nhân vật; khi tăng cấp/đổi phái thì kiểm lại một lần. Giữ cấp/EXP/điểm/đồ/túi/tiền/thục luyện và chiêu tấn công. Bỏ tick không xóa buff đã học. Nguồn `world/botBuffs.ts`, đăng ký từ bản ghi bot đã xác thực trong MapRoom; nhân vật thường không được cấp theo đường này. Runner đang chạy cần nạp mã mới; không tự reset hoặc ghi DB trực tiếp để chuyển đổi.

- **Thiết lập nhân vật** có checkbox **Tự động buff kỹ năng đã học và duy trì hào quang**, mặc định bật (`BotTemplate.autoBuff`). Template/nhân vật cũ thiếu trường này được hiểu là bật; không cần đặt lại cấp/trang bị của bot cũ. Bỏ tick rồi **Cập nhật thiết lập** mới áp dụng cho nhân vật; **Lưu Thiết lập** chỉ lưu template.
- Kịch bản cũ, kể cả từng có `auto.autoBuff:false`, được chuyển mặc định sang bật theo USER. Kịch bản mới lưu `buffVersion:1` để giữ lựa chọn tắt rõ ràng qua lưu/nạp/chạy lại. Không đổi các lựa chọn Auto khác. Tùy chọn tự buff trong kịch bản vẫn là công tắc cho lượt chạy; một trong thiết lập nhân vật/kịch bản mới chủ động tắt thì bot không tự buff/hào quang.
- API login bot gửi lựa chọn đã chuẩn hóa theo từng nhân vật; runner dùng riêng từng bot, không ghi đè cấu hình chung giữa các bot. Khi vào bằng game, cấu hình bot cũ cũng được đối chiếu với thiết lập này. Muốn áp dụng mã mới cần restart server/runner/tool và reload client; agent không restart tiến trình thật đang quản lý bot.

### Hình ảnh bị động Côn Lôn

- Nhất Khí Tam Thanh178 và Thiên Thanh Địa Trọc173 có chỉ số luôn được tính từ `passiveBag`. Server gửi riêng `Actor.passiveFx`; client vẽ cùng bộ StateDecor và hình gốc, giữ tỉ lệ1:1. Không đưa vào ActiveStates, không cộng hai lần hoặc tạo buff hết hạn giả. Người xung quanh cũng nhận được hình ảnh; chết thì ẩn theo đường vẽ có sẵn.
- Khi kỹ năng về0/bỏ học thì danh sách hình ảnh tự cập nhật; không gửi lại mảng khi không đổi. Không sửa file sinh hoặc asset bằng tay.

## Phản ứng bật Auto và giữ mục tiêu click tay — USER 2026-11-16

- **Auto phản ứng ngay lập tức:** Khi người chơi bật Auto (`start()`), thời gian nghỉ của thao tác tay trước đó được xóa sạch (`pausedUntil = 0`). Client kích hoạt `update()` ngay lập tức trong cùng frame mà không cần chờ tick sau. Đòn đánh đầu tiên được ưu tiên khóa và thi triển vào quái trước (`first offensive lock`), sau đó mới tiếp tục duy trì các buff/curse bằng cờ trạng thái `waitForApplied`, tránh tình trạng đứng buff rườm rà làm trễ nhịp tấn công.
- **Giữ mục tiêu click tay (`Sim.lockedAttack`):**
  - Khi người chơi click chuột trái vào quái, client gửi `C2S.cast` có cờ `lock: true`. Server lưu riêng ý định này vào `sim.lockedAttack`, tách biệt với hành động `pending` đang thi triển.
  - Khi bị khống chế (**co giật `hurt`** hoặc **choáng `stun`**), server xóa động tác tức thời `pending = null`, nhưng vẫn giữ nguyên `sim.lockedAttack`.
  - Ngay khi nhân vật thoát khỏi trạng thái khống chế (hoặc sau khi hoàn tất một chiêu buff phụ trợ), nếu không có `pending` mà vẫn còn `lockedAttack`, server **tự động dựng lại `sim.pending`** để nhân vật tiếp tục lao vào đánh mục tiêu đã chọn ban đầu mà không cần client gửi lại lệnh.
  - **Hủy / Chuyển mục tiêu:**
    - Click di chuyển (`commandMove`): xóa ngay lập tức `sim.lockedAttack = undefined; sim.pending = null; sim.a.attackTarget = '';`.
    - Click quái khác: chuyển `lockedAttack` sang con quái mới.
    - Quái chết, biến mất khỏi bản đồ, hoặc vào vùng an toàn (safe zone): server tự động hủy `lockedAttack`.
    - Nhân vật chết hoặc hồi sinh (`kill`, `revive`): tự động hủy `lockedAttack`.
- Logic này chạy trên server và client dùng chung cho cả 3 nền tảng Web, Desktop và Mobile.


### Kiểm chứng lượt này

- `test:auto`22ca:11phái với thanh phím trống, Thúy Yên100/109 không713, aura712/fallback/stop, sẵn sàng và trạng thái đang có, buff ngắn/hồi sinh/chống spam, migration cũ→bật và lựa chọn tắt mới, bot opt-out, passiveFX không nhân chỉ số.
- WS thật11phái trên2568/DBriêng: lệnh buff dù thanh phím trống, Thúy Yên đủ100/109, Nga My712+5aura, Côn Lôn173/178 chỉ làvisual. APIconfigure/login→runner/DB xác nhận mặc định bật và bỏ tick tắt cả buff/hào quang. Chromium thật1440/390: template mặc định check/lưu/nạpfalse/readonly, scenariofalse+marker/reload, không tràn ngang; game: hai FX Côn Lôn thực sự đổi frame, Nga My dừngAuto trả về tay86, Thúy Yên thanh trống vẫn buff, không713. Đã xem ảnh.
- Script/DB/ảnh riêng `/tmp/jx-auto-buffs/`, client5174/tool4578, không tác động DB/game thật. Chưa kiểm wrapper Desktop/Mobile hay điện thoại thật; ba nền tảng dùng chung luật và bộ vẽ.

## Tài liệu liên quan

- [Rao bán, kênh Mua bán và Kim nguyên bảo](rao-ban.md): tin gắn vật phẩm, tiêu chí bot rao và thanh toán.
- [Hướng dẫn bot](bots-guide.md), [thiết kế bot](bots.md): roster, template và kịch bản chạy.
