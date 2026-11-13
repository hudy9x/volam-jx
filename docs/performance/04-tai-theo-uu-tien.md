# 04 — PF3: Tải theo ưu tiên, hình tạm, tải trước khi đổi bản đồ

> Mục tiêu: thứ người chơi đang nhìn hiện trước; thứ ở xa / có thể cần thì tải sau và hủy được; không có "khoảng trống" khi vào bản đồ.
> Phụ thuộc: PF1 (đo), nên làm sau PF2 (dùng chung `TextureCache`). Giai đoạn G0–G5 ở `01-hien-trang-va-chien-luoc.md` §3.

## 1. Vấn đề (đã đọc mã)

- Hai bộ tải độc lập: `MapView.image` (6 song song, FIFO) và Phaser `scene.load` (FIFO). Không có ưu tiên, không hủy được.
- `JxSprite.request` xin 9 động tác cho mọi actor ngay khi xuất hiện (`PREFETCH` trong `PaperDoll.ts:14`).
- `ActorView` xin sheet cho **mọi actor** server gửi, kể cả quái ở đầu kia bản đồ.
- Actor chưa có sheet thì **không vẽ gì** (`JxSprite.render` trả `false`) — người chơi thấy tên nổi không có người.
- Vào bản đồ chỉ chờ đất + vật thể; nhân vật mình và quái hiện dần sau đó.

## 2. Bộ tải chung có ưu tiên

Module mới `apps/client/src/game/assets/AssetLoader.ts`:

```ts
enum Pri { Blocking = 0, Visible = 1, Near = 2, Effect = 3, Prefetch = 4, Idle = 5 }

interface Job { url: string; pri: Pri; key: string; abort: AbortController; resolve; reject }

class AssetLoader {
  image(url: string, pri: Pri, key?: string): { promise: Promise<HTMLImageElement | null>; cancel(): void }
  json<T>(url: string, pri: Pri): { promise: Promise<T | null>; cancel(): void }
  reprioritize(key: string, pri: Pri): void
  stats(): { queued: number; running: number; byPri: number[] }   // cho overlay PF1
}
```

Luật:
1. Hàng đợi theo `pri` (mảng 6 danh sách FIFO). Số chạy song song: 6 khi HTTP/1.1, 12 khi HTTP/2 / 3 (đọc `nextHopProtocol` của resource
   entry đầu tiên; mặc định 6). `Idle` chỉ chạy khi không còn việc ưu tiên cao hơn và không quá 2 cùng lúc.
2. Trùng `url` thì gộp (trả cùng promise, nâng `pri` lên mức cao nhất được xin).
3. `cancel()` khi việc chưa chạy: bỏ khỏi hàng; đang chạy: `AbortController` cho `fetch` (ảnh tải bằng `fetch` → `Blob` →
   `URL.createObjectURL` → `img.decode()`, để hủy được và không giải mã trên luồng chính lúc vẽ).
4. Giải mã: `await img.decode()` trước khi trả về (tránh giật khung khi `textures.addImage`).
5. `navigator.connection?.saveData` hoặc mạng `2g` → bỏ hẳn `Prefetch` / `Idle`.
6. Ảnh lỗi: trả `null`, ghi một lần (như `MapView` hiện tại); không thử lại liên tục (JxSprite đã thử lại mỗi `RETRY_MS`).

Chuyển đổi:
- `MapView.image()` → `loader.image(url, pri)`: vùng đất **trong khung nhìn** = `Blocking` lúc `ready()`, sau đó `Visible`; vùng trong lề tải
  = `Near`. Vùng nằm theo **hướng camera đang đi** (so sánh tâm khung nhìn hai khung liền) nâng lên `Visible`.
- `requestSheets` / `fxReady` / `GroundView` / `StateDecor`: thay `scene.load.image` bằng `loader.image` + `scene.textures.addImage(key, img)` +
  `TextureCache.onAdded`. Giữ API ngoài (`requestSheets(scene, keys, pri)`, `sheetReady`) để ít chỗ phải sửa.
- Bỏ phụ thuộc vào `scene.load` cho asset động (Phaser loader vẫn dùng được cho dev tool).

## 3. Giảm số động tác tải trước

Thay `PREFETCH` cố định bằng bộ theo ngữ cảnh:

| Ngữ cảnh | Tải ngay | Tải khi cần (đứng thay trong lúc chờ — đã có) |
|---|---|---|
| Nhân vật mình | stand, run / townRun (theo bản đồ thành hay không), wound; **attack1 + magic** ở mức `Near` | attack2, idle, die, jump |
| Người chơi khác trong màn hình | stand, run / townRun | mọi động tác khác |
| Quái trong màn hình | stand, run | attack1, magic, wound, die |
| NPC thành | stand (+ idle) | — |
| Actor ngoài khung nhìn + 600 px | **không tải** | — |

Hiện `render()` đã có đường lui "vẽ tư thế đứng khi tư thế muốn chưa có", nên bỏ bớt tải trước không làm vỡ hình, chỉ có thể làm
đòn đánh đầu tiên của quái vẽ bằng tư thế đứng trong vài trăm ms. Hiệu ứng **chết** nên tải `Near` khi máu actor < 30 % để không mất
hoạt cảnh chết (đọc `state.hp`).

## 4. Hình tạm

- **Actor chưa có sheet**: vẽ bóng đổ chung (một texture elip mờ tạo bằng `Graphics` lúc khởi động, không cần file) + tên. Không vẽ hình
  người giả (giữ cảm giác bản gốc). `ActorView` đã có điểm chân + bảng tên; chỉ cần `JxSprite.render` trả về trạng thái "chưa sẵn" để
  `ActorView` vẽ bóng tạm.
- **Đất chưa có**: vẽ `minimap.webp` (đã có cho mọi bản đồ, tải ở G2) phóng to đúng tỉ lệ bản đồ dưới cùng (`depth` thấp hơn
  `GROUND_DEPTH`), làm mờ. Vùng đất thật phủ lên khi tải xong. Chỉ là nền tạm, không ảnh hưởng hình 1:1 của vùng đã tải. Tỉ lệ minimap /
  bản đồ: đọc trong `ui/hud/minimap.ts` (đang dùng để vẽ minimap).
- **Hiệu ứng chưa có**: giữ như hiện tại (bỏ nếu quá 1,5 s) — hiệu ứng tới muộn còn tệ hơn không có.

## 5. Tải trước khi vào / đổi bản đồ

1. **Danh sách tài nguyên của bản đồ** — server gửi lúc vào phòng: thêm tin `S2C.mapAssets` (khai báo trong
   `packages/shared/src/protocol.ts`) gồm `npcRes: string[]` (quái theo file spawn + boss) và `townNpcs` (đã có ở shared, client tự biết).
   Server có spawn trong `MapRoom` (`apps/server/src/net/MapRoom.ts`), nên danh sách luôn khớp khi dev tool sửa spawn.
   (Phương án khác: tool sinh `maps/<id>/preload.json` — không chọn vì lệch khi sửa spawn bằng công cụ dev.)
2. **Màn "Đang tải bản đồ…"** (`WorldScene.create`) chờ thêm (G2):
   - sheet đứng + chạy + bóng của nhân vật mình (`Blocking`);
   - `minimap.webp` (`Blocking`, cũng dùng làm nền tạm §4);
   - icon thanh kỹ năng 1–9 (HTML, `Visible`, không chặn).
   Đặt **thời gian chờ tối đa** (đề xuất 8 s): quá thì vẫn vào, phần còn lại tải tiếp.
3. **Ngay sau khi vào** (G3): quái trong `mapAssets.npcRes` — stand + run mức `Near`; NPC thành mức `Near`.
4. **Bản đồ kế tiếp** (G5): khi nhân vật đứng cách cổng (`MAPS[id].portals` trong `packages/shared/src/maps/`) < 600 px, hoặc mở cửa sổ
   Xa phu / chọn điểm đến, tải `map.json` + `nav.json` + vùng đất quanh điểm đến ở mức `Idle`. Hủy khi đi xa cổng.
5. **Màn chọn nhân vật** (G1b): tải nền `map.json` + `nav.json` + `minimap.webp` của bản đồ nhân vật đang chọn.

## 6. Các bước triển khai

1. `game/assets/AssetLoader.ts` (§2) + một thể hiện toàn cục (`game/index.ts`).
2. Chuyển `MapView` sang `AssetLoader` (ưu tiên theo khung nhìn + hướng đi). Đo lại PF1.
3. Chuyển `sheets.ts`, `SkillFx.ts`, `GroundView.ts`, `StateDecor.ts` sang `AssetLoader` (giữ API ngoài).
4. `ActorView`: kiểm tra trong khung nhìn + lề; ngoài thì không xin sheet (và nhả tham chiếu theo PF2 bước 5).
5. Bộ động tác theo ngữ cảnh (§3) trong `PaperDoll.ts` (thay `PREFETCH`).
6. Hình tạm actor + nền tạm minimap (§4).
7. `S2C.mapAssets` (shared + server + client) và màn chờ G2 (§5.1–5.3).
8. Tải trước bản đồ kế tiếp (§5.4) và ở màn chọn nhân vật (§5.5).
9. Đo lại PF1, ghi số trước / sau vào `02-do-luong.md` §4.

## 7. Việc sau (không làm trong PF3)

- Hạ chất lượng khi đông người: giới hạn số bộ trang bị khác nhau đang tải; người ở xa / vượt giới hạn vẽ bằng trang phục mặc định của
  phái. Cần người dùng đồng ý vì đổi hình của người chơi khác.
- Web Worker giải mã ảnh (`createImageBitmap` trong worker) nếu PF1 vẫn thấy khung > 50 ms lúc tải; cần thử Phaser 4 nhận `ImageBitmap`.

## 8. Kiểm chứng

- PF1: thời gian G2 và số byte trong 30 s đầu giảm; không có actor "chỉ có tên" quá 1 s trong thành khi mạng không giới hạn.
- Playwright 4G chậm: vào Biện Kinh thấy nhân vật mình ngay khi màn chờ tắt.
- Bot `npm run bots -- 4 60` + một trình duyệt: không có cảnh báo texture thiếu.

## 9. Ba nền tảng

Chung một mã. `fetch` + `AbortController` + `img.decode()` có trên Chromium và WebKit. Desktop / Mobile đóng gói (PF4 §6) đọc file cục bộ
qua cùng `AssetLoader` (URL do `assetUrl()` trả về), nên ưu tiên vẫn có ích (giải mã vẫn tốn CPU). Trên mobile số chạy song song nên
thấp hơn (4) để tránh giật khi giải mã.
