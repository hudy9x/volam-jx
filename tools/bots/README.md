# Công cụ bot độc lập

Chạy game bằng `npm run dev`, rồi mở công cụ ở một cửa sổ lệnh khác:

```bash
npm run bots:ui
```

Mở **http://localhost:4568/**. Đây là app riêng, không có Vite/HMR và không tải Phaser. Reload/sửa game không reload trang công cụ. Đóng hoặc tải lại tab công cụ không dừng bot; dừng app `bots:ui` sẽ dừng các bot app này quản lý.

## Chạy trực tiếp trên trang

1. Chọn tab **Tất cả**, **Online**, **Offline** hoặc **Chưa thiết lập** (tổng số ở cuối tên tab), rồi tích chọn các tên ở **Chọn nhân vật**. Checkbox đầu bảng chọn/bỏ chọn toàn bộ kết quả lọc trong tab hiện tại; lựa chọn ở tab khác được giữ.
   Có thể dùng **Chọn 10 / Chọn 20 / Chọn 30** hoặc nhập **Số lượng nhân vật** rồi bấm **Chọn** (Enter cũng được). Chọn các tên đầu tiên theo thứ tự bảng trong tab/bộ lọc hiện tại, thay lựa chọn trong kết quả lọc và giữ lựa chọn ngoài kết quả lọc. Nếu ít người hơn số yêu cầu, chọn tất cả số đang có và báo số thực tế. Số lượng phải là số nguyên dương.
2. Chọn **kịch bản** ở hàng thao tác ngay dưới bộ lọc.
3. Bấm **Chạy kịch bản**. Bot vào lần lượt; bảng chuyển từ Đang chuẩn bị/Chờ vào game sang Online theo kết nối thực, cột Kịch bản hiện tên đang chạy.
4. Tích chọn bot cần dừng và bấm **Dừng bot đã chọn**; những bot khác tiếp tục chạy. Bot chuyển Offline, vẫn giữ kịch bản.
5. Chọn lại bot rồi bấm **Chạy tiếp** để chạy theo kịch bản đã gán cho từng bot; có thể chọn bot thuộc nhiều kịch bản. Chọn kịch bản mới và **Chạy kịch bản** sẽ ghi đè kịch bản của các bot được chọn. Nếu đang chạy trong công cụ, bot được dừng và chờ Offline trước khi chạy bản mới.

Section **Kịch bản** phía trên danh sách nhân vật hiển thị tên, tổng bot được gán và trạng thái. **▶** chạy toàn bộ bot được gán; **❚❚** dừng các bot đang chạy của kịch bản đó. Kịch bản chưa có bot khóa nút chạy. Chạy/Dừng giữ dữ liệu nhân vật và không xóa file kịch bản.

Gán kịch bản lưu riêng tại `BOTS_DIR/.assignments.json`, tồn tại qua tải lại trang và khởi động lại công cụ. File này không phải mẫu kịch bản và không vào git. Các lượt đã dừng trước bản cập nhật chưa có dữ liệu gán: chọn và chạy kịch bản một lần để lưu. Xóa mẫu kịch bản vẫn giữ tham chiếu tên cũ ở bot; cần gán kịch bản khác trước khi chạy tiếp. Chạy tiếp dùng nội dung mới nhất của mẫu đã lưu, không lưu bản sao bất biến theo bot.

Bộ lọc **Thiết lập nhân vật** nằm cạnh **Nam và nữ**: chọn tên template đang được gán, thiết lập riêng có tên, **Tự cài đặt**, **Chưa thiết lập** hoặc **Tất cả thiết lập nhân vật**. Kết hợp với tab, phái, giới tính và tìm kiếm; checkbox đầu bảng và chọn nhanh chỉ tác động kết quả lọc. Refresh giữ bộ lọc đã chọn, kể cả khi không còn nhân vật khớp.

Giới tính hiện bằng ký hiệu ♂ màu vàng (Nam) / ♀ màu xanh dương (Nữ) sau tên, kèm nhãn truy cập; trạng thái kết nối dùng 🟢 Online / 🔴 Offline. Các trạng thái đang chuẩn bị/chờ/vào lại/dừng vẫn được phân biệt, không coi là Online trước khi API xác nhận kết nối.

**Lưu kịch bản** không yêu cầu chọn nhân vật: có thể lưu mẫu hoạt động trước với danh sách rỗng, rồi chọn nhân vật khi chạy. Không tự chạy sau khi lưu; nút sao chép lệnh CLI chỉ mở khi kịch bản đã có nhân vật.

Hai thao tác chọn/chạy kịch bản chỉ mở khi có nhân vật được tích chọn. Một nhân vật không chạy hai lượt đồng thời. Bảng cập nhật trạng thái khoảng mỗi giây.

## Xóa mẫu đã lưu

Chọn mẫu trong **Thiết lập đã lưu** hoặc **Kịch bản đã lưu**, rồi bấm **Xóa thiết lập** / **Xóa kịch bản** và xác nhận. Ở Tự cài đặt hoặc khi đang tải/lưu/xóa, nút xóa bị khóa. Xóa chỉ gỡ mẫu đã lưu; nhân vật, tiến trình và cấu hình đã áp dụng cho bot được giữ nguyên. Form chuyển về Tự cài đặt với thông số đang xem; xóa kịch bản cũng gỡ khỏi ô Chọn kịch bản và bỏ lệnh sao chép cũ.

Nếu một kịch bản đã lưu còn dùng mẫu nhân vật để khởi tạo (`initialSetup`), tool báo tên kịch bản và giữ mẫu; hãy đổi hoặc xóa kịch bản liên quan trước. Kịch bản đang chạy/chuẩn bị chạy do tool quản lý cần dừng các bot của lượt chạy đó trước khi xóa. Tool không tự dừng bot để xóa mẫu. Có thể xóa cả mẫu có sẵn theo cùng quy tắc.

## Mẫu có sẵn

- `data/templates/cap-40-69.json`
- `data/templates/cap-70-90.json`
- `data/templates/cap-110-150.json`
- `data/luyen-cong-30.json`: 30 tên đầu roster, 10 tên mỗi dải cấp; luyện công + chat + rao bán, tự nhận lời mời tổ đội, vào 3 bot/giây, chạy liên tục.

Ở mục Kịch bản chạy, chọn mẫu **30 bot luyện công, chat và rao bán** để chọn sẵn đúng 30 tên. Sau đó chọn mẫu đó tại hàng thao tác của bảng và bấm Chạy kịch bản.

Lần chạy đầu, mẫu 30 bot tự khởi tạo tài khoản còn thiếu theo ba template. Nhân vật đã tồn tại giữ nguyên tiến trình; muốn đổi cấp/đồ của họ thì dùng **Cập nhật thiết lập**. Các tên ngoài nhóm preset cần được thiết lập trước khi chạy.

Cũng có thể chạy bằng lệnh:

```bash
npm run bots -- luyen-cong-30
```

Dừng lệnh bằng Ctrl+C. Lượt chạy từ terminal chạy riêng; bảng vẫn thấy trạng thái online từ game, nhưng nút Dừng chỉ điều khiển những lượt được mở bằng app.

## Quay lại bãi luyện công — USER 2026-11-17

Kịch bản có hai checkbox độc lập: **Tự đổi bãi luyện công theo cấp** và **Tự quay lại bãi luyện công trước đó**. Tùy chọn quay lại mặc định bật cho mẫu cũ thiếu trường; bỏ tick rồi lưu sẽ giữ tắt. Bật cả hai thì từ thành ưu tiên quay lại, tăng cấp tại bãi vẫn xét đổi bãi. Tắt cả hai thì bot chờ trong thành.

Thổ Địa Phù, Auto về tiếp tế và hồi sinh lưu điểm rời bãi trên server. Bot quay lại đúng map/tọa độ đó, giữ qua dừng/chạy tiếp và đăng nhập lại. Bot đang ở thành chưa có điểm nhớ sẽ chọn một bãi hợp lệ trong danh sách thiết lập để bắt đầu; từ lần về thành tiếp theo có điểm chính xác. Map đã lưu không còn hợp lệ hoặc ngoài danh sách bot thì báo lỗi, không âm thầm quay về cửa map khác. Xa phu trong game dùng cùng điểm nhớ.

**Tự hồi sinh** chỉ quyết định hồi sinh, không tự bật hai lựa chọn đi bãi. Muốn áp dụng cho bot đang chạy cần lưu mẫu nếu đã chỉnh, dừng/chạy tiếp runner bằng mã mới; không cần cập nhật lại cấp/trang bị hoặc tạo lại bot. Xem [Auto](../../docs/auto.md).

## Bản đồ và mua thuốc

Bản đồ xuất hiện có ba lựa chọn: **Bãi luyện công**, **Thành thị**, **Bãi luyện công + Thành thị**. Mặc định chọn cả hai và toàn bộ bản đồ đã sinh; chọn lại danh sách trong Nâng cao. Đây là chỗ xuất hiện ban đầu, không chặn Auto về thành mua thuốc rồi quay lại bãi.

## Vị trí mã và cấu hình

```text
server.ts / ConfigStore.ts / RunManager.ts  HTTP riêng, cấu hình, tiến trình bot
ui/                                      giao diện và bộ chọn bản đồ
run.ts / runner/                         chạy bot bằng lệnh hoặc từ trang
 data/templates/                         template nhân vật
 data/*.json                             kịch bản
```

Luật/dữ liệu chung vẫn ở `packages/shared/src/bots`; API tác động thế giới game ở `apps/server/src/dev/botAdmin.ts`. App dùng lại bộ dialog của game, nhưng đóng gói một lần khi khởi động nên sửa game không làm trang tự reload.

- `BOTS_UI_PORT`: đổi cổng công cụ (mặc định4568).
- `GAME_SERVER_URL`: máy chủ game (mặc định `http://localhost:2567`); cũng có thể dùng `?server=http://host:port`.
- `BOTS_DIR`: đổi thư mục cấu hình cho cả app và runner; mặc định `tools/bots/data`.
- `npm run test:bots`: kiểm tra roster, hoạt động xã hội, preset và config store.

Công cụ phục vụ trên loopback cùng máy. Khi sửa mã công cụ, dừng rồi chạy lại `bots:ui` để nạp bản mới. Không cần dừng khi chỉ sửa/lưu các template.

## Rao bán tự định giá

Bật **Rao bán đồ** trong kịch bản: chỉ đồ xanh/hoàng kim vừa nhặt đạt tiêu chí mới được đăng kênh **Mua bán**, có giá và nút mua ngay cho người khác. Giá được server tính; bot không tự mua. Giữ giới hạn60giây/bot và5giây/runner, không rao đồ có sẵn khi vào game.

Chỉnh tiêu chí, trọng số, tổ hợp, giá nền/sàn/trần và giá riêng từng món tại `packages/shared/src/formulas/data/market-pricing.json`, sau đó khởi động lại server/runner (và app tool nếu cần cập nhật mô tả). Hiện dùng giá khởi điểm cấu hình, chưa tự tăng/giảm theo cung cầu hoặc tuổi tin. Lịch sử giao dịch thành công được lưu riêng để nghiên cứu giá sau này. Cách tính, ý nghĩa các khóa và giới hạn: [Rao bán](../../docs/rao-ban.md#định-giá-bot-theo-cấu-hình-2026-11-14).

Luật giá dùng chung Web/Desktop/Mobile; runner/tool vẫn là app Node trên máy cục bộ. Đã thử Chromium desktop/viewport390px, chưa kiểm ứng dụng native hay điện thoại thật.

## Tổ đội khi luyện công

Chọn một radio: **Chủ động mời người khác**, **Tự chấp nhận lời mời** (mặc định), hoặc **Tắt tự động tổ đội**. Hai chế độ mời/nhận không thể cùng bật. Chọn template vẫn chỉ đọc; chọn Tự cài đặt để sửa rồi lưu kịch bản. Tắt Luyện công thì không gửi lời mời/nhận.

Bot mời người chơi sống, chưa có đội trong cùng bản đồ, ưu tiên gần; chỉ mời khi chưa có đội hoặc là đội trưởng còn chỗ. Giãn5giây/bot,60giây/tên và giữ chỗ cho lời mời chờ đến hết hạn. Không mời quái/NPC/bản thân, không giành người đã có đội. File cũ thiếu `autoInviteTeam` giữ chế độ nhận cũ; file bật cả hai được chuẩn hóa ưu tiên mời. Giá rao mới của bot/người chơi chỉ bằng lượng/KNB, không còn Liên hệ; tin liên hệ cũ chỉ xem snapshot và phải đăng lại để mua.

Kiểm thử mới: `test:bots` có `bot-team.test.ts` kiểm loại trừ/migration, chọn mục tiêu/cooldown/quyền đội trưởng/chỗ trống và nối protocol; WS thật với2bot +1người chơi trên server2568/DBriêng xác nhận mời→nhận→mời thêm người. UI desktop1440/390 kiểm radio, lưu/nạp/readonly và bàn phím. Chưa điện thoại/native thật.

## Ưu tiên mục tiêu khi luyện công

Dùng chung AutoPlay với Auto trong game: **Hoàng Kim → Boss Xanh → Quái thường**, **Boss Xanh → Quái thường** (bỏ Hoàng Kim), hoặc **Gần nhất**. Chọn quái trong600px isometric quanh bot trước, rồi mới xếp bậc và khoảng cách trong vùng; không còn quái gần mới đi tìm xa. Đang đi được dừng đánh quái mới gặp. Khi server xác nhận đã bắt đầu đòn đánh thì giữ tới chết/mất/không hợp lệ ở cả3chếđộ; không đổi vì boss mới, HPkhônggiảm6giây, buff/debuff hay tiền rơi. Chỉ đích chưa giao chiến thật sự không tiến ngoài tầm hơn6giây mới bị tạm bỏ; thiếu nội lực/hồi chiêu/thi triển/choáng không tính kẹt. Nhặt giữa lượt hạ mục tiêu. Bỏ qua boss vẫn loại mọi boss. Có cơ chế chống kẹt/không gây sát thương như [tài liệu Auto](../../docs/auto.md), không thay công thức chiến đấu.

Cấu hình mới `auto.autoPriority: "blue"` được chuẩn hóa/lưu ở cả kịch bản bot và Auto theo nhân vật. Sau khi sửa, restart tool và dừng/chạy lại runner để nạp mã; không tự ghi đè lựa chọn trong các kịch bản cũ. Đã kiểm WS thật trên mục tiêu kiểm soát + Chromium1440/390, chưa cân bằng chiến đấu hay native/mobile thật.


## Tự động buff

Thiết lập nhân vật có **Tự động buff kỹ năng đã học và duy trì hào quang**, mặc định bật. Thiết lập cũ mặc định bật; kịch bản cũ từng tắt cũng chuyển sang bật theo yêu cầu USER2026-11-14. Không cần reset nhân vật cũ chỉ để nhận mặc định này.

Bỏ tick rồi **Cập nhật thiết lập** để áp dụng cho nhân vật đã chọn; **Lưu Thiết lập** chỉ lưu mẫu. Kịch bản mới lưu quyết định tắt bằng `buffVersion:1`; reload/chạy lại không tự bật ngược. Thiết lập nhân vật hoặc kịch bản mới chủ động tắt thì bot không tự buff và không tự chọn hào quang.

Auto lấy toàn bộ kỹ năng đã học, không phụ thuộc thanh phím hay giới hạn2buff. Bỏ Ngự Tuyết Ẩn, Nga My ưu tiên Bế Nguyệt Phất Trần; kiểm sẵn sàng và duy trì trạng thái/hào quang. Chi tiết/phạm vi đã kiểm ở [Auto](../../docs/auto.md#tự-buff-toàn-bộ-kỹ-năng-đã-học--user-2026-11-14). Sau cập nhật mã cần restart tool/runner/server và reload game; không tự dừng runner thật để nạp mã.

USER2026-11-16: thiết lập nhân vật bật tự buff còn được bổ sung **học buff/hào quang cơ bản theo cấp**, kể cả bot cũ không còn điểm dư. Server chỉ thêm/nâng buff thường đến cấp hợp lệ, không phân lại điểm hoặc reset cấp/EXP/trang bị/túi/tiền/thục luyện/chiêu tấn công; không tự mở tầng bí kíp90/120/150. Cập nhật và lưu khi bot vào map bằng server mới, kiểm lại khi tăng cấp/đổi phái. Tắt tự buff không xóa các chiêu đã học.

Khi đánh, bot tự xuống ngựa nếu chiêu phái ưu tiên yêu cầu đi bộ và có quái trong600px; chờ server xác nhận rồi mới dùng chiêu90/150 đã học. Buff cần đi bộ cũng có thể khiến bot xuống ngựa. Giữ cưỡi khi chiêu cho phép; không tự lên lại liên tục. Chỉ xoay chiêu phái khi có chiêu dùng được, không xen các đòn Công kích vật lý common. Trong lúc chờ xuống ngựa vẫn xử lý thuốc/hồi sinh/về thành theo Auto.
