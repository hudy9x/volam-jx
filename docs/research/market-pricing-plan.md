# Nghiên cứu và phương án định giá thị trường cho bot

> Cập nhật 2026-11-14. USER yêu cầu lưu để AI tìm lại ở các session sau. **Chỉ lưu nghiên cứu và phương án; chưa yêu cầu triển khai phần học giá thị trường.** Nguồn chuẩn về tính năng đang chạy: [Rao bán](../rao-ban.md). Các thông số và công thức đề xuất bên dưới là CHỌN, cần duyệt/đo trước khi áp dụng.

Từ khóa tra cứu: định giá đồ, giá thị trường, kinh tế game, cung cầu, học giá, tự điều chỉnh giá, tự tăng giảm giá, bot rao bán, marketplace, marketSales, market-pricing, KNB, ngân lượng, đồ xanh, hoàng kim.

## 1. Điểm đã thống nhất và trạng thái hiện tại

1. Dùng file cấu hình đánh giá riêng đồ xanh và hoàng kim; bot tự đăng giá, người chơi có thể mua ngay.
2. Lưu giao dịch thành công để làm dữ liệu nghiên cứu.
3. Giá tự thích nghi theo thị trường là bước tiếp theo, **chưa triển khai**. Người dùng hỏi lại chủ đề không đồng nghĩa cho phép tự viết mã.

| Phần | Trạng thái xác minh trong mã tại thời điểm ghi |
|---|---|
| Tiêu chí thuộc tính, chất lượng, phối hợp, giá sàn/trần | Đã có `formulas/data/market-pricing.json` |
| Server tự tính giá từng món do bot rao | Đã có `valueMarketItem` + `marketPost(autoPrice:true)` |
| Rao lượng/KNB, preview lý do và mua trực tiếp | Đã có, người bán phải online |
| Ghi giao dịch thành công riêng khỏi chat | Đã có `db.marketSales`, chỉ món định giá được |
| Lấy trung vị giá bán, cân đối cung cầu và độ tin cậy | Chưa có |
| Đo thời gian thực sự có thể bán, hạ giá, rao lại | Chưa có |
| Chống thông đồng nhiều tài khoản, phát hiện giá bất thường | Chưa có đầy đủ |

Bản giá cấu hình được kiểm trong working tree nền `36c9489`, chưa commit tại lúc ghi. Không hiểu nhầm rằng checkout riêng commit nền có toàn bộ tính năng mới. Trước khi tiếp tục phải kiểm tra git và mã thực tế.

## 2. Giá trị món đồ và giá thị trường

Giá trị thực dụng gồm mức cải thiện khi dùng, sự phối hợp thuộc tính và khả năng tìm món thay thế. Giá thị trường còn phụ thuộc người mua, sức mua, nguồn cung và thời gian chờ. Món hiếm không tự động đắt nếu ít người dùng được; sáu dòng lệch công dụng có thể kém bốn dòng phù hợp một lối chơi.

| Tiêu chí | Đồ xanh | Đồ hoàng kim |
|---|---|---|
| Dòng hữu ích | Trọng số theo loại món và hướng công dụng | Giá trị các dòng trên đúng món/bộ |
| Chất lượng roll | So đúng loại/cấp/hệ/tiền-hậu tố | So khoảng roll riêng của đúng dòng hoàng kim |
| Phối hợp | Ngoại công, nội công, phòng thủ; tránh cộng thưởng các dòng xung đột | Kết hợp công dụng và giá trị bộ; nhu cầu bộ chưa được đo |
| Thay thế | Phải xét Chế tạo miễn phí qua Lệnh bài | Phải xét nguồn rơi, nguồn dev và khả năng có món tương đương |
| Độ hiếm | Chỉ tăng giá hợp lý khi có ích | Không lấy màu vàng thay việc đánh giá |

**Ràng buộc kinh tế hiện tại:** Lệnh bài còn cho chế tạo xanh miễn phí với dòng tối đa. Vì vậy giá xanh đang đặt thấp; không thể suy từ roll đẹp thành giá cao nếu người mua tạo được món tương đương miễn phí. Nguồn dev/khởi tạo của bot không được dùng để giả nhu cầu thị trường. Không tự thay cơ chế chế tạo hay nguồn đồ khi chỉ làm định giá.

File hiện tại là bộ quy tắc gần đúng, chưa mô phỏng DPS/HP trên từng phái/build. Không mô tả điểm của nó là mức tăng sức mạnh thực tế đã đo.

## 3. Dữ liệu đang lưu và những gì còn thiếu

`apps/server/src/account/db.ts` dùng `resolve(process.env.DB_PATH ?? 'data/db.json')`: đường dẫn tương đối tính theo thư mục chạy server. Với lệnh workspace thông thường, mặc định là `apps/server/data/db.json`; nếu đặt `DB_PATH` phải đọc đường dẫn thực tế. Không đọc/đưa nội dung tài khoản thật vào báo cáo chỉ để tìm hiểu cấu trúc.

Mảng `marketSales` gồm `at`, `offerId`, `uid`, `def`, `group`, `score`, `currency`, `price`, `buyer`, `seller`, `eligible`. Các điểm quan trọng:

- Chỉ ghi sau mua thành công qua `marketBuy`, món phải trả về định giá; không phải nhật ký đầy đủ mọi giao dịch trong game.
- Giữ tối đa5000 bản ghi theo cấu hình; mỗi UID chỉ ghi lần đầu trong lịch sử đang giữ. Không phải kho dữ liệu vô hạn hay cơ chế chống lặp vĩnh viễn.
- `eligible:false` khi thiếu danh tính DB, cùng tài khoản hoặc người mua là bot. Bot bán cho người chơi thật vẫn có thể `eligible:true`.
- Chưa phát hiện được nhiều tài khoản cùng một người, mua bán thông đồng hoặc thao túng có chủ ý. `eligible:true` chưa bảo đảm dữ liệu đáng tin.
- Chưa lưu đầy đủ snapshot thuộc tính, phiên bản bộ định giá, chủ tài khoản tại thời điểm mua, thời gian có thể bán hay giá trị quy đổi KNB tại thời điểm giao dịch. Cần bổ sung trước khi học tự động để tránh tính lại dữ liệu cũ bằng luật mới.
- Dữ liệu kiểm thử `/tmp/jx-bot-pricing/db.json` và `/tmp/jx-market-auto/db.json` là dữ liệu thử, không phải bằng chứng nhu cầu/sức mua thật. Không nhập chúng làm dữ liệu học.

Cần cân nhắc lưu bền/retention và snapshot đủ dùng trước khi tăng khối lượng. PostgreSQL/SQLite có thể được xem xét khi JSON không đáp ứng, chưa chốt đổi nền lưu trữ.

## 4. Phương án học giá từ giao dịch

```text
Giao dịch đã bán
    → lọc trùng, cùng chủ, bot mua, giao dịch bất thường
    → gom món tương đương và chất lượng tương đương
    → tính giá tham chiếu + độ tin cậy
Giá cấu hình ───────────────────────────────┤
                                          ↓
                       giá đề xuất trong giới hạn
                                          ↓
                     ghi lý do và đo kết quả thực tế
```

### 4.1. Gom món để so sánh

Đồ xanh cần so cùng loại, cấp/hệ, nhóm công dụng và khoảng điểm chất lượng; không gộp mọi món sáu dòng. Hoàng kim ưu tiên đúng ID món/bộ và chất lượng tương đương. Khi nhóm quá ít giao dịch, lùi về giá cấu hình hoặc nhóm rộng hơn có điều kiện rõ, không tự gộp mọi loại món.

Nhóm hiện tại `green:kind:level:series:profile` và `gold:def` mới là điểm bắt đầu; cần bổ sung khoảng chất lượng/phiên bản chính sách khi học. Không suy rằng mọi giao dịch cùng `group` có giá trị ngang nhau.

### 4.2. Giá tham chiếu và độ tin cậy

Ưu tiên trung vị giá đã bán gần đây, có thể tăng trọng số dữ liệu mới. Cần ngưỡng số giao dịch, số người mua/người bán độc lập, độ mới và độ phân tán; một giao dịch không đủ để đổi giá toàn thị trường. Giới hạn đóng góp mỗi cặp tài khoản trong một cửa sổ để giảm thao túng.

Công thức định hướng, chưa chốt thông số:

```text
P0 = giá theo tiêu chí cấu hình của món đang xét
Pm = giá tham chiếu từ các món tương đương đã bán
α  = độ tin cậy dữ liệu, giới hạn từ 0 đến α tối đa
P  = giới hạn((1 − α) × P0 + α × Pm, giá sàn, giá trần)
```

Dữ liệu thiếu/cũ hoặc phân tán quá lớn thì giảm α, có thể về0. Ngoài sàn/trần cần giới hạn mức tăng/giảm mỗi lần và nhịp cập nhật để tránh giá dao động. Cần chốt cửa sổ thời gian, số mẫu tối thiểu, α tối đa, biên biến động qua đo thử; chưa có giá trị nào trong phần này được USER duyệt làm mặc định.

### 4.3. Tốc độ bán và nguồn cung

Giá rao thể hiện ý muốn người bán, giao dịch thành công thể hiện giá đã được chấp nhận. Không lấy lượng tin rao của chính bot làm bằng chứng nhu cầu. Tin đã rao nhưng không bán chưa đủ kết luận giá cao: có thể người bán offline, món đã mất/đổi, chưa có người thấy hoặc chưa đúng nhóm người mua.

Muốn tự giảm giá phải đo **thời gian thực sự có thể mua**: người bán online, món còn nguyên trong túi, tin còn hiệu lực. Có thể giảm từng bước theo chính sách và dừng ở sàn. Không giảm theo tổng thời gian offline hoặc tự sửa giá tin cũ mà người mua đang xem. Cần cơ chế hết hiệu lực/thay thế tin và kiểm tra lại giá khi mua trước khi thêm rao lại; bản hiện tại chưa có.

## 5. Lượng và KNB

Hiện hệ thống bán1KNB=100vạn lượng, không đổi ngược. Đây là giá mua từ hệ thống, không phải tỉ giá trao đổi hai chiều đã được thị trường xác nhận. Đồ giá thấp nên dùng lượng để tránh bước làm tròn KNB quá lớn.

Khi học giá, lưu giá và đồng tiền gốc. Chọn một trong các phương án sau trước triển khai: học riêng hai thị trường, hoặc quy đổi theo chính sách có lưu tỉ lệ/phiên bản tại thời điểm giao dịch. Không âm thầm coi giá quy đổi hôm nay là giá thật của giao dịch cũ.

## 6. Lộ trình triển khai đề xuất

1. **Hoàn thiện dữ liệu:** snapshot/phiên bản, thông tin lọc người mua/bán, chính sách giữ dữ liệu; tách dữ liệu thử và giao dịch thật.
2. **Tính thử không áp dụng:** báo giá cấu hình, giá tham chiếu, độ tin cậy, cỡ mẫu và lý do loại mẫu; bot vẫn dùng giá hiện tại.
3. **Bật điều chỉnh có giới hạn:** thử trên phạm vi nhỏ, server tính giá và giải thích; có công tắc tắt để quay về giá cấu hình.
4. **Đo thời gian bán rồi mới thêm giảm giá/rao lại:** kiểm trạng thái online/món/tin, không tạo nhiều tin mua trùng cùng UID.
5. **Đo kinh tế:** tỉ lệ bán, thời gian bán thực, dòng tiền, sức mua, phân phối giá và độ tập trung giao dịch. Điều chỉnh từ dữ liệu thật, không tạo bot tự mua để giả thị trường.

Đây là lộ trình để thảo luận khi USER muốn làm tiếp, **không phải phê duyệt triển khai trong phiên lưu tài liệu**.

## 7. Kiểm chứng cần có khi thực hiện

- Thiếu mẫu/cũ/bất thường: giữ giá cấu hình; một giao dịch/cặp tài khoản không đẩy được giá toàn nhóm.
- So chất lượng tương đương; thay phiên bản trọng số không làm diễn giải sai lịch sử.
- Sàn/trần, biên mỗi lần, giới hạn ví và làm tròn KNB; giữ nguyên số tiền thực trả để phân tích.
- Giao dịch thất bại/replay, cùng chủ, bot mua và UID bán lại được xử lý đúng chính sách dữ liệu.
- Offline hoặc món không còn mua được không làm tăng thời gian chờ bán.
- Cập nhật giá/tin đồng thời với mua không khiến người mua trả giá khác giá đã xác nhận; server quyết định và chống mua hai lần.
- Luật chạy ở server dùng chung Web/Desktop/Mobile; preview/điều khiển cần thử chuột/phím/cảm ứng. Chưa khẳng định native/mobile thật đã đạt từ kiểm viewport.

## 8. Điểm vào mã và tài liệu

| Điểm vào | Vai trò |
|---|---|
| `packages/shared/src/formulas/data/market-pricing.json` | Cấu hình giá hiện tại, `history.learningEnabled:false` |
| `packages/shared/src/formulas/tuning.ts` | Export cấu hình chung |
| `packages/shared/src/formulas/market.ts` | Đánh giá món, kiểu `ItemValuation`/`MarketSale`; hiện không học giá |
| `apps/server/src/world/market.ts` | Rao tự định giá, mua và ghi giao dịch thành công |
| `apps/server/src/account/db.ts` | Vị trí DB và mảng `marketSales` |
| `tools/bots/runner/LootAnnouncer.ts`, `BotClient.ts` | Chỉ rao pickup mới, chống lặp, cooldown, yêu cầu giá server |
| `apps/client/src/ui/windows/market.ts` | Preview và mua ngay |
| `tests/market-pricing.test.mts` | Kiểm giá cấu hình, quyền bot, mua và dữ liệu giao dịch |
| [Rao bán](../rao-ban.md), [Auto](../auto.md) | Nguồn chuẩn tính năng và giới hạn đã triển khai |

`learningEnabled` hiện **chỉ chấp nhận false**; đổi true sẽ bị kiểm tra cấu hình từ chối, không tự kích hoạt khả năng học. Không hướng dẫn người dùng bật cờ thay cho việc triển khai.

Tham chiếu tư duy đã thảo luận: [Steam Community Market FAQ](https://help.steampowered.com/en/faqs/view/61F0-72B7-9A18-C70B), lựa chọn đặt giá bán nhanh hoặc đặt cao và chờ. Đây là ví dụ tham khảo về giá/thời gian bán, không chứng minh công thức hay mức giá nào phù hợp với nền kinh tế project.
