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
  - **Không bao giờ lấy focus.** Tự ẩn sau 4 s (toast có hành động thì chờ người dùng), tạm dừng khi hover/focus, tối đa 3 cái, có nút đóng.
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

## Review độc lập và sửa lỗi

Review mã độc lập trên `9ead7a8`. Đã sửa mọi mục Critical/Important và phần lớn mục Minor:

| Mục     | Vấn đề                                                                                                                                                          | Sửa                                                                                                                                                                                                                                                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1      | "Đồng bộ ngay" báo "Đã đồng bộ 0 thao tác." (thành công) khi outbox rỗng, sync tắt, còn lỗi cũ, tab khác giữ khóa sync hoặc server trả retry một phần — trái G1 | `syncNow` trả thêm trạng thái **sau** lần chạy (`after`: chờ, lỗi, availability). Lời nhắn chuyển sang `src/offline/sync-message.ts › describeSyncResult` (unit test): chỉ báo "Đã đồng bộ" khi không còn chờ/lỗi, sync bật và server thật; outbox rỗng → "Không có thay đổi nào cần đồng bộ." |
| I1      | Sync tắt / chưa rõ trạng thái bị báo "sẽ tự thử lại"                                                                                                            | `sync_unavailable` → lời nhắn "lưu trên thiết bị"; `sync_status_unknown` → "Chưa kiểm tra được…"; `server_not_persistent` → cảnh báo riêng; "sẽ tự thử lại" chỉ cho lỗi mạng                                                                                                                   |
| I2      | Sidebar mở rộng (≥ 1280 px) cắt popover khoảng 20 px                                                                                                            | Popover `fixed` cho cả sidebar và rail, cập nhật vị trí khi cuộn/đổi kích thước; test kiểm tra bằng `elementFromPoint`                                                                                                                                                                         |
| I3      | Toast nằm dưới top layer / bị inert khi đang mở dialog                                                                                                          | Toast gọi khi đang có `dialog:modal` thì chờ dialog đóng mới hiện; test xác nhận toast sau khi xóa hiện ra và bấm được                                                                                                                                                                         |
| I4      | Banner offline gắn live region cùng lúc với chữ nên dễ không được đọc                                                                                           | Vùng `aria-live` luôn tồn tại, nội dung xuất hiện bên trong (không dùng `role=status` để tránh trùng `getByRole('status')` của các trang)                                                                                                                                                      |
| I5      | Lời nhắn banner không trung thực với kho bộ nhớ tạm và trạng thái sync chưa rõ                                                                                  | Có lời nhắn riêng cho kho bộ nhớ tạm, cho sync bật, sync tắt và sync chưa rõ                                                                                                                                                                                                                   |
| I6      | Dialog cũng `pushState` như sheet                                                                                                                               | Prop `history` (mặc định bật cho sheet, tắt cho dialog); test xác nhận `history.length` không đổi                                                                                                                                                                                              |
| I7      | Một số assertion không thể thất bại                                                                                                                             | Kiểm tra đúng chuỗi lời nhắn, focus nằm lại trên nút, tên truy cập theo `data-sync-state`; thêm test sync tắt, popover ở desktop, toast sau dialog                                                                                                                                             |
| M1–M5   | "Chi tiết đồng bộ" trong text; "Lần cuối" sai nghĩa; Esc nuốt phím, popover không đóng khi Tab đi; vị trí cũ; nút disabled làm mất focus                        | `aria-haspopup`; đổi thành "Lần thử cuối · thành công/chưa xong/MOCK"; Esc chỉ xử lý khi focus ở trong và không đang gõ IME, đóng khi focus rời đi; tính lại vị trí; `aria-disabled` kèm "Cần có mạng để đồng bộ."                                                                             |
| M6–M8   | Hover và focus dùng chung một cờ; đóng toast làm mất focus; toast có "Hoàn tác" tự ẩn sau 6 s                                                                   | Tách hai cờ; trả focus về toast còn lại hoặc nơi đã mở toast; toast có hành động không tự ẩn (WCAG 2.2.1)                                                                                                                                                                                      |
| M11     | Focus ban đầu rơi vào nút bị vô hiệu hoặc ô ẩn                                                                                                                  | Bộ chọn loại trừ `[disabled]`, `type=hidden`, `tabindex=-1`                                                                                                                                                                                                                                    |
| M15–M16 | Test tối đa 3 toast phụ thuộc thời gian; demo "Đã xóa: -1"                                                                                                      | Đếm bằng toast có hành động (không tự ẩn); demo tăng rồi hoàn tác                                                                                                                                                                                                                              |

**Giữ nguyên (ghi nhận):**

- **M9:** dùng `aria-live` thay cho `role` (đã giải thích ở trên).
- **M12:** thứ tự `flex-col-reverse` trên mobile, đây là mẫu phổ biến.
- **M13:** `dismissible={false}` chỉ chặn bấm nền, đúng §14; xác nhận bỏ dữ liệu là quyết định sản phẩm ở M4.

**Tại máy (Chromium, sau khi sửa):** 301 pass, unit 38 pass.
