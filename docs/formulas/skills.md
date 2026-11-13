# Học và luyện kỹ năng

Mã: `packages/shared/src/skills/core/learning.ts`, tầng chiêu `skills/core/events.ts` ([skills-layers.md](../skills-layers.md)),
server `apps/server/src/world/progress.ts`. Nghiên cứu: [docs/research/skills-progression.md](../research/skills-progression.md).

## Chiêu hiện ra khi nào

- Mọi nhân vật có sẵn đòn đánh thường (1, 2, 53 — DATA `newplayerini [FSKILLS]`) và các chiêu chung (Khinh công 210, Vũ Lộ Xuân Phong,
  Kiếp Phú Tế Bần) khi đủ cấp học.
- Sau khi vào phái: mọi chiêu của phái **có ReqLevel ≤ cấp nhân vật** tự hiện (USER: không cần nhiệm vụ môn phái như bản gốc). Chiêu 90
  có ReqLevel **80** (DATA `skills.txt`), 120 là 120, 150 là 150.
- Chiêu cộng điểm hiện ở **cấp 0** (phải cộng 1 điểm mới dùng được), chiêu thục luyện ở **cấp 1** (DATA `AddMagic(id)` / `AddMagic(id,1)`).

## Lên cấp chiêu

| Loại | Chiêu | Cách lên | Nguồn |
|---|---|---|---|
| Cộng điểm | chiêu thường; 5 chiêu 90 (351, 390, 332, 391, 394) và 1110 | 1 điểm / cấp | DATA `skilllvlup.lua` |
| Thục luyện | chiêu 90 có `addskillexp1` | mỗi đòn trúng + P2 của `addskillexp1` (= 1) exp; cần `skill_skillexp_v` exp để lên từ cấp L | DATA (bảng) · INFERRED (mỗi đòn) |
| Thục luyện | chiêu 150 | như chiêu 90 | **USER** 2026-11-12 |
| Cộng điểm | chiêu 120 | 1 điểm / cấp | **USER** 2026-11-12 |
| Cộng điểm | Thất truyền, chiêu `IsExpSkill` không có bảng exp | 1 điểm / cấp | CHỌN (gốc: theo kinh mạch, server) |

Giới hạn:

- Chiêu cộng điểm: cấp tối đa = min(MaxLevel, cấp nhân vật − ReqLevel + 1) — gốc có chặn ("phải đạt đến cấp %d mới có thể thăng cấp %s",
  DATA) nhưng công thức chỉ có ở jx-web-main (CHỌN, KN12).
- 5 chiêu 90 cộng điểm + 1110: mọi chiêu tiền đề ≥ 5; khi chiêu đang ≤ 15 thì mỗi tiền đề ≥ cấp hiện tại + 5 (DATA `skilllvlup.lua`).
- Chiêu 150 dừng ở cấp 20 (gốc mở 21–26 bằng vật phẩm, chưa có).
- Chiêu thục luyện không nhận điểm ("Không thể sử dụng điểm kỹ năng để thăng cấp kỹ năng %s", DATA).

## Thời gian thục luyện (nghiên cứu 2026-11-12: [docs/research/skill-practice.md](../research/skill-practice.md))

- +1 exp **mỗi lần gây sát thương lên mỗi mục tiêu** (bảng gốc sinh theo số đòn × phạm vi); nhịp độc không tính. Server: `practice` được gọi
  trong `applyHit` cho từng mục tiêu, bỏ nhịp độc — khớp.
- Không có hệ số server cho exp kỹ năng (DATA `gamesetting.ini` chỉ có ExpRate / MoneyRate).
- Tổng 1 → 20: chiêu 90 từ 0,79 đến 4,48 triệu exp; chiêu 150 dùng chung bảng 154 300 (20 → 26 thêm 1 110 000, cần sách mở khóa).
- Ước tính đánh liên tục 1 đòn trúng / giây: chiêu 90 ≈ 220–1250 giờ, chiêu 150 ≈ 43 giờ; 5 đòn / giây: 45–250 giờ và 9 giờ.
- Bản gốc rút ngắn bằng **ủy thác** (treo máy khi rời mạng) và **Bạch Câu Hoàn kỹ năng** (thường / Đại ×1,5 / Đặc biệt ×2), nhưng tốc độ
  ủy thác và lượng tăng không có trong client. Có Đại thành bí kíp (Kỳ Trân Các) thì lên 20 ngay.
- **Tốc độ trong game (USER 2026-11-12): luyện từ cấp 1 tới tối đa trong khoảng 1 giờ, mọi phái, chiêu 80/90 lẫn 150.** Mỗi đòn trúng
  được ⌈tổng exp 1→tối đa ÷ (giờ × 3600 × đòn/giây)⌉ exp (`practicePerHit`, `skills/core/learning.ts`). Cài đặt:
  - toàn bộ: `formulas/tuning.ts` `PRACTICE.hours` (1) và `PRACTICE.hitsPerSecond` (1, giả định 1 đòn trúng / giây);
  - từng phái: `PRACTICE.factionHours` (vd. `{ tianwang: 3 }`);
  - từng chiêu: `factions/<phái>/tuning.ts` `practiceHours` (ưu tiên cao nhất).
  Kiểm tra: mọi chiêu 90 / 150 cần ≈ 3 600 đòn (1,00 giờ); Thiên Vương đặt 3 giờ → 10 777 đòn.
