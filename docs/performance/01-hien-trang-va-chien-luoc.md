# 01 — Hiện trạng và chiến lược tải / lưu đệm

> 2026-11-13. Đọc mã ở commit `db43168` (+ thay đổi chưa commit). Dung lượng từng loại asset **chưa đo** (PF1 sẽ đo);
> các con số MB dưới đây chỉ là ước lượng, ghi rõ chỗ nào là **suy luận**.

## 1. Loại tài nguyên

| Loại | Đường dẫn (`public/assets/`) | Ai tải (mã) | Đã biết |
|---|---|---|---|
| Đất bản đồ | `maps/<id>/ground/<gx>_<gy>.webp` (vùng 512 × 512) | `game/map/MapView.ts` `loadRegion` | Toàn bộ ~297 bản đồ ≈ 15 GB |
| Vật thể bản đồ | `maps/<id>/objects/<cx>_<cy>.json` + trang atlas | `MapView.loadChunk` | (trong 15 GB) |
| Dữ liệu bản đồ | `maps/<id>/map.json`, `nav.json`, `traps.json` | `MapView.ready`, `WorldScene.create` | |
| Ảnh nhỏ bản đồ | `maps/<id>/minimap.webp`, `thumb.webp` | `ui/hud/minimap.ts`, `ui/windows/bigmap.ts`, `travel.ts` | |
| Nhân vật (paper-doll) | `char/{man,woman}/…` một sheet = 1 bộ phận × 1 động tác × mọi hướng | `game/actors/PaperDoll.ts` → `sheets.ts requestSheets` | Tối đa 11 lớp + bóng |
| Quái / NPC | `npc/…` một sheet = 1 động tác | như trên | |
| Hiệu ứng chiêu | `skill/…` (có thể nhiều trang, mỗi trang ≤ 4096 px) | `game/fx/SkillFx.ts fxReady` | |
| Icon vật phẩm / kỹ năng | `items/…`, `skill/…icon` | `art/icons.ts` (HTML `<img>`), `GroundView`, `StateDecor` | |
| Giao diện | `ui/*.webp`, `ui/login/*`, `ui/cursor/*.png` | CSS `url(/assets/ui/…)`, `art/cursors.ts` | |
| Chân dung | `portraits/*.png` (11 file, trong git) | `ui/hud/vitals.ts` | |
| Âm thanh | `sound/*.mp3` ≈ 300 file, 2,6 MB | `game/audio/Audio.ts` (fetch + decode, giữ trong `buffers`) | `docs/regenerate-assets.md` |
| Nhạc nền | `music/*.mp3` 30 bài, 34 MB | `Audio.playMusic` (`new Audio(url)`, phát luồng) | |
| Mã JS | bundle Vite | — | `art/jx/data.gen.ts` 1,07 MB, `items.gen.ts` 452 KB, `monsters.gen.ts` 200 KB mã nguồn nằm trong bundle đầu |

## 2. Mã hiện tại làm gì (đã đọc mã)

| Việc | Hiện trạng | Đánh giá |
|---|---|---|
| Bản đồ | Tải vùng đất trong khung nhìn + 384 px, vật thể + 900 px; gỡ khi ra ngoài 1400 / 2000 px; tối đa 6 ảnh song song (`MapView.ts:28–31`) | **Tốt.** Chỉ thiếu ưu tiên theo hướng đi và hình tạm |
| Vào bản đồ | `WorldScene.create` chờ `map.ready()` (đất + vật thể trong 1 khung nhìn) + `nav.json` rồi mới `build()` | Tốt. Chưa tải trước nhân vật mình / quái |
| Nhân vật, quái | `JxSprite.request` (`PaperDoll.ts:56`) xin **9 động tác cùng lúc** (`PREFETCH`: stand, idle, run, townRun, attack1, attack2, magic, wound, die) cho mọi lớp + bóng | Một người chơi ≈ 9 × (≤ 11 lớp + bóng) ≈ **tới ~100 sheet**; nhiều hơn cần |
| Phạm vi | `ActorView` vẽ **mọi actor server gửi**, không xét có trong màn hình không; server gửi mọi actor của bản đồ (chưa có HT5) | Bản đồ nhiều quái: tải sheet cho cả quái ở đầu kia bản đồ |
| Giải phóng | Chỉ `MapView` gọi `textures.remove`. Sheet nhân vật / quái / hiệu ứng / icon **không bao giờ gỡ**, kể cả khi đổi bản đồ (Phaser `TextureManager` là toàn cục, sống qua `scene.restart`) | **Vấn đề lớn nhất cho mobile** |
| Hàng đợi | Hai bộ tải độc lập: `MapView.image` (6 song song) và Phaser `scene.load` (mặc định của Phaser, FIFO) cạnh tranh nhau | Không có ưu tiên, không hủy |
| Lưu đệm | Dev: middleware Vite trả `Cache-Control: no-cache` (`vite.config.ts`). Bản build: chưa có nơi phục vụ asset (server Colyseus không phục vụ file tĩnh), URL không có phiên bản | Chưa có chiến lược |
| Âm thanh | Mỗi tiếng fetch + decode một lần, giữ mãi trong `buffers` | Ổn (2,6 MB tổng) |

## 3. Giai đoạn tải — lúc đầu tải trước gì

Mỗi giai đoạn có **ngân sách** (đề xuất, chốt sau PF1). "Chặn" = màn chờ còn hiện cho tới khi xong.

| GĐ | Thời điểm | Tải | Chặn? | Ngân sách đề xuất |
|---|---|---|---|---|
| **G0** | Mở trang | `index.html`, bundle JS + CSS, font; ảnh khung giao diện chung: `ui/jade`, `stone`, `coin`, `close`, con trỏ (`ui/cursor/*`) | Có | ≤ 3 MB nén (JS là phần lớn — đo ở PF1) |
| **G1** | Màn đăng nhập / chọn / tạo nhân vật | `ui/login/*` (nền 800 × 600, nút), sheet **đứng** của 1–3 nhân vật (paper-doll), chân dung | Có (chỉ màn này) | ≤ 2 MB |
| **G1b** | Trong lúc người chơi bấm chọn nhân vật (rảnh) | `map.json` + `nav.json` của bản đồ nhân vật sẽ vào (lấy từ dữ liệu nhân vật), giao diện HUD (`quickbar`, `bars`, `mm-*`, `b-*`) | Không (tải nền) | |
| **G2** | Vào bản đồ (màn "Đang tải bản đồ…") | Đất + vật thể trong 1 khung nhìn (đang có); **nhân vật mình: đứng + chạy (+ chạy trong thành) + bóng**; `minimap.webp`; icon trên thanh kỹ năng 1–9 | Có | ≤ 3 MB, ≤ 3 s trên 4G (mục tiêu) |
| **G3** | Ngay sau khi vào (nền, ưu tiên cao) | Actor **trong màn hình**: đứng + chạy; quái của bản đồ (danh sách từ server, 04 §5); NPC thành | Không | |
| **G4** | Khi cần (theo sự kiện) | Đánh / phép / bị đánh / chết khi actor thực sự làm động tác đó (đứng làm hình thay trong lúc chờ — đã có); hiệu ứng chiêu khi có `fx`; icon khi mở cửa sổ; âm thanh khi phát | Không | |
| **G5** | Rảnh (`requestIdleCallback`) | Hiệu ứng các chiêu trên thanh kỹ năng của mình; động tác đánh của mình; bản đồ kế tiếp khi đứng gần cổng (`map.json` + vùng quanh điểm đến) | Không, hủy được | Dừng khi mạng chậm / pin yếu (`navigator.connection.saveData`) |

Không tải trước: nhạc (phát luồng), bản đồ khác ngoài cổng gần, trang phục người khác ngoài màn hình, hiệu ứng chiêu của phái khác.

## 4. Sau đó lưu đệm gì

Ba tầng lưu đệm, khác nhau về chỗ ở và thời gian sống:

| Tầng | Chỗ | Sống bao lâu | Tài liệu |
|---|---|---|---|
| **T1 — bộ nhớ đồ họa** | Texture Phaser (GPU) | Tới khi không ai dùng + hết thời gian chờ / vượt ngân sách | 03 (PF2) |
| **T2 — bộ nhớ JS** | `Audio.buffers`, `poseCache`, JSON bản đồ đã parse | Phiên chơi (nhỏ, giữ nguyên) | — |
| **T3 — lưu trữ bền** | HTTP cache + Service Worker Cache Storage (Web); thư mục dữ liệu app (Desktop / Mobile) | Tới khi đổi phiên bản hoặc bị dọn theo LRU | 05 (PF4) |

Chính sách T3 theo gói (đề xuất):

| Gói | Gồm | Cách vào cache | Dọn |
|---|---|---|---|
| `core` | giao diện `ui/**`, con trỏ, chân dung, âm thanh `sound/**`, bundle JS | **Tải trước khi cài** (precache) ở G0 / nền | Chỉ khi đổi phiên bản |
| `char` | sheet nhân vật | Khi dùng lần đầu | LRU trong ngân sách gói |
| `npc` | sheet quái / NPC | Khi dùng | LRU |
| `skill` | hiệu ứng + icon kỹ năng | Khi dùng; chiêu phái mình tải nền ở G5 | LRU |
| `items` | icon vật phẩm, ngựa | Khi dùng | LRU |
| `map/<id>` | mọi file của một bản đồ | Khi dùng (từng vùng) | LRU **theo bản đồ**: giữ N bản đồ gần nhất + bản đồ thành của nhân vật |
| `music` | nhạc nền | **Không** qua Service Worker (phát luồng, yêu cầu Range); HTTP cache bình thường | — |

T1 nhỏ và nhanh (vài trăm MB), T3 lớn và chậm hơn (vài trăm MB tới vài GB), mạng chậm nhất. Một sheet bị T1 gỡ thì lần sau
lấy lại từ T3 (không qua mạng), nên PF2 gỡ mạnh tay được mà không hại trải nghiệm — **đây là lý do làm PF4 cùng PF2**.

## 5. Ba nền tảng

| | Web | Desktop (Tauri / Electron) | Mobile (Capacitor / Tauri 2) |
|---|---|---|---|
| G0–G1 | Qua mạng, lần sau từ cache | Đóng gói sẵn trong app | Đóng gói sẵn trong app |
| G2–G5 | Mạng + T3 | Gói `core` + bản đồ thành trong app, còn lại tải về đĩa | Như Desktop; cửa hàng giới hạn dung lượng cài nên gói sẵn càng ít càng tốt |
| T1 ngân sách | trung bình | lớn | **nhỏ** (03 §4) |
| T3 | Cache Storage có hạn mức trình duyệt; Safari có thể xóa sau thời gian không dùng (**cần kiểm lại khi làm**) | Thư mục dữ liệu app, không giới hạn thực tế | Thư mục dữ liệu app; Service Worker trong WKWebView có điều kiện (**cần thử, HT2**) |
