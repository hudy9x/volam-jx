# Map Creator

Công cụ dựng map độc lập: upload ground và ảnh world, kéo thả, chỉnh điểm chân/va chạm, tô vùng chặn, đặt điểm vào, lưu và mở lại project.

## Chạy

Tại gốc repo:

```sh
npm run map:creator
```

Mở **http://localhost:4569**. Không cần chạy game; không Vite/HMR, không tự reload khi sửa game. Ctrl+C dừng tool; dữ liệu đã lưu vẫn còn trên ổ đĩa. Khởi động lại tool khi sửa mã tool.

`MAP_CREATOR_PORT` đổi cổng; `MAP_CREATOR_DIR` đổi thư mục project. Mặc định `tools/map-creator/projects/`, bị gitignore vì chứa ảnh upload và bộ xuất. Sao lưu toàn thư mục project để giữ cả hình; nút tải JSON chỉ sao lưu bố cục/tham chiếu, không kèm ảnh.

Backend chỉ bind 127.0.0.1; không mở LAN. Giao diện responsive, canvas dùng Pointer Events cho chuột/cảm ứng. Web và trình duyệt desktop dùng trực tiếp; chưa đóng gói desktop native và chưa kiểm điện thoại thật. Trên màn hẹp, thư viện/canvas/thuộc tính xếp dọc; chọn chế độ Kéo khung để kéo bằng một ngón, nút +/− để zoom.

## Cách dùng

1. **Tạo map**: nhập tên và ID 1000–999999 chưa dùng. Tạo project không đưa map vào game.
2. **Upload ground**: PNG/JPG/WebP tĩnh, tối đa32MB/8192×8192. Chiều rộng chia hết32, chiều cao chia hết16 theo lưới đi lại. Tool lấy kích thước thật, không upscale hoặc kéo méo. Ground gồm đất/cỏ/đường; cây/đá/lều cần che nhân vật phải tách riêng.
3. **Upload ảnh world**: chọn nhiều ảnh cùng lúc, ưu tiên PNG/WebP trong suốt. Ảnh được chuẩn hóa WebP lossless, loại bỏ metadata; cùng nội dung chỉ lưu một asset. Chọn ảnh trong thư viện, chọn **Đặt vật thể**, click map nhiều lần để đặt nhiều instance.
4. **Chọn / kéo**: click world hoặc chọn từ danh sách. Chỉnh tên, X/Y, tỷ lệ0,1–4, chânX/Y theo pixel ảnh gốc, độ lệch lớp che khuất theo pixel map. Điểm chân mặc định giữa đáy ảnh. Chọn từ danh sách nếu ảnh trong suốt chồng nhau khó click.
5. **Chặn di chuyển tại chân**: bật collider ellipse, chỉnh bán kính và độ lệch tâm theo pixel ảnh gốc (sẽ nhân theo scale). Chỉ bao phần chiếm đất, không bao toàn tán cây. Collider mặc định tắt để tránh đoán footprint từ ảnh upload.
6. **Tô chặn / Xóa chặn**: sửa blocker địa hình. Cọ1 tác động1ô; tăng bán kính cọ để tô nhiều ô. Tô tay và collider tách biệt, di chuyển object không để lại collider cũ. Ground alpha cũng được xét khi xuất.
7. **Điểm vào**: chọn chế độ rồi click map hoặc nhập tọa độ ở thuộc tính. Điểm phải nằm trên ground có thể đi.
8. **Lưu thiết kế**: lưu ảnh/tham chiếu/bố cục lên ổ đĩa; mở từ danh sách hoặc tải lại tab rồi chọn project. Ctrl/Cmd+S để lưu. Có cảnh báo thay đổi chưa lưu và chống ghi đè từ tab khác bằng revision.
9. **Tùy chọn tệp → Tạo ảnh xem trước**: lưu project trước rồi sinh bản xuất mới, không ghi đè bản xuất cũ. Mở link preview để xem hình đã ghép. Đây là bản xuất xem trước, chưa tự bật trong game; không cấu hình quái/Boss/cổng.

Thay ground khi đã đặt world hoặc tô chặn cần xác nhận: world đã đặt/vùng tô được xóa để tránh lệch tọa độ; thư viện ảnh còn giữ. Hoàn tác khôi phục bản trước trong phiên. World bị xóa có thể hoàn tác; không có chức năng xóa project/ảnh nguồn qua UI.

Điều khiển: lăn chuột zoom tại con trỏ, nút Vừa khung, chuột giữa hoặc chế độ Kéo khung để pan. Delete xóa world đang chọn. Ctrl/Cmd+Z hoàn tác, Ctrl/Cmd+Shift+Z làm lại. Lịch sử tối đa50bước, không lưu lịch sử qua reload. Pan/zoom/lưới không đổi nội dung map.

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

## Bật / Tắt map trong game

Lưu project trước → chọn loại Luyện công / Thành thị / Hang động → **Mở map** → Xác nhận. Tool kiểm nav và điểm vào có khoảng trống9px trong vùng đi lại chính, xuất hoặc dùng lại bản xuất khớp nguồn, đưa bộ tài nguyên vào `apps/client/public/assets/maps/<id>/<build>/` qua pipeline và cập nhật manifest. Sau khi hoàn tất, registry `packages/shared/src/maps/custom-maps.json` đăng ký metadata; không sửa catalog.gen.ts.

Map bật xuất hiện trong Map Manager và danh sách Xa phu. Map thành thị dùng luật thành an toàn mặc định và cho cấu hình NPC/Pen trong Manager. Không tự sinh quái/Boss. Map luyện công/hang dùng luật chiến đấu hiện có.

**Đóng map** giữ project, ảnh nguồn và các bản xuất, đồng thời chặn vào map. Server phát hiện map tắt, mất đăng ký hoặc thiếu map.json/nav.json sẽ đưa người đang ở đó về **Biện Kinh (37)**; nhân vật offline lưu ở map đó cũng được sửa vị trí khi đăng nhập. Map đã đăng ký vẫn hiện trong Manager với nhãn **Đã tắt**. Bật lại không đổi bản xuất nếu nguồn chưa đổi. Muốn áp dụng chỉnh sửa mới: Lưu thiết kế → Đóng map → Mở map. Không có live-patch địa hình.

Registry nằm trong git, ảnh/bộ xuất bị gitignore: khi chuyển máy hoặc triển khai cần phân phối cả bộ tài nguyên/manifest tương ứng và sao lưu project. Cài phiên bản code hỗ trợ này cần restart server và build/tải lại client một lần; các lần bật/tắt sau được server đọc trong lúc chạy. Client đồng bộ danh sách khi vào map/mở Xa phu. Dev watcher có thể tải lại trang khi JSON nguồn đổi.

`MAP_REGISTRY_FILE` đổi file registry dùng chung cho Creator/Manager/server. `MAP_CREATOR_MAPS_DIR` đổi nơi publish khi kiểm thử; server cần `MAPS_DIR` trỏ cùng bộ map. Không chạy hai tiến trình Creator cùng ghi một registry: khóa nằm trong tiến trình; revision chặn tab cũ ghi đè. Không sửa tay public/assets để nhập map.

`objects[].x/y` là vị trí chân trong world pixels. `anchorX/Y`, collider được tính trước scale; `depthOffset` theo world pixels. Dùng chung hệ tọa độ với spawn quái/Boss Xanh ở bước sau. Không chứa quái, không tự sinh quái/Boss, không sửa tool Boss Hoàng Kim hiện tại. Tool spawn sau có thể đọc kích thước, entry, preview và nav của bản xuất.

Giới hạn: tối đa300ảnh/5000world; collider ellipse, chưa xoay/lật sprite hay tách công trình thành các dải depth. Có Chơi thử bản nháp với nhân vật và quái bằng sprite gốc; không mô phỏng chiến đấu. Renderer hiện tại có phạm vi streaming riêng, sprite/công trình quá lớn cần phân mảnh khi tích hợp. Xuất chỉ kiểm điểm vào không bị chặn; chưa chứng minh mọi tuyến đường thông nhau. Runtime dùng thành phần đi lại lớn nhất, nên cần kiểm các vùng rời khi đưa map vào game. Thư viện upload không tự cắt cây khỏi ảnh cảnh, không tẩy nền caro hoặc tự suy ra collider.

Giao diện tuân thủ docs/tools-ui-ux-guidelines.md, dùng lại Dialogs cho kéo/đóng/Esc/thứ tự cửa sổ với CSS token tool; không nạp Phaser hoặc skin game. Không có template vì mỗi project là một map chỉnh sửa trực tiếp. Lưu và xuất là hai thao tác riêng; xuất có lưu snapshot trước để đảm bảo dữ liệu ổ đĩa khớp bản xuất.

## Kiểm tra

```sh
npm run typecheck
npm run test:map-creator
npm run test:map-publication
```

Tests kiểm roundtrip ảnh/project, revision conflict, path validation, collider không để lại blocker cũ, ground biên, alpha/entry và metadata world/nav. Browser smoke kiểm tạo/upload/đặt/kéo/cấu hình/undo/redo/tô/lưu/reload/xuất, dialog/Esc và responsive1440×1000/390×844. Kiểm thử bổ sung bật/tắt, giữ dữ liệu, conflict, dùng lại build và server Colyseus thật: join/teleport, tắt online, đăng nhập offline, mất đăng ký/tài nguyên đều về Biện Kinh. Chưa kiểm native/điện thoại thật.

## Thao tác nhanh và cách hiểu các nút

- **Lưu thiết kế** (Ctrl/Cmd+S): lưu bản chỉnh sửa để làm tiếp. Không cập nhật map đang mở trong game.
- **Mở map / Đóng map** ở khối **Trong game**: cho phép/ngừng cho người chơi vào. Mở dùng thiết kế đã lưu; đóng chuyển người đang chơi về Biện Kinh và giữ dữ liệu. Nút khóa khi còn thay đổi chưa lưu, có hướng dẫn ngay cạnh.
- **Tùy chọn tệp → Tạo ảnh xem trước**: lưu thiết kế rồi xuất bộ map như trước để xem ảnh ghép, không đổi trạng thái trong game. **Tải thiết kế JSON** chỉ tải bố cục, không kèm ảnh nguồn.
- Toolbar dùng icon SVG riêng, hiện tên + hướng dẫn + phím tắt khi hover/focus. Công cụ đang chọn luôn có tên/mô tả phía dưới, nên dùng được trên cảm ứng mà không cần hover. Nút **Phím tắt** mở bảng tra cứu; Esc đóng và trả focus. Cỡ cọ chỉ hiện khi tô/xóa chặn. Chân ảnh/lớp che/kích thước collider nằm trong **Nâng cao**.

| Phím | Thao tác |
|---|---|
| V | Chọn / kéo vật thể |
| I | Đặt vật thể |
| H / giữ Space + kéo | Kéo khung / kéo khung tạm thời |
| B / E | Tô / xóa vùng chặn |
| P | Đặt điểm vào |
| Cuộn, + / −, 0 | Zoom vào/ra, vừa khung |
| [ / ] | Giảm / tăng cỡ cọ |
| Ctrl/Cmd+Z / Ctrl/Cmd+Shift+Z | Hoàn tác / làm lại |
| Ctrl/Cmd+D / Delete | Nhân bản / xóa vật thể chọn |
| ? / F1 | Bảng phím tắt |

Phím công cụ không chạy lúc nhập liệu, kéo vật thể, gửi yêu cầu hoặc mở dialog; Ctrl/Cmd+S vẫn lưu được khi nhập thuộc tính và chốt giá trị đang sửa. Khi dialog mở, không kích hoạt lưu hoặc đổi công cụ phía sau. Các phím lấy cảm hứng từ editor/Photoshop, không phải toàn bộ keymap Photoshop. Không thêm thư viện icon, ảnh hoặc font ngoài.

Kiểm UX2026-11-15: Chrome và trình duyệt trong app, desktop1440×1000/mobile390×844 không tràn ngang; thử V/I/H/B/E/P, cỡ cọ, nhân bản/hoàn tác94→95→94, tooltip focus, guard nhập liệu/dialog, Tab/Esc/khôi phục focus, Hủy/Bỏ thay đổi. Dialog xác nhận trong tool thay cho confirm của trình duyệt. Test chỉ sửa nháp, mở lại bản lưu; project9101 revision3/94vật thể và trạng thái map đang mở không đổi. Chưa kiểm thiết bị touch/native thật.

## Bố cục gọn và Chơi thử

- Khối chọn map, **Tên map**, loại map và trạng thái trong game được gộp chung. Tên map sửa ngay trong khối này; **icon Thuộc tính map** mở điểm vào X/Y. Vẫn cần Lưu thiết kế để ghi thay đổi.
- Toolbar một hàng: công cụ chỉnh bên trái, undo/redo/zoom/lớp phủ/phím trợ giúp bên phải. Màn hẹp cuộn riêng thanh này, không kéo rộng cả trang. Tài nguyên nằm bên phải canvas trên desktop; màn hẹp nằm dưới canvas.
- **Chơi thử** ngay trên canvas: dùng bản nháp hiện tại, không cần lưu hoặc mở map trong game. Tải sprite WebP gốc qua metadata sinh sẵn: nhân vật nam mặc định ghép nhiều lớp + bóng, tối đa3quái thật có sẵn (hiện Đông Bắc hổ/Hoa Nam hổ/Bạch Hổ). Không vẽ hình thay thế khi thiếu tài nguyên; thông báo lỗi và hướng dẫn sinh ảnh.
- Bấm/chạm lên map để đi. Dùng nav từ nền alpha + vùng chặn tay + collider trong bản nháp, thành phần đi lại chính, clearance9px và A* dùng chung game. Nếu entry bị chặn, điểm thử được căn về nơi đi được. Tốc/chu kỳ chạy lấy resolver SPEED dùng chung, không cân chỉnh lại game.
- Nhân vật/quái và cây/đá dùng cùng world pixels, cùng zoom, cùng điểm chân; xếp lớp theo Y. Quái đứng có hoạt ảnh, nhân vật chạy/đứng và đổi hướng khi đi. Camera theo người khi di chuyển, nút **Về điểm vào** đặt lại nhóm thử, **Ảnh gốc1:1** đưa zoom về100%. Đây là tỷ lệ ảnh gốc, không thay preset/camera/renderScale của client game.
- **Esc / Dừng thử** trả về góc nhìn chỉnh sửa; giữ nguyên bản nháp và lịch sử. Trong lúc thử khóa chỉnh sửa/lưu/mở đóng map, tránh thao tác nhầm. Preview không đăng nhập, không cần game server, không nối Colyseus; không spawn quái thật lên server, không chiến đấu, không lưu actor/điểm spawn vào project. Tool spawn riêng vẫn làm sau.
- Kiểm `npm run test:map-preview` (metadata/lớp/tỷ lệ/whitelist/missing assets), `test:map-creator`, typecheck/build. Browser1440×1000/390×844: toolbar cùng một hàng, không tràn ngang trang; thuộc tính icon/Esc, sprite/che khuất, click đi1792,1792→1904,1880, về entry, dừng khôi phục zoom và bản nháp chưa lưu đạt. Source9101revision3/94objects/enabled không đổi. Chưa kiểm native hoặc thiết bị cảm ứng thật.

Nút Mở/Đóng map: icon pulse xanh khi chưa mở/đã đóng; map đang mở dùng pulse đỏ nhấp nháy cạnh Đóng map theo USER2026-11-15 (ngoại lệ animation trạng thái được yêu cầu, chỉ icon). Tôn trọng prefers-reduced-motion bằng icon đỏ đứng yên. Chữ vẫn phân biệt trạng thái, không phụ thuộc màu. “Thiết kế bản N” là revision bản lưu, không phải level map; bản trong game có thể cũ hơn bản đã lưu.

USER đính chính2026-11-15: icon trạng thái là **chấm tròn đặc**, không phải đường nhịp tim; giữ màu xanh/đỏ và nhịp nháy đỏ như trên.
