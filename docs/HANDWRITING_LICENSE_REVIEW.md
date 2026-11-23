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

---

## 6. Nghiên cứu phương án B — Hanzi Writer (2026-11-23, theo yêu cầu chủ dự án)
**Chưa tích hợp, chưa bật** — chỉ kiểm tra gói và giấy phép.

### 6.1 Kiểm tra gói npm (tải tarball và đọc trực tiếp)
| Gói | Phiên bản | Giấy phép trong gói | Dependency | Kích thước |
|---|---|---|---|---|
| `hanzi-writer` | 3.7.3 | **MIT** — file `LICENSE` (Copyright 2014 David Chanin); `COPYING.md` ghi rõ dữ liệu dùng Make Me a Hanzi/Arphic theo APL | **không có** | `hanzi-writer.min.js` ≈ 10,7 KB gzip |
| `hanzi-writer-data` | 2.0.1 | **Arphic Public License** — kèm `ARPHICPL.TXT` và thư mục `APL/` (bản EN/zh) | không | 9 580 tệp JSON, mỗi chữ ≈ 0,5 KB gzip (ví dụ 山: `strokes` + `medians`, 3 nét); tổng 47 MB → **tải từng chữ khi cần** |

Chuỗi provenance dữ liệu: font Arphic PL KaitiM GB / UKai (APL, 1999) → Make Me a Hanzi (`graphics.txt`, APL, Shaunak Kishore 2016) → `hanzi-writer-data` (APL). Không có thành phần GPL trong chuỗi này.

### 6.2 Đánh giá giấy phép (kỹ thuật, không phải tư vấn pháp lý)
- Mã MIT: dùng thương mại, sửa đổi, đóng gói vào bundle trình duyệt được; giữ thông báo bản quyền MIT.
- Dữ liệu APL: được dùng và phân phối (kể cả qua trình duyệt); khi phân phối phải kèm giấy phép APL; nếu **sửa đổi dữ liệu** thì bản sửa đổi tiếp tục theo APL. Không ràng buộc mã nguồn ứng dụng.
- Việc cần làm khi tích hợp: trang "Giấy phép & ghi công" trong app (MIT + APL + nguồn Make Me a Hanzi/Arphic), tự host dữ liệu (không dùng CDN bên ngoài) để kiểm soát phiên bản và quyền riêng tư.

### 6.3 Phù hợp kỹ thuật với PRD-05
| Yêu cầu | Hanzi Writer | Ghi chú |
|---|---|---|
| Nét vector từ chạm/chuột/bút | Có (quiz mode tự thu nét) | Hoặc dùng canvas hiện có rồi chấm |
| Chấm theo chữ đích | Có — so từng nét với `medians` của chữ đích | Đúng nhu cầu bài tập (đã biết đáp án) |
| Danh sách ứng viên mở ("bạn viết chữ gì") | **Không** | Nếu cần → phương án C/D (mục 3) |
| Không lộ đáp án trước khi nộp | **Xung đột ở quiz mode mặc định**: quiz chấm từng nét **trong lúc viết** nên dữ liệu nét chữ đích phải có sẵn trên trình duyệt | Cần spike: (a) viết tự do → nộp → tải dữ liệu chữ đích → chấm toàn bộ nét sau khi nộp; hoặc (b) chấm phía server bằng thuật toán MIT trên dữ liệu APL |
| Gợi ý thứ tự nét, animation | Có | Dùng sau khi nộp |
| Offline | Có, nếu dữ liệu chữ đã tải | Hợp D-032 (local-first, phản hồi < 100 ms) |
| Hiệu năng | ≈ 10,7 KB + ≈ 0,5 KB/chữ, lazy-load | Trong budget P10 nếu tải lười |

### 6.4 Đề xuất bước tiếp theo (chờ duyệt, chưa làm)
1. Spike riêng (không bật trên Preview công khai): chấm sau khi nộp với 20 chữ × mẫu thật từ điện thoại và máy tính; đo tỷ lệ đúng/sai, độ lỏng (`leniency`), độ trễ.
2. Nếu đạt: đề xuất thay `HandwritingRecognitionPort` mặc định bằng adapter "đối chiếu chữ đích" (MIT + APL) cho bài tập; HanziLookup giữ ở trạng thái chỉ dev hoặc gỡ bỏ theo quyết định.
