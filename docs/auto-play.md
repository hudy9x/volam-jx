# Tự động đánh (Auto)

Người dùng 2026-11-13 (vòng 29): làm theo cơ chế tự động của jx-web-main (đánh quái, tìm quái, nhặt đồ, chọn bản đồ). Mã:
`packages/shared/src/auto/AutoPlay.ts` (chạy ở client và làm bộ não bot `docs/bots.md`, chỉ gửi lệnh như tay người chơi; tùy chọn `AutoSettings` ở `auto/settings.ts`), tùy chọn `state/settings.ts`, cửa sổ
`ui/windows/auto.ts` (chuột phải nút AUTO), chọn bãi `packages/shared/src/maps/training.ts` + lệnh server `C2S.train`.

| Phần | jx-web-main (đọc từ mã) | Ở đây |
|---|---|---|
| Mục tiêu | gần nhất; giữ mục tiêu cũ trừ khi con mới gần hơn 0,5 × khoảng cách − 40; 5 s không tiến được 25 → cấm 8 s; tùy chọn "Boss Hoàng Kim" | chọn như vậy (`autoPriority` gần nhất / boss trước); kẹt: xem "Tiếp cận và chỗ kẹt" |
| Tiếp cận | — | xem mục dưới (vòng 31) |
| Chiêu | xoay chiêu F1–F4 (bỏ chiêu đang hồi / thiếu nội lực), gặp boss chỉ dùng chiêu chính | xoay các chiêu tấn công trên phím 1–9 + chuột trái mỗi 1,2 s (`autoRotate`); boss: chiêu chuột trái |
| Bùa lợi / bùa hại | bùa lợi hết thì dùng lại; bùa hại lên boss / tinh anh, thường chỉ khi ≥ 3 quái | như vậy (`autoBuff`, `autoCurse`, tầm 420) |
| Thuốc | Sinh lực / Nội lực dưới %; Nội lực < 2 × chi phí chiêu chính; tự mua khi hết (≤ 20 % ngân lượng) | như vậy; mua phải ở thành → hết thuốc Sinh lực thì về thành mua rồi quay lại (`autoBuyPotion`) |
| Tìm quái | không có lang thang; nhắm mọi quái trên bản đồ | `autoSeek`: quái gần nhất trên cả bản đồ |
| Nhặt đồ | gần nhất; đang đánh chỉ trong 220; lọc theo chất lượng; nhặt không được thì bỏ qua | như vậy (`autoLoot` tất cả / đồ xanh + tiền / chỉ tiền) |
| Đồ thừa | tự bán đồ không mặc được / kém hơn | `autoJunk`: bán đồ **trắng** không mặc được, mỗi 30 s |
| Chọn bãi | lên cấp → bãi cuối cùng có cấp thấp nhất ≤ cấp nhân vật | cùng luật, nhưng danh sách bãi lấy từ file quái của mình (bảng bãi của jx-web-main không khớp cấp quái ở đây) |
| Chết | hồi sinh tại chỗ sau 3 s | 3 s → hồi sinh (về thành) → mua thuốc → về bãi (`autoRevive`) |

Auto **không tắt khi đổi bản đồ**. Trong thành (khi bật "Tự đổi bãi"): mua thuốc, bán đồ thừa, rồi `C2S.train` (server chọn bãi
theo cấp, `bestTrainingMap`). Dữ liệu quái hiện cao nhất ~109 nên từ cấp ~101 đều đánh ở Mạc Cao Quật.
Chưa làm: tự mặc đồ tốt hơn, tự lên ngựa, sửa đồ.

## Tiếp cận và chỗ kẹt (vòng 31, USER 2026-11-13)

Người dùng: "đánh quái nhưng chưa gây sát thương", "đòn áp sát thì cho áp sát", cần cài đặt phạm vi tiếp cận, Auto chậm bắt đầu,
không tránh vật cản, tự khắc phục chỗ kẹt. Đo bằng bài thử không trình duyệt (World của server + AutoPlay, 11 phái × 3 chiêu, 30 s):
trước khi sửa 5 / 9 chiêu thử đứng yên cả 30 s không trúng phát nào; sau khi sửa 32 / 33 chiêu đánh chết quái, đứng yên lâu nhất 0,8 s
(chiêu còn lại chỉ thiếu Nội lực trong bài thử).

| Nguyên nhân | Sửa |
|---|---|
| Quái gần nhất cách > 1600 (bãi rộng, mới vào bản đồ): server bỏ lệnh khóa mục tiêu xa như vậy, Auto cứ gửi lại → **đứng yên** | quái xa hơn 1200: Auto **đi bộ tới** (`C2S.move`, server tìm đường A* vòng vật cản), tới gần mới khóa |
| 24 chiêu có đạn bay ngắn hơn `AttackRadius` (vd. Tam Giới Quy Thiền 432 / 512, Tứ Tượng Đồng Quy 192 / 416): đứng ở mép tầm thì đạn tắt trước khi tới | `castRange` (shared `skills/core/info.ts`) ≤ quãng đạn bay (`missileReach` = tốc độ × thời gian sống + bán kính va chạm) — đúng cho cả bấm tay và quái |
| Đứng ở mép tầm, quái di chuyển → đạn đi lệch | **khoảng cách tiếp cận** `CastMsg.reach`: chiêu tầm xa đứng ở `autoReachPct` % tầm (mặc định 60 %), chiêu cận chiến (Melee hoặc tầm ≤ 120) áp sát 40 (`autoMeleeClose`); server đi tới `reach` rồi mới ra chiêu, sau đòn đầu cho quái lệch thêm 40 mới đuổi (không giật) |
| Mục tiêu không tới được chỉ bị bỏ khi có con khác, sau 5 s | **chỗ kẹt**: chưa tới tầm mà không nhích được 12 trong 1,5 s, hoặc đã trong tầm mà Sinh lực quái không giảm trong 6 s → bỏ con đó 10 s; kẹt 2 lần trong 8 s → bước sang bên 240 rồi tìm tiếp |
| Bắt đầu chậm | nhịp Auto 250 → 150 ms, bùa lợi 1,2 → 0,8 s, các bước trong thành 1,5 → 0,4 s; Auto bật trước khi có nhân vật (vừa đổi bản đồ) thì lấy chỗ đứng ở nhịp đầu |

Cửa sổ Auto → "Tiếp cận quái": thanh trượt % tầm, ô "áp sát", và dòng cho biết chiêu chuột trái đang đứng cách quái bao nhiêu
(`approachDistance` trong `state/settings.ts`). Đạn trong engine không bị tường chặn (chỉ đường đi bị chặn), nên "tránh vật cản" là
phần đi bộ: luôn đi bằng tìm đường của server.

