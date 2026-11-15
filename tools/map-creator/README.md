# Map Creator

Công cụ dựng map độc lập: upload ground và ảnh world, kéo thả, chỉnh điểm chân/va chạm, tô vùng chặn, đặt điểm vào, lưu và mở lại project.

## Chạy

Tại gốc repo:

```sh
npm run map:creator
```

Mở **http://localhost:4569**. Không cần chạy game; không Vite/HMR, không tự reload khi sửa game. Ctrl+C dừng tool; dữ liệu đã lưu vẫn còn trên ổ đĩa. Khởi động lại tool khi sửa mã tool.

`MAP_CREATOR_PORT` đổi cổng; `MAP_CREATOR_DIR` đổi thư mục project. Mặc định `tools/map-creator/projects/`, bị gitignore vì chứa ảnh upload và bộ xuất. Sao lưu toàn thư mục project để giữ cả hình; nút tải JSON chỉ sao lưu bố cục/tham chiếu, không kèm ảnh.

Backend chỉ bind 127.0.0.1; không mở LAN. Giao diện responsive, canvas dùng Pointer Events cho chuột/cảm ứng. Web và trình duyệt desktop dùng trực tiếp; chưa đóng gói desktop native và chưa kiểm điện thoại thật. Trên màn hẹp, thư viện/canvas/thuộc tính xếp dọc; chọn chế độ Di chuyển khung để kéo bằng một ngón, nút +/− để zoom.

## Cách dùng

1. **Tạo map**: nhập tên và ID 1000–999999 chưa dùng. Tạo project không đưa map vào game.
2. **Upload ground**: PNG/JPG/WebP tĩnh, tối đa32MB/8192×8192. Chiều rộng chia hết32, chiều cao chia hết16 theo lưới đi lại. Tool lấy kích thước thật, không upscale hoặc kéo méo. Ground gồm đất/cỏ/đường; cây/đá/lều cần che nhân vật phải tách riêng.
3. **Upload ảnh world**: chọn nhiều ảnh cùng lúc, ưu tiên PNG/WebP trong suốt. Ảnh được chuẩn hóa WebP lossless, loại bỏ metadata; cùng nội dung chỉ lưu một asset. Chọn ảnh trong thư viện, chọn **Đặt world**, click map nhiều lần để đặt nhiều instance.
4. **Chọn / kéo**: click world hoặc chọn từ danh sách. Chỉnh tên, X/Y, tỷ lệ0,1–4, chânX/Y theo pixel ảnh gốc, độ lệch lớp che khuất theo pixel map. Điểm chân mặc định giữa đáy ảnh. Chọn từ danh sách nếu ảnh trong suốt chồng nhau khó click.
5. **Chặn di chuyển tại chân**: bật collider ellipse, chỉnh bán kính và độ lệch tâm theo pixel ảnh gốc (sẽ nhân theo scale). Chỉ bao phần chiếm đất, không bao toàn tán cây. Collider mặc định tắt để tránh đoán footprint từ ảnh upload.
6. **Tô chặn / Xóa chặn**: sửa blocker địa hình. Cọ1 tác động1ô; tăng bán kính cọ để tô nhiều ô. Tô tay và collider tách biệt, di chuyển object không để lại collider cũ. Ground alpha cũng được xét khi xuất.
7. **Điểm vào**: chọn chế độ rồi click map hoặc nhập tọa độ ở thuộc tính. Điểm phải nằm trên ground có thể đi.
8. **Lưu project**: lưu ảnh/tham chiếu/bố cục lên ổ đĩa; mở từ danh sách hoặc tải lại tab rồi chọn project. Ctrl/Cmd+S để lưu. Có cảnh báo thay đổi chưa lưu và chống ghi đè từ tab khác bằng revision.
9. **Xuất bộ map**: lưu project trước rồi sinh bản xuất mới, không ghi đè bản xuất cũ. Mở link preview để xem hình đã ghép. Chưa áp dụng vào game, chưa cấu hình quái/Boss/cổng/PK.

Thay ground khi đã đặt world hoặc tô chặn cần xác nhận: world đã đặt/vùng tô được xóa để tránh lệch tọa độ; thư viện ảnh còn giữ. Hoàn tác khôi phục bản trước trong phiên. World bị xóa có thể hoàn tác; không có chức năng xóa project/ảnh nguồn qua UI.

Điều khiển: lăn chuột zoom tại con trỏ, nút Vừa khung, chuột giữa hoặc chế độ Di chuyển khung để pan. Delete xóa world đang chọn. Ctrl/Cmd+Z hoàn tác, Ctrl/Cmd+Shift+Z làm lại. Lịch sử tối đa50bước, không lưu lịch sử qua reload. Pan/zoom/lưới không đổi nội dung map.

## Dữ liệu và đầu ra

```text
projects/<id>/
  project.json                Nguồn chỉnh sửa: ground, assets, objects, entry, blocked
  assets/<sha256>.webp        Hình upload được chuẩn hóa
  builds/r<revision>-<key>/
    ground/<col>_<row>.webp   Ground512×512; mảnh biên đệm alpha
    objects/<cx>_<cy>.json    Page/frame/piece theo định dạng MapView
    objects/object-*.webp     Ảnh world theo scale; dùng lại frame trong cùng chunk
    map.json                 Region/chunk metadata
    nav.json                 Grid32×16, bit1=chặn, LSB trước
    catalog-entry.json       Metadata để bước tích hợp đăng ký map
    project.json             Snapshot nguồn tại revision đã xuất
    minimap.webp / thumb.webp / preview.webp
```

Ground và ảnh world nằm trong project, không sao chép vào `apps/client/public/assets`. Bộ xuất tuân thủ cấu trúc renderer hiện tại, nhưng **chưa có nút đăng ký/publish map tự dựng vào game**, chưa sửa catalog hoặc generator map gốc. Cần bước tích hợp đăng ký metadata và phân phối gói tài nguyên qua pipeline/manifest trước khi chơi. Không sửa tay catalog.gen.ts hoặc public/assets để nhập map.

`objects[].x/y` là vị trí chân trong world pixels. `anchorX/Y`, collider được tính trước scale; `depthOffset` theo world pixels. Dùng chung hệ tọa độ với spawn quái/Boss Xanh ở bước sau. Không chứa quái, không tự sinh quái/Boss, không sửa tool Boss Hoàng Kim hiện tại. Tool spawn sau có thể đọc kích thước, entry, preview và nav của bản xuất.

Giới hạn: tối đa300ảnh/5000world; collider ellipse, chưa xoay/lật sprite hay tách công trình thành các dải depth. Preview không có nhân vật chạy thử; chưa kiểm che khuất runtime game. Renderer hiện tại có phạm vi streaming riêng, sprite/công trình quá lớn cần phân mảnh khi tích hợp. Xuất chỉ kiểm điểm vào không bị chặn; chưa chứng minh mọi tuyến đường thông nhau. Runtime dùng thành phần đi lại lớn nhất, nên cần kiểm các vùng rời khi đưa map vào game. Thư viện upload không tự cắt cây khỏi ảnh cảnh, không tẩy nền caro hoặc tự suy ra collider.

Giao diện tuân thủ docs/tools-ui-ux-guidelines.md, dùng lại Dialogs cho kéo/đóng/Esc/thứ tự cửa sổ với CSS token tool; không nạp Phaser hoặc skin game. Không có template vì mỗi project là một map chỉnh sửa trực tiếp. Lưu và xuất là hai thao tác riêng; xuất có lưu snapshot trước để đảm bảo dữ liệu ổ đĩa khớp bản xuất.

## Kiểm tra

```sh
npm run typecheck
npm run test:map-creator
```

Tests kiểm roundtrip ảnh/project, revision conflict, path validation, collider không để lại blocker cũ, ground biên, alpha/entry và metadata world/nav. Browser smoke kiểm tạo/upload/đặt/kéo/cấu hình/undo/redo/tô/lưu/reload/xuất, dialog/Esc và responsive1440×1000/390×844. Chưa kiểm native/điện thoại thật hoặc chơi trong game.
