# Hoa Sơn: phân tuyến kỹ năng và sửa Gợi ý cộng điểm

Ngày: 2026-11-14. Công việc: **KN15**, dành cho session riêng. Trạng thái: đã điều tra, chưa triển khai.

## 1. Phạm vi người dùng chốt

1. Phân biệt rõ **Kiếm Tông** và **Khí Tông** trong dữ liệu kỹ năng Hoa Sơn.
2. Sửa **Gợi ý cộng điểm kỹ năng và tiềm năng** theo tuyến đã chọn.
3. Làm rõ tuyến và vai trò chiêu trong **mô tả kỹ năng ở bảng Kỹ năng**.

Không mở rộng việc này sang triển khai cơ chế khí trường/kích nổ, cân bằng sát thương, sửa thục luyện, thiết kế lại bảng học hoặc thay bộ icon. Các vấn đề cộng hỗ trợ cho kỹ năng 80/120/150 thuộc session KN14. Phát hiện ngoài phạm vi được ghi lại để xử lý riêng.

## 2. Hiện trạng đã xác minh

### 2.1. Hoa Sơn chưa có tuyến trong chức năng Gợi ý

`packages/shared/src/characters/suggest.ts` không có `huashan` trong `CATALOG`. `skillRoutes()` dùng phương án dự phòng `all` — **Tất cả kỹ năng**, gồm 24 chiêu được `skillGrowth()` nhận là cộng điểm. Danh sách này trộn hai tông.

`guessRoute()` chỉ có một lựa chọn; `planSkills()` chia điểm dần vào chiêu có cấp thấp nhất trong danh sách chung. `planPotential()` chọn ngoại công nếu có bất kỳ chiêu ngoại công nào trong tuyến, vì vậy Hoa Sơn hiện luôn dùng tỷ lệ chung **Sức mạnh 65%, Thân pháp 5%, Sinh khí 30%, Nội công 0%**, kể cả nhân vật theo Khí Tông.

```text
Hoa Sơn thiếu CATALOG
          |
          v
Tất cả kỹ năng: Kiếm Tông + Khí Tông
          |
          +--> Điểm kỹ năng chia sang cả hai tông
          +--> Tiềm năng chọn tỷ lệ ngoại công
```

Đã tái hiện bằng hàm shared thật: nhân vật cấp 60, các chiêu thường đã mở, `1372` Thanh Phong Tống Sảng cấp 20, các chiêu khác cấp 0, còn 50 điểm. Phương án vẫn chia sang 19 chiêu, gồm `1347` +4, `1349` +3, `1350` +3, `1351` +3. Gợi ý tiềm năng vẫn trả 65/5/30/0.

Server `applySuggestion()` dùng cùng hàm lập phương án, nên kết quả tác động đến điểm thật khi người chơi đồng ý. Bot dùng cấu hình `suggest` cũng chịu ảnh hưởng.

### 2.2. Trộn tuyến có thể gây bất lợi trực tiếp

`1349` Kiếm Tông Tổng Quyết có `manareplenish_v = -10000` ngay cấp 1. `passiveBag()` nhận thuộc tính này; `players.regen()` đưa nó vào thay đổi nội lực theo thời gian. Vì vậy không được tự đưa bị động này vào phương án Khí Tông chỉ vì hai tông thuộc cùng môn phái. Đã xác minh giá trị và luồng mã; chưa tái hiện nhân vật trong trình duyệt.

### 2.3. Icon không xác định được tuyến hoặc vai trò chiêu

Danh sách học hiện có 28 ID và 21 icon. Bảy nhóm trùng đều có cùng `SkillIcon` trong bảng nguồn:

| Các ID dùng cùng icon | Điểm cần làm rõ trong mô tả |
|---|---|
| 1347 / 1348 | Chiêu sát thương và chiêu có thuộc tính giảm hồi chiêu |
| 1351 / 1352 | 1351 tự gọi 1352 qua sự kiện start |
| 1376 / 1377 | 1376 tự gọi 1377 qua sự kiện start |
| 1355 / 1357 | Chiêu sát thương và chiêu có thuộc tính giảm hồi chiêu |
| 1381 / 1384 | Hai ID khác cấp và chức năng; không đồng nhất vì cùng icon |
| 1363 / 1364 | Chiêu sát thương và chiêu kích hoạt; 1364 gọi 1420, dùng cùng bảng Lua sát thương với 1363 |
| 1368 / 1369 | Chiêu sát thương và chiêu kích hoạt; 1369 gọi 1421, dùng cùng bảng Lua sát thương với 1368 |

Giữ icon gốc. Không gộp/xóa chiêu hoặc suy ra tuyến từ URL icon. Cả hai tông dùng kiếm, nên vũ khí cũng không đủ để phân tuyến.

## 3. Đề xuất sửa trong phạm vi KN15

### 3.1. Khai báo tuyến rõ ràng trong dữ liệu dùng chung

Tạo cấu hình Hoa Sơn với hai tuyến **Kiếm Tông** và **Khí Tông**, dùng chung cho client, server và bot. Tuyến cần xác định loại ngoại/nội công trực tiếp; tránh suy từ một chiêu bất kỳ trong danh sách.

Nhóm dưới đây là điểm bắt đầu để đối chiếu, dựa trên mô tả nguồn và thuộc tính hiện tại; chưa phải danh sách ưu tiên cộng điểm đã chốt:

| Nhóm | Các ID cần rà |
|---|---|
| Kiếm Tông | 1347, 1348, 1349, 1350, 1351, 1352, 1354, 1355, 1357, 1360, 1363, 1364, 1368, 1369 |
| Khí Tông | 1372, 1374, 1375, 1376, 1377, 1378, 1379, 1380, 1381, 1382, 1384 |
| Cần xác minh khả năng dùng chung | 1358, 1365, 1370 |

Phân biệt ba thông tin: **tuyến**, **vai trò chiêu** và **cách lên cấp**. Một chiêu được gọi tự động không mặc nhiên là chiêu cần cộng điểm độc lập. Dùng bảng học hiện hành làm ràng buộc; chưa tự thay đổi tập chiêu được học.

### 3.2. Sửa Gợi ý kỹ năng và tiềm năng

- Có hai lựa chọn rõ ràng, không còn tab duy nhất “Tất cả kỹ năng” cho Hoa Sơn.
- Khi đã chọn tuyến, phương án chỉ phân bổ cho chiêu phù hợp và các chiêu dùng chung đã xác minh; giữ nguyên điểm đã cộng, không tự tẩy điểm trái tuyến.
- Nhận diện tuyến mặc định bằng mức đầu tư vào các chiêu đặc trưng; khi chưa đủ dữ kiện, cho người dùng chọn và thể hiện rõ lựa chọn đang áp dụng.
- Đặt thứ tự ưu tiên chiêu chính, bị động và hỗ trợ phù hợp, thay vì mặc định san đều mọi chiêu. Thứ tự cụ thể phải có giải thích dựa trên tác dụng đang hoạt động.
- Tiềm năng dựa trên loại tuyến rõ ràng và nhu cầu trang bị; không để chiêu Kiếm Tông kéo phương án Khí Tông về ngoại công. Chưa chốt tỷ lệ mới trong tài liệu này; tỷ lệ lựa chọn phải ghi CHỌN, không ghi thành dữ liệu gốc.
- Bảo đảm bản xem trước và server áp dụng cùng một phương án. Kiểm tra bot dùng `suggest` sau khi đổi tuyến mặc định.

### 3.3. Làm rõ mô tả trong bảng Kỹ năng

Trong tooltip/mô tả Hoa Sơn, hiển thị **Tuyến: Kiếm Tông / Khí Tông / Dùng chung** sau khi xác minh. Thêm vai trò ngắn như “Tấn công”, “Bị động”, “Hỗ trợ” hoặc “Thành phần được chiêu … gọi”.

Với các cặp cùng icon, mô tả phải giải thích quan hệ cụ thể, giúp người chơi biết đây là hai chức năng hay cùng một họ chiêu. Không đổi hình để tạo cảm giác khác biệt giả.

Rà lại câu dịch thủ công trước khi dùng để phân tuyến. Ví dụ, mô tả `1381` hiện nói kích nổ, trong khi mapping Lua `new_wuji` chứa chỉ số bảo vệ/hồi phục. Mô tả sau sửa phải khớp dữ liệu và hành vi thực tế; không khẳng định cơ chế chưa được triển khai đang có hiệu lực.

Giữ bố cục cột cấp hiện tại trong phạm vi công việc này. Web/Desktop xem bằng rê chuột; Mobile cần mở cùng nội dung bằng chạm, không phụ thuộc hover. Không thay cách dựng hình 1:1.

## 4. Điểm cần lưu ý khi thực hiện

`1363` và `1368` hiện được `skillGrowth()` nhận là cộng điểm, còn `1364` và `1369` là thục luyện. Đây là đầu vào hiện tại cần nhận biết khi lập phương án; sửa quy tắc thục luyện là công việc khác, không tự gộp vào KN15.

Các cơ chế như `reduceskillcd`, `manatoskill_enhance`, `candetonate` còn thiếu xử lý runtime. KN15 làm rõ tuyến và mô tả, không tự triển khai chúng. Nếu điều này làm một chiêu chưa đáng ưu tiên, nêu rõ trong phương án thay vì quảng bá tác dụng chưa có.

## 5. File cần đọc trong session thực hiện

| File | Vai trò |
|---|---|
| `apps/client/tools/data/huashan.ts` | Tên/mô tả dịch tay, bảng học Hoa Sơn |
| `packages/shared/src/skills/factions/huashan/skills.gen.ts` | Dữ liệu đang được nạp; chỉ đọc, không sửa tay |
| `packages/shared/src/characters/suggest.ts` | skillRoutes, guessRoute, planSkills, planPotential |
| `packages/shared/src/skills/core/learning.ts` | Quy tắc cộng điểm/thục luyện và giới hạn |
| `packages/shared/src/skills/core/describe.ts` | Mô tả kỹ năng dùng chung |
| `apps/client/src/ui/windows/skills.ts` | Bảng Kỹ năng |
| `apps/client/src/ui/windows/suggest.ts` | Chọn tuyến và xem trước phương án |
| `apps/server/src/world/progress.ts` | Server áp dụng phương án |
| `apps/server/src/world/botSetup.ts` | Bot sử dụng Gợi ý |

Nguồn đối chiếu: `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`, đọc `CLAUDE.md` tại đó trước. Dùng bảng PAK thắng ưu tiên qua `tools/jx/source.ts`; Lua Hoa Sơn hiện lấy file rời `script/skill/huashan.lua`. Không đổi chính sách nguồn toàn cục trong KN15.

## 6. Nghiệm thu

- Hai tuyến Hoa Sơn xuất hiện rõ trong Gợi ý; nhân vật theo Khí Tông không bị tự cộng Kiếm Tông Tổng Quyết.
- Tái hiện lại tình huống cấp 60 / 1372 cấp 20 / 50 điểm dư: phương án đúng tuyến, tổng điểm hợp lệ và bản áp dụng khớp bản xem trước.
- Tiềm năng Khí Tông không còn tự chọn tỷ lệ ngoại công do danh sách trộn; nhu cầu trang bị vẫn được tính.
- Mô tả thể hiện đúng tuyến và phân biệt vai trò của các cặp cùng icon; không thay icon hoặc xóa entry học chỉ dựa trên hình.
- Điểm cũ, giới hạn cấp và bí kíp được giữ đúng; các phái khác không bị thay đổi ngoài chủ ý.
- Chạy typecheck và kiểm tra trình duyệt trên cổng riêng 2568/5174, DB thử riêng; kiểm tra thao tác xem mô tả bằng chuột và chạm. Ghi rõ nếu chưa thử wrapper Desktop/Mobile thật.
