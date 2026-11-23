# Mandarin AI

Ứng dụng học tiếng Trung cho người Việt — iOS-first, Android-ready (Expo React Native), Supabase, Node.js API.

- Yêu cầu sản phẩm: [`docs/MASTER_PRD.md`](docs/MASTER_PRD.md)
- Kiến trúc: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Quyết định: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Kế hoạch milestone: [`docs/MILESTONES_CLAUDE_CODE.md`](docs/MILESTONES_CLAUDE_CODE.md)
- Cài đặt & kiểm thử: [`docs/SETUP.md`](docs/SETUP.md) · Tương thích native: [`docs/NATIVE_COMPATIBILITY.md`](docs/NATIVE_COMPATIBILITY.md)
- Tính năng: [`docs/FEATURES.md`](docs/FEATURES.md) · Release: [`docs/RELEASE_CHECKLIST.md`](docs/RELEASE_CHECKLIST.md) · Báo cáo M0: [`docs/M0_REPORT.md`](docs/M0_REPORT.md)

```text
apps/mobile        Expo SDK 58 app (dev build), local native module modules/digital-ink
apps/api           Node.js + Fastify API (giữ secret nhà cung cấp AI)
packages/contracts zod schemas, QuizType ids, events
packages/domain    luật nghiệp vụ thuần (QuizType registry, graders)
packages/adapters  ports + adapter (mock luôn gắn nhãn MOCK)
supabase/          migrations + test RLS (pgTAP)
```

```bash
pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test
```
