# PK, trận doanh (màu chữ) và tổ đội

Người dùng yêu cầu 2026-11-12 (vòng 25). Mã: `packages/shared/src/combat/rules.ts` (luật), `apps/server/src/world/teams.ts` (tổ đội),
`apps/server/src/world/targeting.ts` (`attackable`, `friendly`), client `ui/windows/team.ts`, `game/actors/ActorView.ts` (màu tên).

## Trận doanh (màu chữ)

| Phe | Màu | Môn phái (DATA `settings/faction/门派设定.ini` `Camp=`) |
|---|---|---|
| Tân thủ | trắng (`#ffffff`) | chưa vào phái |
| Chính phái (`C_JUSTICE`) | vàng cam dịu (`#e8b878`) | Thiếu Lâm, Nga My, Cái Bang, Võ Đang |
| Trung lập (`C_BALANCE`) | xanh lá (`#7fe08a`) | Thiên Vương, Đường Môn, Thúy Yên, Côn Lôn, Hoa Sơn |
| Tà phái (`C_EVIL`) | tím (`#d58cff`) | Ngũ Độc, Thiên Nhẫn |
| Xuất sư (`C_FREE`) | đỏ (`#ff3333`) | nhân vật đã xuất sư (`graduated`, đổi qua Lệnh bài) |

Phe từng phái lấy từ dữ liệu (bảng file rời của bản mod; bảng gốc trong PAK không có cột này). Màu chữ do engine vẽ, không có trong dữ
liệu: **CHỌN** theo bản gốc (`CAMP_COLORS`).

**Trong tổ đội**, mọi thành viên mang phe của **đội trưởng** (cả tân thủ) — `refreshCamp`. Rời đội thì về phe của mình.

## Chế độ PK (phím P, nút PK đổi vòng)

| Mã | Tên | Đánh được người chơi |
|---|---|---|
| 0 | Luyện công | không |
| 1 | Chiến đấu | người **khác màu chữ** (khác phe), trừ tổ đội |
| 2 | Đồ sát | mọi người, trừ tổ đội |

Luôn cần bản đồ cho PK (`MapRules.pvp`, không phải thành). Tân thủ (chữ trắng, không trong đội) không bật PK được và không bị đánh.
Người bị đánh không cần bật PK (**suy luận**, giống mô tả của người dùng; chưa có sát khí / tù như bản gốc).

## Đồng minh của kỹ năng (bùa lợi, hào quang, hồi máu)

`friendly(a, b)` (server `targeting.ts`): cùng loại, **không** đánh được nhau, và cùng tổ đội **hoặc** cùng phe (màu chữ). Kỹ năng hỗ trợ
diện rộng dùng hàm này (`SkillEngine` cổng `friendly`); bùa hại / hào quang hại dùng `hostile` (= đánh được, nên với người chơi cần PK).

Đã rà theo dữ liệu gốc (vòng 26, cờ `TargetAlly` / `TargetEnemy` + bán kính trong `skills.txt`, script `script/skill/*.lua`):

| Chiêu | Dữ liệu | Áp cho |
|---|---|---|
| La Hán Trận 16 (Thiếu Lâm, hào quang) | đồng minh + mình, 180; `addphysicsdamage_p`, **phản đòn** `meleedamagereturn_p` / `rangedamagereturn_p`, `adddefense_v` | người cùng đội / màu chữ đứng gần |
| Bất Động Minh Vương 15 (Thiếu Lâm) | đồng minh + mình, 400 | như trên |
| Lưu Thủy 86 (tốc chạy), Mộng Điệp 89 (hồi máu / nội), Phật Tâm Từ Hữu 92 (sinh lực tối đa), Thanh Âm Phạn Xướng 282, Phổ Độ Chúng Sinh 332 (Nga My, hào quang) | đồng minh + mình, 180 | như trên |
| **Bế Nguyệt Phất Trần 712** (Nga My 120) | `skill_appendskill`: 86 + chiêu phụ 89, 92, 282, 332 — bật **cả 5 hào quang** ở cấp 712 (cấp 20 → 40) | như trên (`TUNING[712].appendSkills`) |
| **Ngọc Tuyền Tâm Kinh 1114** (Nga My 150) | đạn băng đánh địch; từ cấp 10 sự kiện bay gọi **Minh Tâm Kiến Tính 1115** (đồng minh + mình, 400, hồi 275–750 sinh lực) | địch bị đánh, đồng minh được hồi máu |
| Bùa Thiên Nhẫn (Hỏa Liên Phần Hoa 136, Ảo Ảnh Phi Hồ, Phi Hồng Vô Tích, Bi Tô Thanh Phong, Lịch Ma Đoạt Hồn, Nhiếp Hồn Loạn Tâm), Côn Lôn (Thúc Phược Chú, Kí Bán Phù, Bắc Minh Đáo Hải, Khi Hàn Ngạo Tuyết, Khí Tâm Phù, Mê Tung Ảo Ảnh, Túy Tiên Tá Cốt), Ngũ Độc (Cửu Thiên Cuồng Lôi, Xích Diệm Thực Thiên, Băng Lam Huyền Tinh, Xuyên Y Phá Giáp, Vạn Độc Thực Tâm, Xuyên Tâm Độc Thích, Đoạn Cân Hủ Cốt; hào quang Vô Hình Độc 69) | `TargetEnemy`, 400–470 | địch (quái; người chơi khi PK cho phép) |

Người dùng nói "skill 120 Nga My vừa gây sát thương vừa hồi máu": theo dữ liệu đó là chiêu **150** Ngọc Tuyền Tâm Kinh; chiêu 120 là
Bế Nguyệt Phất Trần (5 hào quang, không gây sát thương). Phản đòn: `formulas/damage.ts damageReturn` (% sát thương nhận + điểm, trừ
`returnres_p` của kẻ đánh; không phản lại lần nữa — CHỌN).

## Tổ đội

- USER2026-11-17: cờ vàng nhỏ trên đầu đội trưởng, mọi người gần đó đều thấy qua `Actor.teamLeader` do server xác định. Nhường đội trưởng/rời đội/giải tán cập nhật cờ; ẩn khi chết hoặc ra ngoài vùng nhìn. Dùng bộ vẽ chung Web/Desktop/Mobile; chưa kiểm native/điện thoại thật.

- Mời bằng nút **Mời** trong danh sách **người chơi xung quanh** (những người đang thấy trên màn hình, gần nhất trước, làm mới mỗi giây —
  vòng 28, như jx-web-main không cần gõ tên), người được mời Đồng ý / Từ chối (hết hạn 60 giây). Tối đa **8** người
  (`MAX_TEAM`, như JX1). Người không ở trong đội mời thì thành đội trưởng.
- Đội trưởng: mời, mời ra, nhường đội trưởng. Ai cũng rời đội được; còn 1 người thì đội giải tán.
- USER2026-11-16: vào đội xóa toàn bộ lời mời chờ ở server và giao diện, kể cả người vừa thành đội trưởng khi lập đội. Lời mời cũ không dùng lại được sau rời đội; lời mời mới gửi tới người đã có đội bị chặn, client bỏ qua gói mời đến muộn. Rời đội nhận lời mời mới bình thường; đội trưởng vẫn mời thêm người khi đội còn chỗ.
- Đội sống ở tiến trình server, xuyên bản đồ; ngoại tuyến quá 30 giây (thoát game) thì rời đội, chuyển bản đồ không mất đội.
- Cửa sổ Tổ đội (phím **G**, nút trên thanh dưới): thành viên, cấp, phái, bản đồ, thanh Sinh lực (cập nhật 2 giây).
- Đồ rơi: 20 giây đầu người đánh chết quái **và tổ đội** được nhặt (VT7).
- **Kinh nghiệm** (USER 2026-11-13, luật đơn giản thay cách chia gốc): người giết quái nhận **100 %** exp của quái, mỗi đồng đội khác
  đứng gần quái (`LEVEL.expShareRange`, cùng bản đồ) nhận **80 %** (`LEVEL.teamExpPct`) dù không đánh; người ngoài đội có đánh vẫn nhận
  phần theo sát thương. Tất cả sau chênh lệch cấp (`expAfterGap`). Mã: `world/progress.ts shareKillExp`.

## Phím tắt thanh dưới (vòng 25)

G Tổ đội · K Kỳ Trân Các · B Thợ rèn · P đổi chế độ PK (cùng các phím cũ: F3, I, F, M, Z, Esc). Danh sách: `input/keymap.ts`.
