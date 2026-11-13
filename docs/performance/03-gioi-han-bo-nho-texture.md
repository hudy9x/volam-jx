# 03 — PF2: Giới hạn bộ nhớ texture (đếm tham chiếu + LRU)

> Mục tiêu: bộ nhớ đồ họa **không tăng mãi** khi chơi lâu, đi qua nhiều bản đồ, gặp nhiều bộ trang bị. Đây là việc quan trọng nhất
> cho Mobile. Không đổi cách vẽ (1:1, `roundPixels`, WebP lossless).

## 1. Vấn đề (đã đọc mã)

- `sheets.ts requestSheets`, `SkillFx.fxReady`, `GroundView`, `StateDecor.load` thêm texture vào `scene.textures` nhưng **không ai gỡ**.
- `TextureManager` của Phaser là của cả `Phaser.Game`, không phải của scene: `WorldScene` restart khi đổi bản đồ nhưng texture cũ vẫn ở lại.
- Một texture = `rộng × cao × 4` byte trên GPU (ảnh WebP nén chỉ là lúc tải; giải nén ra RGBA). Sheet 8 hướng × nhiều khung lớn hơn nhiều
  so với dung lượng file.
- `MapView` đã tự gỡ đất / vật thể theo khoảng cách — **giữ nguyên**, không đưa vào LRU này (nó đã có luật riêng tốt hơn).

## 2. Thiết kế

Module mới `apps/client/src/game/assets/TextureCache.ts` (thư mục `game/assets/` mới; không import `ui/`):

```ts
interface Entry { key: string; refs: number; bytes: number; lastUsed: number; pinned: boolean }

class TextureCache {
  constructor(scene: Phaser.Scene, budgetBytes: number)
  acquire(key: string): void          // refs++ , lastUsed = now
  release(key: string): void          // refs-- (không xuống dưới 0), lastUsed = now
  touch(key: string): void            // lastUsed = now (texture dùng mà không giữ: icon vẽ 1 khung)
  pin(key: string): void              // không bao giờ gỡ (nhân vật mình, giao diện canvas)
  onAdded(key: string): void          // gọi khi texture vừa vào TextureManager: tính bytes
  sweep(now: number): void            // gọi ~1 lần / giây
  stats(): { count: number; bytes: number; byPrefix: Record<string, number> }  // cho PF1 overlay
}
```

Luật `sweep`:
1. Ứng viên = mục có `refs === 0`, không `pinned`, và `now − lastUsed > GRACE_MS` (đề xuất 30 s — tránh tải lại khi quái chết rồi hồi sinh).
2. Nếu tổng `bytes > budget`: gỡ ứng viên cũ nhất trước cho tới khi ≤ 90 % ngân sách; nếu không vượt ngân sách: vẫn gỡ ứng viên quá
   `IDLE_MS` (đề xuất 5 phút) để không giữ rác vô hạn.
3. Gỡ = `scene.textures.remove(key)`. Frame đã cắt (`sheetReady`, `fxReady`) tự mất theo texture; lần sau tải lại sẽ cắt lại (mã đã
   kiểm tra `tex.has('0_0')` / `has('0')` nên không cần sửa).
4. Không bao giờ gỡ mục `refs > 0` dù vượt ngân sách (vượt thì chỉ ghi cảnh báo ở bản dev). Vượt lâu = dấu hiệu cần PF3 (tải ít hơn).

Một thể hiện duy nhất cho cả game (đặt trong `game/index.ts`, đưa vào `WorldScene` và dev scene), vì `TextureManager` là toàn cục.

## 3. Các bước triển khai

1. **`game/assets/TextureCache.ts`** như §2. Tính bytes: `tex.source.reduce((s, src) => s + src.width * src.height * 4, 0)`.
   Hằng số (`GRACE_MS`, `IDLE_MS`, ngân sách) ở đầu file hoặc `game/assets/budget.ts` — đây là cấu hình client, không phải công thức
   trò chơi nên **không** đặt trong `formulas/tuning.ts`.
2. **Ngân sách theo thiết bị** `game/assets/budget.ts`:
   `navigator.deviceMemory` (Chromium) + màn hình + `platform/` (khi có Capacitor / Tauri) → Desktop 512 MB, máy yếu / Mobile 160–192 MB.
   WebKit không có `deviceMemory`: dùng UA / kích thước màn hình (cảm ứng + cạnh ngắn < 900 px ⇒ mobile). Số chốt sau PF1.
3. **Nối vào nơi thêm texture**: `requestSheets` (sheets.ts), `fxReady` (SkillFx.ts), `GroundView`, `StateDecor.load` —
   sau `filecomplete` gọi `cache.onAdded(key)`. Cách gọn: lắng nghe một lần `scene.textures.on(Phaser.Textures.Events.ADD, key => …)` và
   chỉ nhận các tiền tố `jx:`, `fx:`, `gnd:`, icon (bỏ qua `map<id>-` của MapView).
4. **`JxSprite` (PaperDoll.ts) giữ tham chiếu**:
   - Thêm `held = new Set<string>()`. Khi `request()` hoặc `render()` dùng một lớp → `acquire` nếu chưa có trong `held`.
   - `setSource()` (đổi trang bị / lên ngựa) và `destroy()` → `release` mọi khóa trong `held`, xóa `held`.
   - Lưu ý: hiện `request()` xin cả 9 động tác; nếu giữ tham chiếu cho cả 9 thì không gỡ được gì khi actor còn sống. Giữ tham chiếu
     **chỉ cho động tác đang vẽ + đứng + chạy**; các động tác khác chỉ `touch`. PF3 §3 giảm số động tác tải trước.
5. **Actor ngoài màn hình**: `ActorView` khi actor ra ngoài khung nhìn + lề (đề xuất 600 px) quá 10 s → `jx.releaseAll()` (ẩn, giữ đối
   tượng); quay lại khung nhìn → xin lại (đã có cơ chế `request` mỗi `RETRY_MS`). Cần ô kiểm tra khung nhìn trong `ActorView` (hiện
   chưa có).
6. **SkillFx**: `oneShot` / `spawn` → `acquire(fx key + trang)`; khi xóa (`destroy` ảnh, lọc khỏi `shots`) → `release`. Hiệu ứng mặc định
   `GRACE_MS` dài hơn (đề xuất 60 s) vì cùng chiêu lặp lại liên tục.
7. **Icon trên canvas** (`GroundView`, `StateDecor`): nhỏ (36 px); `acquire` khi tạo, `release` khi hủy.
8. **Nhân vật mình**: `pin` các sheet đứng / chạy của chính mình (bỏ pin khi đổi trang bị).
9. **Đổi bản đồ** (`WorldScene.teardown`): mọi view `destroy` → release; không xóa hàng loạt — để LRU gỡ dần (bản đồ thành ↔ bãi luyện
   công đi lại nhiều, giữ lại sheet chung có lợi).
10. **`sweep`** gọi trong `WorldScene.update` mỗi 1000 ms (và trong dev scene nếu chúng dùng chung).
11. **Overlay PF1** đọc `cache.stats()`.

## 4. Ngân sách đề xuất

| Thiết bị | Ngân sách T1 (không gồm bản đồ) | Bản đồ (MapView, đang có) |
|---|---|---|
| Desktop / Desktop app | 512 MB | vùng trong 1400 / 2000 px (≈ 30–60 MB tùy độ phân giải màn) |
| Mobile, máy mạnh (`deviceMemory ≥ 6`) | 192 MB | như trên; cân nhắc hạ `GROUND_KEEP` / `OBJECT_KEEP` |
| Mobile, máy yếu | 128 MB | hạ `GROUND_KEEP` / `OBJECT_KEEP` (đưa thành tham số của `MapView`) |

Giới hạn kích thước texture: WebGL trên điện thoại thường tối đa 4096 px (`SkillFx` đã chia trang theo `MAX_TEX = 4096`). Kiểm trong
`gen-assets` rằng sheet nhân vật / quái không vượt 4096 (nếu có thì chia trang như hiệu ứng) — **cần kiểm bằng dữ liệu, chưa kiểm**.

## 5. Kiểm chứng

- PF1: chạy kịch bản 10 phút, 3 lần đổi bản đồ; bộ nhớ texture phải đi ngang, không tăng tuyến tính.
- Không có ảnh trắng / ô `__MISSING`: Phaser báo cảnh báo khi `setTexture` vào khóa đã gỡ — chạy bot (`npm run bots`) + Playwright, tìm
  cảnh báo trong console.
- Đổi trang bị liên tục (lệnh bài: chọn bộ hoàng kim) 20 lần: số sheet `jx:` không tăng mãi.
- `/?gallery`, `/?skills` vẫn chạy (dev scene dùng cùng texture).

## 6. Rủi ro

- **Gỡ khi còn ảnh dùng** → ảnh trống. Chặn bằng: chỉ gỡ `refs === 0`; ở bản dev, trước khi gỡ quét các `Image` của scene xem có cái nào
  còn `texture.key === key` (đắt, chỉ bản dev) và báo lỗi.
- **Tải lại liên tục** (gỡ rồi cần ngay): `GRACE_MS` + T3 cache (PF4) làm lần tải lại gần như miễn phí về mạng, chỉ tốn giải mã.
- Phaser loader bỏ qua khóa đang trong hàng đợi; sau khi gỡ, `requestSheets` sẽ xếp lại bình thường (`textures.exists` = false).

## 7. Ba nền tảng

Chung một mã. Chỉ khác ngân sách (§4). Trên iOS WebKit, vượt bộ nhớ thường làm **tải lại cả trang** thay vì báo lỗi — nên ngân sách
mobile cần thấp và thử trên máy thật (HT2).
