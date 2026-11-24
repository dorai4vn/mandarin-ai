# Checklist nghiệm thu M0-PWA trước khi merge PR #2

Ngày lập: 2026-11-24 · Commit tham chiếu: `claude/m0-pwa` HEAD (gồm bản sửa X1) · PR: https://github.com/dorai4vn/mandarin-ai/pull/2
Tiêu chí gốc: `docs/MILESTONES_CLAUDE_CODE.md` mục M0-PWA (Exit). Bước kiểm tay chi tiết: `docs/SMOKE_TEST.md`. Cấu hình: `docs/DEPLOY_PREVIEW.md`.

**Nguyên tắc:** CI chứng minh **mã** đúng trong môi trường giả lập (trình duyệt headless, micro giả, API local chế độ development, dev token, Supabase **local**). CI **không** chứng minh website thật (Vercel Preview + Railway + Supabase Cloud `mandarin-ai-dev`) hay thiết bị thật. Mỗi mục dưới đây ghi rõ đã có bằng chứng loại nào.

Ký hiệu: ✅ có bằng chứng · ⏳ cần kiểm tay trên website thật · ⚠️ cần chủ dự án quyết định · — không áp dụng.

## 0. Lỗi bảo mật X1 — ĐÃ SỬA (commit sửa: xem `docs/M0_PWA_REPORT.md`)
**Nguyên nhân gốc:** form đăng nhập ở `/lab/session` (thêm trong `80ff911`, D-038) (1) không khai báo `method` → mặc định **GET**; (2) ô nhập có thuộc tính `name="email"`/`name="password"` → trình duyệt đưa giá trị vào query string; (3) ô nhập và nút dùng được ngay khi HTML hiển thị, **trước khi React hydrate** và gắn `onSubmit` (`preventDefault`). Bấm sớm (mạng/thiết bị chậm, JS lỗi hoặc bị tắt) → trình duyệt tự gửi form → URL `/lab/session?email=…&password=…`. Phát hiện qua E2E WebKit thất bại ở lần chạy đầu (CI run 45398341533), tái hiện khi tắt JavaScript. Ngoài ra service worker cache mọi điều hướng GET theo nguyên URL → URL chứa mật khẩu có thể nằm trong Cache Storage của thiết bị.

**Cách sửa (nhiều lớp, không đổi luồng `signInWithPassword`, testid hay Supabase):**
| Lớp | Thay đổi | Tác dụng |
|---|---|---|
| 1 | Ô email, mật khẩu và nút **bị vô hiệu cho tới khi React hydrate** (`ready` đặt trong `useEffect`); nút hiện "Đang tải…" | Trước khi JS sẵn sàng không thể nhập/gửi (chuột, chạm, Enter) |
| 2 | Bỏ thuộc tính `name` (giữ `id`, `autocomplete="username"`/`current-password"` cho trình quản lý mật khẩu) | Nếu form vẫn bị gửi gốc (ví dụ ai đó gỡ `disabled`), trình duyệt **không tuần tự hóa** giá trị nào |
| 3 | `method="post"`, không có handler phía server | Không bao giờ có query string từ form; request rỗng, không phản chiếu/ghi mật khẩu |
| 4 | `<noscript>` "Cần bật JavaScript để đăng nhập." | Không có fallback không-JS; từ chối rõ ràng |
| 5 | Service worker: không cache điều hướng có query string; tăng phiên bản cache `m0-pwa-1` → `m0-pwa-2` | Xóa mọi cache điều hướng cũ trên thiết bị khi SW mới kích hoạt (gồm URL lộ, nếu có) |

**Kiểm thử:** `e2e/auth-credential-leak.spec.ts` (5 test × 9 project) — JS tắt: form vô hiệu, bấm/chạm/Enter không điều hướng, không request Auth, URL sạch; hydrate bị giữ chậm: như trên + **giả lập gỡ `disabled` rồi submit gốc** → request POST, không query, body không chứa email/mật khẩu; sau khi sẵn sàng: đăng nhập bằng chạm (mobile/tablet), Enter (desktop), click → đúng 1 request password grant, URL sạch; Enter trong ô mật khẩu vẫn đăng nhập. `e2e/pwa.spec.ts`: SW không cache URL có query, chỉ còn cache `m0-pwa-2`. CI thêm bước lặp test Auth **×5, không retry** trên Chromium/Firefox/WebKit. Trên code cũ, 4/5 test mới FAIL (đã kiểm).

### Rà soát phơi nhiễm
- **Khoảng thời gian có lỗi:** chỉ từ `80ff911` (2026-11-24 12:03 UTC) tới commit sửa. Form OTP trước đó không có `name` → submit gốc không mang dữ liệu.
- **CI/E2E:** chỉ dùng mật khẩu giả tới host giả `supabase-e2e.invalid` — không có mật khẩu thật.
- **Preview thật:** Claude **không có quyền đọc** log Vercel/Railway hay lịch sử trình duyệt nên **không thể khẳng định** đã xảy ra hay chưa. Chỉ xảy ra nếu ai đó mở `/lab/session` trên bản Preview build từ `80ff911`–`da5869e` và bấm Đăng nhập **trước khi trang tải xong JS**. Preview có Vercel Deployment Protection → chỉ thành viên team Vercel truy cập được.
- **Nơi URL có thể còn lại:** lịch sử/gợi ý thanh địa chỉ của trình duyệt trên thiết bị đó; Cache Storage của service worker (được xóa khi SW `m0-pwa-2` kích hoạt); log request của Vercel (có thể ghi đường dẫn kèm query). **Không** gửi sang Supabase/Railway qua `Referer` vì `Referrer-Policy: strict-origin-when-cross-origin` chỉ gửi origin khi khác site. Không có analytics.

### Giảm thiểu (chủ dự án làm; không gửi mật khẩu qua chat)
1. Vercel → Project → **Logs**: lọc đường dẫn `/lab/session` có chuỗi `password=` trong khoảng thời gian từ 12:03 UTC 2026-11-24 (log Vercel chỉ giữ trong thời gian giới hạn theo gói). Có kết quả → coi mật khẩu đó đã lộ.
2. **Đổi mật khẩu tạm** của mọi tài khoản thử nghiệm đã đăng nhập trên Preview trong khoảng thời gian trên (cách đơn giản và chắc chắn nhất, kể cả khi không kiểm được log): xóa và tạo lại theo `docs/ACCESS_CONTROL.md` mục 8.
3. Trên thiết bị đã dùng để thử: xóa lịch sử duyệt web của URL Preview; mở lại app khi có mạng để SW mới xóa cache cũ (hoặc xóa dữ liệu trang web).
4. Không dùng mật khẩu thật (dùng ở nơi khác) cho tài khoản thử nghiệm.

## A. Đã có kết quả CI (run 45394939456 trên `0867d49`, 6/6 job xanh)
| # | Hạng mục | Bằng chứng CI | Giới hạn của bằng chứng |
|---|---|---|---|
| A1 | Lint, typecheck, format, 96 unit test, build, Docker image web + API | Job *Lint · Typecheck · Test · Build* | — |
| A2 | Không có secret trong file được commit; tách lớp package | `check:secrets` (212 file), `check:deps` | Chỉ quét file git |
| A3 | Không có secret server trong bundle trình duyệt | Build thủ công 2026-11-24 với giá trị mồi cho `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `OPENAI_API_KEY`, `AZURE_SPEECH_KEY` → **0** lần xuất hiện trong `.next` | Kiểm tại máy build, chưa phải bước CI (đề xuất thêm vào CI ở PR UI-1) |
| A4 | Đăng nhập email + mật khẩu trên **Supabase Auth thật (GoTrue local)**, không dev token, không Mailpit | Job *database*: 10/10 — signup 422 `signup_disabled`; anonymous 422 `anonymous_provider_disabled`; user do admin tạo đăng nhập 200 (JWT `authenticated`); sai mật khẩu = email lạ = 400 `invalid_credentials`; mật khẩu 11 ký tự 422 `weak_password`; không tạo tài khoản thừa | GoTrue **local** theo `config.toml`, không phải dự án Cloud |
| A5 | Giao diện đăng nhập không có đăng ký, lỗi chung, mật khẩu không lưu ở web storage; **X1: thông tin đăng nhập không bao giờ vào URL** (JS tắt, hydrate chậm, submit gốc cưỡng bức) | E2E `auth-invite-only.spec.ts` + `auth-credential-leak.spec.ts` × 9 project, thêm bước lặp ×5 không retry | Chặn request tới host giả — chỉ hành vi client |
| A6 | Migration từ đầu, RLS `profiles` | Job *database*: `db reset`, pgTAP 9/9, `db lint` | Supabase local |
| A7 | Responsive: đúng điều hướng theo viewport, không cuộn ngang, desktop không phải layout điện thoại kéo giãn, điều hướng bằng bàn phím | E2E `layout.spec.ts` 390×844 / 820×1180 / 1440×900 × Chromium/Firefox/WebKit | Trình duyệt headless; breakpoint hiện tại của D-030 (768/1280) |
| A8 | Canvas viết: chạm, chuột, bút (mô phỏng), nhận dạng 山, chữ khác không bị chấm đúng, chưa đăng nhập có thông báo | E2E `handwriting.spec.ts` | Nhận dạng chạy bằng HanziLookup **chế độ development**; trên Preview/production nhận dạng **TẮT** (D-029) |
| A9 | Micro: ghi từ micro giả → WAV 16 kHz mono; từ chối quyền → hướng dẫn; không có getUserMedia → thông báo | E2E `audio.spec.ts` (Chromium, Firefox có PulseAudio) | WebKit headless không có micro giả → **Safari phải kiểm tay** |
| A10 | PDF ≤ **50 MB** (D-040): chọn tệp, kiểm `%PDF-`, tệp giả bị từ chối, kéo-thả desktop; 20 / 49 / đúng 50 MiB qua trình duyệt → API; 50 MiB + 1 và 60 MiB bị từ chối không gửi request; API 413/422/401-trước-body; **Supabase Storage local thật**: 20/49/50 MiB lưu được, 50 MiB + 1 → 413, bucket private | E2E `upload.spec.ts`, `upload-limits.spec.ts`; unit API; job *database* `test-storage-upload-limit.mjs` | Lưu trữ E2E là **in-memory development**; Storage **Cloud** (giới hạn theo gói/dự án) chỉ kiểm tay ở B7 |
| A11 | Offline/IndexedDB: ghi offline → đóng tab → mở lại → gửi đúng một lần; mất phản hồi → chống trùng; không có IndexedDB → bộ nhớ tạm; thao tác bị từ chối hiện lỗi, không "đã đồng bộ" (G1) | E2E `offline.spec.ts` | Server sync là **mock development**; trên Preview sync **TẮT** (D-035) |
| A12 | PWA: manifest hợp lệ, cài đặt tùy chọn, service worker đăng ký, app shell offline | E2E `pwa.spec.ts` | WebKit chỉ kiểm precache; điều hướng offline trên Safari phải kiểm tay (B10) |
| A13 | Realtime: yêu cầu khóa tạm thời hiển thị MOCK khi không có khóa | E2E `realtime.spec.ts` | Không có khóa OpenAI thật |
| A14 | Phát hiện khả năng trình duyệt | E2E `capabilities.spec.ts` | — |
| A15 | API: JWT theo thuật toán (D-036), CORS theo origin, rate limit, từ chối cấu hình không an toàn ở preview/production | 31 unit test API | Không gọi Railway thật |
| A16 | Performance baseline lab | `docs/PERFORMANCE.md` mục 5 (localhost) | Không phải HTTPS thật; đạt mục tiêu **không** phải tiêu chí M0 |

## B. Cần kiểm tay trên website thật (Vercel Preview + Railway + `mandarin-ai-dev`)
Ghi cho mỗi thiết bị: tên máy, hệ điều hành + phiên bản, trình duyệt + phiên bản, URL Preview, commit hiển thị trên Vercel, ngày giờ, ĐẠT/KHÔNG ĐẠT + ảnh khi không đạt. Thiết bị tối thiểu: **iPhone Safari thật** + **một trình duyệt desktop thật** (khuyến nghị thêm Chrome Android).

### B1. Cấu hình trước khi kiểm (chủ dự án, trên dashboard; không gửi khóa qua chat)
- [ ] Supabase `mandarin-ai-dev` → Authentication: *Allow new users to sign up* **TẮT**, *Allow anonymous sign-ins* **TẮT**, Email **BẬT**, *Secure password change* **TẮT**, độ dài mật khẩu tối thiểu **12**.
- [ ] Tạo 1–2 tài khoản thử nghiệm: *Create new user* + mật khẩu tạm ngẫu nhiên ≥ 12 ký tự + *Auto Confirm User*. Xóa tài khoản cũ tạo cho OTP (không có mật khẩu).
- [ ] Storage: bucket `documents` **private**; Storage → Settings → **Upload file size limit ≥ 50 MB** (gói Free tối đa 50 MB); bucket `documents` → *Restrict file upload size* = **50 MB** và *Allowed MIME types* = `application/pdf` (khuyến nghị, D-040).
- [ ] Railway (`mandarin-ai-preview`): `APP_ENV=preview`, `TRUST_PROXY=true`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `WEB_ORIGINS` = URL Vercel của branch; **không** đặt `HANDWRITING_ADAPTER=hanzilookup`; `ALLOW_MOCKS_IN_PREVIEW` chỉ bật nếu muốn thấy nhãn MOCK cho Azure/Realtime.
- [ ] Vercel: biến `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` có tick **Preview**; **không** có `NEXT_PUBLIC_ENABLE_DEV_TOKEN` hay `NEXT_PUBLIC_ALLOW_MOCK_SYNC`; Deployment Protection bật; Preview đã build từ HEAD mới nhất của `claude/m0-pwa`.

### B2. Railway API healthcheck
- [ ] Mở `https://<api-railway>/health` → `status: "ok"`, `environment: "preview"`, `auth: ["jwks"]` (thêm `"hs256"` chỉ khi còn đặt `SUPABASE_JWT_SECRET`), `providers.handwriting: "disabled"` (hoặc `"mock"` nếu bật `ALLOW_MOCKS_IN_PREVIEW`), `providers.sync: "disabled"`, `providers.storage: "live"` (khi đã đặt secret key), `openaiRealtime`/`azureSpeech`: `"disabled"` hoặc `"mock"`.
- [ ] Gọi một endpoint cần đăng nhập không kèm token (ví dụ `POST /v1/sync/push`) → **401**.
- [ ] Từ một origin lạ (ví dụ DevTools console trên trang khác) → không có header CORS cho phép.

### B3. Đăng nhập (D-037, D-038) — SMOKE_TEST A12–A12d, B11, C7
- [ ] Email đã cấp + mật khẩu đúng → "Đã đăng nhập" (desktop, iPhone tab Safari, iPhone app đã cài, Android).
- [ ] Email đã cấp + mật khẩu sai → "Email hoặc mật khẩu không đúng."; ô mật khẩu bị xóa.
- [ ] Email chưa cấp → **cùng** thông báo; Supabase → Users không có user mới.
- [ ] Không có nút/đường dẫn "Đăng ký"; `/signup`, `/register` → 404.
- [ ] Chặn đăng ký trực tiếp qua Auth API bằng publishable key (A12b) → `signup_disabled`. (Lệnh mẫu do Claude cung cấp khi cần; chỉ dùng publishable key.)
- [ ] DevTools → Application → Local/Session Storage: **không** có mật khẩu (có phiên Supabase — giới hạn M0 đã biết).

### B4. Responsive và trình duyệt — SMOKE_TEST A1–A3, B1–B2, B4, C1
- [ ] Desktop (Chrome/Edge, và Safari hoặc Firefox nếu có): ≥ 1280 sidebar; thu hẹp → rail (768–1279) → tab bar (< 768); không cuộn ngang; Tab/Enter điều hướng được.
- [ ] iPhone Safari: tab bar dưới, không bị tai thỏ che, xoay ngang/dọc không vỡ; ô nhập không tự phóng to.
- [ ] Tablet (nếu có iPad/Android tablet): rail.

### B5. Canvas viết chữ Hán — A5, A15, B3, C2
- [ ] Viết bằng chuột (desktop), ngón tay (iPhone/Android), bút (nếu có): nét mượt, trang **không cuộn/zoom** khi viết, hiển thị đúng loại thiết bị nhập.
- [ ] Nộp khi đã đăng nhập → thông báo "chưa được cấu hình" (nhận dạng tắt trên Preview — đúng thiết kế, D-029).

### B6. Micro/audio — A7, A8, A16, B5, B6, C3
- [ ] Desktop Chrome/Edge và **iPhone Safari**: bấm ghi → hộp thoại quyền của trình duyệt → cho phép → ghi 2 s → "WAV 16000 Hz · 1 kênh · 16-bit" → nghe lại, thử 0.5×.
- [ ] Từ chối quyền → thông báo + hướng dẫn bật lại; cấp lại quyền → ghi được.
- [ ] Gửi chấm / xin khóa Realtime → "chưa được cấu hình" hoặc nhãn MOCK (không có khóa thật).

### B7. PDF precheck và lưu trữ (giới hạn 50 MB — D-040) — A9, A14, B7, C4
Chuẩn bị 3 tệp: một PDF thật nhỏ (< 5 MB), một PDF thật **gần 50 MB** (45–49,9 MB; hoặc đúng 52.428.800 byte nếu có) và một PDF **lớn hơn 50 MB**; thêm một tệp `.txt` đổi tên `.pdf`. Ghi kích thước chính xác (byte) và thời gian gửi.
- [ ] Đã đăng nhập, PDF nhỏ (chọn tệp; kéo-thả trên desktop; ứng dụng Tệp trên iPhone) → nhãn LIVE, đường dẫn `…/imports/….pdf`; tệp có trong bucket private `documents` (Supabase → Storage), kích thước khớp.
- [ ] PDF **gần 50 MB** trên desktop (Wi-Fi) và iPhone/Android (4G nếu được) → hiện "Đang gửi <tên> · <x> MB"; trang **không đơ**; gửi xong nhãn LIVE; tệp có trong bucket với đúng kích thước; ghi thời gian gửi.
- [ ] PDF **> 50 MB** → thông báo nêu tên tệp, dung lượng (MB + byte) và giới hạn 50 MB (52.428.800 byte); **không** có request tới API (DevTools → Network).
- [ ] Tệp `.txt` đổi tên `.pdf` → "Tệp không phải PDF".
- [ ] Nếu PDF gần 50 MB bị Storage Cloud từ chối (thông báo "Tệp vượt giới hạn 50 MB mỗi tệp PDF" dù tệp ≤ 50 MB) → giới hạn Storage của dự án đang < 50 MB: sửa ở Storage → Settings rồi thử lại.
- [ ] Nếu gửi thất bại trên 4G chậm (hết 5 phút hoặc rớt mạng) → ghi lại; đây là giới hạn đã biết của upload một request (resumable ở M4, `docs/PDF_UPLOAD.md` mục 3).

### B8. Offline/IndexedDB — A10, A13, B8, C5
- [ ] Lưu ghi chú khi offline (DevTools Offline / Chế độ máy bay) → đóng hẳn trình duyệt → mở lại → ghi chú còn, "chờ" đúng số.
- [ ] Có mạng lại + đã đăng nhập → "Đồng bộ ngay": **trên Preview sync TẮT** → chip hiện **"Lưu trên thiết bị"** (màu trung tính, không phải lỗi), trang Offline và Trang chủ hiện "Dữ liệu đã lưu trên thiết bị. Đồng bộ đám mây chưa được kích hoạt."; thao tác vẫn "chờ" (không bao giờ "Đã đồng bộ"), không mất dữ liệu (D-035); Network **không** có `POST /v1/sync/push` (chỉ `GET /health` 200). Đồng bộ thật thuộc M1.

### B9. PWA (tùy chọn) — A11, B9, B10, C6
- [ ] Cài đặt (Chrome/Edge; iPhone *Thêm vào MH chính*) → mở từ icon chạy standalone; **không cài vẫn dùng được**.
- [ ] iPhone app đã cài, bật Chế độ máy bay → mở lại → trang chủ vẫn hiện (B10 — bắt buộc kiểm tay).

### B10. Console và bảo mật trên website thật
- [ ] Mở DevTools Console trên desktop (Chrome) ở các trang: Trang chủ, Phiên đăng nhập, Viết, Micro, PDF, Offline → **không có lỗi đỏ**. Từ commit sửa sync (xem `docs/M0_PWA_REPORT.md`), app không còn gọi `POST /v1/sync/push` khi `/health` báo `sync: disabled` → không còn 503 sync. Chỉ chấp nhận: 401 khi gọi API chưa đăng nhập, 503 khi bấm chức năng chưa cấu hình (chấm phát âm, Realtime, nộp chữ viết) — ghi lại nếu có lỗi khác.
- [ ] DevTools → Sources/Network: tìm chuỗi `sb_secret_` trong JavaScript tải về → chỉ xuất hiện trong code thư viện kiểm tra tiền tố, **không** có khóa thật; không có `service_role`/khóa OpenAI/Azure.
- [ ] Network: request tới Supabase chỉ dùng publishable key; request tới API dùng `Authorization: Bearer <access token>`.

## C. Đối chiếu tiêu chí thoát M0-PWA (MILESTONES)
| Tiêu chí | Trạng thái | Còn thiếu |
|---|---|---|
| E2E xanh Chromium/Firefox/WebKit × mobile/tablet/desktop trong CI | ✅ | — |
| Performance budget có baseline lab | ✅ (`PERFORMANCE.md` mục 5) | Baseline HTTPS thật: chưa (không bắt buộc cho M0) |
| Không có secret trong bundle client | ✅ (A3) + ⏳ B10 | Xác nhận trên website thật |
| Spike 1 Canvas | ✅ CI · ⏳ thiết bị thật (B5) | iPhone + desktop thật |
| Spike 2 Nhận dạng: báo cáo đo + chủ dự án chọn adapter và giấy phép | ✅ **Đóng ở M0 với trạng thái BLOCKED** (chủ dự án quyết định 2026-11-24) | Đánh giá giấy phép và chọn adapter chuyển sang **M5** (D-029); nhận dạng giữ **TẮT** trên Preview/production |
| Spike 3 Micro + Azure | ✅ CI ghi âm (Chromium/Firefox) · ⏳ Safari thật (B6) · ✅ Azure **chưa kích hoạt** trong M0 (chủ dự án chấp nhận 2026-11-24) | Trên Preview: `disabled` (503) hoặc `mock` nếu bật `ALLOW_MOCKS_IN_PREVIEW` — không bao giờ ghi là live |
| Spike 4 OpenAI Realtime | ✅ CI (MOCK) · ✅ **chưa kích hoạt** trong M0 (chủ dự án chấp nhận) | Như trên: `disabled`/`mock`, phân biệt theo `/health` |
| Spike 5 PDF | ✅ CI · ⏳ B7 (Storage thật) | — |
| Spike 6 IndexedDB + outbox | ✅ CI · ⏳ B8 | Đồng bộ thật là M1 (đã thống nhất D-035) |
| Spike 7 PWA tùy chọn | ✅ CI · ⏳ B9 (B10 Safari) | — |
| Spike 8 Auth email + mật khẩu, không đăng ký | ✅ CI (GoTrue thật local + client) · ⏳ B3 trên Cloud | Bằng chứng trên `mandarin-ai-dev` + iPhone app đã cài |
| Spike 9 Responsive | ✅ CI · ⏳ B4 | — |

**Đủ điều kiện nghiệm thu dựa trên CI (chờ xác nhận trên thiết bị thật):** spike 1, 5, 6, 7, 8, 9 về mặt mã; spike 2 đóng BLOCKED; spike 3–4 chấp nhận chưa kích hoạt; tiêu chí CI và performance baseline; X1 đã sửa. **Chưa đủ:** mọi bằng chứng trên website/thiết bị thật (B1–B10).

## D. Các bước chính xác trước khi cho phép merge
0. ✅ X1 đã sửa — CI phải xanh 6/6 trên HEAD (xem báo cáo). Làm các bước *Giảm thiểu* ở mục 0.
1. Hoàn tất B1 (cấu hình) và chạy B2–B10 trên **iPhone Safari thật** và **một desktop thật**; gửi kết quả theo mẫu (thiết bị/phiên bản/URL/commit/ĐẠT–KHÔNG ĐẠT + ảnh lỗi). Claude tổng hợp vào `docs/M0_PWA_REPORT.md`.
2. ✅ Spike 2: đóng BLOCKED, chuyển M5 (đã quyết định).
3. ✅ Azure + Realtime: chấp nhận chưa kích hoạt trong M0 (đã quyết định).
4. Xác nhận các giới hạn đã biết chuyển sang M1: chưa có `app_members`, chưa bắt buộc đổi mật khẩu, phiên trong `localStorage`, sync server TẮT trên Preview, access token sống ≤ 1 giờ sau khi khóa.
5. **Chuẩn bị deploy trước khi merge** (merge vào `main` có thể kích hoạt build mới):
   - Vercel: `main` thường là *Production Branch* → merge sẽ tạo **Production deployment** dùng biến phạm vi Production (đang để trống theo DEPLOY_PREVIEW). Chưa có production → chọn một: (i) Settings → Git → *Ignored Build Step* bỏ qua build production, hoặc (ii) chấp nhận một bản production không cấu hình (chỉ hiện BLOCKED, không có secret) và bật Deployment Protection cho cả production. Khuyến nghị (i).
   - Railway: service đang theo branch `claude/m0-pwa`. Giữ branch này (không xóa sau merge) hoặc đổi sang `main` sau khi merge; không cần đổi gì nếu giữ branch.
6. Kiểm tra lần cuối trên PR #2: CI của HEAD xanh 6/6; không có commit mới chưa qua CI; mô tả PR khớp nội dung.
7. Chủ dự án tự bấm merge trên GitHub (Claude không merge). Khuyến nghị **"Create a merge commit"** để giữ lịch sử từng bước có CI (hoặc *Squash* nếu muốn `main` gọn — chủ dự án chọn).
8. Sau merge: đóng PR #1 (M0 native, đã được thay bởi hướng web — D-018) **không merge**; xác nhận Preview/Railway vẫn chạy; báo Claude để bắt đầu PR UI-1 (Design System V2) từ `main`.

## E. Sau merge — PR đầu tiên của Design System V2 (đề xuất)
Xem `docs/design/UI_MIGRATION_PLAN.md`. PR UI-1 = **Tokens & fonts (Light)**, nhánh mới từ `main`:
- `src/design/tokens.css` (bộ token **Light** V2), ánh xạ `@theme inline`, alias token M0 để toàn app đổi màu trong một bước; thay `seal` theo nghĩa (thương hiệu → `primary`, lỗi → `error`) ở 21 chỗ.
- Inter (subset `latin`, `latin-ext`, `vietnamese`) + Noto Sans SC (`preload: false`) qua `next/font`; `HanziText`/`Pinyin` với `lang`.
- `scripts/check-contrast.mjs` + bước CI; thêm bước CI quét bundle với giá trị mồi (A3).
- Test: toàn bộ E2E hiện có không sửa; test hiển thị pinyin/tiếng Việt/Hanzi trên 3 engine; đo kích thước font/JS so với budget.
- **Không** đổi bố cục, điều hướng, breakpoint (đó là PR UI-3), không dark mode (giai đoạn riêng), không logo.
