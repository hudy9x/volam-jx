# Nghiên cứu: bùa lợi / bùa hại / hào quang / bị động và hiệu ứng khống chế (dữ liệu gốc)

Ngày 2026-11-12. Chỉ đọc. Ký hiệu: **VERIFIED** = đọc thẳng từ dữ liệu (file + giá trị); **INFERRED** = suy từ dữ liệu / nhãn /
tài liệu cũ (mã engine đã xóa); **web** = jx-web-main (người dùng nói sai phần khống chế + tốc độ, chỉ để đối chiếu).

Nguồn chính (đường dẫn rút gọn, gốc `jx-origin/data_extract/`):
- `slistcache/settings/skills.txt`, `missles.txt`, `npcs.txt`, `gamesetting.ini`, `attribconstdata.ini`, `magicdesc.ini`
  (nhãn đã sinh trong `packages/shared/src/skills/core/magicdesc.gen.ts`)
- `slistcache/script/skill/<phái>.lua` (+ `jx-origin/script/skill/huashan.lua` file rời, bản mod), `…/npc/帮会城堡npc.lua`,
  `…/npc/mianyi.lua`, `…/special/vn_pk_state.lua`, file rời `jx-origin/script/skill/npc/randomtask_npc.lua` (bản mod)
- `update01/settings/npc/player/basevalue.ini`, `level_add.txt`, `team_resist_effect.ini`; `update01/settings/item/magicattrib.txt`
- Bảng tên thuộc tính trong exe (`tools/jx/magicattr.ts`, 293 tên): cột "exe" dưới đây = id trong bảng đó, "—" = không có
  (thuộc tính server/mod, client không biết).

Cách đếm: chạy registry `packages/shared/src/skills` (dữ liệu sinh từ chính các bảng trên), 11 phái + common, loại trùng id,
lấy các chiêu được xếp `buff` / `debuff` / `passive` (gồm cả chiêu style 0 phát trạng thái lên đồng đội / địch, và chiêu con của
hào quang). **Lưu ý: hào quang được đếm 2 lần** (chiêu mẹ style 2 + chiêu con style 0, cùng thuộc tính, vd. 16/202 La Hán Trận).
Giá trị mẫu lấy ở cấp 20. Script và bảng kết quả: `scratchpad/research/count.ts`, `counts.tsv`, `detail.tsv`.

---

## 1. Thuộc tính mà chiêu trạng thái mang, và chỉ số tương ứng

Cú pháp (VERIFIED, `tianwang.lua` dòng 295 Kim Chung Tráo): `physicsres_p={{{1,12},{20,50}},{{1,18*120},{20,18*180}}}` →
P1 = giá trị theo cấp, **P2 = thời gian (frame, 18/giây)**, P3 = tham số phụ. P2 = **−1 = vĩnh viễn** (bị động, ngựa, thuốc
`vn_pk_state.lua`).

### 1a. Phòng thủ / kháng

| Thuộc tính | exe | Nhãn gốc (`magicdesc`) | Chỉ số | Số chiêu (buff/debuff/bị động) | Ví dụ (cấp 20) | Độ chắc |
|---|---|---|---|---|---|---|
| `physicsres_p` `coldres_p` `fireres_p` `lightingres_p` `poisonres_p` | 101–105 | "Kháng X: +%" | kháng từng hệ, cộng thẳng điểm % | 3 / 2 / 3 / 1 / 2 | Kim Chung Tráo 42: vật 50, băng 45, **hỏa −15**, độc 49, 180 s | VERIFIED |
| `allres_p` | 114 | Kháng tất cả +% | cộng vào cả 5 kháng | 4 (2 buff, 2 bị động) | Phổ Độ 332: 40 (hào quang); Dịch Cân Kinh 21: 20 | VERIFIED |
| `*resmax_p` (`physics/cold/fire/lighting/poison`) | 155–159 | "Kháng X tối đa +%" | nâng / hạ **trần** kháng | 2/1/2/1/1, toàn bùa hại | Ngũ Độc 67/64/70/72/356: −13 … −15, 90 s | VERIFIED |
| `allresmax_p` | 160 | Mức kháng tính tối đa +% | trần cả 5 | 2 | Đảo Hư Thiên 708 +5 (bị động); Đoạn Cân Hủ Cốt 390 −10 | VERIFIED |
| `adddefense_v` | 150 | Né tránh + điểm | né tránh (điểm) | 9 (6/2/1) | Thất Tinh Trận 159 +800; Phi Hồng Vô Tích 140 −1100 | VERIFIED |
| `fatallystrikeres_p` | 173 | "Kháng đòn chí mạng" | trừ vào xác suất **chí tử** của đối phương | 2 | Thanh Âm Phạn Xướng 282: 20 | VERIFIED nhãn; trừ vào chí tử = INFERRED (combat-formulas §4) |
| `manashield_p` | 149 | Nội lực hộ thân +% | % sát thương chuyển sang trừ nội lực | 2 | Tọa Vọng Vô Ngã 157: 99%, 180 s; Võ Đang Quyền Pháp 152: **−25** (bị động) | VERIFIED; cơ chế INFERRED |
| `dynamicmagicshield_v` | 191 | Nội lực hộ thân + điểm | khiên điểm | 1 | Huyền Thiên Vô Cực 630: 550 | VERIFIED nhãn; **chưa rõ** điểm/đòn hay tổng |
| `staticmagicshield_p` | 214 | (không nhãn) | khiên tuyệt đối | 1 | Lưỡng Nghi Chân Khí_Ma Pháp Độn 721: 10000 trong 180 frame; `attribconstdata [staticmagicshield_v]` xóa skill 721 khi khiên vỡ | VERIFIED dữ liệu; nghĩa 10000 = **chưa rõ** (khiên 10000 điểm?) |
| `sorbdamage_yan_p` | 260 | Triệt tiêu sát thương + (Dương) | trừ thẳng sát thương mỗi đòn | 1 (+1 Vô Cực Kiếm Khí 1381) | Long Toàn Kiếm Khí 1376: 13 | **chưa rõ** điểm hay % |
| `block_rate` | 249 | Xác suất hóa giải sát thương +% | % bỏ qua cả đòn | 1 | Đường Môn TT 1233: 100% trong 90 frame (5 s) | VERIFIED |
| `addblockrate` | — | (không nhãn) | ? | 1 | Hạo Nhiên Chi Khí 1370 | **chưa rõ** (đã ghi ở CURRENT §7) |
| `ignoreskill_p` | 201 | Xác suất bỏ qua bùa giảm kháng | % miễn bùa trong danh sách | 1 | Đảo Hư Thiên 708: 89 | VERIFIED: `attribconstdata.ini [ignoreskill_p]` danh sách 12 bùa (67,64,70,356,72,390,660,595,610,611,587,720); thành công → gắn state 724 trong 15 frame |
| `returnskill_p` | 202 | Xác suất phản đòn bùa chú | % phản lại bùa | 1 | Đại Thừa Như Lai Chú 709: 56 | VERIFIED: `[returnskill_p]` 46 bùa (gồm toàn bộ bùa Thiên Nhẫn / Côn Lôn / Ngũ Độc), state 725 trong 25 frame |
| `returnres_p` | 215 | Kháng phản đòn +% | giảm sát thương phản đòn nhận lại | 1 | Huyền Thiên Vô Cực 630: 30 | VERIFIED nhãn |
| `ignorenegativestate_p` | 211 | (không nhãn) | miễn trạng thái xấu | 3 | Du Long Chân Khí 1231: 100, 54 frame; Xuất Ứ Bất Nhiễm 716: 1/18 | VERIFIED dữ liệu; P1 = 1 vs 100 **chưa rõ** (cờ hay %) |

### 1b. Tấn công

| Thuộc tính | exe | Nhãn | Chỉ số | Số chiêu | Ví dụ | Độ chắc |
|---|---|---|---|---|---|---|
| `addphysicsdamage_p` | 126 | Sát thương vật lý – ngoại công +% | % STVL; **P3 = loại vũ khí** | 24 (19 bị động) | Thiên Vương Thương pháp 23: 315/−1/**3**; Đường Môn ám khí 43: 215/−1/**7**; La Hán Trận 16: 135/18/**6**; Lịch Ma Đoạt Hồn 143: **−215**/2160/6 | VERIFIED giá trị; P3 = vũ khí INFERRED (0 kiếm, 1 đao, 2 côn, 3 thương/mâu, 4 chùy, 7 ám khí, 9 tay không?, 6 = mọi vũ khí?) |
| `deadlystrikeenhance_p` | 146 | Tăng tấn công chí mạng +% | cộng vào **xác suất chí mạng** của mọi đòn | 24 (21 bị động) | Côn Lôn Đao 167: 50; Nhiếp Hồn Loạn Tâm 391: −35 | VERIFIED nhãn; cộng thẳng vào `deadlystrike_p` = INFERRED |
| `attackratingenhance_p` | 167 | Tỉ lệ công kích chính xác +% | % chính xác | 14 | Thất Tinh Trận 159: 500; Ảo Ảnh Phi Hồ 137: −132 | VERIFIED |
| `attackspeed_v` / `castspeed_v` | 115/116 | Tốc độ đánh ngoại / nội công +% | tốc đánh (frame = 18·100/(100+x), combat-formulas §6.1) | 9 / 8 | Tuyết Ảnh 109: 65/65; Khi Hàn Ngạo Tuyết 175: cast −39 | VERIFIED nhãn; công thức INFERRED |
| `addXdamage_v` (phys/cold/fire/lighting/poison) | 121–125 | X sát – ngoại công + điểm | cộng vào đòn ngoại công | cold 4, fire 2, lighting 2, poison 2 | Như Lai Thiên Diệp 273: băng 144; Tâm Nhãn 48: độc 6/−1/**10** (P3 = chu kỳ) | VERIFIED |
| `addXmagic_v` | 168–172 | X sát – nội công + điểm | cộng vào đòn nội công | cold 5, fire 5, lighting 3, poison 2, phys 1 | Võ Đang Quyền Pháp 152: lôi 915; Giáng Long Chưởng 274: hỏa 750 | VERIFIED |
| `coldenhance_p` | 161 | **"Thời gian trì hoãn +%"** | kéo dài **thời gian chậm** gây ra | 3 | Băng Cốt Tuyết Tâm 114: 55; NPC `npccolden1` 300→600% trong 30 s | VERIFIED nhãn (không phải tăng băng sát) |
| `fireenhance_p` | 162 | Hỏa sát **tối đa** +% | tăng mức trên của hỏa sát | 1 | Thiên Ma Giải Thể 150: 76 | VERIFIED nhãn |
| `lightingenhance_p` | 163 | Lôi sát **tối thiểu** +% | tăng mức dưới của lôi sát | 1 | Thái Cực Thần Công 166: 71 | VERIFIED nhãn |
| `poisonenhance_p` | 164 | Thời gian độc phát ~% | rút chu kỳ độc? | 0 (bị comment trong `tangmen.lua:93`, `wudu.lua:163`) | — | nhãn VERIFIED, nghĩa **chưa rõ** |
| `anti_fireres_yan_p`, `anti_lightingres_yan_p` | — | bỏ qua X phòng đối phương −% (dương) | xuyên kháng | 1 / 1 | Thiên Hành Khí Công 1237: 20; Tiên Thiên Cương Khí 1239: 15 | VERIFIED nhãn; mod |
| `enhance_714_auto`, `enhance_717_auto` | 186/187 | Xác suất phát chiêu [..] +% | tăng % tự phát của chiêu 714 / 717 | 1 / 1 | 20 / 15 | VERIFIED |
| `addskilldamage1` (trên state) | 222 | — | % sát thương cộng cho chiêu khác | 1 | Long Toàn Kiếm Khí 1376: chiêu 1382 +60% | VERIFIED dữ liệu |
| `steallife_p` / `stealmana_p` | 63/64 (exe) | Hút sinh / nội lực % | hút theo phần vật lý | chỉ có trên **chiêu tấn công** (3 / 6), không có bùa | Vân Long Kích 361: 16 | VERIFIED |

### 1c. Sinh lực, nội lực, hồi phục, phản đòn

| Thuộc tính | exe | Nhãn | Số chiêu | Ví dụ | Ghi chú |
|---|---|---|---|---|---|
| `lifemax_p` | 86 | Sinh lực tối đa +% | 6 | Phật Tâm Từ Hữu 92: 125 (hào quang, P2 = 144 frame); Giáng Long Chưởng 274: **−25** | VERIFIED |
| `lifemax_yan_p` | 257 | Sinh lực tối đa +% (Dương) | 14 | Thiên Vương Chiến Ý 36: 98 | luôn đi cặp với bản thường; **"_yan_" chưa rõ nghĩa** (nhóm cộng riêng? không tính vào trần?) |
| `manamax_p`, `manamax_yan_p` | 90 / 259 | Nội lực tối đa +% | 2 / 2 | Thái Cực Thần Công: 172 / 127 | VERIFIED |
| `lifereplenish_v` | 88 | Phục hồi sinh lực **mỗi nửa giây** + điểm | 5 (+ chiêu hồi máu) | Mộng Điệp 89: 15 (hào quang); Bắc Minh Đáo Hải 393: −15; Từ Hàng Phổ Độ 93: 750 trong 36 frame | nhãn VERIFIED; Từ Hàng = 4 nhịp × 750 hay hồi 1 lần: **chưa rõ** |
| `manareplenish_v` | 92 | Phục hồi nội lực mỗi nửa giây | 9 | Mộng Điệp 10; Hoa Sơn `−10000` (khóa hồi nội) | VERIFIED |
| `manareplenish_p` | — | Nâng cao hiệu suất hồi nội lực +% | 3 | Hoa Sơn −200 | mod |
| `lifereplenish_p` | 200 | Hồi phục sinh lực +% | 1 | Đảo Hư Thiên 708: 35 | **chưa rõ** (% gì; có `enhance_708_life_p` "xác suất phục hồi" → có thể là xác suất) |
| `meleedamagereturn_p` / `rangedamagereturn_p` | 118/120 | Phản đòn cận chiến / tầm xa +% | 7 / 8 | Minh Kính Vô Di 1230: 50/50 trong 15 s; Hỏa Liên Phần Hoa 136: −35 | VERIFIED |
| `poisondamagereturn_p` | 204 | Phản đòn khi trúng độc +% | 1 | Đại Thừa Như Lai Chú: 45 | VERIFIED |
| `damage2addmana_p` | 134 | Chuyển sát thương thành nội lực +% | 2 | Âm Dương Khí Quyết 1238: 200 | VERIFIED |
| `rangedamagereturnmana_p`, `manatoskill_enhance` | — | (không nhãn) | 1 / 1 | Hoa Sơn 1378 / 1379 | mod, **chưa rõ** |

### 1d. Di chuyển, khống chế, đặc biệt

| Thuộc tính | exe | Nhãn | Số chiêu | Ví dụ | Ghi chú |
|---|---|---|---|---|---|
| `fastwalkrun_p` | 111 | Tốc độ di chuyển +% | 11 (7 buff, 3 debuff) | Lưu Thủy 86: +66 (hào quang); Vô Hình Độc 69: −42 (hào quang địch, P2 36); Ki Bán Phù 174: −52, 90 s; NPC `npcrun` −10→**−120** | VERIFIED; tốc = gốc × (100+x)/100 kẹp ≥ 0: INFERRED |
| `fasthitrecover_v` | 113 | Thời gian phục hồi ~ | 4 | Thanh Âm 282: 20; Thiên Ma Giải Thể 150: 40; Bi Tô Thanh Phong 364: −30 | đơn vị **%** (INFERRED, xem §3c) |
| `fasthitrecover_yan_v` | 268 | Thời gian phục hồi ~ (Dương) | 5 | Băng Cốt Tuyết Tâm 114: 33 | như trên |
| `freezetimereduce_p` / `stuntimereduce_p` / `poisontimereduce_p` | 106/110/108 | Thời gian làm chậm / choáng / trúng độc ~% | 4 / 4 / 3 | Thanh Âm 282: 30/30/30; Mê Tung Ảo Ảnh 90 & Túy Tiên Tá Cốt 394: −50/−50; Vạn Độc Thực Tâm 73: độc **−200** | VERIFIED; âm = kéo dài |
| `anti_do_hurt_p` | — | tỷ lệ sát thương giảm kháng % | 1 (+1 Vô Cực Kiếm Khí) | Long Toàn Kiếm Khí 1376: 5 | mod; nghĩa INFERRED: giảm xác suất bị co giật |
| `stun_p` (trên bùa) | 72 | Làm choáng % | 2 | Thái Cực Kiếm Ý 371: 20%/10 frame; Khí Tâm Phù 181: 35%/36 frame | VERIFIED |
| `randmove` | 209 | (không nhãn) | 1 (+ Ma Âm Kích 1131) | Ma Âm Phệ Phách – Hoảng loạn 723: P2 72 frame (4 s) | VERIFIED dữ liệu; hiệu ứng = chạy lung tung (INFERRED) |
| `missle_missrate`, `missle_hitcount` | 21/22 | — | 4 / 1 | Du Long Chân Khí 1231: 20; 723: 15 / 6 | **chưa rõ** (tham số đạn của chiêu, không phải chỉ số người) |
| `poison2decmana_p` | 212 | Hạ độc, giảm #d1% nội lực trong #f2 giây | 1 | Hấp Tinh Yểm_Quyết Chú 719: 85%, 108 frame | VERIFIED nhãn |
| `hide` | 210 | Ẩn thân #f2 giây, ra chiêu hiện hình | 2 | Ngự Tuyết Ẩn 713: 540 frame; Dung Tuyết Vô Tung 1235: 90 frame | VERIFIED; `attribconstdata [hide]` độ trong suốt 70/255, xóa skill 713/1235/1258/1267 khi hiện hình |
| `walkrunshadow` | — | — | 1 | Huyễn Nhãn Vân Yên 1358 | mod, hình bóng chạy (INFERRED) |
| `skill_mintimepercast_v` (+ `…onhorse`) | 3/10 | Thời gian khôi phục chiêu #f1 giây | 4 | Ngự Tuyết Ẩn 713: 720 frame | thuộc tính của chiêu (hồi chiêu), không phải chỉ số |
| `skill_appendskill` | 11 | Gồm kỹ năng: #l1 | 1 | Bế Nguyệt Phất Trần 712 → 332 (bật 2 hào quang) | VERIFIED |
| `autoattackskill` / `autoreplyskill` / `autorescueskill` / `autodeathskill` | 206/205/207/208 | Khi bị trúng đòn có xác suất … | 5 / 9 / 3 / 2 | Thất truyền 122x | VERIFIED; đã có `triggersOf` |

Tổng hợp mức xuất hiện (top): `addphysicsdamage_p` 24, `deadlystrikeenhance_p` 24, `attackratingenhance_p` 14, `lifemax_yan_p` 14,
`fastwalkrun_p` 11, `adddefense_v` 9, `attackspeed_v` 9, `manareplenish_v` 9, `rangedamagereturn_p` 8, `castspeed_v` 8,
`meleedamagereturn_p` 7, `lifemax_p` 6 (bảng đầy đủ 88 dòng: `counts.tsv`).

**Không xuất hiện trên bùa của 11 phái** (chỉ có ở trang bị / NPC / mod): `do_hurt_p`, `do_stun_p`, `anti_do_stun_p`, `anti_hitrecover`,
`me2Xdamage_p`/`X2medamage_p`, `five_elements_*`, `burntimereduce_p`, `frozen_action`/`forbit_attack` (chỉ Vô Cực Kiếm Khí · Nổ 1411:
`frozen_action` 1/6/1), `nomovespeed`, `statusimmunity_b`, `badstatustimereduce_v`.

---

## 2. Thời gian trạng thái, làm mới, cộng dồn, hào quang

| Mục | Kết luận | Bằng chứng | Độ chắc |
|---|---|---|---|
| Cột thời gian | **P2 của từng thuộc tính**, đơn vị frame (18/s). Không có cột `skill_statetime` trong `skills.txt` (header 114 cột đã kiểm) | `tianwang.lua:295` `{{1,18*120},{20,18*180}}`; `skills.txt` header | VERIFIED |
| Vĩnh viễn | P2 = −1 (bị động, thuốc, ngựa) | `emei.lua:140` `{{1,-1},{2,-1}}`; `vn_pk_state.lua` | VERIFIED |
| Các mốc P2 thường gặp | 18 (1 s, hào quang), 36, 54, 72, 90, 108, 144, 162 (9 s), 270 (15 s), 540 (30 s), 1620 (90 s), 2160 (120 s), 3240 (180 s), 4990, 6480, 10800 | `detail.tsv` | VERIFIED |
| Ngoại suy | Đường cong nối thẳng **và kéo dài quá điểm cuối** (`Link` trong lua). Ví dụ Huyễn Nhãn Vân Yên `{{1,60*18},{2,180*18}}` → cấp 20 = 42 120 frame (39 phút) | `huashan.lua:173`, hàm `Link` trong `randomtask_npc.lua` | VERIFIED (dữ liệu lạ, có thể ý tác giả mod là 60→180 s) |
| Một chiêu có nhiều P2 khác nhau | Thiên Ma Giải Thể 150: phần lớn 4990, `fasthitrecover_v` 6480, `lifemax_yan_p` 2402 → **mỗi thuộc tính hết hạn riêng** | `detail.tsv` | dữ liệu VERIFIED; hết hạn riêng = INFERRED (dự án hiện lấy max) |
| Làm mới / cộng dồn | Cùng skill id: thay bằng cấp mới + đặt lại thời gian. Khác skill id: các thuộc tính cùng tên **cộng đại số**. Hào quang: chỉ 1 hào quang mỗi người; Bế Nguyệt Phất Trần 712 là ngoại lệ (`skill_appendskill`=332) | 712 VERIFIED; phần còn lại theo cách engine JX1 thường làm, không có dữ liệu | INFERRED |
| `StatePriority` (`skills.txt`) | 2 = hào quang, 3 = bùa tự buff / bùa hại, 4 = trạng thái đặc biệt (721, 723, 724, 725), 0 = chiêu mới | `skrows.tsv` | giá trị VERIFIED; dùng để chọn hình trạng thái nào vẽ = INFERRED |
| Phóng hào quang | Chiêu mẹ style 2 `IsAura=1` + `ChildSkillId` (vd. 16 → 202, 86 → 206, 69 → 203); chiêu con style 0 bắn đạn 92 "Vòng tròn hỗ trợ đồng đội" (form 3, `IsRangeDmg=1`, `DmgRange=10` ô, life 2) | `skills.txt`, `missles.txt` | VERIFIED |
| Bán kính hào quang | đạn 92: **10 ô**; đạn 137 (Phổ Độ Chúng Sinh): **14 ô**; hào quang địch Vô Hình Độc đạn 94: 8 ô (`IsRangeDmg=0`, `CanColFriend=0`). `AttackRadius 180` là tầm chiêu, không phải bán kính | `missles.txt` | VERIFIED; 1 ô = 32 px logic (`tuning.CELL`) = INFERRED |
| Ai nhận hào quang | Chiêu con `TargetAlly=1, TargetSelf=1` (đồng đội = tổ đội/cùng phe, INFERRED); Vô Hình Độc `TargetEnemy=1` | `skills.txt` | VERIFIED cờ |
| Nhịp hào quang | Trạng thái do hào quang gắn có P2 = 18 frame (1 s), riêng Phật Tâm Từ Hữu 144, Long Toàn 15 → nhịp phát ≤ 1 s. Nhịp thật không có trong dữ liệu (dự án đang dùng `AURA_PULSE_MS` 1000) | `detail.tsv` | INFERRED |
| Bùa lên người khác | Bất Động Minh Vương 15 → đạn 76 (10 ô quanh người dùng); Thanh Phong Phù 171 → đạn 19 (3 ô quanh mục tiêu); bùa hại 67/90/174/364… → đạn 20 (3 ô, form 6 = tại mục tiêu) | `missles.txt` | VERIFIED |

---

## 3. Hiệu ứng khống chế

### 3a. Choáng (`stun_p`)

| Mục | Dữ liệu | Độ chắc |
|---|---|---|
| Tham số | P1 = xác suất %, P2 = thời gian (frame) | VERIFIED (nhãn "Làm choáng #d1%", npc `npcstun` `{{1,18*6}}`) |
| Chiêu phái (cấp 20) | Sư Tử Hống 20: 65%/27; Đoạn Hồn Thích 40: 35%/18; Long Trảo 271: 5%/5; Kim Cang Chưởng 1055: 8%/5; Võ Đang 164: 55/20, 165: 20/10, 267: 10/10, 365: 20/6, 1078: 30/6, 1107: 24/10, Thái Cực Kiếm Ý 371: 20/10; Côn Lôn 176: 15/20, 372: 25/12, 1080: 30/12, 1081: 35/20, Khí Tâm Phù 181: 35/**36**; Đường Môn bẫy 349/351/1113: 20/20 | VERIFIED |
| NPC | `npcstun` 10→50%, 6 s (`帮会城堡npc.lua`); `randomtask_npc.lua` (mod) 10→40%, 3 s; `npcstundam` 2 s | VERIFIED |
| Hình | `gamesetting.ini [SYSTEM] STUNID=50` → Status50 `mag_spe_眩晕.spr` | VERIFIED |
| Giảm | `stuntimereduce_p` (trang bị 20/30/40, ID 110); `anti_stuntimereduce_p` "Tạo thành thời gian choáng +%" (người đánh); `stunenhance_p` "Làm choáng +%"; mod `do_stun_p` / `anti_do_stun_p` (xác suất) | nhãn VERIFIED |
| Công thức | thời gian = P2 × (100 − giảm)/100, chỉ khi chưa choáng (combat-formulas §5) | INFERRED (mã đã xóa) |

### 3b. Làm chậm (băng)

| Mục | Dữ liệu | Độ chắc |
|---|---|---|
| Tham số | `colddamage_v` P1 min, **P2 = thời gian chậm (frame)**, P3 max | VERIFIED |
| Chiêu phái có P2 | **Chỉ Đường Môn bẫy** (Hàn Băng Thích 345/346, Loạn Hoàn Kích 351/352, 1113): `[2]={{1,1},{20,18}}` (`tangmen.lua:199,229`); NPC `chunniu.lua` 4 chỗ cùng dạng; `randomtask_npc` `npccolden` 2→14, `npccoldendam` 18 | VERIFIED |
| Nga My / Thúy Yên / Thiếu Lâm | `colddamage_v` **không có [2]** (vd. `emei.lua:18`) → thời gian chậm phải là mặc định của engine. Trang bị băng sát (ID 123) cũng để P2 = −1 (`magicattrib.txt`) | VERIFIED rằng thiếu; giá trị mặc định **không có trong dữ liệu** |
| Kéo dài / giảm | `coldenhance_p` "Thời gian trì hoãn +%" (người đánh): Nga My 252 lên 37, Thúy Yên 114 lên 80 (cấp 30), NPC `npccolden1` 300→600%; `freezetimereduce_p` (người nhận, trang bị 20/30/40, dòng 40% tên "不可冻结") | VERIFIED |
| Trần giảm | `gamesetting.ini [ServerConfig] FreezeTimeReduceMax=77` (cả `slistcache` và `update03`) | VERIFIED giá trị; nghĩa = trần `freezetimereduce_p` của người chơi INFERRED. Mã engine (đã xóa) dùng 95 khi giảm ≥ 100 — không kiểm lại được; **ưu tiên 77 vì là dữ liệu server** |
| NPC miễn | `mianyi.lua`: freeze 2000, stun 2000, poison 3000, fasthitrecover 1000, fatallystrikeres 1000, phản đòn 80, P2 −1 | VERIFIED |
| Mức giảm tốc | **Không có số nào trong dữ liệu** (đã tìm `gamesetting.ini`, `basevalue.ini`, `attribconstdata.ini`, `missles.txt` cột `CanSlow` chỉ là đạn bị `slowmissle_b` làm chậm). Engine JX1 theo trí nhớ: NPC đang chậm chỉ chạy logic ở frame chẵn → **50%** mọi động tác | INFERRED (không kiểm chứng được); web: 75%·D/(D+200), người dùng nói sai |
| Chậm khác băng | Bùa giảm tốc riêng: `fastwalkrun_p` âm (Vô Hình Độc −42, Ki Bán Phù −52, NPC −120), `castspeed_v` âm (Khi Hàn Ngạo Tuyết −39), `attackspeed_v`/`castspeed_v` −10→−50 (`npcattack`) | VERIFIED |

### 3c. Co giật (thọ thương)

| Mục | Dữ liệu | Độ chắc |
|---|---|---|
| Khung bị thương | người chơi `HurtFrame=12` (`basevalue.ini [Common]`); quái `npcs.txt HurtFrame`: 10 (471), 12 (243), 14 (158), 15 (107), 13 (104), trống 920 | VERIFIED |
| Xác suất | `skills.txt DoHurt`: 0 (1286 dòng), 80 (41), 100 (30), 60 (25), 10 (16), 40 (14)…; `skill_dohurt` ghi đè (Tiểu Lý Phi Đao 249: 53) | VERIFIED; DoHurt = % INFERRED |
| Phục hồi | quái `HitRecover`: 100 (710), 50 (548), 400 (45), 10 (34), trống 816; người chơi gốc 6% (combat-formulas §1.4, mã) | dữ liệu VERIFIED; số khung = HurtFrame × (100 − phục hồi)/100, ≥ 100 không co giật: INFERRED → nghĩa là **710 quái có HitRecover 100 không bao giờ co giật** (cần người dùng xác nhận) |
| Giảm / tăng | `fasthitrecover_v` (ID 113, trang bị 20/30/40 chỉ áo), bùa ±; `anti_hitrecover` (exe id 243 — **có** trong exe, tài liệu cũ nói không), nhãn "Tạo thành sát thương có thời gian hoạt động +" | VERIFIED nhãn; đơn vị % / frame **chưa chốt** |

### 3d. Độc

| Mục | Dữ liệu | Độ chắc |
|---|---|---|
| Tham số | `poisondamage_v` P1 = sát thương mỗi nhịp ("điểm/lần"), P2 = tổng thời gian, P3 = chu kỳ | nhãn VERIFIED, P2/P3 INFERRED |
| Giá trị phái (cấp 20) | hầu hết `x/60/10` (6 nhịp trong 3,3 s); Độc Thích Cốt 303: 40/**100**/10; Loạn Hoàn Kích 351: 80/**50**/10 | VERIFIED |
| Cộng từ đồ / bị động | `addpoisondamage_v` P3 = 10/11 (`tangmen.lua:91`, `wudu.lua:162`); trang bị ID 125 P1 1–50, P2 −1, P3 0 | VERIFIED |
| Trần | `gamesetting.ini [ServerConfig] PlayerPoisonDamageMax=600`, `NpcPoisonDamageMax=123456` | VERIFIED giá trị; = trần sát thương độc mỗi nhịp khi gộp độc lên người chơi / quái: INFERRED |
| Giảm / kéo dài | `poisontimereduce_p` (Vạn Độc Thực Tâm 73: −200 trong 120 s); `poisondamagereduce_v` (trừ mỗi nhịp); `anti_poisontimereduce_p`; `poisonenhance_p` (đã comment) | VERIFIED |
| Gộp | công thức gộp trọng số ở combat-formulas §5 | INFERRED |

### 3e. Khác: Hỏa không có hiệu ứng (`burntimereduce_p` id 107 có trong exe nhưng không dùng); `knockback_p` không chiêu nào dùng;
`frozen_action` chỉ ở Hoa Sơn 1411 (1/6/1); `randmove` 723 (4 s), Ma Âm Kích 1131 (5 frame).

---

## 4. Kháng, ngũ hành, chí mạng, chí tử, trúng

| Mục | Dữ liệu | Độ chắc |
|---|---|---|
| Kháng gốc theo hệ | `level_add.txt` (cột fire/cold/poison/lighting/physic): Kim −25/0/+25/0/0; Mộc 0/0/0/+25/−15; Thủy +25/0/0/−25/0; Hỏa 0/−25/0/0/+15; Thổ 0/+25/−25/0/0 | VERIFIED (bản `update01`) |
| Kháng tổ đội | `team_resist_effect.ini`: thành viên hệ X cho đồng đội +3 kháng (hệ bị khắc +10) | VERIFIED |
| Trần người chơi | 75% (đồ `*resmax_p`/`allresmax_p` nâng), tuyệt đối 95% | INFERRED (mã + web); không có trong dữ liệu |
| Sàn kháng | `gamesetting.ini [TRANSLIFE] MinPhyResist=-18, MinWoodResist=-11, MinWaterResist=-18, MinFireResist=-18, MinEarthResist=-18` | VERIFIED giá trị; nghĩa (sàn kháng nhân vật trùng sinh?) **chưa rõ** |
| Trần quái | `npcs.txt *ResistMax`: 95 (504), 75 (450), 85 (107), 80 (69), 90 (60), 60 (46); kháng dạng `A|B` (0|243, 0|100, 0|0.5…) là tham số `npclevelscript` | VERIFIED |
| Ngũ hành của chiêu | `seriesdamage_p` (exe 75) trên 169 chiêu tấn công: 80 (50 chiêu), 60 (39), 50 (32), 10 (31), 30 (27) theo bậc chiêu | VERIFIED giá trị; = % khắc chế cộng/trừ vào kháng (combat-formulas §4) INFERRED |
| Ngũ hành mở rộng | `five_elements_enhance_v` / `five_elements_resist_v` (exe 269/…; nhãn "cường hóa / nhược hóa khắc chế"), `me2Xdamage_p` / `X2medamage_p` (mod, không có trong exe), `anti_maxres_p` (exe 265, "làm đối phương có kháng tất cả +%") | nhãn VERIFIED; không bùa phái nào dùng |
| Chí mạng | `deadlystrike_p` (exe 70) trên 68 chiêu: 25–30 phổ biến, max 80 (Đoạn Hồn Thích, Ma Âm Kích); `deadlystrikeenhance_p` cộng từ bị động 11–50. Hệ số ×2 phần vật lý | giá trị VERIFIED; ×2 INFERRED (mã + web). **Dự án đang để `CRIT_MULT = 1.5`** |
| Chí tử | `fatallystrike_p` (exe 71): Ma Diệm Thất Sát 148: 50, Tật Hỏa Liệu Nguyên 1076: 30, Độc Cô Cửu Kiếm 1368/1421: 50; chống: `fatallystrikeres_p` (Thanh Âm 20, NPC miễn 1000). Hiệu ứng 30–50% sinh lực hiện tại | giá trị VERIFIED; hiệu ứng INFERRED (mã) |
| Trúng | `attackrating_p` trên 21 chiêu (50–595%), `ignoredefense_p` 16 chiêu (20–90%), `IsUseAR`; **sàn / trần tỉ lệ trúng không có trong dữ liệu** (mã: 40–95, hằng 5 không dùng) | INFERRED |

---

## 5. Hằng số sát thương có trong dữ liệu

| Hằng số | Giá trị | Nguồn | Độ chắc |
|---|---|---|---|
| Frame | 18/s | script `18*120` | VERIFIED |
| Khung đánh / xuất chiêu / bị thương | 18 / 18 / 12 | `basevalue.ini` | VERIFIED |
| Tốc chạy / đi người chơi | 10 / 5 | `basevalue.ini` | VERIFIED |
| Sinh / nội / thể theo cấp, theo Sinh khí, Nội công | `level_add.txt` (vd. Kim LifePerLevel 4, LifePerVitality 8, ManaPerEnergy 1; Thổ 1/3/4) | bản `update01` | VERIFIED |
| Sức mạnh → STVL, Thân pháp → ám khí, Nội công → nội công | **không có trong dữ liệu** (web cũ: Sức mạnh ÷ 5; jx-web: Thân pháp ÷ 5, Nội công ×(1+NC/500) đang tắt) | — | INFERRED / web |
| Trần độc mỗi nhịp | người chơi 600, NPC 123456 | `gamesetting.ini [ServerConfig]` | VERIFIED |
| Trần giảm chậm | 77 | như trên | VERIFIED |
| Tỉ lệ PK | `settings/npc/player/pkrate.ini [PK] rate=20` (file rời, bản mod) | nghĩa **chưa rõ** (không chắc là % sát thương PK) |
| Ẩn thân | độ trong suốt 70/255 | `attribconstdata.ini [hide]` | VERIFIED |
| Bỏ qua / phản bùa | state 724 15 frame / 725 25 frame + danh sách | `attribconstdata.ini` | VERIFIED |

---

## 6. Thuộc tính chưa rõ nghĩa (cần người dùng / thử nghiệm)

1. Họ `*_yan_*` ("Dương"): `lifemax_yan_p`, `manamax_yan_p`, `fasthitrecover_yan_v`, `attackspeed_yan_v`, `sorbdamage_yan_p`, `allres_yan_p`,
   `anti_*res_yan_p`: luôn đi cặp với bản thường; khác gì (cộng riêng, không tính trần, chỉ PvP?) không có dữ liệu.
2. `sorbdamage_yan_p` (điểm hay %), `dynamicmagicshield_v`, `staticmagicshield_p` = 10000.
3. `addblockrate`, `rangedamagereturnmana_p`, `manatoskill_enhance`, `walkrunshadow` (mod Hoa Sơn, không có trong exe, không nhãn).
4. `ignorenegativestate_p` P1 = 1 (Xuất Ứ) vs 100 (Du Long); `lifereplenish_p` (Đảo Hư Thiên); `missle_missrate` / `missle_hitcount` trên bùa.
5. `poisonenhance_p` "Thời gian độc phát ~%" (bị comment, không dùng).
6. P3 của `addphysicsdamage_p` (loại vũ khí): 6 và 9 cần xác nhận.
7. Thời gian chậm mặc định khi `colddamage_v` không có P2 (mọi chiêu Nga My / Thúy Yên / Thiếu Lâm) và mức giảm tốc — không có trong dữ liệu.
8. `HitRecover = 100` trên 710 quái: có phải miễn co giật hoàn toàn không.
9. `Từ Hàng Phổ Độ` 750 / 36 frame: hồi 1 lần hay 4 nhịp.

## 7. Ghi chú cho dự án

- Code hiện tại (`category.ts` `stateDurationMs`) lấy **max P2** cho cả trạng thái; dữ liệu có chiêu mỗi thuộc tính một thời gian (150, 1376, 1358).
- `damage.ts` dùng `CRIT_MULT 1.5`, kháng kẹp cứng 0.75, ngũ hành mặc định 25%: lệch với dữ liệu / tài liệu (×2, trần theo `*resmax`, `seriesdamage_p` thật).
- jx-web-main: chậm 75%·D/(D+200), choáng 0,8 s cố định, độc 40% đòn, bùa không thời gian — **không dùng**, khác hẳn tham số gốc ở trên.
