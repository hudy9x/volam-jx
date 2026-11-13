# Hiệu năng tải tài nguyên — mục lục

> Viết 2026-11-13 theo yêu cầu người dùng: "ứng dụng web không thể tải hết toàn bộ asset" (hơn 15 GB khi đủ bản đồ).
> Đây là **hướng dẫn triển khai**. Đã làm: **PF4 phần web** (vòng 34, trạng thái ở `05` §0); PF1–PF3 chưa có code. Đầu việc tương ứng: nhóm **PF** trong `tasks/BACKLOG.md` §9.
> Nền tảng mục tiêu Web + Desktop app + Mobile (`AGENTS.md` §1): mỗi tài liệu có mục "Ba nền tảng".

## Nguyên tắc

1. **Không bao giờ tải hết.** Mỗi lúc chỉ cần: vùng bản đồ quanh camera, các nhân vật / quái đang thấy, chiêu đang đánh, giao diện đang mở.
2. **Tải đúng lúc, theo thứ tự ưu tiên**: thứ chặn màn hình (đất dưới chân, nhân vật mình) trước; thứ trang trí và thứ "có thể sẽ cần" sau.
3. **Trả lại bộ nhớ** khi không dùng: bộ nhớ đồ họa (GPU) là giới hạn thật trên điện thoại, không phải băng thông.
4. **Tải một lần, dùng nhiều lần**: mọi file có phiên bản để lưu đệm lâu dài (HTTP cache, Service Worker, đĩa của app).
5. **Đo trước, chỉnh sau**: mọi ngưỡng trong các tài liệu dưới đây là số đề xuất, chốt bằng số liệu của PF1.
6. Không đổi cách dựng hình 1:1 / WebP lossless (`AGENTS.md` §5.5).

## Tài liệu (đọc theo thứ tự)

| # | Tài liệu | Đầu việc | Nội dung |
|---|---|---|---|
| 01 | [01-hien-trang-va-chien-luoc.md](01-hien-trang-va-chien-luoc.md) | (phân tích) | Mã hiện tại tải gì, lúc nào; **giai đoạn tải: lúc đầu tải trước gì, sau đó lưu đệm gì** |
| 02 | [02-do-luong.md](02-do-luong.md) | **PF1** | Bảng đo trong bản dev + kịch bản Playwright, số liệu gốc, ngân sách |
| 03 | [03-gioi-han-bo-nho-texture.md](03-gioi-han-bo-nho-texture.md) | **PF2** | Đếm tham chiếu + LRU cho texture, ngân sách theo nền tảng |
| 04 | [04-tai-theo-uu-tien.md](04-tai-theo-uu-tien.md) | **PF3** | Bộ tải chung có ưu tiên, hủy, hình tạm, tải trước khi đổi bản đồ |
| 05 | [05-cache-va-phien-ban.md](05-cache-va-phien-ban.md) | **PF4** | Phiên bản file, HTTP cache, Service Worker, gói tài nguyên cho Desktop / Mobile |

Thứ tự làm: **PF1 → PF2 → PF3 → PF4**. PF4 (cache) không phụ thuộc mã của PF2 / PF3, có thể làm song song sau PF1;
nhưng PF4 cần `assetUrl()` (PF4 bước 1), nên làm bước đó sớm nếu PF3 đụng cùng file.

## Ngoài phạm vi (người dùng chưa chọn, 2026-11-13)

- **Gộp icon nhỏ thành atlas** trong tool `gen:*` (bước 4 của đề xuất ban đầu). Ghi chú: sheet nhân vật / quái **đã tách theo động tác**
  sẵn (mỗi khóa trong `JX_SHEETS` = một bộ phận × một động tác, mọi hướng); chỗ cần giảm là số động tác tải trước — xem 04 §3.
- **Hạ chất lượng khi đông người** (vẽ trang phục mặc định cho người ở xa): ghi lại ở 04 §7 như việc sau.
- **Texture nén cho GPU** (KTX2 / Basis): trái luật lossless, chỉ cân nhắc nếu PF1 cho thấy điện thoại vẫn thiếu bộ nhớ sau PF2.
- Interest management phía server (BACKLOG HT5): giảm số actor client nhận, cũng giảm số sheet phải tải; việc riêng.
- Hiệu năng **server** và bot tạo tải: `docs/bots.md` (nhóm **BT**, BACKLOG §10). Bot không tải ảnh nên không đo được cache;
  BT7 dùng bot tạo đám đông cho PF1.

## Liên quan

- `docs/architecture.md` (cấu trúc mã), `docs/ui-and-platforms.md` (3 nền tảng, đóng gói), `docs/regenerate-assets.md` (dung lượng, tool sinh).
- BACKLOG HT1 (đóng gói Desktop / Mobile), HT2 (WebKit), HT3 (tài nguyên trên mobile — được PF4 thay thế chi tiết), HT8 (Playwright vào repo).
