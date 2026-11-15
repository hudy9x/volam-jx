# Nghiên cứu vùng an toàn trong thành · 2026-11-15

Trạng thái: **chỉ nghiên cứu theo USER, chưa duyệt triển khai**. Mục tiêu: cấu hình cấm dùng chiêu/PK trong nội thành, ngoài thành trên cùng map trở lại luyện công/PK theo luật hiện có. Không thay chức năng NPC.

## 1. Hiện trạng đã xác minh

- `packages/shared/src/maps/index.ts:7,31,52`: City/Capital mặc định safe=true/pvp=false toàn map; Biện Kinh37 có override tương tự. Đây là phân loại theo map, không xét tường/cổng hoặc tọa độ. Field/Cave mặc định safe=false/pvp=true.
- `apps/server/src/world/World.ts:69`: World.rules cố định từ metadata map, dùng chung mọi người trong room.
- `apps/server/src/world/commands.ts:20`: commandCast chặn yêu cầu chủ động khi rules.safe. setPk:54 chặn bật PK khi !rules.pvp. `combat/rules.ts:50` chặn tấn công khi rules.safe; `world/targeting.ts:22` dùng luật đó cho người/quái. Client WorldScene cũng dùng meta.safe/meta.pvp cho lựa chọn mục tiêu.
- Có ngoại lệ hiện tại: `players.ts:139` duy trì hào quang ô tay bằng holdSlotAura, chủ ý có hoạt động trong thành; lệnh cast bị chặn không đồng nghĩa toàn bộ kỹ năng đang tồn tại đều bị tắt. Nếu USER muốn cấm tuyệt đối cần chốt riêng việc giữ/tắt hào quang/bị động; không tự gỡ kỹ năng hoặc thay chỉ số trong nghiên cứu này.
- `safe` còn quyết định quyền mua/chế tạo/rương/KNB và tốc độ hồi trong players/inventory/market/MapRoom; không thay toàn bộ các chỗ đọc safe thành một biến khu chiến đấu. Phải tách quyền chiến đấu theo tọa độ khỏi loại map/quyền dịch vụ NPC.
- Sinh quái là cấu hình độc lập. Cho phép chiến đấu ngoài thành không tự tạo quái ngoài cổng; cần cấu hình spawn riêng, loại vùng an toàn khỏi vị trí sinh/điểm hồi về sau.

## 2. Đối chiếu SHXT: dữ liệu thật và giới hạn

Nguồn `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`. Chỉ đọc dữ liệu, không sửa nguồn. Không tìm thấy source engine/server C++ trong bộ client đã khảo sát; không coi các DLL là mã nguồn đã đọc.

- `settings/waypoint.txt` có cột FightState. Script PAK thắng `\\script\\global\\station.lua` ở `data_extract/update01/_unnamed/dat/980b7ddf.dat:152–159` lấy GetTerminiFState(nWayPoint), NewWorld rồi SetFightState(nFightState). Script nhiệm vụ map_index.lua (`f6e6e9a7.dat:266–271`) đặt 1 khi đi khu nhiệm vụ, 0 nếu chuyển thất bại.
- Script bosscharm.lua bản thắng (`slistcache/_unnamed/dat/2a65a284.dat:32`) kiểm GetFightState()==0, chú thích tiếng Trung xác nhận cấm ở khu phi chiến đấu. Có cơ chế trạng thái chiến đấu riêng, không nên đồng nhất với chế độ PK của người chơi.
- File rời `settings/maps/tianchimijing/floor4/{safetofight1,safetofight2,fighttosafe1,fighttosafe2}.txt` là danh sách TRAPX/TRAPY. Đây là bằng chứng dữ liệu điểm chuyển vùng ở một map đặc thù; chưa chứng minh các thành thị dùng cùng cơ chế hay có thể lấy nguyên ranh giới này cho thành.
- Map sinh hiện có `traps.json`: Phượng Tường1 có146 điểm/7hash, Biện Kinh37 có132 điểm/9hash. Đối chiếu hash với đường Lua được biết từ manifest PAK chưa tìm thấy script tương ứng. Không khẳng định toàn bộ trap là cửa thành hoặc đã phục hồi ranh an toàn gốc; không suy ranh bằng hình màu ground hay obstacle.
- GitNexus jx-system-online index khớp HEAD aca6c91 (còn thay đổi chưa commit), context commandCast/canAttack khớp source. Index Client_VLTK_SHXT ngày2026-11-02 không có execution flows, query không đưa bằng chứng liên quan nên dùng bảng/script thật. Không refresh index nguồn gốc trong lượt chỉ nghiên cứu.

## 3. Thiết kế đề xuất, chưa triển khai

Thêm phần Vùng an toàn trong Map Manager hiện có, không đưa vào Map Creator hay form NPC. Chọn map thành thị; vẽ một/nhiều polygon theo tường/cổng, sửa điểm/kéo đỉnh, xóa vùng có xác nhận, tô lớp phủ bật/tắt; xem vị trí đang chọn thuộc vùng nào. Cần hỗ trợ click và cảm ứng, phóng to/pan đang có. Không thêm thư viện hình học cho phép thử point-in-polygon đơn giản.

Nguồn cấu hình riêng theo map (ví dụ packages/shared/src/maps/town-safe-zones.json; tên đề xuất), không sửa catalog.gen.ts. Kiểm vertex/tọa độ/polygon không tự cắt/diện tích trước lưu. Có thể biên dịch thành mask ô nhỏ nếu đo thực tế cần, nhưng không đọc nav walkable thành luật an toàn. Cạnh polygon được coi an toàn để tránh khe hở. Map chưa cấu hình giữ hành vi cũ an toàn toàn map; không tự mở PK cả thành nếu vùng chưa hợp lệ.

Luật đề xuất:

| Vị trí | Dùng chiêu chủ động | Đánh quái | PK người |
|---|---|---|---|
| Trong vùng an toàn | Cấm, gồm chiêu hỗ trợ chủ động | Cấm | Cấm |
| Ngoài vùng an toàn, trên map đã cấu hình | Cho phép theo điều kiện kỹ năng hiện có | Cho phép nếu có quái | Theo chế độ PK, phe, tổ đội, tân thủ hiện có |
| Một bên ở trong, một bên ở ngoài | Không gây sát thương xuyên ranh giới | Không đánh vào trong | Cấm đánh xuyên ranh giới |

Server là nguồn quyết định theo tọa độ, cập nhật ở bước di chuyển và trước thi triển/va chạm. Không chỉ kiểm lúc nhận C2S.cast: yêu cầu xếp hàng có thể được gửi ngoài rồi người vào thành, hoặc đạn bay khi mục tiêu bước vào vùng an toàn. Phải xét cả người đánh và mục tiêu tại thời điểm tác động, vùng đánh lan và hành vi quái; hủy ý định đánh đang chờ khi vào vùng. Không cho bước ra tự động biến chế độ Luyện công thành Đồ sát. Có thể giữ lựa chọn PK trước đó nhưng vô hiệu hóa quyền đánh trong vùng; chính sách giao diện đổi PK trong vùng cần duyệt rõ.

Client dùng cùng phép xác định vùng để hiện “Khu an toàn / Khu chiến đấu”, khóa thao tác/target hint hợp lý; server vẫn kiểm mọi yêu cầu. Luật shared dùng được Web/Desktop/Mobile; editor hiện loopback browser trên desktop, hỗ trợ cảm ứng không đồng nghĩa đã đóng gói native/mobile.

## 4. Phạm vi cần chốt và kiểm chứng nếu triển khai

- “Không dùng chiêu” mặc định hiểu cấm phát động mới mọi chiêu. Giữ kỹ năng đã học/bị động; hào quang đang duy trì là lựa chọn riêng, không tự xóa. Không thay các hiệu ứng đang tồn tại nếu chưa có chính sách được duyệt.
- Cần thiết kế riêng cho sát thương đang kéo dài khi người đi vào thành; quyết định bảo vệ mới hay giữ hệ quả giao chiến cần đọc tài liệu effects trước sửa. Nghiên cứu này chưa thay luật đó.
- Không đổi quyền NPC theo sprite/hướng, không vô tình cho mua đồ/rương từ xa ngoài cổng chỉ vì city map. Quyền dịch vụ cần quyết định riêng với kiểm tra server hiện có, không ngầm sửa cùng combat.
- Kiểm điểm trong/ngoài/cạnh/nhiều polygon, người hai bên ranh, quái đuổi vào, chiêu xếp hàng, đạn/đánh lan đã phát, spawn/đăng nhập/chuyển map, client gửi giả và các mode PK hiện có. Kiểm NPC vẫn đúng dịch vụ và vùng khác/map chưa chỉnh giữ hành vi cũ.

Chưa sửa code, cấu hình map, tài nguyên, DB hoặc chạy thay đổi gameplay. Không commit/push.
