# Upload PDF (M0-PWA) — giới hạn 50 MB mỗi tệp (D-040)

Ngày: 2026-11-24 · Phạm vi: **chỉ tải tệp lên lưu trữ riêng tư** (spike 5 của M0). Trích xuất, chia bài, duyệt nội dung giáo trình là M4 (PRD-08, PRD-11) — **chưa** làm.

## 1. Giới hạn
- **Tối đa 50 MB mỗi tệp = 50 MiB = 52 428 800 byte, tính cả mốc** (tệp đúng 52 428 800 byte được nhận; 52 428 801 byte bị từ chối). Tối thiểu 1 byte. Chỉ `application/pdf`, nội dung phải bắt đầu bằng `%PDF-`.
- Nguồn duy nhất: `packages/contracts/src/upload.ts` (`PDF_UPLOAD_LIMITS.maxBytes`, `maxLabel`, `checkPdfSize`) — web và API dùng chung, không thể lệch nhau.

| Nơi áp dụng | Cách kiểm | Khi vượt |
|---|---|---|
| Trình duyệt `/lab/upload` | `checkPdfSize(file.size)` + đọc **5 byte đầu** (`%PDF-`) | Thông báo: tên tệp, dung lượng (MB + byte), giới hạn 50 MB (52.428.800 byte), gợi ý chia nhỏ/nén — **không gửi request** |
| API Fastify `POST /v1/uploads/pdf` | Xác thực ở `onRequest` (trước khi đọc body); `bodyLimit` = 52 428 800 (Fastify từ chối ngay khi `Content-Length` lớn hơn, và cắt luồng nếu vượt khi đang nhận); kiểm lại `checkPdfSize` + `%PDF-` | `413 payload_too_large` (JSON đúng định dạng lỗi của API) · không phải PDF: `422 not_a_pdf` · sai kiểu: `415` · chưa đăng nhập: `401` **trước khi nhận body** |
| Supabase Storage — giới hạn chung của dự án (local `config.toml` `file_size_limit = "50MiB"`) | **Không dựa vào.** CI run 45425461714: Storage local (CLI 3.3.0) **vẫn nhận** 50 MiB + 1 byte dù đặt 50MiB | — |
| Supabase Storage — **giới hạn của bucket `documents`** (khuyến nghị: `file_size_limit` 52 428 800 byte + MIME `application/pdf`) | Lớp chặn thứ hai sau API. CI (Storage local thật): 50 MiB nhận; **50 MiB + 1 bị từ chối**; `text/plain` bị từ chối | Adapter chuẩn hóa thành 413 → API `413 provider_http_error` → web "Tệp vượt giới hạn 50 MB mỗi tệp PDF." |
| Supabase Storage Cloud `mandarin-ai-dev` | Storage → Settings → Upload file size limit của dự án **≥ 50 MB** (gói Free tối đa 50 MB) **và** đặt giới hạn bucket như trên | Chủ dự án cấu hình + kiểm ở B1/B7 |

## 2. Phương thức upload thực tế (M0)
```text
Trình duyệt ──HTTPS POST (Content-Type: application/pdf, body = File stream, Bearer access token)──▶ API Railway
API Railway ──kiểm tra──▶ Supabase Storage REST: POST /storage/v1/object/documents/<user_id>/imports/<uuid>.pdf
             (standard upload một request, header apikey = secret key, x-upsert: false, timeout 180 s)
```
- **Trình duyệt không đọc cả tệp:** chỉ `file.slice(0, 5)` để kiểm `%PDF-`; `fetch` gửi `File` (Blob) trực tiếp nên trình duyệt đọc từ đĩa theo luồng, không nằm trên main thread. Không tính SHA-256 ở trình duyệt (API tính). Test E2E (Chromium) đo không có long task ≥ 250 ms khi xử lý tệp 50 MB.
- **API giữ tệp trong RAM** trong lúc xử lý (Fastify `parseAs: 'buffer'`): đỉnh bộ nhớ ≈ 2 × kích thước tệp cho mỗi upload đồng thời. Railway cần dư bộ nhớ (≥ 512 MB khuyến nghị cho vài upload cùng lúc).
- **Đường dẫn do server chọn** (`<user_id>/imports/<uuid>.pdf`), client không quyết định; `x-upsert: false` không ghi đè.
- **Secret key chỉ ở Railway**; trình duyệt không có quyền ghi Storage (publishable key bị từ chối — test CI). Bucket **private**, không đọc công khai.
- Timeout phía trình duyệt 5 phút (50 MB qua uplink di động chậm có thể mất vài phút); hết giờ → "Máy chủ phản hồi quá lâu…".
- Ô chọn tệp bị vô hiệu tới khi trang hydrate xong (tránh chọn tệp mà không có gì xảy ra) và trong lúc đang gửi.

## 3. Vì sao chưa dùng resumable upload — và khi nào cần
Supabase khuyến nghị **standard upload cho tệp nhỏ (≈ ≤ 6 MB)** và **resumable (TUS)** cho tệp lớn hoặc mạng không ổn định. Ở M0, standard upload qua API vẫn đúng chức năng cho 50 MB (kiểm trên Storage thật trong CI), nhưng:
- mất mạng giữa chừng → phải gửi lại từ đầu; không có thanh tiến độ (fetch không báo tiến độ upload);
- tệp đi qua Railway (băng thông + RAM API).

**Đề xuất cho M4 (chưa làm, cần duyệt — thay đổi kiến trúc):** API cấp **signed upload URL** ngắn hạn cho đúng đường dẫn `<user_id>/imports/<uuid>.pdf` (sau khi kiểm đăng nhập, membership, kích thước khai báo); trình duyệt upload **trực tiếp** lên Storage bằng TUS (resumable, có tiến độ, chunk 6 MB); API xác nhận lại đối tượng (kích thước, `%PDF-`) trước khi tạo job xử lý. Bucket vẫn private, secret key vẫn chỉ ở server.

## 4. Kiểm thử
| Lớp | Test | Mức kiểm |
|---|---|---|
| Contract | `packages/contracts/src/upload.test.ts` | 20 / 49 / 50 MiB = ok; 50 MiB + 1, 200 MiB = quá lớn; 0, âm, NaN = rỗng |
| API (Fastify inject) | `apps/api/src/app.test.ts` › *PDF upload limit 50 MB* | 20 / 49 / đúng 50 MiB → 201, `sizeBytes` đúng; 50 MiB + 1 → 413 `payload_too_large`; 49 MiB không phải PDF → 422; chưa đăng nhập + 50 MiB + 1 → **401** (xác thực trước body) |
| Web | `apps/web/src/lib/api-client.test.ts` | Thông báo 413, timeout, sai kiểu |
| E2E 3 engine | `apps/web/e2e/upload-limits.spec.ts` | Desktop mỗi engine: 20 / 49 / đúng 50 MiB qua trình duyệt → API (lưu trữ giả lập development); Chromium: không long task ≥ 250 ms. Mọi viewport: 50 MiB + 1 và 60 MiB bị từ chối **không gửi request**; 49 MiB giả mạo bị từ chối |
| Storage thật (CI) | `scripts/test-storage-upload-limit.mjs` (job `database`) | Bucket private + giới hạn 52 428 800 byte + chỉ PDF; bằng adapter thật của API: 20 / 49 / đúng 50 MiB lưu được, kích thước đúng; 50 MiB + 1 → 413; `text/plain` bị từ chối; không đọc công khai; publishable key và không có key đều không upload được |
| Thủ công | `docs/M0_PWA_ACCEPTANCE.md` B7, `docs/SMOKE_TEST.md` A9/B7/C4 | Trên Preview + Storage Cloud, tệp gần 50 MB từ máy tính và điện thoại |
