# Điều tra kháng, ngũ hành, Boss và PvP — 2026-11-16

HEAD kiểm tra: `1055fac` trên main. Chỉ điều tra và thử nghiệm; không sửa gameplay, công thức, DB, asset, không commit/push.

## Kết luận

Kháng và khắc ngũ hành đang chạy trên đường sát thương chung của người chơi/quái/boss. Không có nhánh bỏ kháng khi đánh boss hoặc người chơi. Tuy nhiên, dữ liệu boss đang đơn giản hóa, một số tầng chiêu không có hệ số ngũ hành và cách kẹp kháng cần được phân biệt với ghi chú engine JX1 cũ. Chưa có cơ chế Cừu sát riêng: hiện có PK Luyện công/Chiến đấu/Đồ sát.

## Nguồn và đường xử lý

- `packages/shared/src/formulas/damage.ts`: skillDamage → resolveHit → effectiveResist, tính riêng vật lý/băng/hỏa/lôi; độc đi theo nhịp riêng.
- `packages/shared/src/skills/engine/SkillEngine.ts` strike: dùng chiêu của đạn đang chạm (m.skill), không tự kế thừa seriesdamage_p của chiêu gốc; gốc dùng cho synergy/tuning.
- `apps/server/src/world/World.ts`: cổng stats=combatOf, damage=applyHit; targeting kiểm PK/vùng an toàn.
- `apps/server/src/world/systems/combat.ts`: hộ thân bằng nội lực → trừ HP → hút máu/phản đòn/hiệu ứng. Không tính lại kháng lần hai.
- `apps/server/src/world/progress.ts`: refreshStats lấy trang bị + bị động + bùa, characterStats → playerCombat.
- `apps/server/src/world/systems/effects.ts`: refreshMonsterCombat lấy def.resist ×100 cộng bùa/bị động.

Kháng hiệu dụng = kháng mục tiêu − xuyên kháng người đánh − seriesdamage_p nếu chiêu khắc mục tiêu; cộng seriesdamage_p nếu chiêu bị khắc. Kẹp về [-resistMax, min(95,resistMax)]. Mỗi phần sát thương nhân (100 − kháng hiệu dụng)/100; PvP nhân0,5. DAMAGE_SCALE=1; không có tuning damage riêng cho các chiêu dùng trong kiểm tra.

Vòng khắc: Kim → Mộc → Thổ → Thủy → Hỏa → Kim. Mộc → Thủy không phải khắc; hệ của chiêu được ưu tiên hơn hệ người dùng. Loại sát thương và hệ của chiêu là hai khái niệm riêng: Mộc Đường Môn có phần vật lý chịu kháng vật lý, không phải mọi sát thương Mộc đều chịu kháng độc.

## Kiểm chứng

Harness tạm: `/tmp/jx-damage-audit.mts`; kết quả `/tmp/jx-damage-audit-results.json`. Chạy: `node --import tsx /tmp/jx-damage-audit.mts`. 22 ca strike/formula/HP và10ca cast/timer/missile/collision/applyHit. Assertion kiểm quyền đánh, cast hợp lệ, có hit, HP giảm đúng tổng hit/formula, so sánh các trường hợp mục tiêu.

Dùng Actor/Sim thật, SkillEngine thật và hàm trừ máu thật của server với World/cổng tối thiểu trong bộ nhớ, không khởi động WebSocket/browser. Không phải đối kháng hai tài khoản trong game thật. Không thay nhân vật/đồ người dùng. Cấp100, chiêu20, vũ khí thử cố định100–100; không trang bị/bị động/bùa ngoài các thuộc tính điều chỉnh kháng phục vụ kiểm soát. RNG0,5 cố định; loại biến thiên và chí mạng ở các ca trong bảng. HP/MP lớn để tránh chết/hết nội lực; không dùng chỉ số HP fixture để kết luận cân bằng.

### Một lần phát chiêu thật, theo dõi4giây mô phỏng

Bảng tính sát thương trực tiếp; chưa tick độc trong10ca cast. Số hit là số va chạm thật của lần phát chiêu trong fixture, không khẳng định mọi khoảng cách/trận đấu đều có số hit này. Kháng đặt bằng nhau cho5loại ở từng hàng.

| Cặp hệ | Chiêu cấp20 | Kháng mục tiêu | Hit | Máu mất trực tiếp |
|---|---|---:|---:|---:|
| kim → moc | 19 | 0 | 2 | 842 (421 + 421) |
| kim → moc | 19 | 50 | 2 | 562 (281 + 281) |
| moc → kim | 58 | 0 | 4 | 460 (115 + 115 + 115 + 115) |
| moc → kim | 58 | 50 | 4 | 232 (58 + 58 + 58 + 58) |
| moc → thuy | 58 | 0 | 4 | 924 (231 + 231 + 231 + 231) |
| moc → thuy | 58 | 50 | 4 | 460 (115 + 115 + 115 + 115) |
| moc → tho | 58 | 0 | 4 | 1384 (346 + 346 + 346 + 346) |
| moc → tho | 58 | 50 | 4 | 924 (231 + 231 + 231 + 231) |
| kim → thuy | 19 | 0 | 2 | 562 (281 + 281) |
| kim → thuy | 19 | 50 | 2 | 280 (140 + 140) |

19 = Ma Ha Vô Lượng;58 = Thiên La Địa Võng. Cả hai có seriesdamage_p=50 ở cấp20. So Mộc→Kim và Mộc→Thủy với cùng người đánh/chiêu/kháng mới dùng để kết luận khắc hệ, không so tuyệt đối sức mạnh hai phái dùng hai chiêu khác nhau.

### Các ca bổ sung

- Hoành Tảo Lục Hợp11 Kim→Mộc: kháng đều0/50/75 → sát thương trực tiếp457/305/228, kháng hiệu dụng−50/0/25. Có cả vật lý và băng.
- Thiên La Địa Võng58 Mộc→Kim: kháng đều0/50/75 → trực tiếp115/58/58; độc nhịp đầu6/3/3. Với Mộc→Thủy: trực tiếp231/115/58, độc12/6/3. Nhịp độc chạy qua updateEffects và applyHit, không chỉ đọc công thức.
- Bỏ kháng điều chỉnh, dùng kháng nền từ characterStats: Kim→Mộc skill11 trực tiếp498; Mộc→Kim skill58 trực tiếp115, độc3/nhịp; Mộc→Thủy skill58 trực tiếp231, độc12/nhịp. Mộc nền kháng vật lý−15; Kim kháng độc+25.
- Tầng1113 của Tích Lịch Loạn Hoàn Kích: khi mục tiêu các hệ đều kháng50, sát thương trực tiếp400 cho Kim/Mộc/Thủy/Thổ; không có seriesdamage_p ở tầng1113. Đây là hành vi đã xác minh; chưa đủ dữ liệu engine SHXT để gọi là lỗi thiếu kế thừa.
- Boss fixture giữ cùng def Linh Miêu hệMộc, chỉ thay boss0/1: Ma Ha Vô Lượng19 gây814/hit cả hai, cùng kháng5. BossHoàngKim đầu catalog hệKim kháng25 →421/hit. BossHoàngKim khác hệ nên không dùng814/421 để suy ra mức giảm do tier riêng.

## Boss hiện tại

| Loại | Kháng trước bùa/bị động | Tác động riêng tier |
|---|---|---|
| Quái sinh từ catalog thường |5% chung5loại (HAND có ngoại lệ) | HP/EXP nền |
| Chính quái đó thành BossXanh |giữ def.resist; không tự nâng theo tier |HP/EXP×5, nhiều lượt đồ |
| NPC có cờ boss ở catalog gốc |20% chung5loại qua fromGen |tùy tier spawn |
| BossHoàngKim từ goldenBossFromEntry |25% chung5loại |HP/EXP×12, nhiều lượt đồ |

monsterAt nhận tier choHP; refreshMonsterCombat không nhận tier nên không có kháng tăng riêng khi hóa xanh. Không có hệ số giảm sát thương nhận riêng cho boss trong strike/resolveHit/applyHit. Kháng âm sau khắc hệ được phép:5−50=−45, phần sát thương nhận×1,45, vì vậy boss có thể mất máu mạnh dù có kháng.

## Đối chiếu VLTK-SHXT

Nguồn local `/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`. Đã đọc AGENTS. Không tìm thấy mãC++ engine/server trong cây `/Users/hudy/ws/volam-shxt`; chỉ dùng bảng/script làm chứng cứ trực tiếp. Các tài liệu docs ở repoSHXT là diễn giải, có công thức và khẳng định không có mã engine kèm theo, không dùng làm chuẩn thay nguồn đã xác minh của dự án.

- `script/skill/shaolin.lua`, `script/skill/tangmen.lua`: có seriesdamage_p ở chiêu, ví dụ10→50 ở cấp1→20 và52 ở21 cho các chiêu trong nhóm kiểm tra. Khớp hệ số hiện tại. Bẫy đa sát thương trong tangmen.lua có bộ bốn phần400 và độc80 ở20, không có seriesdamage_p trong block bẫy; không tự kết luận tầng phải kế thừa từ chiêu gốc.
- `settings/npc/player/level_add.txt`: kháng nền Kim/Mộc/Thủy khớp LEVEL_ADD hiện tại (Kim độc+25/hỏa−25, Mộc vật lý−15/lôi+25, Thủy hỏa+25/lôi−25).
- `settings/npcs.txt`: có FireResist/ColdResist/LightResist/PoisonResist/PhysicsResist và trần từng loại. gen-assets hiện không nhập các cột kháng/trần; MonsterDef thay bằng số chung CHỌN.
- `settings/npc/npcgoldtemplate.txt`:16dòng mẫu, có5loại kháng và trần riêng. Các mẫu đầu nhiều ô50/trần100; một số mẫu có một kháng100, mẫu13 cókháng100/trần95. Chỉ xác nhận giá trị và cấu trúc bảng; chưa có engine để biết chính xác là cộng thêm/nhân/giá trị cuối hoặc ánh xạ từng mẫu vàoBossXanh/HoàngKim. Không lấy50 thành kháng mặc định đã chốt.
- `settings/npc/player/pkrate.ini` và `settings/npc/pkrate.ini`: rate=20, EnmityPK=2 cùng thông số tử vong/sát khí. Không đủ chứng cứ coi rate20 là sát thương20% haychia20; dự án hiện dùng0,5 là CHỌN.
- Nghiên cứu cũ `docs/combat-formulas.md`§4 ghi engineJX1 fan có hệ số NPC đặc biệt/PK từ server và ép kháng tối đa95 sau ngũhành. Mã nguồn ấy đã bị xóa, không phải mãserverSHXT vừa kiểm. Chỉ là đối tượng cần xác minh, chưa thể gắn cho serverSHXT thật.

## Nhận xét và bước tiếp theo chưa được duyệt

Không nên sửa theo giả thuyết toàn bộ kháng/ngũhành vô hiệu. PvP kiểm soát cho thấy cả hai hoạt động. Cảm giác boss ít kháng có căn cứ ở cấu hình5/20/25 chung và BossXanh không tăng kháng theo tier. Ưu tiên điều tra/thiết kế nhập kháng và template NPC trước khi cân bằng bằng tăngHP/giảm toàn bộdamage.

Các điểm cần quyết định riêng nếu muốn sửa: nhập5kháng/trần và cách áp templateBoss, chính sách tầngchiêu kế thừa ngũhành, giữ kháng vượttrần làm dựtrữ chống giảmkháng và trần sau ngũhành (hiện trần75 mặc định khiến50+50 vẫn75; characterStats đã kẹp trước xuyên/ngũhành), hệ sốPvP0,5 và có cần Cừu sát riêng. Chưa triển khai hoặc coi các đề xuất là đã duyệt.

Luật server/shared áp dụng chungWeb/Desktop/Mobile; lượt này không kiểmUI hoặc chạy native/touch. Hai fileSpawnStore/SpawnEditor có sẵn lúc bắt đầu và thay đổiBoss/MapManager xuất hiện đồng thời được giữ nguyên; không thuộc điều tra. Graph index commit1055fac; phần gameplay kiểm tra khớp source, index báo stale vì hai filetool mới chưa nhập, không coi graph là bằng chứng bao phủ toàn bộ mã đồng thời.

## Bổ sung sau khi tra cứu PAK sâu hơn — 2026-11-16

Đã tìm được script npclevelscript/makeboss.lua, property.lua và lib.lua trong PAK thắng, xác minh kháng Hoàng Kim dạng A|B = floor(A×cấp+B).43/44boss hiện có dòngNPC, tất cả5trần95; NPC tự tạo10031 chưa có dòng nguồn. Điều này bổ sung phần dữ liệu NPC của báo cáo, không thay kết luận chưa có mã engine server nhận sát thương hoặc chưa rõ cách engine áp template. Phương án chưa triển khai ở [boss-resistance-pvp-proposal-2026-11-16.md](boss-resistance-pvp-proposal-2026-11-16.md).
