# Map Manager · NPC thành thị

Tool độc lập ở `tools/map-manager`, tách khỏi Map Creator và tool Boss Hoàng Kim. Cấu hình NPC/vùng an toàn thành thị và điểm chuyển map; chưa làm spawn quái/Boss Xanh.

## Chạy

```sh
npm run map:manager
```

Mở **http://localhost:4570**. Chỉ bind127.0.0.1, không mở LAN, không nạp Phaser hoặc HMR của game. Ctrl+C để dừng; đóng tab không dừng server tool. Khởi động lại tool khi sửa source tool.

- `MAP_MANAGER_PORT`: cổng, mặc định4570.
- `MAP_MANAGER_CONFIG`: file cấu hình đích; mặc định `packages/shared/src/npcs/town-placements.json`. Khi kiểm thử dùng đường dẫn riêng trong /tmp, không sửa cấu hình thật.

## Cài NPC

1. Chọn map ở **sidebar Bản đồ**, có tên và ảnh preview, chia hai nhóm **Thành thị / Luyện công**. Có tìm theo tên (không dấu) hoặc ID, đánh dấu map đang chọn và trạng thái thiếu tài nguyên. Có các map gốc đã sinh cùng map tự dựng đã đăng ký từ Map Creator, gồm hang động và Dược Vương Cốc. Thành thị cho chỉnh NPC; luyện công hiện chỉ xem trước, khóa Thêm/Lưu NPC. Bấm Làm mới danh sách map để nhận map mới; tool cũng làm mới khi focus tab và mỗi10giây khi tab hiển thị, giữ bản nháp. Map tắt vẫn có preview và nhãn Đã tắt để quản trị, người chơi không vào được.
2. Chọn NPC ở danh sách hoặc click chấm dưới chân trên map. Có tìm theo tên/chức năng. Mặc định mở minimap vừa toàn bộ map; dùng cuộn hoặc nút +/− để zoom và Kéo khung/chuột giữa để di chuyển. Minimap vẫn giữ tọa độ thật cho NPC và pen, không tự chuyển sang ground thật khi phóng lớn.
3. Click map để đặt NPC đang chọn, hoặc kéo chấm NPC. Có nhập X/Y, đổi tên/hướng và chọn hình NPC dịch vụ. Thợ rèn, Xa phu, Bán ngựa mặc định dùng bản đứng 8 hướng gốc SHXT; các hình cũ cố định vẫn có trong danh sách để giữ tương thích. Hướng dùng tên la bàn (S/SW/W/NW/N/NE/E/SE), preview cập nhật ngay. Hình 1 hướng khóa lựa chọn hướng; Rương chứa đồ chỉ có 2 hình hướng thật. Thợ rèn bản 8 hướng đứng riêng, không kèm bàn/lò rèn. Đổi hình/hướng không đổi trường Chức năng, ID hoặc vị trí NPC.
4. Chức năng gồm Thợ rèn, Hiệu thuốc, Kỳ Trân Các, Xa phu, Bán ngựa, Rương chứa đồ. Thêm NPC từ bộ chọn rồi đặt vị trí. ID instance được tool tạo, không cần nhớ mã. Chưa thêm chức năng nhiệm vụ/đối thoại tùy ý ngoài6dịch vụ game hiện có.
5. Bật **Vùng chặn** để xem nav; tọa độ không đi được hiện trạng thái lỗi. **Căn về vùng đi được** thay điểm trong bản nháp một cách rõ ràng; lưu không tự âm thầm đổi tọa độ. Backend kiểm clearance9px giống game và thành phần nav lớn nhất.
6. **Lưu NPC vào game** ghi cấu hình vào mã nguồn. **Mở lại bản lưu** bỏ bản nháp sau khi xác nhận. Đổi map khi chưa lưu cũng hỏi lại. Xóa NPC có hộp xác nhận nội bộ; Hủy/Esc giữ nguyên dữ liệu. Xóa chỉ có hiệu lực trong source sau khi Lưu.

Cuộn để zoom, chuột giữa hoặc bật Kéo khung để pan. Trên cảm ứng dùng chế độ Kéo khung và nút +/-; giữ chuột/chạm vào chấm để kéo NPC. Ctrl/Cmd+S lưu. Bản nháp chưa lưu chỉ ở tab; trước khi đóng tab trình duyệt có cảnh báo.

## Lưu trực tiếp vào nguồn game

Nguồn riêng theo map: **`packages/shared/src/npcs/town-placements.json`**, nằm trong git để review/commit cùng code theo yêu cầu. File không phải *.gen.ts, không bị generator asset ghi đè.

```text
Tool → kiểm dữ liệu + vùng đi được → atomic save town-placements.json
                                        ↓
Shared towns.ts → applyTownPlacements → TOWN_NPCS → WorldScene / npcState
```

JSON lưu tọa độ tuyệt đối. Adapter chuyển về dx/dy so với entry để giữ hợp đồng NPC đang dùng. Thành chưa cấu hình vẫn lấy DEFAULT_TOWN_NPCS, Dược Vương Cốc và map khác giữ nguyên. Một danh sách rỗng được lưu rõ là không có NPC, không rơi về mặc định. Lưu một thành giữ nguyên cấu hình thành khác. Revision theo nội dung từng map chặn tab cũ ghi đè thay đổi mới; file nguồn được ghi qua file tạm/rename. Không chạy hai tiến trình tool cùng ghi một file: khóa ghi nằm trong tiến trình, không phải khóa liên tiến trình.

**Lưu cập nhật file nguồn ngay**, không cần bước sinh code hay nút Apply khác theo yêu cầu USER. Game dev có watcher có thể reload/restart khi source thay đổi. Game đã build cần build và tải lại client; tool không có live-patch scene NPC đang mở trong bản production. NPC của game hiện được dựng ở client, các hành động mua bán vẫn theo kiểm tra server hiện có. Tool không sửa gameplay hay thêm quyền tương tác NPC.

Lưu là thao tác cập nhật cấu hình, không tự git commit/push. Các dữ liệu kiểm thử không được ghi vào file nguồn mặc định khi bàn giao; file maps ban đầu rỗng giữ nguyên NPC đang có.

## Tài nguyên và nền tảng

Dùng minimap/map.json/nav hiện có qua API để xem tổng thể và chỉnh tọa độ. Chỉ khi chọn Nền bản đồ → Map thật hoặc Xem NPC trên map thật mới tải ground/objects trong khu vực nhìn thấy; không sao chép/public-assets hoặc nạp toàn bộ map vào RAM. Preview NPC cắt frame gốc qua sharp đang có; không thêm dependency. Tài nguyên map có version manifest; file thay đổi cần mở lại hoặc khởi động lại tool nếu đổi metadata.

UI theo docs/tools-ui-ux-guidelines.md; dialog dùng primitive Dialogs và CSS token tool, không skin game. Có loading/empty/error, input/hit area cảm ứng và bố cục1cột màn hẹp. Desktop/Web dùng trình duyệt; chưa đóng gói native và chưa kiểm điện thoại thật. Server loopback trên máy tính không tự truy cập được từ điện thoại; không mở LAN ngoài yêu cầu.

Bản đầu chưa có chọn mọi sprite NPC trong client gốc, NPC quest, import map mới, spawn quái/Boss Xanh hoặc áp dụng trực tiếp vào scene đang chạy. Các chức năng đó không được mô phỏng bằng nút giả.

## Kiểm tra

```sh
npm run test:map-manager
npm run typecheck
npm run build
```

Unit kiểm validation, lưu/mở lại, revision conflict, giữ nguyên map khác, danh sách rỗng và adapter runtime. Browser thật kiểm Biện Kinh/Phượng Tường, sửa tên/tọa độ/hướng, kéo, thêm/xóa NPC, lưu/mở lại, xác nhận/Hủy/Esc và bố cục1440×1000/390×844. API chặn origin khác, vị trí bị chặn và revision cũ. Chưa kiểm native hoặc chạy lại client game với vị trí NPC tùy chỉnh; đường dữ liệu shared được kiểm qua adapter unit và build.

Sidebar trên màn hẹp nằm phía trên canvas với danh sách cuộn riêng; desktop cố định bên trái. Chuyển map khi có bản nháp phải Xác nhận hoặc Hủy, không tự ghi cấu hình.

## Pen · Vùng an toàn

Chọn thành thị ở sidebar → **Công cụ: Pen · Vùng an toàn** → **Vẽ vùng mới**. Click/chạm từng điểm quanh nội thành, rồi click điểm đầu hoặc bấm **Khép vùng**. Dùng chuột giữa/Kéo khung và zoom để đi tiếp quanh tường. Nút **Lùi một điểm / Hủy nét** chỉ sửa nét đang vẽ. Có thể khoanh nhiều vùng độc lập.

Chọn một vùng để đổi tên, kéo các đỉnh hoặc click trên cạnh để thêm điểm. Có bộ chọn điểm và X/Y để chỉnh chính xác, nút xóa điểm (giữ ít nhất 3), xóa vùng có xác nhận. Đường bao tự cắt, điểm trùng/ngoài map, vùng không có diện tích hoặc tên rỗng bị từ chối khi khép/lưu. Không cần từng điểm nằm trên nav đi được: đường bao có thể chạy qua tường, còn tọa độ nhân vật mới quyết định vùng.

**Lưu vùng an toàn** ghi riêng `packages/shared/src/maps/town-safe-zones.json`, giữ bản nháp NPC độc lập. Đổi công cụ không làm mất bản nháp; chuyển map/Mở lại bản lưu hỏi bỏ cả NPC/vùng chưa lưu. Không thể lưu khi đang vẽ dở. Một thành có 1–32 vùng, mỗi vùng 3–256 điểm; không lưu danh sách rỗng để vô tình mở PK toàn thành. **Khôi phục an toàn toàn map** tạo bản nháp khôi phục, cần Lưu mới ghi nguồn. Map chưa cấu hình giữ chính sách cũ.

- Trong bất kỳ vùng nào và trên đường biên: cấm phát động chiêu chủ động và tấn công/PK. Hào quang ô tay đang duy trì/bị động giữ hành vi hiện có, không tự xóa kỹ năng. Sát thương đang diễn ra không gây thêm máu mất trong vùng; bộ đếm hiệu ứng vẫn chạy, không tự tẩy trạng thái.
- Ngoài mọi vùng trên thành đã cấu hình: dùng chiêu/đánh quái/PK theo luật kỹ năng, mode PK, phe, tổ đội và tân thủ hiện có. Không tự bật PK khi bước ra. Không sinh thêm quái: chờ tool spawn riêng.
- Server kiểm cả người đánh và mục tiêu tại thời điểm tác động, hủy ý định đánh đang chờ khi vào vùng, chặn đạn/đánh lan/đánh xuyên ranh giới. Quyền cửa hàng/rương/KNB và ID/action NPC giữ nguyên, không dựa vào polygon.
- Client chọn mục tiêu, Auto, bot và dáng đứng/chạy dùng cùng luật vị trí. Server vẫn quyết định cuối cùng. Cấu hình import lúc khởi động: **khởi động lại server, tải lại client** sau lưu; production cần build lại. Không hot-patch room đang chạy.
- `MAP_MANAGER_ZONES_CONFIG` đổi file đích khi thử (ví dụ `/tmp/jx-pen-test-zones.json`). Không dùng hai tiến trình cùng ghi một file. Lưu atomic và revision theo map chống tab cũ ghi đè, giữ cấu hình map khác. File khởi tạo có maps:{}; giữ nguyên các vùng USER đã lưu theo từng map.

Kiểm thử: `npm run test:safe-zones` kiểm hình học/biên/vùng lõm/nhiều vùng, lưu–mở lại/xung đột/reset, lệnh cast/PK và sát thương thực theo hai bên ranh. Kiểm hồi quy thêm `test:map-manager`, `test:auto`, `test:effects`, `test:bots`, typecheck/build. Chrome đã thử vẽ/khép/kéo đỉnh/đổi tên/lưu/mở lại/hủy nét/lùi điểm/cảnh báo chuyển map trên file thử, viewport390×844 không tràn ngang; chưa thử thiết bị cảm ứng/native thật hoặc giao chiến trong scene với vùng tùy chỉnh.

## Zoom minimap và xem NPC trên map thật

- **Minimap** là nền mặc định cho mọi map và chế độ Pen. Cuộn chuột zoom tại con trỏ; nút +/− zoom giữa khung, dùng được với cảm ứng. **100% minimap = vừa toàn map**, có thể zoom cả vào và ra. Phóng lớn vẫn là minimap; ảnh có thể mờ do độ phân giải gốc nhưng tọa độ NPC/đường bao không đổi.
- **Toàn map** quay lại minimap và căn vừa khung; **Về điểm vào** phóng tới vùng entry trên nền đang chọn. Đổi nền/camera không làm thay đổi hay lưu bản nháp NPC/vùng.
- Khi chỉnh NPC, bấm **Xem NPC trên map thật** để camera tới đúng NPC ở 100% ảnh gốc. Đổi hướng rồi xem hình thực tế và chọn lại Minimap/Toàn map để tiếp tục bố trí tổng thể. Có thể chọn nền Map thật thủ công để xem khu vực camera hiện tại.
- Đã kiểm Chrome: zoom minimap100→2330% vẫn ở mini, +/− hoạt động; mở NPC thật đúng vị trí và100%; vẽ/khép vùng ngay trên minimap, tọa độ4điểm giữ nguyên sauzoom; bỏ nháp không ghi nguồn. 390×844 không tràn ngang, nút zoom hoạt động; chưa kiểm điện thoại/native thật.

Map tự dựng dùng chung `packages/shared/src/maps/custom-maps.json`; `MAP_REGISTRY_FILE` cho phép đổi file khi thử. Bật/Tắt thực hiện ở Map Creator, không đổi dữ liệu NPC/vùng an toàn đã lưu.

## Icon, tooltip và phím tắt

Toolbar dùng icon + tooltip có mô tả/phím tắt, công cụ đang chọn có hướng dẫn thường trực. Nút Lưu có chữ và chỉ lưu công cụ đang chọn. Icon dùng chung với Map Creator từ `tools/ui/actions.ts`, không thêm thư viện hoặc font. Dialog giữ Tab/Esc/trả focus; phím công cụ bỏ qua ô nhập liệu/dialog/busy và khi đang kéo.

| Phím | Thao tác |
|---|---|
| V / B / T | NPC / Pen vùng an toàn / Điểm chuyển map |
| H / giữ Space + kéo | Bật kéo khung / kéo tạm thời |
| Z | Chuyển Minimap / Map thật (Realistic) |
| 0 / + / − | Vừa toàn map / zoom vào / zoom ra |
| Ctrl/Cmd+S | Lưu cấu hình công cụ đang chọn |
| Delete | Xóa NPC hoặc điểm chuyển đang chọn, có xác nhận |
| ? / F1 | Bảng phím tắt |

## Điểm chuyển map

1. Chọn map ở sidebar → icon **Điểm chuyển map (T)**. Dùng được cho thành thị và bãi luyện công/hang động đã có tài nguyên, kể cả map tự dựng.
2. Chọn **Dược Vương Cốc** trên Biện Kinh để di chuyển lối đi hiện có. Bấm một vị trí mới trên minimap/map thật hoặc kéo hình thoi; có nhập X/Y chính xác. Zoom và kéo khung không đổi tọa độ. Phần đầu giữ mặc định cũ: Biện Kinh37→Dược Vương Cốc140 và chiều về140→37.
3. **Thêm điểm** để tạo lối đi khác. Chọn map đích theo tên; công cụ tự lấy điểm vào đi được. Có thể nhập Điểm đến X/Y riêng hoặc bấm **Dùng điểm vào**. Điểm đặt phải ở vùng đi lại chính, cả hai đầu có clearance9px và map đích đang mở/đủ tài nguyên. Bán kính kích hoạt8–256pixel theo khoảng cách isometric; mặc định40. Đổi đích giữ tên tự đặt, chỉ cập nhật tên còn ở dạng mặc định.
4. **Lưu điểm chuyển** ghi riêng `packages/shared/src/maps/map-portals.json`. Thay đổi không sửa NPC/vùng an toàn và không tạo lối quay về tự động. Muốn hai chiều, chỉnh map bên kia riêng. **Xóa điểm** có xác nhận; danh sách rỗng lưu rõ là bỏ hết lối đi của map đó. Không thay mặc định nếu map chưa có cấu hình.
5. Khởi động lại server, tải lại client; production build lại. Đây là nguồn được import khi khởi động, không live-patch room. Runtime dùng chính `MapMeta.portals` và hook transfer đang có; map tắt/mất tài nguyên vẫn bị chặn theo luật truy cập map. Không thêm quái/spawn hoặc đổi luật PK/NPC.

Bản nháp điểm chuyển tách NPC/pen; đổi công cụ giữ nháp, chuyển map/Mở bản lưu/đóng trang cảnh báo mọi nháp chưa lưu. Bản lưu giữ ID của điểm cũ nên chỉ di chuyển điểm không đổi đích hoặc chức năng. Đặt điểm đến xa lối quay về để tránh bước vào bán kính chuyển tiếp ngay sau khi tới nơi; tránh đặt nhiều lối chồng nhau.

`MAP_MANAGER_PORTALS_CONFIG` đổi file đích khi thử, ví dụ `/tmp/jx-manager-portals-test.json`; chỉ tool đọc file thử, runtime game vẫn dùng nguồn mặc định. Lưu atomic/CAS theo map, giữ map khác; chỉ chạy một tiến trình ghi cùng file (khóa trong tiến trình). Registry map và cấu hình điểm chuyển là hai nguồn khác nhau.

Kiểm `npm run test:map-portals`: lưu/mở lại, ID/đích, giữ map khác/default, danh sách rỗng, stale revision, tọa độ/đích/bán kính sai, vị trí bị chặn/cả hai đầu, đích tắt và production checkPortals chỉ kích hoạt ở vị trí mới. Hồi quy Manager/NPC, safe-zones, map-publication, Creator/Preview; typecheck/build. Browser thử file/tmp, không lưu thử vào source thật. Native/thiết bị touch thật chưa kiểm.

Nền bản đồ là switch **Minimap / Map thật**, luôn nằm ngoài cùng bên phải toolbar; **Z** đổi nền, Space/Enter khi focus switch cũng hoạt động. Chỉ nhóm công cụ bên trái cuộn trên màn hẹp. **Vùng chặn** là nút tùy chọn bật/tắt có aria-pressed và màu chọn, không còn checkbox. Đổi nền/lớp phủ chỉ đổi cách xem, không sửa dữ liệu hoặc làm mất bản nháp. Bấm Toàn map quay về Minimap; Xem NPC thật tự bật switch Map thật.
