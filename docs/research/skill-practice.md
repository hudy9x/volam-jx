# Thục luyện chiêu 90 / 150: mất bao lâu trong bản gốc (2026-11-12)

Nhãn: **VERIFIED** = đọc thấy trong dữ liệu gốc (ghi file + giá trị) · **INFERRED** = suy luận · **WEB** = chỉ có ở `jx-web-main`.
Bổ sung cho `docs/research/skills-progression.md` (không lặp lại phần đã có ở đó). Đường dẫn `de/` = `jx-origin/data_extract/`.

## 1. Kết luận ngắn

- Mỗi lần trúng = **+1 exp** cho chiêu (`addskillexp1` P2 = 1 mọi cấp). Không có hệ số "tốc độ thục luyện" nào trong dữ liệu client
  (`gamesetting.ini` chỉ có `ExpRate` / `MoneyRate`); nếu server có thì nằm trong mã server, không đọc được.
- Bảng exp mỗi chiêu 90 đã được **nhân sẵn số đòn mỗi lần ra chiêu (Time) × số mục tiêu dự kiến (Range)**, nên tính theo
  **lần ra chiêu** thì mọi chiêu 90 cần cùng cỡ: khoảng **0,25 – 1,06 triệu lần ra chiêu** từ cấp 1 lên 20.
- Đánh quái liên tục: chiêu 90 từ 1 lên 20 mất khoảng **220 – 1.250 giờ** nếu chỉ 1 đòn trúng / giây; **45 – 250 giờ** nếu 5 đòn / giây.
  Chiêu 150 từ 1 lên 20 cần **154.300** đòn (≈ 43 giờ ở 1 đòn/giây, ≈ 9 giờ ở 5 đòn/giây); từ 20 lên 26 cần thêm 1.110.000 đòn.
- Vì vậy bản gốc có **Bạch Câu Hoàn kỹ năng**: treo máy rời mạng ("ủy thác") 8 giờ / viên, vẫn tăng thục luyện chiêu 90.
  **Tốc độ ủy thác (exp/phút) không có trong client** (script `\script\global\baijuwanhead.lua` + engine server đều thiếu).

## 2. Luật cộng exp

| Điều | Kết luận | Nhãn | Bằng chứng |
|---|---|---|---|
| Exp mỗi đòn | +1 cho mọi cấp 1–20 (dạng `{{1,1},{20,1}}`) | VERIFIED | `de/slistcache/script/skill/*.lua`: 25 dòng `addskillexp1`, tất cả `{{1,1},{20,1}}` trừ 2 chiêu ở dòng dưới |
| Ngoại lệ | 330 Thiên Phật Thiên Diệp (Nga My), 374 Vụ Tỏa Côn Lôn: `{{1,1},{20,10}}` (+1 → +10 theo cấp), bảng `{{1,20000},{20,1e8 / 84.567.890,Conic}}`. Hai chiêu này IsExpSkill=1, ReqLevel 80 nhưng **không có** trong `magic_level_exp.txt` / bảng học | VERIFIED (giá trị) · INFERRED (chiêu cũ, không dạy) | `emei.lua` khối `qianfo_qianye`, `kunlun.lua` khối `wusuo_kunlun` |
| Chiêu nhận exp | P1 = 0 → chính chiêu đang đánh; Thiên Vương / Đạt Ma ghi rõ id (322, 323, 325, 318) để đòn của chiêu con cộng về chiêu gốc | VERIFIED (giá trị) · INFERRED (nghĩa P1=0) | `tianwang.lua` 340/426/505, `shaolin.lua` 207 |
| Tính theo từng mục tiêu trúng | Bảng nhân `Range` = số mục tiêu dự kiến: chiêu đánh nhiều mục tiêu có Range 3 / 5 (Nhiếp Hồn Nguyệt Ảnh 3, Huyền Âm Trảm 3, Cửu Cung Phi Tinh 5, Âm Phong Thực Cốt 5), chiêu đơn = 1 ⇒ exp đếm **mỗi mục tiêu bị trúng**, không phải mỗi lần ra chiêu | INFERRED (mạnh) | `head.lua`: `SkillExp(i) = Exp1*a^(i-1)*time*range`; vd. 339 `SkillExpFunc(4000,1.215,L,1,3)` → cấp 1 = 6.000 khớp `magic_level_exp.txt` |
| Đòn lặp / nhiều đạn | Bảng nhân `Time` = "số lần gây sát thương lặp lại" (2 – 8; Lôi Động Cửu Thiên 8, Truy Tinh Trục Nguyệt 5) ⇒ mỗi lần gây sát thương (mỗi đạn trúng) +1 | INFERRED (mạnh) | chú thích GBK `head.lua` dòng 1–4 (`重复伤害次数`) |
| Độc theo nhịp | Âm Phong Thực Cốt (độc) có Time = 1 ⇒ nhịp độc **không** tính riêng (nếu tính, bảng đã nhân số nhịp) | INFERRED | `wudu.lua` `yinfeng_shigu` `SkillExpFunc(3540,1.15,L,1,5)` |
| Chỉ quái hay cả người | Không có dữ liệu | — | engine |
| 120 / 150 | Không có `addskillexp1`; nguồn exp ở engine (đã ghi ở tài liệu cũ) | VERIFIED (vắng) | `tianwang.lua` khối `daotianwang150` chỉ có `skill_skillexp_v` |
| Trần cấp | 90: MaxLevel 20. 150: dừng ở 20, mở 21–26 bằng sách "Mở sách kĩ năng cấp 150" (3916) / "Sách kĩ năng cấp 150 cấp 22…26" (4149–4153) | VERIFIED | `magicscript.txt`; `skilllvlup.lua` dòng 89 `tbLvUp150Limit:IsAvailable` (`lvlup150_limit.lua` không có trong client) |
| Hệ số server | `[ServerConfig] ExpRate=100, MoneyRate=100`; không có khóa nào cho exp kỹ năng | VERIFIED | `de/slistcache/settings/gamesetting.ini` dòng 241–242 |
| "Chiêu 80" | Chiêu tầng 90 có **ReqLevel 80** (học bằng sách khi cấp ≥ 80) — đây là "chiêu 80" người dùng nói; Hoa Sơn (mod) là 90 | VERIFIED | `skills.txt` cột ReqLevel |

## 3. Bảng tham số và tổng exp 1 → 20 (chiêu 90)

Tổng = cộng `LEVEL1..LEVEL19` của `de/slistcache/settings/npc/player/magic_level_exp.txt` (VERIFIED). Time × Range lấy từ
`SkillExpFunc(Exp0, a, L, Time, Range)` trong `script/skill/<phái>.lua` (VERIFIED). Thời gian là ước tính (chạy liên tục, mọi đòn trúng).

| Id | Chiêu | Tổng exp 1→20 | Time×Range | 1 đòn/giây | 5 đòn/giây | 1 lần ra chiêu/giây, trúng đủ Time×Range |
|---|---|---|---|---|---|---|
| 318 | Đạt Ma Độ Giang | 871.917 | 2×1 | 242 h | 48 h | 121 h |
| 319 | Hoành Tảo Thiên Quân | 1.079.884 | 3×1 | 300 h | 60 h | 100 h |
| 321 | Vô Tướng Trảm | 787.376 | 2×1 | 219 h | 44 h | 109 h |
| 322 | Phá Thiên Trảm | 2.489.349 | 2.5×1 | 691 h | 138 h | 277 h |
| 323 | Truy Tinh Trục Nguyệt | 4.479.468 | 5×1 | 1.244 h | 249 h | 249 h |
| 325 | Truy Phong Quyết | 2.650.061 | 2.5×1 | 736 h | 147 h | 294 h |
| 339 | Nhiếp Hồn Nguyệt Ảnh | 828.820 | 1×3 | 230 h | 46 h | 77 h |
| 302 | Bạo Vũ Lê Hoa | 1.628.083 | 1×1 → 1×2 | 452 h | 90 h | 250 h |
| 342 | Cửu Cung Phi Tinh | 1.616.204 | 1×5 | 449 h | 90 h | 90 h |
| 353 | Âm Phong Thực Cốt | 1.222.511 | 1×5 | 340 h | 68 h | 68 h |
| 355 | Huyền Âm Trảm | 1.036.023 | 1×3 | 288 h | 58 h | 96 h |
| 328 | Tam Nga Tề Tuyết | 1.036.023 | 3×1 | 288 h | 58 h | 96 h |
| 380 | Phong Sương Toái Ảnh | 1.297.106 | 3×1 | 360 h | 72 h | 120 h |
| 336 | Băng Tung Vô Ảnh | 1.330.460 | 1×1 → 1×4 | 370 h | 74 h | 153 h |
| 337 | Băng Tâm Tiên Tử | 897.886 | 1×1 | 249 h | 50 h | 249 h |
| 357 | Phi Long Tại Thiên | 1.456.344 | 1×1 → 4×1 | 405 h | 81 h | 165 h |
| 359 | Thiên Hạ Vô Cẩu | 918.812 | 1×1 → 3×1 | 255 h | 51 h | 134 h |
| 361 | Vân Long Kích | 801.189 | 1×1 | 223 h | 45 h | 223 h |
| 362 | Thiên Ngoại Lưu Tinh | 846.430 | 3×1 | 235 h | 47 h | 78 h |
| 365 | Thiên Địa Vô Cực | 2.107.270 | 5×1 | 585 h | 117 h | 117 h |
| 368 | Nhân Kiếm Hợp Nhất | 1.491.879 | 3×1 | 414 h | 83 h | 138 h |
| 375 | Lôi Động Cửu Thiên | 2.945.090 | 8×1 | 818 h | 164 h | 102 h |
| 372 | Ngạo Tuyết Tiêu Phong | 2.369.056 | 5×1 | 658 h | 132 h | 132 h |

Ghi chú:
- Bảng = `floor(Exp0 × a^(L−1) × Time × Range / 2)` ⇒ số **lần ra chiêu** cấp L → L+1 ≈ `Exp0 × a^(L−1) / 2` (cấp 1: 1.770 – 6.500 lần).
  Chỉ Thiên Vương dùng a = 1,25 cố định nên cuối bảng rất dốc (323 cấp 19 → 20 = 908.995); các chiêu khác a đổi theo cấp (1,15 → 1,24 → 1,15).
- Một số chiêu tăng Time / Range theo cấp (cột "a → b": số đạn / mục tiêu tăng khi lên cấp), cột cuối đã tính theo từng cấp.
- Tổng số lần ra chiêu 1 → 20 (cột cuối × 3.600): 244.502 (Âm Phong Thực Cốt) → 1.060.024 (Truy Phong Quyết).
- Cột cuối = ước lượng "đúng thiết kế" (mỗi lần ra chiêu trúng đủ số đòn và số mục tiêu bảng giả định). Thực tế chiêu nhiều mục tiêu
  đánh bầy quái sẽ nhanh hơn chiêu đơn rất nhiều — vì exp tính theo mục tiêu.
- Tốc độ ra chiêu thật của JX1 (18 khung / giây, tùy tốc độ đánh / thi triển) không có trong tài liệu này; nhân cột cuối với 1 / (lần ra chiêu mỗi giây).

## 4. Chiêu 150

| Mốc | Exp | 1 đòn/giây | 5 đòn/giây | Nhãn |
|---|---|---|---|---|
| 1 → 20 (`LEVEL1..19` = 300, 600, 1.000 … 21.400) | 154.300 | 42,9 h | 8,6 h | VERIFIED (bảng) · INFERRED (+1/đòn) |
| 20 → 26 (90.000 … 300.000), cần sách mở khóa từng cấp | 1.110.000 | 308 h | 62 h | VERIFIED |
| Cả 1 → 26 | 1.264.300 | 351 h | 70 h | |

Mọi chiêu 150 dùng **chung một bảng**, không nhân Time / Range (VERIFIED: `magic_level_exp.txt` 1055–1081 giống hệt nhau).

## 5. Vật phẩm tăng tốc (`de/slistcache/settings/item/004/magicscript.txt`, VERIFIED trừ chỗ ghi)

| Vật phẩm (ParticularType) | Mô tả gốc | Ghi chú |
|---|---|---|
| Bạch Câu Hoàn kỹ năng (1372) | "8 giờ ủy thác, tăng độ thục luyện kỹ năng cấp 90" | script `jinengbaijuwan.lua` không có trong client |
| Đại Bạch Câu Hoàn (Kỹ năng) (977) | 8 giờ ủy thác, "tự động tăng độ thục luyện kỹ năng cấp 90", hiệu quả **×1,5** so với loại thường | `de/update01/script/item/jinengdabaijuwan.lua`: thời gian lưu ở biến riêng `AEXP_SKILL_TIME_TASKID` (tách khỏi Bạch Câu Hoàn exp), cộng dồn tối đa **10.000 giờ**, có mục "Chọn kỹ năng rời mạng vẫn treo máy" (`selectofflineskill`) ⇒ **mỗi lúc luyện 1 chiêu** đã chọn |
| Bạch Câu Hoàn kỹ năng đặc biệt (1182) | 8 giờ, hiệu quả **×2** so với loại thường | script không có |
| Lễ bao / hộp (1374, 1382, 1731…) | 5 – 10 viên | |
| Bạch Cầu Hoàn Kỹ Năng (2535) | "làm cho độ tu luyện kỹ năng tăng lên" — dùng ngay (`suxiaojinengbaijuwan.lua`, *tốc hiệu*) | lượng tăng: không có trong client |
| Tốc Hiệu Bạch Câu Hoàn cấp 150 (2975) | "độ tu luyện của kỹ năng cấp 150 được nâng cao" — dùng ngay | `suxiaobaijuwan_150.lua` không có; lượng tăng không rõ |
| Đại Thành Bí Kíp 90 / 120 (2424 / 2425) | cho thẳng cấp 20 (đã ghi ở tài liệu cũ) | |

Điều kiện ủy thác (VERIFIED, `lang/vn/stringtable_client.txt` `G_STR_*`): phải ở trạng thái **phi chiến đấu**, trong **7 thành thị,
8 tân thủ thôn, khu vực 10 môn phái**; hết giờ thì bị thoát. Bạch Câu Hoàn exp / đại cần tài khoản đã nạp thẻ (`GetExtPoint(0) < 1` → từ chối)
và cấp ≥ 50 mới nhận exp (`dabaijuwan.lua`). Hệ số ×1,5 / ×2 là **so với loại thường**, còn lượng gốc mỗi phút **không có** ⇒ không tính
được "1 viên = bao nhiêu cấp". Công thức để dùng khi có số: `giờ_ủy_thác = tổng_exp / (R × hệ số × 60)` với R = exp/phút của viên thường.

Không liên quan thục luyện: skill 443 "Bạch Câu hoàn" (`skills.txt`, "Nội 1 giờ tự động đả quái", `autoattacknpc`) là bản cũ = bật
tự đánh 1 giờ; `baijuwan.lua` hiện bị khóa (`if (1) then Say("Chức năng vẫn chưa mở")`).

## 6. `jx-web-main` (WEB, không phải nguồn gốc)

- `combat/skills-01.js` `p7`/`Z5`: cộng theo **mạng quái** (1 thường / 3 tinh anh / 20 boss, quái ≥ cấp người − 10), cộng cho **mọi** chiêu
  90/150 đã học; bảng tự chế `v4(L) = 25·L^1.35 + 25` (`gameplay/shop-and-books-01.js`) ⇒ 1→20 chỉ vài nghìn mạng quái.
- `core/state-and-save-03.js` `hP`: thưởng rời mạng tính ra "số mạng quái" rồi gọi `Z5`; Bạch Câu Hoàn ở web = rời mạng 100% tốc độ
  (`o.bch`, `shop-and-books-02.js`). Không giống bản gốc.

## 7. Gợi ý cho dự án (chưa duyệt)

- Cách đang làm (`learning.ts` `practicePerHit` = P2 hoặc 1; `progress.ts` `practice` mỗi đòn trúng, bỏ nhịp độc) **khớp** với suy luận ở §2.
  Cần kiểm tra thêm: đòn trúng nhiều mục tiêu phải gọi `practice` **mỗi mục tiêu** (bảng gốc giả định vậy).
- Giữ bảng gốc thì 90 lên 20 mất hàng trăm giờ đánh tay: cần quyết (a) hệ số server riêng cho thục luyện (bản gốc không có trong client,
  dự án tự chọn), (b) có làm "ủy thác" + Bạch Câu Hoàn kỹ năng không, và tốc độ R (tự chọn, không có số gốc).
- 20 tick/giây của mình vs 18 của gốc: không ảnh hưởng vì exp tính theo đòn trúng, không theo tick.
