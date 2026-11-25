# UI-3 — Shell & breakpoint: báo cáo triển khai

Theo `UI_MIGRATION_PLAN.md` (PR-3), `RESPONSIVE_V2.md`, `COMPONENT_SPEC_V2.md` §6–8 và §14.

## Breakpoint (D-039)

| Lớp     | Chiều rộng | Điều hướng                                                                                            | testid        |
| ------- | ---------- | ----------------------------------------------------------------------------------------------------- | ------------- |
| Phone   | < 768      | Top bar + bottom nav 5 mục (Trang chủ · Luyện tập · Từ điển · Thư viện · **Thêm**)                    | `nav-bottom`  |
| Tablet  | 768–1023   | Sidebar thu gọn 72 px (icon + tooltip)                                                                | `nav-rail`    |
| Desktop | ≥ 1024     | Sidebar: thu gọn mặc định ở 1024–1279, mở rộng 248 px từ 1280; người dùng đổi được, lựa chọn được nhớ | `nav-sidebar` |

Thay mốc 1280 của M0 (D-030). Nhãn điều hướng giữ nguyên nhãn M0 (không đổi tên, không thêm đích giả; "Thư viện" và "Học bài" tách biệt). Thứ tự theo spec: Trang chủ · Luyện tập · Từ điển · Thư viện; nhóm phụ: Hồ sơ, Phòng thử M0.

## Thành phần

- **Sidebar (`AppShell.tsx`)**:
  - Rộng/hẹp điều khiển bằng CSS (`data-sidebar` trên `.app-shell` + media query), nên HTML server đã đúng và không nháy.
  - Nút "Thu gọn/Mở rộng thanh bên" có `aria-expanded` và `aria-controls`; lựa chọn lưu `localStorage` (lỗi storage → mặc định).
  - Khi thu gọn: nhãn chỉ dành cho trình đọc màn hình, Tooltip bên phải hiện khi hover/focus. Tooltip đặt `position: fixed` nên khung cuộn của sidebar không cắt được.
  - Sidebar tự cuộn khi màn hình thấp (điện thoại ngang).
- **Bottom nav**:
  - Mục "Thêm" là nút (`aria-haspopup="dialog"`, `aria-expanded`) mở **Sheet** chứa Hồ sơ và Phòng thử M0. Khi đang ở một trong hai trang này, nút "Thêm" được đánh dấu active.
  - Thanh tự ẩn khi đang gõ (bàn phím ảo) và hiện lại sau 250 ms, để không chắn cú chạm vào nút ngay dưới ô nhập.
  - Màn hình thấp (< 500 px): thanh cao 48 px, chỉ còn icon (nhãn dành cho trình đọc màn hình).
- **Sheet (`ui/Sheet.tsx`)**:
  - Dựng trên `<dialog>` gốc với `showModal()`: bẫy focus, `Esc`, nền inert.
  - Focus vào mục đầu tiên khi mở và trả focus về nút mở khi đóng.
  - Đóng được bằng `Esc`, nút ✕, bấm nền, hoặc **Back** của trình duyệt/Android (sheet thêm 1 mục lịch sử; điều hướng bằng link trong sheet không bị hủy). Khóa cuộn trang khi mở.
  - Trên điện thoại là bottom sheet; từ 768 px trở lên là dialog.
- **Top bar (phone)**: sticky, có safe-area, cao 56 px (44 px khi màn hình thấp).
- **Lề và độ rộng nội dung**: 12 px ở < 360, 16 px trên mobile, 24 px tablet, 32–40 px desktop; tối đa 1120 px.
- **FU-1 (tràn ngang 320 px từ M0) đã sửa**: Card V2 có `min-w-0` (bảng khả năng ở `/lab`), `Mono` và `dl` ngắt chuỗi dài. Bỏ ngoại lệ `KNOWN_OVERFLOW_320`: mọi trang được kiểm ở mọi độ rộng.

## Kiểm thử

- **`e2e/shell.spec.ts`**:
  - đúng một kiểu điều hướng theo độ rộng;
  - sidebar mặc định theo độ rộng, toggle và ghi nhớ sau reload;
  - tooltip khi focus, không bị cắt (kiểm bằng `elementFromPoint`);
  - `aria-current`;
  - sheet "Thêm": 5 mục, focus đầu, `Esc` trả focus, bấm nền, Back, điều hướng từ sheet;
  - ẩn khi gõ;
  - màn hình thấp: mọi đích tới được.
- **Project Playwright mới, chỉ chạy `layout|shell`** trên 3 engine: 320×568 (`small`), 844×390 (`landscape`), 1024×768 (`laptop`).
- **Cập nhật theo breakpoint mới**: `helpers.deviceClass` (768/1024), `ui1-viewports.spec.ts` (rail 768–1023, sidebar ≥ 1024), `/lab` (lớp thiết bị).
- **Lỗi thật được test phát hiện và đã sửa**:
  - link trong sheet bị `history.back()` hủy;
  - thanh điều hướng hiện lại che nút mật khẩu ngay sau khi mất focus;
  - tooltip bị khung cuộn của sidebar cắt.

## Chưa làm (để PR sau)

- **Chế độ tập trung** (ẩn điều hướng trong phiên học/viết): làm ở UI-5 cùng màn hình dùng nó.
- **Top bar hiển thị tiêu đề trang thay logo**: làm ở UI-5.
- **Menu tài khoản, Đăng xuất**: M1.
- **Logo mới**: UI-7B.
- **Phím tắt desktop**: sau.

## Review độc lập (PR #13) và xử lý

**Kết quả review: 0 Critical, 5 Important, ~15 Minor.** Đã sửa cả 5 Important:

1. **Safe-area khi xoay ngang:** cột sidebar, padding của rail và lề phải nội dung cộng thêm `env(safe-area-inset-*)`.
2. **Lựa chọn sidebar đã nhớ bị nháy khi tải lại:**
   - Script inline trong `app/layout.tsx` đặt `data-sidebar` trên `<html>` trước lần vẽ đầu; CSS đọc thuộc tính đó.
   - Hai nhãn nút được render sẵn và CSS chọn nhãn đúng, nên đúng cả trước hydration. `aria-expanded` chỉ đặt sau hydration.
   - Test: tải lại khi **chặn JavaScript** vẫn ra đúng độ rộng và nhãn. Kiểm thử đột biến: bỏ script → FAIL.
3. **Điều hướng từ sheet để lại mục lịch sử thừa:**
   - Link trong sheet dùng `replace`.
   - Chỉ coi là "đang điều hướng" khi bấm chuột trái thường tới trang khác.
   - Test kiểm `history.length` không tăng, Back rồi Forward đúng, `history.state.sheet` được xóa sau `Esc`.
4. **Thanh điều hướng có thể bị ẩn mãi:**
   - Kiểm lại khi đổi route, và khi `visualViewport` lớn lại (bàn phím đóng mà ô nhập không mất focus).
   - Chỉ ô nhập mới bật trạng thái ẩn ngay; việc tắt luôn qua hẹn giờ 250 ms. Cách hiện thực đầu tiên theo gợi ý của review đã làm quay lại lỗi che nút mật khẩu; test phát hiện và đã chỉnh.
5. **Sync chip ở dạng thu gọn không vừa 72 px:** chỉ hiện chấm màu; chữ trạng thái và mô tả vẫn dành cho trình đọc màn hình. Có test chế độ offline.

**Minor đã sửa:**

- Nhãn nút thu gọn không còn bị đọc hai lần.
- Sheet trả lại giá trị `overflow` cũ và dọn dẹp khi unmount.
- Mục sidebar khi mở rộng chiếm cả hàng.
- Tooltip bên phải bỏ class `absolute` thừa.
- `/lab/session` ngắt chuỗi dài, nên FU-1 đã đóng hẳn.
- Thêm project `phone-low` 740×360 để kiểm bottom nav ở màn hình thấp.

**Minor còn mở:**

- Bottom nav cao 56 px thay vì 64 px.
- Chạm lại tab đang chọn chưa cuộn về đầu trang.
- Chưa có chuyển động mở rộng sidebar và mở sheet.
- Sheet lồng nhau.
- Tooltip vẫn hiện khi trigger cuộn ra khỏi sidebar.
