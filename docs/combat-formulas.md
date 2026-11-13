# Công thức chỉ số & chiến đấu JX1 (tài liệu tham khảo cho jx-system-online)

Tổng hợp ngày 12/11/2026 từ ba nguồn, ghi rõ nguồn và độ tin cậy cho từng công thức. Dùng làm căn cứ khi làm
cấp / điểm tiềm năng / chỉ số / sát thương / rơi đồ. **Chỉ lấy cơ chế, không chép mã.**

| Ký hiệu | Nguồn |
|---|---|
| ✅ DATA | Dữ liệu client gốc `../jx-origin` (bảng, script, chữ trong game) |
| 🔧 SRC | Mã nguồn engine JX1 `jx1-vs2022-main/SwordOnline/Sources/Core/Src` (đã xóa 2026-11-12) (bản fan sửa từ mã Kingsoft bị lộ; chú thích tiếng Trung bị lỗi mã hóa) |
| 🌐 WEB | Bài viết thời JX1 (2003–2009): diễn đàn / trang chính thức Kingsoft, 52pk, 17173, Sina |
| ⚠️ | Có điểm nghi vấn, cần kiểm chứng (ví dụ đo trên server gốc) |

Đơn vị: game gốc chạy **18 khung/giây** (1 khung ≈ 55,6 ms; server jx-system-online chạy 20 tick/giây nên đổi theo ms).
Khoảng cách, tốc độ chạy theo đơn vị bản đồ gốc. Phần trăm là số nguyên, phép chia là chia nguyên (làm tròn xuống).

Tài liệu cũ trong `jx-origin/document/*.md` có nhiều công thức **không có nguồn**; chỗ nào khác tài liệu này thì
theo tài liệu này.

---

## 1. Nhân vật: cấp, điểm, chỉ số gốc

### 1.1 Mỗi lần lên cấp
- **+5 điểm tiềm năng, +1 điểm kỹ năng.** ✅ DATA (`settings/stringresource.txt` 10027, `ui/ui/杂烩.ini [LevelUpTips]`)
  · 🔧 SRC (`PLAYER_LEVEL_ADD_ATTRIBUTE = 5`, `PLAYER_LEVEL_ADD_SKILL = 1`, `KPlayer::LevelUp`).
- Lên cấp hồi đầy sinh lực / nội lực / thể lực; kháng gốc tính lại theo hệ và cấp. 🔧 SRC
- Exp cần cho mỗi cấp: `settings/npc/player/level_exp.txt` (cấp 1: 100, cấp 2: 500, cấp 3: 1100…). ✅ DATA
- Điểm tiềm năng thêm từ vật phẩm: Tẩy Tủy Kinh (+1…5, từ cấp 80, tối đa 15 lần), Cống Nguyệt Phù Dung (+5);
  điểm kỹ năng thêm: Võ Lâm Mật Tịch (+1, từ cấp 80), Phụng Nguyệt Quả Dung (+1). ✅ DATA (`script/item/*.lua`, `magicscript.txt`)

### 1.2 Chỉ số khởi đầu theo hệ — ✅ DATA `settings/npc/player/newplayerini00–09.ini` (mỗi hệ một cặp nam/nữ)

| Hệ | Sức mạnh | Thân pháp | Sinh khí | Nội công | May mắn | Sinh lực | Nội lực |
|---|---|---|---|---|---|---|---|
| Kim (Thiếu Lâm, Thiên Vương) | 35 | 25 | 25 | 15 | 0 | 204 | 16 |
| Mộc (Đường Môn, Ngũ Độc) | 20 | 35 | 20 | 25 | 0 | 103 | 77 |
| Thủy (Nga My, Thúy Yên) | 25 | 25 | 25 | 25 | 0 | 153 | 77 |
| Hỏa (Cái Bang, Thiên Nhẫn) | 30 | 20 | 30 | 20 | 0 | 213 | 41 |
| Thổ (Võ Đang, Côn Lôn) | 20 | 15 | 25 | 40 | 0 | 76 | 163 |

(`newplayerini04.ini` ghi 100 / 200, lệch với công thức dưới; 9/10 file còn lại khớp.)

### 1.3 Sinh lực, nội lực, thể lực, kháng gốc — ✅ DATA `settings/npc/player/level_add.txt`

```
Sinh lực tối đa = Sinh khí × LifePerVitality + Cấp × LifePerLevel   (+ đồ, chiêu)
Nội lực tối đa  = Nội công × ManaPerEnergy  + Cấp × ManaPerLevel    (+ đồ, chiêu)
```
Kiểm chứng: Kim cấp 1 = 25 × 8 + 1 × 4 = 204 (khớp `imaxlife=204`). Đúng với 9/10 mẫu nhân vật mới.

| Hệ | LifePerLevel | LifePerVitality | ManaPerLevel | ManaPerEnergy | Kháng gốc: hỏa / băng / độc / lôi / vật lý |
|---|---|---|---|---|---|
| Kim | 4 | 8 | 1 | 1 | −25 / 0 / 25 / 0 / 0 |
| Mộc | 3 | 5 | 2 | 3 | 0 / 0 / 0 / 25 / −15 |
| Thủy | 3 | 6 | 2 | 3 | 25 / 0 / 0 / −25 / 0 |
| Hỏa | 3 | 7 | 1 | 2 | 0 / −25 / 0 / 0 / 15 |
| Thổ | 1 | 3 | 3 | 4 | 0 / 25 / −25 / 0 / 0 |

Thể lực: gốc 180, +9 mỗi cấp (nam), +8 (nữ). Tổ đội có người hệ X thì đồng đội được thêm kháng
(`team_resist_effect.ini`). ✅ DATA

### 1.4 Hằng số gốc — 🔧 SRC (`KPlayer.cpp`, `GameDataDef.h`)

| Hằng số | Giá trị |
|---|---|
| Tốc độ đi / chạy | 5 / 10 (khớp `basevalue.ini`) |
| Khung đánh / xuất chiêu gốc | 18 / 18 (`basevalue.ini`) |
| Tốc đánh / tốc xuất chiêu gốc | 0% / 0% |
| Phục hồi (giảm co giật) gốc người chơi | 6% (NPC mặc định 12; quái theo cột `HitRecover` của `npcs.txt`) |
| Giới hạn kháng gốc mỗi loại | 75% (đồ có `…resmax_p` nâng thêm) |
| Kháng tối đa tuyệt đối | 95% |
| Cấp tối đa | 200 |

---

## 2. Chỉ số dẫn xuất

| Chỉ số | Công thức | Nguồn |
|---|---|---|
| **Chính xác** (AR) | `Thân pháp × 4 − 28` (Thân pháp gốc, chưa tính đồ), rồi cộng điểm / % từ đồ, chiêu | 🔧 SRC `SetBaseAttackRating` · 🌐 khớp |
| **Né tránh** | `Thân pháp ÷ 4` + đồ, chiêu | 🔧 SRC `SetBaseDefence` · 🌐 khớp |
| **Sát thương vật lý gốc** | vũ khí cận chiến: `sát thương vũ khí + Sức mạnh ÷ S`; ám khí: `+ Thân pháp ÷ D`; tay không: chỉ vũ khí | 🔧 SRC `SetNpcPhysicsDamage` |
| Hằng số S | **5** (5 Sức mạnh = 1 điểm tấn công) | 🌐 trang chính thức + 52pk 2004 · ⚠️ thiếu trong mã |
| Hằng số D (ám khí) | chưa biết | ⚠️ |
| **Nội công gốc** | `Nội công ÷ E` (chỉ khi E ≠ 0) | 🔧 SRC `SetFirstMagic` · ⚠️ E chưa biết, có thể 0 (không cộng) |

### 2.1 Lực tay hiển thị ở F3 — 🔧 SRC `KPlayer::GetEchoDamage`
Tính riêng cho chiêu tay trái và tay phải; chỉ với chiêu đạn, cận chiến, trạng thái.

```
Gốc     = sát thương vật lý gốc (mục 2) + "sát thương vật lý điểm" từ đồ
Cộng%   = % chiêu được tăng bởi chiêu khác (bị động) + % tăng kỹ năng từ đồ
          (+ % "nội lực đầy thì tăng sát thương" nếu nội lực đang đầy)

Lực tay = 0
  + magicdamage_v của chiêu × (100 + Cộng%) / 100
  + nếu chiêu có physicsenhance_p (P% STVL):
        Gốc × (100 + P × (100 + Cộng%)/100) / 100
      + Gốc × % cường hóa theo loại vũ khí (cận chiến theo từng loại / ám khí / tay không, từ chiêu bị động)
  + nếu chiêu có physicsdamage_v: giá trị × (100 + Cộng%)/100 (chiêu nội công cộng thêm "nội công gốc" + đồ)
  + băng / hỏa / lôi của chiêu × (100 + Cộng%)/100
      · chiêu nội công cộng thêm nội công gốc + băng/hỏa/lôi nội công từ đồ
      · chiêu ngoại công cộng thêm băng/hỏa/lôi ngoại công từ đồ
  + độc: (độc mỗi nhịp × (100 + Cộng%)/100) × số khung / chu kỳ (quy về tổng)
```
Các giá trị đều là khoảng nhỏ nhất – lớn nhất. 🌐 Bài 52pk 2004 mô tả cùng cấu trúc
`(Sức mạnh/5 + vũ khí + điểm vật lý vũ khí) × (100% + tổng %) + nguyên tố`.

---

## 3. Trúng / né — 🔧 SRC `KNpc::CheckHitTarget`

```
Né hiệu dụng = Né × (100 − %bỏ qua né) / 100
Tỉ lệ trúng  = AR × 100 / (AR + Né hiệu dụng)     (AR + Né = 0 → 50%; Né < 0 → 95%; AR < 0 → trượt)
nếu > 99 → 95 ;  nếu < 40 → 40
```
- Chỉ áp cho chiêu **có kiểm tra trúng** (cột `IsUseAR` của `skills.txt`); chiêu nội công và chiêu ám khí loại
  `IsUseAR=0` luôn trúng. ✅ DATA · 🌐 diễn đàn chính thức: "命中率 = 己方命中 / (己方命中 + 对方闪避)".
- ⚠️ Mức sàn 40% có thể do bản fan sửa: mã vẫn khai báo `MIN_HIT_PERCENT = 5` nhưng không dùng; một bài 🌐 cũ ghi 5–95%.

---

## 4. Sát thương nhận vào — 🔧 SRC `KNpc::ReceiveDamage`, `KNpc::CalcDamage`

Một đòn mang nhiều phần: vật lý, băng, hỏa, lôi, độc, nội công (magic). Thứ tự xử lý:

1. Kiểm tra trúng (mục 3) nếu chiêu dùng AR. Trượt thì dừng.
2. Quay **chí mạng** (`deadlystrike_p`) và **chí tử** (`fatallystrike_p` − kháng chí tử của mục tiêu).
3. Mỗi phần sát thương tính riêng:
   - Lấy ngẫu nhiên trong khoảng nhỏ nhất – lớn nhất.
   - **Chí mạng: phần vật lý × 2** (`MAX_DEATLY_STRIKE_ENHANCEP = 200`). ✅ 🌐 khớp ("会心 = 双倍普攻伤害").
   - **Chí tử: các phần băng / hỏa / lôi / độc = sinh lực hiện tại của mục tiêu × ngẫu nhiên 30–50%**
     (`MIN/MAX_FATALLY_STRIKE_ENHANCEP`). Không áp cho phần vật lý.
   - ⚠️ Trong bản mã này, khối nhân chí mạng / chí tử nằm dưới điều kiện `bReturn` (sát thương phản đòn), trông như bị
     đảo khi sửa; cơ chế (×2 và 30–50% sinh lực) là chắc, điều kiện thì cần kiểm chứng.
   - Mục tiêu là quái "đặc biệt" (quái vàng): sát thương nhận × tỉ lệ cấu hình của server.
   - Kháng của loại đó, ép không vượt giới hạn kháng riêng (gốc 75%).
   - Trừ **giáp phẳng** của loại đó (`…armor`, từ chiêu).
   - Người đánh người: × tỉ lệ sát thương PK (cấu hình server).
   - **Ngũ hành** (hệ của chiêu so với hệ mục tiêu):
     - chiêu **khắc** mục tiêu (Kim→Mộc, Thủy→Hỏa, Mộc→Thổ, Hỏa→Kim, Thổ→Thủy): kháng −= %khắc chế của chiêu;
       sát thương −= (ngũ hành cường hóa của người đánh − ngũ hành nhược hóa của mục tiêu) ⚠️ dấu trông ngược;
     - chiêu **bị khắc**: kháng += %khắc chế; sát thương −= (nhược hóa mục tiêu − cường hóa người đánh).
   - Kháng ép tối đa **95%**.
   - Khiên nội lực: X% sát thương trừ vào nội lực (hết nội lực thì phần thiếu quay lại sinh lực); khiên phẳng trừ thẳng.
   - **Sát thương cuối = sát thương × (100 − kháng) / 100.** ≤ 0 thì bỏ.
4. Hiệu ứng kèm theo (mục 5). Hút sinh lực / nội lực / thể lực theo % phần vật lý.

Giới hạn 75% và "phần kháng vượt 75% dùng để bù khi bị giảm kháng" 🌐 trang chính thức bản Kinh điển.

---

## 5. Hiệu ứng khống chế — 🔧 SRC `ReceiveDamage`, `HurtSelf`

| Hiệu ứng | Cơ chế |
|---|---|
| **Làm chậm (băng)** | Khi phần băng gây sát thương và chưa bị chậm: thời gian = thời gian của chiêu × (100 − %giảm thời gian chậm) / 100 (giảm ≥ 100 thì coi như 95) |
| **Độc** | Như trên với %giảm thời gian độc. Trúng thêm độc khi đang độc thì **gộp**: sát thương mỗi nhịp = ((c1+c2)·d1/c1 + (c1+c2)·d2/c2)/2, thời gian tính bình quân có trọng số, chu kỳ = (c1+c2)/2 |
| **Choáng** | Chỉ khi chưa bị choáng: xác suất `stun_p` P1%, thời gian P2 khung × (100 − %giảm thời gian choáng) / 100 |
| **Co giật** (thọ thương) | Số khung = khung bị thương × (100 − %phục hồi) / 100; phục hồi ≥ 100% thì không co giật. Xác suất co giật theo cột `DoHurt` của chiêu ✅ DATA |

✅ DATA: `FreezeTimeReduceMax=77` trong cài đặt client (lệch với 95 trong mã, có thể là cấu hình riêng của bản mod).
Chi tiết dữ liệu hiệu ứng: `jx-origin/document/combat_damage_and_status_effects_research.md`.

---

## 6. Tốc độ

### 6.1 Tốc đánh / tốc xuất chiêu — 🔧 SRC (`KNpc.cpp`) · 🌐 khớp
```
Số khung mỗi đòn = 18 × 100 / (100 + %tốc đánh)     (chiêu ngoại công: tốc đánh; chiêu nội công: tốc xuất chiêu)
```
Bản client trong mã còn làm tròn xuống số chẵn cho hoạt ảnh. Mốc giảm một khung (đã kiểm tra lại bằng công thức):

| % tốc độ từ | 0 | 1 | 6 | 13 | 21 | 29 | 39 | 51 | 64 | 81 | 101 | 126 | 158 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Khung | 18 | 17 | 16 | 15 | 14 | 13 | 12 | 11 | 10 | 9 | 8 | 7 | 6 |

🌐 Thiên Vương và Thiếu Lâm quyền có tốc độ cố định (đồ tăng tốc không tác dụng) — chưa thấy trong mã, ⚠️.

### 6.2 Tốc chạy
Gốc chạy 10, đi 5 (đơn vị bản đồ gốc mỗi khung); đồ / chiêu `fastwalkrun_p` cộng %. Ngựa: `horse.txt` thuộc tính 111.

---

## 7. Kinh nghiệm

### 7.1 Chia exp khi quái chết — 🔧 SRC `KNpcDeathCalcExp::CalcExp`
- Mỗi người (hoặc mỗi tổ đội) nhận **exp quái × sát thương mình gây ra ÷ sinh lực tối đa của quái**.
- Chỉ tính người đứng trong bán kính 768 đơn vị. Lưu sát thương trong một khoảng thời gian rồi xóa.
- **Đồ rơi thuộc về người / tổ gây nhiều sát thương nhất** (script rơi đồ chạy dưới tên người đó).

### 7.2 Chênh lệch cấp — 🔧 SRC `KPlayer::AddSelfExp`
```
lệch = |cấp người chơi − cấp quái|
nếu người chơi ≥ quái và quái ≥ 100:  exp = exp − exp × lệch / 200
ngược lại:
    lệch ≤ 5    → đủ exp
    lệch ≤ 15   → exp × (295 − 19 × lệch) / 200
    lệch > 15   → 1
tối thiểu 1; rồi × tỉ lệ exp server × % tăng exp (đồ, vật phẩm)
```
Ví dụ: lệch 6 → 90,5%; lệch 10 → 52,5%; lệch 15 → 5%.

### 7.3 Tổ đội — 🔧 SRC `KPlayer::AddExp`
- Đếm thành viên đứng gần (768). Một người thì như đánh một mình.
- `k = 100 + 15 × số người`; mỗi người nhận `exp × k × cấp mình / tổng cấp / 100` (rồi qua 7.2).
- Đội trưởng nhận thêm exp thống soái theo `LeadExpShare` của hệ (`level_add.txt`).

### 7.4 Thục luyện chiêu
Chiêu cấp 90 (trừ Loạn Hoàn Kích) lên cấp bằng thục luyện: mỗi đòn trúng địch +1 × tỉ lệ cấu hình; exp cần cho mỗi cấp
trong `settings/npc/player/magic_level_exp.txt`. ✅ DATA · 🔧 SRC

---

## 8. Quái theo cấp — ✅ DATA `script/npclevelscript/*.lua` + cột `…Param` của `npcs.txt`

`npcs.txt` không có cấp; cấp do nơi sinh quái quyết định. Script cấp của quái (cột `LevelScript`, 51 script) tính
exp, sinh lực, chính xác, né, sát thương, kháng theo cấp. Script phổ biến nhất `standard.lua` (đường gấp khúc theo
từng 10 cấp, `y = b + k × (L − mốc)`):

| L | Exp | Sinh lực | Chính xác | Né | Sát thương min = max |
|---|---|---|---|---|---|
| 1–10 | 40 + 5L | 50 + 3L | 10 + 3L | 10 | 3 + 0,3L |
| 11–20 | 120 + 5(L−10) | 122 + 8(L−10) | 50 + 4(L−10) | 50 + 3(L−10) | 8 + 0,3(L−10) |
| 21–30 | 240 + 5(L−20) | 270 + 30(L−20) | 100 + 5(L−20) | 100 + 5(L−20) | 13 + 0,4(L−20) |
| 31–40 | 360 + 5(L−30) | 900 + 35(L−30) | 250 + 5(L−30) | 150 + 5(L−30) | 20 + 0,5(L−30) |
| 41–50 | 480 + 5(L−40) | 1450 + 60(L−40) | 400 + 5(L−40) | 200 + 5(L−40) | 29 + 0,5(L−40) |
| 51–60 | 600 + 5(L−50) | 2100 + 48(L−50) | 500 + 5(L−50) | 300 + 5(L−50) | 39 + 0,6(L−50) |
| 61–70 | 720 + 5(L−60) | 2950 + 54(L−60) | 600 + 5(L−60) | 400 + 5(L−60) | 50 + 0,7(L−60) |
| 71–80 | 800 + 5(L−70) | 3500 + 58(L−70) | 700 + 5(L−70) | 500 + 5(L−70) | 65 + 0,8(L−70) |
| 81–90 | 900 + 5(L−80) | 5050 + 11(L−80) | 800 + 5(L−80) | 600 + 5(L−80) | 85 + 0,9(L−80) |
| 91–100 | 1000 + 5(L−90) | 6450 + 11(L−90) | 900 + 5(L−90) | 800 + 10(L−90) | 112 + (L−90) |
| > 100 | theo tham số của quái trong `npcs.txt` (`Param2 × L + Param1`) | | | | |

Hệ số nhân thêm theo script: `standard.lua` từ cấp 30: exp × 1,5, sinh lực × 5, chính xác × 1,2, né × 1,1;
`animal.lua` từ cấp 50: exp × 1,5, sinh lực × 4, chính xác × 1,2, né × 1,1. Kháng của quái cũng theo cấp và hệ
(`animal.lua`: một hệ 10 / 30 / 70 / 95 ở cấp 1 / 20 / 60 / 100, các hệ khác 5 / 15 / 35 / 45, một hệ âm 0 / −10 / −15 / −30).
Script còn đặt AI: tỉ lệ dùng từng chiêu, ngưỡng máu để dùng chiêu hồi. Giới hạn kháng của quái: cột `…ResistMax` của
`npcs.txt`.

🔧 SRC: nhân vật / quái từ **cấp 120** trở lên, khi bị đánh thì kích hoạt chiêu phản đòn, khi còn dưới 25% sinh lực
thì kích hoạt chiêu cứu mạng; khi đánh thì kích hoạt chiêu tấn công kèm (đây là các chiêu 120 tự phát).

---

## 9. May mắn và rơi đồ

### 9.1 May mắn
- **Không đổi tỉ lệ rơi, chỉ đổi thuộc tính của đồ rơi** (loại dòng và giá trị). 🌐 trang chính thức + người thiết kế
  trả lời năm 2003 · 🔧 SRC khớp. Mọi hệ khởi đầu 0 (✅ DATA `iluck=0`). Đơn vị trên đồ: `lucky_v` "+%".
- Đồ xanh (`KItemGenerator::Gen_MagicAttrib`), với mỗi dòng:
  `ngưỡng = ngẫu nhiên(0…99) / (1 + May mắn × 20 / 100)`; dòng thuộc tính nào có tỉ lệ xuất hiện (cột theo loại đồ
  trong `magicattrib.txt`) lớn hơn ngưỡng thì vào danh sách, chọn ngẫu nhiên một dòng, không trùng loại.
  May mắn càng cao, ngưỡng càng thấp, dòng hiếm càng dễ ra. Đồ hoàng kim / bạch kim dùng khoảng may mắn min–max riêng. 🔧 SRC
- Nguồn may mắn: đồ (`lucky_v`), vật phẩm sự kiện (Bánh chưng May mắn: +30 trong 30 phút), hào quang "Ngôi sao may mắn". ✅ DATA

### 9.2 Rơi đồ
- ✅ DATA: mỗi quái trỏ tới một bảng rơi (cột `DropRateFile` của `npcs.txt`); 208 bảng `settings/droprate/**.ini`:
  `RandRange` (mẫu số), mỗi món `RandRate` (tỉ lệ = RandRate / RandRange), `MoneyRate` / `MoneyScale` (tiền),
  `MagicRate` (đồ có dòng thuộc tính), `MinItemLevel…MaxItemLevelScale` (khoảng cấp đồ).
- 🔧 SRC bản mã này **không có** đoạn đọc các bảng `.ini` đó: rơi đồ do script Lua `DropRate(NpcIndex)` của từng quái
  quyết định (chạy cho người gây sát thương nhiều nhất). Script mẫu của server Ngạo Tuyết là của server tư nhân.
  ⚠️ Vì vậy ý nghĩa chính xác của `MagicRate`, `MoneyScale`, các `…Scale` còn phải tự diễn giải.
- 🌐 Quái thường có xác suất hóa **quái vàng**: nhận 1 trong 10 đặc tính (năng lực, exp, số đồ rơi 2–6).
  Đồ xanh năm 2003 có 2 dòng (tiền tố + hậu tố).
- Tiền: chết vì quái mất một nửa tiền mang theo, chết vì người khác rơi một ít. ✅ DATA (trang Trợ giúp)

---

## 10. Điều khiển và auto

- **Click chuột trái vào quái = khóa mục tiêu**: nhân vật tự đuổi và đánh liên tục bằng chiêu tay trái tới khi mục tiêu
  chết. **Chuột phải hoặc Shift + click = ra chiêu một lần** (chiêu phụ trợ thì nhắm đồng minh). 🔧 SRC `KPlayer::ProcessMouse`
- Phím Q, W, E, A, S, D, Z, X, C gán chiêu cho chuột trái / phải. ✅ DATA (trang Trợ giúp)
- **Auto có sẵn trong engine** (🔧 SRC `KPlayerAI.cpp`), bản gốc phải dùng vật phẩm **Bạch Câu Hoàn** mới bật được (✅ DATA):
  - đánh quái trong bán kính quanh điểm đứng, bỏ qua mục tiêu đánh mãi không chết, chọn đánh / bỏ qua boss,
    ưu tiên chiêu chuột, tự bật hào quang và chiêu bùa;
  - bơm máu / nội lực theo ngưỡng, giải độc;
  - nhặt tiền / đồ, lọc theo dòng thuộc tính, bỏ đồ rác;
  - về thành khi hết thuốc, đầy hành trang, đồ hỏng, nhiều tiền, rồi quay lại bãi; sửa đồ;
  - đi theo người, tự nhận / mời tổ đội;
  - chế độ **ủy thác**: treo máy khi offline.

---

## 11. Phúc duyên — ✅ DATA `script/global/fuyuan.lua`, trang Trợ giúp

- Tích theo **thời gian online**: phải có tối thiểu 2 giờ mới đổi được; mỗi giờ 1 điểm; quá 4 giờ thì giảm dần.
- Mỗi lần đổi tối đa 100 điểm; đổi 2 lần trong ngày được thưởng thêm 2 điểm.
- Thời gian ngồi tù, treo máy ở Đào Hoa đảo, dùng tự động đánh quái **không được tính**.
- Phúc Duyên Lộ (tiểu / trung / đại) cộng điểm (tiểu +10). Dùng điểm để đổi quà ở NPC Thần Bí Thương Nhân (Tương Dương).

---

## 12. Còn thiếu / cần kiểm chứng

| Mục | Tình trạng |
|---|---|
| Hằng số Thân pháp → sát thương ám khí, Nội công → nội công gốc | Không có trong mã; đo trên server gốc |
| Mức sàn tỉ lệ trúng (40% trong mã, 5% theo hằng số / bài cũ) | Đo trên server gốc |
| Điều kiện áp chí mạng / chí tử (`bReturn`) | Có thể bị đảo trong bản fan |
| Dấu của ngũ hành cường hóa trong trường hợp khắc chế | Trông ngược |
| Ý nghĩa `MagicRate`, `MoneyScale`, `…ItemLevelScale` trong bảng rơi | Tự diễn giải |
| Tốc độ cố định của Thiên Vương / Thiếu Lâm quyền | Chỉ có trên web |
| `FreezeTimeReduceMax=77` (dữ liệu) và 95 (mã) | Lệch |

---

## 12b. Đối chiếu `../jx-web-main` (2026-11-12, người dùng cho tham khảo; bỏ phần tốc đánh / tốc chạy)

| Mục | jx-web-main | Kết luận |
|---|---|---|
| Lên cấp | +5 tiềm năng, +1 kỹ năng, exp theo bảng | Khớp §1.1 |
| Sinh lực / Nội lực, Chính xác, Né | như §1.3, §2 | Khớp |
| Sát thương ám khí | Thân pháp ÷ 5 | Lấp chỗ thiếu §2 (không có nguồn) |
| Nội công → sát thương | ×(1 + Nội công / 500), đang **tắt** | Vẫn chưa rõ |
| Kháng | gốc theo hệ + đồ, trần 75 + `allresmax_p` + trần riêng, tuyệt đối 95, thấp nhất −trần | Khớp §4; thêm `anti_*res_p` (xuyên kháng), `anti_maxres_p` (giảm trần đối phương) |
| Ngũ hành | khắc: kháng − `seriesdamage_p`, bị khắc: kháng + | Chiều khớp §4; hệ số ±10% của họ là tự chế |
| Trúng | AR / (AR + Né), sàn 40, trần 95 | Khớp mã engine |
| Chí mạng / chí tử | vật lý ×2 / tổng ×1,5 | ×2 khớp; chí tử khác gốc (30–50% Sinh lực) |
| Choáng / chậm / độc | 0,8 s cố định, chậm 75%·D/(D+200), độc = 40% đòn | **Tự chế, không dùng**; theo tham số `stun_p`, `colddamage_v`, `poisondamage_v` |
| Bùa lợi | cộng như bị động, không thời gian | Không dùng (gốc có thời gian) |
| Cấp chiêu tối đa | cấp nhân vật − cấp học + 1 | Nên dùng (BACKLOG KN12) |

## 13. Áp dụng vào jx-system-online (gợi ý)

| Phần | Nơi đặt |
|---|---|
| Cấp, exp, điểm tiềm năng / kỹ năng, chỉ số dẫn xuất (mục 1–2) | `packages/shared` một module chỉ số dùng chung cho người chơi, quái, bot |
| Trúng / sát thương / hiệu ứng (mục 3–5) | `packages/shared/src/formulas/` (`damage.ts`, `effects.ts`), gọi từ `SkillEngine.strike` (đã làm, vòng 18) |
| Tốc độ (mục 6) | thời gian động tác của `SkillEngine` / `World` (đổi khung → ms) |
| Exp (mục 7) | `apps/server/src/world/systems/combat.ts` (`kill`) khi quái chết |
| Quái theo cấp (mục 8) | thay công thức tạm `monsterHp` trong `monsters/scaling.ts` bằng đường cong của `npclevelscript` (sinh bằng tool) |
| May mắn, rơi đồ (mục 9) | tool đọc `settings/droprate/**.ini` + bộ sinh thuộc tính đồ |
| Khóa mục tiêu, auto (mục 10) | client `WorldScene` + server `World` |

## Nguồn

- Dữ liệu client: `../jx-origin/data_extract` (xem `apps/client/tools/jx/source.ts`).
- Mã nguồn engine: `jx1-vs2022-main/SwordOnline/Sources/Core/Src` (đã xóa 2026-11-12) — `KPlayer.cpp`, `KNpc.cpp`, `KNpcDeathCalcExp.cpp`,
  `KItemGenerator.CPP`, `KPlayerAI.cpp`, `GameDataDef.h`.
- Server tư nhân Ngạo Tuyết (chỉ để đối chiếu): `jxdocs-master/jx-win/JX-WIN-NgaoTuyet-Script-Setting.7z` (đã xóa 2026-11-12).
- Web: [各项属性名称解释 (bản Kinh điển)](https://jxjd.xoyo.com/index.php?a=show&c=index&catid=1768&id=110&m=content),
  [外功系攻击技能伤害计算公式 – 52pk 2004](https://jx.52pk.com/jx_exp/20040410/3384.html),
  [掉宝设定及幸运 – 52pk 2003](https://jx.52pk.com/shtml/20030502/3187.shtml),
  [剑网人物潜能分析 – Sina 2004](http://games.sina.com.cn/z/jxol/2004-04-27/130168.shtml),
  [攻速.会心.减伤.命中.防等 – 17173 2009](http://jx.17173.com/content/2009-07-30/1248924305.shtml?_platform=PC),
  [关于攻速、减伤、会心、命中… – diễn đàn Kinh điển](https://jxjd.bbs.xoyo.com/forum.php?mod=viewthread&tid=34114169).
