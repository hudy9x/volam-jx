# Rao bán — kênh Mua bán, vật phẩm và Kim nguyên bảo

> Nguồn chuẩn cho **Rao bán / Mua bán / marketplace / Kim nguyên bảo / KNB** trong game và bot. Cập nhật 2026-11-14. Triển khai ở commit `7491d71`; tiêu chí món đáng rao có trước ở bộ bot, được dùng lại.

## Rao vật phẩm và mua trực tiếp đã triển khai

Hành trang → **Rao bán** → click vật phẩm → chọn **Ngân lượng**, **Kim nguyên bảo** hoặc **Liên hệ trực tiếp**. Hai loại tiền yêu cầu giá nguyên dương; liên hệ chỉ cần lời rao. Lệnh bài không rao được. Đăng tin không lấy món khỏi túi.

Kênh **Mua bán** nhận cả tin nhắn thường và tin gắn vật phẩm. Bấm tên món mở cửa sổ ảnh và thuộc tính của đúng món (các dòng đã roll), kèm người bán và giá. **Mua với giá…** thực hiện giao dịch ngay. Tin liên hệ không có nút mua. Chưa có đổi trang bị lấy trang bị.

Người bán phải trực tuyến. Server kiểm tra món còn trong túi và chưa đổi thuộc tính, người mua đủ tiền/chỗ trống, ví người bán chưa vượt giới hạn. Chuyển tiền và món đồng bộ, đánh dấu tin đã bán, lưu hai nhân vật; không có đoạn chờ giữa kiểm tra và chuyển. Tin trùng cùng một món không mua được lần hai. Nếu người bán đã bán NPC/mặc/vứt/sửa món, tin cũ chỉ còn preview và việc mua bị từ chối. Không khóa/giữ hộ món khi đăng rao, không bán offline.

Mua bán có lịch sử công khai trong giới hạn lịch sử chat chung; người đăng nhập sau vẫn thấy tin. Thế giới giữ lịch sử theo tài khoản như cũ. Ảnh/thuộc tính được chụp từ món trên server, không nhận snapshot do người rao tự gửi. Văn bản hiển thị bằng textContent.

## Tiền

- Kim nguyên bảo là số dư riêng theo nhân vật, hiện bên dưới ngân lượng trong hành trang.
- Kỳ Trân Các trong thành bán **1 Kim nguyên bảo = 100 vạn lượng**. Mỗi lần mua 1–99; không có đổi ngược.
- Cả hai số dư giới hạn 2 tỷ, kiểm tra ở server. Không cộng KNB cho tài khoản cũ; mặc định 0.
- Định dạng ngân lượng dùng chung cho hành trang, giá/tooltip/cửa hàng và tiền dưới đất: `12300 → 1 vạn 2300 lượng`, `10000 → 1 vạn lượng`, `10000000 → 1000 vạn lượng`, `100000000 → 10.000 vạn lượng`.


## Rao bán của bot

- Chỉ xét món vừa **nhặt thành công từ đất**, qua `InventoryMsg.pickedUp` dùng một lần; không rao inventory ban đầu, đồ khởi tạo, mua NPC, chế tạo hoặc inventory gửi lại khi reconnect.
- Món đáng rao: trên 5 dòng thuộc tính khác0, hoặc có dòng ẩn hiếm/cao. Ngưỡng đang dùng trong `BOT_TRADE_RULES`: trọng số hiếm ≤1200; giá trị dòng ẩn ≥90% mức tối đa tương ứng. Đây là lựa chọn của project, không phải công thức gốc được xác nhận.
- Hàng đợi giới hạn20, chống lặp UID (ghi nhớ tối đa2000), giãn ít nhất60 giây/bot và5 giây/toàn runner; trước khi gửi kiểm tra món còn trong túi.
- Bật Rao bán thì gửi tin gắn vật phẩm lên **Mua bán**, dạng **Liên hệ trực tiếp**. Bot không tự đặt giá hoặc tự mua/giao dịch. Nếu bật cả Chat và Rao bán thì chỉ gửi một tin rao; chỉ bật Chat thì thông báo món vừa nhặt ở Thế giới.
- Tự bán xanh cho NPC và bảo vệ món đáng rao thuộc [Auto](auto.md); đăng tin không khóa vật phẩm khỏi mọi thao tác khác.

## Bản đồ mã nguồn

| Phần | File |
|---|---|
| Kênh chat, offer và thông điệp | `packages/shared/src/protocol.ts` → `ChatLine.offer`, `TradePostMsg`, `TradeCurrency`, `tradePost/tradeBuy/buyKnb` |
| Lấy snapshot, kiểm tra và chuyển món/tiền | `apps/server/src/world/market.ts` |
| Chat công khai Mua bán, lịch sử và cập nhật tin đã bán | `apps/server/src/world/chat.ts` |
| Kết nối người bán online, nhận lệnh và lưu hai nhân vật | `apps/server/src/net/MapRoom.ts` |
| Ví KNB và nạp/lưu nhân vật | `apps/server/src/account/db.ts`, `world/entity.ts`, `world/players.ts` |
| Giá KNB và định dạng vạn | `packages/shared/src/items/shops.ts` → `KNB_PRICE`, `moneyText` |
| Nút Rao bán, con trỏ chọn món và ví trong túi | `apps/client/src/ui/windows/inventory.ts` |
| Dialog đăng rao, preview và mua | `apps/client/src/ui/windows/market.ts` |
| Kênh Mua bán trong HUD | `apps/client/src/ui/hud/chat.ts`, `apps/client/src/state/chat.ts` |
| Mua KNB trong Kỳ Trân Các | `apps/client/src/ui/windows/shop.ts` |
| Nhận kết quả giao dịch | `apps/client/src/net/room.ts`, `apps/client/src/state/market.ts` |
| Bot chọn món và giãn tin | `packages/shared/src/bots/social.ts`, `tools/bots/runner/LootAnnouncer.ts`, `BotClient.ts` |

## Kiểm chứng và giới hạn

- `npm run test:market`: 6 ca gồm định dạng vạn/chuẩn hóa Auto, chuyển món và lượng/KNB/chống lặp, các lỗi không làm đổi ví/túi, mua KNB, cache Auto và lịch sử Mua bán công khai không lộ lịch sử Thế giới của tài khoản khác.
- `npm run test:bots` kiểm tiêu chí món, fresh pickup, chống lặp và cooldown. Typecheck/build đạt.
- WebSocket thật kiểm mua lượng, mua KNB, mua lặp bị từ chối, mua KNB từ hệ thống và số dư DB. Chromium kiểm rao, preview ảnh/thuộc tính, mua bằng KNB, mua KNB tại Kỳ Trân Các và số dư hành trang; đã xem ảnh desktop1440/viewport390px cho form/preview.
- Thử riêng2568/5174 với DB `/tmp/jx-market-auto/db.json`; không tác động game người dùng. Chưa kiểm wrapper native/điện thoại thật.
- Không bán offline, không escrow/giữ hộ món, chưa đổi trang bị lấy trang bị. Tin rao cũ có thể hết hiệu lực dù vẫn xem snapshot được; server quyết định tại thời điểm mua.

## Tài liệu liên quan

- [Auto theo nhân vật](auto.md): điều khiển, cache/DB, chọn chiêu/boss, nhặt đồ và tự bán NPC.
- [Hướng dẫn bot](bots-guide.md), [thiết kế bot](bots.md): cách chạy các hoạt động bot.
