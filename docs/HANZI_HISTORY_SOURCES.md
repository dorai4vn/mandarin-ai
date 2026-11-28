# Nguồn và giấy phép — lịch sử chữ Hán (M3.5)

Ngày kiểm: 2026-11-26 · Kiểm kỹ thuật qua API Wikimedia Commons (`imageinfo/extmetadata`), **không phải tư vấn pháp lý**. Trạng thái: **chờ chủ dự án duyệt**.

## 山 — các tệp đã dùng
| Giai đoạn | Tệp Commons | Giấy phép (nhãn Commons) | Người tải/vẽ | SHA-256 bản tải | Ghi chú xuất xứ trong tệp nguồn |
|---|---|---|---|---|---|
| Giáp cốt văn | `File:山-oracle.svg` | Public domain | Wargaz | `21a08b3b…79f5` | tham chiếu 合5431 |
| Kim văn | `File:山-bronze.svg` | Public domain | Yug | `fe694d76…830a` | tham chiếu b14270 (hanziyuan.net) |
| Tiểu triện | `File:山-seal.svg` | Public domain | Wargaz | `6a9bc5e4…8f86` | tham chiếu s06639 (hanziyuan.net) |

(SHA-256 đầy đủ nằm trong `apps/web/src/hanzi/data.ts`.)

## Đã xem xét nhưng KHÔNG dùng
- `山-bigseal.svg` (Liushutong, bản chép đời Minh, không phải chứng cứ nguyên thủy).
- `山-silk.svg` (siêu dữ liệu thiếu niên đại/nguồn đủ rõ).
- `山-kaishu.png` (PD, dựng từ phông cwTeX) và `山-mingti-kangxi.svg` (CC BY-SA 3.0, buộc ghi công + share-alike): không cần vì khải thư hiển thị bằng phông ứng dụng.
- Lệ thư: không tìm được tệp có nguồn/giấy phép xác minh → **giai đoạn thiếu**, hiển thị rõ.

## Hạn chế cần chủ dự án biết
1. Hình là **bản vẽ lại** bởi contributor Commons từ cơ sở dữ liệu cổ văn tự; chưa đối chiếu với bản dập giáp cốt/kim văn hay ấn bản Thuyết văn gốc. Nhãn "Public domain" là của Commons; quyền đối với bản vẽ lại chưa được tư vấn pháp lý xác nhận.
2. Niên đại ghi ở mức thế kỷ, theo cách chia thông dụng, chưa trích dẫn học thuật cụ thể.
3. Chỉ 山 có dữ liệu. Không có bộ dữ liệu hay tỉ lệ bao phủ nào khác.
4. Thứ tự nét: **chưa làm**. Ứng viên là `hanzi-writer-data` (Arphic Public License, xem `HANDWRITING_LICENSE_REVIEW.md` §6) nhưng chưa được duyệt tích hợp; UI nói rõ "chưa có".
5. Tệp được nhúng trong mã (tự host, không gọi Commons lúc chạy). Cần trang ghi công/giấy phép trong app nếu chủ dự án yêu cầu; hiện nguồn + giấy phép hiển thị cạnh từng giai đoạn.
