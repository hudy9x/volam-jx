# Tốc độ (Đánh, Xuất chiêu, Di chuyển) — Công thức, Hiện trạng & Hướng xử lý

> Cập nhật rà soát: **2026-11-14** (đối chiếu trực tiếp `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT` và binary `game.exe`).
> Trạng thái hiện tại: **USER đã chọn bảng mốc volamidle; đã triển khai đánh + chạy, giới hạn25–300%, chuẩn hóa hoạt ảnh và cài đặt/thử tại `?skills` (§10). §1–9 là lịch sử điều tra/phương án trước quyết định này, không còn là đặc tả đang chạy.**

---

## 1. Tóm tắt công thức chuẩn

| Hạng mục | Công thức / Giá trị chuẩn | Nguồn |
|---|---|---|
| Nhịp engine gốc | `18 FPS` (`1 frame = 1000 / 18 ≈ 55,56 ms`) | **DATA** / **SRC** (`JX_FPS = 18`) |
| Khung gốc (`0%` tốc độ) | Ngoại công `AttackFrame = 18` (`1000 ms`) · Nội công `CastFrame = 18` (`1000 ms`) · Bị thương `HurtFrame = 12` (`667 ms`) · Chạy `RunFrame = 14` · Đi bộ `WalkFrame = 12` (nam/nữ); `RunSpeed = 10`, `WalkSpeed = 5` là tốc độ, không phải frame | **DATA** `settings/npc/player/basevalue.ini` & `game.exe` (`0x57ee99`–`0x57eec9`) |
| Tổng % tốc độ đánh ngoại công | `atkPct = attackspeed_v + attackspeed_yan_v` | **DATA** `settings/magicdesc.ini` (ID 47, 262) |
| Tổng % tốc độ đánh nội công | `castPct = castspeed_v + castspeed_yan_v` | **DATA** `settings/magicdesc.ini` (ID 48, 263) |
| Số khung thực tế mỗi đòn | `frames = max(6, floor(18 × 100 / (100 + pct)))` (khi `pct ≤ -100` thì kẹp mẫu số tối thiểu `10`) | **SRC** · **WEB** (`/Users/hudy/ws/volam-shxt/docs/breakpoints_speed_and_attack.md`) |
| Thời lượng 1 chu kỳ đòn đánh | `durationMs = (frames × 1000 / 18) ÷ slowFactor` (`slowFactor = 0,5` khi đang dính trạng thái làm chậm / băng sát) | **SRC** · **INFERRED** (chậm) |
| Tốc độ chạy | `moveFactor = ((100 + fastwalkrun_p) / 100) × slowFactor` (tốc độ ngựa chỉ cộng khi đang cưỡi; điểm hiển thị `speedPoints`) | **DATA** thuộc tính · **USER** (vòng 32) |

---

## 2. Dữ liệu chuẩn từ `Client_VLTK_SHXT` (Đã xác minh)

### 2.1. Hằng số khung gốc trong `basevalue.ini` và `game.exe`
- File: [`/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/npc/player/basevalue.ini`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/npc/player/basevalue.ini#L38-L43) (cả `[Male]` và `[Female]`):
  ```ini
  [Common]
  HurtFrame=12
  RunSpeed=10
  WalkSpeed=5
  AttackFrame=18
  CastFrame=18

  [Male]
  WalkFrame=12
  RunFrame=14
  StandFrame=25

  [Female]
  WalkFrame=12
  RunFrame=14
  StandFrame=45
  ```
- Trong binary [`/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/game.exe`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/game.exe) (đoạn `0x57ee99`–`0x57eec9`), hàm khởi tạo NPC đọc trực tiếp hai khóa `"AttackFrame"` và `"CastFrame"` với giá trị mặc định `18` (`0x12` = 18 frames).
- **Đính chính 2026-11-14:** bản rời và bản thắng ưu tiên PAK (`data_extract/update01/_unnamed/dat/918609f6.dat`, tra bằng `resolveFile`) có cùng cấu hình trên. Bản ghi trước đã nhầm `WalkSpeed=5` / `RunSpeed=10` thành số frame. Việc đọc cấu hình không chứng minh đầy đủ cách engine co giãn hoạt ảnh chạy.
- Ở nhịp 18 FPS (`55,56 ms/frame`), một nhân vật có **0% tốc độ đánh** mất đúng **18 frames = 1000 ms (1,00 đòn/giây)** cho một chu kỳ tấn công hoặc xuất chiêu.

### 2.2. Bảng mốc tốc độ đánh (Breakpoints)
- Tham chiếu: [`/Users/hudy/ws/volam-shxt/docs/breakpoints_speed_and_attack.md`](file:///Users/hudy/ws/volam-shxt/docs/breakpoints_speed_and_attack.md#L12-L42).
- Do engine làm tròn xuống số nguyên frame (`floor(1800 / (100 + S))`), tốc độ đánh tăng theo từng **mốc (breakpoint)**:

| Mốc `%` tốc độ đánh (`S`) | Phép tính `⌊1800 / (100 + S)⌋` | Số frame / đòn | Thời lượng 1 chu kỳ (`ms`) | Tần suất (`đòn/giây`) | Hệ số `scale = frames / 18` |
|---|---|---|---|---|---|
| `0%` | `⌊1800 / 100⌋` | **18 frames** | `1000,0 ms` | `1,00 đòn/s` | `1,000` |
| `6%` | `⌊1800 / 106⌋` | **16 frames** | `888,9 ms` | `1,13 đòn/s` | `0,889` |
| `13%` | `⌊1800 / 113⌋` | **15 frames** | `833,3 ms` | `1,20 đòn/s` | `0,833` |
| `21%` | `⌊1800 / 121⌋` | **14 frames** | `777,8 ms` | `1,29 đòn/s` | `0,778` |
| `29%` | `⌊1800 / 129⌋` | **13 frames** | `722,2 ms` | `1,38 đòn/s` | `0,722` |
| `39%` | `⌊1800 / 139⌋` | **12 frames** | `666,7 ms` | `1,50 đòn/s` | `0,667` |
| `51%` | `⌊1800 / 151⌋` | **11 frames** | `611,1 ms` | `1,64 đòn/s` | `0,611` |
| `64%` | `⌊1800 / 164⌋` | **10 frames** | `555,6 ms` | `1,80 đòn/s` | `0,556` |
| `81%` | `⌊1800 / 181⌋` | **9 frames** | `500,0 ms` | `2,00 đòn/s` | `0,500` |
| `101%` | `⌊1800 / 201⌋` | **8 frames** | `444,4 ms` | `2,25 đòn/s` | `0,444` |
| `126%` | `⌊1800 / 226⌋` | **7 frames** | `388,9 ms` | `2,57 đòn/s` | `0,389` |
| `158%` | `⌊1800 / 258⌋` | **6 frames** | `333,3 ms` | `3,00 đòn/s` | `0,333` |

### 2.3. Cấu hình frame hoạt ảnh thân nhân vật
- File: [`/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/npcres/男主角躯体信息.txt`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/npcres/%E7%94%B7%E4%B8%BB%E8%A7%92%E8%BA%AF%E4%BD%93%E4%BF%A1%E6%81%AF.txt) và [`女主角躯体信息.txt`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/npcres/%E5%A5%B3%E4%B8%BB%E8%A7%92%E8%BA%AF%E4%BD%93%E4%BF%A1%E6%81%AF.txt).
- Mỗi động tác tấn công (`attack1`, `attack2`, `magic`, `rideattack`) có từ `10` đến `18` frames mỗi hướng (tổng 80–144 frames / 8 hướng), cột `Interval = 1`.
- Trong client gốc, các frame của động tác vung vũ khí / xuất chiêu được phát trải đều trong đúng thời lượng `frames` của đòn đánh hiện tại (`durationMs = frames × 55,56 ms`), không chạy ở một FPS tách biệt.

### 2.4. Thuộc tính tốc độ đánh Âm (`_v`) và Dương (`_yan_v`)
- File: [`/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/magicdesc.ini`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/magicdesc.ini#L56-L57) và [dòng 246–247](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/settings/magicdesc.ini#L246-L247):
  - `attackspeed_v` (ID 47): `Tốc độ đánh - ngoại công: #d1+%`
  - `castspeed_v` (ID 48): `Tốc độ đánh - nội công: #d1+%`
  - `attackspeed_yan_v` (ID 262): `Tốc độ đánh - ngoại công: #d1+% (Dương)`
  - `castspeed_yan_v` (ID 263): `Tốc độ đánh - nội công: #d1+% (Dương)`
- Các kỹ năng / vật phẩm sử dụng `_yan_v` trong `Client_VLTK_SHXT/script/skill/`:
  - **Hoa Sơn — Kiếm Tông Tổng Quyết** (`id = 1349`, [`huashan.lua:103-104`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/script/skill/huashan.lua#L103-L104)): cộng đồng thời `attackspeed_v` (+6..32%) và `attackspeed_yan_v` (+6..32%).
  - **Thiên Nhẫn — Thiên Ma Giải Thể** (`id = 150`, [`tianren.lua:204-205`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/script/skill/tianren.lua#L204-L205)): cộng `attackspeed_v` và thêm `attackspeed_yan_v` (+60% từ cấp 39).
  - **Ngũ Độc — Ngũ Độc Kỳ Kinh** (`id = 75`, [`wudu.lua:214-216`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/script/skill/wudu.lua#L214-L216) bản rời): cộng `castspeed_v`, `castspeed_yan_v = 32`, `attackspeed_v = 32`.
  - **Côn Lôn — Túy Tiên Thác Cốt (`id = 204`) & Bắc Minh Đáo Hải (`id = 206`)** ([`kunlun.lua:101-119`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/script/skill/kunlun.lua#L101-L119)): trừ cả `castspeed_v` lẫn `castspeed_yan_v`.
  - **Thuốc lag / Quân Nhu Tống Kim / Võ Hồn Đường** ([`sjbattle_state.lua`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/script/skill/special/sjbattle_state.lua), [`token.lua`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/script/skill/special/token.lua), [`feisu-wan.lua`](file:///Users/hudy/ws/volam-shxt/Client_VLTK_SHXT/script/skill/special/feisu-wan.lua)): dùng `attackspeed_yan_v` và `castspeed_yan_v` để cộng dồn với trấn phái mà không bị ghi đè.

---

## 3. Hiện trạng mã nguồn `jx-system-online` & Nhận định nguyên nhân lỗi

Triệu chứng người dùng gặp: **"Giá trị tốc độ đánh trên bảng thuộc tính có thay đổi về mặt số liệu, nhưng tốc độ đánh thực tế luôn cố định và rất nhanh."**

Qua rà soát toàn bộ luồng từ `packages/shared` → `apps/server` → `apps/client`, có **4 nguyên nhân trực tiếp** gây ra hiện tượng này:

### Nguyên nhân 1 (Client): Hoạt ảnh tấn công bị khóa cứng ở 30 FPS, không phụ thuộc tốc độ đánh
- **Đường dẫn:** [`apps/client/src/game/actors/ActorView.ts`](file:///Users/hudy/ws/jx-system-online/apps/client/src/game/actors/ActorView.ts#L11-L12) và [dòng 111–116](file:///Users/hudy/ws/jx-system-online/apps/client/src/game/actors/ActorView.ts#L111-L116):
  ```ts
  const ONE_SHOT_FPS: Partial<Record<AssocKey, number>> = { attack1: 30, attack2: 30, magic: 30, wound: 30, die: 18 };
  ...
  const ms = key === 'jump' ? Math.max(1, s.jumpMs || 800) : (frames * 1000) / ONE_SHOT_FPS[key]!;
  const f = Math.min(frames - 1, Math.floor((elapsed / ms) * frames));
  ```
- **Phân tích:**
  - Mọi động tác `attack1`, `attack2`, `magic` trên Client đều tính thời lượng `ms = (frames * 1000) / 30`. Với động tác 12–16 frames, nhân vật **luôn vung vũ khí trong đúng 400–533 ms** rồi lập tức về tư thế đứng `stand` ([dòng 128](file:///Users/hudy/ws/jx-system-online/apps/client/src/game/actors/ActorView.ts#L128)), bất kể chỉ số tốc độ đánh của nhân vật là `0%` hay `150%`.
  - Trên Server, tại [`apps/server/src/world/systems/combat.ts`](file:///Users/hudy/ws/jx-system-online/apps/server/src/world/systems/combat.ts#L25-L28):
    ```ts
    const scale = castScale(sim.bag, s, level);
    sim.castUntil = w.clock + (pose.ms * scale) / 1000;
    ...
    playOnce(w, sim, pose.anim, pose.ms / 1000);
    ```
    Hàm `playOnce` giữ tư thế trên server theo `pose.ms / 1000` (**quên nhân `scale`**), và [`apps/server/src/net/schema.ts`](file:///Users/hudy/ws/jx-system-online/apps/server/src/net/schema.ts#L31-L32) mới chỉ đồng bộ `jumpMs` cho khinh công chứ chưa đồng bộ thời lượng động tác tấn công xuống Client.

### Nguyên nhân 2 (Server): Thời lượng gốc của chu kỳ ra đòn đang đặt 530–600 ms thay vì 1000 ms (18 frames)
- **Đường dẫn:** [`packages/shared/src/skills/engine/SkillEngine.ts`](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L144):
  ```ts
  const pose = Math.max(MIN_CAST_MS, castAnim(s) === 'cast' ? 530 : 600);
  ```
- **Phân tích:**
  - Hai con số `530 ms` và `600 ms` là hằng số tạm từ giai đoạn đầu (tính theo 16–18 frames ở 30 FPS) trước khi viết module `formulas/speed.ts`.
  - Khi [`combat.ts:26`](file:///Users/hudy/ws/jx-system-online/apps/server/src/world/systems/combat.ts#L26) nhân `pose.ms` với `scale = actionFrames(pct) / 18`:
    - Ở **0% tốc độ đánh** (`18 frames`, `scale = 1`): nhân vật đã đánh mỗi **530–600 ms/đòn** (~1,7–1,9 đòn/giây). Trong VLTK gốc, phải đạt **+81% đến +101% tốc độ đánh (9–10 frames)** mới có tốc độ này!
    - Ở **+65% tốc độ đánh** (`10 frames`, `scale = 0,556`): `castUntil` giảm còn **294–333 ms/đòn** (~3,0–3,4 đòn/giây, vượt trần tối đa 6 frames của engine gốc).
    - Ở **+101% tốc độ đánh** (`8 frames`, `scale = 0,444`): `castUntil` giảm còn **235–266 ms/đòn** (~3,8–4,2 đòn/giây).
  - Vì ngay ở 0% đã quá nhanh (530–600 ms) và khi có đồ/buff lại tụt xuống 235–330 ms (chỉ chênh vài tick 50 ms của server), người chơi cảm nhận tốc độ đánh lúc nào cũng cực nhanh và gần như cố định.

### Nguyên nhân 3 (Server): Nhịp liên hoàn (`genData`) và độ trễ ra đòn (`wait`) trong `SkillEngine` không co giãn theo tốc độ đánh
- **Đường dẫn:** [`packages/shared/src/skills/engine/SkillEngine.ts`](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L172-L174), [dòng 237–248](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L237-L248) và [dòng 324–327](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L324-L327):
  ```ts
  const waitMs = Math.max(pose, (lastTick + 4) * JX_TICK_MS);
  ...
  // SkillStyle.Melee (dòng 241):
  for (let i = 0; i < count; i++) {
    const at = delay + (s.wait ?? 0) + i * gap;
    last = Math.max(last, at);
    this.after(at, () => { ... });
  }
  ```
- **Phân tích:**
  - Với các chiêu cận chiến nhiều thức (`SkillStyle.Melee`, vd. Thiên Vương *Hồi Phong Lạc Nhạn* 2 thức `genData=10`, *Dương Quan Tam Điệp* 3 thức `genData=8`, *Huyết Chiến Bát Phương* 4 thức `genData=4`, *Truy Tinh Trục Nguyệt* / *Bá Vương Tạm Kim* 5 thức `genData=3`) hoặc chiêu bắn đạn tuần tự (`GenerateStyle.Order`, vd. Võ Đang *Tam Hoàn Thao Nguyệt* / *Nhân Kiếm Hợp Nhất* 3 thức `genData=6`), hàm `this.after(at, ...)` đổi tick sang ms bằng `ticks * JX_TICK_MS` cố định ([dòng 484](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L484)), **hoàn toàn không nhân `scale`**.
  - Hệ quả: khoảng cách giữa các nhát chém trong một chuỗi liên hoàn luôn cố định ở nhịp 18 FPS gốc dù tốc độ đánh tăng cao; và khi `scale < 1`, đợt đánh kế tiếp (`castUntil`) có thể bắt đầu trước khi các thức cuối của đợt trước kịp nổ xong.

### Nguyên nhân 4 (Shared & UI): Chưa cộng `attackspeed_yan_v` và `castspeed_yan_v`
- **Đường dẫn:**
  - [`packages/shared/src/formulas/speed.ts`](file:///Users/hudy/ws/jx-system-online/packages/shared/src/formulas/speed.ts#L16-L18):
    ```ts
    const key = isExternal(s, level) ? 'attackspeed_v' : 'castspeed_v';
    const pct = attrOf(bag, key);
    ```
  - [`apps/client/src/ui/windows/character.ts`](file:///Users/hudy/ws/jx-system-online/apps/client/src/ui/windows/character.ts#L142):
    ```ts
    setText('ce-atkspd', `${attrOf(p.bag, 'attackspeed_v')}/${attrOf(p.bag, 'castspeed_v')}`);
    ```
- **Phân tích:** Cả nơi tính tốc độ đánh thực tế lẫn nơi hiển thị trên cửa sổ Thuộc tính (phím `C`) đều mới đọc `_v`, bỏ qua `attackspeed_yan_v` và `castspeed_yan_v`.

---

## 4. Hướng xử lý chi tiết (Kế hoạch triển khai)

Khi triển khai, thực hiện theo 4 bước đồng bộ dưới đây:

### Bước 1: Chuẩn hóa công thức và cộng gộp `_yan_v` trong `packages/shared`
1. **File [`packages/shared/src/formulas/tuning.ts`](file:///Users/hudy/ws/jx-system-online/packages/shared/src/formulas/tuning.ts#L84-L93):**
   - Trong `SPEED`, thêm hằng số thời lượng gốc 1 chu kỳ tấn công/xuất chiêu:
     ```ts
     /** Base duration (ms) of an 18-frame attack/cast cycle at 0% speed (18 * 1000 / 18 = 1000 ms). Source: DATA basevalue.ini */
     baseActionMs: 1000,
     ```
2. **File [`packages/shared/src/formulas/speed.ts`](file:///Users/hudy/ws/jx-system-online/packages/shared/src/formulas/speed.ts#L13-L39):**
   - Thêm 2 hàm helper lấy tổng tốc độ đánh ngoại công / nội công (gồm cả Âm `_v` và Dương `_yan_v`) để Server và Client dùng chung:
     ```ts
     export function attackSpeedPct(bag: AttrBag): number {
       return attrOf(bag, 'attackspeed_v') + attrOf(bag, 'attackspeed_yan_v');
     }
     export function castSpeedPct(bag: AttrBag): number {
       return attrOf(bag, 'castspeed_v') + attrOf(bag, 'castspeed_yan_v');
     }
     ```
   - Cập nhật `castScale(bag, s, level)` dùng `isExternal(s, level) ? attackSpeedPct(bag) : castSpeedPct(bag)`.
3. **File [`apps/client/src/ui/windows/character.ts`](file:///Users/hudy/ws/jx-system-online/apps/client/src/ui/windows/character.ts#L142):**
   - Hiển thị `T.Độ đánh` bằng `${attackSpeedPct(p.bag)}/${castSpeedPct(p.bag)}` để số trên bảng `C` luôn khớp 100% với tốc độ thực tế.

### Bước 2: Đưa chu kỳ gốc về `1000 ms` và co giãn nhịp liên hoàn theo `scale` trong `SkillEngine`
- **File [`packages/shared/src/skills/engine/SkillEngine.ts`](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L134-L180):**
  1. Thêm tham số `scale = 1` vào `cast(casterId, skillId, targetX, targetY, levelOverride?, scale = 1)`.
  2. Thay `const pose = Math.max(MIN_CAST_MS, castAnim(s) === 'cast' ? 530 : 600);` ở [dòng 144](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L144) bằng:
     ```ts
     const pose = SPEED.baseActionMs; // 1000 ms (18 frames at 18 FPS)
     ```
  3. Truyền `scale` vào `this.launch(caster, s, level, tx, ty, 0, 1, scale)` để mọi lệnh hẹn giờ đòn đánh `this.after(ticks * scale, ...)` của chiêu chính (gồm `s.wait`, các thức `SkillStyle.Melee` ở [dòng 241](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L241), và `GenerateStyle.Order` ở [dòng 325](file:///Users/hudy/ws/jx-system-online/packages/shared/src/skills/engine/SkillEngine.ts#L325)) đều co giãn đồng bộ theo tốc độ đánh.
     *(Lưu ý: thời gian tồn tại của bẫy trên đất hoặc mưa rơi tự nhiên sau khi đã phóng ra vẫn giữ nhịp tick thế giới, chỉ co giãn độ trễ xuất chiêu `wait` và khoảng cách giữa các thức ra đòn `genData`).*
  4. Trả về `ms = Math.max(MIN_CAST_MS, Math.round(Math.max(pose, lastTick * JX_TICK_MS) * scale))` (hoặc trả về `pose` gốc `1000 ms` rồi nhân `scale` tại `combat.ts`).

### Bước 3: Đồng bộ thời lượng hoạt ảnh (`playOnce`) từ Server xuống Client
1. **File [`apps/server/src/world/systems/combat.ts`](file:///Users/hudy/ws/jx-system-online/apps/server/src/world/systems/combat.ts#L24-L28):**
   - Tính `scale = castScale(sim.bag, s, level)` trước khi gọi `w.skills.cast(...)`:
     ```ts
     const scale = castScale(sim.bag, s, level);
     const pose = w.skills.cast(sim.id, cmd.skillId, cmd.tx, cmd.ty, level, scale);
     if (!pose) return false;
     const durMs = Math.round(pose.ms * scale);
     sim.castUntil = w.clock + durMs / 1000;
     if (pose.jump) startJump(w, sim, pose.jump);
     else playOnce(w, sim, pose.anim, durMs / 1000);
     ```
2. **File [`apps/server/src/world/systems/anim.ts`](file:///Users/hudy/ws/jx-system-online/apps/server/src/world/systems/anim.ts#L37-L41) & [`apps/server/src/net/schema.ts`](file:///Users/hudy/ws/jx-system-online/apps/server/src/net/schema.ts#L32):**
   - Khi `playOnce(w, sim, anim, duration)` được gọi, gán `sim.actor.jumpMs = Math.round(duration * 1000)` (tận dụng luôn trường `jumpMs: uint16` sẵn có trên `Actor` làm thời lượng ms của động tác one-shot hiện tại, hoặc đặt alias rõ nghĩa) để Client biết chính xác đòn đánh đó kéo dài bao nhiêu mili-giây (`1000 ms` ở 0%, `667 ms` ở 50%, `444 ms` ở 101%...).

### Bước 4: Co giãn tốc độ hoạt ảnh trên Client (`ActorView.ts`)
- **File [`apps/client/src/game/actors/ActorView.ts`](file:///Users/hudy/ws/jx-system-online/apps/client/src/game/actors/ActorView.ts#L11-L12) và [dòng 111–116](file:///Users/hudy/ws/jx-system-online/apps/client/src/game/actors/ActorView.ts#L111-L116):**
  - Đổi FPS mặc định của `attack1`, `attack2`, `magic`, `wound` từ `30` về chuẩn `18` FPS gốc (`ONE_SHOT_FPS = { attack1: 18, attack2: 18, magic: 18, wound: 18, die: 18 }`).
  - Với các động tác `jump`, `attack1`, `attack2`, `magic`, nếu `s.jumpMs > 0` (thời lượng thực tế do server tính theo `scale`), dùng trực tiếp `ms = s.jumpMs`:
    ```ts
    const ms = s.jumpMs > 0 && (key === 'jump' || key === 'attack1' || key === 'attack2' || key === 'magic')
      ? s.jumpMs
      : (frames * 1000) / ONE_SHOT_FPS[key]!;
    ```
  - Kết quả:
    - Ở **0% tốc độ đánh** (`s.jumpMs = 1000`), động tác vung vũ khí kéo dài đúng `1000 ms` (nhịp 18 FPS đằm, chuẩn VLTK1).
    - Khi mặc vũ khí tốc độ đánh +30%, bật trấn phái +60%... (`s.jumpMs` giảm xuống `611 ms`, `500 ms`, `444 ms`), toàn bộ các frame vung kiếm/thương/chưởng được phát gọn trong đúng thời lượng đó — mắt thường nhìn thấy nhân vật ra đòn nhanh lên rõ rệt theo từng mốc.
    - Khi giữ chuột trái khóa mục tiêu đánh liên tục, động tác đòn trước vừa kết thúc là nối tiếp mượt sang đòn sau, không còn cảnh vung xong ở 400 ms rồi đứng im chờ.

---

## 5. Đánh giá trên 3 nền tảng mục tiêu (Web, Desktop app, Mobile)

- **Shared & Server (`packages/shared`, `apps/server`):** Dùng chung 100% cho cả **Web**, **Desktop**, và **Mobile**. Việc đưa chu kỳ đánh về chuẩn 18 frames (`1000 ms` ở 0% → `389 ms` ở 126%) thay vì `530 ms → 265 ms` giúp giảm **35%–45% số lượt gọi `cast`, số đạn sinh ra và số gói tin đồng bộ mỗi giây**, giảm tải CPU server và tiết kiệm băng thông/pin đáng kể cho thiết bị **Mobile**.
- **Client (`apps/client`):** `ActorView.update` tính chỉ số frame theo thời gian thực (`elapsed / ms * frames`), hoàn toàn độc lập với tần số quét màn hình (60Hz / 120Hz trên Desktop, iPad, điện thoại hay khi trình duyệt Mobile hạ FPS để tiết kiệm pin). Không phát sinh thêm tài nguyên hay thay đổi cách dựng hình 1:1.

---

## 6. Hạng mục mở rộng sau (Ngoài phạm vi sửa lỗi hiện tại)

- Kỹ năng có tốc độ xuất chiêu cố định không phụ thuộc `attackspeed_v` (ví dụ một số chiêu quyền Thiếu Lâm / Thiên Vương theo bài viết thời JX1 — nguồn **WEB**, chưa có trong dữ liệu bảng `skills.txt`).
- Đồng bộ `wudu.lua` bản rời (`Client_VLTK_SHXT/script/skill/wudu.lua` có thêm `castspeed_yan_v = 32`, `attackspeed_v = 32` cho *Ngũ Độc Kỳ Kinh* #75 so với bản trong `data_extract`) — thuộc mục rà kỹ năng từng phái (`BACKLOG.md` mục `KN1`).


## 7. Điều tra bổ sung: chạy nhanh nhưng nhịp chân/ngựa không đổi — 2026-11-14

**Trạng thái điều tra trước sửa: xác minh bằng mã nguồn và metadata. Phần sửa và kiểm chứng sau đó ở §8; chưa đo client gốc.**

### 7.1. Kết luận và luồng dữ liệu

Phản ánh của người dùng đúng với mã đang chạy: tăng tốc độ di chuyển chỉ làm tăng quãng đường đi mỗi giây; nhịp hoạt ảnh chạy không đọc tốc độ đó. Áp dụng cả người chơi đi chân và cưỡi ngựa, ở thành và ngoài bãi.

```text
Trang bị + bùa + ngựa (chỉ khi cưỡi) + chậm
                |
                v
moveFactor -> Sim.moveScale -> followPath -> Actor.x/y -> client nội suy vị trí
                X
        chưa truyền sang nhịp hoạt ảnh

scene.time.now -> FRAME_MS cố định = 1000/18 -> chỉ số frame -> thân/ngựa/bóng
```

- `packages/shared/src/formulas/speed.ts:32`: `moveFactor = max(0, 1 + fastwalkrun_p/100) * slowFactor`.
- `apps/server/src/world/progress.ts` (`equipmentBag`, `refreshStats`): cộng thuộc tính ngựa chỉ khi `mounted`; tính `sim.moveScale`.
- `apps/server/src/world/commands.ts` (`setMounted`): lên/xuống ngựa gọi lại `updateSpeed` và `refreshStats`. `updateSpeed` giữ tốc nền `PLAYER_SPEED=260` iso px/s (`packages/shared/src/characters/player.ts`). Không có hệ số ngựa nhân riêng nữa.
- `apps/server/src/world/systems/effects.ts` (`refreshMoveScale`): cập nhật hệ số khi bị chậm/hết chậm và trạng thái thay đổi.
- `apps/server/src/world/systems/movement.ts:26`: ngân sách bước đi `sim.speed * speedScale * (sim.moveScale ?? 1) * dt`; chỉ sửa tọa độ/hướng. Người chơi gọi `followPath(sim, dt)` trong `world/players.ts`.
- `apps/server/src/net/schema.ts` và `apps/client/src/state/actor.ts`: có vị trí, tư thế và cờ cưỡi, nhưng chưa có tốc độ di chuyển/hệ số nhịp chạy của từng actor. `Actor.scale` hiện có không phải `Sim.moveScale`; không tái sử dụng tùy tiện.
- `apps/client/src/game/actors/ActorView.ts:129`: vòng lặp dùng `floor((now-loopStart)/FRAME_MS) % n`, không đọc tốc chạy, trạng thái chậm hay tốc ngựa. `PaperDoll.ts:9` đặt `FRAME_MS=1000/18`.
- `ActorView.update` làm mượt vị trí bằng `1-exp(-dt*14)`; đây là nội suy tọa độ, không điều chỉnh nhịp chân. Không phải nguyên nhân trực tiếp khiến nhịp hoạt ảnh cố định.

### 7.2. Vì sao cưỡi ngựa cũng vậy?

`art/jx/index.ts` (`makeLook`, `poseFor`) chọn bảng liên kết cưỡi khi ngựa hợp lệ. Metadata `JX_ASSOC` cho cả `run` và `townRun` chuyển sang `RideRun`. Tuy nhiên đồng hồ phát frame ở `ActorView` vẫn là đồng hồ cố định như đi chân.

`PaperDoll.render/place` ánh xạ các lớp người, ngựa, vũ khí và bóng theo cùng tiến độ frame thân. Các lớp đã dùng chung tiến độ; thiếu dữ liệu điều khiển nhịp chung, không phải cần tăng tốc từng lớp riêng.

Đọc metadata sinh hiện tại, bộ thân hàng `0`, vũ khí hàng `0` (ví dụ cụ thể, không đại diện mọi bộ):

| Bộ hình | Frame/hướng | Một vòng hiện tại ở 18 frame/s |
|---|---:|---:|
| Nam đi chân `ma_bd_001_rn01` | 11 | 611,1 ms |
| Nữ đi chân `fm_bd_001_rn01` | 12 | 666,7 ms |
| Nam/nữ cưỡi `*_bd_001_hr01` | 10 | 555,6 ms |

Đây là frame ảnh trong SPR/catalog, **không đồng nghĩa** với `RunFrame=14` của cấu hình logic. Không thay thế hai đại lượng cho nhau khi chưa kiểm tra cách engine gốc ánh xạ chúng.

Ví dụ tính từ công thức hiện tại, người chơi đang chạy thẳng, không chậm, bộ nam 11 frame không đổi:

| Tổng `fastwalkrun_p` | Hệ số dịch chuyển | Tốc lý thuyết (iso px/s) | Chu kỳ hoạt ảnh hiện tại |
|---|---:|---:|---:|
| 0% | 1,0 | 260 | 611,1 ms |
| +50% | 1,5 | 390 | 611,1 ms |
| +100% | 2,0 | 520 | 611,1 ms |

Bảng là tính toán từ mã, không phải số đo runtime. Tọa độ server còn làm tròn từng tick và đi qua nav; tốc nhìn theo trục màn hình còn phụ thuộc phép chiếu isometric. Khi bị chậm 0,5 lần, vị trí chậm đi nhưng nhịp chân vẫn giữ nguyên — cùng nguyên nhân.

### 7.3. Dữ liệu gốc đã xác minh và phần còn thiếu

- `basevalue.ini` bản rời và bản PAK thắng ưu tiên cùng có `[Common] RunSpeed=10, WalkSpeed=5`, `[Male]/[Female] RunFrame=14, WalkFrame=12`. Đã sửa nhầm lẫn Speed/Frame ở §1–2 tài liệu này.
- Các bảng `settings/npcres/{男,女}主角躯体信息.txt` trong PAK có cột đi/chạy/cưỡi và thông tin frame/hướng/interval. Catalog hiện tại xác nhận bộ hình chạy riêng khi cưỡi.
- Chưa truy vết hàm engine gốc sử dụng `RunFrame`, `WalkFrame`, `RunSpeed` và thuộc tính tăng tốc để chứng minh nhịp chạy thay đổi tuyến tính, theo mốc hay giữ cố định. Chưa có số đo client gốc. Không kết luận “nhân nhịp chạy với moveFactor là chuẩn VLTK1” chỉ từ bảng dữ liệu.
- Tài liệu tham khảo `volam-shxt/docs/breakpoints_speed_and_attack.md` có bảng tốc đánh không khớp chính phép `floor` được nêu (ví dụ +6% tính ra 16 nhưng bảng ghi 17). Không dùng bảng đó làm bằng chứng cho mốc chạy hoặc suy ra mốc chạy từ mốc đánh.
- Không có chỉ mục GitNexus cho `jx-system-online` trong danh sách repo hiện có; kết luận dựa trên đọc trực tiếp mã hiện tại và metadata, không dựa trên chỉ mục repo khác. Chỉ mục client gốc ngày 2026-11-02 chưa được dùng để suy luận engine.

### 7.4. Hướng xử lý đề xuất (chưa triển khai/chưa chốt công thức gốc)

1. Server đồng bộ tốc/hệ số nhịp di chuyển của **mỗi actor** để cả bản thân và người chơi khác đều hiển thị đúng khi đổi đồ, lên/xuống ngựa, nhận/mất bùa và bị/hết chậm. Không chỉ lấy chỉ số ở bảng thuộc tính của người chơi hiện tại.
2. Client tích lũy tiến độ chạy theo từng khoảng thời gian: `phase += dt * cadence`, rồi ánh xạ phase sang frame. Nếu cadence đổi giữa chừng, không tính lại toàn bộ `(now-loopStart)*cadenceMoi` vì sẽ nhảy frame. Chỉ áp dụng cho `run/townRun`, giữ nhịp đứng và các động tác một lần độc lập.
3. Phương án trải nghiệm tạm đề xuất: nhịp chạy tăng theo hệ số dịch chuyển, có chuẩn nền tách theo đi chân/cưỡi và kiểm chứng hình. Đây là lựa chọn thiết kế, chưa phải công thức gốc đã xác minh. Giữ nguyên cùng phase cho thân/ngựa/vũ khí/bóng, không đổi ảnh hoặc tỉ lệ dựng 1:1.
4. Kiểm chứng bằng đường thẳng cố định ở các mức 0/+50/+100%, cả nam/nữ, trong/ngoài thành, đi chân/cưỡi, bị chậm/hết chậm, đổi ngựa ngay khi chạy, và quan sát từ client thứ hai. Đo riêng thời gian đi hết quãng đường và số vòng hoạt ảnh; kiểm tra đổi cadence không nhảy phase, dừng không tiếp tục chạy tại chỗ. Kiểm tra 30/60/120 FPS và màn hình cảm ứng. Logic dùng chung Web/Desktop/Mobile; wrapper native cần kiểm riêng khi đã đóng gói.


## 8. Đã sửa nhịp hoạt ảnh di chuyển — 2026-11-14

Người dùng đã yêu cầu sửa sau khi đọc điều tra. Phạm vi: đi chân/cưỡi ngựa và nhịp chạy theo tốc độ hiện tại; không triển khai phần tốc đánh/xuất chiêu §4.

### 8.1. Hành vi và lựa chọn

- Nhịp chạy = nhịp bộ hình hiện tại ở tốc nền × hệ số dịch chuyển. Ví dụ +100% tốc chạy làm cả dịch chuyển và nhịp chân/ngựa nhanh gấp đôi; chậm làm cả hai chậm tương ứng. Đây là lựa chọn trải nghiệm theo yêu cầu USER, không khẳng định đã tái tạo công thức engine gốc.
- Thêm `Actor.moveScale: float32`, khởi tạo1 cho người chơi/quái. `followPath` đồng bộ tích `speedScale * Sim.moveScale` cho mọi client, dùng cùng hệ số cho bước di chuyển. Bao gồm hệ số đi dạo của AI; tốc nền riêng của mỗi loại quái không bị thay bằng tốc nền người chơi.
- `ActorState.moveScale` tùy chọn để NPC tĩnh và preview cũ mặc định1. `ActorView` tích lũy frame qua từng khoảng thời gian với hệ số mới, không nhân ngược toàn bộ lịch sử. Đổi tốc giữa chừng không đặt lại phase. Chỉ `run/townRun` dùng hệ số này; tư thế đứng và one-shot dùng nhịp riêng. Quay lại chạy sau one-shot bắt đầu đồng hồ vòng mới, tránh cộng cả thời gian đang đánh/nhảy vào vòng chạy.
- `RideRun` tiếp tục được chọn bằng bảng gốc; thân/ngựa/vũ khí/bóng giữ cùng phase. Không sửa asset, cách dựng1:1 hay công thức tốc dịch chuyển/buff/ngựa hiện có. Không thêm thư viện.

### 8.2. Kiểm chứng đã thực hiện

- `npm run typecheck`, `npm run build`, `git diff --check`: đạt; build có cảnh báo chunk lớn hiện có.
- Playwright/Chromium trên Vite thử `:5174`: gọi luồng chọn frame thực tế với 36 tổ hợp (30/60/120 FPS × rate0/0,5/1/1,5/2/3 × trong/ngoài thành); phase sau một giây khớp `18*rate`. Kiểm tra đổi tốc ngay cùng timestamp không nhảy phase, tăng tốc/chậm kế tiếp, đứng không bị nhân tốc, dừng và quay lại chạy sau đòn đánh.
- Cảnh Phaser thật: tải và dựng sáu nhân vật (đi chân/cưỡi ×0,5/1/2), frame thân11/10 tương ứng; phase chạy thực tế tỉ lệ1:2:4, không pageerror. Ảnh `/tmp/jx-movement-smoke/rates.png`; script `/tmp/jx-movement-smoke/browser.cjs`.
- Server thử `:2568`, DB riêng, hai kết nối WebSocket: cả chủ nhân và người quan sát nhận rate1/1,5/2; chậm giảm2→1, hết chậm về2; mặc ngựa+100% chưa cưỡi giữ1, cưỡi thành2, xuống về1. Gọi bước đi thực tế ở rate0,5/1/2 cho quãng đường đúng130/260/520 iso px trong1s. Script `/tmp/jx-movement-smoke/network.mts` tự kết thúc sau thử; không ghi DB thật.
- Logic dùng chung Web/Desktop/Mobile; đã kiểm tra Chromium desktop, chưa chạy wrapper native hoặc thiết bị cảm ứng thật. Chưa đo/so sánh trực tiếp với client gốc.
- Chưa commit/push. Khi dùng bản mới cần tải lại client nếu đang giữ kết nối/schema cũ.


## 9. Đối chiếu mốc volamidle — 2026-11-14 (chỉ đọc, chưa đổi code)

USER muốn bảng mốc tốc độ/frame vẽ vì thấy quá nhanh, chỉ định tham khảo `volamidle.pages.dev` và client SHXT. Đã đọc trực tiếp config/runtime/render bridge hiện tại của volamidle (HEAD `7f8aa64`); chỉ mục graph báo chậm1commit và có kết quả lỗi ký tự nên không dùng kết quả graph để xác lập số liệu.

Nguồn: `/Users/hudy/ws/volamidle.pages.dev/src/client/speed/config.ts`, `runtime.ts`, `README.md`, `combat/legacy-bridge.js`, `render/arena-01.js`. Mốc dùng **tổng %**, 100%=tốc nền, 200%=+100%; sàn25%, trần300%, chọn mốc cao nhất không vượt tổng tốc sau buff/chậm. Đã gọi trực tiếp `resolveSpeed` xác nhận149% chạy chọn120%, 999% chọn300%.

### 9.1. Mốc đánh volamidle (sheet chuẩn20frame)

| Mốc tổng tốc độ | Frame vẽ chuẩn |
|---|---:|
| 25–<50% | 5 FPS |
| 50–<75% | 15 FPS |
| 75–<100% | 20 FPS |
| 100–<125% | 25 FPS |
| 125–<150% | 35 FPS |
| 150–<200% | 40 FPS |
| 200–<250% | 50 FPS |
| 250–<300% | 60 FPS |
| ≥300% | 70 FPS |

### 9.2. Mốc chạy volamidle (sheet chuẩn8frame)

| Mốc tổng tốc độ | Frame vẽ chuẩn |
|---|---:|
| 25–<50% | 3 FPS |
| 50–<75% | 6 FPS |
| 75–<100% | 9 FPS |
| 100–<120% | 12 FPS |
| 120–<150% | 14,4 FPS |
| 150–<200% | 18 FPS |
| 200–<250% | 24 FPS |
| 250–<300% | 30 FPS |
| ≥300% | 36 FPS |

FPS bảng là tốc chuẩn tham chiếu, không phải số ảnh của mọi sprite. Đánh chuẩn20frame nên100% mất800ms/đòn; chạy chuẩn8frame nên100% mất666,7ms/vòng. Với bộ ảnh có Nframe/hướng, FPS ảnh thực tế = FPS chuẩn ×N/referenceFrames. Chạy có `distanceScale=1.15` chỉ tăng quãng đường, không tăng FPS. Đây là thiết kế riêng volamidle, không tự gọi là công thức gốc SHXT.

### 9.3. So với bản đang sửa

- `jx-system-online` hiện chưa dùng các mốc trên. Đánh vẫn khóa30FPS ảnh (theo mỗi sheet), đồng thời nhịp server dùng530/600ms × actionScale, chưa đồng bộ như §4. Vì vậy bảng frame logic của `actionFrames` không đại diện tốc vẽ đang có.
- Chạy mới sửa dùng18FPS ảnh × hệ số dịch chuyển tuyến tính, chưa có trần/mốc, chưa chuẩn hóa chu kỳ theo frame-count. Ví dụ ngựa10frame, tổng200% (+100%): hiện36FPS ảnh /277,8ms/vòng; volamidle chuẩn24FPS ×10/8=30FPS ảnh /333,3ms/vòng. Cùng tổng tốc này nhịp ngựa hiện nhanh hơn20%. Không suy ra mọi sprite đều nhanh hơn cùng tỷ lệ: thân nam11frame/nữ12frame khác nhau.
- SHXT `settings/npc/player/basevalue.ini` và bản PAK thắng ưu tiên chỉ xác nhận AttackFrame/CastFrame18, RunFrame14, WalkFrame12; các giá trị là cấu hình số tick của động tác, không phải FPS bảng volamidle hay số frame của mọi SPR. Chưa tìm thấy/kiểm chứng bảng mốc tốc chạy/tốc đánh tương đương trong nguồn đã đọc; bảng docs/breakpoints_speed_and_attack.md còn mâu thuẫn phép floor, không dùng làm chứng cứ chuẩn gốc.
- Hướng cân nhắc sau khi USER chọn: bảng tuning riêng + chuẩn hóa thời lượng mỗi vòng, cân nhắc trần và nhịp nền trước khi đổi. Chưa áp dụng mốc/tốc của volamidle vào project. Thay đổi bảng ở shared/server/client phải nhất quán trên Web/Desktop/Mobile; không ảnh hưởng pixel1:1.


## 10. Cấu hình đang áp dụng: mốc volamidle + trang thử — 2026-11-14

USER duyệt áp dụng bảng volamidle cho cả đánh/xuất chiêu và chạy, có sàn/trần, chuẩn hóa đi chân/cưỡi và điều khiển thử tại `?skills`. Phần này thay thế công thức floor18frame và nhịp chạy tuyến tính ở các mục lịch sử phía trên.

### 10.1. Chỉnh cấu hình game ở đâu?

**Chỉ dẫn cho AI ở các phiên sau:** khi người dùng muốn đổi mốc, sàn/trần, FPS hoặc thời lượng nền, bắt đầu tại **`packages/shared/src/formulas/tuning.ts` → `SPEED`**. Không sửa `*.gen.ts`, không thêm bảng tốc riêng ở client/server/trang thử.

| Muốn chỉnh | Khóa trong `SPEED` |
|---|---|
| Sàn / trần tổng tốc | `minPercent` / `maxPercent` |
| Mốc % và FPS đánh/xuất chiêu | `attack.phases` |
| Số frame tham chiếu của một đòn | `attack.referenceFrames` |
| Mốc % và FPS chạy | `run.phases` |
| Số frame tham chiếu của một vòng chạy | `run.referenceFrames` |
| Quãng đường di chuyển, không đổi nhịp chân | `run.distanceScale` |

Công thức chọn mốc ở `packages/shared/src/formulas/speed.ts`; giao diện thử ở `apps/client/src/dev/skill-lab/SkillLabPanel.ts` và `SkillLabScene.ts`. Chỉ sửa các file cơ chế này khi cần đổi hành vi, không phải khi chỉ cân chỉnh số liệu. Sau chỉnh cấu hình, chạy `npm run test:speed`, `npm run typecheck`, `npm run build`, rồi nạp lại server/client. Chỉnh trong `?skills` chỉ có tác dụng trong phiên thử, không lưu qua tải lại trang.

`packages/shared/src/formulas/tuning.ts` → **`SPEED`**, dùng chung server/client và ba nền tảng:

- `minPercent=25`, `maxPercent=300`: tổng tốc sau buff/debuff/chậm, 100%=tốc nền, 200%=+100%. Chỉ áp giới hạn một lần sau khi cộng/nhân các hiệu ứng.
- `attack.referenceFrames=20`, `attack.phases`: 25/50/75/100/125/150/200/250/300% → 5/15/20/25/35/40/50/60/70FPS.
- `run.referenceFrames=8`, `run.phases`: 25/50/75/100/120/150/200/250/300% → 3/6/9/12/14,4/18/24/30/36FPS.
- `run.distanceScale=1.15`: tăng quãng đường, không tăng nhịp hoạt ảnh (giống cấu hình volamidle). Tốc nền mỗi actor vẫn giữ riêng; nhân vật vẫn có PLAYER_SPEED260iso px/s trước hệ số quãng đường và mốc.
- Đổi cấu hình file rồi nạp lại client/server. `validateSpeedConfiguration` kiểm tra mốc tăng dần, FPS dương/không giảm, có sàn/100%/trần, referenceFrames nguyên dương; không tự chấp nhận bảng hỏng.

`formulas/speed.ts resolveSpeed(kind,totalPercent,config?)` chọn mốc cao nhất không vượt tốc tổng; trả về phase/FPS/multiplier/cycleMs. Bổ sung `_yan_v` cho cả công thức và bảng thuộc tính. Không còn dùng actionFrames/actionScale cũ.

### 10.2. Đồng bộ và thời lượng

- `moveFactor` trả hệ số của mốc đã chọn. `followPath` dùng cùng hệ số cho vị trí/Actor.moveScale; hệ số đi dạo riêng của AI tiếp tục có tác dụng. Client tích lũy **số vòng**, rồi ánh xạ sang số frame thực tế của thân/ngựa; số ảnh khác nhau vẫn hoàn tất cùng thời lượng. Tư thế đứng giữ nhịp riêng.
- Đánh: server chụp mốc tốc lúc bắt đầu từ thuộc tính ngoại/nội công + Dương + chậm, truyền duration vào SkillEngine; `playOnce` gửi **`Actor.actionMs:float32`**, không mượn trường jumpMs. Client phát đủ các frame của mọi bộ đi chân/cưỡi trong duration này.
- Theo cơ chế volamidle: hoàn tất tư thế phát **một lần xuất chiêu chính**. Engine hẹn thời điểm phát; khi chết/rời bản đồ, cancel xóa lần chưa phát. Đạn đã phóng, nhịp tầng phụ, thời gian tồn tại, độc/bẫy và nhịp tác dụng tự nhiên vẫn theo tick thế giới; không tăng tốc tất cả hiệu ứng theo FPS thân. Thời gian wait/genData gốc của hiệu ứng tiếp tục áp dụng sau lần phát chính. Aura bật/tắt, blink và Khinh công vẫn giữ cơ chế riêng; Khinh công giữ thời gian bay.
- Không còn nhân scale lần nữa ở combat.ts hoặc giữ pose530/600ms và hoạt ảnh30FPS. Hồi chiêu riêng của kỹ năng vẫn có thể dài hơn pose và giới hạn lần đánh kế tiếp.
- Đây là quyết định USER chọn mô hình volamidle; không khẳng định mô phỏng nguyên bản SHXT.

### 10.3. Cách thử trên `/?skills`

Không cần đăng nhập/server. Trong khung **Thử tốc độ**:

1. Nhập **Đánh %** và **Chạy %** theo tổng tốc, hoặc chọn nhanh mốc bằng danh sách cạnh ô nhập. Có thể nhập0/999 để kiểm tra sàn/trần.
2. Chọn **Đứng / Tự đánh / Tự chạy / Chạy & đánh**. Tự chạy đi qua lại; Chạy & đánh đánh khi tới đầu đường rồi tiếp tục chạy. Nút Tự đánh/phímA vẫn dùng được; khi gõ vào input/textarea, phím không đổi phái/chiêu.
3. Bật **Cưỡi ngựa** để so cùng tổng tốc nhập với đi chân. Trang thử cố ý không cộng thêm bonus ngựa lần nữa. Bảng hiện mốc thực tế/FPS chuẩn/ms mỗi đòn/vòng; tốc đánh đổi từ đòn sau.
4. Mở **Cài đặt bảng mốc · chỉ phiên thử** để sửa cấu hình nâng cao, bấm Áp dụng bảng thử; cấu hình lỗi hiện thông báo và giữ cấu hình cũ. **Khôi phục mặc định** nạp lại SPEED. Các thay đổi này chỉ trong bộ nhớ trang thử, không ghi vào game/server/tài khoản và không lưu qua reload. Muốn chỉnh game lâu dài, sửa SPEED trong tuning.ts.

Bố cục nhỏ có khung cuộn, camera giữ nhân vật ở vùng bên phải bảng, giữ pixel1:1; không phụ thuộc chuột/phím khi chọn chế độ và tốc bằng form.

### 10.4. Kiểm chứng

- `npm run typecheck`, `npm run test:speed` (3 bài kiểm tra `tests/speed-phases.test.ts`), `npm run build`, `git diff --check` đạt. Build có cảnh báo chunk lớn hiện có.
- Bài kiểm tra: mọi mốc/trước mốc/sàn/trần, cap sau slow, cộng Dương, sửa cấu hình không làm đổi mặc định, từ chối bảng hỏng; engine giữ duration, chỉ phát một lần/pose và cancel trước khi phát.
- Chromium trang `?skills`: nhập0/999 và các mốc, tự đánh thực tế trong1,8s ở100/200/999% cho2/4/6lượt, duration800/400/285,7ms. Đi chân11frame và ngựa10frame cùng200% đều3vòng/s. 75tổ hợp30/60/120FPS ×5mức tốc ×5frame-count khớp chu kỳ; sửa/reset/bắt lỗi config và nhập phím không đổi phái đạt, không pageerror.
- Hai WebSocket thật, DB riêng: cả chủ nhân/người quan sát nhận đúng rate và actionMs ở các mốc/trần; mặc ngựa+100% lên/xuống nhận2→1; quãng đường dùng đúng distanceScale và phase. Cổng2568 đang có tiến trình thử khác nên dùng2569 riêng, không đụng server chính hoặc DB thật.
- Màn390×844 có kiểm tra bố cục và vị trí nhân vật ngoài bảng; kiểm tra DPR1/2. Chưa kiểm wrapper native hoặc thiết bị cảm ứng thật. Cùng mã công thức/render chạy trên Web/Desktop/Mobile.
- Script/ảnh thử ở `/tmp/jx-speed-phases/`; test cốt lõi được lưu trong repo. Đã commit phần GP6 theo yêu cầu USER (hash xem git log); không push. Giữ các thay đổi Bot/KN14/Tống Kim đang có ngoài commit.
