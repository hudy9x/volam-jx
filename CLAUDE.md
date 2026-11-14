# CLAUDE.md — jx-system-online

**Tra cứu hiệu ứng chiến đấu — bắt buộc:** khi nhắc **băng sát/làm chậm, choáng, trúng độc, co giật/thọ thương, phục hồi, giảm thời gian trạng thái hoặc vòng sáng/màu trạng thái**, đọc toàn bộ [docs/formulas/effects.md](docs/formulas/effects.md) trước khi giải thích, đề xuất hay sửa mã. Công thức và cấu hình độc lập ở `packages/shared/src/formulas/effects/`; hình ảnh ở `apps/client/src/game/fx/controlEffects.ts`. Nếu liên quan nhịp bước/vận tốc/FPS đọc thêm [docs/formulas/speed.md](docs/formulas/speed.md). Phân biệt phần đã triển khai với đề xuất băng tốc độ cố định chưa duyệt. Không yêu cầu người dùng nhắc lại đường dẫn.

**Tra cứu định giá thị trường — bắt buộc:** khi người dùng nhắc **định giá đồ, giá thị trường, kinh tế game, cung cầu, học giá, tự điều chỉnh giá, tự tăng/giảm giá bot hoặc lịch sử giao dịch/marketSales**, đọc [docs/rao-ban.md](docs/rao-ban.md) và toàn bộ [docs/research/market-pricing-plan.md](docs/research/market-pricing-plan.md) trước khi giải thích, đề xuất hay sửa mã. Phân biệt giá cấu hình đã có với học giá thị trường chưa triển khai; yêu cầu lưu nghiên cứu không phải lệnh triển khai. Không yêu cầu người dùng cung cấp lại đường dẫn.

**Tra cứu Auto / Rao bán — bắt buộc:** khi người dùng đề cập **Auto, AUTO, tự động đánh** trong game/bot, đọc toàn bộ [docs/auto.md](docs/auto.md) trước khi giải thích hành vi, điều tra, đề xuất hoặc sửa mã. Khi đề cập **Rao bán, Mua bán, marketplace, KNB, Kim nguyên bảo**, đọc toàn bộ [docs/rao-ban.md](docs/rao-ban.md). Có cả hai chủ đề thì đọc cả hai. Không suy đoán đường dẫn hoặc dùng tài liệu gộp cũ làm nguồn chuẩn; chỉ dẫn kỹ thuật và giới hạn đã triển khai nằm trong hai tài liệu này. Áp dụng cho mọi AI session có quyền truy cập repo; không áp dụng từ “auto” nói về tác vụ tự động không liên quan game/bot.

Luật làm việc dùng chung cho mọi AI agent nằm trong `AGENTS.md`; điểm dừng của dự án nằm trong `tasks/CURRENT.md`.
Cả hai được nạp sẵn bên dưới. Làm theo `AGENTS.md` mục 0: đầu phiên đối chiếu `CURRENT.md` với `git status` / `git log -1`;
cuối phiên hoặc sau commit thì cập nhật `tasks/`.

**UI/UX công cụ — bắt buộc:** bất cứ khi nào yêu cầu đề cập tạo tool/công cụ quản trị hoặc thiết kế/sửa giao diện, form, component, style của tool trong `tools/`, đọc toàn bộ [`docs/tools-ui-ux-guidelines.md`](docs/tools-ui-ux-guidelines.md) trước khi thảo luận thiết kế, lập kế hoạch hay sửa mã. Áp dụng cả khi tool mới chưa có thư mục. Không tự tạo bộ style khác; đọc thêm `tools/AGENTS.md` và README tool. AGENTS là luật dự án chung.

**Công thức trò chơi** (chỉ số, cấp, kỹ năng, sát thương, hiệu ứng, tốc độ): mã `packages/shared/src/formulas/` (hằng số duy nhất ở
`formulas/tuning.ts`), giải thích từng công thức và nguồn ở [`docs/formulas/README.md`](docs/formulas/README.md). Đọc trước khi chỉnh
bất kỳ con số chiến đấu nào.

**Bot giả lập người chơi**: cách dùng (app riêng `npm run bots:ui` → localhost4568, `npm run bots -- <kịch bản>`, ảnh chụp) ở
[`docs/bots-guide.md`](docs/bots-guide.md); thiết kế + mã ở [`docs/bots.md`](docs/bots.md).

@AGENTS.md
@tasks/CURRENT.md

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **jx-system-online** (9341 symbols, 26507 relationships, 634 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/jx-system-online/context` | Codebase overview, check index freshness |
| `gitnexus://repo/jx-system-online/clusters` | All functional areas |
| `gitnexus://repo/jx-system-online/processes` | All execution flows |
| `gitnexus://repo/jx-system-online/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
