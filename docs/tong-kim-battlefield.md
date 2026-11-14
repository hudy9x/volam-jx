# Chiến trường Tống Kim — đối chiếu VLTK-SHXT

> Cập nhật **2026-11-14**. Trạng thái: **đã có phương án gameplay cụ thể để USER duyệt; chưa triển khai gameplay**.
> **USER:** cơ chế phải giống VLTK-SHXT; ngoại lệ về lịch là có thể cấu hình mở bất kỳ lúc nào. Mỗi thời điểm chỉ có **1 chiến trường sơ, 1 trung, 1 cao** trên toàn server. **Chỉ tập trung cao cấp trước**; sơ/trung dùng cùng cơ chế, bộ lọc cấp triển khai sau. **Bắt buộc có điểm báo danh và sảnh chờ**.
>
> **Cập nhật chỉ đạo USER:** phần không có dữ liệu đối chiếu được phép tự thiết kế để hoàn thiện gameplay, rồi trình duyệt. Xem **[phương án gameplay cao cấp](tong-kim-gameplay-proposal.md)**: Bảo vệ Nguyên Soái, PK, năm danh hiệu, 27 món chiến đấu và soái sáu nhóm chiêu. Đây là đề xuất CHỌN, chưa phải phê duyệt viết code. Những chỗ “cần xác minh” bên dưới mô tả giới hạn tái hiện SHXT, không còn là lý do để bỏ trống phương án chơi.
>
> Tài liệu này thay thế thiết kế vay từ volamidle. Bản cũ giữ tại [research/tong-kim-volamidle-legacy.md](research/tong-kim-volamidle-legacy.md) để truy nguồn, không dùng các số liệu ở đó làm mặc định SHXT.

## 1. Phạm vi và mức độ xác minh

1. Dùng dữ liệu thắng ưu tiên PAK trong `Client_VLTK_SHXT/data_extract/`, không suy ra cơ chế server chỉ từ mô tả item.
2. Tách điểm báo danh / sảnh chờ an toàn với Hậu doanh / Đại doanh / vùng giao chiến.
3. Một trận dùng chung toàn server cho mỗi tầng; không tạo trận theo người mở, tổ đội hay số người online.
4. Dữ liệu đã xác minh giữ theo SHXT; phần thiếu nguồn dùng phương án **CHỌN** riêng và trình USER duyệt trước triển khai, không gắn nhãn luật gốc.

Nhãn sử dụng trong tài liệu:

| Nhãn | Ý nghĩa |
|---|---|
| **USER** | Yêu cầu người dùng đã chốt |
| **PAK** | Đã đọc bản thắng ưu tiên trong PAK, có đường dẫn game và file vật lý ở phụ lục nguồn |
| **WEB tham chiếu** | Nguồn chính thức nhưng khác năm/nhánh vận hành; không tự coi là luật của bộ client này |
| **ĐỀ XUẤT** | Cách triển khai cho project, chưa phải bằng chứng engine gốc |
| **CHƯA XÁC MINH** | Thiếu script điều phối server hoặc chưa đủ liên kết dữ liệu; chưa được gán số mặc định |

GitNexus của `Client_VLTK_SHXT` có tìm thấy file `songjin.lua` nhưng truy vấn không có execution flow. Đối chiếu tiếp bằng nội dung PAK và fallback hash. Không dựa vào chỉ mục đó để khẳng định đã tìm đủ script server.

## 2. Nguồn và thứ tự ưu tiên

Client được USER chỉ định: `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`.

| Nguồn game trong PAK | Nội dung đã kiểm tra |
|---|---|
| `settings/maplist.ini` | Tên/ID bản đồ, tầng, MapInfo, cờ vào bản đồ |
| `script/item/battles/rescript.lua` | Tống Kim Chiêu Thư: phân cấp, chọn điểm Tống/Kim, tọa độ đến |
| `script/missions/battle/protocol_c.lua` | Bốn trạng thái trận, số người tham gia và số đang đợi theo phe |
| `settings/battles/maps/plain/mapinfo.txt` + các bảng tọa độ | Hậu doanh, Đại doanh, cổng, NPC, soái, cờ |
| `settings/item/004/magicscript.txt` | Định danh item, icon, script, giới hạn chồng |
| `script/item/battles/*.lua` | Skill ID/cấp trạng thái, thời gian item, triệu hồi lính |
| `settings/skills.txt` + `script/skill/battles/*.lua` | Thuộc tính và công thức trạng thái chiến trường |
| `settings/npcs.txt` | Có nhiều thế hệ dòng lính/soái; phải liên kết đúng bảng sinh trước khi chọn |

**Không dùng bảng loose thay PAK khi PAK đã có.** Ví dụ item `ParticularType=155` trong PAK là **Tống Kim Chiêu Thư**; bảng loose đổi tên thành Phong Vân Chiêu Thư. Đây là khác biệt thật, không chỉ khác mã hóa.

Chi tiết có thể tái đối chiếu: [nguồn PAK và kết quả trích](research/tong-kim-shxt-sources.md).

Nguồn web chính thức chỉ dùng đối chiếu bổ sung:

- [Điều chỉnh VLTK Thu Phí ngày 20-08-2009](https://volam.vnggames.com/tin-tuc/tin-tinh-nang/dieu-chinh-tinh-nang-trong-vo-lam-truyen-ky-thu-phi-1.html): chứng minh giá shop và thưởng đã thay đổi theo phiên bản; có Ngoại Độc Hoàn và NPC dịch chuyển ở hậu doanh. Không lấy cả bảng thưởng 2009 làm mặc định SHXT.
- [Cẩm nang Tống Kim của Võ Lâm Miễn Phí](https://volammienphi.vnggames.com/cam-nang/chinh-phuc-vo-lam/chien-truong-tong-kim.html): đối chiếu sự tồn tại của nhóm Chiến Hồn/Hộ Giáp/Lợi Nhận và đồ hỗ trợ chiến trường. Nhánh Miễn Phí không quyết định chỉ số của project.
- [Điều chỉnh Tống Kim, Võ Lâm Miễn Phí](https://volammienphi.vnggames.com/cam-nang/tinh-nang/tinh-nang-dieu-chinh.html): trong Bảo vệ Nguyên Soái, tình trạng soái có ưu tiên khi xét thắng; nếu tình trạng hai bên giống nhau mới xét điểm. Chưa xác nhận đầy đủ quy tắc này thuộc đúng profile bộ client đang nghiên cứu.

## 3. Phân tầng và bản đồ — sửa sai của thiết kế cũ

### 3.1. Bộ lọc cấp

**PAK `rescript.lua`, `ToSong` / `ToJin`:**

| Tầng | Cấp trong script | Map báo danh | Phạm vi triển khai |
|---|---|---|---|
| Sơ | 40–59 | 323 | Để sau |
| Trung | 60–89 | 324 | Để sau |
| Cao | Từ 90 | **325** | Làm trước |

Không giữ các mốc 40–79 / 80–119 / 120–200 lấy từ thiết kế cũ. Script không nêu trần cấp cao; giới hạn cấp toàn project là chuyện khác, không diễn giải thành điều kiện gốc.

### 3.2. Bản đồ chiến đấu không phải bộ lọc cấp

**PAK `maplist.ini`:** cùng một địa hình có nhiều ID theo tầng.

| Địa hình | Sơ | Trung | Cao | MapInfo |
|---|---|---|---|---|
| Bình nguyên | 326 | 327 | **328** | `battles/maps/plain/mapinfo.txt` |
| Hà Tân | 329 | 330 | 331 | `battles/maps/river/mapinfo.txt` |
| Thành trấn | 344 | 345 | 346 | `battles/maps/town/mapinfo.txt` |
| Sơn cốc | 347 | 348 | 349 | `battles/maps/valley/mapinfo.txt` |
| Thâm lâm | 350 | 351 | 352 | `battles/maps/forest/mapinfo.txt` |
| Doanh trại | 353 | 354 | 355 | `battles/maps/barrack/mapinfo.txt` |
| Giới Kiều | **384** | **385** | **386** | `battles/maps/bridge/mapinfo.txt` |

ID 44 cũng là Chiến trường Tống Kim, nhưng không có `_MapInfo` tại dòng khai báo này; không tự coi ID 44 là cao cấp SHXT chỉ vì hình cổ điển. ID 384 được ghi rõ **sơ cấp**, không phải trung cấp như thiết kế cũ.

**ĐỀ XUẤT cho lượt triển khai đầu:** báo danh **325**, chiến đấu trên **328 Bình nguyên cao cấp** vì có bộ MapInfo và bảng tọa độ PAK đối chiếu được. Đây là chọn địa hình khởi đầu cho cao cấp, chưa phải yêu cầu USER chỉ được dùng Bình nguyên. Các địa hình khác là cấu hình của cùng chiến trường cao cấp, không tạo thêm trận đồng thời.

Tool `gen-maps.ts` hiện khử trùng theo đường dẫn `.wor`, giữ ID nhỏ nhất: nếu yêu cầu 325/328, chúng có thể bị loại vì chung hình với 323/326. Khi triển khai phải hỗ trợ **ID bản đồ logic riêng, tài nguyên hình dùng chung**; không chỉ chạy lệnh gen rồi mặc nhiên coi đã có 325/328. Chưa chạy generator trong lượt nghiên cứu này.

## 4. Điểm báo danh, sảnh chờ, Hậu doanh và Đại doanh

### 4.1. Luồng bắt buộc

```text
Thế giới thường
  │ đến điểm báo danh (hoặc dùng Tống Kim Chiêu Thư)
  v
Map325 · Điểm báo danh cao cấp
  ├─ Khu Tống: tọa độ đến (1541,3178) theo NewWorld
  └─ Khu Kim : tọa độ đến (1570,3085) theo NewWorld
       │ gặp NPC báo danh, kiểm tra điều kiện và tư cách
       v
  Sảnh chờ / hàng đợi phe đã đăng ký · an toàn
       │ được nhận vào trận, đúng giai đoạn và đúng phe
       v
Map chiến đấu cao cấp · Hậu doanh phe mình
       │ qua cổng / điểm chuyển đúng phe
       v
  Đại doanh → vùng giao chiến → Đại doanh đối phương
       │ chết: theo luật hồi sinh SHXT về Hậu doanh
       └ kết thúc/rời trận: theo luật trả về và nhận thưởng
```

**USER:** phải có cả điểm báo danh và sảnh chờ, không đưa thẳng người chơi từ thành vào vùng giao chiến.

**PAK:** `rescript.lua` đưa đến map 325 và đặt `SetFightState(0)`; `protocol_c.lua` tách số tham gia `nCount1/2` và số đang đợi `nWaiting1/2`. Điều này chứng minh có khái niệm chờ theo phe, nhưng **chưa đủ để xác định một map sảnh chờ thứ hai**.

**ĐỀ XUẤT:** sảnh chờ là khu an toàn và trạng thái hàng đợi rõ ràng ở map 325; chỉ tách map riêng nếu tìm được dữ liệu gốc yêu cầu. Không gọi Hậu doanh là “sảnh chờ” để bỏ qua hàng đợi báo danh. Tọa độ NPC báo danh, ranh giới khu chờ, phí và điều kiện nhận vào trận còn phải xác minh; tọa độ Chiêu Thư ở trên là **điểm đến**, không phải tọa độ NPC.

Tên “Chiêu Mộ Sứ tại Biện Kinh/Phượng Tường” từ thiết kế cũ chưa được xác nhận bằng bố trí NPC PAK. Chưa cố định tên/vị trí này làm luật gốc. Không dùng cửa sổ Xa phu để bỏ qua NPC báo danh.

### 4.2. Bố trí vùng trong map chiến đấu

**PAK `plain/mapinfo.txt`:** có hai vùng `Area_1`, `Area_2`; file tên 2/4 là mã vùng nguồn, không diễn giải trực tiếp thành team 0/1 của project.

| Khóa | Vai trò được ghi trong nguồn |
|---|---|
| `homepos`, `intohome` | Hồi sinh / từ báo danh vào Hậu doanh |
| `hometocenterpos` | Hậu doanh → Đại doanh |
| `centertohomepos` | Đại doanh → Hậu doanh |
| `hometrap`, `centertohometrap`, `centertrap` | Các vùng kích hoạt chuyển/cổng |
| `npcpos1/2` | Điểm sinh NPC trong doanh / ngoài doanh |
| `doctornpc` | Vị trí y thương |
| `depositobj` | Vị trí hòm chứa |
| `generalpos` | Vị trí Nguyên soái khi ở thể thức tương ứng |
| `symbolnpc`, `fixedflagpos`, `randomflagpos*` | Cờ và điểm cờ của các thể thức |

Ví dụ PAK Bình nguyên: `generalpos` Area 1=`1225,2998`, Area 2=`1460,2645`; `doctornpc`=`1158,3160` / `1535,2533`; `depositobj`=`1182,3148` / `1554,2526`.

Bảng tọa độ `后营2.txt` lại có XPOS/YPOS cỡ `36864,101056`: **không cùng biểu diễn với NewWorld/generalpos**. Khi dựng cần chuẩn hóa theo hệ tọa độ từng API (ví dụ 32 đơn vị logic, trục Y isometric /2, trừ gốc `.wor` theo tool), kiểm tra nav và ranh giới cổng. Chưa xác minh đầy đủ phép chuyển của từng khóa nên không chép các cặp số này thẳng vào world hiện tại.

## 5. Vòng đời và lịch mở trận

### 5.1. Các trạng thái gốc đã thấy

**PAK `protocol_c.lua`** có bốn trạng thái:

| Mã | Hiển thị |
|---|---|
| 1 | Đang báo danh |
| 2 | Đang chuẩn bị |
| 3 | Đang tiến hành |
| 4 | Đang kết thúc |

Không bỏ bước chuẩn bị hoặc nhập báo danh với thi đấu thành countdown 5 giây. Ngoài bốn trạng thái này cần trạng thái nội bộ “chưa mở/đã dọn” để quản trị; đó là cách triển khai, không thêm giai đoạn gameplay khác SHXT.

### 5.2. Thời điểm mở và phạm vi tự thiết kế được USER cho phép

- Có thể đặt giờ bất kỳ hoặc yêu cầu mở ngay khi tầng đó rảnh. “Mở ngay” bắt đầu **báo danh**, không nhảy qua báo danh/sảnh chờ.
- Một bộ quản lý phía server giữ tối đa một `matchId` đang hoạt động cho mỗi `tier`; khóa bao trùm báo danh, chuẩn bị, giao chiến, kết thúc và dọn trận.
- Hai yêu cầu mở đồng thời không tạo hai trận. Mở khi đang bận trả về trạng thái trận hiện hành, không reset giờ, quân, điểm hay người tham gia.
- Lịch ba tầng độc lập. Hiện chỉ bật cao cấp; không cần sinh map/sảnh sơ-trung.
- Đồng hồ trận theo server; client chỉ hiển thị. Trận không dừng vì người mở rời đi, phòng rỗng hoặc mất kết nối.
- Thay đổi lịch sau khi đã mở chỉ áp dụng lần sau. Không tự cho phép sửa thời lượng/luật giữa trận.

**CHƯA XÁC MINH từ bộ client:** thời lượng từng giai đoạn, giờ ngừng nhận người mới, mốc xuất hiện soái, giới hạn phe và chênh lệch, thiếu người xử lý ra sao. Các giá trị 5 giây/20 phút/soái phút 10 của bản volamidle đã bị rút khỏi thiết kế áp dụng. Không coi số cũ là luật SHXT. Theo chỉ đạo mới, phương án CHỌN về thời lượng và mốc soái đã được điền ở tài liệu gameplay để USER duyệt.

## 6. Thể thức và luật thắng/thua

“Tống Kim PK chung” trước đây chỉ nói người chơi chung một trận, **không đủ để xác định thể thức SHXT**.

MapInfo có các dữ liệu theo thể thức: soái, cờ cố định, cờ ngẫu nhiên, võ tướng. Không bật tất cả mục tiêu cùng lúc chỉ vì chúng cùng xuất hiện trong file.

| Nội dung | Trạng thái nghiên cứu |
|---|---|
| Phân biệt Cừu sát / Bảo vệ Nguyên Soái / các thể thức cờ | Cần liên kết script điều phối SHXT với MapInfo |
| Nhánh có lính + Nguyên soái đang được tài liệu cũ đề cập | Hướng nghiên cứu Bảo vệ Nguyên Soái; chưa ghi thành USER đã chọn thể thức |
| Nguyên soái là mục tiêu quyết định kết quả hay chỉ cộng 1000 điểm | Không giữ luật “chỉ so tổng điểm” từ volamidle; cần xác minh đúng profile |
| Soái chết có kết thúc ngay, có tái sinh, hai soái cùng chết | Cần luật gốc, kể cả thứ tự xử lý cùng tick |
| Hết giờ và điểm hòa | Cần thứ tự soát soái/điểm/top; không tự tuyên hòa từ điểm bằng nhau |

Nguồn chính thức Miễn Phí có luật ưu tiên soái trước điểm (§2); đây là bằng chứng thiết kế cũ không thể được coi là luật chung VLTK, nhưng chưa thay thế được script server của SHXT được chỉ định.

## 7. Điểm, quân hàm và dữ liệu nhân vật

### 7.1. Phân biệt dữ liệu để triển khai

**ĐỀ XUẤT cấu trúc, chưa chốt công thức số:** điểm trận (`matchPoints`), tổng điểm phe (`teamScore`), điểm tích lũy có thể tiêu (`meritBalance`), lịch sử nhận thưởng và xếp hạng là các trường riêng. Mua đồ không được làm giảm điểm thi đấu/quân hàm.

Cần xác minh: điểm hạ từng loại lính/người/soái; ai nhận công (kết liễu hay sát thương), chia tổ đội, liên trảm/hỗ trợ, điểm bị trừ khi chết, điểm thắng/thua, các mốc quân hàm, giá quy đổi EXP và thưởng cuối trận. Chưa lấy `50×bậc`, `150×bậc`,15 giây, mốc 3000/9000/18000/30000 hoặc buff 0–20% từ volamidle.

### 7.2. Trạng thái quân hàm có dấu vết khác thiết kế cũ

**PAK:** skill 661 “trạng thái trong chiến trường Tống Kim” dùng `script/skill/battles/sj_guanxian.lua`:

- `lifemax_p = 10 + 10 × skillLevel`.
- `allres_p = 5 × (skillLevel − 1)`.
- P 2 mặc định `5 × 60 × 18` frame.

Đây là công thức **theo cấp trạng thái**. Chưa tìm được script cấp quân hàm gọi skill 661 ở cấp nào / có đổi thời hạn hay không. Không suy từ đó ra bảng quân hàm đã hoàn chỉnh; cũng không giữ thưởng sát thương/tốc đánh/kháng nhân 1.05–1.20 từ bản cũ.

Khi triển khai, mọi công thức vào `packages/shared/src/formulas/`; hằng số ở `formulas/tuning.ts` có nhãn nguồn. Hiện không có `formulas/stats.ts`; điểm nối thuộc tính là `character.ts`, `combat.ts`, `damage.ts`, `effects.ts`, `speed.ts` tùy loại.

## 8. Quân Nhu — lập lại danh mục theo SHXT

### 8.1. Không cố định số lượng 26

26 món của tài liệu cũ là catalog volamidle, không phải danh mục toàn bộ SHXT. Trong PAK có:

- Chiêu Thư; Chiến Cổ; Lệnh Bài; **Binh Sĩ Hiệu Phù**; Cờ Hiệu; Kháng Đơn Chi Giác.
- **18 Hoàn** `ParticularType178–195`, gồm **Ngoại Độc Hoàn** bị thiếu ở bản cũ.
- Nhóm 5 Chiến Hồn +5 Hộ Giáp +5 Lợi Nhận; Hành Quân Đơn, Tiểu Hoàn Đơn, Ngũ Hoa Lộ; Hậu Nghệ Chi Nhãn, Tật Phong Chi Ngoa, Bạch Câu Hộ Uyển, Tam Thanh Chi Khí và Càn Khôn Tạo Hóa Đan.
- Các lệnh bẫy `ParticularType393–397`, gọi kỹ năng gốc và có số lượt sử dụng; không tương đương ba loại bẫy tùy biến 30 giây/90 px của volamidle.

Chưa khẳng định tất cả món cùng bán/rơi trong mọi thể thức. Cần lập bảng **item → nguồn mua/rơi → thể thức → điều kiện dùng → skill/cấp/thời hạn** trước triển khai.

### 8.2. 18 Hoàn đã truy được lệnh dùng trong PAK

Mọi món dưới đây có script gọi `AddSkillState(skillId, level, 0, 3240)`; 3240 frame ở 18 fps nguồn là 180 giây. Tool/server 20 tick phải đổi thời gian thực, không dùng 3240 tick. Cột giá trị ghi thuộc tính Lua, không tự diễn giải thành nhân sát thương cuối/tốc độ thực.

| ParticularType | Hoàn | Skill / cấp | Thuộc tính cơ sở từ Lua |
|---|---|---|---|
| 178 | Ngoại Phổ | 487 /5 | `addphysicsdamage_p` +50 |
| 179 | Ngoại Độc | 485 /5 | `addpoisondamage_v` P 1=50, P 3=10 |
| 180 | Ngoại Băng | 486 /10 | `addcolddamage_v` P 1=P 3=100 |
| 181 | Nội Phổ | 479 /10 | `addphysicsmagic_v` P 1=P 3=100 |
| 182 | Nội Độc | 480 /5 | `addpoisonmagic_v` P 1=50, P 3=10 |
| 183 | Nội Băng | 481 /10 | `addcoldmagic_v` P 1=P 3=100 |
| 184 | Nội Hỏa | 482 /10 | `addfiremagic_v` P 1=P 3=100 |
| 185 | Nội Lôi | 483 /10 | `addlightingmagic_v` P 1=P 3=100 |
| 186 | Trường Mệnh | 488 /5 | `lifemax_v` +500 |
| 187 | Gia Bào | 493 /2 | `fastwalkrun_p` +20 |
| 188 | Cao Thiểm | 494 /50 | `adddefense_v` +500 |
| 189 | Cao Trung | 495 /50 | `attackratingenhance_v` +500 |
| 190 | Phi Tốc | 496 /5 | `attackspeed_v`, `castspeed_v` +50; có dòng `_yan_v` tương ứng |
| 191 | Phổ Phòng | 473 /5 | `physicsres_p` +50; có dòng `_yan_p` tương ứng |
| 192 | Băng Phòng | 475 /5 | `coldres_p` +50; có dòng `_yan_p` tương ứng |
| 193 | Lôi Phòng | 477 /5 | `lightingres_p` +50; có dòng `_yan_p` tương ứng |
| 194 | Hỏa Phòng | 476 /5 | `fireres_p` +50; có dòng `_yan_p` tương ứng |
| 195 | Độc Phòng | 474 /5 | `poisonres_p` +50; có dòng `_yan_p` tương ứng |

Không cộng cả thuộc tính thường và `_yan_*` hai lần chỉ vì file có cả hai; cần hiểu ý nghĩa của engine/profile nguồn. P 2 do lệnh dùng ghi 180 giây có thể khác mặc định trong Lua; lấy đủ chuỗi gọi.

### 8.3. Hiệu lệnh và bẫy: các khác biệt quan trọng

| Món | PAK đã xác minh | Điều chưa được tự áp từ volamidle |
|---|---|---|
| Chiến Cổ 156 | CastSkill 491 cấp 1; tăng `lifemax_p`30 và `allres_p`30, thời hạn 180 giây | Không mặc định bán 500 điểm; không hardcode vùng 410 px |
| Lệnh Bài 157 | CastSkill 492 cấp 1; `fastwalkrun_p`30, `attackspeed_v`/`castspeed_v`50,180 giây | Không tự đổi +50 chỉ số thành tốc đánh thực nhân 1.5 |
| Kháng Đơn Chi Giác 214 | CastSkill 510 cấp 1; Lua trả `meleedamagereturn_p`/`rangedamagereturn_p` **−20** trong 180 giây | Không thay thành nhân 0.8 chỉ số phản đòn như bản cũ |
| Binh Sĩ Hiệu Phù 158 | Triệu hồi 2 lính đúng phe; cao cấp gọi NPC 682/688 cấp 90; kiểm tra chiến đấu, bản đồ và giới hạn gọi của phe | Chưa tìm giá trị `MAX_CALLNPCCOUNT`, không tự đặt |
| Lệnh 393–397 | Xuyên Tâm/Độc Thích/Hàn Băng/Địa Hỏa/Lôi Kích; gọi skill 343/303/345/347/349, cao cấp cấp 30; tối đa 50 lần dùng/món | Không thay bằng bẫy băng/choáng/chậm tùy biến; cần đọc chuỗi skill/missile |

Skill 491/492 có `AttackRadius=400`, skill 510 có 470, kèm child 76/77 và missile. Đây là tầm trong bảng, **chưa phải đủ bằng chứng bán kính tác dụng cuối**; truy tiếp child/missile, đơn vị tọa độ và bộ chọn đồng minh. Hào quang của từng phái vẫn theo kỹ năng, không áp 410  cho tất cả.

### 8.4. Mua, rơi, chồng và lưu

PAK cho 18 Hoàn, Chiến Cổ/Lệnh Bài/Kháng Đơn Chi Giác có mức chồng 50. Chiêu Thư không cùng quy tắc. Lệnh bẫy 50 lượt là độ dùng, **khác** chồng 50 món/ô.

Chưa có bằng chứng gốc cho bảng giá cũ 150/200/400/500, tỷ lệ rơi 0.5–20%, ngẫu nhiên 1/26,120 giây và 20 giây chỉ người hạ gục. Không dùng chúng thay luật SHXT. Quyết định đồ rơi chung project 60 giây/người hạ gục + tổ đội vẫn chưa được tự ghi đè bằng một ngoại lệ thiếu nguồn.

Hiện `Item` chưa có số lượng chồng; khi làm cần số lượng, độ dùng, gộp/tách, phím 1–9, dùng/nhặt/mua nguyên tử và lưu bền. Không dùng chuỗiID thay món cóUID. Mua thất bại/đầy túi không trừ điểm; một lệnh dùng không được trừ hai lần.

## 9. Các hợp đồng tích hợp phải có khi triển khai

- **Tư cách:** `tier`, `matchId`, `battleCamp` tách khỏi tổ đội `team` và chính/tà `camp`. Server quyết định phe, điều kiện cấp, hàng đợi và quyền ra trận.
- **Mọi đường vào/ra:** kiểm tra Xa phu, dịch chuyển, cổng, reconnect, hồi sinh, Auto đổi bãi/về thành, Thổ Địa Phù, lệnh bài đổi phái/giới/tăng cấp và dev. Không chỉ ẩn nút ở client.
- **Nhắm mục tiêu:** đòn trực tiếp, đạn bay, AoE, độc, phản đòn, bẫy, triệu hồi và bùa hỗ trợ đều kiểm tra tư cách/phe/vùng/giai đoạn. Không sửa riêng đường click.
- **Vùng an toàn:** sảnh chờ/Hậu doanh và cổng phải có luật rõ; địch không được đánh xuyên vùng an toàn hoặc đạn cũ theo người đổi map. Luật cụ thể Hậu doanh lấy từ SHXT khi xác minh.
- **Hồi sinh:** không dùng lệnh hồi sinh hiện tại tự trả Biện Kinh; không lấy chuỗi 5/7/10/13 giây từ volamidle. Cần xác minh mất exp/tiền/đồ, máu/nội lực hồi, thời gian bảo vệ và hiệu ứng giữ/xóa.
- **Kết nối lại:** lưu tư cách bằng `charId`, không dùng `sessionId`; giữ trạng thái trận/hồi sinh cần thiết, không đổi phe/reset điểm bằng reconnect. Vị trí/HP/MP trả về phải có chính sách gốc, không mặc định khôi phục snapshot tạo hồi máu miễn phí.
- **Điểm/thưởng:** sự kiện một lần theo trận + nạn nhân + lượt chết; kết quả/thưởng có biên nhận bền; người offline nhận đúng phần đã đủ điều kiện, không phát lại khi vào lại.
- **Đóng trận:** khóa cả sát thương trì hoãn, bẫy, buff và AI; dọn trạng thái chiến trường nhưng giữ đồ/điểm/thưởng bền đúng luật; có phương án server khởi động lại.
- **Giao diện:** HTML/CSS theo `ui/kit/dialog.ts`, API qua `game/ports.ts`; HUD trạng thái/giờ/phe/điểm, số người đang chờ, thông báo và bảng kết quả. Phím qua `input/keymap.ts`.
- **Web/Desktop/Mobile:** cùng luật server, nút chạm thay thao tác chỉ dùng phím/rê chuột; số người/hiệu ứng/asset phải đo trên máy yếu. Không đổi dựng hình 1:1 hoặc đặt bán kính theo pixel màn hình.

## 10. Phần còn thiếu để tuyên bố “giống SHXT”

| Hạng mục | Bằng chứng hiện có | Cần bổ sung |
|---|---|---|
| Điều kiện/điểm đến | rescript: 40/60/90, map 323/324/325 | NPC, phí, cân bằng/giới hạn phe, giờ khóa báo danh |
| Sảnh chờ | USER bắt buộc; protocol có số đang đợi | Tọa độ, ranh giới, cách gọi lượt và hủy hàng đợi |
| Vòng đời | protocol có 4 trạng thái | Thời lượng chuẩn, mốc lính/soái, AFK/thiếu người |
| Thể thức/kết quả | MapInfo có soái/cờ; nguồn web khác nhánh | Script điều phối SHXT, điều kiện thắng, hòa/kết thúc sớm |
| Điểm/quân hàm | Skill 661 và công thức theo cấp | Mốc thăng cấp, cấp trạng thái, điểm NPC/PK và thưởng |
| Lính/soái | Bảng NPC + MapInfo + lính triệu hồi | Đúng NPC theo thể thức, cấp sinh, AI, tái sinh |
| Quân Nhu | Bảng item + script dùng + Lua kỹ năng | Shop/bảng rơi theo thể thức, cộng dồn/trạng thái khi chết |
| Kết thúc/thoát | Có giai đoạn kết thúc | Trả về đâu, thời điểm phát thưởng, dữ liệu reconnect |

Đã thử tìm theo tên và hash PAK `script/battles/battlehead.lua`, `battleinfo.lua`, `battle.lua`, `battlemission.lua`, `timer.lua`, `baoming.lua`, `mission.lua`: chưa tìm thấy. Một số item Include các file này, nhưng client không cung cấp đủ module điều phối để suy ra luật trận. Có script mission PK cũ trong PAK; chúng không được tự coi là phiên bản điều phối SHXT hiện hành.

Các ô trên còn thiếu bằng chứng để tuyên bố tái hiện SHXT 1:1. **Theo chỉ đạo mới của USER, chúng đã có phương án gameplay CHỌN tại [bản đề xuất](tong-kim-gameplay-proposal.md), không còn để trống hoặc chặn việc thiết kế.** Khi được duyệt sẽ triển khai theo phương án đó; không đổi nhãn CHỌN thành DATA chỉ vì đã triển khai.

## 11. Thứ tự thực hiện và nghiệm thu

1. **Duyệt gameplay:** đọc `docs/tong-kim-gameplay-proposal.md`, chốt phương án CHỌN cho phần thiếu nguồn. Chưa viết code khi USER chưa duyệt; không yêu cầu tìm đủ script server cũ mới được bắt đầu.
2. **Dựng tuyến map 325 → sảnh chờ → map cao cấp:** hỗ trợ tài nguyên dùng chung/ID logic riêng, tọa độ, nav, NPC và cổng; chưa sinh sơ/trung.
3. **Quản lý một trận cao cấp:** lịch/mở ngay, bốn giai đoạn, tư cách/hàng đợi, đồng hồ server; không tạo trận thứ hai khi rỗng/reconnect.
4. **Luật trận và dữ liệu bền:** combat/vùng, lính/soái, điểm/quân hàm, hồi sinh, kết quả/thưởng/khôi phục.
5. **Quân Nhu theo bảng nguồn:** đủ món theo thể thức, chuỗi skill, mua/rơi/sử dụng/chồng/độ dùng và kiểm tra đồng thời.
6. **Giao diện và nghiệm thu:** Web/Desktop/Mobile; sơ/trung bổ sung sau bằng cấu hình tầng, không thêm engine chiến trường khác.

Tình huống bắt buộc: hai lệnh mở đồng thời; không ai online; vào sai cấp; phe đầy/đang chờ; đi vòng qua Xa phu/Auto; khác phe cùng tổ đội; đạn/độc/bẫy qua giai đoạn; đồng thời chết soái/hết giờ; mất mạng khi chờ/hồi sinh/kết quả; server khởi động lại; mua khi đầy túi; dùng lặp; nhận thưởng lặp; đối chiếu chỉ số với bảng nguồn; đo đông người/AoE/server 20 tick, giao diện chạm không cần rê chuột.
