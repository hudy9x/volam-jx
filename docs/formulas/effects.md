# Bùa lợi, bùa hại, hào quang, bị động, hiệu ứng khống chế

Nguồn chuẩn để tra cứu **băng sát/làm chậm, choáng, độc, co giật/thọ thương, phục hồi và giảm thời gian trạng thái**.
Áp dụng chung người chơi, bot, quái và boss; server quyết định gameplay, client vẽ từ trạng thái server. Các module TS thuần
và bộ vẽ dùng chung Web/Desktop/Mobile; hiện đã kiểm bộ vẽ trên Chromium, chưa kiểm ứng dụng native.

## 0. Tìm và sửa ở đâu

| Muốn chỉnh | File nguồn duy nhất |
|---|---|
| Hệ số choáng ×2, hệ số chậm, trần giảm thời gian, thông số độc và phục hồi | `packages/shared/src/formulas/effects/tuning.ts` (`EFFECTS`) |
| Công thức thời gian băng | `packages/shared/src/formulas/effects/cold.ts` |
| Xác suất/thời gian choáng | `packages/shared/src/formulas/effects/stun.ts` |
| Độc theo nhịp, giảm độc, gộp độc | `packages/shared/src/formulas/effects/poison.ts` |
| Xác suất/thời gian co giật theo phục hồi | `packages/shared/src/formulas/effects/hurt.ts` |
| Kiểu dữ liệu kết quả/trạng thái độc | `packages/shared/src/formulas/effects/types.ts` |
| Điểm gọi chung, thứ tự roll xác suất | `packages/shared/src/formulas/effects.ts` (`hitEffects`, xuất lại `mergePoison`) |
| Áp dụng, hết hạn, khóa hành động, ngắt chiêu, tick độc | `apps/server/src/world/systems/effects.ts` |
| Hủy đòn chính chưa tung, giữ đạn đã bay/hào quang | `packages/shared/src/skills/engine/SkillEngine.ts` (`interrupt`) |
| Cộng túi thuộc tính trang bị/bùa, phục hồi | `formulas/combat.ts`, `status/states.ts`; server `world/progress.ts` |
| Tốc độ thật theo hệ số chậm và mốc tốc độ | `packages/shared/src/formulas/speed.ts`, server `systems/movement.ts` |
| Màu băng/độc, hệ số nhịp vẽ, vị trí vòng sáng | `apps/client/src/game/fx/controlEffects.ts` (`CONTROL_VISUALS`, `controlAppearance`) |
| Giữ frame/hướng khi choáng, phát hoạt ảnh | `apps/client/src/game/actors/ActorView.ts` |
| Nhuộm các lớp thân, giữ bóng nguyên màu | `apps/client/src/game/actors/PaperDoll.ts` |
| Vòng sáng choáng, preload/đổi frame/hết hạn | `apps/client/src/game/fx/StateDecor.ts` |
| Sinh hình Status50 | `apps/client/tools/gen-skills.ts` → `CONTROL_FX.stun` trong `fx.gen.ts` |

`formulas/tuning.ts` xuất lại `EFFECTS` để giữ tương thích các nơi đang dùng; **không tạo bản cấu hình thứ hai** ở đó.
`formulas/effects.ts` giữ nguyên giao diện gọi cũ; các file con chỉ tính toán, không đọc đồng hồ hay sửa actor.
`CONTROL_VISUALS` chỉ điều khiển hình ảnh, không được dùng thay công thức tốc độ/thời gian server.

```text
Chiêu + cấp + trang bị/bùa + kết quả trúng
                    |
          formulas/effects.ts
           /     |     |     \
        stun   cold  poison  hurt   <-- effects/tuning.ts
                    |
       server systems/effects.ts
       | khóa/di chuyển/tick máu/ngắt chiêu
       +-- Actor.ctl + anim/actionMs --> ActorView + controlEffects + StateDecor
```

Khi sửa: đọc phần công thức và trạng thái triển khai bên dưới → sửa đúng module → chạy `npm run test:effects`,
`npm run test:speed`, `npm run typecheck`, `npm run build`. Đổi hình thì kiểm cả player, quái thường, Boss Xanh/Hoàng Kim,
hết trạng thái, chết/hồi sinh và trạng thái chồng nhau. Không sửa tay `*.gen.ts` hoặc `public/assets`.

Nghiên cứu nền: [effects-buffs.md](../research/effects-buffs.md). Một số ghi chú trong nghiên cứu là lịch sử;
trạng thái đã triển khai và quyết định hiện hành nằm ở tài liệu này. Không lấy công thức volamidle/jx-web-main thay chuẩn.

## 1. Bùa lợi / bùa hại / hào quang (HU1, HU2)

- Một bùa = **các thuộc tính của chiêu ở cấp người dùng**. Cú pháp gốc `physicsres_p={{{1,12},{20,50}},{{1,18*120},{20,18*180}}}`:
  P1 = giá trị, **P2 = thời gian (frame, 18/giây) của riêng thuộc tính đó**, −1 = vĩnh viễn (DATA). Mỗi thuộc tính hết hạn riêng.
- Tổng thuộc tính của mọi bùa đang có (`stateBag`) được **cộng vào túi thuộc tính** của nhân vật / quái cùng với trang bị và bị động →
  mọi chỉ số (kháng, Né, Chính xác, sinh lực, tốc độ, chí mạng, % sát thương…) đổi ngay, F3 cập nhật.
- Cùng chiêu gắn lại = thay (cấp mới, thời gian mới); chiêu khác nhau cộng đại số (INFERRED).
- Hào quang: chiêu style 2 `IsAura`, mỗi giây gắn trạng thái lên người dùng + đồng đội / kẻ địch trong tầm (`AURA_PULSE_MS`, `AURA_STATE_MS`).
- Bị động (style 3): thuộc tính ở cấp đã học, luôn có (`passiveBag`).
- `addphysicsdamage_p`: chỉ tính khi P3 khớp loại vũ khí đang cầm (damage.md §1).

Ví dụ (thử): Kim Chung Tráo cấp 20 → kháng vật lý +50, băng +45, hỏa −15, độc +49 trong 180 s (đúng `tianwang.lua`).

## 2. Hiệu ứng của đòn đánh (`hitEffects`)

| Hiệu ứng | Công thức | Nguồn |
|---|---|---|
| **Choáng** | xác suất `stun_p` P1 % (+ `do_stun_p` người đánh − `anti_do_stun_p` mục tiêu); thời gian **×2 (USER thử 2026-11-15, `EFFECTS.stunDurationMultiplier`)** × P2 frame × (1 + `anti_stuntimereduce_p`/100) × (1 − `stuntimereduce_p`/100, giảm tối đa 95); **không choáng chồng** khi đang choáng | DATA tham số · SRC luật · CHỌN trần 95 |
| **Chậm** | mọi phần **băng** > 0 làm chậm: thời gian = `colddamage_v` P2 frame (chiêu không có P2: **27 frame = 1,5 s**, CHỌN) × (1 + `coldenhance_p`/100) × (1 − `freezetimereduce_p`/100, giảm tối đa **77**); di chuyển cố định **60 đơn vị isometric/giây**, nhịp **4 FPS chuẩn8frame = 2giây/vòng** cho cả cưỡi ngựa; tốc đánh/ra chiêu vẫn nhân tổng%×0,5 trước chọn mốc | DATA (P2 chỉ có ở bẫy Đường Môn; trần 77 `FreezeTimeReduceMax`) · INFERRED (50 %) |
| **Độc** | mỗi nhịp `poisondamage_v` P1 (sau kháng độc) − `poisondamagereduce_v`; chu kỳ P3 frame; tổng P2 frame × (1 − `poisontimereduce_p`/100, tối đa 95). Trúng thêm: **gộp** — cộng sát thương mỗi nhịp (trần người chơi **600**, quái 123456), lấy thời gian dài hơn, chu kỳ ngắn hơn | DATA (trần `PlayerPoisonDamageMax`) · SRC (gộp, đơn giản hóa) |
| **Co giật** | xác suất `DoHurt` % của chiêu (`skill_dohurt` ghi đè); thời gian = khung bị thương (người 12, quái 10) × (100 − phục hồi %)/100; phục hồi ≥ 100 % → không co giật (710 quái `HitRecover 100`) | DATA · INFERRED (≥ 100) |

- Choáng / co giật khóa hành động (`castUntil`); chậm qua `moveScale` và thời gian ra chiêu; độc là sát thương theo nhịp (ghi cho người đầu độc).
- Client: chữ nổi "Chậm" / "Trúng độc", choáng dùng vòng sáng Status50 trên đầu (sự kiện `ctl`), `Actor.ctl` (1 choáng, 2 chậm, 4 độc).
- Biểu hiện (USER 2026-11-15): băng nhuộm vàng thân, độc nhuộm xanh lá (độc ưu tiên màu khi có cả hai), không nhuộm bóng. Choáng giữ đúng tư thế/frame/hướng đang vẽ, loại thời gian đứng im khỏi đồng hồ hoạt ảnh khi hết choáng; chết vẫn phát ngay và bỏ màu. Áp dụng chung người chơi/quái/boss.
- Băng giữ nhịp đứng chờ ×0,5. Vòng chạy dùng `coldMovement().cycleMs = 2000`, không nhân thêm `coldLoopRate`; sprite8/12/16frame vẫn cùng2giây/vòng, lần lượt4/6/8ảnh mỗi giây. Tốc đánh vẫn chụp thời lượng khi bắt đầu chiêu.
- Co giật ngắt động tác đang thi triển, xóa đường đi/lệnh chờ và hủy lần phát chiêu chính chưa tung; không xóa đạn đã bay, phần hiệu ứng đã phát hoặc hào quang. Không ghi đè choáng đang có. Giữ nguyên công thức xác suất/thời gian/phục hồi/giảm thời gian, không hoàn nội lực hoặc hồi chiêu.
- Kiểm tra hồi quy: `npm run test:effects`, `npm run test:speed`.
- **Không** dùng cách của jx-web-main (choáng 0,8 s cố định, chậm 75 %·D/(D+200), độc 40 % đòn) — người dùng xác nhận sai.

## 3. Băng di chuyển cố định — đã triển khai theo USER2026-11-16

Nguồn duy nhất: `EFFECTS.coldMovement` tại `formulas/effects/tuning.ts`; helper `formulas/effects/cold.ts coldMovement()` trả vận tốc60, FPSchuẩn4, chu kỳ2000ms, sải120. Áp cho nhân vật/quái/boss và cưỡi ngựa, không phụ thuộc tốc gốc, bonus, distanceScale hoặc hệ sốAI đi lang thang. Đối tượng vốn chậm hơn60 vẫn dùng60 khi được phép di chuyển; chết/choáng/khinh công hoặc đối tượng bất động không bị ép đi.

Server followPath giữ tọa độ lẻ nội bộ trong lúc băng, chỉ làm tròn tọa độ mạng để không cộng dồn sai số tốc theo hướng. Reset phần lẻ khi ra khỏi băng hoặc vị trí bị chuyển từ bên ngoài. Client dựa cờbăng server đồng bộ và helper shared để chạy chu kỳ2giây, giữ pha khi đổi tốc; không thay asset hoặc presetrender.

Giảm thời gian băng, trần77, tăng thời gian băng của người đánh giữ nguyên; băng mới gia hạn theo luật hiện có. Hết băng dùng tốc từ trang bị/bùa hiện tại, không phục hồi snapshot. Tốc đánh/cast giữ công thức cũ. Đề xuất75px/s trước đây không áp dụng.

Kiểm tra bổ sung `tests/fixed-cold-movement.test.ts` và renderer tests: cùng600isođơnvị/10giây qua288tổhợp và chu kỳ2giây; kiểm thời gian40/80%, gia hạn/hếtbăng, đổi bonus, khóađứng/chết/jump, đếnđích/teleport. Chưa kiểm native/touch hoặc hình chiến đấu quaWebSocket thật trong lượt này.

## 4. Còn thiếu

Ẩn thân (`hide`), hoảng loạn (`randmove`), miễn / phản bùa
(`ignoreskill_p`, `returnskill_p`), kháng tổ đội (`team_resist_effect.ini`).

- Status50 được generator thu riêng vào `CONTROL_FX.stun`, preload khi tạo bộ vẽ trạng thái. Vòng sáng chạy độc lập khi thân đóng băng và mất ngay khi hết choáng/chết; không giữ vòng sáng giả sau khi nhân vật đã hồi phục.

## 5. Giảm thời gian chịu hiệu ứng của Boss — USER2026-11-19

GoldenBossEntry.controlReduction (từng boss/nhóm trong tool): hurt0–100 mặc định60 ánh xạ MonsterDef.hitRecover; cold0–77/stun0–95/poison0–95 mặc định0 cộng lần lượt freezetimereduce_p/stuntimereduce_p/poisontimereduce_p vào bag trước passive/state. Công thức, trần và giảm độc mỗi nhịp giữ nguyên. Phục hồi chỉ giảm co giật/thọ thương, không hồiHP; poison ở đây chỉ giảm thời gian, không giảm tick. Mặc định/thiếu cấu hình không đổi gameplay; không sửa BossXanh/quái thường.
