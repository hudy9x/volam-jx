# Phượng Tường và 40 bãi luyện công cấp 10–200

Người dùng chốt ngày 2026-11-13: dùng cả Luyện công và Hang động, phân bổ lại cấp quái 10–200. Tên và hình bản đồ lấy từ client gốc; cấp quái dưới đây là cấu hình riêng của project, không phải cấp được trích từ client.

Thêm thành **Phượng Tường (ID 1)**, an toàn, không sinh quái. Giữ Biện Kinh (37), Dược Vương Cốc (140). Sau khi sinh đủ, danh sách có 43 bản đồ: Phượng Tường, Biện Kinh, Dược Vương Cốc và 40 bãi mới.

| Cấp quái | Bãi thứ nhất | Bãi thứ hai |
|---|---|---|
| 10–19 | Hoa Sơn (2) | Kiếm Các Tây Bắc (3) |
| 20–29 | Kiếm Các Tây Nam (19) | Kim Quang động (4) |
| 30–39 | Kiếm Các Trung Nguyên (43) | Vũ Lăng sơn (70) |
| 40–49 | Điểm Thương sơn (167) | Kinh Hoàng động (5) |
| 50–59 | Bạch Vân động (22) | Hưởng Thủy động (24) |
| 60–69 | Thục Cương sơn (92) | Thanh Thành sơn (21) |
| 70–79 | Hoành Sơn Phái (56) | Phục Ngưu Sơn Tây (41) |
| 80–89 | Mãnh Hổ động (14) | Miêu Lĩnh (74) |
| 90–99 | Phục Ngưu Sơn Đông (90) | Nhạn Đãng sơn (195) |
| 100–109 | Thần Tiên động (23) | Tỏa Vân động (6) |
| 110–119 | Trúc Tơ động tầng 1 (26) | Trúc Tơ động tầng 2 (27) |
| 120–129 | La Tiêu sơn (179) | Vũ Di sơn (193) |
| 130–139 | Thanh Loa đảo (68) | Hoàng Hà Nguyên Đầu (122) |
| 140–149 | Thiết tháp tầng 1 (38) | Trúc Tơ động tầng 3 (28) |
| 150–159 | Tần Lăng (7) | Thiết tháp tầng 2 (39) |
| 160–169 | Thất Sát động (50) | Thiết tháp tầng 3 (40) |
| 170–179 | Sa mạc địa biểu (224) | Phong Lăng độ (336) |
| 180–189 | Tiến Cúc động (93) | Lâm Du Quan (319) |
| 190–199 | Vi sơn đảo (342) | Chân núi Trường Bạch (320) |
| 200 | Mạc Cao Quật (340) | Mạc Bắc Thảo Nguyên (341) |

Cấu hình chỉnh tay: `packages/shared/src/maps/training-levels.ts`. `gen-spawns.ts` ưu tiên bảng này, giữ cấp trong khoảng đã chọn và có một khu quái ở đúng cấp đầu của mốc để Auto nhận diện bãi. Số lượng quái, loại quái theo chủ đề và thời gian hồi sinh vẫn theo cơ chế hiện có. File spawn `auto: false` vẫn được bảo vệ, không tự ghi đè.

## Sinh lại trên máy này

```sh
export JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT
npm run gen:maps -w @vltk/client -- --skip-existing 1 2 3 19 4 43 70 167 5 22 24 92 21 56 41 14 74 90 195 23 6 26 27 179 193 68 122 38 28 7 39 50 40 224 336 93 319 342 320 340 341
npm run gen:spawns -w @vltk/client -- 2 3 19 4 43 70 167 5 22 24 92 21 56 41 14 74 90 195 23 6 26 27 179 193 68 122 38 28 7 39 50 40 224 336 93 319 342 320 340 341
npm run gen:skills -w @vltk/client
npm run gen:assets -w @vltk/client
```

Các generator tự cập nhật manifest cache. Không sửa tay `catalog.gen.ts` hoặc `public/assets/`. Server đọc lưới đi lại theo bản đồ khi cần; client tải vùng đang xem. Tài nguyên dùng chung cho Web/Desktop/Mobile, chưa kiểm chứng wrapper Desktop/Mobile thực tế. Máy mới cần sinh hoặc chép đúng các gói bản đồ tương ứng.
