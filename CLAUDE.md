# CLAUDE.md — jx-system-online

Luật làm việc dùng chung cho mọi AI agent nằm trong `AGENTS.md`; điểm dừng của dự án nằm trong `tasks/CURRENT.md`.
Cả hai được nạp sẵn bên dưới. Làm theo `AGENTS.md` mục 0: đầu phiên đối chiếu `CURRENT.md` với `git status` / `git log -1`;
cuối phiên hoặc sau commit thì cập nhật `tasks/`.

**Công thức trò chơi** (chỉ số, cấp, kỹ năng, sát thương, hiệu ứng, tốc độ): mã `packages/shared/src/formulas/` (hằng số duy nhất ở
`formulas/tuning.ts`), giải thích từng công thức và nguồn ở [`docs/formulas/README.md`](docs/formulas/README.md). Đọc trước khi chỉnh
bất kỳ con số chiến đấu nào.

**Bot giả lập người chơi**: cách dùng (trang `/?bots`, `npm run bots -- <kịch bản>`, ảnh chụp) ở
[`docs/bots-guide.md`](docs/bots-guide.md); thiết kế + mã ở [`docs/bots.md`](docs/bots.md).

@AGENTS.md
@tasks/CURRENT.md
