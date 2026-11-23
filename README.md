# Mandarin AI

Ứng dụng web học tiếng Trung cho người Việt — chạy trực tiếp trên trình duyệt (Chrome, Edge, Firefox, Safari) của máy tính, máy tính bảng và điện thoại. Cài đặt (PWA), offline và thông báo đẩy là tính năng bổ sung, không bắt buộc. Next.js · Supabase · Fastify API.

- Yêu cầu sản phẩm: [`docs/MASTER_PRD.md`](docs/MASTER_PRD.md)
- Kiến trúc: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Quyết định: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Kế hoạch milestone: [`docs/MILESTONES_CLAUDE_CODE.md`](docs/MILESTONES_CLAUDE_CODE.md)
- Cài đặt & kiểm thử: [`docs/SETUP.md`](docs/SETUP.md) · Tương thích trình duyệt: [`docs/WEB_COMPATIBILITY.md`](docs/WEB_COMPATIBILITY.md) · Chuyển đổi: [`docs/MIGRATION_M0_PWA.md`](docs/MIGRATION_M0_PWA.md)
- Tính năng: [`docs/FEATURES.md`](docs/FEATURES.md) · Release: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) · Báo cáo: [`docs/M0_PWA_REPORT.md`](docs/M0_PWA_REPORT.md) (M0 native cũ: [`docs/M0_REPORT.md`](docs/M0_REPORT.md))

```text
apps/web           Next.js web app (responsive phone/tablet/desktop, PWA tùy chọn)
apps/mobile        [đóng băng] Expo spike của M0 native — gỡ sau khi M0-PWA được duyệt
apps/api           Node.js + Fastify API (giữ secret nhà cung cấp AI)
packages/contracts zod schemas, QuizType ids, events
packages/domain    luật nghiệp vụ thuần (QuizType registry, graders)
packages/adapters  ports + adapter (mock luôn gắn nhãn MOCK)
supabase/          migrations + test RLS (pgTAP)
```

```bash
pnpm install --frozen-lockfile && pnpm fetch:handwriting-data && pnpm build && pnpm lint && pnpm typecheck && pnpm test
```
