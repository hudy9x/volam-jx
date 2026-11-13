# 05 — PF4: Lưu đệm (cache), phiên bản file, gói tài nguyên Desktop / Mobile

> Mục tiêu: **file nào đã tải thì không tải lại** (kể cả khi mở game lần sau), nhưng khi asset đổi thì người chơi nhận bản mới; trên
> Desktop / Mobile asset nằm trên đĩa của app. Đây là tầng T3 trong `01-hien-trang-va-chien-luoc.md` §4 (chính sách theo gói ở đó).
> Phụ thuộc: PF1 để đo cache hit. Không phụ thuộc mã PF2 / PF3 (bước 1 dưới đây nên làm sớm vì PF3 đụng cùng file).

## 0. Trạng thái (2026-11-13, vòng 34 — bản web đã làm)

| Bước §7 | Trạng thái |
|---|---|
| 1 `assetUrl()` | ✅ `apps/client/src/art/assets.ts` (đặt ở `art/` vì `art/` không được import `platform/`); mọi chỗ ở §1 đã chuyển, cả màn chọn / tạo nhân vật (HTML thành hàm) và con trỏ chuột |
| 2 Manifest | ✅ `packages/shared/src/assets.ts` (`packOf`, `packDirs`, kiểu) + `tools/jx/manifest.ts`; `gen:assets` / `gen:skills` / `gen:ui` / `gen:sounds` / `gen:gold` / `gen:maps` tự cập nhật; `gen:manifest` |
| 3 Nạp ở G0 | ✅ `app/App.ts loadManifest` (`no-cache`, hết giờ 8 s, mất mạng → bản lưu `vltk.assetManifest`) |
| 4 Build | ✅ `assetsDir: 'app'`, **`copyPublicDir: false`** (không chép 15 GB vào `dist/`; `/assets` phải được phục vụ riêng). `vite preview` gửi đúng bảng header §4 (ETag, Range) — dùng để thử; **server thật vẫn chờ chọn (§8.1)** |
| 5–6 Service Worker + ngân sách | ✅ `platform/sw/sw.ts` (esbuild → `/sw.js`), `platform/assetCache.ts`; bảo vệ bản đồ đang chơi + thành gần nhất (`nearestTown`) |
| 7 Giao diện | ✅ Hệ thống → Tùy chỉnh → "Bộ nhớ đệm: X MB / ngân sách (N tệp)" (rê chuột = theo gói) + nút Xóa. **Không** làm thông báo "Có bản cập nhật": SW chỉ giữ asset có phiên bản nên `skipWaiting` ngay; mã game mới đến qua `index.html` (`no-cache`) |
| 8 Đo | 🟡 Đo nhanh bằng Playwright (bản build + `vite preview`, localhost): lần 1 tải 22 MB / 218 request `/assets`; **lần 2: 217 / 218 từ Service Worker, 300 byte qua mạng** (chỉ `manifest.json`), HUD hiện sau 4–6 s thay vì 6–8 s. Đổi phiên bản `core` → chỉ cache `core` bị thay; ngân sách 10 MB → gói `map/37` bị xóa. Số liệu đầy đủ chờ PF1 |
| 9 Desktop / Mobile | ⬜ cùng HT1 (chờ chọn bộ đóng gói) |

Việc còn lại đã ghi thành mục riêng trong `tasks/BACKLOG.md` §9: **PF6** server thật phục vụ asset (chờ chọn §8.1), **PF7** Desktop /
Mobile (chờ HT1), **PF8** đo + kiểm chứng §9 đủ (sau PF1), **PF9** việc nhỏ (CSS chưa `?v=`, `gen:manifest` trên máy khác).

Khác thiết kế dưới đây: không cache `index.html` / `/app/*` trong SW (mất mạng thì không mở được trang — game cần server nên bỏ qua);
`?cacheBudget=<MB>` chạy ở mọi bản build (chỉ để thử). CSS dùng đường dẫn tuyệt đối `/assets/ui/…` nên bản build phải đặt ở gốc tên miền.

## 1. Hiện trạng (trước khi làm, đã đọc mã)

- URL asset viết rải rác, không có phiên bản:
  `art/jx/index.ts jxSheetUrl`, `art/icons.ts` (icon vật phẩm / kỹ năng), `game/fx/SkillFx.ts pageUrl`, `game/actors/GroundView.ts`,
  `game/fx/StateDecor.ts`, `game/audio/Audio.ts url`, `MapMeta.assets` (bản đồ, `ui/hud/minimap.ts`, `ui/windows/bigmap.ts`, `travel.ts`),
  `ui/hud/status.ts`, `ui/windows/horseShop.ts`, `ui/hud/vitals.ts` (chân dung), và **CSS** `url(/assets/ui/…)` trong `ui/**/*.css`.
- Dev: middleware trong `apps/client/vite.config.ts` trả `Cache-Control: no-cache` cho `/assets/**` (đúng cho dev, giữ nguyên).
- Bản build: Vite chép `public/` vào `dist/`, và **mã JS / CSS có hash cũng nằm ở `dist/assets/`** (mặc định `build.assetsDir = 'assets'`)
  → mã và tài nguyên game lẫn một thư mục, khó đặt luật cache theo đường dẫn.
- Chưa có nơi phục vụ asset cho bản build (server Colyseus chỉ có `/api/*`).

## 2. Phiên bản theo gói (manifest)

Chia asset thành **gói** (như 01 §4): `core` (`ui/**`, `portraits/**`, `sound/**`), `char`, `npc`, `skill`, `items`, `music`, và
`map/<id>` (mỗi bản đồ một gói). Phiên bản = hash nội dung của gói.

`public/assets/manifest.json` (sinh tự động, nằm cùng asset, không vào git như phần còn lại của `public/assets/`):

```json
{
  "format": 1,
  "packs": {
    "core":  { "v": "3f9a1c", "bytes": 4200000, "files": ["ui/jade.webp", "ui/stone.webp", "sound/…"] },
    "char":  { "v": "a81e02", "bytes": 0 },
    "npc":   { "v": "77c0d9", "bytes": 0 },
    "skill": { "v": "c2b4e1", "bytes": 0 },
    "items": { "v": "19d3aa", "bytes": 0 },
    "music": { "v": "e0f5b7", "bytes": 0 },
    "map/37": { "v": "5d6e8f", "bytes": 0 }
  }
}
```

- `files` chỉ ghi cho `core` (để tải trước khi cài). Gói khác tải khi dùng nên không cần danh sách.
- `bytes` để hiển thị / lập kế hoạch tải gói cho Desktop / Mobile.
- **Ai ghi**: mỗi tool `gen:*` khi chạy xong tính hash (SHA-1 của danh sách `đường dẫn + nội dung` các file nó vừa ghi, theo thứ tự tên) và
  cập nhật mục của gói mình trong `manifest.json` (đọc — sửa — ghi; hàm chung `apps/client/tools/jx/manifest.ts`). Hash theo nội dung nên
  chạy lại tool mà không đổi gì thì phiên bản giữ nguyên → không làm mất cache của người chơi.
- Thêm lệnh `npm run gen:manifest -w @vltk/client` dựng lại toàn bộ manifest từ đĩa (chậm trên `/mnt`, chỉ dùng khi manifest mất / lệch;
  chạy theo từng gói được: `-- map/37 core`).
- `gen:maps` ghi `map/<id>` cho từng bản đồ nó dựng.

## 3. Một cửa duy nhất cho URL: `assetUrl()`

Module `apps/client/src/platform/assets.ts`:

```ts
export function initAssets(manifest: Manifest, base: string): void   // gọi một lần ở G0, trước mọi tải
export function packOf(path: string): string                        // 'maps/37/ground/1_2.webp' → 'map/37'; 'char/…' → 'char'
export function assetUrl(path: string): string                       // `${base}/${path}?v=${packs[packOf(path)].v}`
```

- `base` theo nền tảng: Web = `assets` (hoặc URL CDN, đọc từ `import.meta.env.VITE_ASSET_BASE`); Desktop / Mobile = giao thức riêng (§6).
- Sửa mọi chỗ ở §1 gọi `assetUrl()` thay vì ghép chuỗi. `MapMeta.assets` (shared) giữ dạng đường dẫn tương đối, client ghép bằng `assetUrl`.
- Luật phụ thuộc (`docs/architecture.md` §5): `art/` và `game/` được import `platform/`? Kiểm khi làm; nếu không, đặt `assetUrl` ở `art/assets.ts`
  và để `platform/` gọi `initAssets` lúc khởi động.
- **CSS** `url(/assets/ui/…)`: không chèn được `?v=`. Giữ nguyên đường dẫn; gói `core` được Service Worker phục vụ theo phiên bản (§5.3), còn
  không có Service Worker thì HTTP `no-cache` + ETag (hỏi lại 304, rẻ vì `core` nhỏ).
- Lúc khởi động (`main.ts` / `app/App.ts`, G0): `fetch('assets/manifest.json', { cache: 'no-cache' })` → `initAssets`. Lỗi mạng: dùng manifest
  lưu lần trước (trong Cache Storage / `storage`) để chơi được khi mạng chập chờn.

## 4. HTTP cache (mọi nền tảng web)

1. `vite.config.ts` bản build: `build.assetsDir = 'app'` → mã có hash ở `/app/*`, tài nguyên game ở `/assets/*`.
2. Header khi phục vụ (nginx / Caddy / CDN / express — **người dùng chọn**, §8):

| Đường dẫn | `Cache-Control` | Ghi chú |
|---|---|---|
| `/app/*` (JS / CSS có hash) | `public, max-age=31536000, immutable` | |
| `/assets/**` có `?v=` | `public, max-age=31536000, immutable` | CDN phải coi query là một phần khóa cache |
| `/assets/manifest.json`, `/index.html`, `/sw.js` | `no-cache` | luôn hỏi lại (ETag) |
| `/assets/ui/**` không `?v=` (từ CSS) | `no-cache` | ETag / 304 |
| `/assets/music/*.mp3` | `public, max-age=604800` | hỗ trợ `Range` |

3. Nén: `br` / `gzip` cho `.json`, `.js`, `.css`, `.html`; **không** nén `.webp`, `.mp3`, `.png` (đã nén).
4. CDN khác tên miền: bắt buộc `Access-Control-Allow-Origin` cho ảnh dùng làm texture WebGL (ảnh khác nguồn không có CORS làm "bẩn"
   canvas và WebGL từ chối). PF3 tải bằng `fetch` cũng cần CORS.
5. HTTP/2 hoặc HTTP/3 (nhiều file nhỏ song song).

## 5. Service Worker (Web)

### 5.1 Tổ chức

- File `apps/client/src/platform/sw/sw.ts`, build thành `/sw.js` ở gốc (thêm một entry trong `vite.config.ts` hoặc plugin nhỏ). Viết tay
  (~200–300 dòng) thay vì Workbox: cần LRU theo gói / theo byte, Workbox `ExpirationPlugin` chỉ có số mục / tuổi.
- Đăng ký ở `apps/client/src/platform/sw-register.ts`, gọi trong `main.ts` khi `import.meta.env.PROD`, có `'serviceWorker' in navigator`, và
  **không** chạy trong Desktop / Mobile đóng gói (ở đó §6 thay thế). Dev (`npm run dev`) không đăng ký.

### 5.2 Kho

- Cache Storage: một cache mỗi gói + phiên bản: `vltk-core-3f9a1c`, `vltk-char-a81e02`, `vltk-map-37-5d6e8f`…
- IndexedDB `vltk-assets`: bảng `entries { url, pack, bytes, lastUsed }`, bảng `packs { pack, v, bytes, lastUsed }`. `lastUsed` cập nhật
  trong bộ nhớ, ghi gộp mỗi 30 s (không ghi mỗi request).

### 5.3 Xử lý `fetch`

1. Chỉ xử lý `GET` tới `/assets/**`. Bỏ qua: `manifest.json` (luôn mạng), `music/**` (yêu cầu `Range`, để HTTP cache lo).
2. Xác định gói (`packOf`) và phiên bản: lấy `?v=` trong URL; không có `?v=` (CSS `ui/**`) → phiên bản hiện tại của gói từ manifest SW đang giữ.
3. **Cache trước** (`cache-first`): có trong `vltk-<gói>-<v>` → trả ngay, đánh dấu `lastUsed`.
4. Không có → `fetch` mạng → nếu `ok` và không `opaque`: `cache.put` (khóa = URL **bỏ** `?v=`, vì tên cache đã chứa phiên bản), cộng `bytes`
   vào chỉ mục → trả về. Lỗi mạng → trả lỗi (game đã có đường lui).
5. Sau khi ghi: nếu tổng dung lượng vượt ngân sách → chạy dọn (§5.5) ở nền (`event.waitUntil`).

### 5.4 Cài đặt / kích hoạt / cập nhật

- `install`: tải manifest, **tải trước** mọi file trong `packs.core.files` vào `vltk-core-<v>` (vài MB).
- `activate`: xóa mọi cache `vltk-<gói>-<v>` có `v` khác manifest hiện tại; `clients.claim()`.
- Khi manifest đổi (trang thấy `v` khác lúc G0): gửi `postMessage({ type: 'manifest', manifest })` cho SW → SW xóa cache gói đã đổi, tải trước
  `core` mới. Gói lớn (`char`, `npc`, `skill`) đổi thì mất cả cache gói đó — chấp nhận được vì `gen:assets` / `gen:skills` hiếm khi chạy lại;
  nếu sau này cần mịn hơn thì chia nhỏ gói (theo thư mục con), không cần hash từng file.
- Mã game mới (`/app/*` đổi hash): SW mới ở trạng thái `waiting` → màn đăng nhập hiện "Có bản cập nhật — tải lại" (không tự tải lại giữa trận).

### 5.5 Ngân sách và dọn

- `navigator.storage.estimate()` → `quota`. Ngân sách = `min(quota × 0,5, 2 GB)` máy tính, `min(quota × 0,3, 500 MB)` trình duyệt điện thoại
  (đề xuất, chốt sau PF1).
- Gọi `navigator.storage.persist()` một lần sau khi người chơi vào game (giảm khả năng trình duyệt tự xóa).
- Thứ tự dọn khi vượt ngân sách:
  1. Gói `map/<id>` cũ nhất (xóa **cả gói**), trừ bản đồ đang chơi và bản đồ thành gần nhất.
  2. Mục cũ nhất trong `npc`, `char`, `items`, `skill` (theo `entries.lastUsed`) cho tới khi còn ≤ 85 % ngân sách.
  3. Không bao giờ xóa `core`.
- Hệ thống → Tùy chỉnh: dòng "Bộ nhớ đệm: X MB" + nút **Xóa bộ nhớ đệm** (SW trả số qua `postMessage({ type: 'stats' })`; cũng dùng cho overlay PF1).

## 6. Desktop và Mobile

Ý tưởng: **JS không biết mình đang ở đâu** — `assetUrl()` trả URL theo `base`; phía app gốc (native) phục vụ URL đó từ đĩa, thiếu thì tải
CDN rồi ghi đĩa. Cùng luật gói / phiên bản / dọn như §5 nhưng chạy ở native, không giới hạn hạn mức trình duyệt.

| | Tauri 2 (Desktop + Mobile) | Electron (Desktop) | Capacitor (Mobile) |
|---|---|---|---|
| Cách phục vụ | giao thức URI riêng (`register_uri_scheme_protocol`) viết bằng Rust: đọc thư mục dữ liệu app, thiếu thì tải CDN | `protocol.handle('vltk', …)` ở main process (Node) | Không chặn request dễ dàng: Service Worker (Android được; iOS cần App-Bound Domains — **cần thử**) hoặc tải bằng JS + plugin Filesystem + `convertFileSrc` |
| Một mã cho Desktop + Mobile | Có | Không | Không |
| Ghi chú | CORS header trả từ handler (texture WebGL) | | |

**Đề xuất (chờ người dùng chọn ở HT1): Tauri 2** — một handler Rust phục vụ cả Desktop lẫn Mobile, giống hệt luật của Service Worker.

Gói cài sẵn trong bộ cài:
- `core` + sheet đứng / chạy của nhân vật nam / nữ trang phục mặc định + bản đồ thành khởi đầu (Biện Kinh 37) — dung lượng đo ở PF1.
- Còn lại tải theo nhu cầu (từng file như Web). Tùy chọn sau: "Tải trước bản đồ" (tải cả gói `map/<id>` khi có Wi-Fi), dùng tool
  `apps/client/tools/pack-assets.ts` đóng gói `map/<id>` thành một file (zip không nén, WebP đã nén) + `packs/index.json` (tên, phiên bản,
  byte, sha256).
- Cửa hàng ứng dụng giới hạn dung lượng gói cài → mobile càng phải cài ít; con số giới hạn cụ thể **kiểm lại khi làm HT1**.

## 7. Các bước triển khai

1. **`assetUrl()`** (`platform/assets.ts`) + sửa mọi chỗ ghép URL ở §1 (chưa cần manifest: `v` rỗng thì không thêm `?v=`). Không đổi
   hành vi. `npm run typecheck` + chạy thử.
2. **Manifest**: `tools/jx/manifest.ts` (đọc / sửa / ghi), gắn vào `gen:assets`, `gen:skills`, `gen:ui`, `gen:sounds`, `gen:maps`;
   `gen:manifest` dựng lại từ đĩa. Ghi vào `docs/regenerate-assets.md`.
3. **Nạp manifest ở G0** (`main.ts` / `App.ts`), lưu bản cuối vào `storage` để dùng khi mất mạng.
4. **Build**: `build.assetsDir = 'app'`; tài liệu header §4 (file mẫu `deploy/nginx.conf` hoặc `deploy/Caddyfile` — tùy lựa chọn §8).
5. **Service Worker** §5.1–5.4 (chưa dọn): cache-first theo gói, tải trước `core`, xóa phiên bản cũ.
6. **Ngân sách + dọn** §5.5 + IndexedDB chỉ mục + `persist()`.
7. **Giao diện**: dòng dung lượng + nút xóa trong Hệ thống → Tùy chỉnh; thông báo "Có bản cập nhật" ở màn đăng nhập.
8. **Đo PF1**: lần 1 cache trống, lần 2 cache đầy (cùng kịch bản) → ghi `02-do-luong.md` §4.
9. **Desktop / Mobile** (cùng HT1): handler native theo §6, gói cài sẵn, tùy chọn tải trước bản đồ.

## 8. Cần người dùng quyết

1. **Nơi phục vụ asset bản build**: tự chạy (nginx / Caddy cạnh server game) hay CDN / lưu trữ đối tượng (Cloudflare R2, S3 + CloudFront…)?
   Ảnh hưởng chi phí băng thông và việc cần CORS.
2. **Bộ đóng gói Desktop / Mobile** (HT1): Tauri 2 (đề xuất) / Electron + Capacitor.
3. Ngân sách lưu đệm (§5.5) và có cho người chơi nút xóa bộ nhớ đệm không.
4. Bộ cài sẵn gồm bản đồ nào (chỉ Biện Kinh, hay thêm các thành khác).

## 9. Kiểm chứng

- Bản build + `vite preview` (hoặc nginx thử) + Playwright: lần 2 mở trang, ≥ 95 % request `/assets/**` có `transferSize === 0`.
- Sửa một file `ui/*.webp` + chạy `gen:ui` → phiên bản `core` đổi → lần mở sau nhận ảnh mới, các gói khác vẫn trúng cache.
- Ép ngân sách nhỏ (tham số `?cacheBudget=50` ở bản dev) → đi qua 4 bản đồ → gói bản đồ cũ nhất bị xóa, bản đồ đang chơi không.
- Chrome DevTools → Application → Cache Storage / IndexedDB khớp số liệu của nút "Bộ nhớ đệm".
- Tắt mạng sau khi đã vào Biện Kinh một lần: tải lại trang vẫn tới được màn đăng nhập (`core` + manifest cũ); vào game thì cần server.

## 10. Ba nền tảng

| | Web | Desktop app | Mobile |
|---|---|---|---|
| T3 | HTTP cache + Service Worker | Đĩa (handler native) | Đĩa (handler native); Service Worker chỉ khi Capacitor Android |
| Hạn mức | Theo trình duyệt (`storage.estimate`), Safari chặt hơn | Không giới hạn thực tế | Theo dung lượng máy; hỏi trước khi tải gói lớn trên mạng di động |
| Cập nhật | Manifest + SW | Manifest (cùng file) + cập nhật app | như Desktop |
