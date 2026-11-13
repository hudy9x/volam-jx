# Tầng chiêu (skill layers) — chiêu 90 / 150 mở thêm hiệu ứng theo cấp

Rà soát 2026-11-12 (BACKLOG KN10). Mã: `packages/shared/src/skills/core/events.ts` (`eventSkill`, `eventFromLevel`,
`shownEvents`), dùng bởi `engine/SkillEngine.ts` (bắn chiêu con) và `core/describe.ts` (tooltip "Tầng N").

## Cơ chế (dữ liệu gốc)

- `skills.txt` có 4 cặp cột sự kiện: `StartEvent/StartSkillId` (lúc đạn xuất hiện), `FlyEvent/FlySkillId` (+ `FlyEventTime`,
  trong lúc bay), `CollideEvent/CollidSkillId` (khi trúng), `VanishedEvent/VanishedSkillId` (khi đạn biến mất).
- Công thức theo cấp `script/skill/<phái>.lua` có thuộc tính `skill_startevent`, `skill_flyevent`, `skill_collideevent`,
  `skill_vanishedevent` = [bật 0/1, –, id chiêu con], dạng bậc thang: `{{1,0},{10,0},{10,1},{20,1}}` = tắt tới cấp 10, **bật từ cấp 11**.
- **Luật:** có thuộc tính → thuộc tính quyết định (tắt thì không bắn); chỉ có cột → luôn bắn. Trước 2026-11-12 engine lấy cột khi
  thuộc tính tắt nên 21 chiêu bật tầng từ cấp 1 (đã sửa).
- `skill_eventskilllevel` = cấp của chiêu con (mặc định = cấp chiêu mẹ).
- `skill_showevent` = các tầng mà mô tả gốc hiện: bit 1 lúc ra chiêu, 2 khi bay, 4 khi trúng, 8 khi biến mất (suy ra: khớp mọi chiêu
  bên dưới, vd. 368 cấp 16 = 5 = 1 + 4).
- Một số chiêu con chỉ được nêu trong P3 của thuộc tính (không có cột), vd. vòng tròn 162 của Nhân Kiếm Hợp Nhất: `gen:skills`
  gom cả các id này (`attrRefs`).
- Kiểu "tầng" thứ hai: số đạn tăng theo cấp (`skill_misslenum_v`, vd. Vô Ngã Vô Kiếm 1 → 8, Kháng Long Hữu Hối 1 → 15) — engine đã đọc.
- Chiêu 120 (cả Thất truyền): **không có tầng** theo cấp.

## Bảng 11 phái (sinh từ dữ liệu)

| Phái | Chiêu | Cấp học | Tầng mở thêm |
|---|---|---|---|
| Thúy Yên | Băng Tung Vô ảnh (336) | 80 | cấp 11: Băng Tâm Tuyết Liên (382) khi trúng |
| Thúy Yên | Băng Tâm Tiên Tử (337) | 80 | cấp 11: Phong Tuyết Băng Thiên (338) khi bay |
| Thúy Yên | Băng Tước Hoạt Kỳ (1063) | 150 | cấp 11: Băng Ngưng Hàn Yên (1064) khi trúng |
| Thúy Yên | Thủy Anh Man Tú (1065) | 150 | cấp 11: Khinh Sa Phù Thủy (1093) khi bay |
| Nga My | Tam Nga Tề Tuyết (328) | 80 | cấp 11: Ngọc Tuyền Tẩy Trần (329) lúc ra chiêu |
| Nga My | Phong Sương Toái ảnh (380) | 80 | cấp 11: Kim Đỉnh Phật Quang (331) lúc ra chiêu |
| Nga My | Kiếm Hoa Vãn Tinh (1061) | 150 | cấp 11: Kiếm Tâm Tĩnh Điển (1089) lúc ra chiêu |
| Nga My | Ngọc Tuyền Tâm Kinh (1114) | 150 | cấp 11: Minh Tâm Kiến Tính (1115) khi bay |
| Cái Bang | Phi Long Tại Thiên (357) | 80 | cấp 11: Long Chiến Ư Dã (389) khi trúng |
| Cái Bang | Thời Thặng Lục Long (1073) | 150 | cấp 11: Ngũ Diệu Càn Khôn (1072) khi trúng |
| Côn Lôn | Ngạo Tuyết Tiêu Phong (372) | 80 | cấp 11: Khiếu Phong Tam Liên Kích (373) khi trúng |
| Côn Lôn | Lôi động Cửu Thiên (375) | 80 | cấp 11: Bình Địa Hám Lôi (387) khi trúng |
| Côn Lôn | Cửu Thiên Cương Phong (1080) | 150 | cấp 11: Phong Minh Ngọc Toái (1108) khi trúng |
| Côn Lôn | Thiên Lôi Chấn Nhạc (1081) | 150 | cấp 11: Lôi Động Càn Khôn (1109) khi biến mất |
| Thiếu Lâm | Tam Giới Quy Thiền (1057) | 150 | cấp 11: ÍũÚéạộềằìểà¯ (1085) lúc ra chiêu |
| Đường Môn | Nhiếp Hồn Nguyệt ảnh (339) | 80 | cấp 11: Ngân Đao Xạ Nguyệt (340) khi trúng |
| Đường Môn | Bạo Vũ Lê Hoa (302) | 80 | cấp 11: Truy Tinh Trục Điện (301) khi bay |
| Đường Môn | Vô ảnh Xuyên (1069) | 150 | cấp 11: Truy Tâm Tỏa Mệnh (1097) khi trúng |
| Đường Môn | Thiết Liên Tứ Sát (1070) | 150 | cấp 11: Thiết Sa Xạ Tinh (1098) khi bay |
| Đường Môn | Tích Lịch Loạn Hoàn Kích (1110) | 150 | cấp 1: Tích Lịch Loạn Hoàn Hãm Tĩnh (1113) khi biến mất |
| Thiên Nhẫn | Thiên Ngoại Lưu Tinh (362) | 80 | cấp 11: Nghiệp Hỏa Phàn Thành (363) khi biến mất |
| Thiên Nhẫn | Giang Hải Nộ Lan (1075) | 150 | cấp 1: Ma Âm Kích (1131) lúc ra chiêu |
| Thiên Vương | Hào Hùng Trảm · Đao khí (1084) | 150 | cấp 16: Hào Hùng Trảm · Tỏa ba hướng (1086) khi trúng |
| Võ Đang | Nhân Kiếm Hợp Nhất (368) | 80 | cấp 11: Thái Cực Kiếm ý (371) lúc ra chiêu<br>cấp 16: Huyền Nhất Vô Tượng (162) khi trúng |
| Võ Đang | Kiếm Thùy Tinh Hà (1079) | 150 | cấp 11: Kiếm Minh Thương Khung (1107) lúc ra chiêu<br>cấp 16: Kiếm Vũ Diệu Nguyệt (1105) khi trúng |
| Ngũ Độc | Âm Phong Thực Cốt (353) | 80 | cấp 11: Thiên Cương Độc Thủ (354) khi biến mất |
| Ngũ Độc | Huyền Âm Trảm (355) | 80 | cấp 11: Tinh Không Phá (383) khi trúng |
| Ngũ Độc | U Hồn Phệ ảnh (1067) | 150 | cấp 11: Hồn ảnh Tùng Sanh (1095) khi trúng |

Kiểm chứng (2026-11-12): trên `World`, Nhân Kiếm Hợp Nhất cấp 10 chỉ bắn 3 kiếm; cấp 11 thêm kiếm rơi (đạn 176); cấp 16 thêm vòng tròn
khi trúng (số đòn trúng gấp đôi). Tên chiêu con Thiên Vương 1084 / 1086 / 1087 / 1088 (gốc tiếng Trung) dịch tay ở
`apps/client/tools/data/subskill-names.ts`.
