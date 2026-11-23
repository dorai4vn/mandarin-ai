# Rà soát giấy phép — nhận dạng chữ viết tay (D-029)

Ngày: 2026-11-23 · Người thực hiện: Claude Code (rà soát kỹ thuật, **không phải tư vấn pháp lý**) · Trạng thái: **chờ chủ dự án / tư vấn pháp lý quyết định**.

Chỉ đạo của chủ dự án: HanziLookup **chưa được duyệt cho production**; chạy trên server **không** được coi là miễn trừ nghĩa vụ GPL; **không thay thư viện** khi chưa duyệt.

## 1. Provenance đã kiểm tra
| Thành phần | Nguồn | Giấy phép công bố | Bằng chứng | Đánh giá |
|---|---|---|---|---|
| Gói npm `hanzilookup-js` 1.0.3 | npm, maintainer `monokaijs`, tạo 2025-12-29 | `ISC` trong `package.json` | Tarball **không có file LICENSE**; README: "modern ES Module rewrite of the original HanziLookupJS by Gabor L Ugray" | Là **tác phẩm phái sinh** của HanziLookupJS. Người viết lại không thể tự đổi giấy phép GPL sang ISC nếu không có sự đồng ý của các tác giả gốc → về nguyên tắc phải coi là **GPL-3.0**. Nhãn ISC **không đáng tin cậy**. |
| HanziLookupJS (Gabor L Ugray) | github.com/gugray/HanziLookupJS | **GPL-3.0** (file LICENSE) | README: "derived from Jordan Kiang's original HanziLookup … licensed under GNU GPL. This license covers both the code and the original data in `orig.json`" | Mã thuật toán: GPL-3.0. |
| HanziLookup gốc (Jordan Kiang) | kiang.org | GNU GPL | Theo README HanziLookupJS | Nguồn gốc thuật toán. |
| Dữ liệu `mmah.json` | HanziLookupJS `dist/mmah.json`, SHA-256 `287943…70ae` | **Arphic Public License** | README HanziLookupJS + `LICENSE-APL` | Phái sinh từ `graphics.txt` của Make Me a Hanzi, vốn trích từ font Arphic PL KaitiM GB / UKai. |
| Make Me a Hanzi `graphics.txt` | github.com/skishore/makemeahanzi | **Arphic Public License** | File `COPYING`: "You can redistribute and/or modify graphics.txt under the terms of the Arphic Public License" | Dữ liệu nét chữ. |
| Make Me a Hanzi `dictionary.txt` | như trên | **LGPL-3.0+** | `COPYING` | Không dùng hiện tại. |
| `hanzi-writer` (thư viện) | github.com/chanind/hanzi-writer | **MIT** | `LICENSE` (Copyright 2014 David Chanin) | Có sẵn chế độ quiz đối chiếu nét theo chữ đích. |
| `hanzi-writer-data` | github.com/chanind/hanzi-writer-data | **Arphic Public License** | README + `ARPHICPL.TXT` | Cùng nguồn Make Me a Hanzi. |

## 2. Nghĩa vụ chính (tóm tắt, cần tư vấn pháp lý xác nhận)
- **GPL-3.0:** khi *phân phối* phần mềm (gồm cả gửi JavaScript xuống trình duyệt, phát hành image/binary cho bên thứ ba) phải cung cấp mã nguồn tương ứng theo GPL-3.0 cho phần phái sinh. Chạy trên server không phân phối thì GPL-3.0 (khác AGPL) thường không kích hoạt nghĩa vụ công bố mã — **nhưng theo chỉ đạo, dự án không dựa vào lập luận này**. Ngoài ra image Docker hoặc mã nguồn có thể bị chia sẻ (đối tác, khách hàng tự host) → rủi ro.
- **Arphic Public License:** cho phép dùng, sao chép, phân phối, sửa đổi dữ liệu; bản phân phối (kể cả bản sửa đổi) phải giữ APL và trao cho người nhận các quyền tương tự (tính chất copyleft cho chính dữ liệu đó). Phải kèm bản giấy phép. Dữ liệu phái sinh từ font Arphic thường được dùng trong sản phẩm thương mại (Hanzi Writer, nhiều ứng dụng học chữ) khi tuân thủ điều kiện này — vẫn cần tư vấn xác nhận cho trường hợp của dự án.

## 3. Phương án (chưa triển khai — chờ duyệt)
| # | Phương án | Mã | Dữ liệu | Ưu | Nhược / rủi ro |
|---|---|---|---|---|---|
| A | **Giữ HanziLookup**, chấp nhận GPL-3.0 cho phần nhận dạng (tách thành service riêng, công bố mã service đó theo GPL) | GPL-3.0 | APL | Đã chạy được; nhận dạng mở (danh sách ứng viên) | Nghĩa vụ GPL; cần tư vấn pháp lý; chất lượng chưa đo |
| B | **Hanzi Writer (MIT) — chấm theo chữ đích**: so nét người viết với nét chuẩn của chữ cần viết, sau khi nộp | MIT | APL | Phù hợp đúng bài tập PRD-05 (đã biết đáp án); có gợi ý thứ tự nét; chạy được cả trên trình duyệt | Không cho danh sách ứng viên mở ("bạn viết chữ gì?"); cần đánh giá độ chặt/lỏng |
| C | **Tự viết matcher (clean-room)** trên dữ liệu APL (`graphics.txt`), không đọc mã GPL | Của dự án | APL | Toàn quyền giấy phép mã; nhận dạng mở | Tốn công; phải chứng minh clean-room; chất lượng chưa biết |
| D | **Dịch vụ thương mại** (ví dụ MyScript iink, hỗ trợ tiếng Trung) qua adapter server | Thương mại | Thương mại | Chất lượng cao (cần đo) | Chi phí, phụ thuộc nhà cung cấp, gửi nét viết ra bên thứ ba (quyền riêng tư) |
| E | Zinnia + model Tegaki (stroke-based) | Zinnia: BSD (cần xác minh) | Model: cần xác minh | Nhận dạng mở, offline được | **Chưa xác minh** giấy phép model tiếng Trung |

**Khuyến nghị kỹ thuật (để chủ dự án quyết định):** B làm **đường chấm điểm chính** cho bài tập viết (đúng nhu cầu PRD-05, MIT + APL); song song đánh giá D hoặc C nếu cần nhận dạng mở. Không dùng A cho production trừ khi tư vấn pháp lý chấp thuận rõ ràng.

## 4. Biện pháp đã áp dụng ngay (không thay thư viện)
- `HANDWRITING_ADAPTER` mặc định `disabled`; `hanzilookup` bị API **từ chối khi `APP_ENV=production`** (có unit test).
- Image Docker của API **không** chứa `mmah.json`.
- Dữ liệu chỉ tải bằng script cho môi trường dev/test (SHA-256 cố định, kèm `LICENSE-APL`); không commit vào repo.
- Không gửi mã HanziLookup xuống trình duyệt (chỉ chạy trong `apps/api`).

## 5. Việc cần chủ dự án quyết định
1. Chọn phương án (A–E) hoặc yêu cầu tư vấn pháp lý trước.
2. Có cho phép bật HanziLookup trên **Preview** (môi trường thử nghiệm riêng, có bảo vệ truy cập) để đo chất lượng hay không. Mặc định: **không bật**.
