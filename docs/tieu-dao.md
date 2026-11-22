# Môn phái Tiêu Dao (Xiaoyao)

> Tài liệu tổng hợp thiết kế, nguồn dữ liệu, cơ chế kỹ năng, trang bị và lệnh sinh asset cho môn phái **Tiêu Dao** trong `jx-system-online`.
> Nguồn gốc tham khảo: `/Users/hudy/ws/volam-3005/documents/vu-hon-va-tieu-dao.md`, `volam-3005/Client/data/updatejx16.pak`, `volam-3005/Client/Settings/*`, `volam-3005/Server/script/skill/{xiaoyao,advancedskill}.lua`.

---

## 1. Tổng quan môn phái

| Thuộc tính | Giá trị |
|---|---|
| ID / Mã môn phái | `xiaoyao` · `MENPAI[12]` |
| Ngũ hành / Phe | **Hệ Thổ** (`series = 4`) · **Trung lập** |
| Giới tính | Nam & Nữ (`factionAllowsGender` cho phép cả hai) |
| Hai nhánh võ công | **Tiêu Dao Kiếm** (Ngoại công, vũ khí Kiếm `weaponType = 0`) · **Tiêu Dao Cầm** (Nội công, vũ khí Cổ Cầm `weaponType = 103`, `kind: 'range', type: 3`) |
| Ngoại trang đặc trưng | 4 bộ trang phục mới `look = 161..164` (`MA_*_141..144` cho Nam, `FM_*_144..147` cho Nữ); khi cầm Cổ Cầm (`GuqinW*`) nhân vật tự fallback áo/mũ sang bộ Tiêu Dao `161` nếu đang mặc đồ thường không có animation đàn |

---

## 2. Nguồn dữ liệu & lệnh sinh asset (`gen:xiaoyao`)

Tiêu Dao được tích hợp theo kiến trúc **overlay tách biệt** hoàn toàn với 11 phái SHXT gốc (`*.gen.ts` cũ không bị xáo trộn):

- **Trình đọc PAK trực tiếp:** `apps/client/tools/jx/pak.ts` hỗ trợ giải nén **UCL NRV2B (`method 0x20`)**, đọc bảng index từ EOF (`file_size - count * 16`) và tự căn chỉnh offset header `SPR\0` / `RIFF` của `updatejx16.pak`.
- **Generator:** `apps/client/tools/gen-xiaoyao.ts` — chạy qua:
  ```bash
  JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT npm run gen:xiaoyao -w @vltk/client
  ```
- **Các file sinh tự động (không sửa tay):**
  - `packages/shared/src/skills/factions/xiaoyao/skills.gen.ts` — 29 kỹ năng (giữ `skill_skillexp_v` để skill 90/150 đạt `levelCap = 20`).
  - `packages/shared/src/skills/factions/xiaoyao/missiles.gen.ts` — 13 missile (kèm `M275` buff carrier, override 16 hướng `M645`, `CollidRange` và `ColVanish` cho `M641`/`M645`/`M647`).
  - `packages/shared/src/items/xiaoyao-items.gen.ts` — 10 cấp Cổ Cầm (`range-3-1..10`) kèm 5 icon đàn `items/obj-lyre01..05.webp` và icon kiếm `items/obj-sword56.webp`.
  - `apps/client/src/game/fx/xiaoyao-fx.gen.ts` — 25 hiệu ứng kỹ năng (gồm state FX `253`/`254` cho `2128`/`2139`).
  - `apps/client/src/art/jx/xiaoyao.gen.ts` — 1.329 sheet nhân vật (`GuqinW*`, ngoại trang `161..164`, vũ khí `247..254`, 18 bóng `MA/FM_YY_999_*`).
  - `apps/client/src/game/audio/xiaoyao-sounds.gen.ts` — 8 file âm thanh `public/assets/sound/xiaoyao/sf_xy_*.mp3`.

---

## 3. Cơ chế kỹ năng & chiến đấu đặc thù

### 3.1. Tài nguyên `[Âm Luật]` (`specialPoint`)
- **Di Cung Hoán Vũ (`2116`, cấp 20, Hỗ trợ - bị động):**
  - Tự động kích hoạt `autocastskill` định kỳ để tích lũy `[Âm Luật]` (`special_point_base` / `special_point_add`), tối đa **10 tầng**, đồng thời giảm thời gian làm chậm (`freezetimereduce_p`).
  - Các chiêu Cổ Cầm tiêu hao `[Âm Luật]` khai báo qua `cost_sp` (vd. *Lạc Nhạn Bình Sa `2138`* cần **8 tầng `[Âm Luật]`**).
- **Hiển thị HUD (dùng chung Web / Desktop / Mobile):**
  - Toàn bộ kỹ năng bị động đang có hiệu lực hiển thị ở góc trên bên trái (`apps/client/src/ui/hud/status.ts`).
  - Riêng icon **Di Cung Hoán Vũ (`2116`)** hiển thị badge số tầng `[Âm Luật]` hiện tại; thanh sinh/nội lực (`vitals.ts`) cũng đồng bộ `Âm Luật X/Y`.

### 3.2. Các cơ chế engine mở rộng
- **Blink kèm chiêu con (`Form = 13`):** *Bắc Minh Thần Công / Khinh công Tiêu Dao (`2118 → 2119`)* dịch chuyển tức thời tới mục tiêu/vị trí và kích hoạt chiêu con tại điểm đến.
- **Kiếm Quyết Phù Vân (`2124`, cấp 90 Kiếm):** đạn carrier `M641` (`collide = 0`) sinh dải kiếm thẳng hàng từ nhân vật tới mục tiêu (`2125` `M639` ×3 + `2126` `M640` ×1) theo tọa độ `(m.x, m.y)` và góc bay `m.angle`.
- **Mai Hoa Tam Lộng (`2142 → 2143`, cấp 150 Cầm):** `M647` có `autoExplode && colVanish = true` va chạm trực tiếp trên đường bay để nổ *Dương Quan Tam Điệp (`2143`, `M648`)* ngay trên mục tiêu, phát `fx.collide` lên từng mục tiêu trúng đòn trong `area(m)`.
- **Trấn phái — Thiên Lý Độc Hành (`2123`):** nâng trần cấp tối đa lên **30** trong `packages/shared/src/skills/common/skill-overrides.ts` (`suggest.ts` giữ `shared: [2123]`).
- **Thuộc tính mới trong `SkillEngine.ts` & `damage.ts` / `combat.ts`:** `lightingdamage_p`, `addlightingmagic_p`, `add_damage_p`, `me2waterdamage_p`, `water2medamage_p`, `missle_hitcount`, Hộ Thuẫn Nội Lực tĩnh (`staticmagicshield_p` cho `2139`/`2134` — quy đổi theo `STATIC_SHIELD.scale = 0.15` → cấp 20 còn `150%` = 1,5× MaxMP, kẹp trần `100%` MaxHP, không bơm đầy lại mỗi 1s khi cùng skill còn hiệu lực, độc sát DoT `hit.dot` bỏ qua khiên và trừ thẳng HP), bất tử / không thể chọn / định thân / cấm công (`invincibility`, `hidebodyunlock`, `frozen_action`, `forbit_attack` cho `2130`).
- **Ghi chú kỹ năng cấp 180 (`2132` *Mai Danh Ẩn Tính* → `2133` *Phất Y* → `2134` *Phất Y_Thuẫn*):** đã xác minh theo `volam-3005/Server/script/header/factionhead.lua:532` thuộc nhóm bậc 180 / Thất truyền; hiện game chỉ hỗ trợ đến kỹ năng cấp 150 nên `2132` được đặt `inactive: true, reqLevel: 180` ở cột `180`. **Lưu ý khi mở lại cấp 180 sau này:** `2133` tự gọi `2134` mỗi `18 frame` (`1.000 ms`) trong khi `2134` gốc chỉ tồn tại `17 frame` (`944 ms`, tạo khoảng trống `56 ms` làm `wasActive === false` và bơm đầy lại khiên mỗi giây), nên bắt buộc phải nâng thời gian `2134` lên `≥ 20 frame` (`1.111 ms`) khi kích hoạt lại.
- **Mô tả tiếng Việt:** đầy đủ 6 lưu phái (`1301..1306`) và các thuộc tính Tiêu Dao trong `packages/shared/src/skills/core/describe.ts`.

---

## 4. Trang bị Hoàng Kim môn phái & Chế tạo đồ xanh

### 4.1. Bộ Hoàng Kim môn phái (`packages/shared/src/items/gold-extra.ts`)
`volam-3005/Server/Settings/Item/GoldEquip.txt` gốc dừng ở Hoa Sơn (`req=39,10`), nên 4 bộ Hoàng Kim môn phái Tiêu Dao (`requiremenpai: 12`, cấp 120) được định nghĩa trong `gold-extra.ts` và tách riêng theo giới tính:

| Suite | Tên bộ | Nhánh | Giới tính | Ngoại trang (`look`) | Icon đặc trưng |
|---:|---|---|---|---|---|
| `29` | Tiêu Dao Cầm Chi | Nội công (Cổ Cầm) | Nam (`sex: 'm'`) | Áo/Nón `161`, Đàn `254` | `obj-lyre05`, `obj-ma-cloth03-3`, `obj-ma-cap05-2` |
| `30` | Tiêu Dao Kiếm Chi | Ngoại công (Kiếm) | Nam (`sex: 'm'`) | Áo/Nón `162`, Kiếm `250` | `obj-sword56`, `obj-ma-cloth03-3`, `obj-ma-cap05-2` |
| `31` | Tiêu Dao Cầm Chi | Nội công (Cổ Cầm) | Nữ (`sex: 'f'`) | Áo/Trâm `161`, Đàn `254` | `obj-lyre05`, `obj-fm-cloth14-1`, `obj-fm-cap03-2` |
| `32` | Tiêu Dao Kiếm Chi | Ngoại công (Kiếm) | Nữ (`sex: 'f'`) | Áo/Trâm `162`, Kiếm `250` | `obj-sword56`, `obj-fm-cloth03-2`, `obj-fm-cap03-2` |

- `factionSuites(faction, gender)` (`packages/shared/src/items/token.ts`) lọc theo giới tính của nhân vật: nhân vật Nữ chỉ thấy và nhận `suite 31/32`, nhân vật Nam chỉ thấy và nhận `suite 29/30` trong **Lệnh bài → Nhận bộ hoàng kim môn phái**.
- Khi mặc Áo/Nón Hoàng Kim Tiêu Dao (`look: 161/162`), ngoại trang nhân vật giữ đồng nhất cả khi lên ngựa lẫn xuống ngựa.

### 4.2. Chế tạo đồ xanh & Lệnh bài
- **Chế tạo đồ xanh (`forge.ts` / `magic.ts`):** hỗ trợ chế tạo **Cổ Cầm (Đàn)**; có nút **Gợi ý** tự chọn 6 dòng tối ưu (`suggestForgeLines`) và nút **Nhận toàn bộ trang bị ngũ hành còn lại** gửi nguyên tử 9 món trong **1 gói `C2S.forge`** (an toàn dưới giới hạn `30 msg/s`).
- **Lệnh bài (`token.ts`):** tùy chọn học kỹ năng 90/120/150 tự thăng cấp 150 trước rồi học đủ kỹ năng ở cấp tối đa.

---

## 5. Kiểm thử

Chạy bộ kiểm thử riêng của Tiêu Dao:
```bash
node --import tsx --test tests/xiaoyao.test.ts
```
Bao gồm kiểm chứng: đăng ký phái & 29 kỹ năng/13 missile, tích lũy `[Âm Luật]` & `cost_sp`, sát thương nội công `%` & `add_damage_p`, 5 icon đàn & chế tạo Cổ Cầm, dải kiếm *Kiếm Quyết Phù Vân (`2124`)*, `suggestForgeLines` cho đủ 10 ô, mô tả tiếng Việt + 8 SFX mp3 + va chạm *Mai Hoa Tam Lộng (`2142 → 2143`)*, và 4 bộ Hoàng Kim Nam/Nữ (`29..32`) + `obj-sword56.webp`.
