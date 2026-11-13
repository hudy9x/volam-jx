# Rơi đồ, nhặt đồ, may mắn, chỉ số đồ

Mã: `packages/shared/src/formulas/drops.ts` (`dropTableFor`, `itemLevelRange`, `rollItem`, `rollMoney`, `luckFactor`, `rollMagicLines`),
bảng gốc `drops/drops.gen.ts` (`npm run gen:drops -w @vltk/client`), trọng số dòng xanh `items/magicattrib.gen.ts` (`gen:magic`), hằng số
`formulas/tuning.ts` (`DROPS`, `LUCK`). Server: `apps/server/src/world/systems/drops.ts`, `world/progress.ts` (`equipmentBag`).
Nghiên cứu: [docs/research/luck-drops.md](../research/luck-drops.md).

## Khi quái chết (VT8, VT9)

| Bước | Luật | Nguồn |
|---|---|---|
| Bảng | dải cấp quái: `npcdroprate10` … `90` (bản đồ 37 / 140 dùng `npcdroprate10`) | DATA bảng · CHỌN (gốc chọn theo bản đồ / boss) |
| Số lần tung | thường 1, boss 8 | CHỌN (gốc: cột `Treasure` của `npcs.txt`, chưa nhập) |
| Một lần tung | x = rand(RandRange); đi qua các món theo RandRate cộng dồn → nhiều nhất 1 món; hết danh sách = không rơi | INFERRED |
| Món | Genre 0: Detail 0–9 = vũ khí cận chiến, tầm xa, áo, nhẫn, dây chuyền, giày, đai, nón, bao tay, ngọc bội; Particular = kiểu → id `kind-type-level` | DATA |
| Cấp món | lo = max(MinItemLevel, ⌊cấp quái / MinItemLevelScale⌋), hi = min(MaxItemLevel, ⌊cấp quái / MaxItemLevelScale⌋), tung trong [lo, hi] | INFERRED |
| Tiền | xác suất MoneyRate %; lượng ⌈cấp × MoneyScale × 0,1 × U(0,5–1,5)⌉ | DATA (tỉ lệ) · CHỌN (lượng) |
| Quyền nhặt | **người đánh chết quái** (VT9); sau **20 s** ai cũng nhặt được; biến mất sau **60 s** | USER |
| Nhặt | bấm vào vật rơi; xa hơn 80 thì tự đi tới rồi nhặt | CHỌN |
| Chưa làm | đồ hoàng kim (`Quality=1`, TB11), vật phẩm nhiệm vụ / script (Genre 4, 6), quái vàng, chia đồ tổ đội | |

Ví dụ (mô phỏng 100 000 lần, quái cấp 15): ra trang bị 2 %, ra tiền 20 % (trung bình 75 lượng), món cấp 1.

## Dòng xanh và may mắn (TB6, VT10)

Mỗi món rơi có hệ ngẫu nhiên và 6 vị trí dòng (chẵn = tiền tố luôn bật, lẻ = hậu tố ẩn của hệ món):

```
ngưỡng = rand(1 000 000) / hệ số may mắn
ứng viên = dòng trong magicattrib.txt cùng loại món, cấp dòng ≤ cấp món, (hậu tố: đúng hệ), chưa trùng thuộc tính, trọng số > ngưỡng
không có ứng viên → vị trí trống; có → chọn đều một dòng, giá trị trong [min, max]
hệ số may mắn = max(0,2; 1 + 0,2 × (May mắn − 5))
```

- R = 1 000 000: INFERRED từ giấy ghi phiên bản (`装备版本说明.txt`): dòng +kỹ năng "2 phần triệu" = trọng số 2, dòng may mắn "1/1000" = 1000.
- 0,2 mỗi điểm: SRC. **May mắn 5 (mặc định của nhân vật, USER) là mức trung tính** → ra đồ như bản gốc ở may mắn 0 (CHỌN, phương án B của
  nghiên cứu); đồ +may mắn thì tốt hơn.
- Mô phỏng vũ khí cấp 10: may mắn 0 → 0,5 dòng, 5 → 2,4 dòng, 15 → 4,5 dòng. Có ít nhất 1 dòng thì là đồ xanh, không có thì đồ trắng.

## Chỉ số đồ có tác dụng (TB8)

Túi thuộc tính của nhân vật = thuộc tính cơ bản của mọi món + **dòng của đồ xanh** (USER: đồ xanh và hoàng kim môn phái; hoàng kim: TB11):
tiền tố luôn tính, hậu tố ẩn chỉ tính khi được kích hoạt (`items/magic.ts activeHidden`: ô kích hoạt có hệ tương sinh, hoặc hệ nhân vật).
Thiên Tứ và đồ khác: TB17.

## Hoàng kim môn phái (TB11, TB13, TB14)

Mã: `packages/shared/src/items/gold.ts` (`createGold`, `SUITES`, `suiteWorn`, `fullSuite`), dữ liệu `items/gold.gen.ts`
(`npm run gen:gold -w @vltk/client` từ `goldequip.txt` + `magicattrib_ge.txt` bản mod — TB0 — và `goldequipres.txt`). Danh sách từng món:
[docs/equipment-gold-thientu.md](../equipment-gold-thientu.md).

| | Luật | Nguồn |
|---|---|---|
| Món | 28 bộ × 5 món = 140, 10 phái gốc; id `gold-<dòng goldequip>`; hình mặc theo `goldequipres` (hàng = số bộ phận − 2) | DATA (mod + data_extract) |
| Phẩm chất | 0–10 = ⌊rand × 11 × hệ số may mắn⌋ (tối đa 10); mỗi dòng = min + (max − min) × phẩm chất / 10 | SRC (công thức dòng) · CHỌN (cách tung phẩm chất) |
| Dòng | 6 dòng cố định; 1, 3, 5 luôn bật; 2, 4, 6 ẩn — bật khi được kích hoạt (như đồ xanh) **hoặc mặc đủ 5 món của bộ** | SRC · DATA (bộ 1–28 không có dòng thưởng bộ) |
| Có được | boss rơi theo bảng gốc (`Quality=1`, vd. Cổ Bách 0,06 % mỗi lần tung); bản dev: thẻ "Hoàng kim (dev)" ở Thợ rèn (server tắt khi `DEV_TOOLS=0`) | DATA · dev |
| Chưa làm | `allskill_v` (+cấp mọi kỹ năng) chưa cộng vào cấp chiêu; Thiên Tứ (TB12), hoàng kim đời sau (TB15) | |
