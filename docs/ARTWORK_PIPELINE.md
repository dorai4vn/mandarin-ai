# M3.6 — Artwork Automation (mock-first), Phase A

Mã nguồn: `packages/adapters/src/artwork` (export `@mandarin/adapters/artwork`). Không phụ thuộc dependency mới, không gọi API thật.

## Quyết định (D-044, đề xuất — chủ dự án đã duyệt hướng mock-first trong issue #31)
- Chỉ dùng **mock**; không API ảnh thật, không chi phí, không secret, không migration, không đổi cấu hình cloud, không đổi auth.
- Ảnh mock **luôn** gắn `source: 'mock'`, `placeholder: true`, chứa nhãn "MOCK ARTWORK - placeholder, not a real illustration"; không bao giờ là minh họa thật hay bằng chứng lịch sử.
- **Bằng chứng lịch sử là bản ghi tách biệt** (`historicalEvidence`, do người tuyển chọn); ảnh sinh ra luôn `isHistoricalEvidence: false`; QC từ chối mock có evidence.

## Hợp đồng
| Thành phần | Hợp đồng | Adapter hiện có |
| --- | --- | --- |
| Provider | `ArtworkProvider` (`estimateCost`, `generate(signal)`, `ProviderError.retryable`) | `MockArtworkProvider` (xác định, SVG nhãn) |
| Queue | `ArtworkQueue` (enqueue idempotent, claim có lease, succeed/fail theo owner, cancel, requeue) | `MemoryArtworkQueue` |
| Storage | `ArtworkStorage` (content-addressed, put idempotent, kiểm checksum, key an toàn) | `MemoryArtworkStorage`, `LocalArtworkStorage` |
| Worker | `ArtworkWorker.drain()`: concurrency, ngân sách, retry backoff có trần, hủy, resume | — |

Hành vi: idempotency theo `idempotencyKey` + lưu theo `sha256` (không trùng tài sản); retry chỉ với lỗi `retryable`, backoff `base*2^(n-1)` có trần, tối đa `maxAttempts`; hết ngân sách thì job còn lại giữ `queued` (không tính lượt thử); worker chết → lease hết hạn → job được nhận lại; hủy đang chạy → abort và không lưu.

## Xử lý & QC
`processImage` tạo container RIFF/WEBP (VP8X, canvas 1024×768 = 4:3) kèm metadata + SHA-256. `runQc` kiểm: là WebP, tỉ lệ 4:3, kích thước, checksum, metadata khớp, nhãn mock, không evidence.

## Khoảng trống trung thực
- Mock encoder **không phải ảnh raster giải mã được**; payload SVG nằm trong chunk `MOCK`. Encoder thật (vd. sharp/libwebp) cần duyệt dependency và thay sau cùng chữ ký `processImage`.
- Chưa có admin review lab (Phase B), chưa có test 10/50/1000 đầy đủ + CI/preview (Phase C; hiện có test 1000 job tổng hợp).
- Chưa có tích hợp Supabase/Railway (chỉ thiết kế bên dưới).

## Thiết kế tích hợp tương lai (CHƯA triển khai, cần duyệt riêng)
- **Supabase queue:** bảng `artwork_jobs` (`idempotency_key UNIQUE`, `status`, `attempts`, `available_at`, `lease_owner`, `lease_expires_at`, `last_error`, `result jsonb`); claim bằng `SELECT … FOR UPDATE SKIP LOCKED`; RLS bật, chỉ `service_role` ghi; admin đọc qua policy riêng.
- **Supabase Storage:** bucket riêng tư `artwork`, key `artwork/<sha256>.webp`; truy cập qua signed URL ngắn hạn; adapter phải qua cùng test hợp đồng storage.
- **Railway worker:** tiến trình Node chạy `drain()` theo vòng lặp, `workerId` theo instance, secret chỉ qua biến môi trường Railway, tắt mềm bằng SIGTERM (abort + lease hết hạn thì job được nhận lại).
- Mọi migration, cấu hình cloud, provider thật: chờ chủ dự án duyệt riêng.
