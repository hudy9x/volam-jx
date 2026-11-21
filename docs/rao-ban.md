# Rao bán — kênh Mua bán, vật phẩm và Kim nguyên bảo

> Nguồn chuẩn cho **Rao bán / Mua bán / marketplace / Kim nguyên bảo / KNB** trong game và bot. Cập nhật 2026-11-14. Triển khai ở commit `7491d71`; tiêu chí món đáng rao có trước ở bộ bot, được dùng lại.

## Rao vật phẩm và mua trực tiếp đã triển khai

Hành trang → **Rao bán** → click vật phẩm → chọn **Ngân lượng** hoặc **Kim nguyên bảo**. Bắt buộc giá nguyên dương. Theo USER2026-11-14, đã bỏ hình thức Liên hệ vì chưa hoạt động; server từ chối cả client cũ cố đăng `currency:contact`. Lệnh bài không rao được. Đăng tin không lấy món khỏi túi.

Kênh **Mua bán** nhận cả tin nhắn thường và tin gắn vật phẩm. Bấm tên món mở cửa sổ ảnh và thuộc tính của đúng món (các dòng đã roll), kèm người bán và giá. **Mua với giá…** thực hiện giao dịch ngay. Tin liên hệ cũ chỉ còn snapshot để xem, hiện thông báo ngừng hỗ trợ và không có nút mua; người bán cần đăng lại với giá lượng/KNB. Không tự đổi tin cũ thành giá0 hoặc xóa lịch sử. Chưa có đổi trang bị lấy trang bị.

Người bán phải trực tuyến. Server kiểm tra món còn trong túi và chưa đổi thuộc tính, người mua đủ tiền/chỗ trống, ví người bán chưa vượt giới hạn. Chuyển tiền và món đồng bộ, đánh dấu tin đã bán, lưu hai nhân vật; không có đoạn chờ giữa kiểm tra và chuyển. Tin trùng cùng một món không mua được lần hai. Nếu người bán đã bán NPC/mặc/vứt/sửa món, tin cũ chỉ còn preview và việc mua bị từ chối. Không khóa/giữ hộ món khi đăng rao, không bán offline.

Mua bán có lịch sử công khai trong giới hạn cửa sổ **30 phút (`CHAT.tradeWindowMs`) và tối đa 50 tin (`CHAT.tradeMaxLines`)**; người đăng nhập sau vẫn thấy các tin còn trong bộ lọc này. Thế giới giữ lịch sử theo tài khoản như cũ. Ảnh/thuộc tính được chụp từ món trên server, không nhận snapshot do người rao tự gửi. Văn bản hiển thị bằng textContent.

## Tiền

- Kim nguyên bảo là số dư riêng theo nhân vật, hiện bên dưới ngân lượng trong hành trang.
- Kỳ Trân Các trong thành bán **1 Kim nguyên bảo = 100 vạn lượng**. Mỗi lần mua 1–99; không có đổi ngược.
- Cả hai số dư giới hạn 2 tỷ, kiểm tra ở server. Không cộng KNB cho tài khoản cũ; mặc định 0.
- Định dạng ngân lượng dùng chung cho hành trang, giá/tooltip/cửa hàng và tiền dưới đất: `12300 → 1 vạn 2300 lượng`, `10000 → 1 vạn lượng`, `10000000 → 1000 vạn lượng`, `100000000 → 10.000 vạn lượng`.


## Rao bán của bot

- Chỉ xét món vừa **nhặt thành công từ đất**, qua `InventoryMsg.pickedUp` dùng một lần; không rao inventory ban đầu, đồ khởi tạo, mua NPC, chế tạo hoặc inventory gửi lại khi reconnect.
- Món đáng chú ý để Chat/bảo vệ khỏi bán NPC: đạt bộ định giá mới, hoặc trên 5 dòng thuộc tính khác0, hoặc có dòng ẩn hiếm/cao. Ngưỡng đang dùng trong `BOT_TRADE_RULES`: trọng số hiếm ≤1200; giá trị dòng ẩn ≥90% mức tối đa tương ứng. Đây là lựa chọn của project, không phải công thức gốc được xác nhận.
- Hàng đợi giới hạn20, chống lặp UID (ghi nhớ tối đa2000), giãn ít nhất60 giây/bot và5 giây/toàn runner; trước khi gửi kiểm tra món còn trong túi.
- Bật Rao bán thì món phải đạt bộ định giá xanh/hoàng kim bên dưới, gửi tin gắn vật phẩm lên **Mua bán** với giá lượng/KNB do server tính; người chơi có thể mua ngay. Bot không tự mua/giao dịch. Nếu bật cả Chat và Rao bán thì chỉ gửi một tin rao; chỉ bật Chat thì thông báo món vừa nhặt ở Thế giới.
- Tự bán xanh cho NPC và bảo vệ món đáng rao thuộc [Auto](auto.md); đăng tin không khóa vật phẩm khỏi mọi thao tác khác.

## Định giá bot theo cấu hình (2026-11-14)

**Nghiên cứu bước tiếp theo:** [Phương án định giá theo thị trường](research/market-pricing-plan.md) lưu tư duy kinh tế, dữ liệu đã có/còn thiếu và lộ trình học giá. Đọc khi nhắc giá thị trường/cung cầu/học giá; phần này chưa triển khai, không bật được chỉ bằng đổi cờ cấu hình.

Nguồn duy nhất: `packages/shared/src/formulas/data/market-pricing.json`, export qua `formulas/tuning.ts` → `MARKET_PRICING`; phép tính ở `formulas/market.ts` → `valueMarketItem`. Đây là giá khởi điểm **CHỌN**, chưa được xác nhận bằng thị trường. Không sửa bảng `*.gen.ts`. Sau khi sửa JSON, khởi động lại server và runner để cùng nạp cấu hình; công cụ bot bundle lại khi khởi động.

| Khóa | Tác dụng |
|---|---|
| `green` / `gold` | Giá nền, tiền mỗi cấp món (cấp trang bị, không phải cấp nhân vật), sàn/trần, điểm tối thiểu để rao |
| `attributes`, `kindAttributes` | Trọng số dòng thực dụng; trọng số theo loại món ghi đè trọng số chung. Dòng không biết/âm/không hợp lệ không nâng giá |
| `quality` | Hệ số chất lượng, giá trị dự kiến của dòng ẩn (chưa giả định mọi người mua đều kích hoạt), thưởng phối hợp |
| `profiles` | Tổ hợp Ngoại công/Nội công/Phòng thủ, số dòng tối thiểu và dòng bắt buộc; chỉ lấy nhóm phù hợp đầu tiên, không cộng trùng |
| `kindMultipliers` | Hệ số theo loại món |
| `itemOverrides` | Ghi đè từng ID món: `baseMoney`, `minMoney`, `maxMoney` |
| `currency` | Bước làm tròn lượng và ngưỡng dùng KNB; chỉ đổi khi giá sau làm tròn vẫn trong sàn/trần |
| `history` | Giữ tối đa5000giao dịch; `learningEnabled:false` — chưa hỗ trợ bật học giá |

Đồ xanh: chuẩn hóa từng dòng theo mức tối đa đúng loại/cấp/hệ/tiền-hậu tố; cộng trọng số, giảm đóng góp dòng ẩn, chia `green.targetWeight`, giới hạn điểm0–1. Ngưỡng rao mặc định0,3. Đồ hoàng kim: so từng dòng với **khoảng roll riêng đúng món**, tính trung bình có trọng số; không dùng khoảng của đồ xanh. Có dòng hữu ích mới định giá được; không chỉ dựa số dòng hoặc màu vàng. Đây là quy tắc gần đúng theo công dụng, chưa mô phỏng tăng DPS/HP trên từng build/phái.

```text
Giá nền = baseMoney + perLevelMoney × cấp món (hoặc baseMoney ghi đè)
Giá tính = Giá nền × hệ số loại × (0,5 + 1,5 × điểm) × thưởng phối hợp
Giá rao = làm tròn, giới hạn sàn/trần; chọn lượng hoặc KNB
```

Mặc định xanh giá nền2000+500/cấp, sàn1000, trần50000lượng vì còn chế tạo miễn phí qua Lệnh bài. Hoàng kim giá nền200000+10000/cấp, sàn100000, trần20000000lượng. Các con số chỉ phục vụ thử nghiệm và phải hiệu chỉnh theo thu nhập, nguồn đồ và sức mua thật. KNB từ5000000lượng, quy chiếu `KNB_PRICE`100vạn/KNB (giá hệ thống một chiều, không phải tỉ giá thị trường tự do).

Runner vẫn chỉ xét pickup mới, chống lặp/cooldown như trên; món xanh ít hơn6dòng vẫn có thể đạt điểm. Server xác thực bot qua tài khoản/nhân vật trong DB, tự đọc món trong túi, bỏ qua giá runner gửi khi `autoPrice:true`. Snapshot tin có `valuation`: phiên bản, điểm, nhóm, giá và lý do; cửa sổ vật phẩm hiển thị lý do cùng nút mua. Đăng rao không khóa món; không tự rao lại hoặc tự hạ giá sau thời gian chờ trong bản này.

Sau mua thành công, server lưu các món định giá được vào `db.marketSales` riêng khỏi chat: thời điểm, UID/món/nhóm/điểm, tiền và giá thực trả, hai nhân vật. Không ghi mua thất bại; một UID chỉ ghi lần đầu trong cửa sổ lịch sử. `eligible:false` cho cùng tài khoản hoặc người mua là bot; chưa phát hiện được nhiều tài khoản cùng người hay thông đồng. Dữ liệu này **chưa tác động giá**; chưa học trung vị, cung cầu, thời gian online có thể bán hoặc tự tăng/giảm. Không coi giá rao của bot là giao dịch thị trường.

Kiểm chứng mới: `test:market` có thêm `tests/market-pricing.test.mts`, kiểm giá/roll/giới hạn tiền/quyền bot/server tự định giá/mua/lưu và lỗi không ghi lịch sử. `test:bots`, `test:auto`, typecheck/build; WebSocket + Chromium trên2568/5174 với DB riêng `/tmp/jx-bot-pricing/db.json`: pickup queue→rao có giá→preview/lý do/nút mua→mua thành công→DB. Xem ảnh tool và preview ở1440/390px; chưa thử native/mobile thật, chưa đo cân bằng kinh tế.

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

- `npm run test:market`: gồm định dạng vạn/chuẩn hóa Auto, chuyển món và lượng/KNB/chống lặp, các lỗi không làm đổi ví/túi, mua KNB, cache Auto và lịch sử Mua bán công khai không lộ lịch sử Thế giới của tài khoản khác.
- `npm run test:bots` kiểm tiêu chí món, fresh pickup, chống lặp và cooldown. Typecheck/build đạt.
- WebSocket thật kiểm mua lượng, mua KNB, mua lặp bị từ chối, mua KNB từ hệ thống và số dư DB. Chromium kiểm rao, preview ảnh/thuộc tính, mua bằng KNB, mua KNB tại Kỳ Trân Các và số dư hành trang; đã xem ảnh desktop1440/viewport390px cho form/preview.
- Thử riêng2568/5174 với DB `/tmp/jx-market-auto/db.json`; không tác động game người dùng. Chưa kiểm wrapper native/điện thoại thật.
- Không bán offline, không escrow/giữ hộ món, chưa đổi trang bị lấy trang bị. Tin rao cũ có thể hết hiệu lực dù vẫn xem snapshot được; server quyết định tại thời điểm mua.

## Kiểm chứng bổ sung chế độ chỉ dùng tiền (2026-11-14)

- `TradeCurrency`/`TradePostMsg` chỉ nhận money/knb; `TradeOffer` vẫn đọc được contact của lịch sử cũ. UI chỉ có hai lựa chọn tiền, giá bắt buộc; server chặn contact/đơn vị lạ, kể cả client cũ. `purchaseOffer` từ chối tin contact cũ.
- `test:market`13ca đạt, gồm từ chối tin mới contact/đơn vị sai và mua tin cũ không đổi ví/túi. WS thật2568/DBriêng `/tmp/jx-bot-team-market/db.json` kiểm từ chối contact + mua lượng/KNB/lưu lịch sử. Chromium1440/390 kiểm form hai tiền/giá bắt buộc/preview contact cũ không nút mua. Chưa native/mobile thật.

## Bày bán trực tiếp trên Hành trang — Player Stall (2026-11-21, commit `eabe757`)

Thay thế hoàn toàn cửa sổ Chợ thành thị danh sách trước đây bằng cơ chế **Bày bán trực tiếp trên Hành trang** theo JX1 (`volam-3005/documents/co-che-bay-ban.md`):
- **Không có túi sạp riêng:** người chơi bật **Định giá** trong **Hành trang** (`apps/client/src/ui/windows/inventory.ts`) để đặt giá trực tiếp lên vật phẩm ở **2 trang đầu Hành trang (`0..STALL_SIZE-1 = 120` ô)** qua `Item.stallPrice?: { price, currency }`. Hỗ trợ **Ngân lượng** hoặc **Kim nguyên bảo (`knb`)**, giá nguyên dương `1..MAX_MONEY`, cấm định giá `TOKEN_ITEM_ID` và `TOWN_PORTAL_ID`.
- **Điều kiện mở sạp (`PermitTrade`):** ở thành thị/thôn trấn an toàn (`MAPS[mapId]?.safe`), không tử vong, không ở trạng thái chiến đấu (`!attackTarget`), không cưỡi ngựa (`!mounted`), **đẳng cấp ≥ 60 (`STALL_MIN_LEVEL = 60`)**, đứng cách NPC chức năng **> 80 px (`STALL_NPC_CLEARANCE = 80`)**, có ít nhất 1 món đã định giá ở 2 trang đầu, và lời mời chào dài **1–20 ký tự (`STALL_TITLE_MAX = 20`)**. Đóng sạp (`stallClose`) không bị chặn bởi điều kiện mở.
- **Hiển thị & tương tác thế giới:** khi mở sạp, `Actor.stallTitle` đồng bộ qua Colyseus schema; `ActorView` vẽ bảng hiệu 3 mảnh SPR gốc giải mã từ `VLTK-SHXT` (`stall-left.webp`, `stall-mid.webp`, `stall-right.webp` trong `tools/gen-ui.ts`) hiển thị đúng nguyên văn lời rao phía trên tên nhân vật. Người mua cùng thành thị click/chạm trực tiếp vào nhân vật (`WorldScene.ts` → `C2S.stallInspect`) để mở cửa sổ **Sạp hàng** (`apps/client/src/ui/windows/bazaar.ts`) gồm **1 trang lớn duy nhất 120 ô (`10 cột × 12 hàng`)** chứa các món đang bán. Hover xem thuộc tính + giá (style `.tip-stall-price` đồng bộ thanh tiêu đề `.dlg-title`); Desktop click / Mobile chạm lần 2 mở `TradeConfirm` để mua nguyên tử.
- **Khóa thao tác & đổi chủ:** khi đang bày bán (`!!sim.a.stallTitle`), khóa di chuyển, tung chiêu, lên/xuống ngựa, đổi ô/xếp/tách túi, mặc/cởi đồ, mua/chế tạo, bán/vứt đồ, chuyển rương và không mua sạp người khác. Khi vật phẩm đổi chủ (mua sạp hoặc mua qua chat `market.ts`), rời 2 trang đầu hoặc xuất khỏi túi, `item.stallPrice` tự động bị xóa. Bán hết món cuối hoặc offline sẽ tự đóng sạp và gửi `S2C.stallClosed` đóng cửa sổ phía người mua.
- **Bố cục Hành trang:** `.bag-actions` xếp lưới **2 nút / hàng** (`Tách | Vứt`, `Rao bán | Bán`, `Định giá | Bày bán`). Trạng thái nút `Bày bán` / `Ngưng bán` đồng bộ qua `ownStallTitle` (`state/stall.ts`).
- **Bản đồ mã nguồn:** `packages/shared/src/items/items.ts`, `protocol.ts`; `apps/server/src/net/{schema,MapRoom}.ts`, `world/{stalls,commands,inventory,market,chat}.ts`; `apps/client/src/game/{WorldScene,actors/ActorView,ports}.ts`, `state/{actor,chat,stall}.ts`, `net/room.ts`, `ui/{hud/Hud,hud/quickbar,kit/tooltip.css,tips/itemTip,windows/bazaar,windows/inventory}.{ts,css}`, `tools/gen-ui.ts`; kiểm thử `tests/city-bazaar.test.ts`.

## Tài liệu liên quan

- [Auto theo nhân vật](auto.md): điều khiển, cache/DB, chọn chiêu/boss, nhặt đồ và tự bán NPC.
- [Hướng dẫn bot](bots-guide.md), [thiết kế bot](bots.md): cách chạy các hoạt động bot.
