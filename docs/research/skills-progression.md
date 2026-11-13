# Học kỹ năng, điểm kỹ năng, thục luyện chiêu 90 / 120 / 150 — nghiên cứu (2026-11-12)

Nhãn: **VERIFIED** = đọc thấy trong dữ liệu gốc (`jx-origin/data_extract`, chỉ ghi file) · **INFERRED** = suy luận từ dữ liệu ·
**WEB** = chỉ có ở `jx-web-main` (không phải nguồn gốc). Mã engine / server gốc không có trong client nên các con số "mỗi đòn +bao nhiêu",
"giới hạn cấp chiêu theo cấp nhân vật" không đọc được trực tiếp.

Nguồn chính (trong `jx-origin/data_extract/`):
- `slistcache/script/global/skills_table.lua` — bảng học kỹ năng theo nhiệm vụ môn phái + công thức hoàn điểm kỹ năng.
- `slistcache/script/skill/skilllvlup.lua` — luật nâng 5 chiêu 90 "cộng điểm" + Tích Lịch Loạn Hoàn Kích (150).
- `slistcache/script/skill/<phái>.lua`, `head.lua` — `addskillexp1`, `skill_skillexp_v`, hàm `SkillExpFunc`.
- `slistcache/settings/skills.txt` — cột `ReqLevel`(54), `MaxLevel`(55), `IsExpSkill`(69), `LevelUpScript`(113).
- `slistcache/settings/npc/player/magic_level_exp.txt` — 57 dòng: bảng thục luyện chiêu 90 (luyện), 120, 150.
- `update01/script/item/skillbook.lua` — sách 90; `update01/script/item/wulin-miji.lua`, `emei-miji.lua`… — +1 điểm kỹ năng.
- `slistcache/settings/item/004/magicscript.txt` — danh sách vật phẩm sách / Bạch Câu Hoàn kỹ năng / mật tịch 150.
- `slistcache/ui/150skilltask/taskui_150skill.lua` — nhiệm vụ kỹ năng 150.
- `jx-origin/lang/vn/stringtable_core.txt`, `slistcache/settings/stringresource.txt` — câu thông báo của engine / NPC.

---

## 1. Điểm kỹ năng và cấp chiêu

| Điều | Kết luận | Nhãn | Bằng chứng |
|---|---|---|---|
| Điểm mỗi cấp | +1 điểm kỹ năng mỗi lần lên cấp | VERIFIED | `stringresource.txt` 10027 "Mỗi lần thăng cấp, ngươi sẽ được 5 điểm Tiềm năng và 1 điểm kỹ năng" |
| Tổng điểm | **(cấp − 1)** + điểm nhiệm vụ (`GetByte(Task86,2)`) + điểm vật phẩm (`GetByte(Task80,1)`) + `Task700` | VERIFIED | `skills_table.lua` `skills_update()`: `MagicPoint_total = GetLevel() + GetByte(GetTask(86),2) + GetByte(GetTask(80),1) + GetTask(700) - GetMagicPoint() - xMagic - 1` (xMagic = cấp Vũ Lộ Xuân Phong 397, không bị hoàn) |
| Điểm thêm từ vật phẩm | Võ Lâm Mật Tịch / mật tịch môn phái: +1, cần cấp ≥ 80, **tối đa 15 lần** (4 bit thấp Task80); Phụng Nguyệt Quả Dung +1 (cấp 80, mỗi người 2 cái) | VERIFIED | `update01/script/item/wulin-miji.lua` (`times > 14`, `GetLevel() < 80`, `AddMagicPoint(1)`); `magicscript.txt` dòng "Phụng Nguyệt Quả Dung" |
| Chiêu "thục luyện" không nhận điểm | Engine có câu "Không thể sử dụng điểm kỹ năng để thăng cấp kỹ năng %s" | VERIFIED (câu) / INFERRED (gắn với `IsExpSkill=1`) | `stringtable_core.txt` `G_PLAYER_1` |
| Cấp tối đa của chiêu | `MaxLevel` trong `skills.txt` (thường 20; trấn phái 30; 150 là 26) | VERIFIED | `G_PLAYER_3` "Kỹ năng %s của bạn đã đến cực hạn…"; cột MaxLevel |
| Cấp chiêu bị chặn theo cấp nhân vật | Engine **có** chặn: "Kỹ năng chiến đấu của Bạn phải đạt đến cấp %d mới có thể thăng cấp %s kỹ năng." ("kỹ năng chiến đấu" = dịch sai của 战斗等级 = cấp nhân vật). Công thức không có trong client | VERIFIED (có luật) · công thức **WEB/INFERRED** | `stringtable_core.txt` `G_PLAYER_4`. `skills.txt` không có cột cấp-yêu-cầu theo từng cấp chiêu, nên %d phải do engine tính từ `ReqLevel` |
| Công thức `max = min(MaxLevel, cấp nhân vật − ReqLevel + 1)` | Khớp với `G_PLAYER_4` (một ngưỡng cấp nhân vật cho mỗi cấp chiêu) và cách hiểu phổ biến của JX1, nhưng **không đọc được trong dữ liệu** | WEB + INFERRED | `jx-web-main/src/client/core/state-and-save-03.js` ~dòng 375: `Math.max(1, Math.min(r.max, a - r.req + 1))` |
| Chiêu 90 "cộng điểm" (xem §3) | Không chặn theo cấp nhân vật trong script; chặn theo **chiêu tiền đề** | VERIFIED | `skilllvlup.lua` |
| Học xong chiêu thường thì ở cấp 0 | `AddMagic(id)` không ghi cấp = học ở cấp 0, phải cộng điểm. Cùng chiêu 351: `skills_table` dùng `AddMagic(351)` và `skillbook.lua` ghi `IniLevel = 0`; chiêu luyện thì `AddMagic(id,1)` / `IniLevel = 1` | INFERRED (mạnh) | `skills_table.lua` add_tw…; `skillbook.lua` `sbook_list` |

**Mốc học (ReqLevel) chiêu thường 10–60 của mỗi phái**: lấy đúng từ `skills.txt` (đã có trong `skills.gen.ts`, trường `reqLevel`).
Lưu ý: nhãn tầng trong `LEARN` của mình theo **nhiệm vụ** (`skills_table.lua`), không luôn bằng `ReqLevel`
(vd. Thúy Yên 100 Hộ Thể Hàn Băng ở tầng "Cấp 30" nhưng ReqLevel 40; 109 Tuyết Ảnh tầng "Cấp 40" nhưng ReqLevel 50;
Võ Đang 159 Thất Tinh Trận tầng "Cấp 30" nhưng ReqLevel 20). **Chiêu 90 có ReqLevel = 80** trong `skills.txt` (tầng của mình đang ghi 90).

## 2. Gia nhập môn phái (cấp 10)

| Điều | Kết luận | Nhãn | Bằng chứng |
|---|---|---|---|
| Điều kiện cấp | Cấp ≥ 10 | VERIFIED | `stringresource.txt` 10189/10215 "đạt đến cấp 10 chúng ta sẽ là tỷ muội 1 nhà", 10241/10285/10312/10338 "…bao giờ đến cấp 10 lại đến tìm ta" |
| Điều kiện hệ | Phải cùng ngũ hành với phái | VERIFIED | 10286 "Ngũ hành của ngươi khác hệ Kim với bọn ta", 10340 "…không thuộc nhóm Ngũ hành hệ Hỏa…" |
| Nhiệm vụ nhập môn | Có phái đòi nhiệm vụ nhập môn (Thúy Yên: Hoa Khôi trận / Trà Cầm Thư; Thiên Nhẫn: Vũ Vương kiếm; Côn Lôn: rượu Bồng Lai Xuân…) | VERIFIED | 10183, 10210, 10333, 10360 |
| Thay đổi khi vào | Biến nhiệm vụ phái `Task(phái) = 10*256` ("đã nhập môn"), `SetLastFactionNumber`, nhận chiêu tầng **Nhập môn** (cấp 0); điểm kỹ năng tích từ cấp 1 (9 điểm ở cấp 10) đem cộng | VERIFIED (biến/chiêu) · INFERRED (thứ tự cụ thể, script NPC nằm ở server) | `skills_table.lua` `check_faction()` (`GetTask(n) >= 10*256`), `update_tw()` ("已入门" → the_lvl 10 → `add_tw` thêm 34/30/29 "（入门）") |
| Các tầng sau | Mở theo **nhiệm vụ môn phái** chứ không theo cấp: xong NV cấp 10 → chiêu "10级"; NV 20/30/40/50 → tầng tương ứng; xuất sư/hồi sư (cấp ≥ 60) → chiêu 60 + **trấn phái**; NV 90 (`Task121..130 == 255`) → chiêu 90 | VERIFIED | `update_tw()`: `UTask >= 20*256 -- 已完成10级任务 → the_lvl = 20`… `HaveMagic(42) … GetLevel() >= 60 → 70` |
| Chiêu chung | Khinh công 210 (`AddMagic(210,1)`, max 1), Kiếp Phú Tế Bần 400 (`AddMagic(400,1)`), Vũ Lộ Xuân Phong 397 (`AddMagic(397)`, cấp 0) | VERIFIED | `add_misc()` |

## 3. Chiêu 90 / 120 / 150 / Thất truyền — cách lên cấp

Quy ước cột "Cách lên": **Luyện** = thục luyện (exp chiêu, tự lên cấp; `IsExpSkill=1`); **Điểm** = cộng điểm kỹ năng
(`IsExpSkill=0` + `LevelUpScript` kiểm tra chiêu tiền đề); **Kinh mạch** = cấp theo hệ Kinh mạch.

Chung cho mọi phái (VERIFIED trừ chỗ ghi):
- **90 Luyện**: học bằng sách (`skillbook.lua`): đúng phái, **cấp ≥ 80**, chưa có chiêu → `AddMagic(id, 1)` = **cấp 1**.
  Hoặc NV 90 (`skills_table` `AddMagic(id,1)`). "Đại Thành Bí Kíp 90" (magicscript 2424) cho thẳng **cấp 20**. Max 20.
  Có `addskillexp1` (+1 exp cho chính chiêu) trên chiêu gốc và chiêu con (vd. 322 và 326) + `skill_skillexp_v`.
- **90 Điểm** (5 chiêu: 351, 390, 332, 391, 394): sách cho **cấp 0** (`IniLevel 0`), lên bằng điểm qua `LevelUpScript`
  (`skilllvlup.lua`): mỗi lần tốn 1 điểm; cần **mọi chiêu tiền đề ≥ 5**; khi cấp hiện tại ≤ 15 thì mỗi tiền đề phải ≥ cấp hiện tại + 5;
  từ cấp 16 trở lên chỉ cần tiền đề ≥ 5. Max 20. Khi tẩy điểm, chiêu này được giữ riêng rồi thêm lại (`SetTaskTemp(20,id)`).
- **120**: ReqLevel 120, `IsExpSkill=1`, max 20, có `skill_skillexp_v` (17.851.239 → 620.738.181) nhưng **không có `addskillexp1`**.
  Học bằng "Bí quyết kỹ năng cấp 120" (magicscript 1125, script `\script\task\lv120skill\item\lv120skillbook.lua` **không có trong client**);
  "Đại Thành Bí Kíp 120" (2425) cho thẳng cấp 20. Cấp khi học bằng bí quyết: không đọc được (**INFERRED: cấp 1**).
  Nguồn exp: không có trong dữ liệu; độ lớn bảng ngang exp nhân vật cấp 120+ (`level_exp.txt` cấp 120 = 100.000.000) ⇒
  **INFERRED**: exp chiêu 120 cộng từ exp đánh quái của nhân vật (engine), không phải mỗi đòn.
- **150**: ReqLevel 150, `IsExpSkill=1`, MaxLevel 26, bảng exp 25 mức (cấp 1–19: 300 → 21.400; cấp 20–25: 90.000 → 300.000);
  **không có `addskillexp1`** ⇒ cơ chế cộng exp nằm trong engine (INFERRED: mỗi đòn trúng, như 90). Nhận qua **NV kỹ năng 150**:
  "Đẳng cấp đạt đến 150, hơn nữa luyện được kỹ năng cấp 90 và 120 của môn phái mới có thể nhận…" (`taskui_150skill.lua`).
  Trên cấp 20 cần mở khóa: "Mở sách kĩ năng cấp 150" (3916: "mở được giới hạn tu luyện kĩ năng cấp 150 cấp 21"),
  "<Phái> kĩ năng cấp 150 Mật Tịch cấp 21/22/23" (3993…); `skilllvlup.lua` `tbLvUp150Limit:IsAvailable(mlvl+1, id)` khi cấp ≥ 20.
  "Tốc Hiệu Bạch Câu Hoàn cấp 150" (2975) tăng độ tu luyện 150. Cấp khi nhận: không có trong client (**INFERRED: cấp 1**).
- **Thất truyền 1220–1229**: ReqLevel 120, `IsExpSkill=1`, max 20, **không có bảng exp**; mô tả 1221: "cấp độ kĩ năng và cấp độ
  kinh mạch thấp nhất thống nhất" ⇒ cấp = cấp kinh mạch thấp nhất (server). Hoa Sơn 1370: ReqLevel 0, `IsExpSkill=1`, max 20 (mod).

### Bảng theo phái (ReqLevel / Max / IsExpSkill từ `skills.txt`; exp từ `magic_level_exp.txt` = `skill_skillexp_v`)

| Phái | Id | Tên | Tầng | Req | Max | Cách lên | Cấp khi học | Exp cấp 1 → cấp 20 (mức cuối) |
|---|---|---|---|---|---|---|---|---|
| Thiếu Lâm | 318 | Đạt Ma Độ Giang | 90 | 80 | 20 | Luyện | 1 | 6.312 → 89.830 |
| | 319 | Hoành Tảo Thiên Quân | 90 | 80 | 20 | Luyện | 1 | 7.605 → 108.232 |
| | 321 | Vô Tướng Trảm | 90 | 80 | 20 | Luyện | 1 | 5.700 → 81.121 |
| | 709 | Đại Thừa Như Lai Chú | 120 | 120 | 20 | Luyện (exp lớn) | 1? | 17,85 tr → 620,7 tr |
| | 1220 | Kim Quyên La Hán | TT | 120 | 20 | Kinh mạch | — | — |
| | 1055 / 1056 / 1057 | Đại Lực Kim Cang Chưởng / Vi Đà Hiến Xử / Tam Giới Quy Thiền | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| Thiên Vương | 322 | Phá Thiên Trảm | 90 | 80 | 20 | Luyện | 1 | 9.100 → 631.439 |
| | 323 | Truy Tinh Trục Nguyệt | 90 | 80 | 20 | Luyện | 1 | 16.375 → 1.136.243 |
| | 325 | Truy Phong Quyết | 90 | 80 | 20 | Luyện | 1 | 9.687 → 672.205 |
| | 708 | Đảo Hư Thiên | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1221 | Chinh Chiến Bát Phương | TT | 120 | 20 | Kinh mạch | — | — |
| | 1058 / 1059 / 1060 | Hào Hùng Trảm / Tung Hoành Bát Hoang / Bá Vương Tạm Kim | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| Đường Môn | 339 | Nhiếp Hồn Nguyệt Ảnh | 90 | 80 | 20 | Luyện | 1 | 6.000 → 85.390 |
| | 302 | Bạo Vũ Lê Hoa | 90 | 80 | 20 | Luyện | 1 | 6.130 → 174.481 |
| | 342 | Cửu Cung Phi Tinh | 90 | 80 | 20 | Luyện | 1 | 11.700 → 166.511 |
| | 351 | Loạn Hoàn Kích | 90 | 80 | 20 | **Điểm** (tiền đề 347, 303, 343, 345, 349) | 0 | — |
| | 710 | Mê Ảnh Tung | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1223 | Hấp Tinh Trận | TT | 120 | 20 | Kinh mạch | — | — |
| | 1069 / 1070 / 1071 | Vô Ảnh Xuyên / Thiết Liên Tứ Sát / Càn Khôn Nhất Trịch | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| | 1110 | Tích Lịch Loạn Hoàn Kích | 150 | 150 | 26 | **Điểm** (tiền đề 45, 351; >20 cần mở khóa 150) | 0? | — |
| Ngũ Độc | 353 | Âm Phong Thực Cốt | 90 | 80 | 20 | Luyện | 1 | 8.850 → 125.951 |
| | 355 | Huyền Âm Trảm | 90 | 80 | 20 | Luyện | 1 | 7.500 → 106.738 |
| | 390 | Đoạn Cân Hủ Cốt | 90 | 80 | 20 | **Điểm** (tiền đề 67, 70, 64, 356, 72) | 0 | — |
| | 711 | Hấp Tinh Yểm | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1232 | Hồn Ảnh Tùng Sanh | 120 | 120 | 20 | IsExp=1, không có bảng exp — chưa rõ | ? | — |
| | 1222 | Sâm La Độc Hải | TT | 120 | 20 | Kinh mạch | — | — |
| | 1066 / 1067 | Hình Tiêu Cốt Lập / U Hồn Phệ Ảnh | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| Nga My | 328 | Tam Nga Tề Tuyết | 90 | 80 | 20 | Luyện | 1 | 7.500 → 106.738 |
| | 380 | Phong Sương Toái Ảnh | 90 | 80 | 20 | Luyện | 1 | 9.390 → 133.636 |
| | 332 | Phổ Độ Chúng Sinh | 90 | 80 | 20 | **Điểm** (tiền đề 93, 89, 86, 92, 282) | 0 | — |
| | 712 | Bế Nguyệt Phất Trần | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1224 | Ba La Tâm Kinh | TT | 120 | 20 | Kinh mạch | — | — |
| | 1061 / 1062 / 1114 | Kiếm Hoa Vãn Tinh / Băng Vũ Lạc Tinh / Ngọc Tuyền Tâm Kinh | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| Thúy Yên | 336 | Băng Tung Vô Ảnh | 90 | 80 | 20 | Luyện | 1 | 4.000 → 227.708 |
| | 337 | Băng Tâm Tiên Tử | 90 | 80 | 20 | Luyện | 1 | 6.500 → 92.506 |
| | 713 | Ngự Tuyết Ẩn | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1225 | Huyền Băng Vô Tức | TT | 120 | 20 | Kinh mạch | — | — |
| | 1063 / 1065 | Băng Tước Hoạt Kỳ / Thủy Anh Man Tú | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| Cái Bang | 357 | Phi Long Tại Thiên | 90 | 80 | 20 | Luyện | 1 | 4.300 → 244.786 |
| | 359 | Thiên Hạ Vô Cẩu | 90 | 80 | 20 | Luyện | 1 | 3.500 → 149.433 |
| | 714 | Hỗn Thiên Khí Công | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1227 | Ô Y Quyết | TT | 120 | 20 | Kinh mạch | — | — |
| | 1073 / 1074 | Thời Thặng Lục Long / Bổng Huýnh Lược Địa | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| | 1072 | Ngũ Diệu Càn Khôn | 150 | 150 | 20 | IsExp=1, không có bảng exp — chưa rõ | ? | — |
| Thiên Nhẫn | 361 | Vân Long Kích | 90 | 80 | 20 | Luyện | 1 | 5.800 → 82.544 |
| | 362 | Thiên Ngoại Lưu Tinh | 90 | 80 | 20 | Luyện | 1 | 6.127 → 87.205 |
| | 391 | Nhiếp Hồn Loạn Tâm | 90 | 80 | 20 | **Điểm** (tiền đề 136, 137, 140, 364, 143) | 0 | — |
| | 715 | Ma Âm Phệ Phách | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1226 | Liệt Hỏa Phẫn Thiên | TT | 120 | 20 | Kinh mạch | — | — |
| | 1075 / 1076 | Giang Hải Nộ Lan / Tật Hỏa Liệu Nguyên | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| Võ Đang | 365 | Thiên Địa Vô Cực | 90 | 80 | 20 | Luyện | 1 | 14.700 → 284.635 |
| | 368 | Nhân Kiếm Hợp Nhất | 90 | 80 | 20 | Luyện | 1 | 10.800 → 153.703 |
| | 716 | Xuất Ứ Bất Nhiễm | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1228 | Chân Vũ Thất Tiệt | TT | 120 | 20 | Kinh mạch | — | — |
| | 1078 / 1079 | Tạo Hóa Thái Thanh / Kiếm Thùy Tinh Hà | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| | 1105 | Kiếm Vũ Diệu Nguyệt | 150 | 150 | 20 | IsExp=1, không có bảng exp — chưa rõ | ? | — |
| Côn Lôn | 372 | Ngạo Tuyết Tiêu Phong | 90 | 80 | 20 | Luyện | 1 | 17.150 → 244.074 |
| | 375 | Lôi Động Cửu Thiên | 90 | 80 | 20 | Luyện | 1 | 21.320 → 303.421 |
| | 394 | Túy Tiên Tá Cốt | 90 | 80 | 20 | **Điểm** (tiền đề 392, 174, 393, 175, 90) | 0 | — |
| | 717 | Lưỡng Nghi Chân Khí | 120 | 120 | 20 | Luyện (exp lớn) | 1? | như 709 |
| | 1229 | Thiên Cương Khất Kính | TT | 120 | 20 | Kinh mạch | — | — |
| | 1080 / 1081 | Cửu Thiên Cương Phong / Thiên Lôi Chấn Nhạc | 150 | 150 | 26 | Luyện + mật tịch >20 | 1? | 300 → 300.000 |
| | 1108 | Phong Minh Ngọc Toái | 150 | 150 | 20 | IsExp=1, không có bảng exp — chưa rõ | ? | — |
| Hoa Sơn (mod) | 1363 / 1364 / 1382 | Thái Nhạc Tam Thanh Phong / Đoạt Mệnh Liên Hoàn Tam Tiên Kiếm / Phách Thạch Phá Ngọc | 90 | **90** | 20 | IsExp=1; 1364/1382 có bảng exp (7.500 → 106.738), **không có `addskillexp1`**, 1363 không có bảng | ? | — |
| | 1365 | Tử Hà Kiếm Khí | 120 | 120 | 20 | như 120 các phái | ? | như 709 |
| | 1370 | Hạo Nhiên Chi Khí | TT | 0 | 20 | Kinh mạch? (mod) | — | — |
| | 1368 / 1369 / 1384 | Độc Cô Cửu Kiếm / Cửu Kiếm Hợp Nhất / Thần Quang Toàn Nhiễu | 150 | 150 | 20 | IsExp=1; 1369 dùng bảng kiểu 90, 1384 có 26 mức (300 → 390.000), 1368 không có bảng | ? | — |

Ghi chú: tiền đề chiêu 90 "Điểm" khác `jx-web-main` (`shop-and-books-01.js` `ee`): web thêm 181 cho 394 và 73 cho 390 — bản gốc không có.

## 4. Exp thục luyện

| Điều | Kết luận | Nhãn | Bằng chứng |
|---|---|---|---|
| Bảng exp | `magic_level_exp.txt` (57 dòng: MAGICID, tên, FACTIONID, LEVEL1…26) **trùng** `skill_skillexp_v` trong `script/skill/<phái>.lua` | VERIFIED | so 318, 322, 336… giống nhau |
| Nghĩa của giá trị | Exp cần để lên **từ cấp L lên L+1** (không cộng dồn): nhiều dòng giảm dần ở cuối (318: 91.287 → 89.830; 319: 132.702 → 107.451) nên không thể là cộng dồn; 150 có 25 mức cho max 26 | INFERRED (mạnh) | `magic_level_exp.txt` |
| Công thức sinh bảng 90 | `SkillExpFunc(Exp0, a, L, Time, Range) = floor(Exp0 × a^(L−1) × Time × Range / 2)`; chú thích: theo "độ thục luyện cấp 1, gia tốc lên cấp, cấp, **số lần gây sát thương lặp lại**, phạm vi" | VERIFIED | `head.lua` dòng 1–7; vd. 322 = `SkillExpFunc(7280,1.25,L,2.5,1)` → 9.100 |
| Mỗi đòn được bao nhiêu | `addskillexp1 = {{1,id},{2,id}}, {{1,1},{20,1}}, {{1,0},{2,0}}` ⇒ cộng **1** exp vào chiêu `id` (mọi cấp). Gắn ở cả chiêu gốc và chiêu con gây sát thương (322 và 326) ⇒ INFERRED: mỗi lần trúng một mục tiêu +1 (bảng nhân "số lần sát thương lặp lại" nên exp đếm theo đòn trúng) | VERIFIED (giá trị 1) · INFERRED (theo đòn trúng) | `tianwang.lua` dòng 340; `docs/combat-formulas.md` §7.4 (ghi SRC engine đã xóa: "mỗi đòn trúng địch +1 × tỉ lệ cấu hình") |
| Hệ số server | "tỉ lệ cấu hình" không có trong `gamesetting.ini` client | — | server |
| Giới hạn | Không lên quá `MaxLevel`; 150 dừng ở 20 tới khi dùng vật phẩm mở khóa 21/22/23…; không thấy giới hạn theo cấp nhân vật cho chiêu luyện | VERIFIED (150) · INFERRED (còn lại) | `skilllvlup.lua` `tbLvUp150Limit`; magicscript 3916, 3993… |
| Lên cấp tự động | "kỹ năng của bạn %s thông qua rèn luyện đã được nâng cấp rồi!" | VERIFIED | `stringtable_core.txt` `G_SkillList_0` |
| Tổng exp ví dụ | 322 cấp 1→20: 2.489.349 đòn; 318: 871.917; 150 cấp 1→20: 154.300, 20→26: 1.110.000 | tính từ bảng | |
| Tăng nhanh | Bạch Câu Hoàn kỹ năng (1372; 8 giờ ủy thác tăng thục luyện chiêu 90), Đại Bạch Câu Hoàn (977), loại đặc biệt (1182, gấp đôi), Tốc Hiệu Bạch Câu Hoàn 150 (2975) | VERIFIED | `magicscript.txt` |

## 5. So với `jx-web-main` (không phải nguồn gốc)

- Cấp tối đa chiêu thường: `min(max, cấp − req + 1)` (`state-and-save-03.js`).
- Thục luyện 90 / 150: cộng theo **mạng quái** (1 thường / 3 tinh anh / 20 boss, quái phải ≥ cấp người − 10), bảng tự chế
  `25 × L^1.35 + 25` (`combat/skills-01.js` `Z5`, `p7`; `shop-and-books-01.js` `v4`) — **khác hẳn** bảng gốc (bảng riêng từng chiêu, +1 mỗi đòn).
- Chiêu 120 không cho đặt vào phím, không lên cấp (`tier !== 120`).

## 6. Hệ quả cho dự án (gợi ý, chưa duyệt)

- `LEARN` tầng "Cấp 90" nên mở ở **cấp 80** (ReqLevel + điều kiện sách), không phải 90.
- KN4: dùng `skill_skillexp_v` + `addskillexp1` đã có trong `skills.gen.ts`; chiêu `expSkill` từ chối cộng điểm (G_PLAYER_1);
  5 chiêu 90 "Điểm" + 1110 cần luật tiền đề của `skilllvlup.lua`.
- KN12: luật `cấp − ReqLevel + 1` chỉ là WEB/INFERRED (có G_PLAYER_4 làm chỗ dựa); nên ghi rõ là lựa chọn của dự án.
- Chưa rõ, cần người dùng quyết: nguồn exp chiêu 120; cơ chế exp 150 (không có `addskillexp1`); 1072/1105/1108/1232 và chiêu Hoa Sơn.
