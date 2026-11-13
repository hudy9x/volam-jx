# Thuộc tính trang bị lên nhân vật (vòng 30)

Mã: `packages/shared/src/items/gold.ts` (`wornActiveCount`, `revealsHidden`, `equipSkillBonus`, `suiteOf`), server
`world/progress.ts` (`equipmentBag`, `refreshStats`, `effectiveSkills`), engine `skills/engine/SkillEngine.ts` (`levelOf`).
Cài đặt: `formulas/tuning.ts` `HIDDEN_LINES`.

## Dòng ẩn

| Trường hợp | Dòng ẩn được bật | Nguồn |
|---|---|---|
| Thường | mỗi ô kích hoạt tương sinh + hệ nhân vật tương sinh = 1 dòng (`activeHidden`) | suy luận (vòng 14) |
| Mặc **đủ bộ** hoàng kim môn phái | **mọi dòng ẩn của mọi món đang mặc** (của bộ và món khác) | USER 2026-11-13, `HIDDEN_LINES.fullSetRevealsAll.gold = true` (đặt `false` → chỉ món của bộ) |
| Đủ bộ Thiên Tứ | như trên khi Thiên Tứ có trong game (TB12) | `HIDDEN_LINES.fullSetRevealsAll.thientu` |
| Đeo **Càn Khôn Giới Chỉ** | mọi dòng ẩn của mọi món đang mặc | USER 2026-11-13 (`revealHidden`); dữ liệu gốc của nhẫn chỉ có 2 dòng dưới đây |

Server (chỉ số) và tooltip dùng cùng một hàm (`wornActiveCount`), nên dòng đã bật hiện màu vàng, chưa bật màu xám.

## Kỹ năng từ trang bị (`allskill_v`, câu gốc "Kỹ năng #l3: +#d1 cấp")

- P3 = mã chiêu → chiêu đó +P1 cấp; P3 = 0 → **"Võ công vốn có"**: mọi chiêu của môn phái đã học (cấp > 0) +P1 (như jx-web-main
  `core/attributes-01.js`). 157 dòng hoàng kim là chiêu riêng (+1 → +3), 28 dòng là võ công vốn có (+1).
- Cấp dùng = cấp học + cộng thêm (có thể vượt 20 / 30); cửa sổ Kỹ năng hiện cấp đó **màu xanh dương** ("Cấp học X + Y từ trang bị").
  Chỉ dòng đang bật mới tính. Áp cho sát thương / bùa / bị động (`passiveBag`, `skillBonuses`).

## Càn Khôn Giới Chỉ

Bảng mod `settings/item/004/goldequip.txt` dòng 428 (`obj-ring10`, "Uẩn Hàm Cường Đại Thần Bí Lực Lượng Giới Chỉ!"): `indestructible_b` 1
(không thể phá hủy) + `allskill_v` 2 (võ công vốn có +2). Nhận ở lệnh bài. Thêm (USER): bật mọi dòng ẩn.

## Danh sách bộ

Tooltip món hoàng kim: "Bộ <tên> (n/5)", từng món (đang mặc xanh lá, chưa có xám), dòng "Mặc đủ bộ: kích hoạt toàn bộ thuộc tính ẩn".

## Ngoại hình hoàng kim

`goldequipres.txt` để trống mã bộ phận ở 8 món (áo Phục Ma / Tứ Không Thiếu Lâm, Vô Gian / Vô Ma Nga My, Tê Hoàng Thúy Yên, mũ Đồng Cừu
Cái Bang, áo Lăng Nhạc Võ Đang, Sương Tinh Côn Lôn): `gen:gold` lấy ngoại hình của món thường cùng loại / ParticularType / cấp
(**suy luận**, engine không có trong client). Áo kiểu 15 / 18 là hàng "trang phục" mà `gen:assets` trước đây bỏ qua; nay `gen:assets` sinh
thêm các hàng hoàng kim cần.
