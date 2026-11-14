# Auto theo nhân vật và kênh Mua bán

## Auto

- **Z** hoặc nút AUTO trên thanh chức năng mở hộp thoại. **Chạy auto / Dừng auto** trong hộp thoại và nút **▶ / ❚❚ Auto** cạnh bảng tên bật/tắt.
- Mỗi nhân vật có `CharacterRecord.auto` gồm cài đặt và trạng thái bật. Server xác thực nhân vật từ kết nối, chuẩn hóa giá trị và lưu DB; không lấy ID nhân vật do client gửi.
- Cache `vltk.auto.character.<charId>` giúp hiện cài đặt nhanh. Khi vào bản đồ, bản server luôn đối chiếu và thay cache cũ. localStorage bị chặn/hỏng vẫn lấy được server. Không dùng cài đặt Auto toàn máy cho nhân vật khác.
- Reload/đăng nhập lại tự tiếp tục nếu lần trước bật. Đây là Auto trong phiên chơi, không chạy khi người chơi đã đóng game. Trong thành, nếu tắt tự đổi bãi thì chờ, không tự tắt trạng thái đã lưu.
- Bot lấy lựa chọn từ kịch bản, ghi cấu hình Auto đang chạy vào nhân vật; dừng runner ghi trạng thái tắt. Bot rao đồ đủ tiêu chí lên Mua bán dạng liên hệ; không tự định giá hay mua đồ.

## Mua bán

Hành trang → **Rao bán** → click vật phẩm → chọn **Ngân lượng**, **Kim nguyên bảo** hoặc **Liên hệ trực tiếp**. Hai loại tiền yêu cầu giá nguyên dương; liên hệ chỉ cần lời rao. Lệnh bài không rao được. Đăng tin không lấy món khỏi túi.

Kênh **Mua bán** nhận cả tin nhắn thường và tin gắn vật phẩm. Bấm tên món mở cửa sổ ảnh và thuộc tính của đúng món (các dòng đã roll), kèm người bán và giá. **Mua với giá…** thực hiện giao dịch ngay. Tin liên hệ không có nút mua. Chưa có đổi trang bị lấy trang bị.

Người bán phải trực tuyến. Server kiểm tra món còn trong túi và chưa đổi thuộc tính, người mua đủ tiền/chỗ trống, ví người bán chưa vượt giới hạn. Chuyển tiền và món đồng bộ, đánh dấu tin đã bán, lưu hai nhân vật; không có đoạn chờ giữa kiểm tra và chuyển. Tin trùng cùng một món không mua được lần hai. Nếu người bán đã bán NPC/mặc/vứt/sửa món, tin cũ chỉ còn preview và việc mua bị từ chối. Không khóa/giữ hộ món khi đăng rao, không bán offline.

Mua bán có lịch sử công khai trong giới hạn lịch sử chat chung; người đăng nhập sau vẫn thấy tin. Thế giới giữ lịch sử theo tài khoản như cũ. Ảnh/thuộc tính được chụp từ món trên server, không nhận snapshot do người rao tự gửi. Văn bản hiển thị bằng textContent.

## Tiền

- Kim nguyên bảo là số dư riêng theo nhân vật, hiện bên dưới ngân lượng trong hành trang.
- Kỳ Trân Các trong thành bán **1 Kim nguyên bảo = 100 vạn lượng**. Mỗi lần mua 1–99; không có đổi ngược.
- Cả hai số dư giới hạn 2 tỷ, kiểm tra ở server. Không cộng KNB cho tài khoản cũ; mặc định 0.
- Định dạng ngân lượng dùng chung cho hành trang, giá/tooltip/cửa hàng và tiền dưới đất: `12300 → 1 vạn 2300 lượng`, `10000 → 1 vạn lượng`, `10000000 → 1000 vạn lượng`, `100000000 → 10.000 vạn lượng`.

## Kiểm tra

`npm run test:market`, `npm run test:auto`, `npm run test:bots`, `npm run typecheck`, `npm run build`.

WebSocket và Chromium thử riêng trên 2568/5174, DB `/tmp/jx-market-auto/db.json`: lưu/khôi phục Auto, không lẫn nhân vật, cache lỗi, nhặt/tiền không hồi quy, mua lượng/KNB/chống mua trùng, ví, rao và preview desktop/390px. Không tác động DB/server game người dùng. Web/desktop wrapper dùng cùng localStorage; mới kiểm Chromium desktop và viewport mobile, chưa kiểm wrapper native/điện thoại thật.
