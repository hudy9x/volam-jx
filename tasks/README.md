# tasks/ — tình trạng công việc giữa các phiên

Thư mục này để **phiên làm việc mới (người hoặc AI) biết đang dừng ở đâu** mà không phải đọc lại lịch sử chat.

| File | Nội dung | Khi nào cập nhật |
|---|---|---|
| `CURRENT.md` | Điểm dừng: commit cuối, đang làm dở gì, chờ người dùng quyết định gì, bước tiếp theo gợi ý | Cuối mỗi phiên, sau mỗi commit, khi đổi hướng |
| `BACKLOG.md` | Toàn bộ đầu việc theo nhóm, trạng thái ✅ / 🟡 / ⬜ | Khi xong hoặc thêm một đầu việc |
| `HISTORY.md` | Nhật ký các vòng làm việc: người dùng yêu cầu gì, đã làm gì, commit nào | Khi kết thúc một vòng (thường là khi commit) |

Quy ước:

- **Đầu phiên:** đọc `AGENTS.md` (luật làm việc) rồi `tasks/CURRENT.md`. Câu "làm tiếp" / "tiếp tục" của người dùng nghĩa là
  tiếp từ mục "Bước tiếp theo" trong `CURRENT.md`, nhưng vẫn hỏi lại nếu mục đó cần người dùng chọn.
- **Cuối phiên / sau commit:** cập nhật `CURRENT.md` (ngày, commit, trạng thái), tick `BACKLOG.md`, thêm một mục vào `HISTORY.md`.
- Người dùng hỏi **"thống kê công việc"**: đếm ✅ / 🟡 / ⬜ / ⏸ theo nhóm trong `BACKLOG.md` (bảng `CURRENT.md` §3) và liệt kê các việc
  chưa xong đáng chú ý, gồm cả phần còn dở của việc đã làm một phần (vd. cache: PF6–PF9).
- Ghi ngày tuyệt đối (2026-11-12), không ghi "hôm qua".
- Phân biệt **đã kiểm chứng** (chạy thử, có dữ liệu gốc) với **suy luận**.
- Trạng thái: ✅ xong · 🟡 xong một phần / chỉ có nghiên cứu · ⬜ chưa làm.
