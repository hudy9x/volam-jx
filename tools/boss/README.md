# Quản lý Boss Hoàng Kim

Mở trong Map Manager bằng `npm run map:manager` → http://localhost:4570/boss/ (cùng server, không cần chạy tool Boss riêng). Vẫn có thể chạy `npm run boss`, mở http://localhost:4567. Tool độc lập với game, không dùng Vite/HMR hay nạp Phaser. Dừng bằng Ctrl+C; đóng tab không dừng server tool. Không có tác vụ nền tạo Boss trong tool: game server quản lý việc xuất hiện.

## Thao tác

1. Tìm tên Boss hoặc lọc loại/phái. Checkbox cạnh tên là **bật xuất hiện**; checkbox **Chọn Boss** là lựa chọn để cài đặt chung, độc lập bật/tắt. Chỉnh cấp ngay tại dòng; mở danh sách món đã gắn khi cần xem chi tiết.
2. **Chọn vật phẩm rơi**: tìm/lọc trang bị, chọn từng món hoặc chọn các món chưa gắn trong kết quả đang hiển thị. Mỗi món chỉ thuộc một Boss. **Xác nhận lựa chọn** cập nhật bản nháp; Hủy/Esc bỏ thay đổi trong dialog.
3. **Chọn vị trí**: chọn tên bản đồ, chạm ảnh hoặc nhập X/Y (pixel). Xác nhận kiểm tra và đưa điểm về vùng đi được bằng API hiện có. Hủy/Esc giữ vị trí cũ.
4. Phần **Lịch xuất hiện và vật phẩm rơi** nằm sau danh sách. Chỉ hiện thông số của chế độ đang chọn. Tổng ba tỉ lệ không vượt 100%; phần còn lại là không rơi món. Số lần quay không phải số món chắc chắn nhận.
5. **Lưu thiết lập** ghi `packages/shared/src/bosses/config.json` và `config.ts`, không tự gọi API cập nhật game. **Áp dụng vào game** gửi bản đã lưu sang server dev, chỉ báo thành công khi server nhận. Nếu còn sửa chưa lưu, cần lưu hoặc khôi phục trước khi áp dụng.

Game dev có thể tự reload do watcher khi file mã nguồn thay đổi; thao tác Lưu không bảo đảm game đang chạy giữ cấu hình cũ. Nút Áp dụng là yêu cầu cập nhật trực tiếp, không phải cơ chế cô lập bản nháp với watcher của game. Bản nháp trong tab chưa lưu thì chưa ghi file.

**Khôi phục bản đã lưu** bỏ toàn bộ chỉnh sửa trong tab từ lần lưu gần nhất. Nếu rời tab khi có bản nháp chưa lưu, trình duyệt cảnh báo. Lỗi lưu/áp dụng giữ dữ liệu để sửa hoặc thử lại.

## Cấu hình chạy

- `BOSS_PORT=4567`: cổng tool, chỉ nghe `127.0.0.1`, không mở LAN.
- `GAME_SERVER_URL=http://localhost:2567`: server dev nhận cập nhật (cần bật dev tools và có route `/api/dev/bosses/reload`). Route này đồng bộ định nghĩa Boss và dựng lại các điểm xuất hiện ở những bản đồ đang hoạt động.
- Asset đọc từ thư mục game hiện có, có phiên bản từ manifest; không sao chép asset hay công thức. Ảnh Boss nhỏ hiện có trong `public/bosses/` được giữ nguyên.
- Dialog bundle lại `apps/client/src/ui/kit/dialog.ts` bằng esbuild khi khởi động tool; sửa adapter dialog cần khởi động lại tool, không ảnh hưởng HMR game.

Giao diện theo [guideline chung](../../docs/tools-ui-ux-guidelines.md), hỗ trợ trình duyệt desktop và viewport cảm ứng. Desktop app có thể mở địa chỉ local trong trình duyệt; chưa đóng gói app riêng. Điện thoại thật không truy cập được server chỉ nghe loopback trên máy tính; không có bản native mobile và không tự mở LAN.

- `BOSS_CONFIG_DIR`: thư mục config.json/config.ts riêng khi kiểm thử, mặc định nguồn shared. Trang trong Manager dùng chung nav/registry map, kể cả map tự dựng; không nhân đôi loader hoặc cấu hình. Không mở nhiều phiên cùng lưu cấu hình Boss.

## Kháng của Boss

Mở **Kháng** tại dòng Boss. **Theo dữ liệu SHXT** mặc định tính năm kháng gốc theo cấp; **Tự cài đặt** dùng năm giá trị cố định, trần từng loại nằm trong Nâng cao. Kháng gốc cho phép −1000..1000, trần 0..95; kháng gốc vượt95 vẫn hợp lệ. Chỉ số này chưa tính bùa, xuyên kháng và ngũ hành của đòn đánh. NPC chưa có dữ liệu nguồn hiển thị cảnh báo và tạm dùng25/trần75.

Lưu và Áp dụng giữ hai bước hiện có. Bản xem trước dùng cùng module công thức với server. Game cần restart khi cài mã mới; sau đó Áp dụng nạp cấu hình qua đường reloadBoss hiện có. NPC đang dùng chung định nghĩa không bị sửa khi quái khác hóa Xanh.

Dữ liệu `packages/shared/src/bosses/resistance-data.json` do `apps/client/tools/gen-boss-resists.ts` sinh từ PAK thắng SHXT, không sửa tay. Sinh lại bằng `JX_CLIENT=/đường/dẫn/Client_VLTK_SHXT node --import tsx apps/client/tools/gen-boss-resists.ts` tại gốc repo, không sinh lại sprite.

## HP, kinh nghiệm (EXP), nhịp đánh và phạm vi hoạt động

Mở **HP · EXP · Tốc độ đánh · Sát thương · Phạm vi** tại cột Kỹ năng của từng boss. HP riêng để trống giữ công thức theo cấp; nhập số nguyên 1–2.000.000.000 để cố định HP, độc lập cấp. **Kinh nghiệm khi hạ gục (EXP)** mặc định **4.000.000** cho mỗi Boss Hoàng Kim khi để trống; nhập số nguyên 0–2.000.000.000 để đặt riêng (khi người chơi dùng Tiên Thảo Lộ, EXP nhận được nhân đôi theo hệ số `EXP_ELIXIR`, giữ nguyên luật chia tổ đội/sát thương). Trong **Cài đặt cho Boss đã chọn**, có thể chọn **Giữ từng Boss**, **Đặt EXP chung** hoặc **Mặc định (4.000.000)** để cập nhật hàng loạt mà vẫn chỉnh riêng được ở từng dòng. Khoảng cách đòn 0,05–60 giây (mặc định 1,2): nhỏ hơn đánh nhanh hơn. Khi nhập riêng, chu kỳ này điều khiển cả động tác và thời điểm tung chiêu, vẫn giữ hồi chiêu riêng của kỹ năng; bùa tốc độ/băng áp dụng qua hệ số tốc độ chung. Khi chưa có giá trị riêng, giữ thời lượng kỹ năng cũ. Phạm vi 50–10.000 đơn vị isometric (mặc định 1.100) tính từ điểm xuất hiện, không phải khoảng cách boss–người chơi. Boss hoặc mục tiêu ra ngoài thì bỏ đuổi, quay về điểm xuất hiện; không nhận mục tiêu mới trong lúc quay về. Boss Xanh giữ hành vi cũ.

Lưu thiết lập rồi Áp dụng vào game theo luồng hiện có. Công cụ yêu cầu server xác nhận HP/chu kỳ/phạm vi thực nhận; server cũ hoặc trả thông số khác sẽ báo lỗi cần khởi động lại. Dòng trạng thái hiển thị HP và chu kỳ nền của tối đa ba boss đã chỉnh riêng. Boss sinh lại theo lịch, không cập nhật lên bản sao đang đánh trước đó. Lần cài mã này cần restart server game và tải lại trang tool (khởi động lại tool để cập nhật phần shared); sau đó mới áp dụng cấu hình. Luật chạy ở server chung cho Web/Desktop/Mobile; giao diện được kiểm tra trên trình duyệt desktop và viewport cảm ứng, chưa kiểm native.

## Chọn nhiều Boss để cài HP và tốc độ chung

- Tích **Chọn Boss** ở từng dòng, checkbox tại đầu nhóm môn phái để chọn các boss của phái đang hiển thị, hoặc **Chọn kết quả lọc**. Checkbox nhóm có trạng thái chọn một phần. Đổi bộ lọc giữ lựa chọn cũ; bộ đếm nêu rõ số đang hiển thị/đang ẩn. Bỏ chọn tất cả xóa toàn bộ lựa chọn. Chọn boss không bật/tắt xuất hiện và không tạo thay đổi cấu hình.
- Trong **Cài đặt cho Boss đã chọn**, chọn **Đặt HP chung** và/hoặc **Đặt khoảng cách đòn chung**, nhập giá trị rồi **Cập nhật Boss đã chọn**. Chế độ **Giữ từng Boss** giữ nguyên thông số riêng; HP có thêm **Theo cấp từng Boss** để xóa HP cố định của nhóm đã chọn. Chỉ cập nhật toàn bộ boss đã tích, kể cả các boss bị bộ lọc ẩn.
- Cập nhật nhóm chỉ chép giá trị vào bản nháp, không tạo liên kết ràng buộc: vẫn sửa từng boss độc lập, bao gồm sau khi cập nhật nhóm. Boss không được chọn giữ nguyên mọi cấu hình. Bấm **Lưu thiết lập → Áp dụng vào game** theo luồng cũ. Lựa chọn chỉ tồn tại trong tab, không lưu vào file hoặc game; tải lại trang cần chọn lại.

## Cài kỹ năng và chiêu 150

- **Chọn kỹ năng** tại từng boss mở bộ chọn có tên/icon, lọc môn phái/cấp học150 và tìm theo tên hoặc mã. Tích chiêu, nhập **cấp luyện** trong giới hạn của chiêu rồi Xác nhận. Hủy/Esc giữ nguyên; các chiêu bị động/hỗ trợ cũ được giữ trong danh sách, có ghi chú AI chỉ chủ động dùng chiêu tấn công. Bộ chọn mới chỉ cho thêm các chiêu tấn công trực tiếp từ danh sách học của phái, chiêu chung hoặc quái, không tự thêm chiêu con nội bộ.
- Khi chọn nhiều boss: **Chọn kỹ năng chung cho nhóm** thay danh sách của mọi boss đã tích bằng cùng danh sách đã xác nhận; **Thêm chiêu 150 theo phái cho nhóm** giữ chiêu đã có và thêm các chiêu150 của đúng phái mỗi boss, không trùng. Chiêu mới có cấp luyện20 hoặc tối đa hợp lệ nếu thấp hơn20; chiêu đã có giữ cấp. Boss không có bộ chiêu150 theo phái được bỏ qua và báo số lượng. Sau cập nhật nhóm vẫn sửa riêng từng boss.
- Cấu hình cũ hiện chưa có chiêu150: AI không tự học hoặc tự thay thế chiêu. AI chọn ngẫu nhiên chiêu tấn công dùng được, ưu tiên chiêu đã đủ tầm, giữ hồi chiêu. Muốn chỉ dùng chiêu150 thì bỏ các chiêu tấn công cũ trong bộ chọn. Boss dùng chung SkillEngine với người chơi, không có luật cấp học/vũ khí riêng để chặn chiêu150.
- Danh sách sửa qua editor hoặc nút thêm150 lưu `skillLevelsFixed:true`: server dùng đúng cấp luyện đã chọn, không tăng theo cấp boss. Config cũ chưa chỉnh giữ cách scale cũ để không tự đổi các boss khác. Tối đa32chiêu/boss, ít nhất1chiêu tấn công; mã/cấp/trùng được kiểm ở backend. Lưu/Áp dụng xác nhận lại danh sách và cấp thực nhận từ server.
- Lần cài mã mới cần restart công cụ/server rồi tải lại trang; sau đó chọn chiêu → Xác nhận → Lưu thiết lập → Áp dụng vào game. Boss sinh lại theo lịch. Không tự sửa cấu hình gameplay đang chạy khi mở bộ chọn.

## Hệ số sát thương và giảm thời gian chịu hiệu ứng

Từng boss có **Hệ số sát thương (%)** trong phần HP/Tốc độ/Sát thương/Phạm vi; nhóm đã chọn có chế độ **Giữ từng Boss / Đặt hệ số chung**. Mặc định100%,150%=tăng50%,200%=gấpđôi; nhận1–10000%. Nhân sát thương kỹ năng sau kháng/ngũhành, bao gồm chiêu con; độc nhân mỗi nhịp một lần lúc gắn trước giảm độc và trần gộp hiện có, không nhân lại khi tick. Không nhân hồi máu/phản đòn/thời gian hiệu ứng. Sát thương rất nhỏ vẫn theo luật tối thiểu1điểm/làm tròn cũ.

Trong **Giảm hiệu ứng phải chịu**, chỉnh bốn mức giảm nền theo%: Phục hồi0–100 (mặc định60, chỉ giảm co giật/thọ thương, không hồi HP), Làm chậm0–77, Choáng0–95, Trúng độc0–95 (ba mức này mặc định0). Mức giảm cao làm thời gian chịu hiệu ứng ngắn hơn; giảm độc ở đây chỉ giảm thời gian, không giảm sát thương mỗi nhịp. Bùa/bị động vẫn cộng vào chỉ số và công thức/trần hiện có vẫn áp dụng. Nhóm chọn **Đặt mức giảm chung** để cập nhật cả bốn mức; vẫn chỉnh riêng từng boss sau đó.

Mọi cập nhật chỉ sửa bản nháp, không thay boss chưa chọn. Lưu/Áp dụng xác nhận hệ số và mức giảm từ game; server cũ thiếu thông số sẽ báo restart. Cài mã mới cần restart server/tool và reload trang. Luật chungWeb/Desktop/Mobile, đã thử Chromium desktop/viewportmobile; chưa thử native.
