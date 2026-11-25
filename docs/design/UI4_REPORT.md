# UI-4 — Trạng thái & phản hồi: báo cáo triển khai

Theo `UI_MIGRATION_PLAN.md` (PR-4) và `COMPONENT_SPEC_V2.md` §14, §15, §19, §20.

## Thành phần

- **Sync Indicator** (`shell/SyncIndicator.tsx`, thay `SyncChip`):
  - **Logic G1 / D-035 giữ nguyên:** "Đã đồng bộ" chỉ khi không có thao tác chờ, không có thao tác bị từ chối và sync đang bật. Thứ tự ưu tiên: lỗi > offline > chỉ trên thiết bị > đang chờ > đã đồng bộ.
  - **Giữ nguyên** chuỗi chữ, `data-testid="sync-chip"` và `data-sync-state`.
  - **Pill là nút** (`aria-expanded`, `aria-controls`) mở popover không modal: mạng, chờ gửi, lỗi, lần đồng bộ cuối, nút "Đồng bộ ngay". Đóng bằng `Esc` (trả focus về pill) hoặc bấm ra ngoài.
  - **Báo kết quả bằng Toast**, đúng G1: phản hồi từ máy chủ MOCK được ghi rõ là "máy chủ thử nghiệm MOCK", không gọi là "đã lưu".
  - **Sidebar thu gọn:** chỉ hiện chấm màu; chữ vẫn dành cho trình đọc màn hình.
- **Offline banner** (`shell/OfflineBanner.tsx`):
  - Thanh mảnh dưới top bar khi mất mạng (`role="status"`), có thể thu gọn và hiện lại ở lần offline sau.
  - Lời nhắn **trung thực** theo trạng thái sync: khi sync đám mây đang tắt thì chỉ nói "lưu trên thiết bị này", không hứa đồng bộ.
- **Toast** (`ui/Toast.tsx`, `ToastProvider` trong AppShell, `useToast()`):
  - Vùng `aria-live` có sẵn từ đầu: polite cho thông báo, assertive cho lỗi. Không dùng `role` để không trùng các phần tử status khác của trang.
  - **Không bao giờ lấy focus.** Tự ẩn sau 4 s (6 s nếu có hành động), tạm dừng khi hover/focus, tối đa 3 cái, có nút đóng.
  - Mobile: nằm trên bottom nav; từ 768 px: góc dưới phải.
- **Dialog** (`ui/Sheet.tsx` → `Dialog`, biến thể `dialog` của Sheet):
  - Luôn ở giữa màn hình, rộng tối đa 480 px.
  - Focus vào phần tử có nghĩa đầu tiên (ô nhập, hoặc nút hành động đầu tiên), không phải nút đóng.
  - Vùng hành động: trên mobile xếp dọc full-width, nút chính ở trên.
  - `dismissible={false}`: bấm nền không đóng khi đang có dữ liệu nhập; `Esc` và các nút vẫn đóng.

## Kiểm thử

- **`e2e/ui4-feedback.spec.ts`:**
  - Sync Indicator: popover, `Esc` / bấm ngoài; "Đồng bộ ngay" → toast, không lấy focus; chấm màu ở rail.
  - Offline banner: `context.setOffline`, thu gọn, hiện lại.
  - Toast: vùng live, không lấy focus, tự ẩn, tối đa 3, nút đóng, lỗi ở vùng assertive, hover giữ lại, "Hoàn tác".
  - Dialog: focus đầu, `Esc` trả focus, xác nhận chạy; dialog có dữ liệu nhập không đóng khi bấm nền.
- **Test G1 và chuỗi chữ hiện có** (`offline.spec.ts`, `sync-disabled.spec.ts`) đạt mà **không sửa test**.
- **Tại máy (Chromium):** toàn bộ 282 pass / 54 skip.
