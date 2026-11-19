# Phi phong & Tài phú Binh giáp (VLTK1 / SHXT)

> **Trạng thái: ĐÃ TRIỂN KHAI trong `jx-system-online` (USER 2026-11-19).**
> Nguồn: dữ liệu gốc `Client_VLTK_SHXT` (`/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`, chỉ đọc), công thức hiện hành của repo
> ([character.md](formulas/character.md), [damage.md](formulas/damage.md)) và hướng dẫn VLTK1 trên mạng.
> Ký hiệu: ✅ đọc thẳng từ bảng gốc · 🟡 suy luận · 🌐 tham khảo web, chưa kiểm chứng · ❓ chưa rõ.
> Hình ảnh icon + ngoại hình nhân vật mặc Phi phong: [gold-equipment-preview.html](gold-equipment-preview.html) (tab *Ấn, Phi phong…* và *Ngoại hình nhân vật*).

---

## 1. Tài phú Binh giáp

### 1.1. Là gì
- Nhãn gốc trong `settings/magicdesc.ini`: *"Yêu cầu tài phú binh giáp: #d1-"* (thuộc tính `require_fortune_value`). ✅
- Mọi Phi phong Hoàng kim đều có đúng **một** yêu cầu là Tài phú tối thiểu (không yêu cầu cấp, giới tính, môn phái). ✅
- Tài phú là **điều kiện để mặc**, không bị trừ khi mua hay đeo. Tụt dưới mốc → Phi phong mất tác dụng / không đeo được. 🌐

### 1.2. Cách tính
Client **không chứa công thức** (chỉ có chuỗi hiển thị); công thức nằm ở server gốc và VNG không công bố. ❓ Nguyên tắc chung theo hướng dẫn VLTK1: 🌐
1. Cộng giá trị **toàn bộ trang bị đang mặc** (vũ khí, áo, nón, dây chuyền, nhẫn, ngọc bội, đai, hộ uyển, giày, ngựa, Ngũ Hành Ấn, trang sức…; vài bản tính cả đồ dự phòng). **Không tính ngân lượng / KNB.**
2. Điểm mỗi món tăng theo: bậc đồ (trắng < xanh < hoàng kim < bạch kim < bộ đời sau như Thanh Câu → Tử Mãng → Kim Ô…), cấp cường hóa, độ đẹp của dòng, kích hoạt đủ bộ / đúng ngũ hành.
3. Bảng xếp hạng chốt định kỳ (thường 03:00 sáng hằng ngày hoặc thứ Hai), chống mượn đồ lấy "Tài phú ảo". Bản VNG còn đòi **thứ hạng BXH** (Lăng Vân top 5.000, Tuyệt Thế top 3.000, Phá Quân top 1.000).

### 1.3. Trong `jx-system-online` hiện tại
- Chưa triển khai code tính Tài phú; [equip.ts](../packages/shared/src/items/equip.ts) `missesReq` chưa kiểm `require_fortune_value`.
- **Công thức đề xuất cho repo** đã viết chi tiết tại **[formulas/fortune.md](formulas/fortune.md)** (tính từ trang bị đang mặc, trừ ô `mantle`, kèm ví dụ số đối chiếu 10 mốc Phi phong).
- Tab **Tài phú** của Bảng xếp hạng ([rankings.ts](../apps/server/src/account/rankings.ts)) xếp theo **ngân lượng (`money`)** — khác nghĩa Tài phú binh giáp.
- "Điểm" trong [luck-drops.md](research/luck-drops.md) (2 × cấp + Σ giá trị/max × 10) là điểm phẩm chất một món, chưa phải Tài phú.
- Ô `mantle` đã có trong [items.ts](../packages/shared/src/items/items.ts) và cửa sổ nhân vật; chưa có món Phi phong, chưa vẽ lớp áo choàng ([ActorView.ts](../apps/client/src/game/actors/ActorView.ts) chỉ ghép nón / áo / vũ khí / ngựa).

---

## 2. Cách nhận Phi phong

### 2.1. VLTK1 gốc 🌐
| Cách | Nơi | Tiêu tốn |
|---|---|---|
| Mua theo bậc (bản VNG) | NPC Thợ Rèn, Thất Đại Thành Thị | Tinh Lực / Tinh Luyện Thạch (Lăng Vân ~250, Tuyệt Thế ~500, Phá Quân ~750 Tinh Lực) |
| Nâng bậc | NPC Thợ Rèn | Tinh Ngọc, Thiên Tinh Ngọc (Liên Đấu, mở Tinh Ngọc Nguyên Thạch…) |
| Đổi (hệ Vinh Dự Tài Phú) | NPC Tiền Trang | Ngũ Hành Hồn Thạch |
| Bản mod / private | Kỳ Trân Các, NPC sự kiện | KNB, ngân lượng, điểm Tống Kim / Liên Đấu, vật phẩm sự kiện |

Client SHXT không có script NPC / shop bán Phi phong (giá trong bảng chỉ là 999–99.999 lượng mặc định). ✅

### 2.2. Quyết định thiết kế cho `jx-system-online` (USER 2026-11-19, chưa duyệt viết mã)
1. **Hai nguồn nhận Phi phong:**
   - **Mua tại Kỳ Trân Các** ([shops.ts](../packages/shared/src/items/shops.ts)): giá **100 KNB** (`1 KNB = 100 vạn lượng`, theo [rao-ban.md](rao-ban.md)), yêu cầu nhân vật **đạt đủ mốc Tài phú Binh giáp** của bậc Phi phong đó mới được mua/mặc.
   - **Đánh Boss Đại Hoàng Kim:** nhóm **`tier: 'major'`** (`GOLDEN_BOSS_TIER_LABELS.major = 'Đại Hoàng Kim'` trong [types.ts](../packages/shared/src/bosses/types.ts); hiện có **20 boss** đang bật trong `packages/shared/src/bosses/config.json`) — rơi Phi phong qua bảng rơi boss ([drop-config.json](../packages/shared/src/drops/drop-config.json)).
2. **Yêu cầu Tài phú Binh giáp:** **Có giữ**, dùng công thức tự thiết kế tại **[formulas/fortune.md](formulas/fortune.md)** (hàm thuần dùng chung server & client cho Web, Desktop, Mobile).
3. **Phạm vi tính năng & hiển thị:**
   - **Không làm** 3 nhánh kỹ năng đặc biệt (*Huyễn Ảnh Mê Tung Bộ*, *Đại Diệp Khí Tráo*, *Trọng kích tuyệt đối*).
   - **Hiển thị:** chỉ tập trung vẽ **lớp áo choàng Phi phong (`Mantle`)** trên nhân vật (không mở rộng sang Ấn, Trang sức hay Mặt nạ trong phạm vi này).
   - **Preview khi hover (USER 2026-11-19):** khi **hover** chuột vào món Phi phong (trong Kỳ Trân Các, Hành trang, Cửa sổ nhân vật F3, kênh Mua bán), hiển thị ảnh preview **nhân vật đang mặc chính Phi phong đó** (theo giới tính nhân vật hiện tại, kèm góc nhìn thấy rõ tà áo choàng). Trên **Mobile** (không có hover chuột): hiển thị cùng khung preview khi chạm chọn mở tooltip/chi tiết món đồ.
   - **Tự mặc vào dialog Nhân vật & cập nhật thuộc tính (USER 2026-11-19):** khi thao tác mặc Phi phong trong hành trang (chuột phải / click nhanh theo quy ước hành trang [inventory.ts](../apps/client/src/ui/windows/inventory.ts), chạm chọn Mặc trên Mobile), kiểm tra đủ **Tài phú Binh giáp** rồi tự động lắp vào ô `mantle` (tọa độ `8, 285` đã có sẵn trong [character.ts](../apps/client/src/ui/windows/character.ts)), đồng thời server gọi `refreshStats` cập nhật ngay các chỉ số trên dialog Nhân vật & Thuộc tính (F3) và phát ngoại hình lớp áo choàng `Mantle` xuống client; click/chuột phải vào ô `mantle` trong F3 sẽ tháo về hành trang và hoàn lại chỉ số/ngoại hình.

**Chi tiết cân bằng nhỏ cần chốt khi bắt đầu viết mã:**
- Kỳ Trân Các bán đủ 10 bậc (đồng giá 100 KNB) hay chỉ bán tới bậc nào; Boss Đại Hoàng Kim rơi bậc nào và tỉ lệ rơi (%) bao nhiêu.
- Thang điểm trong [formulas/fortune.md](formulas/fortune.md) giữ nguyên (mở tới bậc *Ngạo Tuyết* 5.000 với kho đồ hiện tại) hay nhân hệ số để người chơi hiện tại lên được tới *Vô Cực* (280.000).

---

## 3. Phân loại & cấp độ

### 3.1. Phi phong thường — `settings/item/mantle.txt` (3 dòng) ✅
`破旧的披风` ("Phi phong cũ nát") cấp 1–3, icon mượn nhẫn `obj-ring01.spr`, mô tả chép của đồ Sa Di; yêu cầu Nam hoặc Thiếu Lâm. Là dòng mẫu sót lại, **không dùng**.

### 3.2. Phi phong Hoàng kim — `settings/item/goldequip.txt` dòng 3465–3490 (26 món) ✅
| Bậc | Tên | Cấp đồ | Tài phú | Biến thể |
|---:|---|---:|---:|---|
| 1 | Lăng Vân | 1 | 200 | 1 |
| 2 | Tuyệt Thế | 2 | 500 | 1 |
| 3 | Phá Quân | 3 | 1.500 | 1 (Dịch chuyển) |
| 4 | Ngạo Tuyết | 4 | 5.000 | 2 (Dịch chuyển, Hóa giải) |
| 5 | Kinh Lôi | 5 | 10.000 | 3 (Dịch chuyển, Hóa giải, Trọng kích) |
| 6 | Ngự Phong | 6 | 27.000 | 3 |
| 7 | Phệ Quang | 7 | 54.000 | 3 |
| 8 | Khấp Thần | 8 | 120.000 | 3 |
| 9 | Kình Thiên | 9 | 240.000 | 3 |
| 10 | Vô Cực | 10 | 280.000 | 3 |
| 10 | Cao Cấp Vô Cực | 10 | 280.000 | 3 (chỉ số như Vô Cực, khác hình) |

### 3.3. Phi phong Bạch kim — `settings/item/platinaequip.txt` (39 dòng) ✅
- Dòng 3465–3478 (Lăng Vân → Phệ Quang): **chép y nguyên** chỉ số và kỹ năng nhánh của bản Hoàng kim.
- Dòng 3479–3490 (Khấp Thần → Cao cấp) và 5300–5304: có tên, **để trống chỉ số**.
- Dòng 4834–4839 (*Cao Thủ Phi Phong*, *Phi phong Vô Cực*): nhóm cường hóa +0…+10, yêu cầu **cấp 60**, không cần Tài phú (mục 4.3).
- Dòng 764 `梦圆披风（测试版）` (bản thử) và 5295 (bảng lệch cột): bỏ qua.

**Hoàng kim hay Bạch kim tốt hơn?** Bậc cao Hoàng kim mạnh hơn nhiều (Vô Cực: +3.234 sinh lực, +77 %, kỹ năng nhánh +4) so với Bạch kim +10 (+1.200 sinh lực, không kỹ năng nhánh). Bạch kim 4834–4839 chỉ hợp khi mới cấp 60, chưa đủ Tài phú.

---

## 4. Thuộc tính và ý nghĩa

### 4.1. Tên thuộc tính
Sáu thuộc tính chính của Phi phong là thuộc tính mở rộng của bản mod, **ngoài phạm vi tên đã xác minh** của repo (`VERIFIED_MAX = 176`, [magicattr.ts](../apps/client/tools/jx/magicattr.ts)). Tên tiếng Việt dưới đây dịch từ tên dòng tiếng Trung trong `magicattrib_ge.txt` mang cùng thuộc tính: 🟡

| Tên dùng trong tài liệu | Tên dòng gốc | Ý nghĩa | Chắc chắn? |
|---|---|---|---|
| Sinh lực tối đa (điểm) | 新生命 | Cộng thẳng máu tối đa | 🟡 |
| Sinh lực tối đa (%) | 经脉生命% | Nhân % máu tối đa | 🟡 |
| Nội lực tối đa (điểm) | 新内力 | Cộng thẳng mana tối đa | 🟡 |
| Nội lực tối đa (%) | 内力% | Nhân % mana tối đa | 🟡 |
| Hỗ trợ kỹ năng tấn công (`skill_enhance`) | 对攻击技能加成 | `magicdesc.ini`: *"Tăng công kích kỹ năng: #d1+%"* — cộng thẳng `%` uy lực cho **tất cả kỹ năng tấn công** (khác `addskilldamageN` chỉ cộng cho 1 chiêu cụ thể) | ✅ nhãn `magicdesc` · 🟡 ánh xạ mã |
| Trọng kích (`enhancehit_rate`) | 重击 / 原重击 | `magicdesc.ini`: *"Xác suất trọng kích: #d1+%"* — xác suất tung đòn trọng kích (có cặp kháng `anti_enhancehit_rate`, hiệu quả `enhancehiteffect_rate`); **tách biệt** với chí mạng `deadlystrike_p` | ✅ nhãn `magicdesc` · 🟡 ánh xạ mã |
| Gia tăng sát thương | 经脉加深伤害 | Tăng sát thương gây ra; exe gọi là `five_elements_enhance_v` nhưng tên exe ở vùng này không tin được | 🟡 |
| Sinh lực tối đa (`lifemax_v`) | — | Cộng thẳng máu (chỉ ở Bạch kim cường hóa) | ✅ |
| Võ công vốn có (`allskill_v`, tham số 3 = 0) | — | +cấp mọi kỹ năng đã học | ✅ |
| Kỹ năng nhánh (`allskill_v`, tham số 3 = mã chiêu) | — | +cấp một chiêu Phi phong cụ thể | ✅ |

### 4.2. Phi phong Hoàng kim (cũng là Bạch kim dòng 3465–3478) ✅ số liệu · 🟡 tên
| Bậc | Sinh lực | Sinh lực % | Nội lực | Nội lực % | Hỗ trợ kỹ năng tấn công | Trọng kích | Kỹ năng nhánh |
|---|---:|---:|---:|---:|---:|---:|---|
| Lăng Vân | 484 | 3 | 360 | 3 | 7 | 1 | — |
| Tuyệt Thế | 624 | 5 | 440 | 5 | 13 | 1 | — |
| Phá Quân | 780 | 7 | 520 | 7 | 20 | 1 | Dịch chuyển +1 |
| Ngạo Tuyết | 952 | 11 | 600 | 11 | 36 | 2 | Dịch chuyển +2 · Hóa giải +1 |
| Kinh Lôi | 1.368 | 17 | 680 | 17 | 60 | 3 | Dịch chuyển +3 · Hóa giải +2 · Trọng kích +1 |
| Ngự Phong | 1.680 | 25 | 760 | 25 | 84 | 3 | Dịch chuyển +4 · Hóa giải +3 · Trọng kích +2 |
| Phệ Quang | 2.016 | 35 | 840 | 35 | 108 | 4 | Dịch chuyển +4 · Hóa giải +4 · Trọng kích +3 |
| Khấp Thần | 2.392 | 47 | 920 | 47 | 132 | 4 | +4 cả ba nhánh |
| Kình Thiên | 2.798 | 61 | 1.000 | 61 | 156 | 5 | +4 cả ba nhánh |
| Vô Cực / Cao Cấp Vô Cực | 3.234 | 77 | 1.080 | 77 | 180 | 6 | +4 cả ba nhánh |

Mỗi biến thể chỉ có **một** nhánh (tên món ghi trong ngoặc). Chỉ số nằm ở cột thuộc tính cơ bản nên **cố định**, không tung theo phẩm chất như hoàng kim môn phái.

**Cách hiển thị bậc trên trang bị (đọc từ `goldequip.txt`):** ✅
- **Trong tên trang bị (cột 0):** tên bậc nằm ngay sau chữ *"Phi phong"* — vd. `Phi phong Lăng Vân`, `Phi phong Tuyệt Thế`, `Phi phong Phá Quân`, …, `Phi phong Vô Cực`, `Phi Phong Cao Cấp Vô Cực` *(khi bỏ 3 nhánh kỹ năng, sẽ lược phần ngoặc `(Dịch chuyển tức thời)`… cho gọn)*.
- **Trong dòng cấp / loại phụ (cột `level` = 1…10):** tooltip của repo ([describe.ts](../packages/shared/src/items/describe.ts)) tự hiển thị dòng phụ ngay dưới tên món, dạng `Phi phong · Cấp 1` … `Phi phong · Cấp 10`.
- **Trong dòng mô tả (`desc`, cột 8):** cũng nhắc lại tên bậc (vd. `"Phi Phong Lăng Vân"`).

### 4.3. Phi phong Bạch kim cường hóa (dòng 4834–4839) ✅ số liệu
Yêu cầu cấp 60. Giá trị ở +0 → +10 (mức giữa ❓, hợp lý nhất là nội suy):
- Sinh lực tối đa: hai dòng, mỗi dòng 360 → 600 (tổng 720 → 1.200)
- Hỗ trợ kỹ năng tấn công: 18 → 30
- Gia tăng sát thương: 36 → 60
- Trọng kích: 3 → 5
- Võ công vốn có: +1 cấp (cố định)

### 4.4. Ba nhánh kỹ năng (tên đọc từ `settings/skills.txt`) ✅
| Nhánh | Chiêu chủ động | Chiêu bị động | Tác dụng (theo tên món) |
|---|---|---|---|
| Dịch chuyển tức thời | Huyễn Ảnh Mê Tung Bộ | Huyễn Ảnh Mê Tung Bộ (bị động) | Lướt / dịch chuyển nhanh |
| Xác suất hóa giải sát thương | Đại Diệp Khí Tráo | Đại Diệp Khí Tráo (bị động) | Có xác suất hóa giải đòn nhận vào |
| Trọng kích | Trọng kích tuyệt đối | Công kích tuyệt đối (bị động) | Tăng đòn đánh nặng |

Số liệu từng cấp của các chiêu này chưa trích ❓ (cần đọc thêm bảng kỹ năng / script).

---

## 5. Ảnh hưởng tới chỉ số và sát thương

### 5.1. Sinh lực, nội lực
Nếu ánh xạ các dòng "điểm" vào `lifemax_v` / `manamax_v` và dòng "%" vào `lifemax_p` / `manamax_p` (🟡), công thức hiện có ở [character.md](formulas/character.md) áp dụng thẳng:

$$\text{Sinh lực tối đa} = (\text{Sinh khí} \times \text{LifePerVitality} + \text{Cấp} \times \text{LifePerLevel} + \text{lifemax\_v}) \times \left(1 + \frac{\text{lifemax\_p}}{100}\right)$$

Nội lực tương tự với Nội công / `manamax_v` / `manamax_p`. Phần % nhân lên **toàn bộ** máu gốc (kể cả máu từ đồ khác), nên bậc cao (+35 % → +77 %) tăng máu rất mạnh.

### 5.2. Chỉ số tăng sát thương
Đòn đánh của repo ([damage.md](formulas/damage.md)): lực tay (`skillDamage`) → trúng / né → chí mạng (vật lý ×2, trần 75 %) → × (100 − kháng)/100 → × 0,5 nếu PK.

| Thuộc tính Phi phong | Tăng sát thương? | Cách hoạt động & đề xuất gắn vào `jx-system-online` |
|---|---|---|
| **Hỗ trợ kỹ năng tấn công** (`skill_enhance`, `+7% → +180%`) | **Có — chỉ số chính** | Cộng thẳng `%` vào hệ số **Cộng %** của **mọi kỹ năng tấn công** trong `skillDamage` (cộng chung với `addskilldamageN` của chiêu hỗ trợ, không tính đánh thường). Ngoại công: `gốc × (100 + P × (100 + Cộng% + skill_enhance)/100 + thông thạo)/100`; nội công / nguyên tố: `sát thương chiêu × (100 + Cộng% + skill_enhance)/100 + đồ`. |
| **Trọng kích** (`enhancehit_rate`, `+1% → +6%`) | **Có** | Là xác suất tung đòn nặng **tách biệt với Chí mạng** (`deadlystrike_p` hiện tại chỉ nhân **×2 phần vật lý**, trần 75%). **Đề xuất cho repo (CHỌN):** tung xác suất độc lập `clamp(enhancehit_rate − anti_enhancehit_rate, 0, 75)%`; khi nổ nhân **toàn bộ lực tay đòn trực tiếp** (cả vật lý lẫn băng/hỏa/lôi) với **`×1.5`** *(hoặc `×2.0` theo VLTK1 gốc 🌐)*. Nếu 1 đòn nổ cả Chí mạng và Trọng kích: cần chốt **nhân dồn** hay **chỉ lấy hệ số cao hơn**. |
| Gia tăng sát thương (`经脉加深伤害`) | Có | Chỉ có ở Bạch kim cường hóa; 🟡 đề xuất cộng/nhân vào sát thương sau kháng (đơn vị ❓). |
| Võ công vốn có (`allskill_v`) | Gián tiếp | ✅ Đã có: `equipSkillBonus` ([gold.ts](../packages/shared/src/items/gold.ts)) cộng vào cấp chiêu. |
| Sinh lực / nội lực | Không | Chỉ tăng độ trâu / lượng mana. |

Hiện repo **chưa áp** bất kỳ thuộc tính mở rộng nào ở trên vào `resolveHit` (damage.md: thuộc tính `five_elements_*` "chưa dùng").

---

## 6. Đường dẫn dữ liệu và hình ảnh

### 6.1. Bảng (chỉ đọc, trong `Client_VLTK_SHXT`)
- `settings/item/goldequip.txt` dòng 3465–3490 · `settings/item/platinaequip.txt` dòng 764, 3465–3490, 4834–4839, 5295, 5300–5304
- `settings/item/magicattrib_ge.txt` (dòng thuộc tính của Bạch kim cường hóa và kỹ năng nhánh)
- `settings/item/goldequipres.txt` (cột 2 = mã hình mặc của từng dòng goldequip)
- `settings/npcres/人物类型.txt` (cột `Mantle`), `男主角披风.txt` (Nam), `女主角披风.txt` (Nữ)
- `settings/skills.txt` (tên kỹ năng nhánh), `settings/magicdesc.ini` (nhãn Tài phú)

### 6.2. Icon và hình mặc
Mã hình (`goldequipres`) − 2 = dòng trong bảng áo choàng (quy tắc đã kiểm trên vũ khí ở `gen-assets.ts`; với áo choàng 🟡 nhưng khớp đúng 11 hình cho 11 tên). Mỗi hình có đủ động tác (`_ST`, `_WK`, `_RN`, `_AT`, `_MG`, cưỡi ngựa `_RD`/`_HW`…), 8 hướng.

| Bậc | Icon túi đồ (`\spr\item\equip\pifengtubiao\`) | Mã hình | Nam (`\spr\npcres\man\`) | Nữ (`\spr\npcres\woman\`) |
|---|---|---:|---|---|
| Lăng Vân | `pifeng_01.spr` | 2 | `20100607001_*.spr` | `pifeng01_*.spr` |
| Tuyệt Thế | `pifeng_02.spr` | 3 | `20100607002_*` | `pifeng02_*` |
| Phá Quân | `pifeng_03.spr` | 4 | `20100607003_*` | `pifeng03_*` |
| Ngạo Tuyết | `pifeng_04.spr` | 5 | `20100607004_*` | `pifeng04_*` |
| Kinh Lôi | `pifeng_05.spr` | 6 | `20100607005_*` | `pifeng05_*` |
| Ngự Phong | `pifeng_06.spr` | 7 | `20100607006_*` | `pifeng06_*` |
| Phệ Quang | `pifeng_07.spr` | 8 | `20100607007_*` | `pifeng07_*` |
| Khấp Thần | `pifeng_08.spr` | 9 | `20100607008_*` | `pifeng08_*` |
| Kình Thiên | `pifeng_09.spr` | 10 | `20100607009_*` | `pifeng09_*` |
| Vô Cực | `pifeng_10.spr` | 11 | `20100607010_*` | `pifeng10_*` |
| Cao Cấp Vô Cực | `pifeng_11.spr` | 12 | `20100607022_*` | `pifeng21_*` |

- Các file `.spr` nằm dạng hash trong `data_extract/updatejx07_jxf06/_unnamed/dat/*.dat`; tra bằng `resolveAny()` ([hashindex.ts](../apps/client/tools/jx/hashindex.ts)).
- Thứ tự vẽ theo hướng nằm trong `男主角贴图顺序表.txt` / `女主角贴图顺序表.txt`; preview tạm vẽ áo choàng sau thân ở mặt trước và phủ lên thân ở mặt sau 🟡 (chưa đọc đúng chỉ số lớp trong bảng thứ tự).
- Ấn, Trang sức **không** có lớp hình trên nhân vật; Mặt nạ biến nhân vật thành NPC (cột `npc` trong [items.gen.ts](../packages/shared/src/items/items.gen.ts)).
- File preview HTML sinh bằng script tạm ngoài repo (thư mục scratch của phiên làm việc), không nằm trong `gen:*`; muốn tái tạo cần đưa script vào `apps/client/tools/`.
