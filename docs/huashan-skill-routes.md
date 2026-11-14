# Hoa Sơn: phân tuyến kỹ năng và sửa Gợi ý cộng điểm

Ngày: 2026-11-14. Công việc: **KN15**, dành cho session riêng. Trạng thái: **đã triển khai KN15, commit theo USER (xem git log -1)**; phần §2 ghi hiện trạng lúc bàn giao, kết quả hiện tại ở §7.

## 1. Phạm vi người dùng chốt

1. Phân biệt rõ **Kiếm Tông** và **Khí Tông** trong dữ liệu kỹ năng Hoa Sơn.
2. Sửa **Gợi ý cộng điểm kỹ năng và tiềm năng** theo tuyến đã chọn.
3. Làm rõ tuyến và vai trò chiêu trong **mô tả kỹ năng ở bảng Kỹ năng**.

Không mở rộng việc này sang triển khai cơ chế khí trường/kích nổ, cân bằng sát thương, sửa thục luyện, thiết kế lại bảng học hoặc thay bộ icon. Các vấn đề cộng hỗ trợ cho kỹ năng 80/120/150 thuộc session KN14. Phát hiện ngoài phạm vi được ghi lại để xử lý riêng.

## 2. Hiện trạng đã xác minh lúc bàn giao (trước cập nhật Gợi ý)

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

## 7. Kết quả triển khai — 2026-11-14

USER duyệt kiểm tra lại và triển khai, yêu cầu giữ cập nhật Gợi ý ưu tiên Trấn phái. Khi bắt đầu, mã đã có hai tuyến Hoa Sơn và thứ tự **Trấn phái → cấp 10 → san đều các chiêu còn lại trong tuyến → giữ dư**. Phần §2 không còn là mô tả mã hiện tại. Thuật toán ưu tiên mới được giữ nguyên.

### 7.1. Dữ liệu tuyến và Gợi ý

- `packages/shared/src/skills/factions/huashan/routes.ts` là cấu hình chỉnh tay dùng chung: đủ 28 entry học, tách tuyến/vài trò khỏi danh sách nên cộng điểm. Không suy từ icon hoặc vũ khí.
- Kiếm Tông/Khí Tông dùng nhóm ID ở §3.1. `1358` trấn phái, `1365` cứu nguy và `1370` thất truyền được xếp Dùng chung theo mô tả Hoa Sơn chung, thuộc tính không có hạn chế tông; đây là lựa chọn phân tuyến của project, không khẳng định có bảng học gốc riêng cho hai tông.
- Giữ các chiêu được Gợi ý trước lượt này. Bổ sung hai chiêu tấn công trực tiếp `1363`/`1368` vào Kiếm Tông và `1365` dùng chung; chỉ cộng khi đã học, theo `raiseError`, không mở bí kíp thay người chơi. Không đưa entry thành phần/kích nổ/giảm hồi chiêu hoặc `1370` chưa có runtime vào phương án.
- `1358` vẫn là chiêu Trấn phái được ưu tiên; `1365` được san ở nhóm còn lại, không nâng nó lên ưu tiên Trấn phái. Không tự tẩy điểm đã cộng trái tuyến. Nhận diện tuyến tính điểm trên toàn bộ ID đặc trưng (kể cả thành phần/thục luyện), bỏ các chiêu chung; hòa/chưa có điểm dùng tuyến đầu, hai tab thể hiện rõ và cho đổi.
- Loại công được khai báo trực tiếp: Kiếm Tông ngoại công, Khí Tông nội công. **CHỌN:** tái dùng tỷ lệ chung hiện hành (ngoại 65/5/30/0; nội 0/5/90/5), không thêm tỷ lệ tự nhận là dữ liệu gốc. Vẫn ưu tiên đủ Sức mạnh/Thân pháp cho trang bị và giữ điểm cũ.
- Client xem trước, server áp dụng và thiết lập bot tiếp tục dùng các hàm chung. Không sửa cơ chế chiến đấu/kinh nghiệm/thục luyện; không đổi kết quả của 10 phái còn lại.

### 7.2. Mô tả và thao tác xem

- `describeSkill()` bổ sung tuyến/vai trò, quan hệ bảy cặp cùng icon, ghi rõ các cơ chế chưa hỗ trợ. Câu chỉnh nằm trong file metadata chỉnh tay; không sửa `*.gen.ts`, không chạy generator hay đổi asset.
- `1381` được mô tả là thành phần bảo vệ/hồi phục do `1380` gọi, theo mapping `new_wuji`; `1365` là bị động cứu nguy hồi sinh lực qua `1366`, theo Lua `zixia_jianqi`/`zixia_xiaoguo`, thay câu cũ nói giảm hồi phục địch.
- Phát hiện ngoài phạm vi: `1364.autoreplyskill` đóng gói cờ phía trên ID (`66899 = 65536 + 1363`); `triggersOf()` hiện không giải cờ nên bỏ nhánh đáp trả. Đã ghi rõ trong mô tả, chưa sửa engine trong KN15. Nhánh start gọi1420 vẫn giữ nguyên.
- `1375`/`1378`/`1379` vẫn nằm trong tuyến Gợi ý vừa cập nhật để giữ phạm vi; mô tả cảnh báo rõ chuyển sát thương thành nội lực/phản vào nội lực/chuyển nội lực tăng uy lực chưa có runtime. Hoàn thiện tác dụng hoặc đổi chính sách ưu tiên các chiêu này là việc riêng.
- Rê chuột giữ tooltip hiện có. Popup chọn chiêu thêm nút **Mô tả**, mở cùng nội dung trong cửa sổ `dialog.ts` có vùng cuộn, dùng được bằng chạm; giữ bảng màu vàng/xanh/trắng, bố cục cột cấp và hình 1:1. Web/Desktop dùng chuột; Mobile dùng chạm. Chưa thử wrapper native thật.

### 7.3. Kiểm chứng

- `node --import tsx --test tests/huashan-routes.test.ts`: 5 test đạt, bao gồm tình huống cấp60/1372=20/50điểm, thứ tự ưu tiên, giữ dư, tiềm năng+nhu cầu đồ, đủ28entry và mô tả, vòng áp dụng server trên mọi tuyến/cấp10–200 của11phái.
- So sánh mã trước sửa với mã mới: **448 trường hợp kỹ năng và tiềm năng của 10 phái khác không đổi**.
- Typecheck/build/diff-check đạt; build chỉ có cảnh báo chunk lớn có sẵn.
- Server thật2568 + client5174, DB riêng `/tmp/jx-huashan-kn15/db.json`: Chromium kiểm Khí Tông mặc định, nội dung tooltip, xem trước và bấm Đồng ý kỹ năng/tiềm năng. Snapshot server khớp phương án shared, không cộng1349. Không dùng DB/server người dùng.
- Chromium1440×1000 và thiết bị giả lập chạm390×844/390×568: mở mô tả không hover, đọc mô tả dài bằng vùng cuộn; ảnh đã xem. Chưa chạy bot runner thực tế hoặc native Desktop/Mobile. Script/snapshot/ảnh nằm trong `/tmp/jx-huashan-kn15/`.
