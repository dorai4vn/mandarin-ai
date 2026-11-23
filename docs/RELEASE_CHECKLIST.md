# Mandarin AI — Release Checklist (Web/PWA)

Checklist dùng cho mỗi milestone và mỗi lần phát hành bản beta. Đánh dấu `[x]` chỉ khi có bằng chứng (lệnh + kết quả, ảnh chụp/quay màn hình, URL bản deploy). Ghi `MOCKED`/`BLOCKED` thay vì đánh dấu nếu chưa kiểm chứng thật. Nền tảng: Next.js PWA, ưu tiên Safari trên iPhone (D-018).

## A. Mỗi Pull Request
- [ ] Làm trên feature branch; không push thẳng `main`; không tự merge.
- [ ] `pnpm install --frozen-lockfile` thành công.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` xanh.
- [ ] `pnpm check:deps` — không có phụ thuộc vòng giữa packages.
- [ ] `pnpm check:secrets` — không có secret; chỉ `.env.example` được commit.
- [ ] Không có secret của nhà cung cấp trong bundle client (`NEXT_PUBLIC_*` chỉ chứa giá trị công khai; kiểm tra output `next build`).
- [ ] Migration mới (nếu có) được review riêng, có test RLS âm.
- [ ] Cập nhật `docs/DECISIONS.md` nếu thay đổi kiến trúc; cập nhật `docs/FEATURES.md`.

## B. Nghiệm thu milestone
- [ ] Báo cáo theo mẫu trong `MILESTONES_CLAUDE_CODE.md` (bằng tiếng Việt).
- [ ] Mọi spike/tính năng gắn nhãn VERIFIED / MOCKED / BLOCKED.
- [ ] Kiểm thử thủ công trên **iPhone thật**: ghi model, phiên bản iOS, URL/commit đã test, ảnh/video.
- [ ] Kiểm thử cả hai chế độ: **tab Safari** và **Home-Screen (standalone)**.
- [ ] Trường hợp offline/online (chế độ máy bay), đóng hẳn app rồi mở lại, và quyền micro/thông báo đã thử.
- [ ] Chủ dự án nghiệm thu trước khi bắt đầu milestone tiếp theo.

## C. Safari iOS / PWA
- [ ] Manifest hợp lệ (`name`, `short_name`, `start_url`, `display: standalone`, icon 192/512 + `apple-touch-icon` 180).
- [ ] "Thêm vào Màn hình chính" hoạt động; mở từ icon chạy ở chế độ standalone, có nút quay lại trong UI.
- [ ] Service worker: app shell mở được khi offline; cập nhật phiên bản mới có thông báo, không kẹt cache cũ.
- [ ] Layout: safe-area (tai thỏ, home indicator), xoay dọc, bàn phím không che ô nhập, ô nhập ≥ 16 px (không tự phóng to).
- [ ] Canvas viết tay: không cuộn/zoom trang khi viết; ngón tay và Apple Pencil (nếu có).
- [ ] Micro: hỏi quyền, từ chối → có hướng dẫn bật lại, cấp lại → ghi âm được; định dạng gửi đi là WAV 16 kHz.
- [ ] Phát âm thanh bắt đầu từ thao tác chạm; tốc độ chậm hoạt động.
- [ ] Upload PDF từ ứng dụng Tệp; từ chối đúng file sai loại/quá lớn.
- [ ] IndexedDB: dữ liệu còn sau khi đóng app; `navigator.storage.persist()` đã được gọi (ghi lại kết quả); outbox gửi đúng một lần.
- [ ] Đăng nhập bằng mã OTP trong chế độ Home-Screen (không phụ thuộc magic link).
- [ ] Web Push (từ M7): nhận được trên bản cài Home-Screen iOS ≥ 16.4 sau khi cho phép; tắt nhắc nhở hoạt động.
- [ ] VoiceOver đọc được các nút chính; cỡ chữ lớn không vỡ layout.

## D. Backend / dữ liệu
- [ ] Migration chạy được từ đầu trên DB trống (`supabase db reset`).
- [ ] Test RLS: user A không đọc/ghi được dữ liệu user B; user thường không ghi được shared lexicon.
- [ ] Biến môi trường API/web đầy đủ trên môi trường đích; service role key chỉ ở server.
- [ ] CORS của API chỉ cho phép origin của web app.
- [ ] Kế hoạch rollback (migration + phiên bản API/web trước).

## E. Trước private beta (M8)
- [ ] HTTPS với tên miền chính thức; header bảo mật (CSP, HSTS, Permissions-Policy cho micro).
- [ ] Thông báo quyền riêng tư (micro, ghi âm, tài liệu tải lên), xuất/xóa dữ liệu.
- [ ] Audit accessibility trên iPhone (Dynamic Type/zoom, VoiceOver, contrast).
- [ ] Giám sát lỗi, giới hạn chi phí AI, cảnh báo.
- [ ] Hướng dẫn cài (Thêm vào Màn hình chính) cho người thử.
- [ ] Runbook vận hành và kế hoạch rollback.
