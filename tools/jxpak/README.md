# Tạo data_extract bằng bộ giải nén volam-shxt

Từ gốc project:

```sh
python3 tools/jxpak/from-volam.py \
  /Users/hudy/ws/volam-shxt/Client_VLTK_SHXT \
  /Users/hudy/ws/volam-shxt/scripts
export JX_CLIENT=/Users/hudy/ws/volam-shxt/Client_VLTK_SHXT
```

Tool nhập `get_decompressor` và `g_HashString2Id` từ `unpack_pak.py`, không chỉnh sửa script đó hay dữ liệu client gốc. Chỉ ghi `data_extract/` trong client. Các generator chạy trên Node; bước giải nén này dùng Python và trình biên dịch C của máy.

- Đọc thứ tự ưu tiên trực tiếp từ `package.ini` (chỉ số nhỏ thắng), bỏ gói launcher `dxrm`.
- Giải nén bản thắng; bản bị thay thế được ghi trong manifest và không dùng.
- Hỗ trợ NRV2B cờ 1/32, SPR nén từng frame cờ 17 và file không nén.
- Khôi phục tên bằng hash từ tên file loose, tham chiếu trong bảng/script gốc và đường dẫn trong generator. File chưa biết tên vẫn tra được bằng hash qua `hashindex.ts`.
- Ghi `_manifest.tsv` 10 cột cho từng gói và `extraction-report.json`. Lỗi giải nén khiến lệnh trả mã thất bại; không đánh dấu lỗi thành `ok`.
- Chạy lại tận dụng file có đúng kích thước đã giải nén; muốn kiểm tra lại từ PAK, xóa riêng file đầu ra tương ứng trước khi chạy lại.

Bản client được kiểm tra ngày 2026-11-13 có một entry lỗi: `ui:8420d4fe` (`spr/skill/others/七剑光环.spr`), cờ nén SPR nhưng payload chỉ gồm 32 byte zero. Tool giữ trạng thái `error` và trả mã 1 để không che lỗi nguồn; các generator vẫn có thể chạy với những entry hợp lệ. Đây là trường hợp đã kiểm chứng riêng, không phải quy tắc bỏ qua lỗi nói chung.
