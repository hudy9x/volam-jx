# Đề xuất kháng riêng Boss và rà trần/ngũ hành PvP

Ngày: 2026-11-16. HEAD khảo sát: `1055fac`, main. **CHỈ ĐỀ XUẤT, chưa được duyệt triển khai.** Không sửa công thức, cấu hình runtime, generated, DB hoặc assets. Bổ sung cho [điều tra trước](combat-resistance-audit-2026-11-16.md).

## 1. Kết luận đề xuất

1. Hoàng Kim: nhập đúng 5 đường kháng và 5 trần theo ID NPC SHXT, tính theo cấp thực tế; bỏ mức 25 chung ở các NPC đã xác minh nguồn. Không dùng bảng mẫu ngẫu nhiên để ghi đè lên kháng riêng này.
2. Boss Xanh: dùng một hồ sơ kháng riêng cho instance khi spawn, đề xuất khởi đầu 50 từng loại, trần thực tế 95; có thể mở các biến thể theo hệ sau. Giá trị lấy cảm hứng từ template SHXT, nhưng cách áp và ánh xạ màu Xanh là CHỌN, chưa xác minh engine.
3. PvP: giữ kháng tổng chưa kẹp để bù giảm/xuyên kháng; áp trần thường 75 (+thuộc tính nâng trần), sau đó áp ngũ hành và trần cuối 95. Đây là thay đổi luật, cần duyệt riêng và kiểm mức chênh sát thương, không coi là sửa lỗi chắc chắn theo SHXT.
4. Giữ hệ số PvP 0,5, công thức lực tay, HP/EXP/drop và điều kiện PK hiện tại trong lượt dự kiến. Không thêm một hệ số giảm sát thương riêng cho boss cùng lúc.

## 2. Nguồn mới đã xác minh trong PAK

Đọc bằng resolver `apps/client/tools/jx/source.ts` với JX_CLIENT trỏ Client_VLTK_SHXT; dùng `_manifest.tsv` chọn bản thắng theo PAK, không lấy file loose làm mặc định. Đã tìm được makeboss/property/lib trong PAK dù không có file có tên ở thư mục script loose. Đây là script tính chỉ số NPC, không phải mã engine nhận sát thương.

| Đường dẫn game | Bản thực trong data_extract | SHA256 |
|---|---|---|
| settings/npcs.txt | slistcache/_unnamed/dat/38ebcb17.dat | f3d139fc6c4a1d1178a9d14fdaf9802b8eeaf9695ed887c9c89f11e00f494c95 |
| settings/npc/npcgoldtemplate.txt | update01/_unnamed/dat/f81870ca.dat | 0e54c69282e1b0589906b0a6e282e174813881473472a023eb06cddb4cd30208 |
| script/npclevelscript/makeboss.lua | update01/_unnamed/dat/a06b8085.dat | d942b77e2a968b023b5700ac9823b2f9d92278c0d33ecff2d099a9143647c05a |
| script/npclevelscript/property.lua | update01/_unnamed/dat/20c94d64.dat | 20fffbb167bf59aa2363bd4f42f4d12528b0ab9fe148ac35b17c6205c8d7303f |
| script/npclevelscript/lib.lua | update01/_unnamed/dat/1e9efa23.dat | cb161f0cefb4bc7570739a8a7da566d7b2311446f1d518c9074f18b01a57e60e |

makeboss.lua dòng 7–30 lấy hai tham số A|B của từng kháng và gọi Set*Resist. property.lua dòng 34–55 gọi Linear(level,A,B); lib.lua dòng 23–24: `floor(A*level+B)`. Vì vậy **với makeboss**, thứ tự là hệ số cấp trước, hằng số sau. Không dùng cùng parser A|B rồi cùng công thức cho mọi LevelScript: standard.lua có nhánh kháng riêng theo hệ/cấp và GetData cũng có thứ tự tham số khác.

Đối chiếu 44 boss hiện có:43 ID có dòng NPC trong PAK, tất cả dùng makeboss.lua và đủ 5 trần 95;1 ID tự tạo 10031 Kim Miêu Vương không có nguồn dòng NPC tương ứng. Có 20 major,13 minor,10 newboss,1 special trong config hiện tại; phân nhóm này là của dự án, không suy ra mọi minor yếu hơn major.

Ví dụ **kháng gốc chưa kẹp**, ở cấp 150; không phải bảng kháng cuối sau ngũ hành:

| NPC | ID | Vật lý | Băng | Hỏa | Lôi | Độc | Trần từng loại |
|---|---:|---:|---:|---:|---:|---:|---:|
| Huyền Giác Đại Sư |740|90|80|90|80|90|95|
| Cổ Bách |566|75|60|65|60|80|95|
| Lam Y Y |582|30|75|75|75|95|95|
| Huyền Không Đại Sư |512|150|100|150|162|50|95|
| Thiếu Lâm Hộ Pháp |1194|243|243|243|243|243|95|

Ví dụ Huyền Không: vật lý=`floor(1,5 × 150−75)=150`, độc=`floor(1 × 150−100)=50`. Nếu đổi cấp thì tính lại, không đóng băng số 150 thành cấu hình mọi cấp. Các cấp 150 ở bảng phục vụ so sánh; không đổi cấp đang được USER cấu hình (hiện có boss cấp 148/200).

**Giới hạn chứng cứ:** đã xác minh hàm Lua và dữ liệu; chưa chạy Lua trong engine SHXT thật, chưa xác minh cách engine áp template vàng/xanh và ngũ hành sau trần. Không có mãC++ engine/server trong cây local. `pkrate.ini rate=20` không đủ để suy ra hệ số sát thương.

## 3. Hoàng Kim: lấy từng con, không chia mặc định theo tên bậc

- Generator nhập 5 cặp A/B,5 trần và metadata nguồn/LevelScript; không sửa tay generated.
- Công thức TS thuần trong shared/formulas tính tại cấp spawn; không thực thi Lua tùy ý trên server, chỉ chuyển các công thức đã đọc/xác minh.
- Ánh xạ theo ID, kiểm ảnh/tên nguồn/alias trong lần nhập; giữ tên hiển thị/faction/element/level/config của USER.
- Bùa, bị động và xuyên kháng vẫn tác động. Kháng gốc có thể lớn hơn trần; chỉ kháng thực dụng mới kẹp. Không nhân thêm hệ số sát thương nhận riêng.
- NPC 10031 không gán nhầm một dòng NPC khác: đề xuất giữ tương đương 25 ở năm loại trong hồ sơ tạm, ghi CHỌN/chưa có nguồn, chờ duyệt cấu hình riêng. Không công bố 44/44 đã có dữ liệu SHXT.
- Không áp template 50 lên Hoàng Kim vốn có kháng riêng; không cộng chồng cả 25 cũ +kháng SHXT +template.
- Không ép Hoàng Kim phải có mọi loại kháng cao hơn Boss Xanh: Lam Y Y có điểm yếu vật lý 30 là dữ liệu có giá trị chiến thuật.

## 4. Boss Xanh: đề xuất cách dùng template

Dữ liệu template đã đọc từ PAK, bản loose trùng byte với PAK ở file này:

| Mẫu SHXT, số hàng dữ liệu1-based | Vật lý | Băng | Hỏa | Lôi | Độc | Trần ghi trong bảng |
|---|---:|---:|---:|---:|---:|---:|
| Lãnh tụ,12 |50|50|50|50|50|100|
| Kim,7 |50|50|50|50|100|100|
| Mộc,8 |50|50|50|100|50|100|
| Hỏa,9 |100|50|50|50|50|100|
| Thủy,10 |50|50|100|50|50|100|
| Thổ,11 |50|100|50|50|50|100|
| Thông dụng thấp/vừa/cao,13–15 |100/150/200|100/150/200|100/150/200|100/150/200|100/150/200|95|
| Lấy bảo vật,16 |75|75|75|75|75|95|

Không đủ engine để biết các ô này là thay thế/cộng/phần trăm nhân với chỉ số gốc, cũng không đủ để khẳng định hàng 12 chính là toàn bộ Boss Xanh của server SHXT. Tên template và con số là DATA; cách áp sau đây là **CHỌN**:

- Mặc định bản đầu: hồ sơ riêng `blue-leader`, lấy 50/50/50/50/50 làm **kháng gốc thay thế**, không cộng thêm 5/20 cũ. Giới hạn thực dụng 95 thay vì cho 100% miễn sát thương; giữ số 100 nguồn trong metadata để không sửa nghĩa dữ liệu gốc.
- Áp đúng tier 1 thực tế của instance cho cả zone Xanh cố định và quái thường tự hóa Xanh. Không sửa đối tượng MonsterDef dùng chung, tránh làm quái thường khác cùng ID cũng tăng kháng.
- Hồ sơ gắn khi spawn, giữ nguyên trong đời quái và mỗi lần refresh bùa/kháng; chết/sinh lại mới chọn lại. Bản đầu dùng cùng hồ sơ Lãnh tụ, không thêm random.
- Năm mẫu theo hệ 100/50 chỉ làm tùy chọn sau khi duyệt: chọn theo tên hệ là quy tắc CHỌN của dự án. Không mặc định bật vì cực kháng 95 có thể gây khắc chế quá mạnh.
- Không dùng các mẫu 100/150/200 mặc định cho Boss Xanh; giữ lại trong dữ liệu nghiên cứu cho trường hợp đặc biệt.

## 5. PvP: tách kháng tổng, kháng thường và kháng đối với đòn cụ thể

Vấn đề hiện tại: characterStats đã kẹp kháng trước khi combat biết xuyên kháng; effectiveResist lại chặn kết quả sau ngũ hành ở resistMax 75 mặc định. Kháng dư bị mất và 75/95 chưa thể hiện hai vai trò riêng.

### Phương án đề xuất

Từng loại kháng tính riêng:

```text
Rraw = kháng nền + trang bị + bị động + bùa lợi/hại (chưa kẹp)
C = trần thường của mục tiêu (+thuộc tính nâng/hạ trần), giới hạn 0..95
P = xuyên kháng loại đó + xuyên tất cả
Rnormal = min(C, Rraw − P)
S = −seriesdamage_p nếu chiêu khắc mục tiêu
    +seriesdamage_p nếu mục tiêu khắc chiêu
    0 nếu trung tính hoặc chiêu không có hệ số
Reffective = clamp(Rnormal + S, −75, 95)
DamagePart = DamagePartRaw × (100 − Reffective)/100
PvP: tổng trực tiếp ×0,5; độc áp kháng độc và×0,5 đúng một lần
```

- Người chơi C mặc định 75; NPC theo 5 trần đã nhập, hồ sơ Xanh, trần 95. Công thức nhận sát thương chung cho mọi chủ thể; thay raw-preservation sẽ tác động PvE và cần kiểm cả hai.
- **Kháng dư dùng bù bùa giảm/xuyên kháng trước trần thường; không dùng để xóa hệ số khắc nằm sau trần.** Đây là lựa chọn thứ tự có chủ ý, phải duyệt cùng công thức. Không giới thiệu mơ hồ là mọi loại giảm kháng đều ăn vào kháng dư.
- Trần cuối 95 có thể vượt trần thường 75 khi đang được lợi từ ngũ hành. Phương án khác giữ trần cuối=C ít thay đổi hơn nhưng vẫn làm ngũ hành phòng thủ bão hòa sớm; không chọn làm phương án chính.
- Sàn−75 giữ biên mặc định hiện tại, là CHỌN; không lấy sàn đối xứng theo trần tăng thêm để tự mở mức âm −95.
- Nguồn trực tiếp xác nhận giá trị kháng/seriesdamage, chưa xác nhận engine PvP sử dụng đúng thứ tự này. Ghi chú engine JX 1 cũ§4 hỗ trợ cách tách 75/95 nhưng là nguồn nghiên cứu lịch sử, không phải bằng chứng từ engine SHXT hiện có.
- Kháng hiển thị thường vẫn kẹp tại C; cần giữ Rraw riêng cho combat. Không dùng kháng đã hiển thị để tính ngược kháng gốc. Giới hạn hiển thị và kháng đối với từng đòn khác nhau.

### So sánh bằng số — mô phỏng phương án, chưa sửa/chạy công thức mới trong game

Giả sử một phần sát thương gốc 1000, cùng kháng của phần đó 50, hệ số ngũ hành 50, không né/chí mạng/hộ thân; hệ số PvP 0,5:

| Cặp hệ | Kháng hiệu dụng cũ | Kháng đề xuất | HP mất cũ | HP mất đề xuất |
|---|---:|---:|---:|---:|
| Kim→Mộc |0|0|500|500|
| Mộc→Kim |75|95|125|25|
| Mộc→Thủy |50|50|250|250|
| Mộc→Thổ |0|0|500|500|

Giữ đúng vòng khắc Kim→Mộc→Thổ→Thủy→Hỏa→Kim. Loại sát thương và hệ chiêu độc lập; ví dụ Đường Môn hệ Mộc vẫn có phần vật lý chịu kháng vật lý.

Kháng tổng 125, xuyên 30: hiện còn 45 vì kẹp 125→75 quá sớm; đề xuất còn 75 sau min(75,125−30). Nếu kẻ đánh khắc với 50: hiện−5, đề xuất 25. Hai trường hợp tương ứng HP mất 275→125 và 525→375 trên phần gốc 1000 sau PvP.

**Rủi ro cân bằng phải duyệt:** ở bảng trên, lợi thế khắc hệ giữa chiều Kim→Mộc và Mộc→Kim lên 20 lần cho cùng phần gốc, thay vì 4 lần ở luật cũ; không khẳng định tỷ lệ thắng hai phái là 20 lần. Trần 95 giảm sát thương 5 lần so 75 trong các đòn bão hòa. Giữ nguyên PVP 0,5 để không đổi thêm một biến khi đo.

### Tầng chiêu

Dùng Series của chính chiêu đang gây hit; thiếu Series mới dùng hệ người đánh. Dùng seriesdamage_p của chính tầng; không coi thiếu là luôn được kế thừa. Rà tất cả chiêu/tầng có damage, tạo bảng thiếu Series/hệ số/override. Tầng 1113 chỉ là trường hợp đã xác minh không có hệ số. Không bật kế thừa toàn cục từ root vì có chiêu con đổi hệ (bẫy Đường Môn), và thiếu có thể là chủ ý nguồn. Chỉ override từng ID khi có chứng cứ hoặc USER duyệt thiết kế.

## 6. Phạm vi và trình tự triển khai nếu được duyệt

1. Nhập dữ liệu kháng NPC/template vào bảng generated riêng, gồm năm cặp hệ số cấp và năm trần; giữ metadata nguồn và công thức. Không sinh lại toàn bộ sprite chỉ để lấy kháng.
2. Tách kháng tổng chưa kẹp khỏi chỉ số hiển thị trong characterStats/playerCombat/monsterCombat; kiểm phương án PvP ở §5 trước khi thay nguồn boss. Chia thay đổi để đo tác động từng phần.
3. Nối 43 Hoàng Kim theo ID và hồ sơ Xanh theo instance; giữ 25 tạm cho NPC 10031. Không đổi HP/EXP/drop và không nhân thêm giảm sát thương nhận.
4. Rà tầng chiêu, kiểm ma trận ngũ hành, rồi chạy hai tài khoản trên server/client thử 2568/5174. Chỉ chốt cân bằng sau khi có HP, DPS và thời gian hạ boss thực tế. Không dùng server người dùng ở 2567/5173.
5. Cập nhật tài liệu công thức và boss. Cài đặt qua restart/build; server/shared dùng chung Web, Desktop và Mobile. Lượt đầu không mở rộng giao diện quản trị hoặc cơ chế cập nhật room đang chạy.

Các điểm sửa dự kiến: generator dữ liệu; MonsterDef/CombatStats/CharacterStats và formulas/character, combat, damage, tuning; server spawner/effects và mapping boss. Graph context xác nhận monsterCombat còn được dùng ở skill lab, audit và kiểm tra tốc độ; effectiveResist nằm dưới resolveHit. Khi đổi giao diện dữ liệu phải kiểm các nơi dùng này. Chưa sửa UI tool; nếu cần thêm phần chỉnh kháng sẽ lập thiết kế riêng theo guideline.

## 7. Kiểm chứng bắt buộc khi triển khai

- Dữ liệu: 43 NPC khớp năm cặp A/B, năm trần và LevelScript; ID 0/ô 0 không bị hiểu là thiếu. Báo rõ NPC 10031 chưa có nguồn. Từ chối ô hỏng/script lạ, giữ nguồn PAK và không chạy Lua tùy ý trên server.
- Công thức cấp: kiểm cấp 10/50/90/100/150/200, số thập phân, số âm và floor. Đổi cấp spawn phải đổi kết quả; không sửa generated bằng tay.
- Boss Xanh: cùng ID có quái thường và Xanh cùng lúc nhưng khác hồ sơ; không sửa MonsterDef chung. Cả Xanh cố định và tự hóa đều áp đúng. Hết bùa, refresh và hồi sinh giữ đúng hồ sơ/tier.
- Kháng: kiểm bùa lợi/hại, nâng/hạ trần, xuyên từng loại và tất cả; kháng tổng 125/xuyên 30; các giá trị 75/95/150/243; sàn −75 và trần cuối 95. Không sinh sát thương âm/hồi máu hoặc miễn sát thương 100% do kháng.
- Ngũ hành: ma trận 5 × 5, hệ số 0/10/50/60/80; các cặp Kim→Mộc, Mộc→Kim, Mộc→Thủy và Mộc→Thổ; chiêu con đổi hệ hoặc thiếu hệ số. Kháng từng phần và hệ số độc chỉ tính đúng một lần.
- Tích hợp: PK 1/2 chỉ khác quyền đánh; vùng an toàn, tổ đội, bảo vệ hồi sinh, hộ thân và phản đòn giữ luật. Không thêm cơ chế Cừu sát riêng trong phạm vi này.
- Chạy kiểm logic, typecheck/build và các kiểm tra effects/speed/safe-zones liên quan; sau đó hai tài khoản thật qua WebSocket, đối chiếu HP event với vitals. Ghi riêng mô phỏng với kết quả trong game. Không gọi 32ca ở lượt trước là kiểm chứng luật mới.
- Cân bằng: thay kháng 25→90 làm sát thương trung tính còn 1/7,5;25→95 còn 1/15 nếu giữ HP. Xanh 5→50 làm sát thương còn 50/95. Không ngầm hạ HP để bù vì đó là quyết định cân bằng riêng.

## 8. Những phần chờ người dùng duyệt

Toàn bộ tài liệu là phương án, chưa là lệnh triển khai. Gói đề xuất gồm 43hồ sơ Hoàng Kim theo Lua; Xanh 50/trần thực dụng 95 là CHỌN; PvP dùng kháng dư trước trần thường, rồi ngũ hành và trần cuối 95. Kháng dư chỉ bù trước bước ngũ hành, không xóa khắc hệ sau trần.

Các mẫu Xanh 100/50, hệ số giảm nhận riêng cho boss, kế thừa tầng chiêu, đổi HP hoặc hệ số PvP 0,5 chưa đề nghị bật trong bản đầu. Luật dùng chung server/shared trên ba nền tảng; chưa kiểm ứng dụng native, cảm ứng hoặc UI.

## Phụ lục: kháng Hoàng Kim tại cấp cấu hình khi khảo sát

Bảng tính từ PAK/makeboss; kháng gốc chưa kẹp. Không phải thay đổi cấu hình nhân vật/boss.

| ID | Tên | Cấp | Vật lý | Băng | Hỏa | Lôi | Độc |
|---:|---|---:|---:|---:|---:|---:|---:|
| 740 | Huyền Giác Đại Sư | 150 | 90 | 80 | 90 | 80 | 90 |
| 1194 | Thiếu Lâm Hộ Pháp | 150 | 243 | 243 | 243 | 243 | 243 |
| 512 | Huyền Không Đại Sư | 150 | 150 | 100 | 150 | 162 | 50 |
| 516 | Tào Minh | 150 | 150 | 100 | 150 | 162 | 50 |
| 566 | Cổ Bách | 150 | 75 | 60 | 65 | 60 | 80 |
| 739 | Vương Tá | 150 | 90 | 80 | 90 | 80 | 90 |
| 748 | Hàn Mông | 150 | 90 | 80 | 90 | 80 | 90 |
| 1193 | Thiên Vương Thống Lĩnh | 150 | 243 | 243 | 243 | 243 | 243 |
| 517 | Tào Chân | 200 | 225 | 150 | 225 | 232 | 100 |
| 741 | Đường Bất Nhiễm | 200 | 90 | 90 | 90 | 90 | 95 |
| 1195 | Đường Môn Trưởng Lão | 150 | 243 | 243 | 243 | 243 | 243 |
| 523 | Liễu Thanh Thanh | 150 | 60 | 60 | 75 | 60 | 75 |
| 522 | Đường Phong | 150 | 150 | 100 | 150 | 162 | 50 |
| 521 | Thi Thanh | 150 | 150 | 100 | 150 | 162 | 50 |
| 514 | Lý Nguyên Khánh | 150 | 150 | 100 | 150 | 162 | 50 |
| 582 | Lam Y Y | 150 | 30 | 75 | 75 | 75 | 95 |
| 742 | Bạch Doanh Doanh | 150 | 90 | 90 | 90 | 90 | 95 |
| 1196 | Ngũ Độc Tà Tôn | 150 | 243 | 243 | 243 | 243 | 243 |
| 743 | Thanh Tuyệt Sư Thái | 150 | 80 | 85 | 90 | 90 | 80 |
| 568 | Hà Liên Phiêu | 150 | 60 | 65 | 75 | 50 | 60 |
| 1197 | Nga My Chưởng Giáo | 150 | 243 | 243 | 243 | 243 | 243 |
| 513 | Diệu Như | 150 | 60 | 75 | 60 | 60 | 75 |
| 567 | Chung Linh Tú | 150 | 60 | 65 | 50 | 50 | 60 |
| 744 | Yến Hiểu Tranh | 150 | 80 | 85 | 90 | 90 | 80 |
| 1198 | Thúy Yên Tiên Tử | 150 | 243 | 243 | 243 | 243 | 243 |
| 583 | Mạnh Thương Lương | 150 | 65 | 65 | 75 | 75 | 75 |
| 745 | Hà Nhân Ngã | 150 | 85 | 90 | 90 | 90 | 90 |
| 1199 | Cái Bang Trưởng Lão | 150 | 243 | 243 | 243 | 243 | 243 |
| 515 | Bành Liên Ân | 148 | 147 | 98 | 147 | 159 | 48 |
| 563 | Gia Luật Tị Ly | 150 | 75 | 40 | 60 | 50 | 60 |
| 564 | Hoàn Nhan Tuyết Y | 150 | 75 | 50 | 65 | 60 | 65 |
| 565 | Đoan Mộc Duệ | 150 | 75 | 60 | 70 | 65 | 65 |
| 1200 | Thiên Nhẫn Pháp Vương | 150 | 243 | 243 | 243 | 243 | 243 |
| 518 | Tào Sảng | 150 | 150 | 100 | 150 | 162 | 50 |
| 562 | Đạo Thanh Chân Nhân | 150 | 60 | 75 | 50 | 65 | 50 |
| 746 | Đơn Tư Nam | 150 | 80 | 80 | 80 | 90 | 100 |
| 1201 | Võ Đang Chân Nhân | 150 | 243 | 243 | 243 | 243 | 243 |
| 511 | Trương Tông Chính | 150 | 60 | 60 | 60 | 75 | 60 |
| 747 | Tuyền Cơ Tử | 150 | 80 | 80 | 80 | 90 | 100 |
| 1202 | Côn Lôn Thiên Sư | 150 | 243 | 243 | 243 | 243 | 243 |
| 519 | Tào Khiêm | 150 | 150 | 100 | 150 | 162 | 50 |
| 1364 | Thanh Liên Tử | 150 | 60 | 75 | 60 | 75 | 60 |
| 10031 | Kim Miêu Vương | 150 | Chưa có nguồn | — | — | — | — |
| 520 | Tào Lực | 150 | 150 | 100 | 150 | 162 | 50 |

## Bổ sung: cấu hình kháng trong tool Hoàng Kim — 2026-11-16

Người dùng hỏi có cần bổ sung kháng vào tool. Nên bổ sung phần xem/chỉnh theo từng boss nếu triển khai phương án; riêng runtime lấy SHXT tự động không bắt buộc phải có input thủ công.

Đề xuất: mặc định **Theo dữ liệu SHXT**, hiển thị năm kháng gốc được tính từ cấp đang chọn và trần từng loại, chỉ đọc; đổi cấp cập nhật bản xem trước. **Tự cài đặt** mở năm giá trị kháng cố định, trần để trong nâng cao; ghi rõ kháng tự đặt không tự tăng theo cấp. Chuyển về SHXT bỏ hiệu lực override, dùng lại nguồn, không sửa generated. NPC chưa có nguồn hiển thị rõ và dùng hồ sơ tạm/tự đặt. Kháng gốc có thể vượt95, không dùng giới hạn trần95 để chặn ô kháng gốc. Kháng thực nhận theo từng đòn còn phụ thuộc bùa/xuyên/ngũ hành, không gọi con số xem trước là kháng cuối trận.

Schema, kiểm tra/lưu/đọc cấu hình và runtime phải cùng hỗ trợ; chỉ thêm ô UI không đủ. Giữ Lưu thiết lập và Áp dụng vào game là hai hành động. Trần chung và thứ tự PvP nằm ở công thức chung, không thành cài đặt riêng cho từng boss. Đã đọc toàn bộ guideline UI/UX, tools/AGENTS và README Boss trước đề xuất. Chưa sửa code/UI hoặc cấu hình thật.
