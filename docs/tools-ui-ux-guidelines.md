# Design guideline UI/UX cho các công cụ trong tools/

> Quyết định USER · 2026-11-14. Đây là nguồn quy tắc UI/UX duy nhất cho công cụ nội bộ của repo.
> Mẫu tham chiếu: `tools/bots/ui/`. Không phải bộ quy tắc thay đổi giao diện hay cách dựng hình của game.

## 1. Bắt buộc đọc trước khi làm tool

Khi yêu cầu có liên quan đến **tạo tool, công cụ quản trị, trang cấu hình, giao diện tool, dashboard, form, component, style, sửa UX/UI của công cụ**, mọi AI làm việc với repo phải **đọc toàn bộ file này trước khi đề xuất thiết kế, lập kế hoạch hoặc sửa mã**. Áp dụng cho ChatGPT/Codex, Claude, Gemini, Antigravity và agent được giao cùng đầu việc; không phụ thuộc tên thư mục đã được nêu trong yêu cầu hay chưa.

Đọc tiếp `AGENTS.md`, hướng dẫn trong `tools/` và README của tool liên quan. Nếu vừa chuyển sang một đầu việc tool mới mà chưa đọc guideline trong phiên, đọc trước khi tiếp tục. Khi đã đọc và nội dung chưa đổi, không cần đọc lại ở mỗi thao tác.

- Dùng tài liệu này làm chuẩn; các file chỉ dẫn AI chỉ giữ đường dẫn và điều kiện phải đọc, không sao chép bảng màu hoặc component sang thành nhiều bộ luật.
- Yêu cầu trực tiếp của người dùng được ưu tiên khi có khác biệt. Ghi nhận ngoại lệ và lý do vào tài liệu của tool; không tự đổi guideline chung theo sở thích của một phiên.
- Tool CLI thuần không bị ép thêm giao diện. Khi CLI có trang điều khiển hoặc màn cấu hình, phần đó phải theo guideline.
- Công cụ cũ có thể chưa đạt mọi mục. Khi được yêu cầu sửa, đưa phần đang sửa về chuẩn; không tự viết lại toàn bộ tool khác ngoài phạm vi.

## 2. Hướng thiết kế

Giao diện quản trị **gọn, rõ, tập trung vào dữ liệu và thao tác**. Dùng tiếng Việt nhất quán, nền tối trung tính pha xanh, một màu nhấn xanh lá nhạt. Lấy giao diện Bot làm chuẩn hình thức và luồng thao tác; không lấy các chi tiết chưa hoàn thiện của nó làm ngoại lệ mặc định.

- Tên trang mô tả công việc. Mỗi section có tiêu đề và một nhiệm vụ; đánh số khi có thứ tự thực hiện thật.
- Luồng ưu tiên: **chọn đối tượng → cấu hình → áp dụng/chạy → xem trạng thái**.
- Danh sách đối tượng chiếm vùng chính. Các form liên quan đặt bên dưới hoặc cạnh nhau nếu đủ chiều rộng.
- Chỉ hiện input có tác dụng với lựa chọn hiện tại. Thông số ít dùng nằm trong **Cài đặt nâng cao**, mặc định đóng.
- Không lặp cùng một input hay cùng một bộ chọn ở nhiều section; dùng một nguồn state, tóm tắt khi cần.
- Không thêm banner quảng cáo, hero lớn, gradient, hiệu ứng kính, animation liên tục hoặc emoji trang trí vào công cụ quản trị.
- Màu chất lượng đồ, ngũ hành, phe hoặc trạng thái có ý nghĩa nghiệp vụ được giữ riêng; không dùng chúng để tạo nhiều màu nút chính.

## 3. Style và design tokens

Các giá trị dưới đây được lấy từ `tools/bots/ui/botPanel.css` và `page.css`. Tool mới nên khai báo chúng bằng CSS variables; tool hiện tại chưa bắt buộc đổi toàn bộ mã sang variables trong một lần sửa nhỏ.

| Thành phần | Giá trị chuẩn |
|---|---|
| Nền trang | `#101211` |
| Nền section/panel | `#181c19` |
| Nền input | `#111613` |
| Nền input chỉ đọc | `#202621` |
| Viền section / viền input | `#303832` / `#404b43` |
| Chữ chính | `#e6e9e6` |
| Chữ nhãn / mô tả phụ | `#b8c1ba` / `#9ba69e` |
| Màu nhấn / nền nút chính | `#b9d8bf` |
| Chữ trên nút chính | `#142318` |
| Nền nút thường / hover | `#242d26` / `#303e33` |
| Nền dòng đã chọn | `#263a2c` |
| Chữ lỗi / thao tác nguy hiểm | `#f2ad9b` |
| Focus bàn phím | Outline `2px solid #acd4b5`, offset `3px` |
| Bo góc input, nút, bảng / section | `6px` / `10px` |

```css
/* Tên token dùng chung cho tool mới; không đổi global theme của game. */
.tool-page {
  --tool-bg: #101211;
  --tool-panel: #181c19;
  --tool-input: #111613;
  --tool-border: #303832;
  --tool-control-border: #404b43;
  --tool-text: #e6e9e6;
  --tool-muted: #9ba69e;
  --tool-accent: #b9d8bf;
  --tool-on-accent: #142318;
  --tool-error: #f2ad9b;
}
```

| Nhịp bố cục | Quy tắc |
|---|---|
| Font | `system-ui, sans-serif`; không tải font từ bên ngoài chỉ để trang trí |
| Chữ nội dung | `14px`, line-height `1.5` |
| Tiêu đề trang | `26px` desktop, khoảng `23px` mobile |
| Tiêu đề section / nhóm | `16px` / `13px` |
| Label, hint, bảng | Khoảng `12–13px`; không thu nhỏ để nhét thêm cột |
| Lệnh, ID cần sao chép | Monospace; số liệu có thể dùng `tabular-nums` |
| Chiều rộng nội dung | Tối đa khoảng `1480px`, căn giữa |
| Padding trang / section | Desktop khoảng `28px` / `22px`; mobile `16px` |
| Khoảng cách section / input | `20px` / `14px`; cùng một nhóm dùng `8–12px` |
| Control desktop | Cao tối thiểu `40px`, padding khoảng `8px 11px`, cùng font và viền |
| Cảm ứng | Vùng bấm tối thiểu `44 × 44px`, kể cả label checkbox; không chỉ tăng icon |

Hai mốc responsive đang dùng: khoảng **760px** chuyển form về một cột; **600px** chuyển danh sách + preview trong dialog về một cột. Có thể điều chỉnh khi nội dung cần, nhưng không để tràn ngang cả trang.

**Trạng thái chỉ đọc vẫn phải dễ đọc.** Không chỉ giảm opacity mạnh để diễn tả readonly. Tương phản mục tiêu: chữ thường ≥4,5:1; control/focus và chữ lớn ≥3:1. Bảng màu là điểm bắt đầu, vẫn cần kiểm tra các cặp màu thật sau khi phối hợp.

## 4. Component và hành vi chuẩn

### Form field

- Label luôn hiện phía trên input; placeholder chỉ là ví dụ, không thay label.
- Hint đặt ngay dưới field, giải thích ý nghĩa, đơn vị, ví dụ và giá trị đặc biệt nếu có.
- Ưu tiên select cho tập lựa chọn hữu hạn; checkbox cho có/không. Không yêu cầu nhập ID hoặc nhớ mã nếu có thể chọn tên.
- Giới hạn min/max và kiểm tra ở cả UI lẫn backend. Không âm thầm biến giá trị sai thành một hành động khác.
- Readonly input/textarea dùng để xem và sao chép. Select/checkbox đang review template dùng `fieldset disabled` hoặc cơ chế tương đương.
- Mọi trạng thái editable/readonly/disabled phải có ý nghĩa rõ. Khi khóa nút, có hướng dẫn điều kiện để mở nút.

### Template và lưu cấu hình

Luồng mẫu của Bot là chuẩn dùng lại cho các tool có preset:

1. Select có label, chia nhóm **Tự cài đặt** và **Danh sách template**.
2. Chọn template thì tự tải và hiện dữ liệu để review; khóa các input cấu hình. Không thêm nút **Nạp** nếu select đã làm việc đó.
3. Chọn Tự cài đặt thì mở input, giữ dữ liệu đang xem để chỉnh tiếp trong giới hạn hợp lệ.
4. **Lưu thiết lập / Lưu kịch bản** chỉ lưu cấu hình, không tự áp dụng hoặc chạy. Hỏi tên khi lưu thành template; không cho lưu tên rỗng. Nếu trùng tên, nêu rõ việc ghi đè.
5. **Cập nhật / Áp dụng / Chạy** là hành động riêng, gọi đúng backend rồi cập nhật kết quả trên danh sách.

Nếu một nghiệp vụ cần luồng khác, giải thích rõ trong README của tool. Không tự gộp lưu và chạy dưới một nhãn mơ hồ.

### Button và thanh thao tác

- Nút dùng động từ + đối tượng: **Cập nhật thiết lập**, **Chạy kịch bản**, **Dừng bot đã chọn**.
- Mỗi nhóm thao tác có một nút chính nổi bật; các nút phụ cùng chiều cao và cùng một hàng khi đủ chỗ.
- Khi tác động hàng loạt, chỉ áp dụng cho các đối tượng được tích chọn. **Chọn kết quả lọc** áp dụng đúng tập đang lọc, không âm thầm chọn toàn bộ dữ liệu.
- Không có lựa chọn thì khóa thao tác phụ thuộc lựa chọn. Đang gửi yêu cầu thì khóa thao tác trùng, giữ lựa chọn của người dùng.
- Xóa hoặc hành động không thể khôi phục phải mô tả đúng phạm vi và có xác nhận phù hợp. Thao tác lưu thường không cần thêm bước xác nhận không cần thiết.

### Bảng và danh sách

- Tên đối tượng là cột chính, ID là thông tin phụ khi thực sự cần.
- Có tìm kiếm/lọc và số đã chọn khi dữ liệu nhiều. Giữ lựa chọn khi làm mới trạng thái.
- Header cố định trong vùng cuộn bảng; chỉ bảng được cuộn ngang trên mobile.
- Dòng chọn có nền riêng, checkbox có label truy cập được. Trạng thái có chữ, không chỉ dựa vào màu.
- Dữ liệu server cập nhật không được ghi đè form người dùng đang sửa hoặc cướp focus liên tục.
- Có trạng thái đang tải, rỗng, không khớp bộ lọc và lỗi; kèm cách xử lý cụ thể.

### Dialog, bộ chọn và preview

- Với HTML tool hiện tại, dùng lại `apps/client/src/ui/kit/dialog.ts`: tiêu đề, kéo, đóng, Esc, thứ tự cửa sổ. Đóng gói dependency vào app tool, không cần nạp cả game.
- Dialog có tên truy cập được, nội dung cuộn bên trong, nút xác nhận/hủy rõ ràng; focus vào trường đầu, trả lại phần tử mở khi đóng. Không đặt điều khiển thiết yếu chỉ trong hover.
- Bộ chọn danh sách lớn có tìm kiếm và vùng cuộn; nếu đối tượng có ảnh/bản đồ thì có preview phù hợp.
- Thay đổi trong dialog là tạm thời: **OK** mới cập nhật form; **Hủy/Esc** giữ nguyên giá trị cũ.
- Dùng `assetUrl`/manifest của dự án cho asset game; không đọc hoặc sao chép hàng loạt `public/assets` để làm preview.

### Trạng thái, tác vụ dài và lệnh

- Chỉ hiển thị thành công/Online sau khi có phản hồi hoặc kết nối thật. Phân biệt **Đang chuẩn bị → Chờ → Đang chạy → Đang dừng → Đã dừng/Lỗi**.
- Tác vụ dài có trạng thái theo đối tượng, nhịp cập nhật hợp lý và thao tác dừng rõ phạm vi. Dừng một đối tượng không được ngầm dừng cả nhóm.
- Hiển thị lỗi ở vị trí liên quan, giữ dữ liệu đã nhập. Dùng `role="status"`/`aria-live` phù hợp cho kết quả; không spam popup mỗi lần poll.
- Nếu hỗ trợ CLI, hiển thị lệnh sử dụng được và nút Sao chép. Lệnh phải khớp cấu hình đã lưu; thay đổi chưa lưu thì báo cần lưu lại.
- Màn hình không tự giả định chạy thành công chỉ vì đã tạo tiến trình; backend vẫn kiểm tra đối tượng, trạng thái hiện tại và yêu cầu trùng.

## 5. Component, CSS và thư viện

Mẫu triển khai hiện tại:

| Nhu cầu | Tham chiếu |
|---|---|
| Form, select template, bảng, toolbar, status | `tools/bots/ui/BotPanel.ts` |
| Style control, section, responsive | `tools/bots/ui/botPanel.css`, `page.css` |
| Dialog chọn map / nhập tên | `tools/bots/ui/SetupDialogs.ts` và `apps/client/src/ui/kit/dialog.ts` |
| Asset có phiên bản | `tools/bots/ui/assets.ts` |
| API cấu hình / điều khiển tác vụ | `tools/bots/ConfigStore.ts`, `RunManager.ts` — tham chiếu cách tách trách nhiệm, không chép nghiệp vụ bot sang tool khác |

- Dùng HTML semantic, CSS có scope theo root tool, helper/component nhỏ. Không để selector của tool sửa `body`, `button`, `input` của game khi chạy chung tài liệu.
- Dùng lại component và token có sẵn trước khi tạo mới. Quy tắc trong file này không có nghĩa repo đã có một thư viện `tools/ui` hoàn chỉnh: không import component chưa tồn tại.
- Nếu nhiều tool cần chung một component, tách module dùng chung có API nhỏ. Không copy nguyên form bot, ID DOM hay logic bot rồi thay tiêu đề.
- Hiện ưu tiên HTML/CSS và TypeScript đang có. Tailwind được phép nếu giữ đúng token và hành vi; không bắt buộc cài chỉ vì làm tool mới. Không tự thêm React, bộ UI hoặc icon library lớn cho một form đơn giản.
- Khi cần thêm dependency, đánh giá chất lượng/bảo trì, kích thước/phụ thuộc, cộng đồng và độ dễ triển khai theo AGENTS. Không đổi nền tảng chỉ để đổi style.

## 6. Tool phải độc lập với game

- Mỗi tool ở `tools/<tên>/`, có README, lệnh khởi động và cổng riêng không trùng công cụ khác.
- Không import entrypoint game hoặc nạp Phaser chỉ để hiển thị form. Tool không nối vào HMR của game và không tự reload khi game sửa mã/reload.
- Có thể dùng lại shared rules và UI primitives rồi bundle cho tool. Khi tool có tác vụ nền, reload/đóng tab không tự dừng tác vụ; cách dừng app và tác vụ phải được ghi rõ.
- UI gửi yêu cầu qua API; backend xác minh dữ liệu và quyền tác động. Không đưa đường dẫn, thông số triển khai hoặc mã nội bộ lên luồng người dùng nếu chúng không giúp quyết định.
- Không sao chép asset, công thức hoặc dữ liệu game để tạo một bản riêng dễ lệch. Cấu hình có nguồn chuẩn và cách lưu/áp dụng rõ ràng.

## 7. Checklist trước khi bàn giao

Đây là cổng tự kiểm chất lượng của agent, **không phải yêu cầu người dùng phê duyệt thêm**.

- [ ] Đã đọc guideline và README tool, kiểm tra component/style có thể dùng lại.
- [ ] Luồng chọn/cấu hình/lưu/áp dụng rõ; input không lặp; nâng cao mặc định đóng.
- [ ] Token, font, padding, chiều cao input/nút, focus và readonly thống nhất.
- [ ] Có loading/empty/error/success; thao tác hàng loạt đúng lựa chọn; backend chặn thao tác trùng.
- [ ] Kiểm template/custom, tên bắt buộc, lưu không áp dụng, thay đổi chưa lưu.
- [ ] Nếu có tác vụ nền: khởi động/dừng/nhận trạng thái thật, reload tab không nhân đôi tác vụ hoặc mất điều khiển.
- [ ] Chạy trình duyệt thật ở khoảng1440×1000 và390×844; kiểm cuộn, focus bàn phím, Esc, vùng bấm, không tràn ngang trang.
- [ ] Xem ảnh chụp sau khi render; sửa cắt chữ, nút lệch, khoảng cách và trạng thái khó đọc.
- [ ] Chạy typecheck/build và test phù hợp với thay đổi; không tuyên bố đã kiểm native nếu mới kiểm kích thước viewport.
- [ ] Cập nhật README và tasks theo AGENTS; ghi rõ ngoại lệ/còn dở, không tự commit/push.

Tool web cần responsive cho desktop và màn hình cảm ứng. Tool dev chạy Node trên máy cục bộ không tự trở thành app mobile/native: ghi rõ điều kiện truy cập, không mở mạng LAN hoặc thêm đóng gói ngoài yêu cầu.

## 8. Đầu vào cho các AI khác

| Điểm vào trong repo | Vai trò |
|---|---|
| `AGENTS.md` | Quy tắc chung và điều kiện phải đọc guideline ngay khi đề cập tool |
| `CLAUDE.md` | Cùng điều kiện cho Claude, tiếp tục dùng AGENTS làm luật dự án |
| `GEMINI.md` | Cùng điều kiện cho Gemini |
| `.agents/rules/tools-ui-ux.md` | Nhắc bắt buộc đọc bằng rule `always_on` cho Antigravity |
| `tools/AGENTS.md` | Nhắc lại bắt buộc đọc khi agent bắt đầu làm việc trong tools/ |

Các file này áp dụng trong workspace/repo được AI truy cập. Một cuộc chat không có quyền đọc repo cần được cung cấp file này hoặc nội dung của nó; file trong repo không thể tự ép một ứng dụng ngoài workspace nạp hướng dẫn. Không tự sửa cấu hình AI toàn máy/tài khoản.

Tham khảo cơ chế nạp chỉ dẫn, xác minh2026-11-14: [Gemini project context](https://geminicli.com/docs/cli/gemini-md/), [Antigravity workspace rules](https://antigravity.google/docs/rules/). Các trang này chỉ giải thích nơi đặt file; chuẩn thiết kế của project được quyết định tại tài liệu này.
