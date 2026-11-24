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

## M1 — Identity, core schema, offline foundation

**Deliverables:** approved-only access (D-037, D-038, `docs/ACCESS_CONTROL.md`): e-mail + password sign-in only (no sign-up UI/API, no OTP/magic link), generic error messages; `app_members` (`pending|active|disabled`, `password_change_required`, created `pending` by trigger) + `is_active_member()` (active **and** password changed) in every learner-data RLS policy + API checks (403 `not_a_member`, 403 `password_change_required`, 401 for JWTs older than `password_changed_at`, cache ≤ 60 s) + trigger-based `admin_audit_log`; forced first-sign-in password change and later change (`GET /v1/me`, `POST /v1/me/password`: verify current, 12–72 bytes, revoke all sessions, fail closed, no password in logs); admin runbook and server-side admin scripts (issue temporary password, disable/ban, re-enable) using the secret key outside the browser; e-mail password recovery explicitly deferred (custom SMTP); `supabase/config.toml` with sign-up and anonymous sign-in disabled; cookie-based session (no refresh token in IndexedDB/localStorage, D-022); logout (clears IndexedDB/caches), profiles, RLS for user-owned content, schema migrations, IndexedDB read store + outbox and first bidirectional sync with server `sync_operations`, sensitive-field encryption per D-022 (if approved).

**Exit:** sign-up attempts with the public publishable key are rejected (automated test against Supabase local with sign-up disabled); a signed-in but non-member, pending or disabled user gets 403 from the API and no rows via RLS; a member who has not changed the initial password gets 403 / no rows except `GET /v1/me` and the password-change endpoint; after a password change old refresh and access tokens are rejected and simulated failures at each step leave the user blocked; disabling a member blocks the API within ≤ 60 s; API logs contain no passwords; no shared accounts in the admin runbook; A/B cross-user read/write denied by integration tests; offline mutation survives tab/app kill and syncs exactly once after reconnect; the same account sees the same progress on desktop and phone (Playwright multi-context + real device evidence).

**Performance (D-032, `docs/PERFORMANCE.md`):** CI job runs the lab benchmark (Chromium throttled = gate; Firefox/WebKit = report) and the per-route JS budget (P10 ≤ 200 KB gzip, fix G2 Supabase SDK eager load); sync status never shows "synced" without server ack and shows `rejected` (fix G1); instrumentation skeleton (web-vitals → telemetry endpoint, `Server-Timing`, sync duration/outbox length); sync P13 measured against the real Postgres `sync_operations`; every migration includes indexes for its RLS predicates; region measurement (D-034) done before creating a production Supabase project; first HTTPS Preview baseline recorded.

## M2 — Dictionary, course/library content model

**Deliverables:** shared lexicon (admin/pipeline-write only) + user-owned custom vocabulary with RLS (D-001), personal `vocabulary_items`, manual vocab entry, search Chinese/Pinyin/Vietnamese, personal notes, `tags`/`topics` tables with real FKs, vocabulary addition provenance (D-006), lesson vocabulary relations, starter fixture course (D-012), course/chapter/lesson schema, imported content provenance model, responsive dictionary/library screens.

**Exit:** Canonical shared lexeme doesn't duplicate across lessons; a normal user cannot modify shared lexicon or another user's custom vocabulary (negative RLS tests); study history is user-scoped; dictionary supports offline read of downloaded entries where IndexedDB is available; desktop layout shows list + detail side by side.

**Performance (D-032, `docs/PERFORMANCE.md`):** Synthetic dataset D-L committed as a generator; local dictionary query P2 p95 < 200 ms on `mobile-mid` with D-L; cached navigation P3 p95 < 300 ms; prefetch/caches bounded and versioned, private data never in shared caches; `EXPLAIN ANALYZE` for dictionary/library queries on D-L.

## M3 — Quiz engine + spaced repetition

**Deliverables:** quiz engine over the six-type `QuizType` registry (M3 renders `meaning_recognition`, `hanzi_recognition`, `pinyin_matching`; others follow in M5/M6), per-skill `review_cards` (D-007), due review, new-day quiz, multi-day recall, attempt records and learning events (no XP, D-003), session summary and resume after tab reload.

**Exit:** next-review schedule responds correctly to success/failure per skill; no duplicate attempts/events after replay; quiz works offline (where supported) in browser tab or installed app and syncs; usable with keyboard on desktop.

**Performance (D-032, `docs/PERFORMANCE.md`):** Local quiz answer feedback P4 p95 < 100 ms offline with D-L (12 000 review cards); UI interaction P1 p95 < 100 ms; due-card query indexed; no N+1 when loading a session.

## M4 — PDF import pipeline

**Deliverables:** private PDF upload from any device (file picker, desktop drag-and-drop; resumable upload for large files), async parsing in the worker, page-level provenance, structure extraction, human review screen (side-by-side source/extraction on desktop/tablet, stacked on phones), edits, course publishing, re-import/version/dedupe.

**Exit:** synthetic PDF uploaded from a phone browser and a desktop browser -> chapter/lesson/words reviewed -> published -> available for quiz; errors can retry; no leaked docs; no actual HSK PDF needed yet.

**Performance (D-032, `docs/PERFORMANCE.md`):** PDF processing runs only as a background job with progress, retry and idempotency (no request > 30 s); PDF viewer lazy-loaded; upload of D-PDF 120 pages does not block other study screens (P1 unchanged during upload).

## M5 — Visual Hanzi + handwriting quiz

**Deliverables:** sourced historical character forms, visual evolution timeline and animations (SVG/CSS), evidence metadata; picture/meaning prompt -> Pointer Events canvas (touch, mouse, stylus) -> `HandwritingRecognitionPort` candidates (adapter chosen in M0-PWA) -> feedback with stroke guidance after submission.

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
