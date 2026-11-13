# Chỉ số nhân vật

Mã: `packages/shared/src/formulas/character.ts` (`characterStats`), hằng số `formulas/tuning.ts` (`STATS`, `RESIST`), bảng gốc
`characters/player.gen.ts` (sinh bằng `npm run gen:player -w @vltk/client`). Server tính ở `apps/server/src/world/progress.ts`
(`refreshStats`) mỗi khi cấp / điểm / trang bị đổi, gửi chủ nhân vật qua `S2C.stats`; cửa sổ F3 hiện đúng các số đó.

## Đầu vào

- **Hệ** (chọn khi tạo nhân vật), **cấp**, **điểm tiềm năng đã cộng**, **túi thuộc tính** (`AttrBag`: tổng các thuộc tính gốc
  [P1, P2, P3] từ trang bị, kỹ năng bị động, bùa — `formulas/attrs.ts`), **vũ khí** (cận chiến / ám khí / tay không + sát thương).

## Công thức

| Chỉ số | Công thức | Nguồn |
|---|---|---|
| Tiềm năng | khởi đầu theo hệ + điểm đã cộng + `strength_v` / `dexterity_v` / `vitality_v` / `energy_v` | DATA `newplayerini0x.ini` |
| Sinh lực tối đa | (Sinh khí × LifePerVitality + cấp × LifePerLevel + `lifemax_v`) × (1 + `lifemax_p`/100) | DATA `level_add.txt` (khớp 9/10 file nhân vật mới) |
| Nội lực tối đa | (Nội công × ManaPerEnergy + cấp × ManaPerLevel + `manamax_v`) × (1 + `manamax_p`/100) | DATA |
| Chính xác | (Thân pháp × 4 − 28 + `attackrating_v` + `attackratingenhance_v`) × (1 + (`attackrating_p` + `attackratingenhance_p`)/100) | SRC · JXWEB |
| Né tránh | (Thân pháp ÷ 4 + `adddefense_v` + `armordefense_v`) × (1 + `armordefenseenhance_p`/100) | SRC · JXWEB |
| Lực tay cơ bản | vũ khí × (1 + `weapondamageenhance_p`/100) + Sức mạnh ÷ 5 (ám khí: Thân pháp ÷ 5) + `addphysicsdamage_v` | WEB (÷5 Sức mạnh) · CHỌN (÷5 Thân pháp, theo JXWEB) |
| Nội công → sát thương | tắt (`energyDamageDivisor = 0`) | CHỌN: không nguồn nào có số |
| Kháng | kháng gốc theo hệ + `*res_p` + `allres_p`, kẹp trong [−trần, trần] | DATA (kháng gốc) |
| Trần kháng | min(95, 75 + `allresmax_p` + `*resmax_p`) | SRC · WEB · JXWEB |
| May mắn | 5 + `lucky_v` | USER (mặc định 5) |

Kháng gốc theo hệ (DATA `level_add.txt`, hỏa / băng / độc / lôi / vật lý): Kim −25/0/+25/0/0 · Mộc 0/0/0/+25/−15 · Thủy +25/0/0/−25/0 ·
Hỏa 0/−25/0/0/+15 · Thổ 0/+25/−25/0/0.

## Ví dụ (cấp 1, chưa cộng điểm, tay không)

| Hệ | Sức mạnh / Thân pháp / Sinh khí / Nội công | Sinh lực | Nội lực |
|---|---|---|---|
| Kim | 35 / 25 / 25 / 15 | 204 | 16 |
| Mộc | 20 / 35 / 20 / 25 | 103 | 77 |
| Thủy | 25 / 25 / 25 / 25 | 153 | 77 |
| Hỏa | 30 / 20 / 30 / 20 | 213 | 41 |
| Thổ | 20 / 15 / 25 / 40 | 76 | 163 |

Khớp `imaxlife` / `imaxinner` của các file nhân vật mới. `newplayerini01` (Kim nữ) là file lỗi (tổng tiềm năng 85): dùng dòng nam cho
cả hai giới (4 hệ còn lại hai giới giống hệt nhau).

## Chưa tính (bước sau)

Dòng thuộc tính đồ xanh / hoàng kim (TB8), bị động / hào quang / bùa (HU1–HU2), tốc độ, chí mạng — đều cộng vào `AttrBag` rồi đi qua
cùng hàm.
