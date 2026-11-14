# AGENTS.md — công cụ nội bộ

Kế thừa [AGENTS.md gốc](../AGENTS.md).

**Trước mọi đề xuất, kế hoạch, tạo mới hoặc chỉnh sửa giao diện tool**, đọc toàn bộ [guideline UI/UX](../docs/tools-ui-ux-guidelines.md). Điều kiện này áp dụng ngay khi người dùng đề cập tool/công cụ quản trị/dashboard/form/component/style, kể cả tool chưa có thư mục; không chờ yêu cầu nhắc tên guideline.

Đọc README của tool cần sửa. Dùng một guideline chung; không tạo palette, input, button, bảng hoặc dialog khác chuẩn theo ý phiên làm việc. Component chưa tồn tại thì không giả định đã có thư viện dùng chung. Phần đang sửa của tool cũ tiến về chuẩn, không tự cải tạo tool khác ngoài phạm vi.

Tool chạy độc lập game, không bị HMR/reload của game; thử trạng thái và responsive theo checklist trong guideline. Không đổi công thức, asset hoặc giao diện game khi chỉ làm UI tool. Không tự commit/push.
