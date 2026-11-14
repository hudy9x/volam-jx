# GEMINI.md — jx-system-online

**Tra cứu định giá thị trường — bắt buộc:** khi người dùng nhắc **định giá đồ, giá thị trường, kinh tế game, cung cầu, học giá, tự điều chỉnh giá, tự tăng/giảm giá bot hoặc lịch sử giao dịch/marketSales**, đọc [docs/rao-ban.md](docs/rao-ban.md) và toàn bộ [docs/research/market-pricing-plan.md](docs/research/market-pricing-plan.md) trước khi giải thích, đề xuất hay sửa mã. Phân biệt giá cấu hình đã có với học giá thị trường chưa triển khai; yêu cầu lưu nghiên cứu không phải lệnh triển khai. Không yêu cầu người dùng cung cấp lại đường dẫn.

**Tra cứu Auto / Rao bán — bắt buộc:** khi người dùng đề cập **Auto, AUTO, tự động đánh** trong game/bot, đọc toàn bộ [docs/auto.md](docs/auto.md) trước khi giải thích hành vi, điều tra, đề xuất hoặc sửa mã. Khi đề cập **Rao bán, Mua bán, marketplace, KNB, Kim nguyên bảo**, đọc toàn bộ [docs/rao-ban.md](docs/rao-ban.md). Có cả hai chủ đề thì đọc cả hai. Không suy đoán đường dẫn hoặc dùng tài liệu gộp cũ làm nguồn chuẩn; chỉ dẫn kỹ thuật và giới hạn đã triển khai nằm trong hai tài liệu này. Áp dụng cho mọi AI session có quyền truy cập repo; không áp dụng từ “auto” nói về tác vụ tự động không liên quan game/bot.

Đọc [AGENTS.md](AGENTS.md) và [tasks/CURRENT.md](tasks/CURRENT.md) để nắm luật và điểm dừng; giữ nguyên yêu cầu không tự commit/push.

## Bắt buộc khi đề cập công cụ

Khi người dùng đề cập tạo tool, công cụ quản trị, giao diện tool, dashboard, form, component, style hoặc sửa UX/UI của công cụ trong `tools/`, **đọc toàn bộ [docs/tools-ui-ux-guidelines.md](docs/tools-ui-ux-guidelines.md) trước khi đề xuất thiết kế, lập kế hoạch hoặc viết/sửa mã**. Áp dụng cả tool mới chưa có thư mục, không chờ người dùng nhắc tên guideline.

Đọc thêm [tools/AGENTS.md](tools/AGENTS.md) và README của tool liên quan. Guideline là nguồn chuẩn duy nhất cho design; file này chỉ dẫn tới nó, không tạo bộ style riêng. Yêu cầu trực tiếp của người dùng được ưu tiên khi có khác biệt.
