# Công thức trò chơi — mục lục

Mọi phép tính chỉ số, cấp, sát thương, hiệu ứng, tốc độ nằm trong **`packages/shared/src/formulas/`** (TS thuần, server tính thật,
client hiển thị cùng một hàm). **Mọi hằng số ở một chỗ: `formulas/tuning.ts`**, mỗi số ghi nguồn. Muốn cân bằng lại: sửa `tuning.ts`,
không sửa rải rác.

| Tài liệu | Mã | Nội dung |
|---|---|---|
| [character.md](character.md) | `formulas/character.ts`, `formulas/attrs.ts` | Tiềm năng → Sinh lực, Nội lực, Chính xác, Né tránh, lực tay cơ bản, kháng + trần kháng |
| [level.md](level.md) | `formulas/level.ts`, `formulas/monster.ts`, `characters/progression.ts` | Cấp, exp, chia exp, chênh lệch cấp, điểm tiềm năng / kỹ năng, vào phái cấp 10 |
| [skills.md](skills.md) | `skills/core/learning.ts`, `skills/core/events.ts` | Chiêu hiện theo cấp, cộng điểm / thục luyện, giới hạn cấp chiêu, chiêu tiền đề, tầng chiêu |
| [damage.md](damage.md) | `formulas/damage.ts`, `formulas/combat.ts` | Lực tay của chiêu, trúng / né, chí mạng / chí tử, kháng + xuyên kháng + trần, ngũ hành, PK |
| [effects.md](effects.md) | `status/states.ts`, `formulas/effects.ts` | Bùa lợi / bùa hại / hào quang / bị động (thuộc tính, thời gian riêng), choáng / chậm / độc / co giật |
| [drops.md](drops.md) | `formulas/drops.ts` | Bảng rơi, cấp món, tiền, quyền nhặt, dòng xanh + may mắn, chỉ số đồ (TB8) |
| [speed.md](speed.md) | `formulas/speed.ts` | Tốc đánh / tốc xuất chiêu, tốc chạy, chậm |

## Ký hiệu nguồn (dùng trong `tuning.ts` và mọi tài liệu ở đây)

| Ký hiệu | Nghĩa |
|---|---|
| **DATA** | Đọc thẳng từ dữ liệu client gốc `../jx-origin/data_extract` — đã kiểm chứng |
| **SRC** | Ghi chép từ mã engine fan (`docs/combat-formulas.md`; mã đã xóa, không kiểm lại được) |
| **WEB** | Bài viết thời JX1 · **JXWEB** `../jx-web-main` (không phải nguồn gốc) |
| **CHỌN** | Dự án tự chọn (không có nguồn) — đổi được ở `tuning.ts` |
| **USER** | Người dùng quyết |

Nghiên cứu nền: `docs/combat-formulas.md` (tổng hợp cũ, §12b đối chiếu jx-web-main), `docs/research/` (skills-progression,
effects-buffs, luck-drops — 2026-11-12).

## Cách thêm / đổi một công thức

1. Hằng số mới → `formulas/tuning.ts` (nhóm đúng chủ đề, ghi nguồn).
2. Hàm thuần trong `formulas/<chủ đề>.ts`, không đọc trạng thái server / client; đầu vào là số và `AttrBag`.
3. Server gọi ở `apps/server/src/world/` (vd. `progress.ts`), client hiển thị cùng hàm.
4. Ghi vào tài liệu chủ đề ở đây: công thức, nguồn, ví dụ số.
- [equipment.md](equipment.md): dòng ẩn, đủ bộ, Càn Khôn Giới Chỉ, kỹ năng từ trang bị (`allskill_v`), ngoại hình hoàng kim.
