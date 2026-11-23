# Mandarin AI — Performance budget & phương pháp đo (D-032)

Ngày: 2026-11-23 · Trạng thái: **mục tiêu ban đầu đã được chủ dự án duyệt; chưa có số liệu trên bản HTTPS thực tế.**

> **Không được tuyên bố đạt hiệu năng** khi chưa có benchmark trên bản HTTPS thực tế (Preview/production) theo phương pháp ở mục 3. Số liệu "lab localhost" ở mục 5 chỉ là điểm xuất phát để phát hiện hồi quy, không phải bằng chứng đạt mục tiêu.

## 1. Nguyên tắc
1. **Local-first:** dữ liệu đã tải (bài học, từ điển, thẻ ôn, quiz) đọc từ IndexedDB; mạng chỉ dùng để đồng bộ và tải thêm.
2. **Optimistic UI, trung thực về trạng thái:** hiển thị ngay kết quả cục bộ, nhưng trạng thái đồng bộ chỉ chuyển "đã đồng bộ" khi server **xác nhận** (`applied`/`duplicate`). `pending`, `rejected`, lỗi mạng phải hiển thị rõ.
3. **Tải ít, tải muộn:** mỗi route chỉ tải JS cần cho màn hình đầu; thành phần nặng (PDF viewer, audio engine, animation Hanzi, nhận dạng chữ viết tay, SDK Supabase/AI) tải lười khi cần.
4. **Việc nặng ở background:** import PDF, OCR, sinh nội dung AI chạy job nền có tiến độ, retry, idempotency; UI không chờ đồng bộ.
5. **Đo trước khi tối ưu:** không thêm Redis/cache trả phí trước khi có số liệu (D-033); không giả định region nhanh nhất (D-034).
6. **Không đánh đổi đúng đắn lấy tốc độ:** tối ưu không được làm suy yếu bảo mật, RLS, dữ liệu offline hay tính đúng đắn của đồng bộ (mục 9).

## 2. Mục tiêu (budget) và ngưỡng thất bại

| ID | Chỉ số | Mục tiêu | Ngưỡng **cảnh báo** | Ngưỡng **thất bại** (chặn nghiệm thu) | Điều kiện đo | Đo được từ |
|---|---|---|---|---|---|---|
| P1 | Phản hồi tương tác UI (Event Timing `duration`; INP lab) | p95 < 100 ms | p95 ≥ 100 ms | p95 > 200 ms | Profile mobile-mid (mục 3.1) | **Ngay** (lab) |
| P2 | Tra từ điển cục bộ (gõ → kết quả hiển thị) | p95 < 200 ms | ≥ 200 ms | > 400 ms | Dataset D-L (mục 4), mobile-mid | M2 (chưa có từ điển) |
| P3 | Điều hướng giữa route đã cache (click → nội dung chính hiển thị) | p95 < 300 ms | ≥ 300 ms | > 600 ms | mobile-mid, route đã mở 1 lần | **Ngay** (lab) — kiểm lại trên HTTPS |
| P4 | Phản hồi đáp án quiz cục bộ (chọn → đúng/sai hiển thị) | p95 < 100 ms | ≥ 100 ms | > 200 ms | Dataset D-L, offline | M3 |
| P5 | AI text: token đầu tiên hiển thị | 1–2 s | > 2 s | p95 > 4 s | Mạng thử nghiệm xác định (mục 3.1: "4G-lab"), prompt chuẩn | M7 (cần OpenAI key) |
| P6 | Kết quả chấm phát âm (dừng ghi → điểm hiển thị, không tính thời gian nói) | p95 < 3 s | ≥ 3 s | > 5 s | Mẫu 1–3 s, 4G-lab | M6 (cần Azure key) |
| P7 | LCP | p75 ≤ 2,5 s | > 2,5 s | p75 > 4 s | RUM thật; lab: mobile-mid + 4G-lab | Lab ngay; **RUM sau deploy** |
| P8 | INP | p75 ≤ 200 ms | > 200 ms | p75 > 500 ms | RUM thật | **Sau deploy** (lab chỉ ước lượng qua P1) |
| P9 | CLS | p75 ≤ 0,1 | > 0,1 | p75 > 0,25 | RUM + lab | Lab ngay; RUM sau deploy |
| P10 | JS tải lần đầu mỗi route (nén) | ≤ 200 KB (mục tiêu M1), ≤ 170 KB (mục tiêu M8) | > 200 KB | > 300 KB | `next build` + đo transfer | **Ngay** |
| P11 | Độ trễ API (server, không tính mạng) | p95 < 150 ms cho endpoint CRUD/sync | ≥ 150 ms | > 500 ms | Log `responseTime`, theo route | Ngay (local) · thật sau deploy |
| P12 | Độ trễ truy vấn DB | p95 < 50 ms mỗi truy vấn chính | ≥ 50 ms | > 200 ms | `pg_stat_statements` + timing repository | M1 (chưa có DB thật) |
| P13 | Thời lượng một lượt sync (≤ 100 thao tác) | p95 < 2 s trên 4G-lab | ≥ 2 s | > 5 s | Client đo `syncNow()` | Lab ngay (server MOCK) · thật M1 |
| P14 | Độ dài hàng đợi outbox lâu dài | 0 sau khi online ≥ 60 s | > 0 sau 60 s | > 0 sau 10 phút | Client báo cáo | Sau deploy |
| P15 | Tỷ lệ lỗi request API (5xx + network) | < 0,5% | ≥ 0,5% | > 2% | Theo ngày, theo route | Sau deploy |
| P16 | Nhận dạng chữ viết tay (nộp → ứng viên hiển thị) | p95 < 800 ms trên 4G-lab | ≥ 800 ms | > 1,5 s | Adapter được duyệt (D-029) | Sau khi D-029 được quyết |

Ngưỡng có thể điều chỉnh **sau khi có baseline HTTPS thật** — mọi điều chỉnh ghi vào DECISIONS (kèm số liệu).

## 3. Phương pháp đo

### 3.1 Profile thiết bị và mạng (lab)
| Profile | CPU | Mạng | Viewport | Ghi chú |
|---|---|---|---|---|
| `desktop` | 1× | không giới hạn | 1440×900 | Laptop/PC |
| `tablet` | 2× chậm | 4G-lab | 820×1180 | |
| `mobile-mid` | **4× chậm** | **4G-lab** | 390×844, touch | Đại diện điện thoại tầm trung |
| `mobile-low` | 6× chậm | 3G-lab | 360×780 | Kiểm tra giới hạn dưới (báo cáo, không chặn) |

`4G-lab`: RTT 150 ms, tải xuống 1,6 Mbps, tải lên 750 kbps (tương đương "Slow 4G" của Lighthouse). `3G-lab`: RTT 300 ms, 400 kbps / 400 kbps.

**Giới hạn công cụ:** giả lập CPU throttling chỉ có trên Chromium (CDP). Firefox/WebKit trong Playwright: đo **không** throttle CPU; giới hạn mạng chỉ giả lập được bằng proxy/độ trễ route. Vì vậy: budget CPU-bound (P1, P2, P4) được **chặn** trên Chromium; Firefox/WebKit chạy cùng kịch bản để **báo cáo xu hướng và phát hiện hồi quy lớn** (ngưỡng thất bại nới ×1,5) cho tới khi có thiết bị thật.

### 3.2 Cách đo từng loại
- **Tương tác (P1, P4):** Event Timing API (`PerformanceObserver({type:'event', durationThreshold:16})`) lấy `duration` của `pointerdown/pointerup/click/keydown`; p95 trên ≥ 30 tương tác. Không dùng thời gian đồng hồ của Playwright (bao gồm overhead tự động hóa).
- **Truy vấn cục bộ (P2):** `performance.mark/measure` quanh: sự kiện input → kết quả render xong (`requestAnimationFrame` sau commit). Dataset D-L đã nạp sẵn vào IndexedDB.
- **Điều hướng (P3):** Next.js route change: `performance.mark` lúc click → mark khi phần tử chính (`main h1`) hiển thị; lần mở thứ 2 của route.
- **Core Web Vitals (P7–P9):** thư viện `web-vitals` (attribution build) phía client trong RUM; lab dùng `PerformanceObserver` (LCP, layout-shift). INP lab chỉ là ước lượng.
- **JS budget (P10):** tổng `encodedDataLength` của script khi tải route lần đầu (CDP) + báo cáo chunk từ build; CI so sánh với budget.
- **API (P11):** Fastify `onResponse` ghi `route`, `statusCode`, `responseTime`; header `Server-Timing: app;dur=…, db;dur=…` để thấy trên DevTools; không log body/token.
- **DB (P12):** `pg_stat_statements` (Supabase có sẵn) + timing quanh mỗi lời gọi repository; `EXPLAIN (ANALYZE, BUFFERS)` cho truy vấn chính trên dataset D-L trước khi nghiệm thu milestone.
- **AI first token (P5):** đo phía client từ lúc gửi tới token đầu tiên hiển thị (stream), và phía server từ lúc nhận request tới byte đầu tiên từ nhà cung cấp; tách để biết phần nào chậm.
- **Phát âm (P6):** `stop` ghi âm → điểm hiển thị; tách: mã hóa WAV (client), upload, xử lý Azure, trả kết quả.
- **Sync (P13, P14):** `SyncEngine` ghi thời lượng mỗi lượt, số thao tác, kết quả (`applied/duplicate/rejected/retried`), độ dài outbox.

### 3.3 Nơi chạy
| Loại | Nơi | Khi nào |
|---|---|---|
| Lab localhost | Môi trường dev/CI | Mỗi PR (phát hiện hồi quy) |
| Lab trên HTTPS Preview | Script Playwright chạy tới URL Preview (Vercel + Railway) | Trước nghiệm thu mỗi milestone |
| Thiết bị thật | iPhone Safari, Android Chrome, laptop Chrome/Edge — theo `docs/SMOKE_TEST.md` + bảng đo tay | Trước nghiệm thu |
| RUM | Người dùng beta thật (mẫu, ẩn danh) | Từ khi có Preview có người dùng (M1+) |

## 4. Dataset thử nghiệm (tổng hợp, không dùng nội dung HSK có bản quyền)
Sinh bằng script có seed cố định (`fixtures/perf/`, làm ở M2 khi có schema), quy mô gần thực tế:

| ID | Nội dung | Quy mô |
|---|---|---|
| D-S (small) | Starter fixture hiện có | 4 từ, 1 bài |
| D-L (large) | Shared lexicon tổng hợp | 12 000 lexeme (≈ HSK 1–9 cộng thêm), 20 000 sense, 6 000 Hanzi |
| | Từ vựng cá nhân | 3 000 vocabulary item, 1 000 custom, 200 tag/topic |
| | Khóa học | 2 giáo trình × 20 chương × 10 bài, 60 từ/bài |
| | Ôn tập | 12 000 review card (3 000 từ × 4 skill), 50 000 attempt, 100 000 learning event |
| D-PDF | PDF tổng hợp | 20, 120 và 300 trang (có lớp text và bản scan) |
| D-AUDIO | Mẫu ghi âm | 1 s, 3 s, 10 s WAV 16 kHz |

Mục tiêu P2/P4 phải đạt với **D-L** đã nạp sẵn trên profile `mobile-mid`.

## 5. Baseline hiện tại — lab localhost (KHÔNG phải HTTPS thật)
Đo ngày 2026-11-23 trên commit `0e22395`, bản build production (`next build` + `next start`), API local, **Chromium** (Playwright 1.63), 5 lần tải nguội mỗi trang, service worker tắt. Máy CI/container Linux, không phải thiết bị thật. Script: `apps/web/perf/lab-baseline.mjs` (chưa gắn vào CI — job CI benchmark làm ở M1).

| Trang | mobile-mid: LCP trung vị / max | CLS max | JS tải (nén) | desktop: LCP trung vị |
|---|---|---|---|---|
| `/` | 564 / 836 ms | 0 | 289 KB (15 file) | 76 ms |
| `/dictionary` | 544 / 564 ms | 0 | 275 KB | 72 ms |
| `/lab/handwriting` | 524 / 560 ms | 0 | 280 KB | 72 ms |
| `/lab/audio` | 576 / 592 ms | 0,007 | 280 KB | 76 ms |
| `/lab/offline` | 572 / 592 ms | 0,017 | 278 KB | 72 ms |

| Tương tác | mobile-mid (CPU 4×) | desktop |
|---|---|---|
| Event Timing: thời lượng lớn nhất trong 20 lần "Lưu ghi chú" (ghi IndexedDB + cập nhật UI) | **64 ms** | 16 ms |
| Đồng hồ Playwright click → ghi chú hiện (gồm overhead tự động hóa, chỉ tham khảo) | p50 98 / p95 122 ms | p50 59 / p95 69 ms |
| Nhận dạng chữ viết tay qua API localhost (HanziLookup, nét tổng hợp; **không có độ trễ mạng thật**) | p50 10 / p95 79 ms | p50 3 / p95 14 ms |

Phân tích JS (gzip, chunk chung cho mọi route): react-dom ≈ 70 KB, runtime Next.js ≈ 83 KB, **`@supabase/supabase-js` ≈ 62 KB (tải ở mọi trang dù chưa cấu hình Supabase)**, Dexie ≈ 32 KB, zod ≈ 32 KB.

**Đọc kết quả đúng cách:** LCP thấp vì trang hiện là tĩnh và server ở localhost (TTFB ≈ 150 ms chỉ do giả lập RTT); trên HTTPS thật sẽ thêm DNS/TLS/CDN và JS lớn hơn khi có tính năng. **JS ≈ 275–294 KB vượt budget P10 (≤ 200 KB)** ngay từ bây giờ → khoản cần xử lý sớm (mục 7, G2).

## 6. Yêu cầu kiến trúc → trạng thái hiện tại
| # | Yêu cầu | Trạng thái M0-PWA | Milestone |
|---|---|---|---|
| A1 | Local-first reads (Dexie) cho bài học, từ điển, quiz đã tải | Hạ tầng Dexie + outbox có; chưa có dữ liệu bài học/từ điển | M1–M3 |
| A2 | Optimistic UI, outbox idempotent, pending/error rõ, không báo synced khi chưa có ack | Outbox + reconcile đúng; **G1:** chip báo "Đã đồng bộ" khi còn thao tác `rejected` | M1 (sửa G1) |
| A3 | Cache/prefetch có giới hạn, invalidation theo version, không cache nhầm dữ liệu riêng | SW chỉ cache trang công khai + asset có hash; chưa có cache dữ liệu; chưa có quota | M1–M2 |
| A4 | Lazy loading PDF viewer, audio engine, Hanzi animation, handwriting | Nhận dạng chạy server; audio worklet tải khi bấm ghi; **G2:** Supabase SDK tải sẵn mọi trang | M1 (G2), M4–M6 |
| A5 | PDF/AI nặng chạy background job (progress, retry, idempotency) | Chưa có (upload M0 là đồng bộ, tối đa 20 MB) | M4, M7 |
| A6 | AI text streaming; Realtime chỉ khi tương thích + test thật | Chưa có (chỉ spike cấp khóa) | M6–M7 |
| A7 | Rà soát số request, index DB, batching, N+1, connection management | Sync đã batch ≤ 100 thao tác; chưa có DB thật | M1–M3 (mỗi migration kèm index + EXPLAIN) |
| A8 | Region theo đo đạc, colocate API/DB | Chưa đo (D-034) | Trước khi tạo Supabase production |
| A9 | Instrument Web Vitals, API/DB latency, AI first-token, sync duration, queue length, error rate | Fastify có `responseTime` trong log; chưa có RUM/metrics | M1 (khung), M6–M7 (AI) |
| A10 | Benchmark desktop + mobile throttle, Chromium/Firefox/WebKit trong CI | Mới có baseline lab Chromium (mục 5) | M1 (job CI) |
| A11 | Không Redis/cache trả phí khi chưa có số liệu | Tuân thủ (D-033) | — |
| A12 | Không làm yếu bảo mật/RLS/offline/sync | Ràng buộc mục 9 | Mọi milestone |

## 7. Khoảng trống đã phát hiện (sửa ở M1, không sửa trong đợt tài liệu này)
- **G1 — Trạng thái đồng bộ:** `SyncChip` hiển thị "Đã đồng bộ" khi `pending = 0` kể cả khi outbox có thao tác `rejected` → phải hiển thị lỗi và số thao tác bị từ chối.
- **G2 — Supabase SDK tải sẵn:** `OfflineProvider` (layout gốc) → `api-client` → `session` import tĩnh `@supabase/supabase-js` (~62 KB gzip) → chuyển sang `import()` động chỉ khi cần phiên đăng nhập.
- **G3 — zod phía client (~32 KB):** cần để kiểm tra phản hồi API; cân nhắc `zod/mini` hoặc chỉ kiểm tra ở ranh giới cần thiết — đo trước khi đổi (trade-off: an toàn kiểu dữ liệu ↔ kích thước).
- **G4 — Chưa có bộ đo:** chưa có `web-vitals`, `Server-Timing`, chỉ số sync.

## 8. Chọn region (D-034)
1. Dựng endpoint `/health` + `/v1/probe/db` (một truy vấn `select 1` và một truy vấn mẫu có index) trên các region ứng viên của API (Railway) và database (Supabase).
2. Từ thiết bị thật của người dùng mục tiêu (Việt Nam: Wi-Fi + 4G; thêm nơi khác nếu có người dùng), đo 30 mẫu mỗi region: RTT `/health`, thời gian `/v1/probe/db`.
3. Chọn cặp region có p95 tổng tốt nhất **với API và DB cùng region**; ghi bảng số liệu vào mục này. Web tĩnh qua CDN (Vercel) không phụ thuộc region.
4. Region Supabase không đổi được sau khi tạo → làm bước này **trước** khi tạo dự án production.

| Ứng viên API | Ứng viên DB | RTT p95 từ VN (Wi-Fi) | RTT p95 (4G) | probe/db p95 | Ghi chú |
|---|---|---|---|---|---|
| (chưa đo) | | | | | |

## 9. Ràng buộc an toàn khi tối ưu
- Cache trình duyệt và SW **chỉ** cho tài nguyên công khai và dữ liệu của người dùng hiện tại; khóa cache theo `userId` + version schema; đăng xuất xóa cache/IndexedDB của người dùng.
- Không cache response API có `Authorization` ở CDN/SW; header `Cache-Control: private, no-store` cho dữ liệu cá nhân.
- Không bỏ kiểm tra JWT/RLS để giảm độ trễ; tối ưu bằng index, batching, colocation.
- Optimistic UI không được che lỗi: thao tác bị từ chối phải hiện cho người dùng, không tự xóa.
- Prefetch tôn trọng `Save-Data`, mạng chậm và giới hạn dung lượng (`navigator.storage.estimate()`).
- Telemetry ẩn danh, lấy mẫu, không gửi nội dung học/ghi âm/văn bản tự do.

## 10. Kế hoạch giám sát
| Tín hiệu | Nguồn | Lưu ở đâu (không trả phí thêm, D-033) | Cảnh báo |
|---|---|---|---|
| LCP/INP/CLS + attribution | `web-vitals` → `POST /v1/telemetry/vitals` (lấy mẫu 10–25%) | Bảng Postgres tổng hợp theo ngày/route/lớp thiết bị | p75 vượt ngưỡng cảnh báo 3 ngày liên tiếp |
| Độ trễ API theo route | Log Fastify (`responseTime`) + `Server-Timing` | Log nền tảng (Railway) → truy vấn định kỳ; bảng tổng hợp khi cần | p95 > ngưỡng 1 giờ |
| Độ trễ DB | `pg_stat_statements` | Supabase dashboard / SQL | Truy vấn mới vào top-10 chậm |
| AI first-token, phát âm | Timing phía server + client | Bảng tổng hợp | p95 > ngưỡng |
| Sync duration, outbox length, rejected | Client gửi kèm telemetry | Bảng tổng hợp | outbox > 0 sau 10 phút với > 1% phiên |
| Tỷ lệ lỗi | Log API + `window.onerror`/unhandledrejection (ẩn danh) | Log + bảng | > 0,5% |

Báo cáo hiệu năng kèm mỗi milestone: bảng P1–P16 (đo được/chưa đo được), so với baseline trước, giải thích hồi quy.

## 11. Trade-off đã cân nhắc
| Lựa chọn | Lợi | Giá phải trả |
|---|---|---|
| Local-first (IndexedDB) | Phản hồi < 100 ms, dùng được offline | Đồng bộ phức tạp hơn; dung lượng trình duyệt có giới hạn và có thể bị xóa; Dexie +32 KB |
| Optimistic UI | Cảm giác nhanh | Phải xử lý rollback/hiển thị lỗi khi server từ chối |
| Nhận dạng chữ viết tay ở server | Bundle client nhỏ, không phân phối mã GPL | Cần mạng, thêm RTT (P16) |
| Kiểm tra schema (zod) phía client | An toàn dữ liệu | +32 KB JS |
| Service worker cache | Mở nhanh lần sau, offline | Rủi ro dữ liệu cũ → bắt buộc version + invalidation |
| Không Redis | Đơn giản, không chi phí | Rate limit/hàng đợi hiện nằm trong bộ nhớ một instance; cần xem lại khi scale ngang |
| Colocate API + DB | Ít độ trễ mỗi truy vấn | Có thể xa người dùng hơn; CDN chỉ giúp phần tĩnh |
| Throttle CPU chỉ có trên Chromium | Đo chuẩn hóa được | Firefox/WebKit chỉ báo xu hướng → cần thiết bị thật |


## 12. Điểm phải đo ngay sau deployment Preview (HTTPS)
Thực hiện khi có URL Preview (Vercel + Railway + Supabase). Ghi kết quả vào mục 5 (bảng mới "HTTPS Preview") kèm ngày, commit, region.

| # | Đo gì | Cách đo | Ai làm |
|---|---|---|---|
| H1 | LCP, CLS, JS tải lần đầu trên HTTPS | `apps/web/perf/lab-baseline.mjs` với `BASE=<URL Preview>` (cần link chia sẻ vượt Deployment Protection) — profile `desktop`, `mobile-mid` | Claude (nếu mạng cho phép) hoặc anh/chị chạy theo hướng dẫn |
| H2 | TTFB và thời gian tải trang nguội trên thiết bị thật | Safari iPhone, Android Chrome, laptop: mở trang lần đầu, ghi thời gian hiển thị (Web Inspector / DevTools nếu có) | Anh/chị |
| H3 | Độ trễ API `/health` từ thiết bị thật | 30 lần từ Wi-Fi và 4G; p50/p95 | Anh/chị (trang đo do Claude chuẩn bị ở M1) |
| H4 | Độ trễ API → Supabase | `Server-Timing` / log Railway (M1 thêm `db;dur`) | Claude đọc log anh/chị gửi |
| H5 | Upload PDF 1 MB / 10 MB | Thời gian từ chọn tệp tới nhãn LIVE | Anh/chị |
| H6 | Phản hồi tương tác trên máy thật | Event Timing (M1 thêm telemetry), tạm thời đo tay: viết chữ, lưu ghi chú | Anh/chị |
| H7 | Điều hướng giữa trang đã mở | Đồng hồ trên thiết bị / Performance panel | Anh/chị |

Chưa đo được trên Preview M0: P2, P4, P5, P6, P12, P13 (tính năng hoặc backend lưu bền chưa có), P8 ở p75 (chưa có người dùng thật).
