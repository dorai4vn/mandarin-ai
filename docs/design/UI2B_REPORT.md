# UI-2B — Báo cáo triển khai

Kế hoạch: `docs/design/UI2B_PLAN.md` (PR #7). Chỉ đạo bổ sung (issue #6): Tooltip hoverable / dismissible / persistent, kiểm thử Button loading trong Server Component, focus ErrorState phù hợp, không phát sinh overflow mới. Nhánh `feat/ui-2b-primitives`, xếp chồng trên `fix/fu-7-rate-limit-cors` (PR #8) để CI không bị FU-7 làm nhiễu.

## Component mới (`apps/web/src/components/ui/`)

| Component                                 | File                           | Điểm chính                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabs                                      | `Tabs.tsx` (client)            | WAI-ARIA Tabs, kích hoạt tự động, roving tabIndex, ←/→ vòng, Home/End, Tab vào panel; segmented (44 px — spec 40 + 4 px để mỗi tab đạt vùng chạm 44) và underline (44 px); tablist cuộn ngang trong chính nó; vòng focus vẽ **bên trong** tab (tablist cuộn sẽ cắt vòng ngoài); chỉ báo trượt bằng `translate`          |
| Tooltip                                   | `Tooltip.tsx` (client)         | WCAG 1.4.13: **hoverable** (cầu nối 8 px, di chuột lên bong bóng không tắt), **dismissible** (`Esc`, không đổi hover/focus), **persistent** (không hẹn giờ); mở khi hover chuột và khi focus bàn phím (`:focus-visible`), không mở khi chạm; `aria-describedby` → `role="tooltip"`; tự dịch vào trong màn hình (320 px) |
| ProgressBar / ProgressRing                | `Progress.tsx` (server-safe)   | `role="progressbar"`, `aria-valuenow/min/max/valuetext`, giá trị kẹp [0, max]; không xác định → `aria-busy`, sọc trượt (tắt khi reduced-motion + chữ "Đang xử lý…"); fill dùng `scale`                                                                                                                                  |
| Skeleton / SkeletonGroup / `useShowAfter` | `Skeleton.tsx` (client)        | khối `aria-hidden`, vùng chứa `aria-busy` + "Đang tải…" (status); shimmer chỉ `transform`, tắt khi reduced-motion; chỉ hiện sau 300 ms                                                                                                                                                                                  |
| EmptyState                                | `EmptyState.tsx` (server-safe) | first-use / no-results / coming-soon / filtered; `coming-soon` có badge "Ra mắt ở Mx" và **kiểu dữ liệu không cho truyền nút**                                                                                                                                                                                          |
| ErrorState                                | `ErrorState.tsx` (client)      | inline / section / page; `role="alert"` (tắt được bằng `announce={false}`); **chỉ mức page chuyển focus** vào "Thử lại"; inline/section không cướp focus; "Chi tiết" thu gọn                                                                                                                                            |
| PageHeader V2                             | `PageHeader.tsx` (server-safe) | API M0 giữ; `h1` 26/34 (< 768) · 30/38 (≥ 768), 700, −0.015em; `min-w-0` + `break-words`; `eyebrow` tùy chọn                                                                                                                                                                                                            |

## Minor từ UI-2 đã xử lý

| ID  | Xử lý                                                                                                                                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2  | Tách `styles.ts` (server-safe: `buttonClasses`, `iconButtonClasses`, `controlClasses`), `Spinner.tsx`, `ButtonLink.tsx` (server-safe); `Button`/`IconButton` vào file `'use client'`. Route Server Component `/lab/design/server` render `<Button loading>` + `ButtonLink` + `controlClasses` — có E2E (kiểm cả HTML server) |
| M3  | Wrapper M0 trong `ui.tsx` có `@deprecated` (ghi rõ `ghost` = outlined ở đường cũ); ESLint `no-restricted-imports` chặn `@/components/ui` trong `src/components/ui/**` và `app/lab/design/**`                                                                                                                                 |
| M4  | Nút hiện/ẩn mật khẩu: một tên cố định "Hiện mật khẩu" + `aria-pressed`                                                                                                                                                                                                                                                       |
| M6  | Ô "Sắp có" bỏ `aria-disabled`, dùng `data-state="coming-soon"`                                                                                                                                                                                                                                                               |
| M8  | Hint của field dùng `fg-muted`; placeholder ô chỉ-đọc dùng `fg-muted`; thêm cặp vào `check:contrast` (72 cặp)                                                                                                                                                                                                                |
| M10 | `IconButton` bỏ `title`; gallery dùng `Tooltip`                                                                                                                                                                                                                                                                              |
| N1  | Kiểm "bấm lặp" trên nút luôn loading (không phụ thuộc hẹn giờ)                                                                                                                                                                                                                                                               |
| N2  | Implicit submit: Enter trong ô nhập của form loading → không gửi                                                                                                                                                                                                                                                             |
| N3  | Nét trắng icon sách dùng `style={{ stroke: … }}`                                                                                                                                                                                                                                                                             |
| N4  | Test id riêng cho Textarea, PasswordInput (+ `aria-controls`), SearchInput                                                                                                                                                                                                                                                   |
| M13 | `exact: true`; test 320 px kiểm mọi ô ở cả hai lưới, không chồng lấn, dung sai 1 px                                                                                                                                                                                                                                          |
| M9  | Giữ nguyên (icon mint trang trí, quyết định đã duyệt)                                                                                                                                                                                                                                                                        |

## Kiểm thử

- `e2e/ui2b-primitives.spec.ts` (15 test × 3 viewport × 3 engine) + `ui2-primitives.spec.ts` cập nhật.
- Mutation (đã khôi phục sau mỗi lần): bỏ xử lý phím Tabs → test Tabs FAIL; bỏ `Esc` của Tooltip → test Tooltip FAIL; bỏ guard loading → test Button FAIL.
- Chromium tại máy: toàn bộ 210 pass / 27 skip, 0 flaky (2 lần). Không cuộn ngang ở 320/390/768/1024/1440 trên gallery; mỗi route M0 đúng một `h1`.
- Ảnh: `docs/design/previews/ui2b/`.

## Còn lại / ghi chú

- Segmented Tabs cao 44 px thay vì 40 px của spec (ưu tiên vùng chạm 44 px).
- Tooltip không mở khi chạm (đúng spec: không là kênh chính trên touch); trên điện thoại vẫn mở khi focus bằng bàn phím ngoài.

## Review độc lập (PR #8 + #9) và xử lý

**0 Critical, 4 Important, đã sửa cả 4:**

1. **PR #8: preflight CORS bị bộ giới hạn IP chặn.** Request POST/upload vẫn lỗi mạng. Đã sửa: đăng ký CORS **trước** bộ giới hạn IP, nên preflight luôn được trả lời và mọi phản hồi (kể cả 429) đều có `Access-Control-Allow-Origin` + `Vary: Origin`. Có unit test. Kiểm trong trình duyệt: `POST /v1/uploads/pdf` → 429, không còn `TypeError`.
2. **Tabs: chỉ báo không đo lại.** Đã sửa:
   - `ResizeObserver` + `document.fonts.ready`;
   - style "đã chọn" tĩnh trước khi đo (HTML server đúng);
   - fallback tab đầu khi `value` không khớp;
   - id DOM an toàn;
   - effect chỉ phụ thuộc lựa chọn (không ghi đè cuộn tay).
3. **Tooltip: không xử lý resize/scroll và mép trên.** Đã sửa:
   - đo lại khi resize/scroll lúc đang mở;
   - tự lật xuống dưới khi thiếu chỗ phía trên;
   - `Esc` ở capture phase + `stopPropagation`;
   - `:focus-visible` bọc try/catch.
4. **Test Tooltip 320 px không thực sự kiểm cơ chế dịch.** Đã sửa: thêm trigger sát mép phải, nội dung dài; test kiểm `data-shift < 0`, nằm trong [8, 312], và đổi viewport khi đang mở. Thêm test lật xuống dưới. Kiểm thử đột biến: bỏ phần dịch → FAIL; bỏ `ResizeObserver` → FAIL.

**Minor đã sửa:**

- ErrorState:
  - mức page mặc định không `role="alert"` (focus đã chuyển);
  - không có retry thì focus vào tiêu đề;
  - inline dùng `div`;
  - nhãn "Về Hôm nay" cấu hình được.
- Progress: chặn `max ≤ 0`; ProgressRing có `valueText`.
- Skeleton: bỏ `role="status"` không đáng tin cậy; dùng nhãn ẩn + `aria-busy`.
- Test Server Component kiểm `aria-busy` đúng trên phần tử.

**Minor còn mở (không chặn):**

- Tabs controlled mà cha bỏ qua `onValueChange` thì focus và lựa chọn lệch nhau.
- Tablist cuộn chưa có fade mép.
- Tooltip bị cắt nếu tổ tiên có `overflow`.
- ESLint chưa bắt import tương đối `'../ui'`.
- ProgressRing / PageHeader chưa có `actions`.
- Test demo nút loading không còn kiểm việc trở lại trạng thái chờ.

**Kết quả cuối (tại máy, Chromium):** toàn bộ **216 pass / 27 skip, 0 flaky**; lint, typecheck, test 9/9, format, `check:secrets`, `check:deps`, `check:contrast` 72: đều PASS.
