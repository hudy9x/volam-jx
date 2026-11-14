# CLAUDE.md — jx-system-online

**Tra cứu Auto / Rao bán — bắt buộc:** khi người dùng đề cập **Auto, AUTO, tự động đánh** trong game/bot, đọc toàn bộ [docs/auto.md](docs/auto.md) trước khi giải thích hành vi, điều tra, đề xuất hoặc sửa mã. Khi đề cập **Rao bán, Mua bán, marketplace, KNB, Kim nguyên bảo**, đọc toàn bộ [docs/rao-ban.md](docs/rao-ban.md). Có cả hai chủ đề thì đọc cả hai. Không suy đoán đường dẫn hoặc dùng tài liệu gộp cũ làm nguồn chuẩn; chỉ dẫn kỹ thuật và giới hạn đã triển khai nằm trong hai tài liệu này. Áp dụng cho mọi AI session có quyền truy cập repo; không áp dụng từ “auto” nói về tác vụ tự động không liên quan game/bot.

Luật làm việc dùng chung cho mọi AI agent nằm trong `AGENTS.md`; điểm dừng của dự án nằm trong `tasks/CURRENT.md`.
Cả hai được nạp sẵn bên dưới. Làm theo `AGENTS.md` mục 0: đầu phiên đối chiếu `CURRENT.md` với `git status` / `git log -1`;
cuối phiên hoặc sau commit thì cập nhật `tasks/`.

**UI/UX công cụ — bắt buộc:** bất cứ khi nào yêu cầu đề cập tạo tool/công cụ quản trị hoặc thiết kế/sửa giao diện, form, component, style của tool trong `tools/`, đọc toàn bộ [`docs/tools-ui-ux-guidelines.md`](docs/tools-ui-ux-guidelines.md) trước khi thảo luận thiết kế, lập kế hoạch hay sửa mã. Áp dụng cả khi tool mới chưa có thư mục. Không tự tạo bộ style khác; đọc thêm `tools/AGENTS.md` và README tool. AGENTS là luật dự án chung.

**Công thức trò chơi** (chỉ số, cấp, kỹ năng, sát thương, hiệu ứng, tốc độ): mã `packages/shared/src/formulas/` (hằng số duy nhất ở
`formulas/tuning.ts`), giải thích từng công thức và nguồn ở [`docs/formulas/README.md`](docs/formulas/README.md). Đọc trước khi chỉnh
bất kỳ con số chiến đấu nào.

**Bot giả lập người chơi**: cách dùng (app riêng `npm run bots:ui` → localhost4568, `npm run bots -- <kịch bản>`, ảnh chụp) ở
[`docs/bots-guide.md`](docs/bots-guide.md); thiết kế + mã ở [`docs/bots.md`](docs/bots.md).

@AGENTS.md
@tasks/CURRENT.md
