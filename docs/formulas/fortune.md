# Tài phú Binh giáp (`fortune`)

> **Trạng thái: ĐÃ TRIỂN KHAI (USER 2026-11-19).**
> Mã nguồn: `packages/shared/src/formulas/fortune.ts` (`itemFortune`, `equipmentFortune`, `fortuneRequirement`, `isMantleActive`), hằng số tại `packages/shared/src/formulas/tuning.ts` (`FORTUNE`). Server và client dùng chung cùng một hàm (chung Web, Desktop, Mobile).
> Tài liệu nghiệp vụ Phi phong liên quan: [phi-phong-va-tai-phu.md](../phi-phong-va-tai-phu.md).

---

## 1. Mục đích và nguyên tắc

- **Tài phú Binh giáp** là tổng điểm giá trị **toàn bộ trang bị nhân vật đang mặc trên người**, dùng làm điều kiện để **mua (Kỳ Trân Các)** và **đeo Phi phong** (`require_fortune_value`).
- **Không tính tiền** (ngân lượng, KNB trong hành trang) — khác với tab **Tài phú** của Bảng xếp hạng hiện tại ([rankings.ts](../../apps/server/src/account/rankings.ts)) đang xếp theo `money`.
- **Không tiêu hao** khi mua hoặc đeo Phi phong; tính động theo trang bị đang mặc tại thời điểm kiểm tra.
- **Loại trừ ô `mantle` (Phi phong)** khỏi phép cộng để tránh vòng lặp tự nâng Tài phú (đeo Phi phong rồi tự đủ điểm giữ chính nó).
- Nếu tháo bớt đồ khiến Tài phú tụt dưới mốc yêu cầu của Phi phong đang mặc: Phi phong **tạm mất hiệu lực chỉ số** (không tự gỡ khỏi ô đồ, tương tự cơ chế kiểm tra yêu cầu khi mất điểm tiềm năng) cho đến khi Tài phú đạt lại mốc.

---

## 2. Công thức tổng quát (CHỌN)

$$\text{Tài phú Binh giáp} = \left\lfloor \sum_{s \in \text{Slots} \setminus \{\text{mantle}\}} \text{ĐiểmMón}(s) + \text{ThưởngBộ}(\text{equip}) \right\rfloor$$

Trong đó `Slots` là các ô trang bị đang mặc: `weapon`, `armor`, `helm`, `amulet`, `ring1`, `ring2`, `pendant`, `belt`, `cuff`, `boot`, `horse`, `mask`, `signet`, `ornament` (bỏ `mantle`).

### 2.1. Điểm của từng món đồ (`ĐiểmMón`)

$$\text{ĐiểmMón} = \left(\text{ĐiểmNền} + \text{ĐiểmDòngPhép}\right) \times \text{HệSốÔ} \times \text{HệSốCườngHóa}$$

#### A. Điểm nền theo phẩm chất và cấp món (`ĐiểmNền`)
| Loại trang bị | Điều kiện nhận diện (`Item` / `ItemDef`) | Công thức `ĐiểmNền` |
|---|---|---|
| Trắng (thường) | `q = 0`, không phải `horse` / `mask` / đặc biệt | `level × 2` (cấp 1–10 → `2–20`) |
| Xanh (magic) | `q = 1` (`QUALITY.magic`) | `level × 6` (cấp 1–10 → `6–60`) |
| Hoàng kim môn phái | `q = 2` (`QUALITY.gold`, có `def.gold`) | `180 + gq × 18` (`gq` 0–10 → `180–360`) |
| Nhẫn đặc biệt (`Càn Khôn Giới Chỉ`) | `def.revealHidden === true` | `400` (cố định) |
| Ngựa | `def.kind === 'horse'` | `level × 15` (cấp 1–10 → `15–150`) |
| Mặt nạ | `def.kind === 'mask'` | `10` (mặt nạ thường; mặt nạ có dòng phép cộng thêm ở bước B) |
| Bạch kim *(mở rộng tương lai)* | `q = platina` (chưa có trong game) | `450 + enhanceLevel × 80` (`+0 → +10`: `450–1.250`) |
| Ấn / Trang sức *(mở rộng tương lai)* | `kind = 'signet' \| 'ornament'` | `level × 25` + điểm dòng phép |

#### B. Điểm dòng thuộc tính phép (`ĐiểmDòngPhép`)
Mỗi dòng thuộc tính `i` trong `item.magic` (chỉ tính dòng có giá trị dương, hợp lệ):

$$\text{ĐiểmDòng}_i = \text{ĐiểmChuẩn} \times \text{TỉLệRoll}_i \times \text{HệSốKíchHoạt}_i$$

- **`TỉLệRoll` (0 → 1):**
  - **Đồ xanh:** chuẩn hóa theo khoảng `[min, max]` của thuộc tính đó ở đúng loại/cấp trong `magicattrib.gen.ts` (dùng lại helper chuẩn hóa của `formulas/market.ts`, kẹp `[0.1, 1]`).
  - **Đồ hoàng kim:** `gq / 10` (hoặc tỉ lệ thực của từng dòng so với `[lo, hi]` trong `def.gold.lines`, kẹp `[0.2, 1]`).
  - **Đồ cố định (`fixedMagic` như Càn Khôn Giới Chỉ):** `1.0`.
- **`ĐiểmChuẩn` mỗi dòng:**
  - Đồ xanh: `12` điểm/dòng (tối đa 6 dòng max roll = `+72` điểm).
  - Đồ hoàng kim: `35` điểm/dòng (tối đa 6 dòng max roll = `+210` điểm).
  - Bạch kim *(tương lai)*: `60` điểm/dòng.
- **`HệSốKíchHoạt` (phản ánh luật ngũ hành tương sinh & dòng ẩn trong [equipment.md](equipment.md)):**
  - Dòng hiện (dòng 1, 3, 5): **`1.0`**.
  - Dòng ẩn (dòng 2, 4, 6) **đã kích hoạt** (theo `wornActiveCount` — ngũ hành tương sinh, đủ bộ, hoặc đeo Càn Khôn Giới Chỉ): **`1.0`**.
  - Dòng ẩn **chưa kích hoạt**: **`0.35`** (vẫn ghi nhận một phần giá trị món đồ nhưng khuyến khích kích ngũ hành / mặc đủ bộ).

#### C. Hệ số theo ô trang bị (`HệSốÔ`)
| Ô trang bị (`EquipSlot`) | Hệ số | Lý do |
|---|---:|---|
| `weapon` (Vũ khí) | `1.5` | Món chủ lực, giá trị cao nhất |
| `armor` (Áo) | `1.2` | Phòng cụ chính |
| `helm`, `amulet`, `boot`, `belt`, `cuff`, `pendant`, `ring1`, `ring2` | `1.0` | Các ô trang bị tiêu chuẩn |
| `horse`, `mask`, `signet`, `ornament` | `1.0` | Các ô phụ |

#### D. Hệ số cường hóa (`HệSốCườngHóa`)
- Trang bị chưa có hệ thống cường hóa (hiện tại toàn bộ đồ trắng/xanh/hoàng kim trong repo): **`1.0`**.
- Khi mở hệ thống cường hóa / Bạch kim (`+0` → `+10`): `1 + 0.12 × cấpCườngHóa` (`+10` → `×2.2`).

### 2.2. Thưởng kích hoạt đủ bộ (`ThưởngBộ`)
- Mỗi bộ **Hoàng kim môn phái** mặc đủ `SUITE_SIZE` (5 món, kiểm qua `fullSuite` ở [gold.ts](../../packages/shared/src/items/gold.ts)): cộng **`+600` điểm** (ngoài việc tự kích hoạt toàn bộ dòng ẩn lên hệ số `1.0`).
- Bộ mở rộng tương lai (Bạch kim / Thiên Tứ / Kim Ô…): dự kiến cộng `+1.500` đến `+5.000` điểm tùy bậc bộ.

---

## 3. Bảng ví dụ & đối chiếu với 10 mốc Phi phong

Ước tính điểm Tài phú Binh giáp đạt được theo từng giai đoạn trang bị trong `jx-system-online`:

| Giai đoạn nhân vật | Trang bị đang mặc | Tài phú ước tính | Bậc Phi phong mở khóa |
|---|---|---:|---|
| Tân thủ cấp 30–50 | Full 10 món đồ trắng cấp 5 + ngựa cấp 3 | ~160 | Chưa đủ (cần 200) |
| Trung cấp (cấp 60–80) | Full 10 món đồ xanh cấp 7–8 (3–4 dòng trung bình) + ngựa cấp 6 | ~650 – 950 | **Lăng Vân (200)**, **Tuyệt Thế (500)** |
| Đồ xanh đẹp (cấp 90+) | Full 10 món đồ xanh cấp 10 (5–6 dòng khá, kích ngũ hành) + ngựa cấp 8 | ~1.300 – 1.650 | **Phá Quân (1.500)** |
| 1 bộ Hoàng kim môn phái | 5 món HKMP (`gq` 5–8) + đủ bộ (+600) + 5 món xanh cấp 10 + ngựa cấp 8 | ~3.600 – 4.800 | **Phá Quân (1.500)** (gần **Ngạo Tuyết 5.000**) |
| End-game hiện tại | 2 bộ HKMP (10 món `gq` 8–10, đủ 2 bộ +1.200) hoặc 1 bộ HKMP + Càn Khôn Giới Chỉ + đồ xanh cực phẩm + ngựa cấp 10 | ~5.800 – 7.500 | **Ngạo Tuyết (5.000)** |
| End-game tương lai *(có Bạch kim / cường hóa / Ấn / Trang sức)* | Bộ Bạch kim / Thiên Tứ +6…+10 + Ấn + Trang sức | 10.000 – 280.000+ | **Kinh Lôi (10.000)** → **Vô Cực (280.000)** |

> **Ghi chú cân bằng:** Với kho trang bị hiện có trong repo (chỉ mới có đồ trắng, đồ xanh 1–10 và 28 bộ Hoàng kim môn phái), ngưỡng tự nhiên của nhân vật mạnh nhất là khoảng **5.000–7.500** (tương ứng bậc **Ngạo Tuyết**). Nếu muốn người chơi hiện tại có thể chạm tới **Kinh Lôi (10.000)** → **Vô Cực (280.000)** ngay trước khi có đồ Bạch kim, chỉ cần chỉnh thang hệ số trong `FORTUNE` (`tuning.ts`) hoặc chỉnh lại mốc Tài phú yêu cầu của từng bậc Phi phong.

---

## 4. Kiến trúc triển khai dự kiến (khi được duyệt)

1. **Hằng số (`packages/shared/src/formulas/tuning.ts`):** thêm khối `FORTUNE` (điểm nền, điểm dòng, hệ số ô, hệ số dòng ẩn chưa kích hoạt, thưởng đủ bộ) — ghi nguồn `CHỌN`.
2. **Hàm tính thuần (`packages/shared/src/formulas/fortune.ts`):**
   - `itemFortune(item, def, activeHiddenCount): number`
   - `equipmentFortune(equip, charSeries): number`
3. **Kiểm tra điều kiện mặc & mua (`packages/shared/src/items/equip.ts`):**
   - Bổ sung `fortune?: number` vào `ItemViewer`.
   - Hỗ trợ `require_fortune_value` trong `missesReq` và `equipError` (`"Cần đạt Tài phú binh giáp <X>."`).
4. **Đồng bộ hiển thị (`apps/server/src/world/progress.ts`, `S2C.stats`, cửa sổ nhân vật F3):**
   - Server tính `fortune` cùng lúc với `refreshStats` khi đổi đồ, gửi xuống client để hiển thị trên bảng F3 và kiểm tra nút Mua ở Kỳ Trân Các (100 KNB).
