# Bảng Thống Kê Trạng Thái Triển Khai Kỹ Năng Cấp 120 (Thập Đại Phái)

Nguồn đối chiếu: [`/Users/hudy/ws/volam-3005/documents/skill-120-thap-dai-phai.md`](file:///Users/hudy/ws/volam-3005/documents/skill-120-thap-dai-phai.md) (`volam-3005`) và dữ liệu `Client_VLTK_SHXT` trong `packages/shared/src/skills/`.

## 1. Hạng mục nền tảng (dùng chung các phái)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Cooldown phía Client (`skill_mintimepercast_v` / `onhorse_v`) | **RESOLVED** *(chờ kiểm tra)* | Đã sửa [`apps/client/src/state/skillbar.ts`](../apps/client/src/state/skillbar.ts) & [`WorldScene.ts`](../apps/client/src/game/WorldScene.ts) đọc đủ `skill_mintimepercast_v` / `skill_mintimepercastonhorse_v` theo trạng thái cưỡi ngựa, đồng bộ vòng quay hồi chiêu & `offCooldown()` với Server. |

## 2. Danh sách Thập Đại Phái

| # | Môn phái | Tên chiêu thức (ID) | Hoàn thiện (%) | Trạng thái | Chi tiết đã xong & còn lại |
|---|---|---|---|---|---|
| 1 | **Thiếu Lâm** | Đại Thừa Như Lai Chú (`709`) | **100%** | **RESOLVED** *(chờ kiểm tra)* | Đã đồng bộ theo `volam-3005`: `autoreplyskill` Sư Tử Hống (`20`) 100% khi hết CD (`10s→4s` ở lv25), `returnskill_p` (`5%→80%`) phản bùa hại về người thi triển (chống vòng lặp phản kép), và `poisondamagereturn_p` (`5%→45%`) phản sát thương độc mỗi tick DoT. |
| 2 | **Thiên Vương** | Đảo Hư Thiên (`708`) | **100%** | **RESOLVED** *(chờ kiểm tra)* | Đã chạy đủ 4 chỉ số theo `volam-3005`: `allres_p` (`+1%→+10%`), `allresmax_p` (`+1%→+5%`), `lifereplenish_p` (`+1%→+35%` lv20 / `+50%` lv28 — tăng hiệu suất hồi máu từ thuốc, regen, trị thương), và `ignoreskill_p` (`1%→100%` lv28 — bỏ qua bùa hại từ đối phương). |
| 3 | **Đường Môn** | Mê Ảnh Tung (`710`) | **100%** | **RESOLVED** *(chờ kiểm tra)* | Đã chạy Blink + trừ MP + CD Server & Client; đồng bộ theo `volam-3005`: tầm dịch chuyển `120→520`, hồi chiêu đi bộ `15s→3s`, trên ngựa `15s→5s`. |
| 4 | **Ngũ Độc** | Hấp Tinh Yểm (`711` → `719`) | **100%** | **RESOLVED** *(chờ kiểm tra)* | Đã đồng bộ xác suất `autoattackskill` `1%→30%` (CD nội tại `10s`) theo `volam-3005`; triển khai cơ chế `poison2decmana_p` (`30%→85%` trong `3s→6s`) trừ thẳng nội lực theo `%` độc sát mỗi tick DoT trong `combat.ts`. |
| 5 | **Nga Mi** | Bế Nguyệt Phất Trần (`712` → `718`) | **100%** | **RESOLVED** *(chờ kiểm tra)* | Đã nâng bán kính vòng sáng lên `320` theo `volam-3005`; áp dụng luật tính cấp chuẩn `min(cấp 5 chiêu hỗ trợ, trần cấp 712)` (`lv1..19` kẹp `1..19`, `lv20` mở trần `40`; chưa học đủ 5 chiêu không kích hoạt aura con). |
| 6 | **Thúy Yên** | Ngự Tuyết Ẩn (`713`) | **95%** | **RESOLVED** *(chờ kiểm tra)* | Đã bổ sung override theo `volam-3005` (`hide` `5s→15s`, `fastwalkrun_p` `+1%→+30%`, CD `60s→35s` lv20 / `30s` lv30); vô hình hoàn toàn trong mắt quái, boss, đối thủ (mất target, không chọn được, ẩn sprite & chấm minimap/bigmap, bản thân & đồng đội thấy mờ `alpha = 0.45`); **không chịu sát thương** khi đang tàng hình; tự phá tàng hình khi tấn công/gây bùa hại; giữ cấm cưỡi ngựa `noHorse`. *(Chưa triển khai riêng `enhancehiteffect_rate`.)* |
| 7 | **Cái Bang** | Hỗn Thiên Khí Công (`714` → `720`) | **100%** | **RESOLVED** *(chờ kiểm tra)* | Đã đồng bộ theo `volam-3005`: `autoattackskill` xác suất `1%→10%` (CD `12s`); debuff `720` (`3s→9s`) đủ cả 6 dòng: `physicsres_p` (`-1%→-20%`), `fireres_p` (`-1%→-20%`), `physicsresmax_p` (`-1%→-10%`), `fireresmax_p` (`-1%→-15%`), `fastwalkrun_p` (`-9%→-50%`), và `rangedamagereturn_p` (`-4%→-30%`). |
| 8 | **Thiên Nhẫn** | Ma Âm Phệ Phách (`715` → `723`) | **95%** | **RESOLVED** *(chờ kiểm tra)* | Đã sửa CD `45s→15s` (lv20); triển khai đầy đủ hoảng loạn (`randmove`) cho **cả người chơi lẫn quái & boss** (cấm tấn công/điều khiển tay, tự chạy loạn đổi hướng mỗi `~333ms` trong vùng walkable); sửa `autodeathskill` kích hoạt **100% trúng** tối đa 6 mục tiêu khi Thiên Nhẫn tử vong (tầng `41..60`, `missRate = 0%`); triển khai `missle_missrate` cho cast chủ động (`35%→85%`); bỏ buff rỗng 30s trên bản thân. *(Chưa triển khai riêng `anti_block_rate_buff`.)* |
| 9 | **Võ Đang** | Xuất Ứ Bất Nhiễm (`716` → `738`) | **20%** | `OPEN` | Đã có cast, CD Server/Client, `missle_missrate`; chưa có giải trạng thái dị thường và miễn dịch `ignorenegativestate_p`. |
| 10 | **Côn Lôn** | Lưỡng Nghi Chân Khí (`717` → `721`, `722`) | **85%** | `OPEN` | Đã chạy `autorescueskill` + Khiên nội lực tĩnh + Gia tốc; lệch ngưỡng `HP < 30%` (vs `25%`), tính theo `maxMp` và chênh số liệu khiên/thời lượng. |
