---
name: shxt-maps-and-portals
description: >-
  Runbook and invariants for loading VLTK-SHXT maps, rendering full map previews,
  connecting portals from maptraffic.ini + traps.json, handling multi-area nav grids,
  and maintaining minimap/bigmap/Map Manager conventions in jx-system-online.
  Use when generating maps, editing map-portals.json, debugging map navigation/NPCs,
  or updating map tabs, portal markers, and flag pins.
---

# SHXT Maps, Portals & Map UI Runbook

## 1. Nguồn dữ liệu & sinh bản đồ (`gen:maps`, `gen:assets`)
- Luôn chạy generator với nguồn SHXT của máy này:
  `JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT npm run gen:maps -w @vltk/client -- <ids...>`
- `gen-maps.ts` khử trùng theo đường dẫn `.wor` (giữ ID nhỏ nhất). Khi kiểm tra map `.wor` hay đọc `*_region_c.dat`, dùng `resolveFile` / `resolveAny` từ `apps/client/tools/jx/`.
- Khi tạo ảnh preview bản đồ cho người dùng chọn, **luôn vẽ đủ 3 lớp `tiles + decals + objects`** (không chỉ vẽ terrain `r.tiles`).

## 2. Bản đồ đa khu vực & khu an toàn đặc biệt
- Với map có nhiều khu kín không thông nhau (ví dụ `323` Điểm báo danh Tống Nam / Kim Bắc):
  1. Khai báo `ENTRIES[id]` và `EXTRA_REACHABLE[id]` trong `apps/client/tools/gen-maps.ts`, rồi chạy `gen:maps -- --nav <id>`.
  2. Giữ tất cả các đảo lớn `isl` trong `decodeGrid` (`packages/shared/src/maps/nav/grid.ts`); không thu hẹp về 1 component duy nhất làm mất khu còn lại.
- Server chỉ cho dùng Rương chứa đồ trên map `w.rules.safe === true`: các map an toàn không thuộc `City`/`Capital` (như `323`) phải đặt `safe: true, pvp: false` trong `EXTRA` của `packages/shared/src/maps/index.ts`.

## 3. Nối cổng đi bộ (`packages/shared/src/maps/map-portals.json`)
- Nguồn đồ thị kết nối chuẩn của SHXT: `Client_VLTK_SHXT/settings/maptraffic.ini` (`Type=0`, `Index`, `Point`, `TargetPoint`, tọa độ world ≈ `Point × 16`).
- Đối chiếu `Point × 16` với tâm cụm `apps/client/public/assets/maps/<id>/traps.json`.
- Kiểm tra `canStandAt` trên `nav.json` cho cả `(x, y)` và `(toX, toY)`; đặt điểm đáp `(toX, toY)` lùi vào phía trong cách cổng ngược lại `>= 80–120 px` để tránh kích hoạt quay ngược ngay khi chuyển map.
- Luôn chạy `validatePortals` và `npm run test:map-portals` sau khi cập nhật `map-portals.json`.

## 4. Quy ước UI bản đồ & Map Manager
- **Phân tab bản đồ (`packages/shared/src/maps/index.ts`):**
  - `MAP_TYPE_NAMES.Tong = 'Môn phái'` (không dùng `Bang hội`).
  - Dùng `mapTypeLabel(m)` để tách các map `Battlefield` có tên bắt đầu bằng `Đơn đấu` sang tab riêng `Đơn đấu`.
- **Map Manager (`tools/map-manager/server.ts`):** `/api/bootstrap` phải nạp đủ mọi loại map (`City`, `Capital`, `Field`, `Cave`, `Country`, `Tong`, `Battlefield`, `Others`).
- **Minimap & Bản đồ lớn (`apps/client/src/ui/hud/minimap.ts`, `apps/client/src/ui/windows/bigmap.ts`):**
  - Portal vẽ chấm tròn đặc màu trắng (`#ffffff`) có viền đen (cùng style điểm chỉ NPC) và nhãn màu trắng (`#ffffff`).
  - Cắm cờ (lá cờ đỏ + đường nối vàng) phải hiển thị đồng bộ trên **cả bản đồ nhỏ và bản đồ lớn**; chỉ xóa cờ khi nhân vật tới đích (`<= 64 px`), cắm cờ mới hoặc đổi map — không tự xóa theo timeout đứng yên hay khi chạy vòng qua vật cản.

## 5. Xác minh sau khi chỉnh sửa
- Chạy `npm run typecheck`, `npm run test:map-portals`, `npm run test:map-manager` (khi đụng Map Manager/NPC) và `npm run build`.
