# Bùa lợi, bùa hại, hào quang, bị động, hiệu ứng khống chế

Mã: `packages/shared/src/status/states.ts` (bùa), `formulas/combat.ts` (`passiveBag`, `addSkillAttr`), `formulas/effects.ts`
(`hitEffects`, `mergePoison`), hằng số `formulas/tuning.ts` (`EFFECTS`). Server: `apps/server/src/world/systems/status.ts`,
`systems/effects.ts`. Nghiên cứu: [docs/research/effects-buffs.md](../research/effects-buffs.md).

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
| **Choáng** | xác suất `stun_p` P1 % (+ `do_stun_p` người đánh − `anti_do_stun_p` mục tiêu); thời gian P2 frame × (1 + `anti_stuntimereduce_p`/100) × (1 − `stuntimereduce_p`/100, giảm tối đa 95); **không choáng chồng** khi đang choáng | DATA tham số · SRC luật · CHỌN trần 95 |
| **Chậm** | mọi phần **băng** > 0 làm chậm: thời gian = `colddamage_v` P2 frame (chiêu không có P2: **27 frame = 1,5 s**, CHỌN) × (1 + `coldenhance_p`/100) × (1 − `freezetimereduce_p`/100, giảm tối đa **77**); trong lúc chậm tốc chạy và tốc ra chiêu × **0,5** | DATA (P2 chỉ có ở bẫy Đường Môn; trần 77 `FreezeTimeReduceMax`) · INFERRED (50 %) |
| **Độc** | mỗi nhịp `poisondamage_v` P1 (sau kháng độc) − `poisondamagereduce_v`; chu kỳ P3 frame; tổng P2 frame × (1 − `poisontimereduce_p`/100, tối đa 95). Trúng thêm: **gộp** — cộng sát thương mỗi nhịp (trần người chơi **600**, quái 123456), lấy thời gian dài hơn, chu kỳ ngắn hơn | DATA (trần `PlayerPoisonDamageMax`) · SRC (gộp, đơn giản hóa) |
| **Co giật** | xác suất `DoHurt` % của chiêu (`skill_dohurt` ghi đè); thời gian = khung bị thương (người 12, quái 10) × (100 − phục hồi %)/100; phục hồi ≥ 100 % → không co giật (710 quái `HitRecover 100`) | DATA · INFERRED (≥ 100) |

- Choáng / co giật khóa hành động (`castUntil`); chậm qua `moveScale` và thời gian ra chiêu; độc là sát thương theo nhịp (ghi cho người đầu độc).
- Client: chữ nổi "Choáng" / "Chậm" / "Trúng độc" (sự kiện `ctl`), `Actor.ctl` (1 choáng, 2 chậm, 4 độc).
- **Không** dùng cách của jx-web-main (choáng 0,8 s cố định, chậm 75 %·D/(D+200), độc 40 % đòn) — người dùng xác nhận sai.

## Còn thiếu

Hình choáng gốc (Status50 `mag_spe_眩晕.spr`) trên người, ẩn thân (`hide`), hoảng loạn (`randmove`), miễn / phản bùa
(`ignoreskill_p`, `returnskill_p`), kháng tổ đội (`team_resist_effect.ini`).
