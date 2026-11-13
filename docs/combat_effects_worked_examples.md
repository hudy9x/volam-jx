# Ví dụ chi tiết: sát thương → hiệu ứng (frame, màu sắc, hóa giải)

Bổ sung cho `combat_damage_and_status_effects_research.md`. Mục tiêu: **ví dụ tính toán cụ thể** cho từng hiệu ứng (frame giảm, frame dừng, co giật chèn state, độc rút máu), **màu nhân vật**, và **công thức hóa giải**.

**Chú thích mức chắc chắn:** ✅ đọc trực tiếp từ dữ liệu · 🟡 suy luận/đề xuất (công thức engine nằm ở server, chưa xác minh) · 🎨 đề xuất thiết kế (không có trong dữ liệu).

---

## 1. Nền tảng chung

| Hằng số | Giá trị | Nguồn |
| :--- | :--- | :--- |
| Tốc độ game | **18 tick/giây** (1 tick ≈ 55,6 ms) | ✅ script dùng `18*45` = 45 s |
| `HurtFrame` nhân vật | 12 frame (0,67 s) | ✅ `basevalue.ini` |
| `AttackFrame` / `CastFrame` | 18 frame (1 s) | ✅ `basevalue.ini` |
| `RunFrame` / `WalkFrame` | 14 / 12 frame (nam) | ✅ `basevalue.ini` |
| Nội suy theo cấp | tuyến tính giữa các điểm `{{cấp, giá trị},...}` | ✅ hàm `Line` trong `head.lua` |

**Nội suy** giữa `(L1,V1)` và `(L2,V2)`: `V(L) = V1 + (L − L1) × (V2 − V1) / (L2 − L1)`

**Hai loại "thời gian" cần phân biệt:**
- **Thời lượng trạng thái** (state timer): đếm theo tick thật, ví dụ choáng 15 tick. Luôn chạy 18 tick/giây.
- **Tốc độ phát hoạt ảnh** (animation speed): số frame sprite tiến lên mỗi tick. Băng sát làm giảm đại lượng này, không làm giảm state timer.

---

## 2. Băng sát → làm chậm (frame vẽ bị giảm)

### 2.1 Dữ liệu ✅
`colddamage_v` có 3 tham số: **P1 = sát thương min, P2 = thời gian chậm (tick), P3 = sát thương max**. Chỉ 6/69 định nghĩa đặt P2; còn lại dùng mặc định của engine (chưa biết).

Ví dụ có P2 (Đường Môn, `tangmen.lua`):
`colddamage_v = {[1]={{1,60},{20,400}}, [2]={{1,1},{20,18}}, [3]={{1,60},{20,400}}}`

### 2.2 Công thức 🟡
```
thời_gian_chậm       = P2(cấp) × (1 − R_chậm / 100)     R_chậm = Σ freezetimereduce_p, kẹp [.., 100]
tốc_độ_phát_frame m  = 0.5   (đề xuất; dữ liệu không nêu mức giảm)
frame_hiển_thị      += m     mỗi tick khi đang chậm (thay vì += 1)
```

### 2.3 Ví dụ tính
**Đường Môn, cấp 10:** P2 = 1 + (10−1)×(18−1)/(20−1) = **9,05 tick (≈ 0,5 s)**; sát thương min = 60 + 9×340/19 ≈ 221.

| Mục tiêu | R_chậm | Thời gian chậm | Ghi chú |
| :--- | :-: | :-: | :--- |
| Không giáp | 0% | 9,05 tick | |
| Giày 40% | 40% | 9,05 × 0,6 = **5,43 tick** | |
| Giày 40% + nón 50% | 90% | 0,9 tick (≈ 1 tick) | gần như miễn nhiễm |
| Giáp 40% + nón 50% + bùa 30% | 120% → kẹp 100% | **0** | miễn nhiễm |

**Frame vẽ khi bị chậm (m = 0,5):**

| Hoạt ảnh | Số frame gốc | Bình thường | Khi chậm m=0,5 |
| :--- | :-: | :-: | :-: |
| Chạy (`RunFrame`) | 14 | 14 tick/vòng (0,78 s) | **28 tick** (1,56 s) |
| Đi (`WalkFrame`) | 12 | 12 tick | 24 tick |
| Ra đòn (`AttackFrame`) | 18 | 18 tick (1 s) | **36 tick** (2 s) |
| Tung chiêu nội công (`CastFrame`) | 18 | 18 tick | 36 tick |

**Diễn biến từng tick** (đang chạy, chậm 9 tick, m = 0,5, frame chạy hiện tại = 4):

| Tick | 0 | 1 | 2 | 3 | 4 | … | 9 | 10 |
| :--- | :-: | :-: | :-: | :-: | :-: | :-: | :-: | :-: |
| Frame sprite | 4 | 4,5 → **4** | 5 | 5 | 6 | … | 8,5 → **8** | 9 (hết chậm, m=1) |

Sprite giữ nguyên, chỉ **mỗi frame bị giữ 2 tick**. Quãng đường cũng nhân m nếu áp dụng `fastwalkrun_p` âm (✅ NPC `npcrun`: −10% → −120%).

### 2.4 Thuộc tính đi kèm làm chậm ✅
| Thuộc tính | Ý nghĩa | Ví dụ |
| :--- | :--- | :--- |
| `fastwalkrun_p` (âm) | giảm tốc chạy/đi | NPC `npcrun`: −10 → −120% trong 30 s |
| `attackspeed_v`, `castspeed_v` (âm) | giảm tốc ngoại/nội công | NPC `npcattack`: −10 → −50 |
| `freezetimereduce_p` (âm) | kéo dài thời gian chậm | NPC `npccolden`: −5 → −30% |

---

## 3. Lôi sát → choáng (frame bị dừng hẳn)

### 3.1 Dữ liệu ✅
`lightingdamage_v` **không có tham số choáng**. Choáng đến từ **`stun_p`**: **P1 = xác suất (%), P2 = thời lượng (tick)**. Mod thêm `do_stun_p` (người đánh +%) và `anti_do_stun_p` (người bị đánh −%).

### 3.2 Công thức 🟡
```
xác_suất  p = clamp( P1(cấp) + do_stun_p(người đánh) − anti_do_stun_p(mục tiêu), 0, 100 )
thời_lượng T = P2(cấp) × (1 − R_choáng/100)            R_choáng = Σ stuntimereduce_p
nếu rand(100) < p  và  T ≥ 1  →  stun.until = tick_hiện_tại + round(T)
```

### 3.3 Ví dụ tính
**Sư Tử Hống (Thiếu Lâm, gốc) cấp 10:** `stun_p = {{{1,15},{20,65}}, {{1,5},{20,27}}}`
- P1 = 15 + 9×50/19 = **38,7%**
- P2 = 5 + 9×22/19 = **15,4 tick (0,86 s)**

**Đoạn Hồn Thích (Thiên Vương, mod) cấp 20:** `stun_p = {{{1,16},{20,40},{30,60}}, {{1,7},{20,27}}}` → P1 = **40%**, P2 = **27 tick (1,5 s)**; cấp 30 → 60%.

| Tình huống (Sư Tử Hống cấp 10: 38,7%, 15,4 tick) | Xác suất | Thời lượng |
| :--- | :-: | :-: |
| Mục tiêu trần | 38,7% | 15,4 tick |
| Có `anti_do_stun_p` 20 (Đường Môn cấp 39) | **18,7%** | 15,4 tick |
| Giảm choáng 40% | 38,7% | 15,4 × 0,6 = **9,2 tick** |
| `anti_do_stun` 20 + giảm 40% | 18,7% | 9,2 tick |
| Giảm choáng ≥ 100% | — | **0 → không bị choáng** |

### 3.4 Frame dừng và hiển thị 🟡
```
khi stun.until > tick:
   frame_hiển_thị  = giữ nguyên (không += m)   // đứng hình ở tư thế hiện tại
   vị_trí          = giữ nguyên                // khóa di chuyển
   không nhận input: chạy / ra chiêu / uống thuốc
   vẽ chồng trên đầu: sprite choáng (✅ Status50: mag_spe_眩晕.spr, Head, 10 frame lặp)
```
Ngoài `stun_p`, trạng thái khóa hoàn toàn còn có ✅ bộ ba (`spider_web`, P2 = 18 tick mỗi cái): `frozen_action` (đứng im), `forbit_attack` (cấm ra chiêu), `forbit_takemedicine` (cấm uống thuốc).

---

## 4. Sát thương vật lý → co giật (chèn state Hurt ngắt hành động)

### 4.1 Dữ liệu ✅
| Thuộc tính | Vai trò |
| :--- | :--- |
| `DoHurt` (cột `skills.txt`) | xác suất đòn trúng gây co giật, 10–100% |
| `do_hurt_p` (mod) | người đánh: cộng xác suất |
| `anti_do_hurt_p` (mod) | người bị đánh: trừ xác suất |
| `HurtFrame` | thời gian co giật gốc (nhân vật 12, quái 10–15) |
| `fasthitrecover_v` | rút ngắn thời gian co giật (âm = kéo dài) |
| `anti_hitrecover` (mod) | cộng thêm thời gian co giật cho địch; ghi chú mod: **"mỗi cấp +0,5 frame, trần 25"** |

⚠ Đơn vị `fasthitrecover_v` chưa chắc chắn (xem tài liệu chính, mục 5.3). Ví dụ dưới coi là **%**.

### 4.2 Công thức 🟡
```
xác_suất   p = clamp( DoHurt(chiêu) + do_hurt_p(đánh) − anti_do_hurt_p(bị đánh), 0, 100 )
thời_gian  T = HurtFrame × max(0, 1 − R_hồi_phục/100)  +  min(anti_hitrecover, 50) / 2
nếu rand(100) < p →  vào state Hurt trong round(T) tick
```

### 4.3 Ví dụ tính (HurtFrame = 12)
| Mục tiêu | R_hồi_phục | Công thức | Co giật |
| :--- | :-: | :--- | :-: |
| Không giáp | 0% | 12 × 1 | **12 tick (0,67 s)** |
| Áo 40% | 40% | 12 × 0,6 | **7,2 → 7 tick** |
| Áo 40% + đồ 20% | 60% | 12 × 0,4 | **4,8 → 5 tick** |
| Hồi phục 100% | 100% | 12 × 0 | **0 (miễn)** |
| Đối thủ Thiên Vương Chiến Ý cấp 50 (`anti_hitrecover` = 50 → +25), mục tiêu áo 40% | 40% | 7,2 + 25 | **32 tick (1,8 s)** |

### 4.4 Diễn biến chèn state (ngắt chiêu / ngắt di chuyển) 🟡
Người A đánh mỗi 12 tick (AttackSpeed 12). Người B đang chạy rồi tung chiêu 18 tick.

| Tick | Sự kiện B |
| :-: | :--- |
| 0 | B đang **chạy** (frame 6/14). A trúng đòn, `DoHurt` thành công |
| 0 → 12 | B chuyển sang **Wound**, hủy chạy; sprite `FreeWound/MeleeWWound/...` chạy 12 frame |
| 12 | A trúng đòn kế tiếp, B vừa hết hurt → **vào hurt lần nữa** (hurt-lock) |

Với áo 40% (hurt 7 tick): B có **cửa sổ 5 tick** (12 − 7) giữa hai đòn để di chuyển hoặc ra chiêu. Khi B đang **tung chiêu** (ví dụ tick 3/18) mà bị hurt: chiêu **bị ngắt, hủy**, B phải tung lại từ đầu.

**Quy tắc ưu tiên đề xuất:**
1. Choáng đang chạy → không vào Hurt mới (đã bất động).
2. Hurt đang chạy + đòn mới trúng → **làm mới** bộ đếm (không cộng dồn).
3. Chậm chỉ đổi tốc độ phát frame của Hurt (Hurt 12 tick → 24 tick nếu m = 0,5).

---

## 5. Độc sát → hút máu liên tục

### 5.1 Dữ liệu ✅
`poisondamage_v` = `{{P1},{P2=60},{P3=10}}` hầu hết chiêu; nhãn hiển thị "Độc sát: P1 điểm/lần".

🟡 Cách đọc: **P1 = sát thương mỗi nhịp**, **P2 = tổng thời gian (tick)**, **P3 = chu kỳ nhịp (tick)** → số nhịp = P2 / P3 = 6; tổng = 6 × P1.

### 5.2 Công thức 🟡
```
tổng_thời_gian  D = P2 × (1 − R_độc_thời_gian/100)        R = Σ poisontimereduce_p
số_nhịp         N = floor(D / P3)
mỗi_nhịp        d = max(0, P1 × (1 − R_kháng_độc/100) − poisondamagereduce_v)
tổng_mất_máu    = N × d
```

### 5.3 Ví dụ tính
**Độc Sa Chưởng cấp 10** (`poisondamage_v = {{{1,2},{20,26}},{{1,60},{20,60}},{{1,10},{20,10}}}`): P1 = 2 + 9×24/19 = **13,4/nhịp**; D = 60; N = 6; tổng = **80**.

| Mục tiêu | Tính | Kết quả |
| :--- | :--- | :-: |
| Trần | 6 nhịp × 13,4 | **80,2** |
| Giảm thời gian độc 40% | D = 36 → N = floor(3,6) = 3 → 3 × 13,4 | **40,1** |
| Giảm 40% + `poisondamagereduce_v` 5 | 3 × (13,4 − 5) | **25,2** |
| Kháng độc 30% (`poisonres_p`) | 6 × 13,4 × 0,7 | **56,2** |
| Giảm thời gian ≥ 100% | N = 0 | **0** |

**Làm độc dài thêm** ✅: Vạn Cổ Thực Tâm đặt `poisontimereduce_p` **âm** (−105 → −300). Nếu công thức tuyến tính: hệ số = 1 − (−300)/100 = **4** → D = 240 tick, **24 nhịp**, sát thương độc gấp 4 lần.

**Hiển thị** ✅ Status2 "Trúng độc": Foot, 8 frame lặp.

---

## 6. Hỏa sát

✅ `firedamage_v` chỉ có P1 (min) và P3 (max), không tham số thời gian. **Không có hiệu ứng riêng** trong dữ liệu (khung "bỏng" Status4 và `burntimereduce_p` không được dùng).

Ví dụ: Cái Bang `firedamage_v = [1]{{1,70},{20,360}}, [3]{{1,70},{20,420}}` cấp 10: min = 70 + 9×290/19 ≈ 207, max ≈ 70 + 9×350/19 ≈ 236. Sát thương nhận = `rand(207,236) × (1 − FireRes/100)`. Hỏa bị Thủy khắc nhờ `me2firedamage_p` (+tối đa 20%) và `fire2medamage_p` (−tối đa 20%) ✅ trong Nga My/Thúy Yên/Hoa Sơn.

---

## 7. Màu sắc nhân vật khi dính hiệu ứng

### 7.1 Dữ liệu hiện có
- ✅ Engine **có** hàm vẽ sprite tô màu: `KSprite::DrawWithColor`, `DrawMixColor`, `KCanvas::DrawSpriteWithColor`, `DrawSpriteMixColor`, `DrawSpriteAlpha`.
- ✅ `game.exe` nạp bảng `\settings\AdjustColor.txt` (cột `ALPHA, RED, GREEN, BLUE`, 15 dòng).
- ✅ `npcs.txt` có `RedLum/GreenLum/BlueLum` (độ sáng phát quang) nhưng cả 2 024 quái đều để trống.
- ❓ **Không có bảng nào gắn màu với trạng thái** (choáng, độc, chậm). Trong game gốc, hiệu ứng thể hiện bằng **sprite phủ lên người** (Status1–5, 50…), không phải đổi màu cả nhân vật. Phần 7.2–7.3 là **đề xuất 🎨**.

**Bảng màu có sẵn trong `AdjustColor.txt`** (RGB, alpha = 255 hết): 1 = (50,128,200) xanh dương · **2 = (250,255,0) vàng** · 3 = (50,0,218) tím xanh · 4 = (0,254,200) xanh ngọc · 5 = (50,30,40) · **6 = (50,128,0) xanh lá** · 7 = (0,128,200) · 8 = (50,208,200) · 9 = (56,128,200) · 10 = (50,28,20) · 11 = (50,127,136) · 12 = (150,128,200) · 13 = (50,128,230) · 14 = (254,145,250) hồng · 15 = (50,125,210). Chưa rõ engine dùng bảng này vào việc gì.

### 7.2 Đề xuất màu theo trạng thái 🎨
| Trạng thái | Màu tô (R,G,B) | Cường độ α | Hiệu ứng nhấp nháy |
| :--- | :--- | :-: | :--- |
| Chậm (băng) | (90, 160, 255) xanh dương | 0,35 | không (ổn định) |
| Choáng (lôi) | (255, 240, 60) vàng | 0,30 | nhấp nháy 6 tick |
| Trúng độc | (80, 200, 80) xanh lá | 0,35 | thở chậm 18 tick |
| Co giật (hurt) | (255, 255, 255) trắng | 0,60 | chớp **2 tick** đầu hurt |
| Hỏa (nếu thêm) | (255, 120, 40) cam | 0,30 | — |

### 7.3 Công thức pha màu
Tô theo từng pixel của sprite (giữ nguyên alpha gốc của sprite):
```
c'  = c × (1 − a) + tint × a                      // pha trộn (lerp)
c'' = c × (1 + a × (tint/255 − 1))                // nhân màu (multiply), tối hơn, hợp với băng
a(t) = a0                                         // ổn định
a(t) = a0 × (0.6 + 0.4 × sin(2π × t / chu_kỳ))    // thở/nhấp nháy
```
Khi nhiều trạng thái cùng lúc: ưu tiên màu **Choáng > Độc > Chậm**; hoặc lấy trung bình có trọng số theo `a`. Sprite trạng thái (Status50 trên đầu, Status2 dưới chân) vẫn vẽ chồng độc lập với màu tô.

**Ví dụ**: pixel áo (200, 60, 60), bị độc, a = 0,35, tint = (80,200,80):
- R = 200×0,65 + 80×0,35 = **158**
- G = 60×0,65 + 200×0,35 = **109**
- B = 60×0,65 + 80×0,35 = **67** → áo ngả sang xanh lá nâu.

Trong canvas/Phaser: `sprite.setTint(0x50c850)` (nhân màu) hoặc dùng `setTintFill` + alpha để lerp.

---

## 8. Công thức hóa giải

### 8.1 Các nguồn hóa giải ✅
| Hiệu ứng | Giảm **thời gian** | Giảm **xác suất** | Giảm **sát thương** |
| :--- | :--- | :--- | :--- |
| Chậm | `freezetimereduce_p` (ID 106) | — | `coldres_p`, `coldarmor_v` |
| Choáng | `stuntimereduce_p` (ID 110) | `anti_do_stun_p` (mod) | `lightingres_p` |
| Co giật | `fasthitrecover_v` (ID 113) | `anti_do_hurt_p` (mod) | `physicsres_p` |
| Độc | `poisontimereduce_p` (ID 108) | — | `poisonres_p`, `poisondamagereduce_v` (ID 109), `poisonarmor_v` |
| Tất cả | `statusimmunity_b`, `ignorenegativestate_p`, `badstatustimereduce_v`, skill miễn dịch 293/294/295 | | |

### 8.2 Công thức tổng hợp 🟡
```
R_hiệu_ứng  = Σ (trang bị) + Σ (buff kỹ năng còn hiệu lực)       // đại số, có thể âm
hệ_số_thời_gian = max(0, 1 − R / 100)                            // R ≥ 100 → miễn nhiễm
T_cuối      = T_gốc × hệ_số_thời_gian
p_cuối      = clamp(p_gốc + do_x(đánh) − anti_do_x(bị đánh), 0, 100)
sát_thương_cuối = sát_thương × (1 − Kháng% / 100), trần Kháng theo *ResistMax (75–95)
```

### 8.3 Nguồn dữ liệu của R ✅
| Nguồn | Giá trị |
| :--- | :--- |
| Trang bị thường (cấp 3–10) | 20 / 30 / 40% mỗi dòng (hồi phục chỉ có ở áo) |
| Hoàng Kim, bậc 1–4 | −10~10 · 25~40 · 35~50 · 60~80% |
| Hoàng Kim, bậc "20 cấp" | 10 → 180% |
| Dòng cố định theo bộ | 80, 85, 88, 90, 95, 100% (Vũ Liệt, Long Tương, Đằng Long Cố Sơn 85–95) |
| Buff kỹ năng | Thanh Âm Phạm Xướng, Ba La Tâm Kinh… (45–120 s) |
| Miễn dịch NPC | `mianyi.lua`: freeze 2000, stun 2000, poison 3000 |

### 8.4 Ví dụ trọn vẹn: ba mục tiêu trúng cùng một chiêu
Chiêu: **Sư Tử Hống cấp 10** (choáng 38,7%, 15,4 tick) + **Độc Sa Chưởng cấp 10** (6 nhịp × 13,4).

| Mục tiêu | Thiết bị | Choáng | Độc |
| :--- | :--- | :--- | :--- |
| **A – lính trần** | không | p = 38,7% · T = 15,4 tick | 6 nhịp × 13,4 = **80** |
| **B – PK đủ đồ** | choáng 40%, độc 40%, `anti_do_stun` 20 | p = **18,7%** · T = **9,2 tick** | D = 36 → 3 nhịp × 13,4 = **40** |
| **C – đã đủ miễn dịch** | choáng 110%, độc 110% | T = 0 → **không choáng** | D = 0 → **không độc** |

### 8.5 Khi hóa giải bị phá (âm)
Mọi `…timereduce_p` có thể **âm** ✅. Ví dụ B dính thêm Vạn Cổ Thực Tâm −300 vào độc: R_độc = 40 − 300 = **−260** → hệ số = 1 + 2,6 = **3,6** → D = 216 tick, 21 nhịp × 13,4 = **281** (gấp 3,5 lần không bị nguyền). Đây là cách các chiêu "nguyền" vô hiệu hóa đồ giảm hiệu ứng.

### 8.6 Xóa hiệu ứng sẵn có
- Miễn dịch tức thời (skill 293 "Trạng thái miễn dịch", 294 băng, 295 độc): đặt R rất lớn trong thời gian buff.
- `ignorenegativestate_p` (Xuất Úy Bất Nhiễm, Võ Đang): xác suất bỏ qua mọi trạng thái xấu 🟡.
- Khi R vượt 100 **trong lúc đang trúng hiệu ứng**: đề xuất rút ngắn `until` ngay (`until = now + remaining × hệ_số_mới`).

---

## 9. Mẫu cài đặt (TypeScript, phù hợp kiến trúc `jx-system-online`)
```ts
interface Resist { slow:number; stun:number; poison:number; hurt:number; doStun:number; doHurt:number }

const f = (R:number) => Math.max(0, 1 - R/100);             // hệ số thời gian
const lerp = (L:number, pts:[number,number][]) => {          // nội suy cấp
  for (let i=0;i<pts.length-1;i++){ const [l1,v1]=pts[i],[l2,v2]=pts[i+1];
    if (L<=l2) return v1 + (L-l1)*(v2-v1)/(l2-l1); } return pts[pts.length-1][1]; };

function applyStun(t:Actor, p1:number, p2:number, atk:Resist, now:number){
  const p = Math.min(100, Math.max(0, p1 + atk.doStun - t.resist.doStun));
  const T = Math.round(p2 * f(t.resist.stun));
  if (T >= 1 && Math.random()*100 < p) t.status.stun = Math.max(t.status.stun ?? 0, now + T);
}

function applyPoison(t:Actor, p1:number, p2:number, p3:number, now:number){
  const D = p2 * f(t.resist.poison);
  const n = Math.floor(D / p3);
  const per = Math.max(0, p1 * (1 - t.poisonRes/100) - t.poisonDmgReduce);
  if (n > 0) t.status.poison = { until: now + D, every: p3, per };
}

function animSpeed(a:Actor, now:number){                      // m: tốc độ phát frame
  if (a.status.stun && a.status.stun > now) return 0;          // dừng hẳn
  if (a.status.slow && a.status.slow > now) return 0.5;        // chậm
  return 1;
}
// mỗi tick: a.frameF += animSpeed(a, now); frame = floor(a.frameF)
```

---

## 10. Bảng tra nhanh
| Cần | Công thức |
| :--- | :--- |
| Nội suy giá trị theo cấp | V = V1 + (L−L1)×(V2−V1)/(L2−L1) |
| Thời lượng sau hóa giải | T = T_gốc × max(0, 1 − ΣR/100) |
| Xác suất sau hóa giải | p = clamp(p_gốc + do − anti, 0, 100) |
| Độc | N = floor(P2×hệ số / P3); mỗi nhịp = P1×(1−Kháng) − giảm_điểm |
| Co giật | T = HurtFrame × hệ số + min(anti_hitrecover,50)/2 |
| Chậm | frame += m (0,5) mỗi tick; state đếm tick thật |
| Choáng | frame giữ nguyên, khóa input, đếm P2 tick |
| Pha màu | c' = c×(1−a) + tint×a |

**Việc cần đo/chốt thêm** (không có trong dữ liệu client): mức giảm tốc (m), mặc định thời gian chậm khi `colddamage_v` không đặt P2, đơn vị `fasthitrecover_v`, thứ tự cộng/nhân `anti_hitrecover`, và việc kẹp R tại 100%.
