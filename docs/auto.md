# Auto — cài đặt, lưu và chạy theo nhân vật

> Nguồn chuẩn cho chủ đề **Auto / AUTO / tự động đánh** trong game và bot. Cập nhật 2026-11-14. Mã triển khai: `a7180d3` (chọn chiêu/boss/loot) và `7491d71` (lưu theo nhân vật, nút điều khiển và khôi phục).

## Điều khiển và lưu cài đặt đã triển khai

- Cửa sổ cài đặt rộng tối đa 560px, tự co theo màn hình; chia 4 tab **Chiến đấu / Bãi luyện / Nhặt đồ / Thuốc**. Chạy/Dừng luôn ở phía trên; đổi tab giữ nguyên giá trị. Tab hỗ trợ phím trái/phải, Home/End; nội dung cuộn riêng khi thiếu chiều cao.

- **Z** hoặc nút AUTO trên thanh chức năng mở hộp thoại. **Chạy auto / Dừng auto** trong hộp thoại và nút **▶ / ❚❚ Auto** cạnh bảng tên bật/tắt.
- Mỗi nhân vật có `CharacterRecord.auto` gồm cài đặt và trạng thái bật. Server xác thực nhân vật từ kết nối, chuẩn hóa giá trị và lưu DB; không lấy ID nhân vật do client gửi.
- Cache `vltk.auto.character.<charId>` giúp hiện cài đặt nhanh. Khi vào bản đồ, bản server luôn đối chiếu và thay cache cũ. localStorage bị chặn/hỏng vẫn lấy được server. Không dùng cài đặt Auto toàn máy cho nhân vật khác.
- Reload/đăng nhập lại tự tiếp tục nếu lần trước bật. Đây là Auto trong phiên chơi, không chạy khi người chơi đã đóng game. Trong thành, nếu tắt tự đổi bãi thì chờ, không tự tắt trạng thái đã lưu.
- Bot lấy lựa chọn từ kịch bản, ghi cấu hình Auto đang chạy vào nhân vật; dừng runner ghi trạng thái tắt. Tổ đội khi luyện công chọn một chế độ mời/nhận/tắt, xem [hướng dẫn bot](bots-guide.md); không tự mời/nhận khi tắt luyện công.


## Kỹ năng, quái và boss

- Người chơi dùng chiêu tấn công trên thanh phím; bot tự xếp chiêu đã học theo ReqLevel, vũ khí và trạng thái cưỡi. Chiêu có `noHorse` bị loại khi cưỡi; bot xếp lại khi lên/xuống ngựa.
- Xoay chiêu áp dụng cả trên boss. Khi chiêu chính chưa sẵn sàng, tìm chiêu tấn công khác dùng được trước khi đánh thường. Không đưa đánh thường vào vòng xoay khi có chiêu tấn công thật.
- Chiêu 90/120/150 vẫn cần đủ điều kiện cấp và đã học. Không có tầng chiêu 70 riêng trong dữ liệu hiện tại. Template bot có tùy chọn tự học đủ điều kiện; chạy kịch bản không tự reset tiến trình tài khoản cũ.
- Có3chế độ dùng chung cho Auto và bot: **Hoàng Kim (2) → Boss Xanh (1) → quái thường (0)** (`boss`, mặc định); **Boss Xanh → Quái thường** (`blue`, bỏ Hoàng Kim); **Gần nhất** (`near`). Bật Bỏ qua boss vẫn loại mọi boss, chỉ đánh quái thường.
- USER2026-11-14: khi chọn mục tiêu mới ở2chế độ boss, lấy **bậc cao nhất còn hợp lệ, rồi con gần nhất trong bậc đó** theo khoảng cách isometric. Giữ mục tiêu đó đến chết/mất/không còn hợp lệ; không đổi sang boss cùng bậc gần hơn hoặc bậc khác vừa xuất hiện giữa trận. Sau khi hạ nó, chọn lại từ đầu theo cùng quy tắc. Quyết định này thay hành vi trước đây có thể nâng bậc/ngắt mục tiêu đang đánh. Chế độ Gần nhất giữ cơ chế cũ: có thể đổi sang con gần hơn hẳn.
- Mục tiêu tập trung (`focus`) tách khỏi lệnh đánh gần nhất (`target`): buff/debuff tạm thay lệnh server nhưng không làm quên mục tiêu; xong bùa khóa lại đúng con cũ. Không gửi lệnh nhặt giữa lúc có mục tiêu sống; nhặt gần giữa các lượt hạ mục tiêu hoặc khi hết mục tiêu. Thuốc/hồi sinh/về thành khẩn cấp, điều khiển tay và đổi cấu hình vẫn hoạt động.
- Cài đặt cũ đã lưu không bị mặc định mới ghi đè. Muốn đánh boss, tắt **Bỏ qua boss** và chọn ưu tiên boss. Mục tiêu phải cùng bản đồ, còn sống, trong vùng tìm kiếm và không đang bị loại tạm vì kẹt/không gây sát thương.

## Điều tra bỏ boss giữa trận và kiểm chứng (2026-11-14)

Đã tái hiện2ca thất bại trên mã trước sửa: (1) boss cùng bậc khác gần hơn hẳn khiến đổi mục tiêu; (2) tiền rơi gần làm gửi pickup và xóa mục tiêu đang đánh. Server `world/systems/drops.ts` khi đi nhặt sẽ xóa `sim.pending`, nên nhân vật rời đòn đánh để chạy nhặt. Buff/curse cũng từng xóa trường giữ mục tiêu, lần chọn sau có thể đổi boss.

Bản sửa `AutoPlay` tách focus/lệnh đánh, trì hoãn loot giữa các lượt hạ mục tiêu, giữ focus qua buff/curse và đặt lại đồng hồ chống kẹt khi dùng bùa. Vẫn có ngoại lệ an toàn: mục tiêu bị loại sau đứng không tiến được1,5giây hoặc ở tầm mà không mất máu6giây, bỏ tạm10giây; phạm vi `autoSeek:false` vẫn giới hạn theo bán kính. Đây là suy luận chống kẹt, không phải phát hiện đường đi/kháng hoàn hảo. Không khẳng định đã chẩn đoán dữ liệu phiên chơi cụ thể của USER.

`test:auto`12ca gồm chọn bậc/gần nhất/giữ mục tiêu/chuỗi2Hoàng Kim→2Xanh→thường, blue bỏ vàng, buff/debuff, loot giữa trận, đổi cấu hình, chống kẹt và chuẩn hóa. Hai ca hồi quy được chạy fail trước sửa rồi pass sau sửa. `test:bots`10 + `test:market`13, typecheck/build đạt.

WS thật trên2568, DB riêng `/tmp/jx-auto-focus/db.json`: runner Auto đánh mục tiêu kiểm soát, boss sống mất máu trong8giây dù đưa boss khác cùng bậc tới gần hơn và thêm tiền rơi cạnh nhân vật; không đổi khóa/không pickup giữa trận. Sau khi giảm HP các mục tiêu thử về1 để đòn engine kết liễu, quan sát đúng thứ tự Hoàng Kim1→Hoàng Kim2→Xanh→thường. Đây là kiểm luồng lệnh/engine, không đo cân bằng boss thật. Chromium1440/390 kiểm lựa chọn blue ở tool và Auto, lưu kịch bản, lưu DB nhân vật/reload vẫn blue; đã xem ảnh. Không sửa spawn/config/DB game thật; chưa native/mobile thật. Script/ảnh tại `/tmp/jx-auto-focus/`.

## Nhặt đồ và bán cho NPC

- Nhặt ngân lượng là tùy chọn riêng, không cần chỗ trong túi và không phụ thuộc bật nhặt trang bị. Trang bị chỉ nhặt khi còn vùng trống đủ kích thước.
- Lọc đồ: tất cả, xanh trở lên hoặc chỉ tiền; kết hợp công tắc nhặt ngân lượng độc lập.
- Tự bán đồ trắng không mặc được; tùy chọn **Tự bán đồ xanh trong túi** kiểm tra mỗi 30 giây và khi về thành. Bán xanh mặc định tắt cho cài đặt mới; preset `luyen-cong-30` bật kèm bảo vệ.
- Bảo vệ đồ xanh có giá trị: món trên 5 dòng hoặc có dòng ẩn hiếm/cao theo tiêu chí đáng chú ý của bot; bổ sung giữ món đạt bộ định giá xanh/hoàng kim trong [Rao bán](rao-ban.md). Không bán hoàng kim, ngựa, thuốc, bí kíp, lệnh bài hoặc đồ đang mặc. Đồ xanh dự trữ trong túi vẫn có thể bị bán nếu bật bán xanh và không thuộc nhóm được bảo vệ.
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

- **Thiết lập nhân vật** có checkbox **Tự động buff kỹ năng đã học và duy trì hào quang**, mặc định bật (`BotTemplate.autoBuff`). Template/nhân vật cũ thiếu trường này được hiểu là bật; không cần đặt lại cấp/trang bị của bot cũ. Bỏ tick rồi **Cập nhật thiết lập** mới áp dụng cho nhân vật; **Lưu Thiết lập** chỉ lưu template.
- Kịch bản cũ, kể cả từng có `auto.autoBuff:false`, được chuyển mặc định sang bật theo USER. Kịch bản mới lưu `buffVersion:1` để giữ lựa chọn tắt rõ ràng qua lưu/nạp/chạy lại. Không đổi các lựa chọn Auto khác. Tùy chọn tự buff trong kịch bản vẫn là công tắc cho lượt chạy; một trong thiết lập nhân vật/kịch bản mới chủ động tắt thì bot không tự buff/hào quang.
- API login bot gửi lựa chọn đã chuẩn hóa theo từng nhân vật; runner dùng riêng từng bot, không ghi đè cấu hình chung giữa các bot. Khi vào bằng game, cấu hình bot cũ cũng được đối chiếu với thiết lập này. Muốn áp dụng mã mới cần restart server/runner/tool và reload client; agent không restart tiến trình thật đang quản lý bot.

### Hình ảnh bị động Côn Lôn

- Nhất Khí Tam Thanh178 và Thiên Thanh Địa Trọc173 có chỉ số luôn được tính từ `passiveBag`. Server gửi riêng `Actor.passiveFx`; client vẽ cùng bộ StateDecor và hình gốc, giữ tỉ lệ1:1. Không đưa vào ActiveStates, không cộng hai lần hoặc tạo buff hết hạn giả. Người xung quanh cũng nhận được hình ảnh; chết thì ẩn theo đường vẽ có sẵn.
- Khi kỹ năng về0/bỏ học thì danh sách hình ảnh tự cập nhật; không gửi lại mảng khi không đổi. Không sửa file sinh hoặc asset bằng tay.

### Kiểm chứng lượt này

- `test:auto`22ca:11phái với thanh phím trống, Thúy Yên100/109 không713, aura712/fallback/stop, sẵn sàng và trạng thái đang có, buff ngắn/hồi sinh/chống spam, migration cũ→bật và lựa chọn tắt mới, bot opt-out, passiveFX không nhân chỉ số.
- WS thật11phái trên2568/DBriêng: lệnh buff dù thanh phím trống, Thúy Yên đủ100/109, Nga My712+5aura, Côn Lôn173/178 chỉ làvisual. APIconfigure/login→runner/DB xác nhận mặc định bật và bỏ tick tắt cả buff/hào quang. Chromium thật1440/390: template mặc định check/lưu/nạpfalse/readonly, scenariofalse+marker/reload, không tràn ngang; game: hai FX Côn Lôn thực sự đổi frame, Nga My dừngAuto trả về tay86, Thúy Yên thanh trống vẫn buff, không713. Đã xem ảnh.
- Script/DB/ảnh riêng `/tmp/jx-auto-buffs/`, client5174/tool4578, không tác động DB/game thật. Chưa kiểm wrapper Desktop/Mobile hay điện thoại thật; ba nền tảng dùng chung luật và bộ vẽ.

## Tài liệu liên quan

- [Rao bán, kênh Mua bán và Kim nguyên bảo](rao-ban.md): tin gắn vật phẩm, tiêu chí bot rao và thanh toán.
- [Hướng dẫn bot](bots-guide.md), [thiết kế bot](bots.md): roster, template và kịch bản chạy.
