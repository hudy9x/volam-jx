# Trang bị hoàng kim môn phái và Thiên Tứ (bạch kim)

> Sinh tự động từ bảng của client gốc (chỉ đọc) bằng `apps/client/tools/doc-gold.ts` — đừng sửa tay, chạy lại tool (mục 6).
> Bảng: `jx-origin/settings/item/` — `goldequip.txt`, `magicattrib_ge.txt`, `platinaequip.txt`, `platina_magicrate.txt`,
> `platina_magicattr.txt` là **file rời của bản mod SHXT**, không có trong `data_extract` (được phép đọc: `AGENTS.md` §7, `tasks/BACKLOG.md` TB0). Kỹ năng bạch kim:
> `data_extract/slistcache/settings/skills.txt` + `script/skill/special/platina.lua`. Câu mô tả thuộc tính lấy nguyên văn `magicdesc.ini`
> (như tooltip gốc); mã thuộc tính → tên đọc từ bảng chuỗi trong exe của client (`tools/jx/magicattr.ts`, kiểm chứng tới mã 176).
> Cơ chế (phẩm chất, dòng ẩn, bộ): đọc từ mã engine fork `jx1-vs2022-main` và ghi chép `jx1-gameplay-research/09…` §6–§7 (cả hai đã xóa 2026-11-12).
> Ký hiệu: ✅ đọc thẳng từ bảng / mã · 🟡 suy luận · ❓ chưa rõ.

## 1. Tóm tắt

- **Hoàng kim môn phái**: 28 bộ × 5 món = 140 món (`goldequip.txt` dòng 1–140, số bộ 1–28), cho 10 phái gốc. ✅
  Hoa Sơn (phái thứ 11 của bản mod) **không có** bộ hoàng kim môn phái cổ điển; Hoa Sơn chỉ có ở các họ bộ đời sau (mục 5).
- **Thiên Tứ**: 140 món "[Thiên Tứ] …" trong `platinaequip.txt` (số bộ 1–28) = **bạch kim của cùng 28 bộ môn phái**, yêu cầu cấp 120. ✅
  110/140 món trùng tên một món hoàng kim cùng bộ; 30 món là món khác của bộ (vd. Thiên Tứ Mộng Long có nhẫn thay giày).
  6 món trùng tên nhưng **khác ô** trong bảng mod (có thể là lỗi bảng 🟡) — ghi ngay ở từng món.
- Mỗi bộ cùng số bộ còn có các bản biến thể "[Định thời]", "[Hạn chế thời gian]", "[限时白金]" (bạch kim có thời hạn) — ghi ở mục 5.

| Môn phái | Bộ (số bộ trong bảng) |
|---|---|
| Thiếu Lâm | Mộng Long (1) · Phục Ma (2) · Tứ Không (3) |
| Thiên Vương | Hám Thiên (4) · Kế Nghiệp (5) · Ngự Long (6) |
| Nga My | Vô Gian (7) · Vô Ma (8) · Vô Trần (9) |
| Thúy Yên | Tê Hoàng (10) · Bích Hải (11) |
| Ngũ Độc | U Lung (12) · Minh ảo (13) · Chú Phược (14) |
| Đường Môn | Băng Hàn (15) · Thiên Quang (16) · Sâm Hoang (17) · Địa Phách (18) |
| Cái Bang | Đồng Cừu (19) · Địch Khái (20) |
| Thiên Nhẫn | Ma Sát (21) · Ma Hoàng (22) · Ma Thị (23) |
| Võ Đang | Lăng Nhạc (24) · Cập Phong (25) |
| Côn Lôn | Sương Tinh (26) · Lôi Khung (27) · Vụ ảo (28) |

## 2. Cách đọc

- **Khoảng giá trị hoàng kim** "a–b": mỗi dòng có loại thuộc tính cố định; khi món đồ sinh ra, engine lấy phẩm chất `q` (0–10, theo may mắn của
  lệnh tạo đồ) và tính `giá trị = min + (max − min) × q / 10` cho từng tham số (✅ `KItemGenerator::Gen_GoldEquipment`). a = q 0, b = q 10.
- **Dòng hiện / ẩn**: theo engine, dòng 1, 3, 5 luôn có hiệu lực; dòng 2, 4, 6 là **thuộc tính ẩn**, chỉ có hiệu lực khi được kích hoạt bằng
  ngũ hành tương sinh (hệ nhân vật / hệ hai món ở ô kích hoạt) hoặc khi **mặc đủ bộ** (✅ mã engine fork; 🟡 với bản SHXT vì engine thật không có).
  Bảng ô kích hoạt và luật tương sinh: tài liệu 09 §6.
- **Bộ 1–28 không có dòng thưởng bộ** (cột "扩展套装…" để trống, không có trong `suite_activate_count.txt`): lợi ích của đủ bộ là kích hoạt mọi
  thuộc tính ẩn. ✅ bảng / 🟡 cơ chế.
- **Thiên Tứ** (bạch kim): mỗi dòng có hai chỉ số dòng — một ở **+0** và một ở **+10** (cột "魔法属性索引k(0级)/(10级)"); món có cấp cường hóa
  +0…+10. Giá trị ở các cấp giữa: ❓ (engine fork không có bộ nâng cấp bạch kim; hợp lý nhất là nội suy). Ngoài 6 dòng còn có:
  - **Kỹ năng bạch kim** mở ở **+6** và ở **+10** (cột "6级技能ID", "10级技能ID"): trạng thái bị động, tác dụng tính từ `platina.lua` theo cấp
    kỹ năng (giả định cấp kỹ năng = cấp cường hóa ❓). Tên kỹ năng gốc là tiếng Trung (白金… = "bạch kim …").
  - **Dòng thêm khi cường hóa** (`platina_magicrate.txt`): ở mỗi cấp +5…+9, mỗi "dòng thêm" (1, 2, …) chọn ngẫu nhiên một trong tối đa 3 thuộc tính
    của `platina_magicattr.txt` theo tỉ lệ %. Ý nghĩa cột "ActiveRate" (luôn 100) và thời điểm quay: ❓.
- **Yêu cầu** lấy từ 6 cột yêu cầu; **cơ bản** = 7 thuộc tính cơ bản (phòng thủ, độ bền, sát thương vũ khí…).
- Một số câu gốc của `magicdesc.ini` hơi lạ (vd. `armordefense_v` ghi "Né tránh") — giữ nguyên văn bản gốc.

## 2.1 Thứ tự ô kích hoạt (nhắc lại từ tài liệu 09 §6)

Nón ← {áo, dây chuyền} · Áo ← {nhẫn 2, đai} · Đai ← {ngọc bội, hộ uyển} · Vũ khí ← {dây chuyền, áo} · Giày ← {vũ khí, nón} ·
Hộ uyển ← {giày, nhẫn 1} · Dây chuyền ← {đai, nhẫn 2} · Nhẫn 1 ← {vũ khí, nón} · Nhẫn 2 ← {hộ uyển, ngọc bội} · Ngọc bội ← {giày, nhẫn 1}.
Tương sinh: Kim → Thủy → Mộc → Hỏa → Thổ → Kim.

## 3–4. Từng bộ, từng món

### Thiếu Lâm

#### Bộ Mộng Long (số bộ 1)

- Hoàng kim (5 món): Mộng Long Chính Hồng Tăng Mão (Nón) · Mộng Long Kim Ti Chính Hồng Cà Sa (Áo) · Mộng Long Huyền Ti Phát đái (Đai) · Mộng Long Phật Pháp Huyền Bội (Ngọc bội) · Mộng Long Đạt Ma Tăng hài (Giày)
- Thiên Tứ (5 món): Mộng Long Chính Hồng Tăng Mão (Nón) · Mộng Long Kim Ti Chính Hồng Cà Sa (Áo) · Mộng Long Huyền Ti Phát Đái (Đai) · Mộng Long Phật Pháp Huyền Bội (Ngọc bội) · Mộng Long Tử Kim Bàn Nhược Giới (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Mộng Long Đạt Ma Tăng hài; chỉ Thiên Tứ có Mộng Long Tử Kim Bàn Nhược Giới.

##### Hoàng kim — bộ Mộng Long

###### Mộng Long Chính Hồng Tăng Mão — Nón

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 1
- Yêu cầu: cấp 90, Sức mạnh 160, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 360 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Long Trảo Hổ Trảo]: +1–3 cấp |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp |

###### Mộng Long Kim Ti Chính Hồng Cà Sa — Áo

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 2
- Yêu cầu: cấp 99, Sức mạnh 260, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–60 |
| 3 | hiện | Kỹ năng [Thiếu Lâm Quyền Pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Đạt Ma Độ Giang]: +1–3 cấp |

###### Mộng Long Huyền Ti Phát đái — Đai

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 3
- Yêu cầu: cấp 95, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Hàng Long Bất Vũ]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thời gian trúng độc: -50–80% |
| 6 | ẩn | Thời gian choáng: -30–40% |

###### Mộng Long Phật Pháp Huyền Bội — Ngọc bội

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 4
- Yêu cầu: cấp 80, môn phái Thiếu Lâm
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Mộng Long Đạt Ma Tăng hài — Giày

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 5
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Mộng Long

###### [Thiên Tứ] Mộng Long Chính Hồng Tăng Mão — Nón

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 1
- Yêu cầu: cấp 120, Sức mạnh 160, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 360 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kỹ năng [Long Trảo Hổ Trảo]: +1–3 cấp | Kỹ năng [Long Trảo Hổ Trảo]: +1–3 cấp |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +120–150% |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Tỉ lệ công kích chính xác: +300–400 điểm | Tỉ lệ công kích chính xác: +500–600 điểm |
| 6 | ẩn | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp |

- Kỹ năng ở +6: #768 白金外普3: Tỉ lệ công kích chính xác: +300%
- Kỹ năng ở +10: #798 白金外普4: Sát thương vật lý - ngoại công: +40%
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiếu Lâm Quyền Pháp]: +1 cấp; +6: 95% Kỹ năng [Thiếu Lâm Quyền Pháp]: +1 cấp / 5% Kỹ năng [Thiếu Lâm Quyền Pháp]: +2 cấp; +7: 100% Kỹ năng [Thiếu Lâm Quyền Pháp]: +2 cấp; +8: 100% Kỹ năng [Thiếu Lâm Quyền Pháp]: +2 cấp; +9: 100% Kỹ năng [Thiếu Lâm Quyền Pháp]: +3 cấp

###### [Thiên Tứ] Mộng Long Kim Ti Chính Hồng Cà Sa — Áo

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 2
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–60 | Thời gian phục hồi: -48–68 |
| 3 | hiện | Kỹ năng [Thiếu Lâm Quyền Pháp]: +1–3 cấp | Kỹ năng [Thiếu Lâm Quyền Pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Đạt Ma Độ Giang]: +1–3 cấp | Kỹ năng [Đạt Ma Độ Giang]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #851 白金少林拳3: Kỹ năng [Đạt Ma Độ Giang]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Long Trảo Hổ Trảo]: +1 cấp; +6: 95% Kỹ năng [Long Trảo Hổ Trảo]: +1 cấp / 5% Kỹ năng [Long Trảo Hổ Trảo]: +2 cấp; +7: 100% Kỹ năng [Long Trảo Hổ Trảo]: +2 cấp; +8: 100% Kỹ năng [Long Trảo Hổ Trảo]: +2 cấp; +9: 100% Kỹ năng [Long Trảo Hổ Trảo]: +3 cấp

###### [Thiên Tứ] Mộng Long Huyền Ti Phát Đái — Đai

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 3
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Hàng Long Bất Vũ]: +1–3 cấp | Kỹ năng [Hàng Long Bất Vũ]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Thời gian trúng độc: -50–80% | Thời gian trúng độc: -60–90% |
| 6 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |

- Kỹ năng ở +6: #775 白金少林拳1: Xác suất phát ra chiêu [Sư tử hống] +1%
- Kỹ năng ở +10: #807 白金少林拳2: Kỹ năng [Đạt Ma Độ Giang]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Đạt Ma Độ Giang]: +1 cấp; +6: 95% Kỹ năng [Đạt Ma Độ Giang]: +1 cấp / 5% Kỹ năng [Đạt Ma Độ Giang]: +2 cấp; +7: 100% Kỹ năng [Đạt Ma Độ Giang]: +2 cấp; +8: 100% Kỹ năng [Đạt Ma Độ Giang]: +2 cấp; +9: 100% Kỹ năng [Đạt Ma Độ Giang]: +3 cấp

###### [Thiên Tứ] Mộng Long Phật Pháp Huyền Bội — Ngọc bội

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 4
- Yêu cầu: cấp 120, môn phái Thiếu Lâm
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng hỏa: +5% | Kháng hỏa: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Tỉ lệ công kích chính xác: +1500 điểm / 5% Tỉ lệ công kích chính xác: +2000 điểm; +6: 50% Tỉ lệ công kích chính xác: +1500 điểm / 50% Tỉ lệ công kích chính xác: +2000 điểm; +7: 100% Tỉ lệ công kích chính xác: +2000 điểm; +8: 50% Tỉ lệ công kích chính xác: +2000 điểm / 50% Tỉ lệ công kích chính xác: +2500 điểm; +9: 100% Tỉ lệ công kích chính xác: +2500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý: 30%; +6: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 100% Sát thương vật lý: 40%; +9: 100% Sát thương vật lý: 50%

###### [Thiên Tứ] Mộng Long Tử Kim Bàn Nhược Giới — Nhẫn

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 5
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +25–30% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Đạt Ma Độ Giang]: +1 cấp; +6: 95% Kỹ năng [Đạt Ma Độ Giang]: +1 cấp / 5% Kỹ năng [Đạt Ma Độ Giang]: +2 cấp; +7: 100% Kỹ năng [Đạt Ma Độ Giang]: +2 cấp; +8: 100% Kỹ năng [Đạt Ma Độ Giang]: +2 cấp; +9: 100% Kỹ năng [Đạt Ma Độ Giang]: +3 cấp

#### Bộ Phục Ma (số bộ 2)

- Hoàng kim (5 món): Phục Ma Tử Kim Côn (Vũ khí) · Phục Ma Huyền Hoàng Cà Sa (Áo) · Phục Ma Ô Kim Nhuyễn Điều (Đai) · Phục Ma Phật Tâm Nhuyễn Khấu (Ngọc bội) · Phục Ma Phổ Độ Tăng hài (Giày)
- Thiên Tứ (5 món): Phục Ma Tử Kim Côn (Vũ khí) · Phục Ma Vô Lượng Kim Cương Uyển (Hộ uyển) · Phục Ma Ô Kim Nhuyễn Điều (Đai) · Phục Ma Phật Tâm Nhuyễn Khấu (Ngọc bội) · Phục Ma Phổ Độ Tăng Hài (Giày)
- Khác món giữa hai bản: chỉ hoàng kim có Phục Ma Huyền Hoàng Cà Sa; chỉ Thiên Tứ có Phục Ma Vô Lượng Kim Cương Uyển.

##### Hoàng kim — bộ Phục Ma

###### Phục Ma Tử Kim Côn — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 6
- Yêu cầu: cấp 99, Sức mạnh 180, môn phái Thiếu Lâm
- Cơ bản: Sát thương nhỏ nhất: 69 điểm · Sát thương lớn nhất: 128 điểm · Tỉ lệ công kích chính xác: -10% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +100–150% |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Tỉ lệ công kích chính xác: +450–600 điểm |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm |
| 5 | hiện | Hút nội lực: +4–8% |
| 6 | ẩn | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp |

###### Phục Ma Huyền Hoàng Cà Sa — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 7
- Yêu cầu: cấp 90, Sức mạnh 260, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Thiếu Lâm Côn pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Phục Ma Ô Kim Nhuyễn Điều — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 8
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Kim Cang Phục Ma]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thời gian trúng độc: -50–80% |
| 6 | ẩn | Thời gian choáng: -30–40% |

###### Phục Ma Phật Tâm Nhuyễn Khấu — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 9
- Yêu cầu: cấp 80, môn phái Thiếu Lâm
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Phục Ma Phổ Độ Tăng hài — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 10
- Yêu cầu: cấp 95, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Hoành Tảo Thiên Quân]: +1–3 cấp |
| 3 | hiện | Tốc độ di chuyển: +40–60% |
| 4 | ẩn | Kháng lôi: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian làm chậm: -30–40% |

##### Thiên Tứ — bộ Phục Ma

###### [Thiên Tứ] Phục Ma Tử Kim Côn — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 6
- Yêu cầu: cấp 120, Sức mạnh 180, môn phái Thiếu Lâm
- Cơ bản: Sát thương nhỏ nhất: 69 điểm · Sát thương lớn nhất: 128 điểm · Tỉ lệ công kích chính xác: -10% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +100–150% | Sát thương vật lý - ngoại công: +160–200% |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Tỉ lệ công kích chính xác: +450–600 điểm | Tỉ lệ công kích chính xác: +900–1000 điểm |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm | Sát thương vật lý - ngoại công: +70–80 điểm |
| 5 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 6 | ẩn | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Phục Ma Vô Lượng Kim Cương Uyển — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 7
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Thiếu Lâm Côn pháp]: +1–3 cấp | Kỹ năng [Thiếu Lâm Côn pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +25–30% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Hoành Tảo Thiên Quân]: +1 cấp; +6: 95% Kỹ năng [Hoành Tảo Thiên Quân]: +1 cấp / 5% Kỹ năng [Hoành Tảo Thiên Quân]: +2 cấp; +7: 100% Kỹ năng [Hoành Tảo Thiên Quân]: +2 cấp; +8: 100% Kỹ năng [Hoành Tảo Thiên Quân]: +2 cấp; +9: 100% Kỹ năng [Hoành Tảo Thiên Quân]: +3 cấp

###### [Thiên Tứ] Phục Ma Ô Kim Nhuyễn Điều — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 8
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Kim Cang Phục Ma]: +1–3 cấp | Kỹ năng [Kim Cang Phục Ma]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Thời gian trúng độc: -50–80% | Thời gian trúng độc: -60–90% |
| 6 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |

- Kỹ năng ở +6: #776 白金少林棍1: Xác suất phát ra chiêu [Sư tử hống] +1%
- Kỹ năng ở +10: #808 白金少林棍2: Kỹ năng [Hoành Tảo Thiên Quân]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Hoành Tảo Thiên Quân]: +1 cấp; +6: 95% Kỹ năng [Hoành Tảo Thiên Quân]: +1 cấp / 5% Kỹ năng [Hoành Tảo Thiên Quân]: +2 cấp; +7: 100% Kỹ năng [Hoành Tảo Thiên Quân]: +2 cấp; +8: 100% Kỹ năng [Hoành Tảo Thiên Quân]: +2 cấp; +9: 100% Kỹ năng [Hoành Tảo Thiên Quân]: +3 cấp

###### [Thiên Tứ] Phục Ma Phật Tâm Nhuyễn Khấu — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 9
- Yêu cầu: cấp 120, môn phái Thiếu Lâm
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng hỏa: +5% | Kháng hỏa: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Hoành Tảo Lục Hợp]: +1 cấp; +6: 95% Kỹ năng [Hoành Tảo Lục Hợp]: +1 cấp / 5% Kỹ năng [Hoành Tảo Lục Hợp]: +2 cấp; +7: 100% Kỹ năng [Hoành Tảo Lục Hợp]: +2 cấp; +8: 100% Kỹ năng [Hoành Tảo Lục Hợp]: +2 cấp; +9: 100% Kỹ năng [Hoành Tảo Lục Hợp]: +3 cấp

###### [Thiên Tứ] Phục Ma Phổ Độ Tăng Hài — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 10
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kỹ năng [Hoành Tảo Thiên Quân]: +1–3 cấp | Kỹ năng [Hoành Tảo Thiên Quân]: +1–3 cấp |
| 3 | hiện | Tốc độ di chuyển: +40–60% | Tốc độ di chuyển: +50–70% |
| 4 | ẩn | Kháng lôi: +25–30% | Kháng lôi: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian làm chậm: -30–40% | Thời gian làm chậm: -40–50% |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #852 白金少林棍3: Kỹ năng [Hoành Tảo Thiên Quân]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Tỉ lệ công kích chính xác: +1500 điểm / 5% Tỉ lệ công kích chính xác: +2000 điểm; +6: 50% Tỉ lệ công kích chính xác: +1500 điểm / 50% Tỉ lệ công kích chính xác: +2000 điểm; +7: 100% Tỉ lệ công kích chính xác: +2000 điểm; +8: 50% Tỉ lệ công kích chính xác: +2000 điểm / 50% Tỉ lệ công kích chính xác: +2500 điểm; +9: 100% Tỉ lệ công kích chính xác: +2500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiếu Lâm Côn pháp]: +1 cấp; +6: 95% Kỹ năng [Thiếu Lâm Côn pháp]: +1 cấp / 5% Kỹ năng [Thiếu Lâm Côn pháp]: +2 cấp; +7: 100% Kỹ năng [Thiếu Lâm Côn pháp]: +2 cấp; +8: 100% Kỹ năng [Thiếu Lâm Côn pháp]: +2 cấp; +9: 100% Kỹ năng [Thiếu Lâm Côn pháp]: +3 cấp

#### Bộ Tứ Không (số bộ 3)

- Hoàng kim (5 món): Tứ Không Giáng Ma Giới đao (Vũ khí) · Tứ Không Tử Kim Cà Sa (Áo) · Tứ Không Hộ pháp Yêu đái (Đai) · Tứ Không Nhuyễn Bì Hộ Uyển (Hộ uyển) · Tứ Không Giới Luật Pháp giới (Nhẫn)
- Thiên Tứ (5 món): Tứ Không Giáng Ma Giới Đao (Vũ khí) · Tứ Không Đạt Ma Tăng Hài (Giày) · Tứ Không Hộ Pháp Yêu Đái (Đai) · Tứ Không Nhuyễn Bì Hộ Uyển (Hộ uyển) · Tứ Không Giới Luật Pháp Giới (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Tứ Không Tử Kim Cà Sa; chỉ Thiên Tứ có Tứ Không Đạt Ma Tăng Hài.

##### Hoàng kim — bộ Tứ Không

###### Tứ Không Giáng Ma Giới đao — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 11
- Yêu cầu: cấp 99, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm |
| 5 | hiện | Hút nội lực: +4–8% |
| 6 | ẩn | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp |

###### Tứ Không Tử Kim Cà Sa — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 12
- Yêu cầu: cấp 90, Sức mạnh 260, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Thiếu Lâm Đao pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Tứ Không Hộ pháp Yêu đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 13
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Kim Cang Phục Ma]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thời gian trúng độc: -50–80% |
| 6 | ẩn | Tấn công chí mạng: 3–5% |

###### Tứ Không Nhuyễn Bì Hộ Uyển — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 14
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian choáng: -30–40% |
| 3 | hiện | Kỹ năng [Vô Tướng Trảm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Ma Ha Vô Lượng]: +1–3 cấp |

###### Tứ Không Giới Luật Pháp giới — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 15
- Yêu cầu: cấp 80, môn phái Thiếu Lâm
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Tứ Không

###### [Thiên Tứ] Tứ Không Giáng Ma Giới Đao — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 11
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 5 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 6 | ẩn | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp | Kỹ năng [Như Lai Thiên Diệp]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Tứ Không Đạt Ma Tăng Hài — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 12
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Thiếu Lâm Đao pháp]: +1–3 cấp | Kỹ năng [Thiếu Lâm Đao pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Vô Tướng Trảm]: +1 cấp; +6: 95% Kỹ năng [Vô Tướng Trảm]: +1 cấp / 5% Kỹ năng [Vô Tướng Trảm]: +2 cấp; +7: 100% Kỹ năng [Vô Tướng Trảm]: +2 cấp; +8: 100% Kỹ năng [Vô Tướng Trảm]: +2 cấp; +9: 100% Kỹ năng [Vô Tướng Trảm]: +3 cấp

###### [Thiên Tứ] Tứ Không Hộ Pháp Yêu Đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 13
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Kim Cang Phục Ma]: +1–3 cấp | Kỹ năng [Kim Cang Phục Ma]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Thời gian trúng độc: -50–80% | Thời gian trúng độc: -60–90% |
| 6 | ẩn | Tấn công chí mạng: 3–5% | Tấn công chí mạng: 5–7% |

- Kỹ năng ở +6: #777 白金少林刀1: Xác suất phát ra chiêu [Sư tử hống] +1%
- Kỹ năng ở +10: #809 白金少林刀2: Kỹ năng [Vô Tướng Trảm]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Vô Tướng Trảm]: +1 cấp; +6: 95% Kỹ năng [Vô Tướng Trảm]: +1 cấp / 5% Kỹ năng [Vô Tướng Trảm]: +2 cấp; +7: 100% Kỹ năng [Vô Tướng Trảm]: +2 cấp; +8: 100% Kỹ năng [Vô Tướng Trảm]: +2 cấp; +9: 100% Kỹ năng [Vô Tướng Trảm]: +3 cấp

###### [Thiên Tứ] Tứ Không Nhuyễn Bì Hộ Uyển — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 14
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiếu Lâm
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |
| 3 | hiện | Kỹ năng [Vô Tướng Trảm]: +1–3 cấp | Kỹ năng [Vô Tướng Trảm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Ma Ha Vô Lượng]: +1–3 cấp | Kỹ năng [Ma Ha Vô Lượng]: +1–3 cấp |

- Kỹ năng ở +6: #849 白金加血3: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #853 白金少林刀3: Kỹ năng [Vô Tướng Trảm]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Ma Ha Vô Lượng]: +1 cấp; +6: 95% Kỹ năng [Ma Ha Vô Lượng]: +1 cấp / 5% Kỹ năng [Ma Ha Vô Lượng]: +2 cấp; +7: 100% Kỹ năng [Ma Ha Vô Lượng]: +2 cấp; +8: 100% Kỹ năng [Ma Ha Vô Lượng]: +2 cấp; +9: 100% Kỹ năng [Ma Ha Vô Lượng]: +3 cấp

###### [Thiên Tứ] Tứ Không Giới Luật Pháp Giới — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 15
- Yêu cầu: cấp 120, môn phái Thiếu Lâm
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng hỏa: +5% | Kháng hỏa: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #883 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #882 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiếu Lâm Đao pháp]: +1 cấp; +6: 95% Kỹ năng [Thiếu Lâm Đao pháp]: +1 cấp / 5% Kỹ năng [Thiếu Lâm Đao pháp]: +2 cấp; +7: 100% Kỹ năng [Thiếu Lâm Đao pháp]: +2 cấp; +8: 100% Kỹ năng [Thiếu Lâm Đao pháp]: +2 cấp; +9: 100% Kỹ năng [Thiếu Lâm Đao pháp]: +3 cấp

### Thiên Vương

#### Bộ Hám Thiên (số bộ 4)

- Hoàng kim (5 món): Hám Thiên Kim Hoàn Đại Nhãn Thần Chùy (Vũ khí) · Hám Thiên Vũ Thần Tương Kim Giáp (Áo) · Hám Thiên Uy Vũ Thúc yêu đái (Đai) · Hám Thiên Hổ đầu Khẩn Thúc Uyển (Hộ uyển) · Hám Thiên Thừa Long Chiến Ngoa (Giày)
- Thiên Tứ (5 món): Hám Thiên Kim Hoàn Đại Nhãn Thần Chùy (Vũ khí) · Hám Thiên Vũ Thần Tương Kim Giáp (Áo) · Hám Thiên Uy Vũ Thúc Yêu Hoàn (Đai) · Hám Thiên Hổ Đầu Khẩn Thúc Uyển (Hộ uyển) · Hám Thiên Thừa Long Chiến Ngoa (Giày)
- Khác món giữa hai bản: chỉ hoàng kim có Hám Thiên Uy Vũ Thúc yêu đái; chỉ Thiên Tứ có Hám Thiên Uy Vũ Thúc Yêu Hoàn.

##### Hoàng kim — bộ Hám Thiên

###### Hám Thiên Kim Hoàn Đại Nhãn Thần Chùy — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 16
- Yêu cầu: cấp 99, Sức mạnh 235, môn phái Thiên Vương
- Cơ bản: Sát thương nhỏ nhất: 55 điểm · Sát thương lớn nhất: 165 điểm · Tỉ lệ công kích chính xác: -30% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Bỏ qua né tránh: 1–2% |
| 2 | ẩn | Tỉ lệ công kích chính xác: +180–300 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 5 | hiện | Hút sinh lực: +4–8% |
| 6 | ẩn | Băng sát - ngoại công: +80–120 điểm |

###### Hám Thiên Vũ Thần Tương Kim Giáp — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 17
- Yêu cầu: cấp 90, Sức mạnh 260, môn phái Thiên Vương
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Thiên Vương Chùy Pháp]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Hám Thiên Uy Vũ Thúc yêu đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 18
- Yêu cầu: cấp 95, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Trảm Long quyết]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thời gian trúng độc: -50–80% |
| 6 | ẩn | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp |

###### Hám Thiên Hổ đầu Khẩn Thúc Uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 19
- Yêu cầu: cấp 80, Sức mạnh 110, môn phái Thiên Vương
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Hám Thiên Thừa Long Chiến Ngoa — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 20
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% |
| 3 | hiện | Kỹ năng [Hàng Vân Quyết]: +1–3 cấp |
| 4 | ẩn | Kháng lôi: +30–35% |
| 5 | hiện | Thân pháp: +8–12 điểm |
| 6 | ẩn | Kỹ năng [Thừa Long Quyết]: +1–3 cấp |

##### Thiên Tứ — bộ Hám Thiên

###### [Thiên Tứ] Hám Thiên Kim Hoàn Đại Nhãn Thần Chùy — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 16
- Yêu cầu: cấp 120, Sức mạnh 235, môn phái Thiên Vương
- Cơ bản: Sát thương nhỏ nhất: 55 điểm · Sát thương lớn nhất: 165 điểm · Tỉ lệ công kích chính xác: -30% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Bỏ qua né tránh: 1–2% | Bỏ qua né tránh: 1–2% |
| 2 | ẩn | Tỉ lệ công kích chính xác: +180–300 điểm | Tỉ lệ công kích chính xác: +300–400 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 5 | hiện | Hút sinh lực: +4–8% | Hút sinh lực: +6–10% |
| 6 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Hám Thiên Vũ Thần Tương Kim Giáp — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 17
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Thiên Vương
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Thiên Vương Chùy Pháp]: +1–3 cấp | Kỹ năng [Thiên Vương Chùy Pháp]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +25–30% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Truy Phong Quyết]: +1 cấp; +6: 95% Kỹ năng [Truy Phong Quyết]: +1 cấp / 5% Kỹ năng [Truy Phong Quyết]: +2 cấp; +7: 100% Kỹ năng [Truy Phong Quyết]: +2 cấp; +8: 100% Kỹ năng [Truy Phong Quyết]: +2 cấp; +9: 100% Kỹ năng [Truy Phong Quyết]: +3 cấp

###### [Thiên Tứ] Hám Thiên Uy Vũ Thúc Yêu Hoàn — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 18
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Trảm Long quyết]: +1–3 cấp | Kỹ năng [Trảm Long quyết]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Thời gian trúng độc: -50–80% | Thời gian trúng độc: -60–90% |
| 6 | ẩn | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp |

- Kỹ năng ở +6: #779 白金天王锤1: Xác suất phục hồi sinh lực [Đảo Hư Thiên] tăng +10%
- Kỹ năng ở +10: #811 白金天王锤2: Kỹ năng [Truy Phong Quyết]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Hàng Vân Quyết]: +1 cấp; +6: 95% Kỹ năng [Hàng Vân Quyết]: +1 cấp / 5% Kỹ năng [Hàng Vân Quyết]: +2 cấp; +7: 100% Kỹ năng [Hàng Vân Quyết]: +2 cấp; +8: 100% Kỹ năng [Hàng Vân Quyết]: +2 cấp; +9: 100% Kỹ năng [Hàng Vân Quyết]: +3 cấp

###### [Thiên Tứ] Hám Thiên Hổ Đầu Khẩn Thúc Uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 19
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Vương
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng hỏa: +5% | Kháng hỏa: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thừa Long Quyết]: +1 cấp; +6: 95% Kỹ năng [Thừa Long Quyết]: +1 cấp / 5% Kỹ năng [Thừa Long Quyết]: +2 cấp; +7: 100% Kỹ năng [Thừa Long Quyết]: +2 cấp; +8: 100% Kỹ năng [Thừa Long Quyết]: +2 cấp; +9: 100% Kỹ năng [Thừa Long Quyết]: +3 cấp

###### [Thiên Tứ] Hám Thiên Thừa Long Chiến Ngoa — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 20
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% | Tốc độ di chuyển: +50–70% |
| 3 | hiện | Kỹ năng [Hàng Vân Quyết]: +1–3 cấp | Kỹ năng [Hàng Vân Quyết]: +1–3 cấp |
| 4 | ẩn | Kháng lôi: +30–35% | Kháng lôi: +35–40% |
| 5 | hiện | Thân pháp: +8–12 điểm | Thân pháp: +16–20 điểm |
| 6 | ẩn | Kỹ năng [Thừa Long Quyết]: +1–3 cấp | Kỹ năng [Thừa Long Quyết]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #855 白金天王锤3: Kỹ năng [Truy Phong Quyết]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Truy Phong Quyết]: +1 cấp; +6: 95% Kỹ năng [Truy Phong Quyết]: +1 cấp / 5% Kỹ năng [Truy Phong Quyết]: +2 cấp; +7: 100% Kỹ năng [Truy Phong Quyết]: +2 cấp; +8: 100% Kỹ năng [Truy Phong Quyết]: +2 cấp; +9: 100% Kỹ năng [Truy Phong Quyết]: +3 cấp

#### Bộ Kế Nghiệp (số bộ 5)

- Hoàng kim (5 món): Kế Nghiệp Bôn Lôi Toàn Long thương (Vũ khí) · Kế Nghiệp Huyền Vũ Hoàng Kim Khải (Áo) · Kế Nghiệp Bạch Hổ Vô Song khấu (Đai) · Kế Nghiệp HỏaVân Kỳ Lân Thủ (Hộ uyển) · Kế Nghiệp Chu Tước Lăng Vân Ngoa (Giày)
- Thiên Tứ (5 món): Kế Nghiệp Bôn Lôi Toàn Long Thương (Vũ khí) · Kế Nghiệp Huyền Vũ Hoàng Kim Khải (Áo) · Kế Nghiệp Bạch Hổ Vô Song Khấu (Đai) · Kế  Nghiệp Hỏa Vân Kỳ Lân Thủ (Hộ uyển) · Kế Nghiệp Chu Tước Lăng Vân Ngoa (Giày)

##### Hoàng kim — bộ Kế Nghiệp

###### Kế Nghiệp Bôn Lôi Toàn Long thương — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 21
- Yêu cầu: cấp 99, Sức mạnh 165, Thân pháp 165, môn phái Thiên Vương
- Cơ bản: Sát thương nhỏ nhất: 18 điểm · Sát thương lớn nhất: 158 điểm · Tỉ lệ công kích chính xác: +30% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh khí: -15 điểm → Sinh khí: +5 điểm |
| 2 | ẩn | Tỉ lệ công kích chính xác: +240–360 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 5 | hiện | Hút sinh lực: +4–8% |
| 6 | ẩn | Băng sát - ngoại công: +80–120 điểm |

###### Kế Nghiệp Huyền Vũ Hoàng Kim Khải — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 22
- Yêu cầu: cấp 95, Sức mạnh 260, môn phái Thiên Vương
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–60 |
| 3 | hiện | Kỹ năng [Thiên Vương Thương pháp]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +20–25% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Kế Nghiệp Bạch Hổ Vô Song khấu — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 23
- Yêu cầu: cấp 90, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Hồi Phong Lạc Nhạn]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thời gian trúng độc: -50–80% |
| 6 | ẩn | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp |

###### Kế Nghiệp HỏaVân Kỳ Lân Thủ — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 24
- Yêu cầu: cấp 80, Sức mạnh 110, môn phái Thiên Vương
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Kế Nghiệp Chu Tước Lăng Vân Ngoa — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 25
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Dương Quan Tam Điệp]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thân pháp: +8–12 điểm |
| 6 | ẩn | Kỹ năng [Huyết Chiến Bát Phương]: +1–3 cấp |

##### Thiên Tứ — bộ Kế Nghiệp

###### [Thiên Tứ] Kế Nghiệp Bôn Lôi Toàn Long Thương — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 21
- Yêu cầu: cấp 120, Sức mạnh 165, Thân pháp 165, môn phái Thiên Vương
- Cơ bản: Sát thương nhỏ nhất: 18 điểm · Sát thương lớn nhất: 158 điểm · Tỉ lệ công kích chính xác: +30% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh khí: -15 điểm → Sinh khí: +5 điểm | Sinh khí: +15–25 điểm |
| 2 | ẩn | Tỉ lệ công kích chính xác: +240–360 điểm | Tỉ lệ công kích chính xác: +900–1000 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 5 | hiện | Hút sinh lực: +4–8% | Hút sinh lực: +6–10% |
| 6 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Kế Nghiệp Huyền Vũ Hoàng Kim Khải — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 22
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Thiên Vương
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–60 | Thời gian phục hồi: -48–68 |
| 3 | hiện | Kỹ năng [Thiên Vương Thương pháp]: +1–3 cấp | Kỹ năng [Thiên Vương Thương pháp]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +20–25% | Kháng hỏa: +25–30% |
| 5 | hiện | Thân pháp: +4–8 điểm | Thân pháp: +8–12 điểm |
| 6 | ẩn | Kỹ năng [Tĩnh Tâm Quyết]: +3 cấp | Kỹ năng [Tĩnh Tâm Quyết]: +3 cấp |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #854 白金天王枪3: Kỹ năng [Truy Tinh Trục Nguyệt]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Truy Tinh Trục Nguyệt]: +1 cấp; +6: 95% Kỹ năng [Truy Tinh Trục Nguyệt]: +1 cấp / 5% Kỹ năng [Truy Tinh Trục Nguyệt]: +2 cấp; +7: 100% Kỹ năng [Truy Tinh Trục Nguyệt]: +2 cấp; +8: 100% Kỹ năng [Truy Tinh Trục Nguyệt]: +2 cấp; +9: 100% Kỹ năng [Truy Tinh Trục Nguyệt]: +3 cấp

###### [Thiên Tứ] Kế Nghiệp Bạch Hổ Vô Song Khấu — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 23
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Hồi Phong Lạc Nhạn]: +1–3 cấp | Kỹ năng [Hồi Phong Lạc Nhạn]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Thời gian trúng độc: -50–80% | Thời gian trúng độc: -60–90% |
| 6 | ẩn | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp |

- Kỹ năng ở +6: #778 白金天王枪1: Xác suất phục hồi sinh lực [Đảo Hư Thiên] tăng +10%
- Kỹ năng ở +10: #810 白金天王枪2: Kỹ năng [Truy Tinh Trục Nguyệt]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Tỉ lệ công kích chính xác: +1500 điểm / 5% Tỉ lệ công kích chính xác: +2000 điểm; +6: 50% Tỉ lệ công kích chính xác: +1500 điểm / 50% Tỉ lệ công kích chính xác: +2000 điểm; +7: 100% Tỉ lệ công kích chính xác: +2000 điểm; +8: 50% Tỉ lệ công kích chính xác: +2000 điểm / 50% Tỉ lệ công kích chính xác: +2500 điểm; +9: 100% Tỉ lệ công kích chính xác: +2500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Huyết Chiến Bát Phương]: +1 cấp; +6: 95% Kỹ năng [Huyết Chiến Bát Phương]: +1 cấp / 5% Kỹ năng [Huyết Chiến Bát Phương]: +2 cấp; +7: 100% Kỹ năng [Huyết Chiến Bát Phương]: +2 cấp; +8: 100% Kỹ năng [Huyết Chiến Bát Phương]: +2 cấp; +9: 100% Kỹ năng [Huyết Chiến Bát Phương]: +3 cấp

###### [Thiên Tứ] Kế  Nghiệp Hỏa Vân Kỳ Lân Thủ — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 24
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Vương
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng hỏa: +5% | Kháng hỏa: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Dương Quan Tam Điệp]: +1 cấp; +6: 95% Kỹ năng [Dương Quan Tam Điệp]: +1 cấp / 5% Kỹ năng [Dương Quan Tam Điệp]: +2 cấp; +7: 100% Kỹ năng [Dương Quan Tam Điệp]: +2 cấp; +8: 100% Kỹ năng [Dương Quan Tam Điệp]: +2 cấp; +9: 100% Kỹ năng [Dương Quan Tam Điệp]: +3 cấp

###### [Thiên Tứ] Kế Nghiệp Chu Tước Lăng Vân Ngoa — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 25
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Dương Quan Tam Điệp]: +1–3 cấp | Kỹ năng [Dương Quan Tam Điệp]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +25–30% |
| 5 | hiện | Thân pháp: +8–12 điểm | Thân pháp: +8–12 điểm |
| 6 | ẩn | Kỹ năng [Huyết Chiến Bát Phương]: +1–3 cấp | Kỹ năng [Huyết Chiến Bát Phương]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Truy Tinh Trục Nguyệt]: +1 cấp; +6: 95% Kỹ năng [Truy Tinh Trục Nguyệt]: +1 cấp / 5% Kỹ năng [Truy Tinh Trục Nguyệt]: +2 cấp; +7: 100% Kỹ năng [Truy Tinh Trục Nguyệt]: +2 cấp; +8: 100% Kỹ năng [Truy Tinh Trục Nguyệt]: +2 cấp; +9: 100% Kỹ năng [Truy Tinh Trục Nguyệt]: +3 cấp

#### Bộ Ngự Long (số bộ 6)

- Hoàng kim (5 món): Ngự Long Lượng Ngân Bảo đao (Vũ khí) · Ngự Long Chiến Thần Phi Quải giáp (Dây chuyền) · Ngự Long Thiên Môn Thúc Yêu hoàn (Đai) · Ngự Long Tấn Phong Hộ yển (Hộ uyển) · Ngự Long Tuyệt Mệnh Chỉ hoàn (Nhẫn)
- Thiên Tứ (5 món): Ngự Long Lượng Ngân Bảo Đao (Vũ khí) · Ngự Long Chiến Thần Phi Quái Giáp (Dây chuyền) · Ngự Long Thiên Môn Thúc Yêu Hoàn (Đai) · Ngự Long Tấn Phong Hộ Yển (Nón) · Ngự Long Tuyệt Mệnh Chỉ Hoàn (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Ngự Long Chiến Thần Phi Quải giáp; chỉ Thiên Tứ có Ngự Long Chiến Thần Phi Quái Giáp.

##### Hoàng kim — bộ Ngự Long

###### Ngự Long Lượng Ngân Bảo đao — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 26
- Yêu cầu: cấp 99, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh khí: -15 điểm → Sinh khí: +5 điểm |
| 2 | ẩn | Tỉ lệ công kích chính xác: +450–600 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 5 | hiện | Hút sinh lực: +4–8% |
| 6 | ẩn | Băng sát - ngoại công: +80–120 điểm |

###### Ngự Long Chiến Thần Phi Quải giáp — Dây chuyền

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 27
- Yêu cầu: cấp 90, môn phái Thiên Vương
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng lôi: +20–25% |
| 3 | hiện | Kháng hỏa: +20–25% |
| 4 | ẩn | Kháng tất cả: +16–24% |
| 5 | hiện | Kỹ năng [Đoạn Hồn Thích]: +1–3 cấp |
| 6 | ẩn | — |

###### Ngự Long Thiên Môn Thúc Yêu hoàn — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 28
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Kinh Lôi Trảm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thời gian trúng độc: -50–80% |
| 6 | ẩn | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp |

###### Ngự Long Tấn Phong Hộ yển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 29
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Thiên Vương
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Phá Thiên Trảm]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Bát Phong Trảm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thân pháp: +8–12 điểm |
| 6 | ẩn | Kỹ năng [Vô Tâm Trảm]: +1–3 cấp |

###### Ngự Long Tuyệt Mệnh Chỉ hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 30
- Yêu cầu: cấp 80, môn phái Thiên Vương
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Ngự Long

###### [Thiên Tứ] Ngự Long Lượng Ngân Bảo Đao — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 26
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh khí: -15 điểm → Sinh khí: +5 điểm | Sinh khí: +15–25 điểm |
| 2 | ẩn | Tỉ lệ công kích chính xác: +450–600 điểm | Tỉ lệ công kích chính xác: +900–1000 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 5 | hiện | Hút sinh lực: +4–8% | Hút sinh lực: +6–10% |
| 6 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Ngự Long Chiến Thần Phi Quái Giáp — Dây chuyền

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 27
- Yêu cầu: cấp 120, môn phái Thiên Vương
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kháng lôi: +20–25% | Kháng lôi: +25–30% |
| 3 | hiện | Kháng hỏa: +20–25% | Kháng hỏa: +25–30% |
| 4 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |
| 5 | hiện | Kỹ năng [Đoạn Hồn Thích]: +1–3 cấp | Kỹ năng [Đoạn Hồn Thích]: +1–3 cấp |
| 6 | ẩn | Kháng độc: +10–15% | Kháng độc: +15–20% |

- Kỹ năng ở +6: #849 白金加血3: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #856 白金天王刀3: Kỹ năng [Phá Thiên Trảm]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Tỉ lệ công kích chính xác: +1500 điểm / 5% Tỉ lệ công kích chính xác: +2000 điểm; +6: 50% Tỉ lệ công kích chính xác: +1500 điểm / 50% Tỉ lệ công kích chính xác: +2000 điểm; +7: 100% Tỉ lệ công kích chính xác: +2000 điểm; +8: 50% Tỉ lệ công kích chính xác: +2000 điểm / 50% Tỉ lệ công kích chính xác: +2500 điểm; +9: 100% Tỉ lệ công kích chính xác: +2500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Vô Tâm Trảm]: +1 cấp; +6: 95% Kỹ năng [Vô Tâm Trảm]: +1 cấp / 5% Kỹ năng [Vô Tâm Trảm]: +2 cấp; +7: 100% Kỹ năng [Vô Tâm Trảm]: +2 cấp; +8: 100% Kỹ năng [Vô Tâm Trảm]: +2 cấp; +9: 100% Kỹ năng [Vô Tâm Trảm]: +3 cấp

###### [Thiên Tứ] Ngự Long Thiên Môn Thúc Yêu Hoàn — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 28
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiên Vương
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Kinh Lôi Trảm]: +1–3 cấp | Kỹ năng [Kinh Lôi Trảm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Thời gian trúng độc: -50–80% | Thời gian trúng độc: -60–90% |
| 6 | ẩn | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp | Kỹ năng [Thiên Vương Chiến ý]: +1–3 cấp |

- Kỹ năng ở +6: #780 白金天王刀1: Xác suất phục hồi sinh lực [Đảo Hư Thiên] tăng +10%
- Kỹ năng ở +10: #812 白金天王刀2: Kỹ năng [Phá Thiên Trảm]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phá Thiên Trảm]: +1 cấp; +6: 95% Kỹ năng [Phá Thiên Trảm]: +1 cấp / 5% Kỹ năng [Phá Thiên Trảm]: +2 cấp; +7: 100% Kỹ năng [Phá Thiên Trảm]: +2 cấp; +8: 100% Kỹ năng [Phá Thiên Trảm]: +2 cấp; +9: 100% Kỹ năng [Phá Thiên Trảm]: +3 cấp

###### [Thiên Tứ] Ngự Long Tấn Phong Hộ Yển — Nón (bản hoàng kim cùng tên là Hộ uyển — bảng mod lệch ô 🟡)

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 29
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Vương
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Phá Thiên Trảm]: +1–3 cấp | Kỹ năng [Phá Thiên Trảm]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Bát Phong Trảm]: +1–3 cấp | Kỹ năng [Bát Phong Trảm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +25–30% |
| 5 | hiện | Thân pháp: +8–12 điểm | Thân pháp: +8–12 điểm |
| 6 | ẩn | Kỹ năng [Vô Tâm Trảm]: +1–3 cấp | Kỹ năng [Vô Tâm Trảm]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phá Thiên Trảm]: +1 cấp; +6: 95% Kỹ năng [Phá Thiên Trảm]: +1 cấp / 5% Kỹ năng [Phá Thiên Trảm]: +2 cấp; +7: 100% Kỹ năng [Phá Thiên Trảm]: +2 cấp; +8: 100% Kỹ năng [Phá Thiên Trảm]: +2 cấp; +9: 100% Kỹ năng [Phá Thiên Trảm]: +3 cấp

###### [Thiên Tứ] Ngự Long Tuyệt Mệnh Chỉ Hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 30
- Yêu cầu: cấp 120, môn phái Thiên Vương
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng hỏa: +5% | Kháng hỏa: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #883 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #882 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bát Phong Trảm]: +1 cấp; +6: 95% Kỹ năng [Bát Phong Trảm]: +1 cấp / 5% Kỹ năng [Bát Phong Trảm]: +2 cấp; +7: 100% Kỹ năng [Bát Phong Trảm]: +2 cấp; +8: 100% Kỹ năng [Bát Phong Trảm]: +2 cấp; +9: 100% Kỹ năng [Bát Phong Trảm]: +3 cấp

### Nga My

#### Bộ Vô Gian (số bộ 7)

- Hoàng kim (5 món): Vô Gian ỷ Thiên Kiếm (Vũ khí) · Vô Gian Thanh Phong Truy Y (Áo) · Vô Gian Phất Vân Ti đái (Đai) · Vô Gian Cầm Vận Hộ Uyển (Hộ uyển) · Vô Gian Bạch Ngọc Bàn Chỉ (Nhẫn)
- Thiên Tứ (5 món): Vô Gian ỷ Thiên Kiếm (Vũ khí) · Vô Gian Thanh Phong Nhuyễn Lý (Giày) · Vô Gian Phật Vân Ti Đái (Đai) · Vô Gian Cầm Vận Hộ Uyển (Hộ uyển) · Vô Gian Bạch Ngọc Bàn Chỉ (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Vô Gian Thanh Phong Truy Y, Vô Gian Phất Vân Ti đái; chỉ Thiên Tứ có Vô Gian Thanh Phong Nhuyễn Lý, Vô Gian Phật Vân Ti Đái.

##### Hoàng kim — bộ Vô Gian

###### Vô Gian ỷ Thiên Kiếm — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×3 · `goldequip.txt` dòng 31
- Yêu cầu: cấp 99, Sức mạnh 110, môn phái Nga My
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 86 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm |
| 5 | hiện | Hút nội lực: +4–8% |
| 6 | ẩn | Kỹ năng [Phật Pháp Vô Biên]: +1–3 cấp |

###### Vô Gian Thanh Phong Truy Y — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 32
- Yêu cầu: cấp 90, Sức mạnh 260, môn phái Nga My
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Nga Mi Kiếm pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Vô Gian Phất Vân Ti đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 33
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Nga My
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Nhất Diệp Tri Thu]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Tấn công chí mạng: 3–5% |

###### Vô Gian Cầm Vận Hộ Uyển — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 34
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Tam Nga Tề Tuyết]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–50% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thôi Song Vọng Nguyệt]: +1–3 cấp |

###### Vô Gian Bạch Ngọc Bàn Chỉ — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 35
- Yêu cầu: cấp 80, môn phái Nga My
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Vô Gian

###### [Thiên Tứ] Vô Gian ỷ Thiên Kiếm — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×3 · `platinaequip.txt` dòng 31
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Nga My
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 86 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 5 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 6 | ẩn | Kỹ năng [Phật Pháp Vô Biên]: +1–3 cấp | Kỹ năng [Phật Pháp Vô Biên]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Vô Gian Thanh Phong Nhuyễn Lý — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 32
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Nga My
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Nga Mi Kiếm pháp]: +1–3 cấp | Kỹ năng [Nga Mi Kiếm pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Tam Nga Tề Tuyết]: +1 cấp; +6: 95% Kỹ năng [Tam Nga Tề Tuyết]: +1 cấp / 5% Kỹ năng [Tam Nga Tề Tuyết]: +2 cấp; +7: 100% Kỹ năng [Tam Nga Tề Tuyết]: +2 cấp; +8: 100% Kỹ năng [Tam Nga Tề Tuyết]: +2 cấp; +9: 100% Kỹ năng [Tam Nga Tề Tuyết]: +3 cấp

###### [Thiên Tứ] Vô Gian Phật Vân Ti Đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 33
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Nga My
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Nhất Diệp Tri Thu]: +1–3 cấp | Kỹ năng [Nhất Diệp Tri Thu]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Tấn công chí mạng: 3–5% | Tấn công chí mạng: 5–7% |

- Kỹ năng ở +6: #786 白金峨嵋剑1: Điểm phục hồi sinh lực [Từ Hàng Phổ Độ] +300 điểm
- Kỹ năng ở +10: #818 白金峨嵋剑2: Kỹ năng [Tam Nga Tề Tuyết]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Tam Nga Tề Tuyết]: +1 cấp; +6: 95% Kỹ năng [Tam Nga Tề Tuyết]: +1 cấp / 5% Kỹ năng [Tam Nga Tề Tuyết]: +2 cấp; +7: 100% Kỹ năng [Tam Nga Tề Tuyết]: +2 cấp; +8: 100% Kỹ năng [Tam Nga Tề Tuyết]: +2 cấp; +9: 100% Kỹ năng [Tam Nga Tề Tuyết]: +3 cấp

###### [Thiên Tứ] Vô Gian Cầm Vận Hộ Uyển — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 34
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kỹ năng [Tam Nga Tề Tuyết]: +1–3 cấp | Kỹ năng [Tam Nga Tề Tuyết]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–50% | Thời gian làm chậm: -40–60% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Thôi Song Vọng Nguyệt]: +1–3 cấp | Kỹ năng [Thôi Song Vọng Nguyệt]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #862 白金峨嵋剑3: Kỹ năng [Tam Nga Tề Tuyết]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bất Diệt Bất Tuyệt]: +1 cấp; +6: 95% Kỹ năng [Bất Diệt Bất Tuyệt]: +1 cấp / 5% Kỹ năng [Bất Diệt Bất Tuyệt]: +2 cấp; +7: 100% Kỹ năng [Bất Diệt Bất Tuyệt]: +2 cấp; +8: 100% Kỹ năng [Bất Diệt Bất Tuyệt]: +2 cấp; +9: 100% Kỹ năng [Bất Diệt Bất Tuyệt]: +3 cấp

###### [Thiên Tứ] Vô Gian Bạch Ngọc Bàn Chỉ — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 35
- Yêu cầu: cấp 120, môn phái Nga My
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng lôi: +5% | Kháng lôi: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thôi Song Vọng Nguyệt]: +1 cấp; +6: 95% Kỹ năng [Thôi Song Vọng Nguyệt]: +1 cấp / 5% Kỹ năng [Thôi Song Vọng Nguyệt]: +2 cấp; +7: 100% Kỹ năng [Thôi Song Vọng Nguyệt]: +2 cấp; +8: 100% Kỹ năng [Thôi Song Vọng Nguyệt]: +2 cấp; +9: 100% Kỹ năng [Thôi Song Vọng Nguyệt]: +3 cấp

#### Bộ Vô Ma (số bộ 8)

- Hoàng kim (5 món): Vô Ma Ma Ni quán (Nón) · Vô Ma Tử Khâm Cà Sa (Áo) · Vô Ma Băng Tinh Chỉ Hoàn (Nhẫn) · Vô Ma Tẩy Tượng Ngọc Khấu (Ngọc bội) · Vô Ma Hồng Truy Nhuyễn Tháp hài (Giày)
- Thiên Tứ (5 món): Vô Ma Ma Ni Quán (Nón) · Vô Ma Thu Thủy Lưu Quang Đái (Đai) · Vô Ma Băng Tinh Chỉ Hoàn (Nhẫn) · Vô Ma Tẩy Tượng Ngọc Khấu (Ngọc bội) · Vô Ma Hồng Truy Nhuyễn Tháp Hài (Giày)
- Khác món giữa hai bản: chỉ hoàng kim có Vô Ma Tử Khâm Cà Sa; chỉ Thiên Tứ có Vô Ma Thu Thủy Lưu Quang Đái.

##### Hoàng kim — bộ Vô Ma

###### Vô Ma Ma Ni quán — Nón

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 36
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Phòng thủ vật lý: +25–30% |
| 3 | hiện | Thời gian trúng độc: -30–50% |
| 4 | ẩn | Thời gian làm chậm: -40–50% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Băng sát - nội công: +80–120 điểm |

###### Vô Ma Tử Khâm Cà Sa — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 37
- Yêu cầu: cấp 90, Sức mạnh 135, môn phái Nga My
- Cơ bản: Né tránh: 630 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Vô Ma Băng Tinh Chỉ Hoàn — Nhẫn

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 38
- Yêu cầu: cấp 80, môn phái Nga My
- Cơ bản: Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Vô Ma Tẩy Tượng Ngọc Khấu — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 39
- Yêu cầu: cấp 95, môn phái Nga My
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Sinh khí: -15 điểm → Sinh khí: +5 điểm |
| 4 | ẩn | Băng sát - nội công: +120–200 điểm |
| 5 | hiện | Kỹ năng [Nga Mi Chưởng pháp]: +1–3 cấp |
| 6 | ẩn | Kỹ năng [Phật Quang Phổ Chiếu]: +1–3 cấp |

###### Vô Ma Hồng Truy Nhuyễn Tháp hài — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 40
- Yêu cầu: cấp 99, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% |
| 3 | hiện | Kỹ năng [Tứ Tượng Đồng Quy]: +1–3 cấp |
| 4 | ẩn | Kháng lôi: +25–30% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kỹ năng [Phong Sương Toái ảnh]: +1–3 cấp |

##### Thiên Tứ — bộ Vô Ma

###### [Thiên Tứ] Vô Ma Ma Ni Quán — Nón

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 36
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 3 | hiện | Thời gian trúng độc: -30–50% | Thời gian trúng độc: -40–60% |
| 4 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Băng sát - nội công: +80–120 điểm | Băng sát - nội công: +150–200 điểm |

- Kỹ năng ở +6: #787 白金峨嵋掌1: Điểm phục hồi sinh lực [Từ Hàng Phổ Độ] +300 điểm
- Kỹ năng ở +10: #819 白金峨嵋掌2: Kỹ năng [Phong Sương Toái ảnh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phong Sương Toái ảnh]: +1 cấp; +6: 95% Kỹ năng [Phong Sương Toái ảnh]: +1 cấp / 5% Kỹ năng [Phong Sương Toái ảnh]: +2 cấp; +7: 100% Kỹ năng [Phong Sương Toái ảnh]: +2 cấp; +8: 100% Kỹ năng [Phong Sương Toái ảnh]: +2 cấp; +9: 100% Kỹ năng [Phong Sương Toái ảnh]: +3 cấp

###### [Thiên Tứ] Vô Ma Thu Thủy Lưu Quang Đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 37
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Nga My
- Cơ bản: Né tránh: 630 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phong Sương Toái ảnh]: +1 cấp; +6: 95% Kỹ năng [Phong Sương Toái ảnh]: +1 cấp / 5% Kỹ năng [Phong Sương Toái ảnh]: +2 cấp; +7: 100% Kỹ năng [Phong Sương Toái ảnh]: +2 cấp; +8: 100% Kỹ năng [Phong Sương Toái ảnh]: +2 cấp; +9: 100% Kỹ năng [Phong Sương Toái ảnh]: +3 cấp

###### [Thiên Tứ] Vô Ma Băng Tinh Chỉ Hoàn — Nhẫn

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 38
- Yêu cầu: cấp 120, môn phái Nga My
- Cơ bản: Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng lôi: +5% | Kháng lôi: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Băng sát - nội công: +120 điểm; +6: 95% Băng sát - nội công: +120 điểm / 5% Băng sát - nội công: +200 điểm; +7: 100% Băng sát - nội công: +200 điểm; +8: 100% Băng sát - nội công: +200 điểm; +9: 100% Băng sát - nội công: +300 điểm

###### [Thiên Tứ] Vô Ma Tẩy Tượng Ngọc Khấu — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 39
- Yêu cầu: cấp 120, môn phái Nga My
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Băng sát - nội công: +120–200 điểm | Băng sát - nội công: +350–400 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Sinh khí: -15 điểm → Sinh khí: +5 điểm | Sinh khí: +20–30 điểm |
| 4 | ẩn | Kháng độc: +20–25% | Kháng độc: +25–30% |
| 5 | hiện | Kỹ năng [Nga Mi Chưởng pháp]: +1–3 cấp | Kỹ năng [Nga Mi Chưởng pháp]: +1–3 cấp |
| 6 | ẩn | Kỹ năng [Phật Quang Phổ Chiếu]: +1–3 cấp | Kỹ năng [Phật Quang Phổ Chiếu]: +1–3 cấp |

- Kỹ năng ở +6: #769 白金内冰1: Băng sát - nội công: +70 điểm
- Kỹ năng ở +10: #801 白金内冰3: Băng sát - nội công: +120 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Băng sát - nội công: +70 điểm / 5% Băng sát - nội công: +150 điểm; +6: 50% Băng sát - nội công: +70 điểm / 50% Băng sát - nội công: +150 điểm; +7: 100% Băng sát - nội công: +150 điểm; +8: 50% Băng sát - nội công: +150 điểm / 50% Băng sát - nội công: +250 điểm; +9: 100% Băng sát - nội công: +250 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Tứ Tượng Đồng Quy]: +1 cấp; +6: 95% Kỹ năng [Tứ Tượng Đồng Quy]: +1 cấp / 5% Kỹ năng [Tứ Tượng Đồng Quy]: +2 cấp; +7: 100% Kỹ năng [Tứ Tượng Đồng Quy]: +2 cấp; +8: 100% Kỹ năng [Tứ Tượng Đồng Quy]: +2 cấp; +9: 100% Kỹ năng [Tứ Tượng Đồng Quy]: +3 cấp

###### [Thiên Tứ] Vô Ma Hồng Truy Nhuyễn Tháp Hài — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 40
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Băng sát - nội công: +120–200 điểm | Băng sát - nội công: +240–300 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% | Tốc độ di chuyển: +50–70% |
| 3 | hiện | Kỹ năng [Tứ Tượng Đồng Quy]: +1–3 cấp | Kỹ năng [Tứ Tượng Đồng Quy]: +1–3 cấp |
| 4 | ẩn | Kháng lôi: +25–30% | Kháng lôi: +30–35% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +500–600 điểm |
| 6 | ẩn | Kỹ năng [Phong Sương Toái ảnh]: +1–3 cấp | Kỹ năng [Phong Sương Toái ảnh]: +1–3 cấp |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #863 白金峨嵋掌3: Kỹ năng [Phong Sương Toái ảnh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phật Quang Phổ Chiếu]: +1 cấp; +6: 95% Kỹ năng [Phật Quang Phổ Chiếu]: +1 cấp / 5% Kỹ năng [Phật Quang Phổ Chiếu]: +2 cấp; +7: 100% Kỹ năng [Phật Quang Phổ Chiếu]: +2 cấp; +8: 100% Kỹ năng [Phật Quang Phổ Chiếu]: +2 cấp; +9: 100% Kỹ năng [Phật Quang Phổ Chiếu]: +3 cấp

#### Bộ Vô Trần (số bộ 9)

- Hoàng kim (5 món): Vô Trần Ngọc Nữ Tố Tâm quán (Nón) · Vô Trần Thanh Tâm Hướng Thiện Châu (Dây chuyền) · Vô Trần Từ Bi Ngọc Ban Chỉ (Nhẫn) · Vô Trần Phật Tâm Từ Hữu Yêu Phối (Ngọc bội) · Vô Trần Phật Quang Chỉ Hoàn (Nhẫn)
- Thiên Tứ (5 món): Vô Trần Ngọc Nữ Tố Tâm Quán (Nón) · Vô Trần Thanh Tâm Hướng Thiện Châu (Dây chuyền) · Vô Trần Từ Bi Ngọc Ban Chỉ (Nhẫn) · Vô Trần Phật Tâm Từ Hữu Yêu Phối (Ngọc bội) · Vô Trần Phật Quang Chỉ Hoàn (Nhẫn)

##### Hoàng kim — bộ Vô Trần

###### Vô Trần Ngọc Nữ Tố Tâm quán — Nón

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 41
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Lưu Thủy]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% |

###### Vô Trần Thanh Tâm Hướng Thiện Châu — Dây chuyền

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 42
- Yêu cầu: cấp 99, môn phái Nga My
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng lôi: +25–30% |
| 3 | hiện | Kỹ năng [Mộng Điệp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% |

###### Vô Trần Từ Bi Ngọc Ban Chỉ — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 43
- Yêu cầu: cấp 80, môn phái Nga My
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Vô Trần Phật Tâm Từ Hữu Yêu Phối — Ngọc bội

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 44
- Yêu cầu: cấp 95, môn phái Nga My
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Kỹ năng [Phật Tâm Từ Hữu]: +1–3 cấp |
| 3 | hiện | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kỹ năng [Phổ Độ Chúng Sinh]: +1–3 cấp |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Vô Trần Phật Quang Chỉ Hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 45
- Yêu cầu: cấp 85, môn phái Nga My
- Cơ bản: Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng lôi: +30–35% |
| 3 | hiện | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kỹ năng [Từ Hàng Phổ D]: +1–3 cấp |
| 5 | hiện | Thời gian choáng: -30–40% |
| 6 | ẩn | Chuyển hóa sát thương thành nội lực: +8–12% |

##### Thiên Tứ — bộ Vô Trần

###### [Thiên Tứ] Vô Trần Ngọc Nữ Tố Tâm Quán — Nón

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 41
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Nga My
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Lưu Thủy]: +1–3 cấp | Kỹ năng [Lưu Thủy]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm | Nội lực tối đa: +200–300 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% | Thời gian trúng độc: -30–50% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Vô Trần Thanh Tâm Hướng Thiện Châu — Dây chuyền

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 42
- Yêu cầu: cấp 120, môn phái Nga My
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng lôi: +25–30% | Kháng lôi: +25–30% |
| 3 | hiện | Kỹ năng [Mộng Điệp]: +1–3 cấp | Kỹ năng [Mộng Điệp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Vô Trần Từ Bi Ngọc Ban Chỉ — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 43
- Yêu cầu: cấp 120, môn phái Nga My
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng lôi: +5% | Kháng lôi: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #883 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #882 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Lưu Thủy]: +1 cấp; +6: 95% Kỹ năng [Lưu Thủy]: +1 cấp / 5% Kỹ năng [Lưu Thủy]: +2 cấp; +7: 100% Kỹ năng [Lưu Thủy]: +2 cấp; +8: 100% Kỹ năng [Lưu Thủy]: +2 cấp; +9: 100% Kỹ năng [Lưu Thủy]: +3 cấp

###### [Thiên Tứ] Vô Trần Phật Tâm Từ Hữu Yêu Phối — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 44
- Yêu cầu: cấp 120, môn phái Nga My
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Kỹ năng [Phật Tâm Từ Hữu]: +1–3 cấp | Kỹ năng [Phật Tâm Từ Hữu]: +1–3 cấp |
| 3 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kỹ năng [Phổ Độ Chúng Sinh]: +1–3 cấp | Kỹ năng [Phổ Độ Chúng Sinh]: +1–3 cấp |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Vô Trần Phật Quang Chỉ Hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 45
- Yêu cầu: cấp 120, môn phái Nga My
- Cơ bản: Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng lôi: +30–35% | Kháng lôi: +30–35% |
| 3 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kỹ năng [Từ Hàng Phổ D]: +1–3 cấp | Kỹ năng [Từ Hàng Phổ D]: +1–3 cấp |
| 5 | hiện | Thời gian choáng: -30–40% | Thời gian choáng: -30–40% |
| 6 | ẩn | Chuyển hóa sát thương thành nội lực: +8–12% | Chuyển hóa sát thương thành nội lực: +8–12% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

### Thúy Yên

#### Bộ Tê Hoàng (số bộ 10)

- Hoàng kim (5 món): Tê Hoàng Phụng Nghi đao (Vũ khí) · Tê Hoàng Tuệ Tâm Khinh Sa Y (Áo) · Tê Hoàng Phong Tuyết Bạch Vân Thúc Đái (Đai) · Tê Hoàng Băng Tung Cẩm uyển (Hộ uyển) · Tê Hoàng Thúy Ngọc Chỉ Hoàn (Nhẫn)
- Thiên Tứ (5 món): Tê Hoàng Phụng Nghi Đao (Vũ khí) · Tê Hoàng Tuệ Tâm Khinh Sa Y (Ngọc bội) · Tê Hoàng Phong Tuyết Bạch Vân Thúc Đái (Đai) · Tê Hoàng Băng Tung Cẩm Uyên (Hộ uyển) · Tê Hoàng Thúy Ngọc Chỉ Hoàn (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Tê Hoàng Băng Tung Cẩm uyển; chỉ Thiên Tứ có Tê Hoàng Băng Tung Cẩm Uyên.

##### Hoàng kim — bộ Tê Hoàng

###### Tê Hoàng Phụng Nghi đao — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 46
- Yêu cầu: cấp 99, Sức mạnh 135, môn phái Thúy Yên
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm |
| 5 | hiện | Hút nội lực: +4–8% |
| 6 | ẩn | Kỹ năng [Băng Cốt Tuyết Tâm]: +1–3 cấp |

###### Tê Hoàng Tuệ Tâm Khinh Sa Y — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 47
- Yêu cầu: cấp 90, Sức mạnh 260, môn phái Thúy Yên
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Vũ Đả Lê Hoa]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Tê Hoàng Phong Tuyết Bạch Vân Thúc Đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 48
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thúy Yên
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Phong Hoa Tuyết Nguyệt]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Tấn công chí mạng: 5–8% |

###### Tê Hoàng Băng Tung Cẩm uyển — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 49
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Thúy Yên
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Băng Tung Vô ảnh]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–50% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thúy Yên Đao pháp]: +1–3 cấp |

###### Tê Hoàng Thúy Ngọc Chỉ Hoàn — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 50
- Yêu cầu: cấp 80, môn phái Thúy Yên
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Tê Hoàng

###### [Thiên Tứ] Tê Hoàng Phụng Nghi Đao — Vũ khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 46
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thúy Yên
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 5 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 6 | ẩn | Kỹ năng [Băng Cốt Tuyết Tâm]: +1–3 cấp | Kỹ năng [Băng Cốt Tuyết Tâm]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 40% / 5% Sát thương vật lý: 50%; +6: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +7: 100% Sát thương vật lý: 50%; +8: 50% Sát thương vật lý: 50% / 50% Sát thương vật lý: 60%; +9: 100% Sát thương vật lý: 60%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Tê Hoàng Tuệ Tâm Khinh Sa Y — Ngọc bội (bản hoàng kim cùng tên là Áo — bảng mod lệch ô 🟡)

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 47
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Thúy Yên
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Vũ Đả Lê Hoa]: +1–3 cấp | Kỹ năng [Vũ Đả Lê Hoa]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Băng Tung Vô ảnh]: +1 cấp; +6: 95% Kỹ năng [Băng Tung Vô ảnh]: +1 cấp / 5% Kỹ năng [Băng Tung Vô ảnh]: +2 cấp; +7: 100% Kỹ năng [Băng Tung Vô ảnh]: +2 cấp; +8: 100% Kỹ năng [Băng Tung Vô ảnh]: +2 cấp; +9: 100% Kỹ năng [Băng Tung Vô ảnh]: +3 cấp

###### [Thiên Tứ] Tê Hoàng Phong Tuyết Bạch Vân Thúc Đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 48
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thúy Yên
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Phong Hoa Tuyết Nguyệt]: +1–3 cấp | Kỹ năng [Phong Hoa Tuyết Nguyệt]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Phản đòn tầm xa: +9–12% | Phản đòn cận chiến: +16–20 điểm |

- Kỹ năng ở +6: #788 白金翠烟外1: Giảm [Ngự Tuyết ẩn] thời gian xuất chiêu: 5 giây
- Kỹ năng ở +10: #820 白金翠烟外2: Kỹ năng [Băng Tung Vô ảnh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Băng Tung Vô ảnh]: +1 cấp; +6: 95% Kỹ năng [Băng Tung Vô ảnh]: +1 cấp / 5% Kỹ năng [Băng Tung Vô ảnh]: +2 cấp; +7: 100% Kỹ năng [Băng Tung Vô ảnh]: +2 cấp; +8: 100% Kỹ năng [Băng Tung Vô ảnh]: +2 cấp; +9: 100% Kỹ năng [Băng Tung Vô ảnh]: +3 cấp

###### [Thiên Tứ] Tê Hoàng Băng Tung Cẩm Uyên — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 49
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thúy Yên
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kỹ năng [Băng Tung Vô ảnh]: +1–3 cấp | Kỹ năng [Băng Tung Vô ảnh]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–50% | Thời gian làm chậm: -40–60% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Thúy Yên Đao pháp]: +1–3 cấp | Kỹ năng [Thúy Yên Đao pháp]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #864 白金翠烟外3: Kỹ năng [Băng Tung Vô ảnh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Mục Dã Lưu Tinh]: +1 cấp; +6: 95% Kỹ năng [Mục Dã Lưu Tinh]: +1 cấp / 5% Kỹ năng [Mục Dã Lưu Tinh]: +2 cấp; +7: 100% Kỹ năng [Mục Dã Lưu Tinh]: +2 cấp; +8: 100% Kỹ năng [Mục Dã Lưu Tinh]: +2 cấp; +9: 100% Kỹ năng [Mục Dã Lưu Tinh]: +3 cấp

###### [Thiên Tứ] Tê Hoàng Thúy Ngọc Chỉ Hoàn — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 50
- Yêu cầu: cấp 120, môn phái Thúy Yên
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng lôi: +5% | Kháng lôi: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Vũ Đả Lê Hoa]: +1 cấp; +6: 95% Kỹ năng [Vũ Đả Lê Hoa]: +1 cấp / 5% Kỹ năng [Vũ Đả Lê Hoa]: +2 cấp; +7: 100% Kỹ năng [Vũ Đả Lê Hoa]: +2 cấp; +8: 100% Kỹ năng [Vũ Đả Lê Hoa]: +2 cấp; +9: 100% Kỹ năng [Vũ Đả Lê Hoa]: +3 cấp

#### Bộ Bích Hải (số bộ 11)

- Hoàng kim (5 món): Bích Hải Uyên Ương Liên Hoàn đao (Vũ khí) · Bích Hải Hoàn Châu Vũ Liên (Dây chuyền) · Bích Hải Hồng Linh Kim Ti đái (Đai) · Bích Hải Hồng Lăng Ba (Ngọc bội) · Bích Hải Khiên Tế Chỉ hoàn (Nhẫn)
- Thiên Tứ (5 món): Bích Hải Uyên Ương Liên Hoàn Đao (Vũ khí) · Bích Hải Hoàn Châu Vũ Liên (Nón) · Bích Hải Hồng Linh Kim Ti Đái (Đai) · Bích Hải Hồng Lăng Ba (Ngọc bội) · Bích Hải Tiêm Tế Chỉ Hoàn (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Bích Hải Khiên Tế Chỉ hoàn; chỉ Thiên Tứ có Bích Hải Tiêm Tế Chỉ Hoàn.

##### Hoàng kim — bộ Bích Hải

###### Bích Hải Uyên Ương Liên Hoàn đao — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 51
- Yêu cầu: cấp 99, Sức mạnh 160, môn phái Thúy Yên
- Cơ bản: Sát thương nhỏ nhất: 62 điểm · Sát thương lớn nhất: 92 điểm · Tỉ lệ công kích chính xác: +20% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Kỹ năng [Thúy Yên Song đao]: +1–3 cấp |
| 4 | ẩn | Băng sát - nội công: +200–300 điểm |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kỹ năng [Băng Cốt Tuyết Tâm]: +1–3 cấp |

###### Bích Hải Hoàn Châu Vũ Liên — Dây chuyền

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 52
- Yêu cầu: cấp 95, môn phái Thúy Yên
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Phòng thủ vật lý: +15–25% |
| 3 | hiện | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kháng tất cả: +16–24% |
| 5 | hiện | Kháng lôi: +25–30% |
| 6 | ẩn | Kỹ năng [Phù Vân Tán Tuyết]: +1–3 cấp |

###### Bích Hải Hồng Linh Kim Ti đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 53
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Thúy Yên
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Phong Quyển Tàn Tuyết]: +1–3 cấp |
| 4 | ẩn | Kháng lôi: +30–35% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm |
| 6 | ẩn | Kỹ năng [Băng Tâm Tiên Tử]: +1–3 cấp |

###### Bích Hải Hồng Lăng Ba — Ngọc bội

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 54
- Yêu cầu: cấp 85, môn phái Thúy Yên
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Phản đòn tầm xa: +8–12% |
| 3 | hiện | Nội lực tối đa: +300–400 điểm |
| 4 | ẩn | Thời gian phục hồi: -35–50 |
| 5 | hiện | Kháng hỏa: -5% → Kháng hỏa: +5% |
| 6 | ẩn | Kỹ năng [Tuyết ảnh]: +1–3 cấp |

###### Bích Hải Khiên Tế Chỉ hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 55
- Yêu cầu: cấp 80, môn phái Thúy Yên
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Bích Hải

###### [Thiên Tứ] Bích Hải Uyên Ương Liên Hoàn Đao — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 51
- Yêu cầu: cấp 120, Sức mạnh 160, môn phái Thúy Yên
- Cơ bản: Sát thương nhỏ nhất: 62 điểm · Sát thương lớn nhất: 92 điểm · Tỉ lệ công kích chính xác: +20% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +500–600 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Kỹ năng [Thúy Yên Song đao]: +1–3 cấp | Kỹ năng [Thúy Yên Song đao]: +1–3 cấp |
| 4 | ẩn | Băng sát - nội công: +200–300 điểm | Băng sát - nội công: +700–800 điểm |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +500–600 điểm |
| 6 | ẩn | Kỹ năng [Băng Cốt Tuyết Tâm]: +1–3 cấp | Kỹ năng [Băng Cốt Tuyết Tâm]: +1–3 cấp |

- Kỹ năng ở +6: #770 白金内冰2: Băng sát - nội công: +100 điểm
- Kỹ năng ở +10: #802 白金内冰4: Băng sát - nội công: +200 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Băng sát - nội công: +200 điểm / 5% Băng sát - nội công: +300 điểm; +6: 50% Băng sát - nội công: +200 điểm / 50% Băng sát - nội công: +300 điểm; +7: 100% Băng sát - nội công: +300 điểm; +8: 50% Băng sát - nội công: +300 điểm / 50% Băng sát - nội công: +400 điểm; +9: 100% Băng sát - nội công: +400 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Băng sát - nội công: +400 điểm; +6: 95% Băng sát - nội công: +400 điểm / 5% Băng sát - nội công: +500 điểm; +7: 100% Băng sát - nội công: +500 điểm; +8: 100% Băng sát - nội công: +500 điểm; +9: 100% Băng sát - nội công: +600 điểm

###### [Thiên Tứ] Bích Hải Hoàn Châu Vũ Liên — Nón (bản hoàng kim cùng tên là Dây chuyền — bảng mod lệch ô 🟡)

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 52
- Yêu cầu: cấp 120, môn phái Thúy Yên
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +15–25% |
| 3 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |
| 5 | hiện | Kháng lôi: +25–30% | Kháng lôi: +25–30% |
| 6 | ẩn | Kỹ năng [Phù Vân Tán Tuyết]: +1–3 cấp | Kỹ năng [Phù Vân Tán Tuyết]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Băng Tâm Tiên Tử]: +1 cấp; +6: 95% Kỹ năng [Băng Tâm Tiên Tử]: +1 cấp / 5% Kỹ năng [Băng Tâm Tiên Tử]: +2 cấp; +7: 100% Kỹ năng [Băng Tâm Tiên Tử]: +2 cấp; +8: 100% Kỹ năng [Băng Tâm Tiên Tử]: +2 cấp; +9: 100% Kỹ năng [Băng Tâm Tiên Tử]: +3 cấp

###### [Thiên Tứ] Bích Hải Hồng Linh Kim Ti Đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 53
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thúy Yên
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Phong Quyển Tàn Tuyết]: +1–3 cấp | Kỹ năng [Phong Quyển Tàn Tuyết]: +1–3 cấp |
| 4 | ẩn | Kháng lôi: +30–35% | Kháng lôi: +35–40% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kỹ năng [Băng Tâm Tiên Tử]: +1–3 cấp | Kỹ năng [Băng Tâm Tiên Tử]: +1–3 cấp |

- Kỹ năng ở +6: #789 白金翠烟内1: Giảm [Ngự Tuyết ẩn] thời gian xuất chiêu: 5 giây
- Kỹ năng ở +10: #821 白金翠烟内2: Kỹ năng [Băng Tâm Tiên Tử]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bích Hải Triều Sinh]: +1 cấp; +6: 95% Kỹ năng [Bích Hải Triều Sinh]: +1 cấp / 5% Kỹ năng [Bích Hải Triều Sinh]: +2 cấp; +7: 100% Kỹ năng [Bích Hải Triều Sinh]: +2 cấp; +8: 100% Kỹ năng [Bích Hải Triều Sinh]: +2 cấp; +9: 100% Kỹ năng [Bích Hải Triều Sinh]: +3 cấp

###### [Thiên Tứ] Bích Hải Hồng Lăng Ba — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 54
- Yêu cầu: cấp 120, môn phái Thúy Yên
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Băng sát - nội công: +120–200 điểm | Băng sát - nội công: +350–400 điểm |
| 2 | ẩn | Phản đòn tầm xa: +8–12% | Phản đòn cận chiến: +16–20 điểm |
| 3 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 4 | ẩn | Thời gian phục hồi: -35–50 | Thời gian phục hồi: -35–50 |
| 5 | hiện | Kháng độc: +20–25% | Kháng độc: +25–30% |
| 6 | ẩn | Kỹ năng [Tuyết ảnh]: +1–3 cấp | Kỹ năng [Tuyết ảnh]: +1–3 cấp |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #865 白金翠烟内3: Kỹ năng [Băng Tâm Tiên Tử]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Băng Tâm Tiên Tử]: +1 cấp; +6: 95% Kỹ năng [Băng Tâm Tiên Tử]: +1 cấp / 5% Kỹ năng [Băng Tâm Tiên Tử]: +2 cấp; +7: 100% Kỹ năng [Băng Tâm Tiên Tử]: +2 cấp; +8: 100% Kỹ năng [Băng Tâm Tiên Tử]: +2 cấp; +9: 100% Kỹ năng [Băng Tâm Tiên Tử]: +3 cấp

###### [Thiên Tứ] Bích Hải Tiêm Tế Chỉ Hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 55
- Yêu cầu: cấp 120, môn phái Thúy Yên
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng lôi: +5% | Kháng lôi: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phù Vân Tán Tuyết]: +1 cấp; +6: 95% Kỹ năng [Phù Vân Tán Tuyết]: +1 cấp / 5% Kỹ năng [Phù Vân Tán Tuyết]: +2 cấp; +7: 100% Kỹ năng [Phù Vân Tán Tuyết]: +2 cấp; +8: 100% Kỹ năng [Phù Vân Tán Tuyết]: +2 cấp; +9: 100% Kỹ năng [Phù Vân Tán Tuyết]: +3 cấp

### Ngũ Độc

#### Bộ U Lung (số bộ 12)

- Hoàng kim (5 món): U Lung Kim Xà Phát đái (Nón) · U Lung Xích Yết Mật trang (Áo) · U Lung Thanh Ngô Triền yêu (Đai) · U Lung Ngân Thềm Hộ Uyển (Hộ uyển) · U Lung Mặc Thù Nhuyễn Lý (Giày)
- Thiên Tứ (5 món): U Lung Kim Xà Phát Đái (Nón) · U Lung Xích Yết Mật Trang (Áo) · U Lung Thanh Ngô Triền Yêu (Đai) · U Lung Ngân Thiềm Hộ Uyển (Hộ uyển) · U Lung Mặc Thù Nhuyễn Lý (Giày)
- Khác món giữa hai bản: chỉ hoàng kim có U Lung Ngân Thềm Hộ Uyển; chỉ Thiên Tứ có U Lung Ngân Thiềm Hộ Uyển.

##### Hoàng kim — bộ U Lung

###### U Lung Kim Xà Phát đái — Nón

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 56
- Yêu cầu: cấp 99, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +10–20% |
| 3 | hiện | Kỹ năng [Vô Hình Độc]: +1–3 cấp |
| 4 | ẩn | Độc sát - nội công: +20–30 điểm/lần |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Ngũ Độc Kỳ Kinh]: +1–3 cấp |

###### U Lung Xích Yết Mật trang — Áo

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 57
- Yêu cầu: cấp 90, Sức mạnh 135, môn phái Ngũ Độc
- Cơ bản: Né tránh: 630 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–60 |
| 3 | hiện | Kỹ năng [Ngũ Độc Chưởng Pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Âm Phong Thực Cốt]: +1–3 cấp |

###### U Lung Thanh Ngô Triền yêu — Đai

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 58
- Yêu cầu: cấp 80, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Độc Sa chưởng]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% |

###### U Lung Ngân Thềm Hộ Uyển — Hộ uyển

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 59
- Yêu cầu: cấp 95, Sức mạnh 90, môn phái Ngũ Độc
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### U Lung Mặc Thù Nhuyễn Lý — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 60
- Yêu cầu: cấp 85, Sức mạnh 50, môn phái Ngũ Độc
- Cơ bản: Né tránh: 140 điểm · Độ bền: 60 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Thời gian độc phát: -10–20% |
| 3 | hiện | Sinh khí: +30–40 điểm |
| 4 | ẩn | Tốc độ di chuyển: +35–50% |
| 5 | hiện | Kháng lôi: -5% → Kháng lôi: +5% |
| 6 | ẩn | Kỹ năng [Vạn Độc Thực Tâm]: +1–3 cấp |

##### Thiên Tứ — bộ U Lung

###### [Thiên Tứ] U Lung Kim Xà Phát Đái — Nón

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 56
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +10–20% | Tốc độ đánh - nội công: +10–20% |
| 3 | hiện | Kỹ năng [Vô Hình Độc]: +1–3 cấp | Kỹ năng [Vô Hình Độc]: +1–3 cấp |
| 4 | ẩn | Độc sát - nội công: +20–30 điểm/lần | Độc sát - nội công: +25–35 điểm/lần |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Ngũ Độc Kỳ Kinh]: +1–3 cấp | Kỹ năng [Ngũ Độc Kỳ Kinh]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #861 白金五毒掌3: Kỹ năng [Âm Phong Thực Cốt]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Âm Phong Thực Cốt]: +1 cấp; +6: 95% Kỹ năng [Âm Phong Thực Cốt]: +1 cấp / 5% Kỹ năng [Âm Phong Thực Cốt]: +2 cấp; +7: 100% Kỹ năng [Âm Phong Thực Cốt]: +2 cấp; +8: 100% Kỹ năng [Âm Phong Thực Cốt]: +2 cấp; +9: 100% Kỹ năng [Âm Phong Thực Cốt]: +3 cấp

###### [Thiên Tứ] U Lung Xích Yết Mật Trang — Áo

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 57
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Ngũ Độc
- Cơ bản: Né tránh: 630 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–60 | Thời gian phục hồi: -40–60 |
| 3 | hiện | Kỹ năng [Ngũ Độc Chưởng Pháp]: +1–3 cấp | Kỹ năng [Ngũ Độc Chưởng Pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Âm Phong Thực Cốt]: +1–3 cấp | Kỹ năng [Âm Phong Thực Cốt]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Âm Phong Thực Cốt]: +1 cấp; +6: 95% Kỹ năng [Âm Phong Thực Cốt]: +1 cấp / 5% Kỹ năng [Âm Phong Thực Cốt]: +2 cấp; +7: 100% Kỹ năng [Âm Phong Thực Cốt]: +2 cấp; +8: 100% Kỹ năng [Âm Phong Thực Cốt]: +2 cấp; +9: 100% Kỹ năng [Âm Phong Thực Cốt]: +3 cấp

###### [Thiên Tứ] U Lung Thanh Ngô Triền Yêu — Đai

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 58
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Độc Sa chưởng]: +1–3 cấp | Kỹ năng [Độc Sa chưởng]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% | Thời gian choáng: -40–60% |

- Kỹ năng ở +6: #785 白金五毒掌1: Xác suất phát chiêu [Hấp Tinh Yểm] +5%
- Kỹ năng ở +10: #817 白金五毒掌2: Kỹ năng [Âm Phong Thực Cốt]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Cương Địa Sát]: +1 cấp; +6: 95% Kỹ năng [Thiên Cương Địa Sát]: +1 cấp / 5% Kỹ năng [Thiên Cương Địa Sát]: +2 cấp; +7: 100% Kỹ năng [Thiên Cương Địa Sát]: +2 cấp; +8: 100% Kỹ năng [Thiên Cương Địa Sát]: +2 cấp; +9: 100% Kỹ năng [Thiên Cương Địa Sát]: +3 cấp

###### [Thiên Tứ] U Lung Ngân Thiềm Hộ Uyển — Hộ uyển

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 59
- Yêu cầu: cấp 120, Sức mạnh 90, môn phái Ngũ Độc
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Phòng thủ vật lý: +5% | Phòng thủ vật lý: +17% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Độc sát - nội công: +10 điểm/lần / 5% Độc sát - nội công: +20 điểm/lần; +6: 50% Độc sát - nội công: +10 điểm/lần / 50% Độc sát - nội công: +20 điểm/lần; +7: 100% Độc sát - nội công: +20 điểm/lần; +8: 50% Độc sát - nội công: +20 điểm/lần / 50% Độc sát - nội công: +30 điểm/lần; +9: 100% Độc sát - nội công: +30 điểm/lần
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [U Minh Khô Lâu]: +1 cấp; +6: 95% Kỹ năng [U Minh Khô Lâu]: +1 cấp / 5% Kỹ năng [U Minh Khô Lâu]: +2 cấp; +7: 100% Kỹ năng [U Minh Khô Lâu]: +2 cấp; +8: 100% Kỹ năng [U Minh Khô Lâu]: +2 cấp; +9: 100% Kỹ năng [U Minh Khô Lâu]: +3 cấp

###### [Thiên Tứ] U Lung Mặc Thù Nhuyễn Lý — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 60
- Yêu cầu: cấp 120, Sức mạnh 50, môn phái Ngũ Độc
- Cơ bản: Né tránh: 140 điểm · Độ bền: 60 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm | Sinh lực tối đa: +150–200 điểm |
| 2 | ẩn | Thời gian độc phát: -10–20% | Thời gian độc phát: -20–25% |
| 3 | hiện | Sinh khí: +30–40 điểm | Sinh khí: +40–50 điểm |
| 4 | ẩn | Tốc độ di chuyển: +35–50% | Tốc độ di chuyển: +45–60% |
| 5 | hiện | Phòng thủ vật lý: +5–10% | Phòng thủ vật lý: +10–15% |
| 6 | ẩn | Kỹ năng [Vạn Độc Thực Tâm]: +1–3 cấp | Kỹ năng [Vạn Độc Thực Tâm]: +1–3 cấp |

- Kỹ năng ở +6: #771 白金内毒1: +6: Độc sát - nội công: +0 điểm/lần; +7: Độc sát - nội công: +0 điểm/lần; +8: Độc sát - nội công: +0 điểm/lần; +9: Độc sát - nội công: +0 điểm/lần; +10: Độc sát - nội công: +20 điểm/lần
- Kỹ năng ở +10: #803 白金内毒2: Độc sát - nội công: +20 điểm/lần
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Độc sát - nội công: +20 điểm/lần; +6: 95% Độc sát - nội công: +20 điểm/lần / 5% Độc sát - nội công: +30 điểm/lần; +7: 100% Độc sát - nội công: +30 điểm/lần; +8: 100% Độc sát - nội công: +30 điểm/lần; +9: 100% Độc sát - nội công: +40 điểm/lần

#### Bộ Minh ảo (số bộ 13)

- Hoàng kim (5 món): Minh ảo Tà Sát Độc Nhận (Vũ khí) · Minh ảo U Độc ám Y (Áo) · Minh ảo Độc Yết Chỉ Hoàn (Nhẫn) · Minh ảo Hủ Cốt Hộ uyển (Hộ uyển) · Minh ảo Song Hoàn Xà Hài (Giày)
- Thiên Tứ (5 món): Minh ảo Tà Sát Độc Nhận (Vũ khí) · Minh ảo U Độc ám Y (Áo) · Minh ảo Độc Yết Chỉ Hoàn (Nhẫn) · Minh ảo Hủ Cốt Hộ Uyển (Hộ uyển) · Minh ảo Song Hoàn Xà Hài (Đai)

##### Hoàng kim — bộ Minh ảo

###### Minh ảo Tà Sát Độc Nhận — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 61
- Yêu cầu: cấp 99, Sức mạnh 135, môn phái Ngũ Độc
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 3 | hiện | Hút nội lực: +4–8% |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +10–20% |
| 6 | ẩn | Độc sát - ngoại công: +20–30 điểm/lần |

###### Minh ảo U Độc ám Y — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 62
- Yêu cầu: cấp 90, Sức mạnh 260, môn phái Ngũ Độc
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Kỹ năng [Huyền Âm Trảm]: +1–3 cấp |
| 3 | hiện | Thời gian phục hồi: -40–50 |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% |

###### Minh ảo Độc Yết Chỉ Hoàn — Nhẫn

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 63
- Yêu cầu: cấp 80, môn phái Ngũ Độc
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Minh ảo Hủ Cốt Hộ uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 64
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Huyết Đao Độc Sát]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Kỹ năng [Bách Độc Xuyên Tâm]: +1–3 cấp |
| 6 | ẩn | Tấn công chí mạng: 3–5% |

###### Minh ảo Song Hoàn Xà Hài — Giày

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 65
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Ngũ Độc
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Bách Độc Xuyên Tâm]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Huyền Âm Trảm]: +1–3 cấp |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Chu Cáp Thanh Minh]: +1–3 cấp |

##### Thiên Tứ — bộ Minh ảo

###### [Thiên Tứ] Minh ảo Tà Sát Độc Nhận — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 61
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Ngũ Độc
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +50–60 điểm |
| 3 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +10–20% | Tốc độ đánh - ngoại công: +21–31% |
| 6 | ẩn | Độc sát - ngoại công: +20–30 điểm/lần | Độc sát - ngoại công: +30–40 điểm/lần |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Minh ảo U Độc ám Y — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 62
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Ngũ Độc
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +320–400 điểm |
| 2 | ẩn | Kỹ năng [Huyền Âm Trảm]: +1–3 cấp | Kỹ năng [Huyền Âm Trảm]: +1–3 cấp |
| 3 | hiện | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -49–59 |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #860 白金五毒刀3: Kỹ năng [Huyền Âm Trảm]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Chu Cáp Thanh Minh]: +1 cấp; +6: 95% Kỹ năng [Chu Cáp Thanh Minh]: +1 cấp / 5% Kỹ năng [Chu Cáp Thanh Minh]: +2 cấp; +7: 100% Kỹ năng [Chu Cáp Thanh Minh]: +2 cấp; +8: 100% Kỹ năng [Chu Cáp Thanh Minh]: +2 cấp; +9: 100% Kỹ năng [Chu Cáp Thanh Minh]: +3 cấp

###### [Thiên Tứ] Minh ảo Độc Yết Chỉ Hoàn — Nhẫn

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 63
- Yêu cầu: cấp 120, môn phái Ngũ Độc
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Phòng thủ vật lý: +5% | Phòng thủ vật lý: +17% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bách Độc Xuyên Tâm]: +1 cấp; +6: 95% Kỹ năng [Bách Độc Xuyên Tâm]: +1 cấp / 5% Kỹ năng [Bách Độc Xuyên Tâm]: +2 cấp; +7: 100% Kỹ năng [Bách Độc Xuyên Tâm]: +2 cấp; +8: 100% Kỹ năng [Bách Độc Xuyên Tâm]: +2 cấp; +9: 100% Kỹ năng [Bách Độc Xuyên Tâm]: +3 cấp

###### [Thiên Tứ] Minh ảo Hủ Cốt Hộ Uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 64
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Huyết Đao Độc Sát]: +1–3 cấp | Kỹ năng [Huyết Đao Độc Sát]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Kỹ năng [Bách Độc Xuyên Tâm]: +1–3 cấp | Kỹ năng [Bách Độc Xuyên Tâm]: +1–3 cấp |
| 6 | ẩn | Tấn công chí mạng: 3–5% | Tấn công chí mạng: 5–7% |

- Kỹ năng ở +6: #784 白金五毒刀1: Xác suất phát chiêu [Hấp Tinh Yểm] +5%
- Kỹ năng ở +10: #816 白金五毒刀2: Kỹ năng [Huyền Âm Trảm]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Huyền Âm Trảm]: +1 cấp; +6: 95% Kỹ năng [Huyền Âm Trảm]: +1 cấp / 5% Kỹ năng [Huyền Âm Trảm]: +2 cấp; +7: 100% Kỹ năng [Huyền Âm Trảm]: +2 cấp; +8: 100% Kỹ năng [Huyền Âm Trảm]: +2 cấp; +9: 100% Kỹ năng [Huyền Âm Trảm]: +3 cấp

###### [Thiên Tứ] Minh ảo Song Hoàn Xà Hài — Đai (bản hoàng kim cùng tên là Giày — bảng mod lệch ô 🟡)

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 65
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Ngũ Độc
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Bách Độc Xuyên Tâm]: +1–3 cấp | Kỹ năng [Bách Độc Xuyên Tâm]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Huyền Âm Trảm]: +1–3 cấp | Kỹ năng [Huyền Âm Trảm]: +1–3 cấp |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Chu Cáp Thanh Minh]: +1–3 cấp | Kỹ năng [Chu Cáp Thanh Minh]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Huyền Âm Trảm]: +1 cấp; +6: 95% Kỹ năng [Huyền Âm Trảm]: +1 cấp / 5% Kỹ năng [Huyền Âm Trảm]: +2 cấp; +7: 100% Kỹ năng [Huyền Âm Trảm]: +2 cấp; +8: 100% Kỹ năng [Huyền Âm Trảm]: +2 cấp; +9: 100% Kỹ năng [Huyền Âm Trảm]: +3 cấp

#### Bộ Chú Phược (số bộ 14)

- Hoàng kim (5 món): Chú Phược Phá giáp đầu hoàn (Nón) · Chú Phược Diệt Lôi Cảnh Phù (Dây chuyền) · Chú Phược U ảo Chỉ Hoàn (Nhẫn) · Chú Phược Xuyên Tâm Độc Uyển (Hộ uyển) · Chú Phược Băng Hỏa Thực Cốt Ngoa (Giày)
- Thiên Tứ (5 món): Chú Phược Phá Giáp Đầu Hoàn (Nón) · Chú Phược Diệt Lôi Cảnh Phù (Dây chuyền) · Chú Phược U ảo Chỉ Hoàn (Nhẫn) · Chú Phược Xuyên Tâm Độc Uyển (Hộ uyển) · Chú Phược Thực Cốt Ngọc Bội (Ngọc bội)
- Khác món giữa hai bản: chỉ hoàng kim có Chú Phược Băng Hỏa Thực Cốt Ngoa; chỉ Thiên Tứ có Chú Phược Thực Cốt Ngọc Bội.

##### Hoàng kim — bộ Chú Phược

###### Chú Phược Phá giáp đầu hoàn — Nón

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 66
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Đoạn Cân Hủ Cốt]: +1–3 cấp |
| 3 | hiện | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Kỹ năng [Xuyên Y Phá Giáp]: +1–3 cấp |
| 6 | ẩn | Thời gian choáng: -40–50% |

###### Chú Phược Diệt Lôi Cảnh Phù — Dây chuyền

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 67
- Yêu cầu: cấp 99, môn phái Ngũ Độc
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng độc: +35–50% |
| 3 | hiện | Kỹ năng [Cửu Thiên Cuồng Lôi]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% |

###### Chú Phược U ảo Chỉ Hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 68
- Yêu cầu: cấp 80, môn phái Ngũ Độc
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Chú Phược Xuyên Tâm Độc Uyển — Hộ uyển

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 69
- Yêu cầu: cấp 90, Sức mạnh 90, môn phái Ngũ Độc
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Xuyên Tâm Độc Thích]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% |

###### Chú Phược Băng Hỏa Thực Cốt Ngoa — Giày

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 70
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Xích Diệm Thực Thiên]: +1–3 cấp |
| 4 | ẩn | Thời gian trúng độc: -35–50% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Băng Lam Huyền Tinh]: +1–3 cấp |

##### Thiên Tứ — bộ Chú Phược

###### [Thiên Tứ] Chú Phược Phá Giáp Đầu Hoàn — Nón

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 66
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Đoạn Cân Hủ Cốt]: +1–3 cấp | Kỹ năng [Đoạn Cân Hủ Cốt]: +1–3 cấp |
| 3 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Kỹ năng [Xuyên Y Phá Giáp]: +1–3 cấp | Kỹ năng [Xuyên Y Phá Giáp]: +1–3 cấp |
| 6 | ẩn | Thời gian choáng: -40–50% | Thời gian choáng: -40–50% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Chú Phược Diệt Lôi Cảnh Phù — Dây chuyền

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 67
- Yêu cầu: cấp 120, môn phái Ngũ Độc
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng độc: +35–50% | Kháng độc: +35–50% |
| 3 | hiện | Kỹ năng [Cửu Thiên Cuồng Lôi]: +1–3 cấp | Kỹ năng [Cửu Thiên Cuồng Lôi]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Chú Phược U ảo Chỉ Hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 68
- Yêu cầu: cấp 120, môn phái Ngũ Độc
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Phòng thủ vật lý: +5% | Phòng thủ vật lý: +17% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #883 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #882 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Băng Lam Huyền Tinh]: +1 cấp; +6: 95% Kỹ năng [Băng Lam Huyền Tinh]: +1 cấp / 5% Kỹ năng [Băng Lam Huyền Tinh]: +2 cấp; +7: 100% Kỹ năng [Băng Lam Huyền Tinh]: +2 cấp; +8: 100% Kỹ năng [Băng Lam Huyền Tinh]: +2 cấp; +9: 100% Kỹ năng [Băng Lam Huyền Tinh]: +3 cấp

###### [Thiên Tứ] Chú Phược Xuyên Tâm Độc Uyển — Hộ uyển

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 69
- Yêu cầu: cấp 120, Sức mạnh 90, môn phái Ngũ Độc
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Xuyên Tâm Độc Thích]: +1–3 cấp | Kỹ năng [Xuyên Tâm Độc Thích]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm | Nội lực tối đa: +200–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% | Thời gian choáng: -30–50% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Chú Phược Thực Cốt Ngọc Bội — Ngọc bội

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 70
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Ngũ Độc
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Xích Diệm Thực Thiên]: +1–3 cấp | Kỹ năng [Xích Diệm Thực Thiên]: +1–3 cấp |
| 4 | ẩn | Thời gian trúng độc: -35–50% | Thời gian trúng độc: -35–50% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Băng Lam Huyền Tinh]: +1–3 cấp | Kỹ năng [Băng Lam Huyền Tinh]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

### Đường Môn

#### Bộ Băng Hàn (số bộ 15)

- Hoàng kim (5 món): Băng Hàn Đơn Chỉ Phi Đao (Ám khí) · Băng Hàn Huyền Y Thúc Giáp (Áo) · Băng Hàn Tâm Tiễn Yêu Khấu (Đai) · Băng Hàn Huyền Thiên Băng Hỏa Bội (Ngọc bội) · Băng Hàn Nguyệt ảnh Ngoa (Giày)
- Thiên Tứ (5 món): Băng Hàn Đơn Chỉ Phi Đao (Ám khí) · Băng Hàn Huyền Y Thúc Giáp (Áo) · Băng Hàn Tâm Tiễn Yêu Khấu (Đai) · Băng Hàn Huyền Thiên Băng Hỏa Bội (Ngọc bội) · Băng Hàn Nguyệt ảnh Ngoa (Giày)

##### Hoàng kim — bộ Băng Hàn

###### Băng Hàn Đơn Chỉ Phi Đao — Ám khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 71
- Yêu cầu: cấp 99, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Sát thương nhỏ nhất: 44 điểm · Sát thương lớn nhất: 100 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +30–60% |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 5 | hiện | Hút nội lực: +4–8% |
| 6 | ẩn | Kỹ năng [Tâm Nhãn]: +1–3 cấp |

###### Băng Hàn Huyền Y Thúc Giáp — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 72
- Yêu cầu: cấp 95, Sức mạnh 110, Thân pháp 165, môn phái Đường Môn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1–3 cấp |
| 3 | hiện | Thời gian phục hồi: -40–50 |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Truy Tâm Tiễn]: +1–3 cấp |

###### Băng Hàn Tâm Tiễn Yêu Khấu — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 73
- Yêu cầu: cấp 85, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Đường Môn ám khí]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% |

###### Băng Hàn Huyền Thiên Băng Hỏa Bội — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 74
- Yêu cầu: cấp 80, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Băng Hàn Nguyệt ảnh Ngoa — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 75
- Yêu cầu: cấp 90, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Tích Lịch đơn]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1–3 cấp |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Tiểu Lý Phi Đao]: +1–3 cấp |

##### Thiên Tứ — bộ Băng Hàn

###### [Thiên Tứ] Băng Hàn Đơn Chỉ Phi Đao — Ám khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 71
- Yêu cầu: cấp 120, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Sát thương nhỏ nhất: 44 điểm · Sát thương lớn nhất: 100 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +350–400 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +30–60% | Tốc độ đánh - ngoại công: +30–60% |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 5 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 6 | ẩn | Kỹ năng [Tâm Nhãn]: +1–3 cấp | Kỹ năng [Tâm Nhãn]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Băng Hàn Huyền Y Thúc Giáp — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 72
- Yêu cầu: cấp 120, Sức mạnh 110, Thân pháp 165, môn phái Đường Môn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +320–400 điểm |
| 2 | ẩn | Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1–3 cấp | Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1–3 cấp |
| 3 | hiện | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -49–59 |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Truy Tâm Tiễn]: +1–3 cấp | Kỹ năng [Truy Tâm Tiễn]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #857 白金唐门飞刀3: Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Truy Tâm Tiễn]: +1 cấp; +6: 95% Kỹ năng [Truy Tâm Tiễn]: +1 cấp / 5% Kỹ năng [Truy Tâm Tiễn]: +2 cấp; +7: 100% Kỹ năng [Truy Tâm Tiễn]: +2 cấp; +8: 100% Kỹ năng [Truy Tâm Tiễn]: +2 cấp; +9: 100% Kỹ năng [Truy Tâm Tiễn]: +3 cấp

###### [Thiên Tứ] Băng Hàn Tâm Tiễn Yêu Khấu — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 73
- Yêu cầu: cấp 120, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Đường Môn ám khí]: +1–3 cấp | Kỹ năng [Đường Môn ám khí]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% | Thời gian choáng: -40–60% |

- Kỹ năng ở +6: #781 白金唐门飞刀1: Giảm [Mê ảnh Tung] thời gian xuất chiêu: dưới ngựa1giây, trên ngựa 2 giây
- Kỹ năng ở +10: #813 白金唐门飞刀2: Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1 cấp; +6: 95% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1 cấp / 5% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +2 cấp; +7: 100% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +2 cấp; +8: 100% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +2 cấp; +9: 100% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +3 cấp

###### [Thiên Tứ] Băng Hàn Huyền Thiên Băng Hỏa Bội — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 74
- Yêu cầu: cấp 120, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Phòng thủ vật lý: +5% | Phòng thủ vật lý: +17% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Tiểu Lý Phi Đao]: +1 cấp; +6: 95% Kỹ năng [Tiểu Lý Phi Đao]: +1 cấp / 5% Kỹ năng [Tiểu Lý Phi Đao]: +2 cấp; +7: 100% Kỹ năng [Tiểu Lý Phi Đao]: +2 cấp; +8: 100% Kỹ năng [Tiểu Lý Phi Đao]: +2 cấp; +9: 100% Kỹ năng [Tiểu Lý Phi Đao]: +3 cấp

###### [Thiên Tứ] Băng Hàn Nguyệt ảnh Ngoa — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 75
- Yêu cầu: cấp 120, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Tích Lịch đơn]: +1–3 cấp | Kỹ năng [Tích Lịch đơn]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1–3 cấp | Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1–3 cấp |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Tiểu Lý Phi Đao]: +1–3 cấp | Kỹ năng [Tiểu Lý Phi Đao]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1 cấp; +6: 95% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +1 cấp / 5% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +2 cấp; +7: 100% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +2 cấp; +8: 100% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +2 cấp; +9: 100% Kỹ năng [Nhiếp Hồn Nguyệt ảnh]: +3 cấp

#### Bộ Thiên Quang (số bộ 16)

- Hoàng kim (5 món): Thiên Quang Hoa Vũ Mạn Thiên (Ám khí) · Thiên Quang Định Tâm Ngưng Thần Phù (Dây chuyền) · Thiên Quang Sâm La Thúc Đái (Đai) · Thiên Quang Song Bạo Hàn Thiết Trạc (Hộ uyển) · Thiên Quang Thúc Thiên Phược Địa Hoàn (Nhẫn)
- Thiên Tứ (5 món): Thiên Quang Hoa Vũ Mạn Thiên (Ám khí) · Thiên Quang Định Tâm Ngưng Thần Phù (Dây chuyền) · Thiên Quang Sâm La Thúc Đái (Đai) · Thiên Quang Địa Hành Thiên Lý Ngoa (Giày) · Thiên Quang Thúc Thiên Phược Địa Hoàn (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Thiên Quang Song Bạo Hàn Thiết Trạc; chỉ Thiên Tứ có Thiên Quang Địa Hành Thiên Lý Ngoa.

##### Hoàng kim — bộ Thiên Quang

###### Thiên Quang Hoa Vũ Mạn Thiên — Ám khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 76
- Yêu cầu: cấp 99, Sức mạnh 65, Thân pháp 230, môn phái Đường Môn
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 102 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Nội lực tối đa: +300–400 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm |
| 5 | hiện | Hút nội lực: +4–8% |
| 6 | ẩn | Kỹ năng [Tâm Nhãn]: +1–3 cấp |

###### Thiên Quang Định Tâm Ngưng Thần Phù — Dây chuyền

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 77
- Yêu cầu: cấp 95, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Phòng thủ vật lý: +20–25% |
| 3 | hiện | Kỹ năng [Đường Môn ám khí]: +1–3 cấp |
| 4 | ẩn | Kháng tất cả: +16–24% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | — |

###### Thiên Quang Sâm La Thúc Đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 78
- Yêu cầu: cấp 90, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Mạn Thiên Hoa Vũ]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Tấn công chí mạng: 3–5% |

###### Thiên Quang Song Bạo Hàn Thiết Trạc — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 79
- Yêu cầu: cấp 85, Sức mạnh 75, Thân pháp 90, môn phái Đường Môn
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Bạo Vũ Lê Hoa]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–40% |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thiên La Địa Võng]: +1–3 cấp |

###### Thiên Quang Thúc Thiên Phược Địa Hoàn — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 80
- Yêu cầu: cấp 80, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Thiên Quang

###### [Thiên Tứ] Thiên Quang Hoa Vũ Mạn Thiên — Ám khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 76
- Yêu cầu: cấp 120, Sức mạnh 65, Thân pháp 230, môn phái Đường Môn
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 102 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +450–500 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm | Sát thương vật lý - ngoại công: +70–80 điểm |
| 5 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 6 | ẩn | Kỹ năng [Tâm Nhãn]: +1–3 cấp | Kỹ năng [Tâm Nhãn]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Thiên Quang Định Tâm Ngưng Thần Phù — Dây chuyền

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 77
- Yêu cầu: cấp 120, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +25–30% |
| 3 | hiện | Kỹ năng [Đường Môn ám khí]: +1–3 cấp | Kỹ năng [Đường Môn ám khí]: +1–3 cấp |
| 4 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +420–500 điểm |
| 6 | ẩn | Kỹ năng [Tích Lịch đơn]: +1–3 cấp | Kỹ năng [Tích Lịch đơn]: +1–3 cấp |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #859 白金唐门暗器3: Kỹ năng [Bạo Vũ Lê Hoa]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bạo Vũ Lê Hoa]: +1 cấp; +6: 95% Kỹ năng [Bạo Vũ Lê Hoa]: +1 cấp / 5% Kỹ năng [Bạo Vũ Lê Hoa]: +2 cấp; +7: 100% Kỹ năng [Bạo Vũ Lê Hoa]: +2 cấp; +8: 100% Kỹ năng [Bạo Vũ Lê Hoa]: +2 cấp; +9: 100% Kỹ năng [Bạo Vũ Lê Hoa]: +3 cấp

###### [Thiên Tứ] Thiên Quang Sâm La Thúc Đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 78
- Yêu cầu: cấp 120, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Mạn Thiên Hoa Vũ]: +1–3 cấp | Kỹ năng [Mạn Thiên Hoa Vũ]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Tấn công chí mạng: 3–5% | Tấn công chí mạng: 5–7% |

- Kỹ năng ở +6: #782 白金唐门镖1: Giảm [Mê ảnh Tung] thời gian xuất chiêu: dưới ngựa1giây, trên ngựa 2 giây
- Kỹ năng ở +10: #815 白金唐门暗器2: Kỹ năng [Bạo Vũ Lê Hoa]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên La Địa Võng]: +1 cấp; +6: 95% Kỹ năng [Thiên La Địa Võng]: +1 cấp / 5% Kỹ năng [Thiên La Địa Võng]: +2 cấp; +7: 100% Kỹ năng [Thiên La Địa Võng]: +2 cấp; +8: 100% Kỹ năng [Thiên La Địa Võng]: +2 cấp; +9: 100% Kỹ năng [Thiên La Địa Võng]: +3 cấp

###### [Thiên Tứ] Thiên Quang Địa Hành Thiên Lý Ngoa — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 79
- Yêu cầu: cấp 120, Sức mạnh 75, Thân pháp 90, môn phái Đường Môn
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Bạo Vũ Lê Hoa]: +1–3 cấp | Kỹ năng [Bạo Vũ Lê Hoa]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–40% | Thời gian làm chậm: -30–40% |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thiên La Địa Võng]: +1–3 cấp | Kỹ năng [Thiên La Địa Võng]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Mạn Thiên Hoa Vũ]: +1 cấp; +6: 95% Kỹ năng [Mạn Thiên Hoa Vũ]: +1 cấp / 5% Kỹ năng [Mạn Thiên Hoa Vũ]: +2 cấp; +7: 100% Kỹ năng [Mạn Thiên Hoa Vũ]: +2 cấp; +8: 100% Kỹ năng [Mạn Thiên Hoa Vũ]: +2 cấp; +9: 100% Kỹ năng [Mạn Thiên Hoa Vũ]: +3 cấp

###### [Thiên Tứ] Thiên Quang Thúc Thiên Phược Địa Hoàn — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 80
- Yêu cầu: cấp 120, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Phòng thủ vật lý: +5% | Phòng thủ vật lý: +17% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Mạn Thiên Hoa Vũ]: +1 cấp; +6: 95% Kỹ năng [Mạn Thiên Hoa Vũ]: +1 cấp / 5% Kỹ năng [Mạn Thiên Hoa Vũ]: +2 cấp; +7: 100% Kỹ năng [Mạn Thiên Hoa Vũ]: +2 cấp; +8: 100% Kỹ năng [Mạn Thiên Hoa Vũ]: +2 cấp; +9: 100% Kỹ năng [Mạn Thiên Hoa Vũ]: +3 cấp

#### Bộ Sâm Hoang (số bộ 17)

- Hoàng kim (5 món): Sâm Hoang Phi Tinh Đoạt Hồn (Ám khí) · Sâm Hoang KimTiền Liên Hoàn Giáp (Áo) · Sâm Hoang Hồn Giảo Yêu Thúc (Đai) · Sâm Hoang Huyền Thiết Tương Ngọc Bội (Ngọc bội) · Sâm Hoang Tinh Vẫn Phi Lý (Giày)
- Thiên Tứ (5 món): Sâm Hoang Phi Tinh Đoạt Hồn (Ám khí) · Sâm Hoang Kim Tiền Liên Hoàn Giáp (Áo) · Sâm Hoang Hồn Giảo Yêu Thúc (Đai) · Sâm Hoang Huyền Thiết Tương Ngọc Bội (Ngọc bội) · Sâm Hoang Tinh Vẫn Phi Lý (Giày)

##### Hoàng kim — bộ Sâm Hoang

###### Sâm Hoang Phi Tinh Đoạt Hồn — Ám khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 81
- Yêu cầu: cấp 99, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Sát thương nhỏ nhất: 42 điểm · Sát thương lớn nhất: 98 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm |
| 5 | hiện | Hút nội lực: +4–8% |
| 6 | ẩn | Kỹ năng [Tâm Nhãn]: +1–3 cấp |

###### Sâm Hoang KimTiền Liên Hoàn Giáp — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 82
- Yêu cầu: cấp 95, Sức mạnh 110, Thân pháp 165, môn phái Đường Môn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Đường Môn ám khí]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Sâm Hoang Hồn Giảo Yêu Thúc — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 83
- Yêu cầu: cấp 85, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Đoạt Hồn Tiêu]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% |

###### Sâm Hoang Huyền Thiết Tương Ngọc Bội — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 84
- Yêu cầu: cấp 80, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Sâm Hoang Tinh Vẫn Phi Lý — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 85
- Yêu cầu: cấp 90, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Kỹ năng [Cửu Cung Phi Tinh]: +1–3 cấp |
| 3 | hiện | Tốc độ di chuyển: +40–60% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Tích Lịch đơn]: +1–3 cấp |

##### Thiên Tứ — bộ Sâm Hoang

###### [Thiên Tứ] Sâm Hoang Phi Tinh Đoạt Hồn — Ám khí

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 81
- Yêu cầu: cấp 120, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Sát thương nhỏ nhất: 42 điểm · Sát thương lớn nhất: 98 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +450–500 điểm |
| 2 | ẩn | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 3 | hiện | Sát thương vật lý - ngoại công: +100–150% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Sát thương vật lý - ngoại công: +50–60 điểm | Sát thương vật lý - ngoại công: +70–80 điểm |
| 5 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 6 | ẩn | Kỹ năng [Tâm Nhãn]: +1–3 cấp | Kỹ năng [Tâm Nhãn]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Sâm Hoang Kim Tiền Liên Hoàn Giáp — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 82
- Yêu cầu: cấp 120, Sức mạnh 110, Thân pháp 165, môn phái Đường Môn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Đường Môn ám khí]: +1–3 cấp | Kỹ năng [Đường Môn ám khí]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Cửu Cung Phi Tinh]: +1 cấp; +6: 95% Kỹ năng [Cửu Cung Phi Tinh]: +1 cấp / 5% Kỹ năng [Cửu Cung Phi Tinh]: +2 cấp; +7: 100% Kỹ năng [Cửu Cung Phi Tinh]: +2 cấp; +8: 100% Kỹ năng [Cửu Cung Phi Tinh]: +2 cấp; +9: 100% Kỹ năng [Cửu Cung Phi Tinh]: +3 cấp

###### [Thiên Tứ] Sâm Hoang Hồn Giảo Yêu Thúc — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 83
- Yêu cầu: cấp 120, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Đoạt Hồn Tiêu]: +1–3 cấp | Kỹ năng [Đoạt Hồn Tiêu]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% | Thời gian choáng: -40–60% |

- Kỹ năng ở +6: #783 白金唐门暗器1: Giảm [Mê ảnh Tung] thời gian xuất chiêu: dưới ngựa1giây, trên ngựa 2 giây
- Kỹ năng ở +10: #814 白金唐门镖2: Kỹ năng [Cửu Cung Phi Tinh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Cửu Cung Phi Tinh]: +1 cấp; +6: 95% Kỹ năng [Cửu Cung Phi Tinh]: +1 cấp / 5% Kỹ năng [Cửu Cung Phi Tinh]: +2 cấp; +7: 100% Kỹ năng [Cửu Cung Phi Tinh]: +2 cấp; +8: 100% Kỹ năng [Cửu Cung Phi Tinh]: +2 cấp; +9: 100% Kỹ năng [Cửu Cung Phi Tinh]: +3 cấp

###### [Thiên Tứ] Sâm Hoang Huyền Thiết Tương Ngọc Bội — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 84
- Yêu cầu: cấp 120, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Phòng thủ vật lý: +5% | Phòng thủ vật lý: +17% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #883 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #882 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Tán Hoa Tiêu]: +1 cấp; +6: 95% Kỹ năng [Tán Hoa Tiêu]: +1 cấp / 5% Kỹ năng [Tán Hoa Tiêu]: +2 cấp; +7: 100% Kỹ năng [Tán Hoa Tiêu]: +2 cấp; +8: 100% Kỹ năng [Tán Hoa Tiêu]: +2 cấp; +9: 100% Kỹ năng [Tán Hoa Tiêu]: +3 cấp

###### [Thiên Tứ] Sâm Hoang Tinh Vẫn Phi Lý — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 85
- Yêu cầu: cấp 120, Sức mạnh 90, Thân pháp 110, môn phái Đường Môn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +320–400 điểm |
| 2 | ẩn | Kỹ năng [Cửu Cung Phi Tinh]: +1–3 cấp | Kỹ năng [Cửu Cung Phi Tinh]: +1–3 cấp |
| 3 | hiện | Tốc độ di chuyển: +40–60% | Tốc độ di chuyển: +50–70% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Tích Lịch đơn]: +1–3 cấp | Kỹ năng [Tích Lịch đơn]: +1–3 cấp |

- Kỹ năng ở +6: #849 白金加血3: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #858 白金唐门镖3: Kỹ năng [Cửu Cung Phi Tinh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Đoạt Hồn Tiêu]: +1 cấp; +6: 95% Kỹ năng [Đoạt Hồn Tiêu]: +1 cấp / 5% Kỹ năng [Đoạt Hồn Tiêu]: +2 cấp; +7: 100% Kỹ năng [Đoạt Hồn Tiêu]: +2 cấp; +8: 100% Kỹ năng [Đoạt Hồn Tiêu]: +2 cấp; +9: 100% Kỹ năng [Đoạt Hồn Tiêu]: +3 cấp

#### Bộ Địa Phách (số bộ 18)

- Hoàng kim (5 món): Địa Phách Ngũ hành Liên Hoàn Quán (Nón) · Địa Phách Hắc Diệm Xung Thiên Liên (Dây chuyền) · Địa Phách Tích Lịch Lôi Hỏa Giới (Nhẫn) · Địa Phách Khấu Tâm trạc (Hộ uyển) · Địa Phách Địa Hành Thiên Lý Ngoa (Giày)
- Thiên Tứ (5 món): Địa Phách Ngũ Hành Liên Hoàn Quán (Nón) · Địa Phách Hắc Diệm Xung Thiên Liên (Dây chuyền) · Địa Phách Tích Lịch Lôi Hỏa Giới (Nhẫn) · Địa Phách Khấu Tâm Trạc (Hộ uyển) · Địa Phách Phong Hàn Thúc Yêu (Đai)
- Khác món giữa hai bản: chỉ hoàng kim có Địa Phách Địa Hành Thiên Lý Ngoa; chỉ Thiên Tứ có Địa Phách Phong Hàn Thúc Yêu.

##### Hoàng kim — bộ Địa Phách

###### Địa Phách Ngũ hành Liên Hoàn Quán — Nón

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 86
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Đường Môn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Kỹ năng [Loạn Hoàn Kích]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–40% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Lôi Kích Thuật]: +1–3 cấp |

###### Địa Phách Hắc Diệm Xung Thiên Liên — Dây chuyền

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 87
- Yêu cầu: cấp 95, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Kỹ năng [Độc Thích Cốt]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Địa Diệm Hỏa]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% |

###### Địa Phách Tích Lịch Lôi Hỏa Giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 88
- Yêu cầu: cấp 80, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Địa Phách Khấu Tâm trạc — Hộ uyển

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 89
- Yêu cầu: cấp 99, Sức mạnh 90, môn phái Đường Môn
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Xuyên Tâm Thích]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% |

###### Địa Phách Địa Hành Thiên Lý Ngoa — Giày

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 90
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Đường Môn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Hàn Băng Thích]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Lôi Kích Thuật]: +1–3 cấp |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Địa Phách

###### [Thiên Tứ] Địa Phách Ngũ Hành Liên Hoàn Quán — Nón

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 86
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Đường Môn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Kỹ năng [Loạn Hoàn Kích]: +1–3 cấp | Kỹ năng [Loạn Hoàn Kích]: +1–3 cấp |
| 3 | hiện | Thời gian làm chậm: -30–40% | Thời gian làm chậm: -30–40% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Lôi Kích Thuật]: +1–3 cấp | Kỹ năng [Lôi Kích Thuật]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Địa Phách Hắc Diệm Xung Thiên Liên — Dây chuyền

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 87
- Yêu cầu: cấp 120, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Kỹ năng [Độc Thích Cốt]: +1–3 cấp | Kỹ năng [Độc Thích Cốt]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Địa Diệm Hỏa]: +1–3 cấp | Kỹ năng [Địa Diệm Hỏa]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Địa Phách Tích Lịch Lôi Hỏa Giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 88
- Yêu cầu: cấp 120, môn phái Đường Môn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Phòng thủ vật lý: +5% | Phòng thủ vật lý: +17% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #885 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #884 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Xuyên Tâm Thích]: +1 cấp; +6: 95% Kỹ năng [Xuyên Tâm Thích]: +1 cấp / 5% Kỹ năng [Xuyên Tâm Thích]: +2 cấp; +7: 100% Kỹ năng [Xuyên Tâm Thích]: +2 cấp; +8: 100% Kỹ năng [Xuyên Tâm Thích]: +2 cấp; +9: 100% Kỹ năng [Xuyên Tâm Thích]: +3 cấp

###### [Thiên Tứ] Địa Phách Khấu Tâm Trạc — Hộ uyển

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 89
- Yêu cầu: cấp 120, Sức mạnh 90, môn phái Đường Môn
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Xuyên Tâm Thích]: +1–3 cấp | Kỹ năng [Xuyên Tâm Thích]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% | Thời gian choáng: -30–50% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Địa Phách Phong Hàn Thúc Yêu — Đai

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 90
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Đường Môn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–50% | Tốc độ di chuyển: +40–50% |
| 3 | hiện | Kỹ năng [Hàn Băng Thích]: +1–3 cấp | Kỹ năng [Hàn Băng Thích]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Lôi Kích Thuật]: +1–3 cấp | Kỹ năng [Lôi Kích Thuật]: +1–3 cấp |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

### Cái Bang

#### Bộ Đồng Cừu (số bộ 19)

- Hoàng kim (5 món): Đồng Cừu Phi Long Đầu hoàn (Nón) · Đồng Cừu Giáng Long Cái Y (Áo) · Đồng Cừu Tiềm Long Yêu Đái (Đai) · Đồng Cừu Kháng Long Hộ Uyển (Hộ uyển) · Đồng Cừu Kiến Long Ban Chỉ (Nhẫn)
- Thiên Tứ (5 món): Đồng Cừu Ngự Long Ngọc Bội (Ngọc bội) · Ngự Long Giáng Long Cái Y (Áo) · Đồng Cừu Tiềm Long Yêu Đái (Đai) · Đồng Cừu Kháng Long Hộ Thủ (Hộ uyển) · Đồng Cừu Kiến Long Ban Chỉ (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Đồng Cừu Phi Long Đầu hoàn, Đồng Cừu Giáng Long Cái Y, Đồng Cừu Kháng Long Hộ Uyển; chỉ Thiên Tứ có Đồng Cừu Ngự Long Ngọc Bội, Ngự Long Giáng Long Cái Y, Đồng Cừu Kháng Long Hộ Thủ.

##### Hoàng kim — bộ Đồng Cừu

###### Đồng Cừu Phi Long Đầu hoàn — Nón

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 91
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Phi Long Tại Thiên]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Cái Bang Chưởng Pháp]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | — |

###### Đồng Cừu Giáng Long Cái Y — Áo

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 92
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 500 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Phòng thủ vật lý: +20–30% |
| 3 | hiện | Nội lực tối đa: -50 điểm → Nội lực tối đa: +50 điểm |
| 4 | ẩn | Thời gian phục hồi: -35–50 |
| 5 | hiện | Sinh khí: +30–40 điểm |
| 6 | ẩn | Kỹ năng [Kháng Long Hữu Hối]: +1–3 cấp |

###### Đồng Cừu Tiềm Long Yêu Đái — Đai

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 93
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng băng: +25–30% |
| 3 | hiện | Kỹ năng [Kiến Nhân Thần Thủ]: +1–3 cấp |
| 4 | ẩn | Thời gian làm chậm: -40–50% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% |

###### Đồng Cừu Kháng Long Hộ Uyển — Hộ uyển

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 94
- Yêu cầu: cấp 99, Sức mạnh 90, môn phái Cái Bang
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Kỹ năng [Giáng Long Chưởng]: +1–3 cấp |
| 4 | ẩn | Hỏa sát - nội công: +120–200 điểm |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kỹ năng [Túy Điệp Cuồng Vũ]: +1–3 cấp |

###### Đồng Cừu Kiến Long Ban Chỉ — Nhẫn

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 95
- Yêu cầu: cấp 80, môn phái Cái Bang
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Đồng Cừu

###### [Thiên Tứ] Đồng Cừu Ngự Long Ngọc Bội — Ngọc bội

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 91
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Phi Long Tại Thiên]: +1–3 cấp | Kỹ năng [Phi Long Tại Thiên]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Cái Bang Chưởng Pháp]: +1–3 cấp | Kỹ năng [Cái Bang Chưởng Pháp]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phi Long Tại Thiên]: +1 cấp; +6: 95% Kỹ năng [Phi Long Tại Thiên]: +1 cấp / 5% Kỹ năng [Phi Long Tại Thiên]: +2 cấp; +7: 100% Kỹ năng [Phi Long Tại Thiên]: +2 cấp; +8: 100% Kỹ năng [Phi Long Tại Thiên]: +2 cấp; +9: 100% Kỹ năng [Phi Long Tại Thiên]: +3 cấp

###### [Thiên Tứ] Ngự Long Giáng Long Cái Y — Áo

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 92
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 500 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Thời gian choáng: -20–40% | Thời gian choáng: -30–50% |
| 2 | ẩn | Kháng lôi: +20–25% | Kháng lôi: +25–30% |
| 3 | hiện | Nội lực tối đa: -50 điểm → Nội lực tối đa: +50 điểm | Nội lực tối đa: +150–200 điểm |
| 4 | ẩn | Thời gian phục hồi: -35–50 | Thời gian phục hồi: -50–60 |
| 5 | hiện | Hỏa sát - nội công: +100–200 điểm | Hỏa sát - nội công: +350–400 điểm |
| 6 | ẩn | Kỹ năng [Kháng Long Hữu Hối]: +1–3 cấp | Kỹ năng [Kháng Long Hữu Hối]: +1–3 cấp |

- Kỹ năng ở +6: #772 白金内火1: Hỏa sát - nội công: +70 điểm
- Kỹ năng ở +10: #804 白金内火3: Hỏa sát - nội công: +120 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Hỏa sát - nội công: +70 điểm / 5% Hỏa sát - nội công: +150 điểm; +6: 50% Hỏa sát - nội công: +70 điểm / 50% Hỏa sát - nội công: +150 điểm; +7: 100% Hỏa sát - nội công: +150 điểm; +8: 50% Hỏa sát - nội công: +150 điểm / 50% Hỏa sát - nội công: +250 điểm; +9: 100% Hỏa sát - nội công: +250 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Hỏa sát - nội công: +120 điểm; +6: 95% Hỏa sát - nội công: +120 điểm / 5% Hỏa sát - nội công: +200 điểm; +7: 100% Hỏa sát - nội công: +200 điểm; +8: 100% Hỏa sát - nội công: +200 điểm; +9: 100% Hỏa sát - nội công: +300 điểm

###### [Thiên Tứ] Đồng Cừu Tiềm Long Yêu Đái — Đai

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 93
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kháng băng: +25–30% | Kháng băng: +30–35% |
| 3 | hiện | Kỹ năng [Kiến Nhân Thần Thủ]: +1–3 cấp | Kỹ năng [Kiến Nhân Thần Thủ]: +1–3 cấp |
| 4 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% | Thời gian trúng độc: -40–60% |

- Kỹ năng ở +6: #793 白金丐帮掌1: Xác suất phát chiêu [Hỗn Thiên Khí Công] +2%
- Kỹ năng ở +10: #825 白金丐帮掌2: Kỹ năng [Phi Long Tại Thiên]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phi Long Tại Thiên]: +1 cấp; +6: 95% Kỹ năng [Phi Long Tại Thiên]: +1 cấp / 5% Kỹ năng [Phi Long Tại Thiên]: +2 cấp; +7: 100% Kỹ năng [Phi Long Tại Thiên]: +2 cấp; +8: 100% Kỹ năng [Phi Long Tại Thiên]: +2 cấp; +9: 100% Kỹ năng [Phi Long Tại Thiên]: +3 cấp

###### [Thiên Tứ] Đồng Cừu Kháng Long Hộ Thủ — Hộ uyển

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 94
- Yêu cầu: cấp 120, Sức mạnh 90, môn phái Cái Bang
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Kỹ năng [Giáng Long Chưởng]: +1–3 cấp | Kỹ năng [Giáng Long Chưởng]: +1–3 cấp |
| 4 | ẩn | Hỏa sát - nội công: +120–200 điểm | Hỏa sát - nội công: +350–400 điểm |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +450–500 điểm |
| 6 | ẩn | Kỹ năng [Túy Điệp Cuồng Vũ]: +1–3 cấp | Kỹ năng [Túy Điệp Cuồng Vũ]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #869 白金丐帮掌3: Kỹ năng [Phi Long Tại Thiên]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Kháng Long Hữu Hối]: +1 cấp; +6: 95% Kỹ năng [Kháng Long Hữu Hối]: +1 cấp / 5% Kỹ năng [Kháng Long Hữu Hối]: +2 cấp; +7: 100% Kỹ năng [Kháng Long Hữu Hối]: +2 cấp; +8: 100% Kỹ năng [Kháng Long Hữu Hối]: +2 cấp; +9: 100% Kỹ năng [Kháng Long Hữu Hối]: +3 cấp

###### [Thiên Tứ] Đồng Cừu Kiến Long Ban Chỉ — Nhẫn

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 95
- Yêu cầu: cấp 120, môn phái Cái Bang
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng băng: +5% | Kháng băng: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Giáng Long Chưởng]: +1 cấp; +6: 95% Kỹ năng [Giáng Long Chưởng]: +1 cấp / 5% Kỹ năng [Giáng Long Chưởng]: +2 cấp; +7: 100% Kỹ năng [Giáng Long Chưởng]: +2 cấp; +8: 100% Kỹ năng [Giáng Long Chưởng]: +2 cấp; +9: 100% Kỹ năng [Giáng Long Chưởng]: +3 cấp

#### Bộ Địch Khái (số bộ 20)

- Hoàng kim (5 món): Địch Khái Lục Ngọc Trượng (Vũ khí) · Địch Khái Cửu Đại Cái Y (Áo) · Địch Khái Triền Mãng yêu đái (Đai) · Địch Khái Cẩu Tích Bì Hộ uyển (Hộ uyển) · Địch Khái Thảo Gian Thạch giới (Nhẫn)
- Thiên Tứ (5 món): Địch Khái Lục Ngọc Trượng (Vũ khí) · Địch Khái Cửu Đại Cái Y (Áo) · Địch Khái Triền Mãng Yêu Đái (Đai) · Địch Khái Cẩu Tích Bì Hộ Uyển (Hộ uyển) · Địch Khái Thảo Gian Thạch Giới (Nhẫn)

##### Hoàng kim — bộ Địch Khái

###### Địch Khái Lục Ngọc Trượng — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 96
- Yêu cầu: cấp 99, Sức mạnh 180, môn phái Cái Bang
- Cơ bản: Sát thương nhỏ nhất: 69 điểm · Sát thương lớn nhất: 128 điểm · Tỉ lệ công kích chính xác: -10% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 3 | hiện | Hút nội lực: +4–8% |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +20–40% |
| 6 | ẩn | Kỹ năng [Túy Điệp Cuồng Vũ]: +1–3 cấp |

###### Địch Khái Cửu Đại Cái Y — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 97
- Yêu cầu: cấp 90, Sức mạnh 260, môn phái Cái Bang
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Cái Bang Bổng pháp]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Bổng Đả ác Cẩu]: +1–3 cấp |

###### Địch Khái Triền Mãng yêu đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 98
- Yêu cầu: cấp 95, Sức mạnh 135, môn phái Cái Bang
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Diên Môn Thác Bát]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thiên Hạ Vô Cẩu]: +1–3 cấp |

###### Địch Khái Cẩu Tích Bì Hộ uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 99
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian choáng: -30–50% |
| 3 | hiện | Kỹ năng [Đả Cẩu bổng]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% |

###### Địch Khái Thảo Gian Thạch giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 100
- Yêu cầu: cấp 80, môn phái Cái Bang
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Địch Khái

###### [Thiên Tứ] Địch Khái Lục Ngọc Trượng — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 96
- Yêu cầu: cấp 120, Sức mạnh 180, môn phái Cái Bang
- Cơ bản: Sát thương nhỏ nhất: 69 điểm · Sát thương lớn nhất: 128 điểm · Tỉ lệ công kích chính xác: -10% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 3 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +20–40% | Tốc độ đánh - ngoại công: +20–40% |
| 6 | ẩn | Kỹ năng [Túy Điệp Cuồng Vũ]: +1–3 cấp | Kỹ năng [Túy Điệp Cuồng Vũ]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Địch Khái Cửu Đại Cái Y — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 97
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Cái Bang
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Cái Bang Bổng pháp]: +1–3 cấp | Kỹ năng [Cái Bang Bổng pháp]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Bổng Đả ác Cẩu]: +1–3 cấp | Kỹ năng [Bổng Đả ác Cẩu]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Hạ Vô Cẩu]: +1 cấp; +6: 95% Kỹ năng [Thiên Hạ Vô Cẩu]: +1 cấp / 5% Kỹ năng [Thiên Hạ Vô Cẩu]: +2 cấp; +7: 100% Kỹ năng [Thiên Hạ Vô Cẩu]: +2 cấp; +8: 100% Kỹ năng [Thiên Hạ Vô Cẩu]: +2 cấp; +9: 100% Kỹ năng [Thiên Hạ Vô Cẩu]: +3 cấp

###### [Thiên Tứ] Địch Khái Triền Mãng Yêu Đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 98
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Cái Bang
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Diên Môn Thác Bát]: +1–3 cấp | Kỹ năng [Diên Môn Thác Bát]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Thiên Hạ Vô Cẩu]: +1–3 cấp | Kỹ năng [Thiên Hạ Vô Cẩu]: +1–3 cấp |

- Kỹ năng ở +6: #792 白金丐帮棍1: Xác suất phát chiêu [Hỗn Thiên Khí Công] +2%
- Kỹ năng ở +10: #824 白金丐帮棍2: Kỹ năng [Thiên Hạ Vô Cẩu]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bổng Đả ác Cẩu]: +1 cấp; +6: 95% Kỹ năng [Bổng Đả ác Cẩu]: +1 cấp / 5% Kỹ năng [Bổng Đả ác Cẩu]: +2 cấp; +7: 100% Kỹ năng [Bổng Đả ác Cẩu]: +2 cấp; +8: 100% Kỹ năng [Bổng Đả ác Cẩu]: +2 cấp; +9: 100% Kỹ năng [Bổng Đả ác Cẩu]: +3 cấp

###### [Thiên Tứ] Địch Khái Cẩu Tích Bì Hộ Uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 99
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Cái Bang
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +350–400 điểm |
| 2 | ẩn | Thời gian choáng: -30–50% | Thời gian choáng: -40–60% |
| 3 | hiện | Kỹ năng [Đả Cẩu bổng]: +1–3 cấp | Kỹ năng [Đả Cẩu bổng]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% | Thời gian trúng độc: -40–60% |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #868 白金丐帮棍3: Kỹ năng [Thiên Hạ Vô Cẩu]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Hạ Vô Cẩu]: +1 cấp; +6: 95% Kỹ năng [Thiên Hạ Vô Cẩu]: +1 cấp / 5% Kỹ năng [Thiên Hạ Vô Cẩu]: +2 cấp; +7: 100% Kỹ năng [Thiên Hạ Vô Cẩu]: +2 cấp; +8: 100% Kỹ năng [Thiên Hạ Vô Cẩu]: +2 cấp; +9: 100% Kỹ năng [Thiên Hạ Vô Cẩu]: +3 cấp

###### [Thiên Tứ] Địch Khái Thảo Gian Thạch Giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 100
- Yêu cầu: cấp 120, môn phái Cái Bang
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng băng: +5% | Kháng băng: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Đả Cẩu bổng]: +1 cấp; +6: 95% Kỹ năng [Đả Cẩu bổng]: +1 cấp / 5% Kỹ năng [Đả Cẩu bổng]: +2 cấp; +7: 100% Kỹ năng [Đả Cẩu bổng]: +2 cấp; +8: 100% Kỹ năng [Đả Cẩu bổng]: +2 cấp; +9: 100% Kỹ năng [Đả Cẩu bổng]: +3 cấp

### Thiên Nhẫn

#### Bộ Ma Sát (số bộ 21)

- Hoàng kim (5 món): Ma Sát Quỷ Cốc U Minh Thương (Vũ khí) · Ma Sát Tàn Dương ảnh Huyết Giáp (Áo) · Ma Sát Xích Ký Tỏa Yêu Khấu (Đai) · Ma Sát Cử Hỏa Liêu Thiên uyển (Hộ uyển) · Ma Sát Vân Long Thổ Châu giới (Nhẫn)
- Thiên Tứ (5 món): Ma Sát Quỷ Cốc U Minh Thương (Vũ khí) · Ma Sát Tàn Dương Anh Huyết Giáp (Áo) · Ma Sát Xích Ký Tỏa Yêu Khấu (Đai) · Ma Sát Cử Hỏa Liêu Thiên Uyên (Nón) · Ma Sát Vân Long Thổ Châu Giới (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Ma Sát Tàn Dương ảnh Huyết Giáp, Ma Sát Cử Hỏa Liêu Thiên uyển; chỉ Thiên Tứ có Ma Sát Tàn Dương Anh Huyết Giáp, Ma Sát Cử Hỏa Liêu Thiên Uyên.

##### Hoàng kim — bộ Ma Sát

###### Ma Sát Quỷ Cốc U Minh Thương — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 101
- Yêu cầu: cấp 99, Sức mạnh 165, Thân pháp 165, môn phái Thiên Nhẫn
- Cơ bản: Sát thương nhỏ nhất: 18 điểm · Sát thương lớn nhất: 158 điểm · Tỉ lệ công kích chính xác: +30% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 3 | hiện | Tỉ lệ công kích chính xác: +240–360 điểm |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +25–40% |
| 6 | ẩn | Kỹ năng [Thiên Ma Giải Thể]: +1–3 cấp |

###### Ma Sát Tàn Dương ảnh Huyết Giáp — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 102
- Yêu cầu: cấp 90, Sức mạnh 210, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Thời gian choáng: -30–50% |
| 4 | ẩn | Kháng lôi: +30–35% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm |
| 6 | ẩn | Kỹ năng [Tàn Dương Như Huyết]: +1–3 cấp |

###### Ma Sát Xích Ký Tỏa Yêu Khấu — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 103
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Thời gian choáng: -30–40% |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Vân Long Kích]: +1–3 cấp |

###### Ma Sát Cử Hỏa Liêu Thiên uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 104
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Kỹ năng [Vân Long Kích]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Liệt Hỏa Tình Thiên]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +35–50% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thâu Thiên Hoán Nhật]: +1–3 cấp |

###### Ma Sát Vân Long Thổ Châu giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 105
- Yêu cầu: cấp 80, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Ma Sát

###### [Thiên Tứ] Ma Sát Quỷ Cốc U Minh Thương — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 101
- Yêu cầu: cấp 120, Sức mạnh 165, Thân pháp 165, môn phái Thiên Nhẫn
- Cơ bản: Sát thương nhỏ nhất: 18 điểm · Sát thương lớn nhất: 158 điểm · Tỉ lệ công kích chính xác: +30% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 3 | hiện | Tỉ lệ công kích chính xác: +240–360 điểm | Tỉ lệ công kích chính xác: +900–1000 điểm |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 6 | ẩn | Kỹ năng [Thiên Ma Giải Thể]: +1–3 cấp | Kỹ năng [Thiên Ma Giải Thể]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Ma Sát Tàn Dương Anh Huyết Giáp — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `platinaequip.txt` dòng 102
- Yêu cầu: cấp 120, Sức mạnh 210, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +420–500 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -49–59 |
| 3 | hiện | Thời gian choáng: -30–50% | Thời gian choáng: -40–60% |
| 4 | ẩn | Kháng lôi: +30–35% | Kháng lôi: +35–40% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm | Nội lực tối đa: +320–400 điểm |
| 6 | ẩn | Kỹ năng [Tàn Dương Như Huyết]: +1–3 cấp | Kỹ năng [Tàn Dương Như Huyết]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #866 白金天忍战3: Kỹ năng [Vân Long Kích]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Vân Long Kích]: +1 cấp; +6: 95% Kỹ năng [Vân Long Kích]: +1 cấp / 5% Kỹ năng [Vân Long Kích]: +2 cấp; +7: 100% Kỹ năng [Vân Long Kích]: +2 cấp; +8: 100% Kỹ năng [Vân Long Kích]: +2 cấp; +9: 100% Kỹ năng [Vân Long Kích]: +3 cấp

###### [Thiên Tứ] Ma Sát Xích Ký Tỏa Yêu Khấu — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 103
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Vân Long Kích]: +1–3 cấp | Kỹ năng [Vân Long Kích]: +1–3 cấp |

- Kỹ năng ở +6: #790 白金天忍战1: Xác suất khiến cho đối phương hoảng loạn [Ma Âm Phệ Phách] +5%
- Kỹ năng ở +10: #822 白金天忍战2: Kỹ năng [Vân Long Kích]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +1200 điểm / 5% Sinh lực tối đa: +1500 điểm; +6: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +7: 100% Sinh lực tối đa: +1500 điểm; +8: 50% Sinh lực tối đa: +1500 điểm / 50% Sinh lực tối đa: +2000 điểm; +9: 100% Sinh lực tối đa: +2000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thâu Thiên Hoán Nhật]: +1 cấp; +6: 95% Kỹ năng [Thâu Thiên Hoán Nhật]: +1 cấp / 5% Kỹ năng [Thâu Thiên Hoán Nhật]: +2 cấp; +7: 100% Kỹ năng [Thâu Thiên Hoán Nhật]: +2 cấp; +8: 100% Kỹ năng [Thâu Thiên Hoán Nhật]: +2 cấp; +9: 100% Kỹ năng [Thâu Thiên Hoán Nhật]: +3 cấp

###### [Thiên Tứ] Ma Sát Cử Hỏa Liêu Thiên Uyên — Nón

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 104
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 135 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Kỹ năng [Vân Long Kích]: +1–3 cấp | Kỹ năng [Vân Long Kích]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Liệt Hỏa Tình Thiên]: +1–3 cấp | Kỹ năng [Liệt Hỏa Tình Thiên]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +35–50% | Kháng băng: +35–50% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thâu Thiên Hoán Nhật]: +1–3 cấp | Kỹ năng [Thâu Thiên Hoán Nhật]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Vân Long Kích]: +1 cấp; +6: 95% Kỹ năng [Vân Long Kích]: +1 cấp / 5% Kỹ năng [Vân Long Kích]: +2 cấp; +7: 100% Kỹ năng [Vân Long Kích]: +2 cấp; +8: 100% Kỹ năng [Vân Long Kích]: +2 cấp; +9: 100% Kỹ năng [Vân Long Kích]: +3 cấp

###### [Thiên Tứ] Ma Sát Vân Long Thổ Châu Giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 105
- Yêu cầu: cấp 120, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng băng: +5% | Kháng băng: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Liệt Hỏa Tình Thiên]: +1 cấp; +6: 95% Kỹ năng [Liệt Hỏa Tình Thiên]: +1 cấp / 5% Kỹ năng [Liệt Hỏa Tình Thiên]: +2 cấp; +7: 100% Kỹ năng [Liệt Hỏa Tình Thiên]: +2 cấp; +8: 100% Kỹ năng [Liệt Hỏa Tình Thiên]: +2 cấp; +9: 100% Kỹ năng [Liệt Hỏa Tình Thiên]: +3 cấp

#### Bộ Ma Hoàng (số bộ 22)

- Hoàng kim (5 món): Ma Hoàng Kim Giáp Khôi (Nón) · Ma Hoàng án Xuất Hổ Hạng Khuyên (Dây chuyền) · Ma Hoàng Khê Cốc Thúc yêu đái (Đai) · Ma Hoàng Huyết Y Thú Trạc (Hộ uyển) · Ma Hoàng Đăng Đạp Ngoa (Giày)
- Thiên Tứ (5 món): Ma Hoàng Kim Giáp Khôi (Nón) · Ma Hoàng án Xuất Hổ Hạng Khuyên (Dây chuyền) · Ma Hoàng Khê Cốc Thúc Yêu Đái (Đai) · Ma Hoàng Huyết Y Thú Trạc (Hộ uyển) · Ma Hoàng Dung Kim Đoạn Nhật Giới (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Ma Hoàng Đăng Đạp Ngoa; chỉ Thiên Tứ có Ma Hoàng Dung Kim Đoạn Nhật Giới.

##### Hoàng kim — bộ Ma Hoàng

###### Ma Hoàng Kim Giáp Khôi — Nón

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 106
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Nhiếp Hồn Loạn Tâm]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Phi Hồng Vô Tích]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Bi Tô Thanh Phong]: +1–3 cấp |

###### Ma Hoàng án Xuất Hổ Hạng Khuyên — Dây chuyền

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 107
- Yêu cầu: cấp 95, môn phái Thiên Nhẫn
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Sinh khí: +30–40 điểm |
| 3 | hiện | Nội công: +12–20 điểm |
| 4 | ẩn | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Kháng lôi: +15–25% |
| 6 | ẩn | Kháng tất cả: +16–24% |

###### Ma Hoàng Khê Cốc Thúc yêu đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 108
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Lịch Ma Đoạt Hồn]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% |

###### Ma Hoàng Huyết Y Thú Trạc — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 109
- Yêu cầu: cấp 80, Sức mạnh 90, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Ma Hoàng Đăng Đạp Ngoa — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 110
- Yêu cầu: cấp 99, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% |
| 3 | hiện | Kỹ năng [Hỏa Liên Phần Hoa]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [ảo ảnh Phi Hồ]: +1–3 cấp |

##### Thiên Tứ — bộ Ma Hoàng

###### [Thiên Tứ] Ma Hoàng Kim Giáp Khôi — Nón

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 106
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Nhiếp Hồn Loạn Tâm]: +1–3 cấp | Kỹ năng [Nhiếp Hồn Loạn Tâm]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Phi Hồng Vô Tích]: +1–3 cấp | Kỹ năng [Phi Hồng Vô Tích]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Bi Tô Thanh Phong]: +1–3 cấp | Kỹ năng [Bi Tô Thanh Phong]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Ma Hoàng án Xuất Hổ Hạng Khuyên — Dây chuyền

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 107
- Yêu cầu: cấp 120, môn phái Thiên Nhẫn
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm | Sinh lực tối đa: -50 điểm → Sinh lực tối đa: +50 điểm |
| 2 | ẩn | Sinh khí: +30–40 điểm | Sinh khí: +30–40 điểm |
| 3 | hiện | Nội công: +12–20 điểm | Nội công: +12–20 điểm |
| 4 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Kháng lôi: +15–25% | Kháng lôi: +15–25% |
| 6 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Ma Hoàng Khê Cốc Thúc Yêu Đái — Đai

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 108
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Lịch Ma Đoạt Hồn]: +1–3 cấp | Kỹ năng [Lịch Ma Đoạt Hồn]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% | Thời gian trúng độc: -30–50% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Ma Hoàng Huyết Y Thú Trạc — Hộ uyển

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 109
- Yêu cầu: cấp 120, Sức mạnh 90, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 111 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng băng: +5% | Kháng băng: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Phi Hồng Vô Tích]: +1 cấp; +6: 95% Kỹ năng [Phi Hồng Vô Tích]: +1 cấp / 5% Kỹ năng [Phi Hồng Vô Tích]: +2 cấp; +7: 100% Kỹ năng [Phi Hồng Vô Tích]: +2 cấp; +8: 100% Kỹ năng [Phi Hồng Vô Tích]: +2 cấp; +9: 100% Kỹ năng [Phi Hồng Vô Tích]: +3 cấp

###### [Thiên Tứ] Ma Hoàng Dung Kim Đoạn Nhật Giới — Nhẫn

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 110
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% | Tốc độ di chuyển: +40–60% |
| 3 | hiện | Kỹ năng [Hỏa Liên Phần Hoa]: +1–3 cấp | Kỹ năng [Hỏa Liên Phần Hoa]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [ảo ảnh Phi Hồ]: +1–3 cấp | Kỹ năng [ảo ảnh Phi Hồ]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

#### Bộ Ma Thị (số bộ 23)

- Hoàng kim (5 món): Ma Thị Liệt Diệm Quán Miện (Nón) · Ma Thị Lệ Ma Phệ Tâm Liên (Dây chuyền) · Ma Thị Nghiệp Hỏa U Minh Giới (Nhẫn) · Ma Thị Huyết Ngọc Thất Sát Bội (Ngọc bội) · Ma Thị sơn  Hải Phi Hồng Lý (Giày)
- Thiên Tứ (5 món): Ma Thị Liệt Diệm Quán Miện (Nón) · Ma Thị Lệ Ma Phệ Tâm Liên (Đai) · Ma Thị Nghiệp Hỏa U Minh Giới (Nhẫn) · Ma Thị Huyết Ngọc Thất Sát Bội (Ngọc bội) · Ma Thị Sơn Hải Phi Hồng Lý (Giày)

##### Hoàng kim — bộ Ma Thị

###### Ma Thị Liệt Diệm Quán Miện — Nón

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 111
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Thiên Ngoại Lưu Tinh]: +1–3 cấp |
| 3 | hiện | Thời gian choáng: -30–50% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thiên Nhẫn Đao pháp]: +1–3 cấp |

###### Ma Thị Lệ Ma Phệ Tâm Liên — Dây chuyền

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 112
- Yêu cầu: cấp 95, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Phòng thủ vật lý: +20–25% |
| 3 | hiện | Nội lực tối đa: +300–400 điểm |
| 4 | ẩn | Kháng tất cả: +16–24% |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Ma Thị Nghiệp Hỏa U Minh Giới — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 113
- Yêu cầu: cấp 80, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Ma Thị Huyết Ngọc Thất Sát Bội — Ngọc bội

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 114
- Yêu cầu: cấp 90, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Đơn Chỉ Liệt Diệm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% |

###### Ma Thị sơn  Hải Phi Hồng Lý — Giày

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 115
- Yêu cầu: cấp 99, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% |
| 3 | hiện | Kỹ năng [Thôi sơn Điền Hải]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Ma Diệm Thất Sát]: +1–3 cấp |

##### Thiên Tứ — bộ Ma Thị

###### [Thiên Tứ] Ma Thị Liệt Diệm Quán Miện — Nón

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 111
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kỹ năng [Thiên Ngoại Lưu Tinh]: +1–3 cấp | Kỹ năng [Thiên Ngoại Lưu Tinh]: +1–3 cấp |
| 3 | hiện | Thời gian choáng: -30–50% | Thời gian choáng: -40–60% |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Thiên Nhẫn Đao pháp]: +1–3 cấp | Kỹ năng [Thiên Nhẫn Đao pháp]: +1–3 cấp |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #867 白金天忍魔3: Kỹ năng [Thiên Ngoại Lưu Tinh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Ma Diệm Thất Sát]: +1 cấp; +6: 95% Kỹ năng [Ma Diệm Thất Sát]: +1 cấp / 5% Kỹ năng [Ma Diệm Thất Sát]: +2 cấp; +7: 100% Kỹ năng [Ma Diệm Thất Sát]: +2 cấp; +8: 100% Kỹ năng [Ma Diệm Thất Sát]: +2 cấp; +9: 100% Kỹ năng [Ma Diệm Thất Sát]: +3 cấp

###### [Thiên Tứ] Ma Thị Lệ Ma Phệ Tâm Liên — Đai (bản hoàng kim cùng tên là Dây chuyền — bảng mod lệch ô 🟡)

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 112
- Yêu cầu: cấp 120, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 3 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +300–400 điểm |
| 4 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Ngoại Lưu Tinh]: +1 cấp; +6: 95% Kỹ năng [Thiên Ngoại Lưu Tinh]: +1 cấp / 5% Kỹ năng [Thiên Ngoại Lưu Tinh]: +2 cấp; +7: 100% Kỹ năng [Thiên Ngoại Lưu Tinh]: +2 cấp; +8: 100% Kỹ năng [Thiên Ngoại Lưu Tinh]: +2 cấp; +9: 100% Kỹ năng [Thiên Ngoại Lưu Tinh]: +3 cấp

###### [Thiên Tứ] Ma Thị Nghiệp Hỏa U Minh Giới — Nhẫn

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 113
- Yêu cầu: cấp 120, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng băng: +5% | Kháng băng: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #883 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #882 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thôi sơn Điền Hải]: +1 cấp; +6: 95% Kỹ năng [Thôi sơn Điền Hải]: +1 cấp / 5% Kỹ năng [Thôi sơn Điền Hải]: +2 cấp; +7: 100% Kỹ năng [Thôi sơn Điền Hải]: +2 cấp; +8: 100% Kỹ năng [Thôi sơn Điền Hải]: +2 cấp; +9: 100% Kỹ năng [Thôi sơn Điền Hải]: +3 cấp

###### [Thiên Tứ] Ma Thị Huyết Ngọc Thất Sát Bội — Ngọc bội

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 114
- Yêu cầu: cấp 120, môn phái Thiên Nhẫn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Đơn Chỉ Liệt Diệm]: +1–3 cấp | Kỹ năng [Đơn Chỉ Liệt Diệm]: +1–3 cấp |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian trúng độc: -30–50% | Thời gian trúng độc: -40–60% |

- Kỹ năng ở +6: #791 白金天忍魔1: Xác suất khiến cho đối phương hoảng loạn [Ma Âm Phệ Phách] +5%
- Kỹ năng ở +10: #823 白金天忍魔2: Kỹ năng [Thiên Ngoại Lưu Tinh]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Hỏa sát - nội công: +100 điểm; +6: 95% Hỏa sát - nội công: +100 điểm / 5% Hỏa sát - nội công: +150 điểm; +7: 100% Hỏa sát - nội công: +150 điểm; +8: 100% Hỏa sát - nội công: +150 điểm; +9: 100% Hỏa sát - nội công: +250 điểm

###### [Thiên Tứ] Ma Thị Sơn Hải Phi Hồng Lý — Giày

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 115
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Thiên Nhẫn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Tốc độ di chuyển: +40–60% | Tốc độ di chuyển: +50–70% |
| 3 | hiện | Kỹ năng [Thôi sơn Điền Hải]: +1–3 cấp | Kỹ năng [Thôi sơn Điền Hải]: +1–3 cấp |
| 4 | ẩn | Kháng băng: +25–30% | Kháng băng: +30–35% |
| 5 | hiện | Hỏa sát - nội công: +100–200 điểm | Hỏa sát - nội công: +350–400 điểm |
| 6 | ẩn | Kỹ năng [Ma Diệm Thất Sát]: +1–3 cấp | Kỹ năng [Ma Diệm Thất Sát]: +1–3 cấp |

- Kỹ năng ở +6: #773 白金内火2: Hỏa sát - nội công: +50 điểm
- Kỹ năng ở +10: #805 白金内火4: Hỏa sát - nội công: +100 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Hỏa sát - nội công: +50 điểm / 5% Hỏa sát - nội công: +100 điểm; +6: 50% Hỏa sát - nội công: +50 điểm / 50% Hỏa sát - nội công: +100 điểm; +7: 100% Hỏa sát - nội công: +100 điểm; +8: 50% Hỏa sát - nội công: +100 điểm / 50% Hỏa sát - nội công: +200 điểm; +9: 100% Hỏa sát - nội công: +200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Ngoại Lưu Tinh]: +1 cấp; +6: 95% Kỹ năng [Thiên Ngoại Lưu Tinh]: +1 cấp / 5% Kỹ năng [Thiên Ngoại Lưu Tinh]: +2 cấp; +7: 100% Kỹ năng [Thiên Ngoại Lưu Tinh]: +2 cấp; +8: 100% Kỹ năng [Thiên Ngoại Lưu Tinh]: +2 cấp; +9: 100% Kỹ năng [Thiên Ngoại Lưu Tinh]: +3 cấp

### Võ Đang

#### Bộ Lăng Nhạc (số bộ 24)

- Hoàng kim (5 món): Lăng Nhạc Thái Cực Kiếm (Vũ khí) · Lăng Nhạc Vô Ngã đạo bào (Áo) · Lăng Nhạc Nộ Lôi Giới (Nhẫn) · Lăng Nhạc Vô Cực Huyền Ngọc Bội (Ngọc bội) · Lăng Nhạc Thiên Địa Huyền Hoàng giới (Nhẫn)
- Thiên Tứ (5 món): Lăng Nhạc Thái Cực Kiếm (Vũ khí) · Lăng Nhạc Vô Ngã Thúc Đái (Đai) · Lăng Nhạc Nộ Lôi Pháp Giới (Nhẫn) · Lăng Nhạc Vô Cực Huyền Ngọc Bội (Ngọc bội) · Lăng Nhạc Thiên Địa Huyền Hoàng Giới (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Lăng Nhạc Vô Ngã đạo bào, Lăng Nhạc Nộ Lôi Giới; chỉ Thiên Tứ có Lăng Nhạc Vô Ngã Thúc Đái, Lăng Nhạc Nộ Lôi Pháp Giới.

##### Hoàng kim — bộ Lăng Nhạc

###### Lăng Nhạc Thái Cực Kiếm — Vũ khí

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×3 · `goldequip.txt` dòng 116
- Yêu cầu: cấp 90, Sức mạnh 80, môn phái Võ Đang
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 86 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Lôi sát - nội công: +200–300 điểm |
| 3 | hiện | Nội lực tối đa: +120–200 điểm |
| 4 | ẩn | Kháng hỏa: +25–30% |
| 5 | hiện | Thời gian choáng: -30–50% |
| 6 | ẩn | Kỹ năng [Thái Cực Thần Công]: +1–3 cấp |

###### Lăng Nhạc Vô Ngã đạo bào — Áo

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 117
- Yêu cầu: cấp 95, Sức mạnh 130, môn phái Võ Đang
- Cơ bản: Né tránh: 630 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Võ Đang Quyền Pháp]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Tọa Vọng Vô Ngã]: +1–3 cấp |

###### Lăng Nhạc Nộ Lôi Giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 118
- Yêu cầu: cấp 85, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Nộ Lôi Chỉ]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% |

###### Lăng Nhạc Vô Cực Huyền Ngọc Bội — Ngọc bội

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 119
- Yêu cầu: cấp 99, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Thiên Địa Vô Cực]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Bác Cấp Nhi Phục]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kỹ năng [Vô Ngã Vô Kiếm]: +1–3 cấp |

###### Lăng Nhạc Thiên Địa Huyền Hoàng giới — Nhẫn

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 120
- Yêu cầu: cấp 80, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Lăng Nhạc

###### [Thiên Tứ] Lăng Nhạc Thái Cực Kiếm — Vũ khí

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 1×3 · `platinaequip.txt` dòng 116
- Yêu cầu: cấp 120, Sức mạnh 80, môn phái Võ Đang
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 86 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Lôi sát - nội công: +200–300 điểm | Lôi sát - nội công: +500–600 điểm |
| 3 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 4 | ẩn | Kháng hỏa: +25–30% | Kháng hỏa: +30–35% |
| 5 | hiện | Thời gian choáng: -30–50% | Thời gian choáng: -40–50% |
| 6 | ẩn | Kỹ năng [Thái Cực Thần Công]: +1–3 cấp | Kỹ năng [Thái Cực Thần Công]: +1–3 cấp |

- Kỹ năng ở +6: #774 白金内雷1: Lôi sát - nội công: +70 điểm
- Kỹ năng ở +10: #806 白金内雷2: Lôi sát - nội công: +120 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Lôi sát - nội công: +70 điểm / 5% Lôi sát - nội công: +150 điểm; +6: 50% Lôi sát - nội công: +70 điểm / 50% Lôi sát - nội công: +150 điểm; +7: 100% Lôi sát - nội công: +150 điểm; +8: 50% Lôi sát - nội công: +150 điểm / 50% Lôi sát - nội công: +250 điểm; +9: 100% Lôi sát - nội công: +250 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Địa Vô Cực]: +1 cấp; +6: 95% Kỹ năng [Thiên Địa Vô Cực]: +1 cấp / 5% Kỹ năng [Thiên Địa Vô Cực]: +2 cấp; +7: 100% Kỹ năng [Thiên Địa Vô Cực]: +2 cấp; +8: 100% Kỹ năng [Thiên Địa Vô Cực]: +2 cấp; +9: 100% Kỹ năng [Thiên Địa Vô Cực]: +3 cấp

###### [Thiên Tứ] Lăng Nhạc Vô Ngã Thúc Đái — Đai

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 117
- Yêu cầu: cấp 120, Sức mạnh 130, môn phái Võ Đang
- Cơ bản: Né tránh: 630 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Võ Đang Quyền Pháp]: +1–3 cấp | Kỹ năng [Võ Đang Quyền Pháp]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Tọa Vọng Vô Ngã]: +1–3 cấp | Kỹ năng [Tọa Vọng Vô Ngã]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Địa Vô Cực]: +1 cấp; +6: 95% Kỹ năng [Thiên Địa Vô Cực]: +1 cấp / 5% Kỹ năng [Thiên Địa Vô Cực]: +2 cấp; +7: 100% Kỹ năng [Thiên Địa Vô Cực]: +2 cấp; +8: 100% Kỹ năng [Thiên Địa Vô Cực]: +2 cấp; +9: 100% Kỹ năng [Thiên Địa Vô Cực]: +3 cấp

###### [Thiên Tứ] Lăng Nhạc Nộ Lôi Pháp Giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 118
- Yêu cầu: cấp 120, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Nộ Lôi Chỉ]: +1–3 cấp | Kỹ năng [Nộ Lôi Chỉ]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% | Kháng độc: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |

- Kỹ năng ở +6: #795 白金武当气1: Giảm [Xuất ứ Bất Nhiễm] thời gian xuất chiêu: 3 giây
- Kỹ năng ở +10: #827 白金武当气2: Kỹ năng [Thiên Địa Vô Cực]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +500 điểm / 5% Sinh lực tối đa: +700 điểm; +6: 50% Sinh lực tối đa: +500 điểm / 50% Sinh lực tối đa: +700 điểm; +7: 100% Sinh lực tối đa: +700 điểm; +8: 50% Sinh lực tối đa: +700 điểm / 50% Sinh lực tối đa: +1000 điểm; +9: 100% Sinh lực tối đa: +1000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bác Cấp Nhi Phục]: +1 cấp; +6: 95% Kỹ năng [Bác Cấp Nhi Phục]: +1 cấp / 5% Kỹ năng [Bác Cấp Nhi Phục]: +2 cấp; +7: 100% Kỹ năng [Bác Cấp Nhi Phục]: +2 cấp; +8: 100% Kỹ năng [Bác Cấp Nhi Phục]: +2 cấp; +9: 100% Kỹ năng [Bác Cấp Nhi Phục]: +3 cấp

###### [Thiên Tứ] Lăng Nhạc Vô Cực Huyền Ngọc Bội — Ngọc bội

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 119
- Yêu cầu: cấp 120, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kỹ năng [Thiên Địa Vô Cực]: +1–3 cấp | Kỹ năng [Thiên Địa Vô Cực]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Bác Cấp Nhi Phục]: +1–3 cấp | Kỹ năng [Bác Cấp Nhi Phục]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% | Kháng độc: +30–35% |
| 5 | hiện | Lôi sát - nội công: +120–200 điểm | Lôi sát - nội công: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Vô Ngã Vô Kiếm]: +1–3 cấp | Kỹ năng [Vô Ngã Vô Kiếm]: +1–3 cấp |

- Kỹ năng ở +6: #847 白金加内1: Nội lực tối đa: +20%
- Kỹ năng ở +10: #871 白金武当气3: Kỹ năng [Thiên Địa Vô Cực]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +500 điểm / 5% Sinh lực tối đa: +700 điểm; +6: 50% Sinh lực tối đa: +500 điểm / 50% Sinh lực tối đa: +700 điểm; +7: 100% Sinh lực tối đa: +700 điểm; +8: 50% Sinh lực tối đa: +700 điểm / 50% Sinh lực tối đa: +1000 điểm; +9: 100% Sinh lực tối đa: +1000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Lôi sát - nội công: +120 điểm; +6: 95% Lôi sát - nội công: +120 điểm / 5% Lôi sát - nội công: +200 điểm; +7: 100% Lôi sát - nội công: +200 điểm; +8: 100% Lôi sát - nội công: +200 điểm; +9: 100% Lôi sát - nội công: +300 điểm

###### [Thiên Tứ] Lăng Nhạc Thiên Địa Huyền Hoàng Giới — Nhẫn

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 120
- Yêu cầu: cấp 120, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng độc: +5% | Kháng độc: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +500 điểm / 5% Sinh lực tối đa: +700 điểm; +6: 50% Sinh lực tối đa: +500 điểm / 50% Sinh lực tối đa: +700 điểm; +7: 100% Sinh lực tối đa: +700 điểm; +8: 50% Sinh lực tối đa: +700 điểm / 50% Sinh lực tối đa: +1000 điểm; +9: 100% Sinh lực tối đa: +1000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Vô Ngã Vô Kiếm]: +1 cấp; +6: 95% Kỹ năng [Vô Ngã Vô Kiếm]: +1 cấp / 5% Kỹ năng [Vô Ngã Vô Kiếm]: +2 cấp; +7: 100% Kỹ năng [Vô Ngã Vô Kiếm]: +2 cấp; +8: 100% Kỹ năng [Vô Ngã Vô Kiếm]: +2 cấp; +9: 100% Kỹ năng [Vô Ngã Vô Kiếm]: +3 cấp

#### Bộ Cập Phong (số bộ 25)

- Hoàng kim (5 món): Cập Phong Chân Vũ Kiếm (Vũ khí) · Cập Phong Tam Thanh Phù (Dây chuyền) · Cập Phong Huyền Ti Tam Đoạn cẩm (Đai) · Cập Phong Thúy Ngọc Huyền Hoàng Bội (Ngọc bội) · Cập Phong Thanh Tùng Pháp giới (Nhẫn)
- Thiên Tứ (5 món): Cập Phong Chân Vũ Kiếm (Vũ khí) · Cập Phong Tam Thanh Phù (Dây chuyền) · Cập Phong Huyền Ti Tam Đoạn Cẩm (Đai) · Cập Phong Thúy Ngọc Huyền Hoàng Uyển (Hộ uyển) · Cập Phong Thanh Tùng Pháp Giới (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Cập Phong Thúy Ngọc Huyền Hoàng Bội; chỉ Thiên Tứ có Cập Phong Thúy Ngọc Huyền Hoàng Uyển.

##### Hoàng kim — bộ Cập Phong

###### Cập Phong Chân Vũ Kiếm — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×3 · `goldequip.txt` dòng 121
- Yêu cầu: cấp 99, Sức mạnh 135, môn phái Võ Đang
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 86 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 3 | hiện | Tỉ lệ công kích chính xác: +240–360 điểm |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +25–40% |
| 6 | ẩn | Kỹ năng [Thái Cực Thần Công]: +1–3 cấp |

###### Cập Phong Tam Thanh Phù — Dây chuyền

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 122
- Yêu cầu: cấp 95, môn phái Võ Đang
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng băng: +20–30% |
| 3 | hiện | Nội công: +12–20 điểm |
| 4 | ẩn | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Kháng lôi: +35–50% |
| 6 | ẩn | Kháng tất cả: +16–24% |

###### Cập Phong Huyền Ti Tam Đoạn cẩm — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 123
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Võ Đang
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Tam Hoàn Thao Nguyệt]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm |
| 6 | ẩn | Tấn công chí mạng: 3–5% |

###### Cập Phong Thúy Ngọc Huyền Hoàng Bội — Ngọc bội

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 124
- Yêu cầu: cấp 90, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Nhân Kiếm Hợp Nhất]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Võ Đang Kiếm pháp]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thương Hải Minh Nguyệt]: +1–3 cấp |

###### Cập Phong Thanh Tùng Pháp giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 125
- Yêu cầu: cấp 80, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Cập Phong

###### [Thiên Tứ] Cập Phong Chân Vũ Kiếm — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×3 · `platinaequip.txt` dòng 121
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Võ Đang
- Cơ bản: Sát thương nhỏ nhất: 46 điểm · Sát thương lớn nhất: 86 điểm · Tỉ lệ công kích chính xác: +0% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 3 | hiện | Tỉ lệ công kích chính xác: +240–360 điểm | Tỉ lệ công kích chính xác: +500–600 điểm |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 6 | ẩn | Kỹ năng [Thái Cực Thần Công]: +1–3 cấp | Kỹ năng [Thái Cực Thần Công]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Cập Phong Tam Thanh Phù — Dây chuyền

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 122
- Yêu cầu: cấp 120, môn phái Võ Đang
- Cơ bản: Độ bền: 60 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kháng độc: +10–20% | Kháng độc: +20–30% |
| 3 | hiện | Nội công: +12–20 điểm | Nội công: +22–30 điểm |
| 4 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +20–30% |
| 5 | hiện | Kháng lôi: +35–50% | Kháng lôi: +40–55% |
| 6 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |

- Kỹ năng ở +6: #850 白金加内2: Nội lực tối đa: +20%
- Kỹ năng ở +10: #870 白金武当剑3: Kỹ năng [Nhân Kiếm Hợp Nhất]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +500 điểm / 5% Sinh lực tối đa: +700 điểm; +6: 50% Sinh lực tối đa: +500 điểm / 50% Sinh lực tối đa: +700 điểm; +7: 100% Sinh lực tối đa: +700 điểm; +8: 50% Sinh lực tối đa: +700 điểm / 50% Sinh lực tối đa: +1000 điểm; +9: 100% Sinh lực tối đa: +1000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Tam Hoàn Thao Nguyệt]: +1 cấp; +6: 95% Kỹ năng [Tam Hoàn Thao Nguyệt]: +1 cấp / 5% Kỹ năng [Tam Hoàn Thao Nguyệt]: +2 cấp; +7: 100% Kỹ năng [Tam Hoàn Thao Nguyệt]: +2 cấp; +8: 100% Kỹ năng [Tam Hoàn Thao Nguyệt]: +2 cấp; +9: 100% Kỹ năng [Tam Hoàn Thao Nguyệt]: +3 cấp

###### [Thiên Tứ] Cập Phong Huyền Ti Tam Đoạn Cẩm — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 123
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Võ Đang
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Tam Hoàn Thao Nguyệt]: +1–3 cấp | Kỹ năng [Tam Hoàn Thao Nguyệt]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +200–300 điểm | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Tấn công chí mạng: 3–5% | Tấn công chí mạng: 5–7% |

- Kỹ năng ở +6: #794 白金武当剑1: Giảm [Xuất ứ Bất Nhiễm] thời gian xuất chiêu: 3 giây
- Kỹ năng ở +10: #826 白金武当剑2: Kỹ năng [Nhân Kiếm Hợp Nhất]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +500 điểm / 5% Sinh lực tối đa: +700 điểm; +6: 50% Sinh lực tối đa: +500 điểm / 50% Sinh lực tối đa: +700 điểm; +7: 100% Sinh lực tối đa: +700 điểm; +8: 50% Sinh lực tối đa: +700 điểm / 50% Sinh lực tối đa: +1000 điểm; +9: 100% Sinh lực tối đa: +1000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Nhân Kiếm Hợp Nhất]: +1 cấp; +6: 95% Kỹ năng [Nhân Kiếm Hợp Nhất]: +1 cấp / 5% Kỹ năng [Nhân Kiếm Hợp Nhất]: +2 cấp; +7: 100% Kỹ năng [Nhân Kiếm Hợp Nhất]: +2 cấp; +8: 100% Kỹ năng [Nhân Kiếm Hợp Nhất]: +2 cấp; +9: 100% Kỹ năng [Nhân Kiếm Hợp Nhất]: +3 cấp

###### [Thiên Tứ] Cập Phong Thúy Ngọc Huyền Hoàng Uyển — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 124
- Yêu cầu: cấp 120, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Nhân Kiếm Hợp Nhất]: +1–3 cấp | Kỹ năng [Nhân Kiếm Hợp Nhất]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Võ Đang Kiếm pháp]: +1–3 cấp | Kỹ năng [Võ Đang Kiếm pháp]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thương Hải Minh Nguyệt]: +1–3 cấp | Kỹ năng [Thương Hải Minh Nguyệt]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Nhân Kiếm Hợp Nhất]: +1 cấp; +6: 95% Kỹ năng [Nhân Kiếm Hợp Nhất]: +1 cấp / 5% Kỹ năng [Nhân Kiếm Hợp Nhất]: +2 cấp; +7: 100% Kỹ năng [Nhân Kiếm Hợp Nhất]: +2 cấp; +8: 100% Kỹ năng [Nhân Kiếm Hợp Nhất]: +2 cấp; +9: 100% Kỹ năng [Nhân Kiếm Hợp Nhất]: +3 cấp

###### [Thiên Tứ] Cập Phong Thanh Tùng Pháp Giới — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 125
- Yêu cầu: cấp 120, môn phái Võ Đang
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng độc: +5% | Kháng độc: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +500 điểm / 5% Sinh lực tối đa: +700 điểm; +6: 50% Sinh lực tối đa: +500 điểm / 50% Sinh lực tối đa: +700 điểm; +7: 100% Sinh lực tối đa: +700 điểm; +8: 50% Sinh lực tối đa: +700 điểm / 50% Sinh lực tối đa: +1000 điểm; +9: 100% Sinh lực tối đa: +1000 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Kiếm Phi Kinh Thiên]: +1 cấp; +6: 95% Kỹ năng [Kiếm Phi Kinh Thiên]: +1 cấp / 5% Kỹ năng [Kiếm Phi Kinh Thiên]: +2 cấp; +7: 100% Kỹ năng [Kiếm Phi Kinh Thiên]: +2 cấp; +8: 100% Kỹ năng [Kiếm Phi Kinh Thiên]: +2 cấp; +9: 100% Kỹ năng [Kiếm Phi Kinh Thiên]: +3 cấp

### Côn Lôn

#### Bộ Sương Tinh (số bộ 26)

- Hoàng kim (5 món): Sương Tinh Thiên Niên Hàn Thiết (Vũ khí) · Sương Tinh Ngạo Sương đạo bào (Áo) · Sương Tinh Thanh Phong Lũ đái (Đai) · Sương Tinh Thiên Tinh Băng Tinh thủ (Hộ uyển) · Sương Tinh Phong Bạo chỉ hoàn (Nhẫn)
- Thiên Tứ (5 món): Sương Tinh Thiên Niên Hàn Thiết (Vũ khí) · Sương Tinh Lưu Tinh Cản Nguyệt Khấu (Ngọc bội) · Sương Tinh Thanh Phong Lũ Đái (Đai) · Sương Tinh Thiên Thanh Băng Tinh Thủ (Hộ uyển) · Sương Tinh Phong Bạo Chỉ Hoàn (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Sương Tinh Ngạo Sương đạo bào, Sương Tinh Thiên Tinh Băng Tinh thủ; chỉ Thiên Tứ có Sương Tinh Lưu Tinh Cản Nguyệt Khấu, Sương Tinh Thiên Thanh Băng Tinh Thủ.

##### Hoàng kim — bộ Sương Tinh

###### Sương Tinh Thiên Niên Hàn Thiết — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `goldequip.txt` dòng 126
- Yêu cầu: cấp 99, Sức mạnh 135, môn phái Côn Lôn
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Hút nội lực: +4–8% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +25–40% |
| 6 | ẩn | Kỹ năng [Sương Ngạo Côn Lôn]: +1–3 cấp |

###### Sương Tinh Ngạo Sương đạo bào — Áo

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×3 · `goldequip.txt` dòng 127
- Yêu cầu: cấp 95, Sức mạnh 260, môn phái Côn Lôn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Côn Lôn Đao pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thiên Thanh Địa Trọc]: +1–3 cấp |

###### Sương Tinh Thanh Phong Lũ đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 128
- Yêu cầu: cấp 85, Sức mạnh 135, môn phái Côn Lôn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Hô Phong Pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% |

###### Sương Tinh Thiên Tinh Băng Tinh thủ — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 129
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Nhất Khí Tam Thanh]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Cuồng Phong Sậu Điện]: +1–3 cấp |

###### Sương Tinh Phong Bạo chỉ hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 130
- Yêu cầu: cấp 80, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Sương Tinh

###### [Thiên Tứ] Sương Tinh Thiên Niên Hàn Thiết — Vũ khí

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×4 · `platinaequip.txt` dòng 126
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Côn Lôn
- Cơ bản: Sát thương nhỏ nhất: 40 điểm · Sát thương lớn nhất: 114 điểm · Tỉ lệ công kích chính xác: -20% · Độ bền: 99 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Hút nội lực: +4–8% | Hút nội lực: +6–10% |
| 2 | ẩn | Sát thương vật lý - ngoại công: +30–50 điểm | Sát thương vật lý - ngoại công: +60–70 điểm |
| 3 | hiện | Sát thương vật lý - ngoại công: +50–100% | Sát thương vật lý - ngoại công: +160–200% |
| 4 | ẩn | Băng sát - ngoại công: +80–120 điểm | Băng sát - ngoại công: +80–120 điểm |
| 5 | hiện | Tốc độ đánh - ngoại công: +25–40% | Tốc độ đánh - ngoại công: +25–40% |
| 6 | ẩn | Kỹ năng [Sương Ngạo Côn Lôn]: +1–3 cấp | Kỹ năng [Sương Ngạo Côn Lôn]: +1–3 cấp |

- Kỹ năng ở +6: #766 白金外普1: Sát thương vật lý - ngoại công: +30%
- Kỹ năng ở +10: #767 白金外普2: Sát thương vật lý - ngoại công: +10 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Sát thương vật lý: 30% / 5% Sát thương vật lý: 40%; +6: 50% Sát thương vật lý: 30% / 50% Sát thương vật lý: 40%; +7: 100% Sát thương vật lý: 40%; +8: 50% Sát thương vật lý: 40% / 50% Sát thương vật lý: 50%; +9: 100% Sát thương vật lý: 50%
- Dòng thêm 2 khi cường hóa: +5: 3% Sát thương vật lý - ngoại công: +10 điểm; +6: 95% Sát thương vật lý - ngoại công: +10 điểm / 5% Sát thương vật lý - ngoại công: +20 điểm; +7: 100% Sát thương vật lý - ngoại công: +20 điểm; +8: 100% Sát thương vật lý - ngoại công: +20 điểm; +9: 100% Sát thương vật lý - ngoại công: +30 điểm

###### [Thiên Tứ] Sương Tinh Lưu Tinh Cản Nguyệt Khấu — Ngọc bội

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 127
- Yêu cầu: cấp 120, Sức mạnh 260, môn phái Côn Lôn
- Cơ bản: Né tránh: 720 điểm · Độ bền: 90 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian phục hồi: -40–50 | Thời gian phục hồi: -40–50 |
| 3 | hiện | Kỹ năng [Côn Lôn Đao pháp]: +1–3 cấp | Kỹ năng [Côn Lôn Đao pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +20–25% | Phòng thủ vật lý: +20–25% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Thiên Thanh Địa Trọc]: +1–3 cấp | Kỹ năng [Thiên Thanh Địa Trọc]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1 cấp; +6: 95% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1 cấp / 5% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +2 cấp; +7: 100% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +2 cấp; +8: 100% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +2 cấp; +9: 100% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +3 cấp

###### [Thiên Tứ] Sương Tinh Thanh Phong Lũ Đái — Đai

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 128
- Yêu cầu: cấp 120, Sức mạnh 135, môn phái Côn Lôn
- Cơ bản: Né tránh: 160 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Hô Phong Pháp]: +1–3 cấp | Kỹ năng [Hô Phong Pháp]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |

- Kỹ năng ở +6: #797 白金昆仑刀1: Xác suất phát chiêu [Lưỡng Nghi Chân Khí] +5%
- Kỹ năng ở +10: #829 白金昆仑刀2: Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +600 điểm / 5% Sinh lực tối đa: +800 điểm; +6: 50% Sinh lực tối đa: +600 điểm / 50% Sinh lực tối đa: +800 điểm; +7: 100% Sinh lực tối đa: +800 điểm; +8: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +9: 100% Sinh lực tối đa: +1200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1 cấp; +6: 95% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1 cấp / 5% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +2 cấp; +7: 100% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +2 cấp; +8: 100% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +2 cấp; +9: 100% Kỹ năng [Ngạo Tuyết Tiêu Phong]: +3 cấp

###### [Thiên Tứ] Sương Tinh Thiên Thanh Băng Tinh Thủ — Hộ uyển

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 129
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +240–300 điểm |
| 2 | ẩn | Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1–3 cấp | Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Nhất Khí Tam Thanh]: +1–3 cấp | Kỹ năng [Nhất Khí Tam Thanh]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% | Kháng độc: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Kỹ năng [Cuồng Phong Sậu Điện]: +1–3 cấp | Kỹ năng [Cuồng Phong Sậu Điện]: +1–3 cấp |

- Kỹ năng ở +6: #846 白金加血1: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #873 白金昆仑刀3: Kỹ năng [Ngạo Tuyết Tiêu Phong]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +600 điểm / 5% Sinh lực tối đa: +800 điểm; +6: 50% Sinh lực tối đa: +600 điểm / 50% Sinh lực tối đa: +800 điểm; +7: 100% Sinh lực tối đa: +800 điểm; +8: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +9: 100% Sinh lực tối đa: +1200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Hô Phong Pháp]: +1 cấp; +6: 95% Kỹ năng [Hô Phong Pháp]: +1 cấp / 5% Kỹ năng [Hô Phong Pháp]: +2 cấp; +7: 100% Kỹ năng [Hô Phong Pháp]: +2 cấp; +8: 100% Kỹ năng [Hô Phong Pháp]: +2 cấp; +9: 100% Kỹ năng [Hô Phong Pháp]: +3 cấp

###### [Thiên Tứ] Sương Tinh Phong Bạo Chỉ Hoàn — Nhẫn

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 130
- Yêu cầu: cấp 120, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng độc: +5% | Kháng độc: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #879 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #878 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +600 điểm / 5% Sinh lực tối đa: +800 điểm; +6: 50% Sinh lực tối đa: +600 điểm / 50% Sinh lực tối đa: +800 điểm; +7: 100% Sinh lực tối đa: +800 điểm; +8: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +9: 100% Sinh lực tối đa: +1200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Nhất Khí Tam Thanh]: +1 cấp; +6: 95% Kỹ năng [Nhất Khí Tam Thanh]: +1 cấp / 5% Kỹ năng [Nhất Khí Tam Thanh]: +2 cấp; +7: 100% Kỹ năng [Nhất Khí Tam Thanh]: +2 cấp; +8: 100% Kỹ năng [Nhất Khí Tam Thanh]: +2 cấp; +9: 100% Kỹ năng [Nhất Khí Tam Thanh]: +3 cấp

#### Bộ Lôi Khung (số bộ 27)

- Hoàng kim (5 món): Lôi Khung Hàn Tung Băng Bạch quan (Nón) · Lôi Khung Thiên Địa Hộ phù (Dây chuyền) · Lôi Khung Phong Lôi Thanh Cẩm đái (Đai) · Lôi Khung Linh Ngọc Uẩn Lôi (Ngọc bội) · Lôi Khung Cửu Thiên Dẫn Lôi giới (Nhẫn)
- Thiên Tứ (5 món): Lôi Khung Hàn Tùng Băng Bạch Quan (Nón) · Lôi Khung Thiên Địa Hộ Phù (Dây chuyền) · Lôi Khung Phong Lôi Thanh Cẩm Đái (Đai) · Lôi Khung Linh Ngọc Uẩn Lôi (Hộ uyển) · Lôi Khung Cửu Thiên Dẫn Lôi Giới (Nhẫn)
- Khác món giữa hai bản: chỉ hoàng kim có Lôi Khung Hàn Tung Băng Bạch quan; chỉ Thiên Tứ có Lôi Khung Hàn Tùng Băng Bạch Quan.

##### Hoàng kim — bộ Lôi Khung

###### Lôi Khung Hàn Tung Băng Bạch quan — Nón

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 131
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Lôi sát - nội công: +200–300 điểm |
| 4 | ẩn | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Côn Lôn Kiếm pháp]: +1–3 cấp |

###### Lôi Khung Thiên Địa Hộ phù — Dây chuyền

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 132
- Yêu cầu: cấp 99, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Phòng thủ vật lý: +15–25% |
| 3 | hiện | Thời gian trúng độc: -25–40% |
| 4 | ẩn | Kháng tất cả: +16–24% |
| 5 | hiện | Kháng độc: +20–25% |
| 6 | ẩn | Kỹ năng [Thiên Thanh Địa Trọc]: +1–3 cấp |

###### Lôi Khung Phong Lôi Thanh Cẩm đái — Đai

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 133
- Yêu cầu: cấp 90, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Cuồng Lôi Chấn Địa]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +30–50% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% |

###### Lôi Khung Linh Ngọc Uẩn Lôi — Ngọc bội

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 134
- Yêu cầu: cấp 85, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Lôi động Cửu Thiên]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Thiên Tế Tấn Lôi]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Ngũ Lôi Chánh Pháp]: +1–3 cấp |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Lôi Khung Cửu Thiên Dẫn Lôi giới — Nhẫn

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 135
- Yêu cầu: cấp 80, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

##### Thiên Tứ — bộ Lôi Khung

###### [Thiên Tứ] Lôi Khung Hàn Tùng Băng Bạch Quan — Nón

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 131
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +450–500 điểm |
| 2 | ẩn | Tốc độ đánh - nội công: +20–40% | Tốc độ đánh - nội công: +20–40% |
| 3 | hiện | Lôi sát - nội công: +200–300 điểm | Lôi sát - nội công: +700–800 điểm |
| 4 | ẩn | Kháng độc: +25–30% | Kháng độc: +30–35% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +350–400 điểm |
| 6 | ẩn | Kỹ năng [Côn Lôn Kiếm pháp]: +1–3 cấp | Kỹ năng [Côn Lôn Kiếm pháp]: +1–3 cấp |

- Kỹ năng ở +6: #774 白金内雷1: Lôi sát - nội công: +70 điểm
- Kỹ năng ở +10: #806 白金内雷2: Lôi sát - nội công: +120 điểm
- Dòng thêm 1 khi cường hóa: +5: 95% Lôi sát - nội công: +70 điểm / 5% Lôi sát - nội công: +150 điểm; +6: 50% Lôi sát - nội công: +70 điểm / 50% Lôi sát - nội công: +150 điểm; +7: 100% Lôi sát - nội công: +150 điểm; +8: 50% Lôi sát - nội công: +150 điểm / 50% Lôi sát - nội công: +250 điểm; +9: 100% Lôi sát - nội công: +250 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Lôi sát - nội công: +120 điểm; +6: 95% Lôi sát - nội công: +120 điểm / 5% Lôi sát - nội công: +200 điểm; +7: 100% Lôi sát - nội công: +200 điểm; +8: 100% Lôi sát - nội công: +200 điểm; +9: 100% Lôi sát - nội công: +300 điểm

###### [Thiên Tứ] Lôi Khung Thiên Địa Hộ Phù — Dây chuyền

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 132
- Yêu cầu: cấp 120, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +420–500 điểm |
| 2 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +20–30% |
| 3 | hiện | Thời gian trúng độc: -25–40% | Thời gian trúng độc: -50–60% |
| 4 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |
| 5 | hiện | Kháng độc: +20–25% | Kháng độc: +25–30% |
| 6 | ẩn | Kỹ năng [Thiên Thanh Địa Trọc]: +1–3 cấp | Kỹ năng [Thiên Thanh Địa Trọc]: +1–3 cấp |

- Kỹ năng ở +6: #848 白金加血2: Sinh lực tối đa: +20%
- Kỹ năng ở +10: #872 白金昆仑剑3: Kỹ năng [Lôi động Cửu Thiên]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +600 điểm / 5% Sinh lực tối đa: +800 điểm; +6: 50% Sinh lực tối đa: +600 điểm / 50% Sinh lực tối đa: +800 điểm; +7: 100% Sinh lực tối đa: +800 điểm; +8: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +9: 100% Sinh lực tối đa: +1200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Lôi động Cửu Thiên]: +1 cấp; +6: 95% Kỹ năng [Lôi động Cửu Thiên]: +1 cấp / 5% Kỹ năng [Lôi động Cửu Thiên]: +2 cấp; +7: 100% Kỹ năng [Lôi động Cửu Thiên]: +2 cấp; +8: 100% Kỹ năng [Lôi động Cửu Thiên]: +2 cấp; +9: 100% Kỹ năng [Lôi động Cửu Thiên]: +3 cấp

###### [Thiên Tứ] Lôi Khung Phong Lôi Thanh Cẩm Đái — Đai

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 133
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -50–60% |
| 3 | hiện | Kỹ năng [Cuồng Lôi Chấn Địa]: +1–3 cấp | Kỹ năng [Cuồng Lôi Chấn Địa]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +30–50% | Kháng độc: +35–55% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +240–300 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -40–50% |

- Kỹ năng ở +6: #796 白金昆仑剑1: Xác suất phát chiêu [Lưỡng Nghi Chân Khí] +5%
- Kỹ năng ở +10: #828 白金昆仑剑2: Kỹ năng [Lôi động Cửu Thiên]: +1 cấp
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +600 điểm / 5% Sinh lực tối đa: +800 điểm; +6: 50% Sinh lực tối đa: +600 điểm / 50% Sinh lực tối đa: +800 điểm; +7: 100% Sinh lực tối đa: +800 điểm; +8: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +9: 100% Sinh lực tối đa: +1200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Ngũ Lôi Chánh Pháp]: +1 cấp; +6: 95% Kỹ năng [Ngũ Lôi Chánh Pháp]: +1 cấp / 5% Kỹ năng [Ngũ Lôi Chánh Pháp]: +2 cấp; +7: 100% Kỹ năng [Ngũ Lôi Chánh Pháp]: +2 cấp; +8: 100% Kỹ năng [Ngũ Lôi Chánh Pháp]: +2 cấp; +9: 100% Kỹ năng [Ngũ Lôi Chánh Pháp]: +3 cấp

###### [Thiên Tứ] Lôi Khung Linh Ngọc Uẩn Lôi — Hộ uyển (bản hoàng kim cùng tên là Ngọc bội — bảng mod lệch ô 🟡)

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 134
- Yêu cầu: cấp 120, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kỹ năng [Lôi động Cửu Thiên]: +1–3 cấp | Kỹ năng [Lôi động Cửu Thiên]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Thiên Tế Tấn Lôi]: +1–3 cấp | Kỹ năng [Thiên Tế Tấn Lôi]: +1–3 cấp |
| 4 | ẩn | Kỹ năng [Ngũ Lôi Chánh Pháp]: +1–3 cấp | Kỹ năng [Ngũ Lôi Chánh Pháp]: +1–3 cấp |
| 5 | hiện | — | — |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +800 điểm / 5% Sinh lực tối đa: +1200 điểm; +6: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +7: 100% Sinh lực tối đa: +1200 điểm; +8: 50% Sinh lực tối đa: +1200 điểm / 50% Sinh lực tối đa: +1500 điểm; +9: 100% Sinh lực tối đa: +1500 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Lôi động Cửu Thiên]: +1 cấp; +6: 95% Kỹ năng [Lôi động Cửu Thiên]: +1 cấp / 5% Kỹ năng [Lôi động Cửu Thiên]: +2 cấp; +7: 100% Kỹ năng [Lôi động Cửu Thiên]: +2 cấp; +8: 100% Kỹ năng [Lôi động Cửu Thiên]: +2 cấp; +9: 100% Kỹ năng [Lôi động Cửu Thiên]: +3 cấp

###### [Thiên Tứ] Lôi Khung Cửu Thiên Dẫn Lôi Giới — Nhẫn

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 135
- Yêu cầu: cấp 120, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng độc: +5% | Kháng độc: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #881 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #880 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +600 điểm / 5% Sinh lực tối đa: +800 điểm; +6: 50% Sinh lực tối đa: +600 điểm / 50% Sinh lực tối đa: +800 điểm; +7: 100% Sinh lực tối đa: +800 điểm; +8: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +9: 100% Sinh lực tối đa: +1200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Thiên Tế Tấn Lôi]: +1 cấp; +6: 95% Kỹ năng [Thiên Tế Tấn Lôi]: +1 cấp / 5% Kỹ năng [Thiên Tế Tấn Lôi]: +2 cấp; +7: 100% Kỹ năng [Thiên Tế Tấn Lôi]: +2 cấp; +8: 100% Kỹ năng [Thiên Tế Tấn Lôi]: +2 cấp; +9: 100% Kỹ năng [Thiên Tế Tấn Lôi]: +3 cấp

#### Bộ Vụ ảo (số bộ 28)

- Hoàng kim (5 món): Vụ ảo Bắc Minh Đạo quán (Nón) · Vụ ảo Ki Bán phù chú (Dây chuyền) · Vụ ảo Thúc Tâm chỉ hoàn (Nhẫn) · Vụ ảo Thanh ảnh Huyền Ngọc Bội (Ngọc bội) · Vụ ảo Tung Phong Tuyết ảnh ngoa (Giày)
- Thiên Tứ (5 món): Vụ ảo Bắc Minh Đạo Quan (Nón) · Vụ ảo Thái Uyên Chân Vũ Liên (Dây chuyền) · Vụ ảo Thúc Tâm Chỉ Hoàn (Nhẫn) · Vụ ảo Thanh Anh Huyền Ngọc Bội (Ngọc bội) · Vụ ảo Tùng Phong Lôi ảnh Ngoa (Giày)
- Khác món giữa hai bản: chỉ hoàng kim có Vụ ảo Bắc Minh Đạo quán, Vụ ảo Ki Bán phù chú, Vụ ảo Thanh ảnh Huyền Ngọc Bội, Vụ ảo Tung Phong Tuyết ảnh ngoa; chỉ Thiên Tứ có Vụ ảo Bắc Minh Đạo Quan, Vụ ảo Thái Uyên Chân Vũ Liên, Vụ ảo Thanh Anh Huyền Ngọc Bội, Vụ ảo Tùng Phong Lôi ảnh Ngoa.

##### Hoàng kim — bộ Vụ ảo

###### Vụ ảo Bắc Minh Đạo quán — Nón

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 136
- Yêu cầu: cấp 95, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Kỹ năng [Thanh Phong phù]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Thúc Phược Chú]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Bắc Minh Đáo Hải]: +1–3 cấp |

###### Vụ ảo Ki Bán phù chú — Dây chuyền

- Hệ **Thổ** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `goldequip.txt` dòng 137
- Yêu cầu: cấp 99, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng độc: +25–30% |
| 3 | hiện | Kỹ năng [Ki Bán phù]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% |

###### Vụ ảo Thúc Tâm chỉ hoàn — Nhẫn

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `goldequip.txt` dòng 138
- Yêu cầu: cấp 80, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | — |
| 4 | ẩn | — |
| 5 | hiện | — |
| 6 | ẩn | — |

###### Vụ ảo Thanh ảnh Huyền Ngọc Bội — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `goldequip.txt` dòng 139
- Yêu cầu: cấp 90, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Mê Tung ảo ảnh]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% |

###### Vụ ảo Tung Phong Tuyết ảnh ngoa — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `goldequip.txt` dòng 140
- Yêu cầu: cấp 85, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Thuộc tính (phẩm chất 0 → 10) |
|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Kỹ năng [Túy Tiên Tá Cốt]: +1–3 cấp |
| 3 | hiện | Tốc độ di chuyển: +40–60% |
| 4 | ẩn | Kháng lôi: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% |

##### Thiên Tứ — bộ Vụ ảo

###### [Thiên Tứ] Vụ ảo Bắc Minh Đạo Quan — Nón

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 136
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 315 điểm · Độ bền: 85 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +300–400 điểm | Sinh lực tối đa: +300–400 điểm |
| 2 | ẩn | Kỹ năng [Thanh Phong phù]: +1–3 cấp | Kỹ năng [Thanh Phong phù]: +1–3 cấp |
| 3 | hiện | Kỹ năng [Thúc Phược Chú]: +1–3 cấp | Kỹ năng [Thúc Phược Chú]: +1–3 cấp |
| 4 | ẩn | Kháng độc: +25–30% | Kháng độc: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Kỹ năng [Bắc Minh Đáo Hải]: +1–3 cấp | Kỹ năng [Bắc Minh Đáo Hải]: +1–3 cấp |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Vụ ảo Thái Uyên Chân Vũ Liên — Dây chuyền

- Hệ **Kim** · cấp đồ 10 · giá 49999 lượng · ô túi 2×1 · `platinaequip.txt` dòng 137
- Yêu cầu: cấp 120, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +120–200 điểm | Sinh lực tối đa: +120–200 điểm |
| 2 | ẩn | Kháng độc: +25–30% | Kháng độc: +25–30% |
| 3 | hiện | Kỹ năng [Ki Bán phù]: +1–3 cấp | Kỹ năng [Ki Bán phù]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +15–25% | Phòng thủ vật lý: +15–25% |
| 5 | hiện | Nội lực tối đa: +300–400 điểm | Nội lực tối đa: +300–400 điểm |
| 6 | ẩn | Kháng tất cả: +16–24% | Kháng tất cả: +16–24% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Vụ ảo Thúc Tâm Chỉ Hoàn — Nhẫn

- Hệ **Hỏa** · cấp đồ 10 · giá 49999 lượng · ô túi 1×1 · `platinaequip.txt` dòng 138
- Yêu cầu: cấp 120, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Không thể phá hủy | Không thể phá hủy |
| 2 | ẩn | Kỹ năng [Võ công vốn có]: +1 cấp | Kỹ năng [Võ công vốn có]: +1 cấp |
| 3 | hiện | Sinh lực tối đa: +100 điểm | Sinh lực tối đa: +300 điểm |
| 4 | ẩn | Nội lực tối đa: +100 điểm | Nội lực tối đa: +300 điểm |
| 5 | hiện | Kháng độc: +5% | Kháng độc: +25% |
| 6 | ẩn | — | — |

- Kỹ năng ở +6: #883 <<未翻译>>: Kháng tất cả: +5%
- Kỹ năng ở +10: #882 <<未翻译>>: Triệt tiêu sát thương: +60
- Dòng thêm 1 khi cường hóa: +5: 95% Sinh lực tối đa: +600 điểm / 5% Sinh lực tối đa: +800 điểm; +6: 50% Sinh lực tối đa: +600 điểm / 50% Sinh lực tối đa: +800 điểm; +7: 100% Sinh lực tối đa: +800 điểm; +8: 50% Sinh lực tối đa: +800 điểm / 50% Sinh lực tối đa: +1200 điểm; +9: 100% Sinh lực tối đa: +1200 điểm
- Dòng thêm 2 khi cường hóa: +5: 3% Kỹ năng [Bắc Minh Đáo Hải]: +1 cấp; +6: 95% Kỹ năng [Bắc Minh Đáo Hải]: +1 cấp / 5% Kỹ năng [Bắc Minh Đáo Hải]: +2 cấp; +7: 100% Kỹ năng [Bắc Minh Đáo Hải]: +2 cấp; +8: 100% Kỹ năng [Bắc Minh Đáo Hải]: +2 cấp; +9: 100% Kỹ năng [Bắc Minh Đáo Hải]: +3 cấp

###### [Thiên Tứ] Vụ ảo Thanh Anh Huyền Ngọc Bội — Ngọc bội

- Hệ **Mộc** · cấp đồ 10 · giá 49999 lượng · ô túi 1×2 · `platinaequip.txt` dòng 139
- Yêu cầu: cấp 120, môn phái Côn Lôn
- Cơ bản: —

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Thời gian làm chậm: -40–50% | Thời gian làm chậm: -40–50% |
| 3 | hiện | Kỹ năng [Mê Tung ảo ảnh]: +1–3 cấp | Kỹ năng [Mê Tung ảo ảnh]: +1–3 cấp |
| 4 | ẩn | Phòng thủ vật lý: +25–30% | Phòng thủ vật lý: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–40% | Thời gian choáng: -30–40% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

###### [Thiên Tứ] Vụ ảo Tùng Phong Lôi ảnh Ngoa — Giày

- Hệ **Thủy** · cấp đồ 10 · giá 49999 lượng · ô túi 2×2 · `platinaequip.txt` dòng 140
- Yêu cầu: cấp 120, Sức mạnh 110, môn phái Côn Lôn
- Cơ bản: Né tránh: 140 điểm · Độ bền: 80 điểm

| # | Dòng | Ở +0 | Ở +10 |
|---|---|---|---|
| 1 | hiện | Sinh lực tối đa: +200–300 điểm | Sinh lực tối đa: +200–300 điểm |
| 2 | ẩn | Kỹ năng [Túy Tiên Tá Cốt]: +1–3 cấp | Kỹ năng [Túy Tiên Tá Cốt]: +1–3 cấp |
| 3 | hiện | Tốc độ di chuyển: +40–60% | Tốc độ di chuyển: +40–60% |
| 4 | ẩn | Kháng lôi: +25–30% | Kháng lôi: +25–30% |
| 5 | hiện | Nội lực tối đa: +120–200 điểm | Nội lực tối đa: +120–200 điểm |
| 6 | ẩn | Thời gian choáng: -30–50% | Thời gian choáng: -30–50% |

- Kỹ năng ở +6: —
- Kỹ năng ở +10: —
- Dòng thêm khi cường hóa: món này không có trong `platina_magicrate.txt`.

## 5. Các loại trang bị khác (ghi chú, chưa mô tả chi tiết)

Đếm từ `goldequip.txt` / `platinaequip.txt` theo số bộ và tiền tố tên. Ý nghĩa tiền tố là 🟡 suy từ tên; cấp yêu cầu ✅.

### Hoàng kim (`goldequip.txt`)

| Họ / tiền tố | Số món | Số bộ | Cấp yêu cầu | Môn phái | Ví dụ |
|---|---|---|---|---|---|
| Kim Ô | 480 | 25 | 120–120 | 11 phái | Kim Ô Cẩm Lan Châu Liên |
| Bạch Hổ | 480 | 25 | 120–120 | 11 phái | Bạch Hổ Phổ Tế Châu Liên |
| Xích Lân | 480 | 25 | 120–120 | 11 phái | Xích Lân Di Lặc Châu Liên |
| Minh Phượng | 480 | 25 | 120–120 | 11 phái | Minh Phượng Quy Y Châu Liên |
| [Tinh Xảo] (tiền tố) | 324 | 20 | 60–60 | — | [Tinh Xảo] Vô Danh Chỉ Hoàn |
| [Định thời] (tiền tố) | 286 | 35 | 27–120 | 11 phái | [Định thời] Mộng Long Chính Hoàng Tăng Mão |
| Thanh Câu | 250 | 25 | 30–50 | 11 phái | Thanh Câu La Hán Phật Châu |
| Vân Lộc | 250 | 25 | 80–80 | 11 phái | Vân Lộc Định Thiền Châu Liên |
| Thương Lang | 250 | 25 | 100–100 | 11 phái | Thương Lang Phổ Độ Châu Liên |
| Huyền Viên | 250 | 25 | 120–120 | 11 phái | Huyền Viên Trí Tuệ Châu Liên |
| Tử Mãng | 250 | 25 | 120–120 | 11 phái | Tử Mãng Vô Tương Châu Liên |
| Đằng Long | 250 | 25 | 120–180 | 11 phái | Đằng Long Bồ Đề Châu Liên |
| (tên gốc tiếng Trung, chưa dịch) | 204 | 24 | 120–150 | 11 phái | 伏魔之大慈佛戒 (tên gốc tiếng Trung) |
| Hoàng kim môn phái (mục 3–4) | 140 | 28 | 80–99 | 10 phái | Mộng Long Chính Hồng Tăng Mão |
| [宋金] (tiền tố) | 115 | 23 | 120–120 | 10 phái | [宋金]梦龙之净沙念珠 (tên gốc tiếng Trung) |
| Ngũ Hành | 110 | 1 | 120–120 | — | Ngũ Hành ấn |
| [Cực phẩm] (tiền tố) | 29 | 6 | 35–85 | — | [Cực phẩm] Định Quốc Thanh Sa Trường Sam |
| Hắc thần- | 25 | 1 | 120–120 | — | Hắc thần- Mãnh Uy- Khôi |
| [Hạn chế thời gian] (tiền tố) | 22 | 22 | 120–120 | 10 phái | [Hạn chế thời gian] Mộng Long Tử Kim Bát Nhã Giới |
| Hoàng Kim | 20 | 1 | 120–120 | — | Hoàng Kim ấn (Cường hóa) |
| Thiếu Lâm | 18 | 1 | — | Thiếu Lâm | Thiếu Lâm Quyền - Chiến trường Thập Nhân Địch |
| Thiên Vương | 18 | 1 | — | Thiên Vương | Thiên Vương Đao - Chiến trường Thập Nhân Địch |
| Đường Môn | 18 | 1 | — | Đường Môn | Đường Môn Phi Đao - Chiến trường Thập Nhân Địch |
| Phi phong | 17 | 1 | — | — | Phi phong Lăng Vân |
| Vũ Liệt | 15 | 1 | 120–120 | 11 phái | Vũ Liệt Chi Bắc Thần Khôi |
| [Hoàn Mỹ] (tiền tố) | 14 | 3 | 60–85 | — | [Hoàn Mỹ] An Bang Băng Tinh Thạch Hạng Liên |
| Trang sức | 14 | 1 | — | — | Trang sức |
| Nga My | 12 | 1 | — | Nga My | Nga My Kiếm - Chiến trường Thập Nhân Địch |
| Thúy Yên | 12 | 1 | — | Thúy Yên | Thúy Yên Đao - Chiến trường Thập Nhân Địch |
| Ngũ Độc | 12 | 1 | — | Ngũ Độc | Ngũ Độc Chưởng - Chiến trường Thập Nhân Địch |
| Cái Bang | 12 | 1 | — | Cái Bang | Cái Bang Chưởng - Chiến trường Thập Nhân Địch |
| Thiên Nhẫn | 12 | 1 | — | Thiên Nhẫn | Thiên Nhẫn Chiến - Chiến trường Thập Nhân Địch |
| Võ Đang | 12 | 1 | — | Võ Đang | Võ Đang Khí - Chiến trường Thập Nhân Địch |
| Côn Luân | 12 | 1 | — | Côn Lôn | Côn Luân Đao - Chiến trường Thập Nhân Địch |
| [Không thể gia hạn] (tiền tố) | 12 | 1 | — | — | [Không thể gia hạn] Long Đảm |
| Long Tương | 12 | 1 | 120–120 | — | Long Tương Chi Lân Hạng Liên |
| Định Quốc | 11 | 2 | 75–99 | — | Định Quốc Đầu quán |
| Ngự Phong | 11 | 1 | 10–120 | — | Ngự Phong Chi Phá Nguyệt Hộ Uyển |
| Kim Quang | 10 | 1 | 90–90 | —, Thiên Vương | Kim Quang Trích Tinh Hoàn |
| Phục Hi | 10 | 1 | 120–120 | — | Phục Hi Hỗn Độn Ngự Linh Y |
| Nữ Oa | 10 | 1 | 120–120 | — | Nữ Oa Bích Tịch Nhuyễn Hồ Cầu |
| Chúc Dung | 10 | 1 | 120–120 | — | Chúc Dung Liệt Diệm Nộ Phong Trang |
| Thần Nông | 10 | 1 | 120–120 | — | Thần Nông Tiêu Dương Địa Hoàng Y |
| Nhã Điển | 10 | 10 | 60–60 | — | Nhã Điển Chi Hồn ( mới ) |
| Bắc Kinh | 10 | 10 | 60–60 | — | Bắc Kinh Chi Mộng ( mới ) |
| Tàng Lâm | 10 | 1 | 120–120 | — | Tàng Lâm Chi Phá Nguyệt Hộ Uyển |
| Tật Hỏa | 10 | 1 | 120–120 | — | Tật Hỏa Chi Phá Nguyệt Hộ Uyển |
| Cố Sơn | 10 | 1 | 120–120 | — | Cố Sơn Chi Phá Nguyệt Hộ Uyển |
| Đồ phổ | 9 | 2 | 75–85 | — | Đồ phổ Hoàng Kim - Định Quốc Thanh Sa Trường Sam |
| Thiên Hoàng | 9 | 1 | 60–60 | — | Thiên Hoàng Long Long Đài |
| Kim Phong | 9 | 1 | 30–60 | — | Kim Phong Thanh Dương Khôi |
| [Liên đấu] (tiền tố) | 9 | 2 | 75–85 | — | [Liên đấu] Định Quốc Thanh sa Trường sam |
| [Giờ Ngọ] (tiền tố) | 9 | 1 | — | — | [Giờ Ngọ]Kim Phong Thanh Dương Khôi |
| [Không hạn chế] (tiền tố) | 9 | 1 | — | — | [Không hạn chế] Thiên Hoàng Long Khí Long Đài Đầu |
| Phi Phong | 9 | 1 | — | — | Phi Phong Phệ Quang ( dịch chuyển tức thời) |
| Toại Nhân | 7 | 1 | 120–120 | — | Toại Nhân Xích Huyết Nguyên Vũ Giáp |
| Long Đảm | 7 | 1 | — | — | Long Đảm |
| Cuồng Lan | 7 | 1 | — | — | Cuồng Lan |
| Thạch Phá | 7 | 1 | — | — | Thạch Phá |
| Hạ Phong | 7 | 1 | — | — | Hạ Phong |
| Vạn Tiễn | 7 | 1 | — | — | Vạn Tiễn Bất Xâm |
| Vô Kiên | 7 | 1 | — | — | Vô Kiên Ngự Khí |
| Xuyên Y | 7 | 1 | — | — | Xuyên Y |
| Cận Vũ | 7 | 1 | — | — | Cận Vũ Bất Uy |
| Dặm Vũ | 7 | 1 | — | — | Dặm Vũ Bất Uy |
| Định Nghiệp | 6 | 1 | 90–90 | — | Định Nghiệp Đầu quán |
| Động Sát | 4 | 1 | 80–85 | — | Động Sát Bạch Kim Điêu Long Giới |
| Hiệp Cốt | 4 | 1 | 35–50 | — | Hiệp Cốt Thiết Huyết Sam |
| Nhu Tình | 4 | 1 | 35–50 | — | Nhu Tình Cân Quốc Nghê Thường |
| Hồng ảnh | 4 | 1 | — | — | Hồng ảnh Thẩm Viên Uyển |
| An Bang | 4 | 1 | 75–85 | — | An Bang Băng Tinh Thạch Hạng Liên |
| [Tinh Chế] (tiền tố) | 4 | 1 | 80–85 | — | [Tinh Chế] Động Sát Bạch Kim Điêu Long Giới |
| [Phỏng chế] (tiền tố) | 4 | 1 | — | — | [Phỏng chế] Hồng ảnh Trầm Viên Vãn Túy |
| Huynh Đệ | 4 | 1 | — | — | Huynh Đệ Đồng Tâm Chi Liên |
| 62 họ nhỏ khác (dưới 4 món) | 79 | | | | Toái Nhân Kim Lũ Nhuyễn Vi H · Trấn Nhạc Giới · Vô Danh Chỉ Hoàn · Lăng Nhạc Nộ Lôi Giới (kỳ hạ · Trường sinh · Bột Hải … |

### Bạch kim (`platinaequip.txt`)

| Họ / tiền tố | Số món | Số bộ | Cấp yêu cầu | Môn phái | Ví dụ |
|---|---|---|---|---|---|
| Kim Ô | 460 | 23 | 120–120 | 10 phái | Kim Ô Cẩm Lan Châu Liệm |
| Bạch Hổ | 460 | 23 | 120–120 | 10 phái | Bạch Hổ Phổ Tế Châu Liệm |
| Xích Lân | 460 | 23 | 120–120 | 10 phái | Xích Lân Di Lặc Châu Liệm |
| [Tinh Xảo] (tiền tố) | 324 | 20 | 60–60 | — | [Tinh Xảo] Vô Danh Chỉ Hoàn |
| Thanh Câu | 230 | 23 | 50–50 | 10 phái | Thanh Câu La Hán Phật Châu |
| Vân Lộc | 230 | 23 | 80–80 | 10 phái | Vân Lộc Định Thiền Châu Liệm |
| Thương Lang | 230 | 23 | 100–100 | 10 phái | Thương Lang Phổ Độ Châu Liệm |
| Huyền Viên | 230 | 23 | 120–120 | 10 phái | Huyền Viên Trí Tuệ Châu Liệm |
| Tử Mãng | 230 | 23 | 120–120 | 10 phái | Tử Mãng Vô Tướng Châu Liệm |
| Kim Phượng | 230 | 23 | 170–170 | 10 phái | Kim Phượng Quy Y Châu Liệm |
| Đằng Long | 230 | 23 | 180–180 | 10 phái | Đằng Long Bồ Đề Châu Liệm |
| Minh Phượng | 230 | 23 | 120–120 | 10 phái | Minh Phượng Quy Y Châu Liên |
| (tên gốc tiếng Trung, chưa dịch) | 211 | 3 | 120–150 | 11 phái | 伏魔之大慈佛戒 (tên gốc tiếng Trung) |
| [玄金] (tiền tố) | 200 | 20 | 30–120 | Hoa Sơn | [玄金]青驹之浮云项链 (tên gốc tiếng Trung) |
| [Định thời] (tiền tố) | 147 | 34 | 27–120 | 11 phái | [Định thời] Mộng Long Chính Hoàng Tăng Mão |
| [Thiên Tứ] (tiền tố) | 140 | 28 | 120–120 | 10 phái | [Thiên Tứ] Mộng Long Chính Hồng Tăng Mão |
| [限时白金] (tiền tố) | 140 | 28 | 120–120 | 10 phái | [限时白金]梦龙之正黄僧帽 (tên gốc tiếng Trung) |
| [宋金] (tiền tố) | 115 | 1 | 120–120 | 10 phái | [宋金]梦龙之净沙念珠 (tên gốc tiếng Trung) |
| Ngũ Hành | 110 | 1 | 120–120 | — | Ngũ Hành ấn |
| Phi phong | 30 | 1 | 60–60 | — | Phi phong Lăng Vân |
| [Hạn chế thời gian] (tiền tố) | 22 | 22 | 120–120 | 10 phái | [Hạn chế thời gian] Mộng Long Tử Kim Bát Nhã Giới |
| [Cực phẩm] (tiền tố) | 21 | 5 | 35–85 | — | [Cực phẩm] Định Quốc Thanh Sa Trường Sam |
| Hoàng Kim | 20 | 1 | 120–120 | — | Hoàng Kim ấn (Cường hóa) |
| Trang sức | 19 | 1 | — | — | Trang sức |
| Hắc thần- | 18 | 1 | 120–120 | — | Hắc thần- Mãnh Uy- Khôi |
| Thiếu Lâm | 18 | 1 | — | Thiếu Lâm | Thiếu Lâm Quyền - Chiến trường Thập Nhân Địch |
| Thiên Vương | 18 | 1 | — | Thiên Vương | Thiên Vương Đao - Chiến trường Thập Nhân Địch |
| Đường Môn | 18 | 1 | — | Đường Môn | Đường Môn Phi Đao - Chiến trường Thập Nhân Địch |
| Vũ Liệt | 15 | 1 | 120–120 | 11 phái | Vũ Liệt Chi Bắc Thần Khôi |
| [Hoàn Mỹ] (tiền tố) | 14 | 3 | 60–85 | — | [Hoàn Mỹ] An Bang Băng Tinh Thạch Hạng Liên |
| Nga My | 12 | 1 | — | Nga My | Nga My Kiếm - Chiến trường Thập Nhân Địch |
| Thúy Yên | 12 | 1 | — | Thúy Yên | Thúy Yên Đao - Chiến trường Thập Nhân Địch |
| Ngũ Độc | 12 | 1 | — | Ngũ Độc | Ngũ Độc Chưởng - Chiến trường Thập Nhân Địch |
| Cái Bang | 12 | 1 | — | Cái Bang | Cái Bang Chưởng - Chiến trường Thập Nhân Địch |
| Thiên Nhẫn | 12 | 1 | — | Thiên Nhẫn | Thiên Nhẫn Chiến - Chiến trường Thập Nhân Địch |
| Võ Đang | 12 | 1 | — | Võ Đang | Võ Đang Khí - Chiến trường Thập Nhân Địch |
| Côn Luân | 12 | 1 | — | Côn Lôn | Côn Luân Đao - Chiến trường Thập Nhân Địch |
| [Không thể gia hạn] (tiền tố) | 12 | 1 | — | — | [Không thể gia hạn] Long Đảm |
| Long Tương | 12 | 1 | 120–120 | — | Long Tương Chi Lân Hạng Liên |
| Chí Tôn | 12 | 1 | 120–120 | 12 phái | Chí Tôn ấn Giám |
| Định Quốc | 11 | 2 | 75–99 | — | Định Quốc Đầu quán |
| Ngự Phong | 11 | 1 | 120–150 | — | Ngự Phong Chi Phá Nguyệt Hộ Uyển |
| Đại Mã | 10 | 1 | 27–99 | —, Thiên Vương | Đại Mã Hổ Trích Tinh hoàn |
| Phục Hi | 10 | 1 | 120–120 | — | Phục Hi Hỗn Độn Ngự Linh Y |
| Nữ Oa | 10 | 1 | 120–120 | — | Nữ Oa Bích Tịch Nhuyễn Hồ Cầu |
| Chúc Dung | 10 | 1 | 120–120 | — | Chúc Dung Liệt Diệm Nộ Phong Trang |
| Thần Nông | 10 | 1 | 120–120 | — | Thần Nông Tiêu Dương Địa Hoàng Y |
| Nhã Điển | 10 | 10 | 60–60 | — | Nhã Điển Chi Hồn ( mới ) |
| Bắc Kinh | 10 | 10 | 60–60 | — | Bắc Kinh Chi Mộng ( mới ) |
| Tàng Lâm | 10 | 1 | 120–120 | — | Tàng Lâm Chi Phá Nguyệt Hộ Uyển |
| Tật Hỏa | 10 | 1 | 120–120 | — | Tật Hỏa Chi Phá Nguyệt Hộ Uyển |
| Cố Sơn | 10 | 1 | 120–120 | — | Cố Sơn Chi Phá Nguyệt Hộ Uyển |
| Đồ phổ | 9 | 2 | 75–85 | — | Đồ phổ Hoàng Kim - Định Quốc Thanh Sa Trường Sam |
| Thiên Hoàng | 9 | 1 | 60–60 | — | Thiên Hoàng Long Long Đài |
| Kim Phong | 9 | 1 | 30–60 | — | Kim Phong Thanh Dương Khôi |
| [Liên đấu] (tiền tố) | 9 | 2 | 75–85 | — | [Liên đấu] Định Quốc Thanh sa Trường sam |
| [Giờ Ngọ] (tiền tố) | 9 | 1 | — | — | [Giờ Ngọ]Kim Phong Thanh Dương Khôi |
| [Không hạn chế] (tiền tố) | 9 | 1 | — | — | [Không hạn chế] Thiên Hoàng Long Khí Long Đài Đầu |
| Toại Nhân | 7 | 1 | 120–120 | — | Toại Nhân Xích Huyết Nguyên Vũ Giáp |
| Long Đảm | 7 | 1 | — | — | Long Đảm |
| Cuồng Lan | 7 | 1 | — | — | Cuồng Lan |
| Thạch Phá | 7 | 1 | — | — | Thạch Phá |
| Hạ Phong | 7 | 1 | — | — | Hạ Phong |
| Vạn Tiễn | 7 | 1 | — | — | Vạn Tiễn Bất Xâm |
| Vô Kiên | 7 | 1 | — | — | Vô Kiên Ngự Khí |
| Xuyên Y | 7 | 1 | — | — | Xuyên Y |
| Cận Vũ | 7 | 1 | — | — | Cận Vũ Bất Uy |
| Dặm Vũ | 7 | 1 | — | — | Dặm Vũ Bất Uy |
| Định Nghiệp | 6 | 1 | 90–90 | — | Định Nghiệp Đầu quán |
| Phi Phong | 6 | 1 | — | — | Phi Phong Phệ Quang ( dịch chuyển tức thời) |
| Mộng Long | 5 | 1 | 120–120 | Thiếu Lâm | Mộng Long Chi Tịnh Sa Niệm Châu |
| Thượng Giới | 5 | 1 | — | — | Thượng Giới Chỉ Cổ Tháp-Tuyệt Thế |
| Hạ Giới | 5 | 1 | — | — | Hạ Giới Chỉ Cổ Tháp-Tuyệt Thế |
| Động Sát | 4 | 1 | 80–85 | — | Động Sát Bạch Kim Điêu Long Giới |
| Hiệp Cốt | 4 | 1 | 35–50 | — | Hiệp Cốt Thiết Huyết Sam |
| Nhu Tình | 4 | 1 | 35–50 | — | Nhu Tình Cân Quốc Nghê Thường |
| Hồng ảnh | 4 | 1 | — | — | Hồng ảnh Thẩm Viên Uyển |
| An Bang | 4 | 1 | 75–85 | — | An Bang Băng Tinh Thạch Hạng Liên |
| [Tinh Chế] (tiền tố) | 4 | 1 | 80–85 | — | [Tinh Chế] Động Sát Bạch Kim Điêu Long Giới |
| [Phỏng chế] (tiền tố) | 4 | 1 | — | — | [Phỏng chế] Hồng ảnh Trầm Viên Vãn Túy |
| Huynh Đệ | 4 | 1 | — | — | Huynh Đệ Đồng Tâm Chi Liên |
| Cao Thủ | 4 | 2 | 60–60 | — | Cao Thủ Giới |
| 66 họ nhỏ khác (dưới 4 món) | 87 | | | | Toái Nhân Kim Lũ Nhuyễn Vi H · Trấn Nhạc Giới · Phục Ma Chi Vô Nhai Niệm Châ · Hạng liên Cổ Tháp - Tuyệt Th · Vô Danh Chỉ Hoàn · Trường sinh … |

Trang bị ngoài hai bảng trên (đã có trong BACKLOG nhóm VP):

| Loại | Bảng | Ghi chú |
|---|---|---|
| Trắng (thường) | `meleeweapon`, `rangeweapon`, `armor`, `helm`, `boot`, `belt`, `cuff`, `ring`, `amulet`, `pendant` (10 bảng, cấp 1–10) | Game đã có tên / hình; chưa có chỉ số đầy đủ (VP2) |
| Xanh (dòng ngẫu nhiên) | `magicattrib.txt` 330 dòng | VP6 |
| Tím (khảm) | `magicattriblevel.txt` 480 dòng | Khảm đá, 5 % hỏng (tài liệu 09 §10) |
| Mặt nạ, áo choàng | `mask.txt` 840, `mantle.txt` 3 (file rời) | VP3 |
| Ngựa | `horse.txt` 33 loại × 10 cấp + ngựa hoàng kim / bạch kim (tiền tố ở bảng trên) | Game đã có 54 ngựa, chỉ có tốc độ |

## 6. Chưa rõ và cách sinh lại

- ❓ Giá trị bạch kim ở +1…+9 (nội suy giữa +0 và +10?), cách nâng cấp (nguyên liệu, tỉ lệ thành công): chỉ có bảng.
- ❓ Cấp kỹ năng bạch kim = cấp cường hóa? (bảng chỉ ghi kỹ năng mở ở +6 / +10).
- ❓ Cột `ActiveRate` của `platina_magicrate.txt` (luôn 100) và các cột `可熔炼…`, `是否可升星装备`, `可镶嵌星辰石数量`, `装备突破祝福值` (để trống ở các món này).
- 🟡 Dòng ẩn / kích hoạt bộ theo engine fork; bản SHXT thật có thể khác.
- Kiểm tra khi sinh: 140 món hoàng kim, 140 món Thiên Tứ (110 trùng tên món hoàng kim); 120 món Thiên Tứ có bảng dòng thêm khi cường hóa (`platina_magicrate.txt` có 120 món).
- Sinh lại: `cd apps/client && npx tsx tools/doc-gold.ts` (cần `../jx-origin`; đặt `JX_CLIENT` nếu ở chỗ khác).
