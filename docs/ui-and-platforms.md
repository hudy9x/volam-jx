# Giao diện và nền tảng mục tiêu

> Ghi lại 2026-11-12 theo yêu cầu người dùng. Phần đánh giá là **hiện trạng đã xem trong code**; phần khuyến nghị là **đề xuất
> của agent, chưa chốt**. Cấu trúc thư mục đề xuất: `docs/restructure-plan.md`.

## 1. Nền tảng mục tiêu

Game phải chơi được trên **Web, Desktop app và Mobile** (luật lâu dài, `AGENTS.md` §1). Hiện client mới được làm và thử cho
trình duyệt desktop (chuột + bàn phím).

Cả ba dùng chung một mã web (Phaser + TS): Web chạy thẳng trong trình duyệt; Desktop bọc bằng Electron hoặc Tauri; Mobile bọc
bằng Capacitor hoặc Tauri 2. Tất cả là webview, nên HTML/CSS lẫn canvas đều chạy được. App iOS bắt buộc dùng WKWebView (WebKit),
nên phải thử thêm trên WebKit chứ không chỉ Chromium.

## 2. Danh sách màn hình hiện có

**Ngoài game** (`src/ui/screens/`, luồng ở `src/app/App.ts`)

| Màn hình | Nội dung |
|---|---|
| Đăng nhập / Đăng ký | Tài khoản, mật khẩu |
| Chọn + Tạo nhân vật | Một màn: danh sách nhân vật, tên, giới tính, lưới 11 phái |
| Đang tải | Dùng chung: tải tài nguyên, vào bản đồ, dịch chuyển |

**HUD trong game** (luôn hiện, `src/ui/hud/`)

| Thành phần | Vị trí |
|---|---|
| Khung nhân vật: chân dung, tên, phái·cấp, thanh Sinh lực / Nội lực | Trên trái |
| Biểu tượng trạng thái (bùa lợi/hại, số giây còn lại) | Dưới khung nhân vật |
| Bản đồ nhỏ: tên map, nút Chuyển map / Bản đồ lớn / Thu gọn, tọa độ, số người | Trên phải |
| Thanh phím tắt: ô 1–9, chuột trái/phải, hồi chiêu, nút Hành trang, Kỹ năng, Ngựa, PK, Cửa hàng, Hệ thống | Dưới giữa |
| Thông báo, dòng "Đang tự động đánh", tooltip vật phẩm/kỹ năng (`#item-tip` dùng chung) | Nổi |

**Cửa sổ** (11 cái, `src/ui/windows/`, đều qua `ui/kit/dialog.ts`)

| Cửa sổ | Mở bằng | Ghi chú |
|---|---|---|
| Trang bị · Hành trang | I | |
| Kỹ năng võ công | F | Có nút đổi cấp (dev) |
| Bản đồ lớn | Tab | Chứa công cụ "Khu quái" (dev) |
| Xa phu · Chuyển bản đồ | T / NPC | |
| Thợ rèn | NPC / nút trên thanh | Đồ cấp 1–10, giá 0 (thử nghiệm) |
| Bán ngựa | NPC | |
| Hội thoại NPC | Click NPC | |
| Hệ thống | Esc | |
| Tùy chỉnh | Từ Hệ thống | Âm thanh, bản đồ nhỏ, bảng phím tắt (gõ tay trong HTML) |
| Tự động đánh | Từ Hệ thống | |
| Trọng thương | Khi chết | Không đóng được |

**Vẽ trong canvas Phaser:** tên + thanh máu trên đầu (`ActorView.drawPlate`), số sát thương (`Effects`), hình/icon trạng thái trên
người (`StateDecor`), nhãn cổng (`WorldScene.drawPortals`), con trỏ đổi theo đối tượng.

**Chỉ dành cho dev** (`src/dev/`, không vào bản build chính thức): `/?skills` (skill lab, CSS riêng nhúng trong `SkillLabPanel.ts`), `/?gallery`, `/maptest.html?map=37`,
công cụ Khu quái, nút đổi cấp kỹ năng, cửa hàng giá 0.

**Hình gốc đã sinh nhưng chưa dùng** (`public/assets/ui`): `b-char`, `b-team`, `b-friend`, `b-guild`, `b-task`, `b-sit`, `b-run`,
`brocade` — cho các màn chưa làm (Nhân vật / thuộc tính, Tổ đội, Hảo hữu, Bang hội, Nhiệm vụ, Ngồi, Chạy).

## 3. Đánh giá tổ chức mã giao diện (trước khi cấu trúc lại)

> Các điểm "chưa gọn" dưới đây đã được sửa khi cấu trúc lại 2026-11-12 — cấu trúc mới: `docs/architecture.md`.

Tốt, nên giữ:

- Một trình quản lý cửa sổ duy nhất (`ui/dialog.ts`): khung gốc, kéo thả, nhớ vị trí, Esc theo thứ tự.
- Giao diện không gửi lệnh mạng: mọi thao tác đi qua `HudActions`; chỉ `WorldScene` gọi `room.send`.
- Logic hiển thị nằm ở shared (`describeSkill`, `equipError`, `stateLines`); giao diện chỉ vẽ.
- Hình giao diện sinh bằng `gen:ui`; màu trong `:root`; HUD chỉ ghi DOM khi giá trị đổi.

Chưa gọn:

1. `ui/hud.ts` (601 dòng) ôm khung nhân vật, trạng thái, thông báo, Hệ thống, Tùy chỉnh, Auto, NPC, hành trang, tooltip, Thợ rèn,
   Bán ngựa, Chuyển bản đồ. Danh sách cửa sổ có ngoại lệ cho Kỹ năng và Bản đồ lớn (`toggleWindow`).
2. HTML mọi màn hình dồn trong `index.html`; TS tìm phần tử bằng chuỗi id (khoảng 85 id, riêng `hud.ts` 49). `typecheck` không bắt
   được id sai.
3. `style.css` một file 396 dòng, chủ yếu `#id`; khung ngọc lặp 4 lần (class `.jade` có mà không dùng); nút đá định nghĩa 2 lần
   (`.btn`, `.screen button`); kiểu tooltip lặp cho `#item-tip` và `#skill-detail`.
4. Phím tắt rải rác: `WorldScene.setupInput` (1–9, F, I, T, Tab, M, P, Z), `dialog.ts` (Esc), bảng phím trong HTML gõ tay.
5. Phụ thuộc hai chiều: `game/WorldScene`, `game/AutoPlay`, `game/audio` import `ui/`; `ui/hud` import `game/ActorView`, `game/jx`.
   `ui/settings.ts` thực chất là trạng thái ứng dụng.
6. Không có trạng thái chung phía client: `Hud`, `SkillUi`, `main.ts` mỗi nơi giữ một phần.
7. Luồng màn hình là ẩn/hiện viết tay trong `main.ts`; màn "Đang tải" do `Hud.loading()` điều khiển.
8. Đồ dev lẫn trong giao diện người chơi.

## 4. HTML/CSS hay canvas — khuyến nghị: lai

**HTML/CSS** cho màn hình ngoài game, HUD, cửa sổ, tooltip, chat; **canvas Phaser** cho thứ gắn với thế giới (tên / máu trên đầu,
số sát thương, hình trạng thái, nhãn cổng, vòng chọn mục tiêu). Đây cũng là cách chia hiện tại.

| Tiêu chí | HTML/CSS | Canvas |
|---|---|---|
| Gõ tiếng Việt (chat, tên): bàn phím ảo, Telex/VNI, dán | Có sẵn | Tự làm bằng ô nhập ẩn, dễ lỗi trên mobile |
| Danh sách cuộn (hành trang, ~300 bản đồ, mô tả, chat) | Cuộn cảm ứng có quán tính sẵn | Tự viết cuộn, vùng cắt |
| Chữ có dấu, xuống dòng, nhiều màu, nét theo DPR | Có sẵn | Text vẽ thành texture, đổi chữ là vẽ lại; tốn bộ nhớ GPU |
| Bố cục theo màn hình (desktop, điện thoại ngang, tablet, tai thỏ) | Media query, flex/grid, `env(safe-area-inset-*)` | Tự tính tọa độ |
| Bám vật thể trong thế giới | Lệch khung, nhiều phần tử thì nặng | Tự nhiên |
| Giống hệt giao diện gốc từng pixel | Được (`border-image`, `pixelated`), chênh nhẹ giữa engine | Kiểm soát tuyệt đối |
| Kiểm thử tự động (Playwright) | Chọn phần tử, đọc chữ | Chỉ tọa độ / ảnh chụp |

Client gốc JX1 vẽ giao diện trong engine vì công nghệ thời đó; không cần bắt chước.

## 5. Hệ quả của 3 nền tảng (chọn cách nào cũng phải làm)

1. **Hai bố cục, chung thành phần:** Desktop giống gốc (cửa sổ nổi kéo thả, phím tắt); Mobile ngang (nút chiêu to góc phải, cửa sổ
   toàn màn, giữ lâu thay rê chuột, không có chuột phải). Thanh phím gốc rộng 800px, ô 36px — điện thoại ngang khoảng 844 CSS px
   và ngón tay cần ô ≥ 44px, nên mobile cần bố cục riêng chứ không chỉ thu nhỏ.
2. **Một lớp nhập liệu:** phím / chuột / chạm (và Auto) đều quy về ý định chung: đi tới, ra chiêu ô X, khóa mục tiêu, mở cửa sổ.
3. **Hình 1:1 trên điện thoại** (tính toán, chưa thử): canvas theo pixel thiết bị nên điện thoại DPR 3 thấy vùng khoảng 2532×1170
   (gấp ~3 lần 800×600 gốc), nhân vật cao vài mm. Có thể phải phóng to theo bội số nguyên trên mobile — đụng quy tắc "không đổi cách
   dựng hình" (`AGENTS.md` §5.5), người dùng quyết khi làm mobile.
4. **Tài nguyên hơn 15 GB** không đóng gói được vào app mobile: tải theo nhu cầu từ server (đang làm vậy) + lưu đệm.
5. **Thử trên WebKit** ngoài Chromium (iOS, macOS / Tauri).
