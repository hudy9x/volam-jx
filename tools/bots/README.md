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
4. Tích chọn bot cần dừng và bấm **Dừng bot đã chọn**; những bot khác tiếp tục chạy.

Bộ lọc **Thiết lập nhân vật** nằm cạnh **Nam và nữ**: chọn tên template đang được gán, thiết lập riêng có tên, **Tự cài đặt**, **Chưa thiết lập** hoặc **Tất cả thiết lập nhân vật**. Kết hợp với tab, phái, giới tính và tìm kiếm; checkbox đầu bảng và chọn nhanh chỉ tác động kết quả lọc. Refresh giữ bộ lọc đã chọn, kể cả khi không còn nhân vật khớp.

Giới tính hiện bằng ký hiệu ♂ màu vàng (Nam) / ♀ màu xanh dương (Nữ) sau tên, kèm nhãn truy cập; trạng thái kết nối dùng 🟢 Online / 🔴 Offline. Các trạng thái đang chuẩn bị/chờ/vào lại/dừng vẫn được phân biệt, không coi là Online trước khi API xác nhận kết nối.

**Lưu kịch bản** không yêu cầu chọn nhân vật: có thể lưu mẫu hoạt động trước với danh sách rỗng, rồi chọn nhân vật khi chạy. Không tự chạy sau khi lưu; nút sao chép lệnh CLI chỉ mở khi kịch bản đã có nhân vật.

Hai thao tác chọn/chạy kịch bản chỉ mở khi có nhân vật được tích chọn. Một nhân vật không chạy hai lượt đồng thời. Bảng cập nhật trạng thái khoảng mỗi giây.

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
