# Supabase — migrations & tests

## Quy ước migration (template)

- File: `migrations/YYYYMMDDHHMMSS_<milestone>_<mô_tả>.sql`, chỉ tiến (forward-only). Rollback = migration mới đảo ngược, được review riêng.
- Mỗi bảng chứa dữ liệu người học: `enable row level security` + policy dùng `(select auth.uid())`; không có policy cho `anon` trừ khi có quyết định trong `docs/DECISIONS.md`.
- Dữ liệu chuẩn dùng chung (shared lexicon, D-001): người dùng thường chỉ `select`; ghi qua `service_role` hoặc `is_content_admin()`.
- Hàm `security definer` luôn `set search_path = ''` và thu hồi `execute` khỏi `public/anon/authenticated` khi không cần.
- Ràng buộc idempotency (`idempotency_key unique`) và composite FK `(id, user_id)` cho bảng liên kết (D-006, D-007, D-008).
- Mỗi migration có test pgTAP trong `tests/` gồm cả trường hợp **bị từ chối** (user A ↔ user B, anon).

## Lệnh (từ thư mục gốc repo, cần Docker)

```bash
pnpm db:start      # khởi động Supabase local
pnpm db:reset      # áp dụng lại toàn bộ migration trên DB trống
pnpm db:test       # chạy test pgTAP
pnpm db:lint       # kiểm tra schema (plpgsql_check)
pnpm db:stop
```
