# UI-8 — Dọn dẹp sau khi chuyển sang V2

Nhánh `feat/ui-8-cleanup`, xếp chồng sau UI-7B. Không đổi giao diện hay hành vi (trừ ô ghi chú offline, xem bên dưới).

- **Xóa alias màu M0** trong `globals.css`: `paper`, `paper-2`, `ink`, `ink-2`, `jade`, `amber`, `sky`. Hoàn tất FU-4; từ UI-5 đã không còn trang nào dùng.
- **Xóa entry cũ `src/components/ui.tsx`** (API M0, trong đó `Button variant="ghost"` nghĩa là nút viền). `@/components/ui` giờ trỏ thẳng tới thư mục V2 (`ui/index.ts`).
  - Bỏ luật ESLint tạm chặn import cũ.
  - `Mono` chuyển vào `ui/Mono.tsx`.
  - Gom các import `@/components/ui/index` về `@/components/ui`.
- **`/lab/offline`:**
  - nút "Xin giữ dữ liệu lâu dài" dùng `secondary`, cùng hình dạng như trước;
  - ô ghi chú chuyển sang `Input` V2: nhãn ẩn nhưng trình đọc màn hình vẫn đọc, `data-testid` giữ nguyên.

**Kiểm thử tại máy (Chromium):** 352 E2E pass, typecheck/lint sạch, `check:css-vars` OK.
