# Auto — cài đặt, lưu và chạy theo nhân vật

> Nguồn chuẩn cho chủ đề **Auto / AUTO / tự động đánh** trong game và bot. Cập nhật 2026-11-14. Mã triển khai: `a7180d3` (chọn chiêu/boss/loot) và `7491d71` (lưu theo nhân vật, nút điều khiển và khôi phục).

## Điều khiển và lưu cài đặt đã triển khai

- **Z** hoặc nút AUTO trên thanh chức năng mở hộp thoại. **Chạy auto / Dừng auto** trong hộp thoại và nút **▶ / ❚❚ Auto** cạnh bảng tên bật/tắt.
- Mỗi nhân vật có `CharacterRecord.auto` gồm cài đặt và trạng thái bật. Server xác thực nhân vật từ kết nối, chuẩn hóa giá trị và lưu DB; không lấy ID nhân vật do client gửi.
- Cache `vltk.auto.character.<charId>` giúp hiện cài đặt nhanh. Khi vào bản đồ, bản server luôn đối chiếu và thay cache cũ. localStorage bị chặn/hỏng vẫn lấy được server. Không dùng cài đặt Auto toàn máy cho nhân vật khác.
- Reload/đăng nhập lại tự tiếp tục nếu lần trước bật. Đây là Auto trong phiên chơi, không chạy khi người chơi đã đóng game. Trong thành, nếu tắt tự đổi bãi thì chờ, không tự tắt trạng thái đã lưu.
- Bot lấy lựa chọn từ kịch bản, ghi cấu hình Auto đang chạy vào nhân vật; dừng runner ghi trạng thái tắt.


## Kỹ năng, quái và boss

- Người chơi dùng chiêu tấn công trên thanh phím; bot tự xếp chiêu đã học theo ReqLevel, vũ khí và trạng thái cưỡi. Chiêu có `noHorse` bị loại khi cưỡi; bot xếp lại khi lên/xuống ngựa.
- Xoay chiêu áp dụng cả trên boss. Khi chiêu chính chưa sẵn sàng, tìm chiêu tấn công khác dùng được trước khi đánh thường. Không đưa đánh thường vào vòng xoay khi có chiêu tấn công thật.
- Chiêu 90/120/150 vẫn cần đủ điều kiện cấp và đã học. Không có tầng chiêu 70 riêng trong dữ liệu hiện tại. Template bot có tùy chọn tự học đủ điều kiện; chạy kịch bản không tự reset tiến trình tài khoản cũ.
- Mặc định mới không bỏ boss; ưu tiên **Hoàng Kim (2) → Boss Xanh (1) → quái thường (0)**. Sửa việc giữ mục tiêu thường khi có boss ưu tiên cao hơn. Vẫn có lựa chọn gần nhất và bỏ qua boss.
- Cài đặt cũ đã lưu không bị mặc định mới ghi đè. Muốn đánh boss, tắt **Bỏ qua boss** và chọn ưu tiên boss. Mục tiêu phải cùng bản đồ, còn sống, trong vùng tìm kiếm và không đang bị loại tạm vì kẹt/không gây sát thương.

## Nhặt đồ và bán cho NPC

- Nhặt ngân lượng là tùy chọn riêng, không cần chỗ trong túi và không phụ thuộc bật nhặt trang bị. Trang bị chỉ nhặt khi còn vùng trống đủ kích thước.
- Lọc đồ: tất cả, xanh trở lên hoặc chỉ tiền; kết hợp công tắc nhặt ngân lượng độc lập.
- Tự bán đồ trắng không mặc được; tùy chọn **Tự bán đồ xanh trong túi** kiểm tra mỗi 30 giây và khi về thành. Bán xanh mặc định tắt cho cài đặt mới; preset `luyen-cong-30` bật kèm bảo vệ.
- Bảo vệ đồ xanh có giá trị: món trên 5 dòng hoặc có dòng ẩn hiếm/cao theo tiêu chí đáng chú ý của bot; bổ sung giữ món đạt bộ định giá xanh/hoàng kim trong [Rao bán](rao-ban.md). Không bán hoàng kim, ngựa, thuốc, bí kíp, lệnh bài hoặc đồ đang mặc. Đồ xanh dự trữ trong túi vẫn có thể bị bán nếu bật bán xanh và không thuộc nhóm được bảo vệ.
- Túi toàn món được bảo vệ thì bỏ qua trang bị không vừa, vẫn nhặt tiền; cần dọn túi. Tự bán NPC khác với đăng tin Rao bán, không tự biến thành giao dịch người chơi.

## Bản đồ mã nguồn

| Phần | File |
|---|---|
| Cài đặt mặc định, chuẩn hóa và kiểu bản lưu | `packages/shared/src/auto/settings.ts` |
| Bộ não Auto chung người chơi/bot | `packages/shared/src/auto/AutoPlay.ts` |
| Database nhân vật | `apps/server/src/account/db.ts` → `CharacterRecord.auto` |
| Nhận/lưu/gửi cài đặt theo kết nối | `apps/server/src/net/MapRoom.ts` → `C2S/S2C.autoConfig` |
| Cache và đối chiếu server | `apps/client/src/state/characterAuto.ts` |
| Cài đặt runtime, tách khỏi cấu hình toàn máy | `apps/client/src/state/settings.ts` |
| Dialog và nút điều khiển | `apps/client/src/ui/windows/auto.ts`, `apps/client/src/ui/hud/Hud.ts`, `notices.ts` |
| Phím Z và nối bộ não vào game | `apps/client/src/input/keymap.ts`, `apps/client/src/game/WorldScene.ts` |
| Thanh chiêu, đồng bộ Auto của bot | `tools/bots/runner/BotClient.ts` |

## Kiểm chứng và giới hạn

- `npm run test:auto`: 4 ca chọn chiêu/boss, tiền khi túi đầy, bán xanh bảo vệ và chờ trong thành.
- `npm run test:market`: có ca tách cache từng nhân vật, server thay cache cũ và localStorage lỗi; các ca còn lại thuộc tài liệu Rao bán.
- Typecheck/build và `npm run test:bots` đạt. WebSocket thật xác nhận lưu DB và khôi phục khi vào lại. Chromium desktop1440 và viewport390px xác nhận Z chỉ mở, nút chạy/dừng, reload tiếp tục và quick pause; đã xem ảnh.
- Kiểm thử riêng cổng2568/5174, DB `/tmp/jx-market-auto/db.json`; không tác động game người dùng. Chưa kiểm wrapper native/điện thoại thật hoặc cân bằng kỹ năng/boss toàn bộ môn phái.
- Cache dùng localStorage trên web và wrapper cung cấp API này; server vẫn là nguồn đối chiếu. Trạng thái enabled không đồng nghĩa tự chơi khi đã đóng game.

## Tài liệu liên quan

- [Rao bán, kênh Mua bán và Kim nguyên bảo](rao-ban.md): tin gắn vật phẩm, tiêu chí bot rao và thanh toán.
- [Hướng dẫn bot](bots-guide.md), [thiết kế bot](bots.md): roster, template và kịch bản chạy.
