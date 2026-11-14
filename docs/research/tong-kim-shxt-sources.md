# Tống Kim SHXT — sổ đối chiếu nguồn PAK

> Kiểm tra 2026-11-14, đọc nguyên bản; không ghi vào client. Tài liệu chính: [Chiến trường Tống Kim](../tong-kim-battlefield.md).

## 1. Cách đối chiếu

Client: `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`. Tra `_manifest.tsv` các gói, chỉ lấy dòng `status=ok`, `overridden_by` rỗng; tra tên trước, fallback hash Kingsoft bằng `apps/client/tools/jx/hashindex.ts resolveAny`. Tiếng Việt TCVN3, phần tên/cấu hình tiếng Trung GBK. Không đọc config.ini. Hash dưới đây là SHA-256 của byte nguồn, để nhận biết thay đổi bộ dữ liệu.

Bảng loose không ưu tiên hơn PAK. Chưa tìm thấy nhóm script điều phối `script/battles/battlehead.lua`, `battleinfo.lua`, `battle.lua`, `battlemission.lua`, `timer.lua`, `baoming.lua`, `mission.lua` qua tên/hash; đây là giới hạn nguồn, không phải bằng chứng rằng chúng không tồn tại ở server gốc.

## 2. File đã đối chiếu

| Đường dẫn game | File vật lý (tương đối client) | SHA-256 |
|---|---|---|
| `settings/maplist.ini` | `data_extract/slistcache/_unnamed/dat/44595ead.dat` | `7f6f2a649b931645c2e0d81d87010ca6eebbb1ddedf84ab3ea4f518a616f27c2` |
| `settings/item/004/magicscript.txt` | `data_extract/slistcache/_unnamed/dat/61dbe5a6.dat` | `566851e8f8e2c568da53827065d25289c5160bd668ae35beba1d8fa35dc46858` |
| `settings/skills.txt` | `data_extract/slistcache/_unnamed/dat/ec1243ff.dat` | `98125f477781f9836e5028e908a309e75085d3456cebaf48ff6c67638fde1ec4` |
| `settings/npcs.txt` | `data_extract/slistcache/_unnamed/dat/38ebcb17.dat` | `f3d139fc6c4a1d1178a9d14fdaf9802b8eeaf9695ed887c9c89f11e00f494c95` |
| `script/missions/battle/protocol_c.lua` | `data_extract/slistcache/_unnamed/dat/8bf94d8f.dat` | `11154bd272e88249c086f93df2059afc9141cf6315baecf4966de042d70a27da` |
| `script/item/battles/rescript.lua` | `data_extract/update01/_unnamed/dat/326b3047.dat` | `252337d0d316e2240057bdc27553fe5405a3189d6fa8e0f8387a3de7f301924f` |
| `script/item/checkmapid.lua` | `data_extract/update01/_unnamed/dat/356641df.dat` | `ef7701d2a37a0aec286c491267a05d3a17e09d9c1d1f01a74d0c58abaf6c0a5c` |
| `settings/battles/maps/plain/mapinfo.txt` | `data_extract/update01/_unnamed/dat/9632fa6d.dat` | `aba8f1206a9eeb87c600d7d3e0e53b7d4720d73ce0650ce5b96a068e01fa9b6c` |
| `settings/battles/maps/plain/后营2.txt` | `data_extract/update01/_unnamed/dat/3a6824a1.dat` | `dd2c11c21f599ca1e432ec9873958718b147cc0f60e359770547f3648872dcaf` |
| `settings/battles/maps/plain/后营4.txt` | `data_extract/update01/_unnamed/dat/30af632d.dat` | `be1d1415de756580ee8fae26a9b19e6a9cfb21c8c9054e76e3d22b4a845bc181` |
| `settings/battles/maps/plain/大营2.txt` | `data_extract/update01/_unnamed/dat/8c0655f0.dat` | `64b1b4688bb2a0ef0ffb004ae5ce94909c12562a1ffe1c0830ed21a1ee75fee7` |
| `settings/battles/maps/plain/大营4.txt` | `data_extract/update01/_unnamed/dat/8a44907c.dat` | `addd8429243c89feb145a3108c562c154f2582b26f19ec621860d4318477fada` |
| `script/skill/battles/sj_guanxian.lua` | `data_extract/update01/_unnamed/dat/83c83020.dat` | `9029f3f80abab82b549a21bdd7342c837608f87aef76d92493a883a477b1c77f` |
| `script/skill/battles/wardrum.lua` | `data_extract/slistcache/_unnamed/dat/43245d3e.dat` | `4d8ed2753c55f642033154d0a34673fc518205b78f33712f667f3c9ded0a4648` |
| `script/skill/battles/token.lua` | `data_extract/slistcache/_unnamed/dat/c92847b4.dat` | `4f2ef3d716af371e28d37de29d22ee818b77baf372795743dbce3201107412f0` |
| `script/skill/battles/alldamage.lua` | `data_extract/update01/_unnamed/dat/e649c2a6.dat` | `04e3ad19f74c6070211cc99b9689bf258e554d42c0d8693cbac412c7a0807066` |
| `script/skill/battles/sj_res.lua` | `data_extract/slistcache/_unnamed/dat/c2ed753f.dat` | `ecf4312c0c7443d75ba5e457eedd63b4071191a23159312c1441001e86d37bfa` |
| `script/skill/battles/sj_state_enhance.lua` | `data_extract/slistcache/_unnamed/dat/ab566f6d.dat` | `35657117c7ce256e253b77567c4f6ffe096579f1de66d1b3776dea374d74e580` |
| `script/skill/battles/sj_manadamage.lua` | `data_extract/update01/_unnamed/dat/d5faba70.dat` | `90d40edea0d0fae3b5e7ab08d5e7fa4eb3e935c9f42bc8f4877c344cb4de1a54` |
| `script/skill/battles/sj_physicsdamage.lua` | `data_extract/update01/_unnamed/dat/0a05a408.dat` | `4fdc42c9a34730eb5a4ab7c65dcafcf2cc85039f38f9d825449211f996e6a3e2` |
| `script/skill/battles/sj_status_max.lua` | `data_extract/slistcache/_unnamed/dat/655fd461.dat` | `6f42593e98b7b3cdc6914245f247a20033b94ab13482800d949a009e89fad04a` |
| `script/item/battles/clarion.lua` | `data_extract/update01/_unnamed/dat/0dcb3509.dat` | `c09a46ae016b144ca64fd205478dc24348ec47bf3c3ab91eca6a75c2df830159` |
| `script/item/battles/trap_token.lua` | `data_extract/update01/_unnamed/dat/e9b6dcf0.dat` | `538cb22a9041fa5b18bcc2e6c4b671fbf5711171282c965e50e7a07cf55bf12e` |

## 3. Định danh vật phẩm và lệnh dùng

Bảng PAK `settings/item/004/magicscript.txt`; dòng là số dòng văn bản 1-based, gồm header. Định danh ổn định dùng bộ `(ItemGenre, DetailType, ParticularType)`, không dùng số dòng làm ID. Lệnh dưới đây lấy script PAK của món, chưa tự diễn giải thành công thức chiến đấu cuối.

| Dòng | ID gốc | Tên TCVN3 đã giải mã | Script | Lệnh liên quan |
|---|---|---|---|---|
| 157 | `6/1/155` | Tống Kim Chiêu thư | `\script\item\battles\rescript.lua` | Xem script; không có lệnh trạng thái trực tiếp trong bộ lọc này |
| 158 | `6/1/156` | Chiến cổ | `\script\item\battles\wardrum.lua` | `CastSkill( 491, 1);` |
| 159 | `6/1/157` | Lệnh bài | `\script\item\battles\token.lua` | `CastSkill( 492, 1);` |
| 160 | `6/1/158` | Binh Sĩ hiệu phù | `\script\item\battles\clarion.lua` | Xem script; không có lệnh trạng thái trực tiếp trong bộ lọc này |
| 161 | `6/1/159` | Cờ hiệu | `\script\item\battles\useflagitem.lua` | Xem script; không có lệnh trạng thái trực tiếp trong bộ lọc này |
| 162 | `6/1/160` | Kim Chi Chiến Hồn | `\script\item\battles\pneuma_jin.lua` | `AddSkillState(466, level, 0, 1080 )` |
| 163 | `6/1/161` | Mộc Chi Chiến Hồn | `\script\item\battles\pneuma_mu.lua` | `AddSkillState(466, level, 0, 1080 )` |
| 164 | `6/1/162` | Thủy Chi Chiến Hồn | `\script\item\battles\pneuma_shui.lua` | `AddSkillState(466, level, 0, 1080 ); AddSkillState(469, level, 0, 1080 )` |
| 165 | `6/1/163` | Hỏa Chi Chiến Hồn | `\script\item\battles\pneuma_huo.lua` | `AddSkillState(466, level, 0, 1080 ); AddSkillState(468, level, 0, 1080 )` |
| 166 | `6/1/164` | Thổ Chi Chiến Hồn | `\script\item\battles\pneuma_tu.lua` | `AddSkillState(466, level, 0, 1080 ); AddSkillState(467, level, 0, 1080 )` |
| 167 | `6/1/165` | Kim Chi Hộ giáp | `\script\item\battles\armor_jin.lua` | `AddSkillState(474, level, 0, 1080 )` |
| 168 | `6/1/166` | Mộc Chi Hộ giáp | `\script\item\battles\armor_mu.lua` | `AddSkillState(477, level, 0, 1080 )` |
| 169 | `6/1/167` | Thủy Chi Hộ giáp | `\script\item\battles\armor_shui.lua` | `AddSkillState(476, level, 0, 1080 )` |
| 170 | `6/1/168` | Hỏa Chi Hộ giáp | `\script\item\battles\armor_huo.lua` | `AddSkillState(473, level, 0, 1080 )` |
| 171 | `6/1/169` | Thổ Chi Hộ giáp | `\script\item\battles\armor_tu.lua` | `AddSkillState(475, level, 0, 1080 )` |
| 172 | `6/1/170` | Kim Chi Lợi Nhận | `\script\item\battles\weapon_jin.lua` | `AddSkillState(479, level, 0, 1080 ); AddSkillState(487, level, 0, 1080 )` |
| 173 | `6/1/171` | Mộc Chi Lợi Nhận | `\script\item\battles\weapon_mu.lua` | `AddSkillState(480, level, 0, 1080 ); AddSkillState(485, level, 0, 1080 )` |
| 174 | `6/1/172` | Thủy Chi Lợi Nhận | `\script\item\battles\weapon_shui.lua` | `AddSkillState(481, level, 0, 1080 ); AddSkillState(486, level, 0, 1080 )` |
| 175 | `6/1/173` | Hỏa Chi Lợi Nhận | `\script\item\battles\weapon_huo.lua` | `AddSkillState(482, level, 0, 1080 ); AddSkillState(498, level, 0, 1080 )` |
| 176 | `6/1/174` | Thổ Chi Lợi Nhận | `\script\item\battles\weapon_tu.lua` | `AddSkillState(483, level, 0, 1080 ); AddSkillState(499, level, 0, 1080 )` |
| 177 | `6/1/175` | Hành quân đơn | `\script\item\battles\sj_xingjundan.lua` | `AddSkillState(462, level, 0, 12 ); AddSkillState(464, level, 0, 540 ); AddSkillState(488, level, 0, 540 )` |
| 178 | `6/1/176` | Tiểu hoàn đơn | `\script\item\battles\sj_xiaohuandan.lua` | `AddSkillState(463, level, 0, 12 ); AddSkillState(465, level, 0, 540 ); AddSkillState(489, level, 0, 540 )` |
| 179 | `6/1/177` | Ngũ Hoa Lộ | `\script\item\battles\sj_wuhualu.lua` | `AddSkillState(471, level, 0, 12 ); AddSkillState(472, level, 0, 540 ); AddSkillState(490, level, 0, 540 )` |
| 180 | `6/1/178` | Tống Kim Ngoại Phổ hoàn | `\script\item\battles\sj_waipuwan.lua` | `AddSkillState( 487, 5, 0, 3240);` |
| 181 | `6/1/179` | Tống Kim Ngoại Độc hoàn | `\script\item\battles\sj_waiduwan.lua` | `AddSkillState( 485, 5, 0, 3240);` |
| 182 | `6/1/180` | Tống Kim Ngoại Băng hoàn | `\script\item\battles\sj_waibingwan.lua` | `AddSkillState( 486, 10, 0, 3240);` |
| 183 | `6/1/181` | Tống Kim Nội Phổ hoàn | `\script\item\battles\sj_neipuwan.lua` | `AddSkillState( 479, 10, 0, 3240);` |
| 184 | `6/1/182` | Tống Kim Nội Độc hoàn | `\script\item\battles\sj_neiduwan.lua` | `AddSkillState( 480, 5, 0, 3240);` |
| 185 | `6/1/183` | Tống Kim Nội Băng hoàn | `\script\item\battles\sj_neibingwan.lua` | `AddSkillState( 481, 10, 0, 3240);` |
| 186 | `6/1/184` | Tống Kim Nội Hỏa hoàn | `\script\item\battles\sj_neihuowan.lua` | `AddSkillState( 482, 10, 0, 3240);` |
| 187 | `6/1/185` | Tống Kim Nội Lôi hoàn | `\script\item\battles\sj_neidianwan.lua` | `AddSkillState( 483, 10, 0, 3240);` |
| 188 | `6/1/186` | Tống Kim Trường Mệnh hoàn | `\script\item\battles\sj_changmingwan.lua` | `AddSkillState( 488, 5, 0, 3240);` |
| 189 | `6/1/187` | Tống Kim Gia Bào hoàn | `\script\item\battles\sj_jiapaowan.lua` | `AddSkillState( 493, 2, 0, 3240);` |
| 190 | `6/1/188` | Tống Kim Cao Thiểm hoàn | `\script\item\battles\sj_gaoshanwan.lua` | `AddSkillState( 494, 50, 0, 3240);` |
| 191 | `6/1/189` | Tống Kim Cao Trung hoàn | `\script\item\battles\sj_gaozhongwan.lua` | `AddSkillState( 495, 50, 0, 3240);` |
| 192 | `6/1/190` | Tống Kim Phi Tốc hoàn | `\script\item\battles\sj_feisuwan.lua` | `AddSkillState( 496, 5, 0, 3240);` |
| 193 | `6/1/191` | Tống Kim Phổ Phòng hoàn | `\script\item\battles\sj_pufangwan.lua` | `AddSkillState( 473, 5, 0,3240);` |
| 194 | `6/1/192` | Tống Kim Băng Phòng hoàn | `\script\item\battles\sj_bingfangwan.lua` | `AddSkillState( 475, 5, 0,3240);` |
| 195 | `6/1/193` | Chuyên dùng cho Tống Kim Lôi phòng hoàn | `\script\item\battles\sj_leifangwan.lua` | `AddSkillState( 477, 5, 0,3240);` |
| 196 | `6/1/194` | Chuyên dùng cho Tống Kim Hỏa phòng hoàn | `\script\item\battles\sj_huofangwan.lua` | `AddSkillState( 476, 5, 0,3240);` |
| 197 | `6/1/195` | Chuyên dùng cho Tống Kim Độc phòng hoàn | `\script\item\battles\sj_dufangwan.lua` | `AddSkillState( 474, 5, 0,3240);` |
| 209 | `6/1/207` | Tật phong ngoa | `\script\item\battles\sj_boot.lua` | `AddSkillState(493, level, 0, 1080 )` |
| 210 | `6/1/208` | Tam Thanh Chi Khí | `\script\item\battles\sj_sanqingzhiqi.lua` | `CastSkill(505, 1 ); CastSkill(506, 1 ); CastSkill(507, 1 ); CastSkill(508, 1 )` |
| 211 | `6/1/209` | Bạch Câu Hộ uyển | `\script\item\battles\sj_cuff.lua` | `AddSkillState(496, level, 0, 1080 )` |
| 212 | `6/1/210` | Hậu Nghệ Chi Nhãn | `\script\item\battles\sj_eye.lua` | `AddSkillState(495, level, 0, 1080 )` |
| 213 | `6/1/211` | Thần bí vật phẩm | `\script\item\battles\sj_question.lua` | `AddSkillState(462, level, 0, 12 ); AddSkillState(463, level, 0, 12 ); AddSkillState(464, level, 0, 540 ); AddSkillState(465, level, 0, 540 ); AddSkillState(466, level, 0, 1080 ); AddSkillState(467, level, 0, 1080 ); AddSkillState(468, level, 0, 1080 ); AddSkillState(469, level, 0, 1080 ); AddSkillState(471, level, 0, 12 ); AddSkillState(472, level, 0, 540 ); AddSkillState(473, level, 0, 1080 ); AddSkillState(474, level, 0, 1080 ); AddSkillState(475, level, 0, 1080 ); AddSkillState(476, level, 0, 1080 ); AddSkillState(477, level, 0, 1080 ); AddSkillState(478, level, 0, 1080 ); AddSkillState(479, level, 0, 1080 ); AddSkillState(480, level, 0, 1080 ); AddSkillState(481, level, 0, 1080 ); AddSkillState(482, level, 0, 1080 ); AddSkillState(483, level, 0, 1080 ); AddSkillState(485, level, 0, 1080 ); AddSkillState(486, level, 0, 1080 ); AddSkillState(487, level, 0, 1080 ); AddSkillState(488, level, 0, 1080 ); AddSkillState(489, level, 0, 1080 ); AddSkillState(490, level, 0, 540 ); AddSkillState(493, level, 0, 1080 ); AddSkillState(495, level, 0, 1080 ); AddSkillState(496, level, 0, 1080 )` |
| 214 | `6/1/212` | Bồ câu | `\script\item\battles\dove.lua` | Xem script; không có lệnh trạng thái trực tiếp trong bộ lọc này |
| 216 | `6/1/214` | Kháng Đơn Chi Giác | `\script\item\battles\reboundclarion.lua` | `CastSkill( 510, 1);` |
| 217 | `6/1/215` | Càn Khôn Tạo Hóa Đan (đại) | `\script\item\battles\sj_zaohuadan_b.lua` | `AddSkillState(472, 20, 0, 54 )` |
| 218 | `6/1/216` | Càn Khôn Tạo Hóa Đan (trung) | `\script\item\battles\sj_zaohuadan_m.lua` | `AddSkillState(472, 10, 0, 54 )` |
| 219 | `6/1/217` | Càn Khôn Tạo Hóa Đan (tiểu) | `\script\item\battles\sj_zaohuadan_s.lua` | `AddSkillState(472, 5, 0, 54 )` |
| 395 | `6/1/393` | Xuyên Tâm Lệnh | `\script\item\battles\trap_token.lua` | `SJ_TRAPITEM_COUNT = 50; CastSkill( 343,15);; CastSkill( 343,20);; CastSkill( 343,30);; CastSkill( 303,15);; CastSkill( 303,20);; CastSkill( 303,30);; CastSkill(345 ,15);; CastSkill(345 ,20);; CastSkill( 345,30);; CastSkill( 347,15);; CastSkill( 347,20);; CastSkill( 347,30);; CastSkill( 349,15);; CastSkill( 349,20);; CastSkill( 349,30);` |
| 396 | `6/1/394` | Độc Thích lệnh | `\script\item\battles\trap_token.lua` | `SJ_TRAPITEM_COUNT = 50; CastSkill( 343,15);; CastSkill( 343,20);; CastSkill( 343,30);; CastSkill( 303,15);; CastSkill( 303,20);; CastSkill( 303,30);; CastSkill(345 ,15);; CastSkill(345 ,20);; CastSkill( 345,30);; CastSkill( 347,15);; CastSkill( 347,20);; CastSkill( 347,30);; CastSkill( 349,15);; CastSkill( 349,20);; CastSkill( 349,30);` |
| 397 | `6/1/395` | Hàn Băng lệnh | `\script\item\battles\trap_token.lua` | `SJ_TRAPITEM_COUNT = 50; CastSkill( 343,15);; CastSkill( 343,20);; CastSkill( 343,30);; CastSkill( 303,15);; CastSkill( 303,20);; CastSkill( 303,30);; CastSkill(345 ,15);; CastSkill(345 ,20);; CastSkill( 345,30);; CastSkill( 347,15);; CastSkill( 347,20);; CastSkill( 347,30);; CastSkill( 349,15);; CastSkill( 349,20);; CastSkill( 349,30);` |
| 398 | `6/1/396` | Địa Hỏa lệnh | `\script\item\battles\trap_token.lua` | `SJ_TRAPITEM_COUNT = 50; CastSkill( 343,15);; CastSkill( 343,20);; CastSkill( 343,30);; CastSkill( 303,15);; CastSkill( 303,20);; CastSkill( 303,30);; CastSkill(345 ,15);; CastSkill(345 ,20);; CastSkill( 345,30);; CastSkill( 347,15);; CastSkill( 347,20);; CastSkill( 347,30);; CastSkill( 349,15);; CastSkill( 349,20);; CastSkill( 349,30);` |
| 399 | `6/1/397` | Lôi Kích lệnh | `\script\item\battles\trap_token.lua` | `SJ_TRAPITEM_COUNT = 50; CastSkill( 343,15);; CastSkill( 343,20);; CastSkill( 343,30);; CastSkill( 303,15);; CastSkill( 303,20);; CastSkill( 303,30);; CastSkill(345 ,15);; CastSkill(345 ,20);; CastSkill( 345,30);; CastSkill( 347,15);; CastSkill( 347,20);; CastSkill( 347,30);; CastSkill( 349,15);; CastSkill( 349,20);; CastSkill( 349,30);` |
| 1780 | `6/1/1768` | Hỏa Trụ | `\script\item\battles\sj_wuxingzhu.lua` | `Chưa tìm thấy script` |
| 1781 | `6/1/1769` | Băng Trụ | `\script\item\battles\sj_wuxingzhu.lua` | `Chưa tìm thấy script` |
| 1782 | `6/1/1770` | Độc Trụ | `\script\item\battles\sj_wuxingzhu.lua` | `Chưa tìm thấy script` |
| 1783 | `6/1/1771` | Lôi Trụ | `\script\item\battles\sj_wuxingzhu.lua` | `Chưa tìm thấy script` |
| 1784 | `6/1/1772` | Kim Trụ | `\script\item\battles\sj_wuxingzhu.lua` | `Chưa tìm thấy script` |
| 1969 | `6/1/1957` | Hành Quân Đơn đặc biệt | `\script\item\battles\sj_xingjundan_sp.lua` | `Chưa tìm thấy script` |
| 4644 | `6/1/4023` | Tăng lượng máu | `\script\battles\buff\item_buff_01.lua` | `Chưa tìm thấy script` |
| 4645 | `6/1/4024` | Tăng nội lực | `\script\battles\buff\item_buff_02.lua` | `Chưa tìm thấy script` |
| 4646 | `6/1/4025` | Giảm thọ thương | `\script\battles\buff\item_buff_03.lua` | `Chưa tìm thấy script` |
| 4647 | `6/1/4026` | Giảm thời gian trúng độc | `\script\battles\buff\item_buff_04.lua` | `Chưa tìm thấy script` |
| 4648 | `6/1/4027` | Giảm thời gian trì hoãn | `\script\battles\buff\item_buff_05.lua` | `Chưa tìm thấy script` |
| 4649 | `6/1/4028` | Giảm thời gian choáng | `\script\battles\buff\item_buff_06.lua` | `Chưa tìm thấy script` |
| 4650 | `6/1/4029` | Tăng kháng hoàn toàn | `\script\battles\buff\item_buff_07.lua` | `Chưa tìm thấy script` |
| 4651 | `6/1/4030` | Tăng giới hạn máu trong | `\script\battles\buff\item_buff_08.lua` | `Chưa tìm thấy script` |
| 4652 | `6/1/4031` | Tăng tốc độ chạy | `\script\battles\buff\item_buff_09.lua` | `Chưa tìm thấy script` |
| 4653 | `6/1/4032` | Tăng né tránh | `\script\battles\buff\item_buff_10.lua` | `Chưa tìm thấy script` |
| 4654 | `6/1/4033` | Hợp thành kĩ năng công kích | `\script\battles\buff\item_buff_11.lua` | `Chưa tìm thấy script` |
| 4655 | `6/1/4034` | Hợp thành kĩ năng công kích | `\script\battles\buff\item_buff_12.lua` | `Chưa tìm thấy script` |
| 4656 | `6/1/4035` | Tăng tỉ lệ trọng kích | `\script\battles\buff\item_buff_13.lua` | `Chưa tìm thấy script` |
| 4657 | `6/1/4036` | Tăng tỉ lệ trọng kích đối kháng | `\script\battles\buff\item_buff_14.lua` | `Chưa tìm thấy script` |

## 4. Kết luận và giới hạn

- `rescript.lua` kiểm tra cấp40–59/60–89/từ90; báo danh323/324/325; điểm đến Tống1541,3178, Kim1570,3085. Đây không phải tọa độ NPC.
- `maplist.ini` ghi Bình nguyên326/327/328, Giới Kiều384/385/386 lần lượt sơ/trung/cao.44 không có MapInfo gắn tại khai báo này.
- `protocol_c.lua`: báo danh, chuẩn bị, tiến hành, kết thúc; số tham gia và số đang đợi theo phe. Không cung cấp thời lượng hoặc luật nhận người.
- `mapinfo.txt` có Hậu doanh/Đại doanh/cổng/lính/y thương/hòm/cờ/soái; không chứng minh tất cả thể thức bật cùng lúc, cũng chưa nối Area1/2 với phe Tống/Kim.
- Skill661 + sj_guanxian: có công thức máu/kháng theo cấp trạng thái, thiếu chỗ gọi cấp quân hàm.
- Có18 Hoàn178–195 và Ngoại Độc Hoàn179; danh mục26 của volamidle không thể coi là toàn bộ đồ SHXT.
- Dữ liệu `npcs.txt` có nhiều dòng cùng tên soái; không chọn theo tên đơn thuần hoặc lấy HP của dòng đầu tiên.
- Script mission宋金战场pk战 cũ có trong PAK nhưng chưa chứng minh là điều phối SHXT. Không dùng timer/hằng số của thế hệ cũ thay phần thiếu.

Các phát hiện này chỉ là đọc/đối chiếu, chưa chạy một trận SHXT gốc, chưa render/generate map mới và chưa kiểm chứng engine server gốc.
