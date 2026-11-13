# Tốc độ

Mã: `packages/shared/src/formulas/speed.ts` (`actionFrames`, `actionScale`, `moveFactor`), hằng số `formulas/tuning.ts` (`SPEED`).
Server: thời gian tư thế ra chiêu (`systems/combat.ts` `castNow` × `castScale`), tốc chạy (`systems/movement.ts` × `moveScale`).

| | Công thức | Nguồn |
|---|---|---|
| Khung gốc | đánh 18, xuất chiêu 18, bị thương 12; chạy 10, đi 5 | DATA `basevalue.ini` |
| Tốc đánh / xuất chiêu | số khung = ⌊18 × 100 / (100 + %)⌋, tối thiểu 6 (CHỌN); ngoại công dùng `attackspeed_v`, nội công `castspeed_v` | SRC · WEB |
| Mốc | +1 % → 17 khung, +21 % → 14, +51 % → 11, +101 % → 8, +158 % → 6 | (tính) |
| Tốc chạy | gốc × (100 + `fastwalkrun_p`)/100 (đồ, bùa; ngựa giữ hệ số riêng `HORSES`) × 0,5 khi bị chậm | DATA thuộc tính · INFERRED (chậm) |

Thời gian một tư thế = thời gian gốc của chiêu × (số khung / 18) ÷ (0,5 nếu chậm). Khinh công giữ thời gian bay riêng.

Chưa làm: Thiên Vương / Thiếu Lâm quyền tốc cố định (chỉ có nguồn WEB).
