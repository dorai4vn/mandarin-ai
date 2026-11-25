# UI-6 — Dark mode

Nhánh `feat/ui-6-dark`, xếp chồng sau UI-5. Phạm vi theo `UI_MIGRATION_PLAN.md` (PR-6) và `TOKENS_V2.md` §2, §7:

- kích hoạt token Dark;
- bộ chọn Sáng / Tối / Theo hệ thống;
- script đặt theme trước khi vẽ;
- kiểm tra AA trên component thật.

Không đổi logo, favicon hay PWA (UI-7B). Không thêm dependency. Không đổi API, Auth, Supabase, Railway, Vercel.

## Thay đổi

- **`src/design/tokens.css`:**
  - Token Dark lấy đúng giá trị đã duyệt trong `TOKENS_V2.md`. Có hai khối: `:root[data-theme='dark']` cho lựa chọn tường minh, và `@media (prefers-color-scheme: dark) :root:not([data-theme='light'])` cho theo hệ thống.
  - Thêm `surface.raised`: Light `#FFFFFF` (đã có trong spec), Dark `#1E2839`. Dùng cho dialog, popover đồng bộ và lựa chọn đang chọn của segmented.
  - Token mà spec Dark chưa ghi tách riêng thì lấy theo cột `text` / `on` của cùng nhóm: `*-text-strong`, `accent-text-strong`, `warning-on`.
  - **Study Card Dark:** nền theo hình tham chiếu (`#153857` / `#2C2A50` / `#0F403D`). Icon được làm sáng hơn (`#5AA2FF` / `#A78BFA` / `#2FC9A1`), vì giữ icon Light thì chỉ đạt 2.9–3.2:1 trên nền tối; bản mới đạt ≥ 3:1 và được kiểm trong CI.
  - Bóng đổ Dark dùng `rgb(0 0 0 / 0.4)`, đúng §5.
- **Theme:**
  - Mặc định theo hệ thống.
  - Card "Giao diện" trong **Hồ sơ & cài đặt** (`/profile`) có lựa chọn Theo hệ thống / Sáng / Tối, lưu ở `localStorage` (`mandarin.theme`). Nếu không ghi được storage thì lựa chọn chỉ có hiệu lực trong trang hiện tại; trang không lỗi.
  - Script inline trong `layout.tsx` (cùng script với sidebar) đặt `data-theme` trước khi vẽ, nên không nháy màu.
  - `theme-color` có hai giá trị theo `prefers-color-scheme` và được cập nhật theo lựa chọn tường minh.
- **Canvas viết tay:** vẽ lại khi đổi theme. Màu lưới và nét đọc từ CSS lúc vẽ.
- **`Segmented`** (`ui/Segmented.tsx`): nhóm radio dạng segmented, dùng cho tốc độ nghe lại và lựa chọn giao diện.

## Kiểm tra trong CI

- **`pnpm check:contrast`:** đọc riêng khối Light và Dark, kiểm **80 cặp × 2 theme**. Script lỗi nếu hai khối Dark lệch nhau. Đã thử cố ý làm sai để chắc hai lỗi đều bị bắt:
  - đổi một giá trị trong khối `@media` → báo "DARK blocks differ";
  - hạ `fg-muted` Dark → 11 cặp FAIL.
- **`pnpm check:css-vars`** (mới, có từ UI-5): mọi `var(--x)` đều phải được định nghĩa.

## Kiểm thử E2E (`e2e/ui6-dark.spec.ts`)

- **Mặc định:** theo hệ thống (`emulateMedia`).
- **Bộ chọn:**
  - chọn Tối khi hệ thống đang sáng;
  - tải lại khi các chunk JS bị chặn vẫn ra theme tối (không nháy màu);
  - chọn Sáng khi hệ thống đang tối;
  - chọn "Theo hệ thống" thì xóa giá trị đã lưu;
  - `theme-color` đổi theo.
- **Storage bị chặn:** vẫn đổi được theme, không có lỗi JavaScript.
- **Axe ở chế độ tối:** không có lỗi serious/critical, kể cả color-contrast, và không cuộn ngang trên 12 trang, gồm gallery `/lab/design`.

## Ảnh

`docs/design/previews/ui6/` (Dark, 390 px và 1440 px).

## Còn lại

- **FU-2:** `public/offline.html` vẫn chỉ có Light; cần PR riêng về service worker.
- **Logo / favicon / PWA icon:** UI-7B.
