# Bot giả lập người chơi và đo hiệu năng server

> Viết 2026-11-13 theo yêu cầu người dùng: dự án dùng để đánh giá **hiệu suất cao và ổn định**. Người dùng chốt cùng ngày:
> **tách làm hai phần**. Bot là công cụ **giả lập người chơi** (dùng cả khi chơi thử, thử tính năng, làm đông thế giới); **đo đếm**
> hiệu năng server là công cụ riêng, dùng với bot hay với người thật đều được. Bot làm trước (**phần 1, đã có code**), đo đếm làm
> sau (**phần 2, mới là thiết kế**). Đầu việc: nhóm **BT** trong `tasks/BACKLOG.md` §10. Hiệu năng tải ảnh phía client là việc khác:
> `docs/performance/` (nhóm PF).

## 0. Dùng nhanh

Hướng dẫn từng bước cho người dùng (có ảnh chụp trang `/?bots`): **[`bots-guide.md`](bots-guide.md)**. File này là thiết kế
và bản đồ mã.

## 1. Bot là gì

Bot là **một tài khoản thật** trong DB, có cờ `bot: true` trên `UserRecord` (`account/db.ts`). Nó vào game qua WebSocket bằng
`@colyseus/sdk` và chỉ gửi đúng các lệnh trình duyệt gửi (`move`, `cast`, `pk`, `buy`, `use`, `pickup`, `train`, `teleport`, `respawn`, `aura`).
Server không phân biệt bot với người, nên tải bot tạo ra là tải thật. Phần được tự động hóa chỉ là quyết định đi đâu, đánh ai.

Bot chạy ở **tiến trình riêng** (`npm run bots`), không chung tiến trình với server.

## 2. Phần 1: Bot (đã làm)

```
Trang /?bots (dev)  ──API dev──▶  server (MapRoom + db)          bots/templates/<mẫu>.json · bots/<kịch bản>.json
  mẫu, tạo / đặt lại / xóa,        · tạo tài khoản + nhân vật cấp 1, mẫu "chờ áp"   ▲ trang lưu qua API
  danh sách, soạn kịch bản         · bot vào game lần đầu → áp mẫu (world/botSetup.ts)
                                    · cấp token cho runner
npm run bots -- <kịch bản>  ──login API──▶ token ──WebSocket──▶ N bot, mỗi bot 1 hành vi (AutoPlay / PK / đi dạo…)
```

| Phần | File |
|---|---|
| Kiểu mẫu / kịch bản, mặc định, kiểm tra dữ liệu | `packages/shared/src/bots/index.ts` (`BotTemplate`, `BotScenario`, `normalizeBot*`, `splitBehaviors`) |
| Bộ não Luyện quái (dùng chung với phím Z) | `packages/shared/src/auto/` (`AutoPlay.ts`, `settings.ts` = `AutoSettings`, `approachDistance`) |
| API dev | `apps/server/src/dev/botAdmin.ts` (`/api/dev/bots…`) |
| Áp mẫu khi bot vào game lần đầu | `apps/server/src/world/botSetup.ts` (gọi từ `MapRoom.onJoin`) |
| Runner | `apps/server/src/dev/bots.ts` (lệnh) + `dev/bots/` (`BotClient.ts`, `behaviors.ts`, `rng.ts`, `legacy.ts` = chế độ cũ) |
| Trang | `apps/client/src/dev/bot-panel/` (`App.ts` nạp động khi có `?bots`; không cần Phaser, không cần đăng nhập) |

### 2.1 Mẫu tài khoản (`BotTemplate`)

Tiền tố tài khoản (`bot…` → `bot_1`, `bot_2`…, nhân vật `Bot1`…), mật khẩu chung (để đăng nhập bot bằng trình duyệt xem nó làm gì),
môn phái (một phái / chia đều 11 phái / chưa vào phái), giới tính (xen kẽ; phái chỉ nhận một giới thì theo phái), cấp từ–đến (ngẫu nhiên),
điểm tiềm năng (gợi ý tuyến / dồn một thuộc tính), điểm kỹ năng (gợi ý tuyến / không cộng), học hết chiêu 90 / 120 / 150, trang bị
(đồ khởi đầu / bộ hoàng kim môn phái), Càn Khôn Giới Chỉ, ngựa (không / ngẫu nhiên / một loại), tiền, thuốc Sinh lực / Nội lực + số bình,
chỗ xuất hiện (bãi luyện công theo cấp / thành / rải đều danh sách bản đồ) + bán kính rải.

**Cách áp mẫu**: khi tạo, server ghi một nhân vật cấp 1 như `POST /api/characters` tạo (hệ theo phái), kèm `CharacterRecord.bot`
(mẫu, cấp và phái đã gieo, `pending`). Lần đầu bot vào game, `applyBotSetup` gọi đúng các hàm người chơi và lệnh bài dùng: `gainExp`
tới cấp → `joinFaction` → mặc đồ khởi đầu của phái → `applySuggestion` (kỹ năng) → lệnh bài học chiêu tầng → bộ hoàng kim, nhẫn,
ngựa vào túi → cộng tiềm năng (gợi ý tính cả sức mạnh / thân pháp đồ cần) → mặc đồ, lên ngựa → tiền, thuốc → đầy máu.
Agent tự chọn: bộ hoàng kim lấy một bộ **mặc được trọn bộ ở cấp của bot**; không có bộ nào thì lấy bộ cần cấp thấp nhất, món chưa đủ
cấp để trong túi (hoàng kim môn phái cần cấp 80–99, vũ khí thường cần 99). Ngựa ngẫu nhiên chỉ chọn trong số ngựa cấp của bot cưỡi được.

**Đặt lại theo mẫu** (mục 2 trên trang): bot về cấp 1, giữ tên, mẫu chờ áp lại. **Xóa**: xóa hẳn tài khoản + nhân vật. Bot đang
online thì bỏ qua (tắt runner trước).

### 2.2 Kịch bản chạy (`BotScenario`, `bots/<tên>.json`)

| Nhóm | Cài đặt |
|---|---|
| Chung | Server, tiền tố bot + số bot (0 = tất cả), tốc độ vào game (bot / giây), thời lượng (0 = tới Ctrl+C), hạt giống ngẫu nhiên |
| Tỉ lệ hành vi | Trọng số cho từng kiểu (bảng dưới); số bot mỗi kiểu chia theo phần dư lớn nhất, ai nhận kiểu nào xáo theo hạt giống |
| Tùy chọn hành vi | PK: chế độ (Đồ sát / Chiến đấu) + mục tiêu (gần nhất / khác phe / ngẫu nhiên); Đi dạo: bán kính; Đi bản đồ: mỗi X giây + danh sách; Dồn một chỗ: bản đồ, x, y, bán kính, có ra chiêu không |
| Tự động đánh | Đủ tùy chọn của cửa sổ Auto (`AutoSettings`) cho kiểu Luyện quái |
| Giống người | Chu kỳ ra quyết định (ms, ± 30 %), độ trễ phản ứng ngẫu nhiên [min, max] ms, lệnh tối đa / giây (vượt thì bỏ), rớt mạng tự vào lại |

| Kiểu | Làm gì |
|---|---|
| Luyện quái | `AutoPlay` thật: chọn quái, tiếp cận, xoay chiêu, bùa lợi / hại, uống / mua thuốc, nhặt / bán đồ, đổi bãi theo cấp, hồi sinh |
| PK | Về bãi luyện công theo cấp, bật PK, săn người chơi (khóa mục tiêu, khoảng cách tiếp cận theo tùy chọn Auto); tân thủ chỉ đi dạo |
| Đi dạo | Đi tới điểm ngẫu nhiên quanh chỗ vào bản đồ, mỗi 2–6 giây |
| Đứng yên | Vào game rồi không làm gì |
| Đi bản đồ | Dịch chuyển sang bản đồ khác trong danh sách mỗi X giây (± 20 %) |
| Dồn một chỗ | Cùng tới một điểm (mặc định điểm vào Biện Kinh), có thể liên tục ra chiêu ở đó |

Thanh kỹ năng của bot (agent tự chọn, như người mới chơi): chiêu tấn công học được, dùng được với vũ khí, chiêu cấp học cao trước, ở
tay trái + phím; sau đó 2 bùa lợi, 2 bùa hại; hào quang đầu tiên đặt ở tay phải (`C2S.aura`). Chiêu `noHorse` không dùng khi đang cưỡi.

Kiểm chứng 2026-11-13 trên server thử nghiệm: 6 bot cấp 99–120 đủ bộ hoàng kim, 21 bot đủ 6 kiểu hành vi trong 40 giây, 0 lỗi.
Trang đã thử bằng Playwright (lưu mẫu, tạo bot, lưu kịch bản).

### 2.3 Còn thiếu / để sau (BT8)

Kiểu hành vi Tổ đội, Ra vào game, Chat; bot ở máy khác trong LAN (server đặt `BOT_API_REMOTE=1`, runner `--server <url>`). Bot chưa tự
cộng điểm khi lên cấp sau này, chưa mặc đồ nhặt được.

## 3. Phần 2: Đo đếm hiệu năng server (thiết kế, chưa làm)

Độc lập với bot: số đo như nhau dù người trên server là bot hay người thật.

- **Server tự đo** khi `PERF=1`, đọc qua `GET /api/dev/perf` (chỉ khi `DEV_TOOLS` + `PERF`).
- **Xem số đo**: trang `/?perf` (biểu đồ trực tiếp) và lệnh `npm run perf -- <giây>` (ghi báo cáo JSON / CSV kèm commit hash, tên
  kịch bản bot đang chạy nếu có, cấu hình máy; lưu `bots/results/`, chỉ commit baseline).
- **Kịch bản đo** (tùy chọn): lệnh ghép hai phần. Bật bot theo một kịch bản, chờ ổn định, ghi số đo, tăng dần số bot để **tìm ngưỡng**
  (tick p99 > 50 ms). Không có logic riêng, chỉ gọi phần 1 và phần 2.

Hiện có: **`PERF=1`** (`MapRoom.recordPerf`) mỗi 10 giây in, theo bản đồ, số người / quái, tick p50 / p99 / max, fx / giây. Chỉ đo
`world.update` + `takeEvents` + `broadcast` fx. **Chưa đo**: mã hóa / gửi patch trạng thái (Colyseus làm ngoài tick), lưu nhân vật mỗi
10 giây (nằm **trong** tick nhưng sau mốc đo), độ trễ event loop, CPU / RAM tiến trình, byte thật gửi cho mỗi client. Số cũ trong
`README.md` (80 bot, một room: tick p50 ≈ 1–2 ms, p99 ≈ 5–23 ms) đo trước các thay đổi chiến đấu vòng 18–32.

### 3.1 Đo cái gì

| Phía | Chỉ số | Cách lấy |
|---|---|---|
| Server | **Tick đầy đủ** p50 / p99 / max, tách phần: mô phỏng (`world.update`), fx, lưu nhân vật | Mở rộng `recordPerf`; đưa lưu 10 s vào mốc đo |
| Server | Mã hóa + gửi patch trạng thái | Đo quanh `broadcastPatch` của Colyseus (hook / ghi đè trong MapRoom) |
| Server | Độ trễ event loop | `perf_hooks.monitorEventLoopDelay` |
| Server | CPU, RAM, GC | `process.cpuUsage`, `process.memoryUsage`, `PerformanceObserver('gc')` |
| Server | Byte gửi mỗi client / giây; thời gian một lần ghi DB | Đếm ở transport / `account/db.ts` |
| Bot (khi chạy kèm) | Độ trễ lệnh → thấy kết quả; lỗi kết nối, chết, kẹt, lệnh / giây | Runner đã đếm phần lệnh / chết / lỗi; thêm độ trễ khi làm phần 2 |
| Bot | **CPU tiến trình bot**: > 80 % một nhân → đánh dấu kết quả **không tin được** | `process.cpuUsage` |

### 3.2 Đo cho chính xác (cùng một máy)

- Bot và server là hai tiến trình; ghim nhân CPU riêng: `taskset -c 0-1` cho server, `taskset -c 2-11` cho bot (máy dev 12 nhân).
- Server Node chạy logic game trên **một luồng**: chỉ số quan trọng là tick p99 so với 50 ms, không phải % CPU toàn máy.
- Khi đo, tắt việc nặng khác (Vite, `gen:*`, Playwright), hoặc ghi chú là đang chạy. DB nháp đặt trên ổ Linux (`/mnt/e` chậm).
- Mỗi lần đo chạy ≥ 60 giây, bỏ 10 giây đầu (khởi động, JIT); chạy 3 lần, lấy trung vị. Muốn chắc hơn thì cho bot chạy ở máy khác trong LAN.

### 3.3 Chỗ có thể nghẽn (suy luận từ mã, chờ số đo xác nhận)

| Chỗ | Mã | Vì sao | Cách sửa thường dùng |
|---|---|---|---|
| Đạn / chiêu diện rộng xét mọi actor | `SkillEngine.ts` duyệt `port.combatants()` (= mọi `sims` của bản đồ) ở 5 chỗ; `targeting.ts nearest` cũng duyệt hết | Chi phí ≈ số đạn × số actor mỗi tick | Lưới không gian (chia ô), chỉ xét ô gần |
| Gửi mọi actor cho mọi client | Schema `actors` của MapRoom | Byte + mã hóa tăng theo người × người | Interest management `StateView` (BACKLOG **HT5**) |
| Lưu nhân vật trong tick | `MapRoom.tick` mỗi 10 s lưu mọi người chơi | Gây gai p99 mỗi 10 s khi đông | Rải lưu qua nhiều tick / ngoài tick |
| Ghi cả file DB | `account/db.ts` ghi lại toàn bộ JSON | Đo trước: 1000 nhân vật ≈ 16 ms, 5000 ≈ 63 ms mỗi lần | Ghi từng bản ghi (SQLite, BACKLOG **HT6**) khi số đo cần |

**Redis không phải lời giải cho nghẽn một luồng** (người dùng hỏi 2026-11-13): Redis không chạy logic game. Tách di chuyển / PK /
sát thương ra nhiều tiến trình thì phải đồng bộ trạng thái mỗi tick qua mạng, còn chậm hơn. Cách chia tải đúng là **theo bản đồ**
(room ở nhiều tiến trình, Redis presence điều phối tổ đội / online / chat), và chỉ làm khi số đo cho thấy một nhân CPU không đủ (HT6).

## 4. Thứ tự (BACKLOG §10)

Phần 1 (xong): BT2 API + trang → BT3 AutoPlay dùng chung → BT4 runner theo kịch bản.
Phần 2: BT1 số đo server + `/api/dev/perf` → trang `/?perf` + `npm run perf` → kịch bản đo / tìm ngưỡng → BT5 baseline → BT6 sửa chỗ
nghẽn theo số đo → BT7 đám đông quanh một người chơi trình duyệt cho PF1.
