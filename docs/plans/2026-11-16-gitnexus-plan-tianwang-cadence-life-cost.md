# Phương án Thiên Vương: nhịp xuất chiêu riêng và tiêu hao sinh lực

> Trạng thái: **ĐÃ TRIỂN KHAI CODE & TESTS (19/19 PASS)**. Chờ USER nghiệm thu và quyết định cân bằng DPS.
> Commit nền: 91731b79586cb74d2be737ee5df7fd0b389b9982 (HEAD).
> Nguồn sự thật: `packages/shared/src/skills/factions/tianwang/tuning.ts` là nơi cấu hình duy nhất.

## Objective (§1)
Thiên Vương dùng nhịp động tác riêng tương đương cấu hình hiệu lực volamidle, chiêu được chỉ định tiêu haoHP; mọi số chỉnh ở mộtfile, server quyếtđịnh, shared dùngchung Web/Desktop/Mobile.

## Current Behaviour (§2–3)
- [verified] `castNow` ở `apps/server/src/world/systems/combat.ts:39` dùng timing theo túi tốcđánh; client nhận actionMs, không cần bảng animation mới.
- [verified] `SkillEngine.check/cast` ở `packages/shared/src/skills/engine/SkillEngine.ts:122,139` kiểm/trừMP mọichiêu player; monsters miễnphí. SkillCost ở core/info.ts chỉ trả lượngcost.
- [verified] Auto client và BotClient.ready vẫn soMP; AutoPlay.ts:284 dùng toàn bộ costmain để yêu cầu uốngMP. Describe.ts:147 lấy tên tài nguyên từ costType thô, ThiênVươngcostType2 đang hiển thị Thểlực.
- [verified] Engine.cast đợi hết pose mới launch; launch giữ ChildSkillNum/genData/wait và đạncon theo timeline riêng. Đây khác cách volamidle quy đổi nhiềuhit thành nhịp/chi phí đơn vị.

## Findings (§4–5)
- [graph] `query('castTiming skillCost mana attack speed')` xác định castNow/processPending/Auto/SkillLab; `impact(skillCost,upstream,depth1)` báo **CRITICAL**,7directcallers: WorldScene.cost/ready, BotClient.cost/ready, levelBlock, SkillEngine.check/cast; tất cả đã được account dưới đây.
- [graph] PDG `impact(SkillEngine,mode=pdg,line139)` trả UNKNOWN, chỉ chiếu2statement135/136; không dùng làm bằngchứng đủ phụthuộc hay antoàn. Xác minh bằng source guard/spend/schedule; executor phải chạy impact mới trước chỉnh.
- [verified, external evidence from prior investigation] volamidle skills-01.js:434–460 cóh4/o7; attributes-02.js:46,68 chọn nhịpriêng thayaspdP. ActorAttackTiming qua bảngmốc cho500/400/2000÷7ms. Đây là lựa chọn của bản thamchiếu, chưa phải engineSHXT.

## Proposed Changes (§6)
- [inferred] **Nguồn số duy nhất:** mở rộng `skills/factions/tianwang/tuning.ts`, giữ registry/tuningOf hiện có. Thêm3profile động tác và whitelistHP; dùng constant/object chung, không copy số vào server/client/bot. File `core/casting.ts` MỚI chứa helperthuần; SkillTuning ởcore/types.ts thêm timing/resource override (tênfield đềxuất).
- Cấu hình timing đềxuất: `{ mode:'fixed', cycleMs, affectedByCold:true }`; helper lấy fixedcycle, băng×2 theo EFFECTS.slowFactor hiện có; bỏ bonus ngoại/nội của actor và bỏ lượng nền SPEED trong nhánhfixed. Chiêu khôngoverride dùng attackTiming hiện tại. Không sửa bảngSPEED hoặc nhịp phái khác.

| Profile | ID | Chu kỳ động tác mặc định |
|---|---|---:|
| Chậm riêng |29,30,34|500ms|
| Vừa riêng |31,35,37|400ms|
| Nhanh riêng |32,41,322,323,324,325,1058,1059,1060|2000÷7ms≈285,714ms|

- ĐoạnHồn40 giữ đường timing theoactor +cd27tick, buff33/42 giữ timing thường; khôngép mọichiêuTV cùngmộtchu kỳ. 150 gán trực tiếp cácprofile trên, khôngcopy liênkết1059→323/1060→325 thành luật vũkhí.
- Tài nguyên đềxuất: `{ resource:'hp', multiplier:1, minRemainingHpRatio:0.25, minRemainingHp:1 }` dùng chung; whitelist29/30/31/32/33/34/35/37/40/41/42/322/323/324/325/1058/1059/1060. Passive36 khôngtrừ;708/724 không tựchuyển; common/pháikhác giữ hànhviMP cũ. Tất cả số/chiphí riêng nằmtrong tuning.ts, helper khôngnhúng factionid của caster.
- Lượngtrừ=`skillCost` ởcấp hiệu lực, **mộtlần cho toàncombo khi bắtđầu**; khôngchia cost theo sốhit nhưvolamidle. Điều kiện HP-cost≥max(1,ceil(maxHp×0,25)); MP0 vẫnđược castHP. ThiếuHP từchối rõ, khôngâm/khôngtựchết. Không gọi applyHit nên khôngtínhPK/kill/hút/reflect/hurt từchiphí; khônghoàn khi chiêu bịngắt, giữluật hiệnhành.
- Giữ API skillCost trảsố để tránh phá callers; thêm resolver `{resource,amount,reserve}` và helpercanPay dùngcùng server/client/bot/tooltip. Check và debit diễnra cùng servercast, mọi điều kiện từchối trướcdebit; bảo vệ đườngcast trựctiếp để khôngthể vượtguard vì lab hoặc lời gọi nội bộ. Quái giữ castmiễnphí nhưhiện tại.
- `AutoHost.cost` được nâng thành thôngtin cóloại (hoặc thêmresourceCost tươngthích), cậpnhật2host và testfixtures; uốngMP chỉ dùngcostMP, costHP đưa vào nhánhthuốcHP khi tùychọncho phép. Không tựbật thuốc/đổi ngưỡngUSER hoặc thaythuốc. Ready dùngHP đúngnguồn, buff cũngvậy; không fallback đánhthường để lách dựtrữHP đangthấp.
- Tooltip lấy tên/amount từ resolver; hiện “nhịp riêng” vàms thực tế khi xemchiêu, không sửa toànbộ enumcostType từ template chưa chắc chắn. SkillLab dùnghelpercùnggame và cho thấy chi phíHP; character tốcđánh chung vẫn là chỉsốactor, không giảvờ mọichiêu dùng nó. ActorView dùngactionMsserver hiệncó.

## Implementation Sequence (§7)
1. Thêmtypes/config/helper thuần vàvalidation: finite cycle>0, ratio0..1, cost≥0, IDhợplệ/castable, tránhreferencecycle; không đọc/ghi DB.
2. Nối server timing, check/spend vàsyncHP; giữsafezone/weapon/mounted/cooldown/target gates. Đảm bảo chiêukhác vàquái giữhànhvi.
3. Nối Auto/client/bot/tooltip/SkillLab và cậpnhật tấtcảtestfixtures cho costcóloại; khôngviết nhịpriêng trongrenderer.
4. Thêmtests, kiểmWS/browser tại2568/5174/DBriêng, đo cadence/hit/DPS; ghi docs/formulas/speed.md, docs/auto.md, phầnskillcost vàtracking sau khi USER duyệt triểnkhai. Khôngcommit/push nếuchưa yêucầu.

## Test Strategy (§8)
- Mới `tests/tianwang-casting.test.ts`:15ID fixed khi actorbonus0/+100/+200; băng chu kỳ×2/hếtbăng trởlại;40 fallback; buff/passive/chiêukhác khôngép.
- HP0/1, dưới/đúng/trênbiên25%, MP0/đầy, cost0, levelbonus; nhiềuhit vàcác tầng chỉtrừmộtlần; ngắt khônghoàn, castbịtừchối khôngtrừ, quái miễnphí.
- Tíchhợp click/Auto/bot/SkillLab: cùngID/level cho cùngnhịp vàchi phí; Auto khôngspamMP khi chiêuHP, HPthấp giữđích/chờthuốc khôngtựchết. Giữcáccase thuốc/ngựa/tổđội đãcó.
- Đếm toàncombo vàhit theo10giây với thờiđiểm engine thật; cùngngẫu nhiên/target/kháng; so damage mỗi cast vàDPS. Phânbiệt actionMs lýthuyết với20tick/s có thể làmtròn≈300ms vàFPS client; khôngbáo285,714ms đãđạt trướcđo.
- Chạy `npm run test:speed`, `test:effects`, `test:auto`, `test:bots`, `typecheck`, `build`; suiteTVmới bằngNode/tsx hoặc thêmscript thật khi triểnkhai. NativeDesktop/Mobile cầnkiểmriêng, luật shared dùngcả3.

## Assumptions and Open Questions (§12)
- [assumed] 25%HPdựtrữ là đềxuất theo clientvolamidle, chưaUSERduyệt chínhsách. Không lấy cách trừMP của onlineRustvolamidle làmchuẩn.
- [inferred] Nhịp≈286ms kèm fullcombo cóthể chồngchuỗi và tăngDPS mạnh. Phươngán giữ sốhit/tầng/damage/timeline gốc, chấpnhận theo dõi combo đãphát nhưenginehiệncó; nếu cân bằng khôngđạt phải báoUSER chọnchỉnh cycleMs, không tựgiảm damage/đổi sốhit hoặc chiaHPcost.
- Ngoài phạmvi: giatốc chiêu/pháikhác, đổi damage/range/projectiles/vũkhí/tầng150, resetbot, mạng/schema mới, HMR cấuhình, thay render/preset; reloadserver/client/runner sau thayđổi mã khiđược phép.

## Definition of Done (§13)
Chỉ sau USERduyệt: mộtnguồn tuning choTV; server/client/bot/lab cùnghelper; đổiđồ/tốcđánh khôngđổi fixedtiming; castTV dùngHP đúngbiên vàkhôngtrừMP; đủhit/tầng/damage, đếmchi phí1lần; regression đạt vàbáocáoDPS/cadence thực đo. Lượt lập kếhoạch khôngchạytriểnkhai.

## Implementation Context (§11)
```json
{
  "implementation_context": {
    "task_summary": "Phương án chưa triển khai: Thiên Vương nhịp riêng tương đương volamidle và tiêu hao sinh lực có cấu hình tập trung.",
    "evidence_provenance": {
      "schema_version": 2,
      "head_commit": "91731b79586cb74d2be737ee5df7fd0b389b9982",
      "generated_plan_path": "docs/plans/2026-11-16-gitnexus-plan-tianwang-cadence-life-cost.md",
      "global_dirty_digest": {
        "algorithm": "sha256",
        "canonicalization": "gitnexus-evidence-provenance-v2 NUL-framed UTF-8 records",
        "value": "717e875bad5077c4ab21e08625f1157122d4368ab6d5f0c7aee44162beaf54e8"
      },
      "cited_path_manifest": [
        {
          "path": "apps/client/src/dev/skill-lab/SkillLabScene.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:7a64393c0ae76221a47747ff7acba4154acdbd842c0959308a25df2403af0d1c",
          "index_digest": "sha256:7a64393c0ae76221a47747ff7acba4154acdbd842c0959308a25df2403af0d1c",
          "worktree_digest": "sha256:7a64393c0ae76221a47747ff7acba4154acdbd842c0959308a25df2403af0d1c",
          "untracked_digest": "absent"
        },
        {
          "path": "apps/client/src/game/WorldScene.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:3da58baefcc4f6539843945379d10796f2f7e882aef070360b608b33106c94f2",
          "index_digest": "sha256:3da58baefcc4f6539843945379d10796f2f7e882aef070360b608b33106c94f2",
          "worktree_digest": "sha256:3da58baefcc4f6539843945379d10796f2f7e882aef070360b608b33106c94f2",
          "untracked_digest": "absent"
        },
        {
          "path": "apps/server/src/world/systems/combat.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:141111f5ca8e8471365570c6fd663a1785cf351b99573a3a6fd2cf4f2208b05c",
          "index_digest": "sha256:141111f5ca8e8471365570c6fd663a1785cf351b99573a3a6fd2cf4f2208b05c",
          "worktree_digest": "sha256:141111f5ca8e8471365570c6fd663a1785cf351b99573a3a6fd2cf4f2208b05c",
          "untracked_digest": "absent"
        },
        {
          "path": "apps/server/src/world/systems/effects.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:64aa76aedddbc65ae1964d0d7f565706399a569fc5441ca5750457c40fa57b1a",
          "index_digest": "sha256:64aa76aedddbc65ae1964d0d7f565706399a569fc5441ca5750457c40fa57b1a",
          "worktree_digest": "sha256:64aa76aedddbc65ae1964d0d7f565706399a569fc5441ca5750457c40fa57b1a",
          "untracked_digest": "absent"
        },
        {
          "path": "package.json",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:e76a69f45293714b1a58ee9c33aef19977ee9fd6d17a99cd6821927db8dd0f2a",
          "index_digest": "sha256:e76a69f45293714b1a58ee9c33aef19977ee9fd6d17a99cd6821927db8dd0f2a",
          "worktree_digest": "sha256:e76a69f45293714b1a58ee9c33aef19977ee9fd6d17a99cd6821927db8dd0f2a",
          "untracked_digest": "absent"
        },
        {
          "path": "packages/shared/src/auto/AutoPlay.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:87e232fa4e520bd4f8f28f8754f8255edb859227bb3cdd747a0b4225d5e5a92b",
          "index_digest": "sha256:87e232fa4e520bd4f8f28f8754f8255edb859227bb3cdd747a0b4225d5e5a92b",
          "worktree_digest": "sha256:87e232fa4e520bd4f8f28f8754f8255edb859227bb3cdd747a0b4225d5e5a92b",
          "untracked_digest": "absent"
        },
        {
          "path": "packages/shared/src/skills/core/describe.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:a0fdbee1eb892b907553405038d427566e6486142bc68141f5216a9a6c788a38",
          "index_digest": "sha256:a0fdbee1eb892b907553405038d427566e6486142bc68141f5216a9a6c788a38",
          "worktree_digest": "sha256:a0fdbee1eb892b907553405038d427566e6486142bc68141f5216a9a6c788a38",
          "untracked_digest": "absent"
        },
        {
          "path": "packages/shared/src/skills/core/info.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:acc91236f0c76bf50e6f6b3880d661bc011e3d2143897ae3f984090a07f55624",
          "index_digest": "sha256:acc91236f0c76bf50e6f6b3880d661bc011e3d2143897ae3f984090a07f55624",
          "worktree_digest": "sha256:acc91236f0c76bf50e6f6b3880d661bc011e3d2143897ae3f984090a07f55624",
          "untracked_digest": "absent"
        },
        {
          "path": "packages/shared/src/skills/core/types.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:5e1201976fd139035a9965e65fc99157c7b665e858beda26e0d74bff09b316dd",
          "index_digest": "sha256:5e1201976fd139035a9965e65fc99157c7b665e858beda26e0d74bff09b316dd",
          "worktree_digest": "sha256:5e1201976fd139035a9965e65fc99157c7b665e858beda26e0d74bff09b316dd",
          "untracked_digest": "absent"
        },
        {
          "path": "packages/shared/src/skills/engine/SkillEngine.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:487e6d2d52b02ce62b07b1a52f4cfe51941144916a427b136f9d698d70d491da",
          "index_digest": "sha256:487e6d2d52b02ce62b07b1a52f4cfe51941144916a427b136f9d698d70d491da",
          "worktree_digest": "sha256:487e6d2d52b02ce62b07b1a52f4cfe51941144916a427b136f9d698d70d491da",
          "untracked_digest": "absent"
        },
        {
          "path": "packages/shared/src/skills/factions/tianwang/tuning.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:c79298759a28b351471cd7a70a0c24a0e2ce4e2d99dea1a0af5c3e008b3ab881",
          "index_digest": "sha256:c79298759a28b351471cd7a70a0c24a0e2ce4e2d99dea1a0af5c3e008b3ab881",
          "worktree_digest": "sha256:c79298759a28b351471cd7a70a0c24a0e2ce4e2d99dea1a0af5c3e008b3ab881",
          "untracked_digest": "absent"
        },
        {
          "path": "tests/speed-phases.test.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:c54db48fcfda1358ce492fdfc1cf1cbd09cef1cdd041391fe6be43ba896a00b0",
          "index_digest": "sha256:c54db48fcfda1358ce492fdfc1cf1cbd09cef1cdd041391fe6be43ba896a00b0",
          "worktree_digest": "sha256:c54db48fcfda1358ce492fdfc1cf1cbd09cef1cdd041391fe6be43ba896a00b0",
          "untracked_digest": "absent"
        },
        {
          "path": "tools/bots/runner/BotClient.ts",
          "object_kind": {
            "head": "regular",
            "index": "regular",
            "worktree": "regular",
            "untracked": "absent"
          },
          "state": "clean",
          "rename_from": null,
          "rename_to": null,
          "head_digest": "sha256:3cf9a8b67b915a693fbfee73ddec4942f55f7e2306a5aa7752da990b2b80e76c",
          "index_digest": "sha256:3cf9a8b67b915a693fbfee73ddec4942f55f7e2306a5aa7752da990b2b80e76c",
          "worktree_digest": "sha256:3cf9a8b67b915a693fbfee73ddec4942f55f7e2306a5aa7752da990b2b80e76c",
          "untracked_digest": "absent"
        }
      ]
    },
    "files_to_modify": [
      {
        "file": "packages/shared/src/skills/factions/tianwang/tuning.ts",
        "symbols": [],
        "intended_change": "Cấu hình tập trung nhóm nhịp và whitelist tiêu hao HP."
      },
      {
        "file": "packages/shared/src/skills/core/types.ts",
        "symbols": [],
        "intended_change": "Mở rộng SkillTuning bằng kiểu timing/resource rõ nghĩa."
      },
      {
        "file": "packages/shared/src/skills/core/info.ts",
        "symbols": [],
        "intended_change": "Giữ skillCost trả số; thêm resolver tài nguyên và điều kiện chi trả."
      },
      {
        "file": "packages/shared/src/skills/core/describe.ts",
        "symbols": [],
        "intended_change": "Tên tài nguyên theo resolver; không sửa enum toàn game theo phỏng đoán."
      },
      {
        "file": "packages/shared/src/skills/engine/SkillEngine.ts",
        "symbols": [],
        "intended_change": "Check/spend HP hoặc MP nhất quán, nguyên tử ở đầu cast."
      },
      {
        "file": "packages/shared/src/auto/AutoPlay.ts",
        "symbols": [],
        "intended_change": "AutoHost cung cấp chi phí có loại; ngưỡng uống thuốc dùng đúng tài nguyên."
      },
      {
        "file": "apps/server/src/world/systems/combat.ts",
        "symbols": [],
        "intended_change": "castNow truyền skill và level vào helper timing shared."
      },
      {
        "file": "apps/server/src/world/systems/effects.ts",
        "symbols": [],
        "intended_change": "Adapter timing dùng skill id; giữ combat stats và slowed."
      },
      {
        "file": "apps/client/src/game/WorldScene.ts",
        "symbols": [],
        "intended_change": "ready và cost của Auto theo resolver dùng chung."
      },
      {
        "file": "tools/bots/runner/BotClient.ts",
        "symbols": [],
        "intended_change": "ready/cost bot tương tự client, không đặt luật riêng."
      },
      {
        "file": "apps/client/src/dev/skill-lab/SkillLabScene.ts",
        "symbols": [],
        "intended_change": "Thử cùng timing/resource helper; chế độ thử có vitals được reset rõ."
      },
      {
        "file": "tests/speed-phases.test.ts",
        "symbols": [],
        "intended_change": "Giữ kiểm hồi quy SPEED hiện có; thêm kiểm đường fallback."
      },
      {
        "file": "packages/shared/src/skills/core/casting.ts",
        "symbols": [],
        "intended_change": "File MỚI đề xuất: helper thuần skillTiming/skillResourceCost/canPaySkillCost; xuất qua shared skills/index.ts."
      }
    ],
    "tests": [
      {
        "file": "tests/tianwang-casting.test.ts (mới đề xuất)",
        "scenarios": [
          "15 skill fixed giữ nhịp khi bonus tốcđánh thayđổi; skill40/pháikhác fallback",
          "Đủ/thiếuHP tại biên25%; MP0 vẫncastHP, HPthiếuvẫnchặn khiMPđầy",
          "Mộtlầncast trừđúngcost, nhiềuđòncon khôngtrừthêm; bịngắt khônghoàn",
          "10giây đánh liên tục kiểm sốcombo/sốhit và DPS; không nhầm rawRate với combo rate",
          "Click/Auto/bot/SkillLab đồng nhất; khôngspamMP vìchiphíHP",
          "Safezone/cooldown/weapon/mounted invalid khôngtrừ; quái miễnphí; các tầng damage giữ nguyên"
        ]
      }
    ],
    "verification_commands": [
      "node --import tsx --test tests/tianwang-casting.test.ts (sau khi tạo)",
      "npm run test:speed",
      "npm run test:effects",
      "npm run test:auto",
      "npm run test:bots",
      "npm run typecheck",
      "npm run build"
    ],
    "pdg_constraints": [],
    "assumptions": [
      "500/400/2000÷7ms là đề xuất lấy nhịp độngtác hiệu lực từ volamidle, không phải xác nhận engineSHXT.",
      "HP còn lại25% là chínhsách đề xuất, cần USER duyệt cùng phươngán; không áp cho quái."
    ],
    "open_questions": [
      "Chưa đo DPS với combo engine hiện tại; nếu quá mạnh cần báo USER và cân nhịp qua cấu hình, không tự giảm damage/sốhit."
    ],
    "avoid": [
      "Không triển khai trước USER duyệt.",
      "Không sửa *.gen.ts, assets, SPEED chung, DB, tiếntrình người dùng hoặc repo thamchiếu.",
      "Không áp mapping150 volamidle như mapping vũkhí; gán profile trực tiếp theo ID.",
      "Không đổi phụthuộc tốcđánh các phái khác, không sửa Autođộtrễ/giữđích đang do phiênkhác nghiêncứu."
    ]
  }
}
```
