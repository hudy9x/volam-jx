# Bóng đổ trong JX1 (nhân vật, NPC, quái, vật thể bản đồ)

> Ghi 2026-11-12 từ mã engine `jx1-vs2022-main` (đã xóa) (chỉ đọc lấy cơ chế) và dữ liệu client `../jx-origin/data_extract`.
> Mỗi mục ghi rõ **đã xác minh** (đọc code / giải mã file) hay **suy luận**. Chưa có gì trong số này được đưa vào game của mình;
> xem mục 5 để biết hiện trạng và việc cần làm.

## 1. Tóm tắt

| Đối tượng | Bản gốc làm thế nào | Dữ liệu trong client SHXT |
|---|---|---|
| Nhân vật (nam / nữ) | **File SPR bóng riêng** cho từng động tác, một bộ chung cho mọi trang bị, kể cả cưỡi ngựa | `spr/npcres/man/MA_YY_999_*.spr`, `spr/npcres/woman/FM_YY_999_*.spr` — có trong `spr.pak`, tên chưa khôi phục |
| Quái / NPC thường | File SPR bóng riêng, tên = tên sprite thân + `b` | `…/enemy003/enemy003_stb.spr` v.v. — có trong `spr.pak`, tên chưa khôi phục; không phải quái nào cũng có |
| Cây, đá, nhà (vật thể bản đồ) | **Không có cơ chế bóng**; bóng được họa sĩ vẽ sẵn trong hình vật thể | đã hiển thị trong game mình vì `gen:maps` cắt nguyên hình |
| Hiệu ứng kỹ năng, đạn | Không có bóng (`KMissleRes` có "shadow" nhưng là vệt tàn ảnh, không phải bóng đổ) | — |

Bóng nhân vật / quái **không phải hình elip**: là silhouette của thân bị ép dẹt và xô nghiêng (như nắng xiên), đổi theo 8 hướng
và theo từng khung động tác. Hướng đổ: sang phải và xuống dưới, cùng hướng với bóng cây cối vẽ sẵn trong vật thể bản đồ.

## 2. Cơ chế trong engine (đã xác minh)

Nguồn: `SwordOnline/Sources/Core/Src/KNpcRes.cpp`, `KNpcResNode.cpp`, `KNpcResNode.h`, `CoreUseNameDef.h`.

- Mỗi `KNpcRes` có một sprite bóng `m_cNpcShadow` (lớp `KNpcSprControl` như các bộ phận thân). Thông tin lấy từ
  `KNpcResNode::m_cShadowInfo` (`CShadowFileName`): mỗi **động tác** một bản ghi `{tên file, số khung, số hướng, interval, tâm X/Y}`.
- Khi đổi động tác (`SetAction` …), engine nạp lại file bóng của động tác đó; không có thì `Release()` (không vẽ bóng).
- Khi vẽ (`KNpcRes::Draw`): bóng được đưa vào danh sách vẽ **ở vị trí đầu tiên** (dưới mọi bộ phận và dưới cả hiệu ứng trạng thái
  dưới chân), tại tọa độ chân `(m_nXpos, m_nYpos)` với Z = 0. Khung bóng chọn theo cùng hướng (64 hướng → `nTotalDir` hướng) và
  cùng tiến độ khung với thân:

  ```
  nCurDirNo   = (nDir + 32/nGetDir) / (64/nGetDir)            // 64 hướng gốc → 8 hướng của file
  nCurFrameNo = nCurDirNo * (nGetFrame/nGetDir) + (nGetFrame/nGetDir) * nCurFrame / nAllFrame
  ```

  Bóng bị bỏ khi `IgnoreShowRes()` (ẩn thân) hoặc `bPaintBody == FALSE`.
- Tâm bóng dùng `SPR_X_OFF` / `SPR_Y_OFF` như thân (file bóng cùng canvas 320×320, `center = (0,0)` như thân).

### 2.1 Nhân vật: bảng ánh xạ

- Bảng: `\settings\npcres\主角动作阴影对应表.txt` (`PLAYER_RES_SHADOW_FILE`), trong client SHXT nằm ở
  `data_extract/update01/settings/npcres/` (có cả bản `npcres_simple/`). 3 dòng: tiêu đề, `MainMan`, `MainLady`.
- Cột: từng động tác + cột `<động tác>info` = `khung,hướng,interval` (mặc định `16,8,1`). Ví dụ `MainMan`:
  `FreeStand1 = MA_YY_999_ST01.spr 120,8,1`, `FreeRun = MA_YY_999_RN01.spr 88,8,1`, `RideStand = MA_YY_999_RD01.spr 112,8,1`,
  `RideRun = MA_YY_999_HR01.spr 80,8,1`. Nữ: tiền tố `FM_`, số khung khác (vd. `ST01` 80 khung).
- Đường dẫn = `ResFilePath` của loại nhân vật trong `人物类型.txt` (`spr\npcres\man`, `spr\npcres\woman`) + tên file.
- `999` = thân chuẩn: **một bộ bóng cho mọi trang bị** (không ghép theo đầu / giáp / vũ khí). Khi cưỡi ngựa dùng bộ bóng
  người + ngựa (`RD`, `HW`, `HR`, `HA`, `HM`, `HI`, `HD`).

### 2.2 Quái / NPC thường: suy ra từ tên

- Không có bảng. `KNpcResNode::GetShadowName`: lấy tên sprite thân của động tác, bỏ `.spr`, thêm `b.spr`
  (`enemy003_st.spr` → `enemy003_stb.spr`; `enemy003_pst.spr` → `enemy003_pstb.spr`). Số khung / hướng / interval **dùng lại của thân**
  (cột tương ứng trong `普通npc资源信息.txt`).
- `NPC_RES_SHADOW_FILE` (`普通npc动作阴影对应表.txt`) được định nghĩa nhưng không dùng; file đó không có trong client.

### 2.3 Không phải bóng nhân vật

- `RU_T_SHADOW` / `KRUShadow` trong Represent chỉ là **hình chữ nhật mờ**: chấm trên minimap (`ScenePlaceMapC.cpp` "FootSpot"),
  thanh máu trên đầu (`KNpc.cpp`), khung mưa / thời tiết (`KWeather.cpp`). Đừng nhầm.
- Vật thể bản đồ `KBuildinObj` (`Scene/SceneDataDef.h`): chỉ có tên hình, 4 góc, kích thước, số khung, tốc độ hoạt ảnh, thứ tự vẽ.
  Không có trường bóng; `KScenePlaceRegionC.cpp` không vẽ bóng cho chúng.

## 3. Dữ liệu trong client SHXT (đã xác minh)

- Các file bóng **có trong `spr.pak`** nhưng tool giải nén chưa khôi phục được tên: nằm ở `data_extract/spr/_unnamed/spr/<id>.spr`.
  Đối chiếu bằng hash đường dẫn (`g_FileName2Id`, có sẵn trong `apps/client/tools/jx/hashindex.ts` → `jxHash`, `resolveAny`):
  21/21 ứng viên thử (`MA/FM_YY_999_{ST01,ST02,WK01,RN01,AT01,DE01}`, `enemy003–005_{st,pst,at}b`) đều trúng. Ví dụ
  `\spr\npcres\man\MA_YY_999_ST01.spr` = `1cbe2b38`, `\spr\npcres\enemy\enemy003\enemy003_stb.spr` = `709ac0f5`.
- Vì `resolveAny()` tra theo hash nên tool `gen:*` đọc được ngay, **không cần giải nén lại PAK**.
- Độ phủ (sprite thân trong `spr/npcres/<thư mục>` có file `…b.spr` đi kèm, tính bằng hash trên toàn bộ manifest):

  | Thư mục | Có bóng / tổng |
  |---|---|
  | enemy | 679 / 985 |
  | animal | 259 / 294 |
  | passerby | 212 / 605 |
  | boss | 110 / 812 |
  | event | 7 / 30 |
  | building, critter, style | 0 |
  | man, woman | 0 (đúng: nhân vật dùng bộ `*_YY_999_*`, không theo bộ phận) |

  Quái không có file bóng thì bản gốc cũng không vẽ bóng.
- Hình dạng (giải mã bằng `decodeSpr` trong `tools/jx/spr.ts`):

  | File | Canvas | Khung / hướng | Khung đầu | Màu | Alpha chính |
  |---|---|---|---|---|---|
  | `MA_YY_999_ST01` (nam đứng) | 320×320, center (0,0) | 120 / 8 | 44×20 tại (152,176) | xám (35,35,35) | 128 (≈50 %) |
  | `MA_YY_999_RN01` (nam chạy) | 320×320 | 88 / 8 | 38×30 | (35,35,35) | 128 |
  | `FM_YY_999_ST01` (nữ đứng) | 320×320 | 80 / 8 | — | (35,35,35) | 128 |
  | `enemy003_stb` | 320×320 | 48 / 8, interval 200 | 46×66 tại (151,130) | đen (0,0,0) | 64 |
  | `enemy004_stb` | 320×320 | 120 / 8, interval 100 | 44×20 tại (156,175) | đen | 112 |

  Bóng nằm ngay dưới chân (thân `enemy003_st` khung đầu 36×73 tại (142,125)). `enemy003_stb` cao 66 px vì quái đó là người
  đứng nghiêng, bóng đổ dài.
- Vật thể bản đồ: `resource.pak` → `游戏资源\美术图素\…\树木\柳树1.spr` (liễu Giang Nam) có sẵn vùng bóng mờ trong khung hình;
  tên file `野外\无阴影山石.spr` ("đá núi không bóng") cho thấy bóng mặc định nằm trong hình (**suy luận từ tên**).

## 4. Cách kiểm tra lại nhanh

Script `tsx` (ES module, chạy từ `apps/client` để có `sharp`), ý chính:

```ts
import { decodeSpr } from './tools/jx/spr.ts';
import { resolveAny } from './tools/jx/hashindex.ts';
const p = resolveAny('\\spr\\npcres\\man\\MA_YY_999_ST01.spr');   // → data_extract/spr/_unnamed/spr/1cbe2b38.spr
const spr = decodeSpr(fs.readFileSync(p!));                       // spr.frames[i].rgba, spr.directions = 8
```

Đếm độ phủ: với mỗi dòng `\spr\npcres\…\x.spr` trong `*/_manifest.tsv` (cột `overridden_by` rỗng), tính `jxHash` của `x` + `b.spr`
và tra trong tập id của manifest.

## 5. Hiện trạng game mình

**Đã làm 2026-11-12 (HU3–HU6):** `gen:assets` xuất bóng người theo bảng (78 động tác, nam + nữ, cả cưỡi ngựa) và bóng quái / NPC
`<thân>b` (286 / 315 sheet thân có bóng); `art/jx` có `JX_SHADOWS`, `NPC_SHADOWS`, `Pose.shadow`; `game/actors/PaperDoll.ts` vẽ bóng
ở lớp dưới cùng (dưới hiệu ứng dưới chân), cùng hướng / tiến độ khung với thân; bỏ elip tạm. Cột động tác của bảng bóng đi theo vị trí
(tiêu đề bảng ghi lặp `MeleeWDie` ở chỗ `RangeWDie`). Khi nhảy (Khinh công) bóng ở yên dưới đất, thân nâng lên. Dung lượng thêm 5,6 MB.

Cách làm (ghi lại từ đề xuất ban đầu; 3 nền tảng như nhau, chỉ thêm một lệnh vẽ mỗi actor):

1. `gen:assets`: nhân vật — đọc `主角动作阴影对应表.txt` (bản `update01`), với mỗi động tác đang dùng xuất sheet WebP bóng cho
   `man` / `woman` (độc lập trang bị, nên mỗi giới chỉ khoảng 50 sheet). Quái / NPC — với mỗi sprite thân đã xuất, thử
   `resolveAny(tên + 'b.spr')`, có thì xuất thêm sheet bóng cùng bố cục khung. Ghi vào `data.gen.ts` cờ "có bóng".
2. `ActorView`: thêm một sprite bóng ở lớp dưới cùng (depth thấp hơn thân, trên nền và vật thể bám đất), cùng chỉ số hướng và
   khung với thân, vị trí = chân. Không có sheet bóng thì bỏ elip tạm (bản gốc cũng không vẽ).
3. Hiệu ứng trạng thái dưới chân (vòng hào quang…) vẽ **trên** bóng, như thứ tự của engine.
4. Dung lượng nhỏ (ảnh một màu, nén lossless tốt); cần tính lại `char/` sau khi sinh.
