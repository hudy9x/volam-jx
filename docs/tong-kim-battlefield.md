# Chiến trường Tống Kim (Chế độ PK & Vật phẩm Quân Nhu)

> **Trạng thái:** Đã chốt thiết kế ban đầu (2026-11-14) — **Chỉ áp dụng chế độ PK (Chiến trường chung PvP)** trước. Chưa viết code gameplay.
> Khi bắt đầu triển khai ở phiên mới, đọc tài liệu này + đối chiếu các file tham khảo bên dưới.

---

## 1. Đường dẫn tham khảo cụ thể

### 1.1. Nguồn tham khảo cơ chế & vật phẩm (`/Users/hudy/ws/volamidle.pages.dev/src`)
- **Tài liệu tổng quan Tống Kim (`volamidle`):** `/Users/hudy/ws/volamidle.pages.dev/src/client/simulator/BATTLEFIELD.md` (đặc biệt mục *"Chiến trường chung qua PvP online"* dòng 79–113).
- **Logic phòng Tống Kim phía server (vòng đời trận, điểm, quân hàm, lính NPC, Nguyên soái, rơi đồ, hồi sinh):** `/Users/hudy/ws/volamidle.pages.dev/src/server/multiplayer/domain/battlefield.rs`
- **Logic vật phẩm Quân Nhu phía server (26 vật phẩm, phạm vi ảnh hưởng phe ta / phe địch, bẫy, tính lại chỉ số idempotent):** `/Users/hudy/ws/volamidle.pages.dev/src/server/multiplayer/domain/war_items.rs`
- **Ràng buộc mua / dùng vật phẩm Quân Nhu:** `/Users/hudy/ws/volamidle.pages.dev/src/server/multiplayer/definitions/war-items.cjs`
- **Danh mục 26 vật phẩm Quân Nhu, bậc quân hàm, hiệu ứng client:** `/Users/hudy/ws/volamidle.pages.dev/src/client/simulator/war-rewards.ts`
- **Cộng sát thương ngoại / nội từ Hoàn Tống Kim:** `/Users/hudy/ws/volamidle.pages.dev/src/client/simulator/war-offense.ts`
- **Bảng giá điểm tích lũy & cửa hàng Quan Quân Nhu:** `/Users/hudy/ws/volamidle.pages.dev/src/client/gameplay/quartermaster/model.ts`
- **Tỉ lệ rơi vật phẩm Quân Nhu theo cấp NPC:** `/Users/hudy/ws/volamidle.pages.dev/src/shared/war-drop-rates.json` và `/Users/hudy/ws/volamidle.pages.dev/src/client/simulator/war-drop-settings.ts`
- **Luật quan hệ phe (`hostile`, `can_hit`) & sát thương PvP trong Tống Kim:** `/Users/hudy/ws/volamidle.pages.dev/src/server/multiplayer/domain/pvp.rs`
- **Hào quang / bùa hỗ trợ lan sang đồng minh cùng phe Tống/Kim (bán kính `410`):** `/Users/hudy/ws/volamidle.pages.dev/src/server/multiplayer/domain/support.rs`

### 1.2. Nguồn dữ liệu gốc VLTK 1 (`JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`)
- **Danh sách bản đồ:** `settings/maplist.ini` (đọc qua [apps/client/tools/gen-maps.ts](file:///Users/hudy/ws/jx-system-online/apps/client/tools/gen-maps.ts)).
- **Cấu hình bản đồ Tống Kim gốc:** `settings/battles/maps/{plain,river,town,valley,forest,barrack,narrow,woods,bridge,...}/mapinfo.txt`.
- **Vật phẩm & Icon SPR gốc của Quân Nhu Tống Kim:** `settings/item/004/magicscript.txt` (các dòng `156–196`, `215–236`, `1470–1471`, `3416`):
  - Trống trận: `\spr\item\songjin\wardrum.spr`
  - Lệnh bài / Bẫy: `\spr\item\songjin\token.spr`
  - Hiệu giác / Kèn: `\spr\item\songjin\clarion.spr`
  - Cờ hiệu: `\spr\item\songjin\warflag.spr`
  - Chiêu thư: `\spr\item\songjin\rescript.spr`
  - Các loại Hoàn Tống Kim: `\spr\item\medecine\obj-potion15.spr`
  - Càn Khôn Tạo Hóa Đan: `\spr\item\medecine\obj-potion13.spr`

### 1.3. Chỗ tích hợp trong `jx-system-online`
- **Shared (`packages/shared/src/`):**
  - `maps/`: thêm 3 bản đồ chiến trường vào catalog sau khi chạy `gen:maps`.
  - `items/`: định nghĩa 26 vật phẩm Quân Nhu (`war-items.ts`), xếp chồng `50/ô` trong lưới hành trang `6×10` ([bag.ts](file:///Users/hudy/ws/jx-system-online/packages/shared/src/items/bag.ts)).
  - `formulas/`: tích hợp thưởng Quân hàm (`+0/5/10/15/20%`) và hiệu ứng của 26 vật phẩm Quân Nhu vào túi thuộc tính / công thức sát thương ([formulas/damage.ts](file:///Users/hudy/ws/jx-system-online/packages/shared/src/formulas/damage.ts), [formulas/stats.ts](file:///Users/hudy/ws/jx-system-online/packages/shared/src/formulas/stats.ts), [formulas/speed.ts](file:///Users/hudy/ws/jx-system-online/packages/shared/src/formulas/speed.ts)).
  - `protocol.ts`: thông điệp `C2S` / `S2C` cho báo danh, trạng thái trận, bảng xếp hạng, thông báo hạ gục / Nguyên soái.
- **Server (`apps/server/src/world/`):**
  - `World.ts` & `systems/combat.ts`: kiểm tra `hostile(a, b)` ưu tiên phe Tống/Kim khi ở trong bản đồ chiến trường; không áp dụng phạt chết thường; ghi nhận điểm quân trạng & rơi đồ Quân Nhu.
  - Module mới `world/battlefield.ts`: quản lý vòng đời trận, điểm 2 phe, hồi sinh tăng dần, sinh lính NPC tuần tra & Nguyên soái, bẫy Tống Kim.
- **Client (`apps/client/src/ui/`):**
  - Cửa sổ NPC **Chiêu Mộ Sứ** & **Quan Quân Nhu** (dùng `ui/kit/dialog.ts`), HUD đồng hồ + điểm 2 phe, cửa sổ **Bảng xếp hạng Tống Kim** (phím `` ` `` trên Desktop + nút chạm trên HUD cho Mobile), hộp kết quả cuối trận.

---

## 2. Phạm vi triển khai: Chế độ PK (Chiến trường chung PvP)

> **Quyết định của USER (2026-11-14):** Chỉ làm **chế độ PK (Chiến trường chung)** trước (không làm phòng sandbox/simulator cá nhân).

### 2.1. Ba bản đồ đại diện (Sơ / Trung / Cao cấp)
| Phân tầng | Cấp nhân vật | ID bản đồ | Tên bản đồ | Đường dẫn `.wor` gốc | Kích thước |
|---|---|---|---|---|---|
| **Sơ cấp** | 40 – 79 | **326** | Khu vực Bình nguyên | `\maps\特殊用地\平原战场` | 34 × 27 region |
| **Trung cấp** | 80 – 119 | **384** | Cầu ranh giới (Giới Kiều) | `\maps\特殊用地\界桥战场` | 17 × 32 region |
| **Cao cấp** | 120 – 200 | **44** | Chiến trường Tống Kim (cổ điển) | `\maps\中原北区\宋金战场` | 55 × 47 region |

*(Nếu cần phòng chờ riêng có thể sinh thêm ID **323** — Điểm báo danh Tống Kim `8 × 7 region`, hoặc truyền thẳng vào Hậu doanh của từng bản đồ).*

### 2.2. Báo danh, Vòng đời trận & Hồi sinh
1. **Báo danh tại NPC Chiêu Mộ Sứ** (đặt ở Biện Kinh `37` và Phượng Tường `1`):
   - Chọn bậc chiến trường đúng cấp (Sơ / Trung / Cao) và chọn **Phe Tống** hoặc **Phe Kim**.
   - Lưu lại trạng thái trước khi vào (`returnTo: { map, x, y, hp, mp }`) để trả nhân vật về đúng vị trí cũ khi rời trận hoặc hết trận.
   - Trong cùng một trận (`matchId`): nhân vật thoát ra vào lại hoặc kết nối lại vẫn **giữ nguyên phe (`team`), điểm quân trạng (`points`), số mạng hạ gục (`kills`, `playerKills`) và số lần chết (`deaths`)**; không được đổi phe trong cùng trận.
2. **Thời gian trận đấu**:
   - Đếm ngược chuẩn bị đầu trận: **5 giây** (`5 → 4 → 3 → 2 → 1`), sau đó mở giao chiến và sinh lính NPC hai phe.
   - Thời lượng trận mặc định: **20 phút** (`1200 giây`).
   - Ở **mốc 50% thời gian trận (phút thứ 10)**: xuất hiện **Nguyên Soái** tại doanh trại mỗi phe, hiện thông báo lớn giữa màn hình trong 6 giây: *"Nguyên soái hai phe Tống và Kim xuất hiện"*.
   - **Kết thúc trận**: Khi hết 20 phút, server khóa giao chiến, so sánh tổng điểm quân trạng hai phe (cao hơn thắng, bằng nhau hòa), hiện **Hộp kết quả trận đấu**. Sau 60 giây (hoặc khi bấm Đồng ý / Rời trận), đưa người chơi về vị trí cũ trước khi báo danh.
3. **Hồi sinh trong trận**:
   - Chết trong Tống Kim **không mất exp, không mất tiền, không rớt đồ, không tăng PK ngoài đời**.
   - Khi chết được đưa về Hậu doanh phe mình và chờ hồi sinh theo số lần chết trong trận:
     - Công thức `volamidle` (`battlefield.rs` dòng 19–22): lần chết thứ $d \ge 1$ có thời gian chờ:
       $$\text{delay}(d) = [5, 7, 10, 13]_{(d-1) \bmod 4} + 10 \times \lfloor (d-1)/4 \rfloor \text{ (giây)}$$
       (tức là: `5s, 7s, 10s, 13s, 15s, 17s, 20s, 23s...`).
   - Trong thời gian chờ hồi sinh (`ready = false` / `respawnAt > clock`), nhân vật không thể ra đòn và không nhận sát thương.

---

## 3. Quan hệ Phe (Phe Ta vs Phe Địch) & Luật PK

> Tham khảo: `pvp.rs` (dòng 46–81, 256–277), `support.rs` (dòng 260–280), `war_items.rs` (dòng 66–86).

Trong bản đồ Chiến trường Tống Kim, **phe chiến trường (`team`: `0 = Tống`, `1 = Kim`) quyết định hoàn toàn quan hệ đồng minh / kẻ địch**, ghi đè lên mọi quy tắc PK / Tổ đội / Chính-Tà bên ngoài:

| Cơ chế | Ảnh hưởng đến **Phe Ta** (`team == myTeam`) | Ảnh hưởng đến **Phe Địch** (`team != myTeam`) |
|---|---|---|
| **Màu tên hiển thị** | Phe Tống: Vàng (`#ffb347`) · Phe Kim: Tím (`#c77bff`) · Lính NPC: Trắng kèm tiền tố `Tống` / `Kim` | Như cột trái; **thanh máu trên đầu**: Xanh lá (`#4fd04f`) cho Phe Ta, Đỏ cam (`#ff6038`) cho Phe Địch |
| **Đòn tấn công đơn & diện rộng (AoE)** | **Không gây sát thương** (`hostile = false`), kể cả khi người chơi bật Đồ Sát hoặc khác tổ đội | **Nhận sát thương** nếu cả hai đã hết thời gian chờ xuất trận (`ready == true`) và còn sống |
| **Độc sát / Bùa hại (Curse / Debuff)** | Không trúng bùa hại của đồng minh; nếu có độc tồn dư từ cùng phe sẽ tự xóa ngay | Nhận đầy đủ độc sát, làm chậm, choáng, bùa hại; độc ghi nhận `lastSource` để tính điểm hạ gục |
| **Hào quang & Kỹ năng hỗ trợ đồng đội** | Người chơi & Bot **cùng phe trong bán kính `410`** nhận hiệu ứng hào quang / bùa lợi đồng đội (lấy cấp cao nhất của cùng kỹ năng, không cộng dồn trùng, không phát tiếp lần 2) | **Không nhận** bất kỳ hào quang hay bùa lợi nào từ phe đối phương |
| **Vật phẩm diện rộng Phe Ta (`Chiến Cổ`, `Lệnh Bài`)** | Bản thân người dùng + **mọi người chơi / SIM cùng phe còn sống trong bán kính `410`** nhận buff 180 giây | Không có tác dụng lên phe địch (và không tác dụng lên lính NPC / Nguyên Soái) |
| **Vật phẩm diện rộng Phe Địch (`Kháng Đơn Chi Giác`)** | Không ảnh hưởng phe ta | **Mọi người chơi / SIM phe địch còn sống trong bán kính `410`** bị gắn hiệu ứng giảm 20% phản đòn trong 180 giây |
| **Bẫy Tống Kim (`Bẫy băng`, `Bẫy choáng`, `Bẫy làm chậm`)** | Người cùng phe đi qua bẫy **không kích hoạt** và không chịu hiệu ứng | Kẻ địch (`team != trap.team`) đi vào **bán kính `90`** kích hoạt bẫy: mọi kẻ địch trong bán kính `90` tại khoảnh khắc đó chịu hiệu ứng, sau đó bẫy biến mất |

---

## 4. Điểm Quân trạng, Quân hàm & Tăng chỉ số theo Quân hàm

> Tham khảo: `battlefield.rs` (dòng 60–66, 330–369) và `war-rewards.ts` (dòng 5–11, 80–105, 163–173).

### 4.1. Điểm Quân trạng khi hạ mục tiêu
Người chơi (hoặc SIM) gây sát thương hợp lệ cuối cùng lên mục tiêu trong vòng **15 giây** trước khi mục tiêu chết sẽ nhận điểm Quân trạng (đồng thời cộng vào tổng điểm của Phe):

- **Hạ Lính NPC địch** (`50 × bậc lính`):
  - Binh sĩ: **+50 điểm**
  - Hiệu úy: **+100 điểm**
  - Thống lĩnh: **+150 điểm**
  - Phó tướng: **+200 điểm**
  - Đại tướng: **+250 điểm**
- **Hạ Người chơi / SIM địch** (`150 × bậc quân hàm hiện tại của nạn nhân`):
  - Hạ Binh sĩ: **+150 điểm**
  - Hạ Hiệu úy: **+300 điểm**
  - Hạ Thống lĩnh: **+450 điểm**
  - Hạ Phó tướng: **+600 điểm**
  - Hạ Đại tướng: **+750 điểm**
- **Hạ Nguyên Soái địch**: **+1.000 điểm**

### 4.2. Năm bậc Quân hàm & Khả năng tăng hiệu ứng cho nhân vật
Khi điểm Quân trạng trong trận đạt mốc, nhân vật **tự động thăng Quân hàm ngay lập tức** (giữ qua các lần hồi sinh cho tới hết trận):

| Bậc | Quân hàm | Điểm Quân trạng yêu cầu | Màu danh hiệu | Thưởng chỉ số trực tiếp lên nhân vật (`bonus`) |
|---|---|---|---|---|
| 1 | **Binh sĩ** | `0 – 2.999` | Ngà | **+0%** |
| 2 | **Hiệu úy** | `3.000 – 8.999` | Xanh dương | **+5%** sát thương vật lý ngoại/nội, tốc đánh/thi triển, kháng dương |
| 3 | **Thống lĩnh** | `9.000 – 17.999` | Xanh lá nhạt | **+10%** sát thương vật lý ngoại/nội, tốc đánh/thi triển, kháng dương |
| 4 | **Phó tướng** | `18.000 – 29.999` | Tím nhạt / Hồng | **+15%** sát thương vật lý ngoại/nội, tốc đánh/thi triển, kháng dương |
| 5 | **Đại tướng** | `Từ 30.000 trở lên` | Cam vàng / Đỏ san hô | **+20%** sát thương vật lý ngoại/nội, tốc đánh/thi triển, kháng dương |

**Cách áp dụng thưởng Quân hàm vào chỉ số nhân vật (`multiplier = 1 + bonus`):**
- Chỉ lấy bậc Quân hàm hiện tại, **không cộng dồn** các bậc dưới.
- **Sát thương vật lý ngoại công & nội công**: nhân hệ số `multiplier` (`1.05` → `1.20`).
- **Tốc độ đánh & tốc độ xuất chiêu**: nhân hệ số `multiplier` (vẫn tôn trọng trần khung hình tốc độ đánh của engine).
- **5 loại kháng (Phổ, Độc, Băng, Hỏa, Lôi)**: chỉ nhân `multiplier` nếu kháng đó **đang dương (`> 0`)** (ví dụ kháng `50%` ở bậc Đại tướng `+20%` thành `60%`); nếu kháng $\le 0$ thì giữ nguyên để không làm phạt nặng hơn khi kháng âm.
- *Lưu ý:* Lính NPC và Nguyên Soái không nhận thưởng chỉ số từ Quân hàm.

---

## 5. Hệ thống 26 Vật phẩm Tống Kim (Quân Nhu) & Cơ chế tác động

> Tham khảo: `war_items.rs` (dòng 16–97), `war-rewards.ts` (dòng 15–45, 142–188), `war-offense.ts`, `quartermaster/model.ts`.

### 5.1. Quy tắc chung của vật phẩm Quân Nhu
- **Nguồn nhận**:
  1. **Rơi từ NPC chiến trường** khi bị tiêu diệt (`war-drop-rates.json`): Binh sĩ `0,5%`, Hiệu úy `3%`, Thống lĩnh `5%`, Phó tướng `8%`, Đại tướng `12%`, Nguyên soái `20%`. Rơi ngẫu nhiên 1 trong 26 loại; tồn tại trên đất `120 giây`, **20 giây đầu** chỉ người đánh chết được nhặt, sau 20 giây mọi người chơi (kể cả phe địch) đều nhặt được.
  2. **Mua tại NPC Quan Quân Nhu** ở Hậu doanh phe mình (trong bán kính `180`) bằng **Điểm quân trạng tích lũy (`tk_merit`)**.
- **Lưu trữ & Xếp chồng**: Lưu bền vững trong hành trang của nhân vật qua các trận, xếp chồng tối đa **50 cái / ô**.
- **Điều kiện sử dụng**: Chỉ dùng được khi đang sống (`hp > 0`, `ready == true`) bên trong bản đồ Chiến trường Tống Kim đang diễn ra.
- **Thời gian hiệu lực & Cộng dồn**:
  - Tất cả các loại Hoàn, Chiến Cổ, Lệnh Bài, Kháng Đơn Chi Giác có hiệu lực **180 giây (3 phút)**.
  - Dùng lại cùng một loại sẽ **làm mới thời gian về 180 giây**, **không cộng dồn chồng lên nhau** (idempotent khi tính lại chỉ số).
  - Các loại tăng **tốc độ đánh** (`Thần Lực Hoàn +25%`, `Phi Tốc Hoàn +50%`, `Lệnh Bài +50%`) không cộng dồn với nhau mà **lấy mức cao nhất đang có** (`max(25%, 50%)`).
  - Các loại tăng **tốc độ chạy** (`Gia Bào Hoàn +20%`, `Thần Hành Hoàn +25%`, `Lệnh Bài +30%`) không cộng dồn với nhau mà **lấy mức cao nhất đang có** (`max(20%, 25%, 30%)`).
  - Khi trận đấu kết thúc hoặc rời chiến trường, mọi hiệu ứng tạm thời và bẫy đang đặt bị xóa sạch.

### 5.2. Bảng chi tiết 26 vật phẩm, giá mua, hiệu ứng chỉ số & phạm vi Phe Ta / Phe Địch

#### A. Nhóm hiệu lệnh diện rộng (3 vật phẩm — Bán kính `410`, thời hạn `180 giây`)
| Mã (`WarItem`) | Tên vật phẩm | Icon SPR gốc (`magicscript.txt`) | Giá Quân trạng | Mục tiêu & Phạm vi | Tác động chi tiết lên chỉ số |
|---|---|---|---|---|---|
| `drum` | **Chiến Cổ** | `\spr\item\songjin\wardrum.spr` (dòng 157) | **500** | **Phe Ta** (bản thân + người chơi/SIM đồng minh trong bán kính `410`) | **+30% Sinh lực tối đa** (`hpMax *= 1.3`) và **+30 điểm tất cả kháng** (Phổ, Độc, Băng, Hỏa, Lôi `+30`) |
| `command` | **Lệnh Bài** | `\spr\item\songjin\token.spr` (dòng 158) | **400** | **Phe Ta** (bản thân + người chơi/SIM đồng minh trong bán kính `410`) | **+30% tốc độ di chuyển** và **+50% tốc độ đánh / xuất chiêu** (lấy `max` với Hoàn tốc độ cá nhân) |
| `horn` | **Kháng Đơn Chi Giác** | `\spr\item\songjin\clarion.spr` (dòng 215) | **500** | **Phe Địch** (mọi người chơi/SIM phe địch trong bán kính `410`) | **Giảm 20% chỉ số phản đòn** của kẻ địch trúng hiệu ứng (`reflect *= 0.8`, `meleedamagereturn_p *= 0.8`, `rangedamagereturn_p *= 0.8`) |

#### B. Nhóm Bẫy chiến trường (3 vật phẩm — Đặt tại chỗ, tồn tại `30 giây`, bán kính nổ `90`)
| Mã (`WarItem`) | Tên vật phẩm | Icon SPR gốc (`magicscript.txt`) | Giá Quân trạng | Mục tiêu kích hoạt | Tác động chi tiết lên **Phe Địch** |
|---|---|---|---|---|---|
| `freezeTrap` | **Bẫy băng** | `\spr\item\songjin\token.spr` (dòng 1471) | **200** | **Phe Địch** bước vào bán kính `90` (Phe Ta đi qua không nổ) | Gây **Choáng 3 giây** + **Đóng băng / Làm chậm 75% trong 3 giây** cho mọi kẻ địch trong bán kính `90`; bẫy tự hủy sau khi nổ |
| `stunTrap` | **Bẫy choáng** | `\spr\item\songjin\token.spr` (dòng 1470) | **200** | **Phe Địch** bước vào bán kính `90` | Gây **Choáng 3 giây** (`stun = max(stun, 3s)`) cho mọi kẻ địch trong bán kính `90`; bẫy tự hủy sau khi nổ |
| `slowTrap` | **Bẫy làm chậm** | `\spr\item\songjin\token.spr` (dòng 3416) | **150** | **Phe Địch** bước vào bán kính `90` | Gây **Làm chậm 50% tốc độ di chuyển trong 5 giây** (`cold = max(cold, 5s)`) cho mọi kẻ địch trong bán kính `90`; bẫy tự hủy sau khi nổ |

#### C. Nhóm Hoàn tăng Công kích (7 vật phẩm — Cá nhân người dùng, thời hạn `180 giây`)
| Mã (`WarItem`) | Tên vật phẩm | Icon SPR gốc | Giá | Điều kiện kỹ năng | Tác động chi tiết lên sát thương nhân vật |
|---|---|---|---|---|---|
| `external` | **Ngoại Phổ Hoàn** | `obj-potion15.spr` (dòng 179) | **200** | Kỹ năng **Ngoại công** (`phys == true`) | **+50% sát thương vật lý ngoại công** (`physDamage *= 1.5`) |
| `externalCold` | **Ngoại Băng Hoàn** | `obj-potion15.spr` (dòng 181) | **200** | Kỹ năng **Ngoại công** (`phys == true`) | **+100 điểm băng sát ngoại công** (kèm thời gian làm chậm tối thiểu `1,5s`) |
| `internal` | **Nội Phổ Hoàn** | `obj-potion15.spr` (dòng 182) | **200** | Kỹ năng **Nội công** (`phys == false`) | **+100 điểm sát thương vật lý nội công** |
| `internalPoison` | **Nội Độc Hoàn** | `obj-potion15.spr` (dòng 183) | **200** | Kỹ năng **Nội công** (`phys == false`) | **+50 điểm độc sát nội công** (thời gian độc tối thiểu `3,0s`) |
| `internalCold` | **Nội Băng Hoàn** | `obj-potion15.spr` (dòng 184) | **200** | Kỹ năng **Nội công** (`phys == false`) | **+100 điểm băng sát nội công** (thời gian làm chậm tối thiểu `1,5s`) |
| `internalFire` | **Nội Hỏa Hoàn** | `obj-potion15.spr` (dòng 185) | **200** | Kỹ năng **Nội công** (`phys == false`) | **+100 điểm hỏa sát nội công** |
| `internalLight` | **Nội Lôi Hoàn** | `obj-potion15.spr` (dòng 186) | **200** | Kỹ năng **Nội công** (`phys == false`) | **+100 điểm lôi sát nội công** |

#### D. Nhóm Hoàn tăng Phòng thủ, Tốc độ & Sinh tồn (13 vật phẩm — Cá nhân người dùng, thời hạn `180 giây`)
| Mã (`WarItem`) | Tên vật phẩm | Icon SPR gốc | Giá | Tác động chi tiết lên chỉ số nhân vật |
|---|---|---|---|---|
| `resistance` | **Hộ Thể Hoàn** | `obj-potion15.spr` | **150** | **+20 điểm kháng tất cả** (Phổ, Độc, Băng, Hỏa, Lôi `+20`; cộng dồn được với Chiến Cổ và Phòng Hoàn đơn hệ, vẫn chịu trần kháng tối đa của nhân vật) |
| `physicalRes` | **Phổ Phòng Hoàn** | `obj-potion15.spr` (dòng 192) | **150** | **+50 điểm kháng vật lý (Phổ phòng)** |
| `poisonRes` | **Độc Phòng Hoàn** | `obj-potion15.spr` (dòng 196) | **150** | **+50 điểm kháng độc (Độc phòng)** |
| `coldRes` | **Băng Phòng Hoàn** | `obj-potion15.spr` (dòng 193) | **150** | **+50 điểm kháng băng (Băng phòng)** |
| `fireRes` | **Hỏa Phòng Hoàn** | `obj-potion15.spr` (dòng 195) | **150** | **+50 điểm kháng hỏa (Hỏa phòng)** |
| `lightRes` | **Lôi Phòng Hoàn** | `obj-potion15.spr` (dòng 194) | **150** | **+50 điểm kháng lôi (Lôi phòng)** |
| `life` | **Trường Mệnh Hoàn** | `obj-potion15.spr` (dòng 187) | **150** | **+500 điểm Sinh lực tối đa** (cộng sau khi đã nhân `%` của Chiến Cổ) |
| `evasion` | **Cao Thiểm Hoàn** | `obj-potion15.spr` (dòng 189) | **150** | **+500 điểm Né tránh** (`defense += 500`) |
| `accuracy` | **Cao Trung Hoàn** | `obj-potion15.spr` (dòng 190) | **150** | **+500 điểm Chính xác** (`attackRating += 500`) |
| `attack` | **Thần Lực Hoàn** | `obj-potion15.spr` | **200** | **+25% tốc độ đánh / xuất chiêu** (không cộng dồn với `Phi Tốc Hoàn` hay `Lệnh Bài`, lấy mức cao nhất) |
| `haste` | **Phi Tốc Hoàn** | `obj-potion15.spr` (dòng 191) | **200** | **+50% tốc độ đánh / xuất chiêu** (chỉ tăng nhịp xuất đòn, không rút ngắn `cooldown` cố định của kỹ năng có thời gian hồi) |
| `sprint` | **Gia Bào Hoàn** | `obj-potion15.spr` (dòng 188) | **150** | **+20% tốc độ di chuyển** (lấy mức cao nhất với `Thần Hành Hoàn` / `Lệnh Bài`) |
| `movement` | **Thần Hành Hoàn** | `obj-potion15.spr` | **150** | **+25% tốc độ di chuyển** (lấy mức cao nhất với `Gia Bào Hoàn` / `Lệnh Bài`) |

---

## 6. Thứ tự bước làm gợi ý khi bắt đầu phiên triển khai

1. **Bước 1 — Bản đồ & Asset Quân Nhu**:
   - Sinh 3 bản đồ chiến trường `326` (Sơ), `384` (Trung), `44` (Cao) bằng `npm run gen:maps -w @vltk/client -- 326 384 44`.
   - Giải mã thêm 4 icon SPR gốc trong `\spr\item\songjin\` (`wardrum.spr`, `token.spr`, `clarion.spr`, `rescript.spr`) + `obj-potion15.spr` vào `public/assets/items/` và khai báo 26 vật phẩm Quân Nhu trong `packages/shared/src/items/`.
2. **Bước 2 — Công thức chỉ số & Sát thương Tống Kim (`packages/shared/src/formulas/`)**:
   - Thêm thưởng bậc Quân hàm (`0/5/10/15/20%`) và bộ hiệu ứng 26 vật phẩm Quân Nhu vào `formulas/stats.ts`, `formulas/damage.ts`, `formulas/speed.ts`.
3. **Bước 3 — Logic Chiến trường phía Server (`apps/server/src/world/battlefield.ts`)**:
   - Quản lý phòng Tống Kim Sơ / Trung / Cao (đếm ngược 5s, trận 20 phút, Hậu doanh 2 phe, hồi sinh tăng dần).
   - Luật `hostile` theo phe Tống/Kim, hào quang đồng minh bán kính `410`, hiệu lệnh diện rộng (`Chiến Cổ`, `Lệnh Bài`, `Kháng Đơn Chi Giác`) và 3 loại Bẫy (`90` px).
   - Sinh lính NPC 5 cấp + Nguyên Soái ở phút thứ 10 + rơi vật phẩm Quân Nhu + cộng điểm `tk_merit`.
4. **Bước 4 — Giao diện Client (`apps/client/src/ui/`) cho Web / Desktop / Mobile**:
   - Hội thoại NPC **Chiêu Mộ Sứ** (báo danh, chọn phe) và **Quan Quân Nhu** (mua 26 vật phẩm bằng điểm tích lũy).
   - HUD đồng hồ trận + điểm Tống/Kim + nút mở **Bảng xếp hạng** (hỗ trợ cả phím `` ` `` lẫn nút chạm Mobile) + Hộp kết quả cuối trận.

