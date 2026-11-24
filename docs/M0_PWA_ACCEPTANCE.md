# Checklist nghiệm thu M0-PWA trước khi merge PR #2

Ngày lập: 2026-11-24 · Commit tham chiếu: `claude/m0-pwa` HEAD (code giống `80ff911`; các commit sau chỉ là tài liệu) · PR: https://github.com/dorai4vn/mandarin-ai/pull/2
Tiêu chí gốc: `docs/MILESTONES_CLAUDE_CODE.md` mục M0-PWA (Exit). Bước kiểm tay chi tiết: `docs/SMOKE_TEST.md`. Cấu hình: `docs/DEPLOY_PREVIEW.md`.

**Nguyên tắc:** CI chứng minh **mã** đúng trong môi trường giả lập (trình duyệt headless, micro giả, API local chế độ development, dev token, Supabase **local**). CI **không** chứng minh website thật (Vercel Preview + Railway + Supabase Cloud `mandarin-ai-dev`) hay thiết bị thật. Mỗi mục dưới đây ghi rõ đã có bằng chứng loại nào.

Ký hiệu: ✅ có bằng chứng · ⏳ cần kiểm tay trên website thật · ⚠️ cần chủ dự án quyết định · — không áp dụng.

## 0. Lỗi chặn nghiệm thu (phát hiện 2026-11-24, CI run 45398341533)
| # | Lỗi | Bằng chứng | Mức độ | Đề xuất sửa (chờ chủ dự án cho phép sửa code) |
|---|---|---|---|---|
| X1 | Form đăng nhập `/lab/session` không có `method` và nút bấm được **trước khi React hydrate**. Bấm sớm → trình duyệt gửi form kiểu HTML gốc (GET) → **email và mật khẩu nằm trên URL** (lịch sử trình duyệt, log Vercel, Referer) và không gọi `signInWithPassword` | (1) CI `0b8299a`: E2E WebKit tablet "wrong password and unknown e-mail…" FAIL lần đầu (không có thông báo lỗi), PASS khi chạy lại → job FAIL do `failOnFlakyTests`. (2) Tái hiện tại máy với JavaScript tắt: sau khi bấm, URL = `/lab/session?email=…&password=…` | **Cao** (lộ mật khẩu khi mạng/thiết bị chậm) | (a) `method="post"` + `action` trỏ về chính trang để submit gốc không bao giờ đưa mật khẩu lên URL; (b) ô nhập và nút **vô hiệu cho tới khi hydrate xong** (cùng cách đã sửa form offline trước đây); (c) E2E mới: submit khi JS tắt → URL không chứa `password`; chạy `--repeat-each` trên 3 engine. Không đổi `auth-password.ts`, testid hay luồng Supabase |

Mục X1 phải được sửa và CI xanh trở lại trước khi merge. Các commit trước (`80ff911`, `0867d49`) xanh vì race này không xảy ra ở các lần chạy đó — lỗi có từ `80ff911` (D-038).

## A. Đã có kết quả CI (run 45394939456 trên `0867d49`, 6/6 job xanh)
| # | Hạng mục | Bằng chứng CI | Giới hạn của bằng chứng |
|---|---|---|---|
| A1 | Lint, typecheck, format, 96 unit test, build, Docker image web + API | Job *Lint · Typecheck · Test · Build* | — |
| A2 | Không có secret trong file được commit; tách lớp package | `check:secrets` (212 file), `check:deps` | Chỉ quét file git |
| A3 | Không có secret server trong bundle trình duyệt | Build thủ công 2026-11-24 với giá trị mồi cho `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `OPENAI_API_KEY`, `AZURE_SPEECH_KEY` → **0** lần xuất hiện trong `.next` | Kiểm tại máy build, chưa phải bước CI (đề xuất thêm vào CI ở PR UI-1) |
| A4 | Đăng nhập email + mật khẩu trên **Supabase Auth thật (GoTrue local)**, không dev token, không Mailpit | Job *database*: 10/10 — signup 422 `signup_disabled`; anonymous 422 `anonymous_provider_disabled`; user do admin tạo đăng nhập 200 (JWT `authenticated`); sai mật khẩu = email lạ = 400 `invalid_credentials`; mật khẩu 11 ký tự 422 `weak_password`; không tạo tài khoản thừa | GoTrue **local** theo `config.toml`, không phải dự án Cloud |
| A5 | Giao diện đăng nhập không có đăng ký, lỗi chung, mật khẩu không lưu ở web storage | E2E `auth-invite-only.spec.ts` × 9 project (3 engine × 3 viewport) | Chặn request tới host giả — chỉ hành vi client |
| A6 | Migration từ đầu, RLS `profiles` | Job *database*: `db reset`, pgTAP 9/9, `db lint` | Supabase local |
| A7 | Responsive: đúng điều hướng theo viewport, không cuộn ngang, desktop không phải layout điện thoại kéo giãn, điều hướng bằng bàn phím | E2E `layout.spec.ts` 390×844 / 820×1180 / 1440×900 × Chromium/Firefox/WebKit | Trình duyệt headless; breakpoint hiện tại của D-030 (768/1280) |
| A8 | Canvas viết: chạm, chuột, bút (mô phỏng), nhận dạng 山, chữ khác không bị chấm đúng, chưa đăng nhập có thông báo | E2E `handwriting.spec.ts` | Nhận dạng chạy bằng HanziLookup **chế độ development**; trên Preview/production nhận dạng **TẮT** (D-029) |
| A9 | Micro: ghi từ micro giả → WAV 16 kHz mono; từ chối quyền → hướng dẫn; không có getUserMedia → thông báo | E2E `audio.spec.ts` (Chromium, Firefox có PulseAudio) | WebKit headless không có micro giả → **Safari phải kiểm tay** |
| A10 | PDF: chọn tệp, kiểm tra loại/`%PDF-`, tệp giả bị từ chối, kéo-thả desktop | E2E `upload.spec.ts` | Lưu trữ **in-memory development**; Supabase Storage thật chưa kiểm trong CI |
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
- [ ] Storage: bucket `documents` **private**.
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

### B7. PDF precheck và lưu trữ — A9, A14, B7, C4
- [ ] PDF thật (chọn tệp; kéo-thả trên desktop; ứng dụng Tệp trên iPhone) → sau khi đăng nhập: nhãn LIVE, đường dẫn `…/imports/….pdf`; tệp có trong bucket private `documents`.
- [ ] Tệp `.txt` đổi tên `.pdf` → "Tệp không phải PDF"; tệp quá lớn → bị từ chối.

### B8. Offline/IndexedDB — A10, A13, B8, C5
- [ ] Lưu ghi chú khi offline (DevTools Offline / Chế độ máy bay) → đóng hẳn trình duyệt → mở lại → ghi chú còn, "chờ" đúng số.
- [ ] Có mạng lại + đã đăng nhập → "Đồng bộ ngay": **trên Preview sync TẮT** → thao tác vẫn "chờ" (không bao giờ hiện "Đã đồng bộ"), không mất dữ liệu (D-035). Đồng bộ thật thuộc M1.

### B9. PWA (tùy chọn) — A11, B9, B10, C6
- [ ] Cài đặt (Chrome/Edge; iPhone *Thêm vào MH chính*) → mở từ icon chạy standalone; **không cài vẫn dùng được**.
- [ ] iPhone app đã cài, bật Chế độ máy bay → mở lại → trang chủ vẫn hiện (B10 — bắt buộc kiểm tay).

### B10. Console và bảo mật trên website thật
- [ ] Mở DevTools Console trên desktop (Chrome) ở các trang: Trang chủ, Phiên đăng nhập, Viết, Micro, PDF, Offline → **không có lỗi đỏ** ngoài lỗi mạng mong đợi (ví dụ 503 sync trên Preview, 401 khi chưa đăng nhập). Ghi lại nếu có. iPhone: Safari Web Inspector (nếu có Mac) — tùy chọn.
- [ ] DevTools → Sources/Network: tìm chuỗi `sb_secret_` trong JavaScript tải về → chỉ xuất hiện trong code thư viện kiểm tra tiền tố, **không** có khóa thật; không có `service_role`/khóa OpenAI/Azure.
- [ ] Network: request tới Supabase chỉ dùng publishable key; request tới API dùng `Authorization: Bearer <access token>`.

## C. Đối chiếu tiêu chí thoát M0-PWA (MILESTONES)
| Tiêu chí | Trạng thái | Còn thiếu |
|---|---|---|
| E2E xanh Chromium/Firefox/WebKit × mobile/tablet/desktop trong CI | ✅ | — |
| Performance budget có baseline lab | ✅ (`PERFORMANCE.md` mục 5) | Baseline HTTPS thật: chưa (không bắt buộc cho M0) |
| Không có secret trong bundle client | ✅ (A3) + ⏳ B10 | Xác nhận trên website thật |
| Spike 1 Canvas | ✅ CI · ⏳ thiết bị thật (B5) | iPhone + desktop thật |
| Spike 2 Nhận dạng: báo cáo đo + **chủ dự án chọn adapter và giấy phép** | ⚠️ | D-029 **chưa duyệt** cho production; nhận dạng TẮT trên Preview. Cần quyết định: (a) chấp nhận đóng M0 với spike 2 = "BLOCKED — chờ quyết định giấy phép", chuyển việc chọn adapter sang M5; hoặc (b) giữ M0 mở tới khi quyết định |
| Spike 3 Micro + Azure | ✅ CI (Chromium/Firefox) · ⏳ Safari thật (B6) · ⚠️ Azure **MOCKED/TẮT** cần chủ dự án chấp thuận | Chấp thuận "MOCKED" vì chưa có khóa |
| Spike 4 OpenAI Realtime | ✅ CI (MOCK) · ⚠️ chấp thuận MOCKED | Như trên |
| Spike 5 PDF | ✅ CI · ⏳ B7 (Storage thật) | — |
| Spike 6 IndexedDB + outbox | ✅ CI · ⏳ B8 | Đồng bộ thật là M1 (đã thống nhất D-035) |
| Spike 7 PWA tùy chọn | ✅ CI · ⏳ B9 (B10 Safari) | — |
| Spike 8 Auth email + mật khẩu, không đăng ký | ✅ CI (GoTrue thật local + client) · ⏳ B3 trên Cloud | Bằng chứng trên `mandarin-ai-dev` + iPhone app đã cài |
| Spike 9 Responsive | ✅ CI · ⏳ B4 | — |

**Đủ điều kiện nghiệm thu dựa trên CI (chờ xác nhận trên thiết bị thật):** 1, 5, 6, 7, 8, 9 về mặt mã; tiêu chí CI và performance baseline. **Chưa đủ:** mọi bằng chứng thiết bị thật (B1–B10), quyết định spike 2, chấp thuận MOCKED cho spike 3–4.

## D. Các bước chính xác trước khi cho phép merge
0. **Cho phép sửa lỗi X1 (mục 0)**; Claude sửa, CI phải xanh 6/6 trên HEAD.
1. Hoàn tất B1 (cấu hình) và chạy B2–B10 trên **iPhone Safari thật** và **một desktop thật**; gửi kết quả theo mẫu (thiết bị/phiên bản/URL/commit/ĐẠT–KHÔNG ĐẠT + ảnh lỗi). Claude tổng hợp vào `docs/M0_PWA_REPORT.md`.
2. Quyết định spike 2 (D-029) theo mục C — (a) hoặc (b).
3. Xác nhận chấp thuận Azure và OpenAI Realtime ở trạng thái **MOCKED** cho M0.
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
