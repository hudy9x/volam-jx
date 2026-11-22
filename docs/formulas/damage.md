# Sát thương

Mã: `packages/shared/src/formulas/damage.ts` (`skillDamage`, `hitChance`, `effectiveResist`, `resolveHit`), chỉ số chiến đấu
`formulas/combat.ts` (`CombatStats`, `playerCombat`, `monsterCombat`, `passiveBag`, `skillBonuses`), hằng số `formulas/tuning.ts`
(`HIT`, `CRIT`, `PVP`, `RESIST`). Gọi từ `skills/engine/SkillEngine.ts` (`strike`) — **cùng một đường cho người chơi, quái, boss**.
Chế độ ngẫu nhiên 50–150 cũ (`DAMAGE_MODE`) đã gỡ ở vòng 31. Núm cân bằng: `skills/core/tuning.ts` `DAMAGE_SCALE` (toàn cục),
`factions/<phái>/tuning.ts` `damage` (từng chiêu).

## Đường đi của một đòn

```
CombatStats (người đánh)        CombatStats (mục tiêu)
  │  chỉ số nhân vật / đường cong quái + túi thuộc tính (trang bị + bị động + bùa)
  ▼
skillDamage(chiêu, cấp)  ──►  lực tay: vật lý [min,max], băng / hỏa / lôi [min,max], độc (mỗi nhịp, thời gian, chu kỳ)
  ▼
resolveHit
  1. trúng / né (chỉ chiêu IsUseAR)            → Trượt
  2. chí mạng, chí tử                          (tung xác suất)
  3. tung giá trị từng phần; chí mạng: vật lý ×2; chí tử: mỗi phần nguyên tố = sinh lực hiện tại × 30–50 %
  4. mỗi phần × (100 − kháng hiệu dụng)/100    (kháng − xuyên kháng ± ngũ hành, kẹp trong trần)
  5. tổng × PK 0,5 nếu người đánh người
  ▼
hitEffects (effects.md)  ──►  choáng / chậm / độc / co giật
  ▼
server applyHit: nội lực hộ thân (chỉ đòn trực tiếp; độc DoT trừ thẳng sinh lực), trừ sinh lực, ghi sát thương (chia exp), thục luyện, hiệu ứng
```

## 1. Lực tay (`skillDamage`) — SRC `KPlayer::GetEchoDamage`, WEB 52pk 2004

| Phần | Công thức |
|---|---|
| Cộng% | `addskilldamageN` của mọi chiêu đã học (P1 = id chiêu được cộng, P3 = %) — vd. Nhân Kiếm Hợp Nhất cộng % cho Kiếm Thùy Tinh Hà |
| Vật lý (chiêu có `physicsenhance_p` = P%) | gốc × (100 + P × (100 + Cộng%)/100 + thông thạo vũ khí)/100 |
| Gốc | người chơi: vũ khí + Sức mạnh ÷ 5 (ám khí: Thân pháp ÷ 5) + `addphysicsdamage_v` ([character.md](character.md)); quái: đường cong |
| Thông thạo vũ khí | `addphysicsdamage_p` của bị động / bùa; P3 = loại vũ khí (0 kiếm, 1 đao, 2 côn, 3 thương, 4 chùy, 5 song đao, 7 ám khí, 9 tay không; giá trị khác = mọi vũ khí) — INFERRED |
| Vật lý cộng thẳng | `physicsdamage_v` [P1, P3] × (100 + Cộng%)/100 |
| Băng / hỏa / lôi | `colddamage_v` / `firedamage_v` / `lightingdamage_v` [P1, P3] × (100 + Cộng%)/100 + đồ: chiêu ngoại công `addXdamage_v`, nội công `addXmagic_v` |
| Hỏa / lôi tăng cường | `fireenhance_p` nâng **mức trên** hỏa, `lightingenhance_p` nâng **mức dưới** lôi (DATA nhãn `magicdesc.ini`) |
| Độc | `poisondamage_v` P1 mỗi nhịp × (100 + Cộng%)/100 + `addpoison…`; P2 tổng thời gian, P3 chu kỳ (frame) |
| Đánh thường (không có thuộc tính sát thương) | gốc × (100 + thông thạo)/100 |

Ngoại công = chiêu có `physicsenhance_p` hoặc cờ `IsPhysical`; còn lại nội công.

## 2. Trúng / né (`hitChance`) — SRC `CheckHitTarget`

- Chỉ chiêu có **`IsUseAR = 1`** trong `skills.txt` (128 dòng: chiêu ngoại công cận chiến Thiếu Lâm, Thiên Vương…) mới có thể trượt;
  chiêu khác luôn trúng (DATA).
- Theo **chiêu**, không theo phái. Số chiêu có `IsUseAR` (đếm trong `skills.gen.ts`, 2026-11-12): Thiên Vương 29 / 43, Thiếu Lâm 10 / 30,
  Võ Đang 4 / 25 (Tam Hoàn Thao Nguyệt, Nhân Kiếm Hợp Nhất, Thái Cực Kiếm Ý, Kiếm Thùy Tinh Hà), Thiên Nhẫn 4 / 26 (Thâu Thiên Hoán Nhật,
  Vân Long Kích, Giang Hải Nộ Lan, Ma Âm Kích), Đường Môn 1 / 37 (Thiên La Địa Võng tiểu Phi Đao); Nga My, Thúy Yên, Cái Bang, Côn Lôn,
  Ngũ Độc, Hoa Sơn (bảng mod) 0. Ngoài phái: đánh thường (1, 2, 53, 445–449) và vài chiêu quái (Ném đá, Ném lông…).
- Né tránh có ích cho **mọi** phái khi bị đánh bằng các chiêu trên; `HIT.min` / `HIT.max` chỉ ảnh hưởng chúng.
- Tỉ lệ trúng = Chính xác × 100 / (Chính xác + Né × (100 − bỏ qua né)/100), kẹp **40–95 %** (SRC; WEB cũ nói 5 % — chọn 40).
- Chính xác của chiêu × (1 + `attackrating_p` của chiêu/100); bỏ qua né = `ignoredefense_p` của chiêu + túi.

## 3. Chí mạng, chí tử

| | Công thức | Nguồn |
|---|---|---|
| Chí mạng | xác suất = `deadlystrike_p` chiêu + `deadlystrikeenhance_p` (bị động, bùa) + `deadlystrike_p` túi, tối đa **75 %**; phần vật lý **×2** | SRC · WEB (×2) · JXWEB / CHỌN (trần 75) |
| Chí tử | xác suất = `fatallystrike_p` chiêu − `fatallystrikeres_p` mục tiêu; mỗi phần nguyên tố = sinh lực **hiện tại** × 30–50 % | SRC |

## 4. Kháng và ngũ hành (`effectiveResist`)

```
kháng = kháng mục tiêu (gốc theo hệ + đồ + bùa, character.md)
      − xuyên kháng người đánh (anti_<loại>res_p, anti_allres_p — thuộc tính bản mod)
      − seriesdamage_p của chiêu   nếu hệ của chiêu KHẮC hệ mục tiêu
      + seriesdamage_p của chiêu   nếu hệ mục tiêu KHẮC hệ của chiêu
kẹp trong [−trần, min(trần, 95)], trần = 75 + allresmax_p + <loại>resmax_p
phần sát thương × (100 − kháng) / 100
```

- Vòng khắc: Kim → Mộc → Thổ → Thủy → Hỏa → Kim. Hệ của chiêu = cột Series của chiêu, không có thì hệ người dùng.
- `seriesdamage_p` có trên 169 chiêu (10 / 30 / 50 / 60 / 80 theo bậc) — DATA. Chiêu không có: ngũ hành không đổi kháng.
- "Ngũ hành cường hóa / nhược hóa" (`five_elements_*`) và `me2X / X2me` (mod): chưa dùng (không chiêu phái nào có; dấu trong mã SRC trông ngược).

## 5. PK

Người đánh người: tổng × **0,2** (`PVP.damageScale`) thông thường, × **0,4** (`PVP.counterDamageScale`, gấp 2× đánh thường) khi hệ tấn công khắc hệ mục tiêu (vd. Mộc đánh Thổ). Trong `effectiveResist`, kháng mục tiêu được kẹp trần (`cap`) **trước** khi trừ xuyên kháng và `seriesdamage_p` khắc hệ để trang bị overcap kháng không vô hiệu hóa ngũ hành tương khắc. Độc sát DoT (`hit.dot`) bỏ qua cả `manashield_p` lẫn `staticmagicshield_p` (`shieldHp`) và trừ thẳng HP. Hộ Thuẫn Nội Lực tĩnh (`staticmagicshield_p`, `staticShieldPool`) quy đổi theo `STATIC_SHIELD.scale = 0.15` (Tiêu Dao cấp 20 còn `150%` = 1,5× MaxMP), kẹp trần `STATIC_SHIELD.maxHpRatio = 1.0` (`100%` MaxHP) và không tự bơm đầy lại `shieldHp` khi cùng một skill đang còn hiệu lực được tái kích hoạt.

## Ví dụ (thử 2026-11-12, `scratchpad` combat6)

Thiếu Lâm cấp 20 (Sức mạnh 35, côn) đánh quái cấp 15 (Né 65): Kim Cang… / Hoành Tảo Lục Hợp cấp 10 — lực tay vật lý 56–78 + băng 36
(bị động), tỉ lệ trúng 81 %. Quái cấp 3 (59 sinh lực): cấp 10 hạ trong 3 đòn, mất 14 máu.

## Còn thiếu / tự chọn

- **Phản đòn** (vòng 26): `damageReturn` — `meleedamagereturn_p/_v` (chiêu cận chiến, `SkillDef.melee`) hoặc `rangedamagereturn_p/_v`,
  × (1 − `returnres_p` [+ `melee_returnres_p`] của kẻ đánh); đòn phản không bị phản lại (CHỌN).
- **Hút sinh lực / nội lực** (vòng 32, `lifeSteal`): người đánh nhận lại % sát thương của đòn trực tiếp = `steallife_p` / `stealmana_p` của
  chiêu (ở cấp chiêu) + `steallifeenhance_p` / `stealmanaenhance_p` của vũ khí / bùa; không tính độc, phản đòn, phần sát thương thừa khi
  mục tiêu chết. Cộng hai nguồn và trần 50 % (`STEAL.maxPct`) là CHỌN (không có mã engine).
- Hóa giải (`block_rate`), khiên điểm (`dynamicmagicshield_v`, `staticmagicshield_p`), họ `_yan_`: chưa áp (nghĩa chưa rõ hoặc chưa làm).
- Kháng quái: một giá trị chung cho 5 loại (CHỌN) tới khi nhập kháng từng quái (GP10).

## Kháng Boss riêng (2026-11-16)

Boss Xanh theo tier của instance: năm kháng gốc50, trần95 (CHỌN dựa mẫu Lãnh tụ SHXT). Boss Hoàng Kim dùng43hồ sơ NPC PAK/makeboss, mỗi loại `floor(A×cấp+B)`, trần theo nguồn; NPC tự tạo10031 tạm25/trần75. Tool cho phép override năm giá trị cố định và trần. Bùa/bị động vẫn cộng vào hồ sơ mỗi lần refresh, không mutate MonsterDef của quái thường. Công thức ở `formulas/boss-resistance.ts`, núm Xanh ở `formulas/tuning.ts BLUE_BOSS_RESISTANCE`.

Lượt này giữ nguyên thứ tự kẹp kháng và ngũ hành/PvP đang có: kháng trước đòn bị kẹp trong trần rồi effectiveResist xử lý như cũ. Đề xuất giữ kháng dư và trần cuốiPvP95 chưa triển khai. Giá trị gốc243 không đồng nghĩa kháng thực dụng243.

## Hệ số sát thương Boss Hoàng Kim — USER2026-11-19

`GoldenBossEntry.damagePercent` mặc định100,1–10000%; chuyển vào MonsterDef rồi CombatStats.outgoingDamageMultiplier khi refresh. SkillEngine.strike nhân kết quả sát thương trực tiếp sau resolveHit với hệ số này, giữ DAMAGE_SCALE/tuning chiêu. Chiêu con dùng stats cùng owner nên chỉ nhân một lần mỗi hit. Độc nhân hit.poison.tick một lần trước hitEffects/poisonFromHit để vẫn giữ giảm độc/trần gộp và snapshot khi gắn; tick không nhân lần nữa. Không tăng hồi máu, phản đòn hoặc thời gian khống chế; min1/làmtròn sát thương giữ luật cũ. Công cụ chỉnh riêng/nhóm, Apply kiểm lại hệ số server nhận.
