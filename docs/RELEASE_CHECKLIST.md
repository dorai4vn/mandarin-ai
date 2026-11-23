# Mandarin AI — Release Checklist

Checklist dùng cho mỗi milestone và mỗi bản TestFlight. Đánh dấu `[x]` chỉ khi có bằng chứng (lệnh + kết quả, ảnh chụp/quay màn hình, link build). Ghi `MOCKED`/`BLOCKED` thay vì đánh dấu nếu chưa kiểm chứng thật.

## A. Mỗi Pull Request
- [ ] Làm trên feature branch; không push thẳng `main`; không tự merge.
- [ ] `pnpm install --frozen-lockfile` thành công.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` xanh.
- [ ] `pnpm check:deps` — không có phụ thuộc vòng giữa packages.
- [ ] Không có secret trong diff (`.env` thật không được commit; chỉ `.env.example`).
- [ ] Migration mới (nếu có) được review riêng, có test RLS âm.
- [ ] Cập nhật `docs/DECISIONS.md` nếu thay đổi kiến trúc; cập nhật `docs/FEATURES.md`.

## B. Nghiệm thu milestone
- [ ] Báo cáo theo mẫu trong `MILESTONES_CLAUDE_CODE.md` (bằng tiếng Việt).
- [ ] Mọi spike/tính năng gắn nhãn VERIFIED / MOCKED / BLOCKED.
- [ ] Kiểm thử thủ công trên iPhone thật (thiết bị, iOS version, build ID, ảnh/video).
- [ ] Trường hợp offline/online và quyền (micro, thông báo) đã thử.
- [ ] Chủ dự án nghiệm thu trước khi bắt đầu milestone tiếp theo.

## C. Bản build iOS (EAS)
- [ ] `eas build --profile development --platform ios` thành công (link build).
- [ ] Cài lên iPhone đã đăng ký (ad hoc / internal distribution).
- [ ] Bundle identifier, version, build number đúng.
- [ ] Usage descriptions (NSMicrophoneUsageDescription…) hiển thị tiếng Việt đúng.
- [ ] Không có provider secret nào trong bundle JS (`EXPO_PUBLIC_*` chỉ chứa giá trị công khai).

## D. Backend / dữ liệu
- [ ] Migration chạy được từ đầu trên DB trống (`supabase db reset`).
- [ ] Test RLS: user A không đọc/ghi được dữ liệu user B; user thường không ghi được shared lexicon.
- [ ] Biến môi trường API đầy đủ trên môi trường đích; service role key chỉ ở server.
- [ ] Kế hoạch rollback (migration + phiên bản API trước).

## E. Trước TestFlight (M8)
- [ ] Privacy disclosures (App Privacy), quyền micro/ảnh/thông báo.
- [ ] Audit accessibility trên thiết bị (Dynamic Type, VoiceOver, contrast).
- [ ] Giám sát lỗi, giới hạn chi phí AI, cảnh báo.
- [ ] Hướng dẫn cài TestFlight cho người thử.
- [ ] Runbook vận hành và kế hoạch rollback.
