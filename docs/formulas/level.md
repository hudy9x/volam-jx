# Cấp, kinh nghiệm, điểm, môn phái

Mã: `formulas/level.ts`, `formulas/monster.ts`, `characters/progression.ts`; server `apps/server/src/world/progress.ts`; hằng số
`formulas/tuning.ts` (`LEVEL`).

## Nhân vật mới và môn phái

- Tạo nhân vật chọn **hệ + giới** (DATA: 10 file `newplayerini00–09` = hệ × giới, `isect=-1` = chưa có phái), bắt đầu **cấp 1**.
- **Cấp 10** mới gia nhập môn phái (USER; DATA câu NPC "cấp ≥ 10", cùng ngũ hành). Chỉ được chọn phái **cùng hệ** và nhận giới đó
  (Thiếu Lâm chỉ nam, Nga My / Thúy Yên chỉ nữ). Chọn trong cửa sổ Kỹ năng; bản gốc phải gặp NPC nhập môn và làm nhiệm vụ (bỏ qua).
- Nhân vật lưu trước 2026-11-12 (không có `progressVersion`) **về cấp 1, chưa có phái**, giữ hệ (= hệ của phái cũ), đồ, tiền (USER).

## Lên cấp

| Luật | Giá trị | Nguồn |
|---|---|---|
| Exp từng cấp | `level_exp.txt` (cấp 1: 100, 2: 500, 3: 1100…; 200 cấp) | DATA |
| Mỗi cấp | +5 điểm tiềm năng, +1 điểm kỹ năng, hồi đầy Sinh lực / Nội lực | DATA `stringresource.txt` 10027 · SRC |
| Exp quái (script `standard.lua`) | b + 5 × (L − (đầu đoạn − 1)) theo đoạn 10 cấp (40 / 120 / 240 …), × 1,5 từ cấp 30; boss × 12 (CHỌN) | DATA |
| Chia exp | người giết quái: 100 %; đồng đội của người giết đứng trong 768: `teamExpPct` = 80 % (kể cả không đánh); người khác có đánh: exp quái × sát thương mình gây ÷ Sinh lực tối đa, trong 768 | **USER** 2026-11-13 (tổ đội); phần theo sát thương: SRC `KNpcDeathCalcExp` |
| Chênh lệch cấp | ≤ 5: đủ; ≤ 15: × (295 − 19 × chênh) / 200; > 15: 1 exp; quái ≥ 100 và người ≥ quái: − chênh/200 | SRC `AddSelfExp` |

Ví dụ: quái cấp 5 (exp 65) giết một mình, người cấp 1 (chênh 4) → 65 exp. Quái cấp 30: 435 exp.

## Chưa làm

Tổ đội (GP14: k = 100 + 15 × số người, chia theo cấp), exp thống soái, mất exp khi chết (GP8), quái theo cấp đầy đủ (GP10).

## Gợi ý cộng điểm (vòng 28, USER: tham khảo jx-web-main)

Mã: `packages/shared/src/characters/suggest.ts` (client xem trước, server `applySuggestion` chạy lại cùng kế hoạch). Nút **Gợi ý** ở cửa sổ
Trang bị và Thuộc tính (tiềm năng) và cửa sổ Kỹ năng.

- **Tuyến võ công** mỗi phái (chiêu nền + chiêu chung) chép từ jx-web-main `skill-routes-01.js` (mã chiêu gốc); Hoa Sơn không có trong
  jx-web-main → một tuyến "Tất cả kỹ năng" (CHỌN). Mặc định chọn tuyến đã cộng nhiều điểm nhất.
- **Kỹ năng:** mỗi điểm vào chiêu thấp nhất của tuyến còn cộng được (`raiseError`: đã học, chiêu cộng điểm, giới hạn theo cấp, kỹ năng nền);
  giữ điểm đã cộng; chiêu luyện 90 / 150 không dùng điểm.
- **Tiềm năng:** trước hết đủ Sức mạnh / Thân pháp cho đồ đang mặc và đồ trong hành trang mặc được (chỉ thiếu sức / thân), phần còn lại
  chia theo tỷ lệ: ngoại công 65/5/30/0, nội công 0/5/90/5 (Sức mạnh / Thân pháp / Sinh khí / Nội công), một số tuyến có tỷ lệ riêng
  (jx-web-main `config/potential-allocation.json`). Ngoại / nội công: tuyến có chiêu ngoại công (`isExternal`) hay không.
- **Tẩy tủy** (lệnh bài): trả lại toàn bộ điểm tiềm năng, hoặc đưa mọi chiêu cộng điểm về cấp khởi đầu và trả lại điểm kỹ năng
  (`washPoints`; chiêu luyện / bí kíp giữ nguyên cấp).
