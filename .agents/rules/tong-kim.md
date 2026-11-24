# Quy ước Chiến trường Tống Kim (`jx-system-online`)

Đọc kèm [docs/tong-kim-battlefield.md](../../docs/tong-kim-battlefield.md) khi làm việc với hệ thống Tống Kim. Các quyết định đã chốt đang hiệu lực:

## 1. Bản đồ, Báo danh & Chống kẹt
- **Map `323` (Điểm báo danh):** Mộ Binh Quan (Tống) chỉ báo danh phe Đại Tống; Mộ Binh Quan (Kim) chỉ báo danh phe Đại Kim (`WorldScene.ts`).
- **Map `378` (Xung phong):**
  - Hậu doanh mỗi phe chỉ giữ **Chủ dược điếm** và **Rương chứa đồ** (`towns.ts`; đã bỏ NPC Đặc thám / Trinh sát tiền tuyến và Cổng xuất trận).
  - Xuất trận qua cổng (`exitGate`) rải ngẫu nhiên bán kính `200–300px` quanh `gateExit` phe mình, ngoài vùng an toàn Hậu doanh.
  - Không lưu `Battlefield` (`378`) vào `trainingReturn`; nếu nhân vật kẹt ở `378` khi trận đã đóng, `resolveCharacterMap` đưa về `323` theo `tkCampLast` (hoặc Tương Dương `78`).
- **Kết thúc trận (`finishMatch`):** Dọn sạch NPC chiến trường (`clearBattleNpcs`), tắt PK và dừng di chuyển ngay lập tức; sau tối đa `10s` tự động đưa toàn bộ người chơi/bot về `323` và chuyển `phase = 'closed'`.

## 2. Combat, Ngũ hành & Bot
- **Sát thương PvP (`formulas/tuning.ts`, `damage.ts`):** `PVP.damageScale = 0.2` mặc định; `PVP.counterDamageScale = 0.4` khi hệ tấn công khắc hệ mục tiêu (VD: Kim đánh Mộc).
- **Bot Tống Kim (`TongKimBehavior.ts`):**
  - Chia 3 mũi gọng kìm (Trung lộ, Cánh Trái Tây Bắc, Cánh Phải Đông Nam) + dàn hàng ngang; tiến một chiều về Nguyên Soái địch, không quay đầu.
  - Bơm máu 3 lớp (`< 80%` 1 bình, `< 50%` 1s/bình lớn, `< 30%` bơm liên tục 2 bình), tự mua thuốc ở `323`/Hậu doanh, tự nhặt vật phẩm Tống Kim.
- **Bot Manager (`bots/index.ts`, `BotPanel.ts`, `BotClient.ts`):** Hỗ trợ dải cấp `150–200` (tự ép `gear: 'gold'` Hoàng Kim môn phái, `tiers: true`, và `attacks()` ưu tiên luôn dùng skill `150`).

## 3. Vật phẩm, Auto & Giao diện (HUD / Minimap)
- **Vật phẩm Tống Kim (`tongkim-items.ts`):** 25 vật phẩm (`maxStack: 50`, rơi khi hạ binh sĩ/tướng địch); 18 loại Hoàn dùng `items/obj-potion15`, 3 loại Càn Khôn Đan dùng `items/obj-potion13`, Chiến Cổ/Lệnh Bài/Hiệu Phù/Bí Bảo dùng sprite trích từ `VLTK-SHXT`.
- **Auto (`AutoPlay.ts`):** `autoPk` ưu tiên đánh người phe địch; tự nhặt vật phẩm Tống Kim (`def.tkItem`) kể cả khi lọc `autoLoot: 'magic'`.
- **UI & Audio (`tongkim.ts`, `status.ts`, `minimap.ts`, `bigmap.ts`, `Audio.ts`):**
  - Bảng Tống Kim gộp thông tin trận + Top 10 vào 1 dialog chuẩn game (`.dlg`, `.jade`, `.btn`, `.btn2`); thanh buff HUD (`status.ts`) ánh xạ `stateId 9101..9120` sang icon vật phẩm.
  - Minimap & Bigmap chiến trường chỉ dùng 2 nhóm màu: phe ta xanh (`#44e06b` đậm cho player/bot, `rgba(68,224,107,0.5)` cho NPC), phe địch đỏ (`#ff3b30` đậm cho player/bot, `rgba(255,59,48,0.5)` cho NPC).
  - Nhạc nền map `378` phát playlist xáo trộn 6 bài: `music401`, `music402`, `music403`, `music404`, `music400`, `music500`.

## 4. Chế độ 3 — Phá Trụ (`TK_SIEGE`) & Bẫy kỹ thuật
- **Sát thương trụ tách riêng 2 nhánh (`combat.ts`, `monster.ts`):**
  - **NPC Binh sĩ (`tkMinionType`):** chỉ chịu **đơn mục tiêu** theo `attacker.a.tkTarget` (chặn AoE 90/150 quét chết chùm cả đàn), mức cố định `2%–5%` maxHP/hit (`melee 4%`, `ranged 5%`, `siege 3%`, `super 2%`). Lính chỉ nhắm mục tiêu duy nhất là **Trụ mở**, bỏ qua lính & người chơi/bot địch.
  - **Người chơi / Bot:** chịu `50% → 75% → 100%` maxHP xuyên khiên nội lực, bắn đa mục tiêu + nổ lan `200 px` + Sóng Xung Chấn `40%` mỗi mốc 25% HP; suy giảm theo số trụ còn sống (`tkTowerDamageScale`: 6 trụ `100%`, 5 trụ `70%`, 4 trụ `45%`, `≤ 3` trụ cuối về sát thương chiêu thức bình thường).
- **Máu trụ, Buff phá trụ & Thắng thua (`tongkim.ts`):**
  - Trụ Đường `1.5M`, Trụ Bảo Vệ `2.25M` (nhân sĩ số); **Long Trụ (`nexus`) cố định `500.000` HP** với trần DPS `10%/s` có lính (`3%/s` backdoor). Phá 1 trụ địch tăng `+10%` sát thương toàn phe lên mọi mục tiêu (tối đa `+30%`).
  - Hồi sinh Mode 3 theo bậc số lần tử vong (`respawnStepsSec = [30, 60, 90]`, cấu hình được). Phá Long Trụ thắng ngay; hết giờ so **tổng `%` HP còn lại của 6 trụ** (bảng xếp hạng điểm tích lũy giữ nguyên).
- **Bẫy kỹ thuật cần tránh:**
  - **Bot thủ trụ (`TongKimBehavior.ts`):** trụ không hồi máu nên **không** chỉ check `hp < 85%` (sẽ hút bot đứng tụm vĩnh viễn ở 1 trụ trống); chỉ kéo tối đa 50% bot về thủ khi có địch `≤ 1000 px` quanh trụ hoặc trụ vừa tụt HP trong `5s` gần nhất. Khi áp đảo cục bộ (`900 px`), ~2/3 bot bỏ địch dồn công trụ.
  - **`BotClient.me()`** trả `Actor` phẳng (`me.hp`, không có `.state`/`.id`); `isTangmenTrapSkill` (gồm `#1110/#1113`) miễn nhiễm phản đòn/phản độc; `MoveKind.Parabola` chỉ nổ tại điểm rơi; sprite trụ compact SPR phải bật `SPR_ANCHOR_NPCS`.
