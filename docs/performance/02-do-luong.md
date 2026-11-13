# 02 — PF1: Đo lường (làm đầu tiên)

> Mục tiêu: có **số liệu gốc** trước khi chỉnh, và một cách đo lặp lại được để so trước / sau mỗi bước PF2–PF4.
> Không đổi hành vi game. Mọi mã đo nằm trong `apps/client/src/dev/` (nạp động, bản build chính thức không chứa — `AGENTS.md` §6).

## 1. Đo cái gì

| Chỉ số | Cách lấy | Vì sao |
|---|---|---|
| Byte tải về theo loại (`maps`, `char`, `npc`, `skill`, `items`, `ui`, `sound`, `music`, `js`) | `PerformanceObserver({ type: 'resource' })`, `entry.transferSize` / `encodedBodySize`, phân loại theo đường dẫn | Biết loại nào nặng nhất |
| Số request, số request đang chờ | như trên + độ dài hàng đợi `MapView` / Phaser loader | Biết có nghẽn hàng đợi không |
| Bộ nhớ texture ước tính | duyệt `game.textures.list`, cộng `source.width × source.height × 4` mỗi texture, nhóm theo tiền tố khóa (`jx:`, `fx:`, `map<id>-g-`, `map<id>-o-`, `gnd:`, icon) | Ngân sách PF2 |
| Số texture, số sheet nhân vật / quái | như trên | |
| Thời gian các mốc | `performance.mark`: `app-start`, `login-ok`, `boot-done`, `map-ready` (sau `map.ready`), `world-built` (cuối `build()`), `first-self-drawn` (lần đầu `JxSprite.render` của mình trả `true`) | Ngân sách thời gian G0–G2 |
| Khung hình | FPS trung bình + số khung > 50 ms trong 10 s gần nhất | Phát hiện giật do giải mã ảnh |
| Heap JS | `performance.memory.usedJSHeapSize` (chỉ Chromium) | |
| Cache hit (sau PF4) | `transferSize === 0` ⇒ lấy từ cache | Đo hiệu quả PF4 |

## 2. Triển khai

1. **Mốc thời gian** — thêm `performance.mark(...)` ở: `app/App.ts` (đăng nhập xong, trước `bootGame`, trước vào bản đồ),
   `game/WorldScene.ts` (sau `map.ready`, cuối `build()`), `game/actors/ActorView.ts` (lần đầu vẽ được chính mình). `performance.mark`
   gần như không tốn gì, để luôn trong bản build cũng được (không phải mã dev).
2. **Bộ thu số liệu** `apps/client/src/dev/perf/collect.ts`:
   - `PerformanceObserver` gom resource entries; `performance.setResourceTimingBufferSize(5000)` để không bị cắt ở 250 mục.
   - `textureStats(game)` trả `{ count, bytes, byPrefix }`. Cần lấy `Phaser.Game` qua `game/index.ts` (đã có `window.__vltk.game()` ở bản dev).
   - `snapshot()` trả một object JSON gồm mọi chỉ số ở §1.
3. **Bảng hiển thị** `apps/client/src/dev/perf/overlay.ts` (+ `.css`): khung chữ nhỏ góc phải, cập nhật mỗi giây; bật bằng tham số
   `?perf` hoặc một phím chỉ có ở bản dev (khai báo trong `input/keymap.ts` như các phím dev khác). Nút "Sao chép JSON" (`snapshot()`).
   Đăng ký trong `dev/index.ts` (nạp động).
4. **Đưa ra cho Playwright**: `window.__vltk.perf = { snapshot }` ở bản dev.
5. **Kịch bản đo** `apps/client/tools/perf/run.ts` (hoặc `scripts/`; liên quan HT8 — đưa Playwright vào repo):
   - Chạy trên server thử nghiệm `:2568` / `:5174` (`tasks/CURRENT.md` §6), tài khoản mới trong `DB_PATH` tạm.
   - Các bước: mở trang → đăng nhập → tạo nhân vật → vào Biện Kinh (37) → đứng 10 s → đi một vòng (gửi lệnh `move` qua `room()`) →
     sang Dược Vương Cốc (140) qua cổng hoặc lệnh dev → bật Auto 60 s → lấy `snapshot()` sau mỗi bước.
   - Hai chế độ mạng bằng CDP `Network.emulateNetworkConditions`: không giới hạn, và "4G chậm" (≈ 4 Mbps, 150 ms).
   - Ghi kết quả JSON vào scratchpad + in bảng tóm tắt.
6. **Ghi số liệu gốc** vào `docs/performance/02-do-luong.md` §4 (bảng dưới), kèm commit và ngày đo.

## 3. Ngân sách đề xuất (chốt sau khi có số gốc)

| Chỉ số | Desktop | Mobile |
|---|---|---|
| G0 (mở trang tới màn đăng nhập), 4G chậm | ≤ 4 s | ≤ 6 s |
| G2 (bấm vào bản đồ tới thấy mình đứng), 4G chậm, cache trống | ≤ 4 s | ≤ 6 s |
| G2 khi cache đầy (PF4) | ≤ 1,5 s | ≤ 2 s |
| Bộ nhớ texture sau 10 phút chơi, 3 lần đổi bản đồ | ≤ 512 MB | ≤ 192 MB |
| Khung > 50 ms khi đi bộ trong thành | ≤ 1 / 10 s | ≤ 3 / 10 s |

## 4. Số liệu gốc

(Chưa đo. Điền sau PF1: ngày, commit, máy, từng chỉ số ở hai chế độ mạng.)

## 5. Kiểm chứng

- `npm run typecheck`; bản build (`npx vite build` cấu hình tạm như `tasks/CURRENT.md` §6) không chứa `dev/perf` (tìm chuỗi `perf-overlay`
  trong `dist`).
- Số byte của overlay khớp tab Network của Chrome DevTools trong một lần thử tay.

## 6. Ba nền tảng

`PerformanceObserver`, `performance.mark` có ở Chromium (Web, Electron, Android WebView) và WebKit (Safari, iOS, Tauri macOS).
`performance.memory` chỉ có ở Chromium; trên WebKit để trống. Đo trên điện thoại thật: mở `?perf` trên mạng LAN tới server thử.
