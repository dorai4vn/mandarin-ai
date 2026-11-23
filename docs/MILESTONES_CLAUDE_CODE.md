# Mandarin AI — Claude Code Execution Plan v2.0 (Web/PWA)

> v2.0 re-plans delivery for the Next.js web app + PWA targeting Safari on iPhone (D-018 … D-027). Functional scope (11 PRD domains) is unchanged. The original M0 (native Expo spike, PR #1) is superseded by **M0-PWA**; its reusable parts are carried over per `docs/MIGRATION_M0_PWA.md`.

This plan prioritizes a real installable web application used on iPhone Safari, audited architecture, and real data operations. The HSK 3.0 PDF will be imported by the owner **after** the app is ready. Do not request it as a prerequisite. Use a self-authored small PDF fixture in tests.

## Operating rules for Claude Code

- Work in GitHub repository with cloud-persistent code, protected `main`, small PRs, no dependence on transient local-only state.
- Before each milestone: read PRD and architecture, list plan and scope, write acceptance tests, implement, document manual device QA, push branch and create PR.
- Do not claim completion without actual verification and evidence (commands, results, screenshots/screen recording if available, URL of the tested deployment + iPhone model/iOS version, database checks).
- Prefer stable public SDKs and current docs; version-pin dependencies and note native build limitations.
- No mock success screenshots, silent skipping of failing tests or unverified claims.
- Never expose OpenAI/Azure/Supabase service role credentials in client or GitHub.
- Maintain `docs/DECISIONS.md` (the single official architecture decision log: ID, date, context, choice, rationale, consequences), `docs/FEATURES.md`, `docs/RELEASE_CHECKLIST.md`, and release notes.
- Every spike/integration result is labelled `VERIFIED` (real evidence), `MOCKED` (mock adapter, never reported as live) or `BLOCKED` (missing Docker, Apple signing, device or credentials — with owner instructions).
- Work on the session feature branch; never push directly to `main`; never self-merge a PR; do not start the next milestone before the owner accepts the current one.
- One feature module at a time; all changed module contracts must have version and regression tests.

## M0 (native, superseded) — kept for history
Delivered on branch `claude/serene-feynman-joougp` (PR #1, not merged): monorepo, contracts/domain/adapters, Fastify API, Supabase baseline + RLS tests, CI, Expo spike app. Never built on a device. Superseded by M0-PWA (D-018).

## M0-PWA — Web foundation, Safari feasibility spikes, architecture gate

**Deliverables:** `apps/web` (Next.js 16 + TypeScript + Tailwind 4, App Router, `output: 'standalone'`), PWA manifest + icons + Serwist service worker (offline app shell), mobile-first responsive shell with safe-area handling, carried-over packages/API/Supabase from M0 with all their tests, `HandwritingRecognitionPort` (renamed from `DigitalInkPort`), IndexedDB (Dexie) schema + outbox prototype with idempotent replay test, CI updated (`next build`, Playwright WebKit iPhone emulation), web `.env.example`, setup guide for testing on a real iPhone over HTTPS, updated docs. Legacy `apps/mobile` removed in a separate commit only after the web spikes exist and the owner approves.

**Critical spikes (each labelled VERIFIED / MOCKED / BLOCKED):**
1. Touch canvas on iPhone Safari: Pointer Events capture of 山 (x, y, t), no scroll/zoom interference, finger and Apple Pencil if available.
2. Handwriting recognition candidates: evaluate in-browser adapter(s) per D-020 on a real iPhone sample set; report top-1/top-5, latency, bundle size, licence — no quality claim without numbers.
3. Microphone: permission prompt, deny/recover flow, AudioWorklet PCM → 16 kHz WAV, playback; Azure assessment via API (live if key provided, else MOCKED).
4. OpenAI Realtime auth: backend client-secret mint (already built) called from the web app (live if key provided, else MOCKED).
5. PDF upload: pick a self-authored sample PDF from iOS Files, upload to private Supabase Storage (size/type validation) — pipeline itself stays in M4.
6. IndexedDB + outbox: write offline (airplane mode), kill Safari/PWA, reopen, reconnect → exactly one server record.
7. Service worker + Add to Home Screen: app shell opens offline, standalone display, update flow.
8. Auth in PWA: e-mail OTP login works inside the Home-Screen app (D-025).

**Exit:** on a real iPhone (model + iOS version recorded) the PWA opens in Safari and from the Home Screen; spikes 1, 3, 5, 6, 7, 8 pass with evidence; spike 2 has a measured report and the owner chooses the adapter (or approves a fallback); spikes 3–4 live or explicitly MOCKED with owner approval; CI green; no secrets in client bundle.

## M1 — Identity, core schema, offline foundation

**Deliverables:** e-mail OTP/password login, signup, logout (clears IndexedDB/caches), profiles, RLS for user-owned content, schema migrations, IndexedDB read store + outbox and first bidirectional sync with server `sync_operations`, sensitive-field encryption per D-022 (if approved).

**Exit:** A/B cross-user read/write denied by integration tests; offline mutation survives tab/PWA kill and syncs exactly once after reconnect (Playwright + real iPhone evidence).

## M2 — Dictionary, course/library content model

**Deliverables:** shared lexicon (admin/pipeline-write only) + user-owned custom vocabulary with RLS (D-001), personal `vocabulary_items`, manual vocab entry, search Chinese/Pinyin/Vietnamese, personal notes, `tags`/`topics` tables with real FKs, vocabulary addition provenance (D-006), lesson vocabulary relations, starter fixture course (D-012), course/chapter/lesson schema, imported content provenance model, responsive dictionary/library screens.

**Exit:** Canonical shared lexeme doesn't duplicate across lessons; a normal user cannot modify shared lexicon or another user's custom vocabulary (negative RLS tests); study history is user-scoped; dictionary supports offline read of downloaded entries in Safari.

## M3 — Quiz engine + spaced repetition

**Deliverables:** quiz engine over the six-type `QuizType` registry (M3 renders `meaning_recognition`, `hanzi_recognition`, `pinyin_matching`; others follow in M5/M6), per-skill `review_cards` (D-007), due review, new-day quiz, multi-day recall, attempt records and learning events (no XP, D-003), session summary and resume after tab reload.

**Exit:** next-review schedule responds correctly to success/failure per skill; no duplicate attempts/events after replay; quiz works offline in the installed PWA and syncs.

## M4 — PDF import pipeline

**Deliverables:** private PDF upload from iPhone (Files picker; resumable upload for large files), async parsing in the worker, page-level provenance, structure extraction, human review screen (mobile-friendly side-by-side/stacked), edits, course publishing, re-import/version/dedupe.

**Exit:** synthetic PDF uploaded from iPhone Safari -> chapter/lesson/words reviewed -> published -> available for quiz; errors can retry; no leaked docs; no actual HSK PDF needed yet.

## M5 — Visual Hanzi + handwriting quiz

**Deliverables:** sourced historical character forms, visual evolution timeline and animations (SVG/CSS), evidence metadata; picture/meaning prompt -> canvas -> `HandwritingRecognitionPort` candidates (adapter chosen in M0-PWA) -> feedback with stroke guidance after submission.

**Exit:** 山 exercise works on a real iPhone in Safari/PWA, target never leaked before submission (not present in DOM/network before submit), history sources displayed; unsupported invented historical forms prohibited; recognition accuracy on the evaluation set reported.

## M6 — Listening, pronunciation and speaking

**Deliverables:** audio playback (normal/slow), dictation, recording (D-023), Azure reference-based pronunciation feedback, `speaking_attempts` links (D-008), OpenAI turn-based voice role-play first; Realtime (WebRTC) only behind a feature flag after a documented stability proof on iPhone Safari (D-004); progress storage and privacy controls.

**Exit:** mic denied/poor network/retry handled in Safari and Home-Screen mode; scoring fields grounded in provider output; learners can review missed words; no recordings publicly visible.

## M7 — AI explanations, image import, gamification, notifications

**Deliverables:** tutor explanation with prompt validation, image/screenshot OCR import (camera/photo picker), XP engine consuming learning events (D-003), streak/levels/achievements, reminders via Web Push + in-app (D-024, `push_subscriptions`), profile and progress dashboards.

**Exit:** all features integrate with same vocabulary item ID, review history and study events; XP granted exactly once per qualifying event including offline replays; image OCR corrections are user-confirmed; notification opt-out works; push received on a Home-Screen install (iOS ≥ 16.4) or documented as BLOCKED by device.

## M8 — Modular extensibility audit & private beta

**Deliverables:** new quiz type proof-of-extension, provider substitution test, migration rehearsals, E2E regression (Playwright WebKit + manual iPhone), accessibility audit on iPhone (VoiceOver, text size), privacy notice, monitoring and cost controls, deployment of web + API to the chosen host, beta installation guide (Add to Home Screen).

**Exit:** real iPhone passes the complete learner journey in Home-Screen mode; online/offline, upload, quiz, voice and handwriting flows audited; rollback plan and operational runbook exist.

## Post-iPhone gate — Android/desktop browsers

Verify Android Chrome install prompt, microphone, canvas, IndexedDB persistence, push, and desktop layouts; no assumption that iPhone Safari behaviour carries over.

## Standard milestone report template

```text
Milestone / branch / commit / PR:
Delivered features:
Database migrations:
Tests run + pass/fail:
iPhone Safari / Home-Screen verification:
Online/offline & permission cases:
Security/RLS checks:
Known gaps and blockers:
Docs updated:
GO/NO-GO decision:
```

## FIRST CLAUDE CODE PROMPT (copy into Claude Code)

You are the lead engineer for Mandarin AI, a mobile-first Next.js web app + PWA whose primary target is Safari on iPhone. Read `docs/MASTER_PRD.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/MILESTONES_CLAUDE_CODE.md` and `docs/MIGRATION_M0_PWA.md` in full. Do not implement all features. Start with M0-PWA only: reuse the M0 packages, API, Supabase migrations and tests; add `apps/web`; run the Safari feasibility spikes; label every result VERIFIED / MOCKED / BLOCKED. Never claim iPhone results without evidence from a physical iPhone. Do not require the owner's HSK 3.0 PDF; use authored sample PDFs. Keep the modular architecture, deny privileged operations to the browser, don't commit secrets, don't merge PRs. Stop after M0-PWA for review.
