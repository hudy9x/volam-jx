# Đề xuất băng cố định và đồng bộ bước chân

2026-11-16 — CHỈ ĐỀ XUẤT, chưa sửa code hoặc được duyệt triển khai. HEAD e349beb. Nguồn hiện trạng: docs/formulas/effects.md, docs/formulas/speed.md, formulas/speed.ts, systems/movement.ts, ActorView.ts và controlEffects.ts.

## Phương án chính

Khi đang băng và được phép di chuyển: vận tốc cố định60 đơn vị isometric/giây; chu kỳ bước chân2000ms, tương đương4FPS chuẩn trên8frame; sải băng120đơn vị/chu kỳ. Áp chung người/quái/BossXanh/HoàngKim, đi bộ/cưỡi ngựa. Đây là CHỌN, không phải số liệu SHXT. Không thay các preset/renderScale hoặc tốc bình thường.

Công thức: velocity = stride / cycleSeconds = 120 / 2 = 60. Không đặt75px/s và4FPS với sải120 vì sẽ lệch; nếu muốn75 thì sải băng phải150. Tất cả khoảng cách dùng isoDistance/stepToward, không phải pixel vật lý trên màn hình; hướng chéo và zoom không làm đổi tốc logic.

## Ý nghĩa FPS

Đề xuất cố định nhịp chu kỳ (4FPS chuẩn8frame), không khẳng định mọi sheet có cùng số ảnh/giây. Sprite8frame phát4ảnh/s, sprite16frame phát8ảnh/s, nhưng cả hai hoàn thành cùng một vòng trong2giây và đi cùng120đơn vị. Nếu bắt buộc mỗi sheet đúng4ảnh/s thì sheet16frame mất4giây/vòng: phải có sải riêng240 để cùng60đơnvị/s. Không đồng thời ép cùngFPS ảnh, cùngchu kỳ vàgiữ mọi frame với sốảnh khácnhau.

Đồng bộ chu kỳ và quãng đường là mục tiêu khả thi đầu tiên. Nó không bảo đảm tuyệt đối chân không trượt với mọi sprite: hình quái/ngựa có tỉ lệ, sốchân và cáchvẽ khác nhau; cần xem thật và có thể cân sải băng riêng sau. Sải riêng kéo theo chu kỳ riêng nếu muốn giữ cùng vận tốc, nên không tự áp thêm trong bản đầu.

## Đường xử lý dự kiến

Cấu hình duy nhất ở formulas/effects/tuning.ts: cold movement velocity60, referenceFrames8, fps4; stride120 được tính ra để tránh ba số độc lập lệch nhau. Hàm shared trả về velocity/runCycleMs cho trạng thái hiện tại.

Server: ưu tiên chết/choáng/hurt/khóa di chuyển → không di chuyển; nếu đang băng và có lệnh đi thì dùng vận tốc tuyệt đối60. Bỏ nhân tốc riêng của actor, distanceScale1,15, bonus giày/ngựa và hệ số AI đi lang thang trong nhánh băng. Không dùng moveFactor0,5 rồi nhân thêm60. Vẫn đi theo nav/collider/path và quyền hành động như cũ; không làm vật thể vốn không có khả năng di chuyển tự đi được.

Client: nhận chu kỳ2000ms từ server (hiện có nơi đọc runMs nhưng cần xác minh đầy đủ schema/protocol trước triển khai), hoặc trường đồng bộ tương đương. Phát vòng chạy theo chu kỳ này; bỏ coldLoopRate0,5 bổ sung cho vòng chạy khi băng. Áp cho chính mình lẫn người quan sát, mọi loại actor; đổi trạng thái không reset pha chân đột ngột. Đứng chờ không dịch chuyển và dùng nhịp đứng riêng, không coi idle là vòng bước. Giữ tint/độc/choáng hiện tại.

Hết băng: tính lại tốc từ trang bị/bùa/ngựa/cấp và trạng thái hiện tại, không khôi phục snapshot cũ. Trong lúc băng thay đồ hoặc lên/xuống ngựa vẫn giữ60; hết băng nhận tốc mới. Băng thêm chỉ gia hạn theo luật thời gian hiện tại, không chồng nhân tốc. Đối tượng có tốc bình thường dưới60 vẫn bị đặt60 khi được phép đi: đây là hệ quả của yêu cầu cố định tuyệt đối. Nếu muốn tránh tăng tốc phải đổi sang min(tốc hiện tại,60), khi đó60 là mức trần chứ không còn cố định cho mọi đối tượng.

## Phạm vi

Chỉ thay di chuyển và nhịp chạy. Tốc đánh/xuất chiêu vẫn dùng cơ chế băng hiện tại (tổng%×0,5 rồi chọn mốc); không khóa đánh về4FPS. Đứng chờ, chết, hurt, choáng và khinh công không bị gán chu kỳ chạy; cần kiểm rõ jump landing và trạng thái băng khi bay, không vô tình đổi vận tốc khinh công.

Kháng băng và giảm thời gian vẫn quyết định sát thương/thời gian theo luật hiện có; không cho kháng băng đổi mức60 hoặc nhịp2giây. Đề xuất75px/s/4FPS trước đây chưa triển khai; đây là phương án thay thế có quan hệ sải rõ ràng, chưa được duyệt.

## Kiểm chứng khi được triển khai

- Người/quái/Xanh/HoàngKim và cưỡi ngựa, tốc thường thấp/cao, đi đuổi/đi lang thang: cùng60 khi băng,2giây/vòng; tất cả hướng bằng khoảng cách isometric.
- Cùngđối tượng ở hai máy quan sát: vận tốc/nhịp giống nhau, không nhân thêm coldLoopRate; mạng trễ/nội suy/dừng tại đích không làm chân tiếp tục chạy.
- Nhận/hết/gia hạn băng; chồng choáng/hurt/chết/hồi sinh; đổi đồ/bùa/ngựa trong băng; đối tượng vốn chậm hơn60; không cho quái bất động tự di chuyển.
- Đo số ở server ít nhất10giây có đường đi đủ dài; ảnh/clip sprite thật8/12/16frame để kiểm chu kỳ và trượt chân, không chỉ khẳng định bằng công thức.
- test:effects, test:speed, typecheck/build, rồi game thật2568/5174; Web trước, cùnglogic Desktop/Mobile, chưa mặc định coi native/touch đã kiểm.
