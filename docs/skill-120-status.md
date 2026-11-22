# Bảng Thống Kê Trạng Thái Triển Khai Kỹ Năng Cấp 120 (Thập Đại Phái)

Nguồn đối chiếu: [`/Users/hudy/ws/volam-3005/documents/skill-120-thap-dai-phai.md`](file:///Users/hudy/ws/volam-3005/documents/skill-120-thap-dai-phai.md) (`volam-3005`) và dữ liệu `Client_VLTK_SHXT` trong `packages/shared/src/skills/`.

## 1. Hạng mục nền tảng (dùng chung các phái)

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Cooldown phía Client (`skill_mintimepercast_v` / `onhorse_v`) | **RESOLVED** *(chờ kiểm tra)* | Đã sửa [`apps/client/src/state/skillbar.ts`](../apps/client/src/state/skillbar.ts) & [`WorldScene.ts`](../apps/client/src/game/WorldScene.ts) đọc đủ `skill_mintimepercast_v` / `skill_mintimepercastonhorse_v` theo trạng thái cưỡi ngựa, đồng bộ vòng quay hồi chiêu & `offCooldown()` với Server. |

## 2. Danh sách Thập Đại Phái

| # | Môn phái | Tên chiêu thức (ID) | Hoàn thiện (%) | Trạng thái | Chi tiết đã xong & còn lại |
|---|---|---|---|---|---|
| 1 | **Thiếu Lâm** | Đại Thừa Như Lai Chú (`709`) | **35%** | `OPEN` | Đã nối `autoreplyskill` (Sư Tử Hống `20`) nhưng data SHXT đang tỉ lệ `1–3%` & CD lv20 nhảy ngược; chưa có `poisondamagereturn_p` và `returnskill_p`. |
| 2 | **Thiên Vương** | Đảo Hư Thiên (`708`) | **50%** | `OPEN` | Đã chạy `allres_p` + `allresmax_p`; chưa có `lifereplenish_p` và `ignoreskill_p`. |
| 3 | **Đường Môn** | Mê Ảnh Tung (`710`) | **85%** | `OPEN` | Đã chạy Blink + trừ MP + CD Server & Client; còn lệch số liệu tầm blink (`400` vs `520`) và CD (`5s/8s` vs `3s/5s`) so với `volam-3005`. |
| 4 | **Ngũ Độc** | Hấp Tinh Yểm (`711` → `719`) | **30%** | `OPEN` | Đã chạy `autoattackskill` gắn state/FX `719`; chưa có `poison2decmana_p` (độc sát trừ nội lực). |
| 5 | **Nga Mi** | Bế Nguyệt Phất Trần (`712` → `718`) | **75%** | `OPEN` | Đã gộp 5 vòng sáng (`86/89/92/282/332`); chưa giới hạn cấp theo `min` của 5 chiêu con và bán kính đang `180` (vs `320`). |
| 6 | **Thúy Yên** | Ngự Tuyết Ẩn (`713`) | **95%** | **RESOLVED** *(chờ kiểm tra)* | Đã bổ sung override theo `volam-3005` (`hide` `5s→15s`, `fastwalkrun_p` `+1%→+30%`, CD `60s→35s` lv20 / `30s` lv30); vô hình hoàn toàn trong mắt quái, boss, đối thủ (mất target, không chọn được, ẩn sprite & chấm minimap/bigmap, bản thân & đồng đội thấy mờ `alpha = 0.45`); **không chịu sát thương** khi đang tàng hình; tự phá tàng hình khi tấn công/gây bùa hại; giữ cấm cưỡi ngựa `noHorse`. *(Chưa triển khai riêng `enhancehiteffect_rate`.)* |
| 7 | **Cái Bang** | Hỗn Thiên Khí Công (`714` → `720`) | **75%** | `OPEN` | Đã chạy `autoattackskill` + giảm kháng, trần kháng & phản đòn tầm xa; thiếu `fastwalkrun_p` trong data SHXT và lệch tỉ lệ/chỉ số. |
| 8 | **Thiên Nhẫn** | Ma Âm Phệ Phách (`715` → `723`) | **95%** | **RESOLVED** *(chờ kiểm tra)* | Đã sửa CD `45s→15s` (lv20); triển khai đầy đủ hoảng loạn (`randmove`) cho **cả người chơi lẫn quái & boss** (cấm tấn công/điều khiển tay, tự chạy loạn đổi hướng mỗi `~333ms` trong vùng walkable); sửa `autodeathskill` kích hoạt **100% trúng** tối đa 6 mục tiêu khi Thiên Nhẫn tử vong (tầng `41..60`, `missRate = 0%`); triển khai `missle_missrate` cho cast chủ động (`35%→85%`); bỏ buff rỗng 30s trên bản thân. *(Chưa triển khai riêng `anti_block_rate_buff`.)* |
| 9 | **Võ Đang** | Xuất Ứ Bất Nhiễm (`716` → `738`) | **20%** | `OPEN` | Đã có cast, CD Server/Client, `missle_missrate`; chưa có giải trạng thái dị thường và miễn dịch `ignorenegativestate_p`. |
| 10 | **Côn Lôn** | Lưỡng Nghi Chân Khí (`717` → `721`, `722`) | **85%** | `OPEN` | Đã chạy `autorescueskill` + Khiên nội lực tĩnh + Gia tốc; lệch ngưỡng `HP < 30%` (vs `25%`), tính theo `maxMp` và chênh số liệu khiên/thời lượng. |
