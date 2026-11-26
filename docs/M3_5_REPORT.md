# M3.5 — Visual Hanzi: hoạt ảnh lịch sử chữ (pilot 山)

Ngày: 2026-11-26 · Nhánh `claude/issue-27-20261126-1747` · PR nháp, **không merge**.

## Đã làm (VERIFIED = có lệnh/kết quả)
- Dữ liệu có nguồn cho 山 (3 giai đoạn) + lệ thư thiếu + khải thư bằng phông — `apps/web/src/hanzi/data.ts`; nguồn/giấy phép: `docs/HANZI_HISTORY_SOURCES.md`.
- Component `HanziHistory` (dùng lại được trong bài học M4) + `HanziHistoryView` (lazy chunk): timeline, phát/tạm dừng/phát lại/Trước/Sau, phím mũi tên/Home/End, `aria-current`, vùng `role=status`, giảm chuyển động, bằng chứng + giấy phép + trạng thái duyệt, nhãn minh họa gợi nhớ, ghi chú thứ tự nét chưa có, dự phòng khi chunk không tải được (nút Thử lại).
- Tích hợp chi tiết từ trong Từ điển cá nhân; trang thử `/lab/hanzi-history` (không cần đăng nhập).
- Cập nhật `MILESTONES_CLAUDE_CODE.md` (M3.5 + acceptance, M5 giữ viết tay), `FEATURES.md`, `DECISIONS.md` (D-044).

## Kiểm thử
- `turbo run typecheck lint test`: 21/21 task thành công (test web gồm 6 test mới `src/hanzi/model.test.ts`: nguồn/giấy phép bắt buộc, giai đoạn thiếu không phát, mnemonic không phải bằng chứng); test M3 giữ nguyên, xanh.
- `turbo run build --filter=@mandarin/web` thành công; chunk riêng chứa `HanziHistoryView`; `next start` trả HTML trạng thái "Đang tải…" cho `/lab/hanzi-history`.
- `check:secrets`, `check:css-vars`: OK.

## Chưa xác minh / hạn chế thật
- **E2E Playwright chưa chạy** (môi trường không có trình duyệt Playwright). Đã viết `apps/web/e2e/m3_5-hanzi-history.spec.ts` (nội dung, bàn phím, phát/tạm dừng, reduced motion) nhưng **chưa được thực thi**; CI sẽ chạy.
- Hoạt ảnh, bố cục responsive, offline fallback và axe **chưa kiểm bằng mắt/thiết bị**; fallback offline chưa có test tự động.
- Hình là bản vẽ lại của Commons, chưa đối chiếu nguyên bản; nhãn PD chưa có tư vấn pháp lý. Mọi giai đoạn `pending_owner_review`.
- Chỉ 山. Thứ tự nét chưa làm (khoảng trống được ghi trong UI và tài liệu). Không có nhận dạng viết tay, không migration/schema/auth/RLS/cloud/API trả phí, không bắt đầu M4.
- Chưa có dữ liệu để kiểm trên production đã đăng nhập.
