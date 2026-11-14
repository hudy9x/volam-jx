# Bot giả lập người chơi

Cài đặt bot, do app `http://localhost:4568/` ghi (cách dùng: `docs/bots-guide.md`):

- `templates/<tên>.json`: mẫu tài khoản (cấp, phái, điểm, chiêu, đồ, tiền, thuốc, bản đồ), áp khi tạo / đặt lại bot.
- `<tên>.json`: kịch bản chạy, dùng với `npm run bots -- <tên>`.

Sửa tay cũng được: trường thiếu / sai sẽ lấy giá trị mặc định (`packages/shared/src/bots/index.ts`).
