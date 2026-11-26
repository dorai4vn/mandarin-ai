# Mandarin AI — Claude Code Execution Plan v2.1 (cross-platform web)

> v2.1 re-plans delivery for a cross-platform Next.js web application (desktop, laptop, tablet, smartphone; Chrome, Edge, Firefox, Safari) with PWA features as progressive enhancements (D-018 … D-030). Functional scope (11 PRD domains) is unchanged. The original M0 (native Expo spike, PR #1) is superseded by **M0-PWA**; its reusable parts are carried over per `docs/MIGRATION_M0_PWA.md`.

This plan prioritizes a real cross-platform web application usable in any modern browser, audited architecture, and real data operations. The HSK 3.0 PDF will be imported by the owner **after** the app is ready. Do not request it as a prerequisite. Use a self-authored small PDF fixture in tests.

## Operating rules for Claude Code

- Work in GitHub repository with cloud-persistent code, protected `main`, small PRs, no dependence on transient local-only state.
- Before each milestone: read PRD and architecture, list plan and scope, write acceptance tests, implement, document manual device QA, push branch and create PR.
- Do not claim completion without actual verification and evidence (commands, results, screenshots/screen recording if available, URL of the tested deployment + device/OS/browser versions, database checks).
- Prefer stable public SDKs and current docs; version-pin dependencies and note native build limitations.
- No mock success screenshots, silent skipping of failing tests or unverified claims.
- Never expose OpenAI/Azure/Supabase service role credentials in client or GitHub.
- Maintain `docs/DECISIONS.md` (the single official architecture decision log: ID, date, context, choice, rationale, consequences), `docs/FEATURES.md`, `docs/RELEASE_CHECKLIST.md`, and release notes.
- Every spike/integration result is labelled `VERIFIED` (real evidence), `MOCKED` (mock adapter, never reported as live) or `BLOCKED` (missing Docker, Apple signing, device or credentials — with owner instructions).
- Work on the session feature branch; never push directly to `main`; never self-merge a PR; do not start the next milestone before the owner accepts the current one.
- One feature module at a time; all changed module contracts must have version and regression tests.

## M0 (native, superseded) — kept for history
Delivered on branch `claude/serene-feynman-joougp` (PR #1, not merged): monorepo, contracts/domain/adapters, Fastify API, Supabase baseline + RLS tests, CI, Expo spike app. Never built on a device. Superseded by M0-PWA (D-018).

## M0-PWA — Cross-platform web foundation, feasibility spikes, architecture gate

(The name "M0-PWA" is kept for continuity; the scope is the cross-platform web app, PWA is optional.)

**Deliverables:** `apps/web` (Next.js 16 + TypeScript + Tailwind 4, App Router, `output: 'standalone'`) with responsive app shell — phone bottom tabs, tablet navigation rail, desktop sidebar — and per-module desktop composition; capability-detection module and compatibility notices; optional PWA layer (manifest, icons, Serwist service worker) that never blocks usage; carried-over packages/API/Supabase from M0 with all their tests; `HandwritingRecognitionPort` (renamed from `DigitalInkPort`) and server endpoint; IndexedDB (Dexie) outbox with in-memory fallback and idempotent replay; CI with Playwright on Chromium, Firefox, WebKit × mobile/tablet/desktop viewports; web `.env.example`; setup guide; updated docs. Legacy `apps/mobile` removed in a separate commit only after owner approval.

**Critical spikes (each labelled VERIFIED / MOCKED / BLOCKED, per browser where relevant):**
1. Handwriting canvas with Pointer Events: touch (phone), mouse (desktop), stylus (tablet/pen); no scroll/zoom interference; same stroke format from every input.
2. Handwriting recognition: server adapter returns candidates; measured report (top-1/top-5, latency) on real samples from phone + desktop; licence decision (D-029).
3. Microphone: capability detection, permission request/deny/recover, AudioWorklet PCM → 16 kHz WAV, playback, on Chrome/Edge/Firefox/Safari; Azure assessment via API (live if key, else MOCKED).
4. OpenAI Realtime auth: backend client-secret mint called from the web app (live if key, else MOCKED).
5. PDF upload: file picker and desktop drag-and-drop, type/size validation, upload to private storage (pipeline in M4).
6. IndexedDB + outbox: offline write → reload/close → reconnect → exactly one server record; fallback when IndexedDB is unavailable keeps the online app working.
7. Progressive PWA: manifest + service worker register only when supported; app shell offline; install optional; app fully usable without it.
8. Auth: e-mail + password sign-in of an admin-created account works in a browser tab and in an installed app; no sign-up path; generic error for wrong password / unknown e-mail (D-038).
9. Responsive layouts: automated screenshots + layout assertions at 390×844, 820×1180, 1440×900 in three engines.

**Exit:** automated E2E green on Chromium, Firefox and WebKit at mobile/tablet/desktop viewports in CI; performance budget documented with a lab baseline (`docs/PERFORMANCE.md`; achieving targets is NOT an M0-PWA criterion); manual evidence on real iPhone Safari **and** at least one real desktop browser (model/OS/browser version recorded) for spikes 1, 3, 5, 6, 7, 8, 9; spike 2 has a measured report and the owner chooses/approves the adapter and licence; spikes 3–4 live or explicitly MOCKED with owner approval; no secrets in the client bundle.

## M1 — Identity, core schema, offline foundation (simplified — D-042)

> 2026-11-25: owner decision **D-042 "Simplify M1"** replaces the earlier M1 scope (`app_members`, pending/active/disabled lifecycle, forced first password change, `/v1/me/password`, custom token revocation, membership cache, admin audit log, admin scripts, cookie session). Those items are **dropped**, not deferred. Access model: `docs/ACCESS_CONTROL.md`; session: `docs/AUTH_SESSION_DESIGN.md`.

**Deliverables:** standard Supabase Auth with e-mail + password; accounts created manually by the owner in the Supabase Dashboard; public sign-up and anonymous sign-in disabled (`supabase/config.toml` + Dashboard); session kept by the official `supabase-js` mechanism; sign-in page and sign-out; routes with personal data require a session; API requires a valid JWT on every `/v1/*` (D-036); learner tables owner-only RLS (`user_id = auth.uid()`), learner data read/written by the API **with the user's own JWT** (PostgREST → RLS), indexes for RLS predicates; Postgres `sync_operations` (exactly-once per `(user_id, operation_id)`) with push and pull; IndexedDB per account (`mandarin-ai:<userId>`), outbox and bidirectional sync of the existing offline entity; sign-out deletes the account's local database; no secrets in frontend, repository or logs.

**Exit (acceptance criteria approved by the owner, D-042):**
1. The owner can create an account in the Supabase Dashboard (runbook in `docs/ACCESS_CONTROL.md` §5).
2. Users can sign in on phone and desktop browsers.
3. Outsiders cannot sign up (sign-up and anonymous sign-in with the publishable key rejected by real local GoTrue in CI).
4. The session persists correctly (reload, new tab, offline reopen).
5. User A cannot read or modify user B's data (pgTAP + REST test with two real accounts; API sync tests).
6. Not signed in → no access to personal data (API 401, `anon` has no table privileges, app does not open local data).
7. Sign-out and switching accounts do not leak data (E2E: local database deleted on sign-out; another account never sees it).
8. Offline storage, outbox and sync work as approved (D-021): offline mutation survives reload and syncs exactly once; the same account sees the same data on two devices (Playwright two contexts).
9. Existing performance requirements kept, implemented pragmatically (D-032: Supabase SDK not in the first-load bundle of pages that do not need it; sync never shows "synced" without a server ack — G1).
10. CI and essential security tests pass.
11. M0 and Design System V2 not broken (full E2E suite on three engines).

Device smoke on real phones/desktops is reported as **not verified** until the owner runs it (`docs/SMOKE_TEST.md`).

## M2 — Dictionary, course/library content model

> 2026-11-25: implemented the simple way (**D-043**): shared content in Postgres (read-only), personal vocabulary as the account's own sync operations projected on the device; separate `tags`/`topics`/`course_versions`/`content_admins` tables deferred. Report: `docs/M2_REPORT.md`.

**Deliverables:** shared lexicon (admin/pipeline-write only) + user-owned custom vocabulary with RLS (D-001), personal `vocabulary_items`, manual vocab entry, search Chinese/Pinyin/Vietnamese, personal notes, `tags`/`topics` tables with real FKs, vocabulary addition provenance (D-006), lesson vocabulary relations, starter fixture course (D-012), course/chapter/lesson schema, imported content provenance model, responsive dictionary/library screens.

**Exit:** Canonical shared lexeme doesn't duplicate across lessons; a normal user cannot modify shared lexicon or another user's custom vocabulary (negative RLS tests); study history is user-scoped; dictionary supports offline read of downloaded entries where IndexedDB is available; desktop layout shows list + detail side by side.

**Performance (D-032, `docs/PERFORMANCE.md`):** Synthetic dataset D-L committed as a generator; local dictionary query P2 p95 < 200 ms on `mobile-mid` with D-L; cached navigation P3 p95 < 300 ms; prefetch/caches bounded and versioned, private data never in shared caches; `EXPLAIN ANALYZE` for dictionary/library queries on D-L.

## M3 — Quiz engine + spaced repetition

**Deliverables:** quiz engine over the six-type `QuizType` registry (M3 renders `meaning_recognition`, `hanzi_recognition`, `pinyin_matching`; others follow in M5/M6), per-skill `review_cards` (D-007), due review, new-day quiz, multi-day recall, attempt records and learning events (no XP, D-003), session summary and resume after tab reload.

**Exit:** next-review schedule responds correctly to success/failure per skill; no duplicate attempts/events after replay; quiz works offline (where supported) in browser tab or installed app and syncs; usable with keyboard on desktop.

**Performance (D-032, `docs/PERFORMANCE.md`):** Local quiz answer feedback P4 p95 < 100 ms offline with D-L (12 000 review cards); UI interaction P1 p95 < 100 ms; due-card query indexed; no N+1 when loading a session.

## M3.5 — Visual Hanzi: historical evolution animation (pilot 山)

> 2026-11-26: chủ dự án duyệt tách phần *lịch sử chữ* khỏi M5 (issue #27, sau PR #25). **Nhận dạng chữ viết tay và bài quiz viết vẫn ở M5.** Thứ tự nét (stroke order) là tính năng riêng, chưa làm. Báo cáo: `docs/M3_5_REPORT.md`; nguồn: `docs/HANZI_HISTORY_SOURCES.md`.

**Deliverables:** dữ liệu lịch sử có nguồn/giấy phép cho 山 (không bịa), timeline tương tác, hoạt ảnh SVG/CSS chỉ chuyển mờ giữa các giai đoạn đã ghi nhận, phát/tạm dừng/phát lại, nhãn giai đoạn + metadata bằng chứng + giấy phép, tách "minh họa gợi nhớ" khỏi bằng chứng, giai đoạn thiếu hiển thị rõ, tích hợp từ điển cá nhân, component dùng lại cho M4 (`HanziHistory`), lazy-load, bàn phím, giảm chuyển động, dự phòng khi không tải được chunk.

**Acceptance criteria:**
1. 山 có ≥ 3 giai đoạn lịch sử, mỗi giai đoạn có URL nguồn, giấy phép, hash tệp, xuất xứ, trạng thái duyệt (test `model.test.ts`).
2. Giai đoạn không có tư liệu (lệ thư) hiển thị "Chưa có tư liệu" và bị bỏ qua khi phát; không có hình nội suy.
3. Minh họa gợi nhớ gắn nhãn "không phải bằng chứng".
4. Phát/tạm dừng/phát lại/Trước/Sau; điều hướng timeline bằng phím mũi tên/Home/End; `prefers-reduced-motion` tắt chuyển mờ.
5. Mã hoạt ảnh + dữ liệu ở chunk riêng, chỉ tải khi chi tiết từ chứa chữ có lịch sử.
6. Không đổi schema/auth/RLS/cấu hình cloud/API trả phí; test M3 giữ nguyên.
**Không thuộc phạm vi:** thứ tự nét, nhận dạng chữ viết tay, mở rộng bộ chữ, M4.

## M4 — PDF import pipeline

**Deliverables:** private PDF upload from any device (file picker, desktop drag-and-drop; resumable upload for large files), async parsing in the worker, page-level provenance, structure extraction, human review screen (side-by-side source/extraction on desktop/tablet, stacked on phones), edits, course publishing, re-import/version/dedupe.

**Exit:** synthetic PDF uploaded from a phone browser and a desktop browser -> chapter/lesson/words reviewed -> published -> available for quiz; errors can retry; no leaked docs; no actual HSK PDF needed yet.

**Performance (D-032, `docs/PERFORMANCE.md`):** PDF processing runs only as a background job with progress, retry and idempotency (no request > 30 s); PDF viewer lazy-loaded; upload of D-PDF 120 pages does not block other study screens (P1 unchanged during upload).

## M5 — Visual Hanzi + handwriting quiz

**Deliverables:** (lịch sử chữ/hoạt ảnh đã chuyển sang **M3.5**; M5 mở rộng bộ chữ nếu cần và thêm thứ tự nét) picture/meaning prompt -> Pointer Events canvas (touch, mouse, stylus) -> `HandwritingRecognitionPort` candidates (adapter chosen in M0-PWA) -> feedback with stroke guidance after submission.

**Exit:** 山 exercise works on a real phone (finger) and a desktop browser (mouse/pen), target never leaked before submission (not present in DOM/network before submit), history sources displayed; unsupported invented historical forms prohibited; recognition accuracy on the evaluation set reported.

**Performance (D-032, `docs/PERFORMANCE.md`):** Hanzi animation and handwriting UI lazy-loaded (route JS budget kept); handwriting result P16 p95 < 800 ms on 4G-lab with the approved adapter (D-029).

## M6 — Listening, pronunciation and speaking

**Deliverables:** audio playback (normal/slow), dictation, recording (D-023), Azure reference-based pronunciation feedback, `speaking_attempts` links (D-008), OpenAI turn-based voice role-play first; Realtime (WebRTC) only behind a feature flag after a documented stability proof across supported browsers (D-004); progress storage and privacy controls.

**Exit:** mic denied/poor network/retry handled in every supported browser (incl. installed mode); scoring fields grounded in provider output; learners can review missed words; no recordings publicly visible.

**Performance (D-032, `docs/PERFORMANCE.md`):** Pronunciation result P6 p95 < 3 s (short sample, excluding speaking time) measured on HTTPS with the real provider; audio engine lazy-loaded; Realtime only behind a flag after real-browser tests.

## M7 — AI explanations, image import, gamification, notifications

**Deliverables:** tutor explanation with prompt validation, image/screenshot OCR import (camera/photo picker), XP engine consuming learning events (D-003), streak/levels/achievements, in-app reminders (mandatory) + optional Web Push (D-024, `push_subscriptions`), profile and progress dashboards.

**Exit:** all features integrate with same vocabulary item ID, review history and study events; XP granted exactly once per qualifying event including offline replays; image OCR corrections are user-confirmed; in-app reminders work in every supported browser (mandatory); notification opt-out works; Web Push verified only where supported and permitted (optional, never blocks acceptance).

**Performance (D-032, `docs/PERFORMANCE.md`):** AI text streaming with first visible token P5 within 1–2 s on 4G-lab (p95 < 4 s fail threshold); heavy AI generation as background jobs; telemetry dashboards for AI latency and error rate.

## M8 — Modular extensibility audit & private beta

**Deliverables:** new quiz type proof-of-extension, provider substitution test, migration rehearsals, E2E regression (Playwright Chromium/Firefox/WebKit × viewports + manual devices), accessibility audit (keyboard, NVDA/VoiceOver/TalkBack, text size), privacy notice, monitoring and cost controls, deployment of web + API to the chosen host, beta guide (open URL; optional install).

**Exit:** the complete learner journey passes on real iPhone Safari, an Android phone browser and desktop Chrome/Edge/Firefox/Safari with one account; online/offline, upload, quiz, voice and handwriting flows audited; rollback plan and operational runbook exist.

**Performance (D-032, `docs/PERFORMANCE.md`):** Core Web Vitals P7–P9 at p75 from real-user data of the private beta (LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1) on phone and desktop; all budgets P1–P16 reported against baseline; no Redis/paid cache unless justified by data (D-033).

## Ongoing — browser matrix maintenance

Each milestone re-runs the Playwright matrix (Chromium, Firefox, WebKit × mobile/tablet/desktop) and records manual checks per `docs/RELEASE_CHECKLIST.md`; browser-specific gaps are tracked in `docs/WEB_COMPATIBILITY.md`.

## Standard milestone report template

```text
Milestone / branch / commit / PR:
Delivered features:
Database migrations:
Tests run + pass/fail:
Browser/device verification (desktop + phone, engines, versions):
Online/offline & permission cases:
Security/RLS checks:
Known gaps and blockers:
Docs updated:
GO/NO-GO decision:
```

## FIRST CLAUDE CODE PROMPT (copy into Claude Code)

You are the lead engineer for Mandarin AI, a cross-platform Next.js web application for desktop, laptop, tablet and smartphone browsers (Chrome, Edge, Firefox, Safari). PWA install, offline and push are progressive enhancements. Read `docs/MASTER_PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/MILESTONES_CLAUDE_CODE.md` and `docs/MIGRATION_M0_PWA.md` in full. Start with M0-PWA only: reuse M0 packages, API, Supabase migrations and tests; build `apps/web` with real phone/tablet/desktop layouts; run the feasibility spikes; label every result VERIFIED / MOCKED / BLOCKED. Never claim device results without evidence. Do not require the owner's HSK 3.0 PDF. Keep the modular architecture, deny privileged operations to the browser, don't commit secrets, don't merge PRs. Stop after M0-PWA for review.
