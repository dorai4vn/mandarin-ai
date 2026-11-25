# M1 — Báo cáo (bản đơn giản hóa, D-042)

Ngày: 2026-11-25 · Nhánh: `claude/serene-feynman-joougp` · Phạm vi: `docs/MILESTONES_CLAUDE_CODE.md` mục M1 (tiêu chí mới theo D-042).

## Đã làm
- **Tài liệu:**
  - D-042 trong `DECISIONS.md`; D-037, D-038 và D-022 được đánh dấu là bị thay một phần.
  - Viết lại `ACCESS_CONTROL.md` và `AUTH_SESSION_DESIGN.md`.
  - Cập nhật PRD, ARCHITECTURE, MILESTONES (tiêu chí M1 mới), RELEASE_CHECKLIST, DEPLOY_PREVIEW, FEATURES, PERFORMANCE và SMOKE_TEST (mục M1).
- **Database:** migration `20261125100000_m1_sync_operations.sql`.
  - `sync_operations`: `operation_id` duy nhất, RLS chủ sở hữu (chỉ select và insert), không cho update/delete, có index `(user_id, server_seq)`.
  - `sync_push()` chạy `SECURITY INVOKER` và dùng advisory lock theo người dùng.
- **API:**
  - `SupabaseSyncStore` gọi PostgREST bằng **JWT của người dùng** cùng publishable key; không dùng secret key cho dữ liệu học.
  - Thêm `GET /v1/sync/pull`.
  - Database từ chối token → API trả 401.
  - Biến mới `SUPABASE_PUBLISHABLE_KEY`.
- **Web:**
  - Đăng nhập:
    - Trang `/login` (hỗ trợ `?next=`, chỉ nhận đường dẫn nội bộ).
    - `LoginForm` dùng chung với `/lab/session`, giữ đủ các lớp bảo vệ X1.
    - `AuthProvider` dùng phiên chính thức của `supabase-js`.
  - Đăng xuất (Hồ sơ → Tài khoản):
    - Thử gửi phần còn chờ; nếu vẫn còn thì hỏi xác nhận.
    - Xóa IndexedDB của tài khoản, kết thúc phiên rồi tải lại trang.
  - Dữ liệu cục bộ: IndexedDB riêng cho từng tài khoản (`mandarin-ai:<userId>`).
  - Khi chưa đăng nhập:
    - `RequireAuth` chặn trang có dữ liệu riêng;
    - chỉ báo đồng bộ hiện "Chưa đăng nhập".
  - Đồng bộ: pull hai chiều (thiết bị khác của cùng tài khoản nhận lại thay đổi).
  - Hiệu năng: SDK Supabase tải lười, người chưa đăng nhập không tải (G2).
- **Bỏ theo D-042:** PR #20 và #21 (membership `app_members`, `is_active_member`, audit, cổng API, `e2e-server`, thu hồi theo `iat`) đóng, không merge. Không giữ lại phần code nào vì mọi phần đều phục vụ lớp membership đã bỏ. Ý tưởng "cách ly test bằng Supabase local thật" được làm lại đơn giản hơn trong `scripts/test-data-isolation.mjs`.

## Đối chiếu tiêu chí nghiệm thu M1 (D-042)
| # | Tiêu chí | Bằng chứng | Trạng thái |
|---|---|---|---|
| 1 | Chủ dự án tạo được tài khoản qua Dashboard | Runbook `ACCESS_CONTROL.md` §5. Trên Supabase local, CI tạo tài khoản bằng admin API (cùng cơ chế Dashboard dùng) và đăng nhập được | Đạt (local/CI); Dashboard thật: smoke M1-1 |
| 2 | Đăng nhập trên điện thoại và máy tính | E2E `m1-auth` trên Chromium/Firefox/WebKit × mobile/tablet/desktop (Auth giả lập); GoTrue thật trong CI | Đạt (tự động); thiết bị thật: **chưa xác minh** (smoke M1-2) |
| 3 | Người ngoài không tự đăng ký được | `scripts/test-auth-invite-only.mjs` (GoTrue thật: signup và anonymous bị từ chối); `config.toml`; không có UI đăng ký | Đạt |
| 4 | Phiên được duy trì đúng | E2E: tải lại vẫn đăng nhập; supabase-js tự làm mới token và xoay vòng refresh token | Đạt (tự động); thiết bị thật: smoke M1-3 |
| 5 | A không đọc/sửa được dữ liệu B | pgTAP `sync_operations_rls` (17, đã thử cố ý nới RLS để chắc test bắt được); `test-data-isolation.mjs` (19 kiểm tra trên API thật + REST trực tiếp); unit test API | Đạt |
| 6 | Chưa đăng nhập không truy cập được dữ liệu riêng | API 401; `anon` không có quyền trên bảng; E2E: không mở IndexedDB, không gọi sync | Đạt |
| 7 | Đăng xuất / chuyển tài khoản không rò rỉ | E2E: đăng xuất xóa DB và phiên; tài khoản B không thấy dữ liệu A (đã thử dùng chung tên DB → test thất bại như mong đợi) | Đạt |
| 8 | Offline, outbox, đồng bộ theo đặc tả | E2E `offline.spec` (sống sót khi đóng tab, exactly once, phản hồi bị mất, từ chối G1); `m1-auth` hai thiết bị cùng tài khoản; Postgres thật trong CI | Đạt (server dev MOCK cho E2E; Postgres thật trong job database) |
| 9 | Giữ yêu cầu hiệu năng, thực dụng | G2 đã sửa (SDK không còn trong JS tải lần đầu); JS khoảng 229 KB/route (trước 275–294 KB); index cho predicate RLS | Cải thiện; vẫn trên mục tiêu P10 200 KB (dưới ngưỡng fail 300 KB) |
| 10 | CI và kiểm thử bảo mật thiết yếu đạt | Xem PR | Chờ CI |
| 11 | Không phá M0 và Design System V2 | Toàn bộ E2E hiện có pass (tại máy 370+ test Chromium) | Đạt (tại máy); 3 engine: chờ CI |

## Việc chủ dự án cần làm để bật đồng bộ thật trên Preview
1. Áp migration `supabase/migrations/20261125100000_m1_sync_operations.sql` lên dự án Supabase (SQL Editor, hoặc `supabase db push`).
2. Railway: đặt `SUPABASE_PUBLISHABLE_KEY` (giá trị công khai, giống `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` của Vercel).
3. Chạy smoke M1 trong `docs/SMOKE_TEST.md`.
4. Nếu bảng `app_members` hoặc `admin_audit_log` từng được áp thủ công lên cloud (PR #20/#21 chưa merge nên CI không áp), có thể để nguyên vì không policy nào dùng. Xóa khi tiện, sau khi kiểm tra không có dữ liệu cần giữ.

## Giới hạn / rủi ro chấp nhận (D-042)
- **Phiên trong `localStorage`:** lộ nếu có XSS.
- **Sau thu hồi:** access token cũ còn hợp lệ tối đa 1 giờ.
- **Phiên hết hạn mà chưa đăng xuất:** IndexedDB của tài khoản đó vẫn nằm trên máy, nhưng app không mở cho tài khoản khác.
- **Pull hiện chỉ áp dụng cho thực thể thử nghiệm `spike_note`.** Thực thể học thật đến từ M2/M3.
