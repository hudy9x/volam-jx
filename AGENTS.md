# AGENTS.md — hướng dẫn cho AI agent làm việc trong `jx-system-online`

> Nguồn chuẩn duy nhất cho mọi AI agent (Antigravity, Codex, Claude…). Luôn trả lời bằng tiếng Việt.

## Tra cứu bắt buộc theo chủ đề

Đọc toàn bộ tài liệu tương ứng **trước khi** giải thích, điều tra, đề xuất hoặc sửa mã:
- **Hiệu ứng chiến đấu** (băng sát/làm chậm, choáng, độc, co giật/thọ thương, phục hồi, giảm trạng thái, vòng sáng) → [docs/formulas/effects.md](docs/formulas/effects.md) (mã ở `packages/shared/src/formulas/effects/`, hình ở `apps/client/src/game/fx/controlEffects.ts`; liên quan nhịp bước/FPS đọc thêm [docs/formulas/speed.md](docs/formulas/speed.md)).
- **Định giá thị trường / cung cầu / học giá / marketSales** → [docs/rao-ban.md](docs/rao-ban.md) và [docs/research/market-pricing-plan.md](docs/research/market-pricing-plan.md) (học giá chưa triển khai).
- **Auto / AUTO / tự động đánh** (game hoặc bot) → [docs/auto.md](docs/auto.md).
- **Rao bán / Mua bán / Bày bán / Sạp hàng / KNB** → [docs/rao-ban.md](docs/rao-ban.md).
- **UI/UX tool** (`tools/`) → [docs/tools-ui-ux-guidelines.md](docs/tools-ui-ux-guidelines.md) và [tools/AGENTS.md](tools/AGENTS.md).

## 0. Đầu phiên, cách làm việc & kết thúc phiên

- **Đầu phiên:** đọc [tasks/CURRENT.md](tasks/CURRENT.md) và đối chiếu `git status` / `git log -1` (lệch thì báo). Khi người dùng nói "làm tiếp", tóm tắt điểm dừng và hỏi lại mục cần chọn — không tự ý viết code.
- **Thảo luận trước khi sửa:** nếu người dùng hỏi điều tra/xem hướng đi, chỉ trả lời; chỉ sửa code sau khi được đồng ý. Phân biệt rõ điều **đã xác minh** với **suy luận**.
- **Không tự `git commit` / `push`** nếu không được yêu cầu. Nhánh tích hợp là `main` (`origin = git@github.com:hudy9x/volam-jx`).
- **Cuối phiên / sau commit:** cập nhật `tasks/CURRENT.md` (và `BACKLOG.md` / `HISTORY.md` nếu cần).
- **Nền tảng mục tiêu:** **Web, Desktop app và Mobile** — mọi thiết kế UI, nhập liệu, dựng hình và mạng phải tính cho cả 3 nền tảng.

## 1. Dự án & Nguồn VLTK gốc tham khảo

Prototype MMORPG 2D kiểu **Võ Lâm Truyền Kỳ 1 (JX1)**: **Phaser 4 + Vite** (client), **Colyseus 0.18** (server), npm workspaces (`packages/shared`, `apps/server`, `apps/client`), TypeScript, Node 22+.

**Hai nguồn VLTK gốc dùng để tham khảo logic và trích xuất assets:**
1. **`/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`** — Client VLTK SHXT gốc (chứa `data_extract/` đã giải nén 28 PAK, bảng gốc `settings/`, UI `.ini`/`.spr`, bản đồ, NPC, kỹ năng, vật phẩm). Khi chạy tool sinh asset/dữ liệu (`gen:*`), đặt `JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT`.
2. **`/Users/hudy/ws/volam-3005/Server` + `/Users/hudy/ws/volam-3005/Client`** — Bộ Server + Client VLTK gốc (kèm script Lua server, `settings/`, UI và tài liệu reverse-engineering tại `/Users/hudy/ws/volam-3005/documents/`). Dùng để đối chiếu cơ chế server/client gốc (bày bán, combat, kỹ năng, Lua hook…).

**Lưu ý khi đọc dữ liệu gốc:**
- Tiếng Việt dùng mã **TCVN3**, tiếng Trung dùng **GBK** (dùng `apps/client/tools/jx/source.ts` hoặc `iconv`). Chỉ đọc, **không ghi ngược** vào thư mục gốc. Không đọc `config.ini` plaintext.
- Tốc độ gốc = 18 tick/s; **Id trang bị → hàng bảng bộ phận = part id − 2**; SPR header byte 22 (`Reserved[1] = 1`) là hiệu ứng nền đen cộng sáng.

## 2. Lệnh thường dùng & Bản đồ mã nguồn

| Lệnh (gốc repo) | Việc |
|---|---|
| `npm run dev` | server `:2567` + client `:5173` (`CHOKIDAR_USEPOLLING=1`) |
| `npm run typecheck` · `npm run build` | kiểm tra TypeScript tất cả workspace · build client |
| `npm run test:market` · `test:auto` · `test:speed` | chạy bộ test theo chủ đề (`tests/`) |
| `npm run bots -- <kịch bản>` · `npm run bots:ui` | chạy bot / mở UI bot (`localhost:4568`, `docs/bots-guide.md`) |
| `npm run map:manager` · `npm run boss` | Map Manager (`:4570`, tự reload) · Tool Boss (`:4567`) |
| `npm run gen:assets\|skills\|ui\|sounds\|gold\|magic\|spawns\|player\|drops -w @vltk/client` | trích xuất asset & sinh `*.gen.ts` từ `JX_CLIENT` (`docs/regenerate-assets.md`) |
| `npm run gen:maps -w @vltk/client -- <id...>` | sinh bản đồ (bỏ id = tất cả ~300 map, rất nặng) |

Chi tiết kiến trúc: [docs/architecture.md](docs/architecture.md). Tóm tắt:
- `packages/shared/src/`: luật & dữ liệu dùng chung (TS thuần, không Phaser/Colyseus/DOM) — `characters/`, `monsters/`, `npcs/`, `items/`, `combat/`, `skills/`, `maps/`, `formulas/`, `auto/`, `bots/`, `protocol.ts`.
- `packages/shared/spawns/`: cấu hình quái theo map (`auto: false` bảo vệ khỏi `gen:spawns`).
- `apps/server/src/`: `net/` (`MapRoom`, `schema`), `account/` (`auth`, `db`), `world/` (`World`, `entity`, `commands`, `inventory`, `stalls`, `market`, `chat`, `teams`, `systems/`, `ai/`), `dev/`.
- `apps/client/src/`: `app/`, `net/`, `state/`, `input/` (`keymap`), `platform/`, `art/`, `game/` (`WorldScene`, `ActorView`, `ports.ts`), `ui/` (`kit/`, `tips/`, `screens/`, `hud/`, `windows/`).
- `apps/client/public/assets/`: sinh tự động (>15 GB, nằm trong `.gitignore`, trừ `portraits/`).

## 3. Quy tắc bất biến

1. **Không sửa tay `*.gen.ts`:** chỉnh ở file cấu hình/tuning cùng thư mục (`tuning.ts`, `monsters.ts`, `items/*.ts`, `maps/`).
2. **Kỹ năng dùng chung `SkillEngine`:** không phụ thuộc chủ thể (người, bot, quái, boss).
3. **Server quyết định mọi thứ (20 tick/s):** client chỉ gửi ý định (`protocol.ts`).
4. **Không đọc/duyệt hàng loạt `public/assets/**`:** dùng tool `gen:*`; Vite không được poll `public/assets/**`.
5. **Khung game cố định:** `1280×720` hoặc `1280×800`, render **2×**, tắt MSAA, `roundPixels`, WebP lossless. HUD/input cùng khung.
6. **Không đổi công thức / số liệu ngoài `packages/shared/src/formulas/`**; hằng số ở `formulas/tuning.ts` (và `formulas/effects/tuning.ts`).
7. **Dữ liệu tài khoản test** ở `apps/server/data/db.json` (bị `.gitignore`); kiểm tra Playwright trên cổng riêng `2568` / `5174`, không đụng server `:2567` / `:5173` của người dùng.
8. **Giới hạn `maxMessagesPerSecond = 30` (`MapRoom.ts`):** Colyseus ngắt kết nối ngay (`CloseCode.WITH_ERROR`, văng về chọn nhân vật) nếu client gửi > 30 gói `C2S`/giây. Mọi tính năng gửi lệnh tự động hoặc hàng loạt (bán đồ, nhặt đồ, đồng bộ danh sách…) **phải gộp batch hoặc giới hạn nhịp/hàng đợi** ở client/shared và **bắt buộc có test case kiểm chứng** không vượt ngưỡng này.

## 4. Quyết định thiết kế cốt lõi

Chi tiết đầy đủ các quyết định theo từng vòng được lưu tại **[docs/decisions.md](docs/decisions.md)**. Các điểm chính đang hiệu lực:
- **Bày bán (`eabe757`):** định giá trực tiếp trên 2 trang đầu Hành trang (`0..119`, Ngân lượng + KNB), lời rao 1–20 ký tự, cấp ≥ 60, tránh NPC > 80 px; người mua click nhân vật mở 1 trang `10×12` (120 ô). Kênh `trade` lọc 30 phút / tối đa 50 tin ([docs/rao-ban.md](docs/rao-ban.md)).
- **Băng di chuyển cố định:** `EFFECTS.coldMovement = 60` iso/s (4 FPS, 2s/vòng) cho mọi thực thể ([docs/formulas/effects.md](docs/formulas/effects.md)).
- **Vùng an toàn thành thị:** `town-safe-zones.json`, vẽ Pen trong Map Manager.
- **Boss Hoàng Kim:** mặc định 4.000.000 EXP (×2 Tiên Thảo Lộ), chỉnh HP/EXP/nhịp/leash/kháng/kỹ năng qua tool Boss (`tools/boss`).
- **Tống Kim theo SHXT:** ưu tiên tầng Cao cấp (`40–59 / 60–89 / 90+`), bắt buộc báo danh + sảnh chờ ([docs/tong-kim-battlefield.md](docs/tong-kim-battlefield.md)).

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **jx-system-online**. Index stale? Run `node .gitnexus/run.cjs analyze --index-only`.

## Always Do / Never Do
- **MUST run `impact` before editing** a function/class/method (`impact({target, direction: "upstream"})` or `node .gitnexus/run.cjs impact "<symbol>" --direction upstream --repo .`). Warn on HIGH/CRITICAL risk; treat `risk: UNKNOWN` as unresolved (confirm with text search).
- **MUST run `detect_changes({scope: "all"})` before committing** (re-run if `partial`/`truncated`).
- **MUST use `query` / `context` / `impact` first** for call graphs, dependencies, and flows; use `rename` instead of find-and-replace for symbols.
<!-- gitnexus:end -->
