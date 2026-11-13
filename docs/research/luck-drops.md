# VT12: may mắn, rơi đồ, xếp hạng vật phẩm (2026-11-12)

Ký hiệu: **VERIFIED** là đọc thẳng từ dữ liệu gốc. **INFERRED** là suy ra từ dữ liệu, có ghi lý do. **SRC-cũ** là ghi chép từ engine fork,
nay đã xóa nên không đối chiếu lại được. **jx-web-main** là cách game web làm, không có giá trị làm chuẩn. **TỰ ĐẶT** là số mình tự chọn.
Script và số liệu mô phỏng nằm trong thư mục này: `sim.txt`, `score.txt`, `magicattrib-weights.txt`.

## 0. Nguồn đã đọc (sửa lại vài điều đang ghi trong tài liệu)

- Bảng rơi **không nằm trong `slistcache`**. `data_extract` chỉ có **50 file** (`update01/settings/droprate/**` và
  `update01/settings/item/npcdroprate.ini`, `armydroprate.ini`…). Thư mục mod `jx-origin/settings/droprate` có 133 file (tính cả
  `settings/item/*droprate*` là 149). Chưa tìm ra nguồn của con số "208 bảng". Theo luật TB0, ngoại lệ chỉ áp dụng cho
  `settings/item/`, nên muốn dùng các bảng rơi mod thì **cần người dùng đồng ý**.
- `maplist.ini` **không có hệ số nhân**. Mỗi bản đồ chỉ trỏ tới **file**: `N_NormalDropRate`, `N_GoldenDropRate`. Ngoài ra có
  `N_AutoGoldenNpc` (2000 / 3000 / 1000000) và `N_GoldenType` (13–16). Bản đồ 37 và 140 dùng `npcdroprate10.ini` và
  `goldennpc/golden_lv40.ini`. Bản đồ 140 có thêm `NpcAutoLevel` 15–15. **VERIFIED**
- `gamesetting.ini [ServerConfig] ExpRate=100, MoneyRate=100` là hệ số chung của server, nhiều khả năng tính theo % (**INFERRED**).
  `LuckyStarAura=291` là kỹ năng hào quang Ngôi sao may mắn. `LuckyOneStone/Two/Three=10/20/30` và `LuckyRandom=10` thuộc khảm nạm.
  **VERIFIED**
- `npcs.txt` (slistcache) có cột `Treasure` và `DropRateFile`. 385 quái thường trỏ `\settings\item\npcdroprate.ini`; 1492 dòng để
  trống (đa số là NPC). **VERIFIED**
- Giấy ghi phiên bản trang bị `update01/settings/item/00x/装备版本说明.txt`. **VERIFIED**, đây là chìa khóa của mục (a):
  - 000/001: "公测开始时的装备版本。存在魔法属性生成时随机数范围过小的问题" (bản lúc mở thử nghiệm, **khoảng số ngẫu nhiên khi sinh
    thuộc tính quá nhỏ**).
  - 002 (2003/9/23): "修正…随机数范围过小…程序修改了随机算法，策划修改了npcdroprate里面的魔法装备生成几率，magicattrib里面的属性出现几率"
    (sửa lỗi đó: lập trình đổi thuật toán, thiết kế đổi tỉ lệ đồ ma pháp trong npcdroprate và tỉ lệ xuất hiện trong magicattrib).
  - 003 (2003/11/27): "增加所有技能等级魔法属性的出现几率为百万分之2" (dòng +tất cả kỹ năng xuất hiện với tỉ lệ **2 phần triệu**),
    và "运气出现的几率" (tỉ lệ ra dòng may mắn).
  - 004 (2004/01/06, TCVN3): "Chỉ có Nhẫn, Dây chuyền, Đai đầu hệ Mộc mới xuất hiện thuộc tính may mắn, **từ 1/100 đến 1/1000**".
- API tạo đồ trong script: `NewDynamicGoods(idx, version, randSeed, quality, genre, detail, particular, level, series, **luck**,
  magicLevel1..6, upgrade)` (`slistcache/script/second_hand_store/itemdef.lua`). Tức là bộ sinh đồ gốc nhận **luck** và
  **6 mức dòng**, và có hạt giống ngẫu nhiên. **VERIFIED**

## (a) May mắn tác động thế nào

| Điều | Mức tin | Chi tiết |
|---|---|---|
| May mắn **không đổi tỉ lệ rơi**, chỉ đổi thuộc tính món đồ | VERIFIED theo nguồn cũ (trang chính thức, người thiết kế năm 2003; nay không mở lại được) + SRC-cũ | `docs/combat-formulas.md` §9.1 |
| Bộ sinh đồ nhận tham số luck | VERIFIED | Chữ ký `NewDynamicGoods` ở trên |
| Trọng số trong `magicattrib.txt` là **xác suất trên một triệu** | **INFERRED, chứng cứ mạnh** | Trọng số nằm trong khoảng 1…500000. Dòng +tất cả kỹ năng có trọng số 2 (vũ khí cận chiến), 1 (nhẫn), khớp câu "2 phần triệu". Dòng may mắn có trọng số 10000 → 1000 theo mức 1 → 10, khớp câu "1/100 đến 1/1000" |
| Mỗi vị trí dòng (6 vị trí: chẵn = tiền tố, lẻ = hậu tố theo ngũ hành của món): `ngưỡng = ngẫu nhiên(0…R−1) / (1 + May mắn × 20/100)`; dòng nào có trọng số theo loại đồ **> ngưỡng**, mức ≤ mức món, không trùng loại thì vào danh sách; chọn **đều** một dòng; danh sách rỗng thì vị trí đó trống | SRC-cũ (công thức), jx-web-main giống y hệt (`p6`, R = 100) | Theo bản fan **R = 100**. Nhưng R = 100 chính là lỗi "khoảng số ngẫu nhiên quá nhỏ" của bản 000/001: mọi dòng có trọng số ≥ 100 đều qua ngưỡng. **INFERRED: bản đã sửa dùng R = 1 000 000** |
| Vậy một dòng trọng số w lọt vào danh sách với xác suất `min(1, w × (1 + 0,2 × May mắn) / R)` | INFERRED | May mắn 5 → ×2, may mắn 10 → ×3 |
| May mắn làm tăng **số dòng**, **dòng hiếm** và một chút **mức dòng** | INFERRED (mô phỏng) | Xem bảng dưới |
| Đồ hoàng kim: các dòng **cố định** (cột 47–52 của `goldequip.txt` trỏ vào `magicattrib_ge.txt`), chỉ giá trị được tung trong [min, max] | VERIFIED (bảng) | May mắn kéo giá trị lệch về phía max: SRC-cũ ("khoảng may mắn min–max riêng"), không kiểm lại được |
| Bạch kim / Thiên Tứ: `platina_magicrate.txt` có Rate1–3 / MagicIdx1–3 theo cấp, **không có cột may mắn** | VERIFIED | |
| Tỉ lệ ra đồ hoàng kim **không dính tới may mắn**: chỉ là các dòng `Quality=1` trong bảng rơi | VERIFIED (bảng) + INFERRED (không có cơ chế nào khác) | |
| Nguồn may mắn: dòng `lucky_v` +1…+10 (hậu tố hệ Mộc, chỉ trên nhẫn / dây chuyền / ngọc bội), Bánh chưng May mắn +30, hào quang 291 | VERIFIED | |

### Mô phỏng (20 000 món / ô, bảng `magicattrib.txt` thật; số % làm tròn)

| Giả thuyết | Món | May mắn | Số dòng TB | Phân bố số dòng 0/1/2/3/4/5/6 (%) | Mức dòng TB | Có kháng | Dòng hiếm |
|---|---|---|---|---|---|---|---|
| **R = 1e6** | vũ khí cận chiến L10 | 0 | 2,38 | 3 / 17 / 35 / 32 / 12 / 2 / 0 | 3,2 | 67% | bỏ qua phòng thủ 0,08%, hút máu/nội 0,04% |
| R = 1e6 | vũ khí cận chiến L10 | **5** | **4,18** | 0 / 0 / 1 / 15 / 51 / 30 / 3 | 3,1 | 80% | 0,17% / 0,08% |
| R = 1e6 | vũ khí cận chiến L10 | 10 | 4,51 | 0 / 0 / 0 / 7 / 41 / 46 / 6 | 3,75 | 80% | 0,19% / 0,17% |
| R = 1e6 | nhẫn L10 | 0 / 5 / 10 | 2,33 / 3,95 / 4,33 | | 2,6–3,0 | | may mắn 0,43% / 0,94% / 1,56% |
| R = 100 (bản fan, jx-web-main) | vũ khí cận chiến L10 | 0–10 | **6,00** | 100% có 6 dòng | 5,7 | 60% | hút máu 39%, bỏ qua phòng thủ 5,5%; +kỹ năng 0,2–0,7% |
| R = 100 | nhẫn L10 | 0–10 | 5,6 | | 5,65 | | may mắn **20%** (vô lý so với "1/100–1/1000") |

Kết luận: với R = 100, may mắn gần như chỉ đổi dòng +kỹ năng và mọi món đều đủ 6 dòng, đúng là lỗi mà bản 002 đã sửa. R = 1e6 khớp
với mọi câu trong giấy ghi phiên bản. **+tất cả kỹ năng** với R = 1e6: khoảng 2×10⁻⁶ × hệ số may mắn × (1 / số ứng viên), tức dưới
1 / 1 000 000 món: siêu hiếm, đúng ý thiết kế.

## (b) Bảng xếp hạng vật phẩm (đề xuất; mọi ngưỡng là TỰ ĐẶT)

**Điểm một dòng** = `mức dòng (1–10) + 3 × log10(1 000 000 / w)`, trong đó w là trọng số của dòng đó cho loại món này. Ví dụ: Sinh
lực mức 1 (w 500 000) được 1,9 điểm; may mắn +10 (w 1000) được 19; +1 tất cả kỹ năng (w 2) được 5 + 17,1 = 22.
Điểm dựa trên độ hiếm thật của bảng gốc nên không phải gán tay từng thuộc tính.
**Điểm món** = `2 × cấp món + Σ điểm dòng` (dòng ẩn chưa kích hoạt vẫn tính, vì xếp hạng nói về món chứ không về người mặc).

Phân vị điểm mô phỏng (R = 1e6):

| Món | May mắn | p50 | p90 | p99 | p99,9 |
|---|---|---|---|---|---|
| vũ khí cận chiến L10 | 0 | 31 | 41 | 51 | 60 |
| vũ khí cận chiến L10 | 5 | 40 | 50 | 61 | 69 |
| vũ khí cận chiến L5 | 5 | 26 | 33 | 40 | 46 |
| nhẫn L10 | 5 | 36 | 46 | 56 | 63 |
| áo L8 | 5 | 32 | 41 | 49 | 55 |

**Hạng** xét bằng điều kiện rõ ràng (dễ hiểu, dùng cho màu tên, lọc nhặt của Auto, thông báo). Điểm chỉ dùng để sắp xếp trong một hạng:

| Hạng | Tên | Điều kiện (món thường) | Gợi ý màu / dùng |
|---|---|---|---|
| 0 | Trắng | 0 dòng | trắng, Auto mặc định bỏ qua |
| 1 | Xanh | 1–2 dòng | xanh lam |
| 2 | Xanh tốt | ≥ 3 dòng, **hoặc** có dòng mức ≥ cấp món − 1 (với món cấp ≥ 5) | xanh lam đậm |
| 3 | Xanh hiếm | ≥ 5 dòng, **hoặc** có 1 dòng hiếm (w ≤ 10 000 cho loại món đó: hút máu/nội, bỏ qua phòng thủ, phản đòn, kháng tất cả, may mắn, hồi sinh lực, hồi nội lực, sát thương ma pháp nguyên tố, kháng vật lý, không thể phá hủy) | tím nhạt, thông báo cho người nhặt |
| 4 | Cực phẩm | có **+tất cả kỹ năng**, **hoặc** ≥ 2 dòng hiếm, **hoặc** đủ 6 dòng | cam, thông báo kênh |
| 5 | Hoàng kim | `q = 1` (`goldequip`) | vàng; điểm = 2 × cấp + Σ (giá trị / max) × 10 mỗi dòng |
| 6 | Bạch kim / Thiên Tứ | `platinaequip` | |

Ghi chú: bảng xanh **không có** dòng chí mạng; chí mạng chỉ có trên đồ hoàng kim (`magicattrib_ge`). Các dòng `adddefense_v`,
`visionradius_p`, `*skill_v` (theo hệ) có trọng số 0 trên mọi loại món nên không bao giờ ra.

## (c) Định dạng bảng rơi

Ví dụ `[Main]`: `Count, RandRange, MagicRate, MoneyRate, MoneyScale, MinItemLevel, MinItemLevelScale, MaxItemLevel, MaxItemLevelScale`.
Mỗi `[n]`: `Genre, Detail, Particular, RandRate`, có thể có thêm `Quality`, `MinItemLevel`, `MaxItemLevel`, `MagicLevel1`, `Series`,
`EnchasableRate`, `MinSocket`, `MaxSocket`. `[Main]` có thể có `IsTeamShare`, `TeamShareRate`. **VERIFIED** (đã quét 149 file mod).

| Trường | Giá trị gặp | Cách hiểu tốt nhất | Mức tin |
|---|---|---|---|
| `Genre/Detail/Particular` | 0 = trang bị, Detail 0 cận chiến · 1 tầm xa · 2 áo · 3 nhẫn · 4 dây chuyền · 5 giày · 6 đai · 7 nón · 8 bao tay · 9 ngọc bội; 4 = vật phẩm nhiệm vụ (Detail = cột DetailType của `questkey.txt`, ví dụ 238 Lam Thủy Tinh); 6 = `magicscript` (sách, rương, hồng bao…) | ứng với `ItemDef` `${kind}-${type}-${level}` của mình | VERIFIED (`各种类droprate文字描述.txt`) |
| `RandRange` | 10000 / 330000 / 1e6 / 3e6 / 1e7 | mẫu số của **một lần tung** | INFERRED; bảng boss và quái vàng có ΣRandRate = RandRange đúng tuyệt đối (lần tung nào cũng ra món) |
| `RandRate` | | xác suất món = RandRate / RandRange; một lần tung đi theo tích lũy, chọn nhiều nhất 1 món, phần dư là không rơi gì | INFERRED |
| `Quality=1` | 460 dòng | Detail là **id đồ hoàng kim** (ví dụ 159 Định Quốc Thanh Sa Trường Sam) | VERIFIED |
| `MagicRate` | **luôn bằng 1** (149/149 file) | cờ bật: sinh dòng xanh (6 mức dòng = cấp món) | INFERRED (không file nào khác 1 nên không thể là %) |
| `MoneyRate` | 0–100 (thường 20; quái vàng 70; boss 0) | % mỗi lần quái chết rơi tiền | INFERRED |
| `MoneyScale` | 0 / 25 / 50 / 100 / 800 | hệ số lượng tiền (quái vàng 100 = gấp đôi quái thường 50) | INFERRED, công thức lượng tiền chưa rõ |
| `MinItemLevel / MinItemLevelScale / MaxItemLevel / MaxItemLevelScale` | 1/20/10/10 thường; 7/20/10/10 quái vàng 80–90; 10/10/10/10 boss | `hi = min(MaxItemLevel, ⌊cấp quái / MaxScale⌋)`, `lo = max(MinItemLevel, ⌊cấp quái / MinScale⌋)`, đổi chỗ nếu lo > hi, cấp món ngẫu nhiên trong [lo, hi], kẹp 1–10 | INFERRED; jx-web-main hiểu giống (`I4`), nhưng nó loại trừ hi (có lẽ là lỗi) |
| `Treasure` (cột trong `npcs.txt`) | quái thường 1–3, boss task 8, boss thế giới 24, quái vàng 1–4, cây thông 9–25 | **số lần tung** mỗi lần chết | INFERRED, chứng cứ mạnh |
| `IsTeamShare/TeamShareRate` | 4 file thủ thành | chia đồ cho tổ đội | INFERRED; để sau (GP14) |

**Quái dùng bảng nào** (INFERRED): `DropRateFile` riêng của quái (boss, sự kiện, quái riêng) nếu khác bảng chung
`\settings\item\npcdroprate.ini`; còn lại dùng `NormalDropRate` của bản đồ (bảng của bản đồ có cùng tỉ lệ trang bị với bảng chung,
cộng thêm vật phẩm, nên là bản thay thế theo bản đồ); quái hóa vàng dùng `GoldenDropRate`. Bảng `goldennpc/各迷宫所使用droprate对照.txt`
xác nhận bảng quái vàng được chọn **theo bản đồ** (ví dụ "雁石洞迷宫 → 80_13droprate.ini"), VERIFIED.
`AutoGoldenNpc` hiểu là xác suất trên một triệu để một con quái lúc sinh ra hóa vàng (2000 = 0,2%; 1 000 000 = luôn luôn), INFERRED.

**Không có hệ số nhân theo bản đồ.** Bảng của bản đồ cấp thấp có `RandRange` nhỏ hơn: `npcdroprate10` là 330 000, tức tỉ lệ trang bị
gấp khoảng 3 lần `npcdroprate30–90` (1e6). Hệ số chung duy nhất là `gamesetting` `MoneyRate` / `ExpRate`.

### Ba bảng thật đã giải mã (`data_extract/update01`)

1. **`npcdroprate10.ini`** (bản đồ 37, 140, 1, 2, 11, 20, 53, 78…): RandRange 330 000, Money 20% / 50, cấp món 1/20 – 10/10.
   Trang bị tổng 20 000 / 330 000 = **6,06% mỗi lần tung**: từng vũ khí 0,091%; từng áo hoặc nón 0,152%; từng đôi giày 0,121%;
   nhẫn, dây chuyền, ngọc bội 0,030%. Thủy tinh 4,238–240 có RandRate 1 (≈ 3 phần triệu). Sách hoặc hồng bao (6,1,18/19) 0,002–0,008%.
   Phần mod Việt Nam: Mãng cầu 40%, Dừa 10%, Đu đủ 2%, Xoài 0,2%, 4,955 0,06% (trái cây Tết; bỏ qua).
   Quái cấp 15 (bản đồ 140): hi = min(10, ⌊15/10⌋) = 1, lo = max(1, ⌊15/20⌋) = 1, nên **chỉ ra món cấp 1**.
2. **`goldennpc/golden_lv40.ini`** (quái vàng của các bản đồ trên): RandRange 3e6, ΣRandRate = 3e6 (**lần tung nào cũng ra món**),
   Money 70% / 100. Trang bị ≈ 87,8% (vũ khí 1,5% mỗi loại, nón 1,76–2,5%…). Magicscript 6,1,1027 chiếm 11,1%, 6,1,1028 chiếm 1,1%.
   Thủy tinh 0,001%. Không có dòng hoàng kim.
3. **`boss/gubodroprate.ini`** (Cổ Bách, Treasure 24): RandRange 10 000, ΣRandRate = 10 000, không rơi tiền, cấp món 10 cố định.
   Giày, kiếm, áo, nón (Particular 1/4) mỗi loại 15%; sách Thiết La Hán 6,1,23 7%; phi phong 6,1,15 3%; Chìa khóa cơ quan 4,353 2,94%;
   10 loại hoàn 6,0,1–10 mỗi loại 1%; **hoàng kim 0,21 `Quality=1` 0,06%**. Với 24 lần tung: 1 − 0,9994²⁴ ≈ **1,4% mỗi lần giết**
   ra một món hoàng kim.

Thêm: quái vàng `90_01234droprate.ini` có 7 dòng hoàng kim (159, 161–164, 166, 167), tổng RandRate 112 / 3e6 ≈ 0,0037% mỗi lần tung.
Hậu tố tên file (`_01234`, `_13`, `_44`…) là các hệ (ngũ hành) của sách và đồ hoàng kim được rơi (`文字描述.txt` chia theo 金木水火土).

## (d) Đề xuất triển khai đơn giản (may mắn mặc định 5)

1. **Tool `gen:drops`**: đọc các file `.ini` (ưu tiên `data_extract/update01`; bảng mod chỉ khi người dùng đồng ý) và ghi
   `packages/shared/src/drops/drops.gen.ts`, dạng `{ range, money: [rate, scale], lvl: [min, minScale, max, maxScale], rows: [genre, detail, particular, rate, quality?][] }`.
   `gen:assets` ghi thêm `treasure` và `drop` vào `monsters.gen.ts`; bản đồ ghi `normalDrop`, `goldenDrop`, `autoGolden`.
2. **Khi quái chết** (quyền theo người giết, VT9): chọn bảng như mục (c). Số lần tung = `clamp(treasure, 1, 24)`, ô trống thì 1.
   Mỗi lần tung: `r = rand(range)`, đi tích lũy RandRate. Chỉ xử lý Genre 0 (và Quality 1 khi đã có TB11); Genre 4/6 bỏ qua cho tới
   khi có vật phẩm tương ứng (ghi log). Nếu món phân biệt nam/nữ hoặc không có `def` thì bỏ.
3. **Cấp món**: công thức (c), tung **trong cả hai đầu** [lo, hi].
4. **Dòng xanh** (`MagicRate = 1`): ngũ hành của món ngẫu nhiên 0–4; 6 vị trí; `R = 1 000 000` (**INFERRED**, khác bản fan);
   `ngưỡng = rand(R) / f`; ứng viên là dòng có `w[loại] > ngưỡng`, mức ≤ cấp món, đúng tiền tố / hậu tố + hệ, không trùng loại;
   chọn đều; giá trị đều trong [min, max]; 0 dòng thì món trắng. Cần sinh thêm trọng số vào `magicattrib.gen.ts` (hiện tool bỏ cột
   trọng số, chỉ giữ `kinds`).
5. **May mắn**, `f = 1 + 0,2 × L_hiệu_dụng` (hệ số 0,2 lấy từ SRC-cũ; hằng số đặt trong `items/tuning`). Hai cách để chọn:
   - **A (đúng chữ):** L_hiệu_dụng = 5 + `lucky_v`. Mặc định f = 2: vũ khí cấp 10 trung bình 4,2 dòng, dòng hiếm gấp đôi bản gốc.
   - **B (khuyên dùng, TỰ ĐẶT):** may mắn 5 là mức trung tính, `f = max(0,2; 1 + 0,2 × (May mắn − 5))`. Mặc định cho kết quả như bản
     gốc (2,4 dòng, may mắn mỗi điểm vẫn có giá trị, đeo đồ +10 may mắn thì f = 3).
6. **Tiền** (TỰ ĐẶT): mỗi lần quái chết (không nhân theo lần tung), xác suất `MoneyRate%`;
   lượng = `ceil(cấp quái × MoneyScale / 10 × U(0,5…1,5)) × gamesetting.MoneyRate / 100`. Quái cấp 30 bảng thường được khoảng
   150 lượng (giáp cấp 1 giá 100, cấp 10 giá 10 000). May mắn không tác động (theo §9.1).
7. **Đồ rơi**: tồn tại 60 giây, 20 giây đầu chỉ người giết (đã chốt). Hạng (mục b) quyết định màu tên trên đất, bộ lọc nhặt của Auto
   và thông báo.
8. **Để sau**: quái hóa vàng (`AutoGoldenNpc` theo triệu, số lần tung 2–6 theo nguồn web §9.2), dòng `Quality=1` (TB11), giá trị
   hoàng kim theo may mắn (lệch về max, TỰ ĐẶT khi làm), `IsTeamShare` (GP14).

### Danh sách số tự đặt hoặc suy luận

| Số | Mức tin |
|---|---|
| R = 1e6 | INFERRED |
| Hệ số 0,2 / điểm may mắn | SRC-cũ |
| Mốc trung tính 5 (cách B) | TỰ ĐẶT |
| Công thức cấp món | INFERRED |
| Treasure = số lần tung, trần 24 | INFERRED / TỰ ĐẶT |
| Công thức lượng tiền, MoneyRate tính theo lần chết | TỰ ĐẶT |
| Thang điểm, ngưỡng hạng, ngưỡng "dòng hiếm" w ≤ 10 000 | TỰ ĐẶT |
| Thứ tự chọn bảng (riêng → bản đồ → chung) | INFERRED |
| AutoGoldenNpc tính theo triệu | INFERRED |
