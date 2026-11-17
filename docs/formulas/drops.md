# Rơi đồ, nhặt đồ, may mắn, chỉ số đồ

Mã: `packages/shared/src/formulas/drops.ts` (`dropTableFor`, `itemLevelRange`, `rollEquipmentFromTable`, `rollItem`, `rollMoneyWithProfile`, `rollMoney`, `luckFactor`, `rollMagicLines`),
cấu hình tỉ lệ theo nhóm/boss `packages/shared/src/drops/drop-config.json` & `drops/config.ts` (mô tả các trường ở [packages/shared/src/drops/README.md](../../packages/shared/src/drops/README.md)),
bảng gốc `drops/drops.gen.ts` (`npm run gen:drops -w @vltk/client`), trọng số dòng xanh `items/magicattrib.gen.ts` (`gen:magic`), hằng số
`formulas/tuning.ts` (`DROPS`, `LUCK`). Server: `apps/server/src/world/systems/drops.ts`, `world/progress.ts` (`equipmentBag`).
Nghiên cứu: [docs/research/luck-drops.md](../research/luck-drops.md).

## Khi quái chết (VT8, VT9)

| Bước | Luật | Nguồn |
|---|---|---|
| Cấu hình theo nhóm/boss | `resolveDropProfile(tier, monsterId, goldenTier, goldenSettings)` đọc `drops/drop-config.json` (`normal`, `blueBoss`, `goldenBoss.default/byTier`, `overrides[id]`) | `drops/config.ts` |
| Bảng | dải cấp quái: `npcdroprate10` … `90` | DATA bảng · CHỌN |
| Số lần tung & tối thiểu | `profile.rolls` (mặc định: thường 1, Boss Xanh 5, Hoàng Kim 12/theo tier); nếu rơi ít hơn `profile.minItems` (Boss Xanh 1, Hoàng Kim 2–5) thì tung bù trang bị cho đủ | `drop-config.json` |
| Một lần tung | Tung `0..100`: theo `goldRatePct` → `specialRatePct` → `equipRatePct`; khi trúng trang bị, `rollEquipmentFromTable` bốc ngẫu nhiên theo trọng số `genre = 0` trong bảng cấp quái | `drops/config.ts` · `formulas/drops.ts` |
| Món | Genre 0: Detail 0–9 = vũ khí cận chiến, tầm xa, áo, nhẫn, dây chuyền, giày, đai, nón, bao tay, ngọc bội; Particular = kiểu → id `kind-type-level` | DATA |
| Cấp món | lo = max(MinItemLevel, ⌊cấp quái / MinItemLevelScale⌋), hi = min(MaxItemLevel, ⌊cấp quái / MaxItemLevelScale⌋), tung trong [lo, hi] | INFERRED |
| Tiền | xác suất `profile.moneyRatePct` %; lượng `⌈cấp × MoneyScale × 0,1 × U(0,5–1,5)⌉ × profile.moneyMul` | `drop-config.json` · CHỌN |
| Quyền nhặt | **người đánh chết quái** (VT9); sau **20 s** ai cũng nhặt được; biến mất sau **60 s** | USER |
| Nhặt | bấm vào vật rơi; xa hơn 80 thì tự đi tới rồi nhặt | CHỌN |
| Chưa làm | vật phẩm nhiệm vụ / script theo từng map (`Genre 4, 6` trong `npcdroprate`), chia đồ tổ đội | |

Ví dụ theo cấu hình mặc định hiện tại:
- Quái thường cấp 15: **5 %** ra trang bị (món cấp 1), **40 %** ra tiền (trung bình ~75 lượng/bọc).
- Boss Xanh cấp 30: tung **5** lần, **100 %** rơi ít nhất **1** trang bị (35 % mỗi lượt, cộng +2 may mắn), **100 %** rơi tiền ×3 (trung bình ~450 lượng/bọc), và **5 %** mỗi lượt ra thuốc quý (`specialItems`).

### Bảng cấu hình mặc định (`packages/shared/src/drops/drop-config.json`)

| Nhóm | `rolls` | `minItems` | `equipRatePct` | `specialRatePct` | `goldRatePct` | `luckBonus` | `moneyRatePct` | `moneyMul` |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Quái thường (`normal`) | 1 | 0 | 5 % | 0 % | 0 % | +0 | 40 % | ×1 |
| Boss Xanh (`blueBoss`) | 5 | 1 | 35 % | 5 % *(thuốc quý)* | 0 % | +2 | 100 % | ×3 |
| Boss Hoàng Kim (`goldenBoss.default`) | 12 | 3 | 73,6 % | 19,9 % | 3,4 % | +3 | 100 % | ×4 |
| ↳ Tiểu Boss (`byTier.minor`) | 8 | 2 | *(kế thừa)* | *(kế thừa)* | 1,5 % | *(kế thừa)* | *(kế thừa)* | ×3 |
| ↳ Đại Boss (`byTier.major`) | 12 | 4 | *(kế thừa)* | *(kế thừa)* | 3,4 % | *(kế thừa)* | *(kế thừa)* | ×5 |
| ↳ Boss mới (`byTier.newboss`) | 15 | 5 | *(kế thừa)* | *(kế thừa)* | 5,0 % | *(kế thừa)* | *(kế thừa)* | ×6 |

- Có thể ghi đè riêng từng con quái/boss theo `id` trong `overrides` (xem chi tiết ý nghĩa từng trường tại [packages/shared/src/drops/README.md](../../packages/shared/src/drops/README.md)).
- Khi chỉnh thông số Boss Hoàng Kim trên giao diện `tools/boss` (`packages/shared/src/bosses/config.json`), các trường `dropRolls`, `blueRatePct`, `specialRatePct`, `goldRatePct` sẽ tự đồng bộ vào nhóm `goldenBoss` nếu chưa bị `byTier` / `overrides` ghi đè.

## Dòng xanh và may mắn (TB6, VT10)

Mỗi món rơi có hệ ngẫu nhiên và 6 vị trí dòng (chẵn = tiền tố luôn bật, lẻ = hậu tố ẩn của hệ món). Điểm may mắn dùng để tung dòng = `May mắn nhân vật + profile.luckBonus` (mặc định `+0` quái thường, `+2` Boss Xanh, `+3` Boss Hoàng Kim):

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
