# Hướng dẫn dùng bot

Bot là tài khoản thật vào game như người chơi. Bạn soạn trên trang độc lập `http://localhost:4568/` rồi chạy bằng một lệnh. Thiết kế và mã nguồn ở
[`bots.md`](bots.md).

```
1. Chọn nhân vật → tìm tên / lọc phái, giới / tích chọn
2. Thiết lập     → chọn template hoặc tự cài đặt → Cập nhật thiết lập
3. Kịch bản      → chọn hoạt động → Lưu → Sao chép lệnh
   npm run bots -- <tên kịch bản>      (Ctrl+C để dừng)
```

## 0. Chuẩn bị

- Chạy game bằng `npm run dev`, mở cửa sổ lệnh khác chạy `npm run bots:ui`, rồi mở `http://localhost:4568/`. Trang công cụ không cần đăng nhập và không reload theo game.
- Server phải bật `DEV_TOOLS`. Mặc định là bật; `DEV_TOOLS=0` thì tắt.
- API bot chỉ nhận yêu cầu từ chính máy chạy server, và chỉ đụng tới tài khoản bot.
- Server khác `:2567` thì thêm `&server=http://host:port` vào địa chỉ.

## 1. Chọn nhân vật

Có sẵn **200 danh tính** trong `packages/shared/src/bots/roster.ts`: tên, giới tính và môn phái cố định; ngũ hành theo phái.
Danh sách này hiện cả người chưa tạo tài khoản. Tên không đổi theo mỗi lần chạy hoặc áp mẫu.

- Tìm tên có hoặc không dấu; lọc phái, giới tính, trạng thái.
- **Chọn kết quả lọc** chọn/bỏ chọn toàn bộ kết quả, kể cả các dòng đang nằm ngoài vùng cuộn.
- **Bỏ chọn** xóa lựa chọn. Bảng cập nhật trạng thái mỗi 5 giây và giữ lựa chọn.
- Bot cũ vẫn được hiển thị, không tự xóa hay đổi tên. Kịch bản cũ chọn bằng tiền tố/số lượng vẫn chạy được.

## 2. Thiết lập nhân vật

Chọn những tên cần dùng ở mục 1, sau đó chọn **Thiết lập đã lưu**:

- **Tự cài đặt**: chỉnh các thông số. Khi chuyển từ template sang Tự cài đặt, giữ các giá trị đang xem để chỉnh tiếp (template cũ được đưa về dải cấp/trang bị được hỗ trợ).
- **Danh sách template thiết lập**: chọn tên là tải ngay, không cần nút Nạp. Toàn bộ thông số được khóa để xem lại; vẫn có thể bấm Cập nhật thiết lập để dùng template đó.

Hai nút cùng một hàng, khác tác dụng:

- **Cập nhật thiết lập**: áp dụng cho tất cả tên đã chọn, tự khởi tạo tài khoản còn thiếu. Nhân vật đã có sẽ đặt lại cấp, đồ, điểm, tiền và kỹ năng; giữ tên/giới/phái/ID nhân vật. Bot online được bỏ qua. Bảng mục 1 cập nhật cấp, trang bị, ngựa, bản đồ và tên thiết lập ngay; trạng thái Chờ áp mẫu cho biết cấu hình sẽ hoàn tất khi bot vào game.
- **Lưu Thiết lập**: mở hộp nhập tên template (bắt buộc), chỉ lưu để dùng lại, **không áp dụng** cho nhân vật. Tên tiếng Việt được giữ để hiển thị; tên file tự chuyển sang chữ không dấu. Trùng tên file thì hỏi trước khi ghi đè.

| Ô | Ý nghĩa |
|---|---|
| Cấp | Chỉ ba dải **40–69**, **70–90**, **110–150**; mỗi bot nhận cấp ngẫu nhiên trong dải |
| Trang bị | **Đồ xanh** hoặc **Hoàng kim môn phái**; vũ khí xanh của bot bắt buộc hai dòng luôn bật hút Sinh lực10% và Nội lực10% (max toàn bảng, ngoại lệ theo USER cho bot kể cả vũ khí cấp thấp). Món thiếu điều kiện mặc nằm trong túi |
| Ngựa | Tự chọn ngẫu nhiên trong số đủ cấp cưỡi. Từ cấp110 chỉ chọn nhóm có tốc độ không thấp hơn ngựa mạnh nhất đủ cấp quá10điểm tốc (CHỌN) |
| Bản đồ xuất hiện | **Bãi luyện công**, **Thành thị** hoặc **Bãi luyện công + Thành thị** (mặc định); đổi nhóm chọn tất cả bản đồ đã sinh trong nhóm |
| Kỹ năng | Mặc định tự học90/120/150; chỉ học các chiêu đủ cấp và không vượt trần học ở cấp hiện tại |
| Nâng cao | ID đăng nhập của các tên đã chọn, mật khẩu chung, ID bản đồ, bán kính rải, điểm, tiền và thuốc |

**Chọn bản đồ…** trong **Cài đặt thiết lập nâng cao**, cạnh danh sách ID bản đồ, mở hộp chọn có danh sách cuộn, tìm kiếm, chọn tất cả/bỏ chọn, ảnh minimap xem trước. **OK** cập nhật ID bản đồ vào form; **Hủy/Esc** bỏ thay đổi. Cần chọn ít nhất một bản đồ; bot được rải vào đúng danh sách này.

Thuốc mặc định ở cả hai mục là **Ngũ Hoa Ngọc Lộ Hoàn** (`potion-2-5`), hồi5000Sinh lực và5000Nội lực mỗi bình. Mỗi mục50bình, cùng loại được cộng thành100bình trong hành trang. Select ưu tiên nhóm hồi cả hai chỉ số, vẫn có nhóm thuốc hồi riêng.

ID đăng nhập cố định `botfixed_001`…`botfixed_200`. Mật khẩu mặc định `botpass`, đổi trong Nâng cao khi Tự cài đặt; chỉ dùng cho tài khoản chưa được khởi tạo, cập nhật không đổi mật khẩu tài khoản có sẵn. Không có tùy chọn Càn Khôn Giới Chỉ trong form mới.

Tên bị tài khoản/nhân vật khác sử dụng sẽ báo lỗi, không tự đổi tên. Nút Xóa ở mục 1 chỉ xóa tài khoản; danh tính vẫn nằm trong roster để thiết lập lại. Template cũ vẫn xem được, nhưng cấp/trang bị không thuộc lựa chọn mới cần chuyển Tự cài đặt và chọn lại trước khi cập nhật.

## 3. Kịch bản chạy

Giống form nhân vật: chọn **Tự cài đặt** để chỉnh, hoặc chọn **template kịch bản** để tự tải và xem ở chế độ chỉ đọc. Bỏ ô tên/mã, Nạp, thời lượng và seed khỏi form. Bấm **Lưu kịch bản**, nhập tên bắt buộc; trang hiện lệnh có nút Sao chép. Chọn template cũng hiện lệnh đã lưu; đổi tên nhân vật đã chọn hoặc chuyển về Tự cài đặt thì phải lưu lại để chạy đúng cấu hình.

**Luôn chạy liên tục đến khi Ctrl+C**; không có giới hạn thời lượng, kể cả file cũ có duration. Khi mất kết nối, bot tự vào lại nếu bật tùy chọn tương ứng.

Ba hoạt động có thể bật cùng lúc:

| Hoạt động | Cách hoạt động |
|---|---|
| Luyện công | Auto đánh quái, dùng thuốc, nhặt đồ, hồi sinh/mua thuốc/đổi bãi theo tùy chọn; mặc định bật |
| Chat | Chỉ báo món đáng chú ý vừa nhặt trên kênh Thế giới; không chat ngẫu nhiên |
| Rao bán đồ | Chỉ rao món đáng chú ý vừa nhặt, trên Thế giới. Bật cả Chat và Rao bán thì chỉ gửi một tin rao |

Luyện công có **Tự đồng ý lời mời gia nhập tổ đội** (mặc định bật). Bot chỉ nhận lời mời thật qua giao thức tổ đội; server vẫn kiểm đội trưởng, giới hạn thành viên và hạn lời mời. Tắt tùy chọn hoặc tắt Luyện công thì không tự nhận.

Món đáng chú ý là trang bị **hơn5dòng thuộc tính có giá trị** (từ6), **hoặc** có dòng ẩn hiếm/lớn. Ngưỡng CHỌN hiện tại: hiếm khi trọng số dòng phù hợp trong dữ liệu ≤1200; lớn khi giá trị đạt≥90%max toàn bảng (hoàng kim theo dòng cố định của món). Các ngưỡng tập trung tại `bots/social.ts BOT_TRADE_RULES`.

Chỉ sự kiện **nhặt từ đất thành công** mới được xét: không rao hành trang ban đầu, đồ mua/chế tạo hoặc khi vào lại bản đồ. Không lặp cùng UID; món đã rời hành trang trước lúc phát tin bị bỏ qua. Tối đa1tin/bot/phút và toàn runner cách nhau≥5giây; hàng đợi có giới hạn. Đây là tin rao, chưa tự giao dịch hay định giá.

Trong **Cài đặt kịch bản nâng cao**:

- **Tốc độ vào game**: chỉ3/4/5bot mỗi giây, mặc định3; bot vào từng người giãn đều (khoảng333/250/200ms).
- **Địa chỉ máy chủ game**: giữ mặc định nếu chạy cùng máy.
- **Ghi chú**: mô tả để bạn nhận biết, không tác động bot.
- **Tự vào lại khi mất kết nối**: mặc định bật; Ctrl+C dừng hẳn, không tự vào lại.

## 4. Chạy

**Chạy trên trang:** tích chọn các tên ở mục1 → chọn kịch bản tại hàng thao tác của bảng → Chạy kịch bản. Cột Trạng thái chuyển Online khi bot kết nối, cột Kịch bản hiện tên đang chạy. Dừng bot đã chọn không dừng những người khác.

Mẫu sẵn: ba template cấp40–69/70–90/110–150; kịch bản `luyen-cong-30` chọn30tên, mỗi dải10. Mẫu tự khởi tạo tài khoản thiếu, giữ nguyên nhân vật đã có, chạy liên tục3bot/giây. [Chi tiết công cụ](../tools/bots/README.md).


```bash
npm run bots -- huong-dan                                   # theo bots/huong-dan.json
npm run bots -- huong-dan --server http://localhost:2568    # đổi server, không sửa file
npm run bots -- 4 60                                        # chế độ cũ: 4 bot, 60 giây, thử nhanh
```

Cứ 10 giây, lệnh in một dòng trạng thái. Ví dụ thật (12 bot):

```
[bots] kịch bản "huong-dan" · http://localhost:2569 · 12 bot · chạy liên tục, dừng bằng Ctrl+C
[bots 17:04:18] online 12/12 · bản đồ 37:3 151:3 8:2 150:2 224:1 130:1 · lệnh/s 8 · chết 2 · đổi bản đồ 7 · vào lại 0 · lỗi 0
```

`bản đồ 37:3` nghĩa là 3 bot đang ở bản đồ 37. "Đổi bản đồ" tăng khi bot về thành mua thuốc / hồi sinh rồi quay lại bãi luyện.

## 5. Lưu ý

- **Giới hạn bản đồ:** "Danh sách bản đồ" ở mục 1 chỉ quyết định **chỗ xuất hiện**.
  - Luyện quái (khi bật "Tự đổi bãi luyện công theo cấp") vẫn tự đi bãi luyện công theo cấp.
  - Chết thì hồi sinh về thành.
  - Chưa có ô "chỉ hoạt động ở các bản đồ…" trong kịch bản; ô này mới là đề xuất.
- Bot chưa tự cộng điểm khi lên cấp, chưa mặc đồ nhặt được, chưa có hành vi tổ đội / chat (BACKLOG BT8).
- Số đo hiệu năng server (tick, CPU, RAM, băng thông) là **phần 2**, chưa làm (`bots.md` §3).
- Sửa tay file JSON cũng được: trường thiếu hoặc sai sẽ lấy giá trị mặc định.


Giao diện co giãn cho web, cửa sổ desktop và màn hình mobile (bảng cuộn ngang). Runner vẫn chạy trên máy Node.js; trang dev mặc định chỉ truy cập API từ cùng máy, không tự mở truy cập LAN cho điện thoại. Chưa kiểm thử wrapper native.
