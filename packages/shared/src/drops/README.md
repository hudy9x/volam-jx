# Hướng dẫn cấu hình tỉ lệ rơi đồ (`drop-config.json`)

File `packages/shared/src/drops/drop-config.json` cho phép bạn tăng/giảm trực tiếp tỉ lệ rơi **ngân lượng**, **trang bị**, **vật phẩm đặc biệt** và **số lượng đồ rơi** cho từng loại quái/boss mà không cần sửa code.

> **Lưu ý:** Sau khi sửa `drop-config.json`, cần **khởi động lại server** (và build lại nếu chạy bản production) để áp dụng.

---

## 1. Cấu trúc tổng thể

```json
{
  "version": 1,
  "profiles": {
    "normal": { ... },
    "blueBoss": { ... },
    "goldenBoss": {
      "default": { ... },
      "byTier": {
        "minor": { ... },
        "major": { ... },
        "newboss": { ... }
      }
    }
  },
  "overrides": {
    "740": { "rolls": 16, "moneyMul": 8 }
  }
}
```

- **`profiles.normal`**: Áp dụng cho **quái thường**.
- **`profiles.blueBoss`**: Áp dụng cho **Boss Xanh** (tỉ lệ xuất hiện 3% trên bãi quái thường hoặc đặt ở Map Manager).
- **`profiles.goldenBoss.default`**: Mức mặc định cho **Boss Hoàng Kim** (nếu chỉnh trong `tools/boss` / trang `/boss/`, các giá trị `dropRolls`, `blueRatePct`, `specialRatePct`, `goldRatePct` sẽ tự đồng bộ vào đây).
- **`profiles.goldenBoss.byTier`**: Ghi đè theo phân loại Boss Hoàng Kim (`minor` = Tiểu Boss, `major` = Đại Boss, `newboss` = Boss mới). Chỉ cần ghi các trường muốn khác `default`.
- **`overrides`**: Ghi đè riêng cho **từng con quái/boss theo `id`** (chuỗi số ID trong `monsters`). Ví dụ `"740"` là Huyền Giác Đại Sư. Chỉ cần ghi các trường muốn chỉnh riêng.

---

## 2. Giải thích từng trường dữ liệu

| Trường | Kiểu / Phạm vi | Ý nghĩa & cách chỉnh |
|---|---|---|
| **`rolls`** | Số nguyên `0`–`100` | **Số lần tung đồ** khi quái/boss chết (không tính bọc tiền). Đây cũng là **số món đồ tối đa** có thể rơi ra trong 1 lần hạ quái/boss. |
| **`minItems`** | Số nguyên `0`–`rolls` | **Số món tối thiểu chắc chắn rơi**. Nếu tung đủ `rolls` lần mà số món rơi ra vẫn ít hơn `minItems`, server sẽ tự bốc thêm trang bị cho đủ `minItems` món (đặt `1` cho Boss Xanh để không bao giờ bị "trắng tay"). |
| **`equipRatePct`** | Số thực `0`–`100` (%) | **Xác suất rơi 1 trang bị trong mỗi lần tung**. Ví dụ `rolls: 5`, `equipRatePct: 35` nghĩa là tung 5 lần, mỗi lần có 35% cơ hội ra 1 trang bị (vũ khí, áo, nhẫn, giày...). |
| **`luckBonus`** | Số nguyên | **Điểm May mắn cộng thêm** vào chỉ số May mắn của người kết liễu khi tung dòng thuộc tính cho trang bị. Số càng cao thì trang bị rơi ra càng dễ thành **đồ xanh** và có **nhiều dòng** (tối đa 6 dòng). |
| **`moneyRatePct`** | Số thực `0`–`100` (%) | **Xác suất rơi ngân lượng** khi hạ quái/boss (chỉ tung tiền 1 lần mỗi con chết). Đặt `100` nghĩa là luôn luôn rơi tiền. |
| **`moneyMul`** | Số thực `>= 0` | **Hệ số nhân số lượng ngân lượng** rơi ra so với công thức gốc theo cấp quái. Ví dụ `moneyMul: 3` thì bọc tiền rơi ra gấp 3 lần bình thường (`moneyMul: 1`). |
| **`specialRatePct`** | Số thực `0`–`100` (%) | **Xác suất rơi vật phẩm đặc biệt** trong mỗi lần tung (ví dụ thuốc quý, bí kíp, đại thành bí kíp...). |
| **`goldRatePct`** | Số thực `0`–`100` (%) | **Xác suất rơi trang bị Hoàng Kim** trong mỗi lần tung (chủ yếu dùng cho Boss Hoàng Kim có danh sách `goldDrops`). |
| **`specialItems`** | Mảng ID chuỗi *(tùy chọn)* | Danh sách ID vật phẩm sẽ bốc khi trúng `specialRatePct` (ví dụ `["potion-2-5", "potion-0-5", "potion-1-5"]`). Nếu bỏ trống sẽ dùng danh sách vật phẩm đặc biệt mặc định của Boss Hoàng Kim (`GOLDEN_BOSS_SPECIAL_ITEMS`). |

---

## 3. Quy tắc cần nhớ khi chỉnh số

1. Trong 1 lần tung, tổng **`equipRatePct + specialRatePct + goldRatePct` không được vượt quá `100`**. Phần trăm còn lại (nếu tổng `< 100`) là xác suất lượt tung đó không ra món nào (trượt).
2. **`minItems` không được lớn hơn `rolls`**.
3. **Ngân lượng (`moneyRatePct`, `moneyMul`)** được tính độc lập với `rolls` — dù các lần tung đồ có rơi hay trượt hết, tiền vẫn được tung riêng 1 lượt.
4. Thứ tự ưu tiên áp dụng: `profiles.<nhóm>` → `byTier` (nếu là Boss Hoàng Kim) → `overrides[monsterId]`.
