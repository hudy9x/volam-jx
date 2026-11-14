# Backlog

✅ xong · 🟡 một phần / mới có nghiên cứu · ⬜ chưa làm · ⏸ chờ người dùng.
Công thức và nguồn: `docs/combat-formulas.md` (§ = mục trong đó); nghiên cứu cơ chế: `jx1-gameplay-research/` (đã xóa) (tài liệu 01–09).
Nền tảng mục tiêu Web + Desktop + Mobile (`AGENTS.md` §1): việc nào có phần riêng cho mobile thì ghi ở cột ghi chú.

| Nhóm | Mã | Nội dung |
|---|---|---|
| 1. Trang bị | TB | Mô hình đồ, bảng gốc, ô mặc, mô tả, đồ xanh, thuộc tính ẩn, độ bền, hoàng kim, Thiên Tứ, ngựa |
| 2. Vật phẩm, tiền, rơi đồ | VT | Thuốc, vật phẩm dùng, tiền, cửa hàng, kho, giao dịch, đồ rơi, bảng rơi, may mắn |
| 3. Kỹ năng | KN | Rà chiêu từng phái, cân bằng, học / thục luyện, mô tả |
| 4. Hiệu ứng | HU | Trạng thái có tác dụng (gameplay) và hình ảnh: bóng đổ, hoạt cảnh bản đồ |
| 5. Giao diện | GD | Bảng F3, chat, nhiệm vụ, mobile, làm lại giao diện |
| 6. Gameplay | GP | Nhân vật, chiến đấu, PK / tử vong, Auto, quái / thế giới, xã hội |
| 7. Event và nhiệm vụ | SK | Nền mission / hẹn giờ, Tống Kim, Công Thành, Liên Đấu, Vượt Ải, Phong Lăng Độ, Hoàng Kim, Dã Tẩu… |
| 8. Hạ tầng và nền tảng | HT | Đóng gói Desktop / Mobile, mạng, lưu trữ, công cụ |
| 9. Hiệu năng tải tài nguyên | PF | Đo lường, giới hạn bộ nhớ texture, tải theo ưu tiên, cache + phiên bản (`docs/performance/`) |
| 10. Bot và hiệu năng server | BT | Trang cài đặt bot `/?bots`, kịch bản `npm run bots`, số đo server, sửa chỗ nghẽn (`docs/bots.md`) |

Đổi mã cũ (trước 2026-11-12, vòng 8): VP0–VP9 → TB0–TB9 · HK1–HK5 → TB11–TB15 · TH1, TH2 → VT1, VT2 · RD1 → VT3 · RD2–RD5 → VT7–VT10 ·
RD6 → GP8 · RD7 → GP9 · RD8 → VT11 · BD1–BD4 → HU3–HU6 · NV1, NV2 → GP1, GP2.

## 1. Trang bị (TB)

Nguồn: tài liệu nghiên cứu 09 §2–§8 (cơ chế engine), `docs/equipment-gold-thientu.md` (hoàng kim môn phái + Thiên Tứ, đủ tên / bộ /
thuộc tính / min–max, sinh bằng `apps/client/tools/doc-gold.ts`). Bảng thường có trong `data_extract`; hoàng kim, bạch kim, mặt nạ,
áo choàng, `magicattrib_ge`, `magicattriblevel`, `magicscript` chỉ có ở file rời `jx-origin/settings/item/` (bản mod) — được phép
đọc (TB0).

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ✅ | | Hành trang 60 ô + 11 ô trang bị (có ô Ngựa), Thợ rèn bán đồ cấp 1–10 giá 0, ghép hình nhân vật theo áo / nón / vũ khí | |
| ✅ | TB0 | Quyết định: tool được đọc bảng file rời `settings/item/` (bản mod) khi `data_extract` không có | Người dùng đồng ý 2026-11-12; ghi ở `AGENTS.md` §7 |
| ✅ | TB1 | Mô hình "món đồ cụ thể": bảng (def) tách khỏi món (nature, hệ, cấp, dòng thuộc tính, độ bền, seed); hành trang + db lưu món | 2026-11-12: `Item { uid, def, q?, base?, dur?, magic? }` (`items/items.ts`); id chuỗi cũ tự chuyển khi nạp (`world/inventory.ts` restoreBag / restoreEquipment) |
| ✅ | TB2 | Nhập đủ cột 10 bảng trang bị thường: giá, chỉ số cơ bản (sát thương vũ khí, phòng thủ, độ bền, chính xác), yêu cầu, kích thước ô | 2026-11-12: `gen:assets` xuất giá, kích thước ô, mô tả, 7 thuộc tính cơ bản, 6 yêu cầu (tên mã từ exe); bỏ Sinh lực / Nội lực tạm; sát thương cơ bản lấy từ vũ khí. Kích thước ô chưa dùng (TB18) |
| ✅ | TB3 | Ô trang bị thêm: mặt nạ (840 dòng), áo choàng / phi phong, ấn, trang sức | 2026-11-12: thêm 4 ô (15 ô); 839 mặt nạ gốc bán ở Thợ rèn. Phi phong / Ấn / Trang sức: bảng gốc chỉ có dòng giữ chỗ → đồ thật đến từ TB11 / TB15. Biến hình mặt nạ: TB19. JX1 **không có ô quần** |
| ✅ | TB4 | Mô tả vật phẩm kiểu gốc (`magicdesc.ini`, như mô tả kỹ năng) + màu theo chất lượng (trắng / xanh / tím / hoàng kim / bạch kim) | 2026-11-12: `items/describe.ts` (câu gốc `magicdesc.ini`), yêu cầu không đạt tô đỏ (giới, hệ, phái — cấp / sức mạnh / thân pháp chờ GP1–GP2). Vòng 14: bố cục / màu theo ảnh SHXT (`TIP_COLORS`, căn giữa, dòng Ngũ hành, `[min-max]` mỗi dòng xanh); nền ô xanh / đỏ sẫm theo điều kiện mặc, viền theo phẩm chất (`随身物品.ini`). Mobile: giữ lâu để xem (chưa làm) |
| ✅ | TB5 | Điều kiện mặc: cấp, Sức mạnh, Thân pháp, Sinh khí, Nội công, hệ, giới, phái | 2026-11-12: `items/equip.ts` kiểm cấp, Sức mạnh, Thân pháp, hệ, giới, phái (server + client, `itemViewer`). Sinh khí / Nội công: bảng không có cột |
| ✅ | TB6 | Đồ xanh: dòng ngẫu nhiên từ `magicattrib.txt` (330 dòng; ô chẵn tiền tố / lẻ hậu tố, không trùng loại, mức ≤ L) | 2026-11-12: quái rơi đồ xanh tung dòng theo trọng số gốc + may mắn (`rollMagicLines`); vòng 14: bảng + Chế tạo |
| 🟡 | TB7 | Thuộc tính ẩn + kích hoạt theo ngũ hành tương sinh (bảng ô kích hoạt) | 2026-11-12 (vòng 14): hậu tố (vị trí 2 / 4 / 6) = dòng ẩn, xám; khi mặc, mỗi ô kích hoạt tương sinh + hệ nhân vật tương sinh sáng thêm 1 dòng (`activeHidden`; luật đếm là **suy luận** 🟡, không còn mã engine để đối chiếu). Chỉ hiển thị; tác dụng chờ TB8 |
| ✅ | TB8 | Chỉ số trang bị tác động nhân vật — **đã chốt 2026-11-12: áp dụng cho đồ xanh (TB6) và đồ hoàng kim môn phái (TB11)**; Thiên Tứ / bạch kim không thuộc phạm vi này | 2026-11-12: dòng đồ xanh và hoàng kim môn phái có tác dụng (tiền tố / dòng 1-3-5 luôn, ẩn khi kích hoạt hoặc đủ bộ) |
| ⬜ | TB9 | Độ bền, mài mòn (`abraderate.ini`: vũ khí 1/256 mỗi đòn, giày 1/2560 mỗi vùng…), hỏng, sửa ở Thợ rèn | Công thức giá sửa: tài liệu 09 §8 |
| 🟡 | TB10 | Ngựa đầy đủ: 54 loại đã có (chỉ tốc độ); thêm thể lực, sinh lực, phòng thủ, yêu cầu cấp theo `horse.txt`; ngựa hoàng kim | Tài liệu 09 §13 |
| ✅ | TB11 | **Hoàng kim môn phái** (mã cũ HK1) — **làm trước**: 28 bộ × 5 món = 140 món, 10 phái gốc | 2026-11-12: `gen:gold` → 140 món (`items/gold.gen.ts`), `createGold` (phẩm chất 0–10 theo may mắn), boss rơi theo bảng gốc, thẻ dev ở Thợ rèn; chỉ số có tác dụng (TB8). Chưa: `allskill_v` cộng cấp chiêu |
| ⬜ | TB12 | **Thiên Tứ** (bạch kim, mã cũ HK2) — **làm trước**: 140 món, yêu cầu cấp 120; giá trị +0 / +10, kỹ năng bạch kim +6 / +10, dòng thêm khi cường hóa +5…+9 | 110/140 trùng tên món hoàng kim; cách nâng cấp và giá trị +1…+9 không có trong dữ liệu ❓ **Tạm hoãn (USER 2026-11-12)**. Sẵn sàng: tài liệu từng món `docs/equipment-gold-thientu.md`; cách làm theo TB11 (`gen:gold` → thêm platinaequip, `createGold` → mức +0…+10 nội suy, kỹ năng bạch kim từ `platina.lua`); chỉ số có tác dụng thuộc TB17. |
| 🟡 | TB13 | Bộ trang bị + thuộc tính ẩn của đồ hoàng kim: dòng 2 / 4 / 6 ẩn, kích hoạt theo tương sinh hoặc đủ bộ; bộ đời sau có dòng thưởng bộ | 2026-11-12: đủ 5 món của bộ → bật mọi dòng ẩn (`fullSuite`); bộ 1–28 không có dòng thưởng bộ (DATA). Bộ đời sau (dòng thưởng): TB15 |
| 🟡 | TB14 | Hình nhân vật mặc đồ + icon cho hoàng kim / bạch kim (`goldequipres.txt`, `platinaequipres.txt`) | 2026-11-12: hình mặc áo / nón / vũ khí hoàng kim (`gen:assets` +377 sheet, +22 MB); icon dùng icon gốc trong bảng. Bạch kim: TB12 |
| ⬜ | TB15 | **Các loại trang bị khác** (mã cũ HK5) — **sau TB11, TB12**: hoàng kim đời sau theo phái (Thanh Câu, Vân Lộc, Thương Lang, Huyền Viên, Tử Mãng, Kim Ô, Bạch Hổ, Xích Lân, Minh Phượng, Đằng Long, Độc Cô), hoàng kim không môn phái (An Bang, Định Quốc, Hiệp Cốt, Nhu Tình, Phục Hi / Nữ Oa…), Tinh Xảo, Nhã Điển, ấn, phi phong, bản có thời hạn / phẩm cấp, ~320 món tên tiếng Trung | Danh sách: `docs/equipment-gold-thientu.md` mục 5; mở rộng `doc-gold.ts` cho từng loại trước khi làm. Mã thuộc tính > 176 (mới của bản SHXT: chặn đòn, gia tăng sát thương, sát thương theo hệ…) chưa có tên: phải dựng bảng tên riêng (đối chiếu tên Trung trong `magicattrib_ge.txt`) **Tạm hoãn (USER 2026-11-12)**: làm sau TB12; bộ đời sau có dòng thưởng bộ (`suite_activate_count.txt`) → mở rộng `fullSuite`. |
| ⬜ | TB16 | Đồ tím / khảm (`magicattriblevel.txt`, 5 % hỏng) và luyện / ghép (Huyền Tinh, Thủy Tinh, rèn tím) | Tài liệu 09 §10; tỉ lệ luyện chỉ có từ server tư nhân 🟡 |
| ⬜ | TB17 | Chỉ số tác động cho các loại trang bị còn lại (ngoài phạm vi TB8): **Thiên Tứ / bạch kim (TB12)**, đồ trắng (chỉ số cơ bản: phòng thủ, sát thương vũ khí, độ bền), đồ tím (TB16), các họ hoàng kim khác (TB15), ngựa (TB10), mặt nạ / ấn / trang sức / phi phong (TB3) | Ghi lại theo quyết định TB8; làm sau |
| 🟡 | TB18 | Hành trang dạng lưới theo kích thước ô như bản gốc (`ItemDef.size`, vd. áo 2 × 3, nhẫn 1 × 1): đặt / kéo thả theo ô, kho | 2026-11-12 (vòng 14): lưới 6 × 10 ô 28 px (`随身物品.ini` `[ItemBox]`), `items/bag.ts`, món nằm ở ô trên-trái, mua / tháo / đổi đồ tìm chỗ theo cỡ, kéo thả để xếp (`C2S.bagMove`). Dữ liệu cũ xếp lại; món không vừa chờ trong `bagSpill`, vào lại khi có chỗ. Vòng 23: **+4 rương** (tab, `BAG_PAGES`). Còn: **kéo thả bằng chạm (mobile)**, kho (VT5) |
| ⬜ | TB19 | Mặt nạ: đeo vào hiện thành NPC (`ItemDef.npc` = dòng `npcs.txt`), thời hạn (`item_usagetime_v` 7200, đơn vị chưa rõ) | Cần `gen:assets` xuất hình các NPC được dùng (839 dòng, nhiều NPC trùng) |

## 2. Vật phẩm, tiền, rơi đồ (VT)

Nguồn: tài liệu 09 §9, §11–§14; `docs/combat-formulas.md` §9, §11. Bảng rơi: 50 file `settings/droprate/**` trong `data_extract`
(`npcdroprate*.ini` theo cấp, `boss/`, `goldennpc/`, `christmas/`); bản mod thêm 144 file rời `settings/droprate/` + 19 file
`settings/item/*droprate.ini`. Ý nghĩa các khóa bảng rơi là 🟡 suy luận (engine fork không đọc).

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ✅ | VT1 | Bình máu / nội lực (`potion.txt` 47 dòng, hồi theo nhịp), ô dùng nhanh | 2026-11-12: 44 dòng thuốc vào `items.gen.ts`; dùng trên phím 1–9 / trong hành trang, không độ trễ, mỗi bình bơm riêng mỗi 0,2 s (người dùng chốt; gốc ≈ 0,56 s), tổng = bảng gốc. Chỉ Sinh lực / Nội lực có tác dụng. Thuốc không chồng ô (bảng gốc "是否叠放" = 0) |
| ⬜ | VT2 | Vật phẩm chạy script (`magicscript.txt` 4 878 dòng): Thổ Địa Phù, sách kỹ năng, rương, phúc duyên lộ… | Làm từng món khi cần |
| ✅ | VT3 | Tiền (lượng): tiền túi / kho, hiển thị, lưu; giá mua thật, bán NPC = giá / 4; Thợ rèn / Bán ngựa hết giá 0 | 2026-11-12: tiền túi (khởi đầu 20000), hiển thị theo `随身物品.ini` / `买卖确认.ini`, hộp Mua vào (số lượng) / Bán ra, chế độ Mua / Bán; nút dev +100 vạn. Tiền kho: VT5. Tiền rơi: VT7 |
| 🟡 | VT4 | Cửa hàng NPC theo bảng gốc (`buysell.txt`, `goods.txt`): hiệu thuốc, tạp hóa, thợ rèn từng thành | 2026-11-12: Chủ dược điếm (dòng 53) ở mọi thành. Script server gán NPC → dòng không có trong client; Thợ rèn vẫn bán mọi đồ cấp 1–10, chưa có tạp hóa. Sửa đồ: TB9 |
| ⬜ | VT5 | Kho (rương chứa đồ) 60 ô, mở rộng tới 6 kho; tiền kho tách tiền túi | Tài liệu 09 §11 |
| ⬜ | VT6 | Giao dịch giữa người chơi (chờ 5 s, không thuế) và bày bán | Tài liệu 09 §12.3 |
| ✅ | VT7 | Vật rơi trên đất (đồ / tiền): đối tượng server đồng bộ xuống client, hình tiền 5 mức, tên màu theo chất lượng, nhặt trong 200 px. **Đã chốt 2026-11-12: tồn tại 60 giây; 20 giây đầu chỉ người đánh chết quái và tổ đội của người đó được nhặt, sau đó ai cũng nhặt được** | 2026-11-12: `MapState.ground`, `systems/drops.ts`: đồ / tiền quanh xác quái, tên màu theo chất lượng, bấm để nhặt (tự đi tới), người giết 20 s, mất sau 60 s. Chưa: hình tiền 5 mức, tổ đội |
| 🟡 | VT8 | Bảng rơi: tool nhập `.ini` → `shared/drops/`; RandRange / RandRate / MoneyRate / MoneyScale / MagicRate / Min-MaxItemLevel; gắn theo bản đồ (`maplist.ini` NormalDropRate / GoldenDropRate) và theo boss | 2026-11-12: `gen:drops` (48 bảng gốc update01) + `formulas/drops.ts`: bảng theo dải cấp quái (CHỌN), RandRange / RandRate, cấp món, tiền. Chưa: bảng theo bản đồ / boss, Treasure, Genre 4/6, hoàng kim |
| ✅ | VT9 | Ai được quyền nhặt / chạy bảng rơi: **người đánh chết quái** + tổ đội (chốt 2026-11-12) | 2026-11-12: người đánh chết quái (USER); tổ đội khi có GP14 |
| 🟡 | VT10 | May mắn, phúc duyên: chọn cách thiết kế | 2026-11-12: may mắn mặc định 5 (USER) = mức trung tính (CHỌN, phương án B) trong ngưỡng dòng xanh `rand(1e6) / (1 + 0,2 × (May mắn − 5))`; chưa: hoàng kim, phúc duyên |
| ⬜ | VT11 | Công cụ dev xem / chỉnh bảng rơi theo bản đồ (tùy chọn) | Giống công cụ khu quái |
| ✅ | VT12 | **Nghiên cứu riêng: điểm may mắn + bảng xếp hạng vật phẩm** (tài liệu, chưa code). (a) May mắn ảnh hưởng thế nào tới tỉ lệ rơi đồ, chất lượng món đồ (số dòng, mức dòng, phẩm chất hoàng kim), tỉ lệ ra trang bị hiếm / thuộc tính hiếm — gom điều đã kiểm chứng (engine `Gen_MagicAttrib`, luck min/max hoàng kim, bảng rơi `MagicRate`) và điều suy luận. (b) **Bảng tiêu chí xếp hạng vật phẩm**: loại đồ, cấp đồ, số dòng, mức dòng, dòng hiếm (+cấp kỹ năng, kháng, chí mạng…), hoàng kim / bạch kim → hạng + thang điểm. (c) Bảng số liệu: tỉ lệ ra từng hạng theo may mắn và theo bảng rơi. (d) Vài phương án thiết kế để chọn cho VT10 | 2026-11-12: `docs/research/luck-drops.md` (may mắn, bảng xếp hạng đề xuất, định dạng bảng rơi, đề xuất triển khai) |

## 3. Kỹ năng (KN)

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ✅ | | Kỹ năng 11 phái từ bảng gốc (gồm Hoa Sơn), 5 loại chiêu; thất truyền mỗi phái; 3 kỹ năng chung | |
| ✅ | | Bộ máy ra chiêu dùng chung người chơi / bot / quái / boss | `packages/shared/src/skills/engine` |
| ✅ | | Mô tả kỹ năng đầy đủ kiểu gốc khi rê chuột | |
| 🟡 | KN1 | Rà từng chiêu phase 2: 8 phái còn lại + phân loại chiêu Hoa Sơn (Vân Chưng Hà Úy, Vô Cực Kiếm Khí đang xếp "Hỗ trợ") | Đã rà Thiên Vương, Nga My |
| ⬜ | KN2 | Cân bằng: Đường Môn (bẫy) quá mạnh | |
| ⬜ | KN3 | Chiêu hút máu / nguyền chưa có tác dụng | Cần HU1 |
| ✅ | KN4 | Thục luyện chiêu 90 / 120 / 150 (lên cấp theo dùng) | 2026-11-12: chiêu 90 / 150 thục luyện mỗi đòn trúng, tối đa trong 1 giờ (`PRACTICE`, ghi đè theo phái / chiêu); 120 cộng điểm (USER). Ủy thác / Bạch Câu Hoàn: chưa làm |
| ✅ | KN5 | Học kỹ năng bằng điểm, gia nhập môn phái | 2026-11-12: chiêu hiện theo ReqLevel, cộng điểm trong cửa sổ Kỹ năng, vào phái cấp 10 cùng hệ. `docs/formulas/skills.md` |
| ⬜ | KN6 | Mô tả kỹ năng cộng điểm từ trang bị / kỹ năng hỗ trợ; thuộc tính `addblockrate` (Hạo Nhiên Chi Khí) chưa rõ nghĩa | |
| ⬜ | KN14 | **Điều tra và sửa hỗ trợ kỹ năng cho chiêu 80/120/150**: đối chiếu nguồn + mapping hỗ trợ, xác minh skillBonuses và truyền bonus root/child, sửa phần hỗ trợ thật sự thiếu; tooltip thể hiện nguồn/% hỗ trợ đúng với phép tính. Không tự xem việc thiếu dòng tooltip là mất sát thương; chiêu120 cần rà cơ chế từng chiêu, không mặc định đều nhận addskilldamage. | USER2026-11-14 giới hạn session này vào hỗ trợ80/120/150. Hoa Sơn phân tuyến/Gợi ý/mô tả chuyển KN15; đổi đường cong sát thương150, độc, tên lỗi mã và cơ chế candetonate không thuộc phạm vi hiện tại. Chi tiết nghiên cứu cũ trong HISTORY. Chưa triển khai. |
| ⬜ | KN15 | **Hoa Sơn: phân biệt Kiếm Tông/Khí Tông, sửa Gợi ý cộng điểm kỹ năng + tiềm năng và mô tả trong bảng Kỹ năng**. Giữ icon gốc, làm rõ vai trò/quan hệ của chiêu cùng icon; chưa mở rộng sang cơ chế khí trường, cân bằng, thục luyện hoặc đổi bảng học. | USER2026-11-14 tách sang session riêng; tài liệu bàn giao `docs/huashan-skill-routes.md`. Chưa triển khai. |
| ⬜ | KN7 | Kỹ năng bạch kim (trạng thái 白金… từ Thiên Tứ, `script/skill/special/platina.lua`) | Đi cùng TB12 |
| ✅ | KN10 | **Tầng chiêu 90 / 150 mở theo cấp** (rà 2026-11-12): 30 chiêu có `skill_start/fly/collide/vanishedevent` bật theo cấp (28 chiêu ở cấp 11; Võ Đang 368 / 1079 thêm tầng cấp 16; Thiên Vương 1084 ở cấp 16). **Lỗi**: khi thuộc tính đang tắt, `SkillEngine` vẫn lấy chiêu con từ cột `skills.txt` → 21 chiêu bật tầng từ cấp 1. Sửa: thuộc tính tắt thì không gọi; mô tả theo `skill_showevent` (1 lúc ra chiêu, 2 khi bay, 4 khi trúng, 8 khi biến mất). Chiêu 120: không có tầng | 2026-11-12: `core/events.ts`, engine + mô tả theo cấp; `gen:skills` gom chiêu con chỉ nêu ở thuộc tính (thêm 4 chiêu, vd. vòng tròn 162). `docs/skills-layers.md` |
| ✅ | KN11 | Dịch tên chiêu 150 Thiên Vương id 1084 (đang lỗi mã tiếng Trung) | 2026-11-12: 1084 / 1086 / 1087 / 1088 là chiêu con; `tools/data/subskill-names.ts` |
| ✅ | KN12 | Giới hạn cấp chiêu theo cấp nhân vật: tối đa = cấp nhân vật − cấp học + 1 (chiêu 90 / 150 lên bằng thục luyện) | 2026-11-12: `levelCap` (CHỌN: gốc có chặn nhưng không có công thức); chiêu tiền đề của 5 chiêu 90 + 1110 (DATA skilllvlup.lua) |
| ✅ | KN13 | **Kỳ Trân Các + bí kíp** (USER 2026-11-12): nút "Bảo Vật" gốc, NPC Bách Bảo Lão Nhân, bí kíp 90 / 120 / 150 (hiện chiêu kế tiếp), Đại thành bí kíp (lên cấp 20); chiêu tầng 90 / 120 / 150 chỉ có qua bí kíp | `items/books.ts`, `useBook`. Giá do agent chọn. NPC: Bách Bảo Lão Nhân |
| ⬜ | KN8 | Dữ liệu: tên đạn Hoa Sơn trong `missiles.gen.ts` lỗi mã; `gen:skills` thiếu 6 file hình gốc | Không ảnh hưởng chơi |
| ✅ | KN9 | **Khinh công (210) đúng kiểu gốc** — người dùng báo 2026-11-12: không có động tác nhảy; khi đang nhảy, chiêu đánh ra không được tính sát thương. Việc: (1) `gen:assets` xuất động tác nhảy (cột `JumpFly` của bảng động tác, đang bị bỏ qua); (2) server có trạng thái nhảy thật: bay tới đích theo thời gian (bản gốc 12 px / khung, tối đa 40 khung ≈ 480 px), dừng trước vật cản, khóa lệnh khi đang bay; (3) **không nhận sát thương khi đang bay** (yêu cầu người dùng); (4) client vẽ động tác nhảy + nâng thân theo parabol, bóng ở dưới đất (đi cùng HU3–HU5) | Hiện tại: 210 dùng chung nhánh dịch chuyển tức thời với Mê Ảnh Tung (`SkillEngine.cast`), tư thế ra chiêu thường. Bản gốc (engine fork ✅): `Melee_Jump` → `DoJump`/`OnJump`, độ cao `m_Height` parabol; **vẫn nhận sát thương khi đang nhảy** và rơi xuống khi trúng đòn → mục (3) là thiết kế riêng của mình. Ba nền tảng như nhau |

## 4. Hiệu ứng (HU)

Hai nghĩa (xem `docs/architecture.md` §3): **trạng thái** = luật chơi (`shared/status/`), **hình hiệu ứng** = phần vẽ (`client/game/fx/`).

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ✅ | | Hình hiệu ứng chiêu gốc 1:1 (đạn, nổ, trúng), nền đen vẽ cộng sáng đúng (cờ SPR) | |
| ✅ | | Trạng thái được ghi nhận: icon trên HUD, hình trạng thái gốc trên người | Chưa có tác dụng |
| ✅ | HU1 | Trạng thái có tác dụng: choáng, chậm, độc, bùa lợi / bùa hại, giảm thời gian trạng thái | 2026-11-12: bùa có thuộc tính theo cấp, hết hạn theo P2 từng thuộc tính, cộng vào chỉ số; choáng / chậm / độc / co giật theo tham số gốc (`formulas/effects.ts`, `docs/formulas/effects.md`) |
| ✅ | HU2 | Hào quang và kỹ năng bị động cộng chỉ số thật | 2026-11-12: hào quang và bị động cộng thuộc tính thật (`passiveBag`, `stateBag`); `addphysicsdamage_p` theo loại vũ khí |
| ✅ | HU3 | **Bóng đổ** (mã cũ BD1): `gen:assets` xuất sheet bóng nhân vật nam / nữ theo `主角动作阴影对应表.txt`, cả lúc cưỡi ngựa | `docs/shadows.md`; một bộ cho mọi trang bị (~50 sheet mỗi giới) |
| ✅ | HU4 | Bóng đổ quái / NPC (`<sprite thân>b.spr`) cho quái trong file spawn + NPC thành; cờ "có bóng" trong `art/jx/data.gen.ts` | Phủ: enemy 679/985, animal 259/294, passerby 212/605, boss 110/812 |
| ✅ | HU5 | Vẽ bóng trong `game/actors/ActorView`: lớp dưới cùng, cùng hướng / khung với thân; hào quang dưới chân vẽ trên bóng; bỏ elip tạm | Không có file bóng thì không vẽ (như bản gốc) |
| ✅ | HU6 | Đo dung lượng `char/`, `npc/` sau khi sinh bóng; cập nhật `docs/regenerate-assets.md` | 2026-11-12: bóng thêm 5,6 MB (người 76 sheet 1,4 MB, quái / NPC 286 sheet 4,2 MB), hình nhảy 182 sheet 9,5 MB. Có thể thêm tùy chọn tắt bóng cho máy yếu (mobile) |
| ⬜ | HU7 | Hoạt cảnh bản đồ (nước, lửa…) | Đang đứng yên ở khung đầu |

## 5. Giao diện (GD)

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ✅ | | Giao diện từ ảnh gốc `spr/ui3`, một loại cửa sổ kéo thả, Esc, Hệ thống / Tùy chỉnh, con trỏ chuột gốc, âm thanh + nhạc gốc | |
| ✅ | | Tách giao diện khỏi game (`game/ports.ts`), mỗi cửa sổ một cặp .ts + .css, bảng phím chung | `docs/architecture.md` |
| 🟡 | GD1 | Bảng thuộc tính nhân vật (F3): tiềm năng, lực tay, kháng… | 2026-11-12 (vòng 15): cửa sổ **Trang bị và Thuộc tính** (`ui/windows/character.ts`, F3 + nút `b-char` trên thanh dưới) như bản ghép SHXT: thuộc tính theo `玩家装备与人物状态_属性.ini`, ô trang bị theo `_装备.ini`; hành trang tách cửa sổ riêng (nút Vật phẩm). Có số: tên, cấp, sinh lực, nội lực, hệ, lực tay (sát thương vũ khí), né tránh (tổng `armordefense_v`); còn lại "—" — cần GP1, GP2, GP3, TB8 |
| ⬜ | GD2 | Chat (kênh gần, thế giới, đội, bang, riêng) | Mobile: bàn phím ảo |
| ⬜ | GD3 | Cửa sổ nhiệm vụ | Đi cùng SK0 |
| ⬜ | GD4 | Giao diện Mobile: cảm ứng, bố cục riêng, nút đủ to, giữ lâu thay rê chuột | `docs/ui-and-platforms.md` §5 |
| ⏸ | GD5 | Làm lại toàn bộ giao diện: chốt công nghệ (đề xuất lai HTML/CSS + canvas), thư viện component, bố cục mobile | Người dùng sẽ làm sau |
| ⏸ | GD6 | Hình 1:1 trên điện thoại: có phóng to theo bội số nguyên không (đụng `AGENTS.md` §5.5) | Quyết khi làm mobile |
| 🟡 | GD7 | Dùng các con trỏ gốc còn lại (nhặt, bán, sửa, xem…) | Mua / bán đã dùng (cửa hàng, hành trang ở chế độ Bán). Còn nhặt, sửa, xem: VT7, TB9 |
| ✅ | GD8 | Guideline UI/UX chung cho tool và chỉ dẫn mọi AI đọc trước khi làm | USER2026-11-14: docs/tools-ui-ux-guidelines.md; root AGENTS/CLAUDE/GEMINI, tools/AGENTS và Antigravity .agents/rules/tools-ui-ux.md(always_on). Quy định token/component/form/template/bảng/dialog/trạng thái/responsive/QA; chưa tự đổi các tool hiện có. |

- [x] 2026-11-13: Thay ảnh nhân vật màn chọn/tạo bằng bộ SPR động gốc 5 hệ × 2 giới; sinh bằng `gen:ui`, chọn ảnh theo hệ của phái và giới tính.
- [x] 2026-11-13: Sửa nhịp SPR interval=1; nhân vật chưa chọn idle tối, click phát hoạt cảnh chọn một lần rồi về idle, có phát lại/hủy khi đổi mục tiêu.


## 6. Gameplay (GP)

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ✅ | | Tạo nhân vật 11 phái, giới tính theo phái | |
| ✅ | GP1 | Cấp, kinh nghiệm, lên cấp (exp chia theo sát thương, chênh lệch cấp, đội) | 2026-11-12: `formulas/level.ts` + `world/progress.ts`: exp theo `level_exp.txt`, chia theo sát thương, chênh lệch cấp, exp quái `standard.lua`; nhân vật cũ về cấp 1. Tổ đội: GP14 |
| ✅ | GP2 | Điểm tiềm năng (Sức mạnh, Thân pháp, Sinh khí, Nội công) + điểm kỹ năng | 2026-11-12: +5 tiềm năng / +1 kỹ năng mỗi cấp, nút + ở F3; tạo nhân vật theo hệ + giới. `docs/formulas/level.md` |
| 🟡 | GP3 | Chỉ số dẫn xuất: lực tay, chính xác, né, kháng, sinh lực / nội lực theo cấp | 2026-11-12: `formulas/character.ts` (Sinh lực, Nội lực, Chính xác, Né, lực tay cơ bản, kháng + trần) — `docs/formulas/character.md`. Lực tay theo chiêu, tốc độ: bước 6 |
| ✅ | | Click trái khóa mục tiêu, đánh liên tục; chuột phải / 1–9 một lần | |
| ✅ | GP4 | Sát thương theo công thức | 2026-11-12: `formulas/damage.ts` (lực tay, trúng / né IsUseAR, chí mạng ×2, chí tử, kháng + xuyên + trần, ngũ hành, PK 0,5), `DAMAGE_MODE = formula`. `docs/formulas/damage.md` |
| ✅ | GP5 | Trúng / né, chí mạng, chí tử, ngũ hành tương khắc, kháng tối đa | 2026-11-12: trong GP4 (tỉ lệ trúng 40–95 % SRC; trần chí mạng 75 % CHỌN) |
| 🟡 | GP6 | **Tốc đánh/xuất chiêu/chạy theo mốc volamidle — USER2026-11-14** | **Đã triển khai phạm vi USER mới**: `tuning.ts SPEED` sàn25%/trần300%, mốc đánh20frame/chạy8frame, `distanceScale=1.15`; công thức cộng Dương + chậm trước khi chọn mốc. Server snapshot duration, đồng bộ Actor.actionMs; client chuẩn hóa thời lượng đi chân/cưỡi và tích lũy vòng chạy. Hoàn tất pose phát1chiêu chính; tầng phụ/đạn/độc/bẫy giữ nhịp riêng, hồi chiêu riêng giữ nguyên. `?skills`: nhập tốc/chọn mốc, tự đánh/chạy/cảhai, cưỡi, sửa/reset cấu hình chỉ trong phiên thử. Typecheck,3test,build,75tổ hợpFPS/frame-count,Chromium desktop/mobile và2WebSocket đạt. Chi tiết `docs/formulas/speed.md` §10. **Đối chiếu bổ sung §11 (chưa commit)**: N→Thử tốc độ (USER đổi C→N do trùng) xuất đúng snapshot tổng, tránh nhầm số đánh cộng thêm/điểm chạy với tổng%; game/lab đo thật khớp3vòng/s và400ms,4test đạt. Đã commit theo USER (hash xem git log); chưa kiểm wrapper native, tốc riêng Thiên Vương/Thiếu Lâm quyền theo engine gốc vẫn chưa xác minh (ngoài quyết định bảng hiện tại). |
| ⬜ | GP7 | PK đầy đủ: chế độ, điểm PK 0–10, đỏ tên | Tài liệu 05 §11; hiện chỉ bật / tắt Đồ Sát |
| ⬜ | GP8 | Tử vong và hồi sinh: mất 2–4 % exp, mất 50 % tiền túi (25 % rơi đất), phạt theo điểm PK | Tài liệu 05 §11–§12. Cần VT3 |
| 🟡 | GP9 | Auto (Z): đã có phạm vi, bỏ qua boss / cọc gỗ, tự buff, quay về, **uống thuốc** (2026-11-12: % Sinh lực / Nội lực, bình vừa đủ phần thiếu, chờ bình trước bơm xong trừ khi dưới nửa ngưỡng). Vòng 23: **tự nhặt đồ** (của mình / không chủ, bỏ qua sau 2 lần không nhặt được), **tự tìm quái xa**. Thiếu: lọc chất lượng khi nhặt, về thành khi đầy túi / hết thuốc, sửa đồ | §10. Cần VT7 |
| ✅ | | ~300 bản đồ gốc, minimap, bản đồ lớn; quái theo file spawn + công cụ dev đặt khu quái | Cấp quái của `gen:spawns` là ước lượng |
| 🟡 | GP10 | Chỉ số quái theo cấp từ `npclevelscript` | 2026-11-12: mọi quái theo đường cong `standard.lua` (sinh lực, chính xác, né, sát thương, exp); chưa: 50 script khác + kháng từng quái |
| 🟡 | GP11 | Quái xanh / hoàng kim và boss thế giới | 2026-11-14: phân 3 bậc Quái thường (trắng `#ffffff`) / Boss Xanh (`boss=1`, xanh dương `#5cb8ff`, máu/exp ×5, 4 lần tung đồ, 3% tự hóa xanh tại bãi + 2 điểm cố định/bãi) / Boss Hoàng Kim (`boss=2`, vàng `#ffd700`, máu/exp ×12, 8 lần tung bảng `boss/*droprate`, 20 Đại/Tiểu Hoàng Kim phân bổ trên 40 bãi + Dược Vương Cốc). UI tool Boss `tools/boss` đã review/sửa theo guideline2026-11-14: bảng/lọc, dialog dùng chung, save-vs-apply, responsive/validation/error; hướng dẫn tools/boss/README.md. Chromium desktop/mobile viewport, typecheck/build đạt; chưa native. Tích hợp tạo Boss/lịch/hồi sinh/drop/API reload/gen-assets được commit theo USER2026-11-14 (sau aec1052). Test2026-11-14: 5Boss đủ5hệ xuất hiện đúng sau~2,1s quaWS, sprite/tên vàng thật trong Chromium; reload tắt/bật đúng, DB/server riêng, chưa kiểm chết/hồi sinh/drop. Chưa: 10 đặc tính cường hóa riêng của golden NPC |
| ⬜ | GP12 | NPC đầy đủ theo bản đồ gốc; server kiểm tra đứng gần NPC khi mua đồ | Đang đặt tay vài NPC thành thị (dữ liệu ở `shared/npcs/`) |
| ⬜ | GP13 | Xa phu / bến thuyền tính tiền theo bảng giá | Tài liệu 09 §12.4; hiện chuyển bản đồ miễn phí |
| ⬜ | GP14 | Tổ đội: chia exp, chế độ nhặt đồ | §7.3, tài liệu 08 §6; quyền nhặt 20 giây đầu cho cả tổ đội (VT7) |
| ⬜ | GP15 | Bang hội | Tài liệu 05 §10 |
| ⬜ | GP16 | Bạn bè | |

## 7. Event và nhiệm vụ (SK)

Nguồn: tài liệu nghiên cứu 05 (mission thế giới), 06 (Dã Tẩu, quest), 07 (cách tạo event, API script). Mọi mục mới có nghiên cứu, chưa code.

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ⬜ | SK0 | **Nền cho event**: hẹn giờ phía server (mỗi phút), "mission" theo bản đồ (vòng đời, bảng xếp hạng), biến nhiệm vụ lưu theo nhân vật, hội thoại NPC có lựa chọn kịch bản | Tài liệu 05 §1–§2, 06 §2–§3, 07 §2. Làm trước mọi SK khác |
| 🟡 | SK1 | **Tống Kim theo SHXT — đã có phương án gameplay, chờ USER duyệt triển khai**. Cao cấp trước, một trận/tầng, lịch mở tùy lúc, báo danh325 + sảnh chờ →328. USER cho tự thiết kế phần thiếu nguồn. Đề xuất Bảo vệ Nguyên Soái: PK, 5 quân hàm, 27 món chiến đấu dùng thật, soái6nhómchiêu/3phase, điểm/thưởng/hồi sinh/reconnect và cửa hàng cụ thể. Chưa viết code. | `docs/tong-kim-gameplay-proposal.md` là bản để duyệt; `docs/tong-kim-battlefield.md` + `docs/research/tong-kim-shxt-sources.md` giữ đối chiếu PAK. Không chờ tìm đủ script cũ mới thiết kế; số CHỌN chưa phải DATA/được duyệt. |
| ⬜ | SK2 | Công Thành Chiến | Tài liệu 05 §4; cần GP15 |
| ⬜ | SK3 | Võ lâm Liên Đấu | Tài liệu 05 §5 |
| ⬜ | SK4 | Vượt Ải (thách thức thời gian) | Tài liệu 05 §6 |
| ⬜ | SK5 | Phong Lăng Độ | Tài liệu 05 §7 |
| ⬜ | SK6 | Nhiệm vụ Hoàng Kim / boss hoàng kim theo giờ | Tài liệu 05 §8, 07 §5 (ví dụ "Boss Hoàng Kim 20h Phượng Tường") |
| ⬜ | SK7 | Dã Tẩu (nhiệm vụ ngẫu nhiên hằng ngày, chuỗi mốc thưởng) | Tài liệu 06 §4 |
| ⬜ | SK8 | Nhiệm vụ môn phái, tân thủ, danh vọng | Tài liệu 06 §7 |
| ⬜ | SK9 | Tính năng lặt vặt: xí ngầu, con số may mắn, Thiên Tuế | Tài liệu 05 §9; tùy chọn |
| ⬜ | SK10 | Sự kiện theo mùa (vật phẩm sự kiện, bảng rơi `christmas/`) | Cần VT8 |

## 8. Hạ tầng và nền tảng (HT)

| | Mã | Việc | Ghi chú / phụ thuộc |
|---|---|---|---|
| ✅ | | Cấu trúc lại codebase theo chủ đề / lớp, `docs/architecture.md` | Commit `d8a677b` |
| ✅ | | Yêu cầu nền tảng Web + Desktop + Mobile ghi vào `AGENTS.md` §1, `docs/ui-and-platforms.md` | |
| ✅ | | Chuyển thư mục (`study-me/jx-system-online`), tạo lại repo git (mốc `9558ad7`), bỏ toàn bộ `public/assets/` khỏi git (trừ `portraits/`) | 2026-11-12; lịch sử cũ đến `3bd96bd` mất |
| ✅ | | Bảng tên thuộc tính đọc từ exe client (`tools/jx/magicattr.ts`) thay cho mã engine đã xóa; sinh lại `docs/equipment-gold-thientu.md` (sửa 64 dòng sai) | Tin được tới mã 176 |
| ⬜ | HT1 | Đóng gói Desktop app (Electron / Tauri) và Mobile app (Capacitor / Tauri 2) | Đều chạy webview |
| ⬜ | HT2 | Thử thêm trên WebKit (app iOS bắt buộc WebKit) | |
| 🟡 | HT3 | Tài nguyên trên mobile: hơn 15 GB không đóng gói được → tải theo nhu cầu + lưu đệm | Chi tiết ở nhóm **PF** (§9): web xong PF4, còn PF6 (server thật), PF7 (Desktop / Mobile) |
| ⬜ | HT4 | Client prediction cho chính mình (hiện chỉ nội suy) | |
| ⬜ | HT5 | Interest management (`StateView`) cho bản đồ đông người | |
| ⬜ | HT6 | Lưu trữ thật (PostgreSQL), nhiều process + Redis | Hiện `apps/server/data/db.json` |
| ⬜ | HT7 | Tách `apps/client/tools/` thành workspace riêng | Tùy chọn |
| ⬜ | HT8 | Đưa kịch bản kiểm thử trình duyệt (Playwright: chụp màn, chơi thử) vào repo | Hiện viết lại mỗi phiên trong scratchpad; tùy chọn |

## 9. Hiệu năng tải tài nguyên (PF)

Người dùng yêu cầu 2026-11-13: web không tải nổi toàn bộ asset (hơn 15 GB). Hướng dẫn triển khai chi tiết từng mục: `docs/performance/`
(mục lục `README.md`; phân tích hiện trạng + **giai đoạn tải trước / chính sách lưu đệm** ở `01-hien-trang-va-chien-luoc.md`).
Thứ tự: PF1 → PF2 → PF3; PF4 song song sau PF1 (bước 1 `assetUrl()` làm sớm). Mọi việc phải chạy cho Web + Desktop + Mobile.

| | Mã | Việc | Hướng dẫn / ghi chú |
|---|---|---|---|
| ✅ | PF0 | Phân tích mã tải hiện tại; giai đoạn tải G0–G5 (lúc đầu tải gì); 3 tầng lưu đệm + chính sách theo gói | `docs/performance/01-hien-trang-va-chien-luoc.md` |
| ⬜ | PF1 | Đo lường: `performance.mark` các mốc, overlay `?perf` (byte theo loại, texture, FPS), kịch bản Playwright 2 chế độ mạng, số liệu gốc + ngân sách | `02-do-luong.md`; liên quan HT8 |
| ⬜ | PF2 | Giới hạn bộ nhớ texture: `game/assets/TextureCache.ts` đếm tham chiếu + LRU, ngân sách theo thiết bị, nhả sheet actor ngoài màn hình, pin nhân vật mình | `03-gioi-han-bo-nho-texture.md`; quan trọng nhất cho Mobile |
| ⬜ | PF3 | Bộ tải chung có ưu tiên + hủy (`game/assets/AssetLoader.ts`), giảm động tác tải trước, hình tạm (bóng / nền minimap), `S2C.mapAssets` + chờ nhân vật mình khi vào bản đồ, tải trước bản đồ kế tiếp | `04-tai-theo-uu-tien.md` |
| ✅ | PF4 | Cache + phiên bản **phần web**: `assetUrl()`, `manifest.json` theo gói (tool `gen:*` ghi, `gen:manifest`), header HTTP (`vite preview`), `build.assetsDir = 'app'`, Service Worker cache-first + LRU theo gói + ngân sách, nút xóa bộ nhớ đệm | `05-cache-va-phien-ban.md` §0; vòng 34. **Phần còn lại tách thành PF6–PF9** |
| ⬜ | PF5 | (Chưa chọn) gộp icon thành atlas; hạ chất lượng khi đông người; texture nén GPU cho mobile | README "Ngoài phạm vi" |
| ⏸ | PF6 | **Cache — server thật phục vụ asset**: chọn nginx / Caddy cạnh server game hay CDN (Cloudflare R2, S3 + CloudFront…); file mẫu `deploy/nginx.conf` hoặc `deploy/Caddyfile` theo bảng header §4 (`?v=` → immutable 1 năm, `manifest.json` no-cache, nhạc 7 ngày, ETag / Range, `/app/*` immutable); CDN thì đặt `VITE_ASSET_BASE` + CORS; build phải đặt ở gốc tên miền (CSS dùng `/assets/ui/…`) | `05-cache-va-phien-ban.md` §4, §8.1; **chờ người dùng chọn nơi phục vụ**. Hiện bản build chỉ chạy được bằng `vite preview` (không chép `public/assets` vào `dist/`) |
| ⏸ | PF7 | **Cache — Desktop / Mobile**: handler native đọc asset từ đĩa của app (§6), gói cài sẵn (bản đồ nào: chỉ Biện Kinh hay thêm các thành), tải trước bản đồ, hỏi trước khi tải gói lớn qua mạng di động; Service Worker không dùng ở đây | `05-cache-va-phien-ban.md` §6, §7 bước 9, §8.2, §8.4; **chờ HT1** (chọn bộ đóng gói, đề xuất Tauri 2) |
| ⬜ | PF8 | **Cache — đo + kiểm chứng đủ**: số liệu cache trống / đầy theo kịch bản PF1 ghi vào `02-do-luong.md` §4; các phép thử §9 chưa làm: tắt mạng vẫn tới màn đăng nhập, đi qua 4 bản đồ với ngân sách nhỏ, Safari / WebKit (hạn mức chặt hơn, HT2) | Phụ thuộc PF1; vòng 34 mới đo nhanh bằng Playwright trên localhost |
| ⬜ | PF9 | **Cache — việc nhỏ còn sót**: ảnh trong CSS `url(/assets/ui/…)` chưa có `?v=` (mỗi lần mở hỏi lại server, 304); máy khác phải chạy `gen:manifest` một lần (bản đồ chưa có trong manifest thì không được cache lâu); chưa có phép kiểm tra manifest lệch với asset trên đĩa | Tùy chọn; `05-cache-va-phien-ban.md` §0 |

## 10. Bot và hiệu năng server (BT)

Người dùng yêu cầu 2026-11-13: dự án dùng để đánh giá **hiệu suất cao và ổn định**. Cùng ngày người dùng chốt **tách hai phần**: bot =
giả lập người chơi (chạy được cả trên server dev `:2567` + `db.json` thật), đo đếm hiệu năng = công cụ riêng. Bot làm trước. Chi tiết:
`docs/bots.md`. Khác nhóm PF (tải ảnh phía client), gặp nhau ở BT7.

| | Mã | Việc | Hướng dẫn / ghi chú |
|---|---|---|---|
| ✅ | BT0 | Bot cũ giữ làm chế độ thử nhanh `npm run bots -- <số> <giây>` (`dev/bots/legacy.ts`) | `docs/bots.md` §0 |
| ✅ | BT2 | API dev `/api/dev/bots` (`DEV_TOOLS`, chỉ cùng máy, chỉ tài khoản `bot: true`): tạo theo mẫu, đặt lại, xóa, token cho runner, lưu mẫu / kịch bản; mẫu áp khi bot vào game lần đầu (`world/botSetup.ts`, hàm lệnh bài + gợi ý cộng điểm); trang `/?bots` | §2.1; chỉ desktop |
| ✅ | BT3 | `AutoPlay` chuyển sang `packages/shared/src/auto/` (+ `AutoSettings`, `approachDistance`), client + bot dùng chung | §2 |
| ✅ | BT4 | Runner `npm run bots -- <kịch bản>` đọc `bots/<tên>.json`: tốc độ vào, 6 kiểu hành vi theo tỉ lệ, hạt giống, nhịp giống người, tự vào lại, in trạng thái mỗi 10 s | §2.2 |
| ✅ | BT10 | Bot UI + roster cố định 200 nhân vật + form thiết lập theo USER | 2026-11-14: template tự tải/readonly hoặc Tự cài đặt; ba dải40–69/70–90/110–150, đồ xanh/gold, ngựa random đủ cấp và nhóm mạnh từ110, tiers đủ cấp, bỏ giới chỉ. Cập nhật hàng loạt tự khởi tạo tên chưa dùng; Lưu Thiết lập hỏi tên, không áp dụng. Dialog chọn bản đồ preview/scroll/OK, ID đăng nhập; bảng cập nhật cấp/đồ/ngựa/map/template. Command copy và scenario ID cụ thể giữ nguyên. Typecheck/build, roster tests, Chromium desktop/mobile, API và WebSocket setup xanh/gold đạt.  Bổ sungUSER: map chỉ Nâng cao, vũ khí xanh max hútSL/NL10% luôn bật, default100bình Ngũ Hoa Ngọc Lộ Hoàn, giải thích5input scenario; tests mọiweapon/hệ + WS3band đạt.  Scenario mới cùng UX template readonly/custom, bỏ duration/seed/modes cũ; grind/chat/sell đồng thời; 3–5join/s(default3), chạy liên tục; auto nhận tổ đội, chỉ rao loot6dòng/ẩn hiếm-lớn trênWorld, chốnglặp/cooldown. Browser/WS/runner/tests đạt.  USERmới: appđộc lập tools/bots:4568 khôngHMR, spawnboth,3template+dữliệu30preset/10mỗidải, chọn/chạytrựctiếpcheckbox+cộtKịchbản+Online/stopriêng. Đãthửđủ30botserverriêng, khôngDBthật. |
| ⬜ | BT1 | Phần 2 đo đếm: tick đầy đủ (cả lưu 10 s), mã hóa / gửi patch, độ trễ event loop, CPU / RAM / GC, byte mỗi client, thời gian ghi DB; `GET /api/dev/perf`; trang `/?perf` + `npm run perf` (báo cáo JSON / CSV) | §3.1 |
| ⬜ | BT9 | Kịch bản đo: bật bot theo kịch bản → chờ ổn định → ghi số đo → tăng bot tìm ngưỡng tick p99 > 50 ms; ghim CPU, cảnh báo CPU bot | §3, §3.2; sau BT1 |
| ⬜ | BT5 | Đo baseline các kịch bản chuẩn, ghi số vào `docs/bots.md` + `README.md` | §3.2 |
| ⬜ | BT6 | Sửa chỗ nghẽn theo số đo: lưới không gian cho chiêu / tìm mục tiêu, rải lưu nhân vật ngoài tick, interest management (HT5), lưu trữ (HT6) | §3.3 (suy luận, chờ số) |
| ⬜ | BT7 | Kịch bản đám đông quanh một người chơi trình duyệt cho PF1 (FPS, bộ nhớ texture) | Nối với PF1, HT8 |
| 🟡 | BT8 | Tổ đội/Chat/Ra vào game; tự cộng điểm/mặc đồ nhặt; LAN | 2026-11-14 đã có auto nhận lời mời khi luyện công + chat/rao đồ đáng chú ý khi nhặt + reconnect liên tục. Chưa có AI tổ đội chủ động, lịch online/offline, cộng điểm/mặc đồ nhặt và kiểm LAN. |

## Cài đặt máy macOS (2026-11-13)

- [x] Cài dependency và tạo cấu hình server từ mẫu.
- [x] Sinh asset trên macOS: bộ chuyển đổi từ volam-shxt, data_extract và sáu lệnh gen thành công (maps 37/140); chi tiết CURRENT.md.

- [x] Cài package và khởi động macOS: thử tạo nhân vật/vào Biện Kinh trên DB riêng; giữ bản chính ở localhost:5173 (2026-11-13).

- [x] Sửa đồng bộ bảng thuộc tính sau mặc/tháo trang bị: gửi S2C.stats khi thao tác hành trang tính lại chỉ số; đã kiểm tra mặc/đổi/tháo/mặc lại và đối chiếu reconnect (2026-11-13).

- [x] Đồng bộ bảng thuộc tính khi buff bị xóa do chết/hồi sinh: gửi snapshot cuối vòng đời (kể cả bỏ bonus cưỡi); kiểm tra mô phỏng + typecheck đạt, chưa commit (2026-11-13).

- [ ] Sinh các bản đồ còn lại trên macOS: nguồn có 299 bản đồ phân biệt, mới sinh 37/140; đã điều tra danh sách Xa phu lấy từ catalog của bản đồ đã sinh, chưa chạy toàn bộ (2026-11-13).

- [x] Phượng Tường (1) + 40 bãi Field/Cave cấp10–200: 43 bản đồ đã sinh, spawn/Auto/lưới kiểm tra đạt, trình duyệt + typecheck/build đạt; xem docs/training-maps.md (2026-11-13).

- [x] Xa phu: gộp City/Capital thành Thành thị và sửa grid thẻ khi0/1/2 kết quả; kiểm tra desktop/390px và danh sách43 cuộn được (2026-11-13).

- [x] Xa phu hiển thị cấp quái, sắp bãi tăng dần và đánh dấu vượt cấp nhân vật; dùng chung bảng cấp với tool sinh quái (2026-11-13).

- [x] USER2026-11-14 Auto/bot: fallback/xoay chiêu boss, ưu tiên boss2/1/0, ngân lượng độc lập, bán xanh có bảo vệ, tránh loot không vừa; test:auto/typecheck/build đạt, chưa QA gameplay WS và giao diện mới; chưa commit.
