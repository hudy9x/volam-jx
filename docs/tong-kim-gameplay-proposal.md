# Tống Kim cao cấp — phương án gameplay để duyệt

> **2026-11-14 · ĐỀ XUẤT, CHƯA ĐƯỢC DUYỆT TRIỂN KHAI.**
> USER cho phép agent tự thiết kế phần thiếu dữ liệu đối chiếu, để người dùng duyệt trước khi viết code. Mục tiêu bắt buộc: **PK được, có danh hiệu, dùng được vật phẩm, có Nguyên soái với nhiều kỹ năng mạnh**.
> Dữ liệu SHXT đã xác minh tiếp tục được giữ; mọi luật/số cân bằng tự chọn trong tài liệu này mang nhãn **CHỌN**. Không tuyên bố đây là bản tái hiện server SHXT 1:1.

## 1. Phương án đề nghị

1. **Bảo vệ Nguyên Soái:** có PK tự do giữa hai phe, lính bảo vệ doanh và mục tiêu công–thủ cuối trận.
2. **Quân trạng và năm danh hiệu:** hạ địch/hỗ trợ để lên quân hàm; thưởng máu/kháng theo nền skill 661 đã có dấu vết SHXT.
3. **Quân Nhu dùng thật:** 18 Hoàn, Chiến Cổ, Lệnh Bài, Kháng Đơn Chi Giác, Hiệu Phù và năm lệnh bẫy gốc; mua, nhặt, dùng và hết hạn đầy đủ.
4. **Nguyên soái sáu nhóm chiêu:** đánh gần, đánh xa, lôi, mưa lửa, triệu binh, chiến ý; có giai đoạn cuồng nộ và báo trước chiêu mạnh.

Đây là phạm vi triển khai cao cấp trọn vòng chơi. Cờ, các thể thức khác, danh hiệu tuần, đổi điểm lấy EXP và nhóm vật phẩm phụ không nằm trong phiên bản này. Không cần hoàn thiện toàn bộ SK0 để có Tống Kim; dựng bộ quản lý vòng đời tối thiểu có thể dùng lại.

## 2. Bản đồ, báo danh và sảnh chờ

| Nội dung | Phương án |
|---|---|
| Cấp tham gia | **Từ 90**, theo script Chiêu Thư PAK; giới hạn cấp toàn game vẫn 200 |
| Điểm báo danh | **Map 325**, hai khu Tống/Kim; dùng hình và điểm đến từ SHXT |
| Sảnh chờ | Khu an toàn tách biệt theo phe tại 325; có NPC, bảng trận, cửa hàng và vị trí tập kết; hàng đợi hiển thị số thứ tự |
| Bản đồ chiến đấu đầu tiên | **328 Bình nguyên cao cấp**, tận dụng MapInfo đủ Hậu doanh/Đại doanh/cổng/soái |
| Vào khu báo danh | Xa phu tại thành có lựa chọn **Đến điểm báo danh Tống Kim**; hoặc Tống Kim Chiêu Thư. Cả hai chỉ đưa đến 325, không cấp quyền chiến đấu |
| NPC tại 325 | **Mộ Binh Quan Tống / Mộ Binh Quan Kim**, **Quân Nhu Quan**, **Quân Y**; vị trí dùng điểm đi lại hợp lệ gần khu đến của mỗi phe, chốt trên ảnh/nav khi dựng |
| Phí đăng ký | **3000 lượng/lần đầu trong trận**; không thu lại khi reconnect/vào lại cùng trận; chỉ trừ khi thực sự nhận được chỗ vào trận |
| Hai phe | Được chọn phe, giữ nguyên suốt trận, kể cả rời vào lại; tổ đội bên ngoài không quyết định phe |
| Sức chứa | **32 người/phe**,64 người thật trong vùng chiến đấu; chưa tự sinh bot để lấp chỗ |
| Cân bằng | Khi nhận người mới vào chiến đấu, sau khi nhận chênh lệch tối đa 2 người. Phe đông/đầy vào hàng đợi FIFO theo phe; không mất phí nếu chưa được nhận |
| Một trận mỗi tầng | Khóa toàn server từ báo danh tới dọn xong. Cao cấp chỉ có một `matchId`; sơ/trung tắt và để sau |

Luồng: thành → điểm báo danh 325 → đăng ký/chờ theo phe → được nhận vào Hậu doanh 328 → qua cổng phe mình → Đại doanh và giao chiến. Đăng ký khi đang báo danh chỉ giữ suất chờ; đến chuẩn bị mới đưa vào Hậu doanh, trừ trường hợp vào muộn khi trận đã đánh.

**Đối với thử nghiệm ít người:** không yêu cầu số người tối thiểu để mở; 1v1 vẫn chơi được. Cân bằng chỉ áp dụng người mới; không đá ai ra khi phe kia rời. Khi không còn ai, đồng hồ trận vẫn chạy. Bấm mở trong lúc cao cấp đang bận chỉ trả trạng thái hiện tại, không tạo trận mới.

Phép chuyển tọa độ, ranh giới vùng/cổng và ánh xạ Area 1/2↔Tống/Kim phải kiểm tra bằng ảnh/nav. Không copy nguyên tọa độ NPC chưa chuẩn hóa. Map logic 325/328 phải tồn tại riêng dù dùng lại tài nguyên 323/326.

## 3. Thời gian và vòng đời

Tất cả thời điểm theo đồng hồ server. Mốc dưới đây **CHỌN**, thay phần chưa tìm được script điều phối:

| Giai đoạn | Mặc định | Hành vi |
|---|---|---|
| Báo danh | **10 phút** | Đăng ký/chọn phe; ở sảnh chờ, mua thuốc/Quân Nhu, không PK |
| Chuẩn bị | **1 phút** | Nhận người theo sức chứa/cân bằng, chuyển vào Hậu doanh; cổng ra trận khóa |
| Giao chiến | **60 phút** | Mở cổng, bật PK theo phe; lính xuất hiện ngay; **hai Nguyên soái xuất hiện phút 30** |
| Kết thúc | **2 phút** | Khóa gây hại, chốt thưởng một lần, hiện chiến báo, có nút về thành; hết 2 phút tự trả về |

Có lệnh quản trị **Mở báo danh ngay** hoặc đặt giờ mở bất kỳ; không tự mở trận mới khi người đầu tiên đến. Các thời lượng là cấu hình dễ chỉnh **trước trận** để thử nhanh; cấu hình được chụp lúc mở, không thay luật/đồng hồ giữa trận. Không phát quà lần đầu lại khi đổi thời lượng hoặc khởi động lại.

Nhận đăng ký mới đến hết **phút 45 giao chiến**; người đã có tư cách trận được reconnect tới khi trận đóng. Người vào trận đang đánh đợi 5 giây tại Hậu doanh trước khi ra cổng. Rời hàng đợi được ngay, chưa tham chiến thì không trừ phí.

## 4. PK, vùng an toàn và hồi sinh

- Phe Tống/Kim quyết định mọi quan hệ tấn công/hỗ trợ cho người, lính, soái và quân triệu hồi. Khác tổ đội nhưng cùng phe vẫn là đồng minh; cùng tổ đội nhưng khác phe vẫn là địch.
- Giữ công thức sát thương/ngũ hành/trúng né hiện tại. Người đánh người tiếp tục hệ số PK 0.5; không chuẩn hóa cấp/trang bị. Người 90 vào vẫn dùng nhân vật 90 của mình; lính và quân hàm giúp họ có việc đóng góp, không hứa cân bằng với cấp 200.
- Sảnh chờ và Hậu doanh là vùng an toàn hai chiều: không gây/nhận sát thương, không bùa hại, không đặt bẫy hoặc đánh xuyên cổng. Địch không được vào Hậu doanh; Đại doanh có thể bị công phá.
- Chết: **không mất EXP/tiền/trang bị/quân trạng**, không tăng sát khí. Sau **10 giây** tự hồi sinh Hậu doanh, đầy HP/MP; có bảo vệ **5 giây**, chủ động tấn công/đặt bẫy sẽ hủy bảo vệ. Trong bảo vệ không phát chiêu gây hại hay hiệu ứng hỗ trợ cho người đang đánh.
- Xóa độc, bùa hại và trạng thái điều khiển khi chết. Bùa kỹ năng thông thường theo quy trình hồi sinh hiện có; hào quang ô tay được bật lại. **Buff Quân Nhu còn thời hạn giữ qua chết**, đồng hồ vẫn chạy; quân hàm giữ đến hết trận.
- Khinh công tiếp tục không nhận sát thương khi đang bay theo quyết định chung project. Không tạo ngoại lệ xuyên miễn thương cho soái.
- Thuốc thường dùng theo luật hiện tại; Quân Y bán danh sách thuốc của project, không cấp vô hạn hay hoàn lại thuốc đã uống.
- Vào trận xóa bùa tạm từ ngoài chiến trường, tính lại aura theo phe mới; không xóa đồ hay chỉ số trang bị. Ra trận xóa buff/debuff/đạn/bẫy/triệu hồi đặc thù chiến trường.
- Trong trận tạm dừng Auto đổi bãi/về thành, chặn Xa phu/Thổ Địa Phù và lệnh bài tăng cấp/đổi phái/giới/tẩy điểm. Vẫn cho đánh tự động mục tiêu hợp lệ và uống thuốc. Có nút **Rời chiến trường** riêng, chỉ rời khi sống, ngoài giao tranh 10 giây; chết phải đợi hồi sinh.
- Người chủ động rời trở về thành nơi xuất phát (mặc định Biện Kinh nếu nguồn không hợp lệ); lúc kết thúc hồi đầy HP/MP ở thành. Không khôi phục bản chụp hành trang/tiền/thuốc trước trận.

## 5. Điểm quân trạng, công hỗ trợ và danh hiệu

### 5.1. Điểm hạ mục tiêu

| Mục tiêu | Điểm cơ sở P |
|---|---:|
| Binh sĩ / Hiệu úy / Thống lĩnh / Phó tướng / Đại tướng NPC | **50 /100 /150 /200 /250** |
| Người chơi Binh sĩ / Hiệu úy / Thống lĩnh / Phó tướng / Đại tướng | **150 /300 /450 /600 /750** |
| Nguyên soái | **5000** |
| Lính được triệu hồi bởi người chơi hoặc soái | **0**, không rơi đồ/EXP; tránh nuôi quân để farm |

Chỉ ghi sát thương hợp lệ, thực sự trừ HP, không tính overkill, phản hồi giả hoặc đánh đồng minh. Một mục tiêu chết chỉ xét một lần.

- Kết liễu bởi người chơi: người đó nhận P. Nếu NPC kết liễu: người gây nhiều sát thương hợp lệ nhất trong **15 giây** trước chết nhận P; không có người góp thì không phát điểm cá nhân hoặc điểm phe.
- Hỗ trợ thường: những đồng minh khác có ít nhất 10% tổng sát thương từ người chơi trong 15 giây cuối chia thêm **20%P** theo tỷ trọng. Không phát điểm hỗ trợ chỉ vì đứng gần/cùng đội.
- Với Nguyên soái: **20%P cho người kết liễu**,80%P chia theo sát thương có hiệu lực của toàn bộ người phe địch trong lần sống của soái; không tạo thêm quỹ hỗ trợ 20%. Nếu NPC kết liễu, phần 20% cho người góp nhiều nhất. Tất cả 5000 điểm được phân bổ chính xác bằng quy tắc phần dư lớn nhất, hòa chọn `charId`.
- Tổng điểm phe chỉ tăng **P** mỗi lần chết hợp lệ, không cộng thêm quỹ hỗ trợ. Điểm cá nhân có thêm hỗ trợ nên tổng các cá nhân có thể khác tổng phe; giao diện ghi rõ.
- Hai nhân vật bất kể ai giết ai chỉ sinh điểm PK **một lần/120 giây** cho cùng cặp; vẫn đánh/chết bình thường, nhưng lần lặp không cho điểm, tích lũy hay hỗ trợ. Không có điểm liên trảm riêng ở bản đầu.

### 5.2. Năm danh hiệu trong trận

Dùng nền công thức skill 661 từ PAK, **CHỌN** ánh xạ quân hàm sang cấp trạng thái 1–5 và mốc điểm:

| Quân hàm | Quân trạng từ | Sinh lực tối đa cộng | Kháng mọi loại cộng |
|---|---:|---:|---:|
| **Binh sĩ** | 0 | **20%** | 0 điểm |
| **Hiệu úy** | 1000 | **30%** | 5 điểm |
| **Thống lĩnh** | 3000 | **40%** | 10 điểm |
| **Phó tướng** | 6000 | **50%** | 15 điểm |
| **Đại tướng** | 10000 | **60%** | 20 điểm |

Cộng vào túi thuộc tính, còn chịu trần kháng hiện có; không tăng kháng tối đa. Không nhân thêm sát thương/tốc đánh theo quân hàm. Thăng hàm không hồi máu: giữ HP hiện tại, chỉ cập nhật HP tối đa. Cấp trạng thái quân hàm được giữ chủ động đến hết trận, không tự mất sau thời hạn mặc định 5 phút của Lua.

Hiện **[Tống · Thống lĩnh]** hoặc **[Kim · Đại tướng]** trên đầu, ở bảng người chơi và chiến báo; báo thăng hàm riêng. Danh hiệu có tác dụng trong trận, ra ngoài mất buff; lịch sử vẫn lưu cấp hàm và thành tích. Chưa có danh hiệu tuần hoặc buff vĩnh viễn.

### 5.3. Ba sổ điểm và phần thưởng

- **Quân trạng trận:** lên danh hiệu, xếp hạng; mua đồ không trừ; chết không trừ; trận sau reset 0.
- **Điểm phe:** tính kết quả; người rời/offline không mang điểm phe đi; không trừ do mua hoặc thưởng.
- **Điểm tích lũy cá nhân:** mỗi điểm quân trạng hợp lệ nhận thêm 1 điểm tích lũy để mua Quân Nhu, lưu qua trận; tiêu không làm tụt danh hiệu.

**Quà lần đầu mỗi nhân vật:**1000 điểm tích lũy, cấp khi được nhận vào trận lần đầu, có cờ đã nhận lưu bền. Đồ mua gắn nhân vật nên không chuyển quà sang tài khoản khác. Không phát lại do reconnect/chết/trận mới.

Thưởng kết thúc: có ít nhất **300 quân trạng** và **5 phút ở vùng chiến đấu trong thời gian giao chiến**, không tính sảnh/Hậu doanh, nhận thêm **1000/500/750 điểm tích lũy** tương ứng thắng/thua/hòa. Người đã được xét đủ điều kiện vẫn nhận khi offline hoặc rời trước lúc chốt, nhưng không đổi phe. Xếp hạng theo quân trạng giảm dần → hạ người nhiều hơn → chết ít hơn → đạt điểm cuối sớm hơn → `charId`. Lưu lịch sử trận và hiện Top 10; chưa phát thêm đồ/EXP theo thứ hạng.

Các khoản cộng, quà, kết quả và mua có dấu nhận bền chống xử lý hai lần. Server dừng bất thường: hủy trận đang đánh, không phát thưởng thắng/thua; giữ đồ đã mua, tiêu hao thật và điểm đã ghi bền. Lần vào lại đưa về thành, không để nhân vật kẹt trong trận đã mất.

## 6. Lính và mục tiêu trên bản đồ

Mỗi phe **20 NPC thường trực**, xuất hiện khi mở giao chiến:

| Bậc | Số lượng/phe | Cấp | HP ban đầu | Vị trí/hoạt động |
|---|---:|---:|---:|---|
| Binh sĩ | 10 | 90 | 50000 | Hai tuyến từ Đại doanh ra trung tâm; tuần tra/truy đuổi trong tuyến |
| Hiệu úy | 4 | 100 | 80000 | Chốt hai đường ra/vào |
| Thống lĩnh | 3 | 120 | 150000 | Ngoài Đại doanh |
| Phó tướng | 2 | 140 | 300000 | Cận vệ ngoại vi khu soái |
| Đại tướng | 1 | 150 | 600000 | Chốt bảo vệ trước khu soái |

HP là **CHỌN** riêng chiến trường, không thay các bãi luyện. Sát thương cơ sở lấy đường cong quái theo cấp × 3; skill từ dữ liệu NPC chiến trường tương ứng, cấp 20; mỗi NPC một chiêu chủ lực phù hợp. Kháng 25 điểm, theo công thức hiện tại; độ chính xác/né lấy đường cong theo cấp, không tự biến thành đòn chắc trúng.

Lính tái sinh **30 giây** sau chết, đúng điểm đã cấu hình; truy đuổi tối đa 600 đơn vị từ vị trí chốt/điểm tuần tra, ra ngoài thì trở về. Không vào Hậu doanh và không đuổi xuyên map. Không rơi EXP/tiền/đồ luyện công; chỉ quân trạng và cơ hội rơi Quân Nhu (§7).

Khi chọn dòng NPC phải khớp phe/hình/skill, không chọn chỉ theo tên. Các vị trí nằm trên nav và không chồng cổng/điểm hồi sinh. Không dùng bảng spawn luyện công để tự sinh thêm quái thường/boss màu vào chiến trường.

## 7. Quân Nhu có thể mua, nhặt và sử dụng

### 7.1. Danh mục phiên bản đầu

| Nhóm | Món | Giá tích lũy |
|---|---|---:|
| Hoàn tấn công | Ngoại Phổ/Độc/Băng, Nội Phổ/Độc/Băng/Hỏa/Lôi | **200/món** |
| Hoàn sinh tồn | Trường Mệnh, Gia Bào, Cao Thiểm, Cao Trung, Phổ/Băng/Lôi/Hỏa/Độc Phòng | **150/món** |
| Hoàn tốc đánh | Phi Tốc | **200/món** |
| Hiệu lệnh | Chiến Cổ, Lệnh Bài, Kháng Đơn Chi Giác | **400/món** |
| Triệu binh | Binh Sĩ Hiệu Phù | **300/món** |
| Lệnh bẫy | Xuyên Tâm, Độc Thích, Hàn Băng, Địa Hỏa, Lôi Kích | **1000/món có 50 lượt** |
| Đi tới báo danh | Tống Kim Chiêu Thư, dùng một lần | **1000 lượng**, bán ở tiệm tạp hóa; Xa phu đến 325 là lựa chọn không cần Chiêu Thư |

**18 Hoàn +3 hiệu lệnh +1 Hiệu Phù +5 lệnh bẫy =27 món chiến đấu**, cộng Chiêu Thư thành 28 định nghĩa; không còn gọi là “26 món”. Cửa hàng chỉ hiện món đã có tác dụng hoàn chỉnh. Cờ Hiệu, nhóm Chiến Hồn/Hộ Giáp/Lợi Nhận, Càn Khôn Tạo Hóa Đan và đồ phụ để giai đoạn sau.

Giá trên là **CHỌN**. Giá trị hiệu ứng/skill/cấp/thời hạn dùng PAK đã ghi tại [tài liệu nguồn](tong-kim-battlefield.md#82-18-hoàn-đã-truy-được-lệnh-dùng-trong-pak). 18 Hoàn và hiệu lệnh 180 giây; không thay thành phần trăm của sát thương cuối hoặc tốc đánh thực. Kháng Đơn Chi Giác trừ 20 điểm phản đòn, không nhân 0,8; chỉ số sau giảm không thấp hơn 0, không biến thành hồi máu khi nhận đòn.

### 7.2. Điều kiện và cộng dồn

- Quân Nhu Quan ở sảnh chờ và Hậu doanh phe mình; mua khi sống và trong 180 đơn vị. Cho xem hàng ở xa nhưng server chỉ nhận mua gần NPC.
- Mua 1–50 món/lần, kiểm tra điểm và chỗ chứa, gộp chồng trước khi tìm ô mới.18 Hoàn/hiệu lệnh/Hiệu Phù chồng 50; lệnh bẫy mỗi món có UID và 50 lượt, không chồng.
- Đồ chiến đấu gắn nhân vật khi mua/nhặt; không bán, vứt hay chuyển cho người khác; để tránh gom quà miễn phí. Lưu qua các trận, không xóa số lượng chưa dùng khi hết trận. Chiêu Thư đi theo vật phẩm tiêu hao thông thường.
- Chỉ dùng khi đang giao chiến, sống và đủ tư cách. Hoàn cá nhân dùng được ở Hậu doanh; hiệu lệnh, triệu binh và bẫy chỉ dùng ngoài vùng an toàn, không dùng trong bảo vệ hồi sinh.
- Cùng loại làm mới thời hạn, không cộng thêm hiệu lực. Khác thuộc tính cộng theo túi thuộc tính; Hoàn Gia Bào và Lệnh Bài tăng cùng chỉ số chạy lấy mức cao nhất, Phi Tốc và Lệnh Bài tăng cùng chỉ số tốc đánh/cast lấy cao nhất. Danh hiệu/Chiến Cổ/Hoàn kháng khác nguồn cộng, vẫn chịu trần.
- Máu tối đa: % từ quân hàm/Chiến Cổ cộng vào cùng nhóm% rồi áp dụng công thức nhân vật; Trường Mệnh +500 là phần cộng phẳng theo công thức chung. Tăng trần không tự hồi HP; hết buff chỉ cắt HP xuống trần mới, không giết người hay tạo hồi máu bằng dùng lại.
- Hiệu lệnh chọn người chơi cùng phe/khác phe theo loại; không buff lính/soái. **CHỌN phạm vi tác dụng cuối 400 đơn vị** cho Chiến Cổ/Lệnh Bài, **470** cho Kháng Đơn Chi Giác, không lan tiếp. Đây là lựa chọn triển khai dựa tầm bảng, không khẳng định đã tái hiện chuỗi missile gốc chính xác.
- Không có hồi dùng chung giữa các món; cùng món chống bấm lặp bằng cửa sổ xử lý 250 ms. Máy chủ trừ đúng 1 món/lượt thành công; không trừ khi lệnh bị từ chối. Tooltip mô tả thời gian và giới hạn rõ.

### 7.3. Hiệu Phù và bẫy

**Hiệu Phù:** gọi 2 lính cấp 90 theo dữ liệu gốc, tồn tại 60 giây hoặc tới khi chết/hết trận/chủ rời. Tối đa 4 lính đang sống/người,20 lính triệu hồi/phe; đủ giới hạn thì từ chối và không trừ món. Lính bảo vệ quanh chủ, không truy đuổi xa quá 600, không vào vùng an toàn; không có điểm/rơi đồ khi bị hạ.

**Năm lệnh bẫy:** dùng skill gốc 343/303/345/347/349 cấp 30 bằng cùng SkillEngine; mỗi lần đặt thành công trừ 1 trong 50 lượt, hết lượt mới mất món. Đặt dưới chân trên nav, ngoài vùng an toàn, thời gian tối thiểu giữa hai lần đặt cùng người **1 giây**. CHỌN tồn tại **30 giây**, tối đa **5 bẫy/người,50/phe**; đạt trần thì từ chối, không mất lượt. Bẫy nổ vào kẻ địch gồm người/lính/soái; không ảnh hưởng đồng minh. Phe mình thấy bẫy, địch không thấy cho đến khi kích hoạt. Bán kính/sát thương/hit/status của bẫy theo missile/skill gốc, không đặt chung 90 px hoặc tự thêm choáng. Dọn bẫy khi chủ rời/hết trận; chết không xóa bẫy đã đặt.

### 7.4. Rơi Quân Nhu

Lính thường trực có tỷ lệ rơi 1 món: **1/3/5/8/12%** theo năm bậc; chọn đều trong 22 món tiêu hao gồm 18 Hoàn+3 hiệu lệnh+Hiệu Phù, không rơi lệnh 50 lượt hoặc Chiêu Thư. Soái không rơi đồ luyện công/Hoàng Kim; thưởng điểm đã đủ rõ, không thêm loot boss ở bản đầu.

Dùng luật đồ rơi chung project: tồn tại **60 giây**, **20 giây đầu** người được tính công hạ mục tiêu và đồng đội **cùng phe** được nhặt; sau đó mọi người tham chiến đều nhặt được. Nếu không có người được tính công thì không tạo drop. Đầy túi không xóa drop, không mất điểm; không tự gửi đồ vào một kho mới.

## 8. Nguyên soái — mục tiêu mạnh, đánh được và có thể né chiêu

### 8.1. Chỉ số và hành vi chung

Mỗi phe có 1 soái xuất hiện phút 30, trên `generalpos` PAK của phe tương ứng, thông báo trước **60 giây** và khi xuất hiện. Hình Tống/Kim lấy NPC soái gốc, không dùng hình boss khác.

**CHỌN ban đầu:** cấp 200, **6 triệu HP**, sát thương cơ sở **1200–1800**, chính xác **20000**, né **2000**, kháng 5 loại **50 điểm**. Không nhân thêm hệ số boss× 12 lên 6 triệu, không hưởng quân hàm/Quân Nhu/aura người chơi. Không tự thay máu theo số người online giữa trận.

- Chọn mục tiêu đe dọa: tổng sát thương nhận từ người trong 15 giây gần nhất, xét lại mỗi 2 giây; người đứng xa ngoài tầm thì tiếp cận trong khu bảo vệ, không đuổi vô hạn.
- Phạm vi giữ doanh **800 đơn vị** từ điểm sinh; vượt thì ngừng ra chiêu, quay về và không nhận/gây hại khi quay về. Về tới nơi xóa bẫy/độc trên soái, hồi đầy và reset sổ đóng góp, mở đợt đánh mới. Không hồi máu thụ động khi đang giao chiến; thả mục tiêu 5 giây thì bắt đầu quay về.
- Miễn choáng/chậm/co giật để tránh khóa boss vĩnh viễn; vẫn nhận sát thương độc theo trần hiện có. Không có phản đòn bẩm sinh, không chí tử dạng lấy % HP nạn nhân, không hút HP/MP từ kỹ năng vay để hồi vô hạn. Đây là cấu hình riêng soái, không đổi chiêu của người chơi.
- Không tự chết vì bị kéo ra địa hình hoặc rơi khỏi nav. Không vào Hậu doanh; không đánh xuyên tường/cổng/vùng an toàn.

### 8.2. Sáu nhóm kỹ năng

Tên chiến thuật trong bảng dùng cho cảnh báo; nơi dùng hình/đạn gốc vẫn giữ danh tính kỹ năng nguồn. Các skill dùng cấp 20 qua SkillEngine, bộ lọc phe chiến trường; không gọi thẳng “trừ HP” từ AI.

| Chiêu | Tác dụng | Nhịp ban đầu |
|---|---|---|
| **Phá Quân** | Đánh chính diện/cận chiến; Tống dùng **Thiên Hạ Vô Cẩu 359**, Kim dùng **Vân Long Kích 361** | Hồi 3 giây, báo hướng 0,6 giây |
| **Long Hỏa / Lưu Tinh** | Đánh mục tiêu xa và người tụ quanh; Tống dùng **Phi Long Tại Thiên 357**, Kim dùng **Thiên Ngoại Lưu Tinh 362** | Hồi 8 giây, báo vị trí 1 giây, khóa điểm ngắm khi bắt đầu báo |
| **Lôi Động Cửu Thiên** | Dùng **375**, đánh vùng có nhiều địch; gây lôi sát, hiệu ứng theo chuỗi skill nguồn | Hồi 18 giây, báo 1,8 giây |
| **Hỏa Vũ Liên Hoàn** | Ba lần gọi **Thiên Ngoại Lưu Tinh 362** vào ba vị trí địch khác nhau chụp lúc báo; cách lần 0,4 giây | Hồi 20 giây, báo 1,5 giây; mở khi HP ≤60% |
| **Hiệu Triệu Cận Vệ** | Gọi 2 cận vệ cấp 150, HP 150000, tồn tại 45 giây, tối đa 4 quân của mỗi soái; không quân trạng/loot | Hồi 45 giây; lần đầu sau 10 giây bị đánh; báo 2 giây |
| **Chiến Ý Bất Khuất** | Khi lần đầu qua ngưỡng 60% và 30% HP: giảm 20% sát thương nhận trong 8 giây; không hồi máu, không bất tử | Mỗi ngưỡng chỉ 1 lần; hiện icon/thời hạn |

**Ba giai đoạn:** trên 60% đánh thường; 60–30% mở Hỏa Vũ và sát thương× 1.15;≤30% sát thương× 1.25 và thời gian hồi các chiêu tấn công× 0.8. Hệ số× 1.15/× 1.25 thay thế nhau, không nhân chồng; không rút thời gian báo chiêu.

Soái chỉ thực hiện một động tác tại một thời điểm; có nhịp nghỉ toàn cục tối thiểu **2 giây** sau khi thực hiện chiêu, vẫn tôn trọng khóa hoạt cảnh. Mỗi lần chọn chỉ một chiêu đến hạn; không tung tất cả chiêu cùng tick. Chiến Ý là phản ứng theo ngưỡng, không chen thêm đòn sát thương. Cả hai phe dùng cùng ngân sách HP/phòng thủ/nhịp; sức mạnh 357/359 và 361/362 được chỉnh riêng hệ số trong tuning để không lệch phe.

Vùng báo màu rõ, có viền/hình và âm thanh tùy mức âm lượng, không chỉ dựa đỏ/xanh. Sát thương vùng lấy vị trí đã khóa, không bám người đến sát lúc nổ. Tầm ảnh hưởng đúng dữ liệu skill, vùng báo phải bao toàn bộ vùng có thể trúng. Hỗ trợ Web/Desktop/Mobile, đứng ngoài vùng hoặc Khinh công đúng lúc đều tránh được; không đánh xuyên miễn thương.

### 8.3. Mục tiêu cân bằng khi nghiệm thu

Các số trên là điểm xuất phát để đo, không hứa rằng chỉ nhập chúng là boss đã cân bằng:

- Đội **6–10 nhân vật cấp 150**, bộ Hoàng Kim đúng phái và chiêu 20, chơi phối hợp, hạ soái khoảng **3–5 phút** nếu không bị người phòng thủ cản.
- Một nhân vật tham chiếu cấp 150 đầy máu, kháng 75, không buff Quân Nhu/quân hàm, không chết bởi một lượt Phá Quân/Long Hỏa thông thường; mục tiêu sát thương sau phòng thủ mỗi lượt **10–25% HP**. Chiêu vùng lớn **25–40% HP** nếu đứng trọn, xét toàn bộ child/hit/độc của một lượt, không chỉ một viên đạn.
- Tình huống chí mạng và chồng chiêu cần đo riêng; không sửa thành sát thương% HP đích hoặc bỏ kháng chỉ để đạt tỷ lệ. Điều chỉnh damage/hệ số kỹ năng trong công thức riêng của soái, không đổi kỹ năng người chơi.
- Cả hai soái đánh cùng bộ mục tiêu tham chiếu có tổng sát thương 60 giây chênh không quá 10%. Nhóm 2–3 người khó hạ nhanh; một mình không nên giết được trong 5 phút.
- Không để tổ hợp khống chế khiến cả đội mất điều khiển liên tục; chiêu 375 theo gốc, nếu cần giảm hiệu ứng riêng soái thì ghi hệ số trong tuning và tooltip/giải thích, không đổi định nghĩa phái.

Tất cả giới hạn CC, bộ lọc thuộc tính, hệ số, HP, điểm, thời gian, giá/rơi gom vào `formulas/tuning.ts` nhóm TONG_KIM nhãn CHỌN/DATA/USER; phép tính riêng trong `formulas/battlefield.ts`. AI chỉ quyết định chiêu/mục tiêu/thời điểm, không viết công thức sát thương mới tại AI.

## 9. Thắng/thua và kết thúc

**CHỌN:** soái chết **không kết thúc ngay**, không tái sinh; cả hai phe vẫn PK tới hết giờ. Như vậy có thời gian phản công, không bị kết thúc bất ngờ khi đang giao chiến nơi khác.

Thứ tự xét ở hết 60 phút:

1. Chỉ một phe còn soái sống → **phe giữ được soái thắng**.
2. Cả hai soái cùng sống hoặc cùng chết → phe có **điểm phe cao hơn thắng**.
3. Điểm phe bằng nhau → phe có **số lần hạ người hợp lệ nhiều hơn thắng**.
4. Vẫn bằng nhau → **hòa**, không dùng thời gian đăng ký/ID người chơi để phân thắng.

Tick tới hạn kết thúc không nhận lệnh/hit mới tại hoặc sau `endAt`. Server giải quyết các sự kiện hợp lệ trước `endAt` rồi chốt, hủy phần còn lại; không phát thưởng trên client. Một sự kiện chết soái chỉ xử lý một lần và gắn thời điểm từ server.

Chiến báo hiển thị kết quả, soái sống/chết, điểm hai phe, số PK, quân trạng/hàm/kills/hỗ trợ/deaths của mình, Top 10 và số điểm tích lũy đã nhận. Từ đây rời ngay hoặc tự về thành sau 2 phút; không bắt người offline bấm Đồng ý mới cho mở trận sau.

## 10. Ra/vào, mất kết nối và chống lách luật

- Tư cách/rank/điểm/deaths/đã nhận quà theo `charId` + `matchId`. Lên cấp không đổi tầng; đổi phe không được trong cả hàng đợi lẫn trận đang tham gia.
- Mất kết nối khi đang chiến đấu: nhân vật còn trên server **10 giây**, đứng yên nhưng vẫn nhận đòn/độc; chết vẫn tính điểm và bắt đầu hồi sinh. Reconnect trước 10 giây gắn lại vào actor cũ, không nhân bản.
- Sau 10 giây offline rời actor; giữ tư cách/phe/điểm và thời hạn hồi sinh. Giữ chỗ 120 giây tính từ lúc mất kết nối; hết hạn giải phóng slot. Vào lại nếu đầy thì chờ đúng phe, không reset thiệt hại/hồi sinh để né PK.
- Rời chủ động/qua mất kết nối và quay lại đều có thời gian vào lại tối thiểu **30 giây** tính từ khi đã rời actor; nếu còn hồi sinh thì chờ mốc muộn hơn. Quay lại tại Hậu doanh, đầy HP/MP chỉ khi hết thời gian này; không dùng logout thay nút uống thuốc trong giao chiến.
- Sổ sát thương/ghi công dùng ID bền, xử lý độc hoặc lính kết liễu khi chủ/người góp offline theo cùng luật, không phụ thuộc session cũ.
- Không kick AFK tự động ở bản đầu; không cần hình phạt hoặc chế độ quan sát mới. Nếu chưa đóng phí/nhận suất thì sảnh chờ không tính thời gian tham chiến/thưởng.
- Đổi đồ/cộng điểm bình thường còn được, nhưng server tính lại buff từ nguồn cơ sở, không nhân chồng mỗi lần refresh. Khi chết/end/travel luôn đi qua cùng bộ kiểm tra tư cách/vùng/giai đoạn.

## 11. Các việc phải thực hiện khi được duyệt

1. **Nền trận và bản đồ:** hỗ trợ map logic 325/328 dùng chung tài nguyên, dựng NPC/sảnh/Hậu doanh/cổng, bộ quản lý một trận/tầng và mở trận theo giờ/lệnh.
2. **PK và danh hiệu:** quan hệ phe ở shared/server/client, vùng an toàn, hồi sinh/reconnect/ra vào, điểm/assist/rank và dữ liệu bền.
3. **Quân Nhu:** bộ sinh skill chiến trường còn thiếu (registry hiện chưa có 491/492/510/661), item/stack/charges, shop/nguồn nhận và đường dùng/phím 1–9. Không sửa tay `*.gen.ts`.
4. **Lính và soái:** spawn riêng, AI sáu nhóm chiêu/cảnh báo/phases/leash, giới hạn triệu hồi, hủy sát thương khi đóng trận. Skill gốc 433 chưa có trong registry; không dùng ID đó khi chưa sinh/kiểm tra.
5. **HUD/chiến báo và kiểm chứng:** typecheck/build; trình duyệt/cổng thử 2568/5174/DB riêng; kịch bản 1v1, hỗ trợ, khác phe cùng tổ đội, 32v32, soái chết/đồng thời/hết giờ, reconnect, mua đầy túi/dùng lặp, hết buff và nhận thưởng một lần. Thử thao tác chạm; chưa có wrapper native thì ghi giới hạn này.

Không cần đổi tốc độ/công thức toàn game theo nghiên cứu GP6 trong task khác để hoàn thành bản đầu. Tống Kim dùng công thức hiện hành; kiểm chứng cân bằng theo đúng bản hiện hành và ghi bộ chỉ số tham chiếu, để khi GP6 đổi có thể đo lại.

**Tiêu chí kết thúc:** có thể mở trận, báo danh/chờ/vào, PK, lên hàm, mua/nhặt/dùng đủ 27 món chiến đấu, soái thi triển đủ nhóm chiêu, hồi sinh, xét thắng và nhận thưởng/thoát đúng; giữ một trận cao cấp xuyên reconnect và không làm thay đổi gameplay bản đồ thường. Toàn bộ là phương án để USER duyệt, chưa là lệnh triển khai.
