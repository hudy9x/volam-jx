# Quản lý Boss Hoàng Kim

Chạy `npm run boss`, mở http://localhost:4567. Tool độc lập với game, không dùng Vite/HMR hay nạp Phaser. Dừng bằng Ctrl+C; đóng tab không dừng server tool. Không có tác vụ nền tạo Boss trong tool: game server quản lý việc xuất hiện.

## Thao tác

1. Tìm tên Boss hoặc lọc loại/phái. Checkbox ở tên là **bật xuất hiện**, không phải chọn hàng loạt. Chỉnh cấp ngay tại dòng; mở danh sách món đã gắn khi cần xem chi tiết.
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
