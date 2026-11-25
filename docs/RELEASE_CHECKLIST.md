# Mandarin AI — Release Checklist (cross-platform web)

Checklist dùng cho mỗi milestone và mỗi lần phát hành bản beta. Đánh dấu `[x]` chỉ khi có bằng chứng (lệnh + kết quả, ảnh chụp/quay màn hình, URL bản deploy, thiết bị/hệ điều hành/trình duyệt + phiên bản). Ghi `MOCKED`/`BLOCKED` thay vì đánh dấu nếu chưa kiểm chứng thật.

Phạm vi (D-028): web app chạy trên Chrome, Edge, Firefox, Safari bản hiện đại; Windows, macOS, iOS, Android; desktop, laptop, tablet, smartphone. PWA, offline, Web Push là progressive enhancements.

## A. Mỗi Pull Request
- [ ] Làm trên feature branch; không push thẳng `main`; không tự merge.
- [ ] `pnpm install --frozen-lockfile` thành công.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` xanh.
- [ ] `pnpm check:deps`, `pnpm check:secrets` xanh; chỉ `.env.example` được commit.
- [ ] Không có secret nhà cung cấp trong bundle client (`NEXT_PUBLIC_*` chỉ chứa giá trị công khai).
- [ ] Playwright E2E xanh trên **Chromium, Firefox, WebKit** × viewport **mobile (390×844), tablet (820×1180), desktop (1440×900)**.
- [ ] Migration mới (nếu có) được review riêng, có test RLS âm.
- [ ] Cập nhật `docs/DECISIONS.md` nếu thay đổi kiến trúc; cập nhật `docs/FEATURES.md`.

## B. Nghiệm thu milestone
- [ ] Báo cáo theo mẫu trong `MILESTONES_CLAUDE_CODE.md` (bằng tiếng Việt), ghi rõ kết quả theo từng trình duyệt/viewport.
- [ ] Mọi spike/tính năng gắn nhãn VERIFIED / MOCKED / BLOCKED.
- [ ] Kiểm thử thủ công trên **Safari iPhone thật** và **ít nhất một trình duyệt desktop thật** (ghi thiết bị, OS, trình duyệt, phiên bản, URL/commit).
- [ ] Cùng một tài khoản: tiến độ tạo trên desktop hiện trên điện thoại và ngược lại.
- [ ] Mọi tính năng cốt lõi chạy trong tab trình duyệt thường, **không cài PWA**.
- [ ] Offline/online, đóng tab rồi mở lại, quyền micro/thông báo đã thử ở nơi trình duyệt hỗ trợ.
- [ ] Chủ dự án nghiệm thu trước khi bắt đầu milestone tiếp theo.

## C. Tương thích trình duyệt & thiết bị
- [ ] Layout: phone một cột + tab bar dưới; tablet navigation rail; desktop sidebar + nhiều cột — không cuộn ngang ở cả ba viewport.
- [ ] Desktop: dùng được hoàn toàn bằng chuột + bàn phím (focus rõ ràng, phím tắt chính, hover).
- [ ] Phone/tablet: safe-area, bàn phím ảo không che ô nhập, ô nhập ≥ 16 px.
- [ ] Canvas viết tay: chạm (phone), chuột (desktop), bút (tablet/pen) — cùng định dạng nét; không cuộn/zoom trang khi viết.
- [ ] Micro: capability detection; xin quyền; từ chối → hướng dẫn bật lại theo trình duyệt; không hỗ trợ → thông báo rõ, phần còn lại của app vẫn dùng được; định dạng gửi đi là WAV 16 kHz.
- [ ] Phát âm thanh bắt đầu từ thao tác người dùng; tốc độ chậm hoạt động.
- [ ] Upload PDF: chọn file và kéo-thả (desktop); từ chối đúng file sai loại/quá lớn.
- [ ] IndexedDB khả dụng: outbox gửi đúng một lần. Không khả dụng (private mode…): app online vẫn chạy, có thông báo.
- [ ] Service worker/manifest: chỉ đăng ký khi được hỗ trợ; app shell offline; cài đặt là tùy chọn.
- [ ] Đăng nhập bằng email + mật khẩu trong tab trình duyệt và trong app đã cài (không phụ thuộc email/magic link — D-038).
- [ ] Nhắc học (từ M7): **nhắc trong ứng dụng hoạt động ở mọi trình duyệt (bắt buộc)**; Web Push chỉ kiểm nơi được hỗ trợ và người dùng cho phép (tùy chọn, không chặn nghiệm thu) — D-024.
- [ ] Trình duyệt quá cũ: hiện thông báo "trình duyệt không được hỗ trợ" thay vì lỗi.
- [ ] Trình đọc màn hình (VoiceOver/NVDA/TalkBack) đọc được nút chính; cỡ chữ lớn không vỡ layout.

## C2. Lưu trữ phía trình duyệt (D-022)
- [ ] IndexedDB **không** chứa API secret, refresh token, bản ghi âm nhạy cảm (kiểm bằng DevTools → Application → IndexedDB).
- [ ] Không mô tả Web Crypto là tương đương Keychain/SQLCipher trong UI/tài liệu.
- [ ] Đăng xuất xóa dữ liệu cục bộ của người dùng.

## C3. Preview (D-031)
- [ ] Vercel Deployment Protection bật cho Preview.
- [ ] API Preview: `APP_ENV=preview`, `TRUST_PROXY=true`, `WEB_ORIGINS` chỉ domain Vercel; mock tắt trừ khi `ALLOW_MOCKS_IN_PREVIEW=true` có chủ đích.
- [ ] `HANDWRITING_ADAPTER` ≠ `hanzilookup` khi D-029 chưa duyệt.
- [ ] `NEXT_PUBLIC_ENABLE_DEV_TOKEN` không bật trên Preview/production.
- [ ] `/health` trả `environment: preview` và chế độ từng nhà cung cấp đúng như cấu hình.
- [ ] Chạy `docs/SMOKE_TEST.md` (Chrome/Edge desktop, Safari iPhone, Chrome Android).

## C4. Hiệu năng (D-032, `docs/PERFORMANCE.md`)
- [ ] Benchmark lab trên **bản HTTPS** (Preview/production), profile `desktop` và `mobile-mid` (CPU 4×, 4G-lab); Chromium là cổng chặn, Firefox/WebKit báo cáo.
- [ ] Bảng P1–P16: giá trị đo / mục tiêu / ngưỡng thất bại / "chưa đo được" + lý do; so với baseline trước.
- [ ] Không chỉ số nào vượt **ngưỡng thất bại**; vượt ngưỡng cảnh báo phải có giải thích và kế hoạch.
- [ ] JS tải lần đầu mỗi route ≤ budget (P10); thành phần nặng được lazy-load.
- [ ] Đo tay trên thiết bị thật (iPhone Safari, Android Chrome, laptop): mở app nguội, điều hướng, tương tác chính — ghi số đo.
- [ ] Trạng thái đồng bộ không báo "đã đồng bộ" khi chưa có xác nhận server; lỗi/từ chối hiển thị.
- [ ] Cache không chứa dữ liệu riêng của người dùng khác; đăng xuất xóa cache; cache có version và giới hạn.
- [ ] Truy vấn DB mới có index + `EXPLAIN ANALYZE` trên dataset D-L; không N+1.
- [ ] Không thêm Redis/cache trả phí khi chưa có số liệu (D-033).
- [ ] Không tối ưu nào làm yếu bảo mật, RLS, dữ liệu offline hay tính đúng đắn của đồng bộ.
- [ ] Không tuyên bố "đạt hiệu năng" nếu chưa có số liệu trên HTTPS thật.

## C5. Truy cập riêng tư (D-037, D-038, `docs/ACCESS_CONTROL.md`)
- [ ] Supabase: **Allow new users to sign up = TẮT**, anonymous sign-ins TẮT, chỉ bật provider Email; độ dài mật khẩu tối thiểu 12; *Secure password change* TẮT.
- [ ] Thử đăng ký bằng publishable key (gọi trực tiếp Auth API) → bị từ chối.
- [ ] Email chưa được cấp và mật khẩu sai → **cùng** thông báo "Email hoặc mật khẩu không đúng."; không tạo tài khoản.
- [ ] Không có màn hình/đường dẫn "Đăng ký", không OTP/Magic Link trong app.
- [ ] Users trên Dashboard chỉ gồm người được cấp; mỗi email một người; không tài khoản dùng chung; mật khẩu tạm gửi qua kênh riêng.
- [ ] (M1+, D-042) Người dùng A không đọc/sửa được dữ liệu của B (RLS + API); chưa đăng nhập → API 401, app không mở dữ liệu cá nhân.
- [ ] (M1+) Đăng xuất xóa dữ liệu cục bộ của tài khoản; đăng nhập tài khoản khác không thấy dữ liệu cũ.
- [ ] (M1+) Thu hồi: xóa người dùng / đặt mật khẩu mới trên Dashboard → không làm mới phiên được nữa (access token cũ hết hạn ≤ 1 giờ).
- [ ] Không có mật khẩu trong log API/route handler, `localStorage`, `sessionStorage`, IndexedDB, URL.
- [ ] Khôi phục mật khẩu qua email: ghi rõ **tạm hoãn** (cần Custom SMTP) hoặc đã cấu hình SMTP + test.
- [ ] Secret key chỉ ở Railway/máy admin.

## D. Backend / dữ liệu
- [ ] Migration chạy được từ đầu trên DB trống (`supabase db reset`).
- [ ] Test RLS: user A không đọc/ghi được dữ liệu user B; user thường không ghi được shared lexicon.
- [ ] Biến môi trường API/web đầy đủ trên môi trường đích; service role key chỉ ở server.
- [ ] CORS của API chỉ cho phép origin của web app.
- [ ] Kế hoạch rollback (migration + phiên bản API/web trước).

## E. Trước private beta (M8)
- [ ] HTTPS với tên miền chính thức; header bảo mật (CSP, HSTS, Permissions-Policy cho micro).
- [ ] Thông báo quyền riêng tư (micro, ghi âm, tài liệu tải lên), xuất/xóa dữ liệu.
- [ ] Audit accessibility trên desktop và điện thoại.
- [ ] Giám sát lỗi, giới hạn chi phí AI, cảnh báo.
- [ ] Hướng dẫn dùng cho người thử (mở URL; cài đặt là tùy chọn).
- [ ] Runbook vận hành và kế hoạch rollback.
